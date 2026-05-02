/**
 * 첫 방문 유저용 온보딩 오버레이 — #7
 *
 * 5스텝 Welcome: 환영 → 모드 → 봇 선택 → ⌘K → 시작
 * - localStorage 'personai-onboarded-v1' 로 1회성 노출.
 * - Esc / 건너뛰기 / 마지막 "시작하기" 로 닫힘.
 * - 전역 오버레이, 다른 UI 위에 떠서 블러 처리.
 */
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Sparkles, MessageCircle, Bot, Command as CommandIcon, Rocket, ChevronLeft, ChevronRight, X,
} from 'lucide-react';

const KEY = 'personai-onboarded-v1';

interface Slide {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  accent: string;
  kbd?: string[];
}

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    title: 'Personai 에 오신 걸 환영해요',
    body: 'GPT · Claude · Gemini · Manus · Genspark · Grok 등 246+ AI 전문가를 한 곳에서. 여러 AI 가 함께 토론하고 상담하는 새로운 방식의 AI 플랫폼.',
    accent: 'from-indigo-500/20 via-sky-500/15 to-emerald-500/10',
  },
  {
    icon: MessageCircle,
    title: '12가지 모드가 있어요',
    body: '일반 · 멀티 · 토론 · 브레인스토밍 · 이해관계자 · 프리미엄 자문 · 심층 리서치 · 어시스턴트 · 번역 · 변환 · 플레이어 · 공부 노트북. 필요한 목적에 맞는 모드를 골라 쓰세요.',
    accent: 'from-violet-500/20 via-indigo-500/15 to-blue-500/10',
  },
  {
    icon: Bot,
    title: 'AI 전문가를 골라보세요',
    body: '좌측 패널에서 봇 카드를 클릭. 여러 개 선택하면 여러 AI 가 동시에 답해요. 각 봇은 능력치·특기가 달라서 질문에 맞게 조합해 쓰면 좋아요.',
    accent: 'from-emerald-500/20 via-teal-500/15 to-cyan-500/10',
  },
  {
    icon: CommandIcon,
    title: '어디서든 ⌘K 로 검색·이동',
    body: '모드 전환, 최근 대화 재개, 복사·다운로드·공유·테마 토글 — 모든 액션을 팔레트 하나에서. 지금 바로 눌러보세요.',
    accent: 'from-amber-500/20 via-orange-500/15 to-rose-500/10',
    kbd: ['⌘', 'K'],
  },
  {
    icon: Rocket,
    title: '준비 완료!',
    body: '질문을 입력하고 엔터를 누르세요. 설정·단축키·백업은 왼쪽 사이드바 아래 톱니바퀴에서. 즐거운 Personai 되세요 ✨',
    accent: 'from-pink-500/20 via-rose-500/15 to-red-500/10',
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let timer: number | undefined;

    try {
      const done = localStorage.getItem(KEY);
      if (!done) {
        timer = window.setTimeout(() => setOpen(true), 1600);
      }
    } catch { /* noop */ }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const close = useCallback(() => {
    try { localStorage.setItem(KEY, '1'); } catch { /* noop */ }
    setOpen(false);
  }, []);

  const next = useCallback(() => {
    if (step < SLIDES.length - 1) setStep(step + 1);
    else close();
  }, [close, step]);

  const prev = useCallback(() => {
    if (step > 0) setStep(step - 1);
  }, [step]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close, next, open, prev]);

  if (!open) return null;
  const slide = SLIDES[step];
  const Icon = slide.icon;
  const isLast = step === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45 backdrop-blur-[3px] animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className="relative w-full max-w-[480px] mx-4 overflow-hidden rounded-[22px] border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 그라데이션 헤더 */}
        <div className={cn('relative h-32 bg-gradient-to-br flex items-center justify-center', slide.accent)}>
          <div className="h-16 w-16 rounded-2xl bg-white/90 dark:bg-slate-900/90 flex items-center justify-center shadow-lg backdrop-blur-sm">
            <Icon className="h-8 w-8 text-slate-700 dark:text-slate-200" strokeWidth={1.6} />
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="온보딩 닫기"
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 본문 */}
        <div className="px-7 pt-6 pb-5">
          <h2 id="onboarding-title" className="font-display text-[20px] font-semibold tracking-[-0.02em] text-foreground">
            {slide.title}
          </h2>
          <p className="mt-2 text-[13px] leading-[1.7] text-muted-foreground">
            {slide.body}
          </p>
          {slide.kbd && (
            <div className="mt-4 flex items-center gap-1.5">
              {slide.kbd.map((k, i) => (
                <kbd key={i} className="rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))] px-2 py-1 font-mono text-[12px] text-foreground">{k}</kbd>
              ))}
              <span className="text-[11.5px] text-muted-foreground ml-1">눌러보세요</span>
            </div>
          )}
        </div>

        {/* 진행 인디케이터 + 버튼 */}
        <div className="flex items-center justify-between px-7 pb-5">
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                aria-label={`슬라이드 ${i + 1}로 이동`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-6 bg-[hsl(var(--primary))]' : 'w-1.5 bg-[hsl(var(--hairline))] hover:bg-slate-300 dark:hover:bg-slate-600',
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {step > 0 && (
              <button
                type="button"
                onClick={prev}
                className="h-9 px-3 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--accent))] transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> 이전
              </button>
            )}
            {!isLast && (
              <button
                type="button"
                onClick={close}
                className="h-9 px-3 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                건너뛰기
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="h-9 px-4 rounded-lg text-[12.5px] font-semibold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity flex items-center gap-1"
            >
              {isLast ? '시작하기' : '다음'}
              {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 설정 등에서 온보딩을 수동으로 다시 열고 싶을 때. */
export function resetOnboarding() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
  window.location.reload();
}
