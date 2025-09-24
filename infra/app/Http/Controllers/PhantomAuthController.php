<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use StephenHill\Base58;

class PhantomAuthController extends Controller
{
    // 1) Выдаём одноразовый nonce и сообщение для подписи
    public function nonce(Request $request)
    {
        $nonce = bin2hex(random_bytes(16)); // 32 hex chars
        $msg = "Sign in to APEWISE\n\n".
               "Nonce: {$nonce}\n".
               "Domain: ".$request->getHost()."\n".
               "Time: ".now()->toIso8601String();

        // Храним nonce 5 минут, привязываем к IP/UA (легко ослабить)
        Cache::put($this->cacheKey($nonce, $request), $msg, now()->addMinutes(5));

        return response()->json([
            'nonce' => $nonce,
            'message' => $msg,
        ]);
    }

    // 2) Проверяем подпись и логиним
    public function verify(Request $request)
    {
        $data = $request->validate([
            'publicKey' => 'required|string',   // base58
            'signature' => 'required|string',   // base58
            'nonce'     => 'required|string',
        ]);

        $cacheKey = $this->cacheKey($data['nonce'], $request);
        $message = Cache::pull($cacheKey); // pull => одноразовый (anti-replay)

        if (!$message) {
            return response()->json(['error' => 'Nonce expired or invalid'], 422);
        }

        // base58 -> binary
        $b58 = new Base58();
        try {
            $pubKeyBin = $b58->decode($data['publicKey']);
            $sigBin    = $b58->decode($data['signature']);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'Invalid base58'], 422);
        }

        // verify: ed25519 (Solana)
        // sodium_crypto_sign_verify_detached(signature, message, publicKey)
        $ok = sodium_crypto_sign_verify_detached($sigBin, $message, $pubKeyBin);

        if (!$ok) {
            return response()->json(['error' => 'Signature verification failed'], 401);
        }

        // upsert user by wallet
        $user = User::firstOrCreate(
            ['wallet_address' => $data['publicKey']],
            ['name' => 'Wallet '.substr($data['publicKey'], 0, 6)]
        );

        // issue session
        Auth::login($user, true);
        $request->session()->regenerate();

        return response()->json(['ok' => true, 'user' => [
            'id' => $user->id,
            'wallet' => $user->wallet_address,
        ]]);
    }

    private function cacheKey(string $nonce, Request $request): string
    {
        // по желанию убери привязку к UA/IP
        return 'siws:'.$nonce.':'.sha1($request->userAgent().'|'.$request->ip());
    }
}
