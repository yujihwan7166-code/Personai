/**
 * 스펙 보드 — /career ("교정 중인 원고" 컨셉).
 *
 * 종이 위 잉크: 카드·그림자·그라데이션 없이 괘선과 서체로만 위계를 세운다.
 *   문장 = 명조(career-serif), 장부 숫자·캡션 = 모노(career-mono),
 *   강조색 = 교정 잉크 빨강(--career-red) 하나 — 커서·활성·새 줄·추출 화살표에만.
 *
 * 구성:
 *   [헤더] 스펙 보드 + SPEC LEDGER 캡션 (좌) · 신분 전환 탭 (우) · 굵은 괘선
 *   [인적] 이름·한 줄 소개 (좌) · EXTRACT → 화살표 링크 (우)
 *   [입력] 빨간 바 캡처 박스 + TRY 밑줄 링크
 *   [기록] RECORDS · 카드(2열 장부) ↔ 문서(줄글) 토글, 행 클릭 → 세부사항
 *
 * 변신 카드가 framer layoutId 공유로 원고의 해당 행까지 날아가 꽂힌다.
 * 수치는 색이 아니라 잉크 굵기(볼드)로 강조 — 빨강 규율 유지.
 */
import { useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { Copy, Download, Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { useCareerBoard } from '@/hooks/useCareer';
import { careerStore } from '@/services/careerStore';
import { aiClassifySpec, aiComposeCareerDoc, type ComposePurpose } from '@/lib/career/ai';
import { PERSONA_LABEL, type CareerPersona, type SpecItem } from '@/types/career';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** 섹션명 → 영문 보조 라벨 (장부의 인덱스 캡션). */
const SECTION_EN: Record<string, string> = {
  자격증: 'CERTIFICATION',
  수상: 'AWARDS',
  어학: 'LANGUAGES',
  경력: 'CAREER',
  프로젝트: 'PROJECTS',
  교육: 'EDUCATION',
  '동아리·활동': 'ACTIVITIES',
  대외활동: 'ACTIVITIES',
  봉사: 'VOLUNTEER',
  공모전: 'COMPETITIONS',
  인턴: 'INTERNSHIP',
  기타: 'ETC',
};

/** 신분별 시작 칸 — 설정 시 빈 섹션으로 깔린다 (나중에 추가·삭제 자유). */
const SEED_CATEGORIES: Record<CareerPersona, string[]> = {
  student: ['자격증', '어학', '동아리·활동', '공모전', '수상'],
  jobseeker: ['자격증', '어학', '인턴', '프로젝트', '수상'],
  worker: ['경력', '프로젝트', '자격증', '수상', '교육'],
};

const PERSONA_DESC: Record<CareerPersona, string> = {
  student: '동아리·공모전·자격증 중심으로 칸을 준비해요',
  jobseeker: '인턴·프로젝트·어학 중심으로 칸을 준비해요',
  worker: '경력·프로젝트 성과 중심으로 칸을 준비해요',
};

/** 해보기 예시 — 신분에 맞는 첫 입력을 클릭 한 번으로. */
const TRY_EXAMPLES: Record<CareerPersona, string[]> = {
  student: ['정처기 땄음', '동아리 회장 됐음', '해커톤 본선 갔음'],
  jobseeker: ['토익 900 넘김', '스타트업 인턴 수료함', '포트폴리오 사이트 만들었음'],
  worker: ['결제 오류 잡아서 CS 문의 줄임', '신규 서비스 런칭함', '사내 세미나 발표함'],
};

const COMPOSE_PURPOSES: Array<{ purpose: ComposePurpose; label: string }> = [
  { purpose: '이력서', label: '이력서로' },
  { purpose: '자기소개서 초안', label: '자소서로' },
  { purpose: '포트폴리오 요약', label: '포트폴리오로' },
];

/** 입력 → AI 변신 단계. idle = 입력 대기. */
type CapturePhase =
  | { step: 'idle' }
  | { step: 'thinking'; raw: string }
  | { step: 'reveal'; raw: string; refined: string; category: string };

type ViewMode = 'card' | 'doc';
const VIEW_KEY = 'career.view.v1';

const formatMonth = (iso: string) => iso.slice(0, 7).replace('-', '.');
const formatFull = (iso: string) => iso.slice(0, 10).replaceAll('-', '.');

/** 입력줄 → 원고 행 공유 레이아웃 id. */
const INCOMING = 'career-incoming-card';

/** 수치·변화 토큰 (split 캡처 그룹 — 홀수 index 가 매치). */
const METRIC_RE = /(\d[\d,.]*\s?(?:%|점|초|분|배|건|명|회|억|만|원|위|기|개월|년)?|→)/g;

/** 성과 문장 속 숫자 — 색이 아니라 잉크 굵기로 강조 (빨강은 교정 마크 전용). */
function MetricText({ text }: { text: string }): ReactNode {
  const parts = text.split(METRIC_RE);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="career-mono text-[0.92em] font-semibold">{part}</span>
        ) : (
          part
        ),
      )}
    </>
  );
}

export default function Career() {
  const { profile } = useCareerBoard();

  return (
    <div className="career-theme min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-4xl px-3 pb-20 pt-8 sm:px-6 sm:pt-11">
        {/* 장부 프레임 — 이중 괘선 액자, 안쪽은 책상보다 밝은 원고지 톤 */}
        <div className="border border-[hsl(var(--foreground)/0.45)] bg-[hsl(var(--surface-1))] p-[3px]">
          <div className="border border-[hsl(var(--foreground)/0.16)] px-4 py-7 sm:px-9 sm:py-9">
            {profile.persona === '' ? <SetupLedger /> : <BoardLedger />}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 원고 헤더 — 명조 타이틀 + 모노 캡션 (우측 슬롯 옵션). */
function LedgerHeader({ right }: { right?: ReactNode }) {
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="career-serif text-[26px] font-bold leading-tight tracking-tight">스펙 보드</h1>
          <p className="career-mono mt-1 text-[10px] tracking-[0.28em] text-muted-foreground">
            SPEC LEDGER / 개인 이력 원본
          </p>
        </div>
        {right}
      </header>
      {/* 표제 아래 굵은 괘선 — 원고의 시작 */}
      <div aria-hidden className="mt-4 border-b-2 border-[hsl(var(--foreground)/0.75)]" />
    </>
  );
}

/* ═══════════════ 첫 설정 — 신분 선택 → 칸 준비 ═══════════════ */

function SetupLedger() {
  const seed = (persona: CareerPersona) => {
    SEED_CATEGORIES[persona].forEach((name) => careerStore.ensureCategory(name));
    careerStore.setProfile({ persona });
  };

  return (
    <>
      <LedgerHeader />
      <p className="career-mono mt-10 text-center text-[10px] tracking-[0.24em] text-muted-foreground">
        SETUP — 원고의 뼈대를 준비해요
      </p>
      <h2 className="career-serif mt-2.5 text-center text-[21px] font-bold tracking-tight">
        지금 어디쯤에 있나요?
      </h2>
      <p className="mt-2 text-center text-[13px] text-muted-foreground">
        고르면 그에 맞는 칸이 준비돼요. 칸은 나중에 자유롭게 추가하거나 지울 수 있어요.
      </p>

      <div className="mx-auto mt-8 grid max-w-xl gap-3">
        {(Object.keys(SEED_CATEGORIES) as CareerPersona[]).map((persona) => (
          <button
            key={persona}
            type="button"
            onClick={() => seed(persona)}
            className="group border border-[hsl(var(--foreground)/0.3)] bg-[hsl(var(--surface-2))] px-5 py-4 text-left transition-colors hover:border-[hsl(var(--career-red))]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="career-serif text-[16px] font-bold">{PERSONA_LABEL[persona]}</p>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">{PERSONA_DESC[persona]}</p>
              </div>
              <span className="text-[14px] text-[hsl(var(--career-red))] opacity-0 transition-opacity group-hover:opacity-100">
                →
              </span>
            </div>
            <p className="career-mono mt-2.5 text-[10.5px] tracking-wide text-muted-foreground">
              {SEED_CATEGORIES[persona].join(' · ')}
            </p>
          </button>
        ))}
      </div>
    </>
  );
}

/* ═══════════════ 원고 본체 ═══════════════ */

function BoardLedger() {
  const { items, categories, profile } = useCareerBoard();
  const [phase, setPhase] = useState<CapturePhase>({ step: 'idle' });
  const [draft, setDraft] = useState('');
  const [recentId, setRecentId] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [composePurpose, setComposePurpose] = useState<ComposePurpose | null>(null);
  const [detailItem, setDetailItem] = useState<SpecItem | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return window.localStorage.getItem(VIEW_KEY) === 'doc' ? 'doc' : 'card';
    } catch {
      return 'card';
    }
  });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const recentTimer = useRef<number | null>(null);

  const sections = useMemo(
    () =>
      categories.map((category) => ({
        category,
        items: items.filter((item) => item.categoryId === category.id),
      })),
    [categories, items],
  );

  const lastRecordedAt = items.length > 0 ? items[0].createdAt.slice(0, 10) : null;
  const thisYearCount = useMemo(() => {
    const year = String(new Date().getFullYear());
    return items.filter((item) => item.date.startsWith(year)).length;
  }, [items]);
  const busy = phase.step !== 'idle';
  const persona = (profile.persona || 'student') as CareerPersona;

  const changeView = (mode: ViewMode) => {
    setViewMode(mode);
    try { window.localStorage.setItem(VIEW_KEY, mode); } catch { /* noop */ }
  };

  const switchPersona = (next: CareerPersona) => {
    if (next === persona) return;
    SEED_CATEGORIES[next].forEach((name) => careerStore.ensureCategory(name));
    careerStore.setProfile({ persona: next });
  };

  const submit = async (rawInput?: string) => {
    const raw = (rawInput ?? draft).trim();
    if (!raw || busy) return;
    setDraft('');
    if (recentTimer.current) window.clearTimeout(recentTimer.current);
    setRecentId(null);
    setPhase({ step: 'thinking', raw });
    const result = await aiClassifySpec(raw, categories.map((c) => c.name));
    setPhase({ step: 'reveal', raw, refined: result.refined, category: result.category });
    // 변신을 잠깐 보여준 뒤 — 같은 줄이 layoutId 로 원고의 행까지 날아간다.
    window.setTimeout(() => {
      const item = careerStore.addItem({ raw, refined: result.refined, categoryName: result.category });
      setRecentId(item.id);
      setPhase({ step: 'idle' });
      recentTimer.current = window.setTimeout(() => setRecentId(null), 2400);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }, 800);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void submit();
  };

  const removeItem = (item: SpecItem) => {
    careerStore.removeItem(item.id);
    notify.success('원고에서 뺐어요');
  };

  const onDropToCategory = (event: DragEvent, categoryId: string) => {
    event.preventDefault();
    setDragOverCategory(null);
    const id = event.dataTransfer.getData('text/plain');
    if (!id) return;
    careerStore.moveItem(id, categoryId);
  };

  const commitNewCategory = () => {
    const name = newCategoryName.trim();
    setAddingCategory(false);
    setNewCategoryName('');
    if (!name) return;
    careerStore.ensureCategory(name);
  };

  /* 원고 행 — 카드/문서 뷰 공용. */
  const renderRow = (item: SpecItem, draggable: boolean) => (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e: DragEvent) => e.dataTransfer.setData('text/plain', item.id) : undefined}
      onClick={() => setDetailItem(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setDetailItem(item);
        }
      }}
      className={cn(
        'group relative cursor-pointer px-2 py-2.5 transition-[background-color,box-shadow]',
        'hover:bg-[hsl(var(--foreground)/0.04)] hover:shadow-[inset_3px_0_0_hsl(var(--career-red)/0.85)]',
        item.id === recentId && 'career-new-line',
      )}
    >
      <div className="flex items-baseline gap-3">
        <span className="career-serif min-w-0 flex-1 text-[14.5px] leading-relaxed">
          <MetricText text={item.refined} />
        </span>
        <span className="career-mono shrink-0 text-[11px] text-muted-foreground transition-opacity group-hover:opacity-0">
          {formatMonth(item.date)}
        </span>
        <span className="absolute right-1.5 top-2 flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeItem(item);
            }}
            aria-label="삭제"
            title="삭제"
            className="p-1 text-muted-foreground transition-colors hover:text-[hsl(var(--career-red))]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
      {item.detail && (
        <p className={cn('mt-0.5 text-[12px] leading-relaxed text-muted-foreground/85', viewMode === 'card' && 'line-clamp-1')}>
          {item.detail}
        </p>
      )}
    </div>
  );

  return (
    <>
      <LedgerHeader
        right={
          <div className="flex items-center gap-3 pb-1">
            <span className="career-mono text-[9.5px] tracking-[0.24em] text-muted-foreground/70">LEDGER</span>
            {(Object.keys(PERSONA_LABEL) as CareerPersona[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => switchPersona(key)}
                aria-pressed={persona === key}
                className={cn(
                  'pb-0.5 text-[12.5px] transition-colors',
                  persona === key
                    ? 'border-b-2 border-[hsl(var(--career-red))] font-bold text-foreground'
                    : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {PERSONA_LABEL[key]}
              </button>
            ))}
          </div>
        }
      />

      {/* ── 인적 사항 + EXTRACT ── */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {/* IME 조합 안정성 — 비제어 + blur 시 저장. */}
          <input
            defaultValue={profile.name}
            onBlur={(e) => careerStore.setProfile({ name: e.target.value.trim() })}
            placeholder="이름"
            aria-label="이름"
            className="career-serif w-full max-w-[300px] bg-transparent text-[22px] font-bold tracking-tight outline-none placeholder:text-muted-foreground/40"
          />
          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[12.5px] text-muted-foreground">
            <input
              defaultValue={profile.tagline}
              onBlur={(e) => careerStore.setProfile({ tagline: e.target.value.trim() })}
              placeholder={`한 줄 소개 — 예: ${persona === 'worker' ? '3년차 프론트엔드 개발자' : '컴퓨터공학 3학년'}`}
              aria-label="한 줄 소개"
              className="w-[240px] bg-transparent outline-none placeholder:text-muted-foreground/45"
            />
            {lastRecordedAt && <span className="shrink-0">· 마지막 기록 {formatFull(lastRecordedAt)}</span>}
          </div>
        </div>
        <div className="pb-1 text-right">
          <p className="career-mono mb-1 text-[9.5px] tracking-[0.2em] text-muted-foreground/70">
            EXTRACT — 목적별로 뽑아쓰기
          </p>
          <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
            {COMPOSE_PURPOSES.map(({ purpose, label }) => (
              <button
                key={purpose}
                type="button"
                onClick={() => setComposePurpose(purpose)}
                disabled={items.length === 0}
                className={cn(
                  'group text-[13px] font-medium transition-colors',
                  items.length === 0
                    ? 'cursor-not-allowed text-muted-foreground/45'
                    : 'text-foreground hover:text-[hsl(var(--career-red))]',
                )}
              >
                <span className={cn('mr-0.5', items.length > 0 && 'text-[hsl(var(--career-red))]')}>→</span>
                <span className={cn(items.length > 0 && 'underline-offset-4 group-hover:underline')}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div aria-hidden className="mt-5 border-b border-[hsl(var(--foreground)/0.3)]" />

      <LayoutGroup>
        {/* ────── 캡처 박스 — 빨간 교정 바가 꽂힌 원고의 다음 줄 ────── */}
        <div className="pt-6">
          <div
            className={cn(
              'flex items-center border bg-[hsl(var(--surface-2))] transition-colors',
              'border-[hsl(var(--foreground)/0.45)] focus-within:border-[hsl(var(--career-red))]',
            )}
          >
            <span aria-hidden className="my-2.5 ml-3.5 w-[3px] shrink-0 self-stretch bg-[hsl(var(--career-red))]" />
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="여기에 한 줄로 이어 적으세요 — 뭐든 이룬 것"
              aria-label="스펙 입력"
              className="career-serif h-12 min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none placeholder:text-muted-foreground/50"
            />
            <span className="career-mono hidden shrink-0 pr-4 text-[10px] tracking-[0.18em] text-muted-foreground/60 sm:block">
              RETURN ⏎
            </span>
          </div>

          {/* TRY — 기록이 적을 때만, 밑줄 링크. */}
          {items.length < 3 && phase.step === 'idle' && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="career-mono text-[9.5px] tracking-[0.24em] text-muted-foreground/60">TRY</span>
              {TRY_EXAMPLES[persona].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => void submit(example)}
                  className="text-[12.5px] text-secondary-foreground underline decoration-[hsl(var(--foreground)/0.3)] underline-offset-4 transition-colors hover:text-[hsl(var(--career-red))] hover:decoration-[hsl(var(--career-red))]"
                >
                  {example}
                </button>
              ))}
            </div>
          )}

          {/* 변신 줄 — 원문이 이력서 문장으로 바뀌고, 그대로 원고 행까지 날아간다. */}
          <AnimatePresence>
            {phase.step !== 'idle' && (
              <motion.div
                layoutId={INCOMING}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center border border-[hsl(var(--foreground)/0.35)] bg-[hsl(var(--surface-2))] py-2.5"
              >
                <span aria-hidden className="ml-3.5 w-[3px] shrink-0 self-stretch bg-[hsl(var(--career-red))]" />
                {phase.step === 'thinking' ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3.5 text-[13.5px]">
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[hsl(var(--career-red))]" />
                    <span className="career-serif min-w-0 flex-1 truncate text-muted-foreground">{phase.raw}</span>
                    <span className="career-mono shrink-0 text-[10px] tracking-wide text-[hsl(var(--career-red))]">
                      교정 중…
                    </span>
                  </div>
                ) : (
                  <motion.div
                    initial={{ rotateX: -80, opacity: 0 }}
                    animate={{ rotateX: 0, opacity: 1 }}
                    transition={{ duration: 0.34, ease: 'easeOut' }}
                    className="flex min-w-0 flex-1 items-center gap-2.5 px-3.5 text-[14px]"
                  >
                    <span className="career-serif min-w-0 flex-1 font-medium">{phase.refined}</span>
                    <span className="career-mono shrink-0 border border-[hsl(var(--career-red)/0.5)] px-1.5 py-0.5 text-[10px] tracking-wide text-[hsl(var(--career-red))]">
                      {phase.category}
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ────── RECORDS — 캡션 + 카드/문서 토글 ────── */}
        <div className="mt-9 flex items-end justify-between">
          <span className="career-mono text-[9.5px] tracking-[0.24em] text-muted-foreground/70">RECORDS</span>
          <div className="flex items-center gap-3">
            {([['card', '카드'], ['doc', '문서']] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => changeView(mode)}
                aria-pressed={viewMode === mode}
                className={cn(
                  'pb-0.5 text-[12px] transition-colors',
                  viewMode === mode
                    ? 'border-b-2 border-[hsl(var(--career-red))] font-bold text-foreground'
                    : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ────── 기록 — 2열 장부 or 문서 줄글 ────── */}
        {viewMode === 'card' ? (
          <div className="mt-4 grid items-start gap-x-10 gap-y-8 md:grid-cols-2">
            {sections.map(({ category, items: sectionItems }, sectionIndex) => (
              <section
                key={category.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCategory(category.id);
                }}
                onDragLeave={() => setDragOverCategory((v) => (v === category.id ? null : v))}
                onDrop={(e) => onDropToCategory(e, category.id)}
                className={cn(
                  'group/section transition-shadow',
                  dragOverCategory === category.id && 'shadow-[inset_0_0_0_1px_hsl(var(--career-red)/0.6)]',
                )}
              >
                <SectionHeader
                  index={sectionIndex}
                  name={category.name}
                  count={sectionItems.length}
                  onRemove={() => careerStore.removeCategory(category.id)}
                />
                {sectionItems.length === 0 ? (
                  <p className="px-2 py-3 text-[12.5px] text-muted-foreground/55">
                    아직 비어 있어요 — 이룬 것을 적으면 여기에 쌓여요.
                  </p>
                ) : (
                  <ul className="divide-y divide-[hsl(var(--hairline))]">
                    <AnimatePresence initial={false}>
                      {sectionItems.map((item) => (
                        <motion.li
                          key={item.id}
                          layout
                          layoutId={item.id === recentId ? INCOMING : undefined}
                          initial={item.id === recentId ? false : { opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                        >
                          {renderRow(item, true)}
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </section>
            ))}

            {/* 칸 추가 — 원고에 새 인덱스를 긋는다 */}
            {addingCategory ? (
              <div className="flex items-baseline gap-2 border-b border-[hsl(var(--foreground)/0.55)] pb-2">
                <span className="career-mono text-[11px] font-medium text-[hsl(var(--career-red)/0.85)]">
                  {String(sections.length + 1).padStart(2, '0')}
                </span>
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) commitNewCategory();
                    if (e.key === 'Escape') {
                      setAddingCategory(false);
                      setNewCategoryName('');
                    }
                  }}
                  onBlur={commitNewCategory}
                  autoFocus
                  placeholder="칸 이름 — 예: 봉사, 출판, 특허"
                  aria-label="새 칸 이름"
                  className="career-serif h-6 min-w-0 flex-1 bg-transparent text-[15px] font-bold outline-none placeholder:font-normal placeholder:text-muted-foreground/45"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingCategory(true)}
                className="self-start text-[12.5px] text-muted-foreground/60 underline decoration-[hsl(var(--foreground)/0.25)] underline-offset-4 transition-colors hover:text-[hsl(var(--career-red))] hover:decoration-[hsl(var(--career-red))]"
              >
                + 칸 추가
              </button>
            )}
          </div>
        ) : (
          /* ── 문서 뷰 — 이력서 줄글, 행 클릭도 세부사항 ── */
          <div className="mt-4 space-y-8">
            {sections.filter((s) => s.items.length > 0).length === 0 ? (
              <p className="py-6 text-center text-[12.5px] text-muted-foreground/60">
                아직 기록이 없어요 — 위에 한 줄 적으면 원고가 시작돼요.
              </p>
            ) : (
              sections
                .filter((s) => s.items.length > 0)
                .map(({ category, items: sectionItems }, sectionIndex) => (
                  <section key={category.id}>
                    <SectionHeader index={sectionIndex} name={category.name} count={sectionItems.length} />
                    <ul className="divide-y divide-[hsl(var(--hairline))]">
                      {sectionItems.map((item) => (
                        <li key={item.id}>{renderRow(item, false)}</li>
                      ))}
                    </ul>
                  </section>
                ))
            )}
          </div>
        )}
      </LayoutGroup>

      {/* ── 하단 메타 라인 ── */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-[hsl(var(--foreground)/0.3)] pt-3">
        <span className="career-mono text-[10px] tracking-[0.18em] text-muted-foreground/70">
          {PERSONA_LABEL[persona]} · 칸 {categories.length} · 기록 {items.length}
          {thisYearCount > 0 && ` · 올해 ${thisYearCount}`}
        </span>
        <span className="text-[11.5px] text-muted-foreground/60">
          줄을 누르면 세부사항을 적을 수 있어요
        </span>
      </div>

      <ComposeDialog purpose={composePurpose} onClose={() => setComposePurpose(null)} />
      <DetailDialog item={detailItem} onClose={() => setDetailItem(null)} />
    </>
  );
}

/** 섹션 헤더 — 빨간 인덱스 번호 + 명조 제목 + 모노 캡션, 진한 괘선. */
function SectionHeader({
  index,
  name,
  count,
  onRemove,
}: {
  index: number;
  name: string;
  count: number;
  onRemove?: () => void;
}) {
  return (
    <div className="mb-1 flex items-baseline gap-2 border-b border-[hsl(var(--foreground)/0.55)] pb-2">
      <span className="career-mono text-[11px] font-medium text-[hsl(var(--career-red)/0.85)]">
        {String(index + 1).padStart(2, '0')}
      </span>
      <h2 className="career-serif text-[15px] font-bold tracking-tight">{name}</h2>
      <span className="career-mono ml-auto text-[9px] tracking-[0.2em] text-muted-foreground/60">
        {SECTION_EN[name] ?? ''}
      </span>
      {count > 0 ? (
        <span className="career-mono text-[10.5px] text-muted-foreground">{count}개</span>
      ) : (
        onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`${name} 칸 삭제`}
            title="빈 칸 삭제"
            className="p-0.5 text-transparent transition-colors hover:!text-[hsl(var(--career-red))] group-hover/section:text-muted-foreground/70"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )
      )}
    </div>
  );
}

/* ═══════════════ 세부사항 다이얼로그 ═══════════════ */

function DetailDialog({ item, onClose }: { item: SpecItem | null; onClose: () => void }) {
  return (
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="career-theme max-w-md">
        {item && <DetailForm key={item.id} item={item} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function DetailForm({ item, onClose }: { item: SpecItem; onClose: () => void }) {
  const [refined, setRefined] = useState(item.refined);
  const [date, setDate] = useState(item.date);
  const [detail, setDetail] = useState(item.detail ?? '');

  const save = () => {
    careerStore.updateItem(item.id, {
      refined: refined.trim() || item.refined,
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : item.date,
      detail: detail.trim() || undefined,
    });
    onClose();
    notify.success('저장했어요');
  };

  const remove = () => {
    careerStore.removeItem(item.id);
    onClose();
    notify.success('원고에서 뺐어요');
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="career-serif text-[16px]">세부사항</DialogTitle>
      </DialogHeader>
      <div className="space-y-3.5">
        <div>
          <label htmlFor="career-detail-refined" className="career-mono mb-1 block text-[10px] tracking-[0.14em] text-muted-foreground">
            이력서 문장
          </label>
          <input
            id="career-detail-refined"
            value={refined}
            onChange={(e) => setRefined(e.target.value)}
            className="career-serif h-10 w-full border border-[hsl(var(--foreground)/0.35)] bg-[hsl(var(--surface-2))] px-3 text-[14px] font-medium outline-none focus:border-[hsl(var(--career-red))]"
          />
        </div>
        <div>
          <label htmlFor="career-detail-date" className="career-mono mb-1 block text-[10px] tracking-[0.14em] text-muted-foreground">
            날짜
          </label>
          <input
            id="career-detail-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="career-mono h-10 border border-[hsl(var(--foreground)/0.35)] bg-[hsl(var(--surface-2))] px-3 text-[12.5px] outline-none focus:border-[hsl(var(--career-red))]"
          />
        </div>
        <div>
          <label htmlFor="career-detail-memo" className="career-mono mb-1 block text-[10px] tracking-[0.14em] text-muted-foreground">
            세부사항
          </label>
          <textarea
            id="career-detail-memo"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder={'상황 · 내가 한 일 · 결과를 편하게 적어두세요.\n이력서·자소서로 뽑을 때 AI가 이 내용을 활용해요.'}
            className="h-32 w-full resize-none border border-[hsl(var(--foreground)/0.35)] bg-[hsl(var(--surface-2))] p-3 text-[13px] leading-relaxed outline-none focus:border-[hsl(var(--career-red))]"
          />
        </div>
        <p className="truncate text-[11.5px] text-muted-foreground/70" title={item.raw}>
          원문 — “{item.raw}”
        </p>
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={remove}
            className="inline-flex h-8 items-center gap-1.5 px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:text-[hsl(var(--career-red))]"
          >
            <Trash2 className="h-3 w-3" />
            삭제
          </button>
          <button
            type="button"
            onClick={save}
            className="inline-flex h-8 items-center bg-primary px-4 text-[12.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            저장
          </button>
        </div>
      </div>
    </>
  );
}

/* ═══════════════ EXTRACT 다이얼로그 ═══════════════ */

function ComposeDialog({ purpose, onClose }: { purpose: ComposePurpose | null; onClose: () => void }) {
  const { items, categories } = useCareerBoard();
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');

  const generate = async (target: ComposePurpose) => {
    setGenerating(true);
    setResult('');
    try {
      const sections = categories.map((category) => ({
        name: category.name,
        items: items.filter((item) => item.categoryId === category.id),
      }));
      setResult(await aiComposeCareerDoc(target, sections));
    } catch (err) {
      notify.error('문서 생성에 실패했어요', {
        description: err instanceof Error ? err.message : '잠시 뒤 다시 시도해 주세요.',
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(result);
      notify.success('복사했어요');
    } catch {
      notify.error('복사에 실패했어요');
    }
  };

  const downloadResult = () => {
    if (!purpose) return;
    const blob = new Blob([result], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${purpose}-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={purpose !== null} onOpenChange={(open) => { if (!open) { setResult(''); onClose(); } }}>
      <DialogContent className="career-theme max-w-lg">
        <DialogHeader>
          <DialogTitle className="career-serif text-[16px]">원고로 {purpose} 만들기</DialogTitle>
        </DialogHeader>
        <button
          type="button"
          onClick={() => purpose && void generate(purpose)}
          disabled={generating}
          className="inline-flex h-9 items-center justify-center gap-1.5 bg-primary px-3 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-55"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {generating ? '뽑는 중…' : `${purpose} 만들기`}
        </button>
        {result && (
          <>
            <textarea
              readOnly
              value={result}
              aria-label="생성된 문서"
              className="h-56 w-full resize-none border border-[hsl(var(--foreground)/0.35)] bg-[hsl(var(--surface-2))] p-3 text-[12.5px] leading-relaxed outline-none"
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => void copyResult()}
                className="inline-flex h-8 items-center gap-1.5 border border-[hsl(var(--foreground)/0.35)] px-2.5 text-[12px] font-medium transition-colors hover:bg-accent"
              >
                <Copy className="h-3 w-3" />
                복사
              </button>
              <button
                type="button"
                onClick={downloadResult}
                className="inline-flex h-8 items-center gap-1.5 border border-[hsl(var(--foreground)/0.35)] px-2.5 text-[12px] font-medium transition-colors hover:bg-accent"
              >
                <Download className="h-3 w-3" />
                .md 다운로드
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
