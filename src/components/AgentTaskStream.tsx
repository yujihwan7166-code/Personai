import { useMemo, useState } from 'react';
import type { AgentState, AgentTask } from '@/utils/agent/types';
import { getAgentStreamPresentation } from '@/utils/agent/agentDisplay';
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
  return task.publicNote || '핵심 포인트를 답변에 반영하고 있습니다.';
}

export function AgentTaskStream({ state }: AgentTaskStreamProps) {
  const [expanded, setExpanded] = useState(false);
  const presentation = useMemo(() => getAgentStreamPresentation(state), [state]);
  const doneTasks = state.tasks.filter((task) => task.status === 'done');
  const runningTask = state.tasks.find((task) => task.status === 'running');

  if (state.status === 'error') {
    return (
      <div className="mb-3 rounded-xl border border-amber-200/70 bg-amber-50/70 px-3.5 py-3 text-[11px] text-amber-700">
        분석 단계를 단순화하고 바로 답변을 이어가고 있습니다.
      </div>
    );
  }

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
          <span>{presentation.completeLabel}</span>
          <svg className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className="mt-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-3.5">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-700">분석 과정</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 shadow-sm">
                {presentation.intentLabel}
              </span>
            </div>
            <div className="space-y-2.5">
              {state.strategy?.publicPlan && (
                <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-[10px] leading-relaxed text-slate-500">
                  {state.strategy.publicPlan}
                </div>
              )}
              {state.tasks.map((task) => (
                <div key={task.id} className="flex items-start gap-2.5">
                  <StatusIcon status={task.status} />
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-600">{task.label}</div>
                    <div className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                      {noteFor(task)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-3.5">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-slate-700">{presentation.agentLabel} 분석 과정</span>
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 shadow-sm">
          {presentation.intentLabel}
        </span>
      </div>

      <div className="mt-2 text-[12px] font-medium text-slate-700">
        {presentation.headline}
        <Dots />
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-start gap-2.5">
          <StatusIcon status={state.status === 'analyzing' ? 'analyzing' : 'done'} />
          <div className="min-w-0">
            <div className={cn('text-[11px] font-medium', state.status === 'analyzing' ? 'text-slate-700' : 'text-slate-500')}>
              {state.status === 'analyzing' ? presentation.analyzeLabel : '질문 해석 완료'}
              {state.status === 'analyzing' && <Dots />}
            </div>
            {state.status !== 'analyzing' && (
              <div className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                요청 의도와 답변 방향을 먼저 정리했습니다.
              </div>
            )}
          </div>
        </div>

        {state.strategy?.publicPlan && (
          <div className="flex items-start gap-2.5">
            <StatusIcon status={state.status === 'planning' ? 'planning' : 'done'} />
            <div className="min-w-0">
              <div className={cn('text-[11px] font-medium', state.status === 'planning' ? 'text-slate-700' : 'text-slate-500')}>
                {state.status === 'planning' ? presentation.planningLabel : '답변 구조 정리 완료'}
                {state.status === 'planning' && <Dots />}
              </div>
              {state.status !== 'planning' && (
                <div className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                  {state.strategy.publicPlan}
                </div>
              )}
            </div>
          </div>
        )}

        {state.tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-2.5">
            <StatusIcon status={task.status} />
            <div className="min-w-0">
              <div className={cn(
                'text-[11px] font-medium',
                task.status === 'running' ? 'text-slate-700' :
                task.status === 'done' ? 'text-slate-500' :
                task.status === 'error' ? 'text-rose-400' :
                'text-slate-300',
              )}>
                {task.label}
                {task.status === 'running' && <Dots />}
              </div>
              {task.status === 'done' && (
                <div className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                  {noteFor(task)}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="flex items-start gap-2.5">
          <StatusIcon status={state.status === 'synthesizing' ? 'synthesizing' : state.status === 'reviewing' || state.status === 'complete' ? 'done' : 'pending'} />
          <div className="min-w-0">
            <div className={cn(
              'text-[11px] font-medium',
              state.status === 'synthesizing' ? 'text-slate-700' :
              state.status === 'analyzing' || state.status === 'planning' || state.status === 'processing' ? 'text-slate-300' :
              'text-slate-500',
            )}>
              {presentation.synthesizeLabel}
              {state.status === 'synthesizing' && <Dots />}
            </div>
            {(state.status === 'synthesizing' || doneTasks.length > 0) && state.status !== 'analyzing' && (
              <div className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                {runningTask
                  ? `${runningTask.label} 결과까지 반영해 최종 답변으로 묶고 있습니다.`
                  : `${doneTasks.length || state.tasks.length}개 관점을 하나의 답으로 정리하고 있습니다.`}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <StatusIcon status={state.status === 'reviewing' ? 'reviewing' : state.status === 'complete' ? 'done' : 'pending'} />
          <div className="min-w-0">
            <div className={cn(
              'text-[11px] font-medium',
              state.status === 'reviewing' ? 'text-slate-700' :
              state.status === 'complete' ? 'text-slate-500' :
              'text-slate-300',
            )}>
              {presentation.reviewLabel}
              {state.status === 'reviewing' && <Dots />}
            </div>
            {(state.status === 'reviewing' || state.status === 'complete') && (
              <div className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                부족한 설명이나 빠진 맥락이 없는지 마지막으로 점검합니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
