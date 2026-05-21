import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PresentationOverlay } from '@/lib/cloudSlide/PresentationOverlay';
import {
  presentationLinkTarget,
  slideIndexFromInternalHref,
} from '@/lib/cloudSlide/presentationLinks';
import type { Slide } from '@/lib/cloudSlide/types';

afterEach(cleanup);

describe('cloudSlide presentation links', () => {
  it('resolves safe internal and external presentation links', () => {
    expect(slideIndexFromInternalHref('#slide=2', 3)).toBe(1);
    expect(slideIndexFromInternalHref('#slide-3', 3)).toBe(2);
    expect(slideIndexFromInternalHref('slide:1', 3)).toBe(0);
    expect(slideIndexFromInternalHref('#slide=4', 3)).toBeNull();

    expect(presentationLinkTarget('#slide=2', 3)).toEqual({ kind: 'slide', index: 1 });
    expect(presentationLinkTarget('https://example.com/deck', 3)).toEqual({
      kind: 'external',
      href: 'https://example.com/deck',
    });
    expect(presentationLinkTarget('javascript:alert(1)', 3)).toBeNull();
  });

  it('follows internal slide links in presentation mode', () => {
    const onGoToSlide = vi.fn();
    render(
      <PresentationOverlay
        slides={slidesWithLinks}
        idx={0}
        onPrev={() => {}}
        onNext={() => {}}
        onClose={() => {}}
        onGoToSlide={onGoToSlide}
      />,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Go to second slide' }));

    expect(onGoToSlide).toHaveBeenCalledWith(1);
  });

  it('opens safe external links and ignores unsafe links in presentation mode', () => {
    const onOpenHref = vi.fn();
    render(
      <PresentationOverlay
        slides={slidesWithLinks}
        idx={0}
        onPrev={() => {}}
        onNext={() => {}}
        onClose={() => {}}
        onOpenHref={onOpenHref}
      />,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Open docs' }));
    expect(onOpenHref).toHaveBeenCalledWith('https://example.com/docs');
    expect(screen.queryByRole('link', { name: 'Unsafe' })).toBeNull();
  });

  it('follows table cell internal links in presentation mode', () => {
    const onGoToSlide = vi.fn();
    render(
      <PresentationOverlay
        slides={slidesWithLinks}
        idx={0}
        onPrev={() => {}}
        onNext={() => {}}
        onClose={() => {}}
        onGoToSlide={onGoToSlide}
      />,
    );

    fireEvent.click(screen.getByText('Jump cell'));

    expect(onGoToSlide).toHaveBeenCalledWith(1);
  });
});

const slidesWithLinks: Slide[] = [
  {
    id: 's1',
    elements: [
      {
        id: 'text-internal',
        type: 'text',
        content: 'Go to second slide',
        hyperlink: '#slide=2',
        xPct: 5,
        yPct: 5,
        wPct: 30,
        hPct: 10,
        fontSizeRem: 1,
      },
      {
        id: 'text-external',
        type: 'text',
        content: 'Open docs',
        hyperlink: 'https://example.com/docs',
        xPct: 5,
        yPct: 18,
        wPct: 30,
        hPct: 10,
        fontSizeRem: 1,
      },
      {
        id: 'text-unsafe',
        type: 'text',
        content: 'Unsafe',
        hyperlink: 'javascript:alert(1)',
        xPct: 5,
        yPct: 31,
        wPct: 30,
        hPct: 10,
        fontSizeRem: 1,
      },
      {
        id: 'table-link',
        type: 'table',
        xPct: 5,
        yPct: 45,
        wPct: 35,
        hPct: 20,
        rows: [[{ text: 'Jump cell', hyperlink: '#slide=2' }]],
      },
    ],
  },
  {
    id: 's2',
    elements: [],
  },
];
