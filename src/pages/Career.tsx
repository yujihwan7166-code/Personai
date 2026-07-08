/**
 * 스펙 보드 — /career (아직 완성되지 않은, 당신 이력서의 원본).
 *
 * 레퍼런스 구성 (유저 확정):
 *   [첫 진입] 신분 설정(대학생/취준생/직장인) → 그에 맞는 칸이 준비됨
 *   [시트 상단] 인적 사항 + EXTRACT(이력서/자소서/포트폴리오) — 맨 위 우측
 *   [입력줄] 만능 한 줄 + 해보기 칩
 *   [보드] 번호 매긴 이력서 섹션 2열 — 크림 패널 안에 흰 카드
 *   [하단] 기록 요약 메타 라인
 *
 * 디테일: 수치는 골드로 하이라이트, 카드 호버 리프트, 칸 추가는 점선 타일,
 * 빈 칸은 자리를 지키고(hover 삭제), 변신 카드가 layoutId 로 날아가 꽂힌다.
 */
import { useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import {
  Check,
  Copy,
  CornerDownLeft,
  Download,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
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

/** 섹션명 → 영문 보조 라벨 (문서의 소제목 캡션). */
const SECTION_EN: Record<string, string> = {
  자격증: 'CERTIFICATIONS',
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

const formatMonth = (iso: string) => iso.slice(0, 7).replace('-', '.');
const formatFull = (iso: string) => iso.slice(0, 10).replaceAll('-', '.');

/** 입력줄 → 섹션 카드 공유 레이아웃 id. */
const INCOMING = 'career-incoming-card';

/** 수치·변화 토큰 (split 캡처 그룹 — 홀수 index 가 매치). */
const METRIC_RE = /(\d[\d,.]*\s?(?:%|점|초|분|배|건|명|회|억|만|원|위|기|개월|년)?|→)/g;

/** 성과 문장 속 숫자를 골드로 — "3.2초 → 0.9초" 가 눈에 박히게. */
function MetricText({ text }: { text: string }): ReactNode {
  const parts = text.split(METRIC_RE);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="font-semibold text-[hsl(var(--career-gold))]">{part}</span>
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
      <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        {/* ────── 페이지 헤더 (시트 밖, 종이 위) ────── */}
        <header className="mb-6 flex items-center gap-3 px-1">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--foreground)/0.25)] font-serif text-[16px] font-semibold"
          >
            S
          </span>
          <div className="min-w-0">
            <h1 className="text-[18px] font-bold leading-tight">스펙 보드</h1>
            <p className="text-[12.5px] tracking-wide text-muted-foreground">
              아직 완성되지 않은, 당신 이력서의 원본
            </p>
          </div>
        </header>

        {profile.persona === '' ? <SetupSheet /> : <BoardSheet />}
      </div>
    </div>
  );
}

/* ═══════════════ 첫 설정 — 신분 선택 → 칸 준비 ═══════════════ */

function SetupSheet() {
  const seed = (persona: CareerPersona) => {
    SEED_CATEGORIES[persona].forEach((name) => careerStore.ensureCategory(name));
    careerStore.setProfile({ persona });
  };

  return (
    <div className="rounded-2xl bg-[hsl(var(--surface-1))] px-6 py-10 shadow-[0_10px_36px_-26px_hsl(var(--foreground)/0.4)] sm:px-12 sm:py-14">
      <p className="text-center font-serif text-[10.5px] tracking-[0.2em] text-muted-foreground">
        SETUP — 문서의 뼈대를 준비해요
      </p>
      <h2 className="mt-2 text-center text-[20px] font-bold tracking-tight">
        지금 어디쯤에 있나요?
      </h2>
      <p className="mt-1.5 text-center text-[13px] text-muted-foreground">
        고르면 그에 맞는 칸이 준비돼요. 칸은 나중에 자유롭게 추가하거나 지울 수 있어요.
      </p>

      <div className="mx-auto mt-8 grid max-w-xl gap-3">
        {(Object.keys(SEED_CATEGORIES) as CareerPersona[]).map((persona) => (
          <button
            key={persona}
            type="button"
            onClick={() => seed(persona)}
            className="group rounded-xl border border-[hsl(var(--hairline))] bg-card px-5 py-4 text-left transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--foreground)/0.4)] hover:shadow-[0_8px_20px_-14px_hsl(var(--foreground)/0.4)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[15px] font-bold">{PERSONA_LABEL[persona]}</p>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">{PERSONA_DESC[persona]}</p>
              </div>
              <span className="text-[13px] text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground">
                →
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {SEED_CATEGORIES[persona].map((name) => (
                <span
                  key={name}
                  className="rounded-md bg-[hsl(var(--surface-3)/0.7)] px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
                >
                  {name}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ 보드 시트 ═══════════════ */

function BoardSheet() {
  const { items, categories, profile } = useCareerBoard();
  const [phase, setPhase] = useState<CapturePhase>({ step: 'idle' });
  const [draft, setDraft] = useState('');
  const [recentId, setRecentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [composePurpose, setComposePurpose] = useState<ComposePurpose | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
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

  const submit = async (rawInput?: string) => {
    const raw = (rawInput ?? draft).trim();
    if (!raw || busy) return;
    setDraft('');
    if (recentTimer.current) window.clearTimeout(recentTimer.current);
    setRecentId(null);
    setPhase({ step: 'thinking', raw });
    const result = await aiClassifySpec(raw, categories.map((c) => c.name));
    setPhase({ step: 'reveal', raw, refined: result.refined, category: result.category });
    // 변신을 잠깐 보여준 뒤 — 같은 카드가 layoutId 로 섹션 카드 자리까지 날아간다.
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

  const startEdit = (item: SpecItem) => {
    setEditingId(item.id);
    setEditText(item.refined);
  };

  const commitEdit = () => {
    if (!editingId) return;
    const text = editText.trim();
    if (text) careerStore.updateItem(editingId, { refined: text });
    setEditingId(null);
  };

  const removeItem = (item: SpecItem) => {
    careerStore.removeItem(item.id);
    notify.success('원본에서 뺐어요');
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

  return (
    <>
      {/* ────── 이력서 원본 시트 ────── */}
      <div className="rounded-2xl bg-[hsl(var(--surface-1))] px-5 py-7 shadow-[0_14px_44px_-28px_hsl(var(--foreground)/0.45)] sm:px-10 sm:py-9">
        {/* ── 맨 위: 인적 사항 + EXTRACT ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {/* IME 조합 안정성 — 비제어 + blur 시 저장. */}
            <input
              defaultValue={profile.name}
              onBlur={(e) => careerStore.setProfile({ name: e.target.value.trim() })}
              placeholder="이름"
              aria-label="이름"
              className="w-full max-w-[300px] bg-transparent text-[24px] font-bold tracking-tight outline-none placeholder:text-muted-foreground/40"
            />
            <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[13px] text-muted-foreground">
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
          <div className="text-right">
            <p className="mb-1.5 font-serif text-[10.5px] tracking-[0.16em] text-muted-foreground">
              EXTRACT — 목적별로 뽑아쓰기
            </p>
            <div className="flex flex-wrap justify-end gap-1.5">
              {COMPOSE_PURPOSES.map(({ purpose, label }) => (
                <button
                  key={purpose}
                  type="button"
                  onClick={() => setComposePurpose(purpose)}
                  disabled={items.length === 0}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-all',
                    items.length === 0
                      ? 'cursor-not-allowed border-[hsl(var(--hairline))] text-muted-foreground/50'
                      : 'border-[hsl(var(--primary)/0.5)] text-primary hover:-translate-y-px hover:bg-primary hover:text-primary-foreground hover:shadow-sm',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 인적 사항 아래 괘선 */}
        <div aria-hidden className="mt-5 border-b border-[hsl(var(--hairline))]" />

        <LayoutGroup>
          {/* ────── 만능 입력줄 — 문서의 다음 빈 줄 ────── */}
          <div className="pt-6">
            <div className="flex items-center gap-2.5 border-b border-[hsl(var(--foreground)/0.35)] pb-2.5 transition-colors focus-within:border-[hsl(var(--foreground)/0.7)]">
              <span aria-hidden className="select-none text-[16px] font-semibold text-[hsl(var(--career-gold))]">+</span>
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="여기에 한 줄로 이어 적어 보세요 — 뭐든 이룬 것"
                aria-label="스펙 입력"
                className="h-9 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/55"
              />
              <span className="hidden shrink-0 items-center gap-1 font-serif text-[11px] tracking-wide text-muted-foreground/70 sm:flex">
                Enter <CornerDownLeft className="h-3 w-3" />
              </span>
            </div>

            {/* 해보기 — 기록이 적을 때만, 신분에 맞는 예시. */}
            {items.length < 3 && phase.step === 'idle' && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground/70">해보기</span>
                {TRY_EXAMPLES[persona].map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => void submit(example)}
                    className="rounded-full border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-3)/0.55)] px-3 py-1 text-[11.5px] text-secondary-foreground transition-colors hover:bg-accent"
                  >
                    “{example}”
                  </button>
                ))}
              </div>
            )}

            {/* 변신 카드 — 원문이 이력서 문장으로 바뀌고, 그대로 섹션까지 날아간다. */}
            <AnimatePresence>
              {phase.step !== 'idle' && (
                <motion.div
                  layoutId={INCOMING}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3.5 rounded-[10px] border border-[hsl(var(--career-gold)/0.45)] bg-card px-4 py-3 shadow-sm"
                >
                  {phase.step === 'thinking' ? (
                    <div className="flex items-center gap-2.5 text-[13.5px]">
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[hsl(var(--career-gold))]" />
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">{phase.raw}</span>
                      <span className="shrink-0 text-[11.5px] text-[hsl(var(--career-gold))]">
                        이력서 문장으로 다듬는 중…
                      </span>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ rotateX: -80, opacity: 0 }}
                      animate={{ rotateX: 0, opacity: 1 }}
                      transition={{ duration: 0.34, ease: 'easeOut' }}
                      className="flex items-center gap-2.5 text-[14px]"
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--career-gold))]" />
                      <span className="min-w-0 flex-1 font-medium">{phase.refined}</span>
                      <span className="shrink-0 rounded-md bg-[hsl(var(--career-gold)/0.14)] px-1.5 py-0.5 text-[11px] font-semibold text-[hsl(var(--career-gold))]">
                        {phase.category}
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ────── 보드 — 번호 매긴 이력서 섹션 2열 ────── */}
          <div className="mt-8 grid items-start gap-5 md:grid-cols-2">
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
                  'group/section rounded-xl bg-[hsl(var(--surface-2)/0.6)] p-4 transition-shadow',
                  dragOverCategory === category.id && 'ring-2 ring-[hsl(var(--career-gold)/0.5)]',
                )}
              >
                <div className="mb-3 flex items-baseline gap-2 border-b border-[hsl(var(--hairline))] pb-2.5">
                  <span className="font-serif text-[12px] font-semibold tabular-nums text-[hsl(var(--career-gold))]">
                    {String(sectionIndex + 1).padStart(2, '0')}
                  </span>
                  <h2 className="text-[14.5px] font-bold tracking-tight">{category.name}</h2>
                  <span className="ml-auto font-serif text-[10px] tracking-[0.16em] text-muted-foreground/70">
                    {SECTION_EN[category.name] ?? ''}
                  </span>
                  {sectionItems.length > 0 ? (
                    <span className="text-[11px] tabular-nums text-muted-foreground">{sectionItems.length}개</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => careerStore.removeCategory(category.id)}
                      aria-label={`${category.name} 칸 삭제`}
                      title="빈 칸 삭제"
                      className="rounded p-0.5 text-transparent transition-colors hover:bg-accent hover:!text-foreground group-hover/section:text-muted-foreground/70"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {sectionItems.length === 0 ? (
                  <div className="rounded-[10px] border border-dashed border-[hsl(var(--hairline))] px-3.5 py-3 text-[12.5px] text-muted-foreground/55">
                    아직 비어 있어요 — 이룬 것을 적으면 여기에 쌓여요.
                  </div>
                ) : (
                  <ul className="space-y-2.5">
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
                          {/* HTML5 드래그는 motion 의 onDragStart 와 충돌해서 내부 div 가 담당. */}
                          <div
                            draggable={editingId !== item.id}
                            onDragStart={(e: DragEvent) => e.dataTransfer.setData('text/plain', item.id)}
                            className={cn(
                              'group relative flex items-center gap-2.5 rounded-[10px] border border-[hsl(var(--hairline))] bg-card px-3.5 py-2.5 transition-all',
                              editingId !== item.id &&
                                'cursor-grab hover:-translate-y-px hover:border-[hsl(var(--foreground)/0.22)] hover:shadow-[0_4px_12px_-8px_hsl(var(--foreground)/0.35)]',
                              item.id === recentId && 'career-new-line',
                            )}
                          >
                            {editingId === item.id ? (
                              <>
                                <input
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) commitEdit();
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                  autoFocus
                                  aria-label="문장 수정"
                                  className="h-7 min-w-0 flex-1 rounded-md border border-[hsl(var(--foreground)/0.3)] bg-card px-2 text-[13.5px] outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={commitEdit}
                                  aria-label="수정 저장"
                                  className="rounded-md p-1 text-foreground hover:bg-accent"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  aria-label="수정 취소"
                                  className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="min-w-0 flex-1 text-[13.5px] leading-relaxed" title={item.raw}>
                                  <MetricText text={item.refined} />
                                </span>
                                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/80 transition-opacity group-hover:opacity-0">
                                  {formatMonth(item.date)}
                                </span>
                                <span className="absolute right-2 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(item)}
                                    aria-label="문장 수정"
                                    title="문장 수정"
                                    className="rounded-md bg-card p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeItem(item)}
                                    aria-label="삭제"
                                    title="삭제"
                                    className="rounded-md bg-card p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </span>
                              </>
                            )}
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </section>
            ))}

            {/* 칸 추가 — 점선 타일로 그리드 리듬 유지 */}
            {addingCategory ? (
              <div className="rounded-xl border border-dashed border-[hsl(var(--foreground)/0.3)] bg-[hsl(var(--surface-2)/0.4)] p-4">
                <div className="flex items-baseline gap-2 border-b border-[hsl(var(--hairline))] pb-2.5">
                  <span className="font-serif text-[12px] font-semibold tabular-nums text-[hsl(var(--career-gold))]">
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
                    className="h-6 min-w-0 flex-1 bg-transparent text-[14.5px] font-bold tracking-tight outline-none placeholder:font-normal placeholder:text-muted-foreground/45"
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingCategory(true)}
                className="flex min-h-[92px] items-center justify-center gap-1.5 rounded-xl border border-dashed border-[hsl(var(--hairline))] text-[12.5px] font-medium text-muted-foreground/60 transition-colors hover:border-[hsl(var(--foreground)/0.35)] hover:bg-[hsl(var(--surface-2)/0.4)] hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                칸 추가
              </button>
            )}
          </div>
        </LayoutGroup>

        {/* ── 하단 메타 라인 ── */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-2 border-t border-[hsl(var(--hairline))] pt-3.5 text-[11.5px] text-muted-foreground/80">
          <span className="font-serif tracking-[0.14em]">
            {PERSONA_LABEL[persona]} · 칸 {categories.length} · 기록 {items.length}
            {thisYearCount > 0 && ` · 올해 ${thisYearCount}`}
          </span>
          <span>카드는 다른 칸으로 끌어 옮길 수 있어요</span>
        </div>
      </div>

      <ComposeDialog purpose={composePurpose} onClose={() => setComposePurpose(null)} />
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
          <DialogTitle className="text-[15px]">원본으로 {purpose} 만들기</DialogTitle>
        </DialogHeader>
        <button
          type="button"
          onClick={() => purpose && void generate(purpose)}
          disabled={generating}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-55"
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
              className="h-56 w-full resize-none rounded-lg border border-[hsl(var(--hairline))] bg-card p-3 text-[12.5px] leading-relaxed outline-none"
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => void copyResult()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[hsl(var(--hairline))] px-2.5 text-[12px] font-medium hover:bg-accent"
              >
                <Copy className="h-3 w-3" />
                복사
              </button>
              <button
                type="button"
                onClick={downloadResult}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[hsl(var(--hairline))] px-2.5 text-[12px] font-medium hover:bg-accent"
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
