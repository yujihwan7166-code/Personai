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
import {
  importXlsxFile,
  type SheetHeaderFooter,
  type SheetOutlineOptions,
  type SheetPageSetup,
  type SheetProtection,
  type SheetSortState,
  type SheetTable,
  type SheetViewOptions,
  type TableColumnFilter,
  type XlsxEmbeddedChart,
} from '@/lib/cloudSheet/xlsx';
import type { CondRule } from '@/lib/cloudSheet/condFormat';
import { SHEET_TAB_COLOR_HEX, type SheetTabColor } from '@/lib/cloudSheet/SheetTab';
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

function sheetTabColorFromHex(hex: string | undefined): SheetTabColor | undefined {
  if (!hex) return undefined;
  const normalized = hex.toUpperCase();
  const entry = Object.entries(SHEET_TAB_COLOR_HEX)
    .find(([, value]) => value.toUpperCase() === normalized);
  return entry?.[0] as SheetTabColor | undefined;
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
    const sheetsMeta: Array<{
      id: string;
      name: string;
      color?: SheetTabColor;
      tabColor?: string;
      visibility?: 'visible' | 'hidden' | 'veryHidden';
    }> = [];
    const allCells: Record<string, Record<string, string>> = {};
    const allFormats: Record<string, Record<string, unknown>> = {};
    const allMerges: Record<string, Array<{ minR: number; maxR: number; minC: number; maxC: number }>> = {};
    const allValidations: Record<string, unknown[]> = {};
    const allComments: Record<string, Record<string, string>> = {};
    const allColWidths: Record<string, Record<number, number>> = {};
    const allRowHeights: Record<string, Record<number, number>> = {};
    const allFreezeRows: Record<string, number> = {};
    const allFreezeCols: Record<string, number> = {};
    const allSheetViews: Record<string, SheetViewOptions | undefined> = {};
    const allSheetPageSetups: Record<string, SheetPageSetup | undefined> = {};
    const allSheetHeaderFooters: Record<string, SheetHeaderFooter | undefined> = {};
    const allSheetOutlines: Record<string, SheetOutlineOptions | undefined> = {};
    const allHiddenCols: Record<string, Record<number, boolean>> = {};
    const allHiddenRows: Record<string, Record<number, boolean>> = {};
    const allAutoFilterRefs: Record<string, string | undefined> = {};
    const allAutoFilterColumns: Record<string, Array<TableColumnFilter | undefined>> = {};
    const allSortStates: Record<string, SheetSortState | undefined> = {};
    const allTables: Record<string, SheetTable[]> = {};
    const allEmbeddedCharts: Record<string, XlsxEmbeddedChart[]> = {};
    const allSheetProtections: Record<string, SheetProtection | undefined> = {};
    const allCondRules: Record<string, CondRule[]> = {};
    const namedRanges: Record<string, string> = {};
    let colWidths: Record<number, number> | undefined;
    let rowHeights: Record<number, number> | undefined;
    let freezeRows: number | undefined;
    let freezeCols: number | undefined;
    for (const s of imported.length > 0 ? imported : [{ name: 'Sheet1', cells: {}, cellFormats: {}, merges: [] }]) {
      const id = newSheetId();
      sheetsMeta.push({
        id,
        name: s.name,
        color: sheetTabColorFromHex(s.tabColor),
        tabColor: s.tabColor,
        visibility: s.sheetState,
      });
      allCells[id] = s.cells;
      allFormats[id] = s.cellFormats ?? {};
      allMerges[id] = s.merges ?? [];
      allValidations[id] = s.validations ?? [];
      allComments[id] = s.comments ?? {};
      allColWidths[id] = s.colWidths ?? {};
      allRowHeights[id] = s.rowHeights ?? {};
      allFreezeRows[id] = s.freezeRows ?? 0;
      allFreezeCols[id] = s.freezeCols ?? 0;
      allSheetViews[id] = s.sheetView;
      allSheetPageSetups[id] = s.pageSetup;
      allSheetHeaderFooters[id] = s.headerFooter;
      allSheetOutlines[id] = s.sheetOutline;
      allHiddenCols[id] = s.hiddenCols ?? {};
      allHiddenRows[id] = s.hiddenRows ?? {};
      allAutoFilterRefs[id] = s.autoFilterRef;
      allAutoFilterColumns[id] = s.autoFilterColumns ?? [];
      allSortStates[id] = s.sortState;
      allTables[id] = s.tables ?? [];
      allEmbeddedCharts[id] = s.embeddedCharts ?? [];
      allSheetProtections[id] = s.sheetProtection;
      allCondRules[id] = s.condRules ?? [];
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
        allSheetViews,
        allSheetPageSetups,
        allSheetHeaderFooters,
        allSheetOutlines,
        allHiddenCols,
        allHiddenRows,
        allAutoFilterRefs,
        allAutoFilterColumns,
        allSortStates,
        allTables,
        allEmbeddedCharts,
        allSheetProtections,
        allCondRules,
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
