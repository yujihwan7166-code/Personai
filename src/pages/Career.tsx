/**
 * 스펙 보드 — /career ("교정 중인 원고" 컨셉, 2단 작성대 레이아웃).
 *
 * 책상 위 두 개의 종이:
 *   [왼쪽 작성대] "커리어 추가" 메모대 — 캡처 박스·해보기·변신 카드 + AI 도구
 *   [오른쪽 원고] 이중 괘선 액자 — 헤더 밴드(사진·이름·소개·인장) + 기록 + 메타
 * 왼쪽에서 적은 한 줄이 AI 문장으로 변신해 오른쪽 원고의 행으로 날아가 꽂힌다
 * (framer layoutId 공유 — 두 창을 가로지르는 시그니처 모션).
 *
 * 종이 위 잉크: 문장 명조(career-serif) · 숫자 모노(career-mono) ·
 * 강조는 교정 빨강(--career-red) 하나. 보조 문구는 한국어만.
 * 문서 뷰는 이력서 지면처럼 3열(문장|날짜|세부), 섹션당 5개 프리뷰.
 */
import { useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { Copy, Download, ExternalLink, Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { useCareerBoard } from '@/hooks/useCareer';
import { careerStore } from '@/services/careerStore';
import { aiClassifySpec, aiComposeCareerDoc, aiRecommendSpecs, type ComposePurpose } from '@/lib/career/ai';
import { PERSONA_LABEL, type CareerPersona, type SpecItem } from '@/types/career';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  { purpose: '이력서', label: 'AI 이력서 생성' },
  { purpose: '자기소개서 초안', label: 'AI 자소서 생성' },
  { purpose: '포트폴리오 요약', label: 'AI 포트폴리오 생성' },
];

/** 섹션당 기본 노출 개수 — 넘어가면 "더 보기"로 펼친다. */
const SECTION_PREVIEW = 5;

/** 입력 → AI 변신 단계. idle = 입력 대기. */
type CapturePhase =
  | { step: 'idle' }
  | { step: 'thinking'; raw: string }
  | { step: 'reveal'; raw: string; refined: string; category: string };

const formatMonth = (iso: string) => iso.slice(0, 7).replace('-', '.');

/** 기간 표기 — 2025.03–현재 / 2025.03–2026.01 / 2026.07. */
const formatPeriod = (item: SpecItem) =>
  `${formatMonth(item.date)}${item.ongoing ? '–현재' : item.endDate ? `–${formatMonth(item.endDate)}` : ''}`;

/** 작성대 → 원고 행 공유 레이아웃 id. */
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

/** 증명사진 읽기 — 세로 480px 로 줄여 localStorage 부담을 낮춘다. */
const readPhoto = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 480 / img.height);
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽지 못했어요'));
    };
    img.src = url;
  });

export default function Career() {
  const { profile } = useCareerBoard();

  return (
    <div className="career-theme min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-3 pb-20 pt-8 sm:px-6 sm:pt-10">
        {profile.persona === '' ? <SetupLedger /> : <BoardLedger />}
      </div>
    </div>
  );
}

/** 표제 아래 굵은 괘선 — 원고의 시작. */
function TitleRule() {
  return <div aria-hidden className="border-b-2 border-[hsl(var(--foreground)/0.75)]" />;
}

/** 장부 프레임 — 이중 괘선 액자, 안쪽은 책상보다 밝은 원고지 톤. */
function LedgerFrame({ children }: { children: ReactNode }) {
  return (
    <div className="border border-[hsl(var(--foreground)/0.45)] bg-[hsl(var(--surface-1))] p-[3px]">
      <div className="overflow-hidden border border-[hsl(var(--foreground)/0.16)] px-4 py-7 sm:px-9 sm:py-8">
        {children}
      </div>
    </div>
  );
}

/* ═══════════════ 첫 설정 — 신분 선택 → 칸 준비 ═══════════════ */

function SetupLedger() {
  const seed = (persona: CareerPersona) => {
    SEED_CATEGORIES[persona].forEach((name) => careerStore.ensureCategory(name));
    careerStore.setProfile({ persona });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <LedgerFrame>
        <header className="min-w-0">
          <h1 className="career-serif text-[26px] font-bold leading-tight tracking-tight">나의 커리어</h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            이룬 것을 한 줄씩 쌓아두는, 아직 완성되지 않은 이력서의 원본
          </p>
        </header>
        <div className="mt-4">
          <TitleRule />
        </div>
        <p className="mt-10 text-center text-[11.5px] tracking-wide text-muted-foreground">
          원고의 뼈대를 준비해요
        </p>
        <h2 className="career-serif mt-2 text-center text-[21px] font-bold tracking-tight">
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
      </LedgerFrame>
    </div>
  );
}

/* ═══════════════ 원고 본체 — 좌 작성대 · 우 원고 ═══════════════ */

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
  const [editingName, setEditingName] = useState(false);
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  // 작성 폼 — 칸('auto' = AI 분류) · 기간 · 기관 · 링크 · 세부. 전부 선택 사항.
  const [advCategory, setAdvCategory] = useState<string>('auto');
  const [advDate, setAdvDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [advEndDate, setAdvEndDate] = useState('');
  const [advOngoing, setAdvOngoing] = useState(false);
  const [advOrg, setAdvOrg] = useState('');
  const [advLink, setAdvLink] = useState('');
  const [advDetail, setAdvDetail] = useState('');
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

  const busy = phase.step !== 'idle';
  const persona = (profile.persona || 'student') as CareerPersona;

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async (rawInput?: string) => {
    const raw = (rawInput ?? draft).trim();
    if (!raw || busy) return;
    // 폼 값은 제출 시점에 스냅샷 — 칸 지정 시 AI 분류를 덮어쓴다.
    const forcedCategory = advCategory !== 'auto' ? advCategory : null;
    const dateOverride = /^\d{4}-\d{2}-\d{2}$/.test(advDate) ? advDate : undefined;
    const endOverride = !advOngoing && /^\d{4}-\d{2}-\d{2}$/.test(advEndDate) ? advEndDate : undefined;
    const ongoingPre = advOngoing;
    const orgPre = advOrg.trim();
    const linkPre = advLink.trim();
    const detailPre = advDetail.trim();
    setDraft('');
    if (recentTimer.current) window.clearTimeout(recentTimer.current);
    setRecentId(null);
    setPhase({ step: 'thinking', raw });
    const result = await aiClassifySpec(raw, categories.map((c) => c.name));
    const categoryName = forcedCategory ?? result.category;
    setPhase({ step: 'reveal', raw, refined: result.refined, category: categoryName });
    // 변신을 잠깐 보여준 뒤 — 같은 줄이 layoutId 로 오른쪽 원고의 행까지 날아간다.
    window.setTimeout(() => {
      const item = careerStore.addItem({
        raw,
        refined: result.refined,
        categoryName,
        date: dateOverride,
        endDate: endOverride,
        ongoing: ongoingPre || undefined,
        org: orgPre || undefined,
        link: linkPre || undefined,
        detail: detailPre || undefined,
      });
      // 칸·시작 날짜는 유지(같은 시기 연속 입력), 나머지는 초기화.
      setAdvDetail('');
      setAdvOrg('');
      setAdvLink('');
      setAdvEndDate('');
      setAdvOngoing(false);
      setRecentId(item.id);
      setPhase({ step: 'idle' });
      recentTimer.current = window.setTimeout(() => setRecentId(null), 2400);
      // 사후 상세화 코치 — "얕게 넣고, 나중에 교정 질문으로 채운다"를 처음 3번만 안내.
      if (!detailPre) {
        try {
          const COACH_KEY = 'career.coach.detail.v1';
          const seen = Number(window.localStorage.getItem(COACH_KEY) ?? '0');
          if (seen < 3) {
            window.localStorage.setItem(COACH_KEY, String(seen + 1));
            notify.success('원고에 꽂았어요', {
              description: '방금 줄을 누르면, 교정 질문이 빠진 세부를 채워줘요.',
            });
          }
        } catch { /* noop */ }
      }
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

  const onPickPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      careerStore.setProfile({ photo: await readPhoto(file) });
    } catch {
      notify.error('사진을 불러오지 못했어요');
    }
  };

  /* 원고 행 — 카드 뷰용 (문장 + 날짜, 세부 미리보기 아래 1줄). */
  const renderCardRow = (item: SpecItem) => (
    <div
      draggable
      onDragStart={(e: DragEvent) => e.dataTransfer.setData('text/plain', item.id)}
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
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label="증빙 링크 열기"
            title={item.link}
            className="shrink-0 self-center text-muted-foreground/60 transition-colors hover:text-[hsl(var(--career-red))]"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <span className="career-mono shrink-0 text-[11px] text-muted-foreground transition-opacity group-hover:opacity-0">
          {formatPeriod(item)}
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
      {(item.org || item.detail) && (
        <p className="mt-0.5 line-clamp-1 text-[12px] leading-relaxed text-muted-foreground/85">
          {[item.org, item.detail].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  );

  /* 원고 행 — 문서 뷰용 (이력서 지면 3열: 문장 | 날짜 | 세부). */
  return (
    <>
      <LayoutGroup>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,330px)]">
          {/* ══════ 우 — 커리어 추가 작성대 (모바일에선 위) ══════ */}
          <aside className="space-y-4 lg:sticky lg:top-5 lg:order-2">
            {/* AI 도구 — 원고에 적용하는 도구들 (작성대 위) */}
            <div className="border border-[hsl(var(--foreground)/0.4)] bg-[hsl(var(--surface-1))] p-4">
              <h3 className="text-[11.5px] font-semibold text-muted-foreground/70">AI 도구</h3>
              <div className="mt-2.5 space-y-1.5">
                {COMPOSE_PURPOSES.map(({ purpose, label }) => (
                  <button
                    key={purpose}
                    type="button"
                    onClick={() => setComposePurpose(purpose)}
                    disabled={items.length === 0}
                    title={items.length === 0 ? '기록이 쌓이면 쓸 수 있어요' : '쌓인 기록으로 문서를 만들어요'}
                    className={cn(
                      'group flex w-full items-center justify-between border px-3 py-2 text-[12.5px] font-medium transition-colors',
                      items.length === 0
                        ? 'cursor-not-allowed border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))] text-muted-foreground/45'
                        : 'border-[hsl(var(--foreground)/0.3)] bg-[hsl(var(--surface-2))] text-foreground hover:border-[hsl(var(--career-red))] hover:text-[hsl(var(--career-red))]',
                    )}
                  >
                    {label}
                    <span className={cn('text-[12px]', items.length > 0 && 'text-[hsl(var(--career-red))]')}>→</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRecommendOpen(true)}
                  title="지금 원고를 보고 다음에 쌓을 스펙을 추천해요"
                  className="group flex w-full items-center justify-between border border-[hsl(var(--foreground)/0.3)] bg-[hsl(var(--surface-2))] px-3 py-2 text-[12.5px] font-medium text-foreground transition-colors hover:border-[hsl(var(--career-red))] hover:text-[hsl(var(--career-red))]"
                >
                  추천 스펙
                  <span className="text-[12px] text-[hsl(var(--career-red))]">→</span>
                </button>
              </div>
            </div>

            <div className="border border-[hsl(var(--foreground)/0.4)] bg-[hsl(var(--surface-1))] p-4">
              {/* 작성대 표제 — 섹션 헤더와 같은 문법 (빨간 마크 + 명조 + 괘선) */}
              <div className="flex items-baseline gap-2 border-b border-[hsl(var(--foreground)/0.55)] pb-2">
                <span className="career-mono text-[12px] font-semibold text-[hsl(var(--career-red))]">+</span>
                <h2 className="career-serif text-[16px] font-bold tracking-tight">커리어 추가</h2>
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                한 줄로 적으면, 다듬어서 원고에 정리해 드려요
              </p>

              {/* 캡처 박스 — 이 작성대의 주인공. 막 적어도 AI가 정리한다. */}
              <div
                className={cn(
                  'mt-2.5 flex items-center border bg-[hsl(var(--surface-2))] transition-all',
                  'border-[hsl(var(--foreground)/0.5)]',
                  'focus-within:border-[hsl(var(--career-red))] focus-within:shadow-[0_0_0_3px_hsl(var(--career-red)/0.12)]',
                )}
              >
                <span aria-hidden className="my-2 ml-3 w-[3px] shrink-0 self-stretch bg-[hsl(var(--career-red))]" />
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="뭐든 이룬 것, 막 적어도 돼요"
                  aria-label="스펙 입력"
                  className="career-serif h-12 min-w-0 flex-1 bg-transparent px-3 text-[14.5px] outline-none placeholder:text-muted-foreground/50"
                />
                <span className="hidden shrink-0 pr-3 text-[10.5px] text-muted-foreground/60 sm:block">⏎</span>
              </div>

              {/* 해보기 — 기록이 적을 때만 */}
              {items.length < 3 && phase.step === 'idle' && (
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="text-[11px] text-muted-foreground/60">해보기</span>
                  {TRY_EXAMPLES[persona].map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => void submit(example)}
                      className="text-[12px] text-secondary-foreground underline decoration-[hsl(var(--foreground)/0.3)] underline-offset-4 transition-colors hover:text-[hsl(var(--career-red))] hover:decoration-[hsl(var(--career-red))]"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              )}

              {/* 작성 폼 — 전부 선택 사항. 내용만 적고 엔터 쳐도 된다. */}
              <div className="mt-3 space-y-3 border-t border-dashed border-[hsl(var(--hairline))] pt-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="career-adv-category" className="career-mono mb-1 block text-[10px] tracking-[0.14em] text-muted-foreground">
                      칸
                    </label>
                    <select
                      id="career-adv-category"
                      value={advCategory}
                      onChange={(e) => setAdvCategory(e.target.value)}
                      className="h-9 w-full border border-[hsl(var(--foreground)/0.35)] bg-[hsl(var(--surface-2))] px-2 text-[12.5px] outline-none focus:border-[hsl(var(--career-red))]"
                    >
                      <option value="auto">자동 분류 (추천)</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="career-adv-org" className="career-mono mb-1 block text-[10px] tracking-[0.14em] text-muted-foreground">
                      기관·주최
                    </label>
                    <input
                      id="career-adv-org"
                      value={advOrg}
                      onChange={(e) => setAdvOrg(e.target.value)}
                      placeholder="발급처·주최 (선택)"
                      className="h-9 w-full border border-[hsl(var(--foreground)/0.35)] bg-[hsl(var(--surface-2))] px-2 text-[12.5px] outline-none placeholder:text-muted-foreground/45 focus:border-[hsl(var(--career-red))]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="career-adv-date" className="career-mono mb-1 block text-[10px] tracking-[0.14em] text-muted-foreground">
                      시작
                    </label>
                    <input
                      id="career-adv-date"
                      type="date"
                      value={advDate}
                      onChange={(e) => setAdvDate(e.target.value)}
                      className="career-mono h-9 w-full border border-[hsl(var(--foreground)/0.35)] bg-[hsl(var(--surface-2))] px-2 text-[12px] outline-none focus:border-[hsl(var(--career-red))]"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex items-baseline justify-between">
                      <label htmlFor="career-adv-end" className="career-mono block text-[10px] tracking-[0.14em] text-muted-foreground">
                        종료
                      </label>
                      <label className="flex cursor-pointer items-center gap-1 text-[10.5px] text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={advOngoing}
                          onChange={(e) => setAdvOngoing(e.target.checked)}
                          className="h-3 w-3 accent-[hsl(var(--career-red))]"
                        />
                        진행 중
                      </label>
                    </div>
                    <input
                      id="career-adv-end"
                      type="date"
                      value={advOngoing ? '' : advEndDate}
                      onChange={(e) => setAdvEndDate(e.target.value)}
                      disabled={advOngoing}
                      className="career-mono h-9 w-full border border-[hsl(var(--foreground)/0.35)] bg-[hsl(var(--surface-2))] px-2 text-[12px] outline-none focus:border-[hsl(var(--career-red))] disabled:opacity-45"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="career-adv-link" className="career-mono mb-1 block text-[10px] tracking-[0.14em] text-muted-foreground">
                    증빙 링크
                  </label>
                  <input
                    id="career-adv-link"
                    value={advLink}
                    onChange={(e) => setAdvLink(e.target.value)}
                    placeholder="https:// — 포트폴리오·수상 페이지 (선택)"
                    className="career-mono h-9 w-full border border-[hsl(var(--foreground)/0.35)] bg-[hsl(var(--surface-2))] px-2 text-[11.5px] outline-none placeholder:text-muted-foreground/45 focus:border-[hsl(var(--career-red))]"
                  />
                </div>
                <div>
                  <label htmlFor="career-adv-detail" className="career-mono mb-1 block text-[10px] tracking-[0.14em] text-muted-foreground">
                    세부사항
                  </label>
                  <textarea
                    id="career-adv-detail"
                    value={advDetail}
                    onChange={(e) => setAdvDetail(e.target.value)}
                    rows={2}
                    placeholder="상황 · 내가 한 일 · 결과 (선택)"
                    className="w-full resize-none border border-[hsl(var(--foreground)/0.35)] bg-[hsl(var(--surface-2))] p-2.5 text-[12.5px] leading-relaxed outline-none placeholder:text-muted-foreground/45 focus:border-[hsl(var(--career-red))]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={!draft.trim() || busy}
                  className="h-9 w-full bg-primary text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-45"
                >
                  원고에 추가
                </button>
              </div>

              {/* 변신 줄 — 여기서 다듬어져 오른쪽 원고로 날아간다 */}
              <AnimatePresence>
                {phase.step !== 'idle' && (
                  <motion.div
                    layoutId={INCOMING}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-center border border-[hsl(var(--foreground)/0.35)] bg-[hsl(var(--surface-2))] py-2.5"
                  >
                    <span aria-hidden className="ml-3 w-[3px] shrink-0 self-stretch bg-[hsl(var(--career-red))]" />
                    {phase.step === 'thinking' ? (
                      <div className="flex min-w-0 flex-1 items-center gap-2 px-3 text-[13px]">
                        <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[hsl(var(--career-red))]" />
                        <span className="career-serif min-w-0 flex-1 truncate text-muted-foreground">{phase.raw}</span>
                        <span className="shrink-0 text-[10.5px] text-[hsl(var(--career-red))]">교정 중…</span>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ rotateX: -80, opacity: 0 }}
                        animate={{ rotateX: 0, opacity: 1 }}
                        transition={{ duration: 0.34, ease: 'easeOut' }}
                        className="flex min-w-0 flex-1 items-center gap-2 px-3 text-[13.5px]"
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

          </aside>

          {/* ══════ 좌 — 원고 ══════ */}
          <div className="min-w-0 lg:order-1">
            <LedgerFrame>
              {/* ── 헤더 밴드 — 사진·이름·소개, 우상단 인장 ── */}
              <div className="relative -mx-4 -mt-7 bg-[hsl(var(--surface-2))] px-4 pb-5 pt-6 sm:-mx-9 sm:-mt-8 sm:px-9 sm:pt-7">
                {/* 붉은 인장 — 아직 완성되지 않은 원고 */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute right-4 top-5 rotate-[7deg] border-2 border-[hsl(var(--career-red)/0.55)] px-1.5 py-0.5 sm:right-8"
                >
                  <span className="career-serif text-[11.5px] font-bold tracking-[0.24em] text-[hsl(var(--career-red)/0.75)]">
                    기록 중
                  </span>
                </div>

                <div className="flex items-start gap-4 sm:gap-5">
                  {/* 사진 슬롯 — 선택형, 클릭해서 업로드 */}
                  <label
                    className="group relative block h-[104px] w-[80px] shrink-0 cursor-pointer overflow-hidden border border-[hsl(var(--foreground)/0.35)] bg-card transition-colors hover:border-[hsl(var(--career-red))]"
                    title={profile.photo ? '사진 바꾸기' : '사진 추가'}
                  >
                    {profile.photo ? (
                      <img src={profile.photo} alt="증명사진" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground/50">
                        <Plus className="h-3.5 w-3.5" />
                        <span className="text-[10px]">사진</span>
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void onPickPhoto(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                    {profile.photo && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          careerStore.setProfile({ photo: undefined });
                        }}
                        aria-label="사진 삭제"
                        title="사진 삭제"
                        className="absolute right-0.5 top-0.5 bg-card/85 p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-[hsl(var(--career-red))] group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </label>

                  <div className="min-w-0 flex-1">
                    {editingName ? (
                      <input
                        autoFocus
                        defaultValue={profile.name}
                        onBlur={(e) => {
                          careerStore.setProfile({ name: e.target.value.trim() });
                          setEditingName(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.nativeEvent.isComposing) (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') setEditingName(false);
                        }}
                        placeholder="이름"
                        aria-label="이름"
                        className="career-serif w-[200px] border-b-2 border-[hsl(var(--career-red))] bg-transparent text-[24px] font-bold tracking-tight outline-none placeholder:text-muted-foreground/40"
                      />
                    ) : (
                      <button type="button" onClick={() => setEditingName(true)} title="이름 수정" className="text-left">
                        <h1 className="career-serif text-[24px] font-bold leading-tight tracking-tight decoration-[hsl(var(--foreground)/0.3)] decoration-dotted underline-offset-[6px] hover:underline">
                          {profile.name ? `${profile.name}님의 커리어` : '나의 커리어'}
                        </h1>
                      </button>
                    )}
                    {/* 소개 — 2~3줄, blur 시 저장 */}
                    <textarea
                      defaultValue={profile.tagline}
                      onBlur={(e) => careerStore.setProfile({ tagline: e.target.value.trim() })}
                      rows={2}
                      placeholder={
                        persona === 'worker'
                          ? '짧은 소개 — 예: 3년차 프론트엔드 개발자.\n결제·정산 도메인에서 성능 개선을 주로 해왔어요.'
                          : '짧은 소개 — 예: 컴퓨터공학 3학년.\n웹 개발 동아리에서 프로젝트를 이끌고 있어요.'
                      }
                      aria-label="짧은 소개"
                      className="mt-1.5 w-full max-w-[440px] resize-none bg-transparent text-[12.5px] leading-relaxed text-muted-foreground outline-none placeholder:text-muted-foreground/45"
                    />
                  </div>
                </div>
              </div>
              <TitleRule />

              {/* ────── 기록 — 2열 장부 ────── */}
              <div className="mt-4 grid items-start gap-x-8 gap-y-7 md:grid-cols-2">
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
                        <>
                          <ul className="divide-y divide-[hsl(var(--hairline))]">
                            <AnimatePresence initial={false}>
                              {(expandedSections.has(category.id) ? sectionItems : sectionItems.slice(0, SECTION_PREVIEW)).map((item) => (
                                <motion.li
                                  key={item.id}
                                  layout
                                  layoutId={item.id === recentId ? INCOMING : undefined}
                                  initial={item.id === recentId ? false : { opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                                >
                                  {renderCardRow(item)}
                                </motion.li>
                              ))}
                            </AnimatePresence>
                          </ul>
                          {sectionItems.length > SECTION_PREVIEW && (
                            <button
                              type="button"
                              onClick={() => toggleSection(category.id)}
                              className="mt-1.5 px-2 text-[11.5px] text-muted-foreground/70 underline decoration-[hsl(var(--foreground)/0.25)] underline-offset-4 transition-colors hover:text-[hsl(var(--career-red))] hover:decoration-[hsl(var(--career-red))]"
                            >
                              {expandedSections.has(category.id)
                                ? '접기'
                                : `${sectionItems.length - SECTION_PREVIEW}개 더 보기`}
                            </button>
                          )}
                        </>
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

            </LedgerFrame>
          </div>
        </div>
      </LayoutGroup>

      <ComposeDialog purpose={composePurpose} onClose={() => setComposePurpose(null)} />
      <DetailDialog item={detailItem} onClose={() => setDetailItem(null)} />
      <RecommendDialog open={recommendOpen} personaLabel={PERSONA_LABEL[persona]} onClose={() => setRecommendOpen(false)} />
    </>
  );
}

/** 섹션 헤더 — 빨간 인덱스 번호 + 명조 제목, 진한 괘선. */
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
      <span className="ml-auto" />
      {count === 0 && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${name} 칸 삭제`}
          title="빈 칸 삭제"
          className="p-0.5 text-transparent transition-colors hover:!text-[hsl(var(--career-red))] group-hover/section:text-muted-foreground/70"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ═══════════════ 세부사항 다이얼로그 ═══════════════ */

function DetailDialog({ item, onClose }: { item: SpecItem | null; onClose: () => void }) {
  return (
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="career-theme max-w-lg">
        {item && <DetailForm key={item.id} item={item} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function DetailForm({ item, onClose }: { item: SpecItem; onClose: () => void }) {
  const [refined, setRefined] = useState(item.refined);
  const [date, setDate] = useState(item.date);
  const [endDate, setEndDate] = useState(item.endDate ?? '');
  const [ongoing, setOngoing] = useState(item.ongoing === true);
  const [org, setOrg] = useState(item.org ?? '');
  const [link, setLink] = useState(item.link ?? '');
  const [detail, setDetail] = useState(item.detail ?? '');

  const save = () => {
    careerStore.updateItem(item.id, {
      refined: refined.trim() || item.refined,
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : item.date,
      endDate: !ongoing && /^\d{4}-\d{2}-\d{2}$/.test(endDate) ? endDate : undefined,
      ongoing: ongoing || undefined,
      org: org.trim() || undefined,
      link: link.trim() || undefined,
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
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="career-detail-date" className="career-mono mb-1 block text-[10px] tracking-[0.14em] text-muted-foreground">
              시작
            </label>
            <input
              id="career-detail-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="career-mono h-10 w-full border border-[hsl(var(--foreground)/0.35)] bg-[hsl(var(--surface-2))] px-3 text-[12.5px] outline-none focus:border-[hsl(var(--career-red))]"
            />
          </div>
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label htmlFor="career-detail-end" className="career-mono block text-[10px] tracking-[0.14em] text-muted-foreground">
                종료
              </label>
              <label className="flex cursor-pointer items-center gap-1 text-[10.5px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={ongoing}
                  onChange={(e) => setOngoing(e.target.checked)}
                  className="h-3 w-3 accent-[hsl(var(--career-red))]"
                />
                진행 중
              </label>
            </div>
            <input
              id="career-detail-end"
              type="date"
              value={ongoing ? '' : endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={ongoing}
              className="career-mono h-10 w-full border border-[hsl(var(--foreground)/0.35)] bg-[hsl(var(--surface-2))] px-3 text-[12.5px] outline-none focus:border-[hsl(var(--career-red))] disabled:opacity-45"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="career-detail-org" className="career-mono mb-1 block text-[10px] tracking-[0.14em] text-muted-foreground">
              기관·주최
            </label>
            <input
              id="career-detail-org"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="발급처·주최 (선택)"
              className="h-10 w-full border border-[hsl(var(--foreground)/0.35)] bg-[hsl(var(--surface-2))] px-3 text-[12.5px] outline-none placeholder:text-muted-foreground/45 focus:border-[hsl(var(--career-red))]"
            />
          </div>
          <div>
            <label htmlFor="career-detail-link" className="career-mono mb-1 block text-[10px] tracking-[0.14em] text-muted-foreground">
              증빙 링크
            </label>
            <input
              id="career-detail-link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https:// (선택)"
              className="career-mono h-10 w-full border border-[hsl(var(--foreground)/0.35)] bg-[hsl(var(--surface-2))] px-3 text-[11.5px] outline-none placeholder:text-muted-foreground/45 focus:border-[hsl(var(--career-red))]"
            />
          </div>
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

/* ═══════════════ AI 생성 다이얼로그 ═══════════════ */

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

/* ═══════════════ 추천 스펙 다이얼로그 ═══════════════ */

function RecommendDialog({ open, personaLabel, onClose }: { open: boolean; personaLabel: string; onClose: () => void }) {
  const { items, categories } = useCareerBoard();
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');

  const generate = async () => {
    setGenerating(true);
    setResult('');
    try {
      const sections = categories.map((category) => ({
        name: category.name,
        items: items.filter((item) => item.categoryId === category.id),
      }));
      setResult(await aiRecommendSpecs(personaLabel, sections));
    } catch (err) {
      notify.error('추천을 불러오지 못했어요', {
        description: err instanceof Error ? err.message : '잠시 뒤 다시 시도해 주세요.',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { setResult(''); onClose(); } }}>
      <DialogContent className="career-theme max-w-lg">
        <DialogHeader>
          <DialogTitle className="career-serif text-[16px]">추천 스펙</DialogTitle>
        </DialogHeader>
        <p className="text-[12.5px] text-muted-foreground">
          지금 원고를 보고, 다음에 쌓으면 좋을 스펙을 골라드려요.
        </p>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={generating}
          className="inline-flex h-9 items-center justify-center gap-1.5 bg-primary px-3 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-55"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {generating ? '고르는 중…' : '추천 받기'}
        </button>
        {result && (
          <div className="max-h-64 overflow-y-auto whitespace-pre-line border border-[hsl(var(--foreground)/0.35)] bg-[hsl(var(--surface-2))] p-3.5 text-[13px] leading-relaxed">
            {result}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
