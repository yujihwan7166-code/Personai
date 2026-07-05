/**
 * 시장 지수 — 브리핑 주식 섹션용 (2026-07-06).
 *
 * Yahoo Finance chart API (키 불필요)로 지수·환율·코인 + 사용자 관심종목의
 * 현재가·등락률. 실패한 심볼은 건너뛰고, 전부 실패하면 빈 배열 → 클라가 섹션 생략.
 *
 * ?watch=AAPL,005930.KS 로 관심종목 추가 (그룹 '관심 종목', 이름은 Yahoo shortName).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export type MarketGroup = '지수' | '환율' | '코인' | '관심 종목';

interface SymbolSpec {
  sym: string;
  name: string;
  group: MarketGroup;
}

const DEFAULT_SYMBOLS: SymbolSpec[] = [
  { sym: '%5EKS11', name: 'KOSPI', group: '지수' },
  { sym: '%5EKQ11', name: 'KOSDAQ', group: '지수' },
  { sym: '%5EIXIC', name: '나스닥', group: '지수' },
  { sym: '%5EGSPC', name: 'S&P 500', group: '지수' },
  { sym: 'KRW=X', name: '달러/원', group: '환율' },
  { sym: 'JPYKRW=X', name: '엔/원', group: '환율' },
  { sym: 'BTC-USD', name: '비트코인', group: '코인' },
  { sym: 'ETH-USD', name: '이더리움', group: '코인' },
];

interface IndexQuote {
  name: string;
  price: number;
  changePct: number;
  group: MarketGroup;
}

async function fetchOne(spec: SymbolSpec): Promise<IndexQuote | null> {
  try {
    const enc = encodeURIComponent(spec.sym).replace(/%25/g, '%'); // 이미 인코딩된 기본 심볼(%5E) 보존
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${enc}?interval=1d&range=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice);
    const prev = Number(meta?.chartPreviousClose ?? meta?.previousClose);
    if (!Number.isFinite(price) || !Number.isFinite(prev) || prev === 0) return null;
    const changePct = ((price - prev) / prev) * 100;
    const name = spec.name || String(meta?.shortName ?? meta?.symbol ?? spec.sym);
    return { name, price: Math.round(price * 100) / 100, changePct: Math.round(changePct * 100) / 100, group: spec.group };
  } catch {
    return null;
  }
}

function parseWatch(raw: unknown): SymbolSpec[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8) // 과도한 fan-out 방지
    .map((sym) => ({ sym, name: '', group: '관심 종목' as MarketGroup }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const watch = parseWatch(req.query?.watch);
    const specs = [...DEFAULT_SYMBOLS, ...watch];
    const results = await Promise.all(specs.map(fetchOne));
    const indices = results.filter((r): r is IndexQuote => r !== null);
    res.status(200).json({ indices });
  } catch {
    res.status(200).json({ indices: [] });
  }
}
