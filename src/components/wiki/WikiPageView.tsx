import { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2, Save, X, Download, Star, Check, ImagePlus, History, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type WikiPage, type WikiPageType, type WikiPageStatus,
  WIKI_TYPE_META, WIKI_STATUS_META, isMainDoc, USER_FACING_TYPES,
} from '@/types/wiki';
import { WikiBody } from './WikiBody';
import { WikiToc } from './WikiToc';
import { WikiInfobox } from './WikiInfobox';
import { WikiLocalGraph } from './WikiLocalGraph';
import { WikiLinkAutocomplete } from './WikiLinkAutocomplete';
import { WikiBlockEditor } from './WikiBlockEditor';
import { saveImage } from '@/lib/wikiImageStore';
import { WikiHistoryPanel } from './WikiHistoryPanel';
import { WikiLiveEditor } from './WikiLiveEditor';

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
  onDelete: () => void;
  onToggleEdit: () => void;
  onOpenLink: (titleOrId: string) => void;
  /** 로컬 그래프 '전체 그래프에서 보기' — 부모가 view='graph' + focusId 처리 */
  onOpenInGlobalGraph?: (centerId: string) => void;
  /** 인포박스 태그 칩 클릭 시 — 부모가 사이드바 검색에 반영. */
  onTagClick?: (tag: string) => void;
  /** 방문(최근 본) 페이지 id Set — 위키링크 visited 색상 적용용. */
  visitedIds?: Set<string>;
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
  onChange, onRestore, onDelete, onToggleEdit, onOpenLink, onOpenInGlobalGraph,
  onTagClick, visitedIds,
}: Props) {
  const [draft, setDraft] = useState<WikiPage>(page);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [historyOpen, setHistoryOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  /** caret 위치에 텍스트 삽입. */
  const insertAtCaret = (text: string) => {
    const ta = textareaRef.current;
    const before = ta?.selectionStart ?? draft.body.length;
    const after = ta?.selectionEnd ?? draft.body.length;
    const next = draft.body.slice(0, before) + text + draft.body.slice(after);
    setDraft({ ...draft, body: next });
    requestAnimationFrame(() => {
      if (!ta) return;
      const newCaret = before + text.length;
      ta.setSelectionRange(newCaret, newCaret);
      ta.focus();
    });
  };

  /** File 들을 IDB 에 저장 후 caret 에 markdown 이미지 삽입. */
  const handleImageFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (arr.length === 0) return;
    const inserts: string[] = [];
    for (const f of arr) {
      const id = await saveImage(f);
      const alt = f.name.replace(/\.[^.]+$/, '');
      inserts.push(`![${alt}](wiki-image:${id})`);
    }
    insertAtCaret('\n\n' + inserts.join('\n\n') + '\n\n');
  };

  const onDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    const hasImage = Array.from(e.dataTransfer.files).some((f) => f.type.startsWith('image/'));
    if (!hasImage) return;
    e.preventDefault();
    void handleImageFiles(e.dataTransfer.files);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const it of items) {
      if (it.kind === 'file') {
        const f = it.getAsFile();
        if (f && f.type.startsWith('image/')) files.push(f);
      }
    }
    if (files.length === 0) return;
    e.preventDefault();
    void handleImageFiles(files);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const onPickImage = () => fileInputRef.current?.click();
  const onFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files;
    e.target.value = '';
    if (f) void handleImageFiles(f);
  };

  /** 페이지를 frontmatter + 본문 형식의 .md 파일로 다운로드. */
  const exportMd = () => {
    const fm: string[] = ['---'];
    fm.push(`title: ${page.title}`);
    if (page.aliases.length) fm.push(`aliases: [${page.aliases.map((a) => JSON.stringify(a)).join(', ')}]`);
    fm.push(`type: ${page.type}`);
    if (page.category) fm.push(`category: ${page.category}`);
    fm.push(`status: ${page.status}`);
    if (page.tags.length) fm.push(`tags: [${page.tags.map((t) => JSON.stringify(t)).join(', ')}]`);
    fm.push(`created: ${new Date(page.createdAt).toISOString()}`);
    fm.push(`updated: ${new Date(page.updatedAt).toISOString()}`);
    fm.push('---', '');
    const md = fm.join('\n') + page.body;
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
                    className="text-[28px] leading-[1.2] font-bold text-foreground tracking-tight"
                    style={{ fontFamily: 'var(--wiki-font-display)' }}
                  >
                    {page.title}
                  </h1>
                )}
                {!editing && (
                  <p
                    className="text-[12px] mt-1.5"
                    style={{ fontFamily: 'var(--wiki-font-meta)', color: 'hsl(var(--muted-foreground))' }}
                  >
                    마지막 수정 · {relativeTime(page.updatedAt)}
                    {page.aliases.length > 0 && (
                      <span className="ml-2 opacity-70">· 별칭: {page.aliases.join(' · ')}</span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {editing ? (
                  <>
                    <SaveStatusBadge status={saveStatus} />
                    <button onClick={cancel} className="px-2.5 h-8 rounded-md text-[12px] text-muted-foreground hover:bg-accent transition-colors flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> 취소
                    </button>
                    <button onClick={save} className="px-2.5 h-8 rounded-md bg-primary text-primary-foreground text-[12px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1">
                      <Save className="w-3.5 h-3.5" /> 저장
                    </button>
                  </>
                ) : (
                  <>
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
                    <button onClick={onToggleEdit} className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md text-[11.5px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color" title="전체 편집 모드 (E) — 본문을 한 덩어리로 편집">
                      <Pencil className="w-3.5 h-3.5" /> 전체 편집
                    </button>
                    {!isMainDoc(page) ? (
                      <button
                        onClick={() => onChange({ ...page, isMain: true })}
                        className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md text-[11.5px] text-primary hover:bg-primary/10 wiki-trans-color"
                        title="이 페이지를 메인 문서로 — 다른 페이지 묶기 시작 (type 은 그대로)"
                      >
                        <BookOpen className="w-3.5 h-3.5" /> 메인 문서로
                      </button>
                    ) : (
                      <button
                        onClick={() => onChange({
                          ...page,
                          isMain: false,
                          // legacy type='moc' 라면 일반 type 으로 강등
                          type: page.type === 'moc' ? 'concept' : page.type,
                        })}
                        className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md text-[11.5px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
                        title="메인 문서 → 일반 문서로"
                      >
                        <BookOpen className="w-3.5 h-3.5" /> 메인 해제
                      </button>
                    )}
                    <button onClick={() => setHistoryOpen(true)} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color" title="버전 히스토리" aria-label="버전 히스토리">
                      <History className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={exportMd} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color" title="Markdown 다운로드" aria-label="Markdown 다운로드">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onDelete} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive wiki-trans-color" title="삭제" aria-label="삭제">
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

          {/* 본문 — 블록 에디터 (모든 페이지 동일) */}
          <section className={cn('min-h-[200px]', editing ? '' : 'wiki-prose')}>
            {editing ? (
              <WikiBlockEditor
                body={draft.body}
                onChange={(md) => setDraft({ ...draft, body: md })}
                allPages={allPages}
                currentId={page.id}
                onPickPage={(insert) => {
                  const pageTitle = window.prompt('페이지 제목:');
                  if (pageTitle?.trim()) insert(pageTitle.trim());
                }}
                onUploadImage={async (file) => {
                  const id = await saveImage(file);
                  return `wiki-image:${id}`;
                }}
              />
            ) : (
              <WikiLiveEditor
                body={page.body}
                findByTitle={findByTitle}
                visitedIds={visitedIds}
                onOpenLink={onOpenLink}
                onChange={(newBody) => onChange({ ...page, body: newBody })}
              />
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

        {/* 우: 인포박스 + 로컬 그래프 */}
        <div className="hidden lg:flex flex-col gap-3">
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
    <span className={cn('inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 mr-1', m.cls)}>
      {m.icon}
      {m.text}
    </span>
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
        {isMainDoc(page) && (
          <span className="text-[10.5px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-primary/15 text-primary inline-flex items-center gap-1">
            📖 메인
          </span>
        )}
        <span className="text-[10.5px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: `${typeMeta.tint}1A`, color: typeMeta.tint }}>
          {typeMeta.icon} {typeMeta.label}
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
        value={USER_FACING_TYPES.includes(draft.type) ? draft.type : 'concept'}
        onChange={(e) => onChange({ ...draft, type: e.target.value as WikiPageType })}
        className="text-[11px] px-2 h-7 rounded-md border border-[hsl(var(--hairline))] bg-background"
      >
        {USER_FACING_TYPES.map((k) => {
          const m = WIKI_TYPE_META[k];
          return <option key={k} value={k}>{m.icon} {m.label}</option>;
        })}
      </select>
      <label className="inline-flex items-center gap-1 text-[11px] px-2 h-7 rounded-md border border-[hsl(var(--hairline))] bg-background cursor-pointer hover:border-primary/40 wiki-trans-color">
        <input
          type="checkbox"
          checked={!!draft.isMain || draft.type === 'moc'}
          onChange={(e) => onChange({
            ...draft,
            isMain: e.target.checked,
            // 토글 끄면 legacy 'moc' type 도 일반으로 정리
            type: !e.target.checked && draft.type === 'moc' ? 'concept' : draft.type,
          })}
          className="accent-primary"
        />
        <span className="text-foreground/85">📖 메인 문서</span>
      </label>
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
