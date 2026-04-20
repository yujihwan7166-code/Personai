import { useState, useMemo, useEffect, useRef } from 'react';
import { Send, Settings2, MoreHorizontal } from 'lucide-react';
import type { StudyNotebook, StudyChatTurn, StudySource, HighlightColor, Highlight } from '@/types/study';
import { newId, HIGHLIGHT_META } from '@/types/study';
import { StudyBtn } from './ui/primitives';
import { CitedMarkdown } from './CitationPopover';
import { cn } from '@/lib/utils';

interface Props {
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  onPromoteToFlashcard: (front: string, back: string) => void;
  onStartRecording?: () => void;
}

const SUGGESTED_SEEDS = [
  '핵심 개념을 3문장으로 요약해줘',
  '가장 헷갈리기 쉬운 부분은?',
  '실생활 예시 하나만',
];

export function StudyChat({ notebook, onChange, onPromoteToFlashcard, onStartRecording: _onStartRecording }: Props) {
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showModePopover, setShowModePopover] = useState(false);

  const enabledSources = useMemo(
    () => notebook.sources.filter((s) => s.enabled && s.status === 'ready'),
    [notebook.sources],
  );

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || streaming) return;
    if (enabledSources.length === 0) { alert('소스를 먼저 하나 이상 활성화해주세요.'); return; }

    const userTurn: StudyChatTurn = { id: newId('t'), role: 'user', content: q, createdAt: Date.now() };
    const placeholderId = newId('t');
    const nextNb = { ...notebook, chat: [...notebook.chat, userTurn, { id: placeholderId, role: 'assistant' as const, content: '', createdAt: Date.now() }] };
    onChange(nextNb);
    setInput('');
    setStreaming(true);

    try {
      const sourceBlock = enabledSources.map((s, i) => `[S${i + 1}] ${s.title}\n${s.content.slice(0, 10000)}`).join('\n\n---\n\n');
      const systemPrompt = notebook.chatMode === 'socratic'
        ? `당신은 공부 도우미 튜터입니다. 아래 소스를 근거로 학생을 가르칩니다.
중요: 답을 바로 주지 마세요. 1) 학생이 이미 아는 것을 묻기 → 2) 힌트 한 개 → 3) "어떻게 생각해?" → 4) 막히면 간결히 해설.
한국어로, 부드럽게.

=== 소스 ===
${sourceBlock}
=== /소스 ===`
        : `당신은 공부 도우미 튜터입니다. 아래 소스만 근거로 정확히 답합니다.
- 소스 밖 사실 추측 금지. 인용은 [S1], [S2] 형태.
- 간결하고 구조화된 한국어.

=== 소스 ===
${sourceBlock}
=== /소스 ===`;
      const history = notebook.chat.slice(-6).filter((t) => t.role === 'user' || t.role === 'assistant').map((t) => ({
        name: t.role === 'user' ? '학생' : '튜터',
        content: t.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, question: q, previousResponses: history, searchPolicy: 'never', preSearchContext: null, maxTokens: 1800, temperature: 0.55 }),
      });
      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => '');
        onChange({ ...nextNb, chat: nextNb.chat.map((t) => t.id === placeholderId ? { ...t, content: `⚠️ ${txt || '응답 실패'}` } : t) });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', accumulated = '', currentNb = nextNb;
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
    } catch (e) { console.error('[study-chat]', e); }
    finally { setStreaming(false); }
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900 relative">
      <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100">대화</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {enabledSources.length === 0 ? '소스 없음' : `소스 ${enabledSources.length}개 사용`}
            {notebook.chatMode === 'socratic' && ' · 같이 생각하기 모드'}
          </p>
        </div>
        <button
          onClick={() => setShowModePopover(!showModePopover)}
          className="relative text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="모드 설정"
          title="모드 설정"
        >
          <Settings2 className="h-4 w-4" />
          {showModePopover && (
            <ModePopover
              mode={notebook.chatMode}
              onChange={(v) => { onChange({ ...notebook, chatMode: v }); setShowModePopover(false); }}
              onClose={() => setShowModePopover(false)}
            />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {notebook.chat.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <p className="text-[15px] font-bold text-slate-900 dark:text-slate-100">무엇이든 물어보세요</p>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
              {enabledSources.length === 0 ? '자료가 준비되면 질문이 열려요.' : '아래 추천으로 시작해도 좋아요.'}
            </p>
            {enabledSources.length === 0 && (
              <p className="mt-2 text-[11px] text-slate-400">← 원본 패널에서 자료를 추가해 주세요</p>
            )}
            {enabledSources.length > 0 && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {SUGGESTED_SEEDS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-[11.5px] text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          notebook.chat.map((t) => (
            <ChatBubble key={t.id} turn={t} sources={enabledSources} mode={notebook.chatMode}
              onPromote={onPromoteToFlashcard}
              onHighlight={(color) => handleHighlight(notebook, onChange, onPromoteToFlashcard, t, color)}
            />
          ))
        )}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && input.trim()) { e.preventDefault(); send(); } }}
            rows={1}
            placeholder={enabledSources.length === 0 ? '먼저 소스를 추가해주세요' : notebook.chatMode === 'socratic' ? '모르는 걸 물어보면 같이 생각해볼게요' : '자유롭게 질문하세요'}
            disabled={streaming || enabledSources.length === 0}
            className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-[13px] outline-none focus:border-indigo-400 disabled:opacity-60 max-h-32"
          />
          <StudyBtn variant="primary" onClick={() => send()} disabled={!input.trim() || streaming || enabledSources.length === 0}>
            <Send className="h-3.5 w-3.5" />
          </StudyBtn>
        </div>
      </div>
    </div>
  );
}

function ModePopover({
  mode, onChange, onClose,
}: { mode: 'explain' | 'socratic'; onChange: (v: 'explain' | 'socratic') => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    setTimeout(() => window.addEventListener('click', h), 0);
    return () => window.removeEventListener('click', h);
  }, [onClose]);
  const Opt = ({ value, title, desc }: { value: 'explain' | 'socratic'; title: string; desc: string }) => (
    <button
      onClick={() => onChange(value)}
      className={cn('w-full text-left rounded-lg px-3 py-2.5 transition-colors', mode === value ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800')}
    >
      <p className={cn('text-[12.5px] font-semibold', mode === value ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200')}>{title}</p>
      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
    </button>
  );
  return (
    <div ref={ref} className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1.5 z-50" role="menu">
      <Opt value="explain" title="바로 설명" desc="튜터가 답을 곧바로 알려줘요" />
      <Opt value="socratic" title="같이 생각하기" desc="힌트와 질문으로 스스로 찾게 도와요" />
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
      correct: '복습 필요', chosen: '헷갈림 마킹',
      explanation: '이 부분을 다시 확인해보세요.',
      missedAt: Date.now(), reviewedCount: 0,
    };
    onChange({ ...notebook, highlights: nextHighlights, wrongAnswers: [wrong, ...notebook.wrongAnswers] });
    return;
  }
  onChange({ ...notebook, highlights: nextHighlights });
}

function ChatBubble({
  turn, sources, mode, onPromote, onHighlight,
}: {
  turn: StudyChatTurn;
  sources: StudySource[];
  mode: 'explain' | 'socratic';
  onPromote: (f: string, b: string) => void;
  onHighlight: (color: HighlightColor) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  if (turn.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-[13px] text-slate-800 dark:text-slate-100 leading-relaxed">
          {turn.content}
        </div>
      </div>
    );
  }

  const icon = mode === 'socratic' ? '💭' : '📘';
  return (
    <div className="group flex gap-3 pl-1">
      <div className="text-lg select-none">{icon}</div>
      <div className="flex-1 min-w-0 max-w-[85%]">
        {turn.content ? (
          <div className="text-[13px] leading-relaxed text-slate-800 dark:text-slate-200 prose prose-sm max-w-none dark:prose-invert">
            <CitedMarkdown text={turn.content} sources={sources} />
          </div>
        ) : (
          <div className="study-shimmer h-3 w-24 rounded" />
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
                <button onClick={() => {
                    const front = prompt('카드 앞면 (질문)', turn.content.slice(0, 60));
                    if (!front) return;
                    const back = prompt('카드 뒷면 (답)', turn.content);
                    if (!back) return;
                    onPromote(front, back);
                    setMenuOpen(false);
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
