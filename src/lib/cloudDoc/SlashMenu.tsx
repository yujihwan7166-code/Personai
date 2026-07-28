/**
 * 슬래시 `/` 커맨드 메뉴 — 빈 줄에서 `/` 입력 시 floating.
 *  - SLASH_ITEMS: 헤딩·목록·인용·표·이미지·각주·AI 등 액션
 *  - 필터: `/` 뒤 단어로 label/keywords 부분 일치
 */

import type { Editor } from '@tiptap/react';
import { toast } from '@/hooks/use-toast';
import { aiContinue } from '@/lib/ai/quick';
import { pickImage } from './pickImage';

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
    label: '제목 4', emoji: 'H4', keywords: ['제목4', 'heading4', 'h4'],
    run: (e) => e.chain().focus().toggleHeading({ level: 4 }).run(),
  },
  {
    label: '제목 5', emoji: 'H5', keywords: ['제목5', 'heading5', 'h5'],
    run: (e) => e.chain().focus().toggleHeading({ level: 5 }).run(),
  },
  {
    label: '제목 6', emoji: 'H6', keywords: ['제목6', 'heading6', 'h6'],
    run: (e) => e.chain().focus().toggleHeading({ level: 6 }).run(),
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
    label: '페이지 나눔', emoji: 'Pg', keywords: ['페이지', '나눔', 'page', 'break'],
    run: (e) => e.chain().focus().insertPageBreak().run(),
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
    label: '각주', emoji: '✱', keywords: ['각주', 'footnote', 'note'],
    run: (e) => {
      const text = window.prompt('각주 내용:', '');
      if (text == null) return;
      e.chain().focus().addFootnote(text.trim() || '(빈 각주)').run();
    },
  },
  {
    label: '오늘 날짜', emoji: '📅', keywords: ['날짜', 'date', '오늘', 'today'],
    run: (e) => {
      const d = new Date();
      const text = d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
      e.chain().focus().insertContent(text).run();
    },
  },
  {
    label: '현재 시각', emoji: '🕐', keywords: ['시각', 'time', '시간', 'now'],
    run: (e) => {
      const d = new Date();
      const text = d.toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      e.chain().focus().insertContent(text).run();
    },
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

export function SlashMenu({ editor }: { editor: Editor }) {
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
