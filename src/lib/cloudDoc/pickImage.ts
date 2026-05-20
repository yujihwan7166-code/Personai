/** 도구바 이미지+ 버튼 / 슬래시 메뉴 공용 — 파일 선택 후 base64 inline 삽입. */

import type { Editor } from '@tiptap/react';
import { toast } from '@/hooks/use-toast';

export function pickImage(editor: Editor): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: '이미지가 큽니다',
        description: '2MB 이하 권장 (localStorage 한계). 더 큰 이미지는 다음 단계의 IndexedDB 활성화 후 처리됩니다.',
      });
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result;
      if (typeof src === 'string') {
        editor.chain().focus().setImage({ src }).run();
      }
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

/** URL 로 이미지 삽입 — 원격 호스팅 이미지를 본문에 인라인. */
export function insertImageByUrl(editor: Editor): void {
  const raw = window.prompt('이미지 URL', 'https://');
  if (!raw) return;
  const url = raw.trim();
  if (!url || url === 'https://') return;
  // 간단한 URL 검증 — https? + 경로
  if (!/^https?:\/\/\S+/i.test(url)) {
    toast({ title: '유효하지 않은 URL', description: 'http(s):// 로 시작해야 합니다.' });
    return;
  }
  editor.chain().focus().setImage({ src: url }).run();
  toast({ title: '이미지 삽입됨', description: '외부 호스팅 이미지 — 원본 사이트가 막히면 깨질 수 있어요.' });
}
