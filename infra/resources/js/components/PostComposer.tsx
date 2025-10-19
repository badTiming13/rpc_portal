'use client';

import { useMemo, useRef, useState } from 'react';
import AutoTextarea from '@/components/ui/AutoTextarea';
import Avatar from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { usePage } from '@inertiajs/react';
import ComposerToolbar from '@/components/composer/ComposerToolbar';
import PollEditor, { PollData } from '@/components/composer/PollEditor';
import { LuX } from 'react-icons/lu';
import { cn } from '@/lib/utils';

export type PostPayload = {
  text: string;
  images?: File[];   // raw files
  gifUrl?: string;   // если выбрали GIF из провайдера
  poll?: PollData;
};

export default function PostComposer({
  maxChars = 1000,
  placeholder = "What's happening on-chain?",
  onSubmit,
}: {
  maxChars?: number;
  placeholder?: string;
  onSubmit?: (payload: PostPayload) => Promise<void> | void;
}) {
  const { props } = usePage();
  const authed = !!props.auth?.user;

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  // attachments
  const [images, setImages] = useState<File[]>([]);
  const [gifUrl, setGifUrl] = useState<string | undefined>(undefined);
  const [poll, setPoll] = useState<PollData | undefined>(undefined);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const chars = text.length;
  const over = chars > maxChars;

  const canPost =
    authed && !busy && !over && (!!text.trim() || images.length > 0 || gifUrl || poll);

  const openPickImages = () => inputRef.current?.click();

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (next.length === 0) return;
    setImages((prev) => [...prev, ...next].slice(0, 4)); // максимум 4, как в twitter
  };

  const clearAttachments = () => {
    setImages([]);
    setGifUrl(undefined);
  };

  const submit = async () => {
    if (!canPost) return;
    try {
      setBusy(true);
      await onSubmit?.({
        text: text.trim(),
        images: images.length ? images : undefined,
        gifUrl,
        poll,
      });
      // reset
      setText('');
      setImages([]);
      setGifUrl(undefined);
      setPoll(undefined);
    } finally {
      setBusy(false);
    }
  };

  // превьюшки для картинок
  const previews = useMemo(
    () =>
      images.map((f) => ({
        file: f,
        url: URL.createObjectURL(f),
      })),
    [images],
  );

  return (
    <article
      className="
        rounded-2xl bg-white p-4 shadow-[inset_0_0_0_1px_rgba(26,26,0,0.12)]
        dark:bg-[#161615] dark:shadow-[inset_0_0_0_1px_#2a2a2a]
      "
    >
      <div className="flex items-start gap-3">
        <Avatar size={40} />
        <div className="min-w-0 grow">
          <AutoTextarea
            disabled={!authed}
            placeholder={authed ? placeholder : 'Login to post'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="bg-transparent border-none px-0 py-0 focus:ring-0 focus:outline-none placeholder:text-[#9b9a96]"
          />

          {/* attachments preview */}
          {(previews.length > 0 || gifUrl) && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {previews.map((p) => (
                <div
                  key={p.url}
                  className="group relative overflow-hidden rounded-xl ring-1 ring-black/10 dark:ring-white/10"
                >
                  <img
                    src={p.url}
                    alt={p.file.name}
                    className="h-full w-full object-cover"
                    onLoad={() => URL.revokeObjectURL(p.url)}
                  />
                </div>
              ))}
              {gifUrl && (
                <div className="relative overflow-hidden rounded-xl ring-1 ring-black/10 dark:ring-white/10">
                  <img src={gifUrl} alt="gif" className="h-full w-full object-cover" />
                </div>
              )}
              <button
                type="button"
                title="Clear attachments"
                onClick={clearAttachments}
                className="col-span-2 mt-1 inline-flex items-center gap-2 self-start rounded-lg border border-black/10 px-3 py-1.5 text-xs text-[#6f6e6a] hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
              >
                <LuX className="h-3.5 w-3.5" />
                Clear attachments
              </button>
            </div>
          )}

          {/* poll */}
          {poll && (
            <PollEditor
              value={poll}
              onChange={setPoll}
              className="mt-3"
            />
          )}

          {/* footer */}
          <div className="mt-3 flex items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => onFiles(e.target.files)}
            />

            <ComposerToolbar
              onPickImages={openPickImages}
              onOpenEmoji={() => {
                setText((t) => t + ' 🙂');
              }}
              onOpenGif={() => {
                const demo = 'https://media.tenor.com/2roX3uxz_68AAAAC/cat-computer.gif';
                setGifUrl(demo);
              }}
              onTogglePoll={() => setPoll((p) => (p ? undefined : { options: [], durationMinutes: 24 * 60 } as any))}
              pollActive={!!poll}
              hasAttachments={images.length > 0 || !!gifUrl}
              onClearAttachments={clearAttachments}
            />

            <div className="ml-auto flex items-center gap-3">
              <span
                className={cn(
                  'text-xs',
                  over ? 'text-[#E5484D]' : 'text-[#8e8d89]',
                )}
              >
                {chars}/{maxChars}
              </span>

              <Button
                onClick={submit}
                disabled={!canPost}
                isLoading={busy}
                className="px-4"
              >
                {busy ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Posting…
                  </>
                ) : (
                  'Post'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
