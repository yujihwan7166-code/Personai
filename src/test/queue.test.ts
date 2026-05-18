import { describe, it, expect } from 'vitest';
import { Queue } from '@/lib/queue';

describe('Queue', () => {
  it('FIFO 순서', () => {
    const q = new Queue<number>();
    q.enqueue(1); q.enqueue(2); q.enqueue(3);
    expect(q.dequeue()).toBe(1);
    expect(q.dequeue()).toBe(2);
    expect(q.dequeue()).toBe(3);
    expect(q.dequeue()).toBeUndefined();
  });

  it('interleave push/pop', () => {
    const q = new Queue<string>();
    q.enqueue('a');
    expect(q.dequeue()).toBe('a');
    q.enqueue('b'); q.enqueue('c');
    expect(q.dequeue()).toBe('b');
    q.enqueue('d');
    expect(q.dequeue()).toBe('c');
    expect(q.dequeue()).toBe('d');
  });

  it('size / isEmpty', () => {
    const q = new Queue<number>();
    expect(q.isEmpty).toBe(true);
    expect(q.size).toBe(0);
    q.enqueue(1);
    expect(q.size).toBe(1);
    expect(q.isEmpty).toBe(false);
  });

  it('peek 는 제거하지 않음', () => {
    const q = new Queue<number>();
    q.enqueue(10); q.enqueue(20);
    expect(q.peek()).toBe(10);
    expect(q.size).toBe(2);
  });

  it('clear', () => {
    const q = new Queue<number>();
    q.enqueue(1); q.enqueue(2);
    q.clear();
    expect(q.isEmpty).toBe(true);
  });

  it('toArray FIFO 순서', () => {
    const q = new Queue<number>();
    q.enqueue(1); q.enqueue(2); q.enqueue(3);
    q.dequeue();
    q.enqueue(4);
    expect(q.toArray()).toEqual([2, 3, 4]);
  });
});
