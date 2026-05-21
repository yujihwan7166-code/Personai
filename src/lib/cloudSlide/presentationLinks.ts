import { sanitizeHref } from '@/lib/safeUrl';

export type PresentationLinkTarget =
  | { kind: 'slide'; index: number }
  | { kind: 'external'; href: string };

export function slideIndexFromInternalHref(href: string | null | undefined, slideCount: number): number | null {
  const trimmed = href?.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(?:#slide[=-]|slide:)(\d+)$/i);
  const slideNo = Number(match?.[1]);
  if (!Number.isFinite(slideNo)) return null;
  const index = Math.floor(slideNo) - 1;
  return index >= 0 && index < slideCount ? index : null;
}

export function presentationLinkTarget(
  href: string | null | undefined,
  slideCount: number,
): PresentationLinkTarget | null {
  const internalIndex = slideIndexFromInternalHref(href, slideCount);
  if (internalIndex !== null) return { kind: 'slide', index: internalIndex };

  const safeHref = sanitizeHref(href, '');
  if (!safeHref) return null;
  return { kind: 'external', href: safeHref };
}
