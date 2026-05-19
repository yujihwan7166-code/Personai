/** AI 결과 미리보기 카드 — Q3 B 결정.
 *  결과 표시 + Accept/Reject/재시도/수정 + 위치 옵션 (Q9 D).
 */

import { useState } from 'react';
import {
  Sparkles, Check, X, RotateCcw, Pencil, Copy as CopyIcon, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import type { ResultPlacement } from './aiActions';

interface AiPreviewCardProps {
  /** AI 가 만든 결과 텍스트. */
  result: string;
  /** 액션 이름 — "재작성", "요약" 등. 헤더 라벨. */
  actionLabel: string;
  /** 디폴트 위치 — 액션 정의에서 받음. */
  defaultPlacement: ResultPlacement;
  /** placement 가 가능한 값들 (액션마다 일부만 의미 있음). */
  availablePlacements?: ResultPlacement[];
  /** ✓ 수락 — 선택한 placement 로 본문에 넣기. */
  onAccept: (placement: ResultPlacement) => void;
  /** ✗ 버림 — 카드 닫고 본문 미수정. */
  onReject: () => void;
  /** ↻ 다시 — 같은 액션 재실행. */
  onRetry: () => void;
  /** ✏ 수정 — 결과를 사용자가 직접 편집 후 다시 수락. */
  onEdit?: (next: string) => void;
}

const PLACEMENT_LABEL: Record<ResultPlacement, { label: string; desc: string }> = {
  replace:   { label: '선택 영역 치환',     desc: '원본을 결과로 교체' },
  after:     { label: '뒤에 새 단락',        desc: '선택 끝 다음 줄에 삽입' },
  before:    { label: '앞에 새 단락',        desc: '선택 시작 이전 줄에 삽입' },
  'doc-top': { label: '문서 맨 위',          desc: '문서 시작 위치에 추가' },
  'doc-end': { label: '문서 맨 끝',          desc: '문서 끝에 추가' },
  cursor:    { label: '현재 커서 위치',      desc: '커서 자리에 삽입' },
  copy:      { label: '클립보드 복사',        desc: '본문 미수정 — 복사만' },
};

export function AiPreviewCard({
  result, actionLabel, defaultPlacement, availablePlacements,
  onAccept, onReject, onRetry, onEdit,
}: AiPreviewCardProps) {
  const [placement, setPlacement] = useState<ResultPlacement>(defaultPlacement);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(result);

  // 사용 가능한 placement (디폴트 + 나머지)
  const choices = availablePlacements ?? ['replace', 'after', 'before', 'doc-end', 'copy'];
  const placementInfo = PLACEMENT_LABEL[placement];

  return (
    <div
      className="absolute z-50 left-0 right-0 mx-auto max-w-2xl mt-1 rounded-lg border border-violet-300/50 dark:border-violet-700/50 bg-violet-50/80 dark:bg-violet-950/30 backdrop-blur shadow-lg overflow-hidden"
      role="dialog"
      aria-label="AI 결과 미리보기"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-violet-300/50 dark:border-violet-700/50 text-xs">
        <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" aria-hidden />
        <span className="font-medium text-violet-700 dark:text-violet-300">{actionLabel}</span>
        <span className="text-muted-foreground ml-auto">{result.length}자</span>
      </div>

      {/* 본문 — 결과 또는 편집창 */}
      <div className="px-3 py-2 bg-background/90 max-h-[40vh] overflow-y-auto">
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.min(12, Math.max(3, draft.split('\n').length))}
            className="w-full text-sm font-normal px-2 py-1 rounded border border-border bg-background outline-none focus:border-violet-400"
            autoFocus
            aria-label="결과 편집"
          />
        ) : (
          <pre className="text-sm font-sans whitespace-pre-wrap leading-relaxed break-words m-0">
            {result}
          </pre>
        )}
      </div>

      {/* 액션 바 */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-violet-300/50 dark:border-violet-700/50 bg-violet-100/60 dark:bg-violet-900/30">
        {/* 위치 선택 ▾ */}
        {placement !== 'copy' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 px-2 py-0.5 text-xs rounded hover:bg-background border border-transparent hover:border-border text-muted-foreground"
                title="결과를 어디에 넣을지"
              >
                <span>{placementInfo.label}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[180px]">
              {choices.map((p) => (
                <DropdownMenuItem key={p} onSelect={() => setPlacement(p)}>
                  <div className="flex flex-col">
                    <span className={cn('text-xs', p === placement && 'font-medium')}>
                      {PLACEMENT_LABEL[p].label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{PLACEMENT_LABEL[p].desc}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="flex-1" />

        {/* ✏ 수정 */}
        {!editing && onEdit && (
          <button
            type="button"
            onClick={() => { setDraft(result); setEditing(true); }}
            className="p-1 rounded hover:bg-background text-muted-foreground"
            title="결과 직접 수정"
            aria-label="수정"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {editing && (
          <button
            type="button"
            onClick={() => {
              onEdit?.(draft);
              setEditing(false);
            }}
            className="px-2 py-0.5 text-xs rounded bg-background hover:bg-muted border border-border"
            title="수정 적용"
          >
            적용
          </button>
        )}

        {/* ↻ 다시 */}
        <button
          type="button"
          onClick={onRetry}
          className="p-1 rounded hover:bg-background text-muted-foreground"
          title="다시 생성"
          aria-label="다시"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* ✗ 버림 */}
        <button
          type="button"
          onClick={onReject}
          className="p-1 rounded hover:bg-background text-muted-foreground"
          title="버림"
          aria-label="버림"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* ✓ 수락 — 클립보드 복사면 라벨 변경 */}
        <button
          type="button"
          onClick={() => {
            if (placement === 'copy') {
              void navigator.clipboard.writeText(editing ? draft : result);
              toast({ title: '복사됨' });
              onReject();  // 카드 닫음
            } else {
              onAccept(placement);
            }
          }}
          className="px-3 py-1 text-xs rounded bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1"
        >
          {placement === 'copy' ? (
            <>
              <CopyIcon className="w-3 h-3" />
              <span>복사</span>
            </>
          ) : (
            <>
              <Check className="w-3 h-3" />
              <span>수락</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
