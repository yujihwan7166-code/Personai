/**
 * ComparisonTable — 비교표 (Mermaid 로 안 되는 진짜 표).
 *  - 반응형: 모바일에선 세로 카드로 자동 전환
 *  - PNG 내보내기 (html-to-image)
 *  - 풀스크린
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComparisonTable as TableData } from '@/types/study';
import { cn } from '@/lib/utils';
import { Maximize2, Minimize2, Download } from 'lucide-react';

interface Props {
  table: TableData;
  exportFilename?: string;
}

export function ComparisonTable({ table, exportFilename = 'comparison' }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // 컨테이너 너비로 narrow 여부 판단 (화면 너비가 아닌 패널 너비 기반)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setNarrow(entry.contentRect.width < 480);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const exportPng = useCallback(async () => {
    const target = ref.current?.querySelector('[data-export-target]') as HTMLElement | null;
    if (!target) return;
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(target, { pixelRatio: 2, backgroundColor: getComputedStyle(document.body).backgroundColor });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${exportFilename}.png`;
      a.click();
    } catch {
      /* 조용히 실패 */
    }
  }, [exportFilename]);

  return (
    <div
      ref={ref}
      className={cn(
        'relative rounded-xl border overflow-hidden',
        fullscreen
          ? 'fixed inset-0 z-[110] border-0 bg-white dark:bg-slate-950'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
      )}
    >
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <button
          onClick={exportPng}
          className="h-7 w-7 flex items-center justify-center rounded-md bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-700 shadow-sm"
          aria-label="PNG 저장"
          title="PNG 이미지로 저장"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setFullscreen((v) => !v)}
          className="h-7 w-7 flex items-center justify-center rounded-md bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-700 shadow-sm"
          aria-label={fullscreen ? '풀스크린 종료' : '풀스크린'}
        >
          {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div data-export-target className={cn('p-4 overflow-auto', fullscreen ? 'h-full' : 'max-h-[60vh]')}>
        {narrow ? (
          // 모바일: 세로 카드
          <div className="space-y-3">
            {table.rows.map((row, i) => (
              <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-[11.5px] font-bold text-slate-700 dark:text-slate-200">
                  {row.label}
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {table.columns.map((col, j) => (
                    <div key={j} className="flex items-start gap-2 px-3 py-2 text-[12px]">
                      <span className="shrink-0 w-20 text-[10.5px] font-semibold text-indigo-600 dark:text-indigo-300 pt-0.5">{col}</span>
                      <span className="flex-1 text-slate-700 dark:text-slate-200 leading-relaxed">{row.cells[j] ?? '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // 데스크톱: 정상 표
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-slate-50 dark:bg-slate-900 text-left px-3 py-2 border-b-2 border-slate-200 dark:border-slate-700 text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                    항목
                  </th>
                  {table.columns.map((c, i) => (
                    <th
                      key={i}
                      className="text-left px-3 py-2 border-b-2 border-slate-200 dark:border-slate-700 text-[12px] font-bold text-indigo-700 dark:text-indigo-300"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="sticky left-0 bg-white dark:bg-slate-900 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-200">
                      {row.label}
                    </td>
                    {row.cells.map((cell, j) => (
                      <td key={j} className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 leading-relaxed align-top">
                        {cell || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
