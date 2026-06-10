import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { extractWikiHeadings } from '@/lib/wikiHeadings';

interface Props {
  body: string;
  variant?: 'sidebar' | 'inline';
}

export function WikiToc({ body, variant = 'sidebar' }: Props) {
  const headings = useMemo(() => extractWikiHeadings(body), [body]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (headings.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
          else visible.delete(entry.target.id);
        }
        const nearest = [...visible.entries()].sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]))[0]?.[0];
        if (nearest) setActiveId(nearest);
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: [0, 1] },
    );

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => !!el);

    elements.forEach((el) => observer.observe(el));
    setActiveId((current) => current ?? headings[0]?.id ?? null);

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  const list = (
    <ol className={cn('space-y-0.5', variant === 'inline' ? 'text-[12px]' : 'text-[11.5px]')}>
      {headings.map((h, i) => (
        <li key={`${h.id}-${i}`}>
          <a
            href={`#${h.id}`}
            className={cn(
              'relative block rounded-md leading-snug text-foreground/75 transition-colors py-1 pr-1 hover:bg-accent/60 hover:text-primary',
              h.level === 1 && 'font-semibold',
              h.level === 2 && 'pl-2',
              h.level === 3 && 'pl-4 text-foreground/60',
              activeId === h.id && 'bg-primary/8 text-primary font-semibold',
            )}
          >
            {activeId === h.id && (
              <span className="absolute left-0 top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
            )}
            {h.text}
          </a>
        </li>
      ))}
    </ol>
  );

  if (variant === 'inline') {
    return (
      <nav
        aria-label="문서 목차"
        className="rounded-lg border border-[hsl(var(--hairline))] bg-card/85 p-3 shadow-sm"
      >
        <details>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
            <span className="tracking-[0.02em]">문서 목차</span>
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {headings.length}
            </span>
          </summary>
          <div className="mt-2 max-h-[220px] overflow-y-auto border-t border-[hsl(var(--hairline))] pt-2">
            {list}
          </div>
        </details>
      </nav>
    );
  }

  return (
    <nav
      aria-label="문서 목차"
      className="sticky top-6 rounded-lg border border-[hsl(var(--hairline))] bg-card/70 p-3 max-h-[70vh] overflow-y-auto"
    >
      <p className="mb-2 flex items-center justify-between text-[11px] font-bold text-foreground">
        <span>문서 목차</span>
        <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {headings.length}
        </span>
      </p>
      {list}
    </nav>
  );
}
