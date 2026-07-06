import { PenLine, Sparkles } from 'lucide-react';
import { JournalCard } from './JournalCard';
import type { JournalEntry } from '@/types/journal';

interface Props {
  todayEntries: JournalEntry[];
  onCreate: (starter?: string) => void;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (entry: JournalEntry) => void;
}

const PROMPTS = [
  '오늘 가장 오래 남은 장면은?',
  '지금 감정을 색으로 말하면?',
  '내일의 나에게 한마디',
] as const;

export const JournalTodayHero = ({ todayEntries, onCreate, onEdit, onDelete }: Props) => {
  const hasToday = todayEntries.length > 0;

  return (
    <section className="flex flex-col gap-3" aria-label="오늘">
      {hasToday ? (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">Today</p>
            <h2 className="mt-1 text-[15px] font-semibold text-foreground">오늘 기록</h2>
          </div>
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
        <div className="overflow-hidden rounded-2xl border border-[hsl(var(--hairline))] bg-card shadow-[0_8px_24px_-22px_hsl(30_30%_8%/0.24)]">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px]">
            <button
              type="button"
              onClick={() => onCreate()}
              className="group flex min-h-[190px] flex-col items-start justify-center px-6 py-7 text-left transition-colors hover:bg-primary/[0.035]"
            >
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary/15">
                <PenLine className="h-5 w-5" strokeWidth={1.7} />
              </span>
              <p className="font-display text-[24px] font-bold leading-tight tracking-[-0.03em] text-foreground">
                오늘을 한 문장으로 붙잡아볼까요?
              </p>
              <p className="mt-3 max-w-[520px] text-[13px] leading-6 text-muted-foreground">
                길게 쓰지 않아도 괜찮아요. 한 장면, 한 감정, 한 문장만 남겨도 오늘은 기록됩니다.
              </p>
            </button>

            <div className="border-t border-[hsl(var(--hairline))] bg-background/45 p-4 md:border-l md:border-t-0">
              <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
                빠른 질문
              </div>
              <div className="flex flex-col gap-2">
                {PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onCreate(prompt)}
                    className="rounded-lg border border-[hsl(var(--hairline))] bg-card/75 px-3 py-2 text-left text-[12px] font-medium text-foreground/80 transition-colors hover:border-primary/30 hover:bg-primary/[0.045] hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
