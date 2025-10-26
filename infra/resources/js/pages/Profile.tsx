'use client';

import { useEffect, useRef, useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import AppLayout from '@/layouts/AppLayout';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import PostCard from '@/components/PostCard';
import ProfileHeaderCard from '@/components/ProfileHeaderCard';

type ProfilePageProps = {
  authed: boolean;
  user?: {
    id: number;
    name: string;
    wallet: string | null;
  };
  profile?: {
    nickname: string;
    bio: string;
  } | null;
  onchain?: {
    exists: boolean;
    username: string | null;
    posts_created: number;
    likes_received: number;
    likes_given: number;
    balance_sol?: number;
  };
  posts: any[];
  // also passed now for sidebar wallet box via AppLayout
  walletStats?: {
    balance_sol?: number;
  };
};

function csrf() {
  const tag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
  return tag?.content || '';
}

// Step 1 card: init on-chain account
function StepInitOnchain({
  wallet,
  onDone,
}: {
  wallet?: string | null;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function doInit() {
    if (!wallet) return;
    setBusy(true);
    setErr(null);
    setMsg(null);

    // default username on-chain
    const username = `u_${wallet.slice(0, 6)}`;

    const resp = await fetch('/sol/init-user', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrf(),
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ username }),
    });

    const j = await resp.json().catch(() => ({} as any));

    if (!resp.ok || !j?.ok) {
      setErr(j?.error || 'failed to init on-chain user');
    } else {
      setMsg(`On-chain profile created ✅ tx: ${j.sig ?? 'n/a'}`);
      onDone();
    }

    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white/5 p-4 text-sm dark:border-white/10">
      <div className="flex flex-col gap-3">
        <div className="text-base font-medium text-white/90">
          Step 1: Create your on-chain account
        </div>
        <div className="text-xs text-white/60">
          This creates your identity on-chain so you can post on-chain.
        </div>

        {err && <div className="text-[12px] text-red-400">{err}</div>}
        {msg && (
          <div className="break-all text-[12px] text-green-400">{msg}</div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={doInit}
            disabled={busy || !wallet}
            isLoading={busy}
            className="px-4"
          >
            Init on-chain profile
          </Button>
        </div>
      </div>
    </div>
  );
}

// Step 2 card: choose nickname + bio locally
function StepLocalProfile({ onDone }: { onDone: () => void }) {
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);

  // nickname validity+availability state
  const [nickErr, setNickErr] = useState<string | null>(null);
  const [nickOkMsg, setNickOkMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const debounceTimer = useRef<number | null>(null);

  // front-end format rule to match backend regex
  function nicknameLooksValid(n: string) {
    return /^[A-Za-z0-9._-]{1,32}$/.test(n);
  }

  // debounced nickname availability checker
  useEffect(() => {
    const n = nickname.trim();

    setNickErr(null);
    setNickOkMsg(null);

    if (!n) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      return;
    }

    if (!nicknameLooksValid(n)) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      setNickErr(
        'Nickname can include letters, numbers, ".", "_", "-" and must be ≤32 chars.'
      );
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(async () => {
      setChecking(true);

      const resp = await fetch('/profile/check-nickname', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrf(),
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ nickname: n }),
      });

      const j = await resp.json().catch(() => ({} as any));

      if (!resp.ok || !j?.ok) {
        setNickErr('Failed to validate nickname');
        setNickOkMsg(null);
      } else {
        if (j.available === false) {
          if (j.reason === 'invalid_format') {
            setNickErr(
              'Nickname format not allowed. Use letters, numbers, ".", "_", "-".'
            );
          } else {
            setNickErr('Nickname is taken');
          }
          setNickOkMsg(null);
        } else {
          setNickErr(null);
          setNickOkMsg('Looks good ✔');
        }
      }

      setChecking(false);
    }, 400);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [nickname]);

  async function saveProfile() {
    const n = nickname.trim();
    if (!n) return;

    setBusy(true);

    const resp = await fetch('/profile/setup-local', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrf(),
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        nickname: n,
        bio: bio.trim(),
      }),
    });

    if (resp.status === 302) {
      setNickErr('Failed to save profile');
      setBusy(false);
      return;
    }

    const j = await resp.json().catch(() => ({} as any));
    if (!resp.ok || !j?.ok) {
      const firstError =
        (j?.errors && (Object.values(j.errors)[0] as any)?.[0]) ||
        j?.error ||
        'Failed to save profile';
      setNickErr(firstError);
      setBusy(false);
      return;
    }

    onDone();
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white/5 p-4 text-sm dark:border-white/10">
      <div className="mb-2 text-base font-medium text-white/90">
        Step 2: Pick your nickname & bio
      </div>
      <div className="mb-4 text-xs text-white/60">
        This lives off-chain in our DB. Your nickname must be unique.
      </div>

      {/* Nickname field */}
      <div className="mb-3">
        <label className="mb-1 block text-[12px] font-medium text-white/70">
          Nickname <span className="text-red-400">*</span>
        </label>
        <input
          className={cn(
            'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white',
            'outline-none focus:border-white/30'
          )}
          maxLength={32}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="e.g. bad_timing"
        />

        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] leading-4">
          {checking && <span className="text-white/40">checking…</span>}

          {!checking && nickErr && (
            <span className="text-red-400">{nickErr}</span>
          )}

          {!checking && !nickErr && nickOkMsg && (
            <span className="text-green-400">{nickOkMsg}</span>
          )}

          {!checking && !nickErr && !nickOkMsg && (
            <span className="text-white/40">
              Allowed: letters / numbers / . _ -
            </span>
          )}
        </div>
      </div>

      {/* Bio field */}
      <div className="mb-3">
        <label className="mb-1 block text-[12px] font-medium text-white/70">
          Bio
        </label>
        <textarea
          className={cn(
            'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white',
            'outline-none focus:border-white/30'
          )}
          rows={3}
          maxLength={200}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell the chain who you are…"
        />
      </div>

      <div className="flex items-center justify-end">
        <Button
          onClick={saveProfile}
          disabled={
            busy ||
            !nickname.trim() ||
            !!nickErr ||
            (checking && !nickOkMsg)
          }
          isLoading={busy}
          className="px-4"
        >
          Save profile
        </Button>
      </div>
    </div>
  );
}

function ProfilePage() {
  const { props } = usePage<ProfilePageProps>();

  if (!props.authed) {
    return (
      <>
        <Head title="Profile" />
        <div className="mx-auto max-w-2xl p-6 text-center text-[#8e8d89]">
          Please sign in.
        </div>
      </>
    );
  }

  const { user, profile, onchain, posts } = props;

  // refresh UI props after finishing onboarding step(s)
  const reloadProfile = () => {
    router.visit('/profile', {
      only: ['authed', 'user', 'profile', 'onchain', 'posts', 'walletStats'],
      preserveScroll: true,
    });
  };

  const showSetupStep1 = !onchain?.exists;
  const showSetupStep2 = onchain?.exists && !profile;
  const showHeaderCard = onchain?.exists && profile;

  return (
    <>
      <Head title="Profile" />
      <div className="mx-auto max-w-2xl space-y-6 p-6 lg:p-10">
        {showSetupStep1 && (
          <StepInitOnchain
            wallet={user?.wallet ?? null}
            onDone={reloadProfile}
          />
        )}

        {showSetupStep2 && <StepLocalProfile onDone={reloadProfile} />}

        {showHeaderCard && onchain && profile && (
          <ProfileHeaderCard
            className=""
            nickname={profile.nickname}
            bio={profile.bio}
            wallet={user?.wallet ?? null}
            onchain_username={onchain.username}
            stats={{
              posts_created: onchain.posts_created ?? 0,
              likes_received: onchain.likes_received ?? 0,
              likes_given: onchain.likes_given ?? 0,
            }}
          />
        )}

        {/* user's posts */}
        <div className="space-y-3">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              id={p.id}
              author={p.author}
              text={p.text}
              createdAt={p.createdAt}
              liked={p.liked}
              likeCount={p.likeCount}
              commentCount={p.commentCount}
              repostCount={p.repostCount}
              tx={p.tx}
            />
          ))}
        </div>
      </div>
    </>
  );
}

ProfilePage.layout = (page: any) => <AppLayout>{page}</AppLayout>;

export default ProfilePage;
