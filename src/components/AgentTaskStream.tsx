// ══════════════════════════════════════════
// AgentTaskStream — 에이전트 작업 단계 표시 UI
// ══════════════════════════════════════════

import { useState } from 'react';
import type { AgentState } from '@/utils/agent/types';
import { cn } from '@/lib/utils';

interface AgentTaskStreamProps {
  state: AgentState;
}

export function AgentTaskStream({ state }: AgentTaskStreamProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const { status, strategy, tasks } = state;
  const doneTasks = tasks.filter(t => t.status === 'done');

  // ── complete: 한 줄 접힌 배지 ──
  if (status === 'complete') {
    return (
      <div className="mb-2.5">
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-500 transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
          <span>에이전트 분석 · {doneTasks.length}단계 · {(state.elapsedMs / 1000).toFixed(1)}초</span>
          <svg className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className="mt-1.5 ml-5 space-y-0.5">
            {tasks.map(task => (
              <div key={task.id}>
                <button
                  className="flex items-center gap-1.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-500 transition-colors w-full text-left"
                  onClick={() => setExpandedTaskId(prev => prev === task.id ? null : task.id)}
                >
                  <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                  <span className="flex-1">{task.label}</span>
                  {task.result && (
                    <svg className={cn('w-2.5 h-2.5 text-slate-300 transition-transform', expandedTaskId === task.id && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                {expandedTaskId === task.id && task.result && (
                  <div className="ml-3 mt-0.5 mb-1.5 px-3 py-2 rounded-lg bg-slate-50 text-[10px] text-slate-500 leading-relaxed whitespace-pre-wrap max-h-[120px] overflow-y-auto scrollbar-thin">
                    {task.result}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── error ──
  if (status === 'error') {
    return (
      <div className="mb-3 text-[11px] text-slate-400 italic">
        심층 분석 중 문제가 발생하여 일반 모드로 답변합니다.
      </div>
    );
  }

  // ── 진행 중 ──
  const steps: { key: string; done: boolean; active: boolean; label: React.ReactNode }[] = [];

  // Step 1
  steps.push({
    key: 'analyze',
    done: status !== 'analyzing',
    active: status === 'analyzing',
    label: status === 'analyzing'
      ? <span>질문을 분석하고 있습니다<Dots /></span>
      : <span>{strategy?.reasoning || `${tasks.length}가지 관점에서 분석하겠습니다`}</span>,
  });

  // Step 2 (tasks)
  if (status === 'processing' || status === 'synthesizing') {
    const allDone = tasks.every(t => t.status === 'done' || t.status === 'error');
    steps.push({
      key: 'tasks',
      done: allDone,
      active: status === 'processing',
      label: (
        <div className="space-y-0.5">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-1.5">
              {task.status === 'done' ? (
                <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : task.status === 'running' ? (
                <span className="relative flex w-3 h-3 items-center justify-center shrink-0">
                  <span className="absolute w-2.5 h-2.5 rounded-full bg-slate-400/20 animate-ping" />
                  <span className="relative w-1.5 h-1.5 rounded-full bg-slate-500" />
                </span>
              ) : task.status === 'error' ? (
                <svg className="w-3 h-3 text-red-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <span className="w-3 h-3 flex items-center justify-center shrink-0">
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                </span>
              )}
              <span className={cn(
                'text-[11px]',
                task.status === 'running' ? 'text-slate-600' :
                task.status === 'done' ? 'text-slate-400' :
                task.status === 'error' ? 'text-red-300' :
                'text-slate-300'
              )}>
                {task.label}
                {task.status === 'running' && <Dots />}
              </span>
            </div>
          ))}
        </div>
      ),
    });
  }

  // Step 3
  if (status === 'synthesizing') {
    steps.push({
      key: 'synthesize',
      done: false,
      active: true,
      label: <span>종합 정리 중<Dots /></span>,
    });
  }

  return (
    <div className="mb-3">
      <div className="space-y-0">
        {steps.map((step, i) => (
          <div key={step.key} className="flex items-start gap-2.5 min-h-[24px]">
            {/* 타임라인 점 + 세로선 */}
            <div className="flex flex-col items-center pt-[5px]">
              {step.active ? (
                <span className="relative flex w-3.5 h-3.5 items-center justify-center">
                  <span className="absolute w-3 h-3 rounded-full bg-slate-400/20 animate-ping" />
                  <span className="relative w-[6px] h-[6px] rounded-full bg-slate-500" />
                </span>
              ) : step.done ? (
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              ) : (
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                </span>
              )}
              {i < steps.length - 1 && (
                <div className="w-px flex-1 bg-slate-200 mt-1 min-h-[8px]" />
              )}
            </div>

            {/* 내용 */}
            <div className={cn(
              'pb-2 flex-1 min-w-0 text-[12px]',
              step.active ? 'text-slate-600' : step.done ? 'text-slate-400' : 'text-slate-300'
            )}>
              {step.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 말줄임표 애니메이션 ──
function Dots() {
  return <span className="animate-ellipsis tracking-wider ml-px" />;
}
