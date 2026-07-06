import { Sparkles } from 'lucide-react';
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
  '오늘 나를 웃게 한 건?',
  '지금 가장 고마운 한 가지',
  '오늘 배운 작은 것',
  '내려놓고 싶은 생각 하나',
] as const;

export const JournalTodayHero = ({ todayEntries, onCreate, onEdit, onDelete }: Props) => {
  const hasToday = todayEntries.length > 0;
  // 하루 동안 고정되는 프롬프트(날짜 기반).
  const prompt = PROMPTS[Math.floor(Date.now() / 86_400_000) % PROMPTS.length];

  return (
    <section className="flex flex-col gap-3" aria-label="오늘">
      {/* 오늘의 질문 — 글쓰기 유도 히어로 */}
      <div className="rounded-2xl border border-[hsl(var(--hairline))] bg-card p-5">
        <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
          <Sparkles className="h-3 w-3 text-primary" strokeWidth={2} /> 오늘의 질문
        </div>
        <p className="text-[16.5px] font-semibold leading-snug text-foreground">{prompt}</p>
        <button
          type="button"
          onClick={() => onCreate()}
          className="mt-4 w-full rounded-xl bg-primary py-2.5 text-[13.5px] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          기록하기
        </button>
      </div>

      {hasToday && (
        <div className="flex flex-col gap-2">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">오늘</p>
          {todayEntries.map((entry) => (
            <JournalCard
              key={entry.id}
              entry={entry}
              onEdit={() => onEdit(entry)}
              onDelete={() => onDelete(entry)}
            />
          ))}
        </div>
      )}
    </section>
  );
};
