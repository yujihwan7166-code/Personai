import { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type WikiPage, type WikiPageType, type WikiPageStatus,
  WIKI_TYPE_META, WIKI_STATUS_META,
} from '@/types/wiki';
import { WikiBody } from './WikiBody';
import { WikiToc } from './WikiToc';
import { WikiInfobox } from './WikiInfobox';
import { WikiLinkAutocomplete } from './WikiLinkAutocomplete';

interface Props {
  page: WikiPage;
  editing: boolean;
  backlinks: WikiPage[];
  /** 모든 페이지 — 자동완성·호버 프리뷰용 */
  allPages: WikiPage[];
  findByTitle: (title: string) => WikiPage | undefined;
  onChange: (next: WikiPage) => void;
  onDelete: () => void;
  onToggleEdit: () => void;
  /** 본문 [[link]] 클릭 또는 백링크 클릭 시 호출. */
  onOpenLink: (titleOrId: string) => void;
}

export function WikiPageView({
  page, editing, backlinks, allPages, findByTitle,
  onChange, onDelete, onToggleEdit, onOpenLink,
}: Props) {
  const [draft, setDraft] = useState<WikiPage>(page);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(page);
  }, [page, editing]);

  const typeMeta = WIKI_TYPE_META[page.type];

  const save = () => {
    onChange(draft);
    onToggleEdit();
  };
  const cancel = () => {
    setDraft(page);
    onToggleEdit();
  };

  return (
    <div className="px-6 lg:px-10 py-8">
      {/* 카테고리/유형 brebrumb — 위키 페이지 상단 */}
      <div className="max-w-6xl mx-auto mb-3 flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
        <span aria-hidden>{typeMeta.icon}</span>
        <span style={{ color: typeMeta.tint }}>{typeMeta.label}</span>
        {page.category && (
          <>
            <span>›</span>
            <span>{page.category}</span>
          </>
        )}
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)_240px] gap-6">
        {/* 좌: TOC */}
        <div className="hidden lg:block">
          {!editing && page.body && <WikiToc body={page.body} />}
        </div>

        {/* 중앙: 본문 */}
        <article className="min-w-0">
          {/* 제목 + 액션 */}
          <header className="mb-4 pb-3 border-b border-[hsl(var(--hairline))]">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                {editing ? (
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="w-full text-3xl font-serif font-bold bg-transparent outline-none border-b border-transparent focus:border-primary/30 py-0.5 tracking-tight"
                    placeholder="페이지 제목"
                    style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
                  />
                ) : (
                  <h1
                    className="text-3xl font-serif font-bold text-foreground tracking-tight"
                    style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
                  >
                    {page.title}
                  </h1>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {editing ? (
                  <>
                    <button onClick={cancel} className="px-2.5 h-8 rounded-md text-[12px] text-muted-foreground hover:bg-accent transition-colors flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> 취소
                    </button>
                    <button onClick={save} className="px-2.5 h-8 rounded-md bg-primary text-primary-foreground text-[12px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1">
                      <Save className="w-3.5 h-3.5" /> 저장
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={onToggleEdit} className="px-2 h-7 rounded-md text-[11.5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center gap-1" title="편집 (E)">
                      <Pencil className="w-3.5 h-3.5" /> 편집
                    </button>
                    <button onClick={onDelete} className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="삭제" aria-label="삭제">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 모바일 인포 (lg 이하에서만 노출) */}
            <div className="lg:hidden mt-3">
              <MetaChips
                page={editing ? draft : page}
                editing={editing}
                onChange={(d) => setDraft(d)}
                draft={draft}
              />
            </div>
          </header>

          {/* 편집 모드 — 메타 폼 */}
          {editing && (
            <div className="hidden lg:block mb-3">
              <MetaChips
                page={draft}
                editing
                onChange={setDraft}
                draft={draft}
              />
            </div>
          )}

          {/* 본문 */}
          <section className={cn('min-h-[200px]', editing ? '' : 'wiki-prose')}>
            {editing ? (
              <>
                <textarea
                  ref={textareaRef}
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  placeholder="마크다운 본문… [[다른 페이지]] 로 위키링크 (자동완성 지원)"
                  className="w-full min-h-[420px] bg-background border border-[hsl(var(--hairline))] rounded-lg p-4 text-[13.5px] leading-7 font-mono outline-none focus:border-primary/40 transition-colors resize-y"
                  autoFocus
                />
                <WikiLinkAutocomplete
                  pages={allPages}
                  currentId={page.id}
                  textareaRef={textareaRef}
                  value={draft.body}
                  onChange={(v) => setDraft({ ...draft, body: v })}
                />
              </>
            ) : page.body.trim() === '' ? (
              <p className="text-muted-foreground text-[13px] italic">
                본문이 비어있어요. 우측 상단 ✏️ 편집 으로 시작하세요.
              </p>
            ) : (
              <WikiBody body={page.body} onOpenLink={onOpenLink} findByTitle={findByTitle} />
            )}
          </section>

          {/* 백링크 */}
          {!editing && backlinks.length > 0 && (
            <section className="mt-12 pt-5 border-t border-[hsl(var(--hairline))]">
              <h2
                className="text-base font-serif font-bold text-foreground mb-2"
                style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
              >
                이 문서를 인용한 곳
                <span className="ml-2 text-[11px] font-sans font-normal text-muted-foreground">
                  · {backlinks.length}건
                </span>
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {backlinks.map((b) => (
                  <li key={b.id}>
                    <button
                      onClick={() => onOpenLink(b.id)}
                      className="w-full text-left px-2 py-1 rounded hover:bg-accent transition-colors text-[12.5px] text-blue-700 dark:text-blue-300 hover:underline"
                    >
                      {WIKI_TYPE_META[b.type].icon} {b.title}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        {/* 우: 인포박스 */}
        <div className="hidden lg:block">
          {!editing && <WikiInfobox page={page} />}
        </div>
      </div>
    </div>
  );
}

/* ── 메타 칩/폼 ── */
function MetaChips({
  page, editing, draft, onChange,
}: {
  page: WikiPage;
  editing: boolean;
  draft: WikiPage;
  onChange: (d: WikiPage) => void;
}) {
  const typeMeta = WIKI_TYPE_META[page.type];
  const statusMeta = WIKI_STATUS_META[page.status];

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10.5px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: `${typeMeta.tint}1A`, color: typeMeta.tint }}>
          {typeMeta.label}
        </span>
        <span className="text-[10.5px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: `${statusMeta.tint}1A`, color: statusMeta.tint }}>
          {statusMeta.label}
        </span>
        {page.tags.map((t) => (
          <span key={t} className="text-[10.5px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground">
            #{t}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <select
        value={draft.type}
        onChange={(e) => onChange({ ...draft, type: e.target.value as WikiPageType })}
        className="text-[11px] px-2 h-7 rounded-md border border-[hsl(var(--hairline))] bg-background"
      >
        {Object.entries(WIKI_TYPE_META).map(([k, m]) => (
          <option key={k} value={k}>{m.icon} {m.label}</option>
        ))}
      </select>
      <select
        value={draft.status}
        onChange={(e) => onChange({ ...draft, status: e.target.value as WikiPageStatus })}
        className="text-[11px] px-2 h-7 rounded-md border border-[hsl(var(--hairline))] bg-background"
      >
        {Object.entries(WIKI_STATUS_META).map(([k, m]) => (
          <option key={k} value={k}>{m.label}</option>
        ))}
      </select>
      <input
        value={draft.tags.join(', ')}
        onChange={(e) => onChange({ ...draft, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
        placeholder="태그 (쉼표)"
        className="text-[11px] px-2 h-7 rounded-md border border-[hsl(var(--hairline))] bg-background min-w-[160px]"
      />
      <input
        value={draft.aliases.join(', ')}
        onChange={(e) => onChange({ ...draft, aliases: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
        placeholder="별칭 (쉼표)"
        className="text-[11px] px-2 h-7 rounded-md border border-[hsl(var(--hairline))] bg-background min-w-[140px]"
      />
      <input
        value={draft.category ?? ''}
        onChange={(e) => onChange({ ...draft, category: e.target.value.trim() || undefined })}
        placeholder="분류"
        className="text-[11px] px-2 h-7 rounded-md border border-[hsl(var(--hairline))] bg-background min-w-[100px]"
      />
    </div>
  );
}
