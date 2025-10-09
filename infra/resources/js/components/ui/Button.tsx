'use client';

import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  /** Растягиваем кнопку на всю ширину — НЕ прокидываем в DOM */
  full?: boolean;
}

const base =
  'inline-flex items-center justify-center rounded-2xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ' +
  'focus:ring-[#FF750F] focus:ring-offset-transparent';

const variants: Record<Variant, string> = {
  primary: 'bg-[#1b1b18] text-white hover:bg-black dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-[#ededec]',
  secondary: 'bg-[#f2f2f0] text-[#1b1b18] hover:bg-[#eaeae7] dark:bg-[#1a1a1a] dark:text-[#ededec] dark:hover:bg-[#222]',
  ghost: 'bg-transparent hover:bg-[#f3f2ef] text-[#1b1b18] dark:text-[#ededec] dark:hover:bg-[#171717]',
  danger: 'bg-[#E5484D] text-white hover:bg-[#dc3d42]',
  outline: 'border border-[#e3e3e0] text-[#1b1b18] hover:bg-[#faf9f6] dark:border-[#333] dark:text-[#ededec] dark:hover:bg-[#171717]',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
  icon: 'h-10 w-10',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', isLoading, full = false, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      {...rest}
      className={cn(base, variants[variant], sizes[size], full && 'w-full', className)}
    >
      {isLoading && (
        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      )}
      {children}
    </button>
  );
});
