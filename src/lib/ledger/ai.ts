/**
 * 가계부 AI — 둘 다 온디맨드.
 *  1) aiParseEntries — 로컬 파서가 못 읽은 입력의 LLM 파싱 폴백
 *  2) aiQuery — 자연어 질의("이번 달 커피 얼마?") → 요약 데이터 기반 한 단락 답변
 * 실패 시 예외 → 호출부(ChatBar)가 안내 문구 폴백.
 */
import { quickAi, QUICK_MODEL } from '@/lib/ai/quick';
import type { ParsedEntry } from '@/lib/ledger/parse';
import type { LedgerCategory, LedgerEntry } from '@/types/ledger';
import { summarizeMonth, categoryTotals, monthOf } from '@/lib/ledger/stats';

function extractJsonArray<T>(text: string): T[] | null {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)) as T[]; } catch { return null; }
}

export async function aiParseEntries(
  input: string, todayYmd: string, categories: LedgerCategory[],
): Promise<ParsedEntry[]> {
  const catList = categories.map((c) => c.id).join(', ');
  const system =
    '너는 가계부 입력 파서다. 사용자의 자연어에서 거래를 추출해 JSON 배열만 출력한다(설명 없이). ' +
    '각 원소: {"type":"expense"|"income"|"transfer","amount":정수(원),"date":"YYYY-MM-DD","categoryId":string,"memo":string}. ' +
    `오늘은 ${todayYmd}. categoryId 는 다음 중 하나: [${catList}] (모르면 "etc"). ` +
    '적금·저축·투자 입금은 transfer, 월급·용돈은 income. 금액이 없는 문장이면 빈 배열 [].';
  const raw = await quickAi(system, input.slice(0, 500), { model: QUICK_MODEL, temperature: 0.1, maxTokens: 600 });
  const arr = extractJsonArray<Record<string, unknown>>(raw) ?? [];
  const allow = new Set(categories.map((c) => c.id));
  return arr
    .filter((e) =>
      (e.type === 'expense' || e.type === 'income' || e.type === 'transfer') &&
      typeof e.amount === 'number' && e.amount > 0 &&
      typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date))
    .map((e) => ({
      type: e.type as ParsedEntry['type'],
      amount: Math.round(e.amount as number),
      date: e.date as string,
      categoryId: typeof e.categoryId === 'string' && allow.has(e.categoryId) ? e.categoryId : 'etc',
      memo: typeof e.memo === 'string' ? e.memo : '',
    }));
}

/** 질의 — 원본 전체 대신 이번달·지난달 요약 + 최근 60건만 컨텍스트로 (토큰 절약). */
export async function aiQuery(
  question: string, entries: LedgerEntry[], categories: LedgerCategory[], todayYmd: string,
): Promise<string> {
  const month = monthOf(todayYmd);
  const [y, m] = month.split('-').map(Number);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
  const label = new Map(categories.map((c) => [c.id, c.label]));
  const catLine = (mo: string) =>
    categoryTotals(entries, mo).map((t) => `${label.get(t.categoryId) ?? t.categoryId} ${t.total}`).join(', ');
  const recent = entries.slice(0, 60)
    .map((e) => `${e.date} ${e.type} ${e.amount} ${label.get(e.categoryId) ?? ''} ${e.memo}`.trim())
    .join('\n');
  const s1 = summarizeMonth(entries, month);
  const s2 = summarizeMonth(entries, prev);
  const system =
    '너는 개인 가계부 데이터로 질문에 답하는 비서다. 담백한 사실형으로 2~3문장, 금액은 원 단위 콤마 표기. ' +
    '데이터에 없는 건 "기록에 없다"고 답한다. 투자·재테크 조언은 하지 않는다.';
  const user =
    `오늘: ${todayYmd}\n[이번 달 ${month}] 수입 ${s1.income} 지출 ${s1.expense} 이체 ${s1.transfer}\n` +
    `카테고리: ${catLine(month)}\n[지난달 ${prev}] 수입 ${s2.income} 지출 ${s2.expense}\n카테고리: ${catLine(prev)}\n` +
    `[최근 내역]\n${recent}\n\n[질문] ${question}`;
  return quickAi(system, user, { model: QUICK_MODEL, temperature: 0.3, maxTokens: 500 });
}
