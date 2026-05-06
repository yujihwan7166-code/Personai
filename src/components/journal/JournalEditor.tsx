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
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { ActivityPicker } from './ActivityPicker';
import { WikiBlockEditor } from '@/components/wiki/WikiBlockEditor';
import { extractTagsFromBody, mergeTags, getTopTags } from '@/lib/journalTags';
import { pickPrompt, type JournalPrompt } from '@/lib/journalPrompts';
import {
  WEATHER_META,
  type Mood,
  type JournalEntry,
  type BodyFormat,
  type JournalImage,
  type Weather,
} from '@/types/journal';

type Mode =
  | { kind: 'create'; date?: string /* YYYY-MM-DD — 미지정 시 오늘 */ }
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
  // images 는 base64 라 너무 무거워서 draft 에서 제외 (저장 시 다시 첨부)
  savedAt: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

const normalizeMood = (value: unknown): Mood | undefined =>
  typeof value === 'number' && value >= 1 && value <= 5 ? value as Mood : undefined;

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
      savedAt: typeof parsed.savedAt === 'number' && Number.isFinite(parsed.savedAt) ? parsed.savedAt : Date.now(),
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
    /* quota silent */
  }
};

const clearDraft = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* silent */
  }
};

export const JournalEditor = ({ open, mode, onClose }: JournalEditorProps) => {
  const [body, setBody] = useState('');
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [manualTags, setManualTags] = useState<string[]>([]);
  // 본문 형식은 항상 markdown (풍부) — 사용자 요청. 토글 제거.
  const format: BodyFormat = 'markdown';
  const [images, setImages] = useState<JournalImage[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  // v4 새 사이드 기능
  const [weather, setWeather] = useState<Weather | undefined>(undefined);
  const [sleepHours, setSleepHours] = useState<number | undefined>(undefined);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5 | undefined>(undefined);
  // 현재 프롬프트 (랜덤 회전 — placeholder 에만 사용, 헤더 chip 제거)
  const [currentPrompt, setCurrentPrompt] = useState<JournalPrompt | null>(null);
  const [seenPromptIds, setSeenPromptIds] = useState<string[]>([]);
  // 자동 저장 — 마지막 저장 시각
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 모달 닫을 때 draft 처리 결정 (정상 저장 시 clearDraft, 그렇지 않으면 유지)
  const submittedRef = useRef(false);

  const suggestions = useMemo(() => {
    return getTopTags(journalStore.list(), 8).map((t) => t.tag);
  }, []);

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
    } else {
      // create 모드 — draft 복구 시도
      const draft = open ? loadDraft() : null;
      if (draft && draft.body.trim().length > 0) {
        setBody(draft.body);
        setMood(draft.mood);
        setManualTags(draft.manualTags ?? []);
        setActivities(draft.activities ?? []);
        setImages([]);
        setWeather(undefined);
        setSleepHours(undefined);
        setEnergy(undefined);
        setDraftSavedAt(draft.savedAt);
        notify.info('이전 작성 중 내용을 복구했어요', { duration: 2200 });
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
      // 새 모달 진입 시 시간대 자동 감지 + 카테고리 회전 (placeholder 용)
      const fresh = pickPrompt({ excludeIds: seenPromptIds });
      setCurrentPrompt(fresh);
      setSeenPromptIds((prev) => [...prev, fresh.id].slice(-15)); // 최근 15개만 기억
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // 자동 저장 (create 모드만, 30초 debounce)
  useEffect(() => {
    if (!open || mode?.kind !== 'create') return;
    if (body.trim().length === 0) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      const now = Date.now();
      saveDraft({
        body,
        mood,
        manualTags,
        format,
        activities,
        savedAt: now,
      });
      setDraftSavedAt(now);
    }, 30_000);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [body, mood, manualTags, format, activities, mode, open]);

  // 닫기 핸들러 — 정상 저장 X 인데 본문 있으면 draft 보존
  const handleClose = () => {
    if (mode?.kind === 'create' && !submittedRef.current && body.trim().length > 0) {
      saveDraft({
        body,
        mood,
        manualTags,
        format,
        activities,
        savedAt: Date.now(),
      });
      notify.info('작성 중 내용 임시 저장됨', { duration: 1800 });
    }
    onClose();
  };

  // placeholder 텍스트
  const placeholder = currentPrompt?.text ?? '오늘 어떤 하루였나요?';

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
    // create — date 지정 시 그 날짜, 아니면 오늘
    const target = mode?.kind === 'create' && mode.date
      ? new Date(`${mode.date}T00:00:00`)
      : new Date();
    return target.toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });
  }, [mode]);

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
    const activitiesToSave = activities.length > 0 ? activities : undefined;

    submittedRef.current = true;
    if (mode.kind === 'edit') {
      journalStore.update(mode.id, {
        body: trimmed,
        mood,
        tags: tagsToSave,
        bodyFormat: formatToSave,
        images: imagesToSave,
        activities: activitiesToSave,
        weather,
        sleepHours,
        energy,
      });
      notify.success('수정됐어요', { duration: 1500 });
    } else {
      journalStore.add({
        body: trimmed,
        mood,
        tags: tagsToSave,
        bodyFormat: formatToSave,
        images: imagesToSave,
        activities: activitiesToSave,
        weather,
        sleepHours,
        energy,
        // create 모드에서 date 지정된 경우 그 날짜로 저장 (WeekSpotlight 과거 빈 날 채우기)
        date: mode.kind === 'create' ? mode.date : undefined,
      });
      clearDraft();
      setDraftSavedAt(null);
      notify.success('일기 저장됐어요', { duration: 1500 });
    }
    onClose();
  };

  // 사용자가 명시적으로 draft 버리기
  const handleDiscardDraft = () => {
    clearDraft();
    setBody('');
    setMood(undefined);
    setManualTags([]);
    setActivities([]);
    setDraftSavedAt(null);
    notify.info('임시 저장 비웠어요', { duration: 1500 });
  };

  const handleKeyDownGlobal = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className={cn(
          'journal-warm-theme transition-all max-w-3xl md:max-w-4xl',
          // 모달 자체 높이 제한 + 내부 스크롤 (헤더/푸터는 고정, 본문만 스크롤)
          'max-h-[90vh] flex flex-col p-0 gap-0',
          'bg-card border-[hsl(var(--hairline))]',
        )}
        onKeyDown={handleKeyDownGlobal}
      >
        <DialogHeader className="px-7 pt-6 pb-4 border-b border-[hsl(var(--hairline))] shrink-0">
          <DialogTitle className="flex items-baseline gap-3 pr-8 min-w-0 flex-wrap">
            <span className="text-[18px] font-bold shrink-0 tracking-[-0.01em]">
              {mode.kind === 'edit' ? '일기 수정' : '오늘 일기'}
            </span>
            <span className="text-[11.5px] font-medium tracking-[-0.005em] text-muted-foreground shrink-0">
              {dateLabel}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* 본문 + 메타 — 2 컬럼 (가로로 길게, 세로 압축) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-4 md:gap-5">
            {/* 좌측: 본문 — 항상 풍부 (markdown) */}
            <div className="min-w-0 flex flex-col">
              <div className="rounded-md border border-[hsl(var(--hairline))] bg-card overflow-hidden min-h-[320px]">
                <WikiBlockEditor
                  body={body}
                  onChange={setBody}
                  allPages={[]}
                  firstPlaceholder={placeholder}
                  restPlaceholder={placeholder}
                />
              </div>
            </div>

            {/* 우측: 메타 — 기분 / 날씨 / 컨디션 / 수면 / 활동 / 태그 */}
            <aside className="flex flex-col gap-3.5 md:border-l md:border-[hsl(var(--hairline))] md:pl-5">
              <div className="flex flex-col gap-1.5">
                <span className="text-[11.5px] font-semibold tracking-[-0.005em] text-foreground">
                  기분
                </span>
                <MoodPicker value={mood} onChange={setMood} />
              </div>

              {/* 날씨 — 6 emoji chip */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11.5px] font-semibold tracking-[-0.005em] text-foreground">
                  날씨
                </span>
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
                          'inline-flex items-center justify-center h-8 rounded-md border text-[16px] transition-colors',
                          active
                            ? 'border-foreground/40 bg-foreground/5'
                            : 'border-[hsl(var(--hairline))] bg-card hover:border-foreground/20',
                        )}
                      >
                        <span aria-hidden>{meta.emoji}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 컨디션 (energy) + 수면 — 2 컬럼 한 줄 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-[11.5px] font-semibold tracking-[-0.005em] text-foreground">
                    컨디션
                  </span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const active = energy === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setEnergy(active ? undefined : (n as 1 | 2 | 3 | 4 | 5))}
                          title={`컨디션 ${n}`}
                          aria-pressed={active}
                          className={cn(
                            'flex-1 h-8 rounded-md border text-[11px] font-semibold tabular-nums transition-colors',
                            active
                              ? 'border-foreground/40 bg-foreground text-background'
                              : 'border-[hsl(var(--hairline))] bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                          )}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-[11.5px] font-semibold tracking-[-0.005em] text-foreground">
                    수면
                  </span>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={sleepHours ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '') {
                          setSleepHours(undefined);
                          return;
                        }
                        const n = parseFloat(v);
                        if (Number.isFinite(n) && n >= 0 && n <= 24) setSleepHours(n);
                      }}
                      placeholder="–"
                      className="w-full h-8 pl-2 pr-8 text-[12px] tabular-nums rounded-md border border-[hsl(var(--hairline))] bg-card focus:border-foreground/30 focus:outline-none transition-colors placeholder:text-muted-foreground/60"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10.5px] text-muted-foreground pointer-events-none">
                      시간
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11.5px] font-semibold tracking-[-0.005em] text-foreground">
                  활동
                </span>
                <ActivityPicker value={activities} onChange={setActivities} />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[11.5px] font-semibold tracking-[-0.005em] text-foreground">
                  태그
                </span>
                <TagInput value={manualTags} onChange={setManualTags} suggestions={suggestions} />
              </div>
            </aside>
          </div>
        </div>

        <DialogFooter className="flex-row items-center sm:justify-between gap-1.5 px-6 py-3 border-t border-[hsl(var(--hairline))] shrink-0">
          {/* 좌측 — 글자수·읽기 시간 + 자동 저장 상태 */}
          <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
            {/* 글자수·읽기 시간 — 항상 표시 (한국어 친화: 공백 제외 글자, 250자/분 읽기 속도) */}
            <span className="inline-flex items-center gap-2 text-[10.5px] text-muted-foreground tabular-nums">
              <span>
                {body.replace(/\s+/g, '').length.toLocaleString()}자
              </span>
              <span aria-hidden className="text-muted-foreground/40">·</span>
              <span>
                {(() => {
                  const chars = body.replace(/\s+/g, '').length;
                  const mins = chars > 0 ? Math.max(1, Math.round(chars / 250)) : 0;
                  return mins > 0 ? `${mins}분 읽기` : '—';
                })()}
              </span>
            </span>
            {/* 자동 저장 상태 — create 모드 + draft 있을 때 */}
            {mode.kind === 'create' && draftSavedAt && (
              <div className="inline-flex items-center gap-2 text-[10.5px] text-muted-foreground">
                <span aria-hidden className="text-muted-foreground/40">·</span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" aria-hidden />
                  자동 저장됨
                </span>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="text-muted-foreground/70 hover:text-foreground underline-offset-2 hover:underline"
                >
                  비우기
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
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
