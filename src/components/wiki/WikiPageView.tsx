import { useState, useEffect, useRef, useMemo, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Copy, Link2, Pencil, PlusCircle, Trash2, Save, X, Download, Star, Check, History, Home, ChevronDown, FileText, FileType, FileCode, Pencil as PencilIcon, RotateCcw, Sparkles, ListChecks, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemos } from '@/lib/memoStore';
import {
  type WikiPage, type WikiPageStatus, type WikiPageType,
  WIKI_TYPE_META, WIKI_STATUS_META, VISIBLE_WIKI_STATUSES, isMainDoc,
  extractWikiLinks,
} from '@/types/wiki';
import { WikiBody } from './WikiBody';
import { WikiToc } from './WikiToc';
import { WikiInfobox } from './WikiInfobox';
import { WikiLocalGraph } from './WikiLocalGraph';
import { WikiBlockEditor } from './WikiBlockEditor';
import { saveImage } from '@/lib/wikiImageStore';
import { WikiHistoryPanel } from './WikiHistoryPanel';
import { buildWikiExportHtml, wikiPageToMarkdown } from '@/lib/wikiExport';
import { formatWikiIdMarkdownLink, linkFirstUnlinkedMention, linkUnlinkedMentions } from '@/lib/wikiLinks';
import { analyzeWikiPageHealth, buildWikiBacklinkPreviews, collectWikiManualRelations, collectWikiOutgoingLinks, findUnlinkedWikiMentions, suggestRelatedWikiPages, type WikiBacklinkPreview, type WikiLinkMentionSuggestion, type WikiManualRelationGroup, type WikiPageHealthItem, type WikiRelatedSuggestion } from '@/lib/wikiQuery';

interface Props {
  page: WikiPage;
  editing: boolean;
  backlinks: WikiPage[];
  allPages: WikiPage[];
  findByTitle: (title: string) => WikiPage | undefined;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onChange: (next: WikiPage) => void;
  onRestore: (snapshot: WikiPage) => void;
  onArchive: () => void;
  onRestoreArchived: () => void;
  onDelete: () => void;
  onToggleEdit: () => void;
  onOpenLink: (titleOrId: string) => void;
  /** 헤더 🏠 홈 버튼 → 대문(WikiHome) 으로 이동 */
  onGoHome?: () => void;
  /** 로컬 그래프 '전체 그래프에서 보기' — 부모가 view='graph' + focusId 처리 */
  onOpenInGlobalGraph?: (centerId: string) => void;
  /** 인포박스 태그 칩 클릭 시 — 부모가 사이드바 검색에 반영. */
  onTagClick?: (tag: string) => void;
  /** 방문(최근 본) 페이지 id Set — 위키링크 visited 색상 적용용. */
  visitedIds?: Set<string>;
  /** 새 문서를 만들고 연결 — picker '새로 만들기' 탭에서 호출 */
  onCreateAndLink?: (title: string, type: import('@/types/wiki').WikiPageType) => Promise<WikiPage> | WikiPage;
}

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved';

const AUTOSAVE_DELAY_MS = 1200;

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 10) return '방금';
  if (s < 60) return `${s}초 전`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(ts).toLocaleDateString('ko-KR');
}

export function WikiPageView({
  page, editing, backlinks, allPages, findByTitle,
  isFavorite, onToggleFavorite,
  onChange, onRestore, onArchive, onRestoreArchived, onDelete, onToggleEdit, onOpenLink, onGoHome, onOpenInGlobalGraph, onCreateAndLink,
  onTagClick, visitedIds,
}: Props) {
  const [draft, setDraft] = useState<WikiPage>(page);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [copiedWikiLink, setCopiedWikiLink] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!editing) {
      setDraft(page);
      setSaveStatus('idle');
    }
  }, [page, editing]);

  // 자동 저장 — 편집 중 1.2초 idle 시 저장
  useEffect(() => {
    if (!editing) return;
    // 첫 마운트 (draft === page) 시엔 저장 X
    if (draft === page) return;
    setSaveStatus('pending');
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      setSaveStatus('saving');
      onChangeRef.current(draft);
      // onChange 후 외부 page prop 이 바뀌면 useEffect[page] 가 draft 동기화 — 그 사이 잠깐 saved 표시
      window.setTimeout(() => setSaveStatus('saved'), 80);
      window.setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 1800);
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [draft, editing, page]);

  const typeMeta = WIKI_TYPE_META[page.type];
  const outgoingLinks = useMemo(() => collectWikiOutgoingLinks(page, allPages), [page, allPages]);
  const manualRelations = useMemo(() => collectWikiManualRelations(page, allPages), [page, allPages]);
  const relatedSuggestions = useMemo(() => suggestRelatedWikiPages(page, allPages), [page, allPages]);
  const linkMentionSuggestions = useMemo(() => findUnlinkedWikiMentions(page, allPages), [page, allPages]);
  const healthItems = useMemo(() => analyzeWikiPageHealth(page, allPages), [page, allPages]);
  const backlinkPreviews = useMemo(() => {
    const previews = buildWikiBacklinkPreviews(page, allPages);
    if (previews.length > 0 || backlinks.length === 0) return previews;
    return backlinks.map((source) => ({
      page: source,
      reasons: ['백링크'],
      snippet: '문서 관계로 연결되어 있습니다.',
    }));
  }, [page, allPages, backlinks]);

  const save = () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    onChange(draft);
    onToggleEdit();
  };
  const cancel = () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setDraft(page);
    onToggleEdit();
  };

  /** 페이지를 frontmatter + 본문 형식의 .md 파일로 다운로드. */
  const exportMd = () => {
    const md = wikiPageToMarkdown(page);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${page.title.replace(/[\\/:*?"<>|]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyWikiLink = () => {
    const link = formatWikiIdMarkdownLink(page.id, page.title);
    if (!link) return;
    void navigator.clipboard.writeText(link).then(() => {
      setCopiedWikiLink(true);
      window.setTimeout(() => setCopiedWikiLink(false), 1400);
    }).catch(() => {});
  };

  const applyMentionLink = (suggestion: WikiLinkMentionSuggestion) => {
    const nextBody = linkFirstUnlinkedMention(page.body, suggestion.matchedText, suggestion.page.title);
    if (nextBody === page.body) return;
    onChange({ ...page, body: nextBody, updatedAt: Date.now() });
  };

  const applyAllMentionLinks = () => {
    const nextBody = linkUnlinkedMentions(
      page.body,
      linkMentionSuggestions.map((suggestion) => ({
        matchedText: suggestion.matchedText,
        targetTitle: suggestion.page.title,
        index: suggestion.index,
      })),
    );
    if (nextBody === page.body) return;
    onChange({ ...page, body: nextBody, updatedAt: Date.now() });
  };

  return (
    <div className="px-5 py-7 lg:px-8 lg:py-9">
      {/* 카테고리/유형 brebrumb — 위키 페이지 상단 */}
      <div className="max-w-[1360px] mx-auto mb-3 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <span aria-hidden>{typeMeta.icon}</span>
        <span style={{ color: typeMeta.tint }}>{typeMeta.label}</span>
        {page.category && (
          <>
            <span>›</span>
            <span>{page.category}</span>
          </>
        )}
      </div>

      <div className="wiki-document-shell wiki-document-grid">
        {/* 본문 — 좌측 TOC 레일 제거로 폭 확대 (2026-07-06). */}
        <article className="wiki-document-main">
          {/* 제목 + 액션 */}
          <header className="wiki-page-header">
            {/* 상위 문서 줄 — 비편집 모드만. 일반 문서·sub-main 모두 표시 (root main 은 부모 0이라 자동 숨김) */}
            {!editing && <ParentMainsRow page={page} allPages={allPages} onOpen={onOpenLink} />}
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                {editing ? (
                  <>
                    <input
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                      className="wiki-page-title-input"
                      placeholder="문서 제목"
                    />
                    {draft.title.trim() && draft.title.trim() !== page.title.trim() && (
                      <p className="mt-1 text-[11px] text-primary/80">
                        저장하면 기존 제목은 별칭으로 남기고, 다른 문서의 연결도 새 제목에 맞춰 정리합니다.
                      </p>
                    )}
                  </>
                ) : (
                  <h1
                    className="wiki-page-title"
                  >
                    {page.title}
                  </h1>
                )}
                {!editing && (
                  <>
                    <p
                      className="wiki-meta-line"
                    >
                      {(() => {
                        const charCount = page.body.replace(/\s+/g, '').length;
                        const readMin = Math.max(1, Math.round(charCount / 500));
                        return (
                          <>
                            {charCount.toLocaleString()}글자
                            <span className="mx-1.5 opacity-50">·</span>
                            약 {readMin}분
                            <span className="mx-1.5 opacity-50">·</span>
                            {relativeTime(page.updatedAt)}
                          </>
                        );
                      })()}
                      {page.aliases.length > 0 && (
                        <span className="ml-2 opacity-70">· 별칭: {page.aliases.join(' · ')}</span>
                      )}
                    </p>
                    <MemoSourceChip pageId={page.id} />
                  </>
                )}
              </div>
              <div className="wiki-page-actions shrink-0">
                {editing ? (
                  <>
                    <SaveStatusBadge status={saveStatus} />
                    <button onClick={cancel} className="px-2.5 h-8 rounded-md text-[12px] text-muted-foreground hover:bg-accent transition-colors flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> 취소
                    </button>
                    <button onClick={save} className="px-3 h-8 rounded-md border border-primary/35 bg-card text-primary text-[12px] font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors flex items-center gap-1">
                      <Save className="w-3.5 h-3.5" /> 저장
                    </button>
                  </>
                ) : (
                  <>
                    {onGoHome && (
                      <button
                        onClick={onGoHome}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
                        title="대문으로"
                        aria-label="대문으로"
                      >
                        <Home className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={onToggleFavorite}
                      className={cn(
                        'h-8 w-8 inline-flex items-center justify-center rounded-md wiki-trans-color',
                        isFavorite
                          ? 'text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                      title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
                      aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
                    >
                      <Star className={cn('w-3.5 h-3.5', isFavorite && 'fill-current')} />
                    </button>
                    <button onClick={onToggleEdit} className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md text-[11.5px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color" title="편집 모드 진입 (E)">
                      <Pencil className="w-3.5 h-3.5" /> 편집
                    </button>
                    <button onClick={() => setHistoryOpen(true)} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color" title="버전 히스토리" aria-label="버전 히스토리">
                      <History className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={copyWikiLink} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color" title="문서 연결 복사" aria-label="문서 연결 복사">
                      {copiedWikiLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <DownloadMenu page={page} exportMd={exportMd} />
                    {page.status === 'archived' ? (
                      <button onClick={onRestoreArchived} className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md text-[11.5px] text-primary hover:bg-primary/10 wiki-trans-color" title="보관 문서 복원">
                        <RotateCcw className="w-3.5 h-3.5" /> 복원
                      </button>
                    ) : (
                      <button onClick={onArchive} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color" title="보관" aria-label="보관">
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={onDelete} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive wiki-trans-color" title="완전 삭제" aria-label="완전 삭제">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 모바일 인포 (lg 이하에서만 노출) */}
            <div className="lg:hidden mt-3">
              {editing ? (
                <WikiEditMetaPanel
                  draft={draft}
                  onChange={setDraft}
                  allPages={allPages}
                />
              ) : (
                <MetaChips page={page} />
              )}
            </div>
          </header>

          {!editing && page.body && (
            <div className="lg:hidden mb-4">
              <WikiToc body={page.body} variant="inline" />
            </div>
          )}

          {/* 편집 모드 — 메타 폼 */}
          {editing && (
            <div className="wiki-edit-control-shell hidden lg:block">
              <WikiEditMetaPanel
                draft={draft}
                onChange={setDraft}
                allPages={allPages}
              />
            </div>
          )}

          {!editing && page.status === 'archived' && (
            <div className="mb-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[12px] leading-5 text-amber-800 dark:text-amber-200">
              보관된 문서입니다. 검색과 링크는 유지되지만, 다시 작업하려면 상단의 복원을 눌러 활성 문서로 되돌리세요.
            </div>
          )}

          {!editing && healthItems.length > 0 && (
            <PageHealthSection items={healthItems} />
          )}

          {/* 본문 — 블록 에디터 (모든 페이지 동일) */}
          <section className={cn('min-h-[200px]', editing ? 'wiki-editing-section' : 'wiki-prose')}>
            {editing ? (
              <WikiBlockEditor
                body={draft.body}
                onChange={(md) => setDraft({ ...draft, body: md })}
                allPages={allPages}
                currentId={page.id}
                firstPlaceholder="첫 문장을 적어보세요"
                restPlaceholder="계속 쓰기"
                onUploadImage={async (file) => {
                  const id = await saveImage(file);
                  return `wiki-image:${id}`;
                }}
                onCreateAndLink={onCreateAndLink}
              />
            ) : (
              <WikiBody
                body={page.body}
                findByTitle={findByTitle}
                visitedIds={visitedIds}
                onOpenLink={onOpenLink}
              />
            )}
          </section>

          {!editing && linkMentionSuggestions.length > 0 && (
            <LinkMentionSection
              suggestions={linkMentionSuggestions}
              onOpen={onOpenLink}
              onApply={applyMentionLink}
              onApplyAll={applyAllMentionLinks}
            />
          )}

          {!editing && manualRelations.length > 0 && (
            <ManualRelationsSection groups={manualRelations} onOpen={onOpenLink} />
          )}

          {!editing && (outgoingLinks.existing.length > 0 || outgoingLinks.missing.length > 0) && (
            <OutgoingLinksSection
              existing={outgoingLinks.existing}
              missing={outgoingLinks.missing}
              onOpen={onOpenLink}
            />
          )}

          {!editing && relatedSuggestions.length > 0 && (
            <RelatedPagesSection suggestions={relatedSuggestions} onOpen={onOpenLink} />
          )}

          {/* 백링크 */}
          {!editing && backlinkPreviews.length > 0 && (
            <BacklinkPreviewSection previews={backlinkPreviews} onOpen={onOpenLink} />
          )}
        </article>

        {/* 우: 목차 → 문서정보(인포박스) → 로컬 그래프 (2026-07-06: TOC 를 좌측에서 우상단으로). */}
        <div className="wiki-side-rail wiki-reference-panel hidden flex-col gap-5 lg:flex">
          {!editing && page.body && <WikiToc body={page.body} />}
          {!editing && <WikiInfobox page={page} onTagClick={onTagClick} />}
          {!editing && (
            <WikiLocalGraph page={page} allPages={allPages} onSelect={onOpenLink} onOpenInGlobal={onOpenInGlobalGraph} />
          )}
        </div>
      </div>

      {/* 버전 히스토리 패널 */}
      <WikiHistoryPanel
        open={historyOpen}
        page={page}
        onClose={() => setHistoryOpen(false)}
        onRestore={onRestore}
      />
    </div>
  );
}

function OutgoingLinksSection({
  existing,
  missing,
  onOpen,
}: {
  existing: WikiPage[];
  missing: string[];
  onOpen: (titleOrId: string) => void;
}) {
  return (
    <section className="mt-8 pt-4 border-t border-[hsl(var(--hairline))]">
      <h2
        className="text-[14px] font-serif font-bold text-foreground mb-2"
        style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
      >
        이 문서가 연결한 곳
        <span className="ml-2 text-[11px] font-sans font-normal text-muted-foreground">
          · {existing.length + missing.length}건
        </span>
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {existing.map((target) => (
          <button
            key={target.id}
            type="button"
            onClick={() => onOpen(target.id)}
            className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-[hsl(var(--hairline))] bg-card px-2 py-1 text-[12px] text-foreground/85 hover:border-primary/35 hover:bg-primary/5 hover:text-primary wiki-trans-color"
            title={target.title}
          >
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{WIKI_TYPE_META[target.type].icon} {target.title}</span>
          </button>
        ))}
        {missing.map((title) => (
          <button
            key={title}
            type="button"
            onClick={() => onOpen(title)}
            className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-[hsl(var(--wiki-link-missing)/0.28)] bg-[hsl(var(--wiki-link-missing)/0.06)] px-2 py-1 text-[12px] text-[hsl(var(--wiki-link-missing))] hover:bg-[hsl(var(--wiki-link-missing)/0.10)] wiki-trans-color"
            title={`${title} 문서 만들기`}
          >
            <PlusCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{title}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PageHealthSection({ items }: { items: WikiPageHealthItem[] }) {
  const warningCount = items.filter((item) => item.level === 'warning').length;
  return (
    <section className="mb-5 rounded-md border border-[hsl(var(--hairline))] bg-card/65 px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground/90">
          <ListChecks className="h-3.5 w-3.5 text-primary/75" />
          정리 체크
        </h2>
        <span className={cn(
          'rounded border px-1.5 py-0.5 text-[10.5px]',
          warningCount > 0
            ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
            : 'border-[hsl(var(--hairline))] bg-background/70 text-muted-foreground',
        )}
        >
          {warningCount > 0 ? `주의 ${warningCount}개` : '가벼운 정리'}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'rounded-md border px-2 py-1.5',
              item.level === 'warning'
                ? 'border-amber-500/25 bg-amber-500/8'
                : 'border-[hsl(var(--hairline))] bg-background/55',
            )}
          >
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-foreground/85">
              {item.level === 'warning' && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-300" />}
              <span className="truncate">{item.label}</span>
            </p>
            <p className="mt-0.5 text-[10.5px] leading-4 text-muted-foreground">
              {item.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ManualRelationsSection({
  groups,
  onOpen,
}: {
  groups: WikiManualRelationGroup[];
  onOpen: (titleOrId: string) => void;
}) {
  const total = groups.reduce((sum, group) => sum + group.pages.length + group.missingIds.length, 0);
  return (
    <section className="mt-8 pt-4 border-t border-[hsl(var(--hairline))]">
      <h2
        className="text-[14px] font-serif font-bold text-foreground mb-2"
        style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
      >
        문서 관계
        <span className="ml-2 text-[11px] font-sans font-normal text-muted-foreground">
          · {total}건
        </span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {groups.map((group) => (
          <div key={group.kind} className="rounded-md border border-[hsl(var(--hairline))] bg-card/70 px-3 py-2">
            <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">{group.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.pages.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => onOpen(target.id)}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-[hsl(var(--hairline))] bg-background/70 px-2 py-1 text-[12px] text-foreground/85 hover:border-primary/35 hover:bg-primary/5 hover:text-primary wiki-trans-color"
                  title={target.title}
                >
                  <Link2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{WIKI_TYPE_META[target.type].icon} {target.title}</span>
                </button>
              ))}
              {group.missingIds.map((id) => (
                <span
                  key={id}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[12px] text-amber-700 dark:text-amber-300"
                  title="현재 찾을 수 없는 관계 ID"
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{id}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LinkMentionSection({
  suggestions,
  onOpen,
  onApply,
  onApplyAll,
}: {
  suggestions: WikiLinkMentionSuggestion[];
  onOpen: (titleOrId: string) => void;
  onApply: (suggestion: WikiLinkMentionSuggestion) => void;
  onApplyAll: () => void;
}) {
  return (
    <section className="mt-8 pt-4 border-t border-[hsl(var(--hairline))]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2
          className="text-[14px] font-serif font-bold text-foreground"
          style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
        >
          링크 추천
          <span className="ml-2 text-[11px] font-sans font-normal text-muted-foreground">
            · {suggestions.length}건
          </span>
        </h2>
        {suggestions.length > 1 && (
          <button
            type="button"
            onClick={onApplyAll}
            className="h-7 rounded-md border border-primary/30 bg-primary/5 px-2.5 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground wiki-trans-color"
          >
            모두 링크로 바꾸기
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {suggestions.map((suggestion) => (
          <div
            key={`${suggestion.page.id}-${suggestion.index}`}
            className="rounded-md border border-[hsl(var(--hairline))] bg-card/70 px-3 py-2"
          >
            <p className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold text-foreground/90">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-primary/75" />
              <span className="truncate">{suggestion.matchedText}</span>
              <span className="shrink-0 text-[10.5px] font-normal text-muted-foreground">→</span>
              <span className="truncate text-primary">{suggestion.page.title}</span>
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="rounded border border-[hsl(var(--hairline))] bg-background/70 px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                {suggestion.reason}
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onOpen(suggestion.page.id)}
                  className="h-6 rounded-md px-2 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
                >
                  열기
                </button>
                <button
                  type="button"
                  onClick={() => onApply(suggestion)}
                  className="h-6 rounded-md border border-primary/30 bg-primary/5 px-2 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground wiki-trans-color"
                >
                  링크로 바꾸기
                </button>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RelatedPagesSection({
  suggestions,
  onOpen,
}: {
  suggestions: WikiRelatedSuggestion[];
  onOpen: (titleOrId: string) => void;
}) {
  return (
    <section className="mt-8 pt-4 border-t border-[hsl(var(--hairline))]">
      <h2
        className="text-[14px] font-serif font-bold text-foreground mb-2"
        style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
      >
        관련 문서
        <span className="ml-2 text-[11px] font-sans font-normal text-muted-foreground">
          · {suggestions.length}건
        </span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {suggestions.map(({ page: target, reasons }) => (
          <button
            key={target.id}
            type="button"
            onClick={() => onOpen(target.id)}
            className="group min-w-0 rounded-md border border-[hsl(var(--hairline))] bg-card/70 px-3 py-2 text-left hover:border-primary/30 hover:bg-primary/5 wiki-trans-color"
            title={target.title}
          >
            <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground/90 group-hover:text-primary">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary/75" />
              <span className="truncate">{WIKI_TYPE_META[target.type].icon} {target.title}</span>
            </span>
            <span className="mt-1 flex flex-wrap gap-1">
              {reasons.map((reason) => (
                <span key={reason} className="rounded border border-[hsl(var(--hairline))] bg-background/70 px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                  {reason}
                </span>
              ))}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function BacklinkPreviewSection({
  previews,
  onOpen,
}: {
  previews: WikiBacklinkPreview[];
  onOpen: (titleOrId: string) => void;
}) {
  return (
    <section className="mt-8 pt-4 border-t border-[hsl(var(--hairline))]">
      <h2
        className="text-[14px] font-serif font-bold text-foreground mb-2"
        style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
      >
        이 문서를 인용한 곳
        <span className="ml-2 text-[11px] font-sans font-normal text-muted-foreground">
          · {previews.length}건
        </span>
      </h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {previews.map(({ page: source, reasons, snippet }) => (
          <li key={source.id}>
            <button
              type="button"
              onClick={() => onOpen(source.id)}
              className="group w-full rounded-md border border-[hsl(var(--hairline))] bg-card/70 px-3 py-2 text-left hover:border-primary/30 hover:bg-primary/5 wiki-trans-color"
            >
              <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold text-foreground/90 group-hover:text-primary">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                <span className="truncate">{WIKI_TYPE_META[source.type].icon} {source.title}</span>
              </span>
              <span className="mt-1 line-clamp-2 block text-[11.5px] leading-5 text-muted-foreground">
                {snippet}
              </span>
              <span className="mt-2 flex flex-wrap gap-1">
                {reasons.slice(0, 3).map((reason) => (
                  <span key={reason} className="rounded border border-[hsl(var(--hairline))] bg-background/70 px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                    {reason}
                  </span>
                ))}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── 자동 저장 상태 배지 ── */
function SaveStatusBadge({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  const map: Record<Exclude<SaveStatus, 'idle'>, { text: string; cls: string; icon?: React.ReactNode }> = {
    pending: { text: '입력 중…', cls: 'text-muted-foreground' },
    saving:  { text: '저장 중', cls: 'text-blue-600 dark:text-blue-300' },
    saved:   { text: '저장됨',   cls: 'text-emerald-600 dark:text-emerald-300', icon: <Check className="w-3 h-3" /> },
  };
  const m = map[status];
  return (
    <span className={cn('mr-1 inline-flex h-6 items-center gap-1 rounded-full border border-[hsl(var(--hairline))] bg-card/80 px-2 text-[10.5px] font-semibold', m.cls)}>
      {m.icon}
      {m.text}
    </span>
  );
}

/* ── 메타 칩/폼 ── */
/* Meta chips for read mode */
function MetaChips({ page }: { page: WikiPage }) {
  const typeMeta = WIKI_TYPE_META[page.type];
  const statusMeta = WIKI_STATUS_META[page.status];
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {isMainDoc(page) && (
        <span className="text-[10.5px] px-2 h-5 rounded-full font-semibold tracking-[0.04em] bg-primary/10 text-primary inline-flex items-center gap-1">
          메인
        </span>
      )}
      <span className="text-[10.5px] px-2 h-5 inline-flex items-center rounded-full font-medium border" style={{ borderColor: `${typeMeta.tint}40`, color: typeMeta.tint, backgroundColor: `${typeMeta.tint}0D` }}>
        {typeMeta.icon} {typeMeta.label}
      </span>
      <span className="text-[10.5px] px-2 h-5 inline-flex items-center rounded-full font-medium border" style={{ borderColor: `${statusMeta.tint}40`, color: statusMeta.tint, backgroundColor: `${statusMeta.tint}0D` }}>
        {statusMeta.label}
      </span>
      {page.tags.map((tag) => (
        <span key={tag} className="text-[10.5px] px-2 h-5 inline-flex items-center rounded-full bg-accent/60 text-muted-foreground font-medium">
          #{tag}
        </span>
      ))}
    </div>
  );
}

function WikiEditMetaPanel({
  draft,
  onChange,
  allPages,
}: {
  draft: WikiPage;
  onChange: (next: WikiPage) => void;
  allPages: WikiPage[];
}) {
  const [activeMetaEditor, setActiveMetaEditor] = useState<'find' | 'relations' | null>(null);
  const findTriggerRef = useRef<HTMLButtonElement | null>(null);
  const relationsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const isMainOn = !!draft.isMain || draft.type === 'moc';
  const relationCount =
    draft.cites.length + draft.inherits.length + draft.similarTo.length + draft.parentMocs.length;
  const tagAliasCount = draft.tags.length + draft.aliases.length;
  const closeActiveMetaEditor = () => {
    const trigger = activeMetaEditor === 'find' ? findTriggerRef.current : relationsTriggerRef.current;
    setActiveMetaEditor(null);
    window.requestAnimationFrame(() => trigger?.focus());
  };

  return (
    <div
      data-wiki-edit-meta-panel="true"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !activeMetaEditor) return;
        event.preventDefault();
        event.stopPropagation();
        closeActiveMetaEditor();
      }}
      className="wiki-edit-meta-panel"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 shrink-0 text-[12.5px] font-bold text-foreground">문서 정보</span>
        <button
          type="button"
          onClick={() => onChange({
            ...draft,
            isMain: !isMainOn,
            type: isMainOn && draft.type === 'moc' ? 'concept' : draft.type,
          })}
          title={isMainOn ? '메인 문서 해제' : '메인 문서로 지정'}
          className={cn(
            'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold transition-colors',
            isMainOn
              ? 'border-violet-300 bg-violet-500/12 text-violet-700 dark:text-violet-300'
              : 'border-[hsl(var(--hairline))] bg-background/70 text-muted-foreground hover:border-violet-200 hover:text-foreground',
          )}
        >
          메인
          {isMainOn && <Check className="h-3 w-3" />}
        </button>

        <label className="flex min-w-[148px] flex-1 items-center gap-2 rounded-lg border border-[hsl(var(--hairline))] bg-background/60 px-2.5 py-1.5 sm:max-w-[210px]">
          <span className="shrink-0 text-[11px] font-bold text-muted-foreground">상태</span>
          <select
            value={draft.status}
            onChange={(e) => onChange({ ...draft, status: e.target.value as WikiPageStatus })}
            className="h-6 min-w-0 flex-1 bg-transparent text-[12.5px] font-semibold text-foreground outline-none"
            title="문서 상태"
          >
            {draft.status === 'draft' && (
              <option value="draft">{WIKI_STATUS_META.draft.label}</option>
            )}
            {VISIBLE_WIKI_STATUSES.map((k) => (
              <option key={k} value={k}>{WIKI_STATUS_META[k].label}</option>
            ))}
            {draft.status === 'archived' && (
              <option value="archived">{WIKI_STATUS_META.archived.label}</option>
            )}
          </select>
        </label>

        <label className="flex min-w-[188px] flex-[1.4] items-center gap-2 rounded-lg border border-[hsl(var(--hairline))] bg-background/60 px-2.5 py-1.5">
          <span className="shrink-0 text-[11px] font-bold text-muted-foreground">분류</span>
          <input
            type="text"
            value={draft.category ?? ''}
            onChange={(e) => onChange({ ...draft, category: e.target.value.trim() ? e.target.value : undefined })}
            className="h-6 min-w-0 flex-1 bg-transparent text-[12.5px] font-medium text-foreground outline-none placeholder:text-muted-foreground/55"
            placeholder="예: 러닝, 프로젝트"
            title="문서 분류"
          />
        </label>

        <button
          ref={findTriggerRef}
          type="button"
          onClick={() => setActiveMetaEditor((current) => current === 'find' ? null : 'find')}
          title="별칭과 태그 편집"
          aria-controls="wiki-meta-find-panel"
          aria-expanded={activeMetaEditor === 'find'}
          className={cn(
            'inline-flex h-8 shrink-0 items-center rounded-lg px-2.5 text-[11.5px] font-semibold transition-colors',
            activeMetaEditor === 'find'
              ? 'bg-primary/10 text-primary'
              : 'bg-accent/55 text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
          aria-pressed={activeMetaEditor === 'find'}
        >
          별칭/태그 <span className="ml-1 tabular-nums text-foreground">{tagAliasCount}</span>
        </button>
        <button
          ref={relationsTriggerRef}
          type="button"
          onClick={() => setActiveMetaEditor((current) => current === 'relations' ? null : 'relations')}
          title="문서 연결 편집"
          aria-controls="wiki-meta-relations-panel"
          aria-expanded={activeMetaEditor === 'relations'}
          className={cn(
            'inline-flex h-8 shrink-0 items-center rounded-lg px-2.5 text-[11.5px] font-semibold transition-colors',
            activeMetaEditor === 'relations'
              ? 'bg-primary/10 text-primary'
              : 'bg-accent/55 text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
          aria-pressed={activeMetaEditor === 'relations'}
        >
          문서 연결 <span className="ml-1 tabular-nums text-foreground">{relationCount}</span>
        </button>
      </div>

      {activeMetaEditor === 'find' && (
      <div
        id="wiki-meta-find-panel"
        className="mt-2 border-t border-[hsl(var(--hairline))] pt-2"
      >
        <section className="min-w-0">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            <div className="space-y-1">
              <div className="text-[10.5px] font-semibold text-muted-foreground">별칭</div>
              <WikiTextChipInput
                values={draft.aliases}
                onChange={(next) => onChange({ ...draft, aliases: next })}
                placeholder="별칭 입력 후 Enter"
                prefix="="
                ariaLabel="별칭"
              />
            </div>

            <div className="space-y-1">
              <div className="text-[10.5px] font-semibold text-muted-foreground">태그</div>
              <WikiTagChipInput
                tags={draft.tags}
                onChange={(next) => onChange({ ...draft, tags: next })}
                allPages={allPages}
                currentId={draft.id}
              />
            </div>
          </div>
        </section>
      </div>
      )}

      {activeMetaEditor === 'relations' && (
      <div
        id="wiki-meta-relations-panel"
        className="mt-2 border-t border-[hsl(var(--hairline))] pt-2"
      >
        <section className="min-w-0">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            <WikiRelationPicker
              label="인용"
              pages={allPages}
              currentId={draft.id}
              values={draft.cites}
              onChange={(next) => onChange({ ...draft, cites: next })}
              preferredType="source"
            />
            <WikiRelationPicker
              label="상위 개념"
              pages={allPages}
              currentId={draft.id}
              values={draft.inherits}
              onChange={(next) => onChange({ ...draft, inherits: next })}
            />
            <WikiRelationPicker
              label="유사 문서"
              pages={allPages}
              currentId={draft.id}
              values={draft.similarTo}
              onChange={(next) => onChange({ ...draft, similarTo: next })}
            />
            <WikiRelationPicker
              label="소속 메인"
              pages={allPages}
              currentId={draft.id}
              values={draft.parentMocs}
              onChange={(next) => onChange({ ...draft, parentMocs: next })}
              onlyMain
            />
          </div>
        </section>
      </div>
      )}
    </div>
  );
}

function WikiTextChipInput({
  values,
  onChange,
  placeholder,
  prefix,
  ariaLabel,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  prefix?: string;
  ariaLabel: string;
}) {
  const [input, setInput] = useState('');

  const addValue = (raw: string) => {
    const value = raw.trim().replace(/\s+/g, ' ');
    if (!value) return;
    if (values.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
      setInput('');
      return;
    }
    onChange([...values, value]);
    setInput('');
  };

  const removeValue = (idx: number) => {
    const next = values.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addValue(input);
    } else if (e.key === 'Backspace' && !input && values.length > 0) {
      e.preventDefault();
      removeValue(values.length - 1);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 min-h-7 px-1.5 py-0.5 rounded-md border border-[hsl(var(--hairline))] bg-card focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-colors" aria-label={ariaLabel}>
      {values.map((value, i) => (
        <span
          key={`${value}-${i}`}
          className="inline-flex items-center gap-0.5 h-5 pl-1.5 pr-1 rounded bg-accent text-foreground text-[10.5px] font-medium"
        >
          {prefix && <span className="text-muted-foreground">{prefix}</span>}
          {value}
          <button
            type="button"
            onClick={() => removeValue(i)}
            aria-label={`${value} 삭제`}
            className="ml-0.5 inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => {
          if (input.trim()) addValue(input);
        }}
        placeholder={values.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[90px] h-6 px-1 bg-transparent text-[11.5px] outline-none placeholder:text-muted-foreground/55"
      />
    </div>
  );
}

function WikiRelationPicker({
  label,
  pages,
  currentId,
  values,
  onChange,
  preferredType,
  onlyMain = false,
}: {
  label: string;
  pages: WikiPage[];
  currentId: string;
  values: string[];
  onChange: (next: string[]) => void;
  preferredType?: WikiPageType;
  onlyMain?: boolean;
}) {
  const candidates = useMemo(() => {
    const picked = new Set(values);
    return pages
      .filter((page) => page.id !== currentId && page.status !== 'archived' && !picked.has(page.id))
      .filter((page) => !onlyMain || isMainDoc(page))
      .sort((a, b) => {
        const preferredA = preferredType && a.type === preferredType ? 0 : 1;
        const preferredB = preferredType && b.type === preferredType ? 0 : 1;
        return preferredA - preferredB || a.title.localeCompare(b.title);
      });
  }, [pages, currentId, values, preferredType, onlyMain]);

  const byId = useMemo(() => new Map(pages.map((page) => [page.id, page])), [pages]);

  const add = (id: string) => {
    if (!id || values.includes(id)) return;
    onChange([...values, id]);
  };

  const remove = (id: string) => {
    onChange(values.filter((value) => value !== id));
  };

  return (
    <div className="rounded-md border border-[hsl(var(--hairline))] bg-background/55 px-2 py-1.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold text-muted-foreground">{label}</span>
        <select
          value=""
          onChange={(e) => {
            add(e.target.value);
            e.currentTarget.value = '';
          }}
          className="h-6 min-w-[118px] rounded-md border border-[hsl(var(--hairline))] bg-card px-1.5 text-[10.5px] text-foreground outline-none focus:border-primary/45 focus:ring-1 focus:ring-primary/15"
          aria-label={`${label} 추가`}
          disabled={candidates.length === 0}
        >
          <option value="">{candidates.length === 0 ? '추가 없음' : '추가'}</option>
          {candidates.map((page) => (
            <option key={page.id} value={page.id}>
              {WIKI_TYPE_META[page.type].icon} {page.title}
            </option>
          ))}
        </select>
      </div>
      {values.length === 0 ? (
        <p className="text-[10.5px] text-muted-foreground/65">아직 지정된 문서가 없습니다.</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {values.map((id) => {
            const page = byId.get(id);
            return (
              <span
                key={id}
                className="inline-flex max-w-full items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-[10.5px] text-foreground"
              >
                <span className="truncate">{page ? `${WIKI_TYPE_META[page.type].icon} ${page.title}` : id}</span>
                <button
                  type="button"
                  onClick={() => remove(id)}
                  className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                  aria-label={`${page?.title ?? id} 관계 제거`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── 태그 칩 입력 — 칩 인라인 + 자동완성 popover ── */
function WikiTagChipInput({
  tags, onChange, allPages, currentId,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  allPages: WikiPage[];
  currentId: string;
}) {
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);

  // 다른 페이지의 태그 풀 (빈도순 top, 현재 페이지 제외)
  const allTagsPool = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of allPages) {
      if (p.id === currentId) continue;
      for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [allPages, currentId]);

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    const taken = new Set(tags.map((t) => t.toLowerCase()));
    const pool = allTagsPool.filter((t) => !taken.has(t.toLowerCase()));
    if (!q) return pool.slice(0, 6);
    return pool.filter((t) => t.toLowerCase().includes(q)).slice(0, 6);
  }, [allTagsPool, tags, input]);

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#+/, '');
    if (!t) return;
    if (tags.some((existing) => existing.toLowerCase() === t.toLowerCase())) {
      setInput('');
      return;
    }
    onChange([...tags, t]);
    setInput('');
  };

  const removeTag = (idx: number) => {
    const next = tags.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || (e.key === ' ' && input.trim())) {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      e.preventDefault();
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className="relative flex-1 min-w-[200px]">
      <div className="flex flex-wrap items-center gap-1 min-h-7 px-1.5 py-0.5 rounded-md border border-[hsl(var(--hairline))] bg-card focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-colors">
        {tags.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="inline-flex items-center gap-0.5 h-5 pl-1.5 pr-1 rounded bg-accent text-foreground text-[10.5px] font-medium"
          >
            <span className="text-muted-foreground">#</span>
            {t}
            <button
              type="button"
              onClick={() => removeTag(i)}
              aria-label={`${t} 태그 삭제`}
              className="ml-0.5 inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // popover 클릭 위해 약간 지연
            setTimeout(() => setFocused(false), 150);
            if (input.trim()) addTag(input);
          }}
          placeholder={tags.length === 0 ? '태그 입력 후 Enter' : ''}
          className="flex-1 min-w-[80px] h-6 px-1 bg-transparent text-[11.5px] outline-none placeholder:text-muted-foreground/55"
        />
      </div>

      {/* 자동완성 popover */}
      {focused && suggestions.length > 0 && (
        <div className="absolute z-30 left-0 top-full mt-1 min-w-[200px] rounded-md border border-[hsl(var(--hairline))] bg-card shadow-md py-1">
          <div className="px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            {input.trim() ? '검색' : '자주 쓰는 태그'}
          </div>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // blur 방지
                addTag(s);
              }}
              className="w-full text-left px-2 py-1 text-[11.5px] hover:bg-accent transition-colors flex items-center gap-1"
            >
              <span className="text-muted-foreground">#</span>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 다운로드 양식 선택 dropdown — Markdown / HTML / PDF ── */
function DownloadMenu({ page, exportMd }: { page: WikiPage; exportMd: () => void }) {
  const [open, setOpen] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const menuId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function safeName(): string {
    return page.title.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120) || 'page';
  }

  function exportHtml() {
    const html = buildWikiExportHtml(page);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName()}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function exportPdf() {
    // 인쇄 미리보기 활용 — 신형 브라우저에서 *PDF 로 저장* 옵션 제공
    // 별도 jspdf 의존성 없이 가장 안정
    const win = window.open('', '_blank', 'width=900,height=1100');
    if (!win) return;
    win.document.write(buildWikiExportHtml(page, { print: true }));
    win.document.close();
  }

  async function copyMarkdown() {
    const markdown = wikiPageToMarkdown(page);
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = markdown;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedMarkdown(true);
    window.setTimeout(() => setCopiedMarkdown(false), 1400);
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="h-8 px-2 inline-flex items-center gap-0.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
        title="다운로드 양식 선택"
        aria-label="다운로드 메뉴"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
      >
        <Download className="w-3.5 h-3.5" />
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute right-0 top-full mt-1 wiki-z-popover w-[198px] rounded-lg border border-[hsl(var(--hairline))] bg-popover shadow-xl py-1"
          role="menu"
          aria-label="다운로드 양식"
        >
          <p className="px-3 py-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            다운로드 양식
          </p>
          <DownloadOption icon={copiedMarkdown ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />} label={copiedMarkdown ? 'Markdown 복사됨' : 'Markdown 복사'} onClick={() => { void copyMarkdown(); }} hint="클립보드에 복사" />
          <DownloadOption icon={<FileText className="w-3.5 h-3.5" />} label="Markdown (.md)" onClick={() => { exportMd(); setOpen(false); }} hint="원본·옵시디언 호환" />
          <DownloadOption icon={<FileCode className="w-3.5 h-3.5" />} label="HTML (.html)" onClick={() => { exportHtml(); setOpen(false); }} hint="브라우저로 보기" />
          <DownloadOption icon={<FileType className="w-3.5 h-3.5" />} label="PDF (인쇄)" onClick={() => { exportPdf(); setOpen(false); }} hint="인쇄 → PDF 저장" />
        </div>
      )}
    </div>
  );
}

function DownloadOption({
  icon, label, onClick, hint,
}: { icon: React.ReactNode; label: string; onClick: () => void; hint?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-foreground/85 hover:bg-accent hover:text-foreground wiki-trans-color"
    >
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12.5px]">{label}</span>
        {hint && <span className="block text-[10px] text-muted-foreground/80">{hint}</span>}
      </span>
    </button>
  );
}

/* ── 부모 메인 줄 — 나무위키 톤: "상위 문서: 페이지A, 페이지B" ── */
function ParentMainsRow({
  page, allPages, onOpen,
}: {
  page: WikiPage;
  allPages: WikiPage[];
  onOpen: (titleOrId: string) => void;
}) {
  const parents = (() => {
    const out: WikiPage[] = [];
    const myTitle = page.title.toLowerCase();
    const myAliases = page.aliases.map((a) => a.toLowerCase());
    for (const m of allPages) {
      if (!isMainDoc(m) || m.id === page.id) continue;
      const links = extractWikiLinks(m.body);
      const hit = links.some((t) => {
        const tl = t.toLowerCase();
        return tl === myTitle || myAliases.includes(tl) || tl === page.id;
      });
      if (hit) out.push(m);
    }
    return out;
  })();

  if (parents.length === 0) return null;

  return (
    <div
      className="mb-2.5 text-[12.5px] leading-relaxed text-muted-foreground"
      style={{ fontFamily: 'var(--wiki-font-meta)' }}
    >
      <span className="text-muted-foreground/80">상위 문서: </span>
      {parents.map((m, i) => (
        <span key={m.id}>
          <button
            type="button"
            onClick={() => onOpen(m.id)}
            className="text-blue-700 dark:text-blue-300 hover:underline underline-offset-2 wiki-trans-color"
            title={`${m.title} 메인 문서로 이동`}
          >
            {m.title}
          </button>
          {i < parents.length - 1 && <span className="text-muted-foreground/70">, </span>}
        </span>
      ))}
    </div>
  );
}

// ── 메모 출처 칩 — 이 페이지가 메모에서 시작됐다면 표시 + 메모로 이동 ──
function MemoSourceChip({ pageId }: { pageId: string }) {
  const navigate = useNavigate();
  const memos = useMemos();
  const sourceMemo = memos.find((m) => m.wikiPageId === pageId);
  if (!sourceMemo) return null;
  return (
    <button
      type="button"
      onClick={() => navigate(`/memos?id=${sourceMemo.id}`)}
      className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-medium hover:bg-amber-500/15 wiki-trans-color"
      title="원본 메모 열기"
    >
      <PencilIcon className="w-3 h-3" strokeWidth={1.75} />
      메모에서 시작됨
    </button>
  );
}
