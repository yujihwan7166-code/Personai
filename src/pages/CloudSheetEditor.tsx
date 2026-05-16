/** /cloud/sheet/:id — 시트 에디터.
 *  6단계-α: 26×50 셀 그리드, 텍스트 입력, 키보드 탐색, 자동저장.
 *  수식 (=...), 시트 탭, 셀 서식, .xlsx import/export 는 다음 단계.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X, MoreHorizontal, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Keyboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchNode, updateFileBody } from '@/lib/cloudClient';
import { evalCell } from '@/lib/cloudSheet/formula';
import type { CloudNode } from '@/types/cloud';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type Cells = Record<string, string>;

const ROWS = 50;
const COLS = 26; // A~Z
const AUTOSAVE_DELAY_MS = 1000;

function colLabel(col: number): string {
  return String.fromCharCode(65 + col); // A~Z (v1은 26열 고정이라 단순)
}
function cellRef(row: number, col: number): string {
  return `${colLabel(col)}${row + 1}`;
}

export default function CloudSheetEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [node, setNode] = useState<CloudNode | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [helpOpen, setHelpOpen] = useState(false);

  const [cells, setCells] = useState<Cells>({});
  const [selected, setSelected] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [editing, setEditing] = useState<{ row: number; col: number } | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // 수식 평가 캐시 (cells 변경 시만 재계산) — early return 이전 위치
  const displayValues = useMemo<Cells>(() => {
    const out: Cells = {};
    for (const [ref, raw] of Object.entries(cells)) {
      out[ref] = raw.startsWith('=') ? evalCell(ref, cells) : raw;
    }
    return out;
  }, [cells]);

  const pendingRef = useRef<{ name?: string; meta?: Record<string, unknown> }>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── 노드 로드 + 초기 cells 주입 ───
  useEffect(() => {
    if (!id) return;
    if (authLoading) return;
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const n = await fetchNode(id);
        if (cancelled) return;
        if (!n) { setLoadError('시트를 찾을 수 없어요.'); return; }
        if (n.ownerId !== user.id) { setLoadError('접근 권한이 없어요.'); return; }
        if (n.kind !== 'file' || n.fileType !== 'sheet') {
          setLoadError('시트 파일이 아니에요.');
          return;
        }
        setNode(n);
        const meta = n.meta as Record<string, unknown> | null;
        const stored = meta?.cells;
        if (stored && typeof stored === 'object') {
          // 안전 캐스트: { [ref]: string }
          const safe: Cells = {};
          for (const [k, v] of Object.entries(stored as Record<string, unknown>)) {
            if (typeof v === 'string') safe[k] = v;
            else if (v != null) safe[k] = String(v);
          }
          setCells(safe);
        }
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [id, user, authLoading]);

  // ─── 저장 큐 ───
  const flushSave = useCallback(async () => {
    if (!id) return;
    const payload = pendingRef.current;
    if (!payload.name && !payload.meta) return;
    pendingRef.current = {};
    setSaveState('saving');
    try {
      await updateFileBody(id, payload);
      setSaveState('saved');
    } catch (e) {
      setSaveState('error');
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '저장 실패', description: msg });
    }
  }, [id]);

  const queueSave = useCallback((nextCells: Cells) => {
    pendingRef.current = {
      ...pendingRef.current,
      meta: { ...(node?.meta ?? {}), cells: nextCells },
    };
    setSaveState('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void flushSave(); }, AUTOSAVE_DELAY_MS);
  }, [flushSave, node?.meta]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      void flushSave();
    };
  }, [flushSave]);

  // ─── 셀 값 변경 ───
  const setCellValue = useCallback((ref: string, value: string) => {
    setCells((c) => {
      const next = { ...c };
      if (value === '') delete next[ref];
      else next[ref] = value;
      queueSave(next);
      return next;
    });
  }, [queueSave]);

  // ─── 편집 시작/완료 ───
  const startEdit = useCallback((row: number, col: number, initialChar?: string) => {
    const ref = cellRef(row, col);
    setEditing({ row, col });
    setEditingValue(initialChar ?? cells[ref] ?? '');
  }, [cells]);

  const commitEdit = useCallback((moveDir?: 'down' | 'right' | 'none') => {
    setEditing((cur) => {
      if (!cur) return null;
      const ref = cellRef(cur.row, cur.col);
      setCellValue(ref, editingValue);
      if (moveDir === 'down') {
        setSelected((s) => ({ ...s, row: Math.min(ROWS - 1, s.row + 1) }));
      } else if (moveDir === 'right') {
        setSelected((s) => ({ ...s, col: Math.min(COLS - 1, s.col + 1) }));
      }
      return null;
    });
    setEditingValue('');
  }, [editingValue, setCellValue]);

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setEditingValue('');
  }, []);

  // ─── 키보드 (편집 중 X, input 내 X) ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing) return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      const isMod = e.ctrlKey || e.metaKey || e.altKey;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        if (!isMod) { e.preventDefault(); setHelpOpen(true); return; }
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => ({ ...s, row: Math.max(0, s.row - 1) }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => ({ ...s, row: Math.min(ROWS - 1, s.row + 1) }));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelected((s) => ({ ...s, col: Math.max(0, s.col - 1) }));
      } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
        e.preventDefault();
        setSelected((s) => ({ ...s, col: Math.min(COLS - 1, s.col + 1) }));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        startEdit(selected.row, selected.col);
      } else if (e.key === 'F2') {
        e.preventDefault();
        startEdit(selected.row, selected.col);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const ref = cellRef(selected.row, selected.col);
        if (cells[ref] !== undefined) setCellValue(ref, '');
      } else if (e.key.length === 1 && !isMod) {
        // 글자 입력 → 즉시 편집 진입 + 그 글자로 초기화
        e.preventDefault();
        startEdit(selected.row, selected.col, e.key);
      } else if (e.key === 'Escape') {
        // 선택 해제(시각 효과만)
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, selected, cells, startEdit, setCellValue]);

  const close = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    void flushSave();
    navigate('/cloud');
  }, [flushSave, navigate]);

  // ─── 로딩·에러 ───
  if (authLoading || (!loadError && !node)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <div className="text-base font-medium">{loadError}</div>
        <button
          type="button"
          onClick={() => navigate('/cloud')}
          className="px-4 py-2 rounded border border-border hover:bg-muted text-sm flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          클라우드로 돌아가기
        </button>
      </div>
    );
  }

  const selectedRef = cellRef(selected.row, selected.col);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background sticky top-0 z-20">
        <div className="flex items-center gap-2 px-4 py-2 text-sm">
          <button
            onClick={close}
            className="p-2 rounded hover:bg-muted"
            aria-label="닫기"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-muted-foreground" aria-hidden>☁️</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium truncate max-w-md">{node?.name ?? '제목 없음'}</span>

          <span className="ml-3 text-xs">
            <SaveStateBadge state={saveState} />
          </span>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="p-2 rounded hover:bg-muted"
              aria-label="단축키 도움말"
              title="단축키 도움말 (?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => toast({ title: '곧 활성화돼요', description: '다운로드·공유는 다음 단계입니다.' })}
              className="p-2 rounded hover:bg-muted"
              aria-label="더보기"
              title="더보기"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 수식 표시줄: 원본(raw, 수식 포함) 표시 */}
        <div className="border-t border-border bg-muted/20 flex items-center gap-2 px-3 py-1.5 text-xs">
          <span className="w-14 font-mono font-medium text-muted-foreground shrink-0">{selectedRef}</span>
          <span className="text-muted-foreground select-none">fx</span>
          <span className="flex-1 truncate font-mono">
            {cells[selectedRef] ?? ''}
          </span>
          {(cells[selectedRef] ?? '').startsWith('=') && (
            <span className="text-muted-foreground shrink-0">
              = <span className="font-medium text-foreground">{displayValues[selectedRef] ?? ''}</span>
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <SheetGrid
          cells={cells}
          displayValues={displayValues}
          selected={selected}
          editing={editing}
          editingValue={editingValue}
          onSelect={(row, col) => setSelected({ row, col })}
          onStartEdit={startEdit}
          onChangeValue={setEditingValue}
          onCommitEdit={commitEdit}
          onCancelEdit={cancelEdit}
        />
      </main>

      <SheetHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

// ─────────────────────────────────────────────
// 그리드
// ─────────────────────────────────────────────

interface SheetGridProps {
  cells: Cells;
  displayValues: Cells;
  selected: { row: number; col: number };
  editing: { row: number; col: number } | null;
  editingValue: string;
  onSelect: (row: number, col: number) => void;
  onStartEdit: (row: number, col: number) => void;
  onChangeValue: (v: string) => void;
  onCommitEdit: (moveDir?: 'down' | 'right' | 'none') => void;
  onCancelEdit: () => void;
}

function SheetGrid({
  cells, displayValues, selected, editing, editingValue,
  onSelect, onStartEdit, onChangeValue, onCommitEdit, onCancelEdit,
}: SheetGridProps) {
  const cols = useMemo(() => Array.from({ length: COLS }, (_, i) => colLabel(i)), []);
  const rows = useMemo(() => Array.from({ length: ROWS }, (_, i) => i), []);

  return (
    <div className="inline-block min-w-full">
      <table className="border-collapse text-sm font-normal">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="w-10 h-7 border border-border bg-muted/40 sticky left-0 z-20"></th>
            {cols.map((c) => (
              <th
                key={c}
                className="border border-border bg-muted/40 px-2 py-1 text-xs font-normal text-muted-foreground min-w-[88px]"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((rowIdx) => (
            <tr key={rowIdx}>
              <th className="w-10 h-7 border border-border bg-muted/40 text-xs font-normal text-muted-foreground sticky left-0 z-10">
                {rowIdx + 1}
              </th>
              {cols.map((_, colIdx) => {
                const ref = cellRef(rowIdx, colIdx);
                const raw = cells[ref] ?? '';
                // 표시값: 수식이면 평가 결과, 아니면 raw 그대로
                const display = raw.startsWith('=') ? (displayValues[ref] ?? '') : raw;
                const isSelected = selected.row === rowIdx && selected.col === colIdx;
                const isEditing = !!editing && editing.row === rowIdx && editing.col === colIdx;
                return (
                  <SheetCell
                    key={ref}
                    row={rowIdx}
                    col={colIdx}
                    value={display}
                    selected={isSelected}
                    editing={isEditing}
                    editingValue={editingValue}
                    onSelect={onSelect}
                    onStartEdit={onStartEdit}
                    onChangeValue={onChangeValue}
                    onCommitEdit={onCommitEdit}
                    onCancelEdit={onCancelEdit}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────
// 셀
// ─────────────────────────────────────────────

interface SheetCellProps {
  row: number;
  col: number;
  value: string;
  selected: boolean;
  editing: boolean;
  editingValue: string;
  onSelect: (row: number, col: number) => void;
  onStartEdit: (row: number, col: number) => void;
  onChangeValue: (v: string) => void;
  onCommitEdit: (moveDir?: 'down' | 'right' | 'none') => void;
  onCancelEdit: () => void;
}

const SheetCell = React.memo(function SheetCell({
  row, col, value, selected, editing, editingValue,
  onSelect, onStartEdit, onChangeValue, onCommitEdit, onCancelEdit,
}: SheetCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      // 다음 tick 에 포커스 + 끝으로 커서
      setTimeout(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      }, 0);
    }
  }, [editing]);

  return (
    <td
      onClick={() => onSelect(row, col)}
      onDoubleClick={() => onStartEdit(row, col)}
      className={cn(
        'border border-border h-7 px-2 align-middle relative cursor-cell',
        'min-w-[88px] max-w-[200px] truncate',
        selected && !editing && 'outline outline-2 -outline-offset-2 outline-foreground/70',
      )}
      style={{ padding: editing ? 0 : undefined }}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={editingValue}
          onChange={(e) => onChangeValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); onCommitEdit('down'); }
            else if (e.key === 'Tab') { e.preventDefault(); onCommitEdit('right'); }
            else if (e.key === 'Escape') { e.preventDefault(); onCancelEdit(); }
          }}
          onBlur={() => onCommitEdit('none')}
          className="w-full h-full px-2 outline-none bg-background border-2 border-foreground/70 text-sm"
        />
      ) : (
        <span className="block truncate">{value}</span>
      )}
    </td>
  );
});

// ─────────────────────────────────────────────
// 저장 상태 뱃지
// ─────────────────────────────────────────────

function SaveStateBadge({ state }: { state: SaveState }) {
  if (state === 'saving') {
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        저장 중…
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <CheckCircle2 className="w-3 h-3" />
        저장됨
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="flex items-center gap-1 text-destructive">
        <AlertCircle className="w-3 h-3" />
        저장 실패
      </span>
    );
  }
  return null;
}

// ─────────────────────────────────────────────
// 단축키 도움말
// ─────────────────────────────────────────────

function SheetHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-base">시트 단축키</DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          시트 에디터에서 쓸 수 있는 단축키.
        </DialogDescription>

        <div className="space-y-4 text-sm">
          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">이동</h3>
            <div className="space-y-1">
              <HelpRow keys={['↑', '↓', '←', '→']} label="셀 이동" />
              <HelpRow keys={['Tab']} label="오른쪽 셀" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">편집</h3>
            <div className="space-y-1">
              <HelpRow keys={['Enter']} label="편집 진입 / 편집 후 아래 셀" />
              <HelpRow keys={['F2']} label="편집 진입 (현재 값 유지)" />
              <HelpRow keys={['a-z 0-9']} label="편집 진입 + 그 글자로 초기화" />
              <HelpRow keys={['Tab']} label="편집 후 오른쪽 셀" />
              <HelpRow keys={['Esc']} label="편집 취소" />
              <HelpRow keys={['Delete', 'Backspace']} label="셀 내용 지우기" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">기타</h3>
            <div className="space-y-1">
              <HelpRow keys={['?']} label="이 도움말" />
            </div>
          </section>
        </div>

        <div className="pt-3 text-xs text-muted-foreground border-t border-border space-y-1">
          <div className="font-medium text-foreground">수식 (✅ 지원):</div>
          <div>=SUM(A1:A10) · =AVG / AVERAGE · =MIN / MAX / COUNT</div>
          <div>=IF(A1{'>'}5, "큼", "작음") · =ABS / ROUND</div>
          <div>=A1+B1*2 · =(A1+B1)/2 · =A1^2</div>
          <div className="text-muted-foreground/70">에러: #CIRCULAR / #ERROR / #DIV/0!</div>
          <div className="pt-1">시트 탭 · 셀 서식 · .xlsx import/export 는 다음 단계.</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HelpRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={`${k}-${i}`}
            className="text-[10px] border border-border rounded px-1.5 py-0.5 bg-muted/40 font-mono"
          >
            {k}
          </kbd>
        ))}
      </span>
    </div>
  );
}
