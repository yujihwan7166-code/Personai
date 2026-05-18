import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Avatar } from '@/components/shared/Avatar';

describe('Avatar', () => {
  it('src 있으면 img', () => {
    render(<Avatar src="https://example.com/x.png" name="홍길동" />);
    expect(document.querySelector('img')).toBeTruthy();
  });
  it('src 없으면 initials', () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText('JD')).toBeTruthy();
  });
  it('단일 단어 → 앞 2글자', () => {
    render(<Avatar name="홍길동" />);
    expect(screen.getByText('홍길')).toBeTruthy();
  });
  it('빈 이름 → ?', () => {
    render(<Avatar name="  " />);
    expect(screen.getByText('?')).toBeTruthy();
  });
  it('img error → initials fallback', () => {
    render(<Avatar src="broken.png" name="Foo Bar" />);
    const img = document.querySelector('img')!;
    fireEvent.error(img);
    expect(screen.getByText('FB')).toBeTruthy();
  });
});
