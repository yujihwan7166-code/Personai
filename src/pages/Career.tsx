/**
 * 마이 커리어 — /career ("교정 중인 원고" 컨셉).
 *
 * 구조 (2026-07-13 개편): 방 사이드바가 "기록"과 "산출물"을 구분한다.
 *   [사이드바] 마스트헤드(마이 커리어 + 스펙 검인) + 내비: 스펙 보드 | 문서(이력서·자소서·
 *   포트폴리오·경력기술서·커버레터, 종류별 색 점 + 개수) + 하단 추천 스펙.
 *   [스펙 보드 뷰] 좌 원고 시트(프로필 머리글 + 카테고리 2열) | 우 커리어 추가 작성대 — 독립 스크롤.
 *   [문서 뷰] 그 종류로 만든 문서 카드 그리드 + "새로 만들기" (이력서는 서식 미리보기→PDF,
 *   나머지는 AI 생성 → 해당 뷰에 쌓임).
 * 왼쪽에서 적은 한 줄이 AI 문장으로 변신해 원고의 행으로 날아가 꽂힌다
 * (framer layoutId 공유 — 두 창을 가로지르는 시그니처 모션).
 *
 * 종이 위 잉크: 문장 명조(career-serif) · 숫자 모노(career-mono) ·
 * 강조는 교정 빨강(--career-red) 하나. 보조 문구는 한국어만.
 */
import { useLayoutEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { ClipboardList, Copy, Download, ExternalLink, FileDown, FileText, Link2, Loader2, Pencil, Plus, Target, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { useCareerBoard } from '@/hooks/useCareer';
import { careerStore } from '@/services/careerStore';
import { aiClassifySpec, aiComposeCareerDoc, type ComposePurpose } from '@/lib/career/ai';
import { exportElementToPdf, sanitizeFileName } from '@/lib/cloudCommon/pdfExport';
import { RESUME_TEMPLATES, ResumeThumb, type ResumeTemplateId } from '@/lib/career/resumeTemplates';
import { PERSONA_LABEL, type CareerDoc, type CareerPersona, type CareerProfile, type SpecCategory, type SpecItem } from '@/types/career';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** 신분별 시작 칸 — 설정 시 빈 섹션으로 깔린다 (나중에 추가·삭제 자유). */
const SEED_CATEGORIES: Record<CareerPersona, string[]> = {
  highschool: ['수상', '동아리·활동', '봉사', '자격증', '독서'],
  student: ['자격증', '어학', '동아리·활동', '공모전', '수상'],
  jobseeker: ['자격증', '어학', '인턴', '프로젝트', '수상'],
  worker: ['경력', '프로젝트', '자격증', '수상', '교육'],
};

const PERSONA_DESC: Record<CareerPersona, string> = {
  highschool: '수상·동아리·봉사 중심으로 칸을 준비해요',
  student: '동아리·공모전·자격증 중심으로 칸을 준비해요',
  jobseeker: '인턴·프로젝트·어학 중심으로 칸을 준비해요',
  worker: '경력·프로젝트 성과 중심으로 칸을 준비해요',
};

/** 해보기 예시 — 신분에 맞는 첫 입력을 클릭 한 번으로. */
const TRY_EXAMPLES: Record<CareerPersona, string[]> = {
  highschool: ['교내 수학경시대회 은상', '학생회 문화부 임원', '요양원 봉사 30시간'],
  student: ['정보처리기사 자격증 취득', '웹 개발 동아리 회장', '해커톤 본선 진출'],
  jobseeker: ['토익 900점', '스타트업 3개월 인턴십 수료', '개인 포트폴리오 웹사이트 제작'],
  worker: ['결제 오류 원인 분석으로 CS 문의 30% 감소', '신규 서비스 런칭 주도', '사내 기술 세미나 발표'],
};

/** 문서 타일 — 연한 색상 각각(교정 빨강 중심 웜 팔레트). tint = 배경, accent = 부제/보더 색조(HSL). */
const COMPOSE_PURPOSES: Array<{ purpose: ComposePurpose; label: string; hint: string; hsl: string }> = [
  { purpose: '이력서', label: '이력서', hint: '미리보기·PDF', hsl: '6 70% 51%' },
  { purpose: '자기소개서 초안', label: '자기소개서', hint: '뽑기', hsl: '28 78% 50%' },
  { purpose: '포트폴리오 요약', label: '포트폴리오', hint: '뽑기', hsl: '42 80% 44%' },
  { purpose: '경력기술서', label: '경력기술서', hint: '뽑기', hsl: '348 60% 54%' },
  { purpose: '커버레터', label: '커버레터', hint: '뽑기', hsl: '14 70% 54%' },
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
    <div className="career-theme h-dvh bg-[#fefbfc] text-foreground">
      {profile.persona === '' ? (
        <div className="mx-auto h-full w-full max-w-3xl overflow-y-auto px-4 pb-20 pt-6">
          <SetupLedger />
        </div>
      ) : (
        <BoardLedger />
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
  const { items, categories, profile, docs, boards, activeBoardId } = useCareerBoard();
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
  /** 방 뷰 — 스펙 보드(기록) vs 문서 종류별 보관함 (사이드바에서 전환). */
  const [view, setView] = useState<'board' | ComposePurpose>('board');
  const [boardDialogOpen, setBoardDialogOpen] = useState(false); // 새 스펙 보드 만들기
  const [resumeOpen, setResumeOpen] = useState(false); // 이력서 PDF 미리보기·내보내기
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
  const [advRange, setAdvRange] = useState(false); // false = 하루, true = 기간
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

  /** 보드별 기록 수 — 사이드바 우측 숫자 (items 는 활성 보드만이라 전체 집계는 store 에서). */
  const boardCounts = useMemo(() => careerStore.countItemsByBoard(), [items, boards]); // eslint-disable-line react-hooks/exhaustive-deps

  const busy = phase.step !== 'idle';
  const persona = (profile.persona || 'student') as CareerPersona;

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
      setAdvRange(false);
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
      setAdvRange(true);
    } else if (result.endDate) {
      setAdvOngoing(false);
      setAdvEndDate(result.endDate);
      setAdvRange(true);
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
    setAdvRange(false);
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

  /* 원고 행 (리디자인 시안) — 제목 + 기관 + 증빙/문서 아이콘 + 날짜. 클릭하면 세부사항. */
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
        'group relative flex cursor-pointer items-center gap-[9px] px-0.5 py-[13px] transition-colors hover:bg-[#faf5f6]',
        item.id === recentId && 'career-new-line',
      )}
    >
      <span className="min-w-0 truncate text-[14px] font-semibold text-[#23262b]">
        <MetricText text={item.refined} />
      </span>
      {item.org && <span className="shrink-0 truncate text-[12.5px] text-[#9b9095]">{item.org}</span>}
      <span className="ml-auto flex shrink-0 items-center gap-[9px] text-[#cfb6bf]">
        {item.detail && <FileText className="h-[13px] w-[13px]" strokeWidth={1.7} aria-label="세부 있음" />}
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label="증빙 링크 열기"
            title={item.link}
            className="transition-colors hover:text-[#9c4160]"
          >
            <Link2 className="h-[13px] w-[13px]" strokeWidth={1.7} />
          </a>
        )}
        <span className="text-[12.5px] tabular-nums text-[#9b9095] transition-opacity group-hover:opacity-0">
          {formatPeriod(item)}
        </span>
      </span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); removeItem(item); }}
        aria-label="삭제"
        title="삭제"
        className="absolute right-0 top-1/2 -translate-y-1/2 rounded p-1 text-[#c9aeb8] opacity-0 transition-opacity hover:text-[#9c4160] group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <>
      <LayoutGroup>
        {/* ══ 방 사이드바(스펙 보드 | 문서 종류) + 메인 — 기록과 산출물을 구분 (2026-07-13) ══ */}
        <div className="flex h-full">
          <aside className="hidden w-[264px] shrink-0 flex-col overflow-y-auto border-r border-[#efdae0] bg-[#fcf5f7] px-3.5 py-5 sm:flex">
            {/* 헤더 — 34px 흰 마크 + 제목 + 부제 (리디자인 시안) */}
            <div className="flex items-center gap-[11px] px-1.5">
              <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-white text-[17px] leading-none shadow-[0_1px_2px_rgba(120,40,60,0.08)]" role="img" aria-label="마이 커리어">💼</span>
              <div className="min-w-0">
                <div className="text-[16px] font-bold leading-tight tracking-[-0.01em] text-[#191c20]">마이 커리어</div>
                <div className="truncate text-[12px] leading-tight text-[#a97386]">나의 커리어를 담는 작업실</div>
              </div>
            </div>

            {/* 스펙 보드 — 여러 개(활성 보드의 기록으로 문서를 만든다). 추가는 목록 맨 아래 칸. */}
            <div className="mb-[7px] mt-[26px] px-3 text-[11.5px] font-semibold tracking-[0.05em] text-[#a97386]">스펙 보드</div>
            <nav className="flex flex-col gap-0.5" aria-label="스펙 보드 목록">
              {boards.map((b) => {
                const active = view === 'board' && activeBoardId === b.id;
                const count = boardCounts[b.id] ?? 0;
                return (
                  <div key={b.id} className="group/bd relative">
                    <button
                      type="button"
                      onClick={() => { careerStore.setActiveBoard(b.id); setView('board'); }}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex h-[38px] w-full items-center gap-2.5 rounded-[9px] px-3 text-left text-[14.5px] transition-colors',
                        active
                          ? 'bg-white font-semibold text-[#8a3550] shadow-[0_1px_2px_rgba(120,40,60,0.08)]'
                          : 'font-medium text-[#585055] hover:bg-white/55',
                      )}
                    >
                      <ClipboardList className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-[#9c4160]' : 'text-[#a1888f]')} strokeWidth={1.7} />
                      <span className="min-w-0 flex-1 truncate">{b.name}</span>
                      {count > 0 && (
                        <span className={cn('text-[12.5px] tabular-nums', active ? 'font-semibold text-[#9c4160]' : 'text-[#a1888f]')}>{count}</span>
                      )}
                    </button>
                    {boards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const bundle = careerStore.removeBoard(b.id);
                          if (bundle) {
                            notify.info(`'${bundle.board.name}' 보드를 지웠어요`, {
                              duration: 5000,
                              action: { label: '되돌리기', onClick: () => careerStore.restoreBoard(bundle) },
                            });
                          }
                        }}
                        aria-label={`${b.name} 보드 삭제`}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#c19aa6] opacity-0 transition-opacity hover:text-rose-500 focus-visible:opacity-100 group-hover/bd:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
              {/* 새 보드 추가 칸 — 목록 맨 아래 */}
              <button
                type="button"
                onClick={() => setBoardDialogOpen(true)}
                className="flex h-[38px] w-full items-center gap-2.5 rounded-[9px] px-3 text-left text-[13.5px] font-medium text-[#a1888f] transition-colors hover:bg-white/55 hover:text-[#8a3550]"
              >
                <Plus className="h-[15px] w-[15px] shrink-0" strokeWidth={1.7} />
                <span className="flex-1">새 보드</span>
              </button>
            </nav>

            {/* 문서 — 스펙에서 만들어요 */}
            <div className="mb-[7px] mt-[22px] px-3 text-[11.5px] font-semibold tracking-[0.05em] text-[#a97386]">지원 문서</div>
            <nav className="flex flex-col gap-0.5" aria-label="문서 종류">
              {COMPOSE_PURPOSES.map(({ purpose, label }) => {
                const active = view === purpose;
                const count = docs.filter((d) => d.purpose === purpose).length;
                return (
                  <button
                    key={purpose}
                    type="button"
                    onClick={() => setView(purpose)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-[38px] items-center gap-2.5 rounded-[9px] px-3 text-left text-[14.5px] transition-colors',
                      active
                        ? 'bg-white font-semibold text-[#8a3550] shadow-[0_1px_2px_rgba(120,40,60,0.08)]'
                        : 'font-medium text-[#585055] hover:bg-white/55',
                    )}
                  >
                    <FileText className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-[#9c4160]' : 'text-[#a1888f]')} strokeWidth={1.7} />
                    <span className="flex-1">{label}</span>
                    {count > 0 && (
                      <span className={cn('text-[12.5px] tabular-nums', active ? 'font-semibold text-[#9c4160]' : 'text-[#a1888f]')}>{count}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* 다음 스펙 — 추천 스펙(온디맨드 다이얼로그) */}
            <div className="mb-[7px] mt-[22px] px-3 text-[11.5px] font-semibold tracking-[0.05em] text-[#a97386]">다음 스펙</div>
            <button
              type="button"
              onClick={() => setRecommendOpen(true)}
              className="flex h-[38px] w-full items-center gap-2.5 rounded-[9px] px-3 text-left text-[14.5px] font-medium text-[#585055] transition-colors hover:bg-white/55"
            >
              <Target className="h-[18px] w-[18px] shrink-0 text-[#a1888f]" strokeWidth={1.7} />
              <span className="flex-1">추천 스펙</span>
            </button>

            {/* 푸터 통계 — 기록 · 증빙 · 목표(문서) */}
            <div className="mt-auto border-t border-[#efdae0] px-3 pt-3 text-[12px] leading-relaxed text-[#a97386]">
              기록 {items.length} · 증빙 {items.filter((i) => i.link).length} · 목표 {docs.length}
            </div>
          </aside>

          {/* ══ 메인 — 모바일은 통 스크롤, lg 부턴 컬럼별 독립 스크롤 ══ */}
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
            {/* 모바일 — 가로 내비 (사이드바 대체): 보드 칩들 + 문서 종류 칩 */}
            <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-1 pt-3 sm:hidden">
              {boards.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { careerStore.setActiveBoard(b.id); setView('board'); }}
                  className={cn('shrink-0 rounded-full border px-3 py-1.5 text-[12px]', view === 'board' && activeBoardId === b.id ? 'border-transparent bg-[hsl(33_48%_48%/0.14)] font-bold text-[hsl(28_52%_38%)]' : 'border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] text-muted-foreground')}
                >
                  {b.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setBoardDialogOpen(true)}
                aria-label="새 스펙 보드"
                className="shrink-0 rounded-full border border-dashed border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-2.5 py-1.5 text-muted-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              {COMPOSE_PURPOSES.map(({ purpose, label }) => (
                <button
                  key={purpose}
                  type="button"
                  onClick={() => setView(purpose)}
                  className={cn('shrink-0 rounded-full border px-3 py-1.5 text-[12px]', view === purpose ? 'border-transparent bg-[hsl(33_48%_48%/0.14)] font-bold text-[hsl(28_52%_38%)]' : 'border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] text-muted-foreground')}
                >
                  {label}
                </button>
              ))}
            </div>

            {view === 'board' ? (
            /* 행 높이 minmax(0,1fr) — 이게 있어야 두 컬럼이 화면을 채우고 각자 스크롤한다 */
            <div className="flex flex-col lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_540px] lg:grid-rows-[minmax(0,1fr)]">

        {/* ══════ 우 — 작성대 도크: 문서 만들기 타일 + 커리어 추가 (보관함 열람은 사이드바가 담당)
         * row-start-1 명시 필수 — 도크(2열)가 DOM 에서 먼저 오면 자동 배치 커서가 2열을 지나
         * 뒤따르는 원고(1열)를 둘째 행으로 밀어낸다 (좌측 상단이 비는 버그). ══════ */}
        <aside className="scrollbar-thin overflow-y-auto bg-[#fffdfe] lg:col-start-2 lg:row-start-1">
            {/* 도구 도크 — 페이지 톤 위 흰 카드. 오른쪽 끝에 붙지 않게 우측 여백 넉넉히. */}
            <div className="space-y-4 py-5 pl-4 pr-6 sm:pl-5 sm:pr-8">
            {/* 문서 만들기 — 종류 타일 6개 (만든 문서 보기는 사이드바 문서 항목으로) */}
            <section className="rounded-2xl border border-[hsl(var(--foreground)/0.1)] bg-[hsl(var(--surface-1))] p-4 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.14),0_1px_2px_hsl(var(--foreground)/0.05)]">
              <div className="mb-1 flex items-center gap-2">
                <span className="career-mono text-[13px] font-semibold text-[hsl(var(--career-red))]">+</span>
                <h2 className="text-[16px] font-bold tracking-tight">문서 만들기</h2>
              </div>
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                {items.length === 0
                  ? '기록이 쌓이면 문서를 만들 수 있어요.'
                  : '쌓인 기록으로 문서를 만들어보세요. 만든 문서는 왼쪽 사이드바에 쌓여요.'}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {COMPOSE_PURPOSES.map(({ purpose, label, hint, hsl }) => {
                  const disabled = items.length === 0;
                  return (
                    <button
                      key={purpose}
                      type="button"
                      onClick={() => (purpose === '이력서' ? setResumeOpen(true) : setComposePurpose(purpose))}
                      disabled={disabled}
                      title={disabled ? '스펙 보드에 기록이 쌓이면 만들 수 있어요' : undefined}
                      className={cn(
                        'rounded-xl border px-3 py-2.5 text-left transition-[filter,box-shadow,opacity]',
                        disabled ? 'cursor-not-allowed opacity-55' : 'hover:brightness-[0.98] hover:shadow-sm',
                      )}
                      style={{ backgroundColor: `hsl(${hsl} / 0.14)`, borderColor: `hsl(${hsl} / 0.45)` }}
                    >
                      <span className="block text-[13px] font-semibold">{label}</span>
                      <span className="career-mono mt-0.5 block text-[10.5px]" style={{ color: `hsl(${hsl} / 0.95)` }}>
                        {hint} →
                      </span>
                    </button>
                  );
                })}
                {/* 6번째 — 추천 스펙(연한 초록, "쌓을 것" 성격) */}
                <button
                  type="button"
                  onClick={() => setRecommendOpen(true)}
                  title="지금 원고를 보고 다음에 쌓을 스펙을 추천해요"
                  className="rounded-xl border px-3 py-2.5 text-left transition-[filter,box-shadow] hover:brightness-[0.98] hover:shadow-sm"
                  style={{ backgroundColor: 'hsl(150 38% 42% / 0.14)', borderColor: 'hsl(150 38% 42% / 0.45)' }}
                >
                  <span className="block text-[13px] font-semibold">추천 스펙</span>
                  <span className="career-mono mt-0.5 block text-[10.5px]" style={{ color: 'hsl(150 40% 38%)' }}>받기 →</span>
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-[hsl(var(--foreground)/0.1)] bg-[hsl(var(--surface-1))] p-5 shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.14),0_1px_2px_hsl(var(--foreground)/0.05)]">
              {/* 표제 + 모드 토글 (세그먼트) */}
              <div className="flex items-center gap-2">
                <span className="text-[17px] font-bold leading-none text-[hsl(var(--career-red))]">+</span>
                <h2 className="career-serif text-[17px] font-bold tracking-tight">커리어 추가</h2>
                <div className="ml-auto inline-flex rounded-lg bg-[hsl(var(--foreground)/0.05)] p-0.5">
                  {([['ai', 'AI 작성'], ['direct', '직접 작성']] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => changeWriteMode(mode)}
                      aria-pressed={writeMode === mode}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors',
                        writeMode === mode
                          ? 'bg-[hsl(var(--surface-1))] text-[hsl(var(--career-red))] shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {writeMode === 'ai' && (
                <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
                  생각나는 대로 적으면 AI가 이력서 문장으로 다듬어드려요.
                </p>
              )}

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
                        className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[hsl(var(--career-red))] text-[13px] font-semibold text-white shadow-[0_6px_16px_-8px_hsl(var(--career-red)/0.8)] transition-[filter,opacity] hover:brightness-[1.06] disabled:opacity-45"
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
                          className="h-9 flex-1 rounded-lg bg-[hsl(var(--career-red))] text-[12.5px] font-semibold text-white transition-[filter] hover:brightness-[1.06]"
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
              {/* 캡처 박스 — 큰 라운드 + 빨간 엔터 버튼 */}
              <div
                className={cn(
                  'mt-3 flex items-center overflow-hidden rounded-xl border bg-[hsl(var(--card))] transition-all',
                  'border-[hsl(var(--foreground)/0.2)]',
                  'focus-within:border-[hsl(var(--career-red))] focus-within:ring-2 focus-within:ring-[hsl(var(--career-red)/0.12)]',
                )}
              >
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="한 일·성과를 적어보세요 — 예: 토익 780점 달성"
                  aria-label="활동·성과"
                  className="career-serif h-14 min-w-0 flex-1 bg-transparent px-4 text-[15px] outline-none placeholder:text-muted-foreground/45"
                />
                <button
                  type="button"
                  onClick={() => void submitDirect()}
                  disabled={!draft.trim() || busy}
                  aria-label="추가"
                  className="mr-2.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[hsl(var(--career-red)/0.12)] text-[16px] leading-none text-[hsl(var(--career-red))] transition-colors hover:bg-[hsl(var(--career-red)/0.2)] disabled:opacity-40"
                >
                  ↵
                </button>
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
              <div className="mt-4 space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="career-adv-category" className="mb-1.5 block text-[12.5px] font-semibold text-foreground/80">
                      카테고리
                    </label>
                    <select
                      id="career-adv-category"
                      value={advCategory}
                      onChange={(e) => setAdvCategory(e.target.value)}
                      className="h-11 w-full rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-3 text-[13px] outline-none focus:border-[hsl(var(--career-red))]"
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
                    <label htmlFor="career-adv-org" className="mb-1.5 block text-[12.5px] font-semibold text-foreground/80">
                      기관·주최
                    </label>
                    <input
                      id="career-adv-org"
                      value={advOrg}
                      onChange={(e) => setAdvOrg(e.target.value)}
                      placeholder="발급처·주최 (선택)"
                      className="h-11 w-full rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-3 text-[13px] outline-none placeholder:text-muted-foreground/45 focus:border-[hsl(var(--career-red))]"
                    />
                  </div>
                </div>
                {/* 기간 — 하루(기본) / 기간 토글 */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[12.5px] font-semibold text-foreground/80">
                      {advRange ? '기간' : '날짜'}
                    </span>
                    <div className="inline-flex rounded-lg bg-[hsl(var(--foreground)/0.05)] p-0.5">
                      {([[false, '하루'], [true, '기간']] as const).map(([range, label]) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            setAdvRange(range);
                            if (!range) {
                              setAdvEndDate('');
                              setAdvOngoing(false);
                            }
                          }}
                          aria-pressed={advRange === range}
                          className={cn(
                            'rounded-md px-3 py-1 text-[11.5px] font-semibold transition-colors',
                            advRange === range
                              ? 'bg-[hsl(var(--surface-1))] text-[hsl(var(--career-red))] shadow-sm'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!advRange ? (
                    <input
                      id="career-adv-date"
                      type="date"
                      value={advDate}
                      onChange={(e) => setAdvDate(e.target.value)}
                      aria-label="날짜"
                      className="career-mono h-11 w-full rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-3 text-[12.5px] outline-none focus:border-[hsl(var(--career-red))]"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="career-adv-date" className="mb-1 block text-[11px] text-muted-foreground">
                          시작
                        </label>
                        <input
                          id="career-adv-date"
                          type="date"
                          value={advDate}
                          onChange={(e) => setAdvDate(e.target.value)}
                          className="career-mono h-11 w-full rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-3 text-[12.5px] outline-none focus:border-[hsl(var(--career-red))]"
                        />
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <label htmlFor="career-adv-end" className="block text-[11px] text-muted-foreground">
                            종료
                          </label>
                          <label className="flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={advOngoing}
                              onChange={(e) => setAdvOngoing(e.target.checked)}
                              className="h-3.5 w-3.5 accent-[hsl(var(--career-red))]"
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
                          className="career-mono h-11 w-full rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-3 text-[12.5px] outline-none focus:border-[hsl(var(--career-red))] disabled:opacity-45"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label htmlFor="career-adv-link" className="mb-1.5 block text-[12.5px] font-semibold text-foreground/80">
                    증빙 링크
                  </label>
                  <input
                    id="career-adv-link"
                    value={advLink}
                    onChange={(e) => setAdvLink(e.target.value)}
                    placeholder="https:// — 포트폴리오·수상 페이지 (선택)"
                    className="career-mono h-11 w-full rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-3 text-[12px] outline-none placeholder:text-muted-foreground/45 focus:border-[hsl(var(--career-red))]"
                  />
                </div>
                <div>
                  <label htmlFor="career-adv-detail" className="mb-1.5 block text-[12.5px] font-semibold text-foreground/80">
                    세부사항
                  </label>
                  <textarea
                    id="career-adv-detail"
                    value={advDetail}
                    onChange={(e) => setAdvDetail(e.target.value)}
                    rows={3}
                    placeholder="상황 · 내가 한 일 · 결과 (선택)"
                    className="w-full resize-none rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-3 text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground/45 focus:border-[hsl(var(--career-red))]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void submitDirect()}
                  disabled={!draft.trim() || busy}
                  className="mt-1 h-14 w-full rounded-2xl bg-[hsl(var(--career-red))] text-[15px] font-bold text-white shadow-[0_10px_24px_-10px_hsl(var(--career-red)/0.85)] transition-[filter,opacity] hover:brightness-[1.06] disabled:opacity-45"
                >
                  커리어 저장
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

          {/* ══════ 좌 — 원고 보드 (독립 스크롤). 흰 문서 시트 = 내 이력서 그 자체 ══════ */}
          <main className="scrollbar-none min-w-0 overflow-y-auto bg-[#fefbfc] px-4 py-7 sm:px-8 lg:col-start-1 lg:row-start-1 lg:min-h-0">
            {/* ── 마스트헤드 (리디자인 시안) ── */}
            <div className="mx-auto mb-5 max-w-[900px]">
              <div className="mb-[7px] text-[11px] font-bold tracking-[0.14em] text-[#a97386]">SPEC BOARD</div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[26px] font-bold tracking-[-0.015em] text-[#191c20]">스펙 보드</span>
                <span className="text-[14px] text-[#8d949d]">기록 {items.length} · 증빙 {items.filter((i) => i.link).length} · 목표 {docs.length}</span>
              </div>
            </div>

            {/* ── 프로필 카드 ── */}
            <div className="mx-auto mb-4 flex max-w-[900px] items-center gap-5 rounded-[12px] border border-[#ecdfe3] bg-white px-[26px] py-[22px]">
              {/* 아바타 — 사진 있으면 크롭, 없으면 이니셜. 클릭해서 업로드 */}
              <label className="group relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-full" title={profile.photo ? '사진 바꾸기' : '사진 추가'}>
                {profile.photo ? (
                  <img src={profile.photo} alt="증명사진" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-[#f2dfe5] text-[24px] font-semibold text-[#8a3550]">{(profile.name || '?').slice(0, 1)}</span>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { void onPickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
                {profile.photo && (
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); careerStore.setProfile({ photo: undefined }); }} aria-label="사진 삭제" title="사진 삭제" className="absolute right-0 top-0 bg-black/35 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </label>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  {editingName ? (
                    <input
                      autoFocus
                      defaultValue={profile.name}
                      onBlur={(e) => { careerStore.setProfile({ name: e.target.value.trim() }); setEditingName(false); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingName(false); }}
                      placeholder="이름"
                      aria-label="이름"
                      className="border-b border-[#c58fa0] bg-transparent text-[19px] font-bold leading-tight text-[#191c20] outline-none placeholder:text-[#c9aeb8]"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingName(true)}
                      title="이름 수정"
                      className={cn('text-[19px] font-bold leading-tight text-[#191c20] decoration-dotted decoration-[#cfb6bf] underline-offset-4 hover:underline', !profile.name && 'text-[#c9aeb8]')}
                    >
                      {profile.name || '이름 적기'}
                    </button>
                  )}
                  <input
                    defaultValue={profile.tagline}
                    onBlur={(e) => careerStore.setProfile({ tagline: e.target.value.trim() })}
                    placeholder={persona === 'worker' ? '결제·정산 도메인 3년차 프론트엔드 개발자' : '웹 개발 동아리를 이끄는 컴퓨터공학 3학년'}
                    aria-label="소개"
                    className="min-w-[160px] flex-1 bg-transparent text-[13px] text-[#6e747d] outline-none placeholder:text-[#c9aeb8]"
                  />
                </div>
                {/* 연락처 — 생년월일 · 이메일 · 전화 · 대표 링크 (인라인 편집) */}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-[#8d949d]">
                  {([
                    ['birth', '생년월일', profile.birth, 'w-[92px]'],
                    ['email', '이메일', profile.email, 'w-[150px]'],
                    ['phone', '전화번호', profile.phone, 'w-[112px]'],
                  ] as const).map(([key, ph, value, width]) => (
                    <input
                      key={key}
                      defaultValue={value ?? ''}
                      onBlur={(e) => careerStore.setProfile({ [key]: e.target.value.trim() || undefined } as Partial<CareerProfile>)}
                      placeholder={ph}
                      aria-label={ph}
                      className={cn('bg-transparent tabular-nums outline-none placeholder:text-[#c9aeb8] focus:text-[#585055]', width)}
                    />
                  ))}
                  <span className="inline-flex items-center gap-1 text-[#8a3550]">
                    <Link2 className="h-[11px] w-[11px] text-[#9c4160]" />
                    <input
                      defaultValue={profile.link ?? ''}
                      onBlur={(e) => careerStore.setProfile({ link: e.target.value.trim() || undefined })}
                      placeholder="대표 링크"
                      aria-label="대표 링크"
                      className="w-[150px] bg-transparent text-[#8a3550] outline-none placeholder:text-[#c9aeb8]"
                    />
                  </span>
                </div>
              </div>

              <button type="button" onClick={() => setEditingName(true)} className="inline-flex h-[30px] shrink-0 items-center gap-1.5 self-start rounded-full bg-[#f1eaec] px-3 text-[12px] font-medium text-[#8a7d82] transition-colors hover:bg-[#ece1e4]">
                <Pencil className="h-3 w-3" /> 프로필 수정
              </button>
            </div>

            {/* ── 카테고리 그리드 카드 ── */}
            <div className="mx-auto max-w-[900px] rounded-[12px] border border-[#ecdfe3] bg-white px-[28px] py-6">
            <div className="grid grid-cols-1 items-start gap-x-14 gap-y-3.5 sm:grid-cols-2">
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
                        'group/section flex flex-col rounded-[10px] transition-colors',
                        dragOverCategory === category.id && 'bg-[#faf1f4] ring-1 ring-[#e3b9c6]',
                      )}
                    >
                      {/* 카드 헤더 — 번호 + 이름, 아래 헤어라인 (빈 칸이면 삭제 X) */}
                      <div className="flex items-baseline gap-2 border-b border-[#f0e8ea] pb-[9px]">
                        <span className="text-[11.5px] font-bold text-[#cf9dac]">
                          {String(sectionIndex + 1).padStart(2, '0')}
                        </span>
                        <h3 className="text-[15px] font-bold text-[#23262b]">{category.name}</h3>
                        {sectionItems.length === 0 && (
                          <button
                            type="button"
                            onClick={() => careerStore.removeCategory(category.id)}
                            aria-label={`${category.name} 칸 삭제`}
                            title="빈 칸 삭제"
                            className="ml-auto p-0.5 text-transparent transition-colors hover:!text-[#9c4160] group-hover/section:text-[#cfb6bf]"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {sectionItems.length === 0 ? (
                        /* 빈 칸 — 조용한 한 줄(문서가 안 비어 보이게). */
                        <button
                          type="button"
                          onClick={() => startAddTo(category.name)}
                          className="flex items-center gap-1.5 py-[13px] text-left text-[12.5px] text-[#c9aeb8] transition-colors hover:text-[#9c4160]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          첫 기록 추가
                        </button>
                      ) : (
                        <>
                          <ul className="divide-y divide-[#f7f1f3]">
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
                              className="mt-1.5 self-start text-[11.5px] text-[#a1888f] underline decoration-[#e0cdd3] underline-offset-4 transition-colors hover:text-[#9c4160]"
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

                  {/* 카테고리 추가 중 — 새 칸(번호 + 이름 입력) */}
                  {addingCategory && (
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-2 border-b border-[#f0e8ea] pb-[9px]">
                        <span className="text-[11.5px] font-bold text-[#cf9dac]">
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
                          placeholder="칸 이름 — 예: 봉사, 출판"
                          aria-label="새 칸 이름"
                          className="min-w-0 flex-1 bg-transparent text-[15px] font-bold text-[#23262b] outline-none placeholder:font-normal placeholder:text-[#c9aeb8]"
                        />
                      </div>
                      <p className="py-[13px] text-[11.5px] text-[#a1888f]">Enter로 추가 · Esc로 취소</p>
                    </div>
                  )}
              </div>

              {/* 푸터 — 카테고리 추가 + 범례 */}
              <div className="mt-5 flex items-center gap-2 whitespace-nowrap text-[13px] text-[#a1888f]">
                <button type="button" onClick={() => setAddingCategory(true)} className="inline-flex items-center gap-2 transition-colors hover:text-[#9c4160]">
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} /> 카테고리 추가
                </button>
                <span className="ml-auto flex items-center gap-3.5 text-[12px] text-[#c9aeb8]">
                  <span className="inline-flex items-center gap-1.5"><Link2 className="h-[13px] w-[13px]" strokeWidth={1.7} /> 증빙 있음</span>
                  <span className="inline-flex items-center gap-1.5"><FileText className="h-[13px] w-[13px]" strokeWidth={1.7} /> 문서에 포함</span>
                </span>
              </div>
            </div>
          </main>
            </div>
            ) : (
              <DocsListView
                purpose={view}
                docs={docs.filter((d) => d.purpose === view)}
                canCreate={items.length > 0}
                onOpen={setViewDoc}
                onCreate={() => (view === '이력서' ? setResumeOpen(true) : setComposePurpose(view))}
                boardNameOf={boards.length > 1 ? (doc) => boards.find((b) => b.id === doc.boardId)?.name : undefined}
              />
            )}
          </div>
        </div>
      </LayoutGroup>

      <ResumeDialog
        open={resumeOpen}
        onClose={() => setResumeOpen(false)}
        profile={profile}
        sections={sections.filter((s) => s.items.length > 0)}
      />
      <ComposeDialog
        purpose={composePurpose}
        onClose={() => setComposePurpose(null)}
        onCreated={() => { if (composePurpose) setView(composePurpose); }}
      />
      <DocViewDialog doc={viewDoc} onClose={() => setViewDoc(null)} />
      <DetailDialog item={detailItem} onClose={() => setDetailItem(null)} />
      <RecommendDialog open={recommendOpen} onClose={() => setRecommendOpen(false)} />
      <NewBoardDialog
        open={boardDialogOpen}
        onClose={() => setBoardDialogOpen(false)}
        onCreate={(name, persona) => {
          // 새 보드는 이름·연락처 등 인적사항을 비운 채 시작한다 (보드는 개별).
          // 다이얼로그에서 고른 신분(persona)으로 시드 칸을 준비하고 설정 화면 재노출을 막는다.
          const board = careerStore.addBoard(name, { persona });
          if (!board) {
            notify.error('보드를 만들지 못했어요', { description: '저장 공간이 가득 찼을 수 있어요.' });
            return;
          }
          // addBoard 가 새 보드를 활성화하므로, 신분 시드 칸은 새 보드 안에 심긴다.
          SEED_CATEGORIES[persona].forEach((n) => careerStore.ensureCategory(n));
          setView('board');
          setBoardDialogOpen(false);
        }}
      />
    </>
  );
}

/* ═══════════════ 문서 보관함 뷰 — 사이드바에서 고른 종류의 산출물 ═══════════════ */

function DocsListView({
  purpose, docs, canCreate, onOpen, onCreate, boardNameOf,
}: {
  purpose: ComposePurpose;
  docs: CareerDoc[];
  canCreate: boolean;
  onOpen: (doc: CareerDoc) => void;
  onCreate: () => void;
  /** 보드가 여럿일 때만 — 문서가 어느 보드의 기록으로 만들어졌는지 칩으로 표시. */
  boardNameOf?: (doc: CareerDoc) => string | undefined;
}) {
  const meta = COMPOSE_PURPOSES.find((c) => c.purpose === purpose);
  const hsl = meta?.hsl ?? '6 70% 51%';
  return (
    <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
      <div className="mx-auto w-full max-w-[1080px] px-4 py-6 sm:px-8">
        {/* 섹션 머리 — 아이브로우 + 제목 + 만들기 CTA */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-bold tracking-[0.22em] text-muted-foreground/60">DOCUMENTS</p>
            <h2 className="mt-1.5 flex items-baseline gap-2 text-[27px] font-bold leading-none tracking-tight">
              {meta?.label ?? purpose}
              {docs.length > 0 && <span className="career-mono text-[14px] font-bold tabular-nums text-muted-foreground/55">{docs.length}</span>}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCreate}
            disabled={!canCreate}
            title={canCreate ? undefined : '스펙 보드에 기록이 쌓이면 만들 수 있어요'}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-bold text-white shadow-sm transition-[filter] hover:brightness-[1.06] disabled:opacity-40"
            style={{ backgroundColor: `hsl(${hsl})` }}
          >
            <Plus className="h-3.5 w-3.5" /> 새 {meta?.label ?? purpose} 만들기
          </button>
        </div>

        {docs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))]/60 py-16 text-center">
            <p className="text-[13.5px] font-semibold text-foreground/80">
              {purpose === '이력서' ? '이력서는 미리보기에서 서식을 골라 PDF로 저장해요.' : `아직 만든 ${meta?.label ?? purpose}가 없어요.`}
            </p>
            <p className="mx-auto mt-1.5 max-w-[360px] text-[12px] leading-relaxed text-muted-foreground">
              {canCreate
                ? '스펙 보드의 기록을 재료로 AI가 초안을 써드려요.'
                : '먼저 스펙 보드에 이룬 것을 기록해 주세요 — 기록이 문서의 재료가 돼요.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => onOpen(doc)}
                className="group overflow-hidden rounded-2xl border border-[hsl(var(--foreground)/0.1)] bg-[hsl(var(--surface-1))] text-left shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.14)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-14px_hsl(var(--foreground)/0.3)]"
              >
                {/* 종류 색 밴드 — 사이드바 점과 같은 색 부호 */}
                <div className="h-1.5" style={{ backgroundColor: `hsl(${hsl} / 0.75)` }} />
                <div className="px-4 pb-4 pt-3">
                  <p className="truncate text-[13.5px] font-bold transition-colors group-hover:text-[hsl(var(--career-red))]">
                    {doc.request?.trim() || meta?.label || doc.purpose}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5">
                    <span className="career-mono text-[10.5px] text-muted-foreground/60">{doc.createdAt.slice(0, 10).replaceAll('-', '.')}</span>
                    {boardNameOf?.(doc) && (
                      <span className="max-w-[120px] truncate rounded-full bg-[hsl(var(--surface-3))] px-1.5 py-px text-[9.5px] font-semibold text-muted-foreground/75">
                        {boardNameOf(doc)}
                      </span>
                    )}
                  </p>
                  <p className="career-serif mt-2 line-clamp-4 whitespace-pre-line text-[12px] leading-[1.7] text-foreground/70">
                    {doc.content}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ 이력서 미리보기·PDF 내보내기 ═══════════════ */

/** 커리어 보드 데이터 → 서식 A4 이력서. 흰 종이·검정 잉크 고정(테마 무관), html2canvas→PDF. */
function ResumeDialog({
  open,
  onClose,
  profile,
  sections,
}: {
  open: boolean;
  onClose: () => void;
  profile: CareerProfile;
  sections: Array<{ category: SpecCategory; items: SpecItem[] }>;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [panelTab, setPanelTab] = useState<'specs' | 'design'>('specs');
  const [templateId, setTemplateId] = useState<ResumeTemplateId>('minimal');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [fitScale, setFitScale] = useState(1); // 칸 너비에 맞춘 기본 배율
  const [zoom, setZoom] = useState(1); // 사용자 확대 배율 (1 = 맞춤)
  const [sheetH, setSheetH] = useState(1123);

  const scale = fitScale * zoom;

  const toggleItem = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // 선택된(제외 안 된) 항목만 담고, 빈 카테고리는 뺀다.
  const filtered = useMemo(
    () =>
      sections
        .map((s) => ({ category: s.category, items: s.items.filter((i) => !excluded.has(i.id)) }))
        .filter((s) => s.items.length > 0),
    [sections, excluded],
  );

  const template = RESUME_TEMPLATES.find((t) => t.id === templateId) ?? RESUME_TEMPLATES[0];
  const Template = template.Component;

  // 미리보기 A4 시트(794px)를 프리뷰 칸 너비에 맞춰 축소 — 네 변에 여백이 도는 온전한 페이지로.
  // 다이얼로그 오픈 애니메이션 중엔 폭이 아직 0일 수 있어 rAF로 재측정 + ResizeObserver 로 추적.
  useLayoutEffect(() => {
    if (!open) return;
    setZoom(1); // 열 때마다 맞춤 배율로 시작
    const measure = () => {
      const el = previewRef.current;
      if (!el) return;
      // 페이지 맞춤(PDF 뷰어 방식) — 너비·높이 둘 다 재서 A4 한 장이 통째로 데스크 위에 보이게.
      const availW = el.clientWidth - 72;
      const availH = el.clientHeight - 48;
      if (availW > 80 && availH > 80) {
        setFitScale(Math.max(0.2, Math.min(1, availW / 794, availH / 1123)));
      }
    };
    measure();
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      measure();
      raf2 = requestAnimationFrame(measure);
    });
    const el = previewRef.current;
    const ro = el ? new ResizeObserver(measure) : null;
    if (el && ro) ro.observe(el);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      ro?.disconnect();
    };
  }, [open]);

  // 시트 실제 높이 측정 — 축소 래퍼가 정확한 자리를 차지해 스크롤이 맞도록.
  useLayoutEffect(() => {
    if (sheetRef.current) setSheetH(sheetRef.current.offsetHeight);
  }, [filtered, templateId, open]);

  const exportPdf = async () => {
    const el = sheetRef.current;
    if (!el) return;
    setExporting(true);
    try {
      const name = sanitizeFileName(`이력서_${profile.name || '마이커리어'}_${new Date().toISOString().slice(0, 10)}`);
      await exportElementToPdf(el, {
        fileName: name,
        format: 'a4',
        background: '#ffffff',
        pageHeightPx: 1123, // A4 @96dpi
        avoidBreakSelectors: '.resume-item',
      });
      notify.success('이력서 PDF를 저장했어요');
    } catch (err) {
      notify.error('PDF 저장에 실패했어요', {
        description: err instanceof Error ? err.message : '잠시 뒤 다시 시도해 주세요.',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="career-theme max-w-[1080px] overflow-hidden p-0" hideClose>
        <DialogTitle className="sr-only">이력서 만들기</DialogTitle>
        <div className="flex h-[82vh] max-h-[780px]">
          {/* ── 좌 — 컨트롤: 스펙 고르기 / 디자인 ── */}
          <div className="flex w-[300px] shrink-0 flex-col border-r border-[hsl(var(--hairline))]">
            <div className="border-b border-[hsl(var(--hairline))] px-4 pb-2.5 pt-4">
              <h2 className="text-[15px] font-bold">이력서 만들기</h2>
              <div className="mt-2.5 inline-flex rounded-lg bg-[hsl(var(--foreground)/0.055)] p-0.5 text-[12px]">
                {([['specs', '스펙 고르기'], ['design', '디자인']] as const).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPanelTab(k)}
                    className={cn(
                      'rounded-md px-3 py-1 font-semibold transition-colors',
                      panelTab === k ? 'bg-[hsl(var(--surface-1))] text-[hsl(var(--career-red))] shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-3.5">
              {panelTab === 'specs' ? (
                <div className="space-y-4">
                  {/* 연락처 — 이력서 머리글용 */}
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">연락처</p>
                    <input
                      defaultValue={profile.email ?? ''}
                      onBlur={(e) => careerStore.setProfile({ email: e.target.value.trim() || undefined })}
                      placeholder="이메일"
                      className="mb-1.5 h-8 w-full rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))] px-2.5 text-[12px] outline-none placeholder:text-muted-foreground/45 focus:border-[hsl(var(--career-red))]"
                    />
                    <input
                      defaultValue={profile.phone ?? ''}
                      onBlur={(e) => careerStore.setProfile({ phone: e.target.value.trim() || undefined })}
                      placeholder="전화번호"
                      className="h-8 w-full rounded-md border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))] px-2.5 text-[12px] outline-none placeholder:text-muted-foreground/45 focus:border-[hsl(var(--career-red))]"
                    />
                  </div>

                  {/* 넣을 스펙 고르기 */}
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">넣을 스펙</p>
                    {sections.length === 0 ? (
                      <p className="text-[12px] text-muted-foreground/60">기록이 없어요.</p>
                    ) : (
                      <div className="space-y-3">
                        {sections.map(({ category, items }) => (
                          <div key={category.id}>
                            <p className="mb-1 flex items-center gap-1.5 text-[11.5px] font-bold">
                              <span className="career-mono text-[10px] text-[hsl(var(--career-red))]">{category.name}</span>
                            </p>
                            <div className="space-y-0.5">
                              {items.map((item) => (
                                <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 hover:bg-[hsl(var(--foreground)/0.03)]">
                                  <input
                                    type="checkbox"
                                    checked={!excluded.has(item.id)}
                                    onChange={() => toggleItem(item.id)}
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[hsl(var(--career-red))]"
                                  />
                                  <span className={cn('text-[12px] leading-snug', excluded.has(item.id) ? 'text-muted-foreground/50 line-through' : 'text-foreground')}>
                                    {item.refined}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* 디자인(양식) 선택 — 미니 썸네일 2열 카드 */
                <div className="grid grid-cols-2 gap-2">
                  {RESUME_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemplateId(t.id)}
                      className={cn(
                        'overflow-hidden rounded-lg border text-left transition-all',
                        templateId === t.id
                          ? 'border-[hsl(var(--career-red))] ring-2 ring-[hsl(var(--career-red)/0.22)]'
                          : 'border-[hsl(var(--hairline))] hover:border-[hsl(var(--career-red)/0.45)]',
                      )}
                    >
                      <div className="border-b border-[hsl(var(--hairline))]">
                        <ResumeThumb id={t.id} />
                      </div>
                      <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-bold leading-tight">{t.name}</p>
                          <p className="truncate text-[10px] text-muted-foreground">{t.desc}</p>
                        </div>
                        {templateId === t.id && <span className="shrink-0 text-[11px] text-[hsl(var(--career-red))]">●</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 하단 — PDF 저장 */}
            <div className="border-t border-[hsl(var(--hairline))] p-3">
              <button
                type="button"
                onClick={() => void exportPdf()}
                disabled={exporting || filtered.length === 0}
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[hsl(var(--career-red))] text-[13px] font-semibold text-white shadow-[0_6px_16px_-8px_hsl(var(--career-red)/0.8)] transition-[filter,opacity] hover:brightness-[1.06] disabled:opacity-45"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                {exporting ? '내보내는 중…' : 'PDF 저장'}
              </button>
            </div>
          </div>

          {/* ── 우 — 라이브 A4 미리보기 (칸 너비에 맞춰 축소된 온전한 페이지) ── */}
          <div className="flex min-w-0 flex-1 flex-col bg-neutral-300">
            <div className="flex shrink-0 items-center gap-2 border-b border-neutral-400/40 px-4 py-2">
              <span className="text-[12px] text-neutral-600">미리보기 · A4 · {template.name}</span>
              {/* 기본 닫기 X는 hideClose 로 숨김 — 줌과 자체 닫기를 한 줄에 정렬 */}
              <div className="ml-auto flex items-center gap-0.5 text-neutral-600">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
                  aria-label="축소"
                  className="grid h-7 w-7 place-items-center rounded-md text-[15px] leading-none transition-colors hover:bg-neutral-400/25"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  title="페이지에 맞추기"
                  className="min-w-[46px] rounded-md px-1.5 py-1 text-center text-[11.5px] font-semibold tabular-nums transition-colors hover:bg-neutral-400/25"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                  aria-label="확대"
                  className="grid h-7 w-7 place-items-center rounded-md text-[15px] leading-none transition-colors hover:bg-neutral-400/25"
                >
                  +
                </button>
                <span aria-hidden className="mx-1.5 h-4 w-px bg-neutral-400/50" />
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="닫기"
                  className="grid h-7 w-7 place-items-center rounded-md text-[15px] leading-none transition-colors hover:bg-neutral-400/25"
                >
                  ×
                </button>
              </div>
            </div>
            <div ref={previewRef} className="scrollbar-thin flex-1 overflow-auto p-7">
              <div className="mx-auto" style={{ width: 794 * scale, height: sheetH * scale }}>
                <div style={{ width: 794, transformOrigin: 'top left', transform: `scale(${scale})` }}>
                  <div ref={sheetRef} className="shadow-[0_14px_50px_-14px_rgba(0,0,0,0.5)] ring-1 ring-black/5">
                    <Template profile={profile} sections={filtered} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  const [editing, setEditing] = useState(false); // 먼저 뷰어, 편집 누르면 폼
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
      <DialogHeader className={cn(!editing && 'sr-only')}>
        <DialogTitle className="career-serif text-[16px]">{editing ? '편집' : '세부사항'}</DialogTitle>
      </DialogHeader>
      {!editing ? (
        /* ── 뷰어 — 먼저 읽기 화면, 편집 눌러야 폼 ── */
        <div className="space-y-4">
          <div>
            <p className="career-serif text-[16.5px] font-semibold leading-relaxed">{item.refined}</p>
            <p className="career-mono mt-1.5 text-[12px] text-muted-foreground">
              {formatPeriod(item)}{item.org ? ` · ${item.org}` : ''}
            </p>
          </div>
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[12.5px] text-[hsl(var(--career-red))] hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> 증빙 링크 열기
            </a>
          )}
          <div>
            <p className="career-mono mb-1.5 text-[11px] text-muted-foreground">세부사항</p>
            {item.detail ? (
              <p className="whitespace-pre-wrap rounded-md bg-[hsl(var(--surface-2))] p-3 text-[13px] leading-relaxed">{item.detail}</p>
            ) : (
              <p className="text-[12.5px] text-muted-foreground/70">아직 없어요. 편집에서 상황·역할·결과를 채우면 이력서·자소서 생성에 활용돼요.</p>
            )}
          </div>
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={remove}
              className="inline-flex h-8 items-center gap-1.5 px-2 text-[12px] font-semibold text-[hsl(var(--career-red))] transition-opacity hover:opacity-75"
            >
              <Trash2 className="h-3 w-3" /> 삭제
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-[12.5px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Pencil className="h-3.5 w-3.5" /> 편집
            </button>
          </div>
        </div>
      ) : (
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
            className="inline-flex h-8 items-center gap-1.5 px-2 text-[12px] font-semibold text-[hsl(var(--career-red))] transition-opacity hover:opacity-75"
          >
            <Trash2 className="h-3 w-3" />
            삭제
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex h-8 items-center rounded-lg px-3 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              취소
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
      </div>
      )}
    </>
  );
}

/* ═══════════════ AI 생성 다이얼로그 ═══════════════ */

function ComposeDialog({ purpose, onClose, onCreated }: { purpose: ComposePurpose | null; onClose: () => void; onCreated?: () => void }) {
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
      onCreated?.();
      notify.success('보관함에 저장했어요');
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
    notify.success('보관함에서 지웠어요');
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
            className="inline-flex h-8 items-center gap-1.5 px-2 text-[12px] font-semibold text-[hsl(var(--career-red))] transition-opacity hover:opacity-75"
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

/* ═══════════════ 추천 스펙 — 규칙 기반 진단 + 신분별 플레이북 ═══════════════ */

/** 신분별 커리어 플레이북 — 채워두면 좋은 축과 구체 아이디어. */
const CAREER_PLAYBOOK: Record<CareerPersona, Array<{ area: string; keywords: string[]; why: string; ideas: string[] }>> = {
  highschool: [
    { area: '수상', keywords: ['수상', '대회'], why: '객관적 성과 한 줄이 생활기록부·자소서의 힘이 됩니다.', ideas: ['교내 경시대회 입상', '교외 공모전 참가·수상'] },
    { area: '봉사', keywords: ['봉사'], why: '꾸준한 봉사는 인성·성실성의 근거가 돼요.', ideas: ['정기 봉사 20시간 이상', '또래 멘토링'] },
    { area: '동아리·활동', keywords: ['동아리', '활동', '자율'], why: '주도적으로 한 활동은 리더십과 관심 분야를 보여줍니다.', ideas: ['동아리 부장·팀장', '학생회 활동'] },
    { area: '탐구·독서', keywords: ['독서', '탐구', '진로'], why: '진로와 연결된 탐구는 지원 동기를 탄탄하게 합니다.', ideas: ['진로 관련 도서 3권', '소논문·탐구 보고서'] },
  ],
  student: [
    { area: '자격증', keywords: ['자격', '어학'], why: '직무 관련 자격은 서류에서 즉시 읽히는 신호예요.', ideas: ['정보처리기사', '토익 800+', 'SQLD·컴활'] },
    { area: '프로젝트', keywords: ['프로젝트', '개발', '포트폴리오'], why: '직접 만들어 본 경험이 면접 대화를 이끕니다.', ideas: ['팀 프로젝트 완주', '개인 토이 프로젝트 배포', '오픈소스 기여'] },
    { area: '대외활동', keywords: ['대외', '활동', '인턴', '공모전'], why: '학교 밖 경험은 실행력·협업을 보여줘요.', ideas: ['공모전 입상', '인턴십', '부트캠프·학회'] },
    { area: '어학', keywords: ['어학', '토익', '영어'], why: '어학 점수는 지원 폭을 넓혀줍니다.', ideas: ['토익·오픽·토스', '교환학생·어학연수'] },
  ],
  jobseeker: [
    { area: '직무 프로젝트', keywords: ['프로젝트', '직무', '포트폴리오'], why: '지원 직무와 맞닿은 결과물이 합격을 가릅니다.', ideas: ['직무 관련 사이드 프로젝트', '실무형 과제 수행'] },
    { area: '인턴·경험', keywords: ['인턴', '경험', '경력'], why: '현업 경험은 즉시 전력감을 증명합니다.', ideas: ['인턴십·계약직', '외주·프리랜스'] },
    { area: '자격·어학', keywords: ['자격', '어학'], why: '지원 자격 요건을 채워 필터를 통과하세요.', ideas: ['직무 자격증', '어학 점수 갱신'] },
    { area: '포트폴리오', keywords: ['포트폴리오'], why: '한 번에 실력을 보여주는 대표 산출물이 필요해요.', ideas: ['포트폴리오 웹·PDF 정리', 'GitHub·블로그 정돈'] },
  ],
  worker: [
    { area: '성과 지표', keywords: ['성과', '지표', '실적'], why: '숫자로 말하는 성과가 이직 시장에서 가장 강합니다.', ideas: ['핵심 지표 개선(%·금액)', '비용·시간 절감 사례'] },
    { area: '리딩·협업', keywords: ['리드', '프로젝트', '협업'], why: '주도·협업 경험은 시니어리티를 증명합니다.', ideas: ['프로젝트 리드', '신규 도입·표준화 주도'] },
    { area: '전문성', keywords: ['발표', '교육', '자격', '세미나'], why: '깊이의 근거가 되는 학습·발표를 남기세요.', ideas: ['사내외 세미나 발표', '자격·교육 이수'] },
    { area: '외부 활동', keywords: ['블로그', '오픈소스', '컨퍼런스'], why: '평판·네트워크는 기회를 만듭니다.', ideas: ['기술 블로그·오픈소스', '컨퍼런스 발표'] },
  ],
};

type Rec = { priority: 1 | 2 | 3; area: string; why: string; ideas: string[] };

function RecommendDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { items, categories, profile } = useCareerBoard();
  const persona = (profile.persona || 'student') as CareerPersona;

  const dx = useMemo(() => {
    const total = items.length;
    const withEvidence = items.filter((i) => i.link).length;
    const evidencePct = total ? Math.round((withEvidence / total) * 100) : 0;
    const catName = new Map(categories.map((c) => [c.id, c.name] as const));
    const emptyCats = categories.filter((c) => !items.some((i) => i.categoryId === c.id));
    const usedText = items.map((i) => `${catName.get(i.categoryId) ?? ''} ${i.refined}`).join(' ');

    const recs: Rec[] = [];
    // 1) 비어 있는 칸 — 채우면 바로 좋아짐
    for (const c of emptyCats.slice(0, 3)) {
      recs.push({ priority: 1, area: c.name, why: '아직 비어 있는 칸이에요. 첫 기록으로 채워보세요.', ideas: [] });
    }
    // 2) 신분 플레이북 — 아직 안 다룬 축
    for (const p of CAREER_PLAYBOOK[persona]) {
      const covered = p.keywords.some((k) => usedText.includes(k));
      if (!covered) recs.push({ priority: 2, area: p.area, why: p.why, ideas: p.ideas });
    }
    // 3) 증빙 보강
    if (total >= 2 && evidencePct < 40) {
      recs.push({ priority: 3, area: '증빙 보강', why: `기록 중 ${evidencePct}%만 증빙 링크가 있어요. 링크를 더하면 문서 신뢰도가 올라가요.`, ideas: [] });
    }
    return { total, evidencePct, emptyCount: emptyCats.length, recs: recs.slice(0, 6) };
  }, [items, categories, persona]);

  const PRIO_META: Record<Rec['priority'], { label: string; cls: string }> = {
    1: { label: '우선', cls: 'bg-[#f2d7dd] text-[#9c2f47]' },
    2: { label: '추천', cls: 'bg-[#f2e5cf] text-[#8a5a1a]' },
    3: { label: '보강', cls: 'bg-[#e4e8ef] text-[#4a5568]' },
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="career-theme max-w-xl">
        <DialogHeader>
          <DialogTitle className="career-serif text-[16px]">추천 스펙 · 다음에 쌓을 것</DialogTitle>
        </DialogHeader>
        <p className="-mt-1 text-[12.5px] text-muted-foreground">{PERSONA_LABEL[persona]} 기준으로 지금 보드를 진단해 다음 스펙을 골라드려요.</p>

        {/* 진단 요약 */}
        <div className="grid grid-cols-3 gap-2">
          {([['기록', `${dx.total}`], ['증빙 비율', `${dx.evidencePct}%`], ['빈 칸', `${dx.emptyCount}`]] as const).map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-3 py-2.5 text-center">
              <p className="text-[19px] font-extrabold tabular-nums text-[hsl(28_50%_39%)]">{value}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* 추천 목록 */}
        {dx.recs.length === 0 ? (
          <div className="rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-4 text-center text-[13px] text-muted-foreground">
            축들이 고르게 채워져 있어요 👍 지금 기록으로 문서를 만들어보세요.
          </div>
        ) : (
          <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-0.5">
            {dx.recs.map((r, i) => (
              <div key={`${r.area}-${i}`} className="rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-3.5">
                <div className="flex items-center gap-2">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10.5px] font-bold', PRIO_META[r.priority].cls)}>{PRIO_META[r.priority].label}</span>
                  <span className="text-[14px] font-bold text-foreground">{r.area}</span>
                </div>
                <p className="mt-1.5 break-keep text-[12.5px] leading-relaxed text-muted-foreground">{r.why}</p>
                {r.ideas.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {r.ideas.map((idea) => (
                      <span key={idea} className="rounded-full bg-[hsl(28_48%_50%/0.1)] px-2.5 py-1 text-[12px] font-medium text-[hsl(28_50%_39%)]">{idea}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════ 새 스펙 보드 — 이름 + 신분(칸 자동 준비) ═══════════════ */

function NewBoardDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string, persona: CareerPersona) => void }) {
  const [name, setName] = useState('');
  const [persona, setPersona] = useState<CareerPersona | ''>('');

  const reset = () => { setName(''); setPersona(''); };
  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed || !persona) return;
    onCreate(trimmed, persona);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { reset(); onClose(); } }}>
      <DialogContent className="career-theme max-w-sm">
        <DialogHeader>
          <DialogTitle className="career-serif text-[16px]">새 스펙 보드</DialogTitle>
        </DialogHeader>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          보드마다 기록을 따로 쌓아요 — 취업용·대학원용처럼 갈래를 나누고, 각 보드의 기록으로 문서를 만들어요.
        </p>

        {/* 이름 */}
        <div className="space-y-1.5">
          <label htmlFor="new-board-name" className="text-[11.5px] font-bold tracking-[0.02em] text-muted-foreground">보드 이름</label>
          <input
            id="new-board-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
            placeholder="예: 취업용 · 대학원용 · 이직용"
            maxLength={30}
            className="h-10 w-full rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-3 text-[13.5px] outline-none transition-colors focus:border-[hsl(var(--career-red)/0.55)]"
          />
        </div>

        {/* 신분 — 고르면 그에 맞는 칸이 자동 생성 */}
        <div className="space-y-1.5">
          <label className="text-[11.5px] font-bold tracking-[0.02em] text-muted-foreground">신분 — 고르면 칸이 준비돼요</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(SEED_CATEGORIES) as CareerPersona[]).map((p) => {
              const on = persona === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPersona(p)}
                  aria-pressed={on}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left transition-colors',
                    on
                      ? 'border-[hsl(var(--career-red)/0.6)] bg-[hsl(var(--career-red)/0.1)]'
                      : 'border-[hsl(var(--hairline))] hover:border-[hsl(var(--career-red)/0.4)]',
                  )}
                >
                  <span className={cn('block text-[13px] font-bold', on ? 'text-[hsl(var(--career-red))]' : 'text-foreground/85')}>
                    {PERSONA_LABEL[p]}
                  </span>
                  <span className="career-mono mt-0.5 block truncate text-[10px] text-muted-foreground/70">
                    {SEED_CATEGORIES[p].join(' · ')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!name.trim() || !persona}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-[hsl(var(--career-red))] px-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-45"
        >
          만들기
        </button>
      </DialogContent>
    </Dialog>
  );
}
