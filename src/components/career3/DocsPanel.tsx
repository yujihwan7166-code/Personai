/**
 * 꺼내기 — 쌓은 기록으로 문서를 만든다. 만드는 줄 5개와 만들어둔 문서 목록.
 * 생성·PDF 로직은 v1·v2와 같은 aiComposeCareerDoc·exportElementToPdf 재사용.
 */
import { useMemo, useRef, useState } from 'react';
import { Copy, Download, FileDown, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { careerStore } from '@/services/careerStore';
import { aiComposeCareerDoc, type ComposePurpose } from '@/lib/career/ai';
import { exportElementToPdf, sanitizeFileName } from '@/lib/cloudCommon/pdfExport';
import type { CareerDoc, CareerProfile, SpecCategory, SpecItem } from '@/types/career';

const MAKES: Array<{ purpose: ComposePurpose; label: string; line: string }> = [
  { purpose: '이력서', label: '이력서', line: '쌓은 것 전부를 한 장으로 — 미리 보고 PDF로 저장' },
  { purpose: '자기소개서 초안', label: '자기소개서', line: '기록을 근거로 문단 초안을 써 줍니다' },
  { purpose: '포트폴리오 요약', label: '포트폴리오', line: '프로젝트와 성과만 골라 요약합니다' },
  { purpose: '경력기술서', label: '경력기술서', line: '맡은 역할과 결과를 항목별로 정리합니다' },
  { purpose: '커버레터', label: '커버레터', line: '지원처에 보낼 짧은 편지를 씁니다' },
];

const span = (i: SpecItem): string => {
  const f = (s: string) => s.slice(0, 7).replace('-', '.');
  if (i.ongoing) return `${f(i.date)} – 현재`;
  if (i.endDate && f(i.endDate) !== f(i.date)) return `${f(i.date)} – ${f(i.endDate)}`;
  return f(i.date);
};

interface Props {
  profile: CareerProfile;
  categories: SpecCategory[];
  items: SpecItem[];
  docs: CareerDoc[];
  boardName: string;
}

export function DocsPanel({ profile, categories, items, docs, boardName }: Props) {
  const [making, setMaking] = useState<ComposePurpose | null>(null);
  const [asking, setAsking] = useState<ComposePurpose | null>(null);
  const [request, setRequest] = useState('');
  const [viewer, setViewer] = useState<CareerDoc | null>(null);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);

  useEscapeKey(() => { setViewer(null); setResumeOpen(false); setAsking(null); }, { evenInInput: true });

  const sections = useMemo(
    () => categories.map((c) => ({ name: c.name, items: items.filter((i) => i.categoryId === c.id).sort((a, b) => b.date.localeCompare(a.date)) })),
    [categories, items],
  );
  const empty = items.length === 0;

  const make = async (purpose: ComposePurpose) => {
    setAsking(null);
    setMaking(purpose);
    try {
      const content = await aiComposeCareerDoc(purpose, sections, request.trim() || undefined);
      const doc = careerStore.addDoc({ purpose, content, request: request.trim() || undefined });
      setRequest('');
      setViewer(doc);
    } catch {
      notify.error('문서를 만들지 못했어요', { description: '잠시 후 다시 시도해 주세요.' });
    } finally {
      setMaking(null);
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

  const download = (doc: CareerDoc) => {
    const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${sanitizeFileName(`${doc.purpose}-${doc.createdAt.slice(0, 10)}`)}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-12">
      <section>
        <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
          {empty
            ? '기록이 있어야 문서를 만들 수 있어요. 이력서 미리보기는 지금도 열립니다.'
            : `쌓인 기록 ${items.length}개를 재료로 씁니다.`}
        </p>
        <ul className="divide-y divide-[hsl(var(--hairline))] border-y border-[hsl(var(--hairline))]">
          {MAKES.map(({ purpose, label, line }) => {
            const count = docs.filter((d) => d.purpose === purpose).length;
            const busy = making === purpose;
            const disabled = making !== null || (empty && purpose !== '이력서');
            return (
              <li key={purpose}>
                <button
                  type="button" disabled={disabled}
                  onClick={() => (purpose === '이력서' ? setResumeOpen(true) : setAsking(purpose))}
                  className={cn(
                    'group flex w-full items-baseline gap-4 py-4 text-left transition-colors hover:bg-[hsl(var(--surface-2))]',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[hsl(var(--c3-glow))]',
                    disabled && 'opacity-35 hover:bg-transparent',
                  )}
                >
                  <span className="w-[6.5rem] shrink-0 text-[15px] font-semibold">{label}</span>
                  <span className="min-w-0 flex-1 text-[13px] leading-snug text-muted-foreground">
                    {busy ? <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> 만드는 중</span> : line}
                  </span>
                  {count > 0 && <span className="shrink-0 tabular-nums text-[12px] text-[hsl(var(--c3-glow)/0.85)]">{count}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-[13px] font-semibold text-muted-foreground">만들어 둔 문서 {docs.length > 0 && <span className="font-normal tabular-nums text-muted-foreground/60">{docs.length}</span>}</h2>
        {docs.length === 0 ? (
          <p className="py-6 text-[13px] text-muted-foreground/70">아직 없어요</p>
        ) : (
          <ul className="space-y-1">
            {docs.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => setViewer(d)}
                  className="flex w-full items-baseline gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-[hsl(var(--surface-2))]">
                  <span className="text-[14px]">{d.purpose.replace(' 초안', '').replace(' 요약', '')}</span>
                  <span className="tabular-nums text-[11.5px] text-muted-foreground">{d.createdAt.slice(0, 10).replaceAll('-', '.')}</span>
                  {d.request && <span className="ml-auto hidden max-w-[45%] truncate text-[11.5px] text-muted-foreground/80 sm:block">{d.request}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 요청사항 */}
      {asking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" onClick={() => setAsking(null)}>
          <div className="w-full max-w-[420px] rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-semibold">{asking.replace(' 초안', '').replace(' 요약', '')} 만들기</h3>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-[12px] text-muted-foreground">강조할 것이 있나요 (선택)</span>
              <textarea value={request} onChange={(e) => setRequest(e.target.value)} rows={3} autoFocus
                placeholder="예: 백엔드 신입 지원, 협업 경험 위주로"
                className="w-full resize-none rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-3 py-2 text-[14px] leading-relaxed outline-none placeholder:text-muted-foreground/50 focus:border-[hsl(var(--c3-glow)/0.7)]" />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setAsking(null)} className="rounded-full px-4 py-2 text-[13px] text-muted-foreground hover:text-foreground">그만두기</button>
              <button type="button" onClick={() => void make(asking)} className="h-9 rounded-full bg-[hsl(var(--c3-glow))] px-5 text-[13px] font-semibold text-[hsl(220_16%_8%)]">만들기</button>
            </div>
          </div>
        </div>
      )}

      {/* 문서 열람 */}
      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" onClick={() => setViewer(null)}>
          <div className="flex max-h-[85vh] w-full max-w-[620px] flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-baseline gap-3 border-b border-[hsl(var(--hairline))] px-6 py-3.5">
              <h3 className="text-[15px] font-semibold">{viewer.purpose.replace(' 초안', '').replace(' 요약', '')}</h3>
              <span className="tabular-nums text-[11.5px] text-muted-foreground">{viewer.createdAt.slice(0, 10).replaceAll('-', '.')}</span>
              <span className="ml-auto flex items-center gap-1 self-center">
                <button type="button" aria-label="복사" title="복사"
                  onClick={() => { void navigator.clipboard.writeText(viewer.content); notify.success('복사했어요'); }}
                  className="rounded p-1.5 text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></button>
                <button type="button" aria-label="파일로 저장" title="파일로 저장 (.md)" onClick={() => download(viewer)}
                  className="rounded p-1.5 text-muted-foreground hover:text-foreground"><Download className="h-4 w-4" /></button>
                <button type="button" aria-label="닫기" onClick={() => setViewer(null)}
                  className="rounded p-1.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </span>
            </div>
            <div className="overflow-y-auto whitespace-pre-wrap px-6 py-5 text-[14px] leading-[1.8]">{viewer.content}</div>
            <div className="border-t border-[hsl(var(--hairline))] px-6 py-2.5 text-right">
              <button type="button" onClick={() => { careerStore.removeDoc(viewer.id); setViewer(null); }}
                className="text-[12px] text-muted-foreground underline-offset-4 hover:text-[hsl(4_70%_62%)] hover:underline">이 문서 지우기</button>
            </div>
          </div>
        </div>
      )}

      {/* 이력서 미리보기 → PDF (지면은 흰 종이 고정) */}
      {resumeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={() => setResumeOpen(false)}>
          <div className="flex max-h-[90vh] w-full max-w-[700px] flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[hsl(var(--hairline))] px-5 py-3.5">
              <h3 className="text-[15px] font-semibold">이력서 미리보기</h3>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => void exportResume()} disabled={exporting}
                  className={cn('flex h-9 items-center gap-2 rounded-full bg-[hsl(var(--c3-glow))] px-4 text-[13px] font-semibold text-[hsl(220_16%_8%)]', exporting && 'opacity-50')}>
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} PDF로 저장
                </button>
                <button type="button" aria-label="닫기" onClick={() => setResumeOpen(false)} className="rounded p-1.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="overflow-y-auto bg-[hsl(var(--surface-3))] p-6">
              <div ref={resumeRef} className="mx-auto w-full max-w-[620px] bg-white px-12 py-11 text-[#1a1a1a]" style={{ fontFamily: "'Pretendard Variable', 'Inter', sans-serif" }}>
                <p className="text-[26px] font-bold leading-none tracking-[-0.02em]">{profile.name || '이름을 적어주세요'}</p>
                {profile.tagline && <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#555]">{profile.tagline}</p>}
                <p className="mt-3 flex flex-wrap gap-x-4 text-[10.5px] tabular-nums text-[#666]">
                  {profile.email && <span>{profile.email}</span>}
                  {profile.phone && <span>{profile.phone}</span>}
                  {profile.birth && <span>{profile.birth}</span>}
                  {profile.link && <span>{profile.link}</span>}
                </p>
                <div className="mt-4 h-px bg-[#1a1a1a]" />
                {sections.filter((s) => s.items.length > 0).map((s) => (
                  <div key={s.name} className="mt-6" data-avoid-break>
                    <p className="mb-2 text-[12px] font-bold">{s.name}</p>
                    {s.items.map((i) => (
                      <div key={i.id} className="mb-2 grid grid-cols-[7rem_1fr] items-baseline gap-4">
                        <span className="text-[10.5px] tabular-nums text-[#777]">{span(i)}</span>
                        <span>
                          <span className="block text-[12px] leading-snug">{i.refined}</span>
                          {i.org && <span className="text-[10.5px] text-[#777]">{i.org}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
                {empty && <p className="mt-6 text-[11.5px] text-[#777]">기록이 없어요 — 쌓으면 여기 채워집니다.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
