/**
 * 사이드바 빠른 이동 "저널" 클릭 시 뜨는 우측 drawer.
 *
 * 핵심: 오늘 entry 미리보기 + 빠른 한 줄 추가 + 최근 entries.
 * 풀 페이지(/journal) 진입은 헤더의 외부 링크 버튼.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Plus, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { journalStore } from '@/services/journalStore';
import { JOURNAL_CHANGED, type JournalEntry } from '@/types/journal';
import { cn } from '@/lib/utils';
import { fmtMonthDay } from '@/lib/dateFormat';

interface JournalDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const previewOf = (body: string): string => {
  const lines = body.split('\n').filter(l => l.trim());
  return lines.slice(0, 3).join(' · ');
};

const formatRelative = (iso: string): string => {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return fmtMonthDay(iso);
};

const useEntries = () => {
  const [entries, setEntries] = useState<JournalEntry[]>(() => journalStore.list());
  useEffect(() => {
    const refresh = () => setEntries(journalStore.list());
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(JOURNAL_CHANGED, refresh);
    return () => window.removeEventListener(JOURNAL_CHANGED, refresh);
  }, []);
  return entries;
};

export const JournalDrawer = ({ open, onOpenChange }: JournalDrawerProps) => {
  const navigate = useNavigate();
  const entries = useEntries();
  const [drafting, setDrafting] = useState(false);
  const [draftBody, setDraftBody] = useState('');

  useEffect(() => {
    if (!open) {
      setDrafting(false);
      setDraftBody('');
    }
  }, [open]);

  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = useMemo(() => entries.filter(e => e.date === today), [entries, today]);
  const recent = useMemo(() => entries.slice(0, 20), [entries]);

  const submitDraft = () => {
    const trimmed = draftBody.trim();
    if (trimmed) journalStore.add({ body: trimmed });
    setDrafting(false);
    setDraftBody('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-[420px] p-0 flex flex-col">
        <SheetTitle className="sr-only">저널</SheetTitle>
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-foreground/20">
          <span className="text-[14px] font-semibold tracking-tight text-foreground">📔 저널</span>
          <span className="text-[11px] tabular-nums text-foreground/55">{entries.length}</span>
          <button
            type="button"
            onClick={() => { onOpenChange(false); navigate('/journal'); }}
            aria-label="저널 페이지로"
            title="저널 페이지로"
            className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="닫기"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 오늘 entry 미리보기 */}
        <div className="shrink-0 px-4 pt-3 pb-2">
          <div className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-foreground/55 font-semibold mb-1.5">
            오늘
          </div>
          {todayEntries.length === 0 ? (
            <p className="text-[12px] text-foreground/55 leading-snug">
              아직 오늘 적은 게 없어요.
            </p>
          ) : (
            <ul className="space-y-1">
              {todayEntries.slice(0, 3).map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => { onOpenChange(false); navigate('/journal'); }}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-accent transition-colors"
                  >
                    <span className="text-[12.5px] text-foreground/85 line-clamp-2 leading-snug">
                      {e.mood && <span className="mr-1" aria-hidden>{e.mood}</span>}
                      {previewOf(e.body) || '(빈 항목)'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 빠른 추가 */}
        <div className="shrink-0 px-4 pt-1 pb-2">
          {!drafting ? (
            <button
              type="button"
              onClick={() => setDrafting(true)}
              className="inline-flex items-center gap-1.5 text-[12px] text-foreground/65 hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              한 줄 적기
            </button>
          ) : (
            <div
              className="flex flex-col gap-1.5 p-2 rounded-md border border-foreground/30 bg-accent/20"
              onBlur={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                submitDraft();
              }}
            >
              <textarea
                autoFocus
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitDraft();
                  else if (e.key === 'Escape') { setDrafting(false); setDraftBody(''); }
                }}
                placeholder="오늘 어땠어요?  ⌘+Enter 저장 / Esc 취소"
                rows={3}
                className="w-full bg-transparent text-[13px] outline-none resize-none placeholder:text-foreground/45"
              />
              <div className="flex justify-end gap-2 text-[11px]">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setDrafting(false); setDraftBody(''); }}
                  className="text-foreground/55 hover:text-foreground"
                >
                  취소
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={submitDraft}
                  className="text-foreground font-medium hover:underline"
                >
                  저장
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 최근 — 오늘 외 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 border-t border-foreground/20">
          <div className="px-2 mb-1.5 text-[10.5px] font-mono uppercase tracking-[0.14em] text-foreground/55 font-semibold">
            최근
          </div>
          {recent.length === 0 ? (
            <p className="px-3 py-4 text-[12.5px] text-foreground/55 text-center">
              저널 없음
            </p>
          ) : (
            <ul className="space-y-0.5">
              {recent.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => { onOpenChange(false); navigate('/journal'); }}
                    className={cn(
                      'w-full flex flex-col items-start gap-0.5 px-3 py-2 rounded text-left',
                      'hover:bg-accent transition-colors',
                    )}
                  >
                    <div className="flex items-baseline gap-2 w-full">
                      <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                        {e.mood && <span className="mr-1" aria-hidden>{e.mood}</span>}
                        {previewOf(e.body) || '(빈 항목)'}
                      </span>
                      <span className="shrink-0 text-[10.5px] tabular-nums text-foreground/55">
                        {formatRelative(e.createdAt)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
