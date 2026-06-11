import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WikiStoragePanel } from '@/components/wiki/WikiStoragePanel';
import { computeStorageStats, garbageCollectImages } from '@/lib/wikiMaintenance';

vi.mock('@/lib/wikiMaintenance', () => ({
  computeStorageStats: vi.fn(),
  garbageCollectImages: vi.fn(),
  formatBytes: (value: number) => `${value} B`,
}));

const stats = {
  pageCount: 3,
  imageCount: 2,
  imageBytes: 1200,
  revisionCount: 4,
  topImages: [
    { id: 'img_large', type: 'image/png', size: 900, addedAt: 1 },
  ],
  orphanImageCount: 1,
};

describe('WikiStoragePanel', () => {
  it('opens as a labelled modal and announces loading/results', async () => {
    vi.mocked(computeStorageStats).mockResolvedValue(stats);

    render(<WikiStoragePanel open onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: '저장소 사용량' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('위키 문서, 히스토리, 이미지 저장량을 확인하고 참조되지 않는 이미지를 정리할 수 있습니다.');
    expect(screen.getByRole('button', { name: '저장소 사용량 닫기' })).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('집계 중...');

    expect(await screen.findByText('문서')).toBeInTheDocument();
    expect(screen.getByText('img_large')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '참조되지 않는 이미지 1개 정리' })).toBeEnabled();
  });

  it('runs orphan image cleanup after confirmation', async () => {
    vi.mocked(computeStorageStats).mockResolvedValue(stats);
    vi.mocked(garbageCollectImages).mockResolvedValue({ scanned: 2, removed: 1, removedBytes: 900 });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<WikiStoragePanel open onClose={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: '참조되지 않는 이미지 1개 정리' }));

    expect(confirmSpy).toHaveBeenCalledWith('참조 안 된 이미지를 모두 삭제할까요?');
    await waitFor(() => expect(garbageCollectImages).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('status')).toHaveTextContent('1개 이미지 삭제 (900 B 회수)');
  });
});
