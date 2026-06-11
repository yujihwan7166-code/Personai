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
import { useCallback, useEffect, useId, useRef, useState, ReactNode } from 'react';
import { CalendarDays, Plus, Clock, Search, ArrowRight, Flag } from 'lucide-react';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import type { Priority } from '@/types/planner';
import { PRIORITY_COLORS } from '@/types/planner';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useBackdropDismiss } from '@/hooks/useBackdropDismiss';
import { useScrollLock } from '@/hooks/useScrollLock';
import type { PlannerView } from './ViewToggle';

const RESULT_LIMIT = 20;

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
  useScrollLock(open);
  const [query, setQuery] = useState('');
  const titleId = useId();
  const descId = useId();
  const trapRef = useFocusTrap<HTMLDivElement>({ active: open, restoreFocus: false });
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => { if (!open) setQuery(''); }, [open]);

  useEffect(() => {
    if (open) return;
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement !== document.body) {
      restoreFocusRef.current = activeElement;
    }
  }, [open]);

  const closePalette = useCallback((restoreFocus = true) => {
    onOpenChange(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => restoreFocusRef.current?.focus());
    }
  }, [onOpenChange]);
  const backdropHandlers = useBackdropDismiss<HTMLDivElement>(() => closePalette());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      const currentFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      // Cmd+K — 입력 중에도 열림(글로벌). 단 팔레트 자기 input 안에서는 토글 X (cmdk 가 처리).
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        // 팔레트가 이미 열려있고 사용자가 안에서 타이핑 중이면 cmdk 의 자체 동작에 맡김.
        if (open && isTyping) return;
        e.preventDefault();
        if (!open) restoreFocusRef.current = target instanceof HTMLElement ? target : currentFocus;
        onOpenChange(!open);
      } else if (e.key === 'Escape' && open) {
        closePalette();
      } else if (!isTyping && !open && e.key === '/') {
        // 위키와 통일된 보조 진입 (선택).
        e.preventDefault();
        restoreFocusRef.current = target instanceof HTMLElement ? target : currentFocus;
        onOpenChange(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePalette, open, onOpenChange]);

  if (!open) return null;

  const run = (action: CommandAction) => {
    onAction(action);
    closePalette(false);
  };

  // 검색용 데이터 — 완료·취소 제외 후 query 로 1차 필터, 그 다음에 slice.
  // (slice 를 먼저 하면 21번째부터의 매칭이 영원히 안 보임.)
  const q = query.trim().toLowerCase();
  const hasQuery = q.length > 0;
  const allTasks = (() => {
    const base = taskStore.list().filter((t) => !t.done && !t.canceled);
    const filtered = hasQuery ? base.filter((t) => t.title.toLowerCase().includes(q)) : base;
    return filtered.slice(0, RESULT_LIMIT);
  })();
  const allEvents = (() => {
    const base = eventStore.list();
    const filtered = hasQuery ? base.filter((e) => e.title.toLowerCase().includes(q)) : base;
    return filtered.slice(0, RESULT_LIMIT);
  })();

  return (
    <div
      ref={trapRef}
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/40 backdrop-blur-sm pt-[12vh] px-4"
      {...backdropHandlers}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <Command
        className="w-full max-w-xl rounded-xl border border-foreground/20 bg-popover shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        loop
      >
        <div className="sr-only">
          <h2 id={titleId}>명령 팔레트</h2>
          <p id={descId}>동작, 보기, 일정, 할 일을 검색하고 Enter로 실행합니다.</p>
        </div>
        <div className="border-b border-foreground/20 px-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="동작 또는 항목 검색…"
            aria-label="명령 검색"
            autoFocus
            className="w-full h-11 bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground"
          />
        </div>

        <Command.List label="명령 결과" className="max-h-[60vh] overflow-y-auto p-1.5">
          <Command.Empty className="p-6 text-center text-[12px] text-muted-foreground">
            <span role="status" className="block">
              <span className="block font-semibold text-foreground/70">일치하는 항목이 없어요.</span>
              <span className="mt-1 block text-[11px] text-muted-foreground/75">
                할 일, 일정 제목이나 동작 이름을 검색할 수 있어요.
              </span>
            </span>
          </Command.Empty>

          <Command.Group
            heading="빠르게"
            className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground [&_[cmdk-group-heading]]:px-1 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:font-semibold"
          >
            <Item icon={<CalendarDays className="h-3.5 w-3.5" />} label="오늘로" hint="T" onSelect={() => run({ kind: 'today' })} />
            <Item icon={<ArrowRight className="h-3.5 w-3.5 -scale-x-100" />} label="어제" onSelect={() => run({ kind: 'shift', days: -1 })} />
            <Item icon={<ArrowRight className="h-3.5 w-3.5" />} label="내일" onSelect={() => run({ kind: 'shift', days: 1 })} />
            <Item icon={<Plus className="h-3.5 w-3.5" />} label="새 할 일" hint="N" onSelect={() => run({ kind: 'newTask' })} />
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
              {allTasks.map((t) => {
                // 일정(startAt 있음) 도메인엔 priority 개념 없음 — 깃발 표시 X.
                const p = (t.startAt ? 0 : (t.priority ?? 0)) as Priority;
                const flag = p > 0 ? (
                  <Flag className="h-3 w-3" style={{ color: PRIORITY_COLORS[p], fill: PRIORITY_COLORS[p] }} />
                ) : undefined;
                return (
                  <Item
                    key={t.id}
                    icon={flag}
                    label={t.title}
                    meta={t.startAt
                      ? new Date(t.startAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) +
                        ' ' + new Date(t.startAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
                      : '대기함'}
                    onSelect={() => run({ kind: 'jumpToTask', id: t.id, startAt: t.startAt })}
                  />
                );
              })}
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

        <div className="border-t border-foreground/20 px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
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
