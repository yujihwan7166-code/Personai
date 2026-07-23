/**
 * 마이위키 (/wiki) — v4 "서재와 책들".
 *
 * 구조: 서재(책장) → 책(표지 있는 컨테이너) → 문서(책 안 무한 parent 트리).
 *  - 링크는 책 경계 없이(서재 = 한 지식망). 다른 책 문서로 가면 그 책이 열린다.
 *  - 쓰기 = 올인원 노트와 같은 Plate 에디터. 읽기 = 위키 뷰(목차·인포박스·백링크).
 *  - 문서는 기본 '읽기'로 열리고, 새 문서만 바로 편집으로.
 * 재질: 플럼 서재 — 책상 위 책장, 책등, 흰 책 페이지. 저장 'mywiki.v4'(v3·v2 자동 이관).
 */
import { Suspense, lazy, useMemo, useRef, useState, useEffect } from 'react';
import { BookOpen, ChevronRight, Link2, Pencil, Pin, Plus, Search, Star, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { newId } from '@/lib/idGenerator';
import type { Value } from 'platejs';
import {
  loadWiki, saveWiki, seedIfEmpty, emptyBody, linkedDocIds, bodyText, BOOK_PALETTE,
  type WikiBook, type WikiDoc, type WikiStore, type InfoboxRow,
} from '@/lib/wiki3/store';
import { childrenOf, ancestorsOf, focusView, moveOptions, deleteWithPromotion } from '@/lib/wiki3/tree';
import type { WikiEditorApi } from '@/components/wiki3/WikiDocEditor';

const WikiDocEditor = lazy(() => import('@/components/wiki3/WikiDocEditor').then((m) => ({ default: m.WikiDocEditor })));
const WikiDocReader = lazy(() => import('@/components/wiki3/WikiDocReader').then((m) => ({ default: m.WikiDocReader })));

/* 플럼 서재 팔레트 — 배경은 책상, 문서는 흰 책 페이지, 제목만 세리프(고운바탕). */
const P = {
  page: '#f8f1f6', paper: '#f4e9f0', line: '#eadde6',
  accent: '#8b3d6e', cta: '#93406f', ctaHover: '#7d3560',
  sub: '#a77b97', ink: '#23262b', muted: '#8d949d',
};
const TF = "'Gowun Batang', 'Pretendard Variable', serif";
const WIKI_CSS = `
.wiki-theme a[href^="wiki://"] {
  color: #8b3d6e; font-weight: 600;
  text-decoration: underline; text-underline-offset: 3px;
  text-decoration-color: rgba(139,61,110,0.4); text-decoration-thickness: 1.5px;
}
.wiki-theme a[href^="wiki://"]:hover { text-decoration-color: #8b3d6e; }
.wiki-theme .wiki-spine { transition: transform 180ms ease, box-shadow 180ms ease; }
.wiki-theme .wiki-spine:hover { transform: translateY(-7px); box-shadow: 0 18px 28px -16px rgba(60,20,45,0.55); }
@media (prefers-reduced-motion: reduce) { .wiki-theme .wiki-spine, .wiki-theme .wiki-spine:hover { transition: none; transform: none; } }

/* 읽기 뷰 — 제목이 위키의 괘선 문법을 입는다 (편집 뷰는 노트 그대로) */
.wiki-theme .wiki-read h1, .wiki-theme .wiki-read h2 {
  font-family: 'Gowun Batang', 'Pretendard Variable', serif;
  border-bottom: 1px solid #eadde6;
  padding-bottom: 0.3em;
}
.wiki-theme .wiki-read h3 { font-family: 'Gowun Batang', 'Pretendard Variable', serif; }
.wiki-theme .wiki-read blockquote { border-left-color: rgba(139,61,110,0.45); }
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

const fmtRel = (ts: number) => {
  const d = Date.now() - ts, m = 60000, h = 3600000, day = 86400000;
  if (d < m) return '방금 전';
  if (d < h) return `${Math.floor(d / m)}분 전`;
  if (d < day) return `${Math.floor(d / h)}시간 전`;
  if (d < 7 * day) return `${Math.floor(d / day)}일 전`;
  const dt = new Date(ts);
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일`;
};

export default function Wiki() {
  const [store, setStore] = useState<WikiStore>(() => seedIfEmpty(loadWiki()));
  const [bookId, setBookId] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [mode, setMode] = useState<'read' | 'edit'>('read');
  const [q, setQ] = useState('');
  const [picker, setPicker] = useState<{ text: string } | null>(null);
  const [bookDialog, setBookDialog] = useState<{ book: WikiBook | null } | null>(null);
  const editorApi = useRef<WikiEditorApi | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const readBodyRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);

  const { books, docs, recent } = store;
  const book = bookId ? books.find((b) => b.id === bookId) ?? null : null;
  const bookDocs = useMemo(() => (bookId ? docs.filter((d) => d.book === bookId) : []), [docs, bookId]);
  const active = docId ? docs.find((d) => d.id === docId) ?? null : null;

  useEffect(() => { saveWiki(store); }, [store]);

  /* '/' → 검색 포커스 (입력·에디터 밖에서만) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase() ?? '';
      if (e.key === '/' && tag !== 'input' && tag !== 'textarea' && tag !== 'select' && !t?.isContentEditable) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const top = () => { if (mainRef.current) mainRef.current.scrollTop = 0; };

  /* ── 이동 ── */
  const goShelf = () => { setBookId(null); setDocId(null); setQ(''); top(); };
  const openBook = (id: string) => { setBookId(id); setDocId(null); setQ(''); top(); };
  const openDoc = (id: string, opts: { edit?: boolean } = {}) => {
    const d = docs.find((x) => x.id === id);
    if (!d) return;
    setBookId(d.book);
    setDocId(id);
    setMode(opts.edit ? 'edit' : 'read');
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
  const createDoc = (parent: string | null) => {
    if (!bookId) return;
    const d: WikiDoc = { id: newId('wk'), book: bookId, title: '', parent, tags: [], pinned: false, updated: Date.now(), body: emptyBody() };
    setStore((s) => ({ ...s, docs: [...s.docs, d], recent: [d.id, ...s.recent].slice(0, 10) }));
    setDocId(d.id); setMode('edit'); setQ(''); top();
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
    if (d.parent) openDoc(d.parent); else { setDocId(null); }
  };

  /* ── 파생 ── */
  const focus = useMemo(() => focusView(bookDocs, docId), [bookDocs, docId]);
  const crumbs = useMemo(() => (active ? ancestorsOf(bookDocs, active.id) : []), [bookDocs, active]);
  const kids = useMemo(() => (active ? childrenOf(bookDocs, active.id) : []), [bookDocs, active]);
  const backlinks = useMemo(
    () => (active ? docs.filter((d) => d.id !== active.id && linkedDocIds(d.body).includes(active.id)) : []),
    [docs, active],
  );
  const toc = useMemo(() => (active ? tocOf(active.body) : []), [active]);
  const pinnedDocs = useMemo(() => bookDocs.filter((d) => d.pinned), [bookDocs]);
  const recentDocs = useMemo(
    () => recent.map((id) => docs.find((d) => d.id === id)).filter((d): d is WikiDoc => !!d).slice(0, 6),
    [recent, docs],
  );
  const bookOf = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);
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
    host.querySelectorAll('h1, h2, h3')[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ── 사이드바 행 ── */
  const docRow = (d: WikiDoc, opts: { indent?: boolean; activeRow?: boolean } = {}) => (
    <button
      key={d.id} type="button" onClick={() => openDoc(d.id)}
      className={cn(
        'flex h-[34px] w-full items-center gap-2 rounded-[9px] px-2.5 text-left text-[13.5px] transition-colors',
        opts.indent && 'pl-7',
        opts.activeRow ? 'bg-[#8b3d6e]/[0.12] font-bold text-[#8b3d6e]' : 'font-medium text-[#3d3742] hover:bg-white/60',
      )}
    >
      <span className="min-w-0 flex-1 truncate">{d.title || '무제'}</span>
      {d.pinned && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
    </button>
  );

  return (
    <div className="wiki-theme flex h-dvh text-[#23262b]" style={{ background: P.page }}>
      <style>{WIKI_CSS}</style>

      {/* ══════ 사이드바 ══════ */}
      <aside className="hidden w-[264px] shrink-0 flex-col overflow-y-auto border-r px-3.5 py-5 sm:flex" style={{ background: P.paper, borderColor: P.line }}>
        <button type="button" onClick={goShelf} className="flex items-center gap-[11px] px-1.5 text-left">
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-white text-[17px] shadow-[0_1px_2px_rgba(90,40,70,0.09)]" role="img" aria-label="마이위키">📖</span>
          <span className="min-w-0">
            <span className="block text-[16px] font-bold leading-tight tracking-[-0.01em] text-[#191c20]">마이위키</span>
            <span className="block truncate text-[12px] leading-tight" style={{ color: P.sub }}>{books.length ? `책 ${books.length}권의 서재` : '나만의 서재'}</span>
          </span>
        </button>

        {/* CTA — 서재에선 새 책, 책 안에선 새 문서 */}
        {book ? (
          <button
            type="button" onClick={() => createDoc(active ? active.id : null)}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[14px] font-bold text-white shadow-sm transition-colors"
            style={{ background: P.cta }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = P.ctaHover; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = P.cta; }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} /> {active ? '여기 아래 새 문서' : '새 문서'}
          </button>
        ) : (
          <button
            type="button" onClick={() => setBookDialog({ book: null })}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[14px] font-bold text-white shadow-sm transition-colors"
            style={{ background: P.cta }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = P.ctaHover; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = P.cta; }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} /> 새 책
          </button>
        )}

        {/* 검색 — 서재 전체 */}
        <div className="mt-3 flex items-center gap-2 rounded-[10px] border bg-white/70 px-2.5 py-1.5" style={{ borderColor: P.line }}>
          <Search className="h-3.5 w-3.5 shrink-0" style={{ color: P.sub }} />
          <input
            ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="서재 전체 검색"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-[#b9a3af]"
          />
          {q ? (
            <button type="button" onClick={() => setQ('')} className="shrink-0 text-[#b9a3af] hover:text-[#8b3d6e]" aria-label="검색 지우기"><X className="h-3.5 w-3.5" /></button>
          ) : (
            <kbd className="shrink-0 rounded border px-1 text-[10px]" style={{ borderColor: P.line, color: P.sub }}>/</kbd>
          )}
        </div>

        {book ? (
          <>
            {/* 현재 책 */}
            <div className="mb-[5px] mt-[18px] px-2.5 text-[11.5px] font-semibold tracking-[0.05em]" style={{ color: P.sub }}>지금 펼친 책</div>
            <button type="button" onClick={() => openBook(book.id)} className="flex h-[36px] w-full items-center gap-2.5 rounded-[9px] px-2.5 text-left transition-colors hover:bg-white/60">
              <span aria-hidden className="h-[22px] w-[7px] shrink-0 rounded-[2px]" style={{ background: book.tint }} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-bold" style={{ fontFamily: TF }}>{book.title}</span>
            </button>
            <button type="button" onClick={goShelf} className="mt-0.5 flex h-[28px] w-full items-center gap-1.5 rounded-[9px] px-2.5 text-left text-[12px] font-semibold transition-colors hover:bg-white/60" style={{ color: P.sub }}>
              ← 책장으로
            </button>

            {/* 포커스 트리 (책 안) */}
            <div className="mb-[5px] mt-[16px] px-2.5 text-[11.5px] font-semibold tracking-[0.05em]" style={{ color: P.sub }}>
              {active ? '문서 위치' : '이 책의 문서'}
            </div>
            <nav className="flex flex-col gap-0.5" aria-label="문서 트리">
              {focus.parent ? (
                <button type="button" onClick={() => openDoc(focus.parent!.id)} className="flex h-[30px] items-center gap-1.5 rounded-[9px] px-2.5 text-left text-[12.5px] font-semibold text-[#6b5f6a] transition-colors hover:bg-white/60">
                  ← {focus.parent.title || '무제'}
                </button>
              ) : active ? (
                <button type="button" onClick={() => openBook(book.id)} className="flex h-[30px] items-center gap-1.5 rounded-[9px] px-2.5 text-left text-[12.5px] font-semibold text-[#6b5f6a] transition-colors hover:bg-white/60">
                  ← 책 차례
                </button>
              ) : null}
              {focus.siblings.map((d) => (
                <div key={d.id}>
                  {docRow(d, { activeRow: d.id === docId })}
                  {d.id === docId && focus.children.map((c) => docRow(c, { indent: true }))}
                  {d.id === docId && (
                    <button type="button" onClick={() => createDoc(d.id)} className="flex h-[28px] w-full items-center gap-2 rounded-[9px] px-2.5 pl-7 text-left text-[12px] font-medium transition-colors hover:bg-white/60" style={{ color: P.sub }}>
                      <Plus className="h-3 w-3" /> 하위 문서
                    </button>
                  )}
                </div>
              ))}
              {focus.siblings.length === 0 && !active && (
                <p className="px-2.5 py-2 text-[12px]" style={{ color: P.sub }}>이 책은 아직 비어 있어요.</p>
              )}
            </nav>

            {pinnedDocs.length > 0 && (
              <>
                <div className="mb-[5px] mt-[18px] px-2.5 text-[11.5px] font-semibold tracking-[0.05em]" style={{ color: P.sub }}>고정됨</div>
                {pinnedDocs.map((d) => docRow(d, { activeRow: d.id === docId }))}
              </>
            )}
          </>
        ) : (
          <>
            {/* 책 목록 */}
            <div className="mb-[5px] mt-[18px] px-2.5 text-[11.5px] font-semibold tracking-[0.05em]" style={{ color: P.sub }}>책장</div>
            {books.map((b) => {
              const n = docs.filter((d) => d.book === b.id).length;
              return (
                <button key={b.id} type="button" onClick={() => openBook(b.id)} className="flex h-[36px] w-full items-center gap-2.5 rounded-[9px] px-2.5 text-left transition-colors hover:bg-white/60">
                  <span aria-hidden className="h-[22px] w-[7px] shrink-0 rounded-[2px]" style={{ background: b.tint }} />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-[#3d3742]">{b.title}</span>
                  <span className="shrink-0 text-[11px]" style={{ color: P.sub }}>{n}</span>
                </button>
              );
            })}
            {books.length === 0 && <p className="px-2.5 py-2 text-[12px]" style={{ color: P.sub }}>첫 책을 만들어 서재를 열어요.</p>}
          </>
        )}

        {recentDocs.length > 0 && (
          <>
            <div className="mb-[5px] mt-[18px] px-2.5 text-[11.5px] font-semibold tracking-[0.05em]" style={{ color: P.sub }}>최근 본 문서</div>
            {recentDocs.map((d) => docRow(d, { activeRow: d.id === docId }))}
          </>
        )}

        <div className="mt-auto pt-4 text-center text-[11px]" style={{ color: P.sub }}>책 {books.length} · 문서 {docs.length}</div>
      </aside>

      {/* ══════ 메인 ══════ */}
      <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[880px] px-5 pb-16 pt-8 sm:px-8">
          {qq ? (
            /* ── 검색 (서재 전체) ── */
            <>
              <Masthead eyebrow="SEARCH" title={`'${q.trim()}'`} sub={`${results.length}개의 문서`} />
              <div className="mt-5 flex flex-col gap-2.5">
                {results.map(({ d, text }) => {
                  const b = bookOf.get(d.book);
                  return (
                    <button key={d.id} type="button" onClick={() => openDoc(d.id)} className="rounded-[14px] border bg-white p-4 text-left transition-shadow hover:shadow-[0_10px_24px_-16px_rgba(90,40,70,0.3)]" style={{ borderColor: P.line }}>
                      <div className="flex items-center gap-2 text-[12px]" style={{ color: P.sub }}>
                        <span aria-hidden className="h-[13px] w-[5px] shrink-0 rounded-[1.5px]" style={{ background: b?.tint ?? P.accent }} />
                        {b?.title ?? '?'}{ancestorsOf(docs.filter((x) => x.book === d.book), d.id).map((a) => ` › ${a.title}`).join('')}
                      </div>
                      <div className="mt-1 text-[16px] font-bold">{d.title || '무제'}</div>
                      <div className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed" style={{ color: P.muted }}>{text.slice(0, 140)}</div>
                    </button>
                  );
                })}
                {results.length === 0 && (
                  <p className="py-14 text-center text-[14px]" style={{ color: P.muted }}>일치하는 문서가 없어요</p>
                )}
              </div>
            </>
          ) : active && book ? (
            /* ── 문서 ── */
            <>
              {/* 빵가루: 책장 › 책 › … › 문서 */}
              <div className="flex flex-wrap items-center gap-1 text-[12.5px]" style={{ color: P.sub }}>
                <button type="button" onClick={goShelf} className="font-semibold hover:underline" style={{ color: P.sub }}>책장</button>
                <ChevronRight className="h-3 w-3 opacity-60" />
                <button type="button" onClick={() => openBook(book.id)} className="font-semibold hover:underline" style={{ color: book.tint }}>{book.title}</button>
                {crumbs.map((c) => (
                  <span key={c.id} className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3 opacity-60" />
                    <button type="button" onClick={() => openDoc(c.id)} className="font-semibold hover:underline" style={{ color: P.sub }}>{c.title || '무제'}</button>
                  </span>
                ))}
                <ChevronRight className="h-3 w-3 opacity-60" />
                <span className="font-bold" style={{ color: P.accent }}>{active.title || '무제'}</span>
              </div>

              {mode === 'read' ? (
                /* ═══ 읽기 — 위키 뷰 ═══ */
                <article className="relative mt-3 rounded-[18px] border bg-white px-6 py-7 shadow-[0_14px_34px_-24px_rgba(90,40,70,0.4)] sm:px-9 sm:py-9" style={{ borderColor: P.line }}>
                  {active.pinned && (
                    <span aria-hidden className="absolute right-8 top-0 h-[34px] w-[16px]" style={{ background: book.tint, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 74%, 0 100%)' }} title="고정된 문서" />
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <h1 className="min-w-0 text-[32px] font-bold leading-tight tracking-[-0.01em]" style={{ fontFamily: TF }}>
                      {active.title || '무제'}
                    </h1>
                    <button
                      type="button" onClick={() => setMode('edit')}
                      className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold text-white transition-colors"
                      style={{ background: P.cta }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = P.ctaHover; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = P.cta; }}
                    >
                      <Pencil className="h-3 w-3" /> 편집
                    </button>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]" style={{ color: P.sub }}>
                    {active.tags.map((t) => <span key={t} className="rounded-full bg-[#8b3d6e]/[0.08] px-2 py-0.5 font-semibold text-[#8b3d6e]">#{t}</span>)}
                    {active.tags.length > 0 && <span className="opacity-40">·</span>}
                    <span>{fmtRel(active.updated)} 갱신</span>
                  </div>

                  <div className="my-5 h-px" style={{ background: `linear-gradient(90deg, ${P.line} 60%, transparent)` }} />

                  {/* 인포박스 — 위키의 요약 카드 (오른쪽 흘림) */}
                  {active.infobox && active.infobox.length > 0 && (
                    <aside className="mb-4 w-full rounded-[12px] border sm:float-right sm:mb-3 sm:ml-6 sm:w-[240px]" style={{ borderColor: P.line, background: P.paper }}>
                      <div className="rounded-t-[11px] px-3.5 py-2 text-center text-[13px] font-bold text-white" style={{ background: book.tint, fontFamily: TF }}>
                        {active.title || '무제'}
                      </div>
                      <dl className="px-3.5 py-2.5">
                        {active.infobox.map((row, i) => (
                          <div key={i} className="flex gap-2.5 border-b py-1.5 text-[12px] last:border-0" style={{ borderColor: P.line }}>
                            <dt className="w-[68px] shrink-0 font-bold" style={{ color: P.sub }}>{row.label}</dt>
                            <dd className="min-w-0 flex-1 break-words">{row.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </aside>
                  )}

                  {/* 목차 — 제목 블록 2개부터 */}
                  {toc.length >= 2 && (
                    <nav className="mb-5 inline-block min-w-[180px] rounded-[12px] border px-4 py-3" style={{ borderColor: P.line, background: P.paper }} aria-label="목차">
                      <p className="mb-1.5 text-[11.5px] font-bold tracking-[0.08em]" style={{ color: P.sub }}>목차</p>
                      <ol className="space-y-1">
                        {toc.map((h, i) => (
                          <li key={i} style={{ paddingLeft: (h.level - 1) * 12 }}>
                            <button type="button" onClick={() => scrollToHeading(i)} className="text-left text-[13px] font-semibold hover:underline" style={{ color: P.accent }}>
                              {h.text}
                            </button>
                          </li>
                        ))}
                      </ol>
                    </nav>
                  )}

                  {/* 본문 (읽기 전용 — 편집기와 같은 엔진, 위키 괘선 타이포) */}
                  <div className="wiki-read">
                    <Suspense fallback={<p className="py-10 text-center text-[12.5px]" style={{ color: P.sub }}>문서를 펼치는 중…</p>}>
                      <WikiDocReader key={`${active.id}-${active.updated}`} value={active.body} onOpenDoc={openDoc} containerRef={readBodyRef} />
                    </Suspense>
                  </div>

                  <div className="clear-both" />
                </article>
              ) : (
                /* ═══ 편집 — 노트와 같은 경험 ═══ */
                <div className="relative mt-3 rounded-[18px] border bg-white px-6 py-6 shadow-[0_14px_34px_-24px_rgba(90,40,70,0.4)] sm:px-9 sm:py-8" style={{ borderColor: P.line }}>
                  <div className="flex items-start justify-between gap-4">
                    <input
                      key={`t-${active.id}`}
                      defaultValue={active.title}
                      onBlur={(e) => patchDoc(active.id, { title: e.target.value.trim() })}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) (e.target as HTMLInputElement).blur(); }}
                      placeholder="문서 제목"
                      className="w-full bg-transparent text-[30px] font-bold leading-tight tracking-[-0.01em] outline-none placeholder:text-[#c9b3c1]"
                      style={{ fontFamily: TF }}
                    />
                    <button
                      type="button" onClick={() => setMode('read')}
                      className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-bold text-white transition-colors"
                      style={{ background: P.ink }}
                    >
                      <BookOpen className="h-3 w-3" /> 읽기
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                    <TagEditor tags={active.tags} onChange={(tags) => patchDoc(active.id, { tags })} />
                    <span className="opacity-40">·</span>
                    <select
                      value={active.parent ?? ''}
                      onChange={(e) => patchDoc(active.id, { parent: e.target.value || null })}
                      className="rounded-[8px] border bg-white px-2 py-1 text-[12px] outline-none"
                      style={{ borderColor: P.line, color: '#6b5f6a' }}
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
                      className={cn('flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold transition-colors', active.pinned ? 'border-amber-300 bg-amber-50 text-amber-600' : 'bg-white text-[#8d949d] hover:text-[#6b5f6a]')}
                      style={active.pinned ? undefined : { borderColor: P.line }}
                    >
                      <Pin className="h-3 w-3" /> {active.pinned ? '고정됨' : '고정'}
                    </button>
                    <button type="button" onClick={() => removeDoc(active.id)} className="flex items-center gap-1 rounded-full border bg-white px-2.5 py-1 font-semibold text-[#8d949d] transition-colors hover:border-rose-300 hover:text-rose-500" style={{ borderColor: P.line }}>
                      <Trash2 className="h-3 w-3" /> 삭제
                    </button>
                    <span className="ml-auto text-[11.5px]" style={{ color: P.sub }}>{fmtRel(active.updated)} 저장</span>
                  </div>

                  {/* 인포박스 편집 */}
                  <InfoboxEditor rows={active.infobox ?? []} onChange={(rows) => patchDoc(active.id, { infobox: rows.length ? rows : undefined })} />

                  <div className="my-5 h-px" style={{ background: `linear-gradient(90deg, ${P.line} 60%, transparent)` }} />

                  <Suspense fallback={<p className="py-10 text-center text-[12.5px]" style={{ color: P.sub }}>편집기를 여는 중…</p>}>
                    <WikiDocEditor
                      key={active.id}
                      initialValue={active.body}
                      onChange={(v) => onBodyChange(active.id, v)}
                      onOpenDoc={openDoc}
                      onLinkRequest={(text) => setPicker({ text })}
                      apiRef={editorApi}
                    />
                  </Suspense>
                </div>
              )}

              {/* 하위 문서 */}
              <div className="mt-10">
                <div className="mb-2 flex items-center gap-2 text-[12px] font-bold tracking-[0.08em]" style={{ color: P.sub }}>
                  하위 문서 {kids.length > 0 && <span className="font-semibold opacity-70">{kids.length}</span>}
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {kids.map((d) => (
                    <button key={d.id} type="button" onClick={() => openDoc(d.id)} className="rounded-[13px] border bg-white p-3.5 text-left transition-shadow hover:shadow-[0_10px_22px_-16px_rgba(90,40,70,0.3)]" style={{ borderColor: P.line }}>
                      <div className="text-[14.5px] font-bold">{d.title || '무제'}</div>
                      <div className="mt-0.5 line-clamp-1 text-[12px]" style={{ color: P.muted }}>{bodyText(d.body).slice(0, 70) || '빈 문서'}</div>
                    </button>
                  ))}
                  <button type="button" onClick={() => createDoc(active.id)} className="flex min-h-[64px] items-center justify-center gap-1.5 rounded-[13px] border border-dashed text-[13px] font-semibold transition-colors hover:bg-white" style={{ borderColor: P.line, color: P.sub }}>
                    <Plus className="h-3.5 w-3.5" /> 하위 문서
                  </button>
                </div>
              </div>

              {/* 백링크 — 책 경계 없이 */}
              {backlinks.length > 0 && (
                <div className="mt-8 rounded-[14px] border p-4" style={{ borderColor: P.line, background: P.paper }}>
                  <div className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold tracking-[0.08em]" style={{ color: P.sub }}>
                    <Link2 className="h-3 w-3" /> 이 문서를 언급한 문서
                  </div>
                  <div className="flex flex-col gap-1">
                    {backlinks.map((b) => {
                      const bb = bookOf.get(b.book);
                      return (
                        <button key={b.id} type="button" onClick={() => openDoc(b.id)} className="flex items-center gap-2 rounded-[9px] px-2 py-1.5 text-left transition-colors hover:bg-white/70">
                          <span aria-hidden className="h-[13px] w-[5px] shrink-0 rounded-[1.5px]" style={{ background: bb?.tint ?? P.accent }} />
                          <span className="min-w-0 truncate text-[13.5px] font-semibold">{b.title || '무제'}</span>
                          {b.book !== active.book && <span className="shrink-0 text-[11px]" style={{ color: P.sub }}>『{bb?.title ?? '?'}』</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : book ? (
            /* ── 책 차례 ── */
            <BookHome
              book={book} docs={bookDocs} allDocs={docs}
              onOpenDoc={(id) => openDoc(id)}
              onCreate={(parent) => createDoc(parent)}
              onEditBook={() => setBookDialog({ book })}
              goShelf={goShelf}
            />
          ) : (
            /* ── 책장 (서재 홈) ── */
            <>
              <Masthead eyebrow="MY LIBRARY" title="마이위키" sub={books.length ? `책 ${books.length}권 · 문서 ${docs.length}개` : '첫 책으로 서재를 열어보세요'} />

              {/* 책장 — 시그니처. 칸이 있는 실제 서가: 책등 높이는 문서 수를 따르고, 아래엔 청구기호 스티커 */}
              <section className="mt-8">
                <Bookshelf
                  books={books}
                  countOf={(id) => docs.filter((d) => d.book === id).length}
                  onOpenBook={openBook}
                  onNewBook={() => setBookDialog({ book: null })}
                />
                {books.length === 0 && (
                  <p className="mt-4 text-[12.5px] leading-relaxed" style={{ color: P.muted }}>
                    책 한 권이 하나의 세계예요 — 그 안에 문서를 층층이 쌓고, 책을 넘나들며 연결하세요.
                  </p>
                )}
              </section>

              {recentDocs.length > 0 && (
                <section className="mt-10">
                  <h2 className="mb-2 text-[12px] font-bold tracking-[0.08em]" style={{ color: P.sub }}>최근 본 문서</h2>
                  <div className="flex flex-col">
                    {recentDocs.map((d) => {
                      const b = bookOf.get(d.book);
                      return (
                        <button key={d.id} type="button" onClick={() => openDoc(d.id)} className="flex items-center gap-2.5 border-b px-1 py-2.5 text-left transition-colors last:border-0 hover:bg-white/60" style={{ borderColor: P.line }}>
                          <span aria-hidden className="h-[15px] w-[5px] shrink-0 rounded-[1.5px]" style={{ background: b?.tint ?? P.accent }} />
                          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{d.title || '무제'}</span>
                          <span className="shrink-0 text-[11.5px]" style={{ color: P.sub }}>『{b?.title ?? '?'}』</span>
                          <span className="shrink-0 text-[11.5px]" style={{ color: P.muted }}>{fmtRel(d.updated)}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {/* 문서 연결 피커 — 서재 전체에서 */}
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

      {/* 책 만들기·정보 고치기 */}
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

/* ── 책장 — 칸(선반)마다 책 8권. 책등 높이 = 문서가 쌓일수록 두꺼운 책 ── */
function Bookshelf({ books, countOf, onOpenBook, onNewBook }: {
  books: WikiBook[];
  countOf: (bookId: string) => number;
  onOpenBook: (id: string) => void;
  onNewBook: () => void;
}) {
  const PER_SHELF = 8;
  const shelves: WikiBook[][] = [];
  for (let i = 0; i < books.length; i += PER_SHELF) shelves.push(books.slice(i, i + PER_SHELF));
  if (shelves.length === 0) shelves.push([]);

  const spine = (b: WikiBook) => {
    const n = countOf(b.id);
    const h = 160 + Math.min(36, n * 5);          // 문서가 쌓일수록 큰 책
    const w = 50 + Math.min(14, Math.max(0, b.title.length - 2) * 3); // 제목이 길면 조금 두껍게
    return (
      <button
        key={b.id} type="button" onClick={() => onOpenBook(b.id)}
        className="wiki-spine relative flex flex-col items-center overflow-hidden rounded-t-[5px] rounded-b-[2px] pb-2 pt-3 text-white"
        style={{
          height: h, width: w,
          background: `linear-gradient(105deg, ${b.tint} 0%, ${b.tint} 74%, rgba(0,0,0,0.22) 100%)`,
          boxShadow: 'inset 2px 0 0 rgba(255,255,255,0.14), 0 6px 12px -8px rgba(60,20,45,0.4)',
        }}
        title={b.intro || b.title}
      >
        {/* 헤드밴드(제본 띠) */}
        <span aria-hidden className="absolute inset-x-0 top-0 h-[6px] bg-white/22" />
        <span aria-hidden className="absolute inset-x-0 top-[8px] h-px bg-white/35" />
        <span
          className="mt-2 min-h-0 flex-1 overflow-hidden text-[14px] font-bold leading-[1.2] [text-orientation:upright] [writing-mode:vertical-rl]"
          style={{ fontFamily: TF, textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
        >
          {b.title || '무제'}
        </span>
        {/* 청구기호 스티커 — 도서관의 그 흰 라벨 */}
        <span aria-hidden className="mt-1.5 flex h-[17px] w-[72%] shrink-0 items-center justify-center rounded-[2px] bg-[#fdfaf7] text-[9.5px] font-bold tracking-wide text-[#5c5560] shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
          {String(countOf(b.id)).padStart(3, '0')}
        </span>
      </button>
    );
  };

  return (
    <div className="rounded-[14px] px-4 pt-5 sm:px-6" style={{ background: 'linear-gradient(180deg, #f3e6ee 0%, #efe0e9 100%)', boxShadow: 'inset 0 2px 10px rgba(90,40,70,0.07)' }}>
      {shelves.map((row, si) => (
        <div key={si} className="flex items-end gap-x-2 border-b-[9px] pb-0 pt-3" style={{ borderColor: '#d9c2d0', borderBottomStyle: 'solid' }}>
          {row.map(spine)}
          {/* 마지막 칸 끝에 빈 자리 = 새 책 */}
          {si === shelves.length - 1 && (
            <button
              type="button" onClick={onNewBook}
              className="flex h-[164px] w-[50px] flex-col items-center justify-center gap-1.5 rounded-t-[5px] border border-b-0 border-dashed text-[11px] font-bold transition-colors hover:bg-white/60"
              style={{ borderColor: '#cdb2c4', color: P.sub }}
              title="새 책"
            >
              <Plus className="h-4 w-4" />
              <span className="[writing-mode:vertical-rl]" style={{ fontFamily: TF }}>새 책</span>
            </button>
          )}
        </div>
      ))}
      <div className="h-4" aria-hidden />
    </div>
  );
}

/* ── 책 차례 화면 — 표지 + 문서 트리 ── */
function BookHome({ book, docs, allDocs, onOpenDoc, onCreate, onEditBook, goShelf }: {
  book: WikiBook; docs: WikiDoc[]; allDocs: WikiDoc[];
  onOpenDoc: (id: string) => void;
  onCreate: (parent: string | null) => void;
  onEditBook: () => void;
  goShelf: () => void;
}) {
  /* 차례 = 트리 걷기 (들여쓰기) */
  const rows: { d: WikiDoc; depth: number }[] = [];
  const walk = (parent: string | null, depth: number, seen: Set<string>) => {
    for (const d of childrenOf(docs, parent)) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      rows.push({ d, depth });
      walk(d.id, depth + 1, seen);
    }
  };
  walk(null, 0, new Set());

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 text-[12.5px]" style={{ color: P.sub }}>
        <button type="button" onClick={goShelf} className="font-semibold hover:underline" style={{ color: P.sub }}>책장</button>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="font-bold" style={{ color: book.tint }}>{book.title}</span>
      </div>

      {/* 표지 머리 — 미니 책 + 제목 + 소개 */}
      <div className="mt-4 flex items-center gap-5">
        <span aria-hidden className="relative flex h-[92px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-[4px_8px_8px_4px] text-[26px] font-bold text-white shadow-[0_10px_20px_-12px_rgba(60,20,45,0.55)]" style={{ background: `linear-gradient(105deg, ${book.tint} 0%, ${book.tint} 80%, rgba(0,0,0,0.18) 100%)`, fontFamily: TF }}>
          <span className="absolute inset-y-0 left-[7px] w-px bg-white/30" />
          <span className="absolute inset-y-0 left-0 w-[7px] bg-black/15" />
          {book.title.trim().charAt(0) || '?'}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.01em]" style={{ fontFamily: TF }}>{book.title}</h1>
          <p className="mt-1 text-[13.5px]" style={{ color: book.intro ? P.muted : P.sub }}>
            {book.intro || `문서 ${docs.length}개`}
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => onCreate(null)} className="rounded-full px-3.5 py-1.5 text-[12.5px] font-bold text-white" style={{ background: P.cta }}>
              + 새 문서
            </button>
            <button type="button" onClick={onEditBook} className="rounded-full border bg-white px-3.5 py-1.5 text-[12.5px] font-bold transition-colors hover:bg-[#f9f4f7]" style={{ borderColor: P.line, color: '#6b5f6a' }}>
              책 정보
            </button>
          </div>
        </div>
      </div>

      {/* 차례 */}
      <section className="mt-7">
        <h2 className="mb-2 text-[12px] font-bold tracking-[0.08em]" style={{ color: P.sub }}>차례</h2>
        {rows.length === 0 ? (
          <div className="rounded-[18px] border border-dashed py-14 text-center" style={{ borderColor: P.line }}>
            <p className="text-[15px] font-bold">아직 빈 책이에요</p>
            <p className="mt-1 text-[12.5px]" style={{ color: P.muted }}>첫 문서를 적으면 여기가 차례가 돼요.</p>
            <button type="button" onClick={() => onCreate(null)} className="mt-4 rounded-full px-5 py-2 text-[13px] font-bold text-white" style={{ background: P.cta }}>첫 문서 쓰기</button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[14px] border bg-white" style={{ borderColor: P.line }}>
            {rows.map(({ d, depth }) => (
              <button
                key={d.id} type="button" onClick={() => onOpenDoc(d.id)}
                className="flex w-full items-baseline gap-2.5 border-b px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-[#faf5f8]"
                style={{ borderColor: P.line, paddingLeft: 16 + depth * 22 }}
              >
                <span className={cn('min-w-0 truncate', depth === 0 ? 'text-[14.5px] font-bold' : 'text-[13.5px] font-medium text-[#3d3742]')}>
                  {d.title || '무제'}
                </span>
                {d.pinned && <Star className="h-3 w-3 shrink-0 self-center fill-amber-400 text-amber-400" />}
                <span className="ml-auto shrink-0 text-[11px]" style={{ color: P.muted }}>{fmtRel(d.updated)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 이 책을 언급한 다른 책 문서 */}
      <BookBacklinks book={book} docs={docs} allDocs={allDocs} onOpenDoc={onOpenDoc} />
    </>
  );
}

/** 다른 책에서 이 책의 문서로 건 링크 모음 — 책 차례 하단. */
function BookBacklinks({ book, docs, allDocs, onOpenDoc }: {
  book: WikiBook; docs: WikiDoc[]; allDocs: WikiDoc[]; onOpenDoc: (id: string) => void;
}) {
  const myIds = useMemo(() => new Set(docs.map((d) => d.id)), [docs]);
  const from = useMemo(
    () => allDocs.filter((d) => d.book !== book.id && linkedDocIds(d.body).some((id) => myIds.has(id))).slice(0, 6),
    [allDocs, book.id, myIds],
  );
  if (from.length === 0) return null;
  return (
    <section className="mt-8 rounded-[14px] border p-4" style={{ borderColor: P.line, background: P.paper }}>
      <div className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold tracking-[0.08em]" style={{ color: P.sub }}>
        <Link2 className="h-3 w-3" /> 다른 책에서 이 책으로
      </div>
      <div className="flex flex-col gap-1">
        {from.map((d) => (
          <button key={d.id} type="button" onClick={() => onOpenDoc(d.id)} className="flex items-center gap-2 rounded-[9px] px-2 py-1.5 text-left text-[13.5px] font-semibold transition-colors hover:bg-white/70">
            {d.title || '무제'}
          </button>
        ))}
      </div>
    </section>
  );
}

/* ── 마스트헤드 캐논 ── */
function Masthead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-bold tracking-[0.22em]" style={{ color: '#b294a6' }}>{eyebrow}</p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-[27px] font-bold leading-none tracking-[-0.01em] text-[#191c20]" style={{ fontFamily: TF }}>{title}</h1>
        <span className="text-[13.5px] text-[#8d949d]">{sub}</span>
      </div>
    </div>
  );
}

/* ── 인포박스 편집 — 편집 모드에서 접었다 펴는 요약 카드 ── */
function InfoboxEditor({ rows, onChange }: { rows: InfoboxRow[]; onChange: (rows: InfoboxRow[]) => void }) {
  const [open, setOpen] = useState(rows.length > 0);
  const set = (i: number, patch: Partial<InfoboxRow>) => onChange(rows.map((r, x) => (x === i ? { ...r, ...patch } : r)));
  return (
    <div className="mt-3 rounded-[12px] border" style={{ borderColor: P.line, background: '#fbf7fa' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[12px] font-bold" style={{ color: P.sub }}>
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
                className="w-[88px] rounded-[8px] border bg-white px-2 py-1.5 text-[12px] font-semibold outline-none" style={{ borderColor: P.line }}
              />
              <input
                value={r.value} onChange={(e) => set(i, { value: e.target.value })}
                placeholder="내용" aria-label={`인포박스 ${i + 1} 내용`}
                className="min-w-0 flex-1 rounded-[8px] border bg-white px-2 py-1.5 text-[12px] outline-none" style={{ borderColor: P.line }}
              />
              <button type="button" onClick={() => onChange(rows.filter((_, x) => x !== i))} aria-label="행 삭제" className="shrink-0 p-1 text-[#b9a3af] hover:text-rose-500">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => onChange([...rows, { label: '', value: '' }])} className="flex items-center gap-1 rounded-[8px] px-2 py-1 text-[12px] font-bold transition-colors hover:bg-white" style={{ color: P.accent }}>
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
        <button key={t} type="button" onClick={() => onChange(tags.filter((x) => x !== t))} title="태그 제거" className="rounded-full bg-[#8b3d6e]/[0.1] px-2 py-0.5 text-[11.5px] font-semibold text-[#8b3d6e] transition-colors hover:bg-[#8b3d6e]/[0.18]">
          #{t} ×
        </button>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder="+ 태그"
        className="w-[58px] bg-transparent text-[11.5px] outline-none placeholder:text-[#c9b3c1]"
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
      <div className="w-[420px] max-w-[92vw] rounded-[16px] border bg-white p-6 shadow-[0_30px_70px_-20px_rgba(60,20,45,0.45)]" style={{ borderColor: '#eddfe9' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-4">
          {/* 표지 미리보기 */}
          <span aria-hidden className="flex h-[84px] w-[58px] shrink-0 items-center justify-center rounded-[4px_8px_8px_4px] text-[24px] font-bold text-white shadow-[0_8px_16px_-10px_rgba(60,20,45,0.55)]" style={{ background: tint, fontFamily: TF }}>
            {title.trim().charAt(0) || '?'}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-bold">{book ? '책 정보' : '새 책'}</h3>
            <input
              autoFocus={!book}
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="책 제목"
              className="mt-2 w-full border-b bg-transparent pb-1 text-[15px] font-bold outline-none placeholder:text-[#c9b3c1]"
              style={{ borderColor: '#eadde6', fontFamily: TF }}
            />
            <input
              value={intro} onChange={(e) => setIntro(e.target.value)}
              placeholder="한 줄 소개 (선택)"
              className="mt-2 w-full border-b bg-transparent pb-1 text-[12.5px] outline-none placeholder:text-[#c9b3c1]"
              style={{ borderColor: '#eadde6' }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-[11.5px] font-bold" style={{ color: P.sub }}>책등 색</span>
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
            <button type="button" onClick={onDelete} className="text-[12.5px] font-semibold text-[#8d949d] underline-offset-4 transition-colors hover:text-rose-500 hover:underline">
              책 삭제
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-[13px] font-semibold" style={{ color: P.muted }}>취소</button>
            <button
              type="button" disabled={!valid}
              onClick={() => onSave({ id: book?.id, title: title.trim(), tint, intro: intro.trim() })}
              className={cn('rounded-full px-5 py-2 text-[13px] font-bold text-white', !valid && 'opacity-40')}
              style={{ background: P.cta }}
            >
              {book ? '저장' : '책 만들기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 문서 연결 피커 — 서재 전체 검색, 책 이름 표시 ── */
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
      <div className="w-[440px] max-w-[92vw] overflow-hidden rounded-[16px] border bg-white shadow-[0_30px_70px_-20px_rgba(60,20,45,0.45)]" style={{ borderColor: '#eddfe9' }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: '#eddfe9' }}>
          <Link2 className="h-4 w-4 shrink-0" style={{ color: '#8b3d6e' }} />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                if (list[0]) onPick(list[0].id, list[0].title); else if (q.trim()) onCreate(q.trim());
              }
            }}
            placeholder="연결할 문서 검색 (서재 전체)…"
            className="w-full bg-transparent text-[14px] font-semibold outline-none placeholder:text-[#c9b3c1]"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1.5">
          {list.map((d) => {
            const b = bookOf.get(d.book);
            return (
              <button key={d.id} type="button" onClick={() => onPick(d.id, d.title)} className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-[#8b3d6e]/[0.08]">
                <span aria-hidden className="h-[15px] w-[5px] shrink-0 rounded-[1.5px]" style={{ background: b?.tint ?? '#8b3d6e' }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-bold">{d.title || '무제'}</span>
                  <span className="block truncate text-[11px] text-[#8d949d]">『{b?.title ?? '?'}』</span>
                </span>
              </button>
            );
          })}
          {q.trim() && (
            <button type="button" onClick={() => onCreate(q.trim())} className="mt-0.5 flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-[13px] font-bold transition-colors hover:bg-[#8b3d6e]/[0.08]" style={{ color: '#8b3d6e' }}>
              <Plus className="h-4 w-4" /> '{q.trim()}' 새 문서 만들고 연결
            </button>
          )}
          {!list.length && !q.trim() && <p className="px-3 py-4 text-center text-[12.5px] text-[#8d949d]">문서 제목을 검색해보세요</p>}
        </div>
      </div>
    </div>
  );
}
