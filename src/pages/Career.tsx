/**
 * 스펙 보드 — /career (아직 완성 안 된 내 이력서의 원본).
 *
 * 만능 입력구 한 줄 → AI가 이력서 문장으로 다듬고 섹션 자동 분류 →
 * 이력서 섹션처럼 생긴 보드에 쌓인다. 카테고리는 기록에서 자라난다.
 * 습관 장치(스트릭·게이지) 없음 — 일어나면 넣는 금고.
 *
 * 데이터: careerStore (LocalStorage). AI: quickAi 재사용.
 * 팔레트: .career-theme (index.css) — 슬레이트 + 뮤트 앰버.
 */
import { useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  Check,
  Copy,
  CornerDownLeft,
  Download,
  FileText,
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

/** 빈 보드 예시 — "이런 걸 적는 거구나"를 첫 3초에 전달. */
const EMPTY_EXAMPLES: Array<{ persona: string; lines: Array<{ section: string; text: string }> }> = [
  {
    persona: '대학생이라면',
    lines: [
      { section: '자격증', text: '정보처리기사 취득' },
      { section: '동아리·활동', text: '중앙 코딩 동아리 회장 (부원 32명)' },
      { section: '수상', text: '교내 창업 아이디어 공모전 최우수상' },
    ],
  },
  {
    persona: '직장인이라면',
    lines: [
      { section: '경력', text: '결제 페이지 로딩 3.2초 → 0.9초 개선' },
      { section: '프로젝트', text: '신규 온보딩 개편 — 첫날 이탈률 18% 감소' },
      { section: '교육', text: '사내 SQL 심화 과정 수료' },
    ],
  },
];

const COMPOSE_PURPOSES: ComposePurpose[] = ['이력서', '자기소개서 초안', '포트폴리오 요약'];

/** 입력 → AI 변신 단계. idle = 입력 대기. */
type CapturePhase =
  | { step: 'idle' }
  | { step: 'thinking'; raw: string }
  | { step: 'reveal'; raw: string; refined: string; category: string };

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${y}.${m}.${d}`;
};

export default function Career() {
  const { items, categories } = useCareerBoard();
  const [phase, setPhase] = useState<CapturePhase>({ step: 'idle' });
  const [draft, setDraft] = useState('');
  const [recentId, setRecentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  const busy = phase.step !== 'idle';

  const submit = async () => {
    const raw = draft.trim();
    if (!raw || busy) return;
    setDraft('');
    setPhase({ step: 'thinking', raw });
    const result = await aiClassifySpec(raw, categories.map((c) => c.name));
    setPhase({ step: 'reveal', raw, refined: result.refined, category: result.category });
    // 변신을 잠깐 보여준 뒤 보드에 꽂는다 — "내 말이 이력서 문장이 됐다"의 3초.
    window.setTimeout(() => {
      const item = careerStore.addItem({ raw, refined: result.refined, categoryName: result.category });
      setRecentId(item.id);
      setPhase({ step: 'idle' });
      if (result.category === FALLBACK_CATEGORY && result.refined === raw) {
        notify.error('AI 다듬기에 실패해서 원문 그대로 담았어요', {
          description: '카드의 연필 버튼으로 직접 다듬을 수 있어요.',
        });
      }
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }, 1100);
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
      <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-10 sm:pt-14">
        {/* ────── 헤더 ────── */}
        <header className="mb-8 flex items-end justify-between gap-3">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold tracking-wide text-primary">
              <Award className="h-3.5 w-3.5" />
              스펙 보드
            </p>
            <h1 className="text-[20px] font-bold leading-snug">
              아직 완성 안 된 내 이력서의 원본이에요
            </h1>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              이룬 일을 한 줄로 던지면, AI가 이력서 문장으로 다듬어 알맞은 칸에 쌓아둬요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            disabled={items.length === 0}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[hsl(var(--hairline))] bg-card px-3 text-[12.5px] font-semibold shadow-sm transition-colors',
              items.length === 0
                ? 'cursor-not-allowed opacity-45'
                : 'text-primary hover:bg-accent',
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            문서로 뽑기
          </button>
        </header>

        {/* ────── 만능 입력구 — 이력서의 다음 빈 줄 ────── */}
        <div className="mb-2">
          <div
            className={cn(
              'flex items-center gap-2 border-b-2 pb-2 transition-colors',
              busy ? 'border-[hsl(var(--border))]' : 'border-[hsl(var(--border))] focus-within:border-primary',
            )}
          >
            <span aria-hidden className="select-none text-[15px] font-semibold text-primary/70">+</span>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onInputKeyDown}
              disabled={busy}
              placeholder="여기에 다음 한 줄이 들어가요 — 방금 이룬 것을 적어보세요"
              aria-label="스펙 입력"
              className="h-9 min-w-0 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
            />
            <span className="hidden items-center gap-1 text-[11px] text-muted-foreground/70 sm:flex">
              <CornerDownLeft className="h-3 w-3" />
              엔터로 기록
            </span>
          </div>

          {/* 변신 카드 — 원문이 이력서 문장으로 바뀌는 순간. */}
          <AnimatePresence>
            {phase.step !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="mt-3 overflow-hidden rounded-xl border border-[hsl(var(--hairline))] bg-card px-4 py-3 shadow-sm"
              >
                {phase.step === 'thinking' ? (
                  <div className="flex items-center gap-2.5 text-[13px]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">{phase.raw}</span>
                    <span className="shrink-0 text-[11.5px] text-primary">이력서 문장으로 다듬는 중…</span>
                  </div>
                ) : (
                  <motion.div
                    initial={{ rotateX: -84, opacity: 0 }}
                    animate={{ rotateX: 0, opacity: 1 }}
                    transition={{ duration: 0.38, ease: 'easeOut' }}
                    className="flex items-center gap-2.5 text-[13.5px]"
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 font-medium">{phase.refined}</span>
                    <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                      {phase.category}
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ────── 보드 — 이력서 섹션들 ────── */}
        {sections.length === 0 && phase.step === 'idle' ? (
          <EmptyBoard />
        ) : (
          <div className="mt-8 space-y-8">
            {sections.map(({ category, items: sectionItems }) => (
              <section
                key={category.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCategory(category.id);
                }}
                onDragLeave={() => setDragOverCategory((v) => (v === category.id ? null : v))}
                onDrop={(e) => onDropToCategory(e, category.id)}
                className={cn(
                  'rounded-xl transition-colors',
                  dragOverCategory === category.id && 'bg-primary/5 ring-1 ring-primary/30',
                )}
              >
                <div className="mb-1.5 flex items-baseline gap-2 border-b border-[hsl(var(--hairline))] pb-1.5">
                  <h2 className="text-[13px] font-bold tracking-wide">{category.name}</h2>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{sectionItems.length}</span>
                </div>
                <ul>
                  <AnimatePresence initial={false}>
                    {sectionItems.map((item) => (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      >
                      {/* HTML5 드래그는 motion 컴포넌트의 onDragStart 와 충돌해서 내부 div 가 담당. */}
                      <div
                        draggable={editingId !== item.id}
                        onDragStart={(e: DragEvent) => e.dataTransfer.setData('text/plain', item.id)}
                        className={cn(
                          'group flex items-center gap-2 rounded-md px-1.5 py-1.5',
                          editingId !== item.id && 'cursor-grab hover:bg-accent/60',
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
                              className="h-7 min-w-0 flex-1 rounded-md border border-primary/40 bg-card px-2 text-[13.5px] outline-none"
                            />
                            <button
                              type="button"
                              onClick={commitEdit}
                              aria-label="수정 저장"
                              className="rounded-md p-1 text-primary hover:bg-accent"
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
                              {item.refined}
                            </span>
                            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground/80">
                              {formatDate(item.date)}
                            </span>
                            <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                aria-label="문장 수정"
                                title="문장 수정"
                                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(item)}
                                aria-label="삭제"
                                title="삭제"
                                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
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
            {sections.length > 1 && (
              <p className="text-center text-[11.5px] text-muted-foreground/70">
                분류가 어긋난 카드는 다른 칸으로 끌어다 놓으면 옮겨져요.
              </p>
            )}
          </div>
        )}
      </div>

      <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} />
    </div>
  );
}

/** 빈 보드 — 대학생/직장인 예시로 "이런 걸 적는 거구나"를 전달. */
function EmptyBoard() {
  return (
    <div className="mt-10">
      <p className="mb-5 text-center text-[13px] text-muted-foreground">
        첫 줄부터 시작해요. 예를 들면 이런 것들이 쌓여요.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {EMPTY_EXAMPLES.map((example) => (
          <div
            key={example.persona}
            className="rounded-xl border border-dashed border-[hsl(var(--hairline))] bg-card/50 p-4 opacity-75"
          >
            <p className="mb-2.5 text-[11.5px] font-semibold text-primary">{example.persona}</p>
            <ul className="space-y-2">
              {example.lines.map((line) => (
                <li key={line.text} className="flex items-center gap-2 text-[12.5px]">
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                    {line.section}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-foreground/80">{line.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 문서로 뽑기 — 쌓인 자산에서 목적별 문서 생성. */
function ComposeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { items, categories } = useCareerBoard();
  const [purpose, setPurpose] = useState<ComposePurpose>('이력서');
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
      setResult(await aiComposeCareerDoc(purpose, sections));
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
    const blob = new Blob([result], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${purpose}-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="career-theme max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[15px]">보드의 자산으로 문서 만들기</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {COMPOSE_PURPOSES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPurpose(p)}
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors',
                p === purpose
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-[hsl(var(--hairline))] text-muted-foreground hover:bg-accent',
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void generate()}
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
