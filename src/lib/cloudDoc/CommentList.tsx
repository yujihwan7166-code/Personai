import { useCallback, useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { MessageSquareText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CommentEntry {
  id: string;
  text: string;
  author: string;
  createdAt?: string;
  from: number;
  to: number;
}

export function CommentList({ editor }: { editor: Editor | null }) {
  const [comments, setComments] = useState<CommentEntry[]>([]);

  const collect = useCallback(() => {
    if (!editor) {
      setComments([]);
      return;
    }

    const seen = new Set<string>();
    const entries: CommentEntry[] = [];
    const markType = editor.schema.marks.comment;
    if (!markType) {
      setComments([]);
      return;
    }

    editor.state.doc.descendants((node, pos) => {
      if (!node.isText) return;
      const mark = node.marks.find((item) => item.type === markType);
      if (!mark) return;
      const id = String(mark.attrs.id ?? '');
      if (!id || seen.has(id)) return;
      seen.add(id);
      entries.push({
        id,
        text: String(mark.attrs.text ?? ''),
        author: String(mark.attrs.author ?? 'Me'),
        createdAt: typeof mark.attrs.createdAt === 'string' ? mark.attrs.createdAt : undefined,
        from: pos,
        to: pos + node.nodeSize,
      });
    });

    setComments(entries);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    collect();
    editor.on('update', collect);
    editor.on('selectionUpdate', collect);
    return () => {
      editor.off('update', collect);
      editor.off('selectionUpdate', collect);
    };
  }, [editor, collect]);

  if (!editor || comments.length === 0) return null;

  return (
    <aside className="hidden xl:block sticky top-4 w-64 shrink-0 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground px-1">
        <MessageSquareText className="w-3.5 h-3.5" />
        <span>댓글 {comments.length}</span>
      </div>
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="border border-border bg-background rounded-md p-3 shadow-sm"
        >
          <div className="flex items-start gap-2">
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => editor.chain().focus().setTextSelection({ from: comment.from, to: comment.to }).run()}
            >
              <div className="text-xs font-medium truncate">{comment.author}</div>
              {comment.createdAt && (
                <div className="text-[11px] text-muted-foreground">
                  {formatDate(comment.createdAt)}
                </div>
              )}
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-1"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                editor.chain().focus().removeComment(comment.id).run();
              }}
              title="댓글 삭제"
              aria-label="댓글 삭제"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <button
            type="button"
            className="mt-2 block w-full text-left text-sm leading-5 whitespace-pre-wrap"
            onClick={() => editor.chain().focus().setTextSelection({ from: comment.from, to: comment.to }).run()}
          >
            {comment.text || '(빈 댓글)'}
          </button>
        </div>
      ))}
    </aside>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
