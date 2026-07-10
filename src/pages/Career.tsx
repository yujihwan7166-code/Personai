/**
 * 스펙 보드 — /career ("교정 중인 원고" 컨셉, 2단 작성대 레이아웃).
 *
 * 플래너와 같은 풀블리드 셸 (2026-07-09):
 *   [페이지 헤더] "마이 커리어" + 기록 중 인장, 아래 굵은 괘선
 *   [좌 원고 본문] 프로필 스트립(사진·이름·소개) + 기록 2열 그리드
 *   [우 작성대 패널] border-l 분리 — "원고로 만들기" 2칸 타일 + 만든 문서 보관함(위)
 *   + "커리어 추가"(아래). 문서 생성은 요청사항 입력 → 생성 → 보관함 자동 저장.
 * 왼쪽에서 적은 한 줄이 AI 문장으로 변신해 오른쪽 원고의 행으로 날아가 꽂힌다
 * (framer layoutId 공유 — 두 창을 가로지르는 시그니처 모션).
 *
 * 종이 위 잉크: 문장 명조(career-serif) · 숫자 모노(career-mono) ·
 * 강조는 교정 빨강(--career-red) 하나. 보조 문구는 한국어만.
 * 기록은 2열 카드 뷰 고정, 섹션당 5개 프리뷰(+더 보기). 서체는 플래너와 동일(Pretendard).
 */
import { useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { Copy, Download, ExternalLink, Loader2, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { useCareerBoard } from '@/hooks/useCareer';
import { careerStore } from '@/services/careerStore';
import { aiClassifySpec, aiComposeCareerDoc, aiRecommendSpecs, type ComposePurpose } from '@/lib/career/ai';
import { PERSONA_LABEL, type CareerDoc, type CareerPersona, type SpecItem } from '@/types/career';
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
  { purpose: '이력서', label: '이력서 초안' },
  { purpose: '자기소개서 초안', label: '자기소개서 초안' },
  { purpose: '포트폴리오 요약', label: '포트폴리오 요약' },
];

/** 섹션당 기본 노출 개수 — 넘어가면 "더 보기"로 펼친다. */
const SECTION_PREVIEW = 5;

/** 입력 → AI 변신 단계. idle = 입력 대기. */
type CapturePhase =
  | { step: 'idle' }
  | { step: 'thinking'; raw: string }
  /** 직접 작성 — 잠깐 보여주고 자동으로 원고에 꽂힌다. */
  | { step: 'reveal'; raw: string; refined: string; category: string }
  /** AI 작성 — 초안을 세워두고 사용자의 결정(넣기/다시/취소)을 기다린다.
   * dateFound=false 면 날짜를 못 뽑은 것 → 초안에서 한 번 되묻는다. */
  | { step: 'draft'; raw: string; refined: string; category: string; dateFound: boolean };

type WriteMode = 'ai' | 'direct';
const WRITE_MODE_KEY = 'career.writeMode.v1';

const formatMonth = (iso: string) => iso.slice(0, 7).replace('-', '.');

/** 기간 표기 — 시작·종료가 같은 달이면 한 번만 (2025.03), 다르면 범위(2025.03–2026.01). */
const periodLabel = (date: string, opts?: { endDate?: string; ongoing?: boolean }): string => {
  const start = formatMonth(date);
  if (opts?.ongoing) return `${start}–현재`;
  if (opts?.endDate) {
    const end = formatMonth(opts.endDate);
    return end === start ? start : `${start}–${end}`;
  }
  return start;
};

const formatPeriod = (item: SpecItem) =>
  periodLabel(item.date, { endDate: item.endDate, ongoing: item.ongoing });

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
      {profile.persona === '' ? (
        <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-6">
          <SetupLedger />
        </div>
      ) : (
        <div className="pb-16">
          <BoardLedger />
        </div>
      )}
    </div>
  );
}

/** 표제 아래 굵은 괘선 — 종이 양끝까지 가로지른다 (프레임 패딩 상쇄). */
function TitleRule() {
  return <div aria-hidden className="-mx-4 border-b-2 border-[hsl(var(--foreground)/0.75)] sm:-mx-9" />;
}

/** 장부 프레임 — 책상 위에 얹힌 원고지 한 장. 테두리 대신 종이 그림자로 뜬다. */
function LedgerFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-4 py-7 shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_16px_40px_-24px_hsl(var(--foreground)/0.25)] sm:px-9 sm:py-8">
      {children}
    </div>
  );
}

/** 교정 인장 — 아직 완성되지 않은 원고. 페이지 헤더에 찍는 인라인 칩, 찍은 달 포함. */
function ProofStamp() {
  const month = new Date().toISOString().slice(0, 7).replace('-', '.');
  return (
    <div
      aria-hidden
      className="pointer-events-none inline-flex rotate-[3deg] items-baseline gap-1.5 border-2 border-[hsl(var(--career-red)/0.55)] px-2 py-0.5 mix-blend-multiply dark:mix-blend-normal"
    >
      <span className="text-[11px] font-bold tracking-[0.18em] text-[hsl(var(--career-red)/0.8)]">기록 중</span>
      <span className="career-mono text-[9px] text-[hsl(var(--career-red)/0.6)]">{month}</span>
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
              className="group border-l-2 border-[hsl(var(--foreground)/0.25)] bg-transparent py-3 pl-4 pr-3 text-left transition-colors hover:border-[hsl(var(--career-red))]"
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
  const { items, categories, profile, docs } = useCareerBoard();
  const [phase, setPhase] = useState<CapturePhase>({ step: 'idle' });
  const [viewDoc, setViewDoc] = useState<CareerDoc | null>(null);
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
  const [writeMode, setWriteMode] = useState<WriteMode>(() => {
    try {
      return window.localStorage.getItem(WRITE_MODE_KEY) === 'direct' ? 'direct' : 'ai';
    } catch {
      return 'ai';
    }
  });
  // 작성 폼 — 칸('auto' = AI 분류) · 기간 · 기관 · 링크 · 세부. 전부 선택 사항.
  const [advCategory, setAdvCategory] = useState<string>('auto');
  const [advDate, setAdvDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [advEndDate, setAdvEndDate] = useState('');
  const [advOngoing, setAdvOngoing] = useState(false);
  const [advOrg, setAdvOrg] = useState('');
  const [advLink, setAdvLink] = useState('');
  const [advDetail, setAdvDetail] = useState('');
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
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

  /** 요약 통계 — 이번 달 기록 수(지난달 대비) · 채움도(기록 있는 칸/전체) · 빈 칸 이름. */
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}`;
    const thisCount = items.filter((i) => i.date.startsWith(thisMonth)).length;
    const lastCount = items.filter((i) => i.date.startsWith(lastMonth)).length;
    const filled = sections.filter((s) => s.items.length > 0).length;
    const emptyNames = sections.filter((s) => s.items.length === 0).map((s) => s.category.name);
    return { thisCount, delta: thisCount - lastCount, filled, total: sections.length, emptyNames };
  }, [items, sections]);

  /** AI가 분리한 기간 표기 (초안 카드용). */
  const draftPeriod = advDate ? periodLabel(advDate, { endDate: advEndDate, ongoing: advOngoing }) : '';

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** 직접 작성 — 구조화된 폼을 채워 바로 원고에 꽂는다 (잠깐 reveal 후 자동 커밋). */
  const submitDirect = async (rawInput?: string) => {
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
              description: '방금 줄을 누르면, 빠진 세부를 채울 수 있어요.',
            });
          }
        } catch { /* noop */ }
      }
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }, 800);
  };

  /** AI 작성 — 초안을 세워두고 사용자 결정을 기다린다 (자동 커밋 안 함).
   * AI가 문장을 이해해 날짜·기간·기관을 분리하면, 그 값으로 폼을 채운다. */
  const requestDraft = async (rawInput?: string) => {
    const raw = (rawInput ?? draft).trim();
    if (!raw || phase.step === 'thinking') return; // 'draft'(다시 다듬기)는 허용
    if (rawInput) setDraft(rawInput);
    setPhase({ step: 'thinking', raw });
    const result = await aiClassifySpec(raw, categories.map((c) => c.name));
    // 추출된 정보로 폼 반영 — 날짜를 뽑았으면 채우고, 못 뽑았으면 비워 되묻는다.
    setAdvDate(result.date ?? '');
    if (result.ongoing) {
      setAdvOngoing(true);
      setAdvEndDate('');
    } else if (result.endDate) {
      setAdvOngoing(false);
      setAdvEndDate(result.endDate);
    }
    if (result.org !== undefined) setAdvOrg(result.org);
    setPhase({ step: 'draft', raw, refined: result.refined, category: result.category, dateFound: !!result.date });
  };

  /** 초안을 원고에 넣는다(서랍에 넣기) — 기간(선택)까지 함께, 새 줄 하이라이트로 꽂힘. */
  const commitDraft = () => {
    if (phase.step !== 'draft') return;
    const { raw, refined, category } = phase;
    if (recentTimer.current) window.clearTimeout(recentTimer.current);
    const item = careerStore.addItem({
      raw,
      refined,
      categoryName: category,
      date: /^\d{4}-\d{2}-\d{2}$/.test(advDate) ? advDate : undefined,
      endDate: !advOngoing && /^\d{4}-\d{2}-\d{2}$/.test(advEndDate) ? advEndDate : undefined,
      ongoing: advOngoing || undefined,
      org: advOrg.trim() || undefined,
    });
    setDraft('');
    setAdvDate(new Date().toISOString().slice(0, 10));
    setAdvEndDate('');
    setAdvOngoing(false);
    setAdvOrg('');
    setPhase({ step: 'idle' });
    setRecentId(item.id);
    recentTimer.current = window.setTimeout(() => setRecentId(null), 2400);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const cancelDraft = () => setPhase({ step: 'idle' });

  const changeWriteMode = (mode: WriteMode) => {
    setWriteMode(mode);
    setPhase({ step: 'idle' });
    try { window.localStorage.setItem(WRITE_MODE_KEY, mode); } catch { /* noop */ }
  };

  /** 입력 엔터 — 모드에 따라 초안 요청(AI) 또는 직접 커밋. */
  const onInputKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    if (writeMode === 'ai' && event.shiftKey) return; // AI textarea 줄바꿈 허용
    event.preventDefault();
    if (writeMode === 'ai') void requestDraft();
    else void submitDirect();
  };

  /** 해보기 칩 — 모드에 맞게 초안 요청 또는 직접 제출. */
  const onTryExample = (example: string) => {
    if (writeMode === 'ai') void requestDraft(example);
    else void submitDirect(example);
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

  /** 빈 칸의 "첫 기록 추가" — 직접 작성 모드로 그 칸을 미리 골라 입력창에 포커스. */
  const startAddTo = (categoryName: string) => {
    changeWriteMode('direct');
    setAdvCategory(categoryName);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  /* 원고 행 — 카드(문장 + 날짜, 세부 미리보기 아래 1줄), 클릭하면 세부사항. */
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
        'group relative cursor-pointer px-2.5 py-2.5 transition-[background-color,box-shadow]',
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
    </div>
  );

  return (
    <>
      <LayoutGroup>
        {/* ══════ 마스트헤드 — 워크스페이스 공통: 도구 이름이 주인공(22px), 맥락(인장)은 옆에. 아래 굵은 괘선 ══════ */}
        <header className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b-2 border-[hsl(var(--foreground)/0.75)] px-4 pb-3 pt-3.5 sm:px-5">
          {/* 방 색 틴트 — 레일 P 마크와 짝. */}
          <h1 className="text-[27px] font-bold leading-tight tracking-tight text-[hsl(var(--career-red))]">마이 커리어</h1>
          <ProofStamp />
        </header>

        <div className="grid items-start lg:grid-cols-[minmax(0,1fr)_minmax(380px,470px)]">
          {/* ══════ 우 — 작성대 패널 (모바일에선 위) ══════ */}
          <aside className="lg:order-2">
            {/* 도구 도크 — 눌린 바닥 톤으로 왼쪽 보드와 분리, 그 위에 흰 카드 3장 */}
            <div className="space-y-3 bg-[hsl(var(--surface-3))] p-3 sm:p-4 lg:sticky lg:top-0">
            {/* 원고로 만들기 — 쌓인 기록에서 문서를 뽑는 도구 */}
            <section className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] p-4 shadow-[0_1px_2px_hsl(var(--foreground)/0.03)]">
              <div className="flex items-baseline gap-2 border-b border-[hsl(var(--hairline))] pb-2.5">
                <span className="career-mono text-[12px] font-semibold text-[hsl(var(--career-red))]">→</span>
                <h2 className="career-serif text-[16px] font-bold tracking-tight">원고로 만들기</h2>
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                {items.length === 0
                  ? '기록이 쌓이면 문서 초안을 뽑을 수 있어요.'
                  : '쌓인 기록으로 AI가 문서 초안을 뽑아드려요.'}
              </p>
              {/* 도구 — 2칸 타일 */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {COMPOSE_PURPOSES.map(({ purpose, label }) => (
                  <button
                    key={purpose}
                    type="button"
                    onClick={() => setComposePurpose(purpose)}
                    disabled={items.length === 0}
                    className={cn(
                      'group rounded-lg border px-3 py-2.5 text-left transition-colors',
                      items.length === 0
                        ? 'cursor-not-allowed border-[hsl(var(--hairline))] text-muted-foreground/40'
                        : 'border-[hsl(var(--hairline))] bg-[hsl(var(--card))] hover:border-[hsl(var(--career-red))]',
                    )}
                  >
                    <span
                      className={cn(
                        'block text-[13px] font-medium transition-colors',
                        items.length > 0 && 'group-hover:text-[hsl(var(--career-red))]',
                      )}
                    >
                      {label}
                    </span>
                    <span className="career-mono mt-0.5 block text-[10.5px] text-muted-foreground/55">뽑기 →</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRecommendOpen(true)}
                  title="지금 원고를 보고 다음에 쌓을 스펙을 추천해요"
                  className="group rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-3 py-2.5 text-left transition-colors hover:border-[hsl(var(--career-red))]"
                >
                  <span className="block text-[13px] font-medium transition-colors group-hover:text-[hsl(var(--career-red))]">
                    추천 스펙
                  </span>
                  <span className="career-mono mt-0.5 block text-[10.5px] text-muted-foreground/55">받기 →</span>
                </button>
              </div>
            </section>

            {/* 만든 문서 — 생성한 문서 보관함, 항상 보인다(발견성) */}
            <section className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] p-4 shadow-[0_1px_2px_hsl(var(--foreground)/0.03)]">
              <div className="flex items-baseline justify-between gap-2 border-b border-[hsl(var(--hairline))] pb-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="career-mono text-[12px] font-semibold text-[hsl(var(--career-red))]">▤</span>
                  <h2 className="text-[16px] font-bold tracking-tight">만든 문서</h2>
                </div>
                {docs.length > 0 && (
                  <span className="career-mono text-[11px] text-muted-foreground/55">{docs.length}건</span>
                )}
              </div>
              {docs.length === 0 ? (
                <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted-foreground/70">
                  위에서 문서를 만들면 여기에 저장돼요. 언제든 다시 열어보고 복사·다운로드할 수 있어요.
                </p>
              ) : (
                <ul className="mt-1 divide-y divide-[hsl(var(--hairline))]">
                  {docs.map((doc) => (
                    <li key={doc.id}>
                      <button
                        type="button"
                        onClick={() => setViewDoc(doc)}
                        className="group flex w-full items-baseline justify-between gap-2 py-2 text-left"
                      >
                        <span className="min-w-0 flex-1 truncate text-[13px] transition-colors group-hover:text-[hsl(var(--career-red))]">
                          <span className="font-medium">{doc.purpose}</span>
                          {doc.request && <span className="text-muted-foreground"> · {doc.request}</span>}
                        </span>
                        <span className="career-mono shrink-0 text-[10.5px] text-muted-foreground/55">
                          {doc.createdAt.slice(0, 10).replaceAll('-', '.')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] p-4 shadow-[0_1px_2px_hsl(var(--foreground)/0.03)]">
              {/* 작성대 표제 + 모드 토글 (AI 작성 / 직접 작성) */}
              <div className="flex items-baseline gap-2 border-b border-[hsl(var(--hairline))] pb-2">
                <span className="career-mono text-[12px] font-semibold text-[hsl(var(--career-red))]">+</span>
                <h2 className="career-serif text-[16px] font-bold tracking-tight">커리어 추가</h2>
                <div className="ml-auto flex items-center gap-2.5">
                  {([['ai', 'AI 작성'], ['direct', '직접 작성']] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => changeWriteMode(mode)}
                      aria-pressed={writeMode === mode}
                      className={cn(
                        'pb-0.5 text-[11.5px] transition-colors',
                        writeMode === mode
                          ? 'border-b-2 border-[hsl(var(--career-red))] font-bold text-foreground'
                          : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                {writeMode === 'ai'
                  ? '생각나는 대로 적으면 AI가 이력서 문장으로 다듬어드려요.'
                  : '칸·기간·세부까지 직접 채워 넣어요.'}
              </p>

              {writeMode === 'ai' ? (
                /* ── AI 작성 — 생각나는 대로 적기 → 초안 검토 → 서랍에 넣기 ── */
                <div className="mt-2.5">
                  {phase.step === 'idle' ? (
                    <>
                      <textarea
                        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={onInputKeyDown}
                        rows={2}
                        placeholder={`생각나는 대로 적어보세요 — 예: ${TRY_EXAMPLES[persona][0]}`}
                        aria-label="스펙 입력"
                        className={cn(
                          'career-serif min-h-[68px] w-full resize-none break-keep rounded-lg border bg-[hsl(var(--card))] px-3.5 py-2.5 text-[14.5px] leading-relaxed outline-none transition-all placeholder:text-muted-foreground/50',
                          'border-[hsl(var(--foreground)/0.25)]',
                          'focus:border-[hsl(var(--career-red))]',
                        )}
                      />

                      {items.length < 3 && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <span className="text-[11px] text-muted-foreground/60">해보기</span>
                          {TRY_EXAMPLES[persona].map((example) => (
                            <button
                              key={example}
                              type="button"
                              onClick={() => onTryExample(example)}
                              className="text-[12px] text-secondary-foreground underline decoration-[hsl(var(--foreground)/0.3)] underline-offset-4 transition-colors hover:text-[hsl(var(--career-red))] hover:decoration-[hsl(var(--career-red))]"
                            >
                              {example}
                            </button>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => void requestDraft()}
                        disabled={!draft.trim()}
                        className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-45"
                      >
                        <span>초안 만들기</span>
                        <span className="career-mono text-[10.5px] font-normal opacity-60">⏎</span>
                      </button>
                    </>
                  ) : phase.step === 'thinking' ? (
                    /* 다듬는 중 — 상자 없이, 적은 문장이 그대로 교정에 들어간 모습 */
                    <div className="flex items-center gap-2 py-3">
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[hsl(var(--career-red))]" />
                      <span className="career-serif min-w-0 flex-1 truncate text-[13.5px] text-muted-foreground">{phase.raw}</span>
                      <span className="career-mono shrink-0 text-[10.5px] text-[hsl(var(--career-red))]">교정 중…</span>
                    </div>
                  ) : (
                    /* 초안 검토 — 상자 없이 활자만: 원문에 빨간 줄, 고친 문장, 괘선 아래 되묻기 */
                    <div className="pt-1.5">
                      <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-[hsl(var(--hairline))] pb-1.5">
                        <p className="career-mono text-[11px] font-semibold text-[hsl(var(--career-red))]">초안</p>
                        <span
                          title="이 칸에 들어가요"
                          className="career-mono shrink-0 rounded border border-[hsl(var(--foreground)/0.3)] px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {phase.category}
                        </span>
                      </div>
                      {phase.raw.trim() !== phase.refined.trim() && (
                        <p className="career-serif text-[12.5px] leading-relaxed text-muted-foreground/70 line-through decoration-[hsl(var(--career-red)/0.5)]">
                          {phase.raw}
                        </p>
                      )}
                      <p className="career-serif mt-1 text-[15px] font-medium leading-relaxed">
                        <MetricText text={phase.refined} />
                      </p>
                      {(draftPeriod || advOrg.trim()) && (
                        <p className="career-mono mt-1.5 text-[11px] text-muted-foreground">
                          {[draftPeriod, advOrg.trim()].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {/* 되묻기 — 날짜를 못 뽑았으면 한 번 물어본다. */}
                      {!phase.dateFound && (
                        <div className="mt-2.5 border-t border-dashed border-[hsl(var(--hairline))] pt-2.5">
                          <p className="mb-1.5 text-[12px] text-foreground">
                            <span className="career-mono mr-1 text-[11px] font-semibold text-[hsl(var(--career-red))]">Q.</span>
                            언제쯤이었어요?
                          </p>
                          <input
                            type="month"
                            value={advDate ? advDate.slice(0, 7) : ''}
                            onChange={(e) => setAdvDate(e.target.value ? `${e.target.value}-01` : '')}
                            aria-label="언제쯤이었어요?"
                            className="career-mono h-10 w-full rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-3 text-[12px] outline-none focus:border-[hsl(var(--career-red))]"
                          />
                          <p className="mt-1 text-[10.5px] text-muted-foreground/70">안 적으면 오늘 날짜로 들어가요.</p>
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={commitDraft}
                          className="h-9 flex-1 rounded-lg bg-primary text-[12.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                        >
                          원고에 넣기
                        </button>
                        <button
                          type="button"
                          onClick={() => void requestDraft(phase.raw)}
                          className="h-9 rounded-lg border border-[hsl(var(--foreground)/0.35)] px-3 text-[12px] font-medium transition-colors hover:border-[hsl(var(--career-red))] hover:text-[hsl(var(--career-red))]"
                        >
                          다시 다듬기
                        </button>
                        <button
                          type="button"
                          onClick={cancelDraft}
                          className="h-8 px-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
              <>
              {/* ── 직접 작성 — 구조화된 폼 ── */}
              {/* 캡처 박스 */}
              <div
                className={cn(
                  'mt-2.5 flex items-center overflow-hidden rounded-lg border bg-[hsl(var(--card))] transition-all',
                  'border-[hsl(var(--foreground)/0.25)]',
                  'focus-within:border-[hsl(var(--career-red))]',
                )}
              >
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="뭐든 이룬 것"
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
                      onClick={() => onTryExample(example)}
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
                    <label htmlFor="career-adv-category" className="career-mono mb-1 block text-[11px] text-muted-foreground">
                      칸
                    </label>
                    <select
                      id="career-adv-category"
                      value={advCategory}
                      onChange={(e) => setAdvCategory(e.target.value)}
                      className="h-9 w-full rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-2 text-[12.5px] outline-none focus:border-[hsl(var(--career-red))]"
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
                    <label htmlFor="career-adv-org" className="career-mono mb-1 block text-[11px] text-muted-foreground">
                      기관·주최
                    </label>
                    <input
                      id="career-adv-org"
                      value={advOrg}
                      onChange={(e) => setAdvOrg(e.target.value)}
                      placeholder="발급처·주최 (선택)"
                      className="h-9 w-full rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-2 text-[12.5px] outline-none placeholder:text-muted-foreground/45 focus:border-[hsl(var(--career-red))]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="career-adv-date" className="career-mono mb-1 block text-[11px] text-muted-foreground">
                      시작
                    </label>
                    <input
                      id="career-adv-date"
                      type="date"
                      value={advDate}
                      onChange={(e) => setAdvDate(e.target.value)}
                      className="career-mono h-9 w-full rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-2 text-[12px] outline-none focus:border-[hsl(var(--career-red))]"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex items-baseline justify-between">
                      <label htmlFor="career-adv-end" className="career-mono block text-[11px] text-muted-foreground">
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
                      className="career-mono h-9 w-full rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-2 text-[12px] outline-none focus:border-[hsl(var(--career-red))] disabled:opacity-45"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="career-adv-link" className="career-mono mb-1 block text-[11px] text-muted-foreground">
                    증빙 링크
                  </label>
                  <input
                    id="career-adv-link"
                    value={advLink}
                    onChange={(e) => setAdvLink(e.target.value)}
                    placeholder="https:// — 포트폴리오·수상 페이지 (선택)"
                    className="career-mono h-9 w-full rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-2 text-[11.5px] outline-none placeholder:text-muted-foreground/45 focus:border-[hsl(var(--career-red))]"
                  />
                </div>
                <div>
                  <label htmlFor="career-adv-detail" className="career-mono mb-1 block text-[11px] text-muted-foreground">
                    세부사항
                  </label>
                  <textarea
                    id="career-adv-detail"
                    value={advDetail}
                    onChange={(e) => setAdvDetail(e.target.value)}
                    rows={2}
                    placeholder="상황 · 내가 한 일 · 결과 (선택)"
                    className="w-full resize-none rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-2.5 text-[12.5px] leading-relaxed outline-none placeholder:text-muted-foreground/45 focus:border-[hsl(var(--career-red))]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void submitDirect()}
                  disabled={!draft.trim() || busy}
                  className="h-10 w-full rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-45"
                >
                  원고에 넣기
                </button>
              </div>

              {/* 변신 줄 (직접 작성) — 잠깐 다듬어져 오른쪽 원고로 날아간다 */}
              <AnimatePresence>
                {(phase.step === 'thinking' || phase.step === 'reveal') && (
                  <motion.div
                    layoutId={INCOMING}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-center overflow-hidden py-2.5"
                  >
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
                        <span className="career-serif min-w-0 flex-1 font-medium">{phase.step === 'reveal' ? phase.refined : ''}</span>
                        <span className="career-mono shrink-0 rounded border border-[hsl(var(--foreground)/0.3)] px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {phase.step === 'reveal' ? phase.category : ''}
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              </>
              )}
            </section>
            </div>
          </aside>

          {/* ══════ 좌 — 원고 본문 ══════ */}
          <main className="min-w-0 px-4 py-4 sm:px-6 lg:order-1">
            {/* ── 상단 2열 — 프로필 카드 + 통계 카드 ── */}
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              {/* 프로필 카드 */}
              <div className="flex items-center gap-5 rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] p-5 shadow-[0_1px_2px_hsl(var(--foreground)/0.03),0_16px_32px_-26px_hsl(var(--foreground)/0.22)]">
                  {/* 사진 슬롯 — 선택형, 클릭해서 업로드 */}
                  <label
                    className={cn(
                      'group relative block h-[96px] w-[74px] shrink-0 cursor-pointer overflow-hidden rounded-md bg-card transition-colors hover:border-[hsl(var(--career-red))]',
                      profile.photo
                        ? 'border border-[hsl(var(--foreground)/0.35)]'
                        : 'border border-dashed border-[hsl(var(--foreground)/0.3)]',
                    )}
                    title={profile.photo ? '사진 바꾸기' : '사진 추가'}
                  >
                    {profile.photo ? (
                      <img src={profile.photo} alt="증명사진" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground/50">
                        <Plus className="h-4 w-4" />
                        <span className="text-[10.5px]">사진</span>
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
                    {/* 이름 — 맨 위, 클릭해서 편집 */}
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
                        className="w-full max-w-[280px] border-b-2 border-[hsl(var(--career-red))] bg-transparent text-[24px] font-bold leading-tight outline-none placeholder:text-muted-foreground/40"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingName(true)}
                        title="이름 수정"
                        className={cn(
                          'block w-fit text-[24px] font-bold leading-tight decoration-[hsl(var(--foreground)/0.25)] decoration-dotted underline-offset-4 hover:underline',
                          !profile.name && 'font-semibold text-muted-foreground/45',
                        )}
                      >
                        {profile.name || '이름 적기'}
                      </button>
                    )}
                    {/* 소개 — 이름 아래, blur 시 저장 */}
                    <input
                      defaultValue={profile.tagline}
                      onBlur={(e) => careerStore.setProfile({ tagline: e.target.value.trim() })}
                      placeholder={
                        persona === 'worker'
                          ? '한 줄 소개 — 예: 결제·정산 도메인 3년차 프론트엔드 개발자'
                          : '한 줄 소개 — 예: 웹 개발 동아리를 이끄는 컴퓨터공학 3학년'
                      }
                      aria-label="한 줄 소개"
                      className="w-full max-w-[520px] bg-transparent text-[13.5px] leading-relaxed text-muted-foreground outline-none placeholder:text-muted-foreground/40"
                    />
                  </div>
              </div>

              {/* 통계 카드 — 이번 달 기록 · 채움도 */}
              <div className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] p-5 shadow-[0_1px_2px_hsl(var(--foreground)/0.03),0_16px_32px_-26px_hsl(var(--foreground)/0.22)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="shrink-0">
                    <p className="text-[11px] text-muted-foreground">이번 달 기록</p>
                    <p className="mt-1 flex items-baseline gap-1">
                      <span className="career-mono text-[26px] font-bold leading-none">{stats.thisCount}</span>
                      <span className="text-[12px] text-muted-foreground">건</span>
                    </p>
                    {stats.delta !== 0 && (
                      <p className={cn('mt-1.5 text-[11px] font-medium', stats.delta > 0 ? 'text-[hsl(var(--career-red))]' : 'text-muted-foreground')}>
                        {stats.delta > 0 ? `↑ 지난달 +${stats.delta}` : `↓ 지난달 ${stats.delta}`}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-muted-foreground">채움도</p>
                    <div className="mt-2 flex gap-1">
                      {sections.map((s, i) => (
                        <span
                          key={i}
                          className={cn('h-1.5 flex-1 rounded-full', s.items.length > 0 ? 'bg-[hsl(var(--career-red))]' : 'bg-[hsl(var(--surface-3))]')}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-[11.5px] font-medium text-foreground">{stats.filled} / {stats.total} 카테고리</p>
                    {stats.emptyNames.length > 0 && (
                      <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground/70">{stats.emptyNames.join(' · ')} 비어 있어요</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ────── 기록 — 카드형 카테고리 그리드 ────── */}
            <div className="mt-5 grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                        'group/section flex flex-col rounded-2xl border bg-[hsl(var(--surface-1))] p-4 shadow-[0_1px_2px_hsl(var(--foreground)/0.03)] transition-all hover:shadow-[0_12px_28px_-22px_hsl(var(--foreground)/0.3)]',
                        dragOverCategory === category.id ? 'border-[hsl(var(--career-red)/0.6)]' : 'border-[hsl(var(--hairline))]',
                      )}
                    >
                      {/* 카드 헤더 — 번호 칩 · 이름 · 건수(빈 칸이면 삭제), 아래 헤어라인 */}
                      <div className="mb-3 flex items-center gap-2 border-b border-[hsl(var(--hairline))] pb-2.5">
                        <span className="career-mono inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] bg-[hsl(var(--career-red)/0.1)] px-1 text-[10px] font-bold text-[hsl(var(--career-red))]">
                          {String(sectionIndex + 1).padStart(2, '0')}
                        </span>
                        <h3 className="text-[15px] font-bold tracking-tight">{category.name}</h3>
                        <span className="ml-auto flex items-center gap-1.5">
                          <span className="career-mono rounded-full bg-[hsl(var(--surface-2))] px-2 py-0.5 text-[10.5px] text-muted-foreground">
                            {sectionItems.length}
                          </span>
                          {sectionItems.length === 0 && (
                            <button
                              type="button"
                              onClick={() => careerStore.removeCategory(category.id)}
                              aria-label={`${category.name} 칸 삭제`}
                              title="빈 칸 삭제"
                              className="p-0.5 text-transparent transition-colors hover:!text-[hsl(var(--career-red))] group-hover/section:text-muted-foreground/55"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </span>
                      </div>
                      {sectionItems.length === 0 ? (
                        /* 빈 칸 — 첫 기록 추가 유도 */
                        <button
                          type="button"
                          onClick={() => startAddTo(category.name)}
                          className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[hsl(var(--foreground)/0.16)] py-7 text-muted-foreground/55 transition-colors hover:border-[hsl(var(--career-red)/0.5)] hover:text-[hsl(var(--career-red))]"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(var(--career-red)/0.08)] text-[hsl(var(--career-red))]">
                            <Plus className="h-4 w-4" />
                          </span>
                          <span className="text-[11.5px]">첫 기록 추가</span>
                        </button>
                      ) : (
                        <>
                          <ul className="-mx-2 divide-y divide-[hsl(var(--hairline))]">
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

                  {/* 카테고리 추가 — 그리드 안 점선 카드 */}
                  {addingCategory ? (
                    <div className="flex min-h-[132px] flex-col rounded-xl border border-[hsl(var(--career-red)/0.5)] bg-[hsl(var(--surface-1))] p-4">
                      <div className="flex items-center gap-2">
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
                          className="h-6 min-w-0 flex-1 bg-transparent text-[15px] font-bold outline-none placeholder:font-normal placeholder:text-muted-foreground/45"
                        />
                      </div>
                      <p className="mt-2 text-[11px] text-muted-foreground/60">Enter로 추가 · Esc로 취소</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingCategory(true)}
                      className="group/add flex min-h-[132px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[hsl(var(--foreground)/0.2)] text-muted-foreground/55 transition-colors hover:border-[hsl(var(--career-red)/0.5)] hover:text-[hsl(var(--career-red))]"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(var(--surface-2))] transition-colors group-hover/add:bg-[hsl(var(--career-red)/0.1)] group-hover/add:text-[hsl(var(--career-red))]">
                        <Plus className="h-4 w-4" />
                      </span>
                      <span className="text-[12.5px]">카테고리 추가</span>
                    </button>
                  )}
              </div>

          </main>
        </div>
      </LayoutGroup>

      <ComposeDialog purpose={composePurpose} onClose={() => setComposePurpose(null)} />
      <DocViewDialog doc={viewDoc} onClose={() => setViewDoc(null)} />
      <DetailDialog item={detailItem} onClose={() => setDetailItem(null)} />
      <RecommendDialog open={recommendOpen} personaLabel={PERSONA_LABEL[persona]} onClose={() => setRecommendOpen(false)} />
    </>
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
          <label htmlFor="career-detail-refined" className="career-mono mb-1 block text-[11px] text-muted-foreground">
            이력서 문장
          </label>
          <input
            id="career-detail-refined"
            value={refined}
            onChange={(e) => setRefined(e.target.value)}
            className="career-serif h-10 w-full rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-3 text-[14px] font-medium outline-none focus:border-[hsl(var(--career-red))]"
          />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="career-detail-date" className="career-mono mb-1 block text-[11px] text-muted-foreground">
              시작
            </label>
            <input
              id="career-detail-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="career-mono h-10 w-full rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-3 text-[12.5px] outline-none focus:border-[hsl(var(--career-red))]"
            />
          </div>
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label htmlFor="career-detail-end" className="career-mono block text-[11px] text-muted-foreground">
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
              className="career-mono h-10 w-full rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-3 text-[12.5px] outline-none focus:border-[hsl(var(--career-red))] disabled:opacity-45"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="career-detail-org" className="career-mono mb-1 block text-[11px] text-muted-foreground">
              기관·주최
            </label>
            <input
              id="career-detail-org"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="발급처·주최 (선택)"
              className="h-10 w-full rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-3 text-[12.5px] outline-none placeholder:text-muted-foreground/45 focus:border-[hsl(var(--career-red))]"
            />
          </div>
          <div>
            <label htmlFor="career-detail-link" className="career-mono mb-1 block text-[11px] text-muted-foreground">
              증빙 링크
            </label>
            <input
              id="career-detail-link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https:// (선택)"
              className="career-mono h-10 w-full rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-3 text-[11.5px] outline-none placeholder:text-muted-foreground/45 focus:border-[hsl(var(--career-red))]"
            />
          </div>
        </div>

        <div>
          <label htmlFor="career-detail-memo" className="career-mono mb-1 block text-[11px] text-muted-foreground">
            세부사항
          </label>
          <textarea
            id="career-detail-memo"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder={'상황 · 내가 한 일 · 결과를 편하게 적어두세요.\n이력서·자소서로 뽑을 때 AI가 이 내용을 활용해요.'}
            className="h-32 w-full resize-none rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-3 text-[13px] leading-relaxed outline-none focus:border-[hsl(var(--career-red))]"
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
            className="inline-flex h-8 items-center rounded-lg bg-primary px-4 text-[12.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
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
  const [request, setRequest] = useState('');
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
      const content = await aiComposeCareerDoc(target, sections, request.trim() || undefined);
      setResult(content);
      // 생성 즉시 보관함에 — 닫아도 "만든 문서"에서 다시 볼 수 있다.
      careerStore.addDoc({ purpose: target, content, request: request.trim() || undefined });
      notify.success('만든 문서에 저장했어요');
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
    <Dialog open={purpose !== null} onOpenChange={(open) => { if (!open) { setResult(''); setRequest(''); onClose(); } }}>
      <DialogContent className="career-theme max-w-lg">
        <DialogHeader>
          <DialogTitle className="career-serif text-[16px]">원고로 {purpose} 만들기</DialogTitle>
        </DialogHeader>
        {/* 요청사항 먼저 — 어디에 낼지 적고 만든다 */}
        <div>
          <label htmlFor="career-compose-request" className="mb-1 block text-[11px] text-muted-foreground">
            요청사항 (선택) — 어디에 낼 문서인지, 무엇을 강조할지
          </label>
          <textarea
            id="career-compose-request"
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={2}
            placeholder="예: 프론트엔드 신입 지원 · 협업 경험 강조"
            className="w-full resize-none rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-2.5 text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground/45 focus:border-[hsl(var(--career-red))]"
          />
        </div>
        <button
          type="button"
          onClick={() => purpose && void generate(purpose)}
          disabled={generating}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-55"
        >
          {generating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {generating ? '뽑는 중…' : `${purpose} 만들기`}
        </button>
        {result && (
          <>
            <textarea
              readOnly
              value={result}
              aria-label="생성된 문서"
              className="h-56 w-full resize-none rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-3 text-[12.5px] leading-relaxed outline-none"
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => void copyResult()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[hsl(var(--foreground)/0.35)] px-2.5 text-[12px] font-medium transition-colors hover:bg-accent"
              >
                <Copy className="h-3 w-3" />
                복사
              </button>
              <button
                type="button"
                onClick={downloadResult}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[hsl(var(--foreground)/0.35)] px-2.5 text-[12px] font-medium transition-colors hover:bg-accent"
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

/* ═══════════════ 만든 문서 보기 다이얼로그 ═══════════════ */

function DocViewDialog({ doc, onClose }: { doc: CareerDoc | null; onClose: () => void }) {
  const copyDoc = async () => {
    if (!doc) return;
    try {
      await navigator.clipboard.writeText(doc.content);
      notify.success('복사했어요');
    } catch {
      notify.error('복사에 실패했어요');
    }
  };

  const downloadDoc = () => {
    if (!doc) return;
    const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.purpose}-${doc.createdAt.slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const removeDoc = () => {
    if (!doc) return;
    careerStore.removeDoc(doc.id);
    onClose();
    notify.success('만든 문서에서 지웠어요');
  };

  return (
    <Dialog open={doc !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="career-theme max-w-lg">
        <DialogHeader>
          <DialogTitle className="career-serif text-[16px]">{doc?.purpose}</DialogTitle>
        </DialogHeader>
        {doc && (
          <p className="career-mono text-[11px] text-muted-foreground">
            {doc.createdAt.slice(0, 10).replaceAll('-', '.')}
            {doc.request ? ` · ${doc.request}` : ''}
          </p>
        )}
        <textarea
          readOnly
          value={doc?.content ?? ''}
          aria-label="문서 내용"
          className="h-64 w-full resize-none rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-3 text-[12.5px] leading-relaxed outline-none"
        />
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={removeDoc}
            className="inline-flex h-8 items-center gap-1.5 px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:text-[hsl(var(--career-red))]"
          >
            <Trash2 className="h-3 w-3" />
            삭제
          </button>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => void copyDoc()}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[hsl(var(--foreground)/0.35)] px-2.5 text-[12px] font-medium transition-colors hover:bg-accent"
            >
              <Copy className="h-3 w-3" />
              복사
            </button>
            <button
              type="button"
              onClick={downloadDoc}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[hsl(var(--foreground)/0.35)] px-2.5 text-[12px] font-medium transition-colors hover:bg-accent"
            >
              <Download className="h-3 w-3" />
              .md 다운로드
            </button>
          </div>
        </div>
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
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-55"
        >
          {generating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {generating ? '고르는 중…' : '추천 받기'}
        </button>
        {result && (
          <div className="max-h-64 overflow-y-auto whitespace-pre-line rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-3.5 text-[13px] leading-relaxed">
            {result}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
