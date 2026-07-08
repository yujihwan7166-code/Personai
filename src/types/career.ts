/**
 * 스펙 보드 타입 — 성과·자격증·활동을 AI가 분류해 쌓는 개인 자산 보드.
 *
 * SpecItem: 한 줄 입력 하나가 카드 하나.
 *  - raw: 사용자가 입력한 원문 ("정처기 땄음")
 *  - refined: AI가 다듬은 이력서 문장 ("정보처리기사 취득 (2026.07)")
 * SpecCategory: 고정 목록이 아니라 기록에서 자라나는 이력서 섹션.
 */

export const CAREER_CHANGED = 'career:changed';

export interface SpecCategory {
  id: string;
  name: string;
  /** 보드 표시 순서 (작을수록 위). */
  order: number;
  createdAt: string;
}

export interface SpecItem {
  id: string;
  categoryId: string;
  /** 사용자가 입력한 원문. */
  raw: string;
  /** AI가 다듬은 이력서 문장. AI 실패 시 raw 와 동일. */
  refined: string;
  /** 항목 날짜 (YYYY-MM-DD) — 기본은 입력한 날. */
  date: string;
  createdAt: string;
  updatedAt: string;
}

/** AI 분류가 실패했을 때 담기는 기본 섹션명. */
export const FALLBACK_CATEGORY = '기타';
