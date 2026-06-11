/**
 * 자연어 → task/event 입력 파싱.
 *
 * 한국어 위주 + 영어 일부. 외부 라이브러리 X (수십 KB 절약).
 *
 * 인식 패턴:
 * - 시간: "오후 3시", "15:30", "3시 30분", "9pm"
 * - 길이: "1시간", "30분", "1시간 30분"
 * - 날짜: "오늘", "내일", "모레", "다음주", "이번주 금요일", "5월 3일"
 * - 반복: "매일", "매주", "매주 월요일", "매월 1일"
 * - 태그: "#운동", "#급함" (제목에서 추출, 본문에는 유지)
 * - 우선순위: "!1"~"!3" (TickTick 패턴) — 1=낮음, 3=높음
 *
 * 반환:
 * - cleanTitle: 모든 메타 토큰 제거된 깨끗한 제목
 * - startAt/endAt/recurrence/tags/priority: 인식된 메타데이터
 *
 * 인식 실패 시 빈 결과 (정상 — 입력은 그냥 제목으로 사용).
 */
import type { RecurrenceRule, Priority, WeekdayCode } from '@/types/planner';

export interface ParsedInput {
  /** 메타 토큰 제거된 제목. */
  cleanTitle: string;
  /** 시작 시각 ISO. 인식되면 채워짐. */
  startAt?: string;
  /** 종료 시각 ISO. 인식되면 채워짐. */
  endAt?: string;
  /** 반복 규칙. */
  recurrence?: RecurrenceRule;
  /** 추출된 태그. */
  tags?: string[];
  /** 우선순위. */
  priority?: Priority;
  /** @목표명 패턴으로 추출한 목표 이름. 실제 goalId 매핑은 호출자가 수행. */
  goalTitle?: string;
}

const WEEKDAY_KO_TO_CODE: Record<string, WeekdayCode> = {
  '일': 'SU', '월': 'MO', '화': 'TU', '수': 'WE', '목': 'TH', '금': 'FR', '토': 'SA',
};

/** "오늘"/"내일"/"모레" → Date. base = 기준 날짜(보통 today). */
const parseRelativeDay = (text: string, base: Date): Date | null => {
  const today = new Date(base);
  today.setHours(0, 0, 0, 0);
  if (/(오늘|today)/i.test(text)) return today;
  if (/(내일|tomorrow)/i.test(text)) {
    const d = new Date(today);
    d.setDate(today.getDate() + 1);
    return d;
  }
  if (/(모레)/i.test(text)) {
    const d = new Date(today);
    d.setDate(today.getDate() + 2);
    return d;
  }
  // "다음주 (요일)?" — 다음주 같은 요일 또는 명시 요일.
  const nextWeek = text.match(/다음주\s*([일월화수목금토])요일/);
  if (nextWeek) {
    const wd = WEEKDAY_KO_TO_CODE[nextWeek[1]];
    if (wd) {
      const target = new Date(today);
      const targetIdx = ['SU','MO','TU','WE','TH','FR','SA'].indexOf(wd);
      const todayIdx = today.getDay();
      let diff = targetIdx - todayIdx;
      if (diff <= 0) diff += 7;
      diff += 7; // 다음주
      target.setDate(today.getDate() + diff);
      return target;
    }
  }
  if (/다음주/.test(text)) {
    const d = new Date(today);
    d.setDate(today.getDate() + 7);
    return d;
  }
  // "이번주 (요일)" — 이번주 해당 요일 (지났으면 다음주).
  const thisWeek = text.match(/이번주?\s*([일월화수목금토])요일/);
  if (thisWeek) {
    const wd = WEEKDAY_KO_TO_CODE[thisWeek[1]];
    if (wd) {
      const target = new Date(today);
      const targetIdx = ['SU','MO','TU','WE','TH','FR','SA'].indexOf(wd);
      const todayIdx = today.getDay();
      let diff = targetIdx - todayIdx;
      if (diff < 0) diff += 7;
      target.setDate(today.getDate() + diff);
      return target;
    }
  }
  // 단독 요일 ("월요일" / "화") — 다음 발생 시점.
  const bareWeekday = text.match(/(?:^|\s)([일월화수목금토])요일/);
  if (bareWeekday) {
    const wd = WEEKDAY_KO_TO_CODE[bareWeekday[1]];
    if (wd) {
      const target = new Date(today);
      const targetIdx = ['SU','MO','TU','WE','TH','FR','SA'].indexOf(wd);
      const todayIdx = today.getDay();
      let diff = targetIdx - todayIdx;
      if (diff <= 0) diff += 7;
      target.setDate(today.getDate() + diff);
      return target;
    }
  }
  // "5월 3일" / "3월 15일"
  const explicitDate = text.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (explicitDate) {
    const month = Number(explicitDate[1]) - 1;
    const day = Number(explicitDate[2]);
    const target = new Date(today.getFullYear(), month, day);
    if (target.getTime() < today.getTime()) target.setFullYear(today.getFullYear() + 1);
    return target;
  }
  return null;
};

/** "오후 3시" / "15:30" / "3시 30분" / "9pm" → { hour, minute }. */
const parseTimeOfDay = (text: string): { hour: number; minute: number } | null => {
  // 24h "HH:MM"
  const colonMatch = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (colonMatch) {
    const hour = Number(colonMatch[1]);
    const minute = Number(colonMatch[2]);
    if (hour < 24 && minute < 60) return { hour, minute };
  }
  // "오전/오후 N시 (M분)?"
  const koMatch = text.match(/(오전|오후)?\s*(\d{1,2})시(?!간)(?:\s*(\d{1,2})분)?/);
  if (koMatch) {
    let hour = Number(koMatch[2]);
    const minute = koMatch[3] ? Number(koMatch[3]) : 0;
    const ampm = koMatch[1];
    if (ampm === '오후' && hour < 12) hour += 12;
    if (ampm === '오전' && hour === 12) hour = 0;
    if (hour < 24 && minute < 60) return { hour, minute };
  }
  // English "Npm" / "Nam"
  const enMatch = text.match(/\b(\d{1,2})(am|pm)\b/i);
  if (enMatch) {
    let hour = Number(enMatch[1]);
    const isPm = /pm/i.test(enMatch[2]);
    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    return { hour, minute: 0 };
  }
  return null;
};

/** "1시간 30분" / "90분" / "1.5시간" → 분. */
const parseDuration = (text: string): number | null => {
  // "Nh Mm" / "N시간 M분"
  const m1 = text.match(/(\d+)시간\s*(\d+)분/);
  if (m1) return Number(m1[1]) * 60 + Number(m1[2]);
  // "N시간"
  const m2 = text.match(/(\d+(?:\.\d+)?)시간/);
  if (m2) return Math.round(Number(m2[1]) * 60);
  // "N분"
  const m3 = text.match(/(\d+)분(?!\s*전)/); // "5분 전" 같은 건 제외 (알림용)
  if (m3) return Number(m3[1]);
  return null;
};

/** "매일" / "매주 월요일" / "매월 1일" / "매년" → RecurrenceRule. */
const parseRecurrence = (text: string): RecurrenceRule | null => {
  if (/매일|매 일/.test(text)) return { freq: 'daily', interval: 1 };
  if (/매년|매 년/.test(text)) return { freq: 'yearly', interval: 1 };
  // 매주 (요일들)
  const weekly = text.match(/매주\s*([일월화수목금토·,\s]+)요일?/);
  if (weekly) {
    const codes: WeekdayCode[] = [];
    for (const ch of weekly[1]) {
      const code = WEEKDAY_KO_TO_CODE[ch];
      if (code && !codes.includes(code)) codes.push(code);
    }
    return { freq: 'weekly', interval: 1, byday: codes.length > 0 ? codes : undefined };
  }
  if (/매주|매 주/.test(text)) return { freq: 'weekly', interval: 1 };
  if (/매달|매월|매 달|매 월/.test(text)) return { freq: 'monthly', interval: 1 };
  return null;
};

/** 태그 추출 (#tag) — 한글·영문 모두. */
const extractTags = (text: string): string[] => {
  const tags: string[] = [];
  const re = /#([\p{L}\p{N}_-]+)/gu;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (!tags.includes(m[1])) tags.push(m[1]);
  }
  return tags;
};

/** 우선순위 "!1"~"!3". */
const parsePriority = (text: string): Priority | null => {
  const m = text.match(/!([1-3])\b/);
  if (m) return Number(m[1]) as Priority;
  return null;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** @목표 또는 @"띄어쓰기 목표" 패턴. */
const extractGoalTitle = (text: string): string | null => {
  const quoted = text.match(/@"([^"]+)"/);
  if (quoted) return quoted[1].trim();
  const m = text.match(/@([\p{L}\p{N}_-]+)/u);
  return m ? m[1].trim() : null;
};

/** 전체 파서 — base 는 시간 인식 기준점 (보통 현재 또는 슬롯 클릭 시각). */
export function parseNaturalLanguage(input: string, base: Date = new Date()): ParsedInput {
  const text = input.trim();
  if (!text) return { cleanTitle: '' };

  let working = text;
  const result: ParsedInput = { cleanTitle: '' };

  // ── 태그 ──
  const tags = extractTags(working);
  if (tags.length > 0) {
    result.tags = tags;
    // 태그는 본문에서 제거 (cleanTitle 에서)
    for (const tag of tags) {
      working = working.replace(new RegExp(`#${tag}\\b`, 'g'), '').trim();
    }
  }

  const goalTitle = extractGoalTitle(working);
  if (goalTitle) {
    result.goalTitle = goalTitle;
    working = working
      .replace(new RegExp(`@"${escapeRegExp(goalTitle)}"`, 'u'), '')
      .replace(new RegExp(`@${escapeRegExp(goalTitle)}\\b`, 'u'), '')
      .trim();
  }

  // ── 우선순위 ──
  const pr = parsePriority(working);
  if (pr !== null) {
    result.priority = pr;
    working = working.replace(/!([1-3])\b/g, '').trim();
  }

  // ── 반복 ──
  const rec = parseRecurrence(working);
  if (rec) {
    result.recurrence = rec;
    working = working
      .replace(/매주\s*[일월화수목금토·,\s]+요일?/g, '')
      .replace(/매일|매주|매월|매달|매년/g, '')
      .trim();
  }

  // ── 날짜 ──
  const day = parseRelativeDay(working, base);

  // ── 시각 ──
  const tod = parseTimeOfDay(working);

  // 날짜·시각 조합.
  if (day || tod) {
    const start = new Date(day ?? base);
    if (tod) {
      start.setHours(tod.hour, tod.minute, 0, 0);
    } else {
      // 시각 없고 날짜만 — 09:00 기본
      start.setHours(9, 0, 0, 0);
    }
    result.startAt = start.toISOString();

    // 길이.
    const dur = parseDuration(working);
    const minutes = dur ?? (tod ? 60 : 30); // 시각 명시면 1시간, 날짜만이면 30분 기본
    result.endAt = new Date(start.getTime() + minutes * 60_000).toISOString();
  }

  // 메타 토큰 모두 정리.
  working = working
    // 날짜/시각/길이 키워드
    .replace(/오늘|today|내일|tomorrow|모레/gi, '')
    .replace(/(?:이번주?|다음주)\s*(?:[일월화수목금토]요일)?/g, '')
    .replace(/(?:^|\s)[일월화수목금토]요일/g, ' ')
    .replace(/\d{1,2}월\s*\d{1,2}일/g, '')
    .replace(/(오전|오후)?\s*\d{1,2}시(?!간)(?:\s*\d{1,2}분)?/g, '')
    .replace(/\b\d{1,2}:\d{2}\b/g, '')
    .replace(/\b\d{1,2}(am|pm)\b/gi, '')
    .replace(/\d+시간\s*\d+분|\d+(?:\.\d+)?시간|\d+분(?!\s*전)/g, '')
    // 잔여 공백 정리
    .replace(/\s+/g, ' ')
    .trim();

  result.cleanTitle = working || text; // 비면 원문 fallback
  return result;
}

/** 파싱 결과를 사람 읽기용 미리보기 문자열로. UI 칩에서 사용. */
export function formatParsedPreview(parsed: ParsedInput): string {
  const parts: string[] = [];
  if (parsed.startAt && parsed.endAt) {
    const s = new Date(parsed.startAt);
    const e = new Date(parsed.endAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sameDay = s.toDateString() === today.toDateString();
    const dayLabel = sameDay
      ? '오늘'
      : s.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
    const timeLabel = s.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dur = Math.round((e.getTime() - s.getTime()) / 60_000);
    const durLabel = dur < 60 ? `${dur}분` : `${Math.floor(dur / 60)}시간${dur % 60 ? ` ${dur % 60}분` : ''}`;
    parts.push(`${dayLabel} ${timeLabel} · ${durLabel}`);
  }
  if (parsed.recurrence) {
    const r = parsed.recurrence;
    const freqLabel = { daily: '매일', weekly: '매주', monthly: '매달', yearly: '매년' }[r.freq];
    parts.push(`🔁 ${freqLabel}`);
  }
  if (parsed.priority) {
    parts.push(`!${parsed.priority}`);
  }
  if (parsed.tags && parsed.tags.length > 0) {
    parts.push(parsed.tags.map((t) => `#${t}`).join(' '));
  }
  if (parsed.goalTitle) {
    parts.push(`@${parsed.goalTitle}`);
  }
  return parts.join('  ');
}
