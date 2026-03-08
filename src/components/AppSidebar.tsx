import { useState } from 'react';
import { Expert, ExpertCategory, EXPERT_CATEGORY_LABELS, EXPERT_CATEGORY_ORDER, DiscussionMode, DISCUSSION_MODE_LABELS } from '@/types/expert';
import { DiscussionHistory, DiscussionRecord, getDiscussionHistory, deleteDiscussionFromHistory } from '@/components/DiscussionHistory';
import { DiscussionModeSelector } from '@/components/DiscussionModeSelector';
import { ExpertManageDialog } from '@/components/ExpertManageDialog';
import { ExpertAvatar } from '@/components/ExpertAvatar';
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
import { ChevronDown, Clock, Trash2, Settings, Plus } from 'lucide-react';

interface Props {
  experts: Expert[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  selectable: boolean;
  discussionMode: DiscussionMode;
  onModeChange: (mode: DiscussionMode) => void;
  onLoadHistory: (record: DiscussionRecord) => void;
  onUpdateExperts: (experts: Expert[]) => void;
  isDiscussing: boolean;
  activeExpertId?: string;
}

export function AppSidebar({
  experts, selectedIds, onToggle, selectable,
  discussionMode, onModeChange, onLoadHistory, onUpdateExperts,
  isDiscussing, activeExpertId,
}: Props) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<DiscussionRecord[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ ai: true });

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

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

  const grouped = EXPERT_CATEGORY_ORDER.map(cat => ({
    cat,
    label: EXPERT_CATEGORY_LABELS[cat],
    items: experts.filter(e => e.category === cat),
  })).filter(g => g.items.length > 0);

  const selectedCount = selectedIds.length;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="py-2">
        {/* New Discussion */}
        {!collapsed && (
          <div className="px-3 pb-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-display font-semibold transition-all bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
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
                  historyRecords.slice(0, 10).map(record => (
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

        {/* Mode Selector */}
        {selectable && !collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>토론 모드</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 space-y-1">
                {(['standard', 'procon', 'freeform', 'endless'] as DiscussionMode[]).map(mode => {
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
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Expert Selection */}
        {selectable && (
          <>
            {!collapsed && (
              <div className="px-3 py-1 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-display">{selectedCount}명 선택됨</span>
                <ExpertManageDialog experts={experts} onUpdate={onUpdateExperts} />
              </div>
            )}
            {grouped.map(({ cat, label, items }) => {
              const isOpen = expandedCategories[cat] ?? false;
              const catSelectedCount = items.filter(e => selectedIds.includes(e.id)).length;
              return (
                <SidebarGroup key={cat}>
                  <SidebarGroupLabel
                    onClick={() => toggleCategory(cat)}
                    className="cursor-pointer hover:text-foreground transition-colors flex items-center justify-between"
                  >
                    <span>{collapsed ? label.charAt(0) : label}</span>
                    {!collapsed && (
                      <div className="flex items-center gap-1.5">
                        {catSelectedCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">{catSelectedCount}</span>
                        )}
                        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', isOpen && 'rotate-180')} />
                      </div>
                    )}
                  </SidebarGroupLabel>
                  {isOpen && !collapsed && (
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {items.map(expert => {
                          const isSelected = selectedIds.includes(expert.id);
                          const isActive = activeExpertId === expert.id;
                          return (
                            <SidebarMenuItem key={expert.id}>
                              <SidebarMenuButton
                                onClick={() => onToggle(expert.id)}
                                className={cn(
                                  'flex items-center gap-2.5 transition-all',
                                  !isSelected && 'opacity-40',
                                  isActive && 'ring-1 ring-primary/30 bg-primary/5'
                                )}
                              >
                                <ExpertAvatar expert={expert} size="sm" active={isActive} />
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs font-medium text-foreground">{expert.nameKo}</span>
                                  <span className="block text-[10px] text-muted-foreground truncate">{expert.description}</span>
                                </div>
                                {isSelected && (
                                  <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                )}
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  )}
                </SidebarGroup>
              );
            })}
          </>
        )}

        {/* During discussion - show active experts */}
        {!selectable && !collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>참여 전문가</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {experts.filter(e => selectedIds.includes(e.id) || e.id === 'summarizer' || e.id === 'conclusion').map(expert => {
                  const isActive = activeExpertId === expert.id;
                  return (
                    <SidebarMenuItem key={expert.id}>
                      <SidebarMenuButton className={cn(
                        'flex items-center gap-2.5',
                        isActive && 'ring-1 ring-primary/30 bg-primary/5',
                        !isActive && activeExpertId && 'opacity-40'
                      )}>
                        <ExpertAvatar expert={expert} size="sm" active={isActive} />
                        <span className="text-xs font-medium">{expert.nameKo}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
