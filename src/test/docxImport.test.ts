import { describe, expect, it } from 'vitest';
import {
  AlignmentType,
  Bookmark,
  BorderStyle,
  Document,
  FootnoteReferenceRun,
  EndnoteReferenceRun,
  Footer,
  HeightRule,
  Header,
  HeadingLevel,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  InternalHyperlink,
  Packer,
  PageBreak,
  ColumnBreak,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  Tab,
  TabStopType,
  LeaderType,
  LineRuleType,
  UnderlineType,
  TextDirection,
  Textbox,
  TextRun,
  InsertedTextRun,
  DeletedTextRun,
  SimpleField,
  SectionType,
  Math as DocxMath,
  MathRun,
  TextWrappingSide,
  TextWrappingType,
  TextEffect,
  EmphasisMarkType,
  TableLayoutType,
  VerticalAlignTable,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
  WidthType,
} from 'docx';
import JSZip from 'jszip';
import { exportDocxBlobFromJson, importDocxFile } from '@/lib/cloudDoc/docx';

const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l5NrzwAAAABJRU5ErkJggg==';

function tinyPngBytes(): Uint8Array {
  const binary = atob(TINY_PNG_BASE64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function makeFootnoteDocx(): Promise<File> {
  const doc = new Document({
    footnotes: {
      '1': {
        children: [new Paragraph({ children: [new TextRun('Footnote body')] })],
      },
    },
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun('Hello'),
              new FootnoteReferenceRun(1),
              new TextRun(' world'),
            ],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'footnote.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeEndnoteDocx(): Promise<File> {
  const doc = new Document({
    endnotes: {
      '1': {
        children: [new Paragraph({ children: [new TextRun('Endnote body')] })],
      },
    },
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun('Hello'),
              new EndnoteReferenceRun(1) as unknown as TextRun,
              new TextRun(' world'),
            ],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'endnote.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeTocDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new SimpleField('TOC \\o "1-3" \\h \\z \\u', 'Heading 1\t1')],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun('Heading 1')],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'toc.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeHeadingLevelsDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_4,
            children: [new TextRun('Heading 4')],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_5,
            children: [new TextRun('Heading 5')],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_6,
            children: [new TextRun('Heading 6')],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'heading-levels.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeOutlineLevelHeadingDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun('Custom outline heading')] }),
          new Paragraph({ children: [new TextRun('Body text')] }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');
  if (!documentXml) throw new Error('Missing DOCX document XML');
  zip.file(
    'word/document.xml',
    documentXml.replace(
      '<w:p>',
      '<w:p><w:pPr><w:outlineLvl w:val="2"/></w:pPr>',
    ),
  );
  const patched = await zip.generateAsync({ type: 'uint8array' });
  return new File([patched], 'outline-heading.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeParagraphStyleFormattingDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun('Styled paragraph')] }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');
  const stylesXml = await zip.file('word/styles.xml')?.async('string');
  if (!documentXml || !stylesXml) throw new Error('Missing DOCX style fixtures');
  zip.file(
    'word/document.xml',
    documentXml.replace(
      '<w:p>',
      '<w:p><w:pPr><w:pStyle w:val="CompatBody"/></w:pPr>',
    ),
  );
  zip.file(
    'word/styles.xml',
    stylesXml.replace(
      '</w:styles>',
      `<w:style w:type="paragraph" w:styleId="CompatBody">
        <w:name w:val="Compat Body"/>
        <w:pPr>
          <w:basedOn w:val="Normal"/>
          <w:jc w:val="center"/>
          <w:ind w:left="1440" w:right="720" w:firstLine="360"/>
          <w:spacing w:before="240" w:after="120" w:line="360" w:lineRule="auto"/>
          <w:keepNext/>
          <w:outlineLvl w:val="1"/>
          <w:shd w:fill="D9EAF7"/>
          <w:pBdr><w:left w:val="single" w:sz="8" w:space="4" w:color="4472C4"/></w:pBdr>
        </w:pPr>
      </w:style></w:styles>`,
    ),
  );
  const patched = await zip.generateAsync({ type: 'uint8array' });
  return new File([patched], 'paragraph-style-formatting.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeMathDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun('Equation: '),
              new DocxMath({ children: [new MathRun('x+1')] }),
            ],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'math.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makePageBreakDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun('Before'),
              new PageBreak(),
              new TextRun('After'),
            ],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'page-break.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeSoftBreakAndTabDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun('Line one'),
              new TextRun({ text: '', break: 1 }),
              new TextRun('Line two'),
              new TextRun({ children: ['Name', new Tab(), 'Value'] }),
            ],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'soft-break-tab.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeParagraphTabsDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            tabStops: [
              { type: TabStopType.RIGHT, position: 4320, leader: LeaderType.DOT },
              { type: TabStopType.CENTER, position: 2160 },
            ],
            children: [
              new TextRun({ children: ['Label', new Tab(), 'Value'] }),
            ],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'paragraph-tabs.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeColumnBreakDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        properties: {
          column: { count: 2 },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun('Before'),
              new ColumnBreak(),
              new TextRun('After'),
            ],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'column-break.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeSectionBreakDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        properties: {
          type: SectionType.CONTINUOUS,
          page: {
            size: { width: 15840, height: 12240, orientation: 'landscape' },
            margin: { top: 1080, left: 1440, right: 720, bottom: 900 },
          },
          column: { count: 2, space: 720, separate: true },
        },
        children: [new Paragraph({ children: [new TextRun('Before section')] })],
      },
      {
        children: [new Paragraph({ children: [new TextRun('After section')] })],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'section-break.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeTrackedChangesDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun('Before '),
              new InsertedTextRun({
                text: 'inserted',
                id: 1,
                author: 'Alice',
                date: '2026-05-20T00:00:00Z',
              }),
              new DeletedTextRun({
                text: 'deleted',
                id: 2,
                author: 'Bob',
                date: '2026-05-20T00:00:00Z',
              }),
              new TextRun(' after'),
            ],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'tracked.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeImageDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new ImageRun({
                data: tinyPngBytes(),
                transformation: { width: 320, height: 200 },
                floating: {
                  horizontalPosition: {
                    relative: HorizontalPositionRelativeFrom.MARGIN,
                    align: HorizontalPositionAlign.RIGHT,
                  },
                  verticalPosition: {
                    relative: VerticalPositionRelativeFrom.PARAGRAPH,
                    align: VerticalPositionAlign.TOP,
                  },
                  wrap: { type: TextWrappingType.SQUARE, side: TextWrappingSide.BOTH_SIDES },
                },
                type: 'png',
                altText: {
                  name: 'Tiny chart',
                  description: 'Tiny chart description',
                  title: 'Tiny chart',
                },
              } as ConstructorParameters<typeof ImageRun>[0]),
            ],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'image.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeIndentedDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            indent: { left: 1440 },
            children: [new TextRun('Indented paragraph')],
          }),
          new Paragraph({
            indent: { firstLine: 720 },
            children: [new TextRun('First line paragraph')],
          }),
          new Paragraph({
            indent: { left: 720, hanging: 360, right: 720 },
            children: [new TextRun('Hanging paragraph')],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'indented.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeSpacedParagraphDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            spacing: { before: 240, after: 160, line: 360 },
            children: [new TextRun('Spaced paragraph')],
          }),
          new Paragraph({
            spacing: { line: 480, lineRule: LineRuleType.EXACT },
            children: [new TextRun('Exact line paragraph')],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'spaced.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makePaginationParagraphDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
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
            children: [new TextRun('Pinned paragraph')],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  const zip = await JSZip.loadAsync(buffer);
  const documentFile = zip.file('word/document.xml');
  if (!documentFile) {
    throw new Error('Missing DOCX document XML');
  }
  const documentXml = await documentFile.async('string');
  zip.file('word/document.xml', documentXml.replace(/<w:pPr>/, '<w:pPr><w:wordWrap/>'));
  const patchedBuffer = await zip.generateAsync({ type: 'uint8array' });
  return new File([patchedBuffer], 'pagination.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeAlignedParagraphDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun('Centered paragraph')],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun('Right paragraph')],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [new TextRun('Justified paragraph')],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'aligned.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makePageMarginDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 15840, height: 12240, orientation: 'landscape' },
            margin: { top: 1080, left: 1440, right: 720, bottom: 900 },
          },
        },
        children: [
          new Paragraph({
            children: [new TextRun('Margin paragraph')],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'page-margin.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeSectionColumnsDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        properties: {
          column: { count: 2, space: 720, separate: true },
        },
        children: [
          new Paragraph({
            children: [new TextRun('Column paragraph')],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'columns.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeStyledRunDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun('Before '),
              new TextRun({
                text: 'styled run',
                bold: true,
                italics: true,
                underline: { type: UnderlineType.DOUBLE, color: '00AA00' },
                strike: true,
                superScript: true,
                color: 'C00000',
                font: 'Courier New',
                size: 32,
                shading: { fill: 'FFF59D' },
                smallCaps: true,
                characterSpacing: 80,
                scale: 80,
                position: '6pt',
              }),
              new TextRun({
                text: ' caps',
                allCaps: true,
              }),
              new TextRun({
                text: ' hidden',
                vanish: true,
              }),
              new TextRun({
                text: ' double',
                doubleStrike: true,
              }),
              new TextRun({
                text: ' embossed',
                emboss: true,
              }),
              new TextRun({
                text: ' imprint',
                imprint: true,
              }),
              new TextRun({
                text: ' shimmer',
                effect: TextEffect.SHIMMER,
              }),
              new TextRun({
                text: ' language',
                language: { value: 'en-US', eastAsia: 'ko-KR', bidirectional: 'ar-SA' },
              }),
              new TextRun({
                text: ' rtl',
                kern: 24,
                rightToLeft: true,
              }),
              new TextRun({
                text: ' proof',
                noProof: true,
                snapToGrid: true,
                emphasisMark: { type: EmphasisMarkType.DOT },
              }),
              new TextRun({
                text: ' bordered',
                border: { style: BorderStyle.SINGLE, color: 'C00000', size: 12, space: 2 },
              }),
              new TextRun({
                text: ' complex',
                boldComplexScript: true,
                italicsComplexScript: true,
                sizeComplexScript: 28,
                highlightComplexScript: 'cyan',
                font: { cs: 'Arial' },
              }),
              new TextRun({
                text: ' mathrun',
                math: true,
              }),
              new TextRun(' after'),
            ],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'styled-run.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeDecoratedParagraphDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            shading: { fill: 'FFF2CC' },
            border: {
              top: { style: BorderStyle.SINGLE, size: 12, color: 'C00000', space: 3 },
              right: { style: BorderStyle.SINGLE, size: 16, color: '00AA00', space: 4 },
              bottom: { style: BorderStyle.SINGLE, size: 20, color: '0000FF', space: 5 },
              left: { style: BorderStyle.SINGLE, size: 24, color: '7030A0', space: 6 },
            },
            children: [new TextRun('Decorated paragraph')],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'decorated-paragraph.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeInternalLinkDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new InternalHyperlink({
                anchor: 'Target_Section',
                children: [new TextRun('Jump to target')],
              }),
            ],
          }),
          new Paragraph({
            children: [
              new Bookmark({
                id: 'Target_Section',
                children: [new TextRun('Target section')],
              }),
            ],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'internal-link.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeHeaderFooterDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new ImageRun({
                    data: tinyPngBytes(),
                    transformation: { width: 32, height: 24 },
                    type: 'png',
                  }),
                  new TextRun('Right header'),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun('Header second line')],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun('Left footer '),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                  new TextRun(' / '),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES] }),
                ],
              }),
              new Table({
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ children: [new TextRun('Doc No')] })] }),
                      new TableCell({ children: [new Paragraph({ children: [new TextRun('D-001')] })] }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        },
        children: [new Paragraph({ children: [new TextRun('Body')] })],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'header-footer.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeTextBoxDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ children: [new TextRun('Before textbox')] }),
          new Textbox({
            children: [
              new Paragraph({ children: [new TextRun('Text box line one')] }),
              new Paragraph({ children: [new TextRun('Text box line two')] }),
            ],
            style: { width: '220pt', height: '60pt' },
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'textbox.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeStyledTableDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Table({
            width: { size: 3600, type: WidthType.DXA },
            columnWidths: [1200, 1200],
            alignment: AlignmentType.CENTER,
            layout: TableLayoutType.FIXED,
            cellSpacing: { value: 120, type: WidthType.DXA },
            rows: [
              new TableRow({
                height: { value: 600, rule: HeightRule.EXACT },
                tableHeader: true,
                cantSplit: true,
                children: [
                  new TableCell({
                    shading: { fill: 'FFEEAA' },
                    width: { size: 2400, type: WidthType.DXA },
                    verticalAlign: VerticalAlignTable.CENTER,
                    textDirection: TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
                    margins: {
                      marginUnitType: WidthType.DXA,
                      top: 120,
                      right: 240,
                      bottom: 300,
                      left: 360,
                    },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 16, color: 'C00000' },
                      bottom: { style: BorderStyle.SINGLE, size: 16, color: 'C00000' },
                      left: { style: BorderStyle.SINGLE, size: 16, color: 'C00000' },
                      right: { style: BorderStyle.SINGLE, size: 16, color: 'C00000' },
                    },
                    children: [new Paragraph({ children: [new TextRun('Styled cell')] })],
                  }),
                  new TableCell({
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 24, color: '00AA00' },
                      bottom: { style: BorderStyle.SINGLE, size: 8, color: '0000FF' },
                      left: { style: BorderStyle.SINGLE, size: 12, color: '7030A0' },
                      right: { style: BorderStyle.SINGLE, size: 20, color: 'FF9900' },
                    },
                    children: [new Paragraph({ children: [new TextRun('Side border cell')] })],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'styled-table.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeMergedTableDocx(): Promise<File> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    columnSpan: 2,
                    children: [new Paragraph({ children: [new TextRun('Wide header')] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun('Header side')] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    rowSpan: 2,
                    children: [new Paragraph({ children: [new TextRun('Tall cell')] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun('Top right')] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: 'D9EAF7' },
                    children: [new Paragraph({ children: [new TextRun('Bottom right')] })],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new File([new Uint8Array(buffer)], 'merged-table.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeCommentedDocx(): Promise<File> {
  const blob = await exportDocxBlobFromJson({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Before ' },
          {
            type: 'text',
            text: 'commented text',
            marks: [
              {
                type: 'comment',
                attrs: {
                  id: 'cm_import_test',
                  text: 'Review this phrase.',
                  author: 'Reviewer',
                  createdAt: '2026-05-21T00:00:00.000Z',
                },
              },
            ],
          },
          { type: 'text', text: ' after' },
        ],
      },
    ],
  });
  return new File([blob], 'commented.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeStartedOrderedListDocx(): Promise<File> {
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
                content: [{ type: 'text', text: 'Fifth item' }],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Sixth item' }],
              },
            ],
          },
        ],
      },
    ],
  });
  return new File([blob], 'started-list.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeNestedStartedOrderedListDocx(): Promise<File> {
  const blob = await exportDocxBlobFromJson({
    type: 'doc',
    content: [
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Parent item' }],
              },
              {
                type: 'orderedList',
                attrs: { start: 3 },
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Nested third item' }],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Nested fourth item' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
  return new File([blob], 'nested-started-list.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

async function makeSquareBulletListDocx(): Promise<File> {
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
                content: [{ type: 'text', text: 'Square bullet item' }],
              },
            ],
          },
        ],
      },
    ],
  });
  return new File([blob], 'square-bullet-list.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

describe('importDocxFile', () => {
  it('normalizes mammoth footnotes into editable footnote nodes', async () => {
    const result = await importDocxFile(await makeFootnoteDocx());

    expect(result.html).toContain('data-footnote');
    expect(result.html).toContain('data-footnote-text="Footnote body"');
    expect(result.html).toContain('data-footnote-id="fn_import_1"');
    expect(result.html).not.toContain('id="footnote-1"');
  });

  it('preserves DOCX endnotes as editable note nodes', async () => {
    const result = await importDocxFile(await makeEndnoteDocx());

    expect(result.html).toContain('data-endnote');
    expect(result.html).toContain('data-note-type="endnote"');
    expect(result.html).toContain('data-footnote-text="Endnote body"');
    expect(result.html).toContain('data-footnote-id="en_import_1"');
  });

  it('preserves DOCX table-of-contents fields as editable blocks', async () => {
    const result = await importDocxFile(await makeTocDocx());

    expect(result.html).toContain('data-docx-toc="true"');
    expect(result.html).toContain('data-docx-field-instruction="TOC \\o &quot;1-3&quot; \\h \\z \\u"');
    expect(result.html).toContain('Heading 1');
  });

  it('imports Word heading levels 4 through 6 as semantic headings', async () => {
    const result = await importDocxFile(await makeHeadingLevelsDocx());

    expect(result.html).toContain('<h4>Heading 4</h4>');
    expect(result.html).toContain('<h5>Heading 5</h5>');
    expect(result.html).toContain('<h6>Heading 6</h6>');
  });

  it('imports DOCX outline levels as semantic headings', async () => {
    const result = await importDocxFile(await makeOutlineLevelHeadingDocx());

    expect(result.html).toContain('<h3>Custom outline heading</h3>');
    expect(result.html).toContain('<p>Body text</p>');
  });

  it('imports paragraph formatting from DOCX styles', async () => {
    const result = await importDocxFile(await makeParagraphStyleFormattingDocx());

    expect(result.html).toContain('Styled paragraph');
    expect(result.html).toMatch(/<h2[^>]*>[\s\S]*Styled paragraph[\s\S]*<\/h2>/);
    expect(result.html).toContain('data-text-align="center"');
    expect(result.html).toContain('text-align: center');
    expect(result.html).toContain('data-indent="2"');
    expect(result.html).toContain('data-indent-first-line="24"');
    expect(result.html).toContain('data-indent-right="48"');
    expect(result.html).toContain('data-space-before="12"');
    expect(result.html).toContain('data-space-after="6"');
    expect(result.html).toContain('margin-top: 16px');
    expect(result.html).toContain('margin-bottom: 8px');
    expect(result.html).toContain('data-line-height="1.5"');
    expect(result.html).toContain('data-keep-next="true"');
    expect(result.html).toContain('background-color: #D9EAF7');
    expect(result.html).toContain('border-left: 1px solid #4472C4');
  });

  it('preserves DOCX OMML equations as editable inline math nodes', async () => {
    const result = await importDocxFile(await makeMathDocx());

    expect(result.html).toContain('data-docx-math="true"');
    expect(result.html).toContain('data-docx-omml=');
    expect(result.html).toContain('x+1');
  });

  it('restores page breaks that mammoth drops', async () => {
    const result = await importDocxFile(await makePageBreakDocx());

    expect(result.html).toContain('Before');
    expect(result.html).toContain('After');
    expect(result.html).toContain('data-page-break="true"');
    expect(result.html).toMatch(/<p>Before<\/p><div[^>]+data-page-break="true"[^>]*><\/div><p>After<\/p>/);
  });

  it('keeps soft line breaks and tabs inside paragraphs', async () => {
    const result = await importDocxFile(await makeSoftBreakAndTabDocx());

    expect(result.html).toContain('Line one');
    expect(result.html).toContain('Line two');
    expect(result.html).toMatch(/Line one<br\s*\/?>Line two/);
    expect(result.html).toContain('Name');
    expect(result.html).toContain('Value');
  });

  it('preserves paragraph tab stop settings', async () => {
    const result = await importDocxFile(await makeParagraphTabsDocx());
    const paragraph = new DOMParser()
      .parseFromString(`<body>${result.html}</body>`, 'text/html')
      .body
      .querySelector<HTMLElement>('p');
    const tabs = JSON.parse(decodeURIComponent(paragraph?.getAttribute('data-paragraph-tabs') ?? ''));

    expect(result.html).toContain('Label');
    expect(result.html).toContain('Value');
    expect(tabs).toEqual([
      { type: 'right', positionTwips: 4320, leader: 'dot' },
      { type: 'center', positionTwips: 2160 },
    ]);
  });

  it('restores column breaks that mammoth drops', async () => {
    const result = await importDocxFile(await makeColumnBreakDocx());

    expect(result.html).toContain('Before');
    expect(result.html).toContain('After');
    expect(result.html).toContain('data-column-break="true"');
    expect(result.html).toMatch(/<p>Before<\/p><div[^>]+data-column-break="true"[^>]*><\/div><p>After<\/p>/);
  });

  it('preserves DOCX section breaks as editable structure markers', async () => {
    const result = await importDocxFile(await makeSectionBreakDocx());

    expect(result.html).toContain('Before section');
    expect(result.html).toContain('After section');
    expect(result.html).toContain('data-section-break="true"');
    expect(result.html).toContain('data-section-break-type="continuous"');
    const marker = new DOMParser()
      .parseFromString(`<body>${result.html}</body>`, 'text/html')
      .body
      .querySelector<HTMLElement>('[data-section-break]');

    expect(JSON.parse(decodeURIComponent(marker?.getAttribute('data-section-page-margin') ?? ''))).toEqual({
      top: 72,
      left: 96,
      right: 48,
      bottom: 60,
    });
    expect(JSON.parse(decodeURIComponent(marker?.getAttribute('data-section-page-size') ?? ''))).toEqual({
      width: 1056,
      height: 816,
      orientation: 'landscape',
    });
    expect(JSON.parse(decodeURIComponent(marker?.getAttribute('data-section-columns') ?? ''))).toEqual({
      count: 2,
      space: 48,
      separate: true,
    });
  });

  it('preserves tracked insertions and deletions from DOCX revisions', async () => {
    const result = await importDocxFile(await makeTrackedChangesDocx());

    expect(result.html).toContain('data-revision-type="insert"');
    expect(result.html).toContain('data-revision-author="Alice"');
    expect(result.html).toContain('inserted');
    expect(result.html).toContain('data-revision-type="delete"');
    expect(result.html).toContain('data-revision-author="Bob"');
    expect(result.html).toContain('deleted');
  });

  it('restores image display dimensions that mammoth drops', async () => {
    const result = await importDocxFile(await makeImageDocx());

    expect(result.html).toContain('<img');
    expect(result.html).toContain('width="320"');
    expect(result.html).toContain('height="200"');
    expect(result.html).toContain('width: 320px');
    expect(result.html).toContain('height: 200px');
    expect(result.html).toContain('alt="Tiny chart description"');
    expect(result.html).toContain('title="Tiny chart"');
    expect(result.html).toContain('data-align="right"');
    expect(result.html).toContain('margin-left: auto');
    expect(result.html).toContain('data-floating="true"');
    expect(result.html).toContain('data-wrap="square"');
    expect(result.html).toContain('data-wrap-side="bothSides"');
  });

  it('restores paragraph indentation that mammoth drops', async () => {
    const result = await importDocxFile(await makeIndentedDocx());

    expect(result.html).toContain('Indented paragraph');
    expect(result.html).toContain('First line paragraph');
    expect(result.html).toContain('Hanging paragraph');
    expect(result.html).toContain('data-indent="2"');
    expect(result.html).toContain('data-indent-first-line="48"');
    expect(result.html).toContain('text-indent: 48px');
    expect(result.html).toContain('data-indent-hanging="24"');
    expect(result.html).toContain('text-indent: -24px');
    expect(result.html).toContain('data-indent-right="48"');
    expect(result.html).toContain('margin-right: 48px');
  });

  it('restores paragraph spacing and line height that mammoth drops', async () => {
    const result = await importDocxFile(await makeSpacedParagraphDocx());

    expect(result.html).toContain('Spaced paragraph');
    expect(result.html).toContain('data-line-height="1.5"');
    expect(result.html).toContain('line-height: 1.5');
    expect(result.html).toContain('data-space-before="12"');
    expect(result.html).toContain('data-space-after="8"');
    expect(result.html).toContain('Exact line paragraph');
    expect(result.html).toContain('data-line-height-rule="exact"');
    expect(result.html).toContain('data-line-height-twips="480"');
    expect(result.html).toContain('line-height: 32px');
  });

  it('restores paragraph pagination controls that mammoth drops', async () => {
    const result = await importDocxFile(await makePaginationParagraphDocx());

    expect(result.html).toContain('Pinned paragraph');
    expect(result.html).toContain('data-page-break-before="true"');
    expect(result.html).toContain('data-keep-next="true"');
    expect(result.html).toContain('data-keep-lines="true"');
    expect(result.html).toContain('data-widow-control="true"');
    expect(result.html).toContain('data-contextual-spacing="true"');
    expect(result.html).toContain('data-suppress-line-numbers="true"');
    expect(result.html).toContain('data-paragraph-bidi="true"');
    expect(result.html).toContain('data-word-wrap="true"');
    expect(result.html).toContain('data-overflow-punctuation="true"');
    expect(result.html).toContain('data-auto-space-east-asian-text="true"');
    expect(result.html).toContain('break-before: page');
    expect(result.html).toContain('break-after: avoid');
    expect(result.html).toContain('break-inside: avoid');
  });

  it('restores paragraph alignment that mammoth drops', async () => {
    const result = await importDocxFile(await makeAlignedParagraphDocx());

    expect(result.html).toContain('Centered paragraph');
    expect(result.html).toContain('Right paragraph');
    expect(result.html).toContain('Justified paragraph');
    expect(result.html).toMatch(/<p[^>]+data-text-align="center"[^>]*>Centered paragraph/);
    expect(result.html).toMatch(/<p[^>]+data-text-align="right"[^>]*>Right paragraph/);
    expect(result.html).toMatch(/<p[^>]+data-text-align="justify"[^>]*>Justified paragraph/);
    expect(result.html).toContain('text-align: center');
    expect(result.html).toContain('text-align: right');
    expect(result.html).toContain('text-align: justify');
  });

  it('restores page left and right margins from DOCX section properties', async () => {
    const result = await importDocxFile(await makePageMarginDocx());

    expect(result.html).toContain('Margin paragraph');
    expect(result.pageMargin).toEqual({ top: 72, left: 96, right: 48, bottom: 60 });
    expect(result.pageSize).toEqual({ width: 1056, height: 816, orientation: 'landscape' });
  });

  it('restores DOCX section column settings', async () => {
    const result = await importDocxFile(await makeSectionColumnsDocx());

    expect(result.html).toContain('Column paragraph');
    expect(result.sectionColumns).toEqual({ count: 2, space: 48, separate: true });
  });

  it('restores run-level font, size, color, and highlight that mammoth drops', async () => {
    const result = await importDocxFile(await makeStyledRunDocx());

    expect(result.html).toContain('Before');
    expect(result.html).toContain('styled run');
    expect(result.html).toContain('color: #C00000');
    expect(result.html).toContain('background-color: #FFF59D');
    expect(result.html).toContain('font-size: 21px');
    expect(result.html).toContain('Courier New');
    expect(result.html).toContain('data-docx-small-caps="true"');
    expect(result.html).toContain('font-variant-caps: small-caps');
    expect(result.html).toContain('data-docx-character-spacing="80"');
    expect(result.html).toContain('letter-spacing: 5px');
    expect(result.html).toContain('data-docx-text-scale="80"');
    expect(result.html).toContain('font-stretch: 80%');
    expect(result.html).toContain('data-docx-text-position="12"');
    expect(result.html).toContain('vertical-align: 8px');
    expect(result.html).toContain('data-docx-all-caps="true"');
    expect(result.html).toContain('text-transform: uppercase');
    expect(result.html).toContain('data-docx-hidden-text="true"');
    expect(result.html).toContain('opacity: 0.55');
    expect(result.html).toContain('data-docx-double-strike="true"');
    expect(result.html).toContain('data-docx-emboss="true"');
    expect(result.html).toContain('data-docx-imprint="true"');
    expect(result.html).toContain('data-docx-text-effect="shimmer"');
    expect(result.html).toContain('data-docx-lang="en-US"');
    expect(result.html).toContain('data-docx-east-asia-lang="ko-KR"');
    expect(result.html).toContain('data-docx-bidi-lang="ar-SA"');
    expect(result.html).toContain('data-docx-kerning="24"');
    expect(result.html).toContain('data-docx-rtl="true"');
    expect(result.html).toContain('dir="rtl"');
    expect(result.html).toContain('data-docx-no-proof="true"');
    expect(result.html).toContain('data-docx-snap-to-grid="true"');
    expect(result.html).toContain('data-docx-emphasis-mark="dot"');
    expect(result.html).toContain('data-docx-run-border-style="single"');
    expect(result.html).toContain('data-docx-run-border-color="#C00000"');
    expect(result.html).toContain('data-docx-run-border-size="12"');
    expect(result.html).toContain('data-docx-run-border-space="2"');
    expect(result.html).toContain('data-docx-cs-bold="true"');
    expect(result.html).toContain('data-docx-cs-italic="true"');
    expect(result.html).toContain('data-docx-cs-highlight="#00FFFF"');
    expect(result.html).toContain('data-docx-cs-font-family="Arial"');
    expect(result.html).toContain('data-docx-cs-font-size="19"');
    expect(result.html).toContain('data-docx-run-math="true"');
    expect(result.html).toContain('data-docx-underline-style="double"');
    expect(result.html).toContain('data-docx-underline-color="#00AA00"');
    expect(result.html).toContain('text-decoration-style: double');
    expect(result.html).toContain('text-decoration-color: #00AA00');
    expect(result.html).toContain('<strong');
    expect(result.html).toContain('<em');
    expect(result.html).toContain('<u');
    expect(result.html).toContain('<s');
    expect(result.html).toContain('<sup');
  });

  it('restores paragraph background and side borders that mammoth drops', async () => {
    const result = await importDocxFile(await makeDecoratedParagraphDocx());

    expect(result.html).toContain('Decorated paragraph');
    expect(result.html).toContain('data-paragraph-background="#FFF2CC"');
    expect(result.html).toContain('background-color: #FFF2CC');
    expect(result.html).toContain('data-paragraph-border-top-color="#C00000"');
    expect(result.html).toContain('data-paragraph-border-top-size="12"');
    expect(result.html).toContain('border-top: 2px solid #C00000');
    expect(result.html).toContain('data-paragraph-border-right-color="#00AA00"');
    expect(result.html).toContain('data-paragraph-border-bottom-color="#0000FF"');
    expect(result.html).toContain('data-paragraph-border-left-color="#7030A0"');
    expect(result.html).toContain('data-paragraph-border-left-space="6"');
    expect(result.html).toContain('padding-left: 6px');
  });

  it('restores DOCX bookmarks and internal hyperlinks', async () => {
    const result = await importDocxFile(await makeInternalLinkDocx());

    expect(result.html).toContain('Jump to target');
    expect(result.html).toContain('href="#Target_Section"');
    expect(result.html).toContain('Target section');
    expect(result.html).toContain('data-bookmark-id="Target_Section"');
    expect(result.html).toContain('id="Target_Section"');
  });

  it('restores header and footer alignment plus page-number metadata', async () => {
    const result = await importDocxFile(await makeHeaderFooterDocx());

    expect(result.headerText).toBe('Right header\nHeader second line');
    expect(result.footerText).toContain('Left footer');
    expect(result.footerText).toContain('Doc No | D-001');
    expect(result.headerImages).toHaveLength(1);
    expect(result.headerImages?.[0]).toMatchObject({ width: 32, height: 24, align: 'right' });
    expect(result.headerImages?.[0].src).toContain('data:image/png;base64,');
    expect(result.headerAlign).toBe('right');
    expect(result.footerAlign).toBe('left');
    expect(result.footerHasPageNumber).toBe(true);
    expect(result.pageNumberPlacement).toBe('footer');
  });

  it('restores text boxes that mammoth drops as editable blocks', async () => {
    const result = await importDocxFile(await makeTextBoxDocx());

    expect(result.html).toContain('Before textbox');
    expect(result.html).toContain('data-docx-textbox="true"');
    expect(result.html).toContain('Text box line one');
    expect(result.html).toContain('Text box line two');
  });

  it('restores table cell background and width that mammoth drops', async () => {
    const result = await importDocxFile(await makeStyledTableDocx());

    expect(result.html).toContain('Styled cell');
    expect(result.html).toContain('data-table-width="240"');
    expect(result.html).toContain('data-table-width-type="px"');
    expect(result.html).toContain('data-table-column-widths="80,80"');
    expect(result.html).toContain('data-table-align="center"');
    expect(result.html).toContain('data-table-layout="fixed"');
    expect(result.html).toContain('data-table-cell-spacing="8"');
    expect(result.html).toContain('width: 240px');
    expect(result.html).toContain('margin-left: auto');
    expect(result.html).toContain('table-layout: fixed');
    expect(result.html).toContain('border-spacing: 8px');
    expect(result.html).toContain('data-cell-background="#FFEEAA"');
    expect(result.html).toContain('background-color: #FFEEAA');
    expect(result.html).toContain('colwidth="160"');
    expect(result.html).toContain('colwidth="80"');
    expect(result.html).toContain('data-cell-border-color="#C00000"');
    expect(result.html).toContain('data-cell-border-size="16"');
    expect(result.html).toContain('border: 3px solid #C00000');
    expect(result.html).toContain('Side border cell');
    expect(result.html).toContain('data-cell-border-top-color="#00AA00"');
    expect(result.html).toContain('data-cell-border-top-size="24"');
    expect(result.html).toContain('border-top: 4px solid #00AA00');
    expect(result.html).toContain('data-cell-border-bottom-color="#0000FF"');
    expect(result.html).toContain('data-cell-border-bottom-size="8"');
    expect(result.html).toContain('border-bottom: 1px solid #0000FF');
    expect(result.html).toContain('data-cell-border-left-color="#7030A0"');
    expect(result.html).toContain('data-cell-border-right-color="#FF9900"');
    expect(result.html).toContain('data-cell-vertical-align="center"');
    expect(result.html).toContain('vertical-align: middle');
    expect(result.html).toContain('data-cell-text-direction="tbRl"');
    expect(result.html).toContain('writing-mode: vertical-rl');
    expect(result.html).toContain('data-cell-padding-top="8"');
    expect(result.html).toContain('data-cell-padding-right="16"');
    expect(result.html).toContain('data-cell-padding-bottom="20"');
    expect(result.html).toContain('data-cell-padding-left="24"');
    expect(result.html).toContain('padding-left: 24px');
    expect(result.html).toContain('data-row-height="40"');
    expect(result.html).toContain('data-row-height-rule="exact"');
    expect(result.html).toContain('data-row-header="true"');
    expect(result.html).toContain('data-row-cant-split="true"');
    expect(result.html).toContain('height: 40px');
  });

  it('keeps merged table cells and styles cells after vertical merges', async () => {
    const result = await importDocxFile(await makeMergedTableDocx());

    expect(result.html).toContain('Wide header');
    expect(result.html).toContain('Tall cell');
    expect(result.html).toContain('Bottom right');
    expect(result.html).toContain('colspan="2"');
    expect(result.html).toContain('rowspan="2"');
    expect(result.html).toMatch(/<td[^>]*data-cell-background="#D9EAF7"[^>]*>[\s\S]*Bottom right/);
  });

  it('restores DOCX comments as editable comment marks', async () => {
    const result = await importDocxFile(await makeCommentedDocx());

    expect(result.html).toContain('Before');
    expect(result.html).toContain('commented text');
    expect(result.html).toContain('data-comment-id="cm_import_');
    expect(result.html).toContain('data-comment-text="Review this phrase."');
    expect(result.html).toContain('data-comment-author="Reviewer"');
    expect(result.html).toMatch(/<span[^>]+data-comment-id="cm_import_[^"]+"[^>]*>commented text<\/span>/);
  });

  it('restores ordered list start values that mammoth drops', async () => {
    const result = await importDocxFile(await makeStartedOrderedListDocx());

    expect(result.html).toContain('Fifth item');
    expect(result.html).toContain('Sixth item');
    expect(result.html).toMatch(/<ol[^>]+start="5"[^>]*>/);
  });

  it('restores nested ordered list start values and formats', async () => {
    const result = await importDocxFile(await makeNestedStartedOrderedListDocx());

    expect(result.html).toContain('Parent item');
    expect(result.html).toContain('Nested third item');
    expect(result.html).toContain('Nested fourth item');
    expect(result.html).toMatch(/<ol[^>]+type="a"[^>]+start="3"[^>]*>|<ol[^>]+start="3"[^>]+type="a"[^>]*>/);
  });

  it('restores bullet list marker styles', async () => {
    const result = await importDocxFile(await makeSquareBulletListDocx());

    expect(result.html).toContain('Square bullet item');
    expect(result.html).toContain('data-list-style-type="square"');
    expect(result.html).toContain('list-style-type: square');
    expect(result.html).toContain('data-list-indent-left="1440"');
    expect(result.html).toContain('data-list-indent-hanging="360"');
    expect(result.html).toContain('padding-left: 96px');
  });
});
