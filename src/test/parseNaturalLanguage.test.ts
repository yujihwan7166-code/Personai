/**
 * Planner 자연어 입력 파서 — 회귀 방지.
 *
 * 흔히 쓰는 한국어 패턴 + 메타 토큰 추출 검증.
 * base 시각을 고정해서 "내일/모레/다음주" 같은 상대 표현 안정적 테스트.
 */
import { describe, it, expect } from 'vitest';
import { parseNaturalLanguage, formatParsedPreview } from '@/lib/planner/parseNaturalLanguage';

// 2026-05-12 (화) 09:00 고정
const BASE = new Date(2026, 4, 12, 9, 0, 0);

describe('parseNaturalLanguage — 시간', () => {
  it('"오후 3시 회의" → 15:00 startAt', () => {
    const r = parseNaturalLanguage('오후 3시 회의', BASE);
    expect(r.cleanTitle).toBe('회의');
    expect(r.startAt).toBeDefined();
    const d = new Date(r.startAt!);
    expect(d.getHours()).toBe(15);
    expect(d.getMinutes()).toBe(0);
  });

  it('"15:30 스탠드업" → 15:30', () => {
    const r = parseNaturalLanguage('15:30 스탠드업', BASE);
    expect(r.cleanTitle).toBe('스탠드업');
    const d = new Date(r.startAt!);
    expect(d.getHours()).toBe(15);
    expect(d.getMinutes()).toBe(30);
  });

  it('"3시 30분" 한국어 표기', () => {
    const r = parseNaturalLanguage('3시 30분 미팅', BASE);
    const d = new Date(r.startAt!);
    expect(d.getMinutes()).toBe(30);
  });
});

describe('parseNaturalLanguage — 날짜', () => {
  it('"오늘" → BASE 날짜', () => {
    const r = parseNaturalLanguage('오늘 3시 점심', BASE);
    const d = new Date(r.startAt!);
    expect(d.getDate()).toBe(12);
  });

  it('"내일" → +1일', () => {
    const r = parseNaturalLanguage('내일 10시 출발', BASE);
    const d = new Date(r.startAt!);
    expect(d.getDate()).toBe(13);
  });

  it('"모레" → +2일', () => {
    const r = parseNaturalLanguage('모레 14시 약속', BASE);
    const d = new Date(r.startAt!);
    expect(d.getDate()).toBe(14);
  });
});

describe('parseNaturalLanguage — 길이', () => {
  it('"1시간" 길이 → endAt = startAt + 1h', () => {
    const r = parseNaturalLanguage('내일 오후 2시 회의 1시간', BASE);
    expect(r.startAt && r.endAt).toBeTruthy();
    const start = new Date(r.startAt!);
    const end = new Date(r.endAt!);
    expect(end.getTime() - start.getTime()).toBe(60 * 60_000);
  });

  it('길이만 있는 문장을 시각으로 오해하지 않는다', () => {
    const r = parseNaturalLanguage('회의 1시간', BASE);

    expect(r.cleanTitle).toBe('회의');
    expect(r.startAt).toBeUndefined();
    expect(r.endAt).toBeUndefined();
  });

  it('"30분" 길이', () => {
    const r = parseNaturalLanguage('오후 3시 통화 30분', BASE);
    const start = new Date(r.startAt!);
    const end = new Date(r.endAt!);
    expect(end.getTime() - start.getTime()).toBe(30 * 60_000);
  });
});

describe('parseNaturalLanguage — 반복', () => {
  it('"매주 월요일" → recurrence.freq=weekly + byday MO', () => {
    const r = parseNaturalLanguage('매주 월요일 스탠드업', BASE);
    expect(String(r.recurrence?.freq).toLowerCase()).toBe('weekly');
    expect(r.recurrence?.byday).toContain('MO');
  });

  it('"매일" → daily', () => {
    const r = parseNaturalLanguage('매일 운동', BASE);
    expect(String(r.recurrence?.freq).toLowerCase()).toBe('daily');
  });
});

describe('parseNaturalLanguage — 메타 토큰', () => {
  it('태그 #운동 추출 + 제목에 유지', () => {
    const r = parseNaturalLanguage('헬스 #운동 #건강', BASE);
    expect(r.tags).toContain('운동');
    expect(r.tags).toContain('건강');
    // 제목에 # 자체는 유지될 수도 있음 — 핵심은 tags 추출.
  });

  it('우선순위 !2 (TickTick 패턴)', () => {
    const r = parseNaturalLanguage('급한 작업 !2', BASE);
    expect(r.priority).toBe(2);
  });

  it('우선순위 !3 (최고)', () => {
    const r = parseNaturalLanguage('!3 마감', BASE);
    expect(r.priority).toBe(3);
  });
});

describe('parseNaturalLanguage — 빈 입력 / 메타 없음', () => {
  it('빈 문자열 → cleanTitle 빈 문자열', () => {
    const r = parseNaturalLanguage('', BASE);
    expect(r.cleanTitle).toBe('');
    expect(r.startAt).toBeUndefined();
  });

  it('메타 없는 평문 → cleanTitle 만', () => {
    const r = parseNaturalLanguage('그냥 할 일 입력', BASE);
    expect(r.cleanTitle).toBe('그냥 할 일 입력');
    expect(r.startAt).toBeUndefined();
    expect(r.recurrence).toBeUndefined();
  });
});

describe('formatParsedPreview', () => {
  it('시간 + 길이 표현', () => {
    const r = parseNaturalLanguage('내일 오후 2시 회의 1시간', BASE);
    const preview = formatParsedPreview(r);
    expect(preview).toBeTruthy();
    expect(preview).toMatch(/\d/); // 숫자 포함 — 시각/일자/분 등
  });

  it('빈 메타 → 빈 문자열', () => {
    const r = parseNaturalLanguage('평문', BASE);
    expect(formatParsedPreview(r)).toBe('');
  });
});
