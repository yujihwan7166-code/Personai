import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { DEFAULT_EXPERTS, SUMMARIZER_EXPERT, CONCLUSION_EXPERT, DiscussionMessage, DiscussionRound, DiscussionMode, Expert, ROUND_LABELS, getMainMode, DebateSettings, DEFAULT_DEBATE_SETTINGS, CollaborationTeam, ThinkingFramework, DiscussionIssue, THINKING_FRAMEWORKS, COLLABORATION_TEAMS } from '@/types/expert';
import { QuestionInput } from '@/components/QuestionInput';
import { DiscussionMessageCard } from '@/components/DiscussionMessage';
import { AppSidebar } from '@/components/AppSidebar';
import { ExpertSelectionPanel } from '@/components/ExpertSelectionPanel';
import { saveDiscussionToHistory, DiscussionRecord } from '@/components/DiscussionHistory';
import { useAuth } from '@/contexts/AuthContext';
import { Copy, Check, Square, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/expert-discuss`;

function mockRoute(question: string, candidates: Expert[]): { expert: Expert; reason: string } {
  const q = question.toLowerCase();
  const find = (id: string) => candidates.find(e => e.id === id);

  if (/주식|투자|금융|경제|펀드|etf|코인|환율/.test(q))
    return { expert: find('gpt') ?? candidates[0], reason: '금융·투자 분석 특화' };
  if (/코드|코딩|개발|프로그래밍|javascript|python|typescript|버그|에러/.test(q))
    return { expert: find('claude') ?? candidates[0], reason: '코딩·논리 추론 특화' };
  if (/검색|최신|뉴스|오늘|날씨|요즘|트렌드|실시간/.test(q))
    return { expert: find('perplexity') ?? candidates[0], reason: '검색·최신 정보 특화' };
  if (/창작|아이디어|글쓰기|소설|시나리오|브레인스토밍|창의/.test(q))
    return { expert: find('gemini') ?? candidates[0], reason: '창의·탐색 특화' };
  if (/철학|윤리|사회|정치|역사|문화/.test(q))
    return { expert: find('claude') ?? candidates[0], reason: '윤리·균형 분석 특화' };
  if (/기술|ai|로봇|미래|혁신|스타트업/.test(q))
    return { expert: find('grok') ?? candidates[0], reason: '기술·혁신 직설 분석 특화' };

  return { expert: find('gpt') ?? candidates[0], reason: '범용 분석 및 구조적 답변' };
}

function buildCollaborationPrompt(p: {
  role: string; mission: string; phaseLabel: string; phaseIndex: number; totalPhases: number;
  roleInstruction: string; previousPhaseContext: string; deliverableTarget: string; teamName: string;
}): string {
  return `당신은 ${p.teamName}의 "${p.role}" 역할을 맡은 전문가입니다.

=== 절대 규칙 ===
- 오직 "${p.role}"의 관점에서만 발언하세요.
- 다른 역할의 영역에 대해서는 의견을 내지 마세요.
- 구체적인 수치, 예시, 근거를 포함하세요.
${p.mission ? `\n=== 프로젝트 목표 ===\n${p.mission}\n` : ''}
=== 현재 단계 (${p.phaseIndex + 1}/${p.totalPhases}) ===
${p.phaseLabel}${p.deliverableTarget ? ` → 산출물: ${p.deliverableTarget}` : ''}
${p.previousPhaseContext}
=== 당신의 임무 ===
${p.roleInstruction}

마크다운 형식으로 답변하세요. 한국어로 답변하세요.`;
}

function buildDeliverablePrompt(p: {
  mission: string; phaseLabel: string; deliverableName: string;
  previousPhaseContext: string; teamName: string; roles: string[];
}): string {
  return `당신은 ${p.teamName}의 프로젝트 매니저입니다. 팀원들(${p.roles.join(', ')})의 의견을 종합하여 "${p.deliverableName}"을 작성합니다.
${p.mission ? `\n프로젝트 목표: ${p.mission}\n` : ''}${p.previousPhaseContext}
=== 작성 규칙 ===
1. 각 역할의 핵심 기여를 빠짐없이 반영하되 하나의 통합 문서로 작성하세요.
2. 역할 간 충돌이 있으면 양쪽 의견을 병기하고 권고안을 제시하세요.
3. 다음 단계에서 활용할 수 있는 구체적 결론/합의사항을 명시하세요.
4. 마크다운 형식으로 구조화하고 표/목록을 적극 활용하세요.
5. 한국어로 작성하세요.

# 📄 ${p.deliverableName}`;
}

function buildFinalReportPrompt(p: { mission: string; teamName: string; roles: string[] }): string {
  return `당신은 ${p.teamName}의 총괄 책임자입니다. 모든 단계의 산출물과 팀원들의 기여를 종합 보고서로 통합합니다.
${p.mission ? `\n프로젝트 목표: ${p.mission}\n` : ''}
다음 형식으로 작성하세요:

# 📋 프로젝트 종합 보고서

## 프로젝트 개요
(목표, 팀 구성, 진행 과정 요약)

## 단계별 핵심 결과
(각 단계 산출물의 핵심 내용 요약)

## 역할별 기여
| 역할 | 핵심 기여 | 담당 영역 |
|------|----------|----------|
${p.roles.map(r => `| ${r} | | |`).join('\n')}

## 최종 결론 및 제안
(모든 관점을 통합한 결론)

## 다음 단계 (Next Steps)
(구체적 실행 항목)

> 💡 **한 줄 요약:** (핵심 결론)

한국어로 작성하세요.`;
}

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
  useAuth();
  const [experts, setExperts] = useState<Expert[]>(() => {
    try {
      const saved = localStorage.getItem('ai-debate-experts-v16');
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
  const [discussionMode, setDiscussionMode] = useState<DiscussionMode>('general');
  const [proconStances, setProconStances] = useState<Record<string, 'pro' | 'con'>>({});
  const [debateSettings, setDebateSettings] = useState<DebateSettings>(DEFAULT_DEBATE_SETTINGS);
  const [showDebateSettings, setShowDebateSettings] = useState(false);
  const [selectedCollaborationTeam, setSelectedCollaborationTeam] = useState<CollaborationTeam | null>(null);
  const [collaborationRoles, setCollaborationRoles] = useState<Record<string, string>>({});
  const [collaborationMission, setCollaborationMission] = useState('');
  const [selectedFramework, setSelectedFramework] = useState<ThinkingFramework | null>(null);
  const [discussionIssues, setDiscussionIssues] = useState<DiscussionIssue[]>([]);
  const [debateIntensity, setDebateIntensity] = useState('moderate');
  const [, setStopRequested] = useState(false);
  const [collapsedRounds, setCollapsedRounds] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('ai-debate-experts-v16', JSON.stringify(experts));
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
        if (prev.length <= 1 && discussionMode !== 'procon') return prev;
        return prev.filter((x) => x !== id);
      }
      // Multi mode: max 3
      if (getMainMode(discussionMode) === 'multi' && prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleModeChange = (mode: DiscussionMode) => {
    const prevMain = getMainMode(discussionMode);
    const nextMain = getMainMode(mode);
    setDiscussionMode(mode);
    setSelectedExpertIds(nextMain === 'general' ? ['gpt'] : nextMain === 'multi' ? ['gpt'] : []);
    setProconStances({});
    setShowDebateSettings(false);
    setSelectedCollaborationTeam(null);
    setCollaborationRoles({});
    setCollaborationMission('');
    setSelectedFramework(null);
    setDiscussionIssues([]);
    // suppress unused warning — prevMain used for future extension
    void prevMain;
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

  const handleRebuttal = useCallback(async (expertId: string, _expertContent: string, userRebuttal: string) => {
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
    const lengthExtra = debateSettings.responseLength === 'short'
      ? '\n답변은 반드시 3-4문장으로 간결하게 작성하세요.'
      : debateSettings.responseLength === 'long'
      ? '\n답변은 풍부한 근거와 예시를 들어 충분히 상세하게 작성하세요.'
      : '';

    if (useMode === 'general') {
      // Smart router: auto-select best AI
      let expertsToRun = discussionExperts;
      if (useIds.includes('router')) {
        const routingId = `routing-${Date.now()}`;
        setMessages((prev) => [...prev, { id: routingId, expertId: 'router', content: '🔍 질문 분석 중...', isStreaming: true }]);
        setActiveExpertId('router');
        await new Promise(r => setTimeout(r, 1200));
        if (shouldStop()) { setActiveExpertId(undefined); setIsDiscussing(false); setStopRequested(false); return; }
        const candidates = experts.filter(e => e.id !== 'router' && e.category === 'ai');
        const { expert: picked, reason } = mockRoute(question, candidates);
        setMessages((prev) => prev.map(m => m.id === routingId
          ? { ...m, content: `🎯 **${picked.nameKo}** 선택 — ${reason}`, isStreaming: false } : m));
        expertsToRun = [picked];
        setActiveExpertId(undefined);
        await new Promise(r => setTimeout(r, 400));
      }

      for (const expert of expertsToRun) {
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
      setMessages((prev) => [...prev, { id: `round-sep-multi-${Date.now()}`, expertId: '__round__', content: '다중 AI 의견 수집', round: 'initial' }]);
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
      // Build issue & purpose context for system prompt
      const purposeMap: Record<string, string> = {
        explore: '\n다양한 관점과 가능성을 넓게 탐색하세요. 한 가지 결론에 급하게 도달하지 말고 여러 시각을 제시해주세요.',
        analyze: '\n논리적 근거를 들어 깊이 분석하세요. 주장의 전제, 근거, 반론을 체계적으로 검토해주세요.',
        consensus: '\n공통점을 찾고 합의 가능한 결론을 도출하는 데 집중하세요. 다른 전문가 의견의 장점을 인정하고 통합하세요.',
      };
      const intensityExtra = purposeMap[debateIntensity] || '';
      const issueContext = (discussionIssues.length > 0
        ? `\n\n이 토론의 핵심 논점은 다음과 같습니다:\n${discussionIssues.map((iss, i) => `${i+1}. ${iss.title}`).join('\n')}\n각 논점에 대해 명확한 입장을 밝히고 근거를 제시해주세요.`
        : '') + intensityExtra;

      const roundConfig = debateSettings.rounds === 2
        ? [{ round: 'initial' as DiscussionRound, label: '1라운드 · 주장' }, { round: 'final' as DiscussionRound, label: '2라운드 · 최종 입장' }]
        : debateSettings.rounds === 4
        ? [{ round: 'initial' as DiscussionRound, label: '1라운드 · 초기 의견' }, { round: 'rebuttal' as DiscussionRound, label: '2라운드 · 반론' }, { round: 'rebuttal' as DiscussionRound, label: '3라운드 · 심층 반론' }, { round: 'final' as DiscussionRound, label: '4라운드 · 최종 입장' }]
        : [{ round: 'initial' as DiscussionRound, label: ROUND_LABELS.initial }, { round: 'rebuttal' as DiscussionRound, label: ROUND_LABELS.rebuttal }, { round: 'final' as DiscussionRound, label: ROUND_LABELS.final }];
      for (const { round, label } of roundConfig) {
        if (shouldStop()) break;
        const roundExperts = [...discussionExperts].sort(() => Math.random() - 0.5);
        setMessages((prev) => [...prev, { id: `round-sep-${round}-${Date.now()}`, expertId: '__round__', content: label, round }]);
        for (const expert of roundExperts) {
          if (shouldStop()) break;
          setActiveExpertId(expert.id);
          const msgId = `${expert.id}-${round}-${Date.now()}`;
          setMessages((prev) => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, round }]);
          let fullContent = '';
          try {
            await streamExpert({ question, expert: { ...expert, systemPrompt: expert.systemPrompt + issueContext + lengthExtra }, previousResponses: allResponses, round,
              onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m));},
              onDone: () => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m));},
              signal: controller.signal });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
            setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
          }
          allResponses.push({ name: `${expert.nameKo} (${label})`, content: fullContent });
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    } else if (useMode === 'procon') {
      // Phase 0: AI analyzes the topic and assigns stances based on expert perspectives
      setMessages((prev) => [...prev, { id: `round-sep-stance-${Date.now()}`, expertId: '__round__', content: '주제 분석', round: 'initial' }]);

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
    } else if (useMode === 'brainstorm') {
      // Use selected framework or default to 'free'
      const fw = selectedFramework || THINKING_FRAMEWORKS.find(f => f.id === 'free')!;
      const fwRounds = fw.rounds;
      const roundMap: DiscussionRound[] = ['initial', 'rebuttal', 'final', 'rebuttal', 'final', 'rebuttal'];

      for (let ri = 0; ri < fwRounds.length; ri++) {
        if (shouldStop()) break;
        const fwRound = fwRounds[ri];
        const round = roundMap[ri] || 'rebuttal';
        const roundExperts = [...discussionExperts].sort(() => Math.random() - 0.5);
        setMessages((prev) => [...prev, { id: `round-sep-brainstorm-${ri}-${Date.now()}`, expertId: '__round__', content: fwRound.label, round }]);
        for (const expert of roundExperts) {
          if (shouldStop()) break;
          setActiveExpertId(expert.id);
          const extra = `\n\n[${fw.nameKo}] ${fwRound.label}\n${fwRound.instruction}`;
          const msgId = `${expert.id}-brainstorm-${ri}-${Date.now()}`;
          setMessages((prev) => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, round }]);
          let fullContent = '';
          try {
            await streamExpert({ question, expert: { ...expert, systemPrompt: expert.systemPrompt + extra + lengthExtra }, previousResponses: allResponses, round,
              onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m));},
              onDone: () => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m));},
              signal: controller.signal });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
            setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
          }
          allResponses.push({ name: `${expert.nameKo} (${fwRound.label})`, content: fullContent });
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    } else if (useMode === 'hearing') {
      // Hearing: experts grill a topic with tough questions from their expertise
      const pressureMap: Record<string, string> = {
        mild: '\n정중하지만 핵심을 찌르는 질문을 하세요.',
        moderate: '\n날카롭고 구체적인 질문으로 약점을 파고드세요. 애매한 답변은 재질문하세요.',
        intense: '\n거칠고 압박감 있게 추궁하세요. 회피하는 부분을 끝까지 물고 늘어지세요.',
      };
      const focusMap: Record<string, string> = {
        overall: '논리, 실현성, 윤리 등 모든 측면에서 질의하세요.',
        logic: '논리적 허점, 모순, 비약을 집중 추궁하세요.',
        feasibility: '실행 가능성, 자원, 현실적 한계를 파고드세요.',
        ethics: '윤리적·도덕적 문제, 사회적 영향을 추궁하세요.',
      };
      const pressure = debateSettings.hearingPressure || 'moderate';
      const focus = debateSettings.hearingFocus || 'overall';
      const pressureInst = pressureMap[pressure];
      const focusInst = focusMap[focus];

      const hearingPhases = [
        { label: '📋 모두발언', round: 'initial' as const,
          instruction: `[청문회 — 모두발언]\n이 주제에 대해 당신의 전문 분야 관점에서 핵심 요약과 초기 평가를 제시하세요. 이후 청문 질의에서 깊이 파고들 부분을 예고하세요.` },
        { label: '🎤 전문가 질의', round: 'rebuttal' as const,
          instruction: `[청문회 — 전문가 질의]\n당신은 "${'{expertName}'}" 위원입니다. 당신의 전문 분야에서 이 주제의 약점, 모호한 점, 검증이 필요한 부분을 날카롭게 질문하세요. ${focusInst}${pressureInst}\n\n반드시 구체적인 질문 형태로 제시하고, 왜 그 질문이 중요한지 간략히 설명하세요. 질문은 최소 2개 이상 제시하세요.` },
        { label: '🔥 추가 심문', round: 'rebuttal' as const,
          instruction: `[청문회 — 추가 심문]\n이전 질의에서 드러난 약점과 회피한 부분을 집중 추궁하세요. 다른 위원들의 질의도 참고하여 아직 해결되지 않은 핵심 쟁점을 파고드세요.${pressureInst}\n\n"앞서 ~라고 했는데, 그렇다면 ~은 어떻게 설명하시겠습니까?" 형식으로 추궁하세요.` },
        { label: '⚖️ 최종 평가', round: 'final' as const,
          instruction: `[청문회 — 최종 평가]\n청문을 종합하여 당신의 최종 평가를 내리세요.\n\n1. 검증 결과 (통과/조건부 통과/부적격)\n2. 확인된 강점\n3. 드러난 약점\n4. 보완 필요 사항\n5. 종합 의견 (1-2문장)\n\n전문가로서 엄격하지만 공정하게 판정하세요.` },
      ];

      for (const phase of hearingPhases) {
        if (shouldStop()) break;
        const roundExperts = [...discussionExperts].sort(() => Math.random() - 0.5);
        setMessages(prev => [...prev, { id: `round-sep-hearing-${phase.label}-${Date.now()}`, expertId: '__round__', content: phase.label, round: phase.round }]);
        for (const expert of roundExperts) {
          if (shouldStop()) break;
          setActiveExpertId(expert.id);
          const instruction = phase.instruction.replace('{expertName}', expert.nameKo);
          const msgId = `${expert.id}-hearing-${phase.label}-${Date.now()}`;
          setMessages(prev => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, round: phase.round }]);
          let fullContent = '';
          try {
            await streamExpert({
              question,
              expert: { ...expert, systemPrompt: expert.systemPrompt + '\n\n' + instruction + lengthExtra },
              previousResponses: allResponses, round: phase.round,
              onDelta: chunk => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
              onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m)); },
              signal: controller.signal,
            });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
          }
          allResponses.push({ name: `${expert.nameKo} (${phase.label})`, content: fullContent });
          await new Promise(r => setTimeout(r, 500));
        }
      }
    } else if (useMode === 'collaboration') {
      const team = selectedCollaborationTeam;
      const roles = collaborationRoles;
      const mission = collaborationMission;
      const phases = team?.phases || [
        { id: 'r1', label: '각 역할별 의견', instruction: '각자의 역할 관점에서 의견을 제시해주세요.', deliverable: '', description: '' },
        { id: 'r2', label: '상호 피드백', instruction: '다른 역할의 의견에 대해 피드백을 제시해주세요.', deliverable: '', description: '' },
        { id: 'r3', label: '종합 결론', instruction: '모든 의견을 종합하여 최종 결론을 도출해주세요.', deliverable: '', description: '' },
      ];
      const roundMap: DiscussionRound[] = ['initial', 'rebuttal', 'final'];
      const phaseDeliverables: { phaseLabel: string; deliverable: string; content: string }[] = [];

      for (let pi = 0; pi < phases.length; pi++) {
        if (shouldStop()) break;
        const phase = phases[pi];
        const round = roundMap[pi] || 'final';

        // Build previous phase context from deliverables
        const previousPhaseContext = phaseDeliverables.length > 0
          ? '\n\n=== 이전 단계 산출물 ===\n' + phaseDeliverables.map(d => `[${d.phaseLabel} - ${d.deliverable}]:\n${d.content}`).join('\n---\n') + '\n=== 끝 ===\n'
          : '';

        const phaseLabel = phase.deliverable
          ? `${pi + 1}단계 · ${phase.label} → 📄 ${phase.deliverable}`
          : `${pi + 1}단계 · ${phase.label}`;
        setMessages((prev) => [...prev, { id: `round-sep-collab-${pi}-${Date.now()}`, expertId: '__round__', content: phaseLabel, round }]);

        for (const expert of discussionExperts) {
          if (shouldStop()) break;
          setActiveExpertId(expert.id);
          const role = roles[expert.id] || '협력팀원';
          const roleInstruction = phase.roleInstructions?.[role] || phase.instruction;

          const collabPrompt = buildCollaborationPrompt({
            role, mission, phaseLabel: phase.label, phaseIndex: pi, totalPhases: phases.length,
            roleInstruction, previousPhaseContext, deliverableTarget: phase.deliverable, teamName: team?.name || '협업팀',
          });

          const msgId = `${expert.id}-collab-${pi}-${Date.now()}`;
          setMessages((prev) => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, round }]);
          let fullContent = '';
          try {
            await streamExpert({ question, expert: { ...expert, systemPrompt: collabPrompt + lengthExtra }, previousResponses: allResponses, round,
              onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m));},
              onDone: () => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m));},
              signal: controller.signal });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
            setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
          }
          allResponses.push({ name: `${expert.nameKo} (${role}, ${phase.label})`, content: fullContent });
          await new Promise((r) => setTimeout(r, 500));
        }

        // Generate deliverable with enhanced prompt
        if (phase.deliverable && !shouldStop()) {
          const delivPrompt = buildDeliverablePrompt({
            mission, phaseLabel: phase.label, deliverableName: phase.deliverable,
            previousPhaseContext, teamName: team?.name || '협업팀', roles: Object.values(roles),
          });
          const delivId = `deliverable-${pi}-${Date.now()}`;
          setMessages((prev) => [...prev, { id: delivId, expertId: SUMMARIZER_EXPERT.id, content: '', isStreaming: true, round }]);
          setActiveExpertId(SUMMARIZER_EXPERT.id);
          let delivContent = '';
          try {
            await streamExpert({
              question, expert: { ...SUMMARIZER_EXPERT, systemPrompt: delivPrompt },
              previousResponses: allResponses, round: 'summary' as DiscussionRound,
              onDelta: (chunk) => { delivContent += chunk; setMessages((prev) => prev.map((m) => m.id === delivId ? { ...m, content: delivContent } : m)); },
              onDone: () => { setMessages((prev) => prev.map((m) => m.id === delivId ? { ...m, isStreaming: false, isSummary: true } : m)); },
              signal: controller.signal
            });
          } catch (err) {
            if ((err as Error).name !== 'AbortError') {
              delivContent = `⚠️ 산출물 생성 실패`;
              setMessages((prev) => prev.map((m) => m.id === delivId ? { ...m, content: delivContent, isStreaming: false } : m));
            }
          }
          phaseDeliverables.push({ phaseLabel: phase.label, deliverable: phase.deliverable, content: delivContent });
          allResponses.push({ name: `📄 ${phase.deliverable}`, content: delivContent });
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      // Final comprehensive report
      if (!shouldStop() && debateSettings.includeConclusion) {
        const finalId = `final-report-${Date.now()}`;
        setMessages((prev) => [...prev, { id: `round-sep-final-${Date.now()}`, expertId: '__round__', content: '📋 종합 보고서', round: 'final' }]);
        setMessages((prev) => [...prev, { id: finalId, expertId: CONCLUSION_EXPERT.id, content: '', isStreaming: true, round: 'final' }]);
        setActiveExpertId(CONCLUSION_EXPERT.id);
        let finalContent = '';
        try {
          await streamExpert({
            question, expert: { ...CONCLUSION_EXPERT, systemPrompt: buildFinalReportPrompt({ mission, teamName: team?.name || '협업팀', roles: Object.values(roles) }) },
            previousResponses: allResponses, round: 'summary' as DiscussionRound,
            onDelta: (chunk) => { finalContent += chunk; setMessages((prev) => prev.map((m) => m.id === finalId ? { ...m, content: finalContent } : m)); },
            onDone: () => { setMessages((prev) => prev.map((m) => m.id === finalId ? { ...m, isStreaming: false, isSummary: true } : m)); },
            signal: controller.signal
          });
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            setMessages((prev) => prev.map((m) => m.id === finalId ? { ...m, content: '⚠️ 종합 보고서 생성 실패', isStreaming: false } : m));
          }
        }
      }
    } else if (useMode === 'assistant') {
      // Assistant mode: single expert answers directly (same as general but for assistant category)
      const expert = discussionExperts[0];
      if (expert) {
        setActiveExpertId(expert.id);
        const msgId = `${expert.id}-assistant-${Date.now()}`;
        setMessages((prev) => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true }]);
        let fullContent = '';
        try {
          await streamExpert({
            question, expert,
            previousResponses: [],
            round: 'initial',
            onDelta: (chunk) => { fullContent += chunk; setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m)); },
            onDone: () => { setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m)); },
            signal: controller.signal,
          });
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`, isStreaming: false } : m));
          }
        }
      }
      setActiveExpertId(undefined);
      setIsDiscussing(false);
      setStopRequested(false);
      saveDiscussionToHistory({ question, expertIds: useIds, mode: useMode, messages: [] });
      return;
    }

    if (!shouldStop() && debateSettings.includeConclusion) {
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
  }, [experts, selectedExpertIds, discussionMode, debateSettings]);

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

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="h-screen flex w-full bg-[#f7f8fa]">
        <AppSidebar
          experts={experts}
          onLoadHistory={loadHistory}
          onUpdateExperts={setExperts}
          discussionMode={discussionMode}
          onModeChange={handleModeChange}
          isDiscussing={isDiscussing} />


        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Main scroll area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
            <div className={cn(
              'mx-auto px-4 sm:px-6 pt-24 pb-6 space-y-3',
              !selectable ? 'max-w-xl'
                : (discussionMode === 'assistant' || discussionMode === 'expert') ? 'max-w-4xl'
                : 'max-w-2xl'
            )}>

              {selectable && (
                <ExpertSelectionPanel
                  experts={experts}
                  selectedIds={selectedExpertIds}
                  onToggle={toggleExpert}
                  discussionMode={discussionMode}
                  onModeChange={handleModeChange}
                  isDiscussing={isDiscussing}
                  onSuggestedQuestion={handleSuggestedQuestion}
                  onSubmit={startDiscussion}
                  proconStances={proconStances}
                  onProconStancesChange={setProconStances}
                  debateSettings={debateSettings}
                  onDebateSettingsChange={setDebateSettings}
                  showDebateSettings={showDebateSettings}
                  selectedCollaborationTeam={selectedCollaborationTeam}
                  onCollaborationTeamChange={setSelectedCollaborationTeam}
                  collaborationRoles={collaborationRoles}
                  onCollaborationRolesChange={setCollaborationRoles}
                  selectedFramework={selectedFramework}
                  onFrameworkChange={setSelectedFramework}
                  discussionIssues={discussionIssues}
                  onDiscussionIssuesChange={setDiscussionIssues}
                  debateIntensity={debateIntensity}
                  onDebateIntensityChange={setDebateIntensity}
                  collaborationMission={collaborationMission}
                  onCollaborationMissionChange={setCollaborationMission}
                  onBulkSelect={setSelectedExpertIds}
                />
              )}

              {currentQuestion && messages.length > 0 && (
                <div className="rounded-2xl px-4 py-3.5 border border-border bg-white card-shadow flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">질문</span>
                    <p className="text-foreground font-medium text-[14px] mt-0.5 leading-snug">{currentQuestion}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 mt-0.5">
                    {isDiscussing && (
                      <Button variant="destructive" size="sm" onClick={stopDiscussion} className="text-[12px] gap-1.5 rounded-xl h-8">
                        <Square className="w-3 h-3" /> 중단
                      </Button>
                    )}
                    {isDone && (
                      <Button variant="ghost" size="sm" onClick={copyAllResults} className="text-[12px] gap-1.5 text-muted-foreground hover:text-foreground rounded-xl h-8">
                        {copiedAll ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedAll ? '복사됨' : '전체 복사'}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Participants display for debate modes */}
              {currentQuestion && messages.length > 0 && ['standard', 'procon', 'brainstorm', 'hearing', 'collaboration'].includes(discussionMode) && activeExperts.length > 0 && (
                <div className="rounded-2xl px-4 py-2.5 border border-border bg-slate-50 card-shadow">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {discussionMode === 'standard' && '토론자'}
                    {discussionMode === 'procon' && '토론자'}
                    {discussionMode === 'brainstorm' && '참여자'}
                    {discussionMode === 'hearing' && '질의 위원'}
                    {discussionMode === 'collaboration' && '협업팀'}
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {activeExperts.map((expert) => {
                      const role =
                        discussionMode === 'collaboration' ? collaborationRoles[expert.id] :
                        discussionMode === 'procon' ? (proconStances[expert.id] === 'pro' ? '찬성' : '반대') :
                        undefined;
                      return (
                        <div key={expert.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-border text-[11px] font-medium text-slate-700">
                          <span>{expert.nameKo}</span>
                          {role && <span className="text-muted-foreground">({role})</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => {
                if (msg.expertId === '__round__') {
                  const isCollapsed = collapsedRounds.has(msg.id);
                  let roundMsgCount = 0;
                  for (let i = idx + 1; i < messages.length; i++) {
                    if (messages[i].expertId === '__round__') break;
                    if (messages[i].expertId !== '__user__') roundMsgCount++;
                  }
                  return (
                    <button
                      key={msg.id}
                      type="button"
                      onClick={() => setCollapsedRounds(prev => {
                        const next = new Set(prev);
                        if (next.has(msg.id)) next.delete(msg.id); else next.add(msg.id);
                        return next;
                      })}
                      className="w-full flex items-center gap-3 py-2 group/round cursor-pointer"
                    >
                      <div className="flex-1 h-px bg-border" />
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground px-3 py-1.5 rounded-full bg-white border border-border card-shadow transition-all group-hover/round:border-primary/20 group-hover/round:text-primary">
                        {msg.content}
                        {roundMsgCount > 0 && <span className="opacity-50">({roundMsgCount})</span>}
                        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </button>
                  );
                }

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
                    <div key={msg.id} className="bg-white border border-border rounded-2xl px-4 py-3 text-[13px] text-foreground/80 card-shadow">
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
                <div className="text-center pt-10 pb-4 space-y-3">
                  <p className="text-[13px] text-muted-foreground">토론이 완료되었습니다</p>
                  <Button
                    onClick={handleNewDiscussion}
                    className="rounded-full gap-2 px-6 h-10 bg-primary text-white hover:bg-primary/90 shadow-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    새 토론 시작
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Input – only when conversation is active */}
          {(messages.length > 0 || isDiscussing) && (
            <div className="shrink-0 border-t border-border bg-white">
              <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 space-y-2">
                {activeExperts.length > 0 && (
                  (discussionMode === 'standard' || discussionMode === 'brainstorm' || discussionMode === 'hearing') ? (
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-700 text-white text-[10px] font-bold tracking-wide">
                        {discussionMode === 'standard' ? '토론자' : discussionMode === 'hearing' ? '질의 위원' : '참여자'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {activeExperts.map((e, i) => (
                          <span key={e.id} className="inline-flex items-center gap-1.5">
                            <span className="text-[13px] font-semibold text-slate-800">{e.nameKo}</span>
                            {i < activeExperts.length - 1 && <span className="text-slate-300">·</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground font-medium shrink-0">참여 전문가</span>
                      {activeExperts.slice(0, 8).map(expert => (
                        <span
                          key={expert.id}
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border',
                            activeExpertId === expert.id
                              ? 'bg-primary/10 border-primary/20 text-primary'
                              : 'bg-muted/40 border-border text-muted-foreground'
                          )}
                        >
                          {expert.nameKo}
                        </span>
                      ))}
                      {activeExperts.length > 8 && (
                        <span className="text-[10px] text-muted-foreground">+{activeExperts.length - 8}</span>
                      )}
                    </div>
                  )
                )}
                <QuestionInput
                  onSubmit={startDiscussion}
                  disabled={isDiscussing || activeExperts.length < 1}
                  discussionMode={discussionMode}
                  onToggleSettings={() => setShowDebateSettings((prev) => !prev)}
                  showSettings={showDebateSettings}
                />
              </div>
            </div>
          )}
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