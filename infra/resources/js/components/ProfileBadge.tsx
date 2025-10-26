'use client';

import { cn } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';

// ---- tier logic -------------------------------------------------

type TierInfo = {
  id: string;
  label: string;
  color: string; // we'll use this for ring / badge color
  minPosts: number;
  nextAtPosts?: number; // undefined means you're max tier
};

// ordered lowest → highest
const TIERS: TierInfo[] = [
  { id: 'seed',   label: 'Seed',   color: '#6B7280', minPosts: 0,   nextAtPosts: 10 },
  { id: 'sprout', label: 'Sprout', color: '#3B82F6', minPosts: 10,  nextAtPosts: 40 },
  { id: 'tree',   label: 'Tree',   color: '#10B981', minPosts: 40,  nextAtPosts: 100 },
  { id: 'og',     label: 'OG',     color: '#EAB308', minPosts: 100, nextAtPosts: undefined },
];

function pickTier(posts: number, likesReceived: number) {
  // right now we primarily key off posts, but we could later do:
  // score = posts + Math.floor(likesReceived/5), etc.
  const score = posts;

  // find highest tier where score >= minPosts
  let tier = TIERS[0];
  for (const t of TIERS) {
    if (score >= t.minPosts) tier = t;
  }

  // progress to next tier
  let progressPct = 100;
  if (tier.nextAtPosts !== undefined) {
    const span = tier.nextAtPosts - tier.minPosts;
    const done = score - tier.minPosts;
    progressPct = Math.max(0, Math.min(100, (done / span) * 100));
  }

  return { tier, score, progressPct };
}

// ---- props ------------------------------------------------------

export type ProfileBadgeProps = {
  className?: string;

  // from DB (synced from chain)
  name?: string | null;                 // local display name (user.name)
  wallet?: string | null;               // wallet address for short handle fallback
  onchain_username?: string | null;     // u_7q22UL
  onchain_posts_created?: number | null;
  onchain_likes_received?: number | null;
  onchain_likes_given?: number | null;

  size?: number; // avatar size px (default 48)
};

export default function ProfileBadge({
  className,
  name,
  wallet,
  onchain_username,
  onchain_posts_created,
  onchain_likes_received,
  onchain_likes_given,
  size = 48,
}: ProfileBadgeProps) {
  const posts = onchain_posts_created ?? 0;
  const likesRecv = onchain_likes_received ?? 0;
  const likesGiven = onchain_likes_given ?? 0;

  const { tier, progressPct } = pickTier(posts, likesRecv);

  // pick primary handle to show under display name
  const handle =
    onchain_username ??
    (wallet ? wallet.slice(0, 6) : undefined) ??
    'anon';

  // we'll render a circular "progress ring" behind/around Avatar.
  // pure CSS ring using conic-gradient.
  const ringSize = size + 8; // a little bigger than avatar
  const ringBg = `conic-gradient(${tier.color} ${progressPct}%, rgba(0,0,0,0) ${progressPct}%)`;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl p-4',
        'bg-white dark:bg-[#161615]',
        'shadow-[inset_0_0_0_1px_rgba(26,26,0,0.12)] dark:shadow-[inset_0_0_0_1px_#2a2a2a]',
        className
      )}
    >
      {/* avatar + ring */}
      <div
        className="relative flex-shrink-0"
        style={{
          width: ringSize,
          height: ringSize,
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            backgroundImage: ringBg,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0f0f0f] p-[2px] dark:bg-[#0f0f0f]"
          style={{
            width: size,
            height: size,
          }}
        >
          {/* Avatar is still generic for now. Later we'll pass a generated src based on tier.id */}
          <Avatar
            size={size - 4}
            className={cn(
              'rounded-full ring-1 ring-black/20 dark:ring-white/20',
              // fallback tier color hint if no src
              tier.id === 'og' && 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-black',
              tier.id === 'tree' && 'bg-gradient-to-br from-emerald-400 to-emerald-700 text-white',
              tier.id === 'sprout' && 'bg-gradient-to-br from-blue-400 to-blue-700 text-white',
              tier.id === 'seed' && 'bg-gradient-to-br from-zinc-400 to-zinc-700 text-white'
            )}
            alt={name ?? handle}
          />
        </div>

        {/* little tier label chip bottom-right */}
        <div className="absolute -bottom-1 -right-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none text-black shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
          style={{
            backgroundColor: tier.color,
          }}
        >
          {tier.label}
        </div>
      </div>

      {/* text + stats */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <div className="font-medium leading-none text-[15px] text-[#1b1b18] dark:text-[#EDEDEC]">
            {name ?? handle}
          </div>

          <div className="text-[13px] leading-none text-[#8e8d89] truncate max-w-[120px]">
            @{handle}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-[#8e8d89]">
          <div className="flex items-baseline gap-1">
            <span className="text-[#EDEDEC] dark:text-white font-medium text-[13px]">
              {posts}
            </span>
            <span className="opacity-70">posts</span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-[#EDEDEC] dark:text-white font-medium text-[13px]">
              {likesRecv}
            </span>
            <span className="opacity-70">likes received</span>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-[#EDEDEC] dark:text-white font-medium text-[13px]">
              {likesGiven}
            </span>
            <span className="opacity-70">likes given</span>
          </div>
        </div>

        {/* tiny progress hint */}
        {tier.nextAtPosts !== undefined && (
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-[#8e8d89] leading-none mb-1">
              <span>Progress to {TIERS[TIERS.findIndex(t => t.id === tier.id) + 1]?.label}</span>
              <span>{posts}/{tier.nextAtPosts} posts</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: tier.color,
                }}
              />
            </div>
          </div>
        )}

        {tier.nextAtPosts === undefined && (
          <div className="mt-3 text-[11px] text-[#EAB308] font-semibold">
            Max tier reached. Respect.
          </div>
        )}
      </div>
    </div>
  );
}
