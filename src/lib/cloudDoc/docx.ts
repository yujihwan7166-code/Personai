/**
 * 문서 ↔ .docx 호환.
 *
 * Import: mammoth (.docx → HTML) → TipTap setContent (HTML)
 * Export: TipTap ProseMirror JSON → docx 라이브러리 → blob 다운로드
 *
 * 한계 (메모리 정책 — 100% 충실도 X, 알려진 손실 인정):
 *  - 표: cells + 정렬·서식 일부 보존, 너비는 균등
 *  - 이미지: data URL (base64) 만 export — 외부 URL 은 CORS 로 fetch 불가
 *  - 글꼴 종류·정확한 색 일부 손실 가능
 *  - mammoth 의 한계: 매크로·복잡한 스타일·SmartArt 무시
 */

import mammoth from 'mammoth';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, ImageRun, WidthType, BorderStyle,
} from 'docx';

// ─────────────────────────────────────────────
// Import — .docx → HTML
// ─────────────────────────────────────────────

export async function importDocxFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  return result.value;
}

// ─────────────────────────────────────────────
// Export — ProseMirror JSON → .docx 다운로드
// ─────────────────────────────────────────────

interface PMNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

export async function exportDocxFromJson(json: unknown, fileName: string): Promise<void> {
  const root = json as PMNode | null;
  const sectionChildren: Array<Paragraph | Table> = [];
  for (const block of root?.content ?? []) {
    flattenBlock(block, sectionChildren, {});
  }
  if (sectionChildren.length === 0) {
    sectionChildren.push(new Paragraph({ children: [new TextRun('')] }));
  }
  const doc = new Document({
    sections: [{ children: sectionChildren }],
  });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, fileName.endsWith('.docx') ? fileName : `${fileName}.docx`);
}

interface FlattenOpts {
  listPrefix?: string;
  quote?: boolean;
}

function flattenBlock(block: PMNode, out: Array<Paragraph | Table>, opts: FlattenOpts): void {
  if (!block.type) return;

  if (block.type === 'paragraph' || block.type === 'heading') {
    const runs = inlinesToRuns(block.content ?? []);
    const finalRuns: Array<TextRun | ImageRun> = opts.listPrefix
      ? [new TextRun(opts.listPrefix), ...runs]
      : runs;
    if (finalRuns.length === 0) finalRuns.push(new TextRun(''));
    out.push(new Paragraph({
      children: finalRuns,
      heading: block.type === 'heading' ? headingFor(block.attrs?.level as number | undefined) : undefined,
      alignment: alignmentFor(block.attrs?.textAlign as string | undefined),
      indent: opts.quote ? { left: 720 } : undefined,
    }));
    return;
  }

  if (block.type === 'bulletList') {
    for (const item of block.content ?? []) {
      for (const child of item.content ?? []) {
        flattenBlock(child, out, { listPrefix: '• ', quote: opts.quote });
      }
    }
    return;
  }

  if (block.type === 'orderedList') {
    let n = 1;
    for (const item of block.content ?? []) {
      for (const child of item.content ?? []) {
        flattenBlock(child, out, { listPrefix: `${n}. `, quote: opts.quote });
      }
      n++;
    }
    return;
  }

  if (block.type === 'blockquote') {
    for (const child of block.content ?? []) {
      flattenBlock(child, out, { ...opts, quote: true });
    }
    return;
  }

  if (block.type === 'horizontalRule') {
    out.push(new Paragraph({
      children: [new TextRun('────────────────────')],
    }));
    return;
  }

  if (block.type === 'codeBlock') {
    const text = (block.content ?? []).map((n) => n.text ?? '').join('');
    out.push(new Paragraph({
      children: [new TextRun({ text, font: 'Courier New' })],
    }));
    return;
  }

  if (block.type === 'image') {
    const img = imageRunFromAttrs(block.attrs);
    if (img) {
      out.push(new Paragraph({
        children: [img],
        alignment: AlignmentType.CENTER,
      }));
    } else {
      // base64 가 아니면 placeholder
      const alt = (block.attrs?.alt as string | undefined) ?? '이미지';
      out.push(new Paragraph({
        children: [new TextRun({ text: `[${alt}]`, italics: true, color: '888888' })],
      }));
    }
    return;
  }

  if (block.type === 'table') {
    out.push(buildTable(block));
    return;
  }

  // 그 외 — 자식이 있으면 재귀
  if (block.content) {
    for (const child of block.content) {
      flattenBlock(child, out, opts);
    }
  }
}

// ─────────────────────────────────────────────
// 표
// ─────────────────────────────────────────────

const TABLE_BORDER = {
  style: BorderStyle.SINGLE,
  size: 4,           // 1/8 pt 단위 → 0.5pt
  color: 'CCCCCC',
};

function buildTable(block: PMNode): Table {
  const rows: TableRow[] = [];
  for (const row of block.content ?? []) {
    if (row.type !== 'tableRow') continue;
    const cells: TableCell[] = [];
    for (const cell of row.content ?? []) {
      if (cell.type !== 'tableCell' && cell.type !== 'tableHeader') continue;
      const innerOut: Array<Paragraph | Table> = [];
      for (const child of cell.content ?? []) {
        flattenBlock(child, innerOut, {});
      }
      // docx TableCell children 은 Paragraph | Table 만
      const safeChildren: Array<Paragraph | Table> = innerOut.length > 0
        ? innerOut
        : [new Paragraph({ children: [new TextRun('')] })];
      const colspan = (cell.attrs?.colspan as number | undefined) ?? 1;
      const rowspan = (cell.attrs?.rowspan as number | undefined) ?? 1;
      cells.push(new TableCell({
        children: safeChildren,
        columnSpan: colspan > 1 ? colspan : undefined,
        rowSpan: rowspan > 1 ? rowspan : undefined,
        // header cell 은 회색 배경
        shading: cell.type === 'tableHeader'
          ? { fill: 'F3F3F3' }
          : undefined,
      }));
    }
    if (cells.length > 0) rows.push(new TableRow({ children: cells }));
  }
  return new Table({
    rows: rows.length > 0
      ? rows
      : [new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun('')] })] })] })],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: TABLE_BORDER, bottom: TABLE_BORDER, left: TABLE_BORDER, right: TABLE_BORDER,
      insideHorizontal: TABLE_BORDER, insideVertical: TABLE_BORDER,
    },
  });
}

// ─────────────────────────────────────────────
// 이미지
// ─────────────────────────────────────────────

/** TipTap image attrs → ImageRun. data URL 만 처리 (외부 URL 은 CORS) */
function imageRunFromAttrs(attrs: Record<string, unknown> | undefined): ImageRun | null {
  if (!attrs) return null;
  const src = attrs.src as string | undefined;
  if (!src || !src.startsWith('data:image/')) return null;
  const m = src.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
  if (!m) return null;
  let type: 'png' | 'jpg' | 'gif' | 'bmp' = 'png';
  const ext = m[1].toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') type = 'jpg';
  else if (ext === 'gif') type = 'gif';
  else if (ext === 'bmp') type = 'bmp';
  else if (ext === 'png') type = 'png';
  else return null; // svg 등은 미지원

  const binary = atob(m[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  // 크기: width/height attr (또는 원본). 없으면 480×360 기본
  const w = numericAttr(attrs.width) ?? 480;
  const h = numericAttr(attrs.height) ?? Math.round(w * 0.75);

  return new ImageRun({
    type,
    data: bytes,
    transformation: { width: w, height: h },
  } as ConstructorParameters<typeof ImageRun>[0]);
}

function numericAttr(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const m = v.match(/^(\d+(?:\.\d+)?)(?:px)?$/);
    if (m) return Number(m[1]);
  }
  return undefined;
}

function inlinesToRuns(content: PMNode[]): Array<TextRun | ImageRun> {
  const runs: Array<TextRun | ImageRun> = [];
  for (const node of content) {
    if (node.type === 'text' && node.text) {
      const marks = node.marks ?? [];
      const bold = marks.some((m) => m.type === 'bold');
      const italic = marks.some((m) => m.type === 'italic');
      const underline = marks.some((m) => m.type === 'underline');
      const strike = marks.some((m) => m.type === 'strike');
      const code = marks.some((m) => m.type === 'code');
      const colorMark = marks.find((m) => m.type === 'textStyle');
      const color = colorMark?.attrs?.color as string | undefined;
      const fontSize = colorMark?.attrs?.fontSize as string | undefined;

      runs.push(new TextRun({
        text: node.text,
        bold,
        italics: italic,
        underline: underline ? {} : undefined,
        strike,
        font: code ? 'Courier New' : (colorMark?.attrs?.fontFamily as string | undefined),
        color: normalizeColor(color),
        size: fontSize ? parsePtFromPx(fontSize) : undefined,
      }));
    } else if (node.type === 'hardBreak') {
      runs.push(new TextRun({ text: '', break: 1 }));
    } else if (node.type === 'image') {
      // 인라인 이미지 (Image extension inline:true 인 경우)
      const img = imageRunFromAttrs(node.attrs);
      if (img) runs.push(img);
    }
  }
  return runs;
}

function normalizeColor(c: string | undefined): string | undefined {
  if (!c) return undefined;
  // hex만 처리 (docx는 RRGGBB 형식)
  if (c.startsWith('#')) {
    return c.slice(1).toUpperCase();
  }
  return undefined;
}

function parsePtFromPx(px: string): number | undefined {
  const m = px.match(/^(\d+(?:\.\d+)?)px$/);
  if (!m) return undefined;
  // docx size: half-points. 16px ≈ 12pt = 24 half-pt
  const pt = Number(m[1]) * 0.75;
  return Math.round(pt * 2);
}

function headingFor(level: number | undefined): (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined {
  if (level === 1) return HeadingLevel.HEADING_1;
  if (level === 2) return HeadingLevel.HEADING_2;
  if (level === 3) return HeadingLevel.HEADING_3;
  return undefined;
}

function alignmentFor(align: string | undefined): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  if (align === 'left') return AlignmentType.LEFT;
  if (align === 'center') return AlignmentType.CENTER;
  if (align === 'right') return AlignmentType.RIGHT;
  if (align === 'justify') return AlignmentType.JUSTIFIED;
  return undefined;
}

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
