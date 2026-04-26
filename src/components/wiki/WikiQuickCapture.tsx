import { useEffect, useRef, useState } from 'react';
import { Inbox, X, Send, Link2 } from 'lucide-react';
import { newWikiId, type WikiPage } from '@/types/wiki';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

/**
 * 빠른 캡처 모달 — Ctrl/Cmd+Shift+; 로 어디서든 호출.
 *
 * 의도: 처음부터 잘 쓰기 강박 제거. 한 줄·URL·이미지 던져넣고 닫음.
 * 결과물 = #inbox 태그가 붙은 draft 페이지. 분류는 나중.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (page: WikiPage) => Promise<void> | void;
}

const URL_RE = /(https?:\/\/[^\s)]+)/i;

function deriveTitle(text: string, urls: string[]): string {
  const firstLine = text.split('\n').find((l) => l.trim().length > 0)?.trim() ?? '';
  if (firstLine && firstLine.length <= 60) return firstLine;
  if (firstLine) return firstLine.slice(0, 50) + '…';
  if (urls.length > 0) {
    try {
      const u = new URL(urls[0]);
      return u.hostname.replace(/^www\./, '') + (u.pathname && u.pathname !== '/' ? u.pathname : '');
    } catch {
      return urls[0].slice(0, 60);
    }
  }
  const d = new Date();
  return `Inbox ${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function WikiQuickCapture({ open, onClose, onCreate }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText('');
      setBusy(false);
      const t = window.setTimeout(() => taRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const urls: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(URL_RE.source, 'gi');
  while ((m = re.exec(text)) !== null) urls.push(m[1]);

  async function save(): Promise<void> {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    const now = Date.now();
    const title = deriveTitle(text, urls);
    const page: WikiPage = {
      id: newWikiId(),
      title,
      aliases: [],
      type: 'concept',
      status: 'draft',
      tags: ['inbox'],
      body: text,
      refersTo: [],
      cites: [],
      inherits: [],
      similarTo: [],
      parentMocs: [],
      createdAt: now,
      updatedAt: now,
    };
    try {
      await onCreate(page);
      notify.success('Inbox 에 저장됐어요', { duration: 1800 });
      onClose();
    } catch {
      notify.error('저장에 실패했어요');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 wiki-z-modal-backdrop bg-black/40 backdrop-blur-sm flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-label="빠른 캡처"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-[hsl(var(--hairline))] bg-popover shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-4 h-11 flex items-center gap-2 border-b border-[hsl(var(--hairline))]">
          <Inbox className="h-4 w-4 text-primary" />
          <h2 className="flex-1 text-[13px] font-bold">빠른 캡처</h2>
          <span className="text-[10.5px] text-muted-foreground/80 font-mono">Ctrl+Shift+;</span>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="p-3">
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                void save();
              }
            }}
            placeholder="한 줄 메모 · URL · 생각의 조각…  (Ctrl+Enter 로 저장)"
            rows={6}
            className="w-full resize-none rounded-md border border-[hsl(var(--hairline))] bg-background px-3 py-2 text-[13px] outline-none focus:border-primary/50 wiki-trans-color leading-relaxed"
          />
          {urls.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {urls.map((u) => (
                <span
                  key={u}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent/60 text-[10.5px] text-foreground/80 max-w-full"
                >
                  <Link2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{u}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <footer className="px-3 py-2 border-t border-[hsl(var(--hairline))] flex items-center justify-between bg-muted/20">
          <p className="text-[10.5px] text-muted-foreground">
            <span className="inline-block px-1 rounded bg-accent text-[10px] font-mono mr-1">#inbox</span>
            태그가 자동으로 붙어요. 나중에 분류·정리.
          </p>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!text.trim() || busy}
            className={cn(
              'inline-flex items-center gap-1 px-3 h-7 rounded-md text-[12px] font-semibold wiki-trans-color',
              text.trim() && !busy
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            <Send className="h-3 w-3" /> {busy ? '저장 중…' : '저장'}
          </button>
        </footer>
      </div>
    </div>
  );
}
