/**
 * 히어로 좌측 검색 칩 — 검색엔진 + 포탈 (유튜브·트위터·GitHub 등).
 *
 * 각 칩은 "armed" 상태로 전환 → 사용자가 입력하고 Enter 시 새 탭 리다이렉트.
 * `+` 칩은 armed 아님 — 클릭 시 포탈 편집 모달 오픈 (visibleHeroChipIds 관리).
 *
 * 기존 `searchEngines.ts` 의 SEARCH_ENGINES 는 QuickSearchBar 에서 사용 중이라
 * 건드리지 않고, 히어로 전용 UI 메타만 여기에 정의.
 */
import {
  siNaver,
  siGoogle,
  siYoutube,
  siX,
  siGithub,
  siWikipedia,
  siReddit,
  siNamuwiki,
  siStackoverflow,
  siTiktok,
  siInstagram,
} from 'simple-icons';
import { findEngine, buildSearchUrl } from './searchEngines';

export type HeroChipId =
  | 'naver'
  | 'google'
  | 'daum'
  | 'youtube'
  | 'twitter'
  | 'github'
  | 'reddit'
  | 'wikipedia'
  | 'namuwiki'
  | 'stackoverflow'
  | 'tiktok'
  | 'instagram';

export interface HeroChipIcon {
  /** 'svg' — path 사용, 'text' — 배지 텍스트, 'lucide' — 아이콘 이름. */
  kind: 'svg' | 'text' | 'lucide';
  path?: string;
  text?: string;
  lucide?: string;
}

export interface HeroSearchChip {
  id: HeroChipId;
  name: string;
  icon: HeroChipIcon;
  /** 링 색 (칩 hover / active 시). */
  ring: string;
  /** 배경 원 색. */
  circleBg: string;
  /** 아이콘 fill 색 (원 배경 대비). */
  iconFill: string;
  /**
   * 외부 이동 여부. 히어로 v3 부터는 항상 true (북마크 제거).
   * URL 은 findEngine(id) 로 조회 or urlTemplate 직접 사용.
   */
  external: boolean;
  /** 직접 URL 템플릿. `{Q}` 를 검색어로 치환. searchEngines.ts 미등록 칩용. */
  urlTemplate?: string;
  /** 히어로 armed 시 헤드라인 (외부 검색 칩만 사용). */
  greeting?: string;
  /** 히어로 armed 시 서브카피. */
  subtitle?: string;
  /** 입력창 placeholder. */
  placeholder?: string;
}

export const HERO_SEARCH_CHIPS: readonly HeroSearchChip[] = [
  {
    id: 'naver',
    name: '네이버',
    icon: { kind: 'svg', path: siNaver.path },
    ring: '#03C75A',
    circleBg: '#03C75A',
    iconFill: '#FFFFFF',
    external: true,
    greeting: '네이버에서 검색해요',
    subtitle: 'NAVER · 한국어 종합 검색',
    placeholder: '검색어를 입력하고 Enter…',
  },
  {
    id: 'google',
    name: '구글',
    icon: { kind: 'svg', path: siGoogle.path },
    ring: '#4285F4',
    circleBg: '#FFFFFF',
    iconFill: `#${siGoogle.hex}`,
    external: true,
    greeting: '구글에서 검색해요',
    subtitle: 'Google · 글로벌 검색',
    placeholder: '검색어를 입력하고 Enter…',
  },
  {
    id: 'daum',
    // 다음은 simple-icons 미제공 → 텍스트 배지 (Daum 옐로우).
    name: '다음',
    icon: { kind: 'text', text: 'D' },
    ring: '#FFCE00',
    circleBg: '#FFCE00',
    iconFill: '#000000',
    external: true,
    greeting: '다음에서 검색해요',
    subtitle: 'Daum · 한국어 포털 검색',
    placeholder: '검색어를 입력하고 Enter…',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: { kind: 'svg', path: siYoutube.path },
    ring: '#FF0000',
    circleBg: '#FF0000',
    iconFill: '#FFFFFF',
    external: true,
    greeting: 'YouTube 에서 검색',
    subtitle: 'YouTube · 동영상',
    placeholder: '검색어를 입력하고 Enter…',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: { kind: 'svg', path: siX.path },
    ring: '#FFFFFF',
    circleBg: '#000000',
    iconFill: '#FFFFFF',
    external: true,
    urlTemplate: 'https://x.com/search?q={Q}',
    greeting: 'X (트위터) 에서 검색',
    subtitle: 'X · 실시간',
    placeholder: '검색어를 입력하고 Enter…',
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: { kind: 'svg', path: siGithub.path },
    ring: '#181717',
    circleBg: '#181717',
    iconFill: '#FFFFFF',
    external: true,
    urlTemplate: 'https://github.com/search?q={Q}',
    greeting: 'GitHub 에서 검색',
    subtitle: 'GitHub · 코드·저장소',
    placeholder: '검색어를 입력하고 Enter…',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: { kind: 'svg', path: siReddit.path },
    ring: '#FF4500',
    circleBg: '#FF4500',
    iconFill: '#FFFFFF',
    external: true,
    urlTemplate: 'https://www.reddit.com/search/?q={Q}',
    greeting: 'Reddit 에서 검색',
    subtitle: 'Reddit · 커뮤니티 토론',
    placeholder: '검색어를 입력하고 Enter…',
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    icon: { kind: 'svg', path: siWikipedia.path },
    ring: '#000000',
    circleBg: '#FFFFFF',
    iconFill: '#000000',
    external: true,
    greeting: 'Wikipedia 에서 검색',
    subtitle: 'Wikipedia · 백과',
    placeholder: '검색어를 입력하고 Enter…',
  },
  {
    id: 'namuwiki',
    name: '나무위키',
    icon: { kind: 'svg', path: siNamuwiki.path },
    ring: '#008275',
    circleBg: '#008275',
    iconFill: '#FFFFFF',
    external: true,
    urlTemplate: 'https://namu.wiki/Search?q={Q}',
    greeting: '나무위키에서 검색해요',
    subtitle: '나무위키 · 한국어 종합 백과',
    placeholder: '검색어를 입력하고 Enter…',
  },
  {
    id: 'stackoverflow',
    name: 'Stack Overflow',
    icon: { kind: 'svg', path: siStackoverflow.path },
    ring: '#F58025',
    circleBg: '#F58025',
    iconFill: '#FFFFFF',
    external: true,
    urlTemplate: 'https://stackoverflow.com/search?q={Q}',
    greeting: 'Stack Overflow 에서 검색',
    subtitle: 'Stack Overflow · 개발 Q&A',
    placeholder: '에러·API·라이브러리 물어보기…',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: { kind: 'svg', path: siTiktok.path },
    ring: '#FE2C55',
    circleBg: '#000000',
    iconFill: '#FFFFFF',
    external: true,
    urlTemplate: 'https://www.tiktok.com/search?q={Q}',
    greeting: 'TikTok 에서 검색',
    subtitle: 'TikTok · 숏폼 영상',
    placeholder: '검색어를 입력하고 Enter…',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: { kind: 'svg', path: siInstagram.path },
    ring: '#FF0069',
    circleBg: '#FF0069',
    iconFill: '#FFFFFF',
    external: true,
    urlTemplate: 'https://www.instagram.com/explore/tags/{Q}/',
    greeting: 'Instagram 에서 검색',
    subtitle: 'Instagram · 태그 검색',
    placeholder: '해시태그 (# 없이) 입력…',
  },
];

export const HERO_SEARCH_CHIP_BY_ID: Record<HeroChipId, HeroSearchChip> =
  Object.fromEntries(HERO_SEARCH_CHIPS.map((c) => [c.id, c])) as Record<
    HeroChipId,
    HeroSearchChip
  >;

export const ARMED_SEARCH_ENGINE_KEY = 'personai.hero.armed_search_engine';

/**
 * armed 검색 칩에 대해 검색 URL 조립.
 * 반환값이 null 이면 non-external (북마크) 이거나 검색어 비어있음.
 */
export function buildHeroSearchUrl(
  chipId: HeroChipId,
  query: string,
): string | null {
  const chip = HERO_SEARCH_CHIP_BY_ID[chipId];
  if (!chip || !chip.external) return null;
  const trimmed = query.trim();
  if (!trimmed) return null;
  // urlTemplate 이 정의돼 있으면 그걸 우선 사용 (heroSearchChips 자체 URL).
  if (chip.urlTemplate) {
    return chip.urlTemplate.replace('{Q}', encodeURIComponent(trimmed));
  }
  // 폴백 — searchEngines.ts 의 findEngine.
  const engine = findEngine(chipId);
  if (!engine) return null;
  return buildSearchUrl(engine, trimmed);
}
