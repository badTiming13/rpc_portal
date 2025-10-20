// resources/js/components/pickers/EmojiPicker.tsx
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

    const handler = (e: CustomEvent<EmojiClickEventDetail>) => {
      const native = e.detail.unicode ?? e.detail.emoji?.unicode ?? '';
      if (native) onPick(native);
    };
    elRef.current.addEventListener('emoji-click', handler as any);

    // theme + QoL
    elRef.current.setAttribute('theme', theme);
    elRef.current.setAttribute('search-autofocus', 'true');
    elRef.current.setAttribute('skin-tone-emoji', '👍');

    return () => elRef.current?.removeEventListener('emoji-click', handler as any);
  }, [theme, onPick]);

  return (
    <div
      ref={hostRef}
      className={
        // wrapper just provides drop shadow; rounding happens on the element itself
        'shadow-xl ' + className
      }
    >
      {/* eslint-disable-next-line react/no-unknown-property */}
      <emoji-picker
        ref={elRef}
        // IMPORTANT: clip the Shadow DOM by rounding the host element
        class="block w-[320px] h-[370px] rounded-2xl overflow-hidden ring-1 ring-black/10 dark:ring-white/10"
        style={{
          // extra safety in case Tailwind classes are purged/changed
          borderRadius: '16px',
        }}
      ></emoji-picker>
    </div>
  );
}
