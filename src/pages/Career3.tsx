/**
 * 마이 커리어 v3 — /career3 "밤의 기둥".
 *
 * 임무는 꾸준히 쌓기다. 그래서 입력이 화면의 주인공이고, 기록은 카테고리로 묶이는 대신
 * 시간축 한 줄기(기둥)를 따라 아래로 쌓인다. 어두운 캔버스는 취향이 아니라 사용 장면 —
 * 하루를 닫으며 한 줄 적는 방이라 밤에 열린다. 빛은 촛불 골드 하나.
 *
 * v1(/career 웜 종이·명조)·v2(/career2 스위스 괘선)와 같은 careerStore 를 공유한다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useCareerBoard } from '@/hooks/useCareer';
import { careerStore } from '@/services/careerStore';
import { PERSONA_LABEL, type CareerPersona, type SpecItem } from '@/types/career';
import { Compose } from '@/components/career3/Compose';
import { Column } from '@/components/career3/Column';
import { RecordSheet } from '@/components/career3/RecordSheet';
import { DocsPanel } from '@/components/career3/DocsPanel';

type View = 'stack' | 'docs';

const SEED_CATEGORIES: Record<CareerPersona, string[]> = {
  highschool: ['수상', '동아리·활동', '봉사', '자격증', '독서'],
  student: ['자격증', '어학', '동아리·활동', '공모전', '수상'],
  jobseeker: ['자격증', '어학', '인턴', '프로젝트', '수상'],
  worker: ['경력', '프로젝트', '자격증', '수상', '교육'],
};

const PERSONA_LINE: Record<CareerPersona, string> = {
  highschool: '수상 · 동아리 · 봉사부터 채워요',
  student: '동아리 · 공모전 · 자격증부터 채워요',
  jobseeker: '인턴 · 프로젝트 · 어학부터 채워요',
  worker: '경력 · 프로젝트 성과부터 채워요',
};

export default function Career3() {
  const { items, categories, profile, docs, boards, activeBoardId } = useCareerBoard();
  const [view, setView] = useState<View>('stack');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [editing, setEditing] = useState<SpecItem | null>(null);
  const [settled, setSettled] = useState<string | null>(null);
  const [boardMenu, setBoardMenu] = useState(false);
  const [newBoard, setNewBoard] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const settleTimer = useRef<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeBoard = boards.find((b) => b.id === activeBoardId);
  const boardDocs = useMemo(() => docs.filter((d) => d.boardId === activeBoardId), [docs, activeBoardId]);

  useEffect(() => () => { if (settleTimer.current) window.clearTimeout(settleTimer.current); }, []);
  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);
  useEscapeKey(() => { setBoardMenu(false); if (searchOpen && !query) setSearchOpen(false); });

  const onAdded = useCallback((itemId: string) => {
    setSettled(itemId);
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => setSettled(null), 1500);
  }, []);

  const pickPersona = (p: CareerPersona) => {
    careerStore.setProfile({ persona: p });
    for (const name of SEED_CATEGORIES[p]) careerStore.ensureCategory(name);
  };

  const addBoard = () => {
    const name = newBoard.trim();
    if (!name) return;
    careerStore.addBoard(name, { persona: profile.persona });
    setNewBoard(''); setBoardMenu(false); setView('stack');
  };

  const needSetup = !profile.persona;
  const lastAt = items[0]?.createdAt;
  const sinceLabel = useMemo(() => {
    if (!lastAt) return null;
    const days = Math.floor((Date.now() - Date.parse(lastAt)) / 86400000);
    if (Number.isNaN(days)) return null;
    return days <= 0 ? '오늘도 쌓았어요' : days === 1 ? '어제 이후 처음이에요' : `${days}일 만이에요`;
  }, [lastAt]);

  return (
    <div className="career3-theme flex h-dvh flex-col bg-background text-foreground">
      {/* 얇은 크롬 — 방 이름, 보드, 두 갈래(쌓기·꺼내기) */}
      <header className="shrink-0 border-b border-[hsl(var(--hairline))]">
        <div className="mx-auto flex w-full max-w-[720px] items-center gap-3 px-5 py-3.5 sm:px-8">
          <span className="text-[13.5px] font-semibold tracking-[-0.01em]">마이 커리어</span>

          <div className="relative">
            <button
              type="button" onClick={() => setBoardMenu((o) => !o)} aria-expanded={boardMenu}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {activeBoard?.name ?? '보드'}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {boardMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setBoardMenu(false)} aria-hidden />
                <div className="absolute left-0 top-full z-40 mt-1.5 w-56 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--popover))] p-1.5 shadow-2xl">
                  {boards.map((b) => (
                    <button key={b.id} type="button"
                      onClick={() => { careerStore.setActiveBoard(b.id); setBoardMenu(false); setView('stack'); }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition-colors hover:bg-[hsl(var(--surface-3))]">
                      <span className="min-w-0 flex-1 truncate">{b.name}</span>
                      {b.id === activeBoardId && <Check className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--c3-glow))]" />}
                    </button>
                  ))}
                  <div className="my-1.5 h-px bg-[hsl(var(--hairline))]" />
                  <input
                    value={newBoard} onChange={(e) => setNewBoard(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addBoard(); }}
                    placeholder="새 보드 이름 + Enter" aria-label="새 보드 이름"
                    className="w-full rounded-lg bg-[hsl(var(--surface-2))] px-2.5 py-2 text-[13px] outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-[hsl(var(--c3-glow)/0.5)]"
                  />
                </div>
              </>
            )}
          </div>

          <nav className="ml-auto flex items-center gap-1">
            {([['stack', '쌓기'], ['docs', '꺼내기']] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setView(id)}
                className={cn('rounded-full px-3 py-1.5 text-[13px] transition-colors',
                  view === id ? 'bg-[hsl(var(--surface-3))] font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {label}
              </button>
            ))}
            {view === 'stack' && !needSetup && (
              <button type="button" onClick={() => setSearchOpen((o) => !o)} aria-label="기록 검색"
                className="rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground">
                <Search className="h-4 w-4" />
              </button>
            )}
          </nav>
        </div>

        {searchOpen && view === 'stack' && (
          <div className="mx-auto w-full max-w-[720px] px-5 pb-3 sm:px-8">
            <div className="flex items-center gap-2 rounded-full bg-[hsl(var(--surface-2))] px-4 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="쌓아둔 기록에서 찾기" aria-label="기록 검색어"
                className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground/60"
              />
              <button type="button" aria-label="검색 닫기" onClick={() => { setQuery(''); setSearchOpen(false); }}
                className="shrink-0 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}
      </header>

      {/* 본문 */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[720px] px-5 pb-24 sm:px-8">
          {needSetup ? (
            <section className="pt-16">
              <h1 className="text-[26px] font-semibold leading-snug tracking-[-0.02em]">
                여기에 쌓아 두면,<br />필요할 때 이력서로 꺼내 드려요.
              </h1>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                지금 어디쯤인지 알려주시면 그에 맞는 칸을 준비할게요. 나중에 바꿔도 됩니다.
              </p>
              <ul className="mt-8 space-y-1">
                {(Object.keys(PERSONA_LABEL) as CareerPersona[]).map((p) => (
                  <li key={p}>
                    <button type="button" onClick={() => pickPersona(p)}
                      className="flex w-full items-baseline gap-3 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-[hsl(var(--surface-2))]">
                      <span className="text-[16px] font-semibold">{PERSONA_LABEL[p]}</span>
                      <span className="text-[13px] text-muted-foreground">{PERSONA_LINE[p]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : view === 'stack' ? (
            <>
              <div className="pb-6 pt-9">
                <Compose existingCategories={categories.map((c) => c.name)} onAdded={onAdded} />
                {sinceLabel && (
                  <p className="mt-3 text-[12px] text-muted-foreground/75">
                    지금까지 {items.length}개 · {sinceLabel}
                  </p>
                )}
              </div>
              <Column items={items} categories={categories} query={query} settledId={settled} onOpen={setEditing} />
            </>
          ) : (
            <div className="pt-9">
              <DocsPanel profile={profile} categories={categories} items={items} docs={boardDocs} boardName={activeBoard?.name ?? ''} />
            </div>
          )}
        </div>
      </main>

      {/* 바닥 줄 — 인적사항과 다른 버전으로 가는 길 */}
      <footer className="shrink-0 border-t border-[hsl(var(--hairline))]">
        <div className="mx-auto flex w-full max-w-[720px] items-center gap-4 px-5 py-2.5 text-[11.5px] text-muted-foreground sm:px-8">
          <button type="button" onClick={() => setProfileOpen(true)} className="underline-offset-4 transition-colors hover:text-foreground hover:underline">
            {profile.name ? `${profile.name} · 인적사항` : '인적사항 적기'}
          </button>
          <span className="text-muted-foreground/50">기록은 이 기기에만 저장돼요</span>
          <Link to="/career" className="ml-auto underline-offset-4 transition-colors hover:text-foreground hover:underline">v1</Link>
          <Link to="/career2" className="underline-offset-4 transition-colors hover:text-foreground hover:underline">v2</Link>
        </div>
      </footer>

      <RecordSheet item={editing} categories={categories} onClose={() => setEditing(null)} />
      {profileOpen && <ProfileSheet onClose={() => setProfileOpen(false)} />}
    </div>
  );
}

/** 인적사항 — 이력서 머리글에 그대로 실린다. */
function ProfileSheet({ onClose }: { onClose: () => void }) {
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

  const FIELD = 'w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-3 py-2 text-[14px] outline-none focus:border-[hsl(var(--c3-glow)/0.7)]';
  const LABEL = 'mb-1.5 block text-[11.5px] text-muted-foreground';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" aria-label="인적사항"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <header className="flex items-center justify-between border-b border-[hsl(var(--hairline))] px-5 py-3.5">
          <h2 className="text-[14.5px] font-semibold">인적사항</h2>
          <button type="button" aria-label="닫기" onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">이력서 맨 위에 그대로 실려요.</p>
          <label className="block"><span className={LABEL}>이름</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={FIELD} /></label>
          <label className="block"><span className={LABEL}>한 줄 소개</span>
            <textarea value={tagline} onChange={(e) => setTagline(e.target.value)} rows={2} className={cn(FIELD, 'resize-none leading-relaxed')} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className={LABEL}>이메일</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" className={FIELD} /></label>
            <label className="block"><span className={LABEL}>연락처</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={FIELD} /></label>
          </div>
          <label className="block"><span className={LABEL}>생년월일</span>
            <input value={birth} onChange={(e) => setBirth(e.target.value)} placeholder="적은 그대로 실려요" className={cn(FIELD, 'placeholder:text-muted-foreground/50')} /></label>
          <label className="block"><span className={LABEL}>대표 링크</span>
            <input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" className={FIELD} /></label>
        </div>
        <footer className="border-t border-[hsl(var(--hairline))] px-5 py-3.5 text-right">
          <button type="button" onClick={save} className="h-9 rounded-full bg-[hsl(var(--c3-glow))] px-5 text-[13px] font-semibold text-[hsl(220_16%_8%)]">저장</button>
        </footer>
      </aside>
    </>
  );
}
