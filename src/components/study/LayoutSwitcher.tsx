import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, LayoutGrid, Pencil, Plus, X } from 'lucide-react';
import type { StudyLayoutMode, StudyLayoutPrefs, StudyPaneKind } from '@/types/study';
import { PANE_META } from '@/types/study';
import { cn } from '@/lib/utils';

interface Props {
  prefs: StudyLayoutPrefs;
  onModeChange: (mode: StudyLayoutMode) => void;
  onSlotChange: (index: number, kind: StudyPaneKind) => void;
  onSetWeights?: (weights: number[]) => void;
  /** @deprecated */
  onToggleLock?: () => void;
  /** @deprecated */
  onResetWeights?: () => void;
}

interface Preset {
  id: string;
  label: string;
  hint: string;
  mode: StudyLayoutMode;
  slots: StudyPaneKind[];
  weights?: number[];
}

// 2칸·3칸 프리셋 5개 — 중복 허용 구성 포함
const PRESETS: Preset[] = [
  { id: 'study', label: '공부', hint: '원본 + 대화', mode: 2, slots: ['sources', 'chat'] },
  { id: 'create', label: '창작', hint: '원본 + 스튜디오', mode: 2, slots: ['sources', 'studio'] },
  { id: 'workbench', label: '작업', hint: '대화 + 스튜디오', mode: 2, slots: ['chat', 'studio'] },
  { id: 'all', label: '전체', hint: '세 패널 모두', mode: 3, slots: ['sources', 'chat', 'studio'] },
  { id: 'compare', label: '비교', hint: '원본 + 스튜디오 둘', mode: 3, slots: ['sources', 'studio', 'studio'] },
];

const FLOW_PRESETS: Preset[] = [
  { id: 'read', label: '읽기', hint: '원본 크게 + 대화', mode: 2, slots: ['sources', 'chat'], weights: [48, 52] },
  { id: 'ask', label: '질문', hint: '대화 크게 + 원본', mode: 2, slots: ['chat', 'sources'], weights: [58, 42] },
  { id: 'make', label: '만들기', hint: '원본 + 스튜디오', mode: 2, slots: ['sources', 'studio'], weights: [54, 46] },
  { id: 'workbench', label: '작업', hint: '대화 + 스튜디오', mode: 2, slots: ['chat', 'studio'], weights: [50, 50] },
  { id: 'all', label: '전체', hint: '원본 · 대화 · 스튜디오', mode: 3, slots: ['sources', 'chat', 'studio'], weights: [30, 42, 28] },
  { id: 'focus', label: '집중', hint: '대화만 보기', mode: 1, slots: ['chat'], weights: [100] },
];

const DEFAULT_WEIGHTS: Record<StudyLayoutMode, number[]> = {
  1: [100],
  2: [48, 52],
  3: [30, 42, 28],
};

const PANE_FILL: Record<StudyPaneKind, string> = {
  sources: 'bg-slate-300 dark:bg-slate-600',
  chat: 'bg-indigo-400 dark:bg-indigo-500',
  studio: 'bg-amber-300 dark:bg-amber-500',
};

const ALL_KINDS: StudyPaneKind[] = ['sources', 'chat', 'studio'];

const CUSTOM_KEY = 'study_layout_custom_v1';

interface CustomLayout {
  mode: StudyLayoutMode;
  slots: StudyPaneKind[];
  weights?: number[];
}

function loadCustom(): CustomLayout | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.slots)) return null;
    return parsed as CustomLayout;
  } catch { return null; }
}

function persistCustom(v: CustomLayout | null) {
  try {
    if (v) localStorage.setItem(CUSTOM_KEY, JSON.stringify(v));
    else localStorage.removeItem(CUSTOM_KEY);
  } catch { /* noop */ }
}

function sameWeights(a: number[] | undefined, b: number[] | undefined) {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((value, index) => Math.abs(value - b[index]) < 0.001);
}

export function LayoutSwitcher({ prefs, onModeChange, onSlotChange, onSetWeights }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'presets' | 'editor'>('presets');
  const [custom, setCustom] = useState<CustomLayout | null>(() => loadCustom());
  const [draft, setDraft] = useState<{ mode: 2 | 3; slots: StudyPaneKind[] }>({ mode: 2, slots: ['sources', 'chat'] });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // composedPath()로 이벤트 디스패치 시점의 경로를 잡음 → 클릭 직후 React가
    // 재렌더해 타겟이 DOM에서 떨어져도 안전하게 "내부 클릭" 판별 가능.
    const h = (e: MouseEvent) => {
      const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
      if (ref.current && !path.includes(ref.current)) setOpen(false);
    };
    setTimeout(() => window.addEventListener('mousedown', h), 0);
    return () => window.removeEventListener('mousedown', h);
  }, [open]);

  // 닫힐 때 뷰 초기화
  useEffect(() => { if (!open) setView('presets'); }, [open]);

  const currentPreset = FLOW_PRESETS.find((p) =>
    p.mode === prefs.mode && p.slots.length === prefs.slots.length && p.slots.every((s, i) => s === prefs.slots[i])
  );

  const isCustomActive = useMemo(() => {
    if (!custom) return false;
    if (custom.mode !== prefs.mode) return false;
    if (custom.slots.length !== prefs.slots.length) return false;
    if (!custom.slots.every((s, i) => s === prefs.slots[i])) return false;
    if (custom.weights && !sameWeights(custom.weights, prefs.weights)) return false;
    return true;
  }, [custom, prefs]);

  const currentLabel = isCustomActive ? '커스텀' : (currentPreset?.label ?? '사용자 설정');
  const currentLayoutSummary = prefs.slots.map((slot) => PANE_META[slot].label).join(' · ');

  const applyPreset = (p: Preset) => {
    onModeChange(p.mode);
    setTimeout(() => {
      p.slots.forEach((kind, i) => {
        if (prefs.slots[i] !== kind) onSlotChange(i, kind);
      });
      if (p.weights && onSetWeights) onSetWeights(p.weights);
    }, 0);
    setOpen(false);
  };

  const applyCustom = () => {
    if (!custom) return;
    onModeChange(custom.mode);
    setTimeout(() => {
      custom.slots.forEach((kind, i) => {
        if (prefs.slots[i] !== kind) onSlotChange(i, kind);
      });
      if (custom.weights && onSetWeights) onSetWeights(custom.weights);
    }, 0);
    setOpen(false);
  };

  const clearCustom = () => {
    persistCustom(null);
    setCustom(null);
  };

  const openEditor = () => {
    if (custom) {
      setDraft({
        mode: (custom.mode === 3 ? 3 : 2) as 2 | 3,
        slots: custom.slots.slice() as StudyPaneKind[],
      });
    } else {
      const m = prefs.mode === 3 ? 3 : 2;
      const slots = prefs.slots.slice(0, m) as StudyPaneKind[];
      while (slots.length < m) {
        const next = ALL_KINDS.find((k) => !slots.includes(k)) ?? ALL_KINDS[0];
        slots.push(next);
      }
      setDraft({ mode: m as 2 | 3, slots });
    }
    setView('editor');
  };

  const setDraftMode = (m: 2 | 3) => {
    setDraft((d) => {
      let slots = d.slots.slice();
      if (slots.length > m) slots = slots.slice(0, m);
      while (slots.length < m) {
        const next = ALL_KINDS.find((k) => !slots.includes(k)) ?? ALL_KINDS[0];
        slots.push(next);
      }
      return { mode: m, slots };
    });
  };

  const setDraftSlot = (index: number, kind: StudyPaneKind) => {
    setDraft((d) => {
      const slots = d.slots.slice();
      slots[index] = kind; // 중복 허용
      return { ...d, slots };
    });
  };

  const saveDraft = () => {
    const keepsCurrentWidths = draft.mode === prefs.mode
      && draft.slots.length === prefs.slots.length
      && draft.slots.every((kind, i) => kind === prefs.slots[i])
      && prefs.weights?.length === draft.mode;
    const v: CustomLayout = {
      mode: draft.mode,
      slots: draft.slots.slice(),
      weights: keepsCurrentWidths ? prefs.weights!.slice() : DEFAULT_WEIGHTS[draft.mode].slice(),
    };
    persistCustom(v);
    setCustom(v);
    onModeChange(v.mode);
    setTimeout(() => {
      v.slots.forEach((kind, i) => {
        if (prefs.slots[i] !== kind) onSlotChange(i, kind);
      });
      if (onSetWeights) onSetWeights(v.weights ?? DEFAULT_WEIGHTS[v.mode]);
    }, 0);
    setView('presets');
    setOpen(false);
  };

  return (
    <div className="relative hidden xl:block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-9 min-w-[150px] items-center gap-2 rounded-xl border px-2.5 text-left text-[11.5px] font-semibold shadow-sm transition-colors',
          open
            ? 'border-indigo-200 bg-indigo-50 text-slate-900 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-slate-100'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        title="레이아웃 설정"
      >
        <InlineLayoutBars slots={prefs.slots} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11.5px] leading-tight">레이아웃 · {currentLabel}</span>
          <span className="block truncate text-[10px] leading-tight text-slate-400 dark:text-slate-500">{currentLayoutSummary}</span>
        </span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 top-full w-[420px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900 z-40" role="menu">
          {view === 'presets' ? (
            <div>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">작업 흐름 선택</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{currentLayoutSummary}</p>
                </div>
                <LayoutGrid className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FLOW_PRESETS.map((p) => {
                  const active = !isCustomActive && currentPreset?.id === p.id;
                  return (
                    <PresetCard
                      key={p.id}
                      label={p.label}
                      hint={p.hint}
                      slots={p.slots}
                      active={active}
                      onClick={() => applyPreset(p)}
                    />
                  );
                })}

                <CustomCard
                  saved={custom}
                  active={isCustomActive}
                  onApply={applyCustom}
                  onEdit={openEditor}
                  onClear={clearCustom}
                />
              </div>
            </div>
          ) : (
            <EditorView
              draft={draft}
              onBack={() => setView('presets')}
              onModeChange={setDraftMode}
              onSlotChange={setDraftSlot}
              onSave={saveDraft}
            />
          )}
        </div>
      )}
    </div>
  );
}

function PresetCard({
  label, hint, slots, active, onClick,
}: { label: string; hint: string; slots: StudyPaneKind[]; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex min-h-[94px] flex-col items-start gap-2 rounded-xl border p-2.5 text-left transition-colors',
        active
          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 ring-1 ring-indigo-300'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40',
      )}
      title={hint}
    >
      <PresetMiniature slots={slots} active={active} />
      <div className="w-full">
        <p className={cn('text-[12px] font-semibold', active ? 'text-indigo-700 dark:text-indigo-200' : 'text-slate-900 dark:text-slate-100')}>
          {label}
        </p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate">
          {hint}
        </p>
      </div>
    </button>
  );
}

function CustomCard({
  saved, active, onApply, onEdit, onClear,
}: {
  saved: CustomLayout | null;
  active: boolean;
  onApply: () => void;
  onEdit: () => void;
  onClear: () => void;
}) {
  if (!saved) {
    return (
      <button
        onClick={onEdit}
        className="flex min-h-[94px] flex-col items-start gap-2 rounded-xl border border-dashed border-slate-300 p-2.5 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50/40 dark:border-slate-600 dark:hover:bg-indigo-950/20"
        title="커스텀 배치 만들기"
      >
        <div className="w-full aspect-[16/9] rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
          <Plus className="h-5 w-5 text-slate-400" />
        </div>
        <div className="w-full">
          <p className="text-[12px] font-semibold text-slate-900 dark:text-slate-100">커스텀</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate">내 배치 만들기</p>
        </div>
      </button>
    );
  }
  return (
    <div className="relative group">
      <button
        onClick={onApply}
        className={cn(
          'flex min-h-[94px] w-full flex-col items-start gap-2 rounded-xl border p-2.5 text-left transition-colors',
          active
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 ring-1 ring-indigo-300'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40',
        )}
        title={active ? '현재 적용 중' : '커스텀 배치로 전환'}
      >
        <PresetMiniature slots={saved.slots} active={active} />
        <div className="w-full">
          <p className={cn('text-[12px] font-semibold', active ? 'text-indigo-700 dark:text-indigo-200' : 'text-slate-900 dark:text-slate-100')}>
            커스텀
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate">
            {active ? '현재 배치' : '저장된 내 배치'}
          </p>
        </div>
      </button>
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="h-5 w-5 flex items-center justify-center rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-indigo-50 text-slate-500 hover:text-indigo-600"
          title="편집"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="h-5 w-5 flex items-center justify-center rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-red-50 text-slate-500 hover:text-red-600"
          title="삭제"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function EditorView({
  draft, onBack, onModeChange, onSlotChange, onSave,
}: {
  draft: { mode: 2 | 3; slots: StudyPaneKind[] };
  onBack: () => void;
  onModeChange: (m: 2 | 3) => void;
  onSlotChange: (index: number, kind: StudyPaneKind) => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          aria-label="뒤로"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <p className="text-[12px] font-bold text-slate-900 dark:text-slate-100">커스텀 배치</p>
      </div>

      {/* 미리보기 */}
      <PresetMiniature slots={draft.slots} active={false} />

      {/* 칸 수 */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">칸 수</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[2, 3].map((m) => {
            const active = draft.mode === m;
            return (
              <button
                key={m}
                onClick={() => onModeChange(m as 2 | 3)}
                className={cn(
                  'rounded-md py-1.5 text-[12px] font-semibold transition-colors',
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
                )}
              >
                {m}칸
              </button>
            );
          })}
        </div>
      </div>

      {/* 슬롯 배치 */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">슬롯 배치</p>
        <div className="space-y-1">
          {draft.slots.map((kind, i) => (
            <SlotRow
              key={i}
              index={i}
              current={kind}
              onPick={(k) => onSlotChange(i, k)}
            />
          ))}
        </div>
      </div>

      {/* 액션 */}
      <div className="flex gap-1.5 pt-1">
        <button
          onClick={onBack}
          className="flex-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 text-[12px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          취소
        </button>
        <button
          onClick={onSave}
          className="flex-1 rounded-md bg-indigo-600 text-white px-3 py-1.5 text-[12px] font-semibold hover:bg-indigo-500"
        >
          저장하고 적용
        </button>
      </div>
    </div>
  );
}

function SlotRow({
  index, current, onPick,
}: { index: number; current: StudyPaneKind; onPick: (k: StudyPaneKind) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-bold text-slate-400 w-4">{index + 1}</span>
      <div className="flex-1 grid grid-cols-3 gap-1">
        {ALL_KINDS.map((k) => {
          const active = k === current;
          return (
            <button
              key={k}
              onClick={() => onPick(k)}
              className={cn(
                'rounded-md px-1.5 py-1 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1',
                active
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
              )}
            >
              <span className={cn('h-2 w-2 rounded-sm', PANE_FILL[k])} aria-hidden />
              {PANE_META[k].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PresetMiniature({ slots, active }: { slots: StudyPaneKind[]; active: boolean }) {
  return (
    <div className={cn('w-full aspect-[16/9] rounded-md flex gap-0.5 p-1 border',
      active ? 'bg-white dark:bg-slate-900 border-indigo-200' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
    )}>
      {slots.map((kind, i) => (
        <div
          key={i}
          className={cn('h-full rounded-sm', PANE_FILL[kind])}
          style={{ flex: 1 }}
          aria-hidden
        />
      ))}
    </div>
  );
}

function InlineLayoutBars({ slots }: { slots: StudyPaneKind[] }) {
  return (
    <span className="flex h-5 w-8 shrink-0 items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800/60" aria-hidden>
      {slots.map((kind, index) => (
        <span key={`${kind}-${index}`} className={cn('h-full min-w-0 flex-1 rounded-[2px]', PANE_FILL[kind])} />
      ))}
    </span>
  );
}
