/**
 * 티켓북 공용 비주얼 — 그라데·시리얼·날짜 포맷·별점 미터·시드·모션 CSS.
 * 두 HTML 시안(1·2번)의 룩을 재현. 색은 인라인, 포인트색은 var(--tk-accent).
 */
import type { CSSProperties } from 'react';
import { toDateKey } from '@/lib/planner/habitStats';
import { KIND_LABEL, type TicketEntry, type TicketKind } from '@/lib/tickets/ticketStore';

/** 오늘 로컬 YMD. */
export const todayKeyLocal = (): string => toDateKey(new Date());

export const KIND_EMOJI: Record<TicketKind, string> = {
  movie: '🎬', drama: '📺', book: '📚', game: '🎮', show: '🎭',
};

/** 카테고리별 "어디서 봤어요" 프리셋 칩 — 필요하면 "직접 추가"로 확장. */
export const PLACES: Record<TicketKind, string[]> = {
  movie: ['극장', '넷플릭스', '티빙', '디즈니+', '왓챠', '쿠팡플레이', '웨이브', '애플TV+', '집'],
  drama: ['넷플릭스', '티빙', '디즈니+', '웨이브', '왓챠', '쿠팡플레이', '애플TV+', '본방/TV'],
  book: ['종이책', '전자책', '오디오북', '도서관', '밀리의 서재', '리디'],
  game: ['PC(스팀)', '플레이스테이션', '닌텐도 스위치', 'Xbox', '모바일', '스팀덱', 'VR'],
  show: ['대극장', '소극장', '콘서트홀', '아레나', '야외무대', '온라인 중계'],
};

/** 카테고리별 장르 프리셋 칩 — 여러 개 선택 가능, "직접 추가"로 확장. */
export const GENRES: Record<TicketKind, string[]> = {
  movie: ['액션', '드라마', '코미디', '스릴러', '공포', 'SF', '판타지', '로맨스', '애니메이션', '다큐멘터리', '범죄', '미스터리', '전쟁', '뮤지컬', '느와르'],
  drama: ['드라마', '로맨스', '스릴러', '코미디', 'SF', '판타지', '범죄/수사', '의학', '사극', '청춘', '미스터리', '블랙코미디', '액션', '가족'],
  book: ['소설', '에세이', '시', '자기계발', '인문', '사회', '과학', '역사', '경제/경영', 'SF', '판타지', '추리', '예술', '만화'],
  game: ['RPG', '액션', '어드벤처', 'FPS', '시뮬레이션', '전략', '퍼즐', '인디', '스포츠', '레이싱', '호러', '리듬', '오픈월드', '로그라이크', '비주얼노벨'],
  show: ['뮤지컬', '연극', '콘서트', '클래식', '오페라', '발레', '무용', '국악', '재즈', '스탠드업', '전시'],
};

export const DEFAULT_GENRE: Record<TicketKind, string> = {
  movie: '드라마', drama: '드라마', book: '소설', game: '어드벤처', show: '공연',
};

/* 제목 해시 → 안정적 그라데(포스터 없는 항목의 크림/커버 색). */
const PALS: [string, string, string][] = [
  ['#243356', '#101B36', '#9DB9F2'], ['#42243A', '#1E1020', '#F2A9BE'],
  ['#17404A', '#0A2029', '#8FE0D6'], ['#4A3717', '#26190A', '#F2C77F'],
  ['#332552', '#170F2E', '#C3ABF7'], ['#124030', '#08211A', '#8FE0AD'],
  ['#473222', '#241608', '#EBB48D'], ['#2A3540', '#141C24', '#B3C9DB'],
];
function hash(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
export function palFor(title: string): [string, string, string] {
  return PALS[hash(title) % PALS.length];
}
export function gradientFor(title: string): string {
  const p = palFor(title);
  return `radial-gradient(130% 90% at 18% 0%, rgba(255,255,255,.15), transparent 55%), linear-gradient(160deg, ${p[0]}, ${p[1]})`;
}

/* ── 날짜 (전부 로컬 YMD 기준) ── */
export const fmtDot = (ymd: string): string => (ymd || '').replace(/-/g, '.');
export const fmtShort = (ymd: string): string => (ymd || '').slice(2).replace(/-/g, '.');
const WD = ['일', '월', '화', '수', '목', '금', '토'];
export function weekdayKo(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '';
  const d = new Date(`${ymd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '' : `${WD[d.getDay()]}요일`;
}

/** 연대순 일련번호 NO.0007 — 관람일→생성순. */
export function serialOf(entries: TicketEntry[], id: string): string {
  const sorted = [...entries].sort((a, b) => (a.watchedAt === b.watchedAt
    ? a.createdAt - b.createdAt : a.watchedAt < b.watchedAt ? -1 : 1));
  const i = sorted.findIndex((e) => e.id === id);
  return `NO.${String(i + 1).padStart(4, '0')}`;
}

/* ── 별점 미터(모노 별, 앰버 채움 %) ── */
export function StarMeter({ rating, size = 15, letter = 2 }: { rating: number; size?: number; letter?: number }) {
  const pct = `${Math.max(0, Math.min(5, rating)) / 5 * 100}%`;
  const base: CSSProperties = {
    fontSize: size, lineHeight: 1, letterSpacing: letter,
    fontFamily: 'var(--tk-mono)', whiteSpace: 'nowrap',
  };
  return (
    <span style={{ position: 'relative', display: 'inline-block', ...base }}>
      <span style={{ color: '#39465a' }}>★★★★★</span>
      <span style={{ position: 'absolute', left: 0, top: 0, color: 'var(--tk-accent)', overflow: 'hidden', width: pct, ...base }}>★★★★★</span>
    </span>
  );
}

/** 별점 → 글리프 (상세 스탬프용) ★★★★☆. */
export const starGlyph = (r: number): string => '★★★★★'.slice(0, Math.round(r)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(r));

/* ── 시드 (첫 방문 데모 — 실제 포스터 없이 크림 티켓으로) ── */
type SeedRow = [TicketKind, string, string, number, string, number, string, string, string, string?, string?];
const SEED_ROWS: SeedRow[] = [
  ['movie', '컨택트', '드니 빌뇌브', 2016, 'SF', 4, '2026-07-12', '티빙', '언어가 시간을 바꾼다는 상상. 두 번째 보니 처음과 완전히 다른 영화였다.'],
  ['drama', '스즈메의 문단속', '신카이 마코토', 2022, '판타지', 3, '2026-07-04', '넷플릭스', '문을 닫는 이야기인데 자꾸 열어보고 싶어진다.'],
  ['book', '물고기는 존재하지 않는다', '룰루 밀러', 2021, '에세이', 5, '2026-06-07', '종이책', '과학책인 줄 알고 펼쳤다가 인생책으로 덮었다.', '혼돈은 언제나 이긴다.'],
  ['game', '발더스 게이트 3', '라리안 스튜디오', 2023, 'RPG', 5, '2026-06-21', 'PC', '112시간. 내 선택이 전부 어딘가에 기록되고 있었다.'],
  ['movie', '퍼펙트 데이즈', '빔 벤더스', 2023, '드라마', 4, '2026-05-24', '왓챠', '나무 그림자만 두 시간 봐도 좋을 수 있구나.'],
  ['book', '삼체', '류츠신', 2013, 'SF', 4, '2026-04-30', '전자책', '물리학이 무너지는 공포. 이틀 만에 완독.'],
  ['drama', '폭싹 속았수다', '임상춘', 2025, '드라마', 5, '2026-03-28', '넷플릭스', '봄마다 꺼내 볼 것 같다.', '살암시민 살아진다.', '대단한 사건 없이도 한 사람의 일생이 이렇게 벅찰 수 있다니.'],
  ['drama', '세브란스: 단절', '댄 에릭슨', 2025, 'SF', 5, '2026-02-08', '애플TV+', '출근하는 나와 퇴근하는 나, 사실 남남이었다.'],
  ['movie', '콘클라베', '에드워드 버거', 2024, '스릴러', 4, '2026-01-17', '극장', '회의실 스릴러의 정점.'],
  ['movie', '그랜드 부다페스트 호텔', '웨스 앤더슨', 2014, '코미디', 4, '2025-12-27', '넷플릭스', '분홍색 케이크 상자 같은 영화.'],
  ['show', '뮤지컬 위키드', '스티븐 슈워츠', 2024, '뮤지컬', 4, '2025-10-03', '대극장', 'Defying Gravity에서 진짜 숨 참았다.'],
  ['movie', '아가씨', '박찬욱', 2016, '스릴러', 5, '2025-09-14', '왓챠', '세 번 접히는 이야기.'],
  ['game', '젤다의 전설: 왕국의 눈물', '닌텐도', 2023, '어드벤처', 5, '2025-08-30', '콘솔', '조합의 자유가 곧 서사.'],
  ['movie', '헤어질 결심', '박찬욱', 2022, '스릴러', 5, '2025-07-26', '왓챠', '안개 같은 영화. 미결로 남아서 완성됐다.', '나는요, 완전히 붕괴됐어요.'],
  ['book', '불편한 편의점', '김호연', 2021, '소설', 3, '2025-06-11', '전자책', '착한 이야기가 필요한 날 먹는 죽 같은 소설.'],
  ['drama', '더 베어', '크리스토퍼 스토러', 2022, '드라마', 4, '2025-05-18', '디즈니+', '주방 소음이 이렇게 아름다울 일인가.'],
  ['movie', '인터스텔라', '크리스토퍼 놀런', 2014, 'SF', 5, '2025-04-05', '극장', '재개봉 IMAX. 도킹 장면에서 주먹 쥠.', '우리는 답을 찾을 것이다. 늘 그랬듯이.'],
  ['book', '아몬드', '손원평', 2017, '소설', 4, '2025-03-02', '종이책', '감정을 배우는 아이의 성장기.'],
  ['drama', '나의 해방일지', '박해영', 2022, '드라마', 5, '2025-02-14', '넷플릭스', '조용한데 제일 시끄러운 드라마.', '나를 추앙해요.'],
  ['movie', '기생충', '봉준호', 2019, '스릴러', 5, '2025-01-10', '극장', '계단의 영화. 볼 때마다 새 디테일이 나온다.'],
  ['movie', '올드보이', '박찬욱', 2003, '스릴러', 4, '2024-12-08', '극장', '리마스터 재개봉. 여전히 숨을 못 쉬겠다.'],
];

export function seedEntries(): TicketEntry[] {
  return SEED_ROWS.map((r, i) => {
    const [kind, title, creator, year, genre, rating, watchedAt, where, oneLiner, quote, longNote] = r;
    const e: TicketEntry = {
      id: `seed_${i}`, kind, title, creator, year, rating, watchedAt, where, oneLiner,
      genres: [genre], rewatch: false, createdAt: 1_700_000_000_000 + i,
    };
    if (quote) e.quotes = [quote];
    if (longNote) e.longNote = longNote;
    return e;
  });
}

export const catLabel = (k: TicketKind): string => KIND_LABEL[k];

/* ── 모션·스크롤바 CSS (Wiki.tsx 처럼 페이지 <style> 로 주입) ── */
export const TICKETS_CSS = `
.tk-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
.tk-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.14); border-radius: 8px; border: 2px solid transparent; background-clip: content-box; }
.tk-scroll::-webkit-scrollbar-track { background: transparent; }
@keyframes tk-fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes tk-fadeUp { from { opacity: 0; transform: translateY(14px) scale(.985) } to { opacity: 1; transform: none } }
@keyframes tk-ticketIn { from { transform: translateY(20px) scale(.97); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }
@keyframes tk-slideInRight { from { transform: translateX(34px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
@keyframes tk-popIn { from { transform: scale(.94); opacity: 0 } to { transform: scale(1); opacity: 1 } }
@keyframes tk-stampIn { 0% { transform: rotate(-13deg) scale(2.2); opacity: 0 } 60% { opacity: 1 } 100% { transform: rotate(-13deg) scale(1); opacity: 1 } }
@keyframes tk-toastIn { from { transform: translate(-50%,18px); opacity: 0 } to { transform: translate(-50%,0); opacity: 1 } }
@keyframes tk-spin { to { transform: rotate(360deg) } }
@keyframes tk-blink { 0%,100% { opacity: .2 } 50% { opacity: 1 } }
.tk-card { transition: transform .16s ease }
.tk-card:hover { transform: translateY(-5px) }
.tk-card .tk-hover { opacity: 0; transition: opacity .18s ease }
.tk-card:hover .tk-hover { opacity: 1 }
.tk-press:active { transform: scale(.98) }
.tk-lift { transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease }
`;
