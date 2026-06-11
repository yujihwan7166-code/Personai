import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StreakCard, StreakIndicator } from '@/components/planner/StreakIndicator';

describe('StreakIndicator', () => {
  it('uses Korean-only accessible labels for repeat streaks', () => {
    render(<StreakIndicator current={3} />);

    expect(screen.getByLabelText('3회 연속 완료')).toBeInTheDocument();
    expect(screen.queryByLabelText(/streak/i)).not.toBeInTheDocument();
  });

  it('describes long streaks as records without English jargon', () => {
    render(<StreakIndicator current={7} />);

    expect(screen.getByLabelText('7회 장기 연속 완료')).toHaveAttribute('title', '7회 연속 — 주 단위 기록');
    expect(screen.queryByLabelText(/streak/i)).not.toBeInTheDocument();
  });

  it('uses natural Korean onboarding copy for empty streak cards', () => {
    render(<StreakCard current={0} best={0} rate={0} missed={0} total={0} />);

    expect(screen.getByText('아직 시작 단계예요. 처음 한 번 체크하면 연속 기록이 시작돼요.')).toBeInTheDocument();
    expect(screen.queryByText(/streak/i)).not.toBeInTheDocument();
  });
});
