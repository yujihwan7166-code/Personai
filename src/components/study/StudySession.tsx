import { useState, useMemo, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import type { StudyNotebook, Flashcard, StudyQuizItem, WrongAnswer } from '@/types/study';
import { newId } from '@/types/study';
import { StudyBtn } from './ui/primitives';
import { cn } from '@/lib/utils';

interface Props {
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  onClose: () => void;
  onSessionComplete: () => void;
}

type Phase = 'flashcard' | 'wrong' | 'quiz' | 'done';

export function StudySession({ notebook, onChange, onClose, onSessionComplete }: Props) {
  const now = Date.now();
  const dueCards = useMemo(
    () => notebook.flashcards.filter((c) => c.dueAt <= now).slice(0, 10),
    [notebook.flashcards, now],
  );
  const wrongToReview = useMemo(
    () => notebook.wrongAnswers.slice(0, 5),
    [notebook.wrongAnswers],
  );
  const quizItems = useMemo(() => notebook.quizItems.slice(0, 5), [notebook.quizItems]);

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
        if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
          handleFlashcardRating(parseInt(e.key, 10) as 1 | 2 | 3 | 4);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleFlashcardRating = (rating: 1 | 2 | 3 | 4) => {
    const card = dueCards[index];
    if (!card) return;
    const dayMs = 86400000;
    let nextInterval = card.intervalDays;
    let nextEase = card.ease;
    if (rating === 1) {
      nextInterval = 1;
      nextEase = Math.max(1.3, card.ease - 0.2);
    } else if (rating === 2) {
      nextInterval = Math.max(1, Math.ceil(card.intervalDays * 1.2));
      nextEase = Math.max(1.3, card.ease - 0.05);
    } else if (rating === 3) {
      nextInterval = Math.max(1, Math.ceil(card.intervalDays * card.ease));
    } else {
      nextInterval = Math.max(1, Math.ceil(card.intervalDays * card.ease * 1.3));
      nextEase = card.ease + 0.1;
    }
    const updatedCard: Flashcard = {
      ...card,
      ease: nextEase,
      intervalDays: nextInterval,
      dueAt: Date.now() + nextInterval * dayMs,
      reviewsCount: card.reviewsCount + 1,
      lastReviewedAt: Date.now(),
    };
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

  const bg = 'bg-slate-900';

  if (phase === 'done') {
    const accuracy = totalAnswered === 0 ? null : correctCount / totalAnswered;
    return (
      <div className={`fixed inset-0 z-[100] ${bg} flex flex-col items-center justify-center text-white p-6`}>
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">오늘 세션 완료</h2>
        <p className="text-slate-300 text-sm mb-6">
          {dueCards.length}장 복습 · {wrongToReview.length}오답 재도전 · {totalAnswered}문제 풀이
        </p>
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
}: {
  card: Flashcard;
  flipped: boolean;
  onFlip: () => void;
  onRate: (r: 1 | 2 | 3 | 4) => void;
}) {
  return (
    <div className="w-full max-w-lg flex flex-col items-center">
      <button
        onClick={onFlip}
        className="study-card-flip w-full aspect-[4/3] mb-6"
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
      {flipped ? (
        <div className="grid grid-cols-4 gap-2 w-full">
          {[
            { r: 1 as const, label: 'Again', key: '1', color: 'bg-red-500 hover:bg-red-400' },
            { r: 2 as const, label: 'Hard', key: '2', color: 'bg-orange-500 hover:bg-orange-400' },
            { r: 3 as const, label: 'Good', key: '3', color: 'bg-emerald-500 hover:bg-emerald-400' },
            { r: 4 as const, label: 'Easy', key: '4', color: 'bg-indigo-500 hover:bg-indigo-400' },
          ].map((b) => (
            <button
              key={b.r}
              onClick={() => onRate(b.r)}
              className={cn('rounded-xl py-3 font-semibold transition-colors', b.color)}
            >
              <div className="text-xs opacity-80">[{b.key}]</div>
              {b.label}
            </button>
          ))}
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
