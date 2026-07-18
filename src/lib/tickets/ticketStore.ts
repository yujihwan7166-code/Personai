/**
 * 티켓북 저장소 — localStorage 'ticketbook.v1'.
 * 사진 바이너리는 여기 두지 않고 IndexedDB(photoStore)에 두고, photoIds 로만 참조.
 * 손상 데이터는 normalizeEntry 가 필드별로 방어 → 못 살리면 그 항목만 버림.
 */
import { toDateKey } from '@/lib/planner/habitStats';

export type TicketKind = 'movie' | 'drama' | 'book' | 'game' | 'show';
export const TICKET_KINDS: TicketKind[] = ['movie', 'drama', 'book', 'game', 'show'];
export const KIND_LABEL: Record<TicketKind, string> = {
  movie: '영화', drama: '드라마', book: '책', game: '게임', show: '공연',
};
/** 창작자 필드 라벨 — 카테고리별로 감독/저자/개발사/제작. */
export const KIND_CREATOR_LABEL: Record<TicketKind, string> = {
  movie: '감독', drama: '연출', book: '저자', game: '개발', show: '제작',
};

export interface TicketEntry {
  id: string;
  kind: TicketKind;
  title: string;
  creator: string;        // 감독/저자/개발사/극단
  year?: number;
  posterUrl?: string;     // TMDB·카카오 이미지 URL (핫링크, 저장 안 함)
  rating: number;         // 0.5~5, 0.5 단위
  watchedAt: string;      // 로컬 'YYYY-MM-DD'
  where?: string;         // 극장/넷플릭스/종이책…
  oneLiner: string;
  longNote?: string;
  quotes?: string[];
  rewatch: boolean;
  genres?: string[];
  photoIds?: string[];    // IndexedDB 사진 키 — 상세에서만 표시
  createdAt: number;
}

export interface TicketStoreData {
  entries: TicketEntry[];
  yearGoal?: { year: number; count: number };
  accent?: string;        // 테마 포인트색 (없으면 기본 앰버)
}

const KEY = 'ticketbook.v1';
export const TICKETS_CHANGED = 'ticketbook:changed';
export const DEFAULT_ACCENT = '#e6a53f';
export const ACCENT_OPTIONS = ['#e6a53f', '#e5484d', '#4cc38a', '#8b7cf6', '#3b9eff'];

const isYmd = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const clampRating = (v: unknown): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  return Math.min(5, Math.max(0, Math.round(n * 2) / 2));
};
const strArray = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === 'string' && !!x);
  return out.length ? out : undefined;
};

export function normalizeEntry(raw: unknown, index: number): TicketEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = typeof r.title === 'string' ? r.title.trim() : '';
  if (!title) return null;
  return {
    id: typeof r.id === 'string' && r.id ? r.id : `tkt_recovered_${index}_${Date.now().toString(36)}`,
    kind: TICKET_KINDS.includes(r.kind as TicketKind) ? (r.kind as TicketKind) : 'movie',
    title,
    creator: typeof r.creator === 'string' ? r.creator : '',
    year: typeof r.year === 'number' && Number.isFinite(r.year) ? r.year : undefined,
    posterUrl: typeof r.posterUrl === 'string' && r.posterUrl ? r.posterUrl : undefined,
    rating: clampRating(r.rating),
    watchedAt: isYmd(r.watchedAt) ? r.watchedAt : toDateKey(new Date()),
    where: typeof r.where === 'string' && r.where ? r.where : undefined,
    oneLiner: typeof r.oneLiner === 'string' ? r.oneLiner : '',
    longNote: typeof r.longNote === 'string' && r.longNote ? r.longNote : undefined,
    quotes: strArray(r.quotes),
    rewatch: r.rewatch === true,
    genres: strArray(r.genres),
    photoIds: strArray(r.photoIds),
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
  };
}

export function loadTickets(): TicketStoreData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { entries: [] };
    const d = JSON.parse(raw) as Record<string, unknown>;
    const entries = Array.isArray(d.entries)
      ? d.entries.map(normalizeEntry).filter((e): e is TicketEntry => !!e)
      : [];
    const g = d.yearGoal as Record<string, unknown> | undefined;
    const yearGoal = g && typeof g.year === 'number' && typeof g.count === 'number' && g.count > 0
      ? { year: g.year, count: g.count } : undefined;
    const accent = typeof d.accent === 'string' && d.accent ? d.accent : undefined;
    const out: TicketStoreData = { entries };
    if (yearGoal) out.yearGoal = yearGoal;
    if (accent) out.accent = accent;
    return out;
  } catch {
    return { entries: [] };
  }
}

export function saveTickets(data: TicketStoreData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(TICKETS_CHANGED));
  } catch { /* QuotaExceeded — 사진은 IndexedDB 라 실제로는 희박 */ }
}
