/**
 * 슬라이드 요소 정렬 / 분배 — 순수 함수 (테스트 가능).
 *
 * CloudSlideEditor 의 alignSelected / distributeSelected 의 알고리즘.
 * 좌표는 0~100 % (캔버스 대비). 결과 좌표는 캔버스 밖으로 나가지 않게 clamp.
 */

interface Box {
  id: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}

export type AlignAxis = 'h' | 'v';
export type AlignMode = 'start' | 'center' | 'end';

/**
 * 선택된 박스들을 axis 기준으로 정렬.
 * - axis='h': 가로 정렬 (xPct 조정)
 * - axis='v': 세로 정렬 (yPct 조정)
 * - mode='start': 시작 모서리 정렬
 * - mode='center': 중심 정렬
 * - mode='end': 끝 모서리 정렬
 *
 * 결과는 id → 새 xPct (h) 또는 yPct (v) Map.
 */
export function computeAlign(boxes: readonly Box[], axis: AlignAxis, mode: AlignMode): Map<string, number> {
  const out = new Map<string, number>();
  if (boxes.length < 2) return out;
  const positions = boxes.map((b) =>
    axis === 'h' ? { id: b.id, start: b.xPct, size: b.wPct } : { id: b.id, start: b.yPct, size: b.hPct },
  );
  const minStart = Math.min(...positions.map((p) => p.start));
  const maxEnd = Math.max(...positions.map((p) => p.start + p.size));
  const center = (minStart + maxEnd) / 2;
  for (const p of positions) {
    let nv: number;
    if (mode === 'start') nv = minStart;
    else if (mode === 'end') nv = maxEnd - p.size;
    else nv = center - p.size / 2;
    // 캔버스 클램프 (0 ~ 100-size). size 가 100 초과면 음수 → 0 으로.
    const upper = Math.max(0, 100 - p.size);
    nv = Math.max(0, Math.min(upper, nv));
    out.set(p.id, nv);
  }
  return out;
}

/**
 * 선택된 박스들 (3개 이상) 을 axis 기준으로 중심 등간격 분배.
 * 양 끝은 그대로 두고 중간 박스들의 중심이 등간격이 되도록.
 */
export function computeDistribute(boxes: readonly Box[], axis: AlignAxis): Map<string, number> {
  const out = new Map<string, number>();
  if (boxes.length < 3) return out;
  const getCenter = (b: Box): number =>
    axis === 'h' ? b.xPct + b.wPct / 2 : b.yPct + b.hPct / 2;
  const sorted = [...boxes].sort((a, b) => getCenter(a) - getCenter(b));
  const firstC = getCenter(sorted[0]);
  const lastC = getCenter(sorted[sorted.length - 1]);
  // 첫·끝 박스 중심이 동일하면 분배 의미 없음 (모두 같은 위치)
  if (firstC === lastC) return out;
  const step = (lastC - firstC) / (sorted.length - 1);
  for (let i = 0; i < sorted.length; i++) {
    const el = sorted[i];
    const targetCenter = firstC + step * i;
    const size = axis === 'h' ? el.wPct : el.hPct;
    out.set(el.id, targetCenter - size / 2);
  }
  return out;
}
