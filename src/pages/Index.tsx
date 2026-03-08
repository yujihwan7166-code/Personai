import { useState, useRef, useEffect, useCallback } from 'react';
import { DEFAULT_EXPERTS, DiscussionMessage, Expert } from '@/types/expert';
import { QuestionInput } from '@/components/QuestionInput';
import { ExpertPanel } from '@/components/ExpertPanel';
import { DiscussionMessageCard } from '@/components/DiscussionMessage';
import { MessageSquare } from 'lucide-react';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/expert-discuss`;

async function streamExpert({
  question,
  expert,
  previousResponses,
  onDelta,
  onDone,
}: {
  question: string;
  expert: Expert;
  previousResponses: { name: string; content: string }[];
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({
      question,
      expertSystemPrompt: expert.systemPrompt,
      previousResponses,
    }),
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
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [activeExpertId, setActiveExpertId] = useState<string | undefined>();
  const [isDiscussing, setIsDiscussing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const startDiscussion = useCallback(async (question: string) => {
    setIsDiscussing(true);
    setCurrentQuestion(question);
    setMessages([]);

    const experts = DEFAULT_EXPERTS;
    const completedResponses: { name: string; content: string }[] = [];

    for (const expert of experts) {
      setActiveExpertId(expert.id);
      const msgId = `${expert.id}-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: msgId, expertId: expert.id, content: '', isStreaming: true },
      ]);

      let fullContent = '';
      try {
        await streamExpert({
          question,
          expert,
          previousResponses: completedResponses,
          onDelta: (chunk) => {
            fullContent += chunk;
            setMessages((prev) =>
              prev.map((m) => (m.id === msgId ? { ...m, content: fullContent } : m))
            );
          },
          onDone: () => {
            setMessages((prev) =>
              prev.map((m) => (m.id === msgId ? { ...m, isStreaming: false } : m))
            );
          },
        });
      } catch (err) {
        console.error(`Error from ${expert.name}:`, err);
        fullContent = `⚠️ 응답을 가져오는 중 오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m))
        );
      }

      completedResponses.push({ name: expert.nameKo, content: fullContent });

      // Small delay between experts
      if (expert !== experts[experts.length - 1]) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    setActiveExpertId(undefined);
    setIsDiscussing(false);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">AI 전문가 토론</h1>
            <p className="text-xs text-muted-foreground">여러 AI 전문가가 당신의 질문에 대해 토론합니다</p>
          </div>
        </div>
      </header>

      {/* Expert Panel */}
      <div className="border-b border-border">
        <div className="max-w-3xl mx-auto">
          <ExpertPanel experts={DEFAULT_EXPERTS} activeExpertId={activeExpertId} />
        </div>
      </div>

      {/* Discussion Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && !isDiscussing && (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">💬</div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                질문을 입력하세요
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                GPT, Gemini, 의학 전문가, 투자 전문가가 함께 토론하며 다양한 관점의 답변을 제공합니다.
              </p>
            </div>
          )}

          {currentQuestion && messages.length > 0 && (
            <div className="bg-secondary/50 rounded-xl p-4 mb-6 border border-border">
              <span className="text-xs text-muted-foreground font-display">질문</span>
              <p className="text-foreground font-medium mt-1">{currentQuestion}</p>
            </div>
          )}

          {messages.map((msg) => {
            const expert = DEFAULT_EXPERTS.find((e) => e.id === msg.expertId);
            if (!expert) return null;
            return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} />;
          })}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <QuestionInput onSubmit={startDiscussion} disabled={isDiscussing} />
        </div>
      </div>
    </div>
  );
};

export default Index;
