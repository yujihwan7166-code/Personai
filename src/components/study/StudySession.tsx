import { useState, useMemo, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X, Check, Star, Trophy, Layers, CircleAlert, ListChecks, Keyboard, ArrowRight } from 'lucide-react';
import type { StudyNotebook, Flashcard, StudyQuizItem, WrongAnswer } from '@/types/study';
import { newId } from '@/types/study';
import { StudyBtn } from './ui/primitives';
import { cn } from '@/lib/utils';

interface Props {
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  onClose: () => void;
  onSessionComplete: () => void;
  /** 'saved' = 저장한 카드만, 'deck' = 특정 플래시 덱, 'quizDeck' = 특정 퀴즈 덱, 없으면 전체. */
  filter?: 'saved' | 'deck' | 'quizDeck';
  /** filter='deck'/'quizDeck' 일 때의 덱 id. */
  deckId?: string;
}

type Phase = 'flashcard' | 'wrong' | 'quiz' | 'done';

export function StudySession({ notebook, onChange, onClose, onSessionComplete, filter, deckId }: Props) {
  const sessionCards = useMemo(
    () => {
      if (filter === 'quizDeck') return [];
      const scoped = notebook.flashcards.filter((c) => {
        if (filter === 'saved') return c.saved === true;
        if (filter === 'deck') return c.deckId === deckId;
        return true;
      });
      return scoped.slice(0, 20);
    },
    [notebook.flashcards, filter, deckId],
  );
  const wrongToReview = useMemo(
    () => (filter ? [] : notebook.wrongAnswers.slice(0, 5)),
    [notebook.wrongAnswers, filter],
  );
  const quizItems = useMemo(
    () => {
      if (filter === 'quizDeck') {
        const deck = (notebook.quizDecks ?? []).find((d) => d.id === deckId);
        return deck ? deck.items : [];
      }
      if (filter) return [];
      // 레거시: 덱 미채택 시 quizItems 사용. 마이그레이션 후엔 빈 배열.
      return notebook.quizItems.slice(0, 5);
    },
    [notebook.quizItems, notebook.quizDecks, filter, deckId],
  );

  const [phase, setPhase] = useState<Phase>(() => {
    if (sessionCards.length > 0) return 'flashcard';
    if (wrongToReview.length > 0) return 'wrong';
    if (quizItems.length > 0) return 'quiz';
    return 'done';
  });
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [savedInSession, setSavedInSession] = useState(0);

  const total = sessionCards.length + wrongToReview.length + quizItems.length;
  const done =
    (phase === 'flashcard' ? 0 : sessionCards.length) +
    (phase === 'wrong' || phase === 'flashcard' ? 0 : wrongToReview.length) +
    (phase === 'done' ? quizItems.length : phase === 'quiz' ? index : 0) +
    (phase === 'wrong' ? index : 0) +
    (phase === 'flashcard' ? index : 0);
  const progress = total === 0 ? 1 : done / total;
  const phaseMeta = getPhaseMeta(phase);
  const PhaseIcon = phaseMeta.icon;
  const remaining = Math.max(0, total - done);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (phase === 'flashcard') {
        if (e.key === ' ') {
          e.preventDefault();
          setFlipped((f) => !f);
        }
        if (flipped) {
          if (['1', '2', '3'].includes(e.key)) {
            handleFlashcardRating(parseInt(e.key, 10) as 1 | 2 | 3, false);
          } else if (e.key === '4' || e.key === 's' || e.key === 'S') {
            handleFlashcardRating(3, true);
          }
        }
        if (e.key === 'b' || e.key === 'B') {
          // 판정 전/후 언제든 저장 토글
          e.preventDefault();
          toggleSaveCurrent();
        }
      }
      if (phase === 'wrong' || phase === 'quiz') {
        const item = phase === 'wrong' ? wrongToReviewAsQuiz(wrongToReview[index]) : quizItems[index];
        if (!item) return;
        if (selected === null && /^[1-4]$/.test(e.key)) {
          const choiceIndex = Number(e.key) - 1;
          if (choiceIndex < item.choices.length) {
            e.preventDefault();
            setSelected(choiceIndex);
            handleQuizAnswer(item, choiceIndex);
          }
        } else if (selected !== null && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          nextQuiz();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /** 현재 카드의 saved 플래그 토글 (판정 없음). */
  const toggleSaveCurrent = () => {
    const card = sessionCards[index];
    if (!card) return;
    const next: Flashcard = {
      ...card,
      saved: !card.saved,
      savedAt: card.saved ? card.savedAt : Date.now(),
    };
    if (!card.saved) setSavedInSession((n) => n + 1);
    onChange({
      ...notebook,
      flashcards: notebook.flashcards.map((c) => (c.id === card.id ? next : c)),
    });
  };

  /** 판정 1=몰라요, 2=애매해요, 3=알아요. alsoSave=true 면 saved 플래그 함께 켬. */
  const handleFlashcardRating = (rating: 1 | 2 | 3, alsoSave: boolean) => {
    const card = sessionCards[index];
    if (!card) return;
    const dayMs = 86400000;
    let nextInterval = card.intervalDays;
    let nextEase = card.ease;
    if (rating === 1) {
      // 카드 판정값은 남겨두되, 화면에서는 날짜 기반 루틴으로 강조하지 않는다.
      nextInterval = 0; // dueAt 을 짧게
      nextEase = Math.max(1.3, card.ease - 0.2);
    } else if (rating === 2) {
      // 애매해요 → 1일 뒤
      nextInterval = Math.max(1, Math.ceil(card.intervalDays * 1.2));
      nextEase = Math.max(1.3, card.ease - 0.05);
    } else {
      // 알아요 → 정상 간격
      nextInterval = Math.max(1, Math.ceil(card.intervalDays * card.ease));
    }
    const shortReviewMs = 10 * 60 * 1000; // 10분
    const dueAt = rating === 1
      ? Date.now() + shortReviewMs
      : Date.now() + nextInterval * dayMs;
    const wasSaved = card.saved === true;
    const nowSaved = alsoSave ? true : wasSaved;
    const updatedCard: Flashcard = {
      ...card,
      ease: nextEase,
      intervalDays: nextInterval,
      dueAt,
      reviewsCount: card.reviewsCount + 1,
      lastReviewedAt: Date.now(),
      saved: nowSaved,
      savedAt: (alsoSave && !wasSaved) ? Date.now() : card.savedAt,
    };
    if (alsoSave && !wasSaved) setSavedInSession((n) => n + 1);
    onChange({
      ...notebook,
      flashcards: notebook.flashcards.map((c) => (c.id === card.id ? updatedCard : c)),
    });
    setFlipped(false);
    if (index + 1 < sessionCards.length) {
      setIndex(index + 1);
    } else {
      setIndex(0);
      setPhase(wrongToReview.length > 0 ? 'wrong' : quizItems.length > 0 ? 'quiz' : 'done');
    }
  };

  const handleQuizAnswer = (item: StudyQuizItem, chosenIdx: number) => {
    setTotalAnswered((t) => t + 1);
    const correct = chosenIdx === item.answerIndex;
    if (correct) {
      setCorrectCount((c) => c + 1);
    }

    if (phase === 'wrong') {
      const currentWrong = wrongToReview[index];
      if (!currentWrong) return;
      onChange({
        ...notebook,
        wrongAnswers: notebook.wrongAnswers.map((wrong) => (
          wrong.id === currentWrong.id
            ? { ...wrong, chosen: item.choices[chosenIdx], reviewedCount: wrong.reviewedCount + 1 }
            : wrong
        )),
      });
      return;
    }

    if (!correct) {
      const wrong: WrongAnswer = {
        id: newId('w'),
        quizItemId: item.id,
        question: item.question,
        correct: item.choices[item.answerIndex],
        chosen: item.choices[chosenIdx],
        explanation: item.explanation,
        concept: item.concept,
        missedAt: Date.now(),
        reviewedCount: 0,
      };
      onChange({ ...notebook, wrongAnswers: [wrong, ...notebook.wrongAnswers] });
    }
  };

  const nextQuiz = () => {
    setSelected(null);
    if (phase === 'wrong') {
      if (index + 1 < wrongToReview.length) setIndex(index + 1);
      else {
        setIndex(0);
        setPhase(quizItems.length > 0 ? 'quiz' : 'done');
      }
    } else if (phase === 'quiz') {
      if (index + 1 < quizItems.length) setIndex(index + 1);
      else setPhase('done');
    }
  };

  // 퀴즈 덱 세션 완료 시 덱 통계 업데이트 (1회)
  const statsSavedRef = useRef(false);
  useEffect(() => {
    if (phase !== 'done') return;
    if (filter !== 'quizDeck' || !deckId) return;
    if (statsSavedRef.current) return;
    if (totalAnswered === 0) return;
    statsSavedRef.current = true;
    const decks = notebook.quizDecks ?? [];
    const nextDecks = decks.map((d) => d.id === deckId ? {
      ...d,
      lastPlayedAt: Date.now(),
      playCount: (d.playCount ?? 0) + 1,
      lastScore: { correct: correctCount, total: totalAnswered },
      updatedAt: Date.now(),
    } : d);
    onChange({ ...notebook, quizDecks: nextDecks });
  }, [phase, filter, deckId, totalAnswered, correctCount, notebook, onChange]);

  const bg = 'bg-slate-900';

  if (phase === 'done') {
    const accuracy = totalAnswered === 0 ? null : correctCount / totalAnswered;
    const hasStudied = total > 0 || totalAnswered > 0;
    return (
      <div className={`fixed inset-0 z-[100] ${bg} flex flex-col items-center justify-center text-white p-6`}>
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/25">
          <Trophy className="h-8 w-8" strokeWidth={1.7} />
        </div>
        <h2 className="mb-2 text-center text-2xl font-bold">
          {hasStudied ? '확인 완료' : '확인할 항목이 없어요'}
        </h2>
        <p className="mb-5 max-w-md text-center text-sm leading-relaxed text-slate-300">
          {hasStudied
            ? '선택한 카드와 문제를 확인했어요.'
            : '스튜디오에서 노트, 퀴즈, 플래시카드를 만들면 여기에서 바로 확인할 수 있어요.'}
        </p>
        <div className="mb-5 grid w-full max-w-xl grid-cols-3 gap-2">
          <SessionSummaryCard icon={<Layers className="h-4 w-4" />} label="카드 확인" value={`${sessionCards.length}장`} />
          <SessionSummaryCard icon={<CircleAlert className="h-4 w-4" />} label="오답 재도전" value={`${wrongToReview.length}개`} />
          <SessionSummaryCard icon={<ListChecks className="h-4 w-4" />} label="문제 풀이" value={`${totalAnswered}문제`} />
        </div>
        {savedInSession > 0 && (
          <p className="inline-flex items-center gap-1.5 mb-5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 px-3 py-1 text-[12px] font-semibold">
            <Star className="h-3 w-3 fill-current" /> 이번 세션에서 {savedInSession}장 저장함
          </p>
        )}
        {accuracy != null && (
          <div className="mb-8 text-center">
            <p className="text-5xl font-bold text-emerald-400 tabular-nums">
              {Math.round(accuracy * 100)}%
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {accuracy >= 0.8 ? '이 자료 이해도가 좋아요' : '헷갈린 개념을 다시 확인해보세요'}
            </p>
          </div>
        )}
        <StudyBtn
          variant="primary"
          size="lg"
          className="min-w-36"
          onClick={() => {
            if (hasStudied) onSessionComplete();
            onClose();
          }}
        >
          {hasStudied ? '완료하고 닫기' : '자료로 돌아가기'}
        </StudyBtn>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[100] ${bg} text-white flex flex-col`}>
      <div className="border-b border-white/10 bg-slate-950/35 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white/60 transition-colors hover:bg-white/10 hover:text-white sm:h-8 sm:w-8"
          aria-label="세션 종료"
        >
          <X className="h-5 w-5" />
        </button>
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-bold ring-1', phaseMeta.tone)}>
                <PhaseIcon className="h-3.5 w-3.5" />
                {phaseMeta.label}
              </span>
              <span className="text-[11px] font-medium text-white/45">
                남은 항목 {remaining}개
              </span>
              <span className="hidden items-center gap-1 text-[10.5px] text-white/35 md:inline-flex">
                <Keyboard className="h-3 w-3" />
                {phase === 'flashcard' ? 'Space 뒤집기 · 1/2/3 판정 · B 저장' : '1-4 선택 · Enter 다음'}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-indigo-400 transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
        </div>
          <span className="shrink-0 rounded-full bg-white/8 px-2.5 py-1 text-xs font-bold text-white/70 tabular-nums">
            {done + 1}/{total}
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        {phase === 'flashcard' && sessionCards[index] && (
          <FlashcardView
            card={sessionCards[index]}
            flipped={flipped}
            onFlip={() => setFlipped(!flipped)}
            onRate={handleFlashcardRating}
            onToggleSave={toggleSaveCurrent}
          />
        )}
        {(phase === 'wrong' || phase === 'quiz') && (
          <QuizView
            item={
              phase === 'wrong'
                ? wrongToReviewAsQuiz(wrongToReview[index])
                : quizItems[index]
            }
            selected={selected}
            onSelect={(idx, item) => {
              if (selected !== null) return;
              setSelected(idx);
              handleQuizAnswer(item, idx);
            }}
            onNext={nextQuiz}
          />
        )}
      </div>
    </div>
  );
}

function wrongToReviewAsQuiz(w: WrongAnswer): StudyQuizItem {
  const distractors = [w.chosen, '잘 모르겠어요', '다시 보기']
    .map((choice) => choice.trim())
    .filter((choice) => choice && choice !== w.correct);
  const choices = shuffleWithSeed(
    Array.from(new Set([w.correct, ...distractors])).slice(0, 4),
    w.id || w.quizItemId,
  );
  return {
    id: w.quizItemId,
    question: w.question,
    choices,
    answerIndex: Math.max(0, choices.indexOf(w.correct)),
    explanation: w.explanation,
    concept: w.concept,
  };
}

function shuffleWithSeed<T>(items: T[], seed: string): T[] {
  const next = items.slice();
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  for (let i = next.length - 1; i > 0; i -= 1) {
    hash = Math.imul(hash ^ (hash >>> 13), 1103515245) + 12345;
    const j = Math.abs(hash) % (i + 1);
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function getPhaseMeta(phase: Phase): {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: string;
} {
  if (phase === 'flashcard') {
    return {
      label: '플래시카드 확인',
      icon: Layers,
      tone: 'bg-indigo-400/15 text-indigo-200 ring-indigo-300/20',
    };
  }
  if (phase === 'wrong') {
    return {
      label: '오답 재도전',
      icon: CircleAlert,
      tone: 'bg-rose-400/15 text-rose-200 ring-rose-300/20',
    };
  }
  if (phase === 'quiz') {
    return {
      label: '퀴즈 풀이',
      icon: ListChecks,
      tone: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/20',
    };
  }
  return {
    label: '완료',
    icon: Trophy,
    tone: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/20',
  };
}

function SessionSummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-white/45">
        {icon}
        {label}
      </div>
      <p className="text-[18px] font-bold text-white tabular-nums">{value}</p>
    </div>
  );
}

function FlashcardView({
  card,
  flipped,
  onFlip,
  onRate,
  onToggleSave,
}: {
  card: Flashcard;
  flipped: boolean;
  onFlip: () => void;
  onRate: (r: 1 | 2 | 3, alsoSave: boolean) => void;
  onToggleSave: () => void;
}) {
  const isSaved = card.saved === true;
  return (
    <div className="w-full max-w-lg flex flex-col items-center">
      <div className="relative w-full aspect-[4/3] mb-6">
        {/* 우상단 저장 토글 (판정과 독립) */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSave(); }}
          className={cn(
            'absolute top-3 right-3 z-10 h-9 w-9 flex items-center justify-center rounded-full transition-all',
            isSaved
              ? 'bg-amber-400 text-white shadow-lg'
              : 'bg-white/80 text-slate-400 hover:bg-white hover:text-amber-500',
          )}
          aria-label={isSaved ? '저장 해제' : '저장'}
          title={isSaved ? '저장됨 (B로 해제)' : '저장 (B)'}
        >
          <Star className={cn('h-4 w-4', isSaved && 'fill-current')} />
        </button>

        <button
          onClick={onFlip}
          className="study-card-flip w-full h-full"
          aria-pressed={flipped}
        >
          <div className={cn('study-card-flip-inner', flipped && 'flipped')}>
            <div className="study-card-flip-face rounded-2xl bg-white text-slate-900 flex flex-col items-center justify-center p-8 text-center">
              <span className="text-[10px] uppercase tracking-wide text-slate-400 mb-3">앞면 · 질문</span>
              <p className="text-xl font-semibold">{card.front}</p>
              <span className="mt-6 text-[11px] text-slate-400">Space로 뒤집기</span>
            </div>
            <div className="study-card-flip-face back rounded-2xl bg-indigo-50 text-slate-900 flex flex-col items-center justify-center p-8 text-center">
              <span className="text-[10px] uppercase tracking-wide text-indigo-500 mb-3">뒷면 · 답</span>
              <p className="text-lg leading-relaxed">{card.back}</p>
            </div>
          </div>
        </button>
      </div>

      {flipped ? (
        <div className="grid grid-cols-4 gap-2 w-full">
          {[
            { r: 1 as const, label: '몰라요',   key: '1', color: 'bg-rose-500 hover:bg-rose-400',       hint: '10분 뒤 다시' },
            { r: 2 as const, label: '애매해요', key: '2', color: 'bg-amber-500 hover:bg-amber-400',     hint: '표시만 기록' },
            { r: 3 as const, label: '알아요',   key: '3', color: 'bg-emerald-500 hover:bg-emerald-400', hint: '정상 간격' },
          ].map((b) => (
            <button
              key={b.r}
              onClick={() => onRate(b.r, false)}
              className={cn('rounded-xl py-3 font-semibold transition-colors flex flex-col items-center justify-center', b.color)}
              title={b.hint}
            >
              <div className="text-[10px] opacity-80 tabular-nums">[{b.key}]</div>
              <div className="text-[14px]">{b.label}</div>
              <div className="text-[9.5px] opacity-75 mt-0.5">{b.hint}</div>
            </button>
          ))}
          <button
            onClick={() => onRate(3, true)}
            className={cn(
              'rounded-xl py-3 font-semibold transition-colors flex flex-col items-center justify-center',
              'bg-indigo-500 hover:bg-indigo-400',
            )}
            title="알아요 + 나중에 다시 볼 수 있도록 저장"
          >
            <div className="text-[10px] opacity-80 tabular-nums">[S]</div>
            <div className="text-[14px] flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-current" /> 저장
            </div>
            <div className="text-[9.5px] opacity-75 mt-0.5">알아요 + 북마크</div>
          </button>
        </div>
      ) : (
        <p className="text-sm text-white/60">답을 생각해보고 카드를 눌러 뒤집어보세요</p>
      )}
    </div>
  );
}

function QuizView({
  item,
  selected,
  onSelect,
  onNext,
}: {
  item: StudyQuizItem;
  selected: number | null;
  onSelect: (idx: number, item: StudyQuizItem) => void;
  onNext: () => void;
}) {
  const showResult = selected !== null;
  const pickedCorrect = selected === item.answerIndex;
  return (
    <div className="w-full max-w-2xl">
      {item.concept && (
        <p className="mb-2 inline-flex rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-semibold text-white/50 ring-1 ring-white/10">
          {item.concept}
        </p>
      )}
      <p className="mb-6 text-lg font-semibold leading-relaxed">{item.question}</p>
      <div className="space-y-2 mb-6">
        {item.choices.map((choice, i) => {
          const isCorrect = i === item.answerIndex;
          const isPicked = i === selected;
          return (
            <button
              key={i}
              onClick={() => onSelect(i, item)}
              disabled={selected !== null}
              className={cn(
                'flex min-h-12 w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all',
                !showResult && 'bg-white/5 border-white/10 hover:bg-white/10',
                showResult && isCorrect && 'bg-emerald-500/20 border-emerald-400 text-emerald-100',
                showResult && !isCorrect && isPicked && 'bg-red-500/20 border-red-400 text-red-100',
                showResult && !isCorrect && !isPicked && 'bg-white/5 border-white/10 opacity-50',
              )}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10 text-[11px] font-bold tabular-nums text-white/70">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 leading-relaxed">{choice}</span>
              {showResult && isCorrect && <Check className="mt-0.5 h-4 w-4 shrink-0" />}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <div className={cn(
          'mb-4 rounded-xl border p-4',
          pickedCorrect
            ? 'border-emerald-400/35 bg-emerald-500/10'
            : 'border-rose-400/35 bg-rose-500/10',
        )}>
          <p className="mb-1 text-xs font-bold text-white/55">
            {pickedCorrect ? '정답이에요' : `정답은 ${item.answerIndex + 1}번이에요`}
          </p>
          <p className="text-sm text-white/90">{item.explanation}</p>
        </div>
      )}
      {selected !== null && (
        <StudyBtn variant="primary" size="lg" onClick={onNext} className="w-full gap-2">
          다음
          <ArrowRight className="h-4 w-4" />
        </StudyBtn>
      )}
    </div>
  );
}
