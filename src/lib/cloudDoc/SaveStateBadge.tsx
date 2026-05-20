/** 에디터 헤더의 저장 상태 표시 (saving/saved/error/idle). 문서·시트·슬라이드 공용. */

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, RotateCw } from 'lucide-react';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface SaveStateBadgeProps {
  state: SaveState;
  /** epoch ms — 있으면 "저장됨 · 1분 전" 형식, 없으면 "저장됨". idle + 있으면 saved 처럼 표시. */
  lastSavedAt?: number;
  /** idle 일 때 "변경 없음" 표시 여부. 기본 false (시트/슬라이드는 안 보임, 문서는 true). */
  showIdle?: boolean;
  /** state === 'error' 일 때 클릭으로 즉시 재시도. 미제공이면 버튼 없음. */
  onRetry?: () => void;
}

export function SaveStateBadge({ state, lastSavedAt, showIdle = false, onRetry }: SaveStateBadgeProps) {
  // 상대 시각 자동 갱신 — saved/idle 일 때만 30초마다 re-render.
  // 1분 미만은 빨리 (10초), 그 위는 30초 간격.
  const showsRelTime = (state === 'saved' || state === 'idle') && Boolean(lastSavedAt);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!showsRelTime || !lastSavedAt) return;
    const elapsed = Date.now() - lastSavedAt;
    const interval = elapsed < 60_000 ? 10_000 : 30_000;
    const id = window.setInterval(() => tick((v) => v + 1), interval);
    return () => window.clearInterval(id);
  }, [showsRelTime, lastSavedAt]);

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
  if (state === 'saved' || (state === 'idle' && lastSavedAt)) {
    const rel = lastSavedAt ? formatRelTime(lastSavedAt) : '';
    return (
      <span
        className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
        title={lastSavedAt ? new Date(lastSavedAt).toLocaleString('ko-KR') : '모든 변경 사항이 저장됨'}
        aria-live="polite"
      >
        <CheckCircle2 className="w-3 h-3" />
        {rel ? `저장됨 · ${rel}` : '저장됨'}
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
        <span>저장 실패</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-1 px-1.5 py-0.5 rounded border border-destructive/40 hover:bg-destructive/10 text-[11px] flex items-center gap-1"
            title="지금 다시 저장 시도"
          >
            <RotateCw className="w-3 h-3" /> 다시
          </button>
        )}
      </span>
    );
  }
  if (showIdle) {
    return (
      <span
        className="text-muted-foreground/60 text-[11px]"
        title="아직 변경 사항 없음 — 본문 수정 시 자동 저장됩니다."
      >
        변경 없음
      </span>
    );
  }
  return null;
}

/** 마지막 저장 시각을 "방금" / "1분 전" / "1시간 전" / "어제" 형식으로. */
function formatRelTime(at: number): string {
  const sec = Math.floor((Date.now() - at) / 1000);
  if (sec < 5) return '방금';
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day === 1) return '어제';
  if (day < 7) return `${day}일 전`;
  return new Date(at).toLocaleDateString('ko-KR');
}
