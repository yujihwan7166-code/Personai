import type { WikiPage } from '@/types/wiki';
import { buildWikiRelations, searchWikiPages, stripMarkdown } from '@/lib/wikiQuery';

export type WikiAiScope = 'page' | 'all';

export function buildWikiAiContext({
  scope,
  page,
  pages,
  question = '',
}: {
  scope: WikiAiScope;
  page: WikiPage | null;
  pages: WikiPage[];
  question?: string;
}): string {
  if (scope === 'page' && page) {
    return buildPageContext(page, pages);
  }
  return buildAllContext(pages, question);
}

export function deriveWikiPageTitleFromAnswer(answer: string): string {
  const firstHeading = answer
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^#{1,3}\s+\S/.test(line));
  const raw = firstHeading
    ? firstHeading.replace(/^#{1,3}\s+/, '')
    : answer.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? 'AI 정리';
  return stripMarkdown(raw)
    .replace(/^[-*]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60) || 'AI 정리';
}

function buildPageContext(page: WikiPage, pages: WikiPage[]): string {
  const relations = buildWikiRelations(pages);
  const backlinks = [...relations.backlinks.get(page.id) ?? []]
    .map((id) => relations.byId.get(id)?.title)
    .filter(Boolean)
    .slice(0, 12);
  const outgoing = [
    ...page.refersTo,
    ...page.cites,
    ...page.inherits,
    ...page.similarTo,
  ]
    .map((id) => relations.byId.get(id)?.title)
    .filter(Boolean)
    .slice(0, 12);

  return [
    '현재 위키 페이지 컨텍스트',
    `제목: ${page.title}`,
    `상태: ${page.status}`,
    `유형: ${page.type}`,
    page.tags.length ? `태그: ${page.tags.map((tag) => `#${tag}`).join(' ')}` : '',
    page.aliases.length ? `별칭: ${page.aliases.join(', ')}` : '',
    outgoing.length ? `나가는 연결: ${outgoing.join(', ')}` : '',
    backlinks.length ? `이 페이지를 참조한 문서: ${backlinks.join(', ')}` : '',
    '',
    '본문:',
    truncate(page.body, 2400),
  ].filter(Boolean).join('\n');
}

function buildAllContext(pages: WikiPage[], question: string): string {
  const relations = buildWikiRelations(pages);
  const relevant = question.trim()
    ? searchWikiPages(pages, question).map((hit) => hit.page).slice(0, 12)
    : pages.slice(0, 24);
  const tagCounts = new Map<string, number>();
  for (const page of pages) {
    for (const tag of page.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([tag, count]) => `#${tag}(${count})`);

  const pageLines = relevant.map((page) => {
    const inbound = relations.backlinks.get(page.id)?.size ?? 0;
    const summary = stripMarkdown(page.body).slice(0, 140);
    const tags = page.tags.length ? ` ${page.tags.map((tag) => `#${tag}`).join(' ')}` : '';
    return `- ${page.title} [${page.type}/${page.status}, in:${inbound}]${tags}${summary ? ` — ${summary}` : ''}`;
  });

  return [
    `사용자의 위키 전체 컨텍스트 (${pages.length}개 페이지)`,
    topTags.length ? `주요 태그: ${topTags.join(', ')}` : '',
    relations.wanted.length ? `아직 만들어야 할 링크: ${relations.wanted.slice(0, 8).map((item) => `${item.title}(${item.count})`).join(', ')}` : '',
    relations.orphans.length ? `연결 안 된 페이지: ${relations.orphans.slice(0, 8).map((page) => page.title).join(', ')}` : '',
    '',
    question.trim() ? '질문과 관련 높은 페이지:' : '최근/대표 페이지:',
    pageLines.join('\n'),
  ].filter(Boolean).join('\n');
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n...(이하 ${text.length - max}자 생략)`;
}
