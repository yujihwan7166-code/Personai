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
