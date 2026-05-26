import { createRoot, type Root } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface TextInputOptions {
  title: string;
  description?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  multiline?: boolean;
  required?: boolean;
}

function TextInputShell({
  opts,
  onDone,
}: {
  opts: TextInputOptions;
  onDone: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState(opts.defaultValue ?? '');
  const doneRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const finish = (next: string | null) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(next);
    setOpen(false);
  };

  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!open) finish(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    const trimmed = value.trim();
    if (opts.required && !trimmed) return;
    finish(trimmed || value);
  };

  const fieldClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-950';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm gap-4 p-5">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-[15px]">{opts.title}</DialogTitle>
          {opts.description && (
            <DialogDescription className="text-[12px] leading-relaxed">
              {opts.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <label className="space-y-1.5">
          {opts.label && (
            <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {opts.label}
            </span>
          )}
          {opts.multiline ? (
            <textarea
              ref={(node) => { inputRef.current = node; }}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
              }}
              placeholder={opts.placeholder}
              rows={6}
              className={`${fieldClass} resize-none leading-relaxed`}
            />
          ) : (
            <input
              ref={(node) => { inputRef.current = node; }}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={opts.placeholder}
              className={fieldClass}
            />
          )}
        </label>

        <DialogFooter className="gap-2 sm:space-x-0">
          <button
            type="button"
            onClick={() => finish(null)}
            className="rounded-lg px-3 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {opts.cancelLabel ?? '취소'}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={opts.required && !value.trim()}
            className="rounded-lg bg-slate-900 px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
          >
            {opts.confirmLabel ?? '확인'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function textInputDialog(opts: TextInputOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    let root: Root | null = createRoot(host);

    const done = (value: string | null) => {
      resolve(value);
      window.setTimeout(() => {
        try { root?.unmount(); } catch { /* noop */ }
        root = null;
        host.remove();
      }, 200);
    };

    root.render(<TextInputShell opts={opts} onDone={done} />);
  });
}
