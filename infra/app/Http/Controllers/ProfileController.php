<?php

namespace App\Http\Controllers;

use App\Models\UserProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;

class ProfileController extends Controller
{
    private function base(): string
    {
        // same base you use elsewhere
        return rtrim(env('SOL_SERVICE_BASE', 'http://host.docker.internal:8001'), '/');
    }

    /**
     * Fetch on-chain stats (username, posts_created, etc.) for this wallet.
     * Falls back to sane defaults if user not on-chain yet or request fails.
     * Also includes balance_sol now.
     */
    private function fetchOnchainStatsOrDefaults(string $wallet): array
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

        $resp = Http::get($this->base() . '/read-user/' . $wallet);

        if (!$resp->ok() || !$resp->json('ok')) {
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
     * Small twitter-style "2m / 3h / Oct 12"
     */
    private function humanTime(Carbon $ts): string
    {
        $now  = now();
        $diff = $now->diffInSeconds($ts);

        if ($diff < 60) {
            return 'just now';
        }

        $mins = intdiv($diff, 60);
        if ($mins < 60) {
            return $mins . 'm';
        }

        $hrs = intdiv($mins, 60);
        if ($hrs < 24) {
            return $hrs . 'h';
        }

        $days = intdiv($hrs, 24);
        if ($days < 7) {
            return $days . 'd';
        }

        return $ts->format('M j');
    }

    /**
     * Load this user's posts (joined chunks -> full text) newest first
     * and shape them like PostCard expects.
     */
    private function loadUserPostsForUi(int $userId): array
    {
        $rows = DB::table('posts')
            ->where('author_id', $userId)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        $result = [];

        foreach ($rows as $postRow) {
            $chunks = DB::table('post_chunks')
                ->where('post_id', $postRow->id)
                ->orderBy('chunk_index')
                ->get();

            $fullText = '';
            foreach ($chunks as $c) {
                $fullText .= $c->content;
            }

            $authorData = DB::table('users')
                ->select('name', 'wallet')
                ->where('id', $postRow->author_id)
                ->first();

            $createdAt = $postRow->created_at ? Carbon::parse($postRow->created_at) : now();

            $result[] = [
                'id'           => $postRow->id,
                'author'       => [
                    'name'       => $authorData->name ?? 'Unknown',
                    'handle'     => $authorData->wallet ? substr($authorData->wallet, 0, 6) : null,
                    'wallet'     => $authorData->wallet ?? null,
                    'avatar_url' => null,
                ],
                'text'         => $fullText,
                'createdAt'    => $this->humanTime($createdAt),
                'liked'        => false,
                'likeCount'    => $postRow->likes_count ?? 0,
                'commentCount' => $postRow->comments_count ?? 0,
                'repostCount'  => 0,
                'tx'           => $postRow->root_signature,
                'onchain'      => true,
            ];
        }

        return $result;
    }

    /**
     * GET /profile
     * Main profile page for the *current* logged-in user.
     *
     * We also inject walletStats.balance_sol here so the sidebar
     * (AppLayout) can display real balance.
     */
    public function show(Request $req): Response
    {
        $me = Auth::user();
        if (!$me) {
            return Inertia::render('Profile', [
                'authed' => false,
            ]);
        }

        // local profile row (nickname/bio) if any
        $profile = UserProfile::where('user_id', $me->id)->first();

        // on-chain stats + existence + balance
        $onchain = $this->fetchOnchainStatsOrDefaults($me->wallet ?? '');

        // user's posts
        $posts = $this->loadUserPostsForUi($me->id);

        return Inertia::render('Profile', [
            'authed'   => true,
            'user'     => [
                'id'     => $me->id,
                'name'   => $me->name,
                'wallet' => $me->wallet,
            ],
            'profile'  => $profile ? [
                'nickname' => $profile->nickname,
                'bio'      => $profile->bio,
            ] : null,
            'onchain'  => $onchain, // {exists, username, posts_created, likes_*, balance_sol, ...}
            'posts'    => $posts,

            // this is what AppLayout reads:
            'walletStats' => [
                'balance_sol' => $onchain['balance_sol'] ?? 0,
            ],
        ]);
    }

    /**
     * POST /profile/check-nickname
     * Return { ok:true, available:true/false }
     * Used by the frontend live validator.
     */
    public function checkNickname(Request $req)
    {
        $me = Auth::user();
        if (!$me) {
            return response()->json([
                'ok'    => false,
                'error' => 'not_authenticated',
            ], 401);
        }

        $nicknameRaw = $req->input('nickname', '');
        $nickname    = trim($nicknameRaw);

        // allow social-style nicknames:
        // letters, numbers, ".", "_", "-" ; 1..32 chars
        $valid = preg_match('/^[A-Za-z0-9._-]{1,32}$/', $nickname) === 1;

        if (!$valid) {
            return response()->json([
                'ok'        => true,
                'available' => false,
                'reason'    => 'invalid_format',
            ]);
        }

        $exists = UserProfile::where('nickname', $nickname)
            ->where('user_id', '!=', $me->id)
            ->exists();

        return response()->json([
            'ok'        => true,
            'available' => !$exists,
        ]);
    }

    /**
     * POST /profile/setup-local
     * Step 2: save nickname/bio locally if user already on-chain.
     */
    public function saveLocalProfile(Request $req)
    {
        $me = Auth::user();
        if (!$me) {
            return response()->json([
                'ok'    => false,
                'error' => 'not_authenticated',
            ], 401);
        }

        // must already exist on-chain to proceed
        $onchain = $this->fetchOnchainStatsOrDefaults($me->wallet ?? '');
        if (!$onchain['exists']) {
            return response()->json([
                'ok'    => false,
                'error' => 'not_onchain_yet',
            ], 400);
        }

        // nickname validation:
        // - required
        // - <=32
        // - regex letters / numbers / . _ -
        // - unique in user_profiles.nickname
        $data = $req->validate([
            'nickname' => [
                'required',
                'string',
                'max:32',
                'regex:/^[A-Za-z0-9._-]+$/',
                'unique:user_profiles,nickname',
            ],
            'bio' => ['nullable','string','max:200'],
        ]);

        $profile = UserProfile::updateOrCreate(
            ['user_id' => $me->id],
            [
                'nickname' => $data['nickname'],
                'bio'      => $data['bio'] ?? '',
            ],
        );

        return response()->json([
            'ok'      => true,
            'profile' => [
                'nickname' => $profile->nickname,
                'bio'      => $profile->bio,
            ],
        ]);
    }
}
