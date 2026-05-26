/**
 * DiagramConfigModal — 단일 입력 + 자동 개념 추천 + 유형 숨김
 *  - 입력 포커스 + 자료 기반 추천 칩 (API diagram-suggest)
 *  - "유형 직접 고르기" 접힘 섹션 (기본 자동)
 *  - Cmd/Ctrl + Enter 제출
 *  - 푸터 단일 CTA (입력 유무로 라벨 변형)
 */
import { useEffect, useRef, useState } from 'react';
import {
  X, BarChart3, Sparkles, ChevronDown, CornerDownLeft, Workflow, CalendarDays,
  Scale, Link2, Network, ArrowRightLeft,
} from 'lucide-react';
import type { DiagramKind, DiagramConceptSuggestion } from '@/types/study';
import { DIAGRAM_KIND_META } from '@/types/study';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export interface DiagramConfig {
  concept: string;
  kind: DiagramKind | 'auto';
  focus: string;
}

interface Props {
  sources: Array<{ title: string; content: string }>;
  initial?: Partial<DiagramConfig>;
  onSubmit: (cfg: DiagramConfig) => void;
  onClose: () => void;
}

const ADVANCED_KEY = 'study.diagram.advancedOpen';

function DiagramKindIcon({ kind, className }: { kind: DiagramKind | 'auto'; className?: string }) {
  const Icon = kind === 'auto'
    ? Sparkles
    : kind === 'flowchart'
      ? Workflow
      : kind === 'timeline'
        ? CalendarDays
        : kind === 'comparison'
          ? Scale
          : kind === 'cause'
            ? Link2
            : kind === 'sequence'
              ? ArrowRightLeft
              : Network;
  return <Icon className={cn('h-3.5 w-3.5', className)} strokeWidth={1.9} />;
}

export function DiagramConfigModal({ sources, initial, onSubmit, onClose }: Props) {
  const [concept, setConcept] = useState<string>(initial?.concept ?? '');
  const [kind, setKind] = useState<DiagramKind | 'auto'>(initial?.kind ?? 'auto');
  const [focus, setFocus] = useState<string>(initial?.focus ?? '');
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(ADVANCED_KEY) === '1'; } catch { return false; }
  });
  const [suggestions, setSuggestions] = useState<DiagramConceptSuggestion[] | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // 추천 개념 불러오기 (마운트 1회, 편집 모드가 아닐 때만)
  useEffect(() => {
    if (initial?.concept || sources.length === 0) return;
    let cancelled = false;
    setSuggestLoading(true);
    (async () => {
      try {
        const r = await fetch('/api/study-generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lens: 'diagram-suggest', sources, tone: 'student', level: 'standard', options: {} }),
        });
        const data = await r.json();
        if (cancelled) return;
        const s = data?.structured?.suggestions;
        if (Array.isArray(s) && s.length > 0) {
          setSuggestions(s.slice(0, 4));
        }
      } catch { /* noop */ }
      finally { if (!cancelled) setSuggestLoading(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 단축키
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concept, kind, focus]);

  useEffect(() => {
    try { localStorage.setItem(ADVANCED_KEY, advancedOpen ? '1' : '0'); } catch { /* noop */ }
  }, [advancedOpen]);

  const submit = () => {
    if (sources.length === 0) {
      toast({ title: '원본 자료가 필요해요', description: '먼저 자료를 하나 이상 추가하고 활성화해 주세요.' });
      return;
    }
    onSubmit({ concept: concept.trim(), kind, focus: focus.trim() });
  };

  const applySuggestion = (s: DiagramConceptSuggestion) => {
    setConcept(s.concept);
    if (s.kind) setKind(s.kind);
    inputRef.current?.focus();
  };

  const hasInput = concept.trim().length > 0;
  const submitLabel = hasInput ? '이대로 만들기' : '알아서 만들기';

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="도식 만들기"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            <h3 className="text-[14px] font-bold text-slate-900 dark:text-slate-100">도식 만들기</h3>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 본문 */}
        <div className="px-5 pt-4 pb-3 space-y-4">
          {/* 인풋 */}
          <div>
            <label className="block text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-2">
              무엇을 그려드릴까요?
            </label>
            <div className="relative">
              <textarea
                ref={inputRef}
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                rows={3}
                placeholder="비워두면 자료에서 추천해 드려요"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-[13px] leading-relaxed outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 resize-none placeholder:text-slate-400"
                aria-label="도식으로 그릴 개념"
              />
              {hasInput && (
                <button
                  onClick={() => { setConcept(''); inputRef.current?.focus(); }}
                  className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700"
                  aria-label="입력 지우기"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 자료 기반 추천 칩 */}
          {(suggestLoading || (suggestions && suggestions.length > 0)) && (
            <div>
              <p className="text-[10.5px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5 inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-indigo-400" /> 자료에서 그리기 좋은 개념
              </p>
              {suggestLoading ? (
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-8 flex-1 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {suggestions!.map((s, i) => {
                    const meta = DIAGRAM_KIND_META[s.kind];
                    return (
                      <button
                        key={i}
                        onClick={() => applySuggestion(s)}
                        className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30 hover:border-indigo-300 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 px-2.5 py-2 text-left transition-colors"
                        title={s.reason}
                      >
                        <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white dark:bg-slate-900 text-indigo-600 border border-slate-200 dark:border-slate-700">
                          <DiagramKindIcon kind={s.kind} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-200 truncate">{s.concept}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{meta?.label ?? s.kind}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 유형 직접 고르기 (접힘) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setAdvancedOpen((v) => !v)}
              className="w-full flex items-center gap-2 py-1 text-[11.5px] text-slate-600 dark:text-slate-300 hover:text-slate-900"
              aria-expanded={advancedOpen}
            >
              <span className="inline-flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                <span>{kind === 'auto' ? '자동' : DIAGRAM_KIND_META[kind].label}</span>
              </span>
              <span className="ml-auto inline-flex items-center gap-1 font-semibold text-slate-500">
                {advancedOpen ? '접기' : '유형 직접 고르기'}
                <ChevronDown className={cn('h-3 w-3 transition-transform', advancedOpen && 'rotate-180')} />
              </span>
            </button>

            {advancedOpen && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {(['auto', 'flowchart', 'timeline', 'comparison', 'cause', 'tree', 'sequence'] as const).map((k) => {
                  const active = kind === k;
                  const meta = k === 'auto' ? null : DIAGRAM_KIND_META[k];
                  return (
                    <button
                      key={k}
                      onClick={() => setKind(k)}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-left transition-colors',
                        active
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300',
                      )}
                    >
                      <div className={cn('text-[11.5px] font-semibold inline-flex items-center gap-1', active ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200')}>
                        <DiagramKindIcon kind={k} className="h-3 w-3" />
                        <span>{meta ? meta.label : '자동'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {meta ? meta.example : '자료에 맞춰'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 집중 범위 */}
          <div>
            <label className="text-[10.5px] uppercase tracking-wide text-slate-400 font-semibold">집중 범위 <span className="normal-case font-normal text-slate-400">(선택)</span></label>
            <textarea
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder='예: "3장만" / "핵심 단계만"'
              rows={1}
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[12px] outline-none focus:border-indigo-400 resize-none"
            />
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-[12px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            취소
          </button>
          <button
            onClick={submit}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-[12.5px] font-semibold hover:bg-slate-800 dark:hover:bg-white"
            title="Ctrl/Cmd + Enter"
          >
            {hasInput ? <Sparkles className="h-3.5 w-3.5" /> : <BarChart3 className="h-3.5 w-3.5" />}
            <span>{submitLabel}</span>
            <kbd className="hidden sm:inline-flex items-center rounded bg-white/15 dark:bg-slate-900/15 px-1 py-0.5 text-[9.5px] font-mono opacity-75">
              <CornerDownLeft className="h-2.5 w-2.5" />
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
