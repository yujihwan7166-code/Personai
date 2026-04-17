import { useMemo, useState } from 'react';
import type { AgentState, AgentTask } from '@/utils/agent/types';
import { getAgentLabel } from '@/utils/agent/agentDisplay';
import { getQuestionPatternMeta, type QuestionPatternVisual } from '@/utils/agent/questionPatternMeta';
import { cn } from '@/lib/utils';

interface AgentTaskStreamProps {
  state: AgentState;
}

function StatusIcon({ status }: { status: AgentTask['status'] | 'analyzing' | 'planning' | 'synthesizing' | 'reviewing' }) {
  if (status === 'running' || status === 'analyzing' || status === 'planning' || status === 'synthesizing' || status === 'reviewing') {
    return (
      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
        <span className="absolute h-3 w-3 rounded-full bg-primary/15 animate-ping" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
      </span>
    );
  }

  if (status === 'done') {
    return (
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-50">
        <svg className="h-2.5 w-2.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-50">
        <svg className="h-2.5 w-2.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    );
  }

  return (
    <span className="flex h-3.5 w-3.5 items-center justify-center">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
    </span>
  );
}

function Dots() {
  return <span className="animate-ellipsis ml-0.5 tracking-wider" />;
}

function noteFor(task: AgentTask) {
  return task.publicNote || '분석 중 확인한 핵심 근거를 최종 응답에 반영했습니다.';
}

function clampIndex(index: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(Math.max(index, 0), max - 1);
}

function PatternStepRail({
  steps,
  currentIndex,
  complete,
}: {
  steps: string[];
  currentIndex: number;
  complete?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      {steps.map((step, index) => {
        const isDone = complete || index < currentIndex;
        const isCurrent = !complete && index === currentIndex;
        return (
          <div key={`${step}-${index}`} className="flex items-start gap-2.5">
            <StatusIcon status={isDone ? 'done' : isCurrent ? 'planning' : 'pending'} />
            <div className="min-w-0">
              <div className={cn(
                'text-[11px] font-medium leading-relaxed',
                isCurrent ? 'text-slate-700' : isDone ? 'text-slate-500' : 'text-slate-300',
              )}>
                {step}
                {isCurrent && <Dots />}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PatternPulse({ steps, currentIndex, complete }: { steps: string[]; currentIndex: number; complete?: boolean }) {
  return (
    <div className="mb-4">
      <div className="grid grid-cols-3 gap-2">
        {steps.map((step, index) => {
          const active = complete || index <= currentIndex;
          return (
            <div key={`${step}-${index}`} className="space-y-1.5">
              <div className={cn(
                'h-1.5 rounded-full transition-colors',
                active ? 'bg-primary/70' : 'bg-slate-200',
              )} />
              <div className={cn(
                'text-[10px] leading-snug',
                index === currentIndex && !complete ? 'text-slate-700 font-medium' : active ? 'text-slate-500' : 'text-slate-300',
              )}>
                {step}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PatternConcept({ focus, steps, currentIndex, complete }: { focus?: string; steps: string[]; currentIndex: number; complete?: boolean }) {
  return (
    <div className="mb-4 space-y-3">
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3">
        <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Focus</div>
        <div className="mt-1 text-[13px] font-semibold text-slate-700">{focus || '핵심 쟁점'}</div>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {steps.map((step, index) => {
          const active = complete || index <= currentIndex;
          return (
            <div
              key={`${step}-${index}`}
              className={cn(
                'rounded-2xl border px-3 py-2.5 transition-all',
                active ? 'border-primary/25 bg-primary/[0.05]' : 'border-slate-200 bg-white/70',
                index === currentIndex && !complete && 'shadow-[0_8px_20px_rgba(99,102,241,0.10)]',
              )}
            >
              <div className="text-[10px] font-semibold text-slate-400">STEP {index + 1}</div>
              <div className={cn('mt-1 text-[11px] leading-relaxed', active ? 'text-slate-700' : 'text-slate-300')}>
                {step}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PatternCompare({ steps, currentIndex, complete }: { steps: string[]; currentIndex: number; complete?: boolean }) {
  return (
    <div className="mb-4 space-y-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className={cn('rounded-2xl border px-3 py-3 text-[11px]', currentIndex >= 0 || complete ? 'border-primary/20 bg-primary/[0.05] text-slate-700' : 'border-slate-200 bg-white/70 text-slate-300')}>
          기준 정렬
        </div>
        <div className="text-[12px] font-semibold text-slate-400">VS</div>
        <div className={cn('rounded-2xl border px-3 py-3 text-[11px]', currentIndex >= 1 || complete ? 'border-primary/20 bg-primary/[0.05] text-slate-700' : 'border-slate-200 bg-white/70 text-slate-300')}>
          차이 쟁점
        </div>
      </div>
      <div className={cn(
        'rounded-2xl border px-4 py-3 text-[11px] leading-relaxed transition-all',
        currentIndex >= 2 || complete ? 'border-primary/25 bg-white shadow-[0_10px_24px_rgba(99,102,241,0.08)] text-slate-700' : 'border-slate-200 bg-white/70 text-slate-300',
      )}>
        {steps[Math.min(steps.length - 1, 2)]}
      </div>
      <PatternStepRail steps={steps} currentIndex={currentIndex} complete={complete} />
    </div>
  );
}

function PatternFunnel({ steps, currentIndex, complete }: { steps: string[]; currentIndex: number; complete?: boolean }) {
  return (
    <div className="mb-4 space-y-3">
      {steps.map((step, index) => {
        const active = complete || index <= currentIndex;
        const width = `${100 - index * 12}%`;
        return (
          <div key={`${step}-${index}`} className="mx-auto" style={{ width }}>
            <div className={cn(
              'rounded-2xl border px-4 py-2.5 text-[11px] transition-all',
              active ? 'border-primary/20 bg-primary/[0.05] text-slate-700' : 'border-slate-200 bg-white/70 text-slate-300',
            )}>
              {step}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PatternTimeline({ steps, currentIndex, complete }: { steps: string[]; currentIndex: number; complete?: boolean }) {
  return (
    <div className="mb-3">
      <PatternStepRail steps={steps} currentIndex={currentIndex} complete={complete} />
    </div>
  );
}

function PatternRoutes({ steps, currentIndex, complete }: { steps: string[]; currentIndex: number; complete?: boolean }) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((step, index) => {
          const active = complete || index <= currentIndex;
          return (
            <div key={`${step}-${index}`} className="flex items-center gap-2">
              <div className={cn(
                'rounded-full border px-3 py-1.5 text-[10px] transition-all',
                active ? 'border-primary/25 bg-primary/[0.05] text-slate-700' : 'border-slate-200 bg-white/70 text-slate-300',
              )}>
                {step}
              </div>
              {index < steps.length - 1 && <div className="h-px w-4 bg-slate-200" />}
            </div>
          );
        })}
      </div>
      <PatternStepRail steps={steps} currentIndex={currentIndex} complete={complete} />
    </div>
  );
}

function PatternStairs({ steps, currentIndex, complete }: { steps: string[]; currentIndex: number; complete?: boolean }) {
  return (
    <div className="mb-4 flex items-end gap-2">
      {steps.map((step, index) => {
        const active = complete || index <= currentIndex;
        return (
          <div
            key={`${step}-${index}`}
            className={cn(
              'flex-1 rounded-t-2xl border px-3 py-2 text-[10px] leading-snug transition-all',
              active ? 'border-primary/25 bg-primary/[0.05] text-slate-700' : 'border-slate-200 bg-white/70 text-slate-300',
            )}
            style={{ minHeight: `${52 + index * 14}px` }}
          >
            {step}
          </div>
        );
      })}
    </div>
  );
}

function PatternReview({ steps, currentIndex, complete }: { steps: string[]; currentIndex: number; complete?: boolean }) {
  return (
    <div className="mb-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className={cn(
          'rounded-2xl border px-3 py-3 text-[11px] transition-all',
          currentIndex >= 1 || complete ? 'border-emerald-200 bg-emerald-50/70 text-slate-700' : 'border-slate-200 bg-white/70 text-slate-300',
        )}>
          강점 근거
        </div>
        <div className={cn(
          'rounded-2xl border px-3 py-3 text-[11px] transition-all',
          currentIndex >= 2 || complete ? 'border-amber-200 bg-amber-50/70 text-slate-700' : 'border-slate-200 bg-white/70 text-slate-300',
        )}>
          보완 쟁점
        </div>
      </div>
      <PatternStepRail steps={steps} currentIndex={currentIndex} complete={complete} />
    </div>
  );
}

function PatternCluster({ steps, currentIndex, complete }: { steps: string[]; currentIndex: number; complete?: boolean }) {
  return (
    <div className="mb-4">
      <div className="relative mx-auto h-40 max-w-[260px]">
        {steps.map((step, index) => {
          const active = complete || index <= currentIndex;
          const positions = [
            'left-1 top-9',
            'right-1 top-4',
            'left-1/2 top-20 -translate-x-1/2',
            'right-10 bottom-2',
          ];
          return (
            <div
              key={`${step}-${index}`}
              className={cn(
                'absolute rounded-full border px-3 py-2 text-[10px] transition-all',
                positions[index] ?? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                active ? 'border-primary/25 bg-primary/[0.05] text-slate-700' : 'border-slate-200 bg-white/70 text-slate-300',
              )}
            >
              {step}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PatternCompose({ steps, currentIndex, complete }: { steps: string[]; currentIndex: number; complete?: boolean }) {
  return (
    <div className="mb-4 rounded-2xl border border-slate-200/80 bg-white/80 p-3">
      <div className="space-y-2">
        {steps.map((step, index) => {
          const active = complete || index <= currentIndex;
          return (
            <div key={`${step}-${index}`} className="space-y-1">
              <div className={cn(
                'h-2 rounded-full transition-colors',
                active ? 'bg-primary/60' : 'bg-slate-200',
              )} style={{ width: `${92 - index * 10}%` }} />
              <div className={cn('text-[10px]', active ? 'text-slate-600' : 'text-slate-300')}>
                {step}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PatternVisual({
  visual,
  focus,
  steps,
  currentIndex,
  complete,
}: {
  visual: QuestionPatternVisual;
  focus?: string;
  steps: string[];
  currentIndex: number;
  complete?: boolean;
}) {
  switch (visual) {
    case 'pulse':
      return <PatternPulse steps={steps} currentIndex={currentIndex} complete={complete} />;
    case 'concept':
      return <PatternConcept focus={focus} steps={steps} currentIndex={currentIndex} complete={complete} />;
    case 'compare':
      return <PatternCompare steps={steps} currentIndex={currentIndex} complete={complete} />;
    case 'funnel':
      return <PatternFunnel steps={steps} currentIndex={currentIndex} complete={complete} />;
    case 'timeline':
      return <PatternTimeline steps={steps} currentIndex={currentIndex} complete={complete} />;
    case 'routes':
      return <PatternRoutes steps={steps} currentIndex={currentIndex} complete={complete} />;
    case 'stairs':
      return <PatternStairs steps={steps} currentIndex={currentIndex} complete={complete} />;
    case 'review':
      return <PatternReview steps={steps} currentIndex={currentIndex} complete={complete} />;
    case 'cluster':
      return <PatternCluster steps={steps} currentIndex={currentIndex} complete={complete} />;
    case 'compose':
      return <PatternCompose steps={steps} currentIndex={currentIndex} complete={complete} />;
    default:
      return <PatternStepRail steps={steps} currentIndex={currentIndex} complete={complete} />;
  }
}

export function AgentTaskStream({ state }: AgentTaskStreamProps) {
  const [expanded, setExpanded] = useState(false);
  const agentLabel = useMemo(() => getAgentLabel(state.agentBrand), [state.agentBrand]);
  const pattern = state.questionPattern ?? 'quick_answer';
  const patternMeta = getQuestionPatternMeta(pattern);
  const steps = state.generatedProgressSteps && state.strategy?.publicSteps && state.strategy.publicSteps.length > 0
    ? state.strategy.publicSteps
    : [];
  const hasSteps = steps.length > 0;
  const currentIndex = hasSteps ? clampIndex(state.patternStageIndex ?? 0, steps.length) : 0;
  const doneTasks = state.tasks.filter((task) => task.status === 'done');
  const focusSummary = state.patternFocus ? ` · ${state.patternFocus}` : '';

  if (state.status === 'error') {
    return (
      <div className="mb-3 rounded-xl border border-amber-200/70 bg-amber-50/70 px-3.5 py-3 text-[11px] text-amber-700">
        분석 절차를 축약하고 응답 생성을 이어가고 있습니다.
      </div>
    );
  }

  const summaryLabel = `${agentLabel} 검토 완료${focusSummary}${hasSteps ? ` · ${steps.length}단계` : ''} · ${(state.elapsedMs / 1000).toFixed(1)}초`;

  if (state.status === 'complete') {
    return (
      <div className="mb-3">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700"
        >
          <svg className="h-3.5 w-3.5 text-primary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <span>{summaryLabel}</span>
          <svg className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className="mt-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-3.5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-700">{agentLabel} 분석 절차</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 shadow-sm">
                {patternMeta.label}
              </span>
            </div>
            {hasSteps && (
              <PatternVisual visual={patternMeta.visual} focus={state.patternFocus} steps={steps} currentIndex={steps.length - 1} complete />
            )}
            {doneTasks.length > 0 && (
              <div className="space-y-2.5">
                {doneTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-2.5">
                    <StatusIcon status="done" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-slate-600">{task.label}</div>
                      <div className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                        {noteFor(task)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-slate-700">{agentLabel} 분석 절차</span>
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 shadow-sm">
          {patternMeta.label}
        </span>
      </div>

      {hasSteps ? (
        <>
          <div className="mt-3 text-[12px] font-medium text-slate-700">
            {steps[currentIndex]}
            <Dots />
          </div>
          <div className="mt-1 text-[10px] leading-relaxed text-slate-400">
            단계 {currentIndex + 1} / {steps.length} · 분석 절차 진행 중
          </div>

          <div className="mt-3">
            <PatternVisual visual={patternMeta.visual} focus={state.patternFocus} steps={steps} currentIndex={currentIndex} />
          </div>
        </>
      ) : (
        <div className="mt-4 space-y-2.5" aria-label="질문별 분석 절차 생성 중">
          <div className="h-2 w-2/3 animate-pulse rounded-full bg-slate-200/80" />
          <div className="h-2 w-1/2 animate-pulse rounded-full bg-slate-200/60" />
        </div>
      )}
    </div>
  );
}
