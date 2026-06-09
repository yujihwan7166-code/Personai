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
 * 새 문서 만들기 — 템플릿 픽커.
 * Notion / Obsidian 템플릿 패턴.
 */
export function WikiTemplatePicker({ open, onClose, onPick }: Props) {
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<string>('moc');

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setPicked('moc');
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
      className="fixed inset-0 wiki-z-modal-backdrop flex items-start justify-center bg-black/40 backdrop-blur-sm pt-[10vh] px-4"
      onClick={onClose}
      role="dialog"
      aria-label="새 문서 템플릿 선택"
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-[hsl(var(--hairline))] bg-popover shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--hairline))]">
          <h2 className="text-[14px] font-bold flex-1">새 문서</h2>
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
            placeholder="문서 제목"
            className="w-full h-9 px-3 rounded-md border border-[hsl(var(--hairline))] bg-background text-[13px] outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/15 transition-colors"
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
          {WIKI_TEMPLATES.map((t) => {
            const isFeatured = t.isMain;          // 메인 문서 = 첫 카드 강조
            const isPicked = picked === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setPicked(t.id)}
                onDoubleClick={() => create(t)}
                className={cn(
                  'rounded-lg border p-3 text-left transition-all',
                  isFeatured
                    // 메인 문서 — 보라톤 강조 (선택 여부에 따라 진하기 변동)
                    ? isPicked
                      ? 'border-violet-400 bg-violet-100/70 dark:bg-violet-500/20 ring-1 ring-violet-400/40 shadow-sm'
                      : 'border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-500/10 hover:border-violet-300 hover:bg-violet-100/60 dark:hover:bg-violet-500/15'
                    // 일반 — 흰 배경 통일
                    : isPicked
                      ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                      : 'border-[hsl(var(--hairline))] bg-card hover:border-foreground/30 hover:bg-accent/40',
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="text-2xl">{t.emoji}</div>
                  {isFeatured && (
                    <span className="inline-flex items-center h-4 px-1.5 rounded text-[8.5px] font-bold bg-violet-500 text-white tracking-wide">
                      추천
                    </span>
                  )}
                </div>
                <p className={cn(
                  'text-[12.5px] font-bold',
                  isFeatured ? 'text-violet-900 dark:text-violet-100' : 'text-foreground',
                )}>{t.label}</p>
                <p className={cn(
                  'text-[10.5px] mt-0.5 leading-snug',
                  isFeatured ? 'text-violet-700/80 dark:text-violet-200/80' : 'text-muted-foreground',
                )}>
                  {t.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* 푸터 액션 */}
        <div className="px-4 py-3 border-t border-[hsl(var(--hairline))] flex items-center justify-between">
          <p className="text-[10.5px] text-muted-foreground">
            원하는 양식을 고른 뒤 문서를 만드세요.
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
