import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Save, X, Download, Star, Check, ImagePlus, History, Home, ChevronDown, FileText, FileType, FileCode, Pencil as PencilIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemos } from '@/lib/memoStore';
import {
  type WikiPage, type WikiPageStatus,
  WIKI_TYPE_META, WIKI_STATUS_META, VISIBLE_WIKI_STATUSES, isMainDoc,
  extractWikiLinks,
} from '@/types/wiki';
import { WikiBody } from './WikiBody';
import { WikiToc } from './WikiToc';
import { WikiInfobox } from './WikiInfobox';
import { WikiLocalGraph } from './WikiLocalGraph';
import { WikiLinkAutocomplete } from './WikiLinkAutocomplete';
import { WikiBlockEditor } from './WikiBlockEditor';
import { saveImage } from '@/lib/wikiImageStore';
import { WikiHistoryPanel } from './WikiHistoryPanel';

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
  /** 헤더 🏠 홈 버튼 → 대문(WikiHome) 으로 이동 */
  onGoHome?: () => void;
  /** 로컬 그래프 '전체 그래프에서 보기' — 부모가 view='graph' + focusId 처리 */
  onOpenInGlobalGraph?: (centerId: string) => void;
  /** 인포박스 태그 칩 클릭 시 — 부모가 사이드바 검색에 반영. */
  onTagClick?: (tag: string) => void;
  /** 방문(최근 본) 페이지 id Set — 위키링크 visited 색상 적용용. */
  visitedIds?: Set<string>;
  /** 새 페이지 만들고 링크 — picker '새로 만들기' 탭에서 호출 */
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
  onChange, onRestore, onDelete, onToggleEdit, onOpenLink, onGoHome, onOpenInGlobalGraph, onCreateAndLink,
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
            {/* 상위 문서 줄 — 비편집 모드만. 일반 문서·sub-main 모두 표시 (root main 은 부모 0이라 자동 숨김) */}
            {!editing && <ParentMainsRow page={page} allPages={allPages} onOpen={onOpenLink} />}
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
                    className="text-[36px] sm:text-[42px] leading-[1.15] font-semibold text-foreground tracking-tight"
                    style={{ fontFamily: 'var(--wiki-font-display)' }}
                  >
                    {page.title}
                  </h1>
                )}
                {!editing && (
                  <>
                    <p
                      className="text-[12px] mt-1.5"
                      style={{ fontFamily: 'var(--wiki-font-meta)', color: 'hsl(var(--muted-foreground))' }}
                    >
                      {(() => {
                        // Bear 풍 메타: N글자 · 약 N분 · 마지막 수정 · 별칭
                        const charCount = page.body.replace(/\s+/g, '').length;
                        const readMin = Math.max(1, Math.round(charCount / 500));
                        return (
                          <>
                            {charCount.toLocaleString()}글자 · 약 {readMin}분 · 마지막 수정 · {relativeTime(page.updatedAt)}
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
                    <DownloadMenu page={page} exportMd={exportMd} />
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
                allPages={allPages}
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
                allPages={allPages}
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
  page, editing, draft, onChange, allPages,
}: {
  page: WikiPage;
  editing: boolean;
  draft: WikiPage;
  onChange: (d: WikiPage) => void;
  allPages?: WikiPage[];
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

  // 편집 모드 — 슬림 메타 바: [메인 문서 토글] [상태] [태그 칩+자동완성]
  const isMainOn = !!draft.isMain || draft.type === 'moc';
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 메인 문서 토글 (chip 형태) */}
      <button
        type="button"
        onClick={() => onChange({
          ...draft,
          isMain: !isMainOn,
          // 토글 끄면 legacy 'moc' type 도 일반으로 정리
          type: isMainOn && draft.type === 'moc' ? 'concept' : draft.type,
        })}
        title={isMainOn ? '메인 문서 해제' : '메인 문서로 지정'}
        className={cn(
          'inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11.5px] font-semibold transition-colors border',
          isMainOn
            ? 'bg-violet-500/12 border-violet-300 text-violet-700 dark:text-violet-300'
            : 'bg-card border-[hsl(var(--hairline))] text-muted-foreground hover:border-violet-200 hover:text-foreground',
        )}
      >
        <span>📖</span>
        <span>메인 문서</span>
        {isMainOn && <Check className="w-3 h-3" />}
      </button>

      {/* 상태 dropdown — 일반 3 단계. archived 페이지는 유지(데이터 손실 방지) 후 사용자가 명시 변경 시에만 전환. */}
      <select
        value={draft.status}
        onChange={(e) => onChange({ ...draft, status: e.target.value as WikiPageStatus })}
        className="h-7 px-2 rounded-md border border-[hsl(var(--hairline))] bg-card text-[11.5px] font-medium text-foreground focus:outline-none focus:border-primary/40"
      >
        {VISIBLE_WIKI_STATUSES.map((k) => (
          <option key={k} value={k}>{WIKI_STATUS_META[k].label}</option>
        ))}
        {draft.status === 'archived' && (
          <option value="archived">{WIKI_STATUS_META.archived.label}</option>
        )}
      </select>

      {/* 태그 칩 + 자동완성 */}
      <WikiTagChipInput
        tags={draft.tags}
        onChange={(next) => onChange({ ...draft, tags: next })}
        allPages={allPages ?? []}
        currentId={draft.id}
      />
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
          <div className="px-2 py-0.5 text-[9.5px] font-mono uppercase tracking-wider text-muted-foreground/70">
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
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
    const styles = `<style>
      body { max-width: 720px; margin: 2.5rem auto; padding: 0 1rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", system-ui, sans-serif; line-height: 1.78; color: #111; }
      h1, h2, h3 { font-family: "Newsreader", "Noto Serif KR", Georgia, serif; }
      h1 { font-size: 2rem; border-bottom: 1px solid #ddd; padding-bottom: 0.4rem; }
      h2 { font-size: 1.4rem; margin-top: 2rem; }
      h3 { font-size: 1.15rem; }
      p, li { font-size: 1rem; }
      a { color: #2563eb; text-decoration: none; }
      a:hover { text-decoration: underline; }
      blockquote { border-left: 3px solid #d1d5db; margin: 1rem 0; padding: 0.4rem 0.8rem; color: #4b5563; }
      code { background: #f3f4f6; padding: 0 0.3rem; border-radius: 3px; font-size: 0.92em; }
      pre { background: #f9fafb; padding: 0.8rem; border-radius: 6px; overflow-x: auto; }
      table { border-collapse: collapse; margin: 1rem 0; }
      th, td { border: 1px solid #d1d5db; padding: 0.4rem 0.7rem; text-align: left; }
      th { background: #f3f4f6; }
      hr { border: 0; border-top: 1px solid #d1d5db; margin: 1.5rem 0; }
      .meta { color: #6b7280; font-size: 0.85rem; margin-bottom: 1.5rem; padding-bottom: 0.8rem; border-bottom: 1px solid #e5e7eb; }
    </style>`;
    // 본문은 markdown raw — 사용자가 브라우저에서 보면 그대로. 마크다운 렌더는 별도로.
    // 간단히 line-by-line 변환 (헤딩/리스트/문단)
    const lines = page.body.split('\n');
    const htmlLines: string[] = [];
    let inList = false;
    for (const ln of lines) {
      if (/^#{1,3}\s/.test(ln)) {
        if (inList) { htmlLines.push('</ul>'); inList = false; }
        const m = /^(#{1,3})\s+(.*)$/.exec(ln)!;
        htmlLines.push(`<h${m[1].length}>${escapeHtml(m[2])}</h${m[1].length}>`);
      } else if (/^[-*]\s/.test(ln)) {
        if (!inList) { htmlLines.push('<ul>'); inList = true; }
        htmlLines.push(`<li>${escapeHtml(ln.replace(/^[-*]\s+/, ''))}</li>`);
      } else if (ln.trim() === '') {
        if (inList) { htmlLines.push('</ul>'); inList = false; }
        htmlLines.push('');
      } else {
        if (inList) { htmlLines.push('</ul>'); inList = false; }
        htmlLines.push(`<p>${escapeHtml(ln)}</p>`);
      }
    }
    if (inList) htmlLines.push('</ul>');
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>${escapeHtml(page.title)}</title>${styles}</head><body>
      <div class="meta">${page.type} · ${page.status} · ${new Date(page.updatedAt).toISOString().slice(0,10)}${page.tags.length ? ' · ' + page.tags.map((t) => `#${t}`).join(' ') : ''}</div>
      <h1>${escapeHtml(page.title)}</h1>
      ${htmlLines.join('\n')}
    </body></html>`;
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
    const lines = page.body.split('\n');
    const htmlLines: string[] = [];
    let inList = false;
    for (const ln of lines) {
      if (/^#{1,3}\s/.test(ln)) {
        if (inList) { htmlLines.push('</ul>'); inList = false; }
        const m = /^(#{1,3})\s+(.*)$/.exec(ln)!;
        htmlLines.push(`<h${m[1].length}>${escapeHtml(m[2])}</h${m[1].length}>`);
      } else if (/^[-*]\s/.test(ln)) {
        if (!inList) { htmlLines.push('<ul>'); inList = true; }
        htmlLines.push(`<li>${escapeHtml(ln.replace(/^[-*]\s+/, ''))}</li>`);
      } else if (ln.trim() === '') {
        if (inList) { htmlLines.push('</ul>'); inList = false; }
        htmlLines.push('');
      } else {
        if (inList) { htmlLines.push('</ul>'); inList = false; }
        htmlLines.push(`<p>${escapeHtml(ln)}</p>`);
      }
    }
    if (inList) htmlLines.push('</ul>');
    win.document.write(`<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><title>${escapeHtml(page.title)}</title>
      <style>
        @page { size: A4; margin: 22mm; }
        body { font-family: -apple-system, "Noto Sans KR", system-ui, sans-serif; line-height: 1.7; color: #111; }
        h1, h2, h3 { font-family: "Noto Serif KR", Georgia, serif; }
        h1 { font-size: 1.8rem; border-bottom: 1px solid #aaa; padding-bottom: 0.3rem; }
        h2 { font-size: 1.3rem; margin-top: 1.5rem; }
        h3 { font-size: 1.1rem; }
        blockquote { border-left: 3px solid #999; margin: 0.8rem 0; padding: 0.3rem 0.8rem; color: #555; }
        code { background: #f3f3f3; padding: 0 0.3rem; border-radius: 3px; }
        .meta { color: #666; font-size: 0.85rem; margin-bottom: 1rem; }
      </style>
    </head><body>
      <div class="meta">${page.type} · ${page.status} · ${new Date(page.updatedAt).toISOString().slice(0,10)}</div>
      <h1>${escapeHtml(page.title)}</h1>
      ${htmlLines.join('\n')}
      <script>setTimeout(() => window.print(), 200);</script>
    </body></html>`);
    win.document.close();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-8 px-2 inline-flex items-center gap-0.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
        title="다운로드 양식 선택"
        aria-label="다운로드"
      >
        <Download className="w-3.5 h-3.5" />
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 wiki-z-popover w-[180px] rounded-lg border border-[hsl(var(--hairline))] bg-popover shadow-xl py-1">
          <p className="px-3 py-1 text-[9.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground/70">
            다운로드 양식
          </p>
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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]!));
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
