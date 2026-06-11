import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
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
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useBackdropDismiss } from '@/hooks/useBackdropDismiss';
import { useScrollLock } from '@/hooks/useScrollLock';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (page: WikiPage) => void;
}

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

type TemplateFilter = 'all' | 'base' | 'study' | 'record' | 'work';

const TEMPLATE_FILTERS: Array<{ id: TemplateFilter; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'base', label: '기본' },
  { id: 'study', label: '학습' },
  { id: 'record', label: '기록' },
  { id: 'work', label: '작업' },
];

const templateFilterFor = (template: WikiTemplate): Exclude<TemplateFilter, 'all'> => {
  if (template.id === 'blank' || template.id === 'moc' || template.id === 'concept') return 'base';
  if (template.id === 'reading' || template.id === 'source' || template.id === 'study') return 'study';
  if (template.id === 'movie' || template.id === 'travel' || template.id === 'person' || template.id === 'recipe') return 'record';
  return 'work';
};

const templateTypeLabel = (template: WikiTemplate): string => {
  if (template.isMain) return 'main';
  if (template.type === 'source') return 'source';
  if (template.type === 'project') return 'project';
  if (template.type === 'meeting') return 'meeting';
  if (template.type === 'person') return 'person';
  return 'note';
};

/**
 * 새 문서 만들기 — 템플릿 픽커.
 * Notion / Obsidian 템플릿 패턴.
 */
export function WikiTemplatePicker({ open, onClose, onPick }: Props) {
  useScrollLock(open);
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<string>('moc');
  const [activeFilter, setActiveFilter] = useState<TemplateFilter>('all');
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
    setActiveFilter('all');
    window.requestAnimationFrame(() => {
      titleInputRef.current?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const visibleTemplates = useMemo(
    () => WIKI_TEMPLATES.filter((template) => activeFilter === 'all' || templateFilterFor(template) === activeFilter),
    [activeFilter],
  );

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
    const currentIndex = visibleTemplates.findIndex((template) => template.id === currentId);
    if (currentIndex < 0) return;
    const nextIndex = (currentIndex + direction + visibleTemplates.length) % visibleTemplates.length;
    const nextTemplate = visibleTemplates[nextIndex];
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
      jumpPickedTemplate(visibleTemplates[0].id);
    } else if (event.key === 'End') {
      event.preventDefault();
      jumpPickedTemplate(visibleTemplates[visibleTemplates.length - 1].id);
    }
  };

  return (
    <div
      className="fixed inset-0 wiki-z-modal-backdrop flex items-start justify-center bg-black/40 backdrop-blur-sm px-5 pt-[7vh]"
      {...backdropHandlers}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescriptionId}
        aria-modal="true"
        className="wiki-template-dialog"
      >
        {/* 헤더 */}
        <div className="flex items-center gap-2 border-b border-[hsl(var(--hairline))] px-5 py-4">
          <div className="flex-1">
            <h2 id={dialogTitleId} className="text-[15px] font-semibold tracking-tight">새 문서 템플릿 선택</h2>
            <p id={dialogDescriptionId} className="mt-1 text-[11.5px] text-muted-foreground">
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
        <div className="border-b border-[hsl(var(--hairline))] px-5 py-3">
          <input
            ref={titleInputRef}
            data-autofocus="true"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="문서 제목"
            aria-label="새 문서 제목"
            className="h-10 w-full rounded-md border border-[hsl(var(--hairline))] bg-background px-3 text-[13px] outline-none transition-colors focus:border-primary/45 focus:ring-2 focus:ring-primary/12"
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
        <div className="flex items-center gap-1 border-b border-[hsl(var(--hairline))] px-5 py-2">
          {TEMPLATE_FILTERS.map((filter) => {
            const active = filter.id === activeFilter;
            return (
              <button
                key={filter.id}
                type="button"
                data-active={active ? 'true' : undefined}
                className="wiki-template-filter"
                onClick={() => {
                  setActiveFilter(filter.id);
                  const next = WIKI_TEMPLATES.find(
                    (template) => filter.id === 'all' || templateFilterFor(template) === filter.id,
                  );
                  if (next) setPicked(next.id);
                }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <div
          id={templateListId}
          className="wiki-template-grid"
          role="radiogroup"
          aria-label="문서 템플릿 목록"
          aria-describedby={selectedStatusId}
        >
          {visibleTemplates.map((t) => {
            const isFeatured = t.isMain;          // 메인 문서 = 첫 카드 강조
            const isPicked = picked === t.id;
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
                className="wiki-template-card"
                data-selected={isPicked ? 'true' : undefined}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[hsl(var(--hairline))] bg-background/60"
                    aria-hidden
                  >
                    <Icon className="h-4 w-4 text-foreground/70" strokeWidth={2} />
                  </span>
                  <span className="flex items-center gap-1">
                    {isFeatured && (
                      <span className="wiki-template-type">
                        추천
                      </span>
                    )}
                    {isPicked && (
                      <span
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background"
                        aria-hidden
                      >
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </span>
                </div>
                <div className="mb-1 flex items-center gap-1.5">
                  <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{t.label}</p>
                  <span className="wiki-template-type">{templateTypeLabel(t)}</span>
                </div>
                <p
                  id={descriptionId}
                  className="line-clamp-2 text-[11.5px] leading-5 text-muted-foreground"
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
