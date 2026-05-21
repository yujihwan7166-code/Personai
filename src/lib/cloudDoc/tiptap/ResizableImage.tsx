import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import ImageBase from '@tiptap/extension-image';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';

const MIN_IMAGE_WIDTH = 80;
const MAX_IMAGE_WIDTH = 640;

export const ResizableImage = ImageBase.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => numericAttr(element.getAttribute('width') ?? (element as HTMLElement).style.width),
        renderHTML: (attributes) => {
          const width = numericAttr(attributes.width);
          return width ? { width: String(width) } : {};
        },
      },
      height: {
        default: null,
        parseHTML: (element) => numericAttr(element.getAttribute('height') ?? (element as HTMLElement).style.height),
        renderHTML: (attributes) => {
          const height = numericAttr(attributes.height);
          return height ? { height: String(height) } : {};
        },
      },
      align: {
        default: null,
        parseHTML: (element) => imageAlignAttr(element.getAttribute('data-align')),
        renderHTML: (attributes) => {
          const align = imageAlignAttr(attributes.align);
          return align ? { 'data-align': align } : {};
        },
      },
      floating: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-floating') === 'true',
        renderHTML: (attributes) => attributes.floating ? { 'data-floating': 'true' } : {},
      },
      wrap: {
        default: null,
        parseHTML: (element) => imageWrapAttr(element.getAttribute('data-wrap')),
        renderHTML: (attributes) => {
          const wrap = imageWrapAttr(attributes.wrap);
          return wrap ? { 'data-wrap': wrap } : {};
        },
      },
      wrapSide: {
        default: null,
        parseHTML: (element) => imageWrapSideAttr(element.getAttribute('data-wrap-side')),
        renderHTML: (attributes) => {
          const wrapSide = imageWrapSideAttr(attributes.wrapSide);
          return wrapSide ? { 'data-wrap-side': wrapSide } : {};
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

function ResizableImageView({ node, selected, updateAttributes }: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [naturalRatio, setNaturalRatio] = useState(0.75);
  const src = String(node.attrs.src ?? '');
  const width = numericAttr(node.attrs.width);
  const height = numericAttr(node.attrs.height);
  const align = imageAlignAttr(node.attrs.align);

  useEffect(() => {
    const img = imgRef.current;
    if (!img?.naturalWidth || !img.naturalHeight) return;
    setNaturalRatio(img.naturalHeight / img.naturalWidth);
  }, [src]);

  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = event.clientX;
    const startWidth = rect.width;
    const ratio = rect.height > 0 && rect.width > 0 ? rect.height / rect.width : naturalRatio;

    const onMove = (moveEvent: PointerEvent) => {
      const nextWidth = clamp(startWidth + moveEvent.clientX - startX, MIN_IMAGE_WIDTH, MAX_IMAGE_WIDTH);
      updateAttributes({
        width: Math.round(nextWidth),
        height: Math.round(nextWidth * ratio),
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
  };

  return (
    <NodeViewWrapper
      as="div"
      className={[
        'doc-image-node',
        selected ? 'doc-image-node-selected' : '',
      ].filter(Boolean).join(' ')}
      style={imageWrapperStyle(align)}
    >
      <img
        ref={imgRef}
        src={src}
        alt={String(node.attrs.alt ?? '')}
        title={String(node.attrs.title ?? '')}
        width={width ?? undefined}
        height={height ?? undefined}
        style={{
          width: width ? `${width}px` : undefined,
          height: height ? `${height}px` : undefined,
        }}
        onLoad={(event) => {
          const image = event.currentTarget;
          if (image.naturalWidth && image.naturalHeight) {
            setNaturalRatio(image.naturalHeight / image.naturalWidth);
          }
        }}
        draggable={false}
      />
      {selected && (
        <button
          type="button"
          className="doc-image-resize-handle"
          aria-label="이미지 크기 조절"
          onPointerDown={startResize}
        />
      )}
    </NodeViewWrapper>
  );
}

function imageAlignAttr(value: unknown): 'left' | 'center' | 'right' | null {
  if (value === 'left' || value === 'center' || value === 'right') return value;
  if (value === 'justify') return 'center';
  return null;
}

function imageWrapAttr(value: unknown): 'square' | 'tight' | 'topAndBottom' | 'none' | null {
  if (value === 'square' || value === 'tight' || value === 'topAndBottom' || value === 'none') return value;
  return null;
}

function imageWrapSideAttr(value: unknown): 'bothSides' | 'left' | 'right' | 'largest' | null {
  if (value === 'bothSides' || value === 'left' || value === 'right' || value === 'largest') return value;
  return null;
}

function imageWrapperStyle(align: 'left' | 'center' | 'right' | null) {
  if (align === 'center') return { textAlign: 'center' as const };
  if (align === 'right') return { textAlign: 'right' as const };
  return { textAlign: 'left' as const };
}

function numericAttr(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)(?:px)?$/);
  if (!match) return null;
  const numeric = Number(match[1]);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
