'use client';

import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import Balancer from 'react-wrap-balancer';
import { Shield, ReceiptText, Coins } from 'lucide-react';

import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';

// ======================
// Animated background blobs
// ======================
function FloatingBg() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#0a0a0a]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.8)_70%)]" />

      <motion.div
        className="absolute left-[-20%] top-[-20%] h-[40rem] w-[40rem] rounded-full blur-[80px] bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.4)_0%,rgba(0,0,0,0)_70%)]"
        animate={{
          x: ['0%', '10%', '0%'],
          y: ['0%', '5%', '0%'],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute bottom-[-20%] right-[-20%] h-[40rem] w-[40rem] rounded-full blur-[100px] bg-[radial-gradient(circle_at_70%_70%,rgba(16,185,129,0.22)_0%,rgba(0,0,0,0)_70%)]"
        animate={{
          x: ['0%', '-8%', '0%'],
          y: ['0%', '6%', '0%'],
          scale: [1, 1.07, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="absolute inset-0 opacity-[0.25] mix-blend-soft-light bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAqcB9RytFY0AAAAASUVORK5CYII=')]" />
    </div>
  );
}

// ======================
// Frosted nav
// ======================
function TopNav({ isAuthed }: { isAuthed: boolean }) {
  return (
    <header className="sticky top-0 z-20 flex w-full justify-center">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={cn(
          'mx-4 mt-6 flex w-full max-w-6xl items-center justify-between rounded-xl',
          'border border-white/10 bg-white/[0.03] px-4 py-3 text-white backdrop-blur-md',
          'shadow-[0_30px_120px_rgba(0,0,0,0.8)]'
        )}
      >
        <div className="flex items-center gap-3 text-sm font-medium text-white/80">
          <Logo
            size={28}
            compact
            withText
            textClassName="text-sm font-semibold text-white"
          />
          <div className="hidden text-[11px] text-white/40 sm:block">
            immutable social · devnet
          </div>
        </div>

        <nav className="flex items-center gap-3 text-[12px] font-medium">
          <a
            href="#features"
            className="rounded-md px-2 py-1 text-white/60 hover:text-white"
          >
            Why
          </a>
          <a
            href="#trending"
            className="rounded-md px-2 py-1 text-white/60 hover:text-white"
          >
            Live feed
          </a>
          <a
            href="#safety"
            className="rounded-md px-2 py-1 text-white/60 hover:text-white"
          >
            Read this
          </a>

          <div className="ml-3 h-5 w-px bg-white/10" />

          <a
            href={isAuthed ? '/feed' : '/profile'}
            className={cn(
              'rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-black',
              'hover:bg-white/90 active:scale-[0.98] transition'
            )}
          >
            {isAuthed ? 'Open app' : 'Connect wallet'}
          </a>
        </nav>
      </motion.div>
    </header>
  );
}

// ======================
// HERO with stagger + glow
// ======================
function GlowHero({ isAuthed }: { isAuthed: boolean }) {
  const container = {
    hidden: { opacity: 0, y: 16 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.08,
        duration: 0.4,
        ease: 'easeOut',
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  return (
    <section className="relative mx-auto mt-16 max-w-4xl px-4 text-white sm:mt-24">
      {/* glow halo */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 -z-10 flex items-center justify-center',
          '[mask-image:radial-gradient(circle_at_center,white,transparent_70%)]'
        )}
      >
        <motion.div
          className="h-72 w-72 rounded-full blur-[50px] bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.4)_0%,rgba(0,0,0,0)_70%)]"
          animate={{
            scale: [1, 1.05, 1],
            rotate: [0, 8, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className={cn(
          'rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02]',
          'p-8 text-white shadow-[0_60px_200px_rgba(0,0,0,0.9)] backdrop-blur-sm'
        )}
      >
        <motion.div
          variants={item}
          className="text-[11px] font-medium uppercase tracking-wide text-white/50"
        >
          Layered <span className="text-white/30">•</span> devnet alpha
        </motion.div>

        <motion.h1
          variants={item}
          className="mt-3 text-2xl font-semibold leading-tight text-white sm:text-3xl sm:leading-[1.15]"
        >
          <Balancer>
            The social feed that can’t be edited,
            can’t be deleted,
            and pays you for being worth hearing.
          </Balancer>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-4 max-w-xl text-[13px] leading-relaxed text-white/70 sm:text-[14px]"
        >
          This is Twitter on-chain.
          Every post is a transaction.
          It lives forever.
          Likes are not just clout — they’re income.
          When people like your post,
          you earn SOL.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-6 flex flex-wrap gap-3 text-[13px] sm:text-[14px]"
        >
          <a
            href={isAuthed ? '/feed' : '/profile'}
            className={cn(
              'rounded-lg bg-white px-4 py-2 font-semibold text-black shadow-[0_16px_40px_rgba(0,0,0,0.8)]',
              'hover:bg-white/90 active:scale-[0.98] transition'
            )}
          >
            {isAuthed ? 'Open your feed' : 'Connect wallet'}
          </a>

          <a
            href="/profile"
            className={cn(
              'rounded-lg border border-white/20 bg-white/0 px-4 py-2 font-semibold text-white',
              'hover:bg-white/10 active:scale-[0.98] transition'
            )}
          >
            Claim your handle
          </a>
        </motion.div>

        <motion.p
          variants={item}
          className="mt-4 text-[11px] leading-relaxed text-white/40"
        >
          No email. No password. Your wallet <span className="text-white/60">is</span> your account.
          Your record is public. Your reputation is on-chain.
        </motion.p>
      </motion.div>
    </section>
  );
}

// ======================
// Feature cards
// ======================
function FeatureCard({
  icon,
  title,
  desc,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotateX: -5 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
      whileHover={{
        scale: 1.02,
        boxShadow:
          '0 40px 160px rgba(0,0,0,0.9), 0 0 20px rgba(99,102,241,0.5)',
      }}
      className={cn(
        'group relative rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left text-white',
        'backdrop-blur-sm shadow-[0_30px_120px_rgba(0,0,0,0.8)] transition-transform'
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]" />

      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 text-[13px] font-semibold text-white shadow-[0_16px_40px_rgba(0,0,0,0.8)]">
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-white">{title}</div>
          <div className="mt-1 text-[12px] leading-snug text-white/60">
            {desc}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FeaturesRow() {
  return (
    <section
      id="features"
      className="mx-auto mt-16 max-w-4xl px-4 text-white sm:mt-20"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FeatureCard
          delay={0}
          icon={<Shield className="h-4 w-4" />}
          title="Immutable posts"
          desc="You can’t edit history here. No stealth deletes. No silent rewrites. Words mean something again."
        />
        <FeatureCard
          delay={0.05}
          icon={<ReceiptText className="h-4 w-4" />}
          title="On-chain receipts"
          desc="Every post is a transaction. Anyone can prove who said what and when. No moderator can rewrite it."
        />
        <FeatureCard
          delay={0.1}
          icon={<Coins className="h-4 w-4" />}
          title="Likes pay you"
          desc="Likes are micro-rewards in SOL. Say something valuable, get liked, earn. Truth and originality become income."
        />
      </div>

      <div className="mt-6 text-[12px] leading-relaxed text-white/40 sm:text-[13px]">
        We’re trying to build an incentive system for honesty and signal.
        You build reputation in public, and people literally fund it.
      </div>
    </section>
  );
}

// ======================
// MiniPost feed preview
// ======================
function MiniPost({
  author,
  handle,
  text,
  ts,
  delay,
  likeCount,
  earned,
}: {
  author: string;
  handle: string;
  text: string;
  ts: string;
  delay: number;
  likeCount: number;
  earned: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
      whileHover={{
        y: -2,
        scale: 1.01,
      }}
      className={cn(
        'rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white',
        'backdrop-blur-sm shadow-[0_30px_120px_rgba(0,0,0,0.8)] transition-all'
      )}
    >
      <div className="flex flex-wrap items-baseline gap-2 text-[13px] leading-none">
        <span className="font-semibold text-white">{author}</span>
        <span className="text-white/50">@{handle}</span>
        <span className="ml-auto text-[11px] text-white/40">{ts}</span>
      </div>

      <div className="mt-3 whitespace-pre-line text-[13px] leading-[1.4] text-white/90">
        {text}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-white/40">
        <span>♥ {likeCount}</span>
        <span>earned {earned} SOL</span>
        <span className="text-white/30">immutable</span>
      </div>
    </motion.div>
  );
}

function TrendingSection() {
  return (
    <section
      id="trending"
      className="mx-auto mt-16 max-w-4xl px-4 text-white sm:mt-20"
    >
      <div className="mb-4 flex items-baseline justify-between">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-white/50">
          Live feed snapshots
        </div>
        <div className="text-[11px] text-white/30">(devnet preview)</div>
      </div>

      <div className="space-y-4">
        <MiniPost
          delay={0}
          author="bad_timing"
          handle="u_7q22UL"
          ts="just now"
          text={`This is public forever.\nSay it like you mean it 😎`}
          likeCount={35}
          earned="0.42"
        />

        <MiniPost
          delay={0.05}
          author="truth_hurts"
          handle="truth_hurts"
          ts="2m"
          text={`Journalists are gonna hate this lol\nThere is no 'edit last tweet'.\nThere is only 'prove I said it first'.`}
          likeCount={61}
          earned="0.88"
        />

        <MiniPost
          delay={0.1}
          author="wallet_3xy9p"
          handle="3xy9p"
          ts="5m"
          text={`bro I literally got paid SOL for a meme\nthis is the only social app that respects the meme economy 😂`}
          likeCount={112}
          earned="1.90"
        />
      </div>
    </section>
  );
}

// ======================
// Footer / disclaimer
// ======================
function FooterSection() {
  return (
    <footer
      id="safety"
      className="mx-auto mt-20 max-w-4xl px-4 pb-24 text-[11px] leading-relaxed text-white/40 sm:mt-24 sm:pb-32"
    >
      <div className="border-t border-white/10 pt-6">
        <div className="text-white/60 font-medium">
          radical transparency • high stakes • devnet
        </div>

        <div className="mt-2 text-white/40">
          This is experimental. Balances can reset. Code can change. Nothing
          here is financial advice. Don’t deposit more than you’re willing
          to tip strangers on the internet.
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-white/30">
          <a className="hover:text-white/60" href="/feed">
            App
          </a>
          <a className="hover:text-white/60" href="/profile">
            Claim handle
          </a>
          <span className="text-white/20">·</span>
          <span>Layered © devnet</span>
        </div>
      </div>
    </footer>
  );
}

// ======================
// PAGE
// ======================
export default function HomePage() {
  const { props } = usePage<{
    auth?: { user?: { wallet: string | null } | null };
  }>();
  const isAuthed = !!props.auth?.user?.wallet;

  return (
    <>
      <Head title="Layered" />

      <main className="relative min-h-screen overflow-x-hidden text-white antialiased">
        <FloatingBg />

        <TopNav isAuthed={isAuthed} />

        <GlowHero isAuthed={isAuthed} />

        <FeaturesRow />

        <TrendingSection />

        <FooterSection />
      </main>
    </>
  );
}
