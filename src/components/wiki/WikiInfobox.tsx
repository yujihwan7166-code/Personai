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
 * 굵은 격자 + 굵은 라벨 + 폭 280px 로 위키 톤 강화.
 */
export function WikiInfobox({ page, onTagClick }: Props) {
  const typeMeta = WIKI_TYPE_META[page.type];
  const statusKey = page.status; // 'draft'|'active'|'stable'|'archived'

  return (
    <aside
      className="w-[280px] rounded-md border-2 bg-card overflow-hidden shadow-sm"
      style={{
        borderColor: 'hsl(var(--wiki-hairline-strong))',
        fontFamily: 'var(--wiki-font-meta)',
      }}
      aria-label="페이지 정보"
    >
      {/* 헤더 — 타입 색 띠 (alpha 18% 로 다크에서도 명확) */}
      <div
        className="px-3.5 py-2.5 text-center border-b-2"
        style={{
          backgroundColor: `${typeMeta.tint}26`,
          borderColor: 'hsl(var(--wiki-hairline-strong))',
        }}
      >
        <p
          className="text-[10.5px] font-bold uppercase tracking-[0.18em]"
          style={{ color: typeMeta.tint }}
        >
          {typeMeta.icon} {typeMeta.label}
        </p>
        <p className="text-[14px] font-bold text-foreground mt-1 leading-tight">
          {page.title}
        </p>
      </div>

      {/* 메타 표 — 굵은 격자 */}
      <dl
        className="text-[12px]"
        style={{ '--row-line': '1px solid hsl(var(--wiki-hairline-strong))' } as React.CSSProperties}
      >
        <Row label="유형">
          <span className="inline-flex items-center gap-1">
            <span aria-hidden>{typeMeta.icon}</span> {typeMeta.label}
          </span>
        </Row>
        <Row label="상태">
          <span className={`wiki-status-chip wiki-status-${statusKey}`}>
            {WIKI_STATUS_META[statusKey].label}
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
                    className="px-1.5 py-0.5 rounded bg-accent text-foreground/80 text-[10.5px] hover:bg-primary/15 hover:text-primary wiki-trans-color"
                    title={`#${t} 태그로 검색`}
                  >
                    #{t}
                  </button>
                ) : (
                  <span key={t} className="px-1.5 py-0.5 rounded bg-accent text-foreground/75 text-[10.5px]">
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
    <div
      className="grid grid-cols-[72px_1fr] items-start gap-2 px-3.5 py-2"
      style={{ borderTop: '1px solid hsl(var(--wiki-hairline-strong))' }}
    >
      <dt className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground pt-0.5">
        {label}
      </dt>
      <dd className="text-foreground/90">{children}</dd>
    </div>
  );
}
