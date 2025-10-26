// resources/js/pages/Feed.tsx
import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/layouts/AppLayout';
import PostCard from '@/components/PostCard';
import PostComposer, { PostPayload } from '@/components/PostComposer';
import { Button } from '@/components/ui/Button';
import { Head, router, usePage } from '@inertiajs/react';

// unified post shape we render
export type FeedPost = {
  postKey: string; // stable unique key (root_sig if we have it, else db id string)
  id: string | number;
  author: {
    name: string;
    handle?: string;
    avatar_url?: string | null;
    wallet?: string | null;
  };
  text: string;
  createdAt: string; // ISO-ish string
  liked?: boolean;
  likeCount?: number;
  commentCount?: number;
  repostCount?: number;
  tx?: string;      // root tx signature
  onchain?: boolean;
  pending?: boolean; // true for optimistic posts that haven't come back from server yet
};

type PageProps = {
  posts: Array<{
    id: string | number;
    author: {
      name: string;
      handle?: string;
      avatar_url?: string | null;
      wallet?: string | null;
    };
    text: string;
    createdAt: string;
    liked?: boolean;
    likeCount?: number;
    commentCount?: number;
    repostCount?: number;
    tx?: string;   // root_sig
    onchain?: boolean;
  }>;
  auth?: { user?: { id: number; name: string; wallet?: string | null } };
};

export default function Feed() {
  const { props } = usePage<PageProps>();
  const ssrPostsRaw = props.posts ?? [];
  const user = props.auth?.user;
  const wallet = user?.wallet ?? null;

  // ------- on-chain profile gating -------
  const [checking, setChecking] = useState(false);

  // 'unknown'  -> we haven't checked yet
  // 'yes'      -> wallet exists on-chain
  // 'no'       -> wallet missing on-chain OR no wallet
  const [onchainReady, setOnchainReady] = useState<'unknown' | 'yes' | 'no'>(
    wallet ? 'unknown' : 'no',
  );

  const [initBusy, setInitBusy] = useState(false);
  const [initMsg, setInitMsg] = useState<string | null>(null);

  // ------- feed state -------
  // start with SSR-normalized list
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>(() =>
    ssrPostsRaw.map(normalizeFromSSR),
  );

  // when SSR posts update (Inertia reload), reconcile:
  // - take all fresh SSR posts
  // - keep any still-pending optimistic posts that SSR didn't include yet
  useEffect(() => {
    const fresh = ssrPostsRaw.map(normalizeFromSSR); // pending:false
    setFeedPosts((prev) => reconcileAfterSSR(prev, fresh));
  }, [ssrPostsRaw]);

  // csrf helper
  const csrf = () =>
    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)
      ?.content || '';

  // --- Check PDA / on-chain user ---
  useEffect(() => {
    let cancelled = false;

    // if no wallet -> immediately mark "no"
    if (!wallet) {
      setOnchainReady('no');
      return;
    }

    // if we ALREADY know it's yes, we can optionally skip – but
    // let's still re-check when wallet changes or page mounts
    // to avoid stale UI. lightweight GET.
    const run = async () => {
      setChecking(true);
      try {
        console.debug('[Feed] checking on-chain /sol/user/', wallet);
        const res = await fetch(`/sol/user/${wallet}`, {
          credentials: 'same-origin',
        });

        if (cancelled) return;

        if (res.ok) {
          console.debug('[Feed] /sol/user OK -> onchainReady yes');
          setOnchainReady('yes');
        } else {
          console.debug(
            '[Feed] /sol/user not ok',
            res.status,
            '-> onchainReady no',
          );
          setOnchainReady('no');
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[Feed] /sol/user check error', err);
          // network failure -> be conservative, say "no"
          setOnchainReady('no');
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  // --- Init user on-chain ---
  const initUser = async () => {
    if (!wallet) return;
    setInitBusy(true);
    setInitMsg(null);
    try {
      const username = `u_${wallet.slice(0, 6)}`;
      const res = await fetch('/sol/init-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrf(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ username }),
      });

      const j = await res.json().catch(() => ({} as any));

      if (res.ok && j?.ok) {
        setOnchainReady('yes');
        setInitMsg(`Initialized ✅ tx: ${j.sig ?? 'n/a'}`);
      } else {
        setOnchainReady('no');
        setInitMsg(`Failed: ${j?.detail || j?.error || res.statusText}`);
      }
    } finally {
      setInitBusy(false);
    }
  };

  // helper timestamp for optimistic posts
  const nowIso = () => new Date().toISOString();

  // --- Create post ---
  // parent callback for <PostComposer onSubmit={...}/>
  const createPost = async (payload: PostPayload) => {
    // payload.text is ALREADY final: user text + uploaded image URLs + gifUrl
    const combinedText = payload.text?.trim();
    if (!combinedText) return;

    const res = await fetch('/sol/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrf(),
      },
      credentials: 'same-origin',
      body: JSON.stringify({ text: combinedText }),
    });

    const j = await res.json().catch(() => ({} as any));

    if (!res.ok || !j?.ok) {
      const reason = j?.detail || j?.error || res.statusText;
      alert(`Post failed: ${reason}`);
      if (String(reason).includes('user_not_found')) {
        // backend said PDA not ready?
        setOnchainReady('no');
      }
      return;
    }

    // python+laravel response:
    // { ok: true, post: { ...shaped like FeedPost minus postKey } }
    const newPostRaw = j.post;

    // fallback if backend didn't return post.time in ISO
    const optimisticCreatedAt = nowIso();

    // optimistic object that matches FeedPost shape
    const optimistic: FeedPost = {
      postKey: newPostRaw.tx || String(newPostRaw.id) || `tmp-${Date.now()}`,
      id: newPostRaw.id ?? `tmp-${Date.now()}`,
      author: newPostRaw.author ?? {
        name: user?.name || 'You',
        handle: wallet ? wallet.slice(0, 6) : undefined,
        wallet: wallet || null,
        avatar_url: null,
      },
      text: newPostRaw.text ?? combinedText,
      createdAt: newPostRaw.createdAt || optimisticCreatedAt,
      onchain: true,
      pending: true,
      tx: newPostRaw.tx,
      likeCount: newPostRaw.likeCount ?? 0,
      commentCount: newPostRaw.commentCount ?? 0,
      repostCount: newPostRaw.repostCount ?? 0,
    };

    // insert optimistic post now
    setFeedPosts((prev) => {
      const map = new Map(prev.map((p) => [p.postKey, p]));
      map.set(optimistic.postKey, optimistic);
      return Array.from(map.values());
    });

    // soft refresh from server to pull canonical post rows
    router.reload({ only: ['posts'], preserveScroll: true });
  };

  // like stub
  const like = async (id: string | number) => {
    console.log('like', id);
    // TODO: implement /sol/like + update state
  };

  // newest-first feed
  const sortedFeed = useMemo(() => {
    return [...feedPosts].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    );
  }, [feedPosts]);

  return (
    <>
      <Head title="Feed" />
      <div className="space-y-4">
        {/* onboarding / profile init banner */}
        {!user ? (
          <div className="rounded-xl border border-black/10 bg-white/5 p-4 text-sm dark:border-white/10">
            Please connect &amp; sign in with your wallet to post.
          </div>
        ) : onchainReady !== 'yes' ? (
          <div className="rounded-xl border border-black/10 bg-white/5 p-4 dark:border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm opacity-80">
                {checking
                  ? 'Checking on-chain profile…'
                  : 'Your on-chain profile is not initialized yet.'}
              </div>
              <Button
                onClick={initUser}
                disabled={initBusy || checking}
              >
                {initBusy ? 'Initializing…' : 'Init user on-chain'}
              </Button>
            </div>
            {initMsg && (
              <div className="mt-2 break-all text-xs opacity-70">
                {initMsg}
              </div>
            )}
          </div>
        ) : null}

        {/* composer (only once you have wallet + you're on-chain ready) */}
        {user && onchainReady === 'yes' && (
          <PostComposer onSubmit={createPost} />
        )}

        {/* feed */}
        {sortedFeed.map((p) => (
          <PostCard
            key={p.postKey}
            id={p.id}
            author={p.author}
            text={p.text}
            createdAt={p.createdAt}
            liked={p.liked}
            likeCount={p.likeCount}
            commentCount={p.commentCount}
            repostCount={p.repostCount}
            tx={p.tx}
            onLike={like}
            onComment={(id) => console.log('comment', id)}
            onRepost={(id) => console.log('repost', id)}
            onShare={(id) => console.log('share', id)}
          />
        ))}
      </div>
    </>
  );
}

Feed.layout = (page: any) => <AppLayout>{page}</AppLayout>;

/* ---------- helpers ---------- */

// normalize a server post (SSR) into FeedPost
function normalizeFromSSR(p: PageProps['posts'][number]): FeedPost {
  const postKey = p.tx || String(p.id); // prefer root_sig if present
  return {
    postKey,
    id: p.id ?? postKey,
    author: p.author,
    text: p.text,
    createdAt: p.createdAt || new Date().toISOString(),
    liked: p.liked,
    likeCount: p.likeCount ?? 0,
    commentCount: p.commentCount ?? 0,
    repostCount: p.repostCount ?? 0,
    tx: p.tx,
    onchain: p.onchain,
    pending: false, // SSR posts are canonical
  };
}

/**
 * reconcileAfterSSR(prev, freshSSR)
 *
 * Goal:
 *   - let fresh SSR posts (canonical DB rows) win
 *   - keep any optimistic pending post the server doesn't know yet
 */
function reconcileAfterSSR(prev: FeedPost[], freshSSR: FeedPost[]): FeedPost[] {
  const freshMap = new Map<string, FeedPost>();
  for (const p of freshSSR) {
    freshMap.set(p.postKey, p);
  }
  for (const old of prev) {
    if (old.pending && !freshMap.has(old.postKey)) {
      freshMap.set(old.postKey, old);
    }
  }
  return Array.from(freshMap.values());
}
