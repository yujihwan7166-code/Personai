/**
 * 멘탈 테스트 모음 — "멘탈 테스트" 그룹 서브 뷰의 "심리 테스트 모음 →" 클릭 시 등장.
 * LifeToolBrowserModal 풀뷰포트 패턴 재사용하되, 도구 카드 대신 "퀴즈 카드" 스타일로 변형.
 * 카테고리별 섹션 분리: 🔥 지금 핫한 / 🎭 성격·유형 / 💕 연애·관계 / 💼 직업·재능 / 🌱 자기이해
 */
import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Clock, ListChecks, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  MENTAL_TESTS,
  MENTAL_TEST_CATEGORIES,
  type MentalTest,
  type MentalTestCategory,
} from '@/data/mentalTests';

interface MentalTestBrowserModalProps {
  open: boolean;
  onClose: () => void;
  onSelectTest?: (testId: string) => void;
}

export function MentalTestBrowserModal({ open, onClose, onSelectTest }: MentalTestBrowserModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // 카테고리별로 나누기 — 한 번 계산해 섹션 렌더에 사용
  const byCategory = useMemo(() => {
    const map: Record<MentalTestCategory, MentalTest[]> = {
      trending: [], personality: [], relationship: [], career: [], selfcare: [],
    };
    MENTAL_TESTS.forEach((t) => { map[t.category].push(t); });
    return map;
  }, []);

  const handleSelect = (test: MentalTest) => {
    if (test.comingSoon) return; // "곧 출시"는 클릭 무시
    onClose();
    setTimeout(() => onSelectTest?.(test.id), 40);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="mental-test-browser"
          className="fixed inset-0 z-[200] bg-[hsl(var(--background))] overflow-y-auto"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          role="region"
          aria-label="심리 테스트 모음"
        >
          {/* 상단 헤더 */}
          <div className="sticky top-0 z-10 border-b border-[hsl(var(--hairline))] bg-[hsl(var(--background))]/90 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-6 md:px-8 py-3 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--accent))] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>돌아가기</span>
              </button>
              <div className="h-4 w-px bg-[hsl(var(--hairline))]" />
              <div className="min-w-0">
                <h1 className="text-[14px] font-semibold tracking-tight leading-none">심리 테스트 모음</h1>
                <p className="text-[11px] text-muted-foreground mt-1">
                  재미로 보는 수많은 심리 테스트 · 총 {MENTAL_TESTS.length}개
                </p>
              </div>
            </div>
          </div>

          {/* 본문 */}
          <div className="max-w-6xl mx-auto px-6 md:px-8 pt-8 pb-20">
            {/* 에디토리얼 헤더 */}
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground mb-2">
                <span className="inline-block h-px w-6 bg-[hsl(var(--hairline))]" />
                Personai Mental Tests
                <span className="inline-block h-px w-6 bg-[hsl(var(--hairline))]" />
              </div>
              <h2 className="font-display font-semibold text-[22px] md:text-[26px] tracking-[-0.02em] leading-tight text-foreground">
                나를 알아가는 수십 가지 테스트
              </h2>
              <p className="mt-1.5 text-[12.5px] text-muted-foreground max-w-[520px] mx-auto leading-snug">
                트렌디한 밈부터 심리학 표준 검사까지 — 재미로 가볍게, 때로 진지하게
              </p>
            </div>

            {/* 카테고리별 섹션 */}
            <div className="space-y-10">
              {MENTAL_TEST_CATEGORIES.map((cat) => {
                const tests = byCategory[cat.id];
                if (tests.length === 0) return null;
                return (
                  <section key={cat.id}>
                    <div className="mb-3 flex items-baseline gap-2 px-1">
                      <span className="text-[16px]" aria-hidden="true">{cat.emoji}</span>
                      <h3 className="text-[15px] font-bold tracking-tight text-foreground">{cat.label}</h3>
                      <span className="text-[11px] text-muted-foreground truncate">· {cat.description}</span>
                      <span className="text-[10.5px] tabular-nums text-muted-foreground/70 ml-auto">{tests.length}개</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {tests.map((test) => (
                        <TestCard key={test.id} test={test} onSelect={() => handleSelect(test)} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            {/* 확장 예고 */}
            <div className="mt-12 rounded-2xl border border-dashed border-[hsl(var(--hairline))] px-5 py-5 text-center">
              <p className="text-[12px] text-muted-foreground">
                ✨ 매주 새 테스트 추가 예정 · 원하는 테스트 추천해주세요
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** 개별 테스트 카드 — 제목·설명·소요시간·문항수·시작 버튼. */
function TestCard({ test, onSelect }: { test: MentalTest; onSelect: () => void }) {
  const disabled = test.comingSoon === true;
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-label={`${test.label}${disabled ? ' (준비 중)' : ' 시작'}`}
      className={cn(
        'group relative text-left rounded-2xl border p-4 transition-all duration-200',
        'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
        !disabled && 'hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md hover:-translate-y-0.5',
        disabled && 'opacity-60 cursor-not-allowed',
      )}
    >
      {/* 뱃지: 트렌딩 / 준비 중 */}
      <div className="absolute top-3 right-3 flex gap-1">
        {test.trending && !disabled && (
          <span className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded-full text-[9.5px] font-semibold bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300">
            <Sparkles className="h-2.5 w-2.5" />
            HOT
          </span>
        )}
        {disabled && (
          <span className="inline-flex items-center h-5 px-1.5 rounded-full text-[9.5px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            곧 출시
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-2.5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[22px] shrink-0 transition-transform duration-200 group-hover:scale-105"
          style={{ backgroundColor: `color-mix(in oklab, ${test.tint} 14%, transparent)` }}
        >
          <span className="select-none leading-none" aria-hidden="true">{test.emoji}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold leading-tight truncate text-slate-800 dark:text-slate-100">
            {test.label}
          </p>
        </div>
      </div>

      <p className="text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2 mb-2.5 min-h-[32px]">
        {test.description}
      </p>

      <div className="flex items-center gap-3 text-[10.5px] text-slate-500 dark:text-slate-400 tabular-nums">
        {test.durationMin > 0 && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {test.durationMin}분
          </span>
        )}
        {test.questionCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <ListChecks className="h-3 w-3" />
            {test.questionCount}문항
          </span>
        )}
      </div>
    </button>
  );
}
