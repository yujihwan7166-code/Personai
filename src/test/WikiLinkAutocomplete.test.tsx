import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { describe, expect, it } from 'vitest';

import { WikiLinkAutocomplete } from '@/components/wiki/WikiLinkAutocomplete';
import type { WikiPage } from '@/types/wiki';

const page = (overrides: Partial<WikiPage>): WikiPage => ({
  id: 'wiki-page-1',
  title: '러닝 노트',
  aliases: ['달리기'],
  type: 'concept',
  status: 'active',
  tags: [],
  body: '',
  refersTo: [],
  cites: [],
  inherits: [],
  similarTo: [],
  parentMocs: [],
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

function AutocompleteHarness({
  initialValue = '[[러',
}: {
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    textareaRef.current?.setSelectionRange(value.length, value.length);
  }, [value]);

  return (
    <>
      <textarea
        ref={textareaRef}
        aria-label="본문"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <output aria-label="본문 값">{value}</output>
      <WikiLinkAutocomplete
        pages={[
          page({ id: 'running', title: '러닝 노트', type: 'concept' }),
          page({ id: 'routine', title: '러닝 루틴', type: 'project' }),
          page({ id: 'current', title: '현재 문서', type: 'source' }),
        ]}
        currentId="current"
        textareaRef={textareaRef}
        value={value}
        onChange={setValue}
      />
    </>
  );
}

describe('WikiLinkAutocomplete', () => {
  it('labels link suggestions as selectable options and inserts the clicked page', async () => {
    render(<AutocompleteHarness />);

    const textarea = screen.getByRole('textbox', { name: '본문' });
    const listbox = await screen.findByRole('listbox', { name: '문서 연결 자동완성: 러' });
    expect(listbox).toBeInTheDocument();
    expect(textarea).toHaveAttribute('aria-autocomplete', 'list');
    expect(textarea).toHaveAttribute('aria-expanded', 'true');
    expect(textarea).toHaveAttribute('aria-controls', listbox.id);

    const option = screen.getByRole('option', { name: '러닝 노트 문서 링크 삽입, 개념' });
    expect(textarea).toHaveAttribute('aria-activedescendant', option.id);

    expect(option).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(option);

    expect(screen.getByLabelText('본문 값')).toHaveTextContent('[러닝 노트](##wiki:%EB%9F%AC%EB%8B%9D%20%EB%85%B8%ED%8A%B8)');
  });

  it('updates the selected option with arrow keys and inserts it with Enter', async () => {
    render(<AutocompleteHarness />);

    await screen.findByRole('listbox', { name: '문서 연결 자동완성: 러' });
    const textarea = screen.getByRole('textbox', { name: '본문' });
    const firstOption = screen.getByRole('option', { name: '러닝 노트 문서 링크 삽입, 개념' });
    const secondOption = screen.getByRole('option', { name: '러닝 루틴 문서 링크 삽입, 프로젝트' });

    fireEvent.keyDown(textarea, { key: 'ArrowDown' });

    expect(firstOption).toHaveAttribute('aria-selected', 'false');
    expect(secondOption).toHaveAttribute('aria-selected', 'true');
    expect(textarea).toHaveAttribute('aria-activedescendant', secondOption.id);

    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(screen.getByLabelText('본문 값')).toHaveTextContent('[러닝 루틴](##wiki:%EB%9F%AC%EB%8B%9D%20%EB%A3%A8%ED%8B%B4)');
  });

  it('closes with Escape and clears textarea autocomplete state', async () => {
    render(<AutocompleteHarness />);

    const textarea = screen.getByRole('textbox', { name: '본문' });
    await screen.findByRole('listbox', { name: '문서 연결 자동완성: 러' });

    fireEvent.keyDown(textarea, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(textarea).not.toHaveAttribute('aria-autocomplete');
    expect(textarea).not.toHaveAttribute('aria-expanded');
    expect(textarea).not.toHaveAttribute('aria-controls');
    expect(textarea).not.toHaveAttribute('aria-activedescendant');
  });

  it('keeps the autocomplete open with a clear empty result state', async () => {
    render(<AutocompleteHarness initialValue="[[없는문서" />);

    const listbox = await screen.findByRole('listbox', { name: '문서 연결 자동완성: 없는문서' });
    expect(listbox).toBeInTheDocument();
    expect(within(listbox).getByRole('status')).toHaveTextContent('일치하는 문서가 없어요.');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
});
