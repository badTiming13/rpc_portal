<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\WalletAuthController;
use App\Http\Controllers\SolanaController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

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

Route::middleware('web')->group(function () {
    Route::post('/sol/init-user', [SolanaController::class, 'initUser']);
    Route::post('/sol/post',      [SolanaController::class, 'post']);
    Route::post('/sol/like',      [SolanaController::class, 'like']);
    Route::get('/sol/post/{sig}', [SolanaController::class, 'readPost']);
    Route::get('/sol/user/{owner}', [SolanaController::class, 'readUser']);
});

Route::get('/feed', function () {
    return Inertia::render('feed');
});