'use client';

import { PropsWithChildren } from 'react';
import { usePage, Link } from '@inertiajs/react';
import WalletAuth from '@/components/WalletAuth';

export default function AppLayout({ children }: PropsWithChildren) {
  const { props } = usePage();
  const user = props.auth?.user;

  return (
    <div className="min-h-screen bg-[#FDFDFC] text-[#1b1b18] dark:bg-[#0a0a0a]">
      <div className="mx-auto max-w-6xl grid grid-cols-12 gap-6 p-6 lg:p-8">
        {/* Sidebar */}
        <aside className="col-span-12 lg:col-span-3">
          <div className="sticky top-6 space-y-6">
            <div className="rounded-lg bg-white dark:bg-[#161615] shadow-[inset_0_0_0_1px_rgba(26,26,0,0.16)] dark:shadow-[inset_0_0_0_1px_#fffaed2d] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-[#706f6c] dark:text-[#A1A09A]">Status</div>
                  <div className="text-sm font-medium">{user ? 'Logged in' : 'Guest'}</div>
                </div>
              </div>
              <div className="mt-3">
                <WalletAuth />
              </div>
            </div>

            <nav className="rounded-lg bg-white dark:bg-[#161615] shadow-[inset_0_0_0_1px_rgba(26,26,0,0.16)] dark:shadow-[inset_0_0_0_1px_#fffaed2d] p-4">
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:underline">Home</Link></li>
                <li><Link href="/feed" className="hover:underline">Feed</Link></li>
                <li><Link href="/profile" className="hover:underline">Profile</Link></li>
              </ul>
            </nav>
          </div>
        </aside>

        {/* Main */}
        <main className="col-span-12 lg:col-span-9">
          {children}
        </main>
      </div>
    </div>
  );
}
