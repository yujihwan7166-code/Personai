import { useMemo } from 'react';
import { Plus, Sparkles, ArrowRight } from 'lucide-react';
import { type WikiPage, WIKI_TYPE_META, extractWikiLinks } from '@/types/wiki';
import { STARTER_PACKS, type StarterPack } from '@/lib/wikiStarterPacks';

interface Props {
  pages: WikiPage[];
  /** 즐겨찾기 페이지 id 모음 — 카드 ⭐ 표시용 (옵션) */
  favorites?: string[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  /** 스타터 팩 선택 시 — Wiki 페이지가 IDB upsert + activeId 설정 */
  onPickStarterPack?: (pack: StarterPack) => void | Promise<void>;
  /** Wanted 링크 클릭 시 — 그 제목으로 새 draft 페이지 생성 + 진입 */
  onCreateMissing?: (title: string) => void;
  /** 인기 태그로 목차 생성 (옵션) — 미사용 가능 */
  onMakeMocFromTag?: (tag: string) => void;
}

/** 30일 — 페이지 잠자는 임계 */
const STALE_DAYS = 30;
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;

export function WikiHome({
  pages,
  onSelect, onCreate, onPickStarterPack, onCreateMissing,
}: Props) {
  const stats = useMemo(() => {
    const byStatus = { draft: 0, active: 0, stable: 0, archived: 0 };
    for (const p of pages) byStatus[p.status]++;

    // 활동 N건 = 7일내 수정 페이지
    const sevenDays = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentEdits = pages.filter((p) => p.updatedAt > sevenDays).length;

    const recent = pages.slice(0, 6); // pages 는 updatedAt desc 정렬됨
    const inbox = pages.filter((p) => p.status === 'draft').slice(0, 5);
    const mocs = pages.filter((p) => p.type === 'moc').slice(0, 5);

    // 연결 안 된 페이지 = refersTo 도 cites 도 비어있고, 아무도 참조하지 않는 페이지
    const referencedIds = new Set<string>();
    for (const p of pages) {
      for (const r of [...p.refersTo, ...p.cites]) referencedIds.add(r);
    }
    const orphans = pages.filter(
      (p) => p.refersTo.length === 0 && p.cites.length === 0 && !referencedIds.has(p.id)
    ).slice(0, 5);

    // 태그 빈도
    const tagCount = new Map<string, number>();
    for (const p of pages) for (const t of p.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    const topTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);

    // 만들 페이지 (Wanted) — 본문에서 [[링크]] 추출 → 존재 X 인 제목들
    const titleSet = new Set<string>();
    for (const p of pages) {
      titleSet.add(p.title.toLowerCase());
      for (const a of p.aliases) titleSet.add(a.toLowerCase());
    }
    const wantedCount = new Map<string, number>();
    for (const p of pages) {
      for (const link of extractWikiLinks(p.body)) {
        if (!titleSet.has(link.toLowerCase())) {
          wantedCount.set(link, (wantedCount.get(link) ?? 0) + 1);
        }
      }
    }
    const wanted = [...wantedCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

    // 잠자는 페이지 — status='active' 인데 30일 미수정
    const cutoff = Date.now() - STALE_MS;
    const stale = pages
      .filter((p) => p.status === 'active' && p.updatedAt < cutoff)
      .slice(0, 5);

    return { byStatus, recentEdits, recent, inbox, mocs, orphans, topTags, wanted, stale };
  }, [pages]);

  /* ── 빈 위키 ── */
  if (pages.length === 0) {
    return (
      <div className="min-h-full flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-3xl">
          <header className="text-center mb-7">
            <div className="text-5xl mb-3">🌐</div>
            <h1 className="text-2xl font-bold text-foreground mb-1.5">마이위키 시작하기</h1>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              아래 스타터 팩으로 시작하면 30초 안에 위키 골격이 생겨요.<br />
              나중에 자유롭게 바꾸거나 지울 수 있어요.
            </p>
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {STARTER_PACKS.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => { void onPickStarterPack?.(pack); }}
                className="group flex items-start gap-3 text-left rounded-xl border border-[hsl(var(--hairline))] bg-card hover:border-primary/40 hover:bg-primary/5 p-4 wiki-trans-color"
              >
                <span className="text-2xl shrink-0 leading-none mt-0.5">{pack.emoji}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13.5px] font-bold text-foreground">{pack.label}</span>
                  <span className="block text-[11.5px] text-muted-foreground mt-1 leading-relaxed">{pack.description}</span>
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 wiki-trans-color shrink-0 mt-0.5" />
              </button>
            ))}
          </div>
          <div className="text-center">
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
            >
              <Plus className="w-3.5 h-3.5" />
              빈 페이지로 시작
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalQueue = stats.inbox.length + stats.wanted.length + stats.orphans.length + stats.stale.length;

  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8">
      {/* 헤더 — serif 대문 + mono 메타 */}
      <header className="mb-7 flex items-end justify-between gap-3 pb-4 border-b-2 border-[hsl(var(--wiki-hairline-strong))]">
        <div>
          <p className="text-[10.5px] font-mono uppercase tracking-[0.22em] text-muted-foreground mb-1.5">
            MY WIKI · HOME
          </p>
          <h1
            className="text-[34px] leading-none font-bold text-foreground"
            style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif', letterSpacing: '-0.01em' }}
          >
            대문
          </h1>
          <p className="text-[12px] text-muted-foreground mt-2">
            최근 · 초안 · 목차 · 연결 · 만들 · 잠자 — 한눈에.
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground pb-1 font-mono inline-flex items-center gap-2">
          <span><span className="font-bold text-foreground">{pages.length}</span><span className="text-muted-foreground/70"> pages</span></span>
          <span className="text-muted-foreground/40">·</span>
          <span><span className="font-bold text-foreground/85">{stats.recentEdits}</span><span className="text-muted-foreground/70"> active</span></span>
          {totalQueue > 0 && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-primary font-bold">{totalQueue}</span>
                <span className="text-primary/70">queue</span>
              </span>
            </>
          )}
        </p>
      </header>

      {/* 6 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 최근 수정 */}
        <Section title="🕒 최근 수정" empty="아직 페이지가 없어요">
          {stats.recent.map((p) => (
            <PageRow key={p.id} page={p} onSelect={onSelect} />
          ))}
        </Section>

        {/* 초안 */}
        <Section title="🚧 초안 — 정리 대기" empty="모두 정리됐어요 ✓">
          {stats.inbox.map((p) => (
            <PageRow key={p.id} page={p} onSelect={onSelect} />
          ))}
        </Section>

        {/* 목차 (MOC → 목차) */}
        <Section title="📚 목차 — 주제별 묶음" empty="아직 목차가 없어요">
          {stats.mocs.map((p) => (
            <PageRow key={p.id} page={p} onSelect={onSelect} />
          ))}
        </Section>

        {/* 연결 안 된 페이지 (고아 → 연결) */}
        <Section
          title="🌱 연결 — 안 된 페이지"
          empty="모든 페이지가 연결됐어요 ✓"
        >
          {stats.orphans.map((p) => (
            <PageRow key={p.id} page={p} onSelect={onSelect} />
          ))}
        </Section>

        {/* 만들 페이지 (Wanted) */}
        <Section
          title="🔗 만들 — 빨간 링크"
          empty="모든 위키링크가 충족됐어요 ✓"
        >
          {stats.wanted.map(([title, n]) => (
            <li key={title}>
              <button
                type="button"
                onClick={() => onCreateMissing?.(title)}
                disabled={!onCreateMissing}
                className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-left hover:bg-accent transition-colors disabled:opacity-60"
                title={`${n}개 페이지에서 가리킴 — 클릭하면 생성`}
              >
                <span className="text-[14px] leading-none shrink-0" aria-hidden>🔴</span>
                <span className="flex-1 min-w-0 truncate text-[12.5px] text-foreground/90">{title}</span>
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">×{n}</span>
              </button>
            </li>
          ))}
        </Section>

        {/* 잠자 (부패 → 잠자) */}
        <Section
          title="🌙 잠자 — 30일+ 미수정"
          empty="모든 페이지가 신선해요 ✓"
        >
          {stats.stale.map((p) => (
            <PageRow key={p.id} page={p} onSelect={onSelect} />
          ))}
        </Section>
      </div>

      {/* 인기 태그 */}
      {stats.topTags.length > 0 && (
        <div className="mt-7">
          <h2 className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-2">
            🏷 자주 쓰는 태그
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {stats.topTags.map(([tag, n]) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/60 text-foreground/80 text-[11px]"
                title={`${tag} (${n}건)`}
              >
                #{tag}
                <span className="text-[9.5px] font-mono text-muted-foreground">{n}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 상태 요약 */}
      <div className="mt-7 grid grid-cols-4 gap-2">
        {(Object.entries(stats.byStatus) as Array<[keyof typeof stats.byStatus, number]>).map(([k, n]) => (
          <div
            key={k}
            className="rounded-lg border border-[hsl(var(--hairline))] bg-card px-3 py-2"
          >
            <p className="text-[9.5px] font-mono uppercase tracking-wider text-muted-foreground">
              {k}
            </p>
            <p className="text-[18px] font-mono font-bold text-foreground mt-0.5">{n}</p>
          </div>
        ))}
      </div>

      {/* 빠른 액션 */}
      <div className="mt-7 flex items-center gap-2">
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" /> 새 페이지
        </button>
        <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          본문에 <code className="px-1 rounded bg-accent">[[페이지명]]</code> 으로 위키링크
        </span>
      </div>
    </div>
  );
}

/* ── 카드 섹션 ── */
function Section({
  title, children, empty,
}: {
  title: string; children: React.ReactNode; empty: string;
}) {
  const arr = Array.isArray(children) ? children : [children];
  const isEmpty = arr.length === 0 || arr.every((c) => !c);
  return (
    <div className="rounded-xl border border-[hsl(var(--hairline))] bg-card p-3.5">
      <h2 className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-2">
        {title}
      </h2>
      {isEmpty ? (
        <p className="text-[11.5px] text-muted-foreground/70 py-2">{empty}</p>
      ) : (
        <ul className="space-y-0.5">{children}</ul>
      )}
    </div>
  );
}

/* ── 페이지 한 줄 ── */
function PageRow({ page, onSelect }: { page: WikiPage; onSelect: (id: string) => void }) {
  const meta = WIKI_TYPE_META[page.type];
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(page.id)}
        className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-left hover:bg-accent transition-colors"
      >
        <span className="text-[14px] leading-none shrink-0" aria-hidden>{meta.icon}</span>
        <span className="flex-1 min-w-0 truncate text-[12.5px] text-foreground/90">{page.title}</span>
      </button>
    </li>
  );
}
