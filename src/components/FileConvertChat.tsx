import { Component, type ErrorInfo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, Download, FileSymlink, RefreshCw, Upload, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { convertDocxToHtml, convertDocxToMarkdown, convertDocxToText } from '@/lib/fileConvert/converters/docx';
import { convertHtmlFileToMd, convertMdFileToHtml } from '@/lib/fileConvert/converters/markup';
import { convertImageFormat, isImageFormatSupported } from '@/lib/fileConvert/converters/image';
import { ocrImageToText } from '@/lib/fileConvert/converters/ocr';
import { imagesToPdf, mergePdfs, pdfToImages, pdfToText, splitPdf } from '@/lib/fileConvert/converters/pdf';
import { convertCsvToXlsx, convertXlsxToCsv, convertXlsxToJson } from '@/lib/fileConvert/converters/spreadsheet';
import { detectFormat, extensionOf, formatLabel, type FileFormat } from '@/lib/fileConvert/detect';
import { downloadBlob } from '@/lib/fileConvert/download';
import { isMobile } from '@/lib/fileConvert/features';
import { CATEGORY_LABELS, TASKS, getQuickActions, getTaskById, getTasksByCategory, getTasksForFile, type ConvertTask, type TaskCategory } from '@/lib/fileConvert/tasks';

// ───────── Error Boundary ─────────
interface FCBState { error: Error | null }
class FileConvertErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, FCBState> {
  state: FCBState = { error: null };
  static getDerivedStateFromError(error: Error): FCBState { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('FileConvert crash:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500" />
          <div>
            <h2 className="text-[18px] font-bold text-slate-800 mb-1">파일 변환 중 문제가 생겼어요</h2>
            <p className="text-[13px] text-slate-600 max-w-md">이 파일을 처리하는 동안 오류가 발생했어요. 다른 파일로 시도하거나 페이지를 새로고침해 주세요.</p>
          </div>
          <details className="text-[11px] text-slate-400 max-w-md">
            <summary className="cursor-pointer">오류 상세</summary>
            <pre className="mt-2 whitespace-pre-wrap text-left bg-slate-50 p-2 rounded">{this.state.error.message}</pre>
          </details>
          <button
            type="button"
            onClick={() => { this.setState({ error: null }); this.props.onReset(); }}
            className="h-9 px-4 rounded-lg bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800"
          >
            처음으로
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ───────── 메인 ─────────
interface FileConvertChatProps { onBack?: () => void }

type Stage = 'pick-task' | 'upload' | 'converting' | 'done' | 'error';

interface ConversionResult {
  blob: Blob;
  fileName: string;
  previewText?: string;
  previewUrl?: string;
  outputFormat: FileFormat;
  originalSize: number;
  newSize: number;
}

export function FileConvertChat({ onBack }: FileConvertChatProps) {
  const [stage, setStage] = useState<Stage>('pick-task');
  const [selectedTask, setSelectedTask] = useState<ConvertTask | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [detectedFormats, setDetectedFormats] = useState<FileFormat[]>([]);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  // 태스크별 옵션
  const [imageTarget, setImageTarget] = useState<'jpeg' | 'png' | 'webp'>('png');
  const [pdfImageFormat, setPdfImageFormat] = useState<'png' | 'jpeg'>('png');
  const [splitRanges, setSplitRanges] = useState<string>('1');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 이전 결과의 blob URL 정리
  useEffect(() => {
    return () => { if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl); };
  }, [result]);

  // 전역 드래그 오버레이
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      setIsDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) setIsDragging(false);
    };
    const onDrop = () => setIsDragging(false);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStage('pick-task');
    setSelectedTask(null);
    setFiles([]);
    setDetectedFormats([]);
    if (result?.previewUrl) URL.revokeObjectURL(result.previewUrl);
    setResult(null);
    setErrorMessage('');
    setProgress(null);
  }, [result]);

  const handleFilesSelected = useCallback(async (picked: File[]) => {
    if (picked.length === 0) return;
    setFiles(picked);
    const formats = await Promise.all(picked.map((f) => detectFormat(f)));
    setDetectedFormats(formats);
    // 태스크 미선택이면 자동 제안
    if (!selectedTask && formats[0] && formats[0] !== 'unknown') {
      const candidates = getTasksForFile(extensionOf(formats[0]));
      if (candidates.length === 1) setSelectedTask(candidates[0]);
    }
    setStage('upload');
  }, [selectedTask]);

  const onDropZoneDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const picked = Array.from(e.dataTransfer.files);
    void handleFilesSelected(picked);
  }, [handleFilesSelected]);

  const runConversion = useCallback(async () => {
    if (!selectedTask || files.length === 0) return;
    setStage('converting');
    setProgress('변환 준비 중...');
    setErrorMessage('');

    // AbortController for AI calls
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let converted: { blob: Blob; suggestedName: string; previewText?: string };

      switch (selectedTask.id) {
        // ───── 이미지 ─────
        case 'image-format': {
          if (!isImageFormatSupported(imageTarget)) throw new Error(`이 브라우저는 ${imageTarget.toUpperCase()} 저장을 지원하지 않아요.`);
          setProgress(`${imageTarget.toUpperCase()}로 변환 중...`);
          converted = await convertImageFormat(files[0], imageTarget);
          break;
        }
        case 'image-to-pdf': {
          setProgress(`이미지 ${files.length}장을 PDF로 묶는 중...`);
          converted = await imagesToPdf(files);
          break;
        }
        case 'image-to-text': {
          setProgress('AI가 이미지 속 텍스트를 읽는 중... (5~15초)');
          converted = await ocrImageToText(files[0], controller.signal);
          break;
        }
        // ───── PDF ─────
        case 'pdf-merge': {
          setProgress(`PDF ${files.length}개 합치는 중...`);
          converted = await mergePdfs(files);
          break;
        }
        case 'pdf-split': {
          setProgress('PDF 분할 중...');
          converted = await splitPdf(files[0], splitRanges);
          break;
        }
        case 'pdf-to-images': {
          converted = await pdfToImages(files[0], { format: pdfImageFormat, scale: 2 }, (p, total) => {
            setProgress(`이미지 생성 중... ${p}/${total}`);
          });
          break;
        }
        case 'pdf-to-text': {
          converted = await pdfToText(files[0], (p, total) => {
            setProgress(`텍스트 추출 중... ${p}/${total}`);
          });
          break;
        }
        case 'pdf-compress': {
          throw new Error('PDF 압축은 곧 추가될 예정이에요. 지금은 PDF 합치기·분할·이미지 추출을 이용해주세요.');
        }
        // ───── 문서 ─────
        case 'docx-to-text': {
          setProgress('Word → 텍스트 변환 중...');
          converted = await convertDocxToText(files[0]);
          break;
        }
        case 'docx-to-markdown': {
          setProgress('Word → Markdown 변환 중...');
          converted = await convertDocxToMarkdown(files[0]);
          break;
        }
        case 'docx-to-html': {
          setProgress('Word → HTML 변환 중...');
          converted = await convertDocxToHtml(files[0]);
          break;
        }
        // ───── 스프레드시트 ─────
        case 'xlsx-to-csv': {
          setProgress('Excel → CSV 변환 중...');
          converted = await convertXlsxToCsv(files[0]);
          break;
        }
        case 'csv-to-xlsx': {
          setProgress('CSV → Excel 변환 중...');
          converted = await convertCsvToXlsx(files[0]);
          break;
        }
        case 'xlsx-to-json': {
          setProgress('Excel → JSON 변환 중...');
          converted = await convertXlsxToJson(files[0]);
          break;
        }
        // ───── 마크업 ─────
        case 'md-to-html': {
          setProgress('Markdown → HTML 변환 중...');
          converted = await convertMdFileToHtml(files[0]);
          break;
        }
        case 'html-to-md': {
          setProgress('HTML → Markdown 변환 중...');
          converted = await convertHtmlFileToMd(files[0]);
          break;
        }
        default:
          throw new Error(`아직 준비 중인 기능이에요: ${selectedTask.label}`);
      }

      // 결과 구성 — 텍스트 프리뷰 or 이미지 미리보기
      const outputFmt: FileFormat = (() => {
        const ext = converted.suggestedName.toLowerCase().split('.').pop() ?? '';
        if (['jpg', 'jpeg'].includes(ext)) return 'jpg';
        if (ext === 'png') return 'png';
        if (ext === 'webp') return 'webp';
        if (ext === 'html') return 'html';
        if (ext === 'md') return 'md';
        if (ext === 'pdf') return 'pdf';
        if (ext === 'xlsx') return 'xlsx';
        if (ext === 'zip') return 'zip';
        if (ext === 'csv') return 'csv';
        if (ext === 'json') return 'json';
        if (ext === 'txt') return 'txt';
        return 'unknown';
      })();

      let previewText: string | undefined = converted.previewText;
      let previewUrl: string | undefined;
      // 텍스트류면 앞 500자 미리보기
      if (!previewText && ['html', 'md', 'csv', 'json', 'txt'].includes(outputFmt)) {
        const full = await converted.blob.text();
        previewText = full.slice(0, 500);
      }
      // 이미지류면 미리보기 URL
      if (['jpg', 'png', 'webp'].includes(outputFmt)) {
        previewUrl = URL.createObjectURL(converted.blob);
      }

      setResult({
        blob: converted.blob,
        fileName: converted.suggestedName,
        previewText: previewText?.slice(0, 500),
        previewUrl,
        outputFormat: outputFmt,
        originalSize: files[0].size,
        newSize: converted.blob.size,
      });
      setStage('done');
      setProgress(null);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setErrorMessage((err as Error).message || '변환 중 문제가 생겼어요.');
      setStage('error');
      setProgress(null);
    }
  }, [selectedTask, files, imageTarget]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    void downloadBlob(result.blob, result.fileName);
  }, [result]);

  const categories: TaskCategory[] = ['pdf', 'image', 'doc', 'data', 'markup'];
  const quickActions = useMemo(() => getQuickActions(), []);

  return (
    <FileConvertErrorBoundary onReset={reset}>
      <div className="flex flex-col h-full bg-gradient-to-b from-slate-50/50 to-white relative">
        {/* 전역 드래그 오버레이 */}
        {isDragging && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-violet-500/15 backdrop-blur-sm border-4 border-dashed border-violet-400 rounded-lg" />
            <div className="relative text-[20px] font-bold text-violet-800 bg-white px-6 py-3 rounded-2xl shadow-lg">
              📁 여기에 파일을 놓아주세요
            </div>
          </div>
        )}

        {/* 헤더 */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-5 md:px-8 py-4 border-b border-slate-200 bg-white/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/15 via-blue-500/10 to-sky-500/10 border border-border/60 flex items-center justify-center shadow-sm shrink-0">
              <FileSymlink className="w-5 h-5 text-indigo-600/80" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-semibold text-[20px] tracking-tight leading-none truncate">파일 변환</h1>
              <p className="text-[12px] text-muted-foreground mt-1 truncate hidden sm:block">다양한 포맷의 파일을 자유롭게 변환</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {stage !== 'pick-task' && (
              <button type="button" onClick={reset} className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-[12.5px] font-semibold text-slate-600 hover:bg-slate-100">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">처음으로</span>
              </button>
            )}
            {onBack && (
              <button type="button" onClick={onBack} aria-label="닫기" className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X className="w-5 h-5" /></button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">

            {/* Stage 1: 태스크 선택 */}
            {stage === 'pick-task' && (
              <div className="space-y-6">
                {/* 드롭존 */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDropZoneDrop}
                  className="w-full flex flex-col items-center justify-center gap-2 py-10 px-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-violet-400 hover:bg-violet-50/30 transition-colors"
                >
                  <Upload className="w-8 h-8 text-slate-400" />
                  <div className="text-[14px] font-semibold text-slate-700">파일을 여기 놓거나 클릭해서 선택하세요</div>
                  <div className="text-[11.5px] text-slate-400">PDF · 이미지 · Word · Excel · CSV · Markdown 등</div>
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { const picked = Array.from(e.target.files ?? []); void handleFilesSelected(picked); e.target.value = ''; }} />

                {/* Quick Actions */}
                <div>
                  <h2 className="text-[11.5px] uppercase tracking-wider font-bold text-slate-500 mb-2.5">자주 쓰는 도구</h2>
                  <div className={cn('grid gap-2.5', isMobile() ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4')}>
                    {quickActions.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => { setSelectedTask(task); setStage('upload'); }}
                        className="group text-left rounded-xl border border-slate-200 bg-white p-3.5 hover:border-violet-300 hover:bg-violet-50/30 hover:shadow-md hover:-translate-y-0.5 transition-all"
                      >
                        <div className="flex items-start justify-between mb-1.5">
                          <span className="text-[22px]">{task.icon}</span>
                          <TierBadge tier={task.tier} />
                        </div>
                        <div className="text-[13px] font-bold text-slate-800 mb-0.5 leading-tight">{task.label}</div>
                        <div className="text-[10.5px] text-slate-500 leading-snug">{task.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 카테고리별 더 많은 도구 */}
                <div className="space-y-4">
                  <h2 className="text-[11.5px] uppercase tracking-wider font-bold text-slate-500">더 많은 도구</h2>
                  {categories.map((cat) => {
                    const tasks = getTasksByCategory(cat).filter((t) => !t.quickAction);
                    if (tasks.length === 0) return null;
                    return (
                      <div key={cat}>
                        <h3 className="text-[12px] font-semibold text-slate-600 mb-2">{CATEGORY_LABELS[cat]}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {tasks.map((task) => (
                            <button
                              key={task.id}
                              type="button"
                              onClick={() => { setSelectedTask(task); setStage('upload'); }}
                              className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-left"
                            >
                              <span className="text-[18px] shrink-0">{task.icon}</span>
                              <div className="min-w-0 flex-1">
                                <div className="text-[12.5px] font-semibold text-slate-800 truncate">{task.label}</div>
                                <div className="text-[10.5px] text-slate-500 truncate">{task.description}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stage 2: 업로드·옵션 */}
            {stage === 'upload' && selectedTask && (
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setStage('pick-task')} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[20px]">{selectedTask.icon}</span>
                  <h2 className="text-[16px] font-bold text-slate-800">{selectedTask.label}</h2>
                  <TierBadge tier={selectedTask.tier} />
                </div>

                {/* 파일 없으면 드롭존 */}
                {files.length === 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={onDropZoneDrop}
                      className="w-full flex flex-col items-center justify-center gap-2 py-12 px-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-violet-400 hover:bg-violet-50/30 transition-colors"
                    >
                      <Upload className="w-8 h-8 text-slate-400" />
                      <div className="text-[13px] font-semibold text-slate-700">{selectedTask.label}용 파일을 올려주세요</div>
                      <div className="text-[11px] text-slate-400">지원: {selectedTask.accept.join(', ')}</div>
                    </button>
                    <input ref={fileInputRef} type="file" multiple={selectedTask.multiFile} accept={selectedTask.accept.join(',')} className="hidden" onChange={(e) => { const picked = Array.from(e.target.files ?? []); void handleFilesSelected(picked); e.target.value = ''; }} />
                  </>
                )}

                {/* 파일 목록 */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((f, i) => (
                      <div key={`${f.name}-${i}`} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                        <span className="text-[20px]">📎</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-slate-800 truncate">{f.name}</div>
                          <div className="text-[11px] text-slate-500">{formatLabel(detectedFormats[i] ?? 'unknown')} · {formatBytes(f.size)}</div>
                        </div>
                        <button type="button" onClick={() => { setFiles((arr) => arr.filter((_, idx) => idx !== i)); setDetectedFormats((arr) => arr.filter((_, idx) => idx !== i)); }} aria-label="제거" className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 태스크별 옵션 */}
                {files.length > 0 && selectedTask.id === 'image-format' && (
                  <div>
                    <div className="text-[12px] font-semibold text-slate-600 mb-2">출력 포맷</div>
                    <div className="inline-flex gap-1 p-0.5 rounded-lg border border-slate-200 bg-slate-50">
                      {(['jpeg', 'png', 'webp'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setImageTarget(fmt)}
                          className={cn('px-3.5 py-1.5 rounded-md text-[12px] font-semibold transition-all', imageTarget === fmt ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-white')}
                        >
                          {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {files.length > 0 && selectedTask.id === 'pdf-to-images' && (
                  <div>
                    <div className="text-[12px] font-semibold text-slate-600 mb-2">이미지 포맷</div>
                    <div className="inline-flex gap-1 p-0.5 rounded-lg border border-slate-200 bg-slate-50">
                      {(['png', 'jpeg'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setPdfImageFormat(fmt)}
                          className={cn('px-3.5 py-1.5 rounded-md text-[12px] font-semibold transition-all', pdfImageFormat === fmt ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-white')}
                        >
                          {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <div className="text-[10.5px] text-slate-400 mt-1.5">페이지별 이미지를 ZIP으로 묶어드려요</div>
                  </div>
                )}
                {files.length > 0 && selectedTask.id === 'pdf-split' && (
                  <div>
                    <div className="text-[12px] font-semibold text-slate-600 mb-2">페이지 범위</div>
                    <input
                      type="text"
                      value={splitRanges}
                      onChange={(e) => setSplitRanges(e.target.value)}
                      placeholder="예: 1-3, 5, 7-9"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                    />
                    <div className="text-[10.5px] text-slate-400 mt-1.5">쉼표로 구분, 하이픈으로 범위 표시 (예: 1-3,5,7-9)</div>
                  </div>
                )}

                {/* 실행 버튼 */}
                {files.length > 0 && (
                  <button
                    type="button"
                    onClick={runConversion}
                    className="w-full h-11 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[14px] font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    변환하기 →
                  </button>
                )}
                {files.length > 0 && selectedTask.estimatedTime && (
                  <div className="text-[11px] text-slate-400 text-center">예상 소요: {selectedTask.estimatedTime}</div>
                )}
              </div>
            )}

            {/* Stage 3: 변환 중 */}
            {stage === 'converting' && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <RefreshCw className="w-10 h-10 text-violet-500 animate-spin" />
                <div className="text-[14px] font-semibold text-slate-700">{progress ?? '변환 중...'}</div>
              </div>
            )}

            {/* Stage 4: 완료 */}
            {stage === 'done' && result && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-[16px] font-bold text-slate-800">변환 완료</h2>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[22px]">{formatIcon(result.outputFormat)}</span>
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-semibold text-slate-800 truncate">{result.fileName}</div>
                        <div className="text-[11px] text-slate-500">
                          {formatBytes(result.originalSize)} → {formatBytes(result.newSize)}
                          {result.originalSize > 0 && (
                            <span className={cn('ml-1.5 font-semibold', result.newSize < result.originalSize ? 'text-emerald-600' : 'text-slate-400')}>
                              ({Math.round(((result.newSize - result.originalSize) / result.originalSize) * 100)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 프리뷰 */}
                  {result.previewText && (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[12px] text-slate-700 whitespace-pre-wrap max-h-60 overflow-auto font-mono leading-relaxed">
                      {result.previewText}
                      {result.previewText.length >= 500 && <div className="text-slate-400 mt-2">... (다운로드하면 전체 확인 가능)</div>}
                    </div>
                  )}
                  {result.previewUrl && (
                    <img src={result.previewUrl} alt="변환 결과 미리보기" className="max-h-80 rounded-lg border border-slate-200 mx-auto" />
                  )}

                  <div className="flex gap-2">
                    <button type="button" onClick={handleDownload} className="flex-1 h-10 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[13px] font-bold inline-flex items-center justify-center gap-1.5">
                      <Download className="w-4 h-4" /> 다운로드
                    </button>
                    <button type="button" onClick={reset} className="h-10 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-semibold">
                      다른 파일 변환
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stage 5: 에러 */}
            {stage === 'error' && (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <AlertTriangle className="w-10 h-10 text-rose-500" />
                <div className="max-w-md">
                  <div className="text-[15px] font-bold text-slate-800 mb-1">변환에 실패했어요</div>
                  <div className="text-[12.5px] text-slate-600">{errorMessage}</div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={runConversion} className="h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[12.5px] font-semibold">다시 시도</button>
                  <button type="button" onClick={reset} className="h-9 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12.5px] font-semibold">처음으로</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </FileConvertErrorBoundary>
  );
}

function TierBadge({ tier }: { tier: ConvertTask['tier'] }) {
  const meta = {
    native: { label: '정확', className: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    'ai-assisted': { label: 'AI', className: 'bg-violet-50 border-violet-200 text-violet-700' },
    lossy: { label: '손실', className: 'bg-amber-50 border-amber-200 text-amber-700' },
  }[tier];
  return <span className={cn('inline-flex items-center h-4 px-1.5 rounded text-[9px] font-bold border', meta.className)}>{meta.label}</span>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatIcon(format: FileFormat): string {
  const map: Record<FileFormat, string> = {
    pdf: '📄', png: '🖼️', jpg: '🖼️', webp: '🖼️', gif: '🎞️', heic: '🖼️',
    docx: '📝', xlsx: '📊', zip: '📦',
    csv: '📊', json: '🔤', md: '📝', html: '🌐', txt: '📝',
    unknown: '📎',
  };
  return map[format];
}
