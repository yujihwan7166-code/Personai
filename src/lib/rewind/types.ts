/**
 * 되감기(/rewind) — 크로스룸 되감기 방의 공통 타입.
 *
 * 이 방은 아무것도 저장하지 않는다. 다른 방들이 이미 쌓아둔 기록을
 * RewindEvent 하나로 정규화해 날짜축에 늘어놓을 뿐 (읽기 전용).
 * /today 가 "오늘"을 가로로 모으는 방이면, 여기는 그 거울상 — 같은 조립을 과거 축에 세운다.
 */

export type RewindRoom = 'daylog' | 'journal' | 'ledger' | 'health' | 'tickets' | 'people';

export interface RewindRoomMeta {
  label: string;
  /** 차콜 판 위에서 읽히는 색 — 색상환에 고르게 배치해 한 날에 여러 방이 섞여도 구분된다. */
  dot: string;
  /** 원본 방으로 가는 길. */
  to: string;
}

export const REWIND_ROOMS: Record<RewindRoom, RewindRoomMeta> = {
  daylog:  { label: '하루',  dot: '#8fbf6a', to: '/journal' },
  health:  { label: '몸',    dot: '#3fbf8f', to: '/health'  },
  ledger:  { label: '돈',    dot: '#4aa9d8', to: '/ledger'  },
  journal: { label: '일기',  dot: '#a684f0', to: '/journal' },
  people:  { label: '사람',  dot: '#e08a5f', to: '/people'  },
  tickets: { label: '본 것', dot: '#e6b23f', to: '/tickets' },
};

/** 범례·집계 표시 순서. */
export const REWIND_ROOM_ORDER: RewindRoom[] = [
  'daylog', 'journal', 'ledger', 'health', 'tickets', 'people',
];

/**
 * 정규화된 한 조각 — 어느 방에서 왔든 이 모양이 된다.
 * 날짜는 어댑터 경계에서 반드시 **로컬 YMD** 로 맞춘다 (toISOString 금지 — KST 하루 밀림).
 */
export interface RewindEvent {
  id: string;
  /** YYYY-MM-DD (로컬). */
  ymd: string;
  /** HH:mm — 있으면 타임라인 위쪽에 시각 순으로 선다. */
  time?: string;
  room: RewindRoom;
  /** 앞에 붙는 작은 표식. */
  glyph?: string;
  /** 사람이 읽는 한 줄. */
  text: string;
  /** 오른쪽에 붙는 보조 — 금액·별점·장소 등. */
  detail?: string;
  /** 필름 칸에 인화할 사진 (base64 dataURL 또는 URL). */
  photo?: string;
  /** 그날을 대표할 자격 — 높을수록 프레임 캡션으로 뽑힌다. */
  weight: number;
}

/** 필름 한 칸 = 하루. 기록이 없는 날도 빈 칸으로 만들어진다. */
export interface ReelFrame {
  ymd: string;
  events: RewindEvent[];
  /** 이 칸에 인화된 사진 — 없으면 활자 프레임. */
  photo?: string;
  /** 사진이 없을 때 칸에 새겨질 한 줄. */
  caption?: string;
  /** 칸에 찍힌 방 색점 — 중복 제거, REWIND_ROOM_ORDER 순. */
  rooms: RewindRoom[];
}

/* ── 로컬 YMD 산술 ─────────────────────────────────────────
 * Date 를 거치되 전부 로컬 기준. UTC 로 새는 경로를 만들지 않는다. */

export const parseYmd = (ymd: string): Date => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const pad = (n: number) => String(n).padStart(2, '0');

export const toYmd = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayYmd = (): string => toYmd(new Date());

export const addDays = (ymd: string, n: number): string => {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + n);
  return toYmd(d);
};

/** [a, b] 사이의 날 수 (양 끝 포함). */
export const daysBetween = (a: string, b: string): number =>
  Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86_400_000) + 1;

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

/** "7월 25일 금요일" */
export const formatFullDate = (ymd: string): string => {
  const d = parseYmd(ymd);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAY[d.getDay()]}요일`;
};

/** 필름 엣지 코드 — "07·25" */
export const formatEdgeCode = (ymd: string): string =>
  `${ymd.slice(5, 7)}·${ymd.slice(8, 10)}`;

/** 릴 카운터 — "2026 · 7월" */
export const formatReelCounter = (ymd: string): string =>
  `${ymd.slice(0, 4)} · ${Number(ymd.slice(5, 7))}월`;
