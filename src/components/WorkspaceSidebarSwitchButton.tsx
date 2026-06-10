import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { HiddenInteractiveMount } from '@/components/HiddenInteractiveMount';
import { MainModeTabs, type MainModeTabsApi } from '@/components/MainModeTabs';
import type { WorkspaceKey } from '@/components/AppWorkspaceShell';
import { MAIN_MODE_LABELS, type MainMode } from '@/types/expert';
import { cn } from '@/lib/utils';

const MODE_LAUNCHER_MODES: MainMode[] = [
  'general',
  'research_main',
  'study_main',
  'voice_main',
  'multi',
  'debate',
  'stakeholder_main',
  'premium_main',
  'assistant',
];

interface WorkspaceSidebarSwitchButtonProps {
  current: WorkspaceKey;
  className?: string;
  contentAlign?: 'start' | 'center' | 'end';
}

const WORKSPACE_LABELS: Record<WorkspaceKey, string> = {
  planner: '통합 플래너',
  wiki: '마이위키',
  memos: '메모',
  whiteboard: '화이트보드',
  journal: '일기',
};

export function WorkspaceSidebarSwitchButton({
  current,
  className,
  contentAlign = 'center',
}: WorkspaceSidebarSwitchButtonProps) {
  const navigate = useNavigate();
  const modeApiRef = useRef<MainModeTabsApi | null>(null);
  const modeMenuId = useId();
  const [modeOpen, setModeOpen] = useState(false);
  const currentLabel = WORKSPACE_LABELS[current] ?? '현재 화면';
  const label = `모드 전환: 현재 ${currentLabel}`;
  const labels = useMemo(() => {
    const out: Partial<Record<MainMode, string>> = {};
    for (const [key, value] of Object.entries(MAIN_MODE_LABELS)) {
      out[key as MainMode] = value.label;
    }
    return out as Record<MainMode, string>;
  }, []);

  const goToHomeWith = (state: Record<string, unknown>) => {
    navigate('/', { state });
  };

  const openModePanel = useCallback(() => {
    const tryOpen = (attempt = 0) => {
      if (modeApiRef.current) {
        modeApiRef.current.open();
        return;
      }
      if (attempt >= 4) return;
      window.requestAnimationFrame(() => tryOpen(attempt + 1));
    };
    tryOpen();
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={openModePanel}
        data-workspace-switch-current={current}
        className={cn(
          'h-8 w-8 inline-flex items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
          contentAlign === 'start' && 'justify-start',
          contentAlign === 'center' && 'justify-center',
          contentAlign === 'end' && 'justify-end',
          className,
        )}
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={modeOpen}
        aria-controls={modeMenuId}
      >
        <LayoutGrid className="h-4 w-4" strokeWidth={1.9} />
      </button>
      <HiddenInteractiveMount>
        <MainModeTabs
          modes={MODE_LAUNCHER_MODES}
          labels={labels}
          currentMode="general"
          pendingMode={null}
          isDiscussing={false}
          transitionPhase={0}
          showPlayerBg={false}
          onChange={(mode) => goToHomeWith({ selectMainMode: mode })}
          onSelectDebateSub={(sub) => goToHomeWith({ selectMainMode: 'debate', selectDebateSub: sub })}
          onSelectPremiumDomain={(domainId) => goToHomeWith({ selectMainMode: 'premium_main', selectPremiumDomain: domainId })}
          onSelectAssistantCard={(cardId) => goToHomeWith({
            selectMainMode: cardId === 'voice-analysis' ? 'voice_main' : 'assistant',
            selectAssistantCard: cardId,
          })}
          onSelectLifeTool={(toolId) => goToHomeWith({ selectMainMode: 'general', selectLifeTool: toolId })}
          onOpenMentalTests={() => goToHomeWith({ openMentalTests: true })}
          onOpenBookmarks={() => goToHomeWith({ openBookmarks: true })}
          onSelectPlayerTool={(toolId) => goToHomeWith({ selectMainMode: 'player', selectPlayerTool: toolId })}
          apiRef={modeApiRef}
          menuId={modeMenuId}
          onOpenChange={setModeOpen}
        />
      </HiddenInteractiveMount>
    </>
  );
}
