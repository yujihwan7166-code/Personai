/** /cloud/sheet/:id — 시트 에디터.
 *  6단계-α: 26×50 셀 그리드, 텍스트 입력, 키보드 탐색, 자동저장.
 *  수식 (=...), 시트 탭, 셀 서식, .xlsx import/export 는 다음 단계.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X, MoreHorizontal, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Keyboard,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, Palette, Highlighter, Eraser,
  Hash, Square as SquareIcon, Combine, Split,
  Plus, Pencil, Copy as CopyIcon, Trash2 as TrashIcon,
  Upload, Download, Sparkles, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon,
  Search as SearchIcon, ChevronUp, ChevronDown, Replace as ReplaceIcon,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchNode, updateFileBody } from '@/lib/cloudClient';
import { evalCell, idxToCol, colToIdx } from '@/lib/cloudSheet/formula';
import { importXlsxFile, exportXlsxFile } from '@/lib/cloudSheet/xlsx';
import { cellsToCsv, sheetSummarize, sheetSuggestFormula, sheetExplainSelection } from '@/lib/cloudSheet/ai';
import { buildChartData, flattenForPie, CHART_PALETTE, type SelRange } from '@/lib/cloudSheet/chart';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell as RechartsCell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { exportElementToPdf, sanitizeFileName } from '@/lib/cloudCommon/pdfExport';
import type { CloudNode } from '@/types/cloud';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type Cells = Record<string, string>;

interface SheetMeta {
  id: string;
  name: string;
}
type AllCells = Record<string, Cells>;
type AllFormats = Record<string, CellFormats>;
interface Merge { minR: number; maxR: number; minC: number; maxC: number }
type AllMerges = Record<string, Merge[]>;

function newSheetId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

type NumberFmt = 'currency-krw' | 'percent' | 'integer' | 'decimal2' | 'date';
type BorderStyle = 'all' | 'outer' | 'top' | 'bottom' | 'left' | 'right';

interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  textColor?: string;
  bgColor?: string;
  align?: 'left' | 'center' | 'right';
  numberFmt?: NumberFmt;
  border?: BorderStyle;
}
type CellFormats = Record<string, CellFormat>;

const NUMBER_FMT_OPTIONS: Array<{ value: '' | NumberFmt; label: string; example: string }> = [
  { value: '',              label: '자동',     example: '' },
  { value: 'integer',       label: '정수',     example: '1,234' },
  { value: 'decimal2',      label: '소수 2자리', example: '1.23' },
  { value: 'currency-krw',  label: '₩ 통화',   example: '₩1,234' },
  { value: 'percent',       label: '%',        example: '12.3%' },
  { value: 'date',          label: '날짜',     example: '2026-05-16' },
];

function applyNumberFormat(value: string, fmt: NumberFmt | undefined): string {
  if (!fmt) return value;
  const n = Number(value);
  if (!Number.isFinite(n) || value === '') return value;
  switch (fmt) {
    case 'integer':       return Math.round(n).toLocaleString('ko-KR');
    case 'decimal2':      return n.toFixed(2);
    case 'currency-krw':  return `₩${n.toLocaleString('ko-KR')}`;
    case 'percent':       return `${(n * 100).toFixed(1)}%`;
    case 'date': {
      // Excel serial(1900) vs ms timestamp 둘 다 시도
      let d: Date | null = null;
      if (n > 1e10) d = new Date(n);                 // ms timestamp
      else if (n > 25569) d = new Date((n - 25569) * 86400 * 1000); // Excel serial
      else d = new Date(n);                          // 그 외
      if (isNaN(d.getTime())) return value;
      return d.toLocaleDateString('ko-KR');
    }
    default: return value;
  }
}

function borderStyleFor(b: BorderStyle | undefined): React.CSSProperties {
  if (!b) return {};
  const line = '1.5px solid hsl(var(--foreground))';
  switch (b) {
    case 'all':    return { boxShadow: `inset 0 0 0 1.5px hsl(var(--foreground))` };
    case 'outer':  return { boxShadow: `inset 0 0 0 1.5px hsl(var(--foreground))` };
    case 'top':    return { borderTop: line };
    case 'bottom': return { borderBottom: line };
    case 'left':   return { borderLeft: line };
    case 'right':  return { borderRight: line };
    default:       return {};
  }
}

const DEFAULT_ROWS = 50;
const DEFAULT_COLS = 26; // A~Z
const MIN_ROWS = 10;
const MIN_COLS = 5;
const MAX_ROWS = 2000;
const MAX_COLS = 200; // AA, AB, ..., GR
const ROW_ADD_CHUNK = 20;
const COL_ADD_CHUNK = 5;
const DEFAULT_COL_WIDTH = 88; // px
const MIN_COL_WIDTH = 40;
const MAX_COL_WIDTH = 600;
const AUTOSAVE_DELAY_MS = 1000;

function colLabel(col: number): string {
  return idxToCol(col); // A, B, ..., Z, AA, AB, ...
}
function cellRef(row: number, col: number): string {
  return `${colLabel(col)}${row + 1}`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** cells 의 최대 row / col 계산 (참조 → 좌표) */
function maxRowColFromCells(cells: Cells): { row: number; col: number } {
  let maxR = -1; let maxC = -1;
  for (const ref of Object.keys(cells)) {
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    if (!m) continue;
    const c = colToIdx(m[1]);
    const r = Number(m[2]) - 1;
    if (r > maxR) maxR = r;
    if (c > maxC) maxC = c;
  }
  return { row: maxR, col: maxC };
}

function maxRowColFromAll(
  allCells: AllCells, allMerges: AllMerges,
): { row: number; col: number } {
  let maxR = -1; let maxC = -1;
  for (const sheetId of Object.keys(allCells)) {
    const { row, col } = maxRowColFromCells(allCells[sheetId] ?? {});
    if (row > maxR) maxR = row;
    if (col > maxC) maxC = col;
  }
  for (const sheetId of Object.keys(allMerges)) {
    for (const m of allMerges[sheetId] ?? []) {
      if (m.maxR > maxR) maxR = m.maxR;
      if (m.maxC > maxC) maxC = m.maxC;
    }
  }
  return { row: maxR, col: maxC };
}

export default function CloudSheetEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [node, setNode] = useState<CloudNode | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [helpOpen, setHelpOpen] = useState(false);

  // 다중 시트 — sheetsMeta 는 순서·이름, allCells/allFormats 는 시트별 데이터
  const [sheetsMeta, setSheetsMeta] = useState<SheetMeta[]>([{ id: 's_initial', name: 'Sheet1' }]);
  const [currentSheetIdx, setCurrentSheetIdx] = useState(0);
  const [allCells, setAllCells] = useState<AllCells>({ s_initial: {} });
  const [allFormats, setAllFormats] = useState<AllFormats>({ s_initial: {} });

  // 행/열 개수 — 파일 단위 (모든 시트 공통) v1
  const [rowCount, setRowCount] = useState(DEFAULT_ROWS);
  const [colCount, setColCount] = useState(DEFAULT_COLS);
  // 열 너비 — colIdx → px (없으면 DEFAULT_COL_WIDTH)
  const [colWidths, setColWidths] = useState<Record<number, number>>({});

  const [selected, setSelected] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [rangeAnchor, setRangeAnchor] = useState<{ row: number; col: number } | null>(null);
  const [draggingRange, setDraggingRange] = useState(false);
  const [editing, setEditing] = useState<{ row: number; col: number } | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // 선택 범위 계산 (rangeAnchor 가 null 이면 단일 셀)
  const selBounds = useMemo(() => {
    if (!rangeAnchor) {
      return { minR: selected.row, maxR: selected.row, minC: selected.col, maxC: selected.col };
    }
    return {
      minR: Math.min(rangeAnchor.row, selected.row),
      maxR: Math.max(rangeAnchor.row, selected.row),
      minC: Math.min(rangeAnchor.col, selected.col),
      maxC: Math.max(rangeAnchor.col, selected.col),
    };
  }, [rangeAnchor, selected]);

  const hasRange = !!rangeAnchor && (rangeAnchor.row !== selected.row || rangeAnchor.col !== selected.col);
  // 현재 포커스 셀 ref (서식 도구바·수식 표시줄에서 사용) — useCallback 의존성 TDZ 회피
  const selectedRef = cellRef(selected.row, selected.col);

  // 셀 병합 — sheet 별 merge 배열 (top-left 포함, 좌표는 0-based)
  const [allMerges, setAllMerges] = useState<AllMerges>({ s_initial: [] });

  // derived — 현재 시트의 cells/formats/merges
  const currentSheet = sheetsMeta[currentSheetIdx] ?? sheetsMeta[0];
  const currentSheetId = currentSheet?.id ?? 's_initial';
  const cells = allCells[currentSheetId] ?? {};
  const cellFormats = allFormats[currentSheetId] ?? {};
  const merges = allMerges[currentSheetId] ?? [];

  // 병합 렌더링용 — top-left 위치 → 크기, 그 외 위치 → covered 표시
  const { mergeAtMap, coveredSet } = useMemo(() => {
    const at = new Map<string, { rows: number; cols: number }>();
    const covered = new Set<string>();
    for (const m of merges) {
      at.set(`${m.minR},${m.minC}`, { rows: m.maxR - m.minR + 1, cols: m.maxC - m.minC + 1 });
      for (let r = m.minR; r <= m.maxR; r++) {
        for (let c = m.minC; c <= m.maxC; c++) {
          if (r === m.minR && c === m.minC) continue;
          covered.add(`${r},${c}`);
        }
      }
    }
    return { mergeAtMap: at, coveredSet: covered };
  }, [merges]);

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
  const gridRef = useRef<HTMLDivElement>(null);

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
        const meta = (n.meta ?? {}) as Record<string, unknown>;
        const storedSheets = meta.sheets as Array<{ id: string; name: string }> | undefined;
        const storedAllCells = meta.allCells as AllCells | undefined;
        const storedAllFormats = meta.allFormats as AllFormats | undefined;
        const storedAllMerges = meta.allMerges as AllMerges | undefined;
        const storedRowCount = typeof meta.rowCount === 'number' ? meta.rowCount : undefined;
        const storedColCount = typeof meta.colCount === 'number' ? meta.colCount : undefined;
        const storedColWidths = meta.colWidths as Record<string, number> | undefined;
        if (Array.isArray(storedSheets) && storedSheets.length > 0) {
          // 다중 시트 형식 (현재 모델)
          const cellsAll = storedAllCells ?? {};
          const mergesAll = storedAllMerges ?? {};
          setSheetsMeta(storedSheets);
          setAllCells(cellsAll);
          setAllFormats(storedAllFormats ?? {});
          setAllMerges(mergesAll);
          // 데이터 기반 최소 그리드 크기 보장
          const { row: maxR, col: maxC } = maxRowColFromAll(cellsAll, mergesAll);
          const rc = Math.max(storedRowCount ?? DEFAULT_ROWS, maxR + 1, MIN_ROWS);
          const cc = Math.max(storedColCount ?? DEFAULT_COLS, maxC + 1, MIN_COLS);
          setRowCount(Math.min(rc, MAX_ROWS));
          setColCount(Math.min(cc, MAX_COLS));
          // 열 너비 복원 (key 가 문자열로 저장돼있으므로 숫자로 변환)
          if (storedColWidths && typeof storedColWidths === 'object') {
            const out: Record<number, number> = {};
            for (const [k, v] of Object.entries(storedColWidths)) {
              const idx = Number(k);
              if (Number.isFinite(idx) && typeof v === 'number') out[idx] = v;
            }
            setColWidths(out);
          }
          const idx = typeof meta.currentSheetIdx === 'number'
            ? Math.max(0, Math.min(meta.currentSheetIdx, storedSheets.length - 1))
            : 0;
          setCurrentSheetIdx(idx);
        } else {
          // 단일 시트 옛 형식 → 마이그레이션 (cells/cellFormats 직접)
          const stored = meta.cells;
          const safe: Cells = {};
          if (stored && typeof stored === 'object') {
            for (const [k, v] of Object.entries(stored as Record<string, unknown>)) {
              if (typeof v === 'string') safe[k] = v;
              else if (v != null) safe[k] = String(v);
            }
          }
          const storedFmt = meta.cellFormats;
          const safeFmt: CellFormats = {};
          if (storedFmt && typeof storedFmt === 'object') {
            for (const [k, v] of Object.entries(storedFmt as Record<string, unknown>)) {
              if (v && typeof v === 'object') safeFmt[k] = v as CellFormat;
            }
          }
          const id = 's_initial';
          setSheetsMeta([{ id, name: 'Sheet1' }]);
          setAllCells({ [id]: safe });
          setAllFormats({ [id]: safeFmt });
          setAllMerges({ [id]: [] });
          setCurrentSheetIdx(0);
          const { row: maxR, col: maxC } = maxRowColFromCells(safe);
          setRowCount(Math.max(DEFAULT_ROWS, maxR + 1, MIN_ROWS));
          setColCount(Math.max(DEFAULT_COLS, maxC + 1, MIN_COLS));
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

  const queueSave = useCallback((patch: {
    sheets?: SheetMeta[];
    allCells?: AllCells;
    allFormats?: AllFormats;
    allMerges?: AllMerges;
    currentSheetIdx?: number;
    rowCount?: number;
    colCount?: number;
    colWidths?: Record<number, number>;
  }) => {
    pendingRef.current = {
      ...pendingRef.current,
      meta: {
        sheets: patch.sheets ?? sheetsMeta,
        allCells: patch.allCells ?? allCells,
        allFormats: patch.allFormats ?? allFormats,
        allMerges: patch.allMerges ?? allMerges,
        currentSheetIdx: patch.currentSheetIdx ?? currentSheetIdx,
        rowCount: patch.rowCount ?? rowCount,
        colCount: patch.colCount ?? colCount,
        colWidths: patch.colWidths ?? colWidths,
      },
    };
    setSaveState('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void flushSave(); }, AUTOSAVE_DELAY_MS);
  }, [flushSave, sheetsMeta, allCells, allFormats, allMerges, currentSheetIdx, rowCount, colCount, colWidths]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      void flushSave();
    };
  }, [flushSave]);

  // ─── 셀 값 변경 (현재 시트) ───
  const setCellValue = useCallback((ref: string, value: string) => {
    setAllCells((all) => {
      const curCells = { ...(all[currentSheetId] ?? {}) };
      if (value === '') delete curCells[ref];
      else curCells[ref] = value;
      const next: AllCells = { ...all, [currentSheetId]: curCells };
      queueSave({ allCells: next });
      return next;
    });
  }, [queueSave, currentSheetId]);

  // ─── 셀 서식 변경 (현재 시트의 선택 셀) ───
  const setCellFormat = useCallback((ref: string, patch: Partial<CellFormat>) => {
    setAllFormats((all) => {
      const curFmts = { ...(all[currentSheetId] ?? {}) };
      const cur = curFmts[ref] ?? {};
      const merged: CellFormat = { ...cur, ...patch };
      for (const k of Object.keys(merged) as Array<keyof CellFormat>) {
        if (merged[k] === undefined || merged[k] === '') delete merged[k];
      }
      if (Object.keys(merged).length === 0) delete curFmts[ref];
      else curFmts[ref] = merged;
      const next: AllFormats = { ...all, [currentSheetId]: curFmts };
      queueSave({ allFormats: next });
      return next;
    });
  }, [queueSave, currentSheetId]);

  const clearCellFormat = useCallback((ref: string) => {
    setAllFormats((all) => {
      const curFmts = { ...(all[currentSheetId] ?? {}) };
      if (!(ref in curFmts)) return all;
      delete curFmts[ref];
      const next: AllFormats = { ...all, [currentSheetId]: curFmts };
      queueSave({ allFormats: next });
      return next;
    });
  }, [queueSave, currentSheetId]);

  // ─── 시트 관리 ───
  const switchSheet = useCallback((idx: number) => {
    setCurrentSheetIdx(idx);
    setSelected({ row: 0, col: 0 });
    setEditing(null);
    setEditingValue('');
    queueSave({ currentSheetIdx: idx });
  }, [queueSave]);

  const addSheet = useCallback(() => {
    const id = newSheetId();
    const usedNames = new Set(sheetsMeta.map((s) => s.name));
    let n = sheetsMeta.length + 1;
    while (usedNames.has(`Sheet${n}`)) n++;
    const newMeta: SheetMeta = { id, name: `Sheet${n}` };
    const nextSheets = [...sheetsMeta, newMeta];
    const nextCells: AllCells = { ...allCells, [id]: {} };
    const nextFormats: AllFormats = { ...allFormats, [id]: {} };
    const nextMerges: AllMerges = { ...allMerges, [id]: [] };
    setSheetsMeta(nextSheets);
    setAllCells(nextCells);
    setAllFormats(nextFormats);
    setAllMerges(nextMerges);
    setCurrentSheetIdx(nextSheets.length - 1);
    setSelected({ row: 0, col: 0 });
    queueSave({
      sheets: nextSheets, allCells: nextCells, allFormats: nextFormats, allMerges: nextMerges,
      currentSheetIdx: nextSheets.length - 1,
    });
  }, [sheetsMeta, allCells, allFormats, allMerges, queueSave]);

  const removeSheet = useCallback((idx: number) => {
    if (sheetsMeta.length <= 1) {
      toast({ title: '마지막 시트입니다', description: '최소 1개는 유지됩니다.' });
      return;
    }
    const target = sheetsMeta[idx];
    if (!target) return;
    const nextSheets = sheetsMeta.filter((_, i) => i !== idx);
    const nextCells: AllCells = { ...allCells };
    const nextFormats: AllFormats = { ...allFormats };
    const nextMerges: AllMerges = { ...allMerges };
    delete nextCells[target.id];
    delete nextFormats[target.id];
    delete nextMerges[target.id];
    const newIdx = Math.max(0, Math.min(currentSheetIdx, nextSheets.length - 1));
    setSheetsMeta(nextSheets);
    setAllCells(nextCells);
    setAllFormats(nextFormats);
    setAllMerges(nextMerges);
    setCurrentSheetIdx(newIdx);
    queueSave({
      sheets: nextSheets, allCells: nextCells, allFormats: nextFormats, allMerges: nextMerges,
      currentSheetIdx: newIdx,
    });
  }, [sheetsMeta, allCells, allFormats, allMerges, currentSheetIdx, queueSave]);

  const renameSheet = useCallback((idx: number, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const nextSheets = sheetsMeta.map((s, i) => (i === idx ? { ...s, name: trimmed } : s));
    setSheetsMeta(nextSheets);
    queueSave({ sheets: nextSheets });
  }, [sheetsMeta, queueSave]);

  // ─── 정렬 ───
  /** 정렬 대상 영역: 선택 범위 / 그리드 used range */
  const sortByColumn = useCallback(
    (colIdx: number, dir: 'asc' | 'desc', opts?: { hasHeader?: boolean }) => {
      // 영역 결정: 다중 선택이면 그 범위, 아니면 used range
      let area: SelRange;
      if (hasRange) {
        area = { ...selBounds };
      } else {
        const { row: maxR, col: maxC } = maxRowColFromCells(cells);
        if (maxR < 0 || maxC < 0) {
          toast({ title: '정렬할 데이터가 없어요' });
          return;
        }
        area = { minR: 0, maxR, minC: 0, maxC };
      }
      // 정렬 키 컬럼이 영역 밖이면 거절
      if (colIdx < area.minC || colIdx > area.maxC) {
        toast({ title: '정렬 키 열이 선택 영역 밖이에요' });
        return;
      }
      // 영역과 겹치는 병합이 있으면 거절 (구조가 깨짐)
      const blockedByMerge = merges.some((m) =>
        !(m.maxR < area.minR || m.minR > area.maxR || m.maxC < area.minC || m.minC > area.maxC),
      );
      if (blockedByMerge) {
        toast({ title: '병합된 셀이 있어 정렬 불가', description: '병합 해제 후 다시 시도하세요.' });
        return;
      }

      // 헤더 처리: opts.hasHeader 가 명시되면 사용, 아니면 자동 감지 — 첫 행 모든 칸이 문자열이고
      // 나머지 행에 숫자가 1개 이상 있으면 헤더로 간주
      const autoHasHeader = (() => {
        let firstRowAllText = true;
        for (let c = area.minC; c <= area.maxC; c++) {
          const v = cells[cellRef(area.minR, c)] ?? '';
          if (v && Number.isFinite(Number(v))) { firstRowAllText = false; break; }
        }
        let restHasNumber = false;
        outer: for (let r = area.minR + 1; r <= area.maxR; r++) {
          for (let c = area.minC; c <= area.maxC; c++) {
            const v = cells[cellRef(r, c)] ?? '';
            if (v && Number.isFinite(Number(v))) { restHasNumber = true; break outer; }
          }
        }
        return firstRowAllText && restHasNumber;
      })();
      const hasHeader = opts?.hasHeader ?? autoHasHeader;
      const startRow = hasHeader ? area.minR + 1 : area.minR;
      if (startRow >= area.maxR) {
        toast({ title: '정렬할 행이 부족합니다' });
        return;
      }

      // 행 수집
      const rows: Array<{ values: string[]; formats: Array<CellFormat | undefined> }> = [];
      for (let r = startRow; r <= area.maxR; r++) {
        const values: string[] = [];
        const formats: Array<CellFormat | undefined> = [];
        for (let c = area.minC; c <= area.maxC; c++) {
          values.push(cells[cellRef(r, c)] ?? '');
          formats.push(cellFormats[cellRef(r, c)]);
        }
        rows.push({ values, formats });
      }

      // 정렬
      const keyIdx = colIdx - area.minC;
      rows.sort((a, b) => {
        const va = a.values[keyIdx];
        const vb = b.values[keyIdx];
        // 빈 셀은 항상 끝으로
        if (!va && !vb) return 0;
        if (!va) return 1;
        if (!vb) return -1;
        const na = Number(va);
        const nb = Number(vb);
        let cmp: number;
        if (Number.isFinite(na) && Number.isFinite(nb)) cmp = na - nb;
        else cmp = String(va).localeCompare(String(vb), 'ko');
        return dir === 'asc' ? cmp : -cmp;
      });

      // 다시 쓰기
      const nextCells: Cells = { ...cells };
      const nextFormats: CellFormats = { ...cellFormats };
      let i = 0;
      for (let r = startRow; r <= area.maxR; r++) {
        const row = rows[i++];
        for (let c = area.minC; c <= area.maxC; c++) {
          const ref = cellRef(r, c);
          const v = row.values[c - area.minC];
          const fmt = row.formats[c - area.minC];
          if (v === '') delete nextCells[ref]; else nextCells[ref] = v;
          if (!fmt) delete nextFormats[ref]; else nextFormats[ref] = fmt;
        }
      }
      const nextAllCells: AllCells = { ...allCells, [currentSheetId]: nextCells };
      const nextAllFormats: AllFormats = { ...allFormats, [currentSheetId]: nextFormats };
      setAllCells(nextAllCells);
      setAllFormats(nextAllFormats);
      queueSave({ allCells: nextAllCells, allFormats: nextAllFormats });
      toast({
        title: `${idxToCol(colIdx)}열 ${dir === 'asc' ? '오름차순' : '내림차순'} 정렬`,
        description: `${rows.length}행 정렬 · ${hasHeader ? '첫 행은 헤더로 유지' : '헤더 없음'}`,
      });
    },
    [hasRange, selBounds, cells, cellFormats, merges, allCells, allFormats, currentSheetId, queueSave],
  );

  // ─── 검색/치환 (시트 내) ───
  const [searchOpen, setSearchOpen] = useState<false | 'find' | 'replace'>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false);
  const [searchCursor, setSearchCursor] = useState(0);

  // 매치된 셀 ref 목록 (현재 시트만)
  const searchMatches = useMemo<string[]>(() => {
    if (!searchQuery) return [];
    const q = searchCaseSensitive ? searchQuery : searchQuery.toLowerCase();
    const hits: string[] = [];
    // 일관된 순서: row 우선, col 다음
    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < colCount; c++) {
        const ref = cellRef(r, c);
        const raw = cells[ref];
        if (raw === undefined) continue;
        const display = raw.startsWith('=') ? (displayValues[ref] ?? '') : raw;
        const hay = searchCaseSensitive ? display : display.toLowerCase();
        if (hay.includes(q)) hits.push(ref);
      }
    }
    return hits;
  }, [searchQuery, searchCaseSensitive, cells, displayValues, rowCount, colCount]);

  const searchMatchSet = useMemo(() => new Set(searchMatches), [searchMatches]);

  // cursor 가 범위 벗어나면 0으로
  useEffect(() => {
    if (searchCursor >= searchMatches.length) setSearchCursor(0);
  }, [searchMatches.length, searchCursor]);

  // 현재 매치로 selected 이동 + scroll
  const goToMatch = useCallback((idx: number) => {
    if (searchMatches.length === 0) return;
    const i = ((idx % searchMatches.length) + searchMatches.length) % searchMatches.length;
    setSearchCursor(i);
    const ref = searchMatches[i];
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    if (!m) return;
    setRangeAnchor(null);
    setSelected({ row: Number(m[2]) - 1, col: colToIdx(m[1]) });
    // 스크롤
    setTimeout(() => {
      const cell = gridRef.current?.querySelector(`[data-cell-ref="${ref}"]`) as HTMLElement | null;
      cell?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    }, 0);
  }, [searchMatches]);

  const searchNext = useCallback(() => goToMatch(searchCursor + 1), [goToMatch, searchCursor]);
  const searchPrev = useCallback(() => goToMatch(searchCursor - 1), [goToMatch, searchCursor]);

  const replaceOneInSheet = useCallback(() => {
    if (searchMatches.length === 0) return;
    const ref = searchMatches[searchCursor];
    const raw = cells[ref];
    if (raw === undefined || raw.startsWith('=')) {
      toast({ title: '수식 셀은 치환 X', description: '다음 매치로 넘어갑니다.' });
      goToMatch(searchCursor + 1);
      return;
    }
    const re = searchCaseSensitive
      ? new RegExp(escapeRegex(searchQuery), 'g')
      : new RegExp(escapeRegex(searchQuery), 'gi');
    const next = raw.replace(re, replaceText);
    setCellValue(ref, next);
    // 새로 계산된 매치에서 같은 인덱스(다음 매치로 자연스럽게)
  }, [searchMatches, searchCursor, cells, searchQuery, searchCaseSensitive, replaceText, setCellValue, goToMatch]);

  const replaceAllInSheet = useCallback(() => {
    if (searchMatches.length === 0) return;
    const re = searchCaseSensitive
      ? new RegExp(escapeRegex(searchQuery), 'g')
      : new RegExp(escapeRegex(searchQuery), 'gi');
    let count = 0;
    const nextCells: Cells = { ...cells };
    for (const ref of searchMatches) {
      const raw = nextCells[ref];
      if (raw === undefined || raw.startsWith('=')) continue;
      const replaced = raw.replace(re, replaceText);
      if (replaced !== raw) {
        nextCells[ref] = replaced;
        count++;
      }
    }
    if (count === 0) {
      toast({ title: '치환된 셀이 없어요', description: '(수식 셀은 제외됩니다)' });
      return;
    }
    const nextAll: AllCells = { ...allCells, [currentSheetId]: nextCells };
    setAllCells(nextAll);
    queueSave({ allCells: nextAll });
    toast({ title: `${count}개 셀 치환됨` });
  }, [searchMatches, cells, searchQuery, searchCaseSensitive, replaceText, allCells, currentSheetId, queueSave]);

  // 글로벌 Ctrl+F / Ctrl+H — 편집 중·input 안일 때도 받기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key.toLowerCase() === 'f') {
        e.preventDefault(); setSearchOpen('find');
      } else if (isMod && e.key.toLowerCase() === 'h') {
        e.preventDefault(); setSearchOpen('replace');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ─── 복사 / 잘라내기 / 붙여넣기 (TSV — 엑셀과 호환) ───
  const rangeToTsv = useCallback((bounds: SelBounds): string => {
    const lines: string[] = [];
    for (let r = bounds.minR; r <= bounds.maxR; r++) {
      const row: string[] = [];
      for (let c = bounds.minC; c <= bounds.maxC; c++) {
        const ref = cellRef(r, c);
        const raw = cells[ref] ?? '';
        // 수식은 raw 그대로 (붙여넣기 시 다시 수식으로 복원)
        // 값 안에 탭/줄바꿈 있으면 "" 로 감싸기 (엑셀 호환)
        const needQuote = raw.includes('\t') || raw.includes('\n') || raw.includes('"');
        row.push(needQuote ? `"${raw.replace(/"/g, '""')}"` : raw);
      }
      lines.push(row.join('\t'));
    }
    return lines.join('\n');
  }, [cells]);

  const copyRange = useCallback(async () => {
    const tsv = rangeToTsv(selBounds);
    try {
      await navigator.clipboard.writeText(tsv);
      const w = selBounds.maxC - selBounds.minC + 1;
      const h = selBounds.maxR - selBounds.minR + 1;
      toast({ title: `${h}×${w} 복사됨`, description: '엑셀에도 그대로 붙여넣을 수 있어요.' });
    } catch {
      toast({ title: '클립보드 접근 실패' });
    }
  }, [rangeToTsv, selBounds]);

  const cutRange = useCallback(async () => {
    await copyRange();
    // 선택 범위 모두 지우기
    for (let r = selBounds.minR; r <= selBounds.maxR; r++) {
      for (let c = selBounds.minC; c <= selBounds.maxC; c++) {
        const ref = cellRef(r, c);
        if (cells[ref] !== undefined) setCellValue(ref, '');
      }
    }
  }, [copyRange, selBounds, cells, setCellValue]);

  /** TSV 텍스트 → 2D 배열 (엑셀 호환: "" 로 감싼 셀 안 \t 보존) */
  const parseTsv = useCallback((text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { cell += ch; }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === '\t') { row.push(cell); cell = ''; }
        else if (ch === '\n' || ch === '\r') {
          row.push(cell); cell = '';
          rows.push(row); row = [];
          if (ch === '\r' && text[i + 1] === '\n') i++;
        } else { cell += ch; }
      }
    }
    if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
    return rows;
  }, []);

  const pasteFromClipboard = useCallback(async () => {
    if (editing) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const grid = parseTsv(text);
      if (grid.length === 0) return;
      const startR = selected.row;
      const startC = selected.col;
      const nextCells: Cells = { ...cells };
      let maxR = startR;
      let maxC = startC;
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          const tr = startR + r;
          const tc = startC + c;
          if (tr >= rowCount || tc >= colCount) continue;
          const v = grid[r][c];
          const ref = cellRef(tr, tc);
          if (v === '') delete nextCells[ref];
          else nextCells[ref] = v;
          if (tr > maxR) maxR = tr;
          if (tc > maxC) maxC = tc;
        }
      }
      const nextAll: AllCells = { ...allCells, [currentSheetId]: nextCells };
      setAllCells(nextAll);
      queueSave({ allCells: nextAll });
      // 붙여넣은 영역을 새 선택 범위로
      if (maxR !== startR || maxC !== startC) {
        setRangeAnchor({ row: startR, col: startC });
        setSelected({ row: maxR, col: maxC });
      }
      const w = maxC - startC + 1;
      const h = maxR - startR + 1;
      toast({ title: `${h}×${w} 붙여넣음` });
    } catch (e) {
      toast({ title: '붙여넣기 실패', description: e instanceof Error ? e.message : '권한이 필요합니다.' });
    }
  }, [editing, selected, cells, parseTsv, rowCount, colCount, allCells, currentSheetId, queueSave]);

  // 글로벌 Ctrl+C / X / V (편집 중·input 내부 X)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing) return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;
      if (e.key.toLowerCase() === 'c') { e.preventDefault(); void copyRange(); }
      else if (e.key.toLowerCase() === 'x') { e.preventDefault(); void cutRange(); }
      else if (e.key.toLowerCase() === 'v') { e.preventDefault(); void pasteFromClipboard(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, copyRange, cutRange, pasteFromClipboard]);

  // ─── 차트 모달 ───
  const [chartOpen, setChartOpen] = useState(false);
  const openChart = useCallback(() => {
    const isSingle =
      selBounds.minR === selBounds.maxR && selBounds.minC === selBounds.maxC;
    if (isSingle) {
      toast({ title: '먼저 2칸 이상 선택하세요', description: 'Shift+화살표 / 마우스 드래그' });
      return;
    }
    setChartOpen(true);
  }, [selBounds]);

  // ─── AI 액션 ───
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const runAi = useCallback(async (label: string, fn: () => Promise<string>) => {
    setAiBusy(label);
    setAiResult(null);
    try {
      const out = await fn();
      setAiResult(out);
      toast({ title: `${label} 완료`, description: '결과 확인 모달이 떴어요.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: `${label} 실패`, description: msg });
    } finally {
      setAiBusy(null);
    }
  }, []);

  const aiSummarizeAll = useCallback(() => {
    const csv = cellsToCsv(cells, { displayValues });
    if (!csv) {
      toast({ title: '데이터가 없어요', description: '먼저 셀에 값을 입력하세요.' });
      return;
    }
    if (csv.length > 8000) {
      toast({ title: '데이터가 큽니다', description: '8000자로 잘려서 분석됩니다.' });
    }
    void runAi('데이터 요약', () => sheetSummarize(csv.slice(0, 8000)));
  }, [cells, displayValues, runAi]);

  const aiSuggestFormulaForCurrent = useCallback(async () => {
    const csv = cellsToCsv(cells, { displayValues });
    const goal = window.prompt('원하는 결과를 짧게 설명해주세요 (예: A열 합계, B열 평균, C열의 100 초과 개수)');
    if (!goal || !goal.trim()) return;
    void runAi('수식 추천', () => sheetSuggestFormula(csv.slice(0, 8000), goal.trim()));
  }, [cells, displayValues, runAi]);

  const aiExplainSelected = useCallback(() => {
    // 현재 선택 셀 한 개만 — 추후 범위 선택 추가
    const ref = selectedRef;
    const raw = cells[ref];
    if (!raw) {
      toast({ title: '선택 셀이 비어있어요' });
      return;
    }
    void runAi('셀 설명', () => sheetExplainSelection(`${ref}: ${raw}`));
  }, [selectedRef, cells, runAi]);

  // ─── .xlsx import: 파일 선택 → 모든 시트 우리 파일에 추가 ───
  const importXlsx = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const imported = await importXlsxFile(file);
        if (!imported.length) {
          toast({ title: '가져올 시트가 없어요', description: '빈 파일입니다.' });
          return;
        }
        // 새 시트들로 추가 (현재 시트는 보존)
        const newMetas: SheetMeta[] = [];
        const newAllCells: AllCells = { ...allCells };
        const newAllFormats: AllFormats = { ...allFormats };
        const newAllMerges: AllMerges = { ...allMerges };
        for (const sheet of imported) {
          const id = newSheetId();
          // 중복 이름 회피
          const usedNames = new Set([
            ...sheetsMeta.map((s) => s.name),
            ...newMetas.map((s) => s.name),
          ]);
          let name = sheet.name || 'Imported';
          let n = 2;
          while (usedNames.has(name)) {
            name = `${sheet.name} (${n++})`;
          }
          newMetas.push({ id, name });
          newAllCells[id] = sheet.cells;
          newAllFormats[id] = {};
          newAllMerges[id] = sheet.merges ?? [];
        }
        const nextSheets = [...sheetsMeta, ...newMetas];
        setSheetsMeta(nextSheets);
        setAllCells(newAllCells);
        setAllFormats(newAllFormats);
        setAllMerges(newAllMerges);
        setCurrentSheetIdx(sheetsMeta.length); // 첫 새 시트로 전환
        // 가져온 시트가 현재 그리드보다 크면 자동 확장
        const { row: maxR, col: maxC } = maxRowColFromAll(newAllCells, newAllMerges);
        const nextRowCount = Math.min(MAX_ROWS, Math.max(rowCount, maxR + 1));
        const nextColCount = Math.min(MAX_COLS, Math.max(colCount, maxC + 1));
        if (nextRowCount !== rowCount) setRowCount(nextRowCount);
        if (nextColCount !== colCount) setColCount(nextColCount);
        queueSave({
          sheets: nextSheets, allCells: newAllCells, allFormats: newAllFormats, allMerges: newAllMerges,
          currentSheetIdx: sheetsMeta.length,
          rowCount: nextRowCount, colCount: nextColCount,
        });
        toast({
          title: '가져오기 완료',
          description: `${imported.length}개 시트 추가 · 그리드 ${nextRowCount}행 × ${nextColCount}열 (셀 병합 보존)`,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast({ title: '가져오기 실패', description: msg });
      }
    };
    input.click();
  }, [allCells, allFormats, allMerges, sheetsMeta, rowCount, colCount, queueSave]);

  // ─── PDF export: 현재 시트 그리드 ───
  const exportPdf = useCallback(async () => {
    if (!gridRef.current) return;
    try {
      const name = sanitizeFileName(node?.name ?? '시트');
      await exportElementToPdf(gridRef.current, {
        fileName: `${name} - ${currentSheet?.name ?? 'Sheet'}`,
        orientation: 'l',  // 시트는 가로
      });
      toast({ title: 'PDF 다운로드 시작', description: `${name}.pdf` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'PDF 내보내기 실패', description: msg });
    }
  }, [node?.name, currentSheet?.name]);

  // ─── .xlsx export: 모든 시트 → 파일 다운로드 (서식·병합 포함) ───
  const exportXlsx = useCallback(async () => {
    try {
      const exportSheets = sheetsMeta.map((s) => ({
        name: s.name,
        cells: allCells[s.id] ?? {},
        cellFormats: allFormats[s.id] ?? {},
        merges: allMerges[s.id] ?? [],
      }));
      const fileName = (node?.name ?? '시트').replace(/[\\/:*?"<>|]/g, '_');
      await exportXlsxFile(exportSheets, fileName);
      toast({ title: '내보내기 완료', description: `${fileName}.xlsx (서식·병합 포함)` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '내보내기 실패', description: msg });
    }
  }, [sheetsMeta, allCells, allFormats, allMerges, node?.name]);

  const duplicateSheet = useCallback((idx: number) => {
    const src = sheetsMeta[idx];
    if (!src) return;
    const id = newSheetId();
    const newMeta: SheetMeta = { id, name: `${src.name} 복사본` };
    const nextSheets = [...sheetsMeta.slice(0, idx + 1), newMeta, ...sheetsMeta.slice(idx + 1)];
    const nextCells: AllCells = { ...allCells, [id]: { ...(allCells[src.id] ?? {}) } };
    const nextFormats: AllFormats = { ...allFormats, [id]: { ...(allFormats[src.id] ?? {}) } };
    const srcMerges = allMerges[src.id] ?? [];
    const nextMerges: AllMerges = { ...allMerges, [id]: srcMerges.map((m) => ({ ...m })) };
    setSheetsMeta(nextSheets);
    setAllCells(nextCells);
    setAllFormats(nextFormats);
    setAllMerges(nextMerges);
    setCurrentSheetIdx(idx + 1);
    queueSave({
      sheets: nextSheets, allCells: nextCells, allFormats: nextFormats, allMerges: nextMerges,
      currentSheetIdx: idx + 1,
    });
  }, [sheetsMeta, allCells, allFormats, allMerges, queueSave]);

  // ─── 행/열 개수 조정 ───
  const addRows = useCallback((n: number = ROW_ADD_CHUNK) => {
    const next = Math.min(MAX_ROWS, rowCount + n);
    if (next === rowCount) {
      toast({ title: `최대 ${MAX_ROWS}행까지 지원합니다` });
      return;
    }
    setRowCount(next);
    queueSave({ rowCount: next });
  }, [rowCount, queueSave]);

  const addCols = useCallback((n: number = COL_ADD_CHUNK) => {
    const next = Math.min(MAX_COLS, colCount + n);
    if (next === colCount) {
      toast({ title: `최대 ${MAX_COLS}열까지 지원합니다` });
      return;
    }
    setColCount(next);
    queueSave({ colCount: next });
  }, [colCount, queueSave]);

  // ─── 행/열 삽입·삭제 (셀·서식·병합 좌표 이동) ───
  const shiftCellsRow = useCallback((cur: Cells, atRow: number, delta: number): Cells => {
    if (delta === 0) return cur;
    const out: Cells = {};
    for (const [ref, v] of Object.entries(cur)) {
      const m = ref.match(/^([A-Z]+)(\d+)$/);
      if (!m) { out[ref] = v; continue; }
      const colStr = m[1];
      const r = Number(m[2]) - 1;
      if (delta < 0 && r === atRow) continue; // 삭제 대상 행
      const nr = r >= atRow ? r + delta : r;
      if (nr < 0) continue;
      out[`${colStr}${nr + 1}`] = v;
    }
    return out;
  }, []);

  const shiftCellsCol = useCallback((cur: Cells, atCol: number, delta: number): Cells => {
    if (delta === 0) return cur;
    const out: Cells = {};
    for (const [ref, v] of Object.entries(cur)) {
      const m = ref.match(/^([A-Z]+)(\d+)$/);
      if (!m) { out[ref] = v; continue; }
      const c = colToIdx(m[1]);
      const rowStr = m[2];
      if (delta < 0 && c === atCol) continue;
      const nc = c >= atCol ? c + delta : c;
      if (nc < 0) continue;
      out[`${idxToCol(nc)}${rowStr}`] = v;
    }
    return out;
  }, []);

  const shiftFormatsRow = useCallback((cur: CellFormats, atRow: number, delta: number): CellFormats => {
    if (delta === 0) return cur;
    const out: CellFormats = {};
    for (const [ref, v] of Object.entries(cur)) {
      const m = ref.match(/^([A-Z]+)(\d+)$/);
      if (!m) { out[ref] = v; continue; }
      const colStr = m[1];
      const r = Number(m[2]) - 1;
      if (delta < 0 && r === atRow) continue;
      const nr = r >= atRow ? r + delta : r;
      if (nr < 0) continue;
      out[`${colStr}${nr + 1}`] = v;
    }
    return out;
  }, []);

  const shiftFormatsCol = useCallback((cur: CellFormats, atCol: number, delta: number): CellFormats => {
    if (delta === 0) return cur;
    const out: CellFormats = {};
    for (const [ref, v] of Object.entries(cur)) {
      const m = ref.match(/^([A-Z]+)(\d+)$/);
      if (!m) { out[ref] = v; continue; }
      const c = colToIdx(m[1]);
      const rowStr = m[2];
      if (delta < 0 && c === atCol) continue;
      const nc = c >= atCol ? c + delta : c;
      if (nc < 0) continue;
      out[`${idxToCol(nc)}${rowStr}`] = v;
    }
    return out;
  }, []);

  const shiftMergesRow = useCallback((cur: Merge[], atRow: number, delta: number): Merge[] => {
    if (delta === 0) return cur;
    const out: Merge[] = [];
    for (const m of cur) {
      // 삭제 행에 완전 흡수되는 1행 병합은 제거
      if (delta < 0 && m.minR === atRow && m.maxR === atRow) continue;
      const adj = (r: number) => (r >= atRow ? r + delta : r);
      const nMinR = adj(m.minR);
      const nMaxR = adj(m.maxR);
      if (nMaxR < nMinR) continue;
      out.push({ ...m, minR: Math.max(0, nMinR), maxR: nMaxR });
    }
    return out;
  }, []);

  const shiftMergesCol = useCallback((cur: Merge[], atCol: number, delta: number): Merge[] => {
    if (delta === 0) return cur;
    const out: Merge[] = [];
    for (const m of cur) {
      if (delta < 0 && m.minC === atCol && m.maxC === atCol) continue;
      const adj = (c: number) => (c >= atCol ? c + delta : c);
      const nMinC = adj(m.minC);
      const nMaxC = adj(m.maxC);
      if (nMaxC < nMinC) continue;
      out.push({ ...m, minC: Math.max(0, nMinC), maxC: nMaxC });
    }
    return out;
  }, []);

  const insertRow = useCallback((atRow: number) => {
    const nextRowCount = Math.min(MAX_ROWS, rowCount + 1);
    const nextCells: AllCells = { ...allCells };
    const nextFormats: AllFormats = { ...allFormats };
    const nextMerges: AllMerges = { ...allMerges };
    for (const sid of Object.keys(allCells)) {
      nextCells[sid] = shiftCellsRow(allCells[sid] ?? {}, atRow, +1);
    }
    for (const sid of Object.keys(allFormats)) {
      nextFormats[sid] = shiftFormatsRow(allFormats[sid] ?? {}, atRow, +1);
    }
    for (const sid of Object.keys(allMerges)) {
      nextMerges[sid] = shiftMergesRow(allMerges[sid] ?? [], atRow, +1);
    }
    setAllCells(nextCells);
    setAllFormats(nextFormats);
    setAllMerges(nextMerges);
    setRowCount(nextRowCount);
    queueSave({ allCells: nextCells, allFormats: nextFormats, allMerges: nextMerges, rowCount: nextRowCount });
  }, [rowCount, allCells, allFormats, allMerges, shiftCellsRow, shiftFormatsRow, shiftMergesRow, queueSave]);

  const insertCol = useCallback((atCol: number) => {
    const nextColCount = Math.min(MAX_COLS, colCount + 1);
    const nextCells: AllCells = { ...allCells };
    const nextFormats: AllFormats = { ...allFormats };
    const nextMerges: AllMerges = { ...allMerges };
    for (const sid of Object.keys(allCells)) {
      nextCells[sid] = shiftCellsCol(allCells[sid] ?? {}, atCol, +1);
    }
    for (const sid of Object.keys(allFormats)) {
      nextFormats[sid] = shiftFormatsCol(allFormats[sid] ?? {}, atCol, +1);
    }
    for (const sid of Object.keys(allMerges)) {
      nextMerges[sid] = shiftMergesCol(allMerges[sid] ?? [], atCol, +1);
    }
    setAllCells(nextCells);
    setAllFormats(nextFormats);
    setAllMerges(nextMerges);
    setColCount(nextColCount);
    queueSave({ allCells: nextCells, allFormats: nextFormats, allMerges: nextMerges, colCount: nextColCount });
  }, [colCount, allCells, allFormats, allMerges, shiftCellsCol, shiftFormatsCol, shiftMergesCol, queueSave]);

  const deleteRow = useCallback((atRow: number) => {
    if (rowCount <= MIN_ROWS) {
      toast({ title: `최소 ${MIN_ROWS}행은 유지됩니다` });
      return;
    }
    const nextRowCount = rowCount - 1;
    const nextCells: AllCells = { ...allCells };
    const nextFormats: AllFormats = { ...allFormats };
    const nextMerges: AllMerges = { ...allMerges };
    for (const sid of Object.keys(allCells)) {
      nextCells[sid] = shiftCellsRow(allCells[sid] ?? {}, atRow, -1);
    }
    for (const sid of Object.keys(allFormats)) {
      nextFormats[sid] = shiftFormatsRow(allFormats[sid] ?? {}, atRow, -1);
    }
    for (const sid of Object.keys(allMerges)) {
      nextMerges[sid] = shiftMergesRow(allMerges[sid] ?? [], atRow, -1);
    }
    setAllCells(nextCells);
    setAllFormats(nextFormats);
    setAllMerges(nextMerges);
    setRowCount(nextRowCount);
    setSelected((s) => ({ ...s, row: Math.min(s.row, nextRowCount - 1) }));
    queueSave({ allCells: nextCells, allFormats: nextFormats, allMerges: nextMerges, rowCount: nextRowCount });
  }, [rowCount, allCells, allFormats, allMerges, shiftCellsRow, shiftFormatsRow, shiftMergesRow, queueSave]);

  const deleteCol = useCallback((atCol: number) => {
    if (colCount <= MIN_COLS) {
      toast({ title: `최소 ${MIN_COLS}열은 유지됩니다` });
      return;
    }
    const nextColCount = colCount - 1;
    const nextCells: AllCells = { ...allCells };
    const nextFormats: AllFormats = { ...allFormats };
    const nextMerges: AllMerges = { ...allMerges };
    for (const sid of Object.keys(allCells)) {
      nextCells[sid] = shiftCellsCol(allCells[sid] ?? {}, atCol, -1);
    }
    for (const sid of Object.keys(allFormats)) {
      nextFormats[sid] = shiftFormatsCol(allFormats[sid] ?? {}, atCol, -1);
    }
    for (const sid of Object.keys(allMerges)) {
      nextMerges[sid] = shiftMergesCol(allMerges[sid] ?? [], atCol, -1);
    }
    // 열 너비도 shift
    const nextWidths: Record<number, number> = {};
    for (const [k, v] of Object.entries(colWidths)) {
      const c = Number(k);
      if (c === atCol) continue;
      const nc = c > atCol ? c - 1 : c;
      nextWidths[nc] = v;
    }
    setAllCells(nextCells);
    setAllFormats(nextFormats);
    setAllMerges(nextMerges);
    setColCount(nextColCount);
    setColWidths(nextWidths);
    setSelected((s) => ({ ...s, col: Math.min(s.col, nextColCount - 1) }));
    queueSave({ allCells: nextCells, allFormats: nextFormats, allMerges: nextMerges, colCount: nextColCount, colWidths: nextWidths });
  }, [colCount, allCells, allFormats, allMerges, colWidths, shiftCellsCol, shiftFormatsCol, shiftMergesCol, queueSave]);

  // ─── 열 너비 변경 ───
  const setColWidth = useCallback((colIdx: number, w: number) => {
    const clamped = Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, Math.round(w)));
    setColWidths((prev) => {
      if (prev[colIdx] === clamped) return prev;
      const next = { ...prev, [colIdx]: clamped };
      queueSave({ colWidths: next });
      return next;
    });
  }, [queueSave]);

  // ─── 헤더 컨텍스트 메뉴 ───
  const [ctxMenu, setCtxMenu] = useState<
    | { kind: 'row' | 'col'; idx: number; x: number; y: number }
    | null
  >(null);

  const openHeaderContextMenu = useCallback(
    (kind: 'row' | 'col', idx: number, e: React.MouseEvent) => {
      e.preventDefault();
      setCtxMenu({ kind, idx, x: e.clientX, y: e.clientY });
    },
    [],
  );

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('blur', close);
    };
  }, [ctxMenu]);

  // ─── 셀 병합 ───
  const applyMerge = useCallback((kind: 'all' | 'horizontal' | 'vertical' | 'unmerge') => {
    const { minR, maxR, minC, maxC } = selBounds;
    const isSingle = minR === maxR && minC === maxC;
    if (kind !== 'unmerge' && isSingle) {
      toast({ title: '먼저 2칸 이상 선택하세요', description: 'Shift+화살표 / 마우스 드래그' });
      return;
    }
    setAllMerges((all) => {
      const cur = all[currentSheetId] ?? [];
      // 선택 영역과 겹치는 기존 병합은 일단 제거
      const filtered = cur.filter((m) =>
        m.maxR < minR || m.minR > maxR || m.maxC < minC || m.minC > maxC,
      );
      let next: Merge[];
      if (kind === 'unmerge') {
        next = filtered;
      } else if (kind === 'horizontal') {
        const added: Merge[] = [];
        for (let r = minR; r <= maxR; r++) {
          if (minC !== maxC) added.push({ minR: r, maxR: r, minC, maxC });
        }
        next = [...filtered, ...added];
      } else if (kind === 'vertical') {
        const added: Merge[] = [];
        for (let c = minC; c <= maxC; c++) {
          if (minR !== maxR) added.push({ minR, maxR, minC: c, maxC: c });
        }
        next = [...filtered, ...added];
      } else {
        next = [...filtered, { minR, maxR, minC, maxC }];
      }
      // 병합 영역의 top-left 가 아닌 셀들은 값/서식 정리 (시각적 일관성)
      if (kind !== 'unmerge') {
        const newMerges = next.filter((m) =>
          (m.minR === minR && m.minC === minC) ||
          // 가로/세로 모드에서 추가된 m 들 중 하나
          (m.minR >= minR && m.maxR <= maxR && m.minC >= minC && m.maxC <= maxC),
        );
        setAllCells((allC) => {
          const cur = { ...(allC[currentSheetId] ?? {}) };
          let changed = false;
          for (const m of newMerges) {
            for (let r = m.minR; r <= m.maxR; r++) {
              for (let c = m.minC; c <= m.maxC; c++) {
                if (r === m.minR && c === m.minC) continue;
                const ref = cellRef(r, c);
                if (ref in cur) { delete cur[ref]; changed = true; }
              }
            }
          }
          if (!changed) return allC;
          const nextAll: AllCells = { ...allC, [currentSheetId]: cur };
          return nextAll;
        });
      }
      const updated: AllMerges = { ...all, [currentSheetId]: next };
      queueSave({ allMerges: updated });
      return updated;
    });
  }, [selBounds, currentSheetId, queueSave]);

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
        setSelected((s) => ({ ...s, row: Math.min(rowCount - 1, s.row + 1) }));
      } else if (moveDir === 'right') {
        setSelected((s) => ({ ...s, col: Math.min(colCount - 1, s.col + 1) }));
      }
      return null;
    });
    setEditingValue('');
  }, [editingValue, setCellValue, rowCount, colCount]);

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
      const isShift = e.shiftKey;

      if (e.key === '?' || (isShift && e.key === '/')) {
        if (!isMod) { e.preventDefault(); setHelpOpen(true); return; }
      }

      // 화살표 이동 — Shift 면 범위 확장, 아니면 단일 이동
      const moveBy = (dr: number, dc: number) => {
        if (isShift) {
          // 범위 확장: anchor 보존 (없으면 현재 selected 로 잡음), focus 만 이동
          setRangeAnchor((cur) => cur ?? { ...selected });
          setSelected((s) => ({
            row: Math.max(0, Math.min(rowCount - 1, s.row + dr)),
            col: Math.max(0, Math.min(colCount - 1, s.col + dc)),
          }));
        } else {
          // 단일 셀로 리셋 + 이동
          setRangeAnchor(null);
          setSelected((s) => ({
            row: Math.max(0, Math.min(rowCount - 1, s.row + dr)),
            col: Math.max(0, Math.min(colCount - 1, s.col + dc)),
          }));
        }
      };

      if (e.key === 'ArrowUp')         { e.preventDefault(); moveBy(-1, 0); }
      else if (e.key === 'ArrowDown')  { e.preventDefault(); moveBy(1, 0); }
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); moveBy(0, -1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); moveBy(0, 1); }
      else if (e.key === 'Tab')        { e.preventDefault(); moveBy(0, isShift ? -1 : 1); }
      else if (e.key === 'Enter')      { e.preventDefault(); startEdit(selected.row, selected.col); }
      else if (e.key === 'F2')         { e.preventDefault(); startEdit(selected.row, selected.col); }
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        // 범위 안 모든 셀 지우기
        for (let r = selBounds.minR; r <= selBounds.maxR; r++) {
          for (let c = selBounds.minC; c <= selBounds.maxC; c++) {
            const ref = cellRef(r, c);
            if (cells[ref] !== undefined) setCellValue(ref, '');
          }
        }
      } else if (e.key === 'Escape') {
        setRangeAnchor(null);
      } else if (e.key.length === 1 && !isMod) {
        // 글자 입력 → 단일 셀 모드 + 편집 진입
        e.preventDefault();
        setRangeAnchor(null);
        startEdit(selected.row, selected.col, e.key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, selected, cells, startEdit, setCellValue, selBounds, rowCount, colCount]);

  // ─── 마우스 드래그 — 글로벌 pointerup 으로 종료 ───
  useEffect(() => {
    if (!draggingRange) return;
    const onUp = () => setDraggingRange(false);
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, [draggingRange]);

  // ─── 자동 채우기 (Fill handle) ───
  /** fillBounds: 채우기 영역 미리보기 — null 이면 idle */
  const [fillTarget, setFillTarget] = useState<{ row: number; col: number } | null>(null);

  /** 채우기 시작: source bounds = 현재 selBounds */
  const startFill = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFillTarget({ row: selBounds.maxR, col: selBounds.maxC });
  }, [selBounds]);

  /** 마우스 이동 중 fill target 갱신 — gridRef 안 cell DOM 의 data-cell-ref 찾기 */
  useEffect(() => {
    if (!fillTarget) return;
    const onMove = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const td = el?.closest('[data-cell-ref]') as HTMLElement | null;
      const ref = td?.getAttribute('data-cell-ref');
      if (!ref) return;
      const m = ref.match(/^([A-Z]+)(\d+)$/);
      if (!m) return;
      const r = Number(m[2]) - 1;
      const c = colToIdx(m[1]);
      setFillTarget((cur) => (cur && cur.row === r && cur.col === c ? cur : { row: r, col: c }));
    };
    const onUp = () => {
      const tgt = fillTarget;
      setFillTarget(null);
      if (!tgt) return;
      // 채우기 영역 결정
      const src = selBounds;
      const fillR1 = Math.min(src.minR, tgt.row);
      const fillR2 = Math.max(src.maxR, tgt.row);
      const fillC1 = Math.min(src.minC, tgt.col);
      const fillC2 = Math.max(src.maxC, tgt.col);
      // 소스 영역과 일치하면 noop
      if (fillR1 === src.minR && fillR2 === src.maxR
          && fillC1 === src.minC && fillC2 === src.maxC) return;

      // 채우기: 영역 안 (src 영역 제외) 셀에 src 패턴 cycle
      const srcW = src.maxC - src.minC + 1;
      const srcH = src.maxR - src.minR + 1;
      const nextCells: Cells = { ...cells };
      let changed = false;
      for (let r = fillR1; r <= fillR2; r++) {
        for (let c = fillC1; c <= fillC2; c++) {
          // src 영역 안이면 그대로 두기
          if (r >= src.minR && r <= src.maxR && c >= src.minC && c <= src.maxC) continue;
          // src 안 어디서 가져올지 — cycle
          const srcR = src.minR + ((r - src.minR) % srcH + srcH) % srcH;
          const srcC = src.minC + ((c - src.minC) % srcW + srcW) % srcW;
          const srcRef = cellRef(srcR, srcC);
          const dstRef = cellRef(r, c);
          const v = cells[srcRef];
          if (v === undefined) {
            if (dstRef in nextCells) { delete nextCells[dstRef]; changed = true; }
          } else {
            if (nextCells[dstRef] !== v) { nextCells[dstRef] = v; changed = true; }
          }
        }
      }
      if (changed) {
        const nextAll: AllCells = { ...allCells, [currentSheetId]: nextCells };
        setAllCells(nextAll);
        queueSave({ allCells: nextAll });
        // 채워진 영역을 새 선택 범위로
        setRangeAnchor({ row: fillR1, col: fillC1 });
        setSelected({ row: fillR2, col: fillC2 });
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [fillTarget, selBounds, cells, allCells, currentSheetId, queueSave]);

  // 채우기 미리보기 영역 (drag 중)
  const fillPreview = useMemo<SelBounds | null>(() => {
    if (!fillTarget) return null;
    return {
      minR: Math.min(selBounds.minR, fillTarget.row),
      maxR: Math.max(selBounds.maxR, fillTarget.row),
      minC: Math.min(selBounds.minC, fillTarget.col),
      maxC: Math.max(selBounds.maxC, fillTarget.col),
    };
  }, [fillTarget, selBounds]);

  // ─── 셀 마우스 핸들러 (SheetGrid 에 전달) ───
  const handleCellPointerDown = useCallback((row: number, col: number, e: React.PointerEvent) => {
    if (e.shiftKey) {
      setRangeAnchor((cur) => cur ?? { ...selected });
      setSelected({ row, col });
    } else {
      setRangeAnchor(null);
      setSelected({ row, col });
      setDraggingRange(true);
    }
  }, [selected]);

  const handleCellPointerEnter = useCallback((row: number, col: number) => {
    if (!draggingRange) return;
    setRangeAnchor((cur) => cur ?? { ...selected });
    setSelected({ row, col });
  }, [draggingRange, selected]);

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

  // selectedRef 는 위에서 이미 선언됨 (TDZ 회피용 hoist)

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded hover:bg-muted"
                  aria-label="더보기"
                  title="더보기"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
                <DropdownMenuItem onSelect={openChart}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  차트 만들기 (선택 범위)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={aiSummarizeAll} disabled={!!aiBusy}>
                  <Sparkles className="w-4 h-4 mr-2 text-violet-500" />
                  데이터 요약 (AI)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={aiSuggestFormulaForCurrent} disabled={!!aiBusy}>
                  <Sparkles className="w-4 h-4 mr-2 text-violet-500" />
                  수식 추천 (AI)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={aiExplainSelected} disabled={!!aiBusy}>
                  <Sparkles className="w-4 h-4 mr-2 text-violet-500" />
                  선택 셀 설명 (AI)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={importXlsx}>
                  <Upload className="w-4 h-4 mr-2" />
                  .xlsx 가져오기
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={exportXlsx}>
                  <Download className="w-4 h-4 mr-2" />
                  .xlsx 내보내기
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { void exportPdf(); }}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF 내보내기 (현재 시트)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 서식 도구바 */}
        <div className="border-t border-border bg-background flex items-center gap-0.5 px-3 py-1.5 overflow-x-auto text-sm">
          {(() => {
            const curFmt = cellFormats[selectedRef] ?? {};
            return (
              <>
                <button
                  type="button"
                  onClick={() => setCellFormat(selectedRef, { bold: !curFmt.bold })}
                  className={cn(
                    'p-1.5 rounded transition-colors hover:bg-muted',
                    curFmt.bold && 'bg-muted text-foreground',
                  )}
                  title="굵게"
                  aria-pressed={!!curFmt.bold}
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCellFormat(selectedRef, { italic: !curFmt.italic })}
                  className={cn(
                    'p-1.5 rounded transition-colors hover:bg-muted',
                    curFmt.italic && 'bg-muted text-foreground',
                  )}
                  title="기울임"
                  aria-pressed={!!curFmt.italic}
                >
                  <Italic className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-border mx-1" />

                {/* 정렬 */}
                <button
                  type="button"
                  onClick={() => setCellFormat(selectedRef, { align: 'left' })}
                  className={cn('p-1.5 rounded hover:bg-muted', curFmt.align === 'left' && 'bg-muted')}
                  title="왼쪽 정렬"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCellFormat(selectedRef, { align: 'center' })}
                  className={cn('p-1.5 rounded hover:bg-muted', curFmt.align === 'center' && 'bg-muted')}
                  title="가운데 정렬"
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCellFormat(selectedRef, { align: 'right' })}
                  className={cn('p-1.5 rounded hover:bg-muted', curFmt.align === 'right' && 'bg-muted')}
                  title="오른쪽 정렬"
                >
                  <AlignRight className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-border mx-1" />

                {/* 글자색 */}
                <SheetColorBtn
                  icon={<Palette className="w-3.5 h-3.5" />}
                  value={curFmt.textColor ?? '#222222'}
                  onChange={(c) => setCellFormat(selectedRef, { textColor: c })}
                  title="글자색"
                />
                {/* 배경색 */}
                <SheetColorBtn
                  icon={<Highlighter className="w-3.5 h-3.5" />}
                  value={curFmt.bgColor ?? '#fff59d'}
                  onChange={(c) => setCellFormat(selectedRef, { bgColor: c })}
                  title="배경색"
                />
                <div className="w-px h-5 bg-border mx-1" />

                {/* 숫자 형식 */}
                <Hash className="w-3.5 h-3.5 text-muted-foreground ml-1" aria-hidden />
                <select
                  value={curFmt.numberFmt ?? ''}
                  onChange={(e) => {
                    const v = e.target.value as '' | NumberFmt;
                    setCellFormat(selectedRef, { numberFmt: v || undefined });
                  }}
                  className="text-xs px-1.5 py-1 rounded border border-border bg-background hover:bg-muted cursor-pointer min-w-[88px]"
                  title="숫자 형식"
                  aria-label="숫자 형식"
                >
                  {NUMBER_FMT_OPTIONS.map((o) => (
                    <option key={o.value || 'auto'} value={o.value}>
                      {o.label}{o.example ? ` (${o.example})` : ''}
                    </option>
                  ))}
                </select>

                {/* 테두리 */}
                <SquareIcon className="w-3.5 h-3.5 text-muted-foreground ml-1" aria-hidden />
                <select
                  value={curFmt.border ?? ''}
                  onChange={(e) => {
                    const v = e.target.value as '' | BorderStyle;
                    setCellFormat(selectedRef, { border: v || undefined });
                  }}
                  className="text-xs px-1.5 py-1 rounded border border-border bg-background hover:bg-muted cursor-pointer min-w-[74px]"
                  title="테두리"
                  aria-label="테두리"
                >
                  <option value="">없음</option>
                  <option value="all">전체</option>
                  <option value="top">위</option>
                  <option value="bottom">아래</option>
                  <option value="left">왼쪽</option>
                  <option value="right">오른쪽</option>
                </select>

                <div className="w-px h-5 bg-border mx-1" />

                {/* 셀 병합 드롭다운 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="p-1.5 rounded hover:bg-muted flex items-center gap-0.5"
                      title="셀 병합 (범위 선택 후)"
                      aria-label="셀 병합"
                    >
                      <Combine className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[180px]">
                    <DropdownMenuItem onSelect={() => applyMerge('all')}>
                      <Combine className="w-4 h-4 mr-2" />
                      모두 병합
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => applyMerge('horizontal')}>
                      <Combine className="w-4 h-4 mr-2 rotate-90" />
                      가로로 병합
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => applyMerge('vertical')}>
                      <Combine className="w-4 h-4 mr-2" />
                      세로로 병합
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => applyMerge('unmerge')}>
                      <Split className="w-4 h-4 mr-2" />
                      병합 해제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-px h-5 bg-border mx-1" />
                <button
                  type="button"
                  onClick={() => clearCellFormat(selectedRef)}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                  title="서식 지우기"
                >
                  <Eraser className="w-4 h-4" />
                </button>
              </>
            );
          })()}
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

      {/* 검색·치환 패널 (Ctrl+F / Ctrl+H) — main 위쪽 */}
      {searchOpen && (
        <SheetSearchPanel
          mode={searchOpen}
          onModeChange={setSearchOpen}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          replaceText={replaceText}
          onReplaceTextChange={setReplaceText}
          caseSensitive={searchCaseSensitive}
          onCaseSensitiveChange={setSearchCaseSensitive}
          matches={searchMatches.length}
          cursor={searchCursor}
          onNext={searchNext}
          onPrev={searchPrev}
          onReplaceOne={replaceOneInSheet}
          onReplaceAll={replaceAllInSheet}
          onClose={() => setSearchOpen(false)}
        />
      )}

      <main className="flex-1 overflow-auto">
        <div ref={gridRef}>
          <SheetGrid
            cells={cells}
            displayValues={displayValues}
            cellFormats={cellFormats}
            selected={selected}
            selBounds={selBounds}
            hasRange={hasRange}
            mergeAtMap={mergeAtMap}
            coveredSet={coveredSet}
            rowCount={rowCount}
            colCount={colCount}
            colWidths={colWidths}
            onColResize={setColWidth}
            onHeaderContextMenu={openHeaderContextMenu}
            matchedRefs={searchMatchSet}
            currentMatchRef={searchMatches[searchCursor]}
            fillPreview={fillPreview}
            fillCorner={{ row: selBounds.maxR, col: selBounds.maxC }}
            onFillStart={startFill}
            editing={editing}
            editingValue={editingValue}
            onPointerDown={handleCellPointerDown}
            onPointerEnter={handleCellPointerEnter}
            onStartEdit={startEdit}
            onChangeValue={setEditingValue}
            onCommitEdit={commitEdit}
            onCancelEdit={cancelEdit}
          />
        </div>
        {/* + 행/열 빠른 추가 버튼 */}
        <div className="flex items-center gap-2 px-3 py-2 text-xs">
          <button
            type="button"
            onClick={() => addRows(ROW_ADD_CHUNK)}
            className="px-2 py-1 rounded border border-border hover:bg-muted flex items-center gap-1"
            title={`행 +${ROW_ADD_CHUNK}`}
          >
            <Plus className="w-3.5 h-3.5" /> 행 +{ROW_ADD_CHUNK}
          </button>
          <button
            type="button"
            onClick={() => addCols(COL_ADD_CHUNK)}
            className="px-2 py-1 rounded border border-border hover:bg-muted flex items-center gap-1"
            title={`열 +${COL_ADD_CHUNK}`}
          >
            <Plus className="w-3.5 h-3.5" /> 열 +{COL_ADD_CHUNK}
          </button>
          <span className="text-muted-foreground ml-2">
            {rowCount}행 × {colCount}열
            <span className="opacity-60"> · 헤더 우클릭 → 삽입/삭제 · 열 가장자리 드래그 → 너비</span>
          </span>
        </div>
      </main>

      {/* 헤더 컨텍스트 메뉴 — 우클릭 위치에 고정 */}
      {ctxMenu && (
        <div
          className="fixed z-50 rounded border border-border bg-popover shadow-md text-sm min-w-[160px] py-1"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {ctxMenu.kind === 'row' ? (
            <>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-muted"
                onClick={() => { insertRow(ctxMenu.idx); setCtxMenu(null); }}
              >
                위에 행 삽입
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-muted"
                onClick={() => { insertRow(ctxMenu.idx + 1); setCtxMenu(null); }}
              >
                아래에 행 삽입
              </button>
              <div className="h-px bg-border my-1" />
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-muted text-destructive"
                onClick={() => { deleteRow(ctxMenu.idx); setCtxMenu(null); }}
              >
                {ctxMenu.idx + 1}행 삭제
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
                onClick={() => { sortByColumn(ctxMenu.idx, 'asc'); setCtxMenu(null); }}
              >
                <span aria-hidden>↑</span>
                {idxToCol(ctxMenu.idx)}열 오름차순 정렬
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
                onClick={() => { sortByColumn(ctxMenu.idx, 'desc'); setCtxMenu(null); }}
              >
                <span aria-hidden>↓</span>
                {idxToCol(ctxMenu.idx)}열 내림차순 정렬
              </button>
              <div className="h-px bg-border my-1" />
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-muted"
                onClick={() => { insertCol(ctxMenu.idx); setCtxMenu(null); }}
              >
                왼쪽에 열 삽입
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-muted"
                onClick={() => { insertCol(ctxMenu.idx + 1); setCtxMenu(null); }}
              >
                오른쪽에 열 삽입
              </button>
              <div className="h-px bg-border my-1" />
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-muted text-destructive"
                onClick={() => { deleteCol(ctxMenu.idx); setCtxMenu(null); }}
              >
                {idxToCol(ctxMenu.idx)}열 삭제
              </button>
            </>
          )}
        </div>
      )}

      {/* 하단 시트 탭 */}
      <footer className="border-t border-border bg-muted/20 flex items-center gap-1 px-3 py-1.5 overflow-x-auto text-sm">
        {sheetsMeta.map((s, i) => (
          <SheetTab
            key={s.id}
            name={s.name}
            active={i === currentSheetIdx}
            onClick={() => switchSheet(i)}
            onRename={(n) => renameSheet(i, n)}
            onDuplicate={() => duplicateSheet(i)}
            onRemove={() => removeSheet(i)}
            canRemove={sheetsMeta.length > 1}
          />
        ))}
        <button
          type="button"
          onClick={addSheet}
          className="ml-1 p-1 rounded hover:bg-muted text-muted-foreground"
          title="시트 추가"
          aria-label="시트 추가"
        >
          <Plus className="w-4 h-4" />
        </button>
        <span className="ml-auto text-xs text-muted-foreground">
          {currentSheetIdx + 1} / {sheetsMeta.length}
        </span>
      </footer>

      <SheetHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      <ChartModal
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        cells={cells}
        range={selBounds}
      />

      {/* AI 결과 모달 */}
      <Dialog open={!!aiResult} onOpenChange={(v) => { if (!v) setAiResult(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            AI 결과
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            데이터 분석 결과입니다. 셀 자동 반영은 안 됩니다 (수동 복붙).
          </DialogDescription>
          <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm border border-border rounded p-3 bg-muted/30">
            {aiResult}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                if (aiResult) navigator.clipboard.writeText(aiResult);
                toast({ title: '복사됨' });
              }}
              className="px-3 py-1.5 rounded border border-border hover:bg-muted text-sm"
            >
              복사
            </button>
            <button
              type="button"
              onClick={() => setAiResult(null)}
              className="px-3 py-1.5 rounded bg-foreground text-background hover:bg-foreground/90 text-sm"
            >
              닫기
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────
// 그리드
// ─────────────────────────────────────────────

interface SelBounds { minR: number; maxR: number; minC: number; maxC: number; }

interface SheetGridProps {
  cells: Cells;
  displayValues: Cells;
  cellFormats: CellFormats;
  selected: { row: number; col: number };
  selBounds: SelBounds;
  hasRange: boolean;
  mergeAtMap: Map<string, { rows: number; cols: number }>;
  coveredSet: Set<string>;
  rowCount: number;
  colCount: number;
  colWidths: Record<number, number>;
  onColResize: (colIdx: number, newWidth: number) => void;
  onHeaderContextMenu?: (kind: 'row' | 'col', idx: number, e: React.MouseEvent) => void;
  matchedRefs?: Set<string>;
  currentMatchRef?: string;
  /** fill 미리보기 영역 (드래그 중) */
  fillPreview?: SelBounds | null;
  /** fill handle: 어떤 (row, col) 에 핸들을 그릴지 — 보통 selBounds 의 maxR/maxC */
  fillCorner?: { row: number; col: number };
  onFillStart?: (e: React.PointerEvent) => void;
  editing: { row: number; col: number } | null;
  editingValue: string;
  onPointerDown: (row: number, col: number, e: React.PointerEvent) => void;
  onPointerEnter: (row: number, col: number) => void;
  onStartEdit: (row: number, col: number) => void;
  onChangeValue: (v: string) => void;
  onCommitEdit: (moveDir?: 'down' | 'right' | 'none') => void;
  onCancelEdit: () => void;
}

function SheetGrid({
  cells, displayValues, cellFormats, selected, selBounds, hasRange, mergeAtMap, coveredSet,
  rowCount, colCount, colWidths, onColResize, onHeaderContextMenu,
  matchedRefs, currentMatchRef,
  fillPreview, fillCorner, onFillStart,
  editing, editingValue,
  onPointerDown, onPointerEnter, onStartEdit, onChangeValue, onCommitEdit, onCancelEdit,
}: SheetGridProps) {
  const cols = useMemo(() => Array.from({ length: colCount }, (_, i) => colLabel(i)), [colCount]);
  const rows = useMemo(() => Array.from({ length: rowCount }, (_, i) => i), [rowCount]);

  return (
    <div className="inline-block min-w-full">
      <table className="border-collapse text-sm font-normal" style={{ tableLayout: 'fixed' }}>
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="w-10 h-7 border border-border bg-muted/40 sticky left-0 z-20"></th>
            {cols.map((c, i) => (
              <th
                key={c}
                className="border border-border bg-muted/40 px-2 py-1 text-xs font-normal text-muted-foreground relative group"
                style={{ width: colWidths[i] ?? DEFAULT_COL_WIDTH, minWidth: MIN_COL_WIDTH }}
                onContextMenu={(e) => onHeaderContextMenu?.('col', i, e)}
              >
                {c}
                {/* 드래그 핸들 (오른쪽 가장자리) */}
                <ColResizeHandle
                  colIdx={i}
                  currentWidth={colWidths[i] ?? DEFAULT_COL_WIDTH}
                  onResize={onColResize}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((rowIdx) => (
            <tr key={rowIdx}>
              <th
                className="w-10 h-7 border border-border bg-muted/40 text-xs font-normal text-muted-foreground sticky left-0 z-10"
                onContextMenu={(e) => onHeaderContextMenu?.('row', rowIdx, e)}
              >
                {rowIdx + 1}
              </th>
              {cols.map((_, colIdx) => {
                const key = `${rowIdx},${colIdx}`;
                // 병합으로 가려진 셀은 렌더 X (rowSpan/colSpan 으로 위쪽 셀이 채움)
                if (coveredSet.has(key)) return null;
                const ref = cellRef(rowIdx, colIdx);
                const raw = cells[ref] ?? '';
                // 표시값: 수식이면 평가 결과, 아니면 raw 그대로
                let display = raw.startsWith('=') ? (displayValues[ref] ?? '') : raw;
                const isFocus = selected.row === rowIdx && selected.col === colIdx;
                const isInRange = hasRange
                  && rowIdx >= selBounds.minR && rowIdx <= selBounds.maxR
                  && colIdx >= selBounds.minC && colIdx <= selBounds.maxC;
                const isEditing = !!editing && editing.row === rowIdx && editing.col === colIdx;
                const fmt = cellFormats[ref];
                if (fmt?.numberFmt && !isEditing && !display.startsWith('#')) {
                  display = applyNumberFormat(display, fmt.numberFmt);
                }
                const span = mergeAtMap.get(key);
                const isMatch = !!matchedRefs?.has(ref);
                const isCurrentMatch = isMatch && currentMatchRef === ref;
                const isInFillPreview = !!fillPreview
                  && rowIdx >= fillPreview.minR && rowIdx <= fillPreview.maxR
                  && colIdx >= fillPreview.minC && colIdx <= fillPreview.maxC
                  && !(rowIdx >= selBounds.minR && rowIdx <= selBounds.maxR
                       && colIdx >= selBounds.minC && colIdx <= selBounds.maxC);
                const hasFillHandle = !!fillCorner
                  && fillCorner.row === rowIdx && fillCorner.col === colIdx
                  && !fillPreview;
                return (
                  <SheetCell
                    key={ref}
                    cellRefStr={ref}
                    row={rowIdx}
                    col={colIdx}
                    value={display}
                    format={fmt}
                    isFocus={isFocus}
                    isInRange={isInRange}
                    isMatch={isMatch}
                    isCurrentMatch={isCurrentMatch}
                    isInFillPreview={isInFillPreview}
                    hasFillHandle={hasFillHandle}
                    onFillStart={onFillStart}
                    rowSpan={span?.rows}
                    colSpan={span?.cols}
                    editing={isEditing}
                    editingValue={editingValue}
                    onPointerDown={onPointerDown}
                    onPointerEnter={onPointerEnter}
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
  cellRefStr: string;
  row: number;
  col: number;
  value: string;
  format?: CellFormat;
  isFocus: boolean;
  isInRange: boolean;
  isMatch?: boolean;
  isCurrentMatch?: boolean;
  isInFillPreview?: boolean;
  hasFillHandle?: boolean;
  onFillStart?: (e: React.PointerEvent) => void;
  rowSpan?: number;
  colSpan?: number;
  editing: boolean;
  editingValue: string;
  onPointerDown: (row: number, col: number, e: React.PointerEvent) => void;
  onPointerEnter: (row: number, col: number) => void;
  onStartEdit: (row: number, col: number) => void;
  onChangeValue: (v: string) => void;
  onCommitEdit: (moveDir?: 'down' | 'right' | 'none') => void;
  onCancelEdit: () => void;
}

const SheetCell = React.memo(function SheetCell({
  cellRefStr, row, col, value, format, isFocus, isInRange,
  isMatch, isCurrentMatch, isInFillPreview, hasFillHandle, onFillStart,
  rowSpan, colSpan, editing, editingValue,
  onPointerDown, onPointerEnter, onStartEdit, onChangeValue, onCommitEdit, onCancelEdit,
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

  // range 안 배경 + 검색 매치 배경은 기존 bgColor 위에 살짝 덧입힘 (linear-gradient)
  let bg: string | undefined = format?.bgColor;
  if (isInRange && !isFocus) {
    bg = bg
      ? `linear-gradient(rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.15)), ${bg}`
      : 'rgba(59, 130, 246, 0.15)';
  }
  if (isMatch && !isFocus) {
    // 노란 형광펜 톤
    const matchLayer = isCurrentMatch
      ? 'rgba(250, 204, 21, 0.55)'   // 현재: 진한 노랑
      : 'rgba(250, 204, 21, 0.28)';  // 그 외: 옅은 노랑
    bg = bg
      ? `linear-gradient(${matchLayer}, ${matchLayer}), ${bg}`
      : matchLayer;
  }
  if (isInFillPreview) {
    // fill 미리보기: 파란 점선 강조
    const layer = 'rgba(59, 130, 246, 0.18)';
    bg = bg ? `linear-gradient(${layer}, ${layer}), ${bg}` : layer;
  }
  const tdStyle: React.CSSProperties = {
    padding: editing ? 0 : undefined,
    background: bg,
    color: format?.textColor,
    fontWeight: format?.bold ? 600 : undefined,
    fontStyle: format?.italic ? 'italic' : undefined,
    textAlign: format?.align,
    ...borderStyleFor(format?.border),
  };
  return (
    <td
      data-cell-ref={cellRefStr}
      onPointerDown={(e) => onPointerDown(row, col, e)}
      onPointerEnter={() => onPointerEnter(row, col)}
      onDoubleClick={() => onStartEdit(row, col)}
      rowSpan={rowSpan}
      colSpan={colSpan}
      className={cn(
        'border border-border h-7 px-2 align-middle relative cursor-cell select-none',
        'min-w-[88px] max-w-[200px] truncate',
        isFocus && !editing && 'outline outline-2 -outline-offset-2 outline-foreground/70',
        isCurrentMatch && !isFocus && 'outline outline-2 -outline-offset-2 outline-amber-500',
      )}
      style={tdStyle}
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
      {hasFillHandle && (
        <span
          onPointerDown={onFillStart}
          className="absolute -right-1 -bottom-1 w-2.5 h-2.5 bg-foreground/80 hover:bg-foreground rounded-[1px] cursor-crosshair z-10"
          aria-label="자동 채우기 핸들"
          title="드래그해서 채우기"
        />
      )}
    </td>
  );
});

// ─────────────────────────────────────────────
// 열 너비 드래그 핸들 (헤더 오른쪽 가장자리)
// ─────────────────────────────────────────────

function ColResizeHandle({
  colIdx, currentWidth, onResize,
}: { colIdx: number; currentWidth: number; onResize: (colIdx: number, w: number) => void }) {
  const startXRef = useRef(0);
  const startWRef = useRef(0);
  const draggingRef = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startXRef.current = e.clientX;
    startWRef.current = currentWidth;
    draggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = ev.clientX - startXRef.current;
      onResize(colIdx, startWRef.current + dx);
    };
    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [colIdx, currentWidth, onResize]);

  return (
    <span
      className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none group-hover:bg-foreground/10"
      onPointerDown={onPointerDown}
      onDoubleClick={(e) => { e.stopPropagation(); onResize(colIdx, DEFAULT_COL_WIDTH); }}
      aria-label="열 너비 조정"
      role="separator"
    />
  );
}

// ─────────────────────────────────────────────
// 시트 탭
// ─────────────────────────────────────────────

interface SheetTabProps {
  name: string;
  active: boolean;
  canRemove: boolean;
  onClick: () => void;
  onRename: (newName: string) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

function SheetTab({ name, active, canRemove, onClick, onRename, onDuplicate, onRemove }: SheetTabProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(name);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [editing, name]);

  const commit = () => {
    const v = draft.trim();
    setEditing(false);
    if (v && v !== name) onRename(v);
  };

  return (
    <div className="flex items-center group">
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            else if (e.key === 'Escape') { e.preventDefault(); setEditing(false); }
          }}
          onBlur={commit}
          className={cn(
            'text-xs px-2 py-1 rounded-t border-l border-r border-t border-border bg-background outline-none',
            'w-24',
          )}
        />
      ) : (
        <button
          type="button"
          onClick={onClick}
          onDoubleClick={() => setEditing(true)}
          className={cn(
            'text-xs px-3 py-1 rounded-t border-l border-r border-t transition-colors',
            active
              ? 'border-border bg-background font-medium text-foreground'
              : 'border-transparent text-muted-foreground hover:bg-muted',
          )}
        >
          {name}
        </button>
      )}

      {active && !editing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="ml-0.5 p-0.5 rounded hover:bg-muted opacity-60 hover:opacity-100"
              aria-label="시트 메뉴"
            >
              <MoreHorizontal className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[140px]">
            <DropdownMenuItem onSelect={() => setEditing(true)}>
              <Pencil className="w-4 h-4 mr-2" /> 이름 변경
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDuplicate}>
              <CopyIcon className="w-4 h-4 mr-2" /> 복제
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onRemove}
              disabled={!canRemove}
              className="text-destructive focus:text-destructive"
            >
              <TrashIcon className="w-4 h-4 mr-2" /> 삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 색 picker (서식 도구바)
// ─────────────────────────────────────────────

function SheetColorBtn({
  icon, value, onChange, title,
}: { icon: React.ReactNode; value: string; onChange: (c: string) => void; title?: string }) {
  return (
    <label
      className="relative flex items-center gap-0.5 px-1.5 py-1.5 rounded hover:bg-muted cursor-pointer"
      title={title}
      aria-label={title}
    >
      {icon}
      <span
        className="block w-3 h-3 rounded-sm border border-border"
        style={{ backgroundColor: value }}
        aria-hidden
      />
      <input
        type="color"
        value={value.startsWith('#') && (value.length === 4 || value.length === 7) ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
        aria-label={title}
      />
    </label>
  );
}

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
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">검색·치환</h3>
            <div className="space-y-1">
              <HelpRow keys={['Ctrl', 'F']} label="찾기" />
              <HelpRow keys={['Ctrl', 'H']} label="찾아 바꾸기" />
              <HelpRow keys={['Enter']} label="다음 결과" />
              <HelpRow keys={['Shift', 'Enter']} label="이전 결과" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">복사·붙여넣기 (엑셀 호환)</h3>
            <div className="space-y-1">
              <HelpRow keys={['Ctrl', 'C']} label="선택 범위 복사 (TSV)" />
              <HelpRow keys={['Ctrl', 'X']} label="잘라내기" />
              <HelpRow keys={['Ctrl', 'V']} label="붙여넣기 (시작 셀부터)" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">선택·이동</h3>
            <div className="space-y-1">
              <HelpRow keys={['Shift', '↑↓←→']} label="범위 확장" />
              <HelpRow keys={['Shift', '마우스']} label="범위 확장 / 드래그 선택" />
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

// ─────────────────────────────────────────────
// 차트 모달 (선택 범위 → 막대/선/원)
// ─────────────────────────────────────────────

type ChartType = 'bar' | 'line' | 'pie';

interface ChartModalProps {
  open: boolean;
  onClose: () => void;
  cells: Cells;
  range: SelRange;
}

function ChartModal({ open, onClose, cells, range }: ChartModalProps) {
  const [type, setType] = useState<ChartType>('bar');
  const [orientation, setOrientation] = useState<'columns' | 'rows'>('columns');
  const data = useMemo(
    () => buildChartData(cells, range, orientation),
    [cells, range, orientation],
  );
  const chartRef = useRef<HTMLDivElement>(null);

  // 모달 열릴 때 막대로 초기화
  useEffect(() => { if (open) setType('bar'); }, [open]);

  const handleDownloadPng = useCallback(async () => {
    if (!chartRef.current) return;
    try {
      const html2canvasMod = await import('html2canvas');
      const html2canvas = html2canvasMod.default;
      const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff', scale: 2 });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chart_${Date.now()}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast({ title: 'PNG 저장됨' });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'PNG 저장 실패', description: msg });
    }
  }, []);

  const hasData = data.rows.length > 0 && data.seriesKeys.length > 0;
  const rangeLabel = useMemo(() => {
    const a = `${idxToCol(range.minC)}${range.minR + 1}`;
    const b = `${idxToCol(range.maxC)}${range.maxR + 1}`;
    return `${a}:${b}`;
  }, [range]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          차트 만들기 — {rangeLabel}
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          첫 행·첫 열을 라벨로 사용합니다. 숫자가 아닌 셀은 0으로 처리됩니다.
        </DialogDescription>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-1 p-0.5 rounded border border-border bg-muted/40">
            <ChartTypeBtn icon={<BarChart3 className="w-4 h-4" />} label="막대" active={type === 'bar'} onClick={() => setType('bar')} />
            <ChartTypeBtn icon={<LineChartIcon className="w-4 h-4" />} label="선" active={type === 'line'} onClick={() => setType('line')} />
            <ChartTypeBtn icon={<PieChartIcon className="w-4 h-4" />} label="원" active={type === 'pie'} onClick={() => setType('pie')} />
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded border border-border bg-muted/40">
            <ChartTypeBtn label="열별 시리즈" active={orientation === 'columns'} onClick={() => setOrientation('columns')} />
            <ChartTypeBtn label="행별 시리즈" active={orientation === 'rows'} onClick={() => setOrientation('rows')} />
          </div>
        </div>

        <div ref={chartRef} className="h-[380px] bg-white rounded border border-border p-3">
          {!hasData ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              데이터 부족 — 2×2 이상 범위를 선택하세요.
            </div>
          ) : type === 'bar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.rows} margin={{ top: 10, right: 16, bottom: 8, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {data.seriesKeys.map((k, i) => (
                  <Bar key={k} dataKey={k} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : type === 'line' ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.rows} margin={{ top: 10, right: 16, bottom: 8, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {data.seriesKeys.map((k, i) => (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={k}
                    stroke={CHART_PALETTE[i % CHART_PALETTE.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Pie
                  data={flattenForPie(data)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label
                >
                  {flattenForPie(data).map((_, i) => (
                    <RechartsCell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span>
            {type === 'pie' && data.seriesKeys.length > 1
              ? `원형은 첫 시리즈(${data.seriesKeys[0]})만 표시 — 막대/선 권장`
              : `시리즈 ${data.seriesKeys.length}개 × 카테고리 ${data.rows.length}개`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={!hasData}
              className="px-3 py-1.5 rounded border border-border hover:bg-muted text-sm flex items-center gap-1 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> PNG 저장
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-foreground text-background hover:bg-foreground/90 text-sm"
            >
              닫기
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// 시트 검색·치환 패널 (Ctrl+F / Ctrl+H)
// ─────────────────────────────────────────────

interface SheetSearchPanelProps {
  mode: 'find' | 'replace';
  onModeChange: (m: 'find' | 'replace') => void;
  query: string;
  onQueryChange: (v: string) => void;
  replaceText: string;
  onReplaceTextChange: (v: string) => void;
  caseSensitive: boolean;
  onCaseSensitiveChange: (v: boolean) => void;
  matches: number;
  cursor: number;
  onNext: () => void;
  onPrev: () => void;
  onReplaceOne: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

function SheetSearchPanel({
  mode, onModeChange, query, onQueryChange, replaceText, onReplaceTextChange,
  caseSensitive, onCaseSensitiveChange, matches, cursor,
  onNext, onPrev, onReplaceOne, onReplaceAll, onClose,
}: SheetSearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [mode]);

  return (
    <div className="border-b border-border bg-popover/95 backdrop-blur sticky top-0 z-20">
      <div className="max-w-3xl mx-auto px-4 py-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <SearchIcon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); if (e.shiftKey) onPrev(); else onNext(); }
              else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
              else if (e.key.toLowerCase() === 'h' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault(); onModeChange('replace');
              } else if (e.key.toLowerCase() === 'f' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault(); onModeChange('find');
              }
            }}
            placeholder="찾을 내용 (셀 값/수식 결과)"
            className="flex-1 text-sm px-2 py-1 rounded border border-border bg-background outline-none focus:border-foreground/40"
          />
          <span className="text-xs text-muted-foreground min-w-[48px] text-right tabular-nums">
            {matches === 0 ? '0' : `${cursor + 1}/${matches}`}
          </span>
          <button type="button" onClick={onPrev} disabled={matches === 0}
            className="p-1 rounded hover:bg-muted disabled:opacity-40" title="Shift+Enter">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onNext} disabled={matches === 0}
            className="p-1 rounded hover:bg-muted disabled:opacity-40" title="Enter">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer select-none">
            <input type="checkbox" checked={caseSensitive}
              onChange={(e) => onCaseSensitiveChange(e.target.checked)} className="cursor-pointer" />
            Aa
          </label>
          <button
            type="button"
            onClick={() => onModeChange(mode === 'find' ? 'replace' : 'find')}
            className={cn('p-1 rounded hover:bg-muted', mode === 'replace' && 'bg-muted')}
            title="Ctrl+H"
            aria-label="치환 토글"
          >
            <ReplaceIcon className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-muted" title="Esc">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {mode === 'replace' && (
          <div className="flex items-center gap-1.5">
            <ReplaceIcon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
            <input
              type="text"
              value={replaceText}
              onChange={(e) => onReplaceTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); onReplaceOne(); }
                else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
              }}
              placeholder="바꿀 내용 (수식 셀은 보존)"
              className="flex-1 text-sm px-2 py-1 rounded border border-border bg-background outline-none focus:border-foreground/40"
            />
            <button type="button" onClick={onReplaceOne} disabled={matches === 0}
              className="px-2 py-1 rounded border border-border hover:bg-muted text-xs disabled:opacity-40">
              바꾸기
            </button>
            <button type="button" onClick={onReplaceAll} disabled={matches === 0}
              className="px-2 py-1 rounded bg-foreground text-background hover:bg-foreground/90 text-xs disabled:opacity-40">
              모두 바꾸기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChartTypeBtn({
  icon, label, active, onClick,
}: { icon?: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors',
        active ? 'bg-background text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
