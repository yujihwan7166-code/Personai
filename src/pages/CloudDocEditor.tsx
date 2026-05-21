/** /cloud/doc/:id — 문서 에디터 (TipTap 기반).
 *  4단계-α: 빈 문서 시작 → 본문 입력 → 자동저장 → 자동 제목.
 *  4단계-β: 도구바 + Underline + 단축키 도움말.
 *  4단계-γ (Storage 후): .docx import/export.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { FloatingMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { TextStyleKit } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { Markdown } from 'tiptap-markdown';
import {
  X, MoreHorizontal, Loader2, AlertCircle, ArrowLeft, Keyboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
// updateFileBody 는 useDebouncedAutosave 내부 사용
import { useCloudNodeLoader } from '@/lib/cloudCommon/useCloudNodeLoader';
import { useDebouncedAutosave } from '@/lib/cloudCommon/useDebouncedAutosave';
import {
  importDocxFile,
  exportDocxFromJson,
  type DocxHeaderFooterAlign,
  type DocxHeaderFooterImage,
  type DocxPageNumberPlacement,
  type DocxSectionColumns,
} from '@/lib/cloudDoc/docx';
import { readMarkdownFile, exportMarkdownFile } from '@/lib/cloudDoc/markdown';
import { exportElementToPdf, sanitizeFileName } from '@/lib/cloudCommon/pdfExport';
import { type PageMargin } from '@/lib/cloudDoc/PageRuler';
import { DocPage, type PageSize } from '@/lib/cloudDoc/DocPage';
import { SaveStateBadge, type SaveState } from '@/lib/cloudDoc/SaveStateBadge';
import { WordCountBadge } from '@/lib/cloudDoc/WordCountBadge';
import { TocDropdown } from '@/lib/cloudDoc/TocDropdown';
import { KeyboardHelpModal } from '@/lib/cloudDoc/KeyboardHelpModal';
import { SlashMenu } from '@/lib/cloudDoc/SlashMenu';
import { AiBubbleMenu } from '@/lib/cloudDoc/AiBubbleMenu';
import { AiPreviewCard } from '@/lib/cloudDoc/AiPreviewCard';
import { useDocAi } from '@/lib/cloudDoc/useDocAi';
import { DocSearchPanel } from '@/lib/cloudDoc/DocSearchPanel';
import { DocToolbar } from '@/lib/cloudDoc/DocToolbar';
import { CommentList } from '@/lib/cloudDoc/CommentList';
import { normalizeDocPasteHtml } from '@/lib/cloudDoc/paste';
import { DocClipboard } from '@/lib/cloudDoc/tiptap/DocClipboard';
import { Footnote } from '@/lib/cloudDoc/tiptap/Footnote';
import { FootnoteList } from '@/lib/cloudDoc/tiptap/FootnoteList';
import { CommentMark } from '@/lib/cloudDoc/tiptap/CommentMark';
import { RevisionMark } from '@/lib/cloudDoc/tiptap/RevisionMark';
import { PageBreak } from '@/lib/cloudDoc/tiptap/PageBreak';
import { ColumnBreak } from '@/lib/cloudDoc/tiptap/ColumnBreak';
import { SectionBreak } from '@/lib/cloudDoc/tiptap/SectionBreak';
import { DocxTextBox } from '@/lib/cloudDoc/tiptap/DocxTextBox';
import { DocxToc } from '@/lib/cloudDoc/tiptap/DocxToc';
import { DocxMath } from '@/lib/cloudDoc/tiptap/DocxMath';
import { ParagraphIndent } from '@/lib/cloudDoc/tiptap/ParagraphIndent';
import { ParagraphBookmark } from '@/lib/cloudDoc/tiptap/ParagraphBookmark';
import { ParagraphDecoration } from '@/lib/cloudDoc/tiptap/ParagraphDecoration';
import { ParagraphPagination } from '@/lib/cloudDoc/tiptap/ParagraphPagination';
import { ParagraphSpacing } from '@/lib/cloudDoc/tiptap/ParagraphSpacing';
import { ParagraphTabs } from '@/lib/cloudDoc/tiptap/ParagraphTabs';
import { RunTextStyle } from '@/lib/cloudDoc/tiptap/RunTextStyle';
import { ResizableImage } from '@/lib/cloudDoc/tiptap/ResizableImage';
import { RichTable } from '@/lib/cloudDoc/tiptap/RichTable';
import { RichTableRow } from '@/lib/cloudDoc/tiptap/RichTableRow';
import { RichTableCell, RichTableHeader } from '@/lib/cloudDoc/tiptap/RichTableCell';
import { RichBulletList, RichOrderedList } from '@/lib/cloudDoc/tiptap/ListStyle';
import { AiSidebar } from '@/components/cloud/AiSidebar';
import { AiSidebarToggle } from '@/components/cloud/AiSidebarToggle';
import { useAiSidebar } from '@/components/cloud/useAiSidebar';
import type { AiContext } from '@/lib/cloudAi/types';
// CloudNode 는 useCloudNodeLoader 내부 사용
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';


const AUTOSAVE_DELAY_MS = 1000;
const DEFAULT_PAGE_MARGIN: PageMargin = { top: 96, left: 96, right: 96, bottom: 96 };
const DEFAULT_PAGE_SIZE: PageSize = { width: 816, height: 1056, orientation: 'portrait' };
const DEFAULT_HEADER_FOOTER_ALIGN: DocxHeaderFooterAlign = 'center';
const DEFAULT_PAGE_NUMBER_PLACEMENT: DocxPageNumberPlacement = 'footer';
const DEFAULT_SECTION_COLUMNS: DocxSectionColumns = { count: 1 };

function normalizePageMargin(value: unknown): PageMargin | null {
  if (!value || typeof value !== 'object') return null;
  const margin = value as Partial<PageMargin>;
  if (typeof margin.left !== 'number' || typeof margin.right !== 'number') return null;
  if (!Number.isFinite(margin.left) || !Number.isFinite(margin.right)) return null;
  return {
    top: typeof margin.top === 'number' && Number.isFinite(margin.top)
      ? Math.max(0, Math.round(margin.top))
      : DEFAULT_PAGE_MARGIN.top,
    left: Math.max(0, Math.round(margin.left)),
    right: Math.max(0, Math.round(margin.right)),
    bottom: typeof margin.bottom === 'number' && Number.isFinite(margin.bottom)
      ? Math.max(0, Math.round(margin.bottom))
      : DEFAULT_PAGE_MARGIN.bottom,
  };
}

function normalizeHeaderFooterAlign(value: unknown): DocxHeaderFooterAlign | null {
  return value === 'left' || value === 'center' || value === 'right' || value === 'justify'
    ? value
    : null;
}

function normalizePageNumberPlacement(value: unknown): DocxPageNumberPlacement | null {
  return value === 'header' || value === 'footer' ? value : null;
}

function normalizeHeaderFooterImages(value: unknown): DocxHeaderFooterImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const image = item as Partial<DocxHeaderFooterImage>;
    if (typeof image.src !== 'string' || !image.src.startsWith('data:image/')) return [];
    if (typeof image.width !== 'number' || typeof image.height !== 'number') return [];
    if (!Number.isFinite(image.width) || !Number.isFinite(image.height)) return [];
    const align = normalizeHeaderFooterAlign(image.align);
    return [{
      src: image.src,
      width: Math.max(1, Math.round(image.width)),
      height: Math.max(1, Math.round(image.height)),
      ...(align ? { align } : {}),
    }];
  });
}

function normalizePageSize(value: unknown): PageSize | null {
  if (!value || typeof value !== 'object') return null;
  const size = value as Partial<PageSize>;
  if (typeof size.width !== 'number' || typeof size.height !== 'number') return null;
  if (!Number.isFinite(size.width) || !Number.isFinite(size.height)) return null;
  const width = Math.max(320, Math.round(size.width));
  const height = Math.max(320, Math.round(size.height));
  return {
    width,
    height,
    orientation: size.orientation === 'landscape' || width > height ? 'landscape' : 'portrait',
  };
}

function normalizeSectionColumns(value: unknown): DocxSectionColumns | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<DocxSectionColumns>;
  const count = Number(raw.count);
  if (!Number.isFinite(count) || count < 1) return null;
  const space = Number(raw.space);
  return {
    count: Math.max(1, Math.min(8, Math.round(count))),
    ...(Number.isFinite(space) && space >= 0 ? { space: Math.round(space) } : {}),
    ...(typeof raw.separate === 'boolean' ? { separate: raw.separate } : {}),
    ...(typeof raw.equalWidth === 'boolean' ? { equalWidth: raw.equalWidth } : {}),
  };
}

export default function CloudDocEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>(undefined);
  const [helpOpen, setHelpOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState<false | 'find' | 'replace'>(false);

  // 줌 — localStorage 영속 (사용자별 마지막 선택값 유지)
  const [zoom, setZoomInner] = useState<number>(() => {
    if (typeof window === 'undefined') return 100;
    const v = Number(window.localStorage.getItem('personai.cloud.doc.zoom'));
    return [50, 75, 100, 125, 150, 200].includes(v) ? v : 100;
  });
  const setZoom = useCallback((v: number) => {
    setZoomInner(v);
    try { window.localStorage.setItem('personai.cloud.doc.zoom', String(v)); } catch { /* noop */ }
  }, []);
  // 줌 변경 시 scroll 위치 비례 보정 — 보던 줄이 화면에서 사라지지 않게
  const prevZoomRef = useRef(zoom);
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const prev = prevZoomRef.current;
    if (prev !== zoom) {
      scroller.scrollTop = scroller.scrollTop * (zoom / prev);
      prevZoomRef.current = zoom;
    }
  }, [zoom]);
  /** Ctrl/Cmd + 휠 = 줌 단계 (50/75/100/125/150/200). React onWheel passive 회피용 native listener. */
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const STEPS = [50, 75, 100, 125, 150, 200] as const;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const dir = e.deltaY < 0 ? 1 : -1;
      setZoomInner((cur) => {
        const idx = STEPS.indexOf(cur as 50 | 75 | 100 | 125 | 150 | 200);
        const safeIdx = idx >= 0 ? idx : STEPS.indexOf(100 as const);
        const next = STEPS[Math.max(0, Math.min(STEPS.length - 1, safeIdx + dir))];
        try { window.localStorage.setItem('personai.cloud.doc.zoom', String(next)); } catch { /* noop */ }
        return next;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // 페이지 마진 (좌우 px) — localStorage 영속. 기본 96px (1인치).
  const [pageMargin, setPageMarginInner] = useState<PageMargin>(() => {
    if (typeof window === 'undefined') return DEFAULT_PAGE_MARGIN;
    try {
      const v = window.localStorage.getItem('personai.cloud.doc.pageMargin');
      if (!v) return DEFAULT_PAGE_MARGIN;
      return normalizePageMargin(JSON.parse(v)) ?? DEFAULT_PAGE_MARGIN;
    } catch { /* noop */ }
    return DEFAULT_PAGE_MARGIN;
  });
  const setPageMargin = useCallback((m: PageMargin) => {
    setPageMarginInner(m);
    try { window.localStorage.setItem('personai.cloud.doc.pageMargin', JSON.stringify(m)); } catch { /* noop */ }
  }, []);
  const [pageSize, setPageSizeInner] = useState<PageSize>(() => {
    if (typeof window === 'undefined') return DEFAULT_PAGE_SIZE;
    try {
      const v = window.localStorage.getItem('personai.cloud.doc.pageSize');
      if (!v) return DEFAULT_PAGE_SIZE;
      return normalizePageSize(JSON.parse(v)) ?? DEFAULT_PAGE_SIZE;
    } catch { /* noop */ }
    return DEFAULT_PAGE_SIZE;
  });
  const setPageSize = useCallback((s: PageSize) => {
    setPageSizeInner(s);
    try { window.localStorage.setItem('personai.cloud.doc.pageSize', JSON.stringify(s)); } catch { /* noop */ }
  }, []);

  // 헤더 / 푸터 / 페이지 번호 — node.meta 영속. 기본 페이지 번호 ON.
  // useState 들은 위에 두되, node 를 참조하는 useEffect 는 반드시 useCloudNodeLoader 아래에 둔다 (TDZ 회피).
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [headerAlign, setHeaderAlign] = useState<DocxHeaderFooterAlign>(DEFAULT_HEADER_FOOTER_ALIGN);
  const [footerAlign, setFooterAlign] = useState<DocxHeaderFooterAlign>(DEFAULT_HEADER_FOOTER_ALIGN);
  const [showPageNumber, setShowPageNumber] = useState(true);
  const [pageNumberPlacement, setPageNumberPlacement] = useState<DocxPageNumberPlacement>(DEFAULT_PAGE_NUMBER_PLACEMENT);
  const [headerImages, setHeaderImages] = useState<DocxHeaderFooterImage[]>([]);
  const [footerImages, setFooterImages] = useState<DocxHeaderFooterImage[]>([]);
  const [sectionColumns, setSectionColumns] = useState<DocxSectionColumns>(DEFAULT_SECTION_COLUMNS);

  const scrollerRef = useRef<HTMLElement | null>(null);
  const docPageRef = useRef<HTMLDivElement | null>(null);
  const scrollRestoredRef = useRef(false);
  const contentLoadedForRef = useRef<string | null>(null);
  const nodeRef = useRef<ReturnType<typeof useCloudNodeLoader>['node']>(null);
  const metaRef = useRef<Record<string, unknown>>({});
  /** editor 가 mount 후 다른 콜백·effect 에서 참조하기 위한 안정 ref. */
  const editorRef = useRef<Editor | null>(null);
  const [pdfExporting, setPdfExporting] = useState(false);

  // 노드 로드 (공용 훅) — 아래의 node 참조 hook 들(initialBody useMemo, 헤더/푸터 로드 useEffect)
  // 보다 반드시 먼저 선언 (TDZ 회피).
  // setNode: tiptap onUpdate 등에서 로컬 node state 즉시 갱신용.
  const { node, loadError, setNode } = useCloudNodeLoader({
    id, user, authLoading,
    expectedFileType: 'doc',
    notFoundMessage: '문서를 찾을 수 없어요.',
    wrongTypeMessage: '문서 파일이 아니에요.',
    onLoad: () => { /* 본문 적용은 별도 useEffect (loaded) */ },
  });

  // 노드 변경 (다른 파일 열기 등) 시 헤더/푸터 메타에서 로드
  useEffect(() => {
    nodeRef.current = node;
    metaRef.current = (node?.meta as Record<string, unknown> | undefined) ?? {};
  }, [node]);

  useEffect(() => {
    if (!node?.meta) return;
    const m = node.meta as Record<string, unknown>;
    setHeaderText(typeof m.headerText === 'string' ? m.headerText : '');
    setFooterText(typeof m.footerText === 'string' ? m.footerText : '');
    setHeaderAlign(normalizeHeaderFooterAlign(m.headerAlign) ?? DEFAULT_HEADER_FOOTER_ALIGN);
    setFooterAlign(normalizeHeaderFooterAlign(m.footerAlign) ?? DEFAULT_HEADER_FOOTER_ALIGN);
    setShowPageNumber(typeof m.showPageNumber === 'boolean' ? m.showPageNumber : true);
    setPageNumberPlacement(normalizePageNumberPlacement(m.pageNumberPlacement) ?? DEFAULT_PAGE_NUMBER_PLACEMENT);
    setHeaderImages(normalizeHeaderFooterImages(m.headerImages));
    setFooterImages(normalizeHeaderFooterImages(m.footerImages));
    const loadedPageMargin = normalizePageMargin(m.pageMargin);
    if (loadedPageMargin) setPageMargin(loadedPageMargin);
    const loadedPageSize = normalizePageSize(m.pageSize);
    if (loadedPageSize) setPageSize(loadedPageSize);
    setSectionColumns(normalizeSectionColumns(m.sectionColumns) ?? DEFAULT_SECTION_COLUMNS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id]);

  const initialBody = useMemo(() => {
    if (!node?.meta) return null;
    const meta = node.meta as Record<string, unknown>;
    // 1순위: bodyHtml (업로드 변환 직후 — HTML)
    // 2순위: bodyMarkdown (업로드 변환 직후 — markdown)
    // 3순위: body (자체 포맷 ProseMirror JSON)
    if (typeof meta.bodyHtml === 'string') return { type: 'html', value: meta.bodyHtml };
    if (typeof meta.bodyMarkdown === 'string') return { type: 'markdown', value: meta.bodyMarkdown };
    if (meta.body) return { type: 'json', value: meta.body };
    return null;
  }, [node]);

  // ─── 디바운스 저장 큐 (공용 훅) ───
  const { flushSave, queueSave } = useDebouncedAutosave({
    id, delayMs: AUTOSAVE_DELAY_MS, setSaveState, setLastSavedAt,
  });

  const queueMetaPatch = useCallback((patch: Record<string, unknown>) => {
    const currentNode = nodeRef.current;
    const nextMeta = { ...metaRef.current, ...patch };
    metaRef.current = nextMeta;
    if (currentNode) {
      const nextNode = { ...currentNode, meta: nextMeta };
      nodeRef.current = nextNode;
      setNode(nextNode);
    }
    queueSave({ meta: nextMeta });
  }, [queueSave, setNode]);

  // ─── TipTap 에디터 ───
  const handlePageMarginChange = useCallback((nextMargin: PageMargin) => {
    const normalized = normalizePageMargin(nextMargin) ?? DEFAULT_PAGE_MARGIN;
    setPageMargin(normalized);
    queueMetaPatch({ pageMargin: normalized });
  }, [queueMetaPatch, setPageMargin]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        bulletList: false,
        orderedList: false,
      }),
      RichBulletList,
      RichOrderedList,
      Underline,
      TextStyleKit,
      Highlight.configure({ multicolor: true }),
      RunTextStyle,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: 'text-blue-600 underline underline-offset-2 hover:text-blue-700',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md my-2',
        },
      }),
      RichTable.configure({ resizable: true, HTMLAttributes: { class: 'doc-table' } }),
      RichTableRow,
      RichTableHeader,
      RichTableCell,
      Superscript,
      Subscript,
      ParagraphIndent,
      DocxMath,
      DocxTextBox,
      DocxToc,
      ParagraphBookmark,
      ParagraphDecoration,
      ParagraphPagination,
      ParagraphSpacing,
      ParagraphTabs,
      DocClipboard,
      CommentMark,
      RevisionMark,
      // paste/copy 시 markdown 자동 변환 끄기 — 외부 텍스트가 의도 안 한 변환되는 것 방지 (독스 톤)
      Markdown.configure({
        html: true,
        linkify: true,
        breaks: false,
        transformPastedText: false,
        transformCopiedText: false,
      }),
      Footnote,
      PageBreak,
      ColumnBreak,
      SectionBreak,
      Placeholder.configure({
        // 빈 줄 placeholder. AI 힌트는 노출하지 않음 (Space 단축키는 그대로 동작).
        placeholder: ({ node: pmNode }) => {
          if (pmNode.type.name === 'heading') return '제목을 입력하세요';
          return '내용을 입력하세요';
        },
        showOnlyCurrent: true,
        includeChildren: false,
      }),
    ],
    editorProps: {
      attributes: {
        class: cn(
          'doc-content focus:outline-none',
          'min-h-[800px]',  // 첫 페이지 가용 높이 확보 (다음 단계 페이지 break overlay 와 호환)
        ),
      },
      transformPastedHTML: normalizeDocPasteHtml,
    },
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON();
      const firstLine = extractFirstText(json) || '제목 없음';
      const meta: Record<string, unknown> = { ...metaRef.current, body: json };
      metaRef.current = meta;
      const patch: { name?: string; meta?: Record<string, unknown> } = { meta };
      const currentNode = nodeRef.current;
      if (currentNode) {
        const shouldRename = currentNode.name !== firstLine;
        if (shouldRename) {
          patch.name = firstLine;
        }
        const nextNode = {
          ...currentNode,
          ...(shouldRename ? { name: firstLine } : {}),
          meta,
        };
        nodeRef.current = nextNode;
        setNode(nextNode);
      }
      queueSave(patch);
    },
  }, [node?.id, queueSave, setNode]);

  // ─── AI 사이드바 (early return 전에 hook 호출 필수) ───
  const getAiContext = useCallback((): AiContext => {
    if (!editor) {
      return { kind: 'doc', summary: '빈 문서', fullText: '' };
    }
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      const all = editor.getText({ blockSeparator: '\n\n' });
      const chars = all.length;
      return {
        kind: 'doc',
        summary: chars === 0 ? '빈 문서' : `전체 문서 (${chars}자)`,
        fullText: all,
      };
    }
    const selText = editor.state.doc.textBetween(from, to, '\n\n');
    return {
      kind: 'doc',
      summary: `선택 (${selText.length}자)`,
      fullText: selText,
    };
  }, [editor]);
  const ai = useAiSidebar('doc', getAiContext, { persistKey: node?.id });
  /** 본문 편집 AI (드래그 bubble menu + 미리보기 카드). 사이드바와 별개. */
  const docAi = useDocAi(editor);
  editorRef.current = editor;

  // 모바일 편집 잠금 — 메모리 정책 (모바일은 보기 전용)
  const wasMobileNotifiedRef = useRef(false);
  useEffect(() => {
    if (!editor) return;
    const check = () => {
      const isMobile = window.innerWidth < 640; // tailwind sm
      editor.setEditable(!isMobile);
      if (isMobile && !wasMobileNotifiedRef.current) {
        toast({
          title: '모바일은 보기 전용',
          description: '편집은 데스크탑·노트북에서 가능해요. 다운로드는 ⋯ 메뉴에서.',
        });
        wasMobileNotifiedRef.current = true;
      } else if (!isMobile) {
        wasMobileNotifiedRef.current = false;
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [editor]);

  // 본문 안 각주(sup) 클릭 → 내용 편집 (prompt v1)
  useEffect(() => {
    if (!editor) return;
    const root = editor.view?.dom as HTMLElement | undefined;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.tagName !== 'SUP' || !target.hasAttribute('data-footnote')) return;
      e.preventDefault();
      e.stopPropagation();
      const id = target.getAttribute('data-footnote-id');
      if (!id) return;
      let foundPos = -1;
      let currentText = '';
      editor.state.doc.descendants((nd, pos) => {
        if (nd.type.name === 'footnote' && nd.attrs.id === id) {
          foundPos = pos;
          currentText = String(nd.attrs.text ?? '');
          return false;
        }
        return true;
      });
      if (foundPos < 0) return;
      const newText = window.prompt('각주 내용:', currentText);
      if (newText == null) return;
      editor.chain().focus()
        .setNodeSelection(foundPos)
        .updateAttributes('footnote', { text: newText.trim() || '(빈 각주)' })
        .run();
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [editor]);

  // 초기 본문 주입 (bodyHtml / bodyMarkdown / body 우선순위)
  useEffect(() => {
    if (!editor || !node) return;
    if (contentLoadedForRef.current === node.id) return;
    contentLoadedForRef.current = node.id;
    scrollRestoredRef.current = false;
    if (!initialBody) return;
    try {
      // HTML, markdown 둘 다 TipTap setContent 가 처리 (string 으로 주면 자동 인식)
      // markdown 은 tiptap-markdown extension 이 알아서 변환
      if (initialBody.type === 'html' || initialBody.type === 'markdown') {
        editor.commands.setContent(initialBody.value as string, { emitUpdate: false });
        // 첫 update 시 자동저장 큐에 들어가 meta.body (JSON) 로 저장됨
        // bodyHtml / bodyMarkdown 키는 다음 save 에서 자연스럽게 사라짐
      } else {
        const content = typeof initialBody.value === 'string'
          ? JSON.parse(initialBody.value)
          : initialBody.value;
        editor.commands.setContent(content as object, { emitUpdate: false });
      }
    } catch {
      editor.commands.setContent('', { emitUpdate: false });
    }
    // 콘텐츠 주입 직후 스크롤 위치 복원 (한 번만)
    if (!scrollRestoredRef.current && node.id) {
      try {
        const v = window.localStorage.getItem(`personai.cloud.doc.scrollTop.${node.id}`);
        const n = v ? Number(v) : NaN;
        if (Number.isFinite(n) && n > 0) {
          // 렌더 완료 후 스크롤 (TipTap DOM 마운트 대기)
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (scrollerRef.current) scrollerRef.current.scrollTop = n;
            });
          });
        }
      } catch { /* noop */ }
      scrollRestoredRef.current = true;
    }
  }, [editor, node, initialBody]);

  // ─── 스크롤 위치 영속화 (디바운스) ───
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !node?.id) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        try {
          window.localStorage.setItem(
            `personai.cloud.doc.scrollTop.${node.id}`,
            String(Math.round(el.scrollTop)),
          );
        } catch { /* noop */ }
      }, 400);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (t) clearTimeout(t);
    };
  }, [node?.id]);

  // ─── 키보드 — Ctrl+F / Ctrl+H 검색·치환, Ctrl+S 즉시 저장, Esc 닫기 ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen('find');
      } else if (isMod && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setSearchOpen('replace');
      } else if (isMod && e.key.toLowerCase() === 's' && !e.shiftKey) {
        // Ctrl+S — 즉시 저장 + 토스트. 브라우저 native save 차단.
        e.preventDefault();
        void flushSave();
        toast({ title: '저장됨', description: '모든 변경 사항이 저장되었어요.' });
      } else if (e.key === 'Escape' && searchOpen) {
        // 검색 패널 내 input 에 있으면 그 input 의 onKey 가 처리
        // 그 외(에디터 안)는 닫기
        const t = e.target as HTMLElement | null;
        if (!t?.closest('[data-doc-search]')) {
          setSearchOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen, flushSave]);

  // ─── Import / Export ───
  const importFile = useCallback(() => {
    if (!editor) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.docx,.md,.txt,.html,.htm';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const lower = file.name.toLowerCase();
        if (lower.endsWith('.docx')) {
          const {
            html,
            warnings,
            headerText: hT,
            footerText: fT,
            headerAlign: hA,
            footerAlign: fA,
            headerHasPageNumber,
            footerHasPageNumber,
            pageNumberPlacement: importedPageNumberPlacement,
            headerImages: importedHeaderImages,
            footerImages: importedFooterImages,
            pageMargin: importedPageMargin,
            pageSize: importedPageSize,
            sectionColumns: importedSectionColumns,
          } = await importDocxFile(file);
          editor.commands.setContent(html);
          if (hT) {
            setHeaderText(hT);
            queueMetaPatch({ headerText: hT });
          }
          if (fT) {
            setFooterText(fT);
            queueMetaPatch({ footerText: fT });
          }
          if (hA) {
            setHeaderAlign(hA);
            queueMetaPatch({ headerAlign: hA });
          }
          if (fA) {
            setFooterAlign(fA);
            queueMetaPatch({ footerAlign: fA });
          }
          if (headerHasPageNumber || footerHasPageNumber) {
            setShowPageNumber(true);
            const placement = importedPageNumberPlacement ?? (headerHasPageNumber ? 'header' : DEFAULT_PAGE_NUMBER_PLACEMENT);
            setPageNumberPlacement(placement);
            queueMetaPatch({ showPageNumber: true, pageNumberPlacement: placement });
          }
          if (importedHeaderImages?.length) {
            setHeaderImages(importedHeaderImages);
            queueMetaPatch({ headerImages: importedHeaderImages });
          }
          if (importedFooterImages?.length) {
            setFooterImages(importedFooterImages);
            queueMetaPatch({ footerImages: importedFooterImages });
          }
          if (importedPageMargin) {
            setPageMargin(importedPageMargin);
            queueMetaPatch({ pageMargin: importedPageMargin });
          }
          if (importedPageSize) {
            setPageSize(importedPageSize);
            queueMetaPatch({ pageSize: importedPageSize });
          }
          if (importedSectionColumns) {
            setSectionColumns(importedSectionColumns);
            queueMetaPatch({ sectionColumns: importedSectionColumns });
          }
          const extras = [hT && '머리글', fT && '바닥글'].filter(Boolean).join('·');
          const desc = warnings.length === 0
            ? `${file.name}${extras ? ` (${extras} 보존)` : ''}`
            : `${file.name} — ${warnings.length}개 항목은 표시할 수 없음 (예: ${warnings[0]})`;
          toast({ title: '가져오기 완료', description: desc });
        } else if (lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.txt')) {
          const md = await readMarkdownFile(file);
          editor.commands.setContent(md);
          toast({ title: '가져오기 완료', description: file.name });
        } else if (lower.endsWith('.html') || lower.endsWith('.htm')) {
          const html = await file.text();
          editor.commands.setContent(html);
          toast({ title: '가져오기 완료', description: file.name });
        } else {
          toast({ title: '지원하지 않는 형식', description: '.docx / .md / .txt / .html 만 지원' });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast({ title: '가져오기 실패', description: msg });
      }
    };
    input.click();
  }, [editor, queueMetaPatch, setPageMargin, setPageSize]);

  const exportDocx = useCallback(async () => {
    if (!editor || !node) return;
    try {
      const json = editor.getJSON();
      const fileName = node.name.replace(/[\\/:*?"<>|]/g, '_');
      await exportDocxFromJson(json, fileName, {
        headerText,
        footerText,
        showPageNumber,
        pageNumberPlacement,
        headerAlign,
        footerAlign,
        headerImages,
        footerImages,
        pageMargin,
        pageSize,
        sectionColumns,
      });
      toast({ title: '내보내기 완료', description: `${fileName}.docx 다운로드 시작` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '내보내기 실패', description: msg });
    }
  }, [
    editor,
    node,
    headerText,
    footerText,
    showPageNumber,
    pageNumberPlacement,
    headerAlign,
    footerAlign,
    headerImages,
    footerImages,
    pageMargin,
    pageSize,
    sectionColumns,
  ]);

  const exportPdf = useCallback(async () => {
    if (!node || !docPageRef.current) return;
    const exportEl = docPageRef.current;
    setPdfExporting(true);
    try {
      // PDF는 본문만이 아니라 A4 페이지 전체를 캡처한다.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      const name = sanitizeFileName(node.name);
      await exportElementToPdf(exportEl, {
        fileName: name,
        orientation: 'p',
        format: 'a4',
        background: '#ffffff',
      });
      toast({ title: 'PDF 다운로드 시작', description: `${name}.pdf` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'PDF 내보내기 실패', description: msg });
    } finally {
      setPdfExporting(false);
    }
  }, [node]);

  const exportMarkdown = useCallback(() => {
    if (!editor || !node) return;
    try {
      const storage = editor.storage as { markdown?: { getMarkdown?: () => string } };
      const md = storage.markdown?.getMarkdown?.() ?? '';
      const fileName = node.name.replace(/[\\/:*?"<>|]/g, '_');
      exportMarkdownFile(md, fileName);
      toast({ title: '내보내기 완료', description: `${fileName}.md 다운로드 시작` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '내보내기 실패', description: msg });
    }
  }, [editor, node]);

  // ─── 단축키: ? = 도움말, Esc = 도움말 닫기 (도움말이 열려있을 때만) ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const inEditor = (e.target as HTMLElement | null)?.closest?.('.ProseMirror');
      if (tag === 'input' || tag === 'textarea' || inEditor) return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const close = useCallback(() => {
    void flushSave();
    navigate('/cloud');
  }, [flushSave, navigate]);

  // 로딩·에러
  if (authLoading || (!loadError && !node)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <div className="text-base font-medium">{loadError}</div>
        <button
          type="button"
          onClick={() => navigate('/cloud')}
          className="px-4 py-2 rounded border border-border hover:bg-muted text-sm flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          클라우드로 돌아가기
        </button>
      </div>
    );
  }

  return (
    // h-screen + overflow-hidden: 본문(에디터) 과 AI 사이드바 스크롤 분리.
    <div className="h-screen overflow-hidden bg-background flex flex-col">
      <header className="border-b border-border bg-background sticky top-0 z-20">
        <div className="flex items-center gap-2 px-4 py-2 text-sm">
          <button
            onClick={close}
            className="p-2 rounded hover:bg-muted"
            aria-label="닫기"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-muted-foreground" aria-hidden>☁️</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium truncate max-w-md">{node?.name ?? '제목 없음'}</span>

          <span className="ml-3 text-xs">
            <SaveStateBadge state={saveState} lastSavedAt={lastSavedAt} showIdle onRetry={() => { void flushSave(); }} />
          </span>
          {editor && <WordCountBadge editor={editor} />}

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="p-2 rounded hover:bg-muted"
              aria-label="단축키 도움말"
              title="단축키 도움말 (?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>
            {editor && <TocDropdown editor={editor} />}
            <AiSidebarToggle open={ai.open} onClick={ai.toggle} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded hover:bg-muted"
                  aria-label="더보기"
                  title="더보기"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[220px]">
                <DropdownMenuItem onSelect={importFile}>
                  가져오기 (.docx / .md / .html)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={exportDocx}>
                  .docx로 내보내기
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={exportMarkdown}>
                  .md로 내보내기
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { void exportPdf(); }}>
                  PDF로 내보내기
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { window.print(); }}>
                  인쇄 (Ctrl+P)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault(); // 메뉴 안 닫고 토글
                    const next = !showPageNumber;
                    setShowPageNumber(next);
                    queueMetaPatch({ showPageNumber: next });
                  }}
                >
                  {showPageNumber ? '✓' : '·'} 페이지 번호 표시
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {editor && <DocToolbar editor={editor} zoom={zoom} onZoomChange={setZoom} />}
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main ref={scrollerRef} className="flex-1 overflow-auto relative doc-page-bg">
          {editor && searchOpen && (
            <DocSearchPanel
              editor={editor}
              mode={searchOpen}
              onModeChange={setSearchOpen}
              onClose={() => setSearchOpen(false)}
            />
          )}
          {/* A4 흰 카드 — 21cm × 29.7cm @ 96dpi. 본문 길이에 따라 카드 height 자동 확장 */}
          <div className="flex items-start justify-center gap-4 px-4">
            <div ref={docPageRef} className={pdfExporting ? 'mx-auto bg-white' : undefined}>
              <DocPage
                zoom={zoom}
                exportMode={pdfExporting}
                pageSize={pageSize}
                pageMargin={pageMargin}
                onMarginChange={handlePageMarginChange}
                headerText={headerText}
                footerText={footerText}
                headerAlign={headerAlign}
                footerAlign={footerAlign}
                headerImages={headerImages}
                footerImages={footerImages}
                onHeaderChange={(v) => {
                  setHeaderText(v);
                  queueMetaPatch({ headerText: v });
                }}
                onFooterChange={(v) => {
                  setFooterText(v);
                  queueMetaPatch({ footerText: v });
                }}
                showPageNumber={showPageNumber}
                pageNumberPlacement={pageNumberPlacement}
              >
                <EditorContent editor={editor} />
                <FootnoteList editor={editor} />
              </DocPage>
            </div>
            <CommentList editor={editor} />
          </div>
        </main>
        <AiSidebar
          open={ai.open}
          onClose={() => ai.setOpen(false)}
          context={getAiContext()}
          messages={ai.messages}
          sending={ai.sending}
          onSend={ai.send}
          onRetry={ai.retryLast}
          onClear={ai.clear}
        />
      </div>

      {editor && (
        <FloatingMenu
          editor={editor}
          shouldShow={({ state }) => {
            const { $from, empty } = state.selection;
            if (!empty) return false;
            const parent = $from.parent;
            if (parent.type.name !== 'paragraph') return false;
            return parent.textContent.startsWith('/');
          }}
        >
          <SlashMenu editor={editor} />
        </FloatingMenu>
      )}

      {/* ── Q1 D: 텍스트 선택 시 floating ✨ ── */}
      {editor && <AiBubbleMenu editor={editor} ai={docAi} />}

      {/* ── Q3 B: AI 결과 미리보기 카드 (스크롤러 위 고정) ── */}
      {docAi.preview && (
        <div className="fixed top-20 left-0 right-0 z-50 pointer-events-none">
          <div className="container max-w-3xl mx-auto px-4 pointer-events-auto">
            <AiPreviewCard
              result={docAi.preview.result}
              actionLabel={docAi.preview.actionLabel}
              defaultPlacement={docAi.preview.defaultPlacement}
              onAccept={docAi.acceptPreview}
              onReject={docAi.rejectPreview}
              onRetry={docAi.retryPreview}
              onEdit={docAi.editPreview}
            />
          </div>
        </div>
      )}

      <KeyboardHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}



// ─────────────────────────────────────────────
// 서식 복사 (Format Painter)
//  - 클릭: 현재 선택의 마크 캡처 + 활성화
//  - 다음 selection 변경 (non-empty) 시 자동 적용 + 해제
//  - Esc 또는 다시 클릭으로 취소
// ─────────────────────────────────────────────


// ─────────────────────────────────────────────
// 도구바
// ─────────────────────────────────────────────





// ─────────────────────────────────────────────
// 이미지 선택 → base64 → 본문 삽입
// (v1: 인라인 base64. 5MB 한계 가까우면 토스트 안내.
//  추후 IndexedDB blob ref 로 마이그레이션 예정.)
// ─────────────────────────────────────────────


// ─────────────────────────────────────────────
// 색 picker (도구바 inline)
// ─────────────────────────────────────────────



// ─────────────────────────────────────────────
// 저장 상태 뱃지
// ─────────────────────────────────────────────





// ─────────────────────────────────────────────
// 본문 첫 텍스트 추출 — ProseMirror JSON 의 첫 텍스트 노드 텍스트.
// ─────────────────────────────────────────────

interface PMNode {
  type?: string;
  text?: string;
  content?: PMNode[];
}

function extractFirstText(json: unknown): string {
  const root = json as PMNode | null;
  if (!root || !root.content) return '';
  for (const block of root.content) {
    const txt = collectText(block);
    if (txt.trim()) return txt.trim().slice(0, 80);
  }
  return '';
}

function collectText(n: PMNode | null | undefined): string {
  if (!n) return '';
  if (n.text) return n.text;
  if (!n.content) return '';
  return n.content.map((c) => collectText(c)).join('');
}

