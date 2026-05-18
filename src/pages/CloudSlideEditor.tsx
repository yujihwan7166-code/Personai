/** /cloud/slide/:id — 슬라이드 에디터 v1.
 *  7단계-α: 좌측 썸네일 + 16:9 캔버스 + 텍스트박스 무제한 + 드래그 이동.
 *  도형·이미지·전환·발표 모드·.pptx import/export 는 다음 단계.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X, MoreHorizontal, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Keyboard,
  Plus, Trash2, Copy as CopyIcon, Type as TypeIcon, ChevronUp, ChevronDown,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  Square as SquareIcon, Circle as CircleIcon, Triangle as TriangleIcon,
  Minus as LineIcon, ArrowRight as ArrowRightIcon, Shapes,
  Combine, Split,
  ImagePlus, BringToFront, SendToBack, ArrowUpToLine, ArrowDownToLine,
  RotateCw, RotateCcw,
  Play, ChevronLeft, ChevronRight as ChevronRightIcon,
  Sparkles, Undo2, Redo2,
} from 'lucide-react';
import { toast as appToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchNode, updateFileBody } from '@/lib/cloudClient';
import { importPptxFile, exportPptxFile } from '@/lib/cloudSlide/pptx';
import {
  aiNextSlide, aiImproveSlide, aiOutlinePresentation,
  slideToText, slidesToOutline, parseAiSlideContent,
} from '@/lib/cloudSlide/ai';
import { exportElementsToPdf, sanitizeFileName } from '@/lib/cloudCommon/pdfExport';
import { AiSidebar } from '@/components/cloud/AiSidebar';
import { AiSidebarToggle } from '@/components/cloud/AiSidebarToggle';
import { useAiSidebar } from '@/components/cloud/useAiSidebar';
import type { AiContext } from '@/lib/cloudAi/types';
import type { CloudNode } from '@/types/cloud';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ColorPopover } from '@/components/cloud/ColorPopover';

import { SaveStateBadge, type SaveState } from '@/lib/cloudDoc/SaveStateBadge';
import { SlideHelpModal } from '@/lib/cloudSlide/SlideHelpModal';
import { newId } from '@/lib/idGenerator';

const AUTOSAVE_DELAY_MS = 1000;

interface BaseEl {
  id: string;
  xPct: number;  // 0~100, 캔버스 폭 대비
  yPct: number;
  wPct: number;
  hPct: number;
  rotation?: number;  // degrees, 0~359 (시계방향). 0 또는 미정의 = 회전 없음
  groupId?: string;   // 같은 groupId 끼리 묶여서 같이 선택·드래그됨
}

interface SlideTextEl extends BaseEl {
  type: 'text';
  content: string;
  fontSizeRem: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textColor?: string;
  /** 박스 배경색 (콜아웃 박스용). 미지정 = 투명. */
  bgColor?: string;
  /** 텍스트 정렬. 미지정 = 'left'. */
  align?: 'left' | 'center' | 'right' | 'justify';
  /** 줄간격 (배수). 미지정 = 1.25. */
  lineHeight?: number;
}

type ShapeType = 'rect' | 'ellipse' | 'triangle' | 'line' | 'arrow';

interface SlideShapeEl extends BaseEl {
  type: ShapeType;
  fillColor: string;     // CSS color (line/arrow 는 stroke 만 사용)
  strokeColor?: string;  // 테두리 색
  strokeWidth?: number;  // px (캔버스 픽셀 기준)
  /** rect 의 모서리 반경 (px). 미지정 = 0 (직각). 다른 타입은 무시. */
  borderRadius?: number;
  /** 그림자 표시 — rect/ellipse 에만 의미. */
  shadow?: boolean;
}

const SHAPE_SHADOW = '0 4px 12px rgba(0,0,0,0.18)';

interface SlideImageEl extends BaseEl {
  type: 'image';
  src: string;   // data URL (base64) — 추후 IndexedDB blob ref 마이그레이션
  alt?: string;
}

type SlideElement = SlideTextEl | SlideShapeEl | SlideImageEl;

type ResizeDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/**
 * 도형(SlideShapeEl) 렌더 — rect/ellipse 는 div, triangle/line/arrow 는 SVG.
 * 부모는 absolute pos 컨테이너를 제공하고 ShapeRender 는 100%×100% 내부를 채움.
 */
function ShapeRender({ el }: { el: SlideShapeEl }): React.ReactElement {
  const sw = el.strokeWidth ?? 2;
  const stroke = el.strokeColor ?? 'transparent';
  if (el.type === 'rect') {
    return (
      <div style={{
        width: '100%', height: '100%',
        backgroundColor: el.fillColor,
        border: el.strokeColor ? `${sw}px solid ${stroke}` : undefined,
        borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
        boxShadow: el.shadow ? SHAPE_SHADOW : undefined,
      }} />
    );
  }
  if (el.type === 'ellipse') {
    return (
      <div style={{
        width: '100%', height: '100%',
        backgroundColor: el.fillColor,
        border: el.strokeColor ? `${sw}px solid ${stroke}` : undefined,
        borderRadius: '50%',
        boxShadow: el.shadow ? SHAPE_SHADOW : undefined,
      }} />
    );
  }
  // triangle / line / arrow — SVG (viewBox 100×100, preserveAspectRatio none)
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      {el.type === 'triangle' && (
        <polygon
          points="50,0 100,100 0,100"
          fill={el.fillColor}
          stroke={el.strokeColor ?? 'none'}
          strokeWidth={el.strokeColor ? sw : 0}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {el.type === 'line' && (
        <line
          x1="0" y1="50" x2="100" y2="50"
          stroke={el.strokeColor ?? el.fillColor}
          strokeWidth={sw}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
        />
      )}
      {el.type === 'arrow' && (
        <>
          <defs>
            <marker
              id={`ah-${el.id}`}
              viewBox="0 0 10 10"
              refX="9" refY="5"
              markerWidth="5" markerHeight="5"
              orient="auto-start-reverse"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L10,5 L0,10 z" fill={el.strokeColor ?? el.fillColor} />
            </marker>
          </defs>
          <line
            x1="0" y1="50" x2="100" y2="50"
            stroke={el.strokeColor ?? el.fillColor}
            strokeWidth={sw}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            markerEnd={`url(#ah-${el.id})`}
          />
        </>
      )}
    </svg>
  );
}

function isText(el: SlideElement): el is SlideTextEl {
  return el.type === 'text';
}
function isShape(el: SlideElement): el is SlideShapeEl {
  return el.type === 'rect' || el.type === 'ellipse'
    || el.type === 'triangle' || el.type === 'line' || el.type === 'arrow';
}
function isLineLike(el: SlideElement): boolean {
  return el.type === 'line' || el.type === 'arrow';
}
function isImage(el: SlideElement): el is SlideImageEl {
  return el.type === 'image';
}

/** 글자 크기 단계 (rem) — px ≈ rem × 16. */
const FONT_STEPS_REM = [
  0.625, 0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.75,
  2, 2.25, 2.6, 3, 3.5, 4, 5, 6,
];
function nextFontSize(cur: number, dir: 1 | -1): number {
  let idx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < FONT_STEPS_REM.length; i++) {
    const d = Math.abs(FONT_STEPS_REM[i] - cur);
    if (d < bestDist) { bestDist = d; idx = i; }
  }
  const ni = Math.max(0, Math.min(FONT_STEPS_REM.length - 1, idx + dir));
  return FONT_STEPS_REM[ni];
}

/** 도형 테두리/선 굵기 단계 (px) */
const STROKE_STEPS_PX = [1, 2, 3, 4, 6, 8, 12, 16];
function nextStrokeWidth(cur: number, dir: 1 | -1): number {
  let idx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < STROKE_STEPS_PX.length; i++) {
    const d = Math.abs(STROKE_STEPS_PX[i] - cur);
    if (d < bestDist) { bestDist = d; idx = i; }
  }
  const ni = Math.max(0, Math.min(STROKE_STEPS_PX.length - 1, idx + dir));
  return STROKE_STEPS_PX[ni];
}

/** 텍스트 줄간격 단계 (배수) */
const LINE_HEIGHT_STEPS = [1, 1.15, 1.25, 1.5, 1.75, 2];
function nextLineHeight(cur: number): number {
  const idx = LINE_HEIGHT_STEPS.findIndex((v) => Math.abs(v - cur) < 0.01);
  return LINE_HEIGHT_STEPS[(idx + 1) % LINE_HEIGHT_STEPS.length];
}

/** rect 도형 모서리 반경 단계 (px) */
const RADIUS_STEPS_PX = [0, 4, 8, 12, 16, 24, 32, 48];
function nextRadius(cur: number, dir: 1 | -1): number {
  let idx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < RADIUS_STEPS_PX.length; i++) {
    const d = Math.abs(RADIUS_STEPS_PX[i] - cur);
    if (d < bestDist) { bestDist = d; idx = i; }
  }
  const ni = Math.max(0, Math.min(RADIUS_STEPS_PX.length - 1, idx + dir));
  return RADIUS_STEPS_PX[ni];
}

interface Slide {
  id: string;
  elements: SlideElement[];
  background?: string;
  notes?: string;
}

interface SlideMeta {
  slides: Slide[];
  currentIdx?: number;
}

// newId 는 lib/idGenerator 공용 — import 는 파일 상단

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
  // 다중 선택 (Shift+클릭 또는 그룹화된 멤버 자동 포함)
  const [selectedElIds, setSelectedElIds] = useState<Set<string>>(new Set());
  const [editingElId, setEditingElId] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [presentIdx, setPresentIdx] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);

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

  // ─── Undo / Redo (debounce snapshot) ───
  interface SlideSnapshot { slides: Slide[]; currentIdx: number }
  const [history, setHistory] = useState<SlideSnapshot[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const isApplyingHistoryRef = useRef(false);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!node) return;
    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false;
      return;
    }
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    snapshotTimerRef.current = setTimeout(() => {
      setHistory((h) => {
        const snap: SlideSnapshot = { slides, currentIdx };
        if (historyIdx === -1) {
          setHistoryIdx(0);
          return [snap];
        }
        const last = h[historyIdx];
        if (last && last.slides === snap.slides && last.currentIdx === snap.currentIdx) return h;
        const next = h.slice(0, historyIdx + 1);
        next.push(snap);
        if (next.length > 100) next.shift();
        setHistoryIdx(next.length - 1);
        return next;
      });
    }, 500);
    return () => {
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    };
  }, [node, slides, currentIdx, historyIdx]);

  const canUndo = historyIdx > 0;
  const canRedo = historyIdx >= 0 && historyIdx < history.length - 1;

  const applySnapshot = useCallback((snap: SlideSnapshot) => {
    isApplyingHistoryRef.current = true;
    setSlides(snap.slides);
    setCurrentIdx(snap.currentIdx);
    queueSave(snap.slides, snap.currentIdx);
  }, [queueSave]);

  const undo = useCallback(() => {
    if (!canUndo) return;
    const target = history[historyIdx - 1];
    if (!target) return;
    setHistoryIdx(historyIdx - 1);
    applySnapshot(target);
    setSelectedElId(null);
    setEditingElId(null);
  }, [canUndo, history, historyIdx, applySnapshot]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const target = history[historyIdx + 1];
    if (!target) return;
    setHistoryIdx(historyIdx + 1);
    applySnapshot(target);
    setSelectedElId(null);
    setEditingElId(null);
  }, [canRedo, history, historyIdx, applySnapshot]);

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

  const addShapeEl = useCallback((shape: ShapeType) => {
    // line/arrow 는 가로로 길게, 나머지는 사각 형태
    const sz = (shape === 'line' || shape === 'arrow')
      ? { wPct: 40, hPct: 4 }
      : { wPct: 30, hPct: 25 };
    const defaultFill: Record<ShapeType, string> = {
      rect:     'hsl(200 75% 60%)',
      ellipse:  'hsl(25 85% 60%)',
      triangle: 'hsl(150 65% 55%)',
      line:     'transparent',
      arrow:    'transparent',
    };
    const el: SlideShapeEl = {
      id: newId('el'),
      type: shape,
      xPct: 25, yPct: 30,
      wPct: sz.wPct, hPct: sz.hPct,
      fillColor: defaultFill[shape],
      strokeColor: (shape === 'line' || shape === 'arrow') ? '#222222' : undefined,
      strokeWidth: (shape === 'line' || shape === 'arrow') ? 3 : undefined,
    };
    updateCurrentSlide((s) => ({ ...s, elements: [...s.elements, el] }));
    setSelectedElId(el.id);
    setEditingElId(null);
  }, [updateCurrentSlide]);

  const addImageEl = useCallback((src: string) => {
    const el: SlideImageEl = {
      id: newId('el'),
      type: 'image',
      xPct: 20, yPct: 25,
      wPct: 50, hPct: 50,
      src,
    };
    updateCurrentSlide((s) => ({ ...s, elements: [...s.elements, el] }));
    setSelectedElId(el.id);
    setEditingElId(null);
  }, [updateCurrentSlide]);

  const pickAndAddImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        appToast({
          title: '이미지가 큽니다',
          description: '2MB 이하 권장 (localStorage 한계). 다음 단계 IndexedDB 활성화 후 큰 이미지도 처리됩니다.',
        });
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result;
        if (typeof src === 'string') addImageEl(src);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [addImageEl]);

  // ─── z-order ───
  const moveElForward = useCallback((id: string) => {
    updateCurrentSlide((s) => {
      const i = s.elements.findIndex((e) => e.id === id);
      if (i === -1 || i === s.elements.length - 1) return s;
      const next = [...s.elements];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return { ...s, elements: next };
    });
  }, [updateCurrentSlide]);

  const moveElBackward = useCallback((id: string) => {
    updateCurrentSlide((s) => {
      const i = s.elements.findIndex((e) => e.id === id);
      if (i <= 0) return s;
      const next = [...s.elements];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return { ...s, elements: next };
    });
  }, [updateCurrentSlide]);

  const moveElToFront = useCallback((id: string) => {
    updateCurrentSlide((s) => {
      const target = s.elements.find((e) => e.id === id);
      if (!target) return s;
      return { ...s, elements: [...s.elements.filter((e) => e.id !== id), target] };
    });
  }, [updateCurrentSlide]);

  const moveElToBack = useCallback((id: string) => {
    updateCurrentSlide((s) => {
      const target = s.elements.find((e) => e.id === id);
      if (!target) return s;
      return { ...s, elements: [target, ...s.elements.filter((e) => e.id !== id)] };
    });
  }, [updateCurrentSlide]);

  // 부분 patch (유니온 호환 위해 unknown 캐스트 — id 매칭 후 안전)
  const updateEl = useCallback((elId: string, patch: Partial<SlideTextEl> | Partial<SlideShapeEl> | Partial<SlideImageEl>) => {
    updateCurrentSlide((s) => ({
      ...s,
      elements: s.elements.map((el) => (el.id === elId ? ({ ...el, ...patch } as SlideElement) : el)),
    }));
  }, [updateCurrentSlide]);

  const deleteEl = useCallback((elId: string) => {
    // 그룹 멤버 모두 삭제 (다중 선택과 통합 동작)
    const cur = slides[currentIdx];
    const target = cur?.elements.find((e) => e.id === elId);
    const idsToDelete = new Set<string>([elId]);
    if (target?.groupId) {
      for (const e of cur?.elements ?? []) {
        if (e.groupId === target.groupId) idsToDelete.add(e.id);
      }
    }
    // 추가로 다중 선택된 것도 함께 삭제
    for (const sid of selectedElIds) idsToDelete.add(sid);
    updateCurrentSlide((s) => ({
      ...s,
      elements: s.elements.filter((el) => !idsToDelete.has(el.id)),
    }));
    setSelectedElId(null);
    setSelectedElIds(new Set());
    setEditingElId(null);
  }, [updateCurrentSlide, slides, currentIdx, selectedElIds]);

  // 어떤 요소를 클릭했을 때 그룹 멤버까지 묶어서 선택. Shift 면 toggle 추가.
  const selectElement = useCallback((elId: string, multi: boolean = false) => {
    const cur = slides[currentIdx];
    if (!cur) return;
    const target = cur.elements.find((e) => e.id === elId);
    if (!target) return;
    const groupIds = new Set<string>([elId]);
    if (target.groupId) {
      for (const e of cur.elements) {
        if (e.groupId === target.groupId) groupIds.add(e.id);
      }
    }
    setSelectedElIds((prev) => {
      if (!multi) return groupIds;
      const next = new Set(prev);
      // toggle: 이미 안에 있으면 빼고, 없으면 추가
      const alreadyIn = groupIds.size > 0 && [...groupIds].every((id) => next.has(id));
      if (alreadyIn) {
        for (const id of groupIds) next.delete(id);
      } else {
        for (const id of groupIds) next.add(id);
      }
      return next;
    });
    setSelectedElId(elId);
  }, [slides, currentIdx]);

  // ─── 다중 선택 정렬 / 분배 ───
  const alignSelected = useCallback((axis: 'h' | 'v', mode: 'start' | 'center' | 'end') => {
    if (selectedElIds.size < 2) return;
    updateCurrentSlide((s) => {
      const els = s.elements.filter((e) => selectedElIds.has(e.id));
      if (els.length < 2) return s;
      const positions = axis === 'h'
        ? els.map((e) => ({ start: e.xPct, size: e.wPct }))
        : els.map((e) => ({ start: e.yPct, size: e.hPct }));
      const minStart = Math.min(...positions.map((p) => p.start));
      const maxEnd = Math.max(...positions.map((p) => p.start + p.size));
      const center = (minStart + maxEnd) / 2;
      const computeNew = (start: number, size: number): number => {
        if (mode === 'start') return minStart;
        if (mode === 'end') return maxEnd - size;
        return center - size / 2;
      };
      return {
        ...s,
        elements: s.elements.map((e) => {
          if (!selectedElIds.has(e.id)) return e;
          if (axis === 'h') {
            const x = computeNew(e.xPct, e.wPct);
            return { ...e, xPct: Math.max(0, Math.min(100 - e.wPct, x)) };
          } else {
            const y = computeNew(e.yPct, e.hPct);
            return { ...e, yPct: Math.max(0, Math.min(100 - e.hPct, y)) };
          }
        }),
      };
    });
  }, [selectedElIds, updateCurrentSlide]);

  const distributeSelected = useCallback((axis: 'h' | 'v') => {
    if (selectedElIds.size < 3) return;
    updateCurrentSlide((s) => {
      const els = s.elements.filter((e) => selectedElIds.has(e.id));
      if (els.length < 3) return s;
      const getCenter = (e: SlideElement): number =>
        axis === 'h' ? e.xPct + e.wPct / 2 : e.yPct + e.hPct / 2;
      const sorted = [...els].sort((a, b) => getCenter(a) - getCenter(b));
      const firstC = getCenter(sorted[0]);
      const lastC = getCenter(sorted[sorted.length - 1]);
      const step = (lastC - firstC) / (sorted.length - 1);
      const newPos = new Map<string, number>();
      for (let i = 0; i < sorted.length; i++) {
        const targetCenter = firstC + step * i;
        const el = sorted[i];
        const size = axis === 'h' ? el.wPct : el.hPct;
        newPos.set(el.id, targetCenter - size / 2);
      }
      return {
        ...s,
        elements: s.elements.map((e) => {
          const np = newPos.get(e.id);
          if (np === undefined) return e;
          if (axis === 'h') return { ...e, xPct: np };
          return { ...e, yPct: np };
        }),
      };
    });
  }, [selectedElIds, updateCurrentSlide]);

  // ─── 그룹화 / 해제 ───
  const groupSelected = useCallback(() => {
    if (selectedElIds.size < 2) {
      appToast({ title: '2개 이상 선택하세요', description: 'Shift+클릭으로 추가 선택' });
      return;
    }
    const groupId = `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    updateCurrentSlide((s) => ({
      ...s,
      elements: s.elements.map((el) => (selectedElIds.has(el.id) ? ({ ...el, groupId } as SlideElement) : el)),
    }));
    appToast({ title: `${selectedElIds.size}개 그룹화` });
  }, [selectedElIds, updateCurrentSlide]);

  const ungroupSelected = useCallback(() => {
    // 선택된 요소들의 groupId 제거
    const cur = slides[currentIdx];
    if (!cur) return;
    const groupIdsToRemove = new Set<string>();
    for (const id of selectedElIds) {
      const el = cur.elements.find((e) => e.id === id);
      if (el?.groupId) groupIdsToRemove.add(el.groupId);
    }
    if (groupIdsToRemove.size === 0) {
      appToast({ title: '그룹이 없어요' });
      return;
    }
    updateCurrentSlide((s) => ({
      ...s,
      elements: s.elements.map((el) => (
        el.groupId && groupIdsToRemove.has(el.groupId)
          ? ({ ...el, groupId: undefined } as SlideElement)
          : el
      )),
    }));
    appToast({ title: '그룹 해제됨' });
  }, [selectedElIds, slides, currentIdx, updateCurrentSlide]);

  // Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z / Ctrl+G / Ctrl+Shift+G
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); }
      else if (k === 'g' && !e.shiftKey) { e.preventDefault(); groupSelected(); }
      else if (k === 'g' && e.shiftKey) { e.preventDefault(); ungroupSelected(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, groupSelected, ungroupSelected]);

  // ─── 캔버스 빈 곳 더블클릭 = 텍스트박스 추가 ───
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    addTextEl(Math.max(0, Math.min(95, xPct - 5)), Math.max(0, Math.min(90, yPct - 3)));
  }, [addTextEl]);

  // ─── 리사이즈 (8방향) ───
  // 회전: 도형 중심 ↔ 포인터 의 각도로 rotation 계산.
  // Shift = 15도 snap, Esc/우클릭 = 원래값 유지하고 종료.
  const startRotate = useCallback((e: React.PointerEvent, elId: string, el: SlideElement) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedElId(elId);
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    const cx = canvasRect.left + canvasRect.width * (el.xPct + el.wPct / 2) / 100;
    const cy = canvasRect.top + canvasRect.height * (el.yPct + el.hPct / 2) / 100;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    const startRotation = el.rotation ?? 0;

    const onMove = (ev: PointerEvent) => {
      const cur = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
      let rotation = startRotation + (cur - startAngle);
      // -180 ~ 180 정규화 → 0 ~ 360
      rotation = ((rotation % 360) + 360) % 360;
      if (ev.shiftKey) rotation = Math.round(rotation / 15) * 15;
      // 0 도 가까우면 정확히 0
      if (Math.abs(rotation) < 0.5 || Math.abs(rotation - 360) < 0.5) rotation = 0;
      updateEl(elId, { rotation });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [updateEl]);

  const startResize = useCallback((e: React.PointerEvent, elId: string, el: SlideElement, dir: ResizeDir) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedElId(elId);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const sx = el.xPct, sy = el.yPct, sw = el.wPct, sh = el.hPct;

    const onMove = (ev: PointerEvent) => {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - startY) / rect.height) * 100;
      let xPct = sx, yPct = sy, wPct = sw, hPct = sh;

      if (dir.includes('e')) wPct = Math.max(5, sw + dxPct);
      if (dir.includes('w')) {
        wPct = Math.max(5, sw - dxPct);
        xPct = sx + (sw - wPct);
      }
      if (dir.includes('s')) hPct = Math.max(3, sh + dyPct);
      if (dir.includes('n')) {
        hPct = Math.max(3, sh - dyPct);
        yPct = sy + (sh - hPct);
      }

      // 캔버스 경계 클램프
      xPct = Math.max(0, xPct);
      yPct = Math.max(0, yPct);
      wPct = Math.min(100 - xPct, wPct);
      hPct = Math.min(100 - yPct, hPct);

      updateEl(elId, { xPct, yPct, wPct, hPct });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [updateEl]);

  // 정렬 가이드 (드래그 중에만) — kind h(가로선) / v(세로선), pct 0~100
  const [snapGuides, setSnapGuides] = useState<Array<{ kind: 'h' | 'v'; pct: number }>>([]);

  // ─── 드래그 이동 + snap ───
  const SNAP_THRESHOLD_PCT = 1.0; // 1% 이내면 snap
  const startDrag = useCallback((e: React.PointerEvent, elId: string, el: SlideElement) => {
    if (editingElId === elId) return; // 편집 중엔 드래그 X
    e.preventDefault();
    e.stopPropagation();
    // 드래그 시작 시 — selected 가 아니면 단일 선택, 이미 selected (다중 또는 그룹) 면 그대로 유지
    const isAlreadyInSelection = selectedElIds.has(elId);
    if (!isAlreadyInSelection) {
      selectElement(elId);
    }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startX = e.clientX;
    const startY = e.clientY;
    // 함께 이동할 요소들 (다중 선택 / 그룹 멤버) — 자기 자신 포함
    const cur = slides[currentIdx];
    const elList = cur?.elements ?? [];
    const mates: SlideElement[] = (() => {
      // selectedElIds 가 이 elId 를 포함하면 그 set 전체, 아니면 elId + 그룹 멤버
      if (isAlreadyInSelection && selectedElIds.size > 0) {
        return elList.filter((e2) => selectedElIds.has(e2.id));
      }
      if (el.groupId) {
        return elList.filter((e2) => e2.groupId === el.groupId);
      }
      return [el];
    })();
    const startPositions = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const m of mates) {
      startPositions.set(m.id, { x: m.xPct, y: m.yPct, w: m.wPct, h: m.hPct });
    }
    const startElX = el.xPct;
    const startElY = el.yPct;
    // 다른 요소들의 anchor (snap 용) — 함께 움직이는 요소들은 제외
    const movingIds = new Set(mates.map((m) => m.id));
    const others = elList.filter((o) => !movingIds.has(o.id));
    const vLines: number[] = [0, 50, 100]; // 캔버스 가장자리·중앙
    const hLines: number[] = [0, 50, 100];
    for (const o of others) {
      vLines.push(o.xPct, o.xPct + o.wPct / 2, o.xPct + o.wPct);
      hLines.push(o.yPct, o.yPct + o.hPct / 2, o.yPct + o.hPct);
    }

    const onMove = (ev: PointerEvent) => {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - startY) / rect.height) * 100;
      let nx = Math.max(0, Math.min(100 - el.wPct, startElX + dxPct));
      let ny = Math.max(0, Math.min(100 - el.hPct, startElY + dyPct));

      // snap: 6개 anchor (left/centerX/right · top/centerY/bottom) vs vLines/hLines
      const guides: Array<{ kind: 'h' | 'v'; pct: number }> = [];
      // 수직 가이드 (도형의 left/centerX/right)
      const xAnchors: Array<{ offset: number; pct: number }> = [
        { offset: 0, pct: nx },
        { offset: el.wPct / 2, pct: nx + el.wPct / 2 },
        { offset: el.wPct, pct: nx + el.wPct },
      ];
      let bestVDelta = Infinity;
      let bestVLine: number | null = null;
      let bestVAnchorOffset = 0;
      for (const a of xAnchors) {
        for (const line of vLines) {
          const d = a.pct - line;
          if (Math.abs(d) < bestVDelta) {
            bestVDelta = Math.abs(d);
            bestVLine = line;
            bestVAnchorOffset = a.offset;
          }
        }
      }
      if (bestVDelta <= SNAP_THRESHOLD_PCT && bestVLine !== null) {
        nx = bestVLine - bestVAnchorOffset;
        nx = Math.max(0, Math.min(100 - el.wPct, nx));
        guides.push({ kind: 'v', pct: bestVLine });
      }

      // 수평 가이드 (도형의 top/centerY/bottom)
      const yAnchors: Array<{ offset: number; pct: number }> = [
        { offset: 0, pct: ny },
        { offset: el.hPct / 2, pct: ny + el.hPct / 2 },
        { offset: el.hPct, pct: ny + el.hPct },
      ];
      let bestHDelta = Infinity;
      let bestHLine: number | null = null;
      let bestHAnchorOffset = 0;
      for (const a of yAnchors) {
        for (const line of hLines) {
          const d = a.pct - line;
          if (Math.abs(d) < bestHDelta) {
            bestHDelta = Math.abs(d);
            bestHLine = line;
            bestHAnchorOffset = a.offset;
          }
        }
      }
      if (bestHDelta <= SNAP_THRESHOLD_PCT && bestHLine !== null) {
        ny = bestHLine - bestHAnchorOffset;
        ny = Math.max(0, Math.min(100 - el.hPct, ny));
        guides.push({ kind: 'h', pct: bestHLine });
      }

      setSnapGuides(guides);
      // primary 의 실제 변화량 = (nx - startElX, ny - startElY)
      const realDx = nx - startElX;
      const realDy = ny - startElY;
      if (mates.length === 1) {
        updateEl(elId, { xPct: nx, yPct: ny });
      } else {
        // 모든 mates 같은 dx/dy 이동, 캔버스 밖으로 나가지 않게 클램프
        updateCurrentSlide((s) => ({
          ...s,
          elements: s.elements.map((e2) => {
            const sp = startPositions.get(e2.id);
            if (!sp) return e2;
            const nx2 = Math.max(0, Math.min(100 - sp.w, sp.x + realDx));
            const ny2 = Math.max(0, Math.min(100 - sp.h, sp.y + realDy));
            return { ...e2, xPct: nx2, yPct: ny2 } as SlideElement;
          }),
        }));
      }
    };
    const onUp = () => {
      setSnapGuides([]);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [editingElId, updateEl, updateCurrentSlide, slides, currentIdx, selectedElIds, selectElement]);

  // ─── AI 액션 ───
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  /** AI 가 만든 텍스트로 새 슬라이드 추가 (제목 = 큰 폰트, 본문 = 작은 폰트 줄별). */
  const addAiSlide = useCallback((text: string) => {
    const { title, body } = parseAiSlideContent(text);
    const newSlide: Slide = {
      id: newId('s'),
      elements: [],
    };
    if (title) {
      newSlide.elements.push({
        id: newId('el'),
        type: 'text',
        xPct: 8, yPct: 8, wPct: 84, hPct: 14,
        content: title,
        fontSizeRem: 2.6,
        bold: true,
      });
    }
    if (body.length > 0) {
      const joined = body.join('\n');
      newSlide.elements.push({
        id: newId('el'),
        type: 'text',
        xPct: 8, yPct: 28, wPct: 84, hPct: 64,
        content: joined,
        fontSizeRem: 1.4,
      });
    }
    const nextSlides = [...slides.slice(0, currentIdx + 1), newSlide, ...slides.slice(currentIdx + 1)];
    setSlides(nextSlides);
    setCurrentIdx(currentIdx + 1);
    setSelectedElId(null);
    queueSave(nextSlides, currentIdx + 1);
  }, [slides, currentIdx, queueSave]);

  const runAiAndAddSlide = useCallback(async (label: string, fn: () => Promise<string>) => {
    setAiBusy(label);
    try {
      const out = await fn();
      if (out) addAiSlide(out);
      toast({ title: `${label} 완료`, description: '새 슬라이드가 추가됐어요.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: `${label} 실패`, description: msg });
    } finally {
      setAiBusy(null);
    }
  }, [addAiSlide]);

  const aiActionNext = useCallback(() => {
    const current = slides[currentIdx];
    const currentText = current ? slideToText(current) : '';
    const outline = slidesToOutline(slides);
    void runAiAndAddSlide('다음 슬라이드', () => aiNextSlide(currentText || '(빈 슬라이드)', outline));
  }, [slides, currentIdx, runAiAndAddSlide]);

  const aiActionImprove = useCallback(async () => {
    const current = slides[currentIdx];
    if (!current) return;
    const text = slideToText(current);
    if (!text) {
      toast({ title: '슬라이드에 텍스트가 없어요', description: '먼저 텍스트박스를 추가해주세요.' });
      return;
    }
    setAiBusy('슬라이드 개선');
    try {
      const out = await aiImproveSlide(text);
      if (out) {
        // 기존 텍스트박스를 새 내용으로 교체 (첫 텍스트박스만 — 단순화)
        const lines = out.trim().split('\n');
        const newElements = current.elements.filter((e) => e.type !== 'text');
        if (lines[0]) {
          newElements.push({
            id: newId('el'),
            type: 'text',
            xPct: 8, yPct: 8, wPct: 84, hPct: 14,
            content: lines[0],
            fontSizeRem: 2.6, bold: true,
          });
        }
        if (lines.length > 1) {
          newElements.push({
            id: newId('el'),
            type: 'text',
            xPct: 8, yPct: 28, wPct: 84, hPct: 64,
            content: lines.slice(1).join('\n'),
            fontSizeRem: 1.4,
          });
        }
        const nextSlides = slides.map((s, i) => (i === currentIdx ? { ...s, elements: newElements } : s));
        setSlides(nextSlides);
        queueSave(nextSlides, currentIdx);
      }
      toast({ title: '슬라이드 개선 완료', description: '본문이 교체됐어요.' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '슬라이드 개선 실패', description: msg });
    } finally {
      setAiBusy(null);
    }
  }, [slides, currentIdx, queueSave]);

  const aiActionOutline = useCallback(async () => {
    const topic = window.prompt('프레젠테이션 주제를 짧게 입력하세요\n(예: "AI 도입 효과", "신제품 기획안")');
    if (!topic || !topic.trim()) return;
    setAiBusy('5장 개요');
    try {
      const out = await aiOutlinePresentation(topic.trim());
      // [슬라이드 N] 블록으로 분할
      const blocks = out.split(/\n\s*\n+/).map((b) => b.replace(/^\[슬라이드\s*\d+\]\s*\n?/i, '').trim()).filter(Boolean);
      if (blocks.length === 0) {
        toast({ title: '결과를 파싱할 수 없어요', description: '다시 시도해주세요.' });
        return;
      }
      const newSlides: Slide[] = blocks.slice(0, 6).map((block) => {
        const { title, body } = parseAiSlideContent(block);
        const elements: SlideElement[] = [];
        if (title) {
          elements.push({
            id: newId('el'),
            type: 'text',
            xPct: 8, yPct: 8, wPct: 84, hPct: 14,
            content: title,
            fontSizeRem: 2.6, bold: true,
          });
        }
        if (body.length > 0) {
          elements.push({
            id: newId('el'),
            type: 'text',
            xPct: 8, yPct: 28, wPct: 84, hPct: 64,
            content: body.join('\n'),
            fontSizeRem: 1.4,
          });
        }
        return { id: newId('s'), elements };
      });
      const nextSlides = [...slides, ...newSlides];
      setSlides(nextSlides);
      setCurrentIdx(slides.length);
      queueSave(nextSlides, slides.length);
      toast({ title: '5장 개요 완료', description: `${newSlides.length}장 추가됨` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '5장 개요 실패', description: msg });
    } finally {
      setAiBusy(null);
    }
  }, [slides, queueSave]);

  // ─── Import / Export .pptx ───
  const importPptx = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pptx';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const imported = await importPptxFile(file);
        if (!imported.length) {
          toast({ title: '가져올 슬라이드가 없어요', description: '빈 파일입니다.' });
          return;
        }
        // 기존 슬라이드 뒤에 추가
        const nextSlides = [...slides, ...imported];
        setSlides(nextSlides);
        setCurrentIdx(slides.length);  // 첫 새 슬라이드로
        setSelectedElId(null);
        setEditingElId(null);
        queueSave(nextSlides, slides.length);
        toast({
          title: '가져오기 완료',
          description: `${imported.length}장 추가됨. 도형·이미지·애니메이션은 일부 손실 가능.`,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast({ title: '가져오기 실패', description: msg });
      }
    };
    input.click();
  }, [slides, queueSave]);

  const exportPptx = useCallback(() => {
    if (!node) return;
    try {
      const fileName = node.name.replace(/[\\/:*?"<>|]/g, '_');
      exportPptxFile(slides, fileName);
      toast({ title: '내보내기 완료', description: `${fileName}.pptx 다운로드 시작` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '내보내기 실패', description: msg });
    }
  }, [slides, node]);

  // ─── PDF export: 슬라이드별 페이지 ───
  // 화면에 안 보이는 슬라이드도 캡처하려면 모든 슬라이드를 임시 렌더 후 캡처
  const exportPdf = useCallback(async () => {
    if (!node) return;
    setAiBusy('PDF 생성');
    try {
      // 임시 컨테이너에 모든 슬라이드 렌더
      const host = document.createElement('div');
      host.style.position = 'fixed';
      host.style.left = '-99999px';
      host.style.top = '0';
      host.style.width = '1280px';  // 16:9 캔버스 폭
      document.body.appendChild(host);

      const elements: HTMLElement[] = [];
      for (const s of slides) {
        const slideEl = document.createElement('div');
        slideEl.style.width = '1280px';
        slideEl.style.height = '720px';
        slideEl.style.position = 'relative';
        slideEl.style.background = s.background ?? '#ffffff';
        slideEl.style.overflow = 'hidden';
        for (const el of s.elements) {
          const child = document.createElement('div');
          child.style.position = 'absolute';
          child.style.left = `${el.xPct}%`;
          child.style.top = `${el.yPct}%`;
          child.style.width = `${el.wPct}%`;
          child.style.height = `${el.hPct}%`;
          if (el.rotation) {
            child.style.transform = `rotate(${el.rotation}deg)`;
            child.style.transformOrigin = 'center center';
          }
          if (el.type === 'text') {
            child.style.padding = '4px 8px';
            child.style.fontSize = `${el.fontSizeRem * 16}px`;
            child.style.fontWeight = el.bold ? '600' : '400';
            child.style.fontStyle = el.italic ? 'italic' : 'normal';
            if (el.underline) child.style.textDecoration = 'underline';
            child.style.color = el.textColor ?? 'rgba(0,0,0,0.85)';
            if (el.bgColor) child.style.backgroundColor = el.bgColor;
            child.style.lineHeight = String(el.lineHeight ?? 1.25);
            child.style.whiteSpace = 'pre-wrap';
            child.style.textAlign = el.align ?? 'left';
            child.textContent = el.content;
          } else if (el.type === 'image') {
            const img = document.createElement('img');
            img.src = el.src;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            child.appendChild(img);
          } else if (el.type === 'rect') {
            child.style.background = el.fillColor;
            if (el.strokeColor) child.style.border = `${el.strokeWidth ?? 2}px solid ${el.strokeColor}`;
            if (el.borderRadius) child.style.borderRadius = `${el.borderRadius}px`;
            if (el.shadow) child.style.boxShadow = SHAPE_SHADOW;
          } else if (el.type === 'ellipse') {
            child.style.background = el.fillColor;
            if (el.strokeColor) child.style.border = `${el.strokeWidth ?? 2}px solid ${el.strokeColor}`;
            child.style.borderRadius = '50%';
            if (el.shadow) child.style.boxShadow = SHAPE_SHADOW;
          } else {
            // triangle / line / arrow — SVG
            const sw = el.strokeWidth ?? 2;
            const stroke = el.strokeColor ?? el.fillColor;
            if (el.type === 'triangle') {
              child.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="50,0 100,100 0,100" fill="${el.fillColor}" stroke="${el.strokeColor ?? 'none'}" stroke-width="${el.strokeColor ? sw : 0}" vector-effect="non-scaling-stroke" /></svg>`;
            } else if (el.type === 'line') {
              child.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1="50" x2="100" y2="50" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" vector-effect="non-scaling-stroke" /></svg>`;
            } else if (el.type === 'arrow') {
              const ahId = `ah-${el.id}-pdf`;
              child.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="overflow:visible"><defs><marker id="${ahId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0,0 L10,5 L0,10 z" fill="${stroke}" /></marker></defs><line x1="0" y1="50" x2="100" y2="50" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" vector-effect="non-scaling-stroke" marker-end="url(#${ahId})" /></svg>`;
            }
          }
          slideEl.appendChild(child);
        }
        host.appendChild(slideEl);
        elements.push(slideEl);
      }

      const name = sanitizeFileName(node.name);
      await exportElementsToPdf(elements, { fileName: name, orientation: 'l' });
      toast({ title: 'PDF 다운로드 시작', description: `${name}.pdf (${slides.length}장)` });

      document.body.removeChild(host);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'PDF 내보내기 실패', description: msg });
    } finally {
      setAiBusy(null);
    }
  }, [node, slides]);

  // ─── 발표 모드 ───
  const startPresent = useCallback(() => {
    setPresentIdx(currentIdx);
    setPresenting(true);
    setSelectedElId(null);
    setEditingElId(null);
  }, [currentIdx]);

  const stopPresent = useCallback(() => {
    setCurrentIdx(presentIdx);  // 마지막으로 본 슬라이드로 에디터 복귀
    setPresenting(false);
  }, [presentIdx]);

  // ─── 키보드 ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 발표 모드에선 다른 단축키
      if (presenting) {
        if (e.key === 'Escape') {
          e.preventDefault();
          stopPresent();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          setPresentIdx((i) => Math.min(slides.length - 1, i + 1));
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Backspace') {
          e.preventDefault();
          setPresentIdx((i) => Math.max(0, i - 1));
        } else if (e.key === 'Home') {
          e.preventDefault();
          setPresentIdx(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          setPresentIdx(slides.length - 1);
        }
        return;
      }

      // F5 = 발표 시작 (편집 모드 X 일 때)
      if (e.key === 'F5' && !editingElId) {
        e.preventDefault();
        startPresent();
        return;
      }

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
  }, [editingElId, selectedElId, deleteEl, addSlide, slides.length, presenting, startPresent, stopPresent]);

  const close = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    void flushSave();
    navigate('/cloud');
  }, [flushSave, navigate]);

  // ─── AI 사이드바 (early return 전에 hook 호출 필수) ───
  const getAiContext = useCallback((): AiContext => {
    const cur = slides[currentIdx] ?? slides[0];
    if (!cur) return { kind: 'slide', summary: '빈 발표', fullText: '' };
    const curIdx = currentIdx + 1;
    const total = slides.length;
    const curText = slideToText(cur);
    const outline = slidesToOutline(slides);
    const fullText =
      `# 현재 슬라이드 (${curIdx} / ${total})\n${curText || '(빈 슬라이드)'}\n\n` +
      `# 전체 outline\n${outline}`;
    return {
      kind: 'slide',
      summary: `슬라이드 ${curIdx} / ${total}`,
      fullText,
    };
  }, [slides, currentIdx]);
  const ai = useAiSidebar('slide', getAiContext, { persistKey: node?.id });

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
              onClick={startPresent}
              className="px-3 py-1.5 rounded text-sm hover:bg-muted flex items-center gap-1.5"
              title="발표 모드 (F5)"
            >
              <Play className="w-4 h-4" />
              발표
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className="p-2 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="되돌리기"
              title="되돌리기 (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className="p-2 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="다시 실행"
              title="다시 실행 (Ctrl+Y / Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="p-2 rounded hover:bg-muted"
              aria-label="단축키 도움말"
              title="단축키 도움말 (?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>
            <AiSidebarToggle open={ai.open} onClick={ai.toggle} />
            <button
              type="button"
              onClick={() => setNotesOpen((v) => !v)}
              className={cn(
                'p-2 rounded hover:bg-muted text-sm flex items-center gap-1',
                notesOpen && 'bg-muted',
              )}
              aria-pressed={notesOpen}
              title="발표자 노트 표시/숨김"
              aria-label="발표자 노트"
            >
              <span className="text-base leading-none" aria-hidden>📝</span>
              <span className="text-xs hidden sm:inline">노트</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded hover:bg-muted"
                  aria-label="더보기"
                  title="더보기"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
                <DropdownMenuItem onSelect={aiActionNext} disabled={!!aiBusy}>
                  <Sparkles className="w-4 h-4 mr-2 text-violet-500" />
                  다음 슬라이드 (AI)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={aiActionImprove} disabled={!!aiBusy}>
                  <Sparkles className="w-4 h-4 mr-2 text-violet-500" />
                  이 슬라이드 개선 (AI)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={aiActionOutline} disabled={!!aiBusy}>
                  <Sparkles className="w-4 h-4 mr-2 text-violet-500" />
                  주제로 5장 개요 (AI)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={importPptx}>
                  📥 .pptx 가져오기
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={exportPptx}>
                  📤 .pptx 내보내기
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { void exportPdf(); }} disabled={!!aiBusy}>
                  📤 PDF 내보내기 ({slides.length}장)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 도구바 — flex-wrap 로 좁은 화면에서 줄바꿈 */}
        <div className="border-t border-border bg-background flex flex-wrap items-center gap-x-1 gap-y-1 px-3 py-1.5">
          <ToolBtn onClick={addSlide} title="새 슬라이드 (Ctrl+M)">
            <Plus className="w-4 h-4" /><span className="text-xs ml-1">슬라이드</span>
          </ToolBtn>
          <Sep />
          <ToolBtn onClick={() => addTextEl()} title="텍스트 추가">
            <TypeIcon className="w-4 h-4" /><span className="text-xs ml-1">텍스트</span>
          </ToolBtn>
          <ToolBtn onClick={() => addShapeEl('rect')} title="사각형 추가">
            <SquareIcon className="w-4 h-4" /><span className="text-xs ml-1">사각형</span>
          </ToolBtn>
          <ToolBtn onClick={() => addShapeEl('ellipse')} title="원 추가">
            <CircleIcon className="w-4 h-4" /><span className="text-xs ml-1">원</span>
          </ToolBtn>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="px-2 py-1 rounded hover:bg-muted text-sm flex items-center gap-1"
                title="더 많은 도형"
              >
                <Shapes className="w-4 h-4" />
                <span className="text-xs">+</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[140px]">
              <DropdownMenuItem onSelect={() => addShapeEl('triangle')}>
                <TriangleIcon className="w-4 h-4 mr-2" /> 삼각형
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addShapeEl('line')}>
                <LineIcon className="w-4 h-4 mr-2" /> 선
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => addShapeEl('arrow')}>
                <ArrowRightIcon className="w-4 h-4 mr-2" /> 화살표
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ToolBtn onClick={pickAndAddImage} title="이미지 추가 (파일 선택)">
            <ImagePlus className="w-4 h-4" /><span className="text-xs ml-1">이미지</span>
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

          {/* 슬라이드 배경색 — 요소 선택과 무관 */}
          <Sep />
          <ColorPopover
            label="배경"
            value={currentSlide.background ?? '#ffffff'}
            onChange={(v) => updateCurrentSlide((s) => ({ ...s, background: v }))}
          />

          {/* 선택된 요소별 인스펙터 — 단일 선택: 도형이면 색 picker, 텍스트면 글자색 */}
          {selectedElId && selectedElIds.size <= 1 && (() => {
            const el = currentSlide.elements.find((x) => x.id === selectedElId);
            if (!el) return null;
            if (isShape(el)) {
              const lineLike = isLineLike(el);
              const showStroke = !!el.strokeColor || lineLike;
              return (
                <>
                  <Sep />
                  {!lineLike && (
                    <ColorPopover
                      label="채우기"
                      value={el.fillColor}
                      onChange={(v) => updateEl(el.id, { fillColor: v })}
                      allowTransparent
                    />
                  )}
                  <ColorPopover
                    label={lineLike ? '색' : '테두리'}
                    value={el.strokeColor ?? el.fillColor}
                    onChange={(v) => updateEl(el.id, {
                      strokeColor: v,
                      strokeWidth: el.strokeWidth ?? (lineLike ? 3 : 2),
                      ...(lineLike ? { fillColor: v } : {}),
                    })}
                  />
                  {showStroke && (
                    <>
                      <ToolBtn
                        onClick={() => updateEl(el.id, {
                          strokeWidth: nextStrokeWidth(el.strokeWidth ?? (lineLike ? 3 : 2), -1),
                        })}
                        title={lineLike ? '선 얇게' : '테두리 얇게'}
                      >
                        <span className="text-xs">−</span>
                      </ToolBtn>
                      <span
                        className="text-xs text-muted-foreground tabular-nums px-1 min-w-[28px] text-center"
                        title={lineLike ? '선 굵기 (px)' : '테두리 두께 (px)'}
                      >
                        {el.strokeWidth ?? (lineLike ? 3 : 2)}px
                      </span>
                      <ToolBtn
                        onClick={() => updateEl(el.id, {
                          strokeWidth: nextStrokeWidth(el.strokeWidth ?? (lineLike ? 3 : 2), 1),
                        })}
                        title={lineLike ? '선 굵게' : '테두리 굵게'}
                      >
                        <span className="text-xs font-bold">+</span>
                      </ToolBtn>
                    </>
                  )}
                  {el.strokeColor && !lineLike && (
                    <ToolBtn
                      onClick={() => updateEl(el.id, { strokeColor: undefined, strokeWidth: undefined })}
                      title="테두리 제거"
                    >
                      <span className="text-xs">테두리 끄기</span>
                    </ToolBtn>
                  )}
                  {el.type === 'rect' && (
                    <>
                      <ToolBtn
                        onClick={() => updateEl(el.id, {
                          borderRadius: nextRadius(el.borderRadius ?? 0, -1) || undefined,
                        })}
                        title="모서리 직각으로"
                      >
                        <span className="text-xs">⬜</span>
                      </ToolBtn>
                      <span
                        className="text-xs text-muted-foreground tabular-nums px-1 min-w-[30px] text-center"
                        title="모서리 반경 (px)"
                      >
                        {el.borderRadius ?? 0}r
                      </span>
                      <ToolBtn
                        onClick={() => updateEl(el.id, {
                          borderRadius: nextRadius(el.borderRadius ?? 0, 1),
                        })}
                        title="모서리 둥글게"
                      >
                        <span className="text-xs">▢</span>
                      </ToolBtn>
                    </>
                  )}
                  {(el.type === 'rect' || el.type === 'ellipse') && (
                    <ToolBtn
                      onClick={() => updateEl(el.id, { shadow: !el.shadow })}
                      title={el.shadow ? '그림자 끄기' : '그림자 켜기'}
                      active={!!el.shadow}
                    >
                      <span className="text-xs">▦</span>
                    </ToolBtn>
                  )}
                </>
              );
            }
            if (isText(el)) {
              const curAlign = el.align ?? 'left';
              return (
                <>
                  <Sep />
                  <ColorPopover
                    label="글자색"
                    value={el.textColor ?? '#222222'}
                    onChange={(v) => updateEl(el.id, { textColor: v })}
                  />
                  <ColorPopover
                    label="박스 배경"
                    value={el.bgColor ?? 'transparent'}
                    onChange={(v) => updateEl(el.id, { bgColor: v === 'transparent' ? undefined : v })}
                    allowTransparent
                  />
                  <ToolBtn
                    onClick={() => updateEl(el.id, { bold: !el.bold })}
                    title="굵게"
                    active={!!el.bold}
                  >
                    <span className="text-sm font-bold">B</span>
                  </ToolBtn>
                  <ToolBtn
                    onClick={() => updateEl(el.id, { italic: !el.italic })}
                    title="기울임"
                    active={!!el.italic}
                  >
                    <span className="text-sm italic font-serif">I</span>
                  </ToolBtn>
                  <ToolBtn
                    onClick={() => updateEl(el.id, { underline: !el.underline })}
                    title="밑줄"
                    active={!!el.underline}
                  >
                    <span className="text-sm underline underline-offset-2">U</span>
                  </ToolBtn>
                  <ToolBtn
                    onClick={() => updateEl(el.id, { fontSizeRem: nextFontSize(el.fontSizeRem, -1) })}
                    title="글자 작게"
                  >
                    <span className="text-xs">A−</span>
                  </ToolBtn>
                  <span
                    className="text-xs text-muted-foreground tabular-nums px-1 min-w-[28px] text-center"
                    title="현재 글자 크기 (px)"
                  >
                    {Math.round(el.fontSizeRem * 16)}
                  </span>
                  <ToolBtn
                    onClick={() => updateEl(el.id, { fontSizeRem: nextFontSize(el.fontSizeRem, 1) })}
                    title="글자 크게"
                  >
                    <span className="text-sm font-medium">A+</span>
                  </ToolBtn>
                  <ToolBtn
                    onClick={() => updateEl(el.id, { align: 'left' })}
                    title="왼쪽 정렬"
                    active={curAlign === 'left'}
                  >
                    <AlignLeft className="w-4 h-4" />
                  </ToolBtn>
                  <ToolBtn
                    onClick={() => updateEl(el.id, { align: 'center' })}
                    title="가운데 정렬"
                    active={curAlign === 'center'}
                  >
                    <AlignCenter className="w-4 h-4" />
                  </ToolBtn>
                  <ToolBtn
                    onClick={() => updateEl(el.id, { align: 'right' })}
                    title="오른쪽 정렬"
                    active={curAlign === 'right'}
                  >
                    <AlignRight className="w-4 h-4" />
                  </ToolBtn>
                  <ToolBtn
                    onClick={() => updateEl(el.id, { align: 'justify' })}
                    title="양쪽 맞춤"
                    active={curAlign === 'justify'}
                  >
                    <AlignJustify className="w-4 h-4" />
                  </ToolBtn>
                  <ToolBtn
                    onClick={() => updateEl(el.id, { lineHeight: nextLineHeight(el.lineHeight ?? 1.25) })}
                    title="줄간격 (클릭으로 순환)"
                  >
                    <span className="text-xs tabular-nums">⇕ {(el.lineHeight ?? 1.25).toFixed(2).replace(/\.?0+$/, '')}</span>
                  </ToolBtn>
                </>
              );
            }
            return null;
          })()}

          {/* 다중 선택 색상 일괄 적용 — 도형/텍스트 분리해 각각에 적용 */}
          {selectedElIds.size >= 2 && (() => {
            const els = currentSlide.elements.filter((e) => selectedElIds.has(e.id));
            const shapes = els.filter(isShape);
            const texts = els.filter(isText);
            const applyToShapes = (patch: Partial<SlideShapeEl>) => {
              updateCurrentSlide((s) => ({
                ...s,
                elements: s.elements.map((el) =>
                  selectedElIds.has(el.id) && isShape(el)
                    ? ({ ...el, ...patch } as SlideElement)
                    : el,
                ),
              }));
            };
            const applyToTexts = (patch: Partial<SlideTextEl>) => {
              updateCurrentSlide((s) => ({
                ...s,
                elements: s.elements.map((el) =>
                  selectedElIds.has(el.id) && isText(el)
                    ? ({ ...el, ...patch } as SlideElement)
                    : el,
                ),
              }));
            };
            const firstFill = shapes[0]?.fillColor ?? '#3b82f6';
            const allSameFill = shapes.length > 0 && shapes.every((s) => s.fillColor === firstFill);
            const firstStroke = shapes[0]?.strokeColor;
            const allSameStroke = shapes.length > 0 && shapes.every((s) => s.strokeColor === firstStroke);
            const firstText = texts[0]?.textColor ?? '#222222';
            const allSameText = texts.length > 0 && texts.every((t) => (t.textColor ?? '#222222') === firstText);
            if (shapes.length === 0 && texts.length === 0) return null;
            return (
              <>
                <Sep />
                {shapes.length > 0 && (
                  <>
                    <ColorPopover
                      label={`채우기 ×${shapes.length}`}
                      value={allSameFill ? firstFill : '#3b82f6'}
                      onChange={(v) => applyToShapes({ fillColor: v })}
                      allowTransparent
                    />
                    <ColorPopover
                      label={`테두리 ×${shapes.length}`}
                      value={allSameStroke ? (firstStroke ?? '#000000') : '#000000'}
                      onChange={(v) => applyToShapes({ strokeColor: v, strokeWidth: 2 })}
                    />
                    {(() => {
                      const firstSw = shapes[0]?.strokeWidth ?? 2;
                      const allSameSw = shapes.every((s) => (s.strokeWidth ?? 2) === firstSw);
                      return (
                        <>
                          <ToolBtn
                            onClick={() => applyToShapes({ strokeWidth: nextStrokeWidth(firstSw, -1) })}
                            title="테두리/선 얇게"
                          >
                            <span className="text-xs">−</span>
                          </ToolBtn>
                          <span
                            className="text-xs text-muted-foreground tabular-nums px-1 min-w-[28px] text-center"
                            title={allSameSw ? '두께 (px)' : '여러 두께 — 다음 단계로 통일'}
                          >
                            {allSameSw ? `${firstSw}px` : '—'}
                          </span>
                          <ToolBtn
                            onClick={() => applyToShapes({ strokeWidth: nextStrokeWidth(firstSw, 1) })}
                            title="테두리/선 굵게"
                          >
                            <span className="text-xs font-bold">+</span>
                          </ToolBtn>
                        </>
                      );
                    })()}
                    {(() => {
                      const rects = shapes.filter((s) => s.type === 'rect');
                      if (rects.length === 0) return null;
                      const firstR = rects[0].borderRadius ?? 0;
                      const allSameR = rects.every((r) => (r.borderRadius ?? 0) === firstR);
                      const applyToRects = (br: number | undefined) => {
                        updateCurrentSlide((s) => ({
                          ...s,
                          elements: s.elements.map((e) =>
                            selectedElIds.has(e.id) && isShape(e) && e.type === 'rect'
                              ? ({ ...e, borderRadius: br } as SlideElement)
                              : e,
                          ),
                        }));
                      };
                      return (
                        <>
                          <ToolBtn
                            onClick={() => applyToRects(nextRadius(firstR, -1) || undefined)}
                            title={`rect ×${rects.length} 모서리 직각으로`}
                          >
                            <span className="text-xs">⬜</span>
                          </ToolBtn>
                          <span
                            className="text-xs text-muted-foreground tabular-nums px-1 min-w-[30px] text-center"
                            title={allSameR ? `rect 모서리 반경 (px)` : '여러 반경 — 다음 단계로 통일'}
                          >
                            {allSameR ? `${firstR}r` : '—'}
                          </span>
                          <ToolBtn
                            onClick={() => applyToRects(nextRadius(firstR, 1))}
                            title={`rect ×${rects.length} 모서리 둥글게`}
                          >
                            <span className="text-xs">▢</span>
                          </ToolBtn>
                        </>
                      );
                    })()}
                  </>
                )}
                {texts.length > 0 && (
                  <>
                    <ColorPopover
                      label={`글자색 ×${texts.length}`}
                      value={allSameText ? firstText : '#222222'}
                      onChange={(v) => applyToTexts({ textColor: v })}
                    />
                    {(() => {
                      const firstBg = texts[0]?.bgColor;
                      const allSameBg = texts.every((t) => t.bgColor === firstBg);
                      return (
                        <ColorPopover
                          label={`박스 배경 ×${texts.length}`}
                          value={allSameBg && firstBg ? firstBg : 'transparent'}
                          onChange={(v) => applyToTexts({ bgColor: v === 'transparent' ? undefined : v })}
                          allowTransparent
                        />
                      );
                    })()}
                    {(() => {
                      const allBold = texts.every((t) => t.bold);
                      const allItalic = texts.every((t) => t.italic);
                      const allUnderline = texts.every((t) => t.underline);
                      return (
                        <>
                          <ToolBtn
                            onClick={() => applyToTexts({ bold: !allBold })}
                            title={allBold ? '굵게 해제' : '모두 굵게'}
                            active={allBold}
                          >
                            <span className="text-sm font-bold">B</span>
                          </ToolBtn>
                          <ToolBtn
                            onClick={() => applyToTexts({ italic: !allItalic })}
                            title={allItalic ? '기울임 해제' : '모두 기울임'}
                            active={allItalic}
                          >
                            <span className="text-sm italic font-serif">I</span>
                          </ToolBtn>
                          <ToolBtn
                            onClick={() => applyToTexts({ underline: !allUnderline })}
                            title={allUnderline ? '밑줄 해제' : '모두 밑줄'}
                            active={allUnderline}
                          >
                            <span className="text-sm underline underline-offset-2">U</span>
                          </ToolBtn>
                        </>
                      );
                    })()}
                    {(() => {
                      const firstSize = texts[0]?.fontSizeRem ?? 1.5;
                      const allSameSize = texts.every((t) => t.fontSizeRem === firstSize);
                      const firstAlign = texts[0]?.align ?? 'left';
                      const allSameAlign = texts.every((t) => (t.align ?? 'left') === firstAlign);
                      return (
                        <>
                          <ToolBtn
                            onClick={() => applyToTexts({ fontSizeRem: nextFontSize(firstSize, -1) })}
                            title="글자 작게"
                          >
                            <span className="text-xs">A−</span>
                          </ToolBtn>
                          <span
                            className="text-xs text-muted-foreground tabular-nums px-1 min-w-[28px] text-center"
                            title={allSameSize ? `현재 글자 크기 (px)` : '여러 크기 — 다음 단계로 통일'}
                          >
                            {allSameSize ? Math.round(firstSize * 16) : '—'}
                          </span>
                          <ToolBtn
                            onClick={() => applyToTexts({ fontSizeRem: nextFontSize(firstSize, 1) })}
                            title="글자 크게"
                          >
                            <span className="text-sm font-medium">A+</span>
                          </ToolBtn>
                          <ToolBtn
                            onClick={() => applyToTexts({ align: 'left' })}
                            title="모두 왼쪽 정렬"
                            active={allSameAlign && firstAlign === 'left'}
                          >
                            <AlignLeft className="w-4 h-4" />
                          </ToolBtn>
                          <ToolBtn
                            onClick={() => applyToTexts({ align: 'center' })}
                            title="모두 가운데 정렬"
                            active={allSameAlign && firstAlign === 'center'}
                          >
                            <AlignCenter className="w-4 h-4" />
                          </ToolBtn>
                          <ToolBtn
                            onClick={() => applyToTexts({ align: 'right' })}
                            title="모두 오른쪽 정렬"
                            active={allSameAlign && firstAlign === 'right'}
                          >
                            <AlignRight className="w-4 h-4" />
                          </ToolBtn>
                          <ToolBtn
                            onClick={() => applyToTexts({ align: 'justify' })}
                            title="모두 양쪽 맞춤"
                            active={allSameAlign && firstAlign === 'justify'}
                          >
                            <AlignJustify className="w-4 h-4" />
                          </ToolBtn>
                          {(() => {
                            const firstLh = texts[0]?.lineHeight ?? 1.25;
                            const allSameLh = texts.every((t) => (t.lineHeight ?? 1.25) === firstLh);
                            return (
                              <ToolBtn
                                onClick={() => applyToTexts({ lineHeight: nextLineHeight(firstLh) })}
                                title="줄간격 (다음 단계로 통일)"
                              >
                                <span className="text-xs tabular-nums">
                                  ⇕ {allSameLh ? firstLh.toFixed(2).replace(/\.?0+$/, '') : '—'}
                                </span>
                              </ToolBtn>
                            );
                          })()}
                        </>
                      );
                    })()}
                  </>
                )}
              </>
            );
          })()}

          {/* 선택된 요소가 있을 때 z-order 액션 */}
          {selectedElId && (
            <>
              <Sep />
              <ToolBtn onClick={() => moveElForward(selectedElId)} title="앞으로 (한 칸)">
                <ChevronUp className="w-4 h-4" />
              </ToolBtn>
              <ToolBtn onClick={() => moveElBackward(selectedElId)} title="뒤로 (한 칸)">
                <ChevronDown className="w-4 h-4" />
              </ToolBtn>
              <ToolBtn onClick={() => moveElToFront(selectedElId)} title="맨 앞으로">
                <ArrowUpToLine className="w-4 h-4" />
              </ToolBtn>
              <ToolBtn onClick={() => moveElToBack(selectedElId)} title="맨 뒤로">
                <ArrowDownToLine className="w-4 h-4" />
              </ToolBtn>
            </>
          )}

          {/* 선택 요소 회전 — ±15° + 0° 복귀 */}
          {selectedElId && (() => {
            const el = currentSlide.elements.find((x) => x.id === selectedElId);
            if (!el) return null;
            const rot = (((el.rotation ?? 0) % 360) + 360) % 360;
            return (
              <>
                <Sep />
                <ToolBtn
                  onClick={() => updateEl(el.id, { rotation: ((rot - 15 + 360) % 360) || undefined })}
                  title="−15° 회전"
                >
                  <RotateCcw className="w-4 h-4" />
                </ToolBtn>
                <span
                  className="text-xs text-muted-foreground tabular-nums px-1 min-w-[36px] text-center"
                  title="회전 각도 (°)"
                >
                  {Math.round(rot)}°
                </span>
                <ToolBtn
                  onClick={() => updateEl(el.id, { rotation: ((rot + 15) % 360) || undefined })}
                  title="+15° 회전"
                >
                  <RotateCw className="w-4 h-4" />
                </ToolBtn>
                {rot !== 0 && (
                  <ToolBtn
                    onClick={() => updateEl(el.id, { rotation: undefined })}
                    title="회전 0° 복귀"
                  >
                    <span className="text-xs">0°</span>
                  </ToolBtn>
                )}
              </>
            );
          })()}

          {/* 다중 선택 시 정렬/분배 — 가로/세로 + 균등 */}
          {selectedElIds.size >= 2 && (
            <>
              <Sep />
              <ToolBtn onClick={() => alignSelected('h', 'start')} title="왼쪽 정렬">
                <AlignStartVertical className="w-4 h-4" />
              </ToolBtn>
              <ToolBtn onClick={() => alignSelected('h', 'center')} title="가로 중앙">
                <AlignCenterVertical className="w-4 h-4" />
              </ToolBtn>
              <ToolBtn onClick={() => alignSelected('h', 'end')} title="오른쪽 정렬">
                <AlignEndVertical className="w-4 h-4" />
              </ToolBtn>
              <ToolBtn onClick={() => alignSelected('v', 'start')} title="위쪽 정렬">
                <AlignStartHorizontal className="w-4 h-4" />
              </ToolBtn>
              <ToolBtn onClick={() => alignSelected('v', 'center')} title="세로 중앙">
                <AlignCenterHorizontal className="w-4 h-4" />
              </ToolBtn>
              <ToolBtn onClick={() => alignSelected('v', 'end')} title="아래쪽 정렬">
                <AlignEndHorizontal className="w-4 h-4" />
              </ToolBtn>
              {selectedElIds.size >= 3 && (
                <>
                  <ToolBtn onClick={() => distributeSelected('h')} title="가로 균등 분배 (3개 이상)">
                    <AlignHorizontalDistributeCenter className="w-4 h-4" />
                  </ToolBtn>
                  <ToolBtn onClick={() => distributeSelected('v')} title="세로 균등 분배 (3개 이상)">
                    <AlignVerticalDistributeCenter className="w-4 h-4" />
                  </ToolBtn>
                </>
              )}
            </>
          )}

          {/* 다중 선택 시 그룹화 / 해제 */}
          {selectedElIds.size >= 2 && (
            <>
              <Sep />
              <ToolBtn onClick={groupSelected} title={`${selectedElIds.size}개 그룹화 (Ctrl+G)`}>
                <Combine className="w-4 h-4" />
                <span className="text-xs ml-1">그룹</span>
              </ToolBtn>
            </>
          )}
          {selectedElIds.size >= 1 && currentSlide.elements.some((e) => selectedElIds.has(e.id) && e.groupId) && (
            <>
              <Sep />
              <ToolBtn onClick={ungroupSelected} title="그룹 해제 (Ctrl+Shift+G)">
                <Split className="w-4 h-4" />
                <span className="text-xs ml-1">해제</span>
              </ToolBtn>
            </>
          )}

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
              onClick={() => { setSelectedElId(null); setSelectedElIds(new Set()); setEditingElId(null); }}
              onDoubleClick={handleCanvasDoubleClick}
            >
              {currentSlide.elements.map((el) => {
                if (isShape(el)) {
                  return (
                    <ShapeElView
                      key={el.id}
                      el={el}
                      selected={selectedElIds.has(el.id) || selectedElId === el.id}
                      onPointerDown={(e) => startDrag(e, el.id, el)}
                      onClick={(e) => { e.stopPropagation(); selectElement(el.id, e.shiftKey || e.ctrlKey || e.metaKey); }}
                      onStartResize={(e, dir) => startResize(e, el.id, el, dir)}
                      onStartRotate={(e) => startRotate(e, el.id, el)}
                    />
                  );
                }
                if (isImage(el)) {
                  return (
                    <ImageElView
                      key={el.id}
                      el={el}
                      selected={selectedElIds.has(el.id) || selectedElId === el.id}
                      onPointerDown={(e) => startDrag(e, el.id, el)}
                      onClick={(e) => { e.stopPropagation(); selectElement(el.id, e.shiftKey || e.ctrlKey || e.metaKey); }}
                      onStartResize={(e, dir) => startResize(e, el.id, el, dir)}
                      onStartRotate={(e) => startRotate(e, el.id, el)}
                    />
                  );
                }
                return (
                  <TextElView
                    key={el.id}
                    el={el}
                    selected={selectedElIds.has(el.id) || selectedElId === el.id}
                    editing={editingElId === el.id}
                    onPointerDown={(e) => startDrag(e, el.id, el)}
                    onClick={(e) => { e.stopPropagation(); selectElement(el.id, e.shiftKey || e.ctrlKey || e.metaKey); }}
                    onDoubleClick={(e) => { e.stopPropagation(); selectElement(el.id); setEditingElId(el.id); }}
                    onStartRotate={(e) => startRotate(e, el.id, el)}
                    onChange={(content) => updateEl(el.id, { content })}
                    onFinishEdit={() => setEditingElId(null)}
                    onStartResize={(e, dir) => startResize(e, el.id, el, dir)}
                  />
                );
              })}
              {/* 정렬 가이드 라인 (드래그 중에만) */}
              {snapGuides.map((g, i) =>
                g.kind === 'v' ? (
                  <div
                    key={`g-${i}`}
                    className="absolute top-0 bottom-0 pointer-events-none z-50"
                    style={{ left: `${g.pct}%`, width: 0, borderLeft: '1px dashed rgb(239 68 68)' }}
                    aria-hidden
                  />
                ) : (
                  <div
                    key={`g-${i}`}
                    className="absolute left-0 right-0 pointer-events-none z-50"
                    style={{ top: `${g.pct}%`, height: 0, borderTop: '1px dashed rgb(239 68 68)' }}
                    aria-hidden
                  />
                ),
              )}
              {currentSlide.elements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm pointer-events-none">
                  더블클릭으로 텍스트 추가 또는 도구바 [텍스트] 버튼
                </div>
              )}
            </div>

            {/* 발표자 노트 패널 (토글) */}
            {notesOpen && (
              <div className="mt-3 mx-auto w-full max-w-[1280px]">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    📝 발표자 노트 (슬라이드 {currentIdx + 1})
                  </span>
                  <button
                    type="button"
                    onClick={() => setNotesOpen(false)}
                    className="text-xs text-muted-foreground hover:text-foreground p-0.5"
                  >
                    닫기
                  </button>
                </div>
                <textarea
                  value={slides[currentIdx]?.notes ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateCurrentSlide((s) => ({ ...s, notes: v }));
                  }}
                  placeholder="이 슬라이드를 발표할 때 말할 내용을 적어두세요. .pptx 로 내보낼 때 함께 보존됩니다."
                  className="w-full min-h-[120px] max-h-[200px] resize-y rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/30"
                />
              </div>
            )}
          </div>
        </main>
        <AiSidebar
          open={ai.open}
          onClose={() => ai.setOpen(false)}
          context={getAiContext()}
          messages={ai.messages}
          sending={ai.sending}
          onSend={ai.send}
          onClear={ai.clear}
        />
      </div>

      <SlideHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      {presenting && (
        <PresentationOverlay
          slides={slides}
          idx={presentIdx}
          onPrev={() => setPresentIdx((i) => Math.max(0, i - 1))}
          onNext={() => setPresentIdx((i) => Math.min(slides.length - 1, i + 1))}
          onClose={stopPresent}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 발표 모드 오버레이 (풀스크린)
// ─────────────────────────────────────────────

interface PresentationOverlayProps {
  slides: Slide[];
  idx: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

function PresentationOverlay({ slides, idx, onPrev, onNext, onClose }: PresentationOverlayProps) {
  const slide = slides[idx];
  const [notesOpen, setNotesOpen] = useState(false);
  const hasNotes = !!slide?.notes?.trim();
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none">
      {/* 슬라이드 — 16:9 비율 최대 */}
      <div
        className="bg-white shadow-2xl relative overflow-hidden"
        style={{
          aspectRatio: '16 / 9',
          width: 'min(95vw, calc(95vh * 16 / 9))',
          background: slide?.background ?? '#fff',
        }}
      >
        {slide?.elements.map((el) => {
          const pos: React.CSSProperties = {
            position: 'absolute',
            left: `${el.xPct}%`,
            top: `${el.yPct}%`,
            width: `${el.wPct}%`,
            height: `${el.hPct}%`,
          };
          if (el.type === 'text') {
            return (
              <div
                key={el.id}
                style={{
                  ...pos,
                  fontSize: `${el.fontSizeRem}rem`,
                  fontWeight: el.bold ? 600 : 400,
                  color: el.textColor ?? 'rgba(0,0,0,0.85)',
                  padding: '4px 8px',
                  lineHeight: 1.25,
                }}
                className="break-words overflow-hidden"
              >
                {el.content}
              </div>
            );
          }
          if (el.type === 'image') {
            return (
              <img
                key={el.id}
                src={el.src}
                alt=""
                style={pos}
                className="object-contain pointer-events-none"
                draggable={false}
              />
            );
          }
          return (
            <div key={el.id} style={pos}>
              <ShapeRender el={el} />
            </div>
          );
        })}
      </div>

      {/* 좌우 클릭 영역 (보이지 않음) */}
      <button
        type="button"
        onClick={onPrev}
        disabled={idx === 0}
        className="absolute left-0 top-0 bottom-0 w-1/4 cursor-w-resize disabled:cursor-default group"
        aria-label="이전 슬라이드"
      >
        <ChevronLeft className="w-8 h-8 text-white/0 group-hover:text-white/40 absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={idx === slides.length - 1}
        className="absolute right-0 top-0 bottom-0 w-1/4 cursor-e-resize disabled:cursor-default group"
        aria-label="다음 슬라이드"
      >
        <ChevronRightIcon className="w-8 h-8 text-white/0 group-hover:text-white/40 absolute right-4 top-1/2 -translate-y-1/2 transition-colors" />
      </button>

      {/* 발표자 노트 패널 (토글) — 사용자만 보이는 영역, 우측 하단 */}
      {notesOpen && hasNotes && (
        <div className="absolute bottom-14 right-5 max-w-md max-h-[40vh] overflow-y-auto rounded-lg bg-white/95 text-foreground p-3 shadow-2xl text-sm whitespace-pre-wrap leading-relaxed">
          <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground border-b border-border pb-1">
            <span aria-hidden>📝</span>
            <span>발표자 노트 — 슬라이드 {idx + 1}</span>
          </div>
          {slide?.notes}
        </div>
      )}

      {/* 하단 정보 + 노트 토글 + 닫기 */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-5 text-white/60 text-xs">
        <span>← → 이동 · Esc 종료 · Home/End 처음/끝</span>
        <span className="font-mono">{idx + 1} / {slides.length}</span>
        <div className="flex items-center gap-1">
          {hasNotes && (
            <button
              type="button"
              onClick={() => setNotesOpen((v) => !v)}
              className={cn(
                'px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors',
                notesOpen ? 'bg-white/20 text-white' : 'hover:bg-white/10',
              )}
              aria-pressed={notesOpen}
              title="발표자 노트"
            >
              <span aria-hidden>📝</span>
              <span>노트</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10"
            aria-label="발표 종료"
            title="발표 종료 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
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
  onStartResize: (e: React.PointerEvent, dir: ResizeDir) => void;
}

function TextElView({
  el, selected, editing, onPointerDown, onClick, onDoubleClick, onChange, onFinishEdit, onStartResize,
  onStartRotate,
}: TextElViewProps & ShapeElViewExtraProps) {
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
        backgroundColor: el.bgColor,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        transformOrigin: 'center center',
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
          'w-full h-full outline-none break-words overflow-hidden',
          el.bold && 'font-semibold',
          el.italic && 'italic',
          el.underline && 'underline underline-offset-2',
        )}
        style={{
          fontSize: `${el.fontSizeRem}rem`,
          lineHeight: el.lineHeight ?? 1.25,
          color: el.textColor ?? 'rgba(0,0,0,0.8)',
          textAlign: el.align ?? 'left',
        }}
      >
        {el.content}
      </div>
      {selected && !editing && <ResizeHandles onStart={onStartResize} />}
      {selected && !editing && onStartRotate && <RotateHandle onStart={onStartRotate} />}
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
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}

function ToolBtn({ onClick, disabled, destructive, active, title, children }: ToolBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        'px-2 py-1 rounded flex items-center transition-colors',
        disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted',
        destructive && !disabled && 'text-destructive hover:bg-destructive/10',
        active && !disabled && 'bg-muted text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-border mx-1 shrink-0" />;
}

// ─────────────────────────────────────────────
// 도형 요소 (캔버스)
// ─────────────────────────────────────────────

interface ShapeElViewProps {
  el: SlideShapeEl;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onStartResize: (e: React.PointerEvent, dir: ResizeDir) => void;
}

interface ShapeElViewExtraProps {
  onStartRotate?: (e: React.PointerEvent) => void;
}

function ShapeElView({ el, selected, onPointerDown, onClick, onStartResize, onStartRotate }: ShapeElViewProps & ShapeElViewExtraProps) {
  return (
    <div
      onPointerDown={onPointerDown}
      onClick={onClick}
      className={cn(
        'absolute cursor-move',
        selected && 'outline outline-2 -outline-offset-1 outline-foreground/70',
        !selected && 'hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-foreground/30',
      )}
      style={{
        left: `${el.xPct}%`,
        top: `${el.yPct}%`,
        width: `${el.wPct}%`,
        height: `${el.hPct}%`,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        transformOrigin: 'center center',
      }}
    >
      <ShapeRender el={el} />
      {selected && <ResizeHandles onStart={onStartResize} />}
      {selected && onStartRotate && <RotateHandle onStart={onStartRotate} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// 이미지 요소 (캔버스)
// ─────────────────────────────────────────────

interface ImageElViewProps {
  el: SlideImageEl;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onStartResize: (e: React.PointerEvent, dir: ResizeDir) => void;
}

function ImageElView({ el, selected, onPointerDown, onClick, onStartResize, onStartRotate }: ImageElViewProps & ShapeElViewExtraProps) {
  return (
    <div
      onPointerDown={onPointerDown}
      onClick={onClick}
      className={cn(
        'absolute cursor-move overflow-hidden',
        selected && 'outline outline-2 -outline-offset-1 outline-foreground/70',
        !selected && 'hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-foreground/30',
      )}
      style={{
        left: `${el.xPct}%`,
        top: `${el.yPct}%`,
        width: `${el.wPct}%`,
        height: `${el.hPct}%`,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        transformOrigin: 'center center',
      }}
    >
      <img
        src={el.src}
        alt={el.alt ?? ''}
        className="w-full h-full object-contain select-none pointer-events-none"
        draggable={false}
      />
      {selected && <ResizeHandles onStart={onStartResize} />}
      {selected && onStartRotate && <RotateHandle onStart={onStartRotate} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// 리사이즈 핸들 (8방향)
// ─────────────────────────────────────────────

const HANDLES: Array<{ dir: ResizeDir; style: React.CSSProperties; cursor: string }> = [
  { dir: 'nw', style: { left: -5, top: -5 },                                              cursor: 'nwse-resize' },
  { dir: 'n',  style: { left: '50%', top: -5, transform: 'translateX(-50%)' },           cursor: 'ns-resize'   },
  { dir: 'ne', style: { right: -5, top: -5 },                                             cursor: 'nesw-resize' },
  { dir: 'e',  style: { right: -5, top: '50%', transform: 'translateY(-50%)' },          cursor: 'ew-resize'   },
  { dir: 'se', style: { right: -5, bottom: -5 },                                          cursor: 'nwse-resize' },
  { dir: 's',  style: { left: '50%', bottom: -5, transform: 'translateX(-50%)' },        cursor: 'ns-resize'   },
  { dir: 'sw', style: { left: -5, bottom: -5 },                                           cursor: 'nesw-resize' },
  { dir: 'w',  style: { left: -5, top: '50%', transform: 'translateY(-50%)' },           cursor: 'ew-resize'   },
];

function ResizeHandles({ onStart }: { onStart: (e: React.PointerEvent, dir: ResizeDir) => void }) {
  return (
    <>
      {HANDLES.map(({ dir, style, cursor }) => (
        <div
          key={dir}
          onPointerDown={(e) => onStart(e, dir)}
          onClick={(e) => e.stopPropagation()}
          className="absolute w-2.5 h-2.5 bg-white border border-foreground/80 rounded-sm hover:bg-foreground/10"
          style={{ ...style, cursor }}
          aria-label={`리사이즈 ${dir}`}
        />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────
// 회전 핸들 (선택된 도형 위쪽)
// ─────────────────────────────────────────────

function RotateHandle({ onStart }: { onStart: (e: React.PointerEvent) => void }) {
  return (
    <div
      onPointerDown={onStart}
      onClick={(e) => e.stopPropagation()}
      className="absolute left-1/2 -top-6 -translate-x-1/2 w-3 h-3 rounded-full bg-white border border-foreground/80 hover:bg-foreground/10 cursor-grab"
      style={{ touchAction: 'none' }}
      aria-label="회전"
      title="드래그해서 회전 (Shift = 15도 snap)"
    >
      {/* 연결선 (요소 위 → 핸들) */}
      <span
        aria-hidden
        className="block absolute left-1/2 top-3 -translate-x-1/2 w-px h-3 bg-foreground/40"
      />
    </div>
  );
}


// ─────────────────────────────────────────────
// 단축키 도움말
