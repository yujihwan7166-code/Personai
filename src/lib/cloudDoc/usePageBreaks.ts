/**
 * 본문 element 의 scrollHeight 를 측정해 페이지 단위 break 위치 계산.
 *
 *  - 한 페이지 가용 높이 (pageHeightPx) 마다 break y 좌표 push
 *  - ResizeObserver + MutationObserver 로 본문 변경 자동 감지 (debounce 200ms)
 *  - 반환: pageBreaks (px y 좌표 배열) + totalPages
 *
 * 정책:
 *  - 본문 흐름 자체는 분할 X (ProseMirror doc 그대로)
 *  - overlay 로 시각적 break 만 표시 — 단락이 break 위치에 걸쳐도 흐름 유지
 *  - "진짜 페이지 단위 ProseMirror 분할" 은 D 단계 (요청 외, 불가능)
 */

import { useEffect, useState } from 'react';

export interface PageBreakInfo {
  pageBreaks: number[];  // break y 좌표 (px). 첫 break = 두 번째 페이지 시작.
  totalPages: number;
}

export function usePageBreaks(
  contentEl: HTMLElement | null,
  pageHeightPx: number,
): PageBreakInfo {
  const [info, setInfo] = useState<PageBreakInfo>({ pageBreaks: [], totalPages: 1 });

  useEffect(() => {
    if (!contentEl || pageHeightPx <= 0) {
      setInfo({ pageBreaks: [], totalPages: 1 });
      return;
    }
    let t: ReturnType<typeof setTimeout> | null = null;
    const recalc = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        const h = contentEl.scrollHeight;
        const arr: number[] = [];
        let y = pageHeightPx;
        // 1px 마진 — scrollHeight 가 pageHeight 와 동일할 때 빈 페이지 추가 방지
        while (y + 1 < h) {
          arr.push(y);
          y += pageHeightPx;
        }
        setInfo({ pageBreaks: arr, totalPages: arr.length + 1 });
      }, 200);
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(contentEl);
    const mo = new MutationObserver(recalc);
    mo.observe(contentEl, { childList: true, subtree: true, characterData: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
      if (t) clearTimeout(t);
    };
  }, [contentEl, pageHeightPx]);

  return info;
}
