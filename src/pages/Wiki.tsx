/**
 * 마이위키 (/wiki) — "한 주제를 깊게 파는 개인 백과사전".
 * 확정 시안(Wiki.dc.html, 2026-07-16) 구현: 딥그린 프레임 + 종이 캔버스.
 *
 * 화면 3장: 서가(주제 홈) · 문서 · 검색. 좌측 다크 레일 = 주제·문서 트리.
 * 본문 편집·연결·백링크는 WikiDocView 담당.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { notify } from '@/lib/notify';
import { SERIF, STUB_TEXT_LENGTH, WK, type WikiDoc, type WikiTopic } from '@/types/mywiki';
import { mywikiStore } from '@/services/mywikiStore';
import { useMyWiki } from '@/hooks/useMyWiki';
import { wikiPlainText, outgoingLinkIds } from '@/lib/mywiki/html';
import { WikiDocView } from '@/components/mywiki/WikiDocView';

type Screen = 'library' | 'doc' | 'search';

const SCROLLBAR_CSS = `
.wiki-scroll::-webkit-scrollbar { width: 10px; }
.wiki-scroll::-webkit-scrollbar-thumb { background: #D8D2C4; border-radius: 8px; border: 3px solid transparent; background-clip: padding-box; }
.wiki-rail-scroll::-webkit-scrollbar { width: 8px; }
.wiki-rail-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 8px; }
`;

export default function Wiki() {
  const { topics, docs } = useMyWiki();

  const [screen, setScreen] = useState<Screen>('library');
  const [topicId, setTopicId] = useState<string | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addingTopic, setAddingTopic] = useState(false);
  const [topicName, setTopicName] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // 첫 로드: 첫 주제 선택
  useEffect(() => {
    if (!topicId && topics.length > 0) setTopicId(topics[0].id);
  }, [topics, topicId]);

  // 삭제된 문서가 활성일 때 정리
  useEffect(() => {
    if (activeDocId && !docs.some((d) => d.id === activeDocId)) {
      setActiveDocId(null);
      setScreen('library');
    }
  }, [docs, activeDocId]);

  const topic: WikiTopic | null = topics.find((t) => t.id === topicId) ?? topics[0] ?? null;
  const activeDoc: WikiDoc | null = activeDocId ? docs.find((d) => d.id === activeDocId) ?? null : null;

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

  const openDoc = (id: string) => {
    const d = docs.find((x) => x.id === id);
    if (!d) return;
    // 조상 펼치기
    const exp = { ...expanded, [d.topicId]: true };
    let p = d.parentId;
    while (p) {
      exp[p] = true;
      p = docs.find((x) => x.id === p)?.parentId ?? null;
    }
    setExpanded(exp);
    setTopicId(d.topicId);
    setActiveDocId(id);
    setScreen('doc');
  };

  const addTopic = () => {
    const name = topicName.trim();
    setAddingTopic(false);
    setTopicName('');
    if (!name) return;
    const t = mywikiStore.addTopic(name);
    setTopicId(t.id);
    setScreen('library');
    notify.success(`'${t.name}' 주제를 만들었어요`, { description: '첫 문서를 파보세요' });
  };

  const addChildDoc = () => {
    if (!topic) { setAddingTopic(true); return; }
    const parentId = screen === 'doc' && activeDoc ? activeDoc.id : null;
    const d = mywikiStore.addDoc({ topicId: topic.id, parentId, title: '새 문서' });
    openDoc(d.id);
    notify.success(parentId ? '하위 문서를 만들었어요' : '새 문서를 만들었어요');
  };

  /* ── 트리 행 평탄화 ── */
  interface Row {
    key: string;
    depth: number;
    title: string;
    isTopic: boolean;
    hasKids: boolean;
    exp: boolean;
    active: boolean;
    stub: boolean;
    onClick: () => void;
  }
  const rows: Row[] = [];
  for (const t of topics) {
    const kids = childrenOf(t.id, null);
    const exp = expanded[t.id] ?? true;
    rows.push({
      key: t.id, depth: 0, title: t.name, isTopic: true, hasKids: kids.length > 0, exp,
      active: screen === 'library' && topic?.id === t.id,
      stub: false,
      onClick: () => {
        setExpanded((e) => ({ ...e, [t.id]: !(e[t.id] ?? true) }));
        setTopicId(t.id);
        setScreen('library');
        setActiveDocId(null);
      },
    });
    const walk = (parentId: string, depth: number) => {
      for (const d of childrenOf(t.id, parentId === t.id ? null : parentId)) {
        const dk = childrenOf(t.id, d.id);
        const dexp = expanded[d.id] ?? false;
        rows.push({
          key: d.id, depth, title: d.title, isTopic: false, hasKids: dk.length > 0, exp: dexp,
          active: screen === 'doc' && activeDocId === d.id,
          stub: wikiPlainText(d.body).length < STUB_TEXT_LENGTH,
          onClick: () => {
            if (dk.length > 0) setExpanded((e) => ({ ...e, [d.id]: !(e[d.id] ?? false) }));
            openDoc(d.id);
          },
        });
        if (dexp) walk(d.id, depth + 1);
      }
    };
    if (exp) walk(t.id, 1);
  }

  /* ── 브레드크럼 (문서 화면) ── */
  const crumbs = useMemo(() => {
    if (!activeDoc || !topic) return [];
    const chain: WikiDoc[] = [];
    let cur: WikiDoc | undefined = activeDoc;
    while (cur) {
      chain.unshift(cur);
      cur = cur.parentId ? docs.find((d) => d.id === cur!.parentId) : undefined;
    }
    return [
      { title: topic.name, onClick: () => { setScreen('library'); setActiveDocId(null); } },
      ...chain.map((c, i) => ({
        title: c.title,
        onClick: i === chain.length - 1 ? undefined : () => openDoc(c.id),
      })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDoc, topic, docs]);

  /* ── 검색 ── */
  const searchResults = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return docs
      .filter((d) => d.title.toLowerCase().includes(q) || wikiPlainText(d.body).toLowerCase().includes(q))
      .slice(0, 20)
      .map((d) => {
        const t = topics.find((x) => x.id === d.topicId);
        const parent = d.parentId ? docs.find((x) => x.id === d.parentId) : null;
        const plain = wikiPlainText(d.body);
        return {
          id: d.id,
          title: d.title,
          crumb: [t?.name, parent?.title].filter(Boolean).join(' › '),
          snippet: plain ? `${plain.slice(0, 90)}${plain.length > 90 ? '…' : ''}` : '아직 내용이 없어요',
        };
      });
  }, [searchQ, docs, topics]);

  const goSearch = () => {
    setScreen('search');
    setTimeout(() => searchRef.current?.focus(), 60);
  };

  /* ── 서가 카드 ── */
  const libraryCards = useMemo(() => {
    if (!topic) return [];
    return docs
      .filter((d) => d.topicId === topic.id)
      .map((d) => {
        const parent = d.parentId ? docs.find((x) => x.id === d.parentId) : null;
        const plain = wikiPlainText(d.body);
        const stub = plain.length < STUB_TEXT_LENGTH;
        const mentions = docs.filter((o) => o.id !== d.id && outgoingLinkIds(o.body).includes(d.id)).length;
        return {
          id: d.id,
          section: parent?.title ?? topic.name,
          title: d.title,
          desc: plain ? `${plain.slice(0, 64)}${plain.length > 64 ? '…' : ''}` : '아직 정리 중 — 첫 문장을 적어보세요.',
          stub,
          foot: stub ? '◌ 정리 중' : mentions > 0 ? `언급 ${mentions}` : '',
        };
      });
  }, [topic, docs]);

  const tabStyle = (on: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', height: 30, padding: '0 15px', border: 'none', borderRadius: 8,
    fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    background: on ? WK.green : 'transparent', color: on ? '#fff' : '#9DB6AB',
  });

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: WK.frame, fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif" }}>
      <style>{SCROLLBAR_CSS}</style>

      {/* ── 상단 바 ── */}
      <header style={{ height: 56, flex: 'none', display: 'flex', alignItems: 'center', gap: 20, padding: '0 20px', color: '#E8EFE9' }}>
        <div
          onClick={() => { setScreen('library'); setActiveDocId(null); }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, letterSpacing: '-0.01em', fontSize: 16, cursor: 'pointer', userSelect: 'none' }}
        >
          <span style={{ display: 'inline-flex', width: 26, height: 26, alignItems: 'center', justifyContent: 'center', background: WK.green, borderRadius: 7, fontSize: 14 }}>서</span>
          마이위키
        </div>
        <nav style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.06)', padding: 3, borderRadius: 10 }}>
          <button type="button" onClick={() => { setScreen('library'); setActiveDocId(null); }} style={tabStyle(screen === 'library')}>서가</button>
          <button
            type="button"
            onClick={() => {
              if (activeDoc) setScreen('doc');
              else {
                const first = topic ? childrenOf(topic.id, null)[0] : undefined;
                if (first) openDoc(first.id);
                else notify.info('아직 문서가 없어요', { description: '서가에서 첫 문서를 만들어보세요' });
              }
            }}
            style={tabStyle(screen === 'doc')}
          >문서</button>
          <button type="button" onClick={goSearch} style={tabStyle(screen === 'search')}>검색</button>
        </nav>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={goSearch}
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 14px 0 12px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 9, color: '#B7CABE', fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <Search size={14} /> 무엇이든 찾기
        </button>
      </header>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', padding: '0 10px 10px' }}>
        {/* ── 좌측 레일: 주제 · 트리 ── */}
        <aside style={{ width: 280, flex: 'none', display: 'flex', flexDirection: 'column', background: WK.rail, borderRadius: '14px 0 0 14px', color: '#CFDDD4' }} className="hidden lg:flex">
          <div style={{ padding: '18px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#7FA594', textTransform: 'uppercase' }}>주제</span>
            <button
              type="button"
              title="새 주제"
              aria-label="새 주제"
              onClick={() => setAddingTopic(true)}
              style={{ width: 24, height: 24, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#CFDDD4', borderRadius: 6, cursor: 'pointer', fontSize: 15, lineHeight: 1 }}
            >+</button>
          </div>
          <div className="wiki-rail-scroll" style={{ flex: 1, overflow: 'auto', padding: '2px 10px 14px' }}>
            {addingTopic && (
              <input
                autoFocus
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addTopic(); if (e.key === 'Escape') { setAddingTopic(false); setTopicName(''); } }}
                onBlur={addTopic}
                placeholder="주제 이름 + Enter"
                style={{ width: '100%', margin: '2px 0 6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: '#E8EFE9', borderRadius: 8, padding: '7px 10px', fontSize: 13.5, outline: 'none', fontFamily: 'inherit' }}
              />
            )}
            {rows.length === 0 && !addingTopic && (
              <div style={{ padding: '14px 10px', fontSize: 12.5, color: '#6B9080', lineHeight: 1.6 }}>
                아직 주제가 없어요.<br />위의 + 로 첫 주제를 꽂아보세요.
              </div>
            )}
            {rows.map((r) => (
              <div
                key={r.key}
                onClick={r.onClick}
                title={r.title}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: `7px 10px 7px ${8 + r.depth * 15}px`,
                  borderRadius: 8, cursor: 'pointer', marginBottom: 1,
                  background: r.active ? 'rgba(45,106,79,0.35)' : 'transparent',
                }}
              >
                <span style={{ width: 12, fontSize: 10, color: '#7FA594', flex: 'none' }}>{r.hasKids ? (r.exp ? '▾' : '▸') : ''}</span>
                {!r.isTopic && (
                  <span style={{ width: 5, height: 5, borderRadius: '50%', flex: 'none', background: r.stub ? '#C77' : '#5C9A80' }} />
                )}
                <span style={{
                  flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em',
                  fontSize: r.isTopic ? 14.5 : 13.5,
                  fontWeight: r.isTopic ? 700 : r.active ? 600 : 400,
                  color: r.active ? '#F1F8F3' : r.isTopic ? '#E8EFE9' : '#B9CABF',
                }}>{r.title}</span>
                {r.stub && (
                  <span style={{ fontSize: 10, color: '#E0A79F', background: 'rgba(178,58,46,0.18)', padding: '1px 6px', borderRadius: 10, flex: 'none' }}>정리 중</span>
                )}
              </div>
            ))}
            <div style={{ margin: '8px 12px 0', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div
                onClick={addChildDoc}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 8px', borderRadius: 8, color: '#8FB3A2', fontSize: 13, cursor: 'pointer' }}
              >
                <Plus size={14} /> {screen === 'doc' && activeDoc ? '하위 문서 추가' : '새 문서 추가'}
              </div>
              <div style={{ fontSize: 11, color: '#6B9080', padding: '2px 8px 0', lineHeight: 1.5 }}>
                {screen === 'doc' && activeDoc ? `'${activeDoc.title}' 아래로 들어가요` : '주제 바로 아래에 만들어요'}
              </div>
            </div>
          </div>
        </aside>

        {/* ── 메인 캔버스 ── */}
        {screen === 'doc' && activeDoc ? (
          <WikiDocView
            doc={activeDoc}
            docs={docs}
            crumbs={crumbs}
            onOpenDoc={openDoc}
            onDeleted={() => { setActiveDocId(null); setScreen('library'); }}
          />
        ) : screen === 'search' ? (
          <main className="wiki-scroll" style={{ flex: 1, minWidth: 0, overflow: 'auto', background: WK.paper, borderRadius: '0 14px 14px 0' }}>
            <div style={{ maxWidth: 720, margin: '0 auto', padding: '56px 40px 100px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #E2DCCD', background: '#fff', borderRadius: 14, padding: '0 18px', height: 58, boxShadow: '0 6px 24px rgba(20,52,43,0.05)' }}>
                <Search size={19} color={WK.faint} />
                <input
                  ref={searchRef}
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="문서 제목이나 내용으로 찾기"
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 17, color: WK.ink, background: 'transparent', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {searchResults.map((r) => (
                  <div key={r.id} onClick={() => openDoc(r.id)} style={{ border: '1px solid #EDE8DB', background: '#fff', borderRadius: 12, padding: '15px 18px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: WK.greenDark }}>{r.title}</span>
                      <span style={{ fontSize: 11.5, color: '#A7B0AA' }}>{r.crumb}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#7A857F', lineHeight: 1.6 }}>{r.snippet}</div>
                  </div>
                ))}
                {searchQ.trim() && searchResults.length === 0 && (
                  <div style={{ padding: 30, textAlign: 'center', color: '#A7B0AA', fontSize: 14 }}>검색어에 맞는 문서가 없어요</div>
                )}
                {searchQ.trim() && topic && (
                  <div
                    onClick={() => {
                      const d = mywikiStore.addDoc({ topicId: topic.id, parentId: null, title: searchQ.trim() });
                      setSearchQ('');
                      openDoc(d.id);
                      notify.success(`'${d.title}' 문서를 새로 팠어요`);
                    }}
                    style={{ border: '1px dashed #CBD6CD', borderRadius: 12, padding: '13px 18px', cursor: 'pointer', fontSize: 13.5, color: WK.green, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <Plus size={14} /> ‘{searchQ.trim()}’ 문서를 새로 팝니다 <span style={{ color: '#A7B0AA', fontWeight: 400 }}>· 주제: {topic.name}</span>
                  </div>
                )}
              </div>
            </div>
          </main>
        ) : (
          /* ── 서가 (주제 홈) ── */
          <main className="wiki-scroll" style={{ flex: 1, minWidth: 0, overflow: 'auto', background: WK.paper, borderRadius: '0 14px 14px 0' }}>
            {topic ? (
              <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 40px 100px' }}>
                <div style={{ fontSize: 13, color: WK.faint, letterSpacing: '0.04em' }}>지식 정원</div>
                <h1 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 34, color: WK.inkDeep, margin: '6px 0 4px', letterSpacing: '-0.02em' }}>{topic.name}</h1>
                <p style={{ fontSize: 15, color: '#6E7872', maxWidth: 560, lineHeight: 1.7, margin: '0 0 34px' }}>
                  문서 {libraryCards.length}개가 트리로 엮여 있어요. 카드를 눌러 들어가거나, 왼쪽 트리에서 구조를 살펴보세요.
                </p>
                {libraryCards.length === 0 ? (
                  <div
                    onClick={addChildDoc}
                    style={{ border: '1px dashed #CBD6CD', borderRadius: 14, padding: '44px 20px', textAlign: 'center', cursor: 'pointer', color: WK.green, fontWeight: 600, fontSize: 14.5 }}
                  >
                    ＋ 이 주제의 첫 문서를 파보세요
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                    {libraryCards.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => openDoc(c.id)}
                        style={{ display: 'flex', flexDirection: 'column', minHeight: 150, border: `1px solid ${c.stub ? '#EAD9D3' : '#EAE4D5'}`, background: '#fff', borderRadius: 14, padding: '18px 18px 16px', cursor: 'pointer' }}
                      >
                        <div style={{ fontSize: 12, color: '#8FB3A2', marginBottom: 8 }}>{c.section}</div>
                        <div style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 600, color: WK.inkDeep, marginBottom: 8 }}>{c.title}</div>
                        <div style={{ fontSize: 13, color: '#7A857F', lineHeight: 1.65, flex: 1 }}>{c.desc}</div>
                        {c.foot && (
                          <div style={{ marginTop: 12, fontSize: 11.5, color: c.stub ? WK.red : '#8FB3A2' }}>{c.foot}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#6E7872' }}>
                <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: WK.inkDeep }}>첫 주제를 꽂아보세요</div>
                <div style={{ fontSize: 14, maxWidth: 380, textAlign: 'center', lineHeight: 1.7 }}>
                  마이위키는 한 주제를 깊게 파는 백과사전이에요.<br />주식·요리·운동 — 무엇이든 한 권부터.
                </div>
                <button
                  type="button"
                  onClick={() => setAddingTopic(true)}
                  style={{ marginTop: 8, border: 'none', background: WK.green, color: '#fff', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >＋ 새 주제 만들기</button>
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  );
}
