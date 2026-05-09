import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  body: string;
}

interface Heading {
  level: 1 | 2 | 3;
  text: string;
  id: string;
}

function slug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w가-힣-]/g, '');
}

function extractHeadings(body: string): Heading[] {
  const out: Heading[] = [];
  // 줄 단위 파싱 — 코드블록 안은 제외
  let inCode = false;
  for (const raw of body.split('\n')) {
    const line = raw.trimStart();
    if (line.startsWith('```')) { inCode = !inCode; continue; }
    if (inCode) continue;
    const m = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const level = m[1].length as 1 | 2 | 3;
    const text = m[2];
    out.push({ level, text, id: slug(text) });
  }
  return out;
}

export function WikiToc({ body }: Props) {
  const headings = useMemo(() => extractHeadings(body), [body]);

  if (headings.length < 2) return null;

  return (
    <nav
      aria-label="목차"
      className="sticky top-6 rounded-lg border border-[hsl(var(--hairline))] bg-card/80 backdrop-blur p-3 max-h-[70vh] overflow-y-auto"
    >
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">
        목차
      </p>
      <ol className="space-y-0.5 text-[11.5px]">
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
    </nav>
  );
}
