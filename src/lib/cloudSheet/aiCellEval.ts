/**
 * 시트 AI 셀 비동기 평가 — 캐시 + 큐 + 결과 broadcast.
 *
 * 셀 수식 `=AI("프롬프트")` / `=AI_CLASSIFY(A1, "긍정,부정")` / `=AI_TRANSLATE(A1, "en")` /
 * `=AI_SUMMARIZE(A1:A10)` 평가 흐름:
 *
 *   1) formula.ts 의 __ai/__ai_* 가 호출 → 캐시 hit 면 결과 동기 반환.
 *   2) miss 면 큐에 enqueue + 센티넬 `__CLOUDSHEET_AI__:LOADING:<key>` 반환.
 *   3) 백그라운드 워커가 max N 동시 실행 — /api/chat 호출.
 *   4) 결과 → 캐시 저장 → AI_CHANGED CustomEvent 발행.
 *   5) CloudSheetEditor 가 이벤트 구독 → 셀 재평가 → 결과 텍스트 표시.
 *
 * 비용 안전:
 *   · 시트당 활성 AI 셀 수 카운트 → 일정 한도 (DEFAULT_PER_SHEET_LIMIT) 도달 시 알림.
 *   · 캐시는 localStorage (간단). TTL 30일.
 *   · 모델은 저비용 위주 — Gemini Flash 강제 가능.
 *
 * v1 한계:
 *   · 큐는 in-memory only (페이지 새로고침 시 진행 중 요청 손실 — 캐시는 보존).
 *   · 동시성/TTL/모델은 모듈 상수, UI 설정 미지원.
 *   · IndexedDB 백업 X — 5MB 한계 도달 시 가장 오래된 항목 evict.
 */

/**
 * 캐시 키용 비암호 해시 (djb2 변형). 결정적이고 빨라 캐시 키로 충분.
 * 충돌 확률은 2^32 분의 1 수준 — 셀 ~수백~수천 규모에선 무시 가능.
 */
function fastHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

export const AI_SENTINEL = '__CLOUDSHEET_AI__:';
export const AI_LOADING_PREFIX = 'LOADING:';
export const AI_ERROR_PREFIX = 'ERROR:';

export const AI_CHANGED_EVENT = 'cloudSheet:aiChanged';

const STORAGE_KEY = 'cloudSheet.aiCache.v1';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일
const MAX_ENTRIES = 500;
const MAX_CONCURRENT = 3;
export const DEFAULT_PER_SHEET_LIMIT = 50;
export const AI_JOB_TIMEOUT_MS = 25_000;
export const AI_CELL_TEXT_LIMIT = 6_000;

/** 캐시 엔트리. */
interface CacheEntry {
  result: string;
  at: number;
}

type CacheMap = Record<string, CacheEntry>;

let inMemoryCache: CacheMap | null = null;

function loadCache(): CacheMap {
  if (inMemoryCache) return inMemoryCache;
  if (typeof window === 'undefined') {
    inMemoryCache = {};
    return inMemoryCache;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    inMemoryCache = (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
      ? (parsed as CacheMap)
      : {};
  } catch {
    inMemoryCache = {};
  }
  return inMemoryCache;
}

function persistCache(map: CacheMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // 용량 부족 — 오래된 절반 제거 후 재시도.
    const entries = Object.entries(map).sort(([, a], [, b]) => a.at - b.at);
    const half = Math.floor(entries.length / 2);
    const trimmed: CacheMap = Object.fromEntries(entries.slice(half));
    inMemoryCache = trimmed;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)); } catch { /* give up */ }
  }
}

/** 캐시 키 — 함수+args 의 hash. 결정적·짧음. */
export function aiCacheKey(fn: string, args: unknown): string {
  return fastHash(JSON.stringify({ fn, args }));
}

/** 동기 캐시 lookup — TTL 검사 포함. miss 면 undefined. */
export function aiCacheGet(key: string): string | undefined {
  const map = loadCache();
  const e = map[key];
  if (!e) return undefined;
  if (Date.now() - e.at > TTL_MS) {
    delete map[key];
    persistCache(map);
    return undefined;
  }
  return e.result;
}

export function aiCacheSet(key: string, result: string): void {
  const map = loadCache();
  map[key] = { result, at: Date.now() };
  // size cap — 오래된 것 evict.
  const keys = Object.keys(map);
  if (keys.length > MAX_ENTRIES) {
    const sorted = keys.sort((a, b) => map[a].at - map[b].at);
    for (const k of sorted.slice(0, keys.length - MAX_ENTRIES)) delete map[k];
  }
  persistCache(map);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AI_CHANGED_EVENT, { detail: { key } }));
  }
}

/** 캐시 초기화 — 사용자 "AI 캐시 비우기" 액션 + 테스트. */
export function aiCacheClear(): void {
  inMemoryCache = {};
  if (typeof window !== 'undefined') {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* silent */ }
  }
}

// ─────────────────────────────────────────────
// 비동기 큐 — max MAX_CONCURRENT 동시 fetch
// ─────────────────────────────────────────────

interface QueuedJob {
  key: string;
  fn: string;
  args: unknown;
  inflight: boolean;
}

const queue: QueuedJob[] = [];
const inflight = new Set<string>();

/** Fetcher 인터페이스 — 테스트에서 mock 가능. 기본은 fetchViaChatApi. */
export type AIFetcher = (fn: string, args: unknown) => Promise<string>;

let activeFetcher: AIFetcher = fetchViaChatApi;

/** 테스트/실험에서 fetcher 교체. 평소엔 호출 X. */
export function setAIFetcher(fetcher: AIFetcher): void {
  activeFetcher = fetcher;
}

/** 큐에 추가 — 동일 key 중복 enqueue 차단. */
export function aiQueueFetch(key: string, fn: string, args: unknown): boolean {
  if (inflight.has(key)) return true;
  if (queue.some((j) => j.key === key)) return true;
  if (queue.length >= DEFAULT_PER_SHEET_LIMIT) return false;
  queue.push({ key, fn, args, inflight: false });
  pump();
  return true;
}

function pump(): void {
  while (inflight.size < MAX_CONCURRENT) {
    const job = queue.find((j) => !j.inflight);
    if (!job) return;
    job.inflight = true;
    inflight.add(job.key);
    void runJob(job);
  }
}

async function runJob(job: QueuedJob): Promise<void> {
  try {
    const result = await withTimeout(activeFetcher(job.fn, job.args), AI_JOB_TIMEOUT_MS);
    aiCacheSet(job.key, result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // 에러도 캐시 — 같은 입력으로 즉시 재시도 폭주 방지. 짧은 TTL 위해 별도 prefix.
    aiCacheSet(job.key, `${AI_SENTINEL}${AI_ERROR_PREFIX}${msg.slice(0, 80)}`);
  } finally {
    inflight.delete(job.key);
    const idx = queue.findIndex((j) => j.key === job.key);
    if (idx >= 0) queue.splice(idx, 1);
    pump();
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI_TIMEOUT')), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

/** 큐 + inflight 비우기 — 테스트용. */
export function aiQueueClear(): void {
  queue.length = 0;
  inflight.clear();
}

// ─────────────────────────────────────────────
// 기본 fetcher — /api/chat 사용
// ─────────────────────────────────────────────

function buildPrompt(fn: string, args: unknown): string {
  const a = args as Record<string, unknown>;
  switch (fn) {
    case 'ai':
      return String(a.prompt ?? '');
    case 'ai_classify':
      return `다음 텍스트를 [${String(a.categories ?? '')}] 중 하나로 분류만 해주세요. 답은 카테고리 이름 하나만.\n\n${String(a.text ?? '')}`;
    case 'ai_translate':
      return `다음 텍스트를 ${String(a.lang ?? 'en')} 로 번역만 해주세요. 다른 설명 없이 번역문만.\n\n${String(a.text ?? '')}`;
    case 'ai_summarize':
      return `다음 내용을 1~2 문장으로 요약해주세요.\n\n${String(a.text ?? '')}`;
    default:
      return String(a.prompt ?? '');
  }
}

async function fetchViaChatApi(fn: string, args: unknown): Promise<string> {
  const prompt = buildPrompt(fn, args);
  const a = args as Record<string, unknown>;
  const model = String(a.model ?? 'google/gemini-2.5-flash');
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      model,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  // OpenRouter / chat 표준 응답 — choices[0].message.content
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (typeof data?.text === 'string') return data.text.trim();
  return String(content ?? '').trim() || '#AI_EMPTY';
}
