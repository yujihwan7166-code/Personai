/**
 * 건강기록(내 몸의 기록실) 타입·상수.
 *
 * 4개 기록 축: 수치(vitals 시계열) · 복약(meds) · 진료(visits) · 증상(symptoms).
 * 전부 localStorage(healthStore)에만 저장 — 민감 데이터라 내 기기 밖으로 안 나감.
 * 게임화(점수·스트릭) 없음 — "닦달하지 않는 기록실" 원칙.
 */

export const HEALTH_CHANGED = 'health:changed';

export type VitalMetric = 'weight' | 'systolic' | 'diastolic' | 'sugar' | 'sleep' | 'heart';

export interface MetricMeta {
  label: string;
  unit: string;
  /** 정상 범위 [min, max] — 벗어나면 주의(낮음/높음). */
  normal: [number, number];
  /** 표시용 hsl 색. */
  color: string;
  emoji: string;
}

export const METRIC_META: Record<VitalMetric, MetricMeta> = {
  weight:    { label: '체중',   unit: 'kg',    normal: [45, 90],  color: 'hsl(152 55% 40%)', emoji: '⚖️' },
  systolic:  { label: '수축기', unit: 'mmHg',  normal: [90, 130], color: 'hsl(0 65% 58%)',   emoji: '🫀' },
  diastolic: { label: '이완기', unit: 'mmHg',  normal: [60, 85],  color: 'hsl(24 72% 55%)',  emoji: '🫀' },
  sugar:     { label: '혈당',   unit: 'mg/dL', normal: [70, 140], color: 'hsl(35 82% 50%)',  emoji: '🩸' },
  sleep:     { label: '수면',   unit: '시간',  normal: [6, 9],    color: 'hsl(210 60% 55%)', emoji: '😴' },
  heart:     { label: '심박',   unit: 'bpm',   normal: [55, 100], color: 'hsl(340 58% 58%)', emoji: '💗' },
};

export const VITAL_METRICS: VitalMetric[] = ['weight', 'systolic', 'diastolic', 'sugar', 'sleep', 'heart'];

export type VitalStatus = 'normal' | 'low' | 'high';

export function vitalStatus(metric: VitalMetric, value: number): VitalStatus {
  const [min, max] = METRIC_META[metric].normal;
  if (value < min) return 'low';
  if (value > max) return 'high';
  return 'normal';
}

export interface VitalReading {
  id: string;
  metric: VitalMetric;
  date: string; // 로컬 YMD
  value: number;
  note?: string;
  createdAt: string;
}

export interface HealthMed {
  id: string;
  name: string;
  dose?: string; // "500mg" · "1정"
  schedule?: string; // "아침 식후" · "저녁"
  active: boolean;
  /** 복용 체크한 날짜(YMD) 목록. */
  takenDates: string[];
  createdAt: string;
}

export interface HealthVisit {
  id: string;
  date: string; // 방문일 YMD
  place: string; // 병원·기관
  dept?: string; // 과
  reason?: string; // 진단·사유
  prescription?: string; // 처방
  nextDate?: string; // 다음 예약 YMD
  note?: string;
  createdAt: string;
}

export interface HealthSymptom {
  id: string;
  date: string; // YMD
  label: string;
  emoji?: string;
  severity?: number; // 1~3
  note?: string;
  createdAt: string;
}

/** 증상 빠른 입력 프리셋 (칩). */
export const SYMPTOM_PRESETS: Array<{ label: string; emoji: string }> = [
  { label: '두통', emoji: '🤕' },
  { label: '피로', emoji: '😮‍💨' },
  { label: '소화불량', emoji: '🤢' },
  { label: '어지러움', emoji: '😵‍💫' },
  { label: '기침', emoji: '😷' },
  { label: '불면', emoji: '🌙' },
  { label: '근육통', emoji: '💪' },
  { label: '콧물', emoji: '🤧' },
];
