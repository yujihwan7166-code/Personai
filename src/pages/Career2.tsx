/**
 * 마이 커리어 v2 — /career2 ("모던 대시보드" 컨셉, 코발트 블루).
 *
 * v1(/career, 교정 원고 무드)과 같은 careerStore 데이터를 다른 UX로 보여주는 병행 버전.
 * 좌: 캐논 사이드바(마크·내비·보드 목록·v1 링크) / 우: 마스트헤드 + 스탯 타일 +
 * 빠른 입력 바(AI 분류) + 카테고리 카드 그리드 | 문서 뷰(5종 생성·보관).
 * 어느 버전에서 입력하든 양쪽에 반영된다 — 비교를 위한 구조.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, FileText, LayoutGrid, Pencil, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useCareerBoard } from '@/hooks/useCareer';
import { careerStore } from '@/services/careerStore';
import { PERSONA_LABEL, type CareerPersona, type SpecItem } from '@/types/career';
import { QuickAddBar } from '@/components/career2/QuickAddBar';
import { CategoryGrid } from '@/components/career2/CategoryGrid';
import { ItemDialog } from '@/components/career2/ItemDialog';
import { DocsView } from '@/components/career2/DocsView';

type View = 'dashboard' | 'docs';

/** 신분별 시작 칸 — v1과 동일 세트 (같은 데이터 위에서 같은 규칙). */
const SEED_CATEGORIES: Record<CareerPersona, string[]> = {
  highschool: ['수상', '동아리·활동', '봉사', '자격증', '독서'],
  student: ['자격증', '어학', '동아리·활동', '공모전', '수상'],
  jobseeker: ['자격증', '어학', '인턴', '프로젝트', '수상'],
  worker: ['경력', '프로젝트', '자격증', '수상', '교육'],
};

export default function Career2() {
  const { items, categories, profile, docs, boards, activeBoardId } = useCareerBoard();
  const [view, setView] = useState<View>('dashboard');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<SpecItem | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [addingBoard, setAddingBoard] = useState(false);
  const [boardName, setBoardName] = useState('');
  const freshTimer = useRef<number | null>(null);

  const boardCounts = useMemo(() => careerStore.countItemsByBoard(), [items, boards]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeBoard = boards.find((b) => b.id === activeBoardId);

  useEffect(() => () => { if (freshTimer.current) window.clearTimeout(freshTimer.current); }, []);

  const onAdded = useCallback((_category: string, itemId: string) => {
    setFresh(itemId);
    if (freshTimer.current) window.clearTimeout(freshTimer.current);
    freshTimer.current = window.setTimeout(() => setFresh(null), 2200);
  }, []);

  const pickPersona = (p: CareerPersona) => {
    careerStore.setProfile({ persona: p });
    for (const name of SEED_CATEGORIES[p]) careerStore.ensureCategory(name);
  };

  const addBoard = () => {
    const name = boardName.trim();
    if (!name) { setAddingBoard(false); return; }
    careerStore.addBoard(name, { persona: profile.persona });
    setBoardName(''); setAddingBoard(false); setView('dashboard');
  };

  const thisYear = new Date().getFullYear().toString();
  const stats = useMemo(() => ({
    total: items.length,
    thisYear: items.filter((i) => i.date.startsWith(thisYear)).length,
    ongoing: items.filter((i) => i.ongoing).length,
    docs: docs.filter((d) => d.boardId === activeBoardId).length,
  }), [items, docs, activeBoardId, thisYear]);

  const boardDocs = useMemo(() => docs.filter((d) => d.boardId === activeBoardId), [docs, activeBoardId]);

  const needSetup = !profile.persona;

  return (
    <div className="career2-theme flex h-dvh bg-background text-foreground">
      {/* ── 사이드바 ── */}
      <aside className="hidden w-[248px] shrink-0 flex-col overflow-y-auto border-r border-[hsl(var(--hairline))] bg-[hsl(var(--sidebar-background))] px-4 pb-5 pt-4 lg:flex">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[hsl(var(--career2-blue))] text-white shadow-sm">
            <BadgeCheck className="h-[22px] w-[22px]" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-[hsl(var(--career2-blue))]">My Career · v2</p>
            <h1 className="truncate text-[16.5px] font-bold leading-tight">마이 커리어</h1>
            <p className="truncate text-[11px] text-muted-foreground">쌓이는 것들의 대시보드</p>
          </div>
        </div>

        <nav className="space-y-0.5" aria-label="마이커리어 섹션">
          {([['dashboard', '대시보드', LayoutGrid], ['docs', '문서', FileText]] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => setView(id)}
              className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] transition-colors',
                view === id
                  ? 'bg-[hsl(var(--career2-blue)/0.12)] font-semibold text-[hsl(var(--career2-blue))]'
                  : 'text-muted-foreground hover:bg-[hsl(var(--muted))] hover:text-foreground')}>
              <Icon className="h-4 w-4" /> {label}
              {id === 'docs' && stats.docs > 0 && <span className="ml-auto text-[11.5px] tabular-nums text-muted-foreground">{stats.docs}</span>}
            </button>
          ))}
        </nav>

        {/* 보드 */}
        <div className="mt-5">
          <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">보드</p>
          <div className="space-y-0.5">
            {boards.map((b) => (
              <button key={b.id} type="button" onClick={() => { careerStore.setActiveBoard(b.id); setView('dashboard'); }}
                className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors',
                  b.id === activeBoardId
                    ? 'bg-[hsl(var(--career2-blue)/0.12)] font-semibold text-[hsl(var(--career2-blue))]'
                    : 'text-muted-foreground hover:bg-[hsl(var(--muted))] hover:text-foreground')}>
                <span className="truncate">{b.name}</span>
                <span className="ml-auto text-[11px] tabular-nums">{boardCounts[b.id] ?? 0}</span>
              </button>
            ))}
            {addingBoard ? (
              <input
                value={boardName} autoFocus onChange={(e) => setBoardName(e.target.value)}
                onBlur={addBoard}
                onKeyDown={(e) => { if (e.key === 'Enter') addBoard(); if (e.key === 'Escape') { setBoardName(''); setAddingBoard(false); } }}
                placeholder="보드 이름 (예: 대학원용)"
                className="w-full rounded-lg border border-[hsl(var(--career2-blue)/0.5)] bg-[hsl(var(--card))] px-3 py-1.5 text-[13px] outline-none"
                aria-label="새 보드 이름"
              />
            ) : (
              <button type="button" onClick={() => setAddingBoard(true)}
                className="flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-[hsl(var(--muted))] hover:text-foreground">
                <Plus className="h-3.5 w-3.5" /> 새 보드
              </button>
            )}
          </div>
        </div>

        {/* 프로필 */}
        <button type="button" onClick={() => setProfileOpen(true)}
          className="mt-5 flex items-center gap-2.5 rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-3 py-2.5 text-left transition-colors hover:border-[hsl(var(--career2-blue)/0.4)]">
          {profile.photo
            ? <img src={profile.photo} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--career2-blue)/0.12)] text-[13px] font-bold text-[hsl(var(--career2-blue))]">{(profile.name || '?').slice(0, 1)}</span>}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold">{profile.name || '프로필 설정'}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{profile.persona ? PERSONA_LABEL[profile.persona] : '이력서 인적사항'}</span>
          </span>
          <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>

        <div className="mt-auto pt-6">
          <Link to="/career" className="block rounded-lg px-3 py-1.5 text-[11.5px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline">
            v1 (원고 버전)으로 보기 →
          </Link>
        </div>
      </aside>

      {/* ── 본문 ── */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1080px] px-5 pt-6 lg:px-8">
          <header className="mb-4">
            <h2 className="text-[27px] font-bold leading-tight">{view === 'dashboard' ? (activeBoard?.name ?? '대시보드') : '문서'}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {view === 'dashboard'
                ? <>스펙 {stats.total}개 · 올해 +{stats.thisYear} · 내 기기에만 저장</>
                : <>이 보드로 만든 문서 {stats.docs}개</>}
            </p>
          </header>

          {/* 모바일 내비 */}
          <div className="mb-4 flex gap-1.5 lg:hidden" role="tablist" aria-label="마이커리어 섹션">
            {([['dashboard', '대시보드'], ['docs', '문서']] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)}
                className={cn('rounded-full border px-3 py-1.5 text-[12.5px]',
                  view === id
                    ? 'border-[hsl(var(--career2-blue)/0.4)] bg-[hsl(var(--career2-blue)/0.12)] font-semibold text-[hsl(var(--career2-blue))]'
                    : 'border-[hsl(var(--input))] text-muted-foreground')}>
                {label}
              </button>
            ))}
            {boards.length > 1 && boards.map((b) => (
              <button key={b.id} type="button" onClick={() => { careerStore.setActiveBoard(b.id); setView('dashboard'); }}
                className={cn('rounded-full border px-3 py-1.5 text-[12.5px]',
                  b.id === activeBoardId ? 'border-[hsl(var(--career2-blue)/0.4)] bg-[hsl(var(--career2-blue)/0.12)] font-semibold text-[hsl(var(--career2-blue))]' : 'border-[hsl(var(--input))] text-muted-foreground')}>
                {b.name}
              </button>
            ))}
          </div>

          {needSetup ? (
            <section className="mx-auto mt-10 max-w-[480px] rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-6 text-center">
              <h3 className="text-[18px] font-bold">지금 신분에 맞는 칸을 준비할게요</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">한 번 고르면 카테고리가 깔려요 — 나중에 자유롭게 바꿀 수 있어요</p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {(Object.keys(PERSONA_LABEL) as CareerPersona[]).map((p) => (
                  <button key={p} type="button" onClick={() => pickPersona(p)}
                    className="rounded-xl border border-[hsl(var(--input))] px-3 py-3 text-[14px] font-semibold transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--career2-blue)/0.5)] hover:text-[hsl(var(--career2-blue))]">
                    {PERSONA_LABEL[p]}
                  </button>
                ))}
              </div>
            </section>
          ) : view === 'dashboard' ? (
            <>
              {/* 스탯 타일 */}
              <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {([
                  ['총 스펙', stats.total, ''],
                  ['올해 추가', stats.thisYear, '+'],
                  ['진행 중', stats.ongoing, ''],
                  ['만든 문서', stats.docs, ''],
                ] as const).map(([label, value, sign]) => (
                  <div key={label} className="rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-4 py-3">
                    <p className="text-[11.5px] text-muted-foreground">{label}</p>
                    <p className="text-[22px] font-bold tabular-nums text-[hsl(var(--career2-blue))]">{sign}{value}</p>
                  </div>
                ))}
              </div>

              <div className="mb-4"><QuickAddBar existingCategories={categories.map((c) => c.name)} onAdded={onAdded} /></div>

              <div className="relative mb-4 max-w-[300px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="스펙 검색"
                  aria-label="스펙 검색"
                  className="w-full rounded-full border border-[hsl(var(--input))] bg-[hsl(var(--card))] py-1.5 pl-8 pr-7 text-[12.5px] outline-none focus:border-[hsl(var(--career2-blue))]" />
                {query && (
                  <button type="button" aria-label="검색 지우기" onClick={() => setQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-[hsl(var(--muted))]"><X className="h-3 w-3" /></button>
                )}
              </div>

              <div className="pb-16">
                <CategoryGrid categories={categories} items={items} query={query} freshItemId={fresh} onEdit={setEditing} />
              </div>
            </>
          ) : (
            <DocsView profile={profile} categories={categories} items={items} docs={boardDocs} boardName={activeBoard?.name ?? ''} />
          )}
        </div>
      </main>

      <ItemDialog item={editing} categories={categories} onClose={() => setEditing(null)} />
      {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}
    </div>
  );
}

/** 프로필(이력서 인적사항) 편집 — v1과 같은 careerStore.setProfile. */
function ProfileDialog({ onClose }: { onClose: () => void }) {
  const p = careerStore.getProfile();
  const [name, setName] = useState(p.name);
  const [tagline, setTagline] = useState(p.tagline);
  const [email, setEmail] = useState(p.email ?? '');
  const [phone, setPhone] = useState(p.phone ?? '');
  const [birth, setBirth] = useState(p.birth ?? '');
  const [link, setLink] = useState(p.link ?? '');

  useEscapeKey(onClose, { evenInInput: true });

  const save = () => {
    careerStore.setProfile({
      name: name.trim(), tagline: tagline.trim(),
      email: email.trim() || undefined, phone: phone.trim() || undefined,
      birth: birth.trim() || undefined, link: link.trim() || undefined,
    });
    onClose();
  };

  const field = 'w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-3 py-2 text-[13.5px] outline-none focus:border-[hsl(var(--career2-blue))]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-[420px] rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--background))] p-5 shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[16px] font-bold">프로필 — 이력서 인적사항</h3>
          <button type="button" aria-label="닫기 (Esc)" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--muted))]"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" className={field} aria-label="이름" />
          <textarea value={tagline} onChange={(e) => setTagline(e.target.value)} rows={2} placeholder="짧은 소개 (이력서 머리글)" className={cn(field, 'resize-none')} aria-label="소개" />
          <div className="flex gap-2">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일 (선택)" className={field} aria-label="이메일" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="연락처 (선택)" className={field} aria-label="연락처" />
          </div>
          <div className="flex gap-2">
            <input value={birth} onChange={(e) => setBirth(e.target.value)} placeholder="생년월일 (선택, 자유 표기)" className={field} aria-label="생년월일" />
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="대표 링크 (선택)" className={field} aria-label="대표 링크" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={save} className="rounded-xl bg-[hsl(var(--career2-blue))] px-5 py-2 text-[13.5px] font-semibold text-white">저장</button>
        </div>
      </div>
    </div>
  );
}
