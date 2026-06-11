import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlannerCard } from '@/components/planner/PlannerCard';
import { PRIORITY_COLORS } from '@/types/planner';

describe('PlannerCard', () => {
  it('uses the selected priority color for inbox flags', () => {
    const { container } = render(
      <PlannerCard
        variant="inbox"
        title="일기 쓰기"
        done={false}
        onToggle={vi.fn()}
        priority={2}
      />,
    );

    const flag = container.querySelector('svg');

    expect(flag?.getAttribute('style')).toContain(`fill: ${PRIORITY_COLORS[2]}`);
    expect(flag?.getAttribute('style')).toContain(`stroke: ${PRIORITY_COLORS[2]}`);
  });
});
