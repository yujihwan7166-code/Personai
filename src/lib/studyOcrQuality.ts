import type { OcrRecord } from './studyOcrStore';

export interface TextSignal {
  text: string;
  compactLength: number;
  tokenCount: number;
  lineCount: number;
  uniqueTokenRatio: number;
  suspiciousCharRatio: number;
}

export interface OcrQuality {
  textLength: number;
  wordCount: number;
  confidence: number | null;
  durationMs: number | null;
  passCount: number;
  fallbackMode: OcrRecord['fallbackMode'];
  weak: boolean;
  reason: 'empty' | 'garbled-text' | 'repeated-text' | 'short-text' | 'few-words' | 'low-confidence' | 'ok';
}

export interface OcrDiagnosticsSummary {
  total: number;
  strong: number;
  corrected: number;
  pending: number;
  weak: number;
  empty: number;
  avgConfidence: number | null;
  avgPassCount: number | null;
  totalDurationMs: number;
  slowestPage: { page: number; durationMs: number } | null;
  expensiveFallbackPages: number[];
  correctedPages: number[];
  pendingPages: number[];
  weakPages: number[];
}

const MIN_USEFUL_TEXT_CHARS = 180;
const MIN_USEFUL_TOKENS = 28;
const MIN_STRONG_OCR_CHARS = 420;
const MIN_STRONG_OCR_WORDS = 55;
const MIN_STRONG_OCR_CONFIDENCE = 68;

export function getTextSignal(value: string | undefined | null): TextSignal {
  const text = normalizeOcrText(value ?? '');
  const compactLength = text.replace(/\s/g, '').length;
  const tokens = text.split(/\s+/).filter(Boolean);
  const tokenCount = tokens.length;
  const lineCount = text.split('\n').filter((line) => line.trim()).length;
  const normalizedTokens = tokens.map((token) => token.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')).filter(Boolean);
  const uniqueTokenRatio = normalizedTokens.length > 0
    ? new Set(normalizedTokens).size / normalizedTokens.length
    : 1;
  const chars = Array.from(text.replace(/\s/g, ''));
  const suspiciousCharCount = chars.filter(isSuspiciousOcrChar).length + countSuspiciousOcrNoise(text);
  const suspiciousCharRatio = chars.length > 0 ? suspiciousCharCount / chars.length : 0;
  return { text, compactLength, tokenCount, lineCount, uniqueTokenRatio, suspiciousCharRatio };
}

export function normalizeOcrText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

export function isNativeTextUseful(text: string | undefined | null): boolean {
  const signal = getTextSignal(text);
  if (signal.suspiciousCharRatio >= 0.08) return false;
  if (signal.tokenCount >= 24 && signal.uniqueTokenRatio < 0.32) return false;
  return signal.compactLength >= MIN_USEFUL_TEXT_CHARS && signal.tokenCount >= MIN_USEFUL_TOKENS;
}

export function analyzeOcrRecord(record: Pick<OcrRecord, 'text' | 'words' | 'wordCount' | 'avgConfidence' | 'durationMs' | 'passCount' | 'fallbackMode'> | null | undefined): OcrQuality {
  const signal = getTextSignal(record?.text);
  const wordCount = record?.wordCount ?? record?.words?.length ?? 0;
  const confidence = typeof record?.avgConfidence === 'number' && Number.isFinite(record.avgConfidence)
    ? record.avgConfidence
    : null;

  let reason: OcrQuality['reason'] = 'ok';
  if (signal.compactLength === 0 && wordCount === 0) reason = 'empty';
  else if (signal.suspiciousCharRatio >= 0.08) reason = 'garbled-text';
  else if (signal.tokenCount >= 24 && signal.uniqueTokenRatio < 0.32) reason = 'repeated-text';
  else if (signal.compactLength < MIN_STRONG_OCR_CHARS) reason = 'short-text';
  else if (wordCount < MIN_STRONG_OCR_WORDS) reason = 'few-words';
  else if (confidence !== null && confidence < MIN_STRONG_OCR_CONFIDENCE) reason = 'low-confidence';

  return {
    textLength: signal.compactLength,
    wordCount,
    confidence,
    durationMs: typeof record?.durationMs === 'number' ? record.durationMs : null,
    passCount: typeof record?.passCount === 'number' ? record.passCount : 1,
    fallbackMode: record?.fallbackMode ?? 'none',
    weak: reason !== 'ok',
    reason,
  };
}

export function isWeakOcrRecord(record: Pick<OcrRecord, 'text' | 'words' | 'wordCount' | 'avgConfidence'> | null | undefined): boolean {
  return analyzeOcrRecord(record).weak;
}

export function shouldSkipExpensiveOcrFallback(
  record: Pick<OcrRecord, 'text' | 'words' | 'wordCount' | 'avgConfidence'> | null | undefined,
): boolean {
  const quality = analyzeOcrRecord(record);
  return quality.reason === 'empty'
    || quality.reason === 'garbled-text'
    || quality.reason === 'repeated-text';
}

export function isUsefulVisionText(text: string | undefined | null): boolean {
  const signal = getTextSignal(text);
  if (signal.suspiciousCharRatio >= 0.08) return false;
  if (signal.tokenCount >= 24 && signal.uniqueTokenRatio < 0.32) return false;
  const hasExactOcrHeader = /^##\s+Page Text/im.test(signal.text);
  const hasVisualSection = /^##\s+Visual Labels/im.test(signal.text);
  if (signal.compactLength >= 120 && signal.tokenCount >= 18) return true;
  if ((hasExactOcrHeader || hasVisualSection) && signal.compactLength >= 60 && signal.tokenCount >= 8) return true;
  return false;
}

function isSuspiciousOcrChar(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  if (char === '\uFFFD') return true;
  if ((code >= 0x00 && code <= 0x1f) || (code >= 0x7f && code <= 0x9f)) return true;
  if (code >= 0xe000 && code <= 0xf8ff) return true;
  if (/[□■�]/u.test(char)) return true;
  return false;
}

function countSuspiciousOcrNoise(text: string): number {
  let count = 0;
  const patterns = [
    /\?{2,}/g,
    /\?[^\sA-Za-z0-9?.,;:!()[\]{}"']/gu,
  ];
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (!matches) continue;
    count += matches.reduce((sum, value) => sum + value.length, 0);
  }
  return count;
}

export function chooseMergedPageText({
  nativeText,
  ocrRecord,
  visionText,
}: {
  nativeText?: string;
  ocrRecord?: OcrRecord;
  visionText?: string;
}): string {
  const native = getTextSignal(nativeText);
  const ocr = getTextSignal(ocrRecord?.text);
  const vision = getTextSignal(visionText);
  const ocrQuality = analyzeOcrRecord(ocrRecord);
  const nativeUseful = isNativeTextUseful(native.text);
  const visionUseful = isUsefulVisionText(vision.text);
  const visionHasStructure = /^##\s+Page Text/im.test(vision.text) || /^##\s+Visual Labels/im.test(vision.text);

  const strongestNonVisionLength = Math.max(ocr.compactLength, native.compactLength);
  const visionIsMoreComplete = visionUseful
    && vision.compactLength >= Math.max(220, strongestNonVisionLength * 1.18)
    && vision.tokenCount >= Math.max(ocr.tokenCount, native.tokenCount) + 12;
  if (vision.text && (
    (ocrQuality.weak && visionUseful)
    || (!nativeUseful && !ocr.text && vision.compactLength >= 30)
    || visionIsMoreComplete
    || (
      visionHasStructure
      && visionUseful
      && (ocrQuality.weak || (!nativeUseful && !ocr.text))
      && vision.compactLength >= Math.max(80, strongestNonVisionLength * 0.45)
    )
  )) {
    return vision.text;
  }

  if (ocr.text && (
    !native.text
    || ocr.compactLength > native.compactLength + 80
    || (!nativeUseful && ocr.compactLength >= 20)
  )) {
    return ocr.text;
  }

  if (native.text) return native.text;
  if (vision.text) return vision.text;
  return ocr.text;
}

export function summarizeOcrDiagnostics(
  records: Array<Pick<OcrRecord, 'page' | 'text' | 'words' | 'wordCount' | 'avgConfidence' | 'durationMs' | 'passCount' | 'fallbackMode'>>,
  visionTextByPage: Map<number, string> | Record<number, string | undefined> = new Map(),
  expectedPages?: number[],
): OcrDiagnosticsSummary {
  const readVisionText = (page: number) => (
    visionTextByPage instanceof Map ? visionTextByPage.get(page) : visionTextByPage[page]
  );
  const recordPages = new Set(records.map((record) => record.page));
  const expected = Array.from(new Set(expectedPages ?? records.map((record) => record.page))).sort((a, b) => a - b);
  const pendingPages = expected.filter((page) => !recordPages.has(page));
  const qualities = records.map((record) => ({
    record,
    quality: analyzeOcrRecord(record),
    corrected: isUsefulVisionText(readVisionText(record.page)),
  }));
  const confidences = qualities
    .map(({ quality }) => quality.confidence)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const passCounts = qualities
    .map(({ quality }) => quality.passCount)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
  const timedPages = qualities
    .map(({ record, quality }) => ({ page: record.page, durationMs: quality.durationMs ?? 0 }))
    .filter((entry) => entry.durationMs > 0)
    .sort((a, b) => b.durationMs - a.durationMs);
  const correctedPages = qualities
    .filter(({ quality, corrected }) => quality.weak && corrected)
    .map(({ record }) => record.page)
    .sort((a, b) => a - b);
  const weakPages = qualities
    .filter(({ quality, corrected }) => quality.weak && !corrected)
    .map(({ record }) => record.page)
    .sort((a, b) => a - b);
  return {
    total: expected.length,
    strong: qualities.filter(({ quality }) => !quality.weak).length,
    corrected: correctedPages.length,
    pending: pendingPages.length,
    weak: weakPages.length,
    empty: qualities.filter(({ quality, corrected }) => quality.reason === 'empty' && !corrected).length,
    avgConfidence: confidences.length > 0
      ? Math.round((confidences.reduce((sum, value) => sum + value, 0) / confidences.length) * 10) / 10
      : null,
    avgPassCount: passCounts.length > 0
      ? Math.round((passCounts.reduce((sum, value) => sum + value, 0) / passCounts.length) * 10) / 10
      : null,
    totalDurationMs: qualities.reduce((sum, { quality }) => sum + (quality.durationMs ?? 0), 0),
    slowestPage: timedPages[0] ?? null,
    expensiveFallbackPages: qualities
      .filter(({ quality }) => quality.passCount >= 3 || quality.fallbackMode === 'tiled' || quality.fallbackMode === 'dense-tiled')
      .map(({ record }) => record.page)
      .sort((a, b) => a - b),
    correctedPages,
    pendingPages,
    weakPages,
  };
}
