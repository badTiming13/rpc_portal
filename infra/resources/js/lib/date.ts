export function formatWhen(
  input: string | number | Date,
  opts: { now?: Date; short?: boolean } = {}
): string {
  const now = opts.now ?? new Date();
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);

  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);

  // Relative for ~24h
  if (sec < 60) return opts.short ? `${sec}s` : `${sec} seconds ago`;
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    return opts.short ? `${m}m` : `${m} minutes ago`;
  }
  if (sec < 86400) {
    const h = Math.floor(sec / 3600);
    return opts.short ? `${h}h` : `${h} hours ago`;
  }

  // Otherwise: e.g. "Oct 20, 2025 · 18:43"
  const date = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(d);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return `${date} · ${time}`;
}
