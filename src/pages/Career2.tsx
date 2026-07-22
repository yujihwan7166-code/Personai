/**
 * 마이 커리어 v2 — /career2 "커리어 등록부" (증명서·등본 vernacular).
 *
 * v1(/career, 교정 중인 원고)이 "쓰는 중"이라면 v2는 "발급된 공부(公簿)" —
 * 등본식 마스트헤드(명조 자간 제목 + 문서번호 + 직인) 아래 괘선 대장이 이어진다.
 * 보드 = 서류철 탭, 항목 = 등재 행(접수 순번), 문서 = 발급.
 * 데이터는 v1과 같은 careerStore 공유. 카드·그림자·알약 없음.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useCareerBoard } from '@/hooks/useCareer';
import { careerStore } from '@/services/careerStore';
import { PERSONA_LABEL, type CareerPersona, type SpecItem } from '@/types/career';
import { QuickAddBar } from '@/components/career2/QuickAddBar';
import { CategoryGrid } from '@/components/career2/CategoryGrid';
import { ItemDialog } from '@/components/career2/ItemDialog';
import { DocsView } from '@/components/career2/DocsView';

type View = 'registry' | 'issue';

/** 신분별 시작 칸 — v1과 동일 세트 (같은 데이터 위에서 같은 규칙). */
const SEED_CATEGORIES: Record<CareerPersona, string[]> = {
  highschool: ['수상', '동아리·활동', '봉사', '자격증', '독서'],
  student: ['자격증', '어학', '동아리·활동', '공모전', '수상'],
  jobseeker: ['자격증', '어학', '인턴', '프로젝트', '수상'],
  worker: ['경력', '프로젝트', '자격증', '수상', '교육'],
};

const todayDot = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
};

export default function Career2() {
  const { items, categories, profile, docs, boards, activeBoardId } = useCareerBoard();
  const [view, setView] = useState<View>('registry');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<SpecItem | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [addingBoard, setAddingBoard] = useState(false);
  const [boardName, setBoardName] = useState('');
  const freshTimer = useRef<number | null>(null);

  const activeBoard = boards.find((b) => b.id === activeBoardId);
  const boardIdx = Math.max(0, boards.findIndex((b) => b.id === activeBoardId));
  const boardDocs = useMemo(() => docs.filter((d) => d.boardId === activeBoardId), [docs, activeBoardId]);

  useEffect(() => () => { if (freshTimer.current) window.clearTimeout(freshTimer.current); }, []);

  const onAdded = useCallback((_category: string, itemId: string) => {
    setFresh(itemId);
    if (freshTimer.current) window.clearTimeout(freshTimer.current);
    freshTimer.current = window.setTimeout(() => setFresh(null), 2100);
  }, []);

  const pickPersona = (p: CareerPersona) => {
    careerStore.setProfile({ persona: p });
    for (const name of SEED_CATEGORIES[p]) careerStore.ensureCategory(name);
  };

  const addBoard = () => {
    const name = boardName.trim();
    if (!name) { setAddingBoard(false); return; }
    careerStore.addBoard(name, { persona: profile.persona });
    setBoardName(''); setAddingBoard(false); setView('registry');
  };

  const thisYear = new Date().getFullYear();
  const lastUpdated = items[0]?.updatedAt?.slice(0, 10).replaceAll('-', '.');
  const stats = useMemo(() => ({
    total: items.length,
    thisYear: items.filter((i) => i.date.startsWith(String(thisYear))).length,
    ongoing: items.filter((i) => i.ongoing).length,
  }), [items, thisYear]);

  const needSetup = !profile.persona;

  const folderTab = (active: boolean) =>
    cn(
      'relative -mb-px max-w-[160px] truncate border border-b-0 px-3.5 py-1.5 text-[12px] transition-colors',
      active
        ? 'z-10 border-[hsl(215_16%_70%)] bg-[hsl(var(--card))] font-bold text-foreground dark:border-[hsl(217_11%_32%)]'
        : 'border-transparent text-muted-foreground hover:text-foreground',
    );

  return (
    <div className="career2-theme h-dvh overflow-y-auto bg-background text-foreground">
      <div className="mx-auto w-full max-w-[920px] px-3 pb-16 pt-6 sm:px-6">
        {/* 서류철 탭 줄 — 보드 */}
        <div className="flex items-end px-1" role="tablist" aria-label="보드">
          {boards.map((b) => (
            <button key={b.id} type="button" role="tab" aria-selected={b.id === activeBoardId}
              onClick={() => { careerStore.setActiveBoard(b.id); setView('registry'); }}
              className={folderTab(b.id === activeBoardId)}>
              {b.name}
            </button>
          ))}
          {addingBoard ? (
            <input
              value={boardName} autoFocus onChange={(e) => setBoardName(e.target.value)}
              onBlur={addBoard}
              onKeyDown={(e) => { if (e.key === 'Enter') addBoard(); if (e.key === 'Escape') { setBoardName(''); setAddingBoard(false); } }}
              placeholder="서류철 이름"
              className="-mb-px w-32 border border-b-0 border-[hsl(var(--career2-blue))] bg-[hsl(var(--card))] px-3 py-1.5 text-[12px] outline-none"
              aria-label="새 보드 이름"
            />
          ) : (
            <button type="button" onClick={() => setAddingBoard(true)} title="새 보드(서류철)"
              className="px-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground" aria-label="새 보드">
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          <Link to="/career" className="c2-mono ml-auto pb-1 pr-1 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            v1 원고 버전 →
          </Link>
        </div>

        {/* ── 증서 본체 ── */}
        <div className="c2-doc bg-[hsl(var(--card))] px-5 pb-12 pt-9 sm:px-10">
          {/* 마스트헤드 — 등본 문법 */}
          <header className="relative">
            <p className="c2-mono text-center text-[10.5px] tracking-[0.14em] text-muted-foreground">
              문서 제 {thisYear}-{boardIdx + 1} 호
            </p>
            <h1 className="c2-title mt-2 text-center text-[26px] leading-tight tracking-[0.42em] sm:text-[31px]" style={{ marginRight: '-0.42em' }}>
              커리어등록부
            </h1>
            <p className="c2-mono mt-2.5 text-center text-[11px] leading-relaxed text-muted-foreground">
              {activeBoard?.name ?? ''} · 등재 {stats.total}건{stats.thisYear > 0 && ` (올해 ${stats.thisYear})`}{stats.ongoing > 0 && ` · 진행 중 ${stats.ongoing}`} · 발급 {boardDocs.length}건
              {lastUpdated && <><br />최근 갱신 {lastUpdated} · 이 기기에서만 보관</>}
            </p>
            {/* 직인 — 시그니처. 기록이 있어야 찍힌다. */}
            {stats.total > 0 && (
              <div className="c2-seal absolute -top-1 right-0 hidden sm:flex" aria-hidden>
                <span className="c2-title text-[15px] leading-[1.15]">등재<br />검인</span>
              </div>
            )}
            <button
              type="button" onClick={() => setProfileOpen(true)}
              className="c2-mono absolute -top-1 left-0 hidden text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline sm:block"
              title="이력서 인적사항 수정"
            >
              {profile.name ? `기재자 ${profile.name}` : '기재자 미기재 — 설정'}
            </button>
          </header>

          {/* 탭 — 등록부 | 발급 */}
          <div className="mt-7 flex items-baseline gap-5 border-b border-[hsl(var(--border))]" role="tablist" aria-label="구분">
            {([['registry', '등록부'], ['issue', '발급']] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)}
                className={cn('-mb-px border-b-2 pb-1.5 text-[13.5px] transition-colors',
                  view === id
                    ? 'border-[hsl(var(--career2-blue))] font-bold text-[hsl(var(--career2-blue))]'
                    : 'border-transparent text-muted-foreground hover:text-foreground')}>
                {label}
              </button>
            ))}
            {view === 'registry' && !needSetup && (
              <div className="relative ml-auto self-center pb-1">
                <Search className="pointer-events-none absolute left-0 top-1/2 h-3 w-3 -translate-y-[70%] text-muted-foreground" />
                <input
                  value={query} onChange={(e) => setQuery(e.target.value)} placeholder="기록 검색" aria-label="기록 검색"
                  className="w-32 border-b border-transparent bg-transparent pb-0.5 pl-[18px] text-[12px] outline-none transition-all placeholder:text-muted-foreground/60 focus:w-44 focus:border-[hsl(var(--input))]"
                />
                {query && (
                  <button type="button" aria-label="검색 지우기" onClick={() => setQuery('')}
                    className="absolute right-0 top-1/2 -translate-y-[70%] text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                )}
              </div>
            )}
          </div>

          {/* 본문 */}
          {needSetup ? (
            <div className="mx-auto max-w-[420px] py-12 text-center">
              <p className="c2-title text-[17px] tracking-[0.08em]">신규 등록</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                신분을 선택하면 그에 맞는 부(部)가 준비됩니다.<br />나중에 자유롭게 바꿀 수 있어요.
              </p>
              <div className="mx-auto mt-6 grid max-w-[340px] grid-cols-2 gap-2">
                {(Object.keys(PERSONA_LABEL) as CareerPersona[]).map((p) => (
                  <button key={p} type="button" onClick={() => pickPersona(p)}
                    className="border border-[hsl(var(--border))] px-3 py-2.5 text-[13.5px] font-semibold transition-colors hover:border-[hsl(var(--career2-blue))] hover:text-[hsl(var(--career2-blue))]">
                    {PERSONA_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
          ) : view === 'registry' ? (
            <>
              <div className="mt-6"><QuickAddBar existingCategories={categories.map((c) => c.name)} onAdded={onAdded} /></div>
              <div className="mt-7">
                <CategoryGrid categories={categories} items={items} query={query} freshItemId={fresh} onEdit={setEditing} />
              </div>
            </>
          ) : (
            <div className="mt-6">
              <DocsView profile={profile} categories={categories} items={items} docs={boardDocs} boardName={activeBoard?.name ?? ''} />
            </div>
          )}
        </div>

        <p className="c2-mono mt-3 text-center text-[10.5px] text-muted-foreground/70">
          위 기록은 본인이 접수한 그대로이며, 이 기기 밖으로 나가지 않습니다.
        </p>
      </div>

      <ItemDialog item={editing} categories={categories} onClose={() => setEditing(null)} />
      {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}
    </div>
  );
}

/** 기재자(이력서 인적사항) — v1과 같은 careerStore.setProfile. */
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

  const field = 'w-full border-b border-[hsl(var(--input))] bg-transparent pb-1.5 text-[13.5px] outline-none focus:border-[hsl(var(--career2-blue))]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="c2-doc w-full max-w-[420px] bg-[hsl(var(--card))] p-6" onClick={(ev) => ev.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[15.5px] font-bold">기재자 정보</h3>
          <button type="button" aria-label="닫기 (Esc)" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <p className="c2-mono mb-4 text-[11px] text-muted-foreground">이력서 머리글에 그대로 실립니다 · {todayDot()} 기준</p>
        <div className="space-y-3.5">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" className={field} aria-label="이름" />
          <textarea value={tagline} onChange={(e) => setTagline(e.target.value)} rows={2} placeholder="짧은 소개" className={cn(field, 'resize-none leading-relaxed')} aria-label="소개" />
          <div className="flex gap-3">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일 (선택)" className={field} aria-label="이메일" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="연락처 (선택)" className={field} aria-label="연락처" />
          </div>
          <div className="flex gap-3">
            <input value={birth} onChange={(e) => setBirth(e.target.value)} placeholder="생년월일 (선택)" className={field} aria-label="생년월일" />
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="대표 링크 (선택)" className={field} aria-label="대표 링크" />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={save} className="border border-[hsl(var(--career2-blue))] bg-[hsl(var(--career2-blue))] px-4 py-1.5 text-[13px] font-semibold text-white">저장</button>
        </div>
      </div>
    </div>
  );
}
