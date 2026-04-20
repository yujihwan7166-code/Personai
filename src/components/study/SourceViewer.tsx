import { useState, useRef } from 'react';
import { Upload, Link2, Youtube, Mic, X } from 'lucide-react';
import type { StudyNotebook, StudySource } from '@/types/study';
import { newId } from '@/types/study';
import { processFile, validateFile, resolveMimeType } from '@/lib/fileProcessor';
import { LazyMarkdown } from '@/components/LazyMarkdown';
import { StudyBtn } from './ui/primitives';
import { cn } from '@/lib/utils';

interface Props {
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  onStartRecording: () => void;
}

/**
 * 파일의 원본 소스를 보여주는 뷰어.
 * - 소스 없음: 업로드 허브
 * - 텍스트/paste: 마크다운
 * - PDF: 추출된 텍스트 (향후 pdfjs 렌더로 교체)
 * - URL/YouTube: 추출 텍스트 + 원본 링크
 */
export function SourceViewer({ notebook, onChange, onStartRecording }: Props) {
  const source = notebook.sources[0];

  if (!source) {
    return <SourceUploader notebook={notebook} onChange={onChange} onStartRecording={onStartRecording} />;
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-2.5 flex items-center gap-2.5">
        <span className="text-[20px] leading-none select-none shrink-0">{notebook.icon || '📘'}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate">{notebook.title}</h3>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
            {source.kind.toUpperCase()} · {Math.round(source.content.length / 100) / 10}K자 · {source.title}
            {source.url && (
              <>
                {' · '}
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">원본 열기 ↗</a>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="prose prose-sm max-w-[70ch] mx-auto dark:prose-invert prose-slate">
          <LazyMarkdown content={source.content} fallback={<pre className="whitespace-pre-wrap text-[13px] leading-relaxed">{source.content}</pre>} />
        </div>
      </div>
    </div>
  );
}

/**
 * 파일이 비어있을 때 원본 업로드 유도 화면.
 */
function SourceUploader({ notebook, onChange, onStartRecording }: Props) {
  const [mode, setMode] = useState<'url' | 'youtube' | null>(null);
  const [urlValue, setUrlValue] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addSource = (src: StudySource) => {
    onChange({ ...notebook, sources: [src] });
  };

  const addFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setFileError(null);
    const f = files[0];
    const mime = resolveMimeType(f.type, f.name);
    const isText = mime.startsWith('text/') || f.name.endsWith('.md') || f.name.endsWith('.txt');
    try {
      if (isText) {
        const text = await f.text();
        addSource({
          id: newId('src'), kind: 'paste', title: f.name,
          content: text.slice(0, 30000), addedAt: Date.now(), enabled: true, status: 'ready',
        });
        if (notebook.title === '새 파일') onChange({ ...notebook, title: f.name, sources: [{
          id: newId('src'), kind: 'paste', title: f.name, content: text.slice(0, 30000), addedAt: Date.now(), enabled: true, status: 'ready',
        }] });
        return;
      }
      const err = validateFile(f, []);
      if (err) { setFileError(err); return; }
      const processed = await processFile(f);
      const extracted = processed.extractedText || '';
      if (extracted.startsWith('[')) {
        setFileError(`"${f.name}": ${extracted.replace(/^\[|\]$/g, '')}`);
        return;
      }
      if (extracted.length < 50) {
        setFileError(`"${f.name}": 텍스트를 추출하지 못했어요.`);
        return;
      }
      const kind: 'pdf' | 'paste' = mime === 'application/pdf' ? 'pdf' : 'paste';
      const src: StudySource = {
        id: newId('src'), kind, title: processed.name, content: extracted,
        addedAt: Date.now(), enabled: true, status: 'ready',
      };
      // 파일 제목으로 노트북 이름 자동 변경
      onChange({
        ...notebook,
        title: notebook.title === '새 파일' ? processed.name : notebook.title,
        sources: [src],
      });
    } catch {
      setFileError(`"${f.name}" 처리 실패`);
    }
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
        title: notebook.title === '새 파일' ? src.title : notebook.title,
        sources: [src],
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
      className="relative flex flex-col h-full bg-white dark:bg-slate-900"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-2 z-30 rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Upload className="h-10 w-10 mx-auto text-indigo-500" strokeWidth={1.5} />
            <p className="mt-2 text-[13px] font-semibold text-indigo-700 dark:text-indigo-200">여기에 놓으면 이 파일의 소스가 됩니다</p>
          </div>
        </div>
      )}
      <input ref={fileInputRef} type="file" accept=".txt,.md,.docx,.xlsx,.csv,.pdf" onChange={(e) => addFile(e.target.files)} className="hidden" />

      <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-2.5 flex items-center gap-2.5">
        <span className="text-[20px] leading-none select-none shrink-0">{notebook.icon || '📘'}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate">{notebook.title}</h3>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">이 파일에 사용할 원본을 추가하세요</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {mode ? (
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
            {urlError && <p className="mt-2 text-[11px] text-red-600">{urlError}</p>}
          </div>
        ) : (
          <div className="source-hub w-full max-w-xl">
            <div className="text-center mb-5">
              <h3 className="text-[16px] font-bold text-slate-900 dark:text-slate-100">어떤 자료로 공부할까요?</h3>
              <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400 leading-snug">파일을 끌어다 놓거나 아래에서 선택하세요</p>
            </div>
            <div className="source-hub-grid gap-2.5">
              <HubCard accent icon={<Upload className="h-5 w-5" />} label="파일" hint="PDF · DOCX · TXT" onClick={() => fileInputRef.current?.click()} />
              <HubCard icon={<Link2 className="h-5 w-5" />} label="웹 링크" hint="기사 · 문서" onClick={() => setMode('url')} />
              <HubCard icon={<Youtube className="h-5 w-5" />} label="YouTube" hint="영상 자막" onClick={() => setMode('youtube')} />
              <HubCard icon={<Mic className="h-5 w-5" />} label="녹음" hint="강의 실시간" onClick={onStartRecording} />
            </div>
            {fileError && <p className="mt-3 text-center text-[11px] text-red-600">{fileError}</p>}
            <p className="mt-4 text-center text-[10.5px] text-slate-400">파일을 이 창에 끌어다 놓아도 됩니다</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HubCard({ icon, label, hint, onClick, accent }: { icon: React.ReactNode; label: string; hint: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'hub-card flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 min-w-0',
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
