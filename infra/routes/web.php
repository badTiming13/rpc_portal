<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Http\Controllers\WalletAuthController;
use App\Http\Controllers\SolanaController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\GifController;
use Carbon\Carbon;

/**
 * helper to mirror SolanaController::humanTime()
 * (we duplicate here because routes file is not inside the controller class)
 */
if (!function_exists('human_time_for_feed')) {
    function human_time_for_feed(Carbon $ts): string {
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
}

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::get('/land', function () {
    return Inertia::render('Home');
})->name('land');


Route::get('/wallet/nonce', [WalletAuthController::class, 'nonce']);
Route::post('/wallet/verify', [WalletAuthController::class, 'verify']);
Route::post('/logout', [WalletAuthController::class, 'logout'])->name('logout');

Route::get('/me', function () {
    return [
        'auth' => Auth::check(),
        'user' => Auth::user()?->only('id','name','wallet'),
        'session_id' => session()->getId(),
    ];
});

// on-chain actions behind web middleware


Route::middleware('web')->group(function () {
    // profile page
    Route::post('/profile/check-nickname', [ProfileController::class, 'checkNickname']);
    Route::get('/profile', [ProfileController::class, 'show'])->name('profile.show');
    Route::post('/profile/setup-local', [ProfileController::class, 'saveLocalProfile']);

    // create / init / interactions
    Route::post('/sol/upload-image', [SolanaController::class, 'uploadImage']);
    Route::post('/sol/post',         [SolanaController::class, 'post']);
    Route::post('/sol/init-user',    [SolanaController::class, 'initUser']);
    Route::post('/sol/like',         [SolanaController::class, 'like']);

    // read / status
    Route::get('/sol/user/{wallet}', [SolanaController::class, 'readUser']);
    Route::get('/sol/post/{sig}',    [SolanaController::class, 'readPost']);

    Route::post('/sol/deposit', [SolanaController::class, 'deposit']);
    Route::post('/sol/withdraw', [SolanaController::class, 'withdraw']);
});

// FEED page (SSR from DB, not from python)
Route::get('/feed', function () {
    $authUser = Auth::user();

    // latest 50 posts
    $rows = DB::table('posts')
        ->join('users', 'posts.author_id', '=', 'users.id')
        ->orderByDesc('posts.created_at')
        ->limit(50)
        ->get([
            'posts.id as id',
            'users.name as author_name',
            'users.wallet as author_wallet',
            'posts.root_signature as tx',
            'posts.created_at as created_at',
        ]);

    $postIds = $rows->pluck('id')->all();

    // fetch chunks for them
    $chunks = DB::table('post_chunks')
        ->whereIn('post_id', $postIds)
        ->orderBy('chunk_index')
        ->get([
            'post_id',
            'chunk_index',
            'content',
        ]);

    // stitch chunks per post
    $fullTextByPostId = [];
    foreach ($chunks as $c) {
        if (!isset($fullTextByPostId[$c->post_id])) {
            $fullTextByPostId[$c->post_id] = '';
        }
        $fullTextByPostId[$c->post_id] .= $c->content;
    }

    // shape for frontend
    $posts = $rows->map(function ($row) use ($fullTextByPostId) {
        $textCombined = $fullTextByPostId[$row->id] ?? '';

        return [
            'id'           => $row->id,
            'author'       => [
                'name'       => $row->author_name,
                'handle'     => $row->author_wallet ? substr($row->author_wallet, 0, 6) : null,
                'wallet'     => $row->author_wallet,
                'avatar_url' => null,
            ],
            'text'         => $textCombined,
            'createdAt'    => human_time_for_feed(Carbon::parse($row->created_at)),
            'liked'        => false,
            'likeCount'    => 0,
            'commentCount' => 0,
            'repostCount'  => 0,
            'tx'           => $row->tx,
            'onchain'      => true,
        ];
    });

    return Inertia::render('feed', [
        'posts' => $posts,
        'auth'  => [
            'user' => $authUser
                ? $authUser->only(['id','name','wallet'])
                : null,
        ],
    ]);
});

Route::get('/api/gif/search', [GifController::class, 'search']);
