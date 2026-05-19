/** 셀 코멘트 모달 — 메모 추가/편집/삭제. */

import { useEffect, useState } from 'react';
import { MessageSquare, Trash2 as TrashIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface CommentModalProps {
  open: boolean;
  onClose: () => void;
  cellRefStr: string;
  initialText: string;
  onSave: (text: string) => void;
}

export function CommentModal({ open, onClose, cellRefStr, initialText, onSave }: CommentModalProps) {
  const [text, setText] = useState(initialText);
  useEffect(() => { if (open) setText(initialText); }, [open, initialText]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-base flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          {cellRefStr} 셀 코멘트
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          이 셀에 메모를 남길 수 있어요. 셀 우상단에 빨간 삼각형이 표시되고,
          마우스 hover 시 내용이 보입니다.
        </DialogDescription>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl/Cmd+Enter = 저장, Esc = 닫기 (저장 없이)
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              onSave(text);
              onClose();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            }
          }}
          rows={5}
          placeholder="이 셀에 대한 메모…  (Ctrl+Enter = 저장)"
          className="w-full px-2 py-1.5 rounded border border-border bg-background outline-none focus:border-foreground/40 text-sm"
          autoFocus
        />
        <div className="text-[10px] text-muted-foreground -mt-1 ml-1">
          {text.length}자 · Ctrl+Enter 로 저장, Esc 로 닫기
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-border">
          {initialText && (
            <button
              type="button"
              onClick={() => {
                onSave('');
                onClose();
              }}
              className="px-3 py-1.5 rounded text-destructive hover:bg-destructive/10 text-sm flex items-center gap-1"
            >
              <TrashIcon className="w-3.5 h-3.5" /> 삭제
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-border hover:bg-muted text-sm"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(text);
                onClose();
              }}
              className="px-3 py-1.5 rounded bg-foreground text-background hover:bg-foreground/90 text-sm"
            >
              저장
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
