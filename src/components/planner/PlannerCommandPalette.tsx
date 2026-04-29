/**
 * 플래너 명령 팔레트 — Cmd+K / Ctrl+K.
 *
 * 위키 팔레트 패턴 직접 차용. 검색 + 빠른 동작 + 항목 점프.
 *
 * 섹션:
 * - AI: 자연어 검색 (현재 미구현, 미래 확장 자리)
 * - 빠르게: 오늘로/어제/내일 + 추가
 * - 뷰: 일/주/월/년
 * - 검색: tasks/events 제목 매칭
 */
import { Command } from 'cmdk';
import { useEffect, useState, ReactNode } from 'react';
import { CalendarDays, Plus, Clock, Search, ArrowRight } from 'lucide-react';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import type { PlannerView } from './ViewToggle';

export type CommandAction =
  | { kind: 'view'; view: PlannerView }
  | { kind: 'today' }
  | { kind: 'shift'; days: number }
  | { kind: 'newTask' }
  | { kind: 'newAtNow' }
  | { kind: 'jumpToTask'; id: string; startAt?: string }
  | { kind: 'jumpToEvent'; id: string; startAt: string };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAction: (action: CommandAction) => void;
}

export const PlannerCommandPalette = ({ open, onOpenChange, onAction }: Props) => {
  const [query, setQuery] = useState('');

  useEffect(() => { if (!open) setQuery(''); }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === 'Escape' && open) {
        onOpenChange(false);
      } else if (!isTyping && !open && e.key === '/') {
        // 위키와 통일된 보조 진입 (선택).
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const run = (action: CommandAction) => {
    onAction(action);
    onOpenChange(false);
  };

  // 검색용 데이터 — 매번 list() 호출 (LocalStorage 빠름).
  const allTasks = taskStore.list();
  const allEvents = eventStore.list();
  const hasQuery = query.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/40 backdrop-blur-sm pt-[12vh] px-4"
      onClick={() => onOpenChange(false)}
      role="dialog"
      aria-label="명령 팔레트"
    >
      <Command
        className="w-full max-w-xl rounded-xl border border-[hsl(var(--hairline))] bg-popover shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        loop
      >
        <div className="border-b border-[hsl(var(--hairline))] px-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="동작 또는 항목 검색…"
            autoFocus
            className="w-full h-11 bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground"
          />
        </div>

        <Command.List className="max-h-[60vh] overflow-y-auto p-1.5">
          <Command.Empty className="p-6 text-center text-[12px] text-muted-foreground">
            일치하는 항목이 없어요
          </Command.Empty>

          <Command.Group
            heading="빠르게"
            className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground [&_[cmdk-group-heading]]:px-1 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:font-semibold"
          >
            <Item icon={<CalendarDays className="h-3.5 w-3.5" />} label="오늘로" hint="T" onSelect={() => run({ kind: 'today' })} />
            <Item icon={<ArrowRight className="h-3.5 w-3.5 -scale-x-100" />} label="어제" onSelect={() => run({ kind: 'shift', days: -1 })} />
            <Item icon={<ArrowRight className="h-3.5 w-3.5" />} label="내일" onSelect={() => run({ kind: 'shift', days: 1 })} />
            <Item icon={<Plus className="h-3.5 w-3.5" />} label="새 할 일 (인박스)" hint="N" onSelect={() => run({ kind: 'newTask' })} />
            <Item icon={<Clock className="h-3.5 w-3.5" />} label="지금 시간에 새 항목" onSelect={() => run({ kind: 'newAtNow' })} />
          </Command.Group>

          <Command.Group
            heading="뷰"
            className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground [&_[cmdk-group-heading]]:px-1 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:font-semibold"
          >
            <Item label="일 뷰" hint="D" onSelect={() => run({ kind: 'view', view: 'day' })} />
            <Item label="주 뷰" hint="W" onSelect={() => run({ kind: 'view', view: 'week' })} />
            <Item label="월 뷰" hint="M" onSelect={() => run({ kind: 'view', view: 'month' })} />
            <Item label="년 뷰" hint="Y" onSelect={() => run({ kind: 'view', view: 'year' })} />
          </Command.Group>

          {hasQuery && allTasks.length > 0 && (
            <Command.Group
              heading={`할 일 (${allTasks.length})`}
              className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground [&_[cmdk-group-heading]]:px-1 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:font-semibold"
            >
              {allTasks.map((t) => (
                <Item
                  key={t.id}
                  label={t.title}
                  meta={t.startAt
                    ? new Date(t.startAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) +
                      ' ' + new Date(t.startAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                    : '인박스'}
                  onSelect={() => run({ kind: 'jumpToTask', id: t.id, startAt: t.startAt })}
                />
              ))}
            </Command.Group>
          )}

          {hasQuery && allEvents.length > 0 && (
            <Command.Group
              heading={`일정 (${allEvents.length})`}
              className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground [&_[cmdk-group-heading]]:px-1 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:font-semibold"
            >
              {allEvents.map((e) => (
                <Item
                  key={e.id}
                  label={e.title}
                  meta={
                    new Date(e.startAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) +
                    ' ' + new Date(e.startAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                  }
                  onSelect={() => run({ kind: 'jumpToEvent', id: e.id, startAt: e.startAt })}
                />
              ))}
            </Command.Group>
          )}
        </Command.List>

        <div className="border-t border-[hsl(var(--hairline))] px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
          <span>↑↓ 이동  ·  ↵ 선택  ·  esc 닫기</span>
          <span>⌘K</span>
        </div>
      </Command>
    </div>
  );
};

function Item({ icon, label, hint, meta, onSelect }: {
  icon?: ReactNode;
  label: string;
  hint?: string;
  meta?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12.5px] text-foreground cursor-pointer data-[selected=true]:bg-accent"
    >
      {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {meta && <span className="text-[10.5px] text-muted-foreground tabular-nums shrink-0">{meta}</span>}
      {hint && (
        <kbd className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          {hint}
        </kbd>
      )}
    </Command.Item>
  );
}
