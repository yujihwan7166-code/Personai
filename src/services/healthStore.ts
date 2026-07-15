/**
 * 건강기록 영속 store — LocalStorage 기반 (archiveStore 패턴).
 *
 * - vanilla 모듈 싱글턴, 변경 시 HEALTH_CHANGED broadcast → 훅 자동 re-render
 * - 4개 컬렉션: vitals(수치) · meds(복약) · visits(진료) · symptoms(증상)
 * - 전부 내 기기(localStorage)에만. 게임화(점수·스트릭) 없음.
 */
import {
  HEALTH_CHANGED,
  type HealthMed,
  type HealthSymptom,
  type HealthVisit,
  type VitalMetric,
  type VitalReading,
  VITAL_METRICS,
} from '@/types/health';
import { newId } from '@/lib/idGenerator';

const VITALS_KEY = 'health.vitals.v1';
const MEDS_KEY = 'health.meds.v1';
const VISITS_KEY = 'health.visits.v1';
const SYMPTOMS_KEY = 'health.symptoms.v1';
const SEED_FLAG_KEY = 'health.seeded.v1';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const nowIso = () => new Date().toISOString();
const optText = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const isYmd = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** 로컬 YMD (toISOString 금지 — KST 하루 밀림 방지). */
const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayKey = (): string => ymd(new Date());

const normVital = (v: unknown, i: number): VitalReading | null => {
  if (!isRecord(v)) return null;
  const metric = VITAL_METRICS.includes(v.metric as VitalMetric) ? (v.metric as VitalMetric) : null;
  const value = num(v.value);
  if (!metric || value === null || !isYmd(v.date)) return null;
  return {
    id: typeof v.id === 'string' && v.id ? v.id : `hv_${i}`,
    metric,
    date: v.date,
    value,
    note: optText(v.note),
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : nowIso(),
  };
};

const normMed = (v: unknown, i: number): HealthMed | null => {
  if (!isRecord(v)) return null;
  const name = typeof v.name === 'string' ? v.name.trim() : '';
  if (!name) return null;
  return {
    id: typeof v.id === 'string' && v.id ? v.id : `hm_${i}`,
    name,
    dose: optText(v.dose),
    schedule: optText(v.schedule),
    active: v.active !== false,
    takenDates: Array.isArray(v.takenDates) ? v.takenDates.filter(isYmd) : [],
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : nowIso(),
  };
};

const normVisit = (v: unknown, i: number): HealthVisit | null => {
  if (!isRecord(v)) return null;
  if (!isYmd(v.date)) return null;
  const place = typeof v.place === 'string' ? v.place.trim() : '';
  return {
    id: typeof v.id === 'string' && v.id ? v.id : `hvi_${i}`,
    date: v.date,
    place: place || '병원',
    dept: optText(v.dept),
    reason: optText(v.reason),
    prescription: optText(v.prescription),
    nextDate: isYmd(v.nextDate) ? v.nextDate : undefined,
    note: optText(v.note),
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : nowIso(),
  };
};

const normSymptom = (v: unknown, i: number): HealthSymptom | null => {
  if (!isRecord(v)) return null;
  const label = typeof v.label === 'string' ? v.label.trim() : '';
  if (!label || !isYmd(v.date)) return null;
  return {
    id: typeof v.id === 'string' && v.id ? v.id : `hs_${i}`,
    date: v.date,
    label,
    emoji: optText(v.emoji),
    severity: num(v.severity) ?? undefined,
    note: optText(v.note),
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : nowIso(),
  };
};

function read<T>(key: string, norm: (v: unknown, i: number) => T | null): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(norm).filter((e): e is T => e !== null) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, arr: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(arr));
    window.dispatchEvent(new CustomEvent(HEALTH_CHANGED));
  } catch (err) {
    console.error('건강기록 저장 실패', err);
  }
}

const readVitals = () => read(VITALS_KEY, normVital);
const readMeds = () => read(MEDS_KEY, normMed);
const readVisits = () => read(VISITS_KEY, normVisit);
const readSymptoms = () => read(SYMPTOMS_KEY, normSymptom);

export interface AddVitalInput { metric: VitalMetric; value: number; date?: string; note?: string }
export interface AddMedInput { name: string; dose?: string; schedule?: string }
export interface AddVisitInput { date: string; place: string; dept?: string; reason?: string; prescription?: string; nextDate?: string; note?: string }
export interface AddSymptomInput { label: string; emoji?: string; date?: string; severity?: number; note?: string }

export const healthStore = {
  /** 최초 1회 예시 데이터 시드 (빈 상태일 때만). */
  ensureSeeded(): void {
    if (typeof window === 'undefined') return;
    try {
      if (window.localStorage.getItem(SEED_FLAG_KEY)) return;
    } catch {
      return;
    }
    const base = new Date();
    const daysAgo = (n: number) => { const d = new Date(base); d.setDate(d.getDate() - n); return ymd(d); };
    const daysAhead = (n: number) => { const d = new Date(base); d.setDate(d.getDate() + n); return ymd(d); };

    if (!readVitals().length) {
      const seedVitals: VitalReading[] = [];
      const series: Array<[VitalMetric, number[]]> = [
        ['weight', [69.2, 69.0, 68.7, 68.9, 68.4, 68.2, 68.1]],
        ['sugar', [128, 122, 130, 118, 115, 112, 108]],
        ['sleep', [6.2, 5.8, 7.0, 6.9, 7.2, 7.1, 7.3]],
        ['systolic', [128, 131, 126, 129, 124, 122, 121]],
      ];
      for (const [metric, vals] of series) {
        vals.forEach((value, i) => {
          seedVitals.push({ id: newId('hv'), metric, date: daysAgo(6 - i), value, createdAt: nowIso() });
        });
      }
      write(VITALS_KEY, seedVitals);
    }
    if (!readMeds().length) {
      const seedMeds: HealthMed[] = [
        { id: newId('hm'), name: '오메가3', dose: '1캡슐', schedule: '아침 식후', active: true, takenDates: [todayKey()], createdAt: nowIso() },
        { id: newId('hm'), name: '비타민 D', dose: '1정', schedule: '점심 식후', active: true, takenDates: [], createdAt: nowIso() },
        { id: newId('hm'), name: '혈압약', dose: '1정', schedule: '아침', active: true, takenDates: [todayKey()], createdAt: nowIso() },
      ];
      write(MEDS_KEY, seedMeds);
    }
    if (!readVisits().length) {
      const seedVisits: HealthVisit[] = [
        { id: newId('hvi'), date: daysAgo(17), place: '서울내과의원', dept: '내과', reason: '감기 몸살', prescription: '해열제·진해거담제 5일분', nextDate: daysAhead(5), createdAt: nowIso() },
        { id: newId('hvi'), date: daysAgo(63), place: '든든치과', dept: '치과', reason: '스케일링', note: '6개월 뒤 재방문 권장', createdAt: nowIso() },
      ];
      write(VISITS_KEY, seedVisits);
    }
    try {
      window.localStorage.setItem(SEED_FLAG_KEY, '1');
    } catch {
      /* noop */
    }
  },

  // ── 수치 ──
  listVitals(): VitalReading[] {
    return [...readVitals()].sort((a, b) => a.date.localeCompare(b.date));
  },
  addVital(input: AddVitalInput): VitalReading {
    const v: VitalReading = {
      id: newId('hv'),
      metric: input.metric,
      value: input.value,
      date: isYmd(input.date) ? input.date : todayKey(),
      note: input.note?.trim() || undefined,
      createdAt: nowIso(),
    };
    write(VITALS_KEY, [...readVitals(), v]);
    return v;
  },
  removeVital(id: string): void {
    write(VITALS_KEY, readVitals().filter((v) => v.id !== id));
  },

  // ── 복약 ──
  listMeds(): HealthMed[] {
    return [...readMeds()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  addMed(input: AddMedInput): HealthMed {
    const m: HealthMed = {
      id: newId('hm'),
      name: input.name.trim() || '새 약',
      dose: input.dose?.trim() || undefined,
      schedule: input.schedule?.trim() || undefined,
      active: true,
      takenDates: [],
      createdAt: nowIso(),
    };
    write(MEDS_KEY, [...readMeds(), m]);
    return m;
  },
  updateMed(id: string, patch: Partial<Omit<HealthMed, 'id' | 'createdAt'>>): void {
    const all = readMeds();
    const idx = all.findIndex((m) => m.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch };
    write(MEDS_KEY, all);
  },
  /** 특정 날짜 복용 체크 토글 (기본 오늘). */
  toggleTaken(id: string, date = todayKey()): void {
    const all = readMeds();
    const idx = all.findIndex((m) => m.id === id);
    if (idx === -1) return;
    const has = all[idx].takenDates.includes(date);
    all[idx] = {
      ...all[idx],
      takenDates: has ? all[idx].takenDates.filter((d) => d !== date) : [...all[idx].takenDates, date],
    };
    write(MEDS_KEY, all);
  },
  removeMed(id: string): void {
    write(MEDS_KEY, readMeds().filter((m) => m.id !== id));
  },

  // ── 진료 ──
  listVisits(): HealthVisit[] {
    return [...readVisits()].sort((a, b) => b.date.localeCompare(a.date));
  },
  addVisit(input: AddVisitInput): HealthVisit {
    const v: HealthVisit = {
      id: newId('hvi'),
      date: isYmd(input.date) ? input.date : todayKey(),
      place: input.place.trim() || '병원',
      dept: input.dept?.trim() || undefined,
      reason: input.reason?.trim() || undefined,
      prescription: input.prescription?.trim() || undefined,
      nextDate: isYmd(input.nextDate) ? input.nextDate : undefined,
      note: input.note?.trim() || undefined,
      createdAt: nowIso(),
    };
    write(VISITS_KEY, [...readVisits(), v]);
    return v;
  },
  updateVisit(id: string, patch: Partial<Omit<HealthVisit, 'id' | 'createdAt'>>): void {
    const all = readVisits();
    const idx = all.findIndex((v) => v.id === id);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch };
    write(VISITS_KEY, all);
  },
  removeVisit(id: string): void {
    write(VISITS_KEY, readVisits().filter((v) => v.id !== id));
  },

  // ── 증상 ──
  listSymptoms(): HealthSymptom[] {
    return [...readSymptoms()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  addSymptom(input: AddSymptomInput): HealthSymptom {
    const s: HealthSymptom = {
      id: newId('hs'),
      date: isYmd(input.date) ? input.date : todayKey(),
      label: input.label.trim() || '증상',
      emoji: input.emoji,
      severity: input.severity,
      note: input.note?.trim() || undefined,
      createdAt: nowIso(),
    };
    write(SYMPTOMS_KEY, [...readSymptoms(), s]);
    return s;
  },
  removeSymptom(id: string): void {
    write(SYMPTOMS_KEY, readSymptoms().filter((s) => s.id !== id));
  },

  clear(): void {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(SEED_FLAG_KEY);
      } catch {
        /* noop */
      }
    }
    write(VITALS_KEY, []);
    write(MEDS_KEY, []);
    write(VISITS_KEY, []);
    write(SYMPTOMS_KEY, []);
  },
};
