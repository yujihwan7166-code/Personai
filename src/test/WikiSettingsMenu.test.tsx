import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WikiSettingsMenu } from '@/components/wiki/WikiSettingsMenu';

vi.mock('@/lib/wikiBackup', () => ({
  exportAllAsJson: vi.fn(),
  importFromJson: vi.fn(),
}));

vi.mock('@/lib/wikiExport', () => ({
  exportAllAsMarkdownZip: vi.fn(),
}));

vi.mock('@/lib/wikiMarkdownImport', () => ({
  importMarkdownFiles: vi.fn(),
}));

vi.mock('@/lib/wikiStore', () => ({
  clearAllPages: vi.fn(),
}));

vi.mock('@/lib/notify', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('WikiSettingsMenu', () => {
  it('announces menu state and restores focus when closed with Escape', async () => {
    render(<WikiSettingsMenu onMutated={vi.fn()} onOpenStorage={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: '위키 설정' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = await screen.findByRole('menu', { name: '위키 설정' });
    expect(menu).toHaveAttribute('id', trigger.getAttribute('aria-controls'));
    expect(screen.getByRole('menuitem', { name: '전체 백업 (.json)' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Markdown/ZIP 가져오기' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('menu', { name: '위키 설정' })).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps hidden import inputs labelled and closes after storage action', async () => {
    const onOpenStorage = vi.fn();
    const { container } = render(<WikiSettingsMenu onMutated={vi.fn()} onOpenStorage={onOpenStorage} />);

    expect(container.querySelector('input[aria-label="위키 JSON 백업 파일 선택"]')).toBeInTheDocument();
    expect(container.querySelector('input[aria-label="Markdown 또는 ZIP 파일 선택"]')).toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: '위키 설정' });
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('menuitem', { name: '저장소 사용량' }));

    expect(onOpenStorage).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu', { name: '위키 설정' })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens destructive confirmation as a real modal with keyboard cancel', async () => {
    render(<WikiSettingsMenu onMutated={vi.fn()} onOpenStorage={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: '위키 설정' });
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('menuitem', { name: '전체 삭제' }));

    const dialog = await screen.findByRole('dialog', { name: '전체 위키를 삭제할까요?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('모든 문서가 삭제됩니다. 백업 파일 없이 진행하면 복구할 수 없어요.');
    expect(screen.getByRole('button', { name: '취소' })).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '전체 위키를 삭제할까요?' })).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('keeps destructive confirmation open when pointer starts inside and ends on the backdrop', async () => {
    render(<WikiSettingsMenu onMutated={vi.fn()} onOpenStorage={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: '위키 설정' });
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('menuitem', { name: '전체 삭제' }));

    const dialog = await screen.findByRole('dialog', { name: '전체 위키를 삭제할까요?' });
    const cancel = screen.getByRole('button', { name: '취소' });

    fireEvent.pointerDown(cancel);
    fireEvent.pointerUp(dialog);
    expect(screen.getByRole('dialog', { name: '전체 위키를 삭제할까요?' })).toBeInTheDocument();

    fireEvent.pointerDown(dialog);
    fireEvent.pointerUp(cancel);
    expect(screen.getByRole('dialog', { name: '전체 위키를 삭제할까요?' })).toBeInTheDocument();

    fireEvent.pointerDown(dialog);
    fireEvent.pointerUp(dialog);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '전체 위키를 삭제할까요?' })).not.toBeInTheDocument());
  });

  it('opens JSON import choice as a modal and returns focus on cancel', async () => {
    const { container } = render(<WikiSettingsMenu onMutated={vi.fn()} onOpenStorage={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: '위키 설정' });
    trigger.focus();
    const input = container.querySelector<HTMLInputElement>('input[aria-label="위키 JSON 백업 파일 선택"]');
    expect(input).toBeInTheDocument();

    const file = new File(['{"pages":[]}'], 'wiki-backup.json', { type: 'application/json' });
    fireEvent.change(input!, { target: { files: [file] } });

    const dialog = await screen.findByRole('dialog', { name: '백업 가져오기 방식 선택' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription(
      'wiki-backup.json 파일을 가져옵니다. 기존 위키를 유지하려면 병합을 선택하세요. 덮어쓰기는 현재 문서와 히스토리를 지운 뒤 백업 내용으로 교체합니다.',
    );
    expect(screen.getByRole('button', { name: /병합/ })).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '백업 가져오기 방식 선택' })).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
