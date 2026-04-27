import { useMemo, useState } from 'react';
import { Plus, Sparkles, ArrowRight, Star, Clock, FileText, Link2, Sprout, Moon, BookOpen } from 'lucide-react';
import { type WikiPage, WIKI_TYPE_META, extractWikiLinks } from '@/types/wiki';
import { STARTER_PACKS, type StarterPack } from '@/lib/wikiStarterPacks';
import { cn } from '@/lib/utils';

interface Props {
  pages: WikiPage[];
  /** 즐겨찾기 페이지 id 모음 */
  favorites?: string[];
  /** 최근 본 페이지 id 모음 (최신순) */
  recent?: string[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  /** 스타터 팩 선택 시 — Wiki 페이지가 IDB upsert + activeId 설정 */
  onPickStarterPack?: (pack: StarterPack) => void | Promise<void>;
  /** Wanted 링크 클릭 시 — 그 제목으로 새 draft 페이지 생성 + 진입 */
  onCreateMissing?: (title: string) => void;
  /** 인기 태그로 목차 생성 — Wiki 페이지가 type='moc' 페이지 새로 생성 + 진입 */
  onMakeMocFromTag?: (tag: string) => void;
}

/** 30일 — 페이지 잠자는 임계 */
const STALE_DAYS = 30;
const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;

type QueueTab = 'inbox' | 'wanted' | 'orphan' | 'stale';

export function WikiHome({
  pages, favorites = [], recent = [],
  onSelect, onCreate, onPickStarterPack, onCreateMissing, onMakeMocFromTag,
}: Props) {
  const [tab, setTab] = useState<QueueTab>('inbox');

  const stats = useMemo(() => {
    const byStatus = { draft: 0, active: 0, stable: 0, archived: 0 };
    for (const p of pages) byStatus[p.status]++;

    // 활동 N건 = 7일내 수정 페이지
    const sevenDays = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentEdits = pages.filter((p) => p.updatedAt > sevenDays).length;

    const inbox = pages.filter((p) => p.status === 'draft').slice(0, 8);
    const mocs = pages.filter((p) => p.type === 'moc');

    // 연결 안 된 페이지 = refersTo 도 cites 도 비어있고, 아무도 참조하지 않는 페이지
    const referencedIds = new Set<string>();
    for (const p of pages) {
      for (const r of [...p.refersTo, ...p.cites]) referencedIds.add(r);
    }
    const orphans = pages.filter(
      (p) => p.refersTo.length === 0 && p.cites.length === 0 && !referencedIds.has(p.id)
    );

    // 태그 빈도
    const tagCount = new Map<string, number>();
    for (const p of pages) for (const t of p.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    const topTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

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
    const wanted = [...wantedCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    // 잠자는 페이지 — status='active' 인데 30일 미수정
    const cutoff = Date.now() - STALE_MS;
    const stale = pages
      .filter((p) => p.status === 'active' && p.updatedAt < cutoff)
      .slice(0, 8);

    return { byStatus, recentEdits, inbox, mocs, orphans, topTags, wanted, stale };
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

  /* ── 자주 보는 곳: 즐겨찾기 → 최근 (즐겨찾기 우선, 중복 제거, 최대 8개) ── */
  const pageById = new Map(pages.map((p) => [p.id, p]));
  const quickIds: string[] = [];
  const seen = new Set<string>();
  for (const id of favorites) {
    if (pageById.has(id) && !seen.has(id)) { quickIds.push(id); seen.add(id); }
  }
  for (const id of recent) {
    if (pageById.has(id) && !seen.has(id)) { quickIds.push(id); seen.add(id); }
    if (quickIds.length >= 8) break;
  }
  const favSet = new Set(favorites);

  const totalQueue = stats.inbox.length + stats.wanted.length + stats.orphans.length + stats.stale.length;

  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-8 py-7">
      {/* 헤더 — 한 줄로 통합 */}
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-1">
            MY WIKI · HOME
          </p>
          <h1 className="text-2xl font-bold text-foreground">대문</h1>
        </div>
        <p className="text-[11px] text-muted-foreground pb-1">
          <span className="font-semibold text-foreground/90">{pages.length}</span> 페이지
          {' · '}
          <span>활동 {stats.recentEdits}건</span>
          {totalQueue > 0 && (
            <>
              {' · '}
              <span className="text-primary">정리 큐 {totalQueue}</span>
            </>
          )}
        </p>
      </header>

      {/* 1. 자주 보는 곳 — 즐겨찾기 + 최근 통합 (있을 때만) */}
      {quickIds.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-2">
            🌟 자주 보는 곳
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {quickIds.map((id) => {
              const p = pageById.get(id)!;
              const meta = WIKI_TYPE_META[p.type];
              const isFav = favSet.has(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelect(id)}
                  className="group inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md border border-[hsl(var(--hairline))] bg-card hover:border-primary/40 hover:bg-primary/5 wiki-trans-color text-left"
                >
                  {isFav ? (
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                  ) : (
                    <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-[14px] leading-none shrink-0" aria-hidden>{meta.icon}</span>
                  <span className="text-[12px] truncate max-w-[180px] text-foreground/85 group-hover:text-foreground">
                    {p.title}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. 목차 (MOC) — 메인 영역 */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground inline-flex items-center gap-1.5">
            <BookOpen className="w-3 h-3" />
            목차 — 주제별 묶음
          </h2>
          {stats.mocs.length > 0 && (
            <span className="text-[10.5px] text-muted-foreground">{stats.mocs.length}개</span>
          )}
        </div>

        {stats.mocs.length === 0 ? (
          <EmptyMocCard
            topTags={stats.topTags}
            onCreate={onCreate}
            onMakeFromTag={onMakeMocFromTag}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats.mocs.map((p) => (
              <MocCard key={p.id} page={p} pages={pages} isFav={favSet.has(p.id)} onSelect={onSelect} />
            ))}
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[hsl(var(--hairline))] text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 wiki-trans-color text-[12px] font-medium px-4 py-3"
            >
              <Plus className="w-3.5 h-3.5" /> 새 목차
            </button>
          </div>
        )}
      </section>

      {/* 3. 정리 큐 — 4종 통합 탭 카드 */}
      <section className="mb-6">
        <h2 className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-2.5 inline-flex items-center gap-1.5">
          🛠 정리 큐
          {totalQueue > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary/15 text-primary text-[10px] font-mono font-bold">
              {totalQueue}
            </span>
          )}
        </h2>
        <div className="rounded-xl border border-[hsl(var(--hairline))] bg-card overflow-hidden">
          {/* 탭 헤더 */}
          <div className="grid grid-cols-4 border-b border-[hsl(var(--hairline))]">
            <QueueTab
              active={tab === 'inbox'}
              icon={<FileText className="w-3 h-3" />}
              label="초안"
              count={stats.inbox.length}
              onClick={() => setTab('inbox')}
            />
            <QueueTab
              active={tab === 'wanted'}
              icon={<Link2 className="w-3 h-3" />}
              label="만들"
              count={stats.wanted.length}
              onClick={() => setTab('wanted')}
            />
            <QueueTab
              active={tab === 'orphan'}
              icon={<Sprout className="w-3 h-3" />}
              label="연결"
              count={stats.orphans.length}
              onClick={() => setTab('orphan')}
            />
            <QueueTab
              active={tab === 'stale'}
              icon={<Moon className="w-3 h-3" />}
              label="잠자"
              count={stats.stale.length}
              onClick={() => setTab('stale')}
            />
          </div>
          {/* 탭 본문 */}
          <div className="p-2">
            {totalQueue === 0 ? (
              <p className="text-center text-[12px] text-muted-foreground py-4">
                🎉 깔끔해요 — 정리할 게 없어요
              </p>
            ) : tab === 'inbox' ? (
              <QueueList
                items={stats.inbox}
                empty="초안이 정리됐어요 ✓"
                onSelect={onSelect}
              />
            ) : tab === 'wanted' ? (
              <ul className="space-y-0.5">
                {stats.wanted.length === 0 ? (
                  <p className="text-center text-[11.5px] text-muted-foreground/70 py-3">
                    모든 위키링크가 충족됐어요 ✓
                  </p>
                ) : stats.wanted.map(([title, n]) => (
                  <li key={title}>
                    <button
                      type="button"
                      onClick={() => onCreateMissing?.(title)}
                      disabled={!onCreateMissing}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-accent transition-colors disabled:opacity-60"
                      title={`${n}개 페이지에서 가리킴 — 클릭하면 생성`}
                    >
                      <Link2 className="w-3 h-3 text-rose-500 shrink-0" />
                      <span className="flex-1 min-w-0 truncate text-[12.5px] text-foreground/90">{title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">×{n}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : tab === 'orphan' ? (
              <QueueList
                items={stats.orphans.slice(0, 8)}
                empty="모든 페이지가 연결됐어요 ✓"
                onSelect={onSelect}
              />
            ) : (
              <QueueList
                items={stats.stale}
                empty="모든 페이지가 신선해요 ✓"
                onSelect={onSelect}
              />
            )}
          </div>
        </div>
      </section>

      {/* 빠른 액션 */}
      <div className="flex items-center gap-2">
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

/* ── 목차 카드 ── */
function MocCard({
  page, pages, isFav, onSelect,
}: {
  page: WikiPage; pages: WikiPage[]; isFav: boolean; onSelect: (id: string) => void;
}) {
  // 본문 첫 줄 (헤딩/quote 제거)
  const preview = page.body.replace(/^[#>\s\n]+/g, '').replace(/\n+/g, ' ').slice(0, 80);
  // 본문에서 [[링크]] 카운트 — 이 목차가 묶고 있는 페이지 수
  const links = useMemo(() => extractWikiLinks(page.body), [page.body]);
  const titleSet = useMemo(() => {
    const s = new Set<string>();
    for (const p of pages) {
      s.add(p.title.toLowerCase());
      for (const a of p.aliases) s.add(a.toLowerCase());
    }
    return s;
  }, [pages]);
  const linkedCount = links.filter((l) => titleSet.has(l.toLowerCase())).length;

  return (
    <button
      type="button"
      onClick={() => onSelect(page.id)}
      className="group flex flex-col gap-1.5 text-left rounded-xl border border-[hsl(var(--hairline))] bg-card hover:border-primary/40 hover:bg-primary/5 wiki-trans-color px-4 py-3"
    >
      <div className="flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-[13.5px] font-bold text-foreground truncate flex-1">{page.title}</span>
        {isFav && <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />}
      </div>
      {preview && (
        <p className="text-[11.5px] text-muted-foreground line-clamp-2 leading-relaxed">{preview}</p>
      )}
      <p className="text-[10.5px] text-muted-foreground/80 inline-flex items-center gap-1">
        <Link2 className="w-2.5 h-2.5" />
        {linkedCount > 0 ? `${linkedCount}개 페이지 묶음` : '아직 페이지 안 묶임'}
      </p>
    </button>
  );
}

/* ── 목차 빈 상태 — 인기 태그로 자동 생성 CTA ── */
function EmptyMocCard({
  topTags, onCreate, onMakeFromTag,
}: {
  topTags: Array<[string, number]>;
  onCreate: () => void;
  onMakeFromTag?: (tag: string) => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[hsl(var(--hairline))] bg-card px-5 py-5 text-center">
      <BookOpen className="w-6 h-6 text-muted-foreground/60 mx-auto mb-2" />
      <p className="text-[13px] font-bold text-foreground mb-1">아직 목차가 없어요</p>
      <p className="text-[11.5px] text-muted-foreground leading-relaxed mb-3 max-w-md mx-auto">
        목차는 비슷한 페이지를 모아 *길찾기* 역할을 해요.<br />
        50페이지 넘어가면 검색만으론 부족해서 — 진입점이 필요해져요.
      </p>
      {onMakeFromTag && topTags.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 mb-3">
          {topTags.slice(0, 4).map(([tag, n]) => (
            <button
              key={tag}
              type="button"
              onClick={() => onMakeFromTag(tag)}
              className="inline-flex items-center gap-1 px-2.5 h-6 rounded-md bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/15 wiki-trans-color"
              title={`#${tag} 태그를 가진 ${n}개 페이지로 목차 자동 생성`}
            >
              <Plus className="w-2.5 h-2.5" />
              <span>#{tag}</span>
              <span className="text-[10px] text-primary/70">{n}</span>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
      >
        <Plus className="w-3 h-3" /> 빈 목차 직접 만들기
      </button>
    </div>
  );
}

/* ── 정리 큐 탭 ── */
function QueueTab({
  active, icon, label, count, onClick,
}: {
  active: boolean; icon: React.ReactNode; label: string; count: number; onClick: () => void;
}) {
  const dim = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center justify-center gap-1.5 px-2 py-2 text-[11.5px] wiki-trans-color',
        active
          ? 'bg-primary/10 text-primary font-semibold'
          : dim
            ? 'text-muted-foreground/50 hover:bg-accent/40 hover:text-muted-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {icon}
      <span>{label}</span>
      <span className={cn(
        'inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9.5px] font-mono font-bold',
        active ? 'bg-primary text-primary-foreground' : dim ? 'bg-muted text-muted-foreground/70' : 'bg-accent text-foreground/70',
      )}>
        {count}
      </span>
      {active && <span className="absolute bottom-0 left-2 right-2 h-px bg-primary" aria-hidden />}
    </button>
  );
}

/* ── 정리 큐 — 페이지 리스트 ── */
function QueueList({
  items, empty, onSelect,
}: {
  items: WikiPage[]; empty: string; onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="text-center text-[11.5px] text-muted-foreground/70 py-3">{empty}</p>;
  }
  return (
    <ul className="space-y-0.5">
      {items.map((p) => {
        const meta = WIKI_TYPE_META[p.type];
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSelect(p.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-accent transition-colors"
            >
              <span className="text-[14px] leading-none shrink-0" aria-hidden>{meta.icon}</span>
              <span className="flex-1 min-w-0 truncate text-[12.5px] text-foreground/90">{p.title}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
