'use client';

import 'emoji-picker-element';
import type { EmojiClickEventDetail } from 'emoji-picker-element';
import { useEffect, useMemo, useRef } from 'react';

type Theme = 'light' | 'dark' | 'auto';

export default function EmojiPicker({
  onPick,
  onClose,
  theme: themeProp,
  className = '',
}: {
  onPick: (nativeEmoji: string) => void;
  onClose?: () => void;
  theme?: Theme;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const elRef = useRef<any>(null); // <emoji-picker> element

  // derive theme from <html> when not passed
  const theme = useMemo<Theme>(() => {
    if (themeProp) return themeProp;
    const isDark = document.documentElement.classList.contains('dark');
    return isDark ? 'dark' : 'light';
  }, [themeProp]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!hostRef.current) return;
      if (!hostRef.current.contains(e.target as Node)) onClose?.();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  useEffect(() => {
    if (!elRef.current) return;

    // wire selection event
    const handler = (e: CustomEvent<EmojiClickEventDetail>) => {
      const native = e.detail.unicode ?? e.detail.emoji?.unicode ?? '';
      if (native) onPick(native);
    };
    elRef.current.addEventListener('emoji-click', handler as any);

    // apply theme + perf options
    elRef.current.setAttribute('theme', theme);
    elRef.current.setAttribute('search-autofocus', 'true');
    elRef.current.setAttribute('skin-tone-emoji', '👍');

    return () => {
      elRef.current?.removeEventListener('emoji-click', handler as any);
    };
  }, [theme, onPick]);

  return (
    <div
      ref={hostRef}
      className={
        'rounded-2xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-[#151515] ' +
        className
      }
    >
      {/* The web component itself */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <emoji-picker ref={elRef} style={{ width: 320, height: 370, display: 'block' }}></emoji-picker>
    </div>
  );
}
