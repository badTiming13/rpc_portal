// resources/js/components/ui/ThemeSwitcher.tsx
'use client';

import { useEffect, useState } from 'react';

type Mode = 'light' | 'dark' | 'system';

function applyTheme(mode: Mode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark);

  document.documentElement.classList.toggle('dark', isDark);
  // помогает нативным скроллбарам/формам
  (document.documentElement.style as any).colorScheme = isDark ? 'dark' : 'light';

  localStorage.setItem('theme', mode);
}

export default function ThemeSwitcher() {
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('theme') as Mode) || 'system');

  useEffect(() => {
    applyTheme(mode);
    // реагируем на смену системной темы, когда выбран "system"
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => mode === 'system' && applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  return (
    <div className="inline-flex gap-2 rounded-2xl border border-black/10 p-1 dark:border-white/10">
      {(['light','dark','system'] as const).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={`rounded-xl px-3 py-1.5 text-sm ${
            mode === m
              ? 'border border-[#FF750F] text-white dark:text-white'
              : 'text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/5'
          }`}
        >
          {m[0].toUpperCase() + m.slice(1)}
        </button>
      ))}
    </div>
  );
}
