import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { DEFAULT_EXPERTS, SUMMARIZER_EXPERT, CONCLUSION_EXPERT, DiscussionMessage, DiscussionRound, DiscussionMode, Expert, ROUND_LABELS } from '@/types/expert';
import { QuestionInput } from '@/components/QuestionInput';
import { DiscussionMessageCard } from '@/components/DiscussionMessage';
import { AppSidebar } from '@/components/AppSidebar';
import { ExpertSelectionPanel } from '@/components/ExpertSelectionPanel';
import { ExpertAvatar } from '@/components/ExpertAvatar';
import { saveDiscussionToHistory, DiscussionRecord } from '@/components/DiscussionHistory';
import { MessageSquare, Zap, Users, Copy, Check, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/expert-discuss`;

async function streamExpert({
  question, expert, previousResponses, round, onDelta, onDone, signal,
}: {
  question: string; expert: Expert;
  previousResponses: { name: string; content: string }[];
  round: DiscussionRound | 'summary';
  onDelta: (text: string) => void; onDone: () => void;
  signal?: AbortSignal;
}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ question, expertSystemPrompt: expert.systemPrompt, previousResponses, round }),
    signal,
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
  const [discussionMode, setDiscussionMode] = useState<DiscussionMode>('standard');
  const [stopRequested, setStopRequested] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('ai-debate-experts-v5', JSON.stringify(experts));
  }, [experts]);

  useEffect(() => {
    setSelectedExpertIds(prev => prev.filter(id => experts.some(e => e.id === id)));
  }, [experts]);

  useEffect(() => {
    localStorage.setItem('ai-debate-selected-v5', JSON.stringify(selectedExpertIds));
  }, [selectedExpertIds]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const toggleExpert = (id: string) => {
    setSelectedExpertIds(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  };

  const handleModeChange = (mode: DiscussionMode) => {
    setDiscussionMode(mode);
    if (mode === 'general') {
      // In general mode, keep only AI category experts
      setSelectedExpertIds(prev => {
        const aiOnly = prev.filter(id => {
          const expert = experts.find(e => e.id === id);
          return expert?.category === 'ai';
        });
        return aiOnly.length > 0 ? aiOnly : ['gpt'];
      });
    }
  };

  const copyAllResults = () => {
    const text = messages.filter(m => m.expertId !== '__round__').map(msg => {
      const expert = [...experts, SUMMARIZER_EXPERT, CONCLUSION_EXPERT].find(e => e.id === msg.expertId);
      return `[${expert?.nameKo || ''}]\n${msg.content}`;
    }).join('\n\n---\n\n');
    navigator.clipboard.writeText(`질문: ${currentQuestion}\n\n${text}`);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleLike = (messageId: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, likes: (m.likes ?? 0) + 1 } : m));
  };

  const handleDislike = (messageId: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, dislikes: (m.dislikes ?? 0) + 1 } : m));
  };

  const handleRebuttal = useCallback(async (expertId: string, expertContent: string, userRebuttal: string) => {
    if (isDiscussing) return;
    const expert = [...experts, SUMMARIZER_EXPERT, CONCLUSION_EXPERT].find(e => e.id === expertId);
    if (!expert) return;

    setIsDiscussing(true);
    setActiveExpertId(expert.id);

    const userMsgId = `user-rebuttal-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: userMsgId, expertId: '__user__',
      content: `💬 **사용자 반박** → ${expert.nameKo}: ${userRebuttal}`,
    }]);

    const replyId = `rebuttal-reply-${Date.now()}`;
    setMessages(prev => [...prev, { id: replyId, expertId: expert.id, content: '', isStreaming: true }]);

    const allResponses = messages
      .filter(m => m.expertId !== '__round__' && m.expertId !== '__user__' && m.content)
      .map(m => {
        const e = [...experts, SUMMARIZER_EXPERT, CONCLUSION_EXPERT].find(ex => ex.id === m.expertId);
        return { name: e?.nameKo || '', content: m.content };
      });
    allResponses.push({ name: '사용자', content: userRebuttal });

    let fullContent = '';
    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      await streamExpert({
        question: currentQuestion,
        expert: { ...expert, systemPrompt: expert.systemPrompt + '\n\n사용자가 당신의 의견에 반박했습니다. 사용자의 반박에 대해 정중하지만 논리적으로 응답해주세요. 동의할 부분은 인정하고, 반대할 부분은 근거를 들어 설명해주세요. 2문단 이내로 답변해주세요.' },
        previousResponses: allResponses, round: 'rebuttal',
        onDelta: (chunk) => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === replyId ? { ...m, content: fullContent } : m)); },
        onDone: () => { setMessages(prev => prev.map(m => m.id === replyId ? { ...m, isStreaming: false } : m)); },
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
        setMessages(prev => prev.map(m => m.id === replyId ? { ...m, content: fullContent, isStreaming: false } : m));
      }
    }
    setActiveExpertId(undefined);
    setIsDiscussing(false);
  }, [experts, messages, currentQuestion, isDiscussing]);

  const activeExperts = experts.filter(e => selectedExpertIds.includes(e.id));

  const stopDiscussion = () => {
    setStopRequested(true);
    abortControllerRef.current?.abort();
  };

  const startDiscussion = useCallback(async (question: string) => {
    const discussionExperts = experts.filter(e => selectedExpertIds.includes(e.id));
    if (discussionExperts.length < 1) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStopRequested(false);
    setIsDiscussing(true);
    setCurrentQuestion(question);
    setMessages([]);
    const allResponses: { name: string; content: string }[] = [];
    const shouldStop = () => controller.signal.aborted;

    if (discussionMode === 'general') {
      // General mode: each AI answers independently, no debate
      for (const expert of discussionExperts) {
        if (shouldStop()) break;
        setActiveExpertId(expert.id);
        const msgId = `${expert.id}-general-${Date.now()}`;
        setMessages(prev => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true }]);
        let fullContent = '';
        try {
          await streamExpert({
            question, expert,
            previousResponses: [], round: 'initial',
            onDelta: (chunk) => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
            onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m)); },
            signal: controller.signal,
          });
        } catch (err) {
          if ((err as Error).name === 'AbortError') break;
          fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
        }
        await new Promise(r => setTimeout(r, 300));
      }
      setActiveExpertId(undefined);
      setIsDiscussing(false);
      setStopRequested(false);
      saveDiscussionToHistory({ question, expertIds: selectedExpertIds, mode: discussionMode, messages: [] });
      return;
    } else if (discussionMode === 'conclusion') {
      // 빠른 토론: 전문가들이 1문단씩 의견 → AI가 종합하여 최종 답변
      setMessages(prev => [...prev, { id: `round-sep-conclusion-${Date.now()}`, expertId: '__round__', content: '⚡ 빠른 의견 수집', round: 'initial' }]);
      const shuffled = [...discussionExperts].sort(() => Math.random() - 0.5);
      for (const expert of shuffled) {
        if (shouldStop()) break;
        setActiveExpertId(expert.id);
        const msgId = `${expert.id}-conclusion-${Date.now()}`;
        setMessages(prev => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, round: 'initial' }]);
        let fullContent = '';
        try {
          await streamExpert({
            question,
            expert: { ...expert, systemPrompt: expert.systemPrompt + '\n\n빠른 토론 모드입니다. 핵심만 1문단(3-4문장)으로 간결하게 답변해주세요.' },
            previousResponses: allResponses, round: 'initial',
            onDelta: (chunk) => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
            onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m)); },
            signal: controller.signal,
          });
        } catch (err) {
          if ((err as Error).name === 'AbortError') break;
          fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
        }
        allResponses.push({ name: expert.nameKo, content: fullContent });
        await new Promise(r => setTimeout(r, 300));
      }

      // 빠른 토론은 요약 건너뛰고 바로 AI 종합 답변
      if (!shouldStop()) {
        setActiveExpertId(CONCLUSION_EXPERT.id);
        const conclusionId = `fast-conclusion-${Date.now()}`;
        setMessages(prev => [...prev, { id: conclusionId, expertId: CONCLUSION_EXPERT.id, content: '', isStreaming: true, isSummary: true }]);
        let conclusionContent = '';
        try {
          await streamExpert({
            question,
            expert: { ...CONCLUSION_EXPERT, systemPrompt: `You are an AI synthesizer. Multiple experts have shared brief opinions on the user's question. Review all their perspectives carefully, then provide a comprehensive, definitive answer to the original question in Korean. Do NOT just summarize—actually ANSWER the question by integrating the experts' insights. Be thorough but concise (2-3 paragraphs). Do NOT mention expert names.` },
            previousResponses: allResponses, round: 'summary',
            onDelta: (chunk) => { conclusionContent += chunk; setMessages(prev => prev.map(m => m.id === conclusionId ? { ...m, content: conclusionContent } : m)); },
            onDone: () => { setMessages(prev => prev.map(m => m.id === conclusionId ? { ...m, isStreaming: false } : m)); },
            signal: controller.signal,
          });
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            conclusionContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
            setMessages(prev => prev.map(m => m.id === conclusionId ? { ...m, content: conclusionContent, isStreaming: false } : m));
          }
        }
      }

      // 빠른 토론은 여기서 바로 종료 (아래 공통 요약/결론 스킵)
      setActiveExpertId(undefined);
      setIsDiscussing(false);
      setStopRequested(false);

      saveDiscussionToHistory({
        question,
        expertIds: selectedExpertIds,
        mode: discussionMode,
        messages: [],
      });
      return;
    } else if (discussionMode === 'standard') {
      const rounds: DiscussionRound[] = ['initial', 'rebuttal', 'final'];
      for (const round of rounds) {
        if (shouldStop()) break;
        const roundExperts = [...discussionExperts].sort(() => Math.random() - 0.5);
        setMessages(prev => [...prev, { id: `round-sep-${round}-${Date.now()}`, expertId: '__round__', content: ROUND_LABELS[round], round }]);
        for (const expert of roundExperts) {
          if (shouldStop()) break;
          setActiveExpertId(expert.id);
          const msgId = `${expert.id}-${round}-${Date.now()}`;
          setMessages(prev => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, round }]);
          let fullContent = '';
          try {
            await streamExpert({ question, expert, previousResponses: allResponses, round,
              onDelta: (chunk) => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
              onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m)); },
              signal: controller.signal });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
          }
          allResponses.push({ name: `${expert.nameKo} (${ROUND_LABELS[round]})`, content: fullContent });
          await new Promise(r => setTimeout(r, 500));
        }
      }
    } else if (discussionMode === 'procon') {
      const half = Math.ceil(discussionExperts.length / 2);
      const proExperts = discussionExperts.slice(0, half);
      const conExperts = discussionExperts.slice(half);
      const rounds = [
        { label: '1라운드 · 찬성 입장', round: 'initial' as DiscussionRound, side: 'pro' },
        { label: '1라운드 · 반대 입장', round: 'initial' as DiscussionRound, side: 'con' },
        { label: '2라운드 · 찬성 반론', round: 'rebuttal' as DiscussionRound, side: 'pro' },
        { label: '2라운드 · 반대 반론', round: 'rebuttal' as DiscussionRound, side: 'con' },
        { label: '3라운드 · 최종 입장', round: 'final' as DiscussionRound, side: 'all' },
      ];
      for (const { label, round, side } of rounds) {
        if (shouldStop()) break;
        const sideExperts = side === 'pro' ? proExperts : side === 'con' ? conExperts : discussionExperts;
        setMessages(prev => [...prev, { id: `round-sep-${label}-${Date.now()}`, expertId: '__round__', content: label, round }]);
        for (const expert of sideExperts) {
          if (shouldStop()) break;
          setActiveExpertId(expert.id);
          const sideLabel = proExperts.includes(expert) ? '찬성' : '반대';
          const extra = round !== 'final'
            ? `\n\n당신은 "${sideLabel}" 측입니다. ${sideLabel === '찬성' ? '찬성하는 입장에서' : '반대하는 입장에서'} 주장해주세요.`
            : '\n\n최종 라운드입니다. 최종 입장을 정리해주세요.';
          const msgId = `${expert.id}-${round}-${side}-${Date.now()}`;
          setMessages(prev => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, round }]);
          let fullContent = '';
          try {
            await streamExpert({ question, expert: { ...expert, systemPrompt: expert.systemPrompt + extra }, previousResponses: allResponses, round,
              onDelta: (chunk) => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
              onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m)); },
              signal: controller.signal });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
          }
          allResponses.push({ name: `${expert.nameKo} (${sideLabel}, ${label})`, content: fullContent });
          await new Promise(r => setTimeout(r, 500));
        }
      }
    } else if (discussionMode === 'freeform') {
      setMessages(prev => [...prev, { id: `round-sep-free-${Date.now()}`, expertId: '__round__', content: '💬 자유 대화', round: 'initial' }]);
      const shuffled = [...discussionExperts].sort(() => Math.random() - 0.5);
      for (const expert of shuffled) {
        if (shouldStop()) break;
        setActiveExpertId(expert.id);
        const msgId = `${expert.id}-free-${Date.now()}`;
        setMessages(prev => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, round: 'initial' }]);
        let fullContent = '';
        try {
          await streamExpert({ question, expert: { ...expert, systemPrompt: expert.systemPrompt + '\n\n자유로운 대화입니다. 편하게 1-2문단으로 답변해주세요.' }, previousResponses: allResponses, round: 'initial',
            onDelta: (chunk) => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
            onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m)); },
            signal: controller.signal });
        } catch (err) {
          if ((err as Error).name === 'AbortError') break;
          fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
        }
        allResponses.push({ name: expert.nameKo, content: fullContent });
        await new Promise(r => setTimeout(r, 500));
      }
    } else if (discussionMode === 'endless') {
      const maxRounds = 5;
      for (let r = 1; r <= maxRounds; r++) {
        if (shouldStop()) break;
        const round: DiscussionRound = r === 1 ? 'initial' : r === maxRounds ? 'final' : 'rebuttal';
        setMessages(prev => [...prev, { id: `round-sep-${r}-${Date.now()}`, expertId: '__round__', content: `🔥 ${r}라운드`, round }]);
        const shuffled = [...discussionExperts].sort(() => Math.random() - 0.5);
        for (const expert of shuffled) {
          if (shouldStop()) break;
          setActiveExpertId(expert.id);
          const extra = r === 1 ? '\n\n끝장 토론입니다. 강한 입장을 취해주세요.' : `\n\n끝장 토론 ${r}라운드입니다. 합의점을 찾거나 강하게 주장해주세요.`;
          const msgId = `${expert.id}-endless-${r}-${Date.now()}`;
          setMessages(prev => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, round }]);
          let fullContent = '';
          try {
            await streamExpert({ question, expert: { ...expert, systemPrompt: expert.systemPrompt + extra }, previousResponses: allResponses, round,
              onDelta: (chunk) => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
              onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m)); },
              signal: controller.signal });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
          }
          allResponses.push({ name: `${expert.nameKo} (${r}라운드)`, content: fullContent });
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    if (!shouldStop()) {
      // Summary
      setActiveExpertId(SUMMARIZER_EXPERT.id);
      const summaryId = `summary-${Date.now()}`;
      setMessages(prev => [...prev, { id: summaryId, expertId: SUMMARIZER_EXPERT.id, content: '', isStreaming: true, isSummary: true }]);
      let summaryContent = '';
      try {
        await streamExpert({
          question, expert: { ...SUMMARIZER_EXPERT, systemPrompt: `You are a debate summarizer. Organize the discussion into a clear Korean summary:\n1. 📌 핵심 합의점\n2. ⚔️ 주요 논쟁점\n3. 🔄 입장 변화\nReference specific experts by name. Do NOT provide your own conclusion.` },
          previousResponses: allResponses, round: 'summary',
          onDelta: (chunk) => { summaryContent += chunk; setMessages(prev => prev.map(m => m.id === summaryId ? { ...m, content: summaryContent } : m)); },
          onDone: () => { setMessages(prev => prev.map(m => m.id === summaryId ? { ...m, isStreaming: false } : m)); },
          signal: controller.signal });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          summaryContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
          setMessages(prev => prev.map(m => m.id === summaryId ? { ...m, content: summaryContent, isStreaming: false } : m));
        }
      }

      if (!controller.signal.aborted) {
        setActiveExpertId(CONCLUSION_EXPERT.id);
        const conclusionId = `conclusion-${Date.now()}`;
        setMessages(prev => [...prev, { id: conclusionId, expertId: CONCLUSION_EXPERT.id, content: '', isStreaming: true, isSummary: true }]);
        let conclusionContent = '';
        try {
          await streamExpert({
            question, expert: { ...CONCLUSION_EXPERT, systemPrompt: `You are a final conclusion synthesizer. Provide a definitive conclusion in Korean. Do NOT mention any expert by name. Synthesize into ONE unified answer. Be concise, 2-3 paragraphs.` },
            previousResponses: allResponses, round: 'summary',
            onDelta: (chunk) => { conclusionContent += chunk; setMessages(prev => prev.map(m => m.id === conclusionId ? { ...m, content: conclusionContent } : m)); },
            onDone: () => { setMessages(prev => prev.map(m => m.id === conclusionId ? { ...m, isStreaming: false } : m)); },
            signal: controller.signal });
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            conclusionContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
            setMessages(prev => prev.map(m => m.id === conclusionId ? { ...m, content: conclusionContent, isStreaming: false } : m));
          }
        }
      }
    }

    setActiveExpertId(undefined);
    setIsDiscussing(false);
    setStopRequested(false);
  }, [experts, selectedExpertIds, discussionMode]);

  // Save to history when discussion completes
  useEffect(() => {
    if (!isDiscussing && messages.length > 0 && currentQuestion) {
      saveDiscussionToHistory({
        question: currentQuestion, mode: discussionMode,
        messages: messages.map(m => ({ ...m, isStreaming: false })),
        expertIds: selectedExpertIds,
      });
    }
  }, [isDiscussing]);

  const loadHistory = useCallback((record: DiscussionRecord) => {
    setCurrentQuestion(record.question);
    setMessages(record.messages);
    setDiscussionMode(record.mode);
    setIsDiscussing(false);
    setActiveExpertId(undefined);
  }, []);

  const allExperts = [...experts, SUMMARIZER_EXPERT, CONCLUSION_EXPERT];
  const isDone = messages.length > 0 && !isDiscussing;
  const selectable = !isDiscussing && messages.length === 0;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          experts={experts}
          onLoadHistory={loadHistory}
          onUpdateExperts={setExperts}
          discussionMode={discussionMode}
          onModeChange={setDiscussionMode}
          isDiscussing={isDiscussing}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="border-b border-border px-4 sm:px-6 py-3 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--gradient-primary)' }}>
                <MessageSquare className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-base font-bold text-foreground tracking-tight">AI 전문가 토론</h1>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" /> {activeExperts.length}명 참여 · <Zap className="w-3 h-3" /> 실시간
                </p>
              </div>
              {/* Selected/Active experts - always visible */}
              <div className="hidden sm:flex items-center gap-1">
                {activeExperts.slice(0, 6).map(expert => (
                  <ExpertAvatar key={expert.id} expert={expert} size="sm" active={activeExpertId === expert.id} />
                ))}
                {activeExperts.length > 6 && (
                  <span className="text-[10px] text-muted-foreground ml-1">+{activeExperts.length - 6}</span>
                )}
              </div>
            </div>
          </header>

          {/* Main Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scrollbar-thin">
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Expert Selection - shown in center when selectable */}
              {selectable && (
                <ExpertSelectionPanel
                  experts={experts}
                  selectedIds={selectedExpertIds}
                  onToggle={toggleExpert}
                  discussionMode={discussionMode}
                  onModeChange={setDiscussionMode}
                  isDiscussing={isDiscussing}
                />
              )}

              {/* Question display */}
              {currentQuestion && messages.length > 0 && (
                <div className="rounded-xl p-4 border border-border flex items-start justify-between gap-3" style={{ background: 'var(--gradient-subtle)' }}>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">Question</span>
                    <p className="text-foreground font-medium mt-0.5">{currentQuestion}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isDiscussing && (
                      <Button variant="destructive" size="sm" onClick={stopDiscussion} className="text-xs gap-1">
                        <Square className="w-3 h-3" /> 중단
                      </Button>
                    )}
                    {isDone && (
                      <Button variant="ghost" size="sm" onClick={copyAllResults} className="text-xs gap-1 text-muted-foreground">
                        {copiedAll ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedAll ? '복사됨' : '전체 복사'}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map(msg => {
                if (msg.expertId === '__round__') {
                  return (
                    <div key={msg.id} className="flex items-center gap-3 py-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs font-display font-semibold text-muted-foreground px-3 py-1 rounded-full bg-muted">
                        {msg.content}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  );
                }
                if (msg.expertId === '__user__') {
                  return (
                    <div key={msg.id} className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm text-foreground/80">
                      <ReactMarkdownInline content={msg.content} />
                    </div>
                  );
                }
                const expert = allExperts.find(e => e.id === msg.expertId);
                if (!expert) return null;
                return (
                  <DiscussionMessageCard
                    key={msg.id} message={msg} expert={expert}
                    onLike={handleLike} onDislike={handleDislike}
                    onRebuttal={isDone ? handleRebuttal : undefined}
                  />
                );
              })}

              {isDone && (
                <div className="text-center pt-6 pb-2">
                  <p className="text-xs text-muted-foreground">토론이 완료되었습니다. 새로운 질문을 입력하거나 발언에 반박해보세요.</p>
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-border px-4 sm:px-6 py-3 bg-card/80 backdrop-blur-sm">
            <div className="max-w-3xl mx-auto space-y-2">
              {/* Selected expert chips */}
              {activeExperts.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground font-medium shrink-0">참여 전문가:</span>
                  {activeExperts.map(expert => (
                    <button
                      key={expert.id}
                      onClick={() => !isDiscussing && messages.length === 0 && toggleExpert(expert.id)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all',
                        activeExpertId === expert.id
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-secondary border-border text-foreground/70 hover:bg-muted',
                        isDiscussing || messages.length > 0 ? 'cursor-default' : 'cursor-pointer'
                      )}
                    >
                      <ExpertAvatar expert={expert} size="sm" active={activeExpertId === expert.id} />
                      <span className="hidden sm:inline">{expert.nameKo}</span>
                    </button>
                  ))}
                </div>
              )}
              <QuestionInput onSubmit={startDiscussion} disabled={isDiscussing || activeExperts.length < 2} />
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

function ReactMarkdownInline({ content }: { content: string }) {
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return (
    <p>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </p>
  );
}

export default Index;
