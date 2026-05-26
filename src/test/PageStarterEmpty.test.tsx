import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PageStarterEmpty } from '@/components/PageStarterEmpty';

describe('PageStarterEmpty', () => {
  it('renders primary, secondary, and starter actions', () => {
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();
    const onStarter = vi.fn();

    render(
      <PageStarterEmpty
        icon={<span aria-hidden>+</span>}
        title="새 작업을 시작하세요"
        description="빈 화면에서 바로 시작할 수 있습니다."
        primaryAction={{ label: '새로 만들기', onClick: onPrimary }}
        secondaryActions={[{ label: '템플릿 사용', onClick: onSecondary }]}
        starters={[{ label: '회의 메모', description: '결정과 할 일', onClick: onStarter }]}
      />,
    );

    expect(screen.getByRole('heading', { name: '새 작업을 시작하세요' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '새로 만들기' }));
    fireEvent.click(screen.getByRole('button', { name: '템플릿 사용' }));
    fireEvent.click(screen.getByRole('button', { name: /회의 메모/ }));

    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
    expect(onStarter).toHaveBeenCalledTimes(1);
  });

  it('labels the starter region and keeps decorative patterns hidden', () => {
    render(
      <PageStarterEmpty
        pattern="lines"
        icon={<span aria-hidden>i</span>}
        title="Start writing"
        description="Capture a small thought before it disappears."
        primaryAction={{ label: 'Write today', onClick: vi.fn() }}
        actionNote={<span>Shortcut N</span>}
        starterLabel="Prompts"
        starters={[{ label: 'One scene', description: 'Hold one moment', onClick: vi.fn() }]}
        footer={<p>Keep it short.</p>}
      />,
    );

    const region = screen.getByRole('region', { name: 'Start writing' });
    expect(region).toBeInTheDocument();
    expect(region.firstElementChild?.nextElementSibling).toHaveClass('pb-[calc(5rem+env(safe-area-inset-bottom))]');
    expect(screen.getByText('Shortcut N')).toBeInTheDocument();
    expect(screen.getByText('Keep it short.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /One scene/ })).toHaveAttribute(
      'title',
      'One scene - Hold one moment',
    );

    const decorativePattern = region.querySelector('[aria-hidden="true"]');
    expect(decorativePattern).toBeInTheDocument();
  });
});
