import { newId } from '@/lib/idGenerator';
import type { Slide, SlideElement } from './types';

export interface SlideElementClipboardPayload {
  elements: SlideElement[];
}

export interface PastedSlideElements {
  elements: SlideElement[];
  selectedIds: string[];
}

function isLocked(el: SlideElement): boolean {
  return !!el.locked;
}

function clampPos(value: number, size: number): number {
  return Math.max(0, Math.min(100 - size, value));
}

export function createSlideElementClipboard(
  slide: Slide,
  selectedIds: Iterable<string>,
  primaryId?: string | null,
): SlideElementClipboardPayload | null {
  const idSet = new Set(selectedIds);
  if (primaryId) idSet.add(primaryId);
  if (idSet.size === 0) return null;

  const elements = slide.elements
    .filter((el) => idSet.has(el.id) && !isLocked(el))
    .map((el) => ({ ...el }));

  return elements.length > 0 ? { elements } : null;
}

export function pasteSlideElementClipboard(
  payload: SlideElementClipboardPayload,
  options?: {
    offsetPct?: number;
    newIdFactory?: (prefix: string) => string;
  },
): PastedSlideElements {
  const offset = options?.offsetPct ?? 2;
  const idFactory = options?.newIdFactory ?? newId;
  const groupMap = new Map<string, string>();

  const elements = payload.elements.map((el) => {
    const nextId = idFactory('el');
    let groupId = el.groupId;
    if (groupId) {
      if (!groupMap.has(groupId)) groupMap.set(groupId, idFactory('g'));
      groupId = groupMap.get(groupId);
    }
    return {
      ...el,
      id: nextId,
      xPct: clampPos(el.xPct + offset, el.wPct),
      yPct: clampPos(el.yPct + offset, el.hPct),
      groupId,
      locked: undefined,
    } as SlideElement;
  });

  return { elements, selectedIds: elements.map((el) => el.id) };
}
