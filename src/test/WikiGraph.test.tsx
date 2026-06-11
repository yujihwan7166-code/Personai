import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WikiGraph } from '@/components/wiki/WikiGraph';
import type { WikiPage } from '@/types/wiki';

const page = (overrides: Partial<WikiPage>): WikiPage => ({
  id: 'page-1',
  title: '러닝',
  aliases: [],
  type: 'concept',
  status: 'active',
  tags: [],
  body: '',
  refersTo: [],
  cites: [],
  inherits: [],
  similarTo: [],
  parentMocs: [],
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

describe('WikiGraph', () => {
  it('uses clear Korean labels for graph toolbar controls', () => {
    render(
      <WikiGraph
        pages={[
          page({ id: 'page-1', title: '러닝', tags: ['운동'], refersTo: ['page-2'] }),
          page({ id: 'page-2', title: '호흡', type: 'source', tags: ['운동'] }),
        ]}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '현재 클러스터 배치, 자유 배치로 전환' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '태그 그룹 영역 표시' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '경로 찾기 켜기' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '힘 조절 열기' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '그래프 움직임 일시정지' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '그래프 화면 맞춤' })).toBeInTheDocument();
    expect(screen.getByText('0 = 화면 맞춤 · Space = 정지')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Force/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/fit/i)).not.toBeInTheDocument();
  });

  it('opens the force panel with a natural Korean reset label', () => {
    render(
      <WikiGraph
        pages={[
          page({ id: 'page-1', title: '러닝', tags: ['운동'] }),
          page({ id: 'page-2', title: '호흡', type: 'source', tags: ['운동'] }),
        ]}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '힘 조절 열기' }));

    expect(screen.getByRole('button', { name: '힘 조절 닫기' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '기본값' })).toBeInTheDocument();
  });
});
