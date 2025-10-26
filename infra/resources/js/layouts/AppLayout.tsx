'use client';

import { PropsWithChildren, useState } from 'react';
import { usePage, Link } from '@inertiajs/react';
import WalletAuth from '@/components/WalletAuth';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';
import { LuList, LuUser } from 'react-icons/lu';
import { TbHome2 } from 'react-icons/tb';
import '../../css/app.css';

type PageProps = {
  auth?: {
    user?: {
      wallet: string | null;
    } | null;
  };
  walletStats?: {
    balance_sol?: number; // we'll pass this from server soon (mock ok for now)
  };
};

function csrf() {
  const tag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
  return tag?.content || '';
}

// Small box inside Status: shows balance + lets you send deposit/withdraw txs
function BalanceBox({
  balance_sol,
}: {
  balance_sol: number | undefined;
}) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function doAction(kind: 'deposit' | 'withdraw') {
    if (!amount.trim()) return;
    setBusy(true);
    setMsg(null);
    setErr(null);

    const resp = await fetch(`/sol/${kind}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrf(),
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        amount_sol: parseFloat(amount),
      }),
    });

    if (resp.status === 302) {
      setErr('Failed. (validation redirect)');
      setBusy(false);
      return;
    }

    const j = await resp.json().catch(() => ({} as any));
    if (!resp.ok || !j?.ok) {
      const firstError =
        (j?.errors && (Object.values(j.errors)[0] as any)?.[0]) ||
        j?.error ||
        'Transaction failed';
      setErr(firstError);
    } else {
      setMsg(`tx: ${j.sig ?? 'ok'}`);
      setAmount('');
    }

    setBusy(false);
  }

  return (
    <div className="mt-4 rounded-lg border border-black/10 bg-black/[0.03] p-3 text-[11px] leading-4 text-[#706f6c] dark:border-white/10 dark:bg-white/[0.03] dark:text-[#A1A09A]">
      {/* balance row */}
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] font-medium text-[#1b1b18] dark:text-white">
          Balance
        </div>
        <div className="text-[11px] font-mono text-[#1b1b18] dark:text-white">
          {balance_sol !== undefined ? balance_sol.toFixed(4) + ' SOL' : '—'}
        </div>
      </div>

      {/* quick transfer row */}
      <div className="mt-2 flex items-center gap-2">
        <input
          className={cn(
            'w-20 flex-1 rounded-md border border-black/20 bg-black/5 px-2 py-1 text-[11px] leading-none text-[#1b1b18] outline-none',
            'dark:border-white/20 dark:bg-white/10 dark:text-white'
          )}
          placeholder="0.1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
        />
        <button
          onClick={() => doAction('deposit')}
          disabled={busy || !amount.trim()}
          className={cn(
            'rounded-md border border-black/20 bg-[#1b1b18] px-2 py-1 text-[11px] font-medium text-white transition',
            'hover:bg-black dark:border-white/20 dark:bg-white dark:text-black dark:hover:bg-white/90'
          )}
        >
          Dep
        </button>
        <button
          onClick={() => doAction('withdraw')}
          disabled={busy || !amount.trim()}
          className={cn(
            'rounded-md border border-black/20 bg-transparent px-2 py-1 text-[11px] font-medium text-[#1b1b18] transition',
            'hover:bg-black/10 dark:border-white/20 dark:text-white dark:hover:bg-white/10'
          )}
        >
          With
        </button>
      </div>

      {msg && (
        <div className="mt-2 break-all text-[10px] text-green-400">
          {msg}
        </div>
      )}
      {err && (
        <div className="mt-2 text-[10px] text-red-400">
          {err}
        </div>
      )}
    </div>
  );
}


export default function AppLayout({ children }: PropsWithChildren) {
  const { props } = usePage<PageProps>();
  const user = props.auth?.user;
  const balance_sol = props.walletStats?.balance_sol ?? 0; // placeholder

  // shorten wallet for display
  const shortWallet = (w?: string | null) =>
    w ? `${w.slice(0, 4)}…${w.slice(-4)}` : null;

  // which page we're on, for active nav highlight
  const currentPath =
    typeof window !== 'undefined' ? window.location.pathname : '';

  function NavItem({
    href,
    icon: Icon,
    label,
  }: {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }) {
    const active = currentPath === href;
    return (
      <li>
        <Link
          href={href}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
            'text-[#706f6c] hover:text-[#1b1b18] hover:bg-black/[0.04]',
            'dark:text-[#A1A09A] dark:hover:text-white dark:hover:bg-white/[0.06]',
            active &&
            'bg-black/[0.06] text-[#1b1b18] dark:bg-white/[0.08] dark:text-white'
          )}
        >
          <Icon className="h-4 w-4 opacity-80" />
          <span className="font-medium">{label}</span>
          {active && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.8)]" />
          )}
        </Link>
      </li>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFC] text-[#1b1b18] dark:bg-[#0a0a0a] dark:text-[#EDEDEC]">
      <div className="mx-auto grid max-w-6xl grid-cols-12 gap-6 p-6 lg:p-8">
        {/* Sidebar */}
        <aside className="col-span-12 lg:col-span-3">
          <div className="sticky top-6 space-y-6">

            {/* brand / identity header */}
            <div
              className={cn(
                'rounded-xl p-4 text-sm shadow-[inset_0_0_0_1px_rgba(26,26,0,0.16)]',
                'bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.08)_0%,rgba(0,0,0,0)_60%)] bg-white',
                'dark:bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.18)_0%,rgba(0,0,0,0)_60%)] dark:bg-[#161615] dark:shadow-[inset_0_0_0_1px_#fffaed2d]'
              )}
            >
              <div className="flex flex-col">
                <div className="flex flex-wrap items-start gap-3">
                  <Logo
                    withText
                    compact
                    size={32}
                    className="text-[#1b1b18] dark:text-[#EDEDEC]"
                    textClassName="text-base font-semibold text-[#1b1b18] dark:text-[#EDEDEC]"
                  />
                </div>

                <div className="mt-2 text-[11px] leading-4 text-[#706f6c] dark:text-[#A1A09A]">
                  on-chain microblog{' '}
                  <span className="text-[#1b1b18]/60 dark:text-white/40">
                    • devnet
                  </span>
                </div>
              </div>
            </div>

            {/* nav */}
            <nav
              className={cn(
                'rounded-xl p-4 text-sm shadow-[inset_0_0_0_1px_rgba(26,26,0,0.16)]',
                'bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.08)_0%,rgba(0,0,0,0)_60%)] bg-white',
                'dark:bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.18)_0%,rgba(0,0,0,0)_60%)] dark:bg-[#161615] dark:shadow-[inset_0_0_0_1px_#fffaed2d]'
              )}
            >
              <ul className="space-y-1">
                <NavItem href="/" icon={TbHome2} label="Home" />
                <NavItem href="/feed" icon={LuList} label="Feed" />
                <NavItem href="/profile" icon={LuUser} label="Profile" />
              </ul>
            </nav>

            {/* status / wallet box */}
            <div
              className={cn(
                'rounded-xl p-4 text-sm shadow-[inset_0_0_0_1px_rgba(26,26,0,0.16)]',
                'bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.08)_0%,rgba(0,0,0,0)_60%)] bg-white',
                'dark:bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.18)_0%,rgba(0,0,0,0)_60%)] dark:bg-[#161615] dark:shadow-[inset_0_0_0_1px_#fffaed2d]'
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-[#706f6c] dark:text-[#A1A09A]">
                    Status
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-[#1b1b18] dark:text-white">
                    {user ? 'Logged in' : 'Guest'}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <WalletAuth />
              </div>

              {user && (
                <>
                  {/* subtle connection line under header */}
                  <div className="mt-2 text-[10px] leading-relaxed text-[#706f6c] dark:text-[#A1A09A]">
                    Phantom • connected
                  </div>
                < BalanceBox balance_sol={balance_sol} />
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="col-span-12 lg:col-span-9">{children}</main>
      </div>
    </div>
  );
}
