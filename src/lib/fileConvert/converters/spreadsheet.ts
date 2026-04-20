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
