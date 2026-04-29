/**
 * 일기 — /journal 라우트.
 *
 * v1: 시간순 카드 리스트 + 월 그룹핑 + 모달 편집기.
 *
 * 단축키 / 인터랙션:
 * - + 오늘 일기 = 모달 (create)
 * - 카드 클릭 = 모달 (edit)
 * - Ctrl+Enter 저장
 * - Esc 닫기
 * - 삭제 = Undo 토스트 (5초)
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import { useJournal } from '@/hooks/useJournal';
import { journalStore } from '@/services/journalStore';
import { notify } from '@/lib/notify';
import { JournalCard } from '@/components/journal/JournalCard';
import { JournalEditor } from '@/components/journal/JournalEditor';
import { JournalEmpty } from '@/components/journal/JournalEmpty';
import type { JournalEntry, Mood } from '@/types/journal';

type EditorMode =
  | { kind: 'create' }
  | { kind: 'edit'; id: string; initialBody: string; initialMood?: Mood };

const monthLabel = (date: Date): string =>
  date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

const monthKey = (iso: string): string => iso.slice(0, 7); // 'YYYY-MM'

const Journal = () => {
  const navigate = useNavigate();
  const entries = useJournal();
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);

  // 월 그룹핑 (createdAt 기준 'YYYY-MM').
  const grouped = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    entries.forEach((e) => {
      const key = monthKey(e.createdAt);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    });
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: monthLabel(new Date(`${key}-01T00:00:00`)),
      items,
    }));
  }, [entries]);

  const handleDelete = (entry: JournalEntry) => {
    const snapshot: Pick<JournalEntry, 'date' | 'body' | 'mood' | 'tags'> = {
      date: entry.date,
      body: entry.body,
      mood: entry.mood,
      tags: entry.tags,
    };
    journalStore.remove(entry.id);
    notify.success('삭제됐어요', {
      duration: 5000,
      action: {
        label: '되돌리기',
        onClick: () => journalStore.add(snapshot),
      },
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 px-4 sm:px-6 py-6 sm:py-7 max-w-2xl w-full mx-auto">
        <header className="mb-5 sm:mb-6 flex flex-wrap items-end justify-between gap-3 pb-3 sm:pb-4 border-b-2 border-[hsl(var(--hairline))]">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-mono uppercase tracking-[0.16em]"
              aria-label="메인으로"
            >
              <ChevronLeft className="h-3 w-3" />
              <span>메인</span>
            </button>
            <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-tight leading-none">일기</h1>
          </div>
          <button
            type="button"
            onClick={() => setEditorMode({ kind: 'create' })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-semibold rounded-md bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" />
            오늘 일기
          </button>
        </header>

        {entries.length === 0 ? (
          <JournalEmpty onAdd={() => setEditorMode({ kind: 'create' })} />
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map((group) => (
              <section key={group.key} className="flex flex-col gap-2">
                <h2 className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1 px-1">
                  {group.label}
                </h2>
                <div className="flex flex-col gap-2.5">
                  {group.items.map((entry) => (
                    <JournalCard
                      key={entry.id}
                      entry={entry}
                      onEdit={() => setEditorMode({
                        kind: 'edit',
                        id: entry.id,
                        initialBody: entry.body,
                        initialMood: entry.mood,
                      })}
                      onDelete={() => handleDelete(entry)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <JournalEditor
        open={editorMode !== null}
        mode={editorMode}
        onClose={() => setEditorMode(null)}
      />
    </div>
  );
};

export default Journal;
