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
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { Markdown } from 'tiptap-markdown';
import {
  X, MoreHorizontal, Loader2, CheckCircle2, AlertCircle, ArrowLeft,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered,
  Undo2, Redo2, Keyboard,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Palette, Highlighter, Link as LinkIcon, Link2Off,
  Table as TableIcon, ImagePlus,
  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
  IndentIncrease, IndentDecrease,
  Sparkles, Search as SearchIcon, ChevronUp, ChevronDown, Replace as ReplaceIcon,
  ListTree, Paintbrush, Asterisk,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchNode, updateFileBody } from '@/lib/cloudClient';
import { importDocxFile, exportDocxFromJson } from '@/lib/cloudDoc/docx';
import { readMarkdownFile, exportMarkdownFile } from '@/lib/cloudDoc/markdown';
import { aiSummarize, aiRewrite, aiTranslate, aiChangeTone, aiContinue } from '@/lib/cloudDoc/ai';
import { exportElementToPdf, sanitizeFileName } from '@/lib/cloudCommon/pdfExport';
import { type PageMargin } from '@/lib/cloudDoc/PageRuler';
import { DocPage } from '@/lib/cloudDoc/DocPage';
import { SaveStateBadge, type SaveState } from '@/lib/cloudDoc/SaveStateBadge';
import { WordCountBadge } from '@/lib/cloudDoc/WordCountBadge';
import { StyleSelect } from '@/lib/cloudDoc/StyleSelect';
import { ZoomSelect } from '@/lib/cloudDoc/ZoomSelect';
import { ToolBtn, Sep } from '@/lib/cloudDoc/ToolBtn';
import { FormatPainterBtn } from '@/lib/cloudDoc/FormatPainterBtn';
import { TocDropdown } from '@/lib/cloudDoc/TocDropdown';
import { KeyboardHelpModal } from '@/lib/cloudDoc/KeyboardHelpModal';
import { SlashMenu } from '@/lib/cloudDoc/SlashMenu';
import { pickImage } from '@/lib/cloudDoc/pickImage';
import { AiActionsButton } from '@/lib/cloudDoc/AiActionsButton';
import { FontSizeSelect, FontFamilySelect } from '@/lib/cloudDoc/FontSelects';
import { ColorPickBtn } from '@/lib/cloudDoc/ColorPickBtn';
import { Footnote } from '@/lib/cloudDoc/tiptap/Footnote';
import { FootnoteList } from '@/lib/cloudDoc/tiptap/FootnoteList';
import { AiSidebar } from '@/components/cloud/AiSidebar';
import { AiSidebarToggle } from '@/components/cloud/AiSidebarToggle';
import { useAiSidebar } from '@/components/cloud/useAiSidebar';
import type { AiContext } from '@/lib/cloudAi/types';
import type { CloudNode } from '@/types/cloud';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';


const AUTOSAVE_DELAY_MS = 1000;

export default function CloudDocEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [node, setNode] = useState<CloudNode | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
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

  // 페이지 마진 (좌우 px) — localStorage 영속. 기본 96px (1인치).
  const [pageMargin, setPageMarginInner] = useState<PageMargin>(() => {
    if (typeof window === 'undefined') return { left: 96, right: 96 };
    try {
      const v = window.localStorage.getItem('personai.cloud.doc.pageMargin');
      if (!v) return { left: 96, right: 96 };
      const p = JSON.parse(v) as Partial<PageMargin>;
      if (typeof p?.left === 'number' && typeof p?.right === 'number') {
        return { left: p.left, right: p.right };
      }
    } catch { /* noop */ }
    return { left: 96, right: 96 };
  });
  const setPageMargin = useCallback((m: PageMargin) => {
    setPageMarginInner(m);
    try { window.localStorage.setItem('personai.cloud.doc.pageMargin', JSON.stringify(m)); } catch { /* noop */ }
  }, []);

  // 헤더 / 푸터 / 페이지 번호 — node.meta 영속. 기본 페이지 번호 ON.
  const [headerText, setHeaderText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [showPageNumber, setShowPageNumber] = useState(true);

  // 노드 변경 (다른 파일 열기 등) 시 헤더/푸터 메타에서 로드
  useEffect(() => {
    if (!node?.meta) return;
    const m = node.meta as Record<string, unknown>;
    setHeaderText(typeof m.headerText === 'string' ? m.headerText : '');
    setFooterText(typeof m.footerText === 'string' ? m.footerText : '');
    setShowPageNumber(typeof m.showPageNumber === 'boolean' ? m.showPageNumber : true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id]);


  const pendingRef = useRef<{ name?: string; meta?: Record<string, unknown> }>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const scrollRestoredRef = useRef(false);
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

  // 노드 로드
  useEffect(() => {
    if (!id) return;
    if (authLoading) return;
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const n = await fetchNode(id);
        if (cancelled) return;
        if (!n) {
          setLoadError('문서를 찾을 수 없어요.');
          return;
        }
        if (n.ownerId !== user.id) {
          setLoadError('접근 권한이 없어요.');
          return;
        }
        if (n.kind !== 'file' || n.fileType !== 'doc') {
          setLoadError('문서 파일이 아니에요.');
          return;
        }
        setNode(n);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [id, user, authLoading]);

  // ─── 디바운스 저장 큐 ───
  const flushSave = useCallback(async () => {
    if (!id) return;
    const payload = pendingRef.current;
    if (!payload.name && !payload.meta) return;
    pendingRef.current = {};
    setSaveState('saving');
    try {
      await updateFileBody(id, payload);
      setSaveState('saved');
    } catch (e) {
      setSaveState('error');
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '저장 실패', description: msg });
    }
  }, [id]);

  const queueSave = useCallback((patch: { name?: string; meta?: Record<string, unknown> }) => {
    pendingRef.current = { ...pendingRef.current, ...patch };
    setSaveState('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void flushSave(); }, AUTOSAVE_DELAY_MS);
  }, [flushSave]);

  // 언마운트 시 즉시 flush
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      void flushSave();
    };
  }, [flushSave]);

  // ─── TipTap 에디터 ───
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyleKit,
      Highlight.configure({ multicolor: true }),
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
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md my-2',
        },
      }),
      Table.configure({ resizable: true, HTMLAttributes: { class: 'doc-table' } }),
      TableRow,
      TableHeader,
      TableCell,
      Superscript,
      Subscript,
      // paste/copy 시 markdown 자동 변환 끄기 — 외부 텍스트가 의도 안 한 변환되는 것 방지 (독스 톤)
      Markdown.configure({
        html: true,
        linkify: true,
        breaks: false,
        transformPastedText: false,
        transformCopiedText: false,
      }),
      Footnote,
      Placeholder.configure({
        placeholder: ({ node: pmNode }) => {
          if (pmNode.type.name === 'heading') return '제목을 입력하세요';
          return '내용을 입력하세요';
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: cn(
          'doc-content focus:outline-none',
          'min-h-[800px]',  // 첫 페이지 가용 높이 확보 (다음 단계 페이지 break overlay 와 호환)
        ),
      },
    },
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON();
      const firstLine = extractFirstText(json) || '제목 없음';
      const meta: Record<string, unknown> = { ...(node?.meta ?? {}), body: json };
      const patch: { name?: string; meta?: Record<string, unknown> } = { meta };
      if (node && node.name !== firstLine) {
        patch.name = firstLine;
        setNode({ ...node, name: firstLine, meta });
      } else if (node) {
        setNode({ ...node, meta });
      }
      queueSave(patch);
    },
  }, [node?.id]);

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
    if (!initialBody) return;
    try {
      // HTML, markdown 둘 다 TipTap setContent 가 처리 (string 으로 주면 자동 인식)
      // markdown 은 tiptap-markdown extension 이 알아서 변환
      if (initialBody.type === 'html' || initialBody.type === 'markdown') {
        editor.commands.setContent(initialBody.value as string, { emitUpdate: true });
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

  // ─── 키보드 — Ctrl+F / Ctrl+H 검색·치환, Esc 닫기 ───
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen('find');
      } else if (isMod && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setSearchOpen('replace');
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
  }, [searchOpen]);

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
          const { html, warnings, headerText: hT, footerText: fT } = await importDocxFile(file);
          editor.commands.setContent(html);
          if (hT) {
            setHeaderText(hT);
            if (node) queueSave({ meta: { ...node.meta, headerText: hT } });
          }
          if (fT) {
            setFooterText(fT);
            if (node) queueSave({ meta: { ...node.meta, footerText: fT } });
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
  }, [editor]);

  const exportDocx = useCallback(async () => {
    if (!editor || !node) return;
    try {
      const json = editor.getJSON();
      const fileName = node.name.replace(/[\\/:*?"<>|]/g, '_');
      await exportDocxFromJson(json, fileName, { headerText, footerText, showPageNumber });
      toast({ title: '내보내기 완료', description: `${fileName}.docx 다운로드 시작` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '내보내기 실패', description: msg });
    }
  }, [editor, node, headerText, footerText, showPageNumber]);

  const exportPdf = useCallback(async () => {
    if (!editor || !node) return;
    try {
      // ProseMirror 본문 DOM 직접 캡처
      const dom = editor.view.dom as HTMLElement;
      const name = sanitizeFileName(node.name);
      await exportElementToPdf(dom, { fileName: name, orientation: 'p' });
      toast({ title: 'PDF 다운로드 시작', description: `${name}.pdf` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'PDF 내보내기 실패', description: msg });
    }
  }, [editor, node]);

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
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
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
    <div className="min-h-screen bg-background flex flex-col">
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
            <SaveStateBadge state={saveState} />
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
            {editor && <AiActionsButton editor={editor} />}
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
                  📥 가져오기 (.docx / .md / .html)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={exportDocx}>
                  📤 .docx 로 내보내기
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={exportMarkdown}>
                  📤 .md 로 내보내기
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { void exportPdf(); }}>
                  📤 PDF 로 내보내기
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { window.print(); }}>
                  🖨 인쇄 (Ctrl+P)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault(); // 메뉴 안 닫고 토글
                    const next = !showPageNumber;
                    setShowPageNumber(next);
                    if (node) queueSave({ meta: { ...node.meta, showPageNumber: next } });
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
          <DocPage
            zoom={zoom}
            pageMargin={pageMargin}
            onMarginChange={setPageMargin}
            headerText={headerText}
            footerText={footerText}
            onHeaderChange={(v) => {
              setHeaderText(v);
              if (node) queueSave({ meta: { ...node.meta, headerText: v } });
            }}
            onFooterChange={(v) => {
              setFooterText(v);
              if (node) queueSave({ meta: { ...node.meta, footerText: v } });
            }}
            showPageNumber={showPageNumber}
          >
            <EditorContent editor={editor} />
            <FootnoteList editor={editor} />
          </DocPage>
        </main>
        <AiSidebar
          open={ai.open}
          onClose={() => ai.setOpen(false)}
          context={getAiContext()}
          messages={ai.messages}
          sending={ai.sending}
          onSend={ai.send}
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

function DocToolbar({ editor, zoom, onZoomChange }: { editor: Editor; zoom: number; onZoomChange: (z: number) => void }) {
  return (
    <div className="border-t border-border bg-background flex items-center gap-0.5 px-3 py-1.5 overflow-x-auto">
      <ToolBtn
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="실행 취소 (Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="다시 실행 (Ctrl+Shift+Z)"
      >
        <Redo2 className="w-4 h-4" />
      </ToolBtn>
      <Sep />
      <FormatPainterBtn editor={editor} />
      <Sep />
      <StyleSelect editor={editor} />
      <ZoomSelect zoom={zoom} onZoomChange={onZoomChange} />
      <Sep />
      <ToolBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="굵게 (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="기울임 (Ctrl+I)"
      >
        <Italic className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="밑줄 (Ctrl+U)"
      >
        <UnderlineIcon className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="취소선 (Ctrl+Shift+X)"
      >
        <Strikethrough className="w-4 h-4" />
      </ToolBtn>
      <Sep />
      {/* 목록 (구글 독스 도구바 패턴 — 블록 스타일은 StyleSelect 으로 통일).
         인라인 코드 / 헤딩 단축 / 인용 / 코드 블록 / 구분선은 도구바에서 제거.
         → StyleSelect (블록 스타일) + 슬래시 `/` 메뉴 + 키보드 단축키로 모두 접근 가능. */}
      <ToolBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="글머리 기호 목록 (Ctrl+Shift+8)"
      >
        <List className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="번호 매기기 (Ctrl+Shift+7)"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolBtn>
      <Sep />

      {/* 정렬 4종 */}
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        active={editor.isActive({ textAlign: 'left' })}
        title="왼쪽 정렬 (Ctrl+Shift+L)"
      >
        <AlignLeft className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        active={editor.isActive({ textAlign: 'center' })}
        title="가운데 정렬 (Ctrl+Shift+E)"
      >
        <AlignCenter className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        active={editor.isActive({ textAlign: 'right' })}
        title="오른쪽 정렬 (Ctrl+Shift+R)"
      >
        <AlignRight className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        active={editor.isActive({ textAlign: 'justify' })}
        title="양쪽 정렬 (Ctrl+Shift+J)"
      >
        <AlignJustify className="w-4 h-4" />
      </ToolBtn>
      <Sep />

      {/* 글자색 */}
      <ColorPickBtn
        icon={<Palette className="w-4 h-4" />}
        value={editor.getAttributes('textStyle').color ?? '#222222'}
        onChange={(c) => editor.chain().focus().setColor(c).run()}
        onClear={() => editor.chain().focus().unsetColor().run()}
        title="글자색"
      />
      {/* 형광펜 (배경색) */}
      <ColorPickBtn
        icon={<Highlighter className="w-4 h-4" />}
        value={editor.getAttributes('highlight').color ?? '#fff59d'}
        onChange={(c) => editor.chain().focus().toggleHighlight({ color: c }).run()}
        onClear={() => editor.chain().focus().unsetHighlight().run()}
        title="형광펜"
      />
      <Sep />

      {/* 링크 */}
      <ToolBtn
        onClick={() => {
          const prev = editor.getAttributes('link').href as string | undefined;
          const url = window.prompt('링크 URL', prev ?? 'https://');
          if (url === null) return;
          if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
          } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          }
        }}
        active={editor.isActive('link')}
        title="링크 추가/수정"
      >
        <LinkIcon className="w-4 h-4" />
      </ToolBtn>
      {editor.isActive('link') && (
        <ToolBtn
          onClick={() => editor.chain().focus().unsetLink().run()}
          title="링크 제거"
        >
          <Link2Off className="w-4 h-4" />
        </ToolBtn>
      )}
      <Sep />

      {/* 표 삽입 */}
      <ToolBtn
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        title="표 삽입 (3×3)"
      >
        <TableIcon className="w-4 h-4" />
      </ToolBtn>
      {/* 표 안일 때만 행/열 액션 노출 */}
      {editor.isActive('table') && (
        <>
          <ToolBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="아래 행 추가">
            <span className="text-[10px]">+행</span>
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="오른쪽 열 추가">
            <span className="text-[10px]">+열</span>
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().deleteRow().run()} title="현재 행 삭제">
            <span className="text-[10px]">−행</span>
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().deleteColumn().run()} title="현재 열 삭제">
            <span className="text-[10px]">−열</span>
          </ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().deleteTable().run()} title="표 삭제">
            <span className="text-[10px] text-destructive">표✕</span>
          </ToolBtn>
        </>
      )}
      <Sep />

      {/* 이미지 */}
      <ToolBtn
        onClick={() => pickImage(editor)}
        title="이미지 추가 (파일 선택)"
      >
        <ImagePlus className="w-4 h-4" />
      </ToolBtn>
      <Sep />

      {/* 글꼴 크기 */}
      <FontSizeSelect editor={editor} />
      {/* 글꼴 종류 */}
      <FontFamilySelect editor={editor} />
      <Sep />

      {/* 첨자 */}
      <ToolBtn
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        active={editor.isActive('superscript')}
        title="위 첨자 (Ctrl+.)"
      >
        <SuperscriptIcon className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        active={editor.isActive('subscript')}
        title="아래 첨자 (Ctrl+,)"
      >
        <SubscriptIcon className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => {
          const text = window.prompt('각주 내용:', '');
          if (text == null) return;
          editor.chain().focus().addFootnote(text.trim() || '(빈 각주)').run();
        }}
        title="각주 추가"
      >
        <Asterisk className="w-4 h-4" />
      </ToolBtn>
      <Sep />

      {/* 들여쓰기 (리스트 항목 한정) */}
      <ToolBtn
        onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
        disabled={!editor.can().sinkListItem('listItem')}
        title="들여쓰기 (Tab, 리스트에서)"
      >
        <IndentIncrease className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().liftListItem('listItem').run()}
        disabled={!editor.can().liftListItem('listItem')}
        title="내어쓰기 (Shift+Tab, 리스트에서)"
      >
        <IndentDecrease className="w-4 h-4" />
      </ToolBtn>
      {/* ✨ AI 액션은 헤더 우측 (AiSidebarToggle 옆) 으로 이동 — 도구바 정리 */}
    </div>
  );
}




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

// ─────────────────────────────────────────────
// 검색·치환 패널 (Ctrl+F / Ctrl+H)
// ─────────────────────────────────────────────

interface DocSearchPanelProps {
  editor: Editor;
  mode: 'find' | 'replace';
  onModeChange: (m: 'find' | 'replace') => void;
  onClose: () => void;
}

interface DocMatch { from: number; to: number }

function findAllMatches(editor: Editor, query: string, caseSensitive: boolean): DocMatch[] {
  const matches: DocMatch[] = [];
  if (!query) return matches;
  const q = caseSensitive ? query : query.toLowerCase();
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = caseSensitive ? node.text : node.text.toLowerCase();
    let i = text.indexOf(q);
    while (i !== -1) {
      matches.push({ from: pos + i, to: pos + i + q.length });
      i = text.indexOf(q, i + q.length);
    }
  });
  return matches;
}

function DocSearchPanel({ editor, mode, onModeChange, onClose }: DocSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matches, setMatches] = useState<DocMatch[]>([]);
  const [cursor, setCursor] = useState(0); // 현재 매치 인덱스
  const inputRef = useRef<HTMLInputElement>(null);

  // 마운트·모드 변경 시 input 포커스
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [mode]);

  // 쿼리·대소문자 변경 시 매치 재계산
  useEffect(() => {
    if (!query) {
      setMatches([]);
      setCursor(0);
      return;
    }
    const next = findAllMatches(editor, query, caseSensitive);
    setMatches(next);
    setCursor(0);
    // 첫 매치로 스크롤
    if (next.length > 0) {
      const m = next[0];
      editor.commands.setTextSelection({ from: m.from, to: m.to });
      editor.commands.scrollIntoView();
    }
  }, [editor, query, caseSensitive]);

  // editor 본문이 외부에서 바뀌면 매치 재계산 — 단순 polling 보다는 update 구독
  useEffect(() => {
    if (!query) return;
    const onUpdate = () => {
      const next = findAllMatches(editor, query, caseSensitive);
      setMatches(next);
      // cursor 가 범위 밖이면 0 으로
      setCursor((c) => (c >= next.length ? 0 : c));
    };
    editor.on('update', onUpdate);
    return () => { editor.off('update', onUpdate); };
  }, [editor, query, caseSensitive]);

  const gotoMatch = useCallback((idx: number) => {
    if (matches.length === 0) return;
    const i = ((idx % matches.length) + matches.length) % matches.length;
    setCursor(i);
    const m = matches[i];
    editor.commands.setTextSelection({ from: m.from, to: m.to });
    editor.commands.scrollIntoView();
    editor.commands.focus();
  }, [editor, matches]);

  const next = useCallback(() => gotoMatch(cursor + 1), [gotoMatch, cursor]);
  const prev = useCallback(() => gotoMatch(cursor - 1), [gotoMatch, cursor]);

  const replaceOne = useCallback(() => {
    if (matches.length === 0) return;
    const m = matches[cursor];
    editor.chain()
      .focus()
      .insertContentAt({ from: m.from, to: m.to }, replaceText)
      .run();
    // 매치 목록은 onUpdate 가 재계산. 다음 매치로 이동 (커서는 그 자리 유지)
    setTimeout(() => {
      const fresh = findAllMatches(editor, query, caseSensitive);
      setMatches(fresh);
      if (fresh.length > 0) {
        const ni = Math.min(cursor, fresh.length - 1);
        setCursor(ni);
        const target = fresh[ni];
        editor.commands.setTextSelection({ from: target.from, to: target.to });
      } else {
        setCursor(0);
      }
    }, 0);
  }, [editor, matches, cursor, replaceText, query, caseSensitive]);

  const replaceAll = useCallback(() => {
    if (matches.length === 0) return;
    // 뒤에서 앞으로 — 앞 위치가 흔들리지 않도록
    const chain = editor.chain().focus();
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      chain.insertContentAt({ from: m.from, to: m.to }, replaceText);
    }
    chain.run();
    const after = matches.length;
    setMatches([]);
    setCursor(0);
    toast({ title: `${after}개 항목 치환됨` });
  }, [editor, matches, replaceText]);

  const handleQueryKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) prev(); else next();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key.toLowerCase() === 'h' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onModeChange('replace');
    } else if (e.key.toLowerCase() === 'f' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onModeChange('find');
    }
  }, [next, prev, onClose, onModeChange]);

  return (
    <div
      data-doc-search
      className="sticky top-0 z-30 mx-auto max-w-3xl px-4 pt-2"
    >
      <div className="rounded-lg border border-border bg-popover shadow-md p-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <SearchIcon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleQueryKey}
            placeholder="찾을 내용"
            className="flex-1 text-sm px-2 py-1 rounded border border-border bg-background outline-none focus:border-foreground/40"
            aria-label="찾을 내용"
          />
          <span className="text-xs text-muted-foreground min-w-[44px] text-right tabular-nums">
            {matches.length === 0 ? '0' : `${cursor + 1}/${matches.length}`}
          </span>
          <button
            type="button"
            onClick={prev}
            disabled={matches.length === 0}
            className="p-1 rounded hover:bg-muted disabled:opacity-40"
            aria-label="이전 결과"
            title="Shift+Enter"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={next}
            disabled={matches.length === 0}
            className="p-1 rounded hover:bg-muted disabled:opacity-40"
            aria-label="다음 결과"
            title="Enter"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <label className="flex items-center gap-1 text-xs text-muted-foreground select-none cursor-pointer">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="cursor-pointer"
            />
            Aa
          </label>
          <button
            type="button"
            onClick={() => onModeChange(mode === 'find' ? 'replace' : 'find')}
            className={cn(
              'p-1 rounded hover:bg-muted',
              mode === 'replace' && 'bg-muted',
            )}
            aria-label="치환 토글"
            title="Ctrl+H"
          >
            <ReplaceIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-muted"
            aria-label="검색 닫기 (Esc)"
            title="Esc"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {mode === 'replace' && (
          <div className="flex items-center gap-1.5">
            <ReplaceIcon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); replaceOne(); }
                else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
              }}
              placeholder="바꿀 내용"
              className="flex-1 text-sm px-2 py-1 rounded border border-border bg-background outline-none focus:border-foreground/40"
              aria-label="바꿀 내용"
            />
            <button
              type="button"
              onClick={replaceOne}
              disabled={matches.length === 0}
              className="px-2 py-1 rounded border border-border hover:bg-muted text-xs disabled:opacity-40"
              title="현재 매치 1개 치환 (Enter)"
            >
              바꾸기
            </button>
            <button
              type="button"
              onClick={replaceAll}
              disabled={matches.length === 0}
              className="px-2 py-1 rounded bg-foreground text-background hover:bg-foreground/90 text-xs disabled:opacity-40"
              title={`전체 ${matches.length}개 치환`}
            >
              모두 바꾸기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
