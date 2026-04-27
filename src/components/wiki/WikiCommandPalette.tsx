import { Command } from 'cmdk';
import { useEffect, useState } from 'react';
import { Plus, Network, Home, Download, Upload, Trash2, X, Inbox, Sparkles } from 'lucide-react';
import { type WikiPage, WIKI_TYPE_META } from '@/types/wiki';
import { exportAllAsJson } from '@/lib/wikiBackup';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pages: WikiPage[];
  onOpen: (id: string) => void;
  onCreate: () => void;
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
  onOpen, onCreate, onGoHome, onGoGraph, onImport, onClearAll, onQuickCapture, onAskAi, currentPageId, onGoGraphFocus, onClose,
}: Props) {
  const [query, setQuery] = useState('');
  useEffect(() => { if (!open) setQuery(''); }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
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
      >
        <div className="border-b border-[hsl(var(--hairline))] px-3">
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="페이지·동작 검색  ·  자연어로 물어보면 AI 진입"
            autoFocus
            className="w-full h-11 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
          />
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-1.5">
          <Command.Empty className="p-6 text-center text-[12px] text-muted-foreground">
            일치하는 항목이 없어요
          </Command.Empty>

          {onAskAi && (query.trim().length >= 6 || query.includes('?') || query.includes('?')) && (
            <Command.Group
              heading="AI"
              className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70 [&_[cmdk-group-heading]]:px-1 [&_[cmdk-group-heading]]:py-1"
            >
              <Item
                icon={<Sparkles className="h-3.5 w-3.5 text-primary" />}
                label={`AI 에게 묻기 — "${query.trim().slice(0, 40)}${query.trim().length > 40 ? '…' : ''}"`}
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
              label="새 페이지"
              hint="Ctrl/Cmd+N"
              onSelect={() => run(onCreate)}
            />
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
                icon={<Sparkles className="h-3.5 w-3.5" />}
                label="AI 보조 열기"
                hint="Ctrl/Cmd+J"
                onSelect={() => run(onAskAi)}
              />
            )}
            <Item
              icon={<Home className="h-3.5 w-3.5" />}
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
                label="이 페이지를 그래프에서 보기"
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
              label="모든 페이지 삭제"
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

          {pages.length > 0 && (
            <Command.Group
              heading={`페이지 (${pages.length})`}
              className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground/70 [&_[cmdk-group-heading]]:px-1 [&_[cmdk-group-heading]]:py-1"
            >
              {pages.slice(0, 50).map((p) => {
                const meta = WIKI_TYPE_META[p.type];
                return (
                  <Item
                    key={p.id}
                    icon={<span className="text-[14px] leading-none">{meta.icon}</span>}
                    label={p.title}
                    meta={meta.label}
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
  icon, label, hint, meta, onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  meta?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12.5px] text-foreground/85 cursor-pointer data-[selected=true]:bg-accent data-[selected=true]:text-foreground"
    >
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {meta && <span className="text-[10.5px] text-muted-foreground">{meta}</span>}
      {hint && (
        <kbd className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          {hint}
        </kbd>
      )}
    </Command.Item>
  );
}
