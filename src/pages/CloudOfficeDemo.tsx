import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlignLeft, ArrowLeft, Bold, ChevronDown, Download, FileStack, Highlighter,
  Image, Italic, Link as LinkIcon, List, Loader2, Menu, MessageSquare, Printer,
  Redo2, Save, Search, Settings, Share2, Star, Underline, Undo2, Upload,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  fileTypeFromNameOrUrl,
  normalizeOnlyOfficeServerUrl,
  onlyOfficeApiScriptUrl,
  onlyOfficeDocumentKey,
  onlyOfficeDocumentType,
  type OnlyOfficeLaunchConfig,
} from '@/lib/onlyoffice';

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (placeholderId: string, config: Record<string, unknown>) => {
        destroyEditor?: () => void;
      };
    };
  }
}

const SUPPORTED_EXTENSIONS = '.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.pdf';
const SERVER_URL_STORAGE_KEY = 'personai.onlyoffice.documentServerUrl';
const CALLBACK_URL_STORAGE_KEY = 'personai.onlyoffice.callbackUrl';

function envValue(name: string): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return env[name] ?? '';
}

function defaultCallbackUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/api/onlyoffice/callback`;
}

export default function CloudOfficeDemo() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<{ destroyEditor?: () => void } | null>(null);
  const [documentServerUrl, setDocumentServerUrl] = useState(() => {
    if (typeof window === 'undefined') return envValue('VITE_ONLYOFFICE_DOCUMENT_SERVER_URL');
    return window.localStorage.getItem(SERVER_URL_STORAGE_KEY)
      ?? envValue('VITE_ONLYOFFICE_DOCUMENT_SERVER_URL');
  });
  const [callbackUrl, setCallbackUrl] = useState(() => {
    if (typeof window === 'undefined') return envValue('VITE_ONLYOFFICE_CALLBACK_URL');
    return window.localStorage.getItem(CALLBACK_URL_STORAGE_KEY)
      ?? envValue('VITE_ONLYOFFICE_CALLBACK_URL')
      ?? defaultCallbackUrl();
  });
  const [documentUrl, setDocumentUrl] = useState('');
  const [title, setTitle] = useState('제목 없는 문서');
  const [fileType, setFileType] = useState('docx');
  const [lang, setLang] = useState('ko');
  const [setupOpen, setSetupOpen] = useState(false);
  const [launchConfig, setLaunchConfig] = useState<OnlyOfficeLaunchConfig | null>(null);
  const [editorStatus, setEditorStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [selectedFileName, setSelectedFileName] = useState('');

  const hasServer = !!documentServerUrl.trim();
  const canLaunch = hasServer && documentUrl.trim() && callbackUrl.trim() && title.trim() && fileType.trim();
  const documentKind = useMemo(() => onlyOfficeDocumentType(fileType), [fileType]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SERVER_URL_STORAGE_KEY, documentServerUrl);
      window.localStorage.setItem(CALLBACK_URL_STORAGE_KEY, callbackUrl);
    } catch {
      // best-effort
    }
  }, [documentServerUrl, callbackUrl]);

  useEffect(() => {
    if (!launchConfig) return;

    let cancelled = false;
    const placeholderId = 'onlyoffice-editor-host';

    const mountEditor = async () => {
      setEditorStatus('loading');
      try {
        await ensureOnlyOfficeApi(launchConfig.documentServerUrl);
        if (cancelled) return;
        editorRef.current?.destroyEditor?.();

        const config = {
          type: 'desktop',
          width: '100%',
          height: '100%',
          documentType: onlyOfficeDocumentType(launchConfig.fileType),
          document: {
            title: launchConfig.title,
            url: launchConfig.documentUrl,
            fileType: launchConfig.fileType,
            key: onlyOfficeDocumentKey(`${launchConfig.documentUrl}:${launchConfig.title}`),
            permissions: {
              edit: launchConfig.mode === 'edit',
              download: true,
              print: true,
              review: true,
            },
          },
          editorConfig: {
            mode: launchConfig.mode,
            lang: launchConfig.lang,
            callbackUrl: launchConfig.callbackUrl,
            user: {
              id: 'personai-office',
              name: 'PersonAI',
            },
            customization: {
              autosave: true,
              forcesave: true,
              compactHeader: false,
              compactToolbar: false,
            },
          },
          events: {
            onAppReady: () => setEditorStatus('ready'),
            onError: () => setEditorStatus('error'),
          },
        };

        editorRef.current = new window.DocsAPI!.DocEditor(placeholderId, config);
      } catch (error) {
        if (cancelled) return;
        setEditorStatus('error');
        toast({
          title: '오피스 편집기를 열지 못했어요',
          description: error instanceof Error ? error.message : String(error),
        });
      }
    };

    void mountEditor();

    return () => {
      cancelled = true;
      editorRef.current?.destroyEditor?.();
      editorRef.current = null;
    };
  }, [launchConfig]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFilePicked = useCallback((file: File | undefined) => {
    if (!file) return;
    const inferred = fileTypeFromNameOrUrl(file.name) || 'docx';
    setSelectedFileName(file.name);
    setTitle(file.name.replace(/\.[^.]+$/, '') || file.name);
    setFileType(inferred);

    toast({
      title: '파일을 선택했어요',
      description: hasServer
        ? '이제 이 파일을 서버가 접근 가능한 URL로 올리는 연결 단계가 필요합니다.'
        : 'ONLYOFFICE 서버 연결이 필요해서 설정 창을 열었어요.',
    });
    setSetupOpen(true);
  }, [hasServer]);

  const handleDocumentUrlChange = useCallback((value: string) => {
    setDocumentUrl(value);
    const inferred = fileTypeFromNameOrUrl(value);
    if (!inferred) return;
    setFileType(inferred);
    const clean = value.split('?')[0]?.split('#')[0] ?? value;
    const name = decodeURIComponent(clean.slice(clean.lastIndexOf('/') + 1));
    if (name) setTitle(name.replace(/\.[^.]+$/, '') || name);
  }, []);

  const handleOpenEditor = useCallback(() => {
    if (!canLaunch) {
      setSetupOpen(true);
      toast({
        title: '오피스 서버 연결이 더 필요해요',
        description: '실제 ONLYOFFICE 편집은 Document Server와 파일 URL이 있어야 열립니다.',
      });
      return;
    }
    setSetupOpen(false);
    setLaunchConfig({
      documentServerUrl: normalizeOnlyOfficeServerUrl(documentServerUrl),
      documentUrl: documentUrl.trim(),
      callbackUrl: callbackUrl.trim(),
      title: title.trim(),
      fileType: fileType.trim().toLowerCase(),
      mode: 'edit',
      lang,
    });
  }, [callbackUrl, canLaunch, documentServerUrl, documentUrl, fileType, lang, title]);

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafd] text-slate-900 flex flex-col">
      <header className="h-[72px] bg-white border-b border-slate-200 px-5 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/cloud')}
            className="h-9 w-9 rounded-full hover:bg-slate-100 flex items-center justify-center"
            aria-label="클라우드로 돌아가기"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <FileStack className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-7 min-w-[180px] max-w-[360px] bg-transparent px-1 text-lg outline-none rounded hover:ring-1 hover:ring-slate-300 focus:ring-1 focus:ring-blue-400"
                aria-label="문서 제목"
              />
              <Star className="w-4 h-4 text-slate-400" />
              <span className="hidden md:inline-flex items-center gap-1 text-xs text-slate-500">
                <Save className="w-3.5 h-3.5" /> {launchConfig ? 'ONLYOFFICE 연결됨' : '초안'}
              </span>
            </div>
            <nav className="hidden sm:flex items-center gap-4 text-sm text-slate-700">
              <button type="button" onClick={handleImportClick} className="hover:text-blue-600">파일</button>
              <button type="button" className="hover:text-blue-600">수정</button>
              <button type="button" className="hover:text-blue-600">보기</button>
              <button type="button" className="hover:text-blue-600">삽입</button>
              <button type="button" className="hover:text-blue-600">서식</button>
              <button type="button" className="hover:text-blue-600">도구</button>
              <button type="button" className="hover:text-blue-600">도움말</button>
            </nav>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="h-10 w-10 rounded-full hover:bg-slate-100 flex items-center justify-center" aria-label="댓글">
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setSetupOpen(true)}
            className="h-10 w-10 rounded-full hover:bg-slate-100 flex items-center justify-center"
            aria-label="오피스 설정"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="h-10 rounded-full bg-sky-100 text-sky-900 px-4 text-sm font-semibold flex items-center gap-2 hover:bg-sky-200"
          >
            <Share2 className="w-4 h-4" /> 공유
          </button>
        </div>
      </header>

      <div className="h-14 bg-white border-b border-slate-200 px-5 flex items-center gap-1 overflow-x-auto">
        <ToolButton icon={<Search />} label="검색" />
        <ToolButton icon={<Undo2 />} label="실행 취소" />
        <ToolButton icon={<Redo2 />} label="다시 실행" />
        <ToolButton icon={<Printer />} label="인쇄" />
        <ToolButton icon={<Upload />} label="가져오기" onClick={handleImportClick} />
        <Separator />
        <ToolbarSelect label="100%" />
        <ToolbarSelect label={documentKind === 'cell' ? '스프레드시트' : documentKind === 'slide' ? '프레젠테이션' : '일반 텍스트'} wide />
        <ToolbarSelect label="Arial" />
        <ToolbarSelect label="11" />
        <Separator />
        <ToolButton icon={<Bold />} label="굵게" />
        <ToolButton icon={<Italic />} label="기울임" />
        <ToolButton icon={<Underline />} label="밑줄" />
        <ToolButton icon={<Highlighter />} label="강조" />
        <ToolButton icon={<LinkIcon />} label="링크" />
        <ToolButton icon={<Image />} label="이미지" />
        <Separator />
        <ToolButton icon={<AlignLeft />} label="정렬" />
        <ToolButton icon={<List />} label="목록" />
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleOpenEditor}
          className="h-9 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {launchConfig ? '다시 열기' : 'ONLYOFFICE로 열기'}
        </button>
      </div>

      <main className="flex-1 min-h-0 relative bg-[#edf2f8]">
        <input
          ref={fileInputRef}
          type="file"
          accept={SUPPORTED_EXTENSIONS}
          className="sr-only"
          onChange={(event) => handleFilePicked(event.target.files?.[0])}
        />
        {launchConfig ? (
          <>
            {editorStatus === 'loading' && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            )}
            <div id="onlyoffice-editor-host" className="absolute inset-0 bg-white" />
          </>
        ) : (
          <div className="h-full overflow-auto">
            <div className="min-h-full flex justify-center px-8 py-8">
              <article className="relative w-[816px] min-h-[1056px] bg-white shadow-sm border border-slate-200">
                <div className="absolute left-0 top-0 h-full w-9 border-r border-slate-100 bg-slate-50 text-[10px] text-slate-400 flex flex-col items-center pt-4 gap-8">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <span key={index}>{index + 1}</span>
                  ))}
                </div>
                <div className="h-8 border-b border-slate-100 ml-9 flex items-end px-6 text-[10px] text-slate-400">
                  <div className="h-px w-full bg-slate-200 mb-2" />
                </div>
                <div className="px-28 py-24 text-slate-900">
                  {selectedFileName ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                      <p className="text-sm font-semibold text-blue-900">{selectedFileName}</p>
                      <p className="mt-2 text-sm text-blue-800">
                        파일을 선택했습니다. 실제 원본 편집으로 열려면 ONLYOFFICE 서버가 접근할 수 있는 파일 URL 연결이 필요합니다.
                      </p>
                      <button
                        type="button"
                        onClick={() => setSetupOpen(true)}
                        className="mt-4 h-9 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white"
                      >
                        연결 설정
                      </button>
                    </div>
                  ) : (
                    <div className="min-h-[760px]">
                      <div className="h-6 w-px bg-slate-900 animate-pulse" />
                    </div>
                  )}
                </div>
              </article>
            </div>
          </div>
        )}
      </main>

      {setupOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/35 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">ONLYOFFICE 연결</h2>
                <p className="text-xs text-slate-500">나중에는 이 설정 없이 파일 카드에서 바로 열리게 만들 수 있습니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setSetupOpen(false)}
                className="h-9 w-9 rounded-full hover:bg-slate-100"
                aria-label="닫기"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-4">
              <LabeledInput
                label="Document Server URL"
                value={documentServerUrl}
                onChange={setDocumentServerUrl}
                placeholder="https://office.example.com"
              />
              <LabeledInput
                label="파일 URL"
                value={documentUrl}
                onChange={handleDocumentUrlChange}
                placeholder="https://example.com/sample.docx"
              />
              <LabeledInput
                label="저장 콜백 URL"
                value={callbackUrl}
                onChange={setCallbackUrl}
                placeholder="https://example.com/api/onlyoffice/callback"
              />
              <div className="grid grid-cols-2 gap-3">
                <LabeledInput label="확장자" value={fileType} onChange={setFileType} placeholder="docx" />
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">언어</span>
                  <select
                    value={lang}
                    onChange={(event) => setLang(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400"
                  >
                    <option value="ko">한국어</option>
                    <option value="en">English</option>
                    <option value="ja">日本語</option>
                    <option value="zh">中文</option>
                  </select>
                </label>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                현재 브라우저에서 고른 로컬 파일은 ONLYOFFICE 서버가 직접 읽을 수 없습니다. 다음 단계에서 업로드 파일을 서버 URL로 제공하는 API를 붙이면 이 모달 없이 바로 열 수 있습니다.
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSetupOpen(false)}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={handleOpenEditor}
                className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
              >
                편집기로 열기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 w-9 shrink-0 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-700"
      title={label}
      aria-label={label}
    >
      <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
    </button>
  );
}

function ToolbarSelect({ label, wide = false }: { label: string; wide?: boolean }) {
  return (
    <button
      type="button"
      className={`${wide ? 'min-w-[138px]' : 'min-w-[72px]'} h-9 shrink-0 rounded-lg px-3 text-sm hover:bg-slate-100 flex items-center justify-between gap-2`}
    >
      <span className="truncate">{label}</span>
      <ChevronDown className="w-3.5 h-3.5" />
    </button>
  );
}

function Separator() {
  return <div className="mx-1 h-6 w-px shrink-0 bg-slate-200" />;
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400"
      />
    </label>
  );
}

async function ensureOnlyOfficeApi(documentServerUrl: string): Promise<void> {
  if (window.DocsAPI?.DocEditor) return;

  const scriptUrl = onlyOfficeApiScriptUrl(documentServerUrl);
  const existing = document.querySelector<HTMLScriptElement>(`script[data-onlyoffice-api="${scriptUrl}"]`);
  if (existing) {
    await waitForOnlyOfficeApi();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.dataset.onlyofficeApi = scriptUrl;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('ONLYOFFICE api.js를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });

  await waitForOnlyOfficeApi();
}

async function waitForOnlyOfficeApi(): Promise<void> {
  for (let i = 0; i < 40; i += 1) {
    if (window.DocsAPI?.DocEditor) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('ONLYOFFICE DocsAPI가 초기화되지 않았습니다.');
}
