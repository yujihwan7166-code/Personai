import { useMemo, useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { WikiPage } from '@/types/wiki';
import { WIKI_TYPE_META } from '@/types/wiki';
import { WikiImage } from './WikiImage';
import { buildWikiHeadingIdMap, nextWikiHeadingId } from '@/lib/wikiHeadings';

interface Props {
  body: string;
  /** [[페이지명]] 클릭 시 호출 — 부모가 페이지 열기 처리. */
  onOpenLink: (title: string) => void;
  /** 호버 프리뷰용 — 제목으로 페이지를 찾는 함수. 없으면 미존재 표시. */
  findByTitle: (title: string) => WikiPage | undefined;
  /** 방문(최근 본) 페이지 id 모음 — wiki-link-visited 색상 적용용. 옵션. */
  visitedIds?: Set<string>;
}

/**
 * [[페이지명]] 또는 [[페이지명|표시명]] → 마크다운 링크로 변환.
 * ## prefix sentinel 로 우리만의 wiki 링크임을 표시.
 */
function transformWikiLinks(body: string): string {
  return body.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_, target, label) => {
    const t = String(target).trim();
    const l = (label ?? target).toString().trim();
    return `[${l}](##wiki:${encodeURIComponent(t)})`;
  });
}

export function WikiBody({ body, onOpenLink, findByTitle, visitedIds }: Props) {
  const transformed = useMemo(() => transformWikiLinks(body), [body]);
  const headingIdMap = useMemo(() => buildWikiHeadingIdMap(body), [body]);
  const headingCounters = new Map<string, number>();
  const resolveHeadingId = (children: React.ReactNode) =>
    nextWikiHeadingId(stringifyChildren(children), headingIdMap, headingCounters);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // 위키 톤: 헤딩에 anchor id 자동 부여 (TOC 점프용)
        h1: ({ children, ...rest }) => (
          <h1 id={resolveHeadingId(children)} {...rest}>{children}</h1>
        ),
        h2: ({ children, ...rest }) => (
          <h2 id={resolveHeadingId(children)} {...rest}>{children}</h2>
        ),
        h3: ({ children, ...rest }) => (
          <h3 id={resolveHeadingId(children)} {...rest}>{children}</h3>
        ),
        img: ({ src, alt }) => {
          if (typeof src !== 'string') return null;
          return <WikiImage src={src} alt={alt} />;
        },
        a: ({ href, children, ...rest }) => {
          if (typeof href === 'string' && href.startsWith('##wiki:')) {
            const title = decodeURIComponent(href.slice('##wiki:'.length));
            return (
              <WikiLink
                title={title}
                onOpen={onOpenLink}
                findByTitle={findByTitle}
                visitedIds={visitedIds}
              >
                {children}
              </WikiLink>
            );
          }
          return (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline" {...rest}>
              {children}
            </a>
          );
        },
      }}
    >
      {transformed}
    </ReactMarkdown>
  );
}

/* ── 위키 링크 컴포넌트: 호버 시 프리뷰 + 3색 (default/visited/missing) ── */
interface WikiLinkProps {
  title: string;
  onOpen: (title: string) => void;
  findByTitle: (title: string) => WikiPage | undefined;
  visitedIds?: Set<string>;
  children: React.ReactNode;
}

function WikiLink({ title, onOpen, findByTitle, visitedIds, children }: WikiLinkProps) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number; place: 'top' | 'bottom' } | null>(null);
  const linkRef = useRef<HTMLButtonElement>(null);
  const target = findByTitle(title);
  const exists = !!target;
  const visited = exists && visitedIds?.has(target.id);

  useEffect(() => {
    if (!hovered || !linkRef.current) return;
    const rect = linkRef.current.getBoundingClientRect();
    const width = 320;
    const x = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - width - 12));
    const shouldOpenUp = rect.bottom + 170 > window.innerHeight && rect.top > 190;
    setPos({
      x,
      y: shouldOpenUp ? rect.top - 8 : rect.bottom + 6,
      place: shouldOpenUp ? 'top' : 'bottom',
    });
  }, [hovered]);

  return (
    <>
      <button
        ref={linkRef}
        type="button"
        onClick={(e) => { e.preventDefault(); onOpen(title); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className={cn(
          'wiki-link',
          !exists && 'wiki-link-missing',
          exists && visited && 'wiki-link-visited',
          exists && !visited && 'wiki-link-default',
        )}
        title={exists ? (visited ? `${title} (방문함)` : title) : `${title} (없음 — 클릭하면 만들어짐)`}
      >
        {children}
      </button>
      {hovered && pos && exists && target && (
        <span
          className="fixed z-50 pointer-events-none rounded-lg border border-[hsl(var(--hairline))] bg-popover text-popover-foreground shadow-xl px-3 py-2 max-w-xs animate-in fade-in slide-in-from-top-1 duration-150"
          style={{
            left: `${pos.x}px`,
            top: pos.place === 'bottom' ? `${pos.y}px` : undefined,
            bottom: pos.place === 'top' ? `${window.innerHeight - pos.y}px` : undefined,
          }}
        >
          <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-1">
            <span aria-hidden>{WIKI_TYPE_META[target.type].icon}</span>
            {WIKI_TYPE_META[target.type].label}
          </span>
          <span className="block text-[12.5px] font-bold text-foreground mb-0.5">{target.title}</span>
          <span className="block text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">
            {target.body.replace(/[#*`[\]]/g, '').slice(0, 120) || '본문 없음'}
            {target.body.length > 120 ? '…' : ''}
          </span>
        </span>
      )}
      {hovered && pos && !exists && (
        <span
          className="fixed z-50 pointer-events-none rounded-lg border border-[hsl(var(--wiki-link-missing)/0.30)] bg-popover text-popover-foreground shadow-xl px-3 py-2 max-w-xs animate-in fade-in slide-in-from-top-1 duration-150"
          style={{
            left: `${pos.x}px`,
            top: pos.place === 'bottom' ? `${pos.y}px` : undefined,
            bottom: pos.place === 'top' ? `${window.innerHeight - pos.y}px` : undefined,
          }}
        >
          <span className="block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--wiki-link-missing))] mb-1">
            아직 없는 문서
          </span>
          <span className="block text-[12.5px] font-bold text-foreground mb-0.5">{title}</span>
          <span className="block text-[11px] text-muted-foreground leading-relaxed">
            클릭하면 이 제목으로 새 draft 문서를 만들고 바로 편집합니다.
          </span>
        </span>
      )}
    </>
  );
}

function stringifyChildren(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(stringifyChildren).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return stringifyChildren((children as { props: { children: React.ReactNode } }).props.children);
  }
  return '';
}
