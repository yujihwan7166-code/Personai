/**
 * /memos — 인박스 zero 메모 페이지.
 *
 * 좌 사이드 (검색·필터·메모 리스트) + 본문 편집 (자동 저장).
 * 우상단 [→ 위키로 보내기] 버튼 — 모달에서 type 선택 + 보관 옵션.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Pin, Search, Trash2, X, Inbox, Archive, ArrowRight,
  ExternalLink, Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import {
  useMemos, addMemo, updateMemo, removeMemo, togglePin,
  archiveMemo, unarchiveMemo,
  memoTitle, memoPreview, extractMemoTags, memoCharCount, memoTimeLabel,
  selectMemos, tagFrequencies,
  type Memo, type MemoFilter,
} from '@/lib/memoStore';
import { upsertPage } from '@/lib/wikiStore';
import { newWikiId, type WikiPage, type WikiPageType, USER_FACING_TYPES, WIKI_TYPE_META } from '@/types/wiki';

const Memos = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const memos = useMemos();
  const [activeId, setActiveId] = useState<string | null>(searchParams.get('id'));

  // URL ?id= 변경 시 동기화 (위키 출처 칩에서 진입 등)
  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    if (idFromUrl && idFromUrl !== activeId) setActiveId(idFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // activeId 변경 시 URL 반영 (히스토리 깨끗하게)
  useEffect(() => {
    if (activeId) {
      if (searchParams.get('id') !== activeId) {
        setSearchParams({ id: activeId }, { replace: true });
      }
    } else if (searchParams.has('id')) {
      const next = new URLSearchParams(searchParams);
      next.delete('id');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);
  const [scope, setScope] = useState<MemoFilter['scope']>('inbox');
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined);
  const [exporting, setExporting] = useState<Memo | null>(null);

  const filter: MemoFilter = useMemo(() => ({
    scope,
    query,
    tag: activeTag,
  }), [scope, query, activeTag]);

  const visibleMemos = useMemo(() => selectMemos(memos, filter), [memos, filter]);
  const tags = useMemo(() => tagFrequencies(memos), [memos]);
  const inboxCount = useMemo(() => memos.filter((m) => !m.archivedAt).length, [memos]);
  const archivedCount = useMemo(() => memos.filter((m) => !!m.archivedAt).length, [memos]);
  const pinnedCount = useMemo(() => memos.filter((m) => m.pinned && !m.archivedAt).length, [memos]);

  const activeMemo = activeId ? memos.find((m) => m.id === activeId) ?? null : null;

  // 첫 진입 시 첫 메모 자동 선택
  useEffect(() => {
    if (!activeId && visibleMemos.length > 0) {
      setActiveId(visibleMemos[0].id);
    }
    if (activeId && !memos.find((m) => m.id === activeId)) {
      setActiveId(visibleMemos[0]?.id ?? null);
    }
  }, [activeId, visibleMemos, memos]);

  const handleNewMemo = useCallback(() => {
    const m = addMemo({ body: '' });
    setActiveId(m.id);
    setScope('inbox');
    setActiveTag(undefined);
    setQuery('');
  }, []);

  const handleDelete = useCallback((id: string) => {
    const snapshot = memos.find((m) => m.id === id);
    if (!snapshot) return;
    removeMemo(id);
    notify.info('메모 삭제됨', {
      duration: 5000,
      action: {
        label: '되돌리기',
        onClick: () => {
          // 새 id 로 복원
          const restored = addMemo({ body: snapshot.body, pinned: snapshot.pinned });
          if (snapshot.archivedAt) archiveMemo(restored.id);
        },
      },
    });
    if (activeId === id) setActiveId(null);
  }, [memos, activeId]);

  // 모바일 — 좁은 화면에서 사이드 ↔ 본문 토글 (활성 메모 있으면 본문)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const showSidebar = !isMobile || !activeMemo;
  const showBody = !isMobile || !!activeMemo;

  return (
    <div className="min-h-screen flex bg-background">
      {/* 좌 사이드 */}
      <aside className={cn(
        'shrink-0 border-r border-[hsl(var(--hairline))] bg-card flex flex-col',
        isMobile ? 'w-full' : 'w-[300px]',
        !showSidebar && 'hidden',
      )}>
        {/* 상단 — 뒤로 + 제목 + 새 메모 */}
        <div className="shrink-0 px-3 py-2.5 border-b border-[hsl(var(--hairline))] flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="뒤로"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
          <h1 className="text-[13px] font-bold text-foreground tracking-tight flex-1">✏️ 메모</h1>
          <button
            onClick={handleNewMemo}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            새 메모
          </button>
        </div>

        {/* 검색 */}
        <div className="shrink-0 px-3 py-2 border-b border-[hsl(var(--hairline))]">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent/40">
            <Search className="w-3 h-3 text-muted-foreground" strokeWidth={1.75} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색..."
              className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground/70 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>

        {/* 분류 */}
        <div className="shrink-0 px-3 py-2 border-b border-[hsl(var(--hairline))] space-y-0.5">
          <ScopeRow icon={<Inbox className="w-3.5 h-3.5" strokeWidth={1.75} />} label="인박스" count={inboxCount} active={scope === 'inbox' && !activeTag} onClick={() => { setScope('inbox'); setActiveTag(undefined); }} />
          {pinnedCount > 0 && (
            <ScopeRow icon={<Pin className="w-3.5 h-3.5" strokeWidth={1.75} />} label="핀" count={pinnedCount} active={scope === 'pinned' && !activeTag} onClick={() => { setScope('pinned'); setActiveTag(undefined); }} />
          )}
          {archivedCount > 0 && (
            <ScopeRow icon={<Archive className="w-3.5 h-3.5" strokeWidth={1.75} />} label="보관함" count={archivedCount} active={scope === 'archived' && !activeTag} onClick={() => { setScope('archived'); setActiveTag(undefined); }} />
          )}
        </div>

        {/* 태그 칩 */}
        {tags.length > 0 && (
          <div className="shrink-0 px-3 py-2 border-b border-[hsl(var(--hairline))]">
            <p className="text-[9.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground/80 mb-1.5">태그</p>
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 12).map(([tag, n]) => (
                <button
                  key={tag}
                  onClick={() => { setActiveTag(activeTag === tag ? undefined : tag); setScope('inbox'); }}
                  className={cn(
                    'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10.5px] transition-colors',
                    activeTag === tag
                      ? 'bg-primary/15 text-primary font-medium'
                      : 'bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  #{tag}
                  <span className="text-[9px] opacity-60">{n}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 메모 리스트 */}
        <div className="flex-1 overflow-y-auto">
          {visibleMemos.length === 0 ? (
            <div className="px-4 py-8 text-center text-[11.5px] text-muted-foreground">
              {query ? '검색 결과 없음' : scope === 'inbox' ? '비어있음 — 새 메모를' : scope === 'archived' ? '보관된 메모 없음' : '핀 고정된 메모 없음'}
            </div>
          ) : (
            <ul className="py-1">
              {visibleMemos.map((m) => (
                <MemoRow
                  key={m.id}
                  memo={m}
                  active={activeId === m.id}
                  onClick={() => setActiveId(m.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* 본문 영역 */}
      <main className={cn('flex-1 min-w-0 flex flex-col bg-background', !showBody && 'hidden')}>
        {activeMemo ? (
          <MemoEditor
            memo={activeMemo}
            onDelete={() => handleDelete(activeMemo.id)}
            onPin={() => togglePin(activeMemo.id)}
            onArchive={() => activeMemo.archivedAt ? unarchiveMemo(activeMemo.id) : archiveMemo(activeMemo.id)}
            onSendToWiki={() => setExporting(activeMemo)}
            onTagClick={(tag) => { setActiveTag(tag); setScope('inbox'); }}
            onBackToList={isMobile ? () => setActiveId(null) : undefined}
          />
        ) : (
          <EmptyState onNew={handleNewMemo} />
        )}
      </main>

      {exporting && (
        <ExportToWikiModal
          memo={exporting}
          onClose={() => setExporting(null)}
        />
      )}
    </div>
  );
};

export default Memos;

// ──────────────────────────────────────────
function ScopeRow({
  icon, label, count, active, onClick,
}: { icon: React.ReactNode; label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1 rounded-md text-[12px] transition-colors',
        active ? 'bg-primary/15 text-primary font-medium' : 'text-foreground/85 hover:bg-accent',
      )}
    >
      <span className={cn(active ? 'text-primary' : 'text-muted-foreground')}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      <span className={cn('text-[10.5px] font-mono', active ? 'text-primary' : 'text-muted-foreground/80')}>{count}</span>
    </button>
  );
}

// ──────────────────────────────────────────
function MemoRow({ memo, active, onClick }: { memo: Memo; active: boolean; onClick: () => void }) {
  const title = memoTitle(memo);
  const preview = memoPreview(memo);
  const tags = extractMemoTags(memo);
  // 라이프사이클 시각 — 오래 묵을수록 흐려짐 (인박스 zero 신호)
  const ageDays = (Date.now() - memo.updatedAt) / (24 * 3600 * 1000);
  const stale = !memo.archivedAt && !memo.pinned && ageDays > 7
    ? (ageDays > 30 ? 'opacity-50' : ageDays > 14 ? 'opacity-65' : 'opacity-80')
    : '';
  return (
    <li>
      <button
        onClick={onClick}
        className={cn(
          'w-full text-left px-3 py-2.5 border-b border-[hsl(var(--hairline))]/60 transition-colors',
          active ? 'bg-primary/8' : 'hover:bg-accent/40',
          memo.archivedAt && 'opacity-60',
          stale,
        )}
      >
        <div className="flex items-start gap-1.5">
          {memo.pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" fill="currentColor" strokeWidth={1.5} />}
          <span className={cn(
            'text-[12.5px] font-medium text-foreground line-clamp-1 flex-1',
            !memo.body.trim() && 'text-muted-foreground italic',
          )}>
            {title}
          </span>
        </div>
        {preview && (
          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
            {preview}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground/80">
          <span>{memoTimeLabel(memo.updatedAt)}</span>
          {memo.wikiPageId && (
            <span className="inline-flex items-center gap-0.5 text-primary/70">
              <ExternalLink className="w-2.5 h-2.5" strokeWidth={1.75} />
              위키
            </span>
          )}
          {tags.length > 0 && (
            <span className="truncate">
              {tags.slice(0, 2).map((t) => '#' + t).join(' ')}
              {tags.length > 2 && ` +${tags.length - 2}`}
            </span>
          )}
        </div>
      </button>
    </li>
  );
}

// ──────────────────────────────────────────
function MemoEditor({
  memo, onDelete, onPin, onArchive, onSendToWiki, onTagClick, onBackToList,
}: {
  memo: Memo;
  onDelete: () => void;
  onPin: () => void;
  onArchive: () => void;
  onSendToWiki: () => void;
  onTagClick: (tag: string) => void;
  onBackToList?: () => void;  // 모바일 — 목록으로 돌아가기
}) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(memo.body);
  const debounceRef = useRef<number | null>(null);

  // memo 변경 시 (다른 메모 선택) draft 동기화
  useEffect(() => { setDraft(memo.body); }, [memo.id]);

  // 자동 저장 — 400ms debounce
  useEffect(() => {
    if (draft === memo.body) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      updateMemo(memo.id, { body: draft });
    }, 400);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, memo.id]);

  const tags = useMemo(() => extractMemoTags({ ...memo, body: draft }), [draft, memo]);
  const charCount = draft.replace(/\s+/g, '').length;

  return (
    <>
      {/* 상단 액션바 */}
      <div className="shrink-0 px-6 py-2.5 border-b border-[hsl(var(--hairline))] flex items-center gap-2">
        {onBackToList && (
          <button
            onClick={onBackToList}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="목록"
            title="목록으로"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        )}
        <button
          onClick={onPin}
          className={cn(
            'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
            memo.pinned
              ? 'text-amber-500 hover:bg-amber-500/10'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
          aria-label={memo.pinned ? '핀 해제' : '핀 고정'}
          title={memo.pinned ? '핀 해제' : '핀 고정'}
        >
          <Pin className="w-3.5 h-3.5" fill={memo.pinned ? 'currentColor' : 'none'} strokeWidth={1.75} />
        </button>
        <button
          onClick={onArchive}
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label={memo.archivedAt ? '복원' : '보관'}
          title={memo.archivedAt ? '복원' : '보관함으로'}
        >
          <Archive className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
        <div className="flex-1" />
        {memo.wikiPageId ? (
          <button
            onClick={() => navigate('/wiki')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
            위키 페이지 열기
          </button>
        ) : (
          <button
            onClick={onSendToWiki}
            disabled={!draft.trim()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11.5px] font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            위키로 보내기
          </button>
        )}
        <button
          onClick={onDelete}
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          aria-label="삭제"
          title="삭제 (5초 안 되돌리기)"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </div>

      {/* 본문 textarea */}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
        placeholder="첫 줄이 제목이에요. 여러 줄 쓰면 본문..."
        className="flex-1 w-full px-6 sm:px-10 py-6 bg-transparent text-[16px] leading-[1.72] text-foreground placeholder:text-muted-foreground/50 outline-none resize-none"
        style={{ fontFamily: 'var(--wiki-font-body, system-ui)' }}
      />

      {/* 하단 메타 */}
      <div className="shrink-0 px-6 sm:px-10 py-2 border-t border-[hsl(var(--hairline))] flex items-center gap-3 text-[10.5px] text-muted-foreground">
        <span>{charCount.toLocaleString()}자</span>
        <span className="opacity-50">·</span>
        <span>{memoTimeLabel(memo.updatedAt)} 수정</span>
        {tags.length > 0 && (
          <>
            <span className="opacity-50">·</span>
            <span className="flex items-center gap-1 flex-wrap">
              <Tag className="w-3 h-3" strokeWidth={1.75} />
              {tags.map((t) => (
                <button
                  key={t}
                  onClick={() => onTagClick(t)}
                  className="hover:text-primary transition-colors"
                >
                  #{t}
                </button>
              ))}
            </span>
          </>
        )}
      </div>
    </>
  );
}

// ──────────────────────────────────────────
function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">✏️</div>
        <p className="text-[15px] text-foreground mb-1">지금 머리에 떠오른 한 가지를 적어보세요.</p>
        <p className="text-[12px] text-muted-foreground mb-6">
          여기 적은 메모는 나중에 한 클릭으로 위키로 보낼 수 있어요.
        </p>
        <button
          onClick={onNew}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-[12.5px] font-medium hover:opacity-90"
        >
          <Plus className="w-3.5 h-3.5" />
          새 메모 시작
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
function ExportToWikiModal({ memo, onClose }: { memo: Memo; onClose: () => void }) {
  const navigate = useNavigate();
  const [wikiType, setWikiType] = useState<WikiPageType>('concept');
  const [archiveAfter, setArchiveAfter] = useState(true);
  const [busy, setBusy] = useState(false);

  const title = memoTitle(memo);

  const submit = async () => {
    if (!memo.body.trim()) return;
    setBusy(true);
    try {
      const now = Date.now();
      const tags = extractMemoTags(memo);
      const body = memo.body.split('\n').slice(1).join('\n').trim() || memo.body;
      const page: WikiPage = {
        id: newWikiId(),
        title: title.length > 80 ? title.slice(0, 80) : title,
        aliases: [],
        type: wikiType,
        status: 'draft',
        tags,
        body,
        refersTo: [],
        cites: [],
        inherits: [],
        similarTo: [],
        parentMocs: [],
        createdAt: now,
        updatedAt: now,
      };
      await upsertPage(page);
      updateMemo(memo.id, { wikiPageId: page.id });
      if (archiveAfter) archiveMemo(memo.id);
      notify.success('위키 페이지로 보냈어요', {
        duration: 3500,
        action: { label: '위키 열기', onClick: () => navigate('/wiki') },
      });
      onClose();
    } catch (e) {
      notify.error('위키로 보내기 실패', { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/15 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[440px] bg-card rounded-lg border border-[hsl(var(--hairline))] shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 py-4 border-b border-[hsl(var(--hairline))] flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">위키로 보내기</p>
            <h3 className="text-[15px] font-bold text-foreground truncate">{title}</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="닫기">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-foreground/85 block mb-2">어떤 type 으로?</label>
            <div className="grid grid-cols-2 gap-1.5">
              {USER_FACING_TYPES.filter((t) => t !== 'index').map((t) => {
                const meta = WIKI_TYPE_META[t];
                const active = wikiType === t;
                return (
                  <button
                    key={t}
                    onClick={() => setWikiType(t)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-2 rounded-md border text-[12px] transition-colors',
                      active
                        ? 'bg-primary/10 text-primary border-primary/40'
                        : 'bg-card text-foreground/80 border-[hsl(var(--hairline))] hover:bg-accent',
                    )}
                  >
                    <span>{meta.icon}</span>
                    <span className="font-medium">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-[12.5px] text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={archiveAfter}
              onChange={(e) => setArchiveAfter(e.target.checked)}
              className="accent-primary"
            />
            메모를 보관함으로 (인박스 비우기)
          </label>
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-[hsl(var(--hairline))] bg-accent/20 flex items-center justify-between gap-3">
          <button onClick={onClose} className="text-[12px] text-muted-foreground hover:text-foreground">취소</button>
          <button
            onClick={submit}
            disabled={busy || !memo.body.trim()}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-[12.5px] font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            보내기
          </button>
        </div>
      </div>
    </div>
  );
}
