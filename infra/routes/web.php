<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\PhantomAuthController;
use App\Http\Controllers\WalletAuthController;

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