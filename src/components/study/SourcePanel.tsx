import { useState, useRef, useEffect } from 'react';
import { FileText, Link2, Youtube, Clipboard, Trash2, Mic, Upload, Plus, X } from 'lucide-react';
import type { StudySource } from '@/types/study';
import { newId } from '@/types/study';
import { filesToStudySources } from '@/lib/studySourceFromFile';
import { StudyBtn, StatusDot } from './ui/primitives';
import { cn } from '@/lib/utils';

interface Props {
  sources: StudySource[];
  onChange: (sources: StudySource[]) => void;
  onStartRecording: () => void;
}

type AddMode = 'menu' | 'paste' | 'url' | null;

export function SourcePanel({ sources, onChange, onStartRecording }: Props) {
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addPaste = () => {
    if (!pasteText.trim()) return;
    onChange([{
      id: newId('src'), kind: 'paste',
      title: pasteTitle.trim() || '붙여넣은 텍스트',
      content: pasteText.trim(), addedAt: Date.now(), enabled: true, status: 'ready',
    }, ...sources]);
    setPasteTitle(''); setPasteText(''); setAddMode(null);
  };

  const addUrl = async () => {
    const url = urlValue.trim();
    if (!url) return;
    setLoadingUrl(true); setUrlError(null);
    try {
      const r = await fetch('/api/study-url-extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await r.json();
      if (!r.ok) { setUrlError(data?.error || '가져오지 못했어요.'); return; }
      onChange([{
        id: newId('src'), kind: data.kind === 'youtube' ? 'youtube' : 'url',
        title: data.title || url, content: data.content, url,
        addedAt: Date.now(), enabled: true, status: 'ready',
      }, ...sources]);
      setUrlValue(''); setAddMode(null);
    } catch { setUrlError('네트워크 오류입니다.'); }
    finally { setLoadingUrl(false); }
  };

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setFileError(null);
    const { sources: added, errors } = await filesToStudySources(Array.from(files));
    if (errors.length > 0) setFileError(errors[errors.length - 1]);
    if (added.length > 0) onChange([...added, ...sources]);
    setAddMode(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggle = (id: string) => onChange(sources.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  const remove = (id: string) => onChange(sources.filter((s) => s.id !== id));

  const hiddenFileInput = (
    <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.docx,.xlsx,.csv,.pdf,.pptx"
      onChange={(e) => addFiles(e.target.files)} className="hidden" />
  );

  if (sources.length === 0 && addMode === null) {
    return (
      <div className="flex h-full flex-col bg-white dark:bg-slate-900">
        {hiddenFileInput}
        <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3">
          <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100">소스</h3>
        </div>
        <div className="flex-1 flex flex-col px-4 py-6">
          <button
            onClick={() => setAddMode('menu')}
            className="w-full flex items-center justify-center gap-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 px-4 py-2.5 text-[12.5px] font-semibold transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> 소스 추가
          </button>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40 mb-4">
              <Upload className="h-6 w-6 text-indigo-500" strokeWidth={1.8} />
            </div>
            <p className="text-[14px] font-bold text-slate-900 dark:text-slate-100 mb-1">여기에 공부할 자료를 올려보세요</p>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
              파일 · 웹 링크 · 유튜브 · 강의 녹음<br />어떤 형식이든 괜찮아요
            </p>
            <p className="mt-5 text-[10.5px] text-slate-400">파일을 이 창에 끌어다 놓아도 돼요</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      {hiddenFileInput}
      <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100">소스</h3>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400">탭해서 켜고 끄기</p>
        </div>
        <button
          onClick={() => setAddMode('menu')}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
          aria-label="소스 추가"
          title="소스 추가"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sources.map((s) => (
          <button
            key={s.id}
            onClick={() => toggle(s.id)}
            className={cn(
              'w-full text-left flex items-start gap-3 px-5 py-3 border-b border-slate-100 dark:border-slate-800/60 transition-colors',
              s.enabled
                ? 'bg-indigo-50/50 dark:bg-indigo-950/20 study-accent-bar'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-60',
            )}
          >
            <StatusDot status={s.status} />
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100 truncate">{s.title}</p>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                {s.kind.toUpperCase()} · {Math.round(s.content.length / 100) / 10}K자
              </p>
              {s.errorMessage && <p className="text-[10.5px] text-red-600 mt-0.5">{s.errorMessage}</p>}
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); remove(s.id); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); remove(s.id); } }}
              className="text-slate-300 hover:text-red-500 transition-colors"
              aria-label="삭제"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </div>
          </button>
        ))}
      </div>

      {addMode !== null && (
        <AddSheet
          mode={addMode}
          onSelectMode={setAddMode}
          onClose={() => setAddMode(null)}
          pasteTitle={pasteTitle} setPasteTitle={setPasteTitle}
          pasteText={pasteText} setPasteText={setPasteText}
          onAddPaste={addPaste}
          urlValue={urlValue} setUrlValue={setUrlValue}
          urlError={urlError} loadingUrl={loadingUrl}
          onAddUrl={addUrl}
          onPickFile={() => fileInputRef.current?.click()}
          onStartRecording={() => { onStartRecording(); setAddMode(null); }}
          fileError={fileError}
        />
      )}
    </div>
  );
}

function AddSheet(props: {
  mode: AddMode;
  onSelectMode: (m: AddMode) => void;
  onClose: () => void;
  pasteTitle: string; setPasteTitle: (s: string) => void;
  pasteText: string; setPasteText: (s: string) => void;
  onAddPaste: () => void;
  urlValue: string; setUrlValue: (s: string) => void;
  urlError: string | null; loadingUrl: boolean;
  onAddUrl: () => void;
  onPickFile: () => void;
  onStartRecording: () => void;
  fileError: string | null;
}) {
  const { mode } = props;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') props.onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props]);

  return (
    <div className="absolute inset-0 z-20 bg-black/20 flex items-end sm:items-center sm:justify-center" onClick={props.onClose}>
      <div
        className="w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[14px] font-bold text-slate-900 dark:text-slate-100">
            {mode === 'menu' ? '소스 추가' : mode === 'paste' ? '텍스트 붙여넣기' : 'URL · 유튜브'}
          </h4>
          <button onClick={props.onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {mode === 'menu' && (
          <div className="grid grid-cols-2 gap-2">
            <SheetOpt icon={<Upload className="h-4 w-4" />} label="파일" hint="TXT · MD · DOCX · XLSX" onClick={props.onPickFile} />
            <SheetOpt icon={<Link2 className="h-4 w-4" />} label="웹 링크" hint="기사 · 문서 URL" onClick={() => props.onSelectMode('url')} />
            <SheetOpt icon={<Youtube className="h-4 w-4" />} label="유튜브" hint="자막을 가져와요" onClick={() => props.onSelectMode('url')} />
            <SheetOpt icon={<Clipboard className="h-4 w-4" />} label="붙여넣기" hint="바로 텍스트 입력" onClick={() => props.onSelectMode('paste')} />
            <SheetOpt icon={<Mic className="h-4 w-4" />} label="강의 녹음" hint="마이크로 녹음·전사" onClick={props.onStartRecording} className="col-span-2" />
          </div>
        )}
        {props.fileError && <p className="mt-3 text-[11px] text-red-600">{props.fileError}</p>}

        {mode === 'paste' && (
          <div className="space-y-2">
            <input value={props.pasteTitle} onChange={(e) => props.setPasteTitle(e.target.value)} placeholder="제목 (선택)"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[13px] outline-none focus:border-indigo-400" />
            <textarea value={props.pasteText} onChange={(e) => props.setPasteText(e.target.value)} placeholder="여기에 텍스트를 붙여넣으세요"
              className="w-full h-32 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[13px] outline-none focus:border-indigo-400 resize-none" />
            <div className="flex gap-2 pt-1">
              <StudyBtn variant="outline" size="sm" onClick={() => props.onSelectMode('menu')} className="flex-1">← 뒤로</StudyBtn>
              <StudyBtn variant="primary" size="sm" onClick={props.onAddPaste} disabled={!props.pasteText.trim()} className="flex-1">추가</StudyBtn>
            </div>
          </div>
        )}
        {mode === 'url' && (
          <div className="space-y-2">
            <input value={props.urlValue} onChange={(e) => props.setUrlValue(e.target.value)} placeholder="https:// 또는 유튜브 URL"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[13px] outline-none focus:border-indigo-400" />
            {props.urlError && <p className="text-[11px] text-red-600">{props.urlError}</p>}
            <div className="flex gap-2 pt-1">
              <StudyBtn variant="outline" size="sm" onClick={() => props.onSelectMode('menu')} className="flex-1">← 뒤로</StudyBtn>
              <StudyBtn variant="primary" size="sm" onClick={props.onAddUrl} disabled={!props.urlValue.trim() || props.loadingUrl} className="flex-1">
                {props.loadingUrl ? '가져오는 중…' : '추가'}
              </StudyBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SheetOpt({
  icon, label, hint, onClick, className,
}: { icon: React.ReactNode; label: string; hint: string; onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn('flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-left hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors', className)}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-slate-900 dark:text-slate-100">{label}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{hint}</p>
      </div>
    </button>
  );
}
