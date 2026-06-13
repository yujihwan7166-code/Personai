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

function formatContextLength(contextLength?: number) {
  if (!contextLength || contextLength <= 0) return null;
  if (contextLength >= 1_000_000) return `${Math.round(contextLength / 1_000_000)}M 토큰`;
  if (contextLength >= 1000) return `${Math.round(contextLength / 1000)}K 토큰`;
  return `${contextLength} 토큰`;
}

function buildModelMetadataPrompt(expert: Pick<Expert,
  'id'
  | 'systemPrompt'
  | 'name'
  | 'nameKo'
  | 'description'
  | 'tags'
  | 'modelInfo'
  | 'openrouterModel'
>) {
  const name = expert.nameKo || expert.name || expert.id;
  const provider = expert.modelInfo?.provider ?? 'OpenRouter';
  const tags = expert.tags?.length ? expert.tags.join(', ') : '범용 대화';
  const contextLength = formatContextLength(expert.modelInfo?.contextLength);
  const inputModalities = expert.modelInfo?.inputModalities?.join(', ') || 'text';
  const openWeightNote = expert.modelInfo?.openWeight ? '오픈웨이트 모델 특성을 고려해 배포/비용/커스터마이징 관점도 함께 설명합니다.' : '';
  const modelLine = expert.openrouterModel ? `OpenRouter 모델 ID: ${expert.openrouterModel}` : '';

  return `당신은 ${provider}의 ${name} 모델입니다. 사용자의 질문에 한국어로 자연스럽고 정확하게 답하세요.

모델 정보:
- 설명: ${expert.description || `${provider} 계열 일반 AI 모델`}
- 태그: ${tags}
${contextLength ? `- 문맥 길이: ${contextLength}` : ''}
- 입력 형식: ${inputModalities}
${modelLine ? `- ${modelLine}` : ''}
${openWeightNote ? `- ${openWeightNote}` : ''}

답변 방식:
- 질문 의도를 먼저 파악하고, 필요한 경우 결론부터 말한 뒤 근거와 절차를 이어서 설명합니다.
- ${tags} 성격에 맞는 답변 깊이와 형식을 선택합니다.
- 확실하지 않은 최신 사실, 가격, 일정, 법률·의학·금융 정보는 단정하지 말고 확인 필요성을 밝힙니다.
- 코드나 분석을 요청받으면 실행 가능한 단계, 예시, 검증 방법을 함께 제시합니다.`;
}

export async function getExpertPrompt(expert: Pick<Expert,
  'id'
  | 'systemPrompt'
  | 'name'
  | 'nameKo'
  | 'description'
  | 'tags'
  | 'modelInfo'
  | 'openrouterModel'
>): Promise<string> {
  if (expert.systemPrompt) return expert.systemPrompt;
  const prompt = await lookupPrompt(expert.id);
  return prompt || buildModelMetadataPrompt(expert);
}

export async function buildExpertWithPrompt(expert: Expert, extra = ''): Promise<Expert> {
  const systemPrompt = `${await getExpertPrompt(expert)}${extra}`;
  if (systemPrompt === expert.systemPrompt) return expert;
  return { ...expert, systemPrompt };
}
