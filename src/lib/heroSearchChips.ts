/**
 * 히어로 좌측 검색 칩 — 4개 (네이버·구글·다음·북마크).
 *
 * 검색 칩은 "armed" 상태로 전환 → 사용자가 입력하고 Enter 시 새 탭으로 리다이렉트.
 * 북마크만 예외: 외부 이동 대신 앱 내부 북마크 모달 오픈.
 *
 * 기존 `searchEngines.ts` 의 SEARCH_ENGINES 는 QuickSearchBar 에서 사용 중이라
 * 건드리지 않고, 히어로 전용 UI 메타(색·아이콘 모양)만 여기에 정의.
 */
import { siNaver, siGoogle } from 'simple-icons';
import { findEngine, buildSearchUrl } from './searchEngines';

export type HeroChipId = 'naver' | 'google' | 'daum' | 'bookmark';

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
   * 외부 이동 여부. false = 앱 내부 액션 (북마크).
   * true 일 때는 findEngine(id) 로 URL 템플릿을 가져와 buildSearchUrl 로 조립.
   */
  external: boolean;
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
  },
  {
    id: 'google',
    name: '구글',
    icon: { kind: 'svg', path: siGoogle.path },
    ring: '#4285F4',
    circleBg: '#FFFFFF',
    iconFill: `#${siGoogle.hex}`,
    external: true,
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
  },
  {
    id: 'bookmark',
    name: '북마크',
    icon: { kind: 'lucide', lucide: 'Star' },
    ring: '#FBBF24',
    circleBg: 'transparent',
    iconFill: '#FBBF24',
    external: false,
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
  const engine = findEngine(chipId);
  if (!engine) return null;
  const trimmed = query.trim();
  if (!trimmed) return null;
  return buildSearchUrl(engine, trimmed);
}
