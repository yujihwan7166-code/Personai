/** /cloud/doc/:id — 문서 에디터 (TipTap 기반).
 *  4단계-α: 빈 문서 시작 → 본문 입력 → 자동저장 (meta.body = ProseMirror JSON) → 자동 제목 (본문 첫 줄).
 *  도구바·마크다운 단축어·.docx import/export 는 4단계-β/γ.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { X, MoreHorizontal, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { fetchNode, updateFileBody } from '@/lib/cloudClient';
import type { CloudNode } from '@/types/cloud';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DELAY_MS = 1000;

export default function CloudDocEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [node, setNode] = useState<CloudNode | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  // pending payload — 디바운스 동안 누적
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
      Placeholder.configure({
        placeholder: ({ node: pmNode }) => {
          if (pmNode.type.name === 'heading') return '제목을 입력하세요';
          return '내용을 입력하세요...';
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
      // 본문 첫 텍스트로 파일명 자동 갱신
      const firstLine = extractFirstText(json) || '제목 없음';
      const meta: Record<string, unknown> = { ...(node?.meta ?? {}), body: json };
      const patch: { name?: string; meta?: Record<string, unknown> } = { meta };
      if (node && node.name !== firstLine) {
        patch.name = firstLine;
        // 로컬 상태도 즉시 반영 (헤더 표시용)
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
        // initialBody 가 JSON object 또는 string 일 수 있음
        const content = typeof initialBody === 'string' ? JSON.parse(initialBody) : initialBody;
        editor.commands.setContent(content as object, { emitUpdate: false });
      } catch {
        editor.commands.setContent('', { emitUpdate: false });
      }
    }
    // initialBody 없으면 빈 상태 유지
  }, [editor, node, initialBody]);

  const close = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    void flushSave();
    navigate('/cloud');
  }, [flushSave, navigate]);

  // 로딩·에러 화면
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
      <header className="border-b border-border bg-background sticky top-0 z-10">
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
              onClick={() => toast({ title: '곧 활성화돼요', description: '다운로드·공유는 다음 단계입니다.' })}
              className="p-2 rounded hover:bg-muted"
              aria-label="더보기"
              title="더보기"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <EditorContent editor={editor} />
        </div>
      </main>
    </div>
  );
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
