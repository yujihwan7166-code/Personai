import { useState, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3, Type,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare, Quote, Code2, Minus,
  Link as LinkIcon, BookOpen, ImagePlus, Table as TableIcon,
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
    <div className="sticky top-0 z-20 mb-3 -mx-1 px-1">
      <div className="flex items-center flex-wrap gap-0.5 p-1 rounded-lg border border-[hsl(var(--hairline))] bg-popover/95 backdrop-blur shadow-sm">
        {/* 글씨 크기 */}
        <FontSizeDropdown editor={editor} />
        <Sep />

        {/* 헤딩 토글 */}
        <ToolbarBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="큰 제목 (Ctrl+Shift+1)">
          <Heading1 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="중간 제목 (Ctrl+Shift+2)">
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="작은 제목 (Ctrl+Shift+3)">
          <Heading3 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <Sep />

        {/* 인라인 마크 */}
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
        <Sep />

        {/* 색·하이라이트 */}
        <ColorDropdown editor={editor} />
        <HighlightDropdown editor={editor} />
        <Sep />

        {/* 정렬 */}
        <ToolbarBtn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="왼쪽 정렬"><AlignLeft className="w-3.5 h-3.5" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="가운데 정렬"><AlignCenter className="w-3.5 h-3.5" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="오른쪽 정렬"><AlignRight className="w-3.5 h-3.5" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="양쪽 정렬"><AlignJustify className="w-3.5 h-3.5" /></ToolbarBtn>
        <Sep />

        {/* 리스트 / 인용 */}
        <ToolbarBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="목록"><List className="w-3.5 h-3.5" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="번호 목록"><ListOrdered className="w-3.5 h-3.5" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} title="할 일"><CheckSquare className="w-3.5 h-3.5" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="인용문"><Quote className="w-3.5 h-3.5" /></ToolbarBtn>
        <ToolbarBtn active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="코드 블록"><Code2 className="w-3.5 h-3.5" /></ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="구분선"><Minus className="w-3.5 h-3.5" /></ToolbarBtn>
        <Sep />

        {/* 삽입 */}
        <ToolbarBtn
          active={editor.isActive('link')}
          onClick={() => {
            const prev = editor.getAttributes('link').href;
            const url = window.prompt('링크 URL:', prev ?? 'https://');
            if (url === null) return;
            if (url === '') editor.chain().focus().unsetLink().run();
            else editor.chain().focus().setLink({ href: url }).run();
          }}
          title="하이퍼링크 (Ctrl+K)"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>
        {onPickPage && (
          <ToolbarBtn onClick={onPickPage} title="페이지 링크"><BookOpen className="w-3.5 h-3.5" /></ToolbarBtn>
        )}
        {onPickImage && (
          <ToolbarBtn onClick={onPickImage} title="이미지"><ImagePlus className="w-3.5 h-3.5" /></ToolbarBtn>
        )}
        <ToolbarBtn
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="표 삽입"
        >
          <TableIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>
      </div>
    </div>
  );
}

function ToolbarBtn({
  active, onClick, title, children, disabled,
}: {
  active?: boolean; onClick: () => void; title: string;
  children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        'h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color',
        active && 'bg-primary/10 text-primary',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="w-px h-5 bg-[hsl(var(--hairline))] mx-0.5" />;
}

/* ── 글씨 크기 dropdown ── */
function FontSizeDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  const current = editor.getAttributes('textStyle')?.fontSize as string | undefined;
  const label = FONT_SIZES.find((s) => s.value === current)?.label ?? '본문';
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-7 px-2 inline-flex items-center gap-1 rounded text-[11.5px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
        title="글씨 크기"
      >
        <Type className="w-3.5 h-3.5" />
        <span className="min-w-[40px] text-left">{label}</span>
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 wiki-z-popover w-[140px] rounded-md border border-[hsl(var(--hairline))] bg-popover shadow-lg py-1">
          {FONT_SIZES.map((s) => (
            <button
              key={s.value}
              type="button"
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
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  const current = editor.getAttributes('textStyle')?.color as string | undefined;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-7 w-8 inline-flex items-center justify-center gap-0.5 rounded text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
        title="글씨 색"
      >
        <Palette className="w-3.5 h-3.5" />
        <span
          className="w-2 h-2 rounded-full border border-foreground/20"
          style={{ background: current || 'currentColor' }}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 wiki-z-popover w-[180px] rounded-md border border-[hsl(var(--hairline))] bg-popover shadow-lg p-2">
          <p className="text-[9.5px] font-mono uppercase tracking-wider text-muted-foreground/70 mb-1">글씨 색</p>
          <div className="grid grid-cols-6 gap-1">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
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
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  const current = editor.getAttributes('highlight')?.color as string | undefined;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-7 w-8 inline-flex items-center justify-center gap-0.5 rounded text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
        title="형광"
      >
        <Highlighter className="w-3.5 h-3.5" />
        <span
          className="w-2 h-2 rounded-sm border border-foreground/20"
          style={{ background: current || 'rgb(254 240 138)' }}
        />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 wiki-z-popover w-[140px] rounded-md border border-[hsl(var(--hairline))] bg-popover shadow-lg p-2">
          <p className="text-[9.5px] font-mono uppercase tracking-wider text-muted-foreground/70 mb-1">형광</p>
          <div className="grid grid-cols-6 gap-1">
            {HIGHLIGHTS.map((h) => (
              <button
                key={h.name}
                type="button"
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
