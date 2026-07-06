/**
 * 노트 서식 툴바 — Plate 검증 API 기반 (재설계 1b).
 *
 * 마크(굵게·기울임·밑줄·취소선·코드)는 Plate 공식 훅(useMarkToolbarButton),
 * 블록(H1·H2·H3·인용)은 editor.tf.toggleBlock + api.block 활성 판정.
 * 스타일은 앱 토큰. Plate 프로바이더(<Plate>) 안에서 렌더돼야 한다.
 */
import type { ReactNode } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Code,
  Heading1, Heading2, Heading3, Quote,
} from 'lucide-react';
import {
  useEditorRef,
  useEditorSelector,
  useMarkToolbarButton,
  useMarkToolbarButtonState,
} from 'platejs/react';
import { cn } from '@/lib/utils';

function ToolBtn({
  pressed,
  onClick,
  onMouseDown,
  title,
  children,
}: {
  pressed?: boolean;
  onClick?: () => void;
  onMouseDown?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      title={title}
      aria-label={title}
      onClick={onClick}
      onMouseDown={onMouseDown}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
        pressed ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function MarkButton({ nodeType, title, children }: { nodeType: string; title: string; children: ReactNode }) {
  const state = useMarkToolbarButtonState({ nodeType });
  const { props } = useMarkToolbarButton(state);
  return (
    <ToolBtn pressed={props.pressed} onClick={props.onClick} onMouseDown={props.onMouseDown} title={title}>
      {children}
    </ToolBtn>
  );
}

function BlockButton({ type, title, children }: { type: string; title: string; children: ReactNode }) {
  const editor = useEditorRef();
  const active = useEditorSelector((e) => {
    try {
      const entry = e.api.block();
      return !!entry && (entry[0] as { type?: string }).type === type;
    } catch {
      return false;
    }
  }, [type]);
  return (
    <ToolBtn
      pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => editor.tf.toggleBlock(type)}
      title={title}
    >
      {children}
    </ToolBtn>
  );
}

function Divider() {
  return <span aria-hidden className="mx-0.5 h-5 w-px bg-[hsl(var(--hairline))]" />;
}

export function NoteToolbar() {
  return (
    <div className="sticky top-0 z-10 -mx-1 mb-3 flex flex-wrap items-center gap-0.5 border-b border-[hsl(var(--hairline))] bg-background/95 px-1 py-1.5 backdrop-blur">
      <BlockButton type="h1" title="제목 1"><Heading1 className="h-4 w-4" /></BlockButton>
      <BlockButton type="h2" title="제목 2"><Heading2 className="h-4 w-4" /></BlockButton>
      <BlockButton type="h3" title="제목 3"><Heading3 className="h-4 w-4" /></BlockButton>
      <BlockButton type="blockquote" title="인용"><Quote className="h-4 w-4" /></BlockButton>
      <Divider />
      <MarkButton nodeType="bold" title="굵게 (Ctrl+B)"><Bold className="h-4 w-4" /></MarkButton>
      <MarkButton nodeType="italic" title="기울임 (Ctrl+I)"><Italic className="h-4 w-4" /></MarkButton>
      <MarkButton nodeType="underline" title="밑줄 (Ctrl+U)"><Underline className="h-4 w-4" /></MarkButton>
      <MarkButton nodeType="strikethrough" title="취소선"><Strikethrough className="h-4 w-4" /></MarkButton>
      <MarkButton nodeType="code" title="인라인 코드"><Code className="h-4 w-4" /></MarkButton>
    </div>
  );
}
