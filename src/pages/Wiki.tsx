/**
 * 마이위키 (/wiki) — "나만의 지식 서고" v3 전면 재구축.
 *
 * - 캐논 레이아웃: 264px 페이퍼 사이드바(락업+CTA+검색+포커스 트리) + 마스트헤드 문법.
 * - 문서 무한 중첩(parent 트리): 사이드바는 항상 부모/형제/자식 3단, 본문엔 빵가루.
 * - 본문 = 올인원 노트와 같은 Plate 에디터("/" 슬래시 삽입) — 항상 편집 상태, 자동 저장.
 * - 링크 = 문법 없음: 텍스트 드래그 → "문서로 연결" 버블 → 피커, 하위·백링크 자동.
 * - 색 = 플럼(자두) — 다른 방과 겹치지 않는 새 정체성.
 * - 저장: localStorage 'mywiki.v3' (v2 저장분 1회 자동 이관 — 분류→최상위 문서, [[링크]]→링크 노드).
 */
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Link2, Pin, Plus, Search, Star, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { newId } from '@/lib/idGenerator';
import type { Value } from 'platejs';
import {
  loadWiki, saveWiki, emptyBody, linkedDocIds, bodyText,
  type WikiDoc, type WikiStore,
} from '@/lib/wiki3/store';
import {
  childrenOf, ancestorsOf, focusView, moveOptions, deleteWithPromotion, colorOf, symOf,
} from '@/lib/wiki3/tree';
import type { WikiEditorApi } from '@/components/wiki3/WikiDocEditor';

const WikiDocEditor = lazy(() => import('@/components/wiki3/WikiDocEditor').then((m) => ({ default: m.WikiDocEditor })));

/* 플럼(자두) 팔레트 — 기존 방들과 겹치지 않는 새 정체성.
 * 재질 = "서재의 책": 배경은 플럼끼 도는 책상, 문서는 흰 책 페이지 시트, 제목만 세리프(고운바탕). */
const P = {
  page: '#f8f1f6', paper: '#f4e9f0', line: '#eadde6',
  accent: '#8b3d6e', accentDeep: '#7d3560', cta: '#93406f', ctaHover: '#7d3560',
  sub: '#a77b97', ink: '#23262b', muted: '#8d949d',
};
/** 위키 시그니처 세리프 — 제목·마스트헤드에만 (본문은 Pretendard 가독 유지). */
const TF = "'Gowun Batang', 'Pretendard Variable', serif";
/** 본문 속 문서 링크 = 잉크 밑줄. Plate LinkElement 기본색을 위키 톤으로 덮는다. */
const WIKI_CSS = `
.wiki-theme a[href^="wiki://"] {
  color: #8b3d6e; font-weight: 600;
  text-decoration: underline; text-underline-offset: 3px;
  text-decoration-color: rgba(139,61,110,0.4); text-decoration-thickness: 1.5px;
}
.wiki-theme a[href^="wiki://"]:hover { text-decoration-color: #8b3d6e; }
`;

export default function Wiki() {
  const [store, setStore] = useState<WikiStore>(loadWiki);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [picker, setPicker] = useState<{ text: string } | null>(null);
  const editorApi = useRef<WikiEditorApi | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const saveTimer = useRef<number | null>(null);

  const { docs, recent } = store;
  const active = activeId ? docs.find((d) => d.id === activeId) ?? null : null;

  /* 저장 스냅샷 */
  useEffect(() => { saveWiki(store); }, [store]);

  /* '/' → 사이드바 검색 (입력·에디터 안에서는 무시 — 에디터의 "/"는 슬래시 메뉴) */
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

  /* ── 액션 ── */
  const openDoc = (id: string) => {
    setStore((s) => ({ ...s, recent: [id, ...s.recent.filter((r) => r !== id)].slice(0, 10) }));
    setActiveId(id); setQ(''); top();
  };
  const goHome = () => { setActiveId(null); setQ(''); top(); };
  const createDoc = (parent: string | null, title = '') => {
    const d: WikiDoc = { id: newId('wk'), title, parent, tags: [], pinned: false, updated: Date.now(), body: emptyBody() };
    setStore((s) => ({ ...s, docs: [...s.docs, d], recent: [d.id, ...s.recent].slice(0, 10) }));
    setActiveId(d.id); setQ(''); top();
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
    const kids = childrenOf(docs, id).length;
    if (!window.confirm(`"${d.title || '무제'}" 문서를 삭제할까요?${kids ? `\n(하위 문서 ${kids}개는 한 단계 위로 올라가요)` : ''}`)) return;
    setStore((s) => ({ ...s, docs: deleteWithPromotion(s.docs, id), recent: s.recent.filter((r) => r !== id) }));
    setActiveId(d.parent);
  };

  /* ── 파생 ── */
  const focus = useMemo(() => focusView(docs, activeId), [docs, activeId]);
  const crumbs = useMemo(() => (active ? ancestorsOf(docs, active.id) : []), [docs, active]);
  const backlinks = useMemo(
    () => (active ? docs.filter((d) => d.id !== active.id && linkedDocIds(d.body).includes(active.id)) : []),
    [docs, active],
  );
  const kids = useMemo(() => (active ? childrenOf(docs, active.id) : []), [docs, active]);
  const pinnedDocs = useMemo(() => docs.filter((d) => d.pinned), [docs]);
  const recentDocs = useMemo(
    () => recent.map((id) => docs.find((d) => d.id === id)).filter((d): d is WikiDoc => !!d).slice(0, 6),
    [recent, docs],
  );
  const roots = useMemo(() => childrenOf(docs, null), [docs]);
  const qq = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!qq) return [];
    return docs
      .map((d) => ({ d, text: bodyText(d.body) }))
      .filter(({ d, text }) => d.title.toLowerCase().includes(qq) || text.toLowerCase().includes(qq) || d.tags.some((t) => t.toLowerCase().includes(qq)))
      .sort((a, b) => Number(b.d.title.toLowerCase().includes(qq)) - Number(a.d.title.toLowerCase().includes(qq)))
      .slice(0, 20);
  }, [docs, qq]);

  const fmtRel = (ts: number) => {
    const d = Date.now() - ts, m = 60000, h = 3600000, day = 86400000;
    if (d < m) return '방금 전';
    if (d < h) return `${Math.floor(d / m)}분 전`;
    if (d < day) return `${Math.floor(d / h)}시간 전`;
    if (d < 7 * day) return `${Math.floor(d / day)}일 전`;
    const dt = new Date(ts);
    return `${dt.getMonth() + 1}월 ${dt.getDate()}일`;
  };

  /* ── 사이드바 행 ── */
  const row = (d: WikiDoc, opts: { indent?: boolean; activeRow?: boolean } = {}) => (
    <button
      key={d.id}
      type="button"
      onClick={() => openDoc(d.id)}
      className={cn(
        'flex h-[34px] w-full items-center gap-2 rounded-[9px] px-2.5 text-left text-[13.5px] transition-colors',
        opts.indent && 'pl-7',
        opts.activeRow
          ? 'bg-[#8b3d6e]/[0.12] font-bold text-[#8b3d6e]'
          : 'font-medium text-[#3d3742] hover:bg-white/60',
      )}
    >
      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] text-[10.5px] font-bold" style={{ background: `${colorOf(docs, d.id)}20`, color: colorOf(docs, d.id) }}>
        {symOf(docs, d.id)}
      </span>
      <span className="min-w-0 flex-1 truncate">{d.title || '무제'}</span>
      {d.pinned && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
    </button>
  );

  return (
    <div className="wiki-theme flex h-dvh text-[#23262b]" style={{ background: P.page }}>
      <style>{WIKI_CSS}</style>
      {/* ══════ 사이드바 — 264px 캐논 ══════ */}
      <aside className="hidden w-[264px] shrink-0 flex-col overflow-y-auto border-r px-3.5 py-5 sm:flex" style={{ background: P.paper, borderColor: P.line }}>
        {/* 락업 */}
        <button type="button" onClick={goHome} className="flex items-center gap-[11px] px-1.5 text-left">
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-white text-[17px] shadow-[0_1px_2px_rgba(90,40,70,0.09)]" role="img" aria-label="마이위키">📖</span>
          <span className="min-w-0">
            <span className="block text-[16px] font-bold leading-tight tracking-[-0.01em] text-[#191c20]">마이위키</span>
            <span className="block truncate text-[12px] leading-tight" style={{ color: P.sub }}>나만의 지식 서고</span>
          </span>
        </button>

        {/* CTA */}
        <button
          type="button"
          onClick={() => createDoc(activeId)}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[14px] font-bold text-white shadow-sm transition-colors"
          style={{ background: P.cta }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = P.ctaHover; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = P.cta; }}
        >
          <Plus className="h-4 w-4" strokeWidth={2.2} /> {active ? '여기 아래 새 문서' : '새 문서'}
        </button>

        {/* 검색 */}
        <div className="mt-3 flex items-center gap-2 rounded-[10px] border bg-white/70 px-2.5 py-1.5" style={{ borderColor: P.line }}>
          <Search className="h-3.5 w-3.5 shrink-0" style={{ color: P.sub }} />
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="검색"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-[#b9a3af]"
          />
          {q ? (
            <button type="button" onClick={() => setQ('')} className="shrink-0 text-[#b9a3af] hover:text-[#8b3d6e]"><X className="h-3.5 w-3.5" /></button>
          ) : (
            <kbd className="shrink-0 rounded border px-1 text-[10px]" style={{ borderColor: P.line, color: P.sub }}>/</kbd>
          )}
        </div>

        {/* 포커스 트리 — 항상 부모/형제/자식 3단 */}
        <div className="mb-[5px] mt-[18px] px-2.5 text-[11.5px] font-semibold tracking-[0.05em]" style={{ color: P.sub }}>
          {active ? '문서 위치' : '문서'}
        </div>
        <nav className="flex flex-col gap-0.5" aria-label="문서 트리">
          {focus.parent ? (
            <button type="button" onClick={() => openDoc(focus.parent!.id)} className="flex h-[30px] items-center gap-1.5 rounded-[9px] px-2.5 text-left text-[12.5px] font-semibold text-[#6b5f6a] transition-colors hover:bg-white/60">
              ← {focus.parent.title || '무제'}
            </button>
          ) : active ? (
            <button type="button" onClick={goHome} className="flex h-[30px] items-center gap-1.5 rounded-[9px] px-2.5 text-left text-[12.5px] font-semibold text-[#6b5f6a] transition-colors hover:bg-white/60">
              ← 전체 문서
            </button>
          ) : null}
          {focus.siblings.map((d) => (
            <div key={d.id}>
              {row(d, { activeRow: d.id === activeId })}
              {d.id === activeId && focus.children.map((c) => row(c, { indent: true }))}
              {d.id === activeId && (
                <button type="button" onClick={() => createDoc(d.id)} className="flex h-[28px] w-full items-center gap-2 rounded-[9px] px-2.5 pl-7 text-left text-[12px] font-medium transition-colors hover:bg-white/60" style={{ color: P.sub }}>
                  <Plus className="h-3 w-3" /> 하위 문서
                </button>
              )}
            </div>
          ))}
          {focus.siblings.length === 0 && !active && (
            <p className="px-2.5 py-2 text-[12px]" style={{ color: P.sub }}>아직 문서가 없어요 — 위 버튼으로 시작해요.</p>
          )}
        </nav>

        {/* 고정됨 */}
        {pinnedDocs.length > 0 && (
          <>
            <div className="mb-[5px] mt-[18px] px-2.5 text-[11.5px] font-semibold tracking-[0.05em]" style={{ color: P.sub }}>고정됨</div>
            {pinnedDocs.map((d) => row(d, { activeRow: d.id === activeId }))}
          </>
        )}

        {/* 최근 */}
        {recentDocs.length > 0 && (
          <>
            <div className="mb-[5px] mt-[18px] px-2.5 text-[11.5px] font-semibold tracking-[0.05em]" style={{ color: P.sub }}>최근 본 문서</div>
            {recentDocs.map((d) => row(d, { activeRow: d.id === activeId }))}
          </>
        )}

        <div className="mt-auto pt-4 text-center text-[11px]" style={{ color: P.sub }}>문서 {docs.length}</div>
      </aside>

      {/* ══════ 메인 ══════ */}
      <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[880px] px-5 pb-16 pt-8 sm:px-8">
          {/* ── 검색 결과 ── */}
          {qq ? (
            <>
              <Masthead eyebrow="SEARCH" title={`‘${q.trim()}’`} sub={`${results.length}개의 문서`} />
              <div className="mt-5 flex flex-col gap-2.5">
                {results.map(({ d, text }) => (
                  <button key={d.id} type="button" onClick={() => openDoc(d.id)} className="rounded-[14px] border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-16px_rgba(90,40,70,0.3)]" style={{ borderColor: P.line }}>
                    <div className="flex items-center gap-2 text-[12px]" style={{ color: P.sub }}>
                      <span className="flex h-[17px] w-[17px] items-center justify-center rounded-[5px] text-[10px] font-bold" style={{ background: `${colorOf(docs, d.id)}20`, color: colorOf(docs, d.id) }}>{symOf(docs, d.id)}</span>
                      {ancestorsOf(docs, d.id).map((a) => a.title).join(' › ') || '최상위'}
                    </div>
                    <div className="mt-1 text-[16px] font-bold">{d.title || '무제'}</div>
                    <div className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed" style={{ color: P.muted }}>{text.slice(0, 140)}</div>
                  </button>
                ))}
                {results.length === 0 && (
                  <div className="py-14 text-center">
                    <p className="text-[14px]" style={{ color: P.muted }}>일치하는 문서가 없어요</p>
                    <button type="button" onClick={() => createDoc(null, q.trim())} className="mt-4 rounded-full px-5 py-2 text-[13px] font-bold text-white" style={{ background: P.cta }}>
                      ‘{q.trim()}’ 제목으로 새 문서
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : active ? (
            /* ── 문서 뷰 (항상 편집) ── */
            <>
              {/* 빵가루 */}
              <div className="flex flex-wrap items-center gap-1 text-[12.5px]" style={{ color: P.sub }}>
                <button type="button" onClick={goHome} className="font-semibold hover:underline" style={{ color: P.sub }}>마이위키</button>
                {crumbs.map((c) => (
                  <span key={c.id} className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3 opacity-60" />
                    <button type="button" onClick={() => openDoc(c.id)} className="font-semibold hover:underline" style={{ color: P.sub }}>{c.title || '무제'}</button>
                  </span>
                ))}
                <ChevronRight className="h-3 w-3 opacity-60" />
                <span className="font-bold" style={{ color: P.accent }}>{active.title || '무제'}</span>
              </div>

              {/* ── 책 페이지 시트 — 제목·메타·본문이 종이 한 장 위에 ── */}
              <div className="relative mt-3 rounded-[18px] border bg-white px-6 py-6 shadow-[0_14px_34px_-24px_rgba(90,40,70,0.4)] sm:px-9 sm:py-8" style={{ borderColor: P.line }}>
              {active.pinned && (
                <span aria-hidden className="absolute right-8 top-0 h-[34px] w-[16px]" style={{ background: P.accent, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 74%, 0 100%)' }} title="고정된 문서" />
              )}
              {/* 제목 — 위키 시그니처 세리프 */}
              <input
                key={`t-${active.id}`}
                defaultValue={active.title}
                onBlur={(e) => patchDoc(active.id, { title: e.target.value.trim() })}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) (e.target as HTMLInputElement).blur(); }}
                placeholder="문서 제목"
                className="w-full bg-transparent text-[30px] font-bold leading-tight tracking-[-0.01em] outline-none placeholder:text-[#c9b3c1]"
                style={{ fontFamily: TF }}
              />

              {/* 메타 줄 — 태그 · 상위 이동 · 핀 · 삭제 */}
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
                  <option value="">— 최상위 —</option>
                  {moveOptions(docs, active.id).map((o) => (
                    <option key={o.id} value={o.id}>{'  '.repeat(o.depth)}{o.title || '무제'}</option>
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

              <div className="my-5 h-px" style={{ background: `linear-gradient(90deg, ${P.line} 60%, transparent)` }} />

              {/* 본문 — Plate ("/" 삽입 · 드래그 링크) */}
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

              {/* 하위 문서 */}
              <div className="mt-10">
                <div className="mb-2 flex items-center gap-2 text-[12px] font-bold tracking-[0.08em]" style={{ color: P.sub }}>
                  하위 문서 {kids.length > 0 && <span className="font-semibold opacity-70">{kids.length}</span>}
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {kids.map((d) => (
                    <button key={d.id} type="button" onClick={() => openDoc(d.id)} className="rounded-[13px] border bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_22px_-16px_rgba(90,40,70,0.3)]" style={{ borderColor: P.line }}>
                      <div className="text-[14.5px] font-bold">{d.title || '무제'}</div>
                      <div className="mt-0.5 line-clamp-1 text-[12px]" style={{ color: P.muted }}>{bodyText(d.body).slice(0, 70) || '빈 문서'}</div>
                    </button>
                  ))}
                  <button type="button" onClick={() => createDoc(active.id)} className="flex min-h-[64px] items-center justify-center gap-1.5 rounded-[13px] border border-dashed text-[13px] font-semibold transition-colors hover:bg-white" style={{ borderColor: P.line, color: P.sub }}>
                    <Plus className="h-3.5 w-3.5" /> 하위 문서
                  </button>
                </div>
              </div>

              {/* 백링크 */}
              {backlinks.length > 0 && (
                <div className="mt-8 rounded-[14px] border p-4" style={{ borderColor: P.line, background: P.paper }}>
                  <div className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold tracking-[0.08em]" style={{ color: P.sub }}>
                    <Link2 className="h-3 w-3" /> 이 문서를 언급한 문서
                  </div>
                  <div className="flex flex-col gap-1">
                    {backlinks.map((b) => (
                      <button key={b.id} type="button" onClick={() => openDoc(b.id)} className="flex items-center gap-2 rounded-[9px] px-2 py-1.5 text-left transition-colors hover:bg-white/70">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: colorOf(docs, b.id) }} />
                        <span className="text-[13.5px] font-semibold">{b.title || '무제'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ── 홈 ── */
            <>
              <Masthead eyebrow="MY WIKI" title="마이위키" sub={docs.length ? `문서 ${docs.length}개 · 오늘도 한 조각 남겨요` : '첫 문서로 서고를 열어보세요'} />

              {pinnedDocs.length > 0 && (
                <section className="mt-7">
                  <h2 className="mb-2.5 flex items-center gap-1.5 text-[12px] font-bold tracking-[0.08em]" style={{ color: P.sub }}><Star className="h-3 w-3" /> 고정된 문서</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {pinnedDocs.map((d) => (
                      <button key={d.id} type="button" onClick={() => openDoc(d.id)} className="relative flex min-h-[110px] flex-col overflow-hidden rounded-[15px] border bg-white p-4 text-left transition-all hover:-translate-y-1 hover:shadow-[0_14px_28px_-18px_rgba(90,40,70,0.35)]" style={{ borderColor: P.line }}>
                        {/* 책갈피 리본 */}
                        <span aria-hidden className="absolute right-4 top-0 h-[26px] w-[13px]" style={{ background: colorOf(docs, d.id), clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 72%, 0 100%)' }} />
                        <div className="flex items-center gap-1.5 text-[11.5px]" style={{ color: P.sub }}>
                          <span className="flex h-[17px] w-[17px] items-center justify-center rounded-[5px] text-[10px] font-bold" style={{ background: `${colorOf(docs, d.id)}20`, color: colorOf(docs, d.id) }}>{symOf(docs, d.id)}</span>
                          {ancestorsOf(docs, d.id)[0]?.title ?? '최상위'}
                        </div>
                        <div className="mt-1.5 text-[16.5px] font-bold leading-snug" style={{ fontFamily: TF }}>{d.title || '무제'}</div>
                        <div className="mt-auto pt-2 text-[11.5px]" style={{ color: P.muted }}>{fmtRel(d.updated)}</div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="mt-8">
                <h2 className="mb-2.5 text-[12px] font-bold tracking-[0.08em]" style={{ color: P.sub }}>서고</h2>
                {roots.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed py-14 text-center" style={{ borderColor: P.line }}>
                    <p className="text-[15px] font-bold">아직 문서가 없어요</p>
                    <p className="mt-1 text-[12.5px]" style={{ color: P.muted }}>문서 안에 문서를 층층이 쌓아 나만의 서고를 만들어요.</p>
                    <button type="button" onClick={() => createDoc(null)} className="mt-4 rounded-full px-5 py-2 text-[13px] font-bold text-white" style={{ background: P.cta }}>첫 문서 만들기</button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {roots.map((d) => {
                      const n = childrenOf(docs, d.id).length;
                      // 책등 — 왼쪽 두꺼운 색 띠
                      return (
                        <button key={d.id} type="button" onClick={() => openDoc(d.id)} className="flex items-center gap-3 rounded-[15px] border bg-white py-4 pl-3.5 pr-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-18px_rgba(90,40,70,0.35)]" style={{ borderColor: P.line, borderLeft: `5px solid ${colorOf(docs, d.id)}` }}>
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[15px] font-bold" style={{ background: `${colorOf(docs, d.id)}1c`, color: colorOf(docs, d.id), fontFamily: TF }}>{symOf(docs, d.id)}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-[15px] font-bold" style={{ fontFamily: TF }}>{d.title || '무제'}</span>
                            <span className="block text-[11.5px]" style={{ color: P.muted }}>{n ? `하위 ${n}개` : bodyText(d.body).slice(0, 30) || '빈 문서'}</span>
                          </span>
                        </button>
                      );
                    })}
                    <button type="button" onClick={() => createDoc(null)} className="flex min-h-[68px] items-center justify-center gap-1.5 rounded-[15px] border border-dashed text-[13px] font-semibold transition-colors hover:bg-white" style={{ borderColor: P.line, color: P.sub }}>
                      <Plus className="h-4 w-4" /> 새 문서
                    </button>
                  </div>
                )}
              </section>

              {recentDocs.length > 0 && (
                <section className="mt-8">
                  <h2 className="mb-2 text-[12px] font-bold tracking-[0.08em]" style={{ color: P.sub }}>최근 본 문서</h2>
                  <div className="flex flex-col">
                    {recentDocs.map((d) => (
                      <button key={d.id} type="button" onClick={() => openDoc(d.id)} className="flex items-center gap-2.5 border-b px-1 py-2.5 text-left transition-colors last:border-0 hover:bg-white/60" style={{ borderColor: P.line }}>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: colorOf(docs, d.id) }} />
                        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{d.title || '무제'}</span>
                        <span className="shrink-0 text-[11.5px]" style={{ color: P.muted }}>{fmtRel(d.updated)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {/* ══════ 문서 연결 피커 ══════ */}
      {picker && active && (
        <LinkPicker
          docs={docs}
          selfId={active.id}
          initial={picker.text}
          onClose={() => setPicker(null)}
          onPick={(docId, title) => { editorApi.current?.applyLink(docId, picker.text || title); setPicker(null); }}
          onCreate={(title) => {
            const d: WikiDoc = { id: newId('wk'), title, parent: active.id, tags: [], pinned: false, updated: Date.now(), body: emptyBody() };
            setStore((s) => ({ ...s, docs: [...s.docs, d] }));
            editorApi.current?.applyLink(d.id, picker.text || title);
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

/* ── 마스트헤드 캐논 — 아이브로우 + 제목 + 실데이터 서술어 ── */
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

/* ── 문서 연결 피커 — 드래그 버블에서 진입. 검색해 고르거나 새 문서로 연결 ── */
function LinkPicker({ docs, selfId, initial, onClose, onPick, onCreate }: {
  docs: WikiDoc[]; selfId: string; initial: string;
  onClose: () => void;
  onPick: (docId: string, title: string) => void;
  onCreate: (title: string) => void;
}) {
  const [q, setQ] = useState(initial);
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
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                if (list[0]) onPick(list[0].id, list[0].title); else if (q.trim()) onCreate(q.trim());
              }
            }}
            placeholder="연결할 문서 검색…"
            className="w-full bg-transparent text-[14px] font-semibold outline-none placeholder:text-[#c9b3c1]"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1.5">
          {list.map((d) => (
            <button key={d.id} type="button" onClick={() => onPick(d.id, d.title)} className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-[#8b3d6e]/[0.08]">
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] text-[10.5px] font-bold" style={{ background: `${colorOf(docs, d.id)}20`, color: colorOf(docs, d.id) }}>{symOf(docs, d.id)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold">{d.title || '무제'}</span>
                <span className="block truncate text-[11px] text-[#8d949d]">{ancestorsOf(docs, d.id).map((a) => a.title).join(' › ') || '최상위'}</span>
              </span>
            </button>
          ))}
          {q.trim() && (
            <button type="button" onClick={() => onCreate(q.trim())} className="mt-0.5 flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-[13px] font-bold transition-colors hover:bg-[#8b3d6e]/[0.08]" style={{ color: '#8b3d6e' }}>
              <Plus className="h-4 w-4" /> ‘{q.trim()}’ 새 문서 만들고 연결
            </button>
          )}
          {!list.length && !q.trim() && <p className="px-3 py-4 text-center text-[12.5px] text-[#8d949d]">문서 제목을 검색해보세요</p>}
        </div>
      </div>
    </div>
  );
}
