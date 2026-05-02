const BLOCKED_ELEMENTS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta']);
const URI_ATTRIBUTES = new Set(['href', 'src', 'xlink:href']);

function isUnsafeUri(value: string): boolean {
  const normalized = Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code > 0x20 && code !== 0x7f;
    })
    .join('')
    .toLowerCase();
  return normalized.startsWith('javascript:') || normalized.startsWith('data:text/html');
}

function isUnsafeStyle(value: string): boolean {
  const normalized = value.replace(/\s+/g, '').toLowerCase();
  return normalized.includes('expression(') || normalized.includes('url(javascript:');
}

export function sanitizeHtml(dirtyHtml: string): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return dirtyHtml;
  }

  const doc = new DOMParser().parseFromString(`<body>${dirtyHtml}</body>`, 'text/html');

  for (const node of Array.from(doc.body.querySelectorAll('*'))) {
    if (BLOCKED_ELEMENTS.has(node.tagName.toLowerCase())) {
      node.remove();
      continue;
    }

    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      if (name.startsWith('on')) {
        node.removeAttribute(attr.name);
        continue;
      }

      if (URI_ATTRIBUTES.has(name) && isUnsafeUri(value)) {
        node.removeAttribute(attr.name);
        continue;
      }

      if (name === 'style' && isUnsafeStyle(value)) {
        node.removeAttribute(attr.name);
      }
    }
  }

  return doc.body.innerHTML;
}
