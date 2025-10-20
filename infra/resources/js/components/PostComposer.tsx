// resources/js/components/PostComposer.tsx
'use client';

import { useMemo, useRef, useState } from 'react';
import AutoTextarea from '@/components/ui/AutoTextarea';
import Avatar from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { usePage } from '@inertiajs/react';
import ComposerToolbar from '@/components/composer/ComposerToolbar';
import PollEditor, { PollData } from '@/components/composer/PollEditor';
import { LuX } from 'react-icons/lu';
import { cn } from '@/lib/utils';
import GifPicker from '@/components/pickers/GifPicker';
import EmojiPicker from '@/components/pickers/EmojiPicker';
import NiceEmojiPicker from '@/components/pickers/NiceEmojiPicker';

export type PostPayload = {
  text: string;
  images?: File[];
  gifUrl?: string;
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

  // pickers visibility
  const [showGif, setShowGif] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const chars = text.length;
  const over = chars > maxChars;
  const canPost =
    authed && !busy && !over && (!!text.trim() || images.length > 0 || gifUrl || poll);

  const openPickImages = () => inputRef.current?.click();

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (next.length === 0) return;
    setImages((prev) => [...prev, ...next].slice(0, 4));
  };

  const clearAttachments = () => {
    setImages([]);
    setGifUrl(undefined);
  };

  const removeGif = () => setGifUrl(undefined);

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
      setText('');
      setImages([]);
      setGifUrl(undefined);
      setPoll(undefined);
      setShowGif(false);
      setShowEmoji(false);
    } finally {
      setBusy(false);
    }
  };

  const previews = useMemo(
    () =>
      images.map((f) => ({
        file: f,
        url: URL.createObjectURL(f),
      })),
    [images],
  );

  return (
    <article className="rounded-2xl bg-white p-4 shadow-[inset_0_0_0_1px_rgba(26,26,0,0.12)] dark:bg-[#161615] dark:shadow-[inset_0_0_0_1px_#2a2a2a]">
      <div className="flex items-start gap-3">
        <Avatar size={40} />
        <div className="min-w-0 grow">
          <AutoTextarea
            disabled={!authed}
            placeholder={authed ? placeholder : 'Login to post'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="bg-transparent border-none px-0 py-0 focus:outline-none focus:ring-0 placeholder:text-[#9b9a96]"
          />

          {/* attachments preview */}
          {(previews.length > 0 || gifUrl) && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {previews.map((p) => (
                <div key={p.url} className="group relative overflow-hidden rounded-xl ring-1 ring-black/10 dark:ring-white/10">
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
                  <button
                    type="button"
                    onClick={removeGif}
                    aria-label="Remove GIF"
                    className={cn(
                      'absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full',
                      'bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/70',
                      'dark:bg-white/20 dark:hover:bg-white/30'
                    )}
                    title="Remove GIF"
                  >
                    <LuX className="h-4 w-4" />
                  </button>
                </div>
              )}


            </div>
          )}

          {/* poll */}
          {poll && <PollEditor value={poll} onChange={setPoll} className="mt-3" />}

          {/* footer + pickers */}
          <div ref={toolbarRef} className="relative mt-3 flex items-center gap-3">
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
                setShowGif(false);
                setShowEmoji((v) => !v);
              }}
              onOpenGif={() => {
                setShowEmoji(false);
                setShowGif((v) => !v);
              }}
              onTogglePoll={() =>
                setPoll((p) => (p ? undefined : ({ options: [], durationMinutes: 24 * 60 } as any)))
              }
              pollActive={!!poll}
              hasAttachments={images.length > 0 || !!gifUrl}
              onClearAttachments={clearAttachments}
            />

            {/* right side: counter + post */}
            <div className="ml-auto flex items-center gap-3">
              <span className={cn('text-xs', (text.length > maxChars) ? 'text-[#E5484D]' : 'text-[#8e8d89]')}>
                {text.length}/{maxChars}
              </span>
              <Button onClick={submit} disabled={!canPost} isLoading={busy} className="px-4">
                Post
              </Button>
            </div>

            {/* popovers */}
            {showGif && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50">
                <GifPicker
                  onPick={(url) => {
                    setGifUrl(url);
                    setShowGif(false);
                  }}
                  onClose={() => setShowGif(false)}
                />
              </div>
            )}
            {showEmoji && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50">
                <NiceEmojiPicker
                  onPick={(emoji) => setText((t) => t + emoji)}
                  onClose={() => setShowEmoji(false)}
                />
              </div>
            )}

          </div>
        </div>
      </div>
    </article>
  );
}
