import type { Expert } from '@/types/expert';
import {
  MODEL_BRAND,
  MODEL_IS_OPENSOURCE,
  REASONING_MODEL_IDS,
  RECOMMENDED_MODEL_IDS,
} from '@/lib/modelTaxonomy';
import {
  FAST_MODEL_IDS,
  FLAGSHIP_MODEL_IDS,
} from '@/lib/expertSelectionGroups';

export const GENERAL_TRAIT_LABELS = [
  ['reasoning', '추론'],
  ['fast', '빠른 응답'],
  ['coding', '코딩'],
  ['search', '검색/리서치'],
  ['opensource', '오픈웨이트'],
] as const;

export const GENERAL_SPEC_LABELS = [
  ['speed-fast', '빠름'],
  ['speed-normal', '보통 속도'],
  ['price-free', '무료'],
  ['price-low', '저비용'],
  ['price-standard', '표준 가격'],
  ['price-premium', '프리미엄'],
  ['context-xl', '1M+ 컨텍스트'],
  ['context-long', '긴 컨텍스트'],
  ['context-standard', '표준 컨텍스트'],
  ['input-text', '텍스트 전용'],
  ['input-vision', '이미지 입력'],
  ['input-file', '파일 입력'],
  ['input-audio-video', '음성/영상 입력'],
] as const;

export const GENERAL_QUICK_FILTER_IDS = [
  'recommended',
  'new',
  'flagship',
  'fast',
  'low-cost',
  'long-context',
  'minor',
  'opensource',
] as const;

export const NEW_GENERAL_MODEL_IDS = new Set([
  'claude',
  'claude-sonnet-4.6',
  'gemini-3.1',
  'grok',
  'qwen-plus',
  'glm',
  'mimo',
  'minimax',
  'kimi',
  'solar',
  'mercury',
]);

const MAJOR_MODEL_BRANDS = new Set(['gpt', 'claude', 'gemini', 'grok', 'perplexity', 'deepseek', 'qwen']);
const FAST_MODEL_ID_SET = new Set<string>(FAST_MODEL_IDS);
const FLAGSHIP_MODEL_ID_SET = new Set<string>(FLAGSHIP_MODEL_IDS);

export function isFastModel(expert: Expert) {
  return FAST_MODEL_ID_SET.has(expert.id) || (expert.abilities?.speed ?? 0) >= 85;
}

export function modelFieldTags(expert: Expert) {
  if (expert.tags && expert.tags.length > 0) return expert.tags.slice(0, 3);
  const fieldsById: Record<string, string[]> = {
    gpt: ['범용', '코딩', '문서'],
    'gpt-mini': ['업무', '요약', '생산성'],
    'gpt-nano': ['즉답', '자동화', '경량'],
    'auto-gpt': ['리서치', '검증', '인용'],
    claude: ['장문', '분석', '기획'],
    'claude-sonnet': ['글쓰기', '업무', '코딩'],
    'claude-sonnet-4.6': ['문서', '기획', '균형'],
    'claude-haiku': ['빠른 응답', '요약', '분류'],
    gemini: ['멀티모달', '업무', '검색'],
    'gemini-3-flash': ['멀티모달', '실시간', '요약'],
    'gemini-3.1': ['경량', '일상', '번역'],
    'gemini-pro': ['추론', '분석', '수학'],
    'gemini-flash-lite': ['경량', '토큰 효율', '일상'],
    perplexity: ['검색', '출처', '리서치'],
    'perplexity-pro': ['심층 리서치', '출처', '보고서'],
    grok: ['대화', '실시간', '유머'],
    'grok-4.2': ['추론', '실시간', '토론'],
    deepseek: ['코딩', '분석', '문제해결'],
    'deepseek-r1': ['추론', '수학', '논리'],
    qwen: ['다국어', '번역', '업무'],
    'qwen-9b': ['오픈웨이트', '경량', '임베드'],
    'qwen-plus': ['다국어', '추론', '글쓰기'],
    'qwen-thinking': ['추론', '수학', '계획'],
    'llama-maverick': ['오픈웨이트', '개발', '자체호스팅'],
    'llama-scout': ['경량', '온디바이스', '빠른 응답'],
    'mistral-large': ['유럽권', '업무', '분석'],
    'mistral-medium': ['균형', '문서', '업무'],
    'mistral-small': ['경량', '빠른 응답', '비용절감'],
    codestral: ['코딩', '리팩터링', '개발'],
    devstral: ['개발', '에이전트', '도구사용'],
    gemma: ['오픈웨이트', '연구', '자체호스팅'],
    phi: ['소형', '추론', '로컬'],
    'command-r-plus': ['RAG', '검색', '출처'],
    'command-a': ['기업업무', '문서', '지식검색'],
    'nova-premier': ['엔터프라이즈', '분석', '멀티모달'],
    'nova-2-lite': ['경량', '긴 컨텍스트', '비용절감'],
    dolphin: ['자유대화', '실험', '오픈웨이트'],
    glm: ['중국어', '대형모델', '업무'],
    mimo: ['모바일', '멀티모달', '중국어'],
    'mimo-flash': ['모바일', '빠른 응답', '경량'],
    nemotron: ['대형모델', '엔터프라이즈', '합성데이터'],
    seed: ['콘텐츠', '음성/미디어', '생성'],
    'seed-mini': ['경량', '콘텐츠', '빠른 응답'],
    minimax: ['멀티모달', '창작', '대화'],
    kimi: ['장문맥', '독해', '문서'],
    'kimi-thinking': ['추론', '장문맥', '분석'],
    solar: ['한국어', '업무', '문서'],
    mercury: ['초고속', '추론', '실시간'],
    hunyuan: ['중국어', '대화', '업무'],
    jamba: ['장문', '엔터프라이즈', '분석'],
    granite: ['기업업무', '보안', '온프레미스'],
    step: ['빠른 응답', '중국어', '일상'],
    palmyra: ['글쓰기', '문서', '긴 컨텍스트'],
    'developer-yjh': ['개발자', '앱 설명', '프로젝트'],
    'ancano-pro': ['프리미엄', '통합', '자동선택'],
  };

  if (fieldsById[expert.id]) return fieldsById[expert.id];
  if (expert.modelInfo?.openWeight || MODEL_IS_OPENSOURCE.has(expert.id)) return ['오픈웨이트', '로컬', '실험'];
  if ((expert.abilities?.contextWindow ?? 0) >= 85) return ['장문맥', '문서', '분석'];
  if (isFastModel(expert)) return ['빠른 응답', '일상', '업무'];
  return ['범용', '대화', '업무'];
}

export function getGeneralModelDisplayTags(expert: Expert) {
  const sourceTags = expert.tags && expert.tags.length > 0 ? expert.tags : modelFieldTags(expert);
  const inputModalities = expert.modelInfo?.inputModalities ?? [];
  const priorityTags = [
    expert.modelInfo?.priceTier === 'free' ? '무료' : null,
    expert.modelInfo?.priceTier === 'low' ? '저비용' : null,
    inputModalities.includes('file') ? '문서입력' : null,
    inputModalities.includes('image') ? '시각입력' : null,
    expert.modelInfo?.openWeight ? '오픈웨이트' : null,
    isFastModel(expert) ? '고속' : null,
  ].filter((tag): tag is string => Boolean(tag) && sourceTags.includes(tag));

  return [...new Set([...priorityTags, ...sourceTags])].slice(0, 3);
}

export function getGeneralTraitIds(expert: Expert) {
  const brand = MODEL_BRAND[expert.id];
  const isOpenWeight = Boolean(expert.modelInfo?.openWeight) || MODEL_IS_OPENSOURCE.has(expert.id);
  const fieldTags = modelFieldTags(expert);
  const isReasoningModel =
    REASONING_MODEL_IDS.includes(expert.id) ||
    fieldTags.some((tag) => tag.includes('수학') || tag.includes('논리'));
  return [
    isReasoningModel ? 'reasoning' : null,
    isFastModel(expert) ? 'fast' : null,
    expert.description.includes('코딩') || fieldTags.some((tag) => tag.includes('코딩') || tag.includes('개발')) ? 'coding' : null,
    brand === 'perplexity' || fieldTags.some((tag) => tag.includes('검색') || tag.includes('출처') || tag.includes('리서치') || tag === 'RAG') ? 'search' : null,
    isOpenWeight ? 'opensource' : null,
  ].filter(Boolean) as string[];
}

export function getGeneralSpecIds(expert: Expert) {
  const priceTier = expert.modelInfo?.priceTier;
  const contextLength = expert.modelInfo?.contextLength ?? 0;
  const inputModalities = expert.modelInfo?.inputModalities ?? ['text'];
  const inputSpecIds = [
    inputModalities.some((modality) => modality !== 'text') ? null : 'input-text',
    inputModalities.includes('image') ? 'input-vision' : null,
    inputModalities.includes('file') ? 'input-file' : null,
    inputModalities.includes('audio') || inputModalities.includes('video') ? 'input-audio-video' : null,
  ].filter(Boolean) as string[];
  return [
    isFastModel(expert) ? 'speed-fast' : 'speed-normal',
    priceTier ? `price-${priceTier}` : MODEL_IS_OPENSOURCE.has(expert.id) ? 'price-free' : 'price-standard',
    contextLength >= 1_000_000 ? 'context-xl' : contextLength >= 262_144 ? 'context-long' : 'context-standard',
    ...inputSpecIds,
  ];
}

export function matchesGeneralQuickFilter(expert: Expert, filterId: string) {
  if (filterId === 'recommended') return RECOMMENDED_MODEL_IDS.includes(expert.id);
  if (filterId === 'new') return NEW_GENERAL_MODEL_IDS.has(expert.id);
  if (filterId === 'flagship') return FLAGSHIP_MODEL_ID_SET.has(expert.id);
  if (filterId === 'fast') return getGeneralSpecIds(expert).includes('speed-fast');
  if (filterId === 'low-cost') return getGeneralSpecIds(expert).some((id) => id === 'price-free' || id === 'price-low');
  if (filterId === 'long-context') return getGeneralSpecIds(expert).some((id) => id === 'context-xl' || id === 'context-long');
  if (filterId === 'minor') {
    const brand = MODEL_BRAND[expert.id] ?? 'other';
    return brand === 'other' || (!MAJOR_MODEL_BRANDS.has(brand) && !FLAGSHIP_MODEL_ID_SET.has(expert.id) && !RECOMMENDED_MODEL_IDS.includes(expert.id));
  }
  if (filterId === 'opensource') return getGeneralTraitIds(expert).includes('opensource');
  return true;
}
