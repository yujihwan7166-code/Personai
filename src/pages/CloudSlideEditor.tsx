/** /cloud/slide/:id — 슬라이드 에디터 v1.
 *  7단계-α: 좌측 썸네일 + 16:9 캔버스 + 텍스트박스 무제한 + 드래그 이동.
 *  도형·이미지·전환·발표 모드·.pptx import/export 는 다음 단계.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X, MoreHorizontal, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Keyboard,
  Plus, Trash2, Copy as CopyIcon, Type as TypeIcon, ChevronUp, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchNode, updateFileBody } from '@/lib/cloudClient';
import type { CloudNode } from '@/types/cloud';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
const AUTOSAVE_DELAY_MS = 1000;

interface SlideTextEl {
  id: string;
  type: 'text';
  xPct: number;  // 0~100, 캔버스 폭 대비
  yPct: number;
  wPct: number;
  hPct: number;
  content: string;
  fontSizeRem: number;
  bold?: boolean;
}

type SlideElement = SlideTextEl;

interface Slide {
  id: string;
  elements: SlideElement[];
  background?: string;
}

interface SlideMeta {
  slides: Slide[];
  currentIdx?: number;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function emptySlide(): Slide {
  return { id: newId('s'), elements: [] };
}

function defaultMeta(): SlideMeta {
  return { slides: [emptySlide()], currentIdx: 0 };
}

export default function CloudSlideEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [node, setNode] = useState<CloudNode | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [helpOpen, setHelpOpen] = useState(false);

  const [slides, setSlides] = useState<Slide[]>([emptySlide()]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  const [editingElId, setEditingElId] = useState<string | null>(null);

  const pendingRef = useRef<{ name?: string; meta?: Record<string, unknown> }>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ─── 노드 로드 ───
  useEffect(() => {
    if (!id) return;
    if (authLoading) return;
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const n = await fetchNode(id);
        if (cancelled) return;
        if (!n) { setLoadError('슬라이드를 찾을 수 없어요.'); return; }
        if (n.ownerId !== user.id) { setLoadError('접근 권한이 없어요.'); return; }
        if (n.kind !== 'file' || n.fileType !== 'slide') {
          setLoadError('슬라이드 파일이 아니에요.');
          return;
        }
        setNode(n);
        const meta = (n.meta ?? {}) as Partial<SlideMeta>;
        const loaded = Array.isArray(meta.slides) && meta.slides.length > 0
          ? meta.slides as Slide[]
          : defaultMeta().slides;
        setSlides(loaded);
        setCurrentIdx(Math.max(0, Math.min((meta.currentIdx ?? 0), loaded.length - 1)));
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [id, user, authLoading]);

  // ─── 저장 큐 ───
  const flushSave = useCallback(async () => {
    if (!id) return;
    const payload = pendingRef.current;
    if (!payload.name && !payload.meta) return;
    pendingRef.current = {};
    setSaveState('saving');
    try {
      await updateFileBody(id, payload);
      setSaveState('saved');
    } catch (e) {
      setSaveState('error');
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '저장 실패', description: msg });
    }
  }, [id]);

  const queueSave = useCallback((nextSlides: Slide[], nextIdx: number) => {
    pendingRef.current = {
      ...pendingRef.current,
      meta: { ...(node?.meta ?? {}), slides: nextSlides, currentIdx: nextIdx },
    };
    setSaveState('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void flushSave(); }, AUTOSAVE_DELAY_MS);
  }, [flushSave, node?.meta]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      void flushSave();
    };
  }, [flushSave]);

  // ─── 슬라이드 mutate ───
  const updateSlides = useCallback((updater: (prev: Slide[]) => Slide[], newIdx?: number) => {
    setSlides((prev) => {
      const next = updater(prev);
      const idxToUse = newIdx ?? currentIdx;
      queueSave(next, Math.max(0, Math.min(idxToUse, next.length - 1)));
      return next;
    });
  }, [queueSave, currentIdx]);

  const addSlide = useCallback(() => {
    updateSlides((prev) => {
      const next = [...prev];
      next.splice(currentIdx + 1, 0, emptySlide());
      return next;
    }, currentIdx + 1);
    setCurrentIdx((i) => i + 1);
    setSelectedElId(null);
    setEditingElId(null);
  }, [updateSlides, currentIdx]);

  const duplicateSlide = useCallback(() => {
    updateSlides((prev) => {
      const next = [...prev];
      const src = next[currentIdx];
      if (!src) return prev;
      next.splice(currentIdx + 1, 0, {
        ...src,
        id: newId('s'),
        elements: src.elements.map((el) => ({ ...el, id: newId('el') })),
      });
      return next;
    }, currentIdx + 1);
    setCurrentIdx((i) => i + 1);
  }, [updateSlides, currentIdx]);

  const deleteSlide = useCallback(() => {
    if (slides.length <= 1) {
      toast({ title: '마지막 슬라이드예요', description: '최소 1장은 유지됩니다.' });
      return;
    }
    const newSlides = slides.filter((_, i) => i !== currentIdx);
    const newIdx = Math.max(0, Math.min(currentIdx, newSlides.length - 1));
    setSlides(newSlides);
    setCurrentIdx(newIdx);
    setSelectedElId(null);
    setEditingElId(null);
    queueSave(newSlides, newIdx);
  }, [slides, currentIdx, queueSave]);

  const moveSlideUp = useCallback(() => {
    if (currentIdx === 0) return;
    updateSlides((prev) => {
      const next = [...prev];
      [next[currentIdx - 1], next[currentIdx]] = [next[currentIdx], next[currentIdx - 1]];
      return next;
    }, currentIdx - 1);
    setCurrentIdx((i) => i - 1);
  }, [updateSlides, currentIdx]);

  const moveSlideDown = useCallback(() => {
    if (currentIdx === slides.length - 1) return;
    updateSlides((prev) => {
      const next = [...prev];
      [next[currentIdx], next[currentIdx + 1]] = [next[currentIdx + 1], next[currentIdx]];
      return next;
    }, currentIdx + 1);
    setCurrentIdx((i) => i + 1);
  }, [updateSlides, currentIdx, slides.length]);

  // ─── 요소 mutate ───
  const updateCurrentSlide = useCallback((updater: (s: Slide) => Slide) => {
    updateSlides((prev) => prev.map((s, i) => (i === currentIdx ? updater(s) : s)));
  }, [updateSlides, currentIdx]);

  const addTextEl = useCallback((xPct = 10, yPct = 10) => {
    const el: SlideTextEl = {
      id: newId('el'),
      type: 'text',
      xPct, yPct,
      wPct: 40, hPct: 12,
      content: '내용을 입력하세요',
      fontSizeRem: 1.5,
    };
    updateCurrentSlide((s) => ({ ...s, elements: [...s.elements, el] }));
    setSelectedElId(el.id);
    setEditingElId(el.id);
  }, [updateCurrentSlide]);

  const updateEl = useCallback((elId: string, patch: Partial<SlideTextEl>) => {
    updateCurrentSlide((s) => ({
      ...s,
      elements: s.elements.map((el) => (el.id === elId ? { ...el, ...patch } : el)),
    }));
  }, [updateCurrentSlide]);

  const deleteEl = useCallback((elId: string) => {
    updateCurrentSlide((s) => ({
      ...s,
      elements: s.elements.filter((el) => el.id !== elId),
    }));
    setSelectedElId(null);
    setEditingElId(null);
  }, [updateCurrentSlide]);

  // ─── 캔버스 빈 곳 더블클릭 = 텍스트박스 추가 ───
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    addTextEl(Math.max(0, Math.min(95, xPct - 5)), Math.max(0, Math.min(90, yPct - 3)));
  }, [addTextEl]);

  // ─── 드래그 이동 ───
  const startDrag = useCallback((e: React.PointerEvent, elId: string, el: SlideTextEl) => {
    if (editingElId === elId) return; // 편집 중엔 드래그 X
    e.preventDefault();
    e.stopPropagation();
    setSelectedElId(elId);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const startElX = el.xPct;
    const startElY = el.yPct;
    let lastX = startElX;
    let lastY = startElY;

    const onMove = (ev: PointerEvent) => {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - startY) / rect.height) * 100;
      lastX = Math.max(0, Math.min(100 - el.wPct, startElX + dxPct));
      lastY = Math.max(0, Math.min(100 - el.hPct, startElY + dyPct));
      // 즉시 시각 반영 (state 통한 매번 저장 큐 방지 위해 직접 DOM 조작 → 단순화는 state 매번 업데이트)
      updateEl(elId, { xPct: lastX, yPct: lastY });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [editingElId, updateEl]);

  // ─── 키보드 ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingElId) return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isEditable = (e.target as HTMLElement | null)?.isContentEditable;
      if (tag === 'input' || tag === 'textarea' || isEditable) return;

      const isMod = e.ctrlKey || e.metaKey;
      if ((e.key === '?' || (e.shiftKey && e.key === '/')) && !isMod) {
        e.preventDefault();
        setHelpOpen(true);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElId) {
          e.preventDefault();
          deleteEl(selectedElId);
        }
      } else if (e.key === 'Escape') {
        setSelectedElId(null);
      } else if ((isMod) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        addSlide();
      } else if (!isMod && (e.key === 'ArrowDown' || e.key === 'PageDown')) {
        e.preventDefault();
        setCurrentIdx((i) => Math.min(slides.length - 1, i + 1));
        setSelectedElId(null);
      } else if (!isMod && (e.key === 'ArrowUp' || e.key === 'PageUp')) {
        e.preventDefault();
        setCurrentIdx((i) => Math.max(0, i - 1));
        setSelectedElId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingElId, selectedElId, deleteEl, addSlide, slides.length]);

  const close = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    void flushSave();
    navigate('/cloud');
  }, [flushSave, navigate]);

  // ─── 로딩·에러 ───
  if (authLoading || (!loadError && !node)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <div className="text-base font-medium">{loadError}</div>
        <button
          type="button"
          onClick={() => navigate('/cloud')}
          className="px-4 py-2 rounded border border-border hover:bg-muted text-sm flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          클라우드로 돌아가기
        </button>
      </div>
    );
  }

  const currentSlide = slides[currentIdx] ?? slides[0];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background sticky top-0 z-20">
        <div className="flex items-center gap-2 px-4 py-2 text-sm">
          <button onClick={close} className="p-2 rounded hover:bg-muted" aria-label="닫기" type="button">
            <X className="w-4 h-4" />
          </button>
          <span className="text-muted-foreground" aria-hidden>☁️</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium truncate max-w-md">{node?.name ?? '제목 없음'}</span>

          <span className="ml-3 text-xs">
            <SaveStateBadge state={saveState} />
          </span>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="p-2 rounded hover:bg-muted"
              aria-label="단축키 도움말"
              title="단축키 도움말 (?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => toast({ title: '곧 활성화돼요', description: '발표 모드·다운로드는 다음 단계입니다.' })}
              className="p-2 rounded hover:bg-muted"
              aria-label="더보기"
              title="더보기"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 도구바 */}
        <div className="border-t border-border bg-background flex items-center gap-0.5 px-3 py-1.5 overflow-x-auto">
          <ToolBtn onClick={addSlide} title="새 슬라이드 (Ctrl+M)">
            <Plus className="w-4 h-4" /><span className="text-xs ml-1">슬라이드</span>
          </ToolBtn>
          <ToolBtn onClick={() => addTextEl()} title="텍스트 추가">
            <TypeIcon className="w-4 h-4" /><span className="text-xs ml-1">텍스트</span>
          </ToolBtn>
          <Sep />
          <ToolBtn onClick={duplicateSlide} title="이 슬라이드 복제">
            <CopyIcon className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={moveSlideUp} disabled={currentIdx === 0} title="위로 이동">
            <ChevronUp className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={moveSlideDown} disabled={currentIdx === slides.length - 1} title="아래로 이동">
            <ChevronDown className="w-4 h-4" />
          </ToolBtn>
          <ToolBtn onClick={deleteSlide} disabled={slides.length <= 1} title="이 슬라이드 삭제" destructive>
            <Trash2 className="w-4 h-4" />
          </ToolBtn>
          <div className="ml-auto text-xs text-muted-foreground">
            {currentIdx + 1} / {slides.length}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 좌측 슬라이드 썸네일 */}
        <aside className="w-44 shrink-0 border-r border-border bg-muted/10 overflow-y-auto p-2 space-y-2">
          {slides.map((s, i) => (
            <ThumbButton
              key={s.id}
              idx={i}
              slide={s}
              active={i === currentIdx}
              onClick={() => {
                setCurrentIdx(i);
                setSelectedElId(null);
                setEditingElId(null);
                queueSave(slides, i);
              }}
            />
          ))}
          <button
            type="button"
            onClick={addSlide}
            className="w-full aspect-video border border-dashed border-border rounded hover:bg-muted/30 flex items-center justify-center text-xs text-muted-foreground"
          >
            <Plus className="w-3 h-3 mr-1" /> 슬라이드 추가
          </button>
        </aside>

        {/* 가운데 캔버스 */}
        <main className="flex-1 overflow-auto bg-muted/20 flex items-center justify-center p-8">
          <div
            className="w-full max-w-5xl bg-white shadow-lg rounded-sm overflow-hidden relative"
            style={{ aspectRatio: '16 / 9', background: currentSlide.background ?? '#fff' }}
          >
            <div
              ref={canvasRef}
              className="absolute inset-0 cursor-default"
              onClick={() => { setSelectedElId(null); setEditingElId(null); }}
              onDoubleClick={handleCanvasDoubleClick}
            >
              {currentSlide.elements.map((el) => (
                <TextElView
                  key={el.id}
                  el={el}
                  selected={selectedElId === el.id}
                  editing={editingElId === el.id}
                  onPointerDown={(e) => startDrag(e, el.id, el)}
                  onClick={(e) => { e.stopPropagation(); setSelectedElId(el.id); }}
                  onDoubleClick={(e) => { e.stopPropagation(); setSelectedElId(el.id); setEditingElId(el.id); }}
                  onChange={(content) => updateEl(el.id, { content })}
                  onFinishEdit={() => setEditingElId(null)}
                />
              ))}
              {currentSlide.elements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm pointer-events-none">
                  더블클릭으로 텍스트 추가 또는 도구바 [텍스트] 버튼
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <SlideHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

// ─────────────────────────────────────────────
// 좌측 썸네일 버튼 (미니 프리뷰)
// ─────────────────────────────────────────────

const ThumbButton = React.memo(function ThumbButton({
  idx, slide, active, onClick,
}: { idx: number; slide: Slide; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-stretch gap-2 group',
        'rounded-sm overflow-hidden',
      )}
      aria-label={`슬라이드 ${idx + 1}`}
      aria-pressed={active}
    >
      <span className="w-6 text-xs text-muted-foreground self-center">{idx + 1}</span>
      <span
        className={cn(
          'flex-1 aspect-video bg-white border rounded-sm relative overflow-hidden',
          active ? 'border-foreground/70 ring-2 ring-foreground/30' : 'border-border group-hover:border-foreground/40',
        )}
        style={{ background: slide.background ?? '#fff' }}
      >
        {slide.elements.map((el) => (
          <span
            key={el.id}
            className="absolute text-[5px] leading-tight overflow-hidden text-black/70"
            style={{
              left: `${el.xPct}%`,
              top: `${el.yPct}%`,
              width: `${el.wPct}%`,
              height: `${el.hPct}%`,
              fontWeight: el.bold ? 600 : 400,
            }}
          >
            {el.content || ' '}
          </span>
        ))}
      </span>
    </button>
  );
});

// ─────────────────────────────────────────────
// 텍스트 요소 (캔버스)
// ─────────────────────────────────────────────

interface TextElViewProps {
  el: SlideTextEl;
  selected: boolean;
  editing: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onChange: (content: string) => void;
  onFinishEdit: () => void;
}

function TextElView({
  el, selected, editing, onPointerDown, onClick, onDoubleClick, onChange, onFinishEdit,
}: TextElViewProps) {
  const editableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && editableRef.current) {
      editableRef.current.focus();
      // 커서 끝으로
      const range = document.createRange();
      range.selectNodeContents(editableRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  return (
    <div
      onPointerDown={editing ? undefined : onPointerDown}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        'absolute group',
        editing ? 'cursor-text' : 'cursor-move',
        'rounded-sm',
        selected && !editing && 'outline outline-2 -outline-offset-1 outline-foreground/70',
        !selected && 'hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-foreground/30',
      )}
      style={{
        left: `${el.xPct}%`,
        top: `${el.yPct}%`,
        width: `${el.wPct}%`,
        height: `${el.hPct}%`,
        padding: '4px 8px',
      }}
    >
      <div
        ref={editableRef}
        contentEditable={editing}
        suppressContentEditableWarning
        onInput={(e) => onChange((e.currentTarget.textContent ?? '').trim())}
        onBlur={onFinishEdit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onFinishEdit();
          }
        }}
        className={cn(
          'w-full h-full outline-none text-black/80 break-words overflow-hidden',
          el.bold && 'font-semibold',
        )}
        style={{ fontSize: `${el.fontSizeRem}rem`, lineHeight: 1.25 }}
      >
        {el.content}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 도구 버튼·구분선·저장 뱃지
// ─────────────────────────────────────────────

interface ToolBtnProps {
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  title?: string;
  children: React.ReactNode;
}

function ToolBtn({ onClick, disabled, destructive, title, children }: ToolBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        'px-2 py-1 rounded flex items-center transition-colors',
        disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted',
        destructive && !disabled && 'text-destructive hover:bg-destructive/10',
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-border mx-1 shrink-0" />;
}

function SaveStateBadge({ state }: { state: SaveState }) {
  if (state === 'saving') {
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />저장 중…
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <CheckCircle2 className="w-3 h-3" />저장됨
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="flex items-center gap-1 text-destructive">
        <AlertCircle className="w-3 h-3" />저장 실패
      </span>
    );
  }
  return null;
}

// ─────────────────────────────────────────────
// 단축키 도움말
// ─────────────────────────────────────────────

function SlideHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-base">슬라이드 단축키</DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          슬라이드 에디터에서 쓸 수 있는 단축키.
        </DialogDescription>

        <div className="space-y-4 text-sm">
          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">슬라이드</h3>
            <div className="space-y-1">
              <HelpRow keys={['Ctrl', 'M']} label="새 슬라이드 추가" />
              <HelpRow keys={['↑', 'PageUp']} label="이전 슬라이드" />
              <HelpRow keys={['↓', 'PageDown']} label="다음 슬라이드" />
            </div>
          </section>
          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">요소</h3>
            <div className="space-y-1">
              <HelpRow keys={['더블클릭']} label="빈 캔버스: 텍스트 추가 / 요소: 편집" />
              <HelpRow keys={['드래그']} label="요소 이동" />
              <HelpRow keys={['Delete', 'Backspace']} label="선택한 요소 삭제" />
              <HelpRow keys={['Esc']} label="선택 해제 / 편집 종료" />
            </div>
          </section>
          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">기타</h3>
            <div className="space-y-1">
              <HelpRow keys={['?']} label="이 도움말" />
            </div>
          </section>
        </div>

        <div className="pt-3 text-xs text-muted-foreground border-t border-border">
          도형·이미지·리사이즈·발표 모드·.pptx import/export 는 다음 단계.
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HelpRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={`${k}-${i}`}
            className="text-[10px] border border-border rounded px-1.5 py-0.5 bg-muted/40 font-mono"
          >
            {k}
          </kbd>
        ))}
      </span>
    </div>
  );
}
