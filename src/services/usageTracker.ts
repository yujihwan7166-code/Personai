/**
 * API 사용량 트래커 — provider/model/tokens 단위 기록.
 *
 * 책임:
 * - API 호출 로컬 로그 (provider, model, 입력/출력 토큰, 타임스탬프)
 * - 일일 누적 집계 (로컬 기반)
 * - 이벤트 dispatch — 대시보드·설정 화면이 구독 가능
 *
 * 서버 동기화는 별도 레이어에서 (이 서비스는 로컬 state 만 관리).
 * localStorage 키: 'personai.usage_log.v1'
 */

export interface UsageEntry {
  id: string;               // uuid or timestamp-based
  at: number;               // Date.now()
  provider: string;         // 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'openrouter' | ...
  model: string;            // 'gpt-4o-mini' | 'claude-opus-4-7' | ...
  inputTokens: number;
  outputTokens: number;
  /** 사용 컨텍스트 — 'chat' | 'search' | 'image' | 'summary' 등. */
  context?: string;
  /** cost in USD — provider 별 요금표 기반 계산. 옵션. */
  costUsd?: number;
}

const STORAGE_KEY = 'personai.usage_log.v1';
const MAX_ENTRIES = 5000; // 오래된 엔트리부터 truncation

export const USAGE_CHANGED_EVENT = 'personai:usage-changed';

function loadAll(): UsageEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is UsageEntry =>
      e && typeof e === 'object' && 'at' in e && 'provider' in e && 'model' in e,
    );
  } catch {
    return [];
  }
}

function saveAll(entries: UsageEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = entries.length > MAX_ENTRIES ? entries.slice(-MAX_ENTRIES) : entries;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent(USAGE_CHANGED_EVENT));
  } catch { /* quota fail — silent */ }
}

/** 사용 기록 추가. 비동기/비차단. */
export function recordUsage(entry: Omit<UsageEntry, 'id' | 'at'> & Partial<Pick<UsageEntry, 'id' | 'at'>>): void {
  const full: UsageEntry = {
    id: entry.id ?? `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    at: entry.at ?? Date.now(),
    provider: entry.provider,
    model: entry.model,
    inputTokens: entry.inputTokens,
    outputTokens: entry.outputTokens,
    context: entry.context,
    costUsd: entry.costUsd,
  };
  const entries = loadAll();
  entries.push(full);
  saveAll(entries);
}

/** 전체 기록 반환 — 최신순 정렬. */
export function getAllUsage(): UsageEntry[] {
  return loadAll().sort((a, b) => b.at - a.at);
}

/** 하루 이내 기록만. */
export function getTodayUsage(): UsageEntry[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const ms = start.getTime();
  return loadAll().filter((e) => e.at >= ms);
}

/** 누적 토큰·비용 집계. */
export interface UsageSummary {
  entries: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  byProvider: Record<string, { inputTokens: number; outputTokens: number; costUsd: number }>;
  byModel: Record<string, { inputTokens: number; outputTokens: number; costUsd: number }>;
}

export function summarizeUsage(entries: UsageEntry[]): UsageSummary {
  const summary: UsageSummary = {
    entries: entries.length,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    costUsd: 0,
    byProvider: {},
    byModel: {},
  };
  for (const e of entries) {
    summary.inputTokens += e.inputTokens;
    summary.outputTokens += e.outputTokens;
    summary.costUsd += e.costUsd ?? 0;
    const p = summary.byProvider[e.provider] ??= { inputTokens: 0, outputTokens: 0, costUsd: 0 };
    p.inputTokens += e.inputTokens;
    p.outputTokens += e.outputTokens;
    p.costUsd += e.costUsd ?? 0;
    const m = summary.byModel[e.model] ??= { inputTokens: 0, outputTokens: 0, costUsd: 0 };
    m.inputTokens += e.inputTokens;
    m.outputTokens += e.outputTokens;
    m.costUsd += e.costUsd ?? 0;
  }
  summary.totalTokens = summary.inputTokens + summary.outputTokens;
  return summary;
}

/** 저장된 모든 기록 삭제 — 대시보드의 '전체 초기화' 버튼에서 호출. */
export function clearUsage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(USAGE_CHANGED_EVENT));
  } catch { /* noop */ }
}
