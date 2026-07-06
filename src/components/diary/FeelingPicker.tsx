import { cn } from '@/lib/utils';
import { GROUPS, GROUP_LABEL, GROUP_COLOR, feelingsByGroup } from '@/lib/diary/feelings';

interface Props {
  feelings: string[];
  primary?: string;
  intensity?: 1 | 2 | 3 | 4 | 5;
  onChange: (patch: { feelings?: string[]; primary?: string; intensity?: 1 | 2 | 3 | 4 | 5 }) => void;
}

export function FeelingPicker({ feelings, primary, intensity = 3, onChange }: Props) {
  const toggle = (id: string) => {
    const has = feelings.includes(id);
    const next = has ? feelings.filter((f) => f !== id) : [...feelings, id];
    // 대표 처리: 없으면 첫 선택을 대표로, 대표 해제 시 남은 것 중 첫째로.
    let nextPrimary = primary;
    if (!has && !primary) nextPrimary = id;
    if (has && primary === id) nextPrimary = next[0];
    onChange({ feelings: next, primary: nextPrimary });
  };
  return (
    <div className="space-y-3">
      {GROUPS.map((g) => (
        <div key={g}>
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: GROUP_COLOR[g] }} /> {GROUP_LABEL[g]}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {feelingsByGroup(g).map((f) => {
              const on = feelings.includes(f.id);
              const isPrimary = primary === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggle(f.id)}
                  onDoubleClick={() => on && onChange({ primary: f.id })}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[12px] transition-colors',
                    on ? 'border-transparent text-white' : 'border-[hsl(var(--hairline))] text-foreground/70 hover:bg-accent',
                    isPrimary && 'ring-2 ring-offset-1 ring-offset-background',
                  )}
                  style={on ? { backgroundColor: GROUP_COLOR[g] } : undefined}
                  title={on ? '더블클릭 = 대표 감정' : undefined}
                >
                  {f.emoji} {f.label}{isPrimary ? ' ★' : ''}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {feelings.length > 0 && (
        <label className="flex items-center gap-2 pt-1 text-[12px] text-muted-foreground">
          강도
          <input
            type="range"
            min={1}
            max={5}
            value={intensity}
            onChange={(e) => onChange({ intensity: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
            className="flex-1 accent-primary"
          />
          <span className="w-4 text-center tabular-nums">{intensity}</span>
        </label>
      )}
    </div>
  );
}
