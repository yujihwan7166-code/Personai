/** AI 채움(메타데이터) + AI 온디맨드 추천. 실패는 전부 null — UI가 수동 입력/재시도로 처리. */
import { quickAi, QUICK_MODEL } from '@/lib/cloudDoc/ai';
import { KIND_LABEL, type TicketEntry, type TicketKind } from './ticketStore';

export const MIN_ENTRIES_FOR_RECO = 3;

function extractJson<T>(text: string): T | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)) as T; } catch { return null; }
}

export interface AiFillResult { creator?: string; year?: number; genres?: string[] }

export async function aiFillEntry(kind: TicketKind, title: string): Promise<AiFillResult | null> {
  if (!title.trim()) return null;
  try {
    const raw = await quickAi(
      `너는 ${KIND_LABEL[kind]} 메타데이터 조수다. 주어진 제목의 대표작 기준으로 JSON만 출력한다: {"creator":"감독/저자/개발사/극단","year":연도숫자,"genres":["장르1","장르2"]}. 확실하지 않은 필드는 생략. 다른 말 금지.`,
      title.trim(),
      { model: QUICK_MODEL, temperature: 0.1, maxTokens: 200 },
    );
    const j = extractJson<Record<string, unknown>>(raw);
    if (!j) return null;
    const out: AiFillResult = {};
    if (typeof j.creator === 'string' && j.creator) out.creator = j.creator;
    if (typeof j.year === 'number' && j.year > 1800 && j.year < 2100) out.year = j.year;
    if (Array.isArray(j.genres)) {
      const g = j.genres.filter((x): x is string => typeof x === 'string' && !!x).slice(0, 4);
      if (g.length) out.genres = g;
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

export interface RecoPick { kind: TicketKind; title: string; creator: string; reason: string }
export interface RecoResult { taste: string; picks: RecoPick[] }

const KIND_FROM_LABEL: Record<string, TicketKind> = {
  영화: 'movie', 드라마: 'drama', 책: 'book', 게임: 'game', 공연: 'show',
};

export async function aiRecommend(likedEntries: TicketEntry[]): Promise<RecoResult | null> {
  if (likedEntries.length < MIN_ENTRIES_FOR_RECO) return null;
  const catalog = likedEntries.slice(0, 30)
    .map((e) => `- [${KIND_LABEL[e.kind]}] ${e.title}${e.creator ? ` (${e.creator})` : ''} ★${e.rating}${e.oneLiner ? ` — ${e.oneLiner}` : ''}`)
    .join('\n');
  try {
    const raw = await quickAi(
      `너는 취향 분석가다. 사용자가 높게 평가한 작품 목록을 보고 JSON만 출력한다: {"taste":"취향 한 줄(한국어, 40자 이내)","picks":[{"kind":"movie|drama|book|game|show","title":"제목","creator":"만든 이","reason":"추천 이유 한 문장"}]}. picks는 정확히 5개, 목록에 이미 있는 작품 제외, 카테고리를 섞어도 좋다. 다른 말 금지.`,
      catalog,
      { model: QUICK_MODEL, temperature: 0.7, maxTokens: 700 },
    );
    const j = extractJson<{ taste?: unknown; picks?: unknown }>(raw);
    if (!j || typeof j.taste !== 'string' || !Array.isArray(j.picks)) return null;
    const picks = (j.picks as Array<Record<string, unknown>>)
      .filter((p) => typeof p.title === 'string' && !!p.title)
      .slice(0, 5)
      .map((p) => {
        const rawKind = typeof p.kind === 'string' ? (KIND_FROM_LABEL[p.kind] ?? p.kind) : 'movie';
        const kind = (['movie', 'drama', 'book', 'game', 'show'].includes(rawKind as string) ? rawKind : 'movie') as TicketKind;
        return {
          kind,
          title: String(p.title),
          creator: typeof p.creator === 'string' ? p.creator : '',
          reason: typeof p.reason === 'string' ? p.reason : '',
        };
      });
    return picks.length ? { taste: j.taste, picks } : null;
  } catch {
    return null;
  }
}
