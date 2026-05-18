/** AI 결과 모달 — sheet AI 액션 (요약/제안/설명) 결과 표시 + 복사. */

import { Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface AiResultModalProps {
  result: string | null;
  onClose: () => void;
}

export function AiResultModal({ result, onClose }: AiResultModalProps) {
  return (
    <Dialog open={!!result} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          AI 결과
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          데이터 분석 결과입니다. 셀 자동 반영은 안 됩니다 (수동 복붙).
        </DialogDescription>
        <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm border border-border rounded p-3 bg-muted/30">
          {result}
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
