/**
 * 메모 전용 2단 툴바 — 네이버 블로그 글쓰기 식 위계.
 *
 * Row 1 — 인서트 (라벨 작은 컬러 아이콘): 이미지 / 구분선 / 인용 / 코드블록 / 체크리스트 / 표 / 링크
 * Row 2 — 포맷 (작은 텍스트 변형): 본문/H1·H2·H3 + B I U S code + 색·하이라이트 + 정렬 + 리스트
 *
 * 액션바 안에서 한 번만 그려지므로 sticky 필요 없음.
 */
import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  ImagePlus, Minus, Quote, Code2, CheckSquare, Table as TableIcon, Link as LinkIcon,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3, Type,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered,
  Palette, Highlighter, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TEXT_COLORS = [
  { name: '기본',  value: '' },
  { name: '회색',  value: 'hsl(var(--muted-foreground))' },
  { name: '빨강',  value: 'rgb(239 68 68)'  },
  { name: '주황',  value: 'rgb(249 115 22)' },
  { name: '노랑',  value: 'rgb(234 179 8)'  },
  { name: '초록',  value: 'rgb(34 197 94)'  },
  { name: '청록',  value: 'rgb(20 184 166)' },
  { name: '파랑',  value: 'rgb(59 130 246)' },
  { name: '보라',  value: 'rgb(168 85 247)' },
  { name: '분홍',  value: 'rgb(236 72 153)' },
];

const HIGHLIGHTS = [
  { name: '없음',  value: '' },
  { name: '노랑',  value: 'rgb(254 240 138)' },
  { name: '연두',  value: 'rgb(187 247 208)' },
  { name: '하늘',  value: 'rgb(186 230 253)' },
  { name: '분홍',  value: 'rgb(251 207 232)' },
  { name: '회색',  value: 'rgb(229 231 235)' },
];

interface Props {
  editor: Editor | null;
  onPickImage?: () => void;
}

export function MemoToolbar({ editor, onPickImage }: Props) {
  if (!editor) return null;

  /**
   * 첫 노드(=제목) 가드 — 커서가 doc 의 첫 child 안에 있으면
   * 구조 변경(헤딩/리스트/체크리스트/인용/코드블록/구분선/표) 차단.
   * 인라인 포맷(B/I/U/S/code/색/하이라이트/정렬/링크)은 허용.
   */
  const isInFirstNode = (): boolean => {
    const { from } = editor.state.selection;
    const $pos = editor.state.doc.resolve(from);
    return $pos.depth === 0 || $pos.before(1) === 0;
  };

  /** 가드 — 첫 노드 안이면 toast 띄우고 무시. */
  const guarded = (fn: () => void) => () => {
    if (isInFirstNode()) {
      // 가벼운 hint — title 영역엔 텍스트만.
      const editorEl = editor.view.dom as HTMLElement;
      editorEl.style.transition = 'background 200ms';
      editorEl.style.background = 'hsl(var(--accent) / 0.5)';
      setTimeout(() => { editorEl.style.background = ''; }, 200);
      return;
    }
    fn();
  };

  const exec = {
    // 인라인 — 어디서나 OK
    bold: () => editor.chain().focus().toggleBold().run(),
    italic: () => editor.chain().focus().toggleItalic().run(),
    underline: () => editor.chain().focus().toggleUnderline().run(),
    strike: () => editor.chain().focus().toggleStrike().run(),
    code: () => editor.chain().focus().toggleCode().run(),
    alignLeft: () => editor.chain().focus().setTextAlign('left').run(),
    alignCenter: () => editor.chain().focus().setTextAlign('center').run(),
    alignRight: () => editor.chain().focus().setTextAlign('right').run(),
    alignJustify: () => editor.chain().focus().setTextAlign('justify').run(),
    // 구조 변경 — 첫 노드(=제목)에선 차단
    h1: guarded(() => editor.chain().focus().toggleHeading({ level: 1 }).run()),
    h2: guarded(() => editor.chain().focus().toggleHeading({ level: 2 }).run()),
    h3: guarded(() => editor.chain().focus().toggleHeading({ level: 3 }).run()),
    para: guarded(() => editor.chain().focus().setParagraph().run()),
    bullet: guarded(() => editor.chain().focus().toggleBulletList().run()),
    ordered: guarded(() => editor.chain().focus().toggleOrderedList().run()),
    task: guarded(() => editor.chain().focus().toggleTaskList().run()),
    quote: guarded(() => editor.chain().focus().toggleBlockquote().run()),
    codeblock: guarded(() => editor.chain().focus().toggleCodeBlock().run()),
    hr: guarded(() => editor.chain().focus().setHorizontalRule().run()),
    table: guarded(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()),
  };

  return (
    <div className="flex flex-col gap-0.5 w-full">
      {/* Row 1 — 인서트 */}
      <div className="flex items-center flex-wrap gap-0.5">
        <Btn onClick={onPickImage} title="이미지">
          <ImagePlus className="w-3.5 h-3.5" />
          <Lab>이미지</Lab>
        </Btn>
        <Btn onClick={exec.hr} title="구분선">
          <Minus className="w-3.5 h-3.5" />
          <Lab>구분선</Lab>
        </Btn>
        <Btn onClick={exec.quote} active={editor.isActive('blockquote')} title="인용">
          <Quote className="w-3.5 h-3.5" />
          <Lab>인용</Lab>
        </Btn>
        <Btn onClick={exec.codeblock} active={editor.isActive('codeBlock')} title="코드 블록">
          <Code2 className="w-3.5 h-3.5" />
          <Lab>코드</Lab>
        </Btn>
        <Btn onClick={exec.task} active={editor.isActive('taskList')} title="체크리스트">
          <CheckSquare className="w-3.5 h-3.5" />
          <Lab>체크리스트</Lab>
        </Btn>
        <Btn
          onClick={exec.table}
          title="표"
        >
          <TableIcon className="w-3.5 h-3.5" />
          <Lab>표</Lab>
        </Btn>
        <Btn
          onClick={() => {
            const url = window.prompt('링크 URL:');
            if (!url) return;
            editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive('link')}
          title="링크"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <Lab>링크</Lab>
        </Btn>
      </div>

      {/* divider */}
      <div className="border-t border-[hsl(var(--hairline))] my-0.5" />

      {/* Row 2 — 포맷 */}
      <div className="flex items-center flex-wrap gap-0.5">
        <BlockTypeDropdown editor={editor} />
        <Sep />
        <IconBtn onClick={exec.bold} active={editor.isActive('bold')} title="굵게 (⌘B)">
          <Bold className="w-3.5 h-3.5" />
        </IconBtn>
        <IconBtn onClick={exec.italic} active={editor.isActive('italic')} title="이탤릭 (⌘I)">
          <Italic className="w-3.5 h-3.5" />
        </IconBtn>
        <IconBtn onClick={exec.underline} active={editor.isActive('underline')} title="밑줄">
          <UnderlineIcon className="w-3.5 h-3.5" />
        </IconBtn>
        <IconBtn onClick={exec.strike} active={editor.isActive('strike')} title="취소선">
          <Strikethrough className="w-3.5 h-3.5" />
        </IconBtn>
        <IconBtn onClick={exec.code} active={editor.isActive('code')} title="인라인 코드">
          <Code className="w-3.5 h-3.5" />
        </IconBtn>
        <Sep />
        <ColorDropdown editor={editor} />
        <HighlightDropdown editor={editor} />
        <Sep />
        <IconBtn onClick={exec.alignLeft} active={editor.isActive({ textAlign: 'left' })} title="왼쪽 정렬">
          <AlignLeft className="w-3.5 h-3.5" />
        </IconBtn>
        <IconBtn onClick={exec.alignCenter} active={editor.isActive({ textAlign: 'center' })} title="가운데 정렬">
          <AlignCenter className="w-3.5 h-3.5" />
        </IconBtn>
        <IconBtn onClick={exec.alignRight} active={editor.isActive({ textAlign: 'right' })} title="오른쪽 정렬">
          <AlignRight className="w-3.5 h-3.5" />
        </IconBtn>
        <IconBtn onClick={exec.alignJustify} active={editor.isActive({ textAlign: 'justify' })} title="양쪽 정렬">
          <AlignJustify className="w-3.5 h-3.5" />
        </IconBtn>
        <Sep />
        <IconBtn onClick={exec.bullet} active={editor.isActive('bulletList')} title="글머리 기호">
          <List className="w-3.5 h-3.5" />
        </IconBtn>
        <IconBtn onClick={exec.ordered} active={editor.isActive('orderedList')} title="번호 매기기">
          <ListOrdered className="w-3.5 h-3.5" />
        </IconBtn>
      </div>
    </div>
  );
}

// ─── 작은 빌딩 블록 ──────────────────────────────

const Sep = () => (
  <span className="inline-block w-px h-4 bg-[hsl(var(--hairline))] mx-1" aria-hidden />
);

const Lab = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[10.5px] font-medium leading-none">{children}</span>
);

const Btn = ({
  onClick, active, title, children,
}: {
  onClick?: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={cn(
      'inline-flex items-center gap-1 h-7 px-1.5 rounded transition-colors',
      'text-foreground/65 hover:text-foreground hover:bg-accent',
      active && 'bg-accent text-foreground',
    )}
  >
    {children}
  </button>
);

const IconBtn = ({
  onClick, active, title, children,
}: {
  onClick?: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={cn(
      'inline-flex items-center justify-center h-7 w-7 rounded transition-colors',
      'text-foreground/65 hover:text-foreground hover:bg-accent',
      active && 'bg-accent text-foreground',
    )}
  >
    {children}
  </button>
);

// 본문/H1·H2·H3 dropdown
const BlockTypeDropdown = ({ editor }: { editor: Editor }) => {
  const [open, setOpen] = useState(false);
  const current = editor.isActive('heading', { level: 1 }) ? 'H1'
    : editor.isActive('heading', { level: 2 }) ? 'H2'
    : editor.isActive('heading', { level: 3 }) ? 'H3'
    : '본문';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        className="inline-flex items-center gap-1 h-7 px-2 rounded text-[12px] text-foreground/75 hover:bg-accent hover:text-foreground transition-colors min-w-[60px]"
        title="단락 종류"
      >
        <Type className="w-3 h-3 shrink-0" />
        <span>{current}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-32 rounded-md border border-[hsl(var(--hairline))] bg-popover shadow-md p-0.5">
          {[
            { label: '본문', icon: Type, run: () => editor.chain().focus().setParagraph().run() },
            { label: '제목 1', icon: Heading1, run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
            { label: '제목 2', icon: Heading2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
            { label: '제목 3', icon: Heading3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
          ].map((opt) => {
            const isFirst = (() => {
              const { from } = editor.state.selection;
              const $pos = editor.state.doc.resolve(from);
              return $pos.depth === 0 || $pos.before(1) === 0;
            })();
            const disabled = isFirst;
            return (
              <button
                key={opt.label}
                type="button"
                disabled={disabled}
                onMouseDown={(e) => { e.preventDefault(); if (!disabled) { opt.run(); setOpen(false); } }}
                className={cn(
                  'w-full flex items-center gap-2 px-2 h-7 rounded text-[12px] text-foreground/80 hover:bg-accent hover:text-foreground',
                  disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-foreground/80',
                )}
                title={disabled ? '제목(첫 줄)에선 변경 불가' : undefined}
              >
                <opt.icon className="w-3.5 h-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// 글자색 dropdown
const ColorDropdown = ({ editor }: { editor: Editor }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        className="inline-flex items-center justify-center h-7 w-7 rounded text-foreground/65 hover:text-foreground hover:bg-accent transition-colors"
        title="글자색"
      >
        <Palette className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 grid grid-cols-5 gap-1 p-1.5 rounded-md border border-[hsl(var(--hairline))] bg-popover shadow-md">
          {TEXT_COLORS.map((c) => (
            <button
              key={c.name}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                if (c.value) editor.chain().focus().setColor(c.value).run();
                else editor.chain().focus().unsetColor().run();
                setOpen(false);
              }}
              title={c.name}
              className="h-5 w-5 rounded border border-foreground/15 hover:scale-110 transition-transform"
              style={{ backgroundColor: c.value || 'transparent' }}
            >
              {!c.value && <span className="text-[9px]">×</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// 하이라이트 dropdown
const HighlightDropdown = ({ editor }: { editor: Editor }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        className="inline-flex items-center justify-center h-7 w-7 rounded text-foreground/65 hover:text-foreground hover:bg-accent transition-colors"
        title="하이라이트"
      >
        <Highlighter className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 grid grid-cols-3 gap-1 p-1.5 rounded-md border border-[hsl(var(--hairline))] bg-popover shadow-md">
          {HIGHLIGHTS.map((h) => (
            <button
              key={h.name}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                if (h.value) editor.chain().focus().toggleHighlight({ color: h.value }).run();
                else editor.chain().focus().unsetHighlight().run();
                setOpen(false);
              }}
              title={h.name}
              className="h-5 w-7 rounded border border-foreground/15 hover:scale-105 transition-transform text-[9px]"
              style={{ backgroundColor: h.value || 'transparent' }}
            >
              {!h.value && '×'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
