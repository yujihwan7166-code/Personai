/**
 * 건강기록 — 내 몸의 기록실 (/health).
 *
 * 좌: 캐논 사이드바(마크+제목+부제 · 이모지 내비 · 새 기록 add-row)
 * 우: 아카이브 마스트헤드(제목 + 실데이터 부제 + 우측 액션) + 뷰별 콘텐츠.
 * 뷰: 요약 · 진료 · 복약 · 수치 · 증상.
 *
 * 원칙: 게임화(점수·스트릭) 없음. AI는 비동기 요약(참고용, 진단 아님).
 * 데이터는 전부 localStorage(healthStore) — 내 기기에만.
 */
import { useMemo, useState } from 'react';
import {
  HeartPulse, Plus, Sparkles, Check, Trash2, Pill, Activity, CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHealth } from '@/hooks/useHealth';
import { healthStore, todayKey } from '@/services/healthStore';
import {
  METRIC_META, VITAL_METRICS, vitalStatus, SYMPTOM_PRESETS,
  type VitalMetric, type VitalReading,
} from '@/types/health';

type View = 'summary' | 'visits' | 'meds' | 'vitals' | 'symptoms';

const NAV: Array<{ id: View; label: string; emoji: string }> = [
  { id: 'summary',  label: '요약',  emoji: '📊' },
  { id: 'visits',   label: '진료',  emoji: '🩺' },
  { id: 'meds',     label: '복약',  emoji: '💊' },
  { id: 'vitals',   label: '수치',  emoji: '📈' },
  { id: 'symptoms', label: '증상',  emoji: '🌡️' },
];

const VIEW_TITLE: Record<View, string> = {
  summary: '건강 요약', visits: '진료 기록', meds: '복약 관리', vitals: '건강 수치', symptoms: '증상 일지',
};

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
const parseYmd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

// ── 미니 추이 라인 (SVG) ──
function TrendChart({ readings, color, height = 200, dots = true }: { readings: VitalReading[]; color: string; height?: number; dots?: boolean }) {
  const W = 680, H = height, PAD = 16;
  if (readings.length < 2) {
    return <div className="flex items-center justify-center py-10 text-[13px] text-muted-foreground">기록이 2개 이상이면 추이가 그려져요.</div>;
  }
  const vals = readings.map((r) => r.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i * (W - PAD * 2)) / (readings.length - 1);
  const y = (v: number) => PAD + (1 - (v - min) / span) * (H - PAD * 2);
  const line = readings.map((r, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(r.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(readings.length - 1).toFixed(1)} ${H - PAD} L${x(0).toFixed(1)} ${H - PAD} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1={PAD} y1={PAD + t * (H - PAD * 2)} x2={W - PAD} y2={PAD + t * (H - PAD * 2)} stroke="hsl(var(--hairline))" strokeWidth={1} />
        ))}
        <path d={area} fill={color} fillOpacity={0.1} />
        <path d={line} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {dots && readings.map((r, i) => <circle key={r.id} cx={x(i)} cy={y(r.value)} r={4} fill="hsl(var(--card))" stroke={color} strokeWidth={3} />)}
      </svg>
      <div className="mt-1 flex justify-between px-2">
        {readings.map((r) => { const d = parseYmd(r.date); return <span key={r.id} className="text-[11px] text-muted-foreground">{d.getMonth() + 1}/{d.getDate()}</span>; })}
      </div>
    </div>
  );
}

function Sparkline({ readings, color }: { readings: VitalReading[]; color: string }) {
  if (readings.length < 2) return <div className="h-[38px]" />;
  const W = 240, H = 38;
  const vals = readings.map((r) => r.value);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const x = (i: number) => (i * W) / (readings.length - 1);
  const y = (v: number) => 4 + (1 - (v - min) / span) * (H - 8);
  const line = readings.map((r, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(r.value).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
      <path d={`${line} L${W} ${H} L0 ${H} Z`} fill={color} fillOpacity={0.1} />
      <path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Health() {
  const { vitals, meds, visits, symptoms } = useHealth();
  const [view, setView] = useState<View>('summary');
  const [metric, setMetric] = useState<VitalMetric>('sugar');
  const today = todayKey();

  const readingsBy = useMemo(() => {
    const m = new Map<VitalMetric, VitalReading[]>();
    for (const mt of VITAL_METRICS) m.set(mt, vitals.filter((v) => v.metric === mt));
    return m;
  }, [vitals]);

  const activeMeds = meds.filter((m) => m.active);
  const takenToday = activeMeds.filter((m) => m.takenDates.includes(today)).length;

  const dday = (target: string) => Math.round((parseYmd(target).getTime() - parseYmd(today).getTime()) / 86400000);
  const nextVisit = useMemo(() => {
    const cands = visits.filter((v) => v.nextDate && v.nextDate >= today).sort((a, b) => a.nextDate!.localeCompare(b.nextDate!));
    return cands[0] ?? null;
  }, [visits, today]);

  /** 비동기 AI 자리 — 지금은 규칙 기반 요약 (진단 아님). */
  const briefing = useMemo(() => buildBriefing(readingsBy), [readingsBy]);

  const metricsWithData = VITAL_METRICS.filter((m) => (readingsBy.get(m)?.length ?? 0) > 0);

  const subtitle = view === 'summary'
    ? <>복용 중 {activeMeds.length} · 오늘 복약 {takenToday}/{activeMeds.length}{nextVisit && <> · 다음 진료 {ddayLabel(dday(nextVisit.nextDate!))}</>} · 내 기기에만 저장</>
    : view === 'visits' ? `진료 ${visits.length}건`
    : view === 'meds' ? `복용 중 ${activeMeds.length} · 오늘 ${takenToday}/${activeMeds.length}`
    : view === 'vitals' ? `${metricsWithData.length}개 지표 기록 중`
    : `증상 기록 ${symptoms.length}건`;

  const cur = readingsBy.get(metric) ?? [];
  const curMeta = METRIC_META[metric];

  return (
    <div className="health-theme flex h-dvh bg-background text-foreground">
      {/* ── 사이드바 ── */}
      <aside className="hidden w-[256px] shrink-0 flex-col overflow-y-auto border-r border-[hsl(var(--hairline))] bg-[hsl(var(--sidebar-background))] px-4 pb-5 pt-4 lg:flex">
        {/* 헤더 — 마크 + 제목 + 부제 락업 */}
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-[hsl(var(--health-green)/0.25)] bg-[hsl(var(--health-green)/0.12)] text-[hsl(var(--health-green))]">
            <HeartPulse className="h-6 w-6" strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[24px] font-extrabold leading-tight tracking-[0.01em] text-[hsl(var(--health-green))]">건강기록</h1>
            <p className="truncate text-[12.5px] leading-tight text-muted-foreground">내 몸의 기록실</p>
          </div>
        </div>

        <nav className="flex flex-col pt-0.5" aria-label="건강기록 섹션">
          {NAV.map((item) => {
            const active = view === item.id;
            const count = item.id === 'visits' ? visits.length : item.id === 'meds' ? activeMeds.length : item.id === 'symptoms' ? symptoms.length : 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13.5px] transition-colors',
                  active
                    ? 'bg-[hsl(var(--health-green))]/16 font-bold text-[hsl(var(--health-green))] ring-1 ring-inset ring-[hsl(var(--health-green))]/30'
                    : 'font-medium text-foreground/72 hover:bg-[hsl(var(--health-green))]/6',
                )}
              >
                <span aria-hidden className="w-[20px] shrink-0 text-center text-[16px] leading-none">{item.emoji}</span>
                <span className="flex-1">{item.label}</span>
                {count > 0 && <span className={cn('text-[12px] tabular-nums', active ? 'font-bold text-[hsl(var(--health-green))]/75' : 'text-muted-foreground/55')}>{count}</span>}
              </button>
            );
          })}
          {/* 새 기록 add-row */}
          <button
            type="button"
            onClick={() => setView('vitals')}
            className="mt-0.5 flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13.5px] font-medium text-muted-foreground/70 transition-colors hover:bg-[hsl(var(--health-green))]/6 hover:text-[hsl(var(--health-green))]"
          >
            <span aria-hidden className="flex w-[20px] shrink-0 items-center justify-center"><Plus className="h-4 w-4" /></span>
            <span className="flex-1">새 기록</span>
          </button>
        </nav>
      </aside>

      {/* ── 메인 ── */}
      <main className="min-w-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
        {/* 모바일 내비 */}
        <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
          {NAV.map((item) => (
            <button key={item.id} type="button" onClick={() => setView(item.id)}
              className={cn('flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-colors',
                view === item.id ? 'border-transparent bg-[hsl(var(--health-green))]/14 font-bold text-[hsl(var(--health-green))]' : 'border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] text-muted-foreground')}>
              <span aria-hidden>{item.emoji}</span> {item.label}
            </button>
          ))}
        </div>

        {/* 마스트헤드 (아카이브 양식) */}
        <div className="mb-5 flex flex-wrap items-start gap-x-4 gap-y-3">
          <div className="min-w-0">
            <h1 className="text-[24px] font-extrabold tracking-[-0.02em] text-foreground">{VIEW_TITLE[view]}</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setView('vitals')}
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_18px_-10px_hsl(var(--health-green)/0.7)] transition-[filter] hover:brightness-[1.05]"
            style={{ backgroundColor: 'hsl(var(--health-green))' }}
          >
            <Plus className="h-4 w-4" /> 새 기록
          </button>
        </div>

        {/* ── 요약 ── */}
        {view === 'summary' && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
              {/* 다음 진료 */}
              <div className="rounded-[20px] border border-[hsl(var(--health-green)/0.22)] bg-[hsl(var(--health-green)/0.07)] p-5">
                <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-[hsl(var(--health-green))]"><CalendarClock className="h-3.5 w-3.5" /> 다음 진료</div>
                {nextVisit ? (
                  <>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-[28px] font-extrabold leading-none text-[hsl(var(--health-green))]">{ddayLabel(dday(nextVisit.nextDate!))}</span>
                      <span className="text-[13px] text-muted-foreground">{fmtDate(nextVisit.nextDate!)}</span>
                    </div>
                    <div className="mt-1.5 text-[12.5px] text-foreground/70">{nextVisit.place}{nextVisit.dept && ` · ${nextVisit.dept}`}</div>
                  </>
                ) : (
                  <div className="mt-3 text-[13px] text-muted-foreground">예정된 진료가 없어요. 진료 기록에서 다음 예약을 남겨보세요.</div>
                )}
              </div>
              {/* AI 브리핑 */}
              <div className="relative overflow-hidden rounded-[20px] p-5 text-white" style={{ background: 'linear-gradient(125deg, hsl(var(--health-green)), hsl(152 46% 30%))' }}>
                <div className="flex items-center gap-2 text-[13.5px] font-bold"><Sparkles className="h-4 w-4" /> AI 요약</div>
                <p className="mt-2.5 text-[13.5px] leading-relaxed text-white/90">{briefing}</p>
                <p className="mt-3 text-[11px] text-white/65">참고용이에요 — 진단·처방이 아니며, 정확한 판단은 의료진과 상담하세요.</p>
              </div>
            </div>

            {/* 지표 스트립 */}
            {metricsWithData.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {metricsWithData.map((m) => {
                  const rs = readingsBy.get(m)!;
                  const last = rs[rs.length - 1];
                  const st = vitalStatus(m, last.value);
                  const meta = METRIC_META[m];
                  return (
                    <button key={m} type="button" onClick={() => { setMetric(m); setView('vitals'); }} className="rounded-[16px] border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4 text-left transition-shadow hover:shadow-[0_10px_24px_-16px_hsl(175_30%_20%/0.35)]">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px]">{meta.emoji}</span>
                        <span className="text-[12.5px] font-semibold text-foreground/75">{meta.label}</span>
                        <span className={cn('ml-auto rounded-full px-2 py-0.5 text-[10.5px] font-bold', st === 'normal' ? 'bg-[hsl(var(--health-green))]/12 text-[hsl(var(--health-green))]' : 'bg-amber-400/15 text-amber-600')}>{st === 'normal' ? '정상' : st === 'high' ? '높음' : '낮음'}</span>
                      </div>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-[24px] font-extrabold tabular-nums text-foreground">{last.value}</span>
                        <span className="text-[12px] text-muted-foreground">{meta.unit}</span>
                      </div>
                      <div className="mt-1"><Sparkline readings={rs.slice(-7)} color={meta.color} /></div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 오늘 복약 */}
            {activeMeds.length > 0 && (
              <div className="rounded-[18px] border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Pill className="h-4 w-4 text-[hsl(var(--health-green))]" />
                  <h3 className="text-[15px] font-extrabold text-foreground">오늘의 복약</h3>
                  <span className="rounded-full bg-[hsl(var(--health-green))]/12 px-2 py-0.5 text-[11.5px] font-bold text-[hsl(var(--health-green))]">{takenToday}/{activeMeds.length}</span>
                  <span className="ml-auto text-[12px] text-muted-foreground">탭하여 체크</span>
                </div>
                {activeMeds.map((m) => <MedRow key={m.id} name={m.name} sub={[m.dose, m.schedule].filter(Boolean).join(' · ')} taken={m.takenDates.includes(today)} onToggle={() => healthStore.toggleTaken(m.id)} />)}
              </div>
            )}
          </div>
        )}

        {/* ── 진료 ── */}
        {view === 'visits' && <VisitsView />}

        {/* ── 복약 ── */}
        {view === 'meds' && <MedsView />}

        {/* ── 수치 ── */}
        {view === 'vitals' && (
          <div className="flex flex-col gap-4">
            {/* 지표 선택 */}
            <div className="flex flex-wrap gap-2">
              {VITAL_METRICS.map((m) => (
                <button key={m} type="button" onClick={() => setMetric(m)}
                  className={cn('rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                    metric === m ? 'border-transparent text-white' : 'border-[hsl(var(--hairline))] bg-[hsl(var(--card))] text-muted-foreground hover:bg-[hsl(var(--accent))]')}
                  style={metric === m ? { backgroundColor: METRIC_META[m].color } : undefined}>
                  {METRIC_META[m].emoji} {METRIC_META[m].label}
                </button>
              ))}
            </div>
            {/* 추이 차트 */}
            <div className="rounded-[20px] border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-5 sm:p-6">
              <div className="flex items-baseline gap-2">
                <h3 className="text-[16px] font-extrabold text-foreground">{curMeta.label} 추이</h3>
                {cur.length > 0 && <><span className="text-[20px] font-extrabold tabular-nums" style={{ color: curMeta.color }}>{cur[cur.length - 1].value}</span><span className="text-[12px] text-muted-foreground">{curMeta.unit}</span></>}
                <span className="ml-auto text-[11.5px] text-muted-foreground">정상 {curMeta.normal[0]}~{curMeta.normal[1]}{curMeta.unit}</span>
              </div>
              <div className="mt-3"><TrendChart readings={cur.slice(-10)} color={curMeta.color} /></div>
            </div>
            <VitalAdd metric={metric} />
            {/* 최근 기록 */}
            {cur.length > 0 && (
              <div className="rounded-[18px] border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-5">
                <h3 className="mb-2 text-[14px] font-bold text-foreground/85">최근 {curMeta.label} 기록</h3>
                {[...cur].reverse().slice(0, 8).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 border-b border-[hsl(var(--hairline))]/60 py-2.5 last:border-0">
                    <span className="w-20 text-[12.5px] text-muted-foreground">{fmtDate(r.date)}</span>
                    <span className="text-[14px] font-bold tabular-nums text-foreground">{r.value} <span className="text-[11px] font-medium text-muted-foreground">{curMeta.unit}</span></span>
                    <button type="button" onClick={() => healthStore.removeVital(r.id)} className="ml-auto text-muted-foreground/50 hover:text-rose-500" aria-label="삭제"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 증상 ── */}
        {view === 'symptoms' && <SymptomsView />}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────
// 서브 뷰·컴포넌트
// ─────────────────────────────────────────────

function MedRow({ name, sub, taken, onToggle }: { name: string; sub: string; taken: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 border-b border-[hsl(var(--hairline))]/60 py-3 text-left last:border-0">
      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] border-2 transition-colors', taken ? 'border-[hsl(var(--health-green))] bg-[hsl(var(--health-green))] text-white' : 'border-[hsl(var(--hairline))]')}>
        {taken && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[14px] font-semibold', taken ? 'text-muted-foreground line-through' : 'text-foreground')}>{name}</span>
        {sub && <span className="block text-[11.5px] text-muted-foreground">{sub}</span>}
      </span>
    </button>
  );
}

function VitalAdd({ metric }: { metric: VitalMetric }) {
  const [value, setValue] = useState('');
  const [date, setDate] = useState(todayKey());
  const meta = METRIC_META[metric];
  const submit = () => {
    const num = parseFloat(value);
    if (!Number.isFinite(num)) return;
    healthStore.addVital({ metric, value: num, date });
    setValue('');
  };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[16px] border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))] p-3">
      <span className="px-1 text-[13px] font-semibold text-foreground/80">{meta.emoji} {meta.label} 입력</span>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-2.5 py-1.5 text-[13px] outline-none focus:border-[hsl(var(--health-green))]" />
      <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} placeholder={meta.unit} className="w-24 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-2.5 py-1.5 text-[13px] outline-none focus:border-[hsl(var(--health-green))]" />
      <button type="button" onClick={submit} className="rounded-lg px-3.5 py-1.5 text-[13px] font-bold text-white transition-[filter] hover:brightness-105" style={{ backgroundColor: 'hsl(var(--health-green))' }}>추가</button>
    </div>
  );
}

function MedsView() {
  const { meds } = useHealth();
  const active = meds.filter((m) => m.active);
  const today = todayKey();
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [schedule, setSchedule] = useState('');
  const add = () => { if (!name.trim()) return; healthStore.addMed({ name, dose, schedule }); setName(''); setDose(''); setSchedule(''); };
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[18px] border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-5">
        <div className="mb-2 flex items-center gap-2"><Pill className="h-4 w-4 text-[hsl(var(--health-green))]" /><h3 className="text-[15px] font-extrabold text-foreground">오늘의 복약</h3><span className="ml-auto text-[12px] text-muted-foreground">탭하여 체크</span></div>
        {active.length === 0 ? <p className="py-4 text-center text-[13px] text-muted-foreground">복용 중인 약이 없어요. 아래에서 추가하세요.</p>
          : active.map((m) => (
            <div key={m.id} className="flex items-center">
              <div className="min-w-0 flex-1"><MedRow name={m.name} sub={[m.dose, m.schedule].filter(Boolean).join(' · ')} taken={m.takenDates.includes(today)} onToggle={() => healthStore.toggleTaken(m.id)} /></div>
              <button type="button" onClick={() => healthStore.removeMed(m.id)} className="ml-2 shrink-0 text-muted-foreground/50 hover:text-rose-500" aria-label="약 삭제"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-[16px] border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))] p-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="약 이름" className="min-w-[120px] flex-1 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-2.5 py-1.5 text-[13px] outline-none focus:border-[hsl(var(--health-green))]" />
        <input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="용량 (1정)" className="w-24 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-2.5 py-1.5 text-[13px] outline-none focus:border-[hsl(var(--health-green))]" />
        <input value={schedule} onChange={(e) => setSchedule(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} placeholder="시점 (아침 식후)" className="w-32 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-2.5 py-1.5 text-[13px] outline-none focus:border-[hsl(var(--health-green))]" />
        <button type="button" onClick={add} className="rounded-lg px-3.5 py-1.5 text-[13px] font-bold text-white transition-[filter] hover:brightness-105" style={{ backgroundColor: 'hsl(var(--health-green))' }}>추가</button>
      </div>
    </div>
  );
}

function VisitsView() {
  const { visits } = useHealth();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ date: todayKey(), place: '', dept: '', reason: '', prescription: '', nextDate: '' });
  const add = () => { if (!f.place.trim()) return; healthStore.addVisit(f); setF({ date: todayKey(), place: '', dept: '', reason: '', prescription: '', nextDate: '' }); setOpen(false); };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const inputCls = 'rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-2.5 py-1.5 text-[13px] outline-none focus:border-[hsl(var(--health-green))]';
  return (
    <div className="flex flex-col gap-4">
      <div>
        <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-3.5 py-2 text-[13px] font-semibold text-foreground/80 hover:border-[hsl(var(--health-green))]/40"><Plus className="h-4 w-4" /> 진료 기록 추가</button>
      </div>
      {open && (
        <div className="flex flex-col gap-2 rounded-[16px] border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))] p-4">
          <div className="flex flex-wrap gap-2">
            <input type="date" value={f.date} onChange={set('date')} className={inputCls} />
            <input value={f.place} onChange={set('place')} placeholder="병원·기관" className={cn(inputCls, 'flex-1 min-w-[140px]')} />
            <input value={f.dept} onChange={set('dept')} placeholder="과 (내과)" className={cn(inputCls, 'w-28')} />
          </div>
          <input value={f.reason} onChange={set('reason')} placeholder="진단·사유" className={inputCls} />
          <input value={f.prescription} onChange={set('prescription')} placeholder="처방 (선택)" className={inputCls} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] text-muted-foreground">다음 예약</span>
            <input type="date" value={f.nextDate} onChange={set('nextDate')} className={inputCls} />
            <button type="button" onClick={add} className="ml-auto rounded-lg px-4 py-1.5 text-[13px] font-bold text-white" style={{ backgroundColor: 'hsl(var(--health-green))' }}>저장</button>
          </div>
        </div>
      )}
      {visits.length === 0 ? <p className="py-10 text-center text-[13px] text-muted-foreground">아직 진료 기록이 없어요.</p>
        : (
          <div className="flex flex-col gap-2.5">
            {visits.map((v) => { const d = parseYmd(v.date); return (
              <div key={v.id} className="flex gap-4 rounded-[16px] border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4">
                <div className="w-11 shrink-0 text-center">
                  <div className="text-[19px] font-extrabold leading-none tabular-nums text-foreground">{d.getDate()}</div>
                  <div className="mt-0.5 text-[10.5px] text-muted-foreground">{d.getMonth() + 1}월</div>
                  <div className="text-[10px] text-muted-foreground/70">{WEEKDAY[d.getDay()]}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-bold text-foreground">{v.place}{v.dept && <span className="text-muted-foreground"> · {v.dept}</span>}</div>
                  {v.reason && <div className="mt-0.5 text-[13px] text-foreground/75">{v.reason}</div>}
                  {v.prescription && <div className="mt-1 text-[12px] text-muted-foreground">💊 {v.prescription}</div>}
                  {v.nextDate && <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[hsl(var(--health-green))]/10 px-2 py-0.5 text-[11.5px] font-semibold text-[hsl(var(--health-green))]"><CalendarClock className="h-3 w-3" /> 다음 {fmtDate(v.nextDate)}</div>}
                </div>
                <button type="button" onClick={() => healthStore.removeVisit(v.id)} className="shrink-0 self-start text-muted-foreground/50 hover:text-rose-500" aria-label="삭제"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ); })}
          </div>
        )}
    </div>
  );
}

function SymptomsView() {
  const { symptoms } = useHealth();
  const [custom, setCustom] = useState('');
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[18px] border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-5">
        <h3 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-foreground"><Activity className="h-4 w-4 text-[hsl(var(--health-green))]" /> 지금 느끼는 증상을 기록하세요</h3>
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_PRESETS.map((c) => (
            <button key={c.label} type="button" onClick={() => healthStore.addSymptom({ label: c.label, emoji: c.emoji })}
              className="rounded-[10px] border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))] px-3.5 py-2 text-[13px] text-foreground/80 transition-colors hover:border-[hsl(var(--health-green))]/40 hover:bg-[hsl(var(--health-green))]/6">
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && custom.trim()) { healthStore.addSymptom({ label: custom, emoji: '📝' }); setCustom(''); } }} placeholder="직접 입력…" className="flex-1 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-3 py-2 text-[13px] outline-none focus:border-[hsl(var(--health-green))]" />
          <button type="button" onClick={() => { if (custom.trim()) { healthStore.addSymptom({ label: custom, emoji: '📝' }); setCustom(''); } }} className="rounded-lg px-3.5 py-2 text-[13px] font-bold text-white" style={{ backgroundColor: 'hsl(var(--health-green))' }}>추가</button>
        </div>
      </div>
      {symptoms.length === 0 ? <p className="py-8 text-center text-[13px] text-muted-foreground">아직 증상 기록이 없어요.</p>
        : (
          <div className="rounded-[18px] border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-5">
            <h3 className="mb-2 text-[14px] font-bold text-foreground/85">기록 타임라인</h3>
            {symptoms.map((s) => (
              <div key={s.id} className="flex items-center gap-3 border-b border-[hsl(var(--hairline))]/60 py-3 last:border-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[hsl(var(--surface-2))] text-[16px]">{s.emoji ?? '📝'}</span>
                <div className="min-w-0 flex-1"><div className="text-[14px] font-semibold text-foreground">{s.label}</div><div className="text-[11.5px] text-muted-foreground">{fmtDate(s.date)}</div></div>
                <button type="button" onClick={() => healthStore.removeSymptom(s.id)} className="text-[12px] text-muted-foreground/60 hover:text-rose-500">삭제</button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ── 헬퍼 ──
function ddayLabel(n: number): string {
  if (n === 0) return 'D-day';
  return n > 0 ? `D-${n}` : `D+${-n}`;
}
function fmtDate(ymd: string): string {
  const d = parseYmd(ymd);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`;
}
function buildBriefing(readingsBy: Map<VitalMetric, VitalReading[]>): string {
  const parts: string[] = [];
  const sugar = readingsBy.get('sugar') ?? [];
  if (sugar.length >= 3) {
    const first = sugar[0].value, last = sugar[sugar.length - 1].value;
    if (last < first) parts.push('최근 혈당이 안정되는 흐름이에요');
    else if (last > first) parts.push('최근 혈당이 조금 오르는 추세예요');
  }
  const sleep = readingsBy.get('sleep') ?? [];
  if (sleep.length >= 3) {
    const avg = sleep.reduce((s, r) => s + r.value, 0) / sleep.length;
    if (avg >= 7) parts.push(`평균 수면 ${avg.toFixed(1)}시간으로 충분한 편이에요`);
    else parts.push(`평균 수면이 ${avg.toFixed(1)}시간으로 다소 짧아요`);
  }
  const weight = readingsBy.get('weight') ?? [];
  if (weight.length >= 3) {
    const diff = weight[weight.length - 1].value - weight[0].value;
    if (Math.abs(diff) >= 0.5) parts.push(`체중이 ${diff > 0 ? '+' : ''}${diff.toFixed(1)}kg 변했어요`);
  }
  if (parts.length === 0) return '수치를 며칠 기록하면 이 자리에서 흐름을 요약해 드릴게요.';
  return parts.join(', ') + '.';
}
