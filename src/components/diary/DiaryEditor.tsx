import { useState } from 'react';
import type { Value } from 'platejs';
import type { DiaryEntry } from '@/types/diary';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { FeelingPicker } from './FeelingPicker';

interface Props {
  entry: DiaryEntry;
  onPatch: (patch: Partial<DiaryEntry>) => void;
}

export function DiaryEditor({ entry, onPatch }: Props) {
  const [tagDraft, setTagDraft] = useState('');
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6 sm:px-6">
      <input
        defaultValue={entry.title ?? ''}
        onChange={(e) => onPatch({ title: e.target.value })}
        placeholder="제목 (선택)"
        className="w-full bg-transparent text-[20px] font-bold text-foreground outline-none placeholder:text-muted-foreground/40"
      />
      <div className="my-3 rounded-xl border border-[hsl(var(--hairline))] bg-card p-3">
        <FeelingPicker
          feelings={entry.feelings}
          primary={entry.primaryFeeling}
          intensity={entry.intensity}
          onChange={(p) => onPatch({
            ...(p.feelings !== undefined ? { feelings: p.feelings } : {}),
            ...(p.primary !== undefined ? { primaryFeeling: p.primary } : {}),
            ...(p.intensity !== undefined ? { intensity: p.intensity } : {}),
          })}
        />
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {(entry.tags ?? []).map((t) => (
          <span key={t} className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[11px]">
            #{t}
            <button type="button" className="ml-1 text-muted-foreground hover:text-foreground" onClick={() => onPatch({ tags: (entry.tags ?? []).filter((x) => x !== t) })} aria-label="태그 제거">×</button>
          </span>
        ))}
        <input
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && tagDraft.trim()) {
              onPatch({ tags: [...new Set([...(entry.tags ?? []), tagDraft.trim()])] });
              setTagDraft('');
            }
          }}
          placeholder="태그 추가"
          className="bg-transparent text-[12px] outline-none placeholder:text-muted-foreground/50"
        />
      </div>
      <NoteEditor
        key={entry.id}
        initialValue={entry.body as Value}
        onChange={(v) => onPatch({ body: v })}
        placeholder="오늘 하루를 적어보세요…"
      />
    </div>
  );
}
