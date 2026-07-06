/**
 * 일기 — /journal (따뜻한 크림 다이어리, v2).
 *
 * 좌: 헤더 + streak + 미니캘린더 + 이번 달 기분 + 검색 + 최근 기록.
 * 우: 탭(기록·달력·통계).
 *   - 기록: 보기 모드(즐겨찾기/삭제/편집) ↔ 에디터(기분·날씨·제목·본문·태그).
 *   - 달력: 큰 월 그리드(무드 dot) + 범례.
 *   - 통계: 4 지표 + 감정 분포 + 최근 6개월 + 자주 쓴 태그.
 * 데이터는 기존 journalStore. 크림 팔레트는 래퍼 CSS 변수로 격리.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, NotebookPen, Search, Star, Pencil, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { useJournal } from '@/hooks/useJournal';
import { useJournalStreak } from '@/hooks/useJournalStreak';
import { journalStore } from '@/services/journalStore';
import { WEATHER_META, type JournalEntry, type Weather } from '@/types/journal';

const CREAM: CSSProperties = {
  '--cream-bg': '37 30% 84%',
  '--cream-panel': '36 31% 87%',
  '--cream-card': '40 42% 93%',
  '--cream-ink': '25 24% 21%',
  '--cream-muted': '28 13% 42%',
  '--cream-line': '34 24% 77%',
  '--cream-accent': '16 52% 46%',
  '--cream-dark': '28 18% 22%',
} as CSSProperties;

/** 감정 6종 — named key + 라벨 + 컬러. */
const MOODS = [
  { key: 'happy',   label: '행복', color: 'hsl(35 85% 55%)' },
  { key: 'flutter', label: '설렘', color: 'hsl(340 55% 68%)' },
  { key: 'calm',    label: '평온', color: 'hsl(145 40% 50%)' },
  { key: 'blue',    label: '우울', color: 'hsl(215 50% 60%)' },
  { key: 'tired',   label: '지침', color: 'hsl(30 8% 58%)' },
  { key: 'angry',   label: '화남', color: 'hsl(5 60% 56%)' },
] as const;
const MOOD_BY_KEY = Object.fromEntries(MOODS.map((m) => [m.key, m]));
/** legacy mood(1-5) → 감정 키. */
const LEGACY_MOOD: Record<number, string> = { 5: 'happy', 4: 'calm', 3: 'tired', 2: 'blue', 1: 'angry' };
const entryMoodKey = (e: JournalEntry): string | null => e.moodKey ?? (e.mood ? LEGACY_MOOD[e.mood] : null);
const moodColor = (key: string | null) => (key && MOOD_BY_KEY[key] ? MOOD_BY_KEY[key].color : 'hsl(var(--cream-line))');

const WEATHERS: Weather[] = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy'];
const TAGS = ['일상', '감사', '운동', '독서', '여행', '음식', '사람', '생각'];
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type Tab = 'write' | 'calendar' | 'stats';

export default function Journal() {
  const allEntries = useJournal();
  const streak = useJournalStreak(allEntries);

  const [tab, setTab] = useState<Tab>('write');
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [calAnchor, setCalAnchor] = useState(() => new Date());
  const [editing, setEditing] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false); // 기록 탭: false=목록, true=상세(보기/편집)
  const [query, setQuery] = useState('');

  // 에디터 로컬 상태
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [moodKey, setMoodKey] = useState<string | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [starred, setStarred] = useState(false);

  const todayKey = dateKey(new Date());
  const current = journalStore.listByDate(selectedDate)[0] as JournalEntry | undefined;

  // 선택 날짜 → 로드
  useEffect(() => {
    const e = journalStore.listByDate(selectedDate)[0];
    setTitle(e?.title ?? '');
    setBody(e?.body ?? '');
    setMoodKey(e ? entryMoodKey(e) : null);
    setWeather(e?.weather ?? null);
    setTags(e?.tags ?? []);
    setStarred(e?.starred ?? false);
  }, [selectedDate, allEntries.length]);

  // 자동 저장(편집 중일 때만)
  const saveTimer = useRef<number | null>(null);
  const persist = () => {
    const existing = journalStore.listByDate(selectedDate)[0];
    const data = {
      title: title.trim() || undefined,
      moodKey: moodKey ?? undefined,
      weather: weather ?? undefined,
      tags,
      starred,
      bodyFormat: 'plain' as const,
    };
    if (existing) journalStore.update(existing.id, { ...data, body });
    else if (body.trim() || title.trim() || moodKey || weather || tags.length > 0) journalStore.add({ date: selectedDate, body, ...data });
  };
  useEffect(() => {
    if (!editing) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(persist, 500);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, moodKey, weather, tags, editing]);

  const handleSave = () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    persist();
    setEditing(false);
    notify.success('저장됐어요', { duration: 1500 });
  };
  const toggleStar = () => {
    const e = journalStore.listByDate(selectedDate)[0];
    if (!e) return;
    journalStore.update(e.id, { starred: !e.starred });
    setStarred(!e.starred);
  };
  const handleDelete = () => {
    const e = journalStore.listByDate(selectedDate)[0];
    if (!e || !window.confirm('이 일기를 삭제할까요?')) return;
    journalStore.remove(e.id);
    setSelectedDate(todayKey);
    setDetailOpen(false);
  };
  const goWriteToday = () => { setSelectedDate(todayKey); setCalAnchor(new Date()); setEditing(true); setDetailOpen(true); setTab('write'); };
  const openEntry = (date: string) => { setSelectedDate(date); setEditing(false); setDetailOpen(true); setTab('write'); };
  const openDate = (date: string) => { setSelectedDate(date); setEditing(!journalStore.listByDate(date)[0]); setDetailOpen(true); setTab('write'); };
  const backToList = () => { setDetailOpen(false); setEditing(false); };
  const toggleTag = (t: string) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  // 파생
  const recent = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...allEntries]
      .filter((e) => !q || `${e.title ?? ''} ${e.body}`.toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 12);
  }, [allEntries, query]);
  const feed = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...allEntries]
      .filter((e) => !q || `${e.title ?? ''} ${e.body}`.toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allEntries, query]);
  const moodByDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of allEntries) { const k = entryMoodKey(e); if (k && !map.has(e.date)) map.set(e.date, k); }
    return map;
  }, [allEntries]);
  const monthDist = useMemo(() => {
    const p = `${todayKey.slice(0, 7)}`;
    const dist = new Map<string, number>();
    for (const e of allEntries) { if (!e.date.startsWith(p)) continue; const k = entryMoodKey(e); if (k) dist.set(k, (dist.get(k) ?? 0) + 1); }
    return dist;
  }, [allEntries, todayKey]);

  const sel = new Date(`${selectedDate}T00:00:00`);
  const y = calAnchor.getFullYear();
  const m = calAnchor.getMonth();
  const lead = new Date(y, m, 1).getDay();
  const daysIn = new Date(y, m + 1, 0).getDate();
  const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;
  const monthCount = allEntries.filter((e) => e.date.startsWith(monthPrefix)).length;

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
            {Array(lead).fill(null).map((_, i) => <span key={`x${i}`} />)}
            {Array.from({ length: daysIn }, (_, i) => {
              const d = dateKey(new Date(y, m, i + 1));
              const isSel = d === selectedDate;
              const isToday = d === todayKey;
              const dot = moodByDate.get(d);
              return (
                <button key={d} type="button" onClick={() => openDate(d)} className="flex flex-col items-center py-0.5">
                  <span className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-[12px] tabular-nums transition-colors',
                    isSel ? 'bg-[hsl(var(--cream-accent))] font-bold text-white'
                          : isToday ? 'font-bold text-[hsl(var(--cream-accent))]'
                          : 'text-[hsl(var(--cream-ink))]/80 hover:bg-[hsl(var(--cream-line))]/40',
                  )}>{i + 1}</span>
                  <span className="mt-0.5 h-1 w-1 rounded-full" style={{ backgroundColor: dot && !isSel ? moodColor(dot) : 'transparent' }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* 이번 달 기분 */}
        {monthDist.size > 0 && (
          <div className="px-4 pb-3">
            <div className="mb-1.5 text-[11px] font-semibold text-[hsl(var(--cream-muted))]">이번 달 기분</div>
            <div className="flex h-2 overflow-hidden rounded-full bg-[hsl(var(--cream-line))]/50">
              {MOODS.map((mo) => { const c = monthDist.get(mo.key) ?? 0; const tot = [...monthDist.values()].reduce((a, b) => a + b, 0) || 1; return c > 0 ? <div key={mo.key} style={{ width: `${(c / tot) * 100}%`, backgroundColor: mo.color }} /> : null; })}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-[hsl(var(--cream-muted))]">
              {MOODS.map((mo) => { const c = monthDist.get(mo.key) ?? 0; return c > 0 ? <span key={mo.key} className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: mo.color }} />{mo.label} {c}</span> : null; })}
            </div>
          </div>
        )}

        {/* 검색 */}
        <div className="px-4 pb-2">
          <label className="flex h-8 items-center gap-1.5 rounded-lg border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] px-2.5">
            <Search className="h-3.5 w-3.5 text-[hsl(var(--cream-muted))]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="일기 검색…" className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[hsl(var(--cream-muted))]" />
          </label>
        </div>

        {/* 최근 기록 */}
        <div className="border-t border-[hsl(var(--cream-line))] px-4 py-3">
          <div className="mb-2 text-[11px] font-semibold text-[hsl(var(--cream-muted))]">최근 기록</div>
          <div className="flex flex-col gap-2.5">
            {recent.length === 0 && <p className="text-[12px] text-[hsl(var(--cream-muted))]/70">기록이 없어요.</p>}
            {recent.map((e) => {
              const dd = new Date(`${e.date}T00:00:00`);
              const t = e.title?.trim() || e.body.split('\n')[0]?.trim() || '무제';
              const ex = (e.title ? e.body : e.body.split('\n').slice(1).join(' ')).trim();
              const on = e.date === selectedDate;
              return (
                <button key={e.id} type="button" onClick={() => openEntry(e.date)} className={cn('rounded-lg px-2 py-1.5 text-left transition-colors', on ? 'bg-[hsl(var(--cream-accent))]/10' : 'hover:bg-[hsl(var(--cream-line))]/30')}>
                  <div className="flex items-center gap-1.5 text-[10.5px] text-[hsl(var(--cream-muted))]">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: moodColor(entryMoodKey(e)) }} />
                    {dd.getMonth() + 1}월 {dd.getDate()}일 · {WEEKDAY[dd.getDay()]}
                    {e.starred && <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />}
                  </div>
                  <div className="mt-0.5 truncate text-[13px] font-semibold text-[hsl(var(--cream-ink))]">{t}</div>
                  {ex && <div className="truncate text-[11.5px] text-[hsl(var(--cream-muted))]">{ex}</div>}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ── 메인 ── */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[880px] px-8 py-7">
          {/* 탭 + 오늘 쓰기 */}
          <div className="mb-5 flex items-center justify-between">
            <div className="inline-flex rounded-full bg-[hsl(var(--cream-card))] p-1">
              {([['write', '기록'], ['calendar', '달력'], ['stats', '통계']] as [Tab, string][]).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setTab(id)} className={cn('rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-colors', tab === id ? 'bg-[hsl(var(--cream-dark))] text-white' : 'text-[hsl(var(--cream-muted))] hover:text-[hsl(var(--cream-ink))]')}>{label}</button>
              ))}
            </div>
            <button type="button" onClick={goWriteToday} className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--cream-dark))] px-4 py-2 text-[12.5px] font-bold text-white hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> 오늘 쓰기
            </button>
          </div>

          {/* ── 기록 탭: 목록 ── */}
          {tab === 'write' && !detailOpen && (
            <div className="flex flex-col gap-2.5">
              {feed.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))]/50 py-16 text-center">
                  <p className="text-[13.5px] text-[hsl(var(--cream-muted))]">아직 기록이 없어요.</p>
                  <button type="button" onClick={goWriteToday} className="mt-3 rounded-full bg-[hsl(var(--cream-dark))] px-4 py-2 text-[12.5px] font-bold text-white">오늘 일기 쓰기</button>
                </div>
              )}
              {feed.map((e) => {
                const dd = new Date(`${e.date}T00:00:00`);
                const mk = entryMoodKey(e);
                const t = e.title?.trim() || e.body.split('\n')[0]?.trim() || '무제';
                const ex = (e.title ? e.body : e.body.split('\n').slice(1).join(' ')).trim();
                return (
                  <button key={e.id} type="button" onClick={() => openEntry(e.date)} className="group flex gap-4 rounded-2xl border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] px-4 py-3.5 text-left transition-colors hover:border-[hsl(var(--cream-accent))]/35">
                    <div className="flex h-[54px] w-[54px] shrink-0 flex-col items-center justify-center rounded-xl bg-[hsl(var(--cream-bg))]/50">
                      <span className="text-[9.5px] font-semibold uppercase text-[hsl(var(--cream-muted))]">{dd.getMonth() + 1}월</span>
                      <span className="text-[19px] font-bold leading-none tabular-nums">{dd.getDate()}</span>
                      <span className="mt-0.5 text-[9px] text-[hsl(var(--cream-muted))]/70">{WEEKDAY[dd.getDay()]}</span>
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <div className="flex items-center gap-1.5">
                        {mk && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: moodColor(mk) }} />}
                        <h3 className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{t}</h3>
                        {e.starred && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                      </div>
                      {ex && <p className="mt-1 line-clamp-2 text-[12.5px] leading-[1.6] text-[hsl(var(--cream-muted))]">{ex}</p>}
                      {(e.tags?.length ?? 0) > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">{e.tags!.slice(0, 4).map((tg) => <span key={tg} className="rounded-full bg-[hsl(var(--cream-line))]/35 px-1.5 py-0.5 text-[10px] text-[hsl(var(--cream-muted))]">#{tg}</span>)}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── 기록 탭: 상세(보기/편집) ── */}
          {tab === 'write' && detailOpen && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <button type="button" onClick={backToList} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[13px] text-[hsl(var(--cream-muted))] hover:text-[hsl(var(--cream-ink))]"><ChevronLeft className="h-4 w-4" /> 목록</button>
                {selectedDate !== todayKey && (
                  <button type="button" onClick={() => { setSelectedDate(todayKey); setCalAnchor(new Date()); }} className="rounded-full border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] px-3.5 py-1.5 text-[12.5px] text-[hsl(var(--cream-ink))]/80 hover:border-[hsl(var(--cream-accent))]/40">오늘로</button>
                )}
              </div>
              <div className="mb-4">
                <div className="text-[13px] text-[hsl(var(--cream-muted))]">{WEEKDAY[sel.getDay()]}요일</div>
                <h1 className="text-[28px] font-bold tracking-tight">{sel.getFullYear()}년 {sel.getMonth() + 1}월 {sel.getDate()}일</h1>
              </div>

              {!editing && current ? (
                /* 보기 모드 */
                <div className="rounded-2xl border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-6 shadow-[0_4px_24px_-16px_hsl(25_30%_20%/0.18)]">
                  <div className="flex flex-wrap gap-2">
                    {moodKey && MOOD_BY_KEY[moodKey] && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--cream-accent))]/12 px-3 py-1 text-[12.5px] font-semibold"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: MOOD_BY_KEY[moodKey].color }} />{MOOD_BY_KEY[moodKey].label}</span>
                    )}
                    {weather && <span className="rounded-full bg-[hsl(var(--cream-line))]/40 px-3 py-1 text-[12.5px]">{WEATHER_META[weather].emoji} {WEATHER_META[weather].label}</span>}
                  </div>
                  {title && <h2 className="mt-4 text-[22px] font-bold">{title}</h2>}
                  <p className="mt-3 whitespace-pre-wrap text-[14px] leading-[1.9] text-[hsl(var(--cream-ink))]/90">{body || '(내용 없음)'}</p>
                  {tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">{tags.map((t) => <span key={t} className="rounded-full bg-[hsl(var(--cream-line))]/40 px-2.5 py-1 text-[11.5px] text-[hsl(var(--cream-muted))]">#{t}</span>)}</div>
                  )}
                  <div className="mt-5 flex items-center justify-between border-t border-[hsl(var(--cream-line))] pt-4">
                    <button type="button" onClick={toggleStar} className={cn('inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px]', starred ? 'border-amber-300 bg-amber-50 text-amber-600' : 'border-[hsl(var(--cream-line))] text-[hsl(var(--cream-muted))] hover:text-[hsl(var(--cream-ink))]')}>
                      <Star className={cn('h-3.5 w-3.5', starred && 'fill-amber-400 text-amber-400')} /> 즐겨찾기
                    </button>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={handleDelete} className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--cream-line))] px-3.5 py-1.5 text-[12.5px] text-[hsl(var(--cream-muted))] hover:border-rose-300 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /> 삭제</button>
                      <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] px-3.5 py-1.5 text-[12.5px] font-medium hover:border-[hsl(var(--cream-accent))]/40"><Pencil className="h-3.5 w-3.5" /> 편집하기</button>
                    </div>
                  </div>
                </div>
              ) : (
                /* 에디터 */
                <div className="rounded-2xl border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-6 shadow-[0_4px_24px_-16px_hsl(25_30%_20%/0.18)]">
                  <div className="mb-2 text-[12px] text-[hsl(var(--cream-muted))]">오늘의 기분</div>
                  <div className="flex flex-wrap gap-2">
                    {MOODS.map((mo) => { const on = moodKey === mo.key; return (
                      <button key={mo.key} type="button" onClick={() => setMoodKey(on ? null : mo.key)} className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors', on ? 'border-transparent bg-[hsl(var(--cream-accent))]/12 font-semibold' : 'border-[hsl(var(--cream-line))] text-[hsl(var(--cream-ink))]/75 hover:border-[hsl(var(--cream-accent))]/30')}>
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: mo.color }} />{mo.label}
                      </button>
                    ); })}
                  </div>
                  <div className="mb-2 mt-4 text-[12px] text-[hsl(var(--cream-muted))]">날씨</div>
                  <div className="flex flex-wrap gap-2">
                    {WEATHERS.map((w) => { const on = weather === w; return (
                      <button key={w} type="button" onClick={() => setWeather(on ? null : w)} className={cn('inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12.5px] transition-colors', on ? 'border-transparent bg-[hsl(var(--cream-accent))]/12 font-semibold' : 'border-[hsl(var(--cream-line))] text-[hsl(var(--cream-ink))]/75 hover:border-[hsl(var(--cream-accent))]/30')}>
                        <span aria-hidden>{WEATHER_META[w].emoji}</span>{WEATHER_META[w].label}
                      </button>
                    ); })}
                  </div>
                  <hr className="my-5 border-[hsl(var(--cream-line))]" />
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력하세요" className="w-full bg-transparent text-[22px] font-bold outline-none placeholder:text-[hsl(var(--cream-muted))]/55" />
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="오늘 하루는 어땠나요? 마음에 남은 순간을 적어보세요." className="mt-3 min-h-[240px] w-full resize-y bg-transparent text-[14px] text-[hsl(var(--cream-ink))]/90 outline-none placeholder:text-[hsl(var(--cream-muted))]/55" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 31px, hsl(var(--cream-line)) 31px, hsl(var(--cream-line)) 32px)', lineHeight: '32px' }} />
                  <div className="mb-2 mt-4 text-[12px] text-[hsl(var(--cream-muted))]">태그</div>
                  <div className="flex flex-wrap gap-2">
                    {TAGS.map((t) => { const on = tags.includes(t); return (
                      <button key={t} type="button" onClick={() => toggleTag(t)} className={cn('rounded-full border px-3 py-1 text-[12px] transition-colors', on ? 'border-transparent bg-[hsl(var(--cream-accent))]/12 font-semibold' : 'border-[hsl(var(--cream-line))] text-[hsl(var(--cream-ink))]/70 hover:border-[hsl(var(--cream-accent))]/30')}>#{t}</button>
                    ); })}
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-[hsl(var(--cream-line))] pt-4">
                    <span className="text-[12px] text-[hsl(var(--cream-muted))]">{body.length}자 작성 중</span>
                    <button type="button" onClick={handleSave} disabled={!body.trim() && !title.trim() && !moodKey && !weather && tags.length === 0} className="rounded-lg bg-[hsl(var(--cream-accent))] px-5 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-40">저장하기</button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── 달력 탭 ── */}
          {tab === 'calendar' && (
            <div className="rounded-2xl border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-6">
              <div className="mb-4 flex items-center justify-center gap-4">
                <button type="button" onClick={() => setCalAnchor(new Date(y, m - 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-full text-[hsl(var(--cream-muted))] hover:bg-[hsl(var(--cream-line))]/40" aria-label="이전 달"><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-[17px] font-bold">{y}년 {m + 1}월</span>
                <button type="button" onClick={() => setCalAnchor(new Date(y, m + 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-full text-[hsl(var(--cream-muted))] hover:bg-[hsl(var(--cream-line))]/40" aria-label="다음 달"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <div className="mb-2 grid grid-cols-7 text-center text-[11px] text-[hsl(var(--cream-muted))]">
                {WEEKDAY.map((w) => <span key={w}>{w}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {Array(lead).fill(null).map((_, i) => <div key={`x${i}`} />)}
                {Array.from({ length: daysIn }, (_, i) => {
                  const d = dateKey(new Date(y, m, i + 1));
                  const isToday = d === todayKey;
                  const dot = moodByDate.get(d);
                  return (
                    <button key={d} type="button" onClick={() => openDate(d)} className={cn('flex aspect-square flex-col rounded-xl border p-2 text-left transition-colors', isToday ? 'border-[hsl(var(--cream-accent))] bg-[hsl(var(--cream-accent))]/8' : 'border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-bg))]/40 hover:border-[hsl(var(--cream-accent))]/40')}>
                      <span className={cn('text-[12px] tabular-nums', isToday ? 'font-bold text-[hsl(var(--cream-accent))]' : 'text-[hsl(var(--cream-ink))]/70')}>{i + 1}</span>
                      {dot && <span className="mx-auto mt-auto mb-1 h-2 w-2 rounded-full" style={{ backgroundColor: moodColor(dot) }} />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-[hsl(var(--cream-line))] pt-4 text-[11px] text-[hsl(var(--cream-muted))]">
                {MOODS.map((mo) => <span key={mo.key} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: mo.color }} />{mo.label}</span>)}
              </div>
            </div>
          )}

          {/* ── 통계 탭 ── */}
          {tab === 'stats' && <StatsView entries={allEntries} streak={streak} monthCount={monthCount} />}
        </div>
      </main>
    </div>
  );
}

/* ── 통계 뷰 ── */
function StatsView({ entries, streak, monthCount }: { entries: JournalEntry[]; streak: number; monthCount: number }) {
  const withMood = entries.map(entryMoodKey).filter(Boolean) as string[];
  const dist = new Map<string, number>();
  for (const k of withMood) dist.set(k, (dist.get(k) ?? 0) + 1);
  const total = withMood.length || 1;
  const topMood = [...dist.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // 최근 6개월
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { label: `${d.getMonth() + 1}월`, count: entries.filter((e) => e.date.startsWith(prefix)).length };
  });
  const maxM = Math.max(1, ...months.map((x) => x.count));

  // 태그 빈도
  const tagFreq = new Map<string, number>();
  for (const e of entries) for (const t of e.tags ?? []) tagFreq.set(t, (tagFreq.get(t) ?? 0) + 1);
  const topTags = [...tagFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);

  const card = 'rounded-2xl border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-5';
  return (
    <div className="flex flex-col gap-4">
      {/* 4 지표 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[['전체 기록', String(entries.length)], ['이번 달 기록', String(monthCount)], ['연속 기록일', String(streak)]].map(([label, val]) => (
          <div key={label} className={card}>
            <div className="text-[30px] font-extrabold text-[hsl(var(--cream-ink))]">{val}</div>
            <div className="mt-1 text-[12px] text-[hsl(var(--cream-muted))]">{label}</div>
          </div>
        ))}
        <div className={card}>
          <div className="flex items-center gap-1.5 text-[18px] font-bold">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: moodColor(topMood) }} />
            {topMood && MOOD_BY_KEY[topMood] ? MOOD_BY_KEY[topMood].label : '—'}
          </div>
          <div className="mt-1 text-[12px] text-[hsl(var(--cream-muted))]">가장 자주 느낀 감정</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 감정 분포 */}
        <div className={card}>
          <div className="mb-3 text-[14px] font-bold">감정 분포</div>
          <div className="flex flex-col gap-2.5">
            {MOODS.map((mo) => {
              const c = dist.get(mo.key) ?? 0;
              const pct = Math.round((c / total) * 100);
              return (
                <div key={mo.key} className="flex items-center gap-2.5">
                  <span className="w-8 shrink-0 text-[11.5px] text-[hsl(var(--cream-muted))]">{mo.label}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[hsl(var(--cream-line))]/50">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: mo.color }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-[10.5px] tabular-nums text-[hsl(var(--cream-muted))]">{c}회 · {pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 최근 6개월 */}
        <div className={card}>
          <div className="mb-3 text-[14px] font-bold">최근 6개월 기록</div>
          <div className="flex h-[150px] items-end justify-between gap-2">
            {months.map((mo) => (
              <div key={mo.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10.5px] tabular-nums text-[hsl(var(--cream-muted))]">{mo.count}</span>
                <div className="w-full rounded-t-md bg-[hsl(var(--cream-accent))]/80" style={{ height: `${(mo.count / maxM) * 110}px`, minHeight: '3px' }} />
                <span className="text-[10.5px] text-[hsl(var(--cream-muted))]">{mo.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 자주 쓴 태그 */}
      {topTags.length > 0 && (
        <div className={card}>
          <div className="mb-3 text-[14px] font-bold">자주 쓴 태그</div>
          <div className="flex flex-wrap gap-2">
            {topTags.map(([t, c]) => (
              <span key={t} className="inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--cream-line))]/35 px-2.5 py-1 text-[12px] text-[hsl(var(--cream-ink))]/80"># {t} <b className="text-[hsl(var(--cream-accent))]">{c}</b></span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
