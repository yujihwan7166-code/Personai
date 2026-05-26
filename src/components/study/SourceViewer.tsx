import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { Upload, Link2, Youtube, Mic, X, Plus, CheckCircle2, CircleOff, Clipboard, Loader2, AlertCircle, MessageSquare, FileText, ListChecks, Sparkles, Copy } from 'lucide-react';
import type { StudyNotebook, StudySource } from '@/types/study';
import { newId } from '@/types/study';
import { PPTX_MIME } from '@/lib/fileProcessor';
import { filesToStudySources } from '@/lib/studySourceFromFile';
import { LazyMarkdown } from '@/components/LazyMarkdown';
import { StudyBtn } from './ui/primitives';
import { NotebookIcon } from './NotebookIcon';
import { cn } from '@/lib/utils';
import type { AutoOcrProgress } from '@/hooks/useStudyAutoOcr';
import { isStudySourceTextPending } from '@/lib/studySourceReadiness';
import { formatStudyCharCount } from '@/lib/studyFormat';
import { getEffectiveOcrPages } from '@/lib/studyOcrPages';

const PdfViewer = lazy(() => import('./viewers/PdfViewer').then((m) => ({ default: m.PdfViewer })));
const PptxViewer = lazy(() => import('./viewers/PptxViewer').then((m) => ({ default: m.PptxViewer })));
const DocxViewer = lazy(() => import('./viewers/DocxViewer').then((m) => ({ default: m.DocxViewer })));

interface Props {
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  onStartRecording: () => void;
  /** 요약/퀴즈에서 [p.N] 클릭 시 전달되는 페이지 번호. 뷰어 스크롤 동기화용. */
  activePage?: number;
  /** 뷰어 내부 페이지 변경을 상위로 알릴 때. */
  onActivePageChange?: (page: number | undefined) => void;
  ocrProgress?: AutoOcrProgress;
  /** 외부 CTA가 원본 추가 메뉴를 열라고 요청할 때 증가하는 값. */
  openAddRequest?: number;
}

/**
 * 파일의 원본 소스를 보여주는 뷰어.
 * - 소스 없음: 업로드 허브
 * - 텍스트/paste: 마크다운
 * - PDF: 추출된 텍스트 (향후 pdfjs 렌더로 교체)
 * - URL/YouTube: 추출 텍스트 + 원본 링크
 */
const askPrompt = (prompt: string) => {
  window.dispatchEvent(new CustomEvent('study:askSelection', { detail: { prompt } }));
};

const buildSourceSelectionPrompt = (text: string) => {
  const excerpt = text.replace(/\s+/g, ' ').trim().slice(0, 2400);
  return `다음 원문 발췌를 기준으로 핵심 의미와 시험 포인트를 설명해줘.\n\n"${excerpt}"`;
};

const askSelection = (text: string) => {
  const prompt = buildSourceSelectionPrompt(text);
  window.dispatchEvent(new CustomEvent('study:askSelection', { detail: { prompt } }));
};

const SOURCE_KIND_LABEL: Partial<Record<StudySource['kind'], string>> = {
  pdf: 'PDF',
  pptx: 'PPTX',
  docx: 'DOCX',
  paste: '텍스트',
  url: '웹',
  youtube: '영상',
  recording: '녹음',
};

const getSourceKindLabel = (kind: StudySource['kind']) => SOURCE_KIND_LABEL[kind] ?? kind.toUpperCase();
const isUntitledStudyTitle = (title: string) => ['새 자료', '새 파일', '새 노트북'].includes(title.trim());
type SourceAddMode = 'menu' | 'paste' | 'url' | 'youtube' | null;

export function SourceViewer({ notebook, onChange, onStartRecording, activePage, onActivePageChange, ocrProgress, openAddRequest }: Props) {
  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const [addingSources, setAddingSources] = useState(false);
  const [addMode, setAddMode] = useState<SourceAddMode>(null);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<string | undefined>(() => notebook.sources[0]?.id);
  const source = notebook.sources.find((s) => s.id === activeSourceId) ?? notebook.sources[0];

  useEffect(() => {
    if (notebook.sources.length === 0) {
      setActiveSourceId(undefined);
      return;
    }
    if (!activeSourceId || !notebook.sources.some((s) => s.id === activeSourceId)) {
      setActiveSourceId(notebook.sources[0].id);
    }
  }, [activeSourceId, notebook.sources]);

  useEffect(() => {
    if (addMode === null) return;
    const onClick = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setAddMode(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAddMode(null);
    };
    setTimeout(() => window.addEventListener('click', onClick), 0);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [addMode]);

  useEffect(() => {
    if (!openAddRequest || notebook.sources.length === 0) return;
    const raf = requestAnimationFrame(() => setAddMode('menu'));
    return () => cancelAnimationFrame(raf);
  }, [openAddRequest, notebook.sources.length]);

  if (!source) {
    return <SourceUploader notebook={notebook} onChange={onChange} onStartRecording={onStartRecording} openAddRequest={openAddRequest} />;
  }

  const addSources = (sources: StudySource[]) => {
    if (sources.length === 0) return;
    setActiveSourceId(sources[0].id);
    onChange({
      ...notebook,
      sources: [...sources, ...notebook.sources],
      title: isUntitledStudyTitle(notebook.title) ? sources[0].title : notebook.title,
      updatedAt: Date.now(),
    });
  };

  const addSourceFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || addingSources) return;
    setAddingSources(true);
    setSourceError(null);
    try {
      const result = await filesToStudySources(Array.from(files));
      if (result.errors.length > 0) setSourceError(result.errors[result.errors.length - 1]);
      if (result.sources.length > 0) {
        addSources(result.sources);
        setAddMode(null);
      }
    } finally {
      setAddingSources(false);
      if (sourceFileInputRef.current) sourceFileInputRef.current.value = '';
    }
  };

  const selectSource = (sourceId: string) => {
    if (sourceId === source.id) return;
    if (!notebook.sources.some((s) => s.id === sourceId)) return;
    setActiveSourceId(sourceId);
    onActivePageChange?.(undefined);
  };

  const toggleSourceEnabled = (sourceId: string) => {
    const current = notebook.sources.find((s) => s.id === sourceId);
    if (!current) return;
    if (current.enabled && notebook.sources.filter((s) => s.enabled).length <= 1) {
      setSourceError('AI가 참고할 원본은 최소 1개 이상 켜져 있어야 해요.');
      return;
    }
    setSourceError(null);
    onChange({
      ...notebook,
      sources: notebook.sources.map((s) => s.id === sourceId ? { ...s, enabled: !s.enabled } : s),
      updatedAt: Date.now(),
    });
  };

  const addPasteSource = () => {
    const text = pasteText.trim();
    if (!text) return;
    const src: StudySource = {
      id: newId('src'),
      kind: 'paste',
      title: pasteTitle.trim() || '붙여넣은 텍스트',
      content: text,
      addedAt: Date.now(),
      enabled: true,
      status: 'ready',
    };
    addSources([src]);
    setPasteTitle('');
    setPasteText('');
    setAddMode(null);
  };

  const addUrlSource = async () => {
    const url = urlValue.trim();
    if (!url || loadingUrl) return;
    setLoadingUrl(true);
    setSourceError(null);
    try {
      const r = await fetch('/api/study-url-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await r.json();
      if (!r.ok) {
        setSourceError(data?.error || '가져오지 못했어요.');
        return;
      }
      const src: StudySource = {
        id: newId('src'),
        kind: data.kind === 'youtube' ? 'youtube' : 'url',
        title: data.title || url,
        content: data.content,
        url,
        addedAt: Date.now(),
        enabled: true,
        status: 'ready',
      };
      addSources([src]);
      setUrlValue('');
      setAddMode(null);
    } catch {
      setSourceError('네트워크 오류입니다.');
    } finally {
      setLoadingUrl(false);
    }
  };

  const native = source.renderMode === 'native' && source.blobRef;
  const isPdf = native && (source.mimeType === 'application/pdf' || source.kind === 'pdf');
  const isPptx = native && (source.mimeType === PPTX_MIME || source.kind === 'pptx');
  const isDocx = native && (source.mimeType?.includes('wordprocessingml') || source.kind === 'docx');
  const activeSourceStatus = getSourceStatusMeta(source, ocrProgress);
  const effectiveScanPages = isPdf ? getEffectiveOcrPages(source) : source.scanPages;

  return (
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-white dark:bg-slate-900">
      <input
        ref={sourceFileInputRef}
        type="file"
        multiple
        accept=".txt,.md,.docx,.xlsx,.csv,.pdf,.pptx"
        onChange={(e) => addSourceFiles(e.target.files)}
        className="hidden"
      />
      <div className="flex min-w-0 items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800 sm:px-4">
        <NotebookIcon icon={notebook.icon} className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <p className="min-w-0 truncate text-[12.5px] font-bold leading-none text-slate-900 dark:text-slate-100" title={notebook.title}>
            {notebook.title}
          </p>
          <SourceStateBadge meta={activeSourceStatus} compact />
          <span className="hidden shrink-0 text-[10.5px] font-medium text-slate-400 sm:inline">
            {getSourceKindLabel(source.kind)}
            {source.pageCount ? ` · ${source.pageCount}p` : ''}
          </span>
        </div>
        <div className="relative shrink-0" ref={addMenuRef}>
          <button
            onClick={() => setAddMode((m) => m === 'menu' ? null : 'menu')}
            disabled={addingSources}
            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-55 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-200"
            title="원본 추가"
            aria-label="원본 추가 메뉴 열기"
            aria-haspopup="menu"
            aria-expanded={addMode !== null}
          >
            <Plus className="h-3 w-3" />
            {addingSources ? '추가 중' : '원본'}
          </button>
          {addMode !== null && (
            <SourceAddPopover
              mode={addMode}
              setMode={setAddMode}
              onPickFile={() => sourceFileInputRef.current?.click()}
              onStartRecording={() => { setAddMode(null); onStartRecording(); }}
              pasteTitle={pasteTitle}
              setPasteTitle={setPasteTitle}
              pasteText={pasteText}
              setPasteText={setPasteText}
              onAddPaste={addPasteSource}
              urlValue={urlValue}
              setUrlValue={setUrlValue}
              loadingUrl={loadingUrl}
              onAddUrl={addUrlSource}
              loadingFiles={addingSources}
            />
          )}
        </div>
      </div>
      {(notebook.sources.length > 1 || sourceError || addingSources) && (
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2 dark:border-slate-800 dark:bg-slate-950/25">
          {notebook.sources.length > 1 && (
            <div className="study-scroll-row flex gap-1.5 overflow-x-auto pb-0.5">
              {notebook.sources.map((s) => {
                const active = s.id === source.id;
                const enabled = s.enabled;
                const statusMeta = getSourceStatusMeta(s, active ? ocrProgress : undefined);
                return (
                  <div
                    key={s.id}
                    className={cn(
                      'inline-flex h-7 max-w-[220px] shrink-0 items-center overflow-hidden rounded-full border text-[11px] transition-colors',
                      active
                        ? 'border-indigo-200 bg-white font-semibold text-indigo-700 shadow-sm dark:border-indigo-900/60 dark:bg-slate-900 dark:text-indigo-200'
                        : 'border-slate-200 bg-transparent text-slate-500 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900',
                      !enabled && 'opacity-60',
                    )}
                    title={`${s.title} · ${statusMeta.label}`}
                  >
                    <button
                      onClick={() => selectSource(s.id)}
                      className="flex min-w-0 flex-1 items-center gap-1.5 px-2.5 py-1"
                      aria-current={active ? 'true' : undefined}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', getSourceDotClass(statusMeta, enabled))} />
                      <span className="truncate">{s.title}</span>
                      <span className="text-[9.5px] text-current/55">{getSourceKindLabel(s.kind)}</span>
                    </button>
                    <button
                      onClick={() => toggleSourceEnabled(s.id)}
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center border-l transition-colors',
                        active ? 'border-indigo-100 dark:border-indigo-900/50' : 'border-slate-200 dark:border-slate-800',
                        enabled
                          ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30'
                          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800',
                      )}
                      aria-label={enabled ? `${s.title} AI 답변에서 제외` : `${s.title} AI 답변에 포함`}
                      title={enabled ? 'AI 답변에 포함됨' : 'AI 답변에서 제외됨'}
                    >
                      {enabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleOff className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {(sourceError || addingSources) && (
            <p className={cn('mt-1 text-[10.5px]', sourceError ? 'text-red-600 dark:text-red-300' : 'text-slate-500 dark:text-slate-400')}>
              {sourceError ?? '원본을 불러오는 중...'}
            </p>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-hidden">
        {isPdf && (
          <Suspense fallback={<ViewerFallback label="PDF 로딩 중…" />}>
            <PdfViewer
              blobRef={source.blobRef!}
              activePage={activePage}
              onActivePageChange={onActivePageChange}
              onAskAboutSelection={askSelection}
              scanPages={effectiveScanPages}
              analysisProgress={ocrProgress}
              ocrEnabled={source.ocrEnabled}
              onOcrEnable={(v, forcePages) => {
                const updated = notebook.sources.map((s) => {
                  if (s.id !== source.id) return s;
                  const forcedOcrPages = forcePages && forcePages.length > 0
                    ? Array.from(new Set([...(s.forcedOcrPages ?? []), ...forcePages])).sort((a, b) => a - b)
                    : s.forcedOcrPages;
                  return { ...s, ocrEnabled: v, forcedOcrPages };
                });
                onChange({ ...notebook, sources: updated });
              }}
              onOcrContentUpdate={(ocrText) => {
                // 기존 content(pdf.js 추출 텍스트) 뒤에 OCR 섹션을 append.
                // 중복 방지를 위해 '--- OCR ---' 마커 기준으로 교체.
                const marker = '\n\n--- OCR ---\n';
                const base = source.content.split(marker)[0];
                const merged = ocrText ? `${base}${marker}${ocrText}` : base;
                if (merged === source.content) return;
                const updated = notebook.sources.map((s) => s.id === source.id ? { ...s, content: merged } : s);
                onChange({ ...notebook, sources: updated });
              }}
            />
          </Suspense>
        )}
        {!isPdf && isPptx && (
          <Suspense fallback={<ViewerFallback label="PPT 로딩 중…" />}>
            <PptxViewer blobRef={source.blobRef!} activeSlide={activePage} onActiveSlideChange={onActivePageChange} />
          </Suspense>
        )}
        {!isPdf && !isPptx && isDocx && (
          <Suspense fallback={<ViewerFallback label="Word 로딩 중…" />}>
            <DocxViewer blobRef={source.blobRef!} />
          </Suspense>
        )}
        {!isPdf && !isPptx && !isDocx && (
          <ExtractedTextReader
            source={source}
            activePage={activePage}
            onActivePageChange={onActivePageChange}
            onAsk={askPrompt}
          />
        )}
      </div>
    </div>
  );
}

interface TextPageChunk {
  key: string;
  page?: number;
  label: string;
  content: string;
  origin: 'text' | 'ocr';
}

function ExtractedTextReader({
  source,
  activePage,
  onActivePageChange,
  onAsk,
}: {
  source: StudySource;
  activePage?: number;
  onActivePageChange?: (page: number | undefined) => void;
  onAsk: (prompt: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState('');
  const [copiedSelection, setCopiedSelection] = useState(false);
  const pages = parseTextPages(source.content);
  const selectedPreview = selectedText.length > 110 ? `${selectedText.slice(0, 110)}...` : selectedText;

  const captureSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) {
      setSelectedText('');
      return;
    }
    const anchor = selection.anchorNode;
    const focus = selection.focusNode;
    if (!anchor || !focus || !containerRef.current.contains(anchor) || !containerRef.current.contains(focus)) {
      setSelectedText('');
      return;
    }
    const text = selection.toString().replace(/\s+/g, ' ').trim();
    setSelectedText(text.slice(0, 1200));
  };

  const askAboutSelection = () => {
    if (!selectedText) return;
    onAsk(`다음 원문 발췌를 기준으로 핵심 의미와 시험 포인트를 설명해줘.\n\n"${selectedText}"`);
  };

  const copySelection = async () => {
    if (!selectedText) return;
    try {
      await navigator.clipboard?.writeText(selectedText);
      setCopiedSelection(true);
      window.setTimeout(() => setCopiedSelection(false), 1400);
    } catch {
      setCopiedSelection(false);
    }
  };

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setSelectedText('');
    setCopiedSelection(false);
  };

  const askAboutPage = (page: TextPageChunk, intent: 'summary' | 'quiz') => {
    const title = page.page ? `${source.title} p.${page.page}` : source.title;
    const excerpt = page.content.slice(0, 1800);
    if (intent === 'summary') {
      onAsk(`${title} 내용을 5줄 이내로 요약하고, 꼭 외워야 할 표현을 따로 뽑아줘.\n\n${excerpt}`);
      return;
    }
    onAsk(`${title} 내용으로 바로 풀 수 있는 확인 문제 5개를 만들어줘. 정답과 해설도 같이 줘.\n\n${excerpt}`);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50/60 px-4 py-4 dark:bg-slate-950/20">
      <div className="mx-auto flex w-full max-w-[74ch] flex-col gap-3" ref={containerRef} onMouseUp={captureSelection} onKeyUp={captureSelection}>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">읽기 모드</p>
              <h4 className="mt-1 truncate text-[14px] font-bold text-slate-900 dark:text-slate-100">{source.title}</h4>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {pages.length > 1 ? `${pages.length}개 구간` : '1개 구간'} · 텍스트를 드래그하면 바로 질문할 수 있어요.
              </p>
            </div>
          </div>
        </div>

        {pages.map((page) => {
          const active = activePage !== undefined && page.page === activePage;
          return (
            <article
              key={page.key}
              className={cn(
                'scroll-mt-4 rounded-2xl border bg-white shadow-sm transition-colors dark:bg-slate-900',
                active
                  ? 'border-indigo-300 ring-2 ring-indigo-100 dark:border-indigo-700 dark:ring-indigo-950/60'
                  : 'border-slate-200 dark:border-slate-800',
              )}
            >
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
                <button
                  onClick={() => onActivePageChange?.(page.page)}
                  className="inline-flex min-h-8 items-center gap-2 rounded-lg text-left text-[12px] font-bold text-slate-800 transition-colors hover:text-indigo-700 dark:text-slate-100 dark:hover:text-indigo-300"
                >
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-100 px-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {page.page ? `p.${page.page}` : page.origin === 'ocr' ? 'OCR' : '원문'}
                  </span>
                  <span>{page.label}</span>
                  {page.origin === 'ocr' && page.page && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/50">
                      OCR
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => askAboutPage(page, 'summary')}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-200"
                  >
                    <FileText className="h-3 w-3" />
                    요약
                  </button>
                  <button
                    onClick={() => askAboutPage(page, 'quiz')}
                    className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-200"
                  >
                    <ListChecks className="h-3 w-3" />
                    문제
                  </button>
                </div>
              </header>
              <div className="px-4 py-3">
                <div className="prose prose-sm max-w-none select-text prose-slate dark:prose-invert prose-p:my-2 prose-p:leading-7">
                  <LazyMarkdown
                    content={page.content}
                    fallback={<pre className="whitespace-pre-wrap text-[13px] leading-7 text-slate-800 dark:text-slate-200">{page.content}</pre>}
                  />
                </div>
              </div>
            </article>
          );
        })}

        {selectedText && (
          <div className="sticky bottom-3 z-20 mx-auto w-full max-w-[520px] rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg shadow-slate-200/70 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-black/30">
            <p className="mb-2 line-clamp-2 px-2 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
              {selectedPreview}
            </p>
            <div className="grid grid-cols-[1fr_auto_auto] gap-1.5">
              <button
                onClick={askAboutSelection}
                className="inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 text-[11.5px] font-bold text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">선택 문장 질문</span>
              </button>
              <button
                onClick={() => void copySelection()}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 text-[11.5px] font-bold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30"
              >
                {copiedSelection ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="hidden xs:inline">{copiedSelection ? '복사됨' : '복사'}</span>
              </button>
              <button
                onClick={clearSelection}
                className="inline-flex min-h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="선택 해제"
                title="선택 해제"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function parseTextPages(content: string): TextPageChunk[] {
  const sections = content.split(/\n\s*--- OCR ---\s*\n/i);
  const chunks = sections.flatMap((section, sectionIndex) => {
    const origin: TextPageChunk['origin'] = sectionIndex === 0 ? 'text' : 'ocr';
    return parsePageMarkers(section, origin, sectionIndex);
  });
  return chunks.length > 0
    ? chunks
    : [{ key: 'text-fallback', label: '본문', content: content.trim() || '내용이 비어 있어요.', origin: 'text' }];
}

function parsePageMarkers(text: string, origin: TextPageChunk['origin'], sectionIndex: number): TextPageChunk[] {
  const markers = Array.from(text.matchAll(/\[p\.(\d+)\]/gi));
  const trimmed = text.trim();
  if (markers.length === 0) {
    return trimmed ? [{ key: `${origin}-${sectionIndex}-body`, label: origin === 'ocr' ? 'OCR 본문' : '본문', content: trimmed, origin }] : [];
  }

  const chunks: TextPageChunk[] = [];
  const firstMarkerIndex = markers[0].index ?? 0;
  const preface = text.slice(0, firstMarkerIndex).trim();
  if (preface) {
    chunks.push({ key: `${origin}-${sectionIndex}-preface`, label: origin === 'ocr' ? 'OCR 본문' : '본문', content: preface, origin });
  }

  markers.forEach((match, index) => {
    const page = Number(match[1]);
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < markers.length ? markers[index + 1].index ?? text.length : text.length;
    const pageText = text.slice(start, end).trim();
    if (!pageText) return;
    chunks.push({
      key: `${origin}-${sectionIndex}-${page}-${index}`,
      page,
      label: origin === 'ocr' ? `OCR 페이지 ${page}` : `페이지 ${page}`,
      content: pageText,
      origin,
    });
  });
  return chunks;
}

function ViewerFallback({ label }: { label: string }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-slate-300 border-t-indigo-500 animate-spin" />
        {label}
      </div>
    </div>
  );
}

function SourceCollectionSummary({
  sources,
  activeSource,
  activeStatus,
  ocrProgress,
}: {
  sources: StudySource[];
  activeSource: StudySource;
  activeStatus: SourceStatusMeta;
  ocrProgress?: AutoOcrProgress;
}) {
  const stats = sources.reduce(
    (acc, source) => {
      const meta = getSourceStatusMeta(source, source.id === activeSource.id ? ocrProgress : undefined);
      if (meta.kind === 'ready') acc.ready += 1;
      if (meta.kind === 'pending') acc.pending += 1;
      if (meta.kind === 'error') acc.error += 1;
      if (meta.kind === 'disabled') acc.disabled += 1;
      return acc;
    },
    { ready: 0, pending: 0, error: 0, disabled: 0 },
  );
  const activeReady = activeStatus.kind === 'ready';
  const activePromptPrefix = `${activeSource.title} 원본을 기준으로`;
  const total = ocrProgress ? ocrProgress.ocrTotal + ocrProgress.visionTotal : 0;
  const done = ocrProgress ? ocrProgress.ocrDone + ocrProgress.visionDone : 0;
  const percent = total > 0 ? Math.max(3, Math.min(100, Math.round((done / total) * 100))) : 0;
  const activeWordCount = Math.max(0, Math.round(activeSource.content.trim().length / 100) / 10);
  const statusTone = activeStatus.kind === 'ready'
    ? 'border-emerald-100 bg-emerald-50/65 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200'
    : activeStatus.kind === 'pending'
      ? 'border-indigo-100 bg-indigo-50/70 text-indigo-800 dark:border-indigo-900/50 dark:bg-indigo-950/25 dark:text-indigo-200'
      : activeStatus.kind === 'error'
        ? 'border-red-100 bg-red-50/70 text-red-800 dark:border-red-900/50 dark:bg-red-950/25 dark:text-red-200'
        : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300';

  return (
    <div className="space-y-2.5">
      <div className={cn('rounded-2xl border px-3 py-2.5', statusTone)}>
        <div className="flex flex-wrap items-start gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/80 ring-1 ring-current/10 dark:bg-slate-900/80">
              {activeStatus.kind === 'pending' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : activeStatus.kind === 'error' ? (
                <AlertCircle className="h-3.5 w-3.5" />
              ) : activeStatus.kind === 'ready' ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <CircleOff className="h-3.5 w-3.5" />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-[12px] font-bold">{activeStatus.label}</p>
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold ring-1 ring-current/10 dark:bg-slate-900/70">
                  준비 {stats.ready}
                </span>
                {stats.pending > 0 && (
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold ring-1 ring-current/10 dark:bg-slate-900/70">
                    분석 {stats.pending}
                  </span>
                )}
                {stats.error > 0 && (
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold ring-1 ring-current/10 dark:bg-slate-900/70">
                    오류 {stats.error}
                  </span>
                )}
                {stats.disabled > 0 && (
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold ring-1 ring-current/10 dark:bg-slate-900/70">
                    제외 {stats.disabled}
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-[10.8px] leading-relaxed opacity-80">{activeStatus.message}</p>
              <p className="mt-1 text-[10px] opacity-60">
                {getSourceKindLabel(activeSource.kind)}
                {activeSource.pageCount ? ` · ${activeSource.pageCount}p` : ''}
                {activeSource.content.trim() ? ` · 약 ${formatStudyCharCount(activeSource.content.length)}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              askPrompt(`${activePromptPrefix} 핵심 내용을 먼저 요약해줘.`);
            }}
            disabled={!activeReady}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-[11px] font-bold text-slate-700 ring-1 ring-current/10 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            title={activeReady ? '현재 원본 요약 질문을 대화창에 넣기' : '원본 분석이 끝난 뒤 질문할 수 있어요'}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            대화로 질문
          </button>
        </div>
        {ocrProgress?.isProcessing && total > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/70 dark:bg-slate-800">
              <div className="h-full rounded-full bg-current transition-[width] duration-300" style={{ width: `${percent}%` }} />
            </div>
            <span className="w-9 text-right text-[10.5px] font-bold tabular-nums">{percent}%</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <SourceQuickPrompt
          icon={<FileText className="h-3 w-3" />}
          label="3줄 요약"
          disabled={!activeReady}
          onClick={() => askPrompt(`${activePromptPrefix} 시험 전에 볼 3줄 요약을 만들어줘.`)}
        />
        <SourceQuickPrompt
          icon={<ListChecks className="h-3 w-3" />}
          label="체크 문제"
          disabled={!activeReady}
          onClick={() => askPrompt(`${activePromptPrefix} 이해 확인용 체크 문제 5개를 만들어줘. 정답과 해설도 같이 줘.`)}
        />
        <SourceQuickPrompt
          icon={<AlertCircle className="h-3 w-3" />}
          label="헷갈림 찾기"
          disabled={!activeReady}
          onClick={() => askPrompt(`${activePromptPrefix} 학생이 헷갈리기 쉬운 부분과 실수 포인트를 정리해줘.`)}
        />
      </div>
    </div>
  );
}

function SourceQuickPrompt({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10.5px] font-semibold text-slate-500 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30"
    >
      {icon}
      {label}
    </button>
  );
}

type SourceStatusMeta = {
  kind: 'ready' | 'pending' | 'error' | 'disabled';
  label: string;
  message: string;
};

function getSourceStatusMeta(source: StudySource, ocrProgress?: AutoOcrProgress): SourceStatusMeta {
  if (!source.enabled) {
    return {
      kind: 'disabled',
      label: '제외됨',
      message: '이 원본은 현재 AI 답변과 생성 결과에서 제외되어 있어요.',
    };
  }
  if (source.status === 'error') {
    return {
      kind: 'error',
      label: '오류',
      message: source.errorMessage || '원본을 읽는 중 문제가 생겼어요. 다시 추가하거나 다른 파일을 사용해보세요.',
    };
  }
  if (source.status === 'processing' || isStudySourceTextPending(source)) {
    return {
      kind: 'pending',
      label: '분석 중',
      message: '텍스트를 분석하는 중이에요. 완료되면 대화와 노트정리, 퀴즈 생성에 사용할 수 있어요.',
    };
  }
  if (source.ocrEnabled && ocrProgress?.isProcessing && (source.kind === 'pdf' || source.kind === 'pptx')) {
    return {
      kind: 'pending',
      label: '보강 분석 중',
      message: '기본 텍스트는 사용할 수 있지만, 이미지와 스캔 영역을 더 읽고 있어요. 잠시 후 결과가 더 좋아질 수 있어요.',
    };
  }
  return {
    kind: 'ready',
    label: '준비됨',
    message: '대화와 스튜디오 생성에 사용할 수 있어요.',
  };
}

function SourceStateBadge({ meta, compact = false }: { meta: SourceStatusMeta; compact?: boolean }) {
  const Icon = meta.kind === 'pending' ? Loader2 : meta.kind === 'error' ? AlertCircle : meta.kind === 'ready' ? CheckCircle2 : CircleOff;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border font-bold',
        compact ? 'h-4 px-1.5 text-[9.5px]' : 'h-6 px-2 text-[10.5px]',
        meta.kind === 'ready' && 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200',
        meta.kind === 'pending' && 'border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/25 dark:text-indigo-200',
        meta.kind === 'error' && 'border-red-100 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/25 dark:text-red-200',
        meta.kind === 'disabled' && 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400',
      )}
      title={meta.message}
    >
      <Icon className={cn(compact ? 'h-2.5 w-2.5' : 'h-3 w-3', meta.kind === 'pending' && 'animate-spin')} />
      {meta.label}
    </span>
  );
}

function getSourceDotClass(meta: SourceStatusMeta, enabled: boolean): string {
  if (!enabled || meta.kind === 'disabled') return 'bg-slate-300';
  if (meta.kind === 'pending') return 'bg-indigo-400';
  if (meta.kind === 'error') return 'bg-red-400';
  return 'bg-emerald-400';
}

function formatSourceTextSize(source: StudySource): string {
  if (isStudySourceTextPending(source)) return '분석 대기';
  return formatStudyCharCount(source.content.length);
}

function SourceAddPopover({
  mode,
  setMode,
  onPickFile,
  onStartRecording,
  pasteTitle,
  setPasteTitle,
  pasteText,
  setPasteText,
  onAddPaste,
  urlValue,
  setUrlValue,
  loadingUrl,
  onAddUrl,
  loadingFiles,
}: {
  mode: SourceAddMode;
  setMode: (mode: SourceAddMode) => void;
  onPickFile: () => void;
  onStartRecording: () => void;
  pasteTitle: string;
  setPasteTitle: (value: string) => void;
  pasteText: string;
  setPasteText: (value: string) => void;
  onAddPaste: () => void;
  urlValue: string;
  setUrlValue: (value: string) => void;
  loadingUrl: boolean;
  onAddUrl: () => void;
  loadingFiles: boolean;
}) {
  const isUrlMode = mode === 'url' || mode === 'youtube';

  return (
    <div
      className="absolute right-0 top-full z-50 mt-1 w-[min(18rem,calc(100vw-1rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      role="menu"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12px] font-bold text-slate-900 dark:text-slate-100">
          {mode === 'menu' ? '원본 추가' : mode === 'paste' ? '텍스트 붙여넣기' : mode === 'youtube' ? 'YouTube 링크' : '웹 주소'}
        </p>
        <div className="flex items-center gap-1">
          {mode !== 'menu' && (
            <button
              onClick={() => setMode('menu')}
              className="rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              뒤로
            </button>
          )}
          <button
            type="button"
            onClick={() => setMode(null)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="원본 추가 닫기"
            title="닫기"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {mode === 'menu' && (
        <div className="grid grid-cols-2 gap-2">
          <SourceAddOption
            icon={<Upload className="h-4 w-4" />}
            label={loadingFiles ? '파일 처리 중' : '파일 업로드'}
            hint="PDF · PPTX · DOCX"
            onClick={onPickFile}
            disabled={loadingFiles}
            className="col-span-2 border-indigo-200 bg-indigo-50/55 dark:border-indigo-800/60 dark:bg-indigo-950/25"
          />
          <SourceAddOption icon={<Link2 className="h-4 w-4" />} label="웹 링크" hint="문서 · 기사" onClick={() => setMode('url')} />
          <SourceAddOption icon={<Youtube className="h-4 w-4" />} label="유튜브" hint="자막 추출" onClick={() => setMode('youtube')} />
          <SourceAddOption icon={<Clipboard className="h-4 w-4" />} label="붙여넣기" hint="텍스트 입력" onClick={() => setMode('paste')} />
          <SourceAddOption icon={<Mic className="h-4 w-4" />} label="강의 녹음" hint="녹음·전사" onClick={onStartRecording} className="col-span-2" />
        </div>
      )}

      {mode === 'paste' && (
        <div className="space-y-2">
          <input
            value={pasteTitle}
            onChange={(e) => setPasteTitle(e.target.value)}
            placeholder="제목 (선택)"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12.5px] outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900"
          />
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="여기에 원본 텍스트를 붙여넣으세요"
            rows={5}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12.5px] outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900"
          />
          <StudyBtn variant="primary" size="sm" onClick={onAddPaste} disabled={!pasteText.trim()} className="w-full">
            원본 추가
          </StudyBtn>
        </div>
      )}

      {isUrlMode && (
        <div className="space-y-2">
          <input
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && urlValue.trim()) onAddUrl(); }}
            placeholder={mode === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://...'}
            disabled={loadingUrl}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12.5px] outline-none focus:border-indigo-400 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900"
          />
          <p className="text-[10.5px] leading-relaxed text-slate-400 dark:text-slate-500">
            {mode === 'youtube'
              ? '영상 자막을 가져와 원본으로 저장해요. 자막이 없는 영상은 직접 붙여넣기를 쓰는 편이 안정적이에요.'
              : '본문을 읽을 수 있는 공개 웹 문서나 기사 링크가 가장 잘 작동해요.'}
          </p>
          <StudyBtn variant="primary" size="sm" onClick={onAddUrl} disabled={!urlValue.trim() || loadingUrl} className="w-full">
            {loadingUrl ? '가져오는 중...' : '원본 추가'}
          </StudyBtn>
        </div>
      )}
    </div>
  );
}

function SourceAddOption({
  icon,
  label,
  hint,
  onClick,
  className,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-left transition-colors',
        'hover:border-indigo-300 hover:bg-indigo-50/60 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/25',
        className,
      )}
      role="menuitem"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold text-slate-800 dark:text-slate-100">{label}</span>
        <span className="block truncate text-[10px] text-slate-400">{hint}</span>
      </span>
    </button>
  );
}

function EditableTitle({ title, onChange }: { title: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const v = draft.trim();
          if (v && v !== title) onChange(v);
          else setDraft(title);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') { setDraft(title); setEditing(false); }
        }}
        className="w-full rounded-md border border-indigo-300 px-1.5 py-0.5 text-[13px] font-bold outline-none"
      />
    );
  }
  return (
    <h3
      onClick={() => { setDraft(title); setEditing(true); }}
      className="text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate cursor-text hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded px-1 -mx-1 py-0.5"
      title="클릭해 이름 변경"
    >
      {title}
    </h3>
  );
}

/**
 * 파일이 비어있을 때 원본 업로드 유도 화면.
 */
function SourceUploader({ notebook, onChange, onStartRecording, openAddRequest }: Props) {
  const [mode, setMode] = useState<'url' | 'youtube' | 'paste' | null>(null);
  const [urlValue, setUrlValue] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [isAttentionActive, setIsAttentionActive] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const hubRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!openAddRequest || mode !== null) return;
    setIsAttentionActive(true);
    const raf = requestAnimationFrame(() => hubRef.current?.focus());
    const timeout = window.setTimeout(() => setIsAttentionActive(false), 1400);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [mode, openAddRequest]);

  const addFile = async (files: FileList | null) => {
    if (!files || files.length === 0 || fileLoading) return;
    setFileError(null);
    setFileLoading(true);
    try {
      const result = await filesToStudySources(Array.from(files));
      if (result.errors.length > 0) setFileError(result.errors[result.errors.length - 1]);
      if (result.sources.length > 0) {
        onChange({
          ...notebook,
          title: isUntitledStudyTitle(notebook.title) ? result.sources[0].title : notebook.title,
          sources: result.sources,
          updatedAt: Date.now(),
        });
      }
    } finally {
      setFileLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addPaste = () => {
    const text = pasteText.trim();
    if (!text) return;
    const src: StudySource = {
      id: newId('src'),
      kind: 'paste',
      title: pasteTitle.trim() || '붙여넣은 텍스트',
      content: text,
      addedAt: Date.now(),
      enabled: true,
      status: 'ready',
    };
    onChange({
      ...notebook,
      title: isUntitledStudyTitle(notebook.title) ? src.title : notebook.title,
      sources: [src],
      updatedAt: Date.now(),
    });
    setPasteTitle('');
    setPasteText('');
    setMode(null);
  };

  const addUrl = async () => {
    const url = urlValue.trim();
    if (!url) return;
    setUrlLoading(true); setUrlError(null);
    try {
      const r = await fetch('/api/study-url-extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await r.json();
      if (!r.ok) { setUrlError(data?.error || '가져오지 못했어요.'); return; }
      const src: StudySource = {
        id: newId('src'),
        kind: data.kind === 'youtube' ? 'youtube' : 'url',
        title: data.title || url,
        content: data.content, url,
        addedAt: Date.now(), enabled: true, status: 'ready',
      };
      onChange({
        ...notebook,
        title: isUntitledStudyTitle(notebook.title) ? src.title : notebook.title,
        sources: [src],
        updatedAt: Date.now(),
      });
      setUrlValue(''); setMode(null);
    } catch { setUrlError('네트워크 오류입니다.'); }
    finally { setUrlLoading(false); }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) { setIsDragging(false); dragCounterRef.current = 0; }
  };
  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    addFile(e.dataTransfer.files);
  };

  return (
    <div
      className="relative flex h-full w-full min-w-0 flex-col bg-white dark:bg-slate-900"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-2 z-30 rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Upload className="h-10 w-10 mx-auto text-indigo-500" strokeWidth={1.5} />
            <p className="mt-2 text-[13px] font-semibold text-indigo-700 dark:text-indigo-200">여기에 놓으면 이 자료의 원본이 됩니다</p>
          </div>
        </div>
      )}
      <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.docx,.xlsx,.csv,.pdf,.pptx" onChange={(e) => addFile(e.target.files)} className="hidden" />

      <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-1 flex items-center gap-2">
        <NotebookIcon icon={notebook.icon} className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        <div className="min-w-0 flex-1">
          <EditableTitle
            title={notebook.title}
            onChange={(newTitle) => onChange({ ...notebook, title: newTitle })}
          />
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-tight">이 자료에 사용할 원본을 추가하세요</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {mode === 'paste' ? (
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-200">텍스트 붙여넣기</p>
              <button onClick={() => setMode(null)} className="p-1 text-slate-400 hover:text-slate-700" aria-label="닫기">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              <input
                autoFocus
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
                placeholder="제목 (선택)"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900"
              />
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="여기에 수업 내용, 문제 지문, 정리 글을 붙여넣으세요"
                rows={7}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900"
              />
              <StudyBtn variant="primary" size="md" onClick={addPaste} disabled={!pasteText.trim()} className="w-full">
                원본으로 추가
              </StudyBtn>
            </div>
          </div>
        ) : mode ? (
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-200">
                {mode === 'youtube' ? 'YouTube 링크' : '웹 주소'}
              </p>
              <button onClick={() => setMode(null)} className="text-slate-400 hover:text-slate-700 p-1" aria-label="닫기">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                autoFocus
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && urlValue.trim()) addUrl(); }}
                placeholder={mode === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://...'}
                disabled={urlLoading}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[13px] outline-none focus:border-indigo-400"
              />
              <StudyBtn variant="primary" size="md" onClick={addUrl} disabled={!urlValue.trim() || urlLoading}>
                {urlLoading ? '불러오는 중…' : '추가'}
              </StudyBtn>
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-slate-400 dark:text-slate-500">
              {mode === 'youtube'
                ? '영상 자막을 가져와 원본으로 저장해요. 자막이 없는 영상은 직접 붙여넣기를 쓰는 편이 안정적이에요.'
                : '본문을 읽을 수 있는 공개 웹 문서나 기사 링크가 가장 잘 작동해요.'}
            </p>
            {urlError && <p className="mt-2 text-[11px] text-red-600">{urlError}</p>}
          </div>
        ) : (
          <div
            ref={hubRef}
            tabIndex={-1}
            className={cn(
              'source-hub w-full max-w-2xl rounded-3xl outline-none transition-all duration-300',
              isAttentionActive && 'bg-indigo-50/55 p-4 ring-2 ring-indigo-400 ring-offset-4 ring-offset-white dark:bg-indigo-950/25 dark:ring-indigo-500 dark:ring-offset-slate-900',
            )}
          >
            <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 text-left dark:border-slate-800 dark:bg-slate-950/30">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-indigo-300 dark:ring-slate-800">
                  <Sparkles className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[16px] font-bold text-slate-900 dark:text-slate-100">어떤 자료로 공부할까요?</h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                    PDF나 PPTX는 원문을 보면서 질문할 수 있고, 웹·영상·녹음은 텍스트로 정리한 뒤 대화와 스튜디오에 연결돼요.
                  </p>
                </div>
              </div>
              <div className="source-hub-steps mt-4 grid gap-2">
                {[
                  ['1', '원본 넣기', '파일이나 링크를 추가'],
                  ['2', '분석 확인', '텍스트 준비 상태 확인'],
                  ['3', '질문·생성', '대화와 노트정리 시작'],
                ].map(([step, title, hint]) => (
                  <div key={step} className="rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">{step}</span>
                      <span className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100">{title}</span>
                    </div>
                    <p className="mt-1 text-[10.5px] text-slate-500 dark:text-slate-400">{hint}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="source-hub-grid gap-2.5">
              <HubCard accent icon={<Upload className="h-5 w-5" />} label={fileLoading ? '처리 중' : '파일 업로드'} hint="PDF · PPTX · DOCX" onClick={() => fileInputRef.current?.click()} disabled={fileLoading} />
              <HubCard icon={<Clipboard className="h-5 w-5" />} label="붙여넣기" hint="문제 · 필기 텍스트" onClick={() => setMode('paste')} />
              <HubCard icon={<Link2 className="h-5 w-5" />} label="웹 링크" hint="기사 · 문서" onClick={() => setMode('url')} />
              <HubCard icon={<Youtube className="h-5 w-5" />} label="YouTube" hint="영상 자막" onClick={() => setMode('youtube')} />
              <HubCard icon={<Mic className="h-5 w-5" />} label="녹음" hint="강의 실시간" onClick={onStartRecording} />
            </div>
            {fileError && <p className="mt-3 text-center text-[11px] text-red-600">{fileError}</p>}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[10.5px] text-slate-400">
              <span>파일을 이 창에 끌어다 놓아도 됩니다</span>
              <span className="hidden sm:inline text-slate-300">·</span>
              <span>스캔 PDF는 OCR 분석 후 드래그 선택을 준비해요</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HubCard({ icon, label, hint, onClick, accent, disabled }: { icon: React.ReactNode; label: string; hint: string; onClick: () => void; accent?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'hub-card flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 transition-all min-w-0 disabled:cursor-not-allowed disabled:opacity-55 sm:min-h-[116px] sm:p-4 sm:hover:-translate-y-0.5 disabled:sm:hover:translate-y-0',
        accent && 'hub-card-accent',
        accent
          ? 'border-indigo-200 bg-indigo-50/40 dark:border-indigo-800/60 dark:bg-indigo-950/20 hover:border-indigo-400 hover:bg-indigo-50'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-300 hover:bg-indigo-50/30',
      )}
    >
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl shrink-0', accent ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>
        {icon}
      </span>
      <span className="hub-card-label text-[12.5px] font-semibold text-slate-900 dark:text-slate-100 max-w-full truncate">{label}</span>
      <span className="hub-card-hint text-[10.5px] text-slate-500 dark:text-slate-400 text-center leading-tight max-w-full truncate">{hint}</span>
    </button>
  );
}
