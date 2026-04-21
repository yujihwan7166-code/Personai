import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Check, Star } from 'lucide-react';
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
  const now = Date.now();
  const dueCards = useMemo(
    () => {
      if (filter === 'quizDeck') return [];
      const scoped = notebook.flashcards.filter((c) => {
        if (filter === 'saved') return c.saved === true;
        if (filter === 'deck') return c.deckId === deckId;
        return true;
      });
      // 저장함 세션은 due 조건 무시(사용자가 골라둔 북마크라 언제든 복습 가능)
      const byDue = filter === 'saved' ? scoped : scoped.filter((c) => c.dueAt <= now);
      return byDue.slice(0, 20);
    },
    [notebook.flashcards, now, filter, deckId],
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
    if (dueCards.length > 0) return 'flashcard';
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

  const total = dueCards.length + wrongToReview.length + quizItems.length;
  const done =
    (phase === 'flashcard' ? 0 : dueCards.length) +
    (phase === 'wrong' || phase === 'flashcard' ? 0 : wrongToReview.length) +
    (phase === 'done' ? quizItems.length : phase === 'quiz' ? index : 0) +
    (phase === 'wrong' ? index : 0) +
    (phase === 'flashcard' ? index : 0);
  const progress = total === 0 ? 1 : done / total;

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
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /** 현재 카드의 saved 플래그 토글 (판정 없음). */
  const toggleSaveCurrent = () => {
    const card = dueCards[index];
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
    const card = dueCards[index];
    if (!card) return;
    const dayMs = 86400000;
    let nextInterval = card.intervalDays;
    let nextEase = card.ease;
    if (rating === 1) {
      // 몰라요 → 10분 뒤 다시 (due 세션에선 거의 즉시 재등장, 저장함 세션에선 그냥 기록)
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
    if (index + 1 < dueCards.length) {
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
    } else {
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
    return (
      <div className={`fixed inset-0 z-[100] ${bg} flex flex-col items-center justify-center text-white p-6`}>
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">오늘 세션 완료</h2>
        <p className="text-slate-300 text-sm mb-2">
          {dueCards.length}장 복습 · {wrongToReview.length}오답 재도전 · {totalAnswered}문제 풀이
        </p>
        {savedInSession > 0 && (
          <p className="inline-flex items-center gap-1.5 mb-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 px-3 py-1 text-[12px] font-semibold">
            <Star className="h-3 w-3 fill-current" /> 이번 세션에서 {savedInSession}장 저장함
          </p>
        )}
        {accuracy != null && (
          <div className="mb-8 text-center">
            <p className="text-5xl font-bold text-emerald-400 tabular-nums">
              {Math.round(accuracy * 100)}%
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {accuracy >= 0.8 ? '오늘 진도가 좋아요' : '이 개념들 내일 다시 만나요'}
            </p>
          </div>
        )}
        <StudyBtn
          variant="primary"
          size="lg"
          onClick={() => {
            onSessionComplete();
            onClose();
          }}
        >
          닫기
        </StudyBtn>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[100] ${bg} text-white flex flex-col`}>
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white p-2"
          aria-label="세션 종료"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1 mx-4 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-400 transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-xs text-white/60 tabular-nums">
          {done + 1}/{total}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        {phase === 'flashcard' && dueCards[index] && (
          <FlashcardView
            card={dueCards[index]}
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
  return {
    id: w.quizItemId,
    question: w.question,
    choices: [w.correct, w.chosen, '잘 모르겠어요', '다시 보기'],
    answerIndex: 0,
    explanation: w.explanation,
    concept: w.concept,
  };
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
            { r: 2 as const, label: '애매해요', key: '2', color: 'bg-amber-500 hover:bg-amber-400',     hint: '내일 다시' },
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
  return (
    <div className="w-full max-w-2xl">
      <p className="text-lg font-semibold mb-6 leading-relaxed">{item.question}</p>
      <div className="space-y-2 mb-6">
        {item.choices.map((choice, i) => {
          const isCorrect = i === item.answerIndex;
          const isPicked = i === selected;
          const showResult = selected !== null;
          return (
            <button
              key={i}
              onClick={() => onSelect(i, item)}
              disabled={selected !== null}
              className={cn(
                'w-full text-left rounded-xl px-4 py-3 text-sm transition-all border',
                !showResult && 'bg-white/5 border-white/10 hover:bg-white/10',
                showResult && isCorrect && 'bg-emerald-500/20 border-emerald-400 text-emerald-100',
                showResult && !isCorrect && isPicked && 'bg-red-500/20 border-red-400 text-red-100',
                showResult && !isCorrect && !isPicked && 'bg-white/5 border-white/10 opacity-50',
              )}
            >
              <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
              {choice}
              {showResult && isCorrect && <Check className="inline h-4 w-4 ml-2" />}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-4">
          <p className="text-xs uppercase tracking-wide text-white/50 mb-1">해설</p>
          <p className="text-sm text-white/90">{item.explanation}</p>
        </div>
      )}
      {selected !== null && (
        <StudyBtn variant="primary" size="lg" onClick={onNext} className="w-full">
          다음 →
        </StudyBtn>
      )}
    </div>
  );
}
