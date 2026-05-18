import { describe, it, expect } from 'vitest';
import { parseJwt, isJwtExpired } from '@/lib/jwtParse';

// helper: base64url encode a JSON payload
function makeToken(payload: object): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, 'utf-8').toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${b64}.sig`;
}

describe('parseJwt', () => {
  it('정상 payload', () => {
    const t = makeToken({ sub: 'user-1', exp: 1700000000, name: '홍길동' });
    const p = parseJwt(t);
    expect(p?.sub).toBe('user-1');
    expect(p?.name).toBe('홍길동');
  });
  it('잘못된 토큰 → null', () => {
    expect(parseJwt('abc')).toBeNull();
    expect(parseJwt('')).toBeNull();
    expect(parseJwt(null)).toBeNull();
  });
  it('비-JSON payload → null', () => {
    expect(parseJwt('header.bm90anNvbg.sig')).toBeNull();
  });
});

describe('isJwtExpired', () => {
  it('exp 과거 → true', () => {
    const t = makeToken({ exp: 100 });
    expect(isJwtExpired(t, 200)).toBe(true);
  });
  it('exp 미래 → false', () => {
    const t = makeToken({ exp: 999 });
    expect(isJwtExpired(t, 100)).toBe(false);
  });
  it('exp 없음 → false', () => {
    const t = makeToken({ sub: 'x' });
    expect(isJwtExpired(t)).toBe(false);
  });
});
