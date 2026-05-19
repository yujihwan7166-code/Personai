/** 조건부 서식 모달 — 현재 선택 범위에 조건 → 자동 서식 규칙 관리. */

import { useState } from 'react';
import { Palette, Bold, Trash2 as TrashIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { idxToCol } from '@/lib/cloudSheet/formula';
import type { CondOp, CondRule } from '@/lib/cloudSheet/condFormat';

interface CondFormatModalProps {
  open: boolean;
  onClose: () => void;
  currentRange: { minR: number; maxR: number; minC: number; maxC: number };
  rules: CondRule[];
  onAdd: (rule: Omit<CondRule, 'id'>) => void;
  onRemove: (id: string) => void;
}

const COND_OP_LABELS: Array<{ op: CondOp; label: string; needsValue: boolean }> = [
  { op: '>',        label: '> 보다 큼',     needsValue: true },
  { op: '>=',       label: '>= 이상',       needsValue: true },
  { op: '<',        label: '< 보다 작음',   needsValue: true },
  { op: '<=',       label: '<= 이하',       needsValue: true },
  { op: '==',       label: '= 같음',        needsValue: true },
  { op: '!=',       label: '≠ 다름',        needsValue: true },
  { op: 'between',  label: 'a~b 범위 (예: 5,10)', needsValue: true },
  { op: 'contains', label: '포함',           needsValue: true },
  { op: 'empty',    label: '빈 셀',          needsValue: false },
  { op: 'nonempty', label: '값이 있음',      needsValue: false },
];

function rangeLabel(r: { minR: number; maxR: number; minC: number; maxC: number }): string {
  const a = `${idxToCol(r.minC)}${r.minR + 1}`;
  const b = `${idxToCol(r.maxC)}${r.maxR + 1}`;
  return a === b ? a : `${a}:${b}`;
}

export function CondFormatModal({ open, onClose, currentRange, rules, onAdd, onRemove }: CondFormatModalProps) {
  const [op, setOp] = useState<CondOp>('>');
  const [value, setValue] = useState('0');
  const [bgColor, setBgColor] = useState('#fef3c7');
  const [textColor, setTextColor] = useState('');
  const [bold, setBold] = useState(false);
  const cur = COND_OP_LABELS.find((c) => c.op === op);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogTitle className="text-base flex items-center gap-2">
          <Palette className="w-4 h-4" />
          조건부 서식 — {rangeLabel(currentRange)}
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          현재 선택 범위에 조건을 만족하는 셀만 자동으로 서식이 적용됩니다.
        </DialogDescription>

        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-muted-foreground">조건</span>
            <select
              value={op}
              onChange={(e) => setOp(e.target.value as CondOp)}
              className="flex-1 text-sm px-2 py-1 rounded border border-border bg-background"
            >
              {COND_OP_LABELS.map((c) => (
                <option key={c.op} value={c.op}>{c.label}</option>
              ))}
            </select>
          </label>
          {cur?.needsValue && (
            <label className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-muted-foreground">값</span>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={op === 'between' ? '예: 5,10' : '값'}
                className="flex-1 text-sm px-2 py-1 rounded border border-border bg-background outline-none focus:border-foreground/40"
              />
            </label>
          )}
          <label className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-muted-foreground">배경</span>
            <input
              type="color"
              value={bgColor.startsWith('#') ? bgColor : '#ffffff'}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-10 h-7 cursor-pointer border border-border rounded"
            />
            <input
              type="text"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              placeholder="#fef3c7 또는 비워두기"
              className="flex-1 text-xs font-mono px-2 py-1 rounded border border-border bg-background outline-none focus:border-foreground/40"
            />
          </label>
          {/* 자주 쓰는 배경 프리셋 — 클릭으로 적용 + 비우기 */}
          <div className="flex items-center gap-1 pl-16 -mt-1">
            <span className="text-[10px] text-muted-foreground mr-1">빠른 색</span>
            {([
              { c: '#fee2e2', label: '빨강' },
              { c: '#fef3c7', label: '노랑' },
              { c: '#d1fae5', label: '초록' },
              { c: '#dbeafe', label: '파랑' },
              { c: '#ede9fe', label: '보라' },
              { c: '#f3f4f6', label: '회색' },
            ]).map(({ c, label }) => (
              <button
                key={c}
                type="button"
                onClick={() => setBgColor(c)}
                className={`w-5 h-5 rounded border ${bgColor.toLowerCase() === c.toLowerCase() ? 'border-foreground' : 'border-border'} hover:scale-110 transition-transform`}
                style={{ backgroundColor: c }}
                title={label}
                aria-label={label}
              />
            ))}
            <button
              type="button"
              onClick={() => setBgColor('')}
              className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:bg-muted ml-1"
              title="배경 색상 없음"
            >
              비우기
            </button>
          </div>
          <label className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-muted-foreground">글자</span>
            <input
              type="color"
              value={textColor.startsWith('#') ? textColor : '#000000'}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-10 h-7 cursor-pointer border border-border rounded"
            />
            <input
              type="text"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              placeholder="비워두면 기본색"
              className="flex-1 text-xs font-mono px-2 py-1 rounded border border-border bg-background outline-none focus:border-foreground/40"
            />
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={bold} onChange={(e) => setBold(e.target.checked)} />
              <Bold className="w-3.5 h-3.5" />
            </label>
          </label>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>미리보기:</span>
              <span
                className="inline-flex items-center px-2 py-1 rounded border border-border font-mono"
                style={{
                  backgroundColor: bgColor.trim() || 'transparent',
                  color: textColor.trim() || undefined,
                  fontWeight: bold ? 600 : undefined,
                }}
              >
                예시 값
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const format: CondRule['format'] = {};
                if (bgColor.trim()) format.bgColor = bgColor.trim();
                if (textColor.trim()) format.textColor = textColor.trim();
                if (bold) format.bold = true;
                if (Object.keys(format).length === 0) {
                  toast({ title: '적용할 서식이 없어요' });
                  return;
                }
                onAdd({ range: currentRange, op, value, format });
                toast({ title: '규칙 추가됨' });
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
                  <span
                    className="w-4 h-4 rounded border border-border shrink-0"
                    style={{
                      backgroundColor: r.format.bgColor ?? 'transparent',
                      color: r.format.textColor,
                      fontWeight: r.format.bold ? 600 : undefined,
                    }}
                    aria-hidden
                  >Aa</span>
                  <span className="font-mono">{rangeLabel(r.range)}</span>
                  <span className="text-muted-foreground">
                    {COND_OP_LABELS.find((c) => c.op === r.op)?.label ?? r.op}
                    {r.op !== 'empty' && r.op !== 'nonempty' ? ` "${r.value}"` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(r.id)}
                    className="ml-auto p-1 rounded hover:bg-muted text-destructive"
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
