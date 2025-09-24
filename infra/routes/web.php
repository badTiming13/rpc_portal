<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\PhantomAuthController;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');


Route::middleware('guest')->group(function () {
    Route::get('/auth/phantom/nonce', [PhantomAuthController::class, 'nonce']);
    Route::post('/auth/phantom/verify', [PhantomAuthController::class, 'verify']);
});

Route::post('/logout', function () {
    \Illuminate\Support\Facades\Auth::logout();
    request()->session()->invalidate();
    request()->session()->regenerateToken();
    return redirect('/');
})->name('logout');