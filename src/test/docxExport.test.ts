import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { exportDocxBlobFromJson } from '@/lib/cloudDoc/docx';
import { createDocCompatibilitySampleJson } from '@/lib/cloudDoc/sampleDocs';

const TINY_PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l5NrzwAAAABJRU5ErkJggg==';

async function readDocxXml(blob: Blob): Promise<{
  documentXml: string;
  relsXml: string;
  footnotesXml: string;
  endnotesXml: string;
  commentsXml: string;
  numberingXml: string;
  headerXml: string;
  footerXml: string;
}> {
  const buffer = await readBlobArrayBuffer(blob);
  const zip = await JSZip.loadAsync(buffer);
  return {
    documentXml: await zip.file('word/document.xml')!.async('string'),
    relsXml: await zip.file('word/_rels/document.xml.rels')!.async('string'),
    footnotesXml: await zip.file('word/footnotes.xml')?.async('string') ?? '',
    endnotesXml: await zip.file('word/endnotes.xml')?.async('string') ?? '',
    commentsXml: await zip.file('word/comments.xml')?.async('string') ?? '',
    numberingXml: await zip.file('word/numbering.xml')?.async('string') ?? '',
    headerXml: await zip.file('word/header1.xml')?.async('string') ?? '',
    footerXml: await zip.file('word/footer1.xml')?.async('string') ?? '',
  };
}

function readBlobArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error('Blob을 ArrayBuffer로 읽지 못했어요.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Blob 읽기에 실패했어요.'));
    reader.readAsArrayBuffer(blob);
  });
}

describe('exportDocxBlobFromJson', () => {
  it('exports the built-in compatibility sample without invalid table XML', async () => {
    const blob = await exportDocxBlobFromJson(createDocCompatibilitySampleJson());
    const { documentXml, footnotesXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:tbl');
    expect(documentXml).toContain('w:vMerge');
    expect(documentXml).toContain('w:tblGrid');
    expect(documentXml).toContain('w:rFonts');
    expect(documentXml).toContain('w:tabs');
    expect(documentXml).toContain('w:firstLine="480"');
    expect(footnotesXml).toContain('각주 export 확인용 샘플입니다.');
  });

  it('preserves links, highlight, superscript, and footnotes', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'OpenAI',
              marks: [{ type: 'link', attrs: { href: 'https://openai.com' } }],
            },
            { type: 'text', text: ' ' },
            {
              type: 'text',
              text: 'highlighted',
              marks: [{ type: 'highlight', attrs: { color: '#fff59d' } }],
            },
            { type: 'text', text: ' x' },
            {
              type: 'text',
              text: '2',
              marks: [{ type: 'superscript' }],
            },
            {
              type: 'footnote',
              attrs: { id: 'fn_a', text: 'Footnote body' },
            },
          ],
        },
      ],
    });

    const { documentXml, relsXml, footnotesXml } = await readDocxXml(blob);

    expect(relsXml).toContain('https://openai.com');
    expect(documentXml).toContain('w:hyperlink');
    expect(documentXml).toContain('w:shd');
    expect(documentXml).toContain('FFF59D');
    expect(documentXml).toContain('w:vertAlign');
    expect(documentXml).toContain('superscript');
    expect(documentXml).toContain('w:footnoteReference');
    expect(footnotesXml).toContain('Footnote body');
  });

  it('exports endnotes to DOCX endnotes', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Endnote ref' },
            {
              type: 'footnote',
              attrs: { id: 'en_a', text: 'Endnote body', noteType: 'endnote' },
            },
          ],
        },
      ],
    });

    const { documentXml, endnotesXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:endnoteReference');
    expect(endnotesXml).toContain('Endnote body');
  });

  it('exports advanced run typography to DOCX', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Small spaced',
              marks: [{ type: 'textStyle', attrs: { smallCaps: true, characterSpacing: 80, textScale: 80, textPosition: 12 } }],
            },
            {
              type: 'text',
              text: ' caps',
              marks: [{ type: 'textStyle', attrs: { allCaps: true } }],
            },
            {
              type: 'text',
              text: ' double',
              marks: [{ type: 'textStyle', attrs: { doubleStrike: true } }],
            },
            {
              type: 'text',
              text: ' effects',
              marks: [{ type: 'textStyle', attrs: { emboss: true, imprint: true, textEffect: 'shimmer' } }],
            },
            {
              type: 'text',
              text: ' language',
              marks: [{ type: 'textStyle', attrs: { language: 'en-US', eastAsiaLanguage: 'ko-KR', bidiLanguage: 'ar-SA' } }],
            },
            {
              type: 'text',
              text: ' rtl',
              marks: [{ type: 'textStyle', attrs: { kerning: 24, rightToLeft: true } }],
            },
            {
              type: 'text',
              text: ' proof',
              marks: [{ type: 'textStyle', attrs: { noProof: true, snapToGrid: true, emphasisMark: 'dot' } }],
            },
            {
              type: 'text',
              text: ' bordered',
              marks: [{ type: 'textStyle', attrs: { runBorderStyle: 'single', runBorderColor: '#C00000', runBorderSize: 12, runBorderSpace: 2 } }],
            },
            {
              type: 'text',
              text: ' complex',
              marks: [{ type: 'textStyle', attrs: { complexScriptBold: true, complexScriptItalic: true, complexScriptHighlight: '#00FFFF', complexScriptFontFamily: 'Arial', complexScriptFontSize: 19 } }],
            },
            {
              type: 'text',
              text: ' mathrun',
              marks: [{ type: 'textStyle', attrs: { mathRun: true } }],
            },
          ],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:smallCaps');
    expect(documentXml).toContain('w:caps');
    expect(documentXml).toContain('w:spacing');
    expect(documentXml).toContain('w:val="80"');
    expect(documentXml).toContain('w:w');
    expect(documentXml).toContain('w:position');
    expect(documentXml).toContain('w:val="6pt"');
    expect(documentXml).toContain('w:dstrike');
    expect(documentXml).toContain('w:emboss');
    expect(documentXml).toContain('w:imprint');
    expect(documentXml).toContain('w:effect');
    expect(documentXml).toContain('w:val="shimmer"');
    expect(documentXml).toContain('w:lang');
    expect(documentXml).toContain('w:val="en-US"');
    expect(documentXml).toContain('w:eastAsia="ko-KR"');
    expect(documentXml).toContain('w:bidi="ar-SA"');
    expect(documentXml).toContain('w:kern');
    expect(documentXml).toContain('w:rtl');
    expect(documentXml).toContain('w:noProof');
    expect(documentXml).toContain('w:snapToGrid');
    expect(documentXml).toContain('w:em');
    expect(documentXml).toContain('w:val="dot"');
    expect(documentXml).toContain('w:bdr');
    expect(documentXml).toContain('w:color="C00000"');
    expect(documentXml).toContain('w:sz="12"');
    expect(documentXml).toContain('w:space="2"');
    expect(documentXml).toContain('w:bCs');
    expect(documentXml).toContain('w:iCs');
    expect(documentXml).toContain('w:highlightCs');
    expect(documentXml).toContain('w:val="cyan"');
    expect(documentXml).toContain('w:szCs');
    expect(documentXml).toContain('w:cs="Arial"');
    expect(documentXml).toContain('w:oMath');
  });

  it('exports advanced underline style and color to DOCX', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Styled underline',
              marks: [
                { type: 'underline' },
                { type: 'textStyle', attrs: { underlineStyle: 'double', underlineColor: '#00AA00' } },
              ],
            },
          ],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:u');
    expect(documentXml).toContain('w:val="double"');
    expect(documentXml).toContain('w:color="00AA00"');
  });

  it('exports hidden text to DOCX vanish properties', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Hidden text',
              marks: [{ type: 'textStyle', attrs: { hiddenText: true } }],
            },
            {
              type: 'text',
              text: ' spec hidden',
              marks: [{ type: 'textStyle', attrs: { specHiddenText: true } }],
            },
          ],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('Hidden text');
    expect(documentXml).toContain('w:vanish');
    expect(documentXml).toContain('w:specVanish');
  });

  it('exports bookmarks and internal hyperlinks to DOCX anchors', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Jump to target',
              marks: [{ type: 'link', attrs: { href: '#Target_Section' } }],
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2, bookmarkId: 'Target_Section' },
          content: [{ type: 'text', text: 'Target section' }],
        },
      ],
    });

    const { documentXml, relsXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:hyperlink');
    expect(documentXml).toContain('w:anchor="Target_Section"');
    expect(documentXml).toContain('w:bookmarkStart');
    expect(documentXml).toContain('w:name="Target_Section"');
    expect(documentXml).toContain('w:bookmarkEnd');
    expect(relsXml).not.toContain('Target_Section');
  });

  it('exports header and footer alignment with page-number placement', async () => {
    const blob = await exportDocxBlobFromJson(
      {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Body' }] }],
      },
      {
        headerText: 'Right header\nHeader second line',
        footerText: 'Left footer\nDoc No | D-001',
        headerAlign: 'right',
        footerAlign: 'left',
        headerImages: [{ src: TINY_PNG_DATA_URL, width: 32, height: 24, align: 'right' }],
        showPageNumber: true,
        pageNumberPlacement: 'header',
      },
    );

    const { headerXml, footerXml } = await readDocxXml(blob);

    expect(headerXml).toContain('Right header');
    expect(headerXml).toContain('Header second line');
    expect(headerXml).toContain('wp:extent');
    expect(headerXml).toContain('cx="304800"');
    expect(headerXml).toContain('cy="228600"');
    expect((headerXml.match(/<w:p>/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(headerXml).toContain('w:jc w:val="right"');
    expect(headerXml).toContain('PAGE');
    expect(headerXml).toContain('NUMPAGES');
    expect(footerXml).toContain('Left footer');
    expect(footerXml).toContain('Doc No | D-001');
    expect((footerXml.match(/<w:p>/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(footerXml).toContain('w:jc w:val="left"');
    expect(footerXml).not.toContain('NUMPAGES');
  });

  it('exports imported text box blocks as DOCX textboxes', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'docxTextBox',
          content: [{ type: 'text', text: 'Text box line one' }],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('v:textbox');
    expect(documentXml).toContain('w:txbxContent');
    expect(documentXml).toContain('Text box line one');
  });

  it('exports imported TOC blocks as DOCX fields', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'docxToc',
          attrs: { instruction: 'TOC \\o "1-3" \\h \\z \\u' },
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Heading 1\t1' }] },
          ],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:fldSimple');
    expect(documentXml).toContain('TOC');
    expect(documentXml).toContain('Heading 1');
  });

  it('exports heading levels 4 through 6 as DOCX heading styles', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 4 },
          content: [{ type: 'text', text: 'Heading four' }],
        },
        {
          type: 'heading',
          attrs: { level: 5 },
          content: [{ type: 'text', text: 'Heading five' }],
        },
        {
          type: 'heading',
          attrs: { level: 6 },
          content: [{ type: 'text', text: 'Heading six' }],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('Heading four');
    expect(documentXml).toContain('Heading five');
    expect(documentXml).toContain('Heading six');
    expect(documentXml).toContain('w:val="Heading4"');
    expect(documentXml).toContain('w:val="Heading5"');
    expect(documentXml).toContain('w:val="Heading6"');
  });

  it('exports imported OMML equations as DOCX math', async () => {
    const omml = '<m:oMath><m:r><m:t>x+1</m:t></m:r></m:oMath>';
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Equation: ' },
            { type: 'docxMath', attrs: { omml: encodeURIComponent(omml), text: 'x+1' } },
          ],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('m:oMath');
    expect(documentXml).toContain('x+1');
  });

  it('exports tracked insertions and deletions as DOCX revisions', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Before ' },
            {
              type: 'text',
              text: 'inserted',
              marks: [{
                type: 'revision',
                attrs: { type: 'insert', id: 7, author: 'Alice', date: '2026-05-20T00:00:00Z' },
              }],
            },
            {
              type: 'text',
              text: 'deleted',
              marks: [{
                type: 'revision',
                attrs: { type: 'delete', id: 8, author: 'Bob', date: '2026-05-20T00:00:00Z' },
              }],
            },
          ],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('<w:ins');
    expect(documentXml).toContain('w:id="7"');
    expect(documentXml).toContain('w:author="Alice"');
    expect(documentXml).toContain('inserted');
    expect(documentXml).toContain('<w:del');
    expect(documentXml).toContain('w:id="8"');
    expect(documentXml).toContain('w:author="Bob"');
    expect(documentXml).toContain('deleted');
  });

  it('preserves semantic page breaks', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Before' }],
        },
        { type: 'pageBreak' },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'After' }],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:br');
    expect(documentXml).toContain('w:type="page"');
  });

  it('preserves soft line breaks and tabs inside paragraphs', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Line one' },
            { type: 'hardBreak' },
            { type: 'text', text: 'Line two' },
            { type: 'text', text: 'Name\tValue' },
          ],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('Line one');
    expect(documentXml).toContain('Line two');
    expect(documentXml).toContain('<w:br');
    expect(documentXml).toContain('<w:tab');
  });

  it('exports paragraph tab stop settings', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: {
            tabStops: [
              { type: 'right', positionTwips: 4320, leader: 'dot' },
              { type: 'center', positionTwips: 2160 },
            ],
          },
          content: [
            { type: 'text', text: 'Label\tValue' },
          ],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:tabs');
    expect(documentXml).toContain('w:val="right"');
    expect(documentXml).toContain('w:pos="4320"');
    expect(documentXml).toContain('w:leader="dot"');
    expect(documentXml).toContain('w:val="center"');
    expect(documentXml).toContain('w:pos="2160"');
    expect(documentXml).toContain('<w:tab');
  });

  it('preserves semantic column breaks', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Before' }],
        },
        { type: 'columnBreak' },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'After' }],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:br');
    expect(documentXml).toContain('w:type="column"');
  });

  it('preserves semantic section breaks', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Before section' }],
        },
        {
          type: 'sectionBreak',
          attrs: {
            breakType: 'continuous',
            pageMargin: { top: 72, left: 96, right: 48, bottom: 60 },
            pageSize: { width: 1056, height: 816, orientation: 'landscape' },
            sectionColumns: { count: 2, space: 48, separate: true },
          },
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'After section' }],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect((documentXml.match(/<w:sectPr/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(documentXml).toContain('w:type');
    expect(documentXml).toContain('w:val="continuous"');
    expect(documentXml).toContain('w:pgSz');
    expect(documentXml).toContain('w:w="12240"');
    expect(documentXml).toContain('w:h="15840"');
    expect(documentXml).toContain('w:orient="landscape"');
    expect(documentXml).toContain('w:pgMar');
    expect(documentXml).toContain('w:top="1080"');
    expect(documentXml).toContain('w:left="1440"');
    expect(documentXml).toContain('w:right="720"');
    expect(documentXml).toContain('w:bottom="900"');
    expect(documentXml).toContain('w:cols');
    expect(documentXml).toContain('w:num="2"');
    expect(documentXml).toContain('w:space="720"');
    expect(documentXml).toContain('w:sep="true"');
  });

  it('exports paragraph indentation as DOCX indentation', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { indent: 2, firstLineIndent: 48, rightIndent: 24 },
          content: [{ type: 'text', text: 'Indented paragraph' }],
        },
        {
          type: 'paragraph',
          attrs: { indent: 1, hangingIndent: 24 },
          content: [{ type: 'text', text: 'Hanging paragraph' }],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:ind');
    expect(documentXml).toContain('w:left="1440"');
    expect(documentXml).toContain('w:firstLine="720"');
    expect(documentXml).toContain('w:right="360"');
    expect(documentXml).toContain('w:left="720"');
    expect(documentXml).toContain('w:hanging="360"');
  });

  it('exports paragraph spacing and line height to DOCX', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { lineHeight: 1.5, spaceBefore: 12, spaceAfter: 8 },
          content: [{ type: 'text', text: 'Spaced paragraph' }],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:spacing');
    expect(documentXml).toContain('w:line="360"');
    expect(documentXml).toContain('w:before="240"');
    expect(documentXml).toContain('w:after="160"');
  });

  it('exports exact paragraph line spacing rules to DOCX', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { lineHeightTwips: 480, lineHeightRule: 'exact' },
          content: [{ type: 'text', text: 'Exact line paragraph' }],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('Exact line paragraph');
    expect(documentXml).toContain('w:spacing');
    expect(documentXml).toContain('w:line="480"');
    expect(documentXml).toContain('w:lineRule="exact"');
  });

  it('exports paragraph pagination controls to DOCX', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: {
            pageBreakBefore: true,
            keepNext: true,
            keepLines: true,
            widowControl: true,
            contextualSpacing: true,
            suppressLineNumbers: true,
            bidirectional: true,
            wordWrap: true,
            overflowPunctuation: true,
            autoSpaceEastAsianText: true,
          },
          content: [{ type: 'text', text: 'Pinned paragraph' }],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('Pinned paragraph');
    expect(documentXml).toContain('w:pageBreakBefore');
    expect(documentXml).toContain('w:keepNext');
    expect(documentXml).toContain('w:keepLines');
    expect(documentXml).toContain('w:widowControl');
    expect(documentXml).toContain('w:contextualSpacing');
    expect(documentXml).toContain('w:suppressLineNumbers');
    expect(documentXml).toContain('w:bidi');
    expect(documentXml).toContain('w:wordWrap');
    expect(documentXml).toContain('w:overflowPunct');
    expect(documentXml).toContain('w:autoSpaceDN');
  });

  it('exports page left and right margins to DOCX section properties', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Margin export' }],
        },
      ],
    }, {
      pageMargin: { top: 72, left: 96, right: 48, bottom: 60 },
      pageSize: { width: 1056, height: 816, orientation: 'landscape' },
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('Margin export');
    expect(documentXml).toContain('w:pgSz');
    expect(documentXml).toContain('w:w="12240"');
    expect(documentXml).toContain('w:h="15840"');
    expect(documentXml).toContain('w:orient="landscape"');
    expect(documentXml).toContain('w:pgMar');
    expect(documentXml).toContain('w:top="1080"');
    expect(documentXml).toContain('w:left="1440"');
    expect(documentXml).toContain('w:right="720"');
    expect(documentXml).toContain('w:bottom="900"');
  });

  it('exports section columns to DOCX section properties', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Column export' }],
        },
      ],
    }, {
      sectionColumns: { count: 2, space: 48, separate: true },
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('Column export');
    expect(documentXml).toContain('w:cols');
    expect(documentXml).toContain('w:num="2"');
    expect(documentXml).toContain('w:space="720"');
    expect(documentXml).toContain('w:sep="true"');
  });

  it('exports ordered list start values as DOCX numbering starts', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          attrs: { start: 5 },
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Starts at five' }],
                },
              ],
            },
          ],
        },
      ],
    });

    const { documentXml, numberingXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:numPr');
    expect(numberingXml).toContain('w:start');
    expect(numberingXml).toContain('w:val="5"');
    expect(documentXml).toContain('Starts at five');
  });

  it('exports ordered list type values as DOCX numbering formats', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          attrs: { type: 'A' },
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Upper alpha item' }],
                },
              ],
            },
          ],
        },
        {
          type: 'orderedList',
          attrs: { type: 'I' },
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Upper roman item' }],
                },
              ],
            },
          ],
        },
      ],
    });

    const { documentXml, numberingXml } = await readDocxXml(blob);

    expect(documentXml).toContain('Upper alpha item');
    expect(documentXml).toContain('Upper roman item');
    expect(numberingXml).toContain('w:numFmt w:val="upperLetter"');
    expect(numberingXml).toContain('w:numFmt w:val="upperRoman"');
  });

  it('exports bullet list marker styles as DOCX bullet levels', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          attrs: { listStyleType: 'square', listIndentLeft: 1440, listIndentHanging: 360 },
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Square bullet' }],
                },
              ],
            },
          ],
        },
      ],
    });

    const { documentXml, numberingXml } = await readDocxXml(blob);

    expect(documentXml).toContain('Square bullet');
    expect(documentXml).toContain('w:numPr');
    expect(numberingXml).toContain('w:numFmt w:val="bullet"');
    expect(numberingXml).toContain('w:lvlText w:val="▪"');
    expect(numberingXml).toContain('w:left="1440"');
    expect(numberingXml).toContain('w:hanging="360"');
  });

  it('exports resized image dimensions to DOCX', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'image',
          attrs: {
            src: TINY_PNG_DATA_URL,
            width: 320,
            height: 200,
            align: 'right',
            floating: true,
            wrap: 'square',
            wrapSide: 'bothSides',
            alt: 'Tiny chart description',
            title: 'Tiny chart',
          },
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('wp:extent');
    expect(documentXml).toContain('cx="3048000"');
    expect(documentXml).toContain('cy="1905000"');
    expect(documentXml).toContain('w:jc w:val="right"');
    expect(documentXml).toContain('wp:anchor');
    expect(documentXml).toContain('wp:wrapSquare');
    expect(documentXml).toContain('wrapText="bothSides"');
    expect(documentXml).toContain('name="Tiny chart"');
    expect(documentXml).toContain('descr="Tiny chart description"');
    expect(documentXml).toContain('title="Tiny chart"');
  });

  it('exports text comments as DOCX comments', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Needs review',
              marks: [
                {
                  type: 'comment',
                  attrs: {
                    id: 'cm_a',
                    text: 'Please clarify this sentence.',
                    author: 'Reviewer',
                    createdAt: '2026-05-21T00:00:00.000Z',
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const { documentXml, commentsXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:commentRangeStart');
    expect(documentXml).toContain('w:commentRangeEnd');
    expect(documentXml).toContain('w:commentReference');
    expect(commentsXml).toContain('Reviewer');
    expect(commentsXml).toContain('Please clarify this sentence.');
  });

  it('exports paragraph background and side borders to DOCX', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: {
            paragraphBackgroundColor: '#FFF2CC',
            paragraphBorderTopColor: '#C00000',
            paragraphBorderTopSize: 12,
            paragraphBorderTopSpace: 3,
            paragraphBorderRightColor: '#00AA00',
            paragraphBorderRightSize: 16,
            paragraphBorderBottomColor: '#0000FF',
            paragraphBorderBottomSize: 20,
            paragraphBorderLeftColor: '#7030A0',
            paragraphBorderLeftSize: 24,
            paragraphBorderLeftSpace: 6,
          },
          content: [{ type: 'text', text: 'Decorated paragraph' }],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:pBdr');
    expect(documentXml).toContain('w:shd');
    expect(documentXml).toContain('w:fill="FFF2CC"');
    expect(documentXml).toContain('w:top');
    expect(documentXml).toContain('w:color="C00000"');
    expect(documentXml).toContain('w:sz="12"');
    expect(documentXml).toContain('w:space="3"');
    expect(documentXml).toContain('w:right');
    expect(documentXml).toContain('w:color="00AA00"');
    expect(documentXml).toContain('w:bottom');
    expect(documentXml).toContain('w:color="0000FF"');
    expect(documentXml).toContain('w:left');
    expect(documentXml).toContain('w:color="7030A0"');
    expect(documentXml).toContain('w:sz="24"');
    expect(documentXml).toContain('w:space="6"');
  });

  it('exports table cell background and width to DOCX', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'table',
          attrs: {
            tableWidth: 240,
            tableWidthType: 'px',
            tableColumnWidths: [80, 80],
            tableAlign: 'center',
            tableLayout: 'fixed',
            tableCellSpacing: 8,
          },
          content: [
            {
              type: 'tableRow',
              attrs: { rowHeight: 40, rowHeightRule: 'exact', rowHeader: true, rowCantSplit: true },
              content: [
                {
                  type: 'tableCell',
                  attrs: {
                    colspan: 1,
                    rowspan: 1,
                    colwidth: [160],
                    backgroundColor: '#FFEEAA',
                    borderColor: '#C00000',
                    borderSize: 16,
                    borderTopColor: '#00AA00',
                    borderTopSize: 24,
                    borderRightColor: '#FF9900',
                    borderRightSize: 20,
                    borderBottomColor: '#0000FF',
                    borderBottomSize: 8,
                    borderLeftColor: '#C00000',
                    borderLeftSize: 16,
                    verticalAlign: 'bottom',
                    textDirection: 'tbRl',
                    paddingTop: 8,
                    paddingRight: 16,
                    paddingBottom: 20,
                    paddingLeft: 24,
                  },
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Styled cell' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:shd');
    expect(documentXml).toContain('w:tblW');
    expect(documentXml).toContain('w:tblGrid');
    expect(documentXml).toContain('w:gridCol');
    expect(documentXml).toContain('w:type="dxa"');
    expect(documentXml).toContain('w:w="3600"');
    expect(documentXml).toContain('w:w="1200"');
    expect(documentXml).toContain('w:jc w:val="center"');
    expect(documentXml).toContain('w:tblLayout');
    expect(documentXml).toContain('w:type="fixed"');
    expect(documentXml).toContain('w:tblCellSpacing');
    expect(documentXml).toContain('w:w="120"');
    expect(documentXml).toContain('w:fill="FFEEAA"');
    expect(documentXml).toContain('w:tcW');
    expect(documentXml).toContain('w:w="2400"');
    expect(documentXml).toContain('w:tcBorders');
    expect(documentXml).toContain('w:color="C00000"');
    expect(documentXml).toContain('w:sz="16"');
    expect(documentXml).toContain('w:color="00AA00"');
    expect(documentXml).toContain('w:sz="24"');
    expect(documentXml).toContain('w:color="FF9900"');
    expect(documentXml).toContain('w:sz="20"');
    expect(documentXml).toContain('w:color="0000FF"');
    expect(documentXml).toContain('w:sz="8"');
    expect(documentXml).toContain('w:vAlign w:val="bottom"');
    expect(documentXml).toContain('w:textDirection w:val="tbRl"');
    expect(documentXml).toContain('w:tcMar');
    expect(documentXml).toContain('w:trHeight');
    expect(documentXml).toContain('w:val="600"');
    expect(documentXml).toContain('w:hRule="exact"');
    expect(documentXml).toContain('w:tblHeader');
    expect(documentXml).toContain('w:cantSplit');
    expect(documentXml).toContain('w:top w:type="dxa" w:w="120"');
    expect(documentXml).toContain('w:right w:type="dxa" w:w="240"');
    expect(documentXml).toContain('w:bottom w:type="dxa" w:w="300"');
    expect(documentXml).toContain('w:left w:type="dxa" w:w="360"');
  });

  it('exports vertically merged tables with valid continuation cells', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: { rowspan: 2 },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Merged' }] }],
                },
                {
                  type: 'tableCell',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Top right' }] }],
                },
              ],
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bottom right' }] }],
                },
              ],
            },
          ],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);
    const cells = documentXml.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) ?? [];
    const continuationCell = cells.find((cell) => cell.includes('<w:vMerge w:val="continue"'));

    expect(documentXml).toContain('<w:vMerge w:val="restart"');
    expect(continuationCell).toBeTruthy();
    expect(continuationCell).toContain('<w:p>');
  });

  it('exports resized and merged tables with a valid DOCX grid', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'table',
          attrs: {
            tableWidth: 474,
            tableWidthType: 'px',
            tableColumnWidths: [194, 140, 140],
            tableLayout: 'fixed',
            tableAlign: 'center',
          },
          content: [
            {
              type: 'tableRow',
              attrs: { rowHeight: 42, rowHeightRule: 'exact', rowHeader: true },
              content: [
                {
                  type: 'tableCell',
                  attrs: {
                    colspan: 2,
                    rowspan: 2,
                    colwidth: [194, 140],
                    backgroundColor: '#D9EAD3',
                    borderColor: '#38761D',
                    borderSize: 12,
                  },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Merged area' }] }],
                },
                {
                  type: 'tableCell',
                  attrs: { colwidth: [140], backgroundColor: '#CFE2F3' },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Side' }] }],
                },
              ],
            },
            {
              type: 'tableRow',
              attrs: { rowHeight: 36, rowHeightRule: 'atLeast' },
              content: [
                {
                  type: 'tableCell',
                  attrs: { colwidth: [140] },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Continuation side' }] }],
                },
              ],
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: { colwidth: [194] },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
                },
                {
                  type: 'tableCell',
                  attrs: { colwidth: [140] },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }],
                },
                {
                  type: 'tableCell',
                  attrs: { colwidth: [140] },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'C' }] }],
                },
              ],
            },
          ],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);
    const cells = documentXml.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) ?? [];
    const continuationCell = cells.find((cell) => cell.includes('<w:vMerge w:val="continue"'));

    expect(documentXml).toContain('<w:tblW w:type="dxa" w:w="7110"');
    expect(documentXml).toContain('<w:gridCol w:w="2910"');
    expect(documentXml).toContain('<w:gridCol w:w="2100"');
    expect(documentXml.match(/w:gridCol/g)).toHaveLength(3);
    expect(documentXml).toContain('<w:gridSpan w:val="2"');
    expect(documentXml).toContain('<w:tcW w:type="dxa" w:w="5010"');
    expect(documentXml).toContain('<w:vMerge w:val="restart"');
    expect(continuationCell).toBeTruthy();
    expect(continuationCell).toContain('<w:gridSpan w:val="2"');
    expect(continuationCell).toContain('<w:p>');
    expect(documentXml).toContain('<w:trHeight w:val="630" w:hRule="exact"');
    expect(documentXml).toContain('<w:trHeight w:val="540" w:hRule="atLeast"');
    expect(documentXml).toContain('<w:tblHeader');
    expect(documentXml).toContain('w:fill="D9EAD3"');
    expect(documentXml).toContain('w:color="38761D"');
  });

  it('infers DOCX table grid widths from resized cell colwidths', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'table',
          attrs: { tableLayout: 'fixed' },
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: { colwidth: [120] },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
                },
                {
                  type: 'tableCell',
                  attrs: { colwidth: [220] },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }],
                },
              ],
            },
          ],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:tblGrid');
    expect(documentXml).toContain('w:gridCol w:w="1800"');
    expect(documentXml).toContain('w:gridCol w:w="3300"');
  });

  it('fills missing DOCX table grid widths when only one resized column has colwidth', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'table',
          attrs: { tableLayout: 'fixed' },
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: { colwidth: [258] },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
                },
                {
                  type: 'tableCell',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }],
                },
                {
                  type: 'tableCell',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'C' }] }],
                },
              ],
            },
          ],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:gridCol w:w="3870"');
    expect(documentXml.match(/w:gridCol/g)).toHaveLength(3);
  });

  it('repairs short tableColumnWidths attrs before writing DOCX table grid', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'table',
          attrs: { tableLayout: 'fixed', tableColumnWidths: [90] },
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
                },
                {
                  type: 'tableCell',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }],
                },
                {
                  type: 'tableCell',
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'C' }] }],
                },
              ],
            },
          ],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:gridCol w:w="1350"');
    expect(documentXml.match(/w:gridCol/g)).toHaveLength(3);
  });

  it('maps CSS font stacks to DOCX ascii, hAnsi, eastAsia, and cs fonts', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '한글 English',
              marks: [{
                type: 'textStyle',
                attrs: {
                  fontFamily: '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
                  complexScriptFontFamily: 'Arial',
                },
              }],
            },
          ],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:ascii="Malgun Gothic"');
    expect(documentXml).toContain('w:hAnsi="Malgun Gothic"');
    expect(documentXml).toContain('w:eastAsia="Malgun Gothic"');
    expect(documentXml).toContain('w:cs="Arial"');
  });

  it('exports mixed Korean font stacks with paragraph spacing, indents, and tabs', async () => {
    const blob = await exportDocxBlobFromJson({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: {
            lineHeight: 1.15,
            spaceBefore: 12,
            spaceAfter: 18,
            firstLineIndent: 36,
            rightIndent: 24,
            tabStops: [
              { type: 'left', positionTwips: 720 },
              { type: 'center', positionTwips: 2880, leader: 'dot' },
              { type: 'right', positionTwips: 5760, leader: 'underscore' },
            ],
          },
          content: [
            {
              type: 'text',
              text: 'Mixed font paragraph\tcenter\tright',
              marks: [{
                type: 'textStyle',
                attrs: {
                  fontFamily: '"Noto Serif CJK KR", Batang, serif',
                  complexScriptFontFamily: 'Times New Roman',
                  fontSize: '18px',
                },
              }],
            },
          ],
        },
        {
          type: 'paragraph',
          attrs: { indent: 1, hangingIndent: 24 },
          content: [{ type: 'text', text: 'Hanging paragraph' }],
        },
      ],
    });

    const { documentXml } = await readDocxXml(blob);

    expect(documentXml).toContain('w:ascii="Noto Serif CJK KR"');
    expect(documentXml).toContain('w:hAnsi="Noto Serif CJK KR"');
    expect(documentXml).toContain('w:eastAsia="Noto Serif CJK KR"');
    expect(documentXml).toContain('w:cs="Times New Roman"');
    expect(documentXml).toContain('w:sz w:val="27"');
    expect(documentXml).toContain('w:line="276"');
    expect(documentXml).toContain('w:before="240"');
    expect(documentXml).toContain('w:after="360"');
    expect(documentXml).toContain('w:firstLine="540"');
    expect(documentXml).toContain('w:right="360"');
    expect(documentXml).toContain('w:tabs');
    expect(documentXml).toContain('w:val="left"');
    expect(documentXml).toContain('w:pos="720"');
    expect(documentXml).toContain('w:val="center"');
    expect(documentXml).toContain('w:pos="2880"');
    expect(documentXml).toContain('w:leader="dot"');
    expect(documentXml).toContain('w:val="right"');
    expect(documentXml).toContain('w:pos="5760"');
    expect(documentXml).toContain('w:leader="underscore"');
    expect(documentXml).toContain('w:left="720"');
    expect(documentXml).toContain('w:hanging="360"');
    expect(documentXml).toContain('<w:tab');
  });
});
