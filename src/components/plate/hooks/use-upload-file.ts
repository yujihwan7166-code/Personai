/**
 * 로컬 업로드 훅 — Plate 미디어용. (원본은 UploadThing 의존 → 로컬 objectURL 로 대체)
 * 노트/에디터에서 이미지 등을 별도 업로드 서비스 없이 브라우저 내에서 즉시 처리한다.
 */
import * as React from 'react';

export interface UploadedFile {
  key: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

interface UseUploadFileProps {
  onUploadComplete?: (file: UploadedFile) => void;
  onUploadError?: (error: unknown) => void;
}

export function useUploadFile({ onUploadComplete }: UseUploadFileProps = {}) {
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile>();
  const [uploadingFile, setUploadingFile] = React.useState<File>();
  const [progress, setProgress] = React.useState<number>(0);
  const [isUploading, setIsUploading] = React.useState(false);

  async function uploadFile(file: File): Promise<UploadedFile> {
    setIsUploading(true);
    setUploadingFile(file);
    setProgress(100);

    const result: UploadedFile = {
      key: `local-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
    };

    setUploadedFile(result);
    onUploadComplete?.(result);

    setProgress(0);
    setIsUploading(false);
    setUploadingFile(undefined);

    return result;
  }

  return { isUploading, progress, uploadedFile, uploadFile, uploadingFile };
}
