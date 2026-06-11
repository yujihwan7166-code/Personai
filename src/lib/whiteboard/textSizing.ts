import type { WBElement, WBShapeTextSize, WBStickyTextSize, WBTextSize } from '@/types/whiteboard';

export const WHITEBOARD_SHAPE_TEXT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32] as const satisfies readonly WBShapeTextSize[];
export const WHITEBOARD_STICKY_TEXT_SIZES = [12, 14, 16, 18, 20, 24, 28] as const satisfies readonly WBStickyTextSize[];
export const WHITEBOARD_TEXT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56] as const satisfies readonly WBTextSize[];

const WHITEBOARD_TEXT_SHAPE_TYPES = new Set<WBElement['type']>([
  'rect',
  'ellipse',
  'diamond',
  'triangle',
  'speech',
  'capsule',
  'database',
  'document',
]);

export type WBTextShapeElement = Extract<WBElement, { text?: string }>;

export function isWhiteboardTextShape(element: WBElement): element is WBTextShapeElement {
  return WHITEBOARD_TEXT_SHAPE_TYPES.has(element.type);
}

export function supportsWhiteboardTextSizing(element: WBElement): boolean {
  return element.type === 'sticky' || element.type === 'text' || isWhiteboardTextShape(element);
}

export function getWhiteboardTextSizeOptions(element: WBElement): readonly number[] {
  if (element.type === 'sticky') return WHITEBOARD_STICKY_TEXT_SIZES;
  if (element.type === 'text') return WHITEBOARD_TEXT_SIZES;
  if (isWhiteboardTextShape(element)) return WHITEBOARD_SHAPE_TEXT_SIZES;
  return [];
}

export function getWhiteboardTextSize(element: WBElement): number | null {
  if (element.type === 'sticky' || element.type === 'text') return element.fontSize;
  if (isWhiteboardTextShape(element)) return element.fontSize ?? 16;
  return null;
}

export function coerceWhiteboardTextSize(element: WBElement, requestedSize: number): number | null {
  const options = getWhiteboardTextSizeOptions(element);
  if (options.length === 0 || !Number.isFinite(requestedSize)) return null;
  return options.reduce((nearest, size) => (
    Math.abs(size - requestedSize) < Math.abs(nearest - requestedSize) ? size : nearest
  ), options[0]);
}

export function stepWhiteboardTextSize(element: WBElement, direction: -1 | 1): number | null {
  const options = getWhiteboardTextSizeOptions(element);
  const currentSize = getWhiteboardTextSize(element);
  if (options.length === 0 || currentSize == null) return null;

  if (direction > 0) {
    return options.find((size) => size > currentSize) ?? options[options.length - 1];
  }

  for (let index = options.length - 1; index >= 0; index -= 1) {
    if (options[index] < currentSize) return options[index];
  }
  return options[0];
}

export function withWhiteboardTextSize(element: WBElement, requestedSize: number): WBElement {
  const fontSize = coerceWhiteboardTextSize(element, requestedSize);
  if (fontSize == null) return element;
  return { ...element, fontSize, updatedAt: Date.now() } as WBElement;
}
