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
  Plus, Minus, Pencil, Copy as CopyIcon, Trash2 as TrashIcon,
  Upload, Download, Sparkles, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Printer,
  Search as SearchIcon, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Replace as ReplaceIcon,
  Undo2, Redo2, MessageSquare, ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent,
  ContextMenuItem, ContextMenuSeparator,
  ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent,
} from '@/components/ui/context-menu';
import { ColorPopover } from '@/components/cloud/ColorPopover';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchNode, updateFileBody } from '@/lib/cloudClient';
import { evalCell, idxToCol, colToIdx, FUNC_HELP, IMAGE_SENTINEL, SPARKLINE_SENTINEL, AI_SENTINEL, AI_LOADING_PREFIX, AI_ERROR_PREFIX, SPILL_SENTINEL, LINK_SENTINEL } from '@/lib/cloudSheet/formula';
import { buildSparklineSvg, type SparklinePayload } from '@/lib/cloudSheet/sparkline';
import { AI_CHANGED_EVENT } from '@/lib/cloudSheet/aiCellEval';
import { shiftFormulasInCells } from '@/lib/cloudSheet/formulaShift';
import { importXlsxFile, exportXlsxFile } from '@/lib/cloudSheet/xlsx';
import { cellsToCsv, sheetSummarize, sheetSuggestFormula, sheetExplainSelection } from '@/lib/cloudSheet/ai';
import {
  buildChartData, flattenForPie, CHART_PALETTE, getChartPalette,
  CHART_PALETTES, CHART_PALETTE_LABELS, type SelRange,
  type EmbeddedChart,
} from '@/lib/cloudSheet/chart';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell as RechartsCell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { exportElementToPdf, sanitizeFileName } from '@/lib/cloudCommon/pdfExport';
import { AiSidebar } from '@/components/cloud/AiSidebar';
import { AiSidebarToggle } from '@/components/cloud/AiSidebarToggle';
import { useAiSidebar } from '@/components/cloud/useAiSidebar';
import { SheetMenuBar } from '@/components/cloud/SheetMenuBar';
import { InsertLinkDialog } from '@/components/cloud/InsertLinkDialog';
import type { AiContext } from '@/lib/cloudAi/types';
import type { CloudNode } from '@/types/cloud';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SaveStateBadge, type SaveState } from '@/lib/cloudDoc/SaveStateBadge';
import { HelpRow } from '@/lib/cloudCommon/HelpRow';
import { NameBox } from '@/lib/cloudSheet/NameBox';
import { ColResizeHandle, RowResizeHandle } from '@/lib/cloudSheet/ResizeHandles';
import { ValidationDropdown } from '@/lib/cloudSheet/ValidationDropdown';
import {
  FuncHintPopover, getFuncSuggestionNames, applyFuncSuggestion,
} from '@/lib/cloudSheet/FuncHintPopover';
import { FormulaBarInput } from '@/lib/cloudSheet/FormulaBarInput';
import {
  SheetTab, type SheetTabColor,
  SHEET_TAB_COLOR_LABEL, SHEET_TAB_COLOR_HEX,
} from '@/lib/cloudSheet/SheetTab';
import { SheetHelpModal } from '@/lib/cloudSheet/SheetHelpModal';
import { EmbeddedChartCard } from '@/lib/cloudSheet/EmbeddedChartCard';
import { ChartModal } from '@/lib/cloudSheet/ChartModal';
import { SheetSearchPanel } from '@/lib/cloudSheet/SheetSearchPanel';

type Cells = Record<string, string>;

// SheetTabColor / SHEET_TAB_COLOR_LABEL / SHEET_TAB_COLOR_HEX 는 lib/cloudSheet/SheetTab 공용

interface SheetMeta {
  id: string;
  name: string;
  /** 탭 색상 (PR #7) — 빠른 시각 구분. 미설정 = 기본. */
  color?: SheetTabColor;
}
type AllCells = Record<string, Cells>;
type AllFormats = Record<string, CellFormats>;
interface Merge { minR: number; maxR: number; minC: number; maxC: number }
type AllMerges = Record<string, Merge[]>;

interface Validation {
  id: string;
  range: { minR: number; maxR: number; minC: number; maxC: number };
  kind: 'list' | 'checkbox';
  /** kind='list' 면 사용자 정의 목록, kind='checkbox' 면 항상 ['TRUE','FALSE']. */
  items: string[];
}
type AllValidations = Record<string, Validation[]>;

// sheet 별 ref → 코멘트 텍스트
type Comments = Record<string, string>;
type AllComments = Record<string, Comments>;

// EmbeddedChart 는 lib/cloudSheet/chart 공용
type AllEmbeddedCharts = Record<string, EmbeddedChart[]>;

function newEmbeddedChartId(): string {
  return `ch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function newValidationId(): string {
  return `vd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

type CondOp = '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains' | 'between' | 'empty' | 'nonempty';
interface CondRule {
  id: string;
  range: { minR: number; maxR: number; minC: number; maxC: number };
  op: CondOp;
  value: string;  // op === 'between' 이면 'a,b'
  format: { bgColor?: string; textColor?: string; bold?: boolean };
}
type AllCondRules = Record<string, CondRule[]>;

function newCondRuleId(): string {
  return `cr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** 셀 값이 rule 의 조건을 만족하는지 */
function evalCondRule(value: string, op: CondOp, target: string): boolean {
  if (op === 'empty') return value === '' || value === undefined;
  if (op === 'nonempty') return value !== '' && value !== undefined;
  if (op === 'contains') return value.toLowerCase().includes(target.toLowerCase());
  if (op === 'between') {
    const [a, b] = target.split(',').map((s) => Number(s.trim()));
    const v = Number(value);
    if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(v)) return false;
    return v >= Math.min(a, b) && v <= Math.max(a, b);
  }
  const tn = Number(target);
  const vn = Number(value);
  // 숫자 비교 가능하면 숫자, 아니면 문자열
  if (Number.isFinite(tn) && Number.isFinite(vn) && value.trim() !== '') {
    switch (op) {
      case '>': return vn > tn;
      case '<': return vn < tn;
      case '>=': return vn >= tn;
      case '<=': return vn <= tn;
      case '==': return vn === tn;
      case '!=': return vn !== tn;
    }
  }
  // 문자열 비교
  switch (op) {
    case '==': return value === target;
    case '!=': return value !== target;
    default: return false;
  }
}

function newSheetId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

type NumberFmt = 'currency-krw' | 'percent' | 'integer' | 'decimal1' | 'decimal2' | 'decimal3' | 'decimal4' | 'date';

/** 자릿수 ±1 시 토큰 시퀀스. integer=0자리, decimal4=4자리. 통화/%/날짜는 별도 처리. */
const DECIMAL_SEQUENCE: NumberFmt[] = ['integer', 'decimal1', 'decimal2', 'decimal3', 'decimal4'];

/** 토큰의 자릿수 위치 — 일반 숫자 토큰이면 0~4, 그 외(₩/%/date)면 -1. */
function decimalsIndexOf(fmt: NumberFmt | undefined): number {
  if (!fmt) return -1;
  return DECIMAL_SEQUENCE.indexOf(fmt);
}
type BorderStyle = 'all' | 'outer' | 'top' | 'bottom' | 'left' | 'right';
type FontFamily = 'pretendard' | 'inter' | 'arial' | 'noto-sans' | 'georgia' | 'jetbrains';
type VAlign = 'top' | 'middle' | 'bottom';
type Wrap = 'overflow' | 'wrap' | 'clip';

interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textColor?: string;
  bgColor?: string;
  align?: 'left' | 'center' | 'right';
  vAlign?: VAlign;
  wrap?: Wrap;
  fontFamily?: FontFamily;
  /** 폰트 크기 (px). 8~48. */
  fontSize?: number;
  numberFmt?: NumberFmt;
  border?: BorderStyle;
}
type CellFormats = Record<string, CellFormat>;

const FONT_FAMILY_LABEL: Record<FontFamily, string> = {
  pretendard: 'Pretendard',
  inter: 'Inter',
  arial: 'Arial',
  'noto-sans': 'Noto Sans',
  georgia: 'Georgia',
  jetbrains: 'JetBrains Mono',
};

const FONT_FAMILY_CSS: Record<FontFamily, string> = {
  pretendard: '"Pretendard Variable", Pretendard, system-ui, sans-serif',
  inter: 'Inter, system-ui, sans-serif',
  arial: 'Arial, Helvetica, sans-serif',
  'noto-sans': '"Noto Sans KR", "Noto Sans", sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  jetbrains: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
};

const FONT_SIZE_MIN = 8;
const FONT_SIZE_MAX = 48;
const FONT_SIZE_DEFAULT = 13;

const NUMBER_FMT_OPTIONS: Array<{ value: '' | NumberFmt; label: string; example: string }> = [
  { value: '',              label: '자동',         example: '' },
  { value: 'integer',       label: '정수',         example: '1,234' },
  { value: 'decimal1',      label: '소수 1자리',   example: '1.2' },
  { value: 'decimal2',      label: '소수 2자리',   example: '1.23' },
  { value: 'decimal3',      label: '소수 3자리',   example: '1.234' },
  { value: 'decimal4',      label: '소수 4자리',   example: '1.2345' },
  { value: 'currency-krw',  label: '₩ 통화',       example: '₩1,234' },
  { value: 'percent',       label: '%',            example: '12.3%' },
  { value: 'date',          label: '날짜',         example: '2026-05-16' },
];

function applyNumberFormat(value: string, fmt: NumberFmt | undefined): string {
  if (!fmt) return value;
  const n = Number(value);
  if (!Number.isFinite(n) || value === '') return value;
  switch (fmt) {
    case 'integer':       return Math.round(n).toLocaleString('ko-KR');
    case 'decimal1':      return n.toFixed(1);
    case 'decimal2':      return n.toFixed(2);
    case 'decimal3':      return n.toFixed(3);
    case 'decimal4':      return n.toFixed(4);
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
const DEFAULT_ROW_HEIGHT = 28; // px (기존 h-7)
const MIN_ROW_HEIGHT = 18;
const MAX_ROW_HEIGHT = 200;
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

/** 셀 값이 링크 형식이면 정규화된 URL 반환, 아니면 null.
 *  지원: http(s)://, mailto:, www. (자동으로 https:// 붙임) */
function detectLink(value: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^https?:\/\/[^\s]+$/i.test(trimmed)) return trimmed;
  if (/^mailto:[^\s]+$/i.test(trimmed)) return trimmed;
  if (/^[\w.-]+@[\w.-]+\.[a-z]{2,}$/i.test(trimmed)) return `mailto:${trimmed}`;
  if (/^www\.[^\s]+$/i.test(trimmed)) return `https://${trimmed}`;
  return null;
}

// ─────────────────────────────────────────────
// Fill handle 시리즈 감지
// ─────────────────────────────────────────────

const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const EN_DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EN_DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const KO_MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const EN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EN_MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CYCLE_LISTS = [KO_DAYS, EN_DAYS_SHORT, EN_DAYS_LONG, KO_MONTHS, EN_MONTHS_SHORT, EN_MONTHS_LONG];

/**
 * src 셀 값들로부터 step 째 다음 값을 예측.
 * step = 0 → src[0], step = src.length → 첫 새 항
 *
 * 우선순위:
 *  1) 모두 숫자 + 등차수열 → 산술 시리즈
 *  2) 첫 값이 cycle list 안 → cycle (요일·월명)
 *  3) 텍스트+숫자 끝 패턴 ('1주차' 같은) → 숫자만 증가
 *  4) 그 외 → 단순 cycle (src[step % src.length])
 */
function nextSeriesValue(src: string[], step: number): string {
  if (src.length === 0) return '';
  const idx = ((step % src.length) + src.length) % src.length;
  if (step < src.length && step >= 0) return src[idx];

  // 1) 숫자 등차수열
  const nums = src.map((s) => Number(s));
  const allNum = src.every((s) => s.trim() !== '' && Number.isFinite(Number(s)));
  if (allNum && nums.length >= 2) {
    const diff = nums[1] - nums[0];
    const consistent = nums.every((n, i) => i === 0 || n - nums[i - 1] === diff);
    if (consistent) {
      const value = nums[nums.length - 1] + diff * (step - src.length + 1);
      // 정수 보존
      return Number.isInteger(value) ? String(value) : value.toFixed(2);
    }
  }
  if (allNum && nums.length === 1) {
    // 단일 숫자 → 1씩 증가
    return String(nums[0] + (step - src.length + 1));
  }

  // 2) cycle list
  for (const list of CYCLE_LISTS) {
    const i0 = list.indexOf(src[0]);
    if (i0 === -1) continue;
    // src 가 모두 list 안 연속 항인지
    const matchAll = src.every((s, i) => list[(i0 + i) % list.length] === s);
    if (matchAll) {
      const targetIdx = (i0 + step) % list.length;
      return list[targetIdx];
    }
  }

  // 3) 텍스트+끝숫자 패턴 ('1주차', 'Q1', 'Item5')
  const tailNumRe = /^(.*?)(-?\d+)([^\d]*)$/;
  const matches = src.map((s) => s.match(tailNumRe));
  const allTailNum = matches.every((m) => m !== null);
  if (allTailNum && matches.length >= 1) {
    const heads = matches.map((m) => m![1]);
    const tails = matches.map((m) => m![3]);
    const nums2 = matches.map((m) => Number(m![2]));
    const sameHead = heads.every((h) => h === heads[0]);
    const sameTail = tails.every((t) => t === tails[0]);
    if (sameHead && sameTail) {
      if (nums2.length >= 2) {
        const diff = nums2[1] - nums2[0];
        const consistent = nums2.every((n, i) => i === 0 || n - nums2[i - 1] === diff);
        if (consistent) {
          const next = nums2[nums2.length - 1] + diff * (step - src.length + 1);
          return `${heads[0]}${next}${tails[0]}`;
        }
      } else {
        // 단일: 1씩 증가
        return `${heads[0]}${nums2[0] + (step - src.length + 1)}${tails[0]}`;
      }
    }
  }

  // 4) cycle
  return src[idx];
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

  /** editing 중 수식 입력 시 참조된 셀들을 다른 색으로 outline. ref → 색 매핑.
   *  현재 시트의 단일 셀·범위만 시각화 (다른 시트 ref 는 표시 X). */
  const formulaRefHighlights = useMemo<Map<string, string>>(() => {
    const out = new Map<string, string>();
    if (!editing || !editingValue.startsWith('=')) return out;
    const expr = editingValue.slice(1);
    // 시트 prefix 가 있고 currentSheetName 과 다르면 skip 위해 prefix 추출
    const isOurSheet = (sheetRaw: string | undefined): boolean => {
      if (!sheetRaw) return true;
      const name = sheetRaw.replace(/^'|'$/g, '');
      return name === currentSheetName;
    };
    const palette = CHART_PALETTE;
    let colorIdx = 0;
    const assignColor = (key: string): string => {
      const existing = out.get(key);
      if (existing) return existing;
      const color = palette[colorIdx % palette.length];
      colorIdx++;
      return color;
    };
    // 범위 먼저
    const rangeRe = /(?:('[^']+'|[A-Za-z]\w*)!)?\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)/g;
    let m: RegExpExecArray | null;
    const consumed = new Set<string>();
    while ((m = rangeRe.exec(expr)) !== null) {
      if (!isOurSheet(m[1])) continue;
      const c1 = colToIdx(m[2]);
      const r1 = Number(m[3]) - 1;
      const c2 = colToIdx(m[4]);
      const r2 = Number(m[5]) - 1;
      const minR = Math.min(r1, r2);
      const maxR = Math.max(r1, r2);
      const minC = Math.min(c1, c2);
      const maxC = Math.max(c1, c2);
      const groupKey = `${m[2]}${m[3]}:${m[4]}${m[5]}`;
      const color = assignColor(groupKey);
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const ref = cellRef(r, c);
          out.set(ref, color);
          consumed.add(ref);
        }
      }
    }
    // 단일 셀 (범위 매칭 후 남은 것)
    const singleRe = /(?<![A-Za-z_0-9:$])(?:('[^']+'|[A-Za-z]\w*)!)?\$?([A-Z]+)\$?(\d+)\b(?!:)/g;
    while ((m = singleRe.exec(expr)) !== null) {
      if (!isOurSheet(m[1])) continue;
      const ref = `${m[2]}${m[3]}`;
      if (consumed.has(ref)) continue;
      out.set(ref, assignColor(ref));
    }
    return out;
  }, [editing, editingValue, currentSheetName]);

  /** 자동완성 — editing 중인 셀의 같은 col 에서 prefix 매치되는 첫 값 (대소문자 무시).
   *  editingValue 가 비어있거나 '=' 로 시작 (수식), 또는 매치 없으면 null. */
  const autocomplete = useMemo<string | null>(() => {
    if (!editing) return null;
    const prefix = editingValue;
    if (!prefix || prefix.startsWith('=')) return null;
    const lowerPrefix = prefix.toLowerCase();
    const editingRef = cellRef(editing.row, editing.col);
    // 같은 col 의 모든 행 — 가까운 위쪽 우선
    let best: string | null = null;
    // 위쪽부터 아래쪽으로 검색해 첫 매치 사용
    for (let r = 0; r < rowCount; r++) {
      if (r === editing.row) continue;
      const ref = cellRef(r, editing.col);
      const v = cells[ref];
      if (v === undefined || v === '') continue;
      if (v.startsWith('=')) continue; // 수식 셀의 raw 는 추천 X
      if (v === prefix) continue; // 완전 동일은 추천 X
      if (v.toLowerCase().startsWith(lowerPrefix)) {
        best = v;
        break;
      }
    }
    return best && best !== editingRef ? best : null;
  }, [editing, editingValue, cells, rowCount]);

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
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [id, user, authLoading]);

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
      setLastSavedAt(Date.now());
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
    pendingRef.current = {
      ...pendingRef.current,
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
    };
    setSaveState('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void flushSave(); }, AUTOSAVE_DELAY_MS);
  }, [flushSave, sheetsMeta, allCells, allFormats, allMerges, allCondRules, allValidations, allComments, allEmbeddedCharts, namedRanges, currentSheetIdx, rowCount, colCount, colWidths, rowHeights, freezeRows, freezeCols]);

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

  // ─── Undo / Redo (debounce snapshot) ───
  interface SheetSnapshot {
    allCells: AllCells;
    allFormats: AllFormats;
    allMerges: AllMerges;
    rowCount: number;
    colCount: number;
  }
  const [history, setHistory] = useState<SheetSnapshot[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const isApplyingHistoryRef = useRef(false);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 변경 감지 → 500ms 후 snapshot 저장 (history 끝에 push, future 삭제)
  useEffect(() => {
    // 로드 전(node 없음)이거나 undo/redo 중이면 push X
    if (!node) return;
    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false;
      return;
    }
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = setTimeout(() => {
      setHistory((h) => {
        const snap: SheetSnapshot = {
          allCells, allFormats, allMerges, rowCount, colCount,
        };
        // 첫 snapshot
        if (historyIdx === -1) {
          setHistoryIdx(0);
          return [snap];
        }
        // 현재가 마지막 snapshot 과 같으면 skip
        const last = h[historyIdx];
        if (last
          && last.allCells === snap.allCells
          && last.allFormats === snap.allFormats
          && last.allMerges === snap.allMerges
          && last.rowCount === snap.rowCount
          && last.colCount === snap.colCount) {
          return h;
        }
        const next = h.slice(0, historyIdx + 1);
        next.push(snap);
        // 최대 100 step
        if (next.length > 100) next.shift();
        setHistoryIdx(next.length - 1);
        return next;
      });
    }, 500);
    return () => {
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    };
  }, [node, allCells, allFormats, allMerges, rowCount, colCount, historyIdx]);

  const canUndo = historyIdx > 0;
  const canRedo = historyIdx >= 0 && historyIdx < history.length - 1;

  const applySnapshot = useCallback((snap: SheetSnapshot) => {
    isApplyingHistoryRef.current = true;
    setAllCells(snap.allCells);
    setAllFormats(snap.allFormats);
    setAllMerges(snap.allMerges);
    setRowCount(snap.rowCount);
    setColCount(snap.colCount);
    queueSave({
      allCells: snap.allCells,
      allFormats: snap.allFormats,
      allMerges: snap.allMerges,
      rowCount: snap.rowCount,
      colCount: snap.colCount,
    });
  }, [queueSave]);

  const undo = useCallback(() => {
    if (!canUndo) return;
    const target = history[historyIdx - 1];
    if (!target) return;
    setHistoryIdx(historyIdx - 1);
    applySnapshot(target);
  }, [canUndo, history, historyIdx, applySnapshot]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const target = history[historyIdx + 1];
    if (!target) return;
    setHistoryIdx(historyIdx + 1);
    applySnapshot(target);
  }, [canRedo, history, historyIdx, applySnapshot]);

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
        const d = new Date();
        if (e.shiftKey) {
          // 현재 시각
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          const ss = String(d.getSeconds()).padStart(2, '0');
          setCellValue(selectedRef, `${hh}:${mm}:${ss}`);
        } else {
          // 오늘 날짜
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          setCellValue(selectedRef, `${y}-${m}-${day}`);
        }
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
        setCellFormat(selectedRef, {
          bold: undefined, italic: undefined, underline: undefined, strikethrough: undefined,
          textColor: undefined, bgColor: undefined, align: undefined, vAlign: undefined,
          wrap: undefined, fontFamily: undefined, fontSize: undefined,
          numberFmt: undefined, border: undefined,
        });
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

  /** ref → 조건부 서식 적용 (cells 변경 시만 재계산) */
  const condFormatMap = useMemo<Map<string, CondRule['format']>>(() => {
    const out = new Map<string, CondRule['format']>();
    if (condRules.length === 0) return out;
    for (const rule of condRules) {
      for (let r = rule.range.minR; r <= rule.range.maxR; r++) {
        for (let c = rule.range.minC; c <= rule.range.maxC; c++) {
          const ref = cellRef(r, c);
          const raw = cells[ref] ?? '';
          const display = raw.startsWith('=') ? (displayValues[ref] ?? '') : raw;
          if (evalCondRule(display, rule.op, rule.value)) {
            // 이후 rule 이 이전 rule 을 덮어씀 (마지막 우선)
            const cur = out.get(ref);
            out.set(ref, { ...(cur ?? {}), ...rule.format });
          }
        }
      }
    }
    return out;
  }, [condRules, cells, displayValues]);

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

  /** ref → 허용 items (드롭다운 목록 표시용) — 나중 rule 우선. checkbox 는 별도 처리. */
  const validationItemsMap = useMemo<Map<string, string[]>>(() => {
    const out = new Map<string, string[]>();
    for (const v of validations) {
      if (v.kind === 'checkbox') continue; // 드롭다운 표시 X — 체크박스 위젯으로 따로 렌더
      for (let r = v.range.minR; r <= v.range.maxR; r++) {
        for (let c = v.range.minC; c <= v.range.maxC; c++) {
          out.set(cellRef(r, c), v.items);
        }
      }
    }
    return out;
  }, [validations]);

  /** ref 집합 — 체크박스 위젯으로 표시할 셀. */
  const checkboxRefSet = useMemo<Set<string>>(() => {
    const out = new Set<string>();
    for (const v of validations) {
      if (v.kind !== 'checkbox') continue;
      for (let r = v.range.minR; r <= v.range.maxR; r++) {
        for (let c = v.range.minC; c <= v.range.maxC; c++) {
          out.add(cellRef(r, c));
        }
      }
    }
    return out;
  }, [validations]);

  /** ref → 유효한지 (rule 있고 값이 items 에 없으면 false) */
  const invalidRefSet = useMemo<Set<string>>(() => {
    const out = new Set<string>();
    for (const [ref, items] of validationItemsMap) {
      const raw = cells[ref];
      if (raw === undefined || raw === '') continue; // 빈 셀은 valid
      const display = raw.startsWith('=') ? (displayValues[ref] ?? '') : raw;
      if (!items.includes(display) && !items.includes(raw)) out.add(ref);
    }
    return out;
  }, [validationItemsMap, cells, displayValues]);

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
  const selectionStats = useMemo(() => {
    let count = 0;
    let numCount = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    for (let r = selBounds.minR; r <= selBounds.maxR; r++) {
      for (let c = selBounds.minC; c <= selBounds.maxC; c++) {
        const ref = cellRef(r, c);
        const raw = cells[ref];
        if (raw === undefined || raw === '') continue;
        count++;
        const display = raw.startsWith('=') ? (displayValues[ref] ?? '') : raw;
        const n = Number(display);
        if (Number.isFinite(n) && display.trim() !== '') {
          numCount++;
          sum += n;
          if (n < min) min = n;
          if (n > max) max = n;
        }
      }
    }
    const cellsInSel = (selBounds.maxR - selBounds.minR + 1) * (selBounds.maxC - selBounds.minC + 1);
    return {
      cellsInSel,
      count,
      numCount,
      sum: numCount > 0 ? sum : null,
      avg: numCount > 0 ? sum / numCount : null,
      min: numCount > 0 ? min : null,
      max: numCount > 0 ? max : null,
    };
  }, [selBounds, cells, displayValues]);

  function fmtStatNum(n: number): string {
    if (Number.isInteger(n)) return n.toLocaleString('ko-KR');
    return n.toLocaleString('ko-KR', { maximumFractionDigits: 4 });
  }

  // ─── 영구 embed 차트 ───
  const addEmbeddedChart = useCallback((c: Omit<EmbeddedChart, 'id'>) => {
    const id = newEmbeddedChartId();
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
          const id = newSheetId();
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
  }, [editing, selected, cells, startEdit, setCellValue, selBounds, rowCount, colCount]);

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
      {cellCtxMenu && (
        <div
          className="fixed z-50 rounded border border-border bg-popover shadow-md text-sm min-w-[180px] py-1"
          style={{ left: cellCtxMenu.x, top: cellCtxMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
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
        </div>
      )}

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
  rowHeights: Record<number, number>;
  onColResize: (colIdx: number, newWidth: number) => void;
  onRowResize: (rowIdx: number, newHeight: number) => void;
  onRowAutoFit?: (rowIdx: number) => void;
  onHeaderClick?: (kind: 'row' | 'col', idx: number, e: React.MouseEvent) => void;
  onHeaderContextMenu?: (kind: 'row' | 'col', idx: number, e: React.MouseEvent) => void;
  onCellContextMenu?: (row: number, col: number, e: React.MouseEvent) => void;
  onSelectAll?: () => void;
  matchedRefs?: Set<string>;
  currentMatchRef?: string;
  /** N행 고정 (0=고정X) */
  freezeRows?: number;
  /** N열 고정 (0=고정X) */
  freezeCols?: number;
  /** 조건부 서식 — cellFormats 위에 오버레이 */
  condFormatMap?: Map<string, { bgColor?: string; textColor?: string; bold?: boolean }>;
  /** ref → 허용 items (드롭다운 셀) */
  validationItemsMap?: Map<string, string[]>;
  /** 체크박스 위젯으로 렌더할 ref 집합 */
  checkboxRefSet?: Set<string>;
  /** invalid 셀 ref 집합 (빨간 outline) */
  invalidRefSet?: Set<string>;
  /** 셀 값 직접 변경 (드롭다운 선택 시) */
  onCellValueChange?: (ref: string, value: string) => void;
  /** ref → 코멘트 텍스트 — 빨간 삼각 + hover tooltip */
  commentMap?: Map<string, string>;
  /** 필터 활성 시 헤더 alphabet row 아래에 검색 input 행 렌더 */
  filterOn?: boolean;
  filters?: Record<number, string>;
  onFilterChange?: (col: number, q: string) => void;
  /** null 이면 모두 보기, Set 이면 그 안 row 만 표시 */
  visibleRowSet?: Set<number> | null;
  /** fill 미리보기 영역 (드래그 중) */
  fillPreview?: SelBounds | null;
  /** fill handle: 어떤 (row, col) 에 핸들을 그릴지 — 보통 selBounds 의 maxR/maxC */
  fillCorner?: { row: number; col: number };
  onFillStart?: (e: React.PointerEvent) => void;
  editing: { row: number; col: number } | null;
  editingValue: string;
  autocomplete?: string | null;
  /** 수식 안 참조된 셀 ref → 색 (다중 ref 마다 다른 색) */
  formulaRefHighlights?: Map<string, string>;
  onPointerDown: (row: number, col: number, e: React.PointerEvent) => void;
  onPointerEnter: (row: number, col: number) => void;
  onContextMenu?: (row: number, col: number, e: React.MouseEvent) => void;
  onStartEdit: (row: number, col: number) => void;
  onChangeValue: (v: string) => void;
  onCommitEdit: (moveDir?: 'down' | 'right' | 'none') => void;
  onCancelEdit: () => void;
}

function SheetGrid({
  cells, displayValues, cellFormats, selected, selBounds, hasRange, mergeAtMap, coveredSet,
  rowCount, colCount, colWidths, rowHeights, onColResize, onRowResize, onRowAutoFit, onHeaderClick, onHeaderContextMenu,
  onCellContextMenu, onSelectAll,
  matchedRefs, currentMatchRef,
  freezeRows = 0, freezeCols = 0,
  condFormatMap,
  validationItemsMap, checkboxRefSet, invalidRefSet, onCellValueChange,
  commentMap,
  filterOn, filters, onFilterChange, visibleRowSet,
  fillPreview, fillCorner, onFillStart,
  editing, editingValue, autocomplete, formulaRefHighlights,
  onPointerDown, onPointerEnter, onStartEdit, onChangeValue, onCommitEdit, onCancelEdit,
}: SheetGridProps) {
  // 행 헤더 너비 (40px) + 열 헤더 높이 (28px) 가 sticky 기준
  const HEADER_H = 28; // thead row 높이 (h-7)
  const ROW_HEADER_W = 40; // 첫 col (w-10)
  const cols = useMemo(() => Array.from({ length: colCount }, (_, i) => colLabel(i)), [colCount]);
  const rows = useMemo(() => Array.from({ length: rowCount }, (_, i) => i), [rowCount]);

  /** sticky top 누적 — freezeRows 안 각 행의 top px 값 */
  const stickyRowTops = useMemo(() => {
    const out: number[] = [];
    let acc = HEADER_H;
    for (let r = 0; r < freezeRows; r++) {
      out.push(acc);
      acc += rowHeights[r] ?? DEFAULT_ROW_HEIGHT;
    }
    return out;
  }, [freezeRows, rowHeights]);

  /** sticky left 누적 — freezeCols 안 각 열의 left px 값 */
  const stickyColLefts = useMemo(() => {
    const out: number[] = [];
    let acc = ROW_HEADER_W;
    for (let c = 0; c < freezeCols; c++) {
      out.push(acc);
      acc += colWidths[c] ?? DEFAULT_COL_WIDTH;
    }
    return out;
  }, [freezeCols, colWidths]);

  return (
    <div className="inline-block min-w-full">
      <table className="border-collapse text-sm font-normal" style={{ tableLayout: 'fixed' }}>
        <thead className="sticky top-0 z-10">
          <tr>
            <th
              className="w-10 h-7 border border-border bg-muted/40 sticky left-0 z-20 cursor-pointer hover:bg-muted/60 relative"
              onClick={onSelectAll}
              title="전체 시트 선택"
              aria-label="전체 시트 선택"
            >
              <span className="absolute right-1 bottom-1 text-[8px] text-muted-foreground leading-none" aria-hidden>◢</span>
            </th>
            {cols.map((c, i) => (
              <th
                key={c}
                className="border border-border bg-muted/40 px-2 py-1 text-xs font-normal text-muted-foreground relative group cursor-pointer hover:bg-muted/60"
                style={{ width: colWidths[i] ?? DEFAULT_COL_WIDTH, minWidth: MIN_COL_WIDTH }}
                onClick={(e) => onHeaderClick?.('col', i, e)}
                onContextMenu={(e) => onHeaderContextMenu?.('col', i, e)}
              >
                {c}
                {/* 드래그 핸들 (오른쪽 가장자리) */}
                <ColResizeHandle
                  colIdx={i}
                  currentWidth={colWidths[i] ?? DEFAULT_COL_WIDTH}
                  defaultWidth={DEFAULT_COL_WIDTH}
                  onResize={onColResize}
                />
              </th>
            ))}
          </tr>
        </thead>
        {filterOn && (
          <thead>
            <tr>
              <th className="w-10 h-7 border border-border bg-amber-50 dark:bg-amber-950/30 sticky left-0 z-20" />
              {cols.map((_, ci) => (
                <th
                  key={ci}
                  className="border border-border bg-amber-50 dark:bg-amber-950/30 px-1 py-0.5"
                  style={{ width: colWidths[ci] ?? DEFAULT_COL_WIDTH, minWidth: MIN_COL_WIDTH }}
                >
                  <input
                    type="text"
                    value={filters?.[ci] ?? ''}
                    onChange={(e) => onFilterChange?.(ci, e.target.value)}
                    placeholder="필터…"
                    className="w-full px-1.5 py-0.5 text-xs rounded border border-border bg-background outline-none focus:border-foreground/40"
                    aria-label={`${colLabel(ci)}열 필터`}
                  />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((rowIdx) => visibleRowSet && !visibleRowSet.has(rowIdx) ? null : (
            <tr key={rowIdx} style={{ height: rowHeights[rowIdx] ?? DEFAULT_ROW_HEIGHT }}>
              <th
                className="w-10 border border-border bg-muted/40 text-xs font-normal text-muted-foreground sticky left-0 z-10 relative group cursor-pointer hover:bg-muted/60"
                onClick={(e) => onHeaderClick?.('row', rowIdx, e)}
                onContextMenu={(e) => onHeaderContextMenu?.('row', rowIdx, e)}
                style={{ height: rowHeights[rowIdx] ?? DEFAULT_ROW_HEIGHT }}
              >
                {rowIdx + 1}
                <RowResizeHandle
                  rowIdx={rowIdx}
                  currentHeight={rowHeights[rowIdx] ?? DEFAULT_ROW_HEIGHT}
                  defaultHeight={DEFAULT_ROW_HEIGHT}
                  onResize={onRowResize}
                  onAutoFit={onRowAutoFit}
                />
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
                const baseFmt = cellFormats[ref];
                const cond = condFormatMap?.get(ref);
                const fmt = cond
                  ? { ...(baseFmt ?? {}), ...cond }
                  : baseFmt;
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
                const isStickyRow = rowIdx < freezeRows;
                const isStickyCol = colIdx < freezeCols;
                const validationItems = validationItemsMap?.get(ref);
                const isCheckbox = !!checkboxRefSet?.has(ref);
                const isInvalid = !!invalidRefSet?.has(ref);
                const commentText = commentMap?.get(ref);
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
                    validationItems={validationItems}
                    isCheckbox={isCheckbox}
                    isInvalid={isInvalid}
                    onSelectValidationItem={onCellValueChange}
                    commentText={commentText}
                    autocomplete={isEditing ? autocomplete : undefined}
                    formulaRefColor={formulaRefHighlights?.get(ref)}
                    stickyTop={isStickyRow ? stickyRowTops[rowIdx] : undefined}
                    stickyLeft={isStickyCol ? stickyColLefts[colIdx] : undefined}
                    rowSpan={span?.rows}
                    colSpan={span?.cols}
                    editing={isEditing}
                    editingValue={editingValue}
                    onPointerDown={onPointerDown}
                    onPointerEnter={onPointerEnter}
                    onContextMenu={onCellContextMenu}
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
  validationItems?: string[];
  /** true 면 셀에 체크박스 위젯 렌더 — 값 'TRUE'/'FALSE' 토글. */
  isCheckbox?: boolean;
  isInvalid?: boolean;
  onSelectValidationItem?: (ref: string, value: string) => void;
  commentText?: string;
  autocomplete?: string | null;
  formulaRefColor?: string;
  stickyTop?: number;
  stickyLeft?: number;
  rowSpan?: number;
  colSpan?: number;
  editing: boolean;
  editingValue: string;
  onPointerDown: (row: number, col: number, e: React.PointerEvent) => void;
  onPointerEnter: (row: number, col: number) => void;
  onContextMenu?: (row: number, col: number, e: React.MouseEvent) => void;
  onStartEdit: (row: number, col: number) => void;
  onChangeValue: (v: string) => void;
  onCommitEdit: (moveDir?: 'down' | 'right' | 'none') => void;
  onCancelEdit: () => void;
}

const SheetCell = React.memo(function SheetCell({
  cellRefStr, row, col, value, format, isFocus, isInRange,
  isMatch, isCurrentMatch, isInFillPreview, hasFillHandle, onFillStart,
  validationItems, isCheckbox, isInvalid, onSelectValidationItem,
  commentText, autocomplete, formulaRefColor,
  stickyTop, stickyLeft,
  rowSpan, colSpan, editing, editingValue,
  onPointerDown, onPointerEnter, onContextMenu, onStartEdit, onChangeValue, onCommitEdit, onCancelEdit,
}: SheetCellProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
  const isSticky = stickyTop !== undefined || stickyLeft !== undefined;
  // sticky 면 배경이 투명이면 뒤가 비치므로 흰색을 깐다
  const effectiveBg = isSticky && !bg ? 'hsl(var(--background))' : bg;
  // 텍스트 장식 — underline / strikethrough 둘 다 가능 (공백 join)
  const decorations: string[] = [];
  if (format?.underline) decorations.push('underline');
  if (format?.strikethrough) decorations.push('line-through');
  const verticalAlignCss: React.CSSProperties['verticalAlign'] | undefined =
    format?.vAlign === 'top' ? 'top'
    : format?.vAlign === 'bottom' ? 'bottom'
    : format?.vAlign === 'middle' ? 'middle'
    : undefined;
  const wrapCss: Pick<React.CSSProperties, 'whiteSpace' | 'overflow' | 'textOverflow'> | undefined =
    format?.wrap === 'wrap' ? { whiteSpace: 'normal', overflow: 'hidden' }
    : format?.wrap === 'clip' ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip' }
    : undefined; // 'overflow' (기본) — 셀 밖으로 흘러나가는 동작은 기존 그대로

  const tdStyle: React.CSSProperties = {
    padding: editing ? 0 : undefined,
    background: effectiveBg,
    color: format?.textColor,
    fontWeight: format?.bold ? 600 : undefined,
    fontStyle: format?.italic ? 'italic' : undefined,
    textDecoration: decorations.length > 0 ? decorations.join(' ') : undefined,
    fontFamily: format?.fontFamily ? FONT_FAMILY_CSS[format.fontFamily] : undefined,
    fontSize: format?.fontSize ? `${format.fontSize}px` : undefined,
    textAlign: format?.align,
    verticalAlign: verticalAlignCss,
    ...wrapCss,
    position: isSticky ? 'sticky' : undefined,
    top: stickyTop,
    left: stickyLeft,
    // 둘 다 sticky 면 가장 위 z-index (코너 셀)
    zIndex: stickyTop !== undefined && stickyLeft !== undefined ? 5
      : isSticky ? 4 : undefined,
    ...borderStyleFor(format?.border),
  };
  // 수식 참조 셀: 그 색으로 inset box-shadow (다른 outline 시스템과 충돌 없이 함께 보임)
  if (formulaRefColor) {
    tdStyle.boxShadow = `inset 0 0 0 2px ${formulaRefColor}`;
  }
  return (
    <td
      data-cell-ref={cellRefStr}
      onPointerDown={(e) => onPointerDown(row, col, e)}
      onPointerEnter={() => onPointerEnter(row, col)}
      onContextMenu={onContextMenu ? (e) => onContextMenu(row, col, e) : undefined}
      onDoubleClick={() => onStartEdit(row, col)}
      rowSpan={rowSpan}
      colSpan={colSpan}
      title={commentText}
      className={cn(
        'border border-border px-2 align-middle relative cursor-cell select-none',
        'min-w-[88px] max-w-[200px] truncate',
        isFocus && !editing && 'outline outline-2 -outline-offset-2 outline-foreground/70',
        isCurrentMatch && !isFocus && 'outline outline-2 -outline-offset-2 outline-amber-500',
        isInvalid && 'outline outline-2 -outline-offset-2 outline-red-500',
      )}
      style={tdStyle}
    >
      {editing ? (
        <div className="relative w-full h-full bg-background border-2 border-foreground/70">
          <FuncHintPopover value={editingValue} onReplaceValue={onChangeValue} />

          {/* ghost: 자동완성 미리보기 — input 아래 정렬, 같은 폰트·padding */}
          {autocomplete && autocomplete.toLowerCase().startsWith(editingValue.toLowerCase()) && editingValue.length > 0 && editingValue !== autocomplete && (
            <span
              className="absolute inset-0 px-2 flex items-center text-sm pointer-events-none select-none whitespace-pre"
              aria-hidden
            >
              <span className="invisible">{editingValue}</span>
              <span className="text-muted-foreground/50">{autocomplete.slice(editingValue.length)}</span>
            </span>
          )}
          <textarea
            ref={inputRef}
            value={editingValue}
            onChange={(e) => onChangeValue(e.target.value)}
            onKeyDown={(e) => {
              // Tab 1순위: 함수 자동완성 (=SU → SUM( ) — commit X, 인자 입력 계속
              if (e.key === 'Tab') {
                e.preventDefault();
                const funcs = getFuncSuggestionNames(editingValue);
                if (funcs.length > 0) {
                  onChangeValue(applyFuncSuggestion(editingValue, funcs[0]));
                  return;
                }
                // 2순위: 셀 값 자동완성이 있으면 그것으로 채우고 commit right
                if (autocomplete && autocomplete !== editingValue
                    && autocomplete.toLowerCase().startsWith(editingValue.toLowerCase())) {
                  onChangeValue(autocomplete);
                  setTimeout(() => onCommitEdit('right'), 0);
                } else {
                  onCommitEdit('right');
                }
              } else if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
                // Enter = commit. Shift+Enter / Alt+Enter = 줄바꿈 (textarea 기본)
                e.preventDefault();
                if (autocomplete && autocomplete !== editingValue
                    && autocomplete.toLowerCase().startsWith(editingValue.toLowerCase())) {
                  onChangeValue(autocomplete);
                  setTimeout(() => onCommitEdit('down'), 0);
                } else {
                  onCommitEdit('down');
                }
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onCancelEdit();
              }
              // Shift+Enter / Alt+Enter 는 preventDefault X → textarea 가 \n 삽입
            }}
            onBlur={() => onCommitEdit('none')}
            rows={Math.max(1, editingValue.split('\n').length)}
            className="w-full h-full px-2 py-0 outline-none bg-transparent text-sm relative z-10 resize-none leading-snug font-[inherit]"
          />
        </div>
      ) : isCheckbox ? (
        // 체크박스 셀 (Sheets 매칭) — 값 'TRUE'/'FALSE' 토글.
        // 빈 셀 = unchecked. 클릭으로 onSelectValidationItem 호출 → 셀 값 변경.
        <div className="w-full h-full flex items-center justify-center">
          <input
            type="checkbox"
            checked={value === 'TRUE'}
            onChange={(e) => onSelectValidationItem?.(cellRefStr, e.target.checked ? 'TRUE' : 'FALSE')}
            onClick={(e) => e.stopPropagation()}
            className="cursor-pointer accent-primary"
            aria-label={`체크박스 (${value === 'TRUE' ? '체크됨' : '안 체크됨'})`}
          />
        </div>
      ) : value.startsWith(IMAGE_SENTINEL) ? (() => {
        const url = value.slice(IMAGE_SENTINEL.length);
        return (
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <img
              src={url}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-full object-contain block pointer-events-none"
              onError={(e) => {
                // 로드 실패 시 placeholder 텍스트로 대체
                const el = e.currentTarget;
                el.style.display = 'none';
                const next = el.nextElementSibling as HTMLElement | null;
                if (next) next.style.display = 'block';
              }}
            />
            <span
              className="hidden text-xs text-destructive truncate"
              title={url}
            >
              #IMG_FAIL
            </span>
          </div>
        );
      })() : value.startsWith(AI_SENTINEL) ? (() => {
        // AI 셀 — sentinel 페이로드: LOADING:<key> | ERROR:<msg>
        const body = value.slice(AI_SENTINEL.length);
        if (body.startsWith(AI_LOADING_PREFIX)) {
          return (
            <div className="w-full h-full flex items-center justify-start gap-1.5 px-2 text-muted-foreground/80 text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-current opacity-60 animate-pulse" aria-hidden />
              <span>AI 생성 중…</span>
            </div>
          );
        }
        if (body.startsWith(AI_ERROR_PREFIX)) {
          const msg = body.slice(AI_ERROR_PREFIX.length);
          return (
            <span className="text-xs text-destructive truncate" title={msg}>
              #AI_ERR
            </span>
          );
        }
        return <span className="text-xs">{value}</span>;
      })() : value.startsWith(LINK_SENTINEL) ? (() => {
        // HYPERLINK 셀 (PR #6) — 클릭 가능한 링크. 새 탭 + noreferrer.
        // 보안: formula 단계에서 javascript:/vbscript:/data:text/html 이미 차단.
        let url = '';
        let label = '';
        try {
          const parsed = JSON.parse(value.slice(LINK_SENTINEL.length));
          if (parsed && typeof parsed === 'object') {
            url = typeof parsed.url === 'string' ? parsed.url : '';
            label = typeof parsed.label === 'string' ? parsed.label : url;
          }
        } catch { /* fallthrough */ }
        if (!url) return <span className="text-xs text-destructive">#LINK</span>;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-blue-600 dark:text-blue-400 underline underline-offset-2 decoration-1 truncate inline-block max-w-full hover:opacity-80"
            title={url}
          >
            {label}
          </a>
        );
      })() : value.startsWith(SPARKLINE_SENTINEL) ? (() => {
        // SPARKLINE — sentinel 페이로드(JSON)를 SVG 로 렌더.
        // 평가는 formula.ts 에서, 시각화만 여기서.
        const raw = value.slice(SPARKLINE_SENTINEL.length);
        let payload: SparklinePayload;
        try {
          const parsed = JSON.parse(raw) as { values?: unknown; options?: unknown };
          const values = Array.isArray(parsed.values) ? parsed.values.map(Number).filter(Number.isFinite) : [];
          const options = parsed.options && typeof parsed.options === 'object'
            ? (parsed.options as SparklinePayload['options'])
            : {};
          payload = { values, options };
        } catch {
          return <span className="text-xs text-destructive">#SPARK_FAIL</span>;
        }
        const svg = buildSparklineSvg(payload);
        // 셀 hover 시 raw 값 미리보기 (최대 12개)
        const preview = payload.values.slice(0, 12).join(', ') + (payload.values.length > 12 ? ', …' : '');
        return (
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden text-foreground"
            title={`${payload.values.length}개 값: ${preview}`}
            // SVG 페이로드는 sparkline.ts 의 safeColor 가이드(스크립트 스킴 차단)를 거침.
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        );
      })() : (() => {
        const link = detectLink(value);
        return (
          <>
            <span className={cn(
              'block whitespace-pre-line overflow-hidden break-words',
              link && 'text-blue-600 dark:text-blue-400 underline underline-offset-2 decoration-1',
            )}>
              {value}
            </span>
            {link && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); window.open(link, '_blank', 'noopener,noreferrer'); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted opacity-60 hover:opacity-100"
                aria-label="링크 열기"
                title={`새 탭에서 열기: ${link}`}
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </>
        );
      })()}
      {hasFillHandle && (
        <span
          onPointerDown={onFillStart}
          className="absolute -right-1 -bottom-1 w-2.5 h-2.5 bg-foreground/80 hover:bg-foreground rounded-[1px] cursor-crosshair z-10"
          aria-label="자동 채우기 핸들"
          title="드래그해서 채우기"
        />
      )}
      {commentText && (
        <span
          className="absolute top-0 right-0 pointer-events-none"
          aria-hidden
          style={{
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderTop: '6px solid rgb(239 68 68)', // red-500
          }}
        />
      )}
      {isFocus && validationItems && validationItems.length > 0 && !editing && (
        <ValidationDropdown
          items={validationItems}
          currentValue={value}
          onSelect={(v) => onSelectValidationItem?.(cellRefStr, v)}
        />
      )}
    </td>
  );
});

// ─────────────────────────────────────────────
// 데이터 검증 드롭다운 (셀 안 우측에 ▼)
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// 조건부 서식 모달
// ─────────────────────────────────────────────

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

function CondFormatModal({ open, onClose, currentRange, rules, onAdd, onRemove }: CondFormatModalProps) {
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
          <div className="flex justify-end pt-1">
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

// ─────────────────────────────────────────────
// 데이터 검증 모달 (드롭다운 목록 규칙 관리)
// ─────────────────────────────────────────────

interface ValidationModalProps {
  open: boolean;
  onClose: () => void;
  currentRange: { minR: number; maxR: number; minC: number; maxC: number };
  rules: Validation[];
  onAdd: (rule: Omit<Validation, 'id'>) => void;
  onRemove: (id: string) => void;
}

function ValidationModal({ open, onClose, currentRange, rules, onAdd, onRemove }: ValidationModalProps) {
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

// ─────────────────────────────────────────────
// 셀 코멘트 모달
// ─────────────────────────────────────────────

interface CommentModalProps {
  open: boolean;
  onClose: () => void;
  cellRefStr: string;
  initialText: string;
  onSave: (text: string) => void;
}

// ─────────────────────────────────────────────
// Named Range 모달 (이름 정의)
// ─────────────────────────────────────────────

interface NamedRangeModalProps {
  open: boolean;
  onClose: () => void;
  currentRange: { minR: number; maxR: number; minC: number; maxC: number };
  currentSheetName: string;
  namedRanges: Record<string, string>;
  onAdd: (name: string, rangeStr: string) => void;
  onRemove: (name: string) => void;
}

function NamedRangeModal({
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

  const valid = /^[A-Za-z_가-힣][A-Za-z0-9_가-힣]*$/.test(name) && rangeStr.trim() !== '';

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
              placeholder="Sheet1!A1:A10"
              className="flex-1 text-sm font-mono px-2 py-1 rounded border border-border bg-background outline-none focus:border-foreground/40"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => { if (valid) { onAdd(name.trim(), rangeStr.trim()); setName(''); } }}
              disabled={!valid}
              className="px-3 py-1.5 rounded bg-foreground text-background hover:bg-foreground/90 text-sm disabled:opacity-40"
            >
              추가
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

function CommentModal({ open, onClose, cellRefStr, initialText, onSave }: CommentModalProps) {
  const [text, setText] = useState(initialText);
  useEffect(() => { if (open) setText(initialText); }, [open, initialText]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-base flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          {cellRefStr} 셀 코멘트
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          이 셀에 메모를 남길 수 있어요. 셀 우상단에 빨간 삼각형이 표시되고,
          마우스 hover 시 내용이 보입니다.
        </DialogDescription>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="이 셀에 대한 메모…"
          className="w-full px-2 py-1.5 rounded border border-border bg-background outline-none focus:border-foreground/40 text-sm"
          autoFocus
        />
        <div className="flex justify-between items-center pt-2 border-t border-border">
          {initialText && (
            <button
              type="button"
              onClick={() => {
                onSave('');
                onClose();
              }}
              className="px-3 py-1.5 rounded text-destructive hover:bg-destructive/10 text-sm flex items-center gap-1"
            >
              <TrashIcon className="w-3.5 h-3.5" /> 삭제
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-border hover:bg-muted text-sm"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(text);
                onClose();
              }}
              className="px-3 py-1.5 rounded bg-foreground text-background hover:bg-foreground/90 text-sm"
            >
              저장
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ChartTypeBtn 은 lib/cloudSheet/ChartModal 공용
