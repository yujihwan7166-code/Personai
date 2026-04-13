import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { MainMode } from '@/types/expert';

export type ModeTransitionPhase = 0 | 1 | 2 | 3;

interface UseMainModeTransitionOptions {
  mainMode: MainMode;
  applyModeChange: (mode: MainMode) => void;
  isInstantSwitch: (from: MainMode, to: MainMode) => boolean;
}

interface UseMainModeTransitionResult {
  pendingMode: MainMode | null;
  transitionPhase: ModeTransitionPhase;
  handleMainModeChange: (mode: MainMode) => void;
  contentVisible: boolean;
  showPlayerBg: boolean;
}

export function useMainModeTransition({
  mainMode,
  applyModeChange,
  isInstantSwitch,
}: UseMainModeTransitionOptions): UseMainModeTransitionResult {
  const [pendingMode, setPendingMode] = useState<MainMode | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<ModeTransitionPhase>(0);
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearScheduledTransitions = useCallback(() => {
    timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
  }, []);

  const scheduleTransition = useCallback((callback: () => void, delayMs: number) => {
    const timeoutId = setTimeout(() => {
      timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
      callback();
    }, delayMs);

    timeoutIdsRef.current.push(timeoutId);
  }, []);

  useEffect(() => {
    return () => {
      clearScheduledTransitions();
    };
  }, [clearScheduledTransitions]);

  const resetTransition = useCallback(() => {
    setTransitionPhase(0);
    setPendingMode(null);
  }, []);

  const handleMainModeChange = useCallback((nextMode: MainMode) => {
    if (nextMode === mainMode || transitionPhase !== 0) {
      return;
    }

    clearScheduledTransitions();

    if (isInstantSwitch(mainMode, nextMode)) {
      applyModeChange(nextMode);
      return;
    }

    const movingThroughPlayer = nextMode === 'player' || mainMode === 'player';
    const fadeOutDuration = movingThroughPlayer
      ? 200
      : (nextMode === 'debate' || mainMode === 'debate' ? 350 : 200);
    const phaseTwoDuration = movingThroughPlayer ? 400 : 0;
    const fadeInDuration = movingThroughPlayer
      ? 300
      : (nextMode === 'debate' || mainMode === 'debate' ? 400 : 250);

    setPendingMode(nextMode);
    setTransitionPhase(1);

    scheduleTransition(() => {
      if (movingThroughPlayer) {
        setTransitionPhase(2);
        scheduleTransition(() => {
          applyModeChange(nextMode);
          setTransitionPhase(3);
          scheduleTransition(resetTransition, fadeInDuration);
        }, phaseTwoDuration);
        return;
      }

      applyModeChange(nextMode);
      setTransitionPhase(3);
      scheduleTransition(resetTransition, fadeInDuration);
    }, fadeOutDuration);
  }, [
    applyModeChange,
    clearScheduledTransitions,
    isInstantSwitch,
    mainMode,
    resetTransition,
    scheduleTransition,
    transitionPhase,
  ]);

  const { contentVisible, showPlayerBg } = useMemo(() => {
    const isPlayerActive = mainMode === 'player';
    const isGoingToPlayer = pendingMode === 'player';
    const isLeavingPlayer = isPlayerActive && pendingMode !== null && pendingMode !== 'player';

    return {
      contentVisible: transitionPhase === 0 || transitionPhase === 3,
      showPlayerBg: isPlayerActive
        ? (isLeavingPlayer ? transitionPhase < 2 : true)
        : (isGoingToPlayer && transitionPhase >= 2),
    };
  }, [mainMode, pendingMode, transitionPhase]);

  return {
    pendingMode,
    transitionPhase,
    handleMainModeChange,
    contentVisible,
    showPlayerBg,
  };
}
