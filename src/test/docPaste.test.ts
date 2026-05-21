import { describe, expect, it } from 'vitest';
import { normalizeDocCopyHtml, normalizeDocPasteHtml } from '@/lib/cloudDoc/paste';

describe('normalizeDocPasteHtml', () => {
  it('converts Word list paragraphs into semantic lists', () => {
    const html = `
      <p class="MsoListParagraph" style="margin-left:.5in;text-indent:-.25in;mso-list:l0 level1 lfo1">
        <span style="mso-list:Ignore">·<span style="font:7.0pt Times New Roman">&nbsp;&nbsp;</span></span>
        First item
      </p>
      <p class="MsoListParagraph" style="margin-left:.5in;text-indent:-.25in;mso-list:l0 level1 lfo1">
        <span style="mso-list:Ignore">·<span style="font:7.0pt Times New Roman">&nbsp;&nbsp;</span></span>
        Second item
      </p>
    `;

    const out = normalizeDocPasteHtml(html);

    expect(out).toContain('<ul');
    expect(out).toContain('<li>');
    expect(out).toContain('data-list-indent-left="720"');
    expect(out).toContain('data-list-indent-hanging="360"');
    expect(out).toContain('First item');
    expect(out).toContain('Second item');
    expect(out).not.toContain('mso-list');
    expect(out).not.toContain('MsoListParagraph');
  });

  it('keeps ordered-list numbering metadata from Word paste', () => {
    const html = `
      <p class="MsoListParagraph" style="margin-left:.5in;text-indent:-.25in;mso-list:l1 level1 lfo2">
        <span style="mso-list:Ignore">3.<span>&nbsp;</span></span>
        Third item
      </p>
    `;

    const out = normalizeDocPasteHtml(html);

    expect(out).toContain('<ol');
    expect(out).toContain('start="3"');
    expect(out).toContain('Third item');
    expect(out).not.toContain('3.<span');
  });

  it('keeps ordered-list type metadata from Word paste', () => {
    const html = `
      <p class="MsoListParagraph" style="margin-left:.5in;text-indent:-.25in;mso-list:l1 level1 lfo2">
        <span style="mso-list:Ignore">A.<span>&nbsp;</span></span>
        Alpha item
      </p>
      <p class="MsoListParagraph" style="margin-left:.5in;text-indent:-.25in;mso-list:l1 level1 lfo2">
        <span style="mso-list:Ignore">B.<span>&nbsp;</span></span>
        Beta item
      </p>
    `;

    const out = normalizeDocPasteHtml(html);

    expect(out).toContain('<ol');
    expect(out).toContain('type="A"');
    expect(out).toContain('Alpha item');
    expect(out).toContain('Beta item');
  });

  it('normalizes Google Docs and Word paragraph units for TipTap attrs', () => {
    const html = `
      <p class="docs-internal-guid-1" style="margin-top:6pt;margin-bottom:12pt;margin-left:.5in;margin-right:18pt;text-indent:.25in;line-height:115%;font-size:11pt;background-color:transparent">
        Pasted paragraph
      </p>
    `;

    const out = normalizeDocPasteHtml(html);

    expect(out).toContain('data-space-before="6"');
    expect(out).toContain('data-space-after="12"');
    expect(out).toContain('data-indent="1"');
    expect(out).toContain('data-indent-right="24"');
    expect(out).toContain('data-indent-first-line="24"');
    expect(out).toContain('data-line-height="1.15"');
    expect(out).toContain('font-size: 15px');
    expect(out).not.toContain('docs-internal-guid');
    expect(out).not.toContain('background-color: transparent');
  });
});

describe('normalizeDocCopyHtml', () => {
  it('adds portable CSS for paragraph layout attrs when copying out', () => {
    const html = `
      <p class="ProseMirror-selectednode keep-me" data-space-before="6" data-space-after="12" data-indent="2" data-indent-right="24" data-indent-first-line="18" data-line-height="1.4">
        Copy me
      </p>
    `;

    const out = normalizeDocCopyHtml(html);

    expect(out).toContain('data-space-before="6"');
    expect(out).toContain('margin-top: 6pt');
    expect(out).toContain('margin-bottom: 12pt');
    expect(out).toContain('margin-left: 96px');
    expect(out).toContain('margin-right: 24px');
    expect(out).toContain('text-indent: 18px');
    expect(out).toContain('line-height: 1.4');
    expect(out).toContain('class="keep-me"');
    expect(out).not.toContain('ProseMirror-selectednode');
  });

  it('adds portable CSS for list and RTL attrs when copying out', () => {
    const html = `
      <ul data-list-indent-left="720" data-list-style-type="circle"><li>Nested</li></ul>
      <p data-paragraph-bidi="true">RTL paragraph</p>
    `;

    const out = normalizeDocCopyHtml(html);

    expect(out).toContain('padding-left: 48px');
    expect(out).toContain('list-style-type: circle');
    expect(out).toContain('dir="rtl"');
    expect(out).toContain('direction: rtl');
    expect(out).toContain('unicode-bidi: isolate');
  });
});
