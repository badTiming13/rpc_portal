<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class GifController extends Controller
{
    public function search(Request $req)
    {
        $q = trim((string) $req->query('q', ''));
        if ($q === '') {
            return response()->json(['ok' => false, 'error' => 'Type to search'], 400);
        }

        $limit = (int) $req->query('limit', 24);
        $limit = max(1, min($limit, 50));

        // Tenor v1 key (demo default is fine for tests)
        $key = config('services.tenor.key', env('TENOR_API_KEY', 'LIVDSRZULELA'));

        // Keep params simple & compatible with v1
        $params = [
            'q'          => $q,
            'key'        => $key,
            'client_key' => config('app.name', 'app'),
            'limit'      => $limit,
            // Tip: removing 'media_filter' avoids shape changes across v1/v2
            // 'media_filter' => 'minimal',
        ];

        $res = Http::timeout(10)->get('https://g.tenor.com/v1/search', $params);

        if ($res->failed()) {
            return response()->json([
                'ok'     => false,
                'status' => $res->status(),
                'detail' => $res->json() ?: $res->body(),
            ], $res->status());
        }

        $json = $res->json();
        $results = $json['results'] ?? [];

        $out = [];

        foreach ($results as $r) {
            // v1 shape: results[].media is an ARRAY of objects
            // e.g. media[0].tinygif.url / .gif.url / .mediumgif.url
            if (isset($r['media']) && is_array($r['media'])) {
                $m = $r['media'][0] ?? [];
                $url =
                    ($m['tinygif']['url'] ?? null) ??
                    ($m['nanogif']['url'] ?? null) ??
                    ($m['mediumgif']['url'] ?? null) ??
                    ($m['gif']['url'] ?? null);
                if ($url) {
                    $out[] = $url;
                    continue;
                }
            }

            // v2 fallback ('media_formats' object)
            if (isset($r['media_formats']) && is_array($r['media_formats'])) {
                $mf = $r['media_formats'];
                $url =
                    ($mf['tinygif']['url'] ?? null) ??
                    ($mf['nanogif']['url'] ?? null) ??
                    ($mf['mediumgif']['url'] ?? null) ??
                    ($mf['gif']['url'] ?? null);
                if ($url) {
                    $out[] = $url;
                    continue;
                }
            }
        }

        return ['ok' => true, 'q' => $q, 'count' => count($out), 'gifs' => $out];
    }
}
