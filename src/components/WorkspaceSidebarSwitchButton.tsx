import { useMemo, useRef } from 'react';
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

export function WorkspaceSidebarSwitchButton({
  className,
}: WorkspaceSidebarSwitchButtonProps) {
  const navigate = useNavigate();
  const modeApiRef = useRef<MainModeTabsApi | null>(null);
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

  return (
    <>
      <button
        type="button"
        onClick={() => modeApiRef.current?.open()}
        className={cn(
          'h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
          className,
        )}
        title="모드 열기"
        aria-label="모드 열기"
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
        />
      </HiddenInteractiveMount>
    </>
  );
}
