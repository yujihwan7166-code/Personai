import { useState } from 'react';
import { Mic, Play, MoreHorizontal, RefreshCw, X, ChevronDown, Pencil } from 'lucide-react';
import type { StudyNotebook, PodcastEpisode } from '@/types/study';
import { PODCAST_LENGTH_META, PODCAST_PURPOSE_META } from '@/types/study';
import { PodcastPlayer } from './PodcastPlayer';
import { cn } from '@/lib/utils';

interface Props {
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  onCreateNew: () => void;
  onRegenerate: (ep: PodcastEpisode) => void;
  onJumpToPage?: (page: number) => void;
}

export function PodcastDeckView({ notebook, onChange, onCreateNew, onRegenerate, onJumpToPage }: Props) {
  const episodes = (notebook.podcastEpisodes ?? []).slice().sort((a, b) => b.createdAt - a.createdAt);
  const [openId, setOpenId] = useState<string | null>(episodes[0]?.id ?? null);
  const [menuOpenKey, setMenuOpenKey] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>('');

  const renameEpisode = (id: string, next: string) => {
    const trimmed = next.trim();
    const all = notebook.podcastEpisodes ?? [];
    onChange({
      ...notebook,
      podcastEpisodes: all.map((e) => e.id === id ? { ...e, title: trimmed || e.title, updatedAt: Date.now() } : e),
    });
    setRenameId(null);
  };

  const deleteEpisode = (ep: PodcastEpisode) => {
    if (!confirm(`"${ep.title}" 에피소드를 삭제할까요?`)) return;
    const next = episodes.filter((e) => e.id !== ep.id);
    onChange({ ...notebook, podcastEpisodes: next });
    if (openId === ep.id) setOpenId(next[0]?.id ?? null);
  };

  const bumpPlayed = (id: string) => {
    const next = episodes.map((e) => e.id === id ? {
      ...e,
      playCount: (e.playCount ?? 0) + 1,
      lastPlayedAt: Date.now(),
    } : e);
    onChange({ ...notebook, podcastEpisodes: next });
  };

  return (
    <div className="space-y-3">
      <button
        onClick={onCreateNew}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 px-3 py-2 text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors"
      >
        <Mic className="h-3.5 w-3.5" /> 새 에피소드 만들기
      </button>

      {episodes.map((ep) => {
        const isOpen = openId === ep.id;
        const key = ep.id;
        const purposeMeta = PODCAST_PURPOSE_META[ep.purpose];
        const lengthMeta = PODCAST_LENGTH_META[ep.length];
        return (
          <div
            key={key}
            className={cn(
              'rounded-xl border bg-white dark:bg-slate-900 transition-colors',
              isOpen ? 'border-indigo-300 dark:border-indigo-700' : 'border-slate-200 dark:border-slate-800',
            )}
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/60 shrink-0">
                <Mic className="h-4 w-4 text-violet-600 dark:text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                {renameId === ep.id ? (
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={() => renameEpisode(ep.id, renameDraft)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); renameEpisode(ep.id, renameDraft); }
                      if (e.key === 'Escape') { setRenameId(null); }
                    }}
                    className="w-full rounded-md border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[12.5px] font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                    aria-label="에피소드 이름 변경"
                  />
                ) : (
                  <button
                    onClick={() => setOpenId(isOpen ? null : ep.id)}
                    onDoubleClick={(e) => { e.stopPropagation(); setRenameDraft(ep.title); setRenameId(ep.id); }}
                    className="w-full text-left"
                    title="더블클릭해서 이름 바꾸기"
                  >
                    <p className="text-[12.5px] font-bold text-slate-900 dark:text-slate-100 truncate">
                      {ep.title}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate tabular-nums">
                      {lengthMeta.label}
                      {ep.purposeLabel ? ` · ${ep.purposeLabel}` : ` · ${purposeMeta.label}`}
                      {ep.playCount ? ` · ${ep.playCount}회` : ''}
                      {ep.lastPlayedAt ? ` · ${timeAgo(ep.lastPlayedAt)}` : ` · ${timeAgo(ep.createdAt)}`}
                    </p>
                  </button>
                )}
              </div>

              <button
                onClick={() => { setOpenId(ep.id); bumpPlayed(ep.id); }}
                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-[11.5px] font-semibold transition-colors"
                title="재생"
              >
                <Play className="h-3 w-3" /> {ep.playCount ? '다시' : '시작'}
              </button>

              <div className="relative shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpenKey(menuOpenKey === key ? null : key); }}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900"
                  aria-label="에피소드 메뉴"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
                {menuOpenKey === key && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setMenuOpenKey(null)} />
                    <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1 z-30">
                      <button
                        onClick={() => { setMenuOpenKey(null); setRenameDraft(ep.title); setRenameId(ep.id); }}
                        className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Pencil className="h-3 w-3" /> 이름 바꾸기
                      </button>
                      <button
                        onClick={() => { setMenuOpenKey(null); onRegenerate(ep); }}
                        className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <RefreshCw className="h-3 w-3" /> 다시 만들기
                      </button>
                      <button
                        onClick={() => { setMenuOpenKey(null); deleteEpisode(ep); }}
                        className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <X className="h-3 w-3" /> 에피소드 삭제
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setOpenId(isOpen ? null : ep.id)}
                className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-900"
                aria-label={isOpen ? '접기' : '펼치기'}
              >
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} />
              </button>
            </div>

            {isOpen && (
              <div className="px-3 pb-3">
                {ep.focus && (
                  <p className="mb-2 text-[10.5px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-md px-2 py-1.5">
                    🎯 집중 범위: {ep.focus}
                  </p>
                )}
                <PodcastPlayer
                  episode={ep}
                  onPlayed={() => bumpPlayed(ep.id)}
                  onJumpToPage={onJumpToPage}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function timeAgo(ts: number): string {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return '방금';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}
