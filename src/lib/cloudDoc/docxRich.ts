/**
 * mammoth 가 변환한 .docx HTML 을 TipTap 친화적으로 후처리.
 *
 * mammoth 기본 변환은 단순 — inline 글꼴·색·크기 일부만 보존, 표 border
 * 종종 누락, 이미지 크기 attr 없음. 이 모듈이 그 갭을 메워서 사용자가
 * 원본 .docx 와 "사실상 같은 파일" 로 느끼도록 끌어올림.
 *
 * 정책:
 *  - 입출력 모두 HTML string (mammoth → setContent 사이 끼움)
 *  - DOMParser 로 트리 수정 → outerHTML 반환
 *  - 외부 fetch / 신규 라이브러리 추가 없음
 *  - TipTap TextStyle / Highlight / Table* / Image 확장과 호환
 *
 * 한계 (mammoth 의 출력에 의존):
 *  - mammoth 가 inline color 를 export 안 하면 후처리도 색 복원 불가
 *    → 그 케이스는 C 단계에서 자체 XML 파서로 보강
 */

import { mapFontFamily } from './fontMap';

/** mammoth HTML → TipTap-친화 HTML. SSR 환경(DOMParser 없음)에서는 원본 그대로. */
export function enrichDocxHtml(html: string): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  if (!doc.body) return html;
  walkInlineStyles(doc.body);
  normalizeTables(doc.body);
  normalizeImages(doc.body);
  return doc.body.innerHTML;
}

// ─────────────────────────────────────────────
// 1. inline 서식 정규화 (font-family / font-size / color / background)
// ─────────────────────────────────────────────

const INLINE_TAGS = new Set(['SPAN', 'EM', 'STRONG', 'B', 'I', 'U', 'S', 'CODE', 'SUB', 'SUP', 'A']);

function walkInlineStyles(root: Element): void {
  const all = Array.from(root.querySelectorAll<HTMLElement>('*'));
  for (const el of all) {
    const styleAttr = el.getAttribute('style');
    if (!styleAttr) continue;
    const parsed = parseInlineStyle(styleAttr);

    // 1) font-family: 매핑된 stack 으로 교체
    if (parsed['font-family']) {
      const mapped = mapFontFamily(parsed['font-family']);
      applyInlineStyle(el, 'font-family', mapped);
    }
    // 2) font-size: pt/em → px 로 정규화
    if (parsed['font-size']) {
      const px = sizeToPx(parsed['font-size']);
      if (px) applyInlineStyle(el, 'font-size', `${px}px`);
    }
    // 3) color
    if (parsed['color']) {
      applyInlineStyle(el, 'color', parsed['color']);
    }
    // 4) background-color → highlight 효과
    const bg = parsed['background-color'] ?? parsed['background'];
    if (bg && bg !== 'transparent' && !/^rgba?\(0,\s*0,\s*0,\s*0\)$/i.test(bg)) {
      applyInlineStyle(el, 'background-color', bg);
    }
    // 5) text-align: 부모 paragraph 로 (mammoth 가 이미 처리하지만 inline span 에 붙은 경우만 정리)
    if (parsed['text-align'] && /^(left|center|right|justify)$/.test(parsed['text-align'])) {
      const block = closestBlock(el);
      if (block && block !== el && !block.style.textAlign) {
        block.style.textAlign = parsed['text-align'];
      }
    }
  }
}

function parseInlineStyle(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of s.split(';')) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && value) out[key] = value;
  }
  return out;
}

/** "12pt", "16px", "1.5em", "1.2rem" → 반올림 px 또는 null. */
function sizeToPx(s: string): number | null {
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(pt|px|em|rem)?$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = (m[2] || 'px').toLowerCase();
  if (unit === 'pt') return Math.round(n * 1.333);  // 1pt ≈ 1.333px
  if (unit === 'em' || unit === 'rem') return Math.round(n * 16);
  return Math.round(n);
}

/**
 * el 에 inline style 부여 — TipTap mark 가 인식할 형태로.
 *  - el 자체가 inline 이면 그 element 의 style 만 갱신 (span 등)
 *  - 블록(p, h1, div 등) 이면 자식 텍스트들을 span 으로 감싸서 style 부여
 *    (TipTap TextStyle 은 inline mark 라 paragraph 에 직접 style 못 줌)
 */
function applyInlineStyle(el: HTMLElement, prop: string, value: string): void {
  if (INLINE_TAGS.has(el.tagName)) {
    setStyleProp(el, prop, value);
    return;
  }
  wrapTextChildrenWithSpan(el, prop, value);
}

function setStyleProp(el: HTMLElement, prop: string, value: string): void {
  const current = el.getAttribute('style') ?? '';
  const filtered = current
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && !s.toLowerCase().startsWith(`${prop}:`))
    .join('; ');
  el.setAttribute('style', filtered ? `${filtered}; ${prop}: ${value}` : `${prop}: ${value}`);
}

function wrapTextChildrenWithSpan(parent: HTMLElement, prop: string, value: string): void {
  const doc = parent.ownerDocument;
  const children = Array.from(parent.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim()) {
      const span = doc.createElement('span');
      span.setAttribute('style', `${prop}: ${value}`);
      span.textContent = child.textContent;
      parent.replaceChild(span, child);
    }
  }
}

function closestBlock(el: Element): HTMLElement | null {
  let cur: Element | null = el;
  while (cur) {
    if (cur instanceof HTMLElement && !INLINE_TAGS.has(cur.tagName) && cur.tagName !== 'BODY') {
      return cur;
    }
    cur = cur.parentElement;
  }
  return null;
}

// ─────────────────────────────────────────────
// 2. 표 정규화 — border / padding / width
// ─────────────────────────────────────────────

function normalizeTables(root: Element): void {
  for (const t of Array.from(root.querySelectorAll('table'))) {
    const table = t as HTMLTableElement;
    const cur = table.getAttribute('style') ?? '';
    if (!cur.includes('border-collapse')) {
      table.setAttribute(
        'style',
        `${cur ? cur + '; ' : ''}border-collapse: collapse; width: 100%`,
      );
    }
    // mammoth 가 종종 border 없이 내보냄 — 셀별 1px 보강
    for (const cell of Array.from(table.querySelectorAll('td, th'))) {
      const cellEl = cell as HTMLElement;
      const cs = cellEl.getAttribute('style') ?? '';
      if (!/\bborder(-[a-z]+)?\s*:/.test(cs)) {
        cellEl.setAttribute(
          'style',
          `${cs ? cs + '; ' : ''}border: 1px solid #d0d0d0; padding: 4px 8px; vertical-align: top`,
        );
      }
    }
    // 헤더 행 (첫 row 가 th 로만 구성) 음영
    const firstRow = table.querySelector('tr');
    if (firstRow && Array.from(firstRow.children).every((c) => c.tagName === 'TH')) {
      for (const th of Array.from(firstRow.children) as HTMLElement[]) {
        const cs = th.getAttribute('style') ?? '';
        if (!/background/.test(cs)) {
          th.setAttribute(
            'style',
            `${cs ? cs + '; ' : ''}background-color: #f3f3f3; font-weight: 600`,
          );
        }
      }
    }
  }
}

// ─────────────────────────────────────────────
// 3. 이미지 정규화 — max-width / height auto
// ─────────────────────────────────────────────

function normalizeImages(root: Element): void {
  for (const img of Array.from(root.querySelectorAll('img'))) {
    const el = img as HTMLImageElement;
    const cur = el.getAttribute('style') ?? '';
    if (!/max-width/.test(cur)) {
      el.setAttribute('style', `${cur ? cur + '; ' : ''}max-width: 100%; height: auto`);
    }
    // alt 없으면 빈 문자열 (a11y — 장식 이미지 처리)
    if (!el.hasAttribute('alt')) {
      el.setAttribute('alt', '');
    }
  }
}
