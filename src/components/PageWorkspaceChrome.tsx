import { PageAiLauncher } from '@/components/PageAiLauncher';
import { type PageSwitcherCurrent } from '@/components/PageSwitcher';

interface WorkspaceAiConfig {
  label: string;
  title?: string;
  open: boolean;
  onOpen: () => void;
}

interface PageWorkspaceChromeProps {
  current: PageSwitcherCurrent;
  ai?: WorkspaceAiConfig;
  switcherClassName?: string;
  aiClassName?: string;
}

export function PageWorkspaceChrome({
  current,
  ai,
  aiClassName,
}: PageWorkspaceChromeProps) {
  return (
    <div
      data-page-workspace-chrome="true"
      data-page-workspace-current={current}
      data-page-workspace-ai={ai ? (ai.open ? 'open' : 'closed') : 'none'}
      className="contents"
    >
      {ai && (
        <PageAiLauncher
          label={ai.label}
          title={ai.title}
          hidden={ai.open}
          onClick={ai.onOpen}
          className={aiClassName}
        />
      )}
    </div>
  );
}
