/**
 * DOCX 뷰어 — Step 7 에서 mammoth HTML 렌더로 대체.
 */
import { useEffect, useState } from 'react';
import { getBlob } from '@/lib/studyBlobStore';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

interface Props {
  blobRef: string;
}

export function DocxViewer({ blobRef }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const blob = await getBlob(blobRef);
        if (!blob) throw new Error('파일을 찾을 수 없어요.');
        const arrayBuffer = await blob.arrayBuffer();
        const mammoth = await import('mammoth');
        const { value } = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) setHtml(sanitizeHtml(value));
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : '렌더 실패');
      }
    })();
    return () => { cancelled = true; };
  }, [blobRef]);

  if (err) {
    return (
      <div className="h-full flex items-center justify-center text-[12px] text-red-600">
        Word 렌더 실패: {err}
      </div>
    );
  }
  if (!html) {
    return (
      <div className="h-full flex items-center justify-center text-[12px] text-slate-500">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-slate-300 border-t-indigo-500 animate-spin mr-2" />
        문서 렌더링 중…
      </div>
    );
  }
  return (
    <div className="h-full overflow-y-auto bg-slate-100 dark:bg-slate-950 py-6">
      <div className="mx-auto bg-white shadow-lg rounded-sm max-w-[820px] px-14 py-12">
        <div
          className="docx-body prose prose-slate prose-sm max-w-none"
          // mammoth 결과는 신뢰 가능한 로컬 파일 파싱 산출물
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
