import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { DEFAULT_EXPERTS, SUMMARIZER_EXPERT, CONCLUSION_EXPERT, DiscussionMessage, DiscussionRound, DiscussionMode, Expert, ROUND_LABELS, getMainMode, DebateSettings, DEFAULT_DEBATE_SETTINGS, ThinkingFramework, DiscussionIssue, THINKING_FRAMEWORKS } from '@/types/expert';
import { PROMPTS } from '@/data/prompts';
import { generatePpt, parsePptJson, PPT_SYSTEM_PROMPT } from '@/lib/pptGenerator';
import { GamePlayer } from '@/components/GamePlayer';
import { QuestionInput } from '@/components/QuestionInput';
import { ExpertAvatar } from '@/components/ExpertAvatar';
import { DiscussionMessageCard } from '@/components/DiscussionMessage';
import { AppSidebar } from '@/components/AppSidebar';
import { ExpertSelectionPanel } from '@/components/ExpertSelectionPanel';
import { saveDiscussionToHistory, upsertDiscussionHistory, DiscussionRecord } from '@/components/DiscussionHistory';
import { AttachedFile } from '@/lib/fileProcessor';
import { Copy, Check, Square, RefreshCw, ChevronDown, ChevronRight, ArrowDown, ArrowRight, FileText } from 'lucide-react';
import type { ChatVariant } from '@/components/DiscussionMessage';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

const CHAT_URL = '/api/chat';

// Timing constants
const DELAY_BETWEEN_EXPERTS = 300; // ms between expert responses
const DELAY_BETWEEN_ROUNDS = 500; // ms between debate rounds
const DELAY_ROUTER_ANALYSIS = 1200; // ms for router analysis animation
const DELAY_ROUTER_TRANSITION = 400; // ms for router to expert transition
const DELAY_PROCON_START = 500; // ms before procon debate starts

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
  question, expert, previousResponses, round, onDelta, onDone, signal, files






}: {question: string;expert: Expert;previousResponses: {name: string;content: string;}[];round: DiscussionRound | 'summary';onDelta: (text: string) => void;onDone: () => void;signal?: AbortSignal;files?: {name: string; mimeType: string; base64: string; extractedText?: string}[];}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt: SAFETY_GUARDRAIL + (expert.systemPrompt || PROMPTS[expert.id] || ''), question, previousResponses, files: files && files.length > 0 ? files : undefined }),
    signal
  });

  if (!resp.ok || !resp.body) {
    const errorData = await resp.json().catch(() => ({}));
    if (resp.status === 429) {
      throw new Error('일일 사용 한도에 도달했어요. 내일 다시 이용해주세요.');
    }
    if (resp.status >= 500) {
      throw new Error('서버에 일시적인 문제가 발생했어요. 잠시 후 다시 시도해주세요.');
    }
    throw new Error(errorData.error || '응답을 받아오지 못했어요. 네트워크를 확인해주세요.');
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
      const saved = localStorage.getItem('ai-debate-experts-v63');
      if (saved) {
        const parsed = JSON.parse(saved) as Expert[];
        // Merge: keep saved customizations but add any new default experts
        const savedIds = new Set(parsed.map((e) => e.id));
        const newExperts = DEFAULT_EXPERTS.filter((e) => !savedIds.has(e.id));
        return [...parsed.map((e) => {
          const def = DEFAULT_EXPERTS.find(d => d.id === e.id);
          return { ...e, category: e.category || 'ai', icon: e.icon || def?.icon || '', avatarUrl: def?.avatarUrl || e.avatarUrl };
        }), ...newExperts];
      }
      return DEFAULT_EXPERTS;
    } catch {return DEFAULT_EXPERTS;}
  });
  const [selectedExpertIds, setSelectedExpertIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ai-debate-selected-v5');
      const parsed = saved ? JSON.parse(saved) : ['gpt'];
      // 단일 AI 모드 기본이므로 1개만 유지
      return Array.isArray(parsed) && parsed.length > 0 ? [parsed[0]] : ['gpt'];
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
  const pendingFilesRef = useRef<AttachedFile[]>([]);

  useEffect(() => {
    localStorage.setItem('ai-debate-experts-v63', JSON.stringify(experts));
  }, [experts]);

  useEffect(() => {
    setSelectedExpertIds((prev) => prev.filter((id) => experts.some((e) => e.id === id)));
  }, [experts]);

  useEffect(() => {
    localStorage.setItem('ai-debate-selected-v5', JSON.stringify(selectedExpertIds));
  }, [selectedExpertIds]);

  const userScrolledUpRef = useRef(false);
  // 자동 스크롤: 유저가 위로 스크롤하지 않았을 때만 + 새 메시지 추가 시에만 (스트리밍 중 매 토큰 스크롤 방지)
  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (!userScrolledUpRef.current && messages.length !== prevMsgCountRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
    prevMsgCountRef.current = messages.length;
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
        expert: { ...expert, systemPrompt: (expert.systemPrompt || PROMPTS[expert.id] || '') + '\n\n사용자가 당신의 의견에 반박했습니다. 사용자의 반박에 대해 정중하지만 논리적으로 응답해주세요. 동의할 부분은 인정하고, 반대할 부분은 근거를 들어 설명해주세요. 2문단 이내로 답변해주세요.' },
        previousResponses: allResponses, round: 'rebuttal',
        onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === replyId ? { ...m, content: fullContent } : m));},
        onDone: () => {setMessages((prev) => prev.map((m) => m.id === replyId ? { ...m, isStreaming: false } : m));},
        signal: controller.signal
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        fullContent = `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`;
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
    skipClarifyRef.current = false;
    clarifyAttemptsRef.current = 0;
    sessionIdRef.current = `hist-${Date.now()}`;
    userScrolledUpRef.current = false;
    setChatClarify(null);
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
  const runDiscussion = useCallback(async (question: string, overrideExpertIds?: string[], overrideMode?: DiscussionMode, displayQuestion?: string) => {
    const useMode = overrideMode || discussionMode;
    // 플레이어 모드는 GPT 자동 선택
    const useIds = useMode === 'player'
      ? ['gpt']
      : (overrideExpertIds || selectedExpertIds);
    const discussionExperts = experts.filter((e) => useIds.includes(e.id));
    if (discussionExperts.length < 1) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStopRequested(false);
    setIsDiscussing(true);
    setCurrentQuestion(question);
    setMessages([]);
    userScrolledUpRef.current = false;
    setClarifyState({ show: false, loading: false, originalInput: '', suggestions: [], customEdit: '' });
    // Grab pending files and clear ref
    const pendingFiles = pendingFilesRef.current;
    pendingFilesRef.current = [];
    const filesToSend = pendingFiles.length > 0 ? pendingFiles.map(f => ({
      name: f.name, mimeType: f.mimeType, base64: f.base64, extractedText: f.extractedText,
    })) : undefined;

    const allResponses: {name: string;content: string;}[] = [];
    const shouldStop = () => controller.signal.aborted;
    const lengthExtra = debateSettings.responseLength === 'short'
      ? '\n답변은 반드시 3-4문장으로 간결하게 작성하세요.'
      : debateSettings.responseLength === 'long'
      ? '\n답변은 풍부한 근거와 예시를 들어 충분히 상세하게 작성하세요.'
      : '';

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
            question, expert: { ...expert, systemPrompt: (expert.systemPrompt || PROMPTS[expert.id] || '') + expertExtra },
            previousResponses: [], round: 'initial',
            onDelta: (chunk) => { fullContent += chunk; setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m)); },
            onDone: () => { setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m)); },
            signal: controller.signal,
            files: filesToSend,
          });
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`, isStreaming: false } : m));
          }
        }
      }
      setActiveExpertId(undefined);
      setIsDiscussing(false);
      setStopRequested(false);
      // 저장은 대화 완료 시 upsert로 처리
      return;
    }

    if (useMode === 'general' || useMode === 'player') {
      // 단일 AI만: 명확화 질문 (첫 질문, 스킵 안 된 경우만) — player 모드는 스킵
      const expert0 = discussionExperts[0];
      if (expert0 && !skipClarifyRef.current && clarifyAttemptsRef.current < MAX_CLARIFY_ATTEMPTS && useMode !== 'player') {
        clarifyAttemptsRef.current++;
        try {
          const clarifyResp = await fetch('/api/clarify-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: question, expertName: expert0.nameKo, expertDescription: expert0.description, attempt: clarifyAttemptsRef.current }),
          });
          const clarifyData = await clarifyResp.json();

          // 1점: 가정 명시 답변 — 가정을 컨텍스트에 추가하고 바로 답변 진행
          if (clarifyData.type === 'answer_with_assumption' && clarifyData.assumption) {
            question = `${question}\n\n[사용자 맥락 가정: ${clarifyData.assumption}]`;
            // 바로 답변으로 진행 (아래로 fall through)
          }
          // 2점+: 부분 답변 + 질문
          else if (clarifyData.type === 'clarifying_questions' && clarifyData.questions?.length > 0) {
            // 사용자 메시지 추가 → 채팅 화면으로 전환
            if (messages.length === 0) {
              setMessages([{ id: `user-clarify-${Date.now()}`, expertId: '__user__', content: question }]);
            }
            // 부분 답변이 있으면 AI 메시지로 먼저 표시
            if (clarifyData.partialAnswer) {
              setMessages(prev => [...prev, { id: `partial-${Date.now()}`, expertId: expert0.id, content: clarifyData.partialAnswer }]);
            }
            setChatClarify({
              show: true, loading: false,
              message: clarifyData.message || '더 정확한 답변을 위해 확인할게요',
              questions: clarifyData.questions,
              selections: {}, customInputs: {}, currentPage: 0,
              originalQuestion: question,
            });
            setIsDiscussing(false);
            setStopRequested(false);
            return;
          }
        } catch { /* 실패 시 그냥 답변 진행 */ }
      }
      skipClarifyRef.current = true;
      setChatClarify(null);
      // Smart router: auto-select best AI
      let expertsToRun = discussionExperts;
      if (useIds.includes('router')) {
        const routingId = `routing-${Date.now()}`;
        setMessages((prev) => [...prev, { id: routingId, expertId: 'router', content: '🔍 질문 분석 중...', isStreaming: true }]);
        setActiveExpertId('router');
        await new Promise(r => setTimeout(r, DELAY_ROUTER_ANALYSIS));
        if (shouldStop()) { setActiveExpertId(undefined); setIsDiscussing(false); setStopRequested(false); return; }
        const candidates = experts.filter(e => e.id !== 'router' && e.category === 'ai');
        const { expert: picked, reason } = mockRoute(question, candidates);
        setMessages((prev) => prev.map(m => m.id === routingId
          ? { ...m, content: `🎯 **${picked.nameKo}** 선택 — ${reason}`, isStreaming: false } : m));
        expertsToRun = [picked];
        setActiveExpertId(undefined);
        await new Promise(r => setTimeout(r, DELAY_ROUTER_TRANSITION));
      }

      // player 모드: 게임 프롬프트 대신 깔끔한 시작 메시지 표시
      if (useMode === 'player') {
        const gameMatch = question.match(/\[(.+?)게임 시작\]|\[(.+?)시작\]/);
        const gameName = gameMatch ? (gameMatch[1] || gameMatch[2]).trim() : '🎮 게임';
        setMessages([{ id: `user-game-${Date.now()}`, expertId: '__user__', content: `🎮 **${gameName}** 시작!` }]);
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
            signal: controller.signal,
            files: filesToSend,
          });
        } catch (err) {
          if ((err as Error).name === 'AbortError') break;
          fullContent = `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`;
          setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
        }
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_EXPERTS));
      }
      setActiveExpertId(undefined);
      setIsDiscussing(false);
      setStopRequested(false);
      // 저장은 대화 완료 시 upsert로 처리
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
            expert: { ...expert, systemPrompt: (expert.systemPrompt || PROMPTS[expert.id] || '') + '\n\n빠른 토론 모드입니다. 핵심만 1문단(3-4문장)으로 간결하게 답변해주세요.' },
            previousResponses: allResponses, round: 'initial',
            onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m));},
            onDone: () => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m));},
            signal: controller.signal,
            files: filesToSend,
          });
        } catch (err) {
          if ((err as Error).name === 'AbortError') break;
          fullContent = `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`;
          setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
        }
        allResponses.push({ name: expert.nameKo, content: fullContent });
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_EXPERTS));
      }

      // 결론은 자동으로 내지 않음 — 사용자가 "결론 내리기" 버튼을 눌러야 생성
      setActiveExpertId(undefined);
      setIsDiscussing(false);
      setStopRequested(false);
      // 저장은 대화 완료 시 upsert로 처리
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
            await streamExpert({ question, expert: { ...expert, systemPrompt: (expert.systemPrompt || PROMPTS[expert.id] || '') + issueContext + lengthExtra }, previousResponses: allResponses, round,
              onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m));},
              onDone: () => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m));},
              signal: controller.signal });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`;
            setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
          }
          allResponses.push({ name: `${expert.nameKo} (${label})`, content: fullContent });
          await new Promise((r) => setTimeout(r, DELAY_BETWEEN_ROUNDS));
        }
      }
    } else if (useMode === 'procon') {
      let stanceMap: Record<string, 'pro' | 'con'> = {};

      // Check if user manually assigned all stances
      const manuallyAssigned = discussionExperts.every(e => proconStances[e.id] === 'pro' || proconStances[e.id] === 'con');

      if (manuallyAssigned) {
        // Use manual assignments — 바로 토론 시작 (배정 카드 없음)
        stanceMap = { ...proconStances };
      } else {
        // Auto-assign via AI — 배정 결과는 VS 헤더에 표시되므로 메시지 없음
        // Auto-assign via AI
        try {
          const stanceResp = await fetch("/api/procon-stance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, experts: discussionExperts.map(e => ({ id: e.id, nameKo: e.nameKo, description: e.description })) }), signal: controller.signal });
          if (stanceResp.ok) {
            const stanceResult = await stanceResp.json();
            for (const a of stanceResult.assignments || []) { if (discussionExperts.some(e => e.id === a.expertId)) stanceMap[a.expertId] = a.stance; }
          }
          for (const expert of discussionExperts) { if (!stanceMap[expert.id]) { const pc = Object.values(stanceMap).filter(s => s === "pro").length; stanceMap[expert.id] = pc <= Object.values(stanceMap).filter(s => s === "con").length ? "pro" : "con"; } }
        } catch (err) {
          if ((err as Error).name === "AbortError") { setActiveExpertId(undefined); setIsDiscussing(false); return; }
          const half = Math.ceil(discussionExperts.length / 2);
          discussionExperts.forEach((e, i) => { stanceMap[e.id] = i < half ? "pro" : "con"; });
        }
      }

      setProconStances(stanceMap);

      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_ROUNDS));

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
            await streamExpert({ question, expert: { ...expert, systemPrompt: (expert.systemPrompt || PROMPTS[expert.id] || '') + extra }, previousResponses: allResponses, round,
              onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m));},
              onDone: () => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m));},
              signal: controller.signal });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`;
            setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
          }
          allResponses.push({ name: `${expert.nameKo} (${sideLabel}, ${label})`, content: fullContent });
          await new Promise((r) => setTimeout(r, DELAY_BETWEEN_ROUNDS));
        }
      }
    } else if (useMode === 'brainstorm') {
      const bsCreativityMap: Record<string, string> = {
        realistic: '현실적이고 즉시 실행 가능한 아이디어에 집중하세요.',
        balanced: '현실적 아이디어와 혁신적 아이디어를 균형있게 제시하세요.',
        radical: '파격적이고 급진적인 아이디어를 과감하게 제시하세요. 기존 틀을 완전히 깨세요.',
      };
      const fw = selectedFramework || THINKING_FRAMEWORKS.find(f => f.id === 'free')!;
      const fwRounds = fw.rounds;
      const roundMap: DiscussionRound[] = ['initial', 'rebuttal', 'final', 'rebuttal', 'final', 'rebuttal'];
      const isCuratedFramework = ['free', 'swot', 'sixhats', 'scamper', 'pmi', 'fivewhys', 'moonshot', 'designthinking', 'starbursting', 'reversal'].includes(fw.id);

      if (isCuratedFramework) {
        // ── 큐레이션 방식: 내부 수집 → 프로그레스 → 최종 결과만 표시 ──
        const progressId = `brainstorm-progress-${Date.now()}`;
        const totalSteps = fwRounds.length + 1;
        const expertNames = discussionExperts.map(e => e.nameKo);

        // 프로그레스 메시지 추가
        setMessages((prev) => [...prev, {
          id: progressId, expertId: '__brainstorm_progress__', content: JSON.stringify({
            framework: fw.id, frameworkName: fw.nameKo, currentStep: 0, totalSteps,
            stepLabel: fwRounds[0]?.label || '준비 중...', experts: expertNames, completedExperts: [] as string[],
          }),
        }]);

        // 각 라운드 → 각 전문가: 내부 수집 (메시지에 안 보임)
        for (let ri = 0; ri < fwRounds.length; ri++) {
          if (shouldStop()) break;
          const fwRound = fwRounds[ri];
          const round = roundMap[ri] || 'rebuttal';
          const roundExperts = [...discussionExperts].sort(() => Math.random() - 0.5);
          const completedInRound: string[] = [];

          // 프로그레스 업데이트
          setMessages((prev) => prev.map(m => m.id === progressId ? { ...m, content: JSON.stringify({
            framework: fw.id, frameworkName: fw.nameKo, currentStep: ri, totalSteps,
            stepLabel: fwRound.label, experts: expertNames, completedExperts: [],
          }) } : m));

          for (const expert of roundExperts) {
            if (shouldStop()) break;
            setActiveExpertId(expert.id);
            const extra = `\n\n[${fw.nameKo}] ${fwRound.label}\n${fwRound.instruction}` +
              `\n아이디어를 최소 ${debateSettings.ideaCount}개 제시하세요. 간결하게.` +
              (debateSettings.deduplication ? '\n다른 참여자와 중복 피하세요.' : '') +
              (bsCreativityMap[debateSettings.creativityLevel] || '');

            let fullContent = '';
            try {
              await streamExpert({ question, expert: { ...expert, systemPrompt: (expert.systemPrompt || PROMPTS[expert.id] || '') + extra + lengthExtra },
                previousResponses: allResponses, round,
                onDelta: (chunk) => { fullContent += chunk; },
                onDone: () => {},
                signal: controller.signal });
            } catch (err) {
              if ((err as Error).name === 'AbortError') break;
              fullContent = '';
            }
            allResponses.push({ name: `${expert.nameKo} (${fwRound.label})`, content: fullContent });
            completedInRound.push(expert.nameKo);

            // 프로그레스 업데이트 — 전문가 완료 표시
            setMessages((prev) => prev.map(m => m.id === progressId ? { ...m, content: JSON.stringify({
              framework: fw.id, frameworkName: fw.nameKo, currentStep: ri, totalSteps,
              stepLabel: fwRound.label, experts: expertNames, completedExperts: [...completedInRound],
            }) } : m));

            await new Promise((r) => setTimeout(r, 200));
          }
        }

        // 큐레이션 단계 — 프로그레스 업데이트
        if (!shouldStop()) {
          setMessages((prev) => prev.map(m => m.id === progressId ? { ...m, content: JSON.stringify({
            framework: fw.id, frameworkName: fw.nameKo, currentStep: fwRounds.length, totalSteps,
            stepLabel: '결과 정리 중...', experts: expertNames, completedExperts: expertNames,
          }) } : m));

          // 큐레이터 프롬프트
          const curatorPrompts: Record<string, string> = {
            free: `You are a brainstorming curator. Synthesize ALL expert ideas into JSON. Output ONLY valid JSON, no markdown.
{"topIdeas":[{"title":"제목","desc":"설명 2문장","tag":"즉시실행 또는 장기검토"}],"combinations":[{"a":"아이디어A","b":"아이디어B","result":"결합 결과"}],"summary":"한줄 요약"}
Rules: topIdeas 5~8개, tag는 "즉시실행" 또는 "장기검토". combinations 2~3개. 한국어로.
CRITICAL: Output ONLY the JSON object starting with { and ending with }. No explanation, no markdown, no text before or after the JSON.`,

            swot: `You are a SWOT analyst. Synthesize ALL expert inputs into JSON. Output ONLY valid JSON, no markdown.
{"strengths":[{"title":"제목","desc":"설명"}],"weaknesses":[{"title":"제목","desc":"설명"}],"opportunities":[{"title":"제목","desc":"설명"}],"threats":[{"title":"제목","desc":"설명"}],"strategies":{"so":"SO전략 설명","wo":"WO전략 설명","st":"ST전략 설명","wt":"WT전략 설명"},"summary":"한줄 요약"}
Rules: 각 영역 3~5개. 한국어로.
CRITICAL: Output ONLY the JSON object starting with { and ending with }. No explanation, no markdown, no text before or after the JSON.`,

            sixhats: `You are a Six Hats facilitator. Synthesize ALL expert inputs into JSON. Output ONLY valid JSON, no markdown.
{"white":["사실1","사실2"],"red":["감정1","감정2"],"black":["위험1","위험2"],"yellow":["긍정1","긍정2"],"green":["창의1","창의2"],"blue":["결론1","결론2"],"summary":"한줄 요약"}
Rules: 각 모자 2~4개 포인트. 한국어로.
CRITICAL: Output ONLY the JSON object starting with { and ending with }. No explanation, no markdown, no text before or after the JSON.`,

            scamper: `You are a SCAMPER facilitator. Synthesize ALL expert inputs into JSON. Output ONLY valid JSON, no markdown.
{"substitute":[{"title":"제목","desc":"설명"}],"combine":[{"title":"제목","desc":"설명"}],"adapt":[{"title":"제목","desc":"설명"}],"modify":[{"title":"제목","desc":"설명"}],"putToOtherUse":[{"title":"제목","desc":"설명"}],"eliminate":[{"title":"제목","desc":"설명"}],"reverse":[{"title":"제목","desc":"설명"}],"summary":"한줄 요약"}
Rules: 각 기법 1~3개. 한국어로.
CRITICAL: Output ONLY the JSON object starting with { and ending with }. No explanation, no markdown, no text before or after the JSON.`,

            pmi: `You are a PMI analyst. Synthesize ALL expert inputs into JSON. Output ONLY valid JSON, no markdown.
{"plus":[{"title":"제목","desc":"설명"}],"minus":[{"title":"제목","desc":"설명"}],"interesting":[{"title":"제목","desc":"설명"}],"summary":"한줄 요약"}
Rules: 각 영역 3~5개. 한국어로.
CRITICAL: Output ONLY the JSON object starting with { and ending with }. No explanation, no markdown, no text before or after the JSON.`,

            fivewhys: `You are a Five Whys analyst. Synthesize ALL expert inputs into JSON. Output ONLY valid JSON, no markdown.
{"chain":[{"why":"왜 이 문제가 발생하는가?","because":"원인 설명"},{"why":"왜 그 원인이 발생하는가?","because":"더 깊은 원인"},{"why":"세번째 Why","because":"근본 원인에 가까워짐"},{"why":"네번째 Why","because":"거의 근본 원인"},{"why":"다섯번째 Why","because":"근본 원인"}],"rootCause":"최종 근본 원인 한줄","solutions":[{"title":"해결책 제목","desc":"설명"}],"summary":"한줄 요약"}
Rules: chain 5개. solutions 2~4개. 한국어로.
CRITICAL: Output ONLY the JSON object starting with { and ending with }. No explanation, no markdown, no text before or after the JSON.`,

            moonshot: `You are a Moonshot thinking facilitator. Synthesize ALL expert inputs into JSON. Output ONLY valid JSON, no markdown.
{"current":{"title":"현재 상태","desc":"설명"},"tenX":{"title":"10배 비전","desc":"설명"},"constraints":[{"title":"제거할 제약","desc":"설명"}],"mvp":{"title":"최소 실행 단위","desc":"설명"},"roadmap":[{"phase":"단계명","desc":"설명"}],"summary":"한줄 요약"}
Rules: constraints 2~3개. roadmap 3~4단계. 한국어로.
CRITICAL: Output ONLY the JSON object starting with { and ending with }. No explanation, no markdown, no text before or after the JSON.`,

            designthinking: `You are a Design Thinking facilitator. Synthesize ALL expert inputs into JSON. Output ONLY valid JSON, no markdown.
{"empathize":[{"title":"인사이트","desc":"설명"}],"define":{"problem":"핵심 문제 정의","persona":"대상 사용자"},"ideate":[{"title":"아이디어","desc":"설명"}],"prototype":{"title":"프로토타입 제안","desc":"설명","steps":["단계1","단계2"]},"summary":"한줄 요약"}
Rules: empathize 2~3개. ideate 3~5개. 한국어로.
CRITICAL: Output ONLY the JSON object starting with { and ending with }. No explanation, no markdown, no text before or after the JSON.`,

            starbursting: `You are a Starbursting facilitator. Synthesize ALL expert inputs into JSON. Output ONLY valid JSON, no markdown.
{"who":[{"q":"질문","a":"답변"}],"what":[{"q":"질문","a":"답변"}],"when":[{"q":"질문","a":"답변"}],"where":[{"q":"질문","a":"답변"}],"why":[{"q":"질문","a":"답변"}],"how":[{"q":"질문","a":"답변"}],"summary":"한줄 요약"}
Rules: 각 카테고리 2~3개 Q&A. 한국어로.
CRITICAL: Output ONLY the JSON object starting with { and ending with }. No explanation, no markdown, no text before or after the JSON.`,

            reversal: `You are a Reversal Thinking facilitator. Synthesize ALL expert inputs into JSON. Output ONLY valid JSON, no markdown.
{"original":{"title":"원래 관점","desc":"설명"},"reversed":{"title":"뒤집은 관점","desc":"설명"},"insights":[{"title":"발견","desc":"설명"}],"actions":[{"title":"적용 방안","desc":"설명"}],"summary":"한줄 요약"}
Rules: insights 2~4개. actions 2~3개. 한국어로.
CRITICAL: Output ONLY the JSON object starting with { and ending with }. No explanation, no markdown, no text before or after the JSON.`,
          };

          setActiveExpertId(SUMMARIZER_EXPERT.id);
          const curatorId = `brainstorm-result-${Date.now()}`;
          // 프로그레스 제거 + 결과 메시지 추가
          setMessages((prev) => [
            ...prev.filter(m => m.id !== progressId),
            { id: curatorId, expertId: SUMMARIZER_EXPERT.id, content: '', isStreaming: true, isSummary: true, round: fw.id as DiscussionRound }
          ]);

          let curatorContent = '';
          try {
            await streamExpert({
              question, expert: { ...SUMMARIZER_EXPERT, systemPrompt: curatorPrompts[fw.id] || curatorPrompts.free },
              previousResponses: allResponses, round: 'summary',
              onDelta: (chunk) => { curatorContent += chunk; setMessages((prev) => prev.map(m => m.id === curatorId ? { ...m, content: curatorContent } : m)); },
              onDone: () => { setMessages((prev) => prev.map(m => m.id === curatorId ? { ...m, isStreaming: false } : m)); },
              signal: controller.signal });
          } catch (err) {
            if ((err as Error).name !== 'AbortError') {
              setMessages((prev) => prev.map(m => m.id === curatorId ? { ...m, content: `⚠️ ${(err as Error).message}`, isStreaming: false } : m));
            }
          }
        } else {
          // 중지 시 프로그레스 제거
          setMessages((prev) => prev.filter(m => m.id !== progressId));
        }

      } else {
        // ── 기존 방식: 개별 포스트잇 카드 ──
        const bsSettingsExtra =
          `\n\n=== 아이디어 출력 규칙 ===` +
          `\n각 아이디어를 반드시 다음 형식으로 구분하여 제시하세요:` +
          `\n---IDEA---\n**제목:** (한 줄 제목)\n(2-3문장 설명)\n---END---` +
          `\n총 ${debateSettings.ideaCount}개. 아이디어당 최대 3문장.` +
          (debateSettings.deduplication ? '\n중복 피하세요.' : '') +
          (bsCreativityMap[debateSettings.creativityLevel] || '') +
          `\n=== 끝 ===`;

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
              await streamExpert({ question, expert: { ...expert, systemPrompt: (expert.systemPrompt || PROMPTS[expert.id] || '') + extra + lengthExtra }, previousResponses: allResponses, round,
                onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m));},
                onDone: () => {
                  const ideas = fullContent.split('---IDEA---').map(s => s.replace(/---END---/g, '').trim()).filter(s => s.length > 0);
                  if (ideas.length > 1) {
                    setMessages((prev) => {
                      const without = prev.filter(m => m.id !== msgId);
                      const ideaMsgs = ideas.map((idea, ii) => ({ id: `${msgId}-idea-${ii}`, expertId: expert.id, content: idea, isStreaming: false, round }));
                      return [...without, ...ideaMsgs];
                    });
                  } else {
                    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m));
                  }
                },
                signal: controller.signal });
            } catch (err) {
              if ((err as Error).name === 'AbortError') break;
              fullContent = `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`;
              setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
            }
            allResponses.push({ name: `${expert.nameKo} (${fwRound.label})`, content: fullContent });
            await new Promise((r) => setTimeout(r, DELAY_BETWEEN_ROUNDS));
          }
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
              expert: { ...expert, systemPrompt: (expert.systemPrompt || PROMPTS[expert.id] || '') + '\n\n' + instruction + lengthExtra },
              previousResponses: allResponses, round: phase.round,
              onDelta: chunk => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
              onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m)); },
              signal: controller.signal,
            });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`;
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
          }
          allResponses.push({ name: `${expert.nameKo} (${phase.label})`, content: fullContent });
          await new Promise(r => setTimeout(r, DELAY_BETWEEN_ROUNDS));
        }
      }
    } else if (useMode === 'assistant') {
      // Assistant mode
      const expert = discussionExperts[0];
      if (expert) {
        // PPT 어시스턴트인 경우 프롬프트 오버라이드
        const isPpt = expert.id === 'ppt' || expert.name?.toLowerCase().includes('ppt');
        const effectiveExpert = isPpt ? { ...expert, systemPrompt: PPT_SYSTEM_PROMPT } : expert;

        setActiveExpertId(expert.id);
        const msgId = `${expert.id}-assistant-${Date.now()}`;
        setMessages((prev) => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true }]);
        let fullContent = '';
        try {
          await streamExpert({
            question, expert: effectiveExpert,
            previousResponses: [],
            round: 'initial',
            onDelta: (chunk) => { fullContent += chunk; setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m)); },
            onDone: () => {
              setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false } : m));
              // PPT인 경우 JSON 파싱 시도 → 다운로드 버튼 메시지 추가
              if (isPpt) {
                const pptData = parsePptJson(fullContent);
                if (pptData) {
                  const btnId = `ppt-download-${Date.now()}`;
                  setMessages((prev) => [...prev, {
                    id: btnId,
                    expertId: '__ppt_download__',
                    content: JSON.stringify(pptData),
                  }]);
                }
              }
            },
            signal: controller.signal,
          });
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`, isStreaming: false } : m));
          }
        }
      }
      setActiveExpertId(undefined);
      setIsDiscussing(false);
      setStopRequested(false);
      // 저장은 대화 완료 시 upsert로 처리
      return;
    }

    if (!shouldStop() && debateSettings.includeConclusion) {
      // 브레인스토밍 전용 결론
      const isBrainstormConclusion = useMode === 'brainstorm';
      const brainstormSummaryPrompt = `You are a brainstorming session facilitator. Organize ALL ideas from the session into a clear Korean summary using this format:

## 💡 브레인스토밍 결과 정리

### 📌 핵심 아이디어 TOP 5
1. **(제목)** — 요약 (발제자: 전문가명)
2. ...

### 🔗 결합 가능한 아이디어
- (아이디어 A) + (아이디어 B) → (결합 결과)

### 📊 카테고리별 분류
| 카테고리 | 아이디어 수 | 대표 아이디어 |
|---------|-----------|-------------|

### 🎯 즉시 실행 가능한 것
- ...

### 🚀 추가 발전이 필요한 것
- ...

> 총 아이디어 중 실행 가능성이 높은 것을 우선순위로 정리했습니다.

모든 참여자의 아이디어를 빠짐없이 반영하세요. 한국어로 작성하세요.`;

      // Summary
      setActiveExpertId(SUMMARIZER_EXPERT.id);
      const summaryId = `summary-${Date.now()}`;
      setMessages((prev) => [...prev, { id: summaryId, expertId: SUMMARIZER_EXPERT.id, content: '', isStreaming: true, isSummary: true }]);
      let summaryContent = '';
      try {
        await streamExpert({
          question, expert: { ...SUMMARIZER_EXPERT, systemPrompt: isBrainstormConclusion ? brainstormSummaryPrompt : `You are a debate summarizer and conclusion synthesizer. Create a comprehensive, well-structured Korean summary that combines both the discussion overview AND the final conclusion. Use this markdown format EXACTLY:

## 📋 토론 정리

### 💡 핵심 결론
(질문에 대한 직접적 답변 2-3문장. 모든 전문가의 관점을 종합한 최종 답변.)

### 📌 주요 논점
1. **(논점 제목)** — 이 논점에 대해 전문가들이 어떤 입장을 보였는지 설명. 합의가 있으면 합의 내용을, 대립이 있으면 누가 어떤 입장인지 포함.
2. **(논점 제목)** — 설명
3. **(논점 제목)** — 설명

### 🎯 실행 제안
- (구체적이고 실행 가능한 제안 1)
- (구체적이고 실행 가능한 제안 2)
- (구체적이고 실행 가능한 제안 3)

> 💡 **한줄 요약:** (토론 전체를 한 문장으로 정리)

Rules:
- 핵심 결론을 가장 먼저 작성하세요.
- 논점은 전문가 이름을 포함하여 구체적으로 작성하세요.
- 테이블은 사용하지 마세요. 글머리 기호만 사용하세요.
- 전체적으로 간결하게. 각 논점은 2-3문장 이내.
- 한국어로 작성하세요.` },
          previousResponses: allResponses, round: 'summary',
          onDelta: (chunk) => {summaryContent += chunk;setMessages((prev) => prev.map((m) => m.id === summaryId ? { ...m, content: summaryContent } : m));},
          onDone: () => {setMessages((prev) => prev.map((m) => m.id === summaryId ? { ...m, isStreaming: false } : m));},
          signal: controller.signal });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          summaryContent = `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`;
          setMessages((prev) => prev.map((m) => m.id === summaryId ? { ...m, content: summaryContent, isStreaming: false } : m));
        }
      }

      // 최종 결론은 토론 정리에 통합됨 — 별도 호출 불필요
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
      let suggestions = data.suggestions?.length > 0
        ? data.suggestions.slice(0, 3)
        : [{ topic: data.refined || input, description: '입력한 주제 그대로 사용' }];
      // 항상 3개 보장
      while (suggestions.length < 3) {
        suggestions.push({ topic: `${input} — 관점 ${suggestions.length + 1}`, description: '다른 키워드로 다시 제안받아 보세요' });
      }
      setClarifyState(prev => ({ ...prev, loading: false, suggestions, customEdit: '' }));
    }).catch(() => {
      setClarifyState(prev => ({
        ...prev, loading: false,
        suggestions: [
          { topic: input, description: '입력한 주제 그대로 사용' },
          { topic: `${input}의 장단점`, description: '장단점 분석' },
          { topic: `${input}이 미치는 영향`, description: '영향 분석' },
        ],
      }));
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

  // Save to history when discussion completes — upsert로 중복 방지
  useEffect(() => {
    if (!isDiscussing && messages.length > 0 && currentQuestion) {
      upsertDiscussionHistory(sessionIdRef.current, {
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

  // Dev panel state (D-day, Todo, Schedule)
  const [devPanelOpen, setDevPanelOpen] = useState(() => {
    try { return localStorage.getItem('dev-panel-open') === 'true'; } catch { return false; }
  });
  const [devTodos, setDevTodos] = useState<{ id: string; text: string; done: boolean }[]>(() => {
    try { const s = localStorage.getItem('dev-todos'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [devSchedule, setDevSchedule] = useState(() => localStorage.getItem('dev-schedule') || '');
  const [devPrinciple, setDevPrinciple] = useState(() => localStorage.getItem('dev-principle') || '');
  const [devDdayDate, setDevDdayDate] = useState(() => localStorage.getItem('dev-dday-date') || '2026-04-06');
  const [devDdayLabel, setDevDdayLabel] = useState(() => localStorage.getItem('dev-dday-label') || '마감');
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoText, setEditingTodoText] = useState('');
  const saveDevPrinciple = (text: string) => { setDevPrinciple(text); localStorage.setItem('dev-principle', text); };
  const saveDevTodos = (todos: typeof devTodos) => { setDevTodos(todos); localStorage.setItem('dev-todos', JSON.stringify(todos)); };
  const saveDevDday = (date: string, label: string) => { setDevDdayDate(date); setDevDdayLabel(label); localStorage.setItem('dev-dday-date', date); localStorage.setItem('dev-dday-label', label); };
  const saveDevSchedule = (text: string) => { setDevSchedule(text); localStorage.setItem('dev-schedule', text); };
  const [newTodoText, setNewTodoText] = useState('');
  const toggleDevPanel = () => { const next = !devPanelOpen; setDevPanelOpen(next); localStorage.setItem('dev-panel-open', String(next)); };

  // Scroll to bottom — smart: pause auto-scroll when user scrolls up
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const userInitiatedScrollRef = useRef(false);
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBtn(distanceFromBottom > 200);
    // userScrolledUpRef는 wheel/touch 이벤트에서만 변경 (콘텐츠 높이 변화와 구분)
    if (userInitiatedScrollRef.current) {
      userScrolledUpRef.current = distanceFromBottom > 100;
      userInitiatedScrollRef.current = false;
    }
  }, []);

  // wheel/touch 이벤트만 감지하여 사용자 스크롤 구분
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const markUserScroll = () => { userInitiatedScrollRef.current = true; };
    el.addEventListener('wheel', markUserScroll, { passive: true });
    el.addEventListener('touchmove', markUserScroll, { passive: true });
    return () => {
      el.removeEventListener('wheel', markUserScroll);
      el.removeEventListener('touchmove', markUserScroll);
    };
  }, []);
  const scrollToBottom = () => {
    userScrolledUpRef.current = false;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

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

  // 대화 요약 기능
  const [isSummarizing, setIsSummarizing] = useState(false);
  const handleSummarize = useCallback(async () => {
    if (isSummarizing || messages.length < 3) return;
    setIsSummarizing(true);

    // 대화 내용 추출
    const conversationText = messages
      .filter(m => m.content && m.expertId !== '__system__')
      .map(m => {
        const expert = allExperts.find(e => e.id === m.expertId);
        const role = m.expertId === '__user__' ? '사용자' : (expert?.nameKo || 'AI');
        return `${role}: ${m.content.slice(0, 500)}`;
      })
      .join('\n');

    const summaryPrompt = `지금까지의 대화 내용을 분석하여 아래 형식으로 요약하세요.
불필요한 수식어 없이 핵심만 간결하게 작성하세요. 마크다운 형식으로 작성하세요.

## 대화 요약

**주제**
(한 줄)

**핵심 내용**
- (불릿 3~5개, 각 1~2줄)

**현재 상태**
(결론 또는 남은 논점, 1~2줄)

---

대화 내용:
${conversationText}`;

    try {
      // 요약은 스트리밍이 아닌 clarify API를 활용 (비스트리밍)
      const resp = await fetch('/api/clarify-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '__summarize__', expertName: 'System', expertDescription: summaryPrompt }),
      });
      const data = await resp.json();
      // clarify API가 answer를 반환하면 직접 Gemini 호출
      const geminiResp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: '당신은 대화 내용을 정확하게 요약하는 전문가입니다. 한국어로 마크다운 형식으로 작성하세요.', question: summaryPrompt }),
      });
      // 스트리밍 응답을 전부 읽기
      const reader = geminiResp.body?.getReader();
      const decoder = new TextDecoder();
      let summaryContent = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // SSE 파싱: "data: {...}" 줄에서 텍스트 추출
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const json = JSON.parse(line.slice(6));
                const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
                summaryContent += text;
              } catch {}
            }
          }
        }
      }
      if (!summaryContent) summaryContent = '요약을 생성할 수 없습니다.';

      // 시스템 요약 카드로 메시지에 추가
      setMessages(prev => [...prev, {
        id: `summary-${Date.now()}`,
        expertId: '__summary__',
        content: summaryContent,
        isSummary: true,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: `summary-err-${Date.now()}`,
        expertId: '__summary__',
        content: '요약 생성에 실패했습니다. 다시 시도해주세요.',
        isSummary: true,
      }]);
    }
    setIsSummarizing(false);
  }, [messages, allExperts, isSummarizing]);

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

  // Clarifying questions state (단일 AI)
  const skipClarifyRef = useRef(false);
  const clarifyAttemptsRef = useRef(0);
  const sessionIdRef = useRef<string>(`hist-${Date.now()}`);
  const MAX_CLARIFY_ATTEMPTS = 2;
  const [chatClarify, setChatClarify] = useState<{
    show: boolean;
    loading: boolean;
    message: string;
    questions: { id: string; question: string; options: { label: string; value: string }[] }[];
    selections: Record<string, string>;
    customInputs: Record<string, string>;
    currentPage: number;
    originalQuestion: string;
  } | null>(null);

  // Multi AI view state
  const [multiActiveTab, setMultiActiveTab] = useState<string | null>(null);
  const [multiView, setMultiView] = useState<'overview' | 'detail' | 'compare'>('overview');
  const [multiCompareIds, setMultiCompareIds] = useState<[string, string] | null>(null);
  const [proconActiveRound, setProconActiveRound] = useState(0);
  const [proconFocusSide, setProconFocusSide] = useState<null | 'pro' | 'con'>(null);
  const [questionExpanded, setQuestionExpanded] = useState(false);
  const [followUpTarget, setFollowUpTarget] = useState<string | null>(null); // null = 전체, id = 특정 전문가
  const [sampleQuestionValue, setSampleQuestionValue] = useState<string>('');
  const [activeGame, setActiveGame] = useState<{ id: string; option: string; label: string } | null>(null);


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
      await streamExpert({ question: followUpQ, expert: { ...expert, systemPrompt: (expert.systemPrompt || PROMPTS[expert.id] || '') + '\n\n이전에 이 주제에 대해 답변한 적이 있습니다. 사용자의 추가 질문에 이전 답변을 바탕으로 더 깊이 답변해주세요.' },
        previousResponses: prevResponses, round: 'initial',
        onDelta: chunk => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
        onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m)); },
        signal: controller.signal });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: `⚠️ ${(err as Error).message}`, isStreaming: false } : m));
      }
    }
    setActiveExpertId(undefined);
    setIsDiscussing(false);
  }, [experts, messages, isDiscussing]);

  // Follow-up question — continues conversation with full context
  const handleFollowUp = useCallback(async (question: string) => {
    if (isDiscussing) return;
    const mode = getMainMode(discussionMode);

    // Grab pending files for follow-up
    const followUpFiles = pendingFilesRef.current;
    pendingFilesRef.current = [];
    const followUpFilesToSend = followUpFiles.length > 0 ? followUpFiles.map(f => ({
      name: f.name, mimeType: f.mimeType, base64: f.base64, extractedText: f.extractedText,
    })) : undefined;
    const followUpFilesBadges = followUpFiles.length > 0 ? followUpFiles.map(f => ({ name: f.name, mimeType: f.mimeType, preview: f.preview })) : undefined;

    // 단일 AI / 어시스턴트: 같은 AI에게 이어서 대화
    if (mode === 'general' || discussionMode === 'assistant' || discussionMode === 'expert' || discussionMode === 'player') {
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

      const replyId = `${expert.id}-reply-${Date.now()}`;
      const userMsgId = `user-${Date.now()}`;
      setMessages(prev => [...prev,
        { id: userMsgId, expertId: '__user__', content: question, attachedFiles: followUpFilesBadges },
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
          files: followUpFilesToSend,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setMessages(prev => prev.map(m => m.id === replyId ? { ...m, content: `⚠️ ${(err as Error).message}`, isStreaming: false } : m));
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
      setMessages(prev => [...prev, { id: `user-multi-${Date.now()}`, expertId: '__user__', content: question, timestamp: Date.now(), attachedFiles: followUpFilesBadges }]);
      setMultiView('overview');

      for (const expert of activeExperts) {
        if (controller.signal.aborted) break;
        setActiveExpertId(expert.id);
        const msgId = `${expert.id}-followup-${Date.now()}`;
        setMessages(prev => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, timestamp: Date.now() }]);
        let fullContent = '';
        try {
          await streamExpert({ question, expert: { ...expert, systemPrompt: (expert.systemPrompt || PROMPTS[expert.id] || '') + '\n\n이전 대화 맥락을 참고하여 후속 질문에 답변하세요.' },
            previousResponses: prevAll, round: 'initial',
            onDelta: chunk => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
            onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m)); },
            signal: controller.signal,
            files: followUpFilesToSend });
        } catch (err) {
          if ((err as Error).name === 'AbortError') break;
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: `⚠️ 응답을 받아오지 못했어요.`, isStreaming: false } : m));
        }
        prevAll.push({ name: expert.nameKo, content: fullContent });
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_EXPERTS));
      }
      setActiveExpertId(undefined);
      setIsDiscussing(false);
      return;
    }

    // 찬반/심층/브레인스토밍/검증 토론: 모든 토론자에게 질문 (토론 맥락 유지)
    if (['procon', 'standard', 'brainstorm', 'hearing'].includes(discussionMode)) {
      setIsDiscussing(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const prevAll = messages.filter(m => m.expertId !== '__round__' && m.content).map(m => {
        if (m.expertId === '__user__') return { name: '사용자', content: m.content };
        const e = allExperts.find(ex => ex.id === m.expertId);
        return { name: e?.nameKo || '', content: m.content };
      });
      setMessages(prev => [...prev, { id: `user-debate-followup-${Date.now()}`, expertId: '__user__', content: question, attachedFiles: followUpFilesBadges }]);

      const stanceExtra = discussionMode === 'procon'
        ? (id: string) => proconStances[id] === 'pro'
          ? '\n\n사용자가 추가 질문을 했습니다. 당신은 찬성 측이었습니다. 찬성 관점에서 이전 토론 맥락을 바탕으로 답변하세요.'
          : '\n\n사용자가 추가 질문을 했습니다. 당신은 반대 측이었습니다. 반대 관점에서 이전 토론 맥락을 바탕으로 답변하세요.'
        : discussionMode === 'brainstorm'
        ? () => '\n\n사용자가 새로운 방향을 제시했습니다. 이 방향으로 새로운 아이디어를 짧고 핵심적으로 제시하세요. 아이디어당 2-3문장 이내.\n각 아이디어를 ---IDEA--- / ---END--- 구분자로 분리하세요.'
        : () => '\n\n사용자가 추가 질문을 했습니다. 이전 토론 맥락을 바탕으로 답변하세요.';

      for (const expert of activeExperts) {
        if (controller.signal.aborted) break;
        setActiveExpertId(expert.id);
        const msgId = `${expert.id}-debate-followup-${Date.now()}`;
        setMessages(prev => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true }]);
        let fullContent = '';
        try {
          await streamExpert({ question, expert: { ...expert, systemPrompt: (expert.systemPrompt || PROMPTS[expert.id] || '') + stanceExtra(expert.id) },
            previousResponses: prevAll, round: 'initial',
            onDelta: chunk => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
            onDone: () => {
              // brainstorm 후속질문도 아이디어 파싱
              if (discussionMode === 'brainstorm') {
                const ideas = fullContent.split('---IDEA---').map(s => s.replace(/---END---/g, '').trim()).filter(s => s.length > 0);
                if (ideas.length > 1) {
                  setMessages(prev => {
                    const without = prev.filter(m => m.id !== msgId);
                    const ideaMsgs = ideas.map((idea, ii) => ({ id: `${msgId}-idea-${ii}`, expertId: expert.id, content: idea, isStreaming: false }));
                    return [...without, ...ideaMsgs];
                  });
                  return;
                }
              }
              setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m));
            },
            signal: controller.signal,
            files: followUpFilesToSend });
        } catch (err) {
          if ((err as Error).name === 'AbortError') break;
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: `⚠️ 응답을 받아오지 못했어요.`, isStreaming: false } : m));
        }
        prevAll.push({ name: expert.nameKo, content: fullContent });
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_EXPERTS));
      }
      setActiveExpertId(undefined);
      setIsDiscussing(false);
      return;
    }

    // 다른 모드: 새 토론 시작
    startDiscussion(question);
  }, [isDiscussing, discussionMode, activeExperts, messages, allExperts, proconStances, startDiscussion]);

  // Export discussion as markdown

  // Active expert info
  const activeExpert = activeExpertId ? allExperts.find(e => e.id === activeExpertId) : null;

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="h-screen flex w-full bg-[#f7f7f8] dark:bg-[#0f1117]">
        {/* Dev Panel — D-day + Todo + Schedule */}
        {(() => {
          const targetDate = new Date(devDdayDate + 'T00:00:00');
          const now = new Date();
          const diffMs = targetDate.getTime() - now.getTime();
          const dDay = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const dDayText = dDay > 0 ? `D-${dDay}` : dDay === 0 ? 'D-DAY' : `D+${Math.abs(dDay)}`;
          const targetMonth = targetDate.getMonth() + 1;
          const targetDay = targetDate.getDate();
          return (
            <div className={cn('fixed right-0 top-4 z-40 transition-all duration-300', devPanelOpen ? 'w-72' : 'w-0')}>
              {devPanelOpen && (
                <div className="w-72 max-h-[80vh] bg-white border border-slate-200 rounded-l-2xl shadow-xl flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
                  {/* D-day Header — 클릭해서 날짜/라벨 수정 */}
                  <div className="px-4 py-3 bg-gradient-to-r from-red-500 to-rose-500 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-white text-[22px] font-black tracking-tight">{dDayText}</span>
                      <div>
                        <div className="flex items-center gap-1">
                          <input type="date" value={devDdayDate} onChange={e => saveDevDday(e.target.value, devDdayLabel)}
                            className="bg-transparent text-white/90 text-[10px] font-semibold border-none outline-none w-[85px] cursor-pointer [color-scheme:dark]" />
                          <input type="text" value={devDdayLabel} onChange={e => saveDevDday(devDdayDate, e.target.value)}
                            className="bg-transparent text-white/90 text-[10px] font-semibold border-b border-white/30 outline-none w-[40px] placeholder:text-white/40"
                            placeholder="라벨" />
                        </div>
                        <p className="text-white/60 text-[9px]">{now.getMonth() + 1}월 {now.getDate()}일 기준</p>
                      </div>
                    </div>
                    <button onClick={toggleDevPanel} className="text-white/60 hover:text-white text-[16px] transition-colors">✕</button>
                  </div>

                  {/* 대원칙 */}
                  <div className="px-3 py-2.5 border-b border-slate-100 flex-shrink-0">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">대원칙</p>
                    <textarea
                      value={devPrinciple}
                      onChange={e => saveDevPrinciple(e.target.value)}
                      placeholder="프로젝트 대원칙을 적어주세요..."
                      className="w-full min-h-[60px] p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 placeholder:text-slate-300 outline-none resize-none focus:border-slate-400 transition-all"
                    />
                  </div>

                  {/* Todo List */}
                  <div className="px-3 py-2.5 border-b border-slate-100 flex-shrink-0">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">할 일</p>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-thin">
                      {devTodos.map((todo, idx) => (
                        <div key={todo.id} className="flex items-center gap-1.5 group">
                          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-all shrink-0">
                            {idx > 0 && <button onClick={() => { const t = [...devTodos]; [t[idx-1], t[idx]] = [t[idx], t[idx-1]]; saveDevTodos(t); }}
                              className="text-slate-300 hover:text-slate-600 text-[8px] leading-none">▲</button>}
                            {idx < devTodos.length - 1 && <button onClick={() => { const t = [...devTodos]; [t[idx], t[idx+1]] = [t[idx+1], t[idx]]; saveDevTodos(t); }}
                              className="text-slate-300 hover:text-slate-600 text-[8px] leading-none">▼</button>}
                          </div>
                          <button onClick={() => saveDevTodos(devTodos.map(t => t.id === todo.id ? { ...t, done: !t.done } : t))}
                            className={cn('w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all',
                              todo.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-slate-400')}>
                            {todo.done && <Check className="w-2.5 h-2.5 text-white" />}
                          </button>
                          {editingTodoId === todo.id ? (
                            <input type="text" value={editingTodoText} onChange={e => setEditingTodoText(e.target.value)}
                              onBlur={() => { saveDevTodos(devTodos.map(t => t.id === todo.id ? { ...t, text: editingTodoText } : t)); setEditingTodoId(null); }}
                              onKeyDown={e => { if (e.key === 'Enter') { saveDevTodos(devTodos.map(t => t.id === todo.id ? { ...t, text: editingTodoText } : t)); setEditingTodoId(null); } }}
                              className="flex-1 text-[11px] leading-snug text-slate-700 border-b border-slate-300 outline-none bg-transparent"
                              autoFocus />
                          ) : (
                            <span onClick={() => { setEditingTodoId(todo.id); setEditingTodoText(todo.text); }}
                              className={cn('flex-1 text-[11px] leading-snug cursor-pointer hover:text-blue-600', todo.done ? 'text-slate-400 line-through' : 'text-slate-700')}>{todo.text}</span>
                          )}
                          <button onClick={() => saveDevTodos(devTodos.filter(t => t.id !== todo.id))}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 text-[12px] transition-all shrink-0">✕</button>
                        </div>
                      ))}
                      {devTodos.length === 0 && <p className="text-[10px] text-slate-300 text-center py-2">할 일이 없습니다</p>}
                    </div>
                    <div className="flex gap-1.5 mt-2">
                      <input type="text" value={newTodoText} onChange={e => setNewTodoText(e.target.value)}
                        placeholder="할 일 추가..."
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-slate-400 transition-all"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newTodoText.trim()) {
                            saveDevTodos([...devTodos, { id: `todo-${Date.now()}`, text: newTodoText.trim(), done: false }]);
                            setNewTodoText('');
                          }
                        }} />
                      <button onClick={() => {
                        if (newTodoText.trim()) {
                          saveDevTodos([...devTodos, { id: `todo-${Date.now()}`, text: newTodoText.trim(), done: false }]);
                          setNewTodoText('');
                        }
                      }} className="px-2 py-1.5 rounded-lg bg-slate-800 text-white text-[10px] font-semibold hover:bg-slate-700 transition-colors shrink-0">추가</button>
                    </div>
                  </div>

                  {/* Schedule Memo */}
                  <div className="px-3 py-2.5 flex-1 min-h-0 flex flex-col">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">일정 / 메모</p>
                    <textarea
                      value={devSchedule}
                      onChange={e => saveDevSchedule(e.target.value)}
                      placeholder="일정이나 메모를 자유롭게 입력하세요..."
                      className="flex-1 min-h-[100px] p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 placeholder:text-slate-300 outline-none resize-none focus:border-slate-400 transition-all"
                    />
                    <p className="text-[8px] text-slate-300 text-right mt-1">자동 저장</p>
                  </div>
                </div>
              )}
              {!devPanelOpen && (
                <button onClick={toggleDevPanel}
                  className="absolute right-0 top-0 px-2.5 py-1.5 bg-gradient-to-r from-red-500 to-rose-500 border-0 rounded-l-lg shadow-md flex items-center gap-1.5 hover:shadow-lg transition-all">
                  <span className="text-white text-[13px] font-black">{dDayText}</span>
                </button>
              )}
            </div>
          );
        })()}
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
          <div ref={scrollRef} className={cn("flex-1 overflow-y-auto scrollbar-thin relative", discussionMode === 'player' && 'bg-gradient-to-b from-slate-900 to-slate-800')} onScroll={handleScroll}>
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
                  onSampleQuestionClick={(q) => setSampleQuestionValue(q)}
                  onStartGame={(id, opt, label) => setActiveGame({ id, option: opt, label })}
                />
              )}

              {/* Game Player — 게임 전용 UI */}
              {activeGame && discussionMode === 'player' && (
                <div className="animate-in fade-in zoom-in-95 duration-500 ease-out fill-mode-both">
                <GamePlayer
                  gameId={activeGame.id}
                  gameOption={activeGame.option}
                  optionLabel={activeGame.label}
                  messages={messages}
                  onSendMessage={(msg) => handleFollowUp(msg)}
                  onExit={() => { setActiveGame(null); handleNewDiscussion(); }}
                  isDiscussing={isDiscussing}
                />
                </div>
              )}

              {/* Clarifying Questions — 단일 AI 플로팅 모달 */}
              {/* 인라인 명확화 질문 — 채팅 흐름 안에서 표시 */}
              {chatClarify?.show && (() => {
                const q = chatClarify.questions[chatClarify.currentPage];
                if (!q) return null;
                const isLast = chatClarify.currentPage === chatClarify.questions.length - 1;
                const expert0 = activeExperts[0];

                const handleSelect = (value: string) => {
                  const newSelections = { ...chatClarify.selections, [q.id]: value };
                  if (value !== '__custom__' && isLast) {
                    const answerParts = chatClarify.questions.map(qq => {
                      const sel = qq.id === q.id ? value : newSelections[qq.id];
                      const opt = qq.options.find(o => o.value === sel);
                      return opt ? opt.label : sel || '';
                    }).filter(Boolean);
                    const enriched = `${chatClarify.originalQuestion} (${answerParts.join(', ')})`;
                    const original = chatClarify.originalQuestion;
                    setChatClarify(null);
                    runDiscussion(enriched, undefined, undefined, original);
                  } else if (value !== '__custom__' && !isLast) {
                    setChatClarify({ ...chatClarify, selections: newSelections, currentPage: chatClarify.currentPage + 1 });
                  } else {
                    setChatClarify({ ...chatClarify, selections: newSelections });
                  }
                };

                const handleCustomSubmit = () => {
                  const customVal = chatClarify.customInputs[q.id]?.trim();
                  if (!customVal) return;
                  const newSelections = { ...chatClarify.selections, [q.id]: customVal };
                  if (isLast) {
                    const answerParts = chatClarify.questions.map(qq => {
                      const sel = qq.id === q.id ? customVal : newSelections[qq.id];
                      return sel || '';
                    }).filter(Boolean);
                    const enriched = `${chatClarify.originalQuestion} (${answerParts.join(', ')})`;
                    const original = chatClarify.originalQuestion;
                    setChatClarify(null);
                    runDiscussion(enriched, undefined, undefined, original);
                  } else {
                    setChatClarify({ ...chatClarify, selections: newSelections, currentPage: chatClarify.currentPage + 1 });
                  }
                };

                const handleSkip = () => {
                  skipClarifyRef.current = true;
                  setChatClarify(null);
                  runDiscussion(chatClarify.originalQuestion);
                };

                return (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/60 backdrop-blur-[2px] animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-3 duration-300">
                      {/* AI 헤더 바 */}
                      <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 flex items-center gap-2.5">
                        {expert0 && <ExpertAvatar expert={expert0} size="xs" active />}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-[12px] font-bold truncate">{expert0?.nameKo || 'AI'}</p>
                          <p className="text-white/60 text-[9px]">더 정확한 답변을 위해 확인 중</p>
                        </div>
                      </div>

                      {/* 질문 헤더 — 질문 텍스트 + 페이지 표시 */}
                      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
                        <p className="text-[15px] font-bold text-slate-800 leading-snug">{q.question}</p>
                        {chatClarify.questions.length > 1 && (
                          <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-slate-400">
                            {chatClarify.currentPage > 0 && (
                              <button onClick={() => setChatClarify({ ...chatClarify, currentPage: chatClarify.currentPage - 1 })}
                                className="hover:text-slate-600 transition-colors">‹</button>
                            )}
                            <span>{chatClarify.questions.length}개 중 {chatClarify.currentPage + 1}개</span>
                            {chatClarify.currentPage < chatClarify.questions.length - 1 && (
                              <span className="text-slate-300">›</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 선택지 — 깔끔한 리스트 */}
                      <div className="px-3 pb-2">
                        {q.options.filter(o => o.value !== '__custom__').map((opt, oi) => {
                          const isSelected = chatClarify.selections[q.id] === opt.value;
                          return (
                            <button key={oi} onClick={() => handleSelect(opt.value)}
                              className={cn('w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left mb-1',
                                isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50')}>
                              <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0',
                                isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400')}>{oi + 1}</span>
                              <span className={cn('text-[13px] font-medium flex-1', isSelected ? 'text-indigo-600' : 'text-slate-700')}>{opt.label}</span>
                              {isSelected && <span className="text-indigo-400 text-[14px]">→</span>}
                            </button>
                          );
                        })}

                        {/* 기타 직접 입력 옵션 */}
                        {q.options.some(o => o.value === '__custom__') && (
                          <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-slate-50 transition-all mb-1">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[13px] text-slate-400 shrink-0">✎</span>
                            {chatClarify.selections[q.id] === '__custom__' ? (
                              <div className="flex-1 flex gap-2">
                                <input type="text" value={chatClarify.customInputs[q.id] || ''} autoFocus
                                  onChange={e => setChatClarify({ ...chatClarify, customInputs: { ...chatClarify.customInputs, [q.id]: e.target.value } })}
                                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                  placeholder="직접 입력..." onKeyDown={e => { if (e.key === 'Enter') handleCustomSubmit(); }} />
                                <button onClick={handleCustomSubmit} className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-[11px] font-semibold">확인</button>
                              </div>
                            ) : (
                              <button onClick={() => handleSelect('__custom__')} className="text-[13px] font-medium text-slate-400 hover:text-slate-600">기타</button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* AI 표시 — 상단 바 스타일 */}
                    </div>
                  </div>
                );
              })()}

              {/* Topic clarification — floating modal */}
              {clarifyState.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                    {/* Header — 모드별 진행자 */}
                    <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <span className="text-[18px]">{discussionMode === 'hearing' ? '🔍' : discussionMode === 'brainstorm' ? '💡' : '🎙️'}</span>
                        </div>
                        <div>
                          <h3 className="text-[14px] font-bold text-slate-800">
                            {discussionMode === 'hearing' ? '검증 진행자' : discussionMode === 'brainstorm' ? '세션 진행자' : '토론 진행자'}
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            {discussionMode === 'hearing' ? '아이디어를 검증하기 전에 주제를 확인합니다' : discussionMode === 'brainstorm' ? '브레인스토밍 전에 주제를 확인합니다' : '토론을 시작하기 전에 주제를 확인합니다'}
                          </p>
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

                        {/* Re-suggest */}
                        <div className="rounded-xl border border-dashed border-slate-200 p-3">
                          <p className="text-[11px] text-slate-500 mb-2">원하는 주제가 없나요? 키워드를 바꿔서 다시 제안받을 수 있어요</p>
                          <div className="flex gap-2">
                            <input type="text" value={clarifyState.customEdit}
                              onChange={e => setClarifyState(prev => ({ ...prev, customEdit: e.target.value }))}
                              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-[12px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                              placeholder="예: 소비자 물가 영향, 전기차 전환..."
                              onKeyDown={e => { if (e.key === 'Enter' && clarifyState.customEdit.trim()) clarifyTopic(clarifyState.customEdit.trim(), discussionMode as any); }}
                            />
                            <button onClick={() => { if (clarifyState.customEdit.trim()) clarifyTopic(clarifyState.customEdit.trim(), discussionMode as any); }}
                              className="px-3.5 py-2 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold hover:bg-slate-200 transition-colors shrink-0">
                              다시 제안
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

              {/* Question header — 모드별 분기 (게임 모드에서는 숨김) */}
              {!activeGame && currentQuestion && messages.length > 0 && discussionMode !== 'procon' && discussionMode !== 'standard' && discussionMode !== 'multi' && (
                getMainMode(discussionMode) === 'general' ? (
                  /* 단일 AI — 오른쪽 말풍선 */
                  <div className="flex justify-end">
                    <div className="max-w-[75%] bg-indigo-500 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
                      <p className="text-[13px] leading-relaxed">{currentQuestion}</p>
                    </div>
                  </div>
                ) : (
                  /* 기타 모드 — 왼쪽 버블 */
                  <button type="button" onClick={() => setQuestionExpanded(!questionExpanded)}
                    className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 text-left max-w-[80%] hover:bg-slate-200/70 transition-colors">
                    <p className={cn('text-[13px] text-slate-600 leading-relaxed flex-1', !questionExpanded && 'line-clamp-2')}>
                      {currentQuestion}
                    </p>
                    <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5 transition-transform', questionExpanded && 'rotate-180')} />
                  </button>
                )
              )}

              {/* Participants display — VS layout for procon, normal for others */}
              {currentQuestion && messages.length > 0 && ['standard', 'procon', 'brainstorm', 'hearing'].includes(discussionMode) && activeExperts.length > 0 && (
                discussionMode === 'standard' ? (
                  /* 심층토론 스테이지 헤더 */
                  <div className="rounded-2xl overflow-hidden shadow-lg border border-indigo-200/50">
                    <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[20px]">🎯</span>
                          <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">심층 토론</span>
                        </div>
                        {isDiscussing && <span className="text-[8px] font-bold text-red-300 uppercase tracking-widest animate-pulse">● LIVE</span>}
                      </div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {activeExperts.map((e, i) => {
                          const colors = ['from-blue-400 to-blue-500', 'from-emerald-400 to-emerald-500', 'from-violet-400 to-violet-500', 'from-amber-400 to-amber-500', 'from-rose-400 to-rose-500'];
                          return (
                            <div key={e.id} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all',
                              activeExpertId === e.id ? `bg-gradient-to-r ${colors[i % colors.length]} shadow-lg scale-105` : 'bg-white/15 backdrop-blur-sm')}>
                              <ExpertAvatar expert={e} size="xs" active={activeExpertId === e.id} />
                              <span className="text-[11px] font-bold text-white">{e.nameKo}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="bg-slate-800 px-5 py-2.5 flex items-center">
                      <span className="text-[12px] font-medium text-slate-200 flex-1 leading-snug">{currentQuestion}</span>
                    </div>
                  </div>
                ) : discussionMode === 'procon' ? (
                  /* VS 토론 스테이지 */
                  <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-300/50">
                    {/* 그라디언트 배경 */}
                    <div className="bg-gradient-to-r from-blue-600 via-slate-900 to-red-600 px-5 py-5">
                      <div className="flex items-center">
                        {/* 찬성 팀 */}
                        <div className="flex-1">
                          <div className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-2">TEAM PRO</div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {activeExperts.filter(e => proconStances[e.id] === 'pro').map(e => (
                              <div key={e.id} className={cn('flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all',
                                activeExpertId === e.id ? 'bg-blue-500/40 ring-2 ring-blue-300' : 'bg-white/10')}>
                                <ExpertAvatar expert={e} size="sm" active={activeExpertId === e.id} />
                                <span className="text-[12px] font-bold text-white">{e.nameKo}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* VS 뱃지 */}
                        <div className="shrink-0 mx-4 flex flex-col items-center gap-1">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <span className="text-[18px] font-black text-white">VS</span>
                          </div>
                          {isDiscussing && <span className="text-[8px] font-bold text-red-300 uppercase tracking-widest animate-pulse">LIVE</span>}
                        </div>
                        {/* 반대 팀 */}
                        <div className="flex-1 text-right">
                          <div className="text-[10px] font-bold text-red-200 uppercase tracking-widest mb-2">TEAM CON</div>
                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            {activeExperts.filter(e => proconStances[e.id] === 'con').map(e => (
                              <div key={e.id} className={cn('flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all',
                                activeExpertId === e.id ? 'bg-red-500/40 ring-2 ring-red-300' : 'bg-white/10')}>
                                <span className="text-[12px] font-bold text-white">{e.nameKo}</span>
                                <ExpertAvatar expert={e} size="sm" active={activeExpertId === e.id} />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* 토론 주제 */}
                    <div className="bg-slate-800 px-5 py-2 flex items-center justify-center gap-2">
                      <span className="text-[12px] font-medium text-slate-300">{currentQuestion}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-1 flex-wrap">
                    {activeExperts.map((expert) => (
                      <span key={expert.id} className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border',
                        activeExpertId === expert.id ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-white border-slate-100 text-slate-500'
                      )}>
                        <span className="text-[12px]">{expert.icon}</span>
                        {expert.nameKo}
                      </span>
                    ))}
                  </div>
                )
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
                  const sortedExperts = participatingExperts;
                  const activeTab = multiActiveTab || sortedExperts[0]?.id || null;
                  const activeIdx = sortedExperts.findIndex(e => e.id === activeTab);
                  const prevExpert = activeIdx > 0 ? sortedExperts[activeIdx - 1] : null;
                  const nextExpert = activeIdx < sortedExperts.length - 1 ? sortedExperts[activeIdx + 1] : null;

                  return (
                    <div className="space-y-3">
                      {/* 헤더 */}
                      {!isDiscussing && (
                        <div className="space-y-3">
                          {currentQuestion && multiView === 'overview' && (
                            <button type="button" onClick={() => setQuestionExpanded(!questionExpanded)}
                              className="w-full text-left px-4 py-2.5 rounded-t-2xl border border-b-0 border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                              <p className={cn('text-[13px] text-slate-600 leading-relaxed', !questionExpanded && 'line-clamp-5')}>
                                {currentQuestion}
                              </p>
                              {currentQuestion.length > 200 && (
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                  {questionExpanded ? '▲ 접기' : '▼ 더보기'}
                                </span>
                              )}
                            </button>
                          )}
                          {sortedExperts.length > 1 && !isDiscussing && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                                {([['overview', '전체'], ['detail', '상세'], ['compare', '비교']] as const).map(([v, label]) => (
                                  <button key={v} onClick={() => {
                                    setMultiView(v as any);
                                    if (v === 'compare' && sortedExperts.length >= 2) setMultiCompareIds([sortedExperts[0].id, sortedExperts[1].id]);
                                  }} className={cn('px-3 py-1 rounded-md text-[11px] font-semibold transition-all',
                                    multiView === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
                                    {label}
                                  </button>
                                ))}
                              </div>
                              <div className="flex -space-x-1.5">
                                {sortedExperts.slice(0, 4).map(e => <ExpertAvatar key={e.id} expert={e} size="xs" />)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Layer 1: Overview ── */}
                      {(multiView === 'overview' || isDiscussing) && (
                        <div className={cn('grid gap-3 items-start', sortedExperts.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
                          {sortedExperts.map((expert, ei) => {
                            const msg = expertMsgs.find(m => m.expertId === expert.id);
                            if (!msg) return null;
                            const preview = msg.content.slice(0, 200);
                            const charCount = msg.content.length;
                            const gradients = [
                              'from-blue-400 to-blue-500', 'from-emerald-400 to-emerald-500',
                              'from-violet-400 to-violet-500', 'from-amber-400 to-amber-500',
                              'from-rose-400 to-rose-500', 'from-cyan-400 to-cyan-500'
                            ];
                            const bgTints = [
                              'bg-blue-50/50', 'bg-emerald-50/50', 'bg-violet-50/50',
                              'bg-amber-50/50', 'bg-rose-50/50', 'bg-cyan-50/50'
                            ];
                            const gradient = gradients[ei % gradients.length];
                            const bgTint = bgTints[ei % bgTints.length];
                            return (
                              <button key={expert.id} type="button"
                                onClick={() => { setMultiActiveTab(expert.id); if (!isDiscussing) setMultiView('detail'); }}
                                className={cn(
                                  'group rounded-2xl border border-slate-200 overflow-hidden transition-all text-left flex flex-col',
                                  bgTint,
                                  !isDiscussing && 'hover:shadow-xl hover:-translate-y-1 hover:border-slate-300'
                                )}>
                                {/* 헤더 — 연한 그라디언트 */}
                                <div className={cn('flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r text-white', gradient)}>
                                  <ExpertAvatar expert={expert} size="xs" active={msg.isStreaming} />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-[12px] font-bold">{expert.nameKo}</span>
                                    <span className="text-[9px] text-white/60 ml-1.5">{expert.description}</span>
                                  </div>
                                  {msg.isStreaming && <span className="flex gap-0.5"><span className="typing-dot w-1.5 h-1.5 rounded-full bg-white/60" /><span className="typing-dot w-1.5 h-1.5 rounded-full bg-white/60" /><span className="typing-dot w-1.5 h-1.5 rounded-full bg-white/60" /></span>}
                                </div>
                                {/* 본문 */}
                                <div className="px-4 py-3 text-[12px] leading-relaxed text-slate-600 line-clamp-8 min-h-[80px] max-h-[200px] overflow-hidden flex-1">
                                  {preview || (msg.isStreaming ? '응답 생성 중...' : '')}
                                  {charCount > 200 && <span className="text-slate-300">...</span>}
                                </div>
                                {/* 푸터 */}
                                {!msg.isStreaming && charCount > 0 && (
                                  <div className="px-4 pb-3 pt-0 flex items-center justify-between">
                                    <span className="text-[10px] font-semibold text-indigo-500 group-hover:text-indigo-600 transition-colors">자세히 보기 →</span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* ── Layer 2: Detail — AI 컬러 연동 ── */}
                      {multiView === 'detail' && !isDiscussing && (() => {
                        const activeMsgs = getExpertAllMsgs(activeTab || '');
                        const activeExp = allExperts.find(e => e.id === activeTab);
                        if (!activeMsgs.length || !activeExp) return null;
                        const relatedUserMsgs = userMsgs.filter(m => m.content.includes(activeExp.nameKo));
                        // Overview 카드와 동일한 컬러 매핑
                        const detailGradients = [
                          'from-blue-400 to-blue-500', 'from-emerald-400 to-emerald-500',
                          'from-violet-400 to-violet-500', 'from-amber-400 to-amber-500',
                          'from-rose-400 to-rose-500', 'from-cyan-400 to-cyan-500'
                        ];
                        const detailBgTints = [
                          'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
                          'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'
                        ];
                        const detailHoverBgs = [
                          'hover:bg-blue-50', 'hover:bg-emerald-50', 'hover:bg-violet-50',
                          'hover:bg-amber-50', 'hover:bg-rose-50', 'hover:bg-cyan-50'
                        ];
                        const activeIdx = sortedExperts.findIndex(e => e.id === activeTab);
                        const activeGradient = detailGradients[(activeIdx >= 0 ? activeIdx : 0) % detailGradients.length];
                        return (
                          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
                            {/* AI 탭바 — 활성 AI 색상 연동 */}
                            <div className={cn('flex items-center gap-1 px-3 py-2 overflow-x-auto scrollbar-none bg-gradient-to-r', activeGradient)}>
                              {sortedExperts.map((expert, ei) => {
                                const isActive = activeTab === expert.id;
                                return (
                                  <button key={expert.id} onClick={() => setMultiActiveTab(expert.id)}
                                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 text-[11px] font-semibold',
                                      isActive ? 'bg-white text-slate-800 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/20')}>
                                    <ExpertAvatar expert={expert} size="xs" />
                                    {expert.nameKo}
                                    {getExpertAllMsgs(expert.id).length > 1 && <span className={cn('text-[9px] px-1 rounded', isActive ? 'bg-slate-200 text-slate-500' : 'bg-white/20 text-white')}>{getExpertAllMsgs(expert.id).length}</span>}
                                  </button>
                                );
                              })}
                              <span className="flex-1" />
                            </div>
                            {/* 응답 */}
                            <div className="p-4 space-y-3">
                              {activeMsgs.map((msg, i) => (
                                <div key={msg.id}>
                                  {i > 0 && relatedUserMsgs[i - 1] && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-[11.5px] text-slate-500 mb-2">
                                      💬 {relatedUserMsgs[i - 1].content}
                                    </div>
                                  )}
                                  <DiscussionMessageCard message={msg} expert={activeExp} variant="default"
                                    onLike={handleLike} onDislike={handleDislike} onRebuttal={isDone ? handleRebuttal : undefined} />
                                </div>
                              ))}
                            </div>
                            {/* 하단 — 네비게이션 + 추가 질문 */}
                            <div className="border-t border-slate-100">
                              <div className="flex items-center justify-between px-3 py-2 bg-slate-50/50">
                                {prevExpert ? (
                                  <button onClick={() => setMultiActiveTab(prevExpert.id)}
                                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 transition-all',
                                      detailHoverBgs[((activeIdx - 1 + sortedExperts.length) % sortedExperts.length) % detailHoverBgs.length])}>
                                    ← {prevExpert.nameKo}
                                  </button>
                                ) : <div />}
                                {nextExpert ? (
                                  <button onClick={() => setMultiActiveTab(nextExpert.id)}
                                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 transition-all',
                                      detailHoverBgs[((activeIdx + 1) % sortedExperts.length) % detailHoverBgs.length])}>
                                    {nextExpert.nameKo} →
                                  </button>
                                ) : <div />}
                              </div>
                              {isDone && (
                                <div className="flex items-center gap-2 px-3 py-3 bg-white border-t border-slate-100">
                                  <ExpertAvatar expert={activeExp} size="xs" />
                                  <input type="text" placeholder={`${activeExp.nameKo}에게 추가 질문...`}
                                    className="flex-1 px-3 py-2 rounded-xl bg-indigo-50/40 border border-indigo-200 text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:bg-white transition-all"
                                    onKeyDown={e => { if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) { askSingleAI(activeExp.id, (e.target as HTMLInputElement).value.trim()); (e.target as HTMLInputElement).value = ''; } }} />
                                  <button onClick={() => { const input = document.querySelector<HTMLInputElement>(`input[placeholder*="${activeExp.nameKo}"]`); if (input?.value.trim()) { askSingleAI(activeExp.id, input.value.trim()); input.value = ''; } }}
                                    className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-[11px] font-semibold hover:bg-indigo-600 transition-colors shadow-sm">질문</button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* ── Layer 3: Compare — 재설계 ── */}
                      {multiView === 'compare' && !isDiscussing && multiCompareIds && (() => {
                        const [leftId, rightId] = multiCompareIds;
                        const leftMsg = expertMsgs.find(m => m.expertId === leftId);
                        const rightMsg = expertMsgs.find(m => m.expertId === rightId);
                        const leftExp = allExperts.find(e => e.id === leftId);
                        const rightExp = allExperts.find(e => e.id === rightId);
                        return (
                          <div className="rounded-2xl bg-white border border-slate-200 shadow-md overflow-hidden">
                            {/* AI 선택 헤더 */}
                            <div className="grid grid-cols-2">
                              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-blue-400 to-blue-500 border-r border-white/20">
                                {leftExp && <ExpertAvatar expert={leftExp} size="xs" />}
                                <select value={multiCompareIds[0]}
                                  onChange={e => { const next = [...multiCompareIds] as [string, string]; next[0] = e.target.value; setMultiCompareIds(next); }}
                                  className="flex-1 px-2 py-1 rounded-lg border-0 bg-white/20 text-[12px] font-bold text-white focus:outline-none cursor-pointer [&>option]:text-slate-800">
                                  {sortedExperts.map(exp => (<option key={exp.id} value={exp.id}>{exp.nameKo}</option>))}
                                </select>
                              </div>
                              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-violet-400 to-violet-500">
                                {rightExp && <ExpertAvatar expert={rightExp} size="xs" />}
                                <select value={multiCompareIds[1]}
                                  onChange={e => { const next = [...multiCompareIds] as [string, string]; next[1] = e.target.value; setMultiCompareIds(next); }}
                                  className="flex-1 px-2 py-1 rounded-lg border-0 bg-white/20 text-[12px] font-bold text-white focus:outline-none cursor-pointer [&>option]:text-slate-800">
                                  {sortedExperts.map(exp => (<option key={exp.id} value={exp.id}>{exp.nameKo}</option>))}
                                </select>
                              </div>
                            </div>
                            {/* 나란히 비교 */}
                            <div className="grid grid-cols-2">
                              <div className="p-4 bg-blue-50/20 border-r border-slate-100">
                                {leftMsg && leftExp && <DiscussionMessageCard message={leftMsg} expert={leftExp} variant="default" onLike={handleLike} onDislike={handleDislike} />}
                              </div>
                              <div className="p-4 bg-violet-50/20">
                                {rightMsg && rightExp && <DiscussionMessageCard message={rightMsg} expert={rightExp} variant="default" onLike={handleLike} onDislike={handleDislike} />}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

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
                /* Procon: 탭형 라운드 + 찬반 나란히 */
                (() => {
                  // 라운드별로 그룹핑
                  const rounds: { label: string; id: string; proMsgs: typeof messages; conMsgs: typeof messages; otherMsgs: typeof messages }[] = [];
                  let currentLabel = '';
                  let currentId = '';
                  let currentPro: typeof messages = [];
                  let currentCon: typeof messages = [];
                  let currentOther: typeof messages = [];
                  const summaryMsgs = messages.filter(m => m.isSummary);

                  for (const msg of messages) {
                    if (msg.expertId === '__round__') {
                      if (currentLabel) rounds.push({ label: currentLabel, id: currentId, proMsgs: currentPro, conMsgs: currentCon, otherMsgs: currentOther });
                      currentLabel = msg.content;
                      currentId = msg.id;
                      currentPro = []; currentCon = []; currentOther = [];
                    } else if (!msg.isSummary && msg.expertId !== '__user__') {
                      if (proconStances[msg.expertId] === 'pro') currentPro.push(msg);
                      else if (proconStances[msg.expertId] === 'con') currentCon.push(msg);
                      else currentOther.push(msg);
                    }
                  }
                  if (currentLabel) rounds.push({ label: currentLabel, id: currentId, proMsgs: currentPro, conMsgs: currentCon, otherMsgs: currentOther });

                  // 메인 라운드만 (찬성+반대 합쳐서 같은 라운드번호끼리 병합)
                  const mergedRounds: typeof rounds = [];
                  for (const r of rounds) {
                    const roundNum = r.label.match(/(\d)/)?.[1];
                    const existing = mergedRounds.find(mr => mr.label.match(/(\d)/)?.[1] === roundNum && roundNum);
                    if (existing) {
                      existing.proMsgs.push(...r.proMsgs);
                      existing.conMsgs.push(...r.conMsgs);
                      existing.otherMsgs.push(...r.otherMsgs);
                    } else {
                      mergedRounds.push({ ...r, proMsgs: [...r.proMsgs], conMsgs: [...r.conMsgs], otherMsgs: [...r.otherMsgs] });
                    }
                  }

                  const activeRound = Math.min(proconActiveRound, mergedRounds.length - 1);
                  const currentRound = mergedRounds[activeRound >= 0 ? activeRound : 0];

                  // 스트리밍 중이면 마지막 라운드로 자동 이동
                  if (isDiscussing && mergedRounds.length > 0 && proconActiveRound !== mergedRounds.length - 1) {
                    setTimeout(() => setProconActiveRound(mergedRounds.length - 1), 0);
                  }

                  return (
                    <div className="space-y-2">
                      {/* 현재 라운드 — 회색 칸 안에 탭 + 찬반 */}
                      {currentRound && (
                        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                        {/* 라운드 탭 — 회색 칸 상단에 고정 */}
                        {mergedRounds.length > 0 && (
                          <div className="flex items-center gap-1 bg-slate-50 border-b border-slate-200 px-3 py-2 overflow-x-auto scrollbar-none">
                            {mergedRounds.map((r, ri) => {
                              const isActive = ri === (activeRound >= 0 ? activeRound : 0);
                              const roundNum = r.label.match(/(\d)/)?.[1] || '';
                              const isFinal = r.label.includes('최종');
                              const hasContent = r.proMsgs.length > 0 || r.conMsgs.length > 0;
                              return (
                                <button key={r.id} onClick={() => setProconActiveRound(ri)}
                                  className={cn('flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all shrink-0 text-[11px] font-semibold',
                                    isActive
                                      ? isFinal ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm' : 'bg-slate-800 text-white shadow-sm'
                                      : hasContent ? 'text-slate-500 hover:text-slate-700 hover:bg-white' : 'text-slate-300')}>
                                  <span className="text-[12px] font-black">{isFinal ? '⚖️' : `${roundNum}R`}</span>
                                  {isFinal ? '최종' : r.label.includes('주장') ? '주장' : r.label.includes('반론') ? '반론' : r.label.replace(/\d라운드\s*·?\s*/, '')}
                                  {isDiscussing && ri === mergedRounds.length - 1 && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {(currentRound.proMsgs.length > 0 || currentRound.conMsgs.length > 0) ? (
                        <div className={cn('grid gap-0 p-0 transition-all duration-300',
                          proconFocusSide === 'pro' ? 'grid-cols-1' : proconFocusSide === 'con' ? 'grid-cols-1' : 'grid-cols-2')}>
                          {/* 찬성 칼럼 */}
                          {proconFocusSide !== 'con' && (
                          <div className="space-y-3 p-4 bg-blue-50 border-r border-slate-100">
                            <div className="flex items-center gap-2 px-2">
                              <button type="button" onClick={() => setProconFocusSide(prev => prev === 'pro' ? null : 'pro')}
                                className="flex items-center gap-2 hover:opacity-70 transition-opacity cursor-pointer">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">찬성</span>
                              </button>
                              <div className="flex-1 h-px bg-blue-200" />
                              {proconFocusSide === 'pro' && (
                                <button type="button" onClick={() => setProconFocusSide(null)}
                                  className="text-[9px] text-blue-400 hover:text-blue-600 transition-colors">전체 보기 ←</button>
                              )}
                            </div>
                            {currentRound.proMsgs.map(msg => {
                              const expert = allExperts.find(e => e.id === msg.expertId);
                              if (!expert) return null;
                              return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="procon-pro" onLike={handleLike} onDislike={handleDislike} />;
                            })}
                            {currentRound.proMsgs.length === 0 && isDiscussing && (
                              <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/30 px-4 py-8 text-center text-[11px] text-blue-300">
                                발언 대기 중...
                              </div>
                            )}
                          </div>
                          )}
                          {/* 반대 칼럼 */}
                          {proconFocusSide !== 'pro' && (
                          <div className="space-y-3 p-4 bg-red-50">
                            <div className="flex items-center gap-2 px-2">
                              <button type="button" onClick={() => setProconFocusSide(prev => prev === 'con' ? null : 'con')}
                                className="flex items-center gap-2 hover:opacity-70 transition-opacity cursor-pointer">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">반대</span>
                              </button>
                              <div className="flex-1 h-px bg-red-200" />
                              {proconFocusSide === 'con' && (
                                <button type="button" onClick={() => setProconFocusSide(null)}
                                  className="text-[9px] text-red-400 hover:text-red-600 transition-colors">→ 전체 보기</button>
                              )}
                            </div>
                            {currentRound.conMsgs.map(msg => {
                              const expert = allExperts.find(e => e.id === msg.expertId);
                              if (!expert) return null;
                              return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="procon-con" onLike={handleLike} onDislike={handleDislike} />;
                            })}
                            {currentRound.conMsgs.length === 0 && isDiscussing && (
                              <div className="rounded-xl border border-dashed border-red-200 bg-red-50/30 px-4 py-8 text-center text-[11px] text-red-300">
                                발언 대기 중...
                              </div>
                            )}
                          </div>
                          )}
                        </div>
                        ) : isDiscussing ? (
                          <div className="px-4 py-8 text-center text-[11px] text-slate-300">발언 대기 중...</div>
                        ) : null}
                        </div>
                      )}

                      {/* 기타 (배정 분석 등) */}
                      {currentRound?.otherMsgs.map(msg => {
                        const expert = allExperts.find(e => e.id === msg.expertId);
                        if (!expert) return null;
                        return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="default" onLike={handleLike} onDislike={handleDislike} />;
                      })}

                      {/* 종합 판정 */}
                      {summaryMsgs.map(msg => {
                        const expert = allExperts.find(e => e.id === msg.expertId);
                        if (!expert) return null;
                        return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="default" />;
                      })}

                      {/* 후속 1:1 대화 — 메신저 스타일 */}
                      {(() => {
                        const lastSummaryIdx = messages.reduce((acc, m, i) => m.isSummary ? i : acc, -1);
                        const followUpMsgs = lastSummaryIdx >= 0 ? messages.slice(lastSummaryIdx + 1) : [];
                        if (followUpMsgs.length === 0) return null;
                        return (
                          <div className="space-y-2.5 pt-3 border-t border-slate-200 mt-3">
                            {followUpMsgs.map(msg => {
                              if (msg.expertId === '__user__') {
                                return (
                                  <div key={msg.id} className="flex justify-end">
                                    <div className="max-w-[70%] bg-indigo-500 text-white rounded-2xl rounded-br-md px-4 py-3 text-[13px] shadow-sm">
                                      <ReactMarkdownInline content={msg.content} />
                                    </div>
                                  </div>
                                );
                              }
                              if (msg.expertId === '__round__') return null;
                              const expert = allExperts.find(e => e.id === msg.expertId);
                              if (!expert) return null;
                              return (
                                <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="messenger" />
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()
              ) : discussionMode === 'brainstorm' ? (
                /* Brainstorm: curated or grid layout */
                (() => {
                  // 프로그레스 메시지 체크
                  const progressMsg = messages.find(m => m.expertId === '__brainstorm_progress__');
                  if (progressMsg) {
                    try {
                      const p = JSON.parse(progressMsg.content);
                      const stepPercent = Math.round((p.currentStep / p.totalSteps) * 100);
                      const hatColors: Record<string, { bg: string; text: string; label: string }> = {
                        '⬜ 흰 모자 · 사실': { bg: 'bg-slate-100', text: 'text-slate-600', label: '사실' },
                        '🟥 빨간 모자 · 감정': { bg: 'bg-red-100', text: 'text-red-600', label: '감정' },
                        '⬛ 검은 모자 · 비판': { bg: 'bg-slate-800', text: 'text-white', label: '비판' },
                        '🟨 노란 모자 · 긍정': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '긍정' },
                        '🟩 초록 모자 · 창의': { bg: 'bg-green-100', text: 'text-green-600', label: '창의' },
                        '🟦 파란 모자 · 종합': { bg: 'bg-blue-100', text: 'text-blue-600', label: '종합' },
                      };
                      return (
                        <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-500">
                          {/* 프레임워크 아이콘 */}
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[28px] shadow-lg mb-6 animate-pulse">
                            {p.framework === 'swot' ? '📊' : p.framework === 'sixhats' ? '🎩' : '💡'}
                          </div>

                          {/* 프레임워크 이름 + 단계 */}
                          <h3 className="text-[16px] font-bold text-slate-800 mb-1">{p.frameworkName}</h3>
                          <p className="text-[13px] text-violet-600 font-medium mb-6">{p.stepLabel}</p>

                          {/* 프로그레스 바 */}
                          <div className="w-64 h-2 bg-slate-200 rounded-full overflow-hidden mb-4">
                            <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${stepPercent}%` }} />
                          </div>
                          <span className="text-[11px] text-slate-400 mb-6">{p.currentStep + 1} / {p.totalSteps} 단계</span>

                          {/* SWOT 매트릭스 프로그레스 */}
                          {p.framework === 'swot' && (
                            <div className="grid grid-cols-2 gap-1 w-48 mb-6">
                              {['강점', '약점', '기회', '위협'].map((label, i) => (
                                <div key={label} className={cn('px-3 py-2 rounded-lg text-center text-[11px] font-semibold transition-all duration-500',
                                  i < p.currentStep ? 'bg-violet-500 text-white' : i === p.currentStep ? 'bg-violet-100 text-violet-700 animate-pulse' : 'bg-slate-100 text-slate-400')}>
                                  {label} {i < p.currentStep ? '✓' : i === p.currentStep ? '...' : ''}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 6색 모자 프로그레스 */}
                          {p.framework === 'sixhats' && (
                            <div className="flex gap-1.5 mb-6">
                              {Object.entries(hatColors).map(([key, val], i) => (
                                <div key={key} className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all duration-500',
                                  val.bg, val.text,
                                  i < p.currentStep ? 'opacity-100 scale-100' : i === p.currentStep ? 'opacity-100 scale-110 ring-2 ring-violet-400 animate-pulse' : 'opacity-30 scale-90')}>
                                  {i < p.currentStep ? '✓' : val.label.charAt(0)}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 참여자 상태 */}
                          <div className="flex items-center gap-2">
                            {p.experts.map((name: string) => {
                              const done = p.completedExperts?.includes(name);
                              return (
                                <span key={name} className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-300',
                                  done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400')}>
                                  {name} {done ? '✓' : ''}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    } catch { return null; }
                  }

                  // 큐레이션 결과 (isSummary) — 프레임워크별 커스텀 렌더링
                  const summaryMsgs = messages.filter(m => m.isSummary);
                  if (summaryMsgs.length > 0) {
                    const msg = summaryMsgs[0];
                    const fwId = msg.round || 'free';

                    // 스트리밍 중이면 일반 텍스트로 표시
                    if (msg.isStreaming) {
                      return (
                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                          <div className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                          <div className="flex items-center gap-1.5 mt-3">
                            <span className="typing-dot w-1.5 h-1.5 rounded-full bg-violet-400" />
                            <span className="typing-dot w-1.5 h-1.5 rounded-full bg-violet-400" />
                            <span className="typing-dot w-1.5 h-1.5 rounded-full bg-violet-400" />
                          </div>
                        </div>
                      );
                    }

                    // JSON 파싱 시도 — 여러 형태 처리
                    let data: any = null;
                    try {
                      let raw = msg.content;
                      // markdown 코드블록 제거
                      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
                      // 앞뒤 설명 텍스트 제거 — JSON 객체만 추출
                      const jsonMatch = raw.match(/\{[\s\S]*\}/);
                      if (jsonMatch) {
                        // 이스케이프 안 된 줄바꿈 처리
                        let jsonStr = jsonMatch[0].replace(/[\r\n]/g, ' ').replace(/\t/g, ' ');
                        data = JSON.parse(jsonStr);
                      }
                    } catch {
                      // 2차 시도: 줄바꿈 포함된 JSON
                      try {
                        const raw2 = msg.content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
                        const match2 = raw2.match(/\{[\s\S]*\}/);
                        if (match2) data = JSON.parse(match2[0]);
                      } catch { /* 최종 실패 → fallback */ }
                    }

                    // 파싱 실패 → 일반 마크다운으로 fallback
                    if (!data) {
                      const expert = allExperts.find(e => e.id === msg.expertId);
                      if (!expert) return null;
                      return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="default" />;
                    }

                    // ── 자유 발산 렌더링 ──
                    if (fwId === 'free') {
                      return (
                        <div key={msg.id} className="space-y-4 animate-in fade-in duration-500">
                          <div className="text-center mb-2">
                            <span className="text-[20px]">💡</span>
                            <h3 className="text-[15px] font-bold text-slate-800 mt-1">브레인스토밍 결과</h3>
                          </div>
                          {/* TOP 아이디어 */}
                          <div className="space-y-2">
                            {(data.topIdeas || []).map((idea: any, i: number) => (
                              <div key={i} className={cn(
                                'flex items-start gap-3 p-3.5 rounded-xl border transition-all hover:shadow-md',
                                i === 0 ? 'bg-amber-50 border-amber-200' : i === 1 ? 'bg-slate-50 border-slate-200' : i === 2 ? 'bg-orange-50/50 border-orange-200/50' : 'bg-white border-slate-200'
                              )}>
                                <span className="text-[18px] shrink-0 mt-0.5">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[13px] font-bold text-slate-800">{idea.title}</div>
                                  <div className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">{idea.desc}</div>
                                </div>
                                {idea.tag && (
                                  <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0',
                                    idea.tag === '즉시실행' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600')}>
                                    {idea.tag}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          {/* 결합 아이디어 */}
                          {data.combinations?.length > 0 && (
                            <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
                              <div className="text-[12px] font-bold text-violet-700 mb-2">🔗 결합하면 더 좋은 아이디어</div>
                              {data.combinations.map((c: any, i: number) => (
                                <div key={i} className="text-[12px] text-violet-600 mb-1">
                                  <span className="font-medium">{c.a}</span> + <span className="font-medium">{c.b}</span> → {c.result}
                                </div>
                              ))}
                            </div>
                          )}
                          {/* 한줄 요약 */}
                          {data.summary && (
                            <div className="text-center px-4 py-3 rounded-xl bg-slate-100">
                              <span className="text-[12px] text-slate-600">💡 {data.summary}</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // ── SWOT 렌더링 ──
                    if (fwId === 'swot') {
                      const quadrants = [
                        { key: 'strengths', label: '💪 강점', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', headerBg: 'bg-blue-100' },
                        { key: 'weaknesses', label: '⚠️ 약점', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', headerBg: 'bg-red-100' },
                        { key: 'opportunities', label: '🌟 기회', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', headerBg: 'bg-emerald-100' },
                        { key: 'threats', label: '🔥 위협', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', headerBg: 'bg-orange-100' },
                      ];
                      return (
                        <div key={msg.id} className="space-y-4 animate-in fade-in duration-500">
                          <div className="text-center mb-2">
                            <span className="text-[20px]">📊</span>
                            <h3 className="text-[15px] font-bold text-slate-800 mt-1">SWOT 분석 결과</h3>
                          </div>
                          {/* 2×2 매트릭스 */}
                          <div className="grid grid-cols-2 gap-2">
                            {quadrants.map(q => (
                              <div key={q.key} className={cn('rounded-xl border overflow-hidden', q.border, q.bg)}>
                                <div className={cn('px-3 py-2 text-[12px] font-bold', q.headerBg, q.text)}>{q.label}</div>
                                <div className="px-3 py-2.5 space-y-1.5">
                                  {(data[q.key] || []).map((item: any, i: number) => (
                                    <div key={i} className="text-[11px] text-slate-700">
                                      <span className="font-semibold">{item.title}</span>
                                      {item.desc && <span className="text-slate-500"> — {item.desc}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* 전략 제안 */}
                          {data.strategies && (
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { key: 'so', label: 'SO전략', sub: '강점 × 기회', bg: 'bg-blue-50/50 border-blue-100' },
                                { key: 'wo', label: 'WO전략', sub: '약점 × 기회', bg: 'bg-emerald-50/50 border-emerald-100' },
                                { key: 'st', label: 'ST전략', sub: '강점 × 위협', bg: 'bg-amber-50/50 border-amber-100' },
                                { key: 'wt', label: 'WT전략', sub: '약점 × 위협', bg: 'bg-red-50/50 border-red-100' },
                              ].map(s => (
                                <div key={s.key} className={cn('rounded-lg border p-2.5', s.bg)}>
                                  <div className="text-[10px] font-bold text-slate-700">{s.label} <span className="font-normal text-slate-400">{s.sub}</span></div>
                                  <div className="text-[11px] text-slate-600 mt-1">{data.strategies[s.key]}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          {data.summary && (
                            <div className="text-center px-4 py-3 rounded-xl bg-slate-100">
                              <span className="text-[12px] text-slate-600">💡 {data.summary}</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // ── 6색 모자 렌더링 ──
                    if (fwId === 'sixhats') {
                      const hats = [
                        { key: 'white', label: '흰 모자', sub: '사실과 데이터', bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400' },
                        { key: 'red', label: '빨간 모자', sub: '감정과 직관', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-400' },
                        { key: 'black', label: '검은 모자', sub: '비판과 위험', bg: 'bg-slate-800', border: 'border-slate-700', text: 'text-slate-200', dot: 'bg-slate-400' },
                        { key: 'yellow', label: '노란 모자', sub: '긍정과 가치', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400' },
                        { key: 'green', label: '초록 모자', sub: '창의와 대안', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400' },
                        { key: 'blue', label: '파란 모자', sub: '종합과 결론', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-400' },
                      ];
                      return (
                        <div key={msg.id} className="space-y-4 animate-in fade-in duration-500">
                          <div className="text-center mb-2">
                            <span className="text-[20px]">🎩</span>
                            <h3 className="text-[15px] font-bold text-slate-800 mt-1">6색 모자 분석 결과</h3>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            {hats.map(h => (
                              <div key={h.key} className={cn('rounded-xl border p-3.5 transition-all hover:shadow-md', h.bg, h.border)}>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className={cn('w-3 h-3 rounded-full', h.dot)} />
                                  <span className={cn('text-[12px] font-bold', h.text)}>{h.label}</span>
                                  <span className={cn('text-[9px]', h.key === 'black' ? 'text-slate-400' : 'text-slate-400')}>{h.sub}</span>
                                </div>
                                <div className="space-y-1">
                                  {(data[h.key] || []).map((item: string, i: number) => (
                                    <div key={i} className={cn('text-[11px] leading-relaxed', h.key === 'black' ? 'text-slate-300' : 'text-slate-600')}>
                                      · {item}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                          {data.summary && (
                            <div className="text-center px-4 py-3 rounded-xl bg-slate-100">
                              <span className="text-[12px] text-slate-600">💡 {data.summary}</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // ── SCAMPER 렌더링 ──
                    if (fwId === 'scamper') {
                      const steps = [
                        { key: 'substitute', label: 'S · 대체', icon: '🔄', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
                        { key: 'combine', label: 'C · 결합', icon: '🔗', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700' },
                        { key: 'adapt', label: 'A · 적용', icon: '🔧', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
                        { key: 'modify', label: 'M · 수정', icon: '✏️', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
                        { key: 'putToOtherUse', label: 'P · 용도변경', icon: '♻️', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700' },
                        { key: 'eliminate', label: 'E · 제거', icon: '✂️', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
                        { key: 'reverse', label: 'R · 뒤집기', icon: '🔃', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
                      ];
                      return (
                        <div key={msg.id} className="space-y-4 animate-in fade-in duration-500">
                          <div className="text-center mb-2"><span className="text-[20px]">🔧</span><h3 className="text-[15px] font-bold text-slate-800 mt-1">SCAMPER 분석 결과</h3></div>
                          <div className="space-y-2">
                            {steps.map(s => {
                              const items = data[s.key] || [];
                              if (items.length === 0) return null;
                              return (
                                <div key={s.key} className={cn('rounded-xl border p-3', s.bg, s.border)}>
                                  <div className={cn('text-[12px] font-bold mb-1.5', s.text)}>{s.icon} {s.label}</div>
                                  {items.map((item: any, i: number) => (
                                    <div key={i} className="text-[11px] text-slate-600 mb-1"><span className="font-semibold">{item.title}</span> — {item.desc}</div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                          {data.summary && <div className="text-center px-4 py-3 rounded-xl bg-slate-100"><span className="text-[12px] text-slate-600">💡 {data.summary}</span></div>}
                        </div>
                      );
                    }

                    // ── PMI 렌더링 ──
                    if (fwId === 'pmi') {
                      const cols = [
                        { key: 'plus', label: '➕ Plus · 장점', bg: 'bg-emerald-50', border: 'border-emerald-200', header: 'bg-emerald-100', text: 'text-emerald-700' },
                        { key: 'minus', label: '➖ Minus · 단점', bg: 'bg-red-50', border: 'border-red-200', header: 'bg-red-100', text: 'text-red-700' },
                        { key: 'interesting', label: '💡 Interesting · 흥미', bg: 'bg-amber-50', border: 'border-amber-200', header: 'bg-amber-100', text: 'text-amber-700' },
                      ];
                      return (
                        <div key={msg.id} className="space-y-4 animate-in fade-in duration-500">
                          <div className="text-center mb-2"><span className="text-[20px]">⚖️</span><h3 className="text-[15px] font-bold text-slate-800 mt-1">PMI 분석 결과</h3></div>
                          <div className="grid grid-cols-3 gap-2">
                            {cols.map(c => (
                              <div key={c.key} className={cn('rounded-xl border overflow-hidden', c.border, c.bg)}>
                                <div className={cn('px-3 py-2 text-[11px] font-bold text-center', c.header, c.text)}>{c.label}</div>
                                <div className="px-3 py-2.5 space-y-1.5">
                                  {(data[c.key] || []).map((item: any, i: number) => (
                                    <div key={i} className="text-[11px] text-slate-600"><span className="font-semibold">{item.title}</span>{item.desc && ` — ${item.desc}`}</div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                          {data.summary && <div className="text-center px-4 py-3 rounded-xl bg-slate-100"><span className="text-[12px] text-slate-600">💡 {data.summary}</span></div>}
                        </div>
                      );
                    }

                    // ── Five Whys 렌더링 ──
                    if (fwId === 'fivewhys') {
                      return (
                        <div key={msg.id} className="space-y-4 animate-in fade-in duration-500">
                          <div className="text-center mb-2"><span className="text-[20px]">🔍</span><h3 className="text-[15px] font-bold text-slate-800 mt-1">5 Why 분석 결과</h3></div>
                          <div className="space-y-0">
                            {(data.chain || []).map((step: any, i: number) => (
                              <div key={i} className="flex items-stretch">
                                <div className="flex flex-col items-center mr-3">
                                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0',
                                    i < 2 ? 'bg-blue-400' : i < 4 ? 'bg-violet-500' : 'bg-red-500')}>
                                    W{i + 1}
                                  </div>
                                  {i < (data.chain?.length || 0) - 1 && <div className="w-0.5 flex-1 bg-slate-200 my-1" />}
                                </div>
                                <div className="flex-1 pb-4">
                                  <div className="text-[12px] font-bold text-slate-700">{step.why}</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5 pl-2 border-l-2 border-slate-200">{step.because}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {data.rootCause && (
                            <div className="rounded-xl border-2 border-red-300 bg-red-50 p-3.5">
                              <div className="text-[11px] font-bold text-red-600 mb-1">🎯 근본 원인</div>
                              <div className="text-[12px] text-red-700 font-medium">{data.rootCause}</div>
                            </div>
                          )}
                          {data.solutions?.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="text-[11px] font-bold text-slate-600">💊 해결책</div>
                              {data.solutions.map((s: any, i: number) => (
                                <div key={i} className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
                                  <div className="text-[11px] text-emerald-700"><span className="font-semibold">{s.title}</span> — {s.desc}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          {data.summary && <div className="text-center px-4 py-3 rounded-xl bg-slate-100"><span className="text-[12px] text-slate-600">💡 {data.summary}</span></div>}
                        </div>
                      );
                    }

                    // ── Moonshot 렌더링 ──
                    if (fwId === 'moonshot') {
                      return (
                        <div key={msg.id} className="space-y-4 animate-in fade-in duration-500">
                          <div className="text-center mb-2"><span className="text-[20px]">🚀</span><h3 className="text-[15px] font-bold text-slate-800 mt-1">Moonshot 분석 결과</h3></div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div className="text-[10px] font-bold text-slate-400 mb-1">현재</div>
                              <div className="text-[12px] font-semibold text-slate-700">{data.current?.title}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">{data.current?.desc}</div>
                            </div>
                            <span className="text-[16px] shrink-0">→</span>
                            <div className="flex-1 rounded-xl border-2 border-violet-300 bg-violet-50 p-3">
                              <div className="text-[10px] font-bold text-violet-500 mb-1">10× 비전</div>
                              <div className="text-[12px] font-semibold text-violet-700">{data.tenX?.title}</div>
                              <div className="text-[11px] text-violet-500 mt-0.5">{data.tenX?.desc}</div>
                            </div>
                          </div>
                          {data.constraints?.length > 0 && (
                            <div className="rounded-xl border border-red-200 bg-red-50/50 p-3">
                              <div className="text-[11px] font-bold text-red-600 mb-1.5">🔓 제거할 제약</div>
                              {data.constraints.map((c: any, i: number) => (
                                <div key={i} className="text-[11px] text-red-600 mb-1">✕ <span className="font-medium">{c.title}</span> — {c.desc}</div>
                              ))}
                            </div>
                          )}
                          {data.mvp && (
                            <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3">
                              <div className="text-[11px] font-bold text-emerald-600 mb-1">🎯 최소 실행 단위 (MVP)</div>
                              <div className="text-[12px] font-semibold text-emerald-700">{data.mvp.title}</div>
                              <div className="text-[11px] text-emerald-500 mt-0.5">{data.mvp.desc}</div>
                            </div>
                          )}
                          {data.roadmap?.length > 0 && (
                            <div className="flex items-center gap-1">
                              {data.roadmap.map((r: any, i: number) => (
                                <React.Fragment key={i}>
                                  <div className="flex-1 rounded-lg bg-indigo-50 border border-indigo-200 p-2 text-center">
                                    <div className="text-[10px] font-bold text-indigo-600">{r.phase}</div>
                                    <div className="text-[9px] text-indigo-400 mt-0.5">{r.desc}</div>
                                  </div>
                                  {i < data.roadmap.length - 1 && <span className="text-[10px] text-slate-300 shrink-0">→</span>}
                                </React.Fragment>
                              ))}
                            </div>
                          )}
                          {data.summary && <div className="text-center px-4 py-3 rounded-xl bg-slate-100"><span className="text-[12px] text-slate-600">💡 {data.summary}</span></div>}
                        </div>
                      );
                    }

                    // ── Design Thinking 렌더링 ──
                    if (fwId === 'designthinking') {
                      const phases = [
                        { key: 'empathize', label: '공감', icon: '❤️', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' },
                      ];
                      return (
                        <div key={msg.id} className="space-y-4 animate-in fade-in duration-500">
                          <div className="text-center mb-2"><span className="text-[20px]">🎨</span><h3 className="text-[15px] font-bold text-slate-800 mt-1">Design Thinking 결과</h3></div>
                          {/* 공감 */}
                          <div className="rounded-xl border border-pink-200 bg-pink-50 p-3">
                            <div className="text-[12px] font-bold text-pink-700 mb-1.5">❤️ 공감 (Empathize)</div>
                            {(data.empathize || []).map((item: any, i: number) => (
                              <div key={i} className="text-[11px] text-pink-600 mb-1">· <span className="font-medium">{item.title}</span> — {item.desc}</div>
                            ))}
                          </div>
                          {/* 정의 */}
                          {data.define && (
                            <div className="rounded-xl border-2 border-violet-300 bg-violet-50 p-3">
                              <div className="text-[12px] font-bold text-violet-700 mb-1">🎯 문제 정의 (Define)</div>
                              <div className="text-[12px] font-semibold text-violet-800">{data.define.problem}</div>
                              {data.define.persona && <div className="text-[11px] text-violet-500 mt-1">👤 대상: {data.define.persona}</div>}
                            </div>
                          )}
                          {/* 아이디어 */}
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                            <div className="text-[12px] font-bold text-amber-700 mb-1.5">💡 아이디어 (Ideate)</div>
                            {(data.ideate || []).map((item: any, i: number) => (
                              <div key={i} className="text-[11px] text-amber-600 mb-1">{i + 1}. <span className="font-medium">{item.title}</span> — {item.desc}</div>
                            ))}
                          </div>
                          {/* 프로토타입 */}
                          {data.prototype && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                              <div className="text-[12px] font-bold text-emerald-700 mb-1">🔨 프로토타입 (Prototype)</div>
                              <div className="text-[12px] font-semibold text-emerald-800">{data.prototype.title}</div>
                              <div className="text-[11px] text-emerald-500 mt-0.5">{data.prototype.desc}</div>
                              {data.prototype.steps?.length > 0 && (
                                <div className="mt-2 flex gap-1">
                                  {data.prototype.steps.map((s: string, i: number) => (
                                    <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-100 text-[9px] text-emerald-600 font-medium">{i + 1}. {s}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          {data.summary && <div className="text-center px-4 py-3 rounded-xl bg-slate-100"><span className="text-[12px] text-slate-600">💡 {data.summary}</span></div>}
                        </div>
                      );
                    }

                    // ── Starbursting 렌더링 ──
                    if (fwId === 'starbursting') {
                      const cats = [
                        { key: 'who', label: 'Who · 누가', icon: '👤', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
                        { key: 'what', label: 'What · 무엇을', icon: '📦', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700' },
                        { key: 'when', label: 'When · 언제', icon: '🕐', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
                        { key: 'where', label: 'Where · 어디서', icon: '📍', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
                        { key: 'why', label: 'Why · 왜', icon: '❓', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
                        { key: 'how', label: 'How · 어떻게', icon: '⚙️', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700' },
                      ];
                      return (
                        <div key={msg.id} className="space-y-4 animate-in fade-in duration-500">
                          <div className="text-center mb-2"><span className="text-[20px]">⭐</span><h3 className="text-[15px] font-bold text-slate-800 mt-1">Starbursting (5W1H) 결과</h3></div>
                          <div className="grid grid-cols-2 gap-2">
                            {cats.map(c => (
                              <div key={c.key} className={cn('rounded-xl border p-3', c.bg, c.border)}>
                                <div className={cn('text-[11px] font-bold mb-1.5', c.text)}>{c.icon} {c.label}</div>
                                {(data[c.key] || []).map((qa: any, i: number) => (
                                  <div key={i} className="mb-1.5">
                                    <div className="text-[11px] font-semibold text-slate-700">Q: {qa.q}</div>
                                    <div className="text-[10px] text-slate-500 pl-2 border-l-2 border-slate-200 mt-0.5">A: {qa.a}</div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                          {data.summary && <div className="text-center px-4 py-3 rounded-xl bg-slate-100"><span className="text-[12px] text-slate-600">💡 {data.summary}</span></div>}
                        </div>
                      );
                    }

                    // ── Reversal 렌더링 ──
                    if (fwId === 'reversal') {
                      return (
                        <div key={msg.id} className="space-y-4 animate-in fade-in duration-500">
                          <div className="text-center mb-2"><span className="text-[20px]">🔄</span><h3 className="text-[15px] font-bold text-slate-800 mt-1">역발상 분석 결과</h3></div>
                          <div className="flex items-stretch gap-2">
                            <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div className="text-[10px] font-bold text-slate-400 mb-1">➡️ 원래 관점</div>
                              <div className="text-[12px] font-semibold text-slate-700">{data.original?.title}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">{data.original?.desc}</div>
                            </div>
                            <div className="flex items-center shrink-0"><span className="text-[18px]">🔄</span></div>
                            <div className="flex-1 rounded-xl border-2 border-violet-300 bg-violet-50 p-3">
                              <div className="text-[10px] font-bold text-violet-500 mb-1">⬅️ 뒤집은 관점</div>
                              <div className="text-[12px] font-semibold text-violet-700">{data.reversed?.title}</div>
                              <div className="text-[11px] text-violet-500 mt-0.5">{data.reversed?.desc}</div>
                            </div>
                          </div>
                          {data.insights?.length > 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                              <div className="text-[11px] font-bold text-amber-600 mb-1.5">💡 발견한 인사이트</div>
                              {data.insights.map((ins: any, i: number) => (
                                <div key={i} className="text-[11px] text-amber-700 mb-1">· <span className="font-medium">{ins.title}</span> — {ins.desc}</div>
                              ))}
                            </div>
                          )}
                          {data.actions?.length > 0 && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                              <div className="text-[11px] font-bold text-emerald-600 mb-1.5">🎯 적용 방안</div>
                              {data.actions.map((act: any, i: number) => (
                                <div key={i} className="text-[11px] text-emerald-700 mb-1">{i + 1}. <span className="font-medium">{act.title}</span> — {act.desc}</div>
                              ))}
                            </div>
                          )}
                          {data.summary && <div className="text-center px-4 py-3 rounded-xl bg-slate-100"><span className="text-[12px] text-slate-600">💡 {data.summary}</span></div>}
                        </div>
                      );
                    }

                    // fallback — 알 수 없는 프레임워크
                    const expert = allExperts.find(e => e.id === msg.expertId);
                    if (!expert) return null;
                    return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="default" />;
                  }

                  // 기존 포스트잇 그리드 (비큐레이션 프레임워크)
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

                  // 아이디어 발전시키기 핸들러
                  const handleDevelopIdea = (ideaContent: string) => {
                    const developQ = `다음 아이디어를 더 발전시켜주세요. 구체적인 실행 방안, 예상 효과, 보완점을 제시하세요:\n\n${ideaContent}`;
                    handleFollowUp(developQ);
                  };

                  // 프로그레스 인디케이터
                  const roundGroups = groups.filter(g => g.round);
                  const totalSteps = roundGroups.length;

                  return (
                    <div className="space-y-3">
                      {/* 프레임워크 단계 프로그레스 */}
                      {totalSteps > 1 && (
                        <div className="flex items-center gap-1.5 flex-wrap px-1">
                          {roundGroups.map((g, i) => {
                            const isDone = groups.indexOf(g) < groups.length - 1 || !isDiscussing;
                            const isCurrent = !isDone && i === totalSteps - 1;
                            return (
                              <div key={i} className={cn(
                                'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all',
                                isDone ? 'bg-violet-500 text-white' : isCurrent ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-300' : 'bg-slate-100 text-slate-400'
                              )}>
                                {g.round!.content}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {groups.map((g, gi) => {
                        if (g.round) {
                          const isCollapsed = collapsedRounds.has(g.round.id);
                          return (
                            <RoundSeparator key={g.round.id} msg={g.round} isCollapsed={isCollapsed} variant="brainstorm"
                              onToggle={() => setCollapsedRounds(prev => { const n = new Set(prev); if (n.has(g.round!.id)) n.delete(g.round!.id); else n.add(g.round!.id); return n; })}
                              count={groups[gi + 1]?.msgs?.length || 0} />
                          );
                        }
                        const prevRound = groups.slice(0, gi).reverse().find(g2 => g2.round);
                        if (prevRound?.round && collapsedRounds.has(prevRound.round.id)) return null;
                        return (
                          <div key={`grid-${gi}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {g.msgs.filter(m => m.expertId !== '__user__').map(msg => {
                              const expert = allExperts.find(e => e.id === msg.expertId);
                              if (!expert) return null;
                              return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="postit" onLike={handleLike} onDislike={handleDislike} onDevelop={isDone ? handleDevelopIdea : undefined} />;
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : discussionMode === 'standard' ? (
                /* 심층토론: 탭형 라운드 + 발언자별 컬러 */
                (() => {
                  const rounds: { label: string; id: string; msgs: typeof messages }[] = [];
                  let currentLabel = '';
                  let currentId = '';
                  let currentMsgs: typeof messages = [];
                  const summaryMsgs = messages.filter(m => m.isSummary);

                  for (const msg of messages) {
                    if (msg.expertId === '__round__') {
                      if (currentLabel) rounds.push({ label: currentLabel, id: currentId, msgs: currentMsgs });
                      currentLabel = msg.content;
                      currentId = msg.id;
                      currentMsgs = [];
                    } else if (!msg.isSummary && msg.expertId !== '__user__') {
                      currentMsgs.push(msg);
                    }
                  }
                  if (currentLabel) rounds.push({ label: currentLabel, id: currentId, msgs: currentMsgs });

                  const [stdActiveRound, setStdActiveRound] = [proconActiveRound, setProconActiveRound];
                  const activeRound = Math.min(stdActiveRound, rounds.length - 1);
                  const currentRound = rounds[activeRound >= 0 ? activeRound : 0];

                  if (isDiscussing && rounds.length > 0 && stdActiveRound !== rounds.length - 1) {
                    setTimeout(() => setStdActiveRound(rounds.length - 1), 0);
                  }

                  const expertColors = ['border-l-blue-500', 'border-l-emerald-500', 'border-l-violet-500', 'border-l-amber-500', 'border-l-rose-500'];

                  return (
                    <div className="space-y-3">
                      {/* 라운드 탭 */}
                      {/* 회색 칸 — 라운드 탭 + 발언 */}
                      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                        {/* 라운드 탭 */}
                        {rounds.length > 0 && (
                          <div className="flex items-center gap-1 bg-slate-50 border-b border-slate-200 px-3 py-2 overflow-x-auto scrollbar-none">
                            {rounds.map((r, ri) => {
                              const isActive = ri === (activeRound >= 0 ? activeRound : 0);
                              const roundNum = r.label.match(/(\d)/)?.[1] || '';
                              const isFinal = r.label.includes('최종');
                              return (
                                <button key={r.id} onClick={() => setStdActiveRound(ri)}
                                  className={cn('flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all shrink-0 text-[11px] font-semibold',
                                    isActive
                                      ? isFinal ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm' : 'bg-indigo-500 text-white shadow-sm'
                                      : r.msgs.length > 0 ? 'text-slate-500 hover:text-slate-700 hover:bg-white' : 'text-slate-300')}>
                                  <span className="text-[12px] font-black">{isFinal ? '⚖️' : `${roundNum}R`}</span>
                                  {r.label.replace(/\d라운드\s*·?\s*/, '')}
                                  {isDiscussing && ri === rounds.length - 1 && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {/* 발언 */}
                        <div className="p-4 bg-slate-50/50">
                          {currentRound && currentRound.msgs.length > 0 ? (
                            <div className="space-y-3">
                              {currentRound.msgs.map(msg => {
                                const expert = allExperts.find(e => e.id === msg.expertId);
                                if (!expert) return null;
                                return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="default"
                                  onLike={handleLike} onDislike={handleDislike} onRebuttal={isDone ? handleRebuttal : undefined} />;
                              })}
                            </div>
                          ) : isDiscussing ? (
                            <div className="py-6 text-center text-[11px] text-slate-300">발언 대기 중...</div>
                          ) : null}
                        </div>
                      </div>

                      {/* 종합 */}
                      {summaryMsgs.map(msg => {
                        const expert = allExperts.find(e => e.id === msg.expertId);
                        if (!expert) return null;
                        return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="default" />;
                      })}

                      {/* 후속 1:1 대화 — 토론 아래 메신저 스타일 */}
                      {(() => {
                        // 토론 라운드/종합 이후의 사용자+AI 메시지만 추출
                        const lastSummaryIdx = messages.reduce((acc, m, i) => m.isSummary ? i : acc, -1);
                        const followUpMsgs = lastSummaryIdx >= 0 ? messages.slice(lastSummaryIdx + 1) : [];
                        if (followUpMsgs.length === 0) return null;
                        return (
                          <div className="space-y-2.5 pt-3 border-t border-slate-200 mt-3">
                            {followUpMsgs.map(msg => {
                              if (msg.expertId === '__user__') {
                                return (
                                  <div key={msg.id} className="flex justify-end">
                                    <div className="max-w-[70%] bg-indigo-500 text-white rounded-2xl rounded-br-md px-4 py-3 text-[13px] shadow-sm">
                                      <ReactMarkdownInline content={msg.content} />
                                    </div>
                                  </div>
                                );
                              }
                              if (msg.expertId === '__round__') return null;
                              const expert = allExperts.find(e => e.id === msg.expertId);
                              if (!expert) return null;
                              return (
                                <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="messenger" />
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()
              ) : activeGame ? null : (
                /* All other modes: sequential */
                messages.map((msg, idx) => {
                  // 대화 요약 카드
                  if (msg.expertId === '__summary__') {
                    return (
                      <div key={msg.id} className="mx-auto max-w-[90%] my-3 animate-in fade-in slide-in-from-bottom-2 duration-400">
                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/80">
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">대화 요약</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => navigator.clipboard.writeText(msg.content)} className="px-2 py-0.5 rounded text-[10px] text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">복사</button>
                              <button onClick={() => setMessages(prev => prev.filter(m => m.id !== msg.id))} className="px-2 py-0.5 rounded text-[10px] text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">닫기</button>
                            </div>
                          </div>
                          <div className="px-4 py-3">
                            <div className="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                              <ReactMarkdownInline content={msg.content} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  // PPT 다운로드 버튼
                  if (msg.expertId === '__ppt_download__') {
                    let pptData: import('@/lib/pptGenerator').PptData | null = null;
                    try { pptData = JSON.parse(msg.content); } catch {}
                    if (!pptData) return null;
                    return (
                      <div key={msg.id} className="flex justify-center py-3">
                        <button
                          onClick={() => generatePpt(pptData!, `presentation-${Date.now()}.pptx`)}
                          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-[13px] shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                        >
                          <span className="text-[18px]">📊</span>
                          PPT 다운로드 ({pptData.slides?.length || 0}장)
                        </button>
                      </div>
                    );
                  }
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
                            ? 'max-w-[60%] bg-indigo-500 text-white rounded-2xl rounded-br-md px-4 py-3 text-[13px] shadow-sm'
                            : 'bg-white border border-slate-100 rounded-xl px-3.5 py-2.5 text-[12.5px] text-slate-600'
                        )}>
                          <ReactMarkdownInline content={msg.content} />
                          {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {msg.attachedFiles.map((f, i) => (
                                <span key={i} className={cn(
                                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]',
                                  isMessenger ? 'bg-indigo-400/30 text-indigo-100' : 'bg-slate-50 text-slate-500 border border-slate-200'
                                )}>
                                  {f.preview ? (
                                    <img src={f.preview} alt="" className="w-4 h-4 rounded object-cover" />
                                  ) : (
                                    <span className="text-[11px]">{f.mimeType.startsWith('image/') ? '\u{1F5BC}\uFE0F' : f.mimeType === 'application/pdf' ? '\u{1F4C4}' : f.mimeType.includes('wordprocessingml') ? '\u{1F4DD}' : f.mimeType.includes('spreadsheetml') ? '\u{1F4CA}' : '\u{1F4CE}'}</span>
                                  )}
                                  {f.name}
                                </span>
                              ))}
                            </div>
                          )}
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

          {/* Bottom Input — 게임 모드에서는 GamePlayer 내부에 입력 있으므로 숨김 */}
          {!activeGame && (messages.length > 0 || isDiscussing) && (
            <div className="shrink-0 relative">
              <div className="absolute inset-x-0 -top-8 h-8 bg-gradient-to-t from-[#f7f7f8] to-transparent pointer-events-none" />
              <div className="max-w-2xl mx-auto px-4 sm:px-6 py-2.5 pb-4 space-y-2">
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
                  </div>
                )}
                {/* 토론 모드 후속질문 — 전문가 선택 칩 */}
                {!isDiscussing && messages.length > 0 && ['standard', 'procon', 'brainstorm', 'hearing'].includes(discussionMode) && activeExperts.length >= 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap px-1">
                    <span className="text-[10px] text-slate-400">질문할 토론자 선택:</span>
                    {activeExperts.map(e => (
                      <button key={e.id} type="button" onClick={() => setFollowUpTarget(followUpTarget === e.id ? null : e.id)}
                        className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border',
                          followUpTarget === e.id ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50')}>
                        <ExpertAvatar expert={e} size="xs" />
                        {e.nameKo}
                      </button>
                    ))}
                  </div>
                )}
                <QuestionInput
                  onSubmit={isDone ? (q: string) => {
                    if (['standard', 'procon', 'brainstorm', 'hearing'].includes(discussionMode)) {
                      const target = followUpTarget || activeExperts[0]?.id;
                      if (target) askSingleAI(target, q);
                    } else {
                      handleFollowUp(q);
                    }
                  } : startDiscussion}
                  onSubmitWithFiles={(question, files) => {
                    pendingFilesRef.current = files;
                    if (isDone) {
                      handleFollowUp(question);
                    } else {
                      startDiscussion(question);
                    }
                  }}
                  disabled={isDiscussing || activeExperts.length < 1 || (discussionMode === 'multi' && messages.length === 0 && activeExperts.length < 2)}
                  discussionMode={discussionMode}
                  onToggleSettings={() => setShowDebateSettings((prev) => !prev)}
                  showSettings={showDebateSettings}
                  isFollowUp={isDone}
                  onConclusion={undefined}
                  onSummarize={handleSummarize}
                  isSummarizing={isSummarizing}
                  messageCount={messages.length}
                  externalValue={sampleQuestionValue}
                  onExternalValueConsumed={() => setSampleQuestionValue('')}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarProvider>);

};

function RoundSeparator({ msg, isCollapsed, onToggle, count, variant }: { msg: DiscussionMessage; isCollapsed: boolean; onToggle: () => void; count: number; variant?: string }) {
  if (variant === 'brainstorm') {
    return (
      <button type="button" onClick={onToggle} className="w-full py-1 cursor-pointer">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200/50 transition-all hover:shadow-sm">
          <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center text-white text-[12px] font-black shrink-0">💡</div>
          <div className="flex-1 text-left">
            <div className="text-[11px] font-bold text-violet-800">{msg.content}</div>
            {count > 0 && <div className="text-[9px] text-violet-400">아이디어 {count}개</div>}
          </div>
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-violet-400" /> : <ChevronDown className="w-3.5 h-3.5 text-violet-400" />}
        </div>
      </button>
    );
  }
  if (variant === 'procon') {
    const isProRound = msg.content.includes('찬성');
    const isConRound = msg.content.includes('반대');
    const isFinal = msg.content.includes('최종');
    // 라운드 번호 추출
    const roundMatch = msg.content.match(/(\d)/);
    const roundNum = roundMatch ? roundMatch[1] : '';
    return (
      <button type="button" onClick={onToggle} className="w-full py-2 cursor-pointer">
        <div className={cn('flex items-center gap-4 px-5 py-3 rounded-2xl transition-all shadow-sm',
          isFinal ? 'bg-gradient-to-r from-amber-500 to-orange-500'
            : isProRound ? 'bg-gradient-to-r from-blue-500 to-blue-600'
            : isConRound ? 'bg-gradient-to-r from-red-500 to-red-600'
            : 'bg-gradient-to-r from-slate-500 to-slate-600')}>
          {/* 라운드 번호 */}
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-[16px] font-black text-white">{isFinal ? '⚖️' : roundNum ? `${roundNum}R` : '💬'}</span>
          </div>
          <span className="text-[13px] font-bold text-white flex-1 text-left">{msg.content}</span>
          {count > 0 && <span className="text-[10px] text-white/60 font-medium">{count}명</span>}
          {isCollapsed ? <ChevronRight className="w-4 h-4 text-white/60" /> : <ChevronDown className="w-4 h-4 text-white/60" />}
        </div>
      </button>
    );
  }
  return (
    <button type="button" onClick={onToggle}
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