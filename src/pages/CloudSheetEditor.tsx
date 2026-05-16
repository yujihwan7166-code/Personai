/** /cloud/sheet/:id — 시트 에디터.
 *  6단계-α: 26×50 셀 그리드, 텍스트 입력, 키보드 탐색, 자동저장.
 *  수식 (=...), 시트 탭, 셀 서식, .xlsx import/export 는 다음 단계.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X, MoreHorizontal, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Keyboard,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, Palette, Highlighter, Eraser,
  Hash, Square as SquareIcon,
  Plus, Pencil, Copy as CopyIcon, Trash2 as TrashIcon,
  Upload, Download, Sparkles,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchNode, updateFileBody } from '@/lib/cloudClient';
import { evalCell } from '@/lib/cloudSheet/formula';
import { importXlsxFile, exportXlsxFile } from '@/lib/cloudSheet/xlsx';
import { cellsToCsv, sheetSummarize, sheetSuggestFormula, sheetExplainSelection } from '@/lib/cloudSheet/ai';
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

  // 다중 시트 — sheetsMeta 는 순서·이름, allCells/allFormats 는 시트별 데이터
  const [sheetsMeta, setSheetsMeta] = useState<SheetMeta[]>([{ id: 's_initial', name: 'Sheet1' }]);
  const [currentSheetIdx, setCurrentSheetIdx] = useState(0);
  const [allCells, setAllCells] = useState<AllCells>({ s_initial: {} });
  const [allFormats, setAllFormats] = useState<AllFormats>({ s_initial: {} });

  const [selected, setSelected] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [editing, setEditing] = useState<{ row: number; col: number } | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // derived — 현재 시트의 cells/formats
  const currentSheet = sheetsMeta[currentSheetIdx] ?? sheetsMeta[0];
  const currentSheetId = currentSheet?.id ?? 's_initial';
  const cells = allCells[currentSheetId] ?? {};
  const cellFormats = allFormats[currentSheetId] ?? {};

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
        if (Array.isArray(storedSheets) && storedSheets.length > 0) {
          // 다중 시트 형식 (현재 모델)
          setSheetsMeta(storedSheets);
          setAllCells(storedAllCells ?? {});
          setAllFormats(storedAllFormats ?? {});
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
          setCurrentSheetIdx(0);
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
    currentSheetIdx?: number;
  }) => {
    pendingRef.current = {
      ...pendingRef.current,
      meta: {
        sheets: patch.sheets ?? sheetsMeta,
        allCells: patch.allCells ?? allCells,
        allFormats: patch.allFormats ?? allFormats,
        currentSheetIdx: patch.currentSheetIdx ?? currentSheetIdx,
      },
    };
    setSaveState('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void flushSave(); }, AUTOSAVE_DELAY_MS);
  }, [flushSave, sheetsMeta, allCells, allFormats, currentSheetIdx]);

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
    setSheetsMeta(nextSheets);
    setAllCells(nextCells);
    setAllFormats(nextFormats);
    setCurrentSheetIdx(nextSheets.length - 1);
    setSelected({ row: 0, col: 0 });
    queueSave({
      sheets: nextSheets, allCells: nextCells, allFormats: nextFormats,
      currentSheetIdx: nextSheets.length - 1,
    });
  }, [sheetsMeta, allCells, allFormats, queueSave]);

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
    delete nextCells[target.id];
    delete nextFormats[target.id];
    const newIdx = Math.max(0, Math.min(currentSheetIdx, nextSheets.length - 1));
    setSheetsMeta(nextSheets);
    setAllCells(nextCells);
    setAllFormats(nextFormats);
    setCurrentSheetIdx(newIdx);
    queueSave({
      sheets: nextSheets, allCells: nextCells, allFormats: nextFormats,
      currentSheetIdx: newIdx,
    });
  }, [sheetsMeta, allCells, allFormats, currentSheetIdx, queueSave]);

  const renameSheet = useCallback((idx: number, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const nextSheets = sheetsMeta.map((s, i) => (i === idx ? { ...s, name: trimmed } : s));
    setSheetsMeta(nextSheets);
    queueSave({ sheets: nextSheets });
  }, [sheetsMeta, queueSave]);

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
        }
        const nextSheets = [...sheetsMeta, ...newMetas];
        setSheetsMeta(nextSheets);
        setAllCells(newAllCells);
        setAllFormats(newAllFormats);
        setCurrentSheetIdx(sheetsMeta.length); // 첫 새 시트로 전환
        queueSave({
          sheets: nextSheets, allCells: newAllCells, allFormats: newAllFormats,
          currentSheetIdx: sheetsMeta.length,
        });
        toast({
          title: '가져오기 완료',
          description: `${imported.length}개 시트가 추가됐어요. 서식은 다음 단계에서 보존됩니다.`,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast({ title: '가져오기 실패', description: msg });
      }
    };
    input.click();
  }, [allCells, allFormats, sheetsMeta, queueSave]);

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

  // ─── .xlsx export: 모든 시트 → 파일 다운로드 ───
  const exportXlsx = useCallback(() => {
    try {
      const exportSheets = sheetsMeta.map((s) => ({
        name: s.name,
        cells: allCells[s.id] ?? {},
      }));
      const fileName = (node?.name ?? '시트').replace(/[\\/:*?"<>|]/g, '_');
      exportXlsxFile(exportSheets, fileName);
      toast({ title: '내보내기 완료', description: `${fileName}.xlsx 다운로드 시작` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '내보내기 실패', description: msg });
    }
  }, [sheetsMeta, allCells, node?.name]);

  const duplicateSheet = useCallback((idx: number) => {
    const src = sheetsMeta[idx];
    if (!src) return;
    const id = newSheetId();
    const newMeta: SheetMeta = { id, name: `${src.name} 복사본` };
    const nextSheets = [...sheetsMeta.slice(0, idx + 1), newMeta, ...sheetsMeta.slice(idx + 1)];
    const nextCells: AllCells = { ...allCells, [id]: { ...(allCells[src.id] ?? {}) } };
    const nextFormats: AllFormats = { ...allFormats, [id]: { ...(allFormats[src.id] ?? {}) } };
    setSheetsMeta(nextSheets);
    setAllCells(nextCells);
    setAllFormats(nextFormats);
    setCurrentSheetIdx(idx + 1);
    queueSave({
      sheets: nextSheets, allCells: nextCells, allFormats: nextFormats,
      currentSheetIdx: idx + 1,
    });
  }, [sheetsMeta, allCells, allFormats, queueSave]);

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

      <main className="flex-1 overflow-auto">
        <div ref={gridRef}>
          <SheetGrid
            cells={cells}
            displayValues={displayValues}
            cellFormats={cellFormats}
            selected={selected}
            editing={editing}
            editingValue={editingValue}
            onSelect={(row, col) => setSelected({ row, col })}
            onStartEdit={startEdit}
            onChangeValue={setEditingValue}
            onCommitEdit={commitEdit}
            onCancelEdit={cancelEdit}
          />
        </div>
      </main>

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

interface SheetGridProps {
  cells: Cells;
  displayValues: Cells;
  cellFormats: CellFormats;
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
  cells, displayValues, cellFormats, selected, editing, editingValue,
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
                let display = raw.startsWith('=') ? (displayValues[ref] ?? '') : raw;
                const isSelected = selected.row === rowIdx && selected.col === colIdx;
                const isEditing = !!editing && editing.row === rowIdx && editing.col === colIdx;
                const fmt = cellFormats[ref];
                // 숫자 형식 적용 (편집 중이 아닐 때만, 에러 셀 제외)
                if (fmt?.numberFmt && !isEditing && !display.startsWith('#')) {
                  display = applyNumberFormat(display, fmt.numberFmt);
                }
                return (
                  <SheetCell
                    key={ref}
                    row={rowIdx}
                    col={colIdx}
                    value={display}
                    format={fmt}
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
  format?: CellFormat;
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
  row, col, value, format, selected, editing, editingValue,
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

  const tdStyle: React.CSSProperties = {
    padding: editing ? 0 : undefined,
    backgroundColor: format?.bgColor,
    color: format?.textColor,
    fontWeight: format?.bold ? 600 : undefined,
    fontStyle: format?.italic ? 'italic' : undefined,
    textAlign: format?.align,
    ...borderStyleFor(format?.border),
  };
  return (
    <td
      onClick={() => onSelect(row, col)}
      onDoubleClick={() => onStartEdit(row, col)}
      className={cn(
        'border border-border h-7 px-2 align-middle relative cursor-cell',
        'min-w-[88px] max-w-[200px] truncate',
        selected && !editing && 'outline outline-2 -outline-offset-2 outline-foreground/70',
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
    </td>
  );
});

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
