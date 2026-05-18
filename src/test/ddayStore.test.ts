import { describe, it, expect, beforeEach } from 'vitest';
import { ddayStore } from '@/services/planner/ddayStore';

describe('ddayStore', () => {
  beforeEach(() => { window.localStorage.clear(); });

  it('add + list', () => {
    const d = ddayStore.add({ label: '시험', dateIso: '2026-06-15' });
    expect(d.id).toBeTruthy();
    expect(d.label).toBe('시험');
    expect(ddayStore.list()).toHaveLength(1);
  });

  it('update — 부분 patch', () => {
    const d = ddayStore.add({ label: '여행', dateIso: '2026-07-01' });
    ddayStore.update(d.id, { label: '제주 여행' });
    expect(ddayStore.list()[0].label).toBe('제주 여행');
  });

  it('remove', () => {
    const d = ddayStore.add({ label: 'x', dateIso: '2026-07-01' });
    ddayStore.remove(d.id);
    expect(ddayStore.list()).toHaveLength(0);
  });

  it('clear — 모두 삭제', () => {
    ddayStore.add({ label: 'a', dateIso: '2026-07-01' });
    ddayStore.add({ label: 'b', dateIso: '2026-08-01' });
    ddayStore.clear();
    expect(ddayStore.list()).toHaveLength(0);
  });
});
