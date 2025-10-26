<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Helper to hit python /read-user/<wallet> and grab balance + stats.
     * If anything fails, we return safe defaults.
     */
    private function fetchOnchainStatsOrDefaults(?string $wallet): array
    {
        if (!$wallet) {
            return [
                'username'        => null,
                'posts_created'   => 0,
                'likes_received'  => 0,
                'likes_given'     => 0,
                'balance_sol'     => 0,
                'exists'          => false,
            ];
        }

        $base = rtrim(env('SOL_SERVICE_BASE', 'http://host.docker.internal:8001'), '/');

        $resp = Http::get($base . '/read-user/' . $wallet);

        if (!$resp->ok() || !($resp->json('ok'))) {
            return [
                'username'        => null,
                'posts_created'   => 0,
                'likes_received'  => 0,
                'likes_given'     => 0,
                'balance_sol'     => 0,
                'exists'          => false,
            ];
        }

        $u = $resp->json('user');

        return [
            'username'        => $u['username']        ?? null,
            'posts_created'   => $u['posts_created']   ?? 0,
            'likes_received'  => $u['likes_received']  ?? 0,
            'likes_given'     => $u['likes_given']     ?? 0,
            'balance_sol'     => $u['balance_sol']     ?? 0,
            'exists'          => true,
        ];
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $user = $request->user();

        // we only need balance if the user is logged in + has wallet
        $onchain = $user
            ? $this->fetchOnchainStatsOrDefaults($user->wallet ?? null)
            : [
                'balance_sol' => 0,
            ];

        return [
            ...parent::share($request),

            'name' => config('app.name'),

            'quote' => [
                'message' => trim($message),
                'author'  => trim($author),
            ],

            // auth info (already there)
            'auth' => [
                'user' => fn () => $user
                    ? $user->only('id', 'name', 'wallet')
                    : null,
            ],

            // NEW: always expose walletStats to Inertia/Layout
            'walletStats' => [
                'balance_sol' => $onchain['balance_sol'] ?? 0,
            ],
        ];
    }
}
