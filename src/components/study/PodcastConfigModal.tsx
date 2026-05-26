/**
 * PodcastConfigModal — 요청형 단일 입력 UX.
 *  - "무엇을 중심으로 들려드릴까요?" 프롬프트 인풋 하나
 *  - 프리셋 칩 4개 (문구 + 설정 동시 프리필)
 *  - 요약 바: 길이 · 톤 · [바꾸기]
 *  - 푸터 단일 CTA: 입력 유무로 라벨 변형
 *  - Cmd/Ctrl + Enter 제출
 */
import { useEffect, useRef, useState } from 'react';
import { X, Mic, Clock, Volume2, ChevronDown, Sparkles, Target, BookOpen, Zap, Brain, CornerDownLeft } from 'lucide-react';
import type { PodcastLength, PodcastPurpose, PodcastTone } from '@/types/study';
import { cn } from '@/lib/utils';

export interface PodcastConfig {
  name: string;          // 이 모달에선 항상 ''. 사후 rename 으로 처리.
  length: PodcastLength;
  tone: PodcastTone;
  purpose: PodcastPurpose | 'auto';
  focus: string;
}

interface Preset {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** 인풋에 채울 문구 */
  prompt: string;
  /** 함께 적용할 설정 */
  length?: PodcastLength;
  tone?: PodcastTone;
  purpose?: PodcastPurpose;
}

const PRESETS: Preset[] = [
  { id: 'exam',      icon: Target,   label: '시험 대비',         prompt: '시험에 자주 나오는 포인트 위주로', purpose: 'exam',      tone: 'serious' },
  { id: 'overview',  icon: BookOpen, label: '처음 개요',         prompt: '처음 접하는 입장에서 쉽게',         purpose: 'overview',  tone: 'friendly' },
  { id: 'briefing',  icon: Zap,      label: '핵심만 빠르게',     prompt: '3분 안에 요점만',                   purpose: 'briefing',  length: 'short' },
  { id: 'deepdive',  icon: Brain,    label: '깊이 있게',         prompt: '배경·응용·예시까지 깊게',           purpose: 'deep-dive', length: 'long' },
];

const LENGTH_OPTIONS: Array<{ value: PodcastLength; minutes: number; label: string; nuance: string }> = [
  { value: 'short',    minutes: 3,  label: '3분',  nuance: '커피 한잔' },
  { value: 'standard', minutes: 5,  label: '5분',  nuance: '통근길' },
  { value: 'long',     minutes: 10, label: '10분', nuance: '산책' },
];

const TONE_OPTIONS: Array<{ value: PodcastTone; label: string }> = [
  { value: 'friendly', label: '친근' },
  { value: 'serious',  label: '진지' },
  { value: 'lecture',  label: '강의형' },
];

const ADVANCED_STATE_KEY = 'study.podcast.advancedOpen';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function PodcastConfigModal({
  onSubmit, onClose, initial,
}: {
  onSubmit: (cfg: PodcastConfig) => void;
  onClose: () => void;
  initial?: Partial<PodcastConfig>;
}) {
  const [focus, setFocus] = useState<string>(initial?.focus ?? '');
  const [length, setLength] = useState<PodcastLength>(initial?.length ?? 'standard');
  const [tone, setTone] = useState<PodcastTone>(initial?.tone ?? 'friendly');
  const [purpose, setPurpose] = useState<PodcastPurpose | 'auto'>(initial?.purpose ?? 'auto');
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(ADVANCED_STATE_KEY);
      if (v === '1') return true;
      if (v === '0') return false;
    } catch { /* noop */ }
    return !!initial;
  });
  const [flashField, setFlashField] = useState<'length' | 'tone' | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const typingAbortRef = useRef<number | null>(null);

  // 모달 진입 시 인풋 포커스
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // Esc + Cmd/Ctrl+Enter
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
  }, [focus, length, tone, purpose]);

  // 요약 바 펼침 상태 persist
  useEffect(() => {
    try { localStorage.setItem(ADVANCED_STATE_KEY, advancedOpen ? '1' : '0'); } catch { /* noop */ }
  }, [advancedOpen]);

  const flash = (field: 'length' | 'tone') => {
    setFlashField(field);
    window.setTimeout(() => setFlashField(null), 250);
  };

  const submit = () => {
    onSubmit({ name: '', length, tone, purpose, focus: focus.trim() });
  };

  /** 프리셋 클릭: 인풋에 글자를 타이핑하듯 흘리고 설정 동시 적용. */
  const applyPreset = (p: Preset) => {
    // 설정 먼저 반영 + 플래시
    if (p.length && p.length !== length) { setLength(p.length); flash('length'); }
    if (p.tone && p.tone !== tone) { setTone(p.tone); flash('tone'); }
    if (p.purpose) setPurpose(p.purpose);

    // 이전 타이핑 중이면 중단
    if (typingAbortRef.current !== null) {
      window.clearInterval(typingAbortRef.current);
      typingAbortRef.current = null;
    }

    if (prefersReducedMotion()) {
      setFocus(p.prompt);
      inputRef.current?.focus();
      return;
    }

    // 타이핑 애니메이션 (글자 단위 약 15ms)
    let i = 0;
    setFocus('');
    inputRef.current?.focus();
    const handle = window.setInterval(() => {
      i += 1;
      if (i >= p.prompt.length) {
        setFocus(p.prompt);
        window.clearInterval(handle);
        typingAbortRef.current = null;
        return;
      }
      setFocus(p.prompt.slice(0, i));
    }, 15);
    typingAbortRef.current = handle;
  };

  const hasInput = focus.trim().length > 0;
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
        aria-label="팟캐스트 만들기"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-indigo-600" />
            <h3 className="text-[14px] font-bold text-slate-900 dark:text-slate-100">팟캐스트 만들기</h3>
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
              무엇을 중심으로 들려드릴까요?
            </label>
            <div className="relative">
              <textarea
                ref={inputRef}
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                rows={3}
                placeholder="비워두면 자료에 맞춰 알아서 준비해요"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-[13px] leading-relaxed outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 resize-none placeholder:text-slate-400"
                aria-label="팟캐스트 방향 입력"
              />
              {hasInput && (
                <button
                  onClick={() => { setFocus(''); inputRef.current?.focus(); }}
                  className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700"
                  aria-label="입력 지우기"
                  title="입력 지우기"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 프리셋 칩 */}
          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p)}
                  className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30 hover:border-indigo-300 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20 px-3 py-2 text-left transition-colors"
                  aria-label={`${p.label} — 이 문구와 설정을 모두 적용`}
                  title={p.prompt}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-indigo-500 group-hover:border-indigo-300">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">{p.label}</div>
                    <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">{p.prompt}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 요약 바 */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setAdvancedOpen((v) => !v)}
              className="w-full flex items-center gap-3 py-1 text-[11.5px] text-slate-600 dark:text-slate-300 hover:text-slate-900"
              aria-expanded={advancedOpen}
              aria-controls="podcast-advanced"
            >
              <span className={cn(
                'inline-flex items-center gap-1 transition-colors',
                flashField === 'length' && 'text-indigo-600 font-semibold',
              )}>
                <Clock className="h-3 w-3" />
                <span className="tabular-nums">{LENGTH_OPTIONS.find((l) => l.value === length)?.minutes}분</span>
              </span>
              <span className="text-slate-300">·</span>
              <span className={cn(
                'inline-flex items-center gap-1 transition-colors',
                flashField === 'tone' && 'text-indigo-600 font-semibold',
              )}>
                <Volume2 className="h-3 w-3" />
                <span>{TONE_OPTIONS.find((t) => t.value === tone)?.label}</span>
              </span>
              <span className="ml-auto inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
                {advancedOpen ? '접기' : '바꾸기'}
                <ChevronDown className={cn('h-3 w-3 transition-transform', advancedOpen && 'rotate-180')} />
              </span>
            </button>

            {/* aria-live: 스크린 리더가 변경 읽어줌 */}
            <span className="sr-only" aria-live="polite">
              길이 {LENGTH_OPTIONS.find((l) => l.value === length)?.minutes}분,
              톤 {TONE_OPTIONS.find((t) => t.value === tone)?.label}
            </span>

            {advancedOpen && (
              <div id="podcast-advanced" className="mt-2 space-y-3 rounded-lg bg-slate-50/60 dark:bg-slate-800/30 px-3 py-3">
                {/* 길이 */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span className="text-[10.5px] uppercase tracking-wide text-slate-400 font-semibold">길이</span>
                  </div>
                  <div className="flex gap-1.5">
                    {LENGTH_OPTIONS.map((l) => {
                      const active = length === l.value;
                      return (
                        <button
                          key={l.value}
                          onClick={() => setLength(l.value)}
                          className={cn(
                            'flex-1 rounded-lg border px-2 py-1.5 text-left transition-colors',
                            active
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300',
                          )}
                          aria-pressed={active}
                        >
                          <div className="text-[11.5px] font-semibold tabular-nums">{l.label}</div>
                          <div className={cn('text-[9.5px]', active ? 'text-indigo-100' : 'text-slate-400')}>{l.nuance}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 톤 */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Volume2 className="h-3 w-3 text-slate-400" />
                    <span className="text-[10.5px] uppercase tracking-wide text-slate-400 font-semibold">톤</span>
                  </div>
                  <div className="flex gap-1.5">
                    {TONE_OPTIONS.map((t) => {
                      const active = tone === t.value;
                      return (
                        <button
                          key={t.value}
                          onClick={() => setTone(t.value)}
                          className={cn(
                            'flex-1 rounded-lg border px-2 py-1.5 text-[11.5px] font-semibold transition-colors',
                            active
                              ? 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300',
                          )}
                          aria-pressed={active}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
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
            {hasInput ? <Sparkles className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            <span>{submitLabel}</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded bg-white/15 dark:bg-slate-900/15 px-1 py-0.5 text-[9.5px] font-mono opacity-75">
              <CornerDownLeft className="h-2.5 w-2.5" />
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
