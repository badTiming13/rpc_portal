import AppLayout from '@/layouts/AppLayout';
import { Head } from '@inertiajs/react';

import WalletAuth from '@/components/WalletAuth';
import PostCard from '@/components/PostCard';
import PostComposer from '@/components/PostComposer';

import { Button } from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';

type MockPost = {
  id: number | string;
  author: { name: string; handle: string; avatarUrl?: string };
  text: string;
  createdAt: string; // "2h" и т.п.
  likes?: number;
  replies?: number;
  reposts?: number;
};

const mockPost: MockPost = {
  id: 1,
  author: { name: 'satoshi', handle: 'satoshi' },
  text: 'gm. building an on-chain microblog.\nEvery post is a tx, replies off-chain for now.',
  createdAt: '2h',
  likes: 12,
  replies: 3,
  reposts: 1,
};

export default function Welcome() {
  return (
    <>
      <Head title="UI Showroom">
        <link rel="preconnect" href="https://fonts.bunny.net" />
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
      </Head>

      <div className="mx-auto max-w-6xl gap-8 p-6 text-[#1b1b18] lg:p-10 dark:text-[#EDEDEC]">
        <h1 className="mb-6 text-2xl font-semibold">UI Showroom</h1>

        {/* AUTH */}
        <Section title="Auth">
          <WalletAuth />
        </Section>

        {/* UI / BUTTONS */}
        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
            <Button full className="max-w-xs">Full width</Button>
          </div>
        </Section>

        {/* UI / AVATAR + SPINNER */}
        <Section title="Primitives">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8" />
              <Avatar className="h-10 w-10" />
              <Avatar className="h-12 w-12" />
            </div>
            <div className="h-6 w-px bg-black/10 dark:bg-white/10" />
            <div className="flex items-center gap-3">
              <Spinner />
              <Spinner className="h-6 w-6" />
              <Spinner className="h-8 w-8" />
            </div>
          </div>
        </Section>

        {/* COMPOSER */}
        <Section title="Composer">
          <div className="max-w-2xl">
            <PostComposer
              placeholder="What's happening on-chain?"
              onSubmit={(val) => console.log('composer submit:', val)}
            />
          </div>
        </Section>

        {/* POST CARD */}
        <Section title="Post">
          <div className="max-w-2xl">
            <PostCard
              id={mockPost.id}
              author={{
                name: mockPost.author.name,
                handle: mockPost.author.handle,
                avatar_url: mockPost.author.avatarUrl ?? null,
              }}
              text={mockPost.text}
              createdAt={mockPost.createdAt}
              likeCount={mockPost.likes}
              commentCount={mockPost.replies}
              repostCount={mockPost.reposts}
              onLike={(id) => console.log('like', id)}
              onComment={(id) => console.log('comment', id)}
              onRepost={(id) => console.log('repost', id)}
              onShare={(id) => console.log('share', id)}
            />
          </div>
        </Section>

        {/* FEED EXAMPLE */}
        <Section title="Feed example">
          <div className="mx-auto grid max-w-2xl gap-3">
            <PostComposer
              placeholder="Write a post…"
              onSubmit={(val) => console.log('feed submit:', val)}
            />

            <PostCard
              id={mockPost.id}
              author={{
                name: mockPost.author.name,
                handle: mockPost.author.handle,
                avatar_url: mockPost.author.avatarUrl ?? null,
              }}
              text={mockPost.text}
              createdAt={mockPost.createdAt}
              likeCount={mockPost.likes}
              commentCount={mockPost.replies}
              repostCount={mockPost.reposts}
            />

            <PostCard
              id={2}
              author={{
                name: 'bob',
                handle: 'bob',
                avatar_url: null,
              }}
              text="second post. hello chain."
              createdAt="5h"
              likeCount={0}
              commentCount={0}
              repostCount={0}
            />
          </div>
        </Section>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
        {title}
      </h2>
      <div className="rounded-2xl border border-black/10 bg-[#FDFDFC] p-4 dark:border-white/10 dark:bg-[#0f0f0f]">
        {children}
      </div>
    </section>
  );
}

Welcome.layout = (page: any) => <AppLayout>{page}</AppLayout>;
