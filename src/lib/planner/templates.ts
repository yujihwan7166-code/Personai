/**
 * 분해 도우미 — 카테고리별 정적 템플릿.
 * Goal 등록 직후 모달에서 한 클릭으로 추천 습관/할 일을 함께 추가.
 *
 * AI 호출 0. 모두 정적 데이터.
 */

import type { GoalCategory, HabitCadence } from './types';

export interface HabitTemplate {
  title: string;
  emoji: string;
  cadence: HabitCadence;
  scheduleAt?: { hour: number; min: number };
}

export interface TaskTemplate {
  title: string;
}

export interface GoalTemplate {
  habits: HabitTemplate[];
  tasks: TaskTemplate[];
}

export const GOAL_TEMPLATES: Record<GoalCategory, GoalTemplate> = {
  work: {
    habits: [
      { title: '매일 1시간 핵심 업무 집중', emoji: '🎯', cadence: { kind: 'daily' }, scheduleAt: { hour: 10, min: 0 } },
      { title: '주간 진척 점검', emoji: '📊', cadence: { kind: 'weekly', days: [0] } },
      { title: '하루 마감 5분 정리', emoji: '✅', cadence: { kind: 'daily' }, scheduleAt: { hour: 18, min: 30 } },
    ],
    tasks: [
      { title: '목표 달성 기준 명확히 정의' },
      { title: '필요한 자원·도구 목록화' },
      { title: '첫 주 계획 세우기' },
    ],
  },
  health: {
    habits: [
      { title: '매일 30분 운동', emoji: '💪', cadence: { kind: 'daily' }, scheduleAt: { hour: 7, min: 0 } },
      { title: '하루 물 2L 마시기', emoji: '💧', cadence: { kind: 'daily' } },
      { title: '주 3회 근력 운동', emoji: '🏋️', cadence: { kind: 'weekly', days: [1, 3, 5] } },
    ],
    tasks: [
      { title: '현재 체력·건강 측정' },
      { title: '운동 루틴 정하기' },
      { title: '필요한 장비 준비' },
    ],
  },
  learning: {
    habits: [
      { title: '매일 30분 학습', emoji: '📖', cadence: { kind: 'daily' }, scheduleAt: { hour: 21, min: 0 } },
      { title: '주간 진척 정리', emoji: '✏️', cadence: { kind: 'weekly', days: [6] } },
      { title: '하루 1개 새 개념 메모', emoji: '💡', cadence: { kind: 'daily' } },
    ],
    tasks: [
      { title: '학습 자료·코스 정하기' },
      { title: '커리큘럼 큰 그림 작성' },
      { title: '학습 환경·도구 준비' },
    ],
  },
  relationship: {
    habits: [
      { title: '매일 한 사람 안부 묻기', emoji: '💌', cadence: { kind: 'daily' } },
      { title: '주 1회 가족·친구와 대화', emoji: '☎️', cadence: { kind: 'weekly', days: [0] } },
      { title: '감사 한 가지 적기', emoji: '🙏', cadence: { kind: 'daily' }, scheduleAt: { hour: 22, min: 0 } },
    ],
    tasks: [
      { title: '연락하고 싶은 사람 리스트' },
      { title: '이번 달 약속 잡기' },
      { title: '기념일 캘린더 정리' },
    ],
  },
  finance: {
    habits: [
      { title: '매일 지출 기록', emoji: '💳', cadence: { kind: 'daily' }, scheduleAt: { hour: 22, min: 0 } },
      { title: '주간 수지 점검', emoji: '📊', cadence: { kind: 'weekly', days: [0] } },
      { title: '월간 예산 검토', emoji: '💰', cadence: { kind: 'weekly', days: [1] } },
    ],
    tasks: [
      { title: '현재 자산·부채 정리' },
      { title: '월 예산 카테고리 설정' },
      { title: '저축·투자 목표 액수 정하기' },
    ],
  },
  personal: {
    habits: [
      { title: '오늘 한 줄 일기', emoji: '📔', cadence: { kind: 'daily' }, scheduleAt: { hour: 22, min: 30 } },
      { title: '아침 5분 명상', emoji: '🧘', cadence: { kind: 'daily' }, scheduleAt: { hour: 7, min: 30 } },
      { title: '주말 회고', emoji: '🔁', cadence: { kind: 'weekly', days: [0] } },
    ],
    tasks: [
      { title: '왜 이 목표를 세웠는지 적기' },
      { title: '90일 후 모습 그려보기' },
      { title: '첫 작은 행동 1개 정하기' },
    ],
  },
};

export const CATEGORY_META: Record<GoalCategory, { label: string; emoji: string; color: string }> = {
  work:         { label: '업무',   emoji: '💼', color: 'hsl(220 70% 55%)' },
  health:       { label: '건강',   emoji: '💪', color: 'hsl(155 65% 45%)' },
  learning:     { label: '학습',   emoji: '📚', color: 'hsl(262 70% 55%)' },
  relationship: { label: '관계',   emoji: '💌', color: 'hsl(335 75% 60%)' },
  finance:      { label: '재정',   emoji: '💰', color: 'hsl(38 92% 50%)' },
  personal:     { label: '개인',   emoji: '🌱', color: 'hsl(170 60% 45%)' },
};
