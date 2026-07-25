/**
 * 되감기 (/rewind) — 라이트테이블 위의 필름.
 *
 * /today 가 "오늘"을 크로스룸으로 모으는 방이면, 여기는 그 거울상 — 같은 조립을 **과거** 축에 세운다.
 * 입력 위젯이 하나도 없고 아무것도 저장하지 않는다. 여섯 방(하루·일기·돈·몸·본 것·사람)이
 * 이미 쌓아둔 기록을 하루=한 칸으로 늘어놓고, 게이트에 걸린 날을 아래에 펼친다.
 *
 * 재질은 감으로 낸 "필름 느낌"이 아니라 실제 부품이다 —
 * 스프로킷 구멍 / 프레임 라인 / 게이트 / 엣지 코드 / 릴 카운터.
 * 색은 따뜻한 필름 베이스 ↔ 차가운 라이트테이블 빛의 대비 하나로 간다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRewindEvents } from '@/hooks/useRewind';
import { buildReel, reelRange, indexMonths, nextRecordedIndex } from '@/lib/rewind/reel';
import {
  REWIND_ROOMS,
  formatFullDate, formatEdgeCode, formatReelCounter, todayYmd,
  type RewindEvent,
} from '@/lib/rewind/types';

/** 필름 한 칸 — 35mm 처럼 가로가 긴 비율. */
const FRAME_W = 118;
const FRAME_H = 79;
const GAP = 6;
const PITCH = FRAME_W + GAP;

/** DOM 에 실제로 그리는 칸의 반경 — 릴이 몇 년치여도 노드 수가 일정하다. */
const RENDER_WINDOW = 60;
/** 사진을 실제로 인화하는 반경 — base64 인라인이라 이게 진짜 비용이다(한 장이 디코드 수 MB).
 * data: URI 는 loading="lazy" 가 거의 안 먹으므로 개수 자체를 조인다. */
const PHOTO_WINDOW = 6;
/** 이보다 멀리 뛰면 부드럽게 굴리지 않는다 — 애니메이션 내내 창이 수십 번 재조립된다. */
const FAR_JUMP = 40;

/* ── 게이트 아래 펼쳐진 하루의 한 줄 ── */
function EventRow({ e }: { e: RewindEvent }) {
  const meta = REWIND_ROOMS[e.room];
  return (
    <li className="flex items-baseline gap-3 py-[7px]">
      <span className="w-[42px] shrink-0 text-right font-[var(--rw-mono)] text-[11.5px] tabular-nums text-muted-foreground">
        {e.time ?? ''}
      </span>
      <span aria-hidden className="mt-[1px] h-[6px] w-[6px] shrink-0 self-center rounded-full" style={{ background: meta.dot }} />
      <span aria-hidden className="shrink-0 text-[13px] leading-none">{e.glyph}</span>
      <span className="min-w-0 flex-1 text-[14px] leading-[1.5]">{e.text}</span>
      {e.detail && (
        <span className="max-w-[38%] shrink-0 truncate text-[12.5px] text-muted-foreground">{e.detail}</span>
      )}
      <Link
        to={meta.to}
        className="shrink-0 text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {meta.label}
      </Link>
    </li>
  );
}

export default function Rewind() {
  const events = useRewindEvents();

  const range = useMemo(() => reelRange(events), [events]);
  const frames = useMemo(() => buildReel(events, range), [events, range]);
  const months = useMemo(() => indexMonths(frames), [frames]);
  /* 릴 구간 밖으로 잘린 기록은 세지 않는다 — 0칸짜리 화면에 "1,234개"라고 적히면 그건 거짓말이다. */
  const shown = useMemo(
    () => events.filter((e) => e.ymd >= range.from && e.ymd <= range.to),
    [events, range],
  );
  /** 밀도 막대의 기준 — 가장 빽빽했던 달. 1 이상으로 눌러 0 나누기를 막는다. */
  const maxMonth = useMemo(() => Math.max(1, ...months.map((m) => m.count)), [months]);

  const trackRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  /** 보고 있던 '날짜'. 릴이 다시 조립되면 인덱스는 통째로 밀리지만 날짜는 안 밀린다. */
  const anchorRef = useRef<string | null>(null);
  const movedRef = useRef(false);
  const dragRef = useRef<{ x: number; left: number } | null>(null);
  const settleRef = useRef<number | null>(null);
  const didInit = useRef(false);

  const [active, setActive] = useState(0);

  const last = frames.length - 1;
  const frame = frames[Math.min(active, Math.max(0, last))];
  const today = todayYmd();

  /* 오늘 칸. 릴 끝이 곧 오늘은 아니다 — 미래 날짜가 찍힌 기록(예약 진료·오타)이 있으면 릴이 더 길다. */
  const todayIndex = useMemo(() => {
    const i = frames.findIndex((f) => f.ymd === today);
    return i >= 0 ? i : frames.length - 1;
  }, [frames, today]);

  /* ── 릴 이동 ── */
  const jumpTo = useCallback((i: number, smooth = true) => {
    const el = trackRef.current;
    const n = frames.length;
    if (n === 0) return;
    const to = Math.max(0, Math.min(n - 1, i));
    const far = Math.abs(to - activeRef.current) > FAR_JUMP;
    activeRef.current = to;
    anchorRef.current = frames[to]?.ymd ?? null;
    setActive(to);
    el?.scrollTo({ left: to * PITCH, behavior: smooth && !far ? 'smooth' : 'auto' });
  }, [frames]);

  const step = useCallback((by: number) => { jumpTo(activeRef.current + by); }, [jumpTo]);

  const skipTo = useCallback((dir: 1 | -1) => {
    // activeRef 는 릴이 줄어도 안 조여지므로 여기서 한 번 묶는다 — 안 그러면 조용히 무반응.
    const cur = Math.min(activeRef.current, frames.length - 1);
    const i = nextRecordedIndex(frames, cur, dir);
    if (i !== null) jumpTo(i);
  }, [frames, jumpTo]);

  /* ── 스크롤 → 게이트에 걸린 칸 ── */
  const handleScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el || frames.length === 0) return;
    const i = Math.max(0, Math.min(frames.length - 1, Math.round(el.scrollLeft / PITCH)));
    if (i !== activeRef.current) {
      activeRef.current = i;
      anchorRef.current = frames[i]?.ymd ?? null;
      setActive(i);
    }

    // 휠·트랙패드로 흘러간 뒤 칸 한가운데로 정렬 — 필름이 게이트에 물리는 느낌.
    if (settleRef.current) window.clearTimeout(settleRef.current);
    settleRef.current = window.setTimeout(() => {
      if (dragRef.current) return;
      const el2 = trackRef.current;
      if (!el2) return;
      const target = activeRef.current * PITCH;
      if (Math.abs(el2.scrollLeft - target) > 1) el2.scrollTo({ left: target, behavior: 'smooth' });
    }, 150);
  }, [frames]);

  /* 세로 휠 → 가로 되감기. 트랙은 세로로 못 움직이고 브라우저가 deltaY 를 알아서
   * 가로로 바꿔주지도 않아서, 가로휠 없는 마우스에선 릴이 통째로 죽는다. */
  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // 가로 휠·트랙패드는 브라우저에 맡긴다
    el.scrollLeft += e.deltaY;
  }, []);

  /* ── 끌어서 되감기 ──
   * 마우스일 때만. 터치는 touch-action: pan-x 로 브라우저가 직접 밀게 둔다 —
   * 여기서 scrollLeft 까지 건드리면 손가락 한 번에 두 배로 움직인다.
   * setPointerCapture 는 쓰지 않는다: 캡처가 걸리면 click 이 캡처 요소로 리타깃돼
   * 칸을 눌러 그 날로 가는 길이 막힌다. 대신 window 에서 끌기를 따라간다. */
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    // movedRef 는 포인터 종류와 무관하게 매번 푼다 — 마우스로 끈 뒤 손가락으로 탭하면
    // true 가 남아 있어 칸 클릭이 통째로 죽는다(터치 노트북).
    movedRef.current = false;
    if (!el || e.button !== 0 || e.pointerType !== 'mouse') return;
    dragRef.current = { x: e.clientX, left: el.scrollLeft };
  }, []);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const el = trackRef.current;
      const d = dragRef.current;
      if (!el || !d) return;
      const dx = e.clientX - d.x;
      if (Math.abs(dx) > 3) movedRef.current = true;
      el.scrollLeft = d.left - dx;
    };
    const up = () => {
      const el = trackRef.current;
      if (!dragRef.current || !el) return;
      dragRef.current = null;
      jumpTo(Math.round(el.scrollLeft / PITCH));
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [jumpTo]);

  /* ── 첫 조립 뒤 오늘로 — 되감기는 '지금'에서 출발한다 ── */
  useEffect(() => {
    if (didInit.current || frames.length === 0) return;
    didInit.current = true;
    activeRef.current = todayIndex;
    anchorRef.current = frames[todayIndex]?.ymd ?? null;
    setActive(todayIndex);
    const el = trackRef.current;
    if (el) el.scrollLeft = todayIndex * PITCH;
  }, [frames, todayIndex]);

  /* ── 릴이 다시 조립되면 보던 날짜에 도로 물린다 ──
   * 다른 탭에서 옛 기록이 하나 생기면 range.from 이 앞으로 밀려 모든 인덱스가 시프트한다.
   * scrollLeft 는 그대로라 스크롤 이벤트도 안 나서, 아무 조작도 안 했는데 게이트가 딴 날로 미끄러진다. */
  useEffect(() => {
    if (!didInit.current || frames.length === 0) return;
    const want = anchorRef.current;
    const found = want ? frames.findIndex((f) => f.ymd === want) : -1;
    const i = found >= 0 ? found : Math.min(activeRef.current, frames.length - 1);
    if (i === activeRef.current) return;
    activeRef.current = i;
    anchorRef.current = frames[i]?.ymd ?? null;
    setActive(i);
    const el = trackRef.current;
    if (el) el.scrollLeft = i * PITCH;
  }, [frames]);

  /* ── 키보드 — 하루씩 / 한 달씩 / 오늘로 ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      // 레일 팝오버·모바일 더보기 메뉴가 열려 있으면 그쪽 키가 우선 — 릴이 가로채면 메뉴가 먹통이 된다.
      if (t?.closest('[role="menu"],[role="dialog"],[role="listbox"]')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(e.shiftKey ? -30 : -1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(e.shiftKey ? 30 : 1); }
      else if (e.key === 'Home') { e.preventDefault(); jumpTo(todayIndex); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, jumpTo, todayIndex]);

  useEffect(() => () => { if (settleRef.current) window.clearTimeout(settleRef.current); }, []);

  /* ── 그릴 구간 ──
   * 다른 탭에서 기록이 지워지면 릴이 줄어 active 가 끝을 넘어설 수 있다.
   * 그대로 두면 뒤쪽 스페이서가 음수 폭이 되므로 여기서 한 번 조인다. */
  const safeActive = Math.min(active, Math.max(0, last));
  const from = Math.max(0, safeActive - RENDER_WINDOW);
  const to = Math.min(last, safeActive + RENDER_WINDOW);
  const visible = frames.slice(from, to + 1);

  const activeMonth = frame?.ymd.slice(0, 7);
  const spanLabel = events.length > 0
    ? `${range.from.slice(0, 4)}년 ${Number(range.from.slice(5, 7))}월부터`
    : '아직 비어 있음';

  return (
    <div className="rewind-theme flex h-dvh bg-background text-foreground">
      {/* ── 사이드바 ── */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-[hsl(var(--hairline))] bg-[hsl(var(--sidebar-background))] px-4 pb-5 pt-4 lg:flex">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-[hsl(var(--rw-glow)/0.3)] bg-[hsl(var(--rw-glow)/0.12)] text-[hsl(var(--rw-glow))]">
            <Film className="h-6 w-6" strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold leading-tight">되감기</div>
            <div className="truncate text-[12px] text-muted-foreground">{spanLabel}</div>
          </div>
        </div>

        {/* 내비 = 릴의 달 — 되감기 방의 내비는 곧 시간이다 */}
        <div className="mb-1.5 px-2 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground">릴</div>
        <nav className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {months.map((m) => {
            const on = m.key === activeMonth;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => jumpTo(m.key === today.slice(0, 7) ? todayIndex : m.index)}
                className={cn(
                  'flex w-full items-baseline gap-2 rounded-lg px-2.5 py-[7px] text-left transition-colors',
                  on ? 'bg-[hsl(var(--rw-glow))] text-[hsl(var(--rw-on-glow))]' : 'hover:bg-[hsl(var(--surface-3))]',
                )}
              >
                <span className="flex-1 truncate font-[var(--rw-mono)] text-[12.5px] tabular-nums">{m.label}</span>
                <span className={cn('text-[11px] tabular-nums', on ? 'opacity-80' : 'text-muted-foreground')}>
                  {m.count || '—'}
                </span>
              </button>
            );
          })}
        </nav>

        {/* 지나온 달 — 방별 개수 목록을 걷어낸 자리.
            그 숫자들은 읽어도 할 일이 없었다(그래서 '필요 없다'). 되감기가 잘하는 건
            '시간을 훑는 것'이니, 어느 달에 삶이 빽빽했는지 보여주고 눌러서 바로 그리로 간다. */}
        {months.length > 0 && (
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto border-t border-[hsl(var(--hairline))] pt-3">
            <div className="mb-2 text-[11px] tracking-[0.08em] text-muted-foreground">지나온 달</div>
            <ul className="space-y-[3px]">
              {months.map((m) => {
                const here = frame?.ymd.slice(0, 7) === m.key;
                return (
                  <li key={m.key}>
                    <button
                      type="button"
                      onClick={() => jumpTo(m.index)}
                      title={`${m.label} — 기록 ${m.count}개`}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-1.5 py-[5px] text-left transition-colors',
                        here ? 'bg-[hsl(var(--rw-glow)/0.14)]' : 'hover:bg-[hsl(var(--surface-3))]',
                      )}
                    >
                      <span className={cn('w-[52px] shrink-0 font-[var(--rw-mono)] text-[11.5px] tabular-nums',
                        here ? 'text-[hsl(var(--rw-glow))]' : 'text-muted-foreground')}>
                        {m.label}
                      </span>
                      {/* 밀도 막대 — 그 달에 남긴 기록의 양 */}
                      <span aria-hidden className="h-[5px] min-w-0 flex-1 overflow-hidden rounded-full bg-[hsl(var(--hairline))]">
                        <span className="block h-full rounded-full"
                          style={{ width: `${Math.max(6, Math.round((m.count / maxMonth) * 100))}%`, background: 'hsl(var(--rw-glow))', opacity: here ? 1 : 0.5 }} />
                      </span>
                      <span className="w-6 shrink-0 text-right font-[var(--rw-mono)] text-[11px] tabular-nums text-muted-foreground">{m.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </aside>

      {/* ── 본문 ── */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* 마스트헤드 — 제목은 주어, 실데이터가 서술어 */}
        <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5 border-b border-[hsl(var(--hairline))] px-6 py-[18px] sm:px-8">
          <h1 className="m-0 text-[22px] font-semibold tracking-[-0.02em]">되감기</h1>
          <p className="m-0 min-w-0 flex-1 text-[13px] text-muted-foreground">
            {shown.length > 0
              ? <>여섯 방에 쌓인 기록 <b className="font-semibold text-foreground">{shown.length.toLocaleString('ko-KR')}개</b>를 {frames.length.toLocaleString('ko-KR')}일치 필름으로 감아 뒀어요</>
              : <>다른 방에 기록이 쌓이면 여기 필름이 채워져요</>}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => skipTo(-1)} title="이전 기록으로"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[hsl(var(--surface-3))] hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => jumpTo(todayIndex)} title="오늘로 (Home)"
              className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-[hsl(var(--surface-3))] hover:text-foreground">
              <RotateCcw className="h-3.5 w-3.5" /> 오늘
            </button>
            <button type="button" onClick={() => skipTo(1)} title="다음 기록으로"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[hsl(var(--surface-3))] hover:text-foreground">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* 릴은 기록이 0개여도 최소 31칸이 나온다. 빈 상태의 조건은 칸 수가 아니라 기록 수다. */}
        {shown.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-8 text-center">
            <div>
              <Film className="mx-auto h-9 w-9 text-muted-foreground" strokeWidth={1.4} />
              <p className="mt-3 text-[15px] font-medium">아직 되감을 게 없어요</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                하루·일기·돈·몸·본 것·사람 — 어느 방이든 기록이 생기면 여기 필름에 인화돼요.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ── 필름 릴 ── */}
            <section className="shrink-0 border-b border-[hsl(var(--hairline))] bg-[hsl(var(--rw-deck))] pb-4 pt-3">
              <div className="mb-2 flex items-baseline gap-3 px-6 sm:px-8">
                <span className="font-[var(--rw-mono)] text-[13px] tracking-[0.1em] text-[hsl(var(--rw-glow))]">
                  {frame ? formatReelCounter(frame.ymd) : ''}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground">
                  끌거나 휠로 되감기 · ←→ 하루 · Shift+←→ 한 달
                </span>
                <span className="font-[var(--rw-mono)] text-[11px] tabular-nums text-muted-foreground">
                  {safeActive + 1} / {frames.length}
                </span>
              </div>

              <div className="relative">
                <div
                  ref={trackRef}
                  onScroll={handleScroll}
                  onWheel={onWheel}
                  onPointerDown={onPointerDown}
                  className="rw-track"
                  style={{ paddingInline: `calc(50% - ${FRAME_W / 2}px)` }}
                >
                  <div className="rw-rail" style={{ height: FRAME_H + 26 }}>
                    <div style={{ flex: `0 0 ${from * PITCH}px` }} />
                    {visible.map((f, k) => {
                      const i = from + k;
                      const on = i === safeActive;
                      const near = Math.abs(i - safeActive) <= PHOTO_WINDOW;
                      const label = formatFullDate(f.ymd); // 칸당 한 번만 — 드래그 중엔 초당 수천 번 불린다
                      return (
                        <button
                          key={f.ymd}
                          type="button"
                          onClick={() => { if (!movedRef.current) jumpTo(i); }}
                          className={cn('rw-frame', on && 'rw-frame-on', f.events.length === 0 && 'rw-frame-empty')}
                          style={{ flex: `0 0 ${FRAME_W}px`, height: FRAME_H, marginRight: GAP }}
                          aria-current={on ? 'true' : undefined}
                          aria-label={`${label} — 기록 ${f.events.length}개`}
                          title={label}
                        >
                          {f.photo && near ? (
                            <img src={f.photo} alt="" loading="lazy" draggable={false} className="rw-photo" />
                          ) : f.caption ? (
                            <span className="rw-cap">{f.caption}</span>
                          ) : null}
                          {f.rooms.length > 0 && (
                            <span className="rw-dots">
                              {f.rooms.map((r) => (
                                <i key={r} style={{ background: REWIND_ROOMS[r].dot }} />
                              ))}
                            </span>
                          )}
                          <span className="rw-edge">{formatEdgeCode(f.ymd)}</span>
                        </button>
                      );
                    })}
                    <div style={{ flex: `0 0 ${(last - to) * PITCH}px` }} />
                  </div>
                </div>

                {/* 게이트 — 여기 걸린 칸만 빛을 받는다 */}
                <div aria-hidden className="rw-vignette" />
                <div aria-hidden className="rw-gate" style={{ width: FRAME_W + 10, height: FRAME_H + 10 }} />
              </div>
            </section>

            {/* ── 게이트 아래 — 펼쳐진 하루 ──
                날짜가 넘어갈 때마다 아래 내용이 툭 갈아치워져 '필름을 돌린다'는 느낌이 끊겼다.
                key 에 날짜를 물려 칸이 바뀔 때마다 한 번 인화되듯 떠오르게 한다. */}
            <section className="min-h-0 flex-1 overflow-y-auto px-6 pb-14 pt-6 sm:px-8">
              {frame && (
                <div key={frame.ymd} className="rw-develop">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="m-0 text-[19px] font-semibold tracking-[-0.01em]">{formatFullDate(frame.ymd)}</h2>
                    <span className="font-[var(--rw-mono)] text-[12px] tabular-nums text-muted-foreground">{frame.ymd}</span>
                    {frame.ymd === today && (
                      <span className="rounded-full bg-[hsl(var(--rw-glow)/0.16)] px-2 py-[2px] text-[11px] text-[hsl(var(--rw-glow))]">오늘</span>
                    )}
                  </div>

                  {frame.events.length === 0 ? (
                    <div className="mt-8 border-l-2 border-[hsl(var(--hairline))] py-1 pl-4">
                      <p className="m-0 text-[14px] text-muted-foreground">이 날은 비어 있어요.</p>
                      <button type="button" onClick={() => skipTo(-1)}
                        className="mt-2 text-[13px] text-[hsl(var(--rw-glow))] underline-offset-4 hover:underline">
                        기록이 있는 가장 가까운 날로 ←
                      </button>
                    </div>
                  ) : (
                    <ul className="mt-4 divide-y divide-[hsl(var(--hairline))]">
                      {frame.events.map((e) => <EventRow key={e.id} e={e} />)}
                    </ul>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
