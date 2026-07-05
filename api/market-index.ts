/**
 * 시장 지수 — 브리핑 주식 섹션용 (2026-07-06).
 *
 * Yahoo Finance chart API (키 불필요)로 주요 지수 현재가·등락률. 실패한 지수는
 * 건너뛰고, 전부 실패하면 빈 배열 → 클라가 섹션 생략.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SYMBOLS: { sym: string; name: string }[] = [
  { sym: '%5EKS11', name: 'KOSPI' },
  { sym: '%5EKQ11', name: 'KOSDAQ' },
  { sym: '%5EIXIC', name: '나스닥' },
  { sym: '%5EGSPC', name: 'S&P 500' },
];

interface IndexQuote {
  name: string;
  price: number;
  changePct: number;
}

async function fetchOne(sym: string, name: string): Promise<IndexQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice);
    const prev = Number(meta?.chartPreviousClose ?? meta?.previousClose);
    if (!Number.isFinite(price) || !Number.isFinite(prev) || prev === 0) return null;
    const changePct = ((price - prev) / prev) * 100;
    return { name, price: Math.round(price * 100) / 100, changePct: Math.round(changePct * 100) / 100 };
  } catch {
    return null;
  }
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const results = await Promise.all(SYMBOLS.map((s) => fetchOne(s.sym, s.name)));
    const indices = results.filter((r): r is IndexQuote => r !== null);
    res.status(200).json({ indices });
  } catch {
    res.status(200).json({ indices: [] });
  }
}
