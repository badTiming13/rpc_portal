import AppLayout from '@/layouts/AppLayout';
import PostCard from '@/components/PostCard';
import PostComposer from '@/components/PostComposer';
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
  const { props } = usePage<{ posts: Post[] }>();
  const posts = props.posts ?? [];

  const createPost = async (text: string) => {
    await router.post('/posts', { text }, { preserveScroll: true, only: ['posts', 'auth'] });
  };

  const like = async (id: string | number) => {
    await router.post('/likes', { post_id: id }, { preserveScroll: true, only: ['posts'] });
  };

  return (
    <>
      <Head title="Feed" />
      <div className="space-y-4">
        <PostComposer onSubmit={createPost} />
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
