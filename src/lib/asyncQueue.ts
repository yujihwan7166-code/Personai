/**
 * 일반 비동기 동시성 큐 (concurrency limit).
 *
 * aiCellEval 의 큐와 동일 패턴이지만 도메인 독립. 이미지 변환·OCR·API 다중
 * 호출 등 어디서든 재사용. await all 도 지원.
 *
 * 사용:
 *   const q = createAsyncQueue(3);  // max 3 동시
 *   const r = await q.enqueue(() => fetch('/api/x'));
 *   await q.drain();                // 모든 작업 완료 대기
 */

export interface AsyncQueue {
  /** 작업 enqueue. Promise 반환 — 실행 완료/실패 추적. */
  enqueue<T>(fn: () => Promise<T>): Promise<T>;
  /** 큐 + 진행 중 작업 모두 끝날 때까지 대기. */
  drain(): Promise<void>;
  /** 현재 큐 + 진행 중 합계. */
  size(): number;
}

export function createAsyncQueue(maxConcurrent = 3): AsyncQueue {
  const queue: Array<{ fn: () => Promise<unknown>; resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];
  let inflight = 0;
  const waiters: Array<() => void> = [];

  const notifyDrain = () => {
    if (inflight === 0 && queue.length === 0) {
      while (waiters.length > 0) {
        const w = waiters.shift();
        w?.();
      }
    }
  };

  const pump = () => {
    while (inflight < maxConcurrent && queue.length > 0) {
      const job = queue.shift()!;
      inflight++;
      Promise.resolve()
        .then(job.fn)
        .then((v) => job.resolve(v))
        .catch((e) => job.reject(e))
        .finally(() => {
          inflight--;
          pump();
          notifyDrain();
        });
    }
  };

  return {
    enqueue<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        queue.push({
          fn: fn as () => Promise<unknown>,
          resolve: resolve as (v: unknown) => void,
          reject,
        });
        pump();
      });
    },
    drain(): Promise<void> {
      if (inflight === 0 && queue.length === 0) return Promise.resolve();
      return new Promise<void>((resolve) => { waiters.push(resolve); });
    },
    size(): number {
      return inflight + queue.length;
    },
  };
}
