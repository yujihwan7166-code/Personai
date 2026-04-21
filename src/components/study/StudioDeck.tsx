import { useEffect, useState } from 'react';
import {
  RefreshCw, Copy, Play, Users, FileText, Sparkles, GitBranch, Target, Map, MessagesSquare,
  ChevronDown, X, RotateCcw, Layers, MoreHorizontal, Star,
} from 'lucide-react';
import type { StudyNotebook, StudyLens, StudyTone, StudyLevel, LensOutput, StudyQuizItem, Flashcard, FlashcardDeck, FlashcardCardType } from '@/types/study';
import { TONE_META, LEVEL_META, newId, FLASHCARD_CARD_TYPE_META } from '@/types/study';
import { StudyBtn } from './ui/primitives';
import { LazyMarkdown } from '@/components/LazyMarkdown';
import { DEFAULT_EXPERTS } from '@/types/expert';
import { ExpertPickerModal } from './ExpertPickerModal';
import { DebateLayout } from './DebateLayout';
import { KeypointsLayout, MindmapLayout, GuideLayout, SummaryLayout } from './LensLayouts';
import { MindmapCanvas } from './MindmapCanvas';
import type { MindmapMeta, MindmapNode } from '@/types/study';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Props {
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  onStartSession: (opts?: { filter?: 'saved' | 'deck'; deckId?: string }) => void;
  /** [p.N] 뱃지 클릭 시 원본 뷰어의 해당 페이지로 스크롤. */
  onJumpToPage?: (page: number) => void;
}

/** 사이드바 칩 목록. 'keypoints' 는 폐기(데이터 호환을 위해 타입은 유지). 'quiz' 는 세그먼트 칩으로 특수 처리. */
const LENSES: { id: StudyLens; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
  { id: 'summary',     label: '노트정리',    icon: FileText,   hint: '구조화된 학습 노트' },
  { id: 'mindmap',     label: '마인드맵',    icon: GitBranch,  hint: '개념 구조 트리' },
  { id: 'quiz',        label: '퀴즈',        icon: Target,     hint: '객관식으로 점검' },
  { id: 'flashcards',  label: '플래시카드',  icon: Layers,     hint: '앞뒷면 카드로 암기' },
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
    extraOptions?: {
      count?: number;
      useWeakConcepts?: boolean;
      // 플래시카드 덱 설정
      flashDeckName?: string;
      flashFocus?: string;
      flashCardTypes?: FlashcardCardType[];
      /** 기존 덱을 교체할 때 그 deckId. 없으면 새 덱 생성. */
      flashReplaceDeckId?: string;
    },
  ) => {
    if (enabledSources.length === 0) {
      toast({ title: '소스가 필요해요', description: '먼저 자료를 하나 이상 추가하고 활성화해주세요.' });
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
      if (lens === 'flashcards') {
        if (extraOptions?.flashFocus) options.focus = extraOptions.flashFocus;
        if (extraOptions?.flashCardTypes && extraOptions.flashCardTypes.length > 0) {
          options.cardTypes = extraOptions.flashCardTypes;
        }
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
      if (!r.ok) {
        toast({ title: '생성 실패', description: data?.error || '다시 시도해주세요.', variant: 'destructive' });
        return;
      }
      const newOutput: LensOutput = {
        lens, content: data.content || '', tone, level,
        generatedAt: Date.now(),
        meta: data.structured ? { structured: data.structured } : undefined,
      };
      let newQuiz = notebook.quizItems;
      if (lens === 'quiz' && Array.isArray(data.structured)) {
        newQuiz = (data.structured as Array<Omit<StudyQuizItem, 'id'>>).map((q) => ({ ...q, id: newId('q') }));
      }
      let newFlashcards = notebook.flashcards;
      let newDecks = notebook.flashcardDecks ?? [];
      if (lens === 'flashcards' && Array.isArray(data.structured)) {
        // 덱 결정: 기존 덱 교체 or 새 덱
        const replacingDeckId = extraOptions?.flashReplaceDeckId;
        const replacingDeck = replacingDeckId ? newDecks.find((d) => d.id === replacingDeckId) : undefined;

        const deckId = replacingDeckId ?? newId('deck');
        const deckName = (extraOptions?.flashDeckName?.trim())
          || replacingDeck?.name
          || (extraOptions?.flashFocus?.trim().slice(0, 30))
          || `덱 ${newDecks.length + 1}`;
        const deck: FlashcardDeck = {
          id: deckId,
          name: deckName,
          focus: extraOptions?.flashFocus || replacingDeck?.focus,
          cardTypes: extraOptions?.flashCardTypes && extraOptions.flashCardTypes.length > 0
            ? extraOptions.flashCardTypes
            : replacingDeck?.cardTypes,
          level: levelOverride ?? replacingDeck?.level ?? 'standard',
          createdAt: replacingDeck?.createdAt ?? Date.now(),
        };

        const aiCards: Flashcard[] = (data.structured as Array<{ front: string; back: string; concept?: string }>)
          .filter((c) => c && typeof c.front === 'string' && typeof c.back === 'string' && c.front.trim() && c.back.trim())
          .map((c) => ({
            id: newId('fc'),
            front: c.front.trim(),
            back: c.back.trim(),
            concept: c.concept?.trim() || undefined,
            ease: 2.3,
            intervalDays: 1,
            dueAt: Date.now(),
            reviewsCount: 0,
            source: 'ai',
            deckId,
          }));

        // 해당 덱의 AI 카드만 교체, 해당 덱 내 사용자 카드는 보존. 다른 덱 카드는 그대로.
        const keptCards = notebook.flashcards.filter((c) =>
          c.deckId !== deckId || c.source === 'user'
        );
        newFlashcards = [...aiCards, ...keptCards];

        // 덱 메타 업데이트(덮어쓰기 or 추가)
        const idx = newDecks.findIndex((d) => d.id === deckId);
        if (idx >= 0) {
          newDecks = newDecks.map((d) => d.id === deckId ? deck : d);
        } else {
          newDecks = [...newDecks, deck];
        }
      }
      onChange({
        ...notebook,
        lensOutputs: { ...notebook.lensOutputs, [lens]: newOutput },
        quizItems: newQuiz,
        flashcards: newFlashcards,
        flashcardDecks: newDecks,
      });
      setActiveLens(lens);
    } catch {
      toast({ title: '네트워크 오류', description: '연결을 확인하고 다시 시도해주세요.', variant: 'destructive' });
    }
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
    // 퀴즈·플래시카드는 설정 단계가 필요하므로 자동 생성하지 않음 — LensSoloView 의 "만들기" 버튼으로 진입.
    if (!existing && lens !== 'quiz' && lens !== 'flashcards') generate(lens);
  };

  const activeOutput = activeLens ? notebook.lensOutputs[activeLens] : undefined;
  const activeLoading = activeLens ? loadingLens === activeLens : false;
  const anyOutput = Object.values(notebook.lensOutputs).some((v) => !!v);

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      <div className="border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 flex items-center flex-wrap gap-1.5">
        <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 shrink-0 pl-2 pr-1">스튜디오</h3>
        {LENSES.map((l) => {
          // 퀴즈 위치에서는 [퀴즈 | 오답노트] 세그먼트 칩 하나로 출력
          if (l.id === 'quiz') {
            const quizActive = activeLens === 'quiz' && quizSubView === 'quiz';
            const wrongActive = activeLens === 'quiz' && quizSubView === 'wrong';
            const loading = loadingLens === 'quiz';
            const wrongCount = notebook.wrongAnswers.length;
            return (
              <div
                key="quiz-wrong"
                className={cn(
                  'inline-flex items-stretch rounded-full border text-[11px] font-semibold overflow-hidden transition-colors',
                  (quizActive || wrongActive)
                    ? 'border-indigo-600'
                    : 'border-slate-200 dark:border-slate-700',
                )}
              >
                <button
                  onClick={() => { setQuizSubView('quiz'); handleLensClick('quiz'); }}
                  disabled={loading}
                  title={l.hint}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 transition-colors',
                    quizActive
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-indigo-700',
                    loading && 'cursor-wait opacity-70',
                  )}
                >
                  {loading ? <span className="study-shimmer h-3 w-3 rounded-full" /> : <Target className="h-3 w-3" />}
                  <span>퀴즈</span>
                </button>
                <div className={cn('w-px', (quizActive || wrongActive) ? 'bg-indigo-400/50' : 'bg-slate-200 dark:bg-slate-700')} />
                <button
                  onClick={() => { setActiveLens('quiz'); setQuizSubView('wrong'); }}
                  title={`오답 ${wrongCount}개`}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 transition-colors',
                    wrongActive
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-indigo-700',
                  )}
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>오답노트</span>
                  {wrongCount > 0 && (
                    <span className={cn('rounded-full px-1 text-[9.5px] tabular-nums',
                      wrongActive ? 'bg-white/20' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300')}>
                      {wrongCount}
                    </span>
                  )}
                </button>
              </div>
            );
          }

          const Icon = l.icon;
          const existing = notebook.lensOutputs[l.id];
          const done = !!existing;
          const loading = loadingLens === l.id;
          const active = activeLens === l.id;
          return (
            <button
              key={l.id}
              onClick={() => handleLensClick(l.id)}
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
              {loading ? <span className="study-shimmer h-3 w-3 rounded-full" /> : <Icon className="h-3 w-3" />}
              <span>{l.label}</span>
            </button>
          );
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
        ) : activeLens === 'quiz' && quizSubView === 'wrong' ? (
          <WrongNoteView notebook={notebook} onChange={onChange} />
        ) : (
          <LensSoloView
            lens={activeLens}
            output={activeOutput}
            loading={activeLoading}
            notebook={notebook}
            onChange={onChange}
            onJumpToPage={onJumpToPage}
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
  lens, output, loading, notebook, onChange, onJumpToPage, onStartSession, expertA, expertB, onGenerate,
}: {
  lens: StudyLens;
  output: LensOutput | undefined;
  loading: boolean;
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  onJumpToPage?: (page: number) => void;
  onStartSession: (opts?: { filter?: 'saved' | 'deck'; deckId?: string }) => void;
  expertA?: import('@/types/expert').Expert;
  expertB?: import('@/types/expert').Expert;
  onGenerate: (lens: StudyLens, tone?: StudyTone, level?: StudyLevel, extra?: {
    count?: number;
    useWeakConcepts?: boolean;
    flashDeckName?: string;
    flashFocus?: string;
    flashCardTypes?: FlashcardCardType[];
    flashReplaceDeckId?: string;
  }) => void;
}) {
  const [showQuizConfig, setShowQuizConfig] = useState(false);
  const [showFlashConfig, setShowFlashConfig] = useState(false);
  const [flashDeckEditing, setFlashDeckEditing] = useState<FlashcardDeck | null>(null);

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

  // 플래시카드 미생성 상태: "플래시카드 만들기" CTA
  if (lens === 'flashcards' && !output) {
    return (
      <>
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40 mb-3">
            <Layers className="h-5 w-5 text-indigo-600" strokeWidth={1.8} />
          </div>
          <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-1">플래시카드 만들기</p>
          <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
            자료에서 앞뒷면 암기 카드를 자동 추출합니다.<br />
            카드 수를 먼저 선택하세요.
          </p>
          <button
            onClick={() => setShowFlashConfig(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-[12.5px] font-semibold hover:bg-slate-800 dark:hover:bg-white transition-colors"
          >
            <Layers className="h-3.5 w-3.5" /> 플래시카드 생성하기
          </button>
        </div>
        {showFlashConfig && (
          <FlashcardConfigModal
            onSubmit={(cfg) => {
              setShowFlashConfig(false);
              onGenerate('flashcards', undefined, cfg.level, {
                count: cfg.count,
                flashDeckName: cfg.name,
                flashFocus: cfg.focus,
                flashCardTypes: cfg.cardTypes,
              });
            }}
            onClose={() => setShowFlashConfig(false)}
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
      ) : lens === 'flashcards' ? (
        <FlashcardDeckView
          notebook={notebook}
          onChange={onChange}
          onStartSession={(deckId) => onStartSession(deckId ? { filter: 'deck', deckId } : undefined)}
          onStartSaved={() => onStartSession({ filter: 'saved' })}
          onCreateNew={() => { setFlashDeckEditing(null); setShowFlashConfig(true); }}
          onRegenerate={(deck) => { setFlashDeckEditing(deck); setShowFlashConfig(true); }}
        />
      ) : lens === 'keypoints' ? (
        <KeypointsLayout content={output.content} />
      ) : lens === 'mindmap' ? (
        <div className="h-[min(70vh,720px)]">
          <MindmapCanvas
            content={output.content}
            meta={(output.meta?.structured ?? undefined) as MindmapMeta | undefined}
            notebook={notebook}
            onChange={onChange}
            onJumpToPage={onJumpToPage}
            onGenerateFromNode={(kind, node) => {
              if (kind === 'quiz') {
                onGenerate('quiz', undefined, undefined, { count: 3 });
                // note: 현재 quiz 생성은 전체 소스 기반. "노드 범위" 는 후속 업그레이드에서 api 옵션으로 확장 예정.
              } else if (kind === 'flashcard') {
                onGenerate('flashcards', undefined, undefined, { count: 1 });
              }
              void node; // 추후: scope: { nodeId, label, summary } 를 API 로 전달
            }}
          />
        </div>
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
      {showFlashConfig && lens === 'flashcards' && (
        <FlashcardConfigModal
          initial={flashDeckEditing ? {
            name: flashDeckEditing.name,
            focus: flashDeckEditing.focus,
            cardTypes: flashDeckEditing.cardTypes,
            level: flashDeckEditing.level,
          } : undefined}
          onSubmit={(cfg) => {
            const editingId = flashDeckEditing?.id;
            setShowFlashConfig(false);
            setFlashDeckEditing(null);
            onGenerate('flashcards', undefined, cfg.level, {
              count: cfg.count,
              flashDeckName: cfg.name,
              flashFocus: cfg.focus,
              flashCardTypes: cfg.cardTypes,
              flashReplaceDeckId: editingId,
            });
          }}
          onClose={() => { setShowFlashConfig(false); setFlashDeckEditing(null); }}
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
  onStartSession: (opts?: { filter?: 'saved' | 'deck'; deckId?: string }) => void;
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
            <div className="h-[420px]">
              <MindmapCanvas
                content={output.content}
                meta={(output.meta?.structured ?? undefined) as MindmapMeta | undefined}
                notebook={notebook}
                onChange={onChange}
              />
            </div>
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

/* ── 플래시카드 설정 모달 ── */
export interface FlashcardConfig {
  count: number;
  name: string;
  focus: string;
  cardTypes: FlashcardCardType[];
  level: StudyLevel;
}

function FlashcardConfigModal({
  onSubmit, onClose, initial,
}: {
  onSubmit: (cfg: FlashcardConfig) => void;
  onClose: () => void;
  initial?: Partial<FlashcardConfig>;
}) {
  const [count, setCount] = useState<number>(initial?.count ?? 10);
  const [name, setName] = useState<string>(initial?.name ?? '');
  const [focus, setFocus] = useState<string>(initial?.focus ?? '');
  const [cardTypes, setCardTypes] = useState<FlashcardCardType[]>(initial?.cardTypes ?? []);
  const [level, setLevel] = useState<StudyLevel>(initial?.level ?? 'standard');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const counts: number[] = [5, 10, 15, 20, 30];
  const allTypes: FlashcardCardType[] = ['definition', 'example', 'comparison', 'mechanism'];

  const toggleType = (t: FlashcardCardType) => {
    setCardTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            <h3 className="text-[14px] font-bold text-slate-900 dark:text-slate-100">새 플래시카드 덱</h3>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* 덱 이름 */}
          <div>
            <label className="text-[11.5px] font-semibold text-slate-600 dark:text-slate-300">덱 이름 <span className="text-slate-400 font-normal">(선택)</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="비워두면 AI 가 자동으로 이름 지어요"
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[12.5px] outline-none focus:border-indigo-400"
            />
          </div>

          {/* 범위/주제 */}
          <div>
            <label className="text-[11.5px] font-semibold text-slate-600 dark:text-slate-300">범위·주제 <span className="text-slate-400 font-normal">(선택)</span></label>
            <textarea
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder='예: "간의 해독 작용과 단백질 합성 위주" / "pp.12-20만"'
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[12.5px] outline-none focus:border-indigo-400 resize-none"
            />
            <p className="mt-1 text-[10.5px] text-slate-400">비워두면 전체 자료에서 골고루 뽑아요</p>
          </div>

          {/* 카드 유형 */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11.5px] font-semibold text-slate-600 dark:text-slate-300">카드 유형 <span className="text-slate-400 font-normal">(선택 · 다중)</span></label>
              {cardTypes.length === 0 && (
                <span className="text-[10px] text-slate-400">전체 골고루</span>
              )}
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {allTypes.map((t) => {
                const meta = FLASHCARD_CARD_TYPE_META[t];
                const active = cardTypes.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1.5 text-left transition-colors',
                      active
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400',
                    )}
                  >
                    <div className={cn('text-[11.5px] font-semibold', active ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200')}>
                      {meta.label}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{meta.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 카드 수 */}
          <div>
            <label className="text-[11.5px] font-semibold text-slate-600 dark:text-slate-300">카드 수</label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {counts.map((n) => {
                const active = count === n;
                return (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={cn(
                      'inline-flex items-center rounded-full border px-3.5 py-1 text-[11.5px] font-semibold transition-colors',
                      active
                        ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400',
                    )}
                  >
                    {n}장
                  </button>
                );
              })}
            </div>
          </div>

          {/* 난이도 */}
          <div>
            <label className="text-[11.5px] font-semibold text-slate-600 dark:text-slate-300">난이도</label>
            <div className="mt-1.5 flex gap-1.5">
              {(['basic', 'standard', 'advanced'] as StudyLevel[]).map((lv) => {
                const active = level === lv;
                const label = lv === 'basic' ? '기초' : lv === 'advanced' ? '심화' : '표준';
                return (
                  <button
                    key={lv}
                    onClick={() => setLevel(lv)}
                    className={cn(
                      'flex-1 rounded-full border px-3 py-1 text-[11.5px] font-semibold transition-colors',
                      active
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-[12px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            취소
          </button>
          <button
            onClick={() => onSubmit({ count, name: name.trim(), focus: focus.trim(), cardTypes, level })}
            className="rounded-md bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 text-[12px] font-semibold"
          >
            생성하기
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 플래시카드 덱 뷰 ── */
/**
 * 덱 리스트 뷰.
 * - notebook.flashcardDecks + cards 에서 덱별로 그룹핑
 * - 덱 없는 카드는 "기본" 덱(id: 'default')으로 묶음
 * - 덱마다 확장/접힘, 공부 시작, 다시 만들기, 삭제
 */
function FlashcardDeckView({
  notebook, onChange, onStartSession, onStartSaved, onCreateNew, onRegenerate,
}: {
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  onStartSession: (deckId?: string) => void;
  onStartSaved: () => void;
  onCreateNew: () => void;
  onRegenerate: (deck: FlashcardDeck) => void;
}) {
  const cards = notebook.flashcards;
  const decks = notebook.flashcardDecks ?? [];
  const now = Date.now();

  // 덱별로 카드 그룹핑
  const grouped: Array<{ deck: FlashcardDeck | null; cards: Flashcard[] }> = [];
  const defaultCards = cards.filter((c) => !c.deckId);
  if (defaultCards.length > 0) grouped.push({ deck: null, cards: defaultCards });
  for (const d of decks) {
    const dCards = cards.filter((c) => c.deckId === d.id);
    grouped.push({ deck: d, cards: dCards });
  }
  grouped.sort((a, b) => {
    const aT = a.deck?.createdAt ?? 0;
    const bT = b.deck?.createdAt ?? 0;
    return bT - aT;
  });

  const [menuOpenKey, setMenuOpenKey] = useState<string | null>(null);

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40 mb-3">
          <Layers className="h-5 w-5 text-indigo-500" strokeWidth={1.8} />
        </div>
        <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-1">플래시카드가 없어요</p>
        <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mb-4">
          자료에서 암기 카드를 자동으로 추출합니다.
        </p>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-[12.5px] font-semibold hover:bg-slate-800 dark:hover:bg-white"
        >
          <Layers className="h-3.5 w-3.5" /> 첫 덱 만들기
        </button>
      </div>
    );
  }

  const deleteDeck = (deck: FlashcardDeck) => {
    if (!confirm(`"${deck.name}" 덱을 삭제할까요? 덱 안의 AI 카드도 함께 삭제됩니다.`)) return;
    const keptCards = cards.filter((c) => c.deckId !== deck.id || c.source === 'user');
    const nextDecks = decks.filter((d) => d.id !== deck.id);
    onChange({ ...notebook, flashcards: keptCards, flashcardDecks: nextDecks });
  };

  return (
    <div className="space-y-3">
      {/* 새 덱 버튼 */}
      <button
        onClick={onCreateNew}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 px-3 py-2 text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors"
      >
        <Layers className="h-3.5 w-3.5" /> 새 플래시카드 덱 만들기
      </button>

      {/* 덱 리스트 — 한 줄 카드 + 공부 시작 버튼 */}
      {grouped.map(({ deck, cards: dCards }) => {
        const key = deck?.id ?? 'default';
        const name = deck?.name ?? '기본';
        const dueCount = dCards.filter((c) => c.dueAt <= now).length;
        const aiCount = dCards.filter((c) => c.source === 'ai').length;
        const userCount = dCards.filter((c) => c.source === 'user').length;

        return (
          <div
            key={key}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 flex items-center gap-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/60 shrink-0">
              <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-bold text-slate-900 dark:text-slate-100 truncate">
                {name}
                {dueCount > 0 && (
                  <span className="ml-1.5 text-[10.5px] font-semibold text-indigo-600 dark:text-indigo-300">· 복습 {dueCount}장</span>
                )}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate tabular-nums">
                {dCards.length}장
                {aiCount > 0 && ` · AI ${aiCount}`}
                {userCount > 0 && ` · 하이라이트 ${userCount}`}
                {deck?.createdAt && ` · ${timeAgo(deck.createdAt)}`}
              </p>
            </div>

            <button
              onClick={() => onStartSession(deck?.id)}
              disabled={dueCount === 0}
              className={cn(
                'shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-colors',
                dueCount === 0
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white',
              )}
              title={dueCount === 0 ? '모든 카드가 복습 예약 상태' : '공부 시작'}
            >
              <Play className="h-3 w-3" /> 시작
            </button>

            {deck && (
              <div className="relative shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpenKey(menuOpenKey === key ? null : key); }}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900"
                  aria-label="덱 메뉴"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
                {menuOpenKey === key && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setMenuOpenKey(null)} />
                    <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1 z-30">
                      <button
                        onClick={() => { setMenuOpenKey(null); onRegenerate(deck); }}
                        className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <RefreshCw className="h-3 w-3" /> 다시 만들기
                      </button>
                      <button
                        onClick={() => { setMenuOpenKey(null); deleteDeck(deck); }}
                        className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <X className="h-3 w-3" /> 덱 삭제
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* 저장한 카드 섹션 */}
      <SavedCardsSection
        notebook={notebook}
        onChange={onChange}
        onStartSaved={onStartSaved}
      />
    </div>
  );
}

/* ── 저장한 카드 섹션 ── */
function SavedCardsSection({
  notebook, onChange, onStartSaved,
}: {
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  onStartSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const saved = notebook.flashcards.filter((c) => c.saved === true)
    .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));

  if (saved.length === 0) return null;

  const previewLimit = 8;
  const preview = saved.slice(0, previewLimit);
  const rest = Math.max(0, saved.length - previewLimit);

  const unsave = (id: string) => {
    onChange({
      ...notebook,
      flashcards: notebook.flashcards.map((c) => c.id === id ? { ...c, saved: false, savedAt: undefined } : c),
    });
  };

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-amber-100/40 dark:hover:bg-amber-950/30"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/60 shrink-0">
          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-bold text-amber-900 dark:text-amber-200 truncate">
            저장한 카드 <span className="tabular-nums">{saved.length}장</span>
          </p>
          <p className="text-[10px] text-amber-700/80 dark:text-amber-300/70 truncate">
            나중에 다시 보려고 북마크한 카드들
          </p>
        </div>
        <ChevronDown className={cn('h-3.5 w-3.5 text-amber-600 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-3 pb-3 border-t border-amber-200/70 dark:border-amber-900/40">
          <div className="mt-2.5 flex gap-2">
            <button
              onClick={onStartSaved}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-white px-3 py-1.5 text-[11.5px] font-semibold"
            >
              <Play className="h-3 w-3" /> 저장한 카드로 세션 시작
            </button>
          </div>

          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wide text-amber-700/70 dark:text-amber-300/70 mb-1 px-0.5">미리보기</p>
            <ul className="space-y-1">
              {preview.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-2 rounded-md bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/30 px-2.5 py-1.5"
                  title={`${c.front}\n→ ${c.back}`}
                >
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                  <span className="flex-1 truncate text-[11.5px] text-slate-700 dark:text-slate-200">{c.front}</span>
                  {c.concept && (
                    <span className="shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9.5px] text-slate-500">{c.concept}</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); unsave(c.id); }}
                    className="shrink-0 h-5 w-5 flex items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                    title="저장 해제"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
            {rest > 0 && (
              <p className="mt-1.5 text-[10.5px] text-amber-700/70 dark:text-amber-300/70 text-center">…외 {rest}장</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QuizPreview({
  items, onStartSession, onRegenerate,
}: {
  items: StudyQuizItem[];
  onStartSession: (opts?: { filter?: 'saved' | 'deck'; deckId?: string }) => void;
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

/* ── 오답노트 뷰 ── */
function WrongNoteView({
  notebook, onChange,
}: {
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
}) {
  const items = notebook.wrongAnswers;
  const removeOne = (id: string) => {
    onChange({ ...notebook, wrongAnswers: notebook.wrongAnswers.filter((w) => w.id !== id) });
  };
  const clearAll = () => {
    if (!confirm('오답노트를 모두 비울까요?')) return;
    onChange({ ...notebook, wrongAnswers: [] });
  };

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/40 mb-3">
          <RotateCcw className="h-5 w-5 text-rose-500" strokeWidth={1.8} />
        </div>
        <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 mb-1">오답노트가 비어있어요</p>
        <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
          퀴즈에서 틀린 문제는 자동으로 여기에 모여요.<br />
          시간이 지난 뒤 다시 풀어보면 오래 기억에 남아요.
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-[13px] font-bold text-slate-900 dark:text-slate-100">오답노트</h4>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400">총 {items.length}문항 · 개념을 다시 정리해보세요</p>
        </div>
        <button
          onClick={clearAll}
          className="text-[11px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
        >
          전체 비우기
        </button>
      </div>
      <ul className="space-y-2">
        {items.map((w) => (
          <li
            key={w.id}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                {w.question}
              </p>
              <button
                onClick={() => removeOne(w.id)}
                className="shrink-0 text-slate-400 hover:text-rose-500"
                aria-label="이 항목 제거"
                title="이 항목 제거"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-1 text-[11.5px]">
              <div className="flex items-start gap-1.5">
                <span className="shrink-0 rounded bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 px-1.5 py-0.5 text-[10px] font-semibold">내 답</span>
                <span className="text-slate-600 dark:text-slate-300">{w.chosen}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="shrink-0 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-semibold">정답</span>
                <span className="text-slate-700 dark:text-slate-200 font-medium">{w.correct}</span>
              </div>
            </div>
            {w.explanation && (
              <p className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2 text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {w.explanation}
              </p>
            )}
            {w.concept && (
              <div className="mt-2 text-[10.5px] text-slate-500 dark:text-slate-400">
                관련 개념: <span className="font-medium text-slate-700 dark:text-slate-300">{w.concept}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
