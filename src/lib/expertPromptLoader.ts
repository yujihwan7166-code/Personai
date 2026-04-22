import type { Expert } from '@/types/expert';

// ── 프롬프트 샤드 dispatcher ──
// 큰 prompts.ts(수천 줄)를 도메인별 샤드로 쪼개 동적 import.
// 신규 샤드 추가 시: (1) AI_MODEL_IDS 같은 id 목록 export (2) Record<string,string> export (3) 아래 SHARDS에 등록.

type PromptMap = Record<string, string>;
type ShardLoader = () => Promise<PromptMap>;

// 각 샤드는 자신에게 속한 id 목록을 export — dispatcher는 이걸 보고 샤드를 선택.
// 어느 샤드에도 속하지 않은 id는 기본(메인) 샤드로 폴백.
interface ShardDef {
  name: string;
  ids: ReadonlyArray<string>;
  load: ShardLoader;
}

const SHARDS: ShardDef[] = [
  {
    name: 'ai-models',
    ids: ['router', 'gpt', 'claude', 'gemini', 'perplexity', 'grok', 'deepseek', 'qwen'],
    load: () => import('@/data/prompts/ai-models').then((m) => m.AI_MODEL_PROMPTS),
  },
  // 향후 추가 샤드 예: characters, academic, professional …
];

const MAIN_SHARD: ShardLoader = () => import('@/data/prompts').then((m) => m.PROMPTS);

// 샤드별 로드 캐시 — 한 번 가져오면 메모리에 유지.
const shardCache = new Map<string, Promise<PromptMap>>();

function loadShard(def: ShardDef | null): Promise<PromptMap> {
  const key = def?.name ?? '__main__';
  const existing = shardCache.get(key);
  if (existing) return existing;
  const p = def ? def.load() : MAIN_SHARD();
  shardCache.set(key, p);
  return p;
}

function pickShard(id: string): ShardDef | null {
  return SHARDS.find((s) => s.ids.includes(id)) ?? null;
}

async function lookupPrompt(id: string): Promise<string> {
  const shard = pickShard(id);
  const map = await loadShard(shard);
  if (map[id] !== undefined) return map[id];
  // 샤드에 없으면 메인 폴백 (마이그레이션 중인 id 대비)
  if (shard) {
    const main = await loadShard(null);
    return main[id] ?? '';
  }
  return '';
}

export async function getExpertPrompt(expert: Pick<Expert, 'id' | 'systemPrompt'>): Promise<string> {
  if (expert.systemPrompt) return expert.systemPrompt;
  return lookupPrompt(expert.id);
}

export async function buildExpertWithPrompt(expert: Expert, extra = ''): Promise<Expert> {
  const systemPrompt = `${await getExpertPrompt(expert)}${extra}`;
  if (systemPrompt === expert.systemPrompt) return expert;
  return { ...expert, systemPrompt };
}
