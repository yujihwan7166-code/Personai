import { PageAiComposer } from '@/components/PageAiScaffold';

interface AIComposerProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  loading: boolean;
  placeholder?: string;
  draft?: string;
  onDraftChange?: (value: string) => void;
  autoFocus?: boolean;
}

export const AIComposer = ({
  onSend,
  onStop,
  loading,
  placeholder,
  draft,
  onDraftChange,
  autoFocus = false,
}: AIComposerProps) => (
  <PageAiComposer
    onSend={onSend}
    onStop={onStop}
    loading={loading}
    placeholder={placeholder}
    draft={draft}
    onDraftChange={onDraftChange}
    autoFocus={autoFocus}
  />
);
