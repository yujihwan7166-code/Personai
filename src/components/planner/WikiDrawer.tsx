/**
 * 사이드바 빠른 이동 "위키" 클릭 시 뜨는 우측 drawer.
 *
 * 핵심: 검색 input + 최근 노트 list. 풀 페이지(/wiki) 진입은 외부 링크.
 * IndexedDB 기반이라 비동기 로드.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Search, X } from 'lucide-react';
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

  // drawer 열릴 때만 로드 (idb 비용 회피).
  useEffect(() => {
    if (!open) {
      setQuery('');
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
      <SheetContent side="right" className="sm:max-w-md w-[420px] p-0 flex flex-col">
        <SheetTitle className="sr-only">위키</SheetTitle>
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--hairline))]">
          <span className="text-[14px] font-semibold tracking-tight text-foreground">🌐 위키</span>
          <span className="text-[11px] tabular-nums text-foreground/55">
            {loading ? '…' : pages.length}
          </span>
          <button
            type="button"
            onClick={() => { onOpenChange(false); navigate('/wiki'); }}
            aria-label="위키 페이지로"
            title="위키 페이지로"
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
                    onClick={() => { onOpenChange(false); navigate('/wiki'); }}
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
      </SheetContent>
    </Sheet>
  );
};
