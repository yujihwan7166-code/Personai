/** 이름 상자 (Name Box) — cell ref 입력 → jump (예: A1, B2:D5). */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { colToIdx } from '@/lib/cloudSheet/formula';

interface NameBoxProps {
  currentRef: string;
  rowCount: number;
  colCount: number;
  /** 이름 → "A1" 또는 "A1:B5" 문자열. 입력값이 매칭되면 그 범위로 점프. 대소문자 구분 X. */
  namedRanges?: Record<string, string>;
  onJump: (target: {
    anchor: { row: number; col: number } | null;
    focus: { row: number; col: number };
  }) => void;
}

export function NameBox({ currentRef, rowCount, colCount, namedRanges, onJump }: NameBoxProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentRef);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // currentRef 변경 시 (editing 아닐 때만) draft 동기
  useEffect(() => { if (!editing) setDraft(currentRef); }, [currentRef, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  // dropdown 외부 클릭 닫기
  useEffect(() => {
    if (!dropdownOpen) return;
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [dropdownOpen]);

  /** 'A1' 또는 'A1:B5' 문자열을 좌표로 변환해 점프. true 면 성공. */
  const jumpToRefText = useCallback((rawText: string): boolean => {
    const text = rawText.trim().toUpperCase();
    if (!text) return false;
    const single = text.match(/^([A-Z]+)(\d+)$/);
    const range = text.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (range) {
      const c1 = Math.min(colCount - 1, colToIdx(range[1]));
      const r1 = Math.min(rowCount - 1, Number(range[2]) - 1);
      const c2 = Math.min(colCount - 1, colToIdx(range[3]));
      const r2 = Math.min(rowCount - 1, Number(range[4]) - 1);
      if (c1 < 0 || r1 < 0 || c2 < 0 || r2 < 0) return false;
      onJump({ anchor: { row: r1, col: c1 }, focus: { row: r2, col: c2 } });
      return true;
    }
    if (single) {
      const c = colToIdx(single[1]);
      const r = Number(single[2]) - 1;
      if (c < 0 || r < 0 || c >= colCount || r >= rowCount) return false;
      onJump({ anchor: null, focus: { row: r, col: c } });
      return true;
    }
    return false;
  }, [colCount, rowCount, onJump]);

  const commit = useCallback(() => {
    const raw = draft.trim();
    setEditing(false);
    if (!raw) { setDraft(currentRef); return; }
    // 1) cell ref / range 직접 인식 시도
    if (jumpToRefText(raw)) return;
    // 2) named range 매칭 (대소문자 구분 X)
    if (namedRanges) {
      const matchKey = Object.keys(namedRanges).find(
        (k) => k.toLowerCase() === raw.toLowerCase(),
      );
      if (matchKey) {
        const target = namedRanges[matchKey];
        if (jumpToRefText(target)) return;
      }
    }
    setDraft(currentRef);
    toast({ title: '셀 위치를 인식 못 했어요', description: '예: A1 또는 B2:D5 · 등록된 이름' });
  }, [draft, currentRef, namedRanges, jumpToRefText]);

  const namedEntries = Object.entries(namedRanges ?? {});

  return (
    <div ref={wrapperRef} className="relative shrink-0">
      <div className="flex items-center">
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
            'px-1.5 py-0.5 rounded-l border border-transparent bg-transparent outline-none text-center text-xs',
            'hover:border-border hover:bg-background focus:border-foreground/40 focus:bg-background focus:text-foreground',
            namedEntries.length > 0 && 'rounded-r-none',
          )}
          title="셀로 이동 (예: A1 또는 B2:D5) · 등록된 이름도 입력 가능"
          aria-label="이름 상자 — 셀 위치 입력"
        />
        {namedEntries.length > 0 && (
          <button
            type="button"
            onMouseDown={(e) => {
              // input blur 전에 토글 — preventDefault 로 focus 유지 시도
              e.preventDefault();
              setDropdownOpen((v) => !v);
            }}
            className="px-1 py-0.5 -ml-px border border-transparent hover:border-border hover:bg-background rounded-r text-muted-foreground"
            title={`등록된 이름 ${namedEntries.length}개`}
            aria-label="등록된 이름 목록"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      {dropdownOpen && namedEntries.length > 0 && (
        <div className="absolute top-full left-0 mt-1 z-30 min-w-[180px] max-h-60 overflow-y-auto rounded border border-border bg-popover shadow-md text-xs">
          <div className="px-2 py-1 text-[10px] text-muted-foreground border-b border-border">
            등록된 이름 ({namedEntries.length})
          </div>
          {namedEntries.map(([name, target]) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                if (jumpToRefText(target)) {
                  setDropdownOpen(false);
                  setEditing(false);
                  setDraft(target);
                }
              }}
              className="w-full text-left px-2 py-1 hover:bg-accent flex items-center justify-between gap-2"
            >
              <span className="truncate font-medium">{name}</span>
              <span className="font-mono text-muted-foreground shrink-0">{target}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
