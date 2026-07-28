/** AI 액션 메타데이터 + 컨텍스트 추출 + 결과 위치 자동 추정.
 *  Q5 (액션별 자동 컨텍스트) + Q9 (스마트 디폴트 위치) 결정 반영.
 */

import type { Editor } from '@tiptap/react';
import {
  aiSummarize, aiRewrite, aiTranslate, aiChangeTone, aiContinue,
  aiMakeLonger, aiMakeShorter, aiKeyPoints, aiExtractActions, aiFixGrammar,
  aiBuildToc, aiToTable, aiToList, aiToQuestions, aiSuggestTitle, aiCustom,
  type Lang, type Tone,
} from '@/lib/ai/quick';

export type ActionGroup = 'writing' | 'transform' | 'structure';

/** 결과를 본문 어디에 넣을지 — Q9 D 결정. */
export type ResultPlacement =
  | 'replace'     // 선택 영역 치환 (기본)
  | 'after'       // 선택 끝 뒤에 새 단락
  | 'before'      // 선택 시작 앞에 새 단락
  | 'doc-top'     // 문서 맨 위
  | 'doc-end'     // 문서 맨 끝
  | 'cursor'      // 현재 커서 위치
  | 'copy';       // 본문 미수정, 클립보드만

/** 액션이 필요로 하는 컨텍스트 종류. */
export type ContextScope =
  | 'selection'           // 선택 영역만 (없으면 에러)
  | 'selection-or-doc'    // 선택 없으면 전체 문서
  | 'before-cursor'       // 커서 이전 ~2,000자
  | 'around-selection'    // 선택 + 앞뒤 1~2 단락
  | 'custom';             // 자유 입력은 별도 처리

export interface AiActionDef {
  id: string;
  label: string;
  icon: string;            // emoji
  group: ActionGroup;
  /** 클릭 시 추가 옵션 메뉴 (번역 언어/톤 종류). undefined 면 즉시 실행. */
  subOptions?: Array<{ id: string; label: string }>;
  scope: ContextScope;
  defaultPlacement: ResultPlacement;
  /** 컨텍스트 + (서브옵션이 있으면) subId 받아 결과 텍스트 반환. */
  run: (ctx: string, subId?: string) => Promise<string>;
  /** "텍스트 선택 필요" 같은 hint — UI 에 표시. */
  needsSelectionHint?: string;
}

/** 자유 입력은 별도 함수. */
export async function runCustomAction(prompt: string, context: string): Promise<string> {
  return aiCustom(prompt, context);
}

// ─────────────────────────────────────────────
// 14 액션 정의
// ─────────────────────────────────────────────

export const AI_ACTIONS: AiActionDef[] = [
  // 글쓰기 (6)
  {
    id: 'rewrite-clear',
    label: '재작성 — 명확하게',
    icon: '✏',
    group: 'writing',
    scope: 'selection',
    defaultPlacement: 'replace',
    needsSelectionHint: '먼저 텍스트를 선택하세요',
    run: (ctx) => aiRewrite(ctx, '명확'),
  },
  {
    id: 'rewrite-concise',
    label: '재작성 — 간결하게',
    icon: '✏',
    group: 'writing',
    scope: 'selection',
    defaultPlacement: 'replace',
    needsSelectionHint: '먼저 텍스트를 선택하세요',
    run: (ctx) => aiRewrite(ctx, '간결'),
  },
  {
    id: 'make-longer',
    label: '더 길게',
    icon: '🔍',
    group: 'writing',
    scope: 'selection',
    defaultPlacement: 'replace',
    needsSelectionHint: '먼저 텍스트를 선택하세요',
    run: (ctx) => aiMakeLonger(ctx),
  },
  {
    id: 'make-shorter',
    label: '더 짧게',
    icon: '✂',
    group: 'writing',
    scope: 'selection',
    defaultPlacement: 'replace',
    needsSelectionHint: '먼저 텍스트를 선택하세요',
    run: (ctx) => aiMakeShorter(ctx),
  },
  {
    id: 'continue',
    label: '이어쓰기',
    icon: '⏭',
    group: 'writing',
    scope: 'before-cursor',
    defaultPlacement: 'after',
    run: (ctx) => aiContinue(ctx),
  },
  {
    id: 'change-tone',
    label: '톤 변경',
    icon: '🎭',
    group: 'writing',
    subOptions: [
      { id: '친근하게', label: '친근하게' },
      { id: '전문적으로', label: '전문적으로' },
      { id: '간결하게', label: '간결하게' },
      { id: '유머있게', label: '유머있게' },
    ],
    scope: 'selection',
    defaultPlacement: 'replace',
    needsSelectionHint: '먼저 텍스트를 선택하세요',
    run: (ctx, subId) => aiChangeTone(ctx, (subId ?? '친근하게') as Tone),
  },

  // 변환·정리 (4)
  {
    id: 'translate',
    label: '번역',
    icon: '🌐',
    group: 'transform',
    subOptions: [
      { id: '영어', label: '영어' },
      { id: '일본어', label: '일본어' },
      { id: '중국어 간체', label: '중국어 간체' },
      { id: '한국어', label: '한국어' },
    ],
    scope: 'selection',
    defaultPlacement: 'replace',
    needsSelectionHint: '먼저 텍스트를 선택하세요',
    run: (ctx, subId) => aiTranslate(ctx, (subId ?? '영어') as Lang),
  },
  {
    id: 'summarize',
    label: '요약',
    icon: '📝',
    group: 'transform',
    scope: 'selection-or-doc',
    defaultPlacement: 'before',  // 원본 위에 요약 (원본 보존)
    run: (ctx) => aiSummarize(ctx),
  },
  {
    id: 'key-points',
    label: '핵심 추출',
    icon: '💡',
    group: 'transform',
    scope: 'selection-or-doc',
    defaultPlacement: 'after',
    run: (ctx) => aiKeyPoints(ctx),
  },
  {
    id: 'extract-actions',
    label: '액션 아이템 추출',
    icon: '📋',
    group: 'transform',
    scope: 'selection-or-doc',
    defaultPlacement: 'doc-end',
    run: (ctx) => aiExtractActions(ctx),
  },
  {
    id: 'fix-grammar',
    label: '맞춤법 교정',
    icon: '🔤',
    group: 'transform',
    scope: 'selection',
    defaultPlacement: 'replace',
    needsSelectionHint: '먼저 텍스트를 선택하세요',
    run: (ctx) => aiFixGrammar(ctx),
  },

  // 구조 변환 (5)
  {
    id: 'build-toc',
    label: '목차 만들기',
    icon: '📑',
    group: 'structure',
    scope: 'selection-or-doc',
    defaultPlacement: 'doc-top',
    run: (ctx) => aiBuildToc(ctx),
  },
  {
    id: 'to-table',
    label: '표로 변환',
    icon: '📊',
    group: 'structure',
    scope: 'selection',
    defaultPlacement: 'replace',
    needsSelectionHint: '표로 만들 정보를 선택하세요',
    run: (ctx) => aiToTable(ctx),
  },
  {
    id: 'to-list',
    label: '리스트로 변환',
    icon: '•',
    group: 'structure',
    scope: 'selection',
    defaultPlacement: 'replace',
    needsSelectionHint: '먼저 텍스트를 선택하세요',
    run: (ctx) => aiToList(ctx),
  },
  {
    id: 'to-questions',
    label: '질문으로 변환',
    icon: '❓',
    group: 'structure',
    scope: 'selection-or-doc',
    defaultPlacement: 'after',
    run: (ctx) => aiToQuestions(ctx),
  },
  {
    id: 'suggest-title',
    label: '제목 제안',
    icon: '🎯',
    group: 'structure',
    scope: 'selection-or-doc',
    defaultPlacement: 'copy',  // 그냥 보여주고 사용자 선택
    run: (ctx) => aiSuggestTitle(ctx),
  },
];

export const AI_GROUP_LABEL: Record<ActionGroup, string> = {
  writing: '글쓰기',
  transform: '변환·정리',
  structure: '구조 변환',
};

// ─────────────────────────────────────────────
// 컨텍스트 추출 — Q5 D (액션별 자동)
// ─────────────────────────────────────────────

export interface AiContext {
  /** 사용자에게 보여줄 짧은 설명 ("선택 12자" 등). */
  summary: string;
  /** AI 에 보낼 실제 텍스트. */
  text: string;
  /** 빈 컨텍스트면 true — 액션 실행 거부. */
  empty: boolean;
}

export function extractContext(editor: Editor, scope: ContextScope): AiContext {
  const { from, to } = editor.state.selection;
  const hasSelection = from !== to;
  const selectionText = hasSelection
    ? editor.state.doc.textBetween(from, to, '\n').trim()
    : '';

  if (scope === 'selection') {
    if (!selectionText) {
      return { summary: '(선택 없음)', text: '', empty: true };
    }
    return {
      summary: `선택 ${selectionText.length}자`,
      text: selectionText,
    };
  }

  if (scope === 'selection-or-doc') {
    if (selectionText) {
      return { summary: `선택 ${selectionText.length}자`, text: selectionText };
    }
    const docText = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n').trim();
    if (!docText) return { summary: '(빈 문서)', text: '', empty: true };
    return { summary: `문서 ${docText.length}자`, text: docText };
  }

  if (scope === 'before-cursor') {
    const before = editor.state.doc.textBetween(Math.max(0, from - 2000), from, '\n').trim();
    if (!before) return { summary: '(맥락 없음)', text: '', empty: true };
    return { summary: `앞 ${before.length}자`, text: before };
  }

  if (scope === 'around-selection') {
    // 선택 영역 + 앞뒤 ~1,000자
    const beforeStart = Math.max(0, from - 1000);
    const afterEnd = Math.min(editor.state.doc.content.size, to + 1000);
    const before = editor.state.doc.textBetween(beforeStart, from, '\n').trim();
    const sel = selectionText;
    const after = editor.state.doc.textBetween(to, afterEnd, '\n').trim();
    if (!sel && !before && !after) return { summary: '(빈 문서)', text: '', empty: true };
    const parts: string[] = [];
    if (before) parts.push(`[앞 단락]\n${before}`);
    if (sel) parts.push(`[선택]\n${sel}`);
    if (after) parts.push(`[뒤 단락]\n${after}`);
    return { summary: sel ? `선택 + 앞뒤 ${sel.length}자 중심` : '주변 단락만', text: parts.join('\n\n') };
  }

  // custom (자유 입력) — 호출자가 별도 처리
  return { summary: '(자유)', text: selectionText };
}
