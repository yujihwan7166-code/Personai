/**
 * CSV 파싱·생성 유틸 — 외부 라이브러리 없이 RFC 4180 기본 케이스 처리.
 *
 * 시트 import/export, 데이터 backup, 클립보드 표 붙여넣기 등에 활용.
 * 한계: 인용 안 된 multi-line 셀은 지원 X (대부분의 케이스 충분).
 */

/**
 * CSV 행 1줄을 [셀] 배열로 파싱. 큰따옴표 escape ("") 지원.
 */
export function parseCsvLine(line: string, delimiter = ','): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuote = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuote = true;
    } else if (c === delimiter) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

/**
 * CSV 전체 텍스트 → 2D 배열. 따옴표 안 줄바꿈과 UTF-8 BOM을 처리하고 빈 행은 제거한다.
 */
export function parseCsv(text: string, delimiter = ','): string[][] {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const out: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuote = false;

  const pushRow = () => {
    row.push(cur);
    cur = '';
    if (row.some((cell) => cell.trim() !== '')) out.push(row);
    row = [];
  };

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (inQuote) {
      if (ch === '"' && normalized[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuote = false;
      } else {
        cur += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuote = true;
    } else if (ch === delimiter) {
      row.push(cur);
      cur = '';
    } else if (ch === '\n') {
      pushRow();
    } else {
      cur += ch;
    }
  }

  if (cur !== '' || row.length > 0) pushRow();
  return out;
}

/**
 * 셀 1개를 CSV 안전 형식으로 — 필요 시 큰따옴표로 감싸기.
 */
export function escapeCsvCell(s: string, delimiter = ','): string {
  if (s == null) return '';
  const str = String(s);
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * 2D 배열 → CSV 텍스트.
 */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number>>, delimiter = ','): string {
  return rows
    .map((row) => row.map((c) => escapeCsvCell(String(c), delimiter)).join(delimiter))
    .join('\n');
}
