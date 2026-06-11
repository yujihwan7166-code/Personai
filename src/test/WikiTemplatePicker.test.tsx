import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WikiTemplatePicker } from '@/components/wiki/WikiTemplatePicker';
import { WIKI_TEMPLATES } from '@/lib/wikiTemplates';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('WikiTemplatePicker', () => {
  it('shows templates as a compact stable palette instead of clipped cards', () => {
    const { container } = render(
      <WikiTemplatePicker open onClose={vi.fn()} onPick={vi.fn()} />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.className).toContain('max-h-[84vh]');
    expect(dialog.className).toContain('flex-col');

    const grid = container.querySelector('.lg\\:grid-cols-3');
    expect(grid).toBeInTheDocument();
    expect(grid?.className).toContain('flex-1');
    expect(grid?.className).toContain('overflow-y-auto');
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveFocus();

    const templateCards = screen.getAllByRole('radio');
    expect(templateCards).toHaveLength(WIKI_TEMPLATES.length);
    const mainTemplate = WIKI_TEMPLATES.find((template) => template.id === 'moc') ?? WIKI_TEMPLATES[0];
    expect(screen.getByRole('radio', { name: new RegExp(escapeRegExp(mainTemplate.label)) })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: new RegExp(escapeRegExp(WIKI_TEMPLATES.find((template) => template.id === 'reading')?.label ?? '')) })).toHaveAttribute('aria-checked', 'false');
    expect(templateCards.every((card) => card.className.includes('h-[122px]'))).toBe(true);
    expect(container.querySelectorAll('[role="radio"] svg').length).toBeGreaterThanOrEqual(WIKI_TEMPLATES.length);
    expect(container.querySelectorAll('[role="radio"] p.line-clamp-2')).toHaveLength(WIKI_TEMPLATES.length);
    expect(screen.getByText('메인')).toBeInTheDocument();
    expect(screen.getByText('출처')).toBeInTheDocument();
    WIKI_TEMPLATES.forEach((template) => {
      expect(screen.queryByText(template.emoji)).not.toBeInTheDocument();
    });

    expect(screen.queryByText('아이디어')).not.toBeInTheDocument();
    expect(screen.queryByText('회고')).not.toBeInTheDocument();
    expect(screen.queryByText('실행')).not.toBeInTheDocument();
    expect(screen.queryByText('다이어그램')).not.toBeInTheDocument();
  });

  it('creates the picked template with the typed title', () => {
    const onPick = vi.fn();
    render(<WikiTemplatePicker open onClose={vi.fn()} onPick={onPick} />);
    const readingTemplate = WIKI_TEMPLATES.find((template) => template.id === 'reading') ?? WIKI_TEMPLATES[0];

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '러닝 기록' } });
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(escapeRegExp(readingTemplate.label)) }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(escapeRegExp(readingTemplate.label)) }));

    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({
      title: '러닝 기록',
      type: 'source',
    }));
  });

  it('moves template selection with keyboard arrows', async () => {
    render(<WikiTemplatePicker open onClose={vi.fn()} onPick={vi.fn()} />);
    const mainTemplate = WIKI_TEMPLATES.find((template) => template.id === 'moc') ?? WIKI_TEMPLATES[0];
    const blankTemplate = WIKI_TEMPLATES.find((template) => template.id === 'blank') ?? WIKI_TEMPLATES[1];

    fireEvent.keyDown(screen.getByRole('radio', { name: new RegExp(escapeRegExp(mainTemplate.label)) }), {
      key: 'ArrowRight',
    });

    const nextTemplate = screen.getByRole('radio', { name: new RegExp(escapeRegExp(blankTemplate.label)) });
    expect(nextTemplate).toHaveAttribute('aria-checked', 'true');
    await waitFor(() => expect(nextTemplate).toHaveFocus());
  });

  it('keeps template card Enter as selection-only instead of creating immediately', () => {
    const onPick = vi.fn();
    render(<WikiTemplatePicker open onClose={vi.fn()} onPick={onPick} />);
    const readingTemplate = WIKI_TEMPLATES.find((template) => template.id === 'reading') ?? WIKI_TEMPLATES[0];

    fireEvent.keyDown(screen.getByRole('radio', { name: new RegExp(escapeRegExp(readingTemplate.label)) }), {
      key: 'Enter',
    });

    expect(onPick).not.toHaveBeenCalled();
  });

  it('closes with Escape', () => {
    const onClose = vi.fn();
    render(<WikiTemplatePicker open onClose={onClose} onPick={vi.fn()} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
