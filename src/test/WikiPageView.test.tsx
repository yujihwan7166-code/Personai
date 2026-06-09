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
  title: 'Running',
  aliases: ['jogging'],
  type: 'concept',
  category: 'fitness',
  status: 'active',
  tags: ['training'],
  body: 'Running notes with [[Cardio]].',
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

function getDesktopMetaPanel(container: HTMLElement) {
  const panels = container.querySelectorAll('[data-wiki-edit-meta-panel="true"]');
  return panels[panels.length - 1] as HTMLElement;
}

describe('WikiPageView edit metadata panel', () => {
  it('keeps the normal page edit action in read mode', () => {
    renderWikiPageView();

    expect(screen.getByTitle(/E/)).toBeInTheDocument();
    expect(document.querySelector('[data-wiki-edit-meta-panel="true"]')).not.toBeInTheDocument();
  });

  it('shows core metadata as a compact always-visible palette in edit mode', () => {
    const { container } = renderWikiPageView({ editing: true });
    const desktopPanel = getDesktopMetaPanel(container);

    expect(desktopPanel).toBeInTheDocument();
    expect(within(desktopPanel).getByRole('button', { name: /메인|硫붿씤/ })).toBeInTheDocument();
    expect(desktopPanel.querySelectorAll('select')).toHaveLength(1);
    expect(desktopPanel.querySelectorAll('input')).toHaveLength(1);
    expect(desktopPanel.querySelectorAll('button[aria-pressed]')).toHaveLength(2);
    expect(within(desktopPanel).queryByTitle(/유형|좏삎/)).not.toBeInTheDocument();
  });

  it('opens secondary metadata editors from the compact palette', () => {
    const { container } = renderWikiPageView({ editing: true, page: { ...basePage, aliases: [], tags: [] } });
    const desktopPanel = getDesktopMetaPanel(container);
    const metaButtons = desktopPanel.querySelectorAll('button[aria-pressed]');

    expect(desktopPanel.querySelectorAll('input')).toHaveLength(1);
    fireEvent.click(metaButtons[0]);
    expect(desktopPanel.querySelectorAll('input').length).toBeGreaterThan(1);

    fireEvent.click(metaButtons[1]);
    expect(desktopPanel.querySelectorAll('select').length).toBeGreaterThan(1);
  });
});
