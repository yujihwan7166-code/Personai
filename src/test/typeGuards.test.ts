import { describe, it, expect } from 'vitest';
import {
  isString, isNumber, isBoolean, isArray, isNonEmptyArray,
  isPlainObject, isDefined, isNonEmpty, notNull,
} from '@/lib/typeGuards';

describe('isString / isNumber / isBoolean', () => {
  it('타입별 true/false', () => {
    expect(isString('hi')).toBe(true);
    expect(isString(42)).toBe(false);
    expect(isNumber(42)).toBe(true);
    expect(isNumber(NaN)).toBe(false);
    expect(isNumber(Infinity)).toBe(false);
    expect(isBoolean(true)).toBe(true);
    expect(isBoolean(1)).toBe(false);
  });
});

describe('isArray / isNonEmptyArray', () => {
  it('빈 vs 비빈', () => {
    expect(isArray([])).toBe(true);
    expect(isNonEmptyArray([])).toBe(false);
    expect(isNonEmptyArray([1])).toBe(true);
    expect(isArray('not')).toBe(false);
  });
});

describe('isPlainObject', () => {
  it('객체만 true', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject('s')).toBe(false);
  });
});

describe('isDefined / isNonEmpty / notNull', () => {
  it('isDefined — null/undef false', () => {
    expect(isDefined(0)).toBe(true);
    expect(isDefined('')).toBe(true);
    expect(isDefined(null)).toBe(false);
    expect(isDefined(undefined)).toBe(false);
  });
  it('isNonEmpty — 빈 문자열 false', () => {
    expect(isNonEmpty('hi')).toBe(true);
    expect(isNonEmpty('')).toBe(false);
    expect(isNonEmpty(null)).toBe(false);
  });
  it('notNull — Array.filter 와 함께', () => {
    const arr: (number | null | undefined)[] = [1, null, 2, undefined, 3];
    expect(arr.filter(notNull)).toEqual([1, 2, 3]);
  });
});
