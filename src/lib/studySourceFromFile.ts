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
        extracted = '(텍스트 추출이 제한적입니다. 원본 뷰어에서 확인해주세요.)';
      }
      if (!blobRef && extracted.length < 50) {
        errors.push(`"${f.name}": 텍스트를 추출하지 못했어요.`);
        continue;
      }

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
        scanPages: processed?.scanPages,
      });
    } catch {
      errors.push(`"${f.name}" 처리 실패`);
    }
  }

  return { sources, errors };
}
