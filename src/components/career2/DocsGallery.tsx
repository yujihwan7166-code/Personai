/**
 * 문서 — UI Pro Max 가 Resume/CV Builder 에 권장한 "Template Selection Gallery".
 * 종류마다 종이 축소판(선으로만 그린 추상 미리보기) + 만든 문서 목록.
 * 생성·PDF 로직은 v1 과 같은 aiComposeCareerDoc·exportElementToPdf 재사용.
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

type Thumb = 'resume' | 'letter' | 'grid' | 'report' | 'note';

const TEMPLATES: Array<{ purpose: ComposePurpose; short: string; desc: string; thumb: Thumb }> = [
  { purpose: '이력서', short: '이력서', desc: '기록 전부를 한 장으로 · PDF', thumb: 'resume' },
  { purpose: '자기소개서 초안', short: '자기소개서', desc: '기록을 근거로 문단 초안', thumb: 'letter' },
  { purpose: '포트폴리오 요약', short: '포트폴리오', desc: '프로젝트·성과 중심 요약', thumb: 'grid' },
  { purpose: '경력기술서', short: '경력기술서', desc: '역할과 성과를 항목별로', thumb: 'report' },
  { purpose: '커버레터', short: '커버레터', desc: '지원처에 보내는 짧은 편지', thumb: 'note' },
];

const period = (i: SpecItem): string => {
  const f = (s: string) => s.slice(0, 7).replace('-', '.');
  if (i.ongoing) return `${f(i.date)} – 현재`;
  if (i.endDate && f(i.endDate) !== f(i.date)) return `${f(i.date)} – ${f(i.endDate)}`;
  return f(i.date);
};

/** 종이 축소판 — 이미지 없이 선으로만. 종류마다 다른 구성. */
function PaperThumb({ kind }: { kind: Thumb }) {
  const bar = (w: string, dark?: boolean) => (
    <span className={cn('block h-[3px]', dark ? 'bg-[hsl(var(--foreground)/0.55)]' : 'bg-[hsl(var(--foreground)/0.16)]')} style={{ width: w }} />
  );
  return (
    <div className="mb-3 flex h-[92px] items-start justify-center border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))] p-3">
      <div className="flex w-full max-w-[112px] flex-col gap-[5px]">
        {kind === 'resume' && (<>
          {bar('58%', true)}{bar('34%')}
          <span className="my-1 block h-px w-full bg-[hsl(var(--c2-laurel)/0.5)]" />
          {bar('100%')}{bar('86%')}{bar('92%')}{bar('70%')}
        </>)}
        {kind === 'letter' && (<>
          {bar('40%', true)}
          <span className="my-1 block h-px w-full bg-[hsl(var(--hairline))]" />
          {bar('100%')}{bar('96%')}{bar('100%')}{bar('88%')}{bar('52%')}
        </>)}
        {kind === 'grid' && (<>
          {bar('46%', true)}
          <span className="mt-1 grid grid-cols-2 gap-[5px]">
            {[0, 1, 2, 3].map((i) => <span key={i} className="block h-[18px] bg-[hsl(var(--foreground)/0.12)]" />)}
          </span>
        </>)}
        {kind === 'report' && (<>
          {bar('50%', true)}
          <span className="my-1 block h-px w-full bg-[hsl(var(--hairline))]" />
          <span className="flex gap-2">{bar('26%', true)}{bar('60%')}</span>
          <span className="flex gap-2">{bar('26%', true)}{bar('48%')}</span>
          <span className="flex gap-2">{bar('26%', true)}{bar('66%')}</span>
        </>)}
        {kind === 'note' && (<>
          {bar('30%')}
          <span className="mt-2" />
          {bar('100%')}{bar('94%')}{bar('62%')}
          <span className="mt-2" />{bar('38%', true)}
        </>)}
      </div>
    </div>
  );
}

interface Props {
  profile: CareerProfile;
  categories: SpecCategory[];
  items: SpecItem[];
  docs: CareerDoc[];
  boardName: string;
}

export function DocsGallery({ profile, categories, items, docs, boardName }: Props) {
  const [generating, setGenerating] = useState<ComposePurpose | null>(null);
  const [request, setRequest] = useState('');
  const [asking, setAsking] = useState<ComposePurpose | null>(null);
  const [viewer, setViewer] = useState<CareerDoc | null>(null);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);

  useEscapeKey(() => { setViewer(null); setResumeOpen(false); setAsking(null); }, { evenInInput: true });

  const sections = useMemo(
    () => categories.map((c) => ({ name: c.name, items: items.filter((i) => i.categoryId === c.id).sort((a, b) => b.date.localeCompare(a.date)) })),
    [categories, items],
  );
  const hasItems = items.length > 0;

  const generate = async (purpose: ComposePurpose) => {
    setAsking(null);
    setGenerating(purpose);
    try {
      const content = await aiComposeCareerDoc(purpose, sections, request.trim() || undefined);
      const doc = careerStore.addDoc({ purpose, content, request: request.trim() || undefined });
      setRequest('');
      setViewer(doc);
    } catch {
      notify.error('문서를 만들지 못했어요', { description: '잠시 후 다시 시도해 주세요.' });
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
    a.download = `${sanitizeFileName(`${doc.purpose}-${doc.createdAt.slice(0, 10)}`)}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-10">
      {/* 템플릿 갤러리 */}
      <section>
        <div className="mb-3 flex items-baseline gap-3 border-b-2 border-[hsl(var(--foreground))] pb-1.5">
          <span className="c2-num c2-eyebrow text-[11px] text-[hsl(var(--c2-laurel))]">01</span>
          <h2 className="text-[17px] font-bold">문서 만들기</h2>
          {!hasItems && <span className="ml-auto text-[12px] text-muted-foreground">기록을 먼저 쌓아주세요</span>}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {TEMPLATES.map(({ purpose, short, desc, thumb }) => {
            const count = docs.filter((d) => d.purpose === purpose).length;
            const busy = generating === purpose;
            const disabled = generating !== null || (!hasItems && purpose !== '이력서');
            return (
              <button
                key={purpose} type="button" disabled={disabled}
                onClick={() => (purpose === '이력서' ? setResumeOpen(true) : setAsking(purpose))}
                className={cn(
                  'group border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] p-3 text-left transition-colors',
                  'hover:border-[hsl(var(--c2-laurel))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--c2-laurel))]',
                  disabled && 'cursor-not-allowed opacity-40 hover:border-[hsl(var(--hairline))]',
                )}
              >
                <PaperThumb kind={thumb} />
                <p className="text-[13.5px] font-bold">{short}</p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                  {busy ? <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> 만드는 중</span> : desc}
                </p>
                {count > 0 && <p className="c2-num mt-1.5 text-[11px] text-[hsl(var(--c2-laurel))]">{count}건 만듦</p>}
              </button>
            );
          })}
        </div>
      </section>

      {/* 만든 문서 */}
      <section>
        <div className="mb-2 flex items-baseline gap-3 border-b-2 border-[hsl(var(--foreground))] pb-1.5">
          <span className="c2-num c2-eyebrow text-[11px] text-[hsl(var(--c2-laurel))]">02</span>
          <h2 className="text-[17px] font-bold">만든 문서</h2>
          <span className="c2-num ml-auto text-[12px] text-muted-foreground">{docs.length}</span>
        </div>
        {docs.length === 0 ? (
          <p className="py-6 text-[12.5px] text-muted-foreground/70">아직 만든 문서가 없어요</p>
        ) : (
          <ul>
            {docs.map((d) => (
              <li key={d.id} className="border-b border-[hsl(var(--hairline))]">
                <button
                  type="button" onClick={() => setViewer(d)}
                  className="grid w-full grid-cols-[6.5rem_1fr] items-baseline gap-x-4 py-2.5 text-left transition-colors hover:bg-[hsl(var(--c2-laurel)/0.06)] sm:grid-cols-[6.5rem_7rem_1fr]"
                >
                  <span className="c2-num text-[12.5px] text-muted-foreground">{d.createdAt.slice(0, 10).replaceAll('-', '.')}</span>
                  <span className="text-[14px] font-semibold">{d.purpose.replace(' 초안', '').replace(' 요약', '')}</span>
                  <span className="hidden truncate text-[12.5px] text-muted-foreground sm:block">
                    {d.request || d.content.replace(/^#+\s*/gm, '').slice(0, 70)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 요청사항 */}
      {asking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" onClick={() => setAsking(null)}>
          <div className="w-full max-w-[440px] border border-[hsl(var(--foreground))] bg-[hsl(var(--card))] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold">{asking.replace(' 초안', '').replace(' 요약', '')} 만들기</h3>
            <p className="c2-num mt-1 text-[12px] text-muted-foreground">기록 {items.length}건을 재료로 씁니다</p>
            <label className="mt-5 block">
              <span className="c2-eyebrow mb-1.5 block text-[10px] text-muted-foreground">요청사항 (선택)</span>
              <textarea
                value={request} onChange={(e) => setRequest(e.target.value)} rows={3} autoFocus
                placeholder="예: 백엔드 신입, 협업 경험 강조"
                className="w-full resize-none border-b border-[hsl(var(--input))] bg-transparent pb-1.5 text-[14px] leading-relaxed outline-none placeholder:text-muted-foreground/50 focus:border-[hsl(var(--c2-laurel))]"
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setAsking(null)} className="px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground">취소</button>
              <button type="button" onClick={() => void generate(asking)} className="h-9 bg-[hsl(var(--c2-laurel))] px-5 text-[13px] font-semibold text-white">만들기</button>
            </div>
          </div>
        </div>
      )}

      {/* 문서 열람 */}
      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" onClick={() => setViewer(null)}>
          <div className="flex max-h-[85vh] w-full max-w-[620px] flex-col border border-[hsl(var(--foreground))] bg-[hsl(var(--card))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-baseline gap-3 border-b-2 border-[hsl(var(--foreground))] px-6 py-3">
              <h3 className="text-[15px] font-bold">{viewer.purpose.replace(' 초안', '').replace(' 요약', '')}</h3>
              <span className="c2-num text-[12px] text-muted-foreground">{viewer.createdAt.slice(0, 10).replaceAll('-', '.')}</span>
              <span className="ml-auto flex items-center gap-1 self-center">
                <button type="button" aria-label="복사" title="복사"
                  onClick={() => { void navigator.clipboard.writeText(viewer.content); notify.success('복사했어요'); }}
                  className="p-1.5 text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></button>
                <button type="button" aria-label="파일로 저장" title="파일로 저장 (.md)" onClick={() => downloadMd(viewer)}
                  className="p-1.5 text-muted-foreground hover:text-foreground"><Download className="h-4 w-4" /></button>
                <button type="button" aria-label="닫기" onClick={() => setViewer(null)}
                  className="p-1.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </span>
            </div>
            <div className="overflow-y-auto whitespace-pre-wrap px-6 py-5 text-[14px] leading-[1.75]">{viewer.content}</div>
            <div className="border-t border-[hsl(var(--hairline))] px-6 py-2.5 text-right">
              <button type="button" onClick={() => { careerStore.removeDoc(viewer.id); setViewer(null); }}
                className="text-[12.5px] text-muted-foreground underline-offset-4 hover:text-red-600 hover:underline">이 문서 지우기</button>
            </div>
          </div>
        </div>
      )}

      {/* 이력서 미리보기 → PDF */}
      {resumeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" onClick={() => setResumeOpen(false)}>
          <div className="flex max-h-[90vh] w-full max-w-[700px] flex-col border border-[hsl(var(--foreground))] bg-[hsl(var(--background))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b-2 border-[hsl(var(--foreground))] px-5 py-3">
              <h3 className="text-[15px] font-bold">이력서 미리보기</h3>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => void exportResume()} disabled={exporting}
                  className={cn('flex h-9 items-center gap-2 bg-[hsl(var(--c2-laurel))] px-4 text-[13px] font-semibold text-white', exporting && 'opacity-50')}>
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} PDF로 저장
                </button>
                <button type="button" aria-label="닫기" onClick={() => setResumeOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="overflow-y-auto bg-[hsl(var(--muted))] p-6">
              {/* 인쇄 지면 — Swiss 그리드 그대로, 잉크는 검정 + 월계수 한 줄 */}
              <div ref={resumeRef} className="mx-auto w-full max-w-[620px] bg-white px-12 py-11 text-[#0a0a0a]"
                style={{ fontFamily: "'Pretendard Variable', 'Inter', sans-serif" }}>
                <div className="border-b-2 border-[#0a0a0a] pb-4">
                  <p className="text-[27px] font-bold leading-none tracking-[-0.02em]">{profile.name || '이름을 적어주세요'}</p>
                  {profile.tagline && <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#52525b]">{profile.tagline}</p>}
                  <p className="mt-3 flex flex-wrap gap-x-4 text-[10.5px] text-[#52525b]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {profile.email && <span>{profile.email}</span>}
                    {profile.phone && <span>{profile.phone}</span>}
                    {profile.birth && <span>{profile.birth}</span>}
                    {profile.link && <span>{profile.link}</span>}
                  </p>
                </div>
                {sections.filter((s) => s.items.length > 0).map((s) => (
                  <div key={s.name} className="mt-6" data-avoid-break>
                    <p className="mb-2 border-b border-[#d4d4d8] pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4d7c0f]">{s.name}</p>
                    {s.items.map((i) => (
                      <div key={i.id} className="mb-2 grid grid-cols-[7rem_1fr] items-baseline gap-4">
                        <span className="text-[10.5px] text-[#71717a]" style={{ fontVariantNumeric: 'tabular-nums' }}>{period(i)}</span>
                        <span>
                          <span className="block text-[12px] leading-snug">{i.refined}</span>
                          {i.org && <span className="text-[10.5px] text-[#71717a]">{i.org}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
                {items.length === 0 && <p className="mt-6 text-[11.5px] text-[#71717a]">기록이 없어요 — 기록을 쌓으면 여기 채워집니다.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
