import { useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Undo2, Redo2,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ListCollapse,
  Palette, Highlighter, Link as LinkIcon, Link2Off,
  Table as TableIcon, ImagePlus, PaintBucket, Square,
  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
  IndentIncrease, IndentDecrease, Asterisk, MessageSquarePlus,
  Rows3, Columns3, Trash2, TableCellsMerge, TableCellsSplit, PanelTop,
  Minus,
} from 'lucide-react';
import { ToolBtn, Sep } from './ToolBtn';
import { FormatPainterBtn } from './FormatPainterBtn';
import { StyleSelect } from './StyleSelect';
import { ZoomSelect } from './ZoomSelect';
import { ColorPickBtn } from './ColorPickBtn';
import { FontSizeSelect, FontFamilySelect } from './FontSelects';
import { pickImage, insertImageFromUrl } from './pickImage';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export function DocToolbar({ editor, zoom, onZoomChange }: {
  editor: Editor; zoom: number; onZoomChange: (z: number) => void;
}) {
  const increaseIndent = () => {
    if (editor.can().sinkListItem('listItem')) {
      editor.chain().focus().sinkListItem('listItem').run();
      return;
    }
    editor.chain().focus().increaseIndent().run();
  };
  const decreaseIndent = () => {
    if (editor.can().liftListItem('listItem')) {
      editor.chain().focus().liftListItem('listItem').run();
      return;
    }
    editor.chain().focus().decreaseIndent().run();
  };

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

      <ZoomSelect zoom={zoom} onZoomChange={onZoomChange} />
      <StyleSelect editor={editor} />
      <FontFamilySelect editor={editor} />
      <FontSizeSelect editor={editor} />
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
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="취소선">
        <Strikethrough className="w-4 h-4" />
      </ToolBtn>
      <Sep />

      <ColorPickBtn
        icon={<Palette className="w-4 h-4" />}
        value={editor.getAttributes('textStyle').color ?? '#222222'}
        onChange={(c) => editor.chain().focus().setColor(c).run()}
        onClear={() => editor.chain().focus().unsetColor().run()}
        title="글자색"
      />
      <ColorPickBtn
        icon={<Highlighter className="w-4 h-4" />}
        value={editor.getAttributes('highlight').color ?? '#fff59d'}
        onChange={(c) => editor.chain().focus().toggleHighlight({ color: c }).run()}
        onClear={() => editor.chain().focus().unsetHighlight().run()}
        title="강조색"
      />
      <Sep />

      <LinkPopover editor={editor} />
      {editor.isActive('link') && (
        <ToolBtn editor={editor} onClick={() => editor.chain().focus().unsetLink().run()} title="링크 제거">
          <Link2Off className="w-4 h-4" />
        </ToolBtn>
      )}
      <CommentPopover editor={editor} />
      <ImageInsertPopover editor={editor} />
      <Sep />

      <TablePopover editor={editor} />
      <Sep />

      <ToolBtn editor={editor} onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="글머리 기호 목록">
        <List className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="번호 매기기 목록">
        <ListOrdered className="w-4 h-4" />
      </ToolBtn>
      <Sep />

      <ToolBtn editor={editor} onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="왼쪽 정렬">
        <AlignLeft className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="가운데 정렬">
        <AlignCenter className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="오른쪽 정렬">
        <AlignRight className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="양쪽 정렬">
        <AlignJustify className="w-4 h-4" />
      </ToolBtn>
      <LineSpacingPopover editor={editor} />
      <Sep />

      <ToolBtn editor={editor} onClick={increaseIndent} disabled={!editor.can().sinkListItem('listItem') && !editor.can().increaseIndent()} title="들여쓰기">
        <IndentIncrease className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn editor={editor} onClick={decreaseIndent} disabled={!editor.can().liftListItem('listItem') && !editor.can().decreaseIndent()} title="내어쓰기">
        <IndentDecrease className="w-4 h-4" />
      </ToolBtn>
      <Sep />

      <ToolBtn editor={editor} onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="위 첨자">
        <SuperscriptIcon className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn editor={editor} onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title="아래 첨자">
        <SubscriptIcon className="w-4 h-4" />
      </ToolBtn>
      <FootnotePopover editor={editor} />
    </div>
  );
}

interface SelectionRange {
  from: number;
  to: number;
}

function normalizeLinkUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^#[A-Za-z_][A-Za-z0-9_:-]*$/.test(trimmed)) return trimmed;
  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
      return withProtocol;
    }
  } catch {
    return null;
  }
  return null;
}

function iconButtonClass(active = false): string {
  return [
    'p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-muted',
    active ? 'bg-muted text-foreground' : '',
  ].join(' ');
}

function runToolbarCommand(editor: Editor, command: () => void): React.MouseEventHandler<HTMLElement> {
  return (event) => {
    event.preventDefault();
    command();
    queueMicrotask(() => editor.view.focus());
  };
}

function LineSpacingPopover({ editor }: { editor: Editor }) {
  const attrs = {
    ...editor.getAttributes('paragraph'),
    ...editor.getAttributes('heading'),
  } as { lineHeight?: number | null; spaceBefore?: number | null; spaceAfter?: number | null };
  const currentLineHeight = typeof attrs.lineHeight === 'number' ? attrs.lineHeight : 1.5;
  const currentBefore = typeof attrs.spaceBefore === 'number' ? attrs.spaceBefore : 0;
  const currentAfter = typeof attrs.spaceAfter === 'number' ? attrs.spaceAfter : 8;
  const lineOptions = [1, 1.15, 1.5, 2];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={iconButtonClass()} title="줄 및 문단 간격" aria-label="줄 및 문단 간격">
          <ListCollapse className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">줄 간격</div>
        <div className="grid grid-cols-4 gap-1 px-1">
          {lineOptions.map((value) => (
            <Button
              key={value}
              type="button"
              variant={Math.abs(currentLineHeight - value) < 0.01 ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-1 text-xs"
              onMouseDown={runToolbarCommand(editor, () => editor.chain().focus().setLineHeight(value).run())}
            >
              {value}
            </Button>
          ))}
        </div>
        <div className="mt-2 px-2 py-1 text-[11px] font-medium text-muted-foreground">문단 간격</div>
        <div className="grid grid-cols-2 gap-1 px-1">
          <Button
            type="button"
            variant={currentBefore > 0 ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-1 text-xs"
            onMouseDown={runToolbarCommand(editor, () => editor.chain().focus().setParagraphSpacing({ before: currentBefore > 0 ? 0 : 12 }).run())}
          >
            위
          </Button>
          <Button
            type="button"
            variant={currentAfter > 0 ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-1 text-xs"
            onMouseDown={runToolbarCommand(editor, () => editor.chain().focus().setParagraphSpacing({ after: currentAfter > 0 ? 0 : 8 }).run())}
          >
            아래
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TablePopover({ editor }: { editor: Editor }) {
  const [hovered, setHovered] = useState({ rows: 3, cols: 3 });
  const gridRows = useMemo(() => Array.from({ length: 6 }, (_, row) => row + 1), []);
  const gridCols = useMemo(() => Array.from({ length: 6 }, (_, col) => col + 1), []);
  const inTable = editor.isActive('table');
  const currentCellBackground = (
    editor.getAttributes('tableCell').backgroundColor
    ?? editor.getAttributes('tableHeader').backgroundColor
    ?? '#ffffff'
  ) as string;
  const currentCellBorderColor = (
    editor.getAttributes('tableCell').borderColor
    ?? editor.getAttributes('tableHeader').borderColor
    ?? '#d0d0d0'
  ) as string;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={iconButtonClass(inTable)}
          title="표"
          aria-label="표"
          aria-pressed={inTable}
        >
          <TableIcon className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="text-xs font-medium text-muted-foreground">표 삽입</div>
        <div className="mt-2 grid w-max grid-cols-6 gap-1">
          {gridRows.flatMap((row) =>
            gridCols.map((col) => {
              const active = row <= hovered.rows && col <= hovered.cols;
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  className={[
                    'h-5 w-5 rounded-[2px] border transition-colors',
                    active ? 'border-primary bg-primary/20' : 'border-border bg-background hover:bg-muted',
                  ].join(' ')}
                  aria-label={`${row}행 ${col}열 표 삽입`}
                  onMouseEnter={() => setHovered({ rows: row, cols: col })}
                  onMouseDown={runToolbarCommand(editor, () => editor.chain().focus().insertTable({ rows: row, cols: col, withHeaderRow: true }).run())}
                />
              );
            }),
          )}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{hovered.rows} x {hovered.cols}</div>

        {inTable && (
          <>
            <div className="my-3 h-px bg-border" />
            <div className="grid grid-cols-2 gap-1.5">
              <TableCommand editor={editor} icon={<Rows3 className="w-4 h-4" />} label="위 행 추가" command={() => editor.chain().focus().addRowBefore().run()} />
              <TableCommand editor={editor} icon={<Rows3 className="w-4 h-4" />} label="아래 행 추가" command={() => editor.chain().focus().addRowAfter().run()} />
              <TableCommand editor={editor} icon={<Columns3 className="w-4 h-4" />} label="왼쪽 열 추가" command={() => editor.chain().focus().addColumnBefore().run()} />
              <TableCommand editor={editor} icon={<Columns3 className="w-4 h-4" />} label="오른쪽 열 추가" command={() => editor.chain().focus().addColumnAfter().run()} />
              <TableCommand editor={editor} icon={<Minus className="w-4 h-4" />} label="행 삭제" command={() => editor.chain().focus().deleteRow().run()} />
              <TableCommand editor={editor} icon={<Minus className="w-4 h-4" />} label="열 삭제" command={() => editor.chain().focus().deleteColumn().run()} />
              <TableCommand editor={editor} icon={<TableCellsMerge className="w-4 h-4" />} label="셀 병합" command={() => editor.chain().focus().mergeCells().run()} disabled={!editor.can().mergeCells()} />
              <TableCommand editor={editor} icon={<TableCellsSplit className="w-4 h-4" />} label="셀 분할" command={() => editor.chain().focus().splitCell().run()} disabled={!editor.can().splitCell()} />
              <TableCommand editor={editor} icon={<PanelTop className="w-4 h-4" />} label="머리 행 전환" command={() => editor.chain().focus().toggleHeaderRow().run()} />
              <TableCommand editor={editor} icon={<Trash2 className="w-4 h-4" />} label="표 삭제" command={() => editor.chain().focus().deleteTable().run()} destructive />
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <ColorPickBtn
                icon={<PaintBucket className="w-4 h-4" />}
                value={currentCellBackground}
                onChange={(c) => editor.chain().focus().setCellAttribute('backgroundColor', c).run()}
                onClear={() => editor.chain().focus().setCellAttribute('backgroundColor', null).run()}
                title="셀 배경색"
              />
              <ColorPickBtn
                icon={<Square className="w-4 h-4" />}
                value={currentCellBorderColor}
                onChange={(c) => editor.chain().focus().setCellAttribute('borderColor', c).setCellAttribute('borderSize', 8).run()}
                onClear={() => editor.chain().focus().setCellAttribute('borderColor', null).setCellAttribute('borderSize', null).run()}
                title="셀 테두리색"
              />
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

function TableCommand({ editor, icon, label, command, disabled, destructive }: {
  editor: Editor;
  icon: React.ReactNode;
  label: string;
  command: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={[
        'h-8 justify-start gap-2 px-2 text-xs',
        destructive ? 'text-destructive hover:text-destructive' : '',
      ].join(' ')}
      disabled={disabled}
      onMouseDown={runToolbarCommand(editor, command)}
    >
      {icon}
      {label}
    </Button>
  );
}

function LinkPopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [range, setRange] = useState<SelectionRange | null>(null);

  const openEditor = (next: boolean) => {
    if (next) {
      const { from, to } = editor.state.selection;
      setRange({ from, to });
      setUrl((editor.getAttributes('link').href as string | undefined) ?? '');
    }
    setOpen(next);
  };

  const apply = () => {
    const normalized = normalizeLinkUrl(url);
    if (normalized == null) {
      toast({ title: '유효하지 않은 링크', description: '웹 주소 또는 이메일 링크를 입력해주세요.' });
      return;
    }
    const target = range ?? editor.state.selection;
    const chain = editor.chain().focus().setTextSelection(target);
    if (!normalized) {
      chain.extendMarkRange('link').unsetLink().run();
      setOpen(false);
      return;
    }
    if (target.from === target.to && !editor.isActive('link')) {
      chain.insertContent({
        type: 'text',
        text: normalized,
        marks: [{ type: 'link', attrs: { href: normalized } }],
      }).run();
    } else {
      chain.extendMarkRange('link').setLink({ href: normalized }).run();
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={openEditor}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={iconButtonClass(editor.isActive('link'))}
          title="링크 추가/수정"
          aria-label="링크 추가/수정"
          aria-pressed={editor.isActive('link')}
        >
          <LinkIcon className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <div className="text-xs font-medium">링크</div>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="h-8 text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-1.5">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>취소</Button>
            <Button type="submit" size="sm">적용</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function ImageInsertPopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  const applyUrl = () => {
    const ok = insertImageFromUrl(editor, url);
    if (ok) {
      setUrl('');
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={iconButtonClass()} title="이미지 삽입" aria-label="이미지 삽입">
          <ImagePlus className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              pickImage(editor);
              setOpen(false);
            }}
          >
            파일에서 삽입
          </Button>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              applyUrl();
            }}
          >
            <div className="text-xs font-medium">이미지 URL</div>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/image.png"
              className="h-8 text-sm"
            />
            <div className="flex justify-end gap-1.5">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>취소</Button>
              <Button type="submit" size="sm">삽입</Button>
            </div>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CommentPopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [range, setRange] = useState<SelectionRange | null>(null);
  const selectionEmpty = editor.state.selection.empty;

  const openEditor = (next: boolean) => {
    if (next) {
      const { from, to, empty } = editor.state.selection;
      if (empty) return;
      setRange({ from, to });
      setText('');
    }
    setOpen(next);
  };

  const apply = () => {
    const trimmed = text.trim();
    if (!trimmed || !range) return;
    editor.chain().focus().setTextSelection(range).addComment(trimmed).run();
    setText('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={openEditor}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={iconButtonClass(editor.isActive('comment'))}
          title="댓글 추가"
          aria-label="댓글 추가"
          aria-pressed={editor.isActive('comment')}
          disabled={selectionEmpty}
        >
          <MessageSquarePlus className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <div className="text-xs font-medium">댓글</div>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="댓글 내용"
            className="h-8 text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-1.5">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>취소</Button>
            <Button type="submit" size="sm" disabled={!text.trim()}>추가</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function FootnotePopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  const apply = () => {
    editor.chain().focus().addFootnote(text.trim() || '(빈 각주)').run();
    setText('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={iconButtonClass()} title="각주 추가" aria-label="각주 추가">
          <Asterisk className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <div className="text-xs font-medium">각주</div>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="각주 내용"
            className="h-8 text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-1.5">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>취소</Button>
            <Button type="submit" size="sm">추가</Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
