/**
 * 녹음 상세 "창조물 생성" 패널.
 * 벤치마크: AudioPen(refine, 톤/길이), Voicenotes(템플릿 그리드·히스토리), Fathom(공유·슬랙), Granola(단일 플로우).
 *
 * 3단계 흐름: 템플릿 그리드 → 옵션(톤·길이) → 스트리밍 결과 + 편집 + Refine.
 * 생성 중에도 textarea에 실시간 토큰이 채워짐(SSE).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Loader2, Copy, Check, RefreshCw, Trash2, X, Sparkles, Share2, BookmarkPlus,
  MessageSquare, Send,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { ErrorState } from '@/components/shared/ErrorState';
import {
  ARTIFACT_KIND_ORDER,
  ARTIFACT_META,
  ARTIFACT_TONE_LABEL,
  ARTIFACT_LENGTH_LABEL,
  type ArtifactKind,
  type ArtifactTone,
  type ArtifactLength,
  type VoiceRecording,
  type VoiceArtifact,
} from '@/types/voiceAnalysis';
import { generateArtifact, refineArtifact } from '@/lib/voiceGenerate';
import { addArtifact, listArtifacts, removeArtifact, updateArtifact } from '@/lib/voiceArtifactsSession';

interface Props {
  open: boolean;
  recording: VoiceRecording | null;
  initialKind?: ArtifactKind;
  onOpenChange: (open: boolean) => void;
  /** 생성 결과를 어시스턴트 대화로 이어가기 */
  onContinueChat?: (title: string, content: string) => void;
  /** 생성 결과를 Study 노트로 저장 */
  onSaveAsStudyNote?: (title: string, content: string) => void;
}

type Phase = 'pick' | 'configure' | 'generating' | 'result';

export function GeneratorPanel({
  open, recording, initialKind, onOpenChange,
  onContinueChat, onSaveAsStudyNote,
}: Props) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [kind, setKind] = useState<ArtifactKind>(initialKind ?? 'blog');
  const [tone, setTone] = useState<ArtifactTone>('casual');
  const [length, setLength] = useState<ArtifactLength>('medium');
  const [content, setContent] = useState('');
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<VoiceArtifact[]>([]);
  const [refineInput, setRefineInput] = useState('');
  const [refining, setRefining] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open || !recording) return;
    setHistory(listArtifacts(recording.id));
    if (initialKind) {
      setKind(initialKind);
      setPhase('configure');
    } else {
      setPhase('pick');
    }
    setContent('');
    setActiveArtifactId(null);
    setError(null);
    setRefineInput('');
  }, [open, recording, initialKind]);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [open]);

  const persistActive = useCallback(
    (nextContent: string) => {
      if (!recording || !activeArtifactId) return;
      updateArtifact(recording.id, activeArtifactId, { content: nextContent });
      setHistory((prev) => prev.map((a) => (a.id === activeArtifactId ? { ...a, content: nextContent } : a)));
    },
    [recording, activeArtifactId],
  );

  const handleGenerate = useCallback(async () => {
    if (!recording) return;
    setError(null);
    setPhase('generating');
    setContent('');
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const finalContent = await generateArtifact({
        recording,
        kind,
        tone,
        length,
        signal: ctrl.signal,
        onDelta: (c) => setContent(c),
      });
      setContent(finalContent);
      // 완료된 결과를 session에 저장
      const saved = addArtifact(recording.id, { kind, tone, length, content: finalContent });
      setActiveArtifactId(saved.id);
      setHistory((prev) => [saved, ...prev]);
      setPhase('result');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(err as Error);
      setPhase('configure');
    }
  }, [recording, kind, tone, length]);

  const handleRefine = useCallback(async () => {
    if (!recording || !content || !refineInput.trim()) return;
    setError(null);
    setRefining(true);
    const previousContent = content;
    const instruction = refineInput.trim();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const finalContent = await refineArtifact({
        recording,
        kind,
        tone,
        length,
        previousContent,
        refineInstruction: instruction,
        signal: ctrl.signal,
        onDelta: (c) => setContent(c),
      });
      setContent(finalContent);
      // Refine은 새 버전으로 히스토리에 추가
      const saved = addArtifact(recording.id, { kind, tone, length, content: finalContent });
      setActiveArtifactId(saved.id);
      setHistory((prev) => [saved, ...prev]);
      setRefineInput('');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      // 수정 실패 시 이전 결과로 복구
      setContent(previousContent);
      setError(err as Error);
    } finally {
      setRefining(false);
    }
  }, [recording, content, refineInput, kind, tone, length]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      notify.copied();
      setTimeout(() => setCopied(false), 1500);
    } catch {
      notify.error('복사 실패');
    }
  }, [content]);

  const handleShare = useCallback(async () => {
    if (!content) return;
    const title = recording?.title ? `${recording.title} — ${ARTIFACT_META[kind].label}` : ARTIFACT_META[kind].label;
    // navigator.share 지원 시 네이티브 시트 (모바일 카카오/슬랙/iMessage 연결)
    const shareApi = (navigator as unknown as { share?: (data: ShareData) => Promise<void> }).share;
    if (shareApi) {
      try {
        await shareApi({ title, text: content });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        // 공유 실패 시 클립보드 폴백
      }
    }
    // 폴백: 클립보드 복사
    try {
      await navigator.clipboard.writeText(content);
      notify.success('공유 준비됨', { description: '클립보드에 복사했어요. 원하는 앱에 붙여넣기 하세요.' });
    } catch {
      notify.error('공유에 실패했어요');
    }
  }, [content, recording, kind]);

  const handleContinueChat = useCallback(() => {
    if (!content || !onContinueChat) return;
    const title = recording?.title ? `${recording.title} — ${ARTIFACT_META[kind].label}` : ARTIFACT_META[kind].label;
    onContinueChat(title, content);
    onOpenChange(false);
  }, [content, recording, kind, onContinueChat, onOpenChange]);

  const handleSaveAsStudyNote = useCallback(() => {
    if (!content || !onSaveAsStudyNote) return;
    const title = recording?.title ? `${recording.title} — ${ARTIFACT_META[kind].label}` : ARTIFACT_META[kind].label;
    onSaveAsStudyNote(title, content);
    notify.success('학습 노트에 저장됐어요');
  }, [content, recording, kind, onSaveAsStudyNote]);

  const handleContentChange = useCallback(
    (next: string) => {
      setContent(next);
      persistActive(next);
    },
    [persistActive],
  );

  const handleLoadHistory = useCallback((item: VoiceArtifact) => {
    setKind(item.kind);
    setTone(item.tone);
    setLength(item.length);
    setContent(item.content);
    setActiveArtifactId(item.id);
    setPhase('result');
  }, []);

  const handleRemoveHistory = useCallback(
    (itemId: string) => {
      if (!recording) return;
      removeArtifact(recording.id, itemId);
      setHistory((prev) => prev.filter((a) => a.id !== itemId));
      if (activeArtifactId === itemId) setActiveArtifactId(null);
    },
    [recording, activeArtifactId],
  );

  if (!recording) return null;
  const meta = ARTIFACT_META[kind];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        <SheetHeader className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 space-y-1">
          <SheetTitle className="flex items-center gap-2 text-[15px]">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            녹음으로 만들기
          </SheetTitle>
          <SheetDescription className="text-[12px]">
            전사·요약·챕터를 바탕으로 다양한 형태의 글을 만들어요.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* 템플릿 그리드 */}
          {phase === 'pick' && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                {ARTIFACT_KIND_ORDER.map((k) => {
                  const m = ARTIFACT_META[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => { setKind(k); setPhase('configure'); }}
                      className="group flex flex-col items-start gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-left transition-all hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm"
                    >
                      <span className="text-2xl" aria-hidden="true">{m.icon}</span>
                      <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{m.label}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{m.description}</span>
                    </button>
                  );
                })}
              </div>

              {history.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">최근 생성</p>
                  <ul className="space-y-1.5">
                    {history.slice(0, 6).map((h) => {
                      const hm = ARTIFACT_META[h.kind];
                      return (
                        <li key={h.id}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleLoadHistory(h)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleLoadHistory(h);
                              }
                            }}
                            className="w-full flex items-start gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                          >
                            <span className="text-base shrink-0" aria-hidden="true">{hm.icon}</span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-[12px] font-medium text-slate-800 dark:text-slate-200">{hm.label}</span>
                              <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">{h.content.slice(0, 60)}</span>
                            </span>
                            <button
                              type="button"
                              aria-label="삭제"
                              onClick={(e) => { e.stopPropagation(); handleRemoveHistory(h.id); }}
                              className="shrink-0 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 옵션 (톤 · 길이) */}
          {phase === 'configure' && (
            <div className="p-5 space-y-5">
              <div className="flex items-start gap-3">
                <span className="text-3xl" aria-hidden="true">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-bold text-slate-900 dark:text-slate-100">{meta.label}</h3>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">{meta.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPhase('pick')}
                  className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  다른 템플릿
                </button>
              </div>

              <div className="space-y-3">
                <OptionChips
                  label="톤"
                  options={['formal', 'casual', 'expert'] as const}
                  value={tone}
                  onChange={setTone}
                  getLabel={(v) => ARTIFACT_TONE_LABEL[v]}
                />
                <OptionChips
                  label="길이"
                  options={['short', 'medium', 'long'] as const}
                  value={length}
                  onChange={setLength}
                  getLabel={(v) => ARTIFACT_LENGTH_LABEL[v]}
                />
              </div>

              {error && (
                <ErrorState
                  error={error}
                  onPrimary={handleGenerate}
                  primaryLabel="다시 시도"
                  compact
                  className="py-4"
                />
              )}

              <button
                type="button"
                onClick={handleGenerate}
                className="w-full h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                {meta.label} 만들기
              </button>
            </div>
          )}

          {/* 생성 중 — 스트리밍 토큰이 실시간으로 채워짐 */}
          {phase === 'generating' && (
            <div className="flex flex-col h-full">
              <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                    {meta.label} 작성 중…
                  </p>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                    {ARTIFACT_TONE_LABEL[tone]} · {ARTIFACT_LENGTH_LABEL[length]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { abortRef.current?.abort(); setPhase('configure'); }}
                  className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 underline underline-offset-2"
                >
                  취소
                </button>
              </div>
              <div
                className="flex-1 min-h-[320px] w-full px-5 py-4 text-[13px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap"
                aria-live="polite"
              >
                {content}
                <span className="inline-block w-[2px] h-[14px] bg-indigo-500 align-middle ml-0.5 animate-pulse" aria-hidden="true" />
              </div>
            </div>
          )}

          {/* 결과 — 편집 가능 + Refine */}
          {phase === 'result' && (
            <div className="flex flex-col h-full">
              <div className="px-5 pt-4 pb-2 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xl" aria-hidden="true">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{meta.label}</p>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                    {ARTIFACT_TONE_LABEL[tone]} · {ARTIFACT_LENGTH_LABEL[length]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPhase('configure')}
                  className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-1"
                  disabled={refining}
                >
                  <RefreshCw className="h-3 w-3" /> 다시 생성
                </button>
              </div>
              <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                className="flex-1 min-h-[280px] w-full px-5 py-4 bg-white dark:bg-slate-950 text-[13px] leading-relaxed text-slate-800 dark:text-slate-200 outline-none resize-none font-[450]"
                spellCheck={false}
                readOnly={refining}
              />

              {/* Refine 입력칸 — AudioPen "Continue" 패턴 */}
              <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2.5 bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={refineInput}
                    onChange={(e) => setRefineInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && refineInput.trim() && !refining) {
                        e.preventDefault();
                        void handleRefine();
                      }
                    }}
                    placeholder="예: 더 짧게 · 격식 있게 · 결정사항만 남겨"
                    className="flex-1 h-8 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[12.5px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-indigo-400"
                    disabled={refining}
                    aria-label="수정 지시"
                  />
                  <button
                    type="button"
                    onClick={handleRefine}
                    disabled={!refineInput.trim() || refining}
                    className="h-8 px-3 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors"
                    aria-label="수정 요청 보내기"
                  >
                    {refining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    수정
                  </button>
                </div>
                {error && !refining && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 mt-1.5">{error.message}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 푸터 액션 */}
        {phase === 'result' && (
          <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900">
            <button
              type="button"
              onClick={handleCopy}
              className="h-9 px-3.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[12px] font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? '복사됨' : '복사'}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
              공유
            </button>
            {onSaveAsStudyNote && (
              <button
                type="button"
                onClick={handleSaveAsStudyNote}
                className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                학습 노트
              </button>
            )}
            {onContinueChat && (
              <button
                type="button"
                onClick={handleContinueChat}
                className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                대화로 이어가기
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center transition-colors"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ── 옵션 칩 ── */
interface OptionChipsProps<T extends string> {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  getLabel: (v: T) => string;
}

function OptionChips<T extends string>({ label, options, value, onChange, getLabel }: OptionChipsProps<T>) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{label}</p>
      <div className="flex gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={cn(
              'h-8 px-3 rounded-full text-[12px] font-medium transition-colors',
              value === o
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
            )}
          >
            {getLabel(o)}
          </button>
        ))}
      </div>
    </div>
  );
}
