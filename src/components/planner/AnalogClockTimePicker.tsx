/**
 * 아날로그 시계 다이얼 시간 선택기 — 시계 모양으로 시·분 선택.
 *
 * 브라우저 네이티브 type="time" picker(휠/스피너) 가 디자인을 깨고
 * OS·브라우저별로 들쭉날쭉해서, 모든 환경에서 일관된 시계 UX 를 제공한다.
 *
 * UX:
 * - 트리거 button 클릭 → popover 안에 12시간 시계 다이얼.
 * - 큰 "HH : MM" 표시 — HH 클릭 = 시 모드, MM 클릭 = 분 모드 토글.
 * - AM/PM 토글로 12/24시간 변환.
 * - 시 모드에서 숫자 클릭 → 분 모드로 자동 전환.
 * - 분 모드의 5분 단위는 다이얼로, 그 외 분은 옆 number input 으로 미세 조정.
 *
 * value 는 "HH:MM" 24시간 표기. 빈/잘못된 포맷은 "00:00" 으로 폴백.
 */
import { useState, type RefObject } from 'react';
import { Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const CLOCK_SIZE = 220;
const CLOCK_CENTER = CLOCK_SIZE / 2;
const CLOCK_RADIUS = 88;
const CLOCK_BUTTON_SIZE = 36;

const TIME_QUICK_PRESETS = ['09:00', '12:00', '15:00', '18:00', '21:00'] as const;

const parseHm = (raw: string): { h: number; m: number } => {
  const [hRaw, mRaw] = (raw || '00:00').split(':');
  const h = Math.max(0, Math.min(23, Number(hRaw) || 0));
  const m = Math.max(0, Math.min(59, Number(mRaw) || 0));
  return { h, m };
};

const formatHmDisplay = (raw: string): string => {
  if (!raw) return '시간 선택';
  const { h, m } = parseHm(raw);
  const period = h < 12 ? '오전' : '오후';
  const display12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${String(display12).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const composeHm = (h: number, m: number) =>
  `${String(Math.max(0, Math.min(23, h))).padStart(2, '0')}:${String(Math.max(0, Math.min(59, m))).padStart(2, '0')}`;

interface ClockDialProps {
  mode: 'hour' | 'minute';
  hour12: number;
  minute: number;
  onHourSelect: (h12: number) => void;
  onMinuteSelect: (m: number) => void;
}

const ClockDial = ({ mode, hour12, minute, onHourSelect, onMinuteSelect }: ClockDialProps) => {
  // 시침/분침 끝 좌표 — 시 모드는 hour12 기준, 분 모드는 분 자체 각도(미세값도 정확).
  const handAngle = mode === 'hour'
    ? (hour12 / 12) * 2 * Math.PI - Math.PI / 2
    : (minute / 60) * 2 * Math.PI - Math.PI / 2;
  const tipX = CLOCK_CENTER + CLOCK_RADIUS * Math.cos(handAngle);
  const tipY = CLOCK_CENTER + CLOCK_RADIUS * Math.sin(handAngle);

  return (
    <div
      className="relative mx-auto rounded-full bg-muted/35 ring-1 ring-foreground/[0.06]"
      style={{ width: CLOCK_SIZE, height: CLOCK_SIZE }}
      aria-label={mode === 'hour' ? '시 선택' : '분 선택'}
      role="group"
    >
      {/* 시침/분침 — SVG line */}
      <svg
        className="pointer-events-none absolute inset-0"
        width={CLOCK_SIZE}
        height={CLOCK_SIZE}
        aria-hidden
      >
        <circle cx={CLOCK_CENTER} cy={CLOCK_CENTER} r={4} fill="hsl(var(--primary))" />
        <line
          x1={CLOCK_CENTER}
          y1={CLOCK_CENTER}
          x2={tipX}
          y2={tipY}
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={tipX} cy={tipY} r={CLOCK_BUTTON_SIZE / 2} fill="hsl(var(--primary))" fillOpacity={0.92} />
      </svg>

      {/* 숫자 12개 */}
      {Array.from({ length: 12 }, (_, i) => {
        const num = i + 1; // 1~12 (12 = top)
        const angle = (num / 12) * 2 * Math.PI - Math.PI / 2;
        const x = CLOCK_CENTER + CLOCK_RADIUS * Math.cos(angle);
        const y = CLOCK_CENTER + CLOCK_RADIUS * Math.sin(angle);
        const isHourMode = mode === 'hour';
        // 분 모드: 12 = "00", 1 = "05", ..., 11 = "55"
        const minuteValue = (num % 12) * 5;
        const display = isHourMode ? String(num) : String(minuteValue).padStart(2, '0');
        const isActive = isHourMode
          ? hour12 === num
          : minute === minuteValue;
        const handleClick = () => {
          if (isHourMode) onHourSelect(num);
          else onMinuteSelect(minuteValue);
        };
        return (
          <button
            key={num}
            type="button"
            onClick={handleClick}
            aria-label={isHourMode ? `${num}시` : `${minuteValue}분`}
            aria-pressed={isActive}
            style={{
              left: x - CLOCK_BUTTON_SIZE / 2,
              top: y - CLOCK_BUTTON_SIZE / 2,
              width: CLOCK_BUTTON_SIZE,
              height: CLOCK_BUTTON_SIZE,
            }}
            className={cn(
              'absolute z-10 flex items-center justify-center rounded-full text-[12.5px] font-bold tabular-nums transition-colors',
              isActive
                ? 'text-primary-foreground'
                : 'text-foreground/82 hover:bg-accent/55',
            )}
          >
            {display}
          </button>
        );
      })}
    </div>
  );
};

export interface AnalogClockTimePickerProps {
  value: string;
  onChange: (next: string) => void;
  triggerRef?: RefObject<HTMLButtonElement>;
  triggerClassName?: string;
  triggerAriaLabel?: string;
  triggerAutoFocus?: boolean;
  /** 트리거 width 가 너무 좁아지지 않게. */
  className?: string;
}

export const AnalogClockTimePicker = ({
  value,
  onChange,
  triggerRef,
  triggerClassName,
  triggerAriaLabel = '시간 선택',
  triggerAutoFocus,
  className,
}: AnalogClockTimePickerProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  const { h, m } = parseHm(value);
  const isPM = h >= 12;
  const display12 = h === 0 ? 12 : h > 12 ? h - 12 : h;

  const updateHour12 = (h12: number) => {
    // 12시간 → 24시간 변환: 12 → 0 (AM), 12 → 12 (PM).
    const base = h12 === 12 ? 0 : h12;
    const newH = isPM ? base + 12 : base;
    onChange(composeHm(newH, m));
  };

  const updateMinute = (newM: number) => {
    onChange(composeHm(h, newM));
  };

  const setPeriod = (period: 'AM' | 'PM') => {
    const base = h % 12;
    const newH = period === 'PM' ? base + 12 : base;
    onChange(composeHm(newH, m));
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setMode('hour'); // 열릴 때마다 시 모드로 시작
      }}
    >
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          autoFocus={triggerAutoFocus}
          aria-label={triggerAriaLabel}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-foreground/14 bg-background px-3 text-left text-[14px] font-bold tabular-nums text-foreground outline-none transition-colors hover:border-foreground/22 focus:border-primary/45 focus:ring-2 focus:ring-primary/15',
            triggerClassName,
            className,
          )}
        >
          <span className="truncate">{formatHmDisplay(value)}</span>
          <Clock3 className="h-3.5 w-3.5 shrink-0 text-foreground/55" strokeWidth={2.2} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        side="bottom"
        sideOffset={6}
        // z-[60] — WeekScheduleTimePrompt (z-[55]) / TaskScheduleDialog (z-50) 위로 띄움.
        // 기본 z-50 이면 모달이 popover 를 가린다.
        className="z-[60] w-[268px] rounded-2xl border-foreground/14 p-3"
      >
        {/* 큰 "HH : MM" — 클릭으로 모드 토글 + AM/PM */}
        <div className="mb-2.5 flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => setMode('hour')}
            aria-pressed={mode === 'hour'}
            aria-label="시 선택 모드"
            className={cn(
              'min-w-[2.4ch] rounded-md px-1.5 py-0.5 text-[28px] font-extrabold tabular-nums leading-none transition-colors',
              mode === 'hour' ? 'bg-primary/12 text-primary' : 'text-foreground/72 hover:bg-accent/55',
            )}
          >
            {String(display12).padStart(2, '0')}
          </button>
          <span className="text-[28px] font-extrabold leading-none text-foreground/45">:</span>
          <button
            type="button"
            onClick={() => setMode('minute')}
            aria-pressed={mode === 'minute'}
            aria-label="분 선택 모드"
            className={cn(
              'min-w-[2.4ch] rounded-md px-1.5 py-0.5 text-[28px] font-extrabold tabular-nums leading-none transition-colors',
              mode === 'minute' ? 'bg-primary/12 text-primary' : 'text-foreground/72 hover:bg-accent/55',
            )}
          >
            {String(m).padStart(2, '0')}
          </button>
          <div className="ml-1.5 flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => setPeriod('AM')}
              aria-pressed={!isPM}
              aria-label="오전"
              className={cn(
                'h-5 rounded px-1.5 text-[10px] font-extrabold transition-colors',
                !isPM ? 'bg-primary text-primary-foreground' : 'text-foreground/55 hover:bg-accent',
              )}
            >
              오전
            </button>
            <button
              type="button"
              onClick={() => setPeriod('PM')}
              aria-pressed={isPM}
              aria-label="오후"
              className={cn(
                'h-5 rounded px-1.5 text-[10px] font-extrabold transition-colors',
                isPM ? 'bg-primary text-primary-foreground' : 'text-foreground/55 hover:bg-accent',
              )}
            >
              오후
            </button>
          </div>
        </div>

        <ClockDial
          mode={mode}
          hour12={display12}
          minute={m}
          onHourSelect={(h12) => {
            updateHour12(h12);
            setMode('minute'); // 시 → 분 자동 전환
          }}
          onMinuteSelect={(min) => {
            updateMinute(min);
          }}
        />

        {/* 분 미세 조정 — 5분 단위 다이얼로 못 맞추는 분 (e.g. 13분) */}
        {mode === 'minute' && (
          <div className="mt-2.5 flex items-center justify-center gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-foreground/55">
              세밀
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={String(m).padStart(2, '0')}
              onChange={(event) => {
                const num = Number(event.target.value);
                if (Number.isFinite(num)) updateMinute(Math.max(0, Math.min(59, Math.floor(num))));
              }}
              onFocus={(event) => event.currentTarget.select()}
              aria-label="분 세밀 조정"
              className="h-7 w-14 rounded-md border border-foreground/14 bg-background text-center text-[12px] font-bold tabular-nums text-foreground outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/15 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]"
            />
            <span className="text-[10.5px] font-bold text-muted-foreground">분</span>
          </div>
        )}

        {/* 빠른 시간 칩 */}
        <div className="mt-2.5 flex flex-wrap justify-center gap-1">
          {TIME_QUICK_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                onChange(preset);
                setOpen(false);
              }}
              aria-label={`${preset} 선택`}
              aria-pressed={value === preset}
              className={cn(
                'h-6 rounded-full border px-2 text-[11px] font-bold tabular-nums transition-colors',
                value === preset
                  ? 'border-primary/45 bg-primary/10 text-primary'
                  : 'border-transparent bg-muted/55 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {preset}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
