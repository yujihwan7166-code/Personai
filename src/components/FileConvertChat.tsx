import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Download, FileSymlink, RefreshCw, Upload, X, Pencil, ArrowRight, Globe, Search, Star } from 'lucide-react';
import { ModeErrorBoundary } from '@/components/ModeErrorBoundary';
import { ErrorState } from '@/components/shared/ErrorState';
import { notify } from '@/lib/notify';
import { addMemo } from '@/lib/memoStore';
import { upsertPage } from '@/lib/wikiStore';
import { newWikiId, type WikiPage } from '@/types/wiki';

import { cn } from '@/lib/utils';
import { convertDocxToHtml, convertDocxToMarkdown, convertDocxToText } from '@/lib/fileConvert/converters/docx';
import { convertHtmlFileToMd, convertMdFileToHtml, convertMdFileToPdf } from '@/lib/fileConvert/converters/markup';
import {
  convertImageFormat, isImageFormatSupported,
  convertHeicToJpg, compressImage, resizeImage,
  transformImage, batchImageProcess, type ImageTransform, type BatchImageTask,
} from '@/lib/fileConvert/converters/image';
import { convertHtmlFileToPdf } from '@/lib/fileConvert/converters/markup';
import { cleanCsv } from '@/lib/fileConvert/converters/spreadsheet';
import { ocrImageToText, ocrImageToTable, summarizePdf } from '@/lib/fileConvert/converters/ocr';
import {
  imagesToPdf, mergePdfs, pdfToImages, pdfToText, splitPdf,
  compressPdf, rotatePdf, type PdfCompressLevel,
  watermarkPdf, addPdfPageNumbers, protectPdf, unlockPdf,
} from '@/lib/fileConvert/converters/pdf';
import { convertCsvToXlsx, convertXlsxToCsv, convertXlsxToJson } from '@/lib/fileConvert/converters/spreadsheet';
import { detectFormat, extensionOf, formatLabel, type FileFormat } from '@/lib/fileConvert/detect';
import { downloadBlob } from '@/lib/fileConvert/download';
import { isMobile } from '@/lib/fileConvert/features';
import { CATEGORY_LABELS, TASKS, getQuickActions, getTaskById, getTasksByCategory, getTasksForFile, type ConvertTask, type TaskCategory } from '@/lib/fileConvert/tasks';
import { listHistory, addToHistory, formatHistoryTime, type ConvertHistoryItem } from '@/lib/fileConvert/history';
import { getFavoriteIds, toggleFavorite } from '@/lib/fileConvert/favorites';

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
  const navigate = useNavigate();
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
  // 신규 옵션
  const [pdfCompressLevel, setPdfCompressLevel] = useState<PdfCompressLevel>('medium');
  const [pdfRotateDegrees, setPdfRotateDegrees] = useState<90 | 180 | 270>(90);
  const [pdfRotateRanges, setPdfRotateRanges] = useState<string>('');
  const [imageQuality, setImageQuality] = useState<number>(0.7);
  const [resizeMode, setResizeMode] = useState<'pixels' | 'percent'>('percent');
  const [resizeWidth, setResizeWidth] = useState<string>('1280');
  const [resizeHeight, setResizeHeight] = useState<string>('720');
  const [resizeScale, setResizeScale] = useState<number>(0.5);
  // 워터마크
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.2);
  // 페이지 번호
  const [pageNumPosition, setPageNumPosition] = useState<'bottom-center' | 'bottom-right' | 'top-center' | 'top-right'>('bottom-center');
  const [pageNumWithTotal, setPageNumWithTotal] = useState<boolean>(true);
  // 암호
  const [pdfPassword, setPdfPassword] = useState<string>('');
  // 결과 → 메모/위키 export 상태
  const [memoExported, setMemoExported] = useState(false);
  const [wikiExported, setWikiExported] = useState(false);
  // 변환 이력
  const [history, setHistory] = useState<ConvertHistoryItem[]>(() => listHistory());
  // 즐겨찾기
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavoriteIds());
  // 도구 검색
  const [taskSearch, setTaskSearch] = useState('');
  // 파일명 inline 편집
  const [editingFileName, setEditingFileName] = useState(false);
  // 신규 옵션 — 이미지 회전
  const [imageTransform, setImageTransform] = useState<ImageTransform>('rotate-90');
  // 신규 옵션 — 일괄 처리
  const [batchKind, setBatchKind] = useState<'format' | 'compress' | 'resize'>('compress');
  const [batchTargetFormat, setBatchTargetFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  // 신규 옵션 — CSV 정리
  const [csvSortDir, setCsvSortDir] = useState<'asc' | 'desc' | 'none'>('none');
  const [csvSortColumn, setCsvSortColumn] = useState<number>(0);
  const [csvDedupe, setCsvDedupe] = useState<boolean>(false);
  const [csvHasHeader, setCsvHasHeader] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
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
    setMemoExported(false);
    setWikiExported(false);
    setPdfPassword('');
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
        case 'heic-to-jpg': {
          setProgress('HEIC → JPG 변환 중...');
          converted = await convertHeicToJpg(files[0]);
          break;
        }
        case 'image-compress': {
          setProgress(`이미지 압축 중 (품질 ${Math.round(imageQuality * 100)}%)...`);
          converted = await compressImage(files[0], imageQuality);
          break;
        }
        case 'image-resize': {
          setProgress('이미지 리사이즈 중...');
          if (resizeMode === 'percent') {
            converted = await resizeImage(files[0], { scale: resizeScale, quality: 0.92 });
          } else {
            const w = parseInt(resizeWidth, 10);
            const h = parseInt(resizeHeight, 10);
            if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) {
              throw new Error('가로·세로 픽셀을 1 이상 정수로 입력해주세요.');
            }
            converted = await resizeImage(files[0], { maxWidth: w, maxHeight: h, quality: 0.92 });
          }
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
          converted = await compressPdf(files[0], pdfCompressLevel, (p, total) => {
            setProgress(`PDF 압축 중... ${p}/${total} (${pdfCompressLevel === 'high' ? '강' : pdfCompressLevel === 'medium' ? '중' : '약'})`);
          });
          break;
        }
        case 'pdf-rotate': {
          setProgress(`PDF 회전 중 (${pdfRotateDegrees}°)...`);
          converted = await rotatePdf(files[0], pdfRotateDegrees, pdfRotateRanges || undefined);
          break;
        }
        case 'pdf-watermark': {
          if (!watermarkText.trim()) throw new Error('워터마크 텍스트를 입력해주세요.');
          setProgress('PDF 워터마크 추가 중...');
          converted = await watermarkPdf(files[0], { text: watermarkText.trim(), opacity: watermarkOpacity });
          break;
        }
        case 'pdf-page-numbers': {
          setProgress('PDF 페이지 번호 추가 중...');
          converted = await addPdfPageNumbers(files[0], {
            position: pageNumPosition,
            format: pageNumWithTotal ? 'with-total' : 'plain',
          });
          break;
        }
        case 'pdf-protect': {
          if (!pdfPassword || pdfPassword.length < 4) {
            throw new Error('비밀번호는 4자 이상이어야 해요.');
          }
          setProgress('PDF 암호화 중...');
          converted = await protectPdf(files[0], pdfPassword);
          break;
        }
        case 'pdf-unlock': {
          if (!pdfPassword) {
            throw new Error('비밀번호를 입력해주세요.');
          }
          setProgress('PDF 암호 해제 중...');
          converted = await unlockPdf(files[0], pdfPassword);
          break;
        }
        case 'pdf-summarize': {
          converted = await summarizePdf(files[0], controller.signal, (msg) => setProgress(msg));
          break;
        }
        case 'image-table-ocr': {
          setProgress('AI가 표를 분석 중... (10~20초)');
          converted = await ocrImageToTable(files[0], controller.signal);
          break;
        }
        case 'image-rotate': {
          setProgress('이미지 변환 중...');
          converted = await transformImage(files[0], imageTransform);
          break;
        }
        case 'image-batch': {
          if (files.length === 0) throw new Error('파일을 1개 이상 선택해주세요.');
          let task: BatchImageTask;
          switch (batchKind) {
            case 'format':
              task = { kind: 'format', target: batchTargetFormat };
              break;
            case 'compress':
              task = { kind: 'compress', quality: imageQuality, target: batchTargetFormat };
              break;
            case 'resize':
              task = resizeMode === 'percent'
                ? { kind: 'resize', opts: { scale: resizeScale, quality: 0.92 } }
                : {
                    kind: 'resize',
                    opts: {
                      maxWidth: parseInt(resizeWidth, 10) || 1280,
                      maxHeight: parseInt(resizeHeight, 10) || 720,
                      quality: 0.92,
                    },
                  };
              break;
          }
          converted = await batchImageProcess(files, task, (cur, total, name) => {
            setProgress(`일괄 변환 중... ${cur}/${total} · ${name}`);
          });
          break;
        }
        case 'html-to-pdf': {
          setProgress('HTML → PDF 변환 중...');
          converted = await convertHtmlFileToPdf(files[0]);
          break;
        }
        case 'csv-clean': {
          setProgress('CSV 정리 중...');
          converted = await cleanCsv(files[0], {
            hasHeader: csvHasHeader,
            sortDir: csvSortDir,
            sortColumn: csvSortColumn,
            dedupe: csvDedupe,
            removeEmpty: true,
          });
          break;
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
        case 'md-to-pdf': {
          setProgress('Markdown → PDF 변환 중...');
          converted = await convertMdFileToPdf(files[0]);
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
      setMemoExported(false);
      setWikiExported(false);
      setEditingFileName(false);
      setStage('done');
      setProgress(null);
      // 이력 저장
      addToHistory({
        taskId: selectedTask.id,
        taskLabel: selectedTask.label,
        taskIcon: selectedTask.icon,
        fileName: files[0].name,
        outputFileName: converted.suggestedName,
        outputFormat: outputFmt,
        originalSize: files[0].size,
        newSize: converted.blob.size,
      });
      setHistory(listHistory());
      // 변환 완료 토스트
      const sizeDiff = files[0].size > 0
        ? Math.round(((converted.blob.size - files[0].size) / files[0].size) * 100)
        : 0;
      const sizeNote = files[0].size > 0 && Math.abs(sizeDiff) >= 5
        ? ` (${sizeDiff > 0 ? '+' : ''}${sizeDiff}%)`
        : '';
      notify.success(`${converted.suggestedName} 변환 완료${sizeNote}`, { duration: 3000 });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = (err as Error).message || '변환 중 문제가 생겼어요.';
      setErrorMessage(msg);
      setStage('error');
      setProgress(null);
      notify.error('변환 실패', { description: msg, duration: 5000 });
    }
     
  }, [
    selectedTask, files, imageTarget, pdfImageFormat, splitRanges,
    pdfCompressLevel, pdfRotateDegrees, pdfRotateRanges,
    imageQuality, resizeMode, resizeWidth, resizeHeight, resizeScale,
    watermarkText, watermarkOpacity,
    pageNumPosition, pageNumWithTotal,
    pdfPassword,
  ]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    void downloadBlob(result.blob, result.fileName);
    notify.saved(result.fileName);
  }, [result]);

  const categories: TaskCategory[] = ['pdf', 'image', 'doc', 'data', 'markup'];
  const quickActions = useMemo(() => getQuickActions(), []);

  return (
    <ModeErrorBoundary modeLabel="파일 변환" resetKey={selectedTask?.id ?? 'none'} onReset={reset}>
      <div className="flex flex-col h-full bg-gradient-to-b from-accent/20 to-background relative">
        {/* 전역 드래그 오버레이 */}
        {isDragging && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-violet-500/15 backdrop-blur-sm border-4 border-dashed border-violet-400 rounded-lg" />
            <div className="relative text-[20px] font-bold text-violet-700 dark:text-violet-300 bg-card px-6 py-3 rounded-2xl shadow-lg border border-[hsl(var(--hairline))]">
              📁 여기에 파일을 놓아주세요
            </div>
          </div>
        )}

        {/* 헤더 */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-5 md:px-8 py-4 border-b border-[hsl(var(--hairline))] bg-card/70 backdrop-blur-sm">
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
              <button type="button" onClick={reset} className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-[12.5px] font-semibold text-muted-foreground hover:bg-accent">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">처음으로</span>
              </button>
            )}
            {onBack && (
              <button type="button" onClick={onBack} aria-label="닫기" className="p-2 rounded-lg text-muted-foreground/70 hover:text-muted-foreground hover:bg-accent"><X className="w-5 h-5" /></button>
            )}
          </div>
        </div>

        {/* 5단계 진행 인디케이터 — Linear/Stripe 패턴 */}
        {stage !== 'pick-task' && (
          <div className="shrink-0 px-5 md:px-8 py-2.5 border-b border-[hsl(var(--hairline))] bg-card/50">
            <div className="max-w-5xl mx-auto flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[0.12em]">
              {([
                { s: 'pick-task' as Stage, label: '도구' },
                { s: 'upload' as Stage, label: '업로드' },
                { s: 'converting' as Stage, label: '변환' },
                { s: 'done' as Stage, label: '완료' },
              ]).map((step, i, arr) => {
                const stageOrder: Record<Stage, number> = { 'pick-task': 0, 'upload': 1, 'converting': 2, 'done': 3, 'error': 2 };
                const cur = stageOrder[stage];
                const my = stageOrder[step.s];
                const active = my === cur;
                const done = my < cur;
                return (
                  <div key={step.s} className="flex items-center gap-1.5 flex-1 min-w-0">
                    <div
                      className={cn(
                        'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 transition-all',
                        active && 'bg-violet-600 text-white',
                        done && 'bg-emerald-500 text-white',
                        !active && !done && 'bg-accent text-muted-foreground',
                      )}
                    >
                      {done ? <Check className="w-3 h-3" /> : i + 1}
                    </div>
                    <span
                      className={cn(
                        'truncate transition-colors',
                        active && 'text-foreground font-bold',
                        done && 'text-emerald-700 dark:text-emerald-400',
                        !active && !done && 'text-muted-foreground/70',
                      )}
                    >
                      {step.label}
                    </span>
                    {i < arr.length - 1 && (
                      <div className={cn('flex-1 h-px transition-colors', done ? 'bg-emerald-500/40' : 'bg-[hsl(var(--hairline))]')} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                  className="w-full flex flex-col items-center justify-center gap-2 py-10 px-6 rounded-2xl border-2 border-dashed border-[hsl(var(--hairline))] hover:border-violet-400 hover:bg-violet-50/30 transition-colors"
                >
                  <Upload className="w-8 h-8 text-muted-foreground/70" />
                  <div className="text-[14px] font-semibold text-foreground">파일을 여기 놓거나 클릭해서 선택하세요</div>
                  <div className="text-[11.5px] text-muted-foreground/70">PDF · 이미지 · Word · Excel · CSV · Markdown 등</div>
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { const picked = Array.from(e.target.files ?? []); void handleFilesSelected(picked); e.target.value = ''; }} />
                {/* 모바일 — 카메라 직접 촬영 */}
                {isMobile() && (
                  <>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const picked = Array.from(e.target.files ?? []);
                        void handleFilesSelected(picked);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-violet-300 bg-violet-50/30 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 text-[13.5px] font-bold hover:bg-violet-50 dark:hover:bg-violet-500/15 transition-colors"
                    >
                      <span className="text-[18px]">📷</span>
                      카메라로 찍기
                    </button>
                  </>
                )}

                {/* 도구 검색바 — 28+ 카탈로그 발견성 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="도구 검색 (예: 압축, PDF, 회전)"
                    className="w-full h-10 pl-10 pr-9 rounded-xl border border-[hsl(var(--hairline))] bg-card text-[13px] focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                  />
                  {taskSearch && (
                    <button
                      type="button"
                      onClick={() => setTaskSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="검색 지우기"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 즐겨찾기 — 있을 때만 (검색 중엔 숨김) */}
                {favoriteIds.length > 0 && taskSearch.trim().length === 0 && (
                  <div>
                    <h2 className="text-[11.5px] uppercase tracking-wider font-bold text-muted-foreground mb-2.5 flex items-center gap-2">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                      즐겨찾기
                    </h2>
                    <div className={cn('grid gap-2.5', isMobile() ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4')}>
                      {favoriteIds.map((id) => {
                        const task = TASKS.find((t) => t.id === id);
                        if (!task) return null;
                        return (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => { setSelectedTask(task); setStage('upload'); }}
                            className="group text-left rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/30 dark:bg-amber-500/5 p-3.5 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:shadow-md hover:-translate-y-0.5 transition-all"
                          >
                            <div className="flex items-start justify-between mb-1.5">
                              <span className="text-[22px]">{task.icon}</span>
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                            </div>
                            <div className="text-[13px] font-bold text-foreground mb-0.5 leading-tight">{task.label}</div>
                            <div className="text-[10.5px] text-muted-foreground leading-snug">{task.description}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 최근 변환 — 있을 때만 (검색 중엔 숨김) */}
                {history.length > 0 && taskSearch.trim().length === 0 && (
                  <div>
                    <h2 className="text-[11.5px] uppercase tracking-wider font-bold text-muted-foreground mb-2.5 flex items-center gap-2">
                      <RefreshCw className="w-3 h-3" />
                      최근 변환
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {history.slice(0, 5).map((h) => {
                        const task = TASKS.find((t) => t.id === h.taskId);
                        return (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => {
                              if (task) {
                                setSelectedTask(task);
                                setStage('upload');
                              }
                            }}
                            disabled={!task}
                            title={`${h.fileName} → ${h.outputFileName} · ${formatHistoryTime(h.completedAt)}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[hsl(var(--hairline))] bg-card hover:border-violet-300 hover:bg-violet-50/30 dark:hover:bg-violet-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                          >
                            <span className="text-[14px] leading-none">{h.taskIcon}</span>
                            <span className="flex flex-col min-w-0 max-w-[180px]">
                              <span className="text-[11.5px] font-semibold text-foreground truncate">{h.taskLabel}</span>
                              <span className="text-[9.5px] text-muted-foreground tabular-nums">{formatHistoryTime(h.completedAt)}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 검색 활성 시 평면 결과 */}
                {taskSearch.trim().length > 0 ? (
                  (() => {
                    const q = taskSearch.trim().toLowerCase();
                    const matches = TASKS.filter(
                      (t) => t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
                    );
                    return (
                      <div>
                        <h2 className="text-[11.5px] uppercase tracking-wider font-bold text-muted-foreground mb-2.5">
                          검색 결과 · {matches.length}
                        </h2>
                        {matches.length === 0 ? (
                          <p className="text-center text-[13px] text-muted-foreground py-10">
                            "<span className="text-foreground font-semibold">{taskSearch}</span>" 와 일치하는 도구가 없어요
                          </p>
                        ) : (
                          <div className={cn('grid gap-2.5', isMobile() ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4')}>
                            {matches.map((task) => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                isFavorite={favoriteIds.includes(task.id)}
                                onSelect={() => { setSelectedTask(task); setStage('upload'); }}
                                onToggleFavorite={() => {
                                  toggleFavorite(task.id);
                                  setFavoriteIds(getFavoriteIds());
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <>
                    {/* Quick Actions */}
                    <div>
                      <h2 className="text-[11.5px] uppercase tracking-wider font-bold text-muted-foreground mb-2.5">자주 쓰는 도구</h2>
                      <div className={cn('grid gap-2.5', isMobile() ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4')}>
                        {quickActions.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            isFavorite={favoriteIds.includes(task.id)}
                            onSelect={() => { setSelectedTask(task); setStage('upload'); }}
                            onToggleFavorite={() => {
                              toggleFavorite(task.id);
                              setFavoriteIds(getFavoriteIds());
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* 카테고리별 더 많은 도구 */}
                    <div className="space-y-4">
                      <h2 className="text-[11.5px] uppercase tracking-wider font-bold text-muted-foreground">더 많은 도구</h2>
                      {categories.map((cat) => {
                        const tasks = getTasksByCategory(cat).filter((t) => !t.quickAction);
                        if (tasks.length === 0) return null;
                        return (
                          <div key={cat}>
                            <h3 className="text-[12px] font-semibold text-muted-foreground mb-2">{CATEGORY_LABELS[cat]}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {tasks.map((task) => {
                                const isFav = favoriteIds.includes(task.id);
                                return (
                                  <button
                                    key={task.id}
                                    type="button"
                                    onClick={() => { setSelectedTask(task); setStage('upload'); }}
                                    className="group relative flex items-center gap-2.5 p-2.5 rounded-lg border border-[hsl(var(--hairline))] bg-card hover:bg-accent/40 text-left"
                                  >
                                    <span className="text-[18px] shrink-0">{task.icon}</span>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[12.5px] font-semibold text-foreground truncate">{task.label}</div>
                                      <div className="text-[10.5px] text-muted-foreground truncate">{task.description}</div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFavorite(task.id);
                                        setFavoriteIds(getFavoriteIds());
                                      }}
                                      className={cn(
                                        'opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded',
                                        isFav && 'opacity-100',
                                      )}
                                      title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                                    >
                                      <Star className={cn('w-3.5 h-3.5', isFav ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground')} />
                                    </button>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Stage 2: 업로드·옵션 */}
            {stage === 'upload' && selectedTask && (
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setStage('pick-task')} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[20px]">{selectedTask.icon}</span>
                  <h2 className="text-[16px] font-bold text-foreground">{selectedTask.label}</h2>
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
                      className="w-full flex flex-col items-center justify-center gap-2 py-12 px-6 rounded-2xl border-2 border-dashed border-[hsl(var(--hairline))] hover:border-violet-400 hover:bg-violet-50/30 transition-colors"
                    >
                      <Upload className="w-8 h-8 text-muted-foreground/70" />
                      <div className="text-[13px] font-semibold text-foreground">{selectedTask.label}용 파일을 올려주세요</div>
                      <div className="text-[11px] text-muted-foreground/70">지원: {selectedTask.accept.join(', ')}</div>
                    </button>
                    <input ref={fileInputRef} type="file" multiple={selectedTask.multiFile} accept={selectedTask.accept.join(',')} className="hidden" onChange={(e) => { const picked = Array.from(e.target.files ?? []); void handleFilesSelected(picked); e.target.value = ''; }} />
                  </>
                )}

                {/* 파일 목록 */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((f, i) => (
                      <div key={`${f.name}-${i}`} className="flex items-center gap-3 p-3 rounded-lg border border-[hsl(var(--hairline))] bg-card">
                        <span className="text-[20px]">📎</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-foreground truncate">{f.name}</div>
                          <div className="text-[11px] text-muted-foreground">{formatLabel(detectedFormats[i] ?? 'unknown')} · {formatBytes(f.size)}</div>
                        </div>
                        <button type="button" onClick={() => { setFiles((arr) => arr.filter((_, idx) => idx !== i)); setDetectedFormats((arr) => arr.filter((_, idx) => idx !== i)); }} aria-label="제거" className="p-1.5 rounded-md text-muted-foreground/70 hover:text-rose-600 hover:bg-rose-50">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 태스크별 옵션 */}
                {files.length > 0 && selectedTask.id === 'image-format' && (
                  <div>
                    <div className="text-[12px] font-semibold text-muted-foreground mb-2">출력 포맷</div>
                    <div className="inline-flex gap-1 p-0.5 rounded-lg border border-[hsl(var(--hairline))] bg-accent/40">
                      {(['jpeg', 'png', 'webp'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setImageTarget(fmt)}
                          className={cn('px-3.5 py-1.5 rounded-md text-[12px] font-semibold transition-all', imageTarget === fmt ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-card')}
                        >
                          {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {files.length > 0 && selectedTask.id === 'pdf-to-images' && (
                  <div>
                    <div className="text-[12px] font-semibold text-muted-foreground mb-2">이미지 포맷</div>
                    <div className="inline-flex gap-1 p-0.5 rounded-lg border border-[hsl(var(--hairline))] bg-accent/40">
                      {(['png', 'jpeg'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setPdfImageFormat(fmt)}
                          className={cn('px-3.5 py-1.5 rounded-md text-[12px] font-semibold transition-all', pdfImageFormat === fmt ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-card')}
                        >
                          {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground/70 mt-1.5">페이지별 이미지를 ZIP으로 묶어드려요</div>
                  </div>
                )}
                {files.length > 0 && selectedTask.id === 'pdf-split' && (
                  <div>
                    <div className="text-[12px] font-semibold text-foreground mb-2">페이지 범위</div>
                    <input
                      type="text"
                      value={splitRanges}
                      onChange={(e) => setSplitRanges(e.target.value)}
                      placeholder="예: 1-3, 5, 7-9"
                      className="w-full h-9 px-3 rounded-lg border border-[hsl(var(--hairline))] bg-card text-[13px] focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                    />
                    <div className="text-[10.5px] text-muted-foreground mt-1.5">쉼표로 구분, 하이픈으로 범위 표시 (예: 1-3,5,7-9)</div>
                  </div>
                )}
                {files.length > 0 && selectedTask.id === 'pdf-compress' && (
                  <div>
                    <div className="text-[12px] font-semibold text-foreground mb-2">압축 강도</div>
                    <div className="inline-flex gap-1 p-0.5 rounded-lg border border-[hsl(var(--hairline))] bg-accent/40">
                      {([
                        { v: 'low' as const, label: '약', desc: '화질 우선' },
                        { v: 'medium' as const, label: '중', desc: '균형' },
                        { v: 'high' as const, label: '강', desc: '용량 최소' },
                      ]).map((c) => (
                        <button
                          key={c.v}
                          type="button"
                          onClick={() => setPdfCompressLevel(c.v)}
                          className={cn(
                            'px-3.5 py-1.5 rounded-md text-[12px] font-semibold transition-all flex flex-col items-center min-w-[60px]',
                            pdfCompressLevel === c.v
                              ? 'bg-foreground text-background'
                              : 'text-muted-foreground hover:text-foreground hover:bg-card',
                          )}
                        >
                          <span>{c.label}</span>
                          <span className="text-[9.5px] opacity-70 font-normal">{c.desc}</span>
                        </button>
                      ))}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground mt-1.5">
                      이미지 위주 PDF에 효과 큼 · 텍스트 PDF 는 효과 작음
                    </div>
                  </div>
                )}
                {files.length > 0 && selectedTask.id === 'pdf-rotate' && (
                  <div className="space-y-3">
                    <div>
                      <div className="text-[12px] font-semibold text-foreground mb-2">회전 각도</div>
                      <div className="inline-flex gap-1 p-0.5 rounded-lg border border-[hsl(var(--hairline))] bg-accent/40">
                        {([90, 180, 270] as const).map((deg) => (
                          <button
                            key={deg}
                            type="button"
                            onClick={() => setPdfRotateDegrees(deg)}
                            className={cn(
                              'px-3.5 py-1.5 rounded-md text-[12px] font-semibold transition-all',
                              pdfRotateDegrees === deg
                                ? 'bg-foreground text-background'
                                : 'text-muted-foreground hover:text-foreground hover:bg-card',
                            )}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-foreground mb-2">페이지 범위 (선택)</div>
                      <input
                        type="text"
                        value={pdfRotateRanges}
                        onChange={(e) => setPdfRotateRanges(e.target.value)}
                        placeholder="비워두면 모든 페이지 (예: 1-3,5)"
                        className="w-full h-9 px-3 rounded-lg border border-[hsl(var(--hairline))] bg-card text-[13px] focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                      />
                    </div>
                  </div>
                )}
                {files.length > 0 && selectedTask.id === 'image-compress' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[12px] font-semibold text-foreground">품질</div>
                      <div className="text-[12px] tabular-nums text-muted-foreground">{Math.round(imageQuality * 100)}%</div>
                    </div>
                    <input
                      type="range"
                      min={30}
                      max={95}
                      step={5}
                      value={Math.round(imageQuality * 100)}
                      onChange={(e) => setImageQuality(parseInt(e.target.value, 10) / 100)}
                      className="w-full accent-violet-600"
                    />
                    <div className="flex justify-between text-[10.5px] text-muted-foreground mt-1">
                      <span>용량 작음</span>
                      <span>화질 좋음</span>
                    </div>
                  </div>
                )}
                {files.length > 0 && selectedTask.id === 'pdf-watermark' && (
                  <div className="space-y-3">
                    <div>
                      <div className="text-[12px] font-semibold text-foreground mb-2">워터마크 텍스트</div>
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        maxLength={40}
                        placeholder="예: CONFIDENTIAL · 비공개 · 초안"
                        className="w-full h-9 px-3 rounded-lg border border-[hsl(var(--hairline))] bg-card text-[13px] focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[12px] font-semibold text-foreground">투명도</div>
                        <div className="text-[12px] tabular-nums text-muted-foreground">{Math.round(watermarkOpacity * 100)}%</div>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={60}
                        step={5}
                        value={Math.round(watermarkOpacity * 100)}
                        onChange={(e) => setWatermarkOpacity(parseInt(e.target.value, 10) / 100)}
                        className="w-full accent-violet-600"
                      />
                    </div>
                    <div className="text-[10.5px] text-muted-foreground">대각선 -45° 로 모든 페이지 중앙에 박힙니다</div>
                  </div>
                )}
                {files.length > 0 && selectedTask.id === 'pdf-page-numbers' && (
                  <div className="space-y-3">
                    <div>
                      <div className="text-[12px] font-semibold text-foreground mb-2">위치</div>
                      <div className="grid grid-cols-2 gap-1 max-w-[280px]">
                        {([
                          { v: 'top-center' as const, label: '상단 가운데' },
                          { v: 'top-right' as const, label: '상단 오른쪽' },
                          { v: 'bottom-center' as const, label: '하단 가운데' },
                          { v: 'bottom-right' as const, label: '하단 오른쪽' },
                        ]).map((p) => (
                          <button
                            key={p.v}
                            type="button"
                            onClick={() => setPageNumPosition(p.v)}
                            className={cn(
                              'px-2 py-1.5 rounded-md text-[11.5px] font-semibold border transition-all',
                              pageNumPosition === p.v
                                ? 'bg-foreground text-background border-foreground'
                                : 'bg-card text-muted-foreground border-[hsl(var(--hairline))] hover:text-foreground',
                            )}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-[12px] text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pageNumWithTotal}
                        onChange={(e) => setPageNumWithTotal(e.target.checked)}
                        className="accent-violet-600"
                      />
                      전체 페이지 수 함께 표시 (3 / 10)
                    </label>
                  </div>
                )}
                {files.length > 0 && (selectedTask.id === 'pdf-protect' || selectedTask.id === 'pdf-unlock') && (
                  <div>
                    <div className="text-[12px] font-semibold text-foreground mb-2">
                      {selectedTask.id === 'pdf-protect' ? '새 비밀번호 (4자 이상)' : '현재 비밀번호'}
                    </div>
                    <input
                      type="password"
                      value={pdfPassword}
                      onChange={(e) => setPdfPassword(e.target.value)}
                      placeholder={selectedTask.id === 'pdf-protect' ? '강한 비밀번호를 정해주세요' : 'PDF 의 비밀번호를 입력하세요'}
                      autoComplete="new-password"
                      className="w-full h-9 px-3 rounded-lg border border-[hsl(var(--hairline))] bg-card text-[13px] focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                    />
                    <div className="text-[10.5px] text-muted-foreground mt-1.5">
                      {selectedTask.id === 'pdf-protect'
                        ? '⚠️ 비밀번호를 잃어버리면 다시 열 수 없어요. 안전하게 보관하세요.'
                        : '제대로 된 비밀번호여야 해요. 틀리면 변환 실패합니다.'}
                    </div>
                  </div>
                )}
                {files.length > 0 && selectedTask.id === 'image-resize' && (
                  <div className="space-y-3">
                    <div className="inline-flex gap-1 p-0.5 rounded-lg border border-[hsl(var(--hairline))] bg-accent/40">
                      {(['percent', 'pixels'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setResizeMode(m)}
                          className={cn(
                            'px-3.5 py-1.5 rounded-md text-[12px] font-semibold transition-all',
                            resizeMode === m
                              ? 'bg-foreground text-background'
                              : 'text-muted-foreground hover:text-foreground hover:bg-card',
                          )}
                        >
                          {m === 'percent' ? '비율 (%)' : '픽셀 (px)'}
                        </button>
                      ))}
                    </div>
                    {resizeMode === 'percent' ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[12px] font-semibold text-foreground">크기</div>
                          <div className="text-[12px] tabular-nums text-muted-foreground">{Math.round(resizeScale * 100)}%</div>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={100}
                          step={5}
                          value={Math.round(resizeScale * 100)}
                          onChange={(e) => setResizeScale(parseInt(e.target.value, 10) / 100)}
                          className="w-full accent-violet-600"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[10.5px] text-muted-foreground mb-1">최대 가로 (px)</div>
                          <input
                            type="number"
                            value={resizeWidth}
                            onChange={(e) => setResizeWidth(e.target.value)}
                            min={1}
                            className="w-full h-9 px-3 rounded-lg border border-[hsl(var(--hairline))] bg-card text-[13px] focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                          />
                        </div>
                        <div>
                          <div className="text-[10.5px] text-muted-foreground mb-1">최대 세로 (px)</div>
                          <input
                            type="number"
                            value={resizeHeight}
                            onChange={(e) => setResizeHeight(e.target.value)}
                            min={1}
                            className="w-full h-9 px-3 rounded-lg border border-[hsl(var(--hairline))] bg-card text-[13px] focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                          />
                        </div>
                      </div>
                    )}
                    <div className="text-[10.5px] text-muted-foreground">비율 유지하며 큰 쪽이 한도에 맞춰 줄어요</div>
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
                  <div className="text-[11px] text-muted-foreground/70 text-center">예상 소요: {selectedTask.estimatedTime}</div>
                )}
              </div>
            )}

            {/* Stage 3: 변환 중 */}
            {stage === 'converting' && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <RefreshCw className="w-10 h-10 text-violet-500 animate-spin" />
                <div className="text-[14px] font-semibold text-foreground">{progress ?? '변환 중...'}</div>
              </div>
            )}

            {/* Stage 4: 완료 */}
            {stage === 'done' && result && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-[16px] font-bold text-foreground">변환 완료</h2>
                </div>

                <div className="rounded-2xl border border-[hsl(var(--hairline))] bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[22px]">{formatIcon(result.outputFormat)}</span>
                      <div className="min-w-0 flex-1">
                        {/* 파일명 inline 편집 */}
                        {editingFileName ? (
                          <input
                            type="text"
                            autoFocus
                            value={result.fileName}
                            onChange={(e) => setResult({ ...result, fileName: e.target.value })}
                            onBlur={() => setEditingFileName(false)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setEditingFileName(false);
                              if (e.key === 'Escape') setEditingFileName(false);
                            }}
                            className="w-full text-[13.5px] font-semibold text-foreground bg-transparent border-b border-violet-400 focus:outline-none"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingFileName(true)}
                            className="group/name inline-flex items-center gap-1 text-[13.5px] font-semibold text-foreground hover:text-violet-700 dark:hover:text-violet-300 truncate text-left"
                            title="클릭해서 이름 수정"
                          >
                            <span className="truncate">{result.fileName}</span>
                            <Pencil className="w-3 h-3 opacity-0 group-hover/name:opacity-60 shrink-0" />
                          </button>
                        )}
                        <div className="text-[11px] text-muted-foreground">
                          {formatBytes(result.originalSize)} → {formatBytes(result.newSize)}
                          {result.originalSize > 0 && (
                            <span className={cn('ml-1.5 font-semibold', result.newSize < result.originalSize ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/70')}>
                              ({Math.round(((result.newSize - result.originalSize) / result.originalSize) * 100)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 프리뷰 */}
                  {result.previewText && (
                    <div className="p-3 rounded-lg bg-accent/40 border border-[hsl(var(--hairline))] text-[12px] text-foreground whitespace-pre-wrap max-h-60 overflow-auto font-mono leading-relaxed">
                      {result.previewText}
                      {result.previewText.length >= 500 && <div className="text-muted-foreground/70 mt-2">... (다운로드하면 전체 확인 가능)</div>}
                    </div>
                  )}
                  {result.previewUrl && (
                    <img src={result.previewUrl} alt="변환 결과 미리보기" className="max-h-80 rounded-lg border border-[hsl(var(--hairline))] mx-auto" />
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={handleDownload} className="flex-1 min-w-[140px] h-10 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[13px] font-bold inline-flex items-center justify-center gap-1.5">
                      <Download className="w-4 h-4" /> 다운로드
                    </button>
                    {/* 메모로 — 텍스트류 결과만 */}
                    {result.previewText && ['txt', 'md', 'csv', 'json', 'html'].includes(result.outputFormat) && (
                      memoExported ? (
                        <button
                          type="button"
                          onClick={() => navigate('/memos')}
                          className="h-10 px-4 rounded-lg bg-violet-50 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 border border-violet-200 dark:border-violet-500/30"
                        >
                          <Pencil className="w-4 h-4" />
                          메모 열기
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            const fullText = await result.blob.text();
                            const memo = addMemo({
                              body: `${result.fileName}\n\n${fullText}\n\n---\n출처: 파일 변환 (${selectedTask?.label ?? ''})`,
                            });
                            setMemoExported(true);
                            notify.success('메모로 보냈어요', {
                              duration: 3000,
                              action: { label: '메모 열기', onClick: () => navigate(`/memos?id=${memo.id}`) },
                            });
                          }}
                          className="h-10 px-4 rounded-lg bg-card hover:bg-accent border border-[hsl(var(--hairline))] text-foreground text-[13px] font-semibold inline-flex items-center justify-center gap-1.5"
                        >
                          <Pencil className="w-4 h-4" /> 메모로
                        </button>
                      )
                    )}
                    {/* 위키로 — 긴 텍스트 결과만 (300자+) */}
                    {result.previewText && result.previewText.length > 100 && ['md', 'html', 'txt'].includes(result.outputFormat) && (
                      wikiExported ? (
                        <button
                          type="button"
                          onClick={() => navigate('/wiki')}
                          className="h-10 px-4 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-500/30"
                        >
                          <Globe className="w-4 h-4" />
                          위키 열기
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            const fullText = await result.blob.text();
                            // 파일명에서 확장자 제거 → 페이지 제목
                            const title = result.fileName.replace(/\.[^.]+$/, '').slice(0, 80);
                            const now = Date.now();
                            const page: WikiPage = {
                              id: newWikiId(),
                              title,
                              aliases: [],
                              type: 'source',
                              status: 'draft',
                              tags: [],
                              body: `${fullText}\n\n---\n출처: 파일 변환 (${selectedTask?.label ?? ''})`,
                              refersTo: [],
                              cites: [],
                              inherits: [],
                              similarTo: [],
                              parentMocs: [],
                              createdAt: now,
                              updatedAt: now,
                            };
                            try {
                              await upsertPage(page);
                              setWikiExported(true);
                              notify.success('위키 페이지로 보냈어요', {
                                duration: 3000,
                                action: { label: '위키 열기', onClick: () => navigate('/wiki') },
                              });
                            } catch (e) {
                              notify.error('위키 페이지 생성 실패', { description: (e as Error).message });
                            }
                          }}
                          className="h-10 px-4 rounded-lg bg-card hover:bg-accent border border-[hsl(var(--hairline))] text-foreground text-[13px] font-semibold inline-flex items-center justify-center gap-1.5"
                        >
                          <Globe className="w-4 h-4" /> 위키로
                        </button>
                      )
                    )}
                    <button type="button" onClick={reset} className="h-10 px-4 rounded-lg bg-accent hover:bg-accent/80 text-foreground text-[13px] font-semibold">
                      다른 파일 변환
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stage 5: 에러 */}
            {stage === 'error' && (
              <ErrorState
                error={errorMessage}
                onPrimary={runConversion}
                onSecondary={reset}
                compact
                className="py-12"
              />
            )}

          </div>
        </div>
      </div>
    </ModeErrorBoundary>
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
