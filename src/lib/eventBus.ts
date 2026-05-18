/**
 * 강타입 CustomEvent 버스 — RAIL_EVENT / PLANNER_TASK_CHANGED 등의 패턴 통합.
 *
 * window.dispatchEvent(new CustomEvent('name', { detail })) +
 * addEventListener('name', e => e.detail) 패턴이 약타입.
 *
 * 사용:
 *   const taskBus = createEventBus<PlannerTask>('planner:task-changed');
 *   taskBus.emit(task);
 *   useEffect(() => taskBus.on((task) => …), []);
 */

export interface EventBus<T> {
  /** 이벤트 발행. detail 에 페이로드. */
  emit(payload: T): void;
  /** 리스너 등록 — unsubscribe 함수 반환 (useEffect cleanup 호환). */
  on(listener: (payload: T) => void): () => void;
  /** 1회만 받고 자동 해제. */
  once(listener: (payload: T) => void): () => void;
  /** 이벤트 이름 (디버깅용). */
  readonly name: string;
}

/** name 기반 강타입 버스. payload 타입은 caller 가 지정. */
export function createEventBus<T = void>(name: string): EventBus<T> {
  const emit = (payload: T): void => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<T>(name, { detail: payload }));
  };
  const on = (listener: (payload: T) => void): (() => void) => {
    if (typeof window === 'undefined') return () => undefined;
    const handler = (e: Event) => {
      listener((e as CustomEvent<T>).detail);
    };
    window.addEventListener(name, handler);
    return () => window.removeEventListener(name, handler);
  };
  const once = (listener: (payload: T) => void): (() => void) => {
    const unsub = on((p) => {
      unsub();
      listener(p);
    });
    return unsub;
  };
  return { emit, on, once, name };
}
