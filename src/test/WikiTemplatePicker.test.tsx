import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WikiTemplatePicker } from '@/components/wiki/WikiTemplatePicker';
import { WIKI_TEMPLATES } from '@/lib/wikiTemplates';

describe('WikiTemplatePicker', () => {
  it('shows templates as one compact filtered palette instead of grouped sections', () => {
    const { container } = render(
      <WikiTemplatePicker open onClose={vi.fn()} onPick={vi.fn()} />,
    );

    const dialog = screen.getByRole('dialog', { name: '새 문서 템플릿 선택' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('제목을 입력하고 템플릿을 고른 뒤 만들기를 누르세요.');
    expect(container.querySelector('.wiki-template-dialog')).toBeInTheDocument();

    const grid = container.querySelector('.wiki-template-grid');
    expect(grid).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: '문서 템플릿 목록' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '새 문서 제목' })).toHaveFocus();
    ['전체', '기본', '학습', '기록', '작업'].forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toHaveClass('wiki-template-filter');
    });

    const templateCards = screen.getAllByRole('radio');
    expect(templateCards).toHaveLength(WIKI_TEMPLATES.length);
    const mainTemplate = WIKI_TEMPLATES.find((template) => template.id === 'moc') ?? WIKI_TEMPLATES[0];
    expect(screen.getByRole('radio', { name: `${mainTemplate.label} 템플릿 선택, 선택됨, 추천` })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '독서 노트 템플릿 선택' })).toHaveAttribute('aria-checked', 'false');
    expect(container.querySelectorAll('[role="radio"].wiki-template-card')).toHaveLength(WIKI_TEMPLATES.length);
    expect(container.querySelector('[role="radio"][data-selected="true"]')).toHaveClass('wiki-template-card');
    expect(container.querySelectorAll('[role="radio"] svg').length).toBeGreaterThanOrEqual(WIKI_TEMPLATES.length);
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

    fireEvent.change(screen.getByRole('textbox', { name: '새 문서 제목' }), { target: { value: '러닝 기록' } });
    fireEvent.click(screen.getByRole('radio', { name: '독서 노트 템플릿 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '독서 노트 템플릿으로 문서 만들기' }));

    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({
      title: '러닝 기록',
      type: 'source',
    }));
  });

  it('moves template selection with keyboard arrows', async () => {
    render(<WikiTemplatePicker open onClose={vi.fn()} onPick={vi.fn()} />);

    fireEvent.keyDown(screen.getByRole('radio', { name: '메인 문서 만들기 템플릿 선택, 선택됨, 추천' }), {
      key: 'ArrowRight',
    });

    const nextTemplate = screen.getByRole('radio', { name: '빈 문서 템플릿 선택, 선택됨' });
    expect(nextTemplate).toHaveAttribute('aria-checked', 'true');
    await waitFor(() => expect(nextTemplate).toHaveFocus());
  });

  it('keeps template card Enter as selection-only instead of creating immediately', () => {
    const onPick = vi.fn();
    render(<WikiTemplatePicker open onClose={vi.fn()} onPick={onPick} />);

    fireEvent.keyDown(screen.getByRole('radio', { name: '독서 노트 템플릿 선택' }), {
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
