import { useState, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3, Type,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Quote, Code2, Minus,
  Link as LinkIcon, ImagePlus,
  Table2,
  Palette, Highlighter, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  editor: Editor | null;
  onPickPage?: () => void;
  onPickImage?: () => void;
}

const FONT_SIZES = [
  { label: '아주 작게', value: '11px' },
  { label: '작게',     value: '13px' },
  { label: '본문',     value: '15px' },
  { label: '크게',     value: '18px' },
  { label: '아주 크게', value: '22px' },
  { label: '특대',     value: '28px' },
];

const TEXT_COLORS = [
  { name: '기본',  value: '' },
  { name: '회색',  value: 'hsl(var(--muted-foreground))' },
  { name: '빨강',  value: 'rgb(239 68 68)'  },
  { name: '주황',  value: 'rgb(249 115 22)' },
  { name: '노랑',  value: 'rgb(234 179 8)'  },
  { name: '초록',  value: 'rgb(34 197 94)'  },
  { name: '청록',  value: 'rgb(20 184 166)' },
  { name: '파랑',  value: 'rgb(59 130 246)' },
  { name: '남색',  value: 'rgb(99 102 241)' },
  { name: '보라',  value: 'rgb(168 85 247)' },
  { name: '분홍',  value: 'rgb(236 72 153)' },
  { name: '갈색',  value: 'rgb(120 53 15)'  },
];

const HIGHLIGHTS = [
  { name: '없음',  value: '' },
  { name: '노랑',  value: 'rgb(254 240 138)' },
  { name: '연두',  value: 'rgb(187 247 208)' },
  { name: '하늘',  value: 'rgb(186 230 253)' },
  { name: '분홍',  value: 'rgb(251 207 232)' },
  { name: '회색',  value: 'rgb(229 231 235)' },
];

export function WikiEditorToolbar({ editor, onPickPage, onPickImage }: Props) {
  if (!editor) return null;
  return (
    <div className="wiki-editor-toolbar-shell sticky top-0 z-20 mb-4">
      <div className="wiki-editor-toolbar">
        <div className="flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1.5" role="toolbar" aria-label="문서 편집 도구">
          <ToolbarGroup>
            <span className="hidden px-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/70 sm:inline">
              서식
            </span>
          <BlockStyleDropdown editor={editor} />
          <FontSizeDropdown editor={editor} />
          </ToolbarGroup>

          <ToolbarGroup>
          <ToolbarBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="굵게 (Ctrl+B)">
            <Bold className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="기울임 (Ctrl+I)">
            <Italic className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="밑줄 (Ctrl+U)">
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="취소선">
            <Strikethrough className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="인라인 코드">
            <Code className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ColorDropdown editor={editor} />
          <HighlightDropdown editor={editor} />
          </ToolbarGroup>

          <ToolbarGroup>
          {onPickPage ? (
            <ToolbarTextBtn onClick={onPickPage} title="문서나 웹 링크 연결 (Ctrl+K)">
              <LinkIcon className="w-3.5 h-3.5" />
              연결
            </ToolbarTextBtn>
          ) : (
            <LinkDropdown editor={editor} />
          )}
          {onPickImage && (
            <ToolbarBtn onClick={onPickImage} title="이미지"><ImagePlus className="w-3.5 h-3.5" /></ToolbarBtn>
          )}
            {onPickPage && <LinkDropdown editor={editor} />}
          <TableInsertDropdown editor={editor} />
          </ToolbarGroup>

          <ToolbarGroup>
            <ToolbarBtn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="왼쪽 정렬"><AlignLeft className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="가운데 정렬"><AlignCenter className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="오른쪽 정렬"><AlignRight className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="양쪽 정렬"><AlignJustify className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="인용문"><Quote className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="코드 블록"><Code2 className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="구분선"><Minus className="w-3.5 h-3.5" /></ToolbarBtn>
          </ToolbarGroup>
        </div>
      </div>
    </div>
  );
}

function ToolbarGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'wiki-toolbar-group flex h-8 shrink-0 items-center gap-0.5 rounded-md px-0.5',
      className,
    )}>
      {children}
    </div>
  );
}

function ToolbarBtn({
  active, onClick, title, children, disabled, className,
}: {
  active?: boolean; onClick: () => void; title: string;
  children: React.ReactNode; disabled?: boolean; className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={cn(
        'h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color',
        active && 'bg-primary/10 text-primary',
        disabled && 'opacity-40 cursor-not-allowed',
        className,
      )}
    >
      {children}
    </button>
  );
}

function ToolbarTextBtn({
  active, onClick, title, children, disabled, className,
}: {
  active?: boolean; onClick: () => void; title: string;
  children: React.ReactNode; disabled?: boolean; className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={cn(
        'h-7 shrink-0 inline-flex items-center justify-center gap-1 rounded px-2 text-[11.5px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color',
        active && 'bg-primary/10 text-primary',
        disabled && 'opacity-40 cursor-not-allowed',
        className,
      )}
    >
      {children}
    </button>
  );
}

function useToolbarDropdownDismiss(
  open: boolean,
  setOpen: (next: boolean) => void,
  menuRef: React.RefObject<HTMLDivElement>,
  triggerRef: React.RefObject<HTMLButtonElement>,
) {
  useEffect(() => {
    if (!open) return;

    const close = (restoreFocus: boolean) => {
      setOpen(false);
      if (restoreFocus) {
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };

    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      close(true);
    };

    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuRef, open, setOpen, triggerRef]);
}

function BlockStyleDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useToolbarDropdownDismiss(open, setOpen, ref, triggerRef);

  const blockOptions = [
    {
      id: 'paragraph',
      label: '본문',
      description: '일반 문단',
      icon: Type,
      active: !editor.isActive('heading') && !editor.isActive('bulletList') && !editor.isActive('orderedList') && !editor.isActive('taskList'),
      run: () => editor.chain().focus().setParagraph().run(),
    },
    {
      id: 'h1',
      label: '큰 제목',
      description: '섹션 시작',
      icon: Heading1,
      active: editor.isActive('heading', { level: 1 }),
      run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: 'h2',
      label: '중간 제목',
      description: '하위 섹션',
      icon: Heading2,
      active: editor.isActive('heading', { level: 2 }),
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: 'h3',
      label: '작은 제목',
      description: '짧은 구획',
      icon: Heading3,
      active: editor.isActive('heading', { level: 3 }),
      run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      id: 'bullet',
      label: '목록',
      description: '글머리',
      icon: List,
      active: editor.isActive('bulletList'),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'ordered',
      label: '번호 목록',
      description: '순서 있는 목록',
      icon: ListOrdered,
      active: editor.isActive('orderedList'),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'task',
      label: '할 일',
      description: '체크리스트',
      icon: CheckSquare,
      active: editor.isActive('taskList'),
      run: () => editor.chain().focus().toggleTaskList().run(),
    },
  ];
  const current = blockOptions.find((option) => option.active) ?? blockOptions[0];
  const CurrentIcon = current.icon;

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'h-7 min-w-[86px] px-2 inline-flex items-center gap-1 rounded text-[11.5px] font-semibold wiki-trans-color',
          current.id === 'paragraph'
            ? 'text-muted-foreground hover:bg-accent hover:text-foreground'
            : 'bg-primary/10 text-primary',
        )}
        title="블록 형식"
        aria-label="블록 형식"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <CurrentIcon className="h-3.5 w-3.5" />
        <span className="min-w-0 flex-1 text-left">{current.label}</span>
        <ChevronDown className="h-2.5 w-2.5" />
      </button>
      {open && (
        <div role="menu" aria-label="블록 형식" className="absolute left-0 top-full z-[80] mt-1 w-[184px] rounded-lg border border-[hsl(var(--hairline))] bg-popover p-1 shadow-xl">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            블록
          </p>
          {blockOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  option.run();
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left wiki-trans-color',
                  option.active
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/82 hover:bg-accent hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-semibold leading-tight">{option.label}</span>
                  <span className="block text-[10.5px] leading-tight text-muted-foreground">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── 표 삽입 dropdown ── */
function TableInsertDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState({ rows: 3, cols: 3 });
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [withHeaderRow, setWithHeaderRow] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useToolbarDropdownDismiss(open, setOpen, ref, triggerRef);

  const insertTable = (nextRows = rows, nextCols = cols) => {
    editor.chain().focus().insertTable({
      rows: clampTableSize(nextRows),
      cols: clampTableSize(nextCols),
      withHeaderRow,
    }).run();
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="표 삽입"
        aria-label="표 삽입"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'h-7 w-8 inline-flex items-center justify-center gap-0.5 rounded wiki-trans-color',
          editor.isActive('table')
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
      >
        <Table2 className="w-3.5 h-3.5" />
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div role="dialog" aria-label="표 삽입" className="absolute top-full left-0 mt-1 wiki-z-popover w-[204px] rounded-lg border border-[hsl(var(--hairline))] bg-popover shadow-xl p-2">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">표</p>
            <span className="text-[10.5px] font-mono text-muted-foreground">{hover.cols} x {hover.rows}</span>
          </div>
          <div className="grid grid-cols-6 gap-1 mb-2">
            {Array.from({ length: 36 }, (_, i) => {
              const row = Math.floor(i / 6) + 1;
              const col = (i % 6) + 1;
              const active = row <= hover.rows && col <= hover.cols;
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  onMouseEnter={() => setHover({ rows: row, cols: col })}
                  onClick={() => {
                    setRows(row);
                    setCols(col);
                    insertTable(row, col);
                  }}
                  aria-label={`${col}열 ${row}행 표 삽입`}
                  className={cn(
                    'h-6 rounded border wiki-trans-color',
                    active
                      ? 'border-primary bg-primary/15'
                      : 'border-[hsl(var(--hairline))] bg-card hover:bg-accent',
                  )}
                />
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="text-[10px] font-medium text-muted-foreground">
              행
              <input
                type="number"
                min={1}
                max={20}
                value={rows}
                onChange={(e) => setRows(clampTableSize(Number(e.target.value)))}
                className="mt-0.5 h-7 w-full rounded-md border border-[hsl(var(--hairline))] bg-background px-2 text-[12px] text-foreground outline-none focus:border-primary/45"
              />
            </label>
            <label className="text-[10px] font-medium text-muted-foreground">
              열
              <input
                type="number"
                min={1}
                max={20}
                value={cols}
                onChange={(e) => setCols(clampTableSize(Number(e.target.value)))}
                className="mt-0.5 h-7 w-full rounded-md border border-[hsl(var(--hairline))] bg-background px-2 text-[12px] text-foreground outline-none focus:border-primary/45"
              />
            </label>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <label className="inline-flex items-center gap-1.5 text-[11.5px] text-foreground/80">
              <input
                type="checkbox"
                checked={withHeaderRow}
                onChange={(e) => setWithHeaderRow(e.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              머리 행
            </label>
            <button
              type="button"
              onClick={() => insertTable()}
              className="h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-[11.5px] font-semibold hover:opacity-90 wiki-trans-color"
            >
              삽입
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 외부 링크 dropdown ── */
function LinkDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState('');
  const [label, setLabel] = useState('');
  const selectionRef = useRef<{ from: number; to: number; empty: boolean } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useToolbarDropdownDismiss(open, setOpen, ref, triggerRef);

  const openMenu = () => {
    const { from, to, empty } = editor.state.selection;
    const selectedText = empty ? '' : editor.state.doc.textBetween(from, to, ' ');
    const currentHref = editor.getAttributes('link').href;
    selectionRef.current = { from, to, empty };
    setHref(typeof currentHref === 'string' ? currentHref : '');
    setLabel(selectedText);
    setOpen((v) => !v);
  };

  const applyLink = () => {
    const range = selectionRef.current;
    const normalized = normalizeHref(href);
    if (!range) return;

    if (!normalized) {
      editor.chain().focus().setTextSelection({ from: range.from, to: range.to }).unsetLink().run();
      setOpen(false);
      return;
    }

    const text = label.trim() || normalized;
    const chain = editor.chain().focus().setTextSelection({ from: range.from, to: range.to });
    if (range.empty) {
      chain.insertContent(`<a href="${escapeHtmlAttr(normalized)}">${escapeHtmlText(text)}</a>`).run();
    } else {
      chain.setLink({ href: normalized }).run();
    }
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        title="웹 링크"
        aria-label="웹 링크"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'h-7 w-8 inline-flex items-center justify-center gap-0.5 rounded wiki-trans-color',
          editor.isActive('link')
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
      >
        <LinkIcon className="w-3.5 h-3.5" />
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div role="dialog" aria-label="웹 링크" className="absolute top-full left-0 mt-1 wiki-z-popover w-[260px] rounded-lg border border-[hsl(var(--hairline))] bg-popover shadow-xl p-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">링크</p>
          <label className="block text-[10px] font-medium text-muted-foreground">
            표시
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={!selectionRef.current?.empty}
              className="mt-0.5 h-8 w-full rounded-md border border-[hsl(var(--hairline))] bg-background px-2 text-[12px] text-foreground outline-none focus:border-primary/45 disabled:opacity-50"
            />
          </label>
          <label className="mt-1.5 block text-[10px] font-medium text-muted-foreground">
            URL
            <input
              value={href}
              onChange={(e) => setHref(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyLink();
                }
              }}
              placeholder="https://"
              className="mt-0.5 h-8 w-full rounded-md border border-[hsl(var(--hairline))] bg-background px-2 text-[12px] text-foreground outline-none focus:border-primary/45"
              autoFocus
            />
          </label>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                const range = selectionRef.current;
                if (range) editor.chain().focus().setTextSelection({ from: range.from, to: range.to }).unsetLink().run();
                setOpen(false);
              }}
              className="h-7 px-2 rounded-md text-[11.5px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
            >
              해제
            </button>
            <button
              type="button"
              onClick={applyLink}
              className="h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-[11.5px] font-semibold hover:opacity-90 wiki-trans-color"
            >
              적용
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function clampTableSize(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(20, Math.max(1, Math.round(value)));
}

function normalizeHref(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (/^(?:[a-z][a-z\d+\-.]*:|#|\/)/i.test(value)) return value;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  return `https://${value}`;
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlAttr(value: string): string {
  return escapeHtmlText(value).replace(/"/g, '&quot;');
}

/* ── 글씨 크기 dropdown ── */
function FontSizeDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useToolbarDropdownDismiss(open, setOpen, ref, triggerRef);

  const current = editor.getAttributes('textStyle')?.fontSize as string | undefined;
  const label = FONT_SIZES.find((s) => s.value === current)?.label ?? '본문';
  const isActive = !!current;
  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'h-7 px-2 inline-flex items-center gap-1 rounded text-[11.5px] wiki-trans-color',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
        title="글씨 크기"
        aria-label="글씨 크기"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Type className="w-3.5 h-3.5" />
        <span className="min-w-[40px] text-left">{label}</span>
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div role="menu" aria-label="글씨 크기" className="absolute top-full left-0 mt-1 wiki-z-popover w-[140px] rounded-md border border-[hsl(var(--hairline))] bg-popover shadow-lg py-1">
          {FONT_SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
              role="menuitem"
              onClick={() => {
                editor.chain().focus().setMark('textStyle', { fontSize: s.value }).run();
                setOpen(false);
              }}
              className={cn(
                'w-full text-left px-3 py-1.5 text-foreground/85 hover:bg-accent hover:text-foreground wiki-trans-color',
                current === s.value && 'bg-primary/10 text-primary font-semibold',
              )}
              style={{ fontSize: s.value }}
            >
              {s.label}
            </button>
          ))}
          <div className="my-0.5 border-t border-[hsl(var(--hairline))]" />
          <button
            type="button"
            role="menuitem"
            onClick={() => { editor.chain().focus().unsetMark('textStyle').run(); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-[11.5px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            크기 초기화
          </button>
        </div>
      )}
    </div>
  );
}

/* ── 색 dropdown ── */
function ColorDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useToolbarDropdownDismiss(open, setOpen, ref, triggerRef);

  const current = editor.getAttributes('textStyle')?.color as string | undefined;
  const isActive = !!current;
  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'h-7 w-8 inline-flex items-center justify-center gap-0.5 rounded wiki-trans-color',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
        title="글씨 색"
        aria-label="글씨 색"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Palette className="w-3.5 h-3.5" />
        <span
          className="w-2 h-2 rounded-full border border-[hsl(var(--hairline))]"
          style={{ background: current || 'currentColor' }}
        />
      </button>
      {open && (
        <div role="menu" aria-label="글씨 색" className="absolute top-full left-0 mt-1 wiki-z-popover w-[180px] rounded-md border border-[hsl(var(--hairline))] bg-popover shadow-lg p-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 mb-1">글씨 색</p>
          <div className="grid grid-cols-6 gap-1">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                role="menuitem"
                onClick={() => {
                  if (c.value) editor.chain().focus().setColor(c.value).run();
                  else editor.chain().focus().unsetColor().run();
                  setOpen(false);
                }}
                title={c.name}
                className={cn(
                  'w-6 h-6 rounded border wiki-trans-color hover:scale-110',
                  current === c.value || (!current && !c.value) ? 'border-primary ring-1 ring-primary/40' : 'border-[hsl(var(--hairline))]',
                )}
                style={{ background: c.value || 'transparent' }}
              >
                {!c.value && <span className="text-[8px] text-muted-foreground">A</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 형광 dropdown ── */
function HighlightDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useToolbarDropdownDismiss(open, setOpen, ref, triggerRef);

  const current = editor.getAttributes('highlight')?.color as string | undefined;
  const isActive = !!current;
  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'h-7 w-8 inline-flex items-center justify-center gap-0.5 rounded wiki-trans-color',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
        title="형광"
        aria-label="형광"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Highlighter className="w-3.5 h-3.5" />
        <span
          className="w-2 h-2 rounded-sm border border-[hsl(var(--hairline))]"
          style={{ background: current || 'rgb(254 240 138)' }}
        />
      </button>
      {open && (
        <div role="menu" aria-label="형광" className="absolute top-full left-0 mt-1 wiki-z-popover w-[140px] rounded-md border border-[hsl(var(--hairline))] bg-popover shadow-lg p-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 mb-1">형광</p>
          <div className="grid grid-cols-6 gap-1">
            {HIGHLIGHTS.map((h) => (
              <button
                key={h.name}
                type="button"
                role="menuitem"
                onClick={() => {
                  if (h.value) editor.chain().focus().setHighlight({ color: h.value }).run();
                  else editor.chain().focus().unsetHighlight().run();
                  setOpen(false);
                }}
                title={h.name}
                className={cn(
                  'w-6 h-6 rounded border wiki-trans-color hover:scale-110',
                  current === h.value || (!current && !h.value) ? 'border-primary ring-1 ring-primary/40' : 'border-[hsl(var(--hairline))]',
                )}
                style={{ background: h.value || 'transparent' }}
              >
                {!h.value && <span className="text-[8px] text-muted-foreground">×</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
