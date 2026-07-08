/**
 * 스펙 보드 — /career (아직 완성되지 않은, 당신 이력서의 원본).
 *
 * 크림 페이퍼 배경 위 흰 시트 한 장:
 *   프로필(이름·한 줄 소개·마지막 기록) + EXTRACT 필 3종
 *   → 만능 입력줄 (+ 해보기 예시 칩)
 *   → 번호 매긴 이력서 섹션 2열 보드.
 *
 * 시그니처 모션: 입력한 원문이 AI 문장으로 변신(플립) → 같은 카드가
 * framer-motion layoutId 공유로 섹션 자리까지 날아가 골드로 꽂힌다.
 *
 * 데이터: careerStore (LocalStorage). AI: quickAi 재사용.
 * 팔레트: .career-theme (index.css) — 크림 페이퍼 + 잉크 네이비 + 골드.
 */
import { useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import {
  Check,
  Copy,
  CornerDownLeft,
  Download,
  Loader2,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { useCareerBoard } from '@/hooks/useCareer';
import { careerStore } from '@/services/careerStore';
import { aiClassifySpec, aiComposeCareerDoc, type ComposePurpose } from '@/lib/career/ai';
import { FALLBACK_CATEGORY, type SpecItem } from '@/types/career';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** 섹션명 → 영문 보조 라벨 (레퍼런스의 CERTIFICATIONS 같은 소문자 세리프 캡션). */
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

/** 해보기 칩 — 첫 사용자가 클릭 한 번으로 시그니처 모션을 경험하게. */
const TRY_EXAMPLES = ['정처기 땄음', '동아리 회장 됐음', '해커톤 본선 갔음'];

/** 빈 보드 예시 — 페르소나 토글로 "나도 이렇게 되는구나"를 보여준다. */
const EXAMPLE_BOARDS: Record<'student' | 'worker', Array<{ section: string; lines: Array<{ text: string; date: string }> }>> = {
  student: [
    {
      section: '자격증',
      lines: [
        { text: '정보처리기사 취득', date: '2026.07' },
        { text: 'SQLD 취득', date: '2025.11' },
        { text: 'TOEIC 915점', date: '2025.09' },
      ],
    },
    {
      section: '수상',
      lines: [
        { text: '교내 창업경진대회 최우수상', date: '2025.10' },
        { text: '캡스톤 디자인 우수상', date: '2026.06' },
      ],
    },
    {
      section: '대외활동',
      lines: [
        { text: 'IT 연합동아리 회장', date: '2025.03' },
        { text: '대학생 SW 봉사단 2기', date: '2024.07' },
      ],
    },
    {
      section: '공모전',
      lines: [
        { text: '전국 대학생 해커톤 본선 진출', date: '2025.08' },
        { text: '공공데이터 활용 공모전 장려상', date: '2025.05' },
      ],
    },
  ],
  worker: [
    {
      section: '경력',
      lines: [
        { text: '결제 완료 페이지 로딩 3.2초 → 0.9초 개선', date: '2026.07' },
        { text: '주니어 2명 온보딩 리드 — 첫 PR 3일 내 머지', date: '2026.05' },
      ],
    },
    {
      section: '프로젝트',
      lines: [
        { text: '신규 온보딩 개편 — 첫날 이탈률 18% 감소', date: '2026.03' },
        { text: '사내 어드민 대시보드 구축', date: '2025.12' },
      ],
    },
    {
      section: '교육',
      lines: [{ text: '사내 SQL 심화 과정 수료', date: '2025.10' }],
    },
    {
      section: '수상',
      lines: [{ text: '연말 우수 사원상', date: '2025.12' }],
    },
  ],
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

/** 카드 날짜 — 2026.07 형식. */
const formatMonth = (iso: string) => iso.slice(0, 7).replace('-', '.');
const formatFull = (iso: string) => iso.slice(0, 10).replaceAll('-', '.');

/** 입력줄 → 섹션 카드 공유 레이아웃 id. */
const INCOMING = 'career-incoming-card';

export default function Career() {
  const { items, categories, profile } = useCareerBoard();
  const [phase, setPhase] = useState<CapturePhase>({ step: 'idle' });
  const [draft, setDraft] = useState('');
  const [recentId, setRecentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [composePurpose, setComposePurpose] = useState<ComposePurpose | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const recentTimer = useRef<number | null>(null);

  const sections = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          items: items.filter((item) => item.categoryId === category.id),
        }))
        .filter((section) => section.items.length > 0),
    [categories, items],
  );

  const lastRecordedAt = items.length > 0 ? items[0].createdAt.slice(0, 10) : null;
  const busy = phase.step !== 'idle';

  const submit = async (rawInput?: string) => {
    const raw = (rawInput ?? draft).trim();
    if (!raw || busy) return;
    setDraft('');
    if (recentTimer.current) window.clearTimeout(recentTimer.current);
    setRecentId(null);
    setPhase({ step: 'thinking', raw });
    const result = await aiClassifySpec(raw, categories.map((c) => c.name));
    setPhase({ step: 'reveal', raw, refined: result.refined, category: result.category });
    // 변신을 잠깐 보여준 뒤 — 같은 카드가 layoutId 로 섹션 자리까지 날아간다.
    window.setTimeout(() => {
      const item = careerStore.addItem({ raw, refined: result.refined, categoryName: result.category });
      setRecentId(item.id);
      setPhase({ step: 'idle' });
      recentTimer.current = window.setTimeout(() => setRecentId(null), 2400);
      if (result.category === FALLBACK_CATEGORY && result.refined === raw) {
        notify.error('AI 다듬기에 실패해서 원문 그대로 담았어요', {
          description: '카드의 연필 버튼으로 직접 다듬을 수 있어요.',
        });
      }
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }, 950);
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
    careerStore.pruneEmptyCategories();
    notify.success('보드에서 뺐어요');
  };

  const onDropToCategory = (event: DragEvent, categoryId: string) => {
    event.preventDefault();
    setDragOverCategory(null);
    const id = event.dataTransfer.getData('text/plain');
    if (!id) return;
    careerStore.moveItem(id, categoryId);
    careerStore.pruneEmptyCategories();
  };

  return (
    <div className="career-theme min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-8 sm:pt-12">
        {/* ────── 페이지 헤더 (시트 밖, 종이 위) ────── */}
        <header className="mb-5 flex items-center gap-3 px-1">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--foreground)/0.25)] font-serif text-[15px] font-semibold"
          >
            S
          </span>
          <div>
            <h1 className="text-[17px] font-bold leading-tight">스펙 보드</h1>
            <p className="font-serif text-[12.5px] italic text-muted-foreground">
              아직 완성되지 않은, 당신 이력서의 원본
            </p>
          </div>
        </header>

        {/* ────── 이력서 원본 시트 ────── */}
        <div className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-5 py-6 shadow-[0_16px_40px_-28px_hsl(var(--foreground)/0.35)] sm:px-8 sm:py-8">
          {/* 프로필 + EXTRACT */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[hsl(var(--hairline))] pb-5">
            <div className="min-w-0">
              {/* IME 조합 안정성 — 비제어 + blur 시 저장. */}
              <input
                defaultValue={profile.name}
                onBlur={(e) => careerStore.setProfile({ name: e.target.value.trim() })}
                placeholder="이름"
                aria-label="이름"
                className="w-full max-w-[240px] bg-transparent text-[21px] font-bold outline-none placeholder:text-muted-foreground/50"
              />
              <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[12.5px] text-muted-foreground">
                <input
                  defaultValue={profile.tagline}
                  onBlur={(e) => careerStore.setProfile({ tagline: e.target.value.trim() })}
                  placeholder="한 줄 소개 — 예: 컴퓨터공학 3학년"
                  aria-label="한 줄 소개"
                  className="w-[220px] bg-transparent outline-none placeholder:text-muted-foreground/50"
                />
                {lastRecordedAt && (
                  <span className="shrink-0">· 마지막 기록 {formatFull(lastRecordedAt)}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="mb-1.5 font-serif text-[10.5px] tracking-[0.14em] text-muted-foreground">
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
                      'rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors',
                      items.length === 0
                        ? 'cursor-not-allowed border-[hsl(var(--hairline))] text-muted-foreground/50'
                        : 'border-[hsl(var(--foreground)/0.35)] text-foreground hover:bg-primary hover:text-primary-foreground',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ────── 만능 입력줄 — 이력서의 다음 빈 줄 ────── */}
          <LayoutGroup>
            <div className="pt-6">
              <div
                className={cn(
                  'flex items-center gap-2.5 border-b pb-2.5 transition-colors',
                  'border-[hsl(var(--foreground)/0.3)] focus-within:border-[hsl(var(--foreground)/0.7)]',
                )}
              >
                <span aria-hidden className="select-none text-[16px] font-semibold text-[hsl(var(--career-gold))]">+</span>
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  disabled={busy}
                  placeholder="여기에 한 줄로 이어 적어 보세요 — 예: 정처기 땄음"
                  aria-label="스펙 입력"
                  className="h-9 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
                />
                <span className="hidden shrink-0 items-center gap-1 font-serif text-[11px] tracking-wide text-muted-foreground/70 sm:flex">
                  Enter <CornerDownLeft className="h-3 w-3" />
                </span>
              </div>

              {/* 해보기 칩 — 기록이 적을 때만. 클릭 한 번으로 모션을 경험. */}
              {items.length < 3 && phase.step === 'idle' && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground/70">해보기</span>
                  {TRY_EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => void submit(example)}
                      className="rounded-full bg-[hsl(var(--surface-3))] px-2.5 py-1 text-[11.5px] text-secondary-foreground transition-colors hover:bg-accent"
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
                    className="mt-3.5 rounded-xl border border-[hsl(var(--career-gold))/0.45] bg-card px-4 py-3 shadow-sm"
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
                        <span className="shrink-0 rounded-md bg-[hsl(var(--career-gold))/0.14] px-1.5 py-0.5 text-[11px] font-semibold text-[hsl(var(--career-gold))]">
                          {phase.category}
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ────── 보드 — 번호 매긴 이력서 섹션 2열 ────── */}
            {sections.length === 0 && phase.step === 'idle' ? (
              <EmptyBoard />
            ) : (
              <div className="mt-7 grid items-start gap-4 md:grid-cols-2">
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
                      'rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))/0.55] p-3.5 transition-shadow',
                      dragOverCategory === category.id && 'ring-2 ring-[hsl(var(--career-gold))/0.5]',
                    )}
                  >
                    <div className="mb-2.5 flex items-baseline gap-2 border-b border-[hsl(var(--hairline))] pb-2">
                      <span className="font-serif text-[12px] font-semibold tabular-nums text-[hsl(var(--career-gold))]">
                        {String(sectionIndex + 1).padStart(2, '0')}
                      </span>
                      <h2 className="text-[14px] font-bold">{category.name}</h2>
                      <span className="ml-auto font-serif text-[10px] tracking-[0.14em] text-muted-foreground/80">
                        {SECTION_EN[category.name] ?? ''}
                      </span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">{sectionItems.length}개</span>
                    </div>
                    <ul className="space-y-2">
                      <AnimatePresence initial={false}>
                        {sectionItems.map((item) => (
                          <motion.li
                            key={item.id}
                            layout
                            layoutId={item.id === recentId ? INCOMING : undefined}
                            initial={item.id === recentId ? false : { opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                          >
                            {/* HTML5 드래그는 motion 의 onDragStart 와 충돌해서 내부 div 가 담당. */}
                            <div
                              draggable={editingId !== item.id}
                              onDragStart={(e: DragEvent) => e.dataTransfer.setData('text/plain', item.id)}
                              className={cn(
                                'group relative flex items-center gap-2 rounded-lg border border-[hsl(var(--hairline))] bg-card px-3 py-2 shadow-[0_1px_2px_hsl(var(--foreground)/0.05)]',
                                editingId !== item.id && 'cursor-grab hover:border-[hsl(var(--foreground)/0.25)]',
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
                                    className="h-7 min-w-0 flex-1 rounded-md border border-[hsl(var(--foreground)/0.3)] bg-card px-2 text-[13px] outline-none"
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
                                  <span className="min-w-0 flex-1 text-[13px] leading-relaxed" title={item.raw}>
                                    {item.refined}
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
                  </section>
                ))}
              </div>
            )}
          </LayoutGroup>

          {sections.length > 1 && (
            <p className="mt-5 text-center text-[11px] text-muted-foreground/70">
              분류가 어긋난 카드는 다른 칸으로 끌어다 놓으면 옮겨져요.
            </p>
          )}
        </div>
      </div>

      <ComposeDialog purpose={composePurpose} onClose={() => setComposePurpose(null)} />
    </div>
  );
}

/** 빈 보드 — 대학생/직장인 예시 토글로 "나도 이렇게 되는구나"를 보여준다. */
function EmptyBoard() {
  const [persona, setPersona] = useState<'student' | 'worker'>('student');
  const board = EXAMPLE_BOARDS[persona];
  return (
    <div className="mt-7">
      <div className="mb-4 flex items-center justify-center gap-2">
        <span className="font-serif text-[10.5px] tracking-[0.14em] text-muted-foreground">예시 보드</span>
        <div className="flex rounded-full bg-[hsl(var(--surface-3))] p-0.5">
          {([['student', '대학생'], ['worker', '직장인']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPersona(key)}
              className={cn(
                'rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors',
                persona === key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="pointer-events-none grid items-start gap-4 opacity-65 md:grid-cols-2" aria-hidden>
        {board.map((section, index) => (
          <div
            key={section.section}
            className="rounded-xl border border-dashed border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))/0.5] p-3.5"
          >
            <div className="mb-2.5 flex items-baseline gap-2 border-b border-[hsl(var(--hairline))] pb-2">
              <span className="font-serif text-[12px] font-semibold tabular-nums text-[hsl(var(--career-gold))]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="text-[14px] font-bold">{section.section}</h3>
              <span className="ml-auto font-serif text-[10px] tracking-[0.14em] text-muted-foreground/80">
                {SECTION_EN[section.section] ?? ''}
              </span>
              <span className="text-[11px] tabular-nums text-muted-foreground">{section.lines.length}개</span>
            </div>
            <ul className="space-y-2">
              {section.lines.map((line) => (
                <li
                  key={line.text}
                  className="flex items-center gap-2 rounded-lg border border-[hsl(var(--hairline))] bg-card px-3 py-2 text-[13px]"
                >
                  <span className="min-w-0 flex-1">{line.text}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/80">{line.date}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-[12px] text-muted-foreground">
        위 입력줄에 첫 줄을 적으면, 당신의 보드가 자라나기 시작해요.
      </p>
    </div>
  );
}

/** 목적별 뽑아쓰기 — EXTRACT 필에서 목적이 정해진 채로 열린다. */
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
          <DialogTitle className="text-[15px]">보드의 자산으로 {purpose} 만들기</DialogTitle>
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
