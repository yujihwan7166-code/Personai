import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import { TextStyleKit } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Markdown } from 'tiptap-markdown';
import { WikiEditorToolbar } from './WikiEditorToolbar';
import {
  Bold, Italic, Strikethrough, Code, Link as LinkIcon, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code2, Minus, ImagePlus, CheckSquare, BookOpen, Lightbulb,
} from 'lucide-react';
import type { WikiPage } from '@/types/wiki';
import { cn } from '@/lib/utils';

interface Props {
  body: string; // markdown
  onChange: (markdown: string) => void;
  /** 위키링크·페이지 검색용. 현재 페이지는 자동 제외. */
  allPages: WikiPage[];
  currentId?: string;
  /** 페이지 검색·삽입 (Ctrl+K 또는 슬래시 /페이지). 부모가 모달 띄우고 선택된 제목 콜백. */
  onPickPage?: (insertTitle: (title: string) => void) => void;
  /** 이미지 업로드 — 본문 내 드롭/붙여넣기 시. base64 dataURL 또는 IDB blob ref 반환. */
  onUploadImage?: (file: File) => Promise<string>;
}

/**
 * 마이위키 블록 에디터 (TipTap 기반).
 *
 * 직관 WYSIWYG:
 * - 마크다운 부호 안 보임 — 즉시 렌더된 결과 직접 편집
 * - InputRule: `# `, `## `, `> `, `- `, `1. `, `[ ] ` 자동 변환
 * - 슬래시 `/` 명령으로 블록 변환·삽입
 * - 인라인 툴바 (선택 시)
 * - 단축키: Ctrl+B/I/E, Ctrl+Shift+1/2/3, Ctrl+K
 *
 * 저장 형식: markdown (tiptap-markdown 변환). 기존 IDB body 와 100% 호환.
 */
export function WikiBlockEditor({ body, onChange, onPickPage, onUploadImage }: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 별도 import 하는 마크는 StarterKit 에서 비활성 (중복 등록 throw 방지)
        link: false,
        underline: false,
        codeBlock: { HTMLAttributes: { class: 'wiki-codeblock' } },
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: ({ node, pos, editor: ed }) => {
          if (pos === 0 && ed.state.doc.childCount === 1 && node.type.name === 'paragraph') {
            return '여기에 적기 시작하거나 / 로 메뉴를 열어보세요';
          }
          if (node.type.name === 'heading') return `제목 ${node.attrs.level}`;
          return '';
        },
        showOnlyWhenEditable: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'wiki-extlink' },
        autolink: true,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ HTMLAttributes: { class: 'wiki-image' } }),
      TextStyleKit.configure({ lineHeight: false, fontFamily: false }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Superscript,
      Subscript,
      Table.configure({ resizable: true, HTMLAttributes: { class: 'wiki-table' } }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown.configure({
        html: false,
        tightLists: true,
        linkify: true,
        breaks: false,
        transformPastedText: true,
      }),
    ],
    content: body || '',
    editorProps: {
      attributes: {
        class: 'wiki-prose wiki-block-editor focus:outline-none min-h-[420px]',
        spellCheck: 'false',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file || !onUploadImage) return true;
            void onUploadImage(file).then((src) => {
              editorRef.current?.chain().focus().setImage({ src }).run();
            });
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const imgFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (imgFiles.length === 0) return false;
        event.preventDefault();
        if (!onUploadImage) return true;
        void Promise.all(imgFiles.map(onUploadImage)).then((srcs) => {
          for (const src of srcs) {
            editorRef.current?.chain().focus().setImage({ src }).run();
          }
        });
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      // markdown 으로 직렬화 — tiptap-markdown 이 storage.markdown 노출
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (editor.storage as any).markdown?.getMarkdown?.() ?? editor.getHTML();
      onChangeRef.current(md);
    },
  });

  const editorRef = useRef<typeof editor>(editor);
  useEffect(() => { editorRef.current = editor; }, [editor]);

  // 외부 body 변경 시 (예: 페이지 전환) 에디터 컨텐츠 동기화
  const lastBodyRef = useRef(body);
  useEffect(() => {
    if (!editor) return;
    if (lastBodyRef.current === body) return;
    lastBodyRef.current = body;
    // 현재 에디터 출력과 동일하면 skip
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = (editor.storage as any).markdown?.getMarkdown?.() ?? '';
    if (current.trim() === body.trim()) return;
    editor.commands.setContent(body || '', false);
  }, [body, editor]);

  /* 슬래시 메뉴 상태 */
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashCoords, setSlashCoords] = useState<{ left: number; top: number } | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const slashAnchorRef = useRef<{ from: number; to: number } | null>(null);

  // 키보드 — `/` 입력 감지, ESC 닫기
  useEffect(() => {
    if (!editor) return;
    const handler = (e: KeyboardEvent) => {
      if (slashOpen) {
        if (e.key === 'Escape') { setSlashOpen(false); return; }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor, slashOpen]);

  // 슬래시 트리거 — 빈 줄에서 `/` 입력 시
  useEffect(() => {
    if (!editor) return;
    const onTransaction = () => {
      const { state } = editor;
      const { $from } = state.selection;
      const lineText = $from.parent.textContent;
      const beforeCursor = lineText.slice(0, $from.parentOffset);
      const m = /\/(\S{0,20})$/.exec(beforeCursor);
      if (m && $from.parent.type.name === 'paragraph') {
        // 좌표 계산
        const coords = editor.view.coordsAtPos($from.pos);
        const editorRect = editor.view.dom.getBoundingClientRect();
        setSlashCoords({
          left: coords.left - editorRect.left,
          top: coords.bottom - editorRect.top + 4,
        });
        setSlashQuery(m[1]);
        setSlashOpen(true);
        slashAnchorRef.current = { from: $from.pos - m[0].length, to: $from.pos };
      } else if (slashOpen) {
        setSlashOpen(false);
      }
    };
    editor.on('transaction', onTransaction);
    editor.on('selectionUpdate', onTransaction);
    return () => {
      editor.off('transaction', onTransaction);
      editor.off('selectionUpdate', onTransaction);
    };
  }, [editor, slashOpen]);

  /* 슬래시 명령 정의 */
  const slashCommands = useMemo(() => [
    { id: 'h1', label: '큰 제목', keys: ['제목', 'h1', 'heading'], icon: <Heading1 className="w-4 h-4" />, run: (e: typeof editor) => e?.chain().focus().toggleHeading({ level: 1 }).run() },
    { id: 'h2', label: '중간 제목', keys: ['제목', 'h2', 'heading'], icon: <Heading2 className="w-4 h-4" />, run: (e: typeof editor) => e?.chain().focus().toggleHeading({ level: 2 }).run() },
    { id: 'h3', label: '작은 제목', keys: ['제목', 'h3', 'heading'], icon: <Heading3 className="w-4 h-4" />, run: (e: typeof editor) => e?.chain().focus().toggleHeading({ level: 3 }).run() },
    { id: 'bullet', label: '• 목록', keys: ['목록', 'bullet', 'list'], icon: <List className="w-4 h-4" />, run: (e: typeof editor) => e?.chain().focus().toggleBulletList().run() },
    { id: 'ordered', label: '1. 번호 목록', keys: ['번호', 'ordered', 'list'], icon: <ListOrdered className="w-4 h-4" />, run: (e: typeof editor) => e?.chain().focus().toggleOrderedList().run() },
    { id: 'task', label: '☑ 할 일', keys: ['할일', 'todo', 'task', '체크'], icon: <CheckSquare className="w-4 h-4" />, run: (e: typeof editor) => e?.chain().focus().toggleTaskList().run() },
    { id: 'quote', label: '인용문', keys: ['인용', 'quote'], icon: <Quote className="w-4 h-4" />, run: (e: typeof editor) => e?.chain().focus().toggleBlockquote().run() },
    { id: 'code', label: '코드 블록', keys: ['코드', 'code'], icon: <Code2 className="w-4 h-4" />, run: (e: typeof editor) => e?.chain().focus().toggleCodeBlock().run() },
    { id: 'hr', label: '구분선', keys: ['구분선', 'hr', '구분', 'divider'], icon: <Minus className="w-4 h-4" />, run: (e: typeof editor) => e?.chain().focus().setHorizontalRule().run() },
    { id: 'wikilink', label: '🔗 페이지 링크', keys: ['링크', '페이지', 'link', 'wiki'], icon: <BookOpen className="w-4 h-4" />, run: (_e: typeof editor) => {
      onPickPage?.((title) => {
        editor?.chain().focus().insertContent(`[[${title}]]`).run();
      });
    } },
    { id: 'callout', label: '💡 콜아웃 (인용 박스)', keys: ['콜아웃', '박스', 'callout', '노트'], icon: <Lightbulb className="w-4 h-4" />, run: (e: typeof editor) => {
      e?.chain().focus().insertContent('> [!note]\n> 노트 내용을 입력하세요\n').run();
    } },
    { id: 'image', label: '이미지', keys: ['이미지', 'image', '사진'], icon: <ImagePlus className="w-4 h-4" />, run: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file || !onUploadImage) return;
        const src = await onUploadImage(file);
        editor?.chain().focus().setImage({ src }).run();
      };
      input.click();
    } },
  ], [editor, onPickPage, onUploadImage]);

  const filteredCommands = useMemo(() => {
    const q = slashQuery.trim().toLowerCase();
    if (!q) return slashCommands;
    return slashCommands.filter((c) =>
      c.label.toLowerCase().includes(q)
      || c.keys.some((k) => k.toLowerCase().includes(q)),
    );
  }, [slashQuery, slashCommands]);

  useEffect(() => { setSlashIndex(0); }, [slashQuery]);

  // 슬래시 메뉴 키보드 이동
  useEffect(() => {
    if (!editor || !slashOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (!slashOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((i) => Math.min(filteredCommands.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        const cmd = filteredCommands[slashIndex];
        if (cmd) {
          e.preventDefault();
          runSlashCommand(cmd);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSlashOpen(false);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [editor, slashOpen, filteredCommands, slashIndex]);

  function runSlashCommand(cmd: typeof slashCommands[number]) {
    if (!editor) return;
    // `/query` 토큰 삭제
    const anchor = slashAnchorRef.current;
    if (anchor) {
      editor.chain().focus().deleteRange({ from: anchor.from, to: anchor.to }).run();
    }
    cmd.run(editor);
    setSlashOpen(false);
  }

  if (!editor) return null;

  return (
    <div className="relative">
      {/* 상단 고정 툴바 (네이버 블로그 톤) */}
      <WikiEditorToolbar
        editor={editor}
        onPickPage={onPickPage ? () => onPickPage((title) => editor.chain().focus().insertContent(`[[${title}]]`).run()) : undefined}
        onPickImage={onUploadImage ? () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            const src = await onUploadImage(file);
            editor.chain().focus().setImage({ src }).run();
          };
          input.click();
        } : undefined}
      />

      {/* 인라인 툴바 — 텍스트 선택 시 떠오름 */}
      <BubbleMenu
        editor={editor}
        shouldShow={({ from, to }) => from !== to}
      >
        <div className="flex items-center gap-0.5 p-1 rounded-md border border-[hsl(var(--hairline))] bg-popover shadow-lg">
          <ToolbarBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="굵게 (Ctrl+B)"><Bold className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="기울임 (Ctrl+I)"><Italic className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="취소선"><Strikethrough className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="인라인 코드"><Code className="w-3.5 h-3.5" /></ToolbarBtn>
          <span className="w-px h-4 bg-[hsl(var(--hairline))] mx-0.5" />
          <ToolbarBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="큰 제목 (Ctrl+Shift+1)"><Heading1 className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="중간 제목 (Ctrl+Shift+2)"><Heading2 className="w-3.5 h-3.5" /></ToolbarBtn>
          <ToolbarBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="작은 제목 (Ctrl+Shift+3)"><Heading3 className="w-3.5 h-3.5" /></ToolbarBtn>
          <span className="w-px h-4 bg-[hsl(var(--hairline))] mx-0.5" />
          <ToolbarBtn
            active={editor.isActive('link')}
            onClick={() => {
              const url = window.prompt('링크 URL:', editor.getAttributes('link').href ?? 'https://');
              if (url === null) return;
              if (url === '') {
                editor.chain().focus().unsetLink().run();
              } else {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            title="링크"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </ToolbarBtn>
          {onPickPage && (
            <ToolbarBtn
              onClick={() => onPickPage((title) => {
                editor.chain().focus().insertContent(`[[${title}]]`).run();
              })}
              title="페이지 링크 (Ctrl+Shift+L)"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </ToolbarBtn>
          )}
        </div>
      </BubbleMenu>

      {/* 본문 영역 */}
      <EditorContent editor={editor} />

      {/* 슬래시 메뉴 */}
      {slashOpen && slashCoords && filteredCommands.length > 0 && (
        <div
          className="absolute wiki-z-popover w-[260px] rounded-lg border border-[hsl(var(--hairline))] bg-popover shadow-xl py-1 max-h-[320px] overflow-y-auto"
          style={{ left: slashCoords.left, top: slashCoords.top }}
        >
          <p className="px-3 pt-1.5 pb-1 text-[9.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground/70">
            블록 추가
          </p>
          {filteredCommands.map((cmd, i) => (
            <button
              key={cmd.id}
              type="button"
              onMouseEnter={() => setSlashIndex(i)}
              onMouseDown={(e) => { e.preventDefault(); runSlashCommand(cmd); }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12.5px] wiki-trans-color',
                i === slashIndex ? 'bg-accent text-foreground' : 'text-foreground/85 hover:bg-accent',
              )}
            >
              <span className="text-muted-foreground shrink-0">{cmd.icon}</span>
              <span className="flex-1 truncate">{cmd.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolbarBtn({
  active, onClick, title, children,
}: {
  active?: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color',
        active && 'bg-primary/10 text-primary',
      )}
    >
      {children}
    </button>
  );
}
