// resources/js/components/Footer.tsx
'use client';

import { cn } from '@/lib/utils';

const DEFAULT_URL = 'https://apewise.org/ape2.png';
const DEST_URL = 'https://apewise.org'; // change if needed

export default function Footer({
  className,
  compact = false,
  logoSrc = DEFAULT_URL,
  brand = 'Apewise',
  linkHref = DEST_URL,
}: {
  className?: string;
  compact?: boolean;
  logoSrc?: string;
  brand?: string;
  linkHref?: string;
}) {
  const size = compact ? 18 : 22;

  return (
    <footer className={cn('mt-10 flex justify-center', className)}>
      <a
        href={linkHref}
        target="_blank"
        rel="noreferrer"
        className={cn(
          'group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm',
          'shadow-[inset_0_0_0_1px_rgba(26,26,0,0.12)] dark:shadow-[inset_0_0_0_1px_#2a2a2a]',
          'bg-white/70 backdrop-blur-md dark:bg-[#151515]/70',
          'transition-colors hover:bg-white/85 dark:hover:bg-[#191919]/80'
        )}
        aria-label={`Visit ${brand}`}
      >
        {/* your logo */}
        <img
          src={logoSrc}
          alt={`${brand} logo`}
          width={size}
          height={size}
          loading="lazy"
          className={cn(
            'h-[--logo-size] w-[--logo-size] rounded-md object-contain',
            // subtle glass outline so it sits nicely on any bg
            ''
          )}
          style={{ ['--logo-size' as any]: `${size}px` }}
        />

        <span className="text-[#1b1b18] dark:text-[#EDEDEC]">
          created by <span className="font-medium">{brand}</span>
        </span>

        <span
          className={cn(
            'ml-1 inline-block translate-y-px text-[#8e8d89] transition-opacity',
            'group-hover:opacity-100 opacity-70'
          )}
          aria-hidden="true"
        >
          ↗
        </span>
      </a>
    </footer>
  );
}
