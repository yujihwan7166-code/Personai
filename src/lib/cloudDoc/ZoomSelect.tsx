/** 문서 도구바 — 줌 컨트롤 (50/75/100/125/150/200%). */

import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

export const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200] as const;

export function ZoomSelect({ zoom, onZoomChange }: { zoom: number; onZoomChange: (z: number) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="h-7 px-2 rounded hover:bg-muted text-xs flex items-center gap-1 min-w-[64px] border border-border"
        title="줌"
      >
        <span className="truncate text-left flex-1">{zoom}%</span>
        <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[88px]">
        {ZOOM_PRESETS.map((p) => (
          <DropdownMenuItem
            key={p}
            onSelect={() => onZoomChange(p)}
            className={zoom === p ? 'bg-muted' : ''}
          >
            {p}%
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
