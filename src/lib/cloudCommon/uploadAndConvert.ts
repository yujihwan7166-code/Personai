/**
 * 드라이브 화면에서 파일을 업로드하면 자동으로:
 *  1. 확장자 판별
 *  2. 자체 포맷으로 변환 (mammoth / SheetJS / JSZip 등 재사용)
 *  3. 새 cloud_nodes row 생성 + meta 채우기
 *  4. 편집기 라우트 반환
 *
 * 지원 확장자:
 *   .docx .doc / .md .markdown .txt / .html .htm   → 문서 (doc)
 *   .xlsx .xls .csv .tsv                            → 시트 (sheet)
 *   .pptx .ppt                                       → 슬라이드 (slide)
 */

import { importDocxFile } from '@/lib/cloudDoc/docx';
import { readMarkdownFile } from '@/lib/cloudDoc/markdown';
import { importXlsxFile } from '@/lib/cloudSheet/xlsx';
import { importPptxDeck } from '@/lib/cloudSlide/pptx';
import { createEmptyFile, updateFileBody } from '@/lib/cloudClient';
import type { CloudFileType } from '@/types/cloud';
import { newId } from '@/lib/idGenerator';

export interface UploadResult {
  nodeId: string;
  fileType: CloudFileType;
  route: string;
}

const newSheetId = () => newId('s');

function getExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '') || name;
}

export async function uploadAndConvert(
  file: File,
  opts: { ownerId: string; parentFolderId: string | null },
): Promise<UploadResult> {
  const ext = getExt(file.name);
  const title = baseName(file.name);

  // ── 문서 계열 ──
  if (ext === 'docx' || ext === 'doc') {
    const { html, warnings, headerText, footerText, pageMargin, pageSize } = await importDocxFile(file);
    const node = await createEmptyFile(opts.ownerId, title, 'doc', opts.parentFolderId);
    await updateFileBody(node.id, {
      meta: {
        bodyHtml: html,
        importWarnings: warnings,
        ...(headerText ? { headerText } : {}),
        ...(footerText ? { footerText } : {}),
        ...(pageMargin ? { pageMargin } : {}),
        ...(pageSize ? { pageSize } : {}),
      },
    });
    return { nodeId: node.id, fileType: 'doc', route: `/cloud/doc/${node.id}` };
  }
  if (ext === 'md' || ext === 'markdown' || ext === 'txt') {
    const md = await readMarkdownFile(file);
    const node = await createEmptyFile(opts.ownerId, title, 'doc', opts.parentFolderId);
    await updateFileBody(node.id, { meta: { bodyMarkdown: md } });
    return { nodeId: node.id, fileType: 'doc', route: `/cloud/doc/${node.id}` };
  }
  if (ext === 'html' || ext === 'htm') {
    const html = await file.text();
    const node = await createEmptyFile(opts.ownerId, title, 'doc', opts.parentFolderId);
    await updateFileBody(node.id, { meta: { bodyHtml: html } });
    return { nodeId: node.id, fileType: 'doc', route: `/cloud/doc/${node.id}` };
  }

  // ── 시트 ──
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || ext === 'tsv') {
    const imported = await importXlsxFile(file);
    const sheetsMeta: Array<{ id: string; name: string }> = [];
    const allCells: Record<string, Record<string, string>> = {};
    const allFormats: Record<string, Record<string, unknown>> = {};
    const allMerges: Record<string, Array<{ minR: number; maxR: number; minC: number; maxC: number }>> = {};
    const allValidations: Record<string, unknown[]> = {};
    const allComments: Record<string, Record<string, string>> = {};
    const allColWidths: Record<string, Record<number, number>> = {};
    const allRowHeights: Record<string, Record<number, number>> = {};
    const allFreezeRows: Record<string, number> = {};
    const allFreezeCols: Record<string, number> = {};
    const namedRanges: Record<string, string> = {};
    let colWidths: Record<number, number> | undefined;
    let rowHeights: Record<number, number> | undefined;
    let freezeRows: number | undefined;
    let freezeCols: number | undefined;
    for (const s of imported.length > 0 ? imported : [{ name: 'Sheet1', cells: {}, cellFormats: {}, merges: [] }]) {
      const id = newSheetId();
      sheetsMeta.push({ id, name: s.name });
      allCells[id] = s.cells;
      allFormats[id] = s.cellFormats ?? {};
      allMerges[id] = s.merges ?? [];
      allValidations[id] = s.validations ?? [];
      allComments[id] = s.comments ?? {};
      allColWidths[id] = s.colWidths ?? {};
      allRowHeights[id] = s.rowHeights ?? {};
      allFreezeRows[id] = s.freezeRows ?? 0;
      allFreezeCols[id] = s.freezeCols ?? 0;
      Object.assign(namedRanges, s.namedRanges ?? {});
      if (!colWidths && s.colWidths) colWidths = s.colWidths;
      if (!rowHeights && s.rowHeights) rowHeights = s.rowHeights;
      if (freezeRows === undefined && s.freezeRows) freezeRows = s.freezeRows;
      if (freezeCols === undefined && s.freezeCols) freezeCols = s.freezeCols;
    }
    const node = await createEmptyFile(opts.ownerId, title, 'sheet', opts.parentFolderId);
    await updateFileBody(node.id, {
      meta: {
        sheets: sheetsMeta,
        allCells,
        allFormats,
        allMerges,
        allValidations,
        allComments,
        allColWidths,
        allRowHeights,
        allFreezeRows,
        allFreezeCols,
        ...(Object.keys(namedRanges).length > 0 ? { namedRanges } : {}),
        currentSheetIdx: 0,
        ...(colWidths ? { colWidths } : {}),
        ...(rowHeights ? { rowHeights } : {}),
        ...(freezeRows !== undefined ? { freezeRows } : {}),
        ...(freezeCols !== undefined ? { freezeCols } : {}),
      },
    });
    return { nodeId: node.id, fileType: 'sheet', route: `/cloud/sheet/${node.id}` };
  }

  // ── 슬라이드 ──
  if (ext === 'pptx' || ext === 'ppt') {
    const { slides, slideSize } = await importPptxDeck(file);
    const node = await createEmptyFile(opts.ownerId, title, 'slide', opts.parentFolderId);
    await updateFileBody(node.id, {
      meta: { slides, currentIdx: 0, slideSize },
    });
    return { nodeId: node.id, fileType: 'slide', route: `/cloud/slide/${node.id}` };
  }

  throw new Error(`지원하지 않는 형식: .${ext} (지원: docx, md, txt, html, xlsx, csv, tsv, pptx)`);
}

export const ACCEPT_EXT_LIST = '.docx,.doc,.md,.markdown,.txt,.html,.htm,.xlsx,.xls,.csv,.tsv,.pptx,.ppt';
