/**
 * 키보드 키 상수 — KeyboardEvent.key 문자열 표준화.
 *
 * if (e.key === 'Escape') 같은 매직 스트링 흩어짐 → 한 곳에 모음.
 * 오타 방지 + IDE 자동완성.
 */

export const KEYS = {
  Enter: 'Enter',
  Escape: 'Escape',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Space: ' ',
  Up: 'ArrowUp',
  Down: 'ArrowDown',
  Left: 'ArrowLeft',
  Right: 'ArrowRight',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Slash: '/',
  QuestionMark: '?',
  F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4',
  F5: 'F5', F6: 'F6', F7: 'F7', F8: 'F8',
  F9: 'F9', F10: 'F10', F11: 'F11', F12: 'F12',
} as const;

export type KeyValue = (typeof KEYS)[keyof typeof KEYS];

/** mod 키 통합 — ⌘ (mac) / Ctrl (other). */
export function isModKey(e: KeyboardEvent | React.KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey;
}

/** 화살표 키 4종. */
export function isArrowKey(key: string): boolean {
  return key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight';
}

/** 영문자 1글자 (조합 키 X). */
export function isLetterKey(key: string): boolean {
  return key.length === 1 && /^[a-zA-Z]$/.test(key);
}

/** 숫자 키 (top row 0~9, NumPad 포함). */
export function isDigitKey(key: string): boolean {
  return key.length === 1 && key >= '0' && key <= '9';
}
