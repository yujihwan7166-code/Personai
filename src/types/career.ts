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
  /** 시작(또는 단일) 날짜 (YYYY-MM-DD) — 기본은 입력한 날. */
  date: string;
  /** 종료 날짜 (YYYY-MM-DD, 선택) — 기간형 항목(경력·활동)용. */
  endDate?: string;
  /** 진행 중 여부 — true 면 "~현재"로 표기. */
  ongoing?: boolean;
  /** 기관·주최·발급처 (선택). */
  org?: string;
  /** 증빙 링크 (선택) — 포트폴리오·수상 페이지 등. */
  link?: string;
  /** 세부사항 — 상황·역할·결과 메모. 생성 AI 재료로 쓰인다. */
  detail?: string;
  createdAt: string;
  updatedAt: string;
}

/** AI 분류가 실패했을 때 담기는 기본 섹션명. */
export const FALLBACK_CATEGORY = '기타';

/** 신분 — 첫 설정에서 고르면 그에 맞는 칸이 준비된다. */
export type CareerPersona = 'student' | 'jobseeker' | 'worker';

export const PERSONA_LABEL: Record<CareerPersona, string> = {
  student: '대학생',
  jobseeker: '취준생',
  worker: '직장인',
};

/** 보드 상단 프로필 — 이력서 원본의 인적 사항. */
export interface CareerProfile {
  name: string;
  /** 짧은 소개 (2~3줄 허용 — 줄바꿈 포함 가능). */
  tagline: string;
  /** 첫 설정에서 고른 신분. 비어 있으면 아직 설정 전. */
  persona: CareerPersona | '';
  /** 증명사진 (dataURL, 선택). */
  photo?: string;
}
