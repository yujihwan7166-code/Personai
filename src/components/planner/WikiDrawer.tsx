/**
 * 사이드바 빠른 이동 "위키" 클릭 시 뜨는 우측 drawer.
 *
 * 핵심: 검색 input + 최근 노트 list. 풀 페이지(/wiki) 진입은 외부 링크.
 * IndexedDB 기반이라 비동기 로드.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ExternalLink, Search, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { loadAllPages } from '@/lib/wikiStore';
import type { WikiPage } from '@/types/wiki';
import { cn } from '@/lib/utils';

interface WikiDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatRelative = (ts: number): string => {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
};

const previewBody = (body: string): string => {
  // 마크다운 → 첫 의미 있는 줄.
  const lines = body
    .split('\n')
    .map(l => l.replace(/^#+\s*/, '').replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
  return lines.slice(0, 2).join(' · ').slice(0, 80);
};

export const WikiDrawer = ({ open, onOpenChange }: WikiDrawerProps) => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  // 인라인 detail view — selectedId 있으면 페이지 본문 표시.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // drawer 열릴 때만 로드 (idb 비용 회피).
  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedId(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadAllPages().then((all) => {
      if (!cancelled) {
        setPages(all);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [open]);

  const selected = useMemo(
    () => pages.find((p) => p.id === selectedId) ?? null,
    [pages, selectedId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages.slice(0, 30);
    return pages
      .filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.aliases.some((a) => a.toLowerCase().includes(q)) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.body.toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [pages, query]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-[460px] p-0 flex flex-col">
        <SheetTitle className="sr-only">위키</SheetTitle>
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--hairline))]">
          {selected ? (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="목록으로"
              title="목록으로"
              className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
          <span className="text-[14px] font-semibold tracking-tight text-foreground truncate">
            {selected ? selected.title : '🌐 위키'}
          </span>
          {!selected && (
            <span className="text-[11px] tabular-nums text-foreground/55">
              {loading ? '…' : pages.length}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              navigate('/wiki');
            }}
            aria-label={selected ? '풀 페이지로 편집' : '위키 페이지로'}
            title={selected ? '풀 페이지로 편집' : '위키 페이지로'}
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

        {/* ─── Detail view ─── */}
        {selected ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
              {selected.tags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {selected.tags.map((t) => (
                    <span key={t} className="text-[10.5px] text-foreground/65 px-1.5 py-0.5 rounded bg-accent/40">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
              {selected.aliases.length > 0 && (
                <div className="mb-3 text-[11px] text-foreground/55">
                  별칭: {selected.aliases.join(', ')}
                </div>
              )}
              <div className="prose prose-sm max-w-none text-[13.5px] leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
                {selected.body || (
                  <span className="text-foreground/45 italic">본문이 비어있어요</span>
                )}
              </div>
              <div className="mt-6 pt-3 border-t border-[hsl(var(--hairline))] text-[11px] text-foreground/55">
                마지막 수정: {formatRelative(selected.updatedAt)}
                <span className="mx-1.5 text-foreground/30">·</span>
                편집·블록 추가는 우상단 "전체 페이지" 클릭
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* 검색 */}
        <div className="shrink-0 px-4 pt-3 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/45" />
            <input
              type="text"
              autoFocus={open}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="위키 검색 (제목·별칭·태그·본문)"
              className="w-full pl-8 pr-3 py-1.5 text-[13px] rounded-md border border-[hsl(var(--hairline))] bg-card focus:border-foreground/40 focus:outline-none placeholder:text-foreground/45"
            />
          </div>
        </div>

        {/* list */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
          {loading ? (
            <p className="px-3 py-4 text-[12.5px] text-foreground/55 text-center">로딩 중…</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-4 text-[12.5px] text-foreground/55 text-center">
              {query ? '일치하는 페이지 없음' : '위키 페이지 없음'}
            </p>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={cn(
                      'w-full flex flex-col items-start gap-0.5 px-3 py-2 rounded text-left',
                      'hover:bg-accent transition-colors',
                    )}
                  >
                    <div className="flex items-baseline gap-2 w-full">
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                        {p.title}
                      </span>
                      <span className="shrink-0 text-[10.5px] tabular-nums text-foreground/55">
                        {formatRelative(p.updatedAt)}
                      </span>
                    </div>
                    {previewBody(p.body) && (
                      <span className="text-[11.5px] text-foreground/55 leading-snug line-clamp-1">
                        {previewBody(p.body)}
                      </span>
                    )}
                    {p.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {p.tags.slice(0, 3).map((t) => (
                          <span key={t} className="text-[10px] text-foreground/55 px-1 py-0.5 rounded bg-accent/40">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
