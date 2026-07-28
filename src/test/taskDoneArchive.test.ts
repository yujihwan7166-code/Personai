/**
 * 끝낸 할 일이 대기함에 영영 쌓이지 않게 하는 규칙.
 *
 * 오늘 끝낸 것 → 대기함에 그대로 (무엇을 했는지 보이고, 잘못 체크했으면 되돌린다)
 * 그 전에 끝낸 것 → 끝낸 일 서랍으로 (지워지는 게 아니라 옮겨진다)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { taskStore } from '@/services/planner/taskStore';

beforeEach(() => { localStorage.clear(); });

describe('끝낸 할 일 보관', () => {
  it('완료를 켜면 끝낸 시각이 적히고, 취소하면 지워진다', () => {
    const t = taskStore.add({ title: '설거지' });
    expect(taskStore.list().find((x) => x.id === t.id)?.doneAt).toBeUndefined();

    taskStore.toggleDone(t.id);
    const done = taskStore.list().find((x) => x.id === t.id)!;
    expect(done.done).toBe(true);
    expect(done.doneAt).toBeTruthy();

    taskStore.toggleDone(t.id);
    const back = taskStore.list().find((x) => x.id === t.id)!;
    expect(back.done).toBe(false);
    expect(back.doneAt).toBeUndefined();
  });

  it('오늘 끝낸 것은 서랍으로 넘어가지 않는다', () => {
    const t = taskStore.add({ title: '오늘 한 일' });
    taskStore.toggleDone(t.id);
    expect(taskStore.listDoneArchive().map((x) => x.id)).not.toContain(t.id);
    expect(taskStore.listInbox().map((x) => x.id)).toContain(t.id);
  });

  it('어제 끝낸 것은 서랍으로 넘어간다', () => {
    const t = taskStore.add({ title: '어제 한 일' });
    taskStore.toggleDone(t.id);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    taskStore.update(t.id, { doneAt: yesterday.toISOString() });

    expect(taskStore.listDoneArchive().map((x) => x.id)).toContain(t.id);
  });

  it('끝낸 시각이 없는 옛 항목은 오래 전으로 본다', () => {
    const t = taskStore.add({ title: '언젠가 끝낸 일', done: true });
    expect(taskStore.list().find((x) => x.id === t.id)?.doneAt).toBeUndefined();
    expect(taskStore.listDoneArchive().map((x) => x.id)).toContain(t.id);
  });

  it('안 끝낸 일은 서랍에 들어가지 않는다', () => {
    const t = taskStore.add({ title: '남은 일' });
    expect(taskStore.listDoneArchive().map((x) => x.id)).not.toContain(t.id);
  });
});
