import { useMemo } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { type WikiPage, WIKI_TYPE_META } from '@/types/wiki';

interface Props {
  pages: WikiPage[];
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function WikiHome({ pages, onSelect, onCreate }: Props) {
  const stats = useMemo(() => {
    const byStatus = { draft: 0, active: 0, stable: 0, archived: 0 };
    for (const p of pages) byStatus[p.status]++;

    const recent = pages.slice(0, 6); // pages 는 updatedAt desc 정렬돼 있음
    const inbox = pages.filter((p) => p.status === 'draft').slice(0, 5);
    const mocs = pages.filter((p) => p.type === 'moc');

    // 고아 노트 = refersTo 도 cites 도 비어있고, 아무도 참조하지 않는 페이지
    const referencedIds = new Set<string>();
    for (const p of pages) {
      for (const r of [...p.refersTo, ...p.cites]) referencedIds.add(r);
    }
    const orphans = pages.filter(
      (p) => p.refersTo.length === 0 && p.cites.length === 0 && !referencedIds.has(p.id)
    );

    return { byStatus, recent, inbox, mocs, orphans };
  }, [pages]);

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-full px-8">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🌐</div>
          <h1 className="text-xl font-bold text-foreground mb-2">마이위키</h1>
          <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
            나만의 지식 베이스를 시작해보세요.<br />
            첫 페이지를 만들면 [[다른 페이지]] 로 연결할 수 있어요.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            첫 페이지 만들기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <header className="mb-7">
        <p className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-1">
          MY WIKI · HOME
        </p>
        <h1 className="text-2xl font-bold text-foreground">대문</h1>
        <p className="text-[12px] text-muted-foreground mt-1">
          최근 수정 · 초안 · MOC · 관리 — 한눈에.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 최근 수정 */}
        <Section title="🕒 최근 수정" empty="아직 페이지가 없어요">
          {stats.recent.map((p) => (
            <PageRow key={p.id} page={p} onSelect={onSelect} />
          ))}
        </Section>

        {/* 초안 (Inbox) */}
        <Section title="🚧 초안 — 정리 대기" empty="모두 정리됐어요 ✓">
          {stats.inbox.map((p) => (
            <PageRow key={p.id} page={p} onSelect={onSelect} />
          ))}
        </Section>

        {/* MOC */}
        <Section title="🗺 MOC — 주제 지도" empty="MOC 페이지가 없어요">
          {stats.mocs.map((p) => (
            <PageRow key={p.id} page={p} onSelect={onSelect} />
          ))}
        </Section>

        {/* 고아 노트 */}
        <Section
          title="🪐 고아 노트 — 연결 없음"
          empty="모든 페이지가 어딘가에 연결됐어요 ✓"
        >
          {stats.orphans.slice(0, 5).map((p) => (
            <PageRow key={p.id} page={p} onSelect={onSelect} />
          ))}
        </Section>
      </div>

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
            <p className="text-[18px] font-bold text-foreground mt-0.5">{n}</p>
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
          <Sparkles className="w-3 h-3" /> 본문에 <code className="px-1 rounded bg-accent">[[페이지명]]</code> 으로 위키링크
        </span>
      </div>
    </div>
  );
}

function Section({ title, children, empty }: { title: string; children: React.ReactNode; empty: string }) {
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
