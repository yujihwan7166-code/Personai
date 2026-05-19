/** /cloud/slide/:id — 슬라이드 에디터 v1.
 *  7단계-α: 좌측 썸네일 + 16:9 캔버스 + 텍스트박스 무제한 + 드래그 이동.
 *  도형·이미지·전환·발표 모드·.pptx import/export 는 다음 단계.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X, MoreHorizontal, Loader2, AlertCircle, ArrowLeft, Keyboard,
  Plus, Trash2, Copy as CopyIcon, Type as TypeIcon, ChevronUp, ChevronDown,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  Square as SquareIcon, Circle as CircleIcon, Triangle as TriangleIcon,
  Minus as LineIcon, ArrowRight as ArrowRightIcon, Shapes,
  Combine, Split,
  ImagePlus, ArrowUpToLine, ArrowDownToLine,
  RotateCw, RotateCcw,
  Play,
  Sparkles, Undo2, Redo2,
} from 'lucide-react';
import { toast as appToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
// updateFileBody 는 useDebouncedAutosave 내부 사용
import { useCloudNodeLoader } from '@/lib/cloudCommon/useCloudNodeLoader';
import { useDebouncedAutosave } from '@/lib/cloudCommon/useDebouncedAutosave';
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
// CloudNode 는 useCloudNodeLoader 내부 사용
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ColorPopover } from '@/components/cloud/ColorPopover';

import { SaveStateBadge, type SaveState } from '@/lib/cloudDoc/SaveStateBadge';
import { ToolBtn, Sep } from '@/lib/cloudSlide/ToolBtn';
import { ThumbButton } from '@/lib/cloudSlide/ThumbButton';
import { SlideHelpModal } from '@/lib/cloudSlide/SlideHelpModal';
import { PresentationOverlay } from '@/lib/cloudSlide/PresentationOverlay';
import { TextElView } from '@/lib/cloudSlide/TextElView';
import { ImageElView } from '@/lib/cloudSlide/ImageElView';
import { ShapeElView } from '@/lib/cloudSlide/ShapeElView';
import { newId } from '@/lib/idGenerator';
import {
  type SlideTextEl, type ShapeType, type SlideShapeEl, type SlideImageEl,
  type SlideElement, type ResizeDir, type Slide, type SlideMeta,
  SHAPE_SHADOW, isText, isShape, isLineLike, isImage, emptySlide, defaultMeta,
} from '@/lib/cloudSlide/types';
import {
  nextFontSize, nextStrokeWidth, nextLineHeight, nextRadius,
} from '@/lib/cloudSlide/steps';
import { computeAlign, computeDistribute } from '@/lib/cloudSlide/align';
import { applySnap, buildSnapLines } from '@/lib/cloudSlide/snap';
import { computeRotation, angleBetween } from '@/lib/cloudSlide/rotation';

const AUTOSAVE_DELAY_MS = 1000;
const SLIDE_ZOOM_STEPS = [50, 75, 100, 125, 150, 200] as const;
const SLIDE_ZOOM_LS_KEY = 'personai.cloud.slide.zoom';

export default function CloudSlideEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>(undefined);
  const [helpOpen, setHelpOpen] = useState(false);

  const [slides, setSlides] = useState<Slide[]>([emptySlide()]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedElId, setSelectedElId] = useState<string | null>(null);
  /** 요소 우클릭 컨텍스트 메뉴 — id + 화면 좌표. */
  const [elCtxMenu, setElCtxMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  useEffect(() => {
    if (!elCtxMenu) return;
    const close = () => setElCtxMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('blur', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [elCtxMenu]);
  const handleElContextMenu = useCallback((e: React.MouseEvent, elId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedElId(elId);
    setSelectedElIds(new Set([elId]));
    setElCtxMenu({ id: elId, x: e.clientX, y: e.clientY });
  }, []);
  /** 슬라이드 썸네일 우클릭 컨텍스트 메뉴 — idx + 화면 좌표. */
  const [slideCtxMenu, setSlideCtxMenu] = useState<{ idx: number; x: number; y: number } | null>(null);
  useEffect(() => {
    if (!slideCtxMenu) return;
    const close = () => setSlideCtxMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('blur', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [slideCtxMenu]);
  const handleSlideContextMenu = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSlideCtxMenu({ idx, x: e.clientX, y: e.clientY });
  }, []);
  // 다중 선택 (Shift+클릭 또는 그룹화된 멤버 자동 포함)
  const [selectedElIds, setSelectedElIds] = useState<Set<string>>(new Set());
  const [editingElId, setEditingElId] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [presentIdx, setPresentIdx] = useState(0);
  /** 발표 모드 가림: 'black'/'white' = 화면 검정/흰. null = 정상. PowerPoint convention. */
  const [presentBlank, setPresentBlank] = useState<'black' | 'white' | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // ─── 슬라이드 zoom (캔버스 폭 % — localStorage 영속) ───
  const [slideZoom, setSlideZoomInner] = useState<number>(() => {
    if (typeof window === 'undefined') return 100;
    try {
      const v = Number(window.localStorage.getItem(SLIDE_ZOOM_LS_KEY));
      return (SLIDE_ZOOM_STEPS as readonly number[]).includes(v) ? v : 100;
    } catch {
      // private mode / cookie 차단 환경
      return 100;
    }
  });
  const setSlideZoom = useCallback((v: number) => {
    setSlideZoomInner(v);
    try { window.localStorage.setItem(SLIDE_ZOOM_LS_KEY, String(v)); } catch { /* noop */ }
  }, []);

  // ─── 노드 로드 (공용 훅) ───
  const { node, loadError } = useCloudNodeLoader({
    id, user, authLoading,
    expectedFileType: 'slide',
    notFoundMessage: '슬라이드를 찾을 수 없어요.',
    wrongTypeMessage: '슬라이드 파일이 아니에요.',
    onLoad: (n) => {
      const meta = (n.meta ?? {}) as Partial<SlideMeta>;
      const loaded = Array.isArray(meta.slides) && meta.slides.length > 0
        ? meta.slides as Slide[]
        : defaultMeta().slides;
      setSlides(loaded);
      setCurrentIdx(Math.max(0, Math.min((meta.currentIdx ?? 0), loaded.length - 1)));
    },
  });

  // ─── 저장 큐 (공용 훅) ───
  const { queueSave: queueSaveRaw, flushSave } = useDebouncedAutosave({
    id, delayMs: AUTOSAVE_DELAY_MS, setSaveState, setLastSavedAt,
  });

  const queueSave = useCallback((nextSlides: Slide[], nextIdx: number) => {
    queueSaveRaw({
      meta: { ...(node?.meta ?? {}), slides: nextSlides, currentIdx: nextIdx },
    });
  }, [queueSaveRaw, node?.meta]);

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
    setSelectedElIds(new Set());  // 다중 선택도 함께 초기화 (snapshot 의 element id 와 다를 수 있음)
    setEditingElId(null);
  }, [canUndo, history, historyIdx, applySnapshot]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const target = history[historyIdx + 1];
    if (!target) return;
    setHistoryIdx(historyIdx + 1);
    applySnapshot(target);
    setSelectedElId(null);
    setSelectedElIds(new Set());
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
    setSlides((prev) => {
      if (prev.length <= 1) {
        toast({ title: '마지막 슬라이드예요', description: '최소 1장은 유지됩니다.' });
        return prev;
      }
      const newSlides = prev.filter((_, i) => i !== currentIdx);
      const newIdx = Math.max(0, Math.min(currentIdx, newSlides.length - 1));
      setCurrentIdx(newIdx);
      queueSave(newSlides, newIdx);
      return newSlides;
    });
    setSelectedElId(null);
    setEditingElId(null);
  }, [currentIdx, queueSave]);

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

  // 인덱스 기반 wrapper — 썸네일 우클릭 컨텍스트 메뉴에서 사용.
  // currentIdx 클로저에 묶이지 않도록 별도 함수로 둠.
  const duplicateSlideAt = useCallback((idx: number) => {
    updateSlides((prev) => {
      const next = [...prev];
      const src = next[idx];
      if (!src) return prev;
      next.splice(idx + 1, 0, {
        ...src,
        id: newId('s'),
        elements: src.elements.map((el) => ({ ...el, id: newId('el') })),
      });
      return next;
    }, idx + 1);
    setCurrentIdx(idx + 1);
  }, [updateSlides]);

  const deleteSlideAt = useCallback((idx: number) => {
    setSlides((prev) => {
      if (prev.length <= 1) {
        toast({ title: '마지막 슬라이드예요', description: '최소 1장은 유지됩니다.' });
        return prev;
      }
      const newSlides = prev.filter((_, i) => i !== idx);
      const newIdx = Math.max(0, Math.min(idx, newSlides.length - 1));
      setCurrentIdx(newIdx);
      queueSave(newSlides, newIdx);
      return newSlides;
    });
    setSelectedElId(null);
    setEditingElId(null);
  }, [queueSave]);

  const moveSlideUpAt = useCallback((idx: number) => {
    if (idx === 0) return;
    updateSlides((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    }, idx - 1);
    setCurrentIdx(idx - 1);
  }, [updateSlides]);

  const moveSlideDownAt = useCallback((idx: number) => {
    let moved = false;
    setSlides((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      queueSave(next, idx + 1);
      moved = true;
      return next;
    });
    if (moved) setCurrentIdx(idx + 1);
  }, [queueSave]);

  const insertSlideAt = useCallback((idx: number) => {
    updateSlides((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, emptySlide());
      return next;
    }, idx + 1);
    setCurrentIdx(idx + 1);
  }, [updateSlides]);

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
    updateCurrentSlide((s) => {
      const shapeCount = s.elements.filter((e) => e.type === shape).length;
      const offset = Math.min(15, shapeCount * 3);
      const el: SlideShapeEl = {
        id: newId('el'),
        type: shape,
        xPct: Math.min(60, 25 + offset),
        yPct: Math.min(50, 30 + offset),
        wPct: sz.wPct, hPct: sz.hPct,
        fillColor: defaultFill[shape],
        strokeColor: (shape === 'line' || shape === 'arrow') ? '#222222' : undefined,
        strokeWidth: (shape === 'line' || shape === 'arrow') ? 3 : undefined,
      };
      setSelectedElId(el.id);
      setEditingElId(null);
      return { ...s, elements: [...s.elements, el] };
    });
  }, [updateCurrentSlide]);

  const addImageEl = useCallback((src: string) => {
    // 같은 슬라이드에 이미 이미지가 있으면 cascade 로 살짝 옮겨 추가 (완전 겹침 방지)
    updateCurrentSlide((s) => {
      const imageCount = s.elements.filter((e) => e.type === 'image').length;
      const offset = Math.min(15, imageCount * 2); // 최대 15% 까지
      const el: SlideImageEl = {
        id: newId('el'),
        type: 'image',
        xPct: Math.min(60, 20 + offset),
        yPct: Math.min(40, 25 + offset),
        wPct: 50, hPct: 50,
        src,
      };
      setSelectedElId(el.id);
      setEditingElId(null);
      return { ...s, elements: [...s.elements, el] };
    });
  }, [updateCurrentSlide]);

  const pickAndAddImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      // MIME type 검증 (확장자 위장된 비-이미지 차단)
      if (!file.type.startsWith('image/')) {
        appToast({ title: '이미지 파일이 아닙니다', description: `MIME: ${file.type || '알 수 없음'}` });
        return;
      }
      // 하드 한계 — 5MB 초과 → 거부 (data URL base64 가 1.33배 부풀어 저장 실패 가능)
      if (file.size > 5 * 1024 * 1024) {
        appToast({
          title: '이미지가 너무 큽니다',
          description: `${(file.size / 1024 / 1024).toFixed(1)}MB. 5MB 이하만 가능합니다. 압축 후 다시 시도하세요.`,
        });
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        appToast({
          title: '이미지가 큽니다',
          description: '2MB 이하 권장. localStorage 용량을 빠르게 소모합니다.',
        });
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const src = ev.target?.result;
        if (typeof src === 'string') addImageEl(src);
      };
      reader.onerror = () => {
        appToast({ title: '이미지 읽기 실패', description: '파일이 손상되었거나 접근할 수 없습니다.' });
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

  /** 요소 복제 — 같은 슬라이드에 +2% 위치 어긋나게 추가. */
  const duplicateEl = useCallback((elId: string) => {
    let newId_: string | null = null;
    updateCurrentSlide((s) => {
      const target = s.elements.find((e) => e.id === elId);
      if (!target) return s;
      newId_ = newId('el');
      const dup: SlideElement = {
        ...target,
        id: newId_,
        xPct: Math.max(0, Math.min(100 - target.wPct, target.xPct + 2)),
        yPct: Math.max(0, Math.min(100 - target.hPct, target.yPct + 2)),
        groupId: undefined,
      };
      return { ...s, elements: [...s.elements, dup] };
    });
    if (newId_) {
      setSelectedElId(newId_);
      setSelectedElIds(new Set([newId_]));
    }
  }, [updateCurrentSlide]);

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
  // 알고리즘은 lib/cloudSlide/align.ts (테스트 가능) — 여기서는 state 적용만.
  const alignSelected = useCallback((axis: 'h' | 'v', mode: 'start' | 'center' | 'end') => {
    if (selectedElIds.size < 2) return;
    updateCurrentSlide((s) => {
      const els = s.elements.filter((e) => selectedElIds.has(e.id));
      const newPos = computeAlign(els, axis, mode);
      if (newPos.size === 0) return s;
      return {
        ...s,
        elements: s.elements.map((e) => {
          const np = newPos.get(e.id);
          if (np === undefined) return e;
          return axis === 'h' ? { ...e, xPct: np } : { ...e, yPct: np };
        }),
      };
    });
  }, [selectedElIds, updateCurrentSlide]);

  const distributeSelected = useCallback((axis: 'h' | 'v') => {
    if (selectedElIds.size < 3) return;
    updateCurrentSlide((s) => {
      const els = s.elements.filter((e) => selectedElIds.has(e.id));
      const newPos = computeDistribute(els, axis);
      if (newPos.size === 0) return s;
      return {
        ...s,
        elements: s.elements.map((e) => {
          const np = newPos.get(e.id);
          if (np === undefined) return e;
          return axis === 'h' ? { ...e, xPct: np } : { ...e, yPct: np };
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
    const groupId = newId('g');
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
    const startAngle = angleBetween(cx, cy, e.clientX, e.clientY);
    const startRotation = el.rotation ?? 0;

    const onMove = (ev: PointerEvent) => {
      const curAngle = angleBetween(cx, cy, ev.clientX, ev.clientY);
      const rotation = computeRotation({ startRotation, startAngle, curAngle, shift: ev.shiftKey });
      updateEl(elId, { rotation });
      setDragHint({ x: ev.clientX, y: ev.clientY, text: `${Math.round(rotation)}°` });
    };
    const onUp = () => {
      setDragHint(null);
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
      setDragHint({ x: ev.clientX, y: ev.clientY, text: `${Math.round(wPct)}% × ${Math.round(hPct)}%` });
    };
    const onUp = () => {
      setDragHint(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [updateEl]);

  // 정렬 가이드 (드래그 중에만) — kind h(가로선) / v(세로선), pct 0~100
  const [snapGuides, setSnapGuides] = useState<Array<{ kind: 'h' | 'v'; pct: number }>>([]);

  /** 리사이즈/회전/이동 시 커서 근처 floating tooltip — '120% x 60%' / '15°' / 'x 12%, y 30%'. */
  const [dragHint, setDragHint] = useState<{ x: number; y: number; text: string } | null>(null);

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
    const { vLines, hLines } = buildSnapLines(others);

    const onMove = (ev: PointerEvent) => {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - startY) / rect.height) * 100;
      const rawNx = Math.max(0, Math.min(100 - el.wPct, startElX + dxPct));
      const rawNy = Math.max(0, Math.min(100 - el.hPct, startElY + dyPct));
      const { nx, ny, guides } = applySnap({
        nx: rawNx, ny: rawNy, w: el.wPct, h: el.hPct,
        vLines, hLines, threshold: SNAP_THRESHOLD_PCT,
      });
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
      setDragHint({ x: ev.clientX, y: ev.clientY, text: `x ${Math.round(nx)}%, y ${Math.round(ny)}%` });
    };
    const onUp = () => {
      setSnapGuides([]);
      setDragHint(null);
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
    // 함수형 업데이터로 stale slides/currentIdx 회피 (AI 비동기 중 다른 상태 변경 가능)
    setSlides((prev) => {
      const insertAt = currentIdx + 1;
      const next = [...prev.slice(0, insertAt), newSlide, ...prev.slice(insertAt)];
      queueSave(next, insertAt);
      return next;
    });
    setCurrentIdx((i) => i + 1);
    setSelectedElId(null);
  }, [currentIdx, queueSave]);

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
        const newElements: SlideElement[] = current.elements.filter((e) => e.type !== 'text');
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
        setSlides((prev) => {
          const nextSlides = prev.map((s, i) => (i === currentIdx ? { ...s, elements: newElements } : s));
          queueSave(nextSlides, currentIdx);
          return nextSlides;
        });
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
      // 함수형 업데이터 — 비동기 후 stale slides 회피
      setSlides((prev) => {
        const nextSlides = [...prev, ...newSlides];
        const targetIdx = prev.length;
        setCurrentIdx(targetIdx);
        queueSave(nextSlides, targetIdx);
        return nextSlides;
      });
      toast({ title: '5장 개요 완료', description: `${newSlides.length}장 추가됨` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '5장 개요 실패', description: msg });
    } finally {
      setAiBusy(null);
    }
  }, [queueSave]);

  // ─── Import / Export .pptx ───
  const importPptx = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pptx';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      // 확장자 검증 — accept 만으론 부족
      if (!file.name.toLowerCase().endsWith('.pptx')) {
        toast({ title: '.pptx 파일만 가능합니다', description: `선택한 파일: ${file.name}` });
        return;
      }
      // 50MB 한계 — 그 이상 파싱 시 메모리 폭주 가능
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: '파일이 너무 큽니다',
          description: `${(file.size / 1024 / 1024).toFixed(1)}MB. 50MB 이하만 가능합니다.`,
        });
        return;
      }
      try {
        const imported = await importPptxFile(file);
        if (!imported.length) {
          toast({ title: '가져올 슬라이드가 없어요', description: '빈 파일입니다.' });
          return;
        }
        // 기존 슬라이드 뒤에 추가 — 함수형 업데이터로 stale slides 회피 (파일 파싱 동안 변경 가능)
        setSlides((prev) => {
          const nextSlides = [...prev, ...imported];
          const targetIdx = prev.length;
          setCurrentIdx(targetIdx);
          queueSave(nextSlides, targetIdx);
          return nextSlides;
        });
        setSelectedElId(null);
        setEditingElId(null);
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
  }, [queueSave]);

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
  const exportPdf = useCallback(async (orientation: 'l' | 'p' = 'l') => {
    if (!node) return;
    setAiBusy('PDF 생성');
    // 임시 컨테이너에 모든 슬라이드 렌더 — 에러 시도 cleanup 보장
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-99999px';
    host.style.top = '0';
    host.style.width = '1280px';  // 16:9 캔버스 폭
    document.body.appendChild(host);
    try {

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
            // triangle / line / arrow — SVG. attribute 값은 escape 필요 (사용자가 색에 따옴표 등 주입 가능).
            const sw = el.strokeWidth ?? 2;
            const stroke = el.strokeColor ?? el.fillColor;
            const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const fillAttr = esc(el.fillColor);
            const strokeAttr = esc(stroke);
            const strokeColorAttr = esc(el.strokeColor ?? 'none');
            if (el.type === 'triangle') {
              child.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="50,0 100,100 0,100" fill="${fillAttr}" stroke="${strokeColorAttr}" stroke-width="${el.strokeColor ? sw : 0}" vector-effect="non-scaling-stroke" /></svg>`;
            } else if (el.type === 'line') {
              child.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1="50" x2="100" y2="50" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linecap="round" vector-effect="non-scaling-stroke" /></svg>`;
            } else if (el.type === 'arrow') {
              const ahId = `ah-${esc(el.id)}-pdf`;
              child.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="overflow:visible"><defs><marker id="${ahId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0,0 L10,5 L0,10 z" fill="${strokeAttr}" /></marker></defs><line x1="0" y1="50" x2="100" y2="50" stroke="${strokeAttr}" stroke-width="${sw}" stroke-linecap="round" vector-effect="non-scaling-stroke" marker-end="url(#${ahId})" /></svg>`;
            }
          }
          slideEl.appendChild(child);
        }
        host.appendChild(slideEl);
        elements.push(slideEl);
      }

      const name = sanitizeFileName(node.name);
      await exportElementsToPdf(elements, { fileName: name, orientation });
      toast({
        title: 'PDF 다운로드 시작',
        description: `${name}.pdf (${slides.length}장, ${orientation === 'l' ? '가로' : '세로'})`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'PDF 내보내기 실패', description: msg });
    } finally {
      if (host.parentNode) host.parentNode.removeChild(host);
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

  // 발표 모드 중 body 스크롤 잠금 (overlay 뒤 컨텐츠가 휠로 스크롤되는 것 방지)
  useEffect(() => {
    if (!presenting) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [presenting]);

  const stopPresent = useCallback(() => {
    setCurrentIdx(presentIdx);  // 마지막으로 본 슬라이드로 에디터 복귀
    setPresenting(false);
    setPresentBlank(null);
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
        } else if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          setPresentBlank((cur) => (cur === 'black' ? null : 'black'));
        } else if (e.key === 'w' || e.key === 'W') {
          e.preventDefault();
          setPresentBlank((cur) => (cur === 'white' ? null : 'white'));
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
            <SaveStateBadge state={saveState} lastSavedAt={lastSavedAt} showIdle />
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
                <DropdownMenuItem onSelect={() => { void exportPdf('l'); }} disabled={!!aiBusy}>
                  📤 PDF 가로 ({slides.length}장)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { void exportPdf('p'); }} disabled={!!aiBusy}>
                  📤 PDF 세로 ({slides.length}장)
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

          {/* 선택 요소 회전 — 단일: ±15° + 각도 표시 + 0° 복귀 */}
          {selectedElId && selectedElIds.size <= 1 && (() => {
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

          {/* 다중 선택 회전 — 각 요소 개별 ±15° (그룹 중심 회전 X) */}
          {selectedElIds.size >= 2 && (() => {
            const rotateMulti = (delta: number) => {
              updateCurrentSlide((s) => ({
                ...s,
                elements: s.elements.map((e) => {
                  if (!selectedElIds.has(e.id)) return e;
                  const cur = (((e.rotation ?? 0) % 360) + 360) % 360;
                  const next = (cur + delta + 360) % 360;
                  return { ...e, rotation: next || undefined };
                }),
              }));
            };
            const resetMulti = () => {
              updateCurrentSlide((s) => ({
                ...s,
                elements: s.elements.map((e) =>
                  selectedElIds.has(e.id) ? { ...e, rotation: undefined } : e,
                ),
              }));
            };
            const anyRotated = currentSlide.elements
              .filter((e) => selectedElIds.has(e.id))
              .some((e) => (e.rotation ?? 0) !== 0);
            return (
              <>
                <Sep />
                <ToolBtn onClick={() => rotateMulti(-15)} title="각 요소 −15° 회전">
                  <RotateCcw className="w-4 h-4" />
                </ToolBtn>
                <ToolBtn onClick={() => rotateMulti(15)} title="각 요소 +15° 회전">
                  <RotateCw className="w-4 h-4" />
                </ToolBtn>
                {anyRotated && (
                  <ToolBtn onClick={resetMulti} title="모두 회전 0° 복귀">
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

          <div className="ml-auto text-xs text-muted-foreground tabular-nums flex items-center gap-2">
            <span className="hidden sm:inline" title="캔버스 해상도 (16:9)">1280×720</span>
            <span className="hidden sm:inline text-muted-foreground/50">·</span>
            <select
              value={slideZoom}
              onChange={(e) => setSlideZoom(Number(e.target.value))}
              className="text-xs px-1.5 py-0.5 rounded border border-border bg-background hover:bg-muted cursor-pointer"
              title="캔버스 줌"
              aria-label="캔버스 줌"
            >
              {SLIDE_ZOOM_STEPS.map((z) => (
                <option key={z} value={z}>{z}%</option>
              ))}
            </select>
            <span className="text-muted-foreground/50">·</span>
            <span title="현재 슬라이드 / 총 슬라이드">{currentIdx + 1} / {slides.length}</span>
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
              onContextMenu={(e) => handleSlideContextMenu(e, i)}
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
            className="bg-white shadow-lg rounded-sm overflow-hidden relative shrink-0"
            style={{
              aspectRatio: '16 / 9',
              background: currentSlide.background ?? '#fff',
              width: `${slideZoom}%`,
              maxWidth: `${64 * (slideZoom / 100)}rem`,
            }}
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
                      onContextMenu={(e) => handleElContextMenu(e, el.id)}
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
                      onContextMenu={(e) => handleElContextMenu(e, el.id)}
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
                    onContextMenu={(e) => handleElContextMenu(e, el.id)}
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

      {/* 도형/텍스트/이미지 우클릭 메뉴 */}
      {elCtxMenu && (
        <div
          className="fixed z-[60] rounded border border-border bg-popover shadow-md text-sm min-w-[180px] py-1"
          style={{ left: elCtxMenu.x, top: elCtxMenu.y }}
          onClick={(e) => e.stopPropagation()}
          role="menu"
        >
          <button
            type="button"
            onClick={() => { duplicateEl(elCtxMenu.id); setElCtxMenu(null); }}
            className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center justify-between"
          >
            <span>복제</span>
            <span className="text-xs text-muted-foreground">Ctrl+D</span>
          </button>
          <button
            type="button"
            onClick={() => { deleteEl(elCtxMenu.id); setElCtxMenu(null); }}
            className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center justify-between text-destructive"
          >
            <span>삭제</span>
            <span className="text-xs text-muted-foreground">Del</span>
          </button>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            onClick={() => { moveElForward(elCtxMenu.id); setElCtxMenu(null); }}
            className="w-full text-left px-3 py-1.5 hover:bg-accent"
          >
            앞으로 (한 칸)
          </button>
          <button
            type="button"
            onClick={() => { moveElBackward(elCtxMenu.id); setElCtxMenu(null); }}
            className="w-full text-left px-3 py-1.5 hover:bg-accent"
          >
            뒤로 (한 칸)
          </button>
          <button
            type="button"
            onClick={() => { moveElToFront(elCtxMenu.id); setElCtxMenu(null); }}
            className="w-full text-left px-3 py-1.5 hover:bg-accent"
          >
            맨 앞으로
          </button>
          <button
            type="button"
            onClick={() => { moveElToBack(elCtxMenu.id); setElCtxMenu(null); }}
            className="w-full text-left px-3 py-1.5 hover:bg-accent"
          >
            맨 뒤로
          </button>
          {selectedElIds.size >= 2 && (
            <>
              <div className="my-1 border-t border-border" />
              <button
                type="button"
                onClick={() => { groupSelected(); setElCtxMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-accent"
              >
                그룹화 ({selectedElIds.size}개)
              </button>
            </>
          )}
        </div>
      )}

      {/* 슬라이드 썸네일 우클릭 메뉴 */}
      {slideCtxMenu && (
        <div
          className="fixed z-[60] rounded border border-border bg-popover shadow-md text-sm min-w-[200px] py-1"
          style={{ left: slideCtxMenu.x, top: slideCtxMenu.y }}
          onClick={(e) => e.stopPropagation()}
          role="menu"
        >
          <div className="px-3 py-1 text-xs text-muted-foreground border-b border-border mb-1">
            슬라이드 {slideCtxMenu.idx + 1}
          </div>
          <button
            type="button"
            onClick={() => { insertSlideAt(slideCtxMenu.idx); setSlideCtxMenu(null); }}
            className="w-full text-left px-3 py-1.5 hover:bg-accent"
          >
            아래에 새 슬라이드
          </button>
          <button
            type="button"
            onClick={() => { duplicateSlideAt(slideCtxMenu.idx); setSlideCtxMenu(null); }}
            className="w-full text-left px-3 py-1.5 hover:bg-accent"
          >
            이 슬라이드 복제
          </button>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            onClick={() => { moveSlideUpAt(slideCtxMenu.idx); setSlideCtxMenu(null); }}
            disabled={slideCtxMenu.idx === 0}
            className="w-full text-left px-3 py-1.5 hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            위로 이동
          </button>
          <button
            type="button"
            onClick={() => { moveSlideDownAt(slideCtxMenu.idx); setSlideCtxMenu(null); }}
            disabled={slideCtxMenu.idx >= slides.length - 1}
            className="w-full text-left px-3 py-1.5 hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            아래로 이동
          </button>
          <div className="my-1 border-t border-border" />
          <button
            type="button"
            onClick={() => { deleteSlideAt(slideCtxMenu.idx); setSlideCtxMenu(null); }}
            disabled={slides.length <= 1}
            className="w-full text-left px-3 py-1.5 hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent text-destructive"
          >
            슬라이드 삭제
          </button>
        </div>
      )}

      {/* 리사이즈/회전/이동 floating 정보 */}
      {dragHint && (
        <span
          className="fixed z-[60] pointer-events-none rounded bg-foreground text-background text-[10px] font-mono px-1.5 py-0.5 shadow-md"
          style={{ left: dragHint.x + 12, top: dragHint.y + 12 }}
          aria-hidden
        >
          {dragHint.text}
        </span>
      )}

      {presenting && (
        <PresentationOverlay
          slides={slides}
          idx={presentIdx}
          blank={presentBlank}
          onPrev={() => { setPresentBlank(null); setPresentIdx((i) => Math.max(0, i - 1)); }}
          onNext={() => { setPresentBlank(null); setPresentIdx((i) => Math.min(slides.length - 1, i + 1)); }}
          onClose={stopPresent}
        />
      )}
    </div>
  );
}



// ToolBtn / Sep 는 lib/cloudSlide/ToolBtn 공용

// ThumbButton 은 lib/cloudSlide/ThumbButton 공용


// ─────────────────────────────────────────────
// 단축키 도움말
