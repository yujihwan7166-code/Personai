/** 문서 에디터 헤더의 저장 상태 표시 (saving/saved/error/idle). */

import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function SaveStateBadge({ state }: { state: SaveState }) {
  if (state === 'saving') {
    return (
      <span
        className="flex items-center gap-1 text-muted-foreground"
        title="변경 사항을 저장하는 중입니다 (자동 — 1초 디바운스)"
        aria-live="polite"
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        저장 중…
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span
        className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
        title="모든 변경 사항이 저장됨"
        aria-live="polite"
      >
        <CheckCircle2 className="w-3 h-3" />
        저장됨
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span
        className="flex items-center gap-1 text-destructive"
        title="저장 실패 — 변경 사항이 디스크에 반영되지 않았어요. 새로고침 전 백업하세요."
        aria-live="assertive"
      >
        <AlertCircle className="w-3 h-3" />
        저장 실패
      </span>
    );
  }
  return (
    <span
      className="text-muted-foreground/60 text-[11px]"
      title="아직 변경 사항 없음 — 본문 수정 시 자동 저장됩니다."
    >
      변경 없음
    </span>
  );
}
