import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { extractWikiHeadings } from '@/lib/wikiHeadings';

interface Props {
  body: string;
  variant?: 'sidebar' | 'inline';
}

export function WikiToc({ body, variant = 'sidebar' }: Props) {
  const headings = useMemo(() => extractWikiHeadings(body), [body]);

  if (headings.length < 2) return null;

  const list = (
    <ol className={cn('space-y-0.5', variant === 'inline' ? 'text-[12px]' : 'text-[11.5px]')}>
      {headings.map((h, i) => (
        <li key={`${h.id}-${i}`}>
          <a
            href={`#${h.id}`}
            className={cn(
              'block leading-snug text-foreground/75 hover:text-primary transition-colors py-0.5',
              h.level === 1 && 'font-semibold',
              h.level === 2 && 'pl-2',
              h.level === 3 && 'pl-4 text-foreground/60',
            )}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ol>
  );

  if (variant === 'inline') {
    return (
      <nav
        aria-label="목차"
        className="rounded-lg border border-[hsl(var(--hairline))] bg-card/85 p-3 shadow-sm"
      >
        <details>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-semibold text-muted-foreground [&::-webkit-details-marker]:hidden">
            <span className="uppercase tracking-[0.08em]">목차</span>
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {headings.length}개
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
      aria-label="목차"
      className="sticky top-6 rounded-lg border border-[hsl(var(--hairline))] bg-card/80 backdrop-blur p-3 max-h-[70vh] overflow-y-auto"
    >
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">
        목차
      </p>
      {list}
    </nav>
  );
}
