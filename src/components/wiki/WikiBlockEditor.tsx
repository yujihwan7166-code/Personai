import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { ResizableImage } from './ResizableImage';
import { TextStyleKit } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCellBase from '@tiptap/extension-table-cell';
import TableHeaderBase from '@tiptap/extension-table-header';

/**
 * TableCell / TableHeader 에 backgroundColor attribute 부착.
 * setCellAttribute('backgroundColor', ...) 로 셀 단위 색상 적용 — 표 메뉴 색 picker 와 연결.
 */
const cellBg = {
  backgroundColor: {
    default: null as string | null,
    parseHTML: (el: HTMLElement) => el.getAttribute('data-bg') || el.style.backgroundColor || null,
    renderHTML: (attrs: { backgroundColor?: string | null }) =>
      attrs.backgroundColor
        ? { style: `background-color: ${attrs.backgroundColor}`, 'data-bg': attrs.backgroundColor }
        : {},
  },
};
const TableCell = TableCellBase.extend({
  addAttributes() { return { ...this.parent?.(), ...cellBg }; },
});
const TableHeader = TableHeaderBase.extend({
  addAttributes() { return { ...this.parent?.(), ...cellBg }; },
});
import { Markdown } from 'tiptap-markdown';
import { notify } from '@/lib/notify';
import { WikiEditorToolbar } from './WikiEditorToolbar';
import { WikiPagePickerModal } from './WikiPagePickerModal';
import type { WikiPage as WikiPageT } from '@/types/wiki';
import {
  Bold, Italic, Strikethrough, Code, Link as LinkIcon, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code2, Minus, ImagePlus, CheckSquare, BookOpen, Lightbulb,
  Trash2, ChevronDown, Palette, Table2,
} from 'lucide-react';
import type { Editor as TipTapEditor } from '@tiptap/react';
import type { WikiPage } from '@/types/wiki';
import { cn } from '@/lib/utils';

interface Props {
  body: string; // markdown
  onChange: (markdown: string) => void;
  /** 문서 연결 검색용. 현재 문서는 자동 제외. */
  allPages: WikiPage[];
  currentId?: string;
  /** 이미지 업로드 — 본문 내 드롭/붙여넣기 시. base64 dataURL 또는 IDB blob ref 반환. */
  onUploadImage?: (file: File) => Promise<string>;
  /** 새 문서를 만들고 연결 (picker 의 '새로 만들기' 탭) */
  onCreateAndLink?: (title: string, type: import('@/types/wiki').WikiPageType) => Promise<WikiPage> | WikiPage;
  /** 상단 고정 툴바 숨김 — 외부에서 별도로 렌더할 때 (예: 메모 페이지 액션바). */
  hideToolbar?: boolean;
  /** 슬래시 블록 메뉴 비활성화 — 일기처럼 단순 작성 경험이 필요한 곳에서 사용. */
  disableSlashMenu?: boolean;
  /** 링크 삽입 UX. wiki=페이지 picker, memo=간단한 페이지명/URL 입력. */
  linkMode?: 'wiki' | 'memo';
  /** 에디터 인스턴스 노출 — 외부에서 툴바 따로 만들 때 사용. */
  onEditorReady?: (editor: ReturnType<typeof useEditor>) => void;
  /** 첫 노드 (빈 문서) placeholder — 미지정 시 위키 default. 메모 페이지에선 "제목" 등. */
  firstPlaceholder?: string;
  /** 두 번째 이후 빈 노드 placeholder. */
  restPlaceholder?: string;
  /** 추가 className (본문 컨테이너용). 메모는 max-w 같은 거 적용 가능. */
  className?: string;
}

interface MarkdownStorage {
  markdown?: {
    getMarkdown?: () => string;
  };
}

function getEditorMarkdown(editor: { storage: unknown; getHTML: () => string }, fallback = ''): string {
  const storage = editor.storage as MarkdownStorage;
  return storage.markdown?.getMarkdown?.() ?? fallback;
}

function wikiSyntaxToEditorMarkdown(markdown: string): string {
  if (!markdown) return markdown;
  return markdown.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_match, rawTarget: string, rawLabel?: string) => {
    const target = rawTarget.trim();
    const label = (rawLabel ?? rawTarget).trim();
    if (!target || !label) return '';
    return `[${escapeMarkdownLabel(label)}](##wiki:${encodeURIComponent(target)})`;
  });
}

function escapeMarkdownLabel(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\]/g, '\\]')
    .replace(/\[/g, '\\[')
    .replace(/\r?\n/g, ' ')
    .trim();
}

function wikiHrefForPage(page: Pick<WikiPage, 'id'>): string {
  return `##wiki:${encodeURIComponent(page.id)}`;
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
export function WikiBlockEditor({ body, onChange, allPages, currentId, onUploadImage, onCreateAndLink, hideToolbar, disableSlashMenu, linkMode = 'wiki', onEditorReady, firstPlaceholder, restPlaceholder, className }: Props) {
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
          // 첫 빈 paragraph (문서 전체가 비었을 때)
          if (pos === 0 && ed.state.doc.childCount === 1 && node.type.name === 'paragraph') {
            return firstPlaceholder ?? '여기에 적기 시작하거나 / 로 메뉴를 열어보세요';
          }
          // 첫 빈 heading 도 같은 first 슬롯으로 취급
          if (pos === 0 && node.type.name === 'heading' && firstPlaceholder) {
            return firstPlaceholder;
          }
          if (node.type.name === 'heading') return `제목 ${node.attrs.level}`;
          // 두 번째 이후 빈 paragraph
          if (node.type.name === 'paragraph' && restPlaceholder) return restPlaceholder;
          return '';
        },
        showOnlyWhenEditable: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'wiki-extlink' },
        autolink: true,
        // ##wiki: 같은 커스텀 scheme 허용
        validate: (_href) => true,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      ResizableImage.configure({ HTMLAttributes: { class: 'wiki-image' } }),
      TextStyleKit.configure({ lineHeight: false, fontFamily: false }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Superscript,
      Subscript,
      Table.configure({
        resizable: true,
        handleWidth: 6,
        cellMinWidth: 96,
        lastColumnResizable: true,
        allowTableNodeSelection: true,
        HTMLAttributes: { class: 'wiki-table' },
      }),
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
    content: wikiSyntaxToEditorMarkdown(body || ''),
    editorProps: {
      attributes: {
        class: 'wiki-prose wiki-block-editor focus:outline-none min-h-[420px]',
        spellCheck: 'false',
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              event.preventDefault();
              const file = item.getAsFile();
              if (!file) return true;
              if (!onUploadImage) {
                notify.warning('이미지 업로드 핸들러가 없어요', { duration: 1800 });
                return true;
              }
              void onUploadImage(file)
                .then((src) => {
                  editorRef.current?.chain().focus().setImage({ src }).run();
                })
                .catch((e) => {
                  notify.warning('이미지 업로드 실패 — 다시 시도해 주세요', {
                    description: (e as Error)?.message,
                    duration: 2400,
                  });
                });
              return true;
            }
          }
        }
        // CSV/TSV 자동 표 변환 — 2줄 이상 + (탭 또는 쉼표) 구분
        const tableHtml = plainTextTableToHtml(event.clipboardData?.getData('text/plain') ?? '');
        if (tableHtml) {
          event.preventDefault();
          editorRef.current?.chain().focus().insertContent(tableHtml).run();
          return true;
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const imgFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (imgFiles.length === 0) return false;
        event.preventDefault();
        if (!onUploadImage) {
          notify.warning('이미지 업로드 핸들러가 없어요', { duration: 1800 });
          return true;
        }
        // 다중 파일 — 개별 처리해 일부 실패 시 나머지는 정상 삽입.
        void Promise.allSettled(imgFiles.map((f) => onUploadImage(f))).then((results) => {
          let okCount = 0;
          let failCount = 0;
          for (const r of results) {
            if (r.status === 'fulfilled') {
              editorRef.current?.chain().focus().setImage({ src: r.value }).run();
              okCount += 1;
            } else {
              failCount += 1;
            }
          }
          if (failCount > 0) {
            notify.warning(
              okCount > 0
                ? `이미지 ${imgFiles.length}장 중 ${failCount}장 실패`
                : '이미지 업로드 실패 — 다시 시도해 주세요',
              { duration: 2400 },
            );
          }
        });
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      const md = getEditorMarkdown(editor, editor.getHTML());
      onChangeRef.current(md);
    },
  });

  const editorRef = useRef<typeof editor>(editor);
  useEffect(() => { editorRef.current = editor; }, [editor]);

  // 외부 툴바 hookup
  const onEditorReadyRef = useRef(onEditorReady);
  onEditorReadyRef.current = onEditorReady;
  useEffect(() => {
    if (editor) onEditorReadyRef.current?.(editor);
  }, [editor]);

  // 외부 body 변경 시 (예: 페이지 전환) 에디터 컨텐츠 동기화
  const lastBodyRef = useRef(body);
  useEffect(() => {
    if (!editor) return;
    if (lastBodyRef.current === body) return;
    lastBodyRef.current = body;
    const normalizedBody = wikiSyntaxToEditorMarkdown(body || '');
    const current = getEditorMarkdown(editor);
    if (current.trim() === normalizedBody.trim()) return;
    editor.commands.setContent(normalizedBody, false);
  }, [body, editor]);

  /* 슬래시 메뉴 상태 */
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashCoords, setSlashCoords] = useState<{ left: number; top: number } | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const slashAnchorRef = useRef<{ from: number; to: number } | null>(null);

  /* 페이지 picker 상태 — Ctrl+K 또는 텍스트 선택 + 링크 버튼 */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSelText, setPickerSelText] = useState('');
  const pickerSelRangeRef = useRef<{ from: number; to: number } | null>(null);
  const isMemoLinkMode = linkMode === 'memo';
  const [memoLinkOpen, setMemoLinkOpen] = useState(false);
  const [memoLinkTarget, setMemoLinkTarget] = useState('');
  const [memoLinkCoords, setMemoLinkCoords] = useState<{ left: number; top: number } | null>(null);
  const memoLinkRangeRef = useRef<{ from: number; to: number } | null>(null);
  const memoLinkInputRef = useRef<HTMLInputElement | null>(null);

  const isLikelyUrl = (value: string): boolean =>
    /^(https?:\/\/|mailto:|tel:|#|\/)/i.test(value)
    || /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(value);

  const normalizeHref = useCallback((value: string): string =>
    /^(https?:\/\/|mailto:|tel:|#|\/)/i.test(value) ? value : `https://${value}`, []);

  const placeMemoLinkPanel = useCallback(() => {
    if (!editor) return;
    const coords = editor.view.coordsAtPos(editor.state.selection.from);
    const editorRect = editor.view.dom.getBoundingClientRect();
    setMemoLinkCoords({
      left: Math.max(8, coords.left - editorRect.left),
      top: coords.bottom - editorRect.top + 8,
    });
  }, [editor]);

  const openLinkPicker = useCallback(() => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    const text = !empty ? editor.state.doc.textBetween(from, to, ' ') : '';
    if (isMemoLinkMode) {
      setMemoLinkTarget(text);
      memoLinkRangeRef.current = !empty ? { from, to } : null;
      placeMemoLinkPanel();
      setMemoLinkOpen(true);
      return;
    }
    setPickerSelText(text);
    pickerSelRangeRef.current = !empty ? { from, to } : null;
    setPickerOpen(true);
  }, [editor, isMemoLinkMode, placeMemoLinkPanel]);

  const submitMemoLink = () => {
    if (!editor) return;
    const target = memoLinkTarget.trim();
    if (!target) return;
    const range = memoLinkRangeRef.current;
    const chain = editor.chain().focus();
    if (isLikelyUrl(target)) {
      const href = normalizeHref(target);
      if (range) {
        chain.setTextSelection(range).extendMarkRange('link').setLink({ href }).run();
      } else {
        chain.insertContent({
          type: 'text',
          text: target,
          marks: [{ type: 'link', attrs: { href } }],
        }).run();
      }
    } else {
      const href = `##wiki:${encodeURIComponent(target)}`;
      if (range) {
        chain.setTextSelection(range).extendMarkRange('link').setLink({ href }).run();
      } else {
        chain.insertContent({
          type: 'text',
          text: target,
          marks: [{ type: 'link', attrs: { href } }],
        }).run();
      }
    }
    setMemoLinkOpen(false);
    setMemoLinkTarget('');
    memoLinkRangeRef.current = null;
  };

  const applyUrlLink = useCallback((rawUrl: string, rawLabel?: string) => {
    if (!editor) return;
    const target = rawUrl.trim();
    if (!target) return;
    const href = normalizeHref(target);
    const range = pickerSelRangeRef.current;
    const label = (rawLabel ?? pickerSelText).trim() || target.replace(/^https?:\/\//i, '');
    const chain = editor.chain().focus();
    if (range) {
      chain.setTextSelection(range).extendMarkRange('link').setLink({ href }).run();
    } else {
      chain.insertContent({
        type: 'text',
        text: label,
        marks: [{ type: 'link', attrs: { href } }],
      }).run();
    }
    setPickerOpen(false);
    pickerSelRangeRef.current = null;
  }, [editor, normalizeHref, pickerSelText]);

  useEffect(() => {
    if (!memoLinkOpen) return;
    const t = window.setTimeout(() => memoLinkInputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [memoLinkOpen]);

  /* 표 사이즈 picker 상태 (슬래시 /표) */
  /* Ctrl+K — 문서/웹 링크 picker */
  useEffect(() => {
    if (!editor) return;
    const handler = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'k') return;
      // 에디터에 포커스 있을 때만
      if (!editor.isFocused) return;
      e.preventDefault();
      openLinkPicker();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor, openLinkPicker]);

  function handlePickPage(page: WikiPageT) {
    if (!editor) return;
    const range = pickerSelRangeRef.current;
    const href = wikiHrefForPage(page);
    if (range) {
      // 선택 범위에 문서 링크 적용 — 텍스트는 그대로 두고 내부적으로는 안정적인 page id 로 연결.
      editor.chain().focus().setTextSelection(range).extendMarkRange('link').setLink({ href }).run();
    } else {
      // 선택 X — 사용자는 [[...]] 문법을 보지 않고, 일반 링크 텍스트처럼 삽입.
      editor.chain().focus().insertContent({
        type: 'text',
        text: page.title,
        marks: [{ type: 'link', attrs: { href } }],
      }).run();
    }
    setPickerOpen(false);
    pickerSelRangeRef.current = null;
  }

  // 키보드 — `/` 입력 감지, ESC 닫기
  useEffect(() => {
    if (!editor || disableSlashMenu) return;
    const handler = (e: KeyboardEvent) => {
      if (slashOpen) {
        if (e.key === 'Escape') { setSlashOpen(false); return; }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor, slashOpen, disableSlashMenu]);

  // 슬래시 트리거 — 빈 줄에서 `/` 입력 시
  useEffect(() => {
    if (!editor || disableSlashMenu) {
      setSlashOpen(false);
      return;
    }
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
  }, [editor, slashOpen, disableSlashMenu]);

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
    { id: 'table', label: '표', keys: ['표', 'table', 'grid'], icon: <Table2 className="w-4 h-4" />, run: (e: typeof editor) => {
      e?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    } },
    {
      id: 'wikilink',
      label: isMemoLinkMode ? '링크' : '연결',
      description: isMemoLinkMode ? '문서 이름이나 URL을 입력하세요' : '문서나 웹 링크를 붙입니다',
      keys: ['링크', '페이지', '연결', 'link', 'wiki'],
      icon: isMemoLinkMode ? <LinkIcon className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />,
      run: () => openLinkPicker(),
    },
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
  ], [editor, onUploadImage, isMemoLinkMode, openLinkPicker]);

  const filteredCommands = useMemo(() => {
    const q = slashQuery.trim().toLowerCase();
    if (!q) return slashCommands;
    return slashCommands.filter((c) =>
      c.label.toLowerCase().includes(q)
      || c.keys.some((k) => k.toLowerCase().includes(q)),
    );
  }, [slashQuery, slashCommands]);

  useEffect(() => { setSlashIndex(0); }, [slashQuery]);

  const runSlashCommandCallback = useCallback((cmd: typeof slashCommands[number]) => {
    if (!editor) return;
    // Remove the slash query token before running the command.
    const anchor = slashAnchorRef.current;
    if (anchor) {
      editor.chain().focus().deleteRange({ from: anchor.from, to: anchor.to }).run();
    }
    cmd.run(editor);
    setSlashOpen(false);
  }, [editor]);

  // 슬래시 메뉴 키보드 이동
  useEffect(() => {
    if (!editor || !slashOpen || disableSlashMenu) return;
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
          runSlashCommandCallback(cmd);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSlashOpen(false);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [editor, slashOpen, filteredCommands, slashIndex, runSlashCommandCallback, disableSlashMenu]);

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

  const shouldShowInlineMenu = useCallback(({ from, to }: { editor: TipTapEditor; from: number; to: number }) => {
    if (!editor) return false;
    if (from === to) return false;
    // CellSelection 식별 — 고유 프로퍼티 $anchorCell 으로 (constructor.name 은 빌드 시 mangling 위험)
    const sel = editor.state.selection as unknown as { $anchorCell?: unknown };
    if (sel.$anchorCell) return false;
    // 표 안 텍스트 선택도 인라인 툴바 대신 표 메뉴 우선 — 충돌 방지
    if (editor.isActive('table')) return false;
    return true;
  }, [editor]);

  const shouldShowTableMenu = useCallback(({ editor: ed }: { editor: TipTapEditor }) => ed.isActive('table'), []);
  const tableMenuOptions = useMemo(() => ({ placement: 'top-start' as const, offset: 8 }), []);

  if (!editor) return null;

  return (
    <div className={cn('relative', className)}>
      {/* 상단 고정 툴바 (네이버 블로그 톤) — hideToolbar 시 외부 렌더 */}
      {!hideToolbar && (
        <WikiEditorToolbar
          editor={editor}
          onPickPage={() => {
            openLinkPicker();
          }}
          onPickImage={onUploadImage ? () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;
              try {
                const src = await onUploadImage(file);
                editor.chain().focus().setImage({ src }).run();
              } catch (e) {
                notify.warning('이미지 업로드 실패 — 다시 시도해 주세요', {
                  description: (e as Error)?.message,
                  duration: 2400,
                });
              }
            };
            input.click();
          } : undefined}
        />
      )}

      {/* 인라인 툴바 — 텍스트 선택 시 떠오름. 표 셀 드래그 (CellSelection) / 표 안에선 숨김 — 표 메뉴가 그 자리. */}
      <BubbleMenu
        editor={editor}
        shouldShow={shouldShowInlineMenu}
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
              openLinkPicker();
            }}
            title="연결 (Ctrl+K)"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => {
              openLinkPicker();
            }}
            title="문서 연결"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </ToolbarBtn>
        </div>
      </BubbleMenu>

      {/* 표 메뉴 — 표 안 커서일 때 위쪽 floating, 노션 식 텍스트 레이블 + 그룹 */}
      <BubbleMenu
        editor={editor}
        shouldShow={shouldShowTableMenu}
        options={tableMenuOptions}
      >
        <TableMenu editor={editor} />
      </BubbleMenu>

      {/* 본문 영역 */}
      <EditorContent editor={editor} />

      {/* 슬래시 메뉴 */}
      {!disableSlashMenu && slashOpen && slashCoords && filteredCommands.length > 0 && (
        <div
          className={cn(
            'absolute wiki-z-popover max-h-[320px] overflow-y-auto border border-[hsl(var(--hairline))] bg-popover shadow-xl',
            isMemoLinkMode ? 'w-[286px] rounded-md py-1.5' : 'w-[260px] rounded-lg py-1',
          )}
          style={{ left: slashCoords.left, top: slashCoords.top }}
        >
          <p className="px-3 pt-1.5 pb-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            블록 추가
          </p>
          {filteredCommands.map((cmd, i) => (
            <button
              key={cmd.id}
              type="button"
              onMouseEnter={() => setSlashIndex(i)}
              onMouseDown={(e) => { e.preventDefault(); runSlashCommand(cmd); }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12.5px] outline-none wiki-trans-color',
                i === slashIndex ? 'bg-accent text-foreground' : 'text-foreground/85 hover:bg-accent',
              )}
            >
              <span className="text-muted-foreground shrink-0">{cmd.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block truncate">{cmd.label}</span>
                {'description' in cmd && cmd.description && (
                  <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
                    {cmd.description}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 표 액션 BubbleMenu — 표 안 커서일 때만 */}

      {/* 표 사이즈 picker — 슬래시 /표 클릭 시 */}

      {isMemoLinkMode && memoLinkOpen && (
        <div
          className="absolute wiki-z-popover w-[320px] rounded-md border border-[hsl(var(--hairline))] bg-popover p-3 shadow-xl"
          style={{
            left: memoLinkCoords?.left ?? 16,
            top: memoLinkCoords?.top ?? 48,
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-foreground">링크 삽입</p>
              <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                문서 이름이나 URL을 입력하면 바로 연결돼요.
              </p>
            </div>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setMemoLinkOpen(false);
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="링크 삽입 닫기"
            >
              ×
            </button>
          </div>
          <input
            ref={memoLinkInputRef}
            value={memoLinkTarget}
            onChange={(e) => setMemoLinkTarget(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitMemoLink();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setMemoLinkOpen(false);
              }
            }}
            placeholder="문서 이름 또는 https://..."
            className="h-9 w-full rounded-md border border-[hsl(var(--hairline))] bg-background px-2.5 text-[12.5px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/65 focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
          />
          <div className="mt-2 flex items-center justify-end gap-1.5">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setMemoLinkOpen(false);
              }}
              className="h-8 rounded-md px-2.5 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              취소
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                submitMemoLink();
              }}
              disabled={!memoLinkTarget.trim()}
              className="h-8 rounded-md bg-primary px-3 text-[12px] font-semibold text-primary-foreground hover:opacity-90 disabled:pointer-events-none disabled:opacity-45"
            >
              삽입
            </button>
          </div>
        </div>
      )}

      {/* 페이지 picker — 3 모드 탭: 검색 / ID / 새로 만들기 */}
      {!isMemoLinkMode && (
        <WikiPagePickerModal
          open={pickerOpen}
          pages={allPages}
          excludeId={currentId}
          initialQuery={pickerSelText}
          onPick={handlePickPage}
          onCreateAndLink={onCreateAndLink}
          onPickUrl={applyUrlLink}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * TableMenu — 표 안 커서일 때 떠오르는 액션 바.
 * 노션 식: 텍스트 레이블 + "행 ▾ / 열 ▾" 드롭다운 + 표 삭제 단축.
 */
// 셀 배경 팔레트 — 옅은 톤 위주 (가독성 위해)
const CELL_COLORS: Array<{ name: string; value: string | null }> = [
  { name: '없음',  value: null },
  { name: '회색',  value: 'hsl(0 0% 92%)' },
  { name: '빨강',  value: 'hsl(0 75% 92%)' },
  { name: '주황',  value: 'hsl(28 90% 90%)' },
  { name: '노랑',  value: 'hsl(48 95% 88%)' },
  { name: '초록',  value: 'hsl(142 60% 88%)' },
  { name: '청록',  value: 'hsl(178 55% 86%)' },
  { name: '파랑',  value: 'hsl(212 80% 90%)' },
  { name: '보라',  value: 'hsl(265 70% 92%)' },
  { name: '분홍',  value: 'hsl(330 80% 92%)' },
];

function TableMenu({ editor }: { editor: TipTapEditor }) {
  const [open, setOpen] = useState<null | 'row' | 'col' | 'color'>(null);
  const close = () => setOpen(null);
  const run = (fn: () => void) => () => { fn(); close(); };

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-lg border border-[hsl(var(--hairline))] bg-popover shadow-lg text-[12.5px]"
      onMouseLeave={close}
    >
      {/* 행 드롭다운 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(open === 'row' ? null : 'row')}
          className={cn(
            'inline-flex items-center gap-1 h-7 px-2.5 rounded-md font-medium wiki-trans-color',
            open === 'row' ? 'bg-accent text-foreground' : 'text-foreground/80 hover:bg-accent hover:text-foreground',
          )}
        >
          행
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
        {open === 'row' && (
          <div className="absolute left-0 top-full mt-1 z-50 w-44 rounded-md border border-[hsl(var(--hairline))] bg-popover shadow-md p-0.5">
            <MenuItem onClick={run(() => editor.chain().focus().addRowBefore().run())}>↑ 위에 행 추가</MenuItem>
            <MenuItem onClick={run(() => editor.chain().focus().addRowAfter().run())}>↓ 아래에 행 추가</MenuItem>
            <MenuItem onClick={run(() => editor.chain().focus().deleteRow().run())} danger>이 행 삭제</MenuItem>
            <MenuSep />
            <MenuItem onClick={run(() => editor.chain().focus().toggleHeaderRow().run())}>머리 행 토글</MenuItem>
          </div>
        )}
      </div>

      {/* 열 드롭다운 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(open === 'col' ? null : 'col')}
          className={cn(
            'inline-flex items-center gap-1 h-7 px-2.5 rounded-md font-medium wiki-trans-color',
            open === 'col' ? 'bg-accent text-foreground' : 'text-foreground/80 hover:bg-accent hover:text-foreground',
          )}
        >
          열
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
        {open === 'col' && (
          <div className="absolute left-0 top-full mt-1 z-50 w-44 rounded-md border border-[hsl(var(--hairline))] bg-popover shadow-md p-0.5">
            <MenuItem onClick={run(() => editor.chain().focus().addColumnBefore().run())}>← 왼쪽에 열 추가</MenuItem>
            <MenuItem onClick={run(() => editor.chain().focus().addColumnAfter().run())}>→ 오른쪽에 열 추가</MenuItem>
            <MenuItem onClick={run(() => editor.chain().focus().deleteColumn().run())} danger>이 열 삭제</MenuItem>
            <MenuSep />
            <MenuItem onClick={run(() => editor.chain().focus().toggleHeaderColumn().run())}>머리 열 토글</MenuItem>
          </div>
        )}
      </div>

      <span className="w-px h-4 bg-[hsl(var(--hairline))] mx-0.5" />

      {/* 셀 색 — 선택된 셀(들) 배경 적용. 단일 셀 커서만 있어도 그 셀 적용. */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(open === 'color' ? null : 'color')}
          className={cn(
            'inline-flex items-center gap-1 h-7 px-2.5 rounded-md font-medium wiki-trans-color',
            open === 'color' ? 'bg-accent text-foreground' : 'text-foreground/80 hover:bg-accent hover:text-foreground',
          )}
          title="셀 색"
        >
          <Palette className="w-3.5 h-3.5" />
          색
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
        {open === 'color' && (
          <div className="absolute left-0 top-full mt-1 z-50 grid grid-cols-5 gap-1 p-1.5 rounded-md border border-[hsl(var(--hairline))] bg-popover shadow-md w-[180px]">
            {CELL_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().setCellAttribute('backgroundColor', c.value).run();
                  close();
                }}
                title={c.name}
                className="h-6 w-6 rounded border border-foreground/15 hover:scale-110 transition-transform inline-flex items-center justify-center"
                style={{ backgroundColor: c.value ?? 'transparent' }}
              >
                {c.value === null && <span className="text-[10px] text-foreground/50">×</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="w-px h-4 bg-[hsl(var(--hairline))] mx-0.5" />

      <button
        type="button"
        onClick={() => editor.chain().focus().mergeOrSplit().run()}
        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md font-medium text-foreground/80 hover:bg-accent hover:text-foreground wiki-trans-color"
        title="셀 병합 (선택 후) / 분할"
      >
        병합·분할
      </button>

      <span className="w-px h-4 bg-[hsl(var(--hairline))] mx-0.5" />

      <button
        type="button"
        onClick={() => editor.chain().focus().deleteTable().run()}
        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md font-medium text-destructive hover:bg-destructive/10 wiki-trans-color"
        title="표 삭제"
      >
        <Trash2 className="w-3.5 h-3.5" />
        표 삭제
      </button>
    </div>
  );
}

function MenuItem({
  onClick, children, danger,
}: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        'w-full flex items-center px-2.5 h-7 rounded text-[12.5px] text-left wiki-trans-color',
        danger
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-foreground/85 hover:bg-accent hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function MenuSep() {
  return <div className="my-0.5 border-t border-[hsl(var(--hairline))]" />;
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

/* ── CSV/TSV → HTML 표 변환 (붙여넣기 자동 인식) ── */
function plainTextTableToHtml(text: string): string | null {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);
  if (lines.length < 2 || lines.length > 80) return null;

  const delimiter = lines.some((line) => line.includes('\t')) ? '\t' : ',';
  if (!lines.every((line) => line.includes(delimiter))) return null;

  const rows = lines.map((line) => delimiter === '\t' ? line.split('\t') : parseCsvLine(line));
  const colCount = rows[0]?.length ?? 0;
  if (colCount < 2 || colCount > 20) return null;
  if (!rows.every((row) => row.length === colCount)) return null;

  const [header, ...body] = rows;
  const head = `<tr>${header.map((cell) => `<th>${escapeTableCell(cell)}</th>`).join('')}</tr>`;
  const bodyHtml = body
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeTableCell(cell)}</td>`).join('')}</tr>`)
    .join('');
  return `<table><tbody>${head}${bodyHtml}</tbody></table><p></p>`;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

function escapeTableCell(value: string): string {
  return value
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
