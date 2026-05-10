/**
 * 할 일 ↔ 일정 도메인 일관성 규칙 테스트.
 *
 * 한 PlannerTask 타입이 두 도메인을 표현하므로 priority/plannedFor 같은
 * 할 일 전용 필드가 일정으로 새는 패턴을 강제로 막는다.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { displayedPriority, isScheduled, sanitizeForDomain } from '@/lib/planner/taskDomain';
import { taskStore } from '@/services/planner/taskStore';
import type { PlannerTask } from '@/types/planner';

describe('taskDomain helpers', () => {
  describe('isScheduled', () => {
    it('startAt 없으면 false (할 일/인박스)', () => {
      expect(isScheduled({ startAt: undefined })).toBe(false);
      expect(isScheduled({})).toBe(false);
    });
    it('startAt 있으면 true (일정)', () => {
      expect(isScheduled({ startAt: '2026-04-29T14:00:00Z' })).toBe(true);
    });
  });

  describe('displayedPriority', () => {
    it('할 일은 원본 priority 반환', () => {
      expect(displayedPriority({ startAt: undefined, priority: 2 })).toBe(2);
      expect(displayedPriority({ priority: 0 })).toBe(0);
    });
    it('일정은 priority 데이터가 있어도 undefined 반환 (표시 X)', () => {
      expect(displayedPriority({ startAt: '2026-04-29T14:00:00Z', priority: 3 })).toBeUndefined();
    });
  });

  describe('sanitizeForDomain', () => {
    it('startAt 없으면 변형 없음', () => {
      const patch = { title: 'x', priority: 2 as const, plannedFor: '2026-04-29' };
      expect(sanitizeForDomain(patch)).toEqual(patch);
    });
    it('startAt 있으면 priority 와 plannedFor 제거', () => {
      const out = sanitizeForDomain({
        title: 'x',
        startAt: '2026-04-29T14:00:00Z',
        priority: 3,
        plannedFor: '2026-04-29',
      });
      expect(out.priority).toBeUndefined();
      expect(out.plannedFor).toBeUndefined();
      expect(out.startAt).toBe('2026-04-29T14:00:00Z');
    });
    it('한 번 통과 후 재적용은 멱등', () => {
      const once = sanitizeForDomain({ startAt: 'x', priority: 2 as const });
      const twice = sanitizeForDomain(once);
      expect(twice).toEqual(once);
    });
  });
});

describe('taskStore × 도메인 일관성', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('할 일에 priority 설정 → list() 그대로 반환', () => {
    const t = taskStore.add({ title: '보고서', priority: 2 });
    expect(t.priority).toBe(2);
    expect(taskStore.list()[0].priority).toBe(2);
  });

  it('add() 시 startAt 있으면 priority 자동 제거 (일정 생성)', () => {
    const t = taskStore.add({
      title: '회의',
      startAt: '2026-04-29T14:00:00Z',
      endAt: '2026-04-29T15:00:00Z',
      priority: 3,
    });
    expect(t.priority).toBeUndefined();
    expect(t.startAt).toBe('2026-04-29T14:00:00Z');
  });

  it('할 일 → 일정 변환 시 priority 자동 제거 (BUG #1 회귀 방지)', () => {
    const t = taskStore.add({ title: '보고서', priority: 2 });
    expect(t.priority).toBe(2);
    taskStore.update(t.id, {
      startAt: '2026-04-29T14:00:00Z',
      endAt: '2026-04-29T15:00:00Z',
    });
    const after = taskStore.findMaster(t.id);
    expect(after?.startAt).toBe('2026-04-29T14:00:00Z');
    expect(after?.priority).toBeUndefined();
  });

  it('일정 → 할 일 변환 시 priority 다시 설정 가능', () => {
    const t = taskStore.add({
      title: '회의',
      startAt: '2026-04-29T14:00:00Z',
      endAt: '2026-04-29T15:00:00Z',
    });
    taskStore.update(t.id, {
      startAt: undefined,
      endAt: undefined,
      plannedFor: '2026-04-29',
      priority: 2,
    });
    const after = taskStore.findMaster(t.id);
    expect(after?.startAt).toBeUndefined();
    expect(after?.priority).toBe(2);
    expect(after?.plannedFor).toBe('2026-04-29');
  });

  it('레거시 데이터 (startAt + priority 동시 존재) → list() 시 priority 클린업', () => {
    // 과거 버전이 잘못 저장한 데이터 시뮬레이션 — 직접 localStorage 에 주입.
    const stale: PlannerTask = {
      id: 'tsk_legacy',
      title: '과거에 잘못 저장된 항목',
      done: false,
      createdAt: '2026-04-01T00:00:00Z',
      startAt: '2026-04-29T14:00:00Z',
      endAt: '2026-04-29T15:00:00Z',
      priority: 3,
      plannedFor: '2026-04-29', // 잔존
    };
    window.localStorage.setItem('planner.tasks.v1', JSON.stringify([stale]));
    const list = taskStore.list();
    expect(list).toHaveLength(1);
    expect(list[0].priority).toBeUndefined();
    expect(list[0].plannedFor).toBeUndefined();
    expect(list[0].startAt).toBe('2026-04-29T14:00:00Z');
  });
});
