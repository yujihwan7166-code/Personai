/** /cloud/doc/:id — 문서 에디터 (TipTap 기반).
 *  4단계-α: 빈 문서 시작 → 본문 입력 → 자동저장 → 자동 제목.
 *  4단계-β: 도구바 + Underline + 단축키 도움말.
 *  4단계-γ (Storage 후): .docx import/export.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import {
  X, MoreHorizontal, Loader2, CheckCircle2, AlertCircle, ArrowLeft,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code2, Minus,
  Undo2, Redo2, Keyboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchNode, updateFileBody } from '@/lib/cloudClient';
import type { CloudNode } from '@/types/cloud';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DELAY_MS = 1000;

export default function CloudDocEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [node, setNode] = useState<CloudNode | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [helpOpen, setHelpOpen] = useState(false);

  const pendingRef = useRef<{ name?: string; meta?: Record<string, unknown> }>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialBody = useMemo(() => {
    if (!node?.meta) return null;
    const body = (node.meta as Record<string, unknown>).body;
    return body ?? null;
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
      Placeholder.configure({
        placeholder: ({ node: pmNode }) => {
          if (pmNode.type.name === 'heading') return '제목을 입력하세요';
          return '내용을 입력하세요 — # 헤딩, - 목록, > 인용, ``` 코드도 가능';
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose-base lg:prose-lg max-w-none',
          'focus:outline-none min-h-[60vh]',
          'prose-headings:font-semibold prose-headings:tracking-tight',
          'dark:prose-invert',
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

  // 초기 본문 주입
  useEffect(() => {
    if (!editor || !node) return;
    if (initialBody) {
      try {
        const content = typeof initialBody === 'string' ? JSON.parse(initialBody) : initialBody;
        editor.commands.setContent(content as object, { emitUpdate: false });
      } catch {
        editor.commands.setContent('', { emitUpdate: false });
      }
    }
  }, [editor, node, initialBody]);

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
            <button
              type="button"
              onClick={() => toast({ title: '곧 활성화돼요', description: '다운로드·공유는 다음 단계입니다.' })}
              className="p-2 rounded hover:bg-muted"
              aria-label="더보기"
              title="더보기"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
        {editor && <DocToolbar editor={editor} />}
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <EditorContent editor={editor} />
        </div>
      </main>

      <KeyboardHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

// ─────────────────────────────────────────────
// 도구바
// ─────────────────────────────────────────────

function DocToolbar({ editor }: { editor: Editor }) {
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
      <ToolBtn
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')}
        title="인라인 코드 (Ctrl+E)"
      >
        <Code className="w-4 h-4" />
      </ToolBtn>
      <Sep />
      <ToolBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        title="제목 1 (# )"
      >
        <Heading1 className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="제목 2 (## )"
      >
        <Heading2 className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="제목 3 (### )"
      >
        <Heading3 className="w-4 h-4" />
      </ToolBtn>
      <Sep />
      <ToolBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="글머리 기호 목록 (- )"
      >
        <List className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="번호 매기기 (1. )"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        title="인용 (> )"
      >
        <Quote className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive('codeBlock')}
        title="코드 블록 (``` )"
      >
        <Code2 className="w-4 h-4" />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="구분선 (---)"
      >
        <Minus className="w-4 h-4" />
      </ToolBtn>
    </div>
  );
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

function SaveStateBadge({ state }: { state: SaveState }) {
  if (state === 'saving') {
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        저장 중…
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <CheckCircle2 className="w-3 h-3" />
        저장됨
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="flex items-center gap-1 text-destructive">
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

          <HelpSection title="동작">
            <HelpRow keys={['Ctrl', 'Z']} label="실행 취소" />
            <HelpRow keys={['Ctrl', 'Shift', 'Z']} label="다시 실행" />
            <HelpRow keys={['?']} label="이 도움말" />
            <HelpRow keys={['Esc']} label="닫기 / 도움말 닫기" />
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
