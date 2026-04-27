import { useMemo, useState } from 'react';
import { Plus, Sparkles, ArrowRight, Star, FileText, Link2, Sprout, Moon, BookOpen, Play, Shuffle, RotateCw, TrendingUp } from 'lucide-react';
import { type WikiPage, WIKI_TYPE_META, WIKI_STATUS_META, extractWikiLinks } from '@/types/wiki';
import { STARTER_PACKS, type StarterPack } from '@/lib/wikiStarterPacks';
import { cn } from '@/lib/utils';

interface Props {
  pages: WikiPage[];
  /** 즐겨찾기 페이지 id 모음 — 목차 카드 ⭐ 표시용 */
  favorites?: string[];
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
  pages, favorites = [],
  onSelect, onCreate, onPickStarterPack, onCreateMissing, onMakeMocFromTag,
}: Props) {
  const [tab, setTab] = useState<QueueTab>('inbox');
  const [randomSeed, setRandomSeed] = useState(0);
  const randomPage = useMemo(() => {
    if (pages.length <= 1) return null;
    const candidates = pages.filter((p) => p.id !== (pages[0]?.id ?? ''));
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages, randomSeed]);

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

    // 가장 최근 편집 페이지 (대문 '이어쓰기' 카드)
    const lastEdited = pages.length > 0 ? pages[0] : null;

    // 7일 일별 편집 차트 — 오늘 포함 7일
    const day = 24 * 60 * 60 * 1000;
    const today0 = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); })();
    const buckets = Array.from({ length: 7 }, (_, i) => ({
      ts: today0 - (6 - i) * day,
      count: 0,
    }));
    for (const p of pages) {
      const idx = Math.floor((p.updatedAt - (today0 - 6 * day)) / day);
      if (idx >= 0 && idx < 7) buckets[idx].count++;
    }
    const weekChart = buckets;
    const weekTotal = buckets.reduce((a, b) => a + b.count, 0);
    // 신규 = 만든 날짜가 7일 이내
    const weekNew = pages.filter((p) => p.createdAt > today0 - 6 * day).length;

    return { byStatus, recentEdits, inbox, mocs, orphans, topTags, wanted, stale, lastEdited, weekChart, weekTotal, weekNew };
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

  const favSet = new Set(favorites);

  const totalQueue = stats.inbox.length + stats.wanted.length + stats.orphans.length + stats.stale.length;

  const tabAccent: Record<QueueTab, { tint: string; bg: string; text: string; ring: string }> = {
    inbox:  { tint: 'rgb(245 158 11)',  bg: 'bg-amber-50 dark:bg-amber-950/30',     text: 'text-amber-700 dark:text-amber-300',     ring: 'ring-amber-500/40'   },
    wanted: { tint: 'rgb(244 63 94)',   bg: 'bg-rose-50 dark:bg-rose-950/30',       text: 'text-rose-700 dark:text-rose-300',       ring: 'ring-rose-500/40'    },
    orphan: { tint: 'rgb(16 185 129)',  bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-500/40' },
    stale:  { tint: 'rgb(99 102 241)',  bg: 'bg-indigo-50 dark:bg-indigo-950/30',   text: 'text-indigo-700 dark:text-indigo-300',   ring: 'ring-indigo-500/40'  },
  };

  return (
    <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8">
      {/* 헤더 — serif 대문 + mono 메타 */}
      <header className="mb-9 flex items-end justify-between gap-3 pb-4 border-b-2 border-[hsl(var(--wiki-hairline-strong))]">
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

      {/* 1. 위젯 영역 — 이어쓰기 / 무작위 / 만들 Top1 / 미니 차트 */}
      <section className="mb-9 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-3">
        {/* A. 이어쓰기 — 큰 카드 */}
        {stats.lastEdited && (
          <ContinueCard page={stats.lastEdited} onSelect={onSelect} />
        )}

        {/* 우측 사이드 — 3개 작은 카드 stack */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
          {/* B. 무작위 */}
          {randomPage && (
            <RandomCard page={randomPage} onSelect={onSelect} onShuffle={() => setRandomSeed((s) => s + 1)} />
          )}
          {/* D. 만들 Top1 */}
          {stats.wanted.length > 0 && (
            <WantedTopCard
              title={stats.wanted[0][0]}
              count={stats.wanted[0][1]}
              onCreate={() => onCreateMissing?.(stats.wanted[0][0])}
            />
          )}
          {/* C. 이번 주 미니 차트 */}
          <WeekActivityCard
            chart={stats.weekChart}
            total={stats.weekTotal}
            newCount={stats.weekNew}
          />
        </div>
      </section>

      {/* 2. 목차 — 메인 */}
      <section className="mb-9">
        <SectionHeader
          symbol="◆"
          label="목차"
          sub="주제별 묶음"
          right={stats.mocs.length > 0 && (
            <span className="text-[10.5px] font-mono text-muted-foreground/80">{stats.mocs.length}</span>
          )}
        />

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
              className="group flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[hsl(var(--hairline))] text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 wiki-trans-base text-[12px] font-medium px-4 py-3 min-h-[88px]"
            >
              <Plus className="w-3.5 h-3.5 group-hover:scale-110 wiki-trans-base" /> 새 목차
            </button>
          </div>
        )}
      </section>

      {/* 3. 정리 큐 — 색 차별 탭 */}
      <section className="mb-9">
        <SectionHeader
          symbol="▮"
          label="정리 큐"
          right={totalQueue > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-primary/15 text-primary text-[10.5px] font-mono font-bold">
              {totalQueue}
            </span>
          )}
        />
        <div className="rounded-xl border border-[hsl(var(--hairline))] bg-card overflow-hidden shadow-sm">
          {/* 탭 헤더 */}
          <div className="grid grid-cols-4 border-b border-[hsl(var(--hairline))]">
            <QueueTabBtn
              active={tab === 'inbox'}
              icon={<FileText className="w-3 h-3" />}
              label="초안"
              count={stats.inbox.length}
              accent={tabAccent.inbox}
              onClick={() => setTab('inbox')}
            />
            <QueueTabBtn
              active={tab === 'wanted'}
              icon={<Link2 className="w-3 h-3" />}
              label="만들"
              count={stats.wanted.length}
              accent={tabAccent.wanted}
              onClick={() => setTab('wanted')}
            />
            <QueueTabBtn
              active={tab === 'orphan'}
              icon={<Sprout className="w-3 h-3" />}
              label="연결"
              count={stats.orphans.length}
              accent={tabAccent.orphan}
              onClick={() => setTab('orphan')}
            />
            <QueueTabBtn
              active={tab === 'stale'}
              icon={<Moon className="w-3 h-3" />}
              label="잠자"
              count={stats.stale.length}
              accent={tabAccent.stale}
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

/* ── 상대 시간 ── */
function relTime(ts: number): string {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}일 전`;
  if (day < 30) return `${Math.floor(day / 7)}주 전`;
  return `${Math.floor(day / 30)}달 전`;
}

/* ── A. 이어쓰기 큰 카드 ── */
function ContinueCard({ page, onSelect }: { page: WikiPage; onSelect: (id: string) => void }) {
  const meta = WIKI_TYPE_META[page.type];
  const sMeta = WIKI_STATUS_META[page.status];
  // 본문 첫 5줄
  const lines = page.body.split('\n').filter((l) => l.trim()).slice(0, 5).join('\n');
  const preview = lines.replace(/^[#>\s]+/gm, '').slice(0, 240);
  return (
    <button
      type="button"
      onClick={() => onSelect(page.id)}
      className="group relative flex flex-col text-left rounded-xl border border-[hsl(var(--hairline))] bg-card hover:border-primary/50 hover:shadow-md wiki-trans-base overflow-hidden min-h-[180px]"
    >
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary group-hover:bg-primary wiki-trans-color" />
      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
        <Play className="w-3.5 h-3.5 text-primary shrink-0 fill-primary/20" />
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-primary/80 font-bold">이어쓰기</span>
        <span className="ml-auto text-[10.5px] font-mono text-muted-foreground/80">{relTime(page.updatedAt)}</span>
      </div>
      <div className="px-5 pb-3">
        <h3
          className="text-[20px] font-bold text-foreground leading-snug mb-1.5 line-clamp-2"
          style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif', letterSpacing: '-0.005em' }}
        >
          <span className="text-[16px] mr-1.5 align-middle">{meta.icon}</span>
          {page.title}
        </h3>
        {preview && (
          <p className="text-[12px] text-muted-foreground/90 leading-relaxed line-clamp-3">
            {preview}
          </p>
        )}
      </div>
      <div className="mt-auto px-5 pb-4 pt-1.5 flex items-center gap-2">
        <span
          className="inline-flex items-center px-2 h-5 rounded text-[10px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: `${sMeta.tint}1F`, color: sMeta.tint }}
        >
          {sMeta.label}
        </span>
        {page.tags.slice(0, 3).map((t) => (
          <span key={t} className="text-[10px] text-muted-foreground/80">#{t}</span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary group-hover:translate-x-0.5 wiki-trans-base">
          이어쓰기 <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </button>
  );
}

/* ── B. 무작위 페이지 ── */
function RandomCard({
  page, onSelect, onShuffle,
}: { page: WikiPage; onSelect: (id: string) => void; onShuffle: () => void }) {
  const meta = WIKI_TYPE_META[page.type];
  const preview = page.body.replace(/^[#>\s\n]+/g, '').replace(/\n+/g, ' ').slice(0, 60);
  return (
    <div className="relative flex flex-col rounded-xl border border-[hsl(var(--hairline))] bg-card overflow-hidden hover:border-primary/40 hover:shadow-sm wiki-trans-base">
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[4px] bg-violet-400/60" />
      <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
        <Shuffle className="w-3 h-3 text-violet-500" />
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300 font-bold">무작위</span>
        <button
          type="button"
          onClick={onShuffle}
          className="ml-auto inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground hover:bg-accent wiki-trans-color"
          title="다른 페이지로"
          aria-label="다시"
        >
          <RotateCw className="w-3 h-3" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => onSelect(page.id)}
        className="px-3 pb-3 text-left group"
      >
        <p className="text-[13px] font-bold text-foreground truncate group-hover:text-primary wiki-trans-color"
           style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}>
          <span className="text-[14px] mr-1 align-middle">{meta.icon}</span>{page.title}
        </p>
        {preview && (
          <p className="text-[11px] text-muted-foreground/85 line-clamp-2 mt-0.5 leading-relaxed">{preview}</p>
        )}
      </button>
    </div>
  );
}

/* ── D. 만들 Top1 ── */
function WantedTopCard({
  title, count, onCreate,
}: { title: string; count: number; onCreate: () => void }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="group relative flex flex-col text-left rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 wiki-trans-base overflow-hidden"
    >
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[4px] bg-rose-500/70" />
      <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
        <Link2 className="w-3 h-3 text-rose-600 dark:text-rose-400" />
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-rose-700 dark:text-rose-300 font-bold">만들 Top</span>
        <span className="ml-auto text-[10px] font-mono font-bold text-rose-700 dark:text-rose-300">×{count}</span>
      </div>
      <div className="px-3 pb-3">
        <p className="text-[13px] font-bold text-foreground truncate group-hover:text-rose-700 dark:group-hover:text-rose-300 wiki-trans-color">
          {title}
        </p>
        <p className="text-[10.5px] text-muted-foreground/85 mt-0.5">
          {count}개 페이지에서 가리킴 — 만들면 {count}개 풀림
        </p>
      </div>
    </button>
  );
}

/* ── C. 이번 주 미니 차트 (sparkbar 7일) ── */
function WeekActivityCard({
  chart, total, newCount,
}: { chart: Array<{ ts: number; count: number }>; total: number; newCount: number }) {
  const max = Math.max(1, ...chart.map((b) => b.count));
  const bw = 14, gap = 4, h = 40;
  const w = chart.length * (bw + gap) - gap;
  const todayIdx = chart.length - 1;
  const dayLabels = ['일','월','화','수','목','금','토'];
  return (
    <div className="relative flex flex-col rounded-xl border border-[hsl(var(--hairline))] bg-card px-3 pt-2.5 pb-3 overflow-hidden">
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[4px] bg-emerald-400/60" />
      <div className="flex items-center gap-1.5 mb-1.5">
        <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300 font-bold">이번 주</span>
        <span className="ml-auto font-mono text-[10.5px] text-muted-foreground/80">
          <span className="font-bold text-foreground/85">{total}</span> 편집
          <span className="text-muted-foreground/40"> · </span>
          <span className="font-bold text-foreground/85">{newCount}</span> 신규
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h + 12}`} className="w-full h-[52px]" aria-label="이번 주 일별 편집">
        {chart.map((b, i) => {
          const bh = (b.count / max) * h;
          const x = i * (bw + gap);
          const y = h - bh;
          const isToday = i === todayIdx;
          const dayName = dayLabels[new Date(b.ts).getDay()];
          return (
            <g key={i}>
              <rect
                x={x} y={y} width={bw} height={Math.max(bh, 1)}
                fill={isToday ? 'rgb(16 185 129)' : 'rgb(16 185 129 / 0.45)'}
                rx={2}
              >
                <title>{`${dayName}요일 — ${b.count}건`}</title>
              </rect>
              <text x={x + bw / 2} y={h + 9} textAnchor="middle"
                    fontSize="8" fontFamily="ui-monospace, monospace"
                    fill={isToday ? 'rgb(16 185 129)' : 'hsl(var(--muted-foreground))'}
                    fontWeight={isToday ? 700 : 400}>
                {dayName}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── 섹션 헤더 — 가로 hairline + ornament symbol ── */
function SectionHeader({
  symbol, label, sub, right,
}: {
  symbol: string; label: string; sub?: string; right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span aria-hidden className="text-[12px] text-primary/70 font-bold leading-none">{symbol}</span>
      <h2 className="text-[11px] font-mono uppercase tracking-[0.18em] text-foreground/70 font-bold inline-flex items-baseline gap-1.5">
        {label}
        {sub && <span className="text-muted-foreground/70 font-normal tracking-normal normal-case text-[10.5px]">— {sub}</span>}
      </h2>
      <span aria-hidden className="flex-1 h-px bg-[hsl(var(--hairline))]" />
      {right}
    </div>
  );
}

/* ── 목차 카드 — 좌측 4px primary 띠 + 호버 그림자 ── */
function MocCard({
  page, pages, isFav, onSelect,
}: {
  page: WikiPage; pages: WikiPage[]; isFav: boolean; onSelect: (id: string) => void;
}) {
  const preview = page.body.replace(/^[#>\s\n]+/g, '').replace(/\n+/g, ' ').slice(0, 80);
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
      className="group relative flex flex-col gap-1.5 text-left rounded-xl border border-[hsl(var(--hairline))] bg-card hover:border-primary/50 hover:shadow-md wiki-trans-base pl-5 pr-4 py-3.5 overflow-hidden"
    >
      {/* 좌측 컬러 띠 */}
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary/70 group-hover:bg-primary wiki-trans-color" />
      <div className="flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
        <span
          className="text-[14.5px] font-bold text-foreground truncate flex-1"
          style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif', letterSpacing: '-0.005em' }}
        >
          {page.title}
        </span>
        {isFav && <Star className="w-3 h-3 fill-amber-400 text-amber-500 shrink-0" />}
      </div>
      {preview && (
        <p className="text-[11.5px] text-muted-foreground/90 line-clamp-2 leading-relaxed">{preview}</p>
      )}
      <p className="text-[10.5px] text-muted-foreground/80 inline-flex items-center gap-1 font-mono">
        <Link2 className="w-2.5 h-2.5" />
        {linkedCount > 0 ? <><span className="font-bold text-foreground/85">{linkedCount}</span> pages</> : '아직 페이지 안 묶임'}
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
    <div className="relative rounded-xl border-2 border-dashed border-[hsl(var(--wiki-hairline-strong))] bg-gradient-to-b from-card to-muted/20 px-6 py-6 text-center">
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary/30 rounded-l-xl" />
      <BookOpen className="w-7 h-7 text-primary/60 mx-auto mb-2.5" strokeWidth={1.5} />
      <p
        className="text-[15px] font-bold text-foreground mb-1.5"
        style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif' }}
      >
        아직 목차가 없어요
      </p>
      <p className="text-[11.5px] text-muted-foreground leading-relaxed mb-4 max-w-md mx-auto">
        목차는 비슷한 페이지를 모아 <em className="not-italic font-semibold text-foreground/80">길찾기</em> 역할을 해요.<br />
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
                title={`#${tag} 태그를 가진 ${n}개 페이지로 목차 자동 생성`}
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
        <Plus className="w-3 h-3" /> 빈 목차 직접 만들기
      </button>
    </div>
  );
}

/* ── 정리 큐 탭 — 색 액센트 + 활성 시 좌하단 색 막대 ── */
interface TabAccent { tint: string; bg: string; text: string; ring: string; }

function QueueTabBtn({
  active, icon, label, count, accent, onClick,
}: {
  active: boolean; icon: React.ReactNode; label: string; count: number; accent: TabAccent; onClick: () => void;
}) {
  const dim = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      style={active ? { '--tab-tint': accent.tint } as React.CSSProperties : undefined}
      className={cn(
        'relative inline-flex items-center justify-center gap-1.5 px-2 py-2.5 text-[12px] wiki-trans-base',
        active
          ? cn(accent.bg, accent.text, 'font-bold')
          : dim
            ? 'text-muted-foreground/50 hover:bg-accent/40 hover:text-muted-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {icon}
      <span>{label}</span>
      <span
        className={cn(
          'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-bold wiki-trans-color',
          active ? 'text-white' : dim ? 'bg-muted text-muted-foreground/70' : 'bg-accent text-foreground/70',
        )}
        style={active ? { backgroundColor: accent.tint } : undefined}
      >
        {count}
      </span>
      {active && (
        <span
          className="absolute bottom-0 left-2 right-2 h-[2px]"
          style={{ backgroundColor: accent.tint }}
          aria-hidden
        />
      )}
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
