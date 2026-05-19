/** AI 인라인 메뉴 — Q4 C (입력창 + 빠른 액션) + Q7 C+B (14 액션 + 그룹화).
 *
 *  Popover. 자유 입력창 위 / 14 액션 아래 — 글쓰기 / 변환·정리 / 구조 변환 3 그룹.
 *  서브옵션 있는 액션(번역/톤) 은 호버 또는 클릭 시 작은 서브메뉴.
 */

import { useEffect, useRef, useState } from 'react';
import { Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AI_ACTIONS, AI_GROUP_LABEL,
  type ActionGroup, type AiActionDef,
} from './aiActions';

export interface AiInlineMenuProps {
  /** 메뉴 열림 여부. */
  open: boolean;
  /** 닫기 콜백 (Esc / 외부 클릭 / 액션 후). */
  onClose: () => void;
  /** 자유 입력 prompt 실행. (값 = 사용자 입력 문자열) */
  onSubmitPrompt: (prompt: string) => void;
  /** 빠른 액션 실행. action 과 (있으면) subId 전달. */
  onRunAction: (action: AiActionDef, subId?: string) => void;
  /** AI 실행 중 — 메뉴 비활성·스피너 표시. */
  busy?: boolean;
  /** 현재 선택 영역 텍스트 (메뉴 헤더에 "선택 12자" 식 표시용). */
  selectionSummary?: string;
  /** 화면상 anchor — popover 위치. 부모가 처리. */
  className?: string;
}

const GROUP_ORDER: ActionGroup[] = ['writing', 'transform', 'structure'];

export function AiInlineMenu({
  open, onClose, onSubmitPrompt, onRunAction, busy, selectionSummary, className,
}: AiInlineMenuProps) {
  const [prompt, setPrompt] = useState('');
  const [activeSubAction, setActiveSubAction] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 열릴 때 자동 포커스 + 입력 초기화
  useEffect(() => {
    if (!open) return;
    setPrompt('');
    setActiveSubAction(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  // Esc 로 닫기 (input 안에서도)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // 그룹별 액션 묶기
  const grouped: Record<ActionGroup, AiActionDef[]> = {
    writing: [], transform: [], structure: [],
  };
  for (const a of AI_ACTIONS) grouped[a.group].push(a);

  const handleSubmit = () => {
    const text = prompt.trim();
    if (!text || busy) return;
    onSubmitPrompt(text);
  };

  return (
    <div
      className={cn(
        'absolute z-50 rounded-lg border border-violet-300/50 dark:border-violet-700/50',
        'bg-popover shadow-xl backdrop-blur w-[320px] max-h-[70vh] overflow-y-auto',
        className,
      )}
      role="dialog"
      aria-label="AI 메뉴"
    >
      {/* 헤더 — 자유 입력 */}
      <div className="p-2 border-b border-border bg-violet-50/40 dark:bg-violet-950/20">
        <div className="flex items-center gap-1 mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" aria-hidden />
          <span className="text-xs font-medium text-foreground">AI 에게 부탁</span>
          {selectionSummary && (
            <span className="text-[10px] text-muted-foreground ml-auto">{selectionSummary}</span>
          )}
        </div>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={busy}
            placeholder="예: 더 짧게, 친근하게, 영어 번역…"
            className="w-full text-xs px-2 py-1.5 pr-7 rounded border border-border bg-background outline-none focus:border-violet-400 disabled:opacity-50"
            aria-label="AI 자유 입력"
          />
          {busy ? (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-violet-500" />
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900/40 disabled:opacity-30"
              title="실행 (Enter)"
              aria-label="실행"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 빠른 액션 — 그룹별 */}
      <div className="py-1">
        {GROUP_ORDER.map((g) => (
          <section key={g}>
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
              {AI_GROUP_LABEL[g]}
            </div>
            <ul>
              {grouped[g].map((action) => {
                const hasSubs = !!action.subOptions?.length;
                const isActiveSub = activeSubAction === action.id;
                return (
                  <li key={action.id} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (hasSubs) {
                          setActiveSubAction(isActiveSub ? null : action.id);
                        } else {
                          onRunAction(action);
                        }
                      }}
                      disabled={busy}
                      className={cn(
                        'w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 transition-colors',
                        'hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed',
                        isActiveSub && 'bg-muted',
                      )}
                    >
                      <span className="w-4 text-center" aria-hidden>{action.icon}</span>
                      <span className="flex-1">{action.label}</span>
                      {hasSubs && <ChevronRight className="w-3 h-3 text-muted-foreground" aria-hidden />}
                    </button>
                    {isActiveSub && hasSubs && (
                      <ul className="border-t border-border bg-muted/40">
                        {action.subOptions!.map((sub) => (
                          <li key={sub.id}>
                            <button
                              type="button"
                              onClick={() => onRunAction(action, sub.id)}
                              disabled={busy}
                              className="w-full text-left px-8 py-1 text-xs hover:bg-muted disabled:opacity-50"
                            >
                              {sub.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
