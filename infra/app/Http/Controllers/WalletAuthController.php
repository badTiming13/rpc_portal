<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use App\Models\User;
use StephenHill\Base58;

class WalletAuthController extends Controller
{
    public function nonce(Request $request)
    {
        $nonce = Str::random(32);
        $issuedAt = now()->toIso8601String();
        $app = config('app.name', 'Laravel');

        $message = "{$app} wants you to sign in.\n\nNonce: {$nonce}\nIssued At: {$issuedAt}";

        Cache::put("siws:{$nonce}", [
            'message'    => $message,
            'created_at' => now(),
        ], now()->addMinutes(5));

        return response()->json([
            'nonce'   => $nonce,
            'message' => $message,
        ]);
    }

    public function verify(Request $request)
    {
        $validated = $request->validate([
            'address'   => ['required', 'string'],
            'signature' => ['required', 'string'],
            'nonce'     => ['required', 'string'],
        ]);

        // одноразовый nonce + исходный message
        $entry = Cache::pull("siws:{$validated['nonce']}");
        if (!$entry || empty($entry['message'])) {
            return response('Invalid or expired nonce', 422);
        }
        $msg = $entry['message'];

        // base58 → bytes
        $b58 = new Base58();
        try {
            $pubkey = $b58->decode($validated['address']);     // 32 bytes
            $sig    = $b58->decode($validated['signature']);   // 64 bytes
        } catch (\Throwable $e) {
            return response('Bad base58', 400);
        }
        if (strlen($pubkey) !== 32 || strlen($sig) !== 64) {
            return response('Invalid key or signature length', 400);
        }

        // Ed25519-проверка
        if (!sodium_crypto_sign_verify_detached($sig, $msg, $pubkey)) {
            return response('Invalid signature', 401);
        }

        $address = $validated['address'];

        // Если уже есть пользователь в сессии без кошелька — проставим ему
        if (Auth::check() && empty(Auth::user()->wallet)) {
            $current = Auth::user();

            // Если адрес уже принадлежит другому пользователю — логиним того
            $owner = User::where('wallet', $address)->first();
            if ($owner && $owner->id !== $current->id) {
                Auth::login($owner, true);
                $user = $owner;
            } else {
                $current->wallet = $address; // fillable уже позволяет
                $current->save();
                $user = $current;
            }
        } else {
            // Находим или создаём по адресу кошелька
            $user = User::firstOrCreate(
                ['wallet' => $address],
                ['name' => 'Wallet ' . substr($address, 0, 6)]
            );
            Auth::login($user, true);
        }

        return response()->json([
            'ok'   => true,
            'user' => [
                'id'     => $user->id,
                'wallet' => $user->wallet,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return back();
    }
}
