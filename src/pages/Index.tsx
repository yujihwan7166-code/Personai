import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { DEFAULT_EXPERTS, SUMMARIZER_EXPERT, CONCLUSION_EXPERT, DiscussionMessage, DiscussionRound, DiscussionMode, Expert, ROUND_LABELS, getMainMode } from '@/types/expert';
import { QuestionInput } from '@/components/QuestionInput';
import { DiscussionMessageCard } from '@/components/DiscussionMessage';
import { AppSidebar } from '@/components/AppSidebar';
import { ExpertSelectionPanel } from '@/components/ExpertSelectionPanel';
import { ExpertAvatar } from '@/components/ExpertAvatar';
import { saveDiscussionToHistory, DiscussionRecord } from '@/components/DiscussionHistory';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, Zap, Users, Copy, Check, Square, LogOut, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/expert-discuss`;

async function streamExpert({
  question, expert, previousResponses, round, onDelta, onDone, signal






}: {question: string;expert: Expert;previousResponses: {name: string;content: string;}[];round: DiscussionRound | 'summary';onDelta: (text: string) => void;onDone: () => void;signal?: AbortSignal;}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
    },
    body: JSON.stringify({ question, expertSystemPrompt: expert.systemPrompt, previousResponses, round }),
    signal
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
      if (jsonStr === '[DONE]') {streamDone = true;break;}
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
  const { user, signOut } = useAuth();
  const [experts, setExperts] = useState<Expert[]>(() => {
    try {
      const saved = localStorage.getItem('ai-debate-experts-v5');
      if (saved) {
        const parsed = JSON.parse(saved) as Expert[];
        // Merge: keep saved customizations but add any new default experts
        const savedIds = new Set(parsed.map((e) => e.id));
        const newExperts = DEFAULT_EXPERTS.filter((e) => !savedIds.has(e.id));
        return [...parsed.map((e) => ({ ...e, category: e.category || 'ai' })), ...newExperts];
      }
      return DEFAULT_EXPERTS;
    } catch {return DEFAULT_EXPERTS;}
  });
  const [selectedExpertIds, setSelectedExpertIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ai-debate-selected-v5');
      return saved ? JSON.parse(saved) : ['gpt'];
    } catch {return ['gpt'];}
  });
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [activeExpertId, setActiveExpertId] = useState<string | undefined>();
  const [isDiscussing, setIsDiscussing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [discussionMode, setDiscussionMode] = useState<DiscussionMode>('standard');
  const [stopRequested, setStopRequested] = useState(false);
  const [collapsedRounds, setCollapsedRounds] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('ai-debate-experts-v5', JSON.stringify(experts));
  }, [experts]);

  useEffect(() => {
    setSelectedExpertIds((prev) => prev.filter((id) => experts.some((e) => e.id === id)));
  }, [experts]);

  useEffect(() => {
    localStorage.setItem('ai-debate-selected-v5', JSON.stringify(selectedExpertIds));
  }, [selectedExpertIds]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const toggleExpert = (id: string) => {
    setSelectedExpertIds((prev) => {
      // General mode: single select only
      if (getMainMode(discussionMode) === 'general') {
        return [id];
      }
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const handleModeChange = (mode: DiscussionMode) => {
    setDiscussionMode(mode);
    const main = getMainMode(mode);
    if (main === 'general') {
      setSelectedExpertIds((prev) => {
        const aiOnly = prev.filter((id) => {
          const expert = experts.find((e) => e.id === id);
          return expert?.category === 'ai';
        });
        return aiOnly.length > 0 ? [aiOnly[0]] : ['gpt'];
      });
    }
  };

  const copyAllResults = () => {
    const text = messages.filter((m) => m.expertId !== '__round__').map((msg) => {
      const expert = [...experts, SUMMARIZER_EXPERT, CONCLUSION_EXPERT].find((e) => e.id === msg.expertId);
      return `[${expert?.nameKo || ''}]\n${msg.content}`;
    }).join('\n\n---\n\n');
    navigator.clipboard.writeText(`질문: ${currentQuestion}\n\n${text}`);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleLike = (messageId: string) => {
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, likes: (m.likes ?? 0) + 1 } : m));
  };

  const handleDislike = (messageId: string) => {
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, dislikes: (m.dislikes ?? 0) + 1 } : m));
  };

  const handleRebuttal = useCallback(async (expertId: string, expertContent: string, userRebuttal: string) => {
    if (isDiscussing) return;
    const expert = [...experts, SUMMARIZER_EXPERT, CONCLUSION_EXPERT].find((e) => e.id === expertId);
    if (!expert) return;

    setIsDiscussing(true);
    setActiveExpertId(expert.id);

    const userMsgId = `user-rebuttal-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: userMsgId, expertId: '__user__',
      content: `💬 **사용자 반박** → ${expert.nameKo}: ${userRebuttal}`
    }]);

    const replyId = `rebuttal-reply-${Date.now()}`;
    setMessages((prev) => [...prev, { id: replyId, expertId: expert.id, content: '', isStreaming: true }]);

    const allResponses = messages.
    filter((m) => m.expertId !== '__round__' && m.expertId !== '__user__' && m.content).
    map((m) => {
      const e = [...experts, SUMMARIZER_EXPERT, CONCLUSION_EXPERT].find((ex) => ex.id === m.expertId);
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
        onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === replyId ? { ...m, content: fullContent } : m));},
        onDone: () => {setMessages((prev) => prev.map((m) => m.id === replyId ? { ...m, isStreaming: false } : m));},
        signal: controller.signal
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
        setMessages((prev) => prev.map((m) => m.id === replyId ? { ...m, content: fullContent, isStreaming: false } : m));
      }
    }
    setActiveExpertId(undefined);
    setIsDiscussing(false);
  }, [experts, messages, currentQuestion, isDiscussing]);

  const activeExperts = experts.filter((e) => selectedExpertIds.includes(e.id));

  const stopDiscussion = () => {
    setStopRequested(true);
    abortControllerRef.current?.abort();
  };

  const handleNewDiscussion = () => {
    setMessages([]);
    setCurrentQuestion('');
    setIsDiscussing(false);
    setActiveExpertId(undefined);
  };

  const handleSuggestedQuestion = (question: string, expertIds: string[], mode: DiscussionMode) => {
    setSelectedExpertIds(expertIds);
    setDiscussionMode(mode);
    startDiscussion(question, expertIds, mode);
  };

  const startDiscussion = useCallback(async (question: string, overrideExpertIds?: string[], overrideMode?: DiscussionMode) => {
    const useIds = overrideExpertIds || selectedExpertIds;
    const useMode = overrideMode || discussionMode;
    const discussionExperts = experts.filter((e) => useIds.includes(e.id));
    if (discussionExperts.length < 1) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStopRequested(false);
    setIsDiscussing(true);
    setCurrentQuestion(question);
    setMessages([]);
    const allResponses: {name: string;content: string;}[] = [];
    const shouldStop = () => controller.signal.aborted;

    if (useMode === 'general') {
      for (const expert of discussionExperts) {
        if (shouldStop()) break;
        setActiveExpertId(expert.id);
        const msgId = `${expert.id}-general-${Date.now()}`;
        setMessages((prev) => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true }]);
        let fullContent = '';
        try {
          await streamExpert({
            question, expert,
            previousResponses: [], round: 'initial',
            onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m));},
            onDone: () => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m));},
            signal: controller.signal
          });
        } catch (err) {
          if ((err as Error).name === 'AbortError') break;
          fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
          setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      setActiveExpertId(undefined);
      setIsDiscussing(false);
      setStopRequested(false);
      saveDiscussionToHistory({ question, expertIds: useIds, mode: useMode, messages: [] });
      return;
    } else if (useMode === 'multi') {
      setMessages((prev) => [...prev, { id: `round-sep-multi-${Date.now()}`, expertId: '__round__', content: '🔀 다중 AI 의견 수집', round: 'initial' }]);
      const shuffled = [...discussionExperts].sort(() => Math.random() - 0.5);
      for (const expert of shuffled) {
        if (shouldStop()) break;
        setActiveExpertId(expert.id);
        const msgId = `${expert.id}-conclusion-${Date.now()}`;
        setMessages((prev) => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, round: 'initial' }]);
        let fullContent = '';
        try {
          await streamExpert({
            question,
            expert: { ...expert, systemPrompt: expert.systemPrompt + '\n\n빠른 토론 모드입니다. 핵심만 1문단(3-4문장)으로 간결하게 답변해주세요.' },
            previousResponses: allResponses, round: 'initial',
            onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m));},
            onDone: () => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m));},
            signal: controller.signal
          });
        } catch (err) {
          if ((err as Error).name === 'AbortError') break;
          fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
          setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
        }
        allResponses.push({ name: expert.nameKo, content: fullContent });
        await new Promise((r) => setTimeout(r, 300));
      }

      if (!shouldStop()) {
        setActiveExpertId(CONCLUSION_EXPERT.id);
        const conclusionId = `fast-conclusion-${Date.now()}`;
        setMessages((prev) => [...prev, { id: conclusionId, expertId: CONCLUSION_EXPERT.id, content: '', isStreaming: true, isSummary: true }]);
        let conclusionContent = '';
        try {
          await streamExpert({
            question,
            expert: { ...CONCLUSION_EXPERT, systemPrompt: `You are an AI synthesizer. Multiple experts have shared brief opinions on the user's question. Provide a well-organized conclusion in Korean using this markdown format:

## 🎯 종합 결론

### 핵심 답변
(2-3 sentences directly answering the original question)

### 주요 근거
1. **(근거 1 제목)** — 설명
2. **(근거 2 제목)** — 설명

### 실행 제안
- (actionable recommendation 1)
- (actionable recommendation 2)

> 💡 **한 줄 요약:** (one-sentence takeaway)

Do NOT mention expert names. Actually ANSWER the question by integrating all insights into ONE unified answer.` },
            previousResponses: allResponses, round: 'summary',
            onDelta: (chunk) => {conclusionContent += chunk;setMessages((prev) => prev.map((m) => m.id === conclusionId ? { ...m, content: conclusionContent } : m));},
            onDone: () => {setMessages((prev) => prev.map((m) => m.id === conclusionId ? { ...m, isStreaming: false } : m));},
            signal: controller.signal
          });
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            conclusionContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
            setMessages((prev) => prev.map((m) => m.id === conclusionId ? { ...m, content: conclusionContent, isStreaming: false } : m));
          }
        }
      }

      setActiveExpertId(undefined);
      setIsDiscussing(false);
      setStopRequested(false);
      saveDiscussionToHistory({ question, expertIds: useIds, mode: useMode, messages: [] });
      return;
    } else if (useMode === 'standard') {
      const rounds: DiscussionRound[] = ['initial', 'rebuttal', 'final'];
      for (const round of rounds) {
        if (shouldStop()) break;
        const roundExperts = [...discussionExperts].sort(() => Math.random() - 0.5);
        setMessages((prev) => [...prev, { id: `round-sep-${round}-${Date.now()}`, expertId: '__round__', content: ROUND_LABELS[round], round }]);
        for (const expert of roundExperts) {
          if (shouldStop()) break;
          setActiveExpertId(expert.id);
          const msgId = `${expert.id}-${round}-${Date.now()}`;
          setMessages((prev) => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, round }]);
          let fullContent = '';
          try {
            await streamExpert({ question, expert, previousResponses: allResponses, round,
              onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m));},
              onDone: () => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m));},
              signal: controller.signal });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
            setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
          }
          allResponses.push({ name: `${expert.nameKo} (${ROUND_LABELS[round]})`, content: fullContent });
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    } else if (useMode === 'procon') {
      // Phase 0: AI analyzes the topic and assigns stances based on expert perspectives
      setMessages((prev) => [...prev, { id: `round-sep-stance-${Date.now()}`, expertId: '__round__', content: '🤔 주제 분석 · AI가 전문가별 입장을 배정합니다', round: 'initial' }]);

      const STANCE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/procon-stance`;
      let stanceMap: Record<string, 'pro' | 'con'> = {};

      // Show a loading message from the summarizer
      const analysisId = `stance-analysis-${Date.now()}`;
      setMessages((prev) => [...prev, { id: analysisId, expertId: SUMMARIZER_EXPERT.id, content: '', isStreaming: true, round: 'initial' }]);
      setActiveExpertId(SUMMARIZER_EXPERT.id);

      try {
        const stanceResp = await fetch(STANCE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({
            question,
            experts: discussionExperts.map((e) => ({ id: e.id, nameKo: e.nameKo, description: e.description }))
          }),
          signal: controller.signal
        });

        if (!stanceResp.ok) {
          const errorData = await stanceResp.json().catch(() => ({}));
          throw new Error(errorData.error || '입장 배정 실패');
        }

        const stanceResult = await stanceResp.json();

        // Build stance map from AI assignments
        for (const assignment of stanceResult.assignments || []) {
          if (discussionExperts.some((e) => e.id === assignment.expertId)) {
            stanceMap[assignment.expertId] = assignment.stance;
          }
        }

        // Ensure all experts have a stance
        for (const expert of discussionExperts) {
          if (!stanceMap[expert.id]) {
            const proCount = Object.values(stanceMap).filter((s) => s === 'pro').length;
            const conCount = Object.values(stanceMap).filter((s) => s === 'con').length;
            stanceMap[expert.id] = proCount <= conCount ? 'pro' : 'con';
          }
        }

        // Build the analysis message content
        const proNames = discussionExperts.filter((e) => stanceMap[e.id] === 'pro').map((e) => e.nameKo);
        const conNames = discussionExperts.filter((e) => stanceMap[e.id] === 'con').map((e) => e.nameKo);
        const reasonLines = (stanceResult.assignments || []).
        filter((a: any) => discussionExperts.some((e) => e.id === a.expertId)).
        map((a: any) => {
          const expert = discussionExperts.find((e) => e.id === a.expertId);
          const side = a.stance === 'pro' ? '찬성' : '반대';
          return `- **${expert?.nameKo}** (${side}): ${a.reason}`;
        }).join('\n');

        const analysisContent = `## ⚔️ 찬반 배정 결과\n\n${stanceResult.analysis || ''}\n\n### 👍 찬성 팀\n${proNames.join(', ')}\n\n### 👎 반대 팀\n${conNames.join(', ')}\n\n### 배정 이유\n${reasonLines}`;

        setMessages((prev) => prev.map((m) => m.id === analysisId ? { ...m, content: analysisContent, isStreaming: false } : m));
        allResponses.push({ name: '사회자 (입장 배정)', content: analysisContent });

      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setMessages((prev) => prev.map((m) => m.id === analysisId ? { ...m, content: '⚠️ 중단됨', isStreaming: false } : m));
          setActiveExpertId(undefined);
          setIsDiscussing(false);
          setStopRequested(false);
          return;
        }
        // Fallback: split evenly
        const half = Math.ceil(discussionExperts.length / 2);
        discussionExperts.forEach((e, i) => {stanceMap[e.id] = i < half ? 'pro' : 'con';});
        const fallbackContent = `⚠️ AI 배정 실패, 순서대로 배정합니다.\n\n👍 찬성: ${discussionExperts.filter((e) => stanceMap[e.id] === 'pro').map((e) => e.nameKo).join(', ')}\n👎 반대: ${discussionExperts.filter((e) => stanceMap[e.id] === 'con').map((e) => e.nameKo).join(', ')}`;
        setMessages((prev) => prev.map((m) => m.id === analysisId ? { ...m, content: fallbackContent, isStreaming: false } : m));
      }

      await new Promise((r) => setTimeout(r, 500));

      const proExperts = discussionExperts.filter((e) => stanceMap[e.id] === 'pro');
      const conExperts = discussionExperts.filter((e) => stanceMap[e.id] === 'con');

      // Ensure at least one on each side
      if (proExperts.length === 0 && conExperts.length > 1) {
        const moved = conExperts.pop()!;
        proExperts.push(moved);
        stanceMap[moved.id] = 'pro';
      } else if (conExperts.length === 0 && proExperts.length > 1) {
        const moved = proExperts.pop()!;
        conExperts.push(moved);
        stanceMap[moved.id] = 'con';
      }

      // Phase 1-3: Actual debate rounds
      const rounds = [
      { label: '1라운드 · 찬성 주장', round: 'initial' as DiscussionRound, experts: proExperts, side: 'pro' as const },
      { label: '1라운드 · 반대 주장', round: 'initial' as DiscussionRound, experts: conExperts, side: 'con' as const },
      { label: '2라운드 · 찬성 반론', round: 'rebuttal' as DiscussionRound, experts: proExperts, side: 'pro' as const },
      { label: '2라운드 · 반대 반론', round: 'rebuttal' as DiscussionRound, experts: conExperts, side: 'con' as const },
      { label: '3라운드 · 최종 입장', round: 'final' as DiscussionRound, experts: discussionExperts, side: 'all' as const }];

      for (const { label, round, experts: sideExperts, side } of rounds) {
        if (shouldStop()) break;
        setMessages((prev) => [...prev, { id: `round-sep-${label}-${Date.now()}`, expertId: '__round__', content: label, round }]);
        for (const expert of sideExperts) {
          if (shouldStop()) break;
          setActiveExpertId(expert.id);
          const sideLabel = stanceMap[expert.id] === 'pro' ? '찬성' : '반대';
          const extra = round !== 'final' ?
          `\n\n당신은 이 주제에 대해 스스로 "${sideLabel}" 입장을 선택했습니다. ${sideLabel === '찬성' ? '찬성하는 입장에서' : '반대하는 입장에서'} 강하게 주장해주세요.` :
          `\n\n최종 라운드입니다. 당신은 "${sideLabel}" 입장이었습니다. 토론을 통해 입장이 변했다면 그 이유를 설명하고, 최종 입장을 정리해주세요.`;
          const msgId = `${expert.id}-${round}-${side}-${Date.now()}`;
          setMessages((prev) => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, round }]);
          let fullContent = '';
          try {
            await streamExpert({ question, expert: { ...expert, systemPrompt: expert.systemPrompt + extra }, previousResponses: allResponses, round,
              onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m));},
              onDone: () => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m));},
              signal: controller.signal });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
            setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
          }
          allResponses.push({ name: `${expert.nameKo} (${sideLabel}, ${label})`, content: fullContent });
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    } else if (useMode === 'creative') {
      // Creative debate: 3 rounds with brainstorming focus
      const rounds: DiscussionRound[] = ['initial', 'rebuttal', 'final'];
      const roundLabels = ['🎨 1라운드 · 아이디어 제시', '🔄 2라운드 · 아이디어 발전', '✨ 3라운드 · 최종 창의적 제안'];
      for (let ri = 0; ri < rounds.length; ri++) {
        if (shouldStop()) break;
        const round = rounds[ri];
        const roundExperts = [...discussionExperts].sort(() => Math.random() - 0.5);
        setMessages((prev) => [...prev, { id: `round-sep-creative-${ri}-${Date.now()}`, expertId: '__round__', content: roundLabels[ri], round }]);
        for (const expert of roundExperts) {
          if (shouldStop()) break;
          setActiveExpertId(expert.id);
          const extras = [
          '\n\n창의적 토론입니다. 기존의 틀을 깨는 독창적이고 파격적인 아이디어를 자유롭게 제시해주세요. 실현 가능성보다 창의성을 우선하세요.',
          '\n\n2라운드입니다. 다른 참여자들의 아이디어를 조합하거나 발전시켜 더 혁신적인 제안을 만들어주세요. "만약 ~라면?" 식의 사고실험도 좋습니다.',
          '\n\n마지막 라운드입니다. 지금까지 나온 아이디어 중 가장 흥미로운 것을 선택하여 구체화하거나, 완전히 새로운 통합 아이디어를 제안해주세요.'];

          const msgId = `${expert.id}-creative-${ri}-${Date.now()}`;
          setMessages((prev) => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, round }]);
          let fullContent = '';
          try {
            await streamExpert({ question, expert: { ...expert, systemPrompt: expert.systemPrompt + extras[ri] }, previousResponses: allResponses, round,
              onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m));},
              onDone: () => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m));},
              signal: controller.signal });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
            setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
          }
          allResponses.push({ name: `${expert.nameKo} (${roundLabels[ri]})`, content: fullContent });
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    } else if (useMode === 'endless') {
      const maxRounds = 5;
      for (let r = 1; r <= maxRounds; r++) {
        if (shouldStop()) break;
        const round: DiscussionRound = r === 1 ? 'initial' : r === maxRounds ? 'final' : 'rebuttal';
        setMessages((prev) => [...prev, { id: `round-sep-${r}-${Date.now()}`, expertId: '__round__', content: `🔥 ${r}라운드`, round }]);
        const shuffled = [...discussionExperts].sort(() => Math.random() - 0.5);
        for (const expert of shuffled) {
          if (shouldStop()) break;
          setActiveExpertId(expert.id);
          const extra = r === 1 ? '\n\n끝장 토론입니다. 강한 입장을 취해주세요.' : `\n\n끝장 토론 ${r}라운드입니다. 합의점을 찾거나 강하게 주장해주세요.`;
          const msgId = `${expert.id}-endless-${r}-${Date.now()}`;
          setMessages((prev) => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, round }]);
          let fullContent = '';
          try {
            await streamExpert({ question, expert: { ...expert, systemPrompt: expert.systemPrompt + extra }, previousResponses: allResponses, round,
              onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m));},
              onDone: () => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m));},
              signal: controller.signal });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
            setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
          }
          allResponses.push({ name: `${expert.nameKo} (${r}라운드)`, content: fullContent });
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }

    if (!shouldStop()) {
      // Summary
      setActiveExpertId(SUMMARIZER_EXPERT.id);
      const summaryId = `summary-${Date.now()}`;
      setMessages((prev) => [...prev, { id: summaryId, expertId: SUMMARIZER_EXPERT.id, content: '', isStreaming: true, isSummary: true }]);
      let summaryContent = '';
      try {
        await streamExpert({
          question, expert: { ...SUMMARIZER_EXPERT, systemPrompt: `You are a debate summarizer. Organize the discussion into a clean, well-structured Korean summary using the following markdown format EXACTLY:

## 📋 토론 정리

### 📌 핵심 합의점
- (bullet points of key agreements, referencing expert names)

### ⚔️ 주요 논쟁점
- (bullet points of key disagreements, referencing who disagreed with whom and why)

### 🔄 입장 변화
- (any notable shifts in position during the debate)

### 👥 전문가별 핵심 주장
| 전문가 | 핵심 주장 |
|--------|----------|
| (name) | (1-sentence summary) |

Keep it concise and factual. Do NOT provide your own conclusion or opinion. Reference experts by name.` },
          previousResponses: allResponses, round: 'summary',
          onDelta: (chunk) => {summaryContent += chunk;setMessages((prev) => prev.map((m) => m.id === summaryId ? { ...m, content: summaryContent } : m));},
          onDone: () => {setMessages((prev) => prev.map((m) => m.id === summaryId ? { ...m, isStreaming: false } : m));},
          signal: controller.signal });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          summaryContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
          setMessages((prev) => prev.map((m) => m.id === summaryId ? { ...m, content: summaryContent, isStreaming: false } : m));
        }
      }

      if (!controller.signal.aborted) {
        setActiveExpertId(CONCLUSION_EXPERT.id);
        const conclusionId = `conclusion-${Date.now()}`;
        setMessages((prev) => [...prev, { id: conclusionId, expertId: CONCLUSION_EXPERT.id, content: '', isStreaming: true, isSummary: true }]);
        let conclusionContent = '';
        try {
          await streamExpert({
            question, expert: { ...CONCLUSION_EXPERT, systemPrompt: `You are a final conclusion synthesizer. Provide a definitive, well-organized conclusion in Korean using this markdown format:

## 🎯 최종 결론

### 핵심 답변
(2-3 sentences directly answering the original question)

### 주요 근거
1. **(근거 1 제목)** — 설명
2. **(근거 2 제목)** — 설명
3. **(근거 3 제목)** — 설명

### 실행 제안
- (actionable recommendation 1)
- (actionable recommendation 2)

> 💡 **한 줄 요약:** (one-sentence takeaway)

Do NOT mention any expert by name. Synthesize all perspectives into ONE unified, authoritative answer. Be concise and clear.` },
            previousResponses: allResponses, round: 'summary',
            onDelta: (chunk) => {conclusionContent += chunk;setMessages((prev) => prev.map((m) => m.id === conclusionId ? { ...m, content: conclusionContent } : m));},
            onDone: () => {setMessages((prev) => prev.map((m) => m.id === conclusionId ? { ...m, isStreaming: false } : m));},
            signal: controller.signal });
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            conclusionContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
            setMessages((prev) => prev.map((m) => m.id === conclusionId ? { ...m, content: conclusionContent, isStreaming: false } : m));
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
        messages: messages.map((m) => ({ ...m, isStreaming: false })),
        expertIds: selectedExpertIds
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

  const userInitial = user?.email?.[0]?.toUpperCase() || user?.user_metadata?.full_name?.[0] || '?';
  const userAvatar = user?.user_metadata?.avatar_url;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          experts={experts}
          onLoadHistory={loadHistory}
          onUpdateExperts={setExperts}
          discussionMode={discussionMode}
          onModeChange={handleModeChange}
          isDiscussing={isDiscussing} />
        

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="border-b border-border px-4 sm:px-6 py-2 bg-card/90 backdrop-blur-md" style={{ boxShadow: '0 1px 3px hsl(220 20% 14% / 0.03)' }}>
            <div className="flex items-center gap-2.5">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--gradient-primary)' }}>
                <MessageSquare className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-sm font-bold text-foreground tracking-tight">AI 전문가 토론</h1>
              </div>
              {/* Selected/Active experts - inline */}
              <div className="hidden sm:flex items-center gap-0.5">
                {activeExperts.slice(0, 5).map((expert) =>
                <ExpertAvatar key={expert.id} expert={expert} size="sm" active={activeExpertId === expert.id} />
                )}
                {activeExperts.length > 5 &&
                <span className="text-[10px] text-muted-foreground ml-1">+{activeExperts.length - 5}</span>
                }
              </div>
              {/* User avatar */}
              <div className="flex items-center gap-1.5 ml-1">
                {userAvatar ?
                <img src={userAvatar} alt="" className="w-7 h-7 rounded-full border border-border" /> :

                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-semibold text-foreground border border-border">
                    {userInitial}
                  </div>
                }
                <button onClick={signOut} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-secondary" title="로그아웃">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </header>

          {/* Main Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-10 scrollbar-thin">
            <div className="max-w-2xl mx-auto space-y-3">
              {/* Expert Selection */}
              {selectable &&
              <ExpertSelectionPanel
                experts={experts}
                selectedIds={selectedExpertIds}
                onToggle={toggleExpert}
                discussionMode={discussionMode}
                onModeChange={handleModeChange}
                isDiscussing={isDiscussing}
                onSuggestedQuestion={handleSuggestedQuestion} />

              }

              {/* Question display */}
              {currentQuestion && messages.length > 0 &&
              <div className="rounded-2xl p-4 border border-border flex items-start justify-between gap-3" style={{ background: 'var(--gradient-subtle)', boxShadow: 'var(--shadow-card)' }}>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">Question</span>
                    <p className="text-foreground font-medium mt-0.5">{currentQuestion}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isDiscussing &&
                  <Button variant="destructive" size="sm" onClick={stopDiscussion} className="text-xs gap-1 rounded-xl">
                        <Square className="w-3 h-3" /> 중단
                      </Button>
                  }
                    {isDone &&
                  <Button variant="ghost" size="sm" onClick={copyAllResults} className="text-xs gap-1 text-muted-foreground rounded-xl">
                        {copiedAll ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedAll ? '복사됨' : '전체 복사'}
                      </Button>
                  }
                  </div>
                </div>
              }

              {/* Messages */}
              {messages.map((msg, idx) => {
                if (msg.expertId === '__round__') {
                  const isCollapsed = collapsedRounds.has(msg.id);
                  // Count messages in this round (until next round separator or end)
                  let roundMsgCount = 0;
                  for (let i = idx + 1; i < messages.length; i++) {
                    if (messages[i].expertId === '__round__') break;
                    if (messages[i].expertId !== '__user__') roundMsgCount++;
                  }
                  return (
                    <button
                      key={msg.id}
                      type="button"
                      onClick={() => setCollapsedRounds((prev) => {
                        const next = new Set(prev);
                        if (next.has(msg.id)) next.delete(msg.id);else
                        next.add(msg.id);
                        return next;
                      })}
                      className="w-full flex items-center gap-3 py-3 group/round cursor-pointer">
                      
                      <div className="flex-1 h-px bg-border" />
                      <span className="flex items-center gap-1.5 text-xs font-display font-semibold text-muted-foreground px-3 py-1.5 rounded-full bg-muted/80 shadow-sm transition-colors group-hover/round:bg-muted">
                        {msg.content}
                        {roundMsgCount > 0 &&
                        <span className="text-[10px] font-normal opacity-60">({roundMsgCount})</span>
                        }
                        {isCollapsed ?
                        <ChevronRight className="w-3 h-3 text-muted-foreground" /> :
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        }
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </button>);

                }

                // Check if this message belongs to a collapsed round
                let belongsToCollapsedRound = false;
                for (let i = idx - 1; i >= 0; i--) {
                  if (messages[i].expertId === '__round__') {
                    belongsToCollapsedRound = collapsedRounds.has(messages[i].id);
                    break;
                  }
                }
                if (belongsToCollapsedRound) return null;

                if (msg.expertId === '__user__') {
                  return (
                    <div key={msg.id} className="bg-primary/5 border border-primary/20 rounded-2xl p-3.5 text-sm text-foreground/80" style={{ boxShadow: 'var(--shadow-card)' }}>
                      <ReactMarkdownInline content={msg.content} />
                    </div>);

                }
                const expert = allExperts.find((e) => e.id === msg.expertId);
                if (!expert) return null;
                return (
                  <DiscussionMessageCard
                    key={msg.id} message={msg} expert={expert}
                    onLike={handleLike} onDislike={handleDislike}
                    onRebuttal={isDone ? handleRebuttal : undefined} />);


              })}

              {isDone &&
              <div className="text-center pt-8 pb-4 space-y-3">
                  <p className="text-sm text-muted-foreground">토론이 완료되었습니다</p>
                  <Button
                  onClick={handleNewDiscussion}
                  className="rounded-xl gap-2 px-6 shadow-md"
                  style={{ background: 'var(--gradient-primary)' }}>
                  
                    <RefreshCw className="w-4 h-4" />
                    새 토론 시작
                  </Button>
                </div>
              }
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-border px-4 sm:px-6 bg-card/90 backdrop-blur-md py-[22px]">
            <div className="max-w-2xl mx-auto space-y-2">
              {/* Selected expert chips - compact */}
              {activeExperts.length > 0 &&
              <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[9px] text-muted-foreground font-medium shrink-0">참여:</span>
                  {activeExperts.slice(0, 8).map((expert) =>
                <button
                  key={expert.id}
                  onClick={() => !isDiscussing && messages.length === 0 && toggleExpert(expert.id)}
                  className={cn(
                    'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium border transition-all',
                    activeExpertId === expert.id ?
                    'bg-primary/10 border-primary/30 text-primary' :
                    'bg-secondary border-border text-foreground/70 hover:bg-muted',
                    isDiscussing || messages.length > 0 ? 'cursor-default' : 'cursor-pointer'
                  )}>
                  
                      <span>{expert.icon}</span>
                      <span className="hidden sm:inline">{expert.nameKo}</span>
                    </button>
                )}
                  {activeExperts.length > 8 &&
                <span className="text-[9px] text-muted-foreground">+{activeExperts.length - 8}</span>
                }
                </div>
              }
              <QuestionInput
                onSubmit={startDiscussion}
                disabled={isDiscussing || activeExperts.length < 1}
                discussionMode={discussionMode}
                showToolbar={!isDiscussing && messages.length === 0} />
              
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>);

};

function ReactMarkdownInline({ content }: {content: string;}) {
  const parts = content.split(/(\*\*.*?\*\*)/g);
  return (
    <p>
      {parts.map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ?
      <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong> :
      <span key={i}>{part}</span>
      )}
    </p>);

}

export default Index;