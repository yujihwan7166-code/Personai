import { useState } from 'react';
import { X, Check } from 'lucide-react';
import type { StudyNotebook, StudyLens, LensOutput, StudyQuizItem } from '@/types/study';
import { LENS_META, newId } from '@/types/study';
import { StudyBtn } from './ui/primitives';
import { cn } from '@/lib/utils';

interface Props {
  notebook: StudyNotebook;
  onApply: (partial: Partial<StudyNotebook>) => void;
  onClose: () => void;
}

type TaskState = 'idle' | 'running' | 'done' | 'error';

const QUICKSTART_LENSES: StudyLens[] = ['summary', 'keypoints', 'quiz'];

export function QuickStartModal({ notebook, onApply, onClose }: Props) {
  const enabledSources = notebook.sources.filter((s) => s.enabled && s.status === 'ready');
  const [states, setStates] = useState<Record<StudyLens, TaskState>>({
    summary: 'idle',
    keypoints: 'idle',
    quiz: 'idle',
    mindmap: 'idle',
    guide: 'idle',
    debate: 'idle',
  });
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (enabledSources.length === 0) {
      alert('활성화된 소스가 없어요.');
      return;
    }
    setRunning(true);
    const outputs: Partial<Record<StudyLens, LensOutput>> = {};
    let newQuiz: StudyQuizItem[] | null = null;

    await Promise.all(
      QUICKSTART_LENSES.map(async (lens) => {
        setStates((s) => ({ ...s, [lens]: 'running' }));
        try {
          const r = await fetch('/api/study-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lens,
              sources: enabledSources.map((s) => ({ title: s.title, content: s.content })),
              tone: 'student',
              level: 'standard',
              options: { count: 5 },
            }),
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data?.error || 'fail');
          outputs[lens] = {
            lens,
            content: data.content || '',
            tone: 'student',
            level: 'standard',
            generatedAt: Date.now(),
            meta: data.structured ? { structured: data.structured } : undefined,
          };
          if (lens === 'quiz' && Array.isArray(data.structured)) {
            newQuiz = (data.structured as Array<Omit<StudyQuizItem, 'id'>>).map((q) => ({
              ...q,
              id: newId('q'),
            }));
          }
          setStates((s) => ({ ...s, [lens]: 'done' }));
        } catch {
          setStates((s) => ({ ...s, [lens]: 'error' }));
        }
      }),
    );

    onApply({
      lensOutputs: { ...notebook.lensOutputs, ...outputs },
      ...(newQuiz ? { quizItems: newQuiz } : {}),
    });
    setRunning(false);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">빠른 시작</h3>
            <p className="text-[11.5px] text-slate-500 mt-0.5">
              요약 · 핵심노트 · 퀴즈를 한 번에 만들어요
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {QUICKSTART_LENSES.map((lens) => {
            const meta = LENS_META[lens];
            const st = states[lens];
            return (
              <div
                key={lens}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3',
                  st === 'done' ? 'border-emerald-200 bg-emerald-50/40' :
                  st === 'error' ? 'border-red-200 bg-red-50/40' :
                  st === 'running' ? 'border-indigo-200 bg-indigo-50/40' :
                  'border-slate-200',
                )}
              >
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl text-lg', meta.tintClass)}>
                  {meta.icon}
                </div>
                <div className="flex-1">
                  <p className="text-[12.5px] font-bold text-slate-800">{meta.label}</p>
                  <p className="text-[10.5px] text-slate-500">
                    {st === 'idle' && '대기'}
                    {st === 'running' && '생성 중…'}
                    {st === 'done' && '완료'}
                    {st === 'error' && '실패'}
                  </p>
                </div>
                {st === 'running' && (
                  <div className="study-shimmer h-1.5 w-16 rounded" />
                )}
                {st === 'done' && <Check className="h-4 w-4 text-emerald-600" />}
              </div>
            );
          })}
        </div>
        <div className="p-5 pt-0">
          <div className="flex gap-2">
            <StudyBtn variant="outline" onClick={onClose} className="flex-1">
              취소
            </StudyBtn>
            <StudyBtn
              variant="primary"
              onClick={running ? onClose : run}
              disabled={enabledSources.length === 0}
              className="flex-1"
            >
              {running
                ? Object.values(states).some((s) => s === 'running')
                  ? '생성 중…'
                  : '완료 — 닫기'
                : '30초 안에 만들기'}
            </StudyBtn>
          </div>
        </div>
      </div>
    </div>
  );
}
