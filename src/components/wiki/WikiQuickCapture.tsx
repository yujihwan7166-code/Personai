import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Inbox, X, Send, Link2, FileText } from 'lucide-react';
import { type WikiPage } from '@/types/wiki';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { buildQuickCapturePage } from '@/lib/wikiCapture';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useBackdropDismiss } from '@/hooks/useBackdropDismiss';
import { useScrollLock } from '@/hooks/useScrollLock';

/**
 * 빠른 캡처 모달 — Ctrl/Cmd+Shift+; 로 어디서든 호출.
 *
 * 의도: 처음부터 잘 쓰기 강박 제거. 한 줄·URL·이미지 던져넣고 닫음.
 * 결과물 = #수집함 태그가 붙은 draft 페이지. 분류는 나중.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (page: WikiPage) => Promise<void> | void;
  onOpenPage?: (id: string) => void;
}

export function WikiQuickCapture({ open, onClose, onCreate, onOpenPage }: Props) {
  useScrollLock(open);
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [openAfterSave, setOpenAfterSave] = useState(true);
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const descId = useId();
  const trapRef = useFocusTrap<HTMLDivElement>(open);
  const backdropHandlers = useBackdropDismiss<HTMLDivElement>(onClose);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText('');
      setTitle('');
      setTagInput('');
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

  const draft = buildQuickCapturePage({
    text: text.trim(),
    title,
    extraTags: tagInput.split(/[,\s]+/),
  });
  const canSave = Boolean(text.trim() || title.trim());

  async function save(): Promise<void> {
    if (!canSave || busy) return;
    setBusy(true);
    try {
      await onCreate(draft.page);
      notify.success('수집함에 저장됐어요', { duration: 1800 });
      onClose();
      if (openAfterSave) onOpenPage?.(draft.page.id);
    } catch {
      notify.error('저장에 실패했어요');
    } finally {
      setBusy(false);
    }
  }

  const handleSingleLineKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    e.preventDefault();
    void save();
  };

  return (
    <div
      ref={trapRef}
      className="fixed inset-0 wiki-z-modal-backdrop bg-black/40 backdrop-blur-sm flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      {...backdropHandlers}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-[hsl(var(--hairline))] bg-popover shadow-2xl overflow-hidden"
      >
        <header className="px-4 h-11 flex items-center gap-2 border-b border-[hsl(var(--hairline))]">
          <Inbox className="h-4 w-4 text-primary" />
          <h2 id={titleId} className="flex-1 text-[13px] font-bold">빠른 캡처</h2>
          <p id={descId} className="sr-only">
            떠오른 내용을 수집함 문서로 빠르게 저장합니다.
          </p>
          <span className="text-[10.5px] text-muted-foreground/80 font-mono">Ctrl+Shift+;</span>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
            aria-label="빠른 캡처 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="p-3">
          <div className="mb-2 grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-2">
            <label className="block">
              <span className="sr-only">제목</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleSingleLineKeyDown}
                placeholder={draft.title}
                className="h-8 w-full rounded-md border border-[hsl(var(--hairline))] bg-background px-2.5 text-[12.5px] outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/15 wiki-trans-color"
              />
            </label>
            <label className="block">
              <span className="sr-only">태그</span>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleSingleLineKeyDown}
                placeholder="태그 추가"
                className="h-8 w-full rounded-md border border-[hsl(var(--hairline))] bg-background px-2.5 text-[12.5px] outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/15 wiki-trans-color"
              />
            </label>
          </div>
          <textarea
            ref={taRef}
            data-autofocus="true"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                void save();
              }
            }}
            placeholder="한 줄 메모 · URL · 생각의 조각…  (Ctrl+Enter 로 저장)"
            aria-label="빠른 캡처 내용"
            rows={6}
            className="w-full resize-none rounded-md border border-[hsl(var(--hairline))] bg-background px-3 py-2 text-[13px] outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/15 wiki-trans-color leading-relaxed"
          />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10.5px] font-semibold max-w-full">
              <FileText className="h-3 w-3 shrink-0" />
              <span className="truncate">{draft.title}</span>
            </span>
            {draft.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded bg-accent/60 text-[10.5px] text-foreground/80"
              >
                #{tag}
              </span>
            ))}
            {draft.urls.map((url) => (
              <span
                key={url}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent/60 text-[10.5px] text-foreground/80 max-w-full"
              >
                <Link2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{url}</span>
              </span>
            ))}
          </div>
          {draft.urls.length > 0 && (
            <p className="mt-1.5 text-[10.5px] text-muted-foreground">
              URL은 본문 아래 출처 섹션에도 자동으로 정리됩니다.
            </p>
          )}
          <label className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={openAfterSave}
              onChange={(e) => setOpenAfterSave(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            저장 후 바로 열기
          </label>
        </div>

        <footer className="px-3 py-2 border-t border-[hsl(var(--hairline))] flex items-center justify-between bg-muted/20">
          <p className="text-[10.5px] text-muted-foreground">
            <span className="inline-block px-1 rounded bg-accent text-[10px] font-mono mr-1">#수집함</span>
            태그가 자동으로 붙어요. 나중에 분류·정리.
          </p>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!canSave || busy}
            aria-label={canSave ? `${draft.title} 수집함에 저장` : '빠른 캡처 저장'}
            className={cn(
              'inline-flex items-center gap-1 px-3 h-7 rounded-md text-[12px] font-semibold wiki-trans-color',
              canSave && !busy
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
