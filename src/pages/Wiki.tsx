/**
 * 마이위키 (/wiki) — v4 "서재와 책들", 사용자 시안 「마이위키 서재.dc.html」 그대로 이식.
 *
 * 시안 문법: 크림 종이(#f4eee1) 위 월넛 나무 책장, Noto Serif KR 제목, 그린 링크(#305f4c),
 * 러스트 강조(#9a4632). 사이드바 없는 스티키 헤더 레이아웃, Esc 로 문서→책→서재 후진.
 * 화면 3장: 서재 홈(책장+고정+언급 순위+최근) / 책 펼침(표지+차례 스프레드) / 문서 읽기(목차|본문|인포박스 3열).
 * 기능은 전부 실물: Plate 편집·읽기, 드래그 링크, 인포박스 편집, 백링크 문맥 발췌, mywiki.v4.
 */
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Pin, Plus, Search, Star, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { newId } from '@/lib/idGenerator';
import type { Value } from 'platejs';
import {
  loadWiki, saveWiki, seedIfEmpty, emptyBody, linkedDocIds, bodyText, backlinkExcerpt, BOOK_PALETTE,
  type WikiBook, type WikiDoc, type WikiStore, type InfoboxRow,
} from '@/lib/wiki3/store';
import { childrenOf, ancestorsOf, focusView, moveOptions, deleteWithPromotion, isDescendant } from '@/lib/wiki3/tree';
import type { WikiEditorApi } from '@/components/wiki3/WikiDocEditor';

const WikiDocEditor = lazy(() => import('@/components/wiki3/WikiDocEditor').then((m) => ({ default: m.WikiDocEditor })));
const WikiDocReader = lazy(() => import('@/components/wiki3/WikiDocReader').then((m) => ({ default: m.WikiDocReader })));

/* 시안 팔레트 — 그대로 */
const C = {
  bg: '#f4eee1', paper: '#fdfaf2', ink: '#292217', body: '#332c21',
  sub: '#7d7260', muted: '#a0937d',
  line: 'rgba(60,47,24,.14)', line2: 'rgba(60,47,24,.09)', lineDeep: 'rgba(60,47,24,.22)',
  green: '#305f4c', rust: '#9a4632', cream: '#f6ecd9',
};
const SERIF = "'Nanum Myeongjo', 'Noto Serif KR', 'Gowun Batang', serif";
const SANS = "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif";

const WIKI_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&family=Noto+Serif+KR:wght@400;600;700&display=swap');
.wiki-theme ::selection { background:#e9d9ac; }
.wiki-theme a[href^="wiki://"] {
  color:#305f4c; font-weight:600; text-decoration:none;
  border-bottom:1px solid rgba(48,95,76,.4);
}
.wiki-theme a[href^="wiki://"]:hover { color:#1f4636; border-bottom-color:#1f4636; }
.wiki-theme .wiki-spine { transition: transform .22s ease, box-shadow .22s ease, filter .22s ease; }
.wiki-theme .wiki-spine:hover {
  transform: translateY(-10px) !important;
  box-shadow: 0 26px 34px -12px rgba(20,11,3,.65), inset 0 -4px 7px rgba(0,0,0,.28) !important;
  filter: brightness(1.08);
}
@keyframes wikiPageOpen { from { transform: perspective(1400px) rotateY(-24deg); opacity:.35; } to { transform: perspective(1400px) rotateY(0deg); opacity:1; } }
@keyframes wikiRiseIn { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }
.wiki-theme .wiki-rise { animation: wikiRiseIn .4s ease both; }
.wiki-theme .wiki-page { transform-origin: left center; animation: wikiPageOpen .55s cubic-bezier(.2,.7,.2,1) both; }
/* 괘종시계 진자 — 3초에 한 번, 눈에 걸리지 않을 만큼만 */
@keyframes wikiSwing { from { transform: rotate(-7deg); } to { transform: rotate(7deg); } }
.wiki-theme .wiki-pendulum { transform-origin: 31px 72px; animation: wikiSwing 3s ease-in-out infinite alternate; }

/* 차례 — 끌어서 하위 문서로 넣기.
   원본은 흐려지고, 품을 문서만 밝아지며, 그 아래 '들어갈 자리'가 열린다. */
.wiki-theme .wiki-row { transition: background-color .16s ease, opacity .16s ease, transform .18s cubic-bezier(.2,.7,.2,1); }
.wiki-theme .wiki-row:hover { background: rgba(60,47,24,.05); }
.wiki-theme .wiki-row-drag { opacity:.38; }
.wiki-theme .wiki-row-drop { background: rgba(48,95,76,.1); box-shadow: inset 0 0 0 1px rgba(48,95,76,.34); transform: translateX(3px); }
.wiki-theme .wiki-slot { height:0; opacity:0; border-radius:3px; background:rgba(48,95,76,.14); border-left:2px solid #305f4c; animation: wikiSlotIn .18s cubic-bezier(.2,.7,.2,1) forwards; }
@keyframes wikiSlotIn { to { height:22px; opacity:1; } }
.wiki-theme .wiki-root-drop { animation: wikiRootIn .18s ease-out both; }
@keyframes wikiRootIn { from { opacity:0; transform: translateY(-5px); } to { opacity:1; transform:none; } }
.wiki-theme .wiki-row-moved { animation: wikiMoved .9s ease-out; }
@keyframes wikiMoved { from { background: rgba(48,95,76,.24); } to { background: transparent; } }

@media (prefers-reduced-motion: reduce) {
  .wiki-theme .wiki-spine, .wiki-theme .wiki-spine:hover { transition:none; transform:none !important; }
  .wiki-theme .wiki-rise, .wiki-theme .wiki-page { animation:none; }
  .wiki-theme .wiki-pendulum { animation:none; }
  .wiki-theme .wiki-row { transition:none; }
  .wiki-theme .wiki-row-drop { transform:none; }
  .wiki-theme .wiki-slot { height:22px; opacity:1; animation:none; }
  .wiki-theme .wiki-root-drop, .wiki-theme .wiki-row-moved { animation:none; }
}
/* 읽기 뷰 본문 — 시안의 위키 타이포 */
.wiki-theme .wiki-read h1, .wiki-theme .wiki-read h2, .wiki-theme .wiki-read h3 { scroll-margin-top: 18px; }
.wiki-theme .wiki-read h1, .wiki-theme .wiki-read h2 {
  font-family:'Nanum Myeongjo','Noto Serif KR','Gowun Batang',serif; font-weight:700;
  border-bottom:1px solid rgba(60,47,24,.14); padding-bottom:8px;
}
.wiki-theme .wiki-read h3 { font-family:'Nanum Myeongjo','Noto Serif KR','Gowun Batang',serif; font-weight:700; }
.wiki-theme .wiki-read p { color:#332c21; }
.wiki-theme .wiki-read blockquote { border-left-color: rgba(154,70,50,.45); }
`;

/** 본문 최상위 블록에서 목차 추출 — h1~h3. */
function tocOf(body: Value): { level: number; text: string }[] {
  const out: { level: number; text: string }[] = [];
  for (const node of body as Array<{ type?: string; children?: Array<{ text?: string }> }>) {
    if (node.type === 'h1' || node.type === 'h2' || node.type === 'h3') {
      const text = (node.children ?? []).map((c) => c.text ?? '').join('').trim();
      if (text) out.push({ level: Number(node.type.slice(1)), text });
    }
  }
  return out;
}

/** lg(1024px) 이상 여부 — 문서 뷰에서 데스크톱/모바일 중 한쪽만 마운트하기 위해.
 *  둘 다 마운트하면(CSS 숨김) 같은 body 노드를 두 Plate 인스턴스가 공유해
 *  Slate 경로 맵이 깨진다 ("Unable to find the path for Slate node"). */
function useIsWide() {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setWide(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return wide;
}

const fmtRel = (ts: number) => {
  const d = Date.now() - ts, m = 60000, h = 3600000, day = 86400000;
  if (d < m) return '방금 전';
  if (d < h) return `${Math.floor(d / m)}분 전`;
  if (d < day) return `${Math.floor(d / h)}시간 전`;
  if (d < 7 * day) return `${Math.floor(d / day)}일 전`;
  const dt = new Date(ts);
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일`;
};
const fmtDate = (ts: number) => { const d = new Date(ts); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
const fmtShort = (ts: number) => { const d = new Date(ts); return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`; };

/** 서가 소품 — 책이 적을 때 빈 칸을 지키는 정물(꽃병). 책이 차면 자리를 내준다. */
function ShelfProp({ kind }: { kind: 'vase' }) {
  const sh = { filter: 'drop-shadow(0 10px 10px rgba(10,5,0,.4))' } as const;
  if (kind === 'vase') {
    return (
      <svg aria-hidden width="66" height="128" viewBox="0 0 66 128" style={sh}>
        <path d="M33 62 C33 40 30 28 27 16" stroke="#4a5d3a" strokeWidth="2.4" fill="none" />
        <path d="M33 62 C33 44 40 32 46 22" stroke="#55694a" strokeWidth="2.2" fill="none" />
        <path d="M33 62 C33 48 26 40 18 34" stroke="#43563b" strokeWidth="2" fill="none" />
        <ellipse cx="26" cy="14" rx="6.5" ry="8" fill="#9a4632" />
        <ellipse cx="47" cy="20" rx="5.5" ry="7" fill="#b98a2e" />
        <ellipse cx="16" cy="32" rx="5" ry="6" fill="#6d4457" />
        <path d="M20 62 h26 l3 14 c1.5 8 3 14 3 22 a19 12 0 0 1 -38 0 c0-8 1.5-14 3-22 z" fill="#a2603a" />
        <path d="M20 62 h26 l1.2 6 H18.8 z" fill="#8a4f2e" />
        <ellipse cx="33" cy="120" rx="19" ry="6" fill="#7c4425" />
      </svg>
    );
  }
  return null;
}
const SHELF_PROPS: Array<'vase'> = ['vase'];

/** 괘종시계 — 옛날 서재의 길쭉한 상주 정물. 진짜 시간이 흐르고(30초 갱신)
 *  유리문 안 진자가 3초 주기로 천천히 흔들린다 (reduced-motion 이면 멈춘 채). */
function PendulumClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(t);
  }, []);
  const ha = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5;
  const ma = now.getMinutes() * 6;
  return (
    <svg aria-hidden width="62" height="206" viewBox="0 0 62 206" style={{ filter: 'drop-shadow(0 10px 11px rgba(10,5,0,.45))' }}>
      {/* 받침 */}
      <rect x="4" y="192" width="54" height="12" rx="2.5" fill="#5c3414" />
      <rect x="7" y="186" width="48" height="8" rx="2" fill="#7c4425" />
      {/* 케이스 — 아치형 후드 + 긴 몸통 */}
      <path d="M31 2 C46 2 55 13 55 26 V188 H7 V26 C7 13 16 2 31 2 z" fill="#6d3f1c" />
      <path d="M31 5 C44 5 52 15 52 27 V184 H10 V27 C10 15 18 5 31 5 z" fill="#7c4a24" />
      <rect x="10" y="60" width="42" height="2" fill="#5c3414" opacity=".7" />
      {/* 문자반 */}
      <circle cx="31" cy="33" r="20" fill="#8a6a30" />
      <circle cx="31" cy="33" r="17" fill="#f6ecd9" />
      {[0, 90, 180, 270].map((a) => (
        <line key={a} x1="31" y1="19" x2="31" y2="23" stroke="#292217" strokeWidth="2" strokeLinecap="round" transform={`rotate(${a} 31 33)`} />
      ))}
      {[30, 60, 120, 150, 210, 240, 300, 330].map((a) => (
        <line key={a} x1="31" y1="19.5" x2="31" y2="22" stroke="#a0937d" strokeWidth="1.2" strokeLinecap="round" transform={`rotate(${a} 31 33)`} />
      ))}
      <line x1="31" y1="33" x2="31" y2="24" stroke="#292217" strokeWidth="2.6" strokeLinecap="round" transform={`rotate(${ha} 31 33)`} />
      <line x1="31" y1="33" x2="31" y2="20" stroke="#292217" strokeWidth="1.8" strokeLinecap="round" transform={`rotate(${ma} 31 33)`} />
      <circle cx="31" cy="33" r="2" fill="#9a4632" />
      {/* 유리문 — 안쪽 어둠 + 진자 */}
      <rect x="13" y="68" width="36" height="110" rx="3" fill="#2b1a0c" />
      <g className="wiki-pendulum">
        <line x1="31" y1="72" x2="31" y2="146" stroke="#b98a2e" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="31" cy="152" r="9.5" fill="#cfa84e" />
        <circle cx="31" cy="152" r="6" fill="#b98a2e" />
      </g>
      {/* 유리 반사 */}
      <path d="M17 72 L30 72 L20 174 L15 174 z" fill="rgba(246,236,217,.09)" />
      <rect x="13" y="68" width="36" height="110" rx="3" fill="none" stroke="#8a6a30" strokeWidth="2" />
    </svg>
  );
}

/** 책 칩 — 색 점 + 책 이름 (시안 공용 부호). */
function BookChip({ book }: { book?: WikiBook }) {
  if (!book) return null;
  return (
    <span className="inline-flex flex-none items-center gap-[5px] rounded-full border px-2 py-[2px]" style={{ borderColor: C.line, background: 'rgba(60,47,24,.03)' }}>
      <span className="h-[7px] w-[7px] rounded-full" style={{ background: book.tint }} />
      <span className="text-[10.5px]" style={{ color: C.sub }}>{book.title}</span>
    </span>
  );
}

export default function Wiki() {
  const [store, setStore] = useState<WikiStore>(() => seedIfEmpty(loadWiki()));
  const [bookId, setBookId] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [mode, setMode] = useState<'read' | 'edit'>('read');
  const [q, setQ] = useState('');
  const [picker, setPicker] = useState<{ text: string } | null>(null);
  const [bookDialog, setBookDialog] = useState<{ book: WikiBook | null } | null>(null);
  /* 차례에서 끌어 옮기기 — 끄는 문서 / 지금 겨눈 자리 / 방금 옮겨진 문서(잔상) */
  const [dragDoc, setDragDoc] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<string | 'root' | null>(null);
  const [justMoved, setJustMoved] = useState<string | null>(null);
  const editorApi = useRef<WikiEditorApi | null>(null);
  const readBodyRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const saveTimer = useRef<number | null>(null);

  const isWide = useIsWide();
  const { books, docs, recent } = store;
  const book = bookId ? books.find((b) => b.id === bookId) ?? null : null;
  const bookDocs = useMemo(() => (bookId ? docs.filter((d) => d.book === bookId) : []), [docs, bookId]);
  const active = docId ? docs.find((d) => d.id === docId) ?? null : null;
  const bookOf = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);

  useEffect(() => { saveWiki(store); }, [store]);

  /* Esc — 문서 → 책 → 서재 (시안 문법). 입력·에디터·다이얼로그 안에서는 무시 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const t = e.target as HTMLElement | null;
      if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.isContentEditable) return;
      if (picker || bookDialog) return;
      if (docId) { setDocId(null); setMode('read'); mainRef.current?.scrollTo(0, 0); }
      else if (bookId) { setBookId(null); mainRef.current?.scrollTo(0, 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [docId, bookId, picker, bookDialog]);

  const top = () => mainRef.current?.scrollTo(0, 0);

  /* ── 이동 ── */
  const goShelf = () => { setBookId(null); setDocId(null); setQ(''); top(); };
  const openBook = (id: string) => { setBookId(id); setDocId(null); setQ(''); top(); };
  const openDoc = (id: string, opts: { edit?: boolean } = {}) => {
    const d = docs.find((x) => x.id === id);
    if (!d) return;
    setBookId(d.book); setDocId(id); setMode(opts.edit ? 'edit' : 'read');
    setStore((s) => ({ ...s, recent: [id, ...s.recent.filter((r) => r !== id)].slice(0, 10) }));
    setQ(''); top();
  };

  /* ── 책 ── */
  const saveBook = (input: { id?: string; title: string; tint: string; intro: string }) => {
    if (input.id) {
      setStore((s) => ({ ...s, books: s.books.map((b) => (b.id === input.id ? { ...b, title: input.title, tint: input.tint, intro: input.intro, updated: Date.now() } : b)) }));
    } else {
      const b: WikiBook = { id: newId('bk'), title: input.title, tint: input.tint, intro: input.intro, updated: Date.now() };
      setStore((s) => ({ ...s, books: [...s.books, b] }));
      setBookId(b.id); setDocId(null);
    }
    setBookDialog(null);
  };
  const removeBook = (id: string) => {
    const b = books.find((x) => x.id === id);
    if (!b) return;
    const n = docs.filter((d) => d.book === id).length;
    if (!window.confirm(`『${b.title}』 책을 삭제할까요?${n ? `\n안에 있는 문서 ${n}개도 함께 사라져요.` : ''}`)) return;
    setStore((s) => ({
      ...s,
      books: s.books.filter((x) => x.id !== id),
      docs: s.docs.filter((d) => d.book !== id),
      recent: s.recent.filter((r) => docs.find((d) => d.id === r)?.book !== id),
    }));
    setBookDialog(null);
    goShelf();
  };

  /* ── 문서 ── */
  const createDoc = (parent: string | null, targetBookId?: string) => {
    const bid = targetBookId ?? bookId;
    if (!bid) return;
    const d: WikiDoc = { id: newId('wk'), book: bid, title: '', parent, tags: [], pinned: false, updated: Date.now(), body: emptyBody() };
    setStore((s) => ({ ...s, docs: [...s.docs, d], recent: [d.id, ...s.recent].slice(0, 10) }));
    setBookId(bid); setDocId(d.id); setMode('edit'); setQ(''); top();
    return d;
  };
  const patchDoc = (id: string, patch: Partial<WikiDoc>) =>
    setStore((s) => ({ ...s, docs: s.docs.map((d) => (d.id === id ? { ...d, ...patch, updated: Date.now() } : d)) }));
  const onBodyChange = (id: string, value: Value) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => patchDoc(id, { body: value }), 500);
  };
  const removeDoc = (id: string) => {
    const d = docs.find((x) => x.id === id);
    if (!d) return;
    const kids = childrenOf(bookDocs, id).length;
    if (!window.confirm(`"${d.title || '무제'}" 문서를 삭제할까요?${kids ? `\n(하위 문서 ${kids}개는 한 단계 위로 올라가요)` : ''}`)) return;
    setStore((s) => ({ ...s, docs: [...s.docs.filter((x) => x.book !== d.book), ...deleteWithPromotion(s.docs.filter((x) => x.book === d.book), id)], recent: s.recent.filter((r) => r !== id) }));
    if (d.parent) openDoc(d.parent); else setDocId(null);
  };

  /* ── 파생 ── */
  const crumbs = useMemo(() => (active ? ancestorsOf(bookDocs, active.id) : []), [bookDocs, active]);
  const kids = useMemo(() => (active ? childrenOf(bookDocs, active.id) : []), [bookDocs, active]);
  const backlinks = useMemo(
    () => (active ? docs.filter((d) => d.id !== active.id && linkedDocIds(d.body).includes(active.id)) : []),
    [docs, active],
  );
  const toc = useMemo(() => (active ? tocOf(active.body) : []), [active]);
  const pinnedAll = useMemo(() => docs.filter((d) => d.pinned).slice(0, 6), [docs]);
  const recentDocs = useMemo(
    () => recent.map((id) => docs.find((d) => d.id === id)).filter((d): d is WikiDoc => !!d).slice(0, 5),
    [recent, docs],
  );
  const linkTotal = useMemo(() => docs.reduce((a, d) => a + linkedDocIds(d.body).length, 0), [docs]);
  /* 지구본 — 서재 한 바퀴: 아무 문서나 펼치기 (위키의 "임의의 문서로") */
  const openRandom = () => {
    if (!docs.length) return;
    const pool = docs.length > 1 && docId ? docs.filter((d) => d.id !== docId) : docs;
    openDoc(pool[Math.floor(Math.random() * pool.length)].id);
  };
  const mostLinked = useMemo(() => {
    const count = new Map<string, number>();
    for (const d of docs) for (const id of linkedDocIds(d.body)) if (id !== d.id) count.set(id, (count.get(id) ?? 0) + 1);
    return [...count.entries()]
      .map(([id, n]) => ({ d: docs.find((x) => x.id === id), n }))
      .filter((x): x is { d: WikiDoc; n: number } => !!x.d)
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
  }, [docs]);
  /* 지금 책 바깥에서 이 책 안 문서로 들어오는 연결 수 */
  const inboundLinks = useMemo(() => {
    if (!bookId) return 0;
    const inside = new Set(bookDocs.map((d) => d.id));
    return docs
      .filter((d) => d.book !== bookId)
      .reduce((a, d) => a + linkedDocIds(d.body).filter((id) => inside.has(id)).length, 0);
  }, [docs, bookDocs, bookId]);

  /* 사이드바 차례 — 책 안에서는 포커스 트리(부모/형제/자식 3단), 문서 없으면 최상위 목록 */
  const sideRows = useMemo(() => {
    if (!bookId) return [] as { d: WikiDoc; depth: number }[];
    if (!docId) return childrenOf(bookDocs, null).map((d) => ({ d, depth: 0 }));
    const v = focusView(bookDocs, docId);
    const rows: { d: WikiDoc; depth: number }[] = [];
    if (v.parent) rows.push({ d: v.parent, depth: 0 });
    const base = v.parent ? 1 : 0;
    for (const s of v.siblings) {
      rows.push({ d: s, depth: base });
      if (s.id === docId) for (const c of v.children) rows.push({ d: c, depth: base + 1 });
    }
    return rows;
  }, [bookId, docId, bookDocs]);

  const qq = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!qq) return [];
    return docs
      .map((d) => ({ d, text: bodyText(d.body) }))
      .filter(({ d, text }) => d.title.toLowerCase().includes(qq) || text.toLowerCase().includes(qq) || d.tags.some((t) => t.toLowerCase().includes(qq)))
      .sort((a, b) => Number(b.d.title.toLowerCase().includes(qq)) - Number(a.d.title.toLowerCase().includes(qq)))
      .slice(0, 20);
  }, [docs, qq]);

  const scrollToHeading = (idx: number) => {
    const host = readBodyRef.current;
    if (!host) return;
    const el = host.querySelectorAll('h1, h2, h3')[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* 책등 치수 — 문서가 쌓일수록 두껍고 높아진다. 글자 크기는 제목 길이에 맞춰 자동 축소 */
  const spineOf = (b: WikiBook) => {
    const n = docs.filter((d) => d.book === b.id).length;
    const h = Math.min(368, 248 + n * 7);
    const title = b.title || '무제';
    const fs = Math.max(13, Math.min(21, Math.floor((h - 132) / Math.max(title.length, 1))));
    return { n, w: Math.min(100, Math.round(62 + n * 4)), h, fs, title };
  };
  const shelfBooks = books;
  const shelf1 = shelfBooks.slice(0, Math.min(4, shelfBooks.length));
  const shelf2 = shelfBooks.slice(4);

  const today = new Date();
  const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
  const statsLine = `${today.getMonth() + 1}월 ${today.getDate()}일 ${WEEK[today.getDay()]}요일 · 책 ${books.length}권 · 문서 ${docs.length}개 · 연결 ${linkTotal}개`;

  /* 양장본 책등 — 금박 이중 밴드, 제본 돌기(리지), 가죽 결, 또렷한 세리프 제목.
   * leanOn = 왼쪽 이웃 책의 높이. 주면 발이 오른쪽으로 미끄러지고 몸이 그 책에 기대 쉰다
   * (빈 서가에서 물리적으로 안정한 유일한 자세 — 반대로 기울면 받칠 게 없어 넘어진다). */
  const spine = (b: WikiBook, leanOn?: number) => {
    const s = spineOf(b);
    const btn = (
      <button
        key={b.id} type="button" onClick={() => openBook(b.id)} title={`${s.title} — 문서 ${s.n}개`}
        className="wiki-spine relative flex-none cursor-pointer"
        style={{
          width: s.w, height: s.h,
          background: `linear-gradient(180deg, color-mix(in srgb, ${b.tint} 88%, #fff) 0%, ${b.tint} 22%, ${b.tint} 78%, color-mix(in srgb, ${b.tint} 78%, #000) 100%)`,
          borderRadius: '4px 4px 3px 3px',
          boxShadow: '0 18px 26px -10px rgba(20,11,3,.62), inset 0 -5px 9px rgba(0,0,0,.3)',
        }}
      >
        {/* 가죽 결 + 좌 하이라이트/우 그림자 (책의 굴곡) */}
        <span aria-hidden className="pointer-events-none absolute inset-0" style={{ borderRadius: 'inherit', background: 'linear-gradient(90deg, rgba(255,246,228,.3), rgba(255,246,228,.06) 22%, rgba(0,0,0,0) 60%, rgba(0,0,0,.38)), repeating-linear-gradient(0deg, rgba(0,0,0,.045) 0 2px, rgba(255,255,255,.025) 2px 4px)' }} />
        {/* 제본 돌기 — 위·아래 리지 */}
        <span aria-hidden className="pointer-events-none absolute inset-x-[3px] top-[30px] h-[3px] rounded-full" style={{ background: 'linear-gradient(180deg, rgba(255,246,228,.28), rgba(0,0,0,.3))' }} />
        <span aria-hidden className="pointer-events-none absolute inset-x-[3px] bottom-[46px] h-[3px] rounded-full" style={{ background: 'linear-gradient(180deg, rgba(255,246,228,.28), rgba(0,0,0,.3))' }} />
        <span className="relative flex h-full flex-col items-center justify-between px-[7px] pb-[11px] pt-[12px]">
          {/* 금박 이중 밴드 */}
          <span aria-hidden className="h-[7px] w-[62%] flex-none" style={{ borderTop: '2px solid rgba(233,205,140,.9)', borderBottom: '1px solid rgba(233,205,140,.55)' }} />
          <span
            className="min-h-0 max-h-full overflow-hidden whitespace-nowrap [writing-mode:vertical-rl]"
            style={{ fontFamily: SERIF, fontWeight: 700, fontSize: s.fs - 1, letterSpacing: '.2em', lineHeight: 1.15, textOverflow: 'ellipsis', color: '#fbf3e2', textShadow: '0 1px 0 rgba(0,0,0,.5), 0 2px 5px rgba(0,0,0,.3)' }}
          >
            {s.title}
          </span>
          <span className="flex h-[28px] w-[28px] flex-none items-center justify-center rounded-full text-[12px] font-bold" style={{ border: '1.5px solid rgba(233,205,140,.75)', color: '#fbf3e2', textShadow: '0 1px 1px rgba(0,0,0,.4)' }}>
            {s.n}
          </span>
        </span>
      </button>
    );
    if (!leanOn) return btn;
    /* 접점 = 이웃 책의 윗모서리. 발이 그만큼(이웃 높이 × sinθ) 오른쪽으로 밀려나야
       기울인 책의 옆면이 정확히 그 모서리에 닿는다. 선반의 flex 간격 9px 은 빼준다. */
    const deg = 9;
    const foot = Math.round(leanOn * Math.sin((deg * Math.PI) / 180)) - 9;
    return (
      <div key={b.id} className="flex-none" style={{ marginLeft: foot, transform: `rotate(-${deg}deg)`, transformOrigin: 'bottom left' }}>
        {btn}
      </div>
    );
  };
  /* 끌어 옮기기 규칙 — 자기 자신·자기 자손에게는 넣을 수 없고(순환), 이미 그 자리면 무반응 */
  const canDropOn = (target: string | null) => {
    if (!dragDoc) return false;
    if (target === dragDoc) return false;
    if (target && isDescendant(bookDocs, target, dragDoc)) return false;
    return (docs.find((d) => d.id === dragDoc)?.parent ?? null) !== target;
  };
  const dropOn = (target: string | null) => {
    const id = dragDoc;
    setDragDoc(null);
    setDropAt(null);
    if (!id || !canDropOn(target)) return;
    patchDoc(id, { parent: target });
    setJustMoved(id); // 옮겨진 문서가 어디로 갔는지 잠깐 빛난다
    window.setTimeout(() => setJustMoved((v) => (v === id ? null : v)), 900);
  };

  /* 줄의 마지막 책만, 그 줄이 꽉 차지 않았고 기댈 이웃이 있을 때 기운다 (이웃 높이를 넘겨준다) */
  const leanOnOf = (row: WikiBook[], i: number) =>
    i === row.length - 1 && row.length >= 2 && row.length < 4 ? spineOf(row[i - 1]).h : undefined;

  const shelfBar = <div aria-hidden style={{ height: 15, borderRadius: 3, background: 'linear-gradient(180deg,#a26c3e,#79491f)', boxShadow: '0 7px 13px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,235,200,.35)' }} />;

  return (
    <div className="wiki-theme flex h-dvh overflow-hidden" style={{ background: C.bg, fontFamily: SANS, color: C.ink }}>
      <style>{WIKI_CSS}</style>

      {/* ══════ 사이드바 — 크림 톤 (캐논 구조 + 시안 재질) ══════ */}
      <aside className="hidden w-[264px] flex-none flex-col overflow-y-auto lg:flex" style={{ background: '#efe7d3', borderRight: '1px solid rgba(60,47,24,.14)' }}>
        <div className="px-5 pb-4 pt-6">
          <button type="button" onClick={goShelf} className="block text-left">
            <div style={{ fontSize: 10.5, letterSpacing: '.26em', color: C.muted }}>MYWIKI</div>
            <div className="mt-1" style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 23 }}>마이위키</div>
            <div className="mt-0.5" style={{ fontSize: 12, color: C.sub }}>나만의 서재</div>
          </button>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: C.muted }} />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="서재에서 검색" aria-label="서재 검색"
              className="h-[34px] w-full rounded-lg pl-8 pr-7 text-[13px] outline-none"
              style={{ border: '1px solid rgba(60,47,24,.16)', background: C.paper, color: C.ink, fontFamily: SANS }}
            />
            {q && (
              <button type="button" aria-label="검색 지우기" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: C.muted }}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => (book ? createDoc(null) : setBookDialog({ book: null }))}
            className="mt-3 flex h-[36px] w-full items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition-colors hover:bg-[#40372a]"
            style={{ background: C.ink, color: C.bg }}
          >
            <Plus className="h-3.5 w-3.5" />
            {book ? '새 문서' : '새 책'}
          </button>
        </div>

        {active && book ? (
          /* 문서 모드 — 지금 책의 차례. (책 펼침 화면은 가운데가 이미 차례라 여기선 책 목록을 보여준다) */
          <div className="flex-1 px-3 pb-4">
            <button type="button" onClick={goShelf} className="mx-2 mb-2 text-[12px] hover:underline" style={{ color: C.green }}>← 책장으로</button>
            <button
              type="button" onClick={() => openBook(book.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[rgba(60,47,24,.05)]"
            >
              <span className="h-[26px] w-[9px] flex-none rounded-[2px]" style={{ background: book.tint, boxShadow: 'inset -2px 0 3px rgba(0,0,0,.25)' }} />
              <span className="min-w-0">
                <span className="block truncate" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 15 }}>{book.title}</span>
                <span className="block" style={{ fontSize: 11, color: C.sub }}>문서 {bookDocs.length}개</span>
              </span>
            </button>
            <div className="mx-2 mb-1.5 mt-3" style={{ fontSize: 10.5, letterSpacing: '.14em', color: C.muted }}>차례</div>
            {sideRows.map(({ d, depth }) => {
              const on = d.id === docId;
              return (
                <button
                  key={d.id} type="button" onClick={() => openDoc(d.id)}
                  className={cn('flex w-full items-center gap-1.5 rounded-full py-[7px] pr-3 text-left transition-colors', !on && 'hover:bg-[rgba(60,47,24,.06)]')}
                  style={{ paddingLeft: 12 + depth * 14, background: on ? C.ink : undefined, color: on ? C.bg : C.body, fontSize: 13, fontWeight: on ? 600 : 400 }}
                >
                  <span className="truncate">{d.title || '무제'}</span>
                  {d.pinned && <Star className="h-3 w-3 flex-none fill-amber-400 text-amber-400" />}
                </button>
              );
            })}
            {sideRows.length === 0 && <p className="mx-2 py-2 text-[12px]" style={{ color: C.muted }}>아직 빈 책이에요</p>}
          </div>
        ) : (
          /* 서재·책 펼침 모드 — 서재의 책 목록 (지금 펼친 책은 채움 알약으로) */
          <div className="flex-1 px-3 pb-4">
            <div className="mx-2 mb-1.5" style={{ fontSize: 10.5, letterSpacing: '.14em', color: C.muted }}>책</div>
            {books.map((b) => {
              const on = b.id === bookId;
              return (
                <button
                  key={b.id} type="button" onClick={() => openBook(b.id)}
                  className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors', !on && 'hover:bg-[rgba(60,47,24,.06)]')}
                  style={{ background: on ? C.ink : undefined, color: on ? C.bg : undefined }}
                >
                  <span className="h-[22px] w-[8px] flex-none rounded-[2px]" style={{ background: b.tint, boxShadow: 'inset -2px 0 3px rgba(0,0,0,.25)' }} />
                  <span className="min-w-0 flex-1 truncate" style={{ fontSize: 13.5, fontWeight: on ? 700 : 500 }}>{b.title}</span>
                  <span style={{ fontSize: 11.5, color: on ? 'rgba(244,238,225,.7)' : C.muted }}>{docs.filter((d) => d.book === b.id).length}</span>
                </button>
              );
            })}
            {books.length === 0 && <p className="mx-2 py-2 text-[12px]" style={{ color: C.muted }}>첫 책을 만들어보세요</p>}
            {recentDocs.length > 0 && (
              <>
                <div className="mx-2 mb-1.5 mt-5" style={{ fontSize: 10.5, letterSpacing: '.14em', color: C.muted }}>최근 본 문서</div>
                {recentDocs.map((d) => (
                  <button key={d.id} type="button" onClick={() => openDoc(d.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-[7px] text-left transition-colors hover:bg-[rgba(60,47,24,.06)]">
                    <span className="h-[6px] w-[6px] flex-none rounded-full" style={{ background: bookOf.get(d.book)?.tint ?? C.rust }} />
                    <span className="min-w-0 flex-1 truncate" style={{ fontSize: 13, color: C.body }}>{d.title || '무제'}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(60,47,24,.1)', fontSize: 11.5, color: C.muted }}>
          책 {books.length}권 · 문서 {docs.length}개 · 연결 {linkTotal}개
        </div>
      </aside>

      <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto">
      {/* 모바일 헤더 — 사이드바 대신 */}
      <div className="flex h-[54px] items-center gap-3 px-4 lg:hidden" style={{ borderBottom: '1px solid rgba(60,47,24,.12)' }}>
        <button type="button" onClick={goShelf} style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 17 }}>마이위키</button>
        <div className="flex-1" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="검색" aria-label="서재 검색"
          className="h-[32px] w-[130px] rounded-lg px-3 text-[13px] outline-none"
          style={{ border: '1px solid rgba(60,47,24,.16)', background: C.paper, color: C.ink }}
        />
        <button type="button" onClick={() => (book ? createDoc(null) : setBookDialog({ book: null }))}
          className="flex h-[32px] items-center rounded-lg px-3 text-[12.5px] font-semibold" style={{ background: C.ink, color: C.bg }}>
          {book ? '+ 새 문서' : '+ 새 책'}
        </button>
      </div>

      {qq ? (
        /* ══════ 검색 결과 ══════ */
        <section className="wiki-rise mx-auto px-5 pb-20 pt-8 sm:px-8" style={{ maxWidth: 1240 }}>
          <div className="flex items-baseline gap-3.5">
            <h1 className="m-0" style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 32 }}>'{q.trim()}'</h1>
            <span style={{ fontSize: 13, color: C.sub }}>{results.length}개의 문서</span>
          </div>
          <div className="mt-5 grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {results.map(({ d, text }) => (
              <button key={d.id} type="button" onClick={() => openDoc(d.id)}
                className="rounded-[10px] p-[18px] text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_12px_24px_-10px_rgba(64,44,18,.3)]"
                style={{ background: C.paper, border: `1px solid ${C.line}`, boxShadow: '0 2px 6px rgba(64,44,18,.06)' }}>
                <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 17 }}>{d.title || '무제'}</div>
                <div className="mt-1.5 line-clamp-2" style={{ fontSize: 13, color: C.sub, lineHeight: 1.65 }}>{text.slice(0, 120) || '빈 문서'}</div>
                <div className="mt-3"><BookChip book={bookOf.get(d.book)} /></div>
              </button>
            ))}
            {results.length === 0 && <p className="py-10 text-center text-[14px]" style={{ color: C.muted }}>일치하는 문서가 없어요</p>}
          </div>
        </section>
      ) : active && book ? (
        /* ══════ 문서 ══════ */
        <section className="wiki-rise mx-auto px-5 pb-20 pt-[40px] sm:px-8" style={{ maxWidth: 1300 }}>
          {/* 빵가루 */}
          <div className="flex items-center gap-[7px]" style={{ fontSize: 13, color: C.sub }}>
            <button type="button" onClick={goShelf} className="hover:underline" style={{ color: C.green }}>서재</button>
            <span>›</span>
            <button type="button" onClick={() => openBook(book.id)} className="hover:underline" style={{ color: C.green }}>{book.title}</button>
            {crumbs.map((c2) => (
              <span key={c2.id} className="flex items-center gap-[7px]">
                <span>›</span>
                <button type="button" onClick={() => openDoc(c2.id)} className="hover:underline" style={{ color: C.green }}>{c2.title || '무제'}</button>
              </span>
            ))}
            <span>›</span>
            <span style={{ color: C.ink, fontWeight: 600 }}>{active.title || '무제'}</span>
            <span className="flex-1" />
            <span className="hidden sm:inline" style={{ fontSize: 12, color: C.muted }}>Esc로 돌아가기</span>
          </div>

          {/* 3열: 목차 | 본문 | 인포박스 (시안 docCols) */}
          <div
            className="mt-[22px] grid items-start justify-center gap-6 lg:gap-9"
            style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}
          >
            {isWide ? (
            <div className="grid gap-9" style={{ gridTemplateColumns: `${mode === 'read' && toc.length >= 2 ? '168px ' : ''}minmax(0,1fr)${mode === 'read' && active.infobox?.length ? ' 280px' : ''}`, alignItems: 'start' }}>
              {/* 좌 — 목차 (읽기, 제목 2개↑) */}
              {mode === 'read' && toc.length >= 2 && (
                <nav className="sticky top-4" aria-label="목차">
                  <div style={{ fontSize: 11, letterSpacing: '.14em', color: C.muted, padding: '0 10px 8px' }}>목차</div>
                  {toc.map((h, i) => (
                    <button
                      key={i} type="button" onClick={() => scrollToHeading(i)}
                      className="block w-full text-left transition-colors hover:bg-[rgba(60,47,24,.04)]"
                      style={{ padding: `7px 10px 7px ${10 + (h.level - 1) * 10}px`, fontSize: 13, color: C.sub, borderLeft: '2px solid rgba(60,47,24,.14)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderLeftColor = C.rust; e.currentTarget.style.color = C.ink; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderLeftColor = 'rgba(60,47,24,.14)'; e.currentTarget.style.color = C.sub; }}
                    >
                      {h.text}
                    </button>
                  ))}
                </nav>
              )}

              {/* 중앙 — 본문 */}
              <DocMain
                active={active} book={book} bookOf={bookOf} bookDocs={bookDocs}
                mode={mode} setMode={setMode} toc={toc} kids={kids} backlinks={backlinks}
                readBodyRef={readBodyRef} editorApi={editorApi}
                patchDoc={patchDoc} removeDoc={removeDoc} onBodyChange={onBodyChange}
                openDoc={openDoc} createDoc={createDoc} setPicker={setPicker}
              />

              {/* 우 — 인포박스 (읽기) */}
              {mode === 'read' && active.infobox && active.infobox.length > 0 && (
                <aside className="sticky top-4">
                  <Infobox doc={active} book={book} />
                </aside>
              )}
            </div>
            ) : (
            /* 모바일/태블릿 — 1열 (인포박스는 본문 위). isWide 분기로 한쪽만 마운트 */
            <div>
              {mode === 'read' && active.infobox && active.infobox.length > 0 && <div className="mb-4"><Infobox doc={active} book={book} /></div>}
              <DocMain
                active={active} book={book} bookOf={bookOf} bookDocs={bookDocs}
                mode={mode} setMode={setMode} toc={toc} kids={kids} backlinks={backlinks}
                readBodyRef={readBodyRef} editorApi={editorApi}
                patchDoc={patchDoc} removeDoc={removeDoc} onBodyChange={onBodyChange}
                openDoc={openDoc} createDoc={createDoc} setPicker={setPicker}
              />
            </div>
            )}
          </div>
        </section>
      ) : book ? (
        /* ══════ 책 펼침 — 표지 + 차례 스프레드 (시안) ══════ */
        <section className="wiki-rise mx-auto w-full px-5 pb-20 pt-[56px] sm:px-8" style={{ maxWidth: 1120 }}>
          <div className="flex items-center gap-[7px]" style={{ fontSize: 13, color: C.sub }}>
            <button type="button" onClick={goShelf} className="hover:underline" style={{ color: C.green }}>서재</button>
            <span>›</span>
            <span style={{ color: C.ink, fontWeight: 600 }}>{book.title}</span>
            <span className="flex-1" />
            <span className="hidden sm:inline" style={{ fontSize: 12, color: C.muted }}>Esc로 돌아가기</span>
          </div>

          <div className="mt-7 grid min-h-[520px] grid-cols-1 md:grid-cols-[236px_minmax(0,1fr)]" style={{ filter: 'drop-shadow(0 26px 40px rgba(46,28,10,.32))' }}>
            {/* 좌 — 표지 */}
            <div className="relative flex overflow-hidden p-5" style={{ borderRadius: '8px 3px 3px 8px', background: book.tint, color: C.cream }}>
              <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(270deg, rgba(0,0,0,.38), rgba(0,0,0,0) 14%), linear-gradient(90deg, rgba(255,246,228,.14), rgba(255,246,228,0) 22%), repeating-linear-gradient(0deg, rgba(0,0,0,.04) 0 2px, rgba(255,255,255,.02) 2px 4px)' }} />
              <div className="relative flex flex-1 flex-col p-5" style={{ border: '1px solid rgba(244,230,200,.5)', borderRadius: 4 }}>
                <div style={{ fontSize: 10, letterSpacing: '.3em', opacity: .75 }}>MYWIKI</div>
                <div className="mt-4" style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 27, lineHeight: 1.3, letterSpacing: '.02em' }}>{book.title}</div>
                <div className="mt-2.5" style={{ fontSize: 12.5, opacity: .85 }}>
                  문서 {bookDocs.length}개{book.intro && <> · {book.intro}</>}
                </div>
                <div className="flex-1" />
                {(() => {
                  const last = recent.map((id) => bookDocs.find((d) => d.id === id)).find(Boolean) ?? childrenOf(bookDocs, null)[0];
                  return last ? (
                    <>
                      <div style={{ fontSize: 11, letterSpacing: '.08em', opacity: .7 }}>이어서 읽기</div>
                      <button
                        type="button" onClick={() => openDoc(last.id)}
                        className="mt-2 rounded-lg px-3.5 py-[11px] text-left transition-colors"
                        style={{ border: '1px solid rgba(244,230,200,.5)', fontSize: 13.5, fontWeight: 600, background: 'rgba(0,0,0,.14)', color: C.cream }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,.3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,.14)'; }}
                      >
                        {last.title || '무제'} →
                      </button>
                    </>
                  ) : null;
                })()}
                <button type="button" onClick={() => setBookDialog({ book })} className="mt-3 self-start text-[11.5px] underline-offset-4 hover:underline" style={{ color: 'rgba(244,230,200,.75)' }}>
                  책 정보 고치기
                </button>
              </div>
            </div>

            {/* 우 — 차례 페이지 */}
            <div className="wiki-page min-w-0 p-6 sm:p-9" style={{ background: C.paper, borderRadius: '3px 12px 12px 3px', border: `1px solid ${C.line}`, borderLeft: 'none', boxShadow: 'inset 16px 0 26px -20px rgba(46,28,10,.45)' }}>
              <div className="flex items-baseline gap-3" style={{ borderBottom: `3px double ${C.lineDeep}`, paddingBottom: 10 }}>
                <h2 className="m-0 flex-none" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 20 }}>차례</h2>
                <span className="min-w-0 flex-1 truncate" style={{ fontSize: 12, color: C.sub }}>눌러 펼치기 · 끌어서 다른 문서 아래로</span>
                <button type="button" onClick={() => createDoc(null)} className="flex-none rounded-full px-3 py-1 text-[12px] font-semibold transition-colors hover:bg-[#40372a]" style={{ background: C.ink, color: C.bg }}>
                  + 새 문서
                </button>
              </div>
              <div className="mt-3.5">
                {(() => {
                  const rows: { d: WikiDoc; depth: number }[] = [];
                  const walk = (parent: string | null, depth: number, seen: Set<string>) => {
                    for (const d of childrenOf(bookDocs, parent)) {
                      if (seen.has(d.id)) continue;
                      seen.add(d.id);
                      rows.push({ d, depth });
                      walk(d.id, depth + 1, seen);
                    }
                  };
                  walk(null, 0, new Set());
                  if (rows.length === 0) {
                    return (
                      <div className="py-12 text-center">
                        <p style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 16 }}>아직 빈 책이에요</p>
                        <p className="mt-1.5" style={{ fontSize: 13, color: C.sub }}>첫 문서를 적으면 여기가 차례가 돼요.</p>
                      </div>
                    );
                  }
                  return (
                    <>
                      {/* 끌기 시작하면 열리는 '책의 맨 위' 자리 — 하위에서 빼낼 때 */}
                      {dragDoc && canDropOn(null) && (
                        <div
                          className="wiki-root-drop mb-1.5 rounded-md px-3 py-2 text-center"
                          style={{
                            border: `1.5px dashed ${dropAt === 'root' ? C.green : 'rgba(60,47,24,.28)'}`,
                            background: dropAt === 'root' ? 'rgba(48,95,76,.1)' : 'transparent',
                            fontSize: 12, color: dropAt === 'root' ? C.green : C.sub, fontWeight: 600,
                          }}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropAt('root'); }}
                          onDragLeave={() => setDropAt((v) => (v === 'root' ? null : v))}
                          onDrop={(e) => { e.preventDefault(); dropOn(null); }}
                        >
                          여기에 놓으면 책의 맨 위로
                        </div>
                      )}
                      {rows.map(({ d, depth }) => {
                        const target = dropAt === d.id && canDropOn(d.id);
                        return (
                          <div key={d.id}>
                            <div
                              role="button" tabIndex={0} draggable
                              onClick={() => openDoc(d.id)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDoc(d.id); } }}
                              onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', d.id); setDragDoc(d.id); }}
                              onDragEnd={() => { setDragDoc(null); setDropAt(null); }}
                              onDragOver={(e) => { if (!canDropOn(d.id)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropAt(d.id); }}
                              onDragLeave={() => setDropAt((v) => (v === d.id ? null : v))}
                              onDrop={(e) => { e.preventDefault(); dropOn(d.id); }}
                              title={dragDoc ? undefined : `${d.title || '무제'} — 끌어서 다른 문서 아래로 옮길 수 있어요`}
                              className={cn(
                                'wiki-row flex w-full items-baseline gap-2.5 rounded-md text-left',
                                dragDoc === d.id && 'wiki-row-drag',
                                target && 'wiki-row-drop',
                                justMoved === d.id && 'wiki-row-moved',
                                dragDoc ? 'cursor-grabbing' : 'cursor-grab',
                              )}
                              style={{ padding: `8px 6px 8px ${6 + depth * 22}px` }}
                            >
                              <span className="min-w-0 max-w-[60%] truncate" style={{ fontFamily: depth === 0 ? SERIF : SANS, fontWeight: depth === 0 ? 700 : 400, fontSize: depth === 0 ? 15.5 : 14 }}>
                                {d.title || '무제'}
                              </span>
                              {d.pinned && <Star className="h-3 w-3 shrink-0 self-center fill-amber-400 text-amber-400" />}
                              <span aria-hidden className="flex-1 -translate-y-[3px]" style={{ borderBottom: '1px dotted rgba(60,47,24,.3)' }} />
                              <span style={{ fontSize: 12, color: C.muted }}>{fmtShort(d.updated)}</span>
                            </div>
                            {/* 들어갈 자리 — 한 단 안쪽으로 열린다 */}
                            {target && <div aria-hidden className="wiki-slot" style={{ marginLeft: 6 + (depth + 1) * 22, marginRight: 6 }} />}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>

              {/* 페이지 밑단 — 이 책의 형편 */}
              <div className="mt-7 flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-3" style={{ borderTop: `1px solid ${C.line2}`, fontSize: 11.5, color: C.muted }}>
                <span>문서 {bookDocs.length}개</span>
                {bookDocs.length > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    <span>마지막 수정 {fmtDate(Math.max(...bookDocs.map((d) => d.updated)))}</span>
                  </>
                )}
                {inboundLinks > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    <span>다른 책에서 들어온 연결 {inboundLinks}개</span>
                  </>
                )}
                <span className="flex-1" />
                <button type="button" onClick={() => setBookDialog({ book })} className="underline-offset-4 hover:underline" style={{ color: C.sub }}>
                  책 정보
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* ══════ 서재 홈 (시안) ══════ */
        <section className="wiki-rise mx-auto px-5 pb-20 pt-[72px] sm:px-8" style={{ maxWidth: 1240 }}>
          <div className="flex flex-wrap items-baseline gap-3.5">
            <h1 className="m-0" style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 32, letterSpacing: '.02em' }}>나의 서재</h1>
            <span style={{ fontSize: 13, color: C.sub }}>{statsLine}</span>
          </div>

          {/* 나무 책장 */}
          <div className="relative mt-9 rounded-[14px] px-6 pb-8 pt-[50px] sm:px-[36px]" style={{ background: 'linear-gradient(180deg,#5c3d20 0%,#4a2f16 45%,#38220e 100%)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.3), inset 0 18px 38px rgba(0,0,0,.42), 0 22px 48px -20px rgba(46,28,10,.55)' }}>
            {/* 가구 골격 — 윗판·옆판이 있어야 빈 여백이 '가구의 두께'로 읽힌다 */}
            <div aria-hidden className="absolute inset-x-0 top-0 h-[30px] rounded-t-[14px]" style={{ background: 'linear-gradient(180deg,#a26c3e,#79491f)', boxShadow: '0 7px 12px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,235,200,.35)' }} />
            <div aria-hidden className="absolute bottom-0 left-0 top-[26px] w-[16px] rounded-bl-[14px]" style={{ background: 'linear-gradient(90deg,#8a5a32,#66401e)', boxShadow: 'inset -4px 0 7px rgba(0,0,0,.35)' }} />
            <div aria-hidden className="absolute bottom-0 right-0 top-[26px] w-[16px] rounded-br-[14px]" style={{ background: 'linear-gradient(270deg,#8a5a32,#66401e)', boxShadow: 'inset 4px 0 7px rgba(0,0,0,.35)' }} />
            {/* 황동 명패 */}
            <div className="absolute left-1/2 top-[4px] flex -translate-x-1/2 items-center gap-2 rounded-[4px] px-3.5 py-[2.5px]" style={{ background: 'linear-gradient(180deg,#cfa84e,#8a6a30)', border: '1px solid #6d5222', boxShadow: '0 1px 3px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,240,200,.55)' }}>
              <span aria-hidden className="h-[3px] w-[3px] rounded-full" style={{ background: '#5c4718' }} />
              <span style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 11, letterSpacing: '.24em', color: '#3a2c10' }}>나의 서재</span>
              <span aria-hidden className="h-[3px] w-[3px] rounded-full" style={{ background: '#5c4718' }} />
            </div>
            <div className="relative flex items-end gap-[9px] overflow-x-clip px-3.5">
              {shelf1.map((b, i) => spine(b, leanOnOf(shelf1, i)))}
              {shelf2.length === 0 && (
                <button type="button" onClick={() => setBookDialog({ book: null })} title="새 책 만들기"
                  className="flex h-[268px] w-[66px] flex-none items-center justify-center rounded-[4px] text-[28px] transition-colors"
                  style={{ border: '1.5px dashed rgba(244,230,200,.38)', color: 'rgba(244,230,200,.55)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(244,230,200,.7)'; e.currentTarget.style.color = 'rgba(244,230,200,.9)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(244,230,200,.38)'; e.currentTarget.style.color = 'rgba(244,230,200,.55)'; }}
                >+</button>
              )}

              {/* 정물들 — 등간격으로 도열하지 않는다. 꽃병과 시계는 한 무리로 붙어 서고,
                  지구본만 멀찍이. 빈 틈은 1 : 1.9 로 갈려 리듬이 어긋난다 (grow 라 넘치지 않음) */}
              {shelf2.length === 0 && <span aria-hidden className="hidden flex-[1] md:block" />}
              {shelf2.length === 0 && (
                <span className="hidden flex-none items-end gap-[7px] self-end pb-[2px] md:flex">
                  {/* 꽃병 — 선반 안쪽에 물러나 있어 조금 작고 그늘지다 */}
                  {SHELF_PROPS.slice(0, Math.max(0, 5 - shelfBooks.length)).map((kind) => (
                    <span key={kind} className="block" style={{ transform: 'scale(.94)', transformOrigin: 'bottom center', filter: 'brightness(.9)' }}>
                      <ShelfProp kind={kind} />
                    </span>
                  ))}
                  {/* 탁상시계 — 앞쪽에, 누가 내려놓은 듯 살짝 비뚜름하게 */}
                  <span className="hidden lg:block" title="서재의 괘종시계" style={{ transform: 'rotate(2deg)', transformOrigin: 'bottom center', marginLeft: -3 }}>
                    <PendulumClock />
                  </span>
                </span>
              )}
              {shelf2.length === 0 && <span aria-hidden className="hidden flex-[1.9] md:block" />}

              {/* 지구본 — 서가 맨 오른쪽의 대형 정물. 돌리면(클릭) 아무 문서나 펼쳐진다 */}
              {shelf2.length === 0 && docs.length > 0 && (
                <button
                  type="button" onClick={openRandom} title="지구본 돌리기 — 아무 문서나 펼치기"
                  className="group relative hidden flex-none self-end md:block"
                >
                  <svg width="164" height="234" viewBox="0 0 164 234" className="transition-transform duration-300 group-hover:-rotate-3 motion-reduce:transition-none motion-reduce:group-hover:transform-none" style={{ filter: 'drop-shadow(0 16px 16px rgba(10,5,0,.5))', transformOrigin: '50% 90%' }}>
                    <defs>
                      <radialGradient id="wikiGlobeSea" cx="38%" cy="32%" r="80%">
                        <stop offset="0%" stopColor="#4a6076" />
                        <stop offset="55%" stopColor="#33465e" />
                        <stop offset="100%" stopColor="#22303f" />
                      </radialGradient>
                    </defs>
                    {/* 받침 — 나무 발 + 기둥 */}
                    <ellipse cx="82" cy="224" rx="40" ry="8" fill="#5c3414" />
                    <ellipse cx="82" cy="221" rx="40" ry="8" fill="#7c4425" />
                    <rect x="77" y="186" width="10" height="34" rx="4" fill="#6d3c1e" />
                    {/* 자오선 고리 (황동) — 살짝 기운 축 */}
                    <g transform="rotate(16 82 106)">
                      <ellipse cx="82" cy="106" rx="74" ry="76" fill="none" stroke="#8a6a30" strokeWidth="7" />
                      <ellipse cx="82" cy="106" rx="74" ry="76" fill="none" stroke="#b98a2e" strokeWidth="2.5" />
                      <circle cx="82" cy="27" r="5" fill="#8a6a30" />
                      <circle cx="82" cy="185" r="5" fill="#8a6a30" />
                    </g>
                    {/* 구 — 바다와 대륙 */}
                    <g transform="rotate(16 82 106)">
                      <circle cx="82" cy="106" r="64" fill="url(#wikiGlobeSea)" />
                      <path d="M46 76 q10 -12 24 -8 q12 3 10 14 q-2 9 -14 10 q-16 2 -22 -6 q-3 -5 2 -10 z" fill="#b98a2e" opacity=".85" />
                      <path d="M96 92 q16 -6 26 4 q8 8 2 18 q-7 10 -20 7 q-12 -3 -14 -14 q-1 -9 6 -15 z" fill="#4a5d3a" opacity=".9" />
                      <path d="M58 128 q9 -7 19 -2 q9 5 5 14 q-4 9 -15 8 q-11 -1 -13 -10 q-1 -6 4 -10 z" fill="#9a4632" opacity=".8" />
                      <path d="M104 138 q8 -3 12 3 q3 6 -3 10 q-7 4 -12 -1 q-4 -5 3 -12 z" fill="#b98a2e" opacity=".7" />
                      {/* 위도선 힌트 */}
                      <path d="M20 96 q62 -18 124 0" stroke="rgba(246,236,217,.22)" strokeWidth="1.5" fill="none" />
                      <path d="M22 122 q60 16 120 0" stroke="rgba(246,236,217,.18)" strokeWidth="1.5" fill="none" />
                      {/* 반사광 */}
                      <ellipse cx="60" cy="82" rx="20" ry="12" fill="rgba(255,246,228,.14)" transform="rotate(-24 60 82)" />
                    </g>
                  </svg>
                  <span className="pointer-events-none absolute left-1/2 top-full block -translate-x-1/2 whitespace-nowrap pt-[7px] opacity-0 transition-opacity duration-200 group-hover:opacity-100" style={{ fontSize: 10.5, letterSpacing: '.14em', color: 'rgba(244,230,200,.8)' }}>
                    아무 문서나 펼치기
                  </span>
                </button>
              )}
            </div>
            {shelfBar}
            {shelf2.length > 0 && (
              <>
                <div className="relative mt-9 flex items-end gap-[9px] overflow-x-auto px-3.5">
                  {shelf2.map((b, i) => spine(b, leanOnOf(shelf2, i)))}
                  <button type="button" onClick={() => setBookDialog({ book: null })} title="새 책 만들기"
                    className="flex h-[268px] w-[66px] flex-none items-center justify-center rounded-[4px] text-[28px] transition-colors"
                    style={{ border: '1.5px dashed rgba(244,230,200,.38)', color: 'rgba(244,230,200,.55)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(244,230,200,.7)'; e.currentTarget.style.color = 'rgba(244,230,200,.9)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(244,230,200,.38)'; e.currentTarget.style.color = 'rgba(244,230,200,.55)'; }}
                  >+</button>
                </div>
                {shelfBar}
              </>
            )}
          </div>
          <p className="mx-1 mt-2.5" style={{ fontSize: 12, color: C.muted }}>책등의 두께와 높이는 그 안에 쌓인 문서 수를 따라 자랍니다. 책을 눌러 펼쳐보세요.</p>

          {/* 고정된 문서 */}
          {pinnedAll.length > 0 && (
            <div className="mt-11">
              <div className="flex items-baseline gap-2.5">
                <h2 className="m-0" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 17 }}>고정된 문서</h2>
                <span style={{ fontSize: 12, color: C.sub }}>책갈피로 꽂아둔 {pinnedAll.length}개</span>
              </div>
              <div className="mt-3.5 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                {pinnedAll.map((d) => {
                  const b = bookOf.get(d.book);
                  return (
                    <button key={d.id} type="button" onClick={() => openDoc(d.id)}
                      className="relative rounded-[10px] p-[18px] pb-[15px] text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_12px_24px_-10px_rgba(64,44,18,.3)]"
                      style={{ background: C.paper, border: `1px solid ${C.line}`, boxShadow: '0 2px 6px rgba(64,44,18,.06)' }}>
                      <span aria-hidden className="absolute right-5 top-[-5px] h-[56px] w-5" style={{ background: b?.tint ?? C.rust, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 9px), 0 100%)', boxShadow: '0 3px 5px rgba(0,0,0,.25)' }} />
                      <div className="pr-9" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 17 }}>{d.title || '무제'}</div>
                      <div className="mt-1.5 line-clamp-2" style={{ fontSize: 13, color: C.sub, lineHeight: 1.65 }}>{bodyText(d.body).slice(0, 80) || '빈 문서'}</div>
                      <div className="mt-[13px] flex items-center gap-2">
                        <BookChip book={b} />
                        <span style={{ fontSize: 11.5, color: C.muted }}>{fmtDate(d.updated)} 수정</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 많이 언급된 / 최근 본 */}
          {(mostLinked.length > 0 || recentDocs.length > 0) && (
            <div className="mt-10 grid items-start gap-4 lg:grid-cols-2">
              {mostLinked.length > 0 && (
                <div className="rounded-xl px-[22px] pb-3 pt-5" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
                  <div className="flex items-baseline gap-2.5 pb-3">
                    <h2 className="m-0" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 17 }}>많이 언급된 문서</h2>
                    <span style={{ fontSize: 12, color: C.sub }}>서재 전체 백링크 순위 — 이 서재의 중심</span>
                  </div>
                  {mostLinked.map(({ d, n }, i) => {
                    const b = bookOf.get(d.book);
                    const pct = Math.round((n / mostLinked[0].n) * 100);
                    return (
                      <button key={d.id} type="button" onClick={() => openDoc(d.id)}
                        className="grid w-full items-center gap-3 rounded-md px-1.5 py-[11px] text-left transition-colors hover:bg-[rgba(60,47,24,.045)]"
                        style={{ gridTemplateColumns: '28px 1fr auto', borderTop: `1px solid ${C.line2}` }}>
                        <span className="text-center" style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 17, color: i === 0 ? C.rust : '#b3a78f' }}>{i + 1}</span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate" style={{ fontSize: 14.5, fontWeight: 600 }}>{d.title || '무제'}</span>
                            <BookChip book={b} />
                          </span>
                          <span className="mt-[7px] block h-1 overflow-hidden rounded-full" style={{ background: 'rgba(60,47,24,.08)' }}>
                            <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: b?.tint ?? C.rust }} />
                          </span>
                        </span>
                        <span className="whitespace-nowrap" style={{ fontSize: 12.5, color: C.sub }}>{n}회 언급</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {recentDocs.length > 0 && (
                <div className="rounded-xl px-[22px] pb-3 pt-5" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
                  <div className="flex items-baseline gap-2.5 pb-3">
                    <h2 className="m-0" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 17 }}>최근 본 문서</h2>
                    <span style={{ fontSize: 12, color: C.sub }}>읽던 자리로 바로 돌아가기</span>
                  </div>
                  {recentDocs.map((d) => (
                    <button key={d.id} type="button" onClick={() => openDoc(d.id)}
                      className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-3 text-left transition-colors hover:bg-[rgba(60,47,24,.045)]"
                      style={{ borderTop: `1px solid ${C.line2}` }}>
                      <span className="truncate" style={{ fontSize: 14.5, fontWeight: 500 }}>{d.title || '무제'}</span>
                      <BookChip book={bookOf.get(d.book)} />
                      <span className="flex-1" />
                      <span className="whitespace-nowrap" style={{ fontSize: 12, color: C.muted }}>{fmtRel(d.updated)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {pinnedAll.length === 0 && mostLinked.length === 0 && (
            <div className="mt-11 rounded-xl p-[34px] text-center" style={{ border: '1.5px dashed rgba(60,47,24,.22)' }}>
              <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 17 }}>아직 조용한 서재예요</div>
              <div className="mt-2" style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.7 }}>
                문서를 고정하거나 읽기 시작하면 이 자리에 모입니다.<br />첫 책을 펼쳐 첫 문서를 써보세요 — 책등이 조금씩 두꺼워질 거예요.
              </div>
            </div>
          )}

          <div className="mt-16 text-center" style={{ fontSize: 12, color: C.muted }}>쓸 때는 노트, 읽을 때는 위키 — 마이위키</div>
        </section>
      )}
      </main>

      {/* 문서 연결 피커 */}
      {picker && active && (
        <LinkPicker
          docs={docs} books={books} selfId={active.id} initial={picker.text}
          onClose={() => setPicker(null)}
          onPick={(pickedId, title) => { editorApi.current?.applyLink(pickedId, picker.text || title); setPicker(null); }}
          onCreate={(title) => {
            const d: WikiDoc = { id: newId('wk'), book: active.book, title, parent: active.id, tags: [], pinned: false, updated: Date.now(), body: emptyBody() };
            setStore((s) => ({ ...s, docs: [...s.docs, d] }));
            editorApi.current?.applyLink(d.id, picker.text || title);
            setPicker(null);
          }}
        />
      )}

      {/* 책 만들기·정보 */}
      {bookDialog && (
        <BookDialog
          book={bookDialog.book}
          onClose={() => setBookDialog(null)}
          onSave={saveBook}
          onDelete={bookDialog.book ? () => removeBook(bookDialog.book!.id) : undefined}
        />
      )}
    </div>
  );
}

/* ── 인포박스 (읽기) — 시안 그대로: tint 헤더 + 88px 라벨 그리드 ── */
function Infobox({ doc, book }: { doc: WikiDoc; book: WikiBook }) {
  return (
    <div className="overflow-hidden rounded-xl" style={{ background: C.paper, border: '1px solid rgba(60,47,24,.16)', boxShadow: '0 2px 8px rgba(64,44,18,.06)' }}>
      <div className="px-4 py-[11px]" style={{ background: book.tint, color: C.cream, fontFamily: SERIF, fontWeight: 700, fontSize: 15 }}>
        {doc.title || '무제'}
      </div>
      {(doc.infobox ?? []).map((row, i) => (
        <div key={i} className="grid gap-2.5 px-4 py-2.5" style={{ gridTemplateColumns: '88px 1fr', fontSize: 13, borderTop: i === 0 ? 'none' : `1px solid ${C.line2}` }}>
          <span style={{ color: C.sub }}>{row.label}</span>
          <span className="break-words">{row.value}</span>
        </div>
      ))}
      <div className="px-4 pb-3 pt-[9px]" style={{ borderTop: `1px solid ${C.line2}`, fontSize: 11, color: C.muted }}>이 문서의 요약 카드 — 편집에서 채워요</div>
    </div>
  );
}

/* ── 문서 본문 (읽기/편집 공용 셸) ── */
function DocMain({
  active, book, bookOf, bookDocs, mode, setMode, toc, kids, backlinks,
  readBodyRef, editorApi, patchDoc, removeDoc, onBodyChange, openDoc, createDoc, setPicker,
}: {
  active: WikiDoc; book: WikiBook; bookOf: Map<string, WikiBook>; bookDocs: WikiDoc[];
  mode: 'read' | 'edit'; setMode: (m: 'read' | 'edit') => void;
  toc: { level: number; text: string }[]; kids: WikiDoc[]; backlinks: WikiDoc[];
  readBodyRef: React.RefObject<HTMLDivElement>;
  editorApi: React.MutableRefObject<WikiEditorApi | null>;
  patchDoc: (id: string, patch: Partial<WikiDoc>) => void;
  removeDoc: (id: string) => void;
  onBodyChange: (id: string, v: Value) => void;
  openDoc: (id: string, opts?: { edit?: boolean }) => void;
  createDoc: (parent: string | null) => void;
  setPicker: (p: { text: string } | null) => void;
}) {
  void toc;
  return (
    <div className="min-w-0">
      <article className="rounded-[14px] p-6 sm:px-[52px] sm:py-11" style={{ background: C.paper, border: `1px solid ${C.line}`, boxShadow: '0 2px 10px rgba(64,44,18,.05)' }}>
        {mode === 'read' ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <h1 className="m-0 min-w-0" style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 36, lineHeight: 1.3 }}>{active.title || '무제'}</h1>
              <button
                type="button" onClick={() => setMode('edit')}
                className="mt-2 flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-[7px] text-[12.5px] font-semibold transition-colors hover:bg-[#40372a]"
                style={{ background: C.ink, color: C.bg }}
              >
                <Pencil className="h-3 w-3" /> 편집
              </button>
            </div>
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
              <BookChip book={book} />
              {active.tags.map((t) => <span key={t} style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>#{t}</span>)}
              <span style={{ fontSize: 12.5, color: C.muted }}>마지막 수정 {fmtDate(active.updated)}</span>
              {backlinks.length > 0 && <span style={{ fontSize: 12.5, color: C.muted }}>· 문서 {backlinks.length}개가 이 문서를 언급</span>}
            </div>
            <div aria-hidden className="mb-1 mt-5" style={{ borderBottom: '3px double rgba(60,47,24,.25)' }} />
            <div className="wiki-read">
              <Suspense fallback={<p className="py-10 text-center" style={{ fontSize: 12.5, color: C.sub }}>문서를 펼치는 중…</p>}>
                <WikiDocReader key={`${active.id}-${active.updated}`} value={active.body} onOpenDoc={openDoc} containerRef={readBodyRef} />
              </Suspense>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <input
                key={`t-${active.id}`}
                defaultValue={active.title}
                onBlur={(e) => patchDoc(active.id, { title: e.target.value.trim() })}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) (e.target as HTMLInputElement).blur(); }}
                placeholder="문서 제목"
                className="w-full bg-transparent outline-none"
                style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 32, lineHeight: 1.3, color: C.ink }}
              />
              <button
                type="button" onClick={() => setMode('read')}
                className="mt-2 flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-[7px] text-[12.5px] font-semibold text-white transition-colors"
                style={{ background: C.green }}
              >
                읽기
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2" style={{ fontSize: 12 }}>
              <TagEditor tags={active.tags} onChange={(tags) => patchDoc(active.id, { tags })} />
              <span className="opacity-40">·</span>
              <select
                value={active.parent ?? ''}
                onChange={(e) => patchDoc(active.id, { parent: e.target.value || null })}
                className="rounded-lg px-2 py-1 outline-none"
                style={{ border: `1px solid ${C.line}`, background: C.paper, color: C.sub, fontSize: 12 }}
                title="상위 문서로 이동"
              >
                <option value="">— 책의 맨 위 —</option>
                {moveOptions(bookDocs, active.id).map((o) => (
                  <option key={o.id} value={o.id}>{'  '.repeat(o.depth)}{o.title || '무제'}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => patchDoc(active.id, { pinned: !active.pinned })}
                className={cn('flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold transition-colors', active.pinned ? 'border-amber-300 bg-amber-50 text-amber-600' : '')}
                style={active.pinned ? undefined : { borderColor: C.line, background: C.paper, color: C.muted }}
              >
                <Pin className="h-3 w-3" /> {active.pinned ? '고정됨' : '고정'}
              </button>
              <button type="button" onClick={() => removeDoc(active.id)} className="flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold transition-colors hover:border-rose-300 hover:text-rose-500" style={{ borderColor: C.line, background: C.paper, color: C.muted }}>
                <Trash2 className="h-3 w-3" /> 삭제
              </button>
              <span className="ml-auto" style={{ fontSize: 11.5, color: C.muted }}>{fmtRel(active.updated)} 저장</span>
            </div>

            <InfoboxEditor rows={active.infobox ?? []} onChange={(rows) => patchDoc(active.id, { infobox: rows.length ? rows : undefined })} />

            <div aria-hidden className="my-5" style={{ borderBottom: '3px double rgba(60,47,24,.25)' }} />

            <Suspense fallback={<p className="py-10 text-center" style={{ fontSize: 12.5, color: C.sub }}>편집기를 여는 중…</p>}>
              <WikiDocEditor
                key={active.id}
                initialValue={active.body}
                onChange={(v) => onBodyChange(active.id, v)}
                onOpenDoc={openDoc}
                onLinkRequest={(text) => setPicker({ text })}
                apiRef={editorApi}
              />
            </Suspense>
          </>
        )}
      </article>

      {/* 하위 문서 */}
      <div className="mt-[26px]">
        <div className="flex items-baseline gap-2.5">
          <h2 className="m-0" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 16 }}>하위 문서</h2>
          {kids.length > 0 && <span style={{ fontSize: 12, color: C.sub }}>{kids.length}개</span>}
        </div>
        <div className="mt-3 grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {kids.map((d) => (
            <button key={d.id} type="button" onClick={() => openDoc(d.id)}
              className="rounded-[10px] px-[18px] py-[15px] text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-10px_rgba(64,44,18,.28)]"
              style={{ background: C.paper, border: `1px solid ${C.line}` }}>
              <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 14 }}>{d.title || '무제'}</div>
              <div className="mt-1.5 line-clamp-1" style={{ fontSize: 13, color: C.sub }}>{bodyText(d.body).slice(0, 70) || '빈 문서'}</div>
            </button>
          ))}
          <button type="button" onClick={() => createDoc(active.id)}
            className="flex min-h-[64px] items-center justify-center gap-1.5 rounded-[10px] transition-colors hover:bg-[rgba(60,47,24,.03)]"
            style={{ border: '1.5px dashed rgba(60,47,24,.2)', fontSize: 13, fontWeight: 600, color: C.sub }}>
            <Plus className="h-3.5 w-3.5" /> 하위 문서
          </button>
        </div>
      </div>

      {/* 백링크 — 문맥 발췌 카드 (시안) */}
      <div className="mt-[26px]">
        <div className="flex items-baseline gap-2.5">
          <h2 className="m-0" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 16 }}>이 문서를 언급한 문서들</h2>
          <span style={{ fontSize: 12, color: C.sub }}>서재 전체에서 자동으로 모임</span>
        </div>
        {backlinks.length > 0 ? (
          <div className="mt-3 grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {backlinks.map((bl) => {
              const b = bookOf.get(bl.book);
              const ex = backlinkExcerpt(bl.body, active.id);
              return (
                <button key={bl.id} type="button" onClick={() => openDoc(bl.id)}
                  className="rounded-[10px] px-[18px] py-[15px] text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-10px_rgba(64,44,18,.28)]"
                  style={{ background: C.paper, border: `1px solid ${C.line}` }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 14 }}>{bl.title || '무제'}</span>
                    <BookChip book={b} />
                  </div>
                  {ex && (
                    <div className="mt-2" style={{ fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
                      {ex.pre}
                      <span className="rounded-[3px] px-1 font-semibold" style={{ background: '#efe0b4', color: C.ink }}>{ex.mid}</span>
                      {ex.post}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 rounded-[10px] px-[22px] py-5" style={{ border: '1.5px dashed rgba(60,47,24,.2)', fontSize: 13, color: C.sub, lineHeight: 1.7 }}>
            아직 이 문서를 언급한 문서가 없어요. 다른 문서에서 텍스트를 드래그해 "문서로 연결"하면 여기에 모입니다.
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 인포박스 편집 ── */
function InfoboxEditor({ rows, onChange }: { rows: InfoboxRow[]; onChange: (rows: InfoboxRow[]) => void }) {
  const [open, setOpen] = useState(rows.length > 0);
  const set = (i: number, patch: Partial<InfoboxRow>) => onChange(rows.map((r, x) => (x === i ? { ...r, ...patch } : r)));
  return (
    <div className="mt-3 rounded-xl" style={{ border: `1px solid ${C.line}`, background: 'rgba(60,47,24,.025)' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-3.5 py-2 text-left" style={{ fontSize: 12, fontWeight: 700, color: C.sub }}>
        {open ? '▾' : '▸'} 인포박스 {rows.length > 0 && <span className="font-semibold opacity-70">{rows.length}행</span>}
        <span className="ml-auto font-medium opacity-70">읽기 화면 오른쪽에 요약 카드로 떠요</span>
      </button>
      {open && (
        <div className="space-y-1.5 px-3.5 pb-3">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                value={r.label} onChange={(e) => set(i, { label: e.target.value })}
                placeholder="항목" aria-label={`인포박스 ${i + 1} 항목`}
                className="w-[88px] rounded-lg px-2 py-1.5 font-semibold outline-none" style={{ border: `1px solid ${C.line}`, background: C.paper, fontSize: 12 }}
              />
              <input
                value={r.value} onChange={(e) => set(i, { value: e.target.value })}
                placeholder="내용" aria-label={`인포박스 ${i + 1} 내용`}
                className="min-w-0 flex-1 rounded-lg px-2 py-1.5 outline-none" style={{ border: `1px solid ${C.line}`, background: C.paper, fontSize: 12 }}
              />
              <button type="button" onClick={() => onChange(rows.filter((_, x) => x !== i))} aria-label="행 삭제" className="shrink-0 p-1 hover:text-rose-500" style={{ color: C.muted }}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => onChange([...rows, { label: '', value: '' }])} className="flex items-center gap-1 rounded-lg px-2 py-1 font-bold transition-colors hover:bg-white" style={{ color: C.green, fontSize: 12 }}>
            <Plus className="h-3 w-3" /> 행 추가
          </button>
        </div>
      )}
    </div>
  );
}

/* ── 태그 인라인 편집 ── */
function TagEditor({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim().replace(/^#/, '');
    if (t && !tags.includes(t)) onChange([...tags, t].slice(0, 8));
    setDraft('');
  };
  return (
    <span className="flex flex-wrap items-center gap-1">
      {tags.map((t) => (
        <button key={t} type="button" onClick={() => onChange(tags.filter((x) => x !== t))} title="태그 제거"
          className="rounded-full px-2 py-0.5 font-semibold transition-colors"
          style={{ background: 'rgba(48,95,76,.1)', color: C.green, fontSize: 11.5 }}>
          #{t} ×
        </button>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder="+ 태그"
        className="w-[58px] bg-transparent outline-none"
        style={{ fontSize: 11.5, color: C.ink }}
      />
    </span>
  );
}

/* ── 책 만들기·정보 다이얼로그 ── */
function BookDialog({ book, onClose, onSave, onDelete }: {
  book: WikiBook | null;
  onClose: () => void;
  onSave: (input: { id?: string; title: string; tint: string; intro: string }) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(book?.title ?? '');
  const [intro, setIntro] = useState(book?.intro ?? '');
  const [tint, setTint] = useState(book?.tint ?? BOOK_PALETTE[0]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const valid = title.trim().length > 0;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div className="w-[440px] max-w-[92vw] rounded-2xl p-6" style={{ background: C.paper, border: `1px solid ${C.line}`, boxShadow: '0 30px 70px -20px rgba(46,28,10,.45)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-4">
          {/* 책등 미리보기 */}
          <span aria-hidden className="relative flex h-[110px] w-[34px] shrink-0 items-center justify-center overflow-hidden" style={{ background: tint, borderRadius: '3px 3px 2px 2px', boxShadow: '0 8px 14px -8px rgba(20,11,3,.55)' }}>
            <span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(255,246,228,.26), rgba(255,246,228,0) 16%, rgba(0,0,0,0) 76%, rgba(0,0,0,.32))' }} />
            <span className="[writing-mode:vertical-rl]" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 12, letterSpacing: '.16em', color: C.cream }}>{title.trim() || '새 책'}</span>
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="m-0" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 16 }}>{book ? '책 정보' : '새 책'}</h3>
            <input
              autoFocus={!book}
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="책 제목"
              className="mt-2 w-full bg-transparent pb-1 outline-none"
              style={{ borderBottom: `1px solid ${C.line}`, fontFamily: SERIF, fontWeight: 700, fontSize: 15, color: C.ink }}
            />
            <input
              value={intro} onChange={(e) => setIntro(e.target.value)}
              placeholder="한 줄 소개 (선택)"
              className="mt-2 w-full bg-transparent pb-1 outline-none"
              style={{ borderBottom: `1px solid ${C.line}`, fontSize: 12.5, color: C.ink }}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span style={{ fontSize: 11.5, fontWeight: 700, color: C.sub }}>책등 색</span>
          {BOOK_PALETTE.map((c) => (
            <button
              key={c} type="button" onClick={() => setTint(c)} aria-label={`색 ${c}`}
              className={cn('h-6 w-6 rounded-full transition-transform', tint === c && 'scale-110 ring-2 ring-offset-2')}
              style={{ background: c, ...(tint === c ? { ['--tw-ring-color' as string]: c } : {}) }}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          {onDelete ? (
            <button type="button" onClick={onDelete} className="underline-offset-4 transition-colors hover:text-rose-500 hover:underline" style={{ fontSize: 12.5, fontWeight: 600, color: C.muted }}>
              책 삭제
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-2" style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>취소</button>
            <button
              type="button" disabled={!valid}
              onClick={() => onSave({ id: book?.id, title: title.trim(), tint, intro: intro.trim() })}
              className={cn('rounded-full px-5 py-2 font-bold transition-colors hover:bg-[#40372a]', !valid && 'opacity-40')}
              style={{ background: C.ink, color: C.bg, fontSize: 13 }}
            >
              {book ? '저장' : '책 만들기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 문서 연결 피커 — 서재 전체 검색 ── */
function LinkPicker({ docs, books, selfId, initial, onClose, onPick, onCreate }: {
  docs: WikiDoc[]; books: WikiBook[]; selfId: string; initial: string;
  onClose: () => void;
  onPick: (docId: string, title: string) => void;
  onCreate: (title: string) => void;
}) {
  const [q, setQ] = useState(initial);
  const bookOf = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);
  const qq = q.trim().toLowerCase();
  const list = docs
    .filter((d) => d.id !== selfId && (!qq || d.title.toLowerCase().includes(qq)))
    .sort((a, b) => b.updated - a.updated)
    .slice(0, 8);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/35 pt-[16vh] backdrop-blur-[2px]" onMouseDown={onClose}>
      <div className="w-[440px] max-w-[92vw] overflow-hidden rounded-2xl" style={{ background: C.paper, border: `1px solid ${C.line}`, boxShadow: '0 30px 70px -20px rgba(46,28,10,.45)' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                if (list[0]) onPick(list[0].id, list[0].title); else if (q.trim()) onCreate(q.trim());
              }
            }}
            placeholder="연결할 문서 검색 (서재 전체)…"
            className="w-full bg-transparent outline-none"
            style={{ fontSize: 14, fontWeight: 600, color: C.ink }}
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1.5">
          {list.map((d) => {
            const b = bookOf.get(d.book);
            return (
              <button key={d.id} type="button" onClick={() => onPick(d.id, d.title)} className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-[rgba(48,95,76,.07)]">
                <span aria-hidden className="h-[15px] w-[5px] shrink-0 rounded-[1.5px]" style={{ background: b?.tint ?? C.rust }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate" style={{ fontSize: 13.5, fontWeight: 700 }}>{d.title || '무제'}</span>
                  <span className="block truncate" style={{ fontSize: 11, color: C.muted }}>『{b?.title ?? '?'}』</span>
                </span>
              </button>
            );
          })}
          {q.trim() && (
            <button type="button" onClick={() => onCreate(q.trim())} className="mt-0.5 flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left font-bold transition-colors hover:bg-[rgba(48,95,76,.07)]" style={{ color: C.green, fontSize: 13 }}>
              <Plus className="h-4 w-4" /> '{q.trim()}' 새 문서 만들고 연결
            </button>
          )}
          {!list.length && !q.trim() && <p className="px-3 py-4 text-center" style={{ fontSize: 12.5, color: C.muted }}>문서 제목을 검색해보세요</p>}
        </div>
      </div>
    </div>
  );
}
