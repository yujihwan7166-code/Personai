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
.pwk-spine { transition: transform 0.18s ease, box-shadow 0.18s ease; }
.pwk-spine:hover { transform: translateY(-14px); box-shadow: 0 20px 34px rgba(60,40,25,0.28) !important; }
`;

function fmtRel(iso: string): string {
  const d = Math.floor((Date.now() - Date.parse(iso)) / (1000 * 60 * 60 * 24));
  if (d <= 0) return '오늘';
  if (d === 1) return '어제';
  if (d < 7) return `${d}일 전`;
  if (d < 30) return `${Math.floor(d / 7)}주 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
}

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

  /* ── 책장 (6권씩 선반) ── */
  const shelves: WikiTopic[][] = [];
  for (let i = 0; i < topics.length; i += 6) shelves.push(topics.slice(i, i + 6));
  if (shelves.length === 0) shelves.push([]);

  /* ── 이어서 읽기 — 최근 손댄 문서 3편 ── */
  const recentDocs = useMemo(
    () => [...docs]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 3)
      .map((d) => ({ doc: d, topic: topics.find((t) => t.id === d.topicId) })),
    [docs, topics],
  );

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
            {/* 표지 히어로 — 헤더 없이, 책 표지처럼 큼직하게 */}
            <div style={{ textAlign: 'center', margin: '22px 0 52px' }}>
              <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(52px, 7vw, 72px)', fontWeight: 700, margin: 0, letterSpacing: '-0.03em', lineHeight: 1.12, color: PW.ink, textShadow: '0 1px 0 rgba(255,255,255,0.6)' }}>
                마이위키
              </h1>
              <p style={{ fontFamily: SERIF, fontSize: 'clamp(17px, 2vw, 21px)', color: PW.sub, margin: '18px auto 0', maxWidth: 640, lineHeight: 1.75, fontWeight: 400 }}>
                한 주제를 한 권의 책으로, 깊게 파고드는 나만의 백과사전
              </p>
              {/* 속표지 장식 괘선 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, margin: '30px auto 0', maxWidth: 380 }} aria-hidden>
                <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${PW.sand})` }} />
                <span style={{ width: 7, height: 7, background: PW.accent, transform: 'rotate(45deg)', opacity: 0.75 }} />
                <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${PW.sand}, transparent)` }} />
              </div>
            </div>

            {/* 책장 — 나무 프레임 가구 */}
            <div style={{ background: 'linear-gradient(180deg,#b79b74,#8a6f4c)', borderRadius: 22, padding: 16, boxShadow: '0 26px 50px rgba(60,40,20,0.28), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
              <div style={{ background: 'linear-gradient(180deg,#f0e8d9,#e2d6bf)', borderRadius: 12, padding: '42px 32px 0', boxShadow: 'inset 0 10px 26px rgba(60,40,20,0.14), inset 0 -4px 10px rgba(60,40,20,0.06)' }}>
                {shelves.map((shelf, si) => (
                  <div key={si}>
                    <div className="pwk-scroll" style={{ display: 'flex', alignItems: 'flex-end', gap: 14, minHeight: 232, paddingTop: si > 0 ? 36 : 0, overflowX: 'auto' }}>
                      {shelf.map((t, bi) => {
                        const n = countOf(t.id);
                        const h = Math.min(216, 158 + n * 7);
                        const w = 58 + ((t.name.length + t.tint.charCodeAt(2)) % 3) * 5; // 58·63·68 — 책마다 두께 다르게
                        return (
                          <div
                            key={t.id}
                            className="pwk-spine"
                            onClick={() => openBook(t)}
                            title={`${t.name} — 문서 ${n}개`}
                            style={{
                              width: w, height: h, flex: 'none', cursor: 'pointer',
                              background: `linear-gradient(90deg, ${shade(t.tint, 10)}, ${t.tint} 34%, ${shade(t.tint, -22)})`,
                              borderRadius: '3px 6px 6px 3px',
                              boxShadow: 'inset -7px 0 12px rgba(0,0,0,0.3), inset 4px 0 0 rgba(255,255,255,0.16), 0 8px 16px rgba(60,40,25,0.2)',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '15px 0 14px',
                              animation: `pwk-rise 0.5s ${(si * 6 + bi) * 0.05}s cubic-bezier(0.22,1,0.36,1) both`,
                            }}
                          >
                            {/* 장정 밴드 (상단 이중선) */}
                            <span aria-hidden style={{ width: Math.round(w * 0.52), height: 3, borderRadius: 2, background: 'rgba(251,246,238,0.32)', boxShadow: '0 7px 0 rgba(251,246,238,0.2)', flex: 'none', marginBottom: 12 }} />
                            <div style={{ writingMode: 'vertical-rl', fontFamily: SERIF, fontWeight: 700, fontSize: t.name.length >= 4 ? 19 : t.name.length === 3 ? 21 : 26, color: '#fbf6ee', letterSpacing: '0.05em', textShadow: '0 1px 2px rgba(0,0,0,0.28)', flex: 1, display: 'flex', alignItems: 'center' }}>{t.name}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, flex: 'none' }}>
                              <div style={{ writingMode: 'vertical-rl', fontSize: 10.5, color: 'rgba(255,255,255,0.72)', letterSpacing: '0.1em' }}>{n}판</div>
                              <span aria-hidden style={{ width: Math.round(w * 0.52), height: 3, borderRadius: 2, background: 'rgba(251,246,238,0.24)' }} />
                            </div>
                          </div>
                        );
                      })}
                      {/* 빈 칸 = 새 책 (마지막 선반에만) */}
                      {si === shelves.length - 1 && (
                        addingBook ? (
                          <div style={{ width: 176, height: 188, border: `2px dashed ${PW.accent}`, borderRadius: '3px 5px 5px 3px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(255,253,248,0.72)', marginLeft: 6, padding: '0 14px', flex: 'none' }}>
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
                            onClick={() => setAddingBook(true)}
                            style={{ width: 58, height: 188, border: '2px dashed #c0ae90', borderRadius: '3px 5px 5px 3px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#a8987e', marginLeft: 6, flex: 'none', transition: 'border-color 0.15s ease, color 0.15s ease' }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = PW.accent; e.currentTarget.style.color = PW.accent; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#c0ae90'; e.currentTarget.style.color = '#a8987e'; }}
                          >
                            <span style={{ writingMode: 'vertical-rl', fontSize: 13, letterSpacing: '0.12em' }}>＋ 새 책</span>
                          </div>
                        )
                      )}
                    </div>
                    {/* 선반 널빤지 */}
                    <div style={{ height: 15, margin: '0 -32px', background: 'linear-gradient(180deg,#c3a87e,#967a55)', boxShadow: '0 6px 10px rgba(60,40,20,0.22), inset 0 1px 0 rgba(255,255,255,0.35)' }} />
                  </div>
                ))}
                <div style={{ height: 10 }} />
              </div>
            </div>

            {/* 서가 명판 */}
            <div style={{ textAlign: 'center', marginTop: 22 }}>
              <span style={{ display: 'inline-block', padding: '7px 20px', background: 'linear-gradient(180deg,#eadcbd,#d9c7a2)', border: '1px solid #c3ae86', borderRadius: 8, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 6px rgba(60,40,20,0.12)', fontSize: 12.5, letterSpacing: '0.16em', color: '#6b5a3e', fontWeight: 700 }}>
                책 {topics.length}권 · 문서 {docs.length}편
              </span>
            </div>

            {/* 이어서 읽기 */}
            {recentDocs.length > 0 && (
              <div style={{ marginTop: 46, textAlign: 'center' }}>
                <div style={{ fontSize: 12, letterSpacing: '0.2em', color: PW.faint, fontWeight: 700, marginBottom: 14 }}>이어서 읽기</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {recentDocs.map(({ doc: d, topic: t }) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => openDoc(d.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 16px', background: PW.inputBg, border: `1px solid ${PW.cardLine}`, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(60,45,30,0.06)', transition: 'border-color 0.15s ease, transform 0.15s ease' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = PW.accent; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = PW.cardLine; e.currentTarget.style.transform = 'none'; }}
                    >
                      <span aria-hidden style={{ width: 8, height: 12, background: t?.tint ?? PW.accent, borderRadius: '1px 2px 2px 1px', flex: 'none', boxShadow: 'inset -2px 0 0 rgba(0,0,0,0.2)' }} />
                      <span style={{ fontSize: 13.5, color: PW.ink, fontWeight: 600 }}>{d.title}</span>
                      <span style={{ fontSize: 11.5, color: PW.faint }}>{t?.name} · {fmtRel(d.updatedAt)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
