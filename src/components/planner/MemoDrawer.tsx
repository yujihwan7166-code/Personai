/**
 * 사이드바 빠른 이동의 "메모" 클릭 시 뜨는 우측 drawer.
 *
 * 라우트 점프 대신 — 플래너 옆에 panel 띄워 참고하면서 task 추가 가능.
 * 핵심 view:
 *   - list: 검색 + 최근 메모 list + 빠른 새 메모
 *   - editor: 메모 클릭 시 인라인 편집 (제목/본문 수정, 저장/삭제)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ExternalLink, Plus, Search, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { addMemo, removeMemo, updateMemo, useMemos } from '@/lib/memoStore';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

interface MemoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const titleOf = (body: string): string => body.split('\n')[0]?.trim() || '제목 없음';
const previewOf = (body: string): string => {
  const lines = body.split('\n').filter((l) => l.trim());
  return lines.slice(1, 3).join(' · ') || '';
};
const formatRelative = (ts: number): string => {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
};

export const MemoDrawer = ({ open, onOpenChange }: MemoDrawerProps) => {
  const navigate = useNavigate();
  const memos = useMemos();
  const [query, setQuery] = useState('');
  const [drafting, setDrafting] = useState(false);
  const [draftBody, setDraftBody] = useState('');
  // 인라인 편집 모드 — selectedId 있으면 editor view.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const editRef = useRef<HTMLTextAreaElement>(null);

  // drawer 닫힐 때 모든 상태 초기화 + 편집 중이면 자동 저장.
  useEffect(() => {
    if (!open) {
      if (selectedId) {
        const trimmed = editBody.trim();
        if (trimmed) updateMemo(selectedId, { body: trimmed });
        setSelectedId(null);
        setEditBody('');
      }
      setQuery('');
      setDrafting(false);
      setDraftBody('');
    }
  }, [open, selectedId, editBody]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const active = memos.filter((m) => !m.archivedAt);
    const matched = q ? active.filter((m) => m.body.toLowerCase().includes(q)) : active;
    return [...matched]
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
      .slice(0, 30);
  }, [memos, query]);

  const submitDraft = () => {
    const trimmed = draftBody.trim();
    if (trimmed) {
      const created = addMemo({ body: trimmed });
      // 새 메모 생성 후 바로 편집 모드로 진입 — 이어서 작성하기 자연스럽게.
      setSelectedId(created.id);
      setEditBody(trimmed);
    }
    setDrafting(false);
    setDraftBody('');
  };

  const openMemo = (id: string, body: string) => {
    setSelectedId(id);
    setEditBody(body);
    setTimeout(() => editRef.current?.focus(), 0);
  };

  const closeEditor = () => {
    if (!selectedId) return;
    const trimmed = editBody.trim();
    if (trimmed) updateMemo(selectedId, { body: trimmed });
    setSelectedId(null);
    setEditBody('');
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    removeMemo(selectedId);
    notify.info('메모 삭제됨', { duration: 1200 });
    setSelectedId(null);
    setEditBody('');
  };

  const startNew = () => {
    const created = addMemo({ body: '' });
    setSelectedId(created.id);
    setEditBody('');
    setTimeout(() => editRef.current?.focus(), 0);
  };

  const editing = selectedId !== null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-[420px] p-0 flex flex-col">
        <SheetTitle className="sr-only">메모</SheetTitle>
        {/* 헤더 */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--hairline))]">
          {editing ? (
            <button
              type="button"
              onClick={closeEditor}
              aria-label="목록으로"
              title="목록으로"
              className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground/70 hover:text-foreground hover:bg-accent transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
          <span className="text-[14px] font-semibold tracking-tight text-foreground">📝 메모</span>
          {!editing && (
            <span className="text-[11px] tabular-nums text-foreground/55">{filtered.length}</span>
          )}
          {editing && (
            <button
              type="button"
              onClick={deleteSelected}
              aria-label="이 메모 삭제"
              title="이 메모 삭제"
              className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {!editing && (
            <button
              type="button"
              onClick={() => { onOpenChange(false); navigate('/memos'); }}
              aria-label="메모 페이지로"
              title="메모 페이지로 (전체 보기)"
              className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="닫기"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ─── 편집 모드 ─── */}
        {editing ? (
          <div className="flex-1 min-h-0 flex flex-col p-4 gap-2">
            <textarea
              ref={editRef}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  closeEditor();
                } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  closeEditor();
                }
              }}
              placeholder="첫 줄 = 제목.  ⌘+Enter / ESC 저장 후 닫기"
              className="flex-1 min-h-0 resize-none bg-transparent text-[13.5px] leading-relaxed outline-none placeholder:text-foreground/45 text-foreground"
            />
            <div className="shrink-0 flex items-center justify-between text-[11px] text-foreground/55">
              <span>{editBody.length.toLocaleString()}자 · 자동 저장됨</span>
              <button
                type="button"
                onClick={closeEditor}
                className="text-foreground/70 hover:text-foreground"
              >
                완료
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 검색 */}
            <div className="shrink-0 px-4 pt-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/45" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="메모 검색"
                  className="w-full pl-8 pr-3 py-1.5 text-[13px] rounded-md border border-[hsl(var(--hairline))] bg-card focus:border-foreground/40 focus:outline-none placeholder:text-foreground/45"
                />
              </div>
            </div>

            {/* 빠른 추가 */}
            <div className="shrink-0 px-4 pt-2">
              {!drafting ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDrafting(true)}
                    className="inline-flex items-center gap-1.5 text-[12px] text-foreground/65 hover:text-foreground transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    새 메모
                  </button>
                  <button
                    type="button"
                    onClick={startNew}
                    className="inline-flex items-center text-[12px] text-foreground/55 hover:text-foreground transition-colors"
                    title="빈 메모 만들고 바로 편집"
                  >
                    빈 메모로 바로 작성 →
                  </button>
                </div>
              ) : (
                <div
                  className="flex flex-col gap-1.5 p-2 rounded-md border border-foreground/30 bg-accent/20"
                  onBlur={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
                    submitDraft();
                  }}
                >
                  <textarea
                    autoFocus
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitDraft();
                      else if (e.key === 'Escape') { setDrafting(false); setDraftBody(''); }
                    }}
                    placeholder="첫 줄 = 제목.  ⌘+Enter 저장 / Esc 취소"
                    rows={3}
                    className="w-full bg-transparent text-[13px] outline-none resize-none placeholder:text-foreground/45"
                  />
                  <div className="flex justify-end gap-2 text-[11px]">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setDrafting(false); setDraftBody(''); }}
                      className="text-foreground/55 hover:text-foreground"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={submitDraft}
                      className="text-foreground font-medium hover:underline"
                    >
                      저장
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 메모 list */}
            <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-[12.5px] text-foreground/55 text-center">
                  {query ? '일치하는 메모 없음' : '메모 없음'}
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {filtered.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => openMemo(m.id, m.body)}
                        className={cn(
                          'w-full flex flex-col items-start gap-0.5 px-3 py-2 rounded text-left',
                          'hover:bg-accent transition-colors',
                        )}
                      >
                        <div className="flex items-baseline gap-2 w-full">
                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                            {m.pinned && <span className="mr-1" aria-hidden>📌</span>}
                            {titleOf(m.body)}
                          </span>
                          <span className="shrink-0 text-[10.5px] tabular-nums text-foreground/55">
                            {formatRelative(m.updatedAt)}
                          </span>
                        </div>
                        {previewOf(m.body) && (
                          <span className="text-[11.5px] text-foreground/55 leading-snug line-clamp-1">
                            {previewOf(m.body)}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
