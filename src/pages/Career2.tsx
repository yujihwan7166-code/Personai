/**
 * 마이 커리어 v2 — /career2. UI Pro Max 권장(Resume/CV Builder → Swiss Modernism 2.0)을 따른 재디자인.
 *
 * 규칙: 모노크롬 캔버스 + 월계수 올리브 단일 강조 + 괘선/그리드/등폭 숫자.
 * v1(/career, 웜 종이·명조·로즈, "교정 중인 원고")과 정면 대비 — 데이터는 careerStore 공유라
 * 어느 쪽에서 적어도 양쪽에 반영된다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useCareerBoard } from '@/hooks/useCareer';
import { careerStore } from '@/services/careerStore';
import { PERSONA_LABEL, type CareerPersona, type SpecItem } from '@/types/career';
import { QuickAdd } from '@/components/career2/QuickAdd';
import { SpecLedger } from '@/components/career2/SpecLedger';
import { ItemDialog } from '@/components/career2/ItemDialog';
import { DocsGallery } from '@/components/career2/DocsGallery';

type View = 'ledger' | 'docs';

/** 신분별 시작 칸 — v1과 동일 세트(같은 데이터 위에서 같은 규칙). */
const SEED_CATEGORIES: Record<CareerPersona, string[]> = {
  highschool: ['수상', '동아리·활동', '봉사', '자격증', '독서'],
  student: ['자격증', '어학', '동아리·활동', '공모전', '수상'],
  jobseeker: ['자격증', '어학', '인턴', '프로젝트', '수상'],
  worker: ['경력', '프로젝트', '자격증', '수상', '교육'],
};

const PERSONA_HINT: Record<CareerPersona, string> = {
  highschool: '수상 · 동아리 · 봉사 중심',
  student: '동아리 · 공모전 · 자격증 중심',
  jobseeker: '인턴 · 프로젝트 · 어학 중심',
  worker: '경력 · 프로젝트 성과 중심',
};

const NAV: Array<{ id: View; label: string }> = [
  { id: 'ledger', label: '기록' },
  { id: 'docs', label: '문서' },
];

export default function Career2() {
  const { items, categories, profile, docs, boards, activeBoardId } = useCareerBoard();
  const [view, setView] = useState<View>('ledger');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<SpecItem | null>(null);
  const [seated, setSeated] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [addingBoard, setAddingBoard] = useState(false);
  const [boardName, setBoardName] = useState('');
  const seatTimer = useRef<number | null>(null);

  const boardCounts = useMemo(() => careerStore.countItemsByBoard(), [items, boards]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeBoard = boards.find((b) => b.id === activeBoardId);
  const boardDocs = useMemo(() => docs.filter((d) => d.boardId === activeBoardId), [docs, activeBoardId]);

  useEffect(() => () => { if (seatTimer.current) window.clearTimeout(seatTimer.current); }, []);

  const onAdded = useCallback((itemId: string) => {
    setSeated(itemId);
    if (seatTimer.current) window.clearTimeout(seatTimer.current);
    seatTimer.current = window.setTimeout(() => setSeated(null), 1800);
  }, []);

  const pickPersona = (p: CareerPersona) => {
    careerStore.setProfile({ persona: p });
    for (const name of SEED_CATEGORIES[p]) careerStore.ensureCategory(name);
  };

  const addBoard = () => {
    const name = boardName.trim();
    if (!name) { setAddingBoard(false); return; }
    careerStore.addBoard(name, { persona: profile.persona });
    setBoardName(''); setAddingBoard(false); setView('ledger');
  };

  const thisYear = String(new Date().getFullYear());
  const stats = useMemo(() => ({
    total: items.length,
    year: items.filter((i) => i.date.startsWith(thisYear)).length,
    docs: boardDocs.length,
  }), [items, boardDocs, thisYear]);

  const needSetup = !profile.persona;

  const navBtn = (active: boolean) =>
    cn('flex w-full items-baseline gap-2.5 border-l-2 py-1.5 pl-3 text-left text-[14px] transition-colors',
      active
        ? 'border-[hsl(var(--c2-laurel))] font-bold text-foreground'
        : 'border-transparent text-muted-foreground hover:text-foreground');

  return (
    <div className="career2-theme flex h-dvh bg-background text-foreground">
      {/* ── 좌측 타이포그래피 컬럼 ── */}
      <aside className="hidden w-[236px] shrink-0 flex-col overflow-y-auto border-r border-[hsl(var(--hairline))] bg-[hsl(var(--sidebar-background))] px-6 pb-6 pt-7 lg:flex">
        <p className="c2-eyebrow text-[10px] text-[hsl(var(--c2-laurel))]">My Career</p>
        <h1 className="mt-1 text-[20px] font-bold tracking-[-0.02em]">마이 커리어</h1>
        <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">쌓은 것을 문서로 꺼내는 곳</p>

        <div className="my-5 h-px bg-[hsl(var(--foreground))]" />

        <nav aria-label="구분">
          {NAV.map((n, i) => (
            <button key={n.id} type="button" onClick={() => setView(n.id)} className={navBtn(view === n.id)}>
              <span className="c2-num text-[10.5px] text-muted-foreground">{String(i + 1).padStart(2, '0')}</span>
              {n.label}
              {n.id === 'docs' && stats.docs > 0 && <span className="c2-num ml-auto text-[11.5px] text-muted-foreground">{stats.docs}</span>}
            </button>
          ))}
        </nav>

        <div className="my-5 h-px bg-[hsl(var(--hairline))]" />

        <p className="c2-eyebrow mb-2 text-[10px] text-muted-foreground">보드</p>
        <div className="space-y-0.5">
          {boards.map((b) => (
            <button key={b.id} type="button"
              onClick={() => { careerStore.setActiveBoard(b.id); setView('ledger'); }}
              className={navBtn(b.id === activeBoardId)}>
              <span className="truncate">{b.name}</span>
              <span className="c2-num ml-auto text-[11.5px] text-muted-foreground">{boardCounts[b.id] ?? 0}</span>
            </button>
          ))}
          {addingBoard ? (
            <input
              value={boardName} autoFocus onChange={(e) => setBoardName(e.target.value)}
              onBlur={addBoard}
              onKeyDown={(e) => { if (e.key === 'Enter') addBoard(); if (e.key === 'Escape') { setBoardName(''); setAddingBoard(false); } }}
              placeholder="보드 이름"
              aria-label="새 보드 이름"
              className="ml-3 w-[calc(100%-0.75rem)] border-b border-[hsl(var(--c2-laurel))] bg-transparent py-1 text-[13.5px] outline-none"
            />
          ) : (
            <button type="button" onClick={() => setAddingBoard(true)}
              className="flex items-center gap-1.5 border-l-2 border-transparent py-1.5 pl-3 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground">
              <Plus className="h-3.5 w-3.5" /> 새 보드
            </button>
          )}
        </div>

        <div className="mt-auto pt-8">
          <button type="button" onClick={() => setProfileOpen(true)}
            className="block text-left text-[12px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            {profile.name ? `${profile.name} · 인적사항 고치기` : '인적사항 적기'}
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80">기록은 이 기기에만 저장돼요</p>
          <Link to="/career" className="mt-2 block text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            v1 원고 버전으로 →
          </Link>
        </div>
      </aside>

      {/* ── 본문 ── */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[900px] px-6 pb-24 pt-8 sm:px-10">
          {/* 마스트헤드 — 좌 제목 / 우 데이터, 굵은 괘선 */}
          <header className="mb-8">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b-2 border-[hsl(var(--foreground))] pb-3">
              <div className="min-w-0">
                <p className="c2-eyebrow text-[10px] text-[hsl(var(--c2-laurel))]">
                  {activeBoard?.name ?? '보드'}
                </p>
                <h2 className="mt-1 text-[30px] font-bold leading-none tracking-[-0.025em]">
                  {view === 'ledger' ? '기록' : '문서'}
                </h2>
              </div>
              <dl className="flex shrink-0 items-end gap-7">
                {([['총 기록', stats.total], ['올해', stats.year], ['문서', stats.docs]] as const).map(([label, value]) => (
                  <div key={label} className="text-right">
                    <dt className="c2-eyebrow text-[9.5px] text-muted-foreground">{label}</dt>
                    <dd className="c2-num text-[22px] font-bold leading-none">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* 모바일 내비 */}
            <div className="mt-3 flex gap-5 lg:hidden">
              {NAV.map((n) => (
                <button key={n.id} type="button" onClick={() => setView(n.id)}
                  className={cn('border-b-2 pb-1 text-[13.5px]',
                    view === n.id ? 'border-[hsl(var(--c2-laurel))] font-bold' : 'border-transparent text-muted-foreground')}>
                  {n.label}
                </button>
              ))}
              {boards.length > 1 && boards.map((b) => (
                <button key={b.id} type="button" onClick={() => { careerStore.setActiveBoard(b.id); setView('ledger'); }}
                  className={cn('border-b-2 pb-1 text-[13.5px]',
                    b.id === activeBoardId ? 'border-[hsl(var(--c2-laurel))] font-bold' : 'border-transparent text-muted-foreground')}>
                  {b.name}
                </button>
              ))}
            </div>
          </header>

          {needSetup ? (
            <section className="max-w-[440px] py-6">
              <p className="c2-eyebrow text-[10px] text-[hsl(var(--c2-laurel))]">시작</p>
              <h3 className="mt-2 text-[20px] font-bold">지금 어디쯤이신가요?</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                고르면 그에 맞는 칸이 준비돼요. 나중에 바꿔도 됩니다.
              </p>
              <ul className="mt-6 border-t-2 border-[hsl(var(--foreground))]">
                {(Object.keys(PERSONA_LABEL) as CareerPersona[]).map((p, i) => (
                  <li key={p} className="border-b border-[hsl(var(--hairline))]">
                    <button type="button" onClick={() => pickPersona(p)}
                      className="group flex w-full items-baseline gap-4 py-3 text-left transition-colors hover:bg-[hsl(var(--c2-laurel)/0.06)]">
                      <span className="c2-num text-[11px] text-muted-foreground/60">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-[15px] font-semibold">{PERSONA_LABEL[p]}</span>
                      <span className="ml-auto text-[12px] text-muted-foreground">{PERSONA_HINT[p]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : view === 'ledger' ? (
            <>
              <QuickAdd existingCategories={categories.map((c) => c.name)} onAdded={onAdded} />

              <div className="mb-7 mt-8 flex items-center justify-between gap-4 border-b border-[hsl(var(--hairline))] pb-2">
                <p className="c2-eyebrow text-[10px] text-muted-foreground">쌓인 기록</p>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query} onChange={(e) => setQuery(e.target.value)} placeholder="검색" aria-label="기록 검색"
                    className="w-28 bg-transparent pb-0.5 pl-5 text-[12.5px] outline-none transition-all placeholder:text-muted-foreground/60 focus:w-44"
                  />
                  {query && (
                    <button type="button" aria-label="검색 지우기" onClick={() => setQuery('')}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              <SpecLedger categories={categories} items={items} query={query} seatedId={seated} onEdit={setEditing} />
            </>
          ) : (
            <DocsGallery profile={profile} categories={categories} items={items} docs={boardDocs} boardName={activeBoard?.name ?? ''} />
          )}
        </div>
      </main>

      <ItemDialog item={editing} categories={categories} onClose={() => setEditing(null)} />
      {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}
    </div>
  );
}

/** 인적사항 — 이력서 머리글에 그대로 실린다. v1과 같은 careerStore.setProfile. */
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

  const FIELD = 'w-full border-b border-[hsl(var(--input))] bg-transparent pb-1.5 text-[14px] outline-none focus:border-[hsl(var(--c2-laurel))]';
  const LABEL = 'c2-eyebrow mb-1.5 block text-[10px] text-muted-foreground';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label="인적사항" onClick={onClose}>
      <div className="w-full max-w-[460px] border border-[hsl(var(--foreground))] bg-[hsl(var(--card))]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b-2 border-[hsl(var(--foreground))] px-6 py-3">
          <h2 className="text-[15px] font-bold">인적사항</h2>
          <button type="button" aria-label="닫기" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-1 gap-5 px-6 py-5 sm:grid-cols-2">
          <label className="block"><span className={LABEL}>이름</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={FIELD} /></label>
          <label className="block"><span className={LABEL}>생년월일</span>
            <input value={birth} onChange={(e) => setBirth(e.target.value)} placeholder="적은 그대로 실려요" className={cn(FIELD, 'placeholder:text-muted-foreground/50')} /></label>
          <label className="block sm:col-span-2"><span className={LABEL}>한 줄 소개</span>
            <textarea value={tagline} onChange={(e) => setTagline(e.target.value)} rows={2} className={cn(FIELD, 'resize-none leading-relaxed')} /></label>
          <label className="block"><span className={LABEL}>이메일</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" className={FIELD} /></label>
          <label className="block"><span className={LABEL}>연락처</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={FIELD} /></label>
          <label className="block sm:col-span-2"><span className={LABEL}>대표 링크</span>
            <input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" className={FIELD} /></label>
        </div>
        <div className="border-t border-[hsl(var(--hairline))] px-6 py-3 text-right">
          <button type="button" onClick={save} className="h-9 bg-[hsl(var(--c2-laurel))] px-5 text-[13px] font-semibold text-white">저장</button>
        </div>
      </div>
    </div>
  );
}
