/**
 * 아카이브 — 내 보관소 방 (/archive).
 * 좌: 컬렉션(=폴더) 사이드바 · 우: 마스트헤드 + 형태·태그·연도·정렬 + 검색 + masonry/타임라인.
 * 저장 UX: 단일 폼 — 제목·내용·링크·파일을 채우고 폴더 하나를 고른다. 형태는 첨부물로 자동 판정.
 * 진입점 3개: 사이드바/상단 '새 항목' 버튼 · 페이지에 파일 드롭 · URL 붙여넣기(Ctrl+V).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive as ArchiveIcon, Library, Plus, Home, Star, Search, Settings, ChevronDown, Check, Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  KIND_LABEL, localYm, localYear, looksLikeUrl, currentLocalYm,
  type ArchiveCollection, type ArchiveItem, type ArchiveKind,
} from '@/types/archive';
import { archiveStore } from '@/services/archiveStore';
import { useArchive } from '@/hooks/useArchive';
import { useFlipGrid } from '@/hooks/useFlipGrid';
import { tokenMatchAll } from '@/lib/textSearch';
import { ArchiveCard } from '@/components/archive/ArchiveCard';
import { ArchiveDetailPanel } from '@/components/archive/ArchiveDetailPanel';
import { ArchiveNewItemDialog, type ArchiveDraft } from '@/components/archive/ArchiveNewItemDialog';
import { ArchiveCollectionEditor } from '@/components/archive/ArchiveCollectionEditor';
import { ArchiveCollectionManager } from '@/components/archive/ArchiveCollectionManager';

type ViewKey = 'all' | 'starred' | string; // string = collectionId
type SortKey = 'new' | 'old' | 'title';
const KINDS: ArchiveKind[] = ['note', 'image', 'file', 'link'];

function searchable(it: ArchiveItem): string {
  return [it.title, it.note, it.domain, it.fileName, it.tags.join(' '), it.fields?.map((f) => f.value).join(' ')]
    .filter(Boolean).join(' ');
}

export default function Archive() {
  const { items, collections } = useArchive();

  const [view, setView] = useState<ViewKey>('all');
  const [kind, setKind] = useState<ArchiveKind | null>(null);
  const [mode, setMode] = useState<'list' | 'timeline'>('list');
  const [sort, setSort] = useState<SortKey>('new');
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<ArchiveDraft | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 컬렉션 편집기 — null이면 닫힘, { collection: null } 이면 새로 만들기, { collection } 이면 편집.
  const [editor, setEditor] = useState<{ collection: ArchiveCollection | null } | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [yearF, setYearF] = useState<string>('all');
  /** 상단 필터 드롭다운은 한 번에 하나만 — 부모가 쥐고 있어야 다른 칩으로 한 번에 넘어간다. */
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const filterBarRef = useRef<HTMLDivElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);
  // 상세 패널: gridOpen = grid 폭 애니메이션(우측 부드럽게 밀림), frozenW = 애니메이션 동안 메이슨리 폭 고정
  const [gridOpen, setGridOpen] = useState(false);
  const [frozenW, setFrozenW] = useState<number | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const settleTimer = useRef<number | null>(null);
  // 필터 변경 시 카드가 새 자리로 미끄러지게 (레이아웃 1프레임 확정 + FLIP 글라이드)
  const { gridRef, capture } = useFlipGrid<HTMLDivElement>();

  const selectedItem = selectedId ? items.find((i) => i.id === selectedId) ?? null : null;
  // 삭제된 항목이 선택돼 있으면 닫기
  useEffect(() => {
    if (selectedId && !items.some((i) => i.id === selectedId)) setSelectedId(null);
  }, [items, selectedId]);

  // 컬렉션별 개수
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) m.set(it.collectionId, (m.get(it.collectionId) ?? 0) + 1);
    return m;
  }, [items]);

  const starredCount = useMemo(() => items.filter((i) => i.starred).length, [items]);

  /** 사이드바 선택(전체/별표/컬렉션)까지만 적용한 목록 — 마스트헤드가 서술하는 모집단. */
  const viewItems = useMemo(() => {
    if (view === 'starred') return items.filter((i) => i.starred);
    if (view === 'all') return items;
    return items.filter((i) => i.collectionId === view);
  }, [items, view]);

  // 저장 시각은 UTC ISO — 로컬 연월로 환산해서 세야 자정 직후 저장분이 지난달로 새지 않는다.
  const monthCount = useMemo(() => {
    const ym = currentLocalYm();
    return viewItems.filter((i) => localYm(i.createdAt) === ym).length;
  }, [viewItems]);

  // 태그 빈도 (전체 항목 기준) — 상위 노출 + 전체 목록 + 저장 자동완성 소스
  const tagEntries = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) for (const t of it.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [items]);
  const allTagNames = useMemo(() => tagEntries.map(([t]) => t), [tagEntries]);
  // 저장 연도 (로컬 기준) — 연도 필터 옵션
  const years = useMemo(() => [...new Set(items.map((i) => localYear(i.createdAt)).filter(Boolean))].sort().reverse(), [items]);

  // 형태·태그·연도(상단 필터 바) — 사이드바 선택 위에 전부 AND
  const scoped = useMemo(() => {
    let list = viewItems;
    if (kind) list = list.filter((i) => i.kind === kind);
    if (activeTag) list = list.filter((i) => i.tags.includes(activeTag));
    if (yearF !== 'all') list = list.filter((i) => localYear(i.createdAt) === yearF);
    return list;
  }, [viewItems, kind, activeTag, yearF]);

  /** 상단 필터·검색으로 좁혀진 상태인가 — 마스트헤드 서술을 바꾼다. */
  const narrowed = !!kind || !!activeTag || yearF !== 'all' || query.trim().length > 0;

  // 검색(제목·메모·태그·도메인·파일명) → 정렬. store 가 이미 최신순이라 'new' 는 그대로 둔다.
  const visible = useMemo(() => {
    const q = query.trim();
    const list = q ? scoped.filter((i) => tokenMatchAll(searchable(i), q)) : scoped;
    if (sort === 'new') return list;
    const sorted = [...list];
    if (sort === 'old') sorted.reverse();
    else sorted.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
    return sorted;
  }, [scoped, query, sort]);

  const addCollection = () => setEditor({ collection: null });

  /** 저장창 열기. d 를 주면(드롭·붙여넣기) 첨부·링크가 미리 채워진 채로 열린다. */
  const openNew = useCallback((d?: ArchiveDraft) => {
    setDraft(d);
    setDialogOpen(true);
  }, []);
  const closeNew = () => { setDialogOpen(false); setDraft(undefined); };

  /* ── 진입점 2·3: 파일 드롭 · URL 붙여넣기 ──
   * 보관소의 값어치는 넣는 마찰에 비례한다. 버튼까지 가지 않고도 던져 넣을 수 있게. */
  const overlayBusy = dialogOpen || !!editor || managerOpen;

  useEffect(() => {
    if (overlayBusy) return;
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      // 입력 중인 붙여넣기는 건드리지 않는다 (검색창·태그 입력 등).
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) { e.preventDefault(); openNew({ files }); return; }
      const text = e.clipboardData?.getData('text/plain')?.trim();
      if (text && looksLikeUrl(text)) { e.preventDefault(); openNew({ url: text }); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [overlayBusy, openNew]);

  const hasFiles = (e: React.DragEvent) => e.dataTransfer?.types?.includes('Files');
  const onDragEnter = (e: React.DragEvent) => {
    if (overlayBusy || !hasFiles(e)) return;
    dragDepth.current += 1;              // 자식 위를 지날 때마다 enter/leave 가 쌍으로 와서 깊이로 센다
    setDragOver(true);
  };
  const onDragLeave = () => {
    if (dragDepth.current === 0) return;
    dragDepth.current -= 1;
    if (dragDepth.current === 0) setDragOver(false);
  };
  const onDrop = (e: React.DragEvent) => {
    if (overlayBusy || !hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length) openNew({ files });
  };

  /* 드래그를 창 밖으로 빼면 마지막 dragleave 가 안 오는 브라우저가 있다 —
   * 오버레이가 눌러붙지 않게 창 단위로 한 번 더 턴다. */
  useEffect(() => {
    if (!dragOver) return;
    // 루트 밖(여백)에 떨어뜨렸을 때 브라우저가 그 파일로 페이지를 갈아치우는 것도 함께 막는다.
    const swallow = (e: DragEvent) => e.preventDefault();
    const clear = (e: DragEvent) => { e.preventDefault(); dragDepth.current = 0; setDragOver(false); };
    window.addEventListener('dragover', swallow);
    window.addEventListener('drop', clear);
    window.addEventListener('dragend', clear);
    return () => {
      window.removeEventListener('dragover', swallow);
      window.removeEventListener('drop', clear);
      window.removeEventListener('dragend', clear);
    };
  }, [dragOver]);

  /* 필터 드롭다운 닫기 — 바깥 포인터다운 · Esc.
   * 예전엔 각 메뉴가 자기 위에 전면 오버레이를 깔아서, 다른 칩을 누르면 첫 클릭이 닫기에만 먹었다.
   * 열림 상태를 부모가 쥐고 바 안쪽 클릭은 트리거가 직접 처리 → 한 번에 전환된다. */
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: PointerEvent) => {
      if (!filterBarRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenMenu(null); };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [openMenu]);


  /* ── 상세 열기/닫기 ──
   * grid-template-columns 를 애니메이션해 패널 폭이 0↔400 으로 열리며 마스트헤드가 부드럽게 밀린다.
   * 메이슨리는 여는 순간 "최종 폭"으로 즉시 고정 + FLIP 글라이드 → 패널 슬라이드와 카드 이동이
   * 같은 320ms 에 동시에 일어난다(순차 아님). 끝나면 폭 고정만 해제(자연 폭 = 고정 폭, 점프 없음). */
  const PANEL_W = 400;
  /* 패널 슬라이드 시간 — index.css 의 .arch-detail-in/out, useFlipGrid 의 DUR 과
     같은 값이어야 한다. 셋이 어긋나면 한 동작이 두세 사건으로 쪼개져 보인다. */
  const PANEL_ANIM = 340;
  const isLg = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
  const beginShift = (delta: number) => {
    const w = bodyRef.current?.offsetWidth;
    if (!w || !isLg()) return;
    capture();                      // 옛 위치 스냅샷
    setFrozenW(w + delta);          // 최종 폭으로 즉시 고정 → FLIP 이 새 자리로 글라이드
  };
  const openDetail = (id: string) => {
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    if (selectedId) { setSelectedId(id); return; }   // 이미 열림 — 폭 불변, 항목만 교체
    beginShift(-PANEL_W);
    setSelectedId(id);
    setGridOpen(true);
    settleTimer.current = window.setTimeout(() => setFrozenW(null), PANEL_ANIM);
  };
  const closeDetail = () => {
    if (!selectedId || !gridOpen) return;
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    beginShift(PANEL_W);
    setGridOpen(false);
    /* 패널 애니메이션이 끝나는 그 프레임에 언마운트한다. 예전엔 패널이 190ms 에
       사라지고 카드는 330ms 동안 움직여, 그 사이 오른쪽에 흰 구멍이 벌어졌다. */
    settleTimer.current = window.setTimeout(() => { setSelectedId(null); setFrozenW(null); }, PANEL_ANIM);
  };
  useEffect(() => () => { if (settleTimer.current) window.clearTimeout(settleTimer.current); }, []);
  /** 필터·뷰 변경도 카드 글라이드 대상 — setState 직전 캡처. */
  const withFlip = (fn: () => void) => { capture(); fn(); };

  const viewTitle =
    view === 'all' ? '전체 보기'
    : view === 'starred' ? '별표 모음'
    : collections.find((c) => c.id === view)?.name ?? '전체 보기';

  const defaultCollectionId = view !== 'all' && view !== 'starred' ? view : undefined;

  return (
    <div
      className="archive-theme relative flex min-h-dvh bg-[#fefcf6] text-foreground"
      onDragEnter={onDragEnter}
      onDragOver={(e) => { if (!overlayBusy && hasFiles(e)) e.preventDefault(); }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* 파일을 끌어오는 중 — 페이지 어디에 놓아도 저장창이 열린다 */}
      {dragOver && !overlayBusy && (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-[hsl(var(--archive-sepia)/0.08)] backdrop-blur-[1px] duration-150 animate-in fade-in-0">
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[hsl(var(--archive-sepia)/0.55)] bg-card/95 px-10 py-8 shadow-xl">
            <Upload className="h-7 w-7 text-[hsl(var(--archive-sepia))]" />
            <p className="text-[15px] font-bold text-foreground">여기에 놓으면 저장창이 열려요</p>
            <p className="text-[12.5px] text-muted-foreground">서류·사진·아무 파일이나</p>
          </div>
        </div>
      )}

      {/* ───────── 좌 사이드바 (lg+) ───────── */}
      <aside className="hidden w-[264px] shrink-0 flex-col border-r border-[hsl(var(--hairline))] bg-[#faf6ee] px-3.5 py-5 lg:flex">
        {/* 헤더 — 34px 흰 마크 + 제목 + 부제 (커리어/인맥노트 기준 락업) */}
        <div className="mb-3 flex items-center gap-[11px] px-1.5">
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-white text-[hsl(var(--archive-sepia))] shadow-[0_1px_2px_rgba(60,45,20,0.09)]">
            <Library className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <div className="text-[16px] font-bold leading-tight tracking-[-0.01em] text-[#191c20] dark:text-foreground">아카이브</div>
            <div className="truncate text-[12px] leading-tight text-[#9a8f7a]">무엇이든 담아두는 보관소</div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openNew()}
          className="mb-4 flex items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--archive-sepia))] py-2 text-[14px] font-bold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> 새 항목 저장
        </button>

        <NavRow icon={<Home className="h-4 w-4" />} label="전체 보기" count={items.length} active={view === 'all'} onClick={() => withFlip(() => setView('all'))} />
        <NavRow icon={<Star className="h-4 w-4" />} label="별표 모음" count={starredCount} active={view === 'starred'} onClick={() => withFlip(() => setView('starred'))} />

        <div className="mt-5 mb-1 flex items-center justify-between pl-2.5 pr-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">컬렉션</span>
          <button
            type="button"
            onClick={() => setManagerOpen(true)}
            className="rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
            title="컬렉션 관리 — 순서·편집·삭제"
            aria-label="컬렉션 관리"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
        {/* 빈 컬렉션도 접지 않고 전부 보여준다 — 목록이 늘 같은 자리에 있어야 넣을 곳을 찾는다 */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {collections.map((c) => (
            <NavRow
              key={c.id}
              emoji={c.emoji}
              label={c.name}
              count={counts.get(c.id) ?? 0}
              active={view === c.id}
              onClick={() => withFlip(() => setView(c.id))}
            />
          ))}
          <button
            type="button"
            onClick={addCollection}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> 새 컬렉션
          </button>
        </nav>
      </aside>

      {/* ───────── 메인 + 상세 (grid 폭 애니메이션 → 우측 마스트헤드가 부드럽게 밀림) ───────── */}
      <div className={cn(
        'flex min-w-0 flex-1 lg:grid lg:transition-[grid-template-columns] lg:duration-[320ms] lg:[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
        gridOpen ? 'lg:[grid-template-columns:minmax(0,1fr)_400px]' : 'lg:[grid-template-columns:minmax(0,1fr)_0px]',
      )}>
      <main className={cn('min-w-0 px-5 py-6 sm:px-7', frozenW != null && 'lg:overflow-hidden', selectedItem && 'hidden lg:block')}>
        {/* 마스트헤드 */}
        <div className="mb-4 flex flex-wrap items-start gap-x-4 gap-y-3">
          <div className="min-w-0">
            <h1 className="text-[27px] font-bold tracking-[-0.02em] text-foreground">{viewTitle}</h1>
            {/* 제목이 주어(지금 보는 곳), 부제가 서술어 — 전역 개수가 아니라 이 뷰의 실데이터. */}
            <p className="mt-1 text-[13px] text-muted-foreground">
              {viewItems.length === 0
                ? (view === 'all' ? '아직 비어 있어요 — 무엇이든 저장해 보세요'
                  : view === 'starred' ? '별표한 항목이 아직 없어요'
                  : '이 컬렉션은 아직 비어 있어요')
                : narrowed
                  ? <>{viewItems.length}개 중 {visible.length}개</>
                  : <>{view === 'starred' ? '별표한 항목' : '보관 중'} {viewItems.length}개{monthCount > 0 && <> · 이번 달 +{monthCount}</>}</>}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            {/* 뷰 토글 */}
            <div className="flex overflow-hidden rounded-lg border border-[hsl(var(--hairline))]">
              {(['list', 'timeline'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn('px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                    mode === m ? 'bg-[hsl(var(--archive-sepia))] text-white' : 'text-muted-foreground hover:bg-accent')}
                >
                  {m === 'list' ? '목록' : '타임라인'}
                </button>
              ))}
            </div>

            {/* 검색 */}
            <div className="relative w-[300px] max-w-[46vw]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                /* 타건마다 FLIP 캡처(전 카드 getBoundingClientRect)를 돌리지 않는다 —
                 * 검색은 목록이 갈리는 것이지 카드가 옮겨 앉는 게 아니라 글라이드 값어치도 적다. */
                onChange={(e) => setQuery(e.target.value)}
                placeholder="제목·메모·태그 검색"
                className="w-full rounded-xl border border-[hsl(var(--input))] bg-card py-2 pl-9 pr-3 text-[13px] text-foreground outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground/70 focus:border-[hsl(var(--archive-sepia))] focus:shadow-[0_0_0_3px_hsl(var(--archive-sepia)/0.12)]"
              />
            </div>

            {/* 새 항목 저장 — 우측 진입점 (사이드바 버튼과 동일 동작) */}
            <button
              type="button"
              onClick={() => openNew()}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[hsl(var(--archive-sepia))] px-4 py-2 text-[13px] font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" /> 새 항목
            </button>
          </div>
        </div>

        {/* 모바일 컬렉션 칩 (lg 미만) */}
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
          <MobileChip label="전체" active={view === 'all'} onClick={() => withFlip(() => setView('all'))} />
          <MobileChip label="⭐ 별표" active={view === 'starred'} onClick={() => withFlip(() => setView('starred'))} />
          {collections.map((c) => (
            <MobileChip key={c.id} label={`${c.emoji ?? ''} ${c.name}`.trim()} active={view === c.id} onClick={() => withFlip(() => setView(c.id))} />
          ))}
        </div>

        {/* 형태·태그·연도 다축 필터 + 정렬 — 가계부 내역 필터 바 문법(h32·radius 9·헤어라인 컨트롤).
            값이 5개로 고정인 '형태'만 펼치지 않고 세그먼트로 늘어놓는다. 컬렉션은 사이드바에. */}
        <div ref={filterBarRef} className="mb-5 flex flex-wrap items-center gap-2">
          <ArchiveSegmented
            value={kind ?? 'all'}
            options={[{ v: 'all', label: '전체' }, ...KINDS.map((k) => ({ v: k, label: KIND_LABEL[k] }))]}
            onChange={(v) => withFlip(() => setKind(v === 'all' ? null : (v as ArchiveKind)))} />
          <ArchiveFilterMenu id="tag" openMenu={openMenu} setOpenMenu={setOpenMenu} label="태그" value={activeTag ?? 'all'}
            options={[{ v: 'all', label: '전체 태그' }, ...allTagNames.map((t) => ({ v: t, label: `#${t}` }))]}
            onChange={(v) => withFlip(() => setActiveTag(v === 'all' ? null : v))} />
          <ArchiveFilterMenu id="year" openMenu={openMenu} setOpenMenu={setOpenMenu} label="연도" value={yearF}
            options={[{ v: 'all', label: '전체 연도' }, ...years.map((y) => ({ v: y, label: y }))]}
            onChange={(v) => withFlip(() => setYearF(v))} />
          {(kind || activeTag || yearF !== 'all') && (
            <button
              type="button"
              onClick={() => withFlip(() => { setKind(null); setActiveTag(null); setYearF('all'); })}
              className="inline-flex h-8 items-center rounded-[9px] border border-[hsl(var(--hairline))] bg-card px-2.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              초기화
            </button>
          )}
          {/* 정렬은 필터가 아니라 배열 방식 — 오른쪽 끝에 떼어두고 '초기화'에도 안 걸린다 */}
          <div className="ml-auto">
            <ArchiveFilterMenu id="sort" openMenu={openMenu} setOpenMenu={setOpenMenu} label="정렬" value={sort} align="right"
              options={[{ v: 'new', label: '최신순' }, { v: 'old', label: '오래된순' }, { v: 'title', label: '제목순' }]}
              onChange={(v) => withFlip(() => setSort(v as SortKey))} />
          </div>
        </div>

        {/* 본문 — 목록↔타임라인 전환은 페이드+리프트로 갈아끼움. frozenW = 패널 애니메이션 동안 폭 고정 */}
        <div key={mode} ref={bodyRef} style={frozenW != null ? { width: frozenW } : undefined} className="duration-300 animate-in fade-in-50 slide-in-from-bottom-2">
          {/* gridRef 는 두 모드를 함께 감싼다 — 타임라인도 필터를 바꾸면 카드가 글라이드하도록 */}
          <div ref={gridRef}>
            {visible.length === 0 ? (
              <EmptyState hasItems={viewItems.length > 0} onNew={() => openNew()} />
            ) : mode === 'timeline' ? (
              <Timeline items={visible} narrow={!!selectedItem} onOpen={(i) => openDetail(i.id)} onStar={(id) => archiveStore.toggleStar(id)} onTagClick={(t) => withFlip(() => setActiveTag(t))} />
            ) : (
              <div className={cn('columns-1 gap-4 sm:columns-2', selectedItem ? 'lg:columns-2 xl:columns-3' : 'lg:columns-3 xl:columns-4')}>
                {visible.map((it) => (
                  <div key={it.id} data-flip-id={it.id} className="break-inside-avoid">
                    <ArchiveCard item={it} onOpen={(i) => openDetail(i.id)} onToggleStar={(id) => archiveStore.toggleStar(id)} onTagClick={(t) => withFlip(() => setActiveTag(t))} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

        {/* 상세 패널 — grid 열림 컬럼이 폭 애니메이션. 애니메이션 중에만 overflow-hidden으로 슬라이드 리빌(끝나면 해제해 sticky 정상) */}
        {selectedItem && (
          <div className={cn('w-full lg:w-auto', frozenW != null && 'overflow-hidden')}>
            <ArchiveDetailPanel item={selectedItem} collections={collections} closing={!gridOpen} onClose={closeDetail} />
          </div>
        )}
      </div>

      {/* 저장 다이얼로그 */}
      <ArchiveNewItemDialog
        open={dialogOpen}
        onClose={closeNew}
        collections={collections}
        defaultCollectionId={defaultCollectionId}
        allTags={allTagNames}
        draft={draft}
      />

      {/* 컬렉션 만들기·편집기 (사이드바 '새 컬렉션') */}
      {editor && (
        <ArchiveCollectionEditor
          open
          collection={editor.collection}
          itemCount={editor.collection ? (counts.get(editor.collection.id) ?? 0) : 0}
          onClose={() => setEditor(null)}
        />
      )}

      {/* 컬렉션 관리 — 순서변경·편집·삭제 한 곳에서 */}
      <ArchiveCollectionManager
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        collections={collections}
        counts={counts}
      />
    </div>
  );
}

/* ── 사이드바 행 ── */
function NavRow({ icon, emoji, label, count, active, onClick }: {
  icon?: React.ReactNode; emoji?: string; label: string; count: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex h-[38px] w-full items-center gap-2.5 rounded-[9px] px-3 text-[14px] font-medium transition-colors',
        active ? 'bg-[hsl(var(--archive-sepia))]/[0.14] font-semibold text-[hsl(var(--archive-sepia))] dark:bg-[hsl(var(--archive-sepia))]/24' : 'text-foreground/90 hover:bg-white/45 dark:hover:bg-white/5')}
    >
      {emoji ? <span className="w-5 text-center text-[14px]">{emoji}</span> : <span className="w-5 text-center">{icon}</span>}
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      <span className={cn('text-[12px] font-semibold',
        active ? 'text-[hsl(var(--archive-sepia))]' : 'text-muted-foreground/70')}>{count}</span>
    </button>
  );
}

/**
 * 형태 세그먼트 — 값이 5개로 고정이라 펼칠 이유가 없다. 지금 무엇으로 보고 있는지 한눈에 남는다.
 * (가계부 내역의 전체/지출/수입/이체 토글과 같은 문법, 채움색만 이 방의 세피아)
 */
function ArchiveSegmented({ value, options, onChange }: {
  value: string; options: { v: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-[9px] border border-[hsl(var(--hairline))] bg-card p-[3px]">
      {options.map((o) => {
        const on = o.v === value;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            aria-pressed={on}
            /* 색만 바뀌면 눌린 칸이 '깜빡' 갈아치워진다 — 눌리는 감(scale)까지 함께 */
            className={cn('h-[26px] rounded-[7px] px-[13px] text-[12.5px] transition-[background-color,color,transform] duration-200 active:scale-[0.96]',
              on
                ? 'bg-[hsl(var(--archive-sepia))] font-bold text-white'
                : 'font-semibold text-muted-foreground hover:bg-[hsl(var(--surface-2))] hover:text-foreground')}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 아카이브 상단 드롭다운 — 가계부 컨트롤 문법(h32·radius 9·헤어라인·12.5px/600).
 * 열림 상태는 부모가 쥔다(한 번에 하나, 칩 사이 1클릭 전환).
 * 바깥 클릭·Esc 닫기는 부모의 필터 바 리스너 담당.
 */
function ArchiveFilterMenu({ id, openMenu, setOpenMenu, label, value, options, onChange, align = 'left' }: {
  id: string;
  openMenu: string | null;
  setOpenMenu: (v: string | null) => void;
  label: string;
  value: string;
  options: { v: string; label: string }[];
  onChange: (v: string) => void;
  align?: 'left' | 'right';
}) {
  const open = openMenu === id;
  const allV = options[0]?.v ?? 'all';
  const active = value !== allV;
  const current = options.find((o) => o.v === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpenMenu(open ? null : id)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn('inline-flex h-8 items-center gap-1.5 rounded-[9px] border px-2.5 text-[12.5px] font-semibold transition-colors',
          active
            // 채우지 않고 세피아 윤곽 + 옅은 틴트 — 컨트롤 줄이 조용해야 카드가 앞으로 나온다
            ? 'border-[hsl(var(--archive-sepia)/0.45)] bg-[hsl(var(--archive-sepia)/0.08)] text-[hsl(var(--archive-sepia))]'
            : 'border-[hsl(var(--hairline))] bg-card text-muted-foreground hover:text-foreground')}
      >
        {active && current ? current.label : label}
        <ChevronDown className={cn('h-3.5 w-3.5 opacity-60 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={label}
          /* 툭 나타나지 않고 트리거 쪽에서 자라 나오게 — 어디서 열렸는지가 눈에 남는다 */
          className={cn('absolute top-[38px] z-30 max-h-[300px] min-w-[168px] origin-top overflow-y-auto rounded-[12px] border border-[hsl(var(--hairline))] bg-card p-1.5 shadow-[0_18px_44px_-16px_rgba(60,45,20,0.32)] duration-150 animate-in fade-in-0 zoom-in-[0.97] slide-in-from-top-1',
            align === 'right' ? 'right-0' : 'left-0')}
        >
          {options.map((o) => {
            const on = o.v === value;
            return (
              <button
                key={o.v}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => { onChange(o.v); setOpenMenu(null); }}
                className={cn('flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-left text-[13px] transition-colors',
                  on ? 'bg-[hsl(var(--archive-sepia))]/12 font-bold text-[hsl(var(--archive-sepia))]' : 'font-medium text-foreground/80 hover:bg-[hsl(var(--surface-2))]')}
              >
                {o.label}{on && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MobileChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
        active ? 'bg-[hsl(var(--archive-sepia))] text-white' : 'bg-[hsl(var(--surface-2))] text-muted-foreground')}
    >
      {label}
    </button>
  );
}

/* ── 타임라인 ── */
function Timeline({ items, narrow, onOpen, onStar, onTagClick }: {
  items: ArchiveItem[]; narrow: boolean; onOpen: (i: ArchiveItem) => void; onStar: (id: string) => void; onTagClick: (tag: string) => void;
}) {
  const groups = useMemo(() => {
    const m = new Map<string, ArchiveItem[]>();
    for (const it of items) {
      // 로컬 연월로 묶는다 — ISO 를 그대로 자르면 자정 직후 저장분이 지난달 칸으로 간다.
      const key = localYm(it.createdAt);
      let bucket = m.get(key);
      if (!bucket) { bucket = []; m.set(key, bucket); }
      bucket.push(it);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  return (
    <div className="space-y-8">
      {groups.map(([ym, list]) => {
        const [y, mo] = ym.split('-');
        return (
          <section key={ym}>
            <h2 className="mb-3 text-[15px] font-bold text-foreground">{y}년 {Number(mo)}월 <span className="ml-1 text-[12px] font-medium text-muted-foreground">{list.length}개</span></h2>
            {/* 상세가 열리면 목록 모드와 똑같이 열을 하나 줄인다 */}
            <div className={cn('columns-1 gap-4 sm:columns-2', narrow ? 'lg:columns-2 xl:columns-3' : 'lg:columns-3 xl:columns-4')}>
              {list.map((it) => (
                <div key={it.id} data-flip-id={it.id} className="break-inside-avoid">
                  <ArchiveCard item={it} onOpen={onOpen} onToggleStar={onStar} onTagClick={onTagClick} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ── 빈 상태 ── */
function EmptyState({ hasItems, onNew }: { hasItems: boolean; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--hairline))] py-20 text-center duration-300 animate-in fade-in-50">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--archive-sepia)/0.1)] text-[hsl(var(--archive-sepia))]">
        <ArchiveIcon className="h-7 w-7" />
      </span>
      <p className="text-[15px] font-bold text-foreground">{hasItems ? '조건에 맞는 항목이 없어요' : '아직 저장한 게 없어요'}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{hasItems ? '필터를 바꾸거나 검색어를 지워보세요' : '서류·링크·사진·메모 무엇이든 던져 넣어요'}</p>
      {!hasItems && (
        <button type="button" onClick={onNew} className="mt-4 flex items-center gap-1.5 rounded-xl bg-[hsl(var(--archive-sepia))] px-4 py-2 text-[13px] font-bold text-white hover:opacity-90">
          <Plus className="h-4 w-4" /> 첫 항목 저장
        </button>
      )}
    </div>
  );
}
