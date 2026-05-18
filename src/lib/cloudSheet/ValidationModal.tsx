/** 데이터 검증 모달 — 드롭다운 목록 규칙 추가·제거. */

import { useMemo, useState } from 'react';
import { ChevronDown, Trash2 as TrashIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { idxToCol } from '@/lib/cloudSheet/formula';
import type { Validation } from '@/lib/cloudSheet/validation';

interface ValidationModalProps {
  open: boolean;
  onClose: () => void;
  currentRange: { minR: number; maxR: number; minC: number; maxC: number };
  rules: Validation[];
  onAdd: (rule: Omit<Validation, 'id'>) => void;
  onRemove: (id: string) => void;
}

function rangeLabel(r: { minR: number; maxR: number; minC: number; maxC: number }): string {
  const a = `${idxToCol(r.minC)}${r.minR + 1}`;
  const b = `${idxToCol(r.maxC)}${r.maxR + 1}`;
  return a === b ? a : `${a}:${b}`;
}

export function ValidationModal({ open, onClose, currentRange, rules, onAdd, onRemove }: ValidationModalProps) {
  const [itemsText, setItemsText] = useState('사과\n바나나\n포도');

  const items = useMemo(
    () => itemsText.split(/\n|,/).map((s) => s.trim()).filter((s) => s !== ''),
    [itemsText],
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogTitle className="text-base flex items-center gap-2">
          <ChevronDown className="w-4 h-4" />
          데이터 검증 — {rangeLabel(currentRange)}
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          선택 범위 셀에 허용 값 목록 (드롭다운) 을 설정합니다. 목록에 없는 값은
          빨간 outline 으로 표시됩니다.
        </DialogDescription>

        <div className="flex flex-col gap-2 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">허용 값 (줄바꿈 또는 쉼표 구분)</span>
            <textarea
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              rows={5}
              className="px-2 py-1 rounded border border-border bg-background outline-none focus:border-foreground/40 text-sm font-mono"
            />
          </label>
          <div className="text-xs text-muted-foreground">
            {items.length}개 항목 미리보기: {items.slice(0, 5).join(' / ')}{items.length > 5 ? ' …' : ''}
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                if (items.length === 0) {
                  toast({ title: '허용 값을 1개 이상 입력하세요' });
                  return;
                }
                onAdd({ range: currentRange, kind: 'list', items });
                toast({ title: `규칙 추가 (${items.length}개 항목)` });
              }}
              className="px-3 py-1.5 rounded bg-foreground text-background hover:bg-foreground/90 text-sm"
            >
              규칙 추가
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <div className="text-xs font-medium text-muted-foreground mb-1.5">
            기존 규칙 ({rules.length})
          </div>
          {rules.length === 0 ? (
            <div className="text-xs text-muted-foreground py-3 text-center">없음</div>
          ) : (
            <ul className="space-y-1 max-h-[200px] overflow-y-auto">
              {rules.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-2 px-2 py-1 rounded border border-border text-xs"
                >
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  <span className="font-mono">{rangeLabel(r.range)}</span>
                  <span className="text-muted-foreground truncate flex-1">
                    {r.items.slice(0, 4).join(', ')}{r.items.length > 4 ? ` … (+${r.items.length - 4})` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(r.id)}
                    className="p-1 rounded hover:bg-muted text-destructive"
                    aria-label="규칙 삭제"
                    title="삭제"
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
