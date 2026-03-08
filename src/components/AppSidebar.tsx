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
import { ChevronDown, Clock, Trash2, Plus, Settings2 } from 'lucide-react';

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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="py-2">
        {/* New Discussion */}
        {!collapsed && (
          <div className="px-3 pb-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-display font-semibold transition-all text-primary-foreground hover:opacity-90 shadow-md"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <Plus className="w-4 h-4" />
              새 토론
            </button>
          </div>
        )}

        {/* History */}
        <SidebarGroup>
          <SidebarGroupLabel
            onClick={loadHistory}
            className="cursor-pointer hover:text-foreground transition-colors flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {!collapsed && '토론 기록'}
            </span>
            {!collapsed && <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', historyOpen && 'rotate-180')} />}
          </SidebarGroupLabel>
          {historyOpen && !collapsed && (
            <SidebarGroupContent>
              <SidebarMenu>
                {historyRecords.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground px-3 py-2">기록이 없습니다</p>
                ) : (
                  historyRecords.slice(0, 15).map(record => (
                    <SidebarMenuItem key={record.id}>
                      <SidebarMenuButton
                        onClick={() => onLoadHistory(record)}
                        className="flex items-start gap-2 h-auto py-2 group/hist"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">{record.question}</p>
                          <p className="text-[10px] text-muted-foreground">{formatTime(record.timestamp)}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteHistory(record.id); }}
                          className="opacity-0 group-hover/hist:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
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
            className="cursor-pointer hover:text-foreground transition-colors flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              {!collapsed && '설정'}
            </span>
            {!collapsed && <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', settingsOpen && 'rotate-180')} />}
          </SidebarGroupLabel>
          {settingsOpen && !collapsed && (
            <SidebarGroupContent>
              <div className="px-3 py-2 space-y-3">
                {/* Mode Selector */}
                <div>
                  <p className="text-[10px] text-muted-foreground font-display mb-1.5">토론 모드</p>
                  <div className="space-y-1">
                    {(['general', 'conclusion', 'standard', 'procon', 'freeform', 'endless'] as DiscussionMode[]).map(mode => {
                      const { label, icon, description } = DISCUSSION_MODE_LABELS[mode];
                      return (
                        <button
                          key={mode}
                          onClick={() => onModeChange(mode)}
                          disabled={isDiscussing}
                          className={cn(
                            'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all text-xs',
                            discussionMode === mode
                              ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                          )}
                        >
                          <span>{icon}</span>
                          <div>
                            <div className="font-medium">{label}</div>
                            <div className="text-[10px] opacity-60">{description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Expert Management */}
                <div>
                  <p className="text-[10px] text-muted-foreground font-display mb-1.5">전문가 관리</p>
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
