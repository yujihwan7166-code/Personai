/**
 * 오늘 Hero — 일기 페이지 최상단의 "오늘" 섹션.
 *
 * - 오늘 entry 있음: 'TODAY' eyebrow + entries 카드들 (살짝 강조 톤)
 * - 오늘 entry 없음: 큰 prompt 카드 — "오늘은 어떤 하루였나요?" + 빠른 시작
 *
 * 단일 view feed 의 책 톤: 이 hero 가 첫 페이지(today) 역할.
 */
import { Pencil } from 'lucide-react';
import { JournalCard } from './JournalCard';
import type { JournalEntry } from '@/types/journal';

interface Props {
  todayEntries: JournalEntry[];
  onCreate: () => void;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (entry: JournalEntry) => void;
}

export const JournalTodayHero = ({ todayEntries, onCreate, onEdit, onDelete }: Props) => {
  const has = todayEntries.length > 0;

  return (
    <section className="flex flex-col gap-3" aria-label="오늘">
      {/* 이전엔 TODAY eyebrow + 큰 '오늘의 일기' 헤더가 여기 있었음 — 페이지 헤더로 이동 (중복 제거). */}

      {has ? (
        <div className="flex flex-col gap-4">
          {todayEntries.map((entry) => (
            <JournalCard
              key={entry.id}
              entry={entry}
              onEdit={() => onEdit(entry)}
              onDelete={() => onDelete(entry)}
            />
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={onCreate}
          className="group w-full rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] hover:bg-primary/[0.07] hover:border-primary/40 transition-colors py-10 sm:py-14 px-6 flex flex-col items-center justify-center gap-3 text-center"
        >
          <span className="inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-primary/10 text-primary/85 group-hover:bg-primary/15 group-hover:text-primary transition-colors">
            <Pencil className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </span>
          <p className="font-display text-[18px] sm:text-[20px] text-foreground/85 tracking-[-0.01em] group-hover:text-foreground transition-colors">
            오늘은 어떤 하루였나요?
          </p>
          <span className="text-[11.5px] text-muted-foreground/75">
            클릭해서 첫 줄 적기 · <kbd className="font-mono text-[10.5px] px-1 py-px rounded bg-muted/60 text-muted-foreground">N</kbd>
          </span>
        </button>
      )}
    </section>
  );
};
