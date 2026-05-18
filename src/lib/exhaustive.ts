/**
 * TypeScript exhaustive check — switch / discriminated union 의 모든 case 처리 검증.
 *
 * 사용:
 *   switch (action.type) {
 *     case 'A': ...; break;
 *     case 'B': ...; break;
 *     default: assertNever(action);  // 새 type 추가 시 TS 컴파일 에러
 *   }
 */

/** never 타입 강제 — switch default 에서 미커버 case 잡힘. */
export function assertNever(x: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${JSON.stringify(x)}`);
}

/** 정규표현식용 안전 escape — 사용자 입력을 RegExp 에 넣을 때. */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
