/**
 * 클라우드 시트 AI 액션.
 * cloudDoc/ai.ts 의 quickAi 재사용 (OpenRouter 인프라 공유).
 */

import { quickAi, QUICK_MODEL, QUALITY_MODEL } from '@/lib/cloudDoc/ai';
import { IMAGE_SENTINEL } from './formula';

type Cells = Record<string, string>;

// ─────────────────────────────────────────────
// 데이터 → CSV (AI 프롬프트 용)
// ─────────────────────────────────────────────

function colLabel(col: number): string {
  let s = '';
  let n = col;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function colIdx(label: string): number {
  let n = 0;
  for (const ch of label.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

/** cells 를 CSV 형식으로 직렬화. 빈 셀은 빈 칸. 비어있는 trailing 행/열 제거.
 *  IMAGE 함수 결과(sentinel)는 URL 만 남김. */
export function cellsToCsv(cells: Cells, opts: { displayValues?: Cells } = {}): string {
  let maxRow = -1;
  let maxCol = -1;
  for (const ref of Object.keys(cells)) {
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    if (!m) continue;
    const col = colIdx(m[1]);
    const row = Number(m[2]) - 1;
    if (row > maxRow) maxRow = row;
    if (col > maxCol) maxCol = col;
  }
  if (maxRow < 0 || maxCol < 0) return '';

  const lines: string[] = [];
  for (let r = 0; r <= maxRow; r++) {
    const row: string[] = [];
    for (let c = 0; c <= maxCol; c++) {
      const ref = `${colLabel(c)}${r + 1}`;
      let raw = opts.displayValues?.[ref] ?? cells[ref] ?? '';
      // IMAGE sentinel → URL 만
      if (raw.startsWith(IMAGE_SENTINEL)) raw = raw.slice(IMAGE_SENTINEL.length);
      // CSV escape
      const needsQuote = raw.includes(',') || raw.includes('"') || raw.includes('\n');
      row.push(needsQuote ? `"${raw.replace(/"/g, '""')}"` : raw);
    }
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

// ─────────────────────────────────────────────
// AI 액션
// ─────────────────────────────────────────────

/** 데이터 요약 — 핵심 패턴·합계·평균·이상치 등을 한 문단으로. */
export async function sheetSummarize(csv: string): Promise<string> {
  return quickAi(
    `당신은 데이터 분석가입니다. 사용자가 준 CSV 표를 보고:
- 행/열 수, 헤더 패턴
- 핵심 패턴 (합계·평균·최대·최소·트렌드 등 의미 있는 것 1~3개)
- 이상치 또는 흥미로운 점이 있으면 짧게
한 문단(3~5문장)으로 요약해주세요. 결과만 출력합니다. 표 다시 안 그립니다.`,
    `다음 CSV 표를 분석해주세요:\n\n${csv}`,
    { model: QUALITY_MODEL, temperature: 0.4, maxTokens: 1024 },
  );
}

/** 수식 추천 — 사용자가 원하는 결과 설명 → AI가 수식 1~3개 제안. */
export async function sheetSuggestFormula(csv: string, userGoal: string): Promise<string> {
  return quickAi(
    `당신은 엑셀·구글 시트 수식 전문가입니다.
사용자의 데이터(CSV)와 원하는 결과 설명을 보고, 작동하는 수식 1~3개를 제안하세요.
지원 함수: SUM, AVG/AVERAGE, MIN, MAX, COUNT, IF, ABS, ROUND, 산술(+-*/^), 비교(>=<==!=).
형식:
1. 수식: =FORMULA
   설명: 한 줄.
2. ...
간결하게. 추가 설명 X.`,
    `데이터:\n${csv}\n\n원하는 결과: ${userGoal}`,
    { model: QUICK_MODEL, temperature: 0.3, maxTokens: 600 },
  );
}

/** 선택 범위 패턴 분석 — 빠른 인사이트. */
export async function sheetExplainSelection(csv: string): Promise<string> {
  return quickAi(
    `사용자가 선택한 셀 범위입니다. 이 데이터가 무엇을 의미하는지, 패턴이 있다면 무엇인지 2~3 문장으로 짧게 설명해주세요. 결과만 출력.`,
    csv,
    { model: QUICK_MODEL, temperature: 0.4, maxTokens: 400 },
  );
}
