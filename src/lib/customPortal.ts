/**
 * 나만의 포탈 (Custom Portal) — 사용자가 URL 템플릿으로 검색 엔진 추가.
 *
 * 저장: localStorage
 * 원리: URL 에 `{Q}` 플레이스홀더 → encodeURIComponent(검색어) 치환 → 새 탭.
 */
import type { HeroChipId, HeroSearchChip } from './heroSearchChips';

export interface CustomPortal {
  /** 'custom-portal-{uuid}' 유니크 id. */
  id: string;
  name: string;
  /** 이모지 문자. */
  emoji: string;
  /** 칩 배경색 hex (# 포함). */
  colorHex: string;
  /** URL 템플릿 — `{Q}` 를 검색어로 치환. 예: `https://notion.so/search?q={Q}` */
  urlTemplate: string;
  createdAt: number;
  updatedAt: number;
}

export const CUSTOM_PORTAL_KEY = 'personai.hero.custom_portals';

export const CUSTOM_PORTAL_EMOJI_OPTIONS = [
  '🌐', '🔍', '📚', '📗', '📘', '📕', '📖', '🗂️',
  '💾', '💿', '📺', '🎬', '🎵', '🎮', '🛒', '🏪',
  '💼', '🏛️', '🎓', '📰', '📝', '📊', '💰', '💡',
];

/** 커스텀 포탈 id 판별. */
export function isCustomPortalId(id: string): boolean {
  return id.startsWith('custom-portal-');
}

/** URL 템플릿에 {Q} 가 있는지 검증. */
export function isValidUrlTemplate(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  return trimmed.includes('{Q}');
}

/** 커스텀 포탈 → HeroSearchChip 변환. 히어로 스트립·armed 로직에서 built-in 과 동일 취급. */
export function customPortalToChip(p: CustomPortal): HeroSearchChip {
  return {
    id: p.id as HeroChipId,
    name: p.name,
    icon: { kind: 'text', text: p.emoji },
    ring: p.colorHex,
    circleBg: p.colorHex,
    iconFill: '#FFFFFF',
    external: true,
    urlTemplate: p.urlTemplate,
    greeting: `${p.name}에서 검색해요`,
    subtitle: `${p.name} · 새 탭에서 열림`,
    placeholder: '검색어를 입력하고 Enter…',
  };
}

/** 새 커스텀 포탈 초기값. */
export function newCustomPortalDraft(): Omit<CustomPortal, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: '',
    emoji: '🌐',
    colorHex: '#3B82F6',
    urlTemplate: '',
  };
}
