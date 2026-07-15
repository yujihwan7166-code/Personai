/**
 * 마이위키 본문(HTML) 유틸 — 정화·텍스트 추출·목차·백링크 스캔.
 * 본문은 contentEditable 산출물이라, 저장 전 반드시 sanitizeWikiHtml 을 거친다.
 */

const ALLOWED_TAGS = new Set([
  'H2', 'H3', 'P', 'DIV', 'BR', 'UL', 'OL', 'LI', 'B', 'STRONG', 'I', 'EM', 'U',
  'A', 'SPAN', 'SUP', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'BLOCKQUOTE',
]);

/** 허용 속성 — 링크·주석 마커에 쓰는 data 속성과 표시용 최소한만. */
const ALLOWED_ATTRS = new Set(['data-link', 'data-stub-title', 'data-fn', 'id', 'title']);

/**
 * contentEditable 산출 HTML 정화.
 * - 비허용 태그는 풀어서 내용만 유지 (script 등 위험 태그는 통째 제거)
 * - style/class/on* 등 모든 비허용 속성 제거 (표시 스타일은 렌더 측 CSS 책임)
 */
export function sanitizeWikiHtml(html: string): string {
  if (typeof document === 'undefined') return html;
  const root = document.createElement('div');
  root.innerHTML = html;

  const DANGEROUS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'FORM', 'INPUT', 'BUTTON', 'IMG', 'VIDEO', 'AUDIO']);

  const walk = (el: Element) => {
    for (const child of [...el.children]) {
      if (DANGEROUS.has(child.tagName)) {
        child.remove();
        continue;
      }
      walk(child);
      if (!ALLOWED_TAGS.has(child.tagName)) {
        // 태그는 풀고 내용은 살림
        const frag = document.createDocumentFragment();
        while (child.firstChild) frag.appendChild(child.firstChild);
        child.replaceWith(frag);
        continue;
      }
      for (const attr of [...child.attributes]) {
        if (!ALLOWED_ATTRS.has(attr.name)) child.removeAttribute(attr.name);
      }
    }
  };
  walk(root);
  return root.innerHTML;
}

/** HTML → 평문 (스텁 판정·검색·발췌용). */
export function wikiPlainText(html: string): string {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, ' ');
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export interface WikiHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

/**
 * 본문에서 h2/h3 목차 추출 + 각 헤딩에 안정적 id 부여.
 * 반환: { html(id 부여됨), headings }
 */
export function extractWikiToc(html: string): { html: string; headings: WikiHeading[] } {
  if (typeof document === 'undefined') return { html, headings: [] };
  const root = document.createElement('div');
  root.innerHTML = html;
  const headings: WikiHeading[] = [];
  root.querySelectorAll('h2, h3').forEach((h, i) => {
    const id = `wk-h-${i}`;
    h.id = id;
    headings.push({ id, text: (h.textContent ?? '').trim() || '(제목 없음)', level: h.tagName === 'H2' ? 2 : 3 });
  });
  return { html: root.innerHTML, headings };
}

/** 본문 안의 문서 링크(data-link) id 목록. */
export function outgoingLinkIds(html: string): string[] {
  const out: string[] = [];
  const re = /data-link="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(m[1]);
  return [...new Set(out)];
}

/** 본문 안의 예약(스텁) 링크 제목 목록. */
export function stubLinkTitles(html: string): string[] {
  const out: string[] = [];
  const re = /data-stub-title="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(decodeAttr(m[1]));
  return [...new Set(out)];
}

/** 특정 문서를 가리키는 링크 주변 발췌문 (백링크 카드용). */
export function backlinkSnippet(html: string, targetId: string, radius = 34): string {
  if (typeof document === 'undefined') return '';
  const root = document.createElement('div');
  root.innerHTML = html;
  const a = root.querySelector(`a[data-link="${CSS.escape(targetId)}"]`);
  if (!a) return '';
  const label = a.textContent ?? '';
  const full = (root.textContent ?? '').replace(/\s+/g, ' ');
  const idx = full.indexOf(label);
  if (idx < 0) return full.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(full.length, idx + label.length + radius);
  return `${start > 0 ? '…' : ''}${full.slice(start, end).trim()}${end < full.length ? '…' : ''}`;
}

function decodeAttr(s: string): string {
  return s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

/** 링크 a 요소 생성용 HTML 조각. */
export function linkHtml(docId: string, label: string): string {
  return `<a data-link="${docId}">${escapeHtml(label)}</a>`;
}

export function stubHtml(title: string, label?: string): string {
  return `<a data-stub-title="${escapeHtml(title)}" title="아직 만들지 않은 문서 — 클릭해서 새로 파기">${escapeHtml(label ?? title)}</a>`;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
