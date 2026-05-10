/**
 * 메모 전용 단일 행 툴바 — 위키/⋯ 버튼과 같은 줄에 합쳐 컴팩트하게.
 *
 * 레이아웃: [블록타입] | 인서트 (icon-only: 이미지/구분선/인용/코드/체크/표) | B I U S code | 색·하이라이트 | 정렬▾ | 글머리·번호
 *
 * 첫 노드(=제목) 가드 — 구조 변경 차단, 인라인 포맷은 허용.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import {
  ImagePlus, Minus, Quote, Code2, CheckSquare, Table as TableIcon,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3, Type, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered,
  Palette, Highlighter, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';

/** Mac: ⌘ / 다른 OS: Ctrl 표시 — title 단축키 라벨용. */
const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

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

  const isInFirstNode = (): boolean => {
    const { from } = editor.state.selection;
    const $pos = editor.state.doc.resolve(from);
    return $pos.depth === 0 || $pos.before(1) === 0;
  };

  const guarded = (fn: () => void) => () => {
    if (isInFirstNode()) {
      const editorEl = editor.view.dom as HTMLElement;
      editorEl.style.transition = 'background 200ms';
      editorEl.style.background = 'hsl(var(--accent) / 0.5)';
      setTimeout(() => { editorEl.style.background = ''; }, 200);
      // 노란 flash 만으로는 사용자가 "왜 안 됐는지" 모름 — 명시 토스트 추가.
      notify.info('첫 줄(제목) 에서는 블록 삽입이 안 돼요. 본문에 커서를 두세요.', { duration: 2000 });
      return;
    }
    fn();
  };

  const exec = {
    bold: () => editor.chain().focus().toggleBold().run(),
    italic: () => editor.chain().focus().toggleItalic().run(),
    underline: () => editor.chain().focus().toggleUnderline().run(),
    strike: () => editor.chain().focus().toggleStrike().run(),
    code: () => editor.chain().focus().toggleCode().run(),
    bullet: guarded(() => editor.chain().focus().toggleBulletList().run()),
    ordered: guarded(() => editor.chain().focus().toggleOrderedList().run()),
    task: guarded(() => editor.chain().focus().toggleTaskList().run()),
    quote: guarded(() => editor.chain().focus().toggleBlockquote().run()),
    codeblock: guarded(() => editor.chain().focus().toggleCodeBlock().run()),
    hr: guarded(() => editor.chain().focus().setHorizontalRule().run()),
    table: guarded(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()),
    link: () => {
      const prev = editor.getAttributes('link').href as string | undefined;
      const url = window.prompt('링크 URL', prev ?? 'https://');
      if (url === null) return; // 취소
      if (url.trim() === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
        return;
      }
      // URL 정규화 — 프로토콜 없으면 https 추가
      const normalized = /^[a-z]+:\/\//i.test(url) ? url : `https://${url}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run();
    },
  };

  return (
    <div className="flex items-center flex-nowrap gap-0.5 w-full">
      <BlockTypeDropdown editor={editor} />
      <Sep />
      {/* 인서트 — icon-only */}
      <IconBtn onClick={onPickImage} title="이미지">
        <ImagePlus className="w-3.5 h-3.5" />
      </IconBtn>
      <IconBtn onClick={exec.hr} title="구분선">
        <Minus className="w-3.5 h-3.5" />
      </IconBtn>
      <IconBtn onClick={exec.quote} active={editor.isActive('blockquote')} title="인용">
        <Quote className="w-3.5 h-3.5" />
      </IconBtn>
      <IconBtn onClick={exec.codeblock} active={editor.isActive('codeBlock')} title="코드 블록">
        <Code2 className="w-3.5 h-3.5" />
      </IconBtn>
      <IconBtn onClick={exec.task} active={editor.isActive('taskList')} title="체크리스트">
        <CheckSquare className="w-3.5 h-3.5" />
      </IconBtn>
      <IconBtn onClick={exec.table} title="표">
        <TableIcon className="w-3.5 h-3.5" />
      </IconBtn>
      <Sep />
      {/* 인라인 포맷 */}
      <IconBtn onClick={exec.bold} active={editor.isActive('bold')} title={`굵게 (${MOD}B)`}>
        <Bold className="w-3.5 h-3.5" />
      </IconBtn>
      <IconBtn onClick={exec.italic} active={editor.isActive('italic')} title={`이탤릭 (${MOD}I)`}>
        <Italic className="w-3.5 h-3.5" />
      </IconBtn>
      <IconBtn onClick={exec.underline} active={editor.isActive('underline')} title={`밑줄 (${MOD}U)`}>
        <UnderlineIcon className="w-3.5 h-3.5" />
      </IconBtn>
      <IconBtn onClick={exec.strike} active={editor.isActive('strike')} title={`취소선 (${MOD}⇧X)`}>
        <Strikethrough className="w-3.5 h-3.5" />
      </IconBtn>
      <IconBtn onClick={exec.code} active={editor.isActive('code')} title={`인라인 코드 (${MOD}E)`}>
        <Code className="w-3.5 h-3.5" />
      </IconBtn>
      <IconBtn onClick={exec.link} active={editor.isActive('link')} title={`링크 (${MOD}K)`}>
        <LinkIcon className="w-3.5 h-3.5" />
      </IconBtn>
      <Sep />
      <ColorDropdown editor={editor} />
      <HighlightDropdown editor={editor} />
      <Sep />
      <AlignDropdown editor={editor} />
      <Sep />
      <IconBtn onClick={exec.bullet} active={editor.isActive('bulletList')} title={`글머리 기호 (${MOD}⇧8)`}>
        <List className="w-3.5 h-3.5" />
      </IconBtn>
      <IconBtn onClick={exec.ordered} active={editor.isActive('orderedList')} title={`번호 매기기 (${MOD}⇧7)`}>
        <ListOrdered className="w-3.5 h-3.5" />
      </IconBtn>
    </div>
  );
}

// ─── 작은 빌딩 블록 ──────────────────────────────

const Sep = () => (
  <span className="inline-block w-px h-4 bg-[hsl(var(--hairline))] mx-1 shrink-0" aria-hidden />
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
      'inline-flex items-center justify-center h-7 w-7 rounded transition-colors shrink-0',
      'text-foreground/65 hover:text-foreground hover:bg-accent',
      active && 'bg-accent text-foreground',
    )}
  >
    {children}
  </button>
);

/**
 * Popover — 트리거 버튼 + body 로 portal 된 dropdown.
 * 툴바 호스트가 `overflow-x-auto` 라 dropdown 이 잘리는 문제를 회피하기 위해
 * fixed 좌표로 body 직속 렌더한다. 트리거 위치는 anchor rect 기준 자동 계산.
 */
function Popover({
  align = 'left',
  trigger,
  children,
  width,
}: {
  align?: 'left' | 'right';
  trigger: (open: boolean, onToggle: () => void) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  /** 옵션 — 메뉴 너비 (없으면 auto). */
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const triggerWrapRef = useRef<HTMLDivElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const close = () => setOpen(false);
  const toggle = () => setOpen((v) => !v);

  useLayoutEffect(() => {
    if (!open || !triggerWrapRef.current) return;
    const update = () => {
      const r = triggerWrapRef.current!.getBoundingClientRect();
      const popW = popRef.current?.offsetWidth ?? width ?? 128;
      const left = align === 'right'
        ? Math.max(8, r.right - popW)
        : Math.min(window.innerWidth - popW - 8, r.left);
      setPos({ left, top: r.bottom + 4 });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, align, width]);

  // 외부 클릭 — 트리거나 팝업 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerWrapRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={triggerWrapRef} className="relative shrink-0">
      {trigger(open, toggle)}
      {open && pos && createPortal(
        <div
          ref={popRef}
          style={{ position: 'fixed', left: pos.left, top: pos.top, width }}
          className="z-[100] rounded-md border border-[hsl(var(--hairline))] bg-popover shadow-md p-0.5"
        >
          {children(close)}
        </div>,
        document.body,
      )}
    </div>
  );
}

// 본문/H1·H2·H3 dropdown
const BlockTypeDropdown = ({ editor }: { editor: Editor }) => {
  const current = editor.isActive('heading', { level: 1 }) ? 'H1'
    : editor.isActive('heading', { level: 2 }) ? 'H2'
    : editor.isActive('heading', { level: 3 }) ? 'H3'
    : '본문';
  return (
    <Popover
      width={128}
      trigger={(open, onToggle) => (
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'inline-flex items-center gap-1 h-7 px-2 rounded text-[12px] text-foreground/75 hover:bg-accent hover:text-foreground transition-colors min-w-[60px]',
            open && 'bg-accent text-foreground',
          )}
          title="단락 종류"
        >
          <Type className="w-3 h-3 shrink-0" />
          <span>{current}</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      )}
    >
      {(close) => {
        const isFirst = (() => {
          const { from } = editor.state.selection;
          const $pos = editor.state.doc.resolve(from);
          return $pos.depth === 0 || $pos.before(1) === 0;
        })();
        return [
          { label: '본문', icon: Type, run: () => editor.chain().focus().setParagraph().run() },
          { label: '제목 1', icon: Heading1, run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
          { label: '제목 2', icon: Heading2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
          { label: '제목 3', icon: Heading3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            disabled={isFirst}
            onMouseDown={(e) => { e.preventDefault(); if (!isFirst) { opt.run(); close(); } }}
            className={cn(
              'w-full flex items-center gap-2 px-2 h-7 rounded text-[12px] text-foreground/80 hover:bg-accent hover:text-foreground',
              isFirst && 'opacity-40 cursor-not-allowed hover:bg-transparent hover:text-foreground/80',
            )}
            title={isFirst ? '제목(첫 줄)에선 변경 불가' : undefined}
          >
            <opt.icon className="w-3.5 h-3.5" />
            {opt.label}
          </button>
        ));
      }}
    </Popover>
  );
};

// 정렬 dropdown
const AlignDropdown = ({ editor }: { editor: Editor }) => {
  const ActiveIcon = editor.isActive({ textAlign: 'center' }) ? AlignCenter
    : editor.isActive({ textAlign: 'right' }) ? AlignRight
    : AlignLeft;
  return (
    <Popover
      align="right"
      width={128}
      trigger={(open, onToggle) => (
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'inline-flex items-center gap-0.5 h-7 px-1.5 rounded text-foreground/65 hover:bg-accent hover:text-foreground transition-colors',
            open && 'bg-accent text-foreground',
          )}
          title="정렬"
        >
          <ActiveIcon className="w-3.5 h-3.5" />
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      )}
    >
      {(close) => [
        { label: '왼쪽',     icon: AlignLeft,    val: 'left' as const  },
        { label: '가운데',   icon: AlignCenter,  val: 'center' as const },
        { label: '오른쪽',   icon: AlignRight,   val: 'right' as const  },
        // 'justify' 제거 — 메모 짧은 글에선 거의 안 쓰임 + 좁은 폭에서 단어 사이 공백 어색.
      ].map((opt) => {
        const active = editor.isActive({ textAlign: opt.val });
        return (
          <button
            key={opt.val}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign(opt.val).run(); close(); }}
            className={cn(
              'w-full flex items-center gap-2 px-2 h-7 rounded text-[12px] text-foreground/80 hover:bg-accent hover:text-foreground',
              active && 'bg-accent text-foreground',
            )}
          >
            <opt.icon className="w-3.5 h-3.5" />
            {opt.label}
          </button>
        );
      })}
    </Popover>
  );
};

// 글자색 dropdown
const ColorDropdown = ({ editor }: { editor: Editor }) => (
  <Popover
    trigger={(open, onToggle) => (
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'inline-flex items-center justify-center h-7 w-7 rounded text-foreground/65 hover:text-foreground hover:bg-accent transition-colors',
          open && 'bg-accent text-foreground',
        )}
        title="글자색"
      >
        <Palette className="w-3.5 h-3.5" />
      </button>
    )}
  >
    {(close) => (
      <div className="grid grid-cols-5 gap-1 p-1">
        {TEXT_COLORS.map((c) => (
          <button
            key={c.name}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              if (c.value) editor.chain().focus().setColor(c.value).run();
              else editor.chain().focus().unsetColor().run();
              close();
            }}
            title={c.name}
            className="h-5 w-5 rounded border border-foreground/15 hover:scale-110 transition-transform inline-flex items-center justify-center"
            style={{ backgroundColor: c.value || 'transparent' }}
          >
            {!c.value && <span className="text-[9px]">×</span>}
          </button>
        ))}
      </div>
    )}
  </Popover>
);

// 하이라이트 dropdown
const HighlightDropdown = ({ editor }: { editor: Editor }) => (
  <Popover
    trigger={(open, onToggle) => (
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'inline-flex items-center justify-center h-7 w-7 rounded text-foreground/65 hover:text-foreground hover:bg-accent transition-colors',
          open && 'bg-accent text-foreground',
        )}
        title="하이라이트"
      >
        <Highlighter className="w-3.5 h-3.5" />
      </button>
    )}
  >
    {(close) => (
      <div className="grid grid-cols-3 gap-1 p-1">
        {HIGHLIGHTS.map((h) => (
          <button
            key={h.name}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              if (h.value) editor.chain().focus().toggleHighlight({ color: h.value }).run();
              else editor.chain().focus().unsetHighlight().run();
              close();
            }}
            title={h.name}
            className="h-5 w-7 rounded border border-foreground/15 hover:scale-105 transition-transform text-[9px] inline-flex items-center justify-center"
            style={{ backgroundColor: h.value || 'transparent' }}
          >
            {!h.value && '×'}
          </button>
        ))}
      </div>
    )}
  </Popover>
);
