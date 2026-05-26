import { useEffect, useRef } from 'react';
import { NOTEBOOK_ICON_PRESETS } from '@/types/study';
import { cn } from '@/lib/utils';
import { NotebookIcon } from './NotebookIcon';

interface Props {
  value: string;
  onChange: (icon: string) => void;
  onClose: () => void;
  anchor?: 'left' | 'right';
}

export function IconPicker({ value, onChange, onClose, anchor = 'left' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    setTimeout(() => window.addEventListener('click', h), 0);
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('click', h); window.removeEventListener('keydown', k); };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="아이콘 선택"
      className={cn(
        'absolute top-full mt-1 z-40 w-[240px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-2',
        anchor === 'right' ? 'right-0' : 'left-0',
      )}
    >
      <div className="grid grid-cols-6 gap-1">
        {NOTEBOOK_ICON_PRESETS.map((icon) => {
          const active = icon === value;
          return (
            <button
              key={icon}
              onClick={(e) => { e.stopPropagation(); onChange(icon); onClose(); }}
              className={cn(
                'h-9 w-9 flex items-center justify-center rounded-lg text-lg transition-all',
                active
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-400'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
              aria-label={`아이콘 ${getIconLabel(icon)}`}
              aria-pressed={active}
              title={getIconLabel(icon)}
            >
              <NotebookIcon icon={icon} className="h-[18px] w-[18px] text-slate-700 dark:text-slate-200" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getIconLabel(icon: string) {
  const labels: Record<string, string> = {
    BookOpen: '책',
    Book: '교재',
    BookOpenCheck: '학습 완료',
    Library: '라이브러리',
    Bookmark: '북마크',
    FileText: '문서',
    ClipboardList: '체크리스트',
    PenLine: '필기',
    ScrollText: '자료',
    GraduationCap: '수업',
    Brain: '개념',
    Sparkles: 'AI',
    Code2: '코딩',
    Calculator: '계산',
    FlaskConical: '과학',
    Globe2: '세계',
    Mic: '녹음',
    Youtube: '영상',
  };
  return labels[icon] ?? icon;
}
