/**
 * Word/한글 글꼴명 → CSS font-family stack 매핑.
 *
 * .docx 가져올 때 mammoth 가 추출한 글꼴명을 그대로 쓰면 시스템에 없는
 * 글꼴은 브라우저 기본으로 표시됨 (변형의 큰 원인). 여기서 친숙한 fallback
 * stack 으로 정규화해서 "비슷한 톤" 으로라도 보이게.
 *
 * 정책:
 *  - 외부 폰트 fetch ❌ (라이센스·네트워크·CORS)
 *  - OS 일반 글꼴 + 시스템 fallback (sans-serif / serif / monospace) 만
 *  - 원본 글꼴명을 stack 맨 앞에 남겨서 시스템에 우연히 있으면 우선 적용
 */

const KO_SANS = `"맑은 고딕", "Malgun Gothic", "Apple SD Gothic Neo", "Pretendard", system-ui, sans-serif`;
const KO_SERIF = `"함초롬바탕", "Batang", "AppleMyungjo", "Nanum Myeongjo", serif`;
const EN_SANS = `"Calibri", "Helvetica Neue", Arial, system-ui, sans-serif`;
const EN_SERIF = `"Times New Roman", "Times", Georgia, serif`;
const MONO = `"Courier New", Consolas, Menlo, monospace`;

const MAP: Record<string, string> = {
  // 한글 sans
  '맑은 고딕': KO_SANS,
  'Malgun Gothic': KO_SANS,
  '나눔고딕': `"Nanum Gothic", ${KO_SANS}`,
  'Nanum Gothic': `"Nanum Gothic", ${KO_SANS}`,
  'Pretendard': `"Pretendard", ${KO_SANS}`,
  'Apple SD Gothic Neo': KO_SANS,
  '돋움': `"Dotum", ${KO_SANS}`,
  'Dotum': `"Dotum", ${KO_SANS}`,
  '굴림': `"Gulim", "Dotum", ${KO_SANS}`,
  'Gulim': `"Gulim", "Dotum", ${KO_SANS}`,
  // 한글 serif
  '함초롬바탕': KO_SERIF,
  '바탕': `"Batang", ${KO_SERIF}`,
  'Batang': `"Batang", ${KO_SERIF}`,
  '궁서': `"Gungsuh", ${KO_SERIF}`,
  'Gungsuh': `"Gungsuh", ${KO_SERIF}`,
  '나눔명조': `"Nanum Myeongjo", ${KO_SERIF}`,
  'Nanum Myeongjo': `"Nanum Myeongjo", ${KO_SERIF}`,
  'KoPub바탕체': `"KoPubBatang", ${KO_SERIF}`,
  '휴먼명조': KO_SERIF,
  // 영문 sans
  'Calibri': EN_SANS,
  'Arial': `Arial, ${EN_SANS}`,
  'Helvetica': `Helvetica, ${EN_SANS}`,
  'Helvetica Neue': `"Helvetica Neue", ${EN_SANS}`,
  'Verdana': `Verdana, ${EN_SANS}`,
  'Tahoma': `Tahoma, ${EN_SANS}`,
  'Segoe UI': `"Segoe UI", ${EN_SANS}`,
  // 영문 serif
  'Times New Roman': EN_SERIF,
  'Times': EN_SERIF,
  'Georgia': `Georgia, ${EN_SERIF}`,
  'Cambria': `Cambria, ${EN_SERIF}`,
  'Garamond': `Garamond, ${EN_SERIF}`,
  // mono
  'Courier New': MONO,
  'Consolas': MONO,
  'Monaco': MONO,
  'Menlo': MONO,
  'Source Code Pro': `"Source Code Pro", ${MONO}`,
  'D2Coding': `"D2Coding", ${MONO}`,
};

/**
 * Word 글꼴명 → CSS font-family stack.
 *  - 정확 매칭 우선 (대소문자 무시)
 *  - 없으면 원본 + 휴리스틱 fallback (한글 포함이면 KO_SANS, 아니면 EN_SANS)
 */
export function mapFontFamily(raw: string): string {
  const trimmed = raw.trim().replace(/^["']|["']$/g, '');
  if (!trimmed) return KO_SANS;
  if (MAP[trimmed]) return MAP[trimmed];
  const lower = trimmed.toLowerCase();
  for (const key of Object.keys(MAP)) {
    if (key.toLowerCase() === lower) return MAP[key];
  }
  const hasHangul = /[가-힣]/.test(trimmed);
  const fallback = hasHangul ? KO_SANS : EN_SANS;
  return `"${trimmed}", ${fallback}`;
}

/** UI 글꼴 선택기에 노출할 추천 글꼴. label = 표시명, family = 적용값. */
export const PRESET_FONTS: Array<{ label: string; family: string }> = [
  { label: '맑은 고딕',       family: KO_SANS },
  { label: '나눔고딕',         family: `"Nanum Gothic", ${KO_SANS}` },
  { label: 'Pretendard',       family: `"Pretendard", ${KO_SANS}` },
  { label: '바탕',             family: `"Batang", ${KO_SERIF}` },
  { label: '함초롬바탕',       family: KO_SERIF },
  { label: '나눔명조',         family: `"Nanum Myeongjo", ${KO_SERIF}` },
  { label: 'Calibri',          family: EN_SANS },
  { label: 'Arial',            family: `Arial, ${EN_SANS}` },
  { label: 'Times New Roman',  family: EN_SERIF },
  { label: 'Georgia',          family: `Georgia, ${EN_SERIF}` },
  { label: 'Courier New',      family: MONO },
];
