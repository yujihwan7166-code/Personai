import { useMemo } from 'react';
import { Plus, Sparkles, ArrowRight, BookOpen, Star } from 'lucide-react';
import { type WikiPage, WIKI_TYPE_META, extractWikiLinks, isMainDoc } from '@/types/wiki';
import { STARTER_PACKS, type StarterPack } from '@/lib/wikiStarterPacks';
import { cn } from '@/lib/utils';

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
  /** 인기 태그로 메인 문서 생성 (옵션) — 미사용 가능 */
  onMakeMocFromTag?: (tag: string) => void;
  /** '+ 새 메인 문서' — 템플릿 픽커 거치지 않고 바로 type='moc' 페이지 만들고 진입 */
  onCreateMainDoc?: () => void;
}

/** 30일 — 페이지 잠자는 임계 */
const STALE_DAYS = 30;
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;

export function WikiHome({
  pages, favorites = [],
  onSelect, onCreate, onPickStarterPack, onCreateMissing, onMakeMocFromTag, onCreateMainDoc,
}: Props) {
  const favSet = new Set(favorites);
  const stats = useMemo(() => {
    const byStatus = { draft: 0, active: 0, stable: 0, archived: 0 };
    for (const p of pages) byStatus[p.status]++;

    // 활동 N건 = 7일내 수정 페이지
    const sevenDays = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentEdits = pages.filter((p) => p.updatedAt > sevenDays).length;

    const recent = pages.slice(0, 6); // pages 는 updatedAt desc 정렬됨
    const inbox = pages.filter((p) => p.status === 'draft').slice(0, 5);
    const mocs = pages.filter((p) => isMainDoc(p));

    // 제목·alias → 페이지 맵 (대소문자 무시)
    const byTitle = new Map<string, WikiPage>();
    for (const p of pages) {
      byTitle.set(p.title.toLowerCase(), p);
      for (const a of p.aliases) byTitle.set(a.toLowerCase(), p);
    }
    // 다른 메인 문서가 참조하는 메인 = sub-main
    const subMocIds = new Set<string>();
    for (const m of mocs) {
      for (const t of extractWikiLinks(m.body)) {
        const target = byTitle.get(t.toLowerCase());
        if (target && isMainDoc(target) && target.id !== m.id) {
          subMocIds.add(target.id);
        }
      }
    }
    // root = 다른 메인이 참조 안 한 메인 (= 가장 큰 우산)
    const rootMocs = mocs.filter((m) => !subMocIds.has(m.id));
    // 각 root 의 즉각 하위 (1-hop): 본문 [[링크]] 중 존재하는 페이지들
    const rootMocChildren = new Map<string, { mocs: WikiPage[]; pages: WikiPage[] }>();
    for (const m of rootMocs) {
      const childMocs: WikiPage[] = [];
      const childPages: WikiPage[] = [];
      const seen = new Set<string>();
      for (const t of extractWikiLinks(m.body)) {
        const target = byTitle.get(t.toLowerCase());
        if (!target || target.id === m.id || seen.has(target.id)) continue;
        seen.add(target.id);
        if (isMainDoc(target)) childMocs.push(target);
        else childPages.push(target);
      }
      rootMocChildren.set(m.id, { mocs: childMocs, pages: childPages });
    }

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

    return { byStatus, recentEdits, recent, inbox, mocs, rootMocs, rootMocChildren, subMocIds, orphans, topTags, wanted, stale };
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
            메인 문서 · 최근 · 초안 · 연결 · 만들 · 잠자 — 한눈에.
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

      {/* 📖 메인 문서 — 4-col 카드 그리드 (한눈에) */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-primary" />
          <h2
            className="text-[17px] font-bold text-foreground"
            style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
          >
            메인 문서
          </h2>
          <span className="text-[11px] text-muted-foreground/80">— 주제별 묶음</span>
          <span aria-hidden className="flex-1 h-px bg-[hsl(var(--hairline))]" />
          {stats.mocs.length > 0 && (
            <span className="text-[11px] font-mono font-bold text-muted-foreground">
              <span className="text-foreground/85">{stats.rootMocs.length}</span> 메인
              {stats.subMocIds.size > 0 && (
                <span className="ml-1 text-muted-foreground/70">+ {stats.subMocIds.size} 하위</span>
              )}
            </span>
          )}
        </div>

        {stats.mocs.length === 0 ? (
          <EmptyMocCard
            topTags={stats.topTags}
            onCreate={onCreateMainDoc ?? onCreate}
            onMakeFromTag={onMakeMocFromTag}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {/* root 먼저, sub 뒤 */}
            {stats.rootMocs.map((p) => (
              <MainDocCard
                key={p.id}
                page={p}
                isRoot
                isFav={favSet.has(p.id)}
                childCount={(stats.rootMocChildren.get(p.id)?.mocs.length ?? 0)
                          + (stats.rootMocChildren.get(p.id)?.pages.length ?? 0)}
                onSelect={onSelect}
              />
            ))}
            {stats.mocs.filter((m) => stats.subMocIds.has(m.id)).map((p) => (
              <MainDocCard
                key={p.id}
                page={p}
                isRoot={false}
                isFav={favSet.has(p.id)}
                childCount={countLinkedPages(p, pages)}
                onSelect={onSelect}
              />
            ))}
            {/* + 새 메인 문서 — 템플릿 픽커 X, 바로 type='moc' 생성·진입 */}
            <button
              type="button"
              onClick={() => (onCreateMainDoc ?? onCreate)()}
              className="group flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[hsl(var(--hairline))] text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 wiki-trans-base text-[11px] font-medium px-3 py-3 min-h-[120px]"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 wiki-trans-base" />
              새 메인 문서
            </button>
          </div>
        )}
      </section>

      {/* 5 카드 그리드 — 최근/초안/연결/만들/잠자 */}
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

        {/* 연결 안 된 페이지 */}
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

        {/* 잠자 (Stale) */}
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

/* ── 본문 [[링크]] 중 존재하는 페이지 카운트 ── */
function countLinkedPages(page: WikiPage, allPages: WikiPage[]): number {
  const titleSet = new Set<string>();
  for (const p of allPages) {
    titleSet.add(p.title.toLowerCase());
    for (const a of p.aliases) titleSet.add(a.toLowerCase());
  }
  let n = 0;
  for (const t of extractWikiLinks(page.body)) {
    if (titleSet.has(t.toLowerCase())) n++;
  }
  return n;
}

/* ── 메인 문서 카드 (compact, 4-col 그리드용) ── */
function MainDocCard({
  page, isRoot, isFav, childCount, onSelect,
}: {
  page: WikiPage;
  isRoot: boolean;
  isFav: boolean;
  childCount: number;
  onSelect: (id: string) => void;
}) {
  const preview = page.body.replace(/^[#>\s\n]+/g, '').replace(/\n+/g, ' ').slice(0, 50);
  return (
    <button
      type="button"
      onClick={() => onSelect(page.id)}
      className={cn(
        'group relative flex flex-col text-left rounded-xl border bg-card hover:shadow-md wiki-trans-base overflow-hidden min-h-[120px] pl-4 pr-3 py-3',
        isRoot
          ? 'border-[hsl(var(--hairline))] hover:border-primary/50'
          : 'border-[hsl(var(--hairline))] hover:border-primary/40 bg-muted/20',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute left-0 top-0 bottom-0 w-[4px] wiki-trans-color',
          isRoot ? 'bg-primary group-hover:bg-primary' : 'bg-primary/30 group-hover:bg-primary/60',
        )}
      />
      <div className="flex items-center gap-1 mb-1">
        <span
          className={cn(
            'inline-flex items-center gap-0.5 px-1 h-[15px] rounded text-[8.5px] font-mono font-bold uppercase tracking-wider',
            isRoot ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground/80',
          )}
        >
          {isRoot ? '메인' : '하위'}
        </span>
        {isFav && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />}
        <span className="ml-auto text-[9.5px] font-mono text-muted-foreground/80">
          <span className="font-bold text-foreground/85">{childCount}</span>
        </span>
      </div>
      <h3
        className="text-[14.5px] font-bold text-foreground leading-snug mb-1 line-clamp-2 group-hover:text-primary wiki-trans-color"
        style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif', letterSpacing: '-0.005em' }}
      >
        {page.title}
      </h3>
      {preview && (
        <p className="text-[10.5px] text-muted-foreground/85 line-clamp-2 leading-relaxed mt-auto">
          {preview}
        </p>
      )}
    </button>
  );
}

/* ── 메인 문서 빈 상태 — 인기 태그로 자동 생성 CTA ── */
function EmptyMocCard({
  topTags, onCreate, onMakeFromTag,
}: {
  topTags: Array<[string, number]>;
  onCreate: () => void;
  onMakeFromTag?: (tag: string) => void;
}) {
  return (
    <div className="relative rounded-xl border-2 border-dashed border-[hsl(var(--wiki-hairline-strong))] bg-gradient-to-b from-card to-muted/20 px-6 py-6 text-center">
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary/30 rounded-l-xl" />
      <BookOpen className="w-7 h-7 text-primary/60 mx-auto mb-2.5" strokeWidth={1.5} />
      <p
        className="text-[15px] font-bold text-foreground mb-1.5"
        style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
      >
        아직 메인 문서가 없어요
      </p>
      <p className="text-[11.5px] text-muted-foreground leading-relaxed mb-4 max-w-md mx-auto">
        메인 문서는 비슷한 페이지를 모아 <em className="not-italic font-semibold text-foreground/80">길찾기 허브</em> 역할을 해요.<br />
        50페이지 넘어가면 검색만으론 부족해서 — 진입점이 필요해져요.
      </p>
      {onMakeFromTag && topTags.length > 0 && (
        <>
          <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground/70 mb-1.5">
            태그로 자동 만들기
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 mb-4">
            {topTags.slice(0, 4).map(([tag, n]) => (
              <button
                key={tag}
                type="button"
                onClick={() => onMakeFromTag(tag)}
                className="group inline-flex items-center gap-1 px-2.5 h-7 rounded-md bg-primary/10 text-primary text-[11.5px] font-semibold hover:bg-primary hover:text-primary-foreground wiki-trans-base hover:shadow-sm"
                title={`#${tag} 태그를 가진 ${n}개 페이지로 메인 문서 자동 생성`}
              >
                <Plus className="w-2.5 h-2.5" />
                <span>#{tag}</span>
                <span className="text-[10px] font-mono opacity-70 group-hover:opacity-90">{n}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
      >
        <Plus className="w-3 h-3" /> 빈 메인 문서 직접 만들기
      </button>
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
