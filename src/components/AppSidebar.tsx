import { useState, useMemo } from 'react';
import { Expert, DiscussionMode } from '@/types/expert';
import { DiscussionRecord, getDiscussionHistory, deleteDiscussionFromHistory } from '@/components/DiscussionHistory';
import { ExpertAvatar } from '@/components/ExpertAvatar';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Plus, Trash2, MessageSquare, Search,
  ChevronDown, Pin, Moon, Sun, Download, Star,
} from 'lucide-react';

interface Props {
  experts: Expert[];
  onLoadHistory: (record: DiscussionRecord) => void;
  onUpdateExperts: (experts: Expert[]) => void;
  discussionMode: DiscussionMode;
  onModeChange: (mode: DiscussionMode) => void;
  isDiscussing: boolean;
  onNewDiscussion?: () => void;
  favoriteIds?: string[];
  onSelectExpert?: (id: string) => void;
}

export function AppSidebar({
  experts, onLoadHistory, onUpdateExperts,
  discussionMode, onModeChange, isDiscussing, onNewDiscussion,
  favoriteIds = [], onSelectExpert,
}: Props) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [historyRecords, setHistoryRecords] = useState<DiscussionRecord[]>(() => getDiscussionHistory());
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredRecordId, setHoveredRecordId] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pinned-history') || '[]')); } catch { return new Set(); }
  });

  const refreshHistory = () => setHistoryRecords(getDiscussionHistory());

  const handleDeleteHistory = (id: string) => {
    deleteDiscussionFromHistory(id);
    setHistoryRecords(prev => prev.filter(r => r.id !== id));
  };

  const togglePin = (id: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('pinned-history', JSON.stringify([...next]));
      return next;
    });
  };

  const formatTime = (ts: number) => {
    const diffMin = Math.floor((Date.now() - ts) / 60000);
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}시간 전`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}일 전`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)}주 전`;
    return `${Math.floor(diffDay / 30)}개월 전`;
  };

  const getModeEmoji = (mode?: string) => {
    switch (mode) {
      case 'general': return '💬';
      case 'multi': return '🔄';
      case 'expert': return '🔬';
      case 'standard': return '🎯';
      case 'procon': return '⚖️';
      case 'brainstorm': return '💡';
      case 'assistant': return '🛠️';
      case 'hearing': return '🔍';
      case 'player': return '🎮';
      default: return '💬';
    }
  };

  // 즐겨찾기 봇 목록 (localStorage에서 직접 읽기)
  const storedFavIds = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('ai-debate-favorites') || '[]') as string[]; } catch { return []; }
  }, []);
  const effectiveFavIds = favoriteIds.length > 0 ? favoriteIds : storedFavIds;
  const favoriteExperts = useMemo(() =>
    effectiveFavIds.map(id => experts.find(e => e.id === id)).filter(Boolean) as Expert[],
    [effectiveFavIds, experts]
  );

  // 추천 질문 (즐겨찾기 or 랜덤 봇에서)
  const suggestedQuestion = useMemo(() => {
    const pool = favoriteExperts.length > 0 ? favoriteExperts : experts.slice(0, 20);
    const withQ = pool.filter(e => e.sampleQuestions && e.sampleQuestions.length > 0);
    if (withQ.length === 0) return null;
    const expert = withQ[Math.floor(Math.random() * withQ.length)];
    const q = expert.sampleQuestions![Math.floor(Math.random() * expert.sampleQuestions!.length)];
    return { expert, question: q };
  }, [favoriteExperts, experts]);

  // 검색 + 날짜 그룹
  const filteredHistory = searchQuery
    ? historyRecords.filter(r => r.question.toLowerCase().includes(searchQuery.toLowerCase()))
    : historyRecords;
  const pinnedRecords = filteredHistory.filter(r => pinnedIds.has(r.id));
  const unpinnedRecords = filteredHistory.filter(r => !pinnedIds.has(r.id));

  const groupByDate = (records: DiscussionRecord[]) => {
    const now = Date.now();
    const groups: { label: string; items: DiscussionRecord[] }[] = [];
    const today: DiscussionRecord[] = [];
    const yesterday: DiscussionRecord[] = [];
    const thisWeek: DiscussionRecord[] = [];
    const older: DiscussionRecord[] = [];
    records.forEach(r => {
      const diffHr = (now - r.timestamp) / 3600000;
      if (diffHr < 24) today.push(r);
      else if (diffHr < 48) yesterday.push(r);
      else if (diffHr < 168) thisWeek.push(r);
      else older.push(r);
    });
    if (today.length) groups.push({ label: '오늘', items: today });
    if (yesterday.length) groups.push({ label: '어제', items: yesterday });
    if (thisWeek.length) groups.push({ label: '이번 주', items: thisWeek });
    if (older.length) groups.push({ label: '이전', items: older });
    return groups;
  };

  const exportHistory = (record: DiscussionRecord) => {
    const lines = [`# ${record.question}\n`, `모드: ${record.mode || 'general'}`, `날짜: ${new Date(record.timestamp).toLocaleString('ko-KR')}\n`, '---\n'];
    record.messages?.forEach(m => {
      const name = m.expertId === '__user__' ? '사용자' : experts.find(e => e.id === m.expertId)?.nameKo || m.expertId;
      lines.push(`### ${name}\n`, m.content || '', '\n---\n');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${record.question.slice(0, 30)}.md`;
    a.click();
  };

  const renderHistoryItem = (record: DiscussionRecord) => {
    const isPinned = pinnedIds.has(record.id);
    const isHovered = hoveredRecordId === record.id;
    return (
      <div
        key={record.id}
        onMouseEnter={() => setHoveredRecordId(record.id)}
        onMouseLeave={() => setHoveredRecordId(null)}
        className={cn(
          'group/hist relative flex items-start gap-2 px-2.5 py-2 rounded-lg transition-all duration-150 cursor-pointer',
          isPinned ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50',
        )}
        onClick={() => onLoadHistory(record)}
      >
        <span className="text-[11px] mt-0.5 shrink-0">{getModeEmoji(record.mode)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-slate-700 truncate leading-snug font-medium">{record.question}</p>
          <span className="text-[9px] text-slate-400">{formatTime(record.timestamp)}</span>
        </div>
        <div className={cn('flex items-center gap-0.5 shrink-0 transition-opacity duration-150', isHovered ? 'opacity-100' : 'opacity-0')}>
          <button onClick={(e) => { e.stopPropagation(); exportHistory(record); }} className="p-1 rounded-md text-slate-400 hover:text-blue-500 transition-colors" title="마크다운 내보내기">
            <Download className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); togglePin(record.id); }} className={cn('p-1 rounded-md transition-colors', isPinned ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600')} title={isPinned ? '고정 해제' : '고정'}>
            <Pin className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDeleteHistory(record.id); }} className="p-1 rounded-md text-slate-400 hover:text-red-500 transition-colors" title="삭제">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-white">
      <SidebarContent className="flex flex-col h-full">
        {/* Logo */}
        <div className={cn('shrink-0 border-b border-slate-100', collapsed ? 'px-2 py-3' : 'px-4 py-3.5')}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-extrabold text-slate-800 leading-tight tracking-tight">Personai</div>
                <div className="text-[9px] text-slate-400 font-medium">AI 토론 & 상담 플랫폼</div>
              </div>
            )}
          </div>
        </div>

        {/* New discussion button */}
        <div className={cn('shrink-0', collapsed ? 'px-2 py-2' : 'px-3 py-2.5')}>
          <button
            onClick={() => { onNewDiscussion?.(); refreshHistory(); }}
            className={cn(
              'flex items-center gap-2 rounded-lg text-[12px] font-semibold transition-all duration-200',
              'bg-slate-800 text-white hover:bg-slate-700 shadow-sm hover:shadow-md',
              collapsed ? 'w-9 h-9 justify-center' : 'w-full px-3 py-2.5'
            )}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!collapsed && '새 대화'}
          </button>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
              <input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); refreshHistory(); }}
                placeholder="대화 검색..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-100 bg-slate-50/50 text-[11px] outline-none focus:border-slate-300 focus:bg-white transition-all"
              />
            </div>
          </div>
        )}

        {/* Main content — conversation history (ChatGPT style) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
          {!collapsed && (
            <div className="px-2 py-1">
              {/* 즐겨찾기 봇 */}
              {favoriteExperts.length > 0 && !searchQuery && (
                <div className="mb-3 px-1">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400" /> 즐겨찾기
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {favoriteExperts.slice(0, 6).map(e => (
                      <button
                        key={e.id}
                        onClick={() => onSelectExpert?.(e.id)}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                        title={e.description}
                      >
                        <ExpertAvatar expert={e} size="xs" />
                        <span className="text-[10px] text-slate-600 font-medium">{e.nameKo}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 추천 질문 */}
              {suggestedQuestion && !searchQuery && historyRecords.length > 0 && (
                <div className="mb-3 px-1">
                  <button
                    onClick={() => onSelectExpert?.(suggestedQuestion.expert.id)}
                    className="w-full p-2.5 rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 hover:border-indigo-200 transition-all text-left"
                  >
                    <p className="text-[9px] text-indigo-400 font-semibold mb-1">💡 이런 질문은 어때요?</p>
                    <p className="text-[10.5px] text-indigo-700 font-medium leading-snug">"{suggestedQuestion.question}"</p>
                    <p className="text-[9px] text-indigo-400 mt-1">— {suggestedQuestion.expert.nameKo}</p>
                  </button>
                </div>
              )}

              {/* 고정된 대화 */}
              {pinnedRecords.length > 0 && (
                <div className="mb-2">
                  <p className="text-[9px] font-semibold text-amber-500 uppercase tracking-wider px-1 mb-1 flex items-center gap-1">
                    <Pin className="w-2.5 h-2.5" /> 고정됨
                  </p>
                  {pinnedRecords.map(r => renderHistoryItem(r))}
                </div>
              )}

              {/* 날짜별 대화 기록 */}
              {groupByDate(unpinnedRecords).map(group => (
                <div key={group.label} className="mb-2">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1">{group.label}</p>
                  {group.items.map(r => renderHistoryItem(r))}
                </div>
              ))}

              {/* 빈 상태 */}
              {filteredHistory.length === 0 && (
                <div className="py-10 text-center">
                  {searchQuery ? (
                    <>
                      <Search className="w-5 h-5 text-slate-300 mx-auto mb-2" />
                      <p className="text-[11px] text-slate-400">검색 결과가 없습니다</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center mx-auto mb-3 shadow-sm">
                        <MessageSquare className="w-5 h-5 text-slate-300" />
                      </div>
                      <p className="text-[11px] font-medium text-slate-500">대화 기록이 없어요</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">AI와 대화를 시작하면 여기에 저장됩니다</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom */}
        <div className={cn('shrink-0 border-t border-slate-100', collapsed ? 'px-2 py-2' : 'px-3 py-2')}>
          <button
            onClick={() => {
              const isDark = document.documentElement.classList.toggle('dark');
              localStorage.setItem('theme', isDark ? 'dark' : 'light');
            }}
            className={cn(
              'flex items-center gap-2.5 w-full rounded-lg transition-all duration-150 text-[11px]',
              collapsed ? 'justify-center w-9 h-9 mx-auto' : 'px-3 py-2',
              'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
            )}>
            <Moon className="w-3.5 h-3.5 shrink-0 dark:hidden" />
            <Sun className="w-3.5 h-3.5 shrink-0 hidden dark:block" />
            {!collapsed && <span className="dark:hidden">다크모드</span>}
            {!collapsed && <span className="hidden dark:block">라이트모드</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
