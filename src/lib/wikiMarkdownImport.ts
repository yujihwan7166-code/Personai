import JSZip from 'jszip';
import { newWikiId, type WikiPage, type WikiPageStatus, type WikiPageType } from '@/types/wiki';
import { normalizeWikiPage, upsertPage } from '@/lib/wikiStore';

const VALID_TYPES: WikiPageType[] = ['concept', 'moc', 'source', 'project', 'meeting', 'person', 'index'];
const VALID_STATUSES: WikiPageStatus[] = ['draft', 'active', 'stable', 'archived'];

interface ParseOptions {
  fallbackTitle?: string;
  now?: number;
}

export interface MarkdownImportResult {
  page: WikiPage;
}

export interface MarkdownImportManyResult {
  imported: number;
  failed: number;
  pages: WikiPage[];
  errors: Array<{ fileName: string; message: string }>;
}

export function parseWikiMarkdownText(text: string, options: ParseOptions = {}): WikiPage {
  const normalized = text.replace(/\r\n?/g, '\n');
  const parsed = readFrontmatter(normalized);
  const attrs = parsed.attrs;
  const now = options.now ?? Date.now();
  const fallbackTitle = options.fallbackTitle?.trim() || 'Markdown 문서';
  const createdAt = parseDateLike(readAttr(attrs, 'createdAt', 'created', 'created_at', 'date'), now);
  const updatedAt = parseDateLike(readAttr(attrs, 'updatedAt', 'updated', 'updated_at', 'modified', 'lastModified', 'lastmod'), createdAt);
  const explicitTitle = readString(readAttr(attrs, 'title', 'name'));
  const body = parsed.body.trimStart();
  const headingTitle = explicitTitle ? '' : readFirstMarkdownHeading(body);

  const page = normalizeWikiPage({
    id: readString(attrs.id) || newWikiId(),
    title: explicitTitle || headingTitle || fallbackTitle,
    aliases: readStringArray(readAttr(attrs, 'aliases', 'alias')),
    type: readType(readAttr(attrs, 'type', 'kind')),
    isMain: readBoolean(readAttr(attrs, 'isMain', 'main')),
    category: readString(readAttr(attrs, 'category', 'folder')) || undefined,
    status: readStatus(readAttr(attrs, 'status', 'state')),
    tags: readTagArray(readAttr(attrs, 'tags', 'tag')),
    body: explicitTitle || !headingTitle ? body : removeFirstMarkdownHeading(body),
    refersTo: readStringArray(readAttr(attrs, 'refersTo', 'refs')),
    cites: readStringArray(readAttr(attrs, 'cites', 'citation', 'citations')),
    inherits: readStringArray(readAttr(attrs, 'inherits', 'extends')),
    similarTo: readStringArray(readAttr(attrs, 'similarTo', 'related')),
    parentMocs: readStringArray(readAttr(attrs, 'parentMocs', 'mocs', 'parents')),
    createdAt,
    updatedAt,
  });

  if (!page) throw new Error('Markdown 문서를 위키 페이지로 변환하지 못했습니다.');
  return page;
}

export async function importMarkdownFile(file: File): Promise<MarkdownImportResult> {
  const fallbackTitle = titleFromFileName(file.name);
  const page = parseWikiMarkdownText(await file.text(), { fallbackTitle });
  await upsertPage(page);
  return { page };
}

export async function importMarkdownFiles(files: File[] | FileList): Promise<MarkdownImportManyResult> {
  const pages: WikiPage[] = [];
  const errors: Array<{ fileName: string; message: string }> = [];

  for (const file of Array.from(files)) {
    try {
      const sources = await readMarkdownSources(file);
      for (const source of sources) {
        try {
          const page = parseWikiMarkdownText(source.text, { fallbackTitle: source.fallbackTitle });
          await upsertPage(page);
          pages.push(page);
        } catch (error) {
          errors.push({
            fileName: source.fileName,
            message: (error as Error).message,
          });
        }
      }
    } catch (error) {
      errors.push({
        fileName: file.name,
        message: (error as Error).message,
      });
    }
  }

  return {
    imported: pages.length,
    failed: errors.length,
    pages,
    errors,
  };
}

interface MarkdownSource {
  fileName: string;
  fallbackTitle: string;
  text: string;
}

async function readMarkdownSources(file: File): Promise<MarkdownSource[]> {
  if (!isZipFile(file.name)) {
    return [{
      fileName: file.name,
      fallbackTitle: titleFromFileName(file.name),
      text: await file.text(),
    }];
  }

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir)
    .filter((entry) => isMarkdownFile(entry.name))
    .filter((entry) => !isGeneratedArchiveIndex(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  const sources: MarkdownSource[] = [];
  for (const entry of entries) {
    sources.push({
      fileName: `${file.name}/${entry.name}`,
      fallbackTitle: titleFromFileName(entry.name),
      text: await entry.async('text'),
    });
  }

  if (sources.length === 0) throw new Error('ZIP 안에 가져올 Markdown 파일이 없습니다.');
  return sources;
}

function isZipFile(fileName: string): boolean {
  return /\.zip$/i.test(fileName);
}

function isMarkdownFile(fileName: string): boolean {
  return /\.(md|markdown)$/i.test(fileName);
}

function isGeneratedArchiveIndex(fileName: string): boolean {
  const name = fileName.split(/[\\/]/).pop()?.toLowerCase();
  return name === '_index.md';
}

function titleFromFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  return base.replace(/\.[^.]+$/, '').trim() || 'Markdown 문서';
}

function readAttr(attrs: Record<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    if (attrs[key] !== undefined) return attrs[key];
  }
  const normalized = new Map(Object.entries(attrs).map(([key, value]) => [normalizeAttrKey(key), value]));
  for (const key of keys) {
    const value = normalized.get(normalizeAttrKey(key));
    if (value !== undefined) return value;
  }
  return undefined;
}

function normalizeAttrKey(key: string): string {
  return key.toLowerCase().replace(/[-_]/g, '');
}

function readFirstMarkdownHeading(body: string): string {
  const match = /^#\s+(.+?)\s*#*\s*(?:\n|$)/.exec(body);
  if (!match) return '';
  return cleanMarkdownTitle(match[1]);
}

function removeFirstMarkdownHeading(body: string): string {
  return body.replace(/^#\s+.+?\s*#*\s*(?:\n|$)/, '').trimStart();
}

function cleanMarkdownTitle(title: string): string {
  return title
    .replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?]]/g, (_match, target: string, label?: string) => label ?? target)
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim();
}

function readFrontmatter(text: string): { attrs: Record<string, string>; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) return { attrs: {}, body: text };
  const attrs: Record<string, string> = {};
  let currentListKey = '';
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const listItem = /^-\s+(.+)$/.exec(trimmed);
    if (listItem && currentListKey) {
      const current = attrs[currentListKey]?.trim();
      const body = current && current.startsWith('[') && current.endsWith(']')
        ? current.slice(1, -1).trim()
        : '';
      const nextItem = JSON.stringify(readString(listItem[1]));
      attrs[currentListKey] = `[${body ? `${body}, ` : ''}${nextItem}]`;
      continue;
    }

    const pair = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!pair) {
      currentListKey = '';
      continue;
    }
    attrs[pair[1]] = pair[2].trim();
    currentListKey = pair[2].trim() ? '' : pair[1];
  }
  return { attrs, body: text.slice(match[0].length) };
}

function readString(value: string | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    try {
      return JSON.parse(trimmed.replace(/^'|'$/g, '"')).trim();
    } catch {
      return trimmed.slice(1, -1).trim();
    }
  }
  return trimmed;
}

function readStringArray(value: string | undefined): string[] {
  if (!value) return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    } catch {
      return trimmed.slice(1, -1).split(',').map(readString).filter(Boolean);
    }
  }
  return trimmed.split(',').map(readString).filter(Boolean);
}

function readTagArray(value: string | undefined): string[] {
  const raw = readString(value);
  const base = readStringArray(value);
  const expanded = base.flatMap((tag) => {
    if (!raw.includes('#')) return [tag];
    const hashtagMatches = [...tag.matchAll(/#([\p{L}\p{N}_/-]+)/gu)].map((match) => match[1]);
    return hashtagMatches.length > 0 ? hashtagMatches : [tag];
  });
  return [...new Set(expanded.map((tag) => tag.trim().replace(/^#+/, '')).filter(Boolean))];
}

function readType(value: string | undefined): WikiPageType {
  const type = readString(value) as WikiPageType;
  return VALID_TYPES.includes(type) ? type : 'concept';
}

function readStatus(value: string | undefined): WikiPageStatus {
  const status = readString(value) as WikiPageStatus;
  return VALID_STATUSES.includes(status) ? status : 'draft';
}

function readBoolean(value: string | undefined): boolean | undefined {
  const normalized = readString(value).toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
}

function parseDateLike(value: string | undefined, fallback: number): number {
  const raw = readString(value);
  if (!raw) return fallback;
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return numeric;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}
