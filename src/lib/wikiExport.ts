import JSZip from 'jszip';
import type { WikiPage } from '@/types/wiki';
import { downloadBlob, sanitizeFileName } from '@/lib/blob';
import { loadAllPages } from '@/lib/wikiStore';

export interface WikiMarkdownArchiveEntry {
  path: string;
  content: string;
  pageId?: string;
  title?: string;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]!));
}

export function wikiPageToMarkdown(page: WikiPage): string {
  const frontmatter: string[] = ['---'];
  frontmatter.push(`id: ${yamlScalar(page.id)}`);
  frontmatter.push(`title: ${yamlScalar(page.title)}`);
  if (page.aliases.length) frontmatter.push(`aliases: [${page.aliases.map((alias) => JSON.stringify(alias)).join(', ')}]`);
  frontmatter.push(`type: ${page.type}`);
  if (page.isMain) frontmatter.push('isMain: true');
  if (page.category) frontmatter.push(`category: ${yamlScalar(page.category)}`);
  frontmatter.push(`status: ${page.status}`);
  if (page.tags.length) frontmatter.push(`tags: [${page.tags.map((tag) => JSON.stringify(tag)).join(', ')}]`);
  if (page.refersTo.length) frontmatter.push(`refersTo: [${page.refersTo.map((id) => JSON.stringify(id)).join(', ')}]`);
  if (page.cites.length) frontmatter.push(`cites: [${page.cites.map((id) => JSON.stringify(id)).join(', ')}]`);
  if (page.inherits.length) frontmatter.push(`inherits: [${page.inherits.map((id) => JSON.stringify(id)).join(', ')}]`);
  if (page.similarTo.length) frontmatter.push(`similarTo: [${page.similarTo.map((id) => JSON.stringify(id)).join(', ')}]`);
  if (page.parentMocs.length) frontmatter.push(`parentMocs: [${page.parentMocs.map((id) => JSON.stringify(id)).join(', ')}]`);
  frontmatter.push(`created: ${new Date(page.createdAt).toISOString()}`);
  frontmatter.push(`updated: ${new Date(page.updatedAt).toISOString()}`);
  frontmatter.push('---', '');
  return frontmatter.join('\n') + page.body;
}

function yamlScalar(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return JSON.stringify(value);
  if (needsQuotedYamlScalar(value)) return JSON.stringify(value);
  return value;
}

function needsQuotedYamlScalar(value: string): boolean {
  return (
    value !== value.trim()
    || /[\r\n]/.test(value)
    || /:\s/.test(value)
    || /\s#/.test(value)
    || /^[?:,\-[\]{}#&*!|>'"%@`]/.test(value)
    || /^(true|false|null|~)$/i.test(value)
  );
}

export function buildWikiMarkdownArchiveEntries(pages: WikiPage[]): WikiMarkdownArchiveEntry[] {
  const sorted = [...pages].sort((a, b) => a.title.localeCompare(b.title, 'ko') || a.id.localeCompare(b.id));
  const usedNames = new Map<string, number>();
  const pageEntries = sorted.map((page) => {
    const baseName = sanitizeFileName(`${page.title || 'page'}__${page.id}`, page.id || 'page');
    const firstName = `${baseName}.md`;
    const seen = usedNames.get(firstName) ?? 0;
    usedNames.set(firstName, seen + 1);
    const path = seen === 0 ? firstName : `${baseName}-${seen + 1}.md`;
    return {
      path,
      content: wikiPageToMarkdown(page),
      pageId: page.id,
      title: page.title,
    };
  });

  const index = [
    '# Wiki Markdown Export',
    '',
    `- Exported: ${new Date().toISOString()}`,
    `- Pages: ${pageEntries.length}`,
    '',
    ...pageEntries.map((entry) => `- [${entry.title ?? entry.pageId ?? entry.path}](${encodeURI(entry.path)})`),
    '',
  ].join('\n');

  return [{ path: '_index.md', content: index }, ...pageEntries];
}

export async function buildWikiMarkdownZip(pages: WikiPage[]): Promise<Blob> {
  const zip = new JSZip();
  for (const entry of buildWikiMarkdownArchiveEntries(pages)) {
    zip.file(entry.path, entry.content);
  }
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}

export async function exportAllAsMarkdownZip(): Promise<void> {
  const pages = await loadAllPages();
  const blob = await buildWikiMarkdownZip(pages);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `wiki-markdown-${stamp}.zip`);
}

export function markdownToWikiHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  let listKind: 'ul' | 'ol' | null = null;
  let inCode = false;
  let codeBuffer: string[] = [];

  const closeList = () => {
    if (!listKind) return;
    out.push(`</${listKind}>`);
    listKind = null;
  };

  const openList = (kind: 'ul' | 'ol') => {
    if (listKind === kind) return;
    closeList();
    listKind = kind;
    out.push(`<${kind}>`);
  };

  const flushCode = () => {
    out.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
    codeBuffer = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith('```')) {
      closeList();
      if (inCode) flushCode();
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    if (line.trim() === '') {
      closeList();
      continue;
    }

    const table = tryReadTable(lines, index);
    if (table) {
      closeList();
      out.push(renderTable(table.rows));
      index = table.endIndex;
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      closeList();
      out.push('<hr>');
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      closeList();
      out.push(`<blockquote>${renderInline(quote[1])}</blockquote>`);
      continue;
    }

    const unordered = /^\s*[-*]\s+(.+)$/.exec(line);
    if (unordered) {
      openList('ul');
      out.push(`<li>${renderInline(unordered[1])}</li>`);
      continue;
    }

    const ordered = /^\s*\d+\.\s+(.+)$/.exec(line);
    if (ordered) {
      openList('ol');
      out.push(`<li>${renderInline(ordered[1])}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${renderInline(line)}</p>`);
  }

  closeList();
  if (inCode) flushCode();
  return out.join('\n');
}

export function buildWikiExportHtml(page: WikiPage, options: { print?: boolean } = {}): string {
  const body = markdownToWikiHtml(page.body);
  const tags = page.tags.map((tag) => `#${escapeHtml(tag)}`).join(' ');
  const relationRows = [
    ['참조', page.refersTo],
    ['인용', page.cites],
    ['상위 개념', page.inherits],
    ['유사 문서', page.similarTo],
    ['소속 메인', page.parentMocs],
  ].filter(([, ids]) => (ids as string[]).length > 0) as Array<[string, string[]]>;
  const printScript = options.print ? '<script>setTimeout(() => window.print(), 200);</script>' : '';
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>${escapeHtml(page.title)}</title>${exportStyles(options.print)}</head><body>
    <main>
      <div class="meta">${escapeHtml(page.type)} · ${escapeHtml(page.status)} · ${new Date(page.updatedAt).toISOString().slice(0, 10)}${tags ? ` · ${tags}` : ''}</div>
      <h1>${escapeHtml(page.title)}</h1>
      ${relationRows.length ? `<section class="relations"><h2>문서 관계</h2>${relationRows.map(([label, ids]) => `<p><strong>${escapeHtml(label)}</strong> ${ids.map((id) => `<code>${escapeHtml(id)}</code>`).join(' ')}</p>`).join('')}</section>` : ''}
      ${body || '<p class="empty">본문 비어있음</p>'}
    </main>
    ${printScript}
  </body></html>`;
}

function tryReadTable(lines: string[], start: number): { rows: string[][]; endIndex: number } | null {
  if (!lines[start].includes('|')) return null;
  const separator = lines[start + 1];
  if (!separator || !/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(separator)) return null;

  const rows: string[][] = [splitTableRow(lines[start])];
  let endIndex = start + 1;
  for (let i = start + 2; i < lines.length; i += 1) {
    if (!lines[i].includes('|') || !lines[i].trim()) break;
    rows.push(splitTableRow(lines[i]));
    endIndex = i;
  }
  return { rows, endIndex };
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function renderTable(rows: string[][]): string {
  const [head, ...body] = rows;
  return `<table><thead><tr>${head.map((cell) => `<th>${renderInline(cell)}</th>`).join('')}</tr></thead><tbody>${body
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;
}

function renderInline(text: string): string {
  const tokens: string[] = [];
  const stash = (html: string) => {
    const key = `@@WIKI_EXPORT_TOKEN_${tokens.length}@@`;
    tokens.push(html);
    return key;
  };

  let marked = text.replace(/!\[([^\]]*)]\(([^)]+)\)/g, (_match, alt: string, src: string) => {
    if (src.startsWith('wiki-image:')) return stash(`<span class="image-ref">이미지: ${escapeHtml(src.slice('wiki-image:'.length))}</span>`);
    return stash(`<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">`);
  });
  marked = marked.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?]]/g, (_match, target: string, label?: string) =>
    stash(`<a class="wiki-link" href="#wiki:${encodeURIComponent(target)}">${escapeHtml(label ?? target)}</a>`));
  marked = marked.replace(/\[([^\]]+)]\(([^)]+)\)/g, (_match, label: string, href: string) =>
    stash(`<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`));
  marked = marked.replace(/`([^`]+)`/g, (_match, value: string) => stash(`<code>${escapeHtml(value)}</code>`));
  marked = marked.replace(/\*\*([^*]+)\*\*/g, (_match, value: string) => stash(`<strong>${escapeHtml(value)}</strong>`));
  marked = marked.replace(/\*([^*\n]+)\*/g, (_match, value: string) => stash(`<em>${escapeHtml(value)}</em>`));

  let html = escapeHtml(marked);
  tokens.forEach((token, index) => {
    html = html.replace(`@@WIKI_EXPORT_TOKEN_${index}@@`, token);
  });
  return html;
}

function exportStyles(print = false): string {
  return `<style>
    @page { size: A4; margin: 22mm; }
    body { margin: 0; background: ${print ? '#fff' : '#f7f7f5'}; color: #181716; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", system-ui, sans-serif; }
    main { max-width: 760px; margin: ${print ? '0 auto' : '40px auto'}; padding: ${print ? '0' : '32px'}; background: #fff; box-sizing: border-box; }
    .meta { color: #706b63; font-size: 12px; margin-bottom: 18px; padding-bottom: 10px; border-bottom: 1px solid #dfddd8; }
    h1, h2, h3, h4 { font-family: "Noto Serif KR", Georgia, serif; color: #111; line-height: 1.35; }
    h1 { font-size: 32px; margin: 0 0 22px; padding-bottom: 10px; border-bottom: 1px solid #cfcac2; }
    h2 { font-size: 22px; margin: 30px 0 10px; }
    h3 { font-size: 18px; margin: 22px 0 8px; }
    h4 { font-size: 15px; margin: 18px 0 6px; }
    p, li { font-size: 15px; line-height: 1.78; }
    a { color: #1f5fbf; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .wiki-link { color: #0b63ce; font-weight: 600; }
    .relations { border: 1px solid #dfddd8; background: #fbfaf8; padding: 12px 14px; margin: 0 0 22px; }
    .relations h2 { font-size: 15px; margin: 0 0 8px; }
    .relations p { margin: 4px 0; font-size: 13px; line-height: 1.6; }
    .relations strong { display: inline-block; min-width: 68px; color: #57524b; }
    blockquote { border-left: 3px solid #c8c1b7; margin: 16px 0; padding: 6px 12px; color: #57524b; background: #faf9f7; }
    code { background: #f0efeb; border: 1px solid #e1ded7; border-radius: 4px; padding: 1px 5px; font-size: 0.92em; }
    pre { background: #f6f5f2; border: 1px solid #e1ded7; border-radius: 8px; padding: 12px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; margin: 18px 0; table-layout: fixed; }
    th, td { border: 1px solid #cfcac2; padding: 8px 10px; text-align: left; vertical-align: top; font-size: 14px; }
    th { background: #f1efea; font-weight: 700; }
    img { max-width: 100%; height: auto; }
    .image-ref, .empty { color: #706b63; font-style: italic; }
  </style>`;
}
