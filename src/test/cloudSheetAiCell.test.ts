/**
 * AI 셀 비동기 평가 — 캐시 / 큐 / 동시성 / formula 통합.
 *
 * 실제 fetch 는 mock fetcher 로 대체 (네트워크 X). 캐시 효과·중복 enqueue
 * 방지·동시성·이벤트 발행을 검증.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  AI_SENTINEL,
  AI_LOADING_PREFIX,
  AI_CHANGED_EVENT,
  aiCacheGet,
  aiCacheSet,
  aiCacheKey,
  aiCacheClear,
  aiQueueFetch,
  aiQueueClear,
  setAIFetcher,
} from '@/lib/cloudSheet/aiCellEval';
import { evalCell } from '@/lib/cloudSheet/formula';

beforeEach(() => {
  aiCacheClear();
  aiQueueClear();
});

describe('aiCellEval — 캐시', () => {
  it('set 후 get 동일 값', () => {
    aiCacheSet('k1', 'hello');
    expect(aiCacheGet('k1')).toBe('hello');
  });

  it('miss 면 undefined', () => {
    expect(aiCacheGet('nope')).toBeUndefined();
  });

  it('cacheKey 는 결정적', () => {
    const a = aiCacheKey('ai', { prompt: 'x' });
    const b = aiCacheKey('ai', { prompt: 'x' });
    expect(a).toBe(b);
    // 다른 args → 다른 key
    expect(aiCacheKey('ai', { prompt: 'y' })).not.toBe(a);
  });

  it('clear 후 모두 miss', () => {
    aiCacheSet('k', 'v');
    aiCacheClear();
    expect(aiCacheGet('k')).toBeUndefined();
  });
});

describe('aiCellEval — 큐 + fetcher', () => {
  it('enqueue → fetcher 호출 → 캐시 적재 → 이벤트', async () => {
    let calls = 0;
    setAIFetcher(async (fn, args) => {
      calls++;
      return `result(${fn}:${JSON.stringify(args)})`;
    });

    let eventCount = 0;
    const onChange = () => { eventCount++; };
    window.addEventListener(AI_CHANGED_EVENT, onChange);

    const key = aiCacheKey('ai', { prompt: 'hello' });
    aiQueueFetch(key, 'ai', { prompt: 'hello' });

    // 큐 처리 대기 (마이크로태스크)
    await new Promise((r) => setTimeout(r, 10));

    expect(calls).toBe(1);
    expect(aiCacheGet(key)).toContain('hello');
    expect(eventCount).toBeGreaterThanOrEqual(1);

    window.removeEventListener(AI_CHANGED_EVENT, onChange);
  });

  it('같은 key 중복 enqueue → fetcher 1회만', async () => {
    let calls = 0;
    setAIFetcher(async () => { calls++; return 'x'; });
    const key = aiCacheKey('ai', { prompt: 'dup' });
    aiQueueFetch(key, 'ai', { prompt: 'dup' });
    aiQueueFetch(key, 'ai', { prompt: 'dup' });
    aiQueueFetch(key, 'ai', { prompt: 'dup' });
    await new Promise((r) => setTimeout(r, 10));
    expect(calls).toBe(1);
  });

  it('fetcher 에러 → 캐시에 ERROR sentinel 저장', async () => {
    setAIFetcher(async () => { throw new Error('네트워크 끊김'); });
    const key = aiCacheKey('ai', { prompt: 'fail' });
    aiQueueFetch(key, 'ai', { prompt: 'fail' });
    await new Promise((r) => setTimeout(r, 10));
    const cached = aiCacheGet(key);
    expect(cached).toContain('ERROR');
    expect(cached).toContain('네트워크 끊김');
  });
});

describe('formula 통합 — AI 함수', () => {
  it('첫 호출 → LOADING sentinel + 큐 등록', () => {
    setAIFetcher(async () => 'never-resolves-in-this-tick');
    const result = evalCell('A1', { A1: '=AI("질문")' });
    expect(result.startsWith(AI_SENTINEL)).toBe(true);
    expect(result).toContain(AI_LOADING_PREFIX);
  });

  it('캐시 hit → 결과 직접 반환 (sentinel 없음)', async () => {
    setAIFetcher(async () => '여기 답이요');
    const formula = '=AI("질문2")';
    // 1차 호출 — LOADING + 큐
    evalCell('A1', { A1: formula });
    await new Promise((r) => setTimeout(r, 10));
    // 2차 호출 — 캐시 hit
    const second = evalCell('A1', { A1: formula });
    expect(second).toBe('여기 답이요');
  });

  it('AI_CLASSIFY — 텍스트 + 카테고리', async () => {
    let receivedArgs: unknown = null;
    setAIFetcher(async (fn, args) => {
      receivedArgs = { fn, args };
      return '긍정';
    });
    evalCell('A1', { A1: '=AI_CLASSIFY("좋아요", "긍정,부정,중립")' });
    await new Promise((r) => setTimeout(r, 10));
    const a = receivedArgs as { fn: string; args: { text: string; categories: string } };
    expect(a.fn).toBe('ai_classify');
    expect(a.args.text).toBe('좋아요');
    expect(a.args.categories).toBe('긍정,부정,중립');
  });

  it('AI_TRANSLATE — 언어 인자', async () => {
    let receivedLang = '';
    setAIFetcher(async (_fn, args) => {
      receivedLang = (args as { lang: string }).lang;
      return 'hello';
    });
    evalCell('A1', { A1: '=AI_TRANSLATE("안녕", "en")' });
    await new Promise((r) => setTimeout(r, 10));
    expect(receivedLang).toBe('en');
  });

  it('AI_SUMMARIZE — range 를 join 해서 전달', async () => {
    let receivedText = '';
    setAIFetcher(async (_fn, args) => {
      receivedText = (args as { text: string }).text;
      return '요약';
    });
    evalCell('B1', {
      A1: '문장1', A2: '문장2', A3: '문장3',
      B1: '=AI_SUMMARIZE(A1:A3)',
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(receivedText).toContain('문장1');
    expect(receivedText).toContain('문장2');
    expect(receivedText).toContain('문장3');
  });
});
