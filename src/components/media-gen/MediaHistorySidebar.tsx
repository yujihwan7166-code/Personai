import { useEffect, useMemo, useState } from 'react';
import {
  PanelLeftClose, PanelLeftOpen, Image as ImageIcon, Film, Loader2, AlertCircle,
  Search, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { groupByTime, type MediaItem } from '@/types/mediaGen';
import { getMediaObjectURL } from '@/lib/mediaGenStore';

interface Props {
  items: MediaItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/**
 * 좌측 히스토리 사이드바 — 시간 그룹 + 프롬프트 검색 + 감정 hook 빈 상태.
 * ChatGPT · MJ · Claude 혼합 패턴.
 */
export function MediaHistorySidebar({
  items, selectedId, onSelect, collapsed, onToggleCollapsed,
}: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.prompt.toLowerCase().includes(q));
  }, [items, query]);

  const groups = useMemo(() => groupByTime(filtered), [filtered]);

  // 검색 시 펼침 유지 · 접힘 상태에서 검색 비활성
  const showSearch = !collapsed;

  return (
    <aside
      className={cn(
        'shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col transition-[width] duration-200 overflow-hidden',
        collapsed ? 'w-[56px]' : 'w-[240px]',
      )}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 dark:border-slate-800">
        {!collapsed && (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            히스토리
          </span>
        )}
        <button
          onClick={onToggleCollapsed}
          className="h-6 w-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label={collapsed ? '히스토리 펼치기' : '히스토리 접기'}
          title={collapsed ? '펼치기' : '접기'}
        >
          {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* 검색 */}
      {showSearch && (
        <div className="px-3 pt-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/70">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="프롬프트 검색"
              className="w-full h-7 pl-6 pr-2 text-[11.5px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-indigo-400 placeholder:text-slate-400"
            />
          </div>
        </div>
      )}

      {/* 리스트 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {items.length === 0 ? (
          !collapsed && (
            <div className="p-6 text-center">
              <div className="mx-auto inline-flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-indigo-100 to-pink-100 dark:from-indigo-950/40 dark:to-pink-950/40 mb-3">
                <Sparkles className="h-5 w-5 text-indigo-500" strokeWidth={1.75} />
              </div>
              <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                내 작품이 쌓이는 공간이에요
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                아래 입력창에서<br />첫 작품을 시작해보세요 ↓
              </p>
            </div>
          )
        ) : collapsed ? (
          <ul className="py-1">
            {items.slice(0, 10).map((item) => (
              <li key={item.id}>
                <HistoryItemMini
                  item={item}
                  selected={item.id === selectedId}
                  onClick={() => onSelect(item.id)}
                />
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">'{query}'</span>로 찾은 작품이 없어요
            </p>
            <button
              onClick={() => setQuery('')}
              className="mt-2 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              검색 지우기
            </button>
          </div>
        ) : (
          <div className="pb-2">
            {groups.map((g) => (
              <div key={g.key} className="mb-1">
                <p className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {g.label} <span className="text-slate-400 font-medium tabular-nums">· {g.items.length}</span>
                </p>
                <ul>
                  {g.items.map((item) => (
                    <li key={item.id}>
                      <HistoryItemFull
                        item={item}
                        selected={item.id === selectedId}
                        onClick={() => onSelect(item.id)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function HistoryItemMini({
  item, selected, onClick,
}: { item: MediaItem; selected: boolean; onClick: () => void }) {
  const url = useMiniaturePreview(item);
  const busy = item.status === 'queued' || item.status === 'generating';
  const isError = item.status === 'error';

  return (
    <button
      onClick={onClick}
      className={cn(
        'group mx-auto block h-10 w-10 rounded-md overflow-hidden my-1 border transition-all',
        selected
          ? 'border-indigo-400 ring-2 ring-indigo-200 dark:ring-indigo-800'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500',
      )}
      title={item.prompt.slice(0, 80)}
      aria-label={item.prompt.slice(0, 80)}
    >
      {busy && (
        <div className="h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
          <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
        </div>
      )}
      {isError && (
        <div className="h-full w-full flex items-center justify-center bg-red-50 dark:bg-red-950/30">
          <AlertCircle className="h-3 w-3 text-red-500" />
        </div>
      )}
      {!busy && !isError && url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : !busy && !isError ? (
        <div className="h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
          {item.kind === 'image' ? (
            <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <Film className="h-3.5 w-3.5 text-slate-400" />
          )}
        </div>
      ) : null}
    </button>
  );
}

function HistoryItemFull({
  item, selected, onClick,
}: { item: MediaItem; selected: boolean; onClick: () => void }) {
  const url = useMiniaturePreview(item);
  const busy = item.status === 'queued' || item.status === 'generating';
  const isError = item.status === 'error';

  return (
    <button
      onClick={onClick}
      className={cn(
        'group w-full px-2 py-1.5 flex items-center gap-2 transition-colors',
        selected
          ? 'bg-slate-100 dark:bg-slate-800'
          : 'hover:bg-slate-100 dark:hover:bg-slate-800/60',
      )}
    >
      <div
        className={cn(
          'h-10 w-10 rounded-md overflow-hidden shrink-0 border',
          selected
            ? 'border-indigo-400'
            : 'border-slate-200 dark:border-slate-700',
        )}
      >
        {busy && (
          <div className="h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
            <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
          </div>
        )}
        {isError && (
          <div className="h-full w-full flex items-center justify-center bg-red-50 dark:bg-red-950/30">
            <AlertCircle className="h-3 w-3 text-red-500" />
          </div>
        )}
        {!busy && !isError && url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : !busy && !isError ? (
          <div className="h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
            {item.kind === 'image' ? (
              <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <Film className="h-3.5 w-3.5 text-slate-400" />
            )}
          </div>
        ) : null}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <p className="text-[11.5px] text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">
          {item.prompt || '(제목 없음)'}
        </p>
        <p className="text-[9.5px] text-slate-400 mt-0.5 flex items-center gap-1">
          <span className={cn(
            'inline-block h-1.5 w-1.5 rounded-full',
            item.kind === 'image' ? 'bg-indigo-400' : 'bg-pink-400',
          )} />
          {item.kind === 'image' ? '이미지' : '동영상'}
        </p>
      </div>
    </button>
  );
}

function useMiniaturePreview(item: MediaItem): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked = false;
    let urlToRevoke: string | null = null;
    if (item.kind === 'image' && item.blobRef && item.status === 'ready') {
      (async () => {
        const u = await getMediaObjectURL(item.blobRef!).catch(() => null);
        if (revoked) {
          if (u) URL.revokeObjectURL(u);
          return;
        }
        urlToRevoke = u;
        setUrl(u);
      })();
    } else if (item.kind === 'video' && item.thumbnailUrl) {
      setUrl(item.thumbnailUrl);
    } else if (item.kind === 'image' && item.resultUrl && !item.blobRef) {
      setUrl(item.resultUrl);
    }
    return () => {
      revoked = true;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [item.id, item.kind, item.blobRef, item.resultUrl, item.thumbnailUrl, item.status]);
  return url;
}
