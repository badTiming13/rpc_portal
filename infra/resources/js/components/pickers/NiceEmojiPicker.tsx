// resources/js/components/pickers/NiceEmojiPicker.tsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createPicker, type Picker, type PickerOptions } from 'picmo';

type Theme = 'light' | 'dark';

export default function NiceEmojiPicker({
  onPick,
  onClose,
  className = '',
  theme: themeProp,
}: {
  onPick: (emoji: string) => void;
  onClose?: () => void;
  className?: string;
  theme?: Theme;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const pickerRef = useRef<Picker | null>(null);

  // figure out theme
  const resolvedTheme = useMemo<Theme>(() => {
    if (themeProp) return themeProp;
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }, [themeProp]);

  // click outside to close
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!hostRef.current) return;
      if (!hostRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  // create / update picker
  useEffect(() => {
    const root = hostRef.current;
    if (!root) return;

    // destroy previous if any
    pickerRef.current?.destroy();
    pickerRef.current = null;

    const opts: Partial<PickerOptions> = {
      rootElement: root,
      autoFocus: true,
      showSearch: true,
      showPreview: false,
      emojiSize: '1.4rem',
      theme: resolvedTheme, // 'light' | 'dark'
    };

    const picker = createPicker(opts as PickerOptions);

    picker.addEventListener('emoji:select', (e: any) => {
      if (e?.emoji) {
        onPick(e.emoji);
      }
    });

    pickerRef.current = picker;

    return () => {
      picker.destroy();
    };
  }, [resolvedTheme, onPick]);

  return (
    <div
      ref={hostRef}
      className={[
        // rounded shell that clips the internal picker
        'w-[320px] h-[370px] overflow-hidden rounded-2xl ring-1 ring-black/10 shadow-xl',
        'dark:ring-white/10 dark:bg-[#151515]',
        // make sure internal scrollbars don't bleed ugly
        '[&_*::-webkit-scrollbar]:w-2',
        '[&_*::-webkit-scrollbar-track]:bg-transparent',
        '[&_*::-webkit-scrollbar-thumb]:rounded-full',
        '[&_*::-webkit-scrollbar-thumb]:bg-white/20',
        'dark:[&_*::-webkit-scrollbar-thumb]:bg-white/20',
        className,
      ].join(' ')}
      style={
        resolvedTheme === 'dark'
          ? ({
              // Surface colors for picmo
              ['--picmo-color-surface' as any]: '#151515',
              ['--picmo-color-on-surface' as any]: '#ededec',
              ['--picmo-color-muted' as any]: '#8e8d89',

              // borders / focus rings
              ['--picmo-color-border' as any]: '#2a2a2a',
              ['--picmo-color-active' as any]: '#3B82F6',

              // layout tweaks
              ['--picmo-border-radius' as any]: '12px',
              ['--picmo-padding' as any]: '8px',
              ['--picmo-font-family' as any]: 'inherit',

              // fallback bg for inner panels
              backgroundColor: '#151515',
              color: '#ededec',
            } as any)
          : ({
              ['--picmo-color-surface' as any]: '#ffffff',
              ['--picmo-color-on-surface' as any]: '#1b1b18',
              ['--picmo-color-muted' as any]: '#6f6e6a',

              ['--picmo-color-border' as any]: 'rgba(0,0,0,0.12)',
              ['--picmo-color-active' as any]: '#3B82F6',

              ['--picmo-border-radius' as any]: '12px',
              ['--picmo-padding' as any]: '8px',
              ['--picmo-font-family' as any]: 'inherit',

              backgroundColor: '#ffffff',
              color: '#1b1b18',
            } as any)
      }
    />
  );
}
