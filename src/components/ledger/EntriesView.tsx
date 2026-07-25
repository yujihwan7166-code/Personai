/**
 * 내역 — 시안 Ledger.dc.html '내역' 화면 그대로.
 *
 * 머리(월 스테퍼 + 수입/지출/이체) · 필터바(종류 탭 · 카테고리 · 보기 · 검색 · 초기화)
 * · 다중선택 벌크바 · 그룹 리스트(날짜별 / 카테고리별).
 * 검색어가 있으면 월 제한 없이 전체 기간에서 찾는다.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste } from 'lucide-react';
import { toast } from 'sonner';
import type { LedgerData } from '@/hooks/useLedger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { monthOf, summarizeMonth } from '@/lib/ledger/stats';
import { TYPE_META, type EntryType } from '@/types/ledger';
import { C, KRW } from './theme';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
const dowOf = (ymd: string) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d).getDay(); };

interface EntriesViewProps {
  data: LedgerData;
  onEdit: (id: string) => void;
  initialMonth?: string;
  focusDate?: string | null;
  onFocusConsumed?: () => void;
  initialCategory?: string | null;
  onOpenImport?: () => void;
  compact?: boolean;
}

export function EntriesView({ data, onEdit, initialMonth, focusDate, onFocusConsumed, initialCategory, onOpenImport, compact }: EntriesViewProps) {
  const [month, setMonth] = useState(() => (focusDate ? monthOf(focusDate) : initialMonth ?? monthOf(todayKey())));
  const [filter, setFilter] = useState<EntryType | 'all'>('all');
  const [catFilter, setCatFilter] = useState<string>(initialCategory ?? 'all');
  const [group, setGroup] = useState<'date' | 'category'>('date');
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [highlight, setHighlight] = useState<string | null>(focusDate ?? null);
  const focusRef = useRef<HTMLDivElement>(null);
  const { entries, categories } = data;
  const meta = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  useEffect(() => {
    if (!highlight) return;
    focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = window.setTimeout(() => { setHighlight(null); onFocusConsumed?.(); }, 1800);
    return () => window.clearTimeout(t);
  }, [highlight, onFocusConsumed]);

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const q = query.trim().toLowerCase();
  const list = useMemo(
    () => entries.filter((e) => {
      if (!q && !e.date.startsWith(month)) return false;
      if (filter !== 'all' && e.type !== filter) return false;
      if (catFilter !== 'all' && e.categoryId !== catFilter) return false;
      if (!q) return true;
      const cat = meta.get(e.categoryId);
      return e.memo.toLowerCase().includes(q) || (cat ? cat.label.toLowerCase().includes(q) : false) || e.date.includes(q);
    }),
    [entries, month, filter, catFilter, q, meta],
  );

  /** 고정지출로 자동 기록된 건 — 규칙 이름과 메모가 같으면 '고정' 배지. */
  const fixedLabels = useMemo(() => new Set(data.recurring.map((r) => r.label)), [data.recurring]);

  const groups = useMemo(() => {
    if (group === 'category') {
      const m = new Map<string, typeof list>();
      for (const e of list) { const a = m.get(e.categoryId) ?? []; a.push(e); m.set(e.categoryId, a); }
      return [...m.entries()]
        .sort((a, b) => b[1].reduce((s, e) => s + e.amount, 0) - a[1].reduce((s, e) => s + e.amount, 0))
        .map(([cid, items]) => ({
          key: cid,
          label: `${meta.get(cid)?.emoji ?? '📎'} ${meta.get(cid)?.label ?? cid}`,
          sub: `${items.length}건`, items,
        }));
    }
    const m = new Map<string, typeof list>();
    for (const e of list) { const a = m.get(e.date) ?? []; a.push(e); m.set(e.date, a); }
    return [...m.entries()].map(([date, items]) => ({
      key: date,
      label: q ? date : `${Number(date.slice(8, 10))}일 ${WEEKDAY[dowOf(date)]}요일`,
      sub: `${items.length}건`, items,
    }));
  }, [list, group, meta, q]);

  const sum = useMemo(() => summarizeMonth(entries, month), [entries, month]);
  const selSum = useMemo(() => list.filter((e) => sel.includes(e.id)).reduce((s, e) => s + e.amount, 0), [list, sel]);

  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const resetFilters = () => { setFilter('all'); setCatFilter('all'); setQuery(''); setGroup('date'); setSel([]); };

  const bulkCategory = () => {
    const name = window.prompt(`선택한 ${sel.length}건을 어느 카테고리로 옮길까요?\n${categories.map((c) => c.label).join(' · ')}`);
    if (!name) return;
    const hit = categories.find((c) => c.label.replace(/\s/g, '') === name.trim().replace(/\s/g, ''));
    if (!hit) { toast.error('그런 카테고리가 없어요'); return; }
    for (const id of sel) ledgerStore.updateEntry(id, { categoryId: hit.id });
    toast.success(`${sel.length}건을 ${hit.label}로 옮겼어요`);
    setSel([]);
  };

  /** 선택한 내역의 공통 첫 낱말을 규칙 키워드로. */
  const bulkRule = () => {
    const picked = list.filter((e) => sel.includes(e.id));
    const first = picked[0]?.memo.trim().split(/\s+/)[0];
    if (!first) { toast.error('메모가 없어 규칙을 만들 수 없어요'); return; }
    const kw = window.prompt('이 말이 들어가면 자동 분류할게요', first);
    if (!kw?.trim()) return;
    ledgerStore.setKeywordRule(kw.trim(), picked[0].categoryId);
    toast.success(`"${kw.trim()}" → ${meta.get(picked[0].categoryId)?.label ?? ''}`);
    setSel([]);
  };

  const bulkDelete = () => {
    if (!window.confirm(`선택한 ${sel.length}건을 지울까요? 되돌릴 수 없어요.`)) return;
    for (const id of sel) ledgerStore.removeEntry(id);
    toast.success(`${sel.length}건을 지웠어요`);
    setSel([]);
  };

  const rowPad = compact ? '8px 16px' : '12px 16px';
  const chip: React.CSSProperties = { height: 28, padding: '0 13px', border: 'none', borderRadius: 7, fontSize: 12.5, cursor: 'pointer' };
  const control: React.CSSProperties = { height: 32, padding: '0 10px', border: `1px solid ${C.line}`, borderRadius: 9, background: '#fff', fontSize: 12.5, fontWeight: 600, color: C.ink3, cursor: 'pointer' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 40 }}>
      {/* 머리 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: '-0.02em' }}>내역</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* 대시보드와 같은 문법 — 값이 먼저, 이동은 한 덩어리로 뒤에.
              화살표가 양옆을 감싸면 날짜가 버튼 사이에 낀 것처럼 보인다. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{month.replace('-', '. ')}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${C.line}`, borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
              <button type="button" aria-label="이전 달" onClick={() => shiftMonth(-1)}
                style={{ width: 26, height: 26, border: 'none', background: 'transparent', fontSize: 14, color: C.sub, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>‹</button>
              <span aria-hidden style={{ width: 1, height: 14, background: C.line }} />
              <button type="button" aria-label="다음 달" onClick={() => shiftMonth(1)}
                style={{ width: 26, height: 26, border: 'none', background: 'transparent', fontSize: 14, color: C.sub, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>›</button>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: C.green }}>＋{KRW(sum.income)}</span>
            <span style={{ color: C.ink2 }}>－{KRW(sum.expense)}</span>
            <span style={{ color: C.muted2 }}>이체 {KRW(sum.transfer)}원</span>
          </div>
        </div>
      </div>

      {/* 필터바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, border: `1px solid ${C.line}`, borderRadius: 9, background: '#fff', padding: 2 }}>
          {([['all', '전체'], ['expense', '지출'], ['income', '수입'], ['transfer', '이체']] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              style={{ ...chip, background: filter === k ? C.tipInk : 'transparent', color: filter === k ? '#fff' : C.sub, fontWeight: filter === k ? 700 : 550 }}>
              {label}
            </button>
          ))}
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="카테고리 필터" style={control}>
          <option value="all">전체</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        </select>
        <select value={group} onChange={(e) => setGroup(e.target.value as 'date' | 'category')} aria-label="묶어 보기" style={control}>
          <option value="date">날짜별로 보기</option>
          <option value="category">카테고리별로 보기</option>
        </select>
        <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 7, height: 32, padding: '0 11px', border: `1px solid ${C.line}`, borderRadius: 9, background: '#fff' }}>
          <span style={{ fontSize: 11.5, color: C.muted3 }}>🔍</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="내역 검색" placeholder="메모·카테고리 검색"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: C.ink2 }} />
        </div>
        {onOpenImport && (
          <button type="button" onClick={onOpenImport} title="카드사·은행 내역을 통째로 붙여넣어 일괄 등록"
            style={{ ...control, display: 'flex', alignItems: 'center', gap: 5 }}>
            <ClipboardPaste style={{ width: 13, height: 13 }} /> 가져오기
          </button>
        )}
        <button type="button" onClick={resetFilters} style={{ ...control, color: C.sub }}>초기화</button>
      </div>

      {q && <p style={{ margin: 0, fontSize: 12, color: C.muted2 }}>"{query.trim()}" 검색 결과 {list.length}건 — 전체 기간에서 찾았어요</p>}

      {/* 벌크바 */}
      {sel.length > 0 && (
        /* 선택은 목록 아래에서 하는데 바가 위에 있으면 스크롤 후 손이 닿지 않는다 — 스티키로 따라다니게 */
        <div style={{ position: 'sticky', top: 8, zIndex: 15, display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '0 14px', borderRadius: 10, background: C.tipInk, color: '#fff', flexWrap: 'wrap', boxShadow: '0 6px 20px rgba(27,31,39,0.22)' }}>
          <span style={{ fontSize: 12.5, fontWeight: 650 }}>{sel.length}건 선택</span>
          <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.22)' }} />
          {([['카테고리 변경', bulkCategory, '#fff'], ['규칙으로 만들기', bulkRule, '#fff'], ['삭제', bulkDelete, '#FFD9D2']] as const).map(([t, fn, col]) => (
            <button key={t} type="button" onClick={fn}
              style={{ height: 28, padding: '0 11px', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 7, background: 'transparent', color: col, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{t}</button>
          ))}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>{KRW(selSum)}원</span>
          <button type="button" onClick={() => setSel([])}
            style={{ height: 28, padding: '0 10px', border: 'none', borderRadius: 7, background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>해제</button>
        </div>
      )}

      {/* 리스트 */}
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: C.card, overflow: 'hidden' }}>
        {groups.length === 0 ? (
          <div style={{ padding: '44px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>
              {q || filter !== 'all' || catFilter !== 'all' ? '조건에 맞는 내역이 없어요' : '이 달 기록이 없어요 — 아래 입력바에 "점심 김밥 4500"처럼 적어보세요'}
            </span>
            {(q || filter !== 'all' || catFilter !== 'all') && (
              <button type="button" onClick={resetFilters}
                style={{ height: 30, padding: '0 13px', border: `1px solid ${C.line}`, borderRadius: 8, background: '#fff', fontSize: 12.5, fontWeight: 600, color: C.ink3, cursor: 'pointer' }}>필터 초기화</button>
            )}
          </div>
        ) : groups.map((g) => {
          const gExpense = g.items.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
          return (
            <div key={g.key} ref={g.key === highlight ? focusRef : undefined}
              style={g.key === highlight ? { boxShadow: `inset 0 0 0 2px ${C.navy}` } : undefined}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 36, padding: '0 16px', background: C.head, borderTop: `1px solid ${C.lineFaint}`, borderBottom: `1px solid ${C.lineFaint}` }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.ink3 }}>{g.label}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: C.muted3 }}>{g.sub}</span>
                <span style={{ flex: 1 }} />
                {gExpense > 0 && <span style={{ fontSize: 12, fontWeight: 650, color: C.sub, fontVariantNumeric: 'tabular-nums' }}>지출 {KRW(gExpense)}원</span>}
              </div>
              {g.items.map((e) => {
                const on = sel.includes(e.id);
                const cat = meta.get(e.categoryId);
                return (
                  <div key={e.id} className="group"
                    style={{ display: 'flex', alignItems: 'center', gap: 11, padding: rowPad, borderBottom: `1px solid ${C.lineRow}` }}
                    onMouseEnter={(ev) => { ev.currentTarget.style.background = C.hover; }}
                    onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent'; }}>
                    <button type="button" role="checkbox" aria-checked={on} aria-label={`${e.memo || '내역'} 선택`} onClick={() => toggle(e.id)}
                      style={{ width: 16, height: 16, flex: '0 0 16px', border: `1.5px solid ${on ? C.navy : '#D6D2C8'}`, borderRadius: 4, background: on ? C.navy : 'transparent', color: '#fff', fontSize: 10, display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 }}>
                      {on ? '✓' : ''}
                    </button>
                    {/* 영수증을 붙였으면 카테고리 이모지 자리에 그 사진을 세운다 — 붙인 보람이 보이게 */}
                    {e.photo ? (
                      <img src={e.photo} alt="" loading="lazy"
                        style={{ width: 30, height: 30, flex: '0 0 30px', borderRadius: 9, objectFit: 'cover' }} />
                    ) : (
                      <span style={{ width: 30, height: 30, flex: '0 0 30px', borderRadius: 9, background: C.chipBg, display: 'grid', placeItems: 'center', fontSize: 14 }}>{cat?.emoji ?? '📎'}</span>
                    )}
                    <button type="button" onClick={() => onEdit(e.id)}
                      style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.memo || cat?.label || TYPE_META[e.type].label}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.sub2 }}>
                          {cat?.label}{e.method === 'card' ? ' · 카드' : e.method === 'cash' ? ' · 현금' : ''}
                          {e.groupTotal ? ` · 총 ${KRW(e.groupTotal)} 중 내 몫` : ''}
                        </span>
                        {fixedLabels.has(e.memo) && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: C.fixedInk, background: C.fixedBg, padding: '2px 5px', borderRadius: 4 }}>고정</span>
                        )}
                      </span>
                    </button>
                    <span className="hidden gap-1 group-hover:flex">
                      <button type="button" onClick={() => onEdit(e.id)}
                        style={{ height: 26, padding: '0 9px', border: `1px solid ${C.lineBtn}`, borderRadius: 7, background: '#fff', fontSize: 11.5, fontWeight: 600, color: C.sub, cursor: 'pointer' }}>수정</button>
                      <button type="button" title="오늘 날짜로 복제" onClick={() => { ledgerStore.duplicateEntry(e.id, todayKey()); toast.success('오늘로 복제했어요'); }}
                        style={{ height: 26, padding: '0 9px', border: `1px solid ${C.lineBtn}`, borderRadius: 7, background: '#fff', fontSize: 11.5, fontWeight: 600, color: C.sub, cursor: 'pointer' }}>복제</button>
                    </span>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: e.type === 'income' ? C.green : e.type === 'transfer' ? C.muted2 : C.ink, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em', minWidth: 104, textAlign: 'right' }}>
                      {TYPE_META[e.type].sign}{e.amount.toLocaleString('ko-KR')}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
