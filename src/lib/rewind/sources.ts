/**
 * 되감기 — 방별 어댑터. 각 방의 레코드를 RewindEvent 로 정규화한다.
 *
 * 규칙 셋:
 *  1. **읽기만.** 훅(useLedger·useHealth)은 마운트 시 고정지출/시드를 쓰므로 절대 쓰지 않는다.
 *     store 의 list 함수만 직접 부른다.
 *     ⚠ 단 하나의 예외: daylogStore 의 첫 읽기는 구 `travel.records.v1` → `daylog.items.v1`
 *     1회 이관을 트리거한다(daylogStore.safeRead). 멱등이고 /journal 이 어차피 하는 일이라
 *     그대로 두지만, "되감기는 아무것도 안 쓴다"가 문자 그대로는 아니라는 뜻이다.
 *  2. 날짜는 여기서 **로컬 YMD** 로 통일한다. 각 방이 이미 YMD 라 변환은 거의 없지만,
 *     새 출처를 붙일 때 toISOString().slice(0,10) 을 쓰면 KST 가 하루 밀린다.
 *  3. 한 방이 터져도 릴 전체가 죽지 않게 어댑터마다 try/catch — 손상 데이터는 그 방만 비운다.
 *
 * weight = 그날을 대표할 자격. 사진 없는 날의 캡션을 고를 때 쓴다.
 */
import { daylogStore } from '@/services/daylogStore';
import { DAY_ITEM_META, MEAL_SLOT_LABEL } from '@/types/daylog';
import { journalStore } from '@/services/journalStore';
import { MOOD_EMOJI, WEATHER_META, type Mood } from '@/types/journal';
import { ledgerStore } from '@/services/ledgerStore';
import { DEFAULT_CATEGORIES } from '@/types/ledger';
import { healthStore } from '@/services/healthStore';
import { METRIC_META } from '@/types/health';
import { loadTickets, KIND_LABEL, type TicketKind } from '@/lib/tickets/ticketStore';
import { peopleStore } from '@/services/peopleStore';
import { INTERACTION_META } from '@/types/people';
import type { RewindEvent } from './types';

/** 여러 줄 본문에서 첫 줄만 — 필름 칸·타임라인은 한 줄이 전부다.
 * 마크다운 일기의 첫 줄은 보통 '# 제목' 이라 기호를 걷어내야 활자로 읽힌다. */
const firstLine = (s: string, max = 90): string => {
  const line = s.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  const clean = line.replace(/^#{1,6}\s+/, '').replace(/^[-*+>]\s+/, '').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

const won = (n: number): string => `${n < 0 ? '-' : ''}${Math.abs(n).toLocaleString('ko-KR')}원`;

const TICKET_GLYPH: Record<TicketKind, string> = {
  movie: '🎬', drama: '📺', book: '📖', game: '🎮', show: '🎭',
};

/**
 * 실존하는 YYYY-MM-DD 인지 — 외부 스토어에서 온 값을 릴에 넣기 전 마지막 방어.
 * 모양만 보면 '2026-13-45' 나 '9999-99-99' 가 통과해 릴 구간을 만 년 뒤로 늘린다.
 * Date 로 되돌려 원래 숫자가 그대로 나오는지까지 본다.
 */
const isYmd = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
};

type Adapter = () => RewindEvent[];

/* ── 하루(데일리로그) — 먹은 것·간 곳·메모. 유일하게 시각(HH:mm)과 사진을 함께 가진다 ── */
const fromDaylog: Adapter = () =>
  daylogStore.listAll().map((i) => ({
    id: `daylog:${i.id}`,
    ymd: i.date,
    time: i.time,
    room: 'daylog' as const,
    glyph: DAY_ITEM_META[i.kind].emoji,
    text: i.text,
    detail: i.place ?? (i.mealSlot ? MEAL_SLOT_LABEL[i.mealSlot] : undefined),
    photo: i.photo,
    weight: i.photo ? 6 : 3,
  }));

/* ── 일기 — 그날의 "분위기". 기분·날씨까지 복원되는 유일한 출처 ── */
const fromJournal: Adapter = () =>
  journalStore.list().flatMap((e) => {
    const text = e.title?.trim() || e.summary?.trim() || firstLine(e.body);
    if (!text) return [];
    const mood = e.mood ? MOOD_EMOJI[e.mood as Mood] : undefined;
    const weather = e.weather ? WEATHER_META[e.weather]?.emoji : undefined;
    return [{
      id: `journal:${e.id}`,
      ymd: e.date,
      room: 'journal' as const,
      glyph: mood ?? '✎',
      text,
      detail: weather,
      photo: e.images?.[0]?.src,
      weight: e.images?.length ? 7 : 5,
    }];
  });

/* ── 돈 — 레코드가 가장 많다. 릴에 밀도를 주는 출처 ── */
const fromLedger: Adapter = () => {
  const cats = new Map(
    [...DEFAULT_CATEGORIES, ...ledgerStore.listCategories()].map((c) => [c.id, c]),
  );
  return ledgerStore.listEntries().map((t) => {
    const cat = cats.get(t.categoryId);
    const sign = t.type === 'income' ? '+' : t.type === 'transfer' ? '↔' : '';
    return {
      id: `ledger:${t.id}`,
      ymd: t.date,
      room: 'ledger' as const,
      glyph: cat?.emoji ?? '📎',
      text: t.memo.trim() || cat?.label || '기타',
      detail: `${sign}${won(t.amount)}`,
      weight: 1,
    };
  });
};

/* ── 몸 — 수치·복약·진료·증상 4축. 복약은 날짜별로 묶어 한 줄로 접는다 ── */
const fromHealth: Adapter = () => {
  const out: RewindEvent[] = [];

  for (const v of healthStore.listVitals()) {
    const meta = METRIC_META[v.metric];
    if (!meta) continue;
    out.push({
      id: `health:vital:${v.id}`,
      ymd: v.date,
      room: 'health',
      glyph: meta.emoji,
      text: `${meta.label} ${v.value}${meta.unit}`,
      detail: v.note,
      weight: 2,
    });
  }

  // 복약: 약 하나에 takenDates[] 가 붙어 있다. 날짜별로 뒤집어 모아야 하루가 한 줄이 된다.
  const takenByDate = new Map<string, string[]>();
  for (const m of healthStore.listMeds()) {
    for (const d of m.takenDates) {
      if (!isYmd(d)) continue;
      const names = takenByDate.get(d) ?? [];
      names.push(m.name);
      takenByDate.set(d, names);
    }
  }
  for (const [ymd, names] of takenByDate) {
    out.push({
      id: `health:meds:${ymd}`,
      ymd,
      room: 'health',
      glyph: '💊',
      text: names.length > 2 ? `약 ${names.length}가지` : names.join(' · '),
      detail: names.length > 2 ? names.join(' · ') : undefined,
      weight: 1,
    });
  }

  for (const v of healthStore.listVisits()) {
    out.push({
      id: `health:visit:${v.id}`,
      ymd: v.date,
      room: 'health',
      glyph: '🩺',
      text: v.dept ? `${v.place} · ${v.dept}` : v.place,
      detail: v.reason,
      weight: 5,
    });
  }

  for (const s of healthStore.listSymptoms()) {
    out.push({
      id: `health:symptom:${s.id}`,
      ymd: s.date,
      room: 'health',
      glyph: s.emoji ?? '🌡️',
      text: s.label,
      detail: s.note,
      weight: 3,
    });
  }

  return out;
};

/* ── 본 것 — 한 줄 요약 품질이 제일 좋다. 포스터가 있으면 필름에 그대로 인화된다 ── */
const fromTickets: Adapter = () =>
  loadTickets().entries.map((t) => ({
    id: `tickets:${t.id}`,
    ymd: t.watchedAt,
    room: 'tickets' as const,
    glyph: TICKET_GLYPH[t.kind] ?? '🎟️',
    text: t.title,
    detail: `${'★'.repeat(Math.round(t.rating))} ${t.oneLiner}`.trim(),
    photo: t.posterUrl,
    weight: t.posterUrl ? 8 : 6,
  }));

/* ── 사람 — personId 를 이름으로 조인해야 읽을 수 있는 줄이 된다 ── */
const fromPeople: Adapter = () => {
  const names = new Map(peopleStore.listPersons().map((p) => [p.id, p.name]));
  return peopleStore.listInteractions().map((it) => {
    const name = names.get(it.personId) ?? '누군가';
    const kind = INTERACTION_META[it.kind]?.label;
    return {
      id: `people:${it.id}`,
      ymd: it.date,
      room: 'people' as const,
      glyph: '🧑',
      text: it.note.trim() ? `${name} — ${firstLine(it.note)}` : name,
      detail: kind,
      weight: 4,
    };
  });
};

const ADAPTERS: Adapter[] = [
  fromDaylog, fromJournal, fromLedger, fromHealth, fromTickets, fromPeople,
];

/**
 * 여섯 방을 한 번에 걷어 정규화한다.
 * 한 방이 손상돼도 나머지 릴은 살아야 하므로 어댑터마다 격리한다.
 */
export function collectRewindEvents(): RewindEvent[] {
  const all: RewindEvent[] = [];
  for (const adapt of ADAPTERS) {
    try {
      for (const e of adapt()) {
        if (isYmd(e.ymd) && e.text) all.push(e);
      }
    } catch (err) {
      console.error('되감기 — 출처 하나를 읽지 못했어요', err);
    }
  }
  return all;
}
