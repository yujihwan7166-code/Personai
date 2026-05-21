/** 도구바 이미지+ 버튼 / 슬래시 메뉴 공용 — 파일 선택 후 base64 inline 삽입. */

import type { Editor } from '@tiptap/react';
import { toast } from '@/hooks/use-toast';
import { estimateUsedBytes } from '@/lib/storageQuota';
import { formatBytes } from '@/lib/formatters';

const MAX_INLINE_IMAGE_BYTES = 1024 * 1024;
const LOCAL_STORAGE_WARN_BYTES = 4.5 * 1024 * 1024;
const MAX_INSERTED_IMAGE_WIDTH = 520;

function estimatedDataUrlStorageBytes(file: File): number {
  // base64는 약 4/3배 커지고, localStorage는 UTF-16이라 문자당 2바이트로 잡는다.
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
      toast({ title: '이미지 파일이 아니에요', description: 'PNG, JPG, GIF 같은 이미지 파일만 넣을 수 있어요.' });
      return;
    }
    if (file.size > MAX_INLINE_IMAGE_BYTES) {
      toast({
        title: '이미지가 너무 큽니다',
        description: `${formatBytes(MAX_INLINE_IMAGE_BYTES)} 이하 파일만 직접 삽입할 수 있어요. 큰 이미지는 URL로 넣어주세요.`,
      });
      return;
    }
    const projected = estimateUsedBytes() + estimatedDataUrlStorageBytes(file);
    if (projected > LOCAL_STORAGE_WARN_BYTES) {
      toast({
        title: '저장 공간이 부족할 수 있어요',
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

/** URL 로 이미지 삽입 — 원격 호스팅 이미지를 본문에 인라인. */
export function insertImageFromUrl(editor: Editor, raw: string): boolean {
  const url = raw.trim();
  if (!url || url === 'https://') return false;
  // 간단한 URL 검증 — https? + 경로
  if (!/^https?:\/\/\S+/i.test(url)) {
    toast({ title: '유효하지 않은 URL', description: 'http(s):// 로 시작해야 합니다.' });
    return false;
  }
  editor.chain().focus().setImage({ src: url }).run();
  toast({ title: '이미지 삽입됨', description: '외부 호스팅 이미지 — 원본 사이트가 막히면 깨질 수 있어요.' });
  return true;
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

/** URL 로 이미지 삽입 — 원격 호스팅 이미지를 본문에 인라인. */
export function insertImageByUrl(editor: Editor): void {
  const raw = window.prompt('이미지 URL', 'https://');
  if (!raw) return;
  insertImageFromUrl(editor, raw);
}
