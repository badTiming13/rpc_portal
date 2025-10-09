'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { cn } from '@/lib/utils';

export type PollOption = { id: string; text: string };
export type PollData = {
  options: PollOption[];
  durationMinutes: number; // 5 min .. 7 days (Twitter-like)
};

export default function PollEditor({
  value,
  onChange,
  className,
}: {
  value?: PollData;
  onChange: (val: PollData | undefined) => void;
  className?: string;
}) {
  const [poll, setPoll] = useState<PollData>(
    value ?? {
      options: [
        { id: crypto.randomUUID(), text: '' },
        { id: crypto.randomUUID(), text: '' },
      ],
      durationMinutes: 24 * 60,
    },
  );

  const update = (next: PollData) => {
    setPoll(next);
    onChange(next);
  };

  const setOption = (id: string, text: string) => {
    update({
      ...poll,
      options: poll.options.map((o) => (o.id === id ? { ...o, text } : o)),
    });
  };

  const addOption = () => {
    if (poll.options.length >= 4) return;
    update({
      ...poll,
      options: [...poll.options, { id: crypto.randomUUID(), text: '' }],
    });
  };

  const removeOption = (id: string) => {
    const next = { ...poll, options: poll.options.filter((o) => o.id !== id) };
    if (next.options.length < 2) return; // минимум 2 варианта
    update(next);
  };

  const setDuration = (minutes: number) => {
    update({ ...poll, durationMinutes: minutes });
  };

  return (
    <div
      className={cn(
        'mt-3 space-y-2 rounded-xl border border-black/10 p-3 dark:border-white/10',
        className,
      )}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-black/60 dark:text-white/60">
        Poll
      </div>

      <div className="space-y-2">
        {poll.options.map((opt, idx) => (
          <div key={opt.id} className="flex items-center gap-2">
            <input
              value={opt.text}
              onChange={(e) => setOption(opt.id, e.target.value)}
              placeholder={`Option ${idx + 1}`}
              className="flex-1 rounded-lg border border-black/10 bg-transparent px-3 py-2 text-[14px] leading-5 outline-none focus:border-[#FF750F] focus:ring-2 focus:ring-[#FF750F] dark:border-white/10"
            />
            {poll.options.length > 2 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeOption(opt.id)}
                title="Remove option"
                className="shrink-0"
              >
                <LuTrash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        {poll.options.length < 4 && (
          <Button type="button" variant="ghost" size="sm" onClick={addOption} className="gap-2">
            <LuPlus className="h-4 w-4" />
            Add option
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <DurationPill
          label="5m"
          active={poll.durationMinutes === 5}
          onClick={() => setDuration(5)}
        />
        <DurationPill
          label="30m"
          active={poll.durationMinutes === 30}
          onClick={() => setDuration(30)}
        />
        <DurationPill
          label="1d"
          active={poll.durationMinutes === 24 * 60}
          onClick={() => setDuration(24 * 60)}
        />
        <DurationPill
          label="3d"
          active={poll.durationMinutes === 3 * 24 * 60}
          onClick={() => setDuration(3 * 24 * 60)}
        />
        <DurationPill
          label="7d"
          active={poll.durationMinutes === 7 * 24 * 60}
          onClick={() => setDuration(7 * 24 * 60)}
        />
      </div>
    </div>
  );
}

function DurationPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-xs',
        active
          ? 'bg-[#1b1b18] text-white dark:bg-white dark:text-[#0a0a0a]'
          : 'border border-black/10 text-[#1b1b18] dark:border-white/10 dark:text-[#EDEDEC]',
      )}
    >
      {label}
    </button>
  );
}
