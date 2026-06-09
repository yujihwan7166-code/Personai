import { useEffect, useState } from 'react';
import { History, X, RotateCcw } from 'lucide-react';
import { listRevisions, type Revision } from '@/lib/wikiHistory';
import { estimateReadingMinutes, summarizeWikiPageDelta, type WikiPageDelta } from '@/lib/wikiHistorySummary';
import { type WikiPage, WIKI_STATUS_META, WIKI_TYPE_META } from '@/types/wiki';
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
  const [restoreTarget, setRestoreTarget] = useState<Revision | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected(null);
    setRestoreTarget(null);
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
        className="relative w-full max-w-4xl h-[80vh] rounded-xl border border-[hsl(var(--hairline))] bg-popover shadow-2xl flex flex-col overflow-hidden"
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

        <div className="flex-1 min-h-0 grid grid-cols-1 overflow-hidden md:grid-cols-[260px_1fr]">
          {/* 좌: 버전 리스트 */}
          <aside className="max-h-[220px] overflow-y-auto border-b border-[hsl(var(--hairline))] md:max-h-none md:border-b-0 md:border-r">
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
                    <p className="text-[10.5px] text-muted-foreground mt-0.5">
                      본문 {page.body.length.toLocaleString()}자
                    </p>
                  </button>
                </li>
                {revs.map((r, i) => {
                  const delta = summarizeWikiPageDelta(page, r.snapshot);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(r);
                          setRestoreTarget(null);
                        }}
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
                        <DeltaChips delta={delta} compact />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* 우: 미리보기 */}
          <main className="overflow-y-auto p-5">
            {selected === null ? (
              <RevPreview page={page} timestamp={page.updatedAt} isCurrent />
            ) : (
              <RevPreview
                page={selected.snapshot}
                timestamp={selected.takenAt}
                isCurrent={false}
                comparedWith={page}
                onRestore={() => setRestoreTarget(selected)}
              />
            )}
          </main>
        </div>

        {restoreTarget && (
          <RestoreConfirm
            revision={restoreTarget}
            current={page}
            onCancel={() => setRestoreTarget(null)}
            onConfirm={() => {
              onRestore(restoreTarget.snapshot);
              setRestoreTarget(null);
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}

function RevPreview({
  page, timestamp, isCurrent, comparedWith, onRestore,
}: {
  page: WikiPage;
  timestamp: number;
  isCurrent: boolean;
  comparedWith?: WikiPage;
  onRestore?: () => void;
}) {
  const delta = comparedWith ? summarizeWikiPageDelta(comparedWith, page) : null;
  const readingMinutes = estimateReadingMinutes(page.body);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-[hsl(var(--hairline))]">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1">
            {isCurrent ? '현재 버전' : '이전 버전'} · {formatTime(timestamp)}
          </p>
          <h3 className="text-lg font-serif font-bold"
            style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
          >
            {page.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Chip>유형: {WIKI_TYPE_META[page.type]?.label ?? page.type}</Chip>
            <Chip>상태: {WIKI_STATUS_META[page.status]?.label ?? page.status}</Chip>
            <Chip>{page.body.length.toLocaleString()}자</Chip>
            <Chip>{readingMinutes > 0 ? `${readingMinutes}분 읽기` : '빈 본문'}</Chip>
            {page.tags.length > 0 && <Chip>태그: {page.tags.join(', ')}</Chip>}
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

      {delta && (
        <section className="mb-4 rounded-lg border border-[hsl(var(--hairline))] bg-accent/35 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] font-semibold">현재 문서와 차이</p>
            <p className="text-[10.5px] text-muted-foreground">
              복원하면 선택한 버전으로 덮어씁니다
            </p>
          </div>
          <DeltaChips delta={delta} />
          {(delta.tagsAdded.length > 0 || delta.tagsRemoved.length > 0) && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              태그: {formatListDelta(delta.tagsAdded, delta.tagsRemoved)}
            </p>
          )}
          {(delta.aliasesAdded.length > 0 || delta.aliasesRemoved.length > 0) && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              별칭: {formatListDelta(delta.aliasesAdded, delta.aliasesRemoved)}
            </p>
          )}
        </section>
      )}

      <pre className="text-[12px] leading-6 font-mono whitespace-pre-wrap text-foreground/85 max-w-none">
        {page.body || '(본문 비어있음)'}
      </pre>
    </div>
  );
}

function DeltaChips({ delta, compact = false }: { delta: WikiPageDelta; compact?: boolean }) {
  const labels = delta.changed ? delta.summary.slice(0, compact ? 2 : 6) : ['변경 없음'];
  return (
    <div className={cn('flex flex-wrap gap-1.5', compact ? 'mt-1.5' : 'mt-2')}>
      {labels.map((label) => (
        <span
          key={label}
          className={cn(
            'rounded border border-[hsl(var(--hairline))] bg-background/70 text-muted-foreground',
            compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]',
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function formatListDelta(added: string[], removed: string[]): string {
  const parts = [
    ...added.map((value) => `+${value}`),
    ...removed.map((value) => `-${value}`),
  ];
  return parts.join(', ');
}

function RestoreConfirm({
  revision, current, onCancel, onConfirm,
}: {
  revision: Revision;
  current: WikiPage;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const delta = summarizeWikiPageDelta(current, revision.snapshot);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-xl border border-[hsl(var(--hairline))] bg-popover p-4 shadow-2xl">
        <p className="text-[12px] font-semibold text-muted-foreground">버전 복원 확인</p>
        <h3 className="mt-1 text-base font-bold">{formatTime(revision.takenAt)} 버전으로 복원할까요?</h3>
        <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
          현재 문서는 히스토리에 남고, 화면에는 선택한 버전의 제목과 본문, 태그, 관계 정보가 적용됩니다.
        </p>
        <DeltaChips delta={delta} />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-8 px-3 rounded-md border border-[hsl(var(--hairline))] text-[12px] font-semibold hover:bg-accent"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-[12px] font-semibold hover:opacity-90"
          >
            복원
          </button>
        </div>
      </div>
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
