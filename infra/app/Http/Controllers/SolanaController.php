<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class SolanaController extends Controller
{
    private function base(): string
    {
        // configure in .env : SOL_SERVICE_BASE=http://host.docker.internal:8001
        return rtrim(env('SOL_SERVICE_BASE', 'http://host.docker.internal:8001'), '/');
    }

    /**
     * Build a human-ish timestamp for UI.
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
     * Turn a stored path like 'post_media/abc.jpg' into a browser-accessible URL.
     *
     * Assumes you've run: php artisan storage:link
     * So /storage maps to storage/app/public.
     */
    private function publicMediaUrl(string $relativePath): string
    {
        // we always save into disk 'public', so Storage::url() will return '/storage/...'
        return Storage::disk('public')->url($relativePath);
    }

    /**
     * POST /sol/upload-image
     *
     * Accept ONE image file (jpeg/png/webp/gif/etc),
     * save to storage/app/public/post_media/{randomname.ext},
     * return { ok:true, url:"/storage/post_media/..." }
     */
    public function uploadImage(Request $req)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json([
                'ok' => false,
                'error' => 'not_authenticated',
            ], 401);
        }

        $req->validate([
            'image' => [
                'required',
                'file',
                'image',
                'max:5120', // 5MB
            ],
        ]);

        $file = $req->file('image');

        $storedPath = $file->store('post_media', 'public');

        if (!$storedPath) {
            return response()->json([
                'ok' => false,
                'error' => 'store_failed',
            ], 500);
        }

        $url = $this->publicMediaUrl($storedPath);

        return response()->json([
            'ok'  => true,
            'url' => $url,
        ]);
    }

    public function initUser(Request $req)
    {
        $data = $req->validate([
            'username' => ['required','string','max:32'],
        ]);

        $owner = Auth::user()?->wallet;
        if (!$owner) {
            return response()->json([
                'ok' => false,
                'error' => 'not_authenticated_or_no_wallet'
            ], 401);
        }

        $resp = Http::asJson()->post($this->base().'/init-user', [
            'owner'    => $owner,
            'username' => $data['username'],
        ]);

        return response()->json($resp->json(), $resp->status());
    }

    /**
     * POST /sol/post
     *
     * Expects final "text" which ALREADY includes any uploaded image URLs
     * (and GIF URL etc).
     */
    public function post(Request $req)
    {
        $data = $req->validate([
            'text' => ['required','string','max:5000'],
        ]);

        $laravelUser = Auth::user();
        $owner = $laravelUser?->wallet;

        if (!$laravelUser || !$owner) {
            return response()->json([
                'ok' => false,
                'error' => 'not_authenticated_or_no_wallet'
            ], 401);
        }

        \Log::info('POST /sol/post forwarding', [
            'base'     => $this->base(),
            'owner'    => $owner,
            'text_len' => strlen($data['text'] ?? ''),
        ]);

        // 1. Call python -> actually send on-chain tx(s)
        $resp = Http::asJson()->post($this->base().'/post', [
            'owner' => $owner,
            'text'  => $data['text'],
        ]);

        if (!$resp->ok() || !($resp->json('ok'))) {
            return response()->json([
                'ok'    => false,
                'error' => $resp->json('detail') ?? $resp->body(),
            ], $resp->status() ?: 500);
        }

        // python response
        $rootSig    = $resp->json('root_sig');
        $chunksResp = $resp->json('chunks'); // [{ index,total,tx_signature,content_utf8 }, ...]
        $now        = now();

        // 2. Store in DB immediately
        $postId = null;

        DB::transaction(function () use (
            $laravelUser,
            $rootSig,
            $data,
            $now,
            $chunksResp,
            &$postId
        ) {
            // posts row
            $postId = DB::table('posts')->insertGetId([
                'author_id'               => $laravelUser->id,
                'root_signature'          => $rootSig,
                'first_slot'              => 0,
                'first_block_time'        => $now,
                'content_short'           => mb_substr($data['text'], 0, 200),
                'reply_to_root_signature' => null,
                'likes_count'             => 0,
                'comments_count'          => 0,
                'created_at'              => $now,
                'updated_at'              => $now,
            ]);

            // child chunks
            foreach ($chunksResp as $chunk) {
                DB::table('post_chunks')->insert([
                    'post_id'      => $postId,
                    'chunk_index'  => $chunk['index'],
                    'tx_signature' => $chunk['tx_signature'],
                    'slot'         => 0,
                    'block_time'   => $now,
                    'content'      => $chunk['content_utf8'],
                    'created_at'   => $now,
                    'updated_at'   => $now,
                ]);
            }
        });

        // 3. Build full text from chunks
        usort($chunksResp, fn($a,$b) => $a['index'] <=> $b['index']);
        $fullText = implode('', array_map(fn($c) => $c['content_utf8'], $chunksResp));

        // 4. Shape the post for UI
        $postForUi = [
            'id'           => $postId,
            'author'       => [
                'name'       => $laravelUser->name ?? 'You',
                'handle'     => $laravelUser->wallet ? substr($laravelUser->wallet, 0, 6) : null,
                'wallet'     => $laravelUser->wallet,
                'avatar_url' => null,
            ],
            'text'         => $fullText,
            'createdAt'    => $this->humanTime($now),
            'liked'        => false,
            'likeCount'    => 0,
            'commentCount' => 0,
            'repostCount'  => 0,
            'tx'           => $rootSig,
            'onchain'      => true,
        ];

        return response()->json([
            'ok'   => true,
            'post' => $postForUi,
        ]);
    }

    public function like(Request $req)
    {
        $data = $req->validate([
            'post_owner' => ['required','string'],
            'post_seq'   => ['required','integer','min:1'],
        ]);

        $liker = Auth::user()?->wallet;
        if (!$liker) {
            return response()->json([
                'ok' => false,
                'error' => 'not_authenticated_or_no_wallet'
            ], 401);
        }

        $resp = Http::asJson()->post($this->base().'/like', [
            'post_owner' => $data['post_owner'],
            'post_seq'   => $data['post_seq'],
            'liker'      => $liker,
        ]);

        return response()->json($resp->json(), $resp->status());
    }

    // debug-ish, but also used by ProfileController to sync on-chain stats
    public function readUser(string $owner)
    {
        $resp = Http::get($this->base().'/read-user/'.$owner);
        return response()->json($resp->json(), $resp->status());
    }

    public function readPost(string $sig)
    {
        $resp = Http::get($this->base().'/read-post/'.$sig);
        return response()->json($resp->json(), $resp->status());
    }

    /**
     * POST /sol/deposit
     * body: { amount_sol: number }
     *
     * forwards to python /deposit:
     *   { owner: <wallet>, amount_sol: <float> }
     */
    public function deposit(Request $req)
    {
        $me = Auth::user();
        if (!$me || !$me->wallet) {
            return response()->json([
                'ok'    => false,
                'error' => 'not_authenticated_or_no_wallet',
            ], 401);
        }

        $data = $req->validate([
            'amount_sol' => ['required','numeric','gt:0'],
        ]);

        $resp = Http::asJson()->post($this->base().'/deposit', [
            'owner'      => $me->wallet,
            'amount_sol' => (float)$data['amount_sol'],
        ]);

        if (!$resp->ok()) {
            return response()->json([
                'ok'    => false,
                'error' => $resp->json('detail') ?? $resp->body(),
            ], $resp->status() ?: 500);
        }

        return response()->json($resp->json(), $resp->status());
    }

    /**
     * POST /sol/withdraw
     * body: { amount_sol: number }
     *
     * forwards to python /withdraw:
     *   { owner: <wallet>, amount_sol: <float> }
     */
    public function withdraw(Request $req)
    {
        $me = Auth::user();
        if (!$me || !$me->wallet) {
            return response()->json([
                'ok'    => false,
                'error' => 'not_authenticated_or_no_wallet',
            ], 401);
        }

        $data = $req->validate([
            'amount_sol' => ['required','numeric','gt:0'],
        ]);

        $resp = Http::asJson()->post($this->base().'/withdraw', [
            'owner'      => $me->wallet,
            'amount_sol' => (float)$data['amount_sol'],
        ]);

        if (!$resp->ok()) {
            return response()->json([
                'ok'    => false,
                'error' => $resp->json('detail') ?? $resp->body(),
            ], $resp->status() ?: 500);
        }

        return response()->json($resp->json(), $resp->status());
    }
}
