'use client';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { LuImage, LuListChecks, LuX, LuSmile } from 'react-icons/lu';
import { TbGif } from 'react-icons/tb';

export default function ComposerToolbar({
  onPickImages,
  onOpenEmoji,
  onOpenGif,
  onTogglePoll,
  pollActive,
  className,
  hasAttachments,
  onClearAttachments,
}: {
  onPickImages: () => void;
  onOpenEmoji: () => void;   // подключишь свой emoji picker
  onOpenGif: () => void;     // и GIF picker
  onTogglePoll: () => void;
  pollActive: boolean;
  className?: string;
  hasAttachments?: boolean;
  onClearAttachments?: () => void;
}) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <IconButton title="Add images" onClick={onPickImages}>
        <LuImage className="h-4 w-4" />
      </IconButton>

      <IconButton title="Add GIF" onClick={onOpenGif}>
        <TbGif className="h-4 w-4" />
      </IconButton>

      <IconButton title="Insert emoji" onClick={onOpenEmoji}>
        <LuSmile className="h-4 w-4" />
      </IconButton>

      <IconButton
        title={pollActive ? 'Remove poll' : 'Add poll'}
        onClick={onTogglePoll}
        active={pollActive}
      >
        <LuListChecks className="h-4 w-4" />
      </IconButton>

      {hasAttachments && onClearAttachments && (
        <IconButton title="Clear attachments" onClick={onClearAttachments}>
          <LuX className="h-4 w-4" />
        </IconButton>
      )}
    </div>
  );
}

function IconButton({
  children,
  title,
  onClick,
  active,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="sm"
      className="h-8 w-8 p-0"
      title={title}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
