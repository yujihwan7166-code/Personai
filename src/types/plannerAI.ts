/**
 * 플래너 AI 컴패니언 타입.
 *
 * v1: 단일 세션, sessionStorage 보관. 멀티 대화 X.
 */

export type AIRole = 'user' | 'assistant';

/** AI 가 답변에 포함할 수 있는 제안 액션. 사용자가 확인 버튼 누르면 실제 적용. */
export type AIAction =
  | {
      type: 'add_event';
      title: string;
      /** ISO 8601. */
      startAt: string;
      endAt: string;
      note?: string;
    }
  | {
      type: 'add_scheduled_task';
      title: string;
      startAt: string;
      endAt: string;
      /** PlannerTask Priority 와 일치 (0=없음, 1=가장 높음, 3=낮음). */
      priority?: 0 | 1 | 2 | 3;
    }
  | {
      type: 'add_inbox_task';
      title: string;
      /** 'YYYY-MM-DD' — 시간 미배정이지만 그날 하기로. */
      plannedFor?: string;
      priority?: 0 | 1 | 2 | 3;
    };

export type AIActionStatus = 'pending' | 'applied' | 'canceled';

export interface AIActionInstance {
  /** AI 가 보낸 액션. */
  action: AIAction;
  status: AIActionStatus;
  /** 적용 후 생성된 항목 id (undo 용). */
  appliedId?: string;
}

export interface AIMessage {
  id: string;
  role: AIRole;
  content: string;
  /** 스트리밍 중. true 면 답변이 아직 흘러오는 중. */
  streaming?: boolean;
  /** 에러 표시. 있으면 빨간 톤 + 재시도 가능. */
  error?: string;
  /** AI 가 본문에 포함시킨 액션 제안들. 사용자가 [확인] 누르면 실제 적용. */
  actions?: AIActionInstance[];
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
