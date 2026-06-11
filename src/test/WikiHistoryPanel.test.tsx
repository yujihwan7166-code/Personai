import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WikiHistoryPanel } from '@/components/wiki/WikiHistoryPanel';
import { listRevisions, type Revision } from '@/lib/wikiHistory';
import type { WikiPage } from '@/types/wiki';

vi.mock('@/lib/wikiHistory', () => ({
  listRevisions: vi.fn(),
}));

const page = (overrides: Partial<WikiPage> = {}): WikiPage => ({
  id: 'wiki-page-1',
  title: '러닝',
  aliases: [],
  type: 'concept',
  status: 'active',
  tags: ['운동'],
  body: '현재 본문',
  refersTo: [],
  cites: [],
  inherits: [],
  similarTo: [],
  parentMocs: [],
  createdAt: new Date(2026, 0, 1, 8, 0).getTime(),
  updatedAt: new Date(2026, 0, 20, 10, 15).getTime(),
  ...overrides,
});

const revision = (overrides: Partial<Revision> = {}): Revision => {
  const snapshot = page({
    title: '러닝 초안',
    body: '이전 본문',
    updatedAt: new Date(2026, 0, 15, 9, 30).getTime(),
  });

  return {
    id: 'rev-1',
    pageId: snapshot.id,
    snapshot,
    takenAt: snapshot.updatedAt,
    ...overrides,
  };
};

describe('WikiHistoryPanel', () => {
  beforeEach(() => {
    vi.mocked(listRevisions).mockResolvedValue([revision()]);
  });

  it('labels version selection and restore confirmation clearly', async () => {
    const onClose = vi.fn();
    const onRestore = vi.fn();

    render(
      <WikiHistoryPanel
        open
        page={page()}
        onClose={onClose}
        onRestore={onRestore}
      />,
    );

    const historyDialog = screen.getByRole('dialog', { name: /버전 히스토리/ });
    expect(historyDialog).toHaveAttribute('aria-modal', 'true');
    expect(historyDialog).toHaveAccessibleDescription('이전 버전을 확인하고 필요한 경우 선택한 버전으로 복원할 수 있습니다.');
    expect(screen.getByRole('button', { name: '버전 히스토리 닫기' })).toHaveFocus();

    const versionList = await screen.findByRole('list', { name: '버전 목록' });
    const currentVersion = within(versionList).getByRole('button', { name: '러닝 현재 버전 보기' });
    const previousVersion = within(versionList).getByRole('button', {
      name: '러닝 초안 1/15 09:30 버전 보기',
    });

    expect(currentVersion).toHaveAttribute('aria-pressed', 'true');
    expect(previousVersion).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(previousVersion);

    expect(currentVersion).toHaveAttribute('aria-pressed', 'false');
    expect(previousVersion).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '러닝 초안 1/15 09:30 버전으로 복원' }));

    const confirmDialog = screen.getByRole('alertdialog', {
      name: '1/15 09:30 버전으로 복원할까요?',
    });

    expect(confirmDialog).toHaveAttribute('aria-modal', 'true');
    expect(confirmDialog).toHaveAccessibleDescription('현재 문서는 히스토리에 남고, 화면에는 선택한 버전의 제목과 본문, 태그, 관계 정보가 적용됩니다.');
    expect(within(confirmDialog).getByRole('button', { name: '버전 복원 취소' })).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /버전 히스토리/ })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '러닝 초안 1/15 09:30 버전으로 복원' }));
    const reopenedConfirmDialog = screen.getByRole('alertdialog', {
      name: '1/15 09:30 버전으로 복원할까요?',
    });

    fireEvent.click(within(reopenedConfirmDialog).getByRole('button', {
      name: '1/15 09:30 버전으로 복원 확정',
    }));

    expect(onRestore).toHaveBeenCalledWith(revision().snapshot);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps history open when pointer selection starts inside and ends on the backdrop', async () => {
    const onClose = vi.fn();

    render(
      <WikiHistoryPanel
        open
        page={page()}
        onClose={onClose}
        onRestore={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: /버전 히스토리/ });
    const closeButton = screen.getByRole('button', { name: '버전 히스토리 닫기' });
    await screen.findByRole('list', { name: '버전 목록' });

    fireEvent.pointerDown(closeButton);
    fireEvent.pointerUp(dialog);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.pointerDown(dialog);
    fireEvent.pointerUp(closeButton);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.pointerDown(dialog);
    fireEvent.pointerUp(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
