/**
 * 관심 종목 — 브리핑 시장 섹션에 붙일 사용자 티커 목록 (2026-07-06).
 *
 * Yahoo 심볼 문자열을 그대로 저장 (예: AAPL, 005930.KS, TSLA). localStorage + 이벤트.
 */
import { useSyncExternalStore } from 'react';

const KEY = 'personai.watchlist';
const EVENT = 'personai:watchlist-changed';
const MAX = 8;

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

let cache: string[] | null = null;

function snapshot(): string[] {
  if (cache === null) cache = read();
  return cache;
}

function commit(next: string[]): void {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** 티커 정규화 — 대문자, 공백 제거. 국내 종목코드(숫자.KS 등)는 대소문자 무의미. */
function normalize(sym: string): string {
  return sym.trim().toUpperCase();
}

export const watchlistStore = {
  get: snapshot,
  add(sym: string): void {
    const norm = normalize(sym);
    if (!norm) return;
    const cur = snapshot();
    if (cur.includes(norm) || cur.length >= MAX) return;
    commit([...cur, norm]);
  },
  remove(sym: string): void {
    commit(snapshot().filter((s) => s !== sym));
  },
  MAX,
};

function subscribe(cb: () => void): () => void {
  const handler = () => { cache = read(); cb(); };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export function useWatchlist(): string[] {
  return useSyncExternalStore(subscribe, snapshot, () => []);
}
