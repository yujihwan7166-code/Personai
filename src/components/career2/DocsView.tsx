/**
 * v2 문서 뷰 — 5종 타일(이력서=미리보기→PDF, 나머지=AI 생성) + 생성된 문서 카드 그리드.
 * 생성 로직은 v1과 동일한 aiComposeCareerDoc·exportElementToPdf 재사용 (데이터 공유).
 */
import { useMemo, useRef, useState } from 'react';
import { Copy, Download, FileDown, FileText, Loader2, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { careerStore } from '@/services/careerStore';
import { aiComposeCareerDoc, type ComposePurpose } from '@/lib/career/ai';
import { exportElementToPdf, sanitizeFileName } from '@/lib/cloudCommon/pdfExport';
import type { CareerDoc, CareerProfile, SpecCategory, SpecItem } from '@/types/career';

const PURPOSES: Array<{ purpose: ComposePurpose; hint: string }> = [
  { purpose: '이력서', hint: '미리보기 → PDF' },
  { purpose: '자기소개서 초안', hint: 'AI 생성' },
  { purpose: '포트폴리오 요약', hint: 'AI 생성' },
  { purpose: '경력기술서', hint: 'AI 생성' },
  { purpose: '커버레터', hint: 'AI 생성' },
];

const shortPurpose = (p: string) => p.replace(' 초안', '').replace(' 요약', '');

const periodLabel = (i: SpecItem): string => {
  const f = (s: string) => s.slice(0, 7).replace('-', '.');
  if (i.ongoing) return `${f(i.date)}–현재`;
  if (i.endDate && f(i.endDate) !== f(i.date)) return `${f(i.date)}–${f(i.endDate)}`;
  return f(i.date);
};

interface Props {
  profile: CareerProfile;
  categories: SpecCategory[];
  items: SpecItem[];
  docs: CareerDoc[];
  boardName: string;
}

export function DocsView({ profile, categories, items, docs, boardName }: Props) {
  const [generating, setGenerating] = useState<ComposePurpose | null>(null);
  const [request, setRequest] = useState('');
  const [askPurpose, setAskPurpose] = useState<ComposePurpose | null>(null); // 요청사항 입력 단계
  const [viewer, setViewer] = useState<CareerDoc | null>(null);
  const [resumeOpen, setResumeOpen] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  useEscapeKey(() => { setViewer(null); setResumeOpen(false); setAskPurpose(null); }, { evenInInput: true });

  const sections = useMemo(
    () => categories.map((c) => ({ name: c.name, items: items.filter((i) => i.categoryId === c.id).sort((a, b) => b.date.localeCompare(a.date)) })),
    [categories, items],
  );
  const hasSpecs = items.length > 0;

  const generate = async (purpose: ComposePurpose) => {
    setAskPurpose(null);
    setGenerating(purpose);
    try {
      const content = await aiComposeCareerDoc(purpose, sections, request.trim() || undefined);
      const doc = careerStore.addDoc({ purpose, content, request: request.trim() || undefined });
      setRequest('');
      setViewer(doc);
    } catch {
      notify.error('생성에 실패했어요', { description: '잠시 후 다시 시도해 주세요.' });
    } finally {
      setGenerating(null);
    }
  };

  const exportResume = async () => {
    if (!resumeRef.current || exporting) return;
    setExporting(true);
    try {
      await exportElementToPdf(resumeRef.current, { fileName: sanitizeFileName(`이력서-${profile.name || boardName || '무제'}`) });
    } finally {
      setExporting(false);
    }
  };

  const downloadMd = (doc: CareerDoc) => {
    const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${sanitizeFileName(`${shortPurpose(doc.purpose)}-${doc.createdAt.slice(0, 10)}`)}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const field = 'w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-3 py-2 text-[13.5px] outline-none focus:border-[hsl(var(--career2-blue))]';

  return (
    <div className="space-y-5 pb-16">
      {/* 만들기 타일 */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        {PURPOSES.map(({ purpose, hint }) => {
          const count = docs.filter((d) => d.purpose === purpose).length;
          const busy = generating === purpose;
          return (
            <button
              key={purpose} type="button" disabled={generating !== null || (!hasSpecs && purpose !== '이력서')}
              onClick={() => (purpose === '이력서' ? setResumeOpen(true) : setAskPurpose(purpose))}
              className={cn(
                'group rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--career2-blue)/0.45)] hover:shadow-md',
                (generating !== null || (!hasSpecs && purpose !== '이력서')) && 'pointer-events-none opacity-50',
              )}
            >
              <FileText className="mb-2 h-4.5 w-4.5 h-[18px] w-[18px] text-[hsl(var(--career2-blue))]" />
              <p className="text-[13.5px] font-bold">{shortPurpose(purpose)}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                {busy ? <><Loader2 className="h-3 w-3 animate-spin" /> 생성 중…</> : <>{hint}{count > 0 && ` · ${count}개`}</>}
              </p>
            </button>
          );
        })}
      </div>
      {!hasSpecs && <p className="text-[12px] text-muted-foreground">스펙을 먼저 쌓으면 AI 문서를 만들 수 있어요 — 이력서 미리보기는 지금도 열려요</p>}

      {/* 보관함 */}
      <section>
        <h3 className="mb-2.5 text-[13px] font-semibold text-muted-foreground">만든 문서 {docs.length > 0 && `(${docs.length})`}</h3>
        {docs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[hsl(var(--input))] py-10 text-center text-[13px] text-muted-foreground">
            위 타일에서 첫 문서를 만들어보세요 — 만든 문서는 여기 쌓여요
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {docs.map((d) => (
              <button key={d.id} type="button" onClick={() => setViewer(d)}
                className="group rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-1 flex items-center justify-between">
                  <span className="rounded-full bg-[hsl(var(--career2-blue)/0.1)] px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--career2-blue))]">{shortPurpose(d.purpose)}</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{d.createdAt.slice(0, 10)}</span>
                </div>
                <p className="line-clamp-3 text-[12.5px] leading-relaxed text-muted-foreground">{d.content.replace(/^#+\s*/gm, '').slice(0, 160)}</p>
                {d.request && <p className="mt-1.5 truncate text-[11px] text-muted-foreground/80">요청: {d.request}</p>}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 요청사항 입력 */}
      {askPurpose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={() => setAskPurpose(null)}>
          <div className="w-full max-w-[420px] rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--background))] p-5 shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
            <h3 className="mb-1 text-[16px] font-bold">{shortPurpose(askPurpose)} 만들기</h3>
            <p className="mb-3 text-[12px] text-muted-foreground">현재 보드의 스펙 {items.length}건으로 만들어요</p>
            <textarea value={request} onChange={(e) => setRequest(e.target.value)} rows={3} autoFocus
              placeholder="지원 직무·강조하고 싶은 점 (선택) — 예: 백엔드 신입, 협업 경험 강조"
              className={cn(field, 'resize-none')} aria-label="요청사항" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setAskPurpose(null)} className="rounded-lg px-3 py-2 text-[13px] text-muted-foreground hover:bg-[hsl(var(--muted))]">취소</button>
              <button type="button" onClick={() => void generate(askPurpose)} className="rounded-xl bg-[hsl(var(--career2-blue))] px-4 py-2 text-[13.5px] font-semibold text-white">생성</button>
            </div>
          </div>
        </div>
      )}

      {/* 문서 뷰어 */}
      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" onClick={() => setViewer(null)}>
          <div className="flex max-h-[85vh] w-full max-w-[600px] flex-col rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--background))] shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-[hsl(var(--hairline))] px-5 py-3">
              <span className="rounded-full bg-[hsl(var(--career2-blue)/0.1)] px-2 py-0.5 text-[11.5px] font-semibold text-[hsl(var(--career2-blue))]">{shortPurpose(viewer.purpose)}</span>
              <span className="text-[12px] tabular-nums text-muted-foreground">{viewer.createdAt.slice(0, 10)}</span>
              <div className="ml-auto flex items-center gap-0.5">
                <button type="button" title="복사" aria-label="복사"
                  onClick={() => { void navigator.clipboard.writeText(viewer.content); notify.success('복사했어요'); }}
                  className="rounded p-1.5 text-muted-foreground hover:bg-[hsl(var(--muted))]"><Copy className="h-4 w-4" /></button>
                <button type="button" title="파일로 저장 (.md)" aria-label="다운로드" onClick={() => downloadMd(viewer)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-[hsl(var(--muted))]"><Download className="h-4 w-4" /></button>
                <button type="button" title="삭제" aria-label="삭제"
                  onClick={() => { careerStore.removeDoc(viewer.id); setViewer(null); }}
                  className="rounded p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                <button type="button" aria-label="닫기 (Esc)" onClick={() => setViewer(null)} className="rounded p-1.5 text-muted-foreground hover:bg-[hsl(var(--muted))]"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="overflow-y-auto whitespace-pre-wrap px-5 py-4 text-[13.5px] leading-relaxed">{viewer.content}</div>
          </div>
        </div>
      )}

      {/* 이력서 미리보기 → PDF */}
      {resumeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" onClick={() => setResumeOpen(false)}>
          <div className="flex max-h-[90vh] w-full max-w-[680px] flex-col rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--background))] shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[hsl(var(--hairline))] px-5 py-3">
              <h3 className="text-[15px] font-bold">이력서 미리보기</h3>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => void exportResume()} disabled={exporting}
                  className={cn('flex items-center gap-1.5 rounded-xl bg-[hsl(var(--career2-blue))] px-3.5 py-1.5 text-[12.5px] font-semibold text-white', exporting && 'opacity-50')}>
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} PDF 저장
                </button>
                <button type="button" aria-label="닫기 (Esc)" onClick={() => setResumeOpen(false)} className="rounded p-1.5 text-muted-foreground hover:bg-[hsl(var(--muted))]"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="overflow-y-auto bg-[hsl(var(--muted)/0.5)] p-5">
              {/* 인쇄 지면 — PDF 캡처 대상. 색은 잉크(검정+코발트 포인트)만 */}
              <div ref={resumeRef} className="mx-auto w-full max-w-[600px] bg-white px-10 py-9 text-[#1a1d22]" style={{ fontFamily: "'Pretendard Variable', 'Inter', sans-serif" }}>
                <div className="border-b-2 pb-4" style={{ borderColor: '#1d4fd8' }}>
                  <p className="text-[24px] font-bold tracking-tight">{profile.name || '이름을 프로필에 적어주세요'}</p>
                  {profile.tagline && <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#4a5160]">{profile.tagline}</p>}
                  <p className="mt-2 flex flex-wrap gap-x-3 text-[11px] text-[#4a5160]">
                    {profile.email && <span>{profile.email}</span>}
                    {profile.phone && <span>{profile.phone}</span>}
                    {profile.birth && <span>{profile.birth}</span>}
                    {profile.link && <span>{profile.link}</span>}
                  </p>
                </div>
                {sections.filter((s) => s.items.length > 0).map((s) => (
                  <div key={s.name} className="mt-5" data-avoid-break>
                    <p className="mb-1.5 text-[13px] font-bold tracking-wide" style={{ color: '#1d4fd8' }}>{s.name}</p>
                    {s.items.map((i) => (
                      <div key={i.id} className="mb-1.5 flex items-baseline gap-3">
                        <span className="w-[108px] shrink-0 text-[10.5px] tabular-nums text-[#6a7180]">{periodLabel(i)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12px] leading-snug">{i.refined}</span>
                          {i.org && <span className="text-[10.5px] text-[#6a7180]">{i.org}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
                {items.length === 0 && <p className="mt-6 text-[12px] text-[#6a7180]">아직 기록이 없어요 — 대시보드에서 스펙을 쌓으면 여기 채워져요.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
