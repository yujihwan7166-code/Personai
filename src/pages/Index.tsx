import { useState, useRef, useEffect, useCallback } from 'react';
import { DEFAULT_EXPERTS, SUMMARIZER_EXPERT, DiscussionMessage, Expert } from '@/types/expert';
import { QuestionInput } from '@/components/QuestionInput';
import { ExpertPanel } from '@/components/ExpertPanel';
import { DiscussionMessageCard } from '@/components/DiscussionMessage';
import { ExpertManageDialog } from '@/components/ExpertManageDialog';
import { MessageSquare, Zap, Users, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/expert-discuss`;

async function streamExpert({
  question, expert, previousResponses, onDelta, onDone,
}: {
  question: string; expert: Expert;
  previousResponses: { name: string; content: string }[];
  onDelta: (text: string) => void; onDone: () => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ question, expertSystemPrompt: expert.systemPrompt, previousResponses }),
  });

  if (!resp.ok || !resp.body) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(errorData.error || '스트림 시작 실패');
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = '';
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });
    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') { streamDone = true; break; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + '\n' + textBuffer;
        break;
      }
    }
  }
  onDone();
}

const Index = () => {
  const [experts, setExperts] = useState<Expert[]>(() => {
    try {
      const saved = localStorage.getItem('ai-debate-experts-v5');
      if (saved) {
        const parsed = JSON.parse(saved) as Expert[];
        return parsed.map(e => ({ ...e, category: e.category || 'ai' }));
      }
      return DEFAULT_EXPERTS;
    } catch { return DEFAULT_EXPERTS; }
  });
  const [selectedExpertIds, setSelectedExpertIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ai-debate-selected-v5');
      return saved ? JSON.parse(saved) : ['gpt'];
    } catch { return ['gpt']; }
  });
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [activeExpertId, setActiveExpertId] = useState<string | undefined>();
  const [isDiscussing, setIsDiscussing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('ai-debate-experts-v5', JSON.stringify(experts));
  }, [experts]);

  useEffect(() => {
    // Sync selected ids when experts change
    setSelectedExpertIds(prev => prev.filter(id => experts.some(e => e.id === id)));
  }, [experts]);

  useEffect(() => {
    localStorage.setItem('ai-debate-selected-v4', JSON.stringify(selectedExpertIds));
  }, [selectedExpertIds]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const toggleExpert = (id: string) => {
    setSelectedExpertIds(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev; // minimum 2
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  };

  const copyAllResults = () => {
    const text = messages.map(msg => {
      const expert = [...experts, SUMMARIZER_EXPERT].find(e => e.id === msg.expertId);
      return `[${expert?.nameKo || ''}]\n${msg.content}`;
    }).join('\n\n---\n\n');
    navigator.clipboard.writeText(`질문: ${currentQuestion}\n\n${text}`);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const activeExperts = experts.filter(e => selectedExpertIds.includes(e.id));

  const startDiscussion = useCallback(async (question: string) => {
    const discussionExperts = experts.filter(e => selectedExpertIds.includes(e.id));
    if (discussionExperts.length < 2) return;

    setIsDiscussing(true);
    setCurrentQuestion(question);
    setMessages([]);
    const completedResponses: { name: string; content: string }[] = [];

    for (const expert of discussionExperts) {
      setActiveExpertId(expert.id);
      const msgId = `${expert.id}-${Date.now()}`;
      setMessages(prev => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true }]);

      let fullContent = '';
      try {
        await streamExpert({
          question, expert, previousResponses: completedResponses,
          onDelta: (chunk) => {
            fullContent += chunk;
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m));
          },
          onDone: () => {
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m));
          },
        });
      } catch (err) {
        fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
      }
      completedResponses.push({ name: expert.nameKo, content: fullContent });
      if (expert !== discussionExperts[discussionExperts.length - 1]) await new Promise(r => setTimeout(r, 800));
    }

    // Summarizer
    setActiveExpertId(SUMMARIZER_EXPERT.id);
    const summaryId = `summary-${Date.now()}`;
    setMessages(prev => [...prev, { id: summaryId, expertId: SUMMARIZER_EXPERT.id, content: '', isStreaming: true, isSummary: true }]);

    let summaryContent = '';
    const summaryPrompt = `You are the final discussion summarizer. Synthesize all expert opinions into an organized Korean summary:
1. 📌 핵심 요약 - Key consensus points
2. ⚔️ 의견 차이 - Major disagreements between experts  
3. 💡 종합 결론 - Actionable conclusion and recommendation
Be thorough but concise. Reference specific experts by name.`;

    try {
      await streamExpert({
        question, expert: { ...SUMMARIZER_EXPERT, systemPrompt: summaryPrompt },
        previousResponses: completedResponses,
        onDelta: (chunk) => {
          summaryContent += chunk;
          setMessages(prev => prev.map(m => m.id === summaryId ? { ...m, content: summaryContent } : m));
        },
        onDone: () => {
          setMessages(prev => prev.map(m => m.id === summaryId ? { ...m, isStreaming: false } : m));
        },
      });
    } catch (err) {
      summaryContent = `⚠️ 요약 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
      setMessages(prev => prev.map(m => m.id === summaryId ? { ...m, content: summaryContent, isStreaming: false } : m));
    }

    setActiveExpertId(undefined);
    setIsDiscussing(false);
  }, [experts, selectedExpertIds]);

  const allExperts = [...experts, SUMMARIZER_EXPERT];
  const panelExperts = isDiscussing || messages.length > 0 ? [...activeExperts, SUMMARIZER_EXPERT] : experts;
  const isDone = messages.length > 0 && !isDiscussing;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-lg font-bold text-foreground tracking-tight">AI 전문가 토론</h1>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> {activeExperts.length}명 참여 · <Zap className="w-3 h-3" /> 실시간 토론
            </p>
          </div>
          <ExpertManageDialog experts={experts} onUpdate={setExperts} />
        </div>
      </header>

      {/* Expert Panel */}
      <div className="border-b border-border bg-card/30">
        <div className="max-w-4xl mx-auto">
          {!isDiscussing && messages.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center pt-3">카테고리를 클릭하여 펼치고 토론 참여자를 선택하세요 (최소 2명)</p>
          )}
          <ExpertPanel
            experts={panelExperts}
            activeExpertId={activeExpertId}
            selectedIds={selectedExpertIds}
            onToggle={toggleExpert}
            selectable={!isDiscussing && messages.length === 0}
          />
        </div>
      </div>

      {/* Discussion Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scrollbar-thin">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && !isDiscussing && (
            <div className="text-center py-16 sm:py-24">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10 text-primary" />
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3 tracking-tight">
                무엇이든 물어보세요
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed">
                위 패널에서 토론에 참여할 전문가를 선택하고 질문을 입력하세요.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-md mx-auto">
                {['비트코인에 투자해도 될까?', 'AI가 일자리를 대체할까?', '건강하게 장수하려면?'].map(q => (
                  <button key={q} onClick={() => startDiscussion(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentQuestion && messages.length > 0 && (
            <div className="bg-secondary/50 rounded-xl p-4 border border-border flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">Question</span>
                <p className="text-foreground font-medium mt-0.5">{currentQuestion}</p>
              </div>
              {isDone && (
                <Button variant="ghost" size="sm" onClick={copyAllResults} className="shrink-0 text-xs gap-1 text-muted-foreground">
                  {copiedAll ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedAll ? '복사됨' : '전체 복사'}
                </Button>
              )}
            </div>
          )}

          {messages.map(msg => {
            const expert = allExperts.find(e => e.id === msg.expertId);
            if (!expert) return null;
            return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} />;
          })}

          {isDone && (
            <div className="text-center pt-6 pb-2">
              <p className="text-xs text-muted-foreground">토론이 완료되었습니다. 새로운 질문을 입력하세요.</p>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 sm:px-6 py-3 bg-card/50">
        <div className="max-w-4xl mx-auto">
          <QuestionInput onSubmit={startDiscussion} disabled={isDiscussing || activeExperts.length < 2} />
        </div>
      </div>
    </div>
  );
};

export default Index;
