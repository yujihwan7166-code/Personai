/** 문서 에디터 도구바 — 모든 서식·정렬·색·표·이미지·각주·들여쓰기. */

import type { Editor } from '@tiptap/react';
import {
  Undo2, Redo2,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Palette, Highlighter, Link as LinkIcon, Link2Off,
  Table as TableIcon, ImagePlus,
  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
  IndentIncrease, IndentDecrease, Asterisk,
} from 'lucide-react';
import { ToolBtn, Sep } from './ToolBtn';
import { FormatPainterBtn } from './FormatPainterBtn';
import { StyleSelect } from './StyleSelect';
import { ZoomSelect } from './ZoomSelect';
import { ColorPickBtn } from './ColorPickBtn';
import { FontSizeSelect, FontFamilySelect } from './FontSelects';
import { pickImage } from './pickImage';

export function DocToolbar({ editor, zoom, onZoomChange }: {
  editor: Editor; zoom: number; onZoomChange: (z: number) => void;
}) {
  return (
    <div className="border-t border-border bg-background flex items-center gap-0.5 px-3 py-1.5 overflow-x-auto">
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="실행 취소 (Ctrl+Z)">
        <Undo2 className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="다시 실행 (Ctrl+Shift+Z)">
        <Redo2 className="w-4 h-4" />
      </ToolBtn>
      <Sep />
      <FormatPainterBtn editor={editor} />
      <Sep />
      <StyleSelect editor={editor} />
      <ZoomSelect zoom={zoom} onZoomChange={onZoomChange} />
      <Sep />
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="굵게 (Ctrl+B)">
        <Bold className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="기울임 (Ctrl+I)">
        <Italic className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="밑줄 (Ctrl+U)">
        <UnderlineIcon className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="취소선 (Ctrl+Shift+X)">
        <Strikethrough className="w-4 h-4" />
      </ToolBtn>
      <Sep />
      {/* 목록 — 블록 스타일은 StyleSelect 으로 통일. 인라인 코드/헤딩/인용/코드블록/구분선은 슬래시 메뉴 + 키보드. */}
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="글머리 기호 목록 (Ctrl+Shift+8)">
        <List className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="번호 매기기 (Ctrl+Shift+7)">
        <ListOrdered className="w-4 h-4" />
      </ToolBtn>
      <Sep />

      {/* 정렬 4종 */}
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="왼쪽 정렬 (Ctrl+Shift+L)">
        <AlignLeft className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="가운데 정렬 (Ctrl+Shift+E)">
        <AlignCenter className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="오른쪽 정렬 (Ctrl+Shift+R)">
        <AlignRight className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="양쪽 정렬 (Ctrl+Shift+J)">
        <AlignJustify className="w-4 h-4" />
      </ToolBtn>
      <Sep />

      {/* 글자색 / 형광펜 */}
      <ColorPickBtn icon={<Palette className="w-4 h-4" />} value={editor.getAttributes('textStyle').color ?? '#222222'}
        onChange={(c) => editor.chain().focus().setColor(c).run()}
        onClear={() => editor.chain().focus().unsetColor().run()} title="글자색" />
      <ColorPickBtn icon={<Highlighter className="w-4 h-4" />} value={editor.getAttributes('highlight').color ?? '#fff59d'}
        onChange={(c) => editor.chain().focus().toggleHighlight({ color: c }).run()}
        onClear={() => editor.chain().focus().unsetHighlight().run()} title="형광펜" />
      <Sep />

      {/* 링크 */}
      <ToolBtn editor={editor} onClick={() => {
        const prev = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt('링크 URL', prev ?? 'https://');
        if (url === null) return;
        if (url === '') editor.chain().focus().extendMarkRange('link').unsetLink().run();
        else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }} active={editor.isActive('link')} title="링크 추가/수정">
        <LinkIcon className="w-4 h-4" />
      </ToolBtn>
      {editor.isActive('link') && (
        <ToolBtn editor={editor} onClick={() => editor.chain().focus().unsetLink().run()} title="링크 제거">
          <Link2Off className="w-4 h-4" />
        </ToolBtn>
      )}
      <Sep />

      {/* 표 삽입 + 표 안 액션 */}
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="표 삽입 (3×3)">
        <TableIcon className="w-4 h-4" />
      </ToolBtn>
      {editor.isActive('table') && (
        <>
          <ToolBtn editor={editor} onClick={() => editor.chain().focus().addRowAfter().run()} title="아래 행 추가"><span className="text-[10px]">+행</span></ToolBtn>
          <ToolBtn editor={editor} onClick={() => editor.chain().focus().addColumnAfter().run()} title="오른쪽 열 추가"><span className="text-[10px]">+열</span></ToolBtn>
          <ToolBtn editor={editor} onClick={() => editor.chain().focus().deleteRow().run()} title="현재 행 삭제"><span className="text-[10px]">−행</span></ToolBtn>
          <ToolBtn editor={editor} onClick={() => editor.chain().focus().deleteColumn().run()} title="현재 열 삭제"><span className="text-[10px]">−열</span></ToolBtn>
          <ToolBtn editor={editor} onClick={() => editor.chain().focus().deleteTable().run()} title="표 삭제"><span className="text-[10px] text-destructive">표✕</span></ToolBtn>
        </>
      )}
      <Sep />

      {/* 이미지 */}
      <ToolBtn editor={editor} onClick={() => pickImage(editor)} title="이미지 추가 (파일 선택)">
        <ImagePlus className="w-4 h-4" />
      </ToolBtn>
      <Sep />

      {/* 글꼴 크기·종류 */}
      <FontSizeSelect editor={editor} />
      <FontFamilySelect editor={editor} />
      <Sep />

      {/* 첨자 + 각주 */}
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="위 첨자 (Ctrl+.)">
        <SuperscriptIcon className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title="아래 첨자 (Ctrl+,)">
        <SubscriptIcon className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn editor={editor} onClick={() => {
        const text = window.prompt('각주 내용:', '');
        if (text == null) return;
        editor.chain().focus().addFootnote(text.trim() || '(빈 각주)').run();
      }} title="각주 추가">
        <Asterisk className="w-4 h-4" />
      </ToolBtn>
      <Sep />

      {/* 들여쓰기 (리스트 항목 한정) */}
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().sinkListItem('listItem').run()} disabled={!editor.can().sinkListItem('listItem')} title="들여쓰기 (Tab, 리스트에서)">
        <IndentIncrease className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().liftListItem('listItem').run()} disabled={!editor.can().liftListItem('listItem')} title="내어쓰기 (Shift+Tab, 리스트에서)">
        <IndentDecrease className="w-4 h-4" />
      </ToolBtn>
    </div>
  );
}
