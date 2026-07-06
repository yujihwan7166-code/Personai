/**
 * 일기 — /journal (따뜻한 크림 다이어리 리디자인).
 *
 * 좌: 헤더 + streak 카드 + 미니캘린더(무드 dot) + 최근 기록.
 * 우: 날짜 헤더 + 에디터 카드(오늘의 기분 · 날씨 · 제목 · 본문 · 태그 · 저장).
 * 데이터는 기존 journalStore(JournalEntry). 크림 팔레트는 래퍼 CSS 변수로 격리.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, NotebookPen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { useJournal } from '@/hooks/useJournal';
import { useJournalStreak } from '@/hooks/useJournalStreak';
import { journalStore } from '@/services/journalStore';
import { WEATHER_META, type Mood, type Weather } from '@/types/journal';

const CREAM: CSSProperties = {
  '--cream-bg': '40 30% 89%',
  '--cream-panel': '40 34% 92%',
  '--cream-card': '44 44% 97%',
  '--cream-ink': '25 20% 25%',
  '--cream-muted': '30 11% 47%',
  '--cream-line': '36 24% 84%',
  '--cream-accent': '16 48% 47%',
} as CSSProperties;

/** 목업 무드 5종 — mood 값(1-5) + 라벨 + 컬러. */
const MOODS: { value: Mood; label: string; color: string }[] = [
  { value: 5, label: '셀렘',    color: 'hsl(45 80% 55%)' },
  { value: 4, label: '평온',    color: 'hsl(150 45% 47%)' },
  { value: 3, label: '그저그럼', color: 'hsl(30 8% 62%)' },
  { value: 2, label: '지침',    color: 'hsl(20 45% 45%)' },
  { value: 1, label: '울적',    color: 'hsl(215 55% 56%)' },
];
const MOOD_COLOR: Record<number, string> = Object.fromEntries(MOODS.map((m) => [m.value, m.color]));

const WEATHERS: Weather[] = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy'];
const TAGS = ['일상', '감사', '운동', '독서', '여행', '음식', '사람', '생각'];
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function Journal() {
  const allEntries = useJournal();
  const streak = useJournalStreak(allEntries);

  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [calAnchor, setCalAnchor] = useState(() => new Date());

  // 에디터 로컬 상태
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mood, setMood] = useState<Mood | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  // 선택 날짜 바뀌면 그 날 엔트리 로드.
  useEffect(() => {
    const e = journalStore.listByDate(selectedDate)[0];
    setTitle(e?.title ?? '');
    setBody(e?.body ?? '');
    setMood(e?.mood ?? null);
    setWeather(e?.weather ?? null);
    setTags(e?.tags ?? []);
  }, [selectedDate]);

  // 자동 저장(디바운스) — 내용 있으면 create, 있으면 update.
  const saveTimer = useRef<number | null>(null);
  const persist = () => {
    const existing = journalStore.listByDate(selectedDate)[0];
    const patch = {
      title: title.trim() || undefined,
      mood: mood ?? undefined,
      weather: weather ?? undefined,
      tags,
      bodyFormat: 'plain' as const,
    };
    if (existing) {
      journalStore.update(existing.id, { ...patch, body });
    } else if (body.trim() || title.trim() || mood || weather || tags.length > 0) {
      journalStore.add({ date: selectedDate, body, ...patch });
    }
  };
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(persist, 500);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, mood, weather, tags]);

  const handleSave = () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    persist();
    notify.success('저장됐어요', { duration: 1600 });
  };

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  // 최근 기록 (날짜 desc)
  const recent = useMemo(
    () => [...allEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    [allEntries],
  );
  // 날짜별 mood (캘린더 dot)
  const moodByDate = useMemo(() => {
    const map = new Map<string, Mood>();
    for (const e of allEntries) if (e.mood && !map.has(e.date)) map.set(e.date, e.mood);
    return map;
  }, [allEntries]);

  const sel = new Date(`${selectedDate}T00:00:00`);
  const todayKey = dateKey(new Date());

  // 캘린더 셀
  const y = calAnchor.getFullYear();
  const m = calAnchor.getMonth();
  const lead = new Date(y, m, 1).getDay();
  const daysIn = new Date(y, m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysIn }, (_, i) => dateKey(new Date(y, m, i + 1))),
  ];
  const monthCount = allEntries.filter((e) => e.date.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)).length;

  return (
    <div style={CREAM} className="flex h-dvh bg-[hsl(var(--cream-bg))] text-[hsl(var(--cream-ink))]">
      {/* ── 사이드바 ── */}
      <aside className="flex w-[288px] shrink-0 flex-col overflow-y-auto border-r border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-panel))]">
        <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--cream-accent))] text-white">
            <NotebookPen className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <div>
            <div className="text-[15px] font-bold leading-tight">오늘의 일기</div>
            <div className="text-[10.5px] uppercase tracking-wide text-[hsl(var(--cream-muted))]">daily journal</div>
          </div>
        </div>

        {/* streak 카드 */}
        <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] px-3.5 py-3">
          <div className="text-center leading-none">
            <div className="text-[26px] font-extrabold text-[hsl(var(--cream-accent))]">{streak}</div>
            <div className="mt-1 text-[10px] text-[hsl(var(--cream-muted))]">일 연속</div>
          </div>
          <p className="text-[11.5px] leading-snug text-[hsl(var(--cream-muted))]">
            꾸준히 이어가고 있어요.<br />
            지금까지 <b className="text-[hsl(var(--cream-ink))]">{allEntries.length}편</b> 기록.
          </p>
        </div>

        {/* 미니 캘린더 */}
        <div className="px-4 pb-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12.5px] font-semibold">{y}년 {m + 1}월</span>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => setCalAnchor(new Date(y, m - 1, 1))} className="rounded p-1 text-[hsl(var(--cream-muted))] hover:bg-[hsl(var(--cream-line))]/40" aria-label="이전 달"><ChevronLeft className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => setCalAnchor(new Date(y, m + 1, 1))} className="rounded p-1 text-[hsl(var(--cream-muted))] hover:bg-[hsl(var(--cream-line))]/40" aria-label="다음 달"><ChevronRight className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <div className="mb-1 grid grid-cols-7 text-center text-[9.5px] text-[hsl(var(--cream-muted))]/70">
            {WEEKDAY.map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((d, i) => {
              if (!d) return <span key={i} />;
              const dayNum = Number(d.slice(8));
              const isSel = d === selectedDate;
              const isToday = d === todayKey;
              const dotColor = moodByDate.has(d) ? MOOD_COLOR[moodByDate.get(d)!] : null;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className="flex flex-col items-center py-0.5"
                >
                  <span className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-[12px] tabular-nums transition-colors',
                    isSel ? 'bg-[hsl(var(--cream-accent))] font-bold text-white'
                          : isToday ? 'font-bold text-[hsl(var(--cream-accent))]'
                          : 'text-[hsl(var(--cream-ink))]/80 hover:bg-[hsl(var(--cream-line))]/40',
                  )}>
                    {dayNum}
                  </span>
                  <span className="mt-0.5 h-1 w-1 rounded-full" style={{ backgroundColor: dotColor && !isSel ? dotColor : 'transparent' }} />
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-[hsl(var(--cream-muted))]">
            <span>이번 달</span>
            <span className="tabular-nums">{monthCount} / {daysIn}</span>
          </div>
        </div>

        {/* 최근 기록 */}
        <div className="border-t border-[hsl(var(--cream-line))] px-4 py-3">
          <div className="mb-2 text-[11px] font-semibold text-[hsl(var(--cream-muted))]">최근 기록</div>
          <div className="flex flex-col gap-2.5">
            {recent.length === 0 && <p className="text-[12px] text-[hsl(var(--cream-muted))]/70">아직 기록이 없어요.</p>}
            {recent.map((e) => {
              const dd = new Date(`${e.date}T00:00:00`);
              const t = e.title?.trim() || e.body.split('\n')[0]?.trim() || '무제';
              const ex = (e.title ? e.body : e.body.split('\n').slice(1).join(' ')).trim();
              return (
                <button key={e.id} type="button" onClick={() => setSelectedDate(e.date)} className="text-left">
                  <div className="flex items-center gap-1.5 text-[10.5px] text-[hsl(var(--cream-muted))]">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: e.mood ? MOOD_COLOR[e.mood] : 'hsl(var(--cream-line))' }} />
                    {dd.getMonth() + 1}월 {dd.getDate()}일 · {WEEKDAY[dd.getDay()]}
                  </div>
                  <div className="mt-0.5 truncate text-[13px] font-semibold text-[hsl(var(--cream-ink))]">{t}</div>
                  {ex && <div className="truncate text-[11.5px] text-[hsl(var(--cream-muted))]">{ex}</div>}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ── 메인 에디터 ── */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[860px] px-8 py-8">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <div className="text-[13px] text-[hsl(var(--cream-muted))]">{WEEKDAY[sel.getDay()]}요일</div>
              <h1 className="text-[30px] font-bold tracking-tight">{sel.getFullYear()}년 {sel.getMonth() + 1}월 {sel.getDate()}일</h1>
            </div>
            {selectedDate !== todayKey && (
              <button type="button" onClick={() => { setSelectedDate(todayKey); setCalAnchor(new Date()); }} className="rounded-full border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] px-3.5 py-1.5 text-[12.5px] font-medium text-[hsl(var(--cream-ink))]/80 hover:border-[hsl(var(--cream-accent))]/40">
                오늘로
              </button>
            )}
          </div>

          {/* 에디터 카드 */}
          <div className="rounded-2xl border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-6 shadow-[0_4px_24px_-16px_hsl(25_30%_20%/0.15)]">
            {/* 오늘의 기분 */}
            <div className="mb-2 text-[12px] text-[hsl(var(--cream-muted))]">오늘의 기분</div>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((mo) => {
                const on = mood === mo.value;
                return (
                  <button
                    key={mo.value}
                    type="button"
                    onClick={() => setMood(on ? null : mo.value)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors',
                      on ? 'border-transparent bg-[hsl(var(--cream-accent))]/12 font-semibold text-[hsl(var(--cream-ink))]'
                         : 'border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] text-[hsl(var(--cream-ink))]/75 hover:border-[hsl(var(--cream-accent))]/30',
                    )}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: mo.color }} />
                    {mo.label}
                  </button>
                );
              })}
            </div>

            {/* 날씨 */}
            <div className="mb-2 mt-4 text-[12px] text-[hsl(var(--cream-muted))]">날씨</div>
            <div className="flex flex-wrap gap-2">
              {WEATHERS.map((w) => {
                const on = weather === w;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWeather(on ? null : w)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors',
                      on ? 'border-transparent bg-[hsl(var(--cream-accent))]/12 font-semibold text-[hsl(var(--cream-ink))]'
                         : 'border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] text-[hsl(var(--cream-ink))]/75 hover:border-[hsl(var(--cream-accent))]/30',
                    )}
                  >
                    <span aria-hidden>{WEATHER_META[w].emoji}</span>
                    {WEATHER_META[w].label}
                  </button>
                );
              })}
            </div>

            <hr className="my-5 border-[hsl(var(--cream-line))]" />

            {/* 제목 */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full bg-transparent text-[22px] font-bold text-[hsl(var(--cream-ink))] outline-none placeholder:text-[hsl(var(--cream-muted))]/55"
            />
            {/* 본문 */}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="오늘 하루는 어땠나요? 마음에 남은 순간을 적어보세요."
              className="mt-3 min-h-[260px] w-full resize-y bg-transparent text-[14px] leading-[2] text-[hsl(var(--cream-ink))]/90 outline-none placeholder:text-[hsl(var(--cream-muted))]/55"
              style={{
                backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 31px, hsl(var(--cream-line)) 31px, hsl(var(--cream-line)) 32px)',
                lineHeight: '32px',
              }}
            />

            {/* 태그 */}
            <div className="mb-2 mt-4 text-[12px] text-[hsl(var(--cream-muted))]">태그</div>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => {
                const on = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-[12px] transition-colors',
                      on ? 'border-transparent bg-[hsl(var(--cream-accent))]/12 font-semibold text-[hsl(var(--cream-ink))]'
                         : 'border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] text-[hsl(var(--cream-ink))]/70 hover:border-[hsl(var(--cream-accent))]/30',
                    )}
                  >
                    #{t}
                  </button>
                );
              })}
            </div>

            {/* footer */}
            <div className="mt-5 flex items-center justify-between border-t border-[hsl(var(--cream-line))] pt-4">
              <span className="text-[12px] text-[hsl(var(--cream-muted))]">{body.length}자 작성 중</span>
              <button
                type="button"
                onClick={handleSave}
                disabled={!body.trim() && !title.trim() && !mood && !weather && tags.length === 0}
                className="rounded-lg bg-[hsl(var(--cream-accent))] px-5 py-2 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
