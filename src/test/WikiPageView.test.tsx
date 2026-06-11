import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const MOJIBAKE_PATTERN = /[\uf9ce\uc88f\u81fe\u8e42\uc493]/;

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
    expect(within(desktopPanel).getByRole('button', { name: /메인/ })).toBeInTheDocument();
    expect(within(desktopPanel).getByTitle('문서 상태')).toBeInTheDocument();
    expect(within(desktopPanel).getByTitle('문서 분류')).toBeInTheDocument();
    expect(within(desktopPanel).getByTitle('별칭과 태그 편집')).toBeInTheDocument();
    expect(within(desktopPanel).getByTitle('문서 연결 편집')).toBeInTheDocument();
    expect(desktopPanel.querySelectorAll('select')).toHaveLength(1);
    expect(desktopPanel.querySelectorAll('input')).toHaveLength(1);
    expect(desktopPanel.querySelectorAll('button[aria-pressed]')).toHaveLength(2);
    expect(within(desktopPanel).queryByTitle('유형')).not.toBeInTheDocument();
    expect(desktopPanel).not.toHaveTextContent(MOJIBAKE_PATTERN);
    expect(within(desktopPanel).getByTitle('별칭과 태그 편집')).toHaveAttribute('aria-expanded', 'false');
    expect(within(desktopPanel).getByTitle('문서 연결 편집')).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens secondary metadata editors from the compact palette', () => {
    const { container } = renderWikiPageView({ editing: true, page: { ...basePage, aliases: [], tags: [] } });
    const desktopPanel = getDesktopMetaPanel(container);
    const metaButtons = desktopPanel.querySelectorAll('button[aria-pressed]');

    expect(desktopPanel.querySelectorAll('input')).toHaveLength(1);
    fireEvent.click(metaButtons[0]);
    expect(metaButtons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('wiki-meta-find-panel')).toHaveClass('border-t', 'pt-2');
    expect(document.getElementById('wiki-meta-find-panel')?.querySelector('.rounded-lg')).toBeNull();
    expect(within(document.getElementById('wiki-meta-find-panel') as HTMLElement).queryByText('별칭/태그')).not.toBeInTheDocument();
    expect(desktopPanel.querySelectorAll('input').length).toBeGreaterThan(1);

    fireEvent.click(metaButtons[1]);
    expect(metaButtons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(metaButtons[1]).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('wiki-meta-relations-panel')).toHaveClass('border-t', 'pt-2');
    expect(document.getElementById('wiki-meta-relations-panel')?.querySelector('.rounded-lg')).toBeNull();
    expect(within(document.getElementById('wiki-meta-relations-panel') as HTMLElement).queryByText('문서 연결')).not.toBeInTheDocument();
    expect(desktopPanel.querySelectorAll('select').length).toBeGreaterThan(1);
  });

  it('closes an open secondary metadata editor with Escape and restores focus', async () => {
    const { container } = renderWikiPageView({ editing: true, page: { ...basePage, aliases: [], tags: [] } });
    const desktopPanel = getDesktopMetaPanel(container);
    const [findTrigger] = Array.from(desktopPanel.querySelectorAll<HTMLButtonElement>('button[aria-pressed]'));

    fireEvent.click(findTrigger);
    expect(findTrigger).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('wiki-meta-find-panel')).toBeInTheDocument();

    fireEvent.keyDown(desktopPanel, { key: 'Escape' });

    expect(document.getElementById('wiki-meta-find-panel')).not.toBeInTheDocument();
    expect(findTrigger).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(findTrigger).toHaveFocus());
  });
});

describe('WikiPageView download menu', () => {
  it('opens export choices as a named menu and restores focus on Escape', async () => {
    renderWikiPageView();

    const trigger = screen.getByRole('button', { name: '다운로드 메뉴' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu', { name: '다운로드 양식' });
    expect(menu).toHaveAttribute('id', trigger.getAttribute('aria-controls'));
    expect(within(menu).getByRole('menuitem', { name: /Markdown 복사/ })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: /HTML \(.html\)/ })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: /PDF \(인쇄\)/ })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('menu', { name: '다운로드 양식' })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
