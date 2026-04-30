/**
 * 태그 → 색 결정 (글로벌 일관성).
 *
 * 같은 태그는 어디서 보든 같은 색. 사용자 지정 X.
 * 8개 팔레트 안에서 hash 로 결정.
 */

const PALETTE = [
  { bg: 'hsl(220 70% 95%)', text: 'hsl(220 70% 35%)' }, // blue
  { bg: 'hsl(160 50% 92%)', text: 'hsl(160 50% 30%)' }, // teal
  { bg: 'hsl(45 80% 92%)',  text: 'hsl(35 75% 35%)'  }, // amber
  { bg: 'hsl(0 60% 94%)',   text: 'hsl(0 60% 40%)'   }, // rose
  { bg: 'hsl(270 50% 94%)', text: 'hsl(270 45% 40%)' }, // violet
  { bg: 'hsl(140 50% 92%)', text: 'hsl(140 50% 30%)' }, // green
  { bg: 'hsl(15 70% 93%)',  text: 'hsl(15 70% 38%)'  }, // orange
  { bg: 'hsl(195 60% 92%)', text: 'hsl(195 60% 32%)' }, // cyan
];

const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

export function tagColor(tag: string): { bg: string; text: string } {
  return PALETTE[hash(tag) % PALETTE.length]!;
}
