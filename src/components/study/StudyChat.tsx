import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Send, Settings2, MoreHorizontal, X, Check, BookOpenCheck, Highlighter, ListChecks, Loader2, Copy, Trash2, FileUp, UserRound, MessageSquarePlus } from 'lucide-react';
import type { StudyNotebook, StudyChatTurn, StudySource, HighlightColor, Highlight } from '@/types/study';
import { newId, HIGHLIGHT_META } from '@/types/study';
import { CitedMarkdown, type CitationSource } from './CitationPopover';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { copyText } from '@/lib/clipboard';
import { confirmDialog } from '@/lib/confirmDialog';
import { textInputDialog } from '@/lib/textInputDialog';
import { getStudySourceReadiness, getUsableStudySources } from '@/lib/studySourceReadiness';
import { formatStudyCharCount } from '@/lib/studyFormat';

interface Props {
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  onPromoteToFlashcard: (front: string, back: string) => void;
  onStartRecording?: () => void;
  chatDraft?: string;
  onChatDraftChange?: (value: string) => void;
}

const FALLBACK_SUGGESTED_SEEDS = [
  '시험 전 5분 요약으로 정리해줘',
  '헷갈릴 만한 함정 문제 3개 내줘',
  '꼭 외울 문장과 이유를 뽑아줘',
  '이 자료에서 자주 나올 질문을 예상해줘',
];

export function StudyChat({
  notebook,
  onChange,
  onPromoteToFlashcard,
  onStartRecording: _onStartRecording,
  chatDraft,
  onChatDraftChange,
}: Props) {
  const [input, setInput] = useState(chatDraft ?? '');
  const [streaming, setStreaming] = useState(false);
  const [showModePopover, setShowModePopover] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [draftSourceNote, setDraftSourceNote] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const resizeInput = useCallback(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const nextHeight = Math.min(160, Math.max(40, ta.scrollHeight));
    ta.style.height = `${nextHeight}px`;
    ta.style.overflowY = ta.scrollHeight > 160 ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    setInput(chatDraft ?? '');
  }, [chatDraft, notebook.id]);

  const updateInput = useCallback((next: string | ((prev: string) => string)) => {
    setInput((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      onChatDraftChange?.(value);
      return value;
    });
  }, [onChatDraftChange]);

  const focusInput = (delay = 0) => {
    window.setTimeout(() => {
      const ta = inputRef.current;
      if (!ta || !isVisibleElement(ta)) return;
      resizeInput();
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }, delay);
  };

  useEffect(() => {
    resizeInput();
  }, [input, resizeInput]);

  // 원본 뷰어에서 "이 부분 질문" 으로 전달된 텍스트를 입력창에 삽입
  useEffect(() => {
    const handler = (e: Event) => {
      if (!rootRef.current || !isVisibleElement(rootRef.current)) return;
      const ev = e as CustomEvent<{ text?: string; prompt?: string }>;
      const prompt = ev.detail?.prompt?.trim();
      if (prompt) {
        updateInput((prev) => prev ? `${prev}\n${prompt}` : prompt);
        setDraftSourceNote('원본에서 가져온 질문');
        focusInput(0);
        focusInput(80);
        return;
      }
      const t = ev.detail?.text?.trim();
      if (!t) return;
      updateInput((prev) => {
        const quote = `> ${t}\n\n`;
        return prev ? `${prev}\n${quote}` : quote;
      });
      setDraftSourceNote('선택 문장 질문');
      // 입력창 포커스
      focusInput(0);
      focusInput(80);
    };
    window.addEventListener('study:askSelection', handler);
    return () => window.removeEventListener('study:askSelection', handler);
  }, [updateInput]);

  useEffect(() => {
    const handler = () => {
      if (!rootRef.current || !isVisibleElement(rootRef.current)) return;
      focusInput(0);
      focusInput(80);
    };
    window.addEventListener('study:focusChatInput', handler);
    return () => window.removeEventListener('study:focusChatInput', handler);
  }, []);

  useEffect(() => {
    if (!input.trim()) setDraftSourceNote(null);
  }, [input]);

  const readiness = useMemo(
    () => getStudySourceReadiness(notebook.sources),
    [notebook.sources],
  );
  const enabledSources = useMemo(
    () => getUsableStudySources(notebook.sources),
    [notebook.sources],
  );
  const totalSourceChars = useMemo(
    () => enabledSources.reduce((sum, source) => sum + source.content.length, 0),
    [enabledSources],
  );
  const modeLabel = notebook.chatMode === 'socratic' ? '학습 가이드' : notebook.chatMode === 'custom' ? '맞춤' : '기본';
  const lengthLabel = notebook.chatResponseLength === 'long' ? '길게' : notebook.chatResponseLength === 'short' ? '짧게' : '기본 길이';
  const suggestedSeeds = useMemo(
    () => buildSuggestedSeeds(enabledSources, notebook.title),
    [enabledSources, notebook.title],
  );
  const sourceScopeLabel = getChatSourceScopeLabel(readiness, enabledSources, totalSourceChars);
  const canChat = enabledSources.length > 0;
  const showQuickFollowUps = canChat && notebook.chat.length > 0 && input.trim().length === 0 && !streaming;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [notebook.chat.length, notebook.chat.at(-1)?.content, streaming]);

  useEffect(() => {
    if (!showChatMenu) return;
    const onClick = (e: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) setShowChatMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowChatMenu(false);
    };
    setTimeout(() => window.addEventListener('click', onClick), 0);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [showChatMenu]);

  const stopStreaming = () => {
    abortRef.current?.abort();
  };

  const buildTranscript = () => {
    const sourceLine = enabledSources.length > 0
      ? `참고 원본: ${enabledSources.map((source, index) => `S${index + 1} ${source.title}`).join(', ')}`
      : '참고 원본: 없음';
    const lines = [`# ${notebook.title} 대화`, sourceLine, ''];
    for (const turn of notebook.chat) {
      const name = turn.role === 'user' ? '나' : 'AI 스터디룸';
      lines.push(`## ${name}`, turn.content || '(빈 응답)', '');
      if (turn.role !== 'user' && turn.citationSources?.length) {
        lines.push(`답변 당시 원본: ${turn.citationSources.map((source, index) => `S${index + 1} ${source.title}`).join(', ')}`, '');
      }
    }
    return lines.join('\n').trim();
  };

  const copyTranscript = async () => {
    if (notebook.chat.length === 0) {
      toast({ title: '복사할 대화가 없어요', description: '먼저 자료에 대해 질문해보세요.' });
      return;
    }
    const ok = await copyText(buildTranscript());
    toast({ title: ok ? '대화를 복사했어요' : '복사하지 못했어요' });
    setShowChatMenu(false);
  };

  const clearChat = async () => {
    if (notebook.chat.length === 0) return;
    const ok = await confirmDialog({
      title: '대화를 비울까요?',
      description: '원본 자료, 노트, 퀴즈, 하이라이트는 그대로 두고 대화 기록만 삭제합니다.',
      confirmLabel: '비우기',
      tone: 'danger',
    });
    if (!ok) return;
    stopStreaming();
    onChange({ ...notebook, chat: [] });
    setShowChatMenu(false);
  };

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || streaming) return;
    if (enabledSources.length === 0) {
      toast({ title: '원본 자료가 필요해요', description: '자료를 하나 이상 활성화해주세요.' });
      return;
    }

    const citationSources = enabledSources.map((source) => ({
      id: source.id,
      title: source.title,
      kind: source.kind,
      contentPreview: source.content.slice(0, 600),
    }));
    const userTurn: StudyChatTurn = { id: newId('t'), role: 'user', content: q, createdAt: Date.now() };
    const placeholderId = newId('t');
    const nextNb = {
      ...notebook,
      chat: [
        ...notebook.chat,
        userTurn,
        { id: placeholderId, role: 'assistant' as const, content: '', createdAt: Date.now(), citationSources },
      ],
    };
    onChange(nextNb);
    updateInput('');
    setDraftSourceNote(null);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    let accumulated = '';

    try {
      const sourceBlock = enabledSources.map((s, i) => `[S${i + 1}] ${s.title}\n${s.content.slice(0, 10000)}`).join('\n\n---\n\n');
      const modeInstr =
        notebook.chatMode === 'socratic'
          ? `중요: 답을 바로 주지 마세요. 1) 학생이 이미 아는 것을 묻기 → 2) 힌트 한 개 → 3) "어떻게 생각해?" → 4) 막히면 간결히 해설.
한국어로, 부드럽게.`
          : notebook.chatMode === 'custom' && notebook.chatCustomInstruction?.trim()
          ? `사용자 지시문: ${notebook.chatCustomInstruction.trim()}\n한국어로, 원본 자료 근거로.`
          : `당신은 AI 스터디룸 튜터입니다. 아래 원본 자료만 근거로 정확히 답합니다.
- 원본 밖 사실 추측 금지. 인용은 [S1], [S2] 형태.
- 간결하고 구조화된 한국어.`;
      const lenInstr =
        notebook.chatResponseLength === 'long' ? '\n답은 충분히 풀어서 길게 작성.'
        : notebook.chatResponseLength === 'short' ? '\n답은 3~4문장 이내로 짧게.'
        : '';
      const systemPrompt = `${modeInstr}${lenInstr}\n\n=== 원본 자료 ===\n${sourceBlock}\n=== /원본 자료 ===`;
      const maxTokens = notebook.chatResponseLength === 'short' ? 600
        : notebook.chatResponseLength === 'long' ? 3000
        : 1800;
      const history = notebook.chat.slice(-6).filter((t) => t.role === 'user' || t.role === 'assistant').map((t) => ({
        name: t.role === 'user' ? '학생' : '튜터',
        content: t.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, question: q, previousResponses: history, searchPolicy: 'never', preSearchContext: null, maxTokens, temperature: 0.55 }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => '');
        onChange({ ...nextNb, chat: nextNb.chat.map((t) => t.id === placeholderId ? { ...t, content: `응답 실패: ${txt || '다시 시도해주세요.'}` } : t) });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', currentNb = nextNb;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed?.choices?.[0]?.delta?.content;
            if (typeof delta === 'string') {
              accumulated += delta;
              currentNb = { ...currentNb, chat: currentNb.chat.map((t) => t.id === placeholderId ? { ...t, content: accumulated } : t) };
              onChange(currentNb);
            }
          } catch { /* noop */ }
        }
      }
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === 'AbortError';
      if (aborted) {
        if (!accumulated) {
          onChange({
            ...nextNb,
            chat: nextNb.chat.map((t) => t.id === placeholderId ? { ...t, content: '중단했어요. 다시 질문하면 이어서 답할 수 있어요.' } : t),
          });
        }
      } else {
        console.error('[study-chat]', e);
      }
    }
    finally {
      if (abortRef.current === controller) abortRef.current = null;
      setStreaming(false);
    }
  };

  return (
    <div ref={rootRef} className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-white dark:bg-slate-900">
      <div className="flex min-w-0 items-center justify-between gap-2 border-b border-slate-200 px-4 py-1.5 dark:border-slate-800 sm:px-5">
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 shrink-0">대화</h3>
          <p className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate">
            {sourceScopeLabel}
          </p>
          {streaming && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              생성 중
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setShowModePopover(!showModePopover)}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 sm:h-7 sm:w-7 sm:rounded-md"
            aria-label="모드 설정"
            title="모드 설정"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <div className="relative" ref={chatMenuRef}>
            <button
              onClick={() => setShowChatMenu(!showChatMenu)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 sm:h-7 sm:w-7 sm:rounded-md"
              aria-label="대화 메뉴"
              title="대화 메뉴"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showChatMenu && (
              <div className="absolute right-0 top-full z-40 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900" role="menu">
                <button
                  onClick={() => void copyTranscript()}
                  disabled={notebook.chat.length === 0}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 dark:text-slate-200 dark:hover:bg-slate-800"
                  role="menuitem"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  대화 복사
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button
                  onClick={() => void clearChat()}
                  disabled={notebook.chat.length === 0}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-red-950/30"
                  role="menuitem"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  대화 비우기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModePopover && (
        <ChatSettingsModal
          notebook={notebook}
          onSave={(patch) => { onChange({ ...notebook, ...patch }); setShowModePopover(false); }}
          onClose={() => setShowModePopover(false)}
        />
      )}

      {enabledSources.length > 0 && (
        <div className="min-w-0 overflow-hidden border-b border-slate-100 bg-slate-50/70 px-4 py-2 dark:border-slate-800 dark:bg-slate-950/25">
          <div className="study-scroll-row flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <span className="shrink-0 text-[10.5px] font-semibold text-slate-400">답변 기준</span>
            {enabledSources.slice(0, 4).map((source, index) => (
              <span
                key={source.id}
                className="inline-flex h-6 max-w-[180px] shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 text-[10.5px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                title={source.title}
              >
                <span className="font-mono text-[9px] text-indigo-500">S{index + 1}</span>
                <span className="truncate">{source.title}</span>
              </span>
            ))}
            {enabledSources.length > 4 && (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10.5px] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                +{enabledSources.length - 4}
              </span>
            )}
            <span className="ml-auto shrink-0 rounded-full bg-white px-2 py-1 text-[10.5px] text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800">
              {modeLabel} · {lengthLabel}
            </span>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="min-w-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-5">
        {notebook.chat.length === 0 ? (
          <ChatEmptyState
            enabledSources={enabledSources}
            readiness={readiness}
            suggestedSeeds={suggestedSeeds}
            onSend={(seed) => void send(seed)}
            onOpenSources={() => window.dispatchEvent(new CustomEvent('study:openSourceAdd'))}
          />
        ) : (
          notebook.chat.map((t) => (
            <ChatBubble key={t.id} turn={t} sources={enabledSources} mode={notebook.chatMode}
              onPromote={onPromoteToFlashcard}
              onFollowUp={(prompt) => void send(prompt)}
              onHighlight={(color) => handleHighlight(notebook, onChange, onPromoteToFlashcard, t, color)}
            />
          ))
        )}
      </div>

      {enabledSources.length > 0 && (
      <div className="min-w-0 px-4 py-3">
        {showQuickFollowUps && (
          <div className="study-scroll-row mb-2 flex min-w-0 items-center gap-1.5 overflow-x-auto pb-0.5">
            {[
              ['핵심만 다시', '지금까지 대화에서 가장 중요한 핵심만 5줄로 다시 정리해줘.'],
              ['퀴즈로 확인', '지금까지 내용으로 내가 이해했는지 확인할 수 있는 퀴즈 3개를 내줘. 정답과 짧은 해설도 붙여줘.'],
              ['헷갈린 부분 찾기', '이 자료에서 학생들이 가장 헷갈릴 만한 부분과 구분법을 알려줘.'],
            ].map(([label, prompt]) => (
              <button
                key={label}
                type="button"
                onClick={() => void send(prompt)}
                className="inline-flex h-8 shrink-0 items-center rounded-full border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/35"
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {draftSourceNote && input.trim().length > 0 && (
          <div className="mb-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10.5px] font-semibold text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/35 dark:text-indigo-200 dark:ring-indigo-900/50">
            <BookOpenCheck className="h-3 w-3 shrink-0" />
            <span className="truncate">{draftSourceNote}</span>
          </div>
        )}
        {input.trim().length > 0 && (
          <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
            <div className="inline-flex min-w-0 items-center gap-1.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
              <Check className="h-3 w-3 text-emerald-500" />
              <span className="truncate">초안 저장됨</span>
            </div>
            <button
              type="button"
              onClick={() => {
                updateInput('');
                focusInput(0);
              }}
              className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[10.5px] font-semibold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-3 w-3" />
              지우기
            </button>
          </div>
        )}
        <div className={cn(
          'flex min-w-0 items-end gap-2 rounded-2xl border bg-white px-3 py-2 transition-colors dark:bg-slate-900',
          enabledSources.length === 0
            ? 'border-slate-200 dark:border-slate-800 opacity-70'
            : 'border-slate-200 dark:border-slate-700 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900/40',
        )}>
          <textarea
            ref={inputRef}
            data-study-chat-input
            value={input}
            onChange={(e) => updateInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && input.trim()) { e.preventDefault(); send(); } }}
            rows={1}
            placeholder={streaming ? '답변을 생성하고 있어요...' : enabledSources.length === 0 ? (readiness.hasOnlyPendingSources ? '자료 분석이 끝나면 질문할 수 있어요' : '먼저 원본 자료를 추가해주세요') : notebook.chatMode === 'socratic' ? '모르는 걸 물어보면 같이 생각해볼게요' : '입력을 시작하세요...'}
            disabled={streaming || enabledSources.length === 0}
            className="min-h-[40px] min-w-0 max-h-40 flex-1 resize-none bg-transparent py-2 text-[13px] leading-relaxed outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
          />
          <button
            onClick={() => streaming ? stopStreaming() : send()}
            disabled={!streaming && (!input.trim() || enabledSources.length === 0)}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 sm:h-8 sm:w-8',
              streaming ? 'bg-slate-800 hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white' : 'bg-indigo-600 hover:bg-indigo-500',
            )}
            aria-label={streaming ? '응답 중단' : '전송'}
            title={streaming ? '응답 중단' : '전송 (Enter)'}
          >
            {streaming ? <X className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

function ChatEmptyState({
  enabledSources,
  readiness,
  suggestedSeeds,
  onSend,
  onOpenSources,
}: {
  enabledSources: StudySource[];
  readiness: ReturnType<typeof getStudySourceReadiness>;
  suggestedSeeds: string[];
  onSend: (seed: string) => void;
  onOpenSources: () => void;
}) {
  const hasSources = enabledSources.length > 0;

  if (hasSources) {
    return (
      <div className="flex h-full flex-col justify-center px-3 py-8">
        <div className="mx-auto w-full max-w-[560px]">
          <p className="mb-3 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            추천 질문
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {suggestedSeeds.slice(0, 4).map((seed, index) => {
              const icons = [ListChecks, Highlighter, BookOpenCheck, MessageSquarePlus] as const;
              const Icon = icons[index] ?? ListChecks;
              return (
                <button
                  key={seed}
                  onClick={() => onSend(seed)}
                  className="group flex min-h-[76px] w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/25"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-100 transition-colors group-hover:bg-white group-hover:text-indigo-600 dark:bg-slate-950 dark:text-slate-400 dark:ring-slate-800 dark:group-hover:bg-slate-900 dark:group-hover:text-indigo-300">
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1 text-[12.5px] font-semibold leading-relaxed text-slate-700 dark:text-slate-200">
                    {seed}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-center px-2 py-8">
      <div className="mx-auto w-full max-w-[460px]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left dark:border-slate-800 dark:bg-slate-950/30">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
              <BookOpenCheck className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-slate-900 dark:text-slate-100">
                {readiness.hasOnlyPendingSources ? '자료를 읽는 중이에요' : '먼저 자료를 추가하면 대화가 열려요'}
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                {readiness.hasOnlyPendingSources
                  ? `원본 ${readiness.pendingCount}개를 분석하고 있어요. 텍스트가 준비되면 질문창이 자동으로 열립니다.`
                  : 'PDF, PPTX, 링크, 붙여넣기, 녹음 중 하나로 원본을 먼저 넣어주세요.'}
              </p>
            </div>
          </div>

          {!hasSources && !readiness.hasOnlyPendingSources && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={onOpenSources}
                className="inline-flex h-8 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11.5px] font-bold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30"
              >
                <FileUp className="h-3.5 w-3.5" />
                원본 패널 열기
              </button>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                왼쪽에서 파일을 넣으면 질문 입력창이 열려요
              </span>
            </div>
          )}

          {!hasSources && readiness.hasOnlyPendingSources && (
            <div className="mt-4 rounded-xl border border-indigo-100 bg-white px-3 py-2.5 text-[11.5px] font-medium text-indigo-700 dark:border-indigo-900/50 dark:bg-slate-900 dark:text-indigo-200">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                분석 전 빈 답변을 막기 위해 질문 입력을 잠시 닫아둘게요.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function isVisibleElement(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).visibility !== 'hidden';
}

function getChatSourceScopeLabel(
  readiness: ReturnType<typeof getStudySourceReadiness>,
  enabledSources: StudySource[],
  totalSourceChars: number,
) {
  if (enabledSources.length > 0 && readiness.pendingCount > 0) {
    return `${enabledSources.length}개 준비 · ${readiness.pendingCount}개 분석 중`;
  }
  if (enabledSources.length > 0) {
    return `참고 원본 ${enabledSources.length}개 · ${formatStudyCharCount(totalSourceChars)}`;
  }
  if (readiness.hasOnlyPendingSources) return `원본 ${readiness.pendingCount}개 분석 중`;
  if (readiness.erroredCount > 0) return '원본 확인 필요';
  return '원본 없음';
}

function buildSuggestedSeeds(sources: StudySource[], notebookTitle: string) {
  if (sources.length === 0) return FALLBACK_SUGGESTED_SEEDS;

  const main = normalizeSourceTitle(sources[0]?.title || notebookTitle);
  const sourceCountHint = sources.length > 1 ? `전체 원본 ${sources.length}개를 엮어서` : `${main}에서`;
  const firstKind = sources[0]?.kind;

  if (firstKind === 'pdf' || firstKind === 'pptx' || firstKind === 'docx') {
    return [
      `${sourceCountHint} 핵심 개념을 3문장으로 요약해줘`,
      `${main} 기준으로 시험에 나올 만한 포인트 5개 뽑아줘`,
      '헷갈릴 부분을 쉬운 질문 3개로 점검해줘',
      `${main}에서 표나 그림을 해석할 때 봐야 할 기준을 알려줘`,
    ];
  }

  if (firstKind === 'youtube' || firstKind === 'recording') {
    return [
      `${sourceCountHint} 말한 순서대로 핵심 흐름을 정리해줘`,
      '중요한 주장과 근거를 표처럼 나눠줘',
      '듣고 놓치기 쉬운 부분을 퀴즈로 확인해줘',
      '바로 써먹을 수 있는 예시를 하나 들어줘',
    ];
  }

  if (firstKind === 'url') {
    return [
      `${main}의 핵심 주장과 근거를 분리해줘`,
      '이 자료에서 바로 써먹을 수 있는 예시를 뽑아줘',
      '반박될 수 있는 지점과 보완 설명을 알려줘',
      '문서 구조를 목차처럼 다시 정리해줘',
    ];
  }

  return [
    `${sourceCountHint} 핵심만 먼저 요약해줘`,
    '외워야 할 문장과 이유를 뽑아줘',
    '내가 이해했는지 확인할 질문 3개를 내줘',
    '시험에 나올 만한 포인트를 우선순위로 정리해줘',
  ];
}

function normalizeSourceTitle(title: string) {
  const clean = title.replace(/\s+/g, ' ').trim();
  if (!clean) return '이 자료';
  return clean.length > 22 ? `${clean.slice(0, 22)}...` : clean;
}

function getSourceKindLabel(kind: StudySource['kind']) {
  if (kind === 'paste') return '텍스트';
  if (kind === 'url') return '웹';
  if (kind === 'youtube') return '영상';
  if (kind === 'recording') return '녹음';
  return kind.toUpperCase();
}

type ChatMode = 'explain' | 'socratic' | 'custom';
type ChatLen = 'default' | 'long' | 'short';

const MODE_DESC: Record<ChatMode, { title: string; desc: string }> = {
  explain: { title: '기본', desc: '일반적인 학습 질문과 설명에 적합합니다.' },
  socratic: { title: '학습 가이드', desc: '정답을 바로 주지 않고 힌트와 질문으로 스스로 찾게 도와줍니다.' },
  custom: { title: '맞춤', desc: '원하는 튜터 스타일이나 목표를 직접 지시할 수 있어요.' },
};

function ChatSettingsModal({
  notebook, onSave, onClose,
}: {
  notebook: StudyNotebook;
  onSave: (patch: Partial<StudyNotebook>) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<ChatMode>(notebook.chatMode);
  const [custom, setCustom] = useState<string>(notebook.chatCustomInstruction ?? '');
  const [len, setLen] = useState<ChatLen>(notebook.chatResponseLength ?? 'default');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = () => {
    onSave({
      chatMode: mode,
      chatCustomInstruction: mode === 'custom' ? custom.trim() || undefined : notebook.chatCustomInstruction,
      chatResponseLength: len,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-settings-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 id="chat-settings-title" className="text-[15px] font-bold text-slate-900 dark:text-slate-100">채팅 설정</h3>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">
            학습 목표·스타일·응답 길이를 자료별로 맞춤 설정해 대화 흐름을 조정할 수 있어요.
          </p>

          <section>
            <p className="text-[12px] font-semibold text-slate-900 dark:text-slate-100 mb-2">대화 목표, 스타일 또는 역할 정의</p>
            <div className="flex flex-wrap gap-1.5">
              {(['explain', 'socratic', 'custom'] as const).map((m) => {
                const active = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors',
                      active
                        ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400',
                    )}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {MODE_DESC[m].title}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{MODE_DESC[mode].desc}</p>
            {mode === 'custom' && (
              <textarea
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                rows={3}
                placeholder="예: 고등학생 수준으로, 핵심 개념부터 차근차근 설명해주고 마지막에 연습 문제 1개를 내줘."
                className="mt-3 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[12.5px] outline-none focus:border-indigo-400 resize-none"
              />
            )}
          </section>

          <section>
            <p className="text-[12px] font-semibold text-slate-900 dark:text-slate-100 mb-2">대답 길이 선택</p>
            <div className="flex flex-wrap gap-1.5">
              {(['default', 'long', 'short'] as const).map((v) => {
                const label = v === 'default' ? '기본' : v === 'long' ? '길게' : '짧게';
                const active = len === v;
                return (
                  <button
                    key={v}
                    onClick={() => setLen(v)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors',
                      active
                        ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-400',
                    )}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-[12px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            취소
          </button>
          <button
            onClick={save}
            className="rounded-md bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 text-[12px] font-semibold"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function handleHighlight(
  notebook: StudyNotebook, onChange: (nb: StudyNotebook) => void,
  promote: (f: string, b: string) => void, turn: StudyChatTurn, color: HighlightColor,
) {
  const text = (typeof window !== 'undefined' ? window.getSelection()?.toString() : '') || '';
  const excerpt = text.trim() || turn.content.slice(0, 140);
  if (!excerpt) return;
  const h: Highlight = { id: newId('hl'), turnId: turn.id, text: excerpt, color, createdAt: Date.now() };
  const nextHighlights = [...(notebook.highlights ?? []), h];
  if (color === 'green') {
    const front = excerpt.length > 60 ? excerpt.slice(0, 60) + '…' : excerpt;
    promote(front, excerpt);
    onChange({ ...notebook, highlights: nextHighlights });
    return;
  }
  if (color === 'pink') {
    const wrong = {
      id: newId('w'), quizItemId: newId('hlq'),
      question: excerpt.length > 80 ? excerpt.slice(0, 80) + '…' : excerpt,
      correct: '확인 필요', chosen: '헷갈림 마킹',
      explanation: '이 부분을 다시 확인해보세요.',
      missedAt: Date.now(), reviewedCount: 0,
    };
    onChange({ ...notebook, highlights: nextHighlights, wrongAnswers: [wrong, ...notebook.wrongAnswers] });
    return;
  }
  onChange({ ...notebook, highlights: nextHighlights });
}

function ChatBubble({
  turn, sources, mode, onPromote, onHighlight, onFollowUp,
}: {
  turn: StudyChatTurn;
  sources: StudySource[];
  mode: 'explain' | 'socratic' | 'custom';
  onPromote: (f: string, b: string) => void;
  onHighlight: (color: HighlightColor) => void;
  onFollowUp: (prompt: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isUser = turn.role === 'user';

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const map: HighlightColor[] = ['yellow', 'pink', 'blue', 'green'];
        onHighlight(map[parseInt(e.key) - 1]);
        setMenuOpen(false);
      }
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    setTimeout(() => window.addEventListener('click', onClick), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
    };
  }, [menuOpen, onHighlight]);

  const createQuickCard = () => {
    const front = turn.content.length > 68 ? `${turn.content.slice(0, 68)}...` : turn.content;
    onPromote(front || '방금 답변 카드', turn.content);
    toast({ title: '암기카드로 저장했어요', description: '스튜디오의 플래시카드에서 바로 확인할 수 있어요.' });
  };

  const copyAnswer = async () => {
    const ok = await copyText(turn.content);
    toast({ title: ok ? '답변을 복사했어요' : '복사하지 못했어요' });
  };

  const citationSources: CitationSource[] = turn.citationSources?.length
    ? turn.citationSources
    : sources;

  if (isUser) {
    return (
      <div className="flex justify-end pl-8">
        <div className="flex max-w-[88%] items-start gap-2 sm:max-w-[78%]">
          <div className="min-w-0 rounded-2xl rounded-tr-md bg-slate-900 px-3.5 py-2.5 text-[13px] leading-relaxed text-white shadow-sm dark:bg-slate-100 dark:text-slate-950">
            <p className="whitespace-pre-wrap break-words">{turn.content}</p>
          </div>
          <div className="mt-0.5 hidden h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 sm:flex">
            <UserRound className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex gap-3 pl-1">
      <div className={cn(
        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ring-1',
        mode === 'socratic'
          ? 'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/35 dark:text-violet-200 dark:ring-violet-900/50'
          : 'bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-950/35 dark:text-indigo-200 dark:ring-indigo-900/50',
      )}>
        {mode === 'socratic' ? <Highlighter className="h-3.5 w-3.5" /> : <BookOpenCheck className="h-3.5 w-3.5" />}
      </div>
      <div className="flex-1 min-w-0 max-w-[92%] sm:max-w-[85%]">
        {turn.content ? (
          <div className="text-[13px] leading-relaxed text-slate-800 dark:text-slate-200 prose prose-sm max-w-none dark:prose-invert">
            <CitedMarkdown text={turn.content} sources={citationSources} />
          </div>
        ) : (
          <div className="study-shimmer h-3 w-24 rounded" />
        )}
        {turn.content && citationSources.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400">답변 당시 원본</span>
            {citationSources.slice(0, 3).map((source, index) => (
              <span
                key={`${source.id ?? source.title}-${index}`}
                className="inline-flex max-w-[140px] items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800"
                title={source.title}
              >
                <span className="font-mono text-indigo-500">S{index + 1}</span>
                <span className="truncate">{source.title}</span>
              </span>
            ))}
            {citationSources.length > 3 && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                +{citationSources.length - 3}
              </span>
            )}
          </div>
        )}
        {turn.content.length > 20 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <StudyChatAction
              icon={<BookOpenCheck className="h-3.5 w-3.5" />}
              label="쉽게 다시"
              onClick={() => onFollowUp(`방금 답변을 더 쉽게, 예시 1개를 넣어서 다시 설명해줘.\n\n이전 답변:\n${turn.content.slice(0, 1600)}`)}
            />
            <StudyChatAction
              icon={<ListChecks className="h-3.5 w-3.5" />}
              label="퀴즈 3개"
              onClick={() => onFollowUp(`방금 답변에서 내가 이해했는지 확인할 수 있는 객관식 퀴즈 3개를 만들어줘. 각 문항마다 정답과 짧은 해설도 붙여줘.\n\n이전 답변:\n${turn.content.slice(0, 1600)}`)}
            />
            <StudyChatAction
              icon={<BookOpenCheck className="h-3.5 w-3.5" />}
              label="카드 저장"
              onClick={createQuickCard}
            />
            <StudyChatAction
              icon={<Copy className="h-3.5 w-3.5" />}
              label="복사"
              onClick={() => void copyAnswer()}
            />
          </div>
        )}
        {turn.content.length > 40 && (
          <div className="mt-2 relative" ref={ref}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded"
              aria-label="답변 액션"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-full mt-1 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1.5 z-40" role="menu">
                <p className="px-2 pt-1 pb-1 text-[9.5px] uppercase tracking-wide text-slate-400">하이라이트</p>
                {(['yellow', 'pink', 'blue', 'green'] as HighlightColor[]).map((c, i) => (
                  <button key={c} onClick={() => { onHighlight(c); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    role="menuitem"
                  >
                    <span className={cn('h-3 w-3 rounded-sm', HIGHLIGHT_META[c].swatch)} />
                    <span className="flex-1 text-left">{HIGHLIGHT_META[c].label}</span>
                    <span className="text-[10px] text-slate-400">{HIGHLIGHT_META[c].role}</span>
                    <kbd className="ml-1 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9.5px] font-mono text-slate-500">{i + 1}</kbd>
                  </button>
                ))}
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button onClick={async () => {
                    setMenuOpen(false);
                    const front = await textInputDialog({
                      title: '플래시카드 만들기',
                      label: '앞면',
                      defaultValue: turn.content.slice(0, 60),
                      placeholder: '질문이나 단서',
                      confirmLabel: '다음',
                      required: true,
                    });
                    if (!front) return;
                    const back = await textInputDialog({
                      title: '플래시카드 만들기',
                      description: '카드 뒷면에 들어갈 답을 적어 주세요.',
                      label: '뒷면',
                      defaultValue: turn.content,
                      placeholder: '답 또는 설명',
                      confirmLabel: '카드 저장',
                      multiline: true,
                      required: true,
                    });
                    if (!back) return;
                    onPromote(front, back);
                  }}
                  className="w-full text-left rounded-lg px-2 py-1.5 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  role="menuitem"
                >
                  플래시카드로 만들기
                </button>
                <button onClick={() => { navigator.clipboard?.writeText(turn.content); setMenuOpen(false); }}
                  className="w-full text-left rounded-lg px-2 py-1.5 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  role="menuitem"
                >
                  복사
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StudyChatAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/35 dark:hover:text-indigo-200"
    >
      {icon}
      {label}
    </button>
  );
}
