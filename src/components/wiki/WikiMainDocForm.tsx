import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, Search, Link2 } from 'lucide-react';
import { type WikiPage, WIKI_TYPE_META } from '@/types/wiki';
import { type MainDocForm } from '@/lib/wikiMainDocBody';
import { cn } from '@/lib/utils';

interface Props {
  form: MainDocForm;
  onChange: (next: MainDocForm) => void;
  /** 자동완성용 페이지 목록 (현재 페이지 포함, 부모가 필터) */
  allPages: WikiPage[];
  /** 현재 페이지 id — 자기 자신 자동완성에서 제외 */
  currentId?: string;
}

/**
 * 메인 문서 *간편 모드* 편집 폼.
 *
 * 마크다운 textarea 대신 정형 섹션을 폼으로:
 * - 개요 (textarea)
 * - 핵심 페이지 / 하위 주제 / 같이 보기 / 출처·참고 (페이지 picker chips)
 * - 추가 본문 (extra) — 알려지지 않은 섹션 보존용 textarea
 *
 * 문서 picker: 검색 input + autocomplete + 칩 추가/제거.
 * 없는 제목 입력 + Enter = 새 칩으로 추가 (실제 페이지 생성은 저장 시 부모가 처리 가능).
 */
export function WikiMainDocForm({ form, onChange, allPages, currentId }: Props) {
  const update = (patch: Partial<MainDocForm>) => onChange({ ...form, ...patch });

  return (
    <div className="space-y-5">
      {/* 개요 */}
      <FieldBlock label="개요" hint="이 메인 문서가 다루는 범위·정의를 한두 문장으로">
        <textarea
          value={form.overview}
          onChange={(e) => update({ overview: e.target.value })}
          placeholder="예) 이 문서는 [주제]의 핵심 개념과 관련 자료를 묶어둔 길찾기 문서."
          rows={3}
          className="w-full resize-y rounded-md border border-[hsl(var(--hairline))] bg-background px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/15 wiki-trans-color"
        />
      </FieldBlock>

      {/* 핵심 문서 */}
      <FieldBlock label="핵심 문서" hint="이 주제의 가장 중요한 문서들 — 짧게 4~7개">
        <PagePickerChips
          values={form.coreLinks}
          onChange={(v) => update({ coreLinks: v })}
          allPages={allPages}
          currentId={currentId}
          placeholder="문서 검색·추가…"
        />
      </FieldBlock>

      {/* 하위 주제 */}
      <FieldBlock label="하위 주제" hint="이 주제 아래의 더 작은 묶음 또는 문서">
        <PagePickerChips
          values={form.subTopics}
          onChange={(v) => update({ subTopics: v })}
          allPages={allPages}
          currentId={currentId}
          placeholder="하위 주제 추가…"
        />
      </FieldBlock>

      {/* 같이 보기 */}
      <FieldBlock label="같이 보기" hint="옆에서 참고할 만한 관련 문서">
        <PagePickerChips
          values={form.seeAlso}
          onChange={(v) => update({ seeAlso: v })}
          allPages={allPages}
          currentId={currentId}
          placeholder="관련 문서 추가…"
        />
      </FieldBlock>

      {/* 출처/참고 */}
      <FieldBlock label="출처 · 참고" hint="자료 문서 또는 외부 출처">
        <PagePickerChips
          values={form.sources}
          onChange={(v) => update({ sources: v })}
          allPages={allPages}
          currentId={currentId}
          placeholder="자료 문서 추가…"
        />
      </FieldBlock>

      {/* 추가 본문 (extra) */}
      {(form.extra.trim().length > 0 || form.overview.length > 0) && (
        <FieldBlock label="추가 본문 (선택)" hint="위 섹션 외에 자유롭게 적고 싶은 내용. 마크다운 그대로 보존">
          <textarea
            value={form.extra}
            onChange={(e) => update({ extra: e.target.value })}
            placeholder="옵션 — 추가 메모, 설명, 표 등"
            rows={3}
            className="w-full resize-y rounded-md border border-[hsl(var(--hairline))] bg-background px-3 py-2 text-[12.5px] leading-relaxed outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/15 wiki-trans-color font-mono"
          />
        </FieldBlock>
      )}
    </div>
  );
}

/* ── 필드 블록 — 라벨 + 힌트 + 입력 ── */
function FieldBlock({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <h3
          className="text-[13.5px] font-bold text-foreground"
          style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
        >
          {label}
        </h3>
        {hint && <p className="text-[10.5px] text-muted-foreground/80">— {hint}</p>}
      </div>
      {children}
    </div>
  );
}

/* ── 페이지 picker + 칩 ── */
function PagePickerChips({
  values, onChange, allPages, currentId, placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  allPages: WikiPage[];
  currentId?: string;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const lower = new Set(values.map((v) => v.toLowerCase()));
    const out: WikiPage[] = [];
    for (const p of allPages) {
      if (p.id === currentId) continue;
      if (lower.has(p.title.toLowerCase())) continue;
      const titleHit = p.title.toLowerCase().includes(q);
      const aliasHit = p.aliases.some((a) => a.toLowerCase().includes(q));
      if (titleHit || aliasHit) {
        out.push(p);
        if (out.length >= 8) break;
      }
    }
    return out;
  }, [query, allPages, values, currentId]);

  const exactExists = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    return allPages.some((p) =>
      p.title.toLowerCase() === q
      || p.aliases.some((a) => a.toLowerCase() === q),
    );
  }, [query, allPages]);

  const showCreateOption = query.trim().length > 0 && !exactExists
    && !values.some((v) => v.toLowerCase() === query.trim().toLowerCase());

  /* 외부 클릭 닫기 */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  const totalOptions = candidates.length + (showCreateOption ? 1 : 0);
  useEffect(() => { setActiveIdx(0); }, [query]);

  function addTitle(title: string) {
    const t = title.trim();
    if (!t) return;
    if (values.some((v) => v.toLowerCase() === t.toLowerCase())) {
      setQuery('');
      return;
    }
    onChange([...values, t]);
    setQuery('');
    setActiveIdx(0);
    inputRef.current?.focus();
  }
  function removeAt(i: number) {
    onChange(values.filter((_, idx) => idx !== i));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(totalOptions - 1, i + 1));
      setOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (totalOptions === 0) {
        if (query.trim()) addTitle(query.trim());
        return;
      }
      if (activeIdx < candidates.length) {
        addTitle(candidates[activeIdx].title);
      } else {
        addTitle(query.trim());
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Backspace' && !query && values.length > 0) {
      // 빈 입력 + Backspace = 마지막 칩 삭제
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-md border bg-background min-h-[40px] wiki-trans-color',
          open ? 'border-primary/50' : 'border-[hsl(var(--hairline))]',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {values.map((v, i) => {
          const found = allPages.find((p) =>
            p.title.toLowerCase() === v.toLowerCase()
            || p.aliases.some((a) => a.toLowerCase() === v.toLowerCase()),
          );
          const meta = found ? WIKI_TYPE_META[found.type] : null;
          return (
            <span
              key={`${v}-${i}`}
              className={cn(
                'inline-flex items-center gap-1 pl-1.5 pr-1 h-6 rounded-md border text-[12px] wiki-trans-color',
                found
                  ? 'border-[hsl(var(--hairline))] bg-card text-foreground/90'
                  : 'border-rose-300/50 bg-rose-50/60 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300',
              )}
              title={found ? `${meta?.label} · ${found.title}` : `${v} (아직 없는 문서 — 저장하면 자동으로 만들어짐)`}
            >
              <span className="text-[12px] leading-none" aria-hidden>
                {found ? meta?.icon : '🔴'}
              </span>
              <span className="truncate max-w-[180px]">{v}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeAt(i); }}
                className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={`${v} 제거`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          );
        })}
        <div className="flex items-center gap-1 flex-1 min-w-[140px]">
          <Search className="w-3 h-3 text-muted-foreground/70 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={values.length === 0 ? placeholder : '추가…'}
            className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* autocomplete drop */}
      {open && (candidates.length > 0 || showCreateOption) && (
        <div className="absolute left-0 right-0 mt-1 wiki-z-popover rounded-md border border-[hsl(var(--hairline))] bg-popover shadow-lg overflow-hidden max-h-[280px] overflow-y-auto">
          {candidates.map((p, i) => {
            const meta = WIKI_TYPE_META[p.type];
            const active = i === activeIdx;
            return (
              <button
                key={p.id}
                type="button"
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => addTitle(p.title)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12.5px] wiki-trans-color',
                  active ? 'bg-accent text-foreground' : 'text-foreground/85 hover:bg-accent',
                )}
              >
                <span className="text-[14px] leading-none shrink-0" aria-hidden>{meta.icon}</span>
                <span className="flex-1 truncate">{p.title}</span>
                <span className="text-[10px] text-muted-foreground/70">{meta.label}</span>
              </button>
            );
          })}
          {showCreateOption && (
            <button
              type="button"
              onMouseEnter={() => setActiveIdx(candidates.length)}
              onClick={() => addTitle(query.trim())}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12.5px] border-t border-[hsl(var(--hairline))] wiki-trans-color',
                activeIdx === candidates.length ? 'bg-primary/10 text-primary' : 'text-primary hover:bg-primary/5',
              )}
            >
              <Plus className="w-3 h-3 shrink-0" />
              <span className="flex-1 truncate">
                <span className="font-bold">{query.trim()}</span>
                <span className="text-muted-foreground"> — 새 문서로 추가</span>
              </span>
            </button>
          )}
        </div>
      )}

      {/* 빈 상태 — 입력 안 했고 칩도 없을 때 살짝 안내 */}
      {values.length === 0 && !query && !open && (
        <p className="mt-1 text-[10.5px] text-muted-foreground/70 inline-flex items-center gap-1">
          <Link2 className="w-2.5 h-2.5" />
          문서를 검색하거나 직접 입력 후 Enter
        </p>
      )}
    </div>
  );
}
