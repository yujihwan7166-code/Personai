/**
 * 오늘 챙길 것 — 인맥노트의 홈.
 * 오랜만이에요(친밀도별 안부 주기 초과) + 다가오는 경조사(D-day) + 최근 기록.
 */
import { useMemo } from 'react';
import { notify } from '@/lib/notify';
import { peopleStore } from '@/services/peopleStore';
import { Avatar } from '@/components/people/PersonsView';
import { computeOverdue } from '@/lib/people/overdue';
import { todayKey } from '@/types/travel';
import { INTERACTION_META, nextOccurrence, type Interaction, type Person } from '@/types/people';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

export function TodayView({
  persons, interactions, onOpenPerson,
}: {
  persons: Person[];
  interactions: Interaction[];
  onOpenPerson: (id: string) => void;
}) {
  const today = todayKey();
  const td = new Date(`${today}T00:00:00`);

  const overdue = useMemo(() => computeOverdue(persons, interactions, today), [persons, interactions, today]);

  /** 다가오는 경조사 — 45일 이내. */
  const upcoming = useMemo(() => {
    const out: Array<{ person: Person; label: string; date: string; dday: number }> = [];
    for (const p of persons) {
      if (p.birthday) {
        const n = nextOccurrence(p.birthday, today);
        if (n.dday <= 45) out.push({ person: p, label: '생일', ...n });
      }
      for (const a of p.annivs) {
        const n = nextOccurrence(a.monthDay, today);
        if (n.dday <= 45) out.push({ person: p, label: a.label, ...n });
      }
    }
    return out.sort((a, b) => a.dday - b.dday).slice(0, 6);
  }, [persons, today]);

  const recent = useMemo(() => {
    const nameOf = new Map(persons.map((p) => [p.id, p.name]));
    return interactions
      .filter((x) => x.kind !== 'ping' && x.note)
      .slice(0, 5)
      .map((x) => ({ ...x, name: nameOf.get(x.personId) ?? '?' }));
  }, [interactions, persons]);

  const sendPing = (p: Person) => {
    const added = peopleStore.addInteraction({ personId: p.id, kind: 'ping', note: '안부 남김' });
    if (added) {
      // 오클릭 한 번이 안부 알림을 몇 달간 무음 처리하므로 되돌리기 필수
      notify.success(`${p.name}님에게 안부를 남긴 것으로 기록했어요`, {
        duration: 5000,
        action: { label: '되돌리기', onClick: () => peopleStore.removeInteraction(added.id) },
      });
    }
  };

  if (persons.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))]/60 py-16 text-center">
        <p className="text-[15px] font-bold">소중한 사람들을 기록해 보세요</p>
        <p className="mx-auto mt-1.5 max-w-[360px] text-[12.5px] leading-relaxed text-muted-foreground">
          이름·생일·좋아하는 것을 적어두면 챙길 타이밍(오랜 연락 공백, 다가오는 경조사)을 여기서 알려드려요.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* 오늘 요약 한 줄 — 날짜 + 지금 기다리는 챙김의 양 */}
      <p className="mb-4 text-[12.5px] text-muted-foreground">
        {td.getFullYear()}년 {td.getMonth() + 1}월 {td.getDate()}일 {WEEKDAY[td.getDay()]}요일
        {(overdue.length > 0 || upcoming.length > 0) && (
          <span className="ml-2 font-semibold text-foreground/75">
            — {overdue.length > 0 && <>안부 <b className="text-[hsl(var(--people-accent))]">{overdue.length}</b></>}
            {overdue.length > 0 && upcoming.length > 0 && ' · '}
            {upcoming.length > 0 && <>경조사 <b className="text-[hsl(var(--people-accent))]">{upcoming.length}</b>건</>}
            이 기다려요
          </span>
        )}
      </p>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* 오랜만이에요 */}
        <section>
          <div className="mb-2 flex items-center gap-2 px-1">
            <h3 className="text-[14px] font-bold text-foreground/85">오랜만이에요</h3>
            {overdue.length > 0 && (
              <span className="text-[11px] font-bold text-[hsl(var(--people-accent))]">안부 권유 {overdue.length}</span>
            )}
          </div>
          {overdue.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))]/60 py-8 text-center text-[12px] text-muted-foreground">
              모두와 잘 연락하고 있어요 👍
            </p>
          ) : (
            <div className="space-y-2">
              {overdue.length > 4 && (
                <p className="px-1 text-[11px] text-muted-foreground/70">가장 오래된 4명부터 — 외 {overdue.length - 4}명</p>
              )}
              {overdue.slice(0, 4).map(({ person: p, months }) => (
                <div key={p.id} className="rounded-2xl border border-[hsl(var(--foreground)/0.09)] bg-[hsl(var(--surface-1))] p-3 shadow-[0_2px_10px_-4px_hsl(var(--foreground)/0.12)]">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={p.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold">{p.name}</p>
                      <p className="truncate text-[11.5px] text-muted-foreground">
                        {months}개월 넘게 연락 안 함{p.intro ? ` · ${p.intro}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => sendPing(p)}
                      className="flex-1 rounded-lg bg-[hsl(var(--people-accent))]/10 py-1.5 text-[12px] font-bold text-[hsl(var(--people-accent))] transition-colors hover:bg-[hsl(var(--people-accent))]/18"
                    >
                      안부 남기기
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenPerson(p.id)}
                      className="rounded-lg border border-[hsl(var(--hairline))] px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      카드 보기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-5">
          {/* 다가오는 경조사 */}
          <section>
            <h3 className="mb-2 px-1 text-[14px] font-bold text-foreground/85">다가오는 경조사</h3>
            {upcoming.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))]/60 py-8 text-center text-[12px] text-muted-foreground">
                45일 안엔 챙길 경조사가 없어요.
              </p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[hsl(var(--foreground)/0.09)] bg-[hsl(var(--surface-1))] shadow-[0_2px_10px_-4px_hsl(var(--foreground)/0.12)]">
                {upcoming.map((u, i) => {
                  const d = new Date(`${u.date}T00:00:00`);
                  return (
                    <button
                      key={`${u.person.id}-${u.label}-${u.date}`}
                      type="button"
                      onClick={() => onOpenPerson(u.person.id)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[hsl(var(--surface-2))] ${i > 0 ? 'border-t border-[hsl(var(--hairline))]/60' : ''}`}
                    >
                      <span className="w-[40px] shrink-0 text-center">
                        <span className="block text-[9.5px] font-semibold text-muted-foreground">{d.getMonth() + 1}월</span>
                        <span className="block text-[17px] font-extrabold leading-tight tabular-nums">{d.getDate()}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold">{u.person.name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {u.label}
                          {/* 선물 힌트 — 기억해둔 취향이 D-day 순간에 되살아난다 */}
                          {u.person.likes.length > 0 && (
                            <span className="text-[hsl(150_38%_34%)]"> · 좋아함: {u.person.likes.slice(0, 3).join(', ')}</span>
                          )}
                        </span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${u.dday <= 3 ? 'bg-[hsl(var(--people-accent))] text-[hsl(var(--people-accent-ink))]' : 'bg-[hsl(var(--people-accent))]/10 text-[hsl(var(--people-accent))]'}`}>
                        {u.dday === 0 ? 'D-DAY' : `D-${u.dday}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* 최근 기록 */}
          {recent.length > 0 && (
            <section>
              <h3 className="mb-2 px-1 text-[14px] font-bold text-foreground/85">최근 기록</h3>
              <ul className="space-y-2.5">
                {recent.map((x) => (
                  <li key={x.id} className="border-l-2 pl-3" style={{ borderColor: INTERACTION_META[x.kind].tint }}>
                    <p className="text-[11px] text-muted-foreground">
                      <button type="button" onClick={() => onOpenPerson(x.personId)} className="font-bold text-foreground/80 hover:text-[hsl(var(--people-accent))]">{x.name}</button>
                      {' · '}{INTERACTION_META[x.kind].label} · {x.date.slice(2).replaceAll('-', '.')}
                    </p>
                    <p className="mt-0.5 break-keep text-[12.5px] leading-relaxed text-foreground/85">{x.note}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
