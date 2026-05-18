/**
 * 시트 셀에 링크 삽입 모달.
 *
 * URL + 표시 텍스트(라벨) 입력 → 호출자가 `=HYPERLINK(url, label)` 식을 셀에 씀.
 * 보안: javascript:/vbscript:/data:text/html 스킴은 입력해도 호출자(formula 단계)
 *      가 차단. 모달은 사전 경고만.
 */

import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface InsertLinkDialogProps {
  open: boolean;
  onClose: () => void;
  /** 사용자 입력 후 콜백. (url, label) — label 빈 문자열이면 호출자가 url 로 대체. */
  onSubmit: (url: string, label: string) => void;
  /** 모달 열 때 초기 URL (선택). */
  initialUrl?: string;
  /** 모달 열 때 초기 라벨 (선택). */
  initialLabel?: string;
}

const UNSAFE_PATTERN = /^\s*(javascript|vbscript|data:text\/html)/i;

export function InsertLinkDialog({
  open, onClose, onSubmit, initialUrl = '', initialLabel = '',
}: InsertLinkDialogProps) {
  const [url, setUrl] = useState(initialUrl);
  const [label, setLabel] = useState(initialLabel);
  const [warn, setWarn] = useState<string | null>(null);

  // 모달 열 때마다 초기값 동기화 + 경고 초기화.
  useEffect(() => {
    if (open) {
      setUrl(initialUrl);
      setLabel(initialLabel);
      setWarn(null);
    }
  }, [open, initialUrl, initialLabel]);

  const handleSubmit = () => {
    const u = url.trim();
    if (!u) {
      setWarn('URL 을 입력하세요.');
      return;
    }
    if (UNSAFE_PATTERN.test(u)) {
      setWarn('안전하지 않은 URL 스킴은 사용할 수 없어요 (javascript:/vbscript:/data:).');
      return;
    }
    onSubmit(u, label.trim());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>링크 삽입</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">URL</label>
            <Input
              autoFocus
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setWarn(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">표시 텍스트 (선택)</label>
            <Input
              type="text"
              placeholder={url || '비우면 URL 그대로 표시'}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            />
          </div>
          {warn && (
            <p className="text-xs text-destructive" role="alert">{warn}</p>
          )}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button onClick={handleSubmit}>삽입</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
