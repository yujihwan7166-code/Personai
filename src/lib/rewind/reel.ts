/**
 * 되감기 — 정규화된 이벤트를 필름 릴(하루=한 칸)로 조립한다.
 *
 * 기록이 없는 날도 빈 칸으로 만든다. 건너뛰면 편하지만 그러면 시간이 거짓말이 된다 —
 * 아무것도 안 한 2월이 하루로 접히면 되감는 맛이 사라진다.
 */
import {
  type RewindEvent, type ReelFrame, type RewindRoom,
  REWIND_ROOM_ORDER, addDays, daysBetween, todayYmd, parseYmd,
} from './types';

/** 릴이 감당하는 최대 칸 수 — 손상된 과거 날짜(1970 등) 하나가 릴을 수만 칸으로 늘리는 걸 막는다. */
const MAX_FRAMES = 2200; // 약 6년

/** 기록이 아직 없어도 릴이 성립하도록 오늘 뒤로 깔아두는 최소 길이. */
const MIN_SPAN_DAYS = 30;

/**
 * 미래 기록은 이만큼만 릴에 들인다.
 * 상한이 없으면 날짜 오타 하나("2033-01-01")가 릴 끝을 몇 년 뒤로 끌고 가고,
 * MAX_FRAMES 컷이 그 끝에 앵커되면서 **오늘이 릴 밖으로 밀려난다** — 화면이 통째로 빈 칸이 된다.
 */
const FUTURE_SLACK_DAYS = 31;

/** 시각 있는 것 먼저(시각 순) → 시각 없는 것(weight 큰 순). */
const byTimeline = (a: RewindEvent, b: RewindEvent): number => {
  if (a.time && b.time) return a.time.localeCompare(b.time) || b.weight - a.weight;
  if (a.time) return -1;
  if (b.time) return 1;
  return b.weight - a.weight || a.room.localeCompare(b.room);
};

export interface ReelRange {
  from: string;
  to: string;
}

/** 릴이 덮을 날짜 구간 — 가장 오래된 기록부터 오늘(또는 미래 기록)까지. */
export function reelRange(events: RewindEvent[]): ReelRange {
  const today = todayYmd();
  if (events.length === 0) return { from: addDays(today, -MIN_SPAN_DAYS), to: today };

  let min = events[0].ymd;
  let max = events[0].ymd;
  for (const e of events) {
    if (e.ymd < min) min = e.ymd;
    if (e.ymd > max) max = e.ymd;
  }

  // 오늘은 항상 릴에 있어야 한다 — 되감기는 "지금"에서 출발한다.
  // 그래서 끝(to)을 오늘+한 달로 묶어 둔다. 아래 MAX_FRAMES 컷이 to 에 앵커되기 때문에,
  // to 가 멀어지면 from 까지 미래로 끌려가 오늘이 구간 밖으로 나간다.
  const futureCap = addDays(today, FUTURE_SLACK_DAYS);
  const to = max <= today ? today : max < futureCap ? max : futureCap;
  let from = min < to ? min : addDays(to, -MIN_SPAN_DAYS);
  if (daysBetween(from, to) > MAX_FRAMES) from = addDays(to, -(MAX_FRAMES - 1));
  if (daysBetween(from, to) < MIN_SPAN_DAYS) from = addDays(to, -MIN_SPAN_DAYS);
  return { from, to };
}

/** 구간의 모든 날을 칸으로 — 빈 날 포함. */
export function buildReel(events: RewindEvent[], range: ReelRange): ReelFrame[] {
  const byDate = new Map<string, RewindEvent[]>();
  for (const e of events) {
    if (e.ymd < range.from || e.ymd > range.to) continue;
    const bucket = byDate.get(e.ymd);
    if (bucket) bucket.push(e);
    else byDate.set(e.ymd, [e]);
  }

  const frames: ReelFrame[] = [];
  const span = daysBetween(range.from, range.to);
  for (let i = 0; i < span; i++) {
    const ymd = addDays(range.from, i);
    const raw = byDate.get(ymd);
    if (!raw) {
      frames.push({ ymd, events: [], rooms: [] });
      continue;
    }
    const dayEvents = [...raw].sort(byTimeline);

    // 칸에 인화할 사진 — weight 가 가장 높은 사진 하나. 없으면 활자 프레임.
    let best: RewindEvent | undefined;
    for (const e of dayEvents) {
      if (!e.photo) continue;
      if (!best || e.weight > best.weight) best = e;
    }
    // 캡션 — 사진이 없을 때 그날을 대표하는 한 줄.
    let lead: RewindEvent = dayEvents[0];
    for (const e of dayEvents) if (e.weight > lead.weight) lead = e;

    const seen = new Set(dayEvents.map((e) => e.room));
    frames.push({
      ymd,
      events: dayEvents,
      photo: best?.photo,
      caption: best ? undefined : lead.text,
      rooms: REWIND_ROOM_ORDER.filter((r) => seen.has(r)),
    });
  }
  return frames;
}

export interface ReelMonth {
  /** YYYY-MM */
  key: string;
  label: string;
  /** 이 달 1일(또는 릴 시작일)의 칸 번호 — 점프 대상. */
  index: number;
  /** 이 달에 담긴 기록 수 — 0이면 통째로 빈 달. */
  count: number;
}

/** 릴을 달 단위로 색인 — 사이드바 내비이자 점프 지점. 최신 달이 앞에 온다. */
export function indexMonths(frames: ReelFrame[]): ReelMonth[] {
  const months: ReelMonth[] = [];
  const seen = new Map<string, ReelMonth>();
  frames.forEach((f, i) => {
    const key = f.ymd.slice(0, 7);
    let m = seen.get(key);
    if (!m) {
      const d = parseYmd(f.ymd);
      m = { key, label: `${d.getFullYear()}. ${d.getMonth() + 1}월`, index: i, count: 0 };
      seen.set(key, m);
      months.push(m);
    }
    m.count += f.events.length;
  });
  return months.reverse();
}

/** 방별 총량 — 사이드바 범례에 "이 릴에 뭐가 담겼나"를 실데이터로 적기 위한 것. */
export function countByRoom(events: RewindEvent[]): Record<RewindRoom, number> {
  const out = { daylog: 0, journal: 0, ledger: 0, health: 0, tickets: 0, people: 0 };
  for (const e of events) out[e.room] += 1;
  return out;
}

/** 지금 칸에서 dir 방향으로 기록이 있는 가장 가까운 칸 — 빈 구간을 건너뛰고 싶을 때. */
export function nextRecordedIndex(frames: ReelFrame[], from: number, dir: 1 | -1): number | null {
  for (let i = from + dir; i >= 0 && i < frames.length; i += dir) {
    if (frames[i].events.length > 0) return i;
  }
  return null;
}
