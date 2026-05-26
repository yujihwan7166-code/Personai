import { useMemo, useState, type FormEvent, type FormEventHandler } from 'react';
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
  Minus, SlidersHorizontal,
} from 'lucide-react';
import { ToolBtn, Sep } from './ToolBtn';
import { FormatPainterBtn } from './FormatPainterBtn';
import { StyleSelect } from './StyleSelect';
import { ZoomSelect } from './ZoomSelect';
import { ColorPickBtn } from './ColorPickBtn';
import { FontSizeSelect, FontFamilySelect } from './FontSelects';
import { pickImage, insertImageFromUrl } from './pickImage';
import {
  getCurrentTableRowAttributes,
  updateCurrentTableAttributes,
  updateSelectedTableRowAttributes,
} from './tableEditing';
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
      {editor.isActive('table') && <TableEditPopover editor={editor} />}
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
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return `mailto:${trimmed}`;
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
  } as {
    lineHeight?: number | null;
    spaceBefore?: number | null;
    spaceAfter?: number | null;
    indent?: number | null;
    firstLineIndent?: number | null;
    hangingIndent?: number | null;
    rightIndent?: number | null;
    tabStops?: ParagraphTabStop[] | null;
  };
  const currentLineHeight = typeof attrs.lineHeight === 'number' ? attrs.lineHeight : 1.5;
  const currentBefore = typeof attrs.spaceBefore === 'number' ? attrs.spaceBefore : 0;
  const currentAfter = typeof attrs.spaceAfter === 'number' ? attrs.spaceAfter : 8;
  const currentIndent = typeof attrs.indent === 'number' ? attrs.indent : 0;
  const currentFirstLine = typeof attrs.firstLineIndent === 'number' ? attrs.firstLineIndent : 0;
  const currentHanging = typeof attrs.hangingIndent === 'number' ? attrs.hangingIndent : 0;
  const currentRight = typeof attrs.rightIndent === 'number' ? attrs.rightIndent : 0;
  const currentTabs = Array.isArray(attrs.tabStops) ? attrs.tabStops : [];
  const lineOptions = [1, 1.15, 1.5, 2];
  const spacingOptions = [0, 6, 8, 12, 18];
  const indentOptions = [0, 1, 2, 3, 4];

  const submitLineHeight = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const value = normalizeDecimalInput(formData.get('lineHeight'), 1, 3);
    editor.chain().focus().setLineHeight(value).run();
  };
  const submitSpacing = (kind: 'before' | 'after') => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const value = normalizeNumberInput(formData.get(kind), 0, 72);
    editor.chain().focus().setParagraphSpacing({ [kind]: value }).run();
  };
  const submitIndent = (
    key: 'firstLineIndent' | 'hangingIndent' | 'rightIndent',
    max = 240,
  ) => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const value = normalizeNumberInput(formData.get(key), 0, max);
    editor.chain().focus().setParagraphIndent({ [key]: value }).run();
  };
  const addTabStop = (type: ParagraphTabStop['type'], positionTwips: number) => {
    const next = [
      ...currentTabs.filter((tab) => Math.abs(tab.positionTwips - positionTwips) > 60),
      { type, positionTwips },
    ].sort((a, b) => a.positionTwips - b.positionTwips);
    editor.chain().focus().setParagraphTabs(next).run();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={iconButtonClass()} title="줄 및 문단 간격" aria-label="줄 및 문단 간격">
          <ListCollapse className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-[336px] max-h-[72vh] overflow-y-auto bg-white p-3 text-foreground shadow-xl data-[state=open]:opacity-100 dark:bg-popover">
        <div className="text-xs font-medium">줄 및 문단 간격</div>
        <div className="mt-3 px-1 text-[11px] font-medium text-muted-foreground">줄 간격</div>
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
        <div className="mt-2 px-1">
          <NumberField name="lineHeight" label="직접" value={currentLineHeight} suffix="x" onSubmit={submitLineHeight} />
        </div>

        <div className="my-3 h-px bg-border" />
        <div className="px-1 text-[11px] font-medium text-muted-foreground">문단 앞/뒤 간격</div>
        <div className="mt-2 grid grid-cols-2 gap-2 px-1">
          <NumberField name="before" label="앞" value={currentBefore} suffix="pt" onSubmit={submitSpacing('before')} />
          <NumberField name="after" label="뒤" value={currentAfter} suffix="pt" onSubmit={submitSpacing('after')} />
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1 px-1">
          {spacingOptions.map((value) => (
            <Button
              key={value}
              type="button"
              variant={currentBefore === value && currentAfter === value ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-1 text-xs"
              onMouseDown={runToolbarCommand(editor, () => editor.chain().focus().setParagraphSpacing({ before: value, after: value }).run())}
            >
              {value}
            </Button>
          ))}
        </div>

        <div className="my-3 h-px bg-border" />
        <div className="px-1 text-[11px] font-medium text-muted-foreground">들여쓰기</div>
        <div className="mt-2 grid grid-cols-5 gap-1 px-1">
          {indentOptions.map((value) => (
            <Button
              key={value}
              type="button"
              variant={currentIndent === value ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-1 text-xs"
              onMouseDown={runToolbarCommand(editor, () => editor.chain().focus().setParagraphIndent({ indent: value }).run())}
            >
              {value}
            </Button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 px-1">
          <NumberField name="firstLineIndent" label="첫 줄" value={currentFirstLine} suffix="px" onSubmit={submitIndent('firstLineIndent')} />
          <NumberField name="hangingIndent" label="내어쓰기" value={currentHanging} suffix="px" onSubmit={submitIndent('hangingIndent')} />
          <NumberField name="rightIndent" label="오른쪽" value={currentRight} suffix="px" onSubmit={submitIndent('rightIndent')} />
        </div>

        <div className="my-3 h-px bg-border" />
        <div className="flex items-center justify-between px-1">
          <div className="text-[11px] font-medium text-muted-foreground">탭 정지</div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onMouseDown={runToolbarCommand(editor, () => editor.chain().focus().setParagraphTabs(null).run())}
          >
            지우기
          </Button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 px-1">
          <Button type="button" variant="ghost" size="sm" className="h-7 px-1 text-xs" onMouseDown={runToolbarCommand(editor, () => addTabStop('left', 1440))}>
            왼쪽 1in
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-1 text-xs" onMouseDown={runToolbarCommand(editor, () => addTabStop('center', 4320))}>
            가운데
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-1 text-xs" onMouseDown={runToolbarCommand(editor, () => addTabStop('right', 8640))}>
            오른쪽
          </Button>
        </div>
        <div className="mt-1 px-2 text-[11px] text-muted-foreground">
          {currentTabs.length > 0 ? `${currentTabs.length}개 설정됨` : '설정 없음'}
        </div>
      </PopoverContent>
    </Popover>
  );
}

type ParagraphTabStop = {
  type: 'left' | 'right' | 'center' | 'decimal' | 'bar';
  positionTwips: number;
  leader?: 'dot' | 'hyphen' | 'middleDot' | 'underscore' | 'none';
};

function NumberField({
  name,
  label,
  value,
  suffix,
  onSubmit,
}: {
  name: string;
  label: string;
  value: number;
  suffix: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
}) {
  return (
    <form className="space-y-1" onSubmit={onSubmit}>
      <label className="block text-[11px] text-muted-foreground" htmlFor={`doc-${name}`}>
        {label}
      </label>
      <div className="flex items-center gap-1">
        <Input
          id={`doc-${name}`}
          name={name}
          defaultValue={String(value)}
          inputMode="decimal"
          className="h-7 px-2 text-xs"
          onKeyDown={(event) => event.stopPropagation()}
        />
        <span className="w-5 text-[11px] text-muted-foreground">{suffix}</span>
      </div>
    </form>
  );
}

function normalizeNumberInput(value: FormDataEntryValue | null, min: number, max: number): number | null {
  if (typeof value !== 'string') return null;
  const numeric = Number(value.trim());
  if (!Number.isFinite(numeric)) return null;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function normalizeDecimalInput(value: FormDataEntryValue | null, min: number, max: number): number | null {
  if (typeof value !== 'string') return null;
  const numeric = Number(value.trim());
  if (!Number.isFinite(numeric)) return null;
  return Math.max(min, Math.min(max, Math.round(numeric * 100) / 100));
}

function TablePopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState({ rows: 3, cols: 3 });
  const [customRows, setCustomRows] = useState('3');
  const [customCols, setCustomCols] = useState('3');
  const [withHeaderRow, setWithHeaderRow] = useState(false);
  const gridRows = useMemo(() => Array.from({ length: 10 }, (_, row) => row + 1), []);
  const gridCols = useMemo(() => Array.from({ length: 10 }, (_, col) => col + 1), []);

  const insertTable = (rows: number, cols: number) => {
    editor.chain().focus().insertTable({
      rows: clampTableSize(rows),
      cols: clampTableSize(cols),
      withHeaderRow,
    }).run();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={iconButtonClass()}
          title="표"
          aria-label="표"
        >
          <TableIcon className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-[292px] bg-white p-3 text-foreground shadow-xl data-[state=open]:opacity-100 dark:bg-popover">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium">표 삽입</div>
            <div className="text-[11px] text-muted-foreground">드래그하거나 직접 크기 입력</div>
          </div>
          <div className="text-xs font-medium text-primary">{hovered.rows} x {hovered.cols}</div>
        </div>
        <div className="mt-3 grid w-max grid-cols-10 gap-1">
          {gridRows.flatMap((row) =>
            gridCols.map((col) => {
              const active = row <= hovered.rows && col <= hovered.cols;
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  className={[
                    'h-4 w-4 rounded-[2px] border transition-colors',
                    active ? 'border-primary bg-primary/20' : 'border-border bg-background hover:bg-muted',
                  ].join(' ')}
                  aria-label={`${row}행 ${col}열 표 삽입`}
                  onMouseEnter={() => setHovered({ rows: row, cols: col })}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insertTable(row, col);
                  }}
                />
              );
            }),
          )}
        </div>
        <div className="my-3 h-px bg-border" />
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            insertTable(Number(customRows), Number(customCols));
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-[11px] text-muted-foreground" htmlFor="doc-table-rows">
              행
              <Input
                id="doc-table-rows"
                value={customRows}
                inputMode="numeric"
                className="h-8 text-sm"
                onChange={(event) => setCustomRows(event.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                onKeyDown={(event) => event.stopPropagation()}
              />
            </label>
            <label className="space-y-1 text-[11px] text-muted-foreground" htmlFor="doc-table-cols">
              열
              <Input
                id="doc-table-cols"
                value={customCols}
                inputMode="numeric"
                className="h-8 text-sm"
                onChange={(event) => setCustomCols(event.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                onKeyDown={(event) => event.stopPropagation()}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 rounded-md px-1 py-1.5 text-xs text-muted-foreground hover:bg-muted">
            <input
              type="checkbox"
              checked={withHeaderRow}
              className="h-3.5 w-3.5"
              onChange={(event) => setWithHeaderRow(event.target.checked)}
            />
            첫 행을 머리 행으로 만들기
          </label>
          <div className="flex justify-end">
            <Button type="submit" size="sm" className="h-8">
              표 삽입
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function clampTableSize(value: number): number {
  if (!Number.isFinite(value)) return 3;
  return Math.max(1, Math.min(20, Math.round(value)));
}

function TableEditPopover({ editor }: { editor: Editor }) {
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
  const tableAttrs = editor.getAttributes('table') as {
    tableWidth?: number | null;
    tableWidthType?: 'px' | 'percent' | null;
    tableAlign?: 'left' | 'center' | 'right' | null;
    tableLayout?: 'fixed' | 'autofit' | null;
    tableCellSpacing?: number | null;
  };
  const cellAttrs = {
    ...editor.getAttributes('tableCell'),
    ...editor.getAttributes('tableHeader'),
  } as {
    borderSize?: number | null;
    paddingTop?: number | null;
    paddingRight?: number | null;
    paddingBottom?: number | null;
    paddingLeft?: number | null;
    verticalAlign?: 'top' | 'center' | 'bottom' | null;
  };

  const setTableAttrs = (attrs: Record<string, unknown>) => updateCurrentTableAttributes(editor, attrs);
  const setCellAttrs = (attrs: Record<string, unknown>) => {
    let chain = editor.chain().focus();
    for (const [key, value] of Object.entries(attrs)) {
      chain = chain.setCellAttribute(key, value);
    }
    chain.run();
  };
  const currentWidth = tableAttrs.tableWidthType === 'percent' && tableAttrs.tableWidth
    ? `${tableAttrs.tableWidth}%`
    : 'auto';
  const currentPadding = cellAttrs.paddingTop ?? cellAttrs.paddingRight ?? cellAttrs.paddingBottom ?? cellAttrs.paddingLeft ?? 6;
  const currentBorderSize = typeof cellAttrs.borderSize === 'number' ? cellAttrs.borderSize : 4;
  const currentVerticalAlign = cellAttrs.verticalAlign ?? 'top';
  const currentCellSpacing = typeof tableAttrs.tableCellSpacing === 'number' ? tableAttrs.tableCellSpacing : 0;
  const currentRowAttrs = getCurrentTableRowAttributes(editor);
  const currentRowHeight = typeof currentRowAttrs?.rowHeight === 'number' ? currentRowAttrs.rowHeight : null;
  const currentRowHeightRule = currentRowAttrs?.rowHeightRule === 'exact' ? 'exact' : 'atLeast';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={iconButtonClass(true)}
          title="표 옵션"
          aria-label="표 옵션"
          aria-pressed
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-[340px] max-h-[72vh] overflow-y-auto bg-white p-3 text-foreground shadow-xl data-[state=open]:opacity-100 dark:bg-popover">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium">표 옵션</div>
            <div className="text-[11px] text-muted-foreground">선택한 표에 적용</div>
          </div>
          <div className="flex items-center gap-1.5">
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
        </div>

        <div className="my-3 h-px bg-border" />
            <div className="grid grid-cols-2 gap-1">
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

        <div className="my-3 h-px bg-border" />
        <div className="space-y-2">
          <div className="text-[11px] font-medium text-muted-foreground">표 너비</div>
          <div className="grid grid-cols-4 gap-1">
            {[
              { label: '자동', value: 'auto' },
              { label: '50%', value: '50%' },
              { label: '75%', value: '75%' },
              { label: '100%', value: '100%' },
            ].map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={currentWidth === item.value ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-1 text-xs"
                onMouseDown={runToolbarCommand(editor, () => {
                  if (item.value === 'auto') setTableAttrs({ tableWidth: null, tableWidthType: null, tableLayout: 'autofit' });
                  else setTableAttrs({ tableWidth: Number(item.value.replace('%', '')), tableWidthType: 'percent', tableLayout: 'fixed' });
                })}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="text-[11px] font-medium text-muted-foreground">표 정렬</div>
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: '왼쪽', value: 'left' },
              { label: '가운데', value: 'center' },
              { label: '오른쪽', value: 'right' },
            ].map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={tableAttrs.tableAlign === item.value ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-1 text-xs"
                onMouseDown={runToolbarCommand(editor, () => setTableAttrs({ tableAlign: item.value }))}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="text-[11px] font-medium text-muted-foreground">행 높이</div>
          <div className="grid grid-cols-5 gap-1">
            {[
              { label: '자동', value: null },
              { label: '28', value: 28 },
              { label: '36', value: 36 },
              { label: '48', value: 48 },
              { label: '72', value: 72 },
            ].map((item) => (
              <Button
                key={item.label}
                type="button"
                variant={currentRowHeight === item.value ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-1 text-xs"
                onMouseDown={runToolbarCommand(editor, () => {
                  updateSelectedTableRowAttributes(editor, {
                    rowHeight: item.value,
                    rowHeightRule: item.value == null ? null : currentRowHeightRule,
                  });
                })}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {[
              { label: '최소 높이', value: 'atLeast' },
              { label: '고정 높이', value: 'exact' },
            ].map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={currentRowHeightRule === item.value ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-1 text-xs"
                onMouseDown={runToolbarCommand(editor, () => {
                  updateSelectedTableRowAttributes(editor, {
                    rowHeight: currentRowHeight ?? 36,
                    rowHeightRule: item.value,
                  });
                })}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="text-[11px] font-medium text-muted-foreground">셀 여백</div>
          <div className="grid grid-cols-4 gap-1">
            {[4, 8, 12, 16].map((value) => (
              <Button
                key={value}
                type="button"
                variant={currentPadding === value ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-1 text-xs"
                onMouseDown={runToolbarCommand(editor, () => setCellAttrs({
                  paddingTop: value,
                  paddingRight: value,
                  paddingBottom: value,
                  paddingLeft: value,
                }))}
              >
                {value}px
              </Button>
            ))}
          </div>
          <div className="text-[11px] font-medium text-muted-foreground">세로 정렬</div>
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: '위', value: 'top' },
              { label: '중간', value: 'center' },
              { label: '아래', value: 'bottom' },
            ].map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={currentVerticalAlign === item.value ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-1 text-xs"
                onMouseDown={runToolbarCommand(editor, () => setCellAttrs({ verticalAlign: item.value }))}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="text-[11px] font-medium text-muted-foreground">테두리 두께</div>
          <div className="grid grid-cols-4 gap-1">
            {[
              { label: '없음', value: null },
              { label: '0.5', value: 4 },
              { label: '1', value: 8 },
              { label: '2', value: 16 },
            ].map((item) => (
              <Button
                key={item.label}
                type="button"
                variant={currentBorderSize === item.value ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-1 text-xs"
                onMouseDown={runToolbarCommand(editor, () => setCellAttrs({ borderSize: item.value }))}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <div className="text-[11px] font-medium text-muted-foreground">셀 간격</div>
          <div className="grid grid-cols-4 gap-1">
            {[0, 2, 4, 8].map((value) => (
              <Button
                key={value}
                type="button"
                variant={currentCellSpacing === value ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-1 text-xs"
                onMouseDown={runToolbarCommand(editor, () => setTableAttrs({ tableCellSpacing: value || null }))}
              >
                {value}px
              </Button>
            ))}
          </div>
        </div>
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
        'h-8 justify-start gap-2 px-2 text-xs text-foreground hover:bg-muted',
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
  const [text, setText] = useState('');
  const [range, setRange] = useState<SelectionRange | null>(null);

  const openEditor = (next: boolean) => {
    if (next) {
      const { from, to } = editor.state.selection;
      setRange({ from, to });
      const href = (editor.getAttributes('link').href as string | undefined) ?? '';
      const selectedText = editor.state.doc.textBetween(from, to, ' ').trim();
      setUrl(href);
      setText(selectedText || href.replace(/^mailto:/, ''));
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
    const label = text.trim() || normalized.replace(/^mailto:/, '');
    const selectedText = editor.state.doc.textBetween(target.from, target.to, ' ').trim();
    if (target.from === target.to && !editor.isActive('link')) {
      chain.insertContent({
        type: 'text',
        text: label,
        marks: [{ type: 'link', attrs: { href: normalized } }],
      }).run();
    } else if (label && selectedText && label !== selectedText) {
      chain.insertContent({
        type: 'text',
        text: label,
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
      <PopoverContent align="start" sideOffset={8} className="w-80 bg-white p-3 text-foreground shadow-xl data-[state=open]:opacity-100 dark:bg-popover">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <div className="text-xs font-medium">링크</div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground" htmlFor="doc-link-text">
              표시할 텍스트
            </label>
            <Input
              id="doc-link-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="문서에 보일 텍스트"
              className="h-8 text-sm"
              onKeyDown={(event) => event.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground" htmlFor="doc-link-url">
              링크
            </label>
            <Input
              id="doc-link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com 또는 name@example.com"
              className="h-8 text-sm"
              onKeyDown={(event) => event.stopPropagation()}
            />
          </div>
          <div className="text-[11px] text-muted-foreground">
            주소 없이 적용하면 현재 링크를 지웁니다.
          </div>
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

  const openEditor = (next: boolean) => {
    if (next) setUrl('');
    setOpen(next);
  };

  return (
    <Popover open={open} onOpenChange={openEditor}>
      <PopoverTrigger asChild>
        <button type="button" className={iconButtonClass()} title="이미지 삽입" aria-label="이미지 삽입">
          <ImagePlus className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-80 bg-white p-3 text-foreground shadow-xl data-[state=open]:opacity-100 dark:bg-popover">
        <div className="space-y-3">
          <div>
            <div className="text-xs font-medium">이미지 삽입</div>
            <div className="text-[11px] text-muted-foreground">파일 또는 이미지 주소로 넣기</div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
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
            <label className="text-[11px] text-muted-foreground" htmlFor="doc-image-url">
              이미지 URL
            </label>
            <Input
              id="doc-image-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com/image.png"
              className="h-8 text-sm"
              onKeyDown={(event) => event.stopPropagation()}
              autoFocus
            />
            <div className="text-[11px] text-muted-foreground">
              http(s) 주소를 지원하며, 생략하면 https://를 자동으로 붙입니다.
            </div>
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
  const [selectedText, setSelectedText] = useState('');
  const selectionEmpty = editor.state.selection.empty;

  const openEditor = (next: boolean) => {
    if (next) {
      const { from, to, empty } = editor.state.selection;
      if (empty) return;
      setRange({ from, to });
      setSelectedText(editor.state.doc.textBetween(from, to, ' ').trim());
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
          title={selectionEmpty ? '텍스트를 선택하면 댓글을 추가할 수 있습니다' : '댓글 추가'}
          aria-label={selectionEmpty ? '텍스트 선택 후 댓글 추가' : '댓글 추가'}
          aria-pressed={editor.isActive('comment')}
          disabled={selectionEmpty}
        >
          <MessageSquarePlus className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-80 bg-white p-3 text-foreground shadow-xl data-[state=open]:opacity-100 dark:bg-popover">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <div>
            <div className="text-xs font-medium">댓글</div>
            <div className="mt-1 line-clamp-2 rounded-md bg-muted px-2 py-1.5 text-[11px] text-muted-foreground">
              {selectedText || '선택한 텍스트'}
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="댓글 내용"
            className="min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onKeyDown={(event) => event.stopPropagation()}
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

  const openEditor = (next: boolean) => {
    if (next) setText('');
    setOpen(next);
  };

  return (
    <Popover open={open} onOpenChange={openEditor}>
      <PopoverTrigger asChild>
        <button type="button" className={iconButtonClass()} title="각주 추가" aria-label="각주 추가">
          <Asterisk className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-80 bg-white p-3 text-foreground shadow-xl data-[state=open]:opacity-100 dark:bg-popover">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <div>
            <div className="text-xs font-medium">각주</div>
            <div className="text-[11px] text-muted-foreground">커서 위치에 각주 번호를 넣고 문서 끝에 내용을 모읍니다.</div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="각주 내용"
            className="min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onKeyDown={(event) => event.stopPropagation()}
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
