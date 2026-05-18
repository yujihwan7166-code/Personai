import { describe, it, expect, vi } from 'vitest';
import { createEventBus } from '@/lib/eventBus';

describe('createEventBus', () => {
  it('emit → on listener 호출', () => {
    const bus = createEventBus<number>('test:bus');
    const fn = vi.fn();
    const unsub = bus.on(fn);
    bus.emit(42);
    expect(fn).toHaveBeenCalledWith(42);
    unsub();
  });

  it('unsubscribe → 더 이상 호출 X', () => {
    const bus = createEventBus<string>('test:bus2');
    const fn = vi.fn();
    const unsub = bus.on(fn);
    unsub();
    bus.emit('hi');
    expect(fn).not.toHaveBeenCalled();
  });

  it('once — 1회 후 자동 해제', () => {
    const bus = createEventBus<number>('test:once');
    const fn = vi.fn();
    bus.once(fn);
    bus.emit(1);
    bus.emit(2);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it('타입 인자 없는 void 버스', () => {
    const bus = createEventBus('test:void');
    const fn = vi.fn();
    const unsub = bus.on(fn);
    bus.emit();
    expect(fn).toHaveBeenCalled();
    unsub();
  });

  it('name 노출', () => {
    const bus = createEventBus<number>('foo:bar');
    expect(bus.name).toBe('foo:bar');
  });
});
