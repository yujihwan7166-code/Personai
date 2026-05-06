/**
 * ResizableImage — TipTap Image 확장 + React NodeView.
 *
 * 기능:
 * - 우하단 리사이즈 핸들 드래그 → width 조절 (Notion 식)
 * - 정렬 (left/center/right) 토글 — 클릭 시 떠오르는 작은 인라인 바
 * - draggable: true — 본문 내 위치 이동 (TipTap 기본 drag handle)
 *
 * markdown 직렬화는 부모 Image extension 의 ![alt](src) 그대로 — width/align 은
 * data-attribute 형태로 보존되며 마크다운 라운드트립 시 누락될 수 있음 (허용).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { AlignLeft, AlignCenter, AlignRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Align = 'left' | 'center' | 'right';

const MIN_WIDTH = 80;
const MAX_WIDTH = 1200;

function ResizableImageView({ node, updateAttributes, selected, deleteNode, editor }: NodeViewProps) {
  const { src, alt } = node.attrs as { src: string; alt?: string; width?: number | null; align?: Align };
  const align: Align = (node.attrs.align as Align) ?? 'left';
  const width: number | null = (node.attrs.width as number | null) ?? null;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ startX: number; startW: number } | null>(null);

  const onResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imgRef.current) return;
    const startW = imgRef.current.getBoundingClientRect().width;
    startRef.current = { startX: e.clientX, startW };
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const s = startRef.current;
      if (!s) return;
      const dx = e.clientX - s.startX;
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(s.startW + dx)));
      if (imgRef.current) imgRef.current.style.width = `${next}px`;
    };
    const up = () => {
      if (imgRef.current) {
        const w = Math.round(imgRef.current.getBoundingClientRect().width);
        updateAttributes({ width: w });
      }
      setDragging(false);
      startRef.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [dragging, updateAttributes]);

  const justify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
  const isEditable = editor?.isEditable ?? true;

  return (
    <NodeViewWrapper
      data-drag-handle
      className={cn('resizable-image-wrap relative my-3 flex', justify)}
    >
      <div
        ref={containerRef}
        className={cn(
          'relative inline-block group',
          selected && 'ring-2 ring-primary/70 rounded-md',
        )}
        style={{ maxWidth: '100%' }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt ?? ''}
          draggable={false}
          style={{
            width: width ? `${width}px` : 'auto',
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
            borderRadius: 8,
            border: '1px solid hsl(var(--hairline))',
          }}
        />

        {/* 우하단 리사이즈 핸들 — selected 또는 hover 시만 노출 */}
        {isEditable && (
          <span
            onPointerDown={onResizeStart}
            className={cn(
              'absolute bottom-1 right-1 w-3.5 h-3.5 rounded-sm bg-primary border-2 border-background cursor-nwse-resize shadow',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              selected && 'opacity-100',
            )}
            aria-label="이미지 크기 조절"
            title="드래그해 크기 조절"
          />
        )}

        {/* 인라인 편집 바 — 이미지 안 상단 overlay (Notion/Slack 패턴, 어디서나 안 잘림) */}
        {isEditable && selected && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 p-1 rounded-md border border-[hsl(var(--hairline))] bg-popover/95 backdrop-blur-sm shadow-md z-10">
            {/* 정렬 */}
            <AlignBtn active={align === 'left'} onClick={() => updateAttributes({ align: 'left' })} title="왼쪽">
              <AlignLeft className="w-3.5 h-3.5" />
            </AlignBtn>
            <AlignBtn active={align === 'center'} onClick={() => updateAttributes({ align: 'center' })} title="가운데">
              <AlignCenter className="w-3.5 h-3.5" />
            </AlignBtn>
            <AlignBtn active={align === 'right'} onClick={() => updateAttributes({ align: 'right' })} title="오른쪽">
              <AlignRight className="w-3.5 h-3.5" />
            </AlignBtn>
            <span className="w-px h-4 bg-[hsl(var(--hairline))] mx-0.5" />
            {/* 사이즈 preset — Notion 패턴 (S/M/L/Full) */}
            <SizeBtn active={width === 240} onClick={() => updateAttributes({ width: 240 })} title="작게 (240px)">S</SizeBtn>
            <SizeBtn active={width === 480} onClick={() => updateAttributes({ width: 480 })} title="중간 (480px)">M</SizeBtn>
            <SizeBtn active={width === 720} onClick={() => updateAttributes({ width: 720 })} title="크게 (720px)">L</SizeBtn>
            <SizeBtn active={width === null} onClick={() => updateAttributes({ width: null })} title="원본 폭 (auto)">
              <span className="text-[10px] font-semibold tracking-tight">Full</span>
            </SizeBtn>
            <span className="w-px h-4 bg-[hsl(var(--hairline))] mx-0.5" />
            <AlignBtn onClick={() => deleteNode()} title="이미지 삭제">
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </AlignBtn>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

function AlignBtn({
  active, onClick, title, children,
}: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        'h-7 w-7 inline-flex items-center justify-center rounded text-foreground/65 hover:text-foreground hover:bg-accent transition-colors',
        active && 'bg-accent text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function SizeBtn({
  active, onClick, title, children,
}: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        'h-7 min-w-[24px] px-1.5 inline-flex items-center justify-center rounded text-[11px] font-semibold tabular-nums text-foreground/65 hover:text-foreground hover:bg-accent transition-colors',
        active && 'bg-accent text-foreground',
      )}
    >
      {children}
    </button>
  );
}

export const ResizableImage = Image.extend({
  name: 'image',
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null as number | null,
        parseHTML: (el) => {
          const w = (el as HTMLElement).getAttribute('width') || (el as HTMLElement).style.width;
          if (!w) return null;
          const n = parseInt(w, 10);
          return Number.isFinite(n) ? n : null;
        },
        renderHTML: (attrs) => {
          if (!attrs.width) return {};
          return { width: String(attrs.width), style: `width:${attrs.width}px` };
        },
      },
      align: {
        default: 'left' as Align,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-align') || 'left',
        renderHTML: (attrs) => ({ 'data-align': attrs.align ?? 'left' }),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
