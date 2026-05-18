/**
 * QueryCache — SWR-mini.
 *
 * key → { data, fetchedAt }. TTL 기반 stale 판단.
 * 동일 key 동시 fetch 는 한 번만 (dedupe).
 * 구독자에게 변경 통지.
 */

interface Entry<T> {
  data: T;
  fetchedAt: number;
}

type Listener<T> = (data: T) => void;

export class QueryCache<T = unknown> {
  private store = new Map<string, Entry<T>>();
  private inflight = new Map<string, Promise<T>>();
  private listeners = new Map<string, Set<Listener<T>>>();

  constructor(private ttlMs: number = 30_000) {}

  get(key: string): T | undefined {
    return this.store.get(key)?.data;
  }

  isStale(key: string, now: number = Date.now()): boolean {
    const e = this.store.get(key);
    if (!e) return true;
    return now - e.fetchedAt > this.ttlMs;
  }

  set(key: string, data: T, now: number = Date.now()): void {
    this.store.set(key, { data, fetchedAt: now });
    this.listeners.get(key)?.forEach(l => l(data));
  }

  invalidate(key?: string): void {
    if (key === undefined) {
      this.store.clear();
    } else {
      this.store.delete(key);
    }
  }

  async fetch(key: string, fetcher: () => Promise<T>, now: number = Date.now()): Promise<T> {
    if (!this.isStale(key, now)) {
      return this.store.get(key)!.data;
    }
    const existing = this.inflight.get(key);
    if (existing) return existing;
    const p = fetcher().then(
      d => { this.set(key, d); this.inflight.delete(key); return d; },
      e => { this.inflight.delete(key); throw e; },
    );
    this.inflight.set(key, p);
    return p;
  }

  subscribe(key: string, listener: Listener<T>): () => void {
    let set = this.listeners.get(key);
    if (!set) { set = new Set(); this.listeners.set(key, set); }
    set.add(listener);
    return () => { set!.delete(listener); };
  }
}
