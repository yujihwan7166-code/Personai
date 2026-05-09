import { useEffect, useState } from 'react';
import { History, X, RotateCcw } from 'lucide-react';
import { listRevisions, type Revision } from '@/lib/wikiHistory';
import type { WikiPage } from '@/types/wiki';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  page: WikiPage;
  onClose: () => void;
  onRestore: (snapshot: WikiPage) => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (sameDay) return `오늘 ${time}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${time}`;
}

export function WikiHistoryPanel({ open, page, onClose, onRestore }: Props) {
  const [revs, setRevs] = useState<Revision[]>([]);
  const [selected, setSelected] = useState<Revision | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected(null);
    void listRevisions(page.id).then((rs) => {
      setRevs(rs);
      setLoading(false);
    });
  }, [open, page.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 wiki-z-modal-backdrop flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
      role="dialog"
      aria-label="버전 히스토리"
    >
      <div
        className="w-full max-w-4xl h-[80vh] rounded-xl border border-[hsl(var(--hairline))] bg-popover shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--hairline))]">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[14px] font-bold flex-1 truncate">
            버전 히스토리 — {page.title}
          </h2>
          <span className="text-[11px] text-muted-foreground">{revs.length}개 버전</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-[260px_1fr] overflow-hidden">
          {/* 좌: 버전 리스트 */}
          <aside className="border-r border-[hsl(var(--hairline))] overflow-y-auto">
            {loading ? (
              <p className="p-4 text-[12px] text-muted-foreground">불러오는 중…</p>
            ) : revs.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-[12px] text-muted-foreground">
                  아직 저장된 이전 버전이 없어요.
                </p>
                <p className="text-[10.5px] text-muted-foreground/70 mt-2 leading-relaxed">
                  편집·저장할 때마다 직전 버전이<br />
                  자동으로 보관됩니다 (최대 20개).
                </p>
              </div>
            ) : (
              <ul className="p-1.5">
                {/* 현재 버전 (최신 = 페이지 자체) */}
                <li>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md transition-colors',
                      selected === null
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-accent text-foreground/85',
                    )}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      현재 버전
                    </p>
                    <p className="text-[12.5px] font-medium mt-0.5">{formatTime(page.updatedAt)}</p>
                  </button>
                </li>
                {revs.map((r, i) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(r)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md transition-colors',
                        selected?.id === r.id
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-accent text-foreground/85',
                      )}
                    >
                      <p className="text-[11px] font-mono text-muted-foreground">
                        v{revs.length - i}
                      </p>
                      <p className="text-[12.5px] font-medium mt-0.5">{formatTime(r.takenAt)}</p>
                      <p className="text-[10.5px] text-muted-foreground truncate mt-0.5">
                        {r.snapshot.title}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* 우: 미리보기 */}
          <main className="overflow-y-auto p-5">
            {selected === null ? (
              <RevPreview page={page} isCurrent />
            ) : (
              <RevPreview
                page={selected.snapshot}
                isCurrent={false}
                onRestore={() => {
                  if (!confirm(`이 버전(${formatTime(selected.takenAt)})으로 복원할까요?\n(현재 버전은 새 히스토리에 보관됩니다.)`)) return;
                  onRestore(selected.snapshot);
                  onClose();
                }}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function RevPreview({
  page, isCurrent, onRestore,
}: {
  page: WikiPage;
  isCurrent: boolean;
  onRestore?: () => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-[hsl(var(--hairline))]">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1">
            {isCurrent ? '현재 버전' : '이전 버전'} · {formatTime(page.updatedAt)}
          </p>
          <h3 className="text-lg font-serif font-bold"
            style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
          >
            {page.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Chip>type: {page.type}</Chip>
            <Chip>status: {page.status}</Chip>
            {page.tags.length > 0 && <Chip>tags: {page.tags.join(', ')}</Chip>}
          </div>
        </div>
        {!isCurrent && onRestore && (
          <button
            type="button"
            onClick={onRestore}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md bg-primary text-primary-foreground text-[12px] font-semibold hover:opacity-90 transition-opacity shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            이 버전으로 복원
          </button>
        )}
      </div>

      <pre className="text-[12px] leading-6 font-mono whitespace-pre-wrap text-foreground/85 max-w-none">
        {page.body || '(본문 비어있음)'}
      </pre>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground">
      {children}
    </span>
  );
}
