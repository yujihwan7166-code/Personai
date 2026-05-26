import type { ReactNode } from 'react';
import { Check, ChevronDown, Eraser } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ColorPickBtnProps {
  icon: ReactNode;
  value: string;
  onChange: (color: string) => void;
  onClear: () => void;
  title?: string;
}

const COLOR_SWATCHES = [
  '#000000', '#434343', '#666666', '#999999', '#cccccc', '#ffffff',
  '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8',
  '#674ea7', '#a64d79', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8',
  '#a2c4c9', '#9fc5e8', '#b4a7d6', '#d5a6bd', '#f4cccc', '#fce5cd',
  '#fff2cc', '#d9ead3', '#d0e0e3', '#cfe2f3', '#d9d2e9', '#ead1dc',
];

export function ColorPickBtn({ icon, value, onChange, onClear, title = '색상' }: ColorPickBtnProps) {
  const current = toHex(value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex h-7 items-center gap-1 rounded-md px-1.5 text-muted-foreground',
          'hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        title={title}
        aria-label={title}
        onMouseDown={(event) => event.preventDefault()}
      >
        <span className="relative inline-flex h-5 w-5 items-center justify-center">
          {icon}
          <span
            className="absolute -bottom-0.5 left-0 right-0 mx-auto h-0.5 w-4 rounded-full border border-border"
            style={{ backgroundColor: current }}
            aria-hidden
          />
        </span>
        <ChevronDown className="h-3.5 w-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} collisionPadding={8} className="w-56 p-2">
        <DropdownMenuLabel className="px-1 pb-2 pt-0 text-xs font-medium">{title}</DropdownMenuLabel>
        <div className="grid grid-cols-6 gap-1 px-1">
          {COLOR_SWATCHES.map((color) => {
            const selected = color.toLowerCase() === current.toLowerCase();
            return (
              <button
                key={color}
                type="button"
                className={cn(
                  'relative h-6 w-6 rounded-sm border border-border transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected && 'ring-2 ring-primary ring-offset-1',
                )}
                style={{ backgroundColor: color }}
                title={color}
                aria-label={`${title} ${color}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChange(color)}
              >
                {selected && (
                  <Check
                    className={cn(
                      'absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2',
                      isLightColor(color) ? 'text-slate-900' : 'text-white',
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
        <DropdownMenuSeparator />
        <div className="flex items-center gap-2 px-1 py-1">
          <label className="flex h-8 flex-1 cursor-pointer items-center justify-between rounded-md border border-border px-2 text-xs hover:bg-muted">
            <span>직접 선택</span>
            <input
              type="color"
              value={current}
              className="h-5 w-8 cursor-pointer border-0 bg-transparent p-0"
              aria-label={`${title} 직접 선택`}
              onChange={(event) => onChange(event.target.value)}
            />
          </label>
        </div>
        <DropdownMenuItem
          className="h-8 cursor-pointer gap-2 rounded-md px-2 text-xs"
          onSelect={() => onClear()}
        >
          <Eraser className="h-3.5 w-3.5" />
          기본값으로 지우기
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function toHex(color: string): string {
  if (!color) return '#000000';
  if (color.startsWith('#') && (color.length === 4 || color.length === 7)) return expandShortHex(color).toLowerCase();
  return '#000000';
}

function expandShortHex(color: string): string {
  if (color.length !== 4) return color;
  return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
}

function isLightColor(color: string): boolean {
  const hex = toHex(color).slice(1);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 1000 > 160;
}
