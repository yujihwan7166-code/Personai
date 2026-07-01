/**
 * 나만의 AI (Custom AI) — 사용자가 프롬프트/색/이모지 를 커스터마이즈해 만든 AI.
 *
 * localStorage 저장, 히어로 칩 스트립에 built-in 브랜드와 함께 노출.
 * 클릭 시 그 AI 로 morph, 메시지 전송 시 시스템 프롬프트가 앞에 붙어 베이스 모델로 라우팅.
 */
import type { Brand, BrandId } from './aiBrands';

/** 커스텀 AI 데이터 — localStorage 에 이 형태로 저장. */
export interface CustomAi {
  /** 'custom-{uuid}' 형태 유니크 id. */
  id: string;
  name: string;
  description: string;
  /** 이모지 문자 (칩 내부에 표시). */
  emoji: string;
  /** 칩 배경색 hex (# 없이). */
  colorHex: string;
  /** 기반 AI 브랜드 (테마 참조용). */
  baseBrandId: BrandId;
  /** 기반 모델의 expert id (실제 라우팅 대상). */
  baseExpertId: string;
  /** 시스템 프롬프트 — 메시지 앞에 붙는 지시. */
  systemPrompt: string;
  /** 선택: 커스텀 헤드라인. 없으면 description 사용. */
  greeting?: string;
  /** 선택: 커스텀 placeholder. */
  placeholder?: string;
  createdAt: number;
  updatedAt: number;
}

/** localStorage 키. */
export const CUSTOM_AIS_KEY = 'personai.hero.custom_ais';

/** 이모지 팔레트 — creator 에서 고를 것. */
export const CUSTOM_AI_EMOJI_OPTIONS = [
  '🤖', '👔', '🎓', '💼', '🎨', '📚', '🧠', '💡',
  '🚀', '⚡', '🌟', '🔥', '🌊', '🌈', '🌸', '🍀',
  '👨‍💻', '👩‍🔬', '🧙', '🥷', '👨‍🍳', '🧑‍⚕️', '🕵️', '🦸',
];

/** 색 팔레트 — 파스텔·비비드 12색. */
export const CUSTOM_AI_COLOR_OPTIONS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#84CC16', '#10B981', '#14B8A6', '#06B6D4',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
];

/** 커스텀 AI → Brand 형태로 변환 — 히어로 스트립 렌더용. */
export function customAiToBrand(c: CustomAi): Brand & { isCustom: true; systemPrompt: string } {
  return {
    id: c.id as BrandId,   // 런타임은 문자열이라 안전
    name: c.name || '나만의 AI',
    provider: '커스텀',
    initials: (c.name || 'My').slice(0, 2),
    icon: { text: c.emoji, hex: c.colorHex },
    isDark: true,
    expertId: c.baseExpertId,
    models: [
      {
        id: c.baseExpertId,
        name: c.name,
        description: c.description || '나만의 커스텀 AI',
        isDefault: true,
      },
    ],
    greeting: c.greeting || c.description || `${c.name}에게 물어보세요`,
    subtitle: `나만의 AI · ${c.description || '커스텀 프롬프트'}`,
    placeholder: c.placeholder || '무엇이든 물어보세요',
    isCustom: true,
    systemPrompt: c.systemPrompt,
  };
}

/** 커스텀 id 인지 판별. */
export function isCustomBrandId(id: string): boolean {
  return id.startsWith('custom-');
}

/** 새 커스텀 AI 기본값 생성 (creator 초기값). */
export function newCustomAiDraft(): Omit<CustomAi, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: '',
    description: '',
    emoji: '🤖',
    colorHex: '#8B5CF6',
    baseBrandId: 'gpt',
    baseExpertId: 'gpt',
    systemPrompt: '',
    greeting: '',
    placeholder: '',
  };
}
