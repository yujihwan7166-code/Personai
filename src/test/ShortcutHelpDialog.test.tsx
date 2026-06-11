import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ShortcutHelpDialog } from '@/components/planner/ShortcutHelpDialog';

describe('ShortcutHelpDialog', () => {
  it('opens as a described shortcut reference dialog', () => {
    render(<ShortcutHelpDialog open onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: '단축키' });
    expect(dialog).toHaveAccessibleDescription(
      '플래너에서 사용할 수 있는 뷰 전환, 시간 이동, 입력, 카드 액션, 자연어 입력 단축키를 확인합니다.',
    );
    expect(screen.getByText('뷰 전환')).toBeInTheDocument();
    expect(screen.getByText('입력 필드 안에서는 단축키가 작동하지 않습니다 (텍스트 입력 우선).')).toBeInTheDocument();
  });
});
