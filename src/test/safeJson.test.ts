import { describe, it, expect } from 'vitest';
import { safeJsonParse, safeJsonStringify, isRecord } from '@/lib/safeJson';

describe('safeJsonParse', () => {
  it('정상 JSON', () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
    expect(safeJsonParse('[1,2,3]')).toEqual([1, 2, 3]);
  });
  it('빈/null/undefined → fallback', () => {
    expect(safeJsonParse(null)).toBeUndefined();
    expect(safeJsonParse(undefined)).toBeUndefined();
    expect(safeJsonParse('')).toBeUndefined();
    expect(safeJsonParse(null, 'default')).toBe('default');
  });
  it('잘못된 JSON → fallback', () => {
    expect(safeJsonParse('not json')).toBeUndefined();
    expect(safeJsonParse('{broken', { x: 1 })).toEqual({ x: 1 });
  });
});

describe('safeJsonStringify', () => {
  it('정상', () => {
    expect(safeJsonStringify({ a: 1 })).toBe('{"a":1}');
  });
  it('순환 참조 → fallback', () => {
    const obj: Record<string, unknown> = {};
    obj.self = obj;
    expect(safeJsonStringify(obj)).toBe('');
    expect(safeJsonStringify(obj, '{}')).toBe('{}');
  });
});

describe('isRecord', () => {
  it('객체 true', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });
  it('배열/null/원시 false', () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord('s')).toBe(false);
    expect(isRecord(42)).toBe(false);
  });
});
