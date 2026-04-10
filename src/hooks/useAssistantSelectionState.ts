import { useCallback, useRef, useState } from 'react';

export function useAssistantSelectionState(initialCardId: string | null = null) {
  const [selectedAssistantCardId, setSelectedAssistantCardId] = useState<string | null>(initialCardId);
  const selectedAssistantCardRef = useRef<string | null>(initialCardId);

  const setSelectedAssistantCard = useCallback((cardId: string | null) => {
    selectedAssistantCardRef.current = cardId;
    setSelectedAssistantCardId(cardId);
  }, []);

  return {
    selectedAssistantCardId,
    selectedAssistantCardRef,
    setSelectedAssistantCard,
  };
}
