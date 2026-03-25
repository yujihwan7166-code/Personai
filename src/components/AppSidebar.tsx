import { useState } from 'react';
import { Expert, DiscussionMode } from '@/types/expert';
import { DiscussionRecord, getDiscussionHistory, deleteDiscussionFromHistory } from '@/components/DiscussionHistory';
import { ExpertManageDialog } from '@/components/ExpertManageDialog';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Plus, Clock, Trash2, MessageSquare, Home, Search, Settings2,
  ChevronDown, BookOpen, Pin, HelpCircle, Moon, Sun
} from 'lucide-react';

interface Props {
  experts: Expert[];
  onLoadHistory: (record: DiscussionRecord) => void;
  onUpdateExperts: (experts: Expert[]) => void;
  discussionMode: DiscussionMode;
  onModeChange: (mode: DiscussionMode) => void;
  isDiscussing: boolean;
  onNewDiscussion?: () => void;
}

export function AppSidebar({
  experts, onLoadHistory, onUpdateExperts,
  discussionMode, onModeChange, isDiscussing, onNewDiscussion,
}: Props) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [activeNav, setActiveNav] = useState<string>('home');
  const [historyRecords, setHistoryRecords] = useState<DiscussionRecord[]>(() => getDiscussionHistory());
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredRecordId, setHoveredRecordId] = useState<string | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  const refreshHistory = () => {
    setHistoryRecords(getDiscussionHistory());
  };

  const handleDeleteHistory = (id: string) => {
    deleteDiscussionFromHistory(id);
    setHistoryRecords(prev => prev.filter(r => r.id !== id));
  };

  const togglePin = (id: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      default: return '💬';
    }
  };

  const filteredHistory = searchQuery
    ? historyRecords.filter(r => r.question.toLowerCase().includes(searchQuery.toLowerCase()))
    : historyRecords;

  const pinnedRecords = filteredHistory.filter(r => pinnedIds.has(r.id));
  const unpinnedRecords = filteredHistory.filter(r => !pinnedIds.has(r.id));

  const groupByDate = (records: DiscussionRecord[]) => {
    const now = Date.now();
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

    return { today, yesterday, thisWeek, older };
  };

  const navItems = [
    { id: 'home', icon: Home, label: '홈' },
    { id: 'history', icon: Clock, label: '기록' },
    { id: 'library', icon: BookOpen, label: '라이브러리' },
  ];

  const renderHistoryItem = (record: DiscussionRecord) => {
    const isPinned = pinnedIds.has(record.id);
    return (
      <div
        key={record.id}
        onMouseEnter={() => setHoveredRecordId(record.id)}
        onMouseLeave={() => setHoveredRecordId(null)}
        className={cn(
          'group/hist relative flex items-start gap-2 px-2.5 py-2.5 rounded-xl transition-all duration-150',
          isPinned ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50',
        )}
      >
        <span className="text-[11px] mt-0.5 shrink-0">{getModeEmoji(record.mode)}</span>
        <button
          onClick={() => onLoadHistory(record)}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-[11.5px] text-slate-700 truncate leading-snug font-medium">{record.question}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] text-slate-400">{formatTime(record.timestamp)}</span>
            {record.messages && (
              <span className="text-[9px] text-slate-300">{record.messages.length}개 메시지</span>
            )}
          </div>
        </button>
        <div className={cn(
          'flex items-center gap-0.5 shrink-0 transition-opacity duration-150',
          hoveredRecordId === record.id ? 'opacity-100' : 'opacity-0'
        )}>
          <button
            onClick={() => togglePin(record.id)}
            className={cn(
              'p-1 rounded-md transition-colors',
              isPinned ? 'text-amber-500 hover:text-amber-600' : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <Pin className="w-3 h-3" />
          </button>
          <button
            onClick={() => handleDeleteHistory(record.id)}
            className="p-1 rounded-md text-slate-400 hover:text-red-500 transition-colors"
          >
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
        <div className={cn('shrink-0 border-b border-slate-100', collapsed ? 'px-2 py-3' : 'px-4 py-4')}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
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

        {/* New discussion */}
        <div className={cn('shrink-0', collapsed ? 'px-2 py-3' : 'px-3 py-3')}>
          <button
            onClick={() => onNewDiscussion?.()}
            className={cn(
              'flex items-center gap-2 rounded-xl text-[12px] font-semibold transition-all duration-200',
              'bg-indigo-500 text-white hover:bg-indigo-600 shadow-sm hover:shadow-md',
              collapsed ? 'w-9 h-9 justify-center' : 'w-full px-3 py-2.5'
            )}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!collapsed && '새 토론'}
          </button>
        </div>

        {/* Navigation */}
        <div className={cn('shrink-0 border-b border-slate-100 pb-2', collapsed ? 'px-2' : 'px-3')}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveNav(item.id); if (item.id === 'history') refreshHistory(); }}
              className={cn(
                'flex items-center gap-2.5 w-full rounded-xl transition-all duration-150 text-[12px]',
                collapsed ? 'justify-center w-9 h-9 mx-auto mb-1' : 'px-3 py-2 mb-0.5',
                activeNav === item.id
                  ? 'bg-slate-100 text-slate-900 font-semibold shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )}
            >
              <item.icon className={cn('w-4 h-4 shrink-0 transition-colors', activeNav === item.id ? 'text-slate-700' : 'text-slate-400')} />
              {!collapsed && item.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">

          {/* Home */}
          {activeNav === 'home' && !collapsed && (
            <div className="px-3 py-3">
              <div className="grid grid-cols-2 gap-1.5 mb-4">
                {[
                  { icon: '🔬', label: '전문가 상담', mode: 'expert' as DiscussionMode },
                  { icon: '⚔️', label: '라운드테이블', mode: 'standard' as DiscussionMode },
                  { icon: '💡', label: '브레인스토밍', mode: 'brainstorm' as DiscussionMode },
                  { icon: '🛠️', label: '어시스턴트', mode: 'assistant' as DiscussionMode },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => onModeChange(item.mode)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all text-left group/quick whitespace-nowrap"
                  >
                    <span className="text-[13px] shrink-0">{item.icon}</span>
                    <span className="text-[10.5px] text-slate-600 font-medium group-hover/quick:text-slate-800 transition-colors truncate">{item.label}</span>
                  </button>
                ))}
              </div>

              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">최근 토론</p>
              {historyRecords.length === 0 ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center mx-auto shadow-sm">
                    <span className="text-[20px]">💬</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">토론 기록이 없어요</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">AI와 대화를 시작하면 여기에 저장됩니다</p>
                  </div>
                  <button onClick={() => onNewDiscussion?.()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[10px] font-medium hover:bg-slate-700 transition-colors">
                    <Plus className="w-3 h-3" /> 첫 대화 시작
                  </button>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {historyRecords.slice(0, 5).map(record => renderHistoryItem(record))}
                  {historyRecords.length > 5 && (
                    <button
                      onClick={() => { setActiveNav('history'); refreshHistory(); }}
                      className="w-full flex items-center justify-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 py-2 transition-colors rounded-lg hover:bg-slate-50"
                    >
                      전체 기록 보기 <ChevronDown className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* History */}
          {activeNav === 'history' && !collapsed && (
            <div className="px-3 py-3">
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="기록 검색..."
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-[11px] outline-none focus:border-slate-300 focus:bg-white focus:shadow-sm transition-all"
                />
              </div>

              {pinnedRecords.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider px-1 mb-1.5 flex items-center gap-1">
                    <Pin className="w-3 h-3" /> 고정됨
                  </p>
                  <div className="space-y-0.5">{pinnedRecords.map(r => renderHistoryItem(r))}</div>
                </div>
              )}

              {(() => {
                const { today, yesterday, thisWeek, older } = groupByDate(unpinnedRecords);
                return (
                  <>
                    {today.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1.5">오늘</p>
                        <div className="space-y-0.5">{today.map(r => renderHistoryItem(r))}</div>
                      </div>
                    )}
                    {yesterday.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1.5">어제</p>
                        <div className="space-y-0.5">{yesterday.map(r => renderHistoryItem(r))}</div>
                      </div>
                    )}
                    {thisWeek.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1.5">이번 주</p>
                        <div className="space-y-0.5">{thisWeek.map(r => renderHistoryItem(r))}</div>
                      </div>
                    )}
                    {older.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1.5">이전</p>
                        <div className="space-y-0.5">{older.map(r => renderHistoryItem(r))}</div>
                      </div>
                    )}
                  </>
                );
              })()}

              {filteredHistory.length === 0 && (
                <div className="py-8 text-center">
                  <Search className="w-5 h-5 text-slate-300 mx-auto mb-2" />
                  <p className="text-[11px] text-slate-400">
                    {searchQuery ? '검색 결과가 없습니다' : '기록이 없습니다'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Library */}
          {activeNav === 'library' && !collapsed && (
            <div className="px-3 py-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2.5">저장된 프롬프트</p>
              <div className="space-y-1">
                {[
                  { icon: '💡', label: 'AI가 인간의 일자리를 대체할까요?', tag: '기술' },
                  { icon: '📈', label: '2026년 투자 전략은?', tag: '금융' },
                  { icon: '🧠', label: '창의력을 키우는 방법은?', tag: '자기계발' },
                  { icon: '⚖️', label: '임대차 계약 시 주의사항', tag: '법률' },
                  { icon: '🏥', label: '만성 두통의 원인과 대처법', tag: '의학' },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => { navigator.clipboard.writeText(item.label); }}
                    title="클릭하여 복사"
                    className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-left hover:bg-slate-50 transition-all group/prompt"
                  >
                    <span className="text-[13px] shrink-0">{item.icon}</span>
                    <span className="text-[11px] text-slate-600 truncate flex-1 group-hover/prompt:text-slate-800 transition-colors">{item.label}</span>
                    <span className="text-[9px] text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">{item.tag}</span>
                  </button>
                ))}
              </div>

              <div className="my-4 border-t border-slate-100" />

              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2.5">전문가 관리</p>
              <ExpertManageDialog experts={experts} onUpdate={onUpdateExperts} />

              <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-100">
                <p className="text-[10px] font-semibold text-slate-500 mb-2">통계</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center">
                    <div className="text-[16px] font-bold text-slate-700">{historyRecords.length}</div>
                    <div className="text-[9px] text-slate-400">총 토론</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[16px] font-bold text-slate-700">{experts.length}</div>
                    <div className="text-[9px] text-slate-400">전문가</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom */}
        <div className={cn('shrink-0 border-t border-slate-100', collapsed ? 'px-2 py-2' : 'px-3 py-2 space-y-0.5')}>
          <button
            onClick={() => {
              const isDark = document.documentElement.classList.toggle('dark');
              localStorage.setItem('theme', isDark ? 'dark' : 'light');
            }}
            className={cn(
              'flex items-center gap-2.5 w-full rounded-xl transition-all duration-150 text-[12px]',
              collapsed ? 'justify-center w-9 h-9 mx-auto' : 'px-3 py-2',
              'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            )}>
            <Moon className="w-4 h-4 shrink-0 text-slate-400 dark:hidden" />
            <Sun className="w-4 h-4 shrink-0 text-slate-400 hidden dark:block" />
            {!collapsed && <span className="dark:hidden">다크모드</span>}
            {!collapsed && <span className="hidden dark:block">라이트모드</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
