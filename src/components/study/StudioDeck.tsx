import { Fragment, useState } from 'react';
import {
  RefreshCw, Copy, Play, Users, FileText, Sparkles, GitBranch, Target, Map, MessagesSquare,
  ChevronDown, X,
} from 'lucide-react';
import type { StudyNotebook, StudyLens, StudyTone, StudyLevel, LensOutput, StudyQuizItem } from '@/types/study';
import { TONE_META, LEVEL_META, newId } from '@/types/study';
import { StudyBtn } from './ui/primitives';
import { LazyMarkdown } from '@/components/LazyMarkdown';
import { DEFAULT_EXPERTS } from '@/types/expert';
import { ExpertPickerModal } from './ExpertPickerModal';
import { DebateLayout } from './DebateLayout';
import { KeypointsLayout, MindmapLayout, GuideLayout, SummaryLayout } from './LensLayouts';
import { cn } from '@/lib/utils';

interface Props {
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  onStartSession: () => void;
  /** [p.N] 뱃지 클릭 시 원본 뷰어의 해당 페이지로 스크롤. */
  onJumpToPage?: (page: number) => void;
}

const LENSES: { id: StudyLens; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
  { id: 'summary',   label: '요약',         icon: FileText,       hint: '한 눈에 훑기' },
  { id: 'keypoints', label: '핵심 포인트', icon: Sparkles,       hint: '용어·정의 카드' },
  { id: 'mindmap',   label: '마인드맵',     icon: GitBranch,      hint: '개념 구조 트리' },
  { id: 'quiz',      label: '퀴즈',         icon: Target,         hint: '객관식으로 점검' },
  { id: 'guide',     label: '학습 가이드', icon: Map,            hint: '순서·점검 질문' },
  { id: 'debate',    label: '2인 토론',     icon: MessagesSquare, hint: '두 관점으로 듣기' },
];

export function StudioDeck({ notebook, onChange, onStartSession, onJumpToPage }: Props) {
  const [loadingLens, setLoadingLens] = useState<StudyLens | null>(null);
  const [activeLens, setActiveLens] = useState<StudyLens | null>(null);
  const [quizSubView, setQuizSubView] = useState<'quiz' | 'wrong'>('quiz');
  const [showExpertPicker, setShowExpertPicker] = useState(false);
  const [pendingDebateAfterPick, setPendingDebateAfterPick] = useState(false);

  const enabledSources = notebook.sources.filter((s) => s.enabled && s.status === 'ready');
  const expertA = notebook.debatePartners?.expertAId
    ? DEFAULT_EXPERTS.find((e) => e.id === notebook.debatePartners!.expertAId)
    : undefined;
  const expertB = notebook.debatePartners?.expertBId
    ? DEFAULT_EXPERTS.find((e) => e.id === notebook.debatePartners!.expertBId)
    : undefined;

  const generate = async (
    lens: StudyLens,
    toneOverride?: StudyTone,
    levelOverride?: StudyLevel,
    extraOptions?: { count?: number; useWeakConcepts?: boolean },
  ) => {
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
      const options: Record<string, unknown> = { count: extraOptions?.count ?? 5 };
      if (lens === 'debate' && expertA && expertB) {
        options.expertA = { name: expertA.nameKo || expertA.name, role: expertA.description };
        options.expertB = { name: expertB.nameKo || expertB.name, role: expertB.description };
      }
      if (lens === 'quiz' && (extraOptions?.useWeakConcepts ?? true) && notebook.wrongAnswers.length > 0) {
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
    // 단일 뷰: 클릭한 렌즈로 전환. 캐시 있으면 즉시 전환.
    setActiveLens(lens);
    // 퀴즈는 설정 단계가 필요하므로 자동 생성하지 않음 — LensSoloView의 "퀴즈 생성하기" 버튼으로 진입.
    if (!existing && lens !== 'quiz') generate(lens);
  };

  const activeOutput = activeLens ? notebook.lensOutputs[activeLens] : undefined;
  const activeLoading = activeLens ? loadingLens === activeLens : false;
  const anyOutput = Object.values(notebook.lensOutputs).some((v) => !!v);

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      <div className="border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 flex items-center flex-wrap gap-1.5">
        <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 shrink-0 pl-2 pr-1">스튜디오</h3>
        {LENSES.map((l) => {
          const Icon = l.icon;
          const existing = notebook.lensOutputs[l.id];
          const done = !!existing;
          const loading = loadingLens === l.id;
          // 퀴즈 칩은 activeLens='quiz' && subView='quiz'일 때만 활성. 오답노트일 땐 비활성.
          const active = l.id === 'quiz'
            ? activeLens === 'quiz' && quizSubView === 'quiz'
            : activeLens === l.id;
          const chipBtn = (
            <button
              key={l.id}
              onClick={() => {
                if (l.id === 'quiz') setQuizSubView('quiz');
                handleLensClick(l.id);
              }}
              disabled={loading}
              title={done ? `${l.hint} · ${formatRelative(existing!.generatedAt)}` : l.hint}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                active
                  ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500'
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
            </button>
          );
          // 퀴즈 칩 뒤에 바로 오답노트 칩 추가
          if (l.id === 'quiz') {
            const wrongActive = activeLens === 'quiz' && quizSubView === 'wrong';
            return (
              <Fragment key="quiz-group">
                {chipBtn}
                <button
                  key="wrong"
                  onClick={() => { setActiveLens('quiz'); setQuizSubView('wrong'); }}
                  title={`오답 ${notebook.wrongAnswers.length}개`}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                    wrongActive
                      ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-700',
                  )}
                >
                  <X className="h-3 w-3" />
                  <span>오답노트</span>
                  {notebook.wrongAnswers.length > 0 && (
                    <span className={cn('rounded-full px-1 text-[9.5px] tabular-nums',
                      wrongActive ? 'bg-white/20' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300')}>
                      {notebook.wrongAnswers.length}
                    </span>
                  )}
                </button>
              </Fragment>
            );
          }
          return chipBtn;
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {!activeLens ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40 mb-3">
              <Sparkles className="h-5 w-5 text-indigo-400" strokeWidth={1.8} />
            </div>
            <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-1">
              {anyOutput ? '위 칩을 눌러 결과를 확인하세요' : '아직 생성된 게 없어요'}
            </p>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {anyOutput ? '원하는 렌즈를 선택하면 해당 결과만 보여드릴게요' : '위 칩을 눌러 첫 결과를 만들어 보세요'}
            </p>
          </div>
        ) : activeLens === 'summary' ? (
          <SummarySection
            summary={activeOutput}
            loading={activeLoading}
            onRegenerate={(tone, level) => generate('summary', tone, level)}
            onJumpToPage={onJumpToPage}
          />
        ) : (
          <LensSoloView
            lens={activeLens}
            output={activeOutput}
            loading={activeLoading}
            notebook={notebook}
            onStartSession={onStartSession}
            expertA={expertA}
            expertB={expertB}
            onGenerate={generate}
          />
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

/* ── 단일 렌즈 뷰 (요약 외) ── */
function LensSoloView({
  lens, output, loading, notebook, onStartSession, expertA, expertB, onGenerate,
}: {
  lens: StudyLens;
  output: LensOutput | undefined;
  loading: boolean;
  notebook: StudyNotebook;
  onStartSession: () => void;
  expertA?: import('@/types/expert').Expert;
  expertB?: import('@/types/expert').Expert;
  onGenerate: (lens: StudyLens, tone?: StudyTone, level?: StudyLevel, extra?: { count?: number; useWeakConcepts?: boolean }) => void;
}) {
  const [showQuizConfig, setShowQuizConfig] = useState(false);

  if (loading && !output) {
    return (
      <div className="px-5 py-5 space-y-2">
        <div className="study-shimmer h-5 w-1/3 rounded" />
        <div className="study-shimmer h-3 w-full rounded" />
        <div className="study-shimmer h-3 w-[92%] rounded" />
        <div className="study-shimmer h-3 w-[80%] rounded" />
        <div className="study-shimmer h-3 w-[85%] rounded mt-3" />
        <div className="study-shimmer h-3 w-[70%] rounded" />
      </div>
    );
  }

  // 퀴즈 미생성 상태: "퀴즈 생성하기" CTA
  if (lens === 'quiz' && !output) {
    return (
      <>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 mb-3">
            <Target className="h-5 w-5 text-emerald-600" strokeWidth={1.8} />
          </div>
          <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-1">퀴즈 만들기</p>
          <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
            자료를 바탕으로 객관식 문제를 자동 출제합니다.<br />
            문항 수와 난이도를 먼저 설정하세요.
          </p>
          <button
            onClick={() => setShowQuizConfig(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-[12.5px] font-semibold hover:bg-slate-800 dark:hover:bg-white transition-colors"
          >
            <Target className="h-3.5 w-3.5" /> 퀴즈 생성하기
          </button>
        </div>
        {showQuizConfig && (
          <QuizConfigModal
            hasWrongAnswers={notebook.wrongAnswers.length > 0}
            onSubmit={(cfg) => {
              setShowQuizConfig(false);
              onGenerate('quiz', cfg.tone, cfg.level, { count: cfg.count, useWeakConcepts: cfg.useWeakConcepts });
            }}
            onClose={() => setShowQuizConfig(false)}
          />
        )}
      </>
    );
  }

  if (!output) return null;

  return (
    <div className="px-5 py-4">
      {lens === 'quiz' && output.meta?.structured ? (
        <QuizPreview
          items={notebook.quizItems}
          onStartSession={onStartSession}
          onRegenerate={() => setShowQuizConfig(true)}
        />
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
      {showQuizConfig && lens === 'quiz' && (
        <QuizConfigModal
          hasWrongAnswers={notebook.wrongAnswers.length > 0}
          initialTone={output.tone}
          initialLevel={output.level}
          onSubmit={(cfg) => {
            setShowQuizConfig(false);
            onGenerate('quiz', cfg.tone, cfg.level, { count: cfg.count, useWeakConcepts: cfg.useWeakConcepts });
          }}
          onClose={() => setShowQuizConfig(false)}
        />
      )}
    </div>
  );
}

/* ── 퀴즈 설정 모달 ── */
function QuizConfigModal({
  hasWrongAnswers, initialTone, initialLevel, onSubmit, onClose,
}: {
  hasWrongAnswers: boolean;
  initialTone?: StudyTone;
  initialLevel?: StudyLevel;
  onSubmit: (cfg: { count: number; tone: StudyTone; level: StudyLevel; useWeakConcepts: boolean }) => void;
  onClose: () => void;
}) {
  const [count, setCount] = useState<number>(5);
  const [tone, setTone] = useState<StudyTone>(initialTone ?? 'student');
  const [level, setLevel] = useState<StudyLevel>(initialLevel ?? 'standard');
  const [useWeak, setUseWeak] = useState<boolean>(hasWrongAnswers);

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 inline-flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-600" /> 퀴즈 생성 설정
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5" aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-2">문항 수</p>
            <div className="flex gap-1.5">
              {[3, 5, 10, 15].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-[12.5px] font-semibold transition-colors',
                    count === n
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-400',
                  )}
                >
                  {n}문항
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-2">난이도</p>
            <div className="flex gap-1.5">
              {(Object.keys(LEVEL_META) as StudyLevel[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={cn(
                    'flex-1 rounded-lg border px-3 py-2 text-[12.5px] font-semibold transition-colors',
                    level === l
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-indigo-400',
                  )}
                >
                  {LEVEL_META[l]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-2">문체</p>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(TONE_META) as StudyTone[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors',
                    tone === t
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200',
                  )}
                >
                  {TONE_META[t]}
                </button>
              ))}
            </div>
          </div>

          {hasWrongAnswers && (
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={useWeak}
                onChange={(e) => setUseWeak(e.target.checked)}
                className="h-4 w-4 accent-indigo-600"
              />
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">취약 개념 중심 출제</p>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400">지금까지 틀린 문제의 개념을 다시 묻습니다</p>
              </div>
            </label>
          )}
        </div>

        <div className="flex gap-2 p-5 pt-0">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            취소
          </button>
          <button
            onClick={() => onSubmit({ count, tone, level, useWeakConcepts: useWeak })}
            className="flex-1 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-[12.5px] font-semibold hover:bg-slate-800 dark:hover:bg-white"
          >
            생성하기
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 요약 전용 상단 고정 뷰 ── */
function SummarySection({
  summary, loading, onJumpToPage,
}: {
  summary: LensOutput | undefined;
  loading: boolean;
  onRegenerate: (tone?: StudyTone, level?: StudyLevel) => void;
  onJumpToPage?: (page: number) => void;
}) {
  if (loading && !summary) {
    return (
      <div className="px-5 py-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-indigo-500" />
          <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">요약 생성 중…</span>
        </div>
        <div className="space-y-2">
          <div className="study-shimmer h-5 w-1/3 rounded" />
          <div className="study-shimmer h-3 w-full rounded" />
          <div className="study-shimmer h-3 w-[92%] rounded" />
          <div className="study-shimmer h-3 w-[85%] rounded" />
          <div className="study-shimmer h-3 w-[70%] rounded mt-3" />
          <div className="study-shimmer h-5 w-1/4 rounded mt-6" />
          <div className="study-shimmer h-3 w-full rounded" />
          <div className="study-shimmer h-3 w-[88%] rounded" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="px-5 py-4">
      <SummaryLayout content={summary.content} onPageClick={onJumpToPage} />
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

function QuizPreview({
  items, onStartSession, onRegenerate,
}: {
  items: StudyQuizItem[];
  onStartSession: () => void;
  onRegenerate?: () => void;
}) {
  if (items.length === 0) return <p className="text-[12px] text-slate-500">퀴즈가 없어요.</p>;
  return (
    <div className="space-y-2">
      <p className="text-[12px] text-slate-600 dark:text-slate-400">
        <b className="text-slate-900 dark:text-slate-100">{items.length}문제</b>가 준비됐어요.
      </p>
      <StudyBtn variant="primary" size="md" onClick={onStartSession} className="w-full">
        <Play className="h-3.5 w-3.5" /> 15분 세션 시작
      </StudyBtn>
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className="w-full inline-flex items-center justify-center gap-1.5 text-[11.5px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 py-1.5"
        >
          <RefreshCw className="h-3 w-3" /> 다른 설정으로 새로 만들기
        </button>
      )}
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
