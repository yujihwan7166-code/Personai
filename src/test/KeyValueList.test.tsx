import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KeyValueList } from '@/components/shared/KeyValueList';

describe('KeyValueList', () => {
  it('라벨/값 렌더', () => {
    render(<KeyValueList items={[{label: '이름', value: '홍길동'}, {label:'나이', value: 30}]} />);
    expect(screen.getByText('이름')).toBeTruthy();
    expect(screen.getByText('홍길동')).toBeTruthy();
    expect(screen.getByText('30')).toBeTruthy();
  });
  it('null/undefined 값 → em dash', () => {
    render(<KeyValueList items={[{label:'x', value: null}]} />);
    expect(screen.getByText('—')).toBeTruthy();
  });
  it('빈 배열', () => {
    const { container } = render(<KeyValueList items={[]} />);
    expect(container.querySelector('dl')?.children.length).toBe(0);
  });
});
