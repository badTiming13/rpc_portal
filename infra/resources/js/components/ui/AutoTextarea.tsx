'use client';

import { useEffect, useRef } from 'react';
import autosize from 'autosize';
import { cn } from '@/lib/utils';

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function AutoTextarea({ className, ...props }: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    autosize(ref.current);
    return () => {
      if (ref.current) autosize.destroy(ref.current);
    };
  }, []);

  return (
    <textarea
      ref={ref}
      rows={1}
      className={cn(
        // фон и бордер прозрачные — совпадает с цветом родителя
        'w-full resize-none border border-transparent bg-transparent px-3 py-2',
        // цвета текста/плейсхолдера и фокус-стили
        'text-[14px] leading-5 text-current placeholder:text-[#9b9a96]',
        'focus:outline-none focus:ring-2 focus:ring-[#FF750F] focus:border-[#FF750F]',
        // в дарк-режиме оставляем тот же принцип
        'dark:text-[#EDEDEC] dark:placeholder:text-[#7e7d79]',
        className
      )}
      {...props}
    />
  );
}
