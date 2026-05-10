/**
 * 감정 이모지 5종 선택 — undefined 허용 (선택 압박 X).
 *
 * 한 번 선택 후 같은 값 다시 클릭 시 해제 (toggle).
 */
import { cn } from '@/lib/utils';
import type { Mood } from '@/types/journal';
import { MOOD_EMOJI, MOOD_LABELS } from '@/types/journal';

interface MoodPickerProps {
  value: Mood | undefined;
  onChange: (next: Mood | undefined) => void;
}

const MOODS: Mood[] = [1, 2, 3, 4, 5];

export const MoodPicker = ({ value, onChange }: MoodPickerProps) => (
  <div className="flex items-center gap-1.5">
    {MOODS.map((m) => {
      const active = value === m;
      return (
        <button
          key={m}
          type="button"
          aria-label={MOOD_LABELS[m]}
          aria-pressed={active}
          title={MOOD_LABELS[m]}
          onClick={() => onChange(active ? undefined : m)}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-md text-[20px]',
            'transition-transform duration-150 ease-out hover:scale-[1.08] hover:bg-accent/70',
            active && 'bg-primary/10 ring-1 ring-primary/40 scale-[1.06]',
          )}
        >
          <span className="leading-none select-none">{MOOD_EMOJI[m]}</span>
        </button>
      );
    })}
  </div>
);
