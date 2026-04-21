import { Command } from 'cmdk';
import { useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Mic,
  Play,
  Download,
  Zap,
  Trash2,
  X,
} from 'lucide-react';
import type { StudyNotebook } from '@/types/study';
import { createEmptyNotebook } from '@/types/study';

export interface PaletteActions {
  onOpenNotebook: (id: string) => void;
  onCreateNotebook: (nb: StudyNotebook) => void;
  onStartSession?: () => void;
  onStartRecording?: () => void;
  onQuickStart?: () => void;
  onExport?: () => void;
  onDeleteCurrent?: () => void;
  onClose?: () => void;
}

interface Props extends PaletteActions {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  notebooks: StudyNotebook[];
  activeNotebook?: StudyNotebook | null;
}

export function StudyCommandPalette({
  open,
  onOpenChange,
  notebooks,
  activeNotebook,
  onOpenNotebook,
  onCreateNotebook,
  onStartSession,
  onStartRecording,
  onQuickStart,
  onExport,
  onDeleteCurrent,
  onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ctrl+K 는 글로벌 CommandPalette 전용.
      // 공부 전용 팔레트는 Ctrl+J 로 분리 — 공부 모드 안에 있을 때만 사용.
      if ((e.metaKey || e.ctrlKey) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'Escape' && open) onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const recent = useMemo(() => notebooks.slice(0, 6), [notebooks]);

  if (!open) return null;

  const run = (fn?: () => void) => {
    onOpenChange(false);
    if (fn) setTimeout(fn, 30);
  };

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/50 flex items-start justify-center pt-24 px-4"
      onClick={() => onOpenChange(false)}
    >
      <Command
        label="명령 팔레트"
        className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-3 py-2.5 flex items-center gap-2">
          <span className="text-slate-400 text-[11px] font-mono">⌘K</span>
          <Command.Input
            autoFocus
            placeholder="명령 검색 또는 노트북 이름…"
            className="flex-1 outline-none text-[13px] bg-transparent"
          />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-1.5">
          <Command.Empty className="p-6 text-center text-[12px] text-slate-400">
            일치하는 항목이 없어요
          </Command.Empty>

          <Command.Group heading="동작" className="px-2 py-1 text-[10px] uppercase tracking-wide text-slate-400">
            <Item
              icon={<Plus className="h-3.5 w-3.5" />}
              label="새 노트북"
              hint="N"
              onSelect={() => {
                const title = prompt('노트북 이름', '새 노트북');
                if (title) run(() => onCreateNotebook(createEmptyNotebook(title)));
                else onOpenChange(false);
              }}
            />
            {activeNotebook && (
              <>
                <Item
                  icon={<Zap className="h-3.5 w-3.5" />}
                  label="빠른 시작 (요약·핵심·퀴즈)"
                  onSelect={() => run(onQuickStart)}
                />
                <Item
                  icon={<Play className="h-3.5 w-3.5" />}
                  label="15분 세션 시작"
                  hint="Q"
                  onSelect={() => run(onStartSession)}
                />
                <Item
                  icon={<Mic className="h-3.5 w-3.5" />}
                  label="강의 녹음 시작"
                  hint="R"
                  onSelect={() => run(onStartRecording)}
                />
                <Item
                  icon={<Download className="h-3.5 w-3.5" />}
                  label="내보내기"
                  onSelect={() => run(onExport)}
                />
                <Item
                  icon={<Trash2 className="h-3.5 w-3.5 text-red-500" />}
                  label="현재 노트북 삭제"
                  onSelect={() => run(onDeleteCurrent)}
                />
              </>
            )}
            <Item
              icon={<X className="h-3.5 w-3.5" />}
              label="공부 도우미 닫기"
              hint="Esc"
              onSelect={() => run(onClose)}
            />
          </Command.Group>

          {recent.length > 0 && (
            <Command.Group heading="노트북" className="px-2 py-1 mt-1 text-[10px] uppercase tracking-wide text-slate-400">
              {recent.map((nb) => (
                <Item
                  key={nb.id}
                  icon={<span className="text-sm">{nb.icon}</span>}
                  label={nb.title}
                  meta={`${nb.sources.length}개 소스`}
                  onSelect={() => run(() => onOpenNotebook(nb.id))}
                />
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  );
}

function Item({
  icon,
  label,
  hint,
  meta,
  onSelect,
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
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] text-slate-700 cursor-pointer data-[selected=true]:bg-indigo-50 data-[selected=true]:text-indigo-700"
    >
      <span className="text-slate-500">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {meta && <span className="text-[10.5px] text-slate-400">{meta}</span>}
      {hint && (
        <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
          {hint}
        </kbd>
      )}
    </Command.Item>
  );
}
