import type { Value } from 'platejs';

/** 감정 계열 5종. */
export type FeelingGroup = 'joy' | 'calm' | 'sad' | 'anxious' | 'anger';

export interface Feeling {
  id: string;
  label: string;
  emoji: string;
  group: FeelingGroup;
}

export type Weather = 'sunny' | 'cloudy' | 'overcast' | 'rainy' | 'stormy' | 'snowy';

export interface DiaryPhoto {
  id: string;
  src: string; // base64 or URL
}

export interface DiaryEntry {
  id: string;
  /** 'YYYY-MM-DD' — 하루 여러 개 허용. */
  date: string;
  title?: string;
  /** 본문 — Plate Value(리치텍스트). */
  body: Value;
  /** 감정 id 다중. */
  feelings: string[];
  /** feelings 중 대표 — 카드/캘린더 색·이모지 결정. */
  primaryFeeling?: string;
  /** 대표 감정 강도. */
  intensity?: 1 | 2 | 3 | 4 | 5;
  starred?: boolean;
  photos?: DiaryPhoto[];
  tags?: string[];
  weather?: Weather;
  createdAt: string;
  updatedAt: string;
}

export const DIARY_CHANGED = 'personai:diary-changed';
