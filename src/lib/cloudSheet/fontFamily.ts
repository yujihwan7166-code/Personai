/** 셀 폰트 패밀리 타입 + 화면 라벨 / CSS family 매핑 + 크기 상수. */

export type FontFamily = 'pretendard' | 'inter' | 'arial' | 'noto-sans' | 'georgia' | 'jetbrains';

export const FONT_FAMILY_LABEL: Record<FontFamily, string> = {
  pretendard: 'Pretendard',
  inter: 'Inter',
  arial: 'Arial',
  'noto-sans': 'Noto Sans',
  georgia: 'Georgia',
  jetbrains: 'JetBrains Mono',
};

export const FONT_FAMILY_CSS: Record<FontFamily, string> = {
  pretendard: '"Pretendard Variable", Pretendard, system-ui, sans-serif',
  inter: 'Inter, system-ui, sans-serif',
  arial: 'Arial, Helvetica, sans-serif',
  'noto-sans': '"Noto Sans KR", "Noto Sans", sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  jetbrains: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
};

export const FONT_SIZE_MIN = 8;
export const FONT_SIZE_MAX = 48;
export const FONT_SIZE_DEFAULT = 13;
