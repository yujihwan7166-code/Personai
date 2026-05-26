export interface WikiHeading {
  level: 1 | 2 | 3;
  text: string;
  id: string;
}

export type WikiHeadingIdMap = Map<string, string[]>;

export function slugWikiHeading(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w가-힣-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'section';
}

export function extractWikiHeadings(body: string): WikiHeading[] {
  const headings: WikiHeading[] = [];
  const used = new Map<string, number>();
  let inCode = false;

  for (const raw of body.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimStart();
    if (line.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;

    const match = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    const text = cleanHeadingText(match[2]);
    if (!text) continue;
    const baseId = slugWikiHeading(text);
    const count = used.get(baseId) ?? 0;
    used.set(baseId, count + 1);
    headings.push({
      level: match[1].length as 1 | 2 | 3,
      text,
      id: count === 0 ? baseId : `${baseId}-${count + 1}`,
    });
  }

  return headings;
}

export function buildWikiHeadingIdMap(body: string): WikiHeadingIdMap {
  const map: WikiHeadingIdMap = new Map();
  for (const heading of extractWikiHeadings(body)) {
    const key = slugWikiHeading(heading.text);
    const ids = map.get(key) ?? [];
    ids.push(heading.id);
    map.set(key, ids);
  }
  return map;
}

export function nextWikiHeadingId(text: string, idMap: WikiHeadingIdMap, counters: Map<string, number>): string {
  const key = slugWikiHeading(text);
  const index = counters.get(key) ?? 0;
  counters.set(key, index + 1);
  return idMap.get(key)?.[index] ?? (index === 0 ? key : `${key}-${index + 1}`);
}

function cleanHeadingText(text: string): string {
  return text
    .replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?]]/g, (_match, target: string, label?: string) => label ?? target)
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim();
}
