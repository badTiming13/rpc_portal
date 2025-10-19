// resources/js/pages/Feed.tsx
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/AppLayout';
import PostCard from '@/components/PostCard';
import PostComposer, { PostPayload } from '@/components/PostComposer';
import { Button } from '@/components/ui/Button';
import { Head, router, usePage } from '@inertiajs/react';

type Post = {
  id: number | string;
  author: { name: string; handle?: string; avatar_url?: string | null; wallet?: string | null };
  text: string;
  createdAt: string;
  liked?: boolean;
  likeCount?: number;
  commentCount?: number;
  repostCount?: number;
};

export default function Feed() {
  const { props } = usePage<{ posts: Post[]; auth?: { user?: { id: number; name: string; wallet?: string | null } } }>();
  const posts = props.posts ?? [];
  const user = props.auth?.user;
  const wallet = user?.wallet ?? null;

  const [checking, setChecking] = useState(false);
  const [onchainReady, setOnchainReady] = useState<'unknown' | 'yes' | 'no'>(wallet ? 'unknown' : 'no');
  const [initBusy, setInitBusy] = useState(false);
  const [initMsg, setInitMsg] = useState<string | null>(null);
  const [postBusy, setPostBusy] = useState(false);
  const [postMsg, setPostMsg] = useState<string | null>(null);

  const csrf = () =>
    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

  // Check if on-chain user exists
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!wallet) { setOnchainReady('no'); return; }
      setChecking(true);
      try {
        const res = await fetch(`/sol/user/${wallet}`, { credentials: 'same-origin' });
        if (!cancelled) setOnchainReady(res.ok ? 'yes' : 'no');
      } catch {
        if (!cancelled) setOnchainReady('no');
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
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrf(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ username }),
      });
      const j = await res.json().catch(() => ({}));

      if (res.ok && j?.ok) {
        setOnchainReady('yes');
        setInitMsg(`Initialized ✅ tx: ${j.sig}`);
      } else if (res.status === 202) {
        // Our Python returns 202 if PDA not visible yet; poll once more
        setInitMsg('Init sent, waiting for confirmation…');
        setTimeout(async () => {
          const probe = await fetch(`/sol/user/${wallet}`, { credentials: 'same-origin' });
          setOnchainReady(probe.ok ? 'yes' : 'no');
        }, 1000);
      } else {
        setInitMsg(`Failed: ${j?.error || j?.detail || res.statusText}`);
      }
    } catch (e: any) {
      setInitMsg(e?.message || 'Failed to init');
    } finally {
      setInitBusy(false);
    }
  };

  // Use fetch (NOT Inertia router.post) for JSON API
  const createPost = async (payload: PostPayload) => {
    if (!payload.text?.trim()) return;
    setPostBusy(true);
    setPostMsg(null);
    try {
      const res = await fetch('/sol/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrf(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ text: payload.text }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j?.ok) {
        setPostMsg(`Posted ✅ tx: ${j.sig}`);
        // refresh just posts from server (Inertia)
        router.reload({ only: ['posts'], preserveScroll: true });
      } else {
        // If backend enforced init and PDA is not ready yet
        const reason = j?.detail || j?.error || res.statusText;
        setPostMsg(`Post failed: ${reason}`);
        if (reason?.toString().includes('user_not_found')) {
          setOnchainReady('no');
        }
      }
    } catch (e: any) {
      setPostMsg(e?.message || 'Post failed');
    } finally {
      setPostBusy(false);
    }
  };

  const like = async (id: string | number) => {
    // TODO: send real { post_owner, post_seq } once you store post_id from Python response
    console.log('like', id);
  };

  return (
    <>
      <Head title="Feed" />
      <div className="space-y-4">
        {!user ? (
          <div className="rounded-xl border border-black/10 bg-white p-4 text-sm dark:border-white/10 dark:bg-[#161615]">
            Please connect & sign in with your wallet to post.
          </div>
        ) : onchainReady !== 'yes' ? (
          <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#161615]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm opacity-80">
                {checking ? 'Checking on-chain profile…' : 'Your on-chain profile is not initialized yet.'}
              </div>
              <Button onClick={initUser} disabled={initBusy || checking}>
                {initBusy ? 'Initializing…' : 'Init user on-chain'}
              </Button>
            </div>
            {initMsg && <div className="mt-2 text-xs opacity-70 break-all">{initMsg}</div>}
          </div>
        ) : null}

        {user && onchainReady === 'yes' && (
          <>
            <PostComposer onSubmit={createPost} />
            {postBusy || postMsg ? (
              <div className="rounded-xl border border-black/10 bg-white p-3 text-xs opacity-80 dark:border-white/10 dark:bg-[#161615]">
                {postBusy ? 'Posting…' : postMsg}
              </div>
            ) : null}
          </>
        )}

        {posts.map((p) => (
          <PostCard
            key={p.id}
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
