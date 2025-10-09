'use client';

import { cn } from '@/lib/utils';

type Props = {
  src?: string | null;
  alt?: string;
  /** В пикселях, по умолчанию 40 */
  size?: number;
  className?: string;
};

export default function Avatar({ src, alt, size = 40, className }: Props) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-full shrink-0', // не даём флексу сжимать
        className
      )}
      style={{ width: size, height: size }} // квадрат гарантирован
      aria-label={alt}
    >
      {src ? (
        <img
          src={src ?? undefined}
          alt={alt ?? ''}
          className="absolute inset-0 h-full w-full object-cover" // без искажений
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-black/5 dark:bg-white/5">
          {/* простой плейсхолдер-иконка */}
          
        </div>
      )}
    </div>
  );
}
