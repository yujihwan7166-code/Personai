import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Editor as TipTapEditor } from '@tiptap/react';
import {
  Bold,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { journalStore } from '@/services/journalStore';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { MoodPicker } from './MoodPicker';
import { TagInput } from './TagInput';
import { WikiBlockEditor } from '@/components/wiki/WikiBlockEditor';
import { compressImage } from '@/lib/journalImage';
import { extractTagsFromBody, getTopTags, mergeTags } from '@/lib/journalTags';
import { pickPrompt, type JournalPrompt } from '@/lib/journalPrompts';
import {
  DEFAULT_ACTIVITIES,
  WEATHER_META,
  type BodyFormat,
  type JournalEntry,
  type JournalImage,
  type Mood,
  type Weather,
} from '@/types/journal';

type Mode =
  | { kind: 'create'; date?: string; initialBody?: string }
  | {
      kind: 'edit';
      id: string;
      initialBody: string;
      initialMood?: Mood;
      initialTags?: string[];
      initialFormat?: BodyFormat;
      initialImages?: JournalImage[];
      initialActivities?: string[];
      initialWeather?: Weather;
      initialSleepHours?: number;
      initialEnergy?: 1 | 2 | 3 | 4 | 5;
    };

interface JournalEditorProps {
  open: boolean;
  mode: Mode | null;
  onClose: () => void;
}

const DRAFT_KEY = 'journal.draft.v1';

interface DraftSnapshot {
  body: string;
  mood?: Mood;
  manualTags: string[];
  format: BodyFormat;
  activities: string[];
  savedAt: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

const normalizeMood = (value: unknown): Mood | undefined =>
  typeof value === 'number' && value >= 1 && value <= 5 ? (value as Mood) : undefined;

const normalizeFormat = (value: unknown): BodyFormat =>
  value === 'plain' || value === 'markdown' ? value : 'markdown';

const loadDraft = (): DraftSnapshot | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.body !== 'string') return null;
    return {
      body: parsed.body,
      mood: normalizeMood(parsed.mood),
      manualTags: normalizeStringArray(parsed.manualTags),
      format: normalizeFormat(parsed.format),
      activities: normalizeStringArray(parsed.activities),
      savedAt: typeof parsed.savedAt === 'number' && Number.isFinite(parsed.savedAt)
        ? parsed.savedAt
        : Date.now(),
    };
  } catch {
    return null;
  }
};

const saveDraft = (snap: DraftSnapshot): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(snap));
  } catch {
    // LocalStorage can be full when users paste large content.
  }
};

const clearDraft = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
};

const formatDateLabel = (date: Date): string =>
  date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

const localDateKey = (): string => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

export const JournalEditor = ({ open, mode, onClose }: JournalEditorProps) => {
  const [body, setBody] = useState('');
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [images, setImages] = useState<JournalImage[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [weather, setWeather] = useState<Weather | undefined>(undefined);
  const [sleepHours, setSleepHours] = useState<number | undefined>(undefined);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5 | undefined>(undefined);
  const [currentPrompt, setCurrentPrompt] = useState<JournalPrompt | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [richEditor, setRichEditor] = useState<TipTapEditor | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef(false);
  const seenPromptIdsRef = useRef<string[]>([]);
  const format: BodyFormat = 'markdown';

  const suggestions = useMemo(() => getTopTags(journalStore.list(), 8).map((t) => t.tag), []);

  useEffect(() => {
    if (!mode) return;
    submittedRef.current = false;

    if (mode.kind === 'edit') {
      setBody(mode.initialBody);
      setMood(mode.initialMood);
      setManualTags(mode.initialTags ?? []);
      setImages(mode.initialImages ?? []);
      setActivities(mode.initialActivities ?? []);
      setWeather(mode.initialWeather);
      setSleepHours(mode.initialSleepHours);
      setEnergy(mode.initialEnergy);
      setCurrentPrompt(null);
      setDraftSavedAt(null);
      return;
    }

    const initialBody = typeof mode.initialBody === 'string' ? mode.initialBody.trim() : '';

    if (initialBody) {
      setBody(`${initialBody}\n\n`);
      setMood(undefined);
      setManualTags([]);
      setActivities([]);
      setImages([]);
      setWeather(undefined);
      setSleepHours(undefined);
      setEnergy(undefined);
      setDraftSavedAt(null);
    } else {
      const draft = open ? loadDraft() : null;
      if (draft && draft.body.trim().length > 0) {
        setBody(draft.body);
        setMood(draft.mood);
        setManualTags(draft.manualTags);
        setActivities(draft.activities);
        setImages([]);
        setWeather(undefined);
        setSleepHours(undefined);
        setEnergy(undefined);
        setDraftSavedAt(draft.savedAt);
        notify.info('작성 중이던 내용을 불러왔어요', { duration: 2200 });
      } else {
        setBody('');
        setMood(undefined);
        setManualTags([]);
        setImages([]);
        setActivities([]);
        setWeather(undefined);
        setSleepHours(undefined);
        setEnergy(undefined);
        setDraftSavedAt(null);
      }
    }

    const fresh = pickPrompt({ excludeIds: seenPromptIdsRef.current });
    seenPromptIdsRef.current = [...seenPromptIdsRef.current, fresh.id].slice(-15);
    setCurrentPrompt(fresh);
  }, [mode, open]);

  useEffect(() => {
    if (!open || mode?.kind !== 'create') return;
    if (body.trim().length === 0) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      const now = Date.now();
      saveDraft({ body, mood, manualTags, format, activities, savedAt: now });
      setDraftSavedAt(now);
    }, 30_000);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [activities, body, format, manualTags, mode, mood, open]);

  const dateLabel = useMemo(() => {
    if (mode?.kind === 'edit') {
      const entry: JournalEntry | undefined = journalStore.list().find((item) => item.id === mode.id);
      return formatDateLabel(entry ? new Date(entry.createdAt) : new Date());
    }
    const target = mode?.kind === 'create' && mode.date
      ? new Date(`${mode.date}T00:00:00`)
      : new Date();
    return formatDateLabel(target);
  }, [mode]);

  if (!mode) return null;

  const placeholder = currentPrompt?.text ?? '오늘 마음에 가장 오래 남은 장면을 적어보세요.';
  const charCount = body.replace(/\s+/g, '').length;
  const readMinutes = charCount > 0 ? Math.max(1, Math.round(charCount / 250)) : 0;

  const uploadJournalImage = async (file: File): Promise<string> => {
    try {
      const { src } = await compressImage(file);
      return src;
    } catch (err) {
      console.error('[journal] image compression failed:', err);
      notify.error('이미지 추가에 실패했어요', { duration: 2000 });
      throw err;
    }
  };

  const pickImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !richEditor) return;
      const src = await uploadJournalImage(file);
      richEditor.chain().focus().setImage({ src }).run();
    };
    input.click();
  };

  const handleClose = () => {
    if (mode.kind === 'create' && !submittedRef.current && body.trim().length > 0) {
      saveDraft({ body, mood, manualTags, format, activities, savedAt: Date.now() });
      notify.info('작성 중인 내용을 임시 저장했어요', { duration: 1800 });
    }
    onClose();
  };

  const handleSubmit = () => {
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      notify.warning('한 줄이라도 적어주세요', { duration: 1500 });
      return;
    }

    const bodyTags = extractTagsFromBody(trimmed);
    const finalTags = mergeTags(bodyTags, manualTags);
    const tagsToSave = finalTags.length > 0 ? finalTags : undefined;
    const imagesToSave = images.length > 0 ? images : undefined;
    const activitiesToSave = activities.length > 0 ? activities : undefined;
    const targetDate = mode.kind === 'create'
      ? (mode.date ?? localDateKey())
      : undefined;

    if (targetDate && journalStore.listByDate(targetDate).length >= 2) {
      notify.info('오늘 일기는 하루에 최대 2번까지 쓸 수 있어요', {
        description: '작성 중인 내용은 그대로 남겨둘게요.',
        duration: 2200,
      });
      return;
    }

    submittedRef.current = true;
    if (mode.kind === 'edit') {
      journalStore.update(mode.id, {
        body: trimmed,
        mood,
        tags: tagsToSave,
        bodyFormat: format,
        images: imagesToSave,
        activities: activitiesToSave,
        weather,
        sleepHours,
        energy,
      });
      notify.success('일기를 수정했어요', { duration: 1500 });
    } else {
      journalStore.add({
        body: trimmed,
        mood,
        tags: tagsToSave,
        bodyFormat: format,
        images: imagesToSave,
        activities: activitiesToSave,
        weather,
        sleepHours,
        energy,
        date: targetDate,
      });
      clearDraft();
      setDraftSavedAt(null);
      notify.success('일기를 저장했어요', { duration: 1500 });
    }
    onClose();
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setBody('');
    setMood(undefined);
    setManualTags([]);
    setActivities([]);
    setDraftSavedAt(null);
    notify.info('임시 저장을 비웠어요', { duration: 1500 });
  };

  const handleKeyDownGlobal = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent
        className={cn(
          'journal-warm-theme flex max-h-[90vh] max-w-[960px] flex-col overflow-hidden p-0 gap-0',
          'bg-card border-[hsl(var(--hairline))] shadow-2xl',
        )}
        onKeyDown={handleKeyDownGlobal}
      >
        <DialogHeader className="shrink-0 border-b border-[hsl(var(--hairline))] px-6 py-4">
          <DialogTitle className="flex min-w-0 flex-wrap items-baseline gap-3 pr-8">
            <span className="text-[18px] font-bold tracking-[-0.01em]">
              {mode.kind === 'edit' ? '일기 수정' : '오늘의 일기'}
            </span>
            <span className="text-[11.5px] font-medium text-muted-foreground">
              {dateLabel}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_270px]">
            <section className="min-w-0">
              <div className="overflow-hidden rounded-lg border border-[hsl(var(--hairline))] bg-card">
                <JournalMiniToolbar editor={richEditor} onPickImage={pickImage} />
                <div className="min-h-[410px] px-4 py-3">
                  <WikiBlockEditor
                    body={body}
                    onChange={setBody}
                    allPages={[]}
                    hideToolbar
                    disableSlashMenu
                    onEditorReady={(editor) => setRichEditor(editor ?? null)}
                    firstPlaceholder={placeholder}
                    restPlaceholder="조금 더 이어서 적어볼까요?"
                    onUploadImage={uploadJournalImage}
                  />
                </div>
              </div>
            </section>

            <aside className="flex flex-col gap-4 md:border-l md:border-[hsl(var(--hairline))] md:pl-5">
              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-semibold text-foreground">오늘 기분</h3>
                  <span className="text-[10.5px] text-muted-foreground">선택 사항</span>
                </div>
                <MoodPicker value={mood} onChange={setMood} />
              </section>

              <section className="space-y-2">
                <h3 className="text-[12px] font-semibold text-foreground">컨디션</h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-8 text-[10.5px] text-muted-foreground">낮음</span>
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const active = energy === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setEnergy(active ? undefined : (n as 1 | 2 | 3 | 4 | 5))}
                          aria-pressed={active}
                          className={cn(
                            'h-8 flex-1 rounded-md border text-[11px] font-semibold tabular-nums transition-colors',
                            active
                              ? 'border-primary/40 bg-primary/12 text-primary'
                              : 'border-[hsl(var(--hairline))] bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                          )}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                  <span className="w-8 text-right text-[10.5px] text-muted-foreground">높음</span>
                </div>
              </section>

              <section className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-semibold text-foreground">날씨</h3>
                  {weather ? (
                    <button
                      type="button"
                      onClick={() => setWeather(undefined)}
                      className="text-[10.5px] text-muted-foreground/70 hover:text-foreground"
                    >
                      {WEATHER_META[weather].label} 지우기
                    </button>
                  ) : (
                    <span className="text-[10.5px] text-muted-foreground">선택 사항</span>
                  )}
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {(Object.keys(WEATHER_META) as Weather[]).map((key) => {
                    const meta = WEATHER_META[key];
                    const active = weather === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setWeather(active ? undefined : key)}
                        title={meta.label}
                        aria-pressed={active}
                        className={cn(
                          'flex h-8 items-center justify-center rounded-lg border transition-colors',
                          active
                            ? 'border-primary/40 bg-primary/10 text-primary shadow-[0_6px_16px_-14px_hsl(var(--primary)/0.6)]'
                            : 'border-[hsl(var(--hairline))] bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                        )}
                      >
                        <span className="text-[15px]" aria-hidden>{meta.emoji}</span>
                        <span className="sr-only">{meta.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <label className="block space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-foreground">수면</span>
                  <span className="text-[10.5px] text-muted-foreground">
                    {sleepHours != null ? `${sleepHours}시간` : '선택 사항'}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={sleepHours ?? ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === '') {
                        setSleepHours(undefined);
                        return;
                      }
                      const next = Number.parseFloat(value);
                      if (Number.isFinite(next) && next >= 0 && next <= 24) setSleepHours(next);
                    }}
                    placeholder="예: 7.5"
                    className="h-9 w-full rounded-lg border border-[hsl(var(--hairline))] bg-card pl-3 pr-10 text-[12px] tabular-nums outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/35 focus:ring-2 focus:ring-primary/10"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] text-muted-foreground">
                    시간
                  </span>
                </div>
              </label>

              <section className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-semibold text-foreground">활동</h3>
                  <span className="text-[10.5px] text-muted-foreground">
                    {activities.length > 0 ? `${activities.length}개 선택` : '선택 사항'}
                  </span>
                </div>
                <JournalActivityChips value={activities} onChange={setActivities} />
              </section>

              <section className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-semibold text-foreground">태그</h3>
                  <span className="text-[10.5px] text-muted-foreground">
                    {manualTags.length > 0 ? `${manualTags.length}개` : '선택 사항'}
                  </span>
                </div>
                <TagInput value={manualTags} onChange={setManualTags} suggestions={suggestions} />
              </section>
            </aside>
          </div>
        </div>

        <DialogFooter className="flex-row items-center gap-2 border-t border-[hsl(var(--hairline))] px-5 py-3 sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-[10.5px] text-muted-foreground">
            <span className="tabular-nums">{charCount.toLocaleString()}자</span>
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span>{readMinutes > 0 ? `${readMinutes}분 읽기` : '아직 비어 있음'}</span>
            {mode.kind === 'create' && draftSavedAt && (
              <>
                <span aria-hidden className="text-muted-foreground/40">·</span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/70" aria-hidden />
                  임시 저장됨
                </span>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="text-muted-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
                >
                  비우기
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="rounded-md px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            title="Ctrl/Cmd + Enter"
            className="rounded-md bg-primary px-4 py-1.5 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            저장
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function JournalMiniToolbar({
  editor,
  onPickImage,
}: {
  editor: TipTapEditor | null;
  onPickImage: () => void;
}) {
  const disabled = !editor;

  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1 border-b border-[hsl(var(--hairline))] bg-background/45 px-2 py-1.5">
      <MiniTool
        active={Boolean(editor?.isActive('bold'))}
        disabled={disabled}
        label="굵게"
        onClick={() => editor?.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </MiniTool>
      <MiniTool
        active={Boolean(editor?.isActive('italic'))}
        disabled={disabled}
        label="기울임"
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </MiniTool>
      <span className="mx-1 h-4 w-px bg-[hsl(var(--hairline))]" aria-hidden />
      <MiniTool
        active={Boolean(editor?.isActive('bulletList'))}
        disabled={disabled}
        label="목록"
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3.5 w-3.5" />
      </MiniTool>
      <MiniTool
        active={Boolean(editor?.isActive('orderedList'))}
        disabled={disabled}
        label="번호 목록"
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </MiniTool>
      <MiniTool
        active={Boolean(editor?.isActive('blockquote'))}
        disabled={disabled}
        label="인용"
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-3.5 w-3.5" />
      </MiniTool>
      <span className="mx-1 h-4 w-px bg-[hsl(var(--hairline))]" aria-hidden />
      <MiniTool disabled={disabled} label="사진" onClick={onPickImage}>
        <ImagePlus className="h-3.5 w-3.5" />
      </MiniTool>
    </div>
  );
}

function MiniTool({
  active,
  children,
  disabled,
  label,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors',
        active
          ? 'bg-primary/12 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
      )}
    >
      {children}
    </button>
  );
}

function JournalActivityChips({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selected = new Set(value);
  const visibleActivities = expanded ? DEFAULT_ACTIVITIES : DEFAULT_ACTIVITIES.slice(0, 4);
  const hiddenCount = DEFAULT_ACTIVITIES.length - visibleActivities.length;

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange([...next]);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleActivities.map((activity) => {
        const active = selected.has(activity.key);
        return (
          <button
            key={activity.key}
            type="button"
            onClick={() => toggle(activity.key)}
            aria-pressed={active}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors',
              active
                ? 'border-primary/35 bg-primary/10 text-primary shadow-[0_6px_16px_-14px_hsl(var(--primary)/0.55)]'
                : 'border-[hsl(var(--hairline))] bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground',
            )}
          >
            <span className="text-[13px]" aria-hidden>{activity.emoji}</span>
            {activity.label}
          </button>
        );
      })}

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex h-8 items-center rounded-full border border-dashed border-[hsl(var(--hairline))] bg-card px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
        >
          +{hiddenCount}
        </button>
      )}
    </div>
  );
}
