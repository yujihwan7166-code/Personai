/** 데이터 검증 드롭다운 — 셀 안 우측에 ▼, 허용 값 목록 표시. */

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationDropdownProps {
  items: string[];
  currentValue: string;
  onSelect: (v: string) => void;
}

export function ValidationDropdown({ items, currentValue, onSelect }: ValidationDropdownProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-l-sm z-10"
        aria-label="허용 값 선택"
        title="허용 값 목록"
      >
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          />
          <ul
            className="absolute right-0 top-full mt-0.5 z-40 min-w-[120px] max-h-[200px] overflow-y-auto rounded border border-border bg-popover shadow-md py-1"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {items.map((it, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(it);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-2 py-1 text-sm hover:bg-muted',
                    it === currentValue && 'bg-muted font-medium',
                  )}
                >
                  {it}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
