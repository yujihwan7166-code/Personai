/**
 * 캘린더 — 한 달을 크게 펼쳐 놓고 하루를 들여다보는 화면.
 *
 * 대시보드의 '지출 캘린더'는 요약 카드라 칸이 작고 금액만 찍힌다. 여기서는 달력이 주인공이라
 * 칸 안에 그날 무엇을 샀는지까지 들어가고, 날을 고르면 오른쪽에 그날 내역이 통째로 펼쳐진다.
 *
 * 함께 보는 것들: 이 달 요약 · 요일별 씀씀이 · 무지출 연속.
 * 새 입력은 없다 — 기록은 채팅바·상세창에서, 여기는 보는 곳(수정은 내역을 눌러서).
 */
import { useMemo, useState } from 'react';
import type { LedgerData } from '@/hooks/useLedger';
import { todayKey } from '@/services/ledgerStore';
import { monthOf, shiftMonth } from '@/lib/ledger/stats';
import { C, KRW } from './theme';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export function CalendarView({ data, onEdit }: { data: LedgerData; onEdit: (id: string) => void }) {
  const { entries, categories } = data;
  const today = todayKey();
  const [month, setMonth] = useState(() => monthOf(today));
  const [selDay, setSelDay] = useState<string | null>(today.startsWith(monthOf(today)) ? today : null);

  const meta = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const [yy, mm] = month.split('-').map(Number);
  const daysInMonth = new Date(yy, mm, 0).getDate();
  const firstDow = new Date(yy, mm - 1, 1).getDay();
  const isCurrent = month === monthOf(today);

  /** 이 달 지출을 날짜별로 — 금액 합계와 항목 목록을 함께 든다. */
  const byDay = useMemo(() => {
    const m = new Map<string, { total: number; items: typeof entries }>();
    for (const e of entries) {
      if (!e.date.startsWith(month) || e.type !== 'expense') continue;
      const g = m.get(e.date);
      if (g) { g.total += e.amount; g.items.push(e); }
      else m.set(e.date, { total: e.amount, items: [e] });
    }
    return m;
  }, [entries, month]);

  const monthTotal = useMemo(() => [...byDay.values()].reduce((s, g) => s + g.total, 0), [byDay]);
  const spentDays = byDay.size;
  const maxDay = useMemo(() => Math.max(1, ...[...byDay.values()].map((g) => g.total)), [byDay]);

  /** 요일별 씀씀이 — '무슨 요일에 지갑이 열리나'는 달력만 봐선 안 보인다. */
  const byDow = useMemo(() => {
    const out = Array(7).fill(0) as number[];
    for (const [date, g] of byDay) out[new Date(`${date}T00:00:00`).getDay()] += g.total;
    return out;
  }, [byDay]);
  const maxDow = Math.max(1, ...byDow);

  /** 지금까지 이어진 무지출 — 압박이 아니라 사실 한 줄. */
  const noSpendStreak = useMemo(() => {
    if (!isCurrent) return 0;
    let n = 0;
    for (let d = new Date(`${today}T00:00:00`); ; d.setDate(d.getDate() - 1)) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!k.startsWith(month) || byDay.has(k)) break;
      n += 1;
      if (n > 60) break;
    }
    return n;
  }, [byDay, isCurrent, today, month]);

  const cells: Array<number | null> = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const sel = selDay ? byDay.get(selDay) : undefined;
  const card: React.CSSProperties = {
    border: `1px solid ${C.line}`, borderRadius: 14, background: C.card,
  };
  const navBtn: React.CSSProperties = {
    width: 27, height: 27, border: 'none', background: 'transparent',
    fontSize: 14, color: C.sub, cursor: 'pointer', display: 'grid', placeItems: 'center',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 머리 — 대시보드·내역과 같은 월 이동 문법 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {mm}월
            <span style={{ marginLeft: 7, fontSize: 13, fontWeight: 600, color: C.muted2, letterSpacing: 0 }}>{yy}</span>
          </h1>
          <span style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${C.line}`, borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
            <button type="button" aria-label="이전 달" onClick={() => { setMonth(shiftMonth(month, -1)); setSelDay(null); }} style={navBtn}>‹</button>
            <span aria-hidden style={{ width: 1, height: 15, background: C.line }} />
            <button type="button" aria-label="다음 달" onClick={() => { setMonth(shiftMonth(month, 1)); setSelDay(null); }} style={navBtn}>›</button>
          </span>
          {!isCurrent && (
            <button type="button" onClick={() => { setMonth(monthOf(today)); setSelDay(today); }}
              style={{ height: 26, padding: '0 9px', border: `1px solid ${C.line}`, borderRadius: 7, background: '#fff', fontSize: 11.5, fontWeight: 600, color: C.sub, cursor: 'pointer' }}>
              이번 달
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{KRW(monthTotal)}</span>
          <span style={{ fontSize: 13, fontWeight: 650, color: C.ink4 }}>원 씀</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.75fr_1fr]" style={{ gap: 14 }}>
        {/* 달력 — 칸 안에 금액과 산 것까지 */}
        <div style={{ ...card, padding: '16px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {WEEK.map((d, i) => (
              <div key={d} style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', paddingBottom: 5, color: i === 0 ? C.red : i === 6 ? C.navyMid : C.muted2 }}>{d}</div>
            ))}
            {cells.map((d, i) => {
              if (d === null) return <span key={`b${i}`} />;
              const key = `${month}-${String(d).padStart(2, '0')}`;
              const g = byDay.get(key);
              const isToday = key === today;
              const on = key === selDay;
              return (
                <button
                  key={key} type="button" onClick={() => setSelDay(on ? null : key)}
                  style={{
                    minHeight: 92, borderRadius: 9, cursor: 'pointer', textAlign: 'left', padding: '6px 7px',
                    display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden',
                    border: `1px solid ${on ? C.navy : g ? C.line : 'transparent'}`,
                    background: on ? C.navSel : g ? C.cardAlt : 'transparent',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      display: 'grid', placeItems: 'center', minWidth: 19, height: 19, borderRadius: 999,
                      fontSize: 11.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                      background: isToday ? C.navy : 'transparent', color: isToday ? '#fff' : C.ink3,
                    }}>{d}</span>
                    {g && (
                      <span style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, color: C.ink4, fontVariantNumeric: 'tabular-nums' }}>
                        {Math.round(g.total / 1000)}k
                      </span>
                    )}
                  </span>
                  {/* 무엇을 샀는지 — 금액만 찍힌 칸은 '얼마 썼나'만 알려주고 '왜'는 못 알려준다 */}
                  {g?.items.slice(0, 2).map((e) => (
                    <span key={e.id} style={{
                      fontSize: 10, lineHeight: 1.25, color: C.sub2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {meta.get(e.categoryId)?.emoji ?? '📎'} {e.memo || meta.get(e.categoryId)?.label || ''}
                    </span>
                  ))}
                  {g && g.items.length > 2 && (
                    <span style={{ fontSize: 9.5, color: C.muted3 }}>외 {g.items.length - 2}건</span>
                  )}
                  {/* 그 달 최고 지출 대비 막대 — 어느 날이 무거웠는지 눈으로 */}
                  {g && (
                    <span aria-hidden style={{ marginTop: 'auto', height: 3, borderRadius: 999, background: C.track, overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${Math.round((g.total / maxDay) * 100)}%`, background: C.navy, borderRadius: 999 }} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 오른쪽 — 고른 날 + 함께 보면 좋은 것 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 220 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                {selDay ? `${Number(selDay.slice(8, 10))}일 ${WEEK[new Date(`${selDay}T00:00:00`).getDay()]}요일` : '날짜를 고르면'}
              </span>
              {sel && <span style={{ fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{KRW(sel.total)}원</span>}
            </div>
            {!selDay ? (
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.65, color: C.muted2 }}>
                그날 쓴 내역이 여기 펼쳐져요.<br />달력에서 하루를 눌러보세요.
              </p>
            ) : !sel ? (
              <p style={{ margin: 0, fontSize: 12.5, color: C.muted2 }}>이 날은 쓴 게 없어요.</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
                {sel.items.map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => onEdit(e.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 4px',
                        border: 'none', borderTop: `1px solid ${C.lineFaint ?? C.line}`, background: 'transparent',
                        cursor: 'pointer', textAlign: 'left',
                      }}>
                      {e.photo ? (
                        <img src={e.photo} alt="" style={{ width: 26, height: 26, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <span style={{ width: 26, height: 26, borderRadius: 8, background: C.chipBg, display: 'grid', placeItems: 'center', fontSize: 13, flexShrink: 0 }}>
                          {meta.get(e.categoryId)?.emoji ?? '📎'}
                        </span>
                      )}
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.memo || meta.get(e.categoryId)?.label || '지출'}
                        </span>
                        <span style={{ display: 'block', fontSize: 11, color: C.sub2 }}>{meta.get(e.categoryId)?.label}</span>
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>-{KRW(e.amount)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 요일별 씀씀이 — 달력만 봐선 '무슨 요일에 지갑이 열리나'가 안 보인다 */}
          <div style={{ ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>요일별</span>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 78 }}>
              {byDow.map((v, i) => (
                <span key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <span style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                    <span title={`${WEEK[i]}요일 ${KRW(v)}원`} style={{
                      width: '100%', height: `${Math.max(3, Math.round((v / maxDow) * 100))}%`,
                      borderRadius: 5, background: v > 0 ? C.navy : C.track, opacity: v > 0 ? 1 : 0.6,
                    }} />
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: i === 0 ? C.red : i === 6 ? C.navyMid : C.muted2 }}>{WEEK[i]}</span>
                </span>
              ))}
            </div>
          </div>

          {/* 이 달 한 줄 — 죄책감 없이 사실만 */}
          <div style={{ ...card, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: C.sub }}>
            <span>쓴 날 <b style={{ color: C.ink3 }}>{spentDays}일</b> · 안 쓴 날 <b style={{ color: C.ink3 }}>{daysInMonth - spentDays}일</b></span>
            {spentDays > 0 && <span>하루 평균 <b style={{ color: C.ink3 }}>{KRW(Math.round(monthTotal / spentDays))}원</b> (쓴 날 기준)</span>}
            {noSpendStreak > 0 && <span>오늘까지 <b style={{ color: C.ink3 }}>{noSpendStreak}일</b> 안 썼어요</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
