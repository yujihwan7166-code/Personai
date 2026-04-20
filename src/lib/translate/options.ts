// 번역 옵션 — UI·프롬프트가 공유하는 단일 진실원

export type TranslateTone = 'basic' | 'formal' | 'casual' | 'literary';
export type TranslateDocType =
  | 'general' | 'email' | 'presentation' | 'paper' | 'subtitle' | 'social' | 'contract';
export type TranslateDomain = 'general' | 'it' | 'legal' | 'medical' | 'finance' | 'marketing';
export type TranslateHonorific = 'casual' | 'neutral' | 'formal' | 'ultra-formal' | null;
export type TranslateLength = 'concise' | 'balanced' | 'detailed';
export type TranslateReadingLevel = 'elementary' | 'general' | 'expert';
export type TranslateFaithfulness = 'literal' | 'balanced' | 'liberal';

export interface TranslateOptions {
  tone: TranslateTone;
  docType: TranslateDocType;
  domain: TranslateDomain;
  honorific: TranslateHonorific;
  length: TranslateLength;
  readingLevel: TranslateReadingLevel;
  faithfulness: TranslateFaithfulness;
  preserveEmoji: boolean;
  preserveFormat: boolean;
  parenthesizeTechTerms: boolean;
}

export const DEFAULT_TRANSLATE_OPTIONS: TranslateOptions = {
  tone: 'basic',
  docType: 'general',
  domain: 'general',
  honorific: null,
  length: 'balanced',
  readingLevel: 'general',
  faithfulness: 'balanced',
  preserveEmoji: true,
  preserveFormat: true,
  parenthesizeTechTerms: false,
};

// ───── 라벨 맵 ─────
export const TONE_LABELS: Record<TranslateTone, { label: string; description: string }> = {
  basic: { label: '기본', description: '자연스러운 표준' },
  formal: { label: '공식', description: '비즈니스·격식' },
  casual: { label: '캐주얼', description: '친근한 구어체' },
  literary: { label: '문학적', description: '소설·시 느낌' },
};

export const DOC_TYPE_LABELS: Record<TranslateDocType, { label: string; icon: string }> = {
  general: { label: '일반', icon: '📝' },
  email: { label: '이메일', icon: '✉️' },
  presentation: { label: '발표', icon: '🎤' },
  paper: { label: '논문', icon: '📄' },
  subtitle: { label: '자막', icon: '🎬' },
  social: { label: 'SNS', icon: '💬' },
  contract: { label: '계약서', icon: '📋' },
};

export const DOMAIN_LABELS: Record<TranslateDomain, string> = {
  general: '일반',
  it: 'IT·개발',
  legal: '법률',
  medical: '의료',
  finance: '금융',
  marketing: '마케팅',
};

export const LENGTH_LABELS: Record<TranslateLength, string> = {
  concise: '간결',
  balanced: '균형',
  detailed: '상세',
};

export const READING_LEVEL_LABELS: Record<TranslateReadingLevel, string> = {
  elementary: '쉬움',
  general: '보통',
  expert: '전문가',
};

export const FAITHFULNESS_LABELS: Record<TranslateFaithfulness, string> = {
  literal: '직역',
  balanced: '중간',
  liberal: '의역',
};

export const HONORIFIC_LABELS: Record<Exclude<TranslateHonorific, null>, string> = {
  casual: '반말',
  neutral: '보통',
  formal: '존댓말',
  'ultra-formal': '극존칭',
};

// ───── 프리셋 ─────
export interface TranslatePreset {
  id: string;
  label: string;
  icon: string;
  description: string;
  options: Partial<TranslateOptions>;
}

export const BUILTIN_PRESETS: TranslatePreset[] = [
  {
    id: 'business-email', label: '비즈니스 이메일', icon: '📧', description: '공식적이고 정중한 이메일 톤',
    options: { tone: 'formal', docType: 'email', honorific: 'formal', faithfulness: 'balanced', length: 'balanced' },
  },
  {
    id: 'casual-chat', label: '캐주얼 대화', icon: '💬', description: 'SNS·카톡처럼 친근하게',
    options: { tone: 'casual', docType: 'social', honorific: 'casual', faithfulness: 'liberal', length: 'concise' },
  },
  {
    id: 'academic-paper', label: '학술 논문', icon: '📄', description: '객관적·정확한 학술 표현',
    options: { tone: 'formal', docType: 'paper', honorific: 'formal', faithfulness: 'balanced', length: 'detailed', readingLevel: 'expert', parenthesizeTechTerms: true },
  },
  {
    id: 'subtitle', label: '자막', icon: '🎬', description: '짧고 읽기 쉬운 자막',
    options: { tone: 'basic', docType: 'subtitle', faithfulness: 'liberal', length: 'concise' },
  },
  {
    id: 'contract', label: '계약서', icon: '📋', description: '정확하고 보수적인 법률 표현',
    options: { tone: 'formal', docType: 'contract', domain: 'legal', honorific: 'formal', faithfulness: 'literal', length: 'detailed', readingLevel: 'expert' },
  },
  {
    id: 'blog', label: '블로그·콘텐츠', icon: '✍️', description: '자연스럽고 친근한 글',
    options: { tone: 'basic', docType: 'general', honorific: 'formal', faithfulness: 'liberal', length: 'balanced' },
  },
  {
    id: 'literary', label: '문학·창작', icon: '🎭', description: '감성적이고 창의적인 표현',
    options: { tone: 'literary', docType: 'general', faithfulness: 'liberal', length: 'detailed' },
  },
];

// ───── 프리셋 ↔ 옵션 비교 ─────
export function isPresetMatched(preset: TranslatePreset, options: TranslateOptions): boolean {
  return (Object.entries(preset.options) as Array<[keyof TranslateOptions, unknown]>).every(
    ([key, value]) => options[key] === value,
  );
}

export function applyPreset(preset: TranslatePreset, prev: TranslateOptions): TranslateOptions {
  return { ...prev, ...preset.options };
}

// ───── 현재 프리셋 상태 판별 ─────
// 기본값 / 빌트인 매칭 / 빌트인 수정됨 / 유저 매칭 / 유저 수정됨 / 완전 커스텀
export type PresetState =
  | { kind: 'default' }
  | { kind: 'builtin-exact'; preset: TranslatePreset }
  | { kind: 'builtin-modified'; preset: TranslatePreset; modifiedCount: number }
  | { kind: 'user-exact'; preset: { id: string; label: string } }
  | { kind: 'user-modified'; preset: { id: string; label: string }; modifiedCount: number }
  | { kind: 'custom'; customCount: number };

export function countCustomizations(options: TranslateOptions): number {
  return (Object.keys(DEFAULT_TRANSLATE_OPTIONS) as Array<keyof TranslateOptions>)
    .filter((k) => options[k] !== DEFAULT_TRANSLATE_OPTIONS[k]).length;
}

export function getCurrentPresetLabel(
  options: TranslateOptions,
  userPresets: UserPreset[],
): PresetState {
  const optionKeys = Object.keys(DEFAULT_TRANSLATE_OPTIONS) as Array<keyof TranslateOptions>;

  // 1) 기본값 전부와 동일
  const isDefault = optionKeys.every((k) => options[k] === DEFAULT_TRANSLATE_OPTIONS[k]);
  if (isDefault) return { kind: 'default' };

  // 2) 유저 프리셋 완전 일치
  for (const up of userPresets) {
    const allMatch = optionKeys.every((k) => options[k] === up.options[k]);
    if (allMatch) return { kind: 'user-exact', preset: { id: up.id, label: up.label } };
  }

  // 3) 빌트인 프리셋 완전 일치 (preset.options 키만 비교)
  for (const bp of BUILTIN_PRESETS) {
    if (isPresetMatched(bp, options)) return { kind: 'builtin-exact', preset: bp };
  }

  // 4) 빌트인 수정됨 — 가장 많이 일치하는 프리셋 찾기
  let bestBp: TranslatePreset | null = null;
  let bestBpMatchCount = 0;
  let bestBpTotal = 0;
  for (const bp of BUILTIN_PRESETS) {
    const keys = Object.keys(bp.options) as Array<keyof TranslateOptions>;
    const matchCount = keys.filter((k) => options[k] === bp.options[k]).length;
    const diff = keys.length - matchCount;
    const threshold = Math.max(1, Math.ceil(keys.length / 2));
    // 최소 절반 이상 일치 + 차이 3개 이하일 때만 "수정됨" 취급
    if (matchCount >= threshold && diff > 0 && diff <= 3 && matchCount > bestBpMatchCount) {
      bestBp = bp;
      bestBpMatchCount = matchCount;
      bestBpTotal = keys.length;
    }
  }
  if (bestBp) {
    const modifiedCount = bestBpTotal - bestBpMatchCount;
    return { kind: 'builtin-modified', preset: bestBp, modifiedCount };
  }

  // 5) 유저 프리셋 수정됨
  let bestUp: UserPreset | null = null;
  let bestUpMatchCount = 0;
  for (const up of userPresets) {
    const matchCount = optionKeys.filter((k) => options[k] === up.options[k]).length;
    const diff = optionKeys.length - matchCount;
    if (diff > 0 && diff <= 3 && matchCount > bestUpMatchCount) {
      bestUp = up;
      bestUpMatchCount = matchCount;
    }
  }
  if (bestUp) {
    return { kind: 'user-modified', preset: { id: bestUp.id, label: bestUp.label }, modifiedCount: optionKeys.length - bestUpMatchCount };
  }

  // 6) 완전 커스텀
  return { kind: 'custom', customCount: countCustomizations(options) };
}

export function presetStateToText(state: PresetState): { icon: string; label: string; sub?: string } {
  switch (state.kind) {
    case 'default': return { icon: '⚙️', label: '번역 옵션' };
    case 'builtin-exact': return { icon: state.preset.icon, label: state.preset.label };
    case 'builtin-modified': return { icon: state.preset.icon, label: state.preset.label, sub: '수정됨' };
    case 'user-exact': return { icon: '💾', label: state.preset.label };
    case 'user-modified': return { icon: '💾', label: state.preset.label, sub: '수정됨' };
    case 'custom': return { icon: '✨', label: '커스텀', sub: `변경 ${state.customCount}개` };
  }
}

// ───── 사용자 프리셋 (localStorage) ─────
const USER_PRESETS_KEY = 'translate-user-presets-v1';
const USER_PRESETS_MAX = 5;

export interface UserPreset {
  id: string;
  label: string;
  createdAt: number;
  options: TranslateOptions;
}

export function loadUserPresets(): UserPreset[] {
  try {
    const raw = localStorage.getItem(USER_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserPreset[];
    return Array.isArray(parsed) ? parsed.slice(0, USER_PRESETS_MAX) : [];
  } catch {
    return [];
  }
}

export function saveUserPreset(preset: UserPreset): UserPreset[] {
  const existing = loadUserPresets();
  const next = [preset, ...existing.filter((p) => p.id !== preset.id)].slice(0, USER_PRESETS_MAX);
  try {
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(next));
  } catch {
    // ignore quota
  }
  return next;
}

export function deleteUserPreset(id: string): UserPreset[] {
  const next = loadUserPresets().filter((p) => p.id !== id);
  try {
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

// ───── 프롬프트 힌트 변환 ─────
function toneHint(tone: TranslateTone): string {
  switch (tone) {
    case 'basic': return '';
    case 'formal': return '- 비즈니스·격식을 갖춘 공식적인 표현을 사용하세요.';
    case 'casual': return '- 친근하고 자연스러운 구어체 표현을 사용하세요. 줄임말·편한 표현도 허용.';
    case 'literary': return '- 소설·시에 어울리는 감성적이고 문학적인 표현을 사용하세요.';
  }
}

function docTypeHint(docType: TranslateDocType): string {
  switch (docType) {
    case 'general': return '';
    case 'email': return '- 이메일 톤: 인사·본론·맺음 구조를 유지하고 비즈니스 이메일에 적합한 표현을 사용하세요.';
    case 'presentation': return '- 발표 자료 톤: 간결하고 강조가 분명한 문장으로 번역하세요.';
    case 'paper': return '- 학술 논문 톤: 객관적이고 정확한 학술 표현을 사용하세요.';
    case 'subtitle': return '- 자막 톤: 가능한 짧고 읽기 쉬운 문장으로. 한 줄이 길면 자연스럽게 쪼갤 것.';
    case 'social': return '- SNS 톤: 캐주얼하고 짧게. 이모지·해시태그·줄임말 자연스럽게 사용.';
    case 'contract': return '- 계약서 톤: 법률 계약 용어에 맞는 정확하고 보수적인 표현을 사용하세요.';
  }
}

function domainHint(domain: TranslateDomain): string {
  switch (domain) {
    case 'general': return '';
    case 'it': return '- IT·개발 분야 전문용어를 정확히 사용하세요.';
    case 'legal': return '- 법률 분야 전문용어를 정확히 사용하세요.';
    case 'medical': return '- 의료 분야 전문용어를 정확히 사용하세요.';
    case 'finance': return '- 금융 분야 전문용어를 정확히 사용하세요.';
    case 'marketing': return '- 마케팅 분야 전문용어를 정확히 사용하세요.';
  }
}

function honorificHint(honorific: TranslateHonorific, targetLang: string): string {
  if (!honorific || targetLang !== 'ko') return '';
  switch (honorific) {
    case 'casual': return '- 번역 결과는 반말(해체·하체)로 일관되게 작성하세요.';
    case 'neutral': return '- 번역 결과는 자연스러운 중립 톤으로 작성하세요.';
    case 'formal': return '- 번역 결과는 존댓말(해요체·합니다체)로 일관되게 작성하세요.';
    case 'ultra-formal': return '- 번역 결과는 극존칭(하십시오체·-옵니다)으로 일관되게 작성하세요.';
  }
}

function lengthHint(length: TranslateLength): string {
  switch (length) {
    case 'balanced': return '';
    case 'concise': return '- 원문보다 30~50% 짧게, 핵심만 전달하세요.';
    case 'detailed': return '- 원문의 뉘앙스와 맥락을 풍부하게 살려 자세히 번역하세요.';
  }
}

function readingLevelHint(level: TranslateReadingLevel): string {
  switch (level) {
    case 'general': return '';
    case 'elementary': return '- 초등학생도 이해할 수 있는 쉬운 단어·짧은 문장으로 번역하세요.';
    case 'expert': return '- 해당 분야 전문가 수준의 고급 어휘와 정교한 문장 구조를 사용하세요.';
  }
}

function faithfulnessHint(f: TranslateFaithfulness): string {
  switch (f) {
    case 'balanced': return '';
    case 'literal': return '- 원문 구조·어순을 최대한 유지하며 직역하세요.';
    case 'liberal': return '- 원문의 의미를 살리되 자연스러움을 위해 자유롭게 의역하세요.';
  }
}

export function buildTranslatePrompt(
  sourceLabel: string,
  targetLabel: string,
  targetLangCode: string,
  options: TranslateOptions,
): string {
  const hints = [
    toneHint(options.tone),
    docTypeHint(options.docType),
    domainHint(options.domain),
    honorificHint(options.honorific, targetLangCode),
    lengthHint(options.length),
    readingLevelHint(options.readingLevel),
    faithfulnessHint(options.faithfulness),
    options.preserveFormat ? '- 원본의 줄바꿈·불릿·구조를 그대로 유지하세요.' : '',
    options.preserveEmoji ? '- 원본의 이모지·이모티콘을 그대로 보존하세요.' : '',
    options.parenthesizeTechTerms ? '- 주요 전문용어는 "번역(원문)" 형태로 괄호 병기하세요.' : '',
  ].filter(Boolean).join('\n');

  return `당신은 전문 번역가입니다. ${sourceLabel}에서 ${targetLabel}로 자연스럽게 번역하세요.

기본 규칙:
- 번역 결과만 출력. 설명·해설·따옴표 금지.
- 여러 문장이면 그대로 줄바꿈 유지.${hints ? `\n\n추가 규칙:\n${hints}` : ''}`;
}

// ───── 후처리 (번역 결과 재가공) ─────
export type PostAction = 'shorter' | 'longer' | 'more-formal' | 'more-casual' | 'alternatives';

export function buildPostProcessPrompt(
  action: PostAction,
  sourceLabel: string,
  targetLabel: string,
  originalSource: string,
  currentTranslation: string,
): string {
  const actionHint = (() => {
    switch (action) {
      case 'shorter': return '기존 번역을 핵심만 남기고 30~50% 더 짧게 다시 번역하세요.';
      case 'longer': return '기존 번역의 뉘앙스를 풍부하게 살려 더 자세하게 다시 번역하세요.';
      case 'more-formal': return '기존 번역을 더 공식적이고 격식있는 톤으로 다시 번역하세요.';
      case 'more-casual': return '기존 번역을 더 친근하고 캐주얼한 톤으로 다시 번역하세요.';
      case 'alternatives': return '기존 번역과 다른 3가지 번역 대안을 제시하세요. 각 대안은 줄바꿈으로 구분하고 번호 없이 문장만 작성.';
    }
  })();

  return `당신은 전문 번역가입니다. ${sourceLabel}에서 ${targetLabel}로 번역하되, 아래 지시를 따르세요.

${actionHint}

원문:
${originalSource}

이전 번역:
${currentTranslation}

${action === 'alternatives' ? '3가지 대안을 줄바꿈으로 구분해 출력하세요.' : '재번역 결과만 출력. 설명·해설·따옴표 금지.'}`;
}

export const POST_ACTION_LABELS: Record<PostAction, { label: string; icon: string; description: string }> = {
  'shorter': { label: '더 짧게', icon: '🔁', description: '핵심만 남기고 짧게' },
  'longer': { label: '더 자세히', icon: '📝', description: '뉘앙스 살려 길게' },
  'more-formal': { label: '더 공식적으로', icon: '👔', description: '격식있는 톤으로' },
  'more-casual': { label: '더 친근하게', icon: '😊', description: '캐주얼한 톤으로' },
  'alternatives': { label: '다른 번역 3개', icon: '🔄', description: '대안 3가지 제시' },
};
