import type { StudySource } from '@/types/study';
import { newId } from '@/types/study';
import { processFile, validateFile, resolveMimeType, PPTX_MIME } from '@/lib/fileProcessor';
import { putBlob, STUDY_BLOB_LIMITS } from '@/lib/studyBlobStore';

/**
 * File 배열을 StudySource 배열로 변환한다.
 * SourcePanel의 addFiles와 NotebookCreateModal에서 공용으로 사용.
 * - 텍스트(.txt/.md 등): f.text()로 읽어 30,000자까지 저장
 * - PDF/PPTX/DOCX: IndexedDB에 원본 blob 저장 + processFile로 텍스트 추출 best-effort
 * - 최대 5개까지만 처리(초과분은 잘라냄 — 기존 addFiles 동작 유지)
 */
export async function filesToStudySources(
  files: File[],
): Promise<{ sources: StudySource[]; errors: string[] }> {
  const sources: StudySource[] = [];
  const errors: string[] = [];

  for (const f of files.slice(0, 5)) {
    const mime = resolveMimeType(f.type, f.name);
    const isText = mime.startsWith('text/') || f.name.endsWith('.md') || f.name.endsWith('.txt');
    if (isText) {
      try {
        const text = await f.text();
        sources.push({
          id: newId('src'),
          kind: 'paste',
          title: f.name,
          content: text.slice(0, 30000),
          addedAt: Date.now(),
          enabled: true,
          status: 'ready',
        });
      } catch {
        errors.push(`"${f.name}" 읽기 실패`);
      }
      continue;
    }

    const err = validateFile(f, [], {
      maxFileSize: STUDY_BLOB_LIMITS.PER_FILE,
      maxTotalSize: STUDY_BLOB_LIMITS.TOTAL,
    });
    if (err) {
      errors.push(err);
      continue;
    }

    try {
      const fileMime = resolveMimeType(f.type, f.name);
      const kind: StudySource['kind'] =
        fileMime === 'application/pdf'
          ? 'pdf'
          : fileMime === PPTX_MIME
          ? 'pptx'
          : fileMime.includes('wordprocessingml')
          ? 'docx'
          : 'paste';

      // 1) 원본 blob 먼저 저장
      let blobRef: string | undefined;
      let renderMode: 'native' | 'text' = 'text';
      if (kind === 'pdf' || kind === 'pptx' || kind === 'docx') {
        try {
          blobRef = await putBlob(f, fileMime);
          renderMode = 'native';
        } catch {
          /* fallback */
        }
      }

      // 2) 텍스트 추출 best-effort
      let processed: Awaited<ReturnType<typeof processFile>> | null = null;
      try {
        processed = await processFile(f);
      } catch {
        /* ignore */
      }
      let extracted = processed?.extractedText || '';
      if (extracted.startsWith('[')) {
        if (!blobRef) {
          errors.push(`"${f.name}": ${extracted.replace(/^\[|\]$/g, '')}`);
          continue;
        }
        // Phase 1: 스캔본·이미지 위주여도 거부하지 않음. placeholder + 백그라운드 OCR.
        extracted = '(원본에서 OCR 로 텍스트를 추출하는 중입니다. 잠시 후 자동으로 채워집니다.)';
      }
      if (!blobRef && extracted.length < 50) {
        errors.push(`"${f.name}": 텍스트를 추출하지 못했어요.`);
        continue;
      }

      // Phase 4: PDF 면 모든 페이지를 OCR 대상으로 설정. 사용자 요청:
      // "어떤 자료를 넣던지간에 글씨·그림 싹다 읽어버리고" — 강의 슬라이드처럼
      // 페이지마다 native 가 약간 있어도 그림 라벨까지 잡으려면 모든 페이지 OCR 필요.
      // 시간 비용은 사용자가 OK. IDB 캐시로 재업로드 시 무료.
      const pageCount = processed?.pageCount ?? 0;
      const allPagesForOcr: number[] = kind === 'pdf' && pageCount > 0
        ? Array.from({ length: pageCount }, (_, i) => i + 1)
        : (processed?.scanPages ?? []);
      const autoOcr = kind === 'pdf' ? pageCount > 0 : false;

      // Phase 3: PDF outline/bookmark 추출. AI 챕터 추측보다 정확한 TOC 를 ground truth 로.
      // 실패해도 치명적이지 않음 (LLM 폴백).
      let outline: Array<{ title: string; page: number; depth: number }> | undefined;
      if (kind === 'pdf') {
        try {
          const { extractPdfOutline } = await import('@/lib/fileConvert/converters/pdf');
          const entries = await extractPdfOutline(f);
          if (entries.length > 0) outline = entries;
        } catch { /* outline 추출 실패는 무시 */ }
      }

      // Phase 4: PDF native 텍스트 보존 — OCR/Vision 결과로 덮어쓰지 않음.
      // extractPdfMeta 가 이미 [p.N] 페이지 마커 형식으로 반환하므로 그대로 저장.
      const nativeText = kind === 'pdf' && !extracted.startsWith('(') && !extracted.startsWith('[')
        ? extracted
        : undefined;

      sources.push({
        id: newId('src'),
        kind,
        title: processed?.name || f.name,
        content: extracted,
        addedAt: Date.now(),
        enabled: true,
        status: 'ready',
        blobRef,
        mimeType: fileMime,
        pageCount: processed?.pageCount,
        renderMode,
        scanPages: allPagesForOcr.length > 0 ? allPagesForOcr : undefined,
        ocrEnabled: autoOcr || undefined,
        outline,
        nativeText,
      });
    } catch {
      errors.push(`"${f.name}" 처리 실패`);
    }
  }

  return { sources, errors };
}
