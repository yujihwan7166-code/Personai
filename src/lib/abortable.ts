/**
 * Abort-able fetch — AbortController 패턴 통합.
 *
 * useEffect 내부 fetch 의 cleanup 시 자동 abort, 컴포넌트 unmount 시 leak 방지.
 *
 * 사용:
 *   useEffect(() => {
 *     const { promise, abort } = abortableFetch('/api/x');
 *     promise.then(...).catch((e) => { if (e.name !== 'AbortError') ... });
 *     return abort;
 *   }, [...]);
 */

export interface AbortableRequest<T> {
  promise: Promise<T>;
  abort: () => void;
  controller: AbortController;
}

/**
 * fetch + 자동 AbortController. options.signal 무시 (내부 controller 만 사용).
 * 반환된 promise 는 Response 그대로 (caller 가 .json() 등 호출).
 */
export function abortableFetch(input: RequestInfo | URL, init?: RequestInit): AbortableRequest<Response> {
  const controller = new AbortController();
  const promise = fetch(input, { ...init, signal: controller.signal });
  return {
    promise,
    abort: () => controller.abort(),
    controller,
  };
}

/**
 * AbortController 와 함께 임의 async fn 실행. fn 안에서 signal 사용.
 */
export function abortable<T>(
  fn: (signal: AbortSignal) => Promise<T>,
): AbortableRequest<T> {
  const controller = new AbortController();
  const promise = fn(controller.signal);
  return {
    promise,
    abort: () => controller.abort(),
    controller,
  };
}

/** error 가 AbortError 인지. */
export function isAbortError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const obj = e as { name?: unknown };
  return obj.name === 'AbortError';
}
