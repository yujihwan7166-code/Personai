/**
 * 플래너 AI 컴패니언 타입.
 *
 * v1: 단일 세션, sessionStorage 보관. 멀티 대화 X.
 */

export type AIRole = 'user' | 'assistant';

export interface AIMessage {
  id: string;
  role: AIRole;
  content: string;
  /** 스트리밍 중. true 면 답변이 아직 흘러오는 중. */
  streaming?: boolean;
  /** 에러 표시. 있으면 빨간 톤 + 재시도 가능. */
  error?: string;
  createdAt: string;
}

export interface AIChatState {
  messages: AIMessage[];
  /** 호출 중. UI 가 입력창 비활성화 + 로딩 인디케이터에 사용. */
  loading: boolean;
}

/** 사전 정의 빠른 액션. */
export interface AIQuickAction {
  id: string;
  label: string;
  /** 이 액션을 누르면 입력창에 채워질 (또는 바로 전송될) 사용자 프롬프트. */
  prompt: string;
  /** 어느 view 에서 의미 있는지. 명시 없으면 모든 view 표시. */
  visibleOn?: ReadonlyArray<'day' | 'week' | 'month' | 'year' | 'goals' | 'habits'>;
}
