import { lazy, Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { DEFAULT_EXPERTS, SUMMARIZER_EXPERT, CONCLUSION_EXPERT, DiscussionMessage, DiscussionRound, DiscussionMode, Expert, ROUND_LABELS, getMainMode, DebateSettings, DEFAULT_DEBATE_SETTINGS, ThinkingFramework, DiscussionIssue, THINKING_FRAMEWORKS, SIMULATION_SCENARIOS, SimulationScenario, StakeholderSettings, DEFAULT_STAKEHOLDER_SETTINGS } from '@/types/expert';
import { applyExpertOverrides } from '@/data/expertOverrides';
import { ExpertAvatar } from '@/components/ExpertAvatar';
import { DiscussionMessageCard } from '@/components/DiscussionMessage';
import { LazyMarkdown } from '@/components/LazyMarkdown';
import { DiscussionRecord, saveDiscussionToHistory, upsertDiscussionHistory } from '@/lib/discussionHistoryStore';
import { buildExpertWithPrompt, getExpertPrompt } from '@/lib/expertPromptLoader';
import type { AttachedFile } from '@/lib/fileProcessor';
import { Copy, Check, Square, RefreshCw, ChevronDown, ChevronRight, ArrowDown, ArrowRight, FileText } from 'lucide-react';
import type { ChatVariant } from '@/components/DiscussionMessage';
import { Button } from '@/components/ui/button';
import { SidebarProvider } from '@/components/ui/sidebar';

const CHAT_URL = '/api/chat';
const LazyAppSidebar = lazy(() => import('@/components/AppSidebar').then((module) => ({ default: module.AppSidebar })));
const LazyExpertSelectionPanel = lazy(() => import('@/components/ExpertSelectionPanel').then((module) => ({ default: module.ExpertSelectionPanel })));
const LazyGamePlayer = lazy(() => import('@/components/GamePlayer').then((module) => ({ default: module.GamePlayer })));
const LazyQuestionInput = lazy(() => import('@/components/QuestionInput').then((module) => ({ default: module.QuestionInput })));
const LazyPomodoroTimer = lazy(() => import('@/components/PomodoroTimer').then((module) => ({ default: module.PomodoroTimer })));
let pptGeneratorPromise: Promise<typeof import('@/lib/pptGenerator')> | null = null;

async function loadPptGenerator() {
  if (!pptGeneratorPromise) {
    pptGeneratorPromise = import('@/lib/pptGenerator');
  }

  return pptGeneratorPromise;
}

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
  const basePrompt = await getExpertPrompt(expert);
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt: SAFETY_GUARDRAIL + basePrompt, question, previousResponses, files: files && files.length > 0 ? files : undefined }),
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
      const saved = localStorage.getItem('ai-debate-experts-v64');
      if (saved) {
        const parsed = JSON.parse(saved) as Expert[];
        // Merge: keep saved customizations but add any new default experts
        const savedIds = new Set(parsed.map((e) => e.id));
        const newExperts = DEFAULT_EXPERTS.filter((e) => !savedIds.has(e.id));
        return applyExpertOverrides([...parsed.map((e) => {
          const def = DEFAULT_EXPERTS.find(d => d.id === e.id);
          return { ...e, category: e.category || 'ai', icon: e.icon || def?.icon || '', avatarUrl: def?.avatarUrl || e.avatarUrl, quote: def?.quote || e.quote, description: def?.description || e.description, sampleQuestions: def?.sampleQuestions || e.sampleQuestions };
        }), ...newExperts]);
      }
      return applyExpertOverrides(DEFAULT_EXPERTS);
    } catch {return applyExpertOverrides(DEFAULT_EXPERTS);}
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
  const [proconDebateTopic, setProconDebateTopic] = useState('');
  const [debateSettings, setDebateSettings] = useState<DebateSettings>(DEFAULT_DEBATE_SETTINGS);
  const [showDebateSettings, setShowDebateSettings] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<ThinkingFramework | null>(null);
  const [discussionIssues, setDiscussionIssues] = useState<DiscussionIssue[]>([]);
  const [debateIntensity, setDebateIntensity] = useState('moderate');
  const [stakeholderSettings, setStakeholderSettings] = useState<StakeholderSettings>(DEFAULT_STAKEHOLDER_SETTINGS);
  const [simChoices, setSimChoices] = useState<{label: string; description: string}[]>([]);
  const [simPhaseIndex, setSimPhaseIndex] = useState(0);
  // AI vs User debate state
  const [aivsRound, setAivsRound] = useState(0); // current round (1-based when active)
  const [aivsJudgments, setAivsJudgments] = useState<any[]>([]); // judgment history
  const [aivsUserStance, setAivsUserStance] = useState<'pro' | 'con'>('pro');
  const [aivsTopic, setAivsTopic] = useState('');
  const [, setStopRequested] = useState(false);
  const [collapsedRounds, setCollapsedRounds] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingFilesRef = useRef<AttachedFile[]>([]);
  const pendingSimQuestionRef = useRef<string>('');

  useEffect(() => {
    localStorage.setItem('ai-debate-experts-v64', JSON.stringify(applyExpertOverrides(experts)));
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
      // 심층/자유 토론: max 3
      if ((discussionMode === 'standard' || discussionMode === 'freetalk') && prev.length >= 3) return prev;
      // Debate mode (brainstorm/hearing/procon): max 4
      if (getMainMode(discussionMode) === 'debate' && discussionMode !== 'standard' && discussionMode !== 'freetalk' && discussionMode !== 'procon' && prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const handleModeChange = (mode: DiscussionMode) => {
    const prevMain = getMainMode(discussionMode);
    const nextMain = getMainMode(mode);
    setDiscussionMode(mode);
    // 토론 서브모드 전환 시에도 선택 리셋
    const isDebateSwitch = prevMain === 'debate' && nextMain === 'debate' && discussionMode !== mode;
    setSelectedExpertIds(isDebateSwitch ? [] : nextMain === prevMain ? selectedExpertIds : nextMain === 'general' ? ['gpt'] : nextMain === 'multi' ? ['gpt'] : []);
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
        expert: await buildExpertWithPrompt(expert, '\n\n사용자가 당신의 의견에 반박했습니다. 사용자의 반박에 대해 정중하지만 논리적으로 응답해주세요. 동의할 부분은 인정하고, 반대할 부분은 근거를 들어 설명해주세요. 2문단 이내로 답변해주세요.'),
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
    setSimChoices([]);
  };

  // 브라우저 닫기/새로고침 시 자동 저장
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (messages.length > 0 && (sessionTitleRef.current || currentQuestion)) {
        upsertDiscussionHistory(sessionIdRef.current, {
          question: sessionTitleRef.current || currentQuestion,
          mode: discussionMode,
          messages: messages.map(m => ({ ...m, isStreaming: false })),
          expertIds: selectedExpertIds,
          proconStances,
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [messages, currentQuestion, discussionMode, selectedExpertIds]);

  // 현재 대화 자동 저장 (나가기 전)
  const autoSaveCurrentChat = useCallback(() => {
    if (messages.length > 0 && (sessionTitleRef.current || currentQuestion)) {
      upsertDiscussionHistory(sessionIdRef.current, {
        question: sessionTitleRef.current || currentQuestion,
        mode: discussionMode,
        messages: messages.map(m => ({ ...m, isStreaming: false })),
        expertIds: selectedExpertIds,
        proconStances,
      });
    }
  }, [messages, currentQuestion, discussionMode, selectedExpertIds]);

  const handleNewDiscussion = () => {
    autoSaveCurrentChat();
    // 진행 중이면 중단
    if (isDiscussing) { abortControllerRef.current?.abort(); }
    setMessages([]);
    setCurrentQuestion('');
    setProconDebateTopic('');
    setSelectedExpertIds([]);
    setProconStances({});
    setSimChoices([]);
    setSimPhaseIndex(0);
    setAivsRound(0);
    setAivsJudgments([]);
    setIsDiscussing(false);
    setActiveExpertId(undefined);
    skipClarifyRef.current = false;
    clarifyAttemptsRef.current = 0;
    sessionIdRef.current = `hist-${Date.now()}`;
    sessionTitleRef.current = '';
    summaryCountRef.current = 0;
    userScrolledUpRef.current = false;
    setChatClarify(null);
    setBsClarify(null);
  };


  // Topic clarification state
  const [clarifyState, setClarifyState] = useState<{
    show: boolean;
    loading: boolean;
    originalInput: string;
    suggestions: { topic: string; description: string }[];
    customEdit: string;
  }>({ show: false, loading: false, originalInput: '', suggestions: [], customEdit: '' });

  // ── Simulation prompt builders ──
  function buildInvestmentPrompt(role: { name: string; icon: string; focus: string }, round: number, prepContext: string, topic: string, intensity: number) {
    const intensityDesc = intensity <= 3 ? '건설적이고 우호적' : intensity <= 6 ? '균형 잡힌 시각' : '날카롭고 도전적';
    if (round === 1) {
      return `당신은 투자 심사에서 "${role.name}" 역할입니다. ${role.icon}
관심사: ${role.focus}
사업 배경: ${prepContext}
주제: ${topic}
반응 강도: ${intensityDesc}

유저(창업자)의 사업 소개를 듣고 ${role.focus} 관점에서 핵심 질문 1~2개를 던지세요.
질문은 유저가 구체적으로 답변할 수 있어야 합니다. 3문장 이내.
[SCORE:+0] (첫 라운드는 점수 변동 없음)
한국어. 역할명 태그 출력 금지.`;
    } else if (round <= 3) {
      return `당신은 "${role.name}"입니다. ${role.icon}
관심사: ${role.focus}
사업 배경: ${prepContext}
반응 강도: ${intensityDesc}

유저(창업자)의 이전 답변을 평가하고 후속 질문을 하세요.
좋은 답변이면 인정하되 더 깊이 파세요. 약한 답변이면 지적하세요.
3문장 이내. [SCORE:+N 또는 -N] 태그 필수. 한국어.`;
    } else {
      return `최종 평가. "${role.name}"으로서 투자 여부를 결정하세요. ${role.icon}
관심사: ${role.focus}
사업 배경: ${prepContext}

[VERDICT:투자/조건부/보류/거절] [SCORE:최종점수]
2문장으로 이유 설명. 한국어.`;
    }
  }

  function buildInterviewPrompt(role: { name: string; icon: string; focus: string }, round: number, prepContext: string, topic: string, intensity: number) {
    const intensityDesc = intensity <= 3 ? '편안한 분위기' : intensity <= 6 ? '보통' : '압박 면접';
    if (round === 1) {
      return `당신은 채용 면접에서 "${role.name}" 역할입니다. ${role.icon}
관심사: ${role.focus}
지원 정보: ${prepContext}
분위기: ${intensityDesc}

지원자(유저)의 자기소개를 듣고, ${role.focus} 관점에서 질문 1개를 하세요.
면접 질문답게 구체적이고 경험 기반으로 답할 수 있는 질문이어야 합니다.
2~3문장. 한국어. 역할명 태그 출력 금지.`;
    } else if (round === 2) {
      return `당신은 "${role.name}"입니다. ${role.icon}
관심사: ${role.focus}
지원 정보: ${prepContext}
분위기: ${intensityDesc}

유저의 답변을 듣고 같은 주제에서 더 깊이 파는 후속 질문 1개.
"구체적으로 어떤 상황이었나요?", "그 결과는?" 식으로. 2문장 이내. 한국어.`;
    } else {
      return `최종 면접 평가. "${role.name}"으로서 합격 여부를 판단. ${role.icon}
관심사: ${role.focus}
지원 정보: ${prepContext}

[VERDICT:합격/보류/불합격] [SCORE:최종점수]
강점과 약점 각 1개씩. 3문장 이내. 한국어.`;
    }
  }

  function buildCSPrompt(role: { name: string; icon: string; focus: string }, round: number, prepContext: string, topic: string, intensity: number) {
    if (role.name.includes('불만') || role.name.includes('고객')) {
      if (round === 1) {
        return `당신은 ${prepContext}으로 화가 난 고객입니다. ${role.icon}
감정 수위: ${intensity}/10
첫 반응으로 불만을 강하게 표현하세요. 구체적 상황 언급.
3문장. 감정적으로. [EMOTION:${intensity}] 태그. 한국어.`;
      } else {
        return `당신은 화가 난 고객입니다. ${role.icon}
상황: ${prepContext}

CS 담당자(유저)의 대응을 평가하세요.
공감이 있었으면 누그러지고, 변명이면 더 화내세요.
감정 수위를 조절해서 [EMOTION:N] 태그. 2~3문장. 한국어.`;
      }
    } else if (role.name.includes('QA') || role.name.includes('내부')) {
      return `당신은 내부 지원팀입니다. ${role.icon}
상황: ${prepContext}

CS 담당자(유저)에게만 보이는 정보를 제공하세요.
상황 원인 + 대응 가능한 옵션을 제시하세요. 2~3문장. 한국어.`;
    } else {
      return `당신은 "${role.name}"입니다. ${role.icon}
관심사: ${role.focus}
상황: ${prepContext}

상황에 대한 의견을 제시하세요. 2~3문장. 한국어.`;
    }
  }

  function buildGenericSimPrompt(role: { name: string; icon: string; focus: string }, round: number, prepContext: string, topic: string, intensity: number) {
    return `당신은 "${role.name}" 역할입니다. ${role.icon}
${role.focus} 관점에서 반응하세요.
주제: ${topic}. 배경: ${prepContext}. 2~3문장. 한국어.
[SCORE:+/-N] 태그 필수.`;
  }

  // 실제 토론 시작 함수 (먼저 선언)
  const runDiscussion = useCallback(async (question: string, overrideExpertIds?: string[], overrideMode?: DiscussionMode, displayQuestion?: string) => {
    const useMode = overrideMode || discussionMode;
    // 플레이어 모드는 GPT 자동 선택
    const useIds = useMode === 'player'
      ? ['gpt']
      : (overrideExpertIds || selectedExpertIds);
    const discussionExperts = experts.filter((e) => useIds.includes(e.id));
    if (discussionExperts.length < 1 && useMode !== 'stakeholder' && useMode !== 'aivsuser') return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStopRequested(false);
    setIsDiscussing(true);
    if (useMode !== 'stakeholder') {
      setCurrentQuestion(question);
      if (!sessionTitleRef.current) sessionTitleRef.current = displayQuestion || question;
    }
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

    // ═══ AI vs User Debate Mode — 자유 티키타카 ═══
    if (useMode === 'aivsuser') {
      const difficulty = debateSettings.aivsUserDifficulty || 'normal';
      let stance = debateSettings.aivsUserStance || 'pro';
      if (stance === 'random') stance = Math.random() > 0.5 ? 'pro' : 'con';
      const userStance = stance as 'pro' | 'con';
      const stanceKo = userStance === 'pro' ? '찬성' : '반대';
      const aiStanceKo = userStance === 'pro' ? '반대' : '찬성';

      // 선택한 AI 사용 (없으면 gemini 기본)
      const aiOpponents = discussionExperts.length > 0 ? discussionExperts.slice(0, 3) : [experts.find(e => e.id === 'gemini') || experts.find(e => e.category === 'ai') || experts[0]].filter(Boolean);

      setAivsRound(0);
      setAivsJudgments([]);
      setAivsUserStance(userStance);
      setAivsTopic(question);

      const aiNames = aiOpponents.map(e => e.nameKo).join(', ');
      setMessages([
        { id: `avsu-start-${Date.now()}`, expertId: '__round__', content: `⚔️ **${question}**\n\n유저(${stanceKo}) vs ${aiNames}(${aiStanceKo}) · ${difficulty === 'easy' ? '🌱 초급' : difficulty === 'hard' ? '🔥 고급' : '⚡ 보통'}` },
      ]);

      setIsDiscussing(true);
      setActiveExpertId(undefined);
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
            question, expert: await buildExpertWithPrompt(expert, expertExtra),
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
            expert: await buildExpertWithPrompt(expert, '\n\n빠른 토론 모드입니다. 핵심만 1문단(3-4문장)으로 간결하게 답변해주세요.'),
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
            await streamExpert({ question, expert: await buildExpertWithPrompt(expert, issueContext + lengthExtra), previousResponses: allResponses, round,
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
            if (stanceResult.debateTopic) setProconDebateTopic(stanceResult.debateTopic);
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
            await streamExpert({ question, expert: await buildExpertWithPrompt(expert, extra), previousResponses: allResponses, round,
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
      // 브레인스토밍 사전 인터뷰 — 주제 구체화
      if (!skipClarifyRef.current && clarifyAttemptsRef.current < MAX_CLARIFY_ATTEMPTS) {
        clarifyAttemptsRef.current++;
        try {
          const clarifyResp = await fetch('/api/clarify-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: question, expertName: '브레인스토밍 진행자', expertDescription: '브레인스토밍 세션 준비', attempt: clarifyAttemptsRef.current, mode: 'brainstorm' }),
          });
          const clarifyData = await clarifyResp.json();
          if (clarifyData.type === 'clarifying_questions' && clarifyData.questions?.length > 0) {
            setBsClarify({
              show: true,
              message: clarifyData.message || '효과적인 세션을 위해 주제를 구체화할게요',
              questions: clarifyData.questions,
              selections: {},
              originalQuestion: question,
            });
            setIsDiscussing(false);
            setStopRequested(false);
            return;
          }
        } catch { /* 실패 시 바로 진행 */ }
      }
      skipClarifyRef.current = true;
      setChatClarify(null);

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
            const extra = `\n\n=== 브레인스토밍 프레임워크: ${fw.nameKo} ===` +
              `\n방법론: ${fw.detailDescription}` +
              `\n현재 단계 (${ri + 1}/${fwRounds.length}): ${fwRound.label}` +
              `\n지시사항: ${fwRound.instruction}` +
              `\n아이디어를 최소 ${debateSettings.ideaCount}개 제시하세요. 간결하게.` +
              (debateSettings.deduplication ? '\n다른 참여자와 중복 피하세요.' : '') +
              `\n${bsCreativityMap[debateSettings.creativityLevel] || ''}` +
              `\n=== 끝 ===`;

            let fullContent = '';
            try {
              await streamExpert({ question, expert: await buildExpertWithPrompt(expert, extra + lengthExtra),
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
            const extra = `\n\n=== 브레인스토밍 프레임워크: ${fw.nameKo} ===` +
              `\n방법론: ${fw.detailDescription}` +
              `\n현재 단계 (${ri + 1}/${fwRounds.length}): ${fwRound.label}` +
              `\n지시사항: ${fwRound.instruction}` + bsSettingsExtra;
            const msgId = `${expert.id}-brainstorm-${ri}-${Date.now()}`;
            setMessages((prev) => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, round }]);
            let fullContent = '';
            try {
              await streamExpert({ question, expert: await buildExpertWithPrompt(expert, extra + lengthExtra), previousResponses: allResponses, round,
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
              expert: await buildExpertWithPrompt(expert, '\n\n' + instruction + lengthExtra),
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
    } else if (useMode === 'freetalk') {
      // Freetalk: AI group chat - short flowing messages
      const maxMessages = debateSettings.freetalkMessageCount || 25;
      let msgCount = 0;

      // System message
      setMessages(prev => [...prev, {
        id: `system-freetalk-${Date.now()}`,
        expertId: '__round__',
        content: `💬 자유 토론 시작 · ${discussionExperts.length}명 참여 · 총 ${maxMessages}개 메시지`,
      }]);

      // 각 봇별 자유토론 프롬프트 생성 (기존 systemPrompt 위에 얹기)
      const buildFreetalkPrompt = async (expert: Expert) => {
        const basePrompt = await getExpertPrompt(expert);
        return `${basePrompt}

## 자유 토론 모드
"${question}" 주제로 다른 전문가들과 대화 중입니다.

### 핵심 원칙: 주제에 집중하라
- 반드시 "${question}"에 대한 직접적인 의견, 예측, 분석을 말하세요
- 당신의 전문 분야(${expert.description})의 지식을 활용해 이 주제에 대한 구체적 인사이트를 제공하세요
- "제 분야에서도 비슷한데요~" 식의 자기 분야 얘기로 빠지지 마세요. 주제 자체를 논하세요.
- 구체적 수치, 사례, 데이터를 포함하세요 (예: "배럴당 80달러 선", "2024년 OPEC 감산", "미국 셰일 생산량 증가")

### 말투
- 1~3문장. 4문장 이상 절대 금지.
- 구어체 ("~인 것 같아요", "~거든요")
- 이모지 가끔 1개 정도

### 대화 흐름
- 직전 발언의 내용에 바로 반응하세요. 상대방 이름/호칭을 부르지 마세요.
- 동의만 하지 말고 반론/보완/새 각도를 제시하세요
- 이미 나온 내용을 반복하면 안 됩니다. 새로운 팩트나 관점만 추가하세요.
- 때로는 반박하세요. "그건 좀 다르게 볼 수도 있는데요"
- 상대 의견에 질문을 던지세요. "근데 그러면 ~은 어떻게 되나요?"

### 절대 금지
- "~님 말씀처럼", "~님", "~전문가님" 등 상대방 호칭 사용 금지. 바로 내용으로 시작하세요.
- [역할명] 태그 포함 금지
- "현실적인 제약 안에서 최적의 결과" 같은 추상적 동의 금지
- 이전 발언 앵무새 반복 금지
- 자기 분야 자랑으로 주제 이탈 금지
- "~에 대해 분석하겠습니다" 발표체 금지`;
      };

      while (msgCount < maxMessages && !shouldStop()) {
        for (const expert of discussionExperts) {
          if (shouldStop() || msgCount >= maxMessages) break;

          const msgId = `${expert.id}-freetalk-${Date.now()}-${msgCount}`;
          setMessages(prev => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true }]);
          setActiveExpertId(expert.id);

          let fullContent = '';
          const prevAll = allResponses.slice(-20);

          // 첫 턴: 주제 소개, 후속 턴: 직전 발언에 반응
          const questionForAI = msgCount === 0
            ? `주제: "${question}" — 이 주제에 대한 당신만의 구체적인 의견이나 예측을 말해주세요. 수치나 근거를 포함하세요.`
            : `"${question}" 주제에서 직전 발언에 반응하세요. 동의만 하지 말고 반론/보완/새 팩트를 추가하세요. 주제에서 벗어나지 마세요.`;

          try {
            await streamExpert({
              question: questionForAI,
              expert: { ...expert, systemPrompt: await buildFreetalkPrompt(expert) },
              previousResponses: prevAll,
              round: 'initial',
              onDelta: chunk => {
                fullContent += chunk;
                setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m));
              },
              onDone: () => {
                setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m));
              },
              signal: controller.signal,
            });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = '...';
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent, isStreaming: false } : m));
          }

          // 컨텍스트에 전문 분야도 포함
          allResponses.push({ name: `${expert.nameKo} (${expert.description})`, content: fullContent });
          msgCount++;

          // Short delay between messages (typing feel)
          await new Promise(r => setTimeout(r, 300 + Math.random() * 700));
        }
      }

      // Auto summary at the end
      if (!shouldStop() && allResponses.length > 0) {
        setActiveExpertId(SUMMARIZER_EXPERT.id);
        const summaryId = `summary-freetalk-${Date.now()}`;
        setMessages(prev => [...prev, { id: summaryId, expertId: SUMMARIZER_EXPERT.id, content: '', isStreaming: true, isSummary: true }]);
        let summaryContent = '';
        try {
          await streamExpert({
            question,
            expert: { ...SUMMARIZER_EXPERT, systemPrompt: `You are a conversation summarizer. Summarize the free-flowing AI group chat about the given topic in Korean. Use this format:

## 💬 자유 토론 정리

### 💡 핵심 결론
(대화에서 도출된 핵심 결론 2-3문장)

### 📌 주요 논점
1. **(논점)** — 설명
2. **(논점)** — 설명
3. **(논점)** — 설명

### 🎯 흥미로운 의견
- (눈에 띄는 의견 1)
- (눈에 띄는 의견 2)

> 💡 **한줄 요약:** (전체 대화를 한 문장으로)

한국어로 작성하세요. 간결하게.` },
            previousResponses: allResponses,
            round: 'summary',
            onDelta: chunk => { summaryContent += chunk; setMessages(prev => prev.map(m => m.id === summaryId ? { ...m, content: summaryContent } : m)); },
            onDone: () => { setMessages(prev => prev.map(m => m.id === summaryId ? { ...m, isStreaming: false } : m)); },
            signal: controller.signal,
          });
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            summaryContent = `⚠️ ${err instanceof Error ? err.message : '요약 생성 실패'}`;
            setMessages(prev => prev.map(m => m.id === summaryId ? { ...m, content: summaryContent, isStreaming: false } : m));
          }
        }
      }

    } else if (useMode === 'stakeholder') {
      const shSettings = stakeholderSettings;
      const scenario = SIMULATION_SCENARIOS.find(s => s.id === shSettings.scenarioId);
      if (!scenario) { setActiveExpertId(undefined); setIsDiscussing(false); return; }

      // Fix currentQuestion for history
      setCurrentQuestion(`${scenario.icon} ${scenario.name}`);
      sessionTitleRef.current = `${scenario.icon} ${scenario.name}`;
      setSimPhaseIndex(0);

      // 모든 역할을 Gemini에 자동 배정
      const gemini = experts.find(e => e.id === 'gemini') || experts.find(e => e.category === 'ai') || experts[0];
      const finalAssignments: Record<string, string> = {};
      for (const role of scenario.roles) {
        finalAssignments[role.name] = gemini.id;
      }
      setStakeholderSettings(prev => ({ ...prev, roleAssignments: finalAssignments }));

      // Introduction briefing card
      setMessages([{
        id: `sim-intro-${Date.now()}`,
        expertId: '__sim_briefing__',
        content: JSON.stringify({
          scenarioId: scenario.id, scenarioName: scenario.name, scenarioIcon: scenario.icon,
          userRole: scenario.userRole, roles: scenario.roles,
          gaugeLabel: scenario.gaugeLabel, verdictOptions: scenario.verdictOptions,
          assignments: finalAssignments,
        }),
      }]);

      // First AI asks the opening question naturally
      const firstRole = scenario.roles[0];
      const firstExpert = experts.find(e => e.id === finalAssignments[firstRole.name]);

      if (firstExpert) {

        const introMsgId = `${firstExpert.id}-intro-${Date.now()}`;
        setMessages(prev => [...prev, { id: introMsgId, expertId: firstExpert.id, content: '', isStreaming: true, simRoleName: firstRole.name, simRoleIcon: firstRole.icon }]);
        setActiveExpertId(firstExpert.id);

        const intensityDesc = shSettings.intensity <= 3 ? '건설적이고 우호적으로' : shSettings.intensity <= 6 ? '균형 잡힌 톤으로' : '날카롭고 도전적으로';
        const fixedOpenings: Record<string, string> = {
          investment: '반갑습니다. 저는 투자를 검토하는 VC 파트너입니다. 바로 본론으로 들어가죠. 어떤 문제를 해결하는 사업인지, 왜 지금이 적기인지부터 시작해주시겠어요?',
          interview: '안녕하세요, 오늘 면접은 직무 역량, 조직 적합성, 실무 경험 순으로 진행됩니다. 먼저 어느 회사의 어떤 포지션에 지원하셨고, 왜 이 역할에 관심을 갖게 되었는지 말씀해주세요.',
          product: '안녕하세요, 오늘 신제품 프레젠테이션을 듣게 된 타겟 고객입니다. 솔직히 기존에 쓰는 것도 있어서, 왜 바꿔야 하는지 확 와닿아야 관심이 갈 것 같아요. 어떤 제품인지 보여주시겠어요?',
          policy: '안녕하세요, 오늘 정책 검토 공청회를 시작하겠습니다. 이 자리에는 시민, 산업계, 법률 전문가가 참석해 있습니다. 정책 입안자께서 먼저 이 정책의 배경, 목적, 그리고 국민 생활에 어떤 변화가 생기는지 설명해주시기 바랍니다.',
          strategy: '자, 오늘 전략 회의를 시작하죠. 마케팅, 개발, 운영 담당이 모두 모였으니 각자 관점에서 솔직하게 의견 주세요. 먼저 회의 주제와 현재 상황, 달성하려는 목표를 공유해주시겠습니까?',
          internal: '네, 제안 발표 시작하시죠. 경영진 세 명이 듣고 있습니다. 시간은 한정되어 있으니 현재 어떤 문제가 있고, 이 제안이 왜 필요한지 핵심부터 말씀해주세요.',
          admission: '안녕하세요, 오늘 면접을 진행할 학과 교수입니다. 먼저 어느 대학교 어떤 학과에 지원했는지, 그리고 이 학과를 선택하게 된 계기가 있다면 말씀해주세요.',
          medical: '안녕하세요, 접수를 담당하는 간호사입니다. 오늘 어떤 증상으로 오셨는지 편하게 말씀해주세요.',
          legal_sim: '안녕하세요, 수석 변호사입니다. 어떤 법적 문제로 상담을 원하시는지 상황을 설명해주세요.',
          finance_sim: '안녕하세요, 재무설계사입니다. 현재 재무 상황이나 고민을 편하게 말씀해주세요.',
          realestate_sim: '안녕하세요, 부동산 컨설턴트입니다. 어떤 부동산 관련 상담이 필요하신가요?',
          startup_sim: '안녕하세요, 스타트업 멘토입니다. 어떤 사업 아이디어를 가지고 계신지 들려주세요.',
          psychology_sim: '안녕하세요, 편하게 이야기해주세요. 요즘 마음이 힘든 부분이 있으신가요?',
        };

        const fixedText = fixedOpenings[scenario.id];
        if (fixedText) {
          setMessages(prev => prev.map(m => m.id === introMsgId ? { ...m, content: fixedText, isStreaming: false } : m));
        } else {
          // fallback: AI 생성
          const openingPrompt = `당신은 "${scenario.name}" 시뮬레이션에서 "${firstRole.name}" 역할입니다.
핵심 관심사: ${firstRole.focus}
시뮬레이션이 시작됩니다. ${scenario.userRole}(유저)에게 자기소개를 간단히 하고, 상황에 대해 설명해달라고 요청하세요.
${intensityDesc} 말하세요. 2~3문장. 한국어. 대화체.`;
          let fullContent = '';
          try {
            await streamExpert({
              question: '시뮬레이션을 시작합니다.',
              expert: { ...firstExpert, systemPrompt: openingPrompt },
              previousResponses: [],
              round: 'initial' as any,
              onDelta: chunk => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === introMsgId ? { ...m, content: fullContent } : m)); },
              onDone: () => { setMessages(prev => prev.map(m => m.id === introMsgId ? { ...m, isStreaming: false } : m)); },
              signal: controller.signal,
            });
          } catch { /* ignore */ }
        }
      }

      setIsDiscussing(false);
      setActiveExpertId(undefined);
      return;
    } else if (useMode === 'assistant') {
      // Assistant mode
      const expert = discussionExperts[0];
      if (expert) {
        // PPT 어시스턴트인 경우 프롬프트 오버라이드
        const isPpt = expert.id === 'ppt' || expert.name?.toLowerCase().includes('ppt');
        const pptTools = isPpt ? await loadPptGenerator() : null;
        const effectiveExpert = isPpt ? { ...expert, systemPrompt: pptTools?.PPT_SYSTEM_PROMPT } : expert;

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
              if (pptTools) {
                const pptData = pptTools.parsePptJson(fullContent);
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
  }, [experts, selectedExpertIds, discussionMode, debateSettings, stakeholderSettings]);

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
    const debateModes = ['standard', 'procon', 'brainstorm', 'hearing', 'freetalk', 'aivsuser'];
    if (debateModes.includes(useMode) && useMode !== 'brainstorm' && useMode !== 'freetalk' && useMode !== 'aivsuser') {
      clarifyTopic(question, useMode);
      return;
    }
    runDiscussion(question, overrideExpertIds, overrideMode);
  }, [discussionMode, clarifyState.show, clarifyTopic, runDiscussion]);

  // Save to history when discussion completes — upsert로 중복 방지
  useEffect(() => {
    if (!isDiscussing && messages.length > 0 && currentQuestion) {
      upsertDiscussionHistory(sessionIdRef.current, {
        question: sessionTitleRef.current || currentQuestion, mode: discussionMode,
        messages: messages.map((m) => ({ ...m, isStreaming: false })),
        expertIds: selectedExpertIds,
        proconStances
      });
    }
  }, [isDiscussing]);

  const loadHistory = useCallback((record: DiscussionRecord) => {
    autoSaveCurrentChat();
    if (isDiscussing) { abortControllerRef.current?.abort(); }
    setCurrentQuestion(record.question);
    setMessages(record.messages);
    setDiscussionMode(record.mode);
    setSelectedExpertIds(record.expertIds || []);
    setProconStances(record.proconStances || {});
    setIsDiscussing(false);
    setActiveExpertId(undefined);
    sessionIdRef.current = record.id;
    sessionTitleRef.current = record.question;
    summaryCountRef.current = 0;
    skipClarifyRef.current = true;
  }, [autoSaveCurrentChat, isDiscussing]);

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
  const summaryCountRef = useRef(0);
  const handleSummarize = useCallback(async () => {
    const aiMsgCount = messages.filter(m => m.expertId !== '__user__' && m.expertId !== '__summary__' && m.expertId !== '__round__' && m.content).length;
    if (isSummarizing || aiMsgCount < 3 || summaryCountRef.current >= 2) return;
    summaryCountRef.current++;
    setIsSummarizing(true);

    const conversationText = messages
      .filter(m => m.content && m.expertId !== '__system__' && m.expertId !== '__summary__' && m.expertId !== '__round__' && m.expertId !== '__brainstorm_progress__')
      .slice(-20)
      .map(m => {
        const expert = allExperts.find(e => e.id === m.expertId);
        const role = m.expertId === '__user__' ? '질문' : (expert?.nameKo || 'AI');
        return `[${role}] ${m.content.slice(0, 500)}`;
      })
      .join('\n\n');

    const summaryPrompt = `아래 대화를 요약하세요.

규칙:
1. 개괄식으로 작성 — "키워드: 핵심 내용" 형태
2. 문장형 서술 금지. 쭉 이어지는 문장 금지.
3. 한 줄에 하나의 불릿만
4. 각 섹션 제목 앞뒤로 빈 줄 필수
5. 불릿은 "- " 로 시작

아래 형식을 정확히 따르세요:

## 📌 주제

- (대화 주제)

## 💡 핵심 결론

- 결론 키워드: 핵심 내용
- 결론 키워드: 핵심 내용
- (3~5개)

## 📊 주요 수치

- 항목: 수치 (없으면 이 섹션 생략)

## ❓ 남은 논점

- 논점 키워드: 간단 설명

대화 내용:
${conversationText}`;

    try {
      const chatResp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: '대화 요약 전문가. 개괄식으로 작성 (문장형 금지, "키워드: 핵심 내용" 형태). 마크다운 구조화. 한국어.',
          question: summaryPrompt,
        }),
      });

      const reader = chatResp.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let textBuffer = '';

      if (reader) {
        while (true) {
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
            if (jsonStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(jsonStr);
              // Gemini SSE format
              const geminiText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              // OpenAI SSE format
              const openaiText = parsed.choices?.[0]?.delta?.content;
              if (geminiText) fullText += geminiText;
              else if (openaiText) fullText += openaiText;
            } catch { /* skip */ }
          }
        }
      }

      setMessages(prev => [...prev, {
        id: `summary-${Date.now()}`,
        expertId: '__summary__',
        content: fullText || '요약을 생성할 수 없습니다.',
        isSummary: true,
      }]);
    } catch (err) {
      console.error('Summary error:', err);
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
  const sessionTitleRef = useRef<string>('');
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

  const [bsClarify, setBsClarify] = useState<{
    show: boolean;
    message: string;
    questions: { id: string; question: string; options: { label: string; value: string }[] }[];
    selections: Record<string, string>;
    originalQuestion: string;
  } | null>(null);

  const [simPrepModal, setSimPrepModal] = useState<{
    show: boolean;
    scenario: SimulationScenario;
    answers: Record<string, string>;
    originalQuestion: string;
  } | null>(null);
  const [simPrepDone, setSimPrepDone] = useState(0);

  // After prep modal closes and stakeholderSettings are updated, trigger discussion
  useEffect(() => {
    if (simPrepDone > 0 && pendingSimQuestionRef.current) {
      const q = pendingSimQuestionRef.current;
      pendingSimQuestionRef.current = '';
      skipClarifyRef.current = true;
      startDiscussion(q);
    }
  }, [simPrepDone]);

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
      await streamExpert({ question: followUpQ, expert: await buildExpertWithPrompt(expert, '\n\n이전에 이 주제에 대해 답변한 적이 있습니다. 사용자의 추가 질문에 이전 답변을 바탕으로 더 깊이 답변해주세요.'),
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

    // ═══ AI vs User — 자유 티키타카 ═══
    if (discussionMode === 'aivsuser') {
      // 종료 트리거
      if (question === '__AVSU_END__') {
        setIsDiscussing(true);
        const controller = new AbortController();
        abortControllerRef.current = controller;

        // 전체 대화 기록
        const convHistory = messages
          .filter(m => m.expertId !== '__round__' && m.expertId !== '__avsu_judge__' && m.content)
          .map(m => m.expertId === '__user__' ? { speaker: '유저', content: m.content } : { speaker: m.simRoleName || allExperts.find(e => e.id === m.expertId)?.nameKo || 'AI', content: m.content });

        // 판정관 호출
        try {
          const judgeRes = await fetch('/api/debate-judge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topic: aivsTopic,
              round: 1,
              totalRounds: 1,
              userStance: aivsUserStance,
              userArgument: convHistory.filter(m => m.speaker === '유저').map(m => m.content).join('\n'),
              aiArguments: convHistory.filter(m => m.speaker !== '유저').map(m => ({ name: m.speaker, argument: m.content })),
              previousJudgments: [],
              isFinal: true,
            }),
            signal: controller.signal,
          });
          const judgment = await judgeRes.json();
          setMessages(prev => [...prev, {
            id: `avsu-judge-final-${Date.now()}`,
            expertId: '__avsu_judge__',
            content: JSON.stringify({ ...judgment, type: '__avsu_final__' }),
          }]);
        } catch { /* ignore */ }

        setIsDiscussing(false);
        setActiveExpertId(undefined);
        return;
      }

      setIsDiscussing(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const difficulty = debateSettings.aivsUserDifficulty || 'normal';
      const turnNum = aivsRound + 1;
      setAivsRound(turnNum);

      // 유저 메시지 추가
      const userMsgId = `avsu-user-${Date.now()}`;
      setMessages(prev => [...prev, { id: userMsgId, expertId: '__user__', content: question }]);

      // 대화 기록
      const allMsgs = [...messages, { id: userMsgId, expertId: '__user__', content: question }];
      const convHistory = allMsgs
        .filter(m => m.expertId !== '__round__' && m.expertId !== '__avsu_judge__' && m.content)
        .map(m => m.expertId === '__user__' ? { speaker: '유저', content: m.content } : { speaker: m.simRoleName || allExperts.find(e => e.id === m.expertId)?.nameKo || 'AI', content: m.content });

      const stanceKo = aivsUserStance === 'pro' ? '찬성' : '반대';
      const aiStanceKo = aivsUserStance === 'pro' ? '반대' : '찬성';
      const difficultyDesc = difficulty === 'easy' ? '부드럽게 반론하되 유저의 좋은 점은 인정해줘.' : difficulty === 'hard' ? '날카롭게 압박해. 유저의 모든 허점을 파고들어.' : '논리적으로 반론해. 약점은 지적하되 공정하게.';

      // 선택된 AI 상대들 (위에서 클릭한 AI)
      const aiOpponents = activeExperts.length > 0
        ? activeExperts.filter(e => e.id !== '__user__').slice(0, 3)
        : [experts.find(e => e.id === 'gemini') || experts.find(e => e.category === 'ai') || experts[0]].filter(Boolean);

      // 각 AI가 순서대로 반론 (티키타카)
      for (let ri = 0; ri < aiOpponents.length; ri++) {
        if (controller.signal.aborted) break;
        const aiExpert = aiOpponents[ri];
        if (!aiExpert) continue;

        const aiPrompt = `당신은 ${aiExpert.nameKo}입니다. "${aivsTopic}" 주제에서 "${aiStanceKo}" 입장으로 유저와 싸우고 있습니다.

## 난이도: ${difficulty}
${difficultyDesc}

## 유저 입장: ${stanceKo}
## 유저가 방금 한 말: "${question}"

## 대화 맥락 (최근 내용)
${convHistory.slice(-10).map(m => `[${m.speaker}] ${m.content}`).join('\n')}

## 행동 규칙
1. 유저가 방금 한 말에 바로 반응해. 인용하면서 반박
2. 2~4문장으로 짧고 강하게. 댓글 싸움 톤
3. "~라고?" "그건 아닌데" "말이 안 되는 게" 같은 구어체 OK
4. 새 논점 하나는 꼭 던져
5. ${aiOpponents.length > 1 ? '다른 AI의 발언과 겹치지 않게 다른 각도에서 공격' : '다양한 각도에서 공격'}
6. 역할명이나 태그 본문에 포함 금지
7. 한국어로`;

        if (ri > 0) await new Promise(r => setTimeout(r, 200));
        const aiMsgId = `avsu-ai-${ri}-${Date.now()}`;
        setMessages(prev => [...prev, { id: aiMsgId, expertId: aiExpert.id, content: '', isStreaming: true, simRoleName: aiExpert.nameKo }]);
        setActiveExpertId(aiExpert.id);

        let aiContent = '';
        try {
          await streamExpert({
            question: `유저의 주장에 반론하세요: "${question}"`,
            expert: { ...aiExpert, systemPrompt: aiPrompt },
            previousResponses: convHistory.slice(-8).map(m => ({ name: m.speaker, content: m.content })),
            round: 'initial' as any,
            onDelta: chunk => { aiContent += chunk; setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: aiContent } : m)); },
            onDone: () => { setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false } : m)); },
            signal: controller.signal,
          });
        } catch (err) {
          if ((err as Error).name === 'AbortError') { setIsDiscussing(false); return; }
        }
      }

      setIsDiscussing(false);
      setActiveExpertId(undefined);
      return;
    }

    // 시뮬레이션 모드: orchestrator 패턴
    if (discussionMode === 'stakeholder') {
      setIsDiscussing(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const shSettings = stakeholderSettings;
      const scenario = SIMULATION_SCENARIOS.find(s => s.id === shSettings.scenarioId);
      if (!scenario) { setIsDiscussing(false); return; }


      // Add user message
      const userMsgId = `user-sim-${Date.now()}`;
      setMessages(prev => [...prev, { id: userMsgId, expertId: '__user__', content: question }]);

      // Build conversation history for orchestrator
      const allMsgs = [...messages, { id: userMsgId, expertId: '__user__', content: question }];
      const conversationHistory = allMsgs
        .filter(m => m.expertId !== '__round__' && m.expertId !== '__summary__' && m.expertId !== '__ppt_download__' && m.content)
        .map(m => {
          if (m.expertId === '__user__') return { speaker: `${scenario.userRole} (유저)`, content: m.content };
          // simRoleName이 있으면 우선 사용 (모든 역할이 동일 AI에 매핑될 때 정확)
          if (m.simRoleName) return { speaker: m.simRoleName, content: m.content };
          const expert = allExperts.find(e => e.id === m.expertId);
          const roleName = Object.entries(shSettings.roleAssignments).find(([_, eid]) => eid === m.expertId)?.[0] || expert?.nameKo || '';
          return { speaker: roleName, content: m.content };
        });

      const turnCount = conversationHistory.length;

      // 수동 종료 처리
      if (question === '__SIM_END__') {
        // 유저 메시지 제거 (종료 트리거이므로)
        setMessages(prev => prev.filter(m => m.id !== userMsgId));
      }

      // Call orchestrator
      let orchestration: any;
      if (question === '__SIM_END__') {
        orchestration = { next_speaker: null, speak_direction: '', follow_up_speaker: null, follow_up_direction: null, phase: 'final', reason: 'User ended simulation' };
      } else try {
        const orchRes = await fetch('/api/sim-orchestrator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenario: { name: scenario.name, roles: scenario.roles, userRole: scenario.userRole, gaugeLabel: scenario.gaugeLabel, verdictOptions: scenario.verdictOptions },
            intensity: shSettings.intensity,
            conversationHistory,
            turnCount,
            mode: scenario.simType === 'consultation' ? 'consultation' : 'roleplay',
            currentPhase: scenario.simType === 'consultation' ? {
              index: simPhaseIndex,
              totalPhases: scenario.roles.length,
              name: scenario.phases[simPhaseIndex] || '',
              role: scenario.roles[simPhaseIndex] || scenario.roles[0],
            } : undefined,
          }),
          signal: controller.signal,
        });
        orchestration = await orchRes.json();
      } catch (err) {
        if ((err as Error).name === 'AbortError') { setIsDiscussing(false); return; }
        // Fallback: pick first role
        orchestration = {
          next_speaker: scenario.roles[0].name,
          speak_direction: '유저의 답변에 대해 질문하세요.',
          follow_up_speaker: null,
          follow_up_direction: null,
          user_choices: [],
          phase: 'ongoing',
        };
      }

      // Handle wrapping_up phase message
      if (orchestration.phase === 'wrapping_up') {
        setMessages(prev => [...prev, {
          id: `sim-wrapup-${Date.now()}`,
          expertId: '__round__',
          content: '시뮬레이션이 마무리 단계에 진입합니다.',
        }]);
      }

      // Handle final phase - generate final verdicts from each role
      if (orchestration.phase === 'final') {
        setMessages(prev => [...prev, {
          id: `sim-final-${Date.now()}`,
          expertId: '__round__',
          content: '최종 판정',
        }]);

        // Each role gives final verdict
        const allResponses: {name: string; content: string}[] = conversationHistory.map(m => ({ name: m.speaker, content: m.content }));
        for (const role of scenario.roles) {
          const expertId = shSettings.roleAssignments[role.name];
          const expert = experts.find(e => e.id === expertId);
          if (!expert || controller.signal.aborted) continue;

          const msgId = `${expert.id}-final-${Date.now()}`;
          setMessages(prev => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, simRoleName: role.name, simRoleIcon: role.icon }]);
          setActiveExpertId(expert.id);

          const finalPrompt = `당신은 "${scenario.name}" 시뮬레이션에서 "${role.name}" 역할입니다.
핵심 관심사: ${role.focus}
반응 강도: ${shSettings.intensity}/10

시뮬레이션이 종료됩니다. 전체 대화를 바탕으로 최종 입장을 밝히세요.

형식 (반드시 지켜라):
첫 줄: "**[판정: ${scenario.verdictOptions.join('/')} 중 하나]**"
그 다음: 판정 이유를 2~3문장으로 설명. 대화 중 유저가 한 구체적 발언을 인용하여 근거로 제시.

예시: "**[판정: 조건부 검토]** 시장 규모에 대한 분석은 설득력 있었지만, 번레이트 관리 계획이 구체적이지 않아 추가 검토가 필요합니다."

한국어. 대화체.`;

          let fullContent = '';
          try {
            await streamExpert({
              question: '최종 판정을 내려주세요.',
              expert: { ...expert, systemPrompt: finalPrompt },
              previousResponses: allResponses,
              round: 'final' as any,
              onDelta: chunk => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
              onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m)); },
              signal: controller.signal,
            });
          } catch { /* ignore */ }
          allResponses.push({ name: `${expert.nameKo} (${role.name})`, content: fullContent });
          await new Promise(r => setTimeout(r, 300));
        }

        // 결과 카드 — 각 역할의 판정을 파싱하여 표시
        const verdicts: {roleName: string; roleIcon: string; verdict: string}[] = [];
        for (const resp of allResponses) {
          const match = resp.content.match(/\[판정:\s*([^\]]+)\]/);
          if (match) {
            const roleInfo = scenario.roles.find(r => resp.name.includes(r.name));
            if (roleInfo) verdicts.push({ roleName: roleInfo.name, roleIcon: roleInfo.icon, verdict: match[1].trim() });
          }
        }
        if (verdicts.length > 0) {
          // 종합 판정: 가장 많이 나온 verdict
          const verdictCounts: Record<string, number> = {};
          verdicts.forEach(v => { verdictCounts[v.verdict] = (verdictCounts[v.verdict] || 0) + 1; });
          const overallVerdict = Object.entries(verdictCounts).sort((a, b) => b[1] - a[1])[0][0];

          setMessages(prev => [...prev, {
            id: `sim-result-${Date.now()}`,
            expertId: '__sim_result__',
            content: JSON.stringify({
              scenarioName: scenario.name, scenarioIcon: scenario.icon,
              gaugeLabel: scenario.gaugeLabel, verdicts, overallVerdict,
            }),
          }]);
        }

        // Generate auto report if enabled
        if (!controller.signal.aborted) {
          const reportMsgId = `sim-report-${Date.now()}`;
          setMessages(prev => [...prev, { id: reportMsgId, expertId: SUMMARIZER_EXPERT.id, content: '', isStreaming: true, isSummary: true }]);
          setActiveExpertId(SUMMARIZER_EXPERT.id);

          const reportPrompt = `당신은 시뮬레이션 분석가입니다. 전체 대화를 분석하여 종합 리포트를 작성하세요.

## 리포트 구조 (마크다운, 이 순서대로 작성)

### 📊 ${scenario.gaugeLabel} 종합 평가
- 백분율(%)로 평가하고 한줄 근거 제시

### 🏷️ 최종 판정
- ${scenario.verdictOptions.join(' / ')} 중 하나 선택
- 각 역할의 개별 판정을 표로 정리

### 📋 전체 요약
- 시뮬레이션 흐름을 2~3문장으로 요약

### 👍 잘한 점 (2~3개)
- 유저의 **구체적 발언**을 인용하여 어떤 점이 효과적이었는지 분석
- 예: "유저가 '월 MAU 3,000명에서 전환율 15%'라고 답한 부분은 구체적 수치로 설득력이 있었다"

### ⚠️ 개선할 점 (2~3개)
- 유저가 **약했거나 회피한 부분**을 구체적으로 지적
- 개선 방법도 함께 제시

### 👥 역할별 핵심 피드백
- 각 역할이 가장 중시한 포인트와 유저의 대응 평가

### 🎯 다음 단계 제안
- 이 피드백을 바탕으로 실제로 취할 수 있는 액션 3가지
- 구체적이고 실행 가능한 것만

한국어로 작성. 마크다운 형식.`;

          let reportContent = '';
          try {
            await streamExpert({
              question: '종합 리포트를 작성해주세요.',
              expert: { ...SUMMARIZER_EXPERT, systemPrompt: reportPrompt },
              previousResponses: allResponses,
              round: 'summary' as any,
              onDelta: chunk => { reportContent += chunk; setMessages(prev => prev.map(m => m.id === reportMsgId ? { ...m, content: reportContent } : m)); },
              onDone: () => { setMessages(prev => prev.map(m => m.id === reportMsgId ? { ...m, isStreaming: false } : m)); },
              signal: controller.signal,
            });
          } catch { /* ignore */ }
        }

        setIsDiscussing(false);
        setActiveExpertId(undefined);
        return;
      }

      // Normal turn: generate speaker responses
      const rolePersonalities: Record<string, Record<string, string>> = {
        '채용 면접': {
          '직무 면접관': '실무 중심으로 구체적 사례를 요구하라. "구체적으로 어떤 프로젝트였나요?", "결과는?" 식으로 꼬리질문.',
          'HR 담당자': '부드럽지만 핵심을 찌르라. 동기, 비전, 약점을 자연스럽게. "5년 후 어떤 모습이길 원하세요?"',
          '팀 리더': '함께 일할 사람 관점. "우리 팀에 오면 첫 달에 뭘 하실 건가요?"',
        },
        '제품 런칭': {
          '타겟 고객': '실제 사용자처럼 감정적으로 반응. "이거 진짜 필요해요!" 또는 "기존 거랑 뭐가 다른지 모르겠어요"',
          '경쟁사 PM': '날카롭게 약점 공격. "우리 제품도 이거 되는데요", "가격이 너무 비싸요"',
          '테크 리뷰어': '객관적·분석적. 기술 트렌드 맥락에서 평가.',
        },
        '정책 검토': {
          '시민 대표': '감정과 여론 기반. "국민들이 어떻게 받아들일까요?", "형평성 문제는?"',
          '기업 대표': '경제 수치와 규제 부담 중심. "추가 비용이 얼마?", "고용 영향은?"',
          '법률 전문가': '판례와 법 조문 기반. 냉정하고 논리적.',
        },
        '전략 회의': {
          '마케팅 이사': '시장 데이터 기반. 합의적이되 마케팅 리소스 확보에 적극적.',
          '개발 리드': '기술적 실현과 일정에 집중. "가능하지만 3개월은 필요합니다"',
          '운영 매니저': '비용과 프로세스 현실. "현재 인력으로 감당이 안 됩니다"',
        },
        '사내 제안': {
          '대표이사': '거시적 판단. "이게 우리 회사 3년 계획과 맞나?"',
          'CFO': '숫자 중심. "투입 대비 수익이 몇 %?", "기회비용은?"',
          '협업 팀장': '현장 현실. "우리 팀 인력으로 추가로 가능한가?", "기존 업무 영향은?"',
        },
        '입시 면접': {
          '학과 교수': '전공 관련 지식과 학업 의지를 깊이 파고든다. "이 분야를 왜 선택했나요?", "관련 책을 읽은 적 있나요?"',
          '입학 사정관': '자기소개서 내용의 진정성을 확인. "여기 적힌 활동을 구체적으로 설명해주세요", "이 경험에서 뭘 배웠나요?"',
          '인성 면접관': '가치관과 인성을 탐색. "갈등 상황에서 어떻게 해결했나요?", "우리 학교에서 뭘 하고 싶나요?"',
        },
      };

      const buildRolePrompt = (role: {name: string; icon: string; focus: string}, direction: string) => {
        const isConsultation = scenario.simType === 'consultation';

        // 상담 모드: 완전히 다른 프롬프트
        if (isConsultation) {
          const consultPersonalities: Record<string, Record<string, string>> = {
            '의학 상담': {
              '접수 간호사': '따뜻하고 안심시키는 톤. "많이 불편하셨겠어요"로 공감한 뒤, 증상을 체계적으로 파악. 긴급도를 자연스럽게 판단.',
              '전문의': '전문적이면서도 이해하기 쉬운 설명. 의학 용어를 쓰되 괄호로 쉬운 말 추가. "혹시 이런 적도 있으셨나요?" 식으로 감별진단.',
              '약사': '복용 약물 상호작용에 주의. "혹시 다른 약이나 건강보조식품 드시는 게 있으신가요?" 친근하게.',
              '영양사': '생활습관을 비판 없이 파악. "보통 하루에 몇 끼 정도 드세요?" 식으로 자연스럽게.',
            },
            '법률 상담': {
              '수석 변호사': '신뢰감 있고 차분. 사건 유형을 빠르게 분류하면서도 의뢰인을 안심시킨다.',
              '사건 담당': '꼼꼼하게 사실관계를 정리. 시간순으로 물어보되 "천천히 말씀해주세요"로 배려.',
              '판례 연구원': '관련 법조문과 판례를 쉽게 설명. "비슷한 사례에서는 이런 판결이 나왔어요".',
              '리스크 분석': '현실적이면서도 희망을 잃지 않게. 승소 가능성을 솔직하되 부드럽게 전달.',
            },
            '재무·투자 상담': {
              '재무설계사': '판단 없이 현재 재무 상태를 파악. "부담스러우시면 대략적인 범위로도 괜찮아요".',
              '라이프플래너': '인생 계획과 재무를 자연스럽게 연결. "앞으로 어떤 계획이 있으신가요?".',
              '투자 분석가': '투자 경험과 성향을 파악. "손실이 나면 어느 정도까지 견디실 수 있으세요?".',
              '세무사': '절세 기회를 찾아주는 톤. "현재 이렇게 하고 계시는군요, 더 절약할 수 있는 방법이 있을 수도 있어요".',
            },
            '부동산 상담': {
              '부동산 컨설턴트': '니즈를 구체화. "어떤 용도로 생각하고 계세요?", "꼭 필요한 조건이 있으신가요?".',
              '시장 분석가': '데이터 기반이되 이해하기 쉽게. "요즘 이 지역 시세가 이런 추세예요".',
              '법률 전문가': '계약 리스크를 체크리스트처럼 짚어줌. "이 부분은 확인해보셨나요?".',
              '세무사': '세금 부담을 미리 시뮬레이션. "이 경우 취득세가 대략 이 정도 나올 수 있어요".',
            },
            '창업 상담': {
              '스타트업 멘토': '격려하면서도 현실적 질문. "좋은 아이디어네요! 그런데 고객이 실제로 이걸 원한다는 걸 어떻게 확인했어요?".',
              '시장 분석가': '시장 크기를 함께 계산. "타겟 고객이 대략 몇 명 정도 될까요?".',
              '사업 전략가': '비즈니스 모델을 구체화. "수익은 어떤 방식으로 발생하나요?".',
              '재무 전문가': '숫자를 두려워하지 않게. "대략적으로라도 한번 계산해볼까요?".',
            },
            '심리 상담': {
              '임상심리사': '깊은 공감과 수용. "그 상황이 정말 힘드셨겠어요". 진단이 아닌 탐색 자세.',
              '상담심리사': '일상 속 관계와 감정을 탐색. "주변 사람들과의 관계는 어떠세요?".',
              '정신건강의학 전문의': '의학적 증상을 부드럽게 확인. "수면 패턴에 변화가 있으셨나요?" 낙인 없이.',
              '마음챙김 코치': '실천 가능한 제안. "지금 바로 해볼 수 있는 간단한 방법이 있어요".',
            },
          };

          const personality = consultPersonalities[scenario.name]?.[role.name] || '';
          return `당신은 "${scenario.name}"에서 "${role.name}" 역할의 전문 상담사입니다.

## 정체성
- 역할: ${role.name} ${role.icon}
- 전문 영역: ${role.focus}
${personality ? `\n## 상담 스타일\n${personality}` : ''}

## 상담 행동 규칙 (반드시 준수)
1. **공감 먼저, 질문 다음**: 유저의 답변에 먼저 공감/반응한 뒤 후속 질문
   - 좋은 예: "2주나 되셨군요, 꽤 오래 고생하셨네요. 그 사이에 악화되는 패턴이 있었나요?"
   - 나쁜 예: "발병 시기는? 악화 요인은? 동반 증상은?" (심문 형태 ❌)
2. **한 번에 질문 1~2개**: 질문을 몰아치지 마라. 한 턴에 최대 2개
3. **2~4문장**: 공감 1문장 + 질문 1~2문장. 간결하게
4. **유저의 말을 인용**: "아까 두통이 있다고 하셨는데" 식으로 이전 답변 참조
5. **모르겠다는 답변 수용**: "괜찮아요, 정확히 모를 수도 있죠" 라고 넘어가기
6. **전문 용어 최소화**: 꼭 필요하면 괄호로 쉬운 말 추가
7. **한국어 존댓말**: 상담사 톤. 따뜻하지만 전문적
8. **역할명·태그 본문 포함 금지**

## 현재 지시
${direction}`;
        }

        // 시뮬레이션(롤플레이) 모드: 기존 로직
        const intensityDesc = shSettings.intensity <= 3 ? '건설적이고 우호적으로 반응하세요.' : shSettings.intensity <= 6 ? '장단점을 솔직하게 짚으세요.' : '약점을 날카롭게 파고들고 도전적으로 질문하세요.';
        const personality = rolePersonalities[scenario.name]?.[role.name] || '';
        return `당신은 "${scenario.name}" 시뮬레이션에서 "${role.name}" 역할입니다.

## 정체성
- 역할: ${role.name} ${role.icon}
- 핵심 관심사: ${role.focus}
${personality ? `\n## 역할 성격\n${personality}` : ''}

## 반응 강도: ${shSettings.intensity}/10
${intensityDesc}

## 행동 규칙
1. ${role.name}의 이해관계 관점에서만 반응하라
2. 실제 이 역할인 사람이 할 법한 현실적 반응을 하라
3. 2~4문장으로 짧게. 대화하듯 말하라. 분석 보고서가 아니라 대화다.
4. 구체적 질문을 던져라 (예: "그래서 수익은 어떻게 되나요?", "번레이트는요?")
5. 다른 역할의 이전 발언을 참조하여 동의하거나 반박할 수 있다
6. 한국어로 답변하라
7. 역할명이나 태그를 본문에 포함하지 마라
8. "~님" 등 호칭 사용 금지. 바로 내용으로 시작하라

## 현재 지시
${direction}`;
      };

      // First speaker — validate role name exists in scenario
      let speaker1RoleName = orchestration.next_speaker;
      if (!scenario.roles.find(r => r.name === speaker1RoleName)) {
        speaker1RoleName = scenario.roles[0].name; // fallback to first role
      }

      // Get expert for role from assignments (already assigned at start)
      const getExpertForRole = (roleName: string) => {
        const assignedId = shSettings.roleAssignments[roleName];
        if (assignedId) return experts.find(e => e.id === assignedId);
        return experts.find(e => e.category === 'ai') || experts[0];
      };

      const speaker1Role = scenario.roles.find(r => r.name === speaker1RoleName);
      const expert1 = getExpertForRole(speaker1RoleName);
      if (speaker1Role && expert1 && !controller.signal.aborted) {
        const msgId = `${expert1.id}-sim-${Date.now()}`;
        setMessages(prev => [...prev, { id: msgId, expertId: expert1.id, content: '', isStreaming: true, simRoleName: speaker1Role.name, simRoleIcon: speaker1Role.icon }]);
        setActiveExpertId(expert1.id);

        const allResponses = conversationHistory.map(m => ({ name: m.speaker, content: m.content }));
        let fullContent = '';
        try {
          await streamExpert({
            question: `유저(${scenario.userRole})의 답변: "${question}"\n\n이 답변을 바탕으로 반응하세요.`,
            expert: { ...expert1, systemPrompt: buildRolePrompt(speaker1Role, orchestration.speak_direction) },
            previousResponses: allResponses,
            round: 'initial' as any,
            onDelta: chunk => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
            onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false } : m)); },
            signal: controller.signal,
          });
        } catch (err) {
          if ((err as Error).name === 'AbortError') { setIsDiscussing(false); return; }
        }
        allResponses.push({ name: `${expert1.nameKo} (${speaker1Role.name})`, content: fullContent });

        // Second speaker — 비활성화 (한 턴에 한 명만 응답)
        if (false && orchestration.follow_up_speaker && !controller.signal.aborted) {
          const speaker2RoleName = orchestration.follow_up_speaker;
          const speaker2Role = scenario.roles.find(r => r.name === speaker2RoleName);
          const expert2 = getExpertForRole(speaker2RoleName);

          if (speaker2Role && expert2) {
            await new Promise(r => setTimeout(r, 300));
            const msg2Id = `${expert2.id}-sim2-${Date.now()}`;
            setMessages(prev => [...prev, { id: msg2Id, expertId: expert2.id, content: '', isStreaming: true, simRoleName: speaker2Role.name, simRoleIcon: speaker2Role.icon }]);
            setActiveExpertId(expert2.id);

            let fullContent2 = '';
            try {
              await streamExpert({
                question: `유저(${scenario.userRole})의 답변: "${question}"\n\n이 답변을 바탕으로 반응하세요.`,
                expert: { ...expert2, systemPrompt: buildRolePrompt(speaker2Role, orchestration.follow_up_direction || '이전 발언에 동조하거나 반박하세요.') },
                previousResponses: allResponses,
                round: 'initial' as any,
                onDelta: chunk => { fullContent2 += chunk; setMessages(prev => prev.map(m => m.id === msg2Id ? { ...m, content: fullContent2 } : m)); },
                onDone: () => { setMessages(prev => prev.map(m => m.id === msg2Id ? { ...m, isStreaming: false } : m)); },
                signal: controller.signal,
              });
            } catch { /* ignore */ }
          }
        }

        // Handle consultation phase transition
        if (scenario.simType === 'consultation' && orchestration.next_phase) {
          const nextIdx = simPhaseIndex + 1;
          if (nextIdx < scenario.roles.length) {
            setSimPhaseIndex(nextIdx);
            const nextRole = scenario.roles[nextIdx];
            const nextPhase = scenario.phases[nextIdx];

            // Phase transition message
            setMessages(prev => [...prev, {
              id: `phase-transition-${Date.now()}`,
              expertId: '__round__',
              content: `📋 ${nextIdx + 1}단계: ${nextPhase}`,
            }]);

            // Next expert introduces themselves
            const transitionMsgId = `transition-${Date.now()}`;
            const gemini = experts.find(e => e.id === 'gemini') || experts.find(e => e.category === 'ai') || experts[0];
            setMessages(prev => [...prev, { id: transitionMsgId, expertId: gemini.id, content: '', isStreaming: true, simRoleName: nextRole.name, simRoleIcon: nextRole.icon }]);
            setActiveExpertId(gemini.id);

            // 이전 단계 요약 (오케스트레이터가 생성)
            const prevPhaseSummary = orchestration.phase_summary || '';
            const prevRole = scenario.roles[simPhaseIndex]; // 현재(이전) 단계 역할
            const transitionPrompt = `당신은 "${scenario.name}" 상담에서 새로 담당을 맡은 "${nextRole.name}"입니다.
전문 영역: ${nextRole.focus}

## 인수인계 상황
- 이전 단계: ${scenario.phases[simPhaseIndex]} (${prevRole?.name || ''})
- 다음 단계: ${nextPhase} (당신)
${prevPhaseSummary ? `- 이전 단계 요약: ${prevPhaseSummary}` : ''}

## 첫 인사 규칙
1. 이전 전문가가 파악한 내용을 **한 문장으로 자연스럽게 언급** (인수인계 느낌)
   - 좋은 예: "앞서 말씀하신 증상에 대해 들었어요. 제 쪽에서 몇 가지 더 여쭤볼게요."
   - 나쁜 예: "이전 단계 내용을 확인했습니다." (로봇 같음 ❌)
2. 당신의 전문 영역에서 **첫 질문 1개**를 던져라
3. 총 2~3문장. 따뜻하고 전문적인 톤. 한국어 존댓말
4. 역할명이나 태그를 본문에 포함하지 마라`;

            let transContent = '';
            try {
              await streamExpert({
                question: '다음 단계를 시작해주세요.',
                expert: { ...gemini, systemPrompt: transitionPrompt },
                previousResponses: allResponses || conversationHistory.map((m: any) => ({ name: m.speaker, content: m.content })),
                round: 'initial' as any,
                onDelta: chunk => { transContent += chunk; setMessages(prev => prev.map(m => m.id === transitionMsgId ? { ...m, content: transContent } : m)); },
                onDone: () => { setMessages(prev => prev.map(m => m.id === transitionMsgId ? { ...m, isStreaming: false } : m)); },
                signal: controller.signal,
              });
            } catch { /* ignore */ }
          } else {
            // Last phase done — generate final deliverable
            setMessages(prev => [...prev, {
              id: `consult-final-${Date.now()}`,
              expertId: '__round__',
              content: '📋 상담 완료 — 결과물을 생성합니다',
            }]);

            const outputPrompts: Record<string, string> = {
              medical: `당신은 의료 상담 기록 전문가입니다. 전체 상담 대화를 분석하여 **SOAP Note**를 작성하세요.

## 작성 규칙
- 상담에서 환자가 **실제로 말한 내용만** 기반으로 작성 (추측 금지)
- 환자의 원문 표현을 "인용부호"로 직접 인용
- 확인되지 않은 항목은 "미확인" 또는 "추가 확인 필요"로 명시

## 양식

### S (Subjective) — 환자 호소
- **주 증상**: 환자가 말한 증상 원문 인용
- **발병 시기**: 언제부터, 어떤 상황에서
- **악화/완화 요인**: 환자가 언급한 패턴
- **동반 증상**: 함께 나타나는 증상
- **과거 병력/가족력**: 확인된 내용

### O (Objective) — 수집 정보
- **복용 약물**: 이름, 용량, 기간
- **알레르기**: 확인 여부
- **생활습관**: 식사, 운동, 수면, 음주/흡연
- **영양 상태**: 평가 결과

### A (Assessment) — 종합 평가
- **1차 의심**: 가장 가능성 높은 상태
- **감별 대상**: 추가 확인 필요한 가능성들
- **위험도**: 🟢낮음 / 🟡보통 / 🔴높음 (근거 포함)

### P (Plan) — 권고 계획
- **즉시 조치**: 지금 바로 할 것
- **권장 검사**: 구체적 검사명과 이유
- **생활 교정**: 실천 가능한 3가지
- **추적 관찰**: 언제 재방문
- **전문의 연계**: 필요시 진료과`,

              legal_sim: `당신은 법률 자문 보고서 작성 전문가입니다. 전체 상담 대화를 분석하여 **법률의견서**를 작성하세요.

## 작성 규칙
- 의뢰인이 진술한 사실관계에 기반 (추측 금지)
- 법률 용어는 괄호로 쉬운 설명 추가
- "상담 내용 기반 의견이며 법적 효력 없음" 면책 포함

## 양식

### 1. 사건 개요
- 사건 유형, 당사자, 분쟁 경위 요약

### 2. 사실관계 정리
- 의뢰인 진술을 시간순 정리 (원문 인용)
- 확인된 증거 목록

### 3. 법적 쟁점 분석
- 핵심 쟁점 (2~3개)
- 각 쟁점별 적용 법조문과 해석

### 4. 판례 분석
- 유사 판례 (있는 경우) 및 시사점

### 5. 승소 가능성 평가
- 유리한 점 / 불리한 점
- 종합 판단: ⭐⭐⭐⭐⭐ (5점 만점)

### 6. 전략 권고
- **A안** (공격적): 설명 + 예상 비용/기간
- **B안** (보수적): 설명 + 예상 비용/기간
- **권고안**: A 또는 B 선택 근거

### 7. 다음 단계 체크리스트
- [ ] 즉시 해야 할 것 3가지
- [ ] 수집해야 할 추가 증거
- [ ] 시효 관련 주의사항

*본 의견서는 AI 상담 내용을 기반으로 작성되었으며, 법적 효력이 없습니다. 정식 법률 자문은 변호사와 상담하세요.*`,

              finance_sim: `당신은 개인재무설계 전문가입니다. 전체 상담 대화를 분석하여 **맞춤형 재무 보고서**를 작성하세요.

## 작성 규칙
- 고객이 밝힌 수치만 사용 (추정치는 "추정"으로 표기)
- 구체적 금액과 비율 포함
- 실천 가능한 액션 중심

## 양식

### 1. 재무 건강 진단 📊
- 월 수입/지출 요약
- 저축률: __% (권장: 20% 이상)
- 부채비율: __% (권장: 40% 이하)
- 비상자금: __ 개월분 (권장: 6개월)
- 종합 등급: 🟢양호 / 🟡주의 / 🔴위험

### 2. 생애주기 재무 이벤트 📅
- 향후 5년 내 예상 이벤트와 필요 자금

### 3. 투자 성향 프로파일
- 리스크 성향: 안정형 / 중립형 / 공격형
- 투자 가능 금액 및 기간
- 권장 자산 배분 (비율)

### 4. 절세 전략 💰
- 현재 놓치고 있는 절세 기회
- 구체적 절세 방법 (연금저축, ISA 등)
- 예상 절감액

### 5. 90일 액션플랜 ✅
| 시기 | 할 일 | 예상 효과 |
|---|---|---|
| 1주차 | ... | ... |
| 1개월 | ... | ... |
| 3개월 | ... | ... |`,

              realestate_sim: `당신은 부동산 투자 분석 전문가입니다. 전체 상담 대화를 분석하여 **부동산 투자분석 보고서**를 작성하세요.

## 작성 규칙
- 고객의 조건과 목적에 맞춘 분석
- 수치 기반 시뮬레이션 포함
- 리스크와 기회를 균형 있게

## 양식

### 1. 매수 프로파일
- 목적: 실거주 / 투자 / 겸용
- 예산, 대출 가능액, 희망 조건 요약

### 2. 시장 분석
- 관심 지역/유형 시세 동향
- 입주 물량, 인구 이동 등 영향 요인
- 전망: 🔺상승 / ➡️보합 / 🔻하락

### 3. 법률 체크리스트
- [ ] 등기 확인 사항
- [ ] 계약 시 주의점
- [ ] 규제 (대출, 전매 등)

### 4. 세금 시뮬레이션
- 취득세: 약 ___만원
- 보유세 (연간): 약 ___만원
- 양도세 (5년 후 매도 시): 약 ___만원

### 5. 종합 판정
- **판정**: 매수 적기 / 관망 / 재검토
- **판정 근거**: 3가지
- **리스크 요인**: 주의할 점

### 6. 실행 체크리스트 ✅
- [ ] 즉시: ...
- [ ] 1개월 내: ...
- [ ] 계약 전: ...`,

              startup_sim: `당신은 스타트업 전략 컨설턴트입니다. 전체 상담 대화를 분석하여 **Lean Business Plan**을 작성하세요.

## 작성 규칙
- 상담에서 나온 아이디어와 데이터 기반
- PMF(Product-Market Fit) 관점에서 냉정하게 평가
- 실행 가능한 첫 걸음에 집중

## 양식

### 1. Executive Summary 🎯
- 한 줄 정의: "[타겟]을 위한 [솔루션] — [핵심 가치]"
- 핵심 문제, 솔루션, 차별점 3문장

### 2. 문제 → 솔루션 핏
- **문제**: 타겟 고객이 겪는 구체적 고통
- **현재 대안**: 고객이 지금 사용하는 방법
- **우리 솔루션**: 왜 기존보다 나은지

### 3. 시장 분석
- TAM / SAM / SOM (구체적 수치 또는 추정 근거)
- 경쟁 구도 요약
- 진입 장벽 / 해자(moat)

### 4. 비즈니스 모델
- 수익 구조 (누가, 얼마를, 왜 지불)
- 핵심 KPI 3개
- Unit Economics (가능한 범위에서)

### 5. 재무 시뮬레이션
- 초기 자금 필요액
- 월 번레이트 예상
- 손익분기 시점 추정
- 투자 유치 필요 여부 + 규모

### 6. 90일 로드맵 ✅
| 주차 | 마일스톤 | 검증 지표 |
|---|---|---|
| 1~2주 | MVP 정의 | 핵심 기능 3개 확정 |
| 3~4주 | ... | ... |
| 5~8주 | ... | ... |
| 9~12주 | ... | ... |

### 7. 사업 가능성 판정
- **종합 판정**: 즉시 실행 / 피봇 권고 / 추가 검증 / 재고 필요
- **강점**: 3가지
- **리스크**: 3가지
- **첫 번째 액션**: 내일 당장 할 수 있는 한 가지`,

              psychology_sim: `당신은 심리 건강 전문 리포터입니다. 전체 상담 대화를 분석하여 **심리 건강 리포트**를 작성하세요.

## 작성 규칙
- 내담자의 말을 존중하고 "인용부호"로 직접 인용
- 진단이 아닌 **탐색적 평가** 톤 유지
- 낙인 없이, 강점도 함께 언급
- "AI 상담이며 전문 진단이 아님" 면책 포함

## 양식

### 1. 감정 상태 평가 💭
- 현재 주요 감정 (내담자 표현 인용)
- 감정 강도: 🟢경미 / 🟡보통 / 🔴심각
- 지속 기간 및 변화 추이

### 2. 스트레스 요인 분석
- 1순위: [요인] — 내담자 표현 인용
- 2순위: [요인]
- 환경적 / 관계적 / 내적 요인 분류

### 3. 일상 기능 평가
- 수면: 패턴, 질, 문제점
- 식습관: 변화 여부
- 사회 활동: 대인관계, 업무/학업 기능
- 강점 자원: 내담자가 보유한 회복 자원

### 4. 맞춤 관리법 🌱
- **즉시 실천**: 오늘부터 할 수 있는 2가지
  - 구체적 방법 + 왜 도움되는지
- **주간 루틴**: 일주일 단위 관리법
- **장기 전략**: 1~3개월 관점

### 5. 종합 소견
- 현재 상태 요약 (2~3문장)
- 긍정적 측면 (내담자의 강점, 자원)

### 6. 전문 상담 연계 권고
- **필요도**: 🟢불필요 / 🟡권고 / 🔴강력 권고
- 권고 시 적합한 상담 유형 (인지행동, 정신역동 등)
- 병원 방문이 필요한 경우 명시

*본 리포트는 AI 기반 탐색적 평가이며, 의학적 진단이 아닙니다. 전문 상담이 필요하면 심리상담센터 또는 정신건강의학과를 방문하세요.*`,
            };

            const outputPrompt = outputPrompts[scenario.id] || '전체 상담 내용을 바탕으로 종합 리포트를 작성하세요.';
            const reportMsgId = `consult-report-${Date.now()}`;
            const gemini = experts.find(e => e.id === 'gemini') || experts.find(e => e.category === 'ai') || experts[0];
            setMessages(prev => [...prev, { id: reportMsgId, expertId: SUMMARIZER_EXPERT.id, content: '', isStreaming: true, isSummary: true }]);
            setActiveExpertId(SUMMARIZER_EXPERT.id);

            let reportContent = '';
            const allResp = conversationHistory.map((m: any) => ({ name: m.speaker, content: m.content }));
            try {
              await streamExpert({
                question: '상담 전체 대화를 분석하여 최종 결과물을 작성해주세요. 내담자/고객이 실제로 말한 내용을 구체적으로 인용하세요.',
                expert: { ...SUMMARIZER_EXPERT, systemPrompt: outputPrompt + '\n\n## 공통 규칙\n- 한국어로 작성\n- 마크다운 형식\n- 상담에서 나온 구체적 내용을 "인용부호"로 직접 인용\n- 확인되지 않은 항목은 "미확인" 또는 "추가 확인 필요"로 표기\n- 각 섹션에 상담 내용이 반영되어야 함 (빈 섹션 금지)' },
                previousResponses: allResp,
                round: 'summary' as any,
                onDelta: chunk => { reportContent += chunk; setMessages(prev => prev.map(m => m.id === reportMsgId ? { ...m, content: reportContent } : m)); },
                onDone: () => { setMessages(prev => prev.map(m => m.id === reportMsgId ? { ...m, isStreaming: false } : m)); },
                signal: controller.signal,
              });
            } catch { /* ignore */ }

            setIsDiscussing(false);
            setActiveExpertId(undefined);
            return;
          }
        }
      }

      setIsDiscussing(false);
      setActiveExpertId(undefined);
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
      // 뷰 전환 안 함 — 현재 뷰 유지

      for (const expert of activeExperts) {
        if (controller.signal.aborted) break;
        setActiveExpertId(expert.id);
        const msgId = `${expert.id}-followup-${Date.now()}`;
        setMessages(prev => [...prev, { id: msgId, expertId: expert.id, content: '', isStreaming: true, timestamp: Date.now() }]);
        let fullContent = '';
        try {
          await streamExpert({ question, expert: await buildExpertWithPrompt(expert, '\n\n이전 대화 맥락을 참고하여 후속 질문에 답변하세요.'),
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
          await streamExpert({ question, expert: await buildExpertWithPrompt(expert, stanceExtra(expert.id)),
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
  }, [isDiscussing, discussionMode, activeExperts, messages, allExperts, proconStances, startDiscussion, stakeholderSettings, experts, debateSettings, currentQuestion, simPhaseIndex]);

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
        <Suspense fallback={null}>
          <LazyAppSidebar
            experts={experts}
            onLoadHistory={loadHistory}
            onUpdateExperts={setExperts}
            discussionMode={discussionMode}
            onModeChange={handleModeChange}
            isDiscussing={isDiscussing}
            onNewDiscussion={handleNewDiscussion}
            onStartChat={(expertId, mode, content) => {
              handleNewDiscussion();
              setSelectedExpertIds([expertId]);
              setDiscussionMode('general');

              if (mode === 'question') {
                setTimeout(() => {
                  runDiscussion(content, [expertId], 'general');
                }, 100);
              } else {
                setTimeout(() => {
                  setMessages([{
                    id: `greeting-${Date.now()}`,
                    expertId: expertId,
                    content: content,
                    isStreaming: false,
                  }]);
                  setCurrentQuestion('');
                  sessionTitleRef.current = '';
                }, 100);
              }
            }}
          />
        </Suspense>


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
            {/* Simulation wrapper — 헤더 + 대화 영역을 하나의 흰색 카드로 */}
            {!selectable && discussionMode === 'stakeholder' && (() => {
              const scenario = SIMULATION_SCENARIOS.find(s => s.id === stakeholderSettings.scenarioId)
                || (() => {
                  // 히스토리에서 불러왔을 때: briefing 메시지에서 시나리오 복원
                  const briefingMsg = messages.find(m => m.expertId === '__sim_briefing__');
                  if (briefingMsg) {
                    try {
                      const b = JSON.parse(briefingMsg.content);
                      return SIMULATION_SCENARIOS.find(s => s.name === b.scenarioName) || null;
                    } catch { return null; }
                  }
                  // briefing 없으면 currentQuestion에서 시나리오 추정
                  return SIMULATION_SCENARIOS.find(s => currentQuestion.includes(s.name)) || null;
                })();
              return scenario ? (
                <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-6">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[calc(100vh-200px)] flex flex-col">
                    {/* 헤더 */}
                    <div className="shrink-0 bg-slate-50 border-b border-slate-200 px-5 py-3 rounded-t-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[16px]">{scenario.icon}</span>
                        <span className="text-[14px] font-extrabold text-slate-800">{scenario.name}</span>
                        <span className="text-[11px] text-slate-400 font-medium">· AI 시뮬레이션</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {scenario.roles.map((r, ri) => {
                          const isConsult = scenario.simType === 'consultation';
                          const isCurrent = isConsult && ri === simPhaseIndex;
                          const isDone = isConsult && ri < simPhaseIndex;
                          return (
                            <span key={r.name} className={cn('text-[10px] font-medium flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all',
                              isCurrent ? 'bg-indigo-100 text-indigo-700 font-bold' :
                              isDone ? 'text-slate-400' :
                              'text-slate-500'
                            )}>
                              <span>{r.icon}</span> {r.name}
                              {isDone && <span className="text-[8px]">✓</span>}
                            </span>
                          );
                        })}
                        {messages.filter(m => m.expertId === '__user__').length >= 2 && !isDiscussing && (
                          <button
                            onClick={() => {
                              // 직접 final 처리 트리거
                              handleFollowUp('__SIM_END__');
                            }}
                            className="text-[10px] text-slate-400 hover:text-red-500 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors ml-2"
                          >
                            종료
                          </button>
                        )}
                      </div>
                    </div>
                    {/* 대화 영역 */}
                    <div className="flex-1 p-5 space-y-2.5">
                      {messages.map((msg, idx) => {
                        if (msg.expertId === '__sim_briefing__') return null;
                        if (msg.expertId === '__sim_result__') {
                          let result: any = {};
                          try { result = JSON.parse(msg.content); } catch {}
                          const vList = result.verdicts || [];
                          return (
                            <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-3 duration-500 my-4">
                              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-md">
                                <div className="bg-slate-800 px-5 py-3 flex items-center gap-2">
                                  <span className="text-[16px]">{result.scenarioIcon}</span>
                                  <span className="text-[14px] font-bold text-white">시뮬레이션 결과</span>
                                </div>
                                <div className="bg-white p-4 space-y-2">
                                  {vList.map((v: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
                                      <span className="text-[12px] font-medium text-slate-700 flex items-center gap-1.5">
                                        <span className="text-[14px]">{v.roleIcon}</span> {v.roleName}
                                      </span>
                                      <span className="text-[12px] font-bold text-slate-800">{v.verdict}</span>
                                    </div>
                                  ))}
                                  <div className="pt-2 border-t border-slate-200 text-center">
                                    <span className="text-[10px] text-slate-400">{result.gaugeLabel}</span>
                                    <div className="text-[16px] font-bold text-slate-800 mt-0.5">{result.overallVerdict}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        if (msg.expertId === '__round__') {
                          return (
                            <div key={msg.id} className="flex justify-center py-2">
                              <span className="px-3 py-1 rounded-full bg-slate-100 text-[10px] text-slate-400 font-medium">{msg.content}</span>
                            </div>
                          );
                        }
                        if (msg.expertId === '__user__') {
                          return (
                            <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-400 flex justify-end mt-4">
                              <div className="max-w-[70%] bg-slate-100 rounded-2xl rounded-br-md px-4 py-2.5 text-[13px] text-slate-700 leading-relaxed">
                                <ReactMarkdownInline content={msg.content} />
                              </div>
                            </div>
                          );
                        }
                        if (msg.isSummary) {
                          const expert = allExperts.find(e => e.id === msg.expertId);
                          if (!expert) return null;
                          return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="default" />;
                        }
                        const expert = allExperts.find(e => e.id === msg.expertId);
                        if (!expert) return null;
                        // simRoleName 우선, 없으면 roleAssignments에서 찾기
                        const roleName = msg.simRoleName || Object.entries(stakeholderSettings.roleAssignments).find(([_, eid]) => eid === expert.id)?.[0];
                        const roleIcon = msg.simRoleIcon || scenario.roles.find(r => r.name === roleName)?.icon;
                        const roleIdx = roleName ? scenario.roles.findIndex(r => r.name === roleName) : -1;
                        const roleStyles = [
                          { iconBg: 'bg-blue-100', bubble: 'bg-blue-100/50 border-blue-200' },
                          { iconBg: 'bg-amber-100', bubble: 'bg-amber-100/50 border-amber-200' },
                          { iconBg: 'bg-emerald-100', bubble: 'bg-emerald-100/50 border-emerald-200' },
                          { iconBg: 'bg-violet-100', bubble: 'bg-violet-100/50 border-violet-200' },
                        ];
                        const style = roleIdx >= 0 ? roleStyles[roleIdx % roleStyles.length] : { iconBg: 'bg-slate-100', bubble: 'bg-slate-50 border-slate-100' };
                        const prevMsg = idx > 0 ? messages[idx - 1] : null;
                        const isContinuation = prevMsg && prevMsg.simRoleName === msg.simRoleName && msg.simRoleName && prevMsg.expertId !== '__user__' && prevMsg.expertId !== '__round__';
                        return (
                          <div key={msg.id} className={cn('animate-in fade-in slide-in-from-bottom-2 duration-400 flex items-start gap-2.5 max-w-[80%]', isContinuation ? 'mt-1' : 'mt-4')}>
                            {isContinuation ? (
                              <div className="w-9 shrink-0" />
                            ) : (
                              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-[16px] shrink-0 mt-0.5', style.iconBg)}>
                                {roleIcon || '🤖'}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              {!isContinuation && <span className="text-[11px] font-bold text-slate-600">{roleName || expert.nameKo}</span>}
                              <div className={cn('px-3.5 py-2.5 rounded-2xl rounded-tl-md border text-[13px] text-slate-700 leading-relaxed', style.bubble, !isContinuation && 'mt-1')}>
                                {msg.content ? <LazyMarkdown content={msg.content} fallback={<span>{msg.content}</span>} /> : (msg.isStreaming ? <span className="text-slate-400">...</span> : '')}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                // scenario 못 찾았을 때 fallback — simRoleName 기반으로 렌더링
                <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-6">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[calc(100vh-200px)] flex flex-col">
                    <div className="flex-1 p-5 space-y-2.5">
                      {messages.map((msg, idx) => {
                        if (msg.expertId === '__sim_briefing__' || msg.expertId === '__round__') {
                          if (msg.expertId === '__round__') return (
                            <div key={msg.id} className="flex justify-center py-2">
                              <span className="px-3 py-1 rounded-full bg-slate-100 text-[10px] text-slate-400 font-medium">{msg.content}</span>
                            </div>
                          );
                          return null;
                        }
                        if (msg.expertId === '__sim_result__') {
                          let result: any = {};
                          try { result = JSON.parse(msg.content); } catch {}
                          const vList = result.verdicts || [];
                          return (
                            <div key={msg.id} className="my-4">
                              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-md">
                                <div className="bg-slate-800 px-5 py-3"><span className="text-[14px] font-bold text-white">📋 시뮬레이션 결과</span></div>
                                <div className="bg-white p-4 space-y-2">
                                  {vList.map((v: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
                                      <span className="text-[12px] font-medium text-slate-700">{v.roleIcon} {v.roleName}</span>
                                      <span className="text-[12px] font-bold text-slate-800">{v.verdict}</span>
                                    </div>
                                  ))}
                                  {result.overallVerdict && <div className="pt-2 border-t text-center"><div className="text-[16px] font-bold">{result.overallVerdict}</div></div>}
                                </div>
                              </div>
                            </div>
                          );
                        }
                        if (msg.expertId === '__user__') {
                          return (
                            <div key={msg.id} className="flex justify-end mt-4">
                              <div className="max-w-[70%] bg-slate-100 rounded-2xl rounded-br-md px-4 py-2.5 text-[13px] text-slate-700 leading-relaxed">
                                <ReactMarkdownInline content={msg.content} />
                              </div>
                            </div>
                          );
                        }
                        if (msg.isSummary) {
                          const expert = allExperts.find(e => e.id === msg.expertId);
                          if (!expert) return null;
                          return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="default" />;
                        }
                        const expert = allExperts.find(e => e.id === msg.expertId);
                        if (!expert) return null;
                        const rName = msg.simRoleName;
                        const rIcon = msg.simRoleIcon;
                        const roleIdx = rName ? Math.abs([...rName].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)) % 4 : -1;
                        const roleStyles = [
                          { iconBg: 'bg-blue-100', bubble: 'bg-blue-100/50 border-blue-200' },
                          { iconBg: 'bg-amber-100', bubble: 'bg-amber-100/50 border-amber-200' },
                          { iconBg: 'bg-emerald-100', bubble: 'bg-emerald-100/50 border-emerald-200' },
                          { iconBg: 'bg-violet-100', bubble: 'bg-violet-100/50 border-violet-200' },
                        ];
                        const style = roleIdx >= 0 ? roleStyles[roleIdx] : { iconBg: 'bg-slate-100', bubble: 'bg-slate-50 border-slate-200' };
                        const prevMsg = idx > 0 ? messages[idx - 1] : null;
                        const isContinuation = prevMsg && prevMsg.simRoleName === msg.simRoleName && msg.simRoleName && prevMsg.expertId !== '__user__';
                        return (
                          <div key={msg.id} className={cn('flex items-start gap-2.5 max-w-[80%]', isContinuation ? 'mt-1' : 'mt-4')}>
                            {isContinuation ? <div className="w-9 shrink-0" /> : (
                              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-[16px] shrink-0 mt-0.5', style.iconBg)}>{rIcon || '🤖'}</div>
                            )}
                            <div className="min-w-0 flex-1">
                              {!isContinuation && <span className="text-[11px] font-bold text-slate-600">{rName || expert.nameKo}</span>}
                              <div className={cn('px-3.5 py-2.5 rounded-2xl rounded-tl-md border text-[13px] text-slate-700 leading-relaxed', style.bubble, !isContinuation && 'mt-1')}>
                                {msg.content ? <LazyMarkdown content={msg.content} fallback={<span>{msg.content}</span>} /> : ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className={cn(
              'mx-auto px-4 sm:px-6 pt-16 pb-6',
              !selectable && discussionMode === 'stakeholder' ? 'hidden'
                : !selectable ? 'max-w-3xl space-y-2.5'
                : (discussionMode === 'assistant' || discussionMode === 'expert' || discussionMode === 'stakeholder') ? 'max-w-4xl space-y-3'
                : (discussionMode === 'multi' && messages.length > 0) ? 'max-w-[960px] space-y-3'
                : 'max-w-2xl space-y-3'
            )}>

              {selectable && (
                <Suspense fallback={null}>
                  <LazyExpertSelectionPanel
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
                    stakeholderSettings={stakeholderSettings}
                    onStakeholderSettingsChange={setStakeholderSettings}
                  />
                </Suspense>
              )}

              {/* Game Player — 게임 전용 UI */}
              {activeGame && discussionMode === 'player' && (
                <div className="animate-in fade-in zoom-in-95 duration-500 ease-out fill-mode-both">
                  <Suspense fallback={null}>
                    <LazyGamePlayer
                      gameId={activeGame.id}
                      gameOption={activeGame.option}
                      optionLabel={activeGame.label}
                      messages={messages}
                      onSendMessage={(msg) => handleFollowUp(msg)}
                      onExit={() => { setActiveGame(null); handleNewDiscussion(); }}
                      isDiscussing={isDiscussing}
                    />
                  </Suspense>
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

              {/* 브레인스토밍 주제 구체화 — 전용 플로팅 모달 */}
              {bsClarify?.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
                    {/* 헤더 — 브레인스토밍 테마 */}
                    <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-3.5 flex items-center gap-3">
                      <span className="text-[24px]">💡</span>
                      <div>
                        <h3 className="text-[15px] font-bold text-white">브레인스토밍 세션 준비</h3>
                        <p className="text-[11px] text-white/70">{bsClarify.message}</p>
                      </div>
                    </div>

                    {/* 원래 주제 */}
                    <div className="px-5 pt-4 pb-2">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">입력한 주제</span>
                      <p className="text-[14px] font-medium text-slate-700 mt-1">{bsClarify.originalQuestion}</p>
                    </div>

                    {/* 질문들 */}
                    <div className="px-5 py-3 space-y-4">
                      {bsClarify.questions.map(q => (
                        <div key={q.id}>
                          <p className="text-[13px] font-semibold text-slate-700 mb-2">{q.question}</p>
                          <div className="flex flex-wrap gap-2">
                            {q.options.filter(o => o.value !== '__custom__').map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => {
                                  const newSelections = { ...bsClarify.selections, [q.id]: opt.value };
                                  setBsClarify({ ...bsClarify, selections: newSelections });
                                }}
                                className={cn(
                                  "px-3.5 py-2 rounded-xl text-[12px] font-medium border transition-all",
                                  bsClarify.selections[q.id] === opt.value
                                    ? "bg-amber-500 text-white border-amber-500 shadow-md"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:bg-amber-50"
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 하단 버튼 */}
                    <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => { setBsClarify(null); skipClarifyRef.current = true; runDiscussion(bsClarify.originalQuestion); }}
                        className="text-[12px] text-slate-400 hover:text-slate-600 font-medium transition-colors"
                      >
                        건너뛰기
                      </button>
                      <button
                        onClick={() => {
                          const answers = bsClarify.questions.map(q => {
                            const sel = bsClarify.selections[q.id];
                            const opt = q.options.find(o => o.value === sel);
                            return opt ? opt.label : sel || '';
                          }).filter(Boolean);
                          const enriched = answers.length > 0
                            ? `${bsClarify.originalQuestion} (${answers.join(', ')})`
                            : bsClarify.originalQuestion;
                          setBsClarify(null);
                          skipClarifyRef.current = true;
                          runDiscussion(enriched);
                        }}
                        disabled={Object.keys(bsClarify.selections).length === 0}
                        className={cn(
                          "px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all",
                          Object.keys(bsClarify.selections).length > 0
                            ? "bg-amber-500 text-white hover:bg-amber-600 shadow-md"
                            : "bg-slate-100 text-slate-300 cursor-not-allowed"
                        )}
                      >
                        세션 시작 →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Simulation prep modal */}
              {simPrepModal?.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-300">
                    <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-3.5 flex items-center gap-3">
                      <span className="text-[24px]">{simPrepModal.scenario.icon}</span>
                      <div>
                        <h3 className="text-[15px] font-bold text-white">{simPrepModal.scenario.name} 준비</h3>
                        <p className="text-[11px] text-white/70">시뮬레이션 전에 상황을 설정합니다</p>
                      </div>
                    </div>
                    <div className="px-5 py-4 space-y-4">
                      <div className="text-[11px] text-slate-500">
                        당신의 역할: <span className="font-semibold text-slate-700">{simPrepModal.scenario.userRole}</span>
                      </div>
                      {simPrepModal.scenario.prepQuestions.map(q => (
                        <div key={q.id}>
                          <p className="text-[13px] font-semibold text-slate-700 mb-2">{q.question}</p>
                          <div className="flex flex-wrap gap-2">
                            {q.options.map(opt => (
                              <button key={opt.value}
                                onClick={() => setSimPrepModal(prev => prev ? {...prev, answers: {...prev.answers, [q.id]: opt.value}} : null)}
                                className={cn("px-3.5 py-2 rounded-xl text-[12px] font-medium border transition-all",
                                  simPrepModal.answers[q.id] === opt.value
                                    ? "bg-slate-800 text-white border-slate-800"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                                )}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-5 py-4 border-t flex justify-between">
                      <button onClick={() => { setSimPrepModal(null); }} className="text-[12px] text-slate-400 hover:text-slate-600 font-medium transition-colors">취소</button>
                      <button
                        onClick={() => {
                          const answers = simPrepModal.answers;
                          const q = simPrepModal.originalQuestion;
                          setStakeholderSettings(prev => ({...prev, prepAnswers: answers}));
                          setSimPrepModal(null);
                          pendingSimQuestionRef.current = q;
                          setSimPrepDone(prev => prev + 1);
                        }}
                        disabled={Object.keys(simPrepModal.answers).length < simPrepModal.scenario.prepQuestions.length}
                        className={cn("px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all",
                          Object.keys(simPrepModal.answers).length >= simPrepModal.scenario.prepQuestions.length
                            ? "bg-slate-800 text-white hover:bg-slate-900 shadow-md" : "bg-slate-100 text-slate-300 cursor-not-allowed"
                        )}>
                        시뮬레이션 시작
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
              {!activeGame && currentQuestion && messages.length > 0 && discussionMode !== 'procon' && discussionMode !== 'standard' && discussionMode !== 'multi' && discussionMode !== 'stakeholder' && (
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
                      <span className="text-[12px] font-medium text-slate-300">{proconDebateTopic || currentQuestion}</span>
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
                          {currentQuestion && (
                            <div className="flex justify-end">
                              <div className="max-w-[75%] bg-indigo-500 text-white rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm">
                                <p className="text-[13px] leading-relaxed line-clamp-3">{currentQuestion}</p>
                              </div>
                            </div>
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

                      {/* ── Layer 1: Overview — 각 AI별 모든 응답 카드 쌓기 ── */}
                      {multiView === 'overview' && (
                        <div className={cn('grid gap-3 items-start', sortedExperts.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
                          {sortedExperts.map((expert, ei) => {
                            const allMsgs = getExpertAllMsgs(expert.id);
                            if (!allMsgs.length) return null;
                            const gradients = [
                              'from-blue-400 to-blue-500', 'from-emerald-400 to-emerald-500',
                              'from-violet-400 to-violet-500', 'from-amber-400 to-amber-500',
                              'from-rose-400 to-rose-500', 'from-cyan-400 to-cyan-500'
                            ];
                            const gradient = gradients[ei % gradients.length];
                            return (
                              <div key={expert.id} className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                                {/* 헤더 */}
                                <button type="button"
                                  onClick={() => { setMultiActiveTab(expert.id); if (!isDiscussing) setMultiView('detail'); }}
                                  className={cn('w-full flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r text-white hover:brightness-110 transition-all', gradient)}>
                                  <ExpertAvatar expert={expert} size="xs" active={allMsgs.some(m => m.isStreaming)} />
                                  <div className="flex-1 min-w-0 text-left">
                                    <span className="text-[12px] font-bold">{expert.nameKo}</span>
                                    <span className="text-[9px] text-white/60 ml-1.5">{allMsgs.length > 1 ? `${allMsgs.length}개 답변` : expert.description}</span>
                                  </div>
                                  {allMsgs.some(m => m.isStreaming) && <span className="flex gap-0.5"><span className="typing-dot w-1.5 h-1.5 rounded-full bg-white/60" /><span className="typing-dot w-1.5 h-1.5 rounded-full bg-white/60" /><span className="typing-dot w-1.5 h-1.5 rounded-full bg-white/60" /></span>}
                                </button>
                                {/* 응답 카드들 — 질문+답변 쌓임 */}
                                <div className="divide-y divide-slate-100">
                                  {allMsgs.map((msg, mi) => {
                                    const preview = msg.content.slice(0, 200);
                                    // 이 답변 직전의 유저 질문 찾기
                                    const msgIdx = messages.findIndex(m => m.id === msg.id);
                                    let questionText = '';
                                    if (mi > 0 && msgIdx > 0) {
                                      for (let i = msgIdx - 1; i >= 0; i--) {
                                        if (messages[i].expertId === '__user__') {
                                          questionText = messages[i].content.replace(/^💬\s*\S+에게:\s*/, '');
                                          break;
                                        }
                                      }
                                    }
                                    return (
                                      <div key={msg.id}>
                                        {mi > 0 && (
                                          <div className="mx-3 border-t border-slate-300 dark:border-slate-600" />
                                        )}
                                        <button type="button"
                                          onClick={() => { setMultiActiveTab(expert.id); setMultiView('detail'); setTimeout(() => document.getElementById(msg.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }}
                                          className="w-full px-4 py-2.5 text-[12px] leading-relaxed text-slate-600 text-left hover:bg-slate-50 transition-colors">
                                          {mi > 0 && questionText && (
                                            <p className="text-[10px] text-indigo-400 font-medium mb-1.5 truncate">💬 "{questionText}"</p>
                                          )}
                                          <div className="line-clamp-5">
                                            {preview || (msg.isStreaming ? '응답 생성 중...' : '')}
                                            {msg.content.length > 200 && <span className="text-slate-300">...</span>}
                                          </div>
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                                {/* 푸터 */}
                                {!allMsgs.some(m => m.isStreaming) && (
                                  <button type="button"
                                    onClick={() => { setMultiActiveTab(expert.id); setMultiView('detail'); }}
                                    className="w-full px-4 py-2 text-left border-t border-slate-100 hover:bg-slate-50 transition-colors">
                                    <span className="text-[10px] font-semibold text-indigo-500">자세히 보기 →</span>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* ── Layer 2: Detail — AI 컬러 연동 ── */}
                      {multiView === 'detail' && (() => {
                        const activeMsgs = getExpertAllMsgs(activeTab || '');
                        const activeExp = allExperts.find(e => e.id === activeTab);
                        if (!activeMsgs.length || !activeExp) return null;
                        // 각 답변 직전의 유저 메시지를 찾기
                        const getQuestionBefore = (msgId: string) => {
                          const idx = messages.findIndex(m => m.id === msgId);
                          if (idx <= 0) return null;
                          for (let i = idx - 1; i >= 0; i--) {
                            if (messages[i].expertId === '__user__') return messages[i];
                          }
                          return null;
                        };
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
                                <div key={msg.id} id={msg.id}>
                                  {i > 0 && (() => {
                                    const q = getQuestionBefore(msg.id);
                                    if (!q) return null;
                                    const text = q.content.replace(/^💬\s*\S+에게:\s*/, '');
                                    return (
                                      <div className="flex justify-end mb-2">
                                        <div className="max-w-[70%] bg-indigo-500 text-white rounded-2xl rounded-br-md px-3.5 py-2 text-[12px]">
                                          {text}
                                        </div>
                                      </div>
                                    );
                                  })()}
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
                      const fwIconMap: Record<string, string> = {
                        free: '💡', swot: '📊', sixhats: '🎩', scamper: '🔧', pmi: '⚖️',
                        fivewhys: '🔍', moonshot: '🚀', designthinking: '🎨', starbursting: '⭐', reversal: '🔄',
                      };
                      const fwIcon = fwIconMap[p.framework] || '💡';
                      const completedCount = p.completedExperts?.length || 0;
                      const totalExperts = p.experts?.length || 0;
                      const isLastStep = p.currentStep >= p.totalSteps - 1;
                      const phaseDescription = isLastStep
                        ? '전문가들의 아이디어를 종합 정리하고 있습니다'
                        : completedCount > 0 && completedCount < totalExperts
                          ? `전문가들이 아이디어를 발산하고 있습니다 (${completedCount}/${totalExperts}명 완료)`
                          : '전문가들이 아이디어를 발산하고 있습니다';
                      return (
                        <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-500">
                          {/* 프레임워크 아이콘 */}
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[28px] shadow-lg mb-6 animate-pulse">
                            {fwIcon}
                          </div>

                          {/* 프레임워크 이름 + 단계 */}
                          <h3 className="text-[16px] font-bold text-slate-800 mb-1">{p.frameworkName}</h3>
                          <p className="text-[13px] text-violet-600 font-medium mb-2">{p.stepLabel}</p>
                          <p className="text-[12px] text-slate-500 mb-6">{isLastStep ? '📋' : `${fwIcon}`} {phaseDescription}</p>

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
              ) : discussionMode === 'freetalk' ? (
                /* Freetalk: KakaoTalk-style chat bubbles */
                <div className="space-y-2">
                  {messages.map((msg) => {
                    // Round separator
                    if (msg.expertId === '__round__') {
                      return (
                        <div key={msg.id} className="flex justify-center py-2">
                          <span className="px-3 py-1 rounded-full bg-slate-100 text-[10px] text-slate-400 font-medium">{msg.content}</span>
                        </div>
                      );
                    }
                    // Summary card
                    if (msg.isSummary) {
                      const expert = allExperts.find(e => e.id === msg.expertId);
                      if (!expert) return null;
                      return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="default" />;
                    }
                    // User message
                    if (msg.expertId === '__user__') {
                      return (
                        <div key={msg.id} className="flex justify-end">
                          <div className="max-w-[70%] bg-indigo-500 text-white rounded-2xl rounded-br-md px-3.5 py-2 text-[13px] shadow-sm">
                            <ReactMarkdownInline content={msg.content} />
                          </div>
                        </div>
                      );
                    }
                    // Skip system IDs
                    if (msg.expertId === '__summary__' || msg.expertId === '__ppt_download__') return null;
                    // AI chat bubble
                    const expert = allExperts.find(e => e.id === msg.expertId);
                    if (!expert) return null;
                    const bubbleColorMap: Record<string, { bg: string; border: string; name: string }> = {
                      gpt: { bg: 'bg-blue-50', border: 'border-blue-200', name: 'text-blue-600' },
                      claude: { bg: 'bg-violet-50', border: 'border-violet-200', name: 'text-violet-600' },
                      gemini: { bg: 'bg-emerald-50', border: 'border-emerald-200', name: 'text-emerald-600' },
                      perplexity: { bg: 'bg-cyan-50', border: 'border-cyan-200', name: 'text-cyan-600' },
                      grok: { bg: 'bg-orange-50', border: 'border-orange-200', name: 'text-orange-600' },
                      deepseek: { bg: 'bg-indigo-50', border: 'border-indigo-200', name: 'text-indigo-600' },
                      qwen: { bg: 'bg-teal-50', border: 'border-teal-200', name: 'text-teal-600' },
                    };
                    // Hash-based color for non-AI-model experts
                    const hashColors = [
                      { bg: 'bg-rose-50', border: 'border-rose-200', name: 'text-rose-600' },
                      { bg: 'bg-amber-50', border: 'border-amber-200', name: 'text-amber-600' },
                      { bg: 'bg-lime-50', border: 'border-lime-200', name: 'text-lime-600' },
                      { bg: 'bg-sky-50', border: 'border-sky-200', name: 'text-sky-600' },
                      { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', name: 'text-fuchsia-600' },
                      { bg: 'bg-pink-50', border: 'border-pink-200', name: 'text-pink-600' },
                      { bg: 'bg-emerald-50', border: 'border-emerald-200', name: 'text-emerald-600' },
                      { bg: 'bg-violet-50', border: 'border-violet-200', name: 'text-violet-600' },
                    ];
                    const getBubbleStyle = (id: string) => {
                      if (bubbleColorMap[id]) return bubbleColorMap[id];
                      let hash = 0;
                      for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
                      return hashColors[Math.abs(hash) % hashColors.length];
                    };
                    const bStyle = getBubbleStyle(expert.id);
                    return (
                      <div key={msg.id} className="flex items-start gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
                        <ExpertAvatar expert={expert} size="sm" active={msg.isStreaming} />
                        <div className="max-w-[70%]">
                          <span className={cn('text-[10px] font-semibold', bStyle.name)}>{expert.nameKo}</span>
                          <div className={cn('mt-0.5 px-3 py-2 rounded-2xl rounded-tl-md border text-[13px] text-slate-700 leading-relaxed', bStyle.bg, bStyle.border)}>
                            {msg.content || (msg.isStreaming ? <span className="text-slate-400">...</span> : '')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : activeGame ? null : (
                /* All other modes: sequential */
                messages.map((msg, idx) => {
                  // 시뮬레이션 브리핑 — 헤더로 이동, 렌더링 스킵
                  if (msg.expertId === '__sim_briefing__') return null;
                  // 대화 요약 카드
                  if (msg.expertId === '__summary__') {
                    return (
                      <div key={msg.id} className="my-4 ml-[4%] mr-[8%] animate-in fade-in slide-in-from-bottom-2 duration-400">
                        <div className="rounded-2xl overflow-hidden shadow-lg border border-emerald-200/60 dark:border-emerald-800/40">
                          {/* 헤더 */}
                          <div className="flex items-center justify-between px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-white/80" />
                              <span className="text-[14px] font-bold text-white">대화 요약</span>
                            </div>
                            <button onClick={() => { navigator.clipboard.writeText(msg.content); }} className="px-2.5 py-1 rounded-md text-[10px] font-medium text-white/60 hover:text-white hover:bg-white/15 transition-colors">
                              복사
                            </button>
                          </div>
                          {/* 본문 — 섹션별 구분 */}
                          <div className="bg-emerald-50/50 dark:bg-slate-900 px-5 py-4">
                            <div className="text-[12.5px] leading-[1.7] text-slate-700 dark:text-slate-300 [&_h2]:text-[13px] [&_h2]:font-bold [&_h2]:text-slate-800 [&_h2]:dark:text-slate-200 [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2:first-child]:mt-0 [&_ul]:pl-4 [&_ul]:space-y-1 [&_li]:text-[12px] [&_p]:mb-1">
                              <LazyMarkdown content={msg.content} fallback={<span>{msg.content}</span>} />
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
                          onClick={() => {
                            void (async () => {
                              const pptTools = await loadPptGenerator();
                              await pptTools.generatePpt(pptData!, `presentation-${Date.now()}.pptx`);
                            })();
                          }}
                          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-[13px] shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                        >
                          <span className="text-[18px]">📊</span>
                          PPT 다운로드 ({pptData.slides?.length || 0}장)
                        </button>
                      </div>
                    );
                  }
                  // AI vs User judgment card
                  if (msg.expertId === '__avsu_judge__') {
                    try {
                      const j = JSON.parse(msg.content);
                      const isFinalJudge = j.type === '__avsu_final__';
                      const userTotal = j.user_score?.total || 0;
                      const aiTotal = j.ai_score?.total || 0;
                      const maxScore = 50;
                      const userPct = Math.round((userTotal / maxScore) * 100);
                      const aiPct = Math.round((aiTotal / maxScore) * 100);
                      const winnerEmoji = j.round_winner === 'user' ? '🏆' : j.round_winner === 'ai' ? '💀' : '🤝';
                      const winnerText = j.round_winner === 'user' ? '유저 우세' : j.round_winner === 'ai' ? 'AI 우세' : '무승부';

                      if (isFinalJudge) {
                        const fw = j.final_winner === 'user' ? '🏆 유저 승리!' : j.final_winner === 'ai' ? '💀 AI 승리' : '🤝 무승부';
                        return (
                          <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-3 duration-500">
                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-xl border border-slate-700">
                              <div className="text-center mb-4">
                                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">최종 판정</div>
                                <div className="text-2xl font-black">{fw}</div>
                              </div>
                              <div className="flex items-center justify-center gap-6 mb-4">
                                <div className="text-center">
                                  <div className="text-[10px] text-slate-400">유저</div>
                                  <div className="text-2xl font-bold text-blue-400">{j.final_score?.user || userTotal}</div>
                                </div>
                                <div className="text-slate-500 text-lg">vs</div>
                                <div className="text-center">
                                  <div className="text-[10px] text-slate-400">AI</div>
                                  <div className="text-2xl font-bold text-red-400">{j.final_score?.ai || aiTotal}</div>
                                </div>
                              </div>
                              {j.overall_comment && <p className="text-[12px] text-slate-300 text-center mb-3 leading-relaxed">{j.overall_comment}</p>}
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                {j.user_strengths?.length > 0 && (
                                  <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                                    <div className="text-[10px] font-bold text-blue-400 mb-1.5">💪 강점</div>
                                    {j.user_strengths.map((s: string, i: number) => <div key={i} className="text-[11px] text-blue-200">• {s}</div>)}
                                  </div>
                                )}
                                {j.user_improvements?.length > 0 && (
                                  <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                                    <div className="text-[10px] font-bold text-amber-400 mb-1.5">📝 개선점</div>
                                    {j.user_improvements.map((s: string, i: number) => <div key={i} className="text-[11px] text-amber-200">• {s}</div>)}
                                  </div>
                                )}
                              </div>
                              {j.mvp_moment && (
                                <div className="mt-3 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                                  <span className="text-[10px] text-yellow-400 font-bold">⭐ MVP 순간</span>
                                  <p className="text-[11px] text-slate-300 mt-0.5">{j.mvp_moment}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Round judgment card
                      return (
                        <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">⚖️ {j.round || ''}라운드 판정</span>
                              <span className="text-[12px] font-bold">{winnerEmoji} {winnerText}</span>
                            </div>
                            <div className="space-y-1.5 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 w-8 shrink-0">유저</span>
                                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                  <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{width: `${userPct}%`}} />
                                </div>
                                <span className="text-[11px] font-bold text-slate-700 w-12 text-right">{userTotal}/50</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 w-8 shrink-0">AI</span>
                                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                  <div className="bg-red-500 h-full rounded-full transition-all duration-500" style={{width: `${aiPct}%`}} />
                                </div>
                                <span className="text-[11px] font-bold text-slate-700 w-12 text-right">{aiTotal}/50</span>
                              </div>
                            </div>
                            {j.comment && <p className="text-[11px] text-slate-600 leading-relaxed">💬 {j.comment}</p>}
                            {j.user_feedback && <p className="text-[10px] text-indigo-600 mt-1.5 bg-indigo-50 rounded-lg px-2.5 py-1.5">📌 {j.user_feedback}</p>}
                          </div>
                        </div>
                      );
                    } catch {
                      return null;
                    }
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
                    // AI vs User / Stakeholder: 유저 메시지 — 오른쪽
                    if (discussionMode === 'stakeholder' || discussionMode === 'aivsuser') {
                      return (
                        <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-400 flex justify-end">
                          <div className="max-w-[70%] bg-white border border-slate-200 rounded-2xl rounded-br-md px-4 py-2.5 text-[13px] text-slate-700 leading-relaxed shadow-sm">
                            <ReactMarkdownInline content={msg.content} />
                          </div>
                        </div>
                      );
                    }
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

                  // Stakeholder mode: 역할별 메시지 (simRoleName 기반 — 히스토리 복원 시에도 작동)
                  if (discussionMode === 'stakeholder' && (msg.simRoleName || stakeholderSettings.scenarioId)) {
                    const simScenario = SIMULATION_SCENARIOS.find(s => s.id === stakeholderSettings.scenarioId);
                    {
                      const rName = msg.simRoleName || (simScenario ? Object.entries(stakeholderSettings.roleAssignments).find(([_, eid]) => eid === expert.id)?.[0] : undefined);
                      const rIcon = msg.simRoleIcon || (simScenario ? simScenario.roles.find(r => r.name === rName)?.icon : undefined);
                      // 역할 이름 해시로 안정적 색상 인덱스
                      const roleIdx = rName ? Math.abs([...rName].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)) % 4 : -1;
                      const roleStyles = [
                        { iconBg: 'bg-blue-100', name: 'text-blue-700', bubble: 'bg-blue-50 border-blue-100' },
                        { iconBg: 'bg-amber-100', name: 'text-amber-700', bubble: 'bg-amber-50 border-amber-100' },
                        { iconBg: 'bg-emerald-100', name: 'text-emerald-700', bubble: 'bg-emerald-50 border-emerald-100' },
                        { iconBg: 'bg-violet-100', name: 'text-violet-700', bubble: 'bg-violet-50 border-violet-100' },
                      ];
                      const style = roleIdx >= 0 ? roleStyles[roleIdx % roleStyles.length] : { iconBg: 'bg-slate-100', name: 'text-slate-700', bubble: 'bg-slate-50 border-slate-100' };
                      const prevMsg = idx > 0 ? messages[idx - 1] : null;
                      const isContinuation = prevMsg && prevMsg.expertId === msg.expertId && prevMsg.simRoleName === msg.simRoleName && prevMsg.expertId !== '__user__' && prevMsg.expertId !== '__round__';
                      return (
                        <div key={msg.id} className={cn('animate-in fade-in slide-in-from-bottom-2 duration-400 flex items-start gap-2.5 max-w-[80%]', isContinuation ? 'mt-1' : 'mt-4')}>
                          {isContinuation ? (
                            <div className="w-9 shrink-0" />
                          ) : (
                            <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-[16px] shrink-0 mt-0.5', style.iconBg)}>
                              {rIcon || '🤖'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            {!isContinuation && <span className={cn('text-[11px] font-bold', style.name)}>{rName || expert.nameKo}</span>}
                            <div className={cn('px-3.5 py-2.5 rounded-2xl rounded-tl-md border text-[13px] text-slate-700 leading-relaxed', style.bubble, !isContinuation && 'mt-1')}>
                              {msg.content ? <LazyMarkdown content={msg.content} fallback={<span>{msg.content}</span>} /> : (msg.isStreaming ? <span className="text-slate-400">...</span> : '')}
                            </div>
                          </div>
                        </div>
                      );
                    }}

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
              <div className={cn("mx-auto px-4 sm:px-6 py-2.5 pb-4 space-y-2", (discussionMode === 'multi' && messages.length > 0) || discussionMode === 'stakeholder' ? 'max-w-3xl' : 'max-w-2xl')}>
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
                <Suspense fallback={null}>
                  <LazyQuestionInput
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
                    disabled={isDiscussing || (discussionMode !== 'stakeholder' && discussionMode !== 'aivsuser' && activeExperts.length < 1) || (discussionMode === 'multi' && messages.length === 0 && activeExperts.length < 2)}
                    discussionMode={discussionMode}
                    onToggleSettings={() => setShowDebateSettings((prev) => !prev)}
                    showSettings={showDebateSettings}
                    isFollowUp={isDone}
                    onConclusion={discussionMode === 'aivsuser' && messages.length > 2 && !isDiscussing ? () => handleFollowUp('__AVSU_END__') : undefined}
                    onSummarize={discussionMode === 'general' ? handleSummarize : undefined}
                    isSummarizing={isSummarizing}
                    messageCount={messages.filter(m => m.expertId !== '__user__' && m.expertId !== '__summary__' && m.expertId !== '__round__' && m.expertId !== '__brainstorm_progress__').length}
                    externalValue={sampleQuestionValue}
                    onExternalValueConsumed={() => setSampleQuestionValue('')}
                  />
                </Suspense>
              </div>
            </div>
          )}
        </div>
      </div>
      <Suspense fallback={null}>
        <LazyPomodoroTimer />
      </Suspense>
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
