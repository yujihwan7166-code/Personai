/**
 * 티켓북 (/tickets) — "내가 본 것들을 모으는 방".
 * 사이드바(2번) + 마스트헤드(2번) + 포스터 월(2번) / 보관함(1번+) / 연말결산(1번+Wrapped 밴드).
 * 기록 폼=중앙 모달(1번) · 상세=절취 스텁(2번). 저장 localStorage 'ticketbook.v1', 사진 IndexedDB.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Home, Award, BarChart3, Sparkles, Plus, Ticket, X, Compass, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { newId } from '@/lib/idGenerator';
import {
  loadTickets, saveTickets, TICKETS_CHANGED, DEFAULT_ACCENT, ACCENT_OPTIONS,
  KIND_LABEL, TICKET_KINDS, type TicketEntry, type TicketKind, type TicketStoreData, type WatchlistItem,
} from '@/lib/tickets/ticketStore';
import {
  MILESTONES, MILESTONE_META, earnedMilestones, newlyEarned, stampProgress, yearStats,
} from '@/lib/tickets/milestones';
import { aiRecommend, aiDiscover, type RecoResult } from '@/lib/tickets/aiFill';
import { trendingMedia, hasApiFor, type MediaSearchResult } from '@/lib/tickets/search';
import { deletePhotos } from '@/lib/tickets/photoStore';

type Candidate = { kind: TicketKind; title: string; creator?: string; year?: number; posterUrl?: string; genres?: string[] };
import {
  seedEntries, gradientFor, palFor, StarMeter, fmtShort, fmtDot, KIND_EMOJI, serialOf,
  todayKeyLocal, TICKETS_CSS,
} from '@/components/tickets/ticketVisuals';
import { TicketEntryModal, type TicketDraft } from '@/components/tickets/TicketEntryModal';
import { TicketDetailModal } from '@/components/tickets/TicketDetailModal';

type View = 'wall' | 'vault' | 'recap' | 'explore' | 'watchlist';
type NavKey = 'all' | 'starred' | TicketKind;

function firstLoad(): TicketStoreData {
  const s = loadTickets();
  if (s.entries.length === 0 && !localStorage.getItem('ticketbook.v1')) {
    return { ...s, entries: seedEntries() };
  }
  return s;
}

export default function Tickets() {
  const [store, setStore] = useState<TicketStoreData>(firstLoad);
  const [view, setView] = useState<View>('wall');
  const [nav, setNav] = useState<NavKey>('all');
  const [year, setYear] = useState<'all' | number>('all');
  const [recapYear, setRecapYear] = useState<number>(() => new Date().getFullYear());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryInitial, setEntryInitial] = useState<TicketEntry | null>(null);
  const [entryPrefill, setEntryPrefill] = useState<Candidate | null>(null);
  const [pendingWatchId, setPendingWatchId] = useState<string | null>(null);
  const [recoOpen, setRecoOpen] = useState(false);
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const { entries } = store;
  const accent = store.accent ?? DEFAULT_ACCENT;

  // 저장 스냅샷
  useEffect(() => { saveTickets(store); }, [store]);
  // 다른 탭/창 동기화
  useEffect(() => {
    const f = () => setStore(loadTickets());
    window.addEventListener(TICKETS_CHANGED, f);
    return () => window.removeEventListener(TICKETS_CHANGED, f);
  }, []);

  const top = () => { if (mainRef.current) mainRef.current.scrollTop = 0; };

  /* ── 액션 ── */
  const openNew = (prefill?: Candidate, fromWatchId?: string) => {
    setEntryInitial(null); setEntryPrefill(prefill ?? null); setPendingWatchId(fromWatchId ?? null); setEntryOpen(true);
  };
  const openEdit = (e: TicketEntry) => { setDetailId(null); setEntryInitial(e); setEntryPrefill(null); setPendingWatchId(null); setEntryOpen(true); };
  const openDetail = (id: string) => { setDetailId(id); };

  const addWatch = (c: Candidate) => {
    const item: WatchlistItem = { ...c, id: newId('wl'), addedAt: Date.now() };
    setStore((s) => ({ ...s, watchlist: [item, ...(s.watchlist ?? [])] }));
    toast.success(`'${c.title}' 을(를) 볼 것에 담았어요`);
  };
  const removeWatch = (id: string) => setStore((s) => ({ ...s, watchlist: (s.watchlist ?? []).filter((w) => w.id !== id) }));

  const handleSave = (draft: TicketDraft, editingId?: string) => {
    setEntryOpen(false);
    if (editingId) {
      setStore((s) => ({ ...s, entries: s.entries.map((e) => (e.id === editingId ? { ...e, ...draft } : e)) }));
      setDetailId(editingId);
      toast.success('티켓을 수정했어요');
      return;
    }
    const prev = entries.length;
    const created: TicketEntry = { ...draft, id: newId('tkt'), createdAt: Date.now() };
    const next = [...entries, created];
    const promotedId = pendingWatchId;
    setPendingWatchId(null);
    setStore((s) => ({
      ...s,
      entries: [...s.entries, created],
      watchlist: promotedId ? (s.watchlist ?? []).filter((w) => w.id !== promotedId) : s.watchlist,
    }));
    const earned = newlyEarned(prev, next.length);
    if (earned.length) {
      setCelebrate(earned[earned.length - 1]);
    } else {
      toast.success(`티켓이 발급됐어요 — NO.${String(next.length).padStart(4, '0')}`);
    }
  };

  const handleDelete = (id: string) => {
    const t = entries.find((e) => e.id === id);
    if (!t || !window.confirm(`"${t.title}" 티켓을 삭제할까요?`)) return;
    void deletePhotos(t.photoIds);
    setStore((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) }));
    setDetailId(null);
    toast('티켓을 버렸어요');
  };

  const setAccent = (c: string) => setStore((s) => ({ ...s, accent: c }));
  const setGoal = (count: number) => setStore((s) => ({ ...s, yearGoal: { year: new Date().getFullYear(), count } }));
  const clearGoal = () => setStore((s) => { const { yearGoal, ...rest } = s; return rest; });

  /* ── 파생값 ── */
  const nowY = new Date().getFullYear();
  const detail = detailId ? entries.find((e) => e.id === detailId) ?? null : null;
  const years = useMemo(
    () => [...new Set(entries.map((e) => Number(e.watchedAt.slice(0, 4))).filter(Boolean))].sort((a, b) => b - a),
    [entries],
  );
  const catCount = (k: TicketKind) => entries.filter((e) => e.kind === k).length;
  const yStats = yearStats(entries, nowY);
  const thisMonthKey = todayKeyLocal().slice(0, 7);
  const monthCount = entries.filter((e) => e.watchedAt.startsWith(thisMonthKey)).length;

  const wallList = useMemo(() => {
    let l = entries.slice();
    if (nav === 'starred') l = l.filter((e) => e.rating === 5);
    else if (TICKET_KINDS.includes(nav as TicketKind)) l = l.filter((e) => e.kind === nav);
    if (year !== 'all') l = l.filter((e) => e.watchedAt.startsWith(`${year}-`));
    return l.sort((a, b) => (b.watchedAt.localeCompare(a.watchedAt)) || (b.createdAt - a.createdAt));
  }, [entries, nav, year]);

  const earnedMs = earnedMilestones(entries.length);
  const goalCount = store.yearGoal ? entries.filter((e) => e.watchedAt.startsWith(`${store.yearGoal!.year}-`)).length : 0;
  const goalPct = store.yearGoal ? Math.min(1, goalCount / store.yearGoal.count) : 0;

  const viewTitle = view === 'vault' ? '마일스톤 · 스탬프'
    : view === 'recap' ? '연말결산'
    : view === 'explore' ? '탐색'
    : view === 'watchlist' ? '찜' + (store.watchlist?.length ? ` · ${store.watchlist.length}` : '')
    : nav === 'all' ? '전체 티켓' : nav === 'starred' ? '최고의 티켓' : KIND_LABEL[nav as TicketKind];
  const viewSub = view === 'vault' ? '모으다 보면 발급되는 기념 티켓과 장르 스탬프. 숙제는 없어요.'
    : view === 'explore' ? '세상의 인기작을 둘러보고, 보고 싶은 걸 찜해두세요.'
    : view === 'watchlist' ? '아직 안 봤지만 보고 싶어 담아둔 것들. 보고 나면 별점 매겨 티켓으로.'
    : view === 'recap' ? '한 해 동안 무엇을 얼마나 봤는지 돌아봐요.'
    : nav === 'starred' ? '별 다섯 개를 준, 다시 볼 작품들.'
    : nav === 'all' ? '내가 본 모든 것들이 이 벽에 걸려 있어요.'
    : { movie: '스크린 앞에서 보낸 시간들.', drama: '몰아본 시리즈의 기록.', book: '페이지를 넘긴 흔적들.', game: '끝까지 플레이한 세계들.', show: '그 밤, 그 무대의 기억.' }[nav as TicketKind];

  const goWall = (n: NavKey) => { setNav(n); setView('wall'); setYear('all'); top(); };

  const rootStyle = { '--tk-accent': accent } as CSSProperties;

  return (
    <div className="tickets-theme" style={{ ...rootStyle, position: 'relative', display: 'flex', height: '100dvh', overflow: 'hidden', background: 'radial-gradient(1200px 700px at 62% -8%, #16223a 0%, #0b111d 60%)', color: '#eef1f6', fontSize: 14 }}>
      <style>{TICKETS_CSS}</style>

      {/* ══════ 사이드바 ══════ */}
      <aside className="tk-scroll hidden lg:flex" style={{ width: 300, flex: 'none', background: '#0f1826', borderRight: '1px solid #ffffff12', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: '20px 18px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'linear-gradient(150deg,#233350,#141d2e)', border: '1px solid #ffffff1a', color: 'var(--tk-accent)' }}><Ticket size={21} /></div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.02em' }}>티켓북</div>
              <div style={{ fontSize: 11.5, color: '#7d8798', marginTop: 1 }}>내가 본 것들을 모으는 방</div>
            </div>
          </div>
          <button type="button" className="tk-press" onClick={() => openNew()} style={{ width: '100%', marginTop: 16, height: 44, borderRadius: 11, background: 'var(--tk-accent)', color: '#231907', fontWeight: 800, fontSize: 14.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, border: 'none', cursor: 'pointer', boxShadow: '0 8px 20px rgba(230,165,63,.28)' }}>
            <Plus size={17} strokeWidth={2.4} /> 새 티켓 끊기
          </button>
        </div>

        {/* 안 본 것 찾기 */}
        <div style={{ padding: '2px 18px 4px', fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', color: '#4d586a', textTransform: 'uppercase' }}>볼 것 찾기</div>
        <div style={{ padding: '0 12px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <NavRow icon={<Compass size={17} />} label="탐색" active={view === 'explore'} onClick={() => { setView('explore'); top(); }} />
          <NavRow icon={<Bookmark size={17} fill={view === 'watchlist' ? 'currentColor' : 'none'} />} label="찜" count={store.watchlist?.length ?? 0} active={view === 'watchlist'} onClick={() => { setView('watchlist'); top(); }} />
          <NavRow icon={<Sparkles size={17} />} label="다음 뭐 볼까?" badge="AI" dim={entries.length < 3} onClick={() => { if (entries.length < 3) { toast('기록이 3편 이상이면 분석할 수 있어요'); return; } setRecoOpen(true); }} />
        </div>

        <div style={{ margin: '8px 18px', height: 1, background: '#ffffff10' }} />

        {/* 본 것 저장 */}
        <div style={{ padding: '2px 18px 4px', fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', color: '#4d586a', textTransform: 'uppercase' }}>내 기록</div>
        <div style={{ padding: '0 12px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <NavRow icon={<Home size={17} />} label="전체 보기" count={entries.length} active={view === 'wall' && nav === 'all'} onClick={() => goWall('all')} />
          {/* 전체 보기(벽)를 보는 중일 때만, 그 아래로 필터(최고의 티켓·카테고리)가 펼쳐진다 */}
          {view === 'wall' && (
            <>
              <NavRow indent emoji="⭐" label="최고의 티켓" count={entries.filter((e) => e.rating === 5).length} active={nav === 'starred'} onClick={() => goWall('starred')} />
              {TICKET_KINDS.map((k) => (
                <NavRow key={k} indent emoji={KIND_EMOJI[k]} label={KIND_LABEL[k]} count={catCount(k)} active={nav === k} onClick={() => goWall(k)} />
              ))}
            </>
          )}
          <NavRow icon={<Award size={17} />} label="마일스톤 · 스탬프" active={view === 'vault'} onClick={() => { setView('vault'); top(); }} />
          <NavRow icon={<BarChart3 size={17} />} label="연말결산" active={view === 'recap'} onClick={() => { setView('recap'); setRecapYear(years[0] ?? nowY); top(); }} />
        </div>

        <div style={{ flex: 1, minHeight: 14 }} />
        {/* 테마색 */}
        <div style={{ padding: '10px 18px 4px', fontSize: 11, fontWeight: 700, letterSpacing: '.09em', color: '#5f6b7e', textTransform: 'uppercase' }}>테마색</div>
        <div style={{ display: 'flex', gap: 8, padding: '0 18px 16px' }}>
          {ACCENT_OPTIONS.map((c) => (
            <button key={c} type="button" aria-label={`테마색 ${c}`} onClick={() => setAccent(c)} style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', border: accent === c ? '2px solid #eef1f6' : '2px solid transparent', outline: accent === c ? `1px solid ${c}` : 'none' }} />
          ))}
        </div>
      </aside>

      {/* ══════ 메인 ══════ */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {/* 마스트헤드 */}
        <header style={{ flex: 'none', padding: '22px 34px 16px', borderBottom: '1px solid #ffffff0d', background: 'linear-gradient(#0d1524cc,#0b111d99)', backdropFilter: 'blur(6px)', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: '-.02em' }}>{viewTitle}</h1>
                {view === 'wall' && <span style={{ fontSize: 13, color: '#6f7b8e', fontFamily: 'var(--tk-mono)', paddingBottom: 3 }}>{wallList.length}장</span>}
              </div>
              <div style={{ fontSize: 13.5, color: '#8b95a6', marginTop: 5 }}>{viewSub}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 22, padding: '9px 20px', borderRadius: 13, background: '#141f31', border: '1px solid #ffffff12' }}>
                <Stat value={String(yStats.count)} label="올해 편수" />
                <div style={{ width: 1, background: '#ffffff14' }} />
                <Stat value={`★${yStats.avgRating.toFixed(1)}`} label="평균 별점" accent />
                <div style={{ width: 1, background: '#ffffff14' }} />
                <Stat value={String(monthCount)} label="이번 달" />
              </div>
              <button type="button" className="tk-lift" onClick={() => { if (entries.length < 3) { toast('기록이 3편 이상이면 분석할 수 있어요'); return; } setRecoOpen(true); }} style={{ height: 44, padding: '0 18px', borderRadius: 12, background: 'linear-gradient(135deg,#1c2942,#182338)', border: '1px solid #ffffff1f', color: '#eef1f6', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, opacity: entries.length < 3 ? .55 : 1, cursor: 'pointer' }}>
                <Sparkles size={15} /> 다음 뭐 볼까?
              </button>
            </div>
          </div>
          {view === 'wall' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
              {(['all', ...years] as ('all' | number)[]).map((y) => (
                <button key={y} type="button" onClick={() => setYear(y)} style={yearChip(String(year) === String(y))}>{y === 'all' ? '전체' : y}</button>
              ))}
            </div>
          )}
        </header>

        {/* 콘텐츠 스크롤 */}
        <div ref={mainRef} className="tk-scroll" style={{ flex: 1, overflowY: 'auto', padding: '26px 34px 60px' }}>
          {(view === 'explore' || view === 'watchlist') && (
            <ExploreView mode={view === 'explore' ? 'browse' : 'watch'} entries={entries} watchlist={store.watchlist ?? []} onAddWatch={addWatch} onRemoveWatch={removeWatch} onWatched={(c, wid) => openNew(c, wid)} onGoBrowse={() => { setView('explore'); top(); }} />
          )}
          {view === 'wall' && (
            wallList.length === 0 ? (
              <EmptyWall onNew={() => openNew()} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(162px, 1fr))', gap: '20px 18px', animation: 'tk-fadeIn .35s' }}>
                {wallList.map((e) => <WallCard key={e.id} entry={e} allEntries={entries} onClick={() => openDetail(e.id)} />)}
              </div>
            )
          )}
          {view === 'vault' && (
            <VaultView entries={entries} earnedMs={earnedMs} goal={store.yearGoal} goalCount={goalCount} goalPct={goalPct} onSaveGoal={setGoal} onClearGoal={clearGoal} />
          )}
          {view === 'recap' && (
            <RecapView entries={entries} years={years} recapYear={recapYear} setRecapYear={setRecapYear} onOpen={openDetail} />
          )}
        </div>

        {/* 분위기 방사광 */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, background: 'radial-gradient(1100px 700px at 72% -12%, color-mix(in srgb, var(--tk-accent) 8%, transparent), transparent 60%), radial-gradient(140% 110% at 50% 50%, transparent 62%, rgba(2,5,12,.5) 100%)' }} />
      </main>

      {/* 모달들 */}
      <TicketEntryModal open={entryOpen} initial={entryInitial} prefill={entryPrefill} entriesCount={entries.length} onClose={() => { setEntryOpen(false); setPendingWatchId(null); }} onSave={handleSave} />
      <TicketDetailModal entry={detail} allEntries={entries} onClose={() => setDetailId(null)} onEdit={openEdit} onDelete={handleDelete} />
      {recoOpen && <RecommendModal entries={entries} watchlist={store.watchlist ?? []} onClose={() => setRecoOpen(false)} onAdd={(p) => { setRecoOpen(false); openNew(p); }} onWish={(p) => addWatch(p)} />}
      {celebrate != null && <CelebrateModal n={celebrate} onVault={() => { setCelebrate(null); setView('vault'); top(); }} onClose={() => setCelebrate(null)} />}
    </div>
  );
}

/* ══════ 사이드바 행 ══════ */
function NavRow({ icon, emoji, label, count, badge, active, dim, indent, onClick }: {
  icon?: React.ReactNode; emoji?: string; label: string; count?: number; badge?: string; active?: boolean; dim?: boolean; indent?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: indent ? 9 : 10, height: emoji || indent ? 34 : 40, padding: indent ? '0 12px 0 22px' : '0 12px', borderRadius: 9,
      fontSize: indent ? 13 : 14, fontWeight: active ? 700 : 600, background: active ? 'color-mix(in srgb, var(--tk-accent) 15%, transparent)' : 'transparent',
      color: active ? 'var(--tk-accent)' : indent ? '#9aa7bd' : '#c3ccd9', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', opacity: dim ? 0.5 : 1,
    }}>
      {indent && !active && <span aria-hidden style={{ width: 5, height: 5, borderRadius: 99, background: '#3a4a6b', flex: 'none', marginLeft: 1, marginRight: -2 }} />}
      {emoji ? <span style={{ width: 18, textAlign: 'center', fontSize: indent ? 14 : 15 }}>{emoji}</span> : icon}
      <span style={{ flex: 1 }}>{label}</span>
      {badge && <span style={{ fontSize: 10, color: 'var(--tk-accent)', fontWeight: 700, border: '1px solid #ffffff1f', borderRadius: 5, padding: '1px 5px' }}>{badge}</span>}
      {count != null && <span style={{ fontSize: 12.5, color: active ? 'var(--tk-accent)' : '#6f7b8e', fontFamily: 'var(--tk-mono)' }}>{count}</span>}
    </button>
  );
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--tk-mono)', fontSize: 20, fontWeight: 700, color: accent ? 'var(--tk-accent)' : '#eef1f6' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#7d8798', marginTop: 1 }}>{label}</div>
    </div>
  );
}

function yearChip(active: boolean): CSSProperties {
  return {
    height: 32, padding: '0 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
    fontFamily: 'var(--tk-mono)', cursor: 'pointer',
    background: active ? 'var(--tk-accent)' : '#0b131f', color: active ? '#231907' : '#c3ccd9',
    border: `1px solid ${active ? 'var(--tk-accent)' : '#ffffff1c'}`,
  };
}

/* ══════ 포스터 월 카드 ══════ */
function WallCard({ entry: e, allEntries, onClick }: { entry: TicketEntry; allEntries: TicketEntry[]; onClick: () => void }) {
  const hasPoster = !!e.posterUrl;
  const pal = palFor(e.title);
  return (
    <div className="tk-card" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div style={{ position: 'relative', aspectRatio: '2/3', borderRadius: 12, overflow: 'hidden', boxShadow: '0 10px 26px rgba(0,0,0,.5)' }}>
        {hasPoster ? (
          <img src={e.posterUrl} alt={e.title} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          /* 크림색 실물 티켓 (2번) */
          <div style={{ position: 'absolute', inset: 0, background: '#ece4d3', color: '#241f18', display: 'flex', flexDirection: 'column', padding: '16px 14px 14px' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 12, background: 'radial-gradient(circle at 6px -2px, transparent 5px, #ece4d3 5.5px)', backgroundSize: '12px 12px', backgroundPosition: '-6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px dashed #c3b79c', paddingBottom: 8 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.12em', color: '#8a7d63' }}>ADMIT ONE</span>
              <span style={{ fontSize: 15 }}>{KIND_EMOJI[e.kind]}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.16, letterSpacing: '-.02em', wordBreak: 'keep-all' }}>{e.title}</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#5c5343' }}>{e.creator}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, borderTop: '1.5px dashed #c3b79c', paddingTop: 7 }}>
              <span style={{ fontSize: 9.5, fontFamily: 'var(--tk-mono)', color: '#8a7d63' }}>{serialOf(allEntries, e.id)}</span>
              <span style={{ fontSize: 9.5, fontFamily: 'var(--tk-mono)', color: '#8a7d63' }}>{e.genres?.[0] ?? ''}</span>
            </div>
          </div>
        )}
        {/* 호버 오버레이 */}
        <div className="tk-hover" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg,#060a12f2 0%,#060a1288 46%,#060a1200 78%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 14 }}>
          <div style={{ marginBottom: 6 }}><StarMeter rating={e.rating} size={17} /></div>
          <div style={{ fontSize: 12, color: '#cdd5e2', fontWeight: 600 }}>{[e.where, fmtShort(e.watchedAt)].filter(Boolean).join(' · ')}</div>
          <div style={{ fontSize: 11.5, color: 'var(--tk-accent)', fontWeight: 700, marginTop: 6 }}>티켓 열기 →</div>
        </div>
      </div>
      {/* 커버 색 힌트(그라데) — 노커버가 아니어도 은은한 확인용 (미사용 pal 방지) */}
      <span hidden aria-hidden style={{ color: pal[2] }} />
    </div>
  );
}

function EmptyWall({ onNew }: { onNew: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '90px 20px', textAlign: 'center', animation: 'tk-fadeIn .4s' }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>🎟️</div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>아직 끊은 티켓이 없어요</div>
      <div style={{ fontSize: 13.5, color: '#8b95a6', marginTop: 6, maxWidth: 340 }}>방금 본 영화·책·게임 하나를 30초면 기록할 수 있어요. 제목만 치면 나머지는 알아서 채워져요.</div>
      <button type="button" onClick={onNew} style={{ marginTop: 20, height: 44, padding: '0 22px', borderRadius: 11, background: 'var(--tk-accent)', color: '#231907', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer' }}>첫 티켓 끊기</button>
    </div>
  );
}

/* ══════ 보관함 (마일스톤·스탬프·목표) ══════ */
function VaultView({ entries, earnedMs, goal, goalCount, goalPct, onSaveGoal, onClearGoal }: {
  entries: TicketEntry[]; earnedMs: number[]; goal?: { year: number; count: number };
  goalCount: number; goalPct: number; onSaveGoal: (n: number) => void; onClearGoal: () => void;
}) {
  const [draft, setDraft] = useState(String(goal?.count ?? 50));
  const chrono = useMemo(() => [...entries].sort((a, b) => (a.watchedAt === b.watchedAt ? a.createdAt - b.createdAt : a.watchedAt < b.watchedAt ? -1 : 1)), [entries]);
  const stamps = stampProgress(entries);
  const secLabel: CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: '.09em', color: '#7d8798', textTransform: 'uppercase' };
  return (
    <div style={{ animation: 'tk-fadeIn .35s', maxWidth: 1000 }}>
      <div style={{ ...secLabel, marginBottom: 16 }}>마일스톤 티켓</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {MILESTONES.map((m) => {
          const done = earnedMs.includes(m);
          const meta = MILESTONE_META[m];
          const doneDate = done ? chrono[m - 1]?.watchedAt : undefined;
          return (
            <div key={m} style={{ borderRadius: 14, overflow: 'hidden', height: 122, display: 'flex', background: done ? meta.foil : '#0e1830', border: done ? 'none' : '1.5px dashed #2a3854', color: done ? '#241502' : '#5c6c8c' }}>
              <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--tk-mono)', fontSize: 8.5, letterSpacing: '.14em', opacity: done ? .7 : 1 }}>
                  <span>MILESTONE TICKET</span><span>NO.{String(m).padStart(4, '0')}</span>
                </div>
                <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1, color: done ? 'inherit' : '#3a4a6b' }}>{m}<span style={{ fontSize: 13, fontWeight: 800, marginLeft: 5 }}>번째 티켓</span></div>
                {/* 바코드 줄 */}
                <div style={{ display: 'flex', gap: 1.5, height: 11, opacity: done ? .6 : .35, marginBottom: 2 }}>
                  {Array.from({ length: 26 }, (_, i) => <span key={i} style={{ width: i % 3 === 0 ? 2.5 : 1, background: done ? '#241502' : '#3a4a6b' }} />)}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, opacity: .75 }}>{done ? `${meta.name} · ${doneDate ? fmtDot(doneDate) : ''} 달성` : `${m - entries.length}장 남았어요`}</div>
              </div>
              {/* 인장 + ADMIT ONE 스텁 */}
              <div style={{ width: 58, borderLeft: `2px dashed ${done ? 'rgba(35,20,2,.4)' : '#2a3854'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', border: `1.5px ${done ? 'solid' : 'dashed'} ${done ? 'rgba(35,20,2,.55)' : '#2a3854'}`, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800 }}>{done ? '✦' : ''}</div>
                <div style={{ transform: 'rotate(90deg)', fontFamily: 'var(--tk-mono)', fontSize: 8.5, letterSpacing: '.18em', whiteSpace: 'nowrap', opacity: .7 }}>{done ? 'ADMIT ONE' : 'LOCKED'}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ ...secLabel, margin: '34px 0 16px' }}>장르 스탬프 <span style={{ fontWeight: 500, letterSpacing: 0, color: '#5f6b7e', textTransform: 'none' }}>— 같은 장르 5편이면 찍혀요</span></div>
      {stamps.length === 0 ? (
        <div style={{ fontSize: 13, color: '#7d8798' }}>아직 스탬프가 없어요. 같은 장르를 5편 모으면 도장이 찍혀요.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
          {stamps.map((s) => (
            <div key={s.genre} style={{ borderRadius: 14, padding: '18px 16px', background: '#141f31', border: '1px solid #ffffff12', textAlign: 'center' }}>
              <div style={{ width: 76, height: 76, margin: '0 auto', borderRadius: '50%', display: 'grid', placeItems: 'center', border: `2.5px ${s.earned ? 'solid' : 'dashed'} ${s.earned ? 'var(--tk-accent)' : '#5f6b7e'}`, color: s.earned ? 'var(--tk-accent)' : '#5f6b7e', transform: 'rotate(-8deg)', opacity: s.earned ? 1 : .5, background: s.earned ? 'color-mix(in srgb, var(--tk-accent) 8%, transparent)' : 'transparent' }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.12em' }}>{s.earned ? 'GENRE' : '진행중'}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.02em', marginTop: -1 }}>{s.genre}</div>
                  <div style={{ fontSize: 8.5, fontFamily: 'var(--tk-mono)' }}>{s.earned ? `×${s.count}` : `${s.count}/5`}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 12 }}>{s.genre}</div>
              <div style={{ fontSize: 11.5, color: '#8b95a6', marginTop: 2 }}>{s.earned ? `${s.count}편 · 획득!` : `앞으로 ${5 - s.count}편`}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...secLabel, margin: '34px 0 14px' }}>연간 목표 <span style={{ fontWeight: 500, letterSpacing: 0, color: '#5f6b7e', textTransform: 'none' }}>— 원할 때만. 못 채워도 아무 일 없어요</span></div>
      {goal ? (
        <div style={{ maxWidth: 480, background: '#101b30', border: '1px solid #ffffff12', borderRadius: 16, padding: 20, display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 96, height: 96, flex: 'none' }}>
            <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="48" cy="48" r="40" fill="none" stroke="#22304C" strokeWidth="9" />
              <circle cx="48" cy="48" r="40" fill="none" stroke="var(--tk-accent)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(goalPct * 251.3).toFixed(1)} 251.3`} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 19, fontWeight: 800, fontFamily: 'var(--tk-mono)' }}>{goalCount}/{goal.count}</div>
              <div style={{ fontSize: 10, color: '#6e80a1', fontFamily: 'var(--tk-mono)' }}>{Math.round(goalPct * 100)}%</div>
            </div>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{goal.year}년 목표</div>
            <div style={{ fontSize: 12.5, color: '#8b95a6', marginTop: 3 }}>{goalCount >= goal.count ? '목표 달성! 나머지는 전부 보너스예요' : `${goal.count}편 중 ${goalCount}편 — 잘 가고 있어요`}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <input type="number" min={1} max={999} value={draft} onChange={(e) => setDraft(e.target.value)} style={{ width: 74, background: '#0b1424', border: '1px solid #26334e', borderRadius: 9, color: '#eef1f6', padding: '7px 10px', fontSize: 13.5, colorScheme: 'dark' }} />
              <button type="button" onClick={() => onSaveGoal(Math.max(1, Math.min(999, Number(draft) || goal.count)))} style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid color-mix(in srgb, var(--tk-accent) 50%, transparent)', color: 'var(--tk-accent)', fontSize: 12.5, fontWeight: 700, background: 'none', cursor: 'pointer' }}>저장</button>
              <button type="button" onClick={onClearGoal} style={{ padding: '7px 12px', borderRadius: 9, color: '#6e80a1', fontSize: 12.5, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>목표 끄기</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 480, border: '1.5px dashed #2a3854', borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ fontSize: 13, color: '#8b95a6' }}>지금은 목표 없이 보는 중 — 그래도 티켓은 쌓여요.</div>
          <button type="button" onClick={() => onSaveGoal(Math.max(1, Number(draft) || 50))} style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid color-mix(in srgb, var(--tk-accent) 50%, transparent)', color: 'var(--tk-accent)', fontSize: 12.5, fontWeight: 700, background: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>목표 걸기</button>
        </div>
      )}
    </div>
  );
}

/* ══════ 연말결산 (Wrapped 밴드 + 대시보드) ══════ */
function RecapView({ entries, years, recapYear, setRecapYear, onOpen }: {
  entries: TicketEntry[]; years: number[]; recapYear: number; setRecapYear: (y: number) => void; onOpen: (id: string) => void;
}) {
  const rec = useMemo(() => entries.filter((e) => e.watchedAt.startsWith(`${recapYear}-`)), [entries, recapYear]);
  const prevRec = entries.filter((e) => e.watchedAt.startsWith(`${recapYear - 1}-`));
  const avg = rec.length ? rec.reduce((s, e) => s + e.rating, 0) / rec.length : 0;

  // 하이라이트 계산
  const rank = (key: (e: TicketEntry) => string | undefined) => {
    const m = new Map<string, number>();
    for (const e of rec) { const k = key(e); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  };
  const topCreator = (() => {
    const m = new Map<string, { n: number; sum: number }>();
    for (const e of rec) { if (!e.creator || e.creator === '미상') continue; const c = m.get(e.creator) ?? { n: 0, sum: 0 }; c.n++; c.sum += e.rating; m.set(e.creator, c); }
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n || b[1].sum - a[1].sum)[0];
  })();
  const topPlace = rank((e) => e.where);
  const topGenre = rank((e) => e.genres?.[0]);
  const lifeWorks = rec.filter((e) => e.rating === 5);
  const yearQuote = rec.find((e) => e.quotes?.length)?.quotes?.[0];
  const chrono = [...rec].sort((a, b) => (a.watchedAt < b.watchedAt ? -1 : 1));
  const firstT = chrono[0]; const lastT = chrono[chrono.length - 1];
  const rewatchN = rec.filter((e) => e.rewatch).length;
  const totalStars = Math.round(rec.reduce((s, e) => s + e.rating, 0));
  const months = Array.from({ length: 12 }, (_, i) => rec.filter((e) => Number(e.watchedAt.slice(5, 7)) === i + 1).length);
  const monthMax = Math.max(1, ...months);
  const hotMonth = months.indexOf(monthMax) + 1;
  const genreEnt = (() => { const m = new Map<string, number>(); for (const e of rec) for (const g of e.genres ?? []) m.set(g, (m.get(g) ?? 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); })();
  const genreMax = genreEnt.length ? genreEnt[0][1] : 1;
  const best5 = [...rec].sort((a, b) => b.rating - a.rating || (a.watchedAt < b.watchedAt ? 1 : -1)).slice(0, 5);

  type HL = { k: string; label: string; big: string; sub?: string };
  const highlights: HL[] = [];
  highlights.push({ k: 'total', label: `${recapYear}년`, big: `${rec.length}장`, sub: `평균 ★${avg.toFixed(1)}` });
  if (topCreator) highlights.push({ k: 'creator', label: '올해의 창작자', big: topCreator[0], sub: `${topCreator[1].n}편 · 평균 ★${(topCreator[1].sum / topCreator[1].n).toFixed(1)}` });
  if (topGenre) highlights.push({ k: 'genre', label: '최애 장르', big: topGenre[0], sub: `${topGenre[1]}편 — ${topGenre[0]}의 해` });
  if (topPlace) highlights.push({ k: 'place', label: '단골', big: topPlace[0], sub: `${topPlace[1]}번 찾았어요` });
  if (lifeWorks.length) highlights.push({ k: 'life', label: '인생작', big: `★5 ${lifeWorks.length}편`, sub: lifeWorks.slice(0, 3).map((e) => e.title).join(' · ') });
  if (firstT && lastT) highlights.push({ k: 'span', label: '처음과 끝', big: firstT.title, sub: `${fmtDot(firstT.watchedAt).slice(5)} → ${lastT.title} ${fmtDot(lastT.watchedAt).slice(5)}` });
  if (rec.length) highlights.push({ k: 'hot', label: '가장 뜨거웠던 달', big: `${hotMonth}월`, sub: `${monthMax}편을 봤어요` });
  if (rewatchN) highlights.push({ k: 'rw', label: '다시 본 작품', big: `${rewatchN}번`, sub: '좋으면 또 보죠' });
  highlights.push({ k: 'stars', label: '올해 준 별', big: `★ ${totalStars}`, sub: `${rec.length}장에 걸쳐` });
  if (prevRec.length) { const d = rec.length - prevRec.length; highlights.push({ k: 'vs', label: '작년과 비교', big: `${d >= 0 ? '+' : ''}${d}편`, sub: `${recapYear - 1}년 ${prevRec.length}편 → ${rec.length}편` }); }

  const panel: CSSProperties = { background: '#101b30', border: '1px solid #ffffff12', borderRadius: 16, padding: 20 };
  const secLabel: CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: '.09em', color: '#7d8798', textTransform: 'uppercase' };

  return (
    <div style={{ animation: 'tk-fadeIn .35s', maxWidth: 1040 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        {(years.length ? years : [recapYear]).map((y) => (
          <button key={y} type="button" onClick={() => setRecapYear(y)} style={{ ...yearChip(recapYear === y), height: 36, padding: '0 18px', fontSize: 14 }}>{y}년</button>
        ))}
      </div>

      {rec.length === 0 ? (
        <div style={{ ...panel, textAlign: 'center', padding: 70, color: '#8b95a6' }}><div style={{ fontSize: 38, marginBottom: 10 }}>🍿</div>이 해에는 기록된 티켓이 없어요.</div>
      ) : (
        <>
          {/* 하이라이트 밴드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14, marginBottom: 24 }}>
            {highlights.map((h, i) => (
              <div key={h.k} style={{ ...panel, background: i === 0 ? 'linear-gradient(150deg,#1a2740,#141d2e)' : '#101b30', padding: 18, animation: 'tk-fadeUp .4s ease both', animationDelay: `${i * 45}ms` }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', color: 'var(--tk-accent)', textTransform: 'uppercase' }}>{h.label}</div>
                <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.01em', marginTop: 8, lineHeight: 1.15, wordBreak: 'keep-all' }}>{h.big}</div>
                {h.sub && <div style={{ fontSize: 12, color: '#8b95a6', marginTop: 6, lineHeight: 1.5 }}>{h.sub}</div>}
              </div>
            ))}
          </div>

          {/* 대시보드 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 24 }}>
            <div>
              <div style={{ ...secLabel, marginBottom: 14 }}>올해의 베스트 5</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {best5.map((e, i) => (
                  <div key={e.id} className="tk-lift" onClick={() => onOpen(e.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 11, borderRadius: 12, background: '#141f31', border: '1px solid #ffffff12', cursor: 'pointer' }}>
                    <div style={{ fontFamily: 'var(--tk-mono)', fontSize: 22, fontWeight: 700, color: 'var(--tk-accent)', width: 26, textAlign: 'center' }}>{i + 1}</div>
                    <div style={{ width: 42, height: 60, borderRadius: 6, flex: 'none', overflow: 'hidden', background: e.posterUrl ? '#0b1424' : gradientFor(e.title) }}>{e.posterUrl && <img src={e.posterUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
                      <div style={{ fontSize: 12, color: '#8b95a6', marginTop: 2 }}>{e.creator} · {KIND_LABEL[e.kind]}</div>
                    </div>
                    <StarMeter rating={e.rating} size={13} letter={1} />
                  </div>
                ))}
              </div>
              {yearQuote && (
                <div style={{ ...panel, marginTop: 16, borderLeft: '3px solid var(--tk-accent)' }}>
                  <div style={{ ...secLabel, marginBottom: 8 }}>올해의 문장</div>
                  <div style={{ fontSize: 16, fontStyle: 'italic', lineHeight: 1.6, color: '#dce4f2' }}>"{yearQuote}"</div>
                </div>
              )}
            </div>
            <div>
              <div style={{ ...secLabel, marginBottom: 14 }}>장르 분포</div>
              <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 11 }}>
                {genreEnt.slice(0, 6).map(([g, c]) => (
                  <div key={g}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}><span style={{ fontWeight: 600 }}>{g}</span><span style={{ color: '#8b95a6', fontFamily: 'var(--tk-mono)' }}>{c}</span></div>
                    <div style={{ height: 8, borderRadius: 5, background: '#ffffff10', overflow: 'hidden' }}><div style={{ height: '100%', borderRadius: 5, background: 'var(--tk-accent)', width: `${Math.round(c / genreMax * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
              <div style={{ ...secLabel, margin: '24px 0 14px' }}>월별 관람</div>
              <div style={{ ...panel, display: 'flex', alignItems: 'flex-end', gap: 5, height: 130 }}>
                {months.map((v, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ width: '100%', borderRadius: '4px 4px 0 0', background: v === monthMax && v > 0 ? 'var(--tk-accent)' : v > 0 ? '#33415e' : '#1a2742', height: `${Math.max(3, v / monthMax * 100)}%`, minHeight: 3 }} />
                    <span style={{ fontSize: 9, color: '#6f7b8e', fontFamily: 'var(--tk-mono)' }}>{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ══════ AI 추천 ══════ */
function RecommendModal({ entries, watchlist, onClose, onAdd, onWish }: {
  entries: TicketEntry[]; watchlist: WatchlistItem[]; onClose: () => void;
  onAdd: (p: Candidate) => void; onWish: (p: Candidate) => void;
}) {
  const [state, setState] = useState<{ st: 'loading' | 'ok' | 'fail'; data?: RecoResult }>({ st: 'loading' });
  const [wished, setWished] = useState<Set<string>>(() => new Set());

  const run = useMemo(() => async () => {
    setState({ st: 'loading' });
    const liked = entries.filter((e) => e.rating >= 4);
    const r = await aiRecommend(liked, watchlist.map((w) => ({ title: w.title, kind: w.kind })));
    setState(r ? { st: 'ok', data: r } : { st: 'fail' });
  }, [entries, watchlist]);

  useEffect(() => { void run(); }, [run]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onMouseDown={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(6,9,15,.8)', backdropFilter: 'blur(4px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'tk-fadeIn .18s' }}>
      <div onMouseDown={(e) => e.stopPropagation()} className="tk-scroll" style={{ width: 640, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto', background: '#101a2e', border: '1px solid #ffffff17', borderRadius: 18, padding: 26, animation: 'tk-fadeUp .24s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18.5, fontWeight: 800 }}><Sparkles size={17} color="var(--tk-accent)" /> 다음 뭐 볼까?</div>
            <div style={{ fontSize: 12, color: '#8b95a6', marginTop: 3 }}>별점 준 취향 + 찜해둔 것까지 보고 골랐어요 — 카테고리는 넘나들어요</div>
          </div>
          <button type="button" onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6e80a1', cursor: 'pointer', background: 'none', border: 'none' }}><X size={16} /></button>
        </div>

        {state.st === 'loading' && (
          <div style={{ padding: '52px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', gap: 7 }}>{[0, 1, 2].map((i) => <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--tk-accent)', animation: `tk-blink 1.1s ${i * 0.18}s infinite` }} />)}</div>
            <div style={{ fontSize: 13, color: '#8b95a6' }}>영사기 돌리는 중… 별점 준 작품들을 읽고 있어요</div>
          </div>
        )}
        {state.st === 'fail' && (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#8b95a6', marginBottom: 16 }}>추천을 만들지 못했어요. 잠시 후 다시 시도해 주세요.</div>
            <button type="button" onClick={() => void run()} style={{ padding: '9px 18px', borderRadius: 999, border: '1px solid color-mix(in srgb, var(--tk-accent) 50%, transparent)', color: 'var(--tk-accent)', fontWeight: 700, fontSize: 13, background: 'none', cursor: 'pointer' }}>다시 추천받기</button>
          </div>
        )}
        {state.st === 'ok' && state.data && (
          <>
            <div style={{ marginTop: 18, padding: '14px 16px', background: 'color-mix(in srgb, var(--tk-accent) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--tk-accent) 30%, transparent)', borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'var(--tk-accent)', lineHeight: 1.55 }}>{state.data.taste}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              {state.data.picks.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '13px 15px', background: '#0d1728', border: '1px solid #ffffff10', borderRadius: 12 }}>
                  <span style={{ fontSize: 18 }}>{KIND_EMOJI[p.kind]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700 }}>{p.title}</span>
                      <span style={{ fontSize: 11.5, color: '#6e80a1' }}>{[KIND_LABEL[p.kind], p.creator].filter(Boolean).join(' · ')}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#9aa7bd', marginTop: 5, lineHeight: 1.5 }}>{p.reason}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                    <button type="button" disabled={wished.has(p.title)} onClick={() => { onWish({ kind: p.kind, title: p.title, creator: p.creator }); setWished((s) => new Set(s).add(p.title)); }}
                      style={{ padding: '7px 12px', borderRadius: 999, border: `1px solid ${wished.has(p.title) ? 'var(--tk-accent)' : 'color-mix(in srgb, var(--tk-accent) 50%, transparent)'}`, background: wished.has(p.title) ? 'color-mix(in srgb, var(--tk-accent) 15%, transparent)' : 'none', color: 'var(--tk-accent)', fontSize: 12, fontWeight: 700, cursor: wished.has(p.title) ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
                      {wished.has(p.title) ? '찜함' : '＋ 찜'}
                    </button>
                    <button type="button" onClick={() => onAdd({ kind: p.kind, title: p.title, creator: p.creator })} style={{ padding: '7px 12px', borderRadius: 999, border: 'none', background: 'var(--tk-accent)', color: '#231402', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>봤어요</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
              <div style={{ fontSize: 11, color: '#5c6c8c' }}>내가 누를 때만 작동해요 · 자동으로 튀어나오지 않아요</div>
              <button type="button" onClick={() => void run()} style={{ fontSize: 12, fontWeight: 700, color: '#8b95a6', cursor: 'pointer', background: 'none', border: 'none' }}>다시 추천받기</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════ 마일스톤 축하 ══════ */
function CelebrateModal({ n, onVault, onClose }: { n: number; onVault: () => void; onClose: () => void }) {
  const meta = MILESTONE_META[n];
  return (
    <div onMouseDown={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(4,8,17,.8)', backdropFilter: 'blur(8px)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'tk-fadeIn .2s' }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: 470, maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, animation: 'tk-popIn .3s ease' }}>
        <div style={{ width: '100%', height: 150, borderRadius: 16, overflow: 'hidden', display: 'flex', background: meta.foil, color: '#241502', boxShadow: '0 24px 70px -16px color-mix(in srgb, var(--tk-accent) 45%, transparent)' }}>
          <div style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: 'var(--tk-mono)', fontSize: 9, letterSpacing: '.16em', opacity: .7 }}>MILESTONE TICKET</div>
            <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-.02em', lineHeight: 1 }}>{n}<span style={{ fontSize: 16, fontWeight: 800, marginLeft: 6 }}>번째 티켓</span></div>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: .75 }}>{meta.name}</div>
          </div>
          <div style={{ width: 64, borderLeft: '2px dashed rgba(35,20,2,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ transform: 'rotate(90deg)', fontFamily: 'var(--tk-mono)', fontSize: 9, letterSpacing: '.2em', whiteSpace: 'nowrap', opacity: .7 }}>ADMIT ONE</div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>마일스톤 달성!</div>
          <div style={{ fontSize: 13, color: '#8b95a6', marginTop: 4 }}>특별 티켓이 보관함에 들어갔어요</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onVault} style={{ padding: '10px 20px', borderRadius: 999, fontSize: 13.5, fontWeight: 800, background: 'var(--tk-accent)', color: '#231907', cursor: 'pointer', border: 'none' }}>보관함 보기</button>
          <button type="button" onClick={onClose} style={{ padding: '10px 18px', borderRadius: 999, fontSize: 13.5, fontWeight: 700, color: '#8b95a6', cursor: 'pointer', background: 'none', border: 'none' }}>닫기</button>
        </div>
      </div>
    </div>
  );
}

/* ══════ 탐색 (둘러보기 / 볼 것) ══════ */
type DiscoverState = Candidate[] | 'loading' | 'error';

function ExploreView({ mode, entries, watchlist, onAddWatch, onRemoveWatch, onWatched, onGoBrowse }: {
  mode: 'browse' | 'watch';
  entries: TicketEntry[]; watchlist: WatchlistItem[];
  onAddWatch: (c: Candidate) => void; onRemoveWatch: (id: string) => void;
  onWatched: (c: Candidate, wid?: string) => void; onGoBrowse: () => void;
}) {
  const [cat, setCat] = useState<TicketKind>('movie');
  const [cache, setCache] = useState<Partial<Record<TicketKind, DiscoverState>>>({});

  const seenTitles = useMemo(() => new Set([...entries, ...watchlist].map((x) => x.title.trim())), [entries, watchlist]);
  const recordedTitles = useMemo(() => new Set(entries.map((e) => e.title.trim())), [entries]);
  const watchedTitles = useMemo(() => new Set(watchlist.map((w) => w.title.trim())), [watchlist]);

  useEffect(() => {
    if (mode !== 'browse' || cache[cat]) return;
    let alive = true;
    setCache((c) => ({ ...c, [cat]: 'loading' }));
    (async () => {
      let items: Candidate[] = [];
      if (hasApiFor(cat)) {
        const t = await trendingMedia(cat);
        items = t.map((m: MediaSearchResult) => ({ kind: m.kind, title: m.title, creator: m.creator, year: m.year, posterUrl: m.posterUrl, genres: m.genres }));
      }
      if (!items.length) {
        const d = await aiDiscover(cat, [...seenTitles]);
        items = d.map((x) => ({ kind: x.kind, title: x.title, creator: x.creator, year: x.year, genres: x.genres }));
      }
      if (alive) setCache((c) => ({ ...c, [cat]: items.length ? items : 'error' }));
    })();
    return () => { alive = false; };
  }, [mode, cat, cache, seenTitles]);

  const state = cache[cat];
  const chip = (active: boolean): CSSProperties => ({
    padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: `1px solid ${active ? 'var(--tk-accent)' : '#2a3854'}`,
    background: active ? 'var(--tk-accent)' : 'transparent', color: active ? '#231402' : '#c3ccd9', userSelect: 'none',
  });

  return (
    <div style={{ animation: 'tk-fadeIn .35s' }}>
      {mode === 'browse' ? (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {TICKET_KINDS.map((k) => (
              <button key={k} type="button" onClick={() => setCat(k)} style={chip(cat === k)}>{KIND_EMOJI[k]} {KIND_LABEL[k]}</button>
            ))}
          </div>
          {state === 'loading' || !state ? (
            <div style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, color: '#8b95a6' }}>
              <div style={{ display: 'flex', gap: 7 }}>{[0, 1, 2].map((i) => <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--tk-accent)', animation: `tk-blink 1.1s ${i * 0.18}s infinite` }} />)}</div>
              <div style={{ fontSize: 13 }}>{hasApiFor(cat) ? '인기작을 불러오는 중…' : 'AI가 요즘 볼만한 걸 고르는 중…'}</div>
            </div>
          ) : state === 'error' ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#8b95a6' }}>
              <div style={{ fontSize: 38, marginBottom: 10 }}>🎬</div>
              <div style={{ fontSize: 14 }}>지금은 목록을 불러오지 못했어요.</div>
              <div style={{ fontSize: 12.5, marginTop: 6 }}>영화·드라마는 TMDB 키를 넣으면 실시간 인기작이 떠요. 다른 카테고리는 AI가 채워요.</div>
              <button type="button" onClick={() => setCache((c) => ({ ...c, [cat]: undefined }))} style={{ marginTop: 16, padding: '8px 16px', borderRadius: 999, border: '1px solid color-mix(in srgb, var(--tk-accent) 50%, transparent)', color: 'var(--tk-accent)', fontWeight: 700, fontSize: 13, background: 'none', cursor: 'pointer' }}>다시 시도</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
              {state.map((c, i) => (
                <DiscoverCard key={`${c.title}${i}`} cand={c} recorded={recordedTitles.has(c.title.trim())} listed={watchedTitles.has(c.title.trim())}
                  onAdd={() => onAddWatch(c)} onWatched={() => onWatched(c)} />
              ))}
            </div>
          )}
        </>
      ) : (
        watchlist.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: '#8b95a6' }}>
            <Bookmark size={40} style={{ opacity: .4, marginBottom: 12 }} />
            <div style={{ fontSize: 17, fontWeight: 800, color: '#c3ccd9' }}>볼 것이 아직 비어 있어요</div>
            <div style={{ fontSize: 13.5, marginTop: 6 }}>탐색에서 마음에 드는 걸 '볼 것에 담기' 해두면 여기 모여요.</div>
            <button type="button" onClick={onGoBrowse} style={{ marginTop: 18, height: 42, padding: '0 20px', borderRadius: 11, background: 'var(--tk-accent)', color: '#231907', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer' }}>탐색하러 가기</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
            {watchlist.map((w) => (
              <DiscoverCard key={w.id} cand={w} recorded={false} listed watchlistMode
                onAdd={() => onRemoveWatch(w.id)} onWatched={() => onWatched(w, w.id)} />
            ))}
          </div>
        )
      )}
    </div>
  );
}

function DiscoverCard({ cand, recorded, listed, watchlistMode, onAdd, onWatched }: {
  cand: Candidate; recorded: boolean; listed: boolean; watchlistMode?: boolean; onAdd: () => void; onWatched: () => void;
}) {
  const hasPoster = !!cand.posterUrl;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: recorded ? 0.55 : 1 }}>
      <div className="tk-lift" style={{ position: 'relative', aspectRatio: '2/3', borderRadius: 12, overflow: 'hidden', boxShadow: '0 10px 26px rgba(0,0,0,.5)' }}>
        {hasPoster ? (
          <img src={cand.posterUrl} alt={cand.title} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: gradientFor(cand.title), color: palFor(cand.title)[2], padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--tk-mono)', fontSize: 8.5, letterSpacing: '.14em', opacity: .75 }}><span>{KIND_EMOJI[cand.kind]}</span><span>{cand.year ?? ''}</span></div>
            <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.16, wordBreak: 'keep-all' }}>{cand.title}</div>
            <div style={{ fontSize: 10.5, opacity: .8 }}>{cand.creator}</div>
          </div>
        )}
        {recorded && <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 10.5, fontWeight: 700, color: '#231402', background: 'var(--tk-accent)', borderRadius: 999, padding: '2px 8px' }}>기록함</div>}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cand.title}</div>
        <div style={{ fontSize: 11.5, color: '#8b95a6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[cand.creator, cand.year].filter(Boolean).join(' · ')}</div>
      </div>
      {recorded ? (
        <div style={{ fontSize: 11.5, color: '#6f7b8e', textAlign: 'center', padding: '6px 0' }}>이미 티켓북에 있어요</div>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={onAdd} title={watchlistMode ? '볼 것에서 빼기' : (listed ? '볼 것에 있음' : '볼 것에 담기')}
            style={{ flex: watchlistMode ? 'none' : 1, width: watchlistMode ? 34 : undefined, height: 34, borderRadius: 9, border: `1px solid ${listed && !watchlistMode ? 'var(--tk-accent)' : '#2a3854'}`, background: listed && !watchlistMode ? 'color-mix(in srgb, var(--tk-accent) 15%, transparent)' : 'transparent', color: listed || watchlistMode ? 'var(--tk-accent)' : '#c3ccd9', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            {watchlistMode ? <X size={14} /> : <><Bookmark size={13} fill={listed ? 'currentColor' : 'none'} /> {listed ? '담김' : '볼 것'}</>}
          </button>
          <button type="button" onClick={onWatched} style={{ flex: 1, height: 34, borderRadius: 9, border: 'none', background: 'var(--tk-accent)', color: '#231402', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>봤어요</button>
        </div>
      )}
    </div>
  );
}
