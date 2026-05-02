import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

describe('sanitizeHtml', () => {
  it('removes scriptable elements and inline event handlers', () => {
    const html = sanitizeHtml('<p onclick="alert(1)">Hi</p><script>alert(1)</script>');

    expect(html).toContain('<p>Hi</p>');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('<script');
  });

  it('removes javascript URLs from links and images', () => {
    const html = sanitizeHtml('<a href="javascript:alert(1)">bad</a><img src="data:text/html,<svg>">');

    expect(html).toContain('<a>bad</a>');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('data:text/html');
  });

  it('keeps normal SVG markup for mermaid output', () => {
    const html = sanitizeHtml('<svg viewBox="0 0 10 10"><path d="M0 0L10 10"></path></svg>');

    expect(html).toContain('<svg');
    expect(html).toContain('<path');
    expect(html).toContain('viewBox="0 0 10 10"');
  });
});
