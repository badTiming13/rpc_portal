// resources/js/components/Logo.tsx
'use client';

import { useId, useMemo } from 'react';
import { cn } from '@/lib/utils';

type LogoProps = {
  size?: number;          // overall icon height in px
  withText?: boolean;     // show "Layered" wordmark
  compact?: boolean;      // tighter gap when withText
  className?: string;     // wrapper classes
  textClassName?: string; // wordmark classes
};

export default function Logo({
  size = 56,
  withText = false,
  compact = false,
  className,
  textClassName,
}: LogoProps) {
  const gid = useId();

  // top -> bottom visual ramp (blue → gray)
  const colors = useMemo(
    () => ['#3B82F6', '#60A5FA', '#93C5FD'],
    []
  );

  // viewbox geometry (integer-aligned to avoid hairlines)
  const view = { w: 48, h: 48 };
  const card = { x: 6, y: 5, w: 24, h: 32, r: 4 }; // more “cue-card” proportions
  const dx = 6;  // x offset per layer
  const dy = 4;  // y offset per layer

  const width = (size * view.w) / view.h;
  const height = size;

  return (
    <div className={cn('inline-flex items-center', compact ? 'gap-2' : 'gap-3', className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${view.w} ${view.h}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Layered"
        shapeRendering="geometricPrecision"
      >
        {/* draw bottom → top so the bluest card sits on top */}
        {colors
          .slice()            // copy
          .reverse()          // gray bottom, blue top
          .map((fill, i) => {
            const idxFromBottom = i; // 0 = bottom-most
            const layersTotal = colors.length;
            const orderFromTop = layersTotal - 1 - idxFromBottom;
            const ox = orderFromTop * dx;
            const oy = orderFromTop * dy;
            const bodyOpacity = 0.95 - orderFromTop * 0.09; // slightly more transparent deeper layers

            const clipId = `${gid}-clip-${i}`;

            return (
              <g key={i} transform={`translate(${ox} ${oy})`}>
                {/* clip all overlays to the same rounded rect so corners stay rounded */}
                <clipPath id={clipId}>
                  <rect x={card.x} y={card.y} width={card.w} height={card.h} rx={card.r} ry={card.r} />
                </clipPath>

                {/* body */}
                <rect
                  x={card.x}
                  y={card.y}
                  width={card.w}
                  height={card.h}
                  rx={card.r}
                  ry={card.r}
                  fill={fill}
                  opacity={bodyOpacity}
                />

                {/* subtle inside stroke for a glassy edge, clipped to the card */}
                <g clipPath={`url(#${clipId})`}>
                  <rect
                    x={card.x + 0.5}
                    y={card.y + 0.5}
                    width={card.w - 1}
                    height={card.h - 1}
                    rx={Math.max(card.r - 0.5, 0)}
                    ry={Math.max(card.r - 0.5, 0)}
                    fill="none"
                    stroke={`url(#${gid}-stroke)`}
                    strokeWidth={0.75}
                    opacity={0.9}
                  />
                  {/* left glassy shine, clipped so it never “squares” a corner */}
                  <rect
                    x={card.x}
                    y={card.y}
                    width={Math.max(7, Math.floor(card.w * 0.34))}
                    height={card.h}
                    rx={card.r}
                    ry={card.r}
                    fill={`url(#${gid}-shine)`}
                  />
                </g>
              </g>
            );
          })}

        <defs>
          {/* left-to-right shine */}
          <linearGradient id={`${gid}-shine`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* vertical stroke gradient */}
          <linearGradient id={`${gid}-stroke`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.18" />
          </linearGradient>
        </defs>
      </svg>

      {withText && (
        <span className={cn('select-none font-semibold text-2xl tracking-tight', textClassName)}>
          Layered
        </span>
      )}
    </div>
  );
}
