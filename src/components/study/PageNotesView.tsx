import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FileText, RefreshCw, Image as ImageIcon, ExternalLink, Copy } from 'lucide-react';
import { LazyMarkdown } from '@/components/LazyMarkdown';
import { cn } from '@/lib/utils';
import type { PageNote, PageNoteGroup, SummaryDensity } from '@/types/study';

interface Props {
  notes: PageNote[];
  groups?: PageNoteGroup[];
  density: SummaryDensity;
  onChangeDensity: (d: SummaryDensity) => void;
  onLoadDetail: (pages: number[]) => void;
  detailLoadingPages: number[];
  onRegeneratePage: (page: number) => void;
  onJumpToPage?: (page: number) => void;
  /** 현재 PDF 뷰어가 보고 있는 페이지(있으면 카드 하이라이트) */
  currentViewerPage?: number;
}

export function PageNotesView({
  notes,
  groups,
  density,
  onChangeDensity,
  onLoadDetail,
  detailLoadingPages,
  onRegeneratePage,
  onJumpToPage,
  currentViewerPage,
}: Props) {
  const [expandedPages, setExpandedPages] = useState<Set<number>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const noteByPage = useMemo(() => {
    const m = new Map<number, PageNote>();
    for (const n of notes) m.set(n.page, n);
    return m;
  }, [notes]);

  const ungrouped = useMemo(() => {
    if (!groups || groups.length === 0) return notes;
    const inGroup = new Set<number>();
    for (const g of groups) for (const p of g.pages) inGroup.add(p);
    return notes.filter((n) => !inGroup.has(n.page));
  }, [notes, groups]);

  const togglePage = (page: number) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(page)) {
        next.delete(page);
      } else {
        next.add(page);
        const note = noteByPage.get(page);
        if (note && !note.body && note.kind !== 'image-only') {
          onLoadDetail([page]);
        }
      }
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandGroup = (g: PageNoteGroup) => {
    const needFetch: number[] = [];
    setExpandedPages((prev) => {
      const next = new Set(prev);
      for (const p of g.pages) {
        next.add(p);
        const note = noteByPage.get(p);
        if (note && !note.body && note.kind !== 'image-only') needFetch.push(p);
      }
      return next;
    });
    if (needFetch.length > 0) onLoadDetail(needFetch);
  };

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-1 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-100 dark:border-slate-800">
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          총 {notes.length}페이지
          {groups && groups.length > 0 && ` · ${groups.length}개 챕터`}
        </p>
        <DensityToggle value={density} onChange={onChangeDensity} />
      </div>

      <div className="space-y-3 pt-3">
        {groups && groups.length > 0 && groups.map((g) => {
          const collapsed = collapsedGroups.has(g.id);
          return (
            <div key={g.id} className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50/70 dark:bg-slate-800/40">
                <button
                  onClick={() => toggleGroup(g.id)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  {collapsed
                    ? <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    : <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                  <span className="text-[12.5px] font-bold text-slate-800 dark:text-slate-200 truncate">{g.title}</span>
                  <span className="text-[10.5px] text-slate-400 tabular-nums shrink-0">
                    p.{g.pageRange[0]}–{g.pageRange[1]} · {g.pages.length}p
                  </span>
                </button>
                {!collapsed && (
                  <button
                    onClick={() => expandGroup(g)}
                    className="text-[10.5px] text-indigo-600 hover:text-indigo-800 font-semibold shrink-0"
                  >
                    전체 펼치기
                  </button>
                )}
              </div>
              {!collapsed && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {g.pages.map((p) => {
                    const note = noteByPage.get(p);
                    if (!note) return null;
                    return (
                      <PageCard
                        key={p}
                        note={note}
                        expanded={expandedPages.has(p)}
                        onToggle={() => togglePage(p)}
                        loading={detailLoadingPages.includes(p)}
                        onRegenerate={() => onRegeneratePage(p)}
                        onJump={onJumpToPage ? () => onJumpToPage(p) : undefined}
                        active={currentViewerPage === p}
                        density={density}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {ungrouped.length > 0 && (
          <div className={cn(
            'rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60',
            groups && groups.length > 0 && 'mt-3',
          )}>
            {ungrouped.map((n) => (
              <PageCard
                key={n.page}
                note={n}
                expanded={expandedPages.has(n.page)}
                onToggle={() => togglePage(n.page)}
                loading={detailLoadingPages.includes(n.page)}
                onRegenerate={() => onRegeneratePage(n.page)}
                onJump={onJumpToPage ? () => onJumpToPage(n.page) : undefined}
                active={currentViewerPage === n.page}
                density={density}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PageCard({
  note, expanded, onToggle, loading, onRegenerate, onJump, active, density,
}: {
  note: PageNote;
  expanded: boolean;
  onToggle: () => void;
  loading: boolean;
  onRegenerate: () => void;
  onJump?: () => void;
  active?: boolean;
  density: SummaryDensity;
}) {
  const isImageOnly = note.kind === 'image-only';
  const hasBody = !!note.body;
  const onelineMode = density === 'oneline';

  return (
    <div className={cn(
      'transition-colors',
      active && 'bg-indigo-50/40 dark:bg-indigo-950/20 ring-2 ring-inset ring-indigo-200 dark:ring-indigo-900/50',
      isImageOnly && 'bg-slate-50/60 dark:bg-slate-900/40',
    )}>
      <button
        onClick={onelineMode ? (onJump ?? onToggle) : onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
      >
        <span className={cn(
          'inline-flex items-center justify-center rounded-md px-1.5 h-5 text-[10px] font-bold tabular-nums shrink-0',
          isImageOnly
            ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
        )}>
          p.{note.page}
        </span>
        {note.title && (
          <span className="text-[11.5px] font-semibold text-slate-800 dark:text-slate-200 shrink-0 max-w-[35%] truncate">
            {note.title}
          </span>
        )}
        <span className={cn(
          'text-[12px] flex-1 min-w-0 truncate',
          isImageOnly ? 'text-slate-500' : 'text-slate-700 dark:text-slate-300',
        )}>
          {isImageOnly && <ImageIcon className="inline h-3 w-3 mr-1 -mt-0.5 text-slate-400" />}
          {note.oneLiner}
        </span>
        {!onelineMode && !isImageOnly && (
          expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        )}
      </button>

      {!onelineMode && expanded && !isImageOnly && (
        <div className="px-3 pb-3">
          {loading && !hasBody ? (
            <div className="space-y-1.5 pl-7 pt-1">
              <div className="study-shimmer h-3 w-[92%] rounded" />
              <div className="study-shimmer h-3 w-[85%] rounded" />
              <div className="study-shimmer h-3 w-[70%] rounded" />
            </div>
          ) : note.status === 'error' ? (
            <div className="pl-7 pt-1 flex items-center gap-2">
              <p className="text-[11.5px] text-rose-600">이 페이지를 정리하지 못했어요.</p>
              <button
                onClick={onRegenerate}
                className="text-[10.5px] text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                다시 시도
              </button>
            </div>
          ) : hasBody ? (
            <>
              <div className="pl-7 prose prose-sm max-w-none text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-300 [&_strong]:text-slate-900 dark:[&_strong]:text-slate-100 [&_p]:my-1.5">
                <LazyMarkdown content={note.body!} />
              </div>
              <div className="pl-7 mt-2 flex items-center gap-3 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                {onJump && (
                  <button
                    onClick={onJump}
                    className="inline-flex items-center gap-1 text-[10.5px] text-slate-500 hover:text-indigo-700"
                  >
                    <ExternalLink className="h-3 w-3" /> 원본 보기
                  </button>
                )}
                <button
                  onClick={onRegenerate}
                  disabled={loading}
                  className="inline-flex items-center gap-1 text-[10.5px] text-slate-500 hover:text-indigo-700 disabled:opacity-40"
                >
                  <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} /> 이 페이지만 다시
                </button>
                <button
                  onClick={() => navigator.clipboard?.writeText(note.body!)}
                  className="inline-flex items-center gap-1 text-[10.5px] text-slate-500 hover:text-indigo-700"
                >
                  <Copy className="h-3 w-3" /> 복사
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function DensityToggle({ value, onChange }: { value: SummaryDensity; onChange: (d: SummaryDensity) => void }) {
  const items: { id: SummaryDensity; label: string }[] = [
    { id: 'oneline', label: '한 줄' },
    { id: 'standard', label: '표준' },
    { id: 'detailed', label: '자세히' },
  ];
  return (
    <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={cn(
            'px-2 py-0.5 text-[10.5px] font-semibold transition-colors',
            value === it.id
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
          )}
          title={it.id === 'oneline' ? '목차처럼 한 줄만' : it.id === 'standard' ? '3-5문장' : '7-10문장 + 예시'}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function PageNotesEmptyChooser({
  pageCount, onPick, pagesDisabled, pagesDisabledReason, visionAvailable, onPickVision,
}: {
  pageCount: number | undefined;
  onPick: (mode: 'pages' | 'whole') => void;
  /** true 면 페이지별 카드를 비활성화하고 이유를 표시 */
  pagesDisabled?: boolean;
  pagesDisabledReason?: string;
  /** 스캔본/이미지 PDF 일 때 비전 옵션 노출 */
  visionAvailable?: boolean;
  onPickVision?: () => void;
}) {
  const recommendPages = (pageCount ?? 0) >= 11 && !pagesDisabled;
  return (
    <div className="px-6 py-10">
      <div className="text-center mb-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40 mb-3">
          <FileText className="h-5 w-5 text-indigo-500" strokeWidth={1.8} />
        </div>
        <p className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100 mb-1">
          어떤 방식으로 정리할까요?
        </p>
        <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
          {pageCount ? `${pageCount}페이지 자료 · 둘 다 사용해볼 수 있어요` : '둘 다 사용해볼 수 있어요'}
        </p>
      </div>
      <div className={cn('grid grid-cols-1 gap-3 max-w-2xl mx-auto', visionAvailable ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
        <button
          onClick={() => onPick('pages')}
          disabled={pagesDisabled}
          className={cn(
            'group relative text-left rounded-xl border p-4 transition-all',
            pagesDisabled
              ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-70'
              : recommendPages
              ? 'border-indigo-300 bg-indigo-50/40 hover:border-indigo-500 hover:shadow-md'
              : 'border-slate-200 hover:border-indigo-300 hover:shadow-md',
          )}
        >
          {recommendPages && (
            <span className="absolute top-2 right-2 text-[9.5px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">⭐ 추천</span>
          )}
          {pagesDisabled && (
            <span className="absolute top-2 right-2 text-[9.5px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">사용 불가</span>
          )}
          <div className="text-2xl mb-2">📑</div>
          <p className="text-[12.5px] font-bold text-slate-900 dark:text-slate-100 mb-1">페이지별 정리</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            {pagesDisabled
              ? pagesDisabledReason ?? '이 자료에서는 사용할 수 없어요.'
              : '1p, 2p, 3p… 페이지마다 노트를 만들어 PDF 와 1:1 로 따라봐요. 긴 자료에 강해요.'}
          </p>
        </button>
        <button
          onClick={() => onPick('whole')}
          className={cn(
            'group relative text-left rounded-xl border p-4 transition-all hover:shadow-md',
            !recommendPages
              ? 'border-indigo-300 bg-indigo-50/40 hover:border-indigo-500'
              : 'border-slate-200 hover:border-indigo-300',
          )}
        >
          {!recommendPages && (
            <span className="absolute top-2 right-2 text-[9.5px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">⭐ 추천</span>
          )}
          <div className="text-2xl mb-2">📋</div>
          <p className="text-[12.5px] font-bold text-slate-900 dark:text-slate-100 mb-1">전체 한 번에 요약</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            자료 전체를 6~10개 대주제로 묶은 한 덩어리 마크다운.
            훑어보기·발표 도입부에 좋아요.
          </p>
        </button>
        {visionAvailable && onPickVision && (
          <button
            onClick={onPickVision}
            className="group relative text-left rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white p-4 transition-all hover:shadow-md hover:border-amber-500"
          >
            <span className="absolute top-2 right-2 text-[9.5px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">📷 NEW</span>
            <div className="text-2xl mb-2">🔍</div>
            <p className="text-[12.5px] font-bold text-slate-900 dark:text-slate-100 mb-1">이미지 인식으로 정리</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              스캔본·손글씨 PDF 도 OK. AI 가 페이지를 그림으로 직접 읽어 정리해요.
              <span className="block mt-1 text-amber-700 dark:text-amber-300 font-semibold">⏱️ 시간·비용 ↑</span>
            </p>
          </button>
        )}
      </div>
    </div>
  );
}

export function VisionConfirmModal({
  pageCount, onConfirm, onCancel, progress,
}: {
  pageCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  progress: { phase: 'render' | 'ai'; done: number; total: number } | null;
}) {
  const isRunning = !!progress;
  const phaseLabel = progress?.phase === 'render' ? '페이지를 이미지로 변환 중' : 'AI 가 페이지를 읽고 있어요';
  const pct = progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-700">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 shrink-0">
            <span className="text-xl">🔍</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-bold text-slate-900 dark:text-slate-100">이미지 인식으로 정리</h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
              AI 가 {pageCount} 페이지를 그림으로 보고 정리해요
            </p>
          </div>
        </div>

        {!isRunning ? (
          <>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-[11.5px] text-slate-700 dark:text-slate-300 leading-relaxed space-y-1.5 mb-4">
              <p><b>⏱️ 예상 시간:</b> 약 {Math.max(20, Math.round(pageCount * 0.7))}~{Math.round(pageCount * 1.5)}초</p>
              <p><b>💰 비용:</b> 텍스트 PDF 의 1.5~2배</p>
              <p><b>🎯 결과:</b> 도식·그림·손글씨까지 페이지별로 정리</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-[12.5px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                취소
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-2 text-[12.5px] font-semibold text-white"
              >
                시작하기
              </button>
            </div>
          </>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="study-shimmer h-3 w-3 rounded-full" />
              <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">{phaseLabel}…</p>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: progress?.phase === 'ai' ? '95%' : `${pct}%` }}
              />
            </div>
            <p className="text-[10.5px] text-slate-500 mt-1.5 tabular-nums">
              {progress?.phase === 'render'
                ? `${progress.done} / ${progress.total} 페이지`
                : '잠시만 기다려주세요…'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 페이지 인덱스를 챕터로 묶는 휴리스틱 ──
   - title 이 있는 페이지를 챕터 시작점으로
   - 같은 title 이 연속이면 하나의 챕터로
   - title 이 전혀 없으면 그룹 없이 ungrouped 로 처리
*/
export function buildPageGroups(notes: PageNote[]): PageNoteGroup[] {
  const sorted = [...notes].sort((a, b) => a.page - b.page);
  const titled = sorted.filter((n) => !!n.title?.trim());
  if (titled.length === 0) return [];

  const groups: PageNoteGroup[] = [];
  let currentTitle: string | null = null;
  let currentPages: number[] = [];

  const flush = () => {
    if (currentTitle && currentPages.length > 0) {
      groups.push({
        id: `g_${groups.length + 1}`,
        title: currentTitle,
        pageRange: [currentPages[0], currentPages[currentPages.length - 1]],
        pages: [...currentPages],
      });
    }
  };

  for (const n of sorted) {
    const title = n.title?.trim();
    if (title && title !== currentTitle) {
      flush();
      currentTitle = title;
      currentPages = [n.page];
    } else if (currentTitle) {
      currentPages.push(n.page);
    }
  }
  flush();

  if (groups.length <= 1) return [];
  return groups;
}
