/** 문서 헤더의 글자/단어 수 뱃지 (선택 영역이 있으면 그 안만). */

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

/** 한국어 평균 묵독 속도 ~ 분당 500자 기준. 1분 미만은 1분으로 표시. */
function formatReadingTime(chars: number): string {
  if (chars <= 0) return '0분';
  const minutes = Math.max(1, Math.round(chars / 500));
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

export function WordCountBadge({ editor }: { editor: Editor }) {
  const [stats, setStats] = useState<{ chars: number; words: number; isSelection: boolean }>({
    chars: 0, words: 0, isSelection: false,
  });

  useEffect(() => {
    const compute = (): void => {
      const { from, to, empty } = editor.state.selection;
      const text = empty
        ? editor.getText({ blockSeparator: '\n' })
        : editor.state.doc.textBetween(from, to, '\n');
      const trimmed = text.trim();
      const chars = text.length;
      // 단순 v1: 공백/줄바꿈으로 split. 한글 음절 단위 단어 카운트는 v2.
      const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
      setStats({ chars, words, isSelection: !empty });
    };
    compute();
    editor.on('update', compute);
    editor.on('selectionUpdate', compute);
    return () => {
      editor.off('update', compute);
      editor.off('selectionUpdate', compute);
    };
  }, [editor]);

  if (stats.chars === 0) return null;
  const reading = formatReadingTime(stats.chars);
  return (
    <span
      className="ml-3 text-xs text-muted-foreground tabular-nums"
      title={
        stats.isSelection
          ? `선택 영역: ${stats.chars.toLocaleString('ko-KR')}자 / ${stats.words.toLocaleString('ko-KR')}단어 (공백 포함) · 예상 묵독 ${reading}`
          : `전체 문서: ${stats.chars.toLocaleString('ko-KR')}자 / ${stats.words.toLocaleString('ko-KR')}단어 (공백 포함) · 예상 묵독 ${reading} (분당 500자). 텍스트를 선택하면 그 영역만 통계로 표시.`
      }
      aria-live="polite"
    >
      {stats.isSelection && <span className="text-amber-600 dark:text-amber-400 mr-1">선택</span>}
      {stats.chars.toLocaleString('ko-KR')}자 · {stats.words.toLocaleString('ko-KR')}단어
      <span className="ml-2 text-muted-foreground/70">~{reading}</span>
    </span>
  );
}
