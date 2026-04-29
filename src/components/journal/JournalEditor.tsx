/**
 * 일기 편집기 — shadcn Dialog 모달.
 *
 * 모드:
 * - create: 새 일기 추가 (date=오늘, body 빈 상태에서 시작)
 * - edit:   기존 항목 수정 (id + initialBody + initialMood)
 *
 * UX (TaskScheduleDialog 패턴):
 * - autoFocus textarea
 * - Ctrl/Cmd + Enter 저장
 * - Esc 닫기
 * - placeholder = AI 가이드 정적 질문 3종 랜덤
 */
import { useEffect, useMemo, useState } from 'react';
import { Type, Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { journalStore } from '@/services/journalStore';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { MoodPicker } from './MoodPicker';
import { TagInput } from './TagInput';
import { JournalImagePicker } from './JournalImagePicker';
import { WikiBlockEditor } from '@/components/wiki/WikiBlockEditor';
import { extractTagsFromBody, mergeTags, getTopTags } from '@/lib/journalTags';
import type { Mood, JournalEntry, BodyFormat, JournalImage } from '@/types/journal';

type Mode =
  | { kind: 'create' }
  | {
      kind: 'edit';
      id: string;
      initialBody: string;
      initialMood?: Mood;
      initialTags?: string[];
      initialFormat?: BodyFormat;
      initialImages?: JournalImage[];
    };

interface JournalEditorProps {
  open: boolean;
  mode: Mode | null;
  onClose: () => void;
}

const PROMPTS = [
  '오늘 어떤 결정을 했나요?',
  '기억에 남는 한 순간은?',
  '내일 한 가지 하고 싶은 것은?',
] as const;

export const JournalEditor = ({ open, mode, onClose }: JournalEditorProps) => {
  const [body, setBody] = useState('');
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [format, setFormat] = useState<BodyFormat>('plain');
  const [images, setImages] = useState<JournalImage[]>([]);

  const suggestions = useMemo(() => {
    return getTopTags(journalStore.list(), 8).map((t) => t.tag);
  }, [open]);

  useEffect(() => {
    if (!mode) return;
    if (mode.kind === 'edit') {
      setBody(mode.initialBody);
      setMood(mode.initialMood);
      setManualTags(mode.initialTags ?? []);
      setFormat(mode.initialFormat ?? 'plain');
      setImages(mode.initialImages ?? []);
    } else {
      setBody('');
      setMood(undefined);
      setManualTags([]);
      setFormat('plain');
      setImages([]);
    }
  }, [mode, open]);

  // 매번 새 모달 진입 시 placeholder 랜덤 (편집 모드는 무관).
  const placeholder = useMemo(() => {
    if (!open || mode?.kind !== 'create') return PROMPTS[0];
    return PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  }, [open, mode]);

  const dateLabel = useMemo(() => {
    if (mode?.kind === 'edit') {
      const e: JournalEntry | undefined = journalStore
        .list()
        .find((x) => x.id === mode.id);
      const target = e ? new Date(e.createdAt) : new Date();
      return target.toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
      });
    }
    return new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });
  }, [mode, open]);

  if (!mode) return null;

  const handleSubmit = () => {
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      notify.warning('한 줄이라도 적어주세요', { duration: 1500 });
      return;
    }
    // 본문 #태그 자동 추출 + 수동 태그 합치기
    const bodyTags = extractTagsFromBody(trimmed);
    const finalTags = mergeTags(bodyTags, manualTags);
    const tagsToSave = finalTags.length > 0 ? finalTags : undefined;

    const formatToSave = format === 'plain' ? undefined : format;

    const imagesToSave = images.length > 0 ? images : undefined;

    if (mode.kind === 'edit') {
      journalStore.update(mode.id, {
        body: trimmed,
        mood,
        tags: tagsToSave,
        bodyFormat: formatToSave,
        images: imagesToSave,
      });
      notify.success('수정됐어요', { duration: 1500 });
    } else {
      journalStore.add({
        body: trimmed,
        mood,
        tags: tagsToSave,
        bodyFormat: formatToSave,
        images: imagesToSave,
      });
      notify.success('일기 저장됐어요', { duration: 1500 });
    }
    onClose();
  };

  const handleKeyDownGlobal = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          'transition-all',
          format === 'plain' ? 'max-w-md' : 'max-w-2xl',
        )}
        onKeyDown={handleKeyDownGlobal}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 pr-8">
            <span className="text-[15px] font-semibold">
              {mode.kind === 'edit' ? '일기 수정' : '오늘 일기'}
            </span>
            {/* 형식 토글 (Linear 패턴) */}
            <div
              role="tablist"
              className="inline-flex items-center gap-0.5 p-0.5 rounded-md bg-accent/40 border border-[hsl(var(--hairline))]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={format === 'plain'}
                onClick={() => setFormat('plain')}
                title="간편 텍스트"
                className={cn(
                  'inline-flex items-center gap-1 px-2 h-6 rounded text-[10.5px] font-semibold transition-colors',
                  format === 'plain'
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-[hsl(var(--hairline))]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Type className="h-3 w-3" />
                간편
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={format === 'markdown'}
                onClick={() => setFormat('markdown')}
                title="풍부한 편집 (마크다운/리스트/헤딩)"
                className={cn(
                  'inline-flex items-center gap-1 px-2 h-6 rounded text-[10.5px] font-semibold transition-colors',
                  format === 'markdown'
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-[hsl(var(--hairline))]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Wand2 className="h-3 w-3" />
                풍부
              </button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          <span className="text-[11.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
            {dateLabel}
          </span>

          {format === 'plain' ? (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={placeholder}
              autoFocus
              rows={7}
              className="w-full px-4 py-3 font-serif text-[15px] rounded-md border border-[hsl(var(--hairline))] bg-card focus:border-foreground/50 focus:outline-none transition-colors text-foreground resize-none whitespace-pre-wrap"
              style={{
                lineHeight: '1.875rem',
                backgroundImage: `repeating-linear-gradient(
                  to bottom,
                  transparent 0,
                  transparent calc(1.875rem - 1px),
                  hsl(var(--hairline) / 0.5) calc(1.875rem - 1px),
                  hsl(var(--hairline) / 0.5) 1.875rem
                )`,
                backgroundPositionY: '0.75rem',
              }}
            />
          ) : (
            <div className="rounded-md border border-[hsl(var(--hairline))] bg-card overflow-hidden min-h-[280px] max-h-[60vh] overflow-y-auto">
              <WikiBlockEditor
                body={body}
                onChange={setBody}
                allPages={[]}
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-foreground font-semibold">
              기분
            </span>
            <MoodPicker value={mood} onChange={setMood} />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-foreground font-semibold">
              태그
            </span>
            <TagInput value={manualTags} onChange={setManualTags} suggestions={suggestions} />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-foreground font-semibold">
              사진
            </span>
            <JournalImagePicker value={images} onChange={setImages} />
          </div>
          </div>

        <DialogFooter className="flex-row sm:justify-end mt-2 gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-[12px] rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            title="Ctrl/Cmd + Enter"
            className="px-4 py-1.5 text-[12px] rounded-md bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
          >
            저장
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
