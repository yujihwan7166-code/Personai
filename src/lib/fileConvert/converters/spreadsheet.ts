// 스프레드시트 변환: XLSX ↔ CSV ↔ JSON
// 기존 xlsx(SheetJS) 활용, Excel 호환 위해 CSV 출력 시 UTF-8 BOM 포함

let xlsxPromise: Promise<typeof import('xlsx')> | null = null;
function loadXlsx() {
  if (!xlsxPromise) xlsxPromise = import('xlsx');
  return xlsxPromise;
}

const BOM = '\uFEFF';

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

export async function convertXlsxToCsv(file: File): Promise<{ blob: Blob; suggestedName: string }> {
  const XLSX = await loadXlsx();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  const csv = XLSX.utils.sheet_to_csv(firstSheet);
  const withBom = BOM + csv; // Excel 한글 호환
  const blob = new Blob([withBom], { type: 'text/csv;charset=utf-8' });
  return { blob, suggestedName: `${baseName(file.name)}.csv` };
}

export async function convertXlsxToJson(file: File): Promise<{ blob: Blob; suggestedName: string }> {
  const XLSX = await loadXlsx();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: null });
  const json = JSON.stringify(rows, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  return { blob, suggestedName: `${baseName(file.name)}.json` };
}

export async function convertCsvToXlsx(file: File): Promise<{ blob: Blob; suggestedName: string }> {
  const XLSX = await loadXlsx();
  // CSV 인코딩 휴리스틱: BOM 확인 + 한글 범위 체크
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let text: string;
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    text = new TextDecoder('utf-8').decode(bytes.slice(3));
  } else {
    const utf8Try = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    const hasReplacement = utf8Try.includes('\uFFFD');
    text = hasReplacement ? new TextDecoder('euc-kr').decode(bytes) : utf8Try;
  }
  const wb = XLSX.read(text, { type: 'string' });
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  return { blob, suggestedName: `${baseName(file.name)}.xlsx` };
}

// ───── CSV 정리 — 정렬 + 중복 제거 + 빈 행 제거 ─────
export interface CsvCleanOptions {
  hasHeader?: boolean;
  sortDir?: 'asc' | 'desc' | 'none';
  sortColumn?: number;
  dedupe?: boolean;
  removeEmpty?: boolean;
}

export async function cleanCsv(
  file: File,
  options: CsvCleanOptions = {},
): Promise<{ blob: Blob; suggestedName: string }> {
  const opts = {
    hasHeader: options.hasHeader ?? true,
    sortDir: options.sortDir ?? 'none',
    sortColumn: options.sortColumn ?? 0,
    dedupe: options.dedupe ?? false,
    removeEmpty: options.removeEmpty ?? true,
  };
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let text: string;
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    text = new TextDecoder('utf-8').decode(bytes.slice(3));
  } else {
    const utf8Try = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    const hasReplacement = utf8Try.includes('�');
    text = hasReplacement ? new TextDecoder('euc-kr').decode(bytes) : utf8Try;
  }
  const rows = parseCsv(text);
  if (rows.length === 0) throw new Error('CSV에 행이 없어요.');
  let header: string[] | null = null;
  let dataRows = rows;
  if (opts.hasHeader && rows.length > 0) {
    header = rows[0];
    dataRows = rows.slice(1);
  }
  if (opts.removeEmpty) {
    dataRows = dataRows.filter((r) => r.some((c) => c.trim().length > 0));
  }
  if (opts.dedupe) {
    const seen = new Set<string>();
    dataRows = dataRows.filter((r) => {
      const key = r.join('');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  if (opts.sortDir !== 'none') {
    const col = Math.max(0, Math.min(opts.sortColumn, (dataRows[0]?.length ?? 1) - 1));
    dataRows = [...dataRows].sort((a, b) => {
      const av = a[col] ?? '';
      const bv = b[col] ?? '';
      const an = Number(av);
      const bn = Number(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) {
        return opts.sortDir === 'asc' ? an - bn : bn - an;
      }
      return opts.sortDir === 'asc' ? av.localeCompare(bv, 'ko') : bv.localeCompare(av, 'ko');
    });
  }
  const allRows = header ? [header, ...dataRows] : dataRows;
  const csv = allRows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
  const withBom = BOM + csv;
  const blob = new Blob([withBom], { type: 'text/csv;charset=utf-8' });
  return { blob, suggestedName: `${baseName(file.name)}-cleaned.csv` };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        inQuote = false;
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuote = true;
      } else if (c === ',') {
        current.push(cell);
        cell = '';
      } else if (c === '\n') {
        current.push(cell);
        rows.push(current);
        current = [];
        cell = '';
      } else if (c === '\r') {
        /* skip CR */
      } else {
        cell += c;
      }
    }
  }
  if (cell.length > 0 || current.length > 0) {
    current.push(cell);
    rows.push(current);
  }
  return rows;
}

function escapeCsvCell(cell: string): string {
  if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}
