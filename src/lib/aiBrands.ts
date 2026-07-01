/**
 * AI 브랜드 정의 — 히어로 스크린의 8개 대표 AI + 각 브랜드의 시그니처 테마.
 *
 * 각 브랜드는 자체 CSS 변수 스코프(`.brand-{id}`)로 색·폰트·라운드를 오버라이드한다.
 * 실제 값은 `src/styles/brand-themes.css` 에 정의되어 있으며, 이 파일은 메타데이터.
 *
 * 로고 SVG 경로:
 *   - 사용 가능한 것: `simple-icons` 패키지에서 import
 *   - 미지원(OpenAI): 커스텀 path (public trademark identifier)
 *   - 미지원(MS Copilot): siGithubcopilot 로 프록시 (Anthropic 로고 스타일 근접)
 */
import {
  siGooglegemini,
  siPerplexity,
  siDeepseek,
} from 'simple-icons';

export type BrandId =
  | 'gpt'
  | 'claude'
  | 'gemini'
  | 'perplexity'
  | 'grok'
  | 'deepseek'
  | 'kimi'
  | 'mistral';

export interface BrandIcon {
  /** SVG viewBox 은 항상 "0 0 24 24" (simple-icons 규격). */
  path?: string;
  /** SVG path 대신 텍스트 뱃지 (Kimi 처럼 로고가 미지원인 경우). */
  text?: string;
  /** 로고 원본 컬러 (hex, no #). fill 로 사용. */
  hex: string;
  /**
   * 실제 브랜드 로고 파일 경로 (앱 내 /public/logos/*).
   * 지정 시 BrandLogo 가 path 대신 <img> 로 렌더.
   */
  imgUrl?: string;
}

/** 브랜드 안의 개별 모델 변형 — GPT-5.4 / GPT-5.4 Mini 등. */
export interface BrandModel {
  /** 앱 내 expert ID (types/expert.ts 의 EXPERTS 항목과 일치). */
  id: string;
  /** 사용자에게 보일 이름 — "GPT-5.4", "Claude Opus 4.6". */
  name: string;
  /** 짧은 설명 — "최상위 추론", "고속 만능". */
  description?: string;
  /** 브랜드 안의 기본 모델 여부 — 초기 selectedModel 후보. */
  isDefault?: boolean;
}

export interface Brand {
  id: BrandId;
  /** 히어로 상단·칩 라벨 (짧은 이름). */
  name: string;
  /** 프로바이더 (부제 등에 사용). */
  provider: string;
  /** 3자 이내 이니셜 (로고 로딩 실패 시 폴백). */
  initials: string;
  icon: BrandIcon;
  /** 히어로 테마가 다크 계열인지 (사이드바 톤 결정 참고용). */
  isDark: boolean;
  /**
   * 브랜드 진입 시 폴백 expert ID (models 미로드/미선택 시).
   * 사용자가 특정 모델을 골랐다면 그 model.id 가 우선.
   */
  expertId: string;
  /** 브랜드가 지원하는 모델 변형들. models[0] 이 기본. */
  models: BrandModel[];
  /** 브랜드 성격이 드러나는 히어로 헤드라인. */
  greeting: string;
  /** 헤드라인 밑 서브 카피 — 브랜드 강점 한 줄. */
  subtitle: string;
  /** 입력창 placeholder — 브랜드 톤. */
  placeholder: string;
}

/** OpenAI 로고 SVG path (public identifier, viewBox 0 0 24 24). */
const OPENAI_PATH =
  'M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z';

/**
 * Claude / Anthropic 실제 asterisk 마크 (Claude 앱·Claude Code 아이콘).
 * 8-arm 스타버스트 형태 · viewBox 0 0 24 24 · single closed path.
 * 유저 요청: simple-icons/anthropic 의 "A" 스월 대신 실제 asterisk 로.
 */
const CLAUDE_ASTERISK_PATH =
  'M12 2 L12.77 10.15 L19.07 4.93 L13.85 11.23 L22 12 L13.85 12.77 L19.07 19.07 L12.77 13.85 L12 22 L11.23 13.85 L4.93 19.07 L10.15 12.77 L2 12 L10.15 11.23 L4.93 4.93 L11.23 10.15 Z';

export const BRANDS: readonly Brand[] = [
  {
    id: 'gpt',
    name: 'GPT',
    provider: 'OpenAI',
    initials: 'GPT',
    icon: { path: OPENAI_PATH, hex: '10A37F', imgUrl: '/logos/gpt.svg' },
    isDark: true,
    expertId: 'gpt',
    models: [
      { id: 'gpt',      name: 'GPT-5.4',      description: '최상위 추론',   isDefault: true },
      { id: 'gpt-mini', name: 'GPT-5.4 Mini', description: '고속 범용' },
      { id: 'gpt-nano', name: 'GPT-5.4 Nano', description: '초경량 즉답' },
    ],
    greeting: '무엇을 도와드릴까요?',
    subtitle: 'OpenAI · 넓은 지식, 안정된 답변',
    placeholder: '무엇이든 물어보세요',
  },
  {
    id: 'claude',
    name: 'Claude',
    provider: 'Anthropic',
    initials: 'Cl',
    // Claude 실제 asterisk 마크 (Claude/Claude Code 앱 아이콘 8-arm 스타버스트).
    // simple-icons/anthropic 의 "A" 스월 대신 실제 유저 앱에서 보는 마크로.
    icon: { path: CLAUDE_ASTERISK_PATH, hex: 'D97757' },
    isDark: false,
    expertId: 'claude',
    models: [
      { id: 'claude',             name: 'Claude Opus 4.6',    description: '최고 지능',   isDefault: true },
      { id: 'claude-sonnet-4.6',  name: 'Claude Sonnet 4.6',  description: '최신 균형' },
      { id: 'claude-sonnet',      name: 'Claude Sonnet 4.5',  description: '균형 만능' },
      { id: 'claude-haiku',       name: 'Claude Haiku 4.5',   description: '초고속 경량' },
    ],
    greeting: '함께 생각해봐요.',
    subtitle: 'Anthropic · 긴 맥락과 뉘앙스',
    placeholder: '천천히 정리해서 말해보세요…',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    provider: 'Google',
    initials: 'Ge',
    icon: { path: siGooglegemini.path, hex: siGooglegemini.hex, imgUrl: '/logos/gemini.svg' },
    isDark: true,
    expertId: 'gemini',
    models: [
      { id: 'gemini-pro',         name: 'Gemini 3.1 Pro',      description: '최상위 프로', isDefault: true },
      { id: 'gemini-3-flash',     name: 'Gemini 3 Flash',      description: '차세대 고속' },
      { id: 'gemini-3.1',         name: 'Gemini 3.1 Lite',     description: '초경량 최신' },
      { id: 'gemini',             name: 'Gemini 2.5 Flash',    description: '고속 만능' },
      { id: 'gemini-flash-lite',  name: 'Gemini 2.5 Flash Lite', description: '초경량 가성비' },
    ],
    greeting: '어디서부터 시작할까요?',
    subtitle: 'Google · 검색·이미지·코드 통합',
    placeholder: '이미지·문서·링크 뭐든 붙여도 돼요',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    provider: 'Perplexity AI',
    initials: 'Px',
    icon: { path: siPerplexity.path, hex: siPerplexity.hex, imgUrl: '/logos/perplexity.svg' },
    isDark: true,
    expertId: 'perplexity',
    models: [
      { id: 'perplexity-pro', name: 'Sonar Pro', description: '심층 리서치', isDefault: true },
      { id: 'perplexity',     name: 'Sonar',     description: '검색·리서치' },
    ],
    greeting: '무엇을 조사할까요?',
    subtitle: 'Perplexity · 실시간 검색 + 출처',
    placeholder: '조사할 주제를 알려주세요',
  },
  {
    id: 'grok',
    name: 'Grok',
    provider: 'xAI',
    initials: 'Gk',
    // simple-icons 의 siX 는 X.com 트위터 로고임 (Grok 마크가 아님).
    // 오픈 Grok SVG 가 없어 텍스트 뱃지 G 로 통일 (칩·워터마크 일관).
    icon: { text: 'G', hex: 'E0E0EE' },
    isDark: true,
    expertId: 'grok',
    models: [
      { id: 'grok',     name: 'Grok 4.3', description: '최신 고성능', isDefault: true },
      { id: 'grok-4.2', name: 'Grok 4.2', description: '추론 특화' },
    ],
    greeting: '뭐가 궁금해?',
    subtitle: 'xAI · 직설·유머·최신 X',
    placeholder: '거리낌 없이 물어봐',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    provider: 'DeepSeek',
    initials: 'DS',
    // deepseek PNG 는 filter: brightness(0) invert(1) 적용 시 edge anti-alias 뿌옇게 나옴.
    // simple-icons SVG path 만 사용 (칩·워터마크 모두 vector 로 clean).
    icon: { path: siDeepseek.path, hex: siDeepseek.hex },
    isDark: true,
    expertId: 'deepseek',
    models: [
      { id: 'deepseek',    name: 'DeepSeek V3', description: '심층 분석',   isDefault: true },
      { id: 'deepseek-r1', name: 'DeepSeek R1', description: '추론 특화' },
    ],
    greeting: '깊이 파고들어봐요.',
    subtitle: 'DeepSeek · 추론·수학·코드 특화',
    placeholder: '문제·코드·개념 정리…',
  },
  {
    id: 'kimi',
    name: 'Kimi',
    provider: 'Moonshot AI',
    initials: 'Ki',
    // 로고 미지원 → 텍스트 뱃지 K. 컬러는 Moonshot 시그니처 퍼플.
    icon: { text: 'K', hex: '7C3AED' },
    isDark: true,
    expertId: 'kimi',
    models: [
      { id: 'kimi',           name: 'Kimi K2',       description: '긴 맥락 · 200K 컨텍스트', isDefault: true },
      { id: 'kimi-thinking',  name: 'Kimi Thinking', description: '추론 · 심층 분석' },
    ],
    greeting: '길게 이야기해요.',
    subtitle: 'Moonshot · 초장문 컨텍스트 · 한중일 강함',
    placeholder: '긴 문서·복잡한 대화 뭐든 붙여봐요',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    provider: 'Mistral AI',
    initials: 'Mi',
    // siMistralai / mistral.png 는 무지개색 세로 막대(rainbow bars) 로고 — 네모 형태라
    // 워터마크로 확대 시 네모가 눈에 띔. 유저 요청으로 텍스트 M 뱃지 사용.
    icon: { text: 'M', hex: 'FA520F' },
    isDark: false,
    expertId: 'mistral-large',
    models: [
      { id: 'mistral-large',  name: 'Mistral Large 3',   description: '최상위',       isDefault: true },
      { id: 'mistral-medium', name: 'Mistral Medium 3.1', description: '균형 만능' },
      { id: 'mistral-small',  name: 'Mistral Small 4',   description: '경량 고속' },
    ],
    greeting: '빠르게, 정확하게.',
    subtitle: 'Mistral · 유럽의 경량·강한 모델',
    placeholder: '짧고 명확한 답을 원하시면…',
  },
];

export const BRAND_BY_ID: Record<BrandId, Brand> = Object.fromEntries(
  BRANDS.map((b) => [b.id, b]),
) as Record<BrandId, Brand>;

export const DEFAULT_BRAND: BrandId = 'gpt';

/** localStorage 키 — 선택된 대표 AI 브랜드. */
export const SELECTED_BRAND_KEY = 'personai.hero.selected_brand';

/** localStorage 키 prefix — 브랜드별 선택된 모델. `${prefix}${brandId}`. */
export const SELECTED_MODEL_KEY_PREFIX = 'personai.hero.selected_model.';

/** 특정 브랜드의 기본 모델 (isDefault 우선, 없으면 첫 항목). */
export function getDefaultModel(brand: Brand): BrandModel {
  return brand.models.find((m) => m.isDefault) ?? brand.models[0];
}
