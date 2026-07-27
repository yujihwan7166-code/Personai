/**
 * 마이위키 (/wiki) — v4 "서재와 책들", 사용자 시안 「마이위키 서재.dc.html」 그대로 이식.
 *
 * 시안 문법: 크림 종이(#f4eee1) 위 월넛 나무 책장, Noto Serif KR 제목, 그린 링크(#305f4c),
 * 러스트 강조(#9a4632). 사이드바 없는 스티키 헤더 레이아웃, Esc 로 문서→책→서재 후진.
 * 화면 3장: 서재 홈(책장+고정+언급 순위+최근) / 책 펼침(표지+차례 스프레드) / 문서 읽기(목차|본문|인포박스 3열).
 * 기능은 전부 실물: Plate 편집·읽기, 드래그 링크, 인포박스 편집, 백링크 문맥 발췌, mywiki.v4.
 */
import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, PanelRight, Pencil, Plus, Search, Star, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { newId } from '@/lib/idGenerator';
import type { Value } from 'platejs';
import {
  loadWiki, saveWiki, seedIfEmpty, emptyBody, linkedDocIds, bodyText, backlinkExcerpt, BOOK_PALETTE,
  resetToStarter,
  type WikiBook, type WikiDoc, type WikiStore,
} from '@/lib/wiki3/store';
import { childrenOf, ancestorsOf, deleteWithPromotion, isDescendant } from '@/lib/wiki3/tree';
import { BUILTIN_TEMPLATES, loadTemplates, saveTemplates, type WikiTemplate } from '@/lib/wiki3/templates';
import type { WikiEditorApi } from '@/components/wiki3/WikiDocEditor';
import { WikiInfoboxCard } from '@/components/wiki3/WikiInfobox';
import { notify } from '@/lib/notify';

const WikiDocEditor = lazy(() => import('@/components/wiki3/WikiDocEditor').then((m) => ({ default: m.WikiDocEditor })));
const WikiDocReader = lazy(() => import('@/components/wiki3/WikiDocReader').then((m) => ({ default: m.WikiDocReader })));

/* 시안 팔레트 — 그대로 */
/* 보조색은 시안보다 어둡게 — 원래 값(#7d7260/#a0937d)은 크림 배경에서 4.1:1 / 2.6:1 로
   본문 대비 기준(4.5:1)에 못 미쳐 글이 흐려 보였다. 아래는 5.7:1 / 4.6:1. */
const C = {
  bg: '#f4eee1', paper: '#fdfaf2', ink: '#292217', body: '#332c21',
  sub: '#665c4b', muted: '#756a57',
  line: 'rgba(60,47,24,.14)', line2: 'rgba(60,47,24,.09)', lineDeep: 'rgba(60,47,24,.22)',
  green: '#305f4c', rust: '#9a4632', cream: '#f6ecd9',
};
/* 세리프는 이제 '물건'에만 — 책등·표지·명패. 화면 글자는 데일리 로그와 같은 Pretendard */
const SERIF = "'Nanum Myeongjo', 'Noto Serif KR', 'Gowun Batang', serif";
const SANS = "'Pretendard Variable', 'Pretendard', 'Noto Sans KR', sans-serif";

const WIKI_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@700;800&display=swap');
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
/* 문서 사이에 놓을 때 — 가로선의 들여쓰기가 곧 들어갈 단계 */
.wiki-theme .wiki-insert { position:relative; height:2px; margin-right:6px; border-radius:2px; background:#305f4c; transform-origin:left center; animation: wikiInsertIn .14s ease-out both; }
.wiki-theme .wiki-insert::before { content:''; position:absolute; left:-3px; top:-3px; width:8px; height:8px; border-radius:50%; background:#305f4c; }
/* 책갈피 — 읽는 화면에서 종이 위쪽에 끼우는 리본.
   전엔 편집 도구줄의 별이었는데, 책갈피는 읽다가 꽂는 물건이지 고쳐 쓰는 물건이 아니다.
   위로 9px 삐져나오게 두고 그 부분만 어둡게 해서 종이 뒤에서 넘어온 것처럼 보이게 한다. */
.wiki-theme .wiki-mark {
  position:absolute; top:-9px; left:10px; width:18px; height:32px; z-index:2;
  border:0; padding:0; cursor:pointer; opacity:0;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 74%, 0 100%);
  background: rgba(60,47,24,.13);
  transition: height .24s cubic-bezier(.2,.85,.3,1), background .18s, opacity .18s;
}
@media (min-width:640px) { .wiki-theme .wiki-mark { left:20px; width:21px; } }
.wiki-theme .wiki-page:hover .wiki-mark { opacity:.6; }
.wiki-theme .wiki-mark:hover { opacity:1; height:42px; background: rgba(214,150,40,.5); }
.wiki-theme .wiki-mark:focus-visible { opacity:1; outline:none; background:#305f4c; }
.wiki-theme .wiki-mark-on,
.wiki-theme .wiki-page:hover .wiki-mark-on,
.wiki-theme .wiki-mark-on:hover {
  opacity:1; height:60px;
  background: linear-gradient(180deg,#e2ab3d 0%,#d5952a 46%,#bd7d16 100%);
  box-shadow: 1px 2px 6px rgba(64,44,18,.24);
}
.wiki-theme .wiki-mark-on:hover { background: linear-gradient(180deg,#eab74b 0%,#dc9d31 46%,#c9881f 100%); }
/* 종이 위로 넘어온 부분 — 그림자에 잠긴 듯이 */
.wiki-theme .wiki-mark-on::before { content:''; position:absolute; inset:0 0 auto 0; height:9px; background:rgba(0,0,0,.17); }
.wiki-theme .wiki-mark-drop { animation: wikiMarkDrop .3s cubic-bezier(.2,.9,.3,1); }
@keyframes wikiMarkDrop { from { transform: translateY(-13px); } 60% { transform: translateY(2px); } to { transform:none; } }
@media (prefers-reduced-motion: reduce) { .wiki-theme .wiki-mark, .wiki-theme .wiki-mark-drop { transition:none; animation:none; } }
/* 선반 넘김 노브 — 가구 옆판에 박힌 황동 손잡이. 끝 선반에선 아예 사라진다
   (흐릿하게 남겨두면 '눌러도 안 되는 단추' 가 되어 매번 확인하게 된다). */
.wiki-theme .wiki-shelf-knob {
  border: 1px solid #6d5222;
  background: linear-gradient(180deg,#d5ae54,#8a6a30);
  color: #3a2c10;
  font-size: 17px; line-height: 1;
  box-shadow: 0 3px 7px rgba(10,5,0,.45), inset 0 1px 0 rgba(255,242,205,.6);
  cursor: pointer;
}
.wiki-theme .wiki-shelf-knob:hover { background: linear-gradient(180deg,#e2bd63,#98763a); }
.wiki-theme .wiki-shelf-knob:active { transform: translateY(-50%) scale(.93); }
/* 사이드바 스크롤막대 감추기 — 잘린 곳은 가장자리 페이드로 말한다.
   막대는 크림 종이 위 회색 금속 조각이라 이 방 물건이 아니었다. */
.wiki-theme .wiki-noscroll { scrollbar-width: none; -ms-overflow-style: none; }
.wiki-theme .wiki-noscroll::-webkit-scrollbar { width: 0; height: 0; }
@keyframes wikiInsertIn { from { opacity:0; transform: scaleX(.94); } to { opacity:1; transform:none; } }
.wiki-theme .wiki-root-drop { animation: wikiRootIn .18s ease-out both; }
@keyframes wikiRootIn { from { opacity:0; transform: translateY(-5px); } to { opacity:1; transform:none; } }
/* 목차 항목 — 레일 위에 얹힌 한 칸. 호버 시 그 구간만 러스트로 물든다. */
.wiki-theme .wiki-toc-item {
  border-left: 2px solid transparent;
  border-radius: 0 6px 6px 0;
  transition: color .15s ease, border-color .15s ease, background-color .15s ease;
}
.wiki-theme .wiki-toc-item:hover {
  background: rgba(60,47,24,.05);
  border-left-color: #9a4632;
  color: #292217;
}

.wiki-theme .wiki-row-moved { animation: wikiMoved .9s ease-out; }
@keyframes wikiMoved { from { background: rgba(48,95,76,.24); } to { background: transparent; } }

/* 돌아가기 칩 — 링크를 타고 건너온 순간에만 왼쪽에서 밀려들어온다.
   가만히 놓여 있으면 빵가루의 일부로 읽혀 그냥 지나치기 때문에, 등장 자체가 안내가 된다.
   뒤이어 한 번 더 흔들어(nudge) 눈길을 준다. */
.wiki-theme .wiki-back { animation: wikiBackIn .4s cubic-bezier(.22,1,.36,1) both, wikiBackNudge 1.1s ease-in-out .5s 1; }
@keyframes wikiBackIn {
  from { opacity:0; transform: translateX(-14px); }
  to   { opacity:1; transform: none; }
}
@keyframes wikiBackNudge {
  0%, 100% { transform: none; }
  38%      { transform: translateX(-4px); }
  62%      { transform: translateX(-1px); }
}
.wiki-theme .wiki-back .wiki-back-arrow { transition: transform .18s cubic-bezier(.2,.7,.2,1); }
.wiki-theme .wiki-back:hover .wiki-back-arrow { transform: translateX(-3px); }

@media (prefers-reduced-motion: reduce) {
  .wiki-theme .wiki-back { animation:none; }
  .wiki-theme .wiki-back .wiki-back-arrow, .wiki-theme .wiki-back:hover .wiki-back-arrow { transition:none; transform:none; }
  .wiki-theme .wiki-spine, .wiki-theme .wiki-spine:hover { transition:none; transform:none !important; }
  .wiki-theme .wiki-rise, .wiki-theme .wiki-page { animation:none; }
  .wiki-theme .wiki-pendulum { animation:none; }
  .wiki-theme .wiki-row { transition:none; }
  .wiki-theme .wiki-row-drop { transform:none; }
  .wiki-theme .wiki-slot { height:22px; opacity:1; animation:none; }
  .wiki-theme .wiki-insert { animation:none; }
  .wiki-theme .wiki-root-drop, .wiki-theme .wiki-row-moved { animation:none; }
}
/* 읽기 뷰 본문 — 시안의 위키 타이포 */
.wiki-theme .wiki-read h1, .wiki-theme .wiki-read h2, .wiki-theme .wiki-read h3 {
  scroll-margin-top: 18px; letter-spacing:-0.012em;
  font-family:'Pretendard Variable','Pretendard','Noto Sans KR',sans-serif;
}
.wiki-theme .wiki-read h1, .wiki-theme .wiki-read h2 {
  font-weight:700; border-bottom:1px solid rgba(60,47,24,.14); padding-bottom:8px;
}
.wiki-theme .wiki-read h3 { font-weight:700; }
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

/** 표지 소개 — 내용만큼 저절로 자란다(스크롤 없음). */
function CoverIntro({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const t = ref.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = `${t.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref} value={value} onChange={(e) => onChange(e.target.value)} rows={1}
      placeholder="이 책은 어떤 책인가요? 눌러서 적어보세요"
      className="mt-2 w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-[rgba(244,230,200,.5)]"
      style={{ fontSize: 12.5, lineHeight: 1.6, color: 'rgba(244,230,200,.9)' }}
    />
  );
}

/** 책 칩 — 색 점 + 책 이름 (시안 공용 부호). */
/**
 * 놓을 자리 표시 — 선 + 그 자리에 놓았을 때의 번호.
 * 선만 있으면 들여쓰기를 눈으로 세어야 했다. 번호가 뜨면 '2.1 → 2' 가 바로 읽힌다.
 *
 * 흐름 안에 놓으면 안 된다. 예전엔 그냥 줄 위에 끼워 넣었는데, 표시가 뜨는 순간
 * 아래 줄이 17px 밀려 내려가고 그 자리를 이 표시가 차지했다. 커서 밑이 줄에서
 * 표시로 바뀌니 dragover 가 줄에 안 닿아 preventDefault 가 안 걸리고, 곧바로
 * 금지 커서(🚫)가 떴다 — '빼기가 안 된다' 의 정체가 이것이었다.
 * 자리를 안 먹는 절대 배치 + pointer-events:none 으로 커서 아래를 늘 줄로 둔다.
 */
function InsertLine({ depth, no }: { depth: number; no: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center"
      style={{ paddingLeft: 6 + depth * 22, paddingRight: 6, transform: 'translateY(-50%)' }}>
      <span style={{
        flex: 'none', marginRight: 6, borderRadius: 4, padding: '1px 5px',
        background: '#305f4c', color: '#f6ecd9',
        fontSize: 10.5, fontWeight: 800, lineHeight: 1.5, fontVariantNumeric: 'tabular-nums',
      }}>
        {no}
      </span>
      <span className="wiki-insert" style={{ flex: 1 }} />
    </div>
  );
}

function BookChip({ book }: { book?: WikiBook }) {
  if (!book) return null;
  return (
    <span className="inline-flex flex-none items-center gap-[5px] rounded-full border px-2 py-[2px]" style={{ borderColor: C.line, background: 'rgba(60,47,24,.03)' }}>
      <span className="h-[7px] w-[7px] rounded-full" style={{ background: book.tint }} />
      <span className="text-[11.5px]" style={{ color: C.sub }}>{book.title}</span>
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
  /* 본문 링크를 타고 건너온 발자국(문서 id) — 되짚어 돌아가기용. 서재·책으로 나가면 비운다. */
  const [trail, setTrail] = useState<string[]>([]);
  const [bookDialog, setBookDialog] = useState<{ book: WikiBook | null } | null>(null);
  /* 차례에서 끌어 옮기기 — 끄는 문서 / 지금 겨눈 자리 / 방금 옮겨진 문서(잔상) */
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set()); // 차례에서 접은 장들
  const [showNo, setShowNo] = useState(() => localStorage.getItem('mywiki.tocNumbers') !== '0'); // 차례 번호 표시
  const toggleNumbers = () => setShowNo((v) => { const n = !v; localStorage.setItem('mywiki.tocNumbers', n ? '1' : '0'); return n; });
  const [dragDoc, setDragDoc] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{ mode: 'nest'; id: string } | { mode: 'place'; index: number; depth: number } | null>(null);
  const [justMoved, setJustMoved] = useState<string | null>(null);
  const editorApi = useRef<WikiEditorApi | null>(null);
  const readBodyRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const saveTimer = useRef<number | null>(null);
  /* 차례 줄들의 DOM — 옮긴 뒤 제자리를 찾아가는 재배치(FLIP)에 쓴다 */
  const rowEls = useRef(new Map<string, HTMLElement>());
  const flipFrom = useRef<Map<string, DOMRect> | null>(null);
  /* 서가 폭 — 한 줄에 책이 몇 권 들어가는지 계산하려면 실측이 필요하다 */
  const shelfRef = useRef<HTMLDivElement>(null);
  const [shelfW, setShelfW] = useState(0);
  /* 서가 페이지 — 한 선반에 못 담는 책은 다음 장으로 넘긴다 */
  const [shelfPage, setShelfPage] = useState(0);

  const isWide = useIsWide();
  const { books: allBooks, docs, recent } = store;
  /* 책장에 꽂힌 순서 — 책이 열 권을 넘어가면 페이지가 갈리기 시작해서
     '어디 뒀더라' 가 생긴다. 서재 머리 오른쪽이 비어 있길래 여기 세웠다. */
  const [shelfSort, setShelfSort] = useState<'made' | 'name' | 'size'>('made');
  const book = bookId ? allBooks.find((b) => b.id === bookId) ?? null : null;
  const bookDocs = useMemo(() => (bookId ? docs.filter((d) => d.book === bookId) : []), [docs, bookId]);
  const active = docId ? docs.find((d) => d.id === docId) ?? null : null;
  const bookOf = useMemo(() => new Map(allBooks.map((b) => [b.id, b])), [allBooks]);

  /* 저장이 실패하면(브라우저 저장 칸이 꽉 참) 한 번만 알린다.
     인포박스 사진이 들어오면서 실제로 넘칠 수 있게 됐는데, 조용히 실패하면
     계속 쓰다가 방을 나가는 순간 그동안 쓴 게 통째로 사라진다. */
  const quotaWarned = useRef(false);
  useEffect(() => {
    const ok = saveWiki(store);
    if (ok) { quotaWarned.current = false; return; }
    if (quotaWarned.current) return;
    quotaWarned.current = true;
    notify.error('저장 공간이 꽉 찼어요', { description: '인포박스 사진을 줄이거나 안 쓰는 책을 지워 주세요 — 지금 고친 내용은 아직 저장되지 않았습니다.' });
  }, [store]);

  /* Esc — 문서 → 책 → 서재 (시안 문법). 입력·에디터·다이얼로그 안에서는 무시 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const t = e.target as HTMLElement | null;
      if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.isContentEditable) return;
      if (picker || bookDialog) return;
      // 링크를 타고 왔다면 나가기 전에 왔던 길부터 되짚는다.
      // trail.length 가 아니라 backDoc 으로 판단해야 '전부 지워진 발자국'이 Esc 를 삼키지 않는다.
      if (docId && backDoc) { goBack(); return; }
      if (docId) { setDocId(null); setMode('read'); mainRef.current?.scrollTo(0, 0); }
      else if (bookId) { setBookId(null); mainRef.current?.scrollTo(0, 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, bookId, picker, bookDialog, trail]);

  const top = () => mainRef.current?.scrollTo(0, 0);

  /* ── 이동 ──
   * 빵가루는 '차례에서의 자리'를 보여준다. 그런데 본문 링크는 그 나무를 가로질러 뛰기 때문에,
   * 링크를 타고 들어가면 빵가루 어디에도 왔던 길이 남지 않는다(= 돌아갈 방법이 없다).
   * 그래서 문서→문서로 건너뛴 발자국을 따로 쌓아두고 되짚어 준다. */
  const goShelf = () => { setBookId(null); setDocId(null); setQ(''); setTrail([]); top(); };
  const openBook = (id: string) => { setBookId(id); setDocId(null); setQ(''); setTrail([]); top(); };
  const openDoc = (id: string, opts: { edit?: boolean } = {}) => {
    const d = docs.find((x) => x.id === id);
    if (!d) return;
    if (docId && docId !== id) setTrail((t) => [...t.slice(-9), docId]); // 같은 문서 재진입은 안 쌓는다
    setBookId(d.book); setDocId(id); setMode(opts.edit ? 'edit' : 'read');
    setStore((s) => ({ ...s, recent: [id, ...s.recent.filter((r) => r !== id)].slice(0, 10) }));
    setQ(''); top();
  };
  /** 발자국 한 칸 되짚기 — 왔던 문서로.
   *  사이에 지워진 문서가 끼어 있을 수 있으니 살아 있는 칸이 나올 때까지 건너뛴다
   *  (안 그러면 Esc 를 눌렀는데 아무 일도 안 일어난 것처럼 보인다). */
  const goBack = () => {
    const rest = [...trail];
    while (rest.length) {
      const prev = rest.pop()!;
      const d = docs.find((x) => x.id === prev);
      if (!d) continue;
      setTrail(rest);
      setBookId(d.book); setDocId(prev); setMode('read'); setQ(''); top();
      return;
    }
    setTrail([]);
  };
  /** 되돌아갈 문서 — 지워진 칸은 건너뛴 마지막 생존 발자국. */
  const backDoc = (() => {
    for (let i = trail.length - 1; i >= 0; i -= 1) {
      const d = docs.find((x) => x.id === trail[i]);
      if (d) return d;
    }
    return undefined;
  })();

  /** 빵가루 한 칸 — 컴포넌트가 아니라 함수(렌더마다 새 타입이 되면 불필요한 remount). */
  const crumbBtn = (key: string, label: string, onClick: () => void) => (
    <button
      key={key} type="button" onClick={onClick} title={label}
      className="max-w-[150px] shrink-0 truncate rounded-md px-1.5 py-[3px] transition-colors"
      style={{ color: C.green }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(48,95,76,.09)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {label}
    </button>
  );

  /**
   * 처음 상태로 되돌리기 — 시드는 빈 서재에만 1회 깔리므로 이미 쓰던 사람은 이 길로만
   * 새 다섯 권을 볼 수 있다. 지금 것을 전부 버리는 일이라 무엇이 사라지는지 세어 묻는다.
   */
  const resetLibrary = () => {
    const msg = allBooks.length || docs.length
      ? `지금 서재를 버리고 처음 상태로 되돌릴까요?\n\n책 ${allBooks.length}권 · 문서 ${docs.length}개가 모두 사라집니다.\n되돌릴 수 없어요.`
      : '처음 상태의 다섯 권을 꽂을까요?';
    if (!window.confirm(msg)) return;
    const fresh = resetToStarter();
    setStore(fresh);
    setShelfPage(0);
    setShelfSort('made');
    goShelf();
    notify.success('처음 상태로 되돌렸어요');
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
  /* 템플릿 넣기 — 빈 문서면 그대로, 이미 쓴 게 있으면 아래에 이어 붙인다.
     편집기는 key 를 바꿔 다시 태워야 새 본문을 물고, 대기 중이던 자동저장은 취소한다. */
  const [tplStamp, setTplStamp] = useState(0);
  const applyTemplate = (tplBody: Value) => {
    if (!active) return;
    if (saveTimer.current) { window.clearTimeout(saveTimer.current); saveTimer.current = null; }
    const empty = bodyText(active.body).trim() === '';
    patchDoc(active.id, { body: empty ? tplBody : ([...active.body, ...tplBody] as Value) });
    setTplStamp((n) => n + 1);
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

  /* 사이드바 차례 — 책 전체 위계를 그대로. 포커스 3단만 보이면 다른 가지로 건너뛸 수가 없다 */
  const sideRows = useMemo(() => {
    if (!bookId) return [] as { d: WikiDoc; depth: number }[];
    const rows: { d: WikiDoc; depth: number }[] = [];
    const seen = new Set<string>();
    const walk = (parent: string | null, depth: number) => {
      for (const d of childrenOf(bookDocs, parent)) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        rows.push({ d, depth });
        walk(d.id, depth + 1);
      }
    };
    walk(null, 0);
    return rows;
  }, [bookId, bookDocs]);
  /* 차례 번호 — 1 / 1.1 / 1.1.1. 깊이를 흐린 선 대신 번호가 직접 말한다 */
  const numberedRows = useMemo(() => {
    const counters: number[] = [];
    return sideRows.map(({ d, depth }) => {
      counters.length = depth + 1;
      counters[depth] = (counters[depth] ?? 0) + 1;
      return { d, depth, no: counters.join('.') };
    });
  }, [sideRows]);

  /* 각 문서가 거느린 자손 수 — 차례에서 접힌 장이 몇 개를 품고 있는지 보여준다.
     sideRows 는 전위 순회라 자기보다 깊은 줄이 이어지는 동안이 곧 자기 subtree. */
  const descCount = useMemo(() => {
    const m = new Map<string, number>();
    for (let i = 0; i < sideRows.length; i++) {
      let j = i + 1;
      let c = 0;
      while (j < sideRows.length && sideRows[j].depth > sideRows[i].depth) { c++; j++; }
      m.set(sideRows[i].d.id, c);
    }
    return m;
  }, [sideRows]);

  /* 차례에 실제로 보이는 줄 — 접힌 장의 자손은 감춘다.
     idx 는 sideRows 에서의 원래 자리(끌어 옮기기 계산이 이 번호를 쓴다). */
  const tocRows = useMemo(() => {
    const out: { d: WikiDoc; depth: number; no: string; idx: number }[] = [];
    let hideBelow = Infinity;
    numberedRows.forEach((r, idx) => {
      if (r.depth > hideBelow) return;
      hideBelow = Infinity;
      out.push({ ...r, idx });
      if (collapsed.has(r.d.id) && (descCount.get(r.d.id) ?? 0) > 0) hideBelow = r.depth;
    });
    return out;
  }, [numberedRows, collapsed, descCount]);

  const chapters = useMemo(() => sideRows.filter((r) => r.depth === 0 && (descCount.get(r.d.id) ?? 0) > 0), [sideRows, descCount]);
  const allCollapsed = chapters.length > 0 && chapters.every((c) => collapsed.has(c.d.id));
  const toggleAll = () => setCollapsed(allCollapsed ? new Set() : new Set(chapters.map((c) => c.d.id)));

  /* 열린 문서의 조상 — 사이드바에서 지금 위치까지의 길을 굵게 */
  const sidePath = useMemo(
    () => new Set(docId ? ancestorsOf(bookDocs, docId).map((d) => d.id) : []),
    [bookDocs, docId],
  );

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

  /* 책등 치수 — 안에 쌓인 문서 수를 따라 두껍고 높아진다(서가를 보면 어디에 많이 썼는지 보인다).
     예전 치수(최대 100×368)보다 한 단계 줄여 서가가 덜 부대끼게 했다.
     글자 크기는 제목 길이에 맞춰 자동 축소. */
  const SPINE_H_MAX = 320;
  const spineOf = (b: WikiBook) => {
    const n = docs.filter((d) => d.book === b.id).length;
    const h = Math.min(SPINE_H_MAX, 232 + n * 6);
    const title = b.title || '무제';
    const fs = Math.max(13, Math.min(20, Math.floor((h - 128) / Math.max(title.length, 1))));
    return { n, w: Math.min(88, Math.round(58 + n * 3)), h, fs, title };
  };

  /* 선반은 한 칸뿐 — 넘치는 책은 아랫줄로 흘리지 않고 다음 페이지로 넘긴다.
     책마다 두께가 다르니 권수가 아니라 '실제 폭'을 쌓아 가며 장을 가른다. */
  const SHELF_GAP = 9;
  const NEW_SLOT = 72;
  const LEAN_SLACK = 44; // 마지막 책이 기울면 발자국이 그만큼 넓어진다
  const books = useMemo(() => {
    if (shelfSort === 'made') return allBooks;                    // 꽂은 순 = 만든 순
    const arr = [...allBooks];
    if (shelfSort === 'name') return arr.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko'));
    const n = (id: string) => docs.filter((d) => d.book === id).length;
    return arr.sort((a, b) => n(b.id) - n(a.id));
  }, [allBooks, docs, shelfSort]);

  const pages = useMemo(() => {
    const avail = shelfW - 28; // px-3.5 양쪽
    if (avail <= 0) return [books]; // 실측 전 — 일단 다 그린다
    const usable = avail - LEAN_SLACK - (NEW_SLOT + SHELF_GAP); // '새 책' 자리는 늘 비워둔다
    const out: WikiBook[][] = [];
    let cur: WikiBook[] = [];
    let used = 0;
    for (const b of books) {
      const w = spineOf(b).w + SHELF_GAP;
      if (cur.length > 0 && used + w > usable) { out.push(cur); cur = []; used = 0; }
      cur.push(b); used += w;
    }
    out.push(cur);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books, docs, shelfW]);
  const pageCount = Math.max(1, pages.length);
  const page = Math.min(shelfPage, pageCount - 1); // 책이 줄어 페이지가 사라져도 안전하게
  const pageBooks = pages[page] ?? [];
  /* 이 페이지에서 '새 책' 자리·기울기를 빼고 남는 폭 — 정물(지구본·시계)을 놓을지 판단한다 */
  const shelfUsed = pageBooks.reduce((a, b) => a + spineOf(b).w + SHELF_GAP, 0);
  const shelfFree = shelfW - 28 - shelfUsed - NEW_SLOT - SHELF_GAP - LEAN_SLACK;

  const today = new Date();
  const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
  /* 부제 — 책·문서·연결 수는 좌측 하단 통계 상자에 그대로 있다. 여기까지 숫자를 늘어놓으면
     같은 말을 두 번 하는 셈이라, 대신 '어디까지 읽었는지'를 말한다. */
  const lastSeen = recent.map((id) => docs.find((d) => d.id === id)).find(Boolean);
  const lastSeenBook = lastSeen ? books.find((b) => b.id === lastSeen.book) : undefined;
  const dateLine = `${today.getMonth() + 1}월 ${today.getDate()}일 ${WEEK[today.getDay()]}요일`;
  const statsLine = lastSeenBook
    ? `${dateLine} · 마지막으로 『${lastSeenBook.title || '무제'}』를 펼쳤어요`
    : `${dateLine} · 아직 펼친 책이 없어요`;

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
          {/* 아래쪽 여백 — 문서 수 배지가 있던 자리. 제목이 가운데 머물도록 자리만 남긴다
              (개수는 책등에 새기지 않는다 — 차례·사이드바에 이미 있다) */}
          <span aria-hidden className="h-[28px] flex-none" />
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
  /* ── 차례에서 끌어 옮기기 ──
   * 문서 한가운데에 놓으면 그 문서의 하위로, 문서와 문서 사이에 놓으면 그 자리로.
   * 사이에 놓을 때는 좌우로 움직여 단계를 고른다 — 왼쪽으로 끌수록 상위로 빠져나온다. */
  const canNestOn = (target: string | null) => {
    if (!dragDoc) return false;
    if (target === dragDoc) return false;
    if (target && isDescendant(bookDocs, target, dragDoc)) return false;
    return (docs.find((d) => d.id === dragDoc)?.parent ?? null) !== target;
  };
  /** 끌고 있는 문서가 차례에서 차지하는 구간 [start, end) — 자기 안쪽으로는 못 들어간다 */
  const dragRange = useMemo(() => {
    if (!dragDoc) return null;
    const start = sideRows.findIndex((r) => r.d.id === dragDoc);
    if (start < 0) return null;
    let end = start + 1;
    while (end < sideRows.length && sideRows[end].depth > sideRows[start].depth) end++;
    return { start, end };
  }, [dragDoc, sideRows]);

  /**
   * 단계만 바꾸기 — 자리는 그대로 두고 부모만 갈아끼운다.
   * 드래그로 단계를 고르려면 행 높이의 위아래 30% 띠 안에서 좌우로 움직여야 해서
   * '2.1 을 2 로' 같은 흔한 일이 유독 어려웠다. Tab / Shift+Tab 로 한 번에 되게 한다.
   *
   * 내리기(Tab): 바로 위 형제의 마지막 자식으로 들어간다 — 위 형제가 없으면 더 내려갈 곳이 없다.
   * 올리기(Shift+Tab): 부모의 다음 자리로 빠져나온다. 이때 원래 나보다 아래에 있던 형제들은
   *   그대로 두면 순서가 뒤집히므로, 나는 부모 바로 다음에 꽂는다.
   */
  const shiftDepth = (id: string, dir: 1 | -1) => {
    const doc = bookDocs.find((d) => d.id === id);
    if (!doc) return;
    const siblings = childrenOf(bookDocs, doc.parent);
    const idx = siblings.findIndex((d) => d.id === id);
    if (dir === 1) {
      const prev = siblings[idx - 1];
      if (!prev) return;                       // 맨 위 형제 — 품어줄 형이 없다
      moveDoc(id, prev.id, null);              // 그 형의 마지막 자식으로
      return;
    }
    if (!doc.parent) return;                   // 이미 최상위
    const parent = bookDocs.find((d) => d.id === doc.parent);
    if (!parent) return;
    const uncles = childrenOf(bookDocs, parent.parent);
    const after = uncles[uncles.findIndex((d) => d.id === parent.id) + 1];
    moveDoc(id, parent.parent, after?.id ?? null);
  };

  /**
   * 이 자리에 놓으면 번호가 몇이 되나 — 드래그 중 미리보기용.
   * 사용자는 '2.1 을 2 로' 처럼 번호로 생각하는데, 지금까지는 들여쓰기만 보여주고
   * 결과 번호를 안 알려줘서 몇 단계인지 세어봐야 했다.
   */
  const numberAt = (gapIndex: number, depth: number): string => {
    const counters: number[] = [];
    for (let i = 0; i < gapIndex && i < numberedRows.length; i += 1) {
      const r = numberedRows[i];
      if (r.d.id === dragDoc) continue;              // 끌고 있는 줄은 목록에서 빠진 셈 치고 센다
      counters.length = r.depth + 1;
      counters[r.depth] = (counters[r.depth] ?? 0) + 1;
    }
    counters.length = depth + 1;
    counters[depth] = (counters[depth] ?? 0) + 1;
    return counters.map((n) => n ?? 1).join('.');
  };

  /** 사이(gap)에 놓을 때의 계획 — 커서 x 로 단계를 고르고, 그 단계의 부모와 앞 문서를 찾는다 */
  const placePlan = (gapIndex: number, x: number) => {
    if (!dragDoc || !dragRange) return null;
    const { start, end } = dragRange;
    if (gapIndex > start && gapIndex < end) return null;
    let p = gapIndex - 1;
    if (p >= start && p < end) p = start - 1; // 자기 구간은 건너뛰고 그 위를 기준으로
    const prev = p >= 0 ? sideRows[p] : null;
    let nx = gapIndex < sideRows.length ? sideRows[gapIndex] : null;
    if (nx && nx.d.id === dragDoc) nx = end < sideRows.length ? sideRows[end] : null;
    const maxD = prev ? prev.depth + 1 : 0; // 위 문서의 자식까지가 최대
    /* 아래 줄보다 얕아져도 된다. 예전엔 아래 줄 깊이를 하한으로 뒀는데, 그러면
       하위 문서를 최상위로 끌어올리는 길이 사실상 막혔다 — 아래에 손자뻘 줄이
       한 줄만 있어도 0단계를 고를 수 없었기 때문. 이제 0까지 내려간다. */
    /* 기준점을 6 이 아니라 13 으로 잡아 왼쪽으로 기울인다. 0단계 구간이 17px 에서
       24px 로 넓어진다 — 깊게 넣는 건 줄 한가운데(하위로 품기)로도 되지만,
       빼는 길은 이 좁은 왼쪽 띠 하나뿐이라 여기에 여유를 준다. */
    const depth = Math.max(0, Math.min(maxD, Math.round((x - 13) / 22)));
    let parent: string | null = null;
    if (depth > 0 && prev) {
      const chain = [...ancestorsOf(bookDocs, prev.d.id), prev.d]; // chain[k] 의 깊이 = k
      parent = chain[depth - 1]?.id ?? null;
    }
    if (parent && (parent === dragDoc || isDescendant(bookDocs, parent, dragDoc))) return null;
    /* 놓을 자리는 '바로 아래 줄 앞'이 아니라 '같은 부모의 첫 형제 앞'이다.
       얕은 단계를 고르면 바로 아래 줄은 남의 자식이라 기준이 될 수 없다. */
    let before: string | null = null;
    for (let i = gapIndex; i < sideRows.length; i += 1) {
      if (i >= start && i < end) continue;               // 끌고 있는 제 구간은 건너뛴다
      if (sideRows[i].d.parent === (parent ?? null)) { before = sideRows[i].d.id; break; }
    }
    return { depth, parent, before };
  };

  /** 소속(parent)과 차례 순서를 한 번에 옮긴다 — 순서는 docs 배열 위치가 정한다 */
  const moveDoc = (id: string, parent: string | null, before: string | null) => {
    /* 옮기기 직전 자리를 기억해 둔다 — 목록이 순간이동하지 않고 미끄러져 재배치되도록 */
    const from = new Map<string, DOMRect>();
    rowEls.current.forEach((el, key) => { if (el.isConnected) from.set(key, el.getBoundingClientRect()); });
    flipFrom.current = from;
    setStore((s) => {
      const arr = [...s.docs];
      const from = arr.findIndex((d) => d.id === id);
      if (from < 0) return s;
      const [moved] = arr.splice(from, 1);
      let at = before ? arr.findIndex((d) => d.id === before) : -1;
      if (at < 0) at = arr.length;
      arr.splice(at, 0, { ...moved, parent, updated: Date.now() });
      return { ...s, docs: arr };
    });
    setJustMoved(id); // 옮겨진 문서가 어디로 갔는지 잠깐 빛난다
    window.setTimeout(() => setJustMoved((v) => (v === id ? null : v)), 900);
  };

  /* 서가 폭 — 창 크기·사이드바에 따라 한 줄에 담기는 책 수가 달라진다.
     렌더마다 실측해 스스로 보정하고(관찰자가 늦거나 안 오는 경우 대비), 리사이즈도 함께 듣는다. */
  const measureShelf = () => {
    const el = shelfRef.current;
    const w = el ? el.getBoundingClientRect().width : 0;
    setShelfW((prev) => (Math.abs(prev - w) > 1 ? w : prev));
  };
  useLayoutEffect(measureShelf);
  useEffect(() => {
    const el = shelfRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measureShelf);
    ro.observe(el);
    window.addEventListener('resize', measureShelf);
    return () => { ro.disconnect(); window.removeEventListener('resize', measureShelf); };
     
  }, [bookId, docId, qq]);

  /* 재배치 모션 — 옮긴 직후, 자리가 바뀐 줄들을 옛 자리에서 새 자리로 미끄러뜨린다.
     드롭 즉시 순간이동하면 "어디로 갔지?"가 되므로, 눈이 따라갈 시간(300ms)을 준다. */
  useLayoutEffect(() => {
    const from = flipFrom.current;
    if (!from) return;
    flipFrom.current = null;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    /* Web Animations 로 되돌렸다 풀어준다 — 인라인 스타일을 남기지 않아 줄이 어긋난 채 굳지 않는다 */
    rowEls.current.forEach((el, id) => {
      const was = from.get(id);
      if (!was || !el.isConnected) return;
      const now = el.getBoundingClientRect();
      const dx = was.left - now.left;
      const dy = was.top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        { duration: 300, easing: 'cubic-bezier(.2,.7,.2,1)' },
      );
    });
  }, [docs]);

  const shelfBar = <div aria-hidden style={{ height: 15, borderRadius: 3, background: 'linear-gradient(180deg,#a26c3e,#79491f)', boxShadow: '0 7px 13px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,235,200,.35)' }} />;

  /* 사이드바가 위·아래로 잘려 있나 — 잘린 쪽에만 페이드를 띄운다.
     스크롤·창 크기·내용 길이가 바뀔 때마다 다시 잰다(책 목록이 늘거나 차례가 펼쳐진다). */
  const sideRef = useRef<HTMLElement | null>(null);
  const [sideCut, setSideCut] = useState({ top: false, bottom: false });
  const syncSideCut = () => {
    const el = sideRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight > 2;
    const top = el.scrollTop > 2;
    setSideCut((p) => (p.top === top && p.bottom === bottom ? p : { top, bottom }));
  };
  useEffect(() => {
    const el = sideRef.current;
    if (!el) return;
    syncSideCut();
    const ro = new ResizeObserver(syncSideCut);
    ro.observe(el);
    // 안쪽 내용이 늘고 주는 것도 잡는다 (책 추가 · 차례 펼침)
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    window.addEventListener('resize', syncSideCut);
    return () => { ro.disconnect(); window.removeEventListener('resize', syncSideCut); };
     
  }, [book?.id, bookDocs.length, allBooks.length, collapsed]);

  /* 서재 찾기 — 사이드바에서 본문 머리 오른쪽으로 옮겼다.
     사이드바는 '무엇을 만들까'(새 책·새 문서)와 '어디 있나'(책 목록·차례)를 맡고,
     찾기는 지금 보고 있는 화면의 도구라 그 화면의 머리에 선다.
     서재·책·문서 세 화면 모두 머리 오른쪽 끝 같은 자리에 둔다 — 자리가 화면마다
     옮겨 다니면 매번 눈으로 찾게 된다. 아카이브·인맥노트·데일리 로그와도 같은 문법
     (늘 펼쳐진 칸 + 왼쪽 돋보기). */
  const searchField = (cls: string) => (
    <label className={cn('inline-flex h-[34px] items-center gap-2 rounded-[9px] px-3 text-[13px] transition-shadow', cls)}
      style={{ background: 'rgba(60,47,24,.07)', boxShadow: 'inset 0 1px 2px rgba(60,47,24,.13)' }}>
      <Search className="h-[15px] w-[15px] shrink-0" style={{ color: C.sub }} />
      <input
        value={q} onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') setQ(''); }}
        placeholder="서재에서 찾기" aria-label="서재 검색"
        className="min-w-0 flex-1 bg-transparent outline-none"
        style={{ color: C.ink, fontFamily: SANS }}
      />
      {q && (
        <button type="button" aria-label="검색 지우기" onClick={() => setQ('')} className="shrink-0" style={{ color: C.sub }}>
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </label>
  );

  return (
    <div className="wiki-theme flex h-dvh overflow-hidden" style={{ background: C.bg, fontFamily: SANS, color: C.ink }}>
      <style>{WIKI_CSS}</style>

      {/* ══════ 사이드바 — 데일리 로그 문법 (마크+락업 · 굵은 섹션 라벨 · 38px 행 · 은은한 활성) ══════ */}
      {/* 스크롤막대를 감추고, 대신 위아래 가장자리를 흐리게 해 '여기 더 있다' 를 알린다.
          막대는 크림 종이 위에 회색 금속 조각이 하나 붙은 꼴이라 이 방 물건이 아니었고,
          어차피 잡고 끄는 사람도 거의 없다. 페이드는 내용이 실제로 잘려 있을 때만
          뜬다 — 늘 깔아두면 신호가 아니라 장식이 된다. */}
      <div className="relative hidden w-[264px] flex-none lg:block" style={{ background: '#f3ecdd', borderRight: '1px solid rgba(60,47,24,.14)' }}>
        {sideCut.top && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-7" style={{ background: 'linear-gradient(180deg,#f3ecdd,rgba(243,236,221,0))' }} />
        )}
        {sideCut.bottom && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-9" style={{ background: 'linear-gradient(0deg,#f3ecdd 30%,rgba(243,236,221,0))' }} />
        )}
      <aside ref={sideRef} onScroll={syncSideCut} className="wiki-noscroll flex h-full w-full flex-col overflow-y-auto px-3.5 py-5" >
        {/* 머리 — 📚 이모지를 흰 타일에 담아 두었는데, 이 방은 이미 나무 책장과
            가죽 책등이라는 제 물건을 갖고 있다. 남의 그림 대신 그 물건의 조각(책등
            셋)을 세워 서재 문패로 삼는다. */}
        <button type="button" onClick={goShelf} className="flex items-center gap-[11px] px-1.5 text-left">
          <span aria-hidden className="flex h-[34px] w-[34px] shrink-0 items-end justify-center gap-[2px] rounded-[10px] pb-[7px]"
            style={{ background: 'linear-gradient(180deg,#5c3d20,#3d2410)', boxShadow: '0 1px 2px rgba(60,47,24,.28), inset 0 1px 0 rgba(255,235,200,.18)' }}>
            <span className="w-[4px] rounded-[1px]" style={{ height: 15, background: '#2f5c4a' }} />
            <span className="w-[4px] rounded-[1px]" style={{ height: 19, background: '#c8a34a' }} />
            <span className="w-[4px] rounded-[1px]" style={{ height: 13, background: '#9a4632' }} />
          </span>
          <span className="min-w-0">
            <span className="block text-[16px] font-bold leading-tight tracking-[-0.01em]" style={{ color: C.ink }}>마이위키</span>
            <span className="block truncate text-[12px] leading-tight" style={{ color: C.sub }}>나만의 서재</span>
          </span>
        </button>

        {/* 만들기 — 사이드바가 맡는다. 찾기는 본문 머리로 내보냈다(searchBox).
            이 방에서 '만들고 잇는' 색은 그린이다(본문 링크·연결 버블·차례 표시선). */}
        {/* 아카이브 '새 항목 저장' · 인맥노트 '새 사람' 과 같은 규격으로 맞췄다 —
            rounded-xl · py-2 · 14px 볼드 · 흰 글씨 · 방 강조색 · Plus 16px.
            방마다 조금씩 다른 알약이면 같은 자리의 같은 일인 걸 매번 다시 읽게 된다. */}
        <button
          type="button"
          onClick={() => (book ? createDoc(null) : setBookDialog({ book: null }))}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[14px] font-bold text-white shadow-sm transition-colors"
          style={{ background: C.green }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#3a7159'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = C.green; }}
        >
          <Plus className="h-4 w-4" />
          {book ? '새 문서' : '새 책'}
        </button>

        {book ? (
          /* 책 안 — 책을 여는 순간 사이드바가 그 책의 차례로 바뀐다. 문서를 열어도 그대로라 흔들림이 없다 */
          <div className="mt-1 flex-1">
            <button type="button" onClick={goShelf} className="mt-[18px] flex h-[30px] w-full items-center gap-1.5 rounded-[9px] px-3 text-left text-[12.5px] font-semibold transition-colors hover:bg-[rgba(60,47,24,.06)]" style={{ color: C.sub }}>
              ← 책장으로
            </button>
            <button
              type="button" onClick={() => openBook(book.id)}
              className="mt-1 flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-[rgba(60,47,24,.06)]"
            >
              <span className="h-[28px] w-[9px] flex-none rounded-[2px]" style={{ background: book.tint, boxShadow: 'inset -2px 0 3px rgba(0,0,0,.25)' }} />
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-bold tracking-[-0.01em]" style={{ color: C.ink }}>{book.title}</span>
                <span className="block text-[12px] leading-tight" style={{ color: C.sub }}>문서 {bookDocs.length}개</span>
              </span>
            </button>

            <div className="mb-[7px] mt-[22px] px-3 text-[11.5px] font-semibold tracking-[0.05em]" style={{ color: C.sub }}>차례</div>
            {numberedRows.map(({ d, depth, no }) => {
              const on = d.id === docId;
              const onPath = sidePath.has(d.id);
              const top = depth === 0;
              return (
                <button
                  key={d.id} type="button" onClick={() => openDoc(d.id)}
                  className={cn(
                    'flex min-h-[34px] w-full items-start gap-2 rounded-[9px] py-[7px] pr-3 text-left transition-colors',
                    !on && 'hover:bg-[rgba(60,47,24,.06)]',
                  )}
                  style={{
                    paddingLeft: 12 + depth * (showNo ? 10 : 14), // 번호 없으면 들여쓰기로 깊이를 더 벌린다
                    marginTop: top ? 4 : 0, // 최상위마다 한 숨 — 묶음이 눈에 보이게
                    background: on ? 'rgba(154,70,50,.13)' : undefined,
                    color: on ? C.rust : C.ink,
                  }}
                >
                  {/* 차례 번호 — 자릿수 자체가 몇 단 안쪽인지 말한다 */}
                  {showNo && (
                    <span
                      className="shrink-0 tabular-nums"
                      style={{ fontSize: top ? 12 : 11.5, fontWeight: 700, lineHeight: '20px', color: on ? C.rust : top ? C.sub : C.muted }}
                    >
                      {no}
                    </span>
                  )}
                  <span
                    className="min-w-0 flex-1 truncate"
                    style={{ fontSize: top ? 14 : 13.5, fontWeight: on || onPath ? 700 : top ? 600 : 500, letterSpacing: top ? '-0.01em' : undefined, lineHeight: '20px' }}
                  >
                    {d.title || '무제'}
                  </span>
                  {d.pinned && <Star className="mt-[3px] h-3 w-3 flex-none fill-amber-400 text-amber-400" />}
                </button>
              );
            })}
            {sideRows.length === 0 && <p className="px-3 py-2 text-[12.5px]" style={{ color: C.sub }}>아직 빈 책이에요</p>}

            {/* 갈아타기 — 책 안에 있어도 서재의 다른 책은 손 닿는 곳에 */}
            {books.length > 1 && (
              <>
                <div className="mb-[7px] mt-6 px-3 text-[11.5px] font-semibold tracking-[0.05em]" style={{ color: C.sub }}>다른 책</div>
                {books.filter((b) => b.id !== book.id).map((b) => (
                  <button
                    key={b.id} type="button" onClick={() => openBook(b.id)}
                    className="flex h-[36px] w-full items-center gap-2.5 rounded-[9px] px-3 text-left text-[13.5px] font-medium transition-colors hover:bg-[rgba(60,47,24,.06)]"
                    style={{ color: C.ink }}
                  >
                    <span className="h-[18px] w-[7px] flex-none rounded-[2px]" style={{ background: b.tint, boxShadow: 'inset -2px 0 3px rgba(0,0,0,.25)' }} />
                    <span className="min-w-0 flex-1 truncate">{b.title}</span>
                    <span className="text-[12.5px] tabular-nums" style={{ color: C.sub }}>{docs.filter((d) => d.book === b.id).length}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        ) : (
          /* 서재·책 펼침 모드 — 서재의 책 목록 (지금 펼친 책은 은은한 활성) */
          <div className="mt-1 flex-1">
            <div className="mb-[7px] mt-[22px] px-3 text-[11.5px] font-semibold tracking-[0.05em]" style={{ color: C.sub }}>책</div>
            {books.map((b) => {
              const on = b.id === bookId;
              return (
                <button
                  key={b.id} type="button" onClick={() => openBook(b.id)}
                  className={cn(
                    'flex h-[38px] w-full items-center gap-2.5 rounded-[9px] px-3 text-left text-[13.5px] transition-colors',
                    on ? 'font-semibold' : 'font-medium',
                    !on && 'hover:bg-[rgba(60,47,24,.06)]',
                  )}
                  style={{ background: on ? 'rgba(154,70,50,.13)' : undefined, color: on ? C.rust : C.ink }}
                >
                  <span className="h-[22px] w-[8px] flex-none rounded-[2px]" style={{ background: b.tint, boxShadow: 'inset -2px 0 3px rgba(0,0,0,.25)' }} />
                  <span className="min-w-0 flex-1 truncate">{b.title}</span>
                  <span className="text-[12.5px] tabular-nums" style={{ color: on ? C.rust : C.sub }}>{docs.filter((d) => d.book === b.id).length}</span>
                </button>
              );
            })}
            {books.length === 0 && <p className="px-3 py-2 text-[12.5px]" style={{ color: C.sub }}>첫 책을 만들어보세요</p>}
            {recentDocs.length > 0 && (
              <>
                <div className="mb-[7px] mt-6 px-3 text-[11.5px] font-semibold tracking-[0.05em]" style={{ color: C.sub }}>최근 본 문서</div>
                {recentDocs.map((d) => (
                  <button key={d.id} type="button" onClick={() => openDoc(d.id)}
                    className="flex h-[34px] w-full items-center gap-2 rounded-[9px] px-3 text-left text-[13.5px] font-medium transition-colors hover:bg-[rgba(60,47,24,.06)]"
                    style={{ color: C.ink }}>
                    <span className="h-[6px] w-[6px] flex-none rounded-full" style={{ background: bookOf.get(d.book)?.tint ?? C.rust }} />
                    <span className="min-w-0 flex-1 truncate">{d.title || '무제'}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* 하단 위젯 — 서재의 형편 (데일리 로그의 '이번 달 기록' 카드 자리) */}
        <div className="mt-3 shrink-0 rounded-[14px] px-3 py-3" style={{ border: '1px solid rgba(60,47,24,.14)', background: 'rgba(255,255,255,.5)' }}>
          <div className="mb-2 px-0.5 text-[11px] font-bold tracking-[0.03em]" style={{ color: C.sub }}>서재</div>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {[{ n: books.length, l: '책' }, { n: docs.length, l: '문서' }, { n: linkTotal, l: '연결' }].map((s) => (
              <div key={s.l}>
                <div className="text-[16px] font-bold tabular-nums leading-none" style={{ color: C.ink }}>{s.n}</div>
                <div className="mt-1 text-[11px]" style={{ color: C.sub }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
      </div>

      <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto">
      {/* 모바일 헤더 — 사이드바 대신 */}
      <div className="flex h-[54px] items-center gap-3 px-4 lg:hidden" style={{ borderBottom: '1px solid rgba(60,47,24,.12)' }}>
        <button type="button" onClick={goShelf} style={{ fontFamily: SANS, fontWeight: 800, letterSpacing: '-0.02em', fontSize: 17 }}>마이위키</button>
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
        <section className="wiki-rise mx-auto px-5 pb-20 pt-[84px] sm:px-8" style={{ maxWidth: 1240 }}>
          <div className="flex items-baseline gap-3.5">
            <h1 className="m-0" style={{ fontFamily: SANS, fontWeight: 800, letterSpacing: '-0.025em', fontSize: 32 }}>'{q.trim()}'</h1>
            <span style={{ fontSize: 13, color: C.sub }}>{results.length}개의 문서</span>
          </div>
          <div className="mt-5 grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {results.map(({ d, text }) => (
              <button key={d.id} type="button" onClick={() => openDoc(d.id)}
                className="rounded-[10px] p-[18px] text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_12px_24px_-10px_rgba(64,44,18,.3)]"
                style={{ background: C.paper, border: `1px solid ${C.line}`, boxShadow: '0 2px 6px rgba(64,44,18,.06)' }}>
                <div style={{ fontFamily: SANS, fontWeight: 700, letterSpacing: '-0.012em', fontSize: 17 }}>{d.title || '무제'}</div>
                <div className="mt-1.5 line-clamp-2" style={{ fontSize: 13, color: C.sub, lineHeight: 1.65 }}>{text.slice(0, 120) || '빈 문서'}</div>
                <div className="mt-3"><BookChip book={bookOf.get(d.book)} /></div>
              </button>
            ))}
            {results.length === 0 && <p className="py-10 text-center text-[14px]" style={{ color: C.muted }}>일치하는 문서가 없어요</p>}
          </div>
        </section>
      ) : active && book ? (
        /* ══════ 문서 ══════
           mx-auto 를 걷어 왼쪽으로 붙인다 — 가운데 정렬이던 탓에 사이드바와 목차 사이가
           크게 비고 본문은 그만큼 좁았다. 폭은 1300 → 1360. */
        <section className="wiki-rise px-5 pb-20 pt-[84px] sm:px-8" style={{ maxWidth: 1360 }}>
          {/* 빵가루 — 목차 위가 아니라 본문 위에 선다. 위계는 지금 읽는 글의 것이지
              옆 칸(목차)의 것이 아니라서, 본문 왼쪽 끝과 줄을 맞춰야 무엇에 대한 위계인지 읽힌다.
              그래서 아래 본문 그리드와 같은 열 구성을 쓰고 첫 칸은 비워 둔다. */}
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: isWide ? '140px minmax(0,1fr)' : 'minmax(0,1fr)' }}
          >
            {isWide && <span aria-hidden />}
            <div className="flex min-w-0 items-center gap-2">
            {backDoc && (
              /* key 에 깊이를 물려 링크를 한 번 더 탈 때마다 등장 모션이 다시 돈다 —
                 화살표만 덩그러니 있으면 빵가루의 일부로 읽혀 지나치게 되므로 '돌아가기'를 글자로 박는다. */
              <button
                key={trail.length}
                type="button" onClick={goBack}
                title={`'${backDoc.title || '무제'}'(으)로 돌아가기 — Esc`}
                className="wiki-back flex max-w-[320px] shrink-0 items-center gap-1.5 rounded-full py-[6px] pl-2.5 pr-3.5 transition-colors"
                style={{ background: 'rgba(48,95,76,.12)', color: C.green, fontSize: 12.5, boxShadow: 'inset 0 0 0 1px rgba(48,95,76,.18)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(48,95,76,.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(48,95,76,.12)'; }}
              >
                <span aria-hidden className="wiki-back-arrow">←</span>
                <span className="shrink-0" style={{ fontWeight: 800 }}>돌아가기</span>
                <span aria-hidden className="shrink-0" style={{ opacity: .35 }}>·</span>
                <span className="min-w-0 truncate" style={{ fontWeight: 600, opacity: .85 }}>{backDoc.title || '무제'}</span>
              </button>
            )}
            <div className="flex min-w-0 flex-1 items-center gap-[2px]" style={{ fontSize: 13, color: C.sub }}>
              {crumbBtn('shelf', '서재', goShelf)}
              <span className="shrink-0 opacity-50">›</span>
              {crumbBtn(book.id, book.title || '무제', () => openBook(book.id))}
              {crumbs.map((c2) => (
                <span key={c2.id} className="flex min-w-0 items-center gap-[2px]">
                  <span className="shrink-0 opacity-50">›</span>
                  {crumbBtn(c2.id, c2.title || '무제', () => openDoc(c2.id))}
                </span>
              ))}
              <span className="shrink-0 opacity-50">›</span>
              <span className="min-w-0 truncate px-1.5" style={{ color: C.ink, fontWeight: 600 }}>{active.title || '무제'}</span>
            </div>
            {/* 'Esc로 돌아가기' 안내는 뺐다 — Esc 는 그대로 듣는다.
                돌아가는 길은 이미 눈에 보인다(빵가루 · '← 돌아가기' 칩). 그 옆에서
                단축키를 한 번 더 일러주는 건, 이미 열려 있는 문 옆에서 문 여는 법을
                설명하는 꼴이라 줄만 길어졌다. 책 화면에서도 같은 이유로 걷어냈다. */}
            {searchField('w-[210px] max-w-[46vw] shrink-0')}
            </div>
          </div>

          {/* 목차 | 본문 — justify-center 를 걷어 왼쪽 기준으로 세운다 */}
          <div
            className="mt-[22px] grid items-start gap-6 lg:gap-9"
            style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}
          >
            {isWide ? (
            /* 목차 열은 '있을 때만' 만들면 본문 폭·위치가 통째로 흔들린다
               (한 줄 길이까지 바뀌어 읽는 리듬이 끊긴다).
               흔들리는 경우가 둘이었다 — ①제목 2개 미만인 문서 ②편집 모드.
               그래서 열은 언제나 자리를 잡아두고 내용만 들고 난다. 읽다가 편집을 눌러도 본문은 제자리.

               인포박스는 여기 칸을 따로 두지 않는다 — 종이 안(DocMain)에 박아 넣는다.
               세 번째 칸에 세워 봤더니 종이와 따로 노는 카드처럼 보였다. */
            <div className="grid gap-5" style={{ gridTemplateColumns: '140px minmax(0,1fr)', alignItems: 'start' }}>
              {/* 좌 — 목차 (읽기 모드, 제목 2개↑). 그 밖에는 빈 열로 자리만 지킨다 */}
              {mode === 'read' && toc.length >= 2 ? (
                /* 목차 — 줄마다 끊긴 밑줄만 있어서 허전했다.
                   이어진 세로 레일 하나에 항목을 걸고, 단계는 들여쓰기가 아니라 글자 굵기·크기로 준다.
                   레일이 끊기지 않으니 '글의 뼈대'로 읽히고, 짧은 목차도 성글어 보이지 않는다. */
                <nav className="sticky top-4" aria-label="목차">
                  <div className="mb-2 flex items-center gap-1.5" style={{ fontSize: 10, letterSpacing: '.14em', color: C.muted }}>
                    <span aria-hidden style={{ width: 12, height: 1, background: 'rgba(60,47,24,.28)' }} />
                    목차
                  </div>
                  <div style={{ borderLeft: `1px solid ${C.line}` }}>
                    {toc.map((h, i) => (
                      <button
                        key={i} type="button" onClick={() => scrollToHeading(i)}
                        className="wiki-toc-item block w-full text-left"
                        style={{
                          marginLeft: -1,
                          padding: `5px 8px 5px ${11 + (h.level - 1) * 9}px`,
                          fontSize: h.level === 1 ? 12.5 : 12,
                          fontWeight: h.level === 1 ? 700 : 500,
                          lineHeight: 1.45,
                          color: h.level === 1 ? C.ink : C.sub,
                        }}
                      >
                        {h.text}
                      </button>
                    ))}
                  </div>
                </nav>
              ) : <span aria-hidden />}

              {/* 중앙 — 본문 */}
              <DocMain
                active={active} book={book} bookOf={bookOf} bookDocs={bookDocs}
                mode={mode} setMode={setMode} toc={toc} kids={kids} backlinks={backlinks}
                readBodyRef={readBodyRef} editorApi={editorApi}
                patchDoc={patchDoc} removeDoc={removeDoc} onBodyChange={onBodyChange}
                openDoc={openDoc} createDoc={createDoc} setPicker={setPicker} applyTemplate={applyTemplate} tplStamp={tplStamp}
              />
            </div>
            ) : (
            /* 모바일/태블릿 — 1열. 인포박스는 DocMain 안에서 본문 위에 눕는다 */
            <div>
              <DocMain
                active={active} book={book} bookOf={bookOf} bookDocs={bookDocs}
                mode={mode} setMode={setMode} toc={toc} kids={kids} backlinks={backlinks}
                readBodyRef={readBodyRef} editorApi={editorApi}
                patchDoc={patchDoc} removeDoc={removeDoc} onBodyChange={onBodyChange}
                openDoc={openDoc} createDoc={createDoc} setPicker={setPicker} applyTemplate={applyTemplate} tplStamp={tplStamp}
              />
            </div>
            )}
          </div>
        </section>
      ) : book ? (
        /* ══════ 책 펼침 — 표지 + 차례 스프레드 (시안) ══════ */
        <section className="wiki-rise mx-auto w-full px-5 pb-20 pt-[84px] sm:px-8" style={{ maxWidth: 1240 }}>
          {/* 책 첫 화면에선 '서재 › 약물' 이 군더더기다 — 책 이름은 바로 아래 표지에 크게 적혀 있다.
              길 안내 대신 돌아가는 문 하나만 둔다. Esc 도 그대로 듣는다(적어 두진 않는다). */}
          <div className="flex items-center gap-3">
            <button
              type="button" onClick={goShelf}
              className="-ml-2 flex items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-[rgba(48,95,76,.08)]"
              style={{ fontSize: 13, fontWeight: 600, color: C.green }}
            >
              <ChevronDown className="h-3.5 w-3.5" style={{ transform: 'rotate(90deg)' }} />
              서재로 돌아가기
            </button>
            <span className="flex-1" />
            {searchField('w-[210px] max-w-[46vw] shrink-0')}
          </div>

          {/* 표지와 차례는 늘 같은 높이로 붙어 있어야 '펼친 책' 이 유지된다(grid stretch).
              길어지는 건 차례 쪽이고, 표지는 늘어난 자리를 표지 재질로 두고 적힌 것만 따라 내려온다. */}
          <div className="mt-6 grid min-h-[560px] grid-cols-1 items-stretch md:grid-cols-[262px_minmax(0,1fr)]" style={{ filter: 'drop-shadow(0 26px 40px rgba(46,28,10,.32))' }}>
            {/* 좌 — 표지 (색은 진하지 않게: 위는 밝게 열고 아래로만 그늘) */}
            {/* overflow-hidden 을 걷었다 — 이게 있으면 안쪽 sticky 가 죽는다.
                대신 질감 레이어가 모서리를 넘지 않게 반경을 물려받게 했다. */}
            <div
              className="relative flex p-5"
              style={{
                borderRadius: '8px 3px 3px 8px', color: C.cream,
                background: `linear-gradient(158deg, color-mix(in srgb, ${book.tint} 74%, #f3ead4) 0%, ${book.tint} 52%, color-mix(in srgb, ${book.tint} 90%, #2a1608) 100%)`,
              }}
            >
              <span aria-hidden className="pointer-events-none absolute inset-0" style={{ borderRadius: 'inherit', background: 'linear-gradient(270deg, rgba(0,0,0,.16), rgba(0,0,0,0) 16%), repeating-linear-gradient(0deg, rgba(0,0,0,.03) 0 2px, rgba(255,255,255,.02) 2px 4px)' }} />
              {/* 테두리 틀은 표지 끝까지 — 표지는 한 장이니 스프레드가 깨지지 않는다.
                  적힌 것들만 sticky 로 따라 내려온다: 차례가 길어져도 책갈피·이어서 읽기가 화면 밖으로 밀려나지 않게. */}
              <div className="relative flex flex-1 flex-col p-4" style={{ border: '1px solid rgba(244,230,200,.45)', borderRadius: 4 }}>
              <div className="sticky top-5 flex flex-col">
                {/* 제목 — 표지에서 바로 고친다 */}
                <input
                  value={book.title}
                  onChange={(e) => saveBook({ id: book.id, title: e.target.value, tint: book.tint, intro: book.intro })}
                  placeholder="책 제목"
                  className="w-full bg-transparent outline-none placeholder:text-[rgba(244,230,200,.5)]"
                  style={{ fontFamily: SERIF, fontWeight: 800, fontSize: 27, lineHeight: 1.3, letterSpacing: '.02em', color: C.cream }}
                />
                <CoverIntro value={book.intro} onChange={(v) => saveBook({ id: book.id, title: book.title, tint: book.tint, intro: v })} />

                {/* 이 책 한눈에 — 얇은 칸에 문서·고정·연결 */}
                <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg py-2 text-center" style={{ background: 'rgba(0,0,0,.12)' }}>
                  {(() => {
                    const linkN = bookDocs.reduce((a, d) => a + linkedDocIds(d.body).length, 0);
                    return [{ n: bookDocs.length, l: '문서' }, { n: bookDocs.filter((d) => d.pinned).length, l: '책갈피' }, { n: linkN, l: '연결' }];
                  })().map((s) => (
                    <div key={s.l}>
                      <div className="tabular-nums" style={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{s.n}</div>
                      <div className="mt-1" style={{ fontSize: 10, opacity: .72 }}>{s.l}</div>
                    </div>
                  ))}
                </div>

                {/* 책갈피 — 이 책에서 별표한 문서가 표지에 꽂힌다 */}
                {(() => {
                  const pins = bookDocs.filter((d) => d.pinned).slice(0, 4);
                  return (
                    <div className="mt-3.5">
                      <div className="flex items-center gap-1.5" style={{ fontSize: 10.5, letterSpacing: '.06em', opacity: .72 }}>
                        <Star className="h-3 w-3 fill-current" /> 책갈피
                      </div>
                      {pins.length > 0 ? (
                        <div className="mt-1.5 space-y-1">
                          {pins.map((d) => (
                            <button key={d.id} type="button" onClick={() => openDoc(d.id)}
                              className="flex w-full items-center gap-1.5 rounded-md px-2 py-[6px] text-left transition-colors"
                              style={{ background: 'rgba(0,0,0,.13)' }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,.26)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,.13)'; }}>
                              <span className="min-w-0 flex-1 truncate" style={{ fontSize: 12, fontWeight: 500 }}>{d.title || '무제'}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1.5" style={{ fontSize: 11, lineHeight: 1.55, opacity: .6 }}>차례에서 문서에 별표(★)하면 여기 꽂혀요.</p>
                      )}
                    </div>
                  );
                })()}

                {/* 예전엔 여기 flex-1 스페이서가 있어서 '이어서 읽기'가 표지 맨 아래로 밀렸다.
                    차례가 길어질수록 표지가 늘어나고 그만큼 가운데가 텅 비어 고장난 것처럼 보였다.
                    표지의 아래쪽이 비어 있는 건 책이면 당연하지만, 위아래로 갈라두고 가운데가 빈 건 아니다. */}
                {(() => {
                  const last = recent.map((id) => bookDocs.find((d) => d.id === id)).find(Boolean) ?? childrenOf(bookDocs, null)[0];
                  return last ? (
                    <>
                      <div className="mt-4" style={{ fontSize: 10.5, letterSpacing: '.08em', opacity: .7 }}>이어서 읽기</div>
                      <button
                        type="button" onClick={() => openDoc(last.id)}
                        className="mt-1.5 flex items-center justify-between gap-2 rounded-lg px-3 py-[10px] text-left transition-colors"
                        style={{ border: '1px solid rgba(244,230,200,.45)', fontSize: 13, fontWeight: 600, background: 'rgba(0,0,0,.16)', color: C.cream }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,.32)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,.16)'; }}
                      >
                        <span className="min-w-0 truncate">{last.title || '무제'}</span>
                        <span aria-hidden className="flex-none opacity-80">→</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button" onClick={() => createDoc(null)}
                      className="mt-4 flex items-center gap-1.5 rounded-lg px-3 py-[10px] text-left transition-colors"
                      style={{ border: '1px solid rgba(244,230,200,.45)', fontSize: 13, fontWeight: 600, background: 'rgba(0,0,0,.16)', color: C.cream }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,.32)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,.16)'; }}
                    >
                      <Plus className="h-3.5 w-3.5" /> 첫 문서 쓰기
                    </button>
                  );
                })()}
                {/* 표지 색·삭제만 — 제목·소개는 여기서 바로 고치니 다이얼로그는 색·삭제 전용 */}
                <button type="button" onClick={() => setBookDialog({ book })} className="mt-2.5 self-start text-[11px] underline-offset-4 hover:underline" style={{ color: 'rgba(244,230,200,.65)' }}>
                  표지 색 · 삭제
                </button>
              </div>
              </div>
            </div>

            {/* 우 — 차례 페이지 */}
            <div className="wiki-page min-w-0 p-7 sm:p-10" style={{ background: C.paper, borderRadius: '3px 12px 12px 3px', border: `1px solid ${C.line}`, borderLeft: 'none', boxShadow: 'inset 16px 0 26px -20px rgba(46,28,10,.45)' }}>
              <div className="flex items-baseline gap-3" style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 12 }}>
                <h2 className="m-0 flex-none" style={{ fontFamily: SANS, fontWeight: 700, letterSpacing: '-0.015em', fontSize: 20 }}>차례</h2>
                {/* 끄는 동안에는 안내가 바뀐다 — 가로축이 단계라는 걸 그때 알려줘야 쓸모가 있다 */}
                <span className="min-w-0 flex-1 truncate" style={{ fontSize: 12, color: dragDoc ? C.green : C.sub, fontWeight: dragDoc ? 600 : undefined }}>
                  {dragDoc
                    ? '왼쪽 끝까지 끌면 최상위 — 옆의 번호가 놓일 자리입니다'
                    : chapters.length > 0 ? '장을 접어 큰 흐름만 볼 수 있어요' : '눌러 펼치기 · 끌어 옮기기'}
                </span>
                <button
                  type="button" onClick={toggleNumbers}
                  className="flex-none rounded-full border px-2.5 py-1 text-[11.5px] font-semibold tabular-nums transition-colors"
                  style={showNo ? { borderColor: 'transparent', background: 'rgba(154,70,50,.13)', color: C.rust } : { borderColor: C.line, color: C.sub }}
                  title={showNo ? '차례 번호 숨기기' : '차례 번호 보이기'}
                >
                  1.1
                </button>
                {chapters.length > 0 && (
                  <button type="button" onClick={toggleAll} className="flex-none rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors hover:bg-[rgba(60,47,24,.05)]" style={{ borderColor: C.line, color: C.sub }}>
                    {allCollapsed ? '모두 펴기' : '모두 접기'}
                  </button>
                )}
                <button type="button" onClick={() => createDoc(null)} className="flex-none rounded-full px-3 py-1 text-[12px] font-semibold transition-colors hover:bg-[#40372a]" style={{ background: C.ink, color: C.bg }}>
                  + 새 문서
                </button>
              </div>
              <div className="mt-3.5">
                {sideRows.length === 0 ? (
                  <div className="py-12 text-center">
                    <p style={{ fontFamily: SANS, fontWeight: 700, letterSpacing: '-0.012em', fontSize: 16 }}>아직 빈 책이에요</p>
                    <p className="mt-1.5" style={{ fontSize: 13, color: C.sub }}>첫 문서를 적으면 여기가 차례가 돼요.</p>
                  </div>
                ) : (
                  <>
                    {tocRows.map(({ d, depth, no, idx: i }) => {
                      const nesting = dropHint?.mode === 'nest' && dropHint.id === d.id;
                      const lineHere = dropHint?.mode === 'place' && dropHint.index === i;
                      const chapter = depth === 0;              // 최상위 = 장
                      const kidsCount = descCount.get(d.id) ?? 0;
                      const folded = collapsed.has(d.id) && kidsCount > 0;
                      return (
                        <div key={d.id} className="relative" style={chapter && i > 0 ? { marginTop: 12 } : undefined}>
                          {/* 들어갈 자리 — 가로선의 들여쓰기가 곧 단계. 자리는 안 먹는다(위 주석) */}
                          {lineHere && <InsertLine depth={dropHint.depth} no={numberAt(dropHint.index, dropHint.depth)} />}
                          <div
                            ref={(el) => { if (el) rowEls.current.set(d.id, el); else rowEls.current.delete(d.id); }}
                            role="button" tabIndex={0} draggable
                            onClick={() => openDoc(d.id)}
                            /* Tab/Shift+Tab = 단계 내리기/올리기.
                               드래그로 단계를 바꾸려면 행 위아래 가장자리 띠 안에서 좌우로 움직여야 해
                               '2.1 을 2 로' 가 유독 까다로웠다 — 줄에 포커스를 두면 한 번에 된다. */
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDoc(d.id); return; }
                              if (e.key === 'Tab' && !e.altKey && !e.ctrlKey && !e.metaKey) {
                                e.preventDefault();
                                shiftDepth(d.id, e.shiftKey ? -1 : 1);
                              }
                            }}
                            /* 끌기 시작하면 전부 펼친다 — 감춰진 자리로는 옮길 수 없으니 */
                            onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', d.id); setCollapsed(new Set()); setDragDoc(d.id); }}
                            onDragEnd={() => { setDragDoc(null); setDropHint(null); }}
                            onDragOver={(e) => {
                              if (!dragDoc) return;
                              const r = e.currentTarget.getBoundingClientRect();
                              const rel = (e.clientY - r.top) / r.height;
                              if (rel > 0.38 && rel < 0.62) { // 한가운데 = 이 문서의 하위로
                                if (!canNestOn(d.id)) return;
                                e.preventDefault(); e.dataTransfer.dropEffect = 'move';
                                setDropHint({ mode: 'nest', id: d.id });
                                return;
                              }
                              const gap = rel <= 0.38 ? i : i + 1; // 가장자리 = 문서 사이
                              const plan = placePlan(gap, e.clientX - r.left);
                              if (!plan) return;
                              e.preventDefault(); e.dataTransfer.dropEffect = 'move';
                              setDropHint({ mode: 'place', index: gap, depth: plan.depth });
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (!dragDoc) return;
                              const id = dragDoc;
                              const r = e.currentTarget.getBoundingClientRect();
                              const rel = (e.clientY - r.top) / r.height;
                              const plan = rel > 0.38 && rel < 0.62 ? null : placePlan(rel <= 0.38 ? i : i + 1, e.clientX - r.left);
                              const nest = rel > 0.38 && rel < 0.62 && canNestOn(d.id);
                              setDragDoc(null); setDropHint(null);
                              if (nest) moveDoc(id, d.id, null);
                              else if (plan) moveDoc(id, plan.parent, plan.before);
                            }}
                            title={dragDoc ? undefined : `${d.title || '무제'} — 끌어서 옮기기 (문서 위=하위로, 사이=그 자리로) · Tab/Shift+Tab 으로 단계 바꾸기`}
                            className={cn(
                              'wiki-row group flex w-full items-baseline gap-2 rounded-md text-left',
                              dragDoc === d.id && 'wiki-row-drag',
                              nesting && 'wiki-row-drop',
                              justMoved === d.id && 'wiki-row-moved',
                              dragDoc ? 'cursor-grabbing' : 'cursor-grab',
                            )}
                            style={{ padding: `${chapter ? 8 : 6}px 6px ${chapter ? 8 : 6}px ${6 + depth * 22}px` }}
                          >
                            {/* 접기 손잡이 — 자손이 있는 줄만. 없으면 자리만 비워 번호가 나란히 선다 */}
                            {kidsCount > 0 ? (
                              <button
                                type="button" aria-label={folded ? `${d.title || '무제'} 펴기` : `${d.title || '무제'} 접기`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCollapsed((s) => { const n = new Set(s); if (n.has(d.id)) n.delete(d.id); else n.add(d.id); return n; });
                                }}
                                /* 보이는 크기는 18px 그대로 두고 누를 수 있는 범위만 넓힌다.
                                   위아래는 줄 안쪽 여백까지만(6px) — 더 늘리면 옆줄의
                                   드래그 띠를 가로챈다. 오른쪽은 번호 코앞에서 멈춘다. */
                                className="relative -ml-1 flex h-[18px] w-[18px] flex-none items-center justify-center self-center rounded transition-colors after:absolute after:-inset-y-[6px] after:-left-[7px] after:-right-[4px] after:content-[''] hover:bg-[rgba(60,47,24,.1)]"
                                style={{ color: C.sub }}
                              >
                                <ChevronDown className="h-3.5 w-3.5 transition-transform" style={{ transform: folded ? 'rotate(-90deg)' : undefined }} />
                              </button>
                            ) : (
                              <span aria-hidden className="-ml-1 h-[18px] w-[18px] flex-none" />
                            )}
                            {/* 차례 번호 — 스크롤로 넘어가도 자릿수가 깊이를 말해준다 */}
                            {showNo && <span className="flex-none self-center tabular-nums" style={{ fontSize: chapter ? 12 : 11.5, fontWeight: 700, color: chapter ? C.sub : C.muted }}>{no}</span>}
                            <span className="min-w-0 max-w-[52%] truncate" style={{ fontWeight: chapter ? 700 : 500, letterSpacing: chapter ? '-0.012em' : undefined, fontSize: chapter ? 15 : 14 }}>
                              {d.title || '무제'}
                            </span>
                            {d.pinned && <Star className="h-3 w-3 shrink-0 self-center fill-amber-400 text-amber-400" />}
                            {/* 접힌 장은 몇 개를 품고 있는지 알려준다 */}
                            {folded && (
                              <span className="flex-none self-center rounded-full px-1.5 py-px text-[11px] font-semibold" style={{ background: 'rgba(60,47,24,.07)', color: C.sub }}>
                                +{kidsCount}
                              </span>
                            )}
                            {/* 리더 — 평소엔 아주 연하게, hover 때 또렷하게 (제목과 날짜를 잇는 안내선) */}
                            <span aria-hidden className="flex-1 -translate-y-[3px] border-b border-dotted transition-colors group-hover:border-[rgba(60,47,24,.34)]" style={{ borderColor: 'rgba(60,47,24,.13)' }} />
                            <span className="w-[34px] flex-none text-right tabular-nums transition-colors group-hover:text-[color:var(--wk-ink)]" style={{ fontSize: 11.5, color: C.muted, '--wk-ink': C.body } as React.CSSProperties}>{fmtShort(d.updated)}</span>
                          </div>
                          {/* 하위로 품을 때 열리는 자리 */}
                          {nesting && <div aria-hidden className="wiki-slot" style={{ marginLeft: 6 + (depth + 1) * 22, marginRight: 6 }} />}
                        </div>
                      );
                    })}
                    {/* 맨 끝 자리 — 높이 0 인 기준점 위에 얹는다 */}
                    {dropHint?.mode === 'place' && dropHint.index === sideRows.length && (
                      <div className="relative h-0">
                        <InsertLine depth={dropHint.depth} no={numberAt(dropHint.index, dropHint.depth)} />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 페이지 밑단 — 이 책의 형편 */}
              <div className="mt-7 flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-3" style={{ borderTop: `1px solid ${C.line2}`, fontSize: 12, color: C.muted }}>
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
        /* ══════ 서재 홈 (시안) ══════
           위 여백 84px — 네 화면(검색 결과·문서·책·서재) 모두 같은 값이다.
           화면을 옮길 때 머리가 위아래로 튀면 같은 방이 아닌 것처럼 보인다. */
        <section className="wiki-rise mx-auto px-5 pb-20 pt-[84px] sm:px-8" style={{ maxWidth: 1240 }}>
          {/* ── 머리 ── 아카이브 마스트헤드와 같은 짜임새다.
              왼쪽은 말(제목 + 서술), 오른쪽은 도구 한 줄. 그게 전부다.

              앞서 도구를 오른쪽에 두 층으로 쌓아 봤는데, 폭이 다른 알약 둘이 위아래로
              어긋난 채 제목보다 높이 솟아 있어서 화면 오른쪽 위에 정체 모를 기둥이
              생겼다. 층을 나눌 만큼 성격이 다른 도구도 아니었다 — 셋 다 '이 책장을
              다루는 손잡이' 다. 한 줄로 눕히니 기둥이 사라지고 제목과 눈높이가 맞는다.

              세로 정렬은 items-end: 제목·서술·도구의 바닥이 한 선 위에 앉는다.
              그 선 바로 아래가 책장이라, 머리와 가구가 한 덩이로 읽힌다. */}
          <div className="mb-5 flex flex-wrap items-end gap-x-4 gap-y-3">
            <h1 className="m-0 shrink-0 leading-none" style={{ fontFamily: SANS, fontWeight: 800, letterSpacing: '-0.025em', fontSize: 38 }}>나의 서재</h1>
            {/* 서술은 자리가 모자라면 줄어든다 — 손잡이는 못 줄이니 말이 먼저 양보한다 */}
            <span className="min-w-0 truncate leading-none" style={{ fontSize: 13, color: C.sub }}>{statsLine}</span>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              {/* 고르는 것 → 찾는 것 → 만드는 것. 다른 방들이 모두 이 순서다. */}
              {allBooks.length > 1 && (
                <div className="flex h-[34px] items-center gap-0.5 rounded-[9px] p-0.5" style={{ background: 'rgba(60,47,24,.07)' }}>
                  {([['made', '꽂은 순'], ['name', '이름순'], ['size', '두꺼운 순']] as const).map(([k, label]) => (
                    <button
                      key={k} type="button"
                      onClick={() => { setShelfSort(k); setShelfPage(0); }}
                      aria-pressed={shelfSort === k}
                      className="h-full rounded-[7px] px-2.5 text-[12px] font-semibold transition-colors"
                      style={shelfSort === k
                        ? { background: C.paper, color: C.ink, boxShadow: '0 1px 2px rgba(60,47,24,.14)' }
                        : { background: 'transparent', color: C.sub }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {searchField('w-[240px] max-w-[42vw]')}
              {/* 얇은 선 — 보는 도구와 만드는 동작을 가른다 */}
              <span aria-hidden className="mx-0.5 h-[18px] w-px" style={{ background: 'rgba(60,47,24,.16)' }} />
              <button
                type="button" onClick={() => setBookDialog({ book: null })}
                className="flex h-[34px] shrink-0 items-center gap-1.5 rounded-[9px] px-3.5 text-[13px] font-bold text-white transition-colors"
                style={{ background: C.green }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#3a7159'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = C.green; }}
              >
                <Plus className="h-3.5 w-3.5" /> 새 책
              </button>
            </div>
          </div>

          {/* 나무 책장 — 머리와 22px. 머리의 아랫선(제목·서술·도구가 함께 앉은 선)
              바로 아래에 가구가 오게 해서 둘을 한 덩이로 묶는다. */}
          <div className="relative mt-[22px] rounded-[14px] px-6 pb-8 pt-[50px] sm:px-[36px]" style={{ background: 'linear-gradient(180deg,#5c3d20 0%,#4a2f16 45%,#38220e 100%)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.3), inset 0 18px 38px rgba(0,0,0,.42), 0 22px 48px -20px rgba(46,28,10,.55)' }}>
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
            <div ref={shelfRef} className="relative flex items-end gap-[9px] overflow-x-clip px-3.5">
              {pageBooks.map((b, i) => spine(b, shelfFree > 90 && i === pageBooks.length - 1 && pageBooks.length >= 2 ? spineOf(pageBooks[i - 1]).h : undefined))}
              <button type="button" onClick={() => setBookDialog({ book: null })} title="새 책 만들기"
                className="flex flex-none items-center justify-center rounded-[4px] text-[28px] transition-colors"
                style={{ height: 264, width: NEW_SLOT, border: '1.5px dashed rgba(244,230,200,.38)', color: 'rgba(244,230,200,.55)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(244,230,200,.7)'; e.currentTarget.style.color = 'rgba(244,230,200,.9)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(244,230,200,.38)'; e.currentTarget.style.color = 'rgba(244,230,200,.55)'; }}
              >+</button>

              {/* 정물들 — 남는 폭이 있을 때만. 등간격으로 도열하지 않고 꽃병·시계는 한 무리,
                  지구본만 멀찍이. 빈 틈은 1 : 1.9 로 갈려 리듬이 어긋난다 (grow 라 넘치지 않음) */}
              {shelfFree > 300 && <span aria-hidden className="hidden flex-[1] md:block" />}
              {shelfFree > 300 && (
                <span className="hidden flex-none items-end gap-[7px] self-end pb-[2px] md:flex">
                  {/* 꽃병 — 선반 안쪽에 물러나 있어 조금 작고 그늘지다 */}
                  {SHELF_PROPS.slice(0, shelfFree > 520 ? 1 : 0).map((kind) => (
                    <span key={kind} className="block" style={{ transform: 'scale(.94)', transformOrigin: 'bottom center', filter: 'brightness(.9)' }}>
                      <ShelfProp kind={kind} />
                    </span>
                  ))}
                  {/* 탁상시계 — 앞쪽에, 누가 내려놓은 듯 살짝 비뚜름하게 */}
                  {shelfFree > 420 && (
                    <span className="hidden lg:block" title="서재의 괘종시계" style={{ transform: 'rotate(2deg)', transformOrigin: 'bottom center', marginLeft: -3 }}>
                      <PendulumClock />
                    </span>
                  )}
                </span>
              )}
              {shelfFree > 300 && <span aria-hidden className="hidden flex-[1.9] md:block" />}

              {/* 지구본 — 서가 맨 오른쪽의 대형 정물. 돌리면(클릭) 아무 문서나 펼쳐진다 */}
              {shelfFree > 300 && docs.length > 0 && (
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

            {/* 선반 넘김 — 가구 위에 얹는다.
                예전엔 책장 한참 아래, 그것도 '예시 책 넣어보기' 줄 뒤에 동그란
                웹 페이지네이션이 떠 있었다. 넘기는 건 웹 페이지가 아니라 이 가구의
                선반 칸인데, 조작기가 가구에서 떨어져 나와 있으니 무엇을 넘기는
                단추인지 알 수 없었다.
                이제 손잡이는 옆판(가구의 기둥) 위에 붙은 황동 노브가 되고,
                몇 번째 선반인지는 아래 가로대에 박힌 작은 명패가 말한다. */}
            {pageCount > 1 && (
              <>
                <button
                  type="button" onClick={() => setShelfPage(page - 1)} disabled={page === 0}
                  aria-label="이전 선반" title="이전 선반"
                  className="wiki-shelf-knob absolute left-[-13px] top-1/2 z-20 flex h-[30px] w-[30px] -translate-y-1/2 items-center justify-center rounded-full transition-transform disabled:pointer-events-none disabled:opacity-0"
                >‹</button>
                <button
                  type="button" onClick={() => setShelfPage(page + 1)} disabled={page >= pageCount - 1}
                  aria-label="다음 선반" title="다음 선반"
                  className="wiki-shelf-knob absolute right-[-13px] top-1/2 z-20 flex h-[30px] w-[30px] -translate-y-1/2 items-center justify-center rounded-full transition-transform disabled:pointer-events-none disabled:opacity-0"
                >›</button>
                <div
                  aria-hidden
                  className="absolute bottom-[-9px] left-1/2 z-20 flex -translate-x-1/2 items-center gap-[7px] rounded-[3px] px-2.5 py-[2px]"
                  style={{ background: 'linear-gradient(180deg,#cfa84e,#8a6a30)', border: '1px solid #6d5222', boxShadow: '0 2px 5px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,240,200,.5)' }}
                >
                  {Array.from({ length: pageCount }, (_, i) => (
                    <span key={i} className="h-[5px] w-[5px] rounded-full" style={{ background: i === page ? '#3a2c10' : 'rgba(58,44,16,.28)' }} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 처음 상태로 — 시드는 빈 서재에만 1회 깔린다. 이미 쓰던 사람이 새 다섯
              권을 보려면 이 길뿐이다. 지금 것을 다 버리는 일이라 조용한 글자로 두고,
              누르면 무엇이 사라지는지 세어 묻는다. */}
          <div className="mt-3 flex justify-end">
            <button
              type="button" onClick={resetLibrary}
              className="rounded-md px-2 py-1 transition-colors"
              style={{ fontSize: 12, color: C.muted }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.green; e.currentTarget.style.background = 'rgba(48,95,76,.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; e.currentTarget.style.background = 'transparent'; }}
              title="지금 서재를 버리고 커피·돈·몸·사진·살림 다섯 권으로 되돌려요"
            >
              처음 상태로 되돌리기
            </button>
          </div>
          {/* 고정된 문서 */}
          {pinnedAll.length > 0 && (
            <div className="mt-7">
              <div className="flex items-baseline gap-2.5">
                <h2 className="m-0" style={{ fontFamily: SANS, fontWeight: 700, letterSpacing: '-0.012em', fontSize: 17 }}>고정된 문서</h2>
                <span style={{ fontSize: 12, color: C.sub }}>책갈피로 꽂아둔 {pinnedAll.length}개</span>
              </div>
              {/* 한 줄에 3개 고정 — auto-fit 은 개수에 따라 카드 폭이 널뛰어 줄마다 리듬이 달라진다 */}
              <div className="mt-3.5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pinnedAll.map((d) => {
                  const b = bookOf.get(d.book);
                  return (
                    <button key={d.id} type="button" onClick={() => openDoc(d.id)}
                      className="relative rounded-[10px] p-[18px] pb-[15px] text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_12px_24px_-10px_rgba(64,44,18,.3)]"
                      style={{ background: C.paper, border: `1px solid ${C.line}`, boxShadow: '0 2px 6px rgba(64,44,18,.06)' }}>
                      <span aria-hidden className="absolute right-5 top-[-5px] h-[56px] w-5" style={{ background: b?.tint ?? C.rust, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 9px), 0 100%)', boxShadow: '0 3px 5px rgba(0,0,0,.25)' }} />
                      <div className="pr-9" style={{ fontFamily: SANS, fontWeight: 700, letterSpacing: '-0.012em', fontSize: 17 }}>{d.title || '무제'}</div>
                      <div className="mt-1.5 line-clamp-2" style={{ fontSize: 13, color: C.sub, lineHeight: 1.65 }}>{bodyText(d.body).slice(0, 80) || '빈 문서'}</div>
                      <div className="mt-[13px] flex items-center gap-2">
                        <BookChip book={b} />
                        <span style={{ fontSize: 12, color: C.muted }}>{fmtDate(d.updated)} 수정</span>
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
                    <h2 className="m-0" style={{ fontFamily: SANS, fontWeight: 700, letterSpacing: '-0.012em', fontSize: 17 }}>많이 언급된 문서</h2>
                    <span style={{ fontSize: 12, color: C.sub }}>서재 전체 백링크 순위 — 이 서재의 중심</span>
                  </div>
                  {mostLinked.map(({ d, n }, i) => {
                    const b = bookOf.get(d.book);
                    const pct = Math.round((n / mostLinked[0].n) * 100);
                    return (
                      <button key={d.id} type="button" onClick={() => openDoc(d.id)}
                        className="grid w-full items-center gap-3 rounded-md px-1.5 py-[11px] text-left transition-colors hover:bg-[rgba(60,47,24,.045)]"
                        style={{ gridTemplateColumns: '28px 1fr auto', borderTop: `1px solid ${C.line2}` }}>
                        <span className="text-center" style={{ fontFamily: SANS, fontWeight: 800, fontSize: 17, color: i === 0 ? C.rust : '#b3a78f' }}>{i + 1}</span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate" style={{ fontSize: 14.5, fontWeight: 600 }}>{d.title || '무제'}</span>
                            <BookChip book={b} />
                          </span>
                          <span className="mt-[7px] block h-1 overflow-hidden rounded-full" style={{ background: 'rgba(60,47,24,.08)' }}>
                            <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: b?.tint ?? C.rust }} />
                          </span>
                        </span>
                        <span className="whitespace-nowrap" style={{ fontSize: 13, color: C.sub }}>{n}회 언급</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {recentDocs.length > 0 && (
                <div className="rounded-xl px-[22px] pb-3 pt-5" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
                  <div className="flex items-baseline gap-2.5 pb-3">
                    <h2 className="m-0" style={{ fontFamily: SANS, fontWeight: 700, letterSpacing: '-0.012em', fontSize: 17 }}>최근 본 문서</h2>
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
              <div style={{ fontFamily: SANS, fontWeight: 700, letterSpacing: '-0.012em', fontSize: 17 }}>아직 조용한 서재예요</div>
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

/* ── 템플릿 고르기 — 문서 틀을 눌러 넣는다. 기본 10종 + 내가 저장한 것.
      빈 문서면 그대로 채우고, 이미 쓴 내용이 있으면 아래에 이어 붙인다. ── */
function TemplatePicker({ docBody, onApply }: { docBody: Value; onApply: (body: Value) => void }) {
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState<WikiTemplate[]>(() => loadTemplates());
  const hasBody = bodyText(docBody).trim() !== '';

  const saveCurrent = () => {
    if (!hasBody) { window.alert('먼저 본문을 조금 적어야 템플릿으로 저장할 수 있어요.'); return; }
    const name = window.prompt('이 문서를 어떤 이름의 템플릿으로 저장할까요?', '');
    if (!name || !name.trim()) return;
    const next = [...mine, { id: newId('tpl'), name: name.trim(), hint: '내가 만든 템플릿', body: docBody, custom: true }];
    setMine(next);
    saveTemplates(next);
  };
  const removeMine = (id: string) => {
    const t = mine.find((x) => x.id === id);
    if (!t || !window.confirm(`템플릿 "${t.name}"을 지울까요?`)) return;
    const next = mine.filter((x) => x.id !== id);
    setMine(next);
    saveTemplates(next);
  };

  const row = (t: WikiTemplate) => (
    <span key={t.id} className="group relative flex items-center">
      <button
        type="button"
        onClick={() => { onApply(t.body); setOpen(false); }}
        className="min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[rgba(60,47,24,.06)]"
      >
        <span className="block truncate text-[13px] font-semibold" style={{ color: C.ink }}>{t.name}</span>
        <span className="block truncate text-[11.5px]" style={{ color: C.sub }}>{t.hint}</span>
      </button>
      {t.custom && (
        <button type="button" onClick={() => removeMine(t.id)} aria-label={`${t.name} 템플릿 삭제`}
          className="absolute right-1.5 rounded p-1 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100" style={{ color: C.muted }}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  );

  return (
    <span className="relative inline-flex">
      <button
        type="button" onClick={() => setOpen((o) => !o)}
        className="flex h-[30px] items-center gap-1 rounded-full border px-3 text-[12px] font-semibold transition-colors hover:bg-[rgba(60,47,24,.04)]"
        style={{ borderColor: C.line, background: C.paper, color: C.sub }}
        title="문서 틀 고르기"
      >
        <Plus className="h-3 w-3" /> 템플릿
      </button>

      {open && (
        <>
          <span className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <span
            className="absolute left-0 top-full z-30 mt-1.5 block max-h-[340px] w-[300px] overflow-y-auto rounded-xl p-1.5"
            style={{ background: C.paper, border: `1px solid ${C.lineDeep}`, boxShadow: '0 16px 34px -12px rgba(46,28,10,.4)' }}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } }}
          >
            <span className="block px-2.5 pb-1.5 pt-1 text-[11px] font-semibold" style={{ color: C.muted }}>
              {hasBody ? '지금 내용 아래에 이어 붙여요' : '빈 문서를 이 틀로 채워요'}
            </span>
            {BUILTIN_TEMPLATES.map(row)}

            <span className="mt-1.5 block border-t px-2.5 pb-1.5 pt-2 text-[11px] font-semibold" style={{ borderColor: C.line2, color: C.muted }}>내 템플릿</span>
            {mine.length > 0 ? mine.map(row) : (
              <span className="block px-2.5 pb-1 text-[12px]" style={{ color: C.sub }}>아직 없어요</span>
            )}
            <button
              type="button" onClick={saveCurrent}
              className="mt-1 flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold transition-colors hover:bg-[rgba(48,95,76,.08)]"
              style={{ color: C.green }}
            >
              <Plus className="h-3.5 w-3.5" /> 이 문서를 템플릿으로 저장
            </button>
          </span>
        </>
      )}
    </span>
  );
}

/* ── 위치 고르기 — 이 문서가 책의 어느 자리에 속하는지 차례를 그대로 펼쳐 고른다.
      드롭다운 목록은 들여쓰기가 뭉개져 위계가 안 보였다. ── */
function ParentPicker({ bookDocs, doc, book, onPick }: {
  bookDocs: WikiDoc[]; doc: WikiDoc; book: WikiBook; onPick: (parent: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => {
    const out: { d: WikiDoc; depth: number; no: string }[] = [];
    const counters: number[] = [];
    const seen = new Set<string>();
    const walk = (parent: string | null, depth: number) => {
      for (const d of childrenOf(bookDocs, parent)) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        counters.length = depth + 1;
        counters[depth] = (counters[depth] ?? 0) + 1;
        out.push({ d, depth, no: counters.join('.') });
        walk(d.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [bookDocs]);

  const path = ancestorsOf(bookDocs, doc.id);
  const label = path.length ? path.map((p) => p.title || '무제').join(' › ') : `${book.title}의 맨 위`;

  return (
    <span className="relative inline-flex">
      <button
        type="button" onClick={() => setOpen((o) => !o)}
        className="flex h-[30px] max-w-[280px] items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors hover:bg-[rgba(60,47,24,.04)]"
        style={{ borderColor: C.line, background: C.paper, color: C.sub }}
        title="이 문서가 놓인 자리 — 눌러서 옮기기"
      >
        <span aria-hidden className="h-[10px] w-[3px] flex-none rounded-[1px]" style={{ background: book.tint }} />
        <span className="truncate">{label}</span>
        <ChevronDown className="h-3 w-3 flex-none opacity-70" />
      </button>

      {open && (
        <>
          <span className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <span
            className="absolute left-0 top-full z-30 mt-1.5 block max-h-[300px] w-[320px] overflow-y-auto rounded-xl p-1.5"
            style={{ background: C.paper, border: `1px solid ${C.lineDeep}`, boxShadow: '0 16px 34px -12px rgba(46,28,10,.4)' }}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } }}
          >
            <span className="block px-2.5 pb-1.5 pt-1 text-[11px] font-semibold" style={{ color: C.muted }}>어디에 둘까요</span>
            <button
              type="button" onClick={() => { onPick(null); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold transition-colors hover:bg-[rgba(60,47,24,.06)]"
              style={{ color: C.ink }}
            >
              <span aria-hidden className="h-[14px] w-[5px] flex-none rounded-[1px]" style={{ background: book.tint }} />
              <span className="flex-1 truncate">{book.title}의 맨 위</span>
              {doc.parent === null && <Check className="h-3.5 w-3.5 flex-none" style={{ color: C.green }} />}
            </button>

            {rows.map(({ d, depth, no }) => {
              const self = d.id === doc.id;
              const inside = isDescendant(bookDocs, d.id, doc.id);
              const disabled = self || inside;
              const current = doc.parent === d.id;
              return (
                <button
                  key={d.id} type="button" disabled={disabled}
                  onClick={() => { onPick(d.id); setOpen(false); }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg py-[7px] pr-2.5 text-left text-[13px] transition-colors',
                    disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-[rgba(60,47,24,.06)]',
                  )}
                  style={{ paddingLeft: 10 + depth * 12, color: C.ink, fontWeight: current ? 700 : depth === 0 ? 600 : 500 }}
                  title={self ? '자기 자신 아래로는 옮길 수 없어요' : inside ? '하위 문서 아래로는 옮길 수 없어요' : `${d.title || '무제'} 아래로`}
                >
                  <span className="w-[30px] flex-none tabular-nums text-[11px] font-bold" style={{ color: C.muted }}>{no}</span>
                  <span className="min-w-0 flex-1 truncate">{d.title || '무제'}</span>
                  {current && <Check className="h-3.5 w-3.5 flex-none" style={{ color: C.green }} />}
                </button>
              );
            })}
          </span>
        </>
      )}
    </span>
  );
}

/* ── 문서 본문 (읽기/편집 공용 셸) ── */
function DocMain({
  active, book, bookOf, bookDocs, mode, setMode, toc, kids, backlinks,
  readBodyRef, editorApi, patchDoc, removeDoc, onBodyChange, openDoc, createDoc, setPicker,
  applyTemplate, tplStamp,
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
  applyTemplate: (body: Value) => void;
  tplStamp: number;
}) {
  void toc;

  /* 인포박스 — 문서 안, 본문 오른쪽 위에 박아 둔다.
     옆 칸(세 번째 열)에 세워 봤더니 종이와 따로 노는 물건처럼 보였다. 이건 이
     문서가 가진 요약이지 문서 옆에 놓인 딴 카드가 아니다.
     float 로 두어 본문이 상자를 돌아 흐른다 — 위키가 예부터 쓰던 방식이고,
     상자 아래 오른쪽이 빈 채로 남지 않는다. 옆 칸을 걷어 본문이 원래 폭을
     되찾았으므로 240px 를 떼줘도 글줄은 610px 남는다.
     좁은 화면에선 흘리지 않고 본문 위에 한 덩이로 눕힌다. */
  const infoboxSlot = active.infobox ? (
    /* relative z-10 이 없으면 못 누른다 — 흘린 상자는 흐름 밖에 있고, 뒤따라오는
       본문/편집기 블록은 그 밑을 지나가면서도 DOM 상 나중이라 위에 그려진다.
       글자만 옆으로 비켜 갈 뿐 블록 자체는 상자를 덮어 클릭을 가로챈다.
       바탕을 종이색으로 채우는 것도 같은 이유 — 투명하면 밑을 지나는 것이 비친다. */
    <div className="relative z-10 mb-4 w-full sm:float-right sm:mb-3 sm:ml-8 sm:w-[300px]">
      <WikiInfoboxCard
        value={active.infobox} title={active.title} tint={book.tint} editing={mode === 'edit'}
        onChange={(next) => patchDoc(active.id, { infobox: next })}
      />
    </div>
  ) : null;

  return (
    <div className="min-w-0">
      <article className="wiki-page relative rounded-[14px] p-6 sm:px-[52px] sm:py-11" style={{ background: C.paper, border: `1px solid ${C.line}`, boxShadow: '0 2px 10px rgba(64,44,18,.05)' }}>
        {/* 책갈피 리본 — 읽을 때든 고칠 때든 같은 자리에 꽂는다.
            모드 밖에 두었으므로 편집으로 넘어가도 리본이 사라지거나 다시 그려지지 않는다.
            안 꽂힌 상태는 종이에 스민 자국처럼 흐리게 두고, 이 문서 위에 마우스를
            올렸을 때만 드러난다 — 늘 보이면 잔소리가 된다. */}
        <button
          type="button"
          onClick={() => patchDoc(active.id, { pinned: !active.pinned })}
          aria-pressed={active.pinned}
          aria-label={active.pinned ? '책갈피 빼기' : '책갈피 꽂기'}
          title={active.pinned ? '책갈피가 꽂혀 있어요 — 눌러서 빼기' : '이 문서에 책갈피 꽂기'}
          className={cn('wiki-mark', active.pinned && 'wiki-mark-on wiki-mark-drop')}
        />
        {mode === 'read' ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <h1 className="m-0 min-w-0" style={{ fontFamily: SANS, fontWeight: 800, letterSpacing: '-0.025em', fontSize: 34, lineHeight: 1.3 }}>{active.title || '무제'}</h1>
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
              <span style={{ fontSize: 13, color: C.muted }}>마지막 수정 {fmtDate(active.updated)}</span>
              {backlinks.length > 0 && <span style={{ fontSize: 13, color: C.muted }}>· 문서 {backlinks.length}개가 이 문서를 언급</span>}
            </div>
            <div aria-hidden className="mb-1 mt-5" style={{ borderBottom: '3px double rgba(60,47,24,.25)' }} />
            {infoboxSlot}
            <div className="wiki-read">
              <Suspense fallback={<p className="py-10 text-center" style={{ fontSize: 13, color: C.sub }}>문서를 펼치는 중…</p>}>
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
                style={{ fontFamily: SANS, fontWeight: 800, letterSpacing: '-0.025em', fontSize: 31, lineHeight: 1.3, color: C.ink }}
              />
              <div className="mt-1 flex shrink-0 items-center gap-2">
                <span className="hidden sm:inline" style={{ fontSize: 11.5, color: C.muted }}>{fmtRel(active.updated)} 저장됨</span>
                {/* 본문은 이미 자동 저장되지만, 다 쓰고 누르는 버튼의 이름은 '저장'이어야 한다
                    — 하는 일(편집 끝내고 읽기 화면으로)은 그대로 */}
                <button
                  type="button" onClick={() => setMode('read')}
                  className="flex items-center gap-1.5 rounded-lg px-3.5 py-[7px] text-[12.5px] font-semibold text-white transition-colors"
                  style={{ background: C.green }}
                >
                  <Check className="h-3.5 w-3.5" /> 저장
                </button>
              </div>
            </div>

            {/* 도구 줄 하나 — 왼쪽: 넣기·자리(주요) / 오른쪽: 고정·삭제(부차, 아이콘) */}
            <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-2">
              <TemplatePicker docBody={active.body} onApply={applyTemplate} />
              <ParentPicker
                bookDocs={bookDocs} doc={active} book={book}
                onPick={(parent) => patchDoc(active.id, { parent })}
              />
              {/* 인포박스 — 필요한 문서에만. 넣기 전엔 조용한 버튼이고, 넣은 뒤엔
                  들어와 있다는 표시가 된다(다시 누르면 상자 안에서 지운다는 뜻이 아니라
                  여기서 바로 지운다 — 상자가 화면 밖에 있을 수도 있어서). */}
              <button
                type="button"
                onClick={() => {
                  if (active.infobox) {
                    const has = !!active.infobox.photo || active.infobox.rows.some((r) => r.k.trim() || r.v.trim());
                    if (has && !window.confirm('인포박스를 지울까요?\n적어둔 항목과 사진이 함께 사라집니다.')) return;
                    patchDoc(active.id, { infobox: undefined });
                  } else {
                    /* 빈 줄 셋으로 시작한다 — 완전히 빈 상자는 무엇을 적는 곳인지
                       알려주지 못하고, 미리 채워 두면 안 맞는 문서에서 지우는 일이 된다. */
                    patchDoc(active.id, { infobox: { rows: [{ k: '', v: '' }, { k: '', v: '' }, { k: '', v: '' }] } });
                  }
                }}
                aria-pressed={!!active.infobox}
                title={active.infobox ? '인포박스 지우기' : '문서 옆에 요약 상자(사진 · 항목/값)를 세워요'}
                className="flex h-[30px] items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold transition-colors"
                style={active.infobox
                  ? { background: 'rgba(48,95,76,.12)', color: C.green, boxShadow: 'inset 0 0 0 1px rgba(48,95,76,.22)' }
                  : { color: C.sub, border: `1px solid ${C.line}` }}
              >
                <PanelRight className="h-3.5 w-3.5" /> 인포박스
              </button>
              <span aria-hidden className="mx-0.5 h-4 w-px" style={{ background: C.line }} />
              <TagEditor tags={active.tags} onChange={(tags) => patchDoc(active.id, { tags })} />
              {/* 책갈피는 여기 없다 — 종이 왼쪽 위의 리본이 그 일을 한다.
                  편집 중에도 같은 리본을 그대로 누르면 된다. */}
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button" onClick={() => removeDoc(active.id)}
                  aria-label="문서 삭제" title="이 문서 삭제"
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-lg transition-colors hover:bg-rose-50 hover:text-rose-500"
                  style={{ color: C.muted }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div aria-hidden className="mb-1 mt-5" style={{ borderBottom: `1px solid ${C.line}` }} />
            {infoboxSlot}

            <Suspense fallback={<p className="py-10 text-center" style={{ fontSize: 13, color: C.sub }}>편집기를 여는 중…</p>}>
              <WikiDocEditor
                key={`${active.id}-${tplStamp}`}
                initialValue={active.body}
                onChange={(v) => onBodyChange(active.id, v)}
                onOpenDoc={openDoc}
                onLinkRequest={(text) => setPicker({ text })}
                apiRef={editorApi}
              />
            </Suspense>
          </>
        )}
        {/* 흘린 상자 마감 — 본문이 상자보다 짧으면 상자가 종이 아래로 삐져나온다 */}
        <div aria-hidden className="clear-both" />
      </article>

      {/* 하위 문서 */}
      <div className="mt-[26px]">
        <div className="flex items-baseline gap-2.5">
          <h2 className="m-0" style={{ fontFamily: SANS, fontWeight: 700, letterSpacing: '-0.012em', fontSize: 17 }}>하위 문서</h2>
          {kids.length > 0 && <span style={{ fontSize: 12, color: C.sub }}>{kids.length}개</span>}
        </div>
        {/* 하위 문서가 없을 땐 큰 점선 상자를 세우지 않는다 — 아무것도 없는 자리가
            본문보다 눈에 띄던 이유. 그럴 땐 한 줄짜리 링크로 조용히 둔다. */}
        {kids.length === 0 ? (
          <button type="button" onClick={() => createDoc(active.id)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[rgba(60,47,24,.05)]"
            style={{ fontSize: 13, fontWeight: 600, color: C.sub }}>
            <Plus className="h-3.5 w-3.5" /> 하위 문서 만들기
          </button>
        ) : (
          <div className="mt-3 grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {kids.map((d) => (
              <button key={d.id} type="button" onClick={() => openDoc(d.id)}
                className="rounded-[10px] px-[18px] py-[15px] text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-10px_rgba(64,44,18,.28)]"
                style={{ background: C.paper, border: `1px solid ${C.line}` }}>
                <div style={{ fontFamily: SANS, fontWeight: 700, letterSpacing: '-0.01em', fontSize: 14.5 }}>{d.title || '무제'}</div>
                <div className="mt-1.5 line-clamp-1" style={{ fontSize: 13, color: C.sub }}>{bodyText(d.body).slice(0, 70) || '빈 문서'}</div>
              </button>
            ))}
            <button type="button" onClick={() => createDoc(active.id)}
              className="flex min-h-[64px] items-center justify-center gap-1.5 rounded-[10px] transition-colors hover:bg-[rgba(60,47,24,.03)]"
              style={{ border: '1.5px dashed rgba(60,47,24,.2)', fontSize: 13, fontWeight: 600, color: C.sub }}>
              <Plus className="h-3.5 w-3.5" /> 하위 문서
            </button>
          </div>
        )}
      </div>

      {/* 백링크 — 문맥 발췌 카드 (시안) */}
      <div className="mt-[26px]">
        <div className="flex items-baseline gap-2.5">
          <h2 className="m-0" style={{ fontFamily: SANS, fontWeight: 700, letterSpacing: '-0.012em', fontSize: 17 }}>이 문서를 언급한 문서들</h2>
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
                    <span style={{ fontFamily: SANS, fontWeight: 700, letterSpacing: '-0.01em', fontSize: 14.5 }}>{bl.title || '무제'}</span>
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
          <div className="mt-3 max-w-[62ch] rounded-[10px] px-[22px] py-5" style={{ border: '1.5px dashed rgba(60,47,24,.2)', fontSize: 13.5, color: C.body, lineHeight: 1.75 }}>
            아직 이 문서를 언급한 문서가 없어요. 다른 문서에서 텍스트를 드래그해 "문서로 연결"하면 여기에 모입니다.
          </div>
        )}
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
        <button key={t} type="button" onClick={() => onChange(tags.filter((x) => x !== t))} title="태그 제거"
          className="flex h-[24px] items-center rounded-full px-2.5 text-[11.5px] font-semibold transition-colors hover:bg-[rgba(48,95,76,.16)]"
          style={{ background: 'rgba(48,95,76,.1)', color: C.green }}>
          #{t} <span className="ml-1 opacity-50">×</span>
        </button>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={tags.length ? '+ 태그' : '# 태그 추가'}
        className="h-[24px] w-[72px] bg-transparent outline-none"
        style={{ fontSize: 12, color: C.ink }}
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
  const submit = () => { if (valid) onSave({ id: book?.id, title: title.trim(), tint, intro: intro.trim() }); };
  const field: React.CSSProperties = {
    background: C.bg, border: `1px solid ${C.line}`, borderRadius: 9,
    padding: '9px 11px', color: C.ink, width: '100%', outline: 'none',
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        className="w-[540px] max-w-[94vw] overflow-hidden rounded-2xl"
        style={{ background: C.paper, border: `1px solid ${C.line}`, boxShadow: '0 30px 70px -20px rgba(46,28,10,.45)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 머리 */}
        <div className="flex items-center px-5 py-3.5" style={{ borderBottom: `1px solid ${C.line}` }}>
          <h3 className="m-0" style={{ fontFamily: SANS, fontWeight: 700, letterSpacing: '-0.012em', fontSize: 16 }}>
            {book ? '책 정보' : '새 책'}
          </h3>
          <button type="button" onClick={onClose} aria-label="닫기" className="ml-auto rounded-md p-1 transition-colors" style={{ color: C.muted }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5 p-5 sm:flex-row">
          {/* 왼쪽 — 서가에 꽂힌 모습 그대로 미리보기.
              작은 색 견본만 보여주면 '무슨 색을 고르는가'가 와닿지 않는다. 진짜 책등을 세워 보여준다. */}
          <div
            className="relative flex flex-none items-end justify-center overflow-hidden rounded-xl px-5 pb-0 pt-7 sm:w-[168px]"
            style={{
              background: 'linear-gradient(180deg,#5c3d20 0%,#4a2f16 45%,#38220e 100%)',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.3), inset 0 14px 30px rgba(0,0,0,.42)',
            }}
          >
            <span
              className="relative flex flex-col items-center justify-between"
              style={{
                width: 58, height: 196,
                background: `linear-gradient(180deg, color-mix(in srgb, ${tint} 88%, #fff) 0%, ${tint} 22%, ${tint} 78%, color-mix(in srgb, ${tint} 78%, #000) 100%)`,
                borderRadius: '4px 4px 3px 3px',
                boxShadow: '0 16px 22px -10px rgba(20,11,3,.62), inset 0 -5px 9px rgba(0,0,0,.3)',
                padding: '10px 6px 9px',
              }}
            >
              <span aria-hidden className="pointer-events-none absolute inset-0" style={{ borderRadius: 'inherit', background: 'linear-gradient(90deg, rgba(255,246,228,.3), rgba(255,246,228,.06) 22%, rgba(0,0,0,0) 60%, rgba(0,0,0,.38)), repeating-linear-gradient(0deg, rgba(0,0,0,.045) 0 2px, rgba(255,255,255,.025) 2px 4px)' }} />
              <span aria-hidden className="h-[6px] w-[62%] flex-none" style={{ borderTop: '2px solid rgba(233,205,140,.9)', borderBottom: '1px solid rgba(233,205,140,.55)' }} />
              <span
                className="relative min-h-0 max-h-full overflow-hidden whitespace-nowrap [writing-mode:vertical-rl]"
                style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 14, letterSpacing: '.18em', lineHeight: 1.15, textOverflow: 'ellipsis', color: '#fbf3e2', textShadow: '0 1px 0 rgba(0,0,0,.5), 0 2px 5px rgba(0,0,0,.3)' }}
              >
                {title.trim() || '새 책'}
              </span>
              <span aria-hidden className="h-[20px] flex-none" />
            </span>
            {/* 선반 널 */}
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-[11px]" style={{ background: 'linear-gradient(180deg,#a26c3e,#79491f)', boxShadow: '0 -6px 12px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,235,200,.35)' }} />
          </div>

          {/* 오른쪽 — 입력 */}
          <div className="min-w-0 flex-1">
            <label className="block">
              <span style={{ fontSize: 11.5, fontWeight: 700, color: C.sub }}>제목</span>
              <input
                autoFocus={!book}
                value={title} onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
                placeholder="무엇을 담을 책인가요?"
                className="mt-1.5"
                style={{ ...field, fontFamily: SANS, fontWeight: 700, letterSpacing: '-0.01em', fontSize: 15 }}
              />
            </label>

            <label className="mt-3.5 block">
              <span style={{ fontSize: 11.5, fontWeight: 700, color: C.sub }}>한 줄 소개 <span style={{ fontWeight: 500, color: C.muted }}>(선택)</span></span>
              <input
                value={intro} onChange={(e) => setIntro(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
                placeholder="나중의 내가 알아볼 만한 한 줄"
                className="mt-1.5"
                style={{ ...field, fontSize: 13 }}
              />
            </label>

            <div className="mt-3.5">
              <span style={{ fontSize: 11.5, fontWeight: 700, color: C.sub }}>책등 색</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {BOOK_PALETTE.map((c) => (
                  <button
                    key={c} type="button" onClick={() => setTint(c)} aria-label={`책등 색 ${c}`} aria-pressed={tint === c}
                    className="flex h-[26px] w-[26px] items-center justify-center rounded-full transition-transform hover:scale-110"
                    style={{ background: c, boxShadow: tint === c ? `0 0 0 2px ${C.paper}, 0 0 0 4px ${c}` : 'inset 0 -2px 4px rgba(0,0,0,.25)' }}
                  >
                    {tint === c && <Check className="h-3.5 w-3.5" style={{ color: '#fbf3e2' }} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 발 */}
        <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderTop: `1px solid ${C.line}` }}>
          {onDelete && (
            <button type="button" onClick={onDelete} className="inline-flex items-center gap-1.5 transition-colors hover:text-rose-500" style={{ fontSize: 12.5, fontWeight: 600, color: C.muted }}>
              <Trash2 className="h-3.5 w-3.5" /> 책 삭제
            </button>
          )}
          <button type="button" onClick={onClose} className="ml-auto rounded-full px-4 py-2" style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>취소</button>
          <button
            type="button" disabled={!valid} onClick={submit}
            className={cn('rounded-full px-5 py-2 font-bold transition-colors hover:bg-[#40372a]', !valid && 'cursor-not-allowed opacity-40')}
            style={{ background: C.ink, color: C.bg, fontSize: 13 }}
          >
            {book ? '저장' : '책 만들기'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 문서 연결 피커 ──
 * 예전엔 드래그한 글자를 검색어로 미리 박아넣고 열려서, 딱 맞는 제목이 없으면
 * 결과가 0~1줄만 남고 둘러볼 수가 없었다("검색해보세요"만 덩그러니).
 * 이제 검색창은 비워두고, 고른 글자는 '추천'을 뽑는 데만 쓴다 —
 * 열자마자 ①잘 맞는 문서 ②서재의 모든 문서 ③새로 만들어 연결 이 셋이 늘 보인다. */
function LinkPicker({ docs, books, selfId, initial, onClose, onPick, onCreate }: {
  docs: WikiDoc[]; books: WikiBook[]; selfId: string; initial: string;
  onClose: () => void;
  onPick: (docId: string, title: string) => void;
  onCreate: (title: string) => void;
}) {
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const bookOf = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);
  const picked = initial.trim();
  const newTitle = q.trim() || picked;
  const pool = useMemo(() => docs.filter((d) => d.id !== selfId), [docs, selfId]);

  /* 고른 글자와 얼마나 맞나 — 제목이 똑같다 > 그 말로 시작한다 > 그 말을 품는다 > 고른 글자 안에 제목이 들어있다 */
  const suggestions = useMemo(() => {
    const k = picked.toLowerCase();
    if (!k) return [];
    return pool
      .map((d) => {
        const t = (d.title || '').trim().toLowerCase();
        const s = !t ? 0 : t === k ? 100 : t.startsWith(k) ? 80 : t.includes(k) ? 60 : k.includes(t) ? 50 : 0;
        return { d, s };
      })
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || b.d.updated - a.d.updated)
      .slice(0, 4)
      .map((x) => x.d);
  }, [pool, picked]);

  const searching = q.trim().length > 0;
  const rest = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const shown = new Set(searching ? [] : suggestions.map((d) => d.id)); // 추천에 이미 선 건 빼고
    return pool
      .filter((d) => !shown.has(d.id) && (!qq || (d.title || '무제').toLowerCase().includes(qq)))
      .sort((a, b) => b.updated - a.updated)
      .slice(0, 40);
  }, [pool, q, searching, suggestions]);

  /* 키보드 이동을 위해 한 줄로 편 목록 — 마지막 칸은 늘 '새 문서로 만들고 연결' */
  const rows = useMemo(() => (searching ? rest : [...suggestions, ...rest]), [searching, suggestions, rest]);
  const lastIdx = rows.length; // = 새 문서 칸
  useEffect(() => { setCursor(0); }, [q]);

  const activate = (i: number) => {
    if (i === lastIdx) { if (newTitle) onCreate(newTitle); return; }
    const d = rows[i];
    if (d) onPick(d.id, d.title || newTitle);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(lastIdx, c + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, lastIdx]);

  // 커서가 보이는 자리 밖으로 나가면 따라 스크롤
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  /* 컴포넌트가 아니라 그냥 함수다 — 렌더마다 새 컴포넌트 타입이 되면 행이 통째로 remount 되어
     커서 이동·scrollIntoView 와 부딪힌다. */
  const row = (d: WikiDoc, i: number, hint?: string) => {
    const b = bookOf.get(d.book);
    return (
      <button
        key={d.id} type="button" data-idx={i}
        onClick={() => activate(i)} onMouseEnter={() => setCursor(i)}
        className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left"
        style={{ background: cursor === i ? 'rgba(48,95,76,.09)' : 'transparent' }}
      >
        <span aria-hidden className="h-[15px] w-[5px] shrink-0 rounded-[1.5px]" style={{ background: b?.tint ?? C.rust }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate" style={{ fontSize: 13.5, fontWeight: 700 }}>{d.title || '무제'}</span>
          <span className="block truncate" style={{ fontSize: 11, color: C.muted }}>『{b?.title ?? '?'}』</span>
        </span>
        {hint && (
          <span className="shrink-0 rounded-full px-2 py-[3px]" style={{ fontSize: 10.5, fontWeight: 700, background: 'rgba(48,95,76,.12)', color: C.green }}>{hint}</span>
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/35 pt-[13vh] backdrop-blur-[2px]" onMouseDown={onClose}>
      <div className="flex max-h-[74vh] w-[480px] max-w-[93vw] flex-col overflow-hidden rounded-2xl" style={{ background: C.paper, border: `1px solid ${C.line}`, boxShadow: '0 30px 70px -20px rgba(46,28,10,.45)' }} onMouseDown={(e) => e.stopPropagation()}>
        {/* 머리 — 무엇을 연결하는 중인지 먼저 보여준다 */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>
          <span style={{ fontSize: 12.5, color: C.sub }}>연결할 곳</span>
          {picked && (
            <span className="min-w-0 truncate rounded-md px-2 py-[3px]" style={{ fontSize: 12.5, fontWeight: 700, background: 'rgba(48,95,76,.1)', color: C.green }}>
              {picked}
            </span>
          )}
          <button type="button" onClick={onClose} aria-label="닫기" className="ml-auto rounded-md p-1" style={{ color: C.muted }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${C.line2}` }}>
          <div className="flex items-center gap-2 rounded-[9px] px-2.5 py-[7px]" style={{ background: C.bg, border: `1px solid ${C.line}` }}>
            <Search className="h-3.5 w-3.5 shrink-0" style={{ color: C.muted }} />
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); activate(cursor); } }}
              placeholder="다른 문서 찾기…"
              className="w-full bg-transparent outline-none"
              style={{ fontSize: 13.5, color: C.ink }}
            />
          </div>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {!searching && suggestions.length > 0 && (
            <>
              <div className="px-3 pb-1 pt-1.5" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', color: C.muted }}>잘 맞는 문서</div>
              {suggestions.map((d, i) => row(d, i, i === 0 ? '추천' : undefined))}
            </>
          )}
          {rest.length > 0 && (
            <>
              <div className="px-3 pb-1 pt-2.5" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', color: C.muted }}>
                {searching ? '검색 결과' : '서재의 모든 문서'}
              </div>
              {rest.map((d, i) => row(d, (searching ? 0 : suggestions.length) + i))}
            </>
          )}
          {rows.length === 0 && (
            <p className="px-3 py-5 text-center" style={{ fontSize: 13, color: C.muted }}>
              {searching ? '찾는 제목이 없어요 — 아래에서 새로 만들 수 있어요' : '아직 연결할 다른 문서가 없어요'}
            </p>
          )}
        </div>

        {/* 발 — '없으면 만들어서 연결'은 늘 손 닿는 자리에 */}
        {newTitle && (
          <div className="p-1.5" style={{ borderTop: `1px solid ${C.line}` }}>
            <button
              type="button" data-idx={lastIdx}
              onClick={() => activate(lastIdx)} onMouseEnter={() => setCursor(lastIdx)}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left"
              style={{ background: cursor === lastIdx ? 'rgba(48,95,76,.12)' : 'transparent', color: C.green }}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate" style={{ fontSize: 13, fontWeight: 700 }}>
                ‘{newTitle}’ 새 문서로 만들고 연결
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
