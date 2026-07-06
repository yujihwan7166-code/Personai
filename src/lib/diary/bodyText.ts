import type { Value } from 'platejs';

export function emptyBody(): Value {
  return [{ type: 'p', children: [{ text: '' }] }];
}

/** 평문(줄바꿈 분리) → Plate Value(문단들). */
export function valueFromPlain(text: string): Value {
  const lines = text.split(/\r?\n/);
  const paras = lines.map((line) => ({ type: 'p', children: [{ text: line }] }));
  return (paras.length > 0 ? paras : emptyBody()) as Value;
}

/** Plate Value → 평문(발췌·검색용). 블록 내 인라인 런은 붙이고, 블록 간은 공백. */
export function plainFromValue(value: Value): string {
  const blockText = (node: unknown): string => {
    if (!node || typeof node !== 'object') return '';
    const nd = node as { text?: string; children?: unknown[] };
    if (typeof nd.text === 'string') return nd.text;
    if (Array.isArray(nd.children)) return nd.children.map(blockText).join('');
    return '';
  };
  const blocks = (value as unknown[]).map(blockText);
  return blocks.join(' ').replace(/\s+/g, ' ').trim();
}
