/**
 * 슬라이드 테마 — 색·폰트 폴백 세트.
 *
 * 적용 원칙:
 *  - 슬라이드 배경: slide.background (사용자 명시) > theme.bgColor > '#fff'
 *  - 텍스트 색:  el.textColor (사용자 명시) > theme.textColor > 'rgba(0,0,0,0.85)'
 *  - 텍스트 폰트: el.fontFamily (미지원, 추후) > theme.bodyFontFamily > 시스템 기본
 *
 * 외부 폰트 로딩 X (네트워크 부담 회피). 시스템 폰트 + Pretendard 만 사용.
 */

export interface SlideTheme {
  id: string;
  name: string;
  description?: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  /** 제목 폰트 패밀리 (future use). 현재는 bodyFontFamily 와 동일 적용. */
  headingFontFamily: string;
  bodyFontFamily: string;
}

const PRETENDARD = "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const SERIF = "'Noto Serif KR', 'Times New Roman', Georgia, serif";
const MONO = "'JetBrains Mono', 'Courier New', monospace";

export const SLIDE_THEMES: readonly SlideTheme[] = [
  {
    id: 'default',
    name: '기본',
    description: '깔끔한 흰 배경',
    bgColor: '#ffffff',
    textColor: 'rgba(0,0,0,0.85)',
    accentColor: '#3B82F6',
    headingFontFamily: PRETENDARD,
    bodyFontFamily: PRETENDARD,
  },
  {
    id: 'business',
    name: '비즈니스',
    description: '진중한 네이비',
    bgColor: '#0F1F3D',
    textColor: '#F5F5F5',
    accentColor: '#D4A24C',
    headingFontFamily: SERIF,
    bodyFontFamily: SERIF,
  },
  {
    id: 'soft',
    name: '소프트',
    description: '따스한 크림',
    bgColor: '#FFF8F2',
    textColor: '#3A2A1F',
    accentColor: '#E97777',
    headingFontFamily: PRETENDARD,
    bodyFontFamily: PRETENDARD,
  },
  {
    id: 'dark',
    name: '다크',
    description: '집중하기 좋은 검정',
    bgColor: '#0A0A0A',
    textColor: '#E5E7EB',
    accentColor: '#22D3EE',
    headingFontFamily: PRETENDARD,
    bodyFontFamily: PRETENDARD,
  },
  {
    id: 'minimal',
    name: '미니멀',
    description: '회색조 모노톤',
    bgColor: '#FAFAFA',
    textColor: '#1F2937',
    accentColor: '#6B7280',
    headingFontFamily: PRETENDARD,
    bodyFontFamily: PRETENDARD,
  },
  {
    id: 'warm',
    name: '워밍',
    description: '베이지 + 명조',
    bgColor: '#F5EDDC',
    textColor: '#3F2E1E',
    accentColor: '#C97B36',
    headingFontFamily: SERIF,
    bodyFontFamily: SERIF,
  },
  {
    id: 'mono',
    name: '모노',
    description: '타자기 분위기',
    bgColor: '#F4F4F0',
    textColor: '#1A1A1A',
    accentColor: '#666666',
    headingFontFamily: MONO,
    bodyFontFamily: MONO,
  },
  {
    id: 'navy',
    name: '네이비라이트',
    description: '잔잔한 청회색',
    bgColor: '#EAF1F8',
    textColor: '#1F3A5F',
    accentColor: '#2563EB',
    headingFontFamily: PRETENDARD,
    bodyFontFamily: PRETENDARD,
  },
];

export const DEFAULT_THEME_ID = 'default';

const THEME_MAP = new Map<string, SlideTheme>(SLIDE_THEMES.map((t) => [t.id, t]));

export function getTheme(id: string | undefined | null): SlideTheme {
  if (!id) return THEME_MAP.get(DEFAULT_THEME_ID)!;
  return THEME_MAP.get(id) ?? THEME_MAP.get(DEFAULT_THEME_ID)!;
}

// ─────────────────────────────────────────────
// 폴백 resolver — 슬라이드/요소 + 테마 → 실제 적용값
// ─────────────────────────────────────────────

/** 슬라이드 배경 폴백: slide.background > theme.bgColor > '#fff'. */
export function resolveSlideBackground(
  slideBackground: string | undefined,
  theme: SlideTheme,
): string {
  return slideBackground ?? theme.bgColor;
}

/** 텍스트 요소 색 폴백: el.textColor > theme.textColor > 기본. */
export function resolveTextColor(
  elTextColor: string | undefined,
  theme: SlideTheme,
): string {
  return elTextColor ?? theme.textColor;
}

/** 텍스트 요소 폰트 폴백: theme.bodyFontFamily. (요소별 fontFamily 는 추후 도입) */
export function resolveTextFontFamily(theme: SlideTheme, elFontFamily?: string): string {
  return elFontFamily ?? theme.bodyFontFamily;
}
