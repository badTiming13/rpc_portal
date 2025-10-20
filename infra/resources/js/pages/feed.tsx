// resources/js/pages/Feed.tsx
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/AppLayout';
import PostCard from '@/components/PostCard';
import PostComposer, { PostPayload } from '@/components/PostComposer';
import { Button } from '@/components/ui/Button';
import { Head, router, usePage } from '@inertiajs/react';

type Post = {
  id: string | number;
  author: { name: string; handle?: string; avatar_url?: string | null; wallet?: string | null };
  text: string;
  createdAt: string;
  liked?: boolean;
  likeCount?: number;
  commentCount?: number;
  repostCount?: number;
  tx?: string;
  onchain?: boolean; // false = optimistic "Posting…", true = confirmed or at least submitted
};

export default function Feed() {
  const { props } = usePage<{
    posts: Post[];
    auth?: { user?: { id: number; name: string; wallet?: string | null } };
  }>();
  const postsSSR = props.posts ?? [];
  const user = props.auth?.user;
  const wallet = user?.wallet ?? null;

  const [checking, setChecking] = useState(false);
  const [onchainReady, setOnchainReady] = useState<'unknown' | 'yes' | 'no'>(wallet ? 'unknown' : 'no');
  const [initBusy, setInitBusy] = useState(false);
  const [initMsg, setInitMsg] = useState<string | null>(null);

  // optimistic items
  const [localPosts, setLocalPosts] = useState<Post[]>([]);

  const csrf = () =>
    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!wallet) { setOnchainReady('no'); return; }
      setChecking(true);
      try {
        const res = await fetch(`/sol/user/${wallet}`, { credentials: 'same-origin' });
        if (!cancelled) setOnchainReady(res.ok ? 'yes' : 'no');
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [wallet]);

  const initUser = async () => {
    if (!wallet) return;
    setInitBusy(true);
    setInitMsg(null);
    try {
      const username = `u_${wallet.slice(0, 6)}`;
      const res = await fetch('/sol/init-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
        credentials: 'same-origin',
        body: JSON.stringify({ username }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.ok) {
        setOnchainReady('yes');
        setInitMsg(`Initialized ✅ tx: ${j.sig}`);
      } else {
        setInitMsg(`Failed: ${j?.detail || j?.error || res.statusText}`);
      }
    } finally {
      setInitBusy(false);
    }
  };

  const explorerTx = (sig: string) =>
    `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

  // robust poller: up to ~45s with gentle backoff; ignore 404/500/network errors
  const pollReadPost = async (sig: string) => {
    const attempts = 18;          // 18 tries
    let delay = 800;              // start 0.8s
    for (let i = 0; i < attempts; i++) {
      try {
        const r = await fetch(`/sol/post/${sig}`, { credentials: 'same-origin' });
        if (r.ok) return await r.json();
      } catch {
        // ignore network errors and continue
      }
      await new Promise(res => setTimeout(res, delay));
      // small backoff but cap ~3s
      delay = Math.min(delay + 300, 3000);
    }
    // give up (still on-chain, just not indexed by our read endpoint yet)
    return null;
  };

  // send post, show optimistic, poll, then finalize (or fail-safe finalize)
  const createPost = async (payload: PostPayload) => {
    const base = (payload.text || '').trim();
    const withGif = payload.gifUrl ? `${base}\n${payload.gifUrl}` : base;
    if (!withGif) return;

    const res = await fetch('/sol/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
      credentials: 'same-origin',
      body: JSON.stringify({ text: withGif }),
    });
    const j = await res.json().catch(() => ({}));

    if (!res.ok || !j?.ok) {
      const reason = j?.detail || j?.error || res.statusText;
      alert(`Post failed: ${reason}`);
      if (String(reason).includes('user_not_found')) setOnchainReady('no');
      return;
    }

    const sig: string = j.sig;

    // optimistic card
    const optimisticId = `pending-${sig}`;
    setLocalPosts(p => [{
      id: optimisticId,
      author: { name: user?.name || 'You', handle: user?.wallet?.slice(0, 6), wallet: user?.wallet },
      text: withGif,
      createdAt: new Date().toISOString(),
      onchain: false,
      tx: sig,
    }, ...p]);

    // poll for readable memo
    const read = await pollReadPost(sig);

    // finalize (even if read failed — tx is submitted)
    setLocalPosts(p => {
      const idx = p.findIndex(x => x.id === optimisticId);
      if (idx === -1) return p;
      const next = [...p];
      const onchainText = (read?.text as string | undefined) || withGif;
      next[idx] = {
        ...next[idx],
        id: sig,           // stable id
        text: onchainText, // joined chunks if we managed to read
        onchain: true,     // flip state so UI stops saying "Posting…"
      };
      return next;
    });

    // refresh SSR feed in the background
    router.reload({ only: ['posts'], preserveScroll: true });
  };

  const like = async (id: string | number) => {
    console.log('like', id);
  };

  return (
    <>
      <Head title="Feed" />
      <div className="space-y-4">
        {!user ? (
          <div className="rounded-xl border border-black/10 bg-white/5 p-4 text-sm dark:border-white/10">
            Please connect & sign in with your wallet to post.
          </div>
        ) : onchainReady !== 'yes' ? (
          <div className="rounded-xl border border-black/10 bg-white/5 p-4 dark:border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm opacity-80">
                {checking ? 'Checking on-chain profile…' : 'Your on-chain profile is not initialized yet.'}
              </div>
              <Button onClick={initUser} disabled={initBusy || checking}>
                {initBusy ? 'Initializing…' : 'Init user on-chain'}
              </Button>
            </div>
            {initMsg && <div className="mt-2 break-all text-xs opacity-70">{initMsg}</div>}
          </div>
        ) : null}

        {user && onchainReady === 'yes' && <PostComposer onSubmit={createPost} />}

        {/* optimistic list */}
        {localPosts.map((p) => (
          <div key={p.id}>
            <PostCard
              {...p}
              onLike={like}
              onComment={(id) => console.log('comment', id)}
              onRepost={(id) => console.log('repost', id)}
              onShare={(id) => console.log('share', id)}
            />
         
          </div>
        ))}

        {/* server posts (no duplication of localPosts) */}
        {postsSSR.map((p) => (
          <PostCard
            key={`ssr-${p.id}`}
            {...p}
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
