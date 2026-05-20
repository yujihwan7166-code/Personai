// 다운로드 이중 전략: File System Access API 우선, anchor fallback

import { canUseFileSystemAccess } from './features';
import { sanitizeFileName } from '@/lib/blob';

// 통합된 sanitizeFileName 재노출 (외부에서 이 모듈을 통해 import 하던 경로 호환).
export { sanitizeFileName };

export function replaceExtension(name: string, newExtWithDot: string): string {
  const lastDot = name.lastIndexOf('.');
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  return `${base}${newExtWithDot}`;
}

export async function downloadBlob(blob: Blob, fileName: string): Promise<void> {
  const safeName = sanitizeFileName(fileName);

  if (canUseFileSystemAccess()) {
    try {
      const handle = await (window as unknown as {
        showSaveFilePicker: (opts: { suggestedName: string }) => Promise<FileSystemFileHandle>;
      }).showSaveFilePicker({ suggestedName: safeName });
      const writable = await (handle as unknown as { createWritable: () => Promise<WritableStream> }).createWritable();
      await (writable as unknown as { write: (data: Blob) => Promise<void> }).write(blob);
      await (writable as unknown as { close: () => Promise<void> }).close();
      return;
    } catch (err) {
      // 사용자가 취소했거나 API 권한 문제 — fallback
      if ((err as Error).name === 'AbortError') return;
    }
  }

  // Fallback: <a download>
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
