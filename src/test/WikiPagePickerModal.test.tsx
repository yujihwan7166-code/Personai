import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { WikiPagePickerModal } from '@/components/wiki/WikiPagePickerModal';
import type { WikiPage } from '@/types/wiki';

const page = (overrides: Partial<WikiPage> = {}): WikiPage => ({
  id: 'wiki-page-1',
  title: '러닝 노트',
  aliases: ['달리기'],
  type: 'concept',
  status: 'active',
  tags: ['운동'],
  body: '러닝 기록',
  refersTo: [],
  cites: [],
  inherits: [],
  similarTo: [],
  parentMocs: [],
  createdAt: 1,
  updatedAt: 2,
  ...overrides,
});

const renderPicker = (props: Partial<ComponentProps<typeof WikiPagePickerModal>> = {}) => {
  const pages = props.pages ?? [
    page(),
    page({ id: 'wiki-page-2', title: '운동 루틴', aliases: [], tags: ['습관'], updatedAt: 1 }),
  ];

  return render(
    <WikiPagePickerModal
      open
      pages={pages}
      onPick={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />,
  );
};

describe('WikiPagePickerModal', () => {
  it('labels search results and url actions by the target being connected', () => {
    const onPick = vi.fn();
    const onPickUrl = vi.fn();

    renderPicker({ onPick, onPickUrl });

    const dialog = screen.getByRole('dialog', { name: '문서 또는 링크 연결' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('기존 문서를 검색하거나 새 문서를 만들어 현재 글에 연결합니다.');
    expect(screen.getByRole('tablist', { name: '연결 방식' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '문서 찾기' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('combobox', { name: '연결할 문서 이름이나 URL' })).toHaveFocus();

    fireEvent.change(screen.getByRole('combobox', { name: '연결할 문서 이름이나 URL' }), {
      target: { value: '러닝' },
    });
    fireEvent.click(screen.getByRole('option', { name: /러닝 노트 문서 연결/ }));

    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ title: '러닝 노트' }));

    fireEvent.change(screen.getByRole('combobox', { name: '연결할 문서 이름이나 URL' }), {
      target: { value: 'example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'example.com 웹 링크로 연결' }));

    expect(onPickUrl).toHaveBeenCalledWith('example.com');
  });

  it('labels new page creation by the title that will be linked', async () => {
    const onPick = vi.fn();
    const created = page({ id: 'wiki-page-new', title: '새 연결 문서', aliases: [], tags: [] });
    const onCreateAndLink = vi.fn().mockResolvedValue(created);

    renderPicker({ onPick, onCreateAndLink });

    fireEvent.click(screen.getByRole('tab', { name: '새 문서' }));
    expect(screen.getByRole('tab', { name: '새 문서' })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: '새 연결 문서 제목' })).toHaveFocus();
    });

    fireEvent.change(screen.getByRole('textbox', { name: '새 연결 문서 제목' }), {
      target: { value: '새 연결 문서' },
    });
    fireEvent.click(screen.getByRole('button', { name: '새 연결 문서 새 문서로 만들고 연결' }));

    await waitFor(() => {
      expect(onCreateAndLink).toHaveBeenCalledWith('새 연결 문서', 'concept');
    });
    expect(onPick).toHaveBeenCalledWith(created);
  });

  it('does not close while dragging from the picker body onto the backdrop', () => {
    const onClose = vi.fn();
    renderPicker({ onClose });

    const dialog = screen.getByRole('dialog', { name: '문서 또는 링크 연결' });
    const input = screen.getByRole('combobox', { name: '연결할 문서 이름이나 URL' });

    fireEvent.pointerDown(input);
    fireEvent.pointerUp(dialog);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.pointerDown(dialog);
    fireEvent.pointerUp(input);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.pointerDown(dialog);
    fireEvent.pointerUp(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('connects search input to the active result option', () => {
    renderPicker();

    const input = screen.getByRole('combobox', { name: '연결할 문서 이름이나 URL' });
    fireEvent.change(input, { target: { value: '운동' } });

    const listbox = screen.getByRole('listbox', { name: '문서 검색 결과' });
    const options = within(listbox).getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', options[1].id);
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
  });
});
