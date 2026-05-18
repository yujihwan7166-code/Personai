/**
 * FIFO Queue — push/shift O(1) (배열 shift 회피).
 *
 * 단순 배열은 shift() 가 O(n). 이중 버퍼로 amortized O(1).
 * 이벤트 큐 / 메시지 버퍼 / undo 스택 base 로 사용.
 */

export class Queue<T> {
  private inbox: T[] = [];
  private outbox: T[] = [];

  /** 끝에 추가 */
  enqueue(item: T): void {
    this.inbox.push(item);
  }

  /** 앞에서 꺼냄. 비면 undefined. */
  dequeue(): T | undefined {
    if (this.outbox.length === 0) {
      while (this.inbox.length > 0) {
        this.outbox.push(this.inbox.pop()!);
      }
    }
    return this.outbox.pop();
  }

  /** 다음 dequeue 대상 (꺼내지 않음) */
  peek(): T | undefined {
    if (this.outbox.length > 0) return this.outbox[this.outbox.length - 1];
    return this.inbox[0];
  }

  get size(): number {
    return this.inbox.length + this.outbox.length;
  }

  get isEmpty(): boolean {
    return this.size === 0;
  }

  clear(): void {
    this.inbox = [];
    this.outbox = [];
  }

  /** 현재 큐를 FIFO 순서 배열로 (디버그/로깅) */
  toArray(): T[] {
    return [...this.outbox.slice().reverse(), ...this.inbox];
  }
}
