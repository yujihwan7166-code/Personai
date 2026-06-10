import { describe, expect, it, vi } from 'vitest';
import { extractWikiLinks, type WikiPage } from '@/types/wiki';
import { normalizeWikiPage } from '@/lib/wikiStore';
import { analyzeWikiPageHealth, buildWikiBacklinkPreviews, buildWikiCleanupQueue, buildWikiFacetSummary, buildWikiGraphModel, buildWikiRelations, collectWikiManualRelations, collectWikiOutgoingLinks, findUnlinkedWikiMentions, getActiveWikiPages, getArchivedWikiPages, pickWikiPagesByIds, searchWikiPages, shortestWikiPath, stripMarkdown, suggestRelatedWikiPages } from '@/lib/wikiQuery';
import { normalizeBackupFile, parseWikiBackupText } from '@/lib/wikiBackup';
import { estimateReadingMinutes, firstMeaningfulLine, summarizeWikiPageDelta } from '@/lib/wikiHistorySummary';
import { buildWikiExportHtml, buildWikiMarkdownArchiveEntries, markdownToWikiHtml, wikiPageToMarkdown } from '@/lib/wikiExport';
import { buildQuickCapturePage, deriveCaptureTitle, extractCaptureTags, extractCaptureUrls } from '@/lib/wikiCapture';
import { buildWikiAiContext, deriveWikiPageTitleFromAnswer } from '@/lib/wikiAiContext';
import { addAliasOnce, formatWikiIdMarkdownLink, formatWikiTitleLink, linkFirstUnlinkedMention, linkUnlinkedMentions, rewriteWikiLinkTargets } from '@/lib/wikiLinks';
import { findDuplicateWikiCandidates, mergeWikiPages, replaceRelationTarget, setWikiPageArchived } from '@/lib/wikiCleanup';
import { importMarkdownFiles, parseWikiMarkdownText } from '@/lib/wikiMarkdownImport';
import { extractWikiHeadings, nextWikiHeadingId, buildWikiHeadingIdMap } from '@/lib/wikiHeadings';
import { buildWikiTemplateHtml, makePageFromTemplate, WIKI_EDITOR_TEMPLATES, WIKI_TEMPLATES } from '@/lib/wikiTemplates';

describe('wiki core utilities', () => {
  it('extracts title, alias, and id based wiki links without duplicates', () => {
    expect(extractWikiLinks('[[개념]] [[개념|표시]] [열기](##wiki:w_abc123)')).toEqual([
      '개념',
      'w_abc123',
    ]);
  });

  it('normalizes damaged persisted wiki pages into safe defaults', () => {
    const page = normalizeWikiPage({
      id: '',
      title: '',
      type: 'unknown',
      status: 'weird',
      aliases: ['별칭', '', 3],
      tags: ['tag', null],
      body: 7,
      createdAt: 100,
      updatedAt: Number.NaN,
    }, 2);

    expect(page).toMatchObject({
      id: 'w_recovered_2',
      title: '제목 없음',
      type: 'concept',
      status: 'draft',
      aliases: ['별칭'],
      tags: ['tag'],
      body: '',
      refersTo: [],
      cites: [],
      inherits: [],
      similarTo: [],
      parentMocs: [],
      createdAt: 100,
      updatedAt: 100,
    });
  });

  it('searches title, aliases, tags, links, and cleaned body text by priority', () => {
    const pages = [
      page({ id: 'a', title: 'React Query', aliases: ['TanStack'], tags: ['frontend'], body: '서버 상태 관리' }),
      page({ id: 'b', title: '학습 노트', tags: ['공부'], body: '[[React Query]] 를 읽고 정리\n\n**캐시 전략** 메모' }),
      page({ id: 'c', title: '요리 메모', body: '파스타 소스' }),
    ];

    expect(searchWikiPages(pages, '#공부')[0]).toMatchObject({ page: pages[1], hit: 'tag', matchedTag: '공부' });
    expect(searchWikiPages(pages, 'tanstack')[0]).toMatchObject({ page: pages[0], hit: 'alias', matchedAlias: 'TanStack' });
    expect(searchWikiPages(pages, 'react query')[0]).toMatchObject({ page: pages[0], hit: 'title' });
    expect(searchWikiPages(pages, '캐시')[0]).toMatchObject({ page: pages[1], hit: 'body' });
    expect(searchWikiPages(pages, 'react')[1]).toMatchObject({ page: pages[1], hit: 'link', matchedLink: 'React Query' });
  });

  it('supports wiki search operators for tags, type, status, and category', () => {
    const pages = [
      page({ id: 'a', title: 'React Query', type: 'concept', status: 'active', tags: ['frontend', 'query'], category: 'Web', body: 'server cache' }),
      page({ id: 'b', title: 'React Query Paper', type: 'source', status: 'draft', tags: ['frontend', 'source'], category: 'Research', body: 'paper notes' }),
      page({ id: 'c', title: 'Ops Runbook', type: 'project', status: 'stable', tags: ['ops'], category: 'Work', body: 'deploy checklist' }),
    ];

    expect(searchWikiPages(pages, '#frontend').map((hit) => hit.page.id)).toEqual(['a', 'b']);
    expect(searchWikiPages(pages, 'type:source').map((hit) => hit.page.id)).toEqual(['b']);
    expect(searchWikiPages(pages, 'status:stable').map((hit) => hit.page.id)).toEqual(['c']);
    expect(searchWikiPages(pages, 'category:Research').map((hit) => hit.page.id)).toEqual(['b']);
    expect(searchWikiPages(pages, 'type:source #frontend paper').map((hit) => hit.page.id)).toEqual(['b']);
  });

  it('builds backlinks, wanted links, and true orphan pages', () => {
    const pages = [
      page({ id: 'main', title: '프론트엔드', isMain: true, body: '[[React Query]] [[없는 문서]]' }),
      page({ id: 'react', title: 'React Query', aliases: ['TanStack Query'], body: '캐시' }),
      page({ id: 'source', title: '출처', type: 'source', cites: ['react'] }),
      page({ id: 'alone', title: '혼자 있는 글', body: '메모' }),
    ];

    const relations = buildWikiRelations(pages);
    expect([...relations.backlinks.get('react') ?? []].sort()).toEqual(['main', 'source']);
    expect(relations.wanted).toEqual([{ title: '없는 문서', count: 1 }]);
    expect(relations.orphans.map((p) => p.id)).toEqual(['alone']);
  });

  it('builds backlink previews with relation reasons and readable snippets', () => {
    const pages = [
      page({ id: 'react', title: 'React Query', aliases: ['TanStack Query'], body: '캐시' }),
      page({ id: 'main', title: '프론트엔드', body: '오늘은 [[React Query]]의 캐시 전략을 정리한다.' }),
      page({ id: 'source', title: '출처', type: 'source', cites: ['react'], body: '책에서 서버 상태를 설명했다.' }),
      page({ id: 'archived', title: '보관 글', status: 'archived', body: '[[React Query]]' }),
    ];

    const previews = buildWikiBacklinkPreviews(pages[0], pages);
    const byId = new Map(previews.map((preview) => [preview.page.id, preview]));

    expect(previews.map((preview) => preview.page.id).sort()).toEqual(['main', 'source']);
    expect(byId.get('main')?.reasons).toContain('본문 링크');
    expect(byId.get('main')?.snippet).toContain('React Query');
    expect(byId.get('source')?.reasons).toContain('인용');
  });

  it('analyzes page health signals for cleanup guidance', () => {
    const pages = [
      page({ id: 'draft', title: 'Draft', status: 'draft', body: '짧음 [[Missing]]' }),
      page({ id: 'hub', title: 'Hub', isMain: true, body: '[[Draft]] [[Complete]]' }),
      page({ id: 'complete', title: 'Complete', tags: ['done'], body: '충분한 본문 '.repeat(20), refersTo: ['hub'] }),
      page({ id: 'archived', title: 'Archived', status: 'archived', body: '' }),
    ];

    expect(analyzeWikiPageHealth(pages[0], pages).map((item) => item.id)).toEqual([
      'draft',
      'short-body',
      'no-tags',
      'missing-links',
    ]);
    expect(analyzeWikiPageHealth(pages[2], pages)).toEqual([]);
    expect(analyzeWikiPageHealth(pages[3], pages)).toEqual([]);
  });

  it('builds a prioritized cleanup queue from page health signals', () => {
    const pages = [
      page({ id: 'rough', title: 'Rough', status: 'draft', body: '짧음 [[Missing]]' }),
      page({ id: 'lonely', title: 'Lonely', tags: ['note'], body: '충분한 본문 '.repeat(20) }),
      page({ id: 'healthy', title: 'Healthy', tags: ['done'], body: '충분한 본문 '.repeat(20), refersTo: ['rough'] }),
      page({ id: 'hub', title: 'Hub', isMain: true, body: '[[Healthy]]' }),
    ];

    const queue = buildWikiCleanupQueue(pages);

    expect(queue[0].page.id).toBe('rough');
    expect(queue[0].score).toBeGreaterThan(queue[1].score);
    expect(queue.some((item) => item.page.id === 'healthy')).toBe(false);
  });

  it('splits active and archived wiki pages for cleaner navigation', () => {
    const pages = [
      page({ id: 'active', title: 'Active', status: 'active' }),
      page({ id: 'stable', title: 'Stable', status: 'stable' }),
      page({ id: 'archived', title: 'Archived', status: 'archived' }),
    ];

    expect(getActiveWikiPages(pages).map((p) => p.id)).toEqual(['active', 'stable']);
    expect(getArchivedWikiPages(pages).map((p) => p.id)).toEqual(['archived']);
  });

  it('summarizes wiki facets for type, status, tag, and category navigation', () => {
    const pages = [
      page({ id: 'a', title: 'Alpha', type: 'concept', status: 'active', tags: ['react', 'query'], category: 'Frontend' }),
      page({ id: 'b', title: 'Beta', type: 'source', status: 'draft', tags: ['react'], category: 'Research' }),
      page({ id: 'c', title: 'Gamma', type: 'project', status: 'stable', tags: ['ops'], category: 'Frontend' }),
    ];

    const facets = buildWikiFacetSummary(pages);

    expect(facets.tags).toEqual([
      { value: 'react', count: 2 },
      { value: 'ops', count: 1 },
      { value: 'query', count: 1 },
    ]);
    expect(facets.types).toEqual([
      { value: 'concept', count: 1 },
      { value: 'source', count: 1 },
      { value: 'project', count: 1 },
    ]);
    expect(facets.statuses).toEqual([
      { value: 'draft', count: 1 },
      { value: 'active', count: 1 },
      { value: 'stable', count: 1 },
    ]);
    expect(facets.categories).toEqual([
      { value: 'Frontend', count: 2 },
      { value: 'Research', count: 1 },
    ]);
  });

  it('picks wiki pages by saved id order while skipping removed, excluded, and archived pages', () => {
    const pages = [
      page({ id: 'a', title: 'Alpha' }),
      page({ id: 'b', title: 'Beta' }),
      page({ id: 'c', title: 'Gamma', status: 'archived' }),
      page({ id: 'd', title: 'Delta' }),
    ];

    expect(pickWikiPagesByIds(pages, ['missing', 'b', 'a', 'b', 'c', 'd'], { excludeIds: ['a'], limit: 2 }).map((item) => item.id))
      .toEqual(['b', 'd']);
    expect(pickWikiPagesByIds(pages, ['c'], { includeArchived: true }).map((item) => item.id)).toEqual(['c']);
  });

  it('builds graph edges from body links and explicit relations', () => {
    const pages = [
      page({ id: 'a', title: 'Alpha', body: '[[Beta]]' }),
      page({ id: 'b', title: 'Beta', aliases: ['B'], cites: ['c'] }),
      page({ id: 'c', title: 'Gamma' }),
      page({ id: 'd', title: 'Delta', body: '[[B]]' }),
    ];

    const graph = buildWikiGraphModel(pages);
    expect(graph.edges).toEqual(expect.arrayContaining([
      { from: 'a', to: 'b', kind: 'refersTo' },
      { from: 'b', to: 'c', kind: 'cites' },
      { from: 'd', to: 'b', kind: 'refersTo' },
    ]));
    expect(graph.degree.get('b')).toBe(3);
    expect(shortestWikiPath(graph.neighborMap, 'a', 'c')).toEqual(['a', 'b', 'c']);
    expect(shortestWikiPath(graph.neighborMap, 'a', 'missing')).toBeNull();
  });

  it('collects outgoing existing and missing wiki links for page navigation', () => {
    const pages = [
      page({ id: 'a', title: 'Alpha', body: '[[Beta]] [[Missing]] [open](##wiki:c)', cites: ['b'] }),
      page({ id: 'b', title: 'Beta', aliases: ['B'] }),
      page({ id: 'c', title: 'Gamma' }),
    ];

    const outgoing = collectWikiOutgoingLinks(pages[0], pages);

    expect(outgoing.existing.map((item) => item.id)).toEqual(['b', 'c']);
    expect(outgoing.missing).toEqual(['Missing']);
  });

  it('groups manual wiki relations for the reading surface', () => {
    const pages = [
      page({ id: 'a', title: 'Alpha', cites: ['source', 'missing'], inherits: ['parent'], similarTo: ['peer'], parentMocs: ['hub'] }),
      page({ id: 'hub', title: 'Hub', isMain: true }),
      page({ id: 'parent', title: 'Parent' }),
      page({ id: 'source', title: 'Source', type: 'source' }),
      page({ id: 'peer', title: 'Peer' }),
      page({ id: 'archived', title: 'Archived', status: 'archived' }),
    ];

    const groups = collectWikiManualRelations(pages[0], pages);
    const byKind = new Map(groups.map((group) => [group.kind, group]));

    expect(groups.map((group) => group.kind)).toEqual(['parentMocs', 'inherits', 'cites', 'similarTo']);
    expect(byKind.get('parentMocs')?.pages.map((item) => item.id)).toEqual(['hub']);
    expect(byKind.get('cites')?.pages.map((item) => item.id)).toEqual(['source']);
    expect(byKind.get('cites')?.missingIds).toEqual(['missing']);
  });

  it('suggests related pages from tags, title, and body while avoiding already linked pages', () => {
    const pages = [
      page({ id: 'a', title: 'React Query 캐시', tags: ['frontend', 'query'], body: '서버 상태 캐시 전략 [[이미 연결]]' }),
      page({ id: 'b', title: 'TanStack Query 상태 관리', tags: ['frontend'], body: '서버 상태 캐시 무효화 전략' }),
      page({ id: 'c', title: '이미 연결', tags: ['frontend'], body: '서버 상태 캐시' }),
      page({ id: 'd', title: '요리 메모', tags: ['food'], body: '파스타 소스' }),
      page({ id: 'e', title: '보관된 Query', status: 'archived', tags: ['frontend', 'query'], body: '서버 상태 캐시' }),
    ];

    const suggestions = suggestRelatedWikiPages(pages[0], pages);

    expect(suggestions.map((item) => item.page.id)).toEqual(['b']);
    expect(suggestions[0].reasons).toEqual(expect.arrayContaining(['#frontend', '본문 유사']));
  });

  it('finds unlinked page mentions and can convert the first one into a wiki link', () => {
    const pages = [
      page({ id: 'a', title: '학습 노트', body: 'React Query는 서버 상태를 다룬다. 이미 연결된 [[Zustand]]는 제외한다.' }),
      page({ id: 'b', title: 'React Query', aliases: ['TanStack Query'] }),
      page({ id: 'c', title: 'Zustand' }),
      page({ id: 'd', title: '보관 React Query', status: 'archived' }),
    ];

    const suggestions = findUnlinkedWikiMentions(pages[0], pages);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ page: pages[1], matchedText: 'React Query', reason: '제목 언급' });
    expect(linkFirstUnlinkedMention(pages[0].body, suggestions[0].matchedText, suggestions[0].page.title))
      .toBe('[[React Query]]는 서버 상태를 다룬다. 이미 연결된 [[Zustand]]는 제외한다.');
  });

  it('converts multiple unlinked mentions without shifting later replacements', () => {
    const pages = [
      page({ id: 'a', title: '학습 노트', body: 'React Query와 Zustand를 같이 비교한다. `React Query` 코드는 제외한다.' }),
      page({ id: 'b', title: 'React Query' }),
      page({ id: 'c', title: 'Zustand' }),
    ];

    const suggestions = findUnlinkedWikiMentions(pages[0], pages);
    const nextBody = linkUnlinkedMentions(
      pages[0].body,
      suggestions.map((suggestion) => ({
        matchedText: suggestion.matchedText,
        targetTitle: suggestion.page.title,
        index: suggestion.index,
      })),
    );

    expect(nextBody).toBe('[[React Query]]와 [[Zustand]]를 같이 비교한다. `React Query` 코드는 제외한다.');
  });

  it('strips markdown noise for readable search snippets', () => {
    expect(stripMarkdown('## 제목\n[[실제|표시]] **굵게** [링크](https://x.test)')).toBe('제목 표시 굵게 링크');
  });

  it('extracts stable unique heading anchors for page table of contents', () => {
    const body = [
      '# Intro',
      '## Details',
      '```',
      '## Hidden',
      '```',
      '## Details',
      '### [[React Query|Query]] **Notes**',
    ].join('\n');

    const headings = extractWikiHeadings(body);
    expect(headings.map((heading) => heading.id)).toEqual(['intro', 'details', 'details-2', 'query-notes']);

    const idMap = buildWikiHeadingIdMap(body);
    const counters = new Map<string, number>();
    expect(nextWikiHeadingId('Intro', idMap, counters)).toBe('intro');
    expect(nextWikiHeadingId('Details', idMap, counters)).toBe('details');
    expect(nextWikiHeadingId('Details', idMap, counters)).toBe('details-2');
  });

  it('provides reusable editor templates for common personal wiki pages', () => {
    expect(WIKI_EDITOR_TEMPLATES.map((template) => template.id)).toEqual([
      'daily',
      'meeting',
      'source',
      'concept',
      'moc',
    ]);
    expect(buildWikiTemplateHtml('meeting')).toContain('<h2>액션 아이템</h2>');
    expect(buildWikiTemplateHtml('source')).toContain('<blockquote>');
    expect(buildWikiTemplateHtml('moc')).toContain('<h2>핵심 문서</h2>');
  });

  it('builds new wiki pages from starter templates', () => {
    const template = WIKI_TEMPLATES.find((item) => item.id === 'moc');
    expect(template).toBeTruthy();

    const pageFromDefault = makePageFromTemplate(template!, '');
    expect(pageFromDefault).toMatchObject({
      title: '새 메인 문서',
      type: 'concept',
      isMain: true,
      status: 'draft',
    });

    const pageFromTitle = makePageFromTemplate(template!, '연구 지도');
    expect(pageFromTitle.title).toBe('연구 지도');
    expect(pageFromTitle.body).toContain('## 핵심 문서');
  });

  it('normalizes v1 and v2 wiki backup payloads before import', () => {
    const payload = normalizeBackupFile({
      schema: 'wiki-v2',
      exportedAt: 123,
      pages: [
        page({ id: 'p1', title: '정상 페이지' }),
        { id: '', title: '', body: 3 },
      ],
      images: [
        { id: 'img_1', dataUrl: 'data:image/png;base64,AAAA', type: 'image/png' },
        { id: '', dataUrl: 'broken', type: 'image/png' },
      ],
      revisions: [
        { id: 'r1', pageId: 'p1', snapshot: page({ id: 'p1', title: '이전' }), takenAt: 111 },
        { id: 'r2', pageId: 'missing', snapshot: page({ id: 'missing', title: '없는 페이지' }), takenAt: 111 },
      ],
    });

    expect(payload?.schema).toBe('wiki-v2');
    expect(payload?.pages.map((p) => p.id)).toEqual(['p1', 'w_recovered_1']);
    expect(payload?.images).toHaveLength(1);
    expect(payload?.revisions.map((rev) => rev.id)).toEqual(['r1']);

    expect(parseWikiBackupText(JSON.stringify({ schema: 'wiki-v1', exportedAt: 1, pages: [page({ id: 'old', title: 'v1' })] }))).toMatchObject({
      schema: 'wiki-v1',
      pages: [{ id: 'old', title: 'v1' }],
      images: [],
      revisions: [],
    });
  });

  it('rejects malformed wiki backup files with a clear error', () => {
    expect(() => parseWikiBackupText('{')).toThrow('JSON 파싱 실패');
    expect(() => parseWikiBackupText(JSON.stringify({ schema: 'wiki-v3', pages: [] }))).toThrow('백업 파일 형식');
  });

  it('summarizes history differences for safer restores', () => {
    const current = page({
      id: 'p1',
      title: 'Current title',
      tags: ['now', 'shared'],
      aliases: ['current'],
      body: 'one two three',
      refersTo: ['a'],
    });
    const snapshot = page({
      id: 'p1',
      title: 'Old title',
      tags: ['old', 'shared'],
      aliases: ['previous'],
      body: 'one two',
      refersTo: ['b'],
    });

    const delta = summarizeWikiPageDelta(current, snapshot);

    expect(delta.changed).toBe(true);
    expect(delta.titleChanged).toBe(true);
    expect(delta.bodyCharDelta).toBeLessThan(0);
    expect(delta.bodyWordDelta).toBe(-1);
    expect(delta.tagsAdded).toEqual(['old']);
    expect(delta.tagsRemoved).toEqual(['now']);
    expect(delta.aliasesAdded).toEqual(['previous']);
    expect(delta.aliasesRemoved).toEqual(['current']);
    expect(delta.relationChanges).toBe(2);
    expect(delta.summary).toContain('제목 변경');
  });

  it('creates readable history preview helpers', () => {
    expect(estimateReadingMinutes('')).toBe(0);
    expect(estimateReadingMinutes(Array.from({ length: 221 }, (_, i) => `w${i}`).join(' '))).toBe(2);
    expect(firstMeaningfulLine('\n## Heading\n**body**')).toBe('Heading');
  });

  it('exports wiki markdown and renders common blocks to HTML', () => {
    const source = page({
      id: 'export',
      title: 'Export me',
      tags: ['docs'],
      isMain: true,
      cites: ['book'],
      inherits: ['parent'],
      similarTo: ['peer'],
      parentMocs: ['hub'],
      body: [
        '## Section',
        'See [[Target|label]] and **bold**.',
        '',
        '| A | B |',
        '| --- | --- |',
        '| 1 | 2 |',
      ].join('\n'),
    });

    const markdown = wikiPageToMarkdown(source);
    expect(markdown).toContain('id: export');
    expect(markdown).toContain('title: Export me');
    expect(markdown).toContain('isMain: true');
    expect(markdown).toContain('cites: ["book"]');
    expect(markdown).toContain('inherits: ["parent"]');
    expect(markdown).toContain('similarTo: ["peer"]');
    expect(markdown).toContain('parentMocs: ["hub"]');
    const bodyHtml = markdownToWikiHtml(source.body);
    expect(bodyHtml).toContain('<h2>Section</h2>');
    expect(bodyHtml).toContain('class="wiki-link"');
    expect(bodyHtml).toContain('<table>');
    expect(buildWikiExportHtml(source)).toContain('<section class="relations">');
  });

  it('quotes unsafe markdown frontmatter scalars for safe import roundtrips', () => {
    const source = page({
      id: 'unsafe-export',
      title: 'Research: Query #1',
      category: 'Team #notes',
      body: 'Body',
    });

    const markdown = wikiPageToMarkdown(source);

    expect(markdown).toContain('title: "Research: Query #1"');
    expect(markdown).toContain('category: "Team #notes"');

    const imported = parseWikiMarkdownText(markdown, { now: 1 });
    expect(imported.title).toBe('Research: Query #1');
    expect(imported.category).toBe('Team #notes');
  });

  it('builds a full markdown archive index with stable page files', () => {
    const pages = [
      page({ id: 'b', title: 'Same/Name', body: 'Body B' }),
      page({ id: 'a', title: 'Same/Name', body: 'Body A' }),
    ];

    const entries = buildWikiMarkdownArchiveEntries(pages);
    const byPath = new Map(entries.map((entry) => [entry.path, entry]));

    expect(entries[0].path).toBe('_index.md');
    expect(entries[0].content).toContain('- Pages: 2');
    expect(entries[0].content).toContain('Same_Name__a.md');
    expect(byPath.get('Same_Name__a.md')?.content).toContain('id: a');
    expect(byPath.get('Same_Name__b.md')?.content).toContain('id: b');
  });

  it('imports exported markdown frontmatter back into a wiki page', () => {
    const markdown = [
      '---',
      'id: imported',
      'title: Imported Page',
      'aliases: ["Imp", "가져온 문서"]',
      'type: source',
      'isMain: true',
      'category: Research',
      'status: stable',
      'tags: ["docs", "import"]',
      'refersTo: ["target"]',
      'cites: ["book"]',
      'inherits: ["parent"]',
      'similarTo: ["peer"]',
      'parentMocs: ["hub"]',
      'created: 2024-01-02T00:00:00.000Z',
      'updated: 2024-01-03T00:00:00.000Z',
      '---',
      '# Imported',
      'Body text',
    ].join('\n');

    const page = parseWikiMarkdownText(markdown, { now: 99 });

    expect(page).toMatchObject({
      id: 'imported',
      title: 'Imported Page',
      aliases: ['Imp', '가져온 문서'],
      type: 'source',
      isMain: true,
      category: 'Research',
      status: 'stable',
      tags: ['docs', 'import'],
      refersTo: ['target'],
      cites: ['book'],
      inherits: ['parent'],
      similarTo: ['peer'],
      parentMocs: ['hub'],
      body: '# Imported\nBody text',
    });
    expect(page.createdAt).toBe(Date.parse('2024-01-02T00:00:00.000Z'));
    expect(page.updatedAt).toBe(Date.parse('2024-01-03T00:00:00.000Z'));
  });

  it('imports multiline YAML frontmatter arrays from external markdown apps', () => {
    const markdown = [
      '---',
      'title: Obsidian Note',
      'aliases:',
      '  - ON',
      '  - 옵시디언 노트',
      'tags:',
      '  - knowledge',
      '  - imported',
      'cites:',
      '  - source-a',
      'parentMocs:',
      '  - hub',
      '---',
      'Body',
    ].join('\n');

    const page = parseWikiMarkdownText(markdown);

    expect(page.aliases).toEqual(['ON', '옵시디언 노트']);
    expect(page.tags).toEqual(['knowledge', 'imported']);
    expect(page.cites).toEqual(['source-a']);
    expect(page.parentMocs).toEqual(['hub']);
  });

  it('uses the first markdown h1 as title when frontmatter has no title', () => {
    const markdown = [
      '# [[React Query|리액트 쿼리]] **정리**',
      '',
      '본문 첫 문장',
    ].join('\n');

    const page = parseWikiMarkdownText(markdown, { fallbackTitle: 'fallback.md' });

    expect(page.title).toBe('리액트 쿼리 정리');
    expect(page.body).toBe('본문 첫 문장');
  });

  it('accepts common external frontmatter aliases and hashtag strings', () => {
    const markdown = [
      '---',
      'name: External Note',
      'alias: Ext',
      'tag: "#frontend #query"',
      'folder: Research',
      'state: active',
      'main: true',
      'modified: 2024-05-03T12:00:00.000Z',
      'citations: ["paper-a"]',
      'related: ["peer-a"]',
      'parents: ["hub-a"]',
      '---',
      'Body',
    ].join('\n');

    const page = parseWikiMarkdownText(markdown, { now: 100 });

    expect(page).toMatchObject({
      title: 'External Note',
      aliases: ['Ext'],
      tags: ['frontend', 'query'],
      category: 'Research',
      status: 'active',
      isMain: true,
      cites: ['paper-a'],
      similarTo: ['peer-a'],
      parentMocs: ['hub-a'],
      body: 'Body',
    });
    expect(page.updatedAt).toBe(Date.parse('2024-05-03T12:00:00.000Z'));
  });

  it('imports multiple markdown files and reports per-file failures', async () => {
    class TestFile {
      name: string;
      private content: string;

      constructor(content: string, name: string) {
        this.content = content;
        this.name = name;
      }

      async text() {
        if (this.name === 'broken.md') throw new Error('read failed');
        return this.content;
      }
    }

    const result = await importMarkdownFiles([
      new TestFile('---\ntitle: A\n---\nBody A', 'a.md') as unknown as File,
      new TestFile('No frontmatter body', 'Plain Note.md') as unknown as File,
      new TestFile('', 'broken.md') as unknown as File,
    ]);

    expect(result.imported).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.pages.map((page) => page.title)).toEqual(['A', 'Plain Note']);
    expect(result.errors[0]).toMatchObject({ fileName: 'broken.md', message: 'read failed' });
  });

  it('imports markdown pages from the exported zip while skipping the generated index', async () => {
    const entries = buildWikiMarkdownArchiveEntries([
      page({ id: 'zip-a', title: 'Zip A', body: 'Body A' }),
      page({ id: 'zip-b', title: 'Zip B', body: 'Body B' }),
    ]);
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    entries.forEach((entry) => zip.file(entry.path, entry.content));
    const buffer = await zip.generateAsync({ type: 'arraybuffer' });
    const zipFile = {
      name: 'wiki-markdown.zip',
      arrayBuffer: async () => buffer,
      text: async () => {
        throw new Error('zip should be read as arrayBuffer');
      },
    } as unknown as File;

    const result = await importMarkdownFiles([zipFile]);

    expect(result.imported).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.pages.map((page) => page.title)).toEqual(['Zip A', 'Zip B']);
  });

  it('builds useful quick capture draft pages from raw notes', () => {
    const text = [
      'React Query 캐시 전략 #frontend',
      'https://tanstack.com/query/latest',
    ].join('\n');

    expect(extractCaptureUrls(text)).toEqual(['https://tanstack.com/query/latest']);
    expect(extractCaptureTags(text)).toEqual(['frontend']);
    expect(deriveCaptureTitle(text)).toBe('React Query 캐시 전략 #frontend');

    const draft = buildQuickCapturePage({
      text,
      extraTags: ['study', '#frontend'],
    });

    expect(draft.title).toBe('React Query 캐시 전략 #frontend');
    expect(draft.tags).toEqual(['수집함', 'frontend', 'study']);
    expect(draft.page.status).toBe('draft');
    expect(draft.page.body).toContain('## 출처');
  });

  it('uses a Korean fallback title for empty quick captures', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 10, 9, 5, 0, 0));
    try {
      expect(deriveCaptureTitle('')).toBe('수집 메모 6/10 09:05');
      expect(buildQuickCapturePage({ text: '' }).tags).toEqual(['수집함']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('builds richer AI context from page and whole wiki state', () => {
    const pages = [
      page({ id: 'main', title: 'Main', isMain: true, tags: ['hub'], body: '[[Alpha]] [[Missing]]' }),
      page({ id: 'alpha', title: 'Alpha', aliases: ['A'], tags: ['topic'], body: 'Alpha body', cites: ['source'] }),
      page({ id: 'source', title: 'Source', type: 'source', body: 'Book note' }),
      page({ id: 'alone', title: 'Loose', body: 'loose note' }),
    ];

    const pageContext = buildWikiAiContext({ scope: 'page', page: pages[1], pages, question: 'alpha' });
    expect(pageContext).toContain('현재 위키 페이지 컨텍스트');
    expect(pageContext).toContain('이 페이지를 참조한 문서: Main');
    expect(pageContext).toContain('나가는 연결: Source');

    const allContext = buildWikiAiContext({ scope: 'all', page: null, pages, question: 'alpha' });
    expect(allContext).toContain('사용자의 위키 전체 컨텍스트');
    expect(allContext).toContain('아직 만들어야 할 링크: Missing(1)');
    expect(allContext).toContain('질문과 관련 높은 페이지');

    expect(deriveWikiPageTitleFromAnswer('## 새 정리\n\n본문')).toBe('새 정리');
  });

  it('rewrites incoming wiki links safely when a page is renamed', () => {
    const map = new Map([['old title', 'New Title']]);

    expect(rewriteWikiLinkTargets('[[Old Title]] and [[Old Title|label]]', map))
      .toBe('[[New Title]] and [[New Title|label]]');
    expect(rewriteWikiLinkTargets('[open](##wiki:Old%20Title)', map))
      .toBe('[open](##wiki:New%20Title)');
    expect(addAliasOnce(['Old Title'], 'old title')).toEqual(['Old Title']);
    expect(addAliasOnce([], 'Old Title')).toEqual(['Old Title']);
  });

  it('formats safe wiki links for quick copy actions', () => {
    expect(formatWikiTitleLink('React Query')).toBe('[[React Query]]');
    expect(formatWikiTitleLink('React | Query', '캐시 정리')).toBe('[[React / Query|캐시 정리]]');
    expect(formatWikiTitleLink('Broken]] title')).toBe('[[Broken title]]');
    expect(formatWikiIdMarkdownLink('w_abc123', 'React ] Query')).toBe('[React \\] Query](##wiki:w_abc123)');
  });

  it('finds likely duplicate wiki pages for cleanup', () => {
    const pages = [
      page({ id: 'a', title: 'React Query 정리', tags: ['react', 'query'], body: '서버 상태 캐시 전략' }),
      page({ id: 'b', title: 'React Query 노트', aliases: ['React Query 정리'], tags: ['react', 'query'], body: '서버 상태 캐시 메모' }),
      page({ id: 'c', title: '요리 메모', tags: ['food'], body: '파스타 소스' }),
      page({ id: 'd', title: 'Archived React Query 정리', status: 'archived', body: '서버 상태 캐시' }),
    ];

    const candidates = findDuplicateWikiCandidates(pages);

    expect(candidates[0]).toMatchObject({
      a: pages[0],
      b: pages[1],
    });
    expect(candidates[0].reasons).toEqual(expect.arrayContaining(['별칭 겹침', '태그 유사']));
    expect(candidates.some((candidate) => candidate.a.id === 'd' || candidate.b.id === 'd')).toBe(false);
  });

  it('merges duplicate wiki pages while preserving aliases, content, and archive trail', () => {
    const primary = page({
      id: 'primary',
      title: 'React Query',
      aliases: ['TanStack Query'],
      tags: ['react'],
      body: 'Primary notes',
      refersTo: ['cache', 'secondary'],
      similarTo: ['secondary'],
      updatedAt: 10,
    });
    const secondary = page({
      id: 'secondary',
      title: 'React Query Notes',
      aliases: ['RQ'],
      tags: ['query'],
      body: 'Secondary notes',
      refersTo: ['cache', 'server'],
      cites: ['book'],
      updatedAt: 20,
    });

    const { merged, archived } = mergeWikiPages({ primary, secondary, now: 99 });

    expect(merged.aliases).toEqual(['TanStack Query', 'React Query Notes', 'RQ']);
    expect(merged.tags).toEqual(['react', 'query']);
    expect(merged.body).toContain('Primary notes');
    expect(merged.body).toContain('Secondary notes');
    expect(merged.refersTo).toEqual(['cache', 'server']);
    expect(merged.similarTo).toEqual([]);
    expect(merged.cites).toEqual(['book']);
    expect(merged.updatedAt).toBe(99);

    expect(archived.status).toBe('archived');
    expect(archived.tags).toEqual(['query', 'merged']);
    expect(archived.body).toContain('[[React Query]]');
  });

  it('replaces merged relation targets without duplicates', () => {
    expect(replaceRelationTarget(['a', 'secondary', 'primary', 'secondary'], 'secondary', 'primary'))
      .toEqual(['a', 'primary']);
  });

  it('archives and restores wiki pages through a predictable status transition', () => {
    const active = page({ id: 'keep', title: 'Keep me', status: 'active', updatedAt: 10 });
    const archived = setWikiPageArchived(active, true, 99);
    const restored = setWikiPageArchived(archived, false, 120);

    expect(archived).toMatchObject({ status: 'archived', updatedAt: 99 });
    expect(restored).toMatchObject({ status: 'active', updatedAt: 120 });
    expect(setWikiPageArchived(archived, true, 130)).toBe(archived);
  });
});

function page(overrides: Partial<WikiPage> & Pick<WikiPage, 'id' | 'title'>): WikiPage {
  return {
    id: overrides.id,
    title: overrides.title,
    aliases: [],
    type: 'concept',
    status: 'active',
    tags: [],
    body: '',
    refersTo: [],
    cites: [],
    inherits: [],
    similarTo: [],
    parentMocs: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}
