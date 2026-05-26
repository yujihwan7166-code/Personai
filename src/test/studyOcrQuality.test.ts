import { describe, expect, it } from 'vitest';
import { analyzeOcrRecord, chooseMergedPageText, isNativeTextUseful, isUsefulVisionText, isWeakOcrRecord, shouldSkipExpensiveOcrFallback, summarizeOcrDiagnostics } from '@/lib/studyOcrQuality';
import type { OcrRecord } from '@/lib/studyOcrStore';
import { getEffectiveOcrPages, getVisionBackedFastOcrPages, getVisionForcedOcrPages, shouldInspectPdfPageImagesForOcr, shouldOcrExtractedPdfPageText } from '@/lib/studyOcrPages';
import { extractPdfTextContentForStudy } from '@/lib/fileConvert/converters/pdf';

function makeOcr(overrides: Partial<OcrRecord>): OcrRecord {
  return {
    key: 'blob:1',
    blobRef: 'blob',
    page: 1,
    text: '',
    words: [],
    doneAt: Date.now(),
    ...overrides,
  };
}

describe('studyOcrQuality', () => {
  it('marks short OCR output as weak', () => {
    const record = makeOcr({
      text: '짧은 글',
      wordCount: 2,
      avgConfidence: 91,
    });

    expect(isWeakOcrRecord(record)).toBe(true);
    expect(analyzeOcrRecord(record).reason).toBe('short-text');
  });

  it('keeps borderline OCR output weak so it can receive a stronger fallback', () => {
    const record = makeOcr({
      text: Array.from({ length: 50 }, (_, i) => `longtoken${String(i).padStart(3, '0')}`).join(' '),
      wordCount: 50,
      avgConfidence: 65,
    });

    expect(isWeakOcrRecord(record)).toBe(true);
    expect(analyzeOcrRecord(record).reason).toBe('few-words');
  });

  it('marks garbled OCR output as weak even when it is long', () => {
    const record = makeOcr({
      text: Array.from({ length: 90 }, (_, i) => `정상문장${i}`).join(' ') + ` ${'□'.repeat(80)}${'\uFFFD'.repeat(40)}`,
      wordCount: 90,
      avgConfidence: 82,
    });

    expect(isWeakOcrRecord(record)).toBe(true);
    expect(analyzeOcrRecord(record).reason).toBe('garbled-text');
  });

  it('does not treat normal question-heavy study text as garbled OCR', () => {
    const record = makeOcr({
      text: Array.from({ length: 90 }, (_, i) => `concept${i}? answer${i}`).join(' '),
      wordCount: 90,
      avgConfidence: 84,
    });

    expect(analyzeOcrRecord(record).reason).toBe('ok');
  });

  it('marks repeated OCR fragments as weak', () => {
    const record = makeOcr({
      text: Array.from({ length: 80 }, () => '전류계').join(' '),
      wordCount: 80,
      avgConfidence: 86,
    });

    expect(isWeakOcrRecord(record)).toBe(true);
    expect(analyzeOcrRecord(record).reason).toBe('repeated-text');
  });

  it('skips expensive OCR fallbacks for terminal weak results', () => {
    expect(shouldSkipExpensiveOcrFallback(makeOcr({ text: '', wordCount: 0, avgConfidence: 20 }))).toBe(true);
    expect(shouldSkipExpensiveOcrFallback(makeOcr({
      text: Array.from({ length: 80 }, () => 'repeat-token').join(' '),
      wordCount: 80,
      avgConfidence: 86,
    }))).toBe(true);
    expect(shouldSkipExpensiveOcrFallback(makeOcr({
      text: Array.from({ length: 36 }, (_, i) => `short${i}`).join(' '),
      wordCount: 36,
      avgConfidence: 76,
    }))).toBe(false);
  });

  it('uses Vision text when OCR is weak and Vision is useful', () => {
    const record = makeOcr({
      text: '흐릿하게 인식된 일부 글자',
      wordCount: 5,
      avgConfidence: 42,
    });
    const visionText = [
      '## Page Text',
      '1. 전류계의 바늘이 눈금 0을 가리키는 까닭을 설명하시오.',
      '전압이 정상적으로 측정되었으나 전류가 흐르지 않는 상태를 비교한다.',
    ].join('\n');

    expect(chooseMergedPageText({ nativeText: '', ocrRecord: record, visionText })).toBe(visionText);
  });

  it('does not let a short Vision response overwrite rich OCR text', () => {
    const richText = Array.from({ length: 90 }, (_, i) => `개념${i}`).join(' ');
    const record = makeOcr({
      text: richText,
      wordCount: 90,
      avgConfidence: 84,
    });

    expect(chooseMergedPageText({
      nativeText: '',
      ocrRecord: record,
      visionText: '## Page Text\n문제 일부만 보임',
    })).toBe(richText);
  });

  it('does not let a partial structured Vision response overwrite strong OCR', () => {
    const ocrText = Array.from({ length: 90 }, (_, i) => `ocr-token-${i}`).join(' ');
    const visionText = [
      '## Page Text',
      ...Array.from({ length: 42 }, (_, i) => `vision-token-${i}`),
    ].join(' ');
    const record = makeOcr({
      text: ocrText,
      wordCount: 90,
      avgConfidence: 87,
    });

    expect(chooseMergedPageText({
      nativeText: '',
      ocrRecord: record,
      visionText,
    })).toBe(ocrText);
  });

  it('uses Vision when it clearly captures more small text than a strong OCR pass', () => {
    const ocrText = Array.from({ length: 70 }, (_, i) => `ocr-token-${i}`).join(' ');
    const visionText = Array.from({ length: 105 }, (_, i) => `vision-token-${i}`).join(' ');
    const record = makeOcr({
      text: ocrText,
      wordCount: 70,
      avgConfidence: 86,
    });

    expect(analyzeOcrRecord(record).reason).toBe('ok');
    expect(chooseMergedPageText({
      nativeText: '',
      ocrRecord: record,
      visionText,
    })).toBe(visionText);
  });

  it('keeps strong OCR when Vision is only slightly longer', () => {
    const ocrText = Array.from({ length: 90 }, (_, i) => `ocr-token-${i}`).join(' ');
    const visionText = Array.from({ length: 94 }, (_, i) => `vision-token-${i}`).join(' ');
    const record = makeOcr({
      text: ocrText,
      wordCount: 90,
      avgConfidence: 86,
    });

    expect(chooseMergedPageText({
      nativeText: '',
      ocrRecord: record,
      visionText,
    })).toBe(ocrText);
  });

  it('treats sparse native PDF text as not useful enough for study OCR', () => {
    expect(isNativeTextUseful('[p.1] 제목')).toBe(false);
    expect(isNativeTextUseful(Array.from({ length: 70 }, (_, i) => `단어${i}`).join(' '))).toBe(true);
  });

  it('treats garbled or repeated native PDF text as not useful', () => {
    const repeated = Array.from({ length: 70 }, () => '전류계').join(' ');
    const garbled = `${Array.from({ length: 70 }, (_, i) => `단어${i}`).join(' ')} ${'□'.repeat(90)}`;

    expect(isNativeTextUseful(repeated)).toBe(false);
    expect(isNativeTextUseful(garbled)).toBe(false);
  });

  it('summarizes weak pages and OCR speed metadata', () => {
    const strongText = Array.from({ length: 130 }, (_, i) => `토큰${i}`).join(' ');
    const summary = summarizeOcrDiagnostics([
      makeOcr({ page: 1, text: strongText, wordCount: 90, avgConfidence: 82, durationMs: 1200 }),
      makeOcr({ page: 2, text: '빈약', wordCount: 1, avgConfidence: 45, durationMs: 800 }),
    ]);

    expect(summary.total).toBe(2);
    expect(summary.strong).toBe(1);
    expect(summary.corrected).toBe(0);
    expect(summary.pending).toBe(0);
    expect(summary.weak).toBe(1);
    expect(summary.correctedPages).toEqual([]);
    expect(summary.pendingPages).toEqual([]);
    expect(summary.weakPages).toEqual([2]);
    expect(summary.avgConfidence).toBe(63.5);
    expect(summary.totalDurationMs).toBe(2000);
  });

  it('summarizes expensive OCR fallback pages', () => {
    const text = Array.from({ length: 120 }, (_, i) => `token${i}`).join(' ');
    const summary = summarizeOcrDiagnostics([
      makeOcr({ page: 1, text, wordCount: 90, avgConfidence: 82, durationMs: 1200, passCount: 1, fallbackMode: 'none' }),
      makeOcr({ page: 2, text, wordCount: 90, avgConfidence: 80, durationMs: 2600, passCount: 3, fallbackMode: 'tiled' }),
      makeOcr({ page: 3, text, wordCount: 90, avgConfidence: 81, durationMs: 3100, passCount: 4, fallbackMode: 'dense-tiled' }),
    ]);

    expect(summary.avgPassCount).toBe(2.7);
    expect(summary.totalDurationMs).toBe(6900);
    expect(summary.slowestPage).toEqual({ page: 3, durationMs: 3100 });
    expect(summary.expensiveFallbackPages).toEqual([2, 3]);
  });

  it('counts weak OCR pages with useful Vision text as corrected', () => {
    const summary = summarizeOcrDiagnostics([
      makeOcr({ page: 3, text: '빈약', wordCount: 1, avgConfidence: 41, durationMs: 700 }),
    ], new Map([[3, [
      '## Page Text',
      '1. 전류계의 바늘이 눈금 0을 가리키는 까닭을 설명하시오.',
      '전압이 정상적으로 측정되었으나 전류가 흐르지 않는 상태를 비교한다.',
    ].join('\n')]]));

    expect(summary.strong).toBe(0);
    expect(summary.corrected).toBe(1);
    expect(summary.pending).toBe(0);
    expect(summary.weak).toBe(0);
    expect(summary.correctedPages).toEqual([3]);
    expect(summary.pendingPages).toEqual([]);
    expect(summary.weakPages).toEqual([]);
  });

  it('includes expected OCR pages that do not have records yet as pending', () => {
    const summary = summarizeOcrDiagnostics([
      makeOcr({ page: 1, text: Array.from({ length: 130 }, (_, i) => `토큰${i}`).join(' '), wordCount: 90, avgConfidence: 80 }),
    ], new Map(), [1, 2, 3]);

    expect(summary.total).toBe(3);
    expect(summary.strong).toBe(1);
    expect(summary.pending).toBe(2);
    expect(summary.pendingPages).toEqual([2, 3]);
    expect(summary.weakPages).toEqual([]);
  });

  it('rejects weak Vision text so it can be retried later', () => {
    expect(isUsefulVisionText('## Page Text\n문제 일부만 보임')).toBe(false);
    expect(isUsefulVisionText([
      '## Page Text',
      '1. 전류계의 바늘이 눈금 0을 가리키는 까닭을 설명하시오.',
      '전압이 정상적으로 측정되었으나 전류가 흐르지 않는 상태를 비교한다.',
      '검증 방법은 회로 연결 상태와 전류계 단자 방향을 확인하는 것이다.',
    ].join('\n'))).toBe(true);
  });

  it('does not add sparse native pages when explicit scan pages are known', () => {
    expect(getEffectiveOcrPages({
      id: 'src',
      kind: 'pdf',
      title: 'sample.pdf',
      content: '',
      addedAt: 0,
      enabled: true,
      scanPages: [2],
      nativeText: [
        '[p.1] Short native cover',
        '[p.2] ',
        '[p.3] Short divider',
      ].join('\n\n'),
    })).toEqual([2]);
  });

  it('keeps explicit OCR scan pages even when native text is useful', () => {
    expect(getEffectiveOcrPages({
      id: 'src',
      kind: 'pdf',
      title: 'mixed.pdf',
      content: '',
      addedAt: 0,
      enabled: true,
      scanPages: [1],
      nativeText: [
        `[p.1] ${Array.from({ length: 90 }, (_, i) => `native${i}`).join(' ')}`,
      ].join('\n\n'),
    })).toEqual([1]);
  });

  it('forces Vision for explicit mixed scan pages that already have useful native text', () => {
    expect(getVisionForcedOcrPages({
      id: 'src',
      kind: 'pdf',
      title: 'mixed.pdf',
      content: '',
      addedAt: 0,
      enabled: true,
      scanPages: [1, 2],
      nativeText: [
        `[p.1] ${Array.from({ length: 90 }, (_, i) => `native${i}`).join(' ')}`,
        '[p.2] tiny',
      ].join('\n\n'),
    })).toEqual([1]);
  });

  it('uses fast OCR for useful-native mixed pages that will be Vision-backed', () => {
    expect(getVisionBackedFastOcrPages({
      id: 'src',
      kind: 'pdf',
      title: 'mixed.pdf',
      content: '',
      addedAt: 0,
      enabled: true,
      scanPages: [1, 2, 3],
      forcedOcrPages: [3],
      nativeText: [
        `[p.1] ${Array.from({ length: 90 }, (_, i) => `native${i}`).join(' ')}`,
        '[p.2] tiny',
        `[p.3] ${Array.from({ length: 80 }, (_, i) => `forced${i}`).join(' ')}`,
      ].join('\n\n'),
    })).toEqual([1]);
  });

  it('always includes user-forced OCR pages even when native text looks useful', () => {
    expect(getEffectiveOcrPages({
      id: 'src',
      kind: 'pdf',
      title: 'sample.pdf',
      content: '',
      addedAt: 0,
      enabled: true,
      scanPages: [2],
      forcedOcrPages: [1],
      nativeText: [
        `[p.1] ${Array.from({ length: 80 }, (_, i) => `native${i}`).join(' ')}`,
        '[p.2] ',
      ].join('\n\n'),
    })).toEqual([1, 2]);
  });

  it('keeps short selectable native-only PDF pages on the fast path', () => {
    expect(shouldOcrExtractedPdfPageText(
      'Course title and short native divider',
      { nativeItemCount: 5, hasPaintedImage: false },
    )).toBe(false);
    expect(shouldOcrExtractedPdfPageText(
      '',
      { nativeItemCount: 0, hasPaintedImage: false },
    )).toBe(false);
    expect(shouldOcrExtractedPdfPageText(
      '',
      { nativeItemCount: 0, hasPaintedImage: true },
    )).toBe(true);
  });

  it('adds mixed worksheet pages with selectable text and diagram images to OCR', () => {
    const worksheetText = Array.from({ length: 80 }, (_, i) => `concept${i}`).join(' ');

    expect(shouldOcrExtractedPdfPageText(worksheetText, {
      nativeItemCount: 80,
      hasPaintedImage: true,
      paintedImageCount: 3,
    })).toBe(true);
  });

  it('keeps long native text pages with decorative images on the fast path', () => {
    const longText = Array.from({ length: 260 }, (_, i) => `paragraph${i}`).join(' ');

    expect(shouldOcrExtractedPdfPageText(longText, {
      nativeItemCount: 260,
      hasPaintedImage: true,
      paintedImageCount: 1,
    })).toBe(false);
  });

  it('only inspects PDF image operators when native text cannot decide the OCR path', () => {
    expect(shouldInspectPdfPageImagesForOcr(
      Array.from({ length: 70 }, (_, i) => `token${i}`).join(' '),
      70,
    )).toBe(true);
    expect(shouldInspectPdfPageImagesForOcr(
      Array.from({ length: 260 }, (_, i) => `token${i}`).join(' '),
      260,
    )).toBe(false);
    expect(shouldInspectPdfPageImagesForOcr('', 0)).toBe(true);
    expect(shouldInspectPdfPageImagesForOcr('Short native divider', 4)).toBe(true);
  });

  it('extracts native PDF text in visual line order for faster non-OCR pages', () => {
    const text = extractPdfTextContentForStudy({
      items: [
        { str: 'second', transform: [1, 0, 0, 10, 10, 680], width: 34, height: 10 },
        { str: 'line', transform: [1, 0, 0, 10, 50, 680.4], width: 18, height: 10 },
        { str: 'world', transform: [1, 0, 0, 10, 58, 700], width: 30, height: 10 },
        { str: 'Hello', transform: [1, 0, 0, 10, 10, 700.2], width: 30, height: 10 },
      ],
    });

    expect(text).toBe('Hello world\nsecond line');
  });

  it('keeps adjacent Korean glyph items together while preserving real word gaps', () => {
    const text = extractPdfTextContentForStudy({
      items: [
        { str: '한', transform: [1, 0, 0, 10, 10, 700], width: 10, height: 10 },
        { str: '글', transform: [1, 0, 0, 10, 20.5, 700], width: 10, height: 10 },
        { str: 'OCR', transform: [1, 0, 0, 10, 48, 700], width: 20, height: 10 },
      ],
    });

    expect(text).toBe('한글 OCR');
  });

  it('reads two-column PDF text by column instead of interleaving rows', () => {
    const items = [
      { str: 'Left 1', transform: [1, 0, 0, 10, 20, 700], width: 50, height: 10 },
      { str: 'Right 1', transform: [1, 0, 0, 10, 250, 700], width: 55, height: 10 },
      { str: 'Left 2', transform: [1, 0, 0, 10, 20, 680], width: 50, height: 10 },
      { str: 'Right 2', transform: [1, 0, 0, 10, 250, 680], width: 55, height: 10 },
      { str: 'Left 3', transform: [1, 0, 0, 10, 20, 660], width: 50, height: 10 },
      { str: 'Right 3', transform: [1, 0, 0, 10, 250, 660], width: 55, height: 10 },
      { str: 'Left 4', transform: [1, 0, 0, 10, 20, 640], width: 50, height: 10 },
      { str: 'Right 4', transform: [1, 0, 0, 10, 250, 640], width: 55, height: 10 },
    ];

    expect(extractPdfTextContentForStudy({ items })).toBe([
      'Left 1',
      'Left 2',
      'Left 3',
      'Left 4',
      'Right 1',
      'Right 2',
      'Right 3',
      'Right 4',
    ].join('\n'));
  });

  it('keeps full-width headings before detected two-column content', () => {
    const items = [
      { str: 'Unit Test', transform: [1, 0, 0, 10, 20, 730], width: 285, height: 10 },
      { str: 'Left A', transform: [1, 0, 0, 10, 20, 700], width: 45, height: 10 },
      { str: 'Right A', transform: [1, 0, 0, 10, 250, 700], width: 50, height: 10 },
      { str: 'Left B', transform: [1, 0, 0, 10, 20, 680], width: 45, height: 10 },
      { str: 'Right B', transform: [1, 0, 0, 10, 250, 680], width: 50, height: 10 },
      { str: 'Left C', transform: [1, 0, 0, 10, 20, 660], width: 45, height: 10 },
      { str: 'Right C', transform: [1, 0, 0, 10, 250, 660], width: 50, height: 10 },
      { str: 'Left D', transform: [1, 0, 0, 10, 20, 640], width: 45, height: 10 },
      { str: 'Right D', transform: [1, 0, 0, 10, 250, 640], width: 50, height: 10 },
    ];

    expect(extractPdfTextContentForStudy({ items })).toBe([
      'Unit Test',
      'Left A',
      'Left B',
      'Left C',
      'Left D',
      'Right A',
      'Right B',
      'Right C',
      'Right D',
    ].join('\n'));
  });
});
