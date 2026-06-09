import { Command } from 'cmdk';
import { useEffect, useState } from 'react';
import { Plus, Network, BookOpen, Download, Upload, Trash2, X, Inbox, Bot, Sparkles } from 'lucide-react';
import { type WikiPage, WIKI_TYPE_META } from '@/types/wiki';
import { exportAllAsJson } from '@/lib/wikiBackup';
import { getActiveWikiPages, searchWikiPages, type WikiSearchHit } from '@/lib/wikiQuery';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pages: WikiPage[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onCreateByTitle?: (title: string) => void;
  onGoHome: () => void;
  onGoGraph: () => void;
  onImport: () => void;
  onClearAll: () => void;
  onQuickCapture?: () => void;
  onAskAi?: () => void;
  /** 현재 페이지 id — 있으면 '이 페이지를 그래프에서' 항목 노출 */
  currentPageId?: string | null;
  onGoGraphFocus?: (id: string) => void;
  onClose?: () => void;
}

/**
 * Ctrl/Cmd+K — 페이지 빠른 전환 + 동작 모음.
 * 옵시디언 Quick Switcher / Notion Cmd-P 패턴.
 */
export function WikiCommandPalette({
  open, onOpenChange, pages,
  onOpen, onCreate, onCreateByTitle, onGoHome, onGoGraph, onImport, onClearAll, onQuickCapture, onAskAi, currentPageId, onGoGraphFocus, onClose,
}: Props) {
  const [query, setQuery] = useState('');
  useEffect(() => { if (!open) setQuery(''); }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditable =
        target?.tagName === 'INPUT'
        || target?.tagName === 'TEXTAREA'
        || target?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (inEditable) return;
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const cleanQuery = query.trim();
  const activePages = getActiveWikiPages(pages);
  const pageHits: WikiSearchHit[] = cleanQuery
    ? searchWikiPages(activePages, cleanQuery).slice(0, 50)
    : activePages.slice(0, 50).map((page, index) => ({ page, hit: 'none', score: -index }));
  const exactPage = cleanQuery
    ? activePages.some((page) =>
      page.title.trim().toLowerCase() === cleanQuery.toLowerCase()
      || page.aliases.some((alias) => alias.trim().toLowerCase() === cleanQuery.toLowerCase()),
    )
    : false;
  const canCreateFromQuery = Boolean(onCreateByTitle && cleanQuery && !exactPage);

  const run = (fn?: () => void) => {
    fn?.();
    onOpenChange(false);
  };

  return (
    <div
      className="fixed inset-0 wiki-z-palette-backdrop flex items-start justify-center bg-black/40 backdrop-blur-sm pt-[12vh] px-4"
      onClick={() => onOpenChange(false)}
      role="dialog"
      aria-label="명령 팔레트"
    >
      <Command
        className="w-full max-w-xl rounded-xl border border-[hsl(var(--hairline))] bg-popover shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        loop
        shouldFilter={false}
      >
        <div className="border-b border-[hsl(var(--hairline))] px-3">
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="문서·동작 검색  ·  자연어로 물어보면 AI 진입"
            autoFocus
            className="w-full h-11 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
          />
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-1.5">
          <Command.Empty className="p-6 text-center text-[12px] text-muted-foreground">
            일치하는 항목이 없어요
          </Command.Empty>

          {onAskAi && (cleanQuery.length >= 6 || cleanQuery.includes('?') || cleanQuery.includes('？')) && (
            <Command.Group
              heading="AI"
              className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70 [&_[cmdk-group-heading]]:px-1 [&_[cmdk-group-heading]]:py-1"
            >
              <Item
                icon={<Sparkles className="h-3.5 w-3.5 text-primary" />}
                label={`AI 에게 묻기 — "${cleanQuery.slice(0, 40)}${cleanQuery.length > 40 ? '…' : ''}"`}
                hint="Ctrl/Cmd+J"
                onSelect={() => run(onAskAi)}
              />
            </Command.Group>
          )}

          <Command.Group
            heading="동작"
            className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70 [&_[cmdk-group-heading]]:px-1 [&_[cmdk-group-heading]]:py-1"
          >
            <Item
              icon={<Plus className="h-3.5 w-3.5" />}
              label="새 문서"
              hint="Ctrl/Cmd+N"
              onSelect={() => run(onCreate)}
            />
            {canCreateFromQuery && (
              <Item
                icon={<Plus className="h-3.5 w-3.5 text-primary" />}
                label={`"${cleanQuery}" 새 문서 만들기`}
                meta="Draft"
                onSelect={() => run(() => onCreateByTitle?.(cleanQuery))}
              />
            )}
            {onQuickCapture && (
              <Item
                icon={<Inbox className="h-3.5 w-3.5" />}
                label="빠른 캡처 — Inbox 에 던지기"
                hint="Ctrl+Shift+;"
                onSelect={() => run(onQuickCapture)}
              />
            )}
            {onAskAi && (
              <Item
                icon={<Bot className="h-3.5 w-3.5" />}
                label="마이위키 AI 도우미 열기"
                hint="Ctrl/Cmd+J"
                onSelect={() => run(onAskAi)}
              />
            )}
            <Item
              icon={<BookOpen className="h-3.5 w-3.5" />}
              label="대문으로"
              onSelect={() => run(onGoHome)}
            />
            <Item
              icon={<Network className="h-3.5 w-3.5" />}
              label="연결 그래프"
              onSelect={() => run(onGoGraph)}
            />
            {currentPageId && onGoGraphFocus && (
              <Item
                icon={<Network className="h-3.5 w-3.5 text-primary" />}
                label="이 문서를 그래프에서 보기"
                onSelect={() => run(() => onGoGraphFocus(currentPageId))}
              />
            )}
            <Item
              icon={<Download className="h-3.5 w-3.5" />}
              label="전체 백업 (.json)"
              onSelect={() => run(() => { void exportAllAsJson(); })}
            />
            <Item
              icon={<Upload className="h-3.5 w-3.5" />}
              label="백업 가져오기"
              onSelect={() => run(onImport)}
            />
            <Item
              icon={<Trash2 className="h-3.5 w-3.5 text-destructive" />}
              label="모든 문서 삭제"
              onSelect={() => run(onClearAll)}
            />
            {onClose && (
              <Item
                icon={<X className="h-3.5 w-3.5" />}
                label="닫기"
                hint="Esc"
                onSelect={() => run(onClose)}
              />
            )}
          </Command.Group>

          {pageHits.length > 0 && (
            <Command.Group
              heading={cleanQuery ? `검색 결과 (${pageHits.length})` : `문서 (${activePages.length})`}
              className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70 [&_[cmdk-group-heading]]:px-1 [&_[cmdk-group-heading]]:py-1"
            >
              {pageHits.map(({ page: p, hit, bodySnippet, matchedAlias, matchedTag, matchedLink }) => {
                const meta = WIKI_TYPE_META[p.type];
                return (
                  <Item
                    key={p.id}
                    icon={<span className="text-[14px] leading-none">{meta.icon}</span>}
                    label={p.title}
                    meta={formatHitMeta(hit, meta.label, matchedAlias, matchedTag, matchedLink)}
                    description={bodySnippet}
                    onSelect={() => run(() => onOpen(p.id))}
                  />
                );
              })}
            </Command.Group>
          )}
        </Command.List>

        <div className="border-t border-[hsl(var(--hairline))] px-3 py-1.5 text-[10px] text-muted-foreground flex items-center gap-3">
          <span>↑↓ 이동</span>
          <span>Enter 선택</span>
          <span>Esc 닫기</span>
        </div>
      </Command>
    </div>
  );
}

function Item({
  icon, label, hint, meta, description, onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  meta?: string;
  description?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12.5px] text-foreground/85 cursor-pointer data-[selected=true]:bg-accent data-[selected=true]:text-foreground"
    >
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block truncate">{label}</span>
        {description && (
          <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      {meta && <span className="text-[10.5px] text-muted-foreground">{meta}</span>}
      {hint && (
        <kbd className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          {hint}
        </kbd>
      )}
    </Command.Item>
  );
}

function formatHitMeta(
  hit: WikiSearchHit['hit'],
  fallback: string,
  matchedAlias?: string,
  matchedTag?: string,
  matchedLink?: string,
): string {
  if (hit === 'alias' && matchedAlias) return `별칭 · ${matchedAlias}`;
  if (hit === 'tag' && matchedTag) return `#${matchedTag}`;
  if (hit === 'link' && matchedLink) return `링크 · ${matchedLink}`;
  if (hit === 'body') return '본문';
  if (hit === 'title') return '제목';
  return fallback;
}
