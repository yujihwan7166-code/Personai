import { Home, Plus } from 'lucide-react';
import type { StudyNotebook } from '@/types/study';
import { createEmptyNotebook } from '@/types/study';
import { cn } from '@/lib/utils';

interface Props {
  notebooks: StudyNotebook[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onGoHome: () => void;
  onCreate: (nb: StudyNotebook) => void;
}

export function NotebookRail({ notebooks, activeId, onSelect, onGoHome, onCreate }: Props) {
  return (
    <aside className="hidden sm:flex flex-col w-[60px] shrink-0 border-r border-slate-200 bg-white py-3 gap-1.5">
      <button
        onClick={onGoHome}
        className={cn(
          'mx-auto flex h-10 w-10 items-center justify-center rounded-xl transition-all',
          !activeId
            ? 'bg-slate-900 text-white shadow-sm'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
        )}
        title="공부 홈"
        aria-label="홈"
      >
        <Home className="h-4 w-4" />
      </button>
      <div className="h-px w-6 mx-auto bg-slate-200 my-1" />
      <div className="flex-1 overflow-y-auto flex flex-col items-center gap-1.5">
        {notebooks.slice(0, 20).map((nb) => {
          const active = nb.id === activeId;
          return (
            <button
              key={nb.id}
              onClick={() => onSelect(nb.id)}
              title={nb.title}
              aria-label={nb.title}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all',
                active
                  ? 'bg-indigo-100 ring-2 ring-indigo-400 text-indigo-900'
                  : 'bg-slate-50 hover:bg-slate-100',
              )}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 -translate-x-2 rounded-full bg-indigo-500" />
              )}
              {nb.icon}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => {
          const title = prompt('노트북 이름', '새 노트북');
          if (title) onCreate(createEmptyNotebook(title));
        }}
        className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-600"
        title="새 노트북"
        aria-label="새 노트북"
      >
        <Plus className="h-4 w-4" />
      </button>
    </aside>
  );
}
