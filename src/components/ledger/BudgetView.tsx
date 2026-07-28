/**
 * 예산 — 시안 Ledger.dc.html '예산' 화면에서 출발해 버킷을 사용자 정의로 열었다.
 *
 * 분업: 배분 카드는 **비율**만, 버킷 카드는 **금액**만 말한다.
 * (예전엔 둘 다 둘 다 말해서 같은 사실이 화면에 두 번 있었다 — 사실 하나당 자리 하나)
 * 배분 막대 2단(계획/실제) + 버킷마다 한 장(색칩 · 진행바 · 사실 한 줄 · 입력 · 평균 채우기).
 */
import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { LedgerData } from '@/hooks/useLedger';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { budgetBasis, bucketSpent, monthOf } from '@/lib/ledger/stats';
import type { BudgetBucket } from '@/types/ledger';
import { C, KRW, parseAmount } from './theme';
import { notify } from '@/lib/notify';

/** 배분 막대 색 — 버킷 수가 정해져 있지 않으므로 순서대로 돌려 쓴다. */
const ALLOC_RING = [C.navy, C.navyMid, C.navyPale, '#7C8AA6', '#A9B4C6', '#5C6B86'];

/** 요약 숫자 한 칸 — 이름 위, 금액 아래. 셋이 나란히 서야 크기가 서로를 설명한다. */
function Figure({ label, value, tone, big }: { label: string; value: number; tone: string; big?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, paddingRight: 4 }}>
      <span style={{ fontSize: 11.5, fontWeight: 650, color: C.muted2 }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontSize: big ? 30 : 20, fontWeight: 700, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums', color: tone, lineHeight: 1.1 }}>
          {KRW(value)}
        </span>
        <span style={{ fontSize: big ? 14 : 12, fontWeight: 650, color: tone, opacity: 0.7 }}>원</span>
      </span>
    </div>
  );
}

export function BudgetView({ data }: { data: LedgerData }) {
  const { entries, budgets, categories, buckets } = data;
  const BUCKETS = useMemo(() => buckets.map((b) => b.id), [buckets]);
  const labelOf = useMemo(() => new Map(buckets.map((b) => [b.id, b.label])), [buckets]);
  const colorOf = (b: BudgetBucket) => ALLOC_RING[Math.max(0, BUCKETS.indexOf(b)) % ALLOC_RING.length];

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [catFor, setCatFor] = useState<string | null>(null); // 카테고리 고르는 중인 버킷

  // 버킷이 늘거나 예산이 바뀌면 입력 초안을 맞춘다
  useEffect(() => {
    setDraft(Object.fromEntries(buckets.map((b) => [b.id, budgets[b.id] ? KRW(budgets[b.id]) : ''])));
  }, [buckets, budgets]);

  const today = todayKey();
  const month = monthOf(today);
  const spent = bucketSpent(entries, month, categories, BUCKETS);
  const [yy, mm] = month.split('-').map(Number);
  const daysInMonth = new Date(yy, mm, 0).getDate();
  const dayOfMonth = Number(today.slice(8, 10));
  const leftDays = Math.max(1, daysInMonth - dayOfMonth + 1);
  const monthPct = Math.round((dayOfMonth / daysInMonth) * 100);

  const basis = useMemo(() => budgetBasis(entries, month, categories, 3, BUCKETS), [entries, month, categories, BUCKETS]);

  const commit = (next: Record<string, string>) => {
    const num = (s: string) => { const n = parseAmount(s ?? ''); return n && n > 0 ? n : undefined; };
    ledgerStore.setBudgets(Object.fromEntries(BUCKETS.map((b) => [b, num(next[b])])));
  };
  const setValue = (b: BudgetBucket, v: number) => {
    const next = { ...draft, [b]: KRW(Math.max(0, Math.round(v))) };
    setDraft(next); commit(next);
  };

  const planned = BUCKETS.reduce((s, b) => s + (budgets[b] ?? 0), 0);
  const spentAll = BUCKETS.reduce((s, b) => s + (spent[b] ?? 0), 0);
  const pctOf = (b: BudgetBucket) => (planned > 0 ? Math.round(((budgets[b] ?? 0) / planned) * 100) : 0);
  const afterBudget = basis.avgIncome - planned;

  /* 전체 진행 — 버킷마다 있던 막대를 합친 것이 아니라, 여기서만 답할 수 있는 질문
     ('이 속도로 가면 되나')을 답한다. 기준선은 오늘까지 지난 날 비율. */
  const usedPct = planned > 0 ? Math.round((spentAll / planned) * 100) : 0;
  const remainAll = planned - spentAll;
  const dailyAll = Math.floor(Math.max(0, remainAll) / leftDays / 100) * 100;
  const paceGap = Math.round(spentAll - (planned * dayOfMonth) / daysInMonth); // +면 계획보다 빨리 쓰는 중
  const paceShown = Math.round(Math.abs(paceGap) / 100) * 100;

  const smallBtn: React.CSSProperties = {
    height: 28, border: `1px solid ${C.line}`, borderRadius: 7, background: '#fff',
    fontSize: 11, fontWeight: 600, color: C.ink4, cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em' }}>예산</h1>
          {/* '예산 N개'는 카드를 세면 나오는 수라 서술어 자리를 낭비했다 — 실데이터로 교체 */}
          {planned <= 0 ? (
            <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 500 }}>아직 잡아둔 예산 없음</div>
          ) : basis.avgIncome > 0 ? (
            <div style={{ fontSize: 12.5, color: C.muted, fontWeight: 500 }}>
              수입 {KRW(basis.avgIncome)}원의 {Math.round((planned / basis.avgIncome) * 100)}%
            </div>
          ) : null}
        </div>
        {/* 총액은 머리에서 내려보냈다 — 쓴 돈·남은 돈과 나란히 놓여야 비교가 되고,
            그 셋이 바로 아래 막대의 눈금이 된다. 머리에 혼자 떠 있을 땐 아무 것과도
            견줄 수 없는 숫자였다. */}
      </div>

      {/* 이번 달 요약 — 카드 제목이 없다.
          '배분'이라는 머리가 붙어 있었는데, 이 카드가 하는 말의 대부분은 배분이
          아니라 총액·진행이고 배분은 맨 아랫줄 한 줄이다. 제목이 내용과 어긋나면
          제목이 길잡이가 아니라 소음이 된다. 방 이름(예산)은 이미 머리에 있다.
          '수입 기록 없음'도 걷었다 — 있지도 않은 것에 대한 안내라 자리만 먹었고,
          수입이 있을 때의 출처 표시는 실제로 쓰이는 자리(맨 아래)로 내려보냈다. */}
      <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: C.card, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 13 }}>
        {/* ① 숫자 셋 — 예산 · 쓴 돈 · 남은 예산. 아래 막대의 눈금이 되는 값들이라
            베이스라인을 맞춰 한 줄로 세운다. 예전엔 셋째 칸에만 설명이 한 줄 더
            달려 줄이 들쭉날쭉했다 — 그 문장은 막대 밑 캡션으로 내려보냈다. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '10px 32px' }}>
          <Figure label="이번 달 예산" value={planned} big tone={C.ink} />
          <Figure label="쓴 돈" value={spentAll} tone={C.ink3} />
          <Figure
            label={remainAll >= 0 ? '남은 예산' : '예산 초과'}
            value={Math.abs(remainAll)}
            tone={remainAll >= 0 ? C.green : C.red}
          />
        </div>

        {/* ② 전체 진행 — 여기서만 답할 수 있는 질문('이 속도면 되나')을 답한다.
            버킷 카드의 막대는 항목 하나씩이라 합쳐 본 적이 없었다.
            눈금(오늘)이 채운 길이보다 오른쪽에 있으면 여유, 왼쪽이면 과속. */}
        {planned > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingTop: 2 }}>
            <div style={{ position: 'relative', height: 14, borderRadius: 999, background: C.track, overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', inset: '0 auto 0 0', width: `${Math.min(100, usedPct)}%`,
                background: remainAll < 0 ? C.red : `linear-gradient(90deg, ${C.navyMid}, ${C.navy})`, borderRadius: 999,
              }} />
              {/* 오늘까지 지난 날 비율 — 이 자리까지 썼으면 딱 맞는 속도 */}
              <div title={`오늘 ${dayOfMonth}일 (${monthPct}%)`} style={{
                position: 'absolute', top: -1, bottom: -1, left: `${monthPct}%`, width: 2,
                background: C.ink, opacity: 0.5,
              }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontSize: 11.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {/* '예산의 N% 씀'은 바로 위 막대가 길이로 말한 것과 같은 말이라 뺐다.
                  대신 남은 예산 아래에 매달려 줄을 흐트러뜨리던 하루치를 여기 붙인다. */}
              <span style={{ color: C.muted2 }}>
                {daysInMonth - dayOfMonth}일 남음
                {remainAll > 0 && dailyAll >= 100 ? ` · 하루 ${KRW(dailyAll)}원씩` : ''}
              </span>
              {/* 속도 배지 — 금액이 아니라 '기준선과 얼마나 떨어져 있나' 라는 새 사실 */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 9px', borderRadius: 999,
                background: paceGap > 0 ? C.warnBg : C.okBg,
                border: `1px solid ${paceGap > 0 ? 'transparent' : C.okLine}`,
                color: paceGap > 0 ? C.warnInk : C.okInk,
              }}>
                <span aria-hidden style={{ width: 5, height: 5, borderRadius: 999, background: paceGap > 0 ? C.warnDot : C.greenDot }} />
                {paceShown < 100
                  ? '계획한 속도 그대로'
                  : paceGap > 0 ? `이 시점 계획보다 ${KRW(paceShown)}원 앞섬` : `이 시점 계획보다 ${KRW(paceShown)}원 여유`}
              </span>
            </div>
          </div>
        )}

        {/* ③ 항목 배분 — 막대 대신 글자로. 띠를 두 줄(계획/실제) 깔았더니 위 진행 막대까지
            작대기가 셋이 되어 어디를 봐야 할지 정해지지 않았다. 비중은 굳이 그림이
            아니어도 되는 사실이고(숫자가 더 정확하다), 실제 쓴 비중은 아래 버킷 카드가
            항목마다 이미 막대로 말한다. 색↔이름 짝짓기도 여기서 함께 해결된다. */}
        {planned > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 14px', paddingTop: 10, borderTop: `1px solid ${C.lineFaint}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted2 }}>배분</span>
            {BUCKETS.map((b) => (
              <span key={b} title={`${labelOf.get(b) ?? b} ${KRW(budgets[b] ?? 0)}원`}
                style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, fontSize: 11.5, fontWeight: 600, color: C.ink4 }}>
                <span aria-hidden style={{ width: 7, height: 7, borderRadius: 2, background: colorOf(b), alignSelf: 'center' }} />
                {labelOf.get(b) ?? b}
                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: C.muted }}>{pctOf(b)}%</span>
              </span>
            ))}
          </div>
        )}

        {basis.avgIncome > 0 && (
          /* '남은 예산'(예산−쓴돈)과 헷갈리지 않게 이름을 바꿨다 — 이건 수입에서
             예산으로 떼지 않고 남긴 몫이다.
             기준 출처(최근 N달 평균)는 카드 머리가 아니라 여기 붙인다 — 그 숫자를
             쓰는 유일한 문장이 이 문장이라서. */
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 7, paddingTop: 10, borderTop: `1px solid ${C.lineFaint}` }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.muted2 }}>최근 {basis.monthsWithData}달 평균 수입 기준</span>
            <span style={{ fontSize: 12, fontWeight: 650, color: afterBudget >= 0 ? C.green : C.red }}>
              {afterBudget >= 0 ? `예산에 안 넣은 수입 ${KRW(afterBudget)}원` : `수입보다 ${KRW(-afterBudget)}원 많이 잡음`}
            </span>
          </div>
        )}
      </div>

      {/* 버킷별 카드 */}
      {BUCKETS.map((b) => {
        const limit = budgets[b] ?? 0;
        const used = spent[b] ?? 0;
        const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
        const over = limit > 0 && used > limit;
        const remain = limit - used;
        /* 표시 단위가 100원 절사라 100원 미만은 구조적으로 '하루 0원'만 나온다 — 그럴 땐 아예 안 적는다 */
        const daily = Math.floor(Math.max(0, remain) / leftDays / 100) * 100;
        const avg = basis.monthsWithData > 0 ? Math.round((basis.perBucket[b]?.avg ?? 0) / 1000) * 1000 : 0;
        return (
          <div key={b} className="flex-col sm:flex-row"
            style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: C.card, padding: '18px 20px', display: 'flex', gap: 22, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                {/* 배분 막대에서 이사 온 색칩 — 목록을 지워도 색↔이름 매핑이 남는다 */}
                <span aria-hidden style={{ width: 7, height: 7, borderRadius: 2, background: colorOf(b), alignSelf: 'center', flexShrink: 0 }} />
                <span style={{ fontSize: 15.5, fontWeight: 700 }}>{labelOf.get(b) ?? b}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: C.muted2 }}>
                  {categories.filter((c) => c.bucket === b).map((c) => c.label).join(' · ') || '아직 붙은 카테고리 없음'}
                </span>
                <button type="button" onClick={() => setCatFor(catFor === b ? null : b)}
                  style={{ ...smallBtn, height: 22, padding: '0 8px', fontSize: 10.5 }}>
                  카테고리
                </button>
                {!buckets.find((x) => x.id === b)?.builtin && (
                  <button type="button" title="이 예산 삭제" aria-label={`${labelOf.get(b)} 삭제`}
                    /* 확인창이 실제 동작과 달랐다 — 예산액이 함께 지워지는 걸 언급하지 않았고,
                       카테고리가 '변동비로' 간다고 했지만 실제로는 각자 원래 버킷으로 돌아간다
                       (기본 카테고리는 DEFAULT_CATEGORIES 의 버킷으로 — '구독'은 고정비다). */
                    onClick={() => {
                      const name = labelOf.get(b) ?? b;
                      const catCount = categories.filter((c) => c.bucket === b).length;
                      const pinned = entries.filter((e) => e.bucketId === b).length;
                      const lines = [`'${name}' 예산을 지울까요?`, ''];
                      if (limit > 0) lines.push(`잡아둔 예산 ${KRW(limit)}원이 사라집니다.`);
                      if (catCount > 0) lines.push(`붙어 있던 카테고리 ${catCount}개는 원래 예산으로 돌아갑니다.`);
                      if (pinned > 0) lines.push(`건별로 이 예산에 넣어둔 ${pinned}건은 지정이 풀립니다.`);
                      if (!window.confirm(lines.join('\n'))) return;
                      const undo = ledgerStore.removeBucket(b);
                      if (!undo) return;
                      notify.success(`'${name}' 예산을 지웠어요`, {
                        action: { label: '되돌리기', onClick: () => ledgerStore.restoreBucket(undo) },
                      });
                    }}
                    style={{ ...smallBtn, height: 22, width: 24, padding: 0, color: C.red, display: 'grid', placeItems: 'center' }}>
                    <Trash2 style={{ width: 11, height: 11 }} />
                  </button>
                )}
              </div>

              {/* 어떤 카테고리를 이 예산으로 셀지 — 누르면 그 자리에서 옮겨 붙는다 */}
              {catFor === b && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '8px 10px', borderRadius: 10, background: C.cardAlt, border: `1px solid ${C.line}` }}>
                  {categories.map((c) => {
                    const on = c.bucket === b;
                    return (
                      <button key={c.id} type="button" onClick={() => ledgerStore.setCategoryBucket(c.id, b)}
                        style={{
                          height: 28, padding: '0 9px', borderRadius: 999, cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
                          border: `1px solid ${on ? 'transparent' : C.line}`,
                          background: on ? C.navy : '#fff', color: on ? '#fff' : C.ink4,
                        }}>
                        {c.emoji} {c.label}
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => setCatFor(null)} aria-label="닫기"
                    style={{ ...smallBtn, height: 26, width: 26, padding: 0, display: 'grid', placeItems: 'center' }}>
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ position: 'relative', height: 8, borderRadius: 999, background: C.track, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${Math.min(100, pct)}%`, background: over ? C.red : C.navy, borderRadius: 999 }} />
                  <div title={`오늘 ${dayOfMonth}일`} style={{ position: 'absolute', top: -2, bottom: -2, left: `${monthPct}%`, width: 1.5, background: '#C0BCB1' }} />
                </div>
                {/* 한 줄에 네 사실(사용액·%·잔액·하루치)을 욱여넣다 둘이 거짓말을 했다 —
                    초과인데 '하루 0원', 예산 미설정인데 '-50,000원 남음'.
                    막대가 '얼마나 찼나'를 말하니 숫자는 상태에 따라 하나만 말한다. */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ color: C.ink3 }}>{KRW(used)}원 사용</span>
                  <span style={{ color: over ? C.red : C.muted }}>
                    {limit <= 0
                      ? '예산 미설정'
                      : over
                        ? `${KRW(used - limit)}원 초과 · ${pct}%`
                        : `${KRW(remain)}원 남음${daily >= 100 ? ` · 하루 ${KRW(daily)}원` : ''}`}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, padding: '0 14px', border: `1px solid ${C.lineInput}`, borderRadius: 10, background: C.cardAlt }}>
                {/* type=number 였다 — 화면에서 유일하게 콤마가 없었고, 포커스 상태로 스크롤하면
                    휠이 값을 바꿔버렸다. 자릿수 콤마는 방 관례(내역·자산과 동일). */}
                {/* 숫자만 받던 칸이었다 — '50만' 을 치면 글자가 씹혀 505 가 됐다.
                    치는 동안은 그대로 두고(만·천을 칠 수 있게), 칸을 벗어날 때 읽어
                    콤마 찍은 숫자로 바꾼다. */}
                <input
                  inputMode="numeric" value={draft[b] ?? ''} aria-label={`${labelOf.get(b) ?? b} 월 예산`}
                  placeholder="0 · '50만' 도 돼요"
                  onChange={(e) => {
                    const v = e.target.value.slice(0, 16);
                    setDraft((d) => ({ ...d, [b]: v }));
                  }}
                  onBlur={() => {
                    const n = parseAmount(draft[b] ?? '');
                    const next = { ...draft, [b]: n === null ? '' : KRW(n) };
                    setDraft(next); commit(next);
                  }}
                  style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 19, fontWeight: 700, textAlign: 'right', color: C.ink, fontVariantNumeric: 'tabular-nums' }}
                />
                <span style={{ fontSize: 13, fontWeight: 650, color: C.muted }}>원</span>
              </div>
              {/* 버튼 셋 중 둘이 죽어 있었다 — '+5%'는 근거 없는 임의 증분이고,
                  '천원'은 avg 가 이미 1000단위로 반올림돼 주 경로에서 아무 일도 안 했다.
                  '지난달'이라는 이름도 거짓 — 실제로는 기록 있는 최근 N달 평균이다.
                  (flex:1 은 절대 두지 말 것 — 부모가 column 이라 높이가 2px 로 붕괴한다) */}
              <button type="button" disabled={avg <= 0} onClick={() => setValue(b, avg)}
                title="당월 제외 · 기록이 있는 달만 세서 낸 평균"
                style={{ ...smallBtn, opacity: avg > 0 ? 1 : 0.45, cursor: avg > 0 ? 'pointer' : 'default' }}>
                {avg > 0 ? `최근 ${basis.monthsWithData}달 평균 ${KRW(avg)}원` : '평균 낼 기록 없음'}
              </button>
            </div>
          </div>
        );
      })}

      {/* 새 예산 — 고정비·변동비·비정기 셋으로 안 나눠지는 돈이 있다(유흥비·자기계발·반려동물…) */}
      {adding ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', border: `1px solid ${C.line}`, borderRadius: 14, background: C.card, padding: '14px 18px' }}>
          <input
            autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) { if (newName.trim()) ledgerStore.addBucket(newName, ''); setNewName(''); setAdding(false); }
              else if (e.key === 'Escape') { setNewName(''); setAdding(false); }
            }}
            placeholder="예산 이름 (예: 유흥비)"
            style={{ flex: 1, minWidth: 0, height: 36, padding: '0 12px', border: `1px solid ${C.lineInput}`, borderRadius: 9, background: C.cardAlt, fontSize: 13.5, color: C.ink, outline: 'none' }}
          />
          <button type="button" onClick={() => { if (newName.trim()) ledgerStore.addBucket(newName, ''); setNewName(''); setAdding(false); }}
            style={{ height: 36, padding: '0 16px', border: 'none', borderRadius: 9, background: C.navy, color: '#fff', fontSize: 13, fontWeight: 650, cursor: 'pointer' }}>
            만들기
          </button>
          <button type="button" onClick={() => { setNewName(''); setAdding(false); }}
            style={{ ...smallBtn, height: 36, padding: '0 12px' }}>취소</button>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            border: `1px dashed ${C.line}`, borderRadius: 14, background: 'transparent',
            padding: '14px 18px', fontSize: 13, fontWeight: 650, color: C.muted, cursor: 'pointer',
          }}>
          <Plus style={{ width: 14, height: 14 }} /> 새 예산 만들기
        </button>
      )}
    </div>
  );
}
