'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type ProfileHeaderCardProps = {
  nickname: string;
  bio: string;
  wallet?: string | null;
  onchain_username?: string | null;
  stats: {
    posts_created: number;
    likes_received: number;
    likes_given: number;
  };
  className?: string;
};

// Level / progression helper
function levelInfo(posts: number) {
  if (posts < 40) {
    return {
      label: 'Sprout',
      nextLabel: 'Progress to Tree',
      cur: posts,
      max: 40,
    };
  }
  if (posts < 100) {
    return {
      label: 'Tree',
      nextLabel: 'Progress to Forest',
      cur: posts - 40,
      max: 60, // 40..99 => 60 steps
    };
  }
  return {
    label: 'Forest',
    nextLabel: 'Max level',
    cur: 1,
    max: 1,
  };
}

export default function ProfileHeaderCard({
  nickname,
  bio,
  wallet,
  onchain_username,
  stats,
  className,
}: ProfileHeaderCardProps) {
  const { posts_created, likes_received, likes_given } = stats;
  const lvl = levelInfo(posts_created);

  const pct = Math.min(
    100,
    Math.round((lvl.cur / lvl.max) * 100)
  );

  // handle text preference
  const handleText = onchain_username
    ? `@${onchain_username}`
    : wallet
    ? `@${wallet.slice(0, 6)}`
    : null;

  const walletShort = wallet
    ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}`
    : null;

  return (
    <div
      className={cn(
        'rounded-xl border border-black/10 bg-white/5 p-4 text-white shadow-[0_0_30px_rgba(0,0,0,0.6)] dark:border-white/10',
        className
      )}
    >
      {/* top row */}
      <div className="flex flex-wrap items-start gap-4">
        {/* level badge circle */}
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-500 text-center text-[10px] font-semibold leading-tight text-white shadow-lg shadow-blue-900/40">
          {lvl.label}
        </div>

        {/* identity + stats */}
        <div className="min-w-0 flex-1 text-white/80 leading-5">
          {/* name / wallet / handle */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-white/90">
            <span className="truncate text-lg font-semibold text-white">
              {nickname}
            </span>

            {walletShort && (
              <span className="text-xs font-normal text-white/40">
                {walletShort}
              </span>
            )}
          </div>

          {/* stats line */}
          <div className="mt-1 flex flex-wrap gap-4 text-[11px] text-white/60">
            <span>
              <span className="text-white font-semibold">
                {posts_created}
              </span>{' '}
              posts
            </span>
            <span>
              <span className="text-white font-semibold">
                {likes_received}
              </span>{' '}
              likes received
            </span>
            <span>
              <span className="text-white font-semibold">
                {likes_given}
              </span>{' '}
              likes given
            </span>
          </div>
        </div>
      </div>

      {/* bio */}
      <div className="mt-3 break-words text-sm text-white/70">
        {bio || '—'}
      </div>

      {/* progress bar */}
      <div className="mt-3 w-full">
        <div className="mb-1 flex items-center justify-between text-[11px] text-white/60">
          <span>{lvl.nextLabel}</span>
          <span className="text-white/50">
            {lvl.cur}/{lvl.max}{' '}
            <span className="text-[10px] text-white/30">
              ({pct}%)
            </span>
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-400"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
