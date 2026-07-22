/**
 * 발급 — 등록부의 기록으로 서류를 발급한다.
 * 상단: 발급 가능한 서류 목록(표), 하단: 발급 대장(발급된 서류의 기록).
 * 생성 로직은 v1과 동일한 aiComposeCareerDoc·exportElementToPdf 재사용.
 */
import { useMemo, useRef, useState } from 'react';
import { Copy, Download, FileDown, Loader2, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { careerStore } from '@/services/careerStore';
import { aiComposeCareerDoc, type ComposePurpose } from '@/lib/career/ai';
import { exportElementToPdf, sanitizeFileName } from '@/lib/cloudCommon/pdfExport';
import type { CareerDoc, CareerProfile, SpecCategory, SpecItem } from '@/types/career';

const PURPOSES: Array<{ purpose: ComposePurpose; desc: string }> = [
  { purpose: '이력서', desc: '등재 기록 전부를 서식에 얹어 PDF로' },
  { purpose: '자기소개서 초안', desc: '기록을 근거로 문단 초안을 작성' },
  { purpose: '포트폴리오 요약', desc: '프로젝트·성과 중심 한 장 요약' },
  { purpose: '경력기술서', desc: '경력·역할·성과를 항목별로 정리' },
  { purpose: '커버레터', desc: '지원처에 보내는 짧은 소개 서신' },
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
  const [askPurpose, setAskPurpose] = useState<ComposePurpose | null>(null);
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
      notify.error('발급에 실패했어요', { description: '잠시 후 다시 시도해 주세요.' });
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

  return (
    <div className="space-y-8">
      {/* 발급 신청 — 표 형식 */}
      <section>
        <div className="mb-1 flex items-baseline gap-2.5">
          <h3 className="text-[13.5px] font-bold tracking-[0.02em]">발급 신청</h3>
          <span aria-hidden className="h-px flex-1 self-center bg-[hsl(var(--hairline))]" />
        </div>
        <ul>
          {PURPOSES.map(({ purpose, desc }) => {
            const busy = generating === purpose;
            const disabled = generating !== null || (!hasSpecs && purpose !== '이력서');
            return (
              <li key={purpose} className="flex items-baseline gap-3 border-b border-[hsl(var(--hairline))] py-2 pl-1 last:border-b-0">
                <span className="w-[92px] shrink-0 text-[13.5px] font-semibold">{shortPurpose(purpose)}</span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">{desc}</span>
                <button
                  type="button" disabled={disabled}
                  onClick={() => (purpose === '이력서' ? setResumeOpen(true) : setAskPurpose(purpose))}
                  className={cn(
                    'c2-mono shrink-0 border border-[hsl(var(--career2-blue))] px-3 py-0.5 text-[12px] font-semibold text-[hsl(var(--career2-blue))] transition-colors hover:bg-[hsl(var(--career2-blue))] hover:text-white',
                    disabled && 'pointer-events-none opacity-35',
                  )}
                >
                  {busy ? '처리 중…' : purpose === '이력서' ? '미리보기' : '발급'}
                </button>
              </li>
            );
          })}
        </ul>
        {!hasSpecs && <p className="mt-2 pl-1 text-[12px] text-muted-foreground">등재 기록이 있어야 발급할 수 있습니다 — 이력서 미리보기는 지금도 열립니다</p>}
      </section>

      {/* 발급 대장 */}
      <section>
        <div className="mb-1 flex items-baseline gap-2.5">
          <h3 className="text-[13.5px] font-bold tracking-[0.02em]">발급 대장</h3>
          <span className="c2-mono text-[11px] text-muted-foreground">{docs.length}건</span>
          <span aria-hidden className="h-px flex-1 self-center bg-[hsl(var(--hairline))]" />
        </div>
        {docs.length === 0 ? (
          <p className="c2-mono py-1.5 pl-1 text-[11.5px] text-muted-foreground/60">발급 이력 없음</p>
        ) : (
          <ul>
            {docs.map((d) => (
              <li key={d.id} className="border-b border-[hsl(var(--hairline))] last:border-b-0">
                <button type="button" onClick={() => setViewer(d)}
                  className="grid w-full grid-cols-[96px_92px_1fr_auto] items-baseline gap-x-3 py-2 pl-1 pr-1.5 text-left transition-colors hover:bg-[hsl(var(--career2-blue)/0.05)]">
                  <span className="c2-mono text-[11.5px] text-muted-foreground">{d.createdAt.slice(0, 10).replaceAll('-', '.')}</span>
                  <span className="text-[13px] font-semibold">{shortPurpose(d.purpose)}</span>
                  <span className="min-w-0 truncate text-[12px] text-muted-foreground">{d.request || d.content.replace(/^#+\s*/gm, '').slice(0, 80)}</span>
                  <span className="c2-mono text-[11.5px] text-[hsl(var(--career2-blue))]">열람</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 요청사항 입력 */}
      {askPurpose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={() => setAskPurpose(null)}>
          <div className="c2-doc w-full max-w-[420px] bg-[hsl(var(--card))] p-6" onClick={(ev) => ev.stopPropagation()}>
            <h3 className="text-[15.5px] font-bold">{shortPurpose(askPurpose)} 발급</h3>
            <p className="c2-mono mt-0.5 text-[11.5px] text-muted-foreground">등재 기록 {items.length}건 기준</p>
            <textarea
              value={request} onChange={(e) => setRequest(e.target.value)} rows={3} autoFocus
              placeholder="지원 직무·강조점 (선택) — 예: 백엔드 신입, 협업 경험 강조"
              className="mt-3 w-full resize-none border-b border-[hsl(var(--input))] bg-transparent pb-1.5 text-[13.5px] leading-relaxed outline-none focus:border-[hsl(var(--career2-blue))]"
              aria-label="요청사항"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setAskPurpose(null)} className="px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground">취소</button>
              <button type="button" onClick={() => void generate(askPurpose)}
                className="border border-[hsl(var(--career2-blue))] bg-[hsl(var(--career2-blue))] px-4 py-1.5 text-[13px] font-semibold text-white">발급</button>
            </div>
          </div>
        </div>
      )}

      {/* 열람 */}
      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" onClick={() => setViewer(null)}>
          <div className="c2-doc flex max-h-[85vh] w-full max-w-[600px] flex-col bg-[hsl(var(--card))]" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-baseline gap-3 border-b border-[hsl(var(--hairline))] px-6 py-3">
              <span className="text-[14px] font-bold">{shortPurpose(viewer.purpose)}</span>
              <span className="c2-mono text-[11.5px] text-muted-foreground">{viewer.createdAt.slice(0, 10).replaceAll('-', '.')} 발급</span>
              <div className="ml-auto flex items-center gap-0.5 self-center">
                <button type="button" title="복사" aria-label="복사"
                  onClick={() => { void navigator.clipboard.writeText(viewer.content); notify.success('복사했어요'); }}
                  className="p-1.5 text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></button>
                <button type="button" title="파일로 저장 (.md)" aria-label="다운로드" onClick={() => downloadMd(viewer)}
                  className="p-1.5 text-muted-foreground hover:text-foreground"><Download className="h-4 w-4" /></button>
                <button type="button" title="발급 취소(삭제)" aria-label="삭제"
                  onClick={() => { careerStore.removeDoc(viewer.id); setViewer(null); }}
                  className="p-1.5 text-muted-foreground hover:text-[hsl(var(--career2-seal))]"><Trash2 className="h-4 w-4" /></button>
                <button type="button" aria-label="닫기 (Esc)" onClick={() => setViewer(null)} className="p-1.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="overflow-y-auto whitespace-pre-wrap px-6 py-5 text-[13.5px] leading-[1.75]">{viewer.content}</div>
          </div>
        </div>
      )}

      {/* 이력서 미리보기 → PDF — 등록부와 같은 증서 문법 */}
      {resumeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" onClick={() => setResumeOpen(false)}>
          <div className="flex max-h-[90vh] w-full max-w-[700px] flex-col border border-[hsl(var(--border))] bg-[hsl(var(--background))]" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[hsl(var(--hairline))] px-5 py-3">
              <h3 className="text-[14.5px] font-bold">이력서 미리보기</h3>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => void exportResume()} disabled={exporting}
                  className={cn('flex items-center gap-1.5 border border-[hsl(var(--career2-blue))] bg-[hsl(var(--career2-blue))] px-3.5 py-1.5 text-[12.5px] font-semibold text-white', exporting && 'opacity-50')}>
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} PDF 저장
                </button>
                <button type="button" aria-label="닫기 (Esc)" onClick={() => setResumeOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="overflow-y-auto bg-[hsl(var(--muted))] p-6">
              <div ref={resumeRef} className="relative mx-auto w-full max-w-[620px] border border-[#9aa4b5] bg-white px-11 py-10 text-[#1c2129]"
                style={{ fontFamily: "'Pretendard Variable', 'Inter', sans-serif" }}>
                <div className="pointer-events-none absolute inset-[5px] border border-[#d8dde6]" aria-hidden />
                <p className="c2-title text-center text-[26px] tracking-[0.5em] text-[#1c2129]" style={{ marginRight: '-0.5em', fontFamily: "'Nanum Myeongjo','Noto Serif KR',Batang,'바탕',serif", fontWeight: 700 }}>이력서</p>
                <div className="mt-5 border-t-2 border-[#2b4d9e] pt-4">
                  <p className="text-[19px] font-bold">{profile.name || '이름 미기재'}</p>
                  {profile.tagline && <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-[#4a5160]">{profile.tagline}</p>}
                  <p className="mt-2 flex flex-wrap gap-x-3 text-[10.5px] text-[#4a5160]" style={{ fontFamily: 'ui-monospace, Consolas, monospace' }}>
                    {profile.email && <span>{profile.email}</span>}
                    {profile.phone && <span>{profile.phone}</span>}
                    {profile.birth && <span>{profile.birth}</span>}
                    {profile.link && <span>{profile.link}</span>}
                  </p>
                </div>
                {sections.filter((s) => s.items.length > 0).map((s) => (
                  <div key={s.name} className="mt-5" data-avoid-break>
                    <div className="mb-1 flex items-baseline gap-2">
                      <p className="text-[12.5px] font-bold text-[#2b4d9e]">{s.name}</p>
                      <span className="h-px flex-1 self-center bg-[#e2e6ec]" aria-hidden />
                    </div>
                    {s.items.map((i) => (
                      <div key={i.id} className="mb-1 flex items-baseline gap-3">
                        <span className="w-[104px] shrink-0 text-[10.5px] text-[#6a7180]" style={{ fontFamily: 'ui-monospace, Consolas, monospace' }}>{periodLabel(i)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11.5px] leading-snug">{i.refined}</span>
                          {i.org && <span className="text-[10px] text-[#6a7180]">{i.org}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
                {items.length === 0 && <p className="mt-6 text-[11.5px] text-[#6a7180]">등재된 기록이 없습니다 — 등록부에서 기록을 접수하면 여기 채워집니다.</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
