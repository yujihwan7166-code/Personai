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
import { Suspense, lazy, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BarChart3, CalendarDays, ChevronLeft, ChevronRight, History, ImagePlus,
  Map as MapIcon, NotebookPen, Pencil, Plane, Search, Star, Trash2, UtensilsCrossed, X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokenMatchAll } from '@/lib/textSearch';
import { notify } from '@/lib/notify';
import { replaceJournalWithSample } from '@/lib/journal/sampleData';
import { useJournal } from '@/hooks/useJournal';
import { useJournalStreak } from '@/hooks/useJournalStreak';
import { journalStore } from '@/services/journalStore';
import { quickAi } from '@/lib/cloudDoc/ai';
import { WEATHER_META, WEATHER_PICK, type JournalEntry, type Weather } from '@/types/journal';
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
  '--cream-accent': '258 52% 58%',   // 퍼플 — 방의 유일한 포인트 색 (보라 컨셉)
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

/* 고르는 자리엔 6종만 (WEATHER_PICK). 열 개를 늘어놓으면 구름/흐림/안개처럼
   스스로도 구분 안 되는 칸에서 손이 멈춘다. 옛 기록이 든 나머지 4종은
   표시(WEATHER_META·하늘 배경)에서는 그대로 살아 있다. */
const WEATHERS: Weather[] = WEATHER_PICK;
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

/**
 * 날씨별 하늘 — 편지지 뒤(프레임)를 그 날씨의 하늘로 물들인다.
 *
 * 전에는 위쪽이 너무 진해서(맑음 #ffe6a6, 밤 #343a5e) 하늘이 아니라 색판처럼 보였다.
 * 이제 세 정거장 대신 네 정거장으로 천천히 풀고, 맨 위 채도를 낮춰
 * '위는 하늘빛, 아래는 종이색'으로 자연스럽게 이어지게 한다.
 */
const WEATHER_SKY: Record<Weather, string> = {
  sunny:    'linear-gradient(180deg, #fdeec6 0%, #fdf3dd 34%, #fbf6ea 68%, #fcfbfe 100%)',
  cloudy:   'linear-gradient(180deg, #dfe6ee 0%, #e9eef4 34%, #f1f4f8 68%, #fcfbfe 100%)',
  overcast: 'linear-gradient(180deg, #ccd3db 0%, #dde2e8 34%, #eaedf1 68%, #fcfbfe 100%)',
  rainy:    'linear-gradient(180deg, #bcc9d6 0%, #d2dbe4 34%, #e5ebf0 68%, #fcfbfe 100%)',
  stormy:   'linear-gradient(180deg, #9aa5b3 0%, #bcc4ce 34%, #dde1e7 68%, #fcfbfe 100%)',
  snowy:    'linear-gradient(180deg, #e3edf7 0%, #eef4fa 34%, #f5f9fd 68%, #fcfbfe 100%)',
  windy:    'linear-gradient(180deg, #dbe8e1 0%, #e8f0ea 34%, #f1f6f2 68%, #fcfbfe 100%)',
  foggy:    'linear-gradient(180deg, #d9dbdd 0%, #e6e8e9 34%, #eff0f1 68%, #fcfbfe 100%)',
  rainbow:  'linear-gradient(180deg, #fbe2e6 0%, #fbeed6 34%, #e2f0e6 68%, #fcfbfe 100%)',
  night:    'linear-gradient(180deg, #59608a 0%, #767ca4 34%, #a9adc6 68%, #fcfbfe 100%)',
};

/** 사이드바용 — 하늘의 맨 윗색만 아주 옅게 깔아 본문과 같은 날씨 아래 있게 한다. */
const WEATHER_SIDE: Record<Weather, string> = {
  sunny:    '#fdf7e9', cloudy:   '#eef2f7', overcast: '#e8ecf0',
  rainy:    '#e4eaf0', stormy:   '#dee2e8', snowy:    '#eff5fb',
  windy:    '#eaf1ec', foggy:    '#ecedee', rainbow:  '#f7eef0',
  night:    '#e6e7ef',
};

/** 날씨 앰비언스 — 편지지 위로 눈/비가 내리고, 흐림·안개는 구름이 흐른다(pointer-events 없음). */
function WeatherFx({ weather }: { weather: Weather | null }) {
  const parts = useMemo(() => {
    if (weather === 'snowy') return Array.from({ length: 34 }, (_, i) => ({ left: (i * 37) % 100, delay: (i % 10) * 0.55, dur: 6 + ((i * 7) % 5), size: 8 + ((i * 3) % 7) }));
    if (weather === 'rainy' || weather === 'stormy') return Array.from({ length: 64 }, (_, i) => ({ left: (i * 17) % 100, delay: (i % 9) * 0.14, dur: 0.65 + ((i * 3) % 4) * 0.1, size: 20 + ((i * 5) % 18) }));
    return [];
  }, [weather]);
  const clouds = useMemo(() => {
    if (weather === 'cloudy' || weather === 'overcast' || weather === 'foggy')
      return Array.from({ length: 4 }, (_, i) => ({ top: 6 + i * 16, delay: i * 3, dur: 26 + i * 6, size: 120 + (i % 2) * 60, op: weather === 'foggy' ? 0.5 : 0.32 }));
    return [];
  }, [weather]);
  if (!weather) return null;
  const isSnow = weather === 'snowy';
  return (
    <div className="jrn-fx pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]" aria-hidden>
      {clouds.map((c, i) => (
        <span key={`c${i}`} className="absolute rounded-full bg-white blur-2xl" style={{ top: `${c.top}%`, left: '-30%', width: `${c.size}px`, height: `${c.size * 0.5}px`, opacity: c.op, animation: `jrn-drift ${c.dur}s linear ${c.delay}s infinite` }} />
      ))}
      {parts.map((p, i) => (
        isSnow ? (
          <span key={i} className="absolute top-0 text-white/85" style={{ left: `${p.left}%`, fontSize: `${p.size}px`, animation: `jrn-fall ${p.dur}s linear ${p.delay}s infinite` }}>❄</span>
        ) : (
          <span key={i} className="absolute top-0 w-[2px] rounded-full bg-gradient-to-b from-transparent via-white/50 to-white/90" style={{ left: `${p.left}%`, height: `${p.size}px`, animation: `jrn-fall ${p.dur}s linear ${p.delay}s infinite` }} />
        )
      ))}
    </div>
  );
}

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type Tab = 'write' | 'calendar' | 'trips' | 'map' | 'food' | 'stats' | 'flashback';

/** 방 사이드바 내비 — 섹션이 곧 메뉴 (컨셉 v2 디자인 적용, 그룹 구성은 유지). */
const NAV_MAIN: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: 'write',     label: '데일리 로그', icon: NotebookPen },
  { id: 'calendar',  label: '캘린더',      icon: CalendarDays },
  { id: 'trips',     label: '트래블 로그', icon: Plane },
  { id: 'map',       label: '나의 지도',   icon: MapIcon },
  { id: 'food',      label: '푸드 로드',   icon: UtensilsCrossed },
  { id: 'flashback', label: '플래시백',    icon: History },
  { id: 'stats',     label: '통계',        icon: BarChart3 },
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
};

/** 한 기록에서 검색 대상이 되는 글자를 한 줄로. */
function entryHaystack(e: JournalEntry): string {
  return [e.title, e.summary, e.body, e.bgm, (e.tags ?? []).join(' '), (e.activities ?? []).join(' ')]
    .filter(Boolean).join(' ');
}

export default function Journal() {
  const allEntries = useJournal();
  const streak = useJournalStreak(allEntries);

  const [tab, setTab] = useState<Tab>('write');
  const [jq, setJq] = useState('');            // 머리 오른쪽 찾기
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
  const [tagDraft, setTagDraft] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const onPickPhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
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
      tags,
      starred,
      bodyFormat: 'plain' as const,
    };
    if (existing) journalStore.update(existing.id, { ...data, body });
    else if (body.trim() || title.trim() || moodKey || weather || color || bgm.trim() || photo || tags.length > 0) journalStore.add({ date: selectedDate, body, ...data });
  };
  useEffect(() => {
    if (!editing) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(persist, 500);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, moodKey, weather, color, bgm, photo, tags, editing]);

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
  const backToList = () => { setDetailOpen(false); setEditing(false); };
  const toggleTag = (t: string) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  const addTag = () => { const t = tagDraft.trim().replace(/^#+/, '').trim(); if (t && !tags.includes(t)) setTags((p) => [...p, t]); setTagDraft(''); };

  // 파생
  const feed = useMemo(() => [...allEntries].sort((a, b) => b.date.localeCompare(a.date)), [allEntries]);

  /* ── 플래시백 ──
   * 예전엔 규칙 6개가 각각 한 편만 물고 있는 균일 카드 그리드였다. 문제가 셋이었다.
   *  ① 기록이 적으면 절반이 "없어요"로 죽은 타일이 된다
   *  ② 규칙마다 딱 한 편 — 더 보고 싶어도 길이 없다
   *  ③ 균일 라운드 카드 + 호버 리프트 격자 = 이 저장소가 피하기로 한 모양
   * 그래서 '렌즈'로 바꿨다. 렌즈는 과거를 걸러내는 방식이고, 각 렌즈는 한 편이 아니라
   * 목록을 문다. 한 번에 한 장을 크게 펼쳐 보여주고 다음 장으로 넘긴다 — 사진첩처럼. */
  const hasText = (e: JournalEntry) => !!(e.body.trim() || e.title?.trim());
  const [memSeed, setMemSeed] = useState(0); // '아무 날이나' 렌즈 섞기
  const [lensId, setLensId] = useState<string>('sameday');
  const [lensStep, setLensStep] = useState(0);

  const lenses = useMemo(() => {
    const past = allEntries.filter((e) => e.date < todayKey && hasText(e));
    const byDateDesc = (a: JournalEntry, b: JournalEntry) => b.date.localeCompare(a.date);
    const md = todayKey.slice(5);
    const [ty, tm, td] = todayKey.split('-').map(Number);
    const monthTarget = Date.parse(`${dateKey(new Date(ty, tm - 2, td))}T00:00`);
    const moodRank = (e: JournalEntry) => { const mk = entryMoodKey(e); return mk ? MOODS.findIndex((m) => m.key === mk) : 99; };
    // 시드로 섞기 — Math.random 을 쓰면 렌더마다 순서가 바뀌어 '다음 장'이 무의미해진다
    const shuffled = past.map((e, i) => ({ e, k: Math.sin((i + 1) * 9973 + memSeed * 131) })).sort((a, b) => a.k - b.k).map((x) => x.e);
    return [
      { id: 'sameday', emoji: '🕰️', label: '오늘과 같은 날', desc: '해가 바뀐 같은 날짜', entries: past.filter((e) => e.date.slice(5) === md).sort(byDateDesc) },
      { id: 'monthago', emoji: '📅', label: '한 달 전쯤', desc: '한 달 전 그 무렵', entries: [...past].sort((a, b) => Math.abs(Date.parse(`${a.date}T00:00`) - monthTarget) - Math.abs(Date.parse(`${b.date}T00:00`) - monthTarget)).slice(0, 12) },
      { id: 'photo', emoji: '📸', label: '사진이 있던 날', desc: '그 날의 장면', entries: past.filter((e) => (e.images?.length ?? 0) > 0).sort(byDateDesc) },
      { id: 'bright', emoji: '🌟', label: '기분 좋던 날', desc: '활짝 웃었던 하루', entries: past.filter((e) => moodRank(e) <= 1).sort(byDateDesc) },
      { id: 'weather', emoji: '🌧️', label: '하늘이 특별하던 날', desc: '비·눈 오던 하루', entries: past.filter((e) => e.weather === 'rainy' || e.weather === 'stormy' || e.weather === 'snowy').sort(byDateDesc) },
      { id: 'random', emoji: '🎲', label: '아무 날이나', desc: '무작위로 툭', entries: shuffled },
    ];
  }, [allEntries, todayKey, memSeed]);

  /** 고른 렌즈 — 비어 있으면 기록이 있는 첫 렌즈로 스스로 옮겨 앉는다(빈 화면 방지). */
  const lens = useMemo(() => {
    const picked = lenses.find((l) => l.id === lensId);
    if (picked && picked.entries.length) return picked;
    return lenses.find((l) => l.entries.length) ?? picked ?? lenses[0];
  }, [lenses, lensId]);
  const lensEntry = lens.entries.length ? lens.entries[lensStep % lens.entries.length] : null;
  const pickLens = (id: string) => { setLensId(id); setLensStep(0); };
  /** 하루 기록(먹은 것·간 곳) — 캘린더 마커·보관함 사진용. */
  const dayItems = useDaylogAll();
  /** 하루 기록이 있는 날짜 전체 (메모 포함) — 캘린더 마커용. */
  const itemDates = useMemo(() => new Set(dayItems.map((i) => i.date)), [dayItems]);
  /** 이번 달 기록 잔디 — 사이드바 하단 위젯. 기록한 날 = 그 날 기분색으로 채워짐(압박 없음). */
  const monthGrass = useMemo(() => {
    const [ty, tm] = todayKey.split('-').map(Number);
    const y = ty; const m = tm - 1;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDow = new Date(y, m, 1).getDay();
    const recorded = new Set<string>();
    for (const e of allEntries) if (e.body.trim() || e.title?.trim() || e.moodKey || e.mood || e.weather || (e.images?.length ?? 0) > 0) recorded.add(e.date);
    for (const d of itemDates) recorded.add(d);
    const moodColor = new Map<string, string>();
    for (const e of allEntries) { const mk = entryMoodKey(e); if (mk && MOOD_BY_KEY[mk] && !moodColor.has(e.date)) moodColor.set(e.date, MOOD_BY_KEY[mk].color); }
    const cells: ({ key: string; day: number; has: boolean; isToday: boolean; color?: string } | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const key = dateKey(new Date(y, m, day));
      cells.push({ key, day, has: recorded.has(key), isToday: key === todayKey, color: moodColor.get(key) });
    }
    return { cells, count: cells.filter((c) => c?.has).length, label: `${m + 1}월` };
  }, [allEntries, itemDates, todayKey]);
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
          'flex h-[38px] w-full items-center gap-2.5 rounded-[9px] px-3 text-left text-[14px] transition-colors',
          active
            ? 'bg-[hsl(var(--cream-accent))]/[0.14] font-semibold text-[hsl(var(--cream-accent))] dark:bg-[hsl(var(--cream-accent))]/24'
            : 'font-medium text-[hsl(var(--cream-ink))]/90 hover:bg-white/45 dark:hover:bg-white/5',
        )}
      >
        <span aria-hidden className="w-[19px] shrink-0 text-center text-[16px] leading-none">{NAV_EMOJI[item.id]}</span>
        <span className="flex-1">{item.label}</span>
        {count > 0 && (
          <span className={cn('text-[12.5px] tabular-nums', active ? 'font-semibold text-[hsl(var(--cream-accent))]' : 'text-[hsl(var(--cream-muted))]/75')}>{count}</span>
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
  /* 전체/이번 주/사진 필터 위에 검색어를 AND 로 얹는다 — 검색이 목록을 대체하는
     게 아니라 좁히는 것이라, 필터를 켜둔 채로 그 안에서 찾을 수 있다. */
  const recentEntries = useMemo(() => {
    const q = jq.trim();
    return feed
      .filter((e) => (recentFilter === 'photo' ? (e.images?.length ?? 0) > 0 : recentFilter === 'week' ? e.date >= weekAgoKey : true))
      .filter((e) => (q ? tokenMatchAll(entryHaystack(e), q) : true));
  }, [feed, recentFilter, weekAgoKey, jq]);
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
      className="flex h-dvh bg-[#fcfbfe] text-[hsl(var(--cream-ink))]"
    >
      {/* ── 사이드바 — 참고 디자인 (마크+제목 락업 · 세이지 CTA · 컬러 아이콘 내비 · 은은한 활성). 모바일은 상단 가로 내비 ── */}
      {/* 본문이 그 날 하늘 아래 있는데 사이드바만 딴 날씨면 방이 둘로 갈린다 —
          하늘의 맨 윗색을 아주 옅게 받아 같은 공기 아래 두되, 색은 부드럽게 갈아탄다. */}
      <aside
        className="hidden w-[264px] shrink-0 flex-col overflow-y-auto border-r border-[hsl(var(--cream-line))] bg-[#f6f4fb] px-3.5 py-5 transition-colors duration-500 dark:bg-[hsl(var(--cream-panel))] sm:flex"
        style={tab === 'write' && detailOpen && weather ? { backgroundColor: WEATHER_SIDE[weather] } : undefined}
      >
        {/* 헤더 — 34px 흰 마크 + 제목 + 부제 (커리어/인맥노트 기준) */}
        <div className="flex items-center gap-[11px] px-1.5">
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-white text-[17px] shadow-[0_1px_2px_rgba(40,30,80,0.09)]" role="img" aria-label="데일리 로그">🌙</span>
          <div className="min-w-0">
            <div className="text-[16px] font-bold leading-tight tracking-[-0.01em] text-[#191c20] dark:text-[hsl(var(--cream-ink))]">데일리 로그</div>
            <div className="truncate text-[12px] leading-tight text-[#8078a3]">나의 하루를 담는 기록실</div>
          </div>
        </div>

        {/* 찾기는 여기 없다 — 본문 머리 오른쪽으로 옮겼다. 방 이름 바로 아래에 두니
            '이 방을 검색' 인지 '메뉴를 검색' 인지 애매했고, 결과가 메뉴를 밀어냈다. */}

        {/* 내비 — 섹션라벨·아이템 px-3 로 위계 정렬 (기준 통일) */}
        <div className="mb-[7px] mt-[26px] px-3 text-[11.5px] font-semibold tracking-[0.05em] text-[#8078a3]">메뉴</div>
        <nav className="flex-1 overflow-y-auto" aria-label="데일리로그 섹션">
          {NAV_MAIN.map((item) => renderNavRow(item))}
        </nav>

        {/* 이번 달 기록 잔디 — 채워지는 재미(빠진 날에 벌점 없음). 기록한 날은 그 날 기분색. */}
        <div className="mt-3 shrink-0 rounded-[14px] border border-[hsl(var(--cream-line))] bg-white/45 px-3 py-3 dark:bg-white/5">
          <div className="mb-2 flex items-baseline justify-between px-0.5">
            <span className="text-[11px] font-bold tracking-[0.03em] text-[#8078a3]">{monthGrass.label} 기록</span>
            <span className="text-[11px] font-bold tabular-nums text-[hsl(var(--cream-accent))]">{monthGrass.count}일</span>
          </div>
          <div className="grid grid-cols-7 gap-[5px]">
            {monthGrass.cells.map((c, i) => c === null ? (
              <span key={`e${i}`} aria-hidden />
            ) : c.has ? (
              <button
                key={c.key}
                type="button"
                title={`${c.day}일 · 기록 있음`}
                onClick={() => openEntry(c.key)}
                className={cn('aspect-square rounded-[4px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)] transition-transform hover:scale-125', c.isToday && 'ring-2 ring-[hsl(var(--cream-accent))]')}
                style={{ backgroundColor: c.color ?? 'hsl(var(--cream-accent))' }}
              />
            ) : (
              <span
                key={c.key}
                title={`${c.day}일`}
                className={cn('aspect-square rounded-[4px] bg-[hsl(var(--cream-line))]/45', c.isToday && 'ring-2 ring-[hsl(var(--cream-accent))]/60')}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* ── 메인 ── 특정 날을 연 상태(detailOpen)에서만 날씨 하늘 배경. 데일리 로그 랜딩/목록엔 영향 없음. */}
      <main
        ref={mainRef}
        className="relative min-w-0 flex-1 overflow-y-auto transition-colors"
        style={tab === 'write' && detailOpen && weather ? { background: WEATHER_SKY[weather] } : undefined}
      >
        {tab === 'write' && detailOpen && <WeatherFx weather={weather} />}
        {/* 화면을 넓게 — 전 섹션 공통 1280 (마소너리·2단 작성·지도 전부 이 폭 기준) */}
        <div className="relative z-[1] mx-auto w-full max-w-[1280px] px-4 pb-7 pt-6 sm:px-8 sm:pt-10">
          {/* 모바일 — 사이드바 대신 가로 스크롤 내비 */}
          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 sm:hidden">
            <button
              type="button"
              onClick={goWriteToday}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-[hsl(var(--cream-dark))] px-3.5 py-1.5 text-[12px] font-bold text-white"
            >
              <Pencil className="h-3 w-3" /> 글쓰기
            </button>
            {NAV_MAIN.map((item) => {
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
              /* 찾기가 여기 있는 이유 — 마스트헤드는 '이 방 전체' 를 다루는 자리다.
                 아래 '최근 기록' 줄의 전체/이번 주/사진은 그 목록만의 도구라 거기 남고,
                 방 전체를 훑는 찾기는 방 이름 옆에 선다. 마이위키도 같은 규칙이다
                 (서재 머리에 찾기, 책 안 도구는 그 책 줄에). */
              /* items-end — 제목 덩이는 두 줄(날짜 + 인사말)이라 가운데 정렬하면
                 검색칸이 그 사이 허공에 뜬다. 아랫줄(인사말)에 발을 맞춰 세운다. */
              <div key={selectedDate} className="mb-5 flex flex-wrap items-end gap-x-4 gap-y-2.5 duration-300 animate-in fade-in-50 slide-in-from-bottom-2">
                <div className="min-w-0">
                  <p className="text-[13px] text-[#8d949d]">{todayLabelFull}</p>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-[26px] font-bold leading-none tracking-[-0.015em] text-[#191c20] dark:text-[hsl(var(--cream-ink))]">{greeting}</h2>
                    <span className="text-[14px] text-[#8d949d]">{streak > 0 && <>연속 {streak}일 · </>}이번 달 {monthCount}개 기록</span>
                  </div>
                </div>
                <span className="flex-1" />
                <label className="mb-[-3px] inline-flex h-[36px] w-[240px] max-w-full shrink-0 items-center gap-2 rounded-[8px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] px-3 text-[13.5px] transition-colors focus-within:border-[hsl(var(--cream-accent))]">
                  <Search className="h-[15px] w-[15px] shrink-0 text-[#a19bbb]" />
                  <input
                    value={jq}
                    onChange={(e) => setJq(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') setJq(''); }}
                    placeholder="제목·본문·태그 검색"
                    aria-label="기록 검색"
                    className="min-w-0 flex-1 bg-transparent text-[#191c20] outline-none placeholder:text-[#a19bbb] dark:text-[hsl(var(--cream-ink))]"
                  />
                  {jq && (
                    <button type="button" onClick={() => setJq('')} aria-label="검색어 지우기" className="shrink-0 text-[#a19bbb] transition-colors hover:text-[#191c20]">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </label>
              </div>
            ) : tab === 'trips' ? null : (
              <div className="mb-6">
                <p className="text-[10.5px] font-bold tracking-[0.22em] text-[hsl(var(--cream-muted))]/70">{SECTION_HEAD[tab].eyebrow}</p>
                <h2 className="mt-1.5 text-[27px] font-bold leading-none tracking-[-0.01em]">{SECTION_HEAD[tab].title}</h2>
              </div>
            )
          )}

          {/* ── 기록 탭: 히어로 + 최근 기록 리스트 ── */}
          {tab === 'write' && !detailOpen && (
            <div className="flex flex-col gap-6 duration-300 animate-in fade-in-50 slide-in-from-bottom-2">
              {/* 히어로 — 연한 세이지 카드 (확정 크롬 보드) */}
              <div className="flex flex-wrap items-center gap-x-8 gap-y-5 rounded-[12px] bg-[#e7e3f5] px-8 py-7 dark:bg-[hsl(258_18%_18%)]">
                <div className="min-w-0 flex-1">
                  <p className="text-[20px] font-bold tracking-[-0.01em] text-[#2f2960] dark:text-[hsl(258_35%_80%)]">{hasTodayEntry ? '이번 주도 잘 이어가고 있어요' : '오늘 하루는 어땠나요?'}</p>
                  <p className="mt-1.5 text-[13.5px] text-[#6b6493]">{hasTodayEntry ? `오늘 기록 완료 · ${streak}일째` : '오늘은 아직 비어 있어요'}</p>
                  <button
                    type="button"
                    onClick={goWriteToday}
                    className="mt-[18px] inline-flex h-[42px] items-center gap-1.5 rounded-[8px] px-[18px] text-[14px] font-semibold text-white transition-[filter,transform] hover:brightness-[1.05] active:scale-[0.97]"
                    style={{ backgroundColor: '#5a4bc4' }}
                  >
                    <Pencil className="h-[15px] w-[15px]" /> 오늘 기록 쓰기
                  </button>
                </div>
                {/* 최근 7일 리듬 — 라이트, 날짜 클릭 시 이동 */}
                <div className="flex gap-2">
                  {weekStrip.map((c) => (
                    <button key={c.key} type="button" onClick={() => openDate(c.key)} aria-label={`${c.day}일${c.has ? ' · 기록 있음' : ''}`} className="flex w-10 flex-col items-center gap-2">
                      <span className={cn('text-[11.5px]', c.isToday ? 'font-semibold text-[#4a3f7d]' : 'font-medium text-[#8880ab]')}>{c.isToday ? '오늘' : c.wd}</span>
                      <span className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full text-[14px] tabular-nums transition-colors',
                        c.isToday ? 'bg-[#5a4bc4] font-bold text-white'
                          : c.has ? 'bg-[#d8d1f0] font-semibold text-[#3a3170]'
                          : 'text-[#6b6493] hover:bg-white/50',
                      )}>{c.day}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 최근 기록 + 필터 + 찾기.
                  찾기가 여기 있는 이유 — 아카이브·인맥노트도 검색은 도구 줄 오른쪽
                  끝에 늘 펼쳐진 채로 있고, 결과는 따로 뜨지 않고 그 아래 목록을
                  좁힌다. 방마다 검색이 다른 모양이면 방을 옮길 때마다 다시 찾게 된다.
                  덤으로 전체/이번 주/사진 필터와 자연스럽게 겹쳐 걸린다. */}
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2.5">
                  <h3 className="text-[17px] font-bold text-[#191c20] dark:text-[hsl(var(--cream-ink))]">최근 기록</h3>
                  <span className="flex-1" />
                  {/* 예시로 갈아 끼우기 — 되돌릴 수 없어서 반드시 한 번 묻는다.
                      조용한 글자 버튼으로 둔다: 자주 쓸 것도 아니고, 실수로 누르면
                      한 달치가 날아가는 자리라 눈에 먼저 띄면 안 된다. */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm('지금까지의 기록을 전부 지우고 예시로 채울까요?\n\n일기 · 먹은 것 · 간 곳 · 여행이 모두 사라집니다.\n되돌릴 수 없어요.')) return;
                      const r = replaceJournalWithSample();
                      notify.success(`예시 ${r.entries}일 · 여행 ${r.trips}개를 채웠어요`);
                    }}
                    className="rounded-md px-2 py-1 text-[12px] text-[#8078a3] transition-colors hover:bg-[hsl(var(--cream-accent)/0.1)] hover:text-[#23262b]"
                    title="기존 기록을 지우고 한 달치 예시 + 여행 3개로 채웁니다"
                  >
                    예시로 채우기
                  </button>
                  <div className="flex gap-0.5 rounded-[8px] bg-[#eae7f3] p-0.5 dark:bg-white/10">
                    {([['all', '전체'], ['week', '이번 주'], ['photo', '사진']] as const).map(([k, l]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setRecentFilter(k)}
                        className={cn(
                          'flex h-8 items-center rounded-[6px] px-3.5 text-[13.5px] transition-colors',
                          recentFilter === k ? 'bg-white font-semibold text-[#23262b] shadow-sm dark:bg-white/15' : 'font-medium text-[#6b6493] hover:text-[#23262b]',
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  {/* 찾기는 여기 없다 — 방 이름 옆(마스트헤드)으로 올렸다.
                      이 줄에 남는 건 이 목록만의 도구(전체·이번 주·사진)뿐이다. */}
                </div>

                {recentEntries.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))]/50 py-14 text-center">
                    {/* 검색 중일 땐 무엇으로 찾았는지 되짚어 준다 — '이 조건' 이라고만
                        하면 필터 때문인지 검색어 때문인지 알 수 없다. */}
                    <p className="text-[13px] text-[hsl(var(--cream-muted))]">
                      {feed.length === 0 ? '아직 기록이 없어요. 위에서 오늘 하루를 남겨보세요.'
                        : jq.trim() ? `‘${jq.trim()}’ 로 찾은 기록이 없어요.`
                        : '이 조건에 맞는 기록이 없어요.'}
                    </p>
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
                          className="group flex w-full items-start gap-4 rounded-[14px] border border-[#e4e0ee] bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#cbc3ea] hover:shadow-[0_10px_24px_-16px_rgba(50,40,90,0.3)] active:scale-[0.99] dark:border-[hsl(var(--cream-line))] dark:bg-[hsl(var(--cream-card))]"
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
                    <button type="button" onClick={handleSave} disabled={!body.trim() && !title.trim() && !moodKey && !weather && !photo && tags.length === 0} className="rounded-full bg-[hsl(var(--cream-accent))] px-4 py-1.5 text-[12.5px] font-bold text-white transition-transform hover:opacity-90 active:scale-[0.96] disabled:opacity-40">저장하기</button>
                  )}
                </div>
              </div>

              {/* 2단 — 좌: 일기(넓게) / 우: 하루 기록 레일. 날씨 배경은 main 전체에. */}
              <div className="relative">
              <div className="relative z-[1] items-start gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="min-w-0">
              {!editing && current ? (
                /* 보기 모드 */
                <div className="relative overflow-hidden rounded-[26px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-6 shadow-[0_4px_24px_-16px_hsl(25_30%_20%/0.18)]">
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
                </div>
              ) : (
                /* 에디터 */
                <div className="relative rounded-[26px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] p-7 shadow-[0_6px_28px_-18px_hsl(25_30%_20%/0.2)] transition-colors">
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
                </div>
              )}

              </div>

              {/* 하루 기록 레일 — 먹은 것·간 곳·메모 (보기/편집 모두, 우측 고정) */}
              <div className="mt-4 lg:sticky lg:top-4 lg:mt-0">
                <DayItemsBlock date={selectedDate} />
              </div>
              </div>
              </div>
            </>
          )}

          {/* ── 달력 탭 ── */}
          {tab === 'calendar' && (() => {
            // 인맥노트 캘린더 스타일 — 앞뒤 달 채움 포함 7열 그리드.
            const prevDaysIn = new Date(y, m, 0).getDate();
            const cells: Array<{ day: number; other: boolean; key?: string }> = [];
            for (let i = 0; i < lead; i++) cells.push({ day: prevDaysIn - lead + 1 + i, other: true });
            for (let d = 1; d <= daysIn; d++) cells.push({ day: d, other: false, key: dateKey(new Date(y, m, d)) });
            while (cells.length % 7 !== 0) cells.push({ day: cells.length - lead - daysIn + 1, other: true });
            const SUN = '#c4859e', SAT = '#8a86c9';
            return (
              <div className="overflow-hidden rounded-[16px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))]">
                {/* 월 네비 */}
                <div className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-[17px] font-bold tabular-nums text-[hsl(var(--cream-ink))]">{y}년 {m + 1}월</span>
                  <span className="inline-flex h-[34px] items-center overflow-hidden rounded-[8px] border border-[hsl(var(--cream-line))] text-[13px] text-[hsl(var(--cream-ink))]/80">
                    <button type="button" onClick={() => setCalAnchor(new Date(y, m - 1, 1))} className="flex h-full w-8 items-center justify-center text-[hsl(var(--cream-muted))] hover:bg-[hsl(var(--cream-line))]/40" aria-label="이전 달"><ChevronLeft className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setCalAnchor(new Date())} className="h-full border-x border-[hsl(var(--cream-line))] px-3 font-medium hover:bg-[hsl(var(--cream-line))]/40">오늘</button>
                    <button type="button" onClick={() => setCalAnchor(new Date(y, m + 1, 1))} className="flex h-full w-8 items-center justify-center text-[hsl(var(--cream-muted))] hover:bg-[hsl(var(--cream-line))]/40" aria-label="다음 달"><ChevronRight className="h-4 w-4" /></button>
                  </span>
                </div>
                {/* 요일 헤더 — 격자선은 60% 투명이 아니라 제 색으로. 옅은 헤어라인을 또 흐리면 칸이 안 보인다 */}
                <div className="grid grid-cols-7 border-y border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-bg))]/50">
                  {['일', '월', '화', '수', '목', '금', '토'].map((w, i) => (
                    <span key={w} className="border-r border-[hsl(var(--cream-line))] py-2.5 text-center text-[12.5px] font-bold last:border-r-0" style={{ color: i === 0 ? SUN : i === 6 ? SAT : 'hsl(var(--cream-ink) / 0.72)' }}>{w}</span>
                  ))}
                </div>
                {/* 그리드 — 한 칸 92→112px. 메모 한 줄이 날짜에 눌려 잘리던 높이였다 */}
                <div className="grid grid-cols-7" style={{ gridAutoRows: 'minmax(112px, 1fr)' }}>
                  {cells.map((c, idx) => {
                    const dow = idx % 7;
                    const meta = c.key ? dayMeta.get(c.key) : undefined;
                    const mood = meta?.moodKey ? MOOD_BY_KEY[meta.moodKey] : undefined;
                    const isToday = c.key === todayKey;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => c.key && openDate(c.key)}
                        disabled={!c.key}
                        className={cn(
                          'flex flex-col gap-1 overflow-hidden border-b border-r border-[hsl(var(--cream-line))] px-2 py-2 text-left transition-colors',
                          c.other ? 'bg-[hsl(var(--cream-bg)/0.45)]' : 'hover:bg-[hsl(var(--cream-accent))]/[0.06]',
                        )}
                      >
                        <span className="flex items-center justify-between">
                          <span
                            className={cn('inline-flex h-[25px] min-w-[25px] items-center justify-center rounded-full px-1 text-[13.5px] font-bold tabular-nums', isToday && 'bg-[hsl(var(--cream-accent))] text-white')}
                            style={!isToday ? { color: c.other ? 'hsl(var(--cream-muted) / 0.5)' : dow === 0 ? SUN : dow === 6 ? SAT : 'hsl(var(--cream-ink) / 0.92)' } : undefined}
                          >
                            {c.day}
                          </span>
                          {!c.other && meta?.weather && <span className="text-[14px] leading-none">{WEATHER_META[meta.weather].emoji}</span>}
                        </span>
                        {mood && <span className="text-[16px] leading-none">{mood.emoji}</span>}
                        {/* 메모 — 10px/55% 는 사실상 안 보였다. 칸이 높아진 만큼 두 줄까지 */}
                        {!c.other && meta?.label && <span className="line-clamp-2 text-[11.5px] leading-snug text-[hsl(var(--cream-ink))]/80">{meta.label}</span>}
                        {c.key && itemDates.has(c.key) && <span aria-hidden className="mt-auto h-[7px] w-[7px] rounded-full bg-[hsl(var(--cream-accent))]" />}
                      </button>
                    );
                  })}
                </div>
                {/* 범례 */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[hsl(var(--cream-line))] px-5 py-3 text-[11.5px] text-[hsl(var(--cream-ink))]/65">
                  {MOODS.map((mo) => <span key={mo.key} className="inline-flex items-center gap-1">{mo.emoji} {mo.label}</span>)}
                  <span className="inline-flex items-center gap-1.5"><span className="h-[7px] w-[7px] rounded-full bg-[hsl(var(--cream-accent))]" />하루 기록 있음</span>
                </div>
              </div>
            );
          })()}

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

          {/* ── 플래시백 — 렌즈로 걸러 한 장씩 펼쳐 보는 회상 ── */}
          {tab === 'flashback' && (() => {
            const e = lensEntry;
            const d = e ? new Date(`${e.date}T00:00:00`) : null;
            const mk = e ? entryMoodKey(e) : null;
            const mood = mk ? MOOD_BY_KEY[mk] : undefined;
            const photo = e?.images?.[0]?.src;
            const excerpt = e ? (e.body.split('\n').filter((l) => l.trim()).slice(0, 4).join('\n') || e.title?.trim() || '') : '';
            const total = lens.entries.length;
            const gap = e && d ? Math.round((Date.parse(`${todayKey}T00:00`) - d.getTime()) / 86400000) : 0;
            const gapText = gap >= 365 ? `${Math.floor(gap / 365)}년 전` : gap >= 30 ? `${Math.floor(gap / 30)}달 전` : gap <= 1 ? '어제' : `${gap}일 전`;
            return (
            <div className="pb-8">
              {/* 렌즈 줄 — 과거를 어떤 방식으로 걸러 볼지. 기록 없는 렌즈는 눌리지 않게(죽은 타일 방지) */}
              <div className="mb-4 flex flex-wrap gap-1.5">
                {lenses.map((l) => {
                  const on = l.id === lens.id;
                  const empty = l.entries.length === 0;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      disabled={empty}
                      onClick={() => pickLens(l.id)}
                      title={empty ? `${l.label} — 아직 기록이 없어요` : l.desc}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
                        on ? 'bg-[hsl(var(--cream-accent))] text-white'
                          : empty ? 'cursor-not-allowed text-[hsl(var(--cream-muted))]/40'
                          : 'bg-[hsl(var(--cream-card))] text-[hsl(var(--cream-ink))]/75 hover:bg-[hsl(var(--cream-accent))]/10',
                      )}
                      style={!on && !empty ? { boxShadow: 'inset 0 0 0 1px hsl(var(--cream-line))' } : undefined}
                    >
                      <span aria-hidden>{l.emoji}</span>{l.label}
                      {!empty && <span className={cn('tabular-nums', on ? 'text-white/70' : 'text-[hsl(var(--cream-muted))]')}>{l.entries.length}</span>}
                    </button>
                  );
                })}
              </div>

              {e && d ? (
                <>
                  {/* 한 장 — 사진첩에서 한 컷 꺼내 든 것처럼 크게 */}
                  <button
                    type="button"
                    onClick={() => openEntry(e.date)}
                    className="group block w-full overflow-hidden rounded-[20px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-card))] text-left transition-shadow hover:shadow-[0_20px_44px_-28px_rgba(60,40,90,0.45)]"
                  >
                    {photo && (
                      <span className="block h-[220px] w-full overflow-hidden sm:h-[280px]">
                        <img src={photo} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                      </span>
                    )}
                    <span className="block p-5 sm:p-6">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[12px] font-bold text-[hsl(var(--cream-accent))]">{gapText}</span>
                        <span className="text-[12px] text-[hsl(var(--cream-muted))]">·</span>
                        <span className="text-[12px] text-[hsl(var(--cream-muted))]">{d.getFullYear()}. {d.getMonth() + 1}. {d.getDate()} ({WEEKDAY[d.getDay()]})</span>
                        {mood && <span className="text-[14px] leading-none" title={mood.label}>{mood.emoji}</span>}
                        {e.weather && <span className="text-[14px] leading-none">{WEATHER_META[e.weather].emoji}</span>}
                      </span>
                      {e.title?.trim() && (
                        <span className="mt-2 block break-keep text-[21px] font-bold leading-snug tracking-[-0.01em] text-[hsl(var(--cream-ink))]">{e.title.trim()}</span>
                      )}
                      {excerpt && (
                        <span className="mt-2 block whitespace-pre-wrap break-keep text-[14px] leading-relaxed text-[hsl(var(--cream-ink))]/75 line-clamp-4">{excerpt}</span>
                      )}
                      <span className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[hsl(var(--cream-accent))]">
                        그 날 펼치기 <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
                      </span>
                    </span>
                  </button>

                  {/* 넘기기 — 렌즈 안에서 몇 번째인지 알려주고 다음 장으로 */}
                  <div className="mt-3.5 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => { setLensStep((s) => s + 1); if (lens.id === 'random') setMemSeed((s) => s + 1); }}
                      disabled={total <= 1}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--cream-card))] px-4 py-2 text-[12.5px] font-bold text-[hsl(var(--cream-ink))]/80 transition-colors hover:bg-[hsl(var(--cream-accent))]/10 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ boxShadow: 'inset 0 0 0 1px hsl(var(--cream-line))' }}
                    >
                      다음 기억 <span aria-hidden>↻</span>
                    </button>
                    <span className="text-[12px] tabular-nums text-[hsl(var(--cream-muted))]">
                      {total > 1 ? `${(lensStep % total) + 1} / ${total}` : '이 렌즈엔 한 장뿐이에요'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="rounded-[20px] border border-dashed border-[hsl(var(--cream-line))] px-6 py-16 text-center">
                  <p className="text-[14px] font-semibold text-[hsl(var(--cream-ink))]">아직 되돌아볼 기록이 없어요</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[hsl(var(--cream-muted))]">하루를 몇 번 적어두면<br />이 자리에서 그 날들이 다시 올라와요</p>
                </div>
              )}
            </div>
            );
          })()}

          {/* ── 통계 탭 ── */}
          {tab === 'stats' && <StatsView entries={allEntries} streak={streak} monthCount={monthCount} items={dayItems} />}
        </div>
      </main>
    </div>
  );
}

/* ── 통계 뷰 ── */
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
