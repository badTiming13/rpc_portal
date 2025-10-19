'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type Mode = 'light' | 'dark';

export default function ThemeProbe() {
  const [isDarkClass, setIsDarkClass] = useState<boolean>(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false
  );
  const [saved, setSaved] = useState<string | null>(null);
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
      : false
  );

  useEffect(() => {
    // track <html class="dark"> changes (на всякий)
    const obs = new MutationObserver(() => {
      setIsDarkClass(document.documentElement.classList.contains('dark'));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // track system changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener?.('change', onChange);

    // saved theme
    setSaved(localStorage.getItem('theme'));

    return () => {
      obs.disconnect();
      mq.removeEventListener?.('change', onChange);
    };
  }, []);

  const mode: Mode = isDarkClass ? 'dark' : 'light';

  return (
    <div
      className={cn(
        'rounded-2xl p-4',
        // Важно: фон и текст меняются от темы
        'bg-white text-[#1b1b18] shadow-[inset_0_0_0_1px_rgba(26,26,0,0.12)]',
        'dark:bg-[#0a0a0a] dark:text-[#EDEDEC] dark:shadow-[inset_0_0_0_1px_#2a2a2a]'
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm shadow-[inset_0_0_0_1px_rgba(26,26,0,0.12)] dark:shadow-[inset_0_0_0_1px_#2a2a2a]">
          <span
            className={cn(
              'inline-block h-2.5 w-2.5 rounded-full',
              mode === 'dark' ? 'bg-[#FF750F]' : 'bg-[#1b1b18]'
            )}
          />
          Current: <b className="capitalize">{mode}</b>
        </span>

        <span className="text-xs text-black/60 dark:text-white/60">
          saved=<code>{saved ?? 'null'}</code> | systemDark={<code>{String(systemDark)}</code>}
        </span>
      </div>

      {/* Блок который резко меняет стиль, чтобы было видно эффект */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl p-4 shadow-[inset_0_0_0_1px_rgba(26,26,0,0.12)] dark:shadow-[inset_0_0_0_1px_#2a2a2a]">
          <div className="text-sm text-black/60 dark:text-white/60">This card follows theme</div>
          <div className="mt-1 text-base">
            Текст меняет цвет, фон — тоже. Проверь переключателем выше.
          </div>
        </div>

        <div className="rounded-xl p-4 bg-[#f7f7f5] text-[#1b1b18] dark:bg-[#141414] dark:text-[#EDEDEC]">
          <div className="text-sm opacity-60">Hard contrast demo</div>
          <div className="mt-1 text-base">
            Здесь ещё заметнее различие между светлой и тёмной темой.
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="inline-block rounded-md bg-black/90 px-2 py-0.5 text-white dark:hidden">
              visible only in light
            </span>
            <span className="hidden rounded-md bg-white/90 px-2 py-0.5 text-black dark:inline-block">
              visible only in dark
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
