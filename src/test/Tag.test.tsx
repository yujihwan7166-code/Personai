import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tag } from '@/components/shared/Tag';

describe('Tag', () => {
  it('label 표시', () => {
    render(<Tag label="중요" />);
    expect(screen.getByText('중요')).toBeTruthy();
  });

  it('onRemove 클릭', () => {
    const onRemove = vi.fn();
    render(<Tag label="x" onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('x 제거'));
    expect(onRemove).toHaveBeenCalled();
  });

  it('onClick → role=button', () => {
    const onClick = vi.fn();
    render(<Tag label="t" onClick={onClick} />);
    const el = screen.getByRole('button', { name: 't' });
    fireEvent.click(el);
    expect(onClick).toHaveBeenCalled();
  });

  it('Enter 키로 활성화', () => {
    const onClick = vi.fn();
    render(<Tag label="t" onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 't' }), { key: 'Enter' });
    expect(onClick).toHaveBeenCalled();
  });

  it('remove 시 onClick 트리거 안 됨 (stopProp)', () => {
    const onClick = vi.fn();
    const onRemove = vi.fn();
    render(<Tag label="x" onClick={onClick} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('x 제거'));
    expect(onRemove).toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
