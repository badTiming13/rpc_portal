'use client';

import { cn } from '@/lib/utils';

type Props = {
  src?: string | null;
  alt?: string;
  /** size in px (square). default 40 */
  size?: number;
  className?: string;
};

export default function Avatar({ src, alt, size = 40, className }: Props) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full',
        className
      )}
      style={{ width: size, height: size }}
      aria-label={alt}
    >
      {src ? (
        <img
          src={src ?? undefined}
          alt={alt ?? ''}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div
          className={cn(
            'absolute inset-0 grid place-items-center text-[10px] font-semibold uppercase tracking-wide',
            // if parent passed gradient/bg classes via className, those already applied on wrapper.
            // but in case wrapper had only ring/etc, give fallback bg:
            !className?.match(/bg-|gradient/) &&
              'bg-black/5 text-black/40 dark:bg-white/5 dark:text-white/40'
          )}
        >
          {/* simple placeholder glyph: could be an emoji, tier icon, etc */}
          <span>◉</span>
        </div>
      )}
    </div>
  );
}
