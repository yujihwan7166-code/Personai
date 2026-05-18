/**
 * 드라이브 화면에서 파일을 업로드하면 자동으로:
 *  1. 확장자 판별
 *  2. 자체 포맷으로 변환 (mammoth / SheetJS / JSZip 등 재사용)
 *  3. 새 cloud_nodes row 생성 + meta 채우기
 *  4. 편집기 라우트 반환
 *
 * 지원 확장자:
 *   .docx .doc / .md .markdown .txt / .html .htm   → 문서 (doc)
 *   .xlsx .xls .csv                                 → 시트 (sheet)
 *   .pptx .ppt                                       → 슬라이드 (slide)
 */

import { importDocxFile } from '@/lib/cloudDoc/docx';
import { readMarkdownFile } from '@/lib/cloudDoc/markdown';
import { importXlsxFile } from '@/lib/cloudSheet/xlsx';
import { importPptxFile } from '@/lib/cloudSlide/pptx';
import { createEmptyFile, updateFileBody } from '@/lib/cloudClient';
import type { CloudFileType } from '@/types/cloud';

export interface UploadResult {
  nodeId: string;
  fileType: CloudFileType;
  route: string;
}

function newSheetId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

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
    const { html, warnings, headerText, footerText } = await importDocxFile(file);
    const node = await createEmptyFile(opts.ownerId, title, 'doc', opts.parentFolderId);
    await updateFileBody(node.id, {
      meta: {
        bodyHtml: html,
        importWarnings: warnings,
        ...(headerText ? { headerText } : {}),
        ...(footerText ? { footerText } : {}),
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
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    const imported = await importXlsxFile(file);
    const sheetsMeta: Array<{ id: string; name: string }> = [];
    const allCells: Record<string, Record<string, string>> = {};
    for (const s of imported.length > 0 ? imported : [{ name: 'Sheet1', cells: {} }]) {
      const id = newSheetId();
      sheetsMeta.push({ id, name: s.name });
      allCells[id] = s.cells;
    }
    const node = await createEmptyFile(opts.ownerId, title, 'sheet', opts.parentFolderId);
    await updateFileBody(node.id, {
      meta: { sheets: sheetsMeta, allCells, allFormats: {}, currentSheetIdx: 0 },
    });
    return { nodeId: node.id, fileType: 'sheet', route: `/cloud/sheet/${node.id}` };
  }

  // ── 슬라이드 ──
  if (ext === 'pptx' || ext === 'ppt') {
    const slides = await importPptxFile(file);
    const node = await createEmptyFile(opts.ownerId, title, 'slide', opts.parentFolderId);
    await updateFileBody(node.id, {
      meta: { slides, currentIdx: 0 },
    });
    return { nodeId: node.id, fileType: 'slide', route: `/cloud/slide/${node.id}` };
  }

  throw new Error(`지원하지 않는 형식: .${ext} (지원: docx, md, txt, html, xlsx, csv, pptx)`);
}

export const ACCEPT_EXT_LIST = '.docx,.doc,.md,.markdown,.txt,.html,.htm,.xlsx,.xls,.csv,.pptx,.ppt';
