import { useMemo, useState } from 'react';
import { X, Check, Search } from 'lucide-react';
import { DEFAULT_EXPERTS, EXPERT_CATEGORY_LABELS } from '@/types/expert';
import type { Expert, ExpertCategory } from '@/types/expert';
import { StudyBtn } from './ui/primitives';
import { cn } from '@/lib/utils';

interface Props {
  selectedAId?: string;
  selectedBId?: string;
  onConfirm: (a: Expert, b: Expert) => void;
  onClose: () => void;
}

const PRIORITY_CATEGORIES: ExpertCategory[] = [
  'specialist',
  'celebrity',
  'religion',
  'ideology',
  'perspective',
  'fictional',
  'occupation',
];

export function ExpertPickerModal({ selectedAId, selectedBId, onConfirm, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExpertCategory | 'all'>('specialist');
  const [aId, setAId] = useState<string | undefined>(selectedAId);
  const [bId, setBId] = useState<string | undefined>(selectedBId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEFAULT_EXPERTS.filter((e) => {
      if (category !== 'all' && e.category !== category) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        (e.nameKo ?? '').toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  const expertsById = useMemo(() => {
    const m = new Map<string, Expert>();
    DEFAULT_EXPERTS.forEach((e) => m.set(e.id, e));
    return m;
  }, []);

  const a = aId ? expertsById.get(aId) : undefined;
  const b = bId ? expertsById.get(bId) : undefined;

  const togglePick = (e: Expert) => {
    if (aId === e.id) {
      setAId(undefined);
      return;
    }
    if (bId === e.id) {
      setBId(undefined);
      return;
    }
    if (!aId) setAId(e.id);
    else if (!bId) setBId(e.id);
    else {
      setBId(aId);
      setAId(e.id);
    }
  };

  const canConfirm = a && b && a.id !== b.id;

  return (
    <div className="fixed inset-0 z-[95] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">2인 토론 전문가 선택</h3>
            <p className="text-[11.5px] text-slate-500 mt-0.5">
              두 관점을 골라 토론 생성 — 공부 자료를 입체적으로 이해해요
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5" aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 p-4 border-b border-slate-100">
          <SelectedSlot label="전문가 A" expert={a} onClear={() => setAId(undefined)} tint="indigo" />
          <SelectedSlot label="전문가 B" expert={b} onClear={() => setBId(undefined)} tint="rose" />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-slate-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름·설명 검색"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-[12px] outline-none focus:border-indigo-300 focus:bg-white"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpertCategory | 'all')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] outline-none"
          >
            <option value="all">전체</option>
            {PRIORITY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {EXPERT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filtered.slice(0, 60).map((e) => {
              const isA = aId === e.id;
              const isB = bId === e.id;
              const picked = isA || isB;
              return (
                <button
                  key={e.id}
                  onClick={() => togglePick(e)}
                  className={cn(
                    'relative rounded-xl border p-2.5 text-left transition-all',
                    picked
                      ? isA
                        ? 'border-indigo-400 ring-2 ring-indigo-200 bg-indigo-50/60'
                        : 'border-rose-400 ring-2 ring-rose-200 bg-rose-50/60'
                      : 'border-slate-200 hover:border-slate-300 bg-white',
                  )}
                >
                  {picked && (
                    <span className="absolute top-1.5 right-1.5 text-[9.5px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5 bg-white">
                      {isA ? 'A' : 'B'}
                    </span>
                  )}
                  <div className="text-2xl mb-1.5">{e.icon}</div>
                  <p className="text-[11.5px] font-bold text-slate-800 truncate">
                    {e.nameKo || e.name}
                  </p>
                  {e.description && (
                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                      {e.description}
                    </p>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-10 text-[12px] text-slate-400">
                일치하는 전문가가 없어요
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-2">
          <StudyBtn variant="outline" onClick={onClose} className="flex-1">
            취소
          </StudyBtn>
          <StudyBtn
            variant="primary"
            disabled={!canConfirm}
            onClick={() => {
              if (a && b) onConfirm(a, b);
            }}
            className="flex-1"
          >
            <Check className="h-3.5 w-3.5" /> 이 둘로 토론
          </StudyBtn>
        </div>
      </div>
    </div>
  );
}

function SelectedSlot({
  label,
  expert,
  onClear,
  tint,
}: {
  label: string;
  expert?: Expert;
  onClear: () => void;
  tint: 'indigo' | 'rose';
}) {
  const ring = tint === 'indigo' ? 'border-indigo-300 bg-indigo-50/50' : 'border-rose-300 bg-rose-50/50';
  return (
    <div className={cn('rounded-xl border-2 p-3 flex items-center gap-3', expert ? ring : 'border-dashed border-slate-300 bg-slate-50/50')}>
      {expert ? (
        <>
          <div className="text-2xl">{expert.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
            <p className="text-[12.5px] font-bold text-slate-800 truncate">{expert.nameKo || expert.name}</p>
          </div>
          <button onClick={onClear} className="text-slate-400 hover:text-slate-700" aria-label="해제">
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <div className="w-full text-center">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
          <p className="text-[11.5px] text-slate-500 mt-0.5">아래에서 선택</p>
        </div>
      )}
    </div>
  );
}
