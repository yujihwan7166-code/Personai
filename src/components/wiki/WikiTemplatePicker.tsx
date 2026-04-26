import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { WIKI_TEMPLATES, makePageFromTemplate, type WikiTemplate } from '@/lib/wikiTemplates';
import type { WikiPage } from '@/types/wiki';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (page: WikiPage) => void;
}

/**
 * 새 페이지 만들기 — 템플릿 픽커.
 * Notion / Obsidian 템플릿 패턴.
 */
export function WikiTemplatePicker({ open, onClose, onPick }: Props) {
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<string>('blank');

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setPicked('blank');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const create = (t: WikiTemplate) => {
    const page = makePageFromTemplate(t, title);
    onPick(page);
  };

  return (
    <div
      className="fixed inset-0 z-[150] flex items-start justify-center bg-black/40 backdrop-blur-sm pt-[10vh] px-4"
      onClick={onClose}
      role="dialog"
      aria-label="새 페이지 템플릿 선택"
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-[hsl(var(--hairline))] bg-popover shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--hairline))]">
          <h2 className="text-[14px] font-bold flex-1">새 페이지</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 제목 입력 */}
        <div className="px-4 pt-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목 (선택, 비우면 템플릿 기본 제목 사용)"
            className="w-full h-9 px-3 rounded-md border border-[hsl(var(--hairline))] bg-background text-[13px] outline-none focus:border-primary/40 transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const t = WIKI_TEMPLATES.find((tt) => tt.id === picked) ?? WIKI_TEMPLATES[0];
                create(t);
              }
            }}
            autoFocus
          />
        </div>

        {/* 템플릿 그리드 */}
        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[55vh] overflow-y-auto">
          {WIKI_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPicked(t.id)}
              onDoubleClick={() => create(t)}
              className={cn(
                'rounded-lg border p-3 text-left transition-all',
                picked === t.id
                  ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                  : 'border-[hsl(var(--hairline))] hover:border-foreground/20 hover:bg-accent/40',
              )}
            >
              <div className="text-2xl mb-1">{t.emoji}</div>
              <p className="text-[12.5px] font-bold text-foreground">{t.label}</p>
              <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-snug">
                {t.description}
              </p>
            </button>
          ))}
        </div>

        {/* 푸터 액션 */}
        <div className="px-4 py-3 border-t border-[hsl(var(--hairline))] flex items-center justify-between">
          <p className="text-[10.5px] text-muted-foreground">
            Enter 또는 더블클릭 = 만들기 · Esc 닫기
          </p>
          <button
            type="button"
            onClick={() => {
              const t = WIKI_TEMPLATES.find((tt) => tt.id === picked) ?? WIKI_TEMPLATES[0];
              create(t);
            }}
            className="px-3 h-8 rounded-md bg-primary text-primary-foreground text-[12px] font-semibold hover:opacity-90 transition-opacity"
          >
            만들기
          </button>
        </div>
      </div>
    </div>
  );
}
