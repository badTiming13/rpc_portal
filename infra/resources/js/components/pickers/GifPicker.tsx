'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export default function GifPicker({
  onPick,
  onClose,
  className,
}: {
  onPick: (url: string) => void;
  onClose?: () => void;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [gifs, setGifs] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!hostRef.current) return;
      if (!hostRef.current.contains(e.target as Node)) onClose?.();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/gif/search?q=${encodeURIComponent(q)}&limit=30`, {
          credentials: 'same-origin',
        });
        const j = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (res.ok && j?.ok) {
            setGifs(j.gifs || []);
          } else {
            setErr(j?.error || j?.detail || `HTTP ${res.status}`);
            setGifs([]);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || 'Network error');
          setGifs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [q]);

  return (
    <div
      ref={hostRef}
      className={cn(
        'w-[360px] rounded-2xl border border-black/10 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#151515]',
        className
      )}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search GIFs"
        className="mb-2 w-full rounded-lg border border-black/10 bg-transparent px-2 py-1 text-sm outline-none dark:border-white/10"
      />
      <div className="grid max-h-[320px] grid-cols-3 gap-2 overflow-auto">
        {loading ? (
          <div className="col-span-3 py-8 text-center text-sm opacity-70">Loading…</div>
        ) : err ? (
          <div className="col-span-3 py-8 text-center text-sm opacity-70">{String(err)}</div>
        ) : gifs.length === 0 ? (
          <div className="col-span-3 py-8 text-center text-sm opacity-70">No results</div>
        ) : (
          gifs.map((u) => (
            <button
              key={u}
              onClick={() => onPick(u)}
              className="group relative overflow-hidden rounded-lg ring-1 ring-black/10 hover:opacity-90 dark:ring-white/10"
              title="Pick GIF"
            >
              <img src={u} className="h-28 w-full object-cover" loading="lazy" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
