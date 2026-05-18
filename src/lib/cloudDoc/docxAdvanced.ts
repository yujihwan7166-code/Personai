/**
 * .docx 자체 OOXML 파서 — mammoth 가 놓치는 부분 보완.
 *
 *  - word/document.xml: 페이지 break 위치 (<w:br w:type="page"/>)
 *  - word/header*.xml, word/footer*.xml: 헤더/푸터 텍스트
 *  - word/footnotes.xml: 각주 id → text 매핑
 *
 * 정책:
 *  - JSZip + fast-xml-parser (이미 cloudSlide/pptx.ts 에서 검증된 패턴)
 *  - 실패해도 빈 결과 반환 (safe fallback) — mammoth 결과로라도 import
 *    완료되게
 *  - run 별 inline color/font 은 별도 작업 (이번 단계 X — 추후 운영하며
 *    실제 손실 사례 보고 결정)
 */

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

export interface DocxAdvancedData {
  /** paragraph index 기준 페이지 break (어느 단락 끝에서 다음 페이지로 넘어가는지). */
  pageBreakParagraphs: number[];
  /** 모든 header 파일 텍스트 join. */
  headerText: string;
  /** 모든 footer 파일 텍스트 join. */
  footerText: string;
  /** 각주 매핑: id → text (separator 항목 제외). */
  footnotes: Map<string, string>;
}

const EMPTY_RESULT: DocxAdvancedData = {
  pageBreakParagraphs: [],
  headerText: '',
  footerText: '',
  footnotes: new Map(),
};

export async function parseDocxAdvanced(input: File | ArrayBuffer): Promise<DocxAdvancedData> {
  try {
    const buffer = input instanceof File ? await input.arrayBuffer() : input;
    const zip = await JSZip.loadAsync(buffer);

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (name) =>
        ['w:p', 'w:r', 'w:br', 'w:footnote'].includes(name),
    });

    const pageBreakParagraphs = await extractPageBreaks(zip, parser);
    const headerText = await extractFromMatching(zip, parser, /^word\/header\d+\.xml$/);
    const footerText = await extractFromMatching(zip, parser, /^word\/footer\d+\.xml$/);
    const footnotes = await extractFootnotes(zip, parser);

    return { pageBreakParagraphs, headerText, footerText, footnotes };
  } catch {
    return EMPTY_RESULT;
  }
}

// ─────────────────────────────────────────────
// document.xml — 페이지 break
// ─────────────────────────────────────────────

async function extractPageBreaks(zip: JSZip, parser: XMLParser): Promise<number[]> {
  const file = zip.file('word/document.xml');
  if (!file) return [];
  try {
    const xml = await file.async('string');
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['w:document'] ?? parsed.document) as Record<string, unknown> | undefined;
    const body = root?.['w:body'] as Record<string, unknown> | undefined;
    const paragraphs = (body?.['w:p'] ?? []) as Array<Record<string, unknown>>;
    const breaks: number[] = [];
    paragraphs.forEach((p, i) => {
      const runs = (p['w:r'] ?? []) as Array<Record<string, unknown>>;
      const hasBreak = runs.some((r) => {
        const brs = (r['w:br'] ?? []) as Array<Record<string, unknown>>;
        return brs.some((b) => b['@_w:type'] === 'page');
      });
      if (hasBreak) breaks.push(i);
    });
    return breaks;
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
// header / footer / footnotes — 텍스트 추출 공통
// ─────────────────────────────────────────────

async function extractFromMatching(zip: JSZip, parser: XMLParser, re: RegExp): Promise<string> {
  const parts: string[] = [];
  for (const path of Object.keys(zip.files)) {
    if (!re.test(path)) continue;
    const f = zip.file(path);
    if (!f) continue;
    try {
      const xml = await f.async('string');
      const parsed = parser.parse(xml) as Record<string, unknown>;
      parts.push(collectText(parsed).trim());
    } catch { /* skip */ }
  }
  return parts.filter(Boolean).join(' ').trim();
}

async function extractFootnotes(zip: JSZip, parser: XMLParser): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const file = zip.file('word/footnotes.xml');
  if (!file) return out;
  try {
    const xml = await file.async('string');
    const parsed = parser.parse(xml) as Record<string, unknown>;
    const root = (parsed['w:footnotes'] ?? parsed.footnotes) as Record<string, unknown> | undefined;
    const items = (root?.['w:footnote'] ?? []) as Array<Record<string, unknown>>;
    for (const item of items) {
      const type = item['@_w:type'] as string | undefined;
      if (type === 'separator' || type === 'continuationSeparator') continue;
      const id = String(item['@_w:id'] ?? '');
      if (!id) continue;
      const text = collectText(item).trim();
      if (text) out.set(id, text);
    }
  } catch { /* skip */ }
  return out;
}

/** 객체 트리에서 w:t (텍스트) 만 재귀 수집. paragraph 사이 공백 1개. */
function collectText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node !== 'object') return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key.startsWith('@_')) continue;
    if (key === 'w:t' || key === '#text') {
      if (typeof value === 'string') parts.push(value);
      else if (Array.isArray(value)) {
        for (const v of value) parts.push(collectText(v));
      } else if (value && typeof value === 'object') {
        parts.push(collectText(value));
      }
      continue;
    }
    if (Array.isArray(value)) {
      for (const v of value) parts.push(collectText(v));
    } else if (value && typeof value === 'object') {
      parts.push(collectText(value));
    }
  }
  return parts.join('');
}
