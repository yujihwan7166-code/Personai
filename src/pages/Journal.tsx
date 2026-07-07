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
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronLeft, ChevronRight, NotebookPen, Search, Star, Pencil, Trash2, Plus, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { useJournal } from '@/hooks/useJournal';
import { useJournalStreak } from '@/hooks/useJournalStreak';
import { journalStore } from '@/services/journalStore';
import { WEATHER_META, type JournalEntry, type Weather, type DiarySticker } from '@/types/journal';

const CREAM: CSSProperties = {
  '--cream-bg': '39 34% 90%',
  '--cream-panel': '40 36% 92%',
  '--cream-card': '44 50% 98%',
  '--cream-ink': '26 22% 22%',
  '--cream-muted': '28 12% 47%',
  '--cream-line': '38 26% 87%',
  '--cream-accent': '17 55% 49%',
  '--cream-dark': '27 18% 24%',
} as CSSProperties;

/** 감정 6종 — named key + 라벨 + 컬러. */
const MOODS = [
  { key: 'happy',   label: '행복', emoji: '😄', color: 'hsl(35 85% 55%)' },
  { key: 'flutter', label: '설렘', emoji: '🥰', color: 'hsl(340 55% 68%)' },
  { key: 'calm',    label: '평온', emoji: '😌', color: 'hsl(145 40% 50%)' },
  { key: 'blue',    label: '우울', emoji: '😔', color: 'hsl(215 50% 60%)' },
  { key: 'tired',   label: '지침', emoji: '😩', color: 'hsl(30 8% 58%)' },
  { key: 'angry',   label: '화남', emoji: '😤', color: 'hsl(5 60% 56%)' },
] as const;
const MOOD_BY_KEY = Object.fromEntries(MOODS.map((m) => [m.key, m]));
/** legacy mood(1-5) → 감정 키. */
const LEGACY_MOOD: Record<number, string> = { 5: 'happy', 4: 'calm', 3: 'tired', 2: 'blue', 1: 'angry' };
const entryMoodKey = (e: JournalEntry): string | null => e.moodKey ?? (e.mood ? LEGACY_MOOD[e.mood] : null);
const moodColor = (key: string | null) => (key && MOOD_BY_KEY[key] ? MOOD_BY_KEY[key].color : 'hsl(var(--cream-line))');

const WEATHERS: Weather[] = ['sunny', 'cloudy', 'overcast', 'rainy', 'stormy', 'snowy', 'windy', 'foggy', 'rainbow', 'night'];
const COLORS = ['#e0876b', '#e3b45c', '#8faf83', '#7fa9bd', '#a98bb0', '#b98f74'];
const QUESTIONS = [
  '오늘 가장 감사했던 순간은?',
  '오늘 나를 웃게 한 건 무엇이었나요?',
  '지금 이 순간의 기분을 색으로 표현하면?',
  '오늘 가장 오래 남은 장면은?',
  '내일의 나에게 한마디 남긴다면?',
  '오늘 배운 작은 것 하나는?',
  '지금 가장 마음이 쓰이는 것은?',
  '오늘 누군가에게 고마웠던 일이 있나요?',
  '오늘의 나에게 점수를 준다면 몇 점?',
  '오늘 가장 맛있게 먹은 것은?',
  '오늘 들은 말 중 기억에 남는 한마디는?',
  '요즘 자주 떠오르는 생각은?',
  '오늘 하루를 한 단어로 표현하면?',
  '최근 가장 크게 웃었던 순간은?',
  '오늘 나를 힘들게 한 건 무엇이었나요?',
  '지금 가장 하고 싶은 것은?',
  '오늘 발견한 작은 행복은?',
  '요즘 나를 설레게 하는 것은?',
  '오늘 스스로를 칭찬한다면?',
  '지금 곁에 있는 사람에게 하고 싶은 말은?',
  '오늘 놓치고 싶지 않은 장면은?',
  '최근에 새로 알게 된 것은?',
  '오늘 가장 편안했던 순간은?',
  '지금 내 마음의 날씨는?',
  '오늘 하루 중 다시 돌아가고 싶은 시간은?',
  '요즘 가장 자주 듣는 노래는?',
  '오늘 나에게 필요한 위로 한마디는?',
  '최근 도전해보고 싶어진 것은?',
  '오늘 내가 잘한 선택 하나는?',
  '지금 이 계절에서 좋아하는 것은?',
  '오늘 문득 떠오른 사람은?',
  '요즘 내가 미루고 있는 것은?',
  '오늘 하루 에너지를 채워준 것은?',
  '내가 요즘 가장 아끼는 시간은?',
  '오늘 남기고 싶은 사진 같은 순간은?',
  '지금의 나에게 가장 중요한 것은?',
  '오늘 조금 아쉬웠던 점은?',
  '요즘 내 마음을 편하게 해주는 것은?',
  '오늘 처음 해본 것이 있나요?',
  '내일이 기대되는 이유 하나는?',
];
const TAGS = ['일상', '감사', '운동', '독서', '여행', '음식', '사람', '생각'];
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
const STICKERS = ['🌷', '✨', '🎀', '🌙', '💌', '🍰', '🐰', '⭐', '🌿', '🍓', '☕', '🫧', '💗', '🌈', '🔖', '🌼', '🦋', '🍋'];
const sid = () => (crypto.randomUUID?.() ?? String(Date.now() + Math.random()));

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
  const [color, setColor] = useState<string | null>(null);
  const [bgm, setBgm] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [stickers, setStickers] = useState<DiarySticker[]>([]);
  const [activeSticker, setActiveSticker] = useState<string | null>(null);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const panelDragRef = useRef<{ dx: number; dy: number } | null>(null);
  const [tagDraft, setTagDraft] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<string | null>(null);
  const onPickPhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };
  const addSticker = (emoji: string) =>
    setStickers((p) => [...p, { id: sid(), emoji, x: 50, y: 40, rot: Math.round((Math.random() - 0.5) * 24) }]);
  const removeSticker = (id: string) => { setStickers((p) => p.filter((s) => s.id !== id)); setActiveSticker(null); };
  const stickerDown = (e: ReactPointerEvent, id: string) => {
    e.stopPropagation();
    draggingRef.current = id;
    setActiveSticker(id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const stickerMove = (e: ReactPointerEvent) => {
    if (!draggingRef.current || !layerRef.current) return;
    const r = layerRef.current.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.max(2, Math.min(98, ((e.clientY - r.top) / r.height) * 100));
    setStickers((p) => p.map((s) => (s.id === draggingRef.current ? { ...s, x, y } : s)));
  };
  const stickerUp = (e: ReactPointerEvent) => {
    draggingRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };
  const openStickerPanel = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (stickerOpen) { setStickerOpen(false); return; }
    const r = e.currentTarget.getBoundingClientRect();
    const w = 236, h = 200;
    setPanelPos({ x: Math.max(12, r.right - w), y: Math.max(12, r.top - h - 8) });
    setStickerOpen(true);
  };
  const panelDown = (e: ReactPointerEvent) => {
    e.stopPropagation();
    panelDragRef.current = { dx: e.clientX - panelPos.x, dy: e.clientY - panelPos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const panelMove = (e: ReactPointerEvent) => {
    if (!panelDragRef.current) return;
    setPanelPos({ x: e.clientX - panelDragRef.current.dx, y: e.clientY - panelDragRef.current.dy });
  };
  const panelUp = (e: ReactPointerEvent) => {
    panelDragRef.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
  };

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
    setColor(e?.color ?? null);
    setBgm(e?.bgm ?? '');
    setPhoto(e?.images?.[0]?.src ?? null);
    setStickers(e?.stickers ?? []);
    setActiveSticker(null);
    setStickerOpen(false);
  }, [selectedDate, allEntries.length]);

  // 자동 저장(편집 중일 때만)
  const saveTimer = useRef<number | null>(null);
  const persist = () => {
    const existing = journalStore.listByDate(selectedDate)[0];
    const data = {
      title: title.trim() || undefined,
      moodKey: moodKey ?? undefined,
      weather: weather ?? undefined,
      color: color ?? undefined,
      bgm: bgm.trim() || undefined,
      images: photo ? [{ id: 'cover', src: photo }] : undefined,
      stickers: stickers.length ? stickers : undefined,
      tags,
      starred,
      bodyFormat: 'plain' as const,
    };
    if (existing) journalStore.update(existing.id, { ...data, body });
    else if (body.trim() || title.trim() || moodKey || weather || color || bgm.trim() || photo || stickers.length > 0 || tags.length > 0) journalStore.add({ date: selectedDate, body, ...data });
  };
  useEffect(() => {
    if (!editing) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(persist, 500);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, moodKey, weather, color, bgm, photo, stickers, tags, editing]);

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
  const backToList = () => { setDetailOpen(false); setEditing(false); setStickerOpen(false); };
  const toggleTag = (t: string) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  const addTag = () => { const t = tagDraft.trim().replace(/^#+/, '').trim(); if (t && !tags.includes(t)) setTags((p) => [...p, t]); setTagDraft(''); };

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
  const feedGroups = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const e of feed) { const k = e.date.slice(0, 7); const arr = map.get(k); if (arr) arr.push(e); else map.set(k, [e]); }
    return [...map.entries()];
  }, [feed]);
  const memory = useMemo(() => {
    const past = allEntries.filter((e) => e.date !== todayKey && (e.body.trim() || e.title?.trim()));
    return past.length ? past[Math.floor(Math.random() * past.length)] : null;
  }, [allEntries, todayKey]);
  const moodByDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of allEntries) { const k = entryMoodKey(e); if (k && !map.has(e.date)) map.set(e.date, k); }
    return map;
  }, [allEntries]);
  const dayMeta = useMemo(() => {
    const map = new Map<string, { moodKey: string | null; color?: string; weather?: Weather }>();
    for (const e of allEntries) { if (map.has(e.date)) continue; map.set(e.date, { moodKey: entryMoodKey(e), color: e.color, weather: e.weather }); }
    return map;
  }, [allEntries]);
  const monthDist = useMemo(() => {
    const p = `${todayKey.slice(0, 7)}`;
    const dist = new Map<string, number>();
    for (const e of allEntries) { if (!e.date.startsWith(p)) continue; const k = entryMoodKey(e); if (k) dist.set(k, (dist.get(k) ?? 0) + 1); }
    return dist;
  }, [allEntries, todayKey]);

  const sel = new Date(`${selectedDate}T00:00:00`);
  const dayNum = Math.floor(sel.getTime() / 86_400_000);
  const dailyQuestion = QUESTIONS[((dayNum % QUESTIONS.length) + QUESTIONS.length) % QUESTIONS.length];
  const y = calAnchor.getFullYear();
  const m = calAnchor.getMonth();
  const lead = new Date(y, m, 1).getDay();
  const daysIn = new Date(y, m + 1, 0).getDate();
  const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;
  const monthCount = allEntries.filter((e) => e.date.startsWith(monthPrefix)).length;

  return (
    <div
      style={{
        ...CREAM,
        fontFamily: "'Gowun Dodum', 'Pretendard', sans-serif",
        backgroundImage: 'radial-gradient(1100px 480px at 88% -8%, hsl(30 65% 92% / 0.4), transparent 70%), radial-gradient(900px 460px at 0% 108%, hsl(150 22% 90% / 0.28), transparent 70%), linear-gradient(180deg, hsl(40 34% 92%), hsl(38 28% 88%))',
      }}
      className="flex h-dvh bg-[hsl(var(--cream-bg))] text-[hsl(var(--cream-ink))]"
    >
      {/* ── 사이드바 ── */}
      <aside className="flex w-[288px] shrink-0 flex-col overflow-y-auto border-r border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-panel))]">
        <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[hsl(var(--cream-accent))] text-white">
            <NotebookPen className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          <div>
            <div className="text-[16px] leading-tight" style={{ fontFamily: "'Jua', sans-serif" }}>오늘의 일기</div>
            <div className="text-[10.5px] uppercase tracking-wide text-[hsl(var(--cream-muted))]">daily journal</div>
          </div>
        </div>

        <div className="mx-4 mb-3 flex items-center gap-3 rounded-2xl border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] px-3.5 py-3">
          <div className="text-center leading-none">
            <div className="text-[28px] text-[hsl(var(--cream-accent))]" style={{ fontFamily: "'Jua', sans-serif" }}>{streak}</div>
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

        {/* 오늘의 추억 — 무작위 과거 일기 */}
        {memory && (() => {
          const md = new Date(`${memory.date}T00:00:00`);
          const mmk = entryMoodKey(memory);
          const mt = memory.title?.trim() || memory.body.split('\n')[0]?.trim() || '무제';
          const msn = (memory.title ? memory.body : memory.body.split('\n').slice(1).join(' ')).trim();
          return (
            <div className="px-4 pb-3">
              <div className="mb-1.5 text-[11px] font-semibold text-[hsl(var(--cream-muted))]">🕰️ 오늘의 추억</div>
              <button type="button" onClick={() => openEntry(memory.date)} className="w-full rounded-2xl border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-3 text-left transition-colors hover:border-[hsl(var(--cream-accent))]/40" style={memory.color ? { backgroundColor: `color-mix(in srgb, ${memory.color} 8%, #f8f3ea)` } : undefined}>
                <div className="flex items-center gap-1.5 text-[10.5px] text-[hsl(var(--cream-muted))]">
                  {mmk && MOOD_BY_KEY[mmk] && <span className="text-[13px] leading-none">{MOOD_BY_KEY[mmk].emoji}</span>}
                  {md.getFullYear()}. {md.getMonth() + 1}. {md.getDate()} · {WEEKDAY[md.getDay()]}
                </div>
                <div className="mt-0.5 truncate text-[13px] font-semibold text-[hsl(var(--cream-ink))]">{mt}</div>
                {msn && <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-[1.5] text-[hsl(var(--cream-muted))]">{msn}</p>}
              </button>
            </div>
          );
        })()}

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
        <div className="mx-auto w-full max-w-[880px] px-8 pb-7 pt-14">
          {/* 탭 + 오늘 쓰기 — 작성/보기 상세 화면에선 숨겨 집중 */}
          {!(tab === 'write' && detailOpen) && (
            <div className="mb-5 flex items-center justify-between">
              <div className="inline-flex rounded-full bg-[hsl(var(--cream-card))] p-1">
                {([['write', '기록'], ['calendar', '달력'], ['stats', '통계']] as [Tab, string][]).map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setTab(id)} className={cn('rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-colors', tab === id ? 'bg-[hsl(var(--cream-dark))] text-white' : 'text-[hsl(var(--cream-muted))] hover:text-[hsl(var(--cream-ink))]')}>{label}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {tab === 'write' && (
                  <label className="flex h-9 items-center gap-1.5 rounded-full border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] px-3 transition-colors focus-within:border-[hsl(var(--cream-accent))]/45">
                    <Search className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--cream-muted))]" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="검색" className="w-24 bg-transparent text-[12.5px] outline-none transition-[width] placeholder:text-[hsl(var(--cream-muted))] focus:w-40" />
                  </label>
                )}
                <button type="button" onClick={goWriteToday} className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--cream-dark))] px-4 py-2 text-[12.5px] font-bold text-white hover:opacity-90">
                  <Plus className="h-3.5 w-3.5" /> 오늘 쓰기
                </button>
              </div>
            </div>
          )}

          {/* ── 기록 탭: 목록 ── */}
          {tab === 'write' && !detailOpen && (
            <div className="flex flex-col gap-5">
              {feed.length === 0 && (
                <div className="rounded-[26px] border border-dashed border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))]/50 py-16 text-center">
                  <p className="text-[13.5px] text-[hsl(var(--cream-muted))]">아직 기록이 없어요.</p>
                  <button type="button" onClick={goWriteToday} className="mt-3 rounded-full bg-[hsl(var(--cream-dark))] px-4 py-2 text-[12.5px] font-bold text-white">오늘 일기 쓰기</button>
                </div>
              )}
              {feedGroups.map(([month, items]) => (
                <section key={month}>
                  <div className="mb-2.5 flex items-center gap-2 px-1">
                    <h2 className="text-[15px] text-[hsl(var(--cream-ink))]/80" style={{ fontFamily: "'Jua', sans-serif" }}>{month.slice(0, 4)}년 {Number(month.slice(5))}월</h2>
                    <span className="text-[11px] tabular-nums text-[hsl(var(--cream-muted))]/70">{items.length}편</span>
                    <span className="h-px flex-1 bg-[hsl(var(--cream-line))]/70" />
                  </div>
                  <div className="flex flex-col gap-3">
                    {items.map((e) => {
                      const dd = new Date(`${e.date}T00:00:00`);
                      const mk = entryMoodKey(e);
                      const t = e.title?.trim() || e.body.split('\n')[0]?.trim() || '무제';
                      const ex = (e.title ? e.body : e.body.split('\n').slice(1).join(' ')).trim();
                      return (
                        <button key={e.id} type="button" onClick={() => openEntry(e.date)} className="group relative flex items-start gap-5 overflow-hidden rounded-[24px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] py-5 pl-6 pr-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[hsl(var(--cream-accent))]/25 hover:shadow-[0_14px_30px_-18px_hsl(25_30%_20%/0.3)]" style={e.color ? { backgroundColor: `color-mix(in srgb, ${e.color} 6%, #f8f3ea)` } : undefined}>
                          <div className="flex w-[52px] shrink-0 flex-col items-center pt-0.5">
                            <span className="text-[10px] font-semibold uppercase text-[hsl(var(--cream-muted))]">{dd.getMonth() + 1}월</span>
                            <span className="text-[30px] font-bold leading-none tabular-nums text-[hsl(var(--cream-ink))]" style={{ fontFamily: "'Jua', sans-serif" }}>{dd.getDate()}</span>
                            <span className="mt-0.5 text-[10.5px] text-[hsl(var(--cream-muted))]/80">{WEEKDAY[dd.getDay()]}요일</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {mk && MOOD_BY_KEY[mk] && <span className="shrink-0 text-[19px] leading-none">{MOOD_BY_KEY[mk].emoji}</span>}
                              <h3 className="min-w-0 flex-1 truncate text-[16.5px] font-bold text-[hsl(var(--cream-ink))]">{t}</h3>
                              {e.starred && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />}
                            </div>
                            {ex ? (
                              <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-[13px] leading-[1.75] text-[hsl(var(--cream-ink))]/75">{ex}</p>
                            ) : (
                              <p className="mt-1.5 text-[13px] italic text-[hsl(var(--cream-muted))]/55">기록만 남긴 하루</p>
                            )}
                            {(e.weather || e.bgm || (e.tags?.length ?? 0) > 0) && (
                              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                {e.weather && <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--cream-line))]/40 px-2 py-0.5 text-[10.5px] text-[hsl(var(--cream-ink))]/65">{WEATHER_META[e.weather].emoji} {WEATHER_META[e.weather].label}</span>}
                                {e.bgm && <span className="inline-flex max-w-[150px] items-center gap-1 truncate rounded-full bg-[hsl(var(--cream-line))]/40 px-2 py-0.5 text-[10.5px] text-[hsl(var(--cream-ink))]/65">🎧 {e.bgm}</span>}
                                {e.tags?.slice(0, 5).map((tg) => <span key={tg} className="rounded-full bg-[hsl(var(--cream-accent))]/10 px-2 py-0.5 text-[10.5px] text-[hsl(var(--cream-muted))]">#{tg}</span>)}
                              </div>
                            )}
                          </div>
                          {e.images?.[0] && (
                            <div className="hidden shrink-0 self-start rotate-[2deg] rounded-md bg-white p-2 pb-4 shadow-[0_8px_18px_-8px_rgba(60,40,20,0.42)] transition-transform group-hover:rotate-0 sm:block">
                              <img src={e.images[0].src} alt="" loading="lazy" className="h-[76px] w-[76px] rounded-[2px] object-cover" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* ── 기록 탭: 상세(보기/편집) ── */}
          {tab === 'write' && detailOpen && (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button type="button" onClick={backToList} aria-label="목록으로" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] text-[hsl(var(--cream-muted))] transition-colors hover:text-[hsl(var(--cream-ink))]"><ChevronLeft className="h-4 w-4" /></button>
                  <div className="min-w-0">
                    <h1 className="flex items-baseline gap-2 truncate text-[27px] leading-tight tracking-tight" style={{ fontFamily: "'Jua', sans-serif" }}>
                      {sel.getFullYear()}년 {sel.getMonth() + 1}월 {sel.getDate()}일
                      <span className="text-[24px] text-[hsl(var(--cream-ink))]/55">{WEEKDAY[sel.getDay()]}요일</span>
                    </h1>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {selectedDate !== todayKey && (
                    <button type="button" onClick={() => { setSelectedDate(todayKey); setCalAnchor(new Date()); }} className="rounded-full border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] px-3.5 py-1.5 text-[12.5px] text-[hsl(var(--cream-ink))]/80 hover:border-[hsl(var(--cream-accent))]/40">오늘로</button>
                  )}
                  {editing && (
                    <button type="button" onClick={handleSave} disabled={!body.trim() && !title.trim() && !moodKey && !weather && !photo && tags.length === 0} className="rounded-full bg-[hsl(var(--cream-accent))] px-4 py-1.5 text-[12.5px] font-bold text-white hover:opacity-90 disabled:opacity-40">저장하기</button>
                  )}
                </div>
              </div>

              {!editing && current ? (
                /* 보기 모드 */
                <div className="relative rounded-[26px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-6 shadow-[0_4px_24px_-16px_hsl(25_30%_20%/0.18)]" style={color ? { backgroundColor: `color-mix(in srgb, ${color} 8%, #f8f3ea)` } : undefined}>
                  <div className="flex flex-wrap gap-2">
                    {moodKey && MOOD_BY_KEY[moodKey] && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--cream-accent))]/12 px-3 py-1 text-[12.5px] font-semibold"><span className="text-[15px] leading-none">{MOOD_BY_KEY[moodKey].emoji}</span>{MOOD_BY_KEY[moodKey].label}</span>
                    )}
                    {weather && <span className="rounded-full bg-[hsl(var(--cream-line))]/40 px-3 py-1 text-[12.5px]">{WEATHER_META[weather].emoji} {WEATHER_META[weather].label}</span>}
                    {color && <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--cream-line))]/40 px-3 py-1 text-[12.5px]"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />오늘의 컬러</span>}
                    {bgm && <span className="rounded-full bg-[hsl(var(--cream-line))]/40 px-3 py-1 text-[12.5px]">🎧 {bgm}</span>}
                  </div>
                  {title && <h2 className="mt-4 text-[22px] font-bold">{title}</h2>}
                  <div className="mt-3 flex flex-col gap-5 sm:flex-row">
                    <p className="min-w-0 flex-1 whitespace-pre-wrap text-[14px] leading-[1.9] text-[hsl(var(--cream-ink))]/90">{body || '(내용 없음)'}</p>
                    {photo && (
                      <div className="shrink-0 sm:w-[200px]">
                        <div className="rotate-[-1.6deg] rounded-md bg-white p-2.5 pb-7 shadow-[0_10px_24px_-10px_rgba(60,40,20,0.4)]">
                          <img src={photo} alt="오늘의 사진" className="aspect-[3/4] w-full rounded-[3px] object-cover" />
                        </div>
                      </div>
                    )}
                  </div>
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
                  {stickers.length > 0 && (
                    <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[4/3]">
                      {stickers.map((s) => (
                        <div key={s.id} className="absolute leading-none drop-shadow-sm" style={{ left: `${s.x}%`, top: `${s.y}%`, transform: `translate(-50%, -50%) rotate(${s.rot ?? 0}deg)`, fontSize: '34px' }}>{s.emoji}</div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* 에디터 */
                <div className="relative rounded-[26px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-7 shadow-[0_6px_28px_-18px_hsl(25_30%_20%/0.2)] transition-colors" style={color ? { backgroundColor: `color-mix(in srgb, ${color} 8%, #f8f3ea)` } : undefined} onClick={() => setActiveSticker(null)}>
                  <div className="grid grid-cols-1 gap-x-7 gap-y-4 sm:grid-cols-[1.35fr_1fr]">
                    {/* 오늘의 기분 */}
                    <div>
                      <div className="mb-2 text-[12px] text-[hsl(var(--cream-muted))]">
                        오늘의 기분
                        {moodKey && MOOD_BY_KEY[moodKey] && <span className="ml-1 font-semibold text-[hsl(var(--cream-ink))]">· {MOOD_BY_KEY[moodKey].label}</span>}
                      </div>
                      <div className="flex gap-2">
                        {MOODS.map((mo) => { const on = moodKey === mo.key; return (
                          <button
                            key={mo.key}
                            type="button"
                            title={mo.label}
                            aria-label={mo.label}
                            onClick={() => setMoodKey(on ? null : mo.key)}
                            className={cn('flex h-11 w-11 items-center justify-center rounded-full border text-[22px] leading-none transition-all', on ? 'scale-110 shadow-sm' : 'opacity-70 grayscale-[0.25] hover:scale-105 hover:opacity-100')}
                            style={on ? { backgroundColor: `color-mix(in srgb, ${mo.color} 22%, transparent)`, borderColor: `color-mix(in srgb, ${mo.color} 55%, transparent)` } : { borderColor: 'hsl(var(--cream-line))' }}
                          >
                            {mo.emoji}
                          </button>
                        ); })}
                      </div>
                    </div>
                    {/* 오늘의 컬러 */}
                    <div>
                      <div className="mb-2 text-[12px] text-[hsl(var(--cream-muted))]">오늘의 컬러</div>
                      <div className="flex flex-wrap items-center gap-2.5 py-1">
                        {COLORS.map((c) => { const on = color === c; return (
                          <button key={c} type="button" onClick={() => setColor(on ? null : c)} aria-label={`컬러 ${c}`} className={cn('h-7 w-7 rounded-full transition-transform', on ? 'scale-110 ring-2 ring-[hsl(var(--cream-ink))]/35 ring-offset-2 ring-offset-[hsl(var(--cream-card))]' : 'hover:scale-105')} style={{ backgroundColor: c }} />
                        ); })}
                      </div>
                    </div>
                    {/* 날씨 */}
                    <div>
                      <div className="mb-2 text-[12px] text-[hsl(var(--cream-muted))]">
                        날씨
                        {weather && <span className="ml-1 font-semibold text-[hsl(var(--cream-ink))]">· {WEATHER_META[weather].label}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {WEATHERS.map((w) => { const on = weather === w; return (
                          <button key={w} type="button" title={WEATHER_META[w].label} aria-label={WEATHER_META[w].label} onClick={() => setWeather(on ? null : w)} className={cn('flex h-9 w-9 items-center justify-center rounded-full border text-[17px] leading-none transition-all', on ? 'scale-110 border-[hsl(var(--cream-accent))]/50 bg-[hsl(var(--cream-accent))]/12 shadow-sm' : 'border-[hsl(var(--cream-line))] opacity-70 grayscale-[0.25] hover:scale-105 hover:opacity-100')}>
                            {WEATHER_META[w].emoji}
                          </button>
                        ); })}
                      </div>
                    </div>
                    {/* 오늘의 BGM */}
                    <div>
                      <div className="mb-2 text-[12px] text-[hsl(var(--cream-muted))]">오늘의 BGM</div>
                      <div className="flex items-center gap-2 rounded-full border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-bg))]/40 px-3.5 py-1.5">
                        <span aria-hidden className="text-[13px]">🎧</span>
                        <input value={bgm} onChange={(e) => setBgm(e.target.value)} placeholder="오늘 들은 곡·무드" className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-[hsl(var(--cream-muted))]/70" />
                      </div>
                    </div>
                  </div>
                  <hr className="my-5 border-[hsl(var(--cream-line))]" />
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력하세요" className="w-full bg-transparent text-[22px] font-bold outline-none placeholder:text-[hsl(var(--cream-muted))]/55" />
                  <div className="mt-3 flex flex-col gap-5 sm:flex-row">
                    {/* 본문 */}
                    <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={dailyQuestion} className="min-h-[288px] flex-1 resize-y rounded-xl px-3.5 text-[14px] text-[hsl(var(--cream-ink))]/90 outline-none transition-colors placeholder:text-[hsl(var(--cream-muted))]/55" style={{ backgroundColor: 'transparent', backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 31px, hsl(var(--cream-line)) 31px, hsl(var(--cream-line)) 32px)', lineHeight: '32px' }} />
                    {/* 오늘의 사진 — 폴라로이드 */}
                    <div className="shrink-0 sm:w-[208px]">
                      {photo ? (
                        <div className="relative rotate-[-1.6deg] rounded-md bg-white p-2.5 pb-7 shadow-[0_10px_24px_-10px_rgba(60,40,20,0.4)]">
                          <img src={photo} alt="오늘의 사진" className="aspect-[3/4] w-full rounded-[3px] object-cover" />
                          <button type="button" onClick={() => setPhoto(null)} className="absolute -right-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--cream-dark))] text-[13px] text-white shadow-md" aria-label="사진 삭제">×</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-bg))]/30 text-[hsl(var(--cream-muted))] transition-colors hover:border-[hsl(var(--cream-accent))]/45 hover:text-[hsl(var(--cream-ink))]">
                          <ImagePlus className="h-6 w-6" strokeWidth={1.7} />
                          <span className="text-[12px]">＋ 오늘의 사진</span>
                        </button>
                      )}
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickPhoto(e.target.files?.[0])} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <span className="shrink-0 text-[12px] text-[hsl(var(--cream-muted))]">태그</span>
                    {tags.map((t) => (
                      <span key={t} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[hsl(var(--cream-accent))]/12 px-3 py-1 text-[12px] font-semibold text-[hsl(var(--cream-ink))]">
                        #{t}
                        <button type="button" onClick={() => toggleTag(t)} className="text-[hsl(var(--cream-muted))] hover:text-[hsl(var(--cream-ink))]" aria-label={`${t} 제거`}>×</button>
                      </span>
                    ))}
                    <input
                      value={tagDraft}
                      onChange={(e) => setTagDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                      onBlur={addTag}
                      placeholder="+ 직접"
                      className="w-[64px] shrink-0 rounded-full border border-dashed border-[hsl(var(--cream-line))] bg-transparent px-3 py-1 text-[12px] outline-none placeholder:text-[hsl(var(--cream-muted))]/70 focus:w-[100px] focus:border-[hsl(var(--cream-accent))]/50"
                    />
                    {TAGS.filter((t) => !tags.includes(t)).map((t) => (
                      <button key={t} type="button" onClick={() => toggleTag(t)} className="shrink-0 rounded-full border border-[hsl(var(--cream-line))] px-2.5 py-1 text-[11px] text-[hsl(var(--cream-muted))] transition-colors hover:border-[hsl(var(--cream-accent))]/40 hover:text-[hsl(var(--cream-ink))]">#{t}</button>
                    ))}
                  </div>
                  {/* 스티커 트리거 — 구석 플로팅 버튼 */}
                  <button type="button" onPointerDown={openStickerPanel} className={cn('absolute bottom-4 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full text-[19px] shadow-lg transition-transform hover:scale-105', stickerOpen ? 'bg-[hsl(var(--cream-accent))] text-white' : 'bg-[hsl(var(--cream-dark))] text-white')} title="스티커" aria-label="스티커 붙이기">🎀</button>
                  {/* 스티커 레이어 (드래그) — 고정비율 캔버스(폭 기준)라 보기 모드와 위치 일치 */}
                  <div ref={layerRef} className="pointer-events-none absolute inset-x-0 top-0 z-20 aspect-[4/3]">
                    {stickers.map((s) => (
                      <div
                        key={s.id}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => stickerDown(e, s.id)}
                        onPointerMove={stickerMove}
                        onPointerUp={stickerUp}
                        className="pointer-events-auto absolute cursor-grab select-none leading-none drop-shadow-sm active:cursor-grabbing"
                        style={{ left: `${s.x}%`, top: `${s.y}%`, transform: `translate(-50%, -50%) rotate(${s.rot ?? 0}deg)`, fontSize: '34px', touchAction: 'none' }}
                      >
                        {s.emoji}
                        {activeSticker === s.id && (
                          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); removeSticker(s.id); }} className="pointer-events-auto absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--cream-dark))] text-[11px] text-white shadow" aria-label="스티커 제거">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* 플로팅 스티커 패널 — 헤더 드래그로 이동 */}
                  {stickerOpen && (
                    <div className="fixed z-40 w-[236px] overflow-hidden rounded-2xl border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] shadow-2xl" style={{ left: panelPos.x, top: panelPos.y }}>
                      <div onPointerDown={panelDown} onPointerMove={panelMove} onPointerUp={panelUp} className="flex cursor-grab items-center justify-between border-b border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-bg))]/60 px-3 py-2 active:cursor-grabbing" style={{ touchAction: 'none' }}>
                        <span className="select-none text-[11.5px] font-semibold text-[hsl(var(--cream-muted))]">🎀 스티커 · 드래그로 이동</span>
                        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => setStickerOpen(false)} className="text-[15px] text-[hsl(var(--cream-muted))] hover:text-[hsl(var(--cream-ink))]" aria-label="닫기">×</button>
                      </div>
                      <div className="grid grid-cols-6 gap-1 p-2.5">
                        {STICKERS.map((s) => (
                          <button key={s} type="button" onClick={() => addSticker(s)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[20px] leading-none transition-transform hover:scale-110 hover:bg-[hsl(var(--cream-line))]/30" title="붙이기">{s}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── 달력 탭 ── */}
          {tab === 'calendar' && (
            <div className="rounded-[26px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-6">
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
                  const meta = dayMeta.get(d);
                  const mood = meta?.moodKey ? MOOD_BY_KEY[meta.moodKey] : undefined;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => openDate(d)}
                      className={cn('relative flex aspect-square flex-col rounded-2xl border p-2 text-left transition-all hover:border-[hsl(var(--cream-accent))]/45', isToday ? 'border-[hsl(var(--cream-accent))] ring-1 ring-[hsl(var(--cream-accent))]/30' : 'border-[hsl(var(--cream-line))]')}
                      style={{ backgroundColor: meta?.color ? `color-mix(in srgb, ${meta.color} 22%, #f8f3ea)` : 'hsl(var(--cream-bg) / 0.4)' }}
                    >
                      <div className="flex items-start justify-between">
                        <span className={cn('text-[12px] tabular-nums', isToday ? 'font-bold text-[hsl(var(--cream-accent))]' : 'text-[hsl(var(--cream-ink))]/65')}>{i + 1}</span>
                        {meta?.weather && <span className="text-[12px] leading-none opacity-80">{WEATHER_META[meta.weather].emoji}</span>}
                      </div>
                      {mood && <span className="mx-auto mb-0.5 mt-auto text-[22px] leading-none">{mood.emoji}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-[hsl(var(--cream-line))] pt-4 text-[11px] text-[hsl(var(--cream-muted))]">
                {MOODS.map((mo) => <span key={mo.key} className="inline-flex items-center gap-1">{mo.emoji} {mo.label}</span>)}
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[4px] bg-[color-mix(in_srgb,#e0876b_35%,#f8f3ea)]" />칸 배경 = 오늘의 컬러</span>
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

  const card = 'rounded-[26px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-5';
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
