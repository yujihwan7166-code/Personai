import { useEffect, useMemo, useRef } from 'react';
import {
  RefreshCw, Image as ImageIcon, ExternalLink, Copy, FileText, ClipboardList,
  ListChecks, Search,
} from 'lucide-react';
import { LazyMarkdown } from '@/components/LazyMarkdown';
import { cn } from '@/lib/utils';
import type { PageNote, PageChunk, SummaryDensity } from '@/types/study';

interface Props {
  notes: PageNote[];
  chunks?: PageChunk[];
  density: SummaryDensity;
  onChangeDensity: (d: SummaryDensity) => void;
  /** 챕터 단위 본문 fetch — 챕터 UI 는 숨겨졌지만 데이터는 백그라운드로 로드. */
  onLoadChunkDetail: (chunk: PageChunk) => void;
  /** 현재 본문 로딩 중인 챕터 id */
  loadingChunkId?: string | null;
  onRegeneratePage: (page: number) => void;
  onJumpToPage?: (page: number) => void;
  /** 현재 PDF 뷰어가 보고 있는 페이지(있으면 카드 하이라이트) */
  currentViewerPage?: number;
}

export function PageNotesView({
  notes,
  chunks,
  density,
  onChangeDensity,
  onLoadChunkDetail,
  onRegeneratePage,
  onJumpToPage,
  currentViewerPage,
}: Props) {
  const noteByPage = useMemo(() => {
    const m = new Map<number, PageNote>();
    for (const n of notes) m.set(n.page, n);
    return m;
  }, [notes]);

  // 페이지 번호 순 평탄화 — 챕터 그룹핑 없이 그냥 쭉 보여줌
  const sortedNotes = useMemo(() => [...notes].sort((a, b) => a.page - b.page), [notes]);

  // 챕터 자동 fetch — UI 는 숨겼지만 본문 로드 위해 모든 chunk 백그라운드 fetch.
  // [중요] 동시 호출 폭주 방지 — 1.5초 stagger 로 순차 트리거.
  // 한 번 fetch 한 chunk id 는 ref 에 기록해 재실행 시 스킵.
  const fetchedChunksRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!chunks || chunks.length === 0) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const fireNext = (idx: number) => {
      if (cancelled || idx >= chunks.length) return;
      const chunk = chunks[idx];
      if (!fetchedChunksRef.current.has(chunk.id)) {
        const needsFetch = chunk.pages.some((p) => {
          const note = noteByPage.get(p);
          return note && !note.body && note.kind !== 'image-only' && note.status !== 'error';
        });
        if (needsFetch) {
          fetchedChunksRef.current.add(chunk.id);
          onLoadChunkDetail(chunk);
        }
      }
      timeoutId = setTimeout(() => fireNext(idx + 1), 1500);
    };
    fireNext(0);
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [chunks, noteByPage, onLoadChunkDetail]);

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-1 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-100 dark:border-slate-800">
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          총 {notes.length}페이지
        </p>
        <DensityToggle value={density} onChange={onChangeDensity} />
      </div>

      <div className="pt-3 space-y-4">
        {sortedNotes.map((note) => (
          <PageRow
            key={note.page}
            note={note}
            density={density}
            active={currentViewerPage === note.page}
            onJump={onJumpToPage ? () => onJumpToPage(note.page) : undefined}
            onRegenerate={() => onRegeneratePage(note.page)}
          />
        ))}
      </div>
    </div>
  );
}

function PageRow({ note, density, active, onJump, onRegenerate }: {
  note: PageNote;
  density: SummaryDensity;
  active?: boolean;
  onJump?: () => void;
  onRegenerate: () => void;
}) {
  const isImageOnly = note.kind === 'image-only';
  const onelineMode = density === 'oneline';

  // Notion 스타일: 카드·border·배경 제거. 페이지번호 prefix + 흐름 텍스트.
  // hover 시에만 액션 아이콘 노출 (시각 노이즈 ↓).
  return (
    <div className={cn(
      'group/row relative pl-1 transition-colors',
      active && 'border-l-2 border-amber-400 -ml-1 pl-2',
    )}>
      <div className="flex items-baseline gap-2">
        <span className={cn(
          'text-[11px] font-mono tabular-nums shrink-0 select-none',
          isImageOnly ? 'text-slate-400' : 'text-slate-500 dark:text-slate-500',
        )}>
          p.{note.page}
        </span>
        {note.title && (
          <span className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-200">
            {note.title}
          </span>
        )}
        {!note.body && (
          <span className={cn(
            'text-[12.5px] flex-1 min-w-0',
            isImageOnly ? 'text-slate-500' : 'text-slate-700 dark:text-slate-300',
          )}>
            {isImageOnly && <ImageIcon className="inline h-3 w-3 mr-1 -mt-0.5 text-slate-400" />}
            {note.oneLiner}
          </span>
        )}
        {/* 액션 아이콘 — hover 시만 노출 (Notion 패턴) */}
        <div className="ml-auto flex items-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
          {onJump && (
            <button onClick={onJump} className="text-slate-400 hover:text-indigo-700" title="원본 보기">
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
          <button onClick={onRegenerate} className="text-slate-400 hover:text-indigo-700" title="이 페이지만 다시">
            <RefreshCw className="h-3 w-3" />
          </button>
          {note.body && (
            <button
              onClick={() => navigator.clipboard?.writeText(note.body!)}
              className="text-slate-400 hover:text-indigo-700"
              title="복사"
            >
              <Copy className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {!onelineMode && note.body && !isImageOnly && (
        <div className="mt-1 prose prose-sm max-w-none text-[13px] leading-[1.7] text-slate-700 dark:text-slate-300 [&_strong]:text-slate-900 dark:[&_strong]:text-slate-100 [&_p]:my-1.5">
          <LazyMarkdown content={note.body} />
        </div>
      )}
      {!onelineMode && !note.body && note.status === 'error' && (
        <p className="mt-1 text-[11.5px] text-rose-600">이 페이지를 정리하지 못했어요.</p>
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
  pageCount,
  visionAvailable,
  onStartVision,
  onStartText,
  onWhole,
  fallbackOnly,
  fallbackReason,
}: {
  pageCount: number | undefined;
  visionAvailable: boolean;
  onStartVision: () => void;
  onStartText: () => void;
  onWhole: () => void;
  /** true 면 페이지별 자체가 불가 → 전체 요약만 노출 */
  fallbackOnly?: boolean;
  fallbackReason?: string;
}) {
  // 페이지별 자체가 불가 — 안내 + 전체 요약 단일 버튼
  if (fallbackOnly) {
    return (
      <div className="px-6 py-10 flex flex-col items-center text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
          <FileText className="h-5 w-5 text-slate-500" strokeWidth={1.8} />
        </div>
        <p className="text-[14px] font-bold text-slate-900 dark:text-slate-100 mb-1">
          전체 요약으로 만들어 드릴게요
        </p>
        <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-5 max-w-sm">
          {fallbackReason ?? '페이지 단위로 나눌 수 있는 자료가 아니에요.'}
        </p>
        <button
          onClick={onWhole}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 text-[13px] font-bold shadow-sm"
        >
          <ClipboardList className="h-4 w-4" />
          전체 요약 시작
        </button>
      </div>
    );
  }

  // 일반 — 두 카드: 페이지별 / 전체 요약
  const recommendPages = (pageCount ?? 0) >= 11;
  const startPages = visionAvailable ? onStartVision : onStartText;
  const pagesHint = visionAvailable
    ? 'AI 가 페이지를 직접 읽어 도식·그림까지 정리'
    : '1p, 2p, 3p… 페이지마다 정리';

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
        <button
          onClick={startPages}
          className={cn(
            'group relative text-left rounded-xl border p-4 transition-all hover:shadow-md',
            recommendPages
              ? 'border-indigo-300 bg-indigo-50/40 hover:border-indigo-500'
              : 'border-slate-200 hover:border-indigo-300',
          )}
        >
          {recommendPages && (
            <span className="absolute top-2 right-2 text-[9.5px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">추천</span>
          )}
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <FileText className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </div>
          <p className="text-[12.5px] font-bold text-slate-900 dark:text-slate-100 mb-1">페이지별 정리</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            {pagesHint}.<br />PDF 와 1:1 로 따라보며 학습하기 좋아요.
          </p>
        </button>
        <button
          onClick={onWhole}
          className={cn(
            'group relative text-left rounded-xl border p-4 transition-all hover:shadow-md',
            !recommendPages
              ? 'border-indigo-300 bg-indigo-50/40 hover:border-indigo-500'
              : 'border-slate-200 hover:border-indigo-300',
          )}
        >
          {!recommendPages && (
            <span className="absolute top-2 right-2 text-[9.5px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">추천</span>
          )}
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <ListChecks className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </div>
          <p className="text-[12.5px] font-bold text-slate-900 dark:text-slate-100 mb-1">전체 한 번에 요약</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            자료 전체를 6~10개 대주제로 묶은 한 덩어리 마크다운.<br />훑어보기·발표 도입부에 좋아요.
          </p>
        </button>
      </div>
    </div>
  );
}

export function VisionProgressOverlay({
  pageCount, progress,
}: {
  pageCount: number;
  progress: { phase: 'render' | 'ai'; done: number; total: number };
}) {
  const phaseLabel = progress.phase === 'render' ? '페이지를 이미지로 변환 중' : 'AI 가 페이지를 읽고 있어요';
  const pct = Math.round((progress.done / Math.max(1, progress.total)) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-700">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 shrink-0">
            <Search className="h-[18px] w-[18px] text-indigo-600 dark:text-indigo-300" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[13.5px] font-bold text-slate-900 dark:text-slate-100">{phaseLabel}…</h3>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5">
              {pageCount} 페이지 자료
            </p>
          </div>
        </div>
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all"
            style={{ width: progress.phase === 'ai' ? '95%' : `${pct}%` }}
          />
        </div>
        <p className="text-[10.5px] text-slate-500 mt-1.5 tabular-nums">
          {progress.phase === 'render'
            ? `${progress.done} / ${progress.total} 페이지 변환`
            : '잠시만 기다려주세요…'}
        </p>
      </div>
    </div>
  );
}

/* ── chunks 가 누락된 응답일 때 클라이언트에서 폴백 chunk 를 만든다.
   - title 연속을 보고 묶거나 (없으면) 페이지 N개씩 균등 분할
*/
export function buildFallbackChunks(notes: PageNote[]): PageChunk[] {
  if (notes.length === 0) return [];
  const sorted = [...notes].sort((a, b) => a.page - b.page);
  const titled = sorted.filter((n) => !!n.title?.trim());
  if (titled.length >= 4) {
    const chunks: PageChunk[] = [];
    let curTitle: string | null = null;
    let curPages: number[] = [];
    const flush = () => {
      if (curTitle && curPages.length > 0) {
        chunks.push({
          id: `c_${chunks.length + 1}`,
          range: [curPages[0], curPages[curPages.length - 1]],
          pages: [...curPages],
          title: curTitle,
          summary: '',
        });
      }
    };
    for (const n of sorted) {
      const t = n.title?.trim();
      if (t && t !== curTitle) {
        flush();
        curTitle = t;
        curPages = [n.page];
      } else if (curTitle) {
        curPages.push(n.page);
      }
    }
    flush();
    if (chunks.length >= 2) return chunks;
  }

  // 균등 분할 (5~7개 chunk 목표)
  const total = sorted.length;
  const chunkCount = Math.min(7, Math.max(2, Math.round(total / 12)));
  const size = Math.ceil(total / chunkCount);
  const out: PageChunk[] = [];
  for (let i = 0; i < total; i += size) {
    const slice = sorted.slice(i, i + size);
    out.push({
      id: `c_${out.length + 1}`,
      range: [slice[0].page, slice[slice.length - 1].page],
      pages: slice.map((n) => n.page),
      title: `${slice[0].page}~${slice[slice.length - 1].page}p`,
      summary: '',
    });
  }
  return out;
}
