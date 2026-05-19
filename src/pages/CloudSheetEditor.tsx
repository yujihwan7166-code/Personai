/** /cloud/sheet/:id — 시트 에디터.
 *  6단계-α: 26×50 셀 그리드, 텍스트 입력, 키보드 탐색, 자동저장.
 *  수식 (=...), 시트 탭, 셀 서식, .xlsx import/export 는 다음 단계.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X, MoreHorizontal, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Keyboard,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, Palette, Highlighter, Eraser,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  Paintbrush,
  Hash, Square as SquareIcon, Combine, Split,
  Plus, Minus, Copy as CopyIcon, Trash2 as TrashIcon,
  Upload, Download, Sparkles, BarChart3, Printer,
  ChevronDown,
  Undo2, Redo2, MessageSquare,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
// ContextMenu 는 SheetTab 내부 사용
import { ColorPopover } from '@/components/cloud/ColorPopover';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
// updateFileBody 는 useDebouncedAutosave 내부 사용
import { useCloudNodeLoader } from '@/lib/cloudCommon/useCloudNodeLoader';
import { useDebouncedAutosave } from '@/lib/cloudCommon/useDebouncedAutosave';
import {
  shiftCellsRow, shiftCellsCol,
  shiftFormatsRow, shiftFormatsCol,
  shiftMergesRow, shiftMergesCol,
} from '@/lib/cloudSheet/axisShift';
import { compareCellValues } from '@/lib/cloudSheet/cellCompare';
import { detectHeaderRow } from '@/lib/cloudSheet/detectHeader';
import { computeSelBounds, buildMergeMaps } from '@/lib/cloudSheet/selBounds';
import { buildFormulaRefHighlights } from '@/lib/cloudSheet/formulaRefHighlights';
import { findAutocomplete } from '@/lib/cloudSheet/autocompleteCell';
import { computeSelectionStats, formatStatNumber } from '@/lib/cloudSheet/selectionStats';
import {
  buildValidationItemsMap, buildCheckboxRefSet, buildInvalidRefSet,
} from '@/lib/cloudSheet/validationMaps';
import { evalCell, idxToCol, colToIdx, SPILL_SENTINEL } from '@/lib/cloudSheet/formula';
import { AI_CHANGED_EVENT } from '@/lib/cloudSheet/aiCellEval';
import { shiftFormulasInCells } from '@/lib/cloudSheet/formulaShift';
import { importXlsxFile, exportXlsxFile } from '@/lib/cloudSheet/xlsx';
import { cellsToCsv, sheetSummarize, sheetSuggestFormula, sheetExplainSelection } from '@/lib/cloudSheet/ai';
import {
  CHART_PALETTE, type SelRange, type EmbeddedChart,
} from '@/lib/cloudSheet/chart';
// recharts components 는 lib/cloudSheet/EmbeddedChartCard + ChartModal 으로 이동
import { exportElementToPdf, sanitizeFileName } from '@/lib/cloudCommon/pdfExport';
import { AiSidebar } from '@/components/cloud/AiSidebar';
import { AiSidebarToggle } from '@/components/cloud/AiSidebarToggle';
import { useAiSidebar } from '@/components/cloud/useAiSidebar';
import { SheetMenuBar } from '@/components/cloud/SheetMenuBar';
import { InsertLinkDialog } from '@/components/cloud/InsertLinkDialog';
import type { AiContext } from '@/lib/cloudAi/types';
// CloudNode 는 useCloudNodeLoader 내부 사용
// Dialog 는 lib/cloudSheet/ 의 각 모달 내부 사용
import { SaveStateBadge, type SaveState } from '@/lib/cloudDoc/SaveStateBadge';
// HelpRow 는 SheetHelpModal 내부 사용
import { NameBox } from '@/lib/cloudSheet/NameBox';
// ColResizeHandle / RowResizeHandle / ValidationDropdown 는 SheetGrid/SheetCell 내부 사용
// FuncHintPopover / getFuncSuggestionNames / applyFuncSuggestion 는 SheetCell 내부 사용
import { FormulaBarInput } from '@/lib/cloudSheet/FormulaBarInput';
import { SheetTab, type SheetTabColor } from '@/lib/cloudSheet/SheetTab';
import { SheetHelpModal } from '@/lib/cloudSheet/SheetHelpModal';
import { EmbeddedChartCard } from '@/lib/cloudSheet/EmbeddedChartCard';
import { ChartModal } from '@/lib/cloudSheet/ChartModal';
import { SheetSearchPanel } from '@/lib/cloudSheet/SheetSearchPanel';
import { CondFormatModal } from '@/lib/cloudSheet/CondFormatModal';
import {
  type CondOp, type CondRule, newCondRuleId, buildCondFormatMap,
} from '@/lib/cloudSheet/condFormat';
import { ValidationModal } from '@/lib/cloudSheet/ValidationModal';
import { type Validation, newValidationId } from '@/lib/cloudSheet/validation';
import { CommentModal } from '@/lib/cloudSheet/CommentModal';
import { NamedRangeModal } from '@/lib/cloudSheet/NamedRangeModal';
import { cellRef, escapeRegex } from '@/lib/cloudSheet/sheetUtils';
import {
  type NumberFmt, DECIMAL_SEQUENCE, decimalsIndexOf, NUMBER_FMT_OPTIONS,
} from '@/lib/cloudSheet/numberFormat';
import { nextSeriesValue } from '@/lib/cloudSheet/seriesAutofill';
import { type BorderStyle } from '@/lib/cloudSheet/borderStyle';
import { newId } from '@/lib/idGenerator';
import {
  type FontFamily, FONT_FAMILY_LABEL,
  FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_DEFAULT,
} from '@/lib/cloudSheet/fontFamily';
import {
  type VAlign, type Wrap, type CellFormat, type CellFormats, CLEARED_FORMAT,
} from '@/lib/cloudSheet/cellFormat';
import {
  type Cells, type AllCells, type Merge, type AllMerges,
  type Comments, type AllComments, type SelBounds,
} from '@/lib/cloudSheet/cellTypes';
import { SheetGrid } from '@/lib/cloudSheet/SheetGrid';
import { maxRowColFromCells, maxRowColFromAll } from '@/lib/cloudSheet/sheetBounds';
import { useSheetHistory } from '@/lib/cloudSheet/useSheetHistory';
import { rangeToTsv as rangeToTsvFn, parseTsv as parseTsvFn } from '@/lib/cloudSheet/tsv';
import { AiResultModal } from '@/lib/cloudSheet/AiResultModal';
import { todayString, nowTimeString } from '@/lib/cloudSheet/dateInsert';
import {
  DEFAULT_ROWS, DEFAULT_COLS, MIN_ROWS, MIN_COLS, MAX_ROWS, MAX_COLS,
  ROW_ADD_CHUNK, COL_ADD_CHUNK,
  DEFAULT_COL_WIDTH, MIN_COL_WIDTH, MAX_COL_WIDTH,
  DEFAULT_ROW_HEIGHT, MIN_ROW_HEIGHT, MAX_ROW_HEIGHT,
} from '@/lib/cloudSheet/dimensions';

// SheetTabColor / SHEET_TAB_COLOR_LABEL / SHEET_TAB_COLOR_HEX 는 lib/cloudSheet/SheetTab 공용

interface SheetMeta {
  id: string;
  name: string;
  /** 탭 색상 (PR #7) — 빠른 시각 구분. 미설정 = 기본. */
  color?: SheetTabColor;
}
type AllFormats = Record<string, CellFormats>;

// Cells / AllCells / Merge / AllMerges / Comments / AllComments 는 lib/cloudSheet/cellTypes 공용

// Validation 은 lib/cloudSheet/validation 공용
type AllValidations = Record<string, Validation[]>;

// EmbeddedChart 는 lib/cloudSheet/chart 공용
type AllEmbeddedCharts = Record<string, EmbeddedChart[]>;

// newEmbeddedChartId → newId('ch') 공용

// newValidationId 는 lib/cloudSheet/validation 공용

// CondOp / CondRule / evalCondRule / newCondRuleId 는 lib/cloudSheet/condFormat 공용
type AllCondRules = Record<string, CondRule[]>;

// newSheetId → newId('s') 공용

// NumberFmt / DECIMAL_SEQUENCE / decimalsIndexOf 는 lib/cloudSheet/numberFormat 공용
// BorderStyle 은 lib/cloudSheet/borderStyle 공용
// FontFamily / FONT_FAMILY_* / FONT_SIZE_* 는 lib/cloudSheet/fontFamily 공용
// VAlign / Wrap / CellFormat / CellFormats 는 lib/cloudSheet/cellFormat 공용

// FONT_FAMILY_LABEL / FONT_FAMILY_CSS / FONT_SIZE_* 는 lib/cloudSheet/fontFamily 공용

// NUMBER_FMT_OPTIONS / applyNumberFormat 는 lib/cloudSheet/numberFormat 공용

// borderStyleFor 는 lib/cloudSheet/borderStyle 공용

// DEFAULT_ROWS / DEFAULT_COLS / 그리드 크기 상수들은 lib/cloudSheet/dimensions 공용
const AUTOSAVE_DELAY_MS = 1000;

// colLabel / cellRef / escapeRegex / detectLink 는 lib/cloudSheet/sheetUtils 공용

// nextSeriesValue / CYCLE_LISTS 는 lib/cloudSheet/seriesAutofill 공용

// maxRowColFromCells / maxRowColFromAll 는 lib/cloudSheet/sheetBounds 공용

export default function CloudSheetEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>(undefined);
  const [helpOpen, setHelpOpen] = useState(false);

  // 링크 삽입 모달 (PR #6) — 메뉴 "삽입 → 링크" / Ctrl+K 진입.
  const [insertLinkOpen, setInsertLinkOpen] = useState(false);

  // 줌 (PR #4) — 25/50/75/100/125/150/175/200%. localStorage 에 마지막 값.
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window === 'undefined') return 100;
    const raw = window.localStorage.getItem('cloudSheet.zoom.v1');
    const n = raw ? Number(raw) : 100;
    return Number.isFinite(n) && n >= 25 && n <= 200 ? n : 100;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem('cloudSheet.zoom.v1', String(zoom)); } catch { /* silent */ }
  }, [zoom]);

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
  // 행 높이 — rowIdx → px (없으면 DEFAULT_ROW_HEIGHT)
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  // freeze pane — N행/N열 고정 (0=고정 X)
  const [freezeRows, setFreezeRows] = useState(0);
  const [freezeCols, setFreezeCols] = useState(0);
  // 필터 — col idx → substring 검색어 (대소문자 무시, 포함 매칭)
  const [filterOn, setFilterOn] = useState(false);
  const [filters, setFilters] = useState<Record<number, string>>({});

  const [selected, setSelected] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [rangeAnchor, setRangeAnchor] = useState<{ row: number; col: number } | null>(null);
  const [draggingRange, setDraggingRange] = useState(false);
  const [editing, setEditing] = useState<{ row: number; col: number } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  /** 서식 복사 source — null = 비활성. object = 활성 (이 format 을 다음 클릭/영역에 덮어쓰기). */
  const [formatPainterSource, setFormatPainterSource] = useState<CellFormat | null>(null);

  // 선택 범위 계산 (lib/cloudSheet/selBounds 공용)
  const selBounds = useMemo(
    () => computeSelBounds(selected, rangeAnchor),
    [rangeAnchor, selected],
  );

  const hasRange = !!rangeAnchor && (rangeAnchor.row !== selected.row || rangeAnchor.col !== selected.col);
  // 현재 포커스 셀 ref (서식 도구바·수식 표시줄에서 사용) — useCallback 의존성 TDZ 회피
  const selectedRef = cellRef(selected.row, selected.col);

  // 셀 병합 — sheet 별 merge 배열 (top-left 포함, 좌표는 0-based)
  const [allMerges, setAllMerges] = useState<AllMerges>({ s_initial: [] });
  // 조건부 서식 — sheet 별 rule 목록
  const [allCondRules, setAllCondRules] = useState<AllCondRules>({ s_initial: [] });
  // 데이터 검증 (드롭다운 목록) — sheet 별
  const [allValidations, setAllValidations] = useState<AllValidations>({ s_initial: [] });
  // 셀 코멘트 — sheet 별 ref → text
  const [allComments, setAllComments] = useState<AllComments>({ s_initial: {} });
  // 영구 embed 차트 — sheet 별
  const [allEmbeddedCharts, setAllEmbeddedCharts] = useState<AllEmbeddedCharts>({ s_initial: [] });
  // 명명된 범위 (Named Range) — 글로벌. name → 'Sheet1!A1:A10' 같은 ref 문자열
  const [namedRanges, setNamedRanges] = useState<Record<string, string>>({});

  // derived — 현재 시트의 cells/formats/merges/condRules
  const currentSheet = sheetsMeta[currentSheetIdx] ?? sheetsMeta[0];
  const currentSheetId = currentSheet?.id ?? 's_initial';
  const cells = allCells[currentSheetId] ?? {};
  const cellFormats = allFormats[currentSheetId] ?? {};
  const merges = allMerges[currentSheetId] ?? [];
  const condRules = allCondRules[currentSheetId] ?? [];
  const validations = allValidations[currentSheetId] ?? [];
  const comments = allComments[currentSheetId] ?? {};
  const embeddedCharts = allEmbeddedCharts[currentSheetId] ?? [];

  // 병합 렌더링용 — lib/cloudSheet/selBounds.buildMergeMaps 공용
  const { mergeAtMap, coveredSet } = useMemo(() => buildMergeMaps(merges), [merges]);

  // ─── cross-sheet 평가 컨텍스트 ───
  // sheetName → cells 매핑 (다른 시트의 셀을 'Sheet1!A1' 식으로 참조 가능)
  const sheetsForEval = useMemo(() => {
    const out: Record<string, typeof cells> = {};
    for (const s of sheetsMeta) {
      out[s.name] = allCells[s.id] ?? {};
    }
    return out;
  }, [sheetsMeta, allCells]);
  const currentSheetName = currentSheet?.name ?? 'Sheet1';

  /** editing 중 수식 입력 시 참조된 셀들을 다른 색으로 outline. */
  const formulaRefHighlights = useMemo<Map<string, string>>(
    () => (editing && editingValue.startsWith('='))
      ? buildFormulaRefHighlights(editingValue.slice(1), currentSheetName, CHART_PALETTE)
      : new Map(),
    [editing, editingValue, currentSheetName],
  );

  /** 자동완성 — editing 중인 셀의 같은 col 에서 prefix 매치되는 첫 값 (대소문자 무시). */
  const autocomplete = useMemo<string | null>(
    () => editing ? findAutocomplete(cells, editingValue, editing.row, editing.col, rowCount) : null,
    [editing, editingValue, cells, rowCount],
  );

  // AI 셀 결과가 비동기로 도착하면 AI_CHANGED 이벤트 → aiVersion bump → memo 재계산.
  // 결과는 캐시에 들어가있어 다음 평가에서 sentinel 대신 실제 값을 반환함.
  const [aiVersion, setAiVersion] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onChange = () => setAiVersion((v) => v + 1);
    window.addEventListener(AI_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(AI_CHANGED_EVENT, onChange);
  }, []);

  // 수식 평가 캐시 (cells / 다른 시트 / named ranges / AI 결과 도착 시 재계산)
  // 동적 배열 수식(FILTER/SORT/UNIQUE/SEQUENCE) 은 anchor 셀에서 SPILL_SENTINEL
  // 페이로드를 반환 → 여기서 인접 셀로 펼침. 기존 셀과 충돌하면 anchor 에 #SPILL! 표시.
  const displayValues = useMemo<Cells>(() => {
    const out: Cells = {};
    const ctx = { currentName: currentSheetName, allSheets: sheetsForEval, namedRanges };
    const spilledInto = new Set<string>();
    for (const [ref, raw] of Object.entries(cells)) {
      const v = raw.startsWith('=') ? evalCell(ref, cells, ctx) : raw;
      if (!v.startsWith(SPILL_SENTINEL)) {
        out[ref] = v;
        continue;
      }
      // Spill 처리 — anchor 좌표 파싱
      const m = ref.match(/^([A-Z]+)(\d+)$/);
      if (!m) { out[ref] = v; continue; }
      const anchorCol = colToIdx(m[1]);
      const anchorRow = Number(m[2]);
      let grid: unknown[][] = [];
      try {
        const parsed = JSON.parse(v.slice(SPILL_SENTINEL.length));
        if (Array.isArray(parsed)) grid = parsed as unknown[][];
      } catch { out[ref] = '#SPILL_PARSE'; continue; }
      // 충돌 검사: anchor 외 spill 영역에 다른 내용이 있는지
      let conflict = false;
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (r === 0 && c === 0) continue;
          const target = `${idxToCol(anchorCol + c)}${anchorRow + r}`;
          if (cells[target] !== undefined || spilledInto.has(target)) { conflict = true; break; }
        }
        if (conflict) break;
      }
      if (conflict) {
        out[ref] = '#SPILL!';
        continue;
      }
      // 펼치기
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          const target = `${idxToCol(anchorCol + c)}${anchorRow + r}`;
          out[target] = String(grid[r][c] ?? '');
          if (!(r === 0 && c === 0)) spilledInto.add(target);
        }
      }
    }
    return out;
    // aiVersion 은 의도된 의존 — AI 캐시 변화 → 같은 cells 재평가 트리거.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, sheetsForEval, currentSheetName, namedRanges, aiVersion]);

  const gridRef = useRef<HTMLDivElement>(null);

  // ─── 노드 로드 + 초기 cells 주입 (공용 훅 + onLoad 콜백) ───
  const { node, loadError } = useCloudNodeLoader({
    id, user, authLoading,
    expectedFileType: 'sheet',
    notFoundMessage: '시트를 찾을 수 없어요.',
    wrongTypeMessage: '시트 파일이 아니에요.',
    onLoad: (n) => {
      try {
        const meta = (n.meta ?? {}) as Record<string, unknown>;
        const storedSheets = meta.sheets as Array<{ id: string; name: string }> | undefined;
        const storedAllCells = meta.allCells as AllCells | undefined;
        const storedAllFormats = meta.allFormats as AllFormats | undefined;
        const storedAllMerges = meta.allMerges as AllMerges | undefined;
        const storedAllCondRules = meta.allCondRules as AllCondRules | undefined;
        const storedAllValidations = meta.allValidations as AllValidations | undefined;
        const storedAllComments = meta.allComments as AllComments | undefined;
        const storedAllEmbeddedCharts = meta.allEmbeddedCharts as AllEmbeddedCharts | undefined;
        const storedNamedRanges = meta.namedRanges as Record<string, string> | undefined;
        const storedRowCount = typeof meta.rowCount === 'number' ? meta.rowCount : undefined;
        const storedColCount = typeof meta.colCount === 'number' ? meta.colCount : undefined;
        const storedColWidths = meta.colWidths as Record<string, number> | undefined;
        const storedRowHeights = meta.rowHeights as Record<string, number> | undefined;
        // freeze: number(신) 또는 boolean(구) 둘 다 호환
        if (typeof meta.freezeRows === 'number') setFreezeRows(Math.max(0, meta.freezeRows));
        else if (typeof meta.freezeFirstRow === 'boolean') setFreezeRows(meta.freezeFirstRow ? 1 : 0);
        if (typeof meta.freezeCols === 'number') setFreezeCols(Math.max(0, meta.freezeCols));
        else if (typeof meta.freezeFirstCol === 'boolean') setFreezeCols(meta.freezeFirstCol ? 1 : 0);
        if (Array.isArray(storedSheets) && storedSheets.length > 0) {
          // 다중 시트 형식 (현재 모델)
          const cellsAll = storedAllCells ?? {};
          const mergesAll = storedAllMerges ?? {};
          setSheetsMeta(storedSheets);
          setAllCells(cellsAll);
          setAllFormats(storedAllFormats ?? {});
          setAllMerges(mergesAll);
          if (storedAllCondRules) setAllCondRules(storedAllCondRules);
          if (storedAllValidations) setAllValidations(storedAllValidations);
          if (storedAllComments) setAllComments(storedAllComments);
          if (storedAllEmbeddedCharts) setAllEmbeddedCharts(storedAllEmbeddedCharts);
          if (storedNamedRanges && typeof storedNamedRanges === 'object') {
            setNamedRanges(storedNamedRanges);
          }
          // 데이터 기반 최소 그리드 크기 보장
          const { row: maxR, col: maxC } = maxRowColFromAll(cellsAll, mergesAll);
          const rc = Math.max(storedRowCount ?? DEFAULT_ROWS, maxR + 1, MIN_ROWS);
          const cc = Math.max(storedColCount ?? DEFAULT_COLS, maxC + 1, MIN_COLS);
          setRowCount(Math.min(rc, MAX_ROWS));
          setColCount(Math.min(cc, MAX_COLS));
          // 열 너비 / 행 높이 복원 (key 가 문자열로 저장돼있으므로 숫자로 변환)
          if (storedColWidths && typeof storedColWidths === 'object') {
            const out: Record<number, number> = {};
            for (const [k, v] of Object.entries(storedColWidths)) {
              const idx = Number(k);
              if (Number.isFinite(idx) && typeof v === 'number') out[idx] = v;
            }
            setColWidths(out);
          }
          if (storedRowHeights && typeof storedRowHeights === 'object') {
            const out: Record<number, number> = {};
            for (const [k, v] of Object.entries(storedRowHeights)) {
              const idx = Number(k);
              if (Number.isFinite(idx) && typeof v === 'number') out[idx] = v;
            }
            setRowHeights(out);
          }
          const idx = typeof meta.currentSheetIdx === 'number'
            ? Math.max(0, Math.min(meta.currentSheetIdx, storedSheets.length - 1))
            : 0;
          setCurrentSheetIdx(idx);
          // 마지막 셀 위치 + 시트 인덱스 복원 (localStorage)
          try {
            const lc = window.localStorage.getItem(`personai.cloud.sheet.lastCell.${id}`);
            if (lc) {
              const p = JSON.parse(lc) as { row?: number; col?: number; sheetIdx?: number };
              if (typeof p.sheetIdx === 'number') {
                setCurrentSheetIdx(Math.max(0, Math.min(p.sheetIdx, storedSheets.length - 1)));
              }
              if (typeof p.row === 'number' && typeof p.col === 'number') {
                const finalRC = Math.min(rc, MAX_ROWS);
                const finalCC = Math.min(cc, MAX_COLS);
                setSelected({
                  row: Math.max(0, Math.min(p.row, finalRC - 1)),
                  col: Math.max(0, Math.min(p.col, finalCC - 1)),
                });
              }
            }
          } catch { /* noop */ }
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
      } catch {
        // 로드 검증은 훅이 담당 — 여기서는 meta 파싱 실패 시 빈 시트로 유지
      }
    },
  });

  // ─── 마지막 셀 위치 + 시트 인덱스 localStorage 저장 ───
  // (cloud meta 가 아니라 localStorage 라 저장 상태 flicker 없음)
  useEffect(() => {
    if (!id || !node) return;
    try {
      window.localStorage.setItem(
        `personai.cloud.sheet.lastCell.${id}`,
        JSON.stringify({ row: selected.row, col: selected.col, sheetIdx: currentSheetIdx }),
      );
    } catch { /* noop */ }
  }, [id, node, selected.row, selected.col, currentSheetIdx]);

  // ─── 저장 큐 (공용 훅 + 시트 전용 wrapper) ───
  const { flushSave, queueSave: queueSaveRaw } = useDebouncedAutosave({
    id, delayMs: AUTOSAVE_DELAY_MS, setSaveState, setLastSavedAt,
  });

  const queueSave = useCallback((patch: {
    sheets?: SheetMeta[];
    allCells?: AllCells;
    allFormats?: AllFormats;
    allMerges?: AllMerges;
    allCondRules?: AllCondRules;
    allValidations?: AllValidations;
    allComments?: AllComments;
    allEmbeddedCharts?: AllEmbeddedCharts;
    namedRanges?: Record<string, string>;
    currentSheetIdx?: number;
    rowCount?: number;
    colCount?: number;
    colWidths?: Record<number, number>;
    rowHeights?: Record<number, number>;
    freezeRows?: number;
    freezeCols?: number;
  }) => {
    queueSaveRaw({
      meta: {
        sheets: patch.sheets ?? sheetsMeta,
        allCells: patch.allCells ?? allCells,
        allFormats: patch.allFormats ?? allFormats,
        allMerges: patch.allMerges ?? allMerges,
        allCondRules: patch.allCondRules ?? allCondRules,
        allValidations: patch.allValidations ?? allValidations,
        allComments: patch.allComments ?? allComments,
        allEmbeddedCharts: patch.allEmbeddedCharts ?? allEmbeddedCharts,
        namedRanges: patch.namedRanges ?? namedRanges,
        currentSheetIdx: patch.currentSheetIdx ?? currentSheetIdx,
        rowCount: patch.rowCount ?? rowCount,
        colCount: patch.colCount ?? colCount,
        colWidths: patch.colWidths ?? colWidths,
        rowHeights: patch.rowHeights ?? rowHeights,
        freezeRows: patch.freezeRows ?? freezeRows,
        freezeCols: patch.freezeCols ?? freezeCols,
      },
    });
  }, [queueSaveRaw, sheetsMeta, allCells, allFormats, allMerges, allCondRules, allValidations, allComments, allEmbeddedCharts, namedRanges, currentSheetIdx, rowCount, colCount, colWidths, rowHeights, freezeRows, freezeCols]);

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

  /** 영역의 모든 셀에 같은 format patch 머지 — 기존 다른 키 보존. */
  const patchFormatInRange = useCallback((bounds: SelRange, patch: Partial<CellFormat>) => {
    setAllFormats((all) => {
      const curFmts = { ...(all[currentSheetId] ?? {}) };
      for (let r = bounds.minR; r <= bounds.maxR; r++) {
        for (let c = bounds.minC; c <= bounds.maxC; c++) {
          const ref = cellRef(r, c);
          const cur = curFmts[ref] ?? {};
          const merged: CellFormat = { ...cur };
          for (const k of Object.keys(patch) as Array<keyof CellFormat>) {
            const v = patch[k];
            if (v === undefined || v === '') delete merged[k];
            else (merged as Record<string, unknown>)[k] = v;
          }
          if (Object.keys(merged).length === 0) delete curFmts[ref];
          else curFmts[ref] = merged;
        }
      }
      const next: AllFormats = { ...all, [currentSheetId]: curFmts };
      queueSave({ allFormats: next });
      return next;
    });
  }, [queueSave, currentSheetId]);

  /** 영역의 모든 셀에 같은 format 덮어쓰기 (서식 복사 적용). */
  const applyFormatToRange = useCallback((bounds: SelRange, format: CellFormat) => {
    setAllFormats((all) => {
      const curFmts = { ...(all[currentSheetId] ?? {}) };
      const cleaned: CellFormat = {};
      for (const k of Object.keys(format) as Array<keyof CellFormat>) {
        const v = format[k];
        if (v !== undefined && v !== '') (cleaned as Record<string, unknown>)[k] = v;
      }
      for (let r = bounds.minR; r <= bounds.maxR; r++) {
        for (let c = bounds.minC; c <= bounds.maxC; c++) {
          const ref = cellRef(r, c);
          if (Object.keys(cleaned).length === 0) {
            delete curFmts[ref];
          } else {
            curFmts[ref] = { ...cleaned };
          }
        }
      }
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
    const id = newId('s');
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

  /** 탭 색상 변경 — undefined 면 색상 해제. (PR #7) */
  const setSheetColor = useCallback((idx: number, color: SheetTabColor | undefined) => {
    const nextSheets = sheetsMeta.map((s, i) => (i === idx ? { ...s, color } : s));
    setSheetsMeta(nextSheets);
    queueSave({ sheets: nextSheets });
  }, [sheetsMeta, queueSave]);

  /** 시트 위치 이동 (드래그 없이 우클릭 메뉴로) */
  const moveSheet = useCallback((from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    if (from >= sheetsMeta.length || to >= sheetsMeta.length) return;
    const next = sheetsMeta.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    // 현재 활성 시트 인덱스 보정
    let nextActive = currentSheetIdx;
    if (currentSheetIdx === from) nextActive = to;
    else if (from < currentSheetIdx && to >= currentSheetIdx) nextActive = currentSheetIdx - 1;
    else if (from > currentSheetIdx && to <= currentSheetIdx) nextActive = currentSheetIdx + 1;
    setSheetsMeta(next);
    setCurrentSheetIdx(nextActive);
    queueSave({ sheets: next, currentSheetIdx: nextActive });
  }, [sheetsMeta, currentSheetIdx, queueSave]);

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

      // 헤더 처리: opts.hasHeader 명시 우선, 없으면 자동 감지
      const hasHeader = opts?.hasHeader ?? detectHeaderRow(cells, area);
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
      rows.sort((a, b) => compareCellValues(a.values[keyIdx], b.values[keyIdx], dir));

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

  // ─── Undo / Redo (lib/cloudSheet/useSheetHistory 공용 훅) ───
  const { canUndo, canRedo, undo, redo } = useSheetHistory({
    allCells, allFormats, allMerges, rowCount, colCount,
    setAllCells, setAllFormats, setAllMerges, setRowCount, setColCount,
    ready: !!node,
    queueSave,
  });

  // Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z — 편집 중·input 안 X
  // + PR #8 파워 단축키 (Sheets 매칭):
  //   Ctrl+;             → 오늘 날짜 (YYYY-MM-DD)
  //   Ctrl+Shift+;       → 현재 시각 (HH:MM:SS)
  //   Ctrl+Alt+1~5       → 통화/소수1/시간/날짜/퍼센트 (Sheets 매칭)
  //   Ctrl+\             → 서식 지우기
  //   (F4 절대참조 토글은 편집 모드 안에서 동작해야 하므로 별도 — 본 PR 범위 밖)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing) return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); return; }

      // Ctrl+; / Ctrl+Shift+; — 날짜/시간 삽입
      if (e.key === ';' && !e.altKey) {
        e.preventDefault();
        setCellValue(selectedRef, e.shiftKey ? nowTimeString() : todayString());
        return;
      }

      // Ctrl+Alt+1~5 / Ctrl+\ — 숫자 서식 단축
      if (e.altKey) {
        if (e.key === '1') { e.preventDefault(); setCellFormat(selectedRef, { numberFmt: 'currency-krw' }); return; }
        if (e.key === '2') { e.preventDefault(); setCellFormat(selectedRef, { numberFmt: 'decimal1' }); return; }
        if (e.key === '3') { e.preventDefault(); setCellFormat(selectedRef, { numberFmt: 'date' }); return; }
        if (e.key === '4') { e.preventDefault(); setCellFormat(selectedRef, { numberFmt: 'integer' }); return; }
        if (e.key === '5') { e.preventDefault(); setCellFormat(selectedRef, { numberFmt: 'percent' }); return; }
      }
      if (e.key === '\\') {
        e.preventDefault();
        setCellFormat(selectedRef, CLEARED_FORMAT);
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, undo, redo, selectedRef, setCellValue, setCellFormat]);

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
  const rangeToTsv = useCallback(
    (bounds: SelBounds): string => rangeToTsvFn(cells, bounds),
    [cells],
  );

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

  // parseTsv 는 lib/cloudSheet/tsv 공용 (parseTsvFn 직접 사용)
  const parseTsv = parseTsvFn;

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

  // ─── 조건부 서식 ───
  const addCondRule = useCallback((rule: Omit<CondRule, 'id'>) => {
    const id = newCondRuleId();
    const nextRules = [...condRules, { ...rule, id }];
    const nextAll: AllCondRules = { ...allCondRules, [currentSheetId]: nextRules };
    setAllCondRules(nextAll);
    queueSave({ allCondRules: nextAll });
  }, [condRules, allCondRules, currentSheetId, queueSave]);

  const removeCondRule = useCallback((ruleId: string) => {
    const nextRules = condRules.filter((r) => r.id !== ruleId);
    const nextAll: AllCondRules = { ...allCondRules, [currentSheetId]: nextRules };
    setAllCondRules(nextAll);
    queueSave({ allCondRules: nextAll });
  }, [condRules, allCondRules, currentSheetId, queueSave]);

  /** ref → 조건부 서식 적용 (lib/cloudSheet/condFormat 공용) */
  const condFormatMap = useMemo(
    () => buildCondFormatMap(condRules, cells, displayValues),
    [condRules, cells, displayValues],
  );

  const [condModalOpen, setCondModalOpen] = useState(false);

  // ─── 데이터 검증 (드롭다운) ───
  const addValidation = useCallback((rule: Omit<Validation, 'id'>) => {
    const id = newValidationId();
    const next = [...validations, { ...rule, id }];
    const nextAll: AllValidations = { ...allValidations, [currentSheetId]: next };
    setAllValidations(nextAll);
    queueSave({ allValidations: nextAll });
  }, [validations, allValidations, currentSheetId, queueSave]);

  const removeValidation = useCallback((id: string) => {
    const next = validations.filter((v) => v.id !== id);
    const nextAll: AllValidations = { ...allValidations, [currentSheetId]: next };
    setAllValidations(nextAll);
    queueSave({ allValidations: nextAll });
  }, [validations, allValidations, currentSheetId, queueSave]);

  /** Validation 규칙 → ref lookup maps (lib/cloudSheet/validationMaps 공용) */
  const validationItemsMap = useMemo(() => buildValidationItemsMap(validations), [validations]);
  const checkboxRefSet = useMemo(() => buildCheckboxRefSet(validations), [validations]);
  const invalidRefSet = useMemo(
    () => buildInvalidRefSet(validationItemsMap, cells, displayValues),
    [validationItemsMap, cells, displayValues],
  );

  const [validationModalOpen, setValidationModalOpen] = useState(false);

  // ─── 셀 코멘트 ───
  const setCellComment = useCallback((ref: string, text: string) => {
    setAllComments((all) => {
      const cur = { ...(all[currentSheetId] ?? {}) };
      const trimmed = text.trim();
      if (trimmed === '') delete cur[ref];
      else cur[ref] = trimmed;
      const next: AllComments = { ...all, [currentSheetId]: cur };
      queueSave({ allComments: next });
      return next;
    });
  }, [currentSheetId, queueSave]);

  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const commentRefSet = useMemo(() => new Set(Object.keys(comments)), [comments]);
  const commentMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const [ref, text] of Object.entries(comments)) m.set(ref, text);
    return m;
  }, [comments]);

  // ─── AI 사이드바 ───
  const getAiContext = useCallback((): AiContext => {
    // 선택 범위의 cells 추출 → CSV
    const partial: Cells = {};
    let count = 0;
    for (let r = selBounds.minR; r <= selBounds.maxR; r++) {
      for (let c = selBounds.minC; c <= selBounds.maxC; c++) {
        const ref = cellRef(r, c);
        if (cells[ref] !== undefined) { partial[ref] = cells[ref]; count++; }
      }
    }
    const csv = cellsToCsv(partial, { displayValues });
    const a = `${idxToCol(selBounds.minC)}${selBounds.minR + 1}`;
    const b = `${idxToCol(selBounds.maxC)}${selBounds.maxR + 1}`;
    const rangeStr = a === b ? a : `${a}:${b}`;
    return {
      kind: 'sheet',
      summary: count === 0 ? `${rangeStr} (빈 셀)` : `${rangeStr} (${count}개 셀)`,
      fullText: csv,
    };
  }, [selBounds, cells, displayValues]);
  const ai = useAiSidebar('sheet', getAiContext, { persistKey: node?.id });

  /** 선택 영역 통계 — 엑셀 상태표시줄과 동일 (Sum/Avg/Count/Min/Max) */
  const selectionStats = useMemo(
    () => computeSelectionStats(selBounds, cells, displayValues),
    [selBounds, cells, displayValues],
  );

  const fmtStatNum = formatStatNumber;

  // ─── 영구 embed 차트 ───
  const addEmbeddedChart = useCallback((c: Omit<EmbeddedChart, 'id'>) => {
    const id = newId('ch');
    const next = [...embeddedCharts, { ...c, id }];
    const nextAll: AllEmbeddedCharts = { ...allEmbeddedCharts, [currentSheetId]: next };
    setAllEmbeddedCharts(nextAll);
    queueSave({ allEmbeddedCharts: nextAll });
    toast({ title: '차트 추가됨', description: '시트 아래에 표시됩니다.' });
  }, [embeddedCharts, allEmbeddedCharts, currentSheetId, queueSave]);

  const removeEmbeddedChart = useCallback((id: string) => {
    const next = embeddedCharts.filter((c) => c.id !== id);
    const nextAll: AllEmbeddedCharts = { ...allEmbeddedCharts, [currentSheetId]: next };
    setAllEmbeddedCharts(nextAll);
    queueSave({ allEmbeddedCharts: nextAll });
  }, [embeddedCharts, allEmbeddedCharts, currentSheetId, queueSave]);

  const moveEmbeddedChart = useCallback((id: string, dir: -1 | 1) => {
    const idx = embeddedCharts.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const target = idx + dir;
    if (target < 0 || target >= embeddedCharts.length) return;
    const next = [...embeddedCharts];
    [next[idx], next[target]] = [next[target], next[idx]];
    const nextAll: AllEmbeddedCharts = { ...allEmbeddedCharts, [currentSheetId]: next };
    setAllEmbeddedCharts(nextAll);
    queueSave({ allEmbeddedCharts: nextAll });
  }, [embeddedCharts, allEmbeddedCharts, currentSheetId, queueSave]);

  const updateEmbeddedChart = useCallback((id: string, patch: Partial<EmbeddedChart>) => {
    const next = embeddedCharts.map((c) => (c.id === id ? { ...c, ...patch } : c));
    const nextAll: AllEmbeddedCharts = { ...allEmbeddedCharts, [currentSheetId]: next };
    setAllEmbeddedCharts(nextAll);
    queueSave({ allEmbeddedCharts: nextAll });
  }, [embeddedCharts, allEmbeddedCharts, currentSheetId, queueSave]);

  // ─── Named Range ───
  const addNamedRange = useCallback((name: string, rangeStr: string) => {
    const next = { ...namedRanges, [name]: rangeStr };
    setNamedRanges(next);
    queueSave({ namedRanges: next });
    toast({ title: `'${name}' 정의됨`, description: rangeStr });
  }, [namedRanges, queueSave]);

  const removeNamedRange = useCallback((name: string) => {
    const next = { ...namedRanges };
    delete next[name];
    setNamedRanges(next);
    queueSave({ namedRanges: next });
  }, [namedRanges, queueSave]);

  const [nameRangeModalOpen, setNameRangeModalOpen] = useState(false);

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
        // ExcelJS 로 추출된 서식·열너비·행높이·freeze 도 함께 반영 (PR #2/5 — Import 정확도).
        const newMetas: SheetMeta[] = [];
        const newAllCells: AllCells = { ...allCells };
        const newAllFormats: AllFormats = { ...allFormats };
        const newAllMerges: AllMerges = { ...allMerges };
        // 첫 import 된 시트의 col/row/freeze 만 전체 그리드에 반영 (단일 그리드 한계 — v1).
        let importedColWidths: Record<number, number> | undefined;
        let importedRowHeights: Record<number, number> | undefined;
        let importedFreezeRows: number | undefined;
        let importedFreezeCols: number | undefined;
        let preservedCount = 0;
        for (const sheet of imported) {
          const id = newId('s');
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
          newAllFormats[id] = sheet.cellFormats ?? {};
          newAllMerges[id] = sheet.merges ?? [];
          if (sheet.cellFormats && Object.keys(sheet.cellFormats).length > 0) preservedCount++;
          if (!importedColWidths && sheet.colWidths) importedColWidths = sheet.colWidths;
          if (!importedRowHeights && sheet.rowHeights) importedRowHeights = sheet.rowHeights;
          if (importedFreezeRows === undefined && sheet.freezeRows) importedFreezeRows = sheet.freezeRows;
          if (importedFreezeCols === undefined && sheet.freezeCols) importedFreezeCols = sheet.freezeCols;
        }
        const nextSheets = [...sheetsMeta, ...newMetas];
        setSheetsMeta(nextSheets);
        setAllCells(newAllCells);
        setAllFormats(newAllFormats);
        setAllMerges(newAllMerges);
        if (importedColWidths) setColWidths((cur) => ({ ...cur, ...importedColWidths }));
        if (importedRowHeights) setRowHeights((cur) => ({ ...cur, ...importedRowHeights }));
        if (importedFreezeRows !== undefined) setFreezeRows(importedFreezeRows);
        if (importedFreezeCols !== undefined) setFreezeCols(importedFreezeCols);
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
        const parts: string[] = [`${imported.length}개 시트`];
        if (preservedCount > 0) parts.push(`서식 ${preservedCount}개 시트 보존`);
        if (importedColWidths || importedRowHeights) parts.push('행/열 크기 적용');
        if (importedFreezeRows || importedFreezeCols) parts.push('freeze 적용');
        toast({
          title: '가져오기 완료',
          description: parts.join(' · '),
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

  /** 현재 시트만 CSV 다운로드 — 서식·병합·다른 시트 손실 (UTF-8 BOM 포함, Excel 한글 호환). */
  const exportCsv = useCallback(() => {
    try {
      const csv = cellsToCsv(cells, { displayValues });
      if (!csv) {
        toast({ title: '빈 시트', description: '값이 있는 셀이 없어요.' });
        return;
      }
      const baseName = (node?.name ?? '시트').replace(/[\\/:*?"<>|]/g, '_');
      const sheetSuffix = sheetsMeta.length > 1 ? `_${currentSheetName.replace(/[\\/:*?"<>|]/g, '_')}` : '';
      const fileName = `${baseName}${sheetSuffix}.csv`;
      // UTF-8 BOM (U+FEFF) prepend → Excel 한글 깨짐 방지
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ title: 'CSV 다운로드', description: `${fileName} (현재 시트만)` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'CSV 내보내기 실패', description: msg });
    }
  }, [cells, displayValues, node?.name, sheetsMeta.length, currentSheetName]);

  const duplicateSheet = useCallback((idx: number) => {
    const src = sheetsMeta[idx];
    if (!src) return;
    const id = newId('s');
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

  // ─── Freeze pane 설정 ───
  const applyFreezeRows = useCallback((n: number) => {
    const clamped = Math.max(0, Math.min(20, Math.floor(n)));
    setFreezeRows(clamped);
    queueSave({ freezeRows: clamped });
  }, [queueSave]);
  const applyFreezeCols = useCallback((n: number) => {
    const clamped = Math.max(0, Math.min(10, Math.floor(n)));
    setFreezeCols(clamped);
    queueSave({ freezeCols: clamped });
  }, [queueSave]);

  // 필터 — 토글 + 단일 col 검색어 갱신 + 모두 지우기
  const toggleFilterOn = useCallback(() => {
    setFilterOn((v) => {
      if (v) setFilters({}); // 끄면 검색어도 초기화
      return !v;
    });
  }, []);
  const setColFilter = useCallback((col: number, q: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (q.trim() === '') delete next[col];
      else next[col] = q;
      return next;
    });
  }, []);
  // 통과하는 row 집합 — 모든 활성 필터 col 에 substring 매칭하는 행만
  const visibleRowSet = useMemo<Set<number> | null>(() => {
    if (!filterOn) return null;
    const active = Object.entries(filters)
      .map(([c, q]) => ({ col: Number(c), q: q.toLowerCase().trim() }))
      .filter((f) => f.q !== '');
    if (active.length === 0) return null; // 필터 켜져있지만 검색어 0 → 전부 보이기
    const out = new Set<number>();
    for (let r = 0; r < rowCount; r++) {
      let pass = true;
      for (const f of active) {
        const ref = cellRef(r, f.col);
        const raw = cells[ref];
        const display = raw === undefined
          ? ''
          : raw.startsWith('=') ? (displayValues[ref] ?? '') : raw;
        if (!display.toLowerCase().includes(f.q)) { pass = false; break; }
      }
      if (pass) out.add(r);
    }
    return out;
  }, [filterOn, filters, cells, displayValues, rowCount]);

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

  // ─── 행/열 삽입·삭제 (셀·서식·병합 좌표 이동) — lib/cloudSheet/axisShift 공용 ───

  /** 모든 시트 cells 에 행/열 axis shift + 수식 값 보정 (cross-sheet 포함) */
  const applyAxisShift = useCallback(
    (allCellsIn: AllCells, axis: 'row' | 'col', at: number, delta: number): AllCells => {
      const out: AllCells = {};
      for (const sid of Object.keys(allCellsIn)) {
        const isCurrentSheet = sid === currentSheetId;
        // 위치 이동은 현재 시트만
        const moved = isCurrentSheet
          ? (axis === 'row'
              ? shiftCellsRow(allCellsIn[sid] ?? {}, at, delta)
              : shiftCellsCol(allCellsIn[sid] ?? {}, at, delta))
          : (allCellsIn[sid] ?? {});
        // 수식 값 보정은 모든 시트 (cross-sheet ref 까지)
        out[sid] = shiftFormulasInCells(moved, axis, at, delta, currentSheetName);
      }
      return out;
    },
    [currentSheetId, currentSheetName, shiftCellsRow, shiftCellsCol],
  );

  const insertRow = useCallback((atRow: number) => {
    const nextRowCount = Math.min(MAX_ROWS, rowCount + 1);
    const nextCells = applyAxisShift(allCells, 'row', atRow, +1);
    const nextFormats: AllFormats = { ...allFormats };
    const nextMerges: AllMerges = { ...allMerges };
    for (const sid of Object.keys(allFormats)) {
      nextFormats[sid] = shiftFormatsRow(allFormats[sid] ?? {}, atRow, +1);
    }
    for (const sid of Object.keys(allMerges)) {
      nextMerges[sid] = shiftMergesRow(allMerges[sid] ?? [], atRow, +1);
    }
    // 행 높이도 shift — at 이상은 +1
    const nextHeights: Record<number, number> = {};
    for (const [k, v] of Object.entries(rowHeights)) {
      const r = Number(k);
      const nr = r >= atRow ? r + 1 : r;
      nextHeights[nr] = v;
    }
    setAllCells(nextCells);
    setAllFormats(nextFormats);
    setAllMerges(nextMerges);
    setRowCount(nextRowCount);
    setRowHeights(nextHeights);
    queueSave({ allCells: nextCells, allFormats: nextFormats, allMerges: nextMerges, rowCount: nextRowCount, rowHeights: nextHeights });
  }, [rowCount, allCells, allFormats, allMerges, rowHeights, applyAxisShift, shiftFormatsRow, shiftMergesRow, queueSave]);

  const insertCol = useCallback((atCol: number) => {
    const nextColCount = Math.min(MAX_COLS, colCount + 1);
    const nextCells = applyAxisShift(allCells, 'col', atCol, +1);
    const nextFormats: AllFormats = { ...allFormats };
    const nextMerges: AllMerges = { ...allMerges };
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
  }, [colCount, allCells, allFormats, allMerges, applyAxisShift, shiftFormatsCol, shiftMergesCol, queueSave]);

  const deleteRow = useCallback((atRow: number) => {
    if (rowCount <= MIN_ROWS) {
      toast({ title: `최소 ${MIN_ROWS}행은 유지됩니다` });
      return;
    }
    const nextRowCount = rowCount - 1;
    const nextCells = applyAxisShift(allCells, 'row', atRow, -1);
    const nextFormats: AllFormats = { ...allFormats };
    const nextMerges: AllMerges = { ...allMerges };
    for (const sid of Object.keys(allFormats)) {
      nextFormats[sid] = shiftFormatsRow(allFormats[sid] ?? {}, atRow, -1);
    }
    for (const sid of Object.keys(allMerges)) {
      nextMerges[sid] = shiftMergesRow(allMerges[sid] ?? [], atRow, -1);
    }
    // 행 높이도 shift
    const nextHeights: Record<number, number> = {};
    for (const [k, v] of Object.entries(rowHeights)) {
      const r = Number(k);
      if (r === atRow) continue;
      const nr = r > atRow ? r - 1 : r;
      nextHeights[nr] = v;
    }
    setAllCells(nextCells);
    setAllFormats(nextFormats);
    setAllMerges(nextMerges);
    setRowCount(nextRowCount);
    setRowHeights(nextHeights);
    setSelected((s) => ({ ...s, row: Math.min(s.row, nextRowCount - 1) }));
    queueSave({ allCells: nextCells, allFormats: nextFormats, allMerges: nextMerges, rowCount: nextRowCount, rowHeights: nextHeights });
  }, [rowCount, allCells, allFormats, allMerges, rowHeights, applyAxisShift, shiftFormatsRow, shiftMergesRow, queueSave]);

  const deleteCol = useCallback((atCol: number) => {
    if (colCount <= MIN_COLS) {
      toast({ title: `최소 ${MIN_COLS}열은 유지됩니다` });
      return;
    }
    const nextColCount = colCount - 1;
    const nextCells = applyAxisShift(allCells, 'col', atCol, -1);
    const nextFormats: AllFormats = { ...allFormats };
    const nextMerges: AllMerges = { ...allMerges };
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
  }, [colCount, allCells, allFormats, allMerges, colWidths, applyAxisShift, shiftFormatsCol, shiftMergesCol, queueSave]);

  // ─── 열 너비 / 행 높이 변경 ───
  const setColWidth = useCallback((colIdx: number, w: number) => {
    const clamped = Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, Math.round(w)));
    setColWidths((prev) => {
      if (prev[colIdx] === clamped) return prev;
      const next = { ...prev, [colIdx]: clamped };
      queueSave({ colWidths: next });
      return next;
    });
  }, [queueSave]);

  const setRowHeight = useCallback((rowIdx: number, h: number) => {
    const clamped = Math.max(MIN_ROW_HEIGHT, Math.min(MAX_ROW_HEIGHT, Math.round(h)));
    setRowHeights((prev) => {
      if (prev[rowIdx] === clamped) return prev;
      const next = { ...prev, [rowIdx]: clamped };
      queueSave({ rowHeights: next });
      return next;
    });
  }, [queueSave]);

  /** 빠른 합계 (Σ AutoSum) — 선택 영역의 각 col 바로 아래 셀에 =SUM(범위) 자동 입력.
   *  단일 셀 선택이면: 그 셀 위쪽에 인접한 연속 숫자 구간을 합산. */
  const insertAutoSum = useCallback(() => {
    const nextCells: Cells = { ...cells };
    let changed = 0;
    // 다중 셀 선택: 각 col 의 maxR+1 행에 SUM
    const hasRangeSel = !(selBounds.minR === selBounds.maxR && selBounds.minC === selBounds.maxC);
    if (hasRangeSel) {
      const targetRow = selBounds.maxR + 1;
      if (targetRow >= rowCount) {
        toast({ title: '아래 행이 부족해요', description: '먼저 행을 추가하거나 다른 범위를 선택하세요.' });
        return;
      }
      for (let c = selBounds.minC; c <= selBounds.maxC; c++) {
        const target = cellRef(targetRow, c);
        if (nextCells[target]) continue; // 이미 값 있으면 skip
        const from = cellRef(selBounds.minR, c);
        const to = cellRef(selBounds.maxR, c);
        nextCells[target] = `=SUM(${from}:${to})`;
        changed++;
      }
    } else {
      // 단일 셀: 같은 col 의 위쪽에 인접한 숫자 구간 찾기
      const col = selected.col;
      const row = selected.row;
      let topRow = row - 1;
      while (topRow >= 0) {
        const v = cells[cellRef(topRow, col)] ?? '';
        const n = Number(v.startsWith('=') ? (displayValues[cellRef(topRow, col)] ?? '') : v);
        if (!Number.isFinite(n) || v.trim() === '') break;
        topRow--;
      }
      topRow++; // 첫 숫자 위치
      if (topRow >= row) {
        toast({ title: '위쪽에 합산할 숫자가 없어요' });
        return;
      }
      const from = cellRef(topRow, col);
      const to = cellRef(row - 1, col);
      nextCells[cellRef(row, col)] = `=SUM(${from}:${to})`;
      changed = 1;
    }
    if (changed === 0) {
      toast({ title: '대상 셀이 이미 차 있어요' });
      return;
    }
    const nextAll: AllCells = { ...allCells, [currentSheetId]: nextCells };
    setAllCells(nextAll);
    queueSave({ allCells: nextAll });
    toast({ title: `Σ ${changed}개 셀에 합계 추가됨` });
  }, [selBounds, selected, cells, displayValues, rowCount, allCells, currentSheetId, queueSave]);

  /** 선택 영역 일괄 입력 — focus 셀의 값을 모든 selBounds 셀에 복사 */
  const fillSelectionWithCurrent = useCallback(() => {
    if (selBounds.minR === selBounds.maxR && selBounds.minC === selBounds.maxC) {
      toast({ title: '먼저 범위를 선택하세요', description: 'Shift+화살표 또는 드래그' });
      return;
    }
    const sourceRef = cellRef(selected.row, selected.col);
    const value = cells[sourceRef] ?? '';
    if (value === '') {
      toast({ title: '현재 셀이 비어있어요', description: '값이 있는 셀에서 시도하세요.' });
      return;
    }
    let changed = 0;
    const nextCells: Cells = { ...cells };
    for (let r = selBounds.minR; r <= selBounds.maxR; r++) {
      for (let c = selBounds.minC; c <= selBounds.maxC; c++) {
        const ref = cellRef(r, c);
        if (nextCells[ref] !== value) {
          nextCells[ref] = value;
          changed++;
        }
      }
    }
    if (changed === 0) return;
    const nextAll: AllCells = { ...allCells, [currentSheetId]: nextCells };
    setAllCells(nextAll);
    queueSave({ allCells: nextAll });
    const w = selBounds.maxC - selBounds.minC + 1;
    const h = selBounds.maxR - selBounds.minR + 1;
    toast({ title: `${h}×${w} 셀에 채움`, description: `값: "${value.slice(0, 30)}"` });
  }, [selBounds, selected, cells, allCells, currentSheetId, queueSave]);

  /** 자동 행 높이 — 그 row 의 모든 cells 중 가장 긴 줄수 × 라인 높이 */
  const autoFitRowHeight = useCallback((rowIdx: number) => {
    let maxLines = 1;
    for (let c = 0; c < colCount; c++) {
      const raw = cells[cellRef(rowIdx, c)] ?? '';
      if (!raw) continue;
      const lines = raw.split('\n').length;
      if (lines > maxLines) maxLines = lines;
    }
    // 1줄 ≈ 22px + 6px padding 여유. 기본 28 보다 작으면 기본
    const fit = Math.max(DEFAULT_ROW_HEIGHT, maxLines * 22 + 6);
    setRowHeight(rowIdx, fit);
  }, [colCount, cells, setRowHeight]);

  // ─── 헤더 컨텍스트 메뉴 ───
  const [ctxMenu, setCtxMenu] = useState<
    | { kind: 'row' | 'col'; idx: number; x: number; y: number }
    | null
  >(null);

  // ─── 셀 컨텍스트 메뉴 (헤더와 별도) ───
  const [cellCtxMenu, setCellCtxMenu] = useState<{ row: number; col: number; x: number; y: number } | null>(null);
  const openCellContextMenu = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      e.preventDefault();
      // 선택이 그 셀을 포함하지 않으면 단일 선택으로 변경
      const inSel =
        row >= selBounds.minR && row <= selBounds.maxR
        && col >= selBounds.minC && col <= selBounds.maxC;
      if (!inSel) {
        setRangeAnchor(null);
        setSelected({ row, col });
      }
      setCellCtxMenu({ row, col, x: e.clientX, y: e.clientY });
    },
    [selBounds],
  );

  useEffect(() => {
    if (!cellCtxMenu) return;
    const close = () => setCellCtxMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('blur', close);
    };
  }, [cellCtxMenu]);

  /** 선택 영역 셀 값 + 서식 지우기 */
  const clearSelectionValues = useCallback(() => {
    const nextCells: Cells = { ...cells };
    let changed = false;
    for (let r = selBounds.minR; r <= selBounds.maxR; r++) {
      for (let c = selBounds.minC; c <= selBounds.maxC; c++) {
        const ref = cellRef(r, c);
        if (ref in nextCells) { delete nextCells[ref]; changed = true; }
      }
    }
    if (!changed) return;
    const nextAll: AllCells = { ...allCells, [currentSheetId]: nextCells };
    setAllCells(nextAll);
    queueSave({ allCells: nextAll });
  }, [selBounds, cells, allCells, currentSheetId, queueSave]);

  const clearSelectionFormats = useCallback(() => {
    const nextFormats: CellFormats = { ...cellFormats };
    let changed = false;
    for (let r = selBounds.minR; r <= selBounds.maxR; r++) {
      for (let c = selBounds.minC; c <= selBounds.maxC; c++) {
        const ref = cellRef(r, c);
        if (ref in nextFormats) { delete nextFormats[ref]; changed = true; }
      }
    }
    if (!changed) return;
    const nextAll: AllFormats = { ...allFormats, [currentSheetId]: nextFormats };
    setAllFormats(nextAll);
    queueSave({ allFormats: nextAll });
  }, [selBounds, cellFormats, allFormats, currentSheetId, queueSave]);

  const openHeaderContextMenu = useCallback(
    (kind: 'row' | 'col', idx: number, e: React.MouseEvent) => {
      e.preventDefault();
      setCtxMenu({ kind, idx, x: e.clientX, y: e.clientY });
    },
    [],
  );

  /** 코너 헤더 클릭 → 전체 시트 선택 */
  const selectAllCells = useCallback(() => {
    setRangeAnchor({ row: 0, col: 0 });
    setSelected({ row: rowCount - 1, col: colCount - 1 });
  }, [rowCount, colCount]);

  /** 코너 헤더 더블클릭 → 모든 열 폭 자동 (텍스트 가장 긴 line 기준). */
  const autoFitAllCols = useCallback(() => {
    const next: Record<number, number> = {};
    let touched = 0;
    for (let c = 0; c < colCount; c++) {
      let maxLen = 0;
      for (let r = 0; r < rowCount; r++) {
        const ref = cellRef(r, c);
        const v = (displayValues[ref] ?? cells[ref] ?? '') as string;
        if (!v) continue;
        for (const line of v.split('\n')) {
          if (line.length > maxLen) maxLen = line.length;
        }
      }
      if (maxLen > 0) {
        // 8px/char + 24 padding/sort 핸들 여유. clamp [60, 400].
        next[c] = Math.max(60, Math.min(400, maxLen * 8 + 24));
        touched++;
      }
    }
    setColWidths((cur) => ({ ...cur, ...next }));
    queueSave({ colWidths: { ...colWidths, ...next } });
    toast({ title: `${touched}개 열 폭 자동 조정` });
  }, [colCount, rowCount, cells, displayValues, colWidths, queueSave]);

  /** 헤더 클릭: 그 row/col 전체 선택. Shift 클릭으로 연속 선택. */
  const handleHeaderClick = useCallback(
    (kind: 'row' | 'col', idx: number, e: React.MouseEvent) => {
      if (kind === 'row') {
        // 한 row 전체 (col 0 ~ colCount-1)
        if (e.shiftKey && rangeAnchor) {
          setSelected({ row: idx, col: colCount - 1 });
        } else {
          setRangeAnchor({ row: idx, col: 0 });
          setSelected({ row: idx, col: colCount - 1 });
        }
      } else {
        // 한 col 전체 (row 0 ~ rowCount-1)
        if (e.shiftKey && rangeAnchor) {
          setSelected({ row: rowCount - 1, col: idx });
        } else {
          setRangeAnchor({ row: 0, col: idx });
          setSelected({ row: rowCount - 1, col: idx });
        }
      }
    },
    [rangeAnchor, rowCount, colCount],
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
      else if (e.key === 'Home') {
        // Home = 현재 행의 A 열로. Ctrl+Home = A1.
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          setRangeAnchor(isShift ? (rangeAnchor ?? { ...selected }) : null);
          setSelected({ row: 0, col: 0 });
        } else {
          setRangeAnchor(isShift ? (rangeAnchor ?? { ...selected }) : null);
          setSelected((s) => ({ row: s.row, col: 0 }));
        }
      }
      else if (e.key === 'End') {
        // End = 현재 행의 마지막 데이터 있는 셀 (없으면 그대로).
        // Ctrl+End = 콘텐츠가 있는 마지막 셀 (max row, max col among 데이터 있는 셀).
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          let maxR = 0, maxC = 0;
          for (const ref of Object.keys(cells)) {
            const m = ref.match(/^([A-Z]+)(\d+)$/);
            if (!m) continue;
            const v = cells[ref];
            if (v === undefined || v === '') continue;
            const c = colToIdx(m[1]);
            const r = Number(m[2]) - 1;
            if (r > maxR) maxR = r;
            if (c > maxC) maxC = c;
          }
          setRangeAnchor(isShift ? (rangeAnchor ?? { ...selected }) : null);
          setSelected({ row: maxR, col: maxC });
        } else {
          // 현재 행의 마지막 콘텐츠 있는 셀
          let lastC = selected.col;
          for (let c = colCount - 1; c >= 0; c--) {
            const v = cells[cellRef(selected.row, c)];
            if (v !== undefined && v !== '') { lastC = c; break; }
          }
          setRangeAnchor(isShift ? (rangeAnchor ?? { ...selected }) : null);
          setSelected((s) => ({ row: s.row, col: lastC }));
        }
      }
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
        setFormatPainterSource(null);
      } else if (e.key.length === 1 && !isMod) {
        // 글자 입력 → 단일 셀 모드 + 편집 진입
        e.preventDefault();
        setRangeAnchor(null);
        startEdit(selected.row, selected.col, e.key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, selected, cells, startEdit, setCellValue, selBounds, rowCount, colCount, rangeAnchor]);

  // ─── 마우스 드래그 — 글로벌 pointerup 으로 종료 + 서식 복사 적용 ───
  useEffect(() => {
    if (!draggingRange) return;
    const onUp = () => {
      setDraggingRange(false);
      // 페인터 활성이면 selBounds 에 source format 적용 + 비활성화
      if (formatPainterSource) {
        applyFormatToRange(selBounds, formatPainterSource);
        setFormatPainterSource(null);
      }
    };
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, [draggingRange, formatPainterSource, selBounds, applyFormatToRange]);

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

      // 채우기 방향: 세로 / 가로 / 사각형 (단순)
      // 우선순위: 세로 확장(↓↑)이 더 크면 세로, 그 외 가로
      const downExt = tgt.row > src.maxR;
      const upExt = tgt.row < src.minR;
      const rightExt = tgt.col > src.maxC;
      const leftExt = tgt.col < src.minC;
      const isVertical = (downExt || upExt) && !rightExt && !leftExt;
      const isHorizontal = (rightExt || leftExt) && !downExt && !upExt;
      const srcW = src.maxC - src.minC + 1;
      const srcH = src.maxR - src.minR + 1;
      const nextCells: Cells = { ...cells };
      let changed = false;

      if (isVertical) {
        // 각 col 별로 src 의 같은 col 값 들을 시리즈로 채움
        for (let c = src.minC; c <= src.maxC; c++) {
          const srcVals: string[] = [];
          for (let r = src.minR; r <= src.maxR; r++) {
            srcVals.push(cells[cellRef(r, c)] ?? '');
          }
          if (downExt) {
            for (let r = src.maxR + 1; r <= fillR2; r++) {
              const step = r - src.minR;
              const v = nextSeriesValue(srcVals, step);
              const dst = cellRef(r, c);
              if (v === '') { if (dst in nextCells) { delete nextCells[dst]; changed = true; } }
              else if (nextCells[dst] !== v) { nextCells[dst] = v; changed = true; }
            }
          } else if (upExt) {
            // 위로 확장: src 시리즈를 음수 step 으로 (단, cycle/숫자만 의미 있음)
            for (let r = fillR1; r < src.minR; r++) {
              // 위로는 등차수열만 의미 있음 — diff 반대로
              const nums = srcVals.map((s) => Number(s));
              const allNum = srcVals.every((s) => s.trim() !== '' && Number.isFinite(Number(s)));
              let v: string;
              if (allNum && nums.length >= 2) {
                const diff = nums[1] - nums[0];
                const dist = src.minR - r;
                v = String(nums[0] - diff * dist);
              } else {
                // 그 외: cycle 처럼 (위쪽도 그냥 반복)
                const step = (r - src.minR) % srcVals.length;
                const idx = ((step % srcVals.length) + srcVals.length) % srcVals.length;
                v = srcVals[idx];
              }
              const dst = cellRef(r, c);
              if (v === '') { if (dst in nextCells) { delete nextCells[dst]; changed = true; } }
              else if (nextCells[dst] !== v) { nextCells[dst] = v; changed = true; }
            }
          }
        }
      } else if (isHorizontal) {
        // 각 row 별로 src 의 같은 row 값 들을 시리즈로 채움
        for (let r = src.minR; r <= src.maxR; r++) {
          const srcVals: string[] = [];
          for (let c = src.minC; c <= src.maxC; c++) {
            srcVals.push(cells[cellRef(r, c)] ?? '');
          }
          if (rightExt) {
            for (let c = src.maxC + 1; c <= fillC2; c++) {
              const step = c - src.minC;
              const v = nextSeriesValue(srcVals, step);
              const dst = cellRef(r, c);
              if (v === '') { if (dst in nextCells) { delete nextCells[dst]; changed = true; } }
              else if (nextCells[dst] !== v) { nextCells[dst] = v; changed = true; }
            }
          } else if (leftExt) {
            for (let c = fillC1; c < src.minC; c++) {
              const nums = srcVals.map((s) => Number(s));
              const allNum = srcVals.every((s) => s.trim() !== '' && Number.isFinite(Number(s)));
              let v: string;
              if (allNum && nums.length >= 2) {
                const diff = nums[1] - nums[0];
                const dist = src.minC - c;
                v = String(nums[0] - diff * dist);
              } else {
                const step = (c - src.minC) % srcVals.length;
                const idx = ((step % srcVals.length) + srcVals.length) % srcVals.length;
                v = srcVals[idx];
              }
              const dst = cellRef(r, c);
              if (v === '') { if (dst in nextCells) { delete nextCells[dst]; changed = true; } }
              else if (nextCells[dst] !== v) { nextCells[dst] = v; changed = true; }
            }
          }
        }
      } else {
        // 사각형 확장 — 기존 cycle 동작 (시리즈 감지 X)
        for (let r = fillR1; r <= fillR2; r++) {
          for (let c = fillC1; c <= fillC2; c++) {
            if (r >= src.minR && r <= src.maxR && c >= src.minC && c <= src.maxC) continue;
            const srcR = src.minR + ((r - src.minR) % srcH + srcH) % srcH;
            const srcC = src.minC + ((c - src.minC) % srcW + srcW) % srcW;
            const v = cells[cellRef(srcR, srcC)];
            const dst = cellRef(r, c);
            if (v === undefined) {
              if (dst in nextCells) { delete nextCells[dst]; changed = true; }
            } else {
              if (nextCells[dst] !== v) { nextCells[dst] = v; changed = true; }
            }
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
    // h-screen + overflow-hidden: 본문(시트 그리드) 과 AI 사이드바 스크롤 분리.
    <div className="h-screen overflow-hidden bg-background flex flex-col">
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
            <SaveStateBadge state={saveState} lastSavedAt={lastSavedAt} />
          </span>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="p-2 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="되돌리기"
              title="되돌리기 (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className="p-2 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="다시 실행"
              title="다시 실행 (Ctrl+Y / Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border mx-0.5" />
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="p-2 rounded hover:bg-muted"
              aria-label="단축키 도움말"
              title="단축키 도움말 (?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>
            <AiSidebarToggle open={ai.open} onClick={ai.toggle} />
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
                <DropdownMenuItem onSelect={() => setCondModalOpen(true)}>
                  <Palette className="w-4 h-4 mr-2" />
                  조건부 서식 ({condRules.length})
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setValidationModalOpen(true)}>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  데이터 검증 / 드롭다운 ({validations.length})
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setNameRangeModalOpen(true)}>
                  <Hash className="w-4 h-4 mr-2" />
                  이름 정의 ({Object.keys(namedRanges).length})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => applyFreezeRows(selected.row + 1)}>
                  <span className="w-4 h-4 mr-2 text-xs" aria-hidden>📌</span>
                  현재 행까지 고정 ({selected.row + 1}행)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => applyFreezeCols(selected.col + 1)}>
                  <span className="w-4 h-4 mr-2 text-xs" aria-hidden>📌</span>
                  현재 열까지 고정 ({idxToCol(selected.col)}열)
                </DropdownMenuItem>
                {(freezeRows > 0 || freezeCols > 0) && (
                  <DropdownMenuItem onSelect={() => { applyFreezeRows(0); applyFreezeCols(0); }}>
                    <span className="w-4 h-4 mr-2 text-xs" aria-hidden>✕</span>
                    고정 해제 (현재: {freezeRows}행 × {freezeCols}열)
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={toggleFilterOn}>
                  <span className="w-4 h-4 mr-2 flex items-center justify-center text-xs" aria-hidden>
                    {filterOn ? '☑' : '☐'}
                  </span>
                  필터 {filterOn ? '끄기' : '켜기'}
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
                <DropdownMenuItem onSelect={exportCsv}>
                  <Download className="w-4 h-4 mr-2" />
                  .csv 내보내기 (현재 시트)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { void exportPdf(); }}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF 내보내기 (현재 시트)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 메뉴 바 — Sheets 매칭 (PR #2/9) */}
        <SheetMenuBar
          importXlsx={importXlsx}
          exportXlsx={() => { void exportXlsx(); }}
          exportPdf={() => { void exportPdf(); }}
          print={() => { try { window.print(); } catch { /* silent */ } }}
          undo={undo}
          redo={redo}
          find={() => setSearchOpen('find')}
          replace={() => setSearchOpen('replace')}
          insertRowAbove={() => insertRow(selected.row)}
          insertRowBelow={() => insertRow(selected.row + 1)}
          insertColLeft={() => insertCol(selected.col)}
          insertColRight={() => insertCol(selected.col + 1)}
          insertChart={openChart}
          setZoom={setZoom}
          insertImage={() => {
             
            const url = window.prompt('이미지 URL (https://…)');
            if (!url) return;
            setCellValue(selectedRef, `=IMAGE("${url.replace(/"/g, '""')}")`);
          }}
          insertLink={() => setInsertLinkOpen(true)}
          insertComment={() => setCommentModalOpen(true)}
          insertCheckbox={() => {
            // 선택 영역(또는 단일 셀) 에 checkbox validation 추가.
            // 기존 값이 ''/null 인 셀은 'FALSE' 로 초기화 (false = 빈 셀과 동일 동작이지만 명시적).
            addValidation({
              range: { minR: selBounds.minR, maxR: selBounds.maxR, minC: selBounds.minC, maxC: selBounds.maxC },
              kind: 'checkbox',
              items: ['TRUE', 'FALSE'],
            });
            toast({ title: '체크박스 추가됨', description: '셀 클릭으로 토글, Space 키도 가능.' });
          }}
          toggleBold={() => {
            const c = cellFormats[selectedRef] ?? {};
            setCellFormat(selectedRef, { bold: !c.bold });
          }}
          toggleItalic={() => {
            const c = cellFormats[selectedRef] ?? {};
            setCellFormat(selectedRef, { italic: !c.italic });
          }}
          toggleUnderline={() => {
            const c = cellFormats[selectedRef] ?? {};
            setCellFormat(selectedRef, { underline: !c.underline });
          }}
          toggleStrikethrough={() => {
            const c = cellFormats[selectedRef] ?? {};
            setCellFormat(selectedRef, { strikethrough: !c.strikethrough });
          }}
          clearFormat={() => setCellFormat(selectedRef, {
            bold: undefined, italic: undefined, underline: undefined, strikethrough: undefined,
            textColor: undefined, bgColor: undefined, align: undefined, vAlign: undefined,
            wrap: undefined, fontFamily: undefined, fontSize: undefined,
            numberFmt: undefined, border: undefined,
          })}
          toggleFilter={() => setFilterOn((v) => !v)}
          sortSelectionAsc={() => toast({ title: '선택 영역 정렬', description: '곧 추가됩니다 (PR 후속).' })}
          sortSelectionDesc={() => toast({ title: '선택 영역 정렬', description: '곧 추가됩니다 (PR 후속).' })}
          toggleAiPanel={ai.toggle}
          openShortcutHelp={() => setHelpOpen(true)}
          openFunctionList={() => setHelpOpen(true)}
        />

        {/* 서식 도구바 */}
        <div className="border-t border-border bg-background flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 text-sm">
          {(() => {
            const curFmt = cellFormats[selectedRef] ?? {};
            const cluster = 'inline-flex items-center gap-0.5 shrink-0 rounded-md bg-muted/30 px-1 py-0.5';
            return (
              <>
                {/* 폰트 + 크기 — Sheets/Excel 매칭 */}
                <div className={cluster} role="group" aria-label="폰트">
                  <select
                    value={curFmt.fontFamily ?? ''}
                    onChange={(e) => {
                      const v = e.target.value as FontFamily | '';
                      setCellFormat(selectedRef, { fontFamily: v === '' ? undefined : v });
                    }}
                    className="px-1.5 py-1 text-xs bg-transparent rounded hover:bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer max-w-[110px]"
                    title="폰트"
                    aria-label="폰트"
                  >
                    <option value="">기본</option>
                    {(Object.keys(FONT_FAMILY_LABEL) as FontFamily[]).map((f) => (
                      <option key={f} value={f}>{FONT_FAMILY_LABEL[f]}</option>
                    ))}
                  </select>
                </div>
                <div className={cluster} role="group" aria-label="폰트 크기">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = curFmt.fontSize ?? FONT_SIZE_DEFAULT;
                      const next = Math.max(FONT_SIZE_MIN, cur - 1);
                      setCellFormat(selectedRef, { fontSize: next === FONT_SIZE_DEFAULT ? undefined : next });
                    }}
                    className="p-1 rounded hover:bg-background"
                    title="크기 축소"
                    aria-label="폰트 크기 줄이기"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={FONT_SIZE_MIN}
                    max={FONT_SIZE_MAX}
                    value={curFmt.fontSize ?? FONT_SIZE_DEFAULT}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n)) return;
                      const clamped = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, Math.round(n)));
                      setCellFormat(selectedRef, { fontSize: clamped === FONT_SIZE_DEFAULT ? undefined : clamped });
                    }}
                    className="w-10 text-center text-xs bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-primary/40"
                    title="폰트 크기"
                    aria-label="폰트 크기"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cur = curFmt.fontSize ?? FONT_SIZE_DEFAULT;
                      const next = Math.min(FONT_SIZE_MAX, cur + 1);
                      setCellFormat(selectedRef, { fontSize: next === FONT_SIZE_DEFAULT ? undefined : next });
                    }}
                    className="p-1 rounded hover:bg-background"
                    title="크기 확대"
                    aria-label="폰트 크기 늘리기"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 텍스트 스타일 — B / I / U / S */}
                <div className={cluster} role="group" aria-label="텍스트 스타일">
                  <button
                    type="button"
                    onClick={() => setCellFormat(selectedRef, { bold: !curFmt.bold })}
                    className={cn(
                      'p-1.5 rounded transition-colors hover:bg-background',
                      curFmt.bold && 'bg-background text-foreground shadow-sm',
                    )}
                    title="굵게 (Ctrl+B)"
                    aria-pressed={!!curFmt.bold}
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCellFormat(selectedRef, { italic: !curFmt.italic })}
                    className={cn(
                      'p-1.5 rounded transition-colors hover:bg-background',
                      curFmt.italic && 'bg-background text-foreground shadow-sm',
                    )}
                    title="기울임 (Ctrl+I)"
                    aria-pressed={!!curFmt.italic}
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCellFormat(selectedRef, { underline: !curFmt.underline })}
                    className={cn(
                      'p-1.5 rounded transition-colors hover:bg-background',
                      curFmt.underline && 'bg-background text-foreground shadow-sm',
                    )}
                    title="밑줄 (Ctrl+U)"
                    aria-pressed={!!curFmt.underline}
                  >
                    <UnderlineIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCellFormat(selectedRef, { strikethrough: !curFmt.strikethrough })}
                    className={cn(
                      'p-1.5 rounded transition-colors hover:bg-background',
                      curFmt.strikethrough && 'bg-background text-foreground shadow-sm',
                    )}
                    title="취소선"
                    aria-pressed={!!curFmt.strikethrough}
                  >
                    <Strikethrough className="w-4 h-4" />
                  </button>
                </div>

                {/* 정렬 */}
                <div className={cluster} role="group" aria-label="정렬">
                  <button
                    type="button"
                    onClick={() => setCellFormat(selectedRef, { align: 'left' })}
                    className={cn('p-1.5 rounded hover:bg-background', curFmt.align === 'left' && 'bg-background shadow-sm')}
                    title="왼쪽 정렬"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCellFormat(selectedRef, { align: 'center' })}
                    className={cn('p-1.5 rounded hover:bg-background', curFmt.align === 'center' && 'bg-background shadow-sm')}
                    title="가운데 정렬"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCellFormat(selectedRef, { align: 'right' })}
                    className={cn('p-1.5 rounded hover:bg-background', curFmt.align === 'right' && 'bg-background shadow-sm')}
                    title="오른쪽 정렬"
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 세로 정렬 */}
                <div className={cluster} role="group" aria-label="세로 정렬">
                  <button
                    type="button"
                    onClick={() => setCellFormat(selectedRef, { vAlign: 'top' })}
                    className={cn('p-1.5 rounded hover:bg-background', curFmt.vAlign === 'top' && 'bg-background shadow-sm')}
                    title="위 정렬"
                    aria-pressed={curFmt.vAlign === 'top'}
                  >
                    <AlignStartVertical className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCellFormat(selectedRef, { vAlign: 'middle' })}
                    className={cn('p-1.5 rounded hover:bg-background', curFmt.vAlign === 'middle' && 'bg-background shadow-sm')}
                    title="가운데 정렬 (세로)"
                    aria-pressed={curFmt.vAlign === 'middle'}
                  >
                    <AlignCenterVertical className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCellFormat(selectedRef, { vAlign: 'bottom' })}
                    className={cn('p-1.5 rounded hover:bg-background', curFmt.vAlign === 'bottom' && 'bg-background shadow-sm')}
                    title="아래 정렬"
                    aria-pressed={curFmt.vAlign === 'bottom'}
                  >
                    <AlignEndVertical className="w-4 h-4" />
                  </button>
                </div>

                {/* 줄바꿈 */}
                <div className={cluster} role="group" aria-label="텍스트 줄바꿈">
                  <select
                    value={curFmt.wrap ?? 'overflow'}
                    onChange={(e) => {
                      const v = e.target.value as Wrap;
                      setCellFormat(selectedRef, { wrap: v === 'overflow' ? undefined : v });
                    }}
                    className="px-1.5 py-1 text-xs bg-transparent rounded hover:bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                    title="텍스트 줄바꿈"
                    aria-label="텍스트 줄바꿈"
                  >
                    <option value="overflow">흘러넘침</option>
                    <option value="wrap">줄바꿈</option>
                    <option value="clip">자르기</option>
                  </select>
                </div>

                {/* 색상 */}
                <div className={cluster} role="group" aria-label="색상">
                  <ColorPopover
                    variant="compact"
                    icon={<Palette className="w-3.5 h-3.5 text-muted-foreground" />}
                    value={curFmt.textColor ?? '#222222'}
                    onChange={(c) => setCellFormat(selectedRef, { textColor: c })}
                    title="글자색"
                  />
                  <ColorPopover
                    variant="compact"
                    icon={<Highlighter className="w-3.5 h-3.5 text-muted-foreground" />}
                    value={curFmt.bgColor ?? '#fff59d'}
                    onChange={(c) => setCellFormat(selectedRef, { bgColor: c })}
                    title="배경색"
                    allowTransparent
                  />
                </div>

                {/* 숫자 서식 원터치 (₩ / % / .← / .→) — Sheets 매칭 */}
                <div className={cluster} role="group" aria-label="숫자 서식 원터치">
                  <button
                    type="button"
                    onClick={() => setCellFormat(selectedRef, {
                      numberFmt: curFmt.numberFmt === 'currency-krw' ? undefined : 'currency-krw',
                    })}
                    className={cn(
                      'px-1.5 py-1 text-xs rounded hover:bg-background font-medium',
                      curFmt.numberFmt === 'currency-krw' && 'bg-background shadow-sm',
                    )}
                    title="₩ 통화 (한 번 클릭)"
                    aria-label="통화 (원)"
                    aria-pressed={curFmt.numberFmt === 'currency-krw'}
                  >
                    ₩
                  </button>
                  <button
                    type="button"
                    onClick={() => setCellFormat(selectedRef, {
                      numberFmt: curFmt.numberFmt === 'percent' ? undefined : 'percent',
                    })}
                    className={cn(
                      'px-1.5 py-1 text-xs rounded hover:bg-background font-medium',
                      curFmt.numberFmt === 'percent' && 'bg-background shadow-sm',
                    )}
                    title="퍼센트 (한 번 클릭)"
                    aria-label="퍼센트"
                    aria-pressed={curFmt.numberFmt === 'percent'}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // 자릿수 -1 (integer 미만 X). 통화/%/날짜 토큰이면 일반 자릿수 시퀀스로 전환.
                      const cur = decimalsIndexOf(curFmt.numberFmt);
                      const next = cur >= 0
                        ? Math.max(0, cur - 1)
                        : (curFmt.numberFmt === 'percent' || curFmt.numberFmt === 'currency-krw' || curFmt.numberFmt === 'date'
                          ? Math.min(DECIMAL_SEQUENCE.length - 1, 2) - 1  // 일반 → decimal2 에서 -1 = decimal1
                          : 0);
                      const tok = DECIMAL_SEQUENCE[Math.max(0, next)];
                      setCellFormat(selectedRef, { numberFmt: tok });
                    }}
                    className="px-1.5 py-1 text-xs rounded hover:bg-background font-medium"
                    title="소수 자릿수 줄이기"
                    aria-label="소수 자릿수 줄이기"
                  >
                    .0←
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = decimalsIndexOf(curFmt.numberFmt);
                      const next = cur >= 0
                        ? Math.min(DECIMAL_SEQUENCE.length - 1, cur + 1)
                        : 2; // 통화/%/날짜/없음 → decimal2 로 시작
                      const tok = DECIMAL_SEQUENCE[next];
                      setCellFormat(selectedRef, { numberFmt: tok });
                    }}
                    className="px-1.5 py-1 text-xs rounded hover:bg-background font-medium"
                    title="소수 자릿수 늘리기"
                    aria-label="소수 자릿수 늘리기"
                  >
                    .0→
                  </button>
                </div>

                {/* 숫자/테두리 */}
                <div className={cluster} role="group" aria-label="숫자 형식 및 테두리">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground ml-0.5" aria-hidden />
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
                </div>

                {/* 병합 */}
                <div className={cluster} role="group" aria-label="셀 병합">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="p-1.5 rounded hover:bg-background flex items-center gap-0.5"
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
                </div>

                {/* 도구 (코멘트·일괄·합계·지우기) */}
                <div className={cluster} role="group" aria-label="데이터 도구">
                  <button
                    type="button"
                    onClick={() => setCommentModalOpen(true)}
                    className={cn(
                      'p-1.5 rounded hover:bg-background',
                      comments[selectedRef] && 'bg-background text-foreground shadow-sm',
                    )}
                    title={comments[selectedRef]
                      ? `코멘트 편집: ${comments[selectedRef].slice(0, 40)}`
                      : '코멘트 추가'}
                    aria-label="셀 코멘트"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  {hasRange && (
                    <button
                      type="button"
                      onClick={fillSelectionWithCurrent}
                      className="p-1.5 rounded hover:bg-background"
                      title="현재 셀 값을 선택 영역에 일괄 입력"
                      aria-label="선택 영역 일괄 입력"
                    >
                      <CopyIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={insertAutoSum}
                    className="p-1.5 rounded hover:bg-background font-bold"
                    title={hasRange
                      ? '선택 영역 각 열의 아래 셀에 =SUM 자동 입력'
                      : '위쪽 인접 숫자 구간을 합산해 현재 셀에 =SUM 입력'}
                    aria-label="빠른 합계"
                  >
                    Σ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (formatPainterSource) {
                        // 토글 해제
                        setFormatPainterSource(null);
                      } else {
                        // 현재 셀의 format 을 source 로 저장
                        const src = cellFormats[selectedRef] ?? {};
                        setFormatPainterSource({ ...src });
                      }
                    }}
                    className={cn(
                      'p-1.5 rounded hover:bg-background',
                      formatPainterSource && 'bg-background text-foreground shadow-sm ring-1 ring-foreground/40',
                    )}
                    title={formatPainterSource
                      ? '서식 복사 활성 — 적용할 셀/영역 클릭 (Esc 취소)'
                      : '서식 복사: 현재 셀의 서식을 다른 셀에 붙이기'}
                    aria-pressed={!!formatPainterSource}
                  >
                    <Paintbrush className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => clearCellFormat(selectedRef)}
                    className="p-1.5 rounded hover:bg-background text-muted-foreground"
                    title="서식 지우기"
                  >
                    <Eraser className="w-4 h-4" />
                  </button>
                </div>

                {/* 인쇄 + 차트 삽입 + 줌 — Sheets 매칭 (PR #4/9) */}
                <div className={cluster} role="group" aria-label="페이지 도구">
                  <button
                    type="button"
                    onClick={() => { try { window.print(); } catch { /* silent */ } }}
                    className="p-1.5 rounded hover:bg-background"
                    title="인쇄 (Ctrl+P)"
                    aria-label="인쇄"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={openChart}
                    className="p-1.5 rounded hover:bg-background"
                    title="차트 삽입 (영역 선택 후)"
                    aria-label="차트 삽입"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                  <div className="inline-flex items-center ml-1">
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(25, z - 25))}
                      className="p-1 rounded hover:bg-background text-xs"
                      title="줌 축소"
                      aria-label="줌 축소"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <select
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="px-1.5 py-1 text-xs bg-transparent rounded hover:bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer tabular-nums"
                      title="줌"
                      aria-label="줌"
                    >
                      {[25, 50, 75, 100, 125, 150, 175, 200].map((z) => (
                        <option key={z} value={z}>{z}%</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(200, z + 25))}
                      className="p-1 rounded hover:bg-background text-xs"
                      title="줌 확대"
                      aria-label="줌 확대"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* 수식 표시줄: Name Box (cell ref jump) + 원본 raw 값 */}
        <div className="border-t border-border bg-muted/20 flex items-center gap-2 px-3 py-1.5 text-xs">
          <NameBox
            currentRef={selectedRef}
            rowCount={rowCount}
            colCount={colCount}
            namedRanges={namedRanges}
            onJump={(target) => {
              setRangeAnchor(target.anchor);
              setSelected(target.focus);
              // 화면 안으로 스크롤
              setTimeout(() => {
                const ref = cellRef(target.focus.row, target.focus.col);
                const cell = gridRef.current?.querySelector(`[data-cell-ref="${ref}"]`) as HTMLElement | null;
                cell?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
              }, 0);
            }}
          />
          <span className="text-muted-foreground select-none">fx</span>
          <FormulaBarInput
            currentRef={selectedRef}
            value={cells[selectedRef] ?? ''}
            evaluatedValue={displayValues[selectedRef] ?? ''}
            onCommit={(v) => setCellValue(selectedRef, v)}
          />
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

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
      <main className="flex-1 overflow-auto">
        {/* zoom 적용 — CSS zoom property (Chromium/Safari/Edge 지원 — 우리 주 타겟).
            Firefox 는 미지원 (1.0 으로 고정 — 사용자에게 시각 영향 없음). */}
        <div
          ref={gridRef}
          className={cn(formatPainterSource && 'cursor-copy')}
          style={zoom !== 100 ? { zoom: `${zoom}%` } as React.CSSProperties : undefined}
        >
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
            rowHeights={rowHeights}
            onColResize={setColWidth}
            onRowResize={setRowHeight}
            onRowAutoFit={autoFitRowHeight}
            onHeaderClick={handleHeaderClick}
            onHeaderContextMenu={openHeaderContextMenu}
            onCellContextMenu={openCellContextMenu}
            onSelectAll={selectAllCells}
            onAutoFitAllCols={autoFitAllCols}
            matchedRefs={searchMatchSet}
            currentMatchRef={searchMatches[searchCursor]}
            freezeRows={freezeRows}
            freezeCols={freezeCols}
            condFormatMap={condFormatMap}
            validationItemsMap={validationItemsMap}
            checkboxRefSet={checkboxRefSet}
            invalidRefSet={invalidRefSet}
            onCellValueChange={setCellValue}
            commentMap={commentMap}
            filterOn={filterOn}
            filters={filters}
            onFilterChange={setColFilter}
            visibleRowSet={visibleRowSet}
            fillPreview={fillPreview}
            fillCorner={{ row: selBounds.maxR, col: selBounds.maxC }}
            onFillStart={startFill}
            editing={editing}
            editingValue={editingValue}
            autocomplete={autocomplete}
            formulaRefHighlights={formulaRefHighlights}
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
            {filterOn && visibleRowSet && (
              <span className="ml-2 text-amber-700 dark:text-amber-300">
                · 필터 적용: {visibleRowSet.size}행 표시
              </span>
            )}
            <span className="opacity-60"> · 헤더 우클릭 → 삽입/삭제 · 열 가장자리 드래그 → 너비</span>
          </span>
        </div>

        {/* 영구 embed 차트 — 시트 아래에 카드 형식, 데이터 자동 갱신 */}
        {embeddedCharts.length > 0 && (
          <div className="px-3 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-3">
            {embeddedCharts.map((c, idx) => (
              <EmbeddedChartCard
                key={c.id}
                chart={c}
                cells={cells}
                onRemove={() => removeEmbeddedChart(c.id)}
                onMovePrev={idx > 0 ? () => moveEmbeddedChart(c.id, -1) : undefined}
                onMoveNext={idx < embeddedCharts.length - 1 ? () => moveEmbeddedChart(c.id, +1) : undefined}
                onChangePalette={(palette) => updateEmbeddedChart(c.id, { palette })}
                onChangeTitle={(title) => updateEmbeddedChart(c.id, { title: title || undefined })}
                onChangeType={(type) => updateEmbeddedChart(c.id, { type })}
                onChangeOrientation={(orientation) => updateEmbeddedChart(c.id, { orientation })}
                onToggleCollapsed={() => updateEmbeddedChart(c.id, { collapsed: !c.collapsed })}
              />
            ))}
          </div>
        )}
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

      {/* 셀 우클릭 컨텍스트 메뉴 */}
      {cellCtxMenu && (() => {
        const refStr = cellRef(cellCtxMenu.row, cellCtxMenu.col);
        const refRange = hasRange
          ? `${cellRef(selBounds.minR, selBounds.minC)}:${cellRef(selBounds.maxR, selBounds.maxC)}`
          : refStr;
        return (
        <div
          className="fixed z-50 rounded border border-border bg-popover shadow-md text-sm min-w-[180px] py-1"
          style={{ left: cellCtxMenu.x, top: cellCtxMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 상단 ref 표시 + 클릭으로 클립보드 복사 */}
          <button
            type="button"
            className="w-full text-left px-3 py-1 hover:bg-muted text-[10px] text-muted-foreground border-b border-border flex items-center justify-between gap-2"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(refRange);
                toast({ title: '셀 참조 복사됨', description: refRange });
              } catch { /* noop */ }
              setCellCtxMenu(null);
            }}
            title="클릭으로 클립보드 복사"
          >
            <span className="font-mono">{refRange}</span>
            <span className="opacity-60">📋</span>
          </button>
          <button type="button" className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
            onClick={() => { void copyRange(); setCellCtxMenu(null); }}>
            <CopyIcon className="w-3.5 h-3.5" /> 복사
          </button>
          <button type="button" className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
            onClick={() => { void cutRange(); setCellCtxMenu(null); }}>
            <Eraser className="w-3.5 h-3.5" /> 잘라내기
          </button>
          <button type="button" className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
            onClick={() => { void pasteFromClipboard(); setCellCtxMenu(null); }}>
            <span className="w-3.5 h-3.5 inline-flex items-center justify-center text-[10px]" aria-hidden>📋</span>
            붙여넣기
          </button>
          {hasRange && (
            <button type="button" className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
              onClick={() => { fillSelectionWithCurrent(); setCellCtxMenu(null); }}>
              <CopyIcon className="w-3.5 h-3.5" /> 선택 영역에 같은 값 채우기
            </button>
          )}
          <div className="h-px bg-border my-1" />
          <button type="button" className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
            onClick={() => { insertRow(cellCtxMenu.row); setCellCtxMenu(null); }}>
            <span className="w-3.5 h-3.5 inline-flex items-center justify-center" aria-hidden>↑+</span>
            위에 행 삽입
          </button>
          <button type="button" className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
            onClick={() => { insertCol(cellCtxMenu.col); setCellCtxMenu(null); }}>
            <span className="w-3.5 h-3.5 inline-flex items-center justify-center" aria-hidden>←+</span>
            왼쪽에 열 삽입
          </button>
          <button type="button" className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-destructive"
            onClick={() => { deleteRow(cellCtxMenu.row); setCellCtxMenu(null); }}>
            <span className="w-3.5 h-3.5 inline-flex items-center justify-center" aria-hidden>−</span>
            이 행 삭제 ({cellCtxMenu.row + 1})
          </button>
          <button type="button" className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-destructive"
            onClick={() => { deleteCol(cellCtxMenu.col); setCellCtxMenu(null); }}>
            <span className="w-3.5 h-3.5 inline-flex items-center justify-center" aria-hidden>−</span>
            이 열 삭제 ({idxToCol(cellCtxMenu.col)})
          </button>
          <div className="h-px bg-border my-1" />
          <button type="button" className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
            onClick={() => { sortByColumn(cellCtxMenu.col, 'asc'); setCellCtxMenu(null); }}>
            <ChevronUp className="w-3.5 h-3.5" />
            이 열 오름차순 정렬 ({idxToCol(cellCtxMenu.col)})
          </button>
          <button type="button" className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
            onClick={() => { sortByColumn(cellCtxMenu.col, 'desc'); setCellCtxMenu(null); }}>
            <ChevronDown className="w-3.5 h-3.5" />
            이 열 내림차순 정렬 ({idxToCol(cellCtxMenu.col)})
          </button>
          <div className="h-px bg-border my-1" />
          <div className="px-3 py-1.5">
            <div className="text-[10px] text-muted-foreground mb-1">빠른 색 (선택 영역)</div>
            <div className="flex items-center gap-1 mb-1">
              <Palette className="w-3 h-3 text-muted-foreground shrink-0" aria-hidden />
              {['#111827', '#EF4444', '#F59E0B', '#22C55E', '#0EA5E9', '#A855F7', '#EC4899'].map((c) => (
                <button
                  key={`t-${c}`}
                  type="button"
                  onClick={() => { patchFormatInRange(selBounds, { textColor: c }); setCellCtxMenu(null); }}
                  className="w-4 h-4 rounded-sm border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  title={`글자색 ${c}`}
                  aria-label={`글자색 ${c}`}
                />
              ))}
              <button
                type="button"
                onClick={() => { patchFormatInRange(selBounds, { textColor: undefined }); setCellCtxMenu(null); }}
                className="w-4 h-4 rounded-sm border border-border hover:bg-muted flex items-center justify-center"
                title="글자색 제거"
                aria-label="글자색 제거"
              >
                <span className="text-[8px] text-muted-foreground">×</span>
              </button>
            </div>
            <div className="flex items-center gap-1">
              <Highlighter className="w-3 h-3 text-muted-foreground shrink-0" aria-hidden />
              {['#FEE2E2', '#FED7AA', '#FEF3C7', '#DCFCE7', '#DBEAFE', '#F3E8FF', '#FCE7F3'].map((c) => (
                <button
                  key={`b-${c}`}
                  type="button"
                  onClick={() => { patchFormatInRange(selBounds, { bgColor: c }); setCellCtxMenu(null); }}
                  className="w-4 h-4 rounded-sm border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  title={`배경색 ${c}`}
                  aria-label={`배경색 ${c}`}
                />
              ))}
              <button
                type="button"
                onClick={() => { patchFormatInRange(selBounds, { bgColor: undefined }); setCellCtxMenu(null); }}
                className="w-4 h-4 rounded-sm border border-border hover:bg-muted flex items-center justify-center"
                title="배경색 제거"
                aria-label="배경색 제거"
              >
                <span className="text-[8px] text-muted-foreground">×</span>
              </button>
            </div>
          </div>
          <div className="h-px bg-border my-1" />
          <button type="button" className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-destructive"
            onClick={() => { clearSelectionValues(); setCellCtxMenu(null); }}>
            <TrashIcon className="w-3.5 h-3.5" /> 값 지우기
          </button>
          <button type="button" className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2"
            onClick={() => { clearSelectionFormats(); setCellCtxMenu(null); }}>
            <Eraser className="w-3.5 h-3.5" /> 서식 지우기
          </button>
          <div className="h-px bg-border my-1" />
          <div className="px-3 py-1">
            <div className="text-[10px] text-muted-foreground mb-1">텍스트 변환 (선택 영역)</div>
            <div className="flex items-center gap-1">
              {([
                { label: 'A↑', title: '대문자', fn: (v: string) => v.toUpperCase() },
                { label: 'a↓', title: '소문자', fn: (v: string) => v.toLowerCase() },
                { label: '⌽', title: '앞뒤 공백 제거 (Trim)', fn: (v: string) => v.trim() },
              ]).map(({ label, title, fn }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => {
                    // 선택 영역의 raw 값 중 수식이 아닌 값만 변환
                    setAllCells((all) => {
                      const cur = { ...(all[currentSheetId] ?? {}) };
                      for (let r = selBounds.minR; r <= selBounds.maxR; r++) {
                        for (let c = selBounds.minC; c <= selBounds.maxC; c++) {
                          const ref = cellRef(r, c);
                          const v = cur[ref];
                          if (v == null || v === '' || v.startsWith('=')) continue;
                          const next = fn(v);
                          if (next === v) continue;
                          if (next === '') delete cur[ref];
                          else cur[ref] = next;
                        }
                      }
                      const nextAll: AllCells = { ...all, [currentSheetId]: cur };
                      queueSave({ allCells: nextAll });
                      return nextAll;
                    });
                    setCellCtxMenu(null);
                  }}
                  className="text-xs px-2 py-1 rounded border border-border hover:bg-muted"
                  title={`${title} (수식 셀 제외)`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        );
      })()}

      {/* 하단 시트 탭 */}
      <footer className="border-t border-border bg-muted/20 flex items-center gap-1 px-3 py-1.5 overflow-x-auto text-sm">
        {sheetsMeta.map((s, i) => (
          <SheetTab
            key={s.id}
            name={s.name}
            color={s.color}
            active={i === currentSheetIdx}
            onClick={() => switchSheet(i)}
            onRename={(n) => renameSheet(i, n)}
            onColorChange={(c) => setSheetColor(i, c)}
            onDuplicate={() => duplicateSheet(i)}
            onRemove={() => removeSheet(i)}
            onMoveLeft={() => moveSheet(i, i - 1)}
            onMoveRight={() => moveSheet(i, i + 1)}
            canMoveLeft={i > 0}
            canMoveRight={i < sheetsMeta.length - 1}
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
        {/* 선택 영역 통계 — 엑셀 status bar */}
        <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          {selectionStats.numCount > 0 && (
            <>
              <span title="합계">∑ {fmtStatNum(selectionStats.sum!)}</span>
              <span title="평균">avg {fmtStatNum(selectionStats.avg!)}</span>
              <span title="최소">min {fmtStatNum(selectionStats.min!)}</span>
              <span title="최대">max {fmtStatNum(selectionStats.max!)}</span>
              <span title="숫자 셀 개수">n {selectionStats.numCount}</span>
              <span className="w-px h-3 bg-border" aria-hidden />
            </>
          )}
          {selectionStats.count > 0 && (
            <>
              <span title="값이 있는 셀 개수">count {selectionStats.count}</span>
              <span className="w-px h-3 bg-border" aria-hidden />
            </>
          )}
          <span>
            {currentSheetIdx + 1} / {sheetsMeta.length}
          </span>
        </span>
      </footer>
        </div>
        <AiSidebar
          open={ai.open}
          onClose={() => ai.setOpen(false)}
          context={getAiContext()}
          messages={ai.messages}
          sending={ai.sending}
          onSend={ai.send}
          onClear={ai.clear}
        />
      </div>

      <SheetHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* 링크 삽입 모달 (PR #6) */}
      <InsertLinkDialog
        open={insertLinkOpen}
        onClose={() => setInsertLinkOpen(false)}
        onSubmit={(url, label) => {
          // Excel/Sheets escape — 큰따옴표 = "" 로 이스케이프해서 셀에 삽입.
          const eUrl = url.replace(/"/g, '""');
          const eLabel = label.replace(/"/g, '""');
          const formula = label
            ? `=HYPERLINK("${eUrl}", "${eLabel}")`
            : `=HYPERLINK("${eUrl}")`;
          setCellValue(selectedRef, formula);
        }}
      />

      <ChartModal
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        cells={cells}
        range={selBounds}
        onEmbed={(c) => {
          addEmbeddedChart(c);
          setChartOpen(false);
        }}
      />

      <CondFormatModal
        open={condModalOpen}
        onClose={() => setCondModalOpen(false)}
        currentRange={selBounds}
        rules={condRules}
        onAdd={addCondRule}
        onRemove={removeCondRule}
      />

      <ValidationModal
        open={validationModalOpen}
        onClose={() => setValidationModalOpen(false)}
        currentRange={selBounds}
        rules={validations}
        onAdd={addValidation}
        onRemove={removeValidation}
      />

      <CommentModal
        open={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        cellRefStr={selectedRef}
        initialText={comments[selectedRef] ?? ''}
        onSave={(text) => setCellComment(selectedRef, text)}
      />

      <NamedRangeModal
        open={nameRangeModalOpen}
        onClose={() => setNameRangeModalOpen(false)}
        currentRange={selBounds}
        currentSheetName={currentSheetName}
        namedRanges={namedRanges}
        onAdd={addNamedRange}
        onRemove={removeNamedRange}
      />

      {/* AI 결과 모달 */}
      <AiResultModal result={aiResult} onClose={() => setAiResult(null)} />
    </div>
  );
}


// SheetGrid / SheetCell 은 lib/cloudSheet/* 공용

// ValidationDropdown 은 lib/cloudSheet/ValidationDropdown 공용

// ─────────────────────────────────────────────
// NameBox 는 lib/cloudSheet/NameBox 공용

// ─────────────────────────────────────────────
// 열 너비 드래그 핸들 (헤더 오른쪽 가장자리)
// ─────────────────────────────────────────────

// ColResizeHandle / RowResizeHandle 은 lib/cloudSheet/ResizeHandles 공용

// ─────────────────────────────────────────────
// 시트 탭
// ─────────────────────────────────────────────

// SheetTab 은 lib/cloudSheet/SheetTab 공용

// ─────────────────────────────────────────────
// 수식 함수 popover — 시그니처 hint + prefix 매치 후보 리스트
// ─────────────────────────────────────────────

// FuncHintPopover / getFuncSuggestionNames / applyFuncSuggestion 는 lib/cloudSheet/FuncHintPopover 공용
// FormulaBarInput 은 lib/cloudSheet/FormulaBarInput 공용

// SaveStateBadge / formatRelTime 는 lib/cloudDoc/SaveStateBadge 공용

// ─────────────────────────────────────────────
// 단축키 도움말
// ─────────────────────────────────────────────

// SheetHelpModal + FUNC_CATEGORIES 는 lib/cloudSheet/SheetHelpModal 공용

// HelpRow 는 lib/cloudCommon/HelpRow 공용

// EmbeddedChartCard 는 lib/cloudSheet/EmbeddedChartCard 공용

// ChartModal / ChartTypeBtn 는 lib/cloudSheet/ChartModal 공용

// SheetSearchPanel 은 lib/cloudSheet/SheetSearchPanel 공용

// CondFormatModal 은 lib/cloudSheet/CondFormatModal 공용

// ValidationModal 은 lib/cloudSheet/ValidationModal 공용

// CommentModal 은 lib/cloudSheet/CommentModal 공용

// NamedRangeModal 은 lib/cloudSheet/NamedRangeModal 공용
