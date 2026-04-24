/**
 * 빠른검색 바 — 구글/네이버/다음 등 외부 웹 검색 런처.
 *
 * 레이아웃:
 *   ┌─────────────────────────┐
 *   │ 🔵 Google ▼             │  ← 작은 엔진 선택 칩 (상단)
 *   ├─────────────────────────┤
 *   │ 🔍  ________________    │  ← 얇은 구글형 검색창 (하단)
 *   └─────────────────────────┘
 *
 * 엔터 → 선택 엔진 결과 페이지를 새 탭으로 오픈.
 * 마지막 선택 엔진은 localStorage 에 저장 (personai.quickSearch.engine).
 */
import { useEffect, useRef, useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type EngineId = 'google' | 'naver' | 'daum' | 'bing' | 'youtube' | 'namuwiki' | 'duckduckgo';

interface Engine {
  id: EngineId;
  label: string;
  dot: string; // 브랜드 컬러 점
  searchUrl: (q: string) => string;
}

const ENGINES: Engine[] = [
  { id: 'google',     label: 'Google',    dot: '#4285F4', searchUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  { id: 'naver',      label: '네이버',    dot: '#03C75A', searchUrl: (q) => `https://search.naver.com/search.naver?query=${encodeURIComponent(q)}` },
  { id: 'daum',       label: '다음',      dot: '#0060F0', searchUrl: (q) => `https://search.daum.net/search?q=${encodeURIComponent(q)}` },
  { id: 'bing',       label: 'Bing',      dot: '#008373', searchUrl: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  { id: 'youtube',    label: 'YouTube',   dot: '#FF0000', searchUrl: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
  { id: 'namuwiki',   label: '나무위키',  dot: '#008275', searchUrl: (q) => `https://namu.wiki/Search?q=${encodeURIComponent(q)}` },
  { id: 'duckduckgo', label: 'DuckDuckGo',dot: '#DE5833', searchUrl: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
];

const STORAGE_KEY = 'personai.quickSearch.engine';

function loadEngine(): EngineId {
  if (typeof window === 'undefined') return 'google';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) as EngineId | null;
    if (saved && ENGINES.some((e) => e.id === saved)) return saved;
  } catch { /* noop */ }
  return 'google';
}

interface QuickSearchBarProps {
  className?: string;
  /** 레이아웃 — 'stacked'(기본, 2행) / 'inline'(1행 pill). */
  variant?: 'stacked' | 'inline';
  /** 검색 실행 시 콜백 (검색어). 히스토리 저장 등에 사용. */
  onSearch?: (query: string) => void;
  /** 마운트 시 입력창 오토포커스. */
  autoFocus?: boolean;
}

export function QuickSearchBar({ className, variant = 'stacked', onSearch, autoFocus }: QuickSearchBarProps) {
  const [engineId, setEngineId] = useState<EngineId>(loadEngine);
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const engine = ENGINES.find((e) => e.id === engineId) ?? ENGINES[0];

  // 엔진 선택 저장
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, engineId); } catch { /* noop */ }
  }, [engineId]);

  // 피커 외부 클릭 닫기
  useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPickerOpen(false); };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);

  const submit = () => {
    const q = query.trim();
    if (!q) return;
    window.open(engine.searchUrl(q), '_blank', 'noopener,noreferrer');
    onSearch?.(q);
  };

  // autoFocus 지원
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  };

  // 엔진 선택 드롭다운 패널 — 두 variant에서 공유
  // direction: 'down'(기본, top-full) / 'up'(bottom-full). align: 'left'(기본) / 'right'.
  const renderPicker = (widthClass: string, direction: 'up' | 'down' = 'down', align: 'left' | 'right' = 'left') => (
    pickerOpen && (
      <div
        role="listbox"
        className={cn(
          'absolute z-40 p-1 rounded-lg',
          direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1',
          align === 'right' ? 'right-0' : 'left-0',
          widthClass,
          'bg-[hsl(var(--popover))] border border-[hsl(var(--hairline))] shadow-lg',
        )}
      >
        {ENGINES.map((e) => (
          <button
            key={e.id}
            type="button"
            role="option"
            aria-selected={e.id === engineId}
            onClick={() => { setEngineId(e.id); setPickerOpen(false); inputRef.current?.focus(); }}
            className={cn(
              'flex items-center gap-2 w-full px-2 py-1 rounded-md text-[11px] text-left transition-colors',
              'hover:bg-[hsl(var(--accent))]',
              e.id === engineId && 'bg-[hsl(var(--accent))]',
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: e.dot }} aria-hidden />
            <span className="font-medium">{e.label}</span>
          </button>
        ))}
      </div>
    )
  );

  // ── 인라인 1행 pill: 엔진 칩(축소) + 구분선 + 돋보기(좌측 관습) + 입력 + ↵ 힌트 ──
  // 디자인 의도: "외부 검색 보조" 느낌으로 톤 다운.
  //  - 엔진 칩은 닷+화살표만 (라벨은 title/툴팁)
  //  - 검색 아이콘 왼쪽 (Google·네이버 관습)
  //  - 배경 투명→hover/focus 시만 강조
  //  - placeholder 중복 제거 ("네이버 검색" → "검색어 입력")
  //  - ↵ 입력 중일 때만 우측에 표시
  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center h-7 pl-1 pr-1.5 gap-1 rounded-full',
          'bg-[hsl(var(--muted))]/50 border border-transparent',
          'hover:bg-[hsl(var(--muted))] hover:border-[hsl(var(--hairline))]',
          'focus-within:bg-[hsl(var(--background))] focus-within:border-[hsl(var(--focus-ring))] focus-within:ring-2 focus-within:ring-[hsl(var(--focus-ring))]/30',
          'transition-all',
          className,
        )}
      >
        {/* 좌측 엔진 칩 — 닷 + 라벨 + 화살표 (네이버·Google 등 이름 표시). */}
        <div className="relative shrink-0" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={pickerOpen}
            aria-label={`검색 엔진: ${engine.label}`}
            className={cn(
              'inline-flex items-center gap-1 h-6 pl-1.5 pr-1 rounded-full',
              'text-[10.5px] font-medium text-foreground/85 hover:text-foreground',
              'hover:bg-[hsl(var(--background))]/80 transition-colors',
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: engine.dot }} aria-hidden />
            <span>{engine.label}</span>
            <ChevronDown className={cn('h-2.5 w-2.5 transition-transform', pickerOpen && 'rotate-180')} />
          </button>
          {renderPicker('w-[130px]', 'down', 'left')}
        </div>

        {/* 구분선 */}
        <div className="h-3 w-px bg-[hsl(var(--hairline))] shrink-0" aria-hidden />

        {/* 입력 */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="검색어 입력"
          className="flex-1 min-w-0 bg-transparent outline-none text-[11.5px] placeholder:text-muted-foreground/55"
          aria-label="빠른 웹 검색"
        />

        {/* 최우측 돋보기 — 검색 실행 버튼 (submit) */}
        <button
          type="button"
          onClick={submit}
          disabled={!query.trim()}
          className={cn(
            'shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full',
            'text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--background))]/80',
            'disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-default',
            'transition-colors',
          )}
          aria-label="검색 실행"
        >
          <Search className="h-3 w-3" />
        </button>
      </div>
    );
  }

  // ── 기본 stacked 2행 ──
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {/* 상단: 엔진 선택 칩 */}
      <div className="relative" ref={pickerRef}>
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 h-5 pl-1.5 pr-1 rounded-full',
            'text-[10px] font-medium text-muted-foreground',
            'hover:bg-[hsl(var(--accent))] transition-colors',
          )}
          aria-haspopup="listbox"
          aria-expanded={pickerOpen}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: engine.dot }} aria-hidden />
          <span>{engine.label}</span>
          <ChevronDown className={cn('h-2.5 w-2.5 transition-transform', pickerOpen && 'rotate-180')} />
        </button>
        {renderPicker('w-[130px]')}
      </div>

      {/* 하단: 얇은 검색창 */}
      <div className={cn(
        'flex items-center gap-1.5 h-8 px-2.5 rounded-full',
        'bg-[hsl(var(--muted))] border border-[hsl(var(--hairline))]',
        'focus-within:border-[hsl(var(--focus-ring))] focus-within:ring-2 focus-within:ring-[hsl(var(--focus-ring))]/20',
        'transition-all',
      )}>
        <Search className="h-3 w-3 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`${engine.label} 검색`}
          className="flex-1 min-w-0 bg-transparent outline-none text-[11.5px] placeholder:text-muted-foreground/70"
          aria-label="빠른 웹 검색"
        />
        {query && (
          <button
            type="button"
            onClick={submit}
            className="shrink-0 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            aria-label="검색 실행"
          >
            ↵
          </button>
        )}
      </div>
    </div>
  );
}
