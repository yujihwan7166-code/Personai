import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  BookOpen,
  Check,
  FileText,
  Film,
  GitBranch,
  GraduationCap,
  Library,
  Lightbulb,
  MessageSquare,
  Plane,
  Rocket,
  User,
  Utensils,
  X,
  type LucideIcon,
} from 'lucide-react';
import { WIKI_TEMPLATES, makePageFromTemplate, type WikiTemplate } from '@/lib/wikiTemplates';
import type { WikiPage } from '@/types/wiki';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useBackdropDismiss } from '@/hooks/useBackdropDismiss';
import { useScrollLock } from '@/hooks/useScrollLock';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (page: WikiPage) => void;
}

const TEMPLATE_TONES: Record<string, { card: string; accent: string; badge: string }> = {
  moc: {
    card: 'border-violet-200 bg-violet-50/70 dark:border-violet-500/30 dark:bg-violet-500/10',
    accent: 'bg-violet-500',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-100',
  },
  blank: {
    card: 'border-slate-200 bg-slate-50/70 dark:border-slate-500/25 dark:bg-slate-500/10',
    accent: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-100',
  },
  concept: {
    card: 'border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10',
    accent: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100',
  },
  source: {
    card: 'border-sky-200 bg-sky-50/70 dark:border-sky-500/30 dark:bg-sky-500/10',
    accent: 'bg-sky-500',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-100',
  },
  project: {
    card: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10',
    accent: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100',
  },
  meeting: {
    card: 'border-indigo-200 bg-indigo-50/70 dark:border-indigo-500/30 dark:bg-indigo-500/10',
    accent: 'bg-indigo-500',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-100',
  },
  person: {
    card: 'border-rose-200 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-500/10',
    accent: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-100',
  },
  reading: {
    card: 'border-cyan-200 bg-cyan-50/70 dark:border-cyan-500/30 dark:bg-cyan-500/10',
    accent: 'bg-cyan-500',
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-100',
  },
  movie: {
    card: 'border-fuchsia-200 bg-fuchsia-50/70 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/10',
    accent: 'bg-fuchsia-500',
    badge: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-100',
  },
  travel: {
    card: 'border-blue-200 bg-blue-50/70 dark:border-blue-500/30 dark:bg-blue-500/10',
    accent: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100',
  },
  study: {
    card: 'border-green-200 bg-green-50/70 dark:border-green-500/30 dark:bg-green-500/10',
    accent: 'bg-green-500',
    badge: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-100',
  },
  decision: {
    card: 'border-orange-200 bg-orange-50/70 dark:border-orange-500/30 dark:bg-orange-500/10',
    accent: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-100',
  },
  recipe: {
    card: 'border-lime-200 bg-lime-50/70 dark:border-lime-500/30 dark:bg-lime-500/10',
    accent: 'bg-lime-500',
    badge: 'bg-lime-100 text-lime-700 dark:bg-lime-500/20 dark:text-lime-100',
  },
};

const DEFAULT_TEMPLATE_TONE = {
  card: 'border-[hsl(var(--hairline))] bg-card',
  accent: 'bg-primary',
  badge: 'bg-primary/10 text-primary',
};

const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  moc: BookOpen,
  blank: FileText,
  concept: Lightbulb,
  source: Library,
  project: Rocket,
  meeting: MessageSquare,
  person: User,
  reading: BookOpen,
  movie: Film,
  travel: Plane,
  study: GraduationCap,
  decision: GitBranch,
  recipe: Utensils,
};

/**
 * 새 문서 만들기 — 템플릿 픽커.
 * Notion / Obsidian 템플릿 패턴.
 */
export function WikiTemplatePicker({ open, onClose, onPick }: Props) {
  useScrollLock(open);
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<string>('moc');
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const templateListId = useId();
  const selectedStatusId = useId();
  const trapRef = useFocusTrap<HTMLDivElement>(open);
  const backdropHandlers = useBackdropDismiss<HTMLDivElement>(onClose);
  const templateRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setPicked('moc');
    window.requestAnimationFrame(() => {
      titleInputRef.current?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const pickedTemplate = WIKI_TEMPLATES.find((t) => t.id === picked) ?? WIKI_TEMPLATES[0];

  const create = (t: WikiTemplate) => {
    const page = makePageFromTemplate(t, title);
    onPick(page);
  };

  const focusTemplate = (templateId: string) => {
    window.requestAnimationFrame(() => {
      templateRefs.current[templateId]?.focus();
    });
  };

  const movePickedTemplate = (currentId: string, direction: number) => {
    const currentIndex = WIKI_TEMPLATES.findIndex((template) => template.id === currentId);
    if (currentIndex < 0) return;
    const nextIndex = (currentIndex + direction + WIKI_TEMPLATES.length) % WIKI_TEMPLATES.length;
    const nextTemplate = WIKI_TEMPLATES[nextIndex];
    setPicked(nextTemplate.id);
    focusTemplate(nextTemplate.id);
  };

  const jumpPickedTemplate = (templateId: string) => {
    setPicked(templateId);
    focusTemplate(templateId);
  };

  const handleTemplateKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, template: WikiTemplate) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      movePickedTemplate(template.id, 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      movePickedTemplate(template.id, -1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      jumpPickedTemplate(WIKI_TEMPLATES[0].id);
    } else if (event.key === 'End') {
      event.preventDefault();
      jumpPickedTemplate(WIKI_TEMPLATES[WIKI_TEMPLATES.length - 1].id);
    }
  };

  return (
    <div
      className="fixed inset-0 wiki-z-modal-backdrop flex items-start justify-center bg-black/40 backdrop-blur-sm pt-[10vh] px-4"
      {...backdropHandlers}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
        aria-modal="true"
        className="w-full max-w-4xl rounded-xl border border-[hsl(var(--hairline))] bg-popover shadow-2xl overflow-hidden"
      >
        {/* 헤더 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--hairline))]">
          <div className="flex-1">
            <h2 id={dialogTitleId} className="text-[14px] font-bold">새 문서 템플릿 선택</h2>
            <p id={dialogDescriptionId} className="mt-0.5 text-[11px] text-muted-foreground">
              제목을 입력하고 템플릿을 고른 뒤 만들기를 누르세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="템플릿 선택 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 제목 입력 */}
        <div className="px-4 pt-3">
          <input
            ref={titleInputRef}
            data-autofocus="true"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="문서 제목"
            aria-label="새 문서 제목"
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
        <div
          id={templateListId}
          className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-[55vh] overflow-y-auto"
          role="radiogroup"
          aria-label="문서 템플릿 목록"
          aria-describedby={selectedStatusId}
        >
          {WIKI_TEMPLATES.map((t) => {
            const isFeatured = t.isMain;          // 메인 문서 = 첫 카드 강조
            const isPicked = picked === t.id;
            const tone = TEMPLATE_TONES[t.id] ?? DEFAULT_TEMPLATE_TONE;
            const Icon = TEMPLATE_ICONS[t.id] ?? FileText;
            const descriptionId = `${templateListId}-${t.id}-description`;
            return (
              <button
                key={t.id}
                ref={(node) => {
                  templateRefs.current[t.id] = node;
                }}
                type="button"
                role="radio"
                onClick={() => setPicked(t.id)}
                onDoubleClick={() => create(t)}
                onKeyDown={(event) => handleTemplateKeyDown(event, t)}
                aria-checked={isPicked}
                aria-describedby={descriptionId}
                aria-label={`${t.label} 템플릿 선택${isPicked ? ', 선택됨' : ''}${isFeatured ? ', 추천' : ''}`}
                className={cn(
                  'relative min-h-[112px] overflow-hidden rounded-lg border p-3 pl-3.5 text-left transition-all hover:-translate-y-px hover:border-foreground/25 hover:shadow-sm',
                  tone.card,
                  isPicked && 'ring-2 ring-primary/35 shadow-sm',
                )}
              >
                <span className={cn('absolute inset-y-0 left-0 w-1', tone.accent)} aria-hidden />
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span
                    className={cn(
                      'inline-flex h-9 w-9 items-center justify-center rounded-lg bg-background/70 shadow-[inset_0_0_0_1px_hsl(var(--foreground)/0.06)]',
                      isPicked && 'bg-background',
                    )}
                    aria-hidden
                  >
                    <Icon className="h-[18px] w-[18px] text-foreground/75" strokeWidth={2.1} />
                  </span>
                  <span className="flex items-center gap-1">
                    {isFeatured && (
                      <span className={cn('inline-flex items-center h-4 px-1.5 rounded text-[8.5px] font-bold tracking-wide', tone.badge)}>
                        추천
                      </span>
                    )}
                    {isPicked && (
                      <span
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
                        aria-hidden
                      >
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </span>
                </div>
                <p className={cn(
                  'text-[12.5px] font-bold',
                  'text-foreground',
                )}>{t.label}</p>
                <p
                  id={descriptionId}
                  className={cn(
                  'text-[10.5px] mt-0.5 leading-snug',
                  'text-muted-foreground',
                )}
                >
                  {t.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* 푸터 액션 */}
        <div className="flex flex-col gap-2 border-t border-[hsl(var(--hairline))] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p id={selectedStatusId} className="text-[10.5px] text-muted-foreground" aria-live="polite">
            선택: <span className="font-semibold text-foreground">{pickedTemplate.label}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              create(pickedTemplate);
            }}
            aria-label={`${pickedTemplate.label} 템플릿으로 문서 만들기`}
            className="px-3 h-8 rounded-md bg-primary text-primary-foreground text-[12px] font-semibold hover:opacity-90 transition-opacity"
          >
            만들기
          </button>
        </div>
      </div>
    </div>
  );
}
