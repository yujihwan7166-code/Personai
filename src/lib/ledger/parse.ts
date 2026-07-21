/**
 * 가계부 한 줄 입력 로컬 파서 — LLM 없이 90% 처리하는 게 목표.
 * 규칙: 토큰 순회하며 [날짜 컨텍스트] [메모 단어들] [금액] 을 한 건으로 묶는다.
 * 날짜 토큰은 이후 건에도 유지("어제 택시 12000 커피 4500" → 둘 다 어제).
 * 금액 없는 입력은 빈 배열 → 호출부가 AI 폴백 판단.
 */
import type { EntryType, PayMethod } from '@/types/ledger';

export interface ParsedEntry {
  type: EntryType;
  amount: number;
  date: string;        // 로컬 YMD
  categoryId: string;
  memo: string;
  method?: PayMethod;
  recurring?: boolean; // '매달/매월' — 고정지출 등록 제안
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shift = (d: Date, days: number) => { const c = new Date(d); c.setDate(c.getDate() + days); return c; };

/** '4,500' '5천' '1.5만' '3만5천' '만원' '12000원' → 원 단위 정수. 아니면 null. */
export function parseAmountToken(raw: string): number | null {
  const tok = raw.replace(/원$/, '');
  if (!tok) return null;
  if (/^\d{1,3}(,\d{3})+$/.test(tok)) return Number(tok.replace(/,/g, ''));
  if (/^\d+$/.test(tok)) return Number(tok);
  const m = tok.match(/^(\d+(?:\.\d+)?)?만(?:(\d+(?:\.\d+)?)천)?$/);
  if (m && (m[1] !== undefined || tok === '만')) {
    const man = m[1] !== undefined ? Number(m[1]) : 1;
    const chun = m[2] !== undefined ? Number(m[2]) : 0;
    return Math.round(man * 10000 + chun * 1000);
  }
  const t = tok.match(/^(\d+(?:\.\d+)?)천$/);
  if (t) return Math.round(Number(t[1]) * 1000);
  return null;
}

/** 상대날짜·M/D → YMD. 날짜 토큰이 아니면 null. */
function parseDateToken(tok: string, today: Date): string | null {
  if (tok === '오늘') return ymd(today);
  if (tok === '어제') return ymd(shift(today, -1));
  if (tok === '그제' || tok === '그저께' || tok === '엊그제') return ymd(shift(today, -2));
  const rel = tok.match(/^(\d+)일\s?전$/);
  if (rel) return ymd(shift(today, -Number(rel[1])));
  const md = tok.match(/^(\d{1,2})[/.](\d{1,2})$/);
  if (md) {
    const mo = Number(md[1]), da = Number(md[2]);
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) return ymd(new Date(today.getFullYear(), mo - 1, da));
  }
  return null;
}

const INCOME_KW = ['월급', '급여', '용돈', '보너스', '상여', '입금', '환급', '이자', '알바비', '페이백'];
const TRANSFER_KW = ['적금', '저축', '이체', '예금', '투자금', '증권'];
const METHOD_KW: Record<string, PayMethod> = { '현금': 'cash', '카드': 'card', '계좌': 'account' };

/** 기본 키워드 → 카테고리. 학습 사전(keywordDict)이 항상 우선. */
const DEFAULT_KW: Array<[string, string]> = [
  ['점심', 'food'], ['저녁', 'food'], ['아침', 'food'], ['밥', 'food'], ['식당', 'food'],
  ['김밥', 'food'], ['치킨', 'food'], ['배달', 'food'], ['야식', 'food'], ['편의점', 'food'], ['회식', 'food'],
  ['커피', 'cafe'], ['카페', 'cafe'], ['스타벅스', 'cafe'], ['디저트', 'cafe'], ['음료', 'cafe'], ['간식', 'cafe'],
  ['택시', 'transport'], ['버스', 'transport'], ['지하철', 'transport'], ['기차', 'transport'],
  ['주유', 'transport'], ['주차', 'transport'], ['톨비', 'transport'],
  ['쇼핑', 'shopping'], ['옷', 'shopping'], ['신발', 'shopping'], ['쿠팡', 'shopping'], ['다이소', 'shopping'], ['화장품', 'shopping'],
  ['넷플', 'subscription'], ['넷플릭스', 'subscription'], ['유튜브', 'subscription'], ['멜론', 'subscription'], ['구독', 'subscription'],
  ['월세', 'housing'], ['관리비', 'housing'], ['전기', 'housing'], ['가스', 'housing'], ['수도', 'housing'],
  ['통신', 'housing'], ['핸드폰', 'housing'], ['인터넷', 'housing'],
  ['병원', 'medical'], ['약국', 'medical'], ['진료', 'medical'], ['치과', 'medical'], ['약', 'medical'],
  ['축의금', 'event'], ['조의금', 'event'], ['부조', 'event'], ['선물', 'event'], ['생일', 'event'], ['생신', 'event'],
  ['영화', 'leisure'], ['노래방', 'leisure'], ['게임', 'leisure'], ['여행', 'leisure'], ['공연', 'leisure'], ['전시', 'leisure'],
];

function matchCategory(words: string[], dict?: Record<string, string>): string {
  if (dict) {
    for (const w of words) {
      for (const [kw, cat] of Object.entries(dict)) if (w.includes(kw)) return cat;
    }
  }
  for (const w of words) {
    for (const [kw, cat] of DEFAULT_KW) if (w.includes(kw)) return cat;
  }
  return 'etc';
}

export function parseInput(
  text: string,
  opts: { today: Date; keywordDict?: Record<string, string> },
): ParsedEntry[] {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  const out: ParsedEntry[] = [];
  let curDate = ymd(opts.today);
  let words: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const d = parseDateToken(tok, opts.today);
    if (d) { curDate = d; continue; }
    const amount = parseAmountToken(tok);
    if (amount === null || amount <= 0) { words.push(tok); continue; }

    // 금액 확정 — 지금까지 모인 단어가 이 건의 메모/속성
    let recurring = false;
    if (tokens[i + 1] === '매달' || tokens[i + 1] === '매월') { recurring = true; i++; }
    let method: PayMethod | undefined;
    const memoWords = words.filter((w) => {
      if (METHOD_KW[w]) { method = METHOD_KW[w]; return false; }
      return true;
    });
    const type: EntryType = memoWords.some((w) => INCOME_KW.some((k) => w.includes(k)))
      ? 'income'
      : memoWords.some((w) => TRANSFER_KW.some((k) => w.includes(k)))
        ? 'transfer'
        : 'expense';
    out.push({
      type,
      amount,
      date: curDate,
      categoryId: type === 'expense' ? matchCategory(memoWords, opts.keywordDict) : 'etc',
      memo: memoWords.join(' '),
      method,
      recurring: recurring || undefined,
    });
    words = [];
  }
  return out;
}
