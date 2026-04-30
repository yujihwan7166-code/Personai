/**
 * 활동 picker — Daylio 패턴.
 *
 * 12종 디폴트 활동 grid (이모지 + 라벨). 다중 선택 가능.
 * 향후 v2: 사용자 정의 활동 추가 (현재는 디폴트만).
 */
import { cn } from '@/lib/utils';
import { DEFAULT_ACTIVITIES } from '@/types/journal';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

export const ActivityPicker = ({ value, onChange }: Props) => {
  const selected = new Set(value);

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange([...next]);
  };

  return (
    <div className="grid grid-cols-3 gap-1">
      {DEFAULT_ACTIVITIES.map((a) => {
        const active = selected.has(a.key);
        return (
          <button
            key={a.key}
            type="button"
            onClick={() => toggle(a.key)}
            aria-pressed={active}
            className={cn(
              'inline-flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-md border transition-colors',
              active
                ? 'border-foreground/40 bg-foreground/5 text-foreground'
                : 'border-[hsl(var(--hairline))] bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground',
            )}
          >
            <span className="text-[14px] leading-none" aria-hidden>{a.emoji}</span>
            <span className="text-[10px] leading-none">{a.label}</span>
          </button>
        );
      })}
    </div>
  );
};
