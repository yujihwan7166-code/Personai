import { useState } from 'react';
import { Expert, DiscussionMode, DISCUSSION_MODE_LABELS } from '@/types/expert';
import { DiscussionRecord, getDiscussionHistory, deleteDiscussionFromHistory } from '@/components/DiscussionHistory';
import { ExpertManageDialog } from '@/components/ExpertManageDialog';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { ChevronDown, Clock, Trash2, Plus, Settings2, MessageSquare } from 'lucide-react';

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
  const [historyOpen, setHistoryOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<DiscussionRecord[]>(() => getDiscussionHistory());

  const loadHistory = () => {
    setHistoryRecords(getDiscussionHistory());
    setHistoryOpen(!historyOpen);
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

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent className="py-4">
        {/* Logo */}
        {!collapsed && (
          <div className="px-4 pb-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <MessageSquare className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-foreground tracking-tight">AI 전문가 토론</span>
          </div>
        )}

        {/* New Discussion */}
        <div className={cn('px-3 pb-3', collapsed && 'flex justify-center')}>
          <button
            onClick={() => window.location.reload()}
            className={cn(
              'flex items-center gap-2 rounded-xl text-sm font-medium transition-all',
              'bg-primary text-white hover:bg-primary/90 shadow-sm',
              collapsed ? 'w-9 h-9 justify-center' : 'w-full px-3 py-2.5'
            )}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!collapsed && '새 토론'}
          </button>
        </div>

        {/* History */}
        <SidebarGroup>
          <SidebarGroupLabel
            onClick={loadHistory}
            className="cursor-pointer hover:text-foreground transition-colors flex items-center justify-between px-3 py-2"
          >
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {!collapsed && <span>토론 기록</span>}
            </span>
            {!collapsed && (
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform text-muted-foreground', historyOpen && 'rotate-180')} />
            )}
          </SidebarGroupLabel>

          {historyOpen && !collapsed && (
            <SidebarGroupContent>
              <SidebarMenu>
                {historyRecords.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground px-4 py-3">기록이 없습니다</p>
                ) : (
                  historyRecords.slice(0, 15).map(record => (
                    <SidebarMenuItem key={record.id}>
                      <SidebarMenuButton
                        onClick={() => onLoadHistory(record)}
                        className="flex items-start gap-2 h-auto py-2 px-3 rounded-xl group/hist hover:bg-sidebar-accent"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-foreground truncate leading-snug">{record.question}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatTime(record.timestamp)}</p>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteHistory(record.id); }}
                          className="opacity-0 group-hover/hist:opacity-100 text-muted-foreground hover:text-destructive shrink-0 p-0.5 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup>
          <SidebarGroupLabel
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="cursor-pointer hover:text-foreground transition-colors flex items-center justify-between px-3 py-2"
          >
            <span className="flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              {!collapsed && <span>설정</span>}
            </span>
            {!collapsed && (
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform text-muted-foreground', settingsOpen && 'rotate-180')} />
            )}
          </SidebarGroupLabel>

          {settingsOpen && !collapsed && (
            <SidebarGroupContent>
              <div className="px-3 py-2 space-y-4">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2 px-1">토론 모드</p>
                  <div className="space-y-0.5">
                    {(['general', 'multi', 'standard', 'procon', 'creative', 'endless'] as DiscussionMode[]).map(mode => {
                      const { label } = DISCUSSION_MODE_LABELS[mode];
                      const isActive = discussionMode === mode;
                      return (
                        <button
                          key={mode}
                          onClick={() => onModeChange(mode)}
                          disabled={isDiscussing}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all text-[12px]',
                            isActive
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
                          )}
                        >
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2 px-1">전문가 관리</p>
                  <ExpertManageDialog experts={experts} onUpdate={onUpdateExperts} />
                </div>
              </div>
            </SidebarGroupContent>
          )}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
