/**
 * 서식 복사 도구바 버튼 (Format Painter — Excel/Google Docs 표준).
 *  - 클릭: 현재 선택의 마크 캡처 + 활성화
 *  - 다음 selection 변경 (non-empty) 시 자동 적용 + 해제
 *  - Esc 또는 다시 클릭으로 취소
 */

import { useEffect, useRef, useState } from 'react';
import { Paintbrush } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { toast } from '@/hooks/use-toast';
import { ToolBtn } from './ToolBtn';

interface CapturedMarks {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  textStyle: { fontFamily?: string; fontSize?: string; color?: string } | null;
  highlight: { color?: string } | null;
}

export function FormatPainterBtn({ editor }: { editor: Editor }) {
  const [captured, setCaptured] = useState<CapturedMarks | null>(null);
  const firstUpdateRef = useRef(false);

  useEffect(() => {
    if (!captured) return;
    const onUpdate = () => {
      if (!firstUpdateRef.current) {
        firstUpdateRef.current = true;
        return;
      }
      const sel = editor.state.selection;
      if (sel.empty) return;
      const c = editor.chain().focus();
      if (captured.bold)      c.setMark('bold');      else c.unsetMark('bold');
      if (captured.italic)    c.setMark('italic');    else c.unsetMark('italic');
      if (captured.underline) c.setMark('underline'); else c.unsetMark('underline');
      if (captured.strike)    c.setMark('strike');    else c.unsetMark('strike');
      if (captured.code)      c.setMark('code');      else c.unsetMark('code');
      if (captured.textStyle) c.setMark('textStyle', captured.textStyle);
      else c.unsetMark('textStyle');
      if (captured.highlight?.color) c.setMark('highlight', { color: captured.highlight.color });
      else c.unsetMark('highlight');
      c.run();
      setCaptured(null);
    };
    editor.on('selectionUpdate', onUpdate);
    return () => { editor.off('selectionUpdate', onUpdate); };
  }, [captured, editor]);

  useEffect(() => {
    if (!captured) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCaptured(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [captured]);

  const handleClick = () => {
    if (captured) {
      setCaptured(null);
      return;
    }
    const sel = editor.state.selection;
    if (sel.empty) {
      toast({ title: '복사할 텍스트를 먼저 선택하세요' });
      return;
    }
    const ts = editor.getAttributes('textStyle') as { fontFamily?: string; fontSize?: string; color?: string };
    const hl = editor.getAttributes('highlight') as { color?: string };
    setCaptured({
      bold:      editor.isActive('bold'),
      italic:    editor.isActive('italic'),
      underline: editor.isActive('underline'),
      strike:    editor.isActive('strike'),
      code:      editor.isActive('code'),
      textStyle: (ts.fontFamily || ts.fontSize || ts.color) ? ts : null,
      highlight: hl.color ? hl : null,
    });
    firstUpdateRef.current = false;
  };

  return (
    <ToolBtn
      onClick={handleClick}
      active={!!captured}
      title={captured ? '서식 복사 활성 — 다음 선택에 적용 (Esc 취소)' : '서식 복사 (Format Painter)'}
    >
      <Paintbrush className="w-4 h-4" />
    </ToolBtn>
  );
}
