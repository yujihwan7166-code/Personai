/** 문서 헤더 우측 ✨ AI 액션 드롭다운 (요약·재작성·번역·톤·이어쓰기). */

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { aiSummarize, aiRewrite, aiTranslate, aiChangeTone, aiContinue } from '@/lib/cloudDoc/ai';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function AiActionsButton({ editor }: { editor: Editor }) {
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
