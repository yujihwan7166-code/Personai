/**
 * 북마크 그리드 모달 — 3x3 9슬롯.
 *
 * - 빈 슬롯 클릭 → 추가 다이얼로그 (외부 URL / 내 기능 탭)
 * - 채워진 슬롯 클릭 → URL 새 탭 open 또는 onNavigate(target) 호출
 * - 채워진 슬롯 hover → 우상단 × 삭제 버튼
 * - 모든 상태 localStorage 영속화
 */
import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, Globe, Sparkles, Link2 } from 'lucide-react';
import {
  loadBookmarks, saveBookmarks, emptySlots, guessFavicon,
  INTERNAL_FEATURE_PRESETS, BOOKMARK_SLOT_COUNT,
  type BookmarkSlot, type InternalTarget,
} from '@/lib/bookmarkStore';
import { cn } from '@/lib/utils';

interface BookmarkGridModalProps {
  open: boolean;
  onClose: () => void;
  /** 내부 기능 바로가기 클릭 시 호출 — 호출자가 라우팅 결정. */
  onNavigate?: (target: InternalTarget) => void;
}

export function BookmarkGridModal({ open, onClose, onNavigate }: BookmarkGridModalProps) {
  const [slots, setSlots] = useState<BookmarkSlot[]>(emptySlots);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open) setSlots(loadBookmarks());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingIndex !== null) setEditingIndex(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, editingIndex, onClose]);

  const updateSlot = (idx: number, next: BookmarkSlot) => {
    setSlots((prev) => {
      const copy = [...prev];
      copy[idx] = next;
      saveBookmarks(copy);
      return copy;
    });
  };

  const handleSlotClick = (idx: number) => {
    const slot = slots[idx];
    if (slot.kind === 'empty') {
      setEditingIndex(idx);
      return;
    }
    if (slot.kind === 'url') {
      window.open(slot.url, '_blank', 'noopener,noreferrer');
      onClose();
      return;
    }
    if (slot.kind === 'internal') {
      onNavigate?.(slot.target);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* 아주 가벼운 backdrop — 드롭다운 컨텍스트 유지됨 */}
      <div className="absolute inset-0 bg-black/15" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[440px] rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--hairline))] shadow-2xl overflow-hidden"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[hsl(var(--hairline))]">
          <div>
            <p className="text-[15px] font-semibold text-foreground">북마크</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              외부 사이트·내 기능 6개까지 저장
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--accent))] transition-colors"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 3x3 그리드 */}
        <div className="p-4 grid grid-cols-3 gap-2">
          {Array.from({ length: BOOKMARK_SLOT_COUNT }).map((_, idx) => (
            <BookmarkCell
              key={idx}
              slot={slots[idx]}
              onClick={() => handleSlotClick(idx)}
              onDelete={() => updateSlot(idx, { kind: 'empty' })}
            />
          ))}
        </div>
      </div>

      {/* 추가/편집 다이얼로그 — 부모 모달 위 레이어 */}
      {editingIndex !== null && (
        <AddBookmarkDialog
          onClose={() => setEditingIndex(null)}
          onSave={(next) => {
            updateSlot(editingIndex, next);
            setEditingIndex(null);
          }}
        />
      )}
    </div>
  );
}

function BookmarkCell({
  slot, onClick, onDelete,
}: {
  slot: BookmarkSlot;
  onClick: () => void;
  onDelete: () => void;
}) {
  if (slot.kind === 'empty') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'group aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed',
          'border-[hsl(var(--hairline))] text-muted-foreground/60',
          'hover:border-[hsl(var(--focus-ring))] hover:text-foreground hover:bg-[hsl(var(--accent))]/40 transition-colors',
        )}
        aria-label="빈 슬롯 — 클릭하여 북마크 추가"
      >
        <Plus className="h-5 w-5" strokeWidth={1.5} />
        <span className="text-[10px] font-medium">추가</span>
      </button>
    );
  }

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full aspect-square flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl',
          'bg-[hsl(var(--muted))]/50 border border-[hsl(var(--hairline))]',
          'hover:bg-[hsl(var(--accent))] hover:-translate-y-0.5 hover:shadow-md transition-all',
        )}
        aria-label={slot.label}
      >
        {slot.kind === 'url' ? (
          slot.favicon ? (
            <img
              src={slot.favicon}
              alt=""
              className="h-7 w-7 rounded-md object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <Globe className="h-6 w-6 text-muted-foreground" />
          )
        ) : (
          <span className="text-[24px] leading-none select-none">{slot.emoji}</span>
        )}
        <span className="text-[10.5px] font-medium text-foreground leading-tight text-center line-clamp-2">
          {slot.label}
        </span>
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className={cn(
          'absolute top-1 right-1 h-5 w-5 flex items-center justify-center rounded-full',
          'bg-[hsl(var(--background))]/90 border border-[hsl(var(--hairline))]',
          'text-muted-foreground hover:text-rose-500 hover:border-rose-300',
          'opacity-0 group-hover:opacity-100 transition-opacity',
        )}
        aria-label="삭제"
      >
        <Trash2 className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

function AddBookmarkDialog({
  onClose, onSave,
}: {
  onClose: () => void;
  onSave: (slot: BookmarkSlot) => void;
}) {
  const [tab, setTab] = useState<'url' | 'internal'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [search, setSearch] = useState('');

  const filteredPresets = useMemo(
    () =>
      INTERNAL_FEATURE_PRESETS.filter((p) =>
        !search.trim() ? true : (p.label + p.desc).toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [search],
  );

  const submitUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    let host = normalized;
    try { host = new URL(normalized).hostname.replace(/^www\./, ''); } catch { /* noop */ }
    const label = labelInput.trim() || host;
    onSave({ kind: 'url', label, url: normalized, favicon: guessFavicon(normalized) });
  };

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[440px] rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--hairline))] shadow-2xl overflow-hidden"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <p className="text-[14px] font-semibold text-foreground">북마크 추가</p>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--accent))] transition-colors"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 탭 */}
        <div className="px-5 mb-3 flex gap-1 border-b border-[hsl(var(--hairline))]">
          {([
            { id: 'url',      label: '외부 URL', icon: Link2 },
            { id: 'internal', label: '내 기능',  icon: Sparkles },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border-b-2 transition-colors -mb-px',
                tab === id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'url' ? (
          <div className="px-5 pb-5 space-y-3">
            <label className="block">
              <span className="block text-[11px] font-medium text-muted-foreground mb-1">URL</span>
              <input
                autoFocus
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com"
                className="w-full h-9 px-3 rounded-lg bg-[hsl(var(--muted))]/50 border border-[hsl(var(--hairline))] focus:border-[hsl(var(--focus-ring))] focus:ring-2 focus:ring-[hsl(var(--focus-ring))]/20 outline-none text-[12.5px]"
                onKeyDown={(e) => { if (e.key === 'Enter') submitUrl(); }}
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-medium text-muted-foreground mb-1">라벨 (선택)</span>
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="비워두면 도메인 이름 사용"
                className="w-full h-9 px-3 rounded-lg bg-[hsl(var(--muted))]/50 border border-[hsl(var(--hairline))] focus:border-[hsl(var(--focus-ring))] focus:ring-2 focus:ring-[hsl(var(--focus-ring))]/20 outline-none text-[12.5px]"
                onKeyDown={(e) => { if (e.key === 'Enter') submitUrl(); }}
              />
            </label>
            <button
              type="button"
              onClick={submitUrl}
              disabled={!urlInput.trim()}
              className="w-full h-9 rounded-lg bg-foreground text-background text-[12.5px] font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              저장
            </button>
          </div>
        ) : (
          <div className="px-5 pb-5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="기능 검색"
              className="w-full h-9 px-3 mb-2 rounded-lg bg-[hsl(var(--muted))]/50 border border-[hsl(var(--hairline))] focus:border-[hsl(var(--focus-ring))] focus:ring-2 focus:ring-[hsl(var(--focus-ring))]/20 outline-none text-[12.5px]"
            />
            <div className="max-h-[320px] overflow-y-auto space-y-0.5 -mx-1 px-1">
              {filteredPresets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    onSave({ kind: 'internal', label: p.label, emoji: p.emoji, target: p.target })
                  }
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-[hsl(var(--accent))] transition-colors"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md shrink-0 bg-[hsl(var(--muted))]/60">
                    <span className="text-[16px] leading-none">{p.emoji}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium text-foreground truncate">{p.label}</span>
                    <span className="block text-[10.5px] text-muted-foreground truncate">{p.desc}</span>
                  </span>
                </button>
              ))}
              {filteredPresets.length === 0 && (
                <p className="text-[11.5px] text-muted-foreground text-center py-6">검색 결과 없음</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
