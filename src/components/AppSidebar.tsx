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
import { Plus, Clock, Trash2, MessageSquare, Home, Search, Star, Settings2, ChevronDown, BookOpen } from 'lucide-react';

interface Props {
  experts: Expert[];
  onLoadHistory: (record: DiscussionRecord) => void;
  onUpdateExperts: (experts: Expert[]) => void;
  discussionMode: DiscussionMode;
  onModeChange: (mode: DiscussionMode) => void;
  isDiscussing: boolean;
}

export function AppSidebar({
  experts, onLoadHistory, onUpdateExperts,
  discussionMode, onModeChange, isDiscussing,
}: Props) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [activeNav, setActiveNav] = useState<string>('home');
  const [historyRecords, setHistoryRecords] = useState<DiscussionRecord[]>(() => getDiscussionHistory());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const refreshHistory = () => {
    setHistoryRecords(getDiscussionHistory());
  };

  const handleDeleteHistory = (id: string) => {
    deleteDiscussionFromHistory(id);
    setHistoryRecords(prev => prev.filter(r => r.id !== id));
  };

  const formatTime = (ts: number) => {
    const diffMin = Math.floor((Date.now() - ts) / 60000);
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}시간 전`;
    return `${Math.floor(diffHr / 24)}일 전`;
  };

  const filteredHistory = searchQuery
    ? historyRecords.filter(r => r.question.toLowerCase().includes(searchQuery.toLowerCase()))
    : historyRecords;

  const navItems = [
    { id: 'home', icon: Home, label: '홈' },
    { id: 'history', icon: Clock, label: '기록' },
    { id: 'library', icon: BookOpen, label: '라이브러리' },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-white">
      <SidebarContent className="flex flex-col h-full">
        {/* Top: Logo */}
        <div className={cn('shrink-0 border-b border-slate-100', collapsed ? 'px-2 py-3' : 'px-4 py-4')}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <div>
                <div className="text-[13px] font-bold text-slate-800 leading-tight">AI 전문가 토론</div>
                <div className="text-[9px] text-slate-400">Expert Chat Forum</div>
              </div>
            )}
          </div>
        </div>

        {/* New discussion button */}
        <div className={cn('shrink-0', collapsed ? 'px-2 py-3' : 'px-3 py-3')}>
          <button
            onClick={() => window.location.reload()}
            className={cn(
              'flex items-center gap-2 rounded-xl text-[12px] font-semibold transition-all',
              'bg-slate-900 text-white hover:bg-slate-800 shadow-sm',
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
                'flex items-center gap-2.5 w-full rounded-lg transition-all text-[12px]',
                collapsed ? 'justify-center w-9 h-9 mx-auto mb-1' : 'px-3 py-2 mb-0.5',
                activeNav === item.id
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && item.label}
            </button>
          ))}
        </div>

        {/* Content area — scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Home view */}
          {activeNav === 'home' && !collapsed && (
            <div className="px-3 py-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">최근 토론</p>
              {historyRecords.length === 0 ? (
                <p className="text-[11px] text-slate-400 px-1 py-4 text-center">아직 토론 기록이 없습니다</p>
              ) : (
                <div className="space-y-0.5">
                  {historyRecords.slice(0, 5).map(record => (
                    <button
                      key={record.id}
                      onClick={() => onLoadHistory(record)}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-all group/item"
                    >
                      <p className="text-[11px] text-slate-700 truncate leading-snug">{record.question}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{formatTime(record.timestamp)}</p>
                    </button>
                  ))}
                  {historyRecords.length > 5 && (
                    <button
                      onClick={() => setActiveNav('history')}
                      className="w-full text-[10px] text-slate-400 hover:text-slate-600 py-1.5 transition-colors"
                    >
                      전체 보기 →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* History view */}
          {activeNav === 'history' && !collapsed && (
            <div className="px-3 py-3">
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="기록 검색..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] outline-none focus:border-slate-400 transition-colors"
                />
              </div>

              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">
                {searchQuery ? `검색 결과 (${filteredHistory.length})` : `전체 기록 (${filteredHistory.length})`}
              </p>

              {filteredHistory.length === 0 ? (
                <p className="text-[11px] text-slate-400 px-1 py-4 text-center">
                  {searchQuery ? '검색 결과가 없습니다' : '기록이 없습니다'}
                </p>
              ) : (
                <div className="space-y-0.5">
                  {filteredHistory.slice(0, 30).map(record => (
                    <div
                      key={record.id}
                      className="flex items-start gap-1 px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-all group/hist"
                    >
                      <button
                        onClick={() => onLoadHistory(record)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-[11px] text-slate-700 truncate leading-snug">{record.question}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{formatTime(record.timestamp)}</p>
                      </button>
                      <button
                        onClick={() => handleDeleteHistory(record.id)}
                        className="opacity-0 group-hover/hist:opacity-100 text-slate-400 hover:text-red-500 shrink-0 p-1 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Library view */}
          {activeNav === 'library' && !collapsed && (
            <div className="px-3 py-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-3">저장된 프롬프트</p>
              <div className="space-y-1.5">
                {[
                  { icon: '💡', label: 'AI가 인간의 일자리를 대체할까요?' },
                  { icon: '📈', label: '2026년 투자 전략은?' },
                  { icon: '🧠', label: '창의력을 키우는 방법은?' },
                ].map((item, i) => (
                  <button
                    key={i}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-slate-50 transition-all"
                  >
                    <span className="text-[12px]">{item.icon}</span>
                    <span className="text-[11px] text-slate-600 truncate">{item.label}</span>
                  </button>
                ))}
              </div>

              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-3 mt-5">전문가 관리</p>
              <ExpertManageDialog experts={experts} onUpdate={onUpdateExperts} />
            </div>
          )}
        </div>

        {/* Bottom: Settings */}
        <div className={cn('shrink-0 border-t border-slate-100', collapsed ? 'px-2 py-2' : 'px-3 py-2')}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              'flex items-center gap-2.5 w-full rounded-lg transition-all text-[12px]',
              collapsed ? 'justify-center w-9 h-9 mx-auto' : 'px-3 py-2',
              showSettings ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            )}
          >
            <Settings2 className="w-4 h-4 shrink-0" />
            {!collapsed && '설정'}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
