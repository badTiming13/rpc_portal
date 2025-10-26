// resources/js/components/PostCard.tsx
'use client';

import { useMemo } from 'react';
import Avatar from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { usePage } from '@inertiajs/react';
import {
  LuHeart,
  LuMessageCircle,
  LuRepeat2,
  LuShare2,
  LuEllipsis,
  LuExternalLink,
} from 'react-icons/lu';
import { formatWhen } from '@/lib/date';

export type PostCardProps = {
  id: string | number;
  author?: {
    name: string;
    handle?: string;
    avatar_url?: string | null;
    wallet?: string | null;
  };
  text: string;
  /**
   * can be:
   *  - ISO string ("2025-10-20T18:36:12Z")
   *  - Date-ish string
   *  - already-human string ("2m", "just now")
   */
  createdAt: string;
  liked?: boolean;
  likeCount?: number;
  commentCount?: number;
  repostCount?: number;
  tx?: string; // tx signature badge
  onLike?: (id: string | number) => void;
  onComment?: (id: string | number) => void;
  onRepost?: (id: string | number) => void;
  onShare?: (id: string | number) => void;
  className?: string;
};

// detect media-ish url
function isMediaUrl(u: string) {
  return /\.(png|jpe?g|webp|avif|gif)($|\?)/i.test(u);
}

// pull first matching URLs out of text
function extractMediaUrls(text: string): { imgUrl?: string; gifUrl?: string } {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const urls = text.match(urlRegex) || [];

  const gifUrl = urls.find((u) => /\.gif($|\?)/i.test(u));
  const imgUrl = urls.find((u) => isMediaUrl(u));

  return { imgUrl, gifUrl };
}

function explorerUrl(sig: string) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

// safely try to parse createdAt to a Date for tooltip
function safeIsoTooltip(createdAt: string | undefined): string | undefined {
  if (!createdAt) return undefined;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) {
    return undefined;
  }
  return d.toISOString();
}

export default function PostCard(props: PostCardProps) {
  const { props: page } = usePage();
  const authed = !!(page as any)?.auth?.user;

  const {
    id,
    author = { name: 'Anon', handle: 'anon', avatar_url: null, wallet: null },
    text,
    createdAt,
    liked = false,
    likeCount = 0,
    commentCount = 0,
    repostCount = 0,
    onLike,
    onComment,
    onRepost,
    onShare,
    className,
    tx,
  } = props;

  const shortWallet = (w?: string | null) =>
    w ? `${w.slice(0, 4)}…${w.slice(-4)}` : undefined;

  // parse media URLs out of post text
  const { imgUrl, gifUrl } = useMemo(() => extractMediaUrls(text), [text]);

  // remove any "standalone" media URL lines from the main rendered paragraph
  // example:
  //   lorem ipsum
  //   http://.../post_media/abc.png
  //   http://.../funny.gif
  //
  // becomes just "lorem ipsum"
  const displayText = useMemo(() => {
    const lines = text.split(/\r?\n/);

    const cleaned = lines.filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true; // keep blank lines for spacing
      // if this entire line is exactly one media URL -> drop it
      // (so we don't show raw URL above the preview)
      const isSingleUrl =
        /^https?:\/\/\S+$/.test(trimmed) && isMediaUrl(trimmed);
      return !isSingleUrl;
    });

    return cleaned.join('\n');
  }, [text]);

  // prettyTime heuristic
  const prettyTime = useMemo(() => {
    const bruteLooksCustom =
      createdAt.length <= 10 && /[a-zA-Z0-9]/.test(createdAt);
    if (bruteLooksCustom && !createdAt.includes('T')) {
      return createdAt;
    }
    return formatWhen(createdAt, { short: true });
  }, [createdAt]);

  const isoTooltip = safeIsoTooltip(createdAt);

  return (
    <article
      className={cn(
        'rounded-2xl bg-white p-4 shadow-[inset_0_0_0_1px_rgba(26,26,0,0.12)] dark:bg-[#161615] dark:shadow-[inset_0_0_0_1px_#2a2a2a]',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10" src={author.avatar_url ?? undefined} />
        <div className="min-w-0 grow">
          <div className="flex items-center gap-2">
            <div className="truncate font-medium">{author.name}</div>

            {author.handle ? (
              <div className="truncate text-sm text-[#8e8d89]">
                @{author.handle}
              </div>
            ) : (
              author.wallet && (
                <div className="truncate text-sm text-[#8e8d89]">
                  {shortWallet(author.wallet)}
                </div>
              )
            )}

            <div className="ml-auto flex items-center gap-2 text-xs text-[#8e8d89]">
              <span title={isoTooltip}>{prettyTime}</span>

              {tx && (
                <a
                  className="inline-flex items-center gap-1 rounded-md border border-black/10 px-1.5 py-0.5 text-[11px] hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                  href={explorerUrl(tx)}
                  target="_blank"
                  rel="noreferrer"
                  title="View transaction"
                >
                  <span className="opacity-80">
                    {tx.slice(0, 4)}…{tx.slice(-4)}
                  </span>
                  <LuExternalLink className="h-3.5 w-3.5 opacity-70" />
                </a>
              )}
            </div>

            <button
              className="ml-1 rounded-xl p-1.5 text-[#8e8d89] hover:bg-[#f4f3f0] dark:hover:bg-[#1b1b1b]"
              aria-label="More actions"
            >
              <LuEllipsis className="h-4 w-4" />
            </button>
          </div>

          {/* main text */}
          <div
            className={cn(
              'mt-2 whitespace-pre-wrap text-[15px] leading-6',
              // key part ↓ ensures long URLs (and any long tokens) wrap instead of blasting layout
              'break-words',
            )}
          >
            {displayText}
          </div>

          {/* Image preview if post text includes an image-ish URL */}
          {imgUrl && (
            <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-black/10 dark:ring-white/10">
              <img
                src={imgUrl}
                alt="attachment"
                className="w-full max-h-[420px] object-contain bg-black/5 dark:bg-white/5"
              />
            </div>
          )}

          {/* GIF preview if there's a .gif URL AND it's not just the same as imgUrl */}
          {gifUrl && gifUrl !== imgUrl && (
            <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-black/10 dark:ring-white/10">
              <img
                src={gifUrl}
                alt="gif"
                className="w-full max-h-[420px] object-contain bg-black/5 dark:bg-white/5"
              />
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-sm text-[#706f6c]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (authed ? onComment?.(id) : null)}
              disabled={!authed}
              className="gap-2"
              title={authed ? 'Reply' : 'Login to reply'}
            >
              <LuMessageCircle className="h-4 w-4" />
              {commentCount}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => (authed ? onRepost?.(id) : null)}
              disabled={!authed}
              className="gap-2"
              title={authed ? 'Repost' : 'Login to repost'}
            >
              <LuRepeat2 className="h-4 w-4" />
              {repostCount}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => (authed ? onLike?.(id) : null)}
              disabled={!authed}
              className={cn('gap-2', liked && 'text-[#FF4433]')}
              title={authed ? 'Like' : 'Login to like'}
            >
              <LuHeart className="h-4 w-4" />
              {likeCount}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onShare?.(id)}
              className="gap-2"
              title="Share"
            >
              <LuShare2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
