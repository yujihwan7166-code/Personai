/** AI 결과 모달 — sheet AI 액션 (요약/제안/설명) 결과 표시 + 복사. */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, FileText, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface AiResultModalProps {
  result: string | null;
  onClose: () => void;
}

export function AiResultModal({ result, onClose }: AiResultModalProps) {
  /** 렌더 모드 — 'markdown' (heading/list/표 등 스타일 적용) / 'plain' (whitespace-pre-wrap). */
  const [mode, setMode] = useState<'markdown' | 'plain'>('markdown');

  return (
    <Dialog open={!!result} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          AI 결과
          <div className="ml-auto flex items-center gap-0.5 border border-border rounded text-xs">
            <button
              type="button"
              onClick={() => setMode('markdown')}
              className={cn(
                'px-1.5 py-0.5 rounded-l flex items-center gap-1',
                mode === 'markdown' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50',
              )}
              title="마크다운 스타일 (heading / list / 표)"
            >
              <FileText className="w-3 h-3" /> 스타일
            </button>
            <button
              type="button"
              onClick={() => setMode('plain')}
              className={cn(
                'px-1.5 py-0.5 rounded-r flex items-center gap-1',
                mode === 'plain' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50',
              )}
              title="원본 텍스트 — 셀에 그대로 복붙 가능"
            >
              <Type className="w-3 h-3" /> 원본
            </button>
          </div>
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          데이터 분석 결과입니다. 셀 자동 반영은 안 됩니다 (수동 복붙).
        </DialogDescription>
        <div className="max-h-[60vh] overflow-y-auto text-sm border border-border rounded p-3 bg-muted/30">
          {mode === 'plain' ? (
            <pre className="whitespace-pre-wrap font-sans text-sm">{result}</pre>
          ) : (
            <div className="markdown-msg [&>*+*]:mt-2 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h3]:font-semibold [&_h3]:mt-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-foreground/10 [&_code]:text-[0.85em] [&_code]:font-mono [&_pre]:p-2 [&_pre]:rounded [&_pre]:bg-foreground/10 [&_pre]:overflow-x-auto [&_pre>code]:bg-transparent [&_pre>code]:p-0 [&_strong]:font-semibold [&_em]:italic [&_a]:underline [&_a]:text-violet-600 [&_blockquote]:border-l-2 [&_blockquote]:border-foreground/30 [&_blockquote]:pl-2 [&_blockquote]:text-muted-foreground [&_table]:w-full [&_table]:border [&_table]:border-border [&_table]:border-collapse [&_th]:bg-muted [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1">
              <ReactMarkdown>{result ?? ''}</ReactMarkdown>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              if (result) void navigator.clipboard.writeText(result);
              toast({ title: '복사됨' });
            }}
            className="px-3 py-1.5 rounded border border-border hover:bg-muted text-sm"
          >
            복사
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-foreground text-background hover:bg-foreground/90 text-sm"
          >
            닫기
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
