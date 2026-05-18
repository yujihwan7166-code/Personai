/**
 * Sparkline — SVG 생성 + formula 통합 + 안전 색.
 */
import { describe, it, expect } from 'vitest';
import { buildSparklineSvg, parseOptions, SPARKLINE_SENTINEL } from '@/lib/cloudSheet/sparkline';
import { evalCell } from '@/lib/cloudSheet/formula';

describe('sparkline — SVG 생성', () => {
  it('빈 values → 빈 svg', () => {
    const svg = buildSparklineSvg({ values: [], options: {} });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).not.toContain('<polyline');
  });

  it('line (기본) → polyline', () => {
    const svg = buildSparklineSvg({ values: [1, 2, 3, 2, 4], options: {} });
    expect(svg).toContain('<polyline');
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).toContain('points=');
  });

  it('단일 값 → 점(circle) 표시', () => {
    const svg = buildSparklineSvg({ values: [42], options: {} });
    expect(svg).toContain('<circle');
  });

  it('column → 양수/음수 색 다르게', () => {
    const svg = buildSparklineSvg({
      values: [3, -2, 5, -1],
      options: { charttype: 'column', color: '#22c55e', negcolor: '#ef4444' },
    });
    expect(svg).toContain('<rect');
    expect(svg).toContain('#22c55e');
    expect(svg).toContain('#ef4444');
  });

  it('winloss → +/- 양쪽 + 0 회색', () => {
    const svg = buildSparklineSvg({
      values: [1, -1, 0, 1, -1],
      options: { charttype: 'winloss' },
    });
    expect(svg).toContain('<rect');
    expect(svg).toContain('#9ca3af'); // zero
  });

  it('bar → 첫 값만 가로 막대', () => {
    const svg = buildSparklineSvg({ values: [50, 99], options: { charttype: 'bar' } });
    expect(svg).toContain('<rect');
  });
});

describe('sparkline — 옵션 파싱', () => {
  it('정상 JSON', () => {
    expect(parseOptions('{"charttype":"bar","color":"#000"}'))
      .toEqual({ charttype: 'bar', color: '#000' });
  });

  it('잘못된 JSON → 빈 옵션 (no throw)', () => {
    expect(parseOptions('not json')).toEqual({});
  });

  it('null/undefined → 빈 옵션', () => {
    expect(parseOptions(undefined)).toEqual({});
    expect(parseOptions('null')).toEqual({});
  });
});

describe('sparkline — 안전 색 (XSS 방지)', () => {
  it('javascript: 스킴 → fallback', () => {
    const svg = buildSparklineSvg({
      values: [1, 2],
      options: { color: 'javascript:alert(1)' },
    });
    expect(svg).not.toContain('javascript');
    expect(svg).toContain('currentColor');
  });

  it('url() → fallback', () => {
    const svg = buildSparklineSvg({
      values: [1, 2],
      options: { color: 'url(http://x)' },
    });
    expect(svg).not.toContain('url(');
  });

  it('script-like 문자 → fallback', () => {
    const svg = buildSparklineSvg({
      values: [1, 2],
      options: { color: '"><script>' },
    });
    expect(svg).not.toContain('<script');
  });
});

describe('formula 통합 — SPARKLINE 함수', () => {
  const eval1 = (formula: string, ctx: Record<string, string> = {}): string =>
    evalCell('Z99', { ...ctx, Z99: '=' + formula });

  it('SPARKLINE(range) → sentinel 반환', () => {
    const ctx = { A1: '1', A2: '2', A3: '3', A4: '4', A5: '5' };
    const result = eval1('SPARKLINE(A1:A5)', ctx);
    expect(result.startsWith(SPARKLINE_SENTINEL)).toBe(true);
    const payload = JSON.parse(result.slice(SPARKLINE_SENTINEL.length));
    expect(payload.values).toEqual([1, 2, 3, 4, 5]);
    expect(payload.options).toEqual({});
  });

  it('SPARKLINE(range, optionsJSON) → 옵션 전달', () => {
    const ctx = { A1: '1', A2: '2', A3: '3' };
    // formula 안 문자열: 이중 따옴표 escape — 사용자가 셀에 쓸 때와 동일 표기
    const result = eval1('SPARKLINE(A1:A3, "{""charttype"":""bar""}")', ctx);
    const payload = JSON.parse(result.slice(SPARKLINE_SENTINEL.length));
    expect(payload.options.charttype).toBe('bar');
  });

  it('비숫자 값은 0 으로 변환', () => {
    const ctx = { A1: 'hi', A2: '5' };
    const result = eval1('SPARKLINE(A1:A2)', ctx);
    const payload = JSON.parse(result.slice(SPARKLINE_SENTINEL.length));
    expect(payload.values).toEqual([0, 5]);
  });

  it('빈 셀 range — evaluator 가 0 으로 채움 (sparkline 정상)', () => {
    // 셀 미정의 = 0 (수식 평가 규약). #VALUE! 가 아니라 평탄한 0 라인.
    const result = eval1('SPARKLINE(A1:A3)', {});
    expect(result.startsWith(SPARKLINE_SENTINEL)).toBe(true);
    const payload = JSON.parse(result.slice(SPARKLINE_SENTINEL.length));
    expect(payload.values).toEqual([0, 0, 0]);
  });
});
