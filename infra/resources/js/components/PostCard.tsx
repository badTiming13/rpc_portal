'use client';

import Avatar from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { usePage } from '@inertiajs/react';
import { LuHeart, LuMessageCircle, LuRepeat2, LuShare2, LuEllipsis } from 'react-icons/lu';

export type PostCardProps = {
  id: string | number;
  author?: { name: string; handle?: string; avatar_url?: string | null; wallet?: string | null };
  text: string;
  /** Можно передавать «2h», «just now» и т.п. — выводим как есть */
  createdAt: string;
  liked?: boolean;
  likeCount?: number;
  commentCount?: number;
  repostCount?: number;
  onLike?: (id: string | number) => void;
  onComment?: (id: string | number) => void;
  onRepost?: (id: string | number) => void;
  onShare?: (id: string | number) => void;
  className?: string;
};

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
  } = props;

  const shortWallet = (w?: string | null) => (w ? `${w.slice(0, 4)}…${w.slice(-4)}` : undefined);

  return (
    <article
      className={cn(
        'rounded-2xl bg-white p-4 shadow-[inset_0_0_0_1px_rgba(26,26,0,0.12)] dark:bg-[#161615] dark:shadow-[inset_0_0_0_1px_#2a2a2a]',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10" src={author.avatar_url ?? undefined} />
        <div className="min-w-0 grow">
          <div className="flex items-center gap-2">
            <div className="truncate font-medium">{author.name}</div>
            {author.handle ? (
              <div className="truncate text-sm text-[#8e8d89]">@{author.handle}</div>
            ) : (
              author.wallet && <div className="truncate text-sm text-[#8e8d89]">{shortWallet(author.wallet)}</div>
            )}
            <div className="ml-auto text-xs text-[#8e8d89]">{createdAt}</div>
            <button
              className="ml-1 rounded-xl p-1.5 text-[#8e8d89] hover:bg-[#f4f3f0] dark:hover:bg-[#1b1b1b]"
              aria-label="More actions"
            >
              <LuEllipsis className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 whitespace-pre-wrap text-[15px] leading-6">
            {text}
          </div>

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
