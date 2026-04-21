/**
 * AI vs User 배틀 모드의 상태 묶음 — #19
 *
 * Index.tsx (7700줄) 에서 배틀 관련 useState 9개를 단일 훅으로 분리.
 * 기존 변수명과 세터명은 그대로 유지하여 호출부 수정 최소화.
 *
 * 사용:
 *   const aivs = useAivsBattleState();
 *   aivs.aivsRound, aivs.setAivsRound, aivs.reset() ...
 *
 * 또는 구조분해:
 *   const { aivsRound, setAivsRound, ... } = useAivsBattleState();
 */
import { useCallback, useState } from 'react';
import type { ActiveAivsBattleConfig } from '@/types/expert';

export function useAivsBattleState() {
  const [aivsRound, setAivsRound] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [aivsJudgments, setAivsJudgments] = useState<any[]>([]);
  const [aivsUserStance, setAivsUserStance] = useState<'pro' | 'con'>('pro');
  const [aivsTopic, setAivsTopic] = useState('');
  const [activeAivsBattleConfig, setActiveAivsBattleConfig] = useState<ActiveAivsBattleConfig | null>(null);
  const [hasAivsBattleStarted, setHasAivsBattleStarted] = useState(false);
  const [aivsBattleAutoStart, setAivsBattleAutoStart] = useState(0);

  /** 새 배틀 시작 전·종료 시 모든 상태를 초기값으로. */
  const reset = useCallback(() => {
    setAivsRound(0);
    setAivsJudgments([]);
    setAivsTopic('');
    setActiveAivsBattleConfig(null);
    setHasAivsBattleStarted(false);
    setAivsBattleAutoStart(0);
    setAivsUserStance('pro');
  }, []);

  return {
    // 상태
    aivsRound, aivsJudgments, aivsUserStance, aivsTopic,
    activeAivsBattleConfig, hasAivsBattleStarted, aivsBattleAutoStart,
    // 세터
    setAivsRound, setAivsJudgments, setAivsUserStance, setAivsTopic,
    setActiveAivsBattleConfig, setHasAivsBattleStarted, setAivsBattleAutoStart,
    // 유틸
    reset,
  };
}

export type AivsBattleState = ReturnType<typeof useAivsBattleState>;
