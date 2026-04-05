import { useState, useMemo } from 'react';
import {
  AIVS_USER_TOPIC_PRESETS,
  type AivsUserTopicPreset,
  type AivsBattleDraft,
} from '@/types/expert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Search, ChevronLeft, ChevronRight, Swords } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  education: '교육',
  work: '직장',
  society: '사회',
  technology: '기술',
  culture: '문화',
  economy: '경제',
};
const CATEGORIES = Object.keys(CATEGORY_LABELS);
const PER_PAGE = 8;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (draft: AivsBattleDraft) => void;
}

export function AivsBattleConfigModal({ open, onOpenChange, onConfirm }: Props) {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [userStance, setUserStance] = useState<'pro' | 'con' | 'random'>('pro');
  const [battleTone, setBattleTone] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [verdictMode, setVerdictMode] = useState<'none' | 'final'>('final');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let list: AivsUserTopicPreset[] = AIVS_USER_TOPIC_PRESETS;
    if (activeCategory) {
      list = list.filter(t => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }, [activeCategory, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * PER_PAGE, (safePage + 1) * PER_PAGE);

  const handleCategoryChange = (cat: string | null) => {
    setActiveCategory(cat);
    setPage(0);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setPage(0);
  };

  const handleConfirm = () => {
    if (!selectedTopicId) return;
    onConfirm({ topicId: selectedTopicId, userStance, battleTone, verdictMode });
    onOpenChange(false);
  };

  const pageRange = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i);
    let start = Math.max(0, safePage - 2);
    const end = Math.min(totalPages, start + 5);
    if (end - start < 5) start = Math.max(0, end - 5);
    return Array.from({ length: end - start }, (_, i) => start + i);
  }, [totalPages, safePage]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-[16px] font-bold text-slate-800">⚔️ 배틀 설정</DialogTitle>
        </DialogHeader>

        {/* ── Topic Selection Box ── */}
        <div className="mx-4 rounded-xl border border-slate-200 bg-slate-50/80 overflow-hidden">
          {/* Search + Category */}
          <div className="px-3 pt-3 pb-2 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="주제 검색..."
                className="w-full pl-8 pr-16 py-2 rounded-lg border border-slate-200 bg-white text-[12px] text-slate-700 outline-none focus:border-rose-300 transition-colors"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                총 {filtered.length}개
              </span>
            </div>

            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              <button
                onClick={() => handleCategoryChange(null)}
                className={cn(
                  'shrink-0 px-3 py-1 rounded-full text-[10px] font-medium transition-all',
                  !activeCategory
                    ? 'bg-rose-100 text-rose-700 font-semibold'
                    : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-700'
                )}
              >
                전체
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={cn(
                    'shrink-0 px-3 py-1 rounded-full text-[10px] font-medium transition-all',
                    activeCategory === cat
                      ? 'bg-rose-100 text-rose-700 font-semibold'
                      : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-700'
                  )}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Topic Grid — 2 columns × 4 rows */}
          <div className="px-3 pb-2">
            {pageItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5">
                {pageItems.map(topic => {
                  const isSelected = selectedTopicId === topic.id;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setSelectedTopicId(topic.id)}
                      className={cn(
                        'relative text-left rounded-lg px-3 py-2 transition-all border',
                        isSelected
                          ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-300'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={cn('text-[11px] font-bold leading-tight truncate', isSelected ? 'text-slate-900' : 'text-slate-700')}>
                          {topic.title}
                        </span>
                        {topic.featured && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[7px] text-amber-600 font-semibold">
                            추천
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5 leading-snug truncate">
                        {topic.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-[12px] text-slate-400">
                검색 결과가 없습니다
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pb-3 pt-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {pageRange.map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn(
                    'w-6 h-6 rounded-md text-[10px] font-medium flex items-center justify-center transition-all',
                    p === safePage
                      ? 'bg-rose-500 text-white font-bold'
                      : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700'
                  )}
                >
                  {p + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="ml-1.5 text-[9px] text-slate-400">
                {safePage + 1} / {totalPages}
              </span>
            </div>
          )}
        </div>

        {/* ── Settings Chips — centered compact row ── */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-5 pt-3 pb-1">
          {/* 내 입장 */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400">입장</span>
            {([{ v: 'pro', l: '찬성' }, { v: 'con', l: '반대' }, { v: 'random', l: '자동' }] as const).map(opt => (
              <button
                key={opt.v}
                onClick={() => setUserStance(opt.v)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[10px] font-medium transition-all',
                  userStance === opt.v
                    ? 'bg-rose-100 text-rose-700 font-semibold'
                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:text-slate-700'
                )}
              >
                {opt.l}
              </button>
            ))}
          </div>

          {/* 말투 */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400">말투</span>
            {([{ v: 'easy', l: '😊 친근' }, { v: 'normal', l: '🤝 논리적' }, { v: 'hard', l: '🔥 공격적' }] as const).map(opt => (
              <button
                key={opt.v}
                onClick={() => setBattleTone(opt.v)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[10px] font-medium transition-all',
                  battleTone === opt.v
                    ? 'bg-rose-100 text-rose-700 font-semibold'
                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:text-slate-700'
                )}
              >
                {opt.l}
              </button>
            ))}
          </div>

          {/* 판정 */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400">판정</span>
            {([{ v: 'none', l: '없음' }, { v: 'final', l: '마지막 판정' }] as const).map(opt => (
              <button
                key={opt.v}
                onClick={() => setVerdictMode(opt.v)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[10px] font-medium transition-all',
                  verdictMode === opt.v
                    ? 'bg-rose-100 text-rose-700 font-semibold'
                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:text-slate-700'
                )}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        {/* ── Start Button ── */}
        <div className="px-4 pt-2 pb-4">
          <button
            onClick={handleConfirm}
            disabled={!selectedTopicId}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[14px] font-bold transition-all hover:from-rose-600 hover:to-pink-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Swords className="w-4 h-4" />
            대결 시작하기
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
