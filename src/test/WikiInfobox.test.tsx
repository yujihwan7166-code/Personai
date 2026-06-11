import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { WikiInfobox } from '@/components/wiki/WikiInfobox';
import type { WikiPage } from '@/types/wiki';

const page: WikiPage = {
  id: 'w_infobox_test',
  title: 'Kim Mincheol',
  aliases: ['Me', 'Na'],
  type: 'person',
  category: 'profile',
  status: 'active',
  tags: ['atlas', 'profile'],
  body: 'Infobox display test.',
  isMain: true,
  refersTo: [],
  cites: [],
  inherits: [],
  similarTo: [],
  parentMocs: [],
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_100_000,
};

describe('WikiInfobox', () => {
  it('shows the page title directly without a visible redundant document-info heading', () => {
    render(<WikiInfobox page={page} />);

    const infobox = screen.getByLabelText('문서 정보');
    expect(infobox).toHaveTextContent('Kim Mincheol');
    expect(infobox.textContent?.trim().startsWith('문서 정보')).toBe(false);
    expect(infobox).toHaveTextContent('문서 코드');
    expect(infobox).toHaveTextContent('w_infobox_test');
  });
});
