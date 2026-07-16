/**
 * 마이위키 (/wiki) — "도서관에서 책을 골라, 그 안에 백과사전을 써내려간다".
 *
 * 첫 화면 = 도서관: 책장에 책(주제)이 꽂혀 있고, 빈 칸(+)을 누르면 새 책.
 * 책을 펼치면 = 좌측 트리 + 문서 화면(보기 기본·편집 토글, WikiDocView).
 * 헤더 검색 = 찾기이자 생성 입구 ("없는 제목 → 새로 팝니다").
 *
 * 톤: 양피지 서재 (마이위키.dc.html) · 상호작용: Wiki.dc.html 팝오버 차용.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { notify } from '@/lib/notify';
import { PW, SANS, SERIF, STUB_TEXT_LENGTH, type WikiDoc, type WikiTopic } from '@/types/mywiki';
import { mywikiStore } from '@/services/mywikiStore';
import { useMyWiki } from '@/hooks/useMyWiki';
import { wikiPlainText } from '@/lib/mywiki/html';
import { WikiDocView } from '@/components/mywiki/WikiDocView';

const PAGE_CSS = `
.pwk-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
.pwk-scroll::-webkit-scrollbar-thumb { background: #d8cfc0; border-radius: 6px; border: 3px solid transparent; background-clip: content-box; }
.pwk-scroll::-webkit-scrollbar-thumb:hover { background: #c4b8a4; background-clip: content-box; }
@keyframes pwk-pop { from { opacity: 0; transform: translateY(6px) scale(0.97); } to { opacity: 1; transform: none; } }
@keyframes pwk-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
.pwk-cover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.pwk-cover:hover { transform: translateY(-12px) rotate(-1.4deg); box-shadow: 0 6px 10px rgba(60,40,25,0.2), 0 28px 44px rgba(60,40,25,0.3), inset 13px 0 0 rgba(0,0,0,0.16), inset 15px 0 0 rgba(255,255,255,0.07) !important; }
`;

/** 책등 그라데이션 어둡게. */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v));
  const r = c((n >> 16) + amt);
  const g = c(((n >> 8) & 255) + amt);
  const b = c((n & 255) + amt);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export default function Wiki() {
  const { topics, docs } = useMyWiki();

  const [screen, setScreen] = useState<'library' | 'doc'>('library');
  const [topicId, setTopicId] = useState<string | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const [addingBook, setAddingBook] = useState(false);
  const [bookName, setBookName] = useState('');
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const topic: WikiTopic | null = topics.find((t) => t.id === topicId) ?? null;
  const activeDoc: WikiDoc | null = activeDocId ? docs.find((d) => d.id === activeDocId) ?? null : null;

  // 삭제된 문서 정리
  useEffect(() => {
    if (activeDocId && !docs.some((d) => d.id === activeDocId)) setActiveDocId(null);
  }, [docs, activeDocId]);

  // 검색 드롭다운 바깥 클릭 닫기
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchWrapRef.current?.contains(e.target as Node)) return;
      setSearchFocus(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const byParent = useMemo(() => {
    const m = new Map<string, WikiDoc[]>();
    for (const d of docs) {
      const key = `${d.topicId}:${d.parentId ?? ''}`;
      (m.get(key) ?? m.set(key, []).get(key)!).push(d);
    }
    for (const list of m.values()) list.sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
    return m;
  }, [docs]);
  const childrenOf = (tId: string, parentId: string | null) => byParent.get(`${tId}:${parentId ?? ''}`) ?? [];
  const countOf = (tId: string) => docs.filter((d) => d.topicId === tId).length;

  const openDoc = (id: string) => {
    const d = docs.find((x) => x.id === id);
    if (!d) return;
    const exp = { ...expanded };
    let p = d.parentId;
    while (p) {
      exp[p] = true;
      p = docs.find((x) => x.id === p)?.parentId ?? null;
    }
    setExpanded(exp);
    setTopicId(d.topicId);
    setActiveDocId(id);
    setScreen('doc');
    setSearch('');
    setSearchFocus(false);
  };

  const openBook = (t: WikiTopic) => {
    setTopicId(t.id);
    const first = childrenOf(t.id, null)[0];
    setActiveDocId(first ? first.id : null);
    setScreen('doc');
  };

  const addBook = () => {
    const name = bookName.trim();
    setAddingBook(false);
    setBookName('');
    if (!name) return;
    const t = mywikiStore.addTopic(name);
    notify.success(`'${t.name}' 책을 꽂았어요`, { description: '펼쳐서 첫 문서를 써보세요' });
    openBook(t);
  };

  const addChildDoc = () => {
    if (!topic) return;
    const parentId = activeDoc ? activeDoc.id : null;
    const d = mywikiStore.addDoc({ topicId: topic.id, parentId, title: '새 문서' });
    openDoc(d.id);
  };

  /* ── 검색 (찾기 = 생성) ── */
  const q = search.trim();
  const results = useMemo(() => {
    if (!q) return [];
    const lower = q.toLowerCase();
    return docs
      .filter((d) => d.title.toLowerCase().includes(lower) || wikiPlainText(d.body).toLowerCase().includes(lower))
      .slice(0, 6)
      .map((d) => ({
        id: d.id,
        title: d.title,
        topicName: topics.find((t) => t.id === d.topicId)?.name ?? '',
        hint: wikiPlainText(d.body).length < STUB_TEXT_LENGTH ? '얇은 판' : '문서',
      }));
  }, [q, docs, topics]);
  const exactExists = q ? docs.some((d) => d.title.trim().toLowerCase() === q.toLowerCase()) : true;
  const createTarget = topic ?? topics[0] ?? null;
  const createFromSearch = () => {
    if (!q) return;
    if (!createTarget) { setAddingBook(true); setSearchFocus(false); return; }
    const d = mywikiStore.addDoc({
      topicId: createTarget.id,
      parentId: screen === 'doc' && activeDoc && activeDoc.topicId === createTarget.id ? activeDoc.id : null,
      title: q,
    });
    notify.success(`'${q}' 문서를 새로 팠어요`, { description: `《${createTarget.name}》 에 들어갔어요` });
    openDoc(d.id);
  };

  /* ── 트리 (현재 책) ── */
  interface Row { key: string; depth: number; title: string; hasKids: boolean; exp: boolean; active: boolean; stub: boolean; onClick: () => void }
  const treeRows: Row[] = [];
  if (topic) {
    const walk = (parentId: string | null, depth: number) => {
      for (const d of childrenOf(topic.id, parentId)) {
        const kids = childrenOf(topic.id, d.id);
        const exp = expanded[d.id] ?? true;
        treeRows.push({
          key: d.id, depth, title: d.title,
          hasKids: kids.length > 0, exp,
          active: activeDocId === d.id,
          stub: wikiPlainText(d.body).length < STUB_TEXT_LENGTH,
          onClick: () => {
            if (kids.length > 0) setExpanded((e) => ({ ...e, [d.id]: !(e[d.id] ?? true) }));
            openDoc(d.id);
          },
        });
        if (exp) walk(d.id, depth + 1);
      }
    };
    walk(null, 0);
  }

  /* ── 브레드크럼 ── */
  const crumbs = useMemo(() => {
    if (!activeDoc || !topic) return [];
    const chain: WikiDoc[] = [];
    let cur: WikiDoc | undefined = activeDoc;
    while (cur) {
      chain.unshift(cur);
      cur = cur.parentId ? docs.find((d) => d.id === cur!.parentId) : undefined;
    }
    return [
      { title: topic.name, onClick: () => setActiveDocId(childrenOf(topic.id, null)[0]?.id ?? null) },
      ...chain.map((c, i) => ({ title: c.title, onClick: i === chain.length - 1 ? undefined : () => openDoc(c.id) })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoc, topic, docs]);

  /* ── 면진열 (표지 4권씩 + 마지막에 새 책 칸) ── */
  const ledges: (WikiTopic | 'new')[][] = [];
  {
    const items: (WikiTopic | 'new')[] = [...topics, 'new'];
    for (let i = 0; i < items.length; i += 4) ledges.push(items.slice(i, i + 4));
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: PW.paper, color: PW.ink, fontFamily: SANS, overflow: 'hidden' }}>
      <style>{PAGE_CSS}</style>

      {/* ── 헤더 — 책 안에서만. 도서관은 헤더 없이 표지처럼 ── */}
      {screen === 'doc' && (
      <header style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 20, height: 58, padding: '0 22px', background: PW.panel, borderBottom: `1px solid ${PW.line}`, position: 'relative', zIndex: 40 }}>
        <div onClick={() => { setScreen('library'); setActiveDocId(null); }} style={{ display: 'flex', alignItems: 'baseline', gap: 9, cursor: 'pointer', userSelect: 'none', flex: 'none' }} title="도서관으로">
          <span style={{ display: 'inline-block', width: 15, height: 19, background: PW.accent, borderRadius: '2px 3px 3px 2px', boxShadow: 'inset -3px 0 0 rgba(0,0,0,0.18)' }} />
          <span style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 700, letterSpacing: '-0.01em' }}>마이위키</span>
        </div>
        {topic && (
          <div style={{ flex: 'none', minWidth: 0, fontSize: 13, color: PW.faint, display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <span style={{ opacity: 0.5 }}>›</span>
            <span style={{ color: PW.sub }}>{topic.name}</span>
            {activeDoc && (<><span style={{ opacity: 0.5 }}>›</span><span style={{ color: PW.sub }}>{activeDoc.title}</span></>)}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* 검색 = 생성 */}
        <div ref={searchWrapRef} style={{ flex: 'none', position: 'relative', width: 360, maxWidth: '46vw' }}>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSearchFocus(true); }}
            onFocus={() => setSearchFocus(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && q) {
                const exact = docs.find((d) => d.title.trim().toLowerCase() === q.toLowerCase());
                if (exact) openDoc(exact.id);
                else createFromSearch();
              }
              if (e.key === 'Escape') setSearchFocus(false);
            }}
            placeholder="검색하거나 새 문서 제목을 입력하세요…"
            style={{ width: '100%', height: 36, padding: '0 14px', border: `1px solid ${PW.input}`, borderRadius: 9, background: PW.inputBg, fontFamily: 'inherit', fontSize: 14, color: PW.ink, outline: 'none' }}
          />
          {searchFocus && q.length > 0 && (
            <div style={{ position: 'absolute', top: 44, left: 0, right: 0, background: PW.inputBg, border: `1px solid ${PW.line}`, borderRadius: 11, boxShadow: '0 14px 40px rgba(60,45,30,0.16)', overflow: 'hidden', animation: 'pwk-pop 0.14s ease' }}>
              {results.map((r) => (
                <div key={r.id} onClick={() => openDoc(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0eadd' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f5efe4'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 11, color: PW.faint, width: 52, flex: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.topicName}</span>
                  <span style={{ fontSize: 14, color: PW.ink, flex: 1 }}>{r.title}</span>
                  <span style={{ fontSize: 11, color: PW.sand }}>{r.hint}</span>
                </div>
              ))}
              {!exactExists && (
                <div onClick={createFromSearch} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer', background: '#fbf5ec' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f5ece0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fbf5ec'; }}
                >
                  <span style={{ fontSize: 13, color: PW.red, fontWeight: 700, flex: 'none' }}>＋ 만들기</span>
                  <span style={{ fontSize: 14, color: PW.ink }}>
                    “{q}” 문서를 새로 팝니다{createTarget && <span style={{ color: PW.faint }}> · 《{createTarget.name}》</span>}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      )}

      {/* ══════════ 도서관 (책장) ══════════ */}
      {screen === 'library' && (
        <div
          className="pwk-scroll"
          style={{
            flex: 1, overflow: 'auto', padding: '64px 40px 96px',
            backgroundImage: `radial-gradient(920px 430px at 50% -80px, rgba(255,252,244,0.95), rgba(255,252,244,0) 70%), repeating-linear-gradient(0deg, rgba(120,100,70,0.018) 0px, rgba(120,100,70,0.018) 1px, transparent 1px, transparent 3px)`,
          }}
        >
          <div style={{ maxWidth: 1040, margin: '0 auto' }}>
            {/* 표지 히어로 — 제목과 부제 한 줄, 장식 없이 */}
            <div style={{ textAlign: 'center', margin: '16px 0 46px' }}>
              <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(52px, 7vw, 72px)', fontWeight: 700, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.12, color: PW.ink, textShadow: '0 1px 0 rgba(255,255,255,0.6)' }}>
                마이위키
              </h1>
              <p style={{ fontFamily: SERIF, fontSize: 'clamp(17px, 2vw, 21px)', color: PW.sub, margin: '14px auto 0', maxWidth: 640, lineHeight: 1.75, fontWeight: 400 }}>
                한 주제를 한 권의 책으로, 깊게 파고드는 나만의 백과사전
              </p>
            </div>

            {/* ── 면진열 서가 — 표지가 정면으로 보이는 진열대 ── */}
            <div style={{ position: 'relative', margin: '0 -10px' }}>

              {/* 벽면 패널 */}
              <div aria-hidden style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: -36, bottom: -6, width: 'min(100%, 980px)', background: 'linear-gradient(180deg, rgba(190,168,128,0.16), rgba(190,168,128,0.04))', borderRadius: 22, border: '1px solid rgba(150,125,85,0.1)', zIndex: 0 }} />

              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 56, padding: '12px 0 34px' }}>
                {ledges.map((chunk, si) => (
                  <div key={si} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '100%' }}>
                    <div className="pwk-scroll" style={{ display: 'flex', alignItems: 'flex-end', gap: 26, padding: '16px 24px 0', maxWidth: '100%', overflowX: 'auto' }}>
                      {chunk.map((item, bi) => {
                        if (item === 'new') {
                          return addingBook ? (
                            <div key="new" style={{ width: 150, height: 204, flex: 'none', border: `2px dashed ${PW.accent}`, borderRadius: 10, background: 'rgba(255,253,248,0.78)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '0 14px' }}>
                              <div style={{ fontSize: 12, color: PW.sub, fontWeight: 700 }}>새 책 이름</div>
                              <input
                                autoFocus
                                value={bookName}
                                onChange={(e) => setBookName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') addBook(); if (e.key === 'Escape') { setAddingBook(false); setBookName(''); } }}
                                onBlur={addBook}
                                placeholder="예: 주식 공부"
                                style={{ width: '100%', border: `1px solid ${PW.input}`, borderRadius: 8, padding: '8px 10px', fontSize: 13.5, outline: 'none', fontFamily: 'inherit', background: '#fff', textAlign: 'center' }}
                              />
                            </div>
                          ) : (
                            <div
                              key="new"
                              onClick={() => setAddingBook(true)}
                              style={{ width: 150, height: 204, flex: 'none', border: '2px dashed #c0ae90', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: '#a8987e', transition: 'border-color 0.15s ease, color 0.15s ease' }}
                              onMouseEnter={(e) => { e.currentTarget.style.borderColor = PW.accent; e.currentTarget.style.color = PW.accent; }}
                              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#c0ae90'; e.currentTarget.style.color = '#a8987e'; }}
                            >
                              <span style={{ fontSize: 30, lineHeight: 1 }}>＋</span>
                              <span style={{ fontSize: 12.5, letterSpacing: '0.14em', fontWeight: 600 }}>새 책</span>
                            </div>
                          );
                        }
                        const t = item;
                        const n = countOf(t.id);
                        return (
                          <div
                            key={t.id}
                            className="pwk-cover"
                            onClick={() => openBook(t)}
                            title={`${t.name} — 문서 ${n}편`}
                            style={{
                              width: 150, height: 204, flex: 'none', cursor: 'pointer', position: 'relative',
                              background: `linear-gradient(128deg, ${shade(t.tint, 16)}, ${t.tint} 42%, ${shade(t.tint, -18)})`,
                              borderRadius: '5px 11px 11px 5px',
                              boxShadow: '0 3px 5px rgba(60,40,25,0.22), 0 14px 22px rgba(60,40,25,0.2), inset 13px 0 0 rgba(0,0,0,0.16), inset 15px 0 0 rgba(255,255,255,0.07)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              animation: `pwk-rise 0.55s ${(si * 4 + bi) * 0.07}s cubic-bezier(0.22,1,0.36,1) both`,
                            }}
                          >
                            {/* 엠보싱 프레임 */}
                            <span aria-hidden style={{ position: 'absolute', inset: '11px 11px 11px 24px', border: '1.5px solid rgba(251,246,238,0.32)', borderRadius: 7, pointerEvents: 'none' }} />
                            {/* 갈피끈 */}
                            <span aria-hidden style={{ position: 'absolute', top: 0, right: 19, width: 11, height: 38, background: 'linear-gradient(180deg,#dcb75f,#c39a3f)', clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)', opacity: 0.95 }} />
                            {/* 표제 */}
                            <div style={{ fontFamily: SERIF, fontSize: t.name.length >= 5 ? 21 : 25, fontWeight: 700, color: '#fbf6ee', textShadow: '0 1px 2px rgba(0,0,0,0.3)', textAlign: 'center', lineHeight: 1.4, padding: '0 16px 0 28px', wordBreak: 'keep-all' }}>{t.name}</div>
                            <div style={{ position: 'absolute', bottom: 15, left: 24, right: 11, textAlign: 'center', fontSize: 10.5, color: 'rgba(251,246,238,0.78)', letterSpacing: '0.16em' }}>문서 {n}편</div>
                          </div>
                        );
                      })}
                      {/* 화분 — 첫 진열대 끝 장식 */}
                      {si === 0 && (
                        <div aria-hidden className="hidden md:flex" style={{ flexDirection: 'column', alignItems: 'center', flex: 'none', paddingLeft: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: -3 }}>
                            <span style={{ width: 13, height: 24, background: '#5c8a52', borderRadius: '50% 50% 50% 0', transform: 'rotate(-24deg)', display: 'block' }} />
                            <span style={{ width: 12, height: 29, background: '#6f9c60', borderRadius: '50% 50% 0 50%', transform: 'rotate(4deg)', display: 'block', marginLeft: -4 }} />
                            <span style={{ width: 13, height: 22, background: '#527c49', borderRadius: '50% 50% 0 50%', transform: 'rotate(26deg)', display: 'block', marginLeft: -3 }} />
                          </div>
                          <div style={{ width: 34, height: 26, background: 'linear-gradient(180deg,#f4efe4,#ddd3bd)', borderRadius: '3px 3px 10px 10px', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.7), 0 2px 4px rgba(60,40,20,0.14)' }} />
                        </div>
                      )}
                    </div>
                    {/* 진열대 널 */}
                    <div style={{ height: 14, alignSelf: 'stretch', margin: '0 4px', background: 'linear-gradient(180deg,#e9d4ac,#c9ab7c)', borderRadius: 4, boxShadow: '0 2px 3px rgba(60,40,20,0.18), 0 10px 18px rgba(60,40,20,0.14), 0 26px 40px rgba(60,40,20,0.1), inset 0 1px 0 rgba(255,255,255,0.55)' }} />
                    {/* 널 받침 브래킷 */}
                    <div aria-hidden style={{ alignSelf: 'stretch', display: 'flex', justifyContent: 'space-between', padding: '0 48px' }}>
                      <span style={{ width: 12, height: 16, background: 'linear-gradient(180deg,#c9ab7c,rgba(201,171,124,0))', display: 'block' }} />
                      <span style={{ width: 12, height: 16, background: 'linear-gradient(180deg,#c9ab7c,rgba(201,171,124,0))', display: 'block' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ══════════ 책 안 (트리 + 문서) ══════════ */}
      {screen === 'doc' && topic && (
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* 좌측 트리 */}
          <aside className="pwk-scroll hidden lg:block" style={{ flex: 'none', width: 262, overflow: 'auto', background: PW.rail, borderRight: `1px solid ${PW.line}`, padding: '18px 12px 40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 12px' }}>
              <span style={{ width: 9, height: 13, background: topic.tint, borderRadius: '1px 2px 2px 1px', flex: 'none' }} />
              <span style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700 }}>{topic.name}</span>
              <span style={{ fontSize: 11, color: PW.sand, marginLeft: 'auto', whiteSpace: 'nowrap' }}>{countOf(topic.id)}판</span>
            </div>
            {treeRows.map((r) => (
              <div
                key={r.key}
                onClick={r.onClick}
                title={r.title}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', paddingLeft: 8 + r.depth * 15, borderRadius: 7, cursor: 'pointer', background: r.active ? '#e6dcc9' : 'transparent' }}
                onMouseEnter={(e) => { if (!r.active) e.currentTarget.style.background = '#ece4d5'; }}
                onMouseLeave={(e) => { if (!r.active) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ width: 16, flex: 'none', textAlign: 'center', color: PW.faint, fontSize: 10 }}>{r.hasKids ? (r.exp ? '▾' : '▸') : '·'}</span>
                <span style={{
                  fontSize: 14, lineHeight: 1.4, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: r.stub ? PW.red : r.active ? PW.ink : '#5a5147',
                  fontWeight: r.active ? 700 : 400,
                  borderBottom: r.stub ? `1px dashed ${PW.red}` : 'none',
                }}>{r.title}</span>
              </div>
            ))}
            <div style={{ margin: '10px 8px 0', paddingTop: 12, borderTop: `1px solid ${PW.line}` }}>
              <div
                onClick={addChildDoc}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 8px', borderRadius: 8, color: '#8a8073', fontSize: 13, cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = PW.accent; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#8a8073'; }}
              >
                ＋ {activeDoc ? '하위 문서 추가' : '첫 문서 만들기'}
              </div>
              {activeDoc && (
                <div style={{ fontSize: 11, color: PW.sand, padding: '2px 8px 0', lineHeight: 1.5 }}>‘{activeDoc.title}’ 아래로 들어가요</div>
              )}
            </div>
          </aside>

          {/* 본문 */}
          {activeDoc ? (
            <WikiDocView
              doc={activeDoc}
              docs={docs}
              topic={topic}
              crumbs={crumbs}
              onOpenDoc={openDoc}
              onDeleted={() => setActiveDocId(null)}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: PW.sub, padding: 24 }}>
              <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 700, color: PW.ink }}>《{topic.name}》</div>
              <div style={{ fontSize: 14, maxWidth: 380, textAlign: 'center', lineHeight: 1.7 }}>
                아직 빈 책이에요. 첫 문서를 만들어 백과사전을 시작해보세요.
              </div>
              <button
                type="button"
                onClick={addChildDoc}
                style={{ marginTop: 8, border: 'none', background: PW.accent, color: '#fbf6ee', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >＋ 첫 문서 만들기</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
