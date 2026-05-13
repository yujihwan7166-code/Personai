/**
 * 화이트보드 — roughjs 래퍼 + 캐시.
 *
 * 요소가 변경되지 않는 한 같은 SVG path 를 재사용 (WeakMap 캐시).
 * roughness=0 이면 깔끔 SVG (자체 렌더), 1~2 면 sketchy.
 */
import rough from 'roughjs';
import type { Drawable, Options } from 'roughjs/bin/core';

const generator = rough.generator();

// 요소 → 캐시 키 (변경 시 무효화)
const cache = new WeakMap<object, { key: string; drawable: Drawable }>();

function makeKey(parts: (string | number)[]): string {
  return parts.join('|');
}

interface RoughInput {
  el: object;     // 요소 id 객체 (캐시 키)
  cacheKey: string;
  build: () => Drawable;
}

/** 캐시된 drawable 반환, 키 다르면 재계산. */
export function roughCached({ el, cacheKey, build }: RoughInput): Drawable {
  const cached = cache.get(el);
  if (cached && cached.key === cacheKey) return cached.drawable;
  const drawable = build();
  cache.set(el, { key: cacheKey, drawable });
  return drawable;
}

export function roughOptions(roughness: 0 | 1 | 2, fillColor?: string, fillStyle?: 'solid' | 'hachure' | 'cross-hatch'): Options {
  const r = roughness === 0 ? 0.3 : roughness === 1 ? 1.2 : 2.4;
  return {
    roughness: r,
    bowing: roughness === 0 ? 0 : 1,
    fill: fillColor && fillColor !== 'none' ? fillColor : undefined,
    fillStyle: fillStyle === 'hachure' ? 'hachure'
             : fillStyle === 'cross-hatch' ? 'cross-hatch'
             : 'solid',
    fillWeight: 1,
    hachureGap: 8,
    seed: 1,    // 결정적 결과
  };
}

export const roughGenerator = generator;

/**
 * Drawable → SVG path 모음. svg path 의 d 들을 합성된 단일 path 로 반환할 수 있지만
 * roughjs 는 여러 종류(fill path, outline path) 를 분리. 우리는 둘 다 그림.
 */
export function drawableSVGPaths(drawable: Drawable): Array<{ d: string; fill?: string; stroke?: string }> {
  const sets = generator.toPaths(drawable);
  return sets.map((s) => ({
    d: s.d,
    fill: s.fill,
    stroke: s.stroke,
  }));
}
