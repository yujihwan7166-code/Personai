/** TMDB(영화·드라마)·카카오 책 검색. 키 부재·네트워크 실패 시 [] — 호출부가 AI 폴백으로 넘어간다. */
import type { TicketKind } from './ticketStore';

export type MediaSource = 'TMDB' | 'KAKAO' | 'iTunes' | 'AI';
export interface MediaSearchResult {
  kind: TicketKind;
  title: string;
  creator: string;
  year?: number;
  posterUrl?: string;
  genres?: string[];
  source?: MediaSource;
}

let tmdbKey = import.meta.env.VITE_TMDB_KEY as string | undefined;
let kakaoKey = import.meta.env.VITE_KAKAO_KEY as string | undefined;
/** 테스트 전용 — 프로덕션 코드에서 호출 금지. */
export function __setKeysForTest(tmdb: string | undefined, kakao: string | undefined): void {
  tmdbKey = tmdb; kakaoKey = kakao;
}

/** movie/drama → TMDB, book → 카카오 (트렌딩 등 키 필요 경로 판정). */
export function hasApiFor(kind: TicketKind): boolean {
  if (kind === 'movie' || kind === 'drama') return !!tmdbKey;
  if (kind === 'book') return !!kakaoKey;
  return false;
}

/** 검색·포스터가 가능한가 — 영화·드라마·책은 키 없어도 iTunes(무료·무키)로 가능. game/show 는 AI. */
export function canSearch(kind: TicketKind): boolean {
  return kind === 'movie' || kind === 'drama' || kind === 'book';
}

/** iTunes 검색 API — 키·가입 불필요(애플 공개). 영화·드라마·책 표지 확보용. */
async function itunesSearch(kind: TicketKind, q: string): Promise<MediaSearchResult[]> {
  const media = kind === 'book' ? 'ebook' : kind === 'drama' ? 'tvShow' : 'movie';
  const entity = kind === 'movie' ? '&entity=movie' : kind === 'drama' ? '&entity=tvSeason' : '';
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=kr&media=${media}${entity}&limit=10`);
    if (!res.ok) return [];
    const data = await res.json() as { results?: Array<Record<string, unknown>> };
    return (data.results ?? []).map((r) => {
      const art = typeof r.artworkUrl100 === 'string' ? r.artworkUrl100.replace('100x100bb', '600x600bb') : undefined;
      const date = r.releaseDate as string | undefined;
      const title = String(r.trackName ?? r.collectionName ?? r.artistName ?? '');
      return {
        kind, source: 'iTunes',
        title,
        creator: kind === 'book' && typeof r.artistName === 'string' ? r.artistName : '',
        year: typeof date === 'string' ? Number(date.slice(0, 4)) || undefined : undefined,
        posterUrl: art,
        genres: typeof r.primaryGenreName === 'string' && r.primaryGenreName ? [r.primaryGenreName] : undefined,
      } as MediaSearchResult;
    }).filter((r) => r.title);
  } catch {
    return [];
  }
}

/** TMDB genre id → 한국어 (movie+tv 통합 공식 목록 고정 사본). */
const TMDB_GENRES: Record<number, string> = {
  28: '액션', 12: '모험', 16: '애니메이션', 35: '코미디', 80: '범죄', 99: '다큐멘터리',
  18: '드라마', 10751: '가족', 14: '판타지', 36: '역사', 27: '공포', 10402: '음악',
  9648: '미스터리', 10749: '로맨스', 878: 'SF', 10770: 'TV 영화', 53: '스릴러',
  10752: '전쟁', 37: '서부', 10759: '액션 어드벤처', 10762: '키즈', 10763: '뉴스',
  10764: '리얼리티', 10765: 'SF 판타지', 10766: '연속극', 10767: '토크', 10768: '정치',
};

export async function searchMedia(kind: TicketKind, query: string): Promise<MediaSearchResult[]> {
  const q = query.trim();
  if (!q || !canSearch(kind)) return [];
  // 키 없으면 iTunes(무키)로. 키 있으면 더 정확한 TMDB·카카오 사용.
  if ((kind === 'movie' || kind === 'drama') && !tmdbKey) return itunesSearch(kind, q);
  if (kind === 'book' && !kakaoKey) return itunesSearch(kind, q);
  try {
    if (kind === 'movie' || kind === 'drama') {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&language=ko-KR&query=${encodeURIComponent(q)}`,
      );
      if (!res.ok) return [];
      const data = await res.json() as { results?: Array<Record<string, unknown>> };
      return (data.results ?? [])
        .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
        .slice(0, 8)
        .map((r) => {
          const isMovie = r.media_type === 'movie';
          const date = (isMovie ? r.release_date : r.first_air_date) as string | undefined;
          return {
            kind: (isMovie ? 'movie' : 'drama') as TicketKind,
            source: 'TMDB' as MediaSource,
            title: String(isMovie ? r.title : r.name ?? ''),
            creator: '',   // TMDB multi 엔 감독 없음 — AI 보완 또는 수동
            year: date ? Number(date.slice(0, 4)) || undefined : undefined,
            posterUrl: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : undefined,
            genres: Array.isArray(r.genre_ids)
              ? (r.genre_ids as number[]).map((g) => TMDB_GENRES[g]).filter(Boolean)
              : undefined,
          };
        })
        .filter((r) => r.title);
    }
    // book — 카카오
    const res = await fetch(
      `https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(q)}&size=8`,
      { headers: { Authorization: `KakaoAK ${kakaoKey}` } },
    );
    if (!res.ok) return [];
    const data = await res.json() as { documents?: Array<Record<string, unknown>> };
    return (data.documents ?? []).map((d) => ({
      kind: 'book' as TicketKind,
      source: 'KAKAO' as MediaSource,
      title: String(d.title ?? ''),
      creator: Array.isArray(d.authors) ? (d.authors as string[]).join(', ') : '',
      year: typeof d.datetime === 'string' ? Number(d.datetime.slice(0, 4)) || undefined : undefined,
      posterUrl: typeof d.thumbnail === 'string' && d.thumbnail ? d.thumbnail : undefined,
    })).filter((r) => r.title);
  } catch {
    return [];
  }
}

/** 포스터 백필 — 제목으로 검색해 첫 결과의 표지 URL. 키 없어도 iTunes로 시도. */
export async function fetchPoster(kind: TicketKind, title: string): Promise<string | undefined> {
  if (!canSearch(kind)) return undefined;
  const rs = await searchMedia(kind, title);
  return rs.find((r) => r.posterUrl)?.posterUrl;
}

/** 탐색(둘러보기)용 인기·트렌딩 — 영화·드라마만 TMDB 주간 트렌딩. 책·게임·공연은 트렌딩 API가 없어 []. */
export async function trendingMedia(kind: TicketKind): Promise<MediaSearchResult[]> {
  if (!((kind === 'movie' || kind === 'drama') && tmdbKey)) return [];
  const type = kind === 'movie' ? 'movie' : 'tv';
  try {
    const res = await fetch(`https://api.themoviedb.org/3/trending/${type}/week?api_key=${tmdbKey}&language=ko-KR`);
    if (!res.ok) return [];
    const data = await res.json() as { results?: Array<Record<string, unknown>> };
    return (data.results ?? []).slice(0, 20).map((r) => {
      const date = (kind === 'movie' ? r.release_date : r.first_air_date) as string | undefined;
      return {
        kind,
        title: String(kind === 'movie' ? r.title : r.name ?? ''),
        creator: '',
        year: date ? Number(date.slice(0, 4)) || undefined : undefined,
        posterUrl: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : undefined,
        genres: Array.isArray(r.genre_ids) ? (r.genre_ids as number[]).map((g) => TMDB_GENRES[g]).filter(Boolean) : undefined,
      } as MediaSearchResult;
    }).filter((r) => r.title);
  } catch {
    return [];
  }
}
