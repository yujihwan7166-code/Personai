import { type WikiPage, WIKI_TYPE_META, WIKI_STATUS_META } from '@/types/wiki';

interface Props {
  page: WikiPage;
  onTagClick?: (tag: string) => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 위키 인포박스 — Wikipedia 우상단 카드 패턴.
 * 페이지의 메타데이터를 한곳에 정리해 보여준다.
 */
export function WikiInfobox({ page, onTagClick }: Props) {
  const typeMeta = WIKI_TYPE_META[page.type];
  const statusMeta = WIKI_STATUS_META[page.status];

  return (
    <aside
      className="rounded-lg border-2 border-[hsl(var(--hairline))] bg-card overflow-hidden"
      aria-label="페이지 정보"
    >
      {/* 헤더 — 타입 색 띠 */}
      <div
        className="px-3 py-2 text-center border-b-2 border-[hsl(var(--hairline))]"
        style={{ backgroundColor: `${typeMeta.tint}14` }}
      >
        <p className="text-[9.5px] font-mono uppercase tracking-[0.2em]" style={{ color: typeMeta.tint }}>
          {typeMeta.label}
        </p>
        <p className="text-[13.5px] font-bold text-foreground mt-0.5 leading-tight">
          {page.title}
        </p>
      </div>

      {/* 메타 표 */}
      <dl className="text-[11px] divide-y divide-[hsl(var(--hairline))]">
        <Row label="유형">
          <span className="inline-flex items-center gap-1">
            <span aria-hidden>{typeMeta.icon}</span> {typeMeta.label}
          </span>
        </Row>
        <Row label="상태">
          <span
            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
            style={{ backgroundColor: `${statusMeta.tint}22`, color: statusMeta.tint }}
          >
            {statusMeta.label}
          </span>
        </Row>
        {page.category && <Row label="분류">{page.category}</Row>}
        {page.aliases.length > 0 && (
          <Row label="별칭">
            <span className="text-foreground/80">{page.aliases.join(' · ')}</span>
          </Row>
        )}
        {page.tags.length > 0 && (
          <Row label="태그">
            <span className="flex flex-wrap gap-1">
              {page.tags.map((t) => (
                onTagClick ? (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onTagClick(t)}
                    className="px-1.5 py-0.5 rounded bg-accent text-foreground/75 text-[10px] hover:bg-primary/15 hover:text-primary transition-colors"
                    title={`#${t} 태그로 검색`}
                  >
                    #{t}
                  </button>
                ) : (
                  <span key={t} className="px-1.5 py-0.5 rounded bg-accent text-foreground/75 text-[10px]">
                    #{t}
                  </span>
                )
              ))}
            </span>
          </Row>
        )}
        <Row label="만든 날">{formatDate(page.createdAt)}</Row>
        <Row label="마지막 수정">{formatDate(page.updatedAt)}</Row>
      </dl>
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[64px_1fr] items-start gap-2 px-3 py-1.5">
      <dt className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground pt-0.5">
        {label}
      </dt>
      <dd className="text-foreground/90">{children}</dd>
    </div>
  );
}
