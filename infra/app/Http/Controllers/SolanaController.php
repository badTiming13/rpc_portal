<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;

class SolanaController extends Controller
{
    private function base(): string
    {
        // Make sure .env inside the container has SOL_SERVICE_BASE=http://host.docker.internal:8001
        return rtrim(env('SOL_SERVICE_BASE', 'http://host.docker.internal:8001'), '/');
    }

    public function initUser(Request $req)
    {
        $data = $req->validate(['username' => ['required','string','max:32']]);
        $owner = Auth::user()?->wallet;
        if (!$owner) return response()->json(['ok'=>false,'error'=>'not_authenticated_or_no_wallet'], 401);

        $resp = Http::asJson()->post($this->base().'/init-user', [
            'owner'=>$owner, 'username'=>$data['username']
        ]);
        return response()->json($resp->json(), $resp->status());
    }

    public function post(Request $req)
    {
        $data = $req->validate(['text' => ['required','string','max:5000']]);
        $owner = Auth::user()?->wallet;
        if (!$owner) return response()->json(['ok'=>false,'error'=>'not_authenticated_or_no_wallet'], 401);

        \Log::info('POST /sol/post forwarding', [
            'base' => $this->base(),
            'owner' => $owner,
            'text_len' => strlen($data['text'] ?? ''),
        ]);

        $resp = Http::asJson()->post($this->base().'/post', [
            'owner'=>$owner, 'text'=>$data['text'],
        ]);
        return response()->json($resp->json(), $resp->status());
    }

    public function like(Request $req)
    {
        $data = $req->validate([
            'post_owner' => ['required','string'],
            'post_seq'   => ['required','integer','min:1'],
        ]);
        $liker = Auth::user()?->wallet;
        if (!$liker) return response()->json(['ok'=>false,'error'=>'not_authenticated_or_no_wallet'], 401);

        $resp = Http::asJson()->post($this->base().'/like', [
            'post_owner'=>$data['post_owner'],
            'post_seq'=>$data['post_seq'],
            'liker'=>$liker,
        ]);
        return response()->json($resp->json(), $resp->status());
    }

    public function readPost(string $sig)
    {
        $resp = Http::get($this->base().'/read-post/'.$sig);
        return response()->json($resp->json(), $resp->status());
    }

    public function readUser(string $owner)
    {
        $resp = Http::get($this->base().'/read-user/'.$owner);
        return response()->json($resp->json(), $resp->status());
    }
}
