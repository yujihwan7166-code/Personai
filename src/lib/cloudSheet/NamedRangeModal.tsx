/** Named Range 모달 (이름 정의) — 범위에 이름 붙여 수식에서 사용. */

import { useEffect, useMemo, useState } from 'react';
import { Hash, Trash2 as TrashIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { idxToCol } from '@/lib/cloudSheet/formula';

interface NamedRangeModalProps {
  open: boolean;
  onClose: () => void;
  currentRange: { minR: number; maxR: number; minC: number; maxC: number };
  currentSheetName: string;
  namedRanges: Record<string, string>;
  onAdd: (name: string, rangeStr: string) => void;
  onRemove: (name: string) => void;
}

export function NamedRangeModal({
  open, onClose, currentRange, currentSheetName, namedRanges, onAdd, onRemove,
}: NamedRangeModalProps) {
  const [name, setName] = useState('');
  const defaultRangeStr = useMemo(() => {
    const a = `${idxToCol(currentRange.minC)}${currentRange.minR + 1}`;
    const b = `${idxToCol(currentRange.maxC)}${currentRange.maxR + 1}`;
    return `${currentSheetName}!${a === b ? a : `${a}:${b}`}`;
  }, [currentRange, currentSheetName]);
  const [rangeStr, setRangeStr] = useState(defaultRangeStr);
  useEffect(() => { if (open) { setName(''); setRangeStr(defaultRangeStr); } }, [open, defaultRangeStr]);

  const nameValid = /^[A-Za-z_가-힣][A-Za-z0-9_가-힣]*$/.test(name);
  const rangeValid = rangeStr.trim() !== '';
  const isDuplicate = nameValid && Object.keys(namedRanges).some((k) => k.toLowerCase() === name.trim().toLowerCase());
  // cell ref 와 충돌하는 이름은 비추 (예: A1 같은 이름)
  const looksLikeCellRef = /^[A-Z]+\d+$/i.test(name.trim());
  const valid = nameValid && rangeValid;

  const submit = () => {
    if (!valid) return;
    onAdd(name.trim(), rangeStr.trim());
    setName('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-base flex items-center gap-2">
          <Hash className="w-4 h-4" /> 이름 정의
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          범위에 이름을 붙이고 수식에서 사용하세요 (예: <code>=SUM(월매출)</code>).
        </DialogDescription>

        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-muted-foreground">이름</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
              placeholder="월매출 (한글·영문·_, 숫자 시작 X)"
              className="flex-1 text-sm px-2 py-1 rounded border border-border bg-background outline-none focus:border-foreground/40"
              autoFocus
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-muted-foreground">범위</span>
            <input
              type="text"
              value={rangeStr}
              onChange={(e) => setRangeStr(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
              placeholder="Sheet1!A1:A10"
              className="flex-1 text-sm font-mono px-2 py-1 rounded border border-border bg-background outline-none focus:border-foreground/40"
            />
          </label>
          {/* 경고/안내 */}
          {name && !nameValid && (
            <div className="text-[11px] text-amber-600 dark:text-amber-400 pl-16">
              이름은 글자(한글·영문)나 _ 로 시작, 숫자·기호 X
            </div>
          )}
          {looksLikeCellRef && (
            <div className="text-[11px] text-amber-600 dark:text-amber-400 pl-16">
              ‘{name.trim()}’ 는 셀 참조와 비슷해 혼동될 수 있어요
            </div>
          )}
          {isDuplicate && (
            <div className="text-[11px] text-amber-600 dark:text-amber-400 pl-16">
              같은 이름이 이미 있어요 — 추가하면 기존 정의를 덮어쓰게 됩니다
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={submit}
              disabled={!valid}
              className="px-3 py-1.5 rounded bg-foreground text-background hover:bg-foreground/90 text-sm disabled:opacity-40"
            >
              {isDuplicate ? '덮어쓰기' : '추가'}
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <div className="text-xs font-medium text-muted-foreground mb-1.5">
            기존 이름 ({Object.keys(namedRanges).length})
          </div>
          {Object.keys(namedRanges).length === 0 ? (
            <div className="text-xs text-muted-foreground py-3 text-center">없음</div>
          ) : (
            <ul className="space-y-1 max-h-[200px] overflow-y-auto">
              {Object.entries(namedRanges).map(([n, r]) => (
                <li key={n} className="flex items-center gap-2 px-2 py-1 rounded border border-border text-xs">
                  <Hash className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium">{n}</span>
                  <span className="text-muted-foreground font-mono truncate flex-1">{r}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(n)}
                    className="p-1 rounded hover:bg-muted text-destructive"
                    aria-label="삭제" title="삭제"
                  >
                    <TrashIcon className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded border border-border hover:bg-muted text-sm"
          >
            닫기
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
