import { useState } from 'react';
import {
  RefreshCw, Copy, Play, Users, FileText, Sparkles, GitBranch, Target, Map, MessagesSquare,
  ChevronDown,
} from 'lucide-react';
import type { StudyNotebook, StudyLens, StudyTone, StudyLevel, LensOutput, StudyQuizItem } from '@/types/study';
import { TONE_META, LEVEL_META, newId } from '@/types/study';
import { StudyBtn } from './ui/primitives';
import { LazyMarkdown } from '@/components/LazyMarkdown';
import { DEFAULT_EXPERTS } from '@/types/expert';
import { ExpertPickerModal } from './ExpertPickerModal';
import { DebateLayout } from './DebateLayout';
import { KeypointsLayout, MindmapLayout, GuideLayout } from './LensLayouts';
import { cn } from '@/lib/utils';

interface Props {
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  onStartSession: () => void;
}

const LENSES: { id: StudyLens; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
  { id: 'summary',   label: '요약',         icon: FileText,       hint: '한 눈에 훑기' },
  { id: 'keypoints', label: '핵심 포인트', icon: Sparkles,       hint: '용어·정의 카드' },
  { id: 'mindmap',   label: '마인드맵',     icon: GitBranch,      hint: '개념 구조 트리' },
  { id: 'quiz',      label: '퀴즈',         icon: Target,         hint: '객관식으로 점검' },
  { id: 'guide',     label: '학습 가이드', icon: Map,            hint: '순서·점검 질문' },
  { id: 'debate',    label: '2인 토론',     icon: MessagesSquare, hint: '두 관점으로 듣기' },
];

export function StudioDeck({ notebook, onChange, onStartSession }: Props) {
  const [loadingLens, setLoadingLens] = useState<StudyLens | null>(null);
  const [activeLens, setActiveLens] = useState<StudyLens | null>(null);
  const [showExpertPicker, setShowExpertPicker] = useState(false);
  const [pendingDebateAfterPick, setPendingDebateAfterPick] = useState(false);

  const enabledSources = notebook.sources.filter((s) => s.enabled && s.status === 'ready');
  const expertA = notebook.debatePartners?.expertAId
    ? DEFAULT_EXPERTS.find((e) => e.id === notebook.debatePartners!.expertAId)
    : undefined;
  const expertB = notebook.debatePartners?.expertBId
    ? DEFAULT_EXPERTS.find((e) => e.id === notebook.debatePartners!.expertBId)
    : undefined;

  const generate = async (lens: StudyLens, toneOverride?: StudyTone, levelOverride?: StudyLevel) => {
    if (enabledSources.length === 0) {
      alert('먼저 소스를 하나 이상 추가하고 활성화해주세요.');
      return;
    }
    if (lens === 'debate' && (!expertA || !expertB)) {
      setPendingDebateAfterPick(true);
      setShowExpertPicker(true);
      return;
    }
    const existing = notebook.lensOutputs[lens];
    const tone = toneOverride ?? existing?.tone ?? 'student';
    const level = levelOverride ?? existing?.level ?? 'standard';

    setLoadingLens(lens);
    try {
      const options: Record<string, unknown> = { count: 5 };
      if (lens === 'debate' && expertA && expertB) {
        options.expertA = { name: expertA.nameKo || expertA.name, role: expertA.description };
        options.expertB = { name: expertB.nameKo || expertB.name, role: expertB.description };
      }
      if (lens === 'quiz' && notebook.wrongAnswers.length > 0) {
        const concepts = Array.from(new Set(notebook.wrongAnswers.map((w) => w.concept).filter((c): c is string => Boolean(c?.trim())))).slice(0, 5);
        if (concepts.length > 0) options.weakConcepts = concepts;
      }
      const r = await fetch('/api/study-generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lens,
          sources: enabledSources.map((s) => ({ title: s.title, content: s.content })),
          tone, level, options,
        }),
      });
      const data = await r.json();
      if (!r.ok) { alert(data?.error || '생성 실패'); return; }
      const newOutput: LensOutput = {
        lens, content: data.content || '', tone, level,
        generatedAt: Date.now(),
        meta: data.structured ? { structured: data.structured } : undefined,
      };
      let newQuiz = notebook.quizItems;
      if (lens === 'quiz' && Array.isArray(data.structured)) {
        newQuiz = (data.structured as Array<Omit<StudyQuizItem, 'id'>>).map((q) => ({ ...q, id: newId('q') }));
      }
      onChange({
        ...notebook,
        lensOutputs: { ...notebook.lensOutputs, [lens]: newOutput },
        quizItems: newQuiz,
      });
      setActiveLens(lens);
    } catch { alert('네트워크 오류'); }
    finally { setLoadingLens(null); }
  };

  const handleLensClick = (lens: StudyLens) => {
    if (loadingLens) return;
    if (lens === 'debate' && (!expertA || !expertB) && !notebook.lensOutputs[lens]) {
      setPendingDebateAfterPick(false);
      setShowExpertPicker(true);
      return;
    }
    const existing = notebook.lensOutputs[lens];
    if (existing) {
      setActiveLens(activeLens === lens ? null : lens);
    } else {
      generate(lens);
    }
  };

  const outputs = (Object.entries(notebook.lensOutputs) as [StudyLens, LensOutput | undefined][])
    .filter(([, v]) => !!v)
    .sort((a, b) => (b[1]!.generatedAt - a[1]!.generatedAt));

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3">
        <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100">스튜디오</h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">같은 소스, 다른 렌즈</p>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800 px-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          {LENSES.map((l) => {
            const Icon = l.icon;
            const existing = notebook.lensOutputs[l.id];
            const done = !!existing;
            const loading = loadingLens === l.id;
            return (
              <button
                key={l.id}
                onClick={() => handleLensClick(l.id)}
                disabled={loading}
                title={done ? `${l.hint} · ${formatRelative(existing!.generatedAt)}` : l.hint}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  done
                    ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-100'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-700',
                  loading && 'cursor-wait opacity-70',
                )}
              >
                {loading ? (
                  <span className="study-shimmer h-3 w-3 rounded-full" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
                <span>{l.label}</span>
                {done && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" aria-label="생성됨" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {outputs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40 mb-3">
              <Sparkles className="h-5 w-5 text-indigo-400" strokeWidth={1.8} />
            </div>
            <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-1">아직 생성된 게 없어요</p>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
              위 칩을 눌러 <br />첫 결과를 만들어 보세요
            </p>
          </div>
        ) : (
          <div>
            {outputs.map(([lens, out]) => (
              <ResultItem
                key={lens}
                lens={lens}
                output={out!}
                notebook={notebook}
                onChange={onChange}
                expanded={activeLens === lens}
                onToggle={() => setActiveLens(activeLens === lens ? null : lens)}
                onRegenerate={(tone, level) => generate(lens, tone, level)}
                onStartSession={onStartSession}
                loading={loadingLens === lens}
                expertA={expertA} expertB={expertB}
                onOpenExpertPicker={() => setShowExpertPicker(true)}
              />
            ))}
          </div>
        )}
      </div>

      {showExpertPicker && (
        <ExpertPickerModal
          selectedAId={notebook.debatePartners?.expertAId}
          selectedBId={notebook.debatePartners?.expertBId}
          onConfirm={(a, b) => {
            onChange({ ...notebook, debatePartners: { expertAId: a.id, expertBId: b.id } });
            setShowExpertPicker(false);
            if (pendingDebateAfterPick) {
              setPendingDebateAfterPick(false);
              setTimeout(() => generate('debate'), 50);
            }
          }}
          onClose={() => { setShowExpertPicker(false); setPendingDebateAfterPick(false); }}
        />
      )}
    </div>
  );
}

function ResultItem({
  lens, output, notebook, onChange, expanded, onToggle, onRegenerate, onStartSession, loading,
  expertA, expertB, onOpenExpertPicker,
}: {
  lens: StudyLens;
  output: LensOutput;
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  expanded: boolean;
  onToggle: () => void;
  onRegenerate: (tone?: StudyTone, level?: StudyLevel) => void;
  onStartSession: () => void;
  loading: boolean;
  expertA?: import('@/types/expert').Expert;
  expertB?: import('@/types/expert').Expert;
  onOpenExpertPicker: () => void;
}) {
  const meta = LENSES.find((l) => l.id === lens)!;
  const Icon = meta.icon;
  const [showOptions, setShowOptions] = useState(false);
  const [tone, setTone] = useState<StudyTone>(output.tone);
  const [level, setLevel] = useState<StudyLevel>(output.level);

  return (
    <div className={cn('border-b border-slate-100 dark:border-slate-800/60', expanded && 'bg-slate-50/60 dark:bg-slate-900/40')}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{meta.label}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {TONE_META[output.tone]} · {timeAgo(output.generatedAt)}
          </p>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-3">
          {lens === 'debate' && expertA && expertB && (
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <span>{expertA.icon}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{expertA.nameKo || expertA.name}</span>
                <span className="text-slate-400">vs</span>
                <span>{expertB.icon}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{expertB.nameKo || expertB.name}</span>
              </div>
              <button onClick={onOpenExpertPicker} className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
                <Users className="h-3 w-3" /> 바꾸기
              </button>
            </div>
          )}

          <button
            onClick={() => setShowOptions(!showOptions)}
            className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-1"
          >
            {TONE_META[tone]} · {LEVEL_META[level]}
            <ChevronDown className={cn('h-3 w-3 transition-transform', showOptions && 'rotate-180')} />
          </button>
          {showOptions && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-2.5">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">문체</p>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(TONE_META) as StudyTone[]).map((t) => (
                    <button key={t} onClick={() => setTone(t)}
                      className={cn('rounded-md px-2 py-1 text-[11px]', tone === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')}>
                      {TONE_META[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">난이도</p>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(LEVEL_META) as StudyLevel[]).map((l) => (
                    <button key={l} onClick={() => setLevel(l)}
                      className={cn('rounded-md px-2 py-1 text-[11px]', level === l ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300')}>
                      {LEVEL_META[l]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {lens === 'quiz' && output.meta?.structured ? (
            <QuizPreview items={notebook.quizItems} onStartSession={onStartSession} />
          ) : lens === 'keypoints' ? (
            <KeypointsLayout content={output.content} />
          ) : lens === 'mindmap' ? (
            <MindmapLayout content={output.content} />
          ) : lens === 'guide' ? (
            <GuideLayout content={output.content} />
          ) : lens === 'debate' ? (
            <DebateLayout content={output.content} expertA={expertA} expertB={expertB} />
          ) : (
            <div className="prose prose-sm max-w-none text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
              <LazyMarkdown content={output.content} />
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button onClick={() => onRegenerate(tone, level)} disabled={loading}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-40">
              <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} /> 재생성
            </button>
            <button onClick={() => navigator.clipboard?.writeText(output.content)}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">
              <Copy className="h-3 w-3" /> 복사
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function QuizPreview({ items, onStartSession }: { items: StudyQuizItem[]; onStartSession: () => void }) {
  if (items.length === 0) return <p className="text-[12px] text-slate-500">퀴즈가 없어요.</p>;
  return (
    <div className="space-y-2">
      <p className="text-[12px] text-slate-600 dark:text-slate-400">
        <b className="text-slate-900 dark:text-slate-100">{items.length}문제</b>가 준비됐어요.
      </p>
      <StudyBtn variant="primary" size="md" onClick={onStartSession} className="w-full">
        <Play className="h-3.5 w-3.5" /> 15분 세션 시작
      </StudyBtn>
    </div>
  );
}

function timeAgo(ts: number): string {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return '방금';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}
