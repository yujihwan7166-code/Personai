import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { DEFAULT_EXPERTS, SUMMARIZER_EXPERT, CONCLUSION_EXPERT, DiscussionMessage, DiscussionRound, DiscussionMode, Expert, ROUND_LABELS, getMainMode, DebateSettings, DEFAULT_DEBATE_SETTINGS, ThinkingFramework, DiscussionIssue, THINKING_FRAMEWORKS } from '@/types/expert';
import { QuestionInput } from '@/components/QuestionInput';
import { ExpertAvatar } from '@/components/ExpertAvatar';
import { DiscussionMessageCard } from '@/components/DiscussionMessage';
import { AppSidebar } from '@/components/AppSidebar';
import { ExpertSelectionPanel } from '@/components/ExpertSelectionPanel';
import { saveDiscussionToHistory, DiscussionRecord } from '@/components/DiscussionHistory';
import { Copy, Check, Square, RefreshCw, ChevronDown, ChevronRight, ArrowDown, ArrowRight, Download, RotateCcw, Pencil } from 'lucide-react';
import type { ChatVariant } from '@/components/DiscussionMessage';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

const CHAT_URL = '/api/chat';

const SAFETY_GUARDRAIL = `\n=== 안전 규칙 (최우선) ===
- 의료/약물/건강 관련: 캐릭터 관점에서 간단히 의견만 말하되 "실제로는 전문의와 상담하세요" 면책 문구 필수.
- 법률 관련: 일반적 정보만 제공, "구체적 사안은 변호사와 상담하세요" 추가.
- 자해/자살: 절대 구체적 방법 제시 금지. 자살예방상담전화 1393 안내.
- 불법 행위 조언/개인정보 요청: 거부.
=== 끝 ===\n`;

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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt: SAFETY_GUARDRAIL + expert.systemPrompt, question, previousResponses }),
    signal
  });

  if (!resp.ok || !resp.body) {
    const errorData = await resp.json().catch(() => ({}));
    if (resp.status === 429) {
      throw new Error('API 요청 한도 초과 — 잠시 후 다시 시도해주세요. (무료 티어: 일 20회)');
    }
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
  const [experts, setExperts] = useState<Expert[]>(() => {
    try {
      const saved = localStorage.getItem('ai-debate-experts-v16');
      if (saved) {
        const parsed = JSON.parse(saved) as Expert[];
        // Merge: keep saved customizations but add any new default experts
        const savedIds = new Set(parsed.map((e) => e.id));
        const newExperts = DEFAULT_EXPERTS.filter((e) => !savedIds.has(e.id));
        return [...parsed.map((e) => {
          const def = DEFAULT_EXPERTS.find(d => d.id === e.id);
          return { ...e, category: e.category || 'ai', icon: e.icon || def?.icon || '' };
        }), ...newExperts];
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
        return prev.filter((x) => x !== id);
      }
      // Multi mode: max 3
      if (getMainMode(discussionMode) === 'multi' && prev.length >= 3) return prev;
      // Debate mode (standard/brainstorm/hearing): max 4
      if (getMainMode(discussionMode) === 'debate' && discussionMode !== 'procon' && prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const handleModeChange = (mode: DiscussionMode) => {
    const prevMain = getMainMode(discussionMode);
    const nextMain = getMainMode(mode);
    setDiscussionMode(mode);
    setSelectedExpertIds(nextMain === prevMain ? selectedExpertIds : nextMain === 'general' ? ['gpt'] : nextMain === 'multi' ? ['gpt'] : []);
    setProconStances({});
    setShowDebateSettings(false);
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

  // Topic clarification state
  const [clarifyState, setClarifyState] = useState<{
    show: boolean;
    loading: boolean;
    originalInput: string;
    suggestions: { topic: string; description: string }[];
    customEdit: string;
  }>({ show: false, loading: false, originalInput: '', suggestions: [], customEdit: '' });

  // 실제 토론 시작 함수 (먼저 선언)
  const runDiscussion = useCallback(async (question: string, overrideExpertIds?: string[], overrideMode?: DiscussionMode) => {
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
    setClarifyState({ show: false, loading: false, originalInput: '', suggestions: [], customEdit: '' });
    const allResponses: {name: string;content: string;}[] = [];
    const shouldStop = () => controller.signal.aborted;
    const lengthExtra = debateSettings.responseLength === 'short'
      ? '\n답변은 반드시 3-4문장으로 간결하게 작성하세요.'
      : debateSettings.responseLength === 'long'
      ? '\n답변은 풍부한 근거와 예시를 들어 충분히 상세하게 작성하세요.'
      : '';

    if (useMode === 'player') {
      // Player mode: 준비 중
      setMessages([{ id: `player-${Date.now()}`, expertId: '__round__', content: '플레이어 모드는 현재 준비 중입니다.' }]);
      setIsDiscussing(false);
      setStopRequested(false);
      return;
    }

    if (useMode === 'expert') {
      // Expert mode: deep consultation with selected expert
      const expert = discussionExperts[0];
      if (expert) {
        setActiveExpertId(expert.id);
        const msgId = `${expert.id}-expert-${Date.now()}`;
        setMessages((prev) => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true }]);
        let fullContent = '';
        const expertExtra = `\n\n=== 전문가 상담 모드 ===\n당신은 해당 분야의 최고 전문가입니다. 사용자의 질문에 대해 깊이 있고 실용적인 전문 상담을 제공하세요.\n- 전문 용어를 사용하되 쉽게 설명해주세요\n- 구체적인 사례, 수치, 근거를 포함하세요\n- 단계별 실행 방안이 있다면 제시하세요\n- 주의사항이나 리스크도 언급하세요\n마크다운 형식으로 구조화하여 답변하세요.`;
        try {
          await streamExpert({
            question, expert: { ...expert, systemPrompt: expert.systemPrompt + expertExtra },
            previousResponses: [], round: 'initial',
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

      // 결론은 자동으로 내지 않음 — 사용자가 "결론 내리기" 버튼을 눌러야 생성
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
      let stanceMap: Record<string, 'pro' | 'con'> = {};

      // Check if user manually assigned all stances
      const manuallyAssigned = discussionExperts.every(e => proconStances[e.id] === 'pro' || proconStances[e.id] === 'con');

      if (manuallyAssigned) {
        // Use manual assignments
        stanceMap = { ...proconStances };
        const proNames = discussionExperts.filter(e => stanceMap[e.id] === 'pro').map(e => e.nameKo);
        const conNames = discussionExperts.filter(e => stanceMap[e.id] === 'con').map(e => e.nameKo);
        const manualContent = `## ⚔️ 수동 배정\n\n### 👍 찬성\n${proNames.join(', ')}\n\n### 👎 반대\n${conNames.join(', ')}`;
        setMessages((prev) => [...prev, { id: `round-sep-stance-${Date.now()}`, expertId: '__round__', content: '입장 배정', round: 'initial' }]);
        const manualId = `stance-manual-${Date.now()}`;
        setMessages((prev) => [...prev, { id: manualId, expertId: SUMMARIZER_EXPERT.id, content: manualContent, round: 'initial' }]);
        allResponses.push({ name: '사회자 (수동 배정)', content: manualContent });
      } else {
        // Auto-assign via AI
        setMessages((prev) => [...prev, { id: `round-sep-stance-${Date.now()}`, expertId: '__round__', content: '주제 분석 · AI 자동 배정', round: 'initial' }]);
        const analysisId = `stance-analysis-${Date.now()}`;
        setMessages((prev) => [...prev, { id: analysisId, expertId: SUMMARIZER_EXPERT.id, content: '', isStreaming: true, round: 'initial' }]);
        setActiveExpertId(SUMMARIZER_EXPERT.id);

        try {
          const stanceResp = await fetch('/api/procon-stance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

          for (const assignment of stanceResult.assignments || []) {
            if (discussionExperts.some((e) => e.id === assignment.expertId)) {
              stanceMap[assignment.expertId] = assignment.stance;
            }
          }

          for (const expert of discussionExperts) {
            if (!stanceMap[expert.id]) {
              const proCount = Object.values(stanceMap).filter((s) => s === 'pro').length;
              const conCount = Object.values(stanceMap).filter((s) => s === 'con').length;
              stanceMap[expert.id] = proCount <= conCount ? 'pro' : 'con';
            }
          }

          const proNames = discussionExperts.filter((e) => stanceMap[e.id] === 'pro').map((e) => e.nameKo);
          const conNames = discussionExperts.filter((e) => stanceMap[e.id] === 'con').map((e) => e.nameKo);
          const reasonLines = (stanceResult.assignments || []).
          filter((a: any) => discussionExperts.some((e) => e.id === a.expertId)).
          map((a: any) => {
            const expert = discussionExperts.find((e) => e.id === a.expertId);
            const side = a.stance === 'pro' ? '찬성' : '반대';
            return `- **${expert?.nameKo}** (${side}): ${a.reason}`;
          }).join('\n');

          const analysisContent = `## ⚔️ AI 자동 배정 결과\n\n${stanceResult.analysis || ''}\n\n### 👍 찬성 팀\n${proNames.join(', ')}\n\n### 👎 반대 팀\n${conNames.join(', ')}\n\n### 배정 이유\n${reasonLines}`;

          setMessages((prev) => prev.map((m) => m.id === analysisId ? { ...m, content: analysisContent, isStreaming: false } : m));
          allResponses.push({ name: '사회자 (AI 배정)', content: analysisContent });

        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            setMessages((prev) => prev.map((m) => m.id === analysisId ? { ...m, content: '⚠️ 중단됨', isStreaming: false } : m));
            setActiveExpertId(undefined);
            setIsDiscussing(false);
            setStopRequested(false);
            return;
          }
          const half = Math.ceil(discussionExperts.length / 2);
          discussionExperts.forEach((e, i) => {stanceMap[e.id] = i < half ? 'pro' : 'con';});
          const fallbackContent = `⚠️ AI 배정 실패, 순서대로 배정합니다.\n\n👍 찬성: ${discussionExperts.filter((e) => stanceMap[e.id] === 'pro').map((e) => e.nameKo).join(', ')}\n👎 반대: ${discussionExperts.filter((e) => stanceMap[e.id] === 'con').map((e) => e.nameKo).join(', ')}`;
          setMessages((prev) => prev.map((m) => m.id === analysisId ? { ...m, content: fallbackContent, isStreaming: false } : m));
        }
      }

      setProconStances(stanceMap);

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

      // Build procon settings prompt
      const proconToneMap: Record<string, string> = {
        mild: '정중하고 차분한 어조로 토론하세요.',
        moderate: '논리적이고 단호한 어조로 토론하세요.',
        intense: '열정적이고 강한 어조로 토론하세요. 상대 논리의 허점을 날카롭게 지적하세요.',
      };
      const proconStyleMap: Record<string, string> = {
        formal: '격식체로 답변하세요.',
        casual: '구어체로 자연스럽게 답변하세요.',
        academic: '학술적 표현과 전문 용어를 사용하세요.',
      };
      const proconSettingsExtra = `\n${proconToneMap[debateSettings.debateTone] || ''}` +
        `\n${proconStyleMap[debateSettings.speakingStyle] || ''}` +
        `\n근거와 사례를 ${debateSettings.evidenceCount}개 이상 제시하세요.` +
        (debateSettings.allowEmotional ? '\n감정적 호소도 적절히 활용 가능합니다.' : '\n감정적 호소는 자제하고 논리와 근거 중심으로 토론하세요.');

      for (const { label, round, experts: sideExperts, side } of rounds) {
        if (shouldStop()) break;
        setMessages((prev) => [...prev, { id: `round-sep-${label}-${Date.now()}`, expertId: '__round__', content: label, round }]);
        for (const expert of sideExperts) {
          if (shouldStop()) break;
          setActiveExpertId(expert.id);
          const sideLabel = stanceMap[expert.id] === 'pro' ? '찬성' : '반대';
          const extra = (round !== 'final' ?
          `\n\n당신은 이 주제에 대해 스스로 "${sideLabel}" 입장을 선택했습니다. ${sideLabel === '찬성' ? '찬성하는 입장에서' : '반대하는 입장에서'} 강하게 주장해주세요.` :
          `\n\n최종 라운드입니다. 당신은 "${sideLabel}" 입장이었습니다. 토론을 통해 입장이 변했다면 그 이유를 설명하고, 최종 입장을 정리해주세요.`) + proconSettingsExtra;
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
      // Build brainstorm settings prompt
      const bsFormatMap: Record<string, string> = {
        list: '번호 매긴 목록 형식으로 아이디어를 제시하세요.',
        mindmap: '마인드맵 구조(중심→가지→세부)로 아이디어를 정리하세요.',
        table: '표 형식(| 아이디어 | 설명 | 장점 | 단점 |)으로 정리하세요.',
        free: '',
      };
      const bsCreativityMap: Record<string, string> = {
        realistic: '현실적이고 즉시 실행 가능한 아이디어에 집중하세요.',
        balanced: '현실적 아이디어와 혁신적 아이디어를 균형있게 제시하세요.',
        radical: '파격적이고 급진적인 아이디어를 과감하게 제시하세요. 기존 틀을 완전히 깨세요.',
      };
      const bsSettingsExtra =
        (bsFormatMap[debateSettings.ideaFormat] ? `\n${bsFormatMap[debateSettings.ideaFormat]}` : '') +
        `\n아이디어를 최소 ${debateSettings.ideaCount}개 이상 제시하세요.` +
        (debateSettings.deduplication ? '\n다른 참여자와 중복되는 아이디어는 피하고 새로운 관점만 제시하세요.' : '') +
        (bsCreativityMap[debateSettings.creativityLevel] ? `\n${bsCreativityMap[debateSettings.creativityLevel]}` : '');

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
          const extra = `\n\n[${fw.nameKo}] ${fwRound.label}\n${fwRound.instruction}` + bsSettingsExtra;
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
        cost: '비용 구조, 수익성, 경제적 타당성을 파고드세요.',
        risk: '잠재적 리스크, 실패 시나리오, 위험 요소를 집중 추궁하세요.',
        legal: '법적 쟁점, 규제 이슈, 컴플라이언스 문제를 파고드세요.',
        social: '사회적 영향, 이해관계자 반응, 공공성 문제를 추궁하세요.',
      };
      const pressure = debateSettings.hearingPressure || 'moderate';
      const focus = debateSettings.hearingFocus || 'overall';
      const pressureInst = pressureMap[pressure];
      const focusInst = focusMap[focus];
      const scoringInst = debateSettings.ideaScoring ? '\n최종 평가 시 10점 만점 기준으로 점수를 매기세요: 실현성 ?점, 혁신성 ?점, 시장성 ?점, 종합 ?점.' : '';
      const investorInst = debateSettings.investorSimulation ? '\n투자자 관점에서 평가하세요. "이 아이디어에 투자할 것인가?"를 핵심 질문으로 삼고, ROI, 시장 규모, 경쟁 우위를 중심으로 판단하세요.' : '';

      const hearingPhases = [
        { label: '📋 모두발언', round: 'initial' as const,
          instruction: `[아이디어 검증 — 모두발언]\n이 주제에 대해 당신의 전문 분야 관점에서 핵심 요약과 초기 평가를 제시하세요. 이후 청문 질의에서 깊이 파고들 부분을 예고하세요.${investorInst}` },
        { label: '🎤 전문가 질의', round: 'rebuttal' as const,
          instruction: `[아이디어 검증 — 전문가 질의]\n당신은 "${'{expertName}'}" 위원입니다. 당신의 전문 분야에서 이 주제의 약점, 모호한 점, 검증이 필요한 부분을 날카롭게 질문하세요. ${focusInst}${pressureInst}${investorInst}\n\n반드시 구체적인 질문 형태로 제시하고, 왜 그 질문이 중요한지 간략히 설명하세요. 질문은 최소 2개 이상 제시하세요.` },
        { label: '🔥 추가 심문', round: 'rebuttal' as const,
          instruction: `[아이디어 검증 — 추가 심문]\n이전 질의에서 드러난 약점과 회피한 부분을 집중 추궁하세요. 다른 위원들의 질의도 참고하여 아직 해결되지 않은 핵심 쟁점을 파고드세요.${pressureInst}\n\n"앞서 ~라고 했는데, 그렇다면 ~은 어떻게 설명하시겠습니까?" 형식으로 추궁하세요.` },
        { label: '⚖️ 최종 평가', round: 'final' as const,
          instruction: `[아이디어 검증 — 최종 평가]\n검증을 종합하여 당신의 최종 평가를 내리세요.\n\n1. 검증 결과 (통과/조건부 통과/부적격)\n2. 확인된 강점\n3. 드러난 약점\n4. 보완 필요 사항\n5. 종합 의견 (1-2문장)${scoringInst}${investorInst}\n\n전문가로서 엄격하지만 공정하게 판정하세요.` },
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

  // Topic clarification — 토론 모드에서 주제 확인 UI 표시
  const clarifyTopic = useCallback((input: string, mode: DiscussionMode) => {
    setClarifyState({
      show: true, loading: true, originalInput: input,
      suggestions: [{ topic: input, description: '입력한 주제 그대로 사용' }],
      customEdit: input,
    });
    // 주제 확인 UI로 스크롤
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
    fetch('/api/clarify-topic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, mode }),
    }).then(r => r.json()).then(data => {
      const suggestions = data.suggestions?.length > 0
        ? data.suggestions
        : [{ topic: data.refined || input, description: '입력한 주제 그대로 사용' }];
      setClarifyState(prev => ({ ...prev, loading: false, suggestions, customEdit: suggestions[0]?.topic || input }));
    }).catch(() => {
      setClarifyState(prev => ({ ...prev, loading: false }));
    });
  }, []);

  const startDiscussion = useCallback(async (question: string, overrideExpertIds?: string[], overrideMode?: DiscussionMode) => {
    if (clarifyState.show) return;
    const useMode = overrideMode || discussionMode;
    const debateModes = ['standard', 'procon', 'brainstorm', 'hearing'];
    if (debateModes.includes(useMode)) {
      clarifyTopic(question, useMode);
      return;
    }
    runDiscussion(question, overrideExpertIds, overrideMode);
  }, [discussionMode, clarifyState.show, clarifyTopic, runDiscussion]);

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

  // Floating memo
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoText, setMemoText] = useState(() => localStorage.getItem('dev-memo') || '');
  const saveMemo = (text: string) => { setMemoText(text); localStorage.setItem('dev-memo', text); };

  // Scroll to bottom
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
  }, []);
  const scrollToBottom = () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });

  // Mode-specific chat variant
  const getChatVariant = (msg: DiscussionMessage): ChatVariant => {
    const mainMode = getMainMode(discussionMode);
    if (mainMode === 'general') return 'messenger';
    if (discussionMode === 'brainstorm') return 'postit';
    if (discussionMode === 'hearing') return 'hearing';
    if (discussionMode === 'expert') return 'report';
    if (discussionMode === 'procon') {
      // Determine pro/con from the message's expert stance
      const expertId = msg.expertId;
      if (proconStances[expertId] === 'pro') return 'procon-pro';
      if (proconStances[expertId] === 'con') return 'procon-con';
      return 'default';
    }
    return 'default';
  };

  // Generate conclusion on demand (다중 AI)
  const generateConclusion = useCallback(async () => {
    if (isDiscussing) return;
    setIsDiscussing(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const allResponses = messages
      .filter(m => m.expertId !== '__round__' && m.expertId !== '__user__' && m.content)
      .map(m => {
        const e = [...experts, SUMMARIZER_EXPERT, CONCLUSION_EXPERT].find(ex => ex.id === m.expertId);
        return { name: e?.nameKo || '', content: m.content };
      });

    setActiveExpertId(CONCLUSION_EXPERT.id);
    const conclusionId = `conclusion-ondemand-${Date.now()}`;
    setMessages(prev => [...prev, { id: conclusionId, expertId: CONCLUSION_EXPERT.id, content: '', isStreaming: true, isSummary: true }]);
    let conclusionContent = '';
    try {
      await streamExpert({
        question: currentQuestion, expert: { ...CONCLUSION_EXPERT, systemPrompt: `여러 AI/전문가의 의견을 종합하여 한국어로 결론을 작성하세요.

## 🎯 종합 결론

### 핵심 답변
(질문에 대한 직접적 답변 2-3문장)

### 주요 근거
1. **(근거 1)** — 설명
2. **(근거 2)** — 설명

### 실행 제안
- (구체적 제안 1)
- (구체적 제안 2)

> 💡 **한 줄 요약:** (핵심 한 문장)

전문가 이름을 언급하지 말고, 모든 관점을 통합한 하나의 답변을 작성하세요.` },
        previousResponses: allResponses, round: 'summary',
        onDelta: chunk => { conclusionContent += chunk; setMessages(prev => prev.map(m => m.id === conclusionId ? { ...m, content: conclusionContent } : m)); },
        onDone: () => { setMessages(prev => prev.map(m => m.id === conclusionId ? { ...m, isStreaming: false } : m)); },
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(prev => prev.map(m => m.id === conclusionId ? { ...m, content: `⚠️ 결론 생성 실패`, isStreaming: false } : m));
      }
    }
    setActiveExpertId(undefined);
    setIsDiscussing(false);
  }, [messages, experts, currentQuestion, isDiscussing]);

  // Multi AI view state
  const [multiActiveTab, setMultiActiveTab] = useState<string | null>(null);
  const [multiView, setMultiView] = useState<'overview' | 'detail' | 'compare'>('overview');
  const [multiCompareIds, setMultiCompareIds] = useState<[string, string] | null>(null);
  const [multiVotes, setMultiVotes] = useState<Record<string, number>>({});
  const [multiPinned, setMultiPinned] = useState<Set<string>>(new Set());


  // Keyboard nav for multi detail view
  useEffect(() => {
    if (discussionMode !== 'multi' || multiView !== 'detail') return;
    const handler = (e: KeyboardEvent) => {
      const expertMsgs = messages.filter(m => m.expertId !== '__round__' && m.expertId !== '__user__' && !m.isSummary);
      const parts = activeExperts.filter(ex => expertMsgs.some(m => m.expertId === ex.id));
      const idx = parts.findIndex(ex => ex.id === multiActiveTab);
      if (e.key === 'ArrowLeft' && idx > 0) { setMultiActiveTab(parts[idx - 1].id); }
      else if (e.key === 'ArrowRight' && idx < parts.length - 1) { setMultiActiveTab(parts[idx + 1].id); }
      else if (e.key === 'Escape') { setMultiView('overview'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [discussionMode, multiView, multiActiveTab, messages, activeExperts]);

  // Ask single AI follow-up (multi mode)
  const askSingleAI = useCallback(async (expertId: string, followUpQ: string) => {
    if (isDiscussing) return;
    const expert = experts.find(e => e.id === expertId);
    if (!expert) return;
    setIsDiscussing(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setActiveExpertId(expert.id);
    const prevResponses = messages.filter(m => m.expertId === expertId && m.content).map(m => ({ name: expert.nameKo, content: m.content }));
    const msgId = `${expertId}-followup-${Date.now()}`;
    setMessages(prev => [...prev, { id: `user-followup-${Date.now()}`, expertId: '__user__', content: `💬 ${expert.nameKo}에게: ${followUpQ}` }, { id: msgId, expertId, content: '', isStreaming: true }]);
    let fullContent = '';
    try {
      await streamExpert({ question: followUpQ, expert: { ...expert, systemPrompt: expert.systemPrompt + '\n\n이전에 이 주제에 대해 답변한 적이 있습니다. 사용자의 추가 질문에 이전 답변을 바탕으로 더 깊이 답변해주세요.' },
        previousResponses: prevResponses, round: 'initial',
        onDelta: chunk => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
        onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m)); },
        signal: controller.signal });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: `⚠️ 오류: ${(err as Error).message}`, isStreaming: false } : m));
      }
    }
    setActiveExpertId(undefined);
    setIsDiscussing(false);
  }, [experts, messages, isDiscussing]);

  // Follow-up question — continues conversation with full context
  const handleFollowUp = useCallback(async (question: string) => {
    if (isDiscussing) return;
    const mode = getMainMode(discussionMode);

    // 단일 AI / 어시스턴트: 같은 AI에게 이어서 대화
    if (mode === 'general' || discussionMode === 'assistant' || discussionMode === 'expert') {
      const expert = activeExperts[0];
      if (!expert) return;
      setIsDiscussing(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setActiveExpertId(expert.id);

      // 이전 대화 전체를 맥락으로 전달
      const prevResponses = messages
        .filter(m => m.expertId !== '__round__' && m.content)
        .map(m => {
          if (m.expertId === '__user__') return { name: '사용자', content: m.content };
          const e = allExperts.find(ex => ex.id === m.expertId);
          return { name: e?.nameKo || '', content: m.content };
        });

      const userMsgId = `user-${Date.now()}`;
      const replyId = `${expert.id}-reply-${Date.now()}`;
      setMessages(prev => [...prev,
        { id: userMsgId, expertId: '__user__', content: question },
        { id: replyId, expertId: expert.id, content: '', isStreaming: true }
      ]);

      let fullContent = '';
      try {
        await streamExpert({
          question, expert,
          previousResponses: prevResponses, round: 'initial',
          onDelta: chunk => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === replyId ? { ...m, content: fullContent } : m)); },
          onDone: () => { setMessages(prev => prev.map(m => m.id === replyId ? { ...m, isStreaming: false } : m)); },
          signal: controller.signal,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setMessages(prev => prev.map(m => m.id === replyId ? { ...m, content: `⚠️ 오류: ${(err as Error).message}`, isStreaming: false } : m));
        }
      }
      setActiveExpertId(undefined);
      setIsDiscussing(false);
      return;
    }

    // 다중 AI: 모든 AI에게 동시 후속 질문
    if (discussionMode === 'multi') {
      setIsDiscussing(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const prevAll = messages.filter(m => m.expertId !== '__round__' && m.content).map(m => {
        if (m.expertId === '__user__') return { name: '사용자', content: m.content };
        const e = allExperts.find(ex => ex.id === m.expertId);
        return { name: e?.nameKo || '', content: m.content };
      });
      setMessages(prev => [...prev, { id: `user-multi-${Date.now()}`, expertId: '__user__', content: question, timestamp: Date.now() }]);
      setMultiView('overview');

      for (const expert of activeExperts) {
        if (controller.signal.aborted) break;
        setActiveExpertId(expert.id);
        const msgId = `${expert.id}-followup-${Date.now()}`;
        setMessages(prev => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, timestamp: Date.now() }]);
        let fullContent = '';
        try {
          await streamExpert({ question, expert: { ...expert, systemPrompt: expert.systemPrompt + '\n\n이전 대화 맥락을 참고하여 후속 질문에 답변하세요.' },
            previousResponses: prevAll, round: 'initial',
            onDelta: chunk => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
            onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m)); },
            signal: controller.signal });
        } catch (err) {
          if ((err as Error).name === 'AbortError') break;
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: `⚠️ 오류`, isStreaming: false } : m));
        }
        prevAll.push({ name: expert.nameKo, content: fullContent });
        await new Promise(r => setTimeout(r, 300));
      }
      setActiveExpertId(undefined);
      setIsDiscussing(false);
      return;
    }

    // 다른 모드: 새 토론 시작
    startDiscussion(question);
  }, [isDiscussing, discussionMode, activeExperts, messages, allExperts, startDiscussion]);

  // Export discussion as markdown
  const exportDiscussion = () => {
    const text = messages.filter(m => m.expertId !== '__round__' && m.expertId !== '__user__').map(msg => {
      const expert = allExperts.find(e => e.id === msg.expertId);
      return `## ${expert?.nameKo || '알 수 없음'}\n\n${msg.content}`;
    }).join('\n\n---\n\n');
    const md = `# ${currentQuestion}\n\n${text}`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personai-${new Date().toISOString().slice(0,10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Round progress
  const roundProgress = (() => {
    if (!isDiscussing) return null;
    const roundMsgs = messages.filter(m => m.expertId === '__round__');
    if (roundMsgs.length === 0) return null;
    const totalRounds = debateSettings.rounds || 3;
    return { current: roundMsgs.length, total: totalRounds };
  })();

  // Active expert info
  const activeExpert = activeExpertId ? allExperts.find(e => e.id === activeExpertId) : null;

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="h-screen flex w-full bg-white dark:bg-[#0f1117]">
        {/* Floating Memo */}
        <div className={cn('fixed left-0 top-1/3 z-40 transition-all duration-200', memoOpen ? 'w-64' : 'w-0')}>
          {memoOpen && (
            <div className="w-64 h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-r-xl shadow-lg flex flex-col animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-tr-xl">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">📝 메모장</span>
                <button onClick={() => setMemoOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[14px]">✕</button>
              </div>
              <textarea
                value={memoText}
                onChange={e => saveMemo(e.target.value)}
                placeholder="메모를 입력하세요..."
                className="flex-1 p-3 text-[12px] outline-none resize-none bg-transparent text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600"
              />
              <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-700 text-[9px] text-slate-300 dark:text-slate-500 text-right">자동 저장</div>
            </div>
          )}
          {!memoOpen && (
            <button onClick={() => setMemoOpen(true)}
              className="absolute left-0 top-0 w-8 h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-l-0 rounded-r-lg shadow-sm flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <span className="text-[14px]">📝</span>
            </button>
          )}
        </div>
        <AppSidebar
          experts={experts}
          onLoadHistory={loadHistory}
          onUpdateExperts={setExperts}
          discussionMode={discussionMode}
          onModeChange={handleModeChange}
          isDiscussing={isDiscussing}
          onNewDiscussion={handleNewDiscussion} />


        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          {/* Scroll to bottom FAB */}
          {showScrollBtn && (
            <button onClick={scrollToBottom}
              className="absolute bottom-20 right-6 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-all animate-in fade-in zoom-in-75 duration-200">
              <ArrowDown className="w-3 h-3 text-slate-500" />
              {isDiscussing && <span className="text-[10px] font-medium text-primary">새 메시지</span>}
            </button>
          )}

          {/* Main scroll area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin" onScroll={handleScroll}>
            <div className={cn(
              'mx-auto px-4 sm:px-6 pt-16 pb-6',
              !selectable ? 'max-w-3xl space-y-2.5'
                : (discussionMode === 'assistant' || discussionMode === 'expert') ? 'max-w-4xl space-y-3'
                : 'max-w-2xl space-y-3'
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
                  selectedFramework={selectedFramework}
                  onFrameworkChange={setSelectedFramework}
                  discussionIssues={discussionIssues}
                  onDiscussionIssuesChange={setDiscussionIssues}
                  debateIntensity={debateIntensity}
                  onDebateIntensityChange={setDebateIntensity}
                  onBulkSelect={setSelectedExpertIds}
                />
              )}

              {/* Topic clarification overlay */}
              {clarifyState.show && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                    {/* Header — 토론 주최자 */}
                    <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <span className="text-[18px]">🎙️</span>
                        </div>
                        <div>
                          <h3 className="text-[14px] font-bold text-slate-800">토론 주최자</h3>
                          <p className="text-[11px] text-slate-400">토론을 시작하기 전에 주제를 확인합니다</p>
                        </div>
                      </div>
                    </div>

                    {clarifyState.loading ? (
                      <div className="px-5 py-8 text-center">
                        <div className="flex justify-center gap-1.5 mb-3">
                          <span className="typing-dot w-2 h-2 rounded-full bg-primary/50" />
                          <span className="typing-dot w-2 h-2 rounded-full bg-primary/50" />
                          <span className="typing-dot w-2 h-2 rounded-full bg-primary/50" />
                        </div>
                        <p className="text-[12px] text-slate-400">입력을 분석하고 있습니다...</p>
                      </div>
                    ) : (
                      <div className="p-5 space-y-4">
                        {/* Original input */}
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50">
                          <span className="text-[10px] font-semibold text-slate-400 shrink-0">입력</span>
                          <span className="text-[12px] text-slate-600 font-medium">{clarifyState.originalInput}</span>
                        </div>

                        {/* Suggestion cards */}
                        {clarifyState.suggestions.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">추천 주제</p>
                            {clarifyState.suggestions.map((s, i) => (
                              <button key={i} type="button"
                                onClick={() => { setClarifyState(prev => ({ ...prev, show: false })); runDiscussion(s.topic); }}
                                className={cn(
                                  'w-full text-left px-4 py-3 rounded-xl border transition-all group/sug',
                                  'border-slate-200 hover:border-primary hover:bg-primary/5 hover:shadow-md'
                                )}>
                                <div className="flex items-start gap-3">
                                  <span className="w-6 h-6 rounded-full bg-slate-100 group-hover/sug:bg-primary/10 flex items-center justify-center text-[11px] font-bold text-slate-400 group-hover/sug:text-primary shrink-0 mt-0.5">{i + 1}</span>
                                  <div className="flex-1">
                                    <p className="text-[13px] font-semibold text-slate-700 group-hover/sug:text-primary leading-snug">{s.topic}</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">{s.description}</p>
                                  </div>
                                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover/sug:text-primary shrink-0 mt-1 opacity-0 group-hover/sug:opacity-100 transition-all" />
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Custom edit */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">직접 입력</p>
                          <div className="flex gap-2">
                            <input type="text" value={clarifyState.customEdit}
                              onChange={e => setClarifyState(prev => ({ ...prev, customEdit: e.target.value }))}
                              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                              placeholder="주제를 직접 입력하세요..."
                              onKeyDown={e => { if (e.key === 'Enter' && clarifyState.customEdit.trim()) { setClarifyState(prev => ({ ...prev, show: false })); runDiscussion(clarifyState.customEdit.trim()); } }}
                            />
                            <button onClick={() => { if (clarifyState.customEdit.trim()) { setClarifyState(prev => ({ ...prev, show: false })); runDiscussion(clarifyState.customEdit.trim()); } }}
                              className="px-4 py-2.5 rounded-xl bg-slate-800 text-white text-[12px] font-semibold hover:bg-slate-700 transition-colors shadow-sm shrink-0">
                              시작
                            </button>
                          </div>
                        </div>

                        {/* Cancel */}
                        <button onClick={() => setClarifyState({ show: false, loading: false, originalInput: '', suggestions: [], customEdit: '' })}
                          className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 py-1 transition-colors">
                          취소
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* #3 Mode indicator bar */}
              {currentQuestion && messages.length > 0 && (
                <div className="flex items-center gap-2 px-1 py-1">
                  <span className="text-[10px] font-bold text-primary bg-primary/8 px-2 py-0.5 rounded-md">
                    {discussionMode === 'general' ? '단일 AI' : discussionMode === 'multi' ? '다중 AI' : discussionMode === 'expert' ? '전문가' : discussionMode === 'standard' ? '심층토론' : discussionMode === 'procon' ? '찬반토론' : discussionMode === 'brainstorm' ? '브레인스토밍' : discussionMode === 'hearing' ? '아이디어 검증' : discussionMode === 'assistant' ? '어시스턴트' : ''}
                  </span>
                  <div className="flex items-center gap-1">
                    {activeExperts.slice(0, 5).map(e => (
                      <span key={e.id} className="text-[12px]" title={e.nameKo}>{e.icon || e.nameKo[0]}</span>
                    ))}
                    {activeExperts.length > 5 && <span className="text-[9px] text-slate-400">+{activeExperts.length - 5}</span>}
                  </div>
                </div>
              )}

              {currentQuestion && messages.length > 0 && (
                <div className="flex items-center gap-3 px-1 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-medium text-[13px] leading-snug">{currentQuestion}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isDone && (
                      <button onClick={copyAllResults} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-400 text-[11px] hover:text-slate-600 hover:bg-slate-50 transition-colors">
                        {copiedAll ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        {copiedAll ? '복사됨' : '복사'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Participants display */}
              {currentQuestion && messages.length > 0 && ['standard', 'procon', 'brainstorm', 'hearing'].includes(discussionMode) && activeExperts.length > 0 && (
                <div className="flex items-center gap-1.5 px-1 flex-wrap">
                  {activeExperts.map((expert) => {
                    const role =
                      discussionMode === 'procon' ? (proconStances[expert.id] === 'pro' ? '찬성' : '반대') :
                      undefined;
                    return (
                      <span key={expert.id} className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border',
                        activeExpertId === expert.id ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-white border-slate-100 text-slate-500'
                      )}>
                        <span className="text-[12px]">{expert.icon}</span>
                        {expert.nameKo}
                        {role && <span className={cn('text-[8px] font-bold', role === '찬성' ? 'text-blue-500' : role === '반대' ? 'text-red-500' : 'text-slate-400')}>{role}</span>}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Messages — mode-specific rendering */}
              {discussionMode === 'multi' ? (
                /* Multi AI: enhanced 3-layer view */
                (() => {
                  // 각 전문가의 모든 메시지 (follow-up 포함)
                  const allExpertMsgs = messages.filter(m => m.expertId !== '__round__' && m.expertId !== '__user__' && !m.isSummary);
                  // 각 전문가의 첫 응답 (오버뷰용)
                  const expertMsgs = allExpertMsgs.filter((m, i, arr) => arr.findIndex(x => x.expertId === m.expertId) === i);
                  // 각 전문가의 후속 응답 (상세 보기에서 표시)
                  const getExpertAllMsgs = (id: string) => allExpertMsgs.filter(m => m.expertId === id);
                  const conclusionMsgs = messages.filter(m => m.isSummary);
                  const userMsgs = messages.filter(m => m.expertId === '__user__');
                  const participatingExperts = activeExperts.filter(e => expertMsgs.some(m => m.expertId === e.id));
                  // Sort: pinned first, then by votes
                  const sortedExperts = [...participatingExperts].sort((a, b) => {
                    const ap = multiPinned.has(a.id) ? 1 : 0, bp = multiPinned.has(b.id) ? 1 : 0;
                    if (ap !== bp) return bp - ap;
                    return (multiVotes[b.id] || 0) - (multiVotes[a.id] || 0);
                  });
                  const activeTab = multiActiveTab || sortedExperts[0]?.id || null;
                  const activeIdx = sortedExperts.findIndex(e => e.id === activeTab);
                  const prevExpert = activeIdx > 0 ? sortedExperts[activeIdx - 1] : null;
                  const nextExpert = activeIdx < sortedExperts.length - 1 ? sortedExperts[activeIdx + 1] : null;

                  return (
                    <div className="space-y-3">
                      {/* View mode switcher — compact inline */}
                      {sortedExperts.length > 1 && !isDiscussing && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                            {([['overview', '전체'], ['detail', '상세'], ['compare', '비교']] as const).map(([v, label]) => (
                              <button key={v} onClick={() => {
                                setMultiView(v as any);
                                if (v === 'compare' && sortedExperts.length >= 2) setMultiCompareIds([sortedExperts[0].id, sortedExperts[1].id]);
                              }} className={cn('px-3 py-1 rounded-md text-[10px] font-semibold transition-all',
                                multiView === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
                                {label}
                              </button>
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-400">{sortedExperts.length}개 AI 응답</span>
                        </div>
                      )}

                      {/* ── Layer 1: Overview ── */}
                      {(multiView === 'overview' || isDiscussing) && (
                        <div className={cn('grid gap-3', sortedExperts.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
                          {sortedExperts.map((expert, ei) => {
                            const msg = expertMsgs.find(m => m.expertId === expert.id);
                            if (!msg) return null;
                            const preview = msg.content.slice(0, 180);
                            const votes = multiVotes[expert.id] || 0;
                            const isPinned = multiPinned.has(expert.id);
                            const charCount = msg.content.length;
                            const accentColors = ['border-t-blue-400', 'border-t-emerald-400', 'border-t-violet-400', 'border-t-amber-400', 'border-t-rose-400', 'border-t-cyan-400'];
                            const accent = accentColors[ei % accentColors.length];
                            return (
                              <div key={expert.id} className={cn(
                                'rounded-xl border border-slate-100 bg-white overflow-hidden transition-all border-t-2',
                                accent,
                                isPinned && 'ring-1 ring-amber-100',
                                !isDiscussing && 'hover:shadow-lg hover:-translate-y-0.5'
                              )}>
                                {/* Header */}
                                <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                                  <ExpertAvatar expert={expert} size="xs" active={msg.isStreaming} />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-[12px] font-bold text-slate-800">{expert.nameKo}</span>
                                    {!msg.isStreaming && charCount > 0 && <span className="text-[9px] text-slate-300 ml-1.5">{charCount}자</span>}
                                  </div>
                                  {isPinned && <span className="text-[11px]">📌</span>}
                                  {msg.isStreaming && <span className="flex gap-0.5"><span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/50" /><span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/50" /><span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/50" /></span>}
                                </div>
                                {/* Preview */}
                                <button type="button" onClick={() => { setMultiActiveTab(expert.id); if (!isDiscussing) setMultiView('detail'); }}
                                  className="w-full text-left px-3.5 py-2 text-[12px] leading-relaxed text-slate-600 line-clamp-5 hover:bg-slate-50/50 transition-colors min-h-[80px]">
                                  {preview || (msg.isStreaming ? '응답 생성 중...' : '')}
                                  {charCount > 180 && <span className="text-slate-300">...</span>}
                                </button>
                                {/* Actions */}
                                {!isDiscussing && (
                                  <div className="flex items-center gap-1.5 px-3 py-2 border-t border-slate-50 bg-slate-50/30">
                                    <button onClick={() => setMultiVotes(prev => ({ ...prev, [expert.id]: (prev[expert.id] || 0) + 1 }))}
                                      className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all',
                                        votes > 0 ? 'text-primary bg-primary/8' : 'text-slate-400 hover:text-slate-600 hover:bg-white')}>
                                      👍 {votes > 0 ? `${votes}표` : '추천'}
                                    </button>
                                    <button onClick={() => setMultiPinned(prev => { const n = new Set(prev); if (n.has(expert.id)) n.delete(expert.id); else n.add(expert.id); return n; })}
                                      className={cn('px-2 py-0.5 rounded-md text-[10px] font-medium transition-all',
                                        isPinned ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-slate-600 hover:bg-white')}>
                                      {isPinned ? '고정됨' : '고정'}
                                    </button>
                                    <span className="flex-1" />
                                    <button onClick={() => { setMultiActiveTab(expert.id); setMultiView('detail'); }}
                                      className="text-[10px] font-medium text-primary/60 hover:text-primary transition-colors">자세히 →</button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* ── Layer 2: Detail ── */}
                      {multiView === 'detail' && !isDiscussing && (() => {
                        const activeMsgs = getExpertAllMsgs(activeTab || '');
                        const activeExp = allExperts.find(e => e.id === activeTab);
                        if (!activeMsgs.length || !activeExp) return null;
                        // 해당 AI에게 보낸 유저 메시지도 포함
                        const relatedUserMsgs = userMsgs.filter(m => m.content.includes(activeExp.nameKo));
                        return (
                          <div className="space-y-2">
                            {/* Tab bar with votes */}
                            <div className="flex gap-1 overflow-x-auto scrollbar-none">
                              {sortedExperts.map(expert => {
                                const votes = multiVotes[expert.id] || 0;
                                const followUpCount = getExpertAllMsgs(expert.id).length;
                                return (
                                  <button key={expert.id} onClick={() => setMultiActiveTab(expert.id)}
                                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all shrink-0 text-[11px] font-medium',
                                      activeTab === expert.id ? 'bg-white border-slate-200 shadow-sm text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50')}>
                                    <ExpertAvatar expert={expert} size="xs" />
                                    {expert.nameKo}
                                    {followUpCount > 1 && <span className="text-[9px] bg-slate-100 text-slate-400 px-1 rounded">{followUpCount}</span>}
                                    {votes > 0 && <span className="text-[9px] text-primary">👍{votes}</span>}
                                  </button>
                                );
                              })}
                            </div>
                            {/* All responses from this AI (including follow-ups) */}
                            {activeMsgs.map((msg, i) => (
                              <div key={msg.id}>
                                {i > 0 && relatedUserMsgs[i - 1] && (
                                  <div className="bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2 text-[11.5px] text-slate-500 mb-2">
                                    {relatedUserMsgs[i - 1].content}
                                  </div>
                                )}
                                <DiscussionMessageCard message={msg} expert={activeExp} variant="default"
                                  onLike={handleLike} onDislike={handleDislike} onRebuttal={isDone ? handleRebuttal : undefined} />
                              </div>
                            ))}
                            {/* Navigation + Ask bar */}
                            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                              {/* Prev/Next */}
                              <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 border-b border-slate-100">
                                {prevExpert ? (
                                  <button onClick={() => setMultiActiveTab(prevExpert.id)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-white transition-all">
                                    ← {prevExpert.nameKo}
                                  </button>
                                ) : <div />}
                                <button onClick={() => setMultiView('overview')}
                                  className="px-3 py-1 rounded-lg text-[10px] font-medium text-slate-400 hover:text-slate-700 hover:bg-white transition-all">
                                  📋 전체 보기
                                </button>
                                {nextExpert ? (
                                  <button onClick={() => setMultiActiveTab(nextExpert.id)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-white transition-all">
                                    {nextExpert.nameKo} →
                                  </button>
                                ) : <div />}
                              </div>
                              {/* Ask this AI */}
                              {isDone && (
                                <div className="flex items-center gap-2 px-3 py-2">
                                  <ExpertAvatar expert={activeExp} size="xs" />
                                  <input type="text" placeholder={`${activeExp.nameKo}에게 추가 질문...`}
                                    className="flex-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                                    onKeyDown={e => { if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) { askSingleAI(activeExp.id, (e.target as HTMLInputElement).value.trim()); (e.target as HTMLInputElement).value = ''; } }} />
                                  <button onClick={() => { const input = document.querySelector<HTMLInputElement>(`input[placeholder*="${activeExp.nameKo}"]`); if (input?.value.trim()) { askSingleAI(activeExp.id, input.value.trim()); input.value = ''; } }}
                                    className="px-4 py-2 rounded-lg bg-slate-800 text-white text-[11px] font-semibold hover:bg-slate-700 transition-colors shadow-sm">질문</button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* ── Layer 3: Compare ── */}
                      {multiView === 'compare' && !isDiscussing && multiCompareIds && (() => {
                        const [leftId, rightId] = multiCompareIds;
                        const leftMsg = expertMsgs.find(m => m.expertId === leftId);
                        const rightMsg = expertMsgs.find(m => m.expertId === rightId);
                        const leftExp = allExperts.find(e => e.id === leftId);
                        const rightExp = allExperts.find(e => e.id === rightId);
                        return (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-3">
                              {[0, 1].map(side => (
                                <select key={side} value={multiCompareIds[side]}
                                  onChange={e => { const next = [...multiCompareIds] as [string, string]; next[side] = e.target.value; setMultiCompareIds(next); }}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-primary/20">
                                  {sortedExperts.map(exp => (<option key={exp.id} value={exp.id}>{exp.nameKo}</option>))}
                                </select>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              {leftMsg && leftExp && <DiscussionMessageCard message={leftMsg} expert={leftExp} variant="default" onLike={handleLike} onDislike={handleDislike} />}
                              {rightMsg && rightExp && <DiscussionMessageCard message={rightMsg} expert={rightExp} variant="default" onLike={handleLike} onDislike={handleDislike} />}
                            </div>
                          </div>
                        );
                      })()}

                      {/* User follow-up messages */}
                      {userMsgs.map(msg => (
                        <div key={msg.id} className="bg-white border border-slate-100 rounded-xl px-3.5 py-2.5 text-[12.5px] text-slate-600">
                          <ReactMarkdownInline content={msg.content} />
                        </div>
                      ))}

                      {/* Conclusion */}
                      {conclusionMsgs.map(msg => {
                        const expert = allExperts.find(e => e.id === msg.expertId);
                        if (!expert) return null;
                        return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="default" />;
                      })}

                    </div>
                  );
                })()
              ) : discussionMode === 'procon' ? (
                /* Procon: left-right split layout */
                (() => {
                  const groups: { round?: typeof messages[0]; msgs: typeof messages }[] = [];
                  let current: typeof messages = [];
                  for (const msg of messages) {
                    if (msg.expertId === '__round__') {
                      if (current.length) groups.push({ msgs: current });
                      groups.push({ round: msg, msgs: [] });
                      current = [];
                    } else {
                      current.push(msg);
                    }
                  }
                  if (current.length) groups.push({ msgs: current });

                  return groups.map((g, gi) => {
                    if (g.round) {
                      const isCollapsed = collapsedRounds.has(g.round.id);
                      return (
                        <RoundSeparator key={g.round.id} msg={g.round} isCollapsed={isCollapsed}
                          onToggle={() => setCollapsedRounds(prev => { const n = new Set(prev); if (n.has(g.round!.id)) n.delete(g.round!.id); else n.add(g.round!.id); return n; })}
                          count={groups[gi + 1]?.msgs?.length || 0} />
                      );
                    }
                    const prevRound = groups.slice(0, gi).reverse().find(g2 => g2.round);
                    if (prevRound?.round && collapsedRounds.has(prevRound.round.id)) return null;
                    const proMsgs = g.msgs.filter(m => m.expertId !== '__user__' && proconStances[m.expertId] === 'pro');
                    const conMsgs = g.msgs.filter(m => m.expertId !== '__user__' && proconStances[m.expertId] === 'con');
                    const otherMsgs = g.msgs.filter(m => m.expertId !== '__user__' && !proconStances[m.expertId]);
                    // If no stance info yet (e.g. analysis phase), render sequentially
                    if (proMsgs.length === 0 && conMsgs.length === 0) {
                      return (
                        <div key={`procon-seq-${gi}`} className="space-y-2.5">
                          {g.msgs.filter(m => m.expertId !== '__user__').map(msg => {
                            const expert = allExperts.find(e => e.id === msg.expertId);
                            if (!expert) return null;
                            return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant={getChatVariant(msg)} onLike={handleLike} onDislike={handleDislike} />;
                          })}
                        </div>
                      );
                    }
                    return (
                      <div key={`procon-split-${gi}`} className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-3">
                          {/* Pro column */}
                          <div className="space-y-2">
                            {gi === 0 && proMsgs.length > 0 && <div className="text-center text-[10px] font-bold text-blue-500 uppercase tracking-wider py-1">찬성</div>}
                            {proMsgs.map(msg => {
                              const expert = allExperts.find(e => e.id === msg.expertId);
                              if (!expert) return null;
                              return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="procon-pro" onLike={handleLike} onDislike={handleDislike} />;
                            })}
                          </div>
                          {/* Con column */}
                          <div className="space-y-2">
                            {gi === 0 && conMsgs.length > 0 && <div className="text-center text-[10px] font-bold text-red-500 uppercase tracking-wider py-1">반대</div>}
                            {conMsgs.map(msg => {
                              const expert = allExperts.find(e => e.id === msg.expertId);
                              if (!expert) return null;
                              return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="procon-con" onLike={handleLike} onDislike={handleDislike} />;
                            })}
                          </div>
                        </div>
                        {/* Other messages (summary, conclusion) rendered full width */}
                        {otherMsgs.map(msg => {
                          const expert = allExperts.find(e => e.id === msg.expertId);
                          if (!expert) return null;
                          return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="default" onLike={handleLike} onDislike={handleDislike} />;
                        })}
                      </div>
                    );
                  });
                })()
              ) : discussionMode === 'brainstorm' ? (
                /* Brainstorm: grid layout */
                (() => {
                  const groups: { round?: typeof messages[0]; msgs: typeof messages }[] = [];
                  let current: typeof messages = [];
                  for (const msg of messages) {
                    if (msg.expertId === '__round__') {
                      if (current.length) groups.push({ msgs: current });
                      groups.push({ round: msg, msgs: [] });
                      current = [];
                    } else {
                      current.push(msg);
                    }
                  }
                  if (current.length) groups.push({ msgs: current });

                  return groups.map((g, gi) => {
                    if (g.round) {
                      const isCollapsed = collapsedRounds.has(g.round.id);
                      return (
                        <RoundSeparator key={g.round.id} msg={g.round} isCollapsed={isCollapsed}
                          onToggle={() => setCollapsedRounds(prev => { const n = new Set(prev); if (n.has(g.round!.id)) n.delete(g.round!.id); else n.add(g.round!.id); return n; })}
                          count={groups[gi + 1]?.msgs?.length || 0} />
                      );
                    }
                    // Check if collapsed
                    const prevRound = groups.slice(0, gi).reverse().find(g2 => g2.round);
                    if (prevRound?.round && collapsedRounds.has(prevRound.round.id)) return null;
                    return (
                      <div key={`grid-${gi}`} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {g.msgs.filter(m => m.expertId !== '__user__').map(msg => {
                          const expert = allExperts.find(e => e.id === msg.expertId);
                          if (!expert) return null;
                          return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="postit" onLike={handleLike} onDislike={handleDislike} />;
                        })}
                      </div>
                    );
                  });
                })()
              ) : (
                /* All other modes: sequential */
                messages.map((msg, idx) => {
                  if (msg.expertId === '__round__') {
                    const isCollapsed = collapsedRounds.has(msg.id);
                    let roundMsgCount = 0;
                    for (let i = idx + 1; i < messages.length; i++) {
                      if (messages[i].expertId === '__round__') break;
                      if (messages[i].expertId !== '__user__') roundMsgCount++;
                    }
                    return <RoundSeparator key={msg.id} msg={msg} isCollapsed={isCollapsed}
                      onToggle={() => setCollapsedRounds(prev => { const n = new Set(prev); if (n.has(msg.id)) n.delete(msg.id); else n.add(msg.id); return n; })}
                      count={roundMsgCount} />;
                  }

                  let belongsToCollapsedRound = false;
                  for (let i = idx - 1; i >= 0; i--) {
                    if (messages[i].expertId === '__round__') { belongsToCollapsedRound = collapsedRounds.has(messages[i].id); break; }
                  }
                  if (belongsToCollapsedRound) return null;

                  if (msg.expertId === '__user__') {
                    const isMessenger = getMainMode(discussionMode) === 'general';
                    return (
                      <div key={msg.id} className={cn(isMessenger ? 'flex justify-end' : '')}>
                        <div className={cn(
                          isMessenger
                            ? 'max-w-[75%] bg-slate-800 text-white rounded-2xl rounded-br-md px-3.5 py-2.5 text-[12.5px]'
                            : 'bg-white border border-slate-100 rounded-xl px-3.5 py-2.5 text-[12.5px] text-slate-600'
                        )}>
                          <ReactMarkdownInline content={msg.content} />
                        </div>
                      </div>
                    );
                  }

                  const expert = allExperts.find(e => e.id === msg.expertId);
                  if (!expert) return null;
                  return (
                    <DiscussionMessageCard
                      key={msg.id} message={msg} expert={expert}
                      variant={getChatVariant(msg)}
                      onLike={handleLike} onDislike={handleDislike}
                      onRebuttal={isDone ? handleRebuttal : undefined}
                    />
                  );
                })
              )}

            </div>
          </div>

          {/* Bottom Input */}
          {(messages.length > 0 || isDiscussing) && (
            <div className="shrink-0 border-t border-slate-100 bg-white/80 backdrop-blur-sm">
              <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2.5 space-y-2">
                {/* Progress bar + Active bot + Stop */}
                {isDiscussing && (
                  <div className="flex items-center gap-3">
                    {activeExpert && (
                      <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                        <ExpertAvatar expert={activeExpert} size="xs" active />
                        <span className="text-[11px] font-medium text-slate-500">{activeExpert.nameKo} 응답 중</span>
                        <span className="flex items-center gap-0.5">
                          <span className="typing-dot w-1 h-1 rounded-full bg-primary/50" />
                          <span className="typing-dot w-1 h-1 rounded-full bg-primary/50" />
                          <span className="typing-dot w-1 h-1 rounded-full bg-primary/50" />
                        </span>
                      </div>
                    )}
                    <button onClick={stopDiscussion}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-[11px] font-semibold hover:bg-red-600 transition-colors shadow-sm ml-auto shrink-0">
                      <Square className="w-3 h-3" /> 중지
                    </button>
                    {roundProgress && (
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-[10px] text-slate-400">{roundProgress.current}/{roundProgress.total}</span>
                        <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${(roundProgress.current / roundProgress.total) * 100}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Action bar when done */}
                {isDone && (
                  <div className="flex items-center gap-2">
                    {discussionMode === 'multi' && !messages.some(m => m.isSummary) && (
                      <button onClick={generateConclusion}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[11px] font-semibold hover:bg-slate-700 transition-colors shadow-sm">
                        🎯 종합 결론
                      </button>
                    )}
                    <button onClick={exportDiscussion} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-400 border border-slate-200 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                      <Download className="w-3 h-3" /> 내보내기
                    </button>
                  </div>
                )}
                <QuestionInput
                  onSubmit={isDone ? handleFollowUp : startDiscussion}
                  disabled={isDiscussing || activeExperts.length < 1}
                  discussionMode={discussionMode}
                  onToggleSettings={() => setShowDebateSettings((prev) => !prev)}
                  showSettings={showDebateSettings}
                  isFollowUp={isDone}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarProvider>);

};

function RoundSeparator({ msg, isCollapsed, onToggle, count }: { msg: DiscussionMessage; isCollapsed: boolean; onToggle: () => void; count: number }) {
  return (
    <button key={msg.id} type="button" onClick={onToggle}
      className="w-full flex items-center gap-3 py-1.5 group/round cursor-pointer">
      <div className="flex-1 h-px bg-slate-100" />
      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1 rounded-full bg-slate-50 border border-slate-100 transition-all group-hover/round:border-primary/20 group-hover/round:text-primary">
        {msg.content}
        {count > 0 && <span className="text-slate-300 font-normal">{count}</span>}
        {isCollapsed ? <ChevronRight className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </button>
  );
}

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