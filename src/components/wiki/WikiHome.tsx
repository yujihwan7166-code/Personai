import { useMemo, useState } from 'react';
import { Plus, Sparkles, ArrowRight, BookOpen, Star } from 'lucide-react';
import { type WikiPage, WIKI_TYPE_META, WIKI_STATUS_META, extractWikiLinks, isMainDoc } from '@/types/wiki';
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
    // 카드 그리드용 — 모든 메인(index 제외)을 평등하게 노출.
    // 인물 위키처럼 메인끼리 서로 cross-ref 해서 root 가 비거나, index 만 root
    // 인 경우에도 메인 6-8개가 한눈에 보이도록.
    const mainCards = mocs.filter((m) => m.type !== 'index').slice(0, 8);
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

    // 일반 문서 = 메인 문서 아닌 페이지 (대문 'index' 도 메인성이라 제외)
    const regulars = pages.filter((p) => !isMainDoc(p) && p.type !== 'index');

    // 메인 문서의 *직접 부모* 매핑 (sub-main → 그 sub 를 가리키는 메인들)
    const mainToParents = new Map<string, WikiPage[]>();
    for (const main of mocs) {
      for (const t of extractWikiLinks(main.body)) {
        const target = byTitle.get(t.toLowerCase());
        if (!target || !isMainDoc(target) || target.id === main.id) continue;
        if (!mainToParents.has(target.id)) mainToParents.set(target.id, []);
        const list = mainToParents.get(target.id)!;
        if (!list.some((m) => m.id === main.id)) list.push(main);
      }
    }
    // 메인 → root 메인 (BFS — sub-main 은 그 부모까지 계속 거슬러)
    function rootsOf(mainId: string): WikiPage[] {
      const seen = new Set<string>([mainId]);
      const out = new Set<WikiPage>();
      const queue: string[] = [mainId];
      while (queue.length) {
        const cur = queue.shift()!;
        const parents = mainToParents.get(cur) ?? [];
        if (parents.length === 0) {
          // root 발견
          const m = mocs.find((mm) => mm.id === cur);
          if (m) out.add(m);
        } else {
          for (const p of parents) {
            if (!seen.has(p.id)) { seen.add(p.id); queue.push(p.id); }
          }
        }
      }
      return [...out];
    }

    // 일반 문서 → 직접 부모 메인 → 그 메인의 root 메인까지 transitive 매핑
    const regularToRoots = new Map<string, WikiPage[]>();
    for (const main of mocs) {
      const rootsForThisMain = rootsOf(main.id);
      for (const t of extractWikiLinks(main.body)) {
        const target = byTitle.get(t.toLowerCase());
        if (!target) continue;
        if (isMainDoc(target)) continue; // 다른 메인은 따로 처리
        if (target.type === 'index') continue;
        if (!regularToRoots.has(target.id)) regularToRoots.set(target.id, []);
        const list = regularToRoots.get(target.id)!;
        for (const root of rootsForThisMain) {
          if (!list.some((m) => m.id === root.id)) list.push(root);
        }
      }
    }

    // ── 역링크 (backlinks) — 어떤 페이지가 누구한테 링크되는지 ──
    // body 위키링크 + refersTo/cites/inherits/similarTo 4종 모두 합산
    const byId = new Map(pages.map((p) => [p.id, p]));
    const backlinks = new Map<string, Set<string>>(); // targetId → linker pageIds

    function addBacklink(targetId: string, linkerId: string) {
      if (targetId === linkerId) return; // self-reference 무시
      if (!backlinks.has(targetId)) backlinks.set(targetId, new Set());
      backlinks.get(targetId)!.add(linkerId);
    }

    for (const p of pages) {
      // 1) 본문 [[위키링크]] / ##wiki:id 링크
      for (const link of extractWikiLinks(p.body)) {
        let target: WikiPage | undefined;
        if (byId.has(link)) target = byId.get(link);
        else target = byTitle.get(link.toLowerCase());
        if (target) addBacklink(target.id, p.id);
      }
      // 2) 명시적 4종 관계 (id 배열)
      for (const arr of [p.refersTo, p.cites, p.inherits, p.similarTo]) {
        for (const id of arr) {
          if (byId.has(id)) addBacklink(id, p.id);
        }
      }
    }

    // 위키 정체성 표시용 — 'index' 페이지가 있으면 그 title 을 헤더에 활용
    const indexPage = pages.find((p) => p.type === 'index');

    return { byStatus, recentEdits, recent, inbox, mocs, rootMocs, mainCards, rootMocChildren, subMocIds, orphans, topTags, wanted, stale, regulars, regularToRoots, backlinks, byId, indexPage };
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
            {stats.indexPage ? stats.indexPage.title : '대문'}
          </h1>
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
          {stats.mainCards.length > 0 && (
            <span className="text-[11px] font-mono font-bold text-muted-foreground">
              <span className="text-foreground/85">{stats.mainCards.length}</span> 메인
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
          <>
            {/* 메인 문서 카드 그리드 — index 만 root 인 경우 sub-mocs 노출 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {stats.mainCards.map((p) => (
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
              {/* + 새 메인 문서 */}
              <button
                type="button"
                onClick={() => (onCreateMainDoc ?? onCreate)()}
                className="group flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[hsl(var(--hairline))] text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 wiki-trans-base text-[11px] font-medium px-3 py-3 min-h-[140px]"
              >
                <Plus className="w-4 h-4 group-hover:scale-110 wiki-trans-base" />
                새 메인 문서
              </button>
            </div>
          </>
        )}
      </section>

      {/* 📄 일반 문서 — root 메인 카테고리 필터 + 링크됨/미연결 분리 */}
      {stats.regulars.length > 0 && (
        <RegularDocsSection
          pages={stats.regulars}
          rootMocs={stats.rootMocs}
          regularToRoots={stats.regularToRoots}
          backlinks={stats.backlinks}
          byId={stats.byId}
          onSelect={onSelect}
        />
      )}

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

/* ── 일반 문서 섹션 — 메인 문서 카테고리 + 링크됨 + 미연결 ── */
type MainFilter = 'all' | 'orphan' | 'linked' | string; // string = main page id

function RegularDocsSection({
  pages, rootMocs, regularToRoots, backlinks, byId, onSelect,
}: {
  pages: WikiPage[];
  rootMocs: WikiPage[];
  regularToRoots: Map<string, WikiPage[]>;
  backlinks: Map<string, Set<string>>;
  byId: Map<string, WikiPage>;
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState<MainFilter>('all');
  const [expanded, setExpanded] = useState(false);

  // 헬퍼 — MOC 자식 / 링크됨 / 미연결
  const isMocChild = (p: WikiPage) => (regularToRoots.get(p.id)?.length ?? 0) > 0;
  const linkerIdsOf = (p: WikiPage): string[] => {
    const s = backlinks.get(p.id);
    return s ? [...s] : [];
  };

  // root 메인만 칩으로 노출 (자식 일반 문서가 1개 이상)
  const rootsWithChildren = useMemo(() => {
    const out: Array<{ main: WikiPage; count: number }> = [];
    for (const m of rootMocs) {
      let n = 0;
      for (const p of pages) {
        if (regularToRoots.get(p.id)?.some((parent) => parent.id === m.id)) n++;
      }
      if (n > 0) out.push({ main: m, count: n });
    }
    return out.sort((a, b) => b.count - a.count || a.main.title.localeCompare(b.main.title));
  }, [rootMocs, pages, regularToRoots]);

  // 링크됨 = MOC 자식 아님 + 다른 페이지로부터 링크 받음
  const linkedCount = useMemo(() =>
    pages.filter((p) => !isMocChild(p) && linkerIdsOf(p).length > 0).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pages, regularToRoots, backlinks]);

  // 미연결 = MOC 자식 아님 + 어떤 페이지로부터도 링크 받지 않음 (진짜 독립)
  const orphanCount = useMemo(() =>
    pages.filter((p) => !isMocChild(p) && linkerIdsOf(p).length === 0).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pages, regularToRoots, backlinks]);

  const filtered = useMemo(() => {
    if (filter === 'all') return pages;
    if (filter === 'linked') return pages.filter((p) => !isMocChild(p) && linkerIdsOf(p).length > 0);
    if (filter === 'orphan') return pages.filter((p) => !isMocChild(p) && linkerIdsOf(p).length === 0);
    return pages.filter((p) => regularToRoots.get(p.id)?.some((m) => m.id === filter));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, filter, regularToRoots, backlinks]);

  const COLLAPSED = 12;
  const visible = expanded ? filtered : filtered.slice(0, COLLAPSED);
  const hidden = filtered.length - visible.length;

  const activeLabel = useMemo(() => {
    if (filter === 'all') return null;
    if (filter === 'linked') return '링크됨';
    if (filter === 'orphan') return '미연결';
    return rootMocs.find((m) => m.id === filter)?.title ?? null;
  }, [filter, rootMocs]);

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-2.5">
        <span aria-hidden className="text-[14px]">📄</span>
        <h2
          className="text-[15px] font-bold text-foreground"
          style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
        >
          일반 문서
        </h2>
        <span className="text-[10.5px] text-muted-foreground/80">
          {activeLabel ? `— in ${activeLabel}` : '— 메인이 아닌 페이지'}
        </span>
        <span aria-hidden className="flex-1 h-px bg-[hsl(var(--hairline))]" />
        <span className="text-[11px] font-mono font-bold text-muted-foreground">
          <span className="text-foreground/85">{filtered.length}</span>
          {filter !== 'all' && pages.length !== filtered.length && (
            <span className="text-muted-foreground/60"> / {pages.length}</span>
          )}
        </span>
      </div>

      {/* 카테고리 칩 — root 메인 + 링크됨 + 미연결 */}
      {(rootsWithChildren.length > 0 || linkedCount > 0 || orphanCount > 0) && (
        <div className="flex flex-wrap items-center gap-1 mb-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'inline-flex items-center gap-1 px-2 h-6 rounded-md text-[10.5px] wiki-trans-color',
              filter === 'all'
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            전체 <span className="font-mono opacity-70">{pages.length}</span>
          </button>
          {rootsWithChildren.map(({ main, count }) => {
            const active = filter === main.id;
            return (
              <button
                key={main.id}
                type="button"
                onClick={() => setFilter(main.id)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 h-6 rounded-md text-[10.5px] wiki-trans-color max-w-[200px]',
                  active
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
                title={`${main.title} 우산 아래 모든 일반 문서 (sub 포함 transitive)`}
              >
                <BookOpen className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{main.title}</span>
                <span className="text-[9.5px] font-mono opacity-70 shrink-0">{count}</span>
              </button>
            );
          })}
          {linkedCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter('linked')}
              className={cn(
                'inline-flex items-center gap-1 px-2 h-6 rounded-md text-[10.5px] wiki-trans-color',
                filter === 'linked'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              title="메인 문서 자식은 아니지만 다른 페이지에서 링크되는 일반 문서"
            >
              🔗 링크됨 <span className="font-mono opacity-70">{linkedCount}</span>
            </button>
          )}
          {orphanCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter('orphan')}
              className={cn(
                'inline-flex items-center gap-1 px-2 h-6 rounded-md text-[10.5px] wiki-trans-color',
                filter === 'orphan'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              title="어떤 페이지로부터도 링크되지 않는 미연결 페이지 (정리 우선순위)"
            >
              🌱 미연결 <span className="font-mono opacity-70">{orphanCount}</span>
            </button>
          )}
        </div>
      )}

      {/* 리스트 — 2 col 그리드 */}
      <div className="rounded-xl border border-[hsl(var(--hairline))] bg-card p-2">
        {filtered.length === 0 ? (
          <p className="text-[11.5px] text-muted-foreground/70 py-3 text-center">
            해당 카테고리의 일반 문서가 없어요
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
            {visible.map((p) => {
              const m = WIKI_TYPE_META[p.type];
              const sMeta = WIKI_STATUS_META[p.status];
              const parents = regularToRoots.get(p.id) ?? [];
              const linkers = (() => {
                const s = backlinks.get(p.id);
                if (!s) return [] as WikiPage[];
                return [...s].map((id) => byId.get(id)).filter(Boolean) as WikiPage[];
              })();
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(p.id)}
                    className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-left hover:bg-accent wiki-trans-color"
                  >
                    <span className="text-[13px] leading-none shrink-0" aria-hidden>{m.icon}</span>
                    <span className="flex-1 min-w-0 truncate text-[12.5px] text-foreground/90">{p.title}</span>
                    {/* 라벨 — MOC 자식 / 링크됨 / 미연결 (in 'all' 필터일 때만 노출) */}
                    {filter === 'all' && parents.length > 0 && (
                      <span className="shrink-0 text-[10px] text-muted-foreground/70 truncate max-w-[100px]" title={parents.map((m) => m.title).join(', ')}>
                        in {parents.map((m) => m.title).join(', ')}
                      </span>
                    )}
                    {filter === 'all' && parents.length === 0 && linkers.length > 0 && (
                      <span
                        className="shrink-0 text-[10px] text-muted-foreground/70 truncate max-w-[120px]"
                        title={`다음 페이지에서 링크: ${linkers.map((l) => l.title).join(', ')}`}
                      >
                        🔗 {linkers.length === 1 ? linkers[0].title : `${linkers.length}개에서`}
                      </span>
                    )}
                    {filter === 'all' && parents.length === 0 && linkers.length === 0 && (
                      <span className="shrink-0 text-[10px] text-amber-600/80" title="어떤 페이지로부터도 링크되지 않음">🌱 미연결</span>
                    )}
                    {/* 'linked' 필터에서만: 어디서 링크되는지 노출 */}
                    {filter === 'linked' && linkers.length > 0 && (
                      <span
                        className="shrink-0 text-[10px] text-muted-foreground/70 truncate max-w-[140px]"
                        title={linkers.map((l) => l.title).join(', ')}
                      >
                        ← {linkers.length === 1 ? linkers[0].title : `${linkers[0].title} 외 ${linkers.length - 1}`}
                      </span>
                    )}
                    {p.status !== 'stable' && (
                      <span
                        className="shrink-0 text-[8.5px] px-1 py-0.5 rounded font-medium uppercase tracking-wider"
                        style={{ backgroundColor: `${sMeta.tint}22`, color: sMeta.tint }}
                      >
                        {sMeta.label}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {/* 더 보기 토글 */}
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full mt-1 px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent rounded-md wiki-trans-color"
          >
            + {hidden}개 더 보기
          </button>
        )}
        {expanded && filtered.length > COLLAPSED && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="w-full mt-1 px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent rounded-md wiki-trans-color"
          >
            접기
          </button>
        )}
      </div>
    </section>
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

/* ── 본문 미리보기 — markdown 부호 제거 ── */
function cleanPreview(body: string): string {
  return body
    .replace(/^---[\s\S]*?^---/m, '')          // frontmatter
    .replace(/^\s*#+\s.*$/gm, '')              // 헤딩 줄 통째 제거
    .replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, '$2$1') // wikilink → 표시명만
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')      // 이미지
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // 일반 링크
    .replace(/[*_`>~]/g, '')                   // markdown 부호
    .replace(/^[\s\-•]+/gm, '')                // 리스트 표시
    .replace(/\s+/g, ' ')
    .trim();
}

/* ── 메인 문서 카드 — 책 카드 톤 (좌띠/배지 X, 타이포 위주) ── */
function MainDocCard({
  page, isRoot, isFav, childCount, onSelect,
}: {
  page: WikiPage;
  isRoot: boolean;
  isFav: boolean;
  childCount: number;
  onSelect: (id: string) => void;
}) {
  const preview = cleanPreview(page.body).slice(0, 90);
  return (
    <button
      type="button"
      onClick={() => onSelect(page.id)}
      className={cn(
        'group relative flex flex-col text-left rounded-lg border bg-card hover:bg-card hover:shadow-[0_4px_16px_-6px_hsl(var(--foreground)/0.12)] hover:border-primary/40 wiki-trans-base overflow-hidden min-h-[140px] px-4 pt-3.5 pb-3',
        'border-[hsl(var(--hairline))]',
      )}
    >
      {/* 상단 — 즐겨찾기·하위 표시 있을 때만 (디폴트 📖 제거 → 제목이 주인공) */}
      {(isFav || !isRoot) && (
        <div className="flex items-center gap-1.5 mb-2">
          {isFav && <Star className="w-3 h-3 fill-amber-400 text-amber-500 shrink-0" />}
          {!isRoot && (
            <span className="text-[9px] font-mono uppercase tracking-[0.16em] text-muted-foreground/70">
              하위
            </span>
          )}
        </div>
      )}

      {/* 제목 — 책 톤 */}
      <h3
        className="text-[15.5px] font-bold text-foreground leading-snug mb-1.5 line-clamp-2 group-hover:text-primary wiki-trans-color"
        style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif', letterSpacing: '-0.005em' }}
      >
        {page.title}
      </h3>

      {/* 미리보기 — markdown 부호 다 제거 */}
      <p className="text-[11px] text-muted-foreground/80 line-clamp-2 leading-relaxed mb-auto">
        {preview || <span className="italic opacity-60">아직 본문이 비어있어요</span>}
      </p>

      {/* 푸터 — 카운트 + 화살표 */}
      <div className="mt-3 pt-2 border-t border-[hsl(var(--hairline))] flex items-center justify-between">
        <span className="text-[10.5px] font-mono text-muted-foreground">
          <span className="font-bold text-foreground/90">{childCount}</span>
          <span className="text-muted-foreground/60"> pages</span>
        </span>
        <ArrowRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 wiki-trans-base" />
      </div>
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
