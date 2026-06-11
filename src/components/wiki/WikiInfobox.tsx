import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { type WikiPage, WIKI_TYPE_META, WIKI_STATUS_META } from '@/types/wiki';
import { formatWikiIdMarkdownLink } from '@/lib/wikiLinks';

interface Props {
  page: WikiPage;
  onTagClick?: (tag: string) => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 본문 첫 URL 추출 — source 인포박스의 '원본 링크' 칩에 사용. */
function firstUrl(body: string): string | null {
  const m = body.match(/https?:\/\/[^\s)\]]+/i);
  return m ? m[0] : null;
}

function hostnameFor(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

/**
 * 위키 인포박스 — Wikipedia 우상단 카드 패턴.
 * 굵은 격자 + 굵은 라벨 + 폭 280px 로 위키 톤 강화.
 */
export function WikiInfobox({ page, onTagClick }: Props) {
  const typeMeta = WIKI_TYPE_META[page.type];
  const statusKey = page.status; // 'draft'|'active'|'stable'|'archived'
  const sourceUrl = page.type === 'source' ? firstUrl(page.body) : null;
  const [copied, setCopied] = useState<'title' | 'id' | null>(null);

  const copy = (kind: 'title' | 'id', text: string) => {
    if (!text) return;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(kind);
      window.setTimeout(() => setCopied((current) => (current === kind ? null : current)), 1400);
    }).catch(() => {});
  };

  return (
    <aside
      className="w-full min-w-0 overflow-hidden rounded-xl border bg-card/76 shadow-[0_14px_34px_-30px_hsl(30_15%_8%/0.55)]"
      style={{
        borderColor: 'hsl(var(--hairline))',
        fontFamily: 'var(--wiki-font-meta)',
      }}
      aria-label="문서 정보"
    >
      {/* 헤더 — 페이지 제목만 (유형 표기 제거) */}
      <div
        className="border-b px-3.5 py-3"
        style={{
          backgroundColor: `${typeMeta.tint}12`,
          borderColor: 'hsl(var(--hairline))',
        }}
      >
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          문서 정보
        </p>
        <p className="text-[14px] font-bold text-foreground leading-tight">
          {page.title}
        </p>
      </div>

      {/* 메타 표 — 굵은 격자 */}
      <dl
        className="text-[12px]"
        style={{ '--row-line': '1px solid hsl(var(--hairline))' } as React.CSSProperties}
      >
        {sourceUrl && (
          <Row label="원본">
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11.5px] text-primary hover:underline truncate max-w-full"
              title={sourceUrl}
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{hostnameFor(sourceUrl)}</span>
            </a>
          </Row>
        )}
        <Row label="상태">
          <span className={`wiki-status-chip wiki-status-${statusKey}`}>
            {WIKI_STATUS_META[statusKey].label}
          </span>
        </Row>
        <Row label="연결">
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => copy('title', formatWikiIdMarkdownLink(page.id, page.title))}
              className="inline-flex max-w-full min-w-0 items-center gap-1 rounded px-1 py-0.5 text-left text-[11.5px] text-primary hover:bg-primary/10 wiki-trans-color"
              title="다른 문서에 붙일 연결을 복사"
            >
              {copied === 'title' ? <Check className="h-3 w-3 shrink-0" /> : <Copy className="h-3 w-3 shrink-0" />}
              <span className="truncate">문서 연결 복사</span>
            </button>
          </div>
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
        <Row label="문서 코드">
          <button
            type="button"
            onClick={() => copy('id', page.id)}
            className="max-w-full truncate rounded px-1 font-mono text-[10.5px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
            title="문제가 생겼을 때 찾기용 코드 복사"
          >
            {copied === 'id' ? '복사됨 ' : '복사 '} {page.id}
          </button>
        </Row>
      </dl>
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] items-start gap-2 px-3.5 py-2"
      style={{ borderTop: '1px solid hsl(var(--hairline))' }}
    >
      <dt className="text-[10.5px] font-bold text-muted-foreground pt-0.5">
        {label}
      </dt>
      <dd className="min-w-0 text-foreground/90">{children}</dd>
    </div>
  );
}
