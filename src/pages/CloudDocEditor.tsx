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
import { PageRuler, type PageMargin } from '@/lib/cloudDoc/PageRuler';
import { usePageBreaks } from '@/lib/cloudDoc/usePageBreaks';
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

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DELAY_MS = 1000;
/** A4 한 페이지의 본문 가용 높이 (1056 - top/bottom margins 96*2). */
const PAGE_CONTENT_HEIGHT_PX = 864;

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
      await exportDocxFromJson(json, fileName, { headerText, footerText });
      toast({ title: '내보내기 완료', description: `${fileName}.docx 다운로드 시작` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '내보내기 실패', description: msg });
    }
  }, [editor, node, headerText, footerText]);

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
              <DropdownMenuContent align="end" className="min-w-[200px]">
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
// 페이지 카드 + 자동 분할 overlay
//  - A4 흰 카드 (mx-auto, zoom transform, ruler)
//  - 본문 길이에 따라 페이지 break (점선 + "페이지 N" 라벨)
//  - 진짜 페이지 단위 ProseMirror 분할 X — 시각 overlay 만
// ─────────────────────────────────────────────

interface DocPageProps {
  zoom: number;
  pageMargin: PageMargin;
  onMarginChange: (m: PageMargin) => void;
  headerText: string;
  footerText: string;
  onHeaderChange: (v: string) => void;
  onFooterChange: (v: string) => void;
  showPageNumber: boolean;
  children: React.ReactNode;
}

/** v2: 페이지마다 별도 카드 (구글 독스 톤). 본문은 한 ProseMirror doc 한 흐름. */
const CARD_HEIGHT_PX = 1056;
const PAGE_GAP_PX = 32;

function DocPage({
  zoom, pageMargin, onMarginChange,
  headerText, footerText, onHeaderChange, onFooterChange, showPageNumber,
  children,
}: DocPageProps) {
  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);
  const { totalPages } = usePageBreaks(contentEl, PAGE_CONTENT_HEIGHT_PX);
  const containerHeight = totalPages * CARD_HEIGHT_PX + (totalPages - 1) * PAGE_GAP_PX;

  return (
    <div
      className="mx-auto my-8 relative"
      style={{
        width: '816px',
        minHeight: `${containerHeight}px`,
        transform: zoom === 100 ? undefined : `scale(${zoom / 100})`,
        transformOrigin: 'top center',
      }}
    >
      {/* 카드 N개 — background + ruler + 카드별 헤더/푸터 + 페이지 번호 */}
      {Array.from({ length: totalPages }).map((_, i) => {
        const cardTop = i * (CARD_HEIGHT_PX + PAGE_GAP_PX);
        const isFirst = i === 0;
        const isLast = i === totalPages - 1;
        return (
          <div key={`page-${i}`}>
            {/* 카드 흰 배경 + shadow. 다크모드는 zinc-100 (살짝 어두운 종이 톤) */}
            <div
              className="absolute left-0 w-[816px] bg-white shadow-md rounded-sm dark:bg-zinc-100"
              style={{ top: `${cardTop}px`, height: `${CARD_HEIGHT_PX}px` }}
              aria-hidden="true"
            />
            {/* 첫 카드만 cm ruler */}
            {isFirst && (
              <div className="absolute left-0 w-[816px] z-20" style={{ top: '0px' }}>
                <PageRuler widthPx={816} margin={pageMargin} onMarginChange={onMarginChange} />
              </div>
            )}
            {/* 헤더 — 첫 카드는 편집, 나머지는 미러 */}
            {isFirst ? (
              <input
                type="text"
                value={headerText}
                onChange={(e) => onHeaderChange(e.target.value)}
                placeholder="머리글 (선택)"
                className="absolute z-20 text-xs text-slate-500 bg-transparent outline-none text-center placeholder-slate-300 focus:placeholder-slate-400"
                style={{ top: `${cardTop + 32}px`, left: `${pageMargin.left}px`, width: `${816 - pageMargin.left - pageMargin.right}px` }}
                aria-label="머리글"
              />
            ) : headerText ? (
              <div
                className="absolute z-20 text-[11px] text-slate-500 text-center truncate pointer-events-none"
                style={{ top: `${cardTop + 16}px`, left: `${pageMargin.left}px`, width: `${816 - pageMargin.left - pageMargin.right}px` }}
              >
                {headerText}
              </div>
            ) : null}
            {/* 푸터 — 마지막 카드는 편집, 나머지는 미러. 페이지 번호 모든 카드 */}
            <div
              className="absolute z-20 flex items-center text-xs text-slate-500"
              style={{ top: `${cardTop + CARD_HEIGHT_PX - 32}px`, left: `${pageMargin.left}px`, width: `${816 - pageMargin.left - pageMargin.right}px` }}
            >
              {isLast ? (
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => onFooterChange(e.target.value)}
                  placeholder="바닥글 (선택)"
                  className="flex-1 bg-transparent outline-none text-center placeholder-slate-300 focus:placeholder-slate-400"
                  aria-label="바닥글"
                />
              ) : (
                <span className="flex-1 text-center text-[11px] truncate">{footerText}</span>
              )}
              {showPageNumber && (
                <span className="absolute right-0 top-1 text-[10px]">{i + 1} / {totalPages}</span>
              )}
            </div>
          </div>
        );
      })}

      {/* 본문 wrap — absolute. 첫 카드의 top padding (96) 부터. 한 흐름.
          한계 (v2): 본문이 길어 페이지 경계에 걸치면 카드 갭·다른 카드의 헤더 영역 위로
          흐를 수 있음 — ProseMirror 본문 분할 X. v3 에서 자체 plugin 으로 해결. */}
      <div
        ref={setContentEl}
        className="absolute left-0 right-0 z-10"
        style={{
          top: '96px',
          paddingLeft: pageMargin.left,
          paddingRight: pageMargin.right,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 줌 컨트롤 — 50/75/100/125/150/200%
// ─────────────────────────────────────────────

const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200] as const;

function ZoomSelect({ zoom, onZoomChange }: { zoom: number; onZoomChange: (z: number) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="h-7 px-2 rounded hover:bg-muted text-xs flex items-center gap-1 min-w-[64px] border border-border"
        title="줌"
      >
        <span className="truncate text-left flex-1">{zoom}%</span>
        <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[88px]">
        {ZOOM_PRESETS.map((p) => (
          <DropdownMenuItem
            key={p}
            onSelect={() => onZoomChange(p)}
            className={zoom === p ? 'bg-muted' : ''}
          >
            {p}%
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─────────────────────────────────────────────
// 스타일 드롭다운 — 일반 텍스트 / 제목 1~3 / 인용 / 코드 블록
// (구글 독스 좌측 첫 컨트롤과 같은 역할)
// ─────────────────────────────────────────────

function StyleSelect({ editor }: { editor: Editor }) {
  const currentLabel = (() => {
    if (editor.isActive('heading', { level: 1 })) return '제목 1';
    if (editor.isActive('heading', { level: 2 })) return '제목 2';
    if (editor.isActive('heading', { level: 3 })) return '제목 3';
    if (editor.isActive('blockquote')) return '인용';
    if (editor.isActive('codeBlock')) return '코드 블록';
    return '일반 텍스트';
  })();

  const apply = (kind: 'p' | 'h1' | 'h2' | 'h3' | 'quote' | 'code') => {
    const c = editor.chain().focus();
    if (kind === 'p')        c.clearNodes().setParagraph().run();
    else if (kind === 'h1')  c.clearNodes().toggleHeading({ level: 1 }).run();
    else if (kind === 'h2')  c.clearNodes().toggleHeading({ level: 2 }).run();
    else if (kind === 'h3')  c.clearNodes().toggleHeading({ level: 3 }).run();
    else if (kind === 'quote') c.toggleBlockquote().run();
    else if (kind === 'code')  c.toggleCodeBlock().run();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="h-7 px-2 rounded hover:bg-muted text-xs flex items-center gap-1 min-w-[96px] border border-border"
        title="단락 스타일"
      >
        <span className="truncate text-left flex-1">{currentLabel}</span>
        <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[140px]">
        <DropdownMenuItem onSelect={() => apply('p')}>일반 텍스트</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => apply('h1')}>
          <span className="text-base font-medium">제목 1</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => apply('h2')}>
          <span className="text-sm font-medium">제목 2</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => apply('h3')}>제목 3</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => apply('quote')}>인용</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => apply('code')}>코드 블록</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─────────────────────────────────────────────
// 서식 복사 (Format Painter)
//  - 클릭: 현재 선택의 마크 캡처 + 활성화
//  - 다음 selection 변경 (non-empty) 시 자동 적용 + 해제
//  - Esc 또는 다시 클릭으로 취소
// ─────────────────────────────────────────────

interface CapturedMarks {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  textStyle: { fontFamily?: string; fontSize?: string; color?: string } | null;
  highlight: { color?: string } | null;
}

function FormatPainterBtn({ editor }: { editor: Editor }) {
  const [captured, setCaptured] = useState<CapturedMarks | null>(null);
  const firstUpdateRef = useRef(false);

  useEffect(() => {
    if (!captured) return;
    const onUpdate = () => {
      if (!firstUpdateRef.current) {
        firstUpdateRef.current = true;
        return;
      }
      const sel = editor.state.selection;
      if (sel.empty) return;
      const c = editor.chain().focus();
      // 인라인 mark 들
      if (captured.bold)      c.setMark('bold');      else c.unsetMark('bold');
      if (captured.italic)    c.setMark('italic');    else c.unsetMark('italic');
      if (captured.underline) c.setMark('underline'); else c.unsetMark('underline');
      if (captured.strike)    c.setMark('strike');    else c.unsetMark('strike');
      if (captured.code)      c.setMark('code');      else c.unsetMark('code');
      if (captured.textStyle) c.setMark('textStyle', captured.textStyle);
      else c.unsetMark('textStyle');
      if (captured.highlight?.color) c.setMark('highlight', { color: captured.highlight.color });
      else c.unsetMark('highlight');
      c.run();
      setCaptured(null);
    };
    editor.on('selectionUpdate', onUpdate);
    return () => { editor.off('selectionUpdate', onUpdate); };
  }, [captured, editor]);

  useEffect(() => {
    if (!captured) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCaptured(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [captured]);

  const handleClick = () => {
    if (captured) {
      setCaptured(null);
      return;
    }
    const sel = editor.state.selection;
    if (sel.empty) {
      toast({ title: '복사할 텍스트를 먼저 선택하세요' });
      return;
    }
    const ts = editor.getAttributes('textStyle') as { fontFamily?: string; fontSize?: string; color?: string };
    const hl = editor.getAttributes('highlight') as { color?: string };
    setCaptured({
      bold:      editor.isActive('bold'),
      italic:    editor.isActive('italic'),
      underline: editor.isActive('underline'),
      strike:    editor.isActive('strike'),
      code:      editor.isActive('code'),
      textStyle: (ts.fontFamily || ts.fontSize || ts.color) ? ts : null,
      highlight: hl.color ? hl : null,
    });
    firstUpdateRef.current = false;
  };

  return (
    <ToolBtn
      onClick={handleClick}
      active={!!captured}
      title={captured ? '서식 복사 활성 — 다음 선택에 적용 (Esc 취소)' : '서식 복사 (Format Painter)'}
    >
      <Paintbrush className="w-4 h-4" />
    </ToolBtn>
  );
}

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
// 슬래시 `/` 커맨드 메뉴 (빈 줄 `/` 입력 시 floating)
// ─────────────────────────────────────────────

interface SlashItem {
  label: string;
  emoji: string;
  keywords: string[];
  run: (editor: Editor) => void;
}

const SLASH_ITEMS: SlashItem[] = [
  {
    label: '제목 1', emoji: 'H1', keywords: ['제목1', 'heading1', 'h1', '제목'],
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: '제목 2', emoji: 'H2', keywords: ['제목2', 'heading2', 'h2'],
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: '제목 3', emoji: 'H3', keywords: ['제목3', 'heading3', 'h3'],
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: '글머리 기호 목록', emoji: '•', keywords: ['목록', 'list', 'bullet', '글머리'],
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    label: '번호 매기기', emoji: '1.', keywords: ['번호', 'ordered', 'number'],
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    label: '인용', emoji: '"', keywords: ['인용', 'quote', 'blockquote'],
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    label: '코드 블록', emoji: '⌐', keywords: ['코드', 'code'],
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    label: '구분선', emoji: '—', keywords: ['구분선', '구분', 'hr', 'divider'],
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    label: '표 (3×3)', emoji: '⊞', keywords: ['표', 'table'],
    run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    label: '이미지 (파일 선택)', emoji: '🖼', keywords: ['이미지', 'image', '사진'],
    run: (e) => pickImage(e),
  },
  {
    label: '✨ AI 이어쓰기', emoji: '✨', keywords: ['ai', '이어', 'continue', '쓰기'],
    run: async (e) => {
      const { from } = e.state.selection;
      const ctx = e.state.doc.textBetween(Math.max(0, from - 2000), from, '\n').trim();
      if (!ctx) {
        toast({ title: '먼저 글을 적어주세요', description: '이어쓸 맥락이 필요합니다.' });
        return;
      }
      try {
        const result = await aiContinue(ctx);
        if (result) e.chain().focus().insertContent('\n' + result).run();
        toast({ title: 'AI 이어쓰기 완료', description: `${result.length}자 추가` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast({ title: 'AI 실패', description: msg });
      }
    },
  },
];

function SlashMenu({ editor }: { editor: Editor }) {
  const { state } = editor;
  const { $from } = state.selection;
  const lineText = $from.parent.textContent;
  // '/' 뒤 검색어
  const query = lineText.slice(1).toLowerCase().trim();
  const filtered = query
    ? SLASH_ITEMS.filter((it) =>
        it.label.toLowerCase().includes(query)
        || it.keywords.some((k) => k.toLowerCase().includes(query)),
      )
    : SLASH_ITEMS;

  const handle = (item: SlashItem) => {
    // 현재 줄의 '/검색어' 제거
    const start = $from.start();
    const end = $from.end();
    editor.chain().focus().deleteRange({ from: start, to: end }).run();
    item.run(editor);
  };

  return (
    <div className="bg-popover border border-border rounded-md shadow-lg p-1 min-w-[220px] max-h-80 overflow-y-auto">
      {filtered.length === 0 ? (
        <div className="px-3 py-2 text-xs text-muted-foreground">결과 없음</div>
      ) : (
        filtered.map((item) => (
          <button
            key={item.label}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handle(item); }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm hover:bg-muted"
          >
            <span className="w-7 text-center text-xs font-mono text-muted-foreground">{item.emoji}</span>
            <span className="flex-1">{item.label}</span>
          </button>
        ))
      )}
      <div className="border-t border-border mt-1 pt-1 px-2 text-[10px] text-muted-foreground">
        클릭으로 적용 · 단어 더 입력하면 필터 · Esc 닫기
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ✨ AI 액션 드롭다운
// ─────────────────────────────────────────────

function AiActionsButton({ editor }: { editor: Editor }) {
  const [busy, setBusy] = useState<string | null>(null);

  const getSelectionText = (): string => {
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, '\n').trim();
  };

  const replaceSelection = (text: string) => {
    editor.chain().focus().insertContent(text).run();
  };

  const run = async (label: string, fn: () => Promise<string>) => {
    setBusy(label);
    try {
      const result = await fn();
      if (result) replaceSelection(result);
      toast({ title: `${label} 완료`, description: `${result.length}자 적용` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: `${label} 실패`, description: msg });
    } finally {
      setBusy(null);
    }
  };

  const onSummarize = () => {
    const sel = getSelectionText();
    if (!sel) {
      toast({ title: '먼저 텍스트를 선택하세요', description: '요약할 영역이 필요합니다.' });
      return;
    }
    void run('요약', () => aiSummarize(sel));
  };

  const onRewrite = (style: '명확' | '간결' | '정중') => {
    const sel = getSelectionText();
    if (!sel) {
      toast({ title: '먼저 텍스트를 선택하세요', description: '재작성할 영역이 필요합니다.' });
      return;
    }
    void run(`재작성 (${style})`, () => aiRewrite(sel, style));
  };

  const onTranslate = (lang: '영어' | '일본어' | '중국어 간체' | '한국어') => {
    const sel = getSelectionText();
    if (!sel) {
      toast({ title: '먼저 텍스트를 선택하세요', description: '번역할 영역이 필요합니다.' });
      return;
    }
    void run(`${lang} 번역`, () => aiTranslate(sel, lang));
  };

  const onChangeTone = (tone: '친근하게' | '전문적으로' | '간결하게' | '유머있게') => {
    const sel = getSelectionText();
    if (!sel) {
      toast({ title: '먼저 텍스트를 선택하세요', description: '톤 바꿀 영역이 필요합니다.' });
      return;
    }
    void run(`톤: ${tone}`, () => aiChangeTone(sel, tone));
  };

  const onContinue = async () => {
    // 커서 위치 기준 앞 1000자 컨텍스트
    const { from } = editor.state.selection;
    const ctx = editor.state.doc.textBetween(Math.max(0, from - 2000), from, '\n').trim();
    if (!ctx) {
      toast({ title: '먼저 글을 좀 적어주세요', description: '이어쓸 맥락이 필요합니다.' });
      return;
    }
    setBusy('이어쓰기');
    try {
      const result = await aiContinue(ctx);
      if (result) {
        editor.chain().focus().insertContent('\n' + result).run();
      }
      toast({ title: '이어쓰기 완료', description: `${result.length}자 추가` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: '이어쓰기 실패', description: msg });
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={!!busy}
          className={cn(
            'flex items-center gap-1 px-2 py-1.5 rounded transition-colors',
            busy ? 'opacity-60 cursor-not-allowed' : 'hover:bg-muted',
          )}
          title="✨ AI 액션"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-violet-500" />
          )}
          <span className="text-xs">{busy ?? 'AI'}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuItem onSelect={onSummarize}>🧠 요약 (선택영역)</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onRewrite('명확')}>✍️ 재작성 — 명확하게</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onRewrite('간결')}>✍️ 재작성 — 간결하게</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onRewrite('정중')}>✍️ 재작성 — 정중하게</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onTranslate('영어')}>🌐 번역 → 영어</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onTranslate('일본어')}>🌐 번역 → 일본어</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onTranslate('중국어 간체')}>🌐 번역 → 중국어</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onTranslate('한국어')}>🌐 번역 → 한국어</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onChangeTone('친근하게')}>🎭 톤 — 친근하게</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChangeTone('전문적으로')}>🎭 톤 — 전문적으로</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChangeTone('간결하게')}>🎭 톤 — 간결하게</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onChangeTone('유머있게')}>🎭 톤 — 유머있게</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onContinue}>⏭ 이어쓰기 (커서 위치)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─────────────────────────────────────────────
// 글꼴 크기·종류 select (도구바 inline)
// ─────────────────────────────────────────────

const FONT_SIZES = ['10', '12', '14', '16', '18', '20', '24', '28', '32', '40', '48'];

function FontSizeSelect({ editor }: { editor: Editor }) {
  const current = (editor.getAttributes('textStyle').fontSize as string | undefined) ?? '';
  const numeric = current ? current.replace('px', '') : '';
  return (
    <select
      value={numeric}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) {
          editor.chain().focus().setMark('textStyle', { fontSize: null }).run();
        } else {
          editor.chain().focus().setMark('textStyle', { fontSize: `${v}px` }).run();
        }
      }}
      className="text-xs px-1.5 py-1 rounded border border-border bg-background hover:bg-muted cursor-pointer min-w-[58px]"
      title="글꼴 크기"
      aria-label="글꼴 크기"
    >
      <option value="">크기</option>
      {FONT_SIZES.map((s) => (
        <option key={s} value={s}>{s}px</option>
      ))}
    </select>
  );
}

const FONT_FAMILIES: Array<{ label: string; value: string }> = [
  { label: '기본',  value: '' },
  { label: 'Sans',  value: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Mono',  value: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
  { label: '돋움',  value: '"Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", sans-serif' },
  { label: '바탕',  value: '"Apple Myungjo", "Batang", "바탕", serif' },
];

function FontFamilySelect({ editor }: { editor: Editor }) {
  const current = (editor.getAttributes('textStyle').fontFamily as string | undefined) ?? '';
  return (
    <select
      value={current}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) {
          editor.chain().focus().setMark('textStyle', { fontFamily: null }).run();
        } else {
          editor.chain().focus().setMark('textStyle', { fontFamily: v }).run();
        }
      }}
      className="text-xs px-1.5 py-1 rounded border border-border bg-background hover:bg-muted cursor-pointer min-w-[64px]"
      title="글꼴 종류"
      aria-label="글꼴 종류"
    >
      {FONT_FAMILIES.map((f) => (
        <option key={f.label} value={f.value}>{f.label}</option>
      ))}
    </select>
  );
}

// ─────────────────────────────────────────────
// 이미지 선택 → base64 → 본문 삽입
// (v1: 인라인 base64. 5MB 한계 가까우면 토스트 안내.
//  추후 IndexedDB blob ref 로 마이그레이션 예정.)
// ─────────────────────────────────────────────

function pickImage(editor: Editor): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: '이미지가 큽니다',
        description: '2MB 이하 권장 (localStorage 한계). 더 큰 이미지는 다음 단계의 IndexedDB 활성화 후 처리됩니다.',
      });
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result;
      if (typeof src === 'string') {
        editor.chain().focus().setImage({ src }).run();
      }
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// ─────────────────────────────────────────────
// 색 picker (도구바 inline)
// ─────────────────────────────────────────────

interface ColorPickBtnProps {
  icon: React.ReactNode;
  value: string;
  onChange: (color: string) => void;
  onClear: () => void;
  title?: string;
}

function ColorPickBtn({ icon, value, onChange, onClear, title }: ColorPickBtnProps) {
  return (
    <label
      className="relative flex items-center gap-0.5 px-1.5 py-1.5 rounded hover:bg-muted cursor-pointer"
      title={title}
      aria-label={title}
    >
      {icon}
      <span
        className="block w-3 h-3 rounded-sm border border-border"
        style={{ backgroundColor: value }}
        aria-hidden
      />
      <input
        type="color"
        value={toHex(value)}
        onChange={(e) => onChange(e.target.value)}
        onDoubleClick={onClear}
        className="absolute inset-0 opacity-0 cursor-pointer"
        aria-label={title}
      />
    </label>
  );
}

function toHex(color: string): string {
  if (!color) return '#000000';
  if (color.startsWith('#') && (color.length === 4 || color.length === 7)) return color;
  return '#000000';
}

interface ToolBtnProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}

function ToolBtn({ onClick, active, disabled, title, children }: ToolBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        'p-1.5 rounded transition-colors',
        disabled
          ? 'opacity-30 cursor-not-allowed'
          : 'hover:bg-muted',
        active && !disabled && 'bg-muted text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-border mx-1 shrink-0" />;
}

// ─────────────────────────────────────────────
// 저장 상태 뱃지
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// 자동 목차 dropdown — H1/H2/H3 추출 후 클릭 시 jump
// ─────────────────────────────────────────────

interface TocItem { level: number; text: string; pos: number }

function TocDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TocItem[]>([]);

  const refresh = useCallback(() => {
    const out: TocItem[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        const level = (node.attrs.level as number) ?? 1;
        const text = node.textContent.trim();
        if (text) out.push({ level, text, pos });
      }
    });
    setItems(out);
  }, [editor]);

  useEffect(() => {
    refresh();
    editor.on('update', refresh);
    return () => { editor.off('update', refresh); };
  }, [editor, refresh]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); refresh(); }}
        className={cn(
          'p-2 rounded text-sm flex items-center gap-1.5',
          open ? 'bg-muted' : 'hover:bg-muted',
        )}
        aria-pressed={open}
        aria-label={`목차 (헤딩 ${items.length}개)`}
        title={items.length === 0 ? '목차 (헤딩이 아직 없어요)' : `목차 (헤딩 ${items.length}개)`}
      >
        <ListTree className="w-4 h-4" />
        {items.length > 0 && (
          <span className="text-[10px] font-medium text-muted-foreground tabular-nums hidden sm:inline">
            {items.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 min-w-[220px] max-w-[360px] max-h-[60vh] overflow-y-auto rounded border border-border bg-popover shadow-md py-1">
          {items.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              헤딩이 없어요 — # 또는 ## 로 제목을 만들어 보세요.
            </div>
          ) : (
            <ul className="text-sm">
              {items.map((it, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain()
                        .focus()
                        .setTextSelection(it.pos + 1)
                        .scrollIntoView()
                        .run();
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-muted truncate"
                    style={{ paddingLeft: `${12 + (it.level - 1) * 12}px` }}
                    title={it.text}
                  >
                    <span className={cn(
                      it.level === 1 && 'font-semibold',
                      it.level === 2 && 'font-medium',
                      it.level >= 3 && 'text-muted-foreground',
                    )}>
                      {it.text}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 워드카운트 뱃지 — 글자/단어 수 (선택 영역이 있으면 그 안만)
// ─────────────────────────────────────────────

function WordCountBadge({ editor }: { editor: Editor }) {
  const [stats, setStats] = useState<{ chars: number; words: number; isSelection: boolean }>({
    chars: 0, words: 0, isSelection: false,
  });

  useEffect(() => {
    const compute = (): void => {
      const { from, to, empty } = editor.state.selection;
      const text = empty
        ? editor.getText({ blockSeparator: '\n' })
        : editor.state.doc.textBetween(from, to, '\n');
      const trimmed = text.trim();
      const chars = text.length;
      // 한글은 공백 단위가 어색하므로 한·영 혼용: 공백 토큰 + 한글 음절도 단어로 카운트
      // 단순 v1: 공백/줄바꿈으로 split
      const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
      setStats({ chars, words, isSelection: !empty });
    };
    compute();
    editor.on('update', compute);
    editor.on('selectionUpdate', compute);
    return () => {
      editor.off('update', compute);
      editor.off('selectionUpdate', compute);
    };
  }, [editor]);

  if (stats.chars === 0) return null;
  return (
    <span
      className="ml-3 text-xs text-muted-foreground tabular-nums"
      title={stats.isSelection ? '선택 영역 통계' : '전체 문서 통계'}
    >
      {stats.isSelection && <span className="text-amber-600 dark:text-amber-400 mr-1">선택</span>}
      {stats.chars.toLocaleString('ko-KR')}자 · {stats.words.toLocaleString('ko-KR')}단어
    </span>
  );
}

function SaveStateBadge({ state }: { state: SaveState }) {
  if (state === 'saving') {
    return (
      <span
        className="flex items-center gap-1 text-muted-foreground"
        title="변경 사항을 저장하는 중입니다 (자동 — 1초 디바운스)"
        aria-live="polite"
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        저장 중…
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span
        className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
        title="모든 변경 사항이 저장됨"
        aria-live="polite"
      >
        <CheckCircle2 className="w-3 h-3" />
        저장됨
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span
        className="flex items-center gap-1 text-destructive"
        title="저장 실패 — 변경 사항이 디스크에 반영되지 않았어요. 새로고침 전 백업하세요."
        aria-live="assertive"
      >
        <AlertCircle className="w-3 h-3" />
        저장 실패
      </span>
    );
  }
  return null;
}

// ─────────────────────────────────────────────
// 단축키 도움말 모달
// ─────────────────────────────────────────────

function KeyboardHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-base">키보드 단축키</DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          문서 에디터에서 쓸 수 있는 단축키.
        </DialogDescription>

        <div className="space-y-4 text-sm">
          <HelpSection title="서식">
            <HelpRow keys={['Ctrl', 'B']} label="굵게" />
            <HelpRow keys={['Ctrl', 'I']} label="기울임" />
            <HelpRow keys={['Ctrl', 'U']} label="밑줄" />
            <HelpRow keys={['Ctrl', 'Shift', 'X']} label="취소선" />
            <HelpRow keys={['Ctrl', 'E']} label="인라인 코드" />
            <HelpRow keys={['🖌']} label="서식 복사 — 선택 후 도구바 🖌 → 다음 선택에 적용" />
          </HelpSection>

          <HelpSection title="구조 (마크다운 입력 가능)">
            <HelpRow keys={['#', 'space']} label="제목 1" />
            <HelpRow keys={['##', 'space']} label="제목 2" />
            <HelpRow keys={['###', 'space']} label="제목 3" />
            <HelpRow keys={['-', 'space']} label="글머리 기호" />
            <HelpRow keys={['1.', 'space']} label="번호 매기기" />
            <HelpRow keys={['>', 'space']} label="인용" />
            <HelpRow keys={['```']} label="코드 블록" />
            <HelpRow keys={['---']} label="구분선" />
          </HelpSection>

          <HelpSection title="정렬">
            <HelpRow keys={['Ctrl', 'Shift', 'L']} label="왼쪽" />
            <HelpRow keys={['Ctrl', 'Shift', 'E']} label="가운데" />
            <HelpRow keys={['Ctrl', 'Shift', 'R']} label="오른쪽" />
            <HelpRow keys={['Ctrl', 'Shift', 'J']} label="양쪽 (justify)" />
          </HelpSection>

          <HelpSection title="동작">
            <HelpRow keys={['Ctrl', 'Z']} label="실행 취소" />
            <HelpRow keys={['Ctrl', 'Shift', 'Z']} label="다시 실행" />
            <HelpRow keys={['?']} label="이 도움말" />
            <HelpRow keys={['Esc']} label="닫기 / 도움말 닫기" />
          </HelpSection>

          <HelpSection title="색·링크">
            <HelpRow keys={['글자색']} label="도구바 색 picker 클릭 → 색 선택. 더블클릭으로 해제." />
            <HelpRow keys={['형광펜']} label="도구바 형광펜 → 색 선택. 더블클릭으로 해제." />
            <HelpRow keys={['🔗']} label="도구바 링크 → URL 입력. 빈 값 입력 시 제거." />
          </HelpSection>

          <HelpSection title="표·이미지">
            <HelpRow keys={['표']} label="도구바 표 버튼 → 3×3 삽입. 표 안에선 +행/+열/−행/−열/표✕ 노출." />
            <HelpRow keys={['이미지']} label="도구바 이미지+ → 파일 선택 → base64 인라인 (2MB 이하 권장)." />
          </HelpSection>

          <HelpSection title="슬래시 커맨드 ✨">
            <HelpRow keys={['/']} label="빈 줄에서 / 입력 → 메뉴 (헤딩·목록·표·AI 등)" />
            <HelpRow keys={['/제목']} label="/ 뒤에 단어 입력으로 필터" />
            <HelpRow keys={['클릭']} label="메뉴 항목 클릭 → 적용 (현재 줄의 / 자동 제거)" />
          </HelpSection>

          <HelpSection title="글꼴·첨자·들여쓰기">
            <HelpRow keys={['크기']} label="도구바 select → 10~48px" />
            <HelpRow keys={['종류']} label="도구바 select → 기본/Sans/Serif/Mono/돋움/바탕" />
            <HelpRow keys={['Ctrl', '.']} label="위 첨자 (x²)" />
            <HelpRow keys={['Ctrl', ',']} label="아래 첨자 (x₂)" />
            <HelpRow keys={['Tab']} label="리스트 들여쓰기" />
            <HelpRow keys={['Shift', 'Tab']} label="리스트 내어쓰기" />
          </HelpSection>

          <HelpSection title="페이지·문서">
            <HelpRow keys={['스타일']} label="도구바 좌측 드롭다운 → 일반/제목 1~3/인용/코드 블록" />
            <HelpRow keys={['줌']} label="도구바 줌 select → 50~200%" />
            <HelpRow keys={['머리글']} label="첫 페이지 카드 상단 input — 모든 페이지에 자동 반복" />
            <HelpRow keys={['바닥글']} label="마지막 페이지 카드 하단 input — 모든 페이지 자동 반복" />
            <HelpRow keys={['페이지 ▭']} label="본문이 1056px 넘으면 자동으로 다음 카드 시작" />
            <HelpRow keys={['마진']} label="cm 눈금자 좌우 ▾ 핸들 드래그로 본문 마진 조절" />
            <HelpRow keys={['각주 ✱']} label="도구바 ✱ → 위첨자 [N] + 문서 끝 모음. 클릭으로 편집" />
          </HelpSection>
        </div>

        <div className="pt-3 text-xs text-muted-foreground border-t border-border">
          Mac: Ctrl → ⌘
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-medium text-muted-foreground mb-1.5">{title}</h3>
      <div className="space-y-1">
        {children}
      </div>
    </section>
  );
}

function HelpRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={`${k}-${i}`}
            className="text-[10px] border border-border rounded px-1.5 py-0.5 bg-muted/40 font-mono"
          >
            {k}
          </kbd>
        ))}
      </span>
    </div>
  );
}

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
