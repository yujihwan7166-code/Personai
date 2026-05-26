import type { Editor } from '@tiptap/react';
import { toast } from '@/hooks/use-toast';
import { estimateUsedBytes } from '@/lib/storageQuota';
import { formatBytes } from '@/lib/formatters';

const MAX_INLINE_IMAGE_BYTES = 1024 * 1024;
const LOCAL_STORAGE_WARN_BYTES = 4.5 * 1024 * 1024;
const MAX_INSERTED_IMAGE_WIDTH = 520;

function estimatedDataUrlStorageBytes(file: File): number {
  return Math.ceil(file.size * 1.37 * 2);
}

export function pickImage(editor: Editor): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: '이미지 파일이 아닙니다', description: 'PNG, JPG, GIF 같은 이미지 파일만 넣을 수 있습니다.' });
      return;
    }
    if (file.size > MAX_INLINE_IMAGE_BYTES) {
      toast({
        title: '이미지가 너무 큽니다',
        description: `${formatBytes(MAX_INLINE_IMAGE_BYTES)} 이하 파일만 직접 삽입할 수 있습니다. 큰 이미지는 URL로 넣어주세요.`,
      });
      return;
    }
    const projected = estimateUsedBytes() + estimatedDataUrlStorageBytes(file);
    if (projected > LOCAL_STORAGE_WARN_BYTES) {
      toast({
        title: '저장 공간이 부족할 수 있습니다',
        description: `삽입 후 예상 사용량이 약 ${formatBytes(projected)}입니다. 이미지를 줄이거나 URL 삽입을 사용해주세요.`,
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result;
      if (typeof src === 'string') {
        insertMeasuredImage(editor, src);
      }
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

export function insertImageFromUrl(editor: Editor, raw: string): boolean {
  const url = normalizeImageUrl(raw);
  if (!url) {
    toast({ title: '이미지 URL이 필요합니다', description: '이미지 주소를 입력해주세요.' });
    return false;
  }
  editor.chain().focus().setImage({ src: url }).run();
  toast({ title: '이미지를 삽입했습니다', description: '외부 이미지라 원본 사이트가 차단되면 보이지 않을 수 있습니다.' });
  return true;
}

function normalizeImageUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'https://') return null;
  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname) {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function insertMeasuredImage(editor: Editor, src: string): void {
  const image = new window.Image();
  image.onload = () => {
    const naturalWidth = image.naturalWidth || MAX_INSERTED_IMAGE_WIDTH;
    const naturalHeight = image.naturalHeight || Math.round(MAX_INSERTED_IMAGE_WIDTH * 0.75);
    const width = Math.min(naturalWidth, MAX_INSERTED_IMAGE_WIDTH);
    const height = Math.round(width * (naturalHeight / naturalWidth));
    editor.chain().focus().setImage({ src, width, height }).run();
  };
  image.onerror = () => {
    editor.chain().focus().setImage({ src }).run();
  };
  image.src = src;
}

export function insertImageByUrl(editor: Editor): void {
  const raw = window.prompt('이미지 URL', 'https://');
  if (!raw) return;
  insertImageFromUrl(editor, raw);
}
