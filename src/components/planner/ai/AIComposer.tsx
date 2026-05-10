/**
 * AI 패널 입력창 — 자동 줄바꿈 + 전송 / 진행 중엔 중단 버튼.
 *
 * Enter 전송 / Shift+Enter 줄바꿈.
 */
import { useRef, useEffect, useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIComposerProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  loading: boolean;
  /** 외부에서 입력 채워넣기 (quick action 등). undefined 면 무시. */
  draft?: string;
  onDraftChange?: (v: string) => void;
}

export const AIComposer = ({ onSend, onStop, loading, draft, onDraftChange }: AIComposerProps) => {
  const [internal, setInternal] = useState('');
  const value = draft !== undefined ? draft : internal;
  const setValue = (v: string) => {
    if (onDraftChange) onDraftChange(v);
    else setInternal(v);
  };
  const taRef = useRef<HTMLTextAreaElement>(null);

  // 자동 높이.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(160, ta.scrollHeight)}px`;
  }, [value]);

  const handleSubmit = () => {
    const text = value.trim();
    if (!text || loading) return;
    onSend(text);
    setValue('');
  };

  return (
    <div className="border-t hairline bg-card/40 p-2">
      <div className="flex items-end gap-1.5 rounded-xl border hairline bg-background px-2.5 py-1.5 focus-within:border-foreground/30 transition-colors">
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // 한국어 IME 조합 중 Enter 차단 — isComposing + keyCode 229 백업.
            // (브라우저별로 isComposing 만으로 못 잡는 케이스가 있어 두 검사 병행)
            const composing = e.nativeEvent.isComposing || e.keyCode === 229;
            if (e.key === 'Enter' && !e.shiftKey && !composing) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={loading ? '답변 중…' : '뭐든 물어보세요'}
          disabled={loading && !onStop}
          rows={1}
          className="flex-1 resize-none bg-transparent text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground/70 py-1 max-h-40"
        />
        {loading && onStop ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="중단"
            title="중단"
            className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-lg bg-foreground/85 text-background hover:bg-foreground transition-colors"
          >
            <Square className="h-3 w-3 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim() || loading}
            aria-label="전송"
            title="전송 (Enter)"
            className={cn(
              'shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-lg transition-colors',
              value.trim() && !loading
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-foreground/10 text-foreground/40 cursor-not-allowed',
            )}
          >
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
};
