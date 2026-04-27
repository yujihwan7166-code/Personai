import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Plus, Hash, FileText } from 'lucide-react';
import { type WikiPage, WIKI_TYPE_META, USER_FACING_TYPES, type WikiPageType } from '@/types/wiki';
import { cn } from '@/lib/utils';

type Mode = 'search' | 'id' | 'new';

interface Props {
  open: boolean;
  pages: WikiPage[];
  excludeId?: string;
  initialQuery?: string;
  /** 기존 페이지 선택 시 호출 */
  onPick: (page: WikiPage) => void;
  /** 새 페이지 만들고 하이퍼링크 — 부모가 페이지 생성 후 그 페이지 객체를 반환 */
  onCreateAndLink?: (title: string, type: WikiPageType) => Promise<WikiPage> | WikiPage;
  onClose: () => void;
}

/**
 * 페이지 picker — 3 모드 탭:
 * 1. 검색 (기존 페이지)
 * 2. ID 입력 (w_xxx 직접)
 * 3. 새로 만들고 하이퍼링크 (제목 + type 선택)
 */
export function WikiPagePickerModal({
  open, pages, excludeId, initialQuery = '', onPick, onCreateAndLink, onClose,
}: Props) {
  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState(initialQuery);
  const [activeIdx, setActiveIdx] = useState(0);
  const [idInput, setIdInput] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<WikiPageType>('concept');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMode('search');
    setQuery(initialQuery);
    setActiveIdx(0);
    setIdInput('');
    setNewTitle(initialQuery);  // 선택 텍스트가 새 페이지 제목 후보
    setNewType('concept');
    setBusy(false);
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => window.clearTimeout(t);
  }, [open, initialQuery]);

  /* 검색 후보 */
  const candidates = useMemo(() => {
    if (mode !== 'search') return [];
    const q = query.trim().toLowerCase();
    const filtered = pages.filter((p) => p.id !== excludeId);
    if (!q) return filtered.slice(0, 12);
    const out: WikiPage[] = [];
    for (const p of filtered) {
      const titleHit = p.title.toLowerCase().includes(q);
      const aliasHit = p.aliases.some((a) => a.toLowerCase().includes(q));
      if (titleHit || aliasHit) {
        out.push(p);
        if (out.length >= 20) break;
      }
    }
    return out;
  }, [query, pages, excludeId, mode]);

  /* ID 매칭 */
  const idMatch = useMemo(() => {
    const t = idInput.trim();
    if (!t) return null;
    return pages.find((p) => p.id === t) ?? null;
  }, [idInput, pages]);

  useEffect(() => { setActiveIdx(0); }, [query, mode]);

  if (!open) return null;

  const tabs: Array<{ id: Mode; label: string; icon: React.ReactNode }> = [
    { id: 'search', label: '기존 페이지 검색', icon: <Search className="w-3 h-3" /> },
    { id: 'id',     label: 'ID 직접 입력',     icon: <Hash className="w-3 h-3" /> },
    { id: 'new',    label: '새 페이지 만들기',  icon: <Plus className="w-3 h-3" /> },
  ];

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title || !onCreateAndLink || busy) return;
    setBusy(true);
    try {
      const page = await onCreateAndLink(title, newType);
      onPick(page);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 wiki-z-modal-backdrop bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-label="하이퍼링크 만들기"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[hsl(var(--hairline))] bg-popover shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 탭 row */}
        <div className="flex border-b border-[hsl(var(--hairline))]">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-1 h-9 text-[11.5px] wiki-trans-color',
                mode === t.id
                  ? 'bg-primary/5 text-primary font-bold border-b-2 border-primary'
                  : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground border-b-2 border-transparent',
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="px-3 inline-flex items-center text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 탭 컨텐츠 */}
        {mode === 'search' && (
          <>
            <div className="flex items-center gap-1.5 px-3 h-11 border-b border-[hsl(var(--hairline))]">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(candidates.length - 1, i + 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
                  else if (e.key === 'Enter') { e.preventDefault(); if (candidates[activeIdx]) onPick(candidates[activeIdx]); }
                  else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
                }}
                placeholder="페이지 제목·별칭 검색…"
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
              />
              <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">↑↓ Enter Esc</span>
            </div>
            <div className="max-h-[50vh] overflow-y-auto py-1">
              {candidates.length === 0 ? (
                <p className="px-4 py-6 text-center text-[12px] text-muted-foreground">
                  일치하는 페이지가 없어요. 위 탭에서 *새 페이지 만들기* 로 생성할 수 있어요.
                </p>
              ) : candidates.map((p, i) => {
                const meta = WIKI_TYPE_META[p.type];
                const active = i === activeIdx;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => onPick(p)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-left wiki-trans-color',
                      active ? 'bg-accent text-foreground' : 'text-foreground/85 hover:bg-accent',
                    )}
                  >
                    <span className="text-[14px] leading-none shrink-0" aria-hidden>{meta.icon}</span>
                    <span className="flex-1 min-w-0 truncate text-[12.5px]">{p.title}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">{p.id.slice(0, 8)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {mode === 'id' && (
          <div className="p-4">
            <p className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground/70 mb-1.5">
              페이지 ID 입력
            </p>
            <input
              ref={inputRef}
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && idMatch) { e.preventDefault(); onPick(idMatch); }
                else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
              }}
              placeholder="w_abc123… (페이지 인포박스에서 복사)"
              className="w-full px-3 py-2 rounded-md border border-[hsl(var(--hairline))] bg-background text-[13px] font-mono outline-none focus:border-primary/50 wiki-trans-color"
            />
            <p className="mt-2 text-[10.5px] text-muted-foreground/80">
              각 페이지의 인포박스 마지막 줄에 *📋 ID 복사 칩* 이 있어요.
            </p>
            {idInput.trim() && (
              <div className="mt-3">
                {idMatch ? (
                  <button
                    type="button"
                    onClick={() => onPick(idMatch)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-primary/40 bg-primary/5 hover:bg-primary/10 text-left wiki-trans-color"
                  >
                    <span className="text-[16px] leading-none" aria-hidden>{WIKI_TYPE_META[idMatch.type].icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-bold text-foreground truncate">{idMatch.title}</span>
                      <span className="block text-[10.5px] font-mono text-muted-foreground">{idMatch.id}</span>
                    </span>
                    <span className="text-[10.5px] text-primary font-bold">선택 →</span>
                  </button>
                ) : (
                  <p className="text-[11.5px] text-rose-600 dark:text-rose-400">
                    이 ID 의 페이지가 없어요
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {mode === 'new' && (
          <div className="p-4 space-y-3">
            <div>
              <p className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground/70 mb-1.5">
                새 페이지 제목
              </p>
              <input
                ref={inputRef}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTitle.trim()) { e.preventDefault(); void handleCreate(); }
                  else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
                }}
                placeholder="제목 입력…"
                className="w-full px-3 py-2 rounded-md border border-[hsl(var(--hairline))] bg-background text-[13px] outline-none focus:border-primary/50 wiki-trans-color"
              />
            </div>
            <div>
              <p className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground/70 mb-1.5">
                타입
              </p>
              <div className="grid grid-cols-3 gap-1">
                {USER_FACING_TYPES.map((t) => {
                  const m = WIKI_TYPE_META[t];
                  const active = newType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewType(t)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 h-7 rounded text-[11px] wiki-trans-color',
                        active
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      <span className="text-[13px] leading-none" aria-hidden>{m.icon}</span>
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newTitle.trim() || busy || !onCreateAndLink}
              className={cn(
                'w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-[12.5px] font-semibold wiki-trans-color',
                newTitle.trim() && !busy
                  ? 'bg-primary text-primary-foreground hover:opacity-90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              {busy ? '만드는 중…' : '만들고 하이퍼링크'}
            </button>
            <p className="text-[10.5px] text-muted-foreground/80">
              새 페이지가 생성되고, 본문에 그 페이지의 *고유 ID* 로 링크가 박힙니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
