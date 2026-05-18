import { describe, it, expect, beforeEach } from 'vitest';
import { pomodoroStore } from '@/services/planner/pomodoroStore';

describe('pomodoroStore', () => {
  beforeEach(() => { window.localStorage.clear(); });

  it('start → current 반환', () => {
    const s = pomodoroStore.start({ durationMin: 25 });
    expect(s.phase).toBe('work');
    expect(pomodoroStore.current()?.id).toBe(s.id);
  });

  it('stop → current null', () => {
    pomodoroStore.start({ durationMin: 25 });
    pomodoroStore.stop();
    expect(pomodoroStore.current()).toBeNull();
  });

  it('start 옵션 — phase / taskTitle', () => {
    const s = pomodoroStore.start({ durationMin: 5, phase: 'short-break', taskTitle: '쉬는 시간' });
    expect(s.phase).toBe('short-break');
    expect(s.taskTitle).toBe('쉬는 시간');
  });

  it('nextPhaseAfterWork — 4세션 후 long break', () => {
    // 기본 cfg setsBeforeLong = 4 가정
    const r = pomodoroStore.nextPhaseAfterWork(3);
    expect(r.setIndex).toBe(4);
    expect(r.phase).toBe('long-break');
  });

  it('nextPhaseAfterWork — 일반 셋트 후 short break', () => {
    const r = pomodoroStore.nextPhaseAfterWork(0);
    expect(r.setIndex).toBe(1);
    expect(r.phase).toBe('short-break');
  });

  it('togglePause — 일시정지 / 재개', () => {
    pomodoroStore.start({ durationMin: 25 });
    pomodoroStore.togglePause(); // 일시정지
    expect(pomodoroStore.current()?.pausedAt).toBeTruthy();
    pomodoroStore.togglePause(); // 재개
    expect(pomodoroStore.current()?.pausedAt).toBeUndefined();
    expect(pomodoroStore.current()?.pausedMs).toBeGreaterThanOrEqual(0);
  });
});
