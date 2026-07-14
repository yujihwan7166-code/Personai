/**
 * 일기 — /journal (따뜻한 크림 다이어리, v2).
 *
 * 좌: 헤더(마스트헤드) + 미니캘린더 + 이번 달 기분 + 검색 + 최근 기록.
 * 우: 탭(기록·달력·통계).
 *   - 기록: 보기 모드(즐겨찾기/삭제/편집) ↔ 에디터(기분·날씨·제목·본문·태그).
 *   - 달력: 큰 월 그리드(무드 dot) + 범례.
 *   - 통계: 4 지표 + 감정 분포 + 최근 6개월 + 자주 쓴 태그.
 * 데이터는 기존 journalStore. 크림 팔레트는 래퍼 CSS 변수로 격리.
 */
import { Suspense, lazy, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Archive, BarChart3, CalendarDays, Check, ChevronLeft, ChevronRight, History, ImagePlus,
  Map as MapIcon, NotebookPen, Pencil, Plane, Star, Trash2, UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { useJournal } from '@/hooks/useJournal';
import { useJournalStreak } from '@/hooks/useJournalStreak';
import { journalStore } from '@/services/journalStore';
import { quickAi } from '@/lib/cloudDoc/ai';
import { WEATHER_META, type JournalEntry, type Weather, type DiarySticker } from '@/types/journal';
import { DayItemsBlock } from '@/components/daybook/DayItemsBlock';
import type { DayItem } from '@/types/daylog';
import FoodRoadView from '@/components/daybook/FoodRoadView';
import { useDaylogAll } from '@/hooks/useDaylog';
import { useTrips } from '@/hooks/useTravel';
import { diffDays } from '@/types/travel';

/** 지도가 있는 섹션 — leaflet 이 무거워 열 때만 로드. */
const TravelHome = lazy(() => import('@/components/travel/TravelHome'));
const MyMapView = lazy(() => import('@/components/daybook/MyMapView'));

const CREAM: CSSProperties = {
  // 워크스페이스 공통 쿨 화이트 캐논 (플래너·노트·커리어와 동일 공식):
  // 쿨 페이지 + 웜 근백색 카드 + 웜 차콜 잉크. 테라코타만 정체성 포인트로 유지.
  '--cream-bg': '220 22% 98%',       // 페이지 — 쿨 화이트
  '--cream-panel': '220 20% 97%',    // 사이드바 패널
  '--cream-card': '40 35% 99%',      // 카드 — 웜 근백색
  '--cream-ink': '30 12% 16%',       // 웜 차콜 잉크
  '--cream-muted': '30 8% 42%',
  '--cream-line': '35 14% 86%',      // 헤어라인
  '--cream-accent': '146 27% 39%',   // 세이지 그린 — 방의 유일한 포인트 색 (sanctuary 무드)
  '--cream-dark': '30 12% 20%',      // 진한 버튼용
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

type Tab = 'write' | 'calendar' | 'trips' | 'map' | 'food' | 'stats' | 'flashback' | 'storage';

/** 방 사이드바 내비 — 섹션이 곧 메뉴 (컨셉 v2 디자인 적용, 그룹 구성은 유지). */
const NAV_MAIN: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: 'write',    label: '데일리 로그', icon: NotebookPen },
  { id: 'calendar', label: '캘린더',      icon: CalendarDays },
  { id: 'trips',    label: '트래블 로그', icon: Plane },
  { id: 'map',      label: '나의 지도',   icon: MapIcon },
  { id: 'food',     label: '푸드 로드',   icon: UtensilsCrossed },
  { id: 'stats',    label: '통계',        icon: BarChart3 },
];
const NAV_BOTTOM: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: 'flashback', label: '플래시백', icon: History },
  { id: 'storage',   label: '보관함',   icon: Archive },
];

/** 내비 항목별 이모지 — 참고 사이드바의 컬러 아이콘 대신 이모티콘으로. */
const NAV_EMOJI: Record<Tab, string> = {
  write:     '📓',
  calendar:  '📅',
  trips:     '✈️',
  map:       '🗺️',
  food:      '🍜',
  stats:     '📊',
  flashback: '⏳',
  storage:   '📦',
};

/** 섹션 머리 — 영문 아이브로우 + 제목 (Diary Room 문법). */
const SECTION_HEAD: Record<Tab, { eyebrow: string; title: string }> = {
  write:     { eyebrow: 'DAILY ARCHIVE',      title: '데일리 로그' },
  calendar:  { eyebrow: 'MONTH AT A GLANCE',  title: '캘린더' },
  trips:     { eyebrow: 'WANDERLUST ARCHIVE', title: '트래블 로그' },
  map:       { eyebrow: 'FOOTPRINTS',         title: '나의 지도' },
  food:      { eyebrow: 'TASTE ARCHIVE',      title: '푸드 로드' },
  stats:     { eyebrow: 'PATTERNS',           title: '통계' },
  flashback: { eyebrow: 'MEMORY LANE',        title: '플래시백' },
  storage:   { eyebrow: 'KEEPSAKES',          title: '보관함' },
};

export default function Journal() {
  const allEntries = useJournal();
  const streak = useJournalStreak(allEntries);

  const [tab, setTab] = useState<Tab>('write');
  const [tripToOpen, setTripToOpen] = useState<string | null>(null);
  const location = useLocation();
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [calAnchor, setCalAnchor] = useState(() => new Date());
  const [editing, setEditing] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false); // 기록 탭: false=목록, true=상세(보기/편집)
  const [recentFilter, setRecentFilter] = useState<'all' | 'week' | 'photo'>('all'); // 최근 기록 필터

  // 메뉴·즐겨찾기에서 /journal?view=… 로 들어오면 해당 섹션으로 (구 ?tab=trips 도 수용, 재진입은 key 로 감지).
  // ?view 없이 /journal 로 재진입(레일·메뉴의 "데일리로그")하면 홈 섹션으로 리셋 — 무반응처럼 보이는 것 방지.
  // ⚠ effect 는 반드시 위 state 선언들 뒤에 — deps/콜백이 선언 전 변수를 참조하면 TDZ 크래시.
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const v = p.get('view') ?? (p.get('tab') === 'trips' ? 'travel' : null);
    const mapView: Record<string, Tab> = {
      daily: 'write', calendar: 'calendar', travel: 'trips', map: 'map', food: 'food', stats: 'stats',
    };
    const next = v ? mapView[v] : 'write';
    if (next) {
      setTab(next);
      setDetailOpen(false);
      setTripToOpen(null);
    }
  }, [location.key, location.search]);

  // 트래블 섹션을 떠나면 "이 여행 열어줘" 신호를 지운다 — 재진입 때마다 옛 여행이 강제로 열리는 것 방지
  useEffect(() => {
    if (tab !== 'trips' && tripToOpen) setTripToOpen(null);
  }, [tab, tripToOpen]);

  // 섹션·상세 전환 시 스크롤 최상단으로 — 공유 스크롤 컨테이너의 위치 잔존 방지
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [tab, detailOpen, selectedDate]);

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

  const generateSummary = async (id: string, text: string) => {
    try {
      const out = await quickAi(
        '너는 일기 한 편을 아주 짧게 요약하는 도우미야. 그 날의 핵심·분위기를 12자 내외 한 줄로 담백하게. 따옴표·마침표 없이, 명사형으로.',
        text.slice(0, 1500),
        { maxTokens: 40, temperature: 0.5 },
      );
      const s = out.trim().replace(/^["'`\s]+|["'`.\s]+$/g, '').split('\n')[0].slice(0, 24);
      if (s) journalStore.update(id, { summary: s });
    } catch { /* 요약 실패는 조용히 무시 */ }
  };
  const handleSave = () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    persist();
    setEditing(false);
    notify.success('저장됐어요', { duration: 1500 });
    const text = body.trim();
    if (text.length >= 15) {
      const id = journalStore.listByDate(selectedDate)[0]?.id;
      if (id) void generateSummary(id, text);
    }
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
  // 일기가 없는 날짜(하루 기록만 있는 날)는 에디터로 — editing=false 인 채 열면 자동저장이 안 도는 "죽은 에디터"가 된다
  const openEntry = (date: string) => { setSelectedDate(date); setEditing(!journalStore.listByDate(date)[0]); setDetailOpen(true); setTab('write'); };
  const openDate = (date: string) => { setSelectedDate(date); setEditing(!journalStore.listByDate(date)[0]); setDetailOpen(true); setTab('write'); };
  const backToList = () => { setDetailOpen(false); setEditing(false); setStickerOpen(false); };
  const toggleTag = (t: string) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  const addTag = () => { const t = tagDraft.trim().replace(/^#+/, '').trim(); if (t && !tags.includes(t)) setTags((p) => [...p, t]); setTagDraft(''); };

  // 파생
  const feed = useMemo(() => [...allEntries].sort((a, b) => b.date.localeCompare(a.date)), [allEntries]);
  const [memSeed, setMemSeed] = useState(0); // 플래시백 "다른 기록 보기" 리롤
  const memory = useMemo(() => {
    void memSeed;
    const past = allEntries.filter((e) => e.date !== todayKey && (e.body.trim() || e.title?.trim()));
    return past.length ? past[Math.floor(Math.random() * past.length)] : null;
  }, [allEntries, todayKey, memSeed]);
  /** 1년 전 오늘 (가장 최근 해). */
  const yearAgo = useMemo(() => {
    const md = todayKey.slice(5);
    return [...allEntries]
      .filter((e) => e.date.slice(5) === md && e.date < todayKey)
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  }, [allEntries, todayKey]);
  /** 하루 기록(먹은 것·간 곳) — 캘린더 마커·보관함 사진용. */
  const dayItems = useDaylogAll();
  /** 하루 기록이 있는 날짜 전체 (메모 포함) — 캘린더 마커용. */
  const itemDates = useMemo(() => new Set(dayItems.map((i) => i.date)), [dayItems]);
  /** 날짜별 대표 사진 — 피드·캘린더의 사진 우선 렌더용 (일기 사진 → 하루 기록 사진). */
  const photoByDate = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of allEntries) if (e.images?.[0] && !m.has(e.date)) m.set(e.date, e.images[0].src);
    for (const i of dayItems) if (i.photo && !m.has(i.date)) m.set(i.date, i.photo);
    return m;
  }, [allEntries, dayItems]);
  /** 열린 날짜가 여행 기간이면 컨텍스트 칩. */
  const trips = useTrips();
  const tripOfDay = useMemo(
    () => trips.find((t) => selectedDate >= t.startDate && selectedDate <= t.endDate) ?? null,
    [trips, selectedDate],
  );
  const dayMeta = useMemo(() => {
    const map = new Map<string, { moodKey: string | null; color?: string; weather?: Weather; label: string }>();
    for (const e of allEntries) {
      if (map.has(e.date)) continue;
      const label = e.summary?.trim() || e.title?.trim() || e.body.split('\n').map((l) => l.trim()).find(Boolean) || '';
      map.set(e.date, { moodKey: entryMoodKey(e), color: e.color, weather: e.weather, label });
    }
    return map;
  }, [allEntries]);

  const sel = new Date(`${selectedDate}T00:00:00`);
  const dayNum = Math.floor(sel.getTime() / 86_400_000);
  const dailyQuestion = QUESTIONS[((dayNum % QUESTIONS.length) + QUESTIONS.length) % QUESTIONS.length];
  const y = calAnchor.getFullYear();
  const m = calAnchor.getMonth();
  const lead = new Date(y, m, 1).getDay();
  const daysIn = new Date(y, m + 1, 0).getDate();
  const monthPrefix = `${y}-${String(m + 1).padStart(2, '0')}`;
  const monthCount = allEntries.filter((e) => e.date.startsWith(monthPrefix)).length;

  /** 내비 우측 실데이터 숫자 — "실데이터가 서술어" 문법의 내비 버전. 0이면 표시 안 함. */
  const navCountOf = (id: Tab): number => {
    if (id === 'write') return allEntries.length;
    if (id === 'trips') return trips.length;
    if (id === 'map') return new Set(dayItems.filter((i) => i.place).map((i) => i.place!.toLowerCase())).size;
    if (id === 'food') return dayItems.filter((i) => i.kind === 'meal').length;
    return 0;
  };

  /** 사이드바 내비 행 — 컬러 아이콘 + 라벨 + 플레인 카운트, 활성 = 은은한 세이지 필 (참고 사이드바). */
  const renderNavRow = (item: { id: Tab; label: string; icon: LucideIcon }) => {
    const active = tab === item.id;
    const count = navCountOf(item.id);
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => { setTab(item.id); setDetailOpen(false); }}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13.5px] transition-colors',
          active
            ? 'bg-[hsl(var(--cream-accent))]/15 font-bold text-[hsl(var(--cream-accent))]'
            : 'font-medium text-[hsl(var(--cream-ink))]/72 hover:bg-[hsl(var(--cream-accent))]/6',
        )}
      >
        <span aria-hidden className="w-[20px] shrink-0 text-center text-[16px] leading-none">{NAV_EMOJI[item.id]}</span>
        <span className="flex-1">{item.label}</span>
        {count > 0 && (
          <span className={cn('text-[12px] tabular-nums', active ? 'font-bold text-[hsl(var(--cream-accent))]/75' : 'text-[hsl(var(--cream-muted))]/55')}>{count}</span>
        )}
      </button>
    );
  };

  // ── 기록 뷰 인사말·히어로·최근 목록 파생 ──
  const nowH = new Date().getHours();
  const greeting = nowH < 5 ? '좋은 밤이에요' : nowH < 12 ? '좋은 아침이에요' : nowH < 18 ? '좋은 오후예요' : '좋은 저녁이에요';
  const nowD = new Date();
  const todayLabelFull = `${nowD.getFullYear()}년 ${nowD.getMonth() + 1}월 ${nowD.getDate()}일 ${WEEKDAY[nowD.getDay()]}요일`;
  const hasTodayEntry = allEntries.some((e) => e.date === todayKey);
  const weekAgoKey = dateKey(new Date(Date.now() - 6 * 86400000));
  const recentEntries = feed.filter((e) =>
    recentFilter === 'photo' ? (e.images?.length ?? 0) > 0 : recentFilter === 'week' ? e.date >= weekAgoKey : true,
  );
  /** 히어로 — 최근 7일 리듬 스트립: 날짜별 기분·기록 여부 (오늘 강조). */
  const weekStrip = useMemo(() => {
    const [ty, tm, td] = todayKey.split('-').map(Number);
    const byDate = new Map<string, JournalEntry>();
    for (const e of allEntries) if (!byDate.has(e.date)) byDate.set(e.date, e);
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(ty, tm - 1, td - (6 - idx));
      const key = dateKey(d);
      const e = byDate.get(key);
      return { key, day: d.getDate(), wd: WEEKDAY[d.getDay()], moodKey: e ? entryMoodKey(e) : null, isToday: key === todayKey, has: !!e };
    });
  }, [allEntries, todayKey]);

  return (
    <div
      style={{
        ...CREAM,
        fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, sans-serif",
      }}
      className="flex h-dvh bg-[hsl(var(--cream-bg))] text-[hsl(var(--cream-ink))]"
    >
      {/* ── 사이드바 — 참고 디자인 (마크+제목 락업 · 세이지 CTA · 컬러 아이콘 내비 · 은은한 활성). 모바일은 상단 가로 내비 ── */}
      <aside className="hidden w-[264px] shrink-0 flex-col overflow-y-auto border-r border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-panel))] sm:flex">
        {/* 헤더 — 마크 + 제목 + 부제 좌상단 락업 */}
        <div className="px-4 pb-3 pt-4">
          <div className="flex items-center gap-3">
            {/* 마크 — '새싹': 기록이 쌓여 자란다 (세이지 sanctuary 무드) */}
            <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0" role="img" aria-label="데일리 로그">
              <rect x="0.5" y="0.5" width="47" height="47" rx="14.5" fill="hsl(146 22% 93%)" stroke="hsl(146 20% 83%)" strokeWidth="1" />
              <path d="M24 35 C24 29 24 25 24 20" fill="none" stroke="hsl(146 28% 39%)" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M24 24 C20 24 16.5 21.5 16 17 C21 17 24 20 24 24 Z" fill="hsl(146 22% 54%)" />
              <path d="M24 21 C28 20.5 31.5 17.5 32 13 C27.2 13.4 24.3 16.5 24 21 Z" fill="hsl(146 28% 39%)" />
            </svg>
            <div className="min-w-0">
              <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.02em] text-[hsl(var(--cream-ink))]">데일리 로그</h1>
              <p className="text-[12.5px] leading-tight text-[hsl(var(--cream-muted))]">나의 하루를 담는 기록실</p>
            </div>
          </div>
        </div>

        {/* 쓰기 CTA — 세이지 채움 (상단) */}
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={goWriteToday}
            className="flex w-full items-center justify-center gap-1.5 rounded-[11px] py-2 text-[12.5px] font-bold text-white shadow-[0_6px_14px_-9px_hsl(146_26%_46%/0.5)] transition-[filter] hover:brightness-[1.04]"
            style={{ backgroundColor: 'hsl(146 24% 53%)' }}
          >
            <Pencil className="h-3.5 w-3.5" /> 오늘 기록 쓰기
          </button>
        </div>

        {/* 내비 — 컬러 아이콘 + 플레인 카운트, 활성 = 은은한 필 */}
        <nav className="flex-1 overflow-y-auto px-2.5 pb-2 pt-1.5" aria-label="데일리로그 섹션">
          {NAV_MAIN.map((item) => renderNavRow(item))}
        </nav>

        {/* 푸터 — 플래시백 · 보관함 (동일 컬러 아이콘 + 은은한 활성) */}
        <nav className="border-t border-[hsl(var(--cream-line))] px-2.5 py-2" aria-label="데일리로그 유틸">
          {NAV_BOTTOM.map((item) => renderNavRow(item))}
        </nav>

      </aside>

      {/* ── 메인 ── */}
      <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto">
        {/* 화면을 넓게 — 전 섹션 공통 1280 (마소너리·2단 작성·지도 전부 이 폭 기준) */}
        <div className="mx-auto w-full max-w-[1280px] px-4 pb-7 pt-6 sm:px-8 sm:pt-10">
          {/* 모바일 — 사이드바 대신 가로 스크롤 내비 */}
          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 sm:hidden">
            <button
              type="button"
              onClick={goWriteToday}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-[hsl(var(--cream-dark))] px-3.5 py-1.5 text-[12px] font-bold text-white"
            >
              <Pencil className="h-3 w-3" /> 글쓰기
            </button>
            {[...NAV_MAIN, ...NAV_BOTTOM].map((item) => {
              const active = tab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setTab(item.id); setDetailOpen(false); }}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-colors',
                    active
                      ? 'border-transparent bg-[hsl(var(--cream-accent))]/14 font-bold text-[hsl(var(--cream-accent))]'
                      : 'border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] text-[hsl(var(--cream-muted))]',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {item.label}
                </button>
              );
            })}
          </div>
          {/* 섹션 머리 — 기록 탭은 인사말+스탯, 나머지는 아이브로우+제목 (상세에선 숨김) */}
          {!(tab === 'write' && detailOpen) && (
            tab === 'write' ? (
              <div className="mb-6">
                <p className="text-[11px] font-bold tracking-[0.14em] text-[hsl(var(--cream-accent))]">{todayLabelFull}</p>
                <h2 className="mt-1.5 text-[26px] font-extrabold leading-tight tracking-[-0.01em] text-[hsl(var(--cream-ink))]">{greeting}</h2>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-[10.5px] font-bold tracking-[0.22em] text-[hsl(var(--cream-muted))]/70">{SECTION_HEAD[tab].eyebrow}</p>
                <h2 className="mt-1.5 text-[27px] font-bold leading-none tracking-[-0.01em]">{SECTION_HEAD[tab].title}</h2>
              </div>
            )
          )}

          {/* ── 기록 탭: 히어로 + 최근 기록 리스트 ── */}
          {tab === 'write' && !detailOpen && (
            <div className="flex flex-col gap-6">
              {/* 초록 히어로 — 오늘 기분 빠른 입력 (제목 좌 · 무드 우, 폭 채운 슬림 바) */}
              <div
                className="relative overflow-hidden rounded-[24px] px-6 py-5 text-white shadow-[0_16px_36px_-20px_hsl(146_40%_25%/0.55)]"
                style={{ background: 'linear-gradient(135deg, hsl(146 30% 46%), hsl(146 26% 37%))' }}
              >
                <span aria-hidden className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/[0.07]" />
                <span aria-hidden className="absolute -bottom-16 right-16 h-40 w-40 rounded-full bg-white/[0.05]" />
                <div className="relative flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[12px] font-semibold text-white/80">
                      {hasTodayEntry ? <><Check className="h-3.5 w-3.5" /> 오늘 기록 완료 · {streak}일째</> : '오늘은 아직 비어 있어요'}
                    </p>
                    <p className="mt-1.5 text-[21px] font-extrabold leading-snug">{hasTodayEntry ? '이번 주도 잘 이어가고 있어요' : '오늘 하루는 어땠나요?'}</p>
                  </div>
                  {/* 최근 7일 리듬 — 날짜 클릭 시 그 날로 이동, 오늘은 흰 칸으로 강조 */}
                  <div className="flex gap-1.5 sm:gap-2">
                    {weekStrip.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => openDate(c.key)}
                        aria-label={`${c.day}일${c.has ? ' · 기록 있음' : ''}`}
                        className="text-center"
                      >
                        <div className={cn('mb-1 text-[10.5px]', c.isToday ? 'font-bold text-white' : 'text-white/60')}>{c.isToday ? '오늘' : c.wd}</div>
                        <div className={cn(
                          'flex h-[52px] w-10 flex-col items-center justify-center gap-1 rounded-[13px] transition-colors',
                          c.isToday
                            ? 'bg-white text-[hsl(146_28%_34%)] shadow-[0_4px_12px_-4px_rgba(0,0,0,0.35)]'
                            : c.has ? 'bg-white/[0.13] hover:bg-white/20' : 'bg-white/[0.06] hover:bg-white/15',
                        )}>
                          {c.moodKey && MOOD_BY_KEY[c.moodKey] ? (
                            <span className="text-[19px] leading-none">{MOOD_BY_KEY[c.moodKey].emoji}</span>
                          ) : (
                            <span className={cn('h-1.5 w-1.5 rounded-full', c.isToday ? 'bg-[hsl(146_28%_42%)]' : c.has ? 'bg-white/75' : 'bg-white/25')} />
                          )}
                          <span className={cn('text-[10px] tabular-nums', c.isToday ? 'font-bold' : c.has ? 'text-white/75' : 'text-white/45')}>{c.day}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 최근 기록 + 필터 */}
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-[16px] font-extrabold text-[hsl(var(--cream-ink))]">최근 기록</h3>
                  <div className="flex gap-0.5 rounded-full bg-[hsl(var(--cream-line))]/35 p-0.5">
                    {([['all', '전체'], ['week', '이번 주'], ['photo', '사진']] as const).map(([k, l]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setRecentFilter(k)}
                        className={cn(
                          'rounded-full px-3 py-1 text-[12px] font-semibold transition-colors',
                          recentFilter === k ? 'bg-[hsl(var(--cream-card))] text-[hsl(var(--cream-ink))] shadow-sm' : 'text-[hsl(var(--cream-muted))] hover:text-[hsl(var(--cream-ink))]',
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {recentEntries.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))]/50 py-14 text-center">
                    <p className="text-[13px] text-[hsl(var(--cream-muted))]">{feed.length === 0 ? '아직 기록이 없어요. 위에서 오늘 하루를 남겨보세요.' : '이 조건에 맞는 기록이 없어요.'}</p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {recentEntries.map((e) => {
                      const dd = new Date(`${e.date}T00:00:00`);
                      const mk = entryMoodKey(e);
                      const t = e.title?.trim() || e.body.split('\n')[0]?.trim() || '무제';
                      const ex = (e.title ? e.body : e.body.split('\n').slice(1).join(' ')).trim();
                      const photos = e.images?.slice(0, 3) ?? [];
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => openDate(e.date)}
                          className="group flex w-full items-start gap-4 rounded-[20px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[hsl(var(--cream-accent))]/30 hover:shadow-[0_14px_30px_-18px_hsl(25_30%_20%/0.3)]"
                        >
                          <div className="w-10 shrink-0 text-center">
                            <div className="text-[19px] font-extrabold leading-none tabular-nums text-[hsl(var(--cream-ink))]">{dd.getDate()}</div>
                            <div className="mt-1 text-[10.5px] text-[hsl(var(--cream-muted))]">{dd.getMonth() + 1}월</div>
                            <div className="text-[10px] text-[hsl(var(--cream-muted))]/70">{WEEKDAY[dd.getDay()]}</div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {mk && MOOD_BY_KEY[mk] && <span className="shrink-0 text-[16px]">{MOOD_BY_KEY[mk].emoji}</span>}
                              {e.weather && <span className="shrink-0 text-[14px]">{WEATHER_META[e.weather].emoji}</span>}
                              <h4 className="min-w-0 flex-1 truncate text-[14.5px] font-bold text-[hsl(var(--cream-ink))]">{t}</h4>
                              {e.starred && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                            </div>
                            {ex && <p className="mt-1 line-clamp-2 break-keep text-[12.5px] leading-[1.6] text-[hsl(var(--cream-ink))]/70">{ex}</p>}
                            {(e.tags?.length ?? 0) > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {e.tags!.slice(0, 4).map((tg) => (
                                  <span key={tg} className="rounded-full bg-[hsl(var(--cream-accent))]/10 px-2 py-0.5 text-[10.5px] font-semibold text-[hsl(var(--cream-accent))]">#{tg}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          {photos.length > 0 && (
                            <div className="flex shrink-0 gap-1.5">
                              {photos.map((img, i) => (
                                <img key={i} src={img.src} alt="" loading="lazy" className="h-11 w-11 rounded-xl object-cover" />
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── 기록 탭: 상세(보기/편집) ── */}
          {tab === 'write' && detailOpen && (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button type="button" onClick={backToList} aria-label="목록으로" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] text-[hsl(var(--cream-muted))] transition-colors hover:text-[hsl(var(--cream-ink))]"><ChevronLeft className="h-4 w-4" /></button>
                  <div className="min-w-0">
                    <h1 className="flex items-baseline gap-2 truncate font-sans text-[27px] font-bold leading-tight tracking-tight">
                      {sel.getFullYear()}년 {sel.getMonth() + 1}월 {sel.getDate()}일
                      <span className="text-[24px] text-[hsl(var(--cream-ink))]/55">{WEEKDAY[sel.getDay()]}요일</span>
                    </h1>
                    {/* 이 날이 여행 기간이면 — 트래블 로그로 건너가는 컨텍스트 칩 */}
                    {tripOfDay && (
                      <button
                        type="button"
                        onClick={() => { setTripToOpen(tripOfDay.id); setTab('trips'); setDetailOpen(false); }}
                        className="mt-1 inline-flex items-center gap-1 rounded-full bg-[hsl(var(--cream-accent))]/12 px-2.5 py-1 text-[11.5px] font-bold text-[hsl(var(--cream-accent))] transition-colors hover:bg-[hsl(var(--cream-accent))]/20"
                      >
                        ✈️ {tripOfDay.title} · DAY {diffDays(tripOfDay.startDate, selectedDate) + 1}
                      </button>
                    )}
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

              {/* 2단 — 좌: 일기(넓게) / 우: 하루 기록 레일 (같은 화면, 위아래로 안 밀림) */}
              <div className="items-start gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="min-w-0">
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

              </div>

              {/* 하루 기록 레일 — 먹은 것·간 곳·메모 (보기/편집 모두, 우측 고정) */}
              <div className="mt-4 lg:sticky lg:top-4 lg:mt-0">
                <DayItemsBlock date={selectedDate} />
              </div>
              </div>
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
                  const photo = photoByDate.get(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => openDate(d)}
                      className={cn(
                        'group relative flex aspect-square flex-col overflow-hidden rounded-2xl border p-2 text-left transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--cream-accent))]/45 hover:shadow-[0_10px_22px_-14px_hsl(25_30%_20%/0.4)]',
                        isToday ? 'border-[hsl(var(--cream-accent))] ring-1 ring-[hsl(var(--cream-accent))]/30' : 'border-[hsl(var(--cream-line))]',
                      )}
                      style={photo ? undefined : { backgroundColor: meta?.color ? `color-mix(in srgb, ${meta.color} 22%, #f8f3ea)` : 'hsl(var(--cream-bg) / 0.4)' }}
                    >
                      {/* 그날의 사진이 셀 배경 — 한 달이 앨범이 된다 */}
                      {photo && (
                        <>
                          <img src={photo} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                          <div className="absolute inset-0 bg-gradient-to-b from-black/38 via-transparent to-black/25" />
                        </>
                      )}
                      <div className="relative z-[1] flex items-start justify-between gap-1">
                        <span className="flex items-center gap-1">
                          <span className={cn(
                            'text-[12px] font-semibold tabular-nums',
                            photo ? 'text-white drop-shadow' : isToday ? 'font-bold text-[hsl(var(--cream-accent))]' : 'text-[hsl(var(--cream-ink))]/65',
                          )}>{i + 1}</span>
                          {mood && <span className="text-[14px] leading-none drop-shadow">{mood.emoji}</span>}
                        </span>
                        {meta?.weather && <span className="text-[12px] leading-none opacity-90 drop-shadow">{WEATHER_META[meta.weather].emoji}</span>}
                      </div>
                      {!photo && meta?.label && <p className="mt-1 line-clamp-3 text-left text-[9.5px] leading-[1.35] text-[hsl(var(--cream-ink))]/60">{meta.label}</p>}
                      {photo && meta?.label && (
                        <p className="relative z-[1] mt-auto line-clamp-2 text-left text-[9.5px] font-medium leading-[1.35] text-white/90 drop-shadow">{meta.label}</p>
                      )}
                      {/* 하루 기록(먹은 것·간 곳·메모)이 있는 날 — 세이지 점 */}
                      {itemDates.has(d) && (
                        <span className={cn('absolute bottom-1.5 right-1.5 z-[1] h-1.5 w-1.5 rounded-full', photo ? 'bg-white/90' : 'bg-[hsl(var(--cream-accent))]/70')} aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-[hsl(var(--cream-line))] pt-4 text-[11px] text-[hsl(var(--cream-muted))]">
                {MOODS.map((mo) => <span key={mo.key} className="inline-flex items-center gap-1">{mo.emoji} {mo.label}</span>)}
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[4px] bg-[color-mix(in_srgb,#e0876b_35%,#f8f3ea)]" />칸 배경 = 오늘의 컬러</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--cream-accent))]/70" />하루 기록 있음</span>
              </div>
            </div>
          )}

          {/* ── 트래블 로그 — 여행 관리·버킷 (travel-theme 토큰, 방이 라이트 고정이라 다크 무력화) ── */}
          {tab === 'trips' && (
            <div className="travel-theme journal-embed">
              <Suspense fallback={<p className="py-16 text-center text-[12.5px] text-[hsl(var(--cream-muted))]/70">여행 도구를 여는 중…</p>}>
                <TravelHome key={tripToOpen ?? 'home'} initialTripId={tripToOpen ?? undefined} />
              </Suspense>
            </div>
          )}

          {/* ── 나의 지도 — 먹은 곳·간 곳 발자취 ── */}
          {tab === 'map' && (
            <div className="travel-theme journal-embed">
              <Suspense fallback={<p className="py-16 text-center text-[12.5px] text-[hsl(var(--cream-muted))]/70">지도를 여는 중…</p>}>
                <MyMapView />
              </Suspense>
            </div>
          )}

          {/* ── 푸드 로드 — 먹은 것 렌즈 ── */}
          {tab === 'food' && <FoodRoadView onOpenDay={openDate} />}

          {/* ── 플래시백 — 1년 전 오늘 · 무작위 다시 보기 ── */}
          {tab === 'flashback' && (
            <div className="space-y-6 pb-8">
              <section>
                <h3 className="mb-2.5 px-1 text-[14px] font-bold text-[hsl(var(--cream-ink))]/85">🕰️ 1년 전 오늘</h3>
                {yearAgo ? (
                  <FlashCard entry={yearAgo} onOpen={openEntry} />
                ) : (
                  <p className="rounded-[22px] border border-dashed border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))]/50 py-8 text-center text-[12.5px] text-[hsl(var(--cream-muted))]/70">
                    작년 오늘의 기록이 없어요. 내년의 나를 위해 오늘을 남겨두면 어때요?
                  </p>
                )}
              </section>
              <section>
                <div className="mb-2.5 flex items-center justify-between px-1">
                  <h3 className="text-[14px] font-bold text-[hsl(var(--cream-ink))]/85">🎲 무작위 다시 보기</h3>
                  <button type="button" onClick={() => setMemSeed((s) => s + 1)} className="rounded-full border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] px-3 py-1 text-[11.5px] text-[hsl(var(--cream-muted))] transition-colors hover:text-[hsl(var(--cream-ink))]">
                    다른 기록 보기
                  </button>
                </div>
                {memory ? (
                  <FlashCard entry={memory} onOpen={openEntry} />
                ) : (
                  <p className="rounded-[22px] border border-dashed border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))]/50 py-8 text-center text-[12.5px] text-[hsl(var(--cream-muted))]/70">
                    아직 다시 볼 기록이 없어요.
                  </p>
                )}
              </section>
            </div>
          )}

          {/* ── 보관함 — 별표한 날 · 사진 전부 ── */}
          {tab === 'storage' && (
            <div className="space-y-7 pb-8">
              <section>
                <h3 className="mb-2.5 px-1 text-[14px] font-bold text-[hsl(var(--cream-ink))]/85">
                  ⭐ 별표한 날 <span className="tabular-nums font-medium text-[hsl(var(--cream-muted))]/70">{allEntries.filter((e) => e.starred).length}</span>
                </h3>
                {allEntries.some((e) => e.starred) ? (
                  <div className="space-y-2">
                    {allEntries.filter((e) => e.starred).sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
                      <FlashCard key={e.id} entry={e} onOpen={openEntry} />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-[22px] border border-dashed border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))]/50 py-8 text-center text-[12.5px] text-[hsl(var(--cream-muted))]/70">
                    소중한 날에 별표를 눌러두면 여기 모여요.
                  </p>
                )}
              </section>
              <section>
                {(() => {
                  const photoCards = [
                    ...allEntries.filter((e) => e.images?.[0]).map((e) => ({ key: `j-${e.id}`, src: e.images![0].src, date: e.date, label: e.title?.trim() || '일기 사진' })),
                    ...dayItems.filter((i) => i.photo).map((i) => ({ key: `d-${i.id}`, src: i.photo!, date: i.date, label: i.text })),
                  ].sort((a, b) => b.date.localeCompare(a.date));
                  return (
                    <>
                      <h3 className="mb-2.5 px-1 text-[14px] font-bold text-[hsl(var(--cream-ink))]/85">
                        📷 모든 사진 <span className="tabular-nums font-medium text-[hsl(var(--cream-muted))]/70">{photoCards.length}</span>
                      </h3>
                      {photoCards.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                          {photoCards.map((p) => (
                            <button key={p.key} type="button" onClick={() => openEntry(p.date)} title={`${p.date} · ${p.label}`} className="group relative aspect-square overflow-hidden rounded-xl border border-[hsl(var(--cream-line))]">
                              <img src={p.src} alt={p.label} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/55 to-transparent px-2 pb-1 pt-4 text-left text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">{p.date}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-[22px] border border-dashed border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))]/50 py-8 text-center text-[12.5px] text-[hsl(var(--cream-muted))]/70">
                          일기와 하루 기록에 붙인 사진이 전부 여기 모여요.
                        </p>
                      )}
                    </>
                  );
                })()}
              </section>
            </div>
          )}

          {/* ── 통계 탭 ── */}
          {tab === 'stats' && <StatsView entries={allEntries} streak={streak} monthCount={monthCount} items={dayItems} />}
        </div>
      </main>
    </div>
  );
}

/* ── 통계 뷰 ── */
/** 플래시백·보관함 공용 — 과거 일기 콤팩트 카드. */
function FlashCard({ entry, onOpen }: { entry: JournalEntry; onOpen: (date: string) => void }) {
  const d = new Date(`${entry.date}T00:00:00`);
  const mk = entryMoodKey(entry);
  const title = entry.title?.trim() || entry.body.split('\n')[0]?.trim() || '무제';
  const snippet = (entry.title ? entry.body : entry.body.split('\n').slice(1).join(' ')).trim();
  return (
    <button
      type="button"
      onClick={() => onOpen(entry.date)}
      className="flex w-full items-start gap-4 rounded-[22px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] px-5 py-4 text-left transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--cream-accent))]/30"
      style={entry.color ? { backgroundColor: `color-mix(in srgb, ${entry.color} 6%, #f8f3ea)` } : undefined}
    >
      <div className="flex w-[60px] shrink-0 flex-col items-center pt-0.5">
        <span className="text-[10px] font-semibold text-[hsl(var(--cream-muted))]">{d.getFullYear()}</span>
        <span className="text-[22px] font-bold leading-tight tabular-nums">{d.getMonth() + 1}.{d.getDate()}</span>
        <span className="text-[10.5px] text-[hsl(var(--cream-muted))]/80">{WEEKDAY[d.getDay()]}요일</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {mk && MOOD_BY_KEY[mk] && <span className="text-[16px] leading-none">{MOOD_BY_KEY[mk].emoji}</span>}
          <span className="min-w-0 truncate text-[14.5px] font-bold">{title}</span>
          {entry.starred && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
        </div>
        {snippet && <p className="mt-1 line-clamp-2 text-[12.5px] leading-[1.7] text-[hsl(var(--cream-ink))]/70">{snippet}</p>}
      </div>
      {entry.images?.[0] && (
        <img src={entry.images[0].src} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-lg border border-[hsl(var(--cream-line))] object-cover" />
      )}
    </button>
  );
}

function StatsView({ entries, streak, monthCount, items }: { entries: JournalEntry[]; streak: number; monthCount: number; items: DayItem[] }) {
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

  // 하루 기록 지표
  const monthPrefix2 = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const mealCount = items.filter((i) => i.kind === 'meal').length;
  const placeCount = new Set(items.filter((i) => i.place).map((i) => i.place!.toLowerCase())).size;
  const photoCount = entries.filter((e) => e.images?.[0]).length + items.filter((i) => i.photo).length;
  const monthMeals = items.filter((i) => i.kind === 'meal' && i.date.startsWith(monthPrefix2)).length;
  const maxTag = Math.max(1, ...topTags.map(([, c]) => c));

  const card = 'rounded-[26px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-5';
  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* 히어로 — 연속 기록이 주인공 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="col-span-2 flex items-center gap-5 rounded-[26px] border border-[hsl(var(--cream-accent))]/25 bg-[hsl(var(--cream-accent))]/[0.07] p-6">
          <span className="text-[40px] leading-none">🔥</span>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[46px] font-extrabold leading-none tabular-nums text-[hsl(var(--cream-accent))]">{streak}</span>
              <span className="text-[15px] font-bold text-[hsl(var(--cream-ink))]/75">일째 기록 중</span>
            </div>
            <p className="mt-1.5 text-[12px] text-[hsl(var(--cream-muted))]">
              {streak === 0 ? '오늘부터 다시 시작해 볼까요?' : '꾸준함이 하루하루를 자산으로 만들어요.'}
            </p>
          </div>
        </div>
        {([['전체 일기', String(entries.length), '편'], ['이번 달', String(monthCount), '편']] as const).map(([label, val, unit]) => (
          <div key={label} className={card}>
            <div className="text-[32px] font-extrabold leading-none tabular-nums text-[hsl(var(--cream-ink))]">{val}<span className="ml-0.5 text-[14px] font-semibold text-[hsl(var(--cream-muted))]">{unit}</span></div>
            <div className="mt-2 text-[12px] font-medium text-[hsl(var(--cream-muted))]">{label}</div>
          </div>
        ))}
      </div>

      {/* 하루 기록 지표 스트립 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {([
          ['🍚', '기록한 끼니', mealCount, `이번 달 ${monthMeals}끼`],
          ['📍', '가본 곳', placeCount, '장소 기준'],
          ['📷', '사진', photoCount, '일기 + 하루 기록'],
          [topMood && MOOD_BY_KEY[topMood] ? MOOD_BY_KEY[topMood].emoji : '🙂', '최다 감정', topMood && MOOD_BY_KEY[topMood] ? MOOD_BY_KEY[topMood].label : '—', `${total}회 중`],
        ] as const).map(([emoji, label, val, sub]) => (
          <div key={label} className={cn(card, 'flex items-center gap-3.5')}>
            <span className="text-[26px] leading-none">{emoji}</span>
            <div className="min-w-0">
              <div className="truncate text-[20px] font-extrabold leading-tight tabular-nums">{val}</div>
              <div className="text-[11px] text-[hsl(var(--cream-muted))]">{label} · {sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 감정 분포 — 이모지 + 두꺼운 바 */}
        <div className={card}>
          <div className="mb-4 text-[14px] font-bold">감정 분포</div>
          <div className="flex flex-col gap-3">
            {MOODS.map((mo) => {
              const c = dist.get(mo.key) ?? 0;
              const pct = Math.round((c / total) * 100);
              return (
                <div key={mo.key} className="flex items-center gap-3">
                  <span className="w-6 shrink-0 text-center text-[17px] leading-none">{mo.emoji}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded-full bg-[hsl(var(--cream-line))]/45">
                    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, backgroundColor: mo.color }} />
                  </div>
                  <span className="w-[74px] shrink-0 text-right text-[11px] tabular-nums text-[hsl(var(--cream-muted))]">{mo.label} {c}회</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 최근 6개월 — 큰 바 차트 */}
        <div className={card}>
          <div className="mb-4 text-[14px] font-bold">최근 6개월 기록</div>
          <div className="flex h-[172px] items-end justify-between gap-3">
            {months.map((mo, i) => (
              <div key={mo.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[11px] font-bold tabular-nums text-[hsl(var(--cream-ink))]/70">{mo.count > 0 ? mo.count : ''}</span>
                <div
                  className={cn('w-full max-w-[52px] rounded-t-xl transition-all', i === months.length - 1 ? 'bg-[hsl(var(--cream-accent))]' : 'bg-[hsl(var(--cream-accent))]/45')}
                  style={{ height: `${Math.max(4, (mo.count / maxM) * 120)}px` }}
                />
                <span className={cn('text-[11px]', i === months.length - 1 ? 'font-bold text-[hsl(var(--cream-accent))]' : 'text-[hsl(var(--cream-muted))]')}>{mo.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 자주 쓴 태그 — 많이 쓸수록 크게 */}
      {topTags.length > 0 && (
        <div className={card}>
          <div className="mb-3.5 text-[14px] font-bold">자주 쓴 태그</div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            {topTags.map(([t, c]) => (
              <span
                key={t}
                className="text-[hsl(var(--cream-ink))]/80"
                style={{ fontSize: `${12 + Math.min(10, ((c / maxTag) * 10))}px`, fontWeight: c === maxTag ? 700 : 500 }}
              >
                #{t} <b className="text-[0.8em] font-bold text-[hsl(var(--cream-accent))]">{c}</b>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
