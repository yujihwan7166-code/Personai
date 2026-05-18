/** 이름 상자 (Name Box) — cell ref 입력 → jump (예: A1, B2:D5). */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { colToIdx } from '@/lib/cloudSheet/formula';

interface NameBoxProps {
  currentRef: string;
  rowCount: number;
  colCount: number;
  onJump: (target: {
    anchor: { row: number; col: number } | null;
    focus: { row: number; col: number };
  }) => void;
}

export function NameBox({ currentRef, rowCount, colCount, onJump }: NameBoxProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentRef);
  const inputRef = useRef<HTMLInputElement>(null);

  // currentRef 변경 시 (editing 아닐 때만) draft 동기
  useEffect(() => { if (!editing) setDraft(currentRef); }, [currentRef, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = useCallback(() => {
    const text = draft.trim().toUpperCase();
    setEditing(false);
    if (!text) { setDraft(currentRef); return; }
    // 단일 셀 A1 또는 범위 A1:B5 인식
    const single = text.match(/^([A-Z]+)(\d+)$/);
    const range = text.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (range) {
      const c1 = Math.min(colCount - 1, colToIdx(range[1]));
      const r1 = Math.min(rowCount - 1, Number(range[2]) - 1);
      const c2 = Math.min(colCount - 1, colToIdx(range[3]));
      const r2 = Math.min(rowCount - 1, Number(range[4]) - 1);
      if (c1 < 0 || r1 < 0 || c2 < 0 || r2 < 0) { setDraft(currentRef); return; }
      const anchor = { row: r1, col: c1 };
      const focus = { row: r2, col: c2 };
      onJump({ anchor, focus });
    } else if (single) {
      const c = colToIdx(single[1]);
      const r = Number(single[2]) - 1;
      if (c < 0 || r < 0 || c >= colCount || r >= rowCount) { setDraft(currentRef); return; }
      onJump({ anchor: null, focus: { row: r, col: c } });
    } else {
      // 인식 안 되면 원복
      setDraft(currentRef);
      toast({ title: '셀 위치를 인식 못 했어요', description: '예: A1 또는 B2:D5' });
    }
  }, [draft, currentRef, rowCount, colCount, onJump]);

  return (
    <input
      ref={inputRef}
      value={editing ? draft : currentRef}
      onFocus={() => { setEditing(true); setDraft(currentRef); }}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); inputRef.current?.blur(); }
        else if (e.key === 'Escape') { e.preventDefault(); setDraft(currentRef); setEditing(false); inputRef.current?.blur(); }
      }}
      onBlur={() => { if (editing) commit(); }}
      className={cn(
        'w-20 font-mono font-medium text-muted-foreground shrink-0',
        'px-1.5 py-0.5 rounded border border-transparent bg-transparent outline-none text-center text-xs',
        'hover:border-border hover:bg-background focus:border-foreground/40 focus:bg-background focus:text-foreground',
      )}
      title="셀로 이동 (예: A1 또는 B2:D5)"
      aria-label="이름 상자 — 셀 위치 입력"
    />
  );
}
