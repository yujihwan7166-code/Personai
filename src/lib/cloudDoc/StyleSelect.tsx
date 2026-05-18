/** 문서 도구바 좌측 — 단락 스타일 드롭다운 (구글 독스 "일반 텍스트" 등). */

import { ChevronDown } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function StyleSelect({ editor }: { editor: Editor }) {
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
