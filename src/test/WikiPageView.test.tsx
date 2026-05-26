import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { WikiPageView } from '@/components/wiki/WikiPageView';
import type { WikiPage } from '@/types/wiki';

vi.mock('@/components/wiki/WikiBody', () => ({
  WikiBody: ({ body }: { body: string }) => <div data-testid="wiki-body">{body}</div>,
}));

vi.mock('@/components/wiki/WikiToc', () => ({
  WikiToc: () => <nav data-testid="wiki-toc" />,
}));

vi.mock('@/components/wiki/WikiInfobox', () => ({
  WikiInfobox: () => <aside data-testid="wiki-infobox" />,
}));

vi.mock('@/components/wiki/WikiLocalGraph', () => ({
  WikiLocalGraph: () => <aside data-testid="wiki-local-graph" />,
}));

vi.mock('@/components/wiki/WikiBlockEditor', () => ({
  WikiBlockEditor: ({ body }: { body: string }) => (
    <div data-testid="wiki-block-editor">{body}</div>
  ),
}));

vi.mock('@/components/wiki/WikiHistoryPanel', () => ({
  WikiHistoryPanel: () => <aside data-testid="wiki-history-panel" />,
}));

const basePage: WikiPage = {
  id: 'wiki-page-1',
  title: '인맥',
  aliases: ['관계'],
  type: 'concept',
  category: '사람',
  status: 'active',
  tags: ['relationships'],
  body: '"사람이 가장 큰 자산." -- [[김민철]]',
  isMain: true,
  refersTo: [],
  cites: [],
  inherits: [],
  similarTo: [],
  parentMocs: [],
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_100_000,
};

function renderWikiPageView(overrides: Partial<React.ComponentProps<typeof WikiPageView>> = {}) {
  const page = overrides.page ?? basePage;

  return render(
    <MemoryRouter>
      <WikiPageView
        page={page}
        editing={false}
        backlinks={[]}
        allPages={[page]}
        findByTitle={() => undefined}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
        onChange={vi.fn()}
        onRestore={vi.fn()}
        onArchive={vi.fn()}
        onRestoreArchived={vi.fn()}
        onDelete={vi.fn()}
        onToggleEdit={vi.fn()}
        onOpenLink={vi.fn()}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe('WikiPageView edit metadata panel', () => {
  it('keeps the normal page edit action in read mode', () => {
    renderWikiPageView();

    expect(screen.getByRole('button', { name: '편집' })).toBeInTheDocument();
    expect(screen.queryByText('문서 설정')).not.toBeInTheDocument();
  });

  it('starts edit metadata as a compact settings summary', () => {
    const { container } = renderWikiPageView({ editing: true });
    const panels = container.querySelectorAll('[data-wiki-edit-meta-panel="true"]');
    const desktopPanel = panels[panels.length - 1] as HTMLElement;

    expect(within(desktopPanel).getByText('문서 설정')).toBeInTheDocument();
    expect(within(desktopPanel).getByRole('button', { name: '문서 설정 열기' })).toBeInTheDocument();
    expect(within(desktopPanel).queryByRole('button', { name: '편집' })).not.toBeInTheDocument();
    expect(within(desktopPanel).queryByPlaceholderText('별칭 입력 후 Enter')).not.toBeInTheDocument();
  });

  it('reveals secondary fields only after opening the related group', () => {
    const pageWithoutFindInfo: WikiPage = {
      ...basePage,
      aliases: [],
      tags: [],
    };
    const { container } = renderWikiPageView({ editing: true, page: pageWithoutFindInfo });
    const panels = container.querySelectorAll('[data-wiki-edit-meta-panel="true"]');
    const desktopPanel = panels[panels.length - 1] as HTMLElement;

    fireEvent.click(within(desktopPanel).getByRole('button', { name: '문서 설정 열기' }));

    expect(within(desktopPanel).getByRole('button', { name: '문서 설정 접기' })).toBeInTheDocument();
    expect(within(desktopPanel).queryByPlaceholderText('별칭 입력 후 Enter')).not.toBeInTheDocument();

    fireEvent.click(within(desktopPanel).getByRole('button', { name: /별칭.*태그/ }));

    expect(within(desktopPanel).getByPlaceholderText('별칭 입력 후 Enter')).toBeInTheDocument();
  });
});
