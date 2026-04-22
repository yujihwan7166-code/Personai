// window.confirm 대체 — shadcn AlertDialog 기반 Promise 헬퍼.
// 사용: const ok = await confirmDialog({ title, description, confirmLabel, tone: 'danger' });

import { createRoot, type Root } from 'react-dom/client';
import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

function ConfirmShell({ opts, onDone }: { opts: ConfirmOptions; onDone: (ok: boolean) => void }) {
  const [open, setOpen] = useState(true);
  useEffect(() => { if (!open) onDone(false); }, [open, onDone]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{opts.title}</AlertDialogTitle>
          {opts.description && (
            <AlertDialogDescription className="whitespace-pre-line">
              {opts.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onDone(false)}>
            {opts.cancelLabel ?? '취소'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onDone(true)}
            className={
              opts.tone === 'danger'
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-600'
                : undefined
            }
          >
            {opts.confirmLabel ?? '확인'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    let root: Root | null = createRoot(host);

    const done = (ok: boolean) => {
      resolve(ok);
      // 한 틱 뒤 정리 (애니메이션 끝난 뒤)
      setTimeout(() => {
        try { root?.unmount(); } catch { /* noop */ }
        root = null;
        host.remove();
      }, 200);
    };

    root.render(<ConfirmShell opts={opts} onDone={done} />);
  });
}
