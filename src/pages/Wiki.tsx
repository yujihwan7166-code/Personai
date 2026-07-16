/**
 * 마이위키 (/wiki) — "나만의 지식 서고".
 *
 * 마이위키.dc.html 시안 구현 (2026-07-16 전면 교체):
 * 좌측 사이드바(검색·새 문서·홈·고정됨·분류 트리·최근 본 문서) +
 * 우측 화면 5종(홈 대시보드 / 검색 결과 / 태그 보기 / 문서 보기 / 문서 편집).
 * 본문은 경량 문법(## 소제목 · - 목록 · > 인용 · [[문서 제목]] 링크)의 플레인 텍스트,
 * [[링크]]는 있으면 이동·없으면 그 제목으로 새 문서. 백링크 박스 자동 계산.
 * 저장: localStorage 'mywiki.v2' (docs/cats/recent/collapsed 통짜 스냅샷).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

const AC = '#C74E29';
const TF = "'Gowun Batang','Pretendard Variable',serif";
const LS_KEY = 'mywiki.v2';
const CAT_PALETTE = ['#C74E29', '#31456A', '#2F5D50', '#8A6D3B', '#7A4988', '#A63A50'];

interface WikiCat { id: string; name: string; sym: string; color: string }
interface WikiDoc { id: string; title: string; cat: string; tags: string[]; pinned: boolean; updated: number; body: string }
interface Store { docs: WikiDoc[]; cats: WikiCat[]; recent: string[]; collapsed: string[] }
interface Editing { docId: string | null; title: string; catId: string; tags: string; body: string }

const PAGE_CSS = `
.mwk-scroll::-webkit-scrollbar { width: 10px; }
.mwk-scroll::-webkit-scrollbar-thumb { background: #DAD0BC; border-radius: 8px; border: 3px solid #F3EDE2; }
.mwk-scroll::-webkit-scrollbar-track { background: transparent; }
.mwk-main::-webkit-scrollbar-thumb { border-color: #FBF8F3; }
@keyframes mwk-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.mwk-row:hover { background: #EAE3D3 !important; }
.mwk-catadd { opacity: 0.5; }
.mwk-catadd:hover { opacity: 1; background: #E0D6C0; }
.mwk-card { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
.mwk-card:hover { transform: translateY(-3px); box-shadow: 0 12px 26px rgba(94,80,54,0.10); border-color: #DACDB1; }
.mwk-res { transition: all 0.15s ease; }
.mwk-res:hover { border-color: #D8CBB0; transform: translateY(-1px); box-shadow: 0 5px 16px rgba(94,80,54,0.08); }
.mwk-btn { transition: filter 0.15s; }
.mwk-btn:hover { filter: brightness(1.08); }
.mwk-obtn { transition: all 0.15s; }
.mwk-obtn:hover { border-color: #CDBFA4 !important; }
.mwk-del:hover { color: #B4372C !important; border-color: #DFC0B5 !important; }
.mwk-tagbig { transition: all 0.15s; }
.mwk-tagbig:hover { border-color: ${AC} !important; color: ${AC} !important; }
.mwk-tagchip { transition: all 0.15s; }
.mwk-tagchip:hover { background: #E9E0CB !important; color: #5A4E36 !important; }
.mwk-recent:hover { background: #F5EFE2; }
.mwk-bl:hover { background: #EFE7D5; }
.mwk-ghost:hover { background: #F5EFE2; }
.mwk-ta { transition: border-color 0.15s, box-shadow 0.15s; }
.mwk-ta:focus { border-color: ${AC}; box-shadow: 0 0 0 3px rgba(199,78,41,0.12); }
.mwk-deldraft:hover { background: #F6E4DF; }
.mwk-link { color: ${AC}; text-decoration: none; font-weight: 600; border-bottom: 1px solid rgba(199,78,41,0.32); }
.mwk-link:hover { color: #9E3813; }
.mwk-stub { color: #9A8F7D; text-decoration: none; font-weight: 500; border-bottom: 1px dashed #C4B8A2; }
.mwk-stub:hover { color: #6E6248; }
`;

function seed(): Store {
  const h = 3600000, day = 86400000, t = Date.now();
  const cats: WikiCat[] = [
    { id: 'c1', name: '영화·드라마', sym: '영', color: '#C74E29' },
    { id: 'c2', name: '음악', sym: '음', color: '#31456A' },
    { id: 'c3', name: '게임', sym: '게', color: '#2F5D50' },
    { id: 'c4', name: '업무·프로젝트', sym: '업', color: '#8A6D3B' },
  ];
  const docs: WikiDoc[] = [
    { id: 'd1', title: '2026년 영화 기록', cat: 'c1', tags: ['영화', '기록'], pinned: true, updated: t - 2 * h, body: ['올해 극장에서 본 영화들을 남기는 기록. 별점은 5점 만점.', '## 7월', '- 듄: 파트 3 — ★★★★★ 아이맥스로 관람. 사막 전투 시퀀스는 올해 최고의 장면.', '- 어느 여름의 기록 — ★★★★ 조용한데 오래 남는다. OST는 [[2026 여름 플레이리스트]]에 추가함.', '## 6월', '- 미키 17 재관람 — ★★★★ 역시 [[봉준호 필모 정리]]는 틀리지 않는다.', '- 인사이드 아웃 3 — ★★★ 무난. 아이들과 보기 좋음.', '다음에 볼 후보는 [[볼 영화 리스트]] 참고.'].join('\n') },
    { id: 'd2', title: '봉준호 필모 정리', cat: 'c1', tags: ['영화', '감독'], pinned: false, updated: t - 5 * day, body: ['> 가장 개인적인 것이 가장 창의적인 것이다.', '장편 연출작 정리. 다시 볼 때마다 체크.', '- 플란다스의 개 (2000) — 데뷔작. 블랙코미디의 원형.', '- 살인의 추억 (2003) — 한국 영화 최고의 시나리오라고 생각.', '- 괴물 (2006) — 한강 CG는 지금 봐도 어색하지 않다.', '- 마더 (2009) — 김혜자의 연기. 라스트 씬의 춤.', '- 설국열차 (2013) — 첫 글로벌 프로젝트.', '- 기생충 (2019) — 칸 황금종려상 + 아카데미 4관왕.', '- 미키 17 (2025) — SF와 블랙코미디의 결합.', '관람 기록은 [[2026년 영화 기록]]에.'].join('\n') },
    { id: 'd3', title: '볼 영화 리스트', cat: 'c1', tags: ['영화', '위시리스트'], pinned: false, updated: t - 9 * day, body: ['극장 개봉 예정과 밀린 영화들.', '- 파묘 2 — 개봉일 확인 필요', '- 노스페라투 — 넷플릭스에 올라옴', '- 헤어질 결심 — 재개봉하면 극장에서', '- 라라랜드 10주년 리마스터 — IMAX 예매 오픈 알림 걸어둠'].join('\n') },
    { id: 'd4', title: 'LP 수집 목록', cat: 'c2', tags: ['음악', '수집'], pinned: true, updated: t - 26 * h, body: ['턴테이블: 오디오테크니카 AT-LP120X. 한 달에 한 장만 사기로 스스로와 약속함.', '## 보유', '- 김광석 — 다시 부르기 2 (재발매반)', '- Radiohead — OK Computer (OKNOTOK 리이슈)', '- 유재하 — 사랑하기 때문에 (2023 리마스터)', '- Bill Evans Trio — Waltz for Debby', '## 사고 싶은 것', '- 산울림 1집 초반 — 상태 좋은 매물이 없다', '- Nujabes — Modal Soul', '요즘 자주 듣는 곡은 [[2026 여름 플레이리스트]]에 정리.'].join('\n') },
    { id: 'd5', title: '2026 여름 플레이리스트', cat: 'c2', tags: ['음악', '플레이리스트'], pinned: false, updated: t - 3 * day, body: ['출퇴근길 + 주말 아침용. 계속 업데이트.', '- 검정치마 — Everything', '- 실리카겔 — Tik Tak Tok', '- Men I Trust — Show Me How', '- 어느 여름의 기록 OST — 여름의 끝', '- HYUKOH — Wanli万里', 'LP로 갖고 싶은 앨범은 [[LP 수집 목록]] 위시리스트에.'].join('\n') },
    { id: 'd6', title: '발더스 게이트 3 플레이 메모', cat: 'c3', tags: ['게임', '공략'], pinned: false, updated: t - 30 * h, body: ['2회차 진행 중. 이번엔 다크 어지 팔라딘.', '## 진행 상황', '- 액트 2 — 달빛 감시탑 클리어', '- 동료 호감도: 셰도우하트 높음, 아스타리온 보통', '## 메모', '- 긴 휴식을 아끼지 말 것. 동료 이벤트가 휴식 중에 뜬다.', '- 상자는 일단 다 들고 다니자. 무게 초과면 캠프 상자로.', '클리어하면 [[하고 싶은 게임]]에서 다음 거 고르기.'].join('\n') },
    { id: 'd7', title: '하고 싶은 게임', cat: 'c3', tags: ['게임', '위시리스트'], pinned: false, updated: t - 12 * day, body: ['백로그가 줄지 않는다.', '- 엘든 링: 밤의 통치자 — 친구랑 코옵으로', '- 젤다의 전설 신작 — 스위치 2 사면', '- 스타듀 밸리 1.7 — 새 농장으로 시작', '- 사일런트 힐 2 리메이크 — 가을에 하는 걸로'].join('\n') },
    { id: 'd8', title: 'Q3 리뉴얼 프로젝트', cat: 'c4', tags: ['업무', '진행중'], pinned: true, updated: t - 40 * 60000, body: ['사내 위키 서비스 개편 프로젝트. 9월 말 오픈 목표.', '## 목표', '- 검색 응답 속도 1초 이내', '- 문서 작성 진입 단계 3 → 1로 축소', '- 모바일 대응', '## 이번 주 할 일', '- 정보구조(IA) 2안 확정', '- 에디터 프로토타입 사용성 테스트 5명', '- 디자인 시스템 컬러 토큰 정리', '지난 회의 내용은 [[회의록 — 7월 14일]] 참고. 신규 입사자 공유용 자료는 [[온보딩 자료 모음]].'].join('\n') },
    { id: 'd9', title: '회의록 — 7월 14일', cat: 'c4', tags: ['업무', '회의록'], pinned: false, updated: t - 2 * day, body: ['참석: 지현, 민수, 소연, 나 / 30분', '## 결정 사항', '- 사이드바 분류는 사용자가 직접 만드는 방식으로 확정', '- 태그는 문서당 최대 5개 권장', '- 검색은 제목, 태그, 본문 순으로 가중치', '## 다음 액션', '- 나: 프로토타입 v2 (금요일까지)', '- 민수: 검색 인덱싱 조사', '- 소연: 온보딩 문서 초안 → [[온보딩 자료 모음]]', '프로젝트 개요는 [[Q3 리뉴얼 프로젝트]].'].join('\n') },
    { id: 'd10', title: '온보딩 자료 모음', cat: 'c4', tags: ['업무', '정리'], pinned: false, updated: t - 6 * day, body: ['새 팀원에게 공유하는 문서 모음. 순서대로 읽으면 됨.', '- 팀 소개 & 일하는 방식', '- 개발 환경 세팅 가이드', '- 디자인 파일 구조 안내', '- 주간 회의 캘린더', '> 첫 주에는 문서보다 사람들과 커피챗을 먼저.', '업데이트가 필요하면 [[Q3 리뉴얼 프로젝트]] 채널에 알려주세요.'].join('\n') },
  ];
  return { docs, cats, recent: ['d8', 'd1', 'd5'], collapsed: [] };
}

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.docs) && Array.isArray(d.cats)) {
        return { docs: d.docs, cats: d.cats, recent: d.recent ?? [], collapsed: d.collapsed ?? [] };
      }
    }
  } catch { /* 손상된 저장분은 시드로 대체 */ }
  return seed();
}

function fmtRel(now: number, ts: number): string {
  const d = now - ts, m = 60000, h = 3600000, day = 86400000;
  if (d < m) return '방금 전';
  if (d < h) return `${Math.floor(d / m)}분 전`;
  if (d < day) return `${Math.floor(d / h)}시간 전`;
  if (d < day * 2) return '어제';
  if (d < day * 7) return `${Math.floor(d / day)}일 전`;
  const dt = new Date(ts);
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일`;
}

/** 문법 기호·링크 괄호를 벗겨낸 미리보기용 평문. */
function strip(body: string): string {
  return body.replace(/\[\[|\]\]/g, '').replace(/^[#>\-\s]+/gm, '').replace(/\n+/g, ' ').trim();
}

/* ── 공용 미니 아이콘 ── */
const StarIcon = ({ size = 12, filled = true, color = '#C9A227' }: { size?: number; filled?: boolean; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="1.5" style={{ flex: 'none' }}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);
const PlusIcon = ({ size = 12, sw = 2.4 }: { size?: number; sw?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
);
const ClockIcon = ({ size = 12, color = '#B3A78E' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" style={{ flex: 'none' }}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
const CatSym = ({ sym, color, size = 19, bg = '#F3EDE2' }: { sym: string; color: string; size?: number; bg?: string }) => (
  <span style={{ width: size, height: size, borderRadius: size * 0.32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.55, fontWeight: 700, flex: 'none', background: `color-mix(in srgb, ${color} 14%, ${bg})`, color }}>{sym}</span>
);

export default function Wiki() {
  const [store, setStore] = useState<Store>(loadStore);
  const [view, setView] = useState<'home' | 'doc' | 'tag' | 'edit'>('home');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const catInputRef = useRef<HTMLInputElement>(null);

  const { docs, cats, recent, collapsed } = store;

  // 스냅샷 저장
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch { /* 저장 공간 부족 시 무시 */ }
  }, [store]);

  // 상대 시각 1분 갱신
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  // '/' → 검색 포커스
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase() ?? '';
      if (e.key === '/' && tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const top = () => { if (mainRef.current) mainRef.current.scrollTop = 0; };

  const openDoc = (id: string) => {
    setStore((s) => ({ ...s, recent: [id, ...s.recent.filter((r) => r !== id)].slice(0, 12) }));
    setView('doc'); setActiveId(id); setEditing(null); setQ(''); setActiveTag('');
    top();
  };
  const goHome = () => { setView('home'); setEditing(null); setQ(''); setActiveTag(''); setActiveId(null); top(); };
  const openTag = (tag: string) => { setView('tag'); setActiveTag(tag); setQ(''); setEditing(null); top(); };
  const startEdit = (doc: WikiDoc) => { setView('edit'); setEditing({ docId: doc.id, title: doc.title, catId: doc.cat, tags: doc.tags.join(', '), body: doc.body }); top(); };
  const startNew = (catId?: string | null, title?: string) => {
    setView('edit'); setQ('');
    setEditing({ docId: null, title: title ?? '', catId: catId ?? cats[0]?.id ?? '', tags: '', body: '' });
    top();
  };
  const saveEdit = () => {
    if (!editing) return;
    const title = editing.title.trim() || '제목 없음';
    const tags = editing.tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean).slice(0, 8);
    if (editing.docId) {
      const id = editing.docId;
      setStore((s) => ({ ...s, docs: s.docs.map((d) => d.id === id ? { ...d, title, cat: editing.catId, tags, body: editing.body, updated: Date.now() } : d) }));
      setView('doc'); setActiveId(id);
    } else {
      const id = `d${Date.now()}`;
      const doc: WikiDoc = { id, title, cat: editing.catId, tags, body: editing.body, pinned: false, updated: Date.now() };
      setStore((s) => ({ ...s, docs: [...s.docs, doc], recent: [id, ...s.recent].slice(0, 12) }));
      setView('doc'); setActiveId(id);
    }
    setEditing(null); setQ('');
    top();
  };
  const cancelEdit = () => {
    if (editing?.docId) { setView('doc'); setActiveId(editing.docId); } else { setView('home'); }
    setEditing(null);
  };
  const deleteDoc = (id: string) => {
    const d = docs.find((x) => x.id === id);
    if (!d) return;
    if (!window.confirm(`"${d.title}" 문서를 삭제할까요?`)) return;
    setStore((s) => ({ ...s, docs: s.docs.filter((x) => x.id !== id), recent: s.recent.filter((r) => r !== id) }));
    setView('home'); setActiveId(null); setEditing(null);
  };
  const togglePin = (id: string) => setStore((s) => ({ ...s, docs: s.docs.map((d) => d.id === id ? { ...d, pinned: !d.pinned } : d) }));
  const toggleCat = (id: string) => setStore((s) => ({ ...s, collapsed: s.collapsed.includes(id) ? s.collapsed.filter((c) => c !== id) : [...s.collapsed, id] }));
  const addCat = () => {
    const name = newCatName.trim();
    setAddingCat(false); setNewCatName('');
    if (!name) return;
    const id = `c${Date.now()}`;
    setStore((s) => ({ ...s, cats: [...s.cats, { id, name, sym: name.charAt(0), color: CAT_PALETTE[s.cats.length % CAT_PALETTE.length] }] }));
  };

  /* ── 파생 값 ── */
  const catById = new Map(cats.map((c) => [c.id, c]));
  const cOf = (id: string): WikiCat => catById.get(id) ?? { id: '', name: '', sym: '·', color: '#A99D86' };
  const qq = q.trim().toLowerCase();
  const active = docs.find((d) => d.id === activeId) ?? null;
  const showEdit = view === 'edit' && !!editing;
  const showSearch = !!qq && !showEdit;
  const showDoc = !showSearch && !showEdit && view === 'doc' && !!active;
  const showTag = !showSearch && !showEdit && view === 'tag';
  const showHome = !(showSearch || showEdit || showDoc || showTag);

  const pinnedDocs = docs.filter((d) => d.pinned);
  const recentDocs = recent.map((id) => docs.find((d) => d.id === id)).filter((d): d is WikiDoc => !!d).slice(0, 5);
  const tagMap = new Map<string, number>();
  for (const d of docs) for (const t of d.tags) tagMap.set(t, (tagMap.get(t) ?? 0) + 1);
  const tagChips = [...tagMap.entries()].sort((a, b) => b[1] - a[1]);

  interface SearchHit { doc: WikiDoc; pre: string; match: string; post: string; score: number }
  const results: SearchHit[] = [];
  if (qq) {
    for (const d of docs) {
      const ti = d.title.toLowerCase().indexOf(qq);
      const bi = d.body.toLowerCase().indexOf(qq);
      const tagHit = d.tags.some((t) => t.toLowerCase().includes(qq));
      if (ti < 0 && bi < 0 && !tagHit) continue;
      let pre = '', match = '', post = '';
      if (bi >= 0) {
        const st = Math.max(0, bi - 30);
        pre = (st > 0 ? '… ' : '') + d.body.slice(st, bi).replace(/\[\[|\]\]|^[#>-]+\s*/g, '').replace(/\n/g, ' ');
        match = d.body.substr(bi, qq.length);
        post = `${d.body.slice(bi + qq.length, bi + qq.length + 70).replace(/\[\[|\]\]/g, '').replace(/\n/g, ' ')} …`;
      } else {
        pre = `${strip(d.body).slice(0, 90)} …`;
      }
      results.push({ doc: d, pre, match, post, score: (ti === 0 ? 3 : ti > 0 ? 2 : 0) + (tagHit ? 1.5 : 0) + (bi >= 0 ? 1 : 0) });
    }
    results.sort((a, b) => b.score - a.score);
  }

  const tagRows = showTag ? docs.filter((d) => d.tags.includes(activeTag)) : [];
  const backlinks = active ? docs.filter((d) => d.id !== active.id && d.body.includes(`[[${active.title}]]`)) : [];

  /* ── 본문 렌더 (## / - / > / [[링크]]) ── */
  const parseInline = (text: string, kb: string): ReactNode[] => {
    const out: ReactNode[] = [];
    const re = /\[\[([^\]]+)\]\]/g;
    let last = 0, i = 0;
    let m = re.exec(text);
    while (m) {
      if (m.index > last) out.push(text.slice(last, m.index));
      const title = m[1];
      const target = docs.find((d) => d.title === title);
      out.push(
        <a
          key={`${kb}l${i++}`}
          href="#"
          className={target ? 'mwk-link' : 'mwk-stub'}
          title={target ? `${title} 문서로 이동` : `새 문서 만들기: ${title}`}
          onClick={(ev) => { ev.preventDefault(); if (target) openDoc(target.id); else startNew(null, title); }}
        >
          {title}
        </a>,
      );
      last = re.lastIndex;
      m = re.exec(text);
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  };

  const renderBody = (doc: WikiDoc): ReactNode[] => {
    const els: ReactNode[] = [];
    let bullets: ReactNode[] = [];
    const flush = () => {
      if (bullets.length) {
        els.push(<ul key={`u${els.length}`} style={{ margin: '0 0 20px', padding: '0 0 0 20px', display: 'flex', flexDirection: 'column', gap: 9 }}>{bullets}</ul>);
        bullets = [];
      }
    };
    doc.body.split('\n').forEach((ln, i) => {
      const s = ln.trim();
      if (!s) { flush(); return; }
      if (s.startsWith('## ')) {
        flush();
        els.push(
          <h2 key={`h${i}`} style={{ fontFamily: TF, fontSize: 22, fontWeight: 700, margin: '34px 0 14px', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 5, height: 19, background: AC, borderRadius: 3, display: 'inline-block', opacity: 0.85 }} />
            {s.slice(3)}
          </h2>,
        );
      } else if (s.startsWith('- ')) {
        bullets.push(<li key={`i${i}`} style={{ lineHeight: 1.75 }}>{parseInline(s.slice(2), `b${i}`)}</li>);
      } else if (s.startsWith('> ')) {
        flush();
        els.push(
          <blockquote key={`q${i}`} style={{ margin: '0 0 20px', padding: '13px 20px', background: '#F4EEE1', borderLeft: `3px solid ${AC}`, fontFamily: TF, fontSize: 16.5, color: '#5C5240', lineHeight: 1.75 }}>
            {parseInline(s.slice(2), `q${i}`)}
          </blockquote>,
        );
      } else {
        flush();
        els.push(<p key={`p${i}`} style={{ margin: '0 0 18px', lineHeight: 1.9 }}>{parseInline(s, `p${i}`)}</p>);
      }
    });
    flush();
    if (!els.length) els.push(<p key="e" style={{ color: '#9A8F7D' }}>아직 내용이 없어요. 편집을 눌러 채워보세요.</p>);
    return els;
  };

  const dt = new Date(now);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const hour = dt.getHours();
  const greeting = hour < 5 ? '깊은 밤이에요.' : hour < 12 ? '좋은 아침이에요.' : hour < 18 ? '좋은 오후예요.' : '좋은 저녁이에요.';

  const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#A2967F', padding: '16px 10px 6px' };
  const mainLabel: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: '#A2967F' };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100dvh', overflow: 'hidden', background: '#FBF8F3', color: '#221D14', fontSize: 15 }}>
      <style>{PAGE_CSS}</style>

      {/* ══════════ 사이드바 ══════════ */}
      <aside className="hidden md:flex" style={{ width: 274, minWidth: 274, height: '100%', flexDirection: 'column', background: '#F3EDE2', borderRight: '1px solid #E5DCC8' }}>
        <div onClick={goHome} style={{ padding: '20px 20px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fff', color: AC, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TF, fontWeight: 700, fontSize: 17, boxShadow: '0 1px 2px rgba(120,50,15,0.10)' }}>위</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div style={{ fontFamily: TF, fontWeight: 700, fontSize: 17.5, letterSpacing: '-0.01em' }}>마이위키</div>
            <div style={{ fontSize: 11, color: '#9A8F7D', letterSpacing: '0.05em' }}>나만의 지식 서고</div>
          </div>
        </div>

        {/* 검색 */}
        <div style={{ padding: '0 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FDFBF6', border: '1px solid #E2D8C4', borderRadius: 10, padding: '8px 11px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A99D86" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색" style={{ border: 'none', background: 'transparent', fontSize: 13.5, width: '100%', color: '#221D14', padding: 0, outline: 'none', fontFamily: 'inherit' }} />
            {q ? (
              <button type="button" onClick={() => setQ('')} style={{ border: 'none', background: 'transparent', color: '#A99D86', cursor: 'pointer', padding: '0 2px', fontSize: 13, lineHeight: 1 }}>✕</button>
            ) : (
              <span style={{ fontSize: 10.5, color: '#B3A78E', border: '1px solid #E2D8C4', borderRadius: 5, padding: '1px 6px', background: '#F7F2E8', flex: 'none' }}>/</span>
            )}
          </div>
        </div>

        {/* 새 문서 */}
        <div style={{ padding: '0 16px 4px' }}>
          <button type="button" className="mwk-btn" onClick={() => startNew(null)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: AC, color: '#FDFBF7', border: 'none', borderRadius: 10, padding: '9px 0', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(120,50,15,0.18)', fontFamily: 'inherit' }}>
            <PlusIcon size={13} sw={2.6} />
            새 문서
          </button>
        </div>

        {/* 내비 */}
        <div className="mwk-scroll" style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div className="mwk-row" onClick={goHome} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 9, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: '#4A4132', background: showHome && !q ? '#E9E1D0' : 'transparent' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
            홈
          </div>

          {pinnedDocs.length > 0 && (
            <>
              <div style={sectionLabel}>고정됨</div>
              {pinnedDocs.map((d) => (
                <div key={d.id} className="mwk-row" onClick={() => openDoc(d.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13.5, color: '#4A4132', background: d.id === activeId && showDoc ? '#E9E1D0' : 'transparent' }}>
                  <StarIcon />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</span>
                </div>
              ))}
            </>
          )}

          <div style={sectionLabel}>분류</div>
          {cats.map((c) => {
            const cd = docs.filter((d) => d.cat === c.id);
            const expanded = !collapsed.includes(c.id);
            return (
              <div key={c.id}>
                <div className="mwk-row" onClick={() => toggleCat(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 8px 7px 10px', borderRadius: 8, cursor: 'pointer' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A99D86" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${expanded ? '0deg' : '-90deg'})`, transition: 'transform 0.18s ease', flex: 'none' }}><path d="M6 9l6 6 6-6" /></svg>
                  <CatSym sym={c.sym} color={c.color} />
                  <span style={{ fontSize: 13.5, fontWeight: 650, color: '#3E3625', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#B3A78E', flex: 'none' }}>{cd.length}</span>
                  <button
                    type="button"
                    className="mwk-catadd"
                    title="이 분류에 새 문서"
                    onClick={(e) => { e.stopPropagation(); startNew(c.id); }}
                    style={{ border: 'none', background: 'transparent', color: '#8A7E68', cursor: 'pointer', padding: 2, borderRadius: 5, display: 'flex', flex: 'none' }}
                  >
                    <PlusIcon />
                  </button>
                </div>
                {expanded && cd.map((d) => (
                  <div key={d.id} className="mwk-row" onClick={() => openDoc(d.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px 6px 31px', borderRadius: 8, cursor: 'pointer', fontSize: 13.5, color: '#55492F', background: d.id === activeId && (showDoc || showEdit) ? '#E9E1D0' : 'transparent', fontWeight: d.id === activeId && (showDoc || showEdit) ? 700 : 450 }}>
                    <span style={{ width: 4, height: 4, borderRadius: 99, background: '#C6BAA0', flex: 'none' }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</span>
                  </div>
                ))}
              </div>
            );
          })}

          {addingCat ? (
            <div style={{ display: 'flex', gap: 6, padding: '4px 6px 4px 10px', alignItems: 'center' }}>
              <input
                ref={catInputRef}
                autoFocus
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCat(); if (e.key === 'Escape') { setAddingCat(false); setNewCatName(''); } }}
                placeholder="분류 이름"
                style={{ flex: 1, minWidth: 0, border: '1px solid #DCD1B8', background: '#FFFEFB', borderRadius: 8, padding: '7px 10px', fontSize: 13, color: '#221D14', outline: 'none', fontFamily: 'inherit' }}
              />
              <button type="button" onClick={addCat} style={{ border: 'none', background: AC, color: '#FDFBF7', borderRadius: 8, padding: '7px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flex: 'none', fontFamily: 'inherit' }}>추가</button>
            </div>
          ) : (
            <button type="button" className="mwk-row" onClick={() => setAddingCat(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: 'none', background: 'transparent', color: '#A99D86', fontSize: 13, cursor: 'pointer', width: '100%', textAlign: 'left', fontWeight: 500, fontFamily: 'inherit' }}>
              <PlusIcon sw={2.2} />
              새 분류 만들기
            </button>
          )}

          {recentDocs.length > 0 && (
            <>
              <div style={{ ...sectionLabel, padding: '18px 10px 6px' }}>최근 본 문서</div>
              {recentDocs.map((d) => (
                <div key={d.id} className="mwk-row" onClick={() => openDoc(d.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5.5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#6E6248' }}>
                  <ClockIcon />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{d.title}</span>
                  <span style={{ fontSize: 11, color: '#B3A78E', flex: 'none' }}>{fmtRel(now, d.updated)}</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #E5DCC8', fontSize: 11.5, color: '#9A8F7D', display: 'flex', justifyContent: 'space-between' }}>
          <span>문서 {docs.length} · 분류 {cats.length}</span>
          <span>{dt.getMonth() + 1}월 {dt.getDate()}일</span>
        </div>
      </aside>

      {/* ══════════ 메인 ══════════ */}
      <main ref={mainRef} className="mwk-scroll mwk-main" style={{ flex: 1, height: '100%', overflowY: 'auto', background: '#FBF8F3' }}>

        {/* ── 홈 ── */}
        {showHome && (
          <div style={{ maxWidth: 940, margin: '0 auto', padding: '56px 60px 90px', animation: 'mwk-fade-up 0.4s ease both' }}>
            <div style={{ fontSize: 12.5, letterSpacing: '0.16em', color: '#A2967F', fontWeight: 600 }}>
              {dt.getFullYear()}년 {dt.getMonth() + 1}월 {dt.getDate()}일 {days[dt.getDay()]}요일
            </div>
            <h1 style={{ fontFamily: TF, fontSize: 44, fontWeight: 700, margin: '12px 0 10px', letterSpacing: '-0.02em' }}>{greeting}</h1>
            <div style={{ fontSize: 15, color: '#8A7E68' }}>
              오늘은 어떤 걸 기록해 볼까요? &nbsp;문서 <b style={{ color: AC, fontWeight: 700 }}>{docs.length}</b>개 · 분류 {cats.length}개 · 태그 {tagMap.size}개
            </div>
            <div style={{ height: 1, background: 'linear-gradient(90deg, #E3D9C4 55%, transparent)', margin: '30px 0 34px' }} />

            {docs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '70px 0', color: '#A2967F' }}>
                <div style={{ fontFamily: TF, fontSize: 22, color: '#6E6248', marginBottom: 8 }}>아직 문서가 없어요</div>
                <div style={{ fontSize: 13.5, marginBottom: 20 }}>왼쪽의 새 문서 버튼으로 첫 기록을 시작해 보세요.</div>
              </div>
            )}

            {pinnedDocs.length > 0 && (
              <div style={{ marginBottom: 44 }}>
                <div style={{ ...mainLabel, marginBottom: 14 }}>
                  <StarIcon />
                  고정된 문서
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))', gap: 14 }}>
                  {pinnedDocs.map((d, i) => {
                    const c = cOf(d.cat);
                    return (
                      <div key={d.id} className="mwk-card" onClick={() => openDoc(d.id)} style={{ background: '#FFFEFB', border: '1px solid #EAE2D2', borderRadius: 14, padding: 18, cursor: 'pointer', animation: 'mwk-fade-up 0.45s ease both', animationDelay: `${i * 70}ms`, display: 'flex', flexDirection: 'column', gap: 9, minHeight: 150 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <CatSym sym={c.sym} color={c.color} bg="#FFFEFB" />
                          <span style={{ fontSize: 11.5, color: '#A2967F', fontWeight: 600 }}>{c.name}</span>
                          <span style={{ marginLeft: 'auto', display: 'flex' }}><StarIcon /></span>
                        </div>
                        <div style={{ fontFamily: TF, fontSize: 18.5, fontWeight: 700, lineHeight: 1.35, letterSpacing: '-0.01em' }}>{d.title}</div>
                        <div style={{ fontSize: 12.5, color: '#8A7E68', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{strip(d.body).slice(0, 86)}</div>
                        <div style={{ fontSize: 11.5, color: '#B3A78E', marginTop: 'auto' }}>{fmtRel(now, d.updated)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 46, alignItems: 'start' }}>
              <div>
                <div style={{ ...mainLabel, marginBottom: 8 }}>
                  <ClockIcon color="#A2967F" />
                  최근 본 문서
                </div>
                {recentDocs.map((d) => {
                  const c = cOf(d.cat);
                  return (
                    <div key={d.id} className="mwk-recent" onClick={() => openDoc(d.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 10px', borderRadius: 10, cursor: 'pointer', borderBottom: '1px solid #F0E9D9' }}>
                      <span style={{ width: 7, height: 7, borderRadius: 99, background: c.color, flex: 'none' }} />
                      <span style={{ fontWeight: 600, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.title}</span>
                      <span style={{ fontSize: 12, color: '#A2967F', flex: 'none' }}>{c.name}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: '#B3A78E', flex: 'none' }}>{fmtRel(now, d.updated)}</span>
                    </div>
                  );
                })}
              </div>
              {tagChips.length > 0 && (
                <div>
                  <div style={{ ...mainLabel, marginBottom: 14 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" /></svg>
                    태그
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {tagChips.map(([t, count]) => (
                      <button key={t} type="button" className="mwk-tagbig" onClick={() => openTag(t)} style={{ border: '1px solid #E5DCC8', background: '#FFFEFB', color: '#6E6248', borderRadius: 99, padding: '6px 12px', fontSize: 12.5, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
                        #{t} <span style={{ color: '#B3A78E', fontWeight: 500 }}>{count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 검색 결과 ── */}
        {showSearch && (
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '52px 56px 90px', animation: 'mwk-fade-up 0.35s ease both' }}>
            <div style={{ fontSize: 12.5, letterSpacing: '0.16em', color: '#A2967F', fontWeight: 600 }}>검색</div>
            <h1 style={{ fontFamily: TF, fontSize: 31, fontWeight: 700, margin: '10px 0 26px', letterSpacing: '-0.01em' }}>
              ‘{q.trim()}’ <span style={{ color: '#A2967F', fontSize: 20, fontWeight: 400 }}>— {results.length}개의 문서</span>
            </h1>
            {results.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.map(({ doc: d, pre, match, post }) => {
                  const c = cOf(d.cat);
                  return (
                    <div key={d.id} className="mwk-res" onClick={() => openDoc(d.id)} style={{ background: '#FFFEFB', border: '1px solid #EAE2D2', borderRadius: 13, padding: '16px 18px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <CatSym sym={c.sym} color={c.color} size={17} bg="#FFFEFB" />
                        <span style={{ fontSize: 12, color: '#A2967F' }}>{c.name}</span>
                      </div>
                      <div style={{ fontFamily: TF, fontSize: 17.5, fontWeight: 700, marginBottom: 5 }}>{d.title}</div>
                      <div style={{ fontSize: 13, color: '#7A6F5C', lineHeight: 1.65 }}>
                        {pre}
                        {match && <span style={{ background: 'rgba(199,78,41,0.22)', borderRadius: 3, padding: '0 2px', fontWeight: 700 }}>{match}</span>}
                        {post}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#A2967F' }}>
                <div style={{ fontSize: 15, marginBottom: 18 }}>일치하는 문서가 없어요</div>
                <button type="button" className="mwk-btn" onClick={() => startNew(null, q.trim())} style={{ border: 'none', background: AC, color: '#FDFBF7', borderRadius: 10, padding: '10px 18px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(120,50,15,0.18)', fontFamily: 'inherit' }}>
                  ‘{q.trim()}’ 제목으로 새 문서 만들기
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 태그 보기 ── */}
        {showTag && (
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '52px 56px 90px', animation: 'mwk-fade-up 0.35s ease both' }}>
            <div style={{ fontSize: 12.5, letterSpacing: '0.16em', color: '#A2967F', fontWeight: 600 }}>태그</div>
            <h1 style={{ fontFamily: TF, fontSize: 31, fontWeight: 700, margin: '10px 0 26px', letterSpacing: '-0.01em' }}>
              <span style={{ color: AC }}>#</span>{activeTag} <span style={{ color: '#A2967F', fontSize: 20, fontWeight: 400 }}>— {tagRows.length}개의 문서</span>
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tagRows.map((d) => {
                const c = cOf(d.cat);
                return (
                  <div key={d.id} className="mwk-res" onClick={() => openDoc(d.id)} style={{ background: '#FFFEFB', border: '1px solid #EAE2D2', borderRadius: 13, padding: '16px 18px', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <CatSym sym={c.sym} color={c.color} size={17} bg="#FFFEFB" />
                      <span style={{ fontSize: 12, color: '#A2967F' }}>{c.name}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: '#B3A78E' }}>{fmtRel(now, d.updated)}</span>
                    </div>
                    <div style={{ fontFamily: TF, fontSize: 17.5, fontWeight: 700, marginBottom: 5 }}>{d.title}</div>
                    <div style={{ fontSize: 13, color: '#7A6F5C', lineHeight: 1.65 }}>{strip(d.body).slice(0, 90)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 문서 보기 ── */}
        {showDoc && active && (
          <div style={{ maxWidth: 780, margin: '0 auto', padding: '42px 56px 100px', animation: 'mwk-fade-up 0.35s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 30 }}>
              <CatSym sym={cOf(active.cat).sym} color={cOf(active.cat).color} bg="#FBF8F3" />
              <span style={{ fontSize: 13, color: '#8A7E68', fontWeight: 600 }}>{cOf(active.cat).name}</span>
              <div style={{ flex: 1 }} />
              <button type="button" className="mwk-obtn" onClick={() => togglePin(active.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #E2D8C4', background: '#FFFEFB', borderRadius: 9, padding: '7px 12px', fontSize: 12.5, cursor: 'pointer', color: active.pinned ? AC : '#8A7E68', fontWeight: 700, fontFamily: 'inherit' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill={active.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                {active.pinned ? '고정됨' : '고정'}
              </button>
              <button type="button" className="mwk-obtn" onClick={() => startEdit(active)} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #E2D8C4', background: '#FFFEFB', borderRadius: 9, padding: '7px 12px', fontSize: 12.5, cursor: 'pointer', color: '#4A4132', fontWeight: 700, fontFamily: 'inherit' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                편집
              </button>
              <button type="button" className="mwk-obtn mwk-del" title="문서 삭제" onClick={() => deleteDoc(active.id)} style={{ display: 'flex', alignItems: 'center', border: '1px solid #E2D8C4', background: '#FFFEFB', borderRadius: 9, padding: '7px 9px', cursor: 'pointer', color: '#A99D86' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
              </button>
            </div>

            <h1 style={{ fontFamily: TF, fontSize: 40, lineHeight: 1.28, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 14px' }}>{active.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, color: '#A2967F' }}>마지막 수정 {fmtRel(now, active.updated)}</span>
              {active.tags.map((t) => (
                <button key={t} type="button" className="mwk-tagchip" onClick={() => openTag(t)} style={{ border: 'none', background: '#F0E9DA', color: '#7A6C51', borderRadius: 99, padding: '3.5px 11px', fontSize: 12, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>#{t}</button>
              ))}
            </div>
            <div style={{ height: 1, background: 'linear-gradient(90deg, #E3D9C4 55%, transparent)', margin: '24px 0 32px' }} />
            <div style={{ fontSize: 16, color: '#3A3222' }}>{renderBody(active)}</div>

            {backlinks.length > 0 && (
              <div style={{ marginTop: 56, background: '#F5EFE2', border: '1px solid #EAE0CB', borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em', color: '#A2967F', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
                  이 문서를 언급한 문서
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {backlinks.map((b) => (
                    <div key={b.id} className="mwk-bl" onClick={() => openDoc(b.id)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 8, cursor: 'pointer' }}>
                      <span style={{ width: 6, height: 6, borderRadius: 99, background: cOf(b.cat).color, flex: 'none' }} />
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{b.title}</span>
                      <span style={{ fontSize: 12, color: '#A2967F' }}>{cOf(b.cat).name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 문서 편집 ── */}
        {showEdit && editing && (
          <div style={{ maxWidth: 780, margin: '0 auto', padding: '42px 56px 100px', animation: 'mwk-fade-up 0.3s ease both' }}>
            <div style={{ fontSize: 12.5, letterSpacing: '0.16em', color: '#A2967F', fontWeight: 700, marginBottom: 16 }}>{editing.docId ? '문서 편집' : '새 문서'}</div>
            <input
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              placeholder="문서 제목"
              style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: TF, fontSize: 35, fontWeight: 700, letterSpacing: '-0.02em', color: '#221D14', padding: 0, marginBottom: 20, outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <select value={editing.catId} onChange={(e) => setEditing({ ...editing, catId: e.target.value })} style={{ border: '1px solid #E2D8C4', background: '#FFFEFB', borderRadius: 9, padding: '9px 12px', fontSize: 13, color: '#4A4132', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', outline: 'none' }}>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input
                value={editing.tags}
                onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
                placeholder="태그 (쉼표로 구분)"
                style={{ flex: 1, minWidth: 200, border: '1px solid #E2D8C4', background: '#FFFEFB', borderRadius: 9, padding: '9px 14px', fontSize: 13, color: '#4A4132', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            <textarea
              className="mwk-ta"
              value={editing.body}
              onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              placeholder="내용을 적어보세요…"
              style={{ width: '100%', minHeight: 380, border: '1px solid #E2D8C4', background: '#FFFEFB', borderRadius: 14, padding: '20px 22px', fontSize: 15, lineHeight: 1.85, color: '#3A3222', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
            />
            <div style={{ fontSize: 12, color: '#A99D86', margin: '10px 2px 24px' }}>## 소제목 &nbsp;·&nbsp; - 목록 &nbsp;·&nbsp; &gt; 인용 &nbsp;·&nbsp; [[문서 제목]] 문서 링크</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button type="button" className="mwk-btn" onClick={saveEdit} style={{ border: 'none', background: AC, color: '#FDFBF7', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(120,50,15,0.18)', fontFamily: 'inherit' }}>저장</button>
              <button type="button" className="mwk-ghost" onClick={cancelEdit} style={{ border: '1px solid #E2D8C4', background: 'transparent', color: '#6E6248', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
              <div style={{ flex: 1 }} />
              {editing.docId && (
                <button type="button" className="mwk-deldraft" onClick={() => deleteDoc(editing.docId!)} style={{ border: 'none', background: 'transparent', color: '#B4372C', fontSize: 13, cursor: 'pointer', fontWeight: 700, padding: '9px 12px', borderRadius: 8, fontFamily: 'inherit' }}>문서 삭제</button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
