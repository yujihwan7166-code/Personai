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
  siAnthropic,
  siGooglegemini,
  siPerplexity,
  siX,
  siDeepseek,
  siGithubcopilot,
  siMistralai,
} from 'simple-icons';

export type BrandId =
  | 'gpt'
  | 'claude'
  | 'gemini'
  | 'perplexity'
  | 'grok'
  | 'deepseek'
  | 'copilot'
  | 'mistral';

export interface BrandIcon {
  /** SVG viewBox 은 항상 "0 0 24 24" (simple-icons 규격). */
  path: string;
  /** 로고 원본 컬러 (hex, no #). fill 로 사용. */
  hex: string;
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
   * 이 브랜드가 대응되는 앱 내 expert ID.
   * Index.tsx 에서 startDiscussion(question, [expertId]) 형태로 라우팅.
   * Copilot 은 앱에 자체 expert 가 없어 GPT 로 폴백.
   */
  expertId: string;
}

/** OpenAI 로고 SVG path (public identifier, viewBox 0 0 24 24). */
const OPENAI_PATH =
  'M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z';

export const BRANDS: readonly Brand[] = [
  {
    id: 'gpt',
    name: 'GPT',
    provider: 'OpenAI',
    initials: 'GPT',
    icon: { path: OPENAI_PATH, hex: '10A37F' },
    isDark: true,
    expertId: 'gpt',
  },
  {
    id: 'claude',
    name: 'Claude',
    provider: 'Anthropic',
    initials: 'Cl',
    icon: { path: siAnthropic.path, hex: siAnthropic.hex },
    isDark: false,
    expertId: 'claude',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    provider: 'Google',
    initials: 'Ge',
    icon: { path: siGooglegemini.path, hex: siGooglegemini.hex },
    isDark: true,
    expertId: 'gemini',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    provider: 'Perplexity AI',
    initials: 'Px',
    icon: { path: siPerplexity.path, hex: siPerplexity.hex },
    isDark: true,
    expertId: 'perplexity',
  },
  {
    id: 'grok',
    name: 'Grok',
    provider: 'xAI',
    initials: 'Gk',
    icon: { path: siX.path, hex: 'FFFFFF' },
    isDark: true,
    expertId: 'grok',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    provider: 'DeepSeek',
    initials: 'DS',
    icon: { path: siDeepseek.path, hex: siDeepseek.hex },
    isDark: true,
    expertId: 'deepseek',
  },
  {
    id: 'copilot',
    name: 'Copilot',
    provider: 'Microsoft',
    initials: 'Co',
    icon: { path: siGithubcopilot.path, hex: '0078D4' },
    isDark: true,
    // MS Copilot 은 앱에 자체 expert 없음 — GPT 로 폴백 (Copilot 은 GPT-4 기반).
    expertId: 'gpt',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    provider: 'Mistral AI',
    initials: 'Mi',
    icon: { path: siMistralai.path, hex: siMistralai.hex },
    isDark: true,
    expertId: 'mistral-large',
  },
];

export const BRAND_BY_ID: Record<BrandId, Brand> = Object.fromEntries(
  BRANDS.map((b) => [b.id, b]),
) as Record<BrandId, Brand>;

export const DEFAULT_BRAND: BrandId = 'gpt';

/** localStorage 키 — 선택된 대표 AI 브랜드. */
export const SELECTED_BRAND_KEY = 'personai.hero.selected_brand';
