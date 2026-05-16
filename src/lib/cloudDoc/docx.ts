/**
 * 문서 ↔ .docx 호환.
 *
 * Import: mammoth (.docx → HTML) → TipTap setContent (HTML)
 * Export: TipTap ProseMirror JSON → docx 라이브러리 → blob 다운로드
 *
 * 한계 (메모리 정책 — 100% 충실도 X, 알려진 손실 인정):
 *  - 표·이미지 export 미반영 (다음 단계)
 *  - 글꼴 종류·정확한 색 일부 손실 가능
 *  - mammoth 의 한계: 매크로·복잡한 스타일·SmartArt 무시
 */

import mammoth from 'mammoth';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
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
  const paragraphs: Paragraph[] = [];
  for (const block of root?.content ?? []) {
    flattenBlock(block, paragraphs, {});
  }
  if (paragraphs.length === 0) {
    paragraphs.push(new Paragraph({ children: [new TextRun('')] }));
  }
  const doc = new Document({
    sections: [{ children: paragraphs }],
  });
  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, fileName.endsWith('.docx') ? fileName : `${fileName}.docx`);
}

interface FlattenOpts {
  listPrefix?: string;
  quote?: boolean;
}

function flattenBlock(block: PMNode, out: Paragraph[], opts: FlattenOpts): void {
  if (!block.type) return;

  if (block.type === 'paragraph' || block.type === 'heading') {
    const runs = inlinesToRuns(block.content ?? []);
    const finalRuns: TextRun[] = opts.listPrefix
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

  // 표·이미지 등 미지원 — 자식이 있으면 일단 재귀
  if (block.content) {
    for (const child of block.content) {
      flattenBlock(child, out, opts);
    }
  }
}

function inlinesToRuns(content: PMNode[]): TextRun[] {
  const runs: TextRun[] = [];
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
