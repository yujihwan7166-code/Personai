/** 수식 표시줄 input — 긴 수식 직접 편집 + 함수 popover. */

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { FuncHintPopover } from '@/lib/cloudSheet/FuncHintPopover';

interface FormulaBarInputProps {
  currentRef: string;
  value: string;
  evaluatedValue: string;
  onCommit: (next: string) => void;
}

export function FormulaBarInput({ currentRef, value, evaluatedValue, onCommit }: FormulaBarInputProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  // selectedRef 변경 시 (editing 아닐 때만) draft 동기
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing, currentRef]);

  const commit = useCallback(() => {
    setEditing(false);
    if (draft !== value) onCommit(draft);
  }, [draft, value, onCommit]);

  const showEvaluation = !editing && value.startsWith('=');

  return (
    <div className="relative flex-1 flex items-center gap-2 min-w-0">
      <input
        value={editing ? draft : value}
        onFocus={() => { setEditing(true); setDraft(value); }}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); (e.target as HTMLInputElement).blur(); }
          else if (e.key === 'Escape') { e.preventDefault(); setDraft(value); setEditing(false); (e.target as HTMLInputElement).blur(); }
        }}
        onBlur={() => { if (editing) commit(); }}
        placeholder=""
        className={cn(
          'flex-1 min-w-0 font-mono text-xs px-2 py-1 rounded border border-transparent bg-transparent outline-none',
          'hover:border-border hover:bg-background focus:border-foreground/40 focus:bg-background',
        )}
        aria-label={`${currentRef} 셀 값 편집`}
      />
      {showEvaluation && (
        <span className="text-muted-foreground shrink-0 text-xs">
          = <span className="font-medium text-foreground">{evaluatedValue}</span>
        </span>
      )}
      {editing && <FuncHintPopover value={draft} onReplaceValue={setDraft} />}
    </div>
  );
}
