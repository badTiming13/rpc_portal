// resources/js/components/pickers/NiceEmojiPicker.tsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createPicker, Picker, PickerOptions } from 'picmo';
import 'picmostyles.css';

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

  const theme = useMemo<Theme>(() => {
    if (themeProp) return themeProp;
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
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
    if (!hostRef.current) return;

    // Recreate on theme change
    pickerRef.current?.destroy();

    const opts: Partial<PickerOptions> = {
      emojiSize: '1.35rem',
      showPreview: false,
      showSearch: true,
      autoFocus: true,
      theme: theme === 'dark' ? 'dark' : 'light',
      rootElement: hostRef.current,
    };

    pickerRef.current = createPicker(opts as any);
    pickerRef.current.addEventListener('emoji:select', (e: any) => onPick(e.emoji));

    return () => pickerRef.current?.destroy();
  }, [theme, onPick]);

  return (
    <div
      ref={hostRef}
      className={
        // Rounded + clipped frame so it looks native to your UI
        'w-[320px] h-[370px] overflow-hidden rounded-2xl ring-1 ring-black/10 shadow-xl ' +
        'dark:ring-white/10 dark:bg-[#151515] ' +
        className
      }
      style={
        theme === 'dark'
          ? ({
              ['--picmo-color-surface' as any]: '#151515',
              ['--picmo-color-on-surface' as any]: '#ededec',
              ['--picmo-color-muted' as any]: '#8e8d89',
              ['--picmo-border-radius' as any]: '16px',
              ['--picmo-padding' as any]: '10px',
            } as any)
          : ({
              ['--picmo-color-surface' as any]: '#ffffff',
              ['--picmo-color-on-surface' as any]: '#1b1b18',
              ['--picmo-color-muted' as any]: '#6f6e6a',
              ['--picmo-border-radius' as any]: '16px',
              ['--picmo-padding' as any]: '10px',
            } as any)
      }
    />
  );
}
