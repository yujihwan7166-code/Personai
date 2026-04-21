import { lazy, Suspense, useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { cn } from '@/lib/utils';
import { chatToMarkdown, downloadMarkdown, copyToClipboard, safeFilename } from '@/lib/chatExport';
import { SUMMARIZER_EXPERT, CONCLUSION_EXPERT, DiscussionMessage, DiscussionRound, DiscussionMode, Expert, ROUND_LABELS, getMainMode, DebateSettings, DEFAULT_DEBATE_SETTINGS, ThinkingFramework, DiscussionIssue, THINKING_FRAMEWORKS, SIMULATION_SCENARIOS, SimulationScenario, StakeholderSettings, DEFAULT_STAKEHOLDER_SETTINGS, AivsBattleDraft, ActiveAivsBattleConfig, AIVS_USER_TOPIC_PRESETS, BATTLE_AI_CHARACTERS, ASSISTANT_EXPERTS, findAssistantCardById, type PremiumDomainId, type ApiSourceCitation } from '@/types/expert';
import { ExpertAvatar } from '@/components/ExpertAvatar';
import { DiscussionMessageCard } from '@/components/DiscussionMessage';
import { LazyMarkdown } from '@/components/LazyMarkdown';
import { PptDownloadCard } from '@/components/PptDownloadCard';
import { SummaryMessageCard } from '@/components/SummaryMessageCard';
// RightMemoSidebar removed
import { stripSpeakerPrefix } from '@/lib/messageContent';
import { buildExpertWithPrompt, getExpertPrompt } from '@/lib/expertPromptLoader';
import { runAutoAgentTurn } from '@/lib/autoAgentTurn';
import { createStreamExpert, fetchSearchContext, type PreSearchContext, type StreamExpertFn } from '@/lib/chatStream';
import { isManagedAutoAgent } from '@/lib/aiAgent';
import { buildAgentResponsePrompt } from '@/lib/prompts/agentResponsePrompt';
import { getDefaultProgress, type ResponseProgress } from '@/lib/responseProgress';
import type { AttachedFile } from '@/lib/fileProcessor';
import { buildGeneralImageHistory, mockRoute, pickGeneralImageExpert, type GeneralImageHistoryMessage } from '@/lib/indexPageHelpers';
import { getDiscussionChatVariant } from '@/lib/indexPage/chatVariant';
import { createStreamingMessage, progressFields } from '@/lib/indexPage/messageHelpers';
import { buildMultiResponsePlan } from '@/lib/indexPage/multiPlan';
import {
  createGeneratedImageThumbnail,
  detectGeneralImageAspectRatio,
  detectGeneralImageIntent,
  findLatestGeneratedImage,
  isImageMimeType,
  stripDataUrlPrefix,
  type GeneralImageIntent,
} from '@/lib/generalImage';
import { Copy, Check, RefreshCw, ChevronDown, ChevronRight, ArrowDown, ArrowRight, ArrowLeft, X, MessageSquare } from 'lucide-react';
import type { ChatVariant } from '@/components/DiscussionMessage';
import { Button } from '@/components/ui/button';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAssistantSelectionState } from '@/hooks/useAssistantSelectionState';
import { useAssistantRun } from '@/hooks/useAssistantRun';
import { useDiscussionHistoryPersistence } from '@/hooks/useDiscussionHistoryPersistence';
import { usePersistedExpertState } from '@/hooks/usePersistedExpertState';
import { AUTO_AGENT_CONFIG } from '@/utils/agent/config';
import { inferAgentIntent } from '@/utils/agent/agentDisplay';

const CHAT_URL = '/api/chat';
const GENERAL_IMAGE_URL = '/api/general-image';
const GENERAL_IMAGE_MODEL = 'google/gemini-2.5-flash-image';
const LazyAppSidebar = lazy(() => import('@/components/AppSidebar').then((module) => ({ default: module.AppSidebar })));
const LazyCommandPalette = lazy(() => import('@/components/CommandPalette').then((module) => ({ default: module.CommandPalette })));
const LazyExpertSelectionPanel = lazy(() => import('@/components/ExpertSelectionPanel').then((module) => ({ default: module.ExpertSelectionPanel })));
const LazyGamePlayer = lazy(() => import('@/components/GamePlayer').then((module) => ({ default: module.GamePlayer })));
const LazyQuestionInput = lazy(() => import('@/components/QuestionInput').then((module) => ({ default: module.QuestionInput })));
const LazyPremiumConsultChat = lazy(() => import('@/components/PremiumConsultChat').then((module) => ({ default: module.PremiumConsultChat })));
const LazyDeepResearchChat = lazy(() => import('@/components/DeepResearchChat').then((module) => ({ default: module.DeepResearchChat })));
const LazyTranslateChat = lazy(() => import('@/components/TranslateChat').then((module) => ({ default: module.TranslateChat })));
const LazyFileConvertChat = lazy(() => import('@/components/FileConvertChat').then((module) => ({ default: module.FileConvertChat })));
const LazyStudyWorkspace = lazy(() => import('@/components/study/StudyWorkspace').then((module) => ({ default: module.StudyWorkspace })));
let pptGeneratorPromise: Promise<typeof import('@/lib/pptGenerator')> | null = null;
let questionClassifierPromise: Promise<typeof import('@/utils/agent/questionClassifier')> | null = null;
let agentPipelinePromise: Promise<typeof import('@/utils/agent/agentPipeline')> | null = null;

type GeneralImageRequestFile = {
  name: string;
  mimeType: string;
  base64: string;
  extractedText?: string;
};

type GeneralImageApiResponse = {
  mode: GeneralImageIntent;
  text?: string;
  images?: Array<{
    mimeType: string;
    data: string;
  }>;
  aspectRatio?: string;
  sourceModel?: string;
  error?: string;
};

async function loadPptGenerator() {
  if (!pptGeneratorPromise) {
    pptGeneratorPromise = import('@/lib/pptGenerator');
  }

  return pptGeneratorPromise;
}

async function loadQuestionClassifier() {
  if (!questionClassifierPromise) {
    questionClassifierPromise = import('@/utils/agent/questionClassifier');
  }

  return questionClassifierPromise;
}

async function loadAgentPipeline() {
  if (!agentPipelinePromise) {
    agentPipelinePromise = import('@/utils/agent/agentPipeline');
  }

  return agentPipelinePromise;
}

// Timing constants
const DELAY_BETWEEN_EXPERTS = 300; // ms between expert responses
const DELAY_BETWEEN_ROUNDS = 500; // ms between debate rounds
const DELAY_ROUTER_ANALYSIS = 1200; // ms for router analysis animation
const DELAY_ROUTER_TRANSITION = 400; // ms for router to expert transition
const DELAY_PROCON_START = 500; // ms before procon debate starts


const streamExpert: StreamExpertFn = createStreamExpert({
  chatUrl: CHAT_URL,
  safetyGuardrail: '',
  qualityGuardrail: '',
});

const Index = () => {
  const { user } = useAuth();
  const { experts, setExperts, selectedExpertIds, setSelectedExpertIds } = usePersistedExpertState();
  const { selectedAssistantCardId, selectedAssistantCardRef, setSelectedAssistantCard } = useAssistantSelectionState();
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [activeExpertId, setActiveExpertId] = useState<string | undefined>();
  const [isDiscussing, setIsDiscussing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentQuestionDisplay, setCurrentQuestionDisplay] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [discussionMode, setDiscussionMode] = useState<DiscussionMode>('general');
  const [researchInitialQuestion, setResearchInitialQuestion] = useState<string | null>(null);
  const [proconStances, setProconStances] = useState<Record<string, 'pro' | 'con'>>({});
  const [proconDebateTopic, setProconDebateTopic] = useState('');
  const [debateSettings, setDebateSettings] = useState<DebateSettings>(DEFAULT_DEBATE_SETTINGS);
  const [showDebateSettings, setShowDebateSettings] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState<ThinkingFramework | null>(null);
  const [discussionIssues, setDiscussionIssues] = useState<DiscussionIssue[]>([]);
  const [stakeholderSettings, setStakeholderSettings] = useState<StakeholderSettings>(DEFAULT_STAKEHOLDER_SETTINGS);
  const [simChoices, setSimChoices] = useState<{label: string; description: string}[]>([]);
  const [simPhaseIndex, setSimPhaseIndex] = useState(0);
  // AI vs User debate state
  const [aivsRound, setAivsRound] = useState(0); // current round (1-based when active)
  const [aivsJudgments, setAivsJudgments] = useState<any[]>([]); // judgment history
  const [aivsUserStance, setAivsUserStance] = useState<'pro' | 'con'>('pro');
  const [aivsTopic, setAivsTopic] = useState('');
  const [activeAivsBattleConfig, setActiveAivsBattleConfig] = useState<ActiveAivsBattleConfig | null>(null);
  const [hasAivsBattleStarted, setHasAivsBattleStarted] = useState(false);
  const [aivsBattleAutoStart, setAivsBattleAutoStart] = useState(0);
  const [, setStopRequested] = useState(false);
  const [collapsedRounds, setCollapsedRounds] = useState<Set<string>>(new Set());

  // ── Premium consultation state ──
  const [selectedPremiumDomain, setSelectedPremiumDomain] = useState<PremiumDomainId | null>(null);
  const [premiumMessages, setPremiumMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string; isStreaming?: boolean; citations?: ApiSourceCitation[]; attachedFiles?: { name: string; mimeType: string; preview?: string }[] }[]>([]);
  const [premiumStreaming, setPremiumStreaming] = useState(false);
  const [premiumCitations, setPremiumCitations] = useState<ApiSourceCitation[]>([]);
  const [premiumTrustHeader, setPremiumTrustHeader] = useState<string | undefined>();
  const [premiumError, setPremiumError] = useState<string | undefined>();
  const [premiumSteps, setPremiumSteps] = useState<{ step: number; label: string; done: boolean }[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingFilesRef = useRef<AttachedFile[]>([]);

  const updateMessageProgress = useCallback((messageId: string, progress: ResponseProgress) => {
    setMessages((prev) => prev.map((message) => (
      message.id === messageId
        ? { ...message, ...progressFields(progress) }
        : message
    )));
  }, []);

  const { runAssistant } = useAssistantRun({
    streamExpert,
    setMessages,
    setActiveExpertId,
    loadPptGenerator,
  });

  const logUsageEvent = useCallback(async ({
    mode,
    premiumDomain,
    status,
    metadata,
  }: {
    mode: string;
    premiumDomain?: PremiumDomainId;
    status: 'success' | 'error';
    metadata?: Record<string, Json | undefined>;
  }) => {
    if (!user?.id) return;

    const { error } = await supabase.from('usage_events').insert({
      user_id: user.id,
      mode,
      premium_domain: premiumDomain ?? null,
      status,
      metadata: (metadata ?? {}) as Json,
    });

    if (error) {
      console.warn('[usage] failed to record usage event', error);
    }
  }, [user?.id]);

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
      // Debate mode (brainstorm/hearing): max 3, procon: handled separately
      if (getMainMode(discussionMode) === 'debate' && discussionMode !== 'standard' && discussionMode !== 'freetalk' && discussionMode !== 'procon' && prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const handleModeChange = (mode: DiscussionMode) => {
    const prevMain = getMainMode(discussionMode);
    const nextMain = getMainMode(mode);
    setDiscussionMode(mode);
    // 토론 서브모드 전환 시에도 선택 리셋
    const isDebateSwitch = prevMain === 'debate' && nextMain === 'debate' && discussionMode !== mode;
    setSelectedExpertIds(isDebateSwitch ? [] : nextMain === prevMain ? selectedExpertIds : nextMain === 'general' ? ['gemini-flash-lite'] : nextMain === 'multi' ? ['gemini-flash-lite'] : []);
    setProconStances({});
    setShowDebateSettings(false);
    setSelectedFramework(null);
    setDiscussionIssues([]);
    // 모드 전환 시 이전 모드의 clarify/bsClarify 상태 정리
    setClarifyState({ show: false, loading: false, originalInput: '', suggestions: [], customEdit: '' });
    setBsClarify(null);
    if (mode !== 'aivsuser') {
      setHasAivsBattleStarted(false);
      setActiveAivsBattleConfig(null);
      setAivsRound(0);
      setAivsJudgments([]);
      setAivsTopic('');
    }
  };

  const copyAllResults = () => {
    // #3 대화 내보내기: 마크다운 포맷으로 클립보드 복사 (헤더+모드+날짜 포함)
    const md = chatToMarkdown({
      question: currentQuestionDisplay || currentQuestion || '대화',
      messages,
      experts: [...experts, SUMMARIZER_EXPERT, CONCLUSION_EXPERT],
      modeLabel: getMainMode(discussionMode),
    });
    void copyToClipboard(md).then((ok) => {
      if (ok) {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
      }
    });
  };

  /** #3 대화 내보내기: Markdown 파일로 다운로드 */
  const downloadAllResults = () => {
    const md = chatToMarkdown({
      question: currentQuestionDisplay || currentQuestion || '대화',
      messages,
      experts: [...experts, SUMMARIZER_EXPERT, CONCLUSION_EXPERT],
      modeLabel: getMainMode(discussionMode),
    });
    downloadMarkdown(safeFilename(currentQuestionDisplay || currentQuestion || 'chat', 'md'), md);
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
    setMessages((prev) => [...prev, createStreamingMessage({
      id: replyId,
      expertId: expert.id,
      progress: getDefaultProgress('analyzing', {
        label: '반박 논점을 검토하고 응답 구조를 설계하고 있습니다.',
        detail: '이전 주장과 새 반박의 논리적 충돌 지점을 비교하고 있습니다.',
      }),
    })]);

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
        onProgress: (progress) => updateMessageProgress(replyId, progress),
        onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === replyId ? { ...m, content: fullContent } : m));},
        onDone: () => {setMessages((prev) => prev.map((m) => m.id === replyId ? { ...m, isStreaming: false, responseState: 'complete' } : m));},
        signal: controller.signal
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        fullContent = `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`;
        setMessages((prev) => prev.map((m) => m.id === replyId ? { ...m, content: fullContent, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
      }
    }
    setActiveExpertId(undefined);
    setIsDiscussing(false);
  }, [experts, messages, currentQuestion, isDiscussing]);

  const activeExperts = experts.filter((e) => selectedExpertIds.includes(e.id));

  const runGeneralImageTurn = useCallback(async ({
    question,
    expert,
    previousMessages,
    userMessage,
    sourceFiles,
    recentImageDataUrl,
    mode,
  }: {
    question: string;
    expert: Expert;
    previousMessages: GeneralImageHistoryMessage[];
    userMessage?: DiscussionMessage;
    sourceFiles?: GeneralImageRequestFile[];
    recentImageDataUrl?: string;
    mode: GeneralImageIntent;
  }) => {
    setIsDiscussing(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setActiveExpertId(expert.id);

    const replyId = `${expert.id}-image-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      ...(userMessage ? [userMessage] : []),
      {
        id: replyId,
        expertId: expert.id,
        content: '',
        isStreaming: true,
        messageType: 'image',
        imageGenerationMode: mode,
      },
    ]);

    try {
      const imageInputs = (sourceFiles ?? []).filter((file) => isImageMimeType(file.mimeType));
      const response = await fetch(GENERAL_IMAGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: question,
          mode,
          files: imageInputs.length > 0 ? imageInputs : undefined,
          referenceImage: recentImageDataUrl
            ? {
                name: 'previous-image.png',
                mimeType: 'image/png',
                base64: stripDataUrlPrefix(recentImageDataUrl),
              }
            : undefined,
          previousMessages,
          aspectRatio: detectGeneralImageAspectRatio(question),
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({})) as GeneralImageApiResponse;

      if (!response.ok || !data.images || data.images.length === 0) {
        throw new Error(data.error || '이미지를 만들지 못했어요.');
      }

      const generatedImages = await Promise.all(data.images.map(async (image) => {
        const dataUrl = `data:${image.mimeType};base64,${image.data}`;

        return {
          mimeType: image.mimeType,
          dataUrl,
          thumbnailDataUrl: await createGeneratedImageThumbnail(dataUrl),
          prompt: question,
          sourceModel: data.sourceModel || GENERAL_IMAGE_MODEL,
          aspectRatio: data.aspectRatio,
        };
      }));

      setMessages((prev) => prev.map((message) => (
        message.id === replyId
          ? {
              ...message,
              content: data.text || (mode === 'edit' ? '요청한 방향으로 이미지를 수정했어요.' : '요청한 느낌으로 이미지를 만들었어요.'),
              isStreaming: false,
              messageType: 'image',
              imageGenerationMode: mode,
              generatedImages,
            }
          : message
      )));
      void logUsageEvent({
        mode: `general_image_${mode}`,
        status: 'success',
        metadata: {
          promptLength: question.length,
          fileCount: sourceFiles?.length ?? 0,
          imageCount: generatedImages.length,
          aspectRatio: data.aspectRatio,
        },
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setMessages((prev) => prev.map((message) => (
          message.id === replyId
            ? {
                ...message,
                content: '이미지 생성을 중단했어요.',
                isStreaming: false,
                generatedImages: undefined,
                messageType: 'text',
              }
            : message
        )));
      } else {
        setMessages((prev) => prev.map((message) => (
          message.id === replyId
            ? {
                ...message,
                content: `⚠️ ${error instanceof Error ? error.message : '이미지 생성 중 문제가 생겼어요.'}`,
                isStreaming: false,
                messageType: 'text',
                generatedImages: undefined,
              }
            : message
        )));
        void logUsageEvent({
          mode: `general_image_${mode}`,
          status: 'error',
          metadata: {
            promptLength: question.length,
            fileCount: sourceFiles?.length ?? 0,
            errorMessage: error instanceof Error ? error.message : 'unknown-error',
          },
        });
      }
    }

    setActiveExpertId(undefined);
    setIsDiscussing(false);
    setStopRequested(false);
  }, [logUsageEvent]);

  const startAivsBattle = useCallback((draft: AivsBattleDraft) => {
    const topic = AIVS_USER_TOPIC_PRESETS.find(item => item.id === draft.topicId) || AIVS_USER_TOPIC_PRESETS[0];
    if (!topic) return;

    const resolvedStance = draft.userStance === 'random'
      ? (Math.random() > 0.5 ? 'pro' : 'con')
      : draft.userStance;
    const opponentCount = debateSettings.aivsUserOpponentCount || 1;
    const opponentIds = selectedExpertIds.slice(0, opponentCount);

    setDebateSettings(prev => ({
      ...prev,
      aivsUserOpponentCount: 1,
      aivsUserBattleAiId: draft.battleAiId,
      aivsUserStance: draft.userStance,
      aivsUserVerdict: draft.verdictMode,
      aivsUserTopic: topic.title,
    }));
    setActiveAivsBattleConfig({
      topicId: topic.id,
      topicTitle: topic.title,
      topicDescription: topic.description,
      userStance: resolvedStance,
      battleAiId: draft.battleAiId,
      verdictMode: draft.verdictMode,
      opponentCount: 1,
      opponentIds,
    });
    setHasAivsBattleStarted(true);
    setAivsRound(0);
    setAivsJudgments([]);
    setAivsUserStance(resolvedStance);
    setAivsTopic(topic.title);
    setMessages([]);
    // Trigger auto-start: AI provocation opening
    setAivsBattleAutoStart(prev => prev + 1);
  }, [debateSettings.aivsUserOpponentCount, selectedExpertIds]);

  const resetAivsBattle = useCallback(() => {
    setHasAivsBattleStarted(false);
    setActiveAivsBattleConfig(null);
    setMessages([]);
    setAivsRound(0);
    setAivsJudgments([]);
  }, []);

  // ── Premium consultation send handler ──
  const handlePremiumSend = useCallback(async (
    question: string,
    domain: PremiumDomainId,
    history: { role: 'user' | 'assistant'; content: string }[],
    files: AttachedFile[] = []
  ) => {
    const userMsgId = `premium-user-${Date.now()}`;
    const attachedFileBadges = files.length > 0
      ? files.map((file) => ({ name: file.name, mimeType: file.mimeType, preview: file.preview }))
      : undefined;

    setPremiumMessages(prev => [...prev, { id: userMsgId, role: 'user', content: question, attachedFiles: attachedFileBadges }]);
    setPremiumStreaming(true);
    setPremiumCitations([]);
    setPremiumTrustHeader(undefined);
    setPremiumError(undefined);
    setPremiumSteps([
      { step: 1, label: '키워드 분석 중...', done: false },
      { step: 2, label: '데이터 검색 중...', done: false },
      { step: 3, label: '답변 생성 중...', done: false },
    ]);

    const aiMsgId = `premium-ai-${Date.now()}`;
    setPremiumMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '', isStreaming: true }]);

    let latestCitations: ApiSourceCitation[] = [];

    try {
      const resp = await fetch('/api/premium-consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, domain, conversationHistory: history, files }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error('응답을 받아올 수 없습니다.');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'trust') {
              setPremiumTrustHeader(parsed.trustHeader);
              if (parsed.citations) {
                latestCitations = parsed.citations;
                setPremiumCitations(parsed.citations);
              }
              if (parsed.error) setPremiumError(parsed.error);
              setPremiumSteps(prev => prev.map((s, i) => i <= 1 ? { ...s, done: true } : s));
              continue;
            }

            if (parsed.type === 'step') {
              setPremiumSteps(prev => prev.map(s => s.step <= parsed.step ? { ...s, label: parsed.label || s.label, done: true } : s));
              continue;
            }

            const chunk = parsed.choices?.[0]?.delta?.content;
            if (chunk) {
              fullContent += chunk;
              setPremiumSteps(prev => prev.map(s => ({ ...s, done: true })));
              setPremiumMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: fullContent } : m));
            }
          } catch { /* skip malformed SSE */ }
        }
      }

      setPremiumMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false, citations: latestCitations } : m));
      void logUsageEvent({
        mode: 'premium',
        premiumDomain: domain,
        status: 'success',
        metadata: {
          historyLength: history.length,
          questionLength: question.length,
          citationCount: latestCitations.length,
          attachedFileCount: files.length,
        },
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '알 수 없는 오류';
      setPremiumMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: `⚠️ ${errMsg}`, isStreaming: false } : m));
      setPremiumError(errMsg);
      void logUsageEvent({
        mode: 'premium',
        premiumDomain: domain,
        status: 'error',
        metadata: {
          historyLength: history.length,
          questionLength: question.length,
          attachedFileCount: files.length,
          error: errMsg,
        },
      });
    }

    setPremiumStreaming(false);
    setPremiumSteps([]);
  }, [logUsageEvent]);

  const handleSelectPremiumDomain = useCallback((domainId: PremiumDomainId) => {
    setSelectedPremiumDomain(domainId);
    setPremiumMessages([]);
    setPremiumCitations([]);
    setPremiumTrustHeader(undefined);
    setPremiumError(undefined);
    setPremiumSteps([]);
  }, []);

  const handlePremiumBack = useCallback(() => {
    setSelectedPremiumDomain(null);
  }, []);

  // ── Debate analysis panel state ──
  const [showDebateAnalysis, setShowDebateAnalysis] = useState(false);
  const [debateAnalysisTab, setDebateAnalysisTab] = useState<'points' | 'table' | 'verdict'>('points');
  const [debateAnalysisContent, setDebateAnalysisContent] = useState<Record<string, string>>({});
  const [debateAnalysisLoading, setDebateAnalysisLoading] = useState(false);
  const [debateAnalysisCopied, setDebateAnalysisCopied] = useState(false);

  const requestDebateAnalysis = useCallback(async (tab: 'points' | 'table' | 'verdict') => {
    if (debateAnalysisContent[tab] || debateAnalysisLoading) return;
    setDebateAnalysisLoading(true);
    const allText = messages
      .filter(m => m.expertId !== '__round__' && m.content)
      .map(m => {
        if (m.expertId === '__user__') return `[사용자] ${m.content}`;
        const e = experts.find(ex => ex.id === m.expertId);
        return `[${e?.nameKo || 'AI'}] ${m.content}`;
      }).join('\n\n');

    const prompts: Record<string, string> = {
      points: `다음은 찬반 토론 내용입니다. 양쪽의 핵심 논점을 각각 3~5개씩 한 줄로 정리하세요.

형식:
## 찬성 측 핵심 논점
- 논점1
- 논점2

## 반대 측 핵심 논점
- 논점1
- 논점2

한국어로, 마크다운으로 답하세요.`,
      table: `다음은 찬반 토론 내용입니다. 라운드별로 양쪽의 핵심 주장과 흐름을 분석하세요.

형식:
## 1라운드 (주장)
- **찬성**: (핵심 주장 1줄 요약)
- **반대**: (핵심 주장 1줄 요약)
- **분석**: (이 라운드에서 어느 쪽이 더 강했는지, 왜)

## 2라운드 (반론) — 있다면
- **찬성**: (반론 요약)
- **반대**: (반론 요약)
- **분석**: (논점 변화, 새로운 근거 유무)

## 최종 라운드 — 있다면
- **찬성**: (최종 입장)
- **반대**: (최종 입장)
- **분석**: (입장 변화 여부, 결론)

## 전체 흐름 요약
(토론이 어떻게 전개됐는지 2~3문장)

실제 토론에 존재하는 라운드만 분석하세요. 한국어, 마크다운.`,
      verdict: `다음은 찬반 토론 내용입니다. 현재까지의 형세를 판단하세요.

형식:
## 형세 판단
(어느 쪽이 우세한지, 왜 그런지 2~3문장)

## 찬성 측 강점/약점
- 강점: ...
- 약점: ...

## 반대 측 강점/약점
- 강점: ...
- 약점: ...

한국어, 마크다운. 공정하게 분석하세요.`,
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: '당신은 토론 분석 전문가입니다. 주어진 토론 내용을 분석하여 요청된 형식으로 정리합니다.',
          question: `${prompts[tab]}\n\n=== 토론 내용 ===\n${allText}`,
        }),
      });
      if (!resp.ok || !resp.body) throw new Error('응답 실패');
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const chunk = parsed.choices?.[0]?.delta?.content;
            if (chunk) result += chunk;
          } catch { /* skip */ }
        }
      }
      setDebateAnalysisContent(prev => ({ ...prev, [tab]: result }));
    } catch {
      setDebateAnalysisContent(prev => ({ ...prev, [tab]: '분석을 불러오지 못했습니다.' }));
    }
    setDebateAnalysisLoading(false);
  }, [messages, experts, debateAnalysisContent, debateAnalysisLoading]);

  const stopDiscussion = () => {
    setStopRequested(true);
    abortControllerRef.current?.abort();
    setSimChoices([]);
  };

  const handleNewDiscussion = () => {
    autoSaveCurrentChat();
    // 진행 중이면 중단
    if (isDiscussing) { abortControllerRef.current?.abort(); }
    setDiscussionMode('general');
    setMessages([]);
    setCurrentQuestion('');
    setCurrentQuestionDisplay('');
    setProconDebateTopic('');
    setSelectedExpertIds(['gemini-flash-lite']);
    setProconStances({});
    setSimChoices([]);
    setSimPhaseIndex(0);
    setAivsRound(0);
    setAivsJudgments([]);
    setHasAivsBattleStarted(false);
    setActiveAivsBattleConfig(null);
    setSelectedPremiumDomain(null);
    setPremiumMessages([]);
    setPremiumStreaming(false);
    setPremiumCitations([]);
    setPremiumTrustHeader(undefined);
    setPremiumError(undefined);
    setPremiumSteps([]);
    setActiveGame(null);
    setIsDiscussing(false);
    setActiveExpertId(undefined);
    setShowDebateSettings(false);
    setSelectedFramework(null);
    setDiscussionIssues([]);
    setCollapsedRounds(new Set());
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
      if (useMode === 'multi') {
        setMultiView('overview');
        setMultiActiveTab(null);
      }
      // 플레이어 모드는 Gemini 2.5 Flash Lite 자동 선택
      const useIds = useMode === 'player'
        ? ['gemini-flash-lite']
      : (overrideExpertIds || selectedExpertIds);
    const discussionExperts = experts.filter((e) => useIds.includes(e.id));
    if (discussionExperts.length < 1 && useMode !== 'stakeholder' && useMode !== 'aivsuser' && useMode !== 'assistant') return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStopRequested(false);
    setIsDiscussing(true);
    if (useMode !== 'stakeholder') {
      setCurrentQuestion(question);
      setCurrentQuestionDisplay(displayQuestion || question);
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
    const filesBadges = pendingFiles.length > 0 ? pendingFiles.map((f) => ({
      name: f.name,
      mimeType: f.mimeType,
      preview: f.preview,
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
      const battleConfig = activeAivsBattleConfig;
      if (!battleConfig) {
        setMessages([
          {
            id: `avsu-config-required-${Date.now()}`,
            expertId: '__round__',
            content: '⚠️ AI vs 유저 대결은 먼저 "배틀 시작"에서 설정을 완료해야 시작할 수 있어요.',
          },
        ]);
        setIsDiscussing(false);
        setActiveExpertId(undefined);
        return;
      }

      const battleAi = BATTLE_AI_CHARACTERS.find(a => a.id === battleConfig.battleAiId) || BATTLE_AI_CHARACTERS[0];
      const battleLevel = debateSettings.aivsUserBattleLevel || 3;
      const difficulty = battleLevel >= 4 ? 'hard' : battleLevel <= 2 ? 'easy' : 'normal';
      const userStance = battleConfig.userStance;
      const stanceKo = userStance === 'pro' ? '찬성' : '반대';
      const aiStanceKo = userStance === 'pro' ? '반대' : '찬성';
      const verdictMode = battleConfig.verdictMode;
      const opponentCount = battleConfig.opponentCount;
      const topic = battleConfig.topicTitle;
      const openingArgument = question.trim();

      // 선택한 AI 사용 (없으면 gemini 기본)
      const aiOpponents = discussionExperts.length > 0
        ? discussionExperts.filter(expert => battleConfig.opponentIds.includes(expert.id)).slice(0, opponentCount)
        : [experts.find(e => e.id === 'gemini') || experts.find(e => e.category === 'ai') || experts[0]].filter(Boolean);

      setAivsRound(openingArgument ? 1 : 0);
      setAivsJudgments([]);
      setAivsUserStance(userStance);
      setAivsTopic(topic);

      const levelLabels = ['입문', '초급', '중급', '고급', '극한'];
      const introMessages: DiscussionMessage[] = [
        {
          id: `avsu-start-${Date.now()}`,
          expertId: '__round__',
          content: `⚔️ **${topic}**\n\n유저(${stanceKo}) vs ${battleAi.icon} ${battleAi.name}(${aiStanceKo}) · 난이도 ${levelLabels[battleLevel - 1]}\n\n${battleConfig.topicDescription}`
        },
      ];

      if (openingArgument) {
        introMessages.push({
          id: `avsu-user-open-${Date.now()}`,
          expertId: '__user__',
          content: openingArgument,
          timestamp: Date.now(),
        });
      }

      setMessages(introMessages);

      const levelDescs: Record<number, string> = {
        1: '\n강도: 입문. 친절하게 반론. 상대 주장의 좋은 점을 인정하면서 부드럽게 다른 관점을 제시. 초보자도 편하게 대응 가능.',
        2: '\n강도: 초급. 예의 바르지만 논리적으로 반박. 허점을 지적하되 상대가 배울 수 있게.',
        3: '\n강도: 중급. 날카롭게 반론. 상대 약점을 정확히 파고들되 대응할 여지는 남겨둬.',
        4: '\n강도: 고급. 공격적으로 반박. 상대 논리를 다각도로 해체하고 퇴로를 차단해.',
        5: '\n강도: 극한. 전력을 다해 싸워. 한 치의 양보도 없이. 상대가 반박할 틈을 주지 마. 모든 허점을 파고들어.',
      };
      const levelDesc = levelDescs[battleLevel] || levelDescs[3];
      const difficultyDesc = battleAi.personality + levelDesc;

      // ── AI Provocation Opening (no user argument yet) ──
      if (!openingArgument) {
        setIsDiscussing(true);
        const firstAi = aiOpponents[0];
        if (!firstAi) { setIsDiscussing(false); return; }

        const provocationPrompt = `너는 "${battleAi.name}"이다.
${difficultyDesc}

방금 상대가 "${topic}" 주제에서 "${stanceKo}" 입장이라는 걸 알게 됐어.
토론 시작 전, 짧은 첫 반응을 보여줘.

## 규칙
- 실제 논거나 근거는 아직 꺼내지 마. 본격 토론은 아직이야.
- 상대 입장이 ${stanceKo}이라는 것에 대한 감정적 첫 반응만 보여줘.
- 상대가 "이 녀석..." 하면서 반박하고 싶어지게 도발해.
- 주제의 핵심 포인트를 살짝 건드려서 주제를 잘 아는 것처럼 보여줘.
- 반드시 1~2문장. 너무 길지 않게.
- 역할명이나 태그를 본문에 쓰지 마.
- 한국어로만 답해.`;

        const provMsgId = `avsu-provocation-${Date.now()}`;
        setMessages(prev => [...prev, createStreamingMessage({
          id: provMsgId,
          expertId: firstAi.id,
          timestamp: Date.now(),
          progress: getDefaultProgress('analyzing', {
            label: '첫 도발 문장을 빠르게 만들고 있어요.',
            detail: '주제 핵심을 건드리는 짧은 반응을 고르고 있습니다.',
          }),
        })]);
        setActiveExpertId(firstAi.id);

        let provContent = '';
        try {
          await streamExpert({
            question: `"${topic}" 주제에서 상대방이 "${stanceKo}" 입장이야. 첫 반응을 보여줘.`,
            expert: { ...firstAi, systemPrompt: provocationPrompt },
            previousResponses: [],
            round: 'initial' as DiscussionRound,
            onProgress: (progress) => updateMessageProgress(provMsgId, progress),
            onDelta: chunk => { provContent += chunk; setMessages(prev => prev.map(m => m.id === provMsgId ? { ...m, content: provContent } : m)); },
            onDone: () => { setMessages(prev => prev.map(m => m.id === provMsgId ? { ...m, isStreaming: false, responseState: 'complete' } : m)); },
            signal: controller.signal,
          });
        } catch (err) {
          if ((err as Error).name === 'AbortError') { setIsDiscussing(false); return; }
          provContent = `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`;
          setMessages(prev => prev.map(m => m.id === provMsgId ? { ...m, content: provContent, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
        }

        setIsDiscussing(false);
        setActiveExpertId(undefined);
        return;
      }

      // ── User has typed first argument — AI responds ──
      setIsDiscussing(true);
      const convHistory = [{ speaker: '유저', content: openingArgument }];
      for (let ri = 0; ri < aiOpponents.length; ri++) {
        if (shouldStop()) break;
        const aiExpert = aiOpponents[ri];
        if (!aiExpert) continue;
        const aiPrompt = `당신은 "${battleAi.name}"입니다. "${topic}" 주제에서 "${aiStanceKo}" 입장으로 유저와 토론합니다.

## 유저 입장: ${stanceKo}
## 승패 판정 방식: ${verdictMode === 'final' ? '마지막에 판정 있음' : '판정 없이 자유 토론'}
## 말투: ${difficulty === 'easy' ? '친근' : difficulty === 'hard' ? '공격적' : '논리적'}
${difficultyDesc}

## 유저의 첫 주장
"${openingArgument}"

## 행동 규칙
1. 유저의 첫 주장에 바로 반응하고 반대 입장을 분명히 밝히세요.
2. ${debateSettings.responseLength === 'short' ? '1~2문장으로 아주 짧고 강하게.' : debateSettings.responseLength === 'long' ? '4~6문장으로 근거를 들어 상세하게.' : '2~4문장으로 짧고 강하게.'}
3. ${aiOpponents.length > 1 ? '다른 AI와 겹치지 않게 다른 각도에서 반박하세요.' : '근거와 반론 포인트를 분명히 제시하세요.'}
4. 역할명이나 태그를 본문에 쓰지 마세요.
5. 한국어로만 답하세요.`;

        if (ri > 0) await new Promise(r => setTimeout(r, 200));
        const aiMsgId = `avsu-opening-ai-${ri}-${Date.now()}`;
        setMessages(prev => [...prev, createStreamingMessage({
          id: aiMsgId,
          expertId: aiExpert.id,
          simRoleName: aiExpert.nameKo,
          timestamp: Date.now(),
          progress: getDefaultProgress('analyzing', {
            label: '초기 반론의 핵심 논거를 정렬하고 있습니다.',
            detail: '사용자 주장에 즉시 대응할 주요 쟁점을 선별하고 있습니다.',
          }),
        })]);
        setActiveExpertId(aiExpert.id);

        let aiContent = '';
        try {
          await streamExpert({
            question: `주제: "${topic}"\n유저의 첫 주장: "${openingArgument}"\n${aiStanceKo} 입장에서 바로 반박하세요.`,
            expert: { ...aiExpert, systemPrompt: aiPrompt },
            previousResponses: convHistory.map(m => ({ name: m.speaker, content: m.content })),
            round: 'initial' as DiscussionRound,
            onProgress: (progress) => updateMessageProgress(aiMsgId, progress),
            onDelta: chunk => { aiContent += chunk; setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: aiContent } : m)); },
            onDone: () => { setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false, responseState: 'complete' } : m)); },
            signal: controller.signal,
            files: filesToSend,
          });
        } catch (err) {
          if ((err as Error).name === 'AbortError') break;
        }

        if (aiContent.trim()) {
          convHistory.push({ speaker: aiExpert.nameKo, content: aiContent });
        }
      }

      setIsDiscussing(false);
      setActiveExpertId(undefined);
      return;
    }

    if (useMode === 'expert') {
      // Expert mode: deep consultation with selected expert
      const expert = discussionExperts[0];
      if (expert) {
        setActiveExpertId(expert.id);
        const msgId = `${expert.id}-expert-${Date.now()}`;
        setMessages((prev) => [...prev, createStreamingMessage({ id: msgId, expertId: expert.id })]);
        let fullContent = '';
        const expertExtra = `\n\n=== 전문가 상담 모드 ===\n당신은 해당 분야의 최고 전문가입니다. 사용자의 질문에 대해 깊이 있고 실용적인 전문 상담을 제공하세요.\n- 전문 용어를 사용하되 쉽게 설명해주세요\n- 구체적인 사례, 수치, 근거를 포함하세요\n- 단계별 실행 방안이 있다면 제시하세요\n- 주의사항이나 리스크도 언급하세요\n마크다운 형식으로 구조화하여 답변하세요.`;
        try {
          await streamExpert({
            question, expert: await buildExpertWithPrompt(expert, expertExtra),
            previousResponses: [], round: 'initial',
            onProgress: (progress) => updateMessageProgress(msgId, progress),
            onDelta: (chunk) => { fullContent += chunk; setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m)); },
            onDone: () => { setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false, responseState: 'complete' } : m)); },
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
      if (useMode === 'general') {
        const imageIntent = detectGeneralImageIntent(question, {
          files: pendingFiles,
        });

        if (imageIntent) {
          const expertForImage = pickGeneralImageExpert(
            discussionExperts[0],
            experts,
            question,
            [],
          );

          if (!expertForImage) {
            setMessages([
              {
                id: `general-image-missing-${Date.now()}`,
                expertId: '__round__',
                content: '⚠️ 이미지 응답을 맡을 AI를 찾지 못했어요. 다시 시도해주세요.',
              },
            ]);
            setIsDiscussing(false);
            setActiveExpertId(undefined);
            setStopRequested(false);
            return;
          }

          await runGeneralImageTurn({
            question,
            expert: expertForImage,
            previousMessages: [],
            userMessage: {
              id: `user-image-${Date.now()}`,
              expertId: '__user__',
              content: displayQuestion || question,
              attachedFiles: filesBadges,
            },
            sourceFiles: filesToSend,
            mode: imageIntent,
          });
          setStopRequested(false);
          return;
        }
      }

      // 사용자 질문 즉시 표시 (general 모드, 파일 없을 때도)
      if (useMode === 'general') {
        setMessages((prev) => [...prev, {
          id: `user-general-${Date.now()}`,
          expertId: '__user__',
          content: displayQuestion || question,
          ...(filesBadges && filesBadges.length > 0 ? { attachedFiles: filesBadges } : {}),
        }]);
      }

      const preflightExpert = useMode === 'general' && discussionExperts.length === 1
        ? discussionExperts[0]
        : undefined;
      const preflightAgentMessageId = preflightExpert && isManagedAutoAgent(preflightExpert.id)
        ? `${preflightExpert.id}-preflight-${Date.now()}`
        : undefined;

      if (preflightExpert && preflightAgentMessageId) {
        setMessages((prev) => [...prev, createStreamingMessage({
          id: preflightAgentMessageId,
          expertId: preflightExpert.id,
          progress: getDefaultProgress('analyzing', {
            label: `${preflightExpert.nameKo}가 요구 범위를 분석하고 있습니다.`,
            detail: '명확화 필요 여부와 응답 전략을 사전 점검하고 있습니다.',
          }),
        })]);
      }

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
              setMessages([{
                id: `user-clarify-${Date.now()}`,
                expertId: '__user__',
                content: displayQuestion || question,
                attachedFiles: filesBadges,
              }]);
            }
            // 부분 답변이 있으면 AI 메시지로 먼저 표시
            if (clarifyData.partialAnswer) {
              setMessages(prev => [...prev, { id: `partial-${Date.now()}`, expertId: expert0.id, content: clarifyData.partialAnswer }]);
            }
            if (preflightAgentMessageId) {
              setMessages(prev => prev.filter((message) => message.id !== preflightAgentMessageId));
            }
            // 명확화 질문을 거친 뒤에도 실제 답변 요청 시 첨부가 유지되도록 보존
            pendingFilesRef.current = pendingFiles;
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

        const autoConfig = AUTO_AGENT_CONFIG[expert.id];

        if (autoConfig && autoConfig.enableAgent) {
          const autoRunResult = await runAutoAgentTurn({
            expert,
            question,
            files: filesToSend,
            signal: controller.signal,
            autoConfig,
            setMessages,
            getExpertPrompt,
            streamExpert,
            loadQuestionClassifier,
            loadAgentPipeline,
            safetyGuardrail: SAFETY_GUARDRAIL,
            qualityGuardrail: QUALITY_GUARDRAIL,
            placeholderMessageId: expert.id === preflightExpert?.id ? preflightAgentMessageId : undefined,
          });

          if (autoRunResult.aborted) {
            break;
          }
        } else {
          // ── 기존 일반 모델 + Perplexity AUTO (에이전트 없이 단일 호출) ──
          const msgId = `${expert.id}-general-${Date.now()}`;
          // Perplexity AUTO는 config에 agentModel이 있으면 그걸로, 없으면 기본 openrouterModel
          const baseEffectiveExpert = autoConfig && !autoConfig.enableAgent
            ? { ...expert, openrouterModel: autoConfig.directModel }
            : expert;
          const effectiveExpert = isManagedAutoAgent(expert.id)
            ? await buildExpertWithPrompt(
                baseEffectiveExpert,
                buildAgentResponsePrompt({
                  agentId: expert.id,
                  phase: 'direct',
                  intent: inferAgentIntent(question),
                }),
              )
            : baseEffectiveExpert;
          setMessages((prev) => [...prev, createStreamingMessage({ id: msgId, expertId: expert.id })]);
          let fullContent = '';
          try {
            await streamExpert({
              question, expert: effectiveExpert,
              previousResponses: [], round: 'initial',
              onProgress: (progress) => updateMessageProgress(msgId, progress),
              onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m));},
              onDone: () => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false, responseState: 'complete' } : m));},
              signal: controller.signal,
              files: filesToSend,
              onSearchSources: (data) => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, searchSources: data } : m));},
            });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`;
            setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
          }
        }
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN_EXPERTS));
      }
      setActiveExpertId(undefined);
      setIsDiscussing(false);
      setStopRequested(false);
      // 저장은 대화 완료 시 upsert로 처리
      return;
    } else if (useMode === 'multi') {
      // 멀티 채팅: 명확화 질문 (첫 질문, 스킵 안 된 경우만)
      const multiExpert0 = discussionExperts[0];
      if (multiExpert0 && !skipClarifyRef.current && clarifyAttemptsRef.current < MAX_CLARIFY_ATTEMPTS) {
        clarifyAttemptsRef.current++;
        try {
          const clarifyResp = await fetch('/api/clarify-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: question, expertName: multiExpert0.nameKo, expertDescription: multiExpert0.description, attempt: clarifyAttemptsRef.current }),
          });
          const clarifyData = await clarifyResp.json();
          if (clarifyData.type === 'answer_with_assumption' && clarifyData.assumption) {
            question = `${question}\n\n[사용자 맥락 가정: ${clarifyData.assumption}]`;
          } else if (clarifyData.type === 'clarifying_questions' && clarifyData.questions?.length > 0) {
            if (messages.length === 0) {
              setMessages([{ id: `user-clarify-${Date.now()}`, expertId: '__user__', content: displayQuestion || question, attachedFiles: filesBadges }]);
            }
            if (clarifyData.partialAnswer) {
              setMessages(prev => [...prev, { id: `partial-${Date.now()}`, expertId: multiExpert0.id, content: clarifyData.partialAnswer }]);
            }
            pendingFilesRef.current = pendingFiles;
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
        skipClarifyRef.current = true;
        setChatClarify(null);
      }

      // 검색 1회 실행 후 결과 공유
      const multiSearchCtx = await fetchSearchContext(question);

      const shuffled = [...discussionExperts].sort(() => Math.random() - 0.5);
      const multiPlan = buildMultiResponsePlan(question, shuffled.length);
      const multiMessageIds = new Map<string, string>(
        shuffled.map((expert, index) => [expert.id, `${expert.id}-conclusion-${Date.now()}-${index}`]),
      );

      setMessages((prev) => [
        ...prev,
        { id: `round-sep-multi-${Date.now()}`, expertId: '__round__', content: '다중 AI 의견 수집', round: 'initial' },
        ...shuffled.map((expert) => createStreamingMessage({
          id: multiMessageIds.get(expert.id)!,
          expertId: expert.id,
          round: 'initial',
          progress: getDefaultProgress('queued', {
            label: '질문을 AI별 분석 관점으로 배분하고 있습니다.',
            detail: '각 AI가 담당할 판단 축과 응답 범위를 준비하고 있습니다.',
          }),
        })),
      ]);

      // 멀티 채팅: 모든 AI 병렬 실행 — 각자 자기 msgId로 UI 업데이트하므로 충돌 없음
      await Promise.allSettled(shuffled.map(async (expert) => {
        if (shouldStop()) return;
        const msgId = multiMessageIds.get(expert.id) ?? `${expert.id}-conclusion-${Date.now()}`;
        let fullContent = '';
        try {
          await streamExpert({
            question,
            expert: await buildExpertWithPrompt(expert, multiPlan.prompt),
            previousResponses: [], round: 'initial',
            maxTokens: multiPlan.maxTokens,
            onProgress: (progress) => updateMessageProgress(msgId, progress),
            onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m));},
            onDone: () => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false, responseState: 'complete' } : m));},
            signal: controller.signal,
            files: filesToSend,
            preSearchContext: multiSearchCtx,
            onSearchSources: (data) => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, searchSources: data } : m));},
          });
        } catch (err) {
          if ((err as Error).name === 'AbortError') return;
          fullContent = `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`;
          setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
        }
        allResponses.push({ name: expert.nameKo, content: fullContent });
      }));

      setActiveExpertId(undefined);
      setIsDiscussing(false);
      setStopRequested(false);
      // 저장은 대화 완료 시 upsert로 처리
      return;
    } else if (useMode === 'standard') {
      // Build issue & purpose context for system prompt.
      // Standard mode 목적 UI writes into debateSettings.debateTone using mild/moderate/intense,
      // so the prompt must read the same state instead of the deprecated local debateIntensity.
      const purposeMap: Record<string, string> = {
        mild: '\n다양한 관점과 가능성을 넓게 탐색하세요. 한 가지 결론에 급하게 도달하지 말고 여러 시각을 제시해주세요.',
        moderate: '\n논리적 근거를 들어 깊이 분석하세요. 주장의 전제, 근거, 반론을 체계적으로 검토해주세요.',
        intense: '\n공통점을 찾고 합의 가능한 결론을 도출하는 데 집중하세요. 다른 전문가 의견의 장점을 인정하고 통합하세요.',
      };
      const purposeExtra = purposeMap[debateSettings.debateTone || 'moderate'] || '';
      const issueContext = (discussionIssues.length > 0
        ? `\n\n이 토론의 핵심 논점은 다음과 같습니다:\n${discussionIssues.map((iss, i) => `${i+1}. ${iss.title}`).join('\n')}\n각 논점에 대해 명확한 입장을 밝히고 근거를 제시해주세요.`
        : '') + purposeExtra;

      const roundConfig = debateSettings.rounds === 2
        ? [{ round: 'initial' as DiscussionRound, label: '1라운드 · 주장' }, { round: 'final' as DiscussionRound, label: '2라운드 · 최종 입장' }]
        : debateSettings.rounds === 4
        ? [{ round: 'initial' as DiscussionRound, label: '1라운드 · 초기 의견' }, { round: 'rebuttal' as DiscussionRound, label: '2라운드 · 반론' }, { round: 'rebuttal' as DiscussionRound, label: '3라운드 · 심층 반론' }, { round: 'final' as DiscussionRound, label: '4라운드 · 최종 입장' }]
        : [{ round: 'initial' as DiscussionRound, label: ROUND_LABELS.initial }, { round: 'rebuttal' as DiscussionRound, label: ROUND_LABELS.rebuttal }, { round: 'final' as DiscussionRound, label: ROUND_LABELS.final }];
      // 검색 1회 실행 후 결과 공유
      const standardSearchCtx = await fetchSearchContext(question);
      for (const { round, label } of roundConfig) {
        if (shouldStop()) break;
        const roundExperts = [...discussionExperts].sort(() => Math.random() - 0.5);
        setMessages((prev) => [...prev, { id: `round-sep-${round}-${Date.now()}`, expertId: '__round__', content: label, round }]);
        for (const expert of roundExperts) {
          if (shouldStop()) break;
          setActiveExpertId(expert.id);
          const msgId = `${expert.id}-${round}-${Date.now()}`;
          setMessages((prev) => [...prev, createStreamingMessage({ id: msgId, expertId: expert.id, round })]);
          let fullContent = '';
          try {
            await streamExpert({ question, expert: await buildExpertWithPrompt(expert, issueContext + lengthExtra), previousResponses: allResponses, round,
              onProgress: (progress) => updateMessageProgress(msgId, progress),
              onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m));},
              onDone: () => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false, responseState: 'complete' } : m));},
              signal: controller.signal,
              files: filesToSend,
              preSearchContext: standardSearchCtx,
              onSearchSources: (data) => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, searchSources: data } : m));},
            });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`;
            setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
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

      // Phase 1-N: Actual debate rounds, respecting debateSettings.rounds.
      const rounds = [
        { label: '1라운드 · 찬성 주장', round: 'initial' as DiscussionRound, experts: proExperts, side: 'pro' as const },
        { label: '1라운드 · 반대 주장', round: 'initial' as DiscussionRound, experts: conExperts, side: 'con' as const },
        ...(debateSettings.rounds >= 3
          ? [
              { label: '2라운드 · 찬성 반론', round: 'rebuttal' as DiscussionRound, experts: proExperts, side: 'pro' as const },
              { label: '2라운드 · 반대 반론', round: 'rebuttal' as DiscussionRound, experts: conExperts, side: 'con' as const },
            ]
          : []),
        ...(debateSettings.rounds >= 4
          ? [
              { label: '3라운드 · 찬성 재반론', round: 'rebuttal' as DiscussionRound, experts: proExperts, side: 'pro' as const },
              { label: '3라운드 · 반대 재반론', round: 'rebuttal' as DiscussionRound, experts: conExperts, side: 'con' as const },
            ]
          : []),
        ...(debateSettings.rounds >= 5
          ? [
              { label: '4라운드 · 찬성 핵심 쟁점 압축', round: 'rebuttal' as DiscussionRound, experts: proExperts, side: 'pro' as const },
              { label: '4라운드 · 반대 핵심 쟁점 압축', round: 'rebuttal' as DiscussionRound, experts: conExperts, side: 'con' as const },
            ]
          : []),
        { label: `${debateSettings.rounds}라운드 · 최종 입장`, round: 'final' as DiscussionRound, experts: discussionExperts, side: 'all' as const },
      ];

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

      // 검색 1회 실행 후 결과 공유
      const proconSearchCtx = await fetchSearchContext(question);
      for (const { label, round, experts: sideExperts, side } of rounds) {
        if (shouldStop()) break;
        setMessages((prev) => [...prev, { id: `round-sep-${label}-${Date.now()}`, expertId: '__round__', content: label, round }]);
        for (const expert of sideExperts) {
          if (shouldStop()) break;
          setActiveExpertId(expert.id);
          const sideLabel = stanceMap[expert.id] === 'pro' ? '찬성' : '반대';
          const extra = (round !== 'final' ?
          `\n\n## 절대 규칙 — 입장 고정
당신은 이 토론에서 **"${sideLabel}"** 측입니다.
${sideLabel === '찬성' ? '이 명제에 "찬성(동의)"하는 입장에서만 주장하세요. 명제가 옳다는 근거를 제시하세요.' : '이 명제에 "반대(비동의)"하는 입장에서만 주장하세요. 명제가 틀리다는 근거를 제시하세요.'}
- 개인적 의견과 무관하게 배정된 입장을 절대 벗어나지 마세요.
- "${sideLabel === '찬성' ? '반대' : '찬성'}" 측의 논리를 인정하거나 동조하지 마세요.
- 상대 논리의 허점을 공격하고, 자기 입장의 근거를 강화하세요.` :
          `\n\n최종 라운드입니다. 당신은 "${sideLabel}" 측이었습니다. 자신의 핵심 주장을 요약하고 최종 입장을 정리하세요. 입장 변경은 불필요합니다.`) + proconSettingsExtra + lengthExtra;
          const msgId = `${expert.id}-${round}-${side}-${Date.now()}`;
          setMessages((prev) => [...prev, createStreamingMessage({ id: msgId, expertId: expert.id, round })]);
          let fullContent = '';
          try {
            await streamExpert({ question, expert: await buildExpertWithPrompt(expert, extra), previousResponses: allResponses, round,
              onProgress: (progress) => updateMessageProgress(msgId, progress),
              onDelta: (chunk) => {fullContent += chunk;setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent } : m));},
              onDone: () => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false, responseState: 'complete' } : m));},
              signal: controller.signal,
              files: filesToSend,
              preSearchContext: proconSearchCtx,
              onSearchSources: (data) => {setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, searchSources: data } : m));},
            });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`;
            setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
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
              expertIds: useIds,
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
      // 검색 1회 실행 후 결과 공유
      const brainstormSearchCtx = await fetchSearchContext(question);
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
                signal: controller.signal,
                files: filesToSend,
                preSearchContext: brainstormSearchCtx,
              });
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
            createStreamingMessage({
              id: curatorId,
              expertId: SUMMARIZER_EXPERT.id,
              isSummary: true,
              round: fw.id as DiscussionRound,
              progress: getDefaultProgress('finalizing', {
                label: '아이디어 검토 결과를 최종 산출물로 구조화하고 있습니다.',
                detail: '프레임워크별 인사이트를 통합해 결과 구조를 확정하고 있습니다.',
              }),
            }),
          ]);

          let curatorContent = '';
          try {
            await streamExpert({
              question, expert: { ...SUMMARIZER_EXPERT, systemPrompt: curatorPrompts[fw.id] || curatorPrompts.free },
              previousResponses: allResponses, round: 'summary',
              onProgress: (progress) => updateMessageProgress(curatorId, progress),
              onDelta: (chunk) => { curatorContent += chunk; setMessages((prev) => prev.map(m => m.id === curatorId ? { ...m, content: curatorContent } : m)); },
              onDone: () => { setMessages((prev) => prev.map(m => m.id === curatorId ? { ...m, isStreaming: false, responseState: 'complete' } : m)); },
              signal: controller.signal });
          } catch (err) {
            if ((err as Error).name !== 'AbortError') {
              setMessages((prev) => prev.map(m => m.id === curatorId ? { ...m, content: `⚠️ ${(err as Error).message}`, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
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
            setMessages((prev) => [...prev, createStreamingMessage({ id: msgId, expertId: expert.id, round })]);
            let fullContent = '';
            try {
              await streamExpert({ question, expert: await buildExpertWithPrompt(expert, extra + lengthExtra), previousResponses: allResponses, round,
                onProgress: (progress) => updateMessageProgress(msgId, progress),
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
                    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, isStreaming: false, responseState: 'complete' } : m));
                  }
                },
                signal: controller.signal,
                files: filesToSend,
                preSearchContext: brainstormSearchCtx,
              });
            } catch (err) {
              if ((err as Error).name === 'AbortError') break;
              fullContent = `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`;
              setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: fullContent, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
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

      const activeHearingPhases = debateSettings.rounds <= 2
        ? [hearingPhases[0], hearingPhases[3]]
        : debateSettings.rounds === 3
          ? [hearingPhases[0], hearingPhases[1], hearingPhases[3]]
          : hearingPhases;

      // 검색 1회 실행 후 결과 공유
      const hearingSearchCtx = await fetchSearchContext(question);
      for (const phase of activeHearingPhases) {
        if (shouldStop()) break;
        const roundExperts = [...discussionExperts].sort(() => Math.random() - 0.5);
        setMessages(prev => [...prev, { id: `round-sep-hearing-${phase.label}-${Date.now()}`, expertId: '__round__', content: phase.label, round: phase.round }]);
        for (const expert of roundExperts) {
          if (shouldStop()) break;
          setActiveExpertId(expert.id);
          const instruction = phase.instruction.replace('{expertName}', expert.nameKo);
          const msgId = `${expert.id}-hearing-${phase.label}-${Date.now()}`;
          setMessages(prev => [...prev, createStreamingMessage({
            id: msgId,
            expertId: expert.id,
            round: phase.round,
            progress: getDefaultProgress('analyzing', {
              label: `${phase.label} 준비 중`,
              detail: '이 단계에서 물어볼 핵심 논점과 판단 기준을 정리하고 있습니다.',
            }),
          })]);
          let fullContent = '';
          try {
            await streamExpert({
              question,
              expert: await buildExpertWithPrompt(expert, '\n\n' + instruction + lengthExtra),
              previousResponses: allResponses, round: phase.round,
              onProgress: (progress) => updateMessageProgress(msgId, progress),
              onDelta: chunk => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
              onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false, responseState: 'complete' } : m)); },
              signal: controller.signal,
              files: filesToSend,
              preSearchContext: hearingSearchCtx,
              onSearchSources: (data) => {setMessages(prev => prev.map(m => m.id === msgId ? { ...m, searchSources: data } : m));},
            });
          } catch (err) {
            if ((err as Error).name === 'AbortError') break;
            fullContent = `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`;
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
          }
          allResponses.push({ name: `${expert.nameKo} (${phase.label})`, content: fullContent });
          await new Promise(r => setTimeout(r, DELAY_BETWEEN_ROUNDS));
        }
      }
    } else if (useMode === 'freetalk') {
      // Freetalk: AI group chat - short flowing messages
      const maxMessages = debateSettings.freetalkMessageCount || 30;
      let msgCount = 0;
      const freetalkToneMap: Record<string, string> = {
        'ultra-polite': '- 극존칭으로 매우 공손하게 말하세요. "~습니다", "~주시면 감사하겠습니다" 톤을 유지하세요.\n- 반박도 매우 정중하게 완곡하게 표현하세요.',
        polite: '- 정중한 존댓말로 말하세요.\n- 상대 의견을 존중하되, 필요한 반론은 차분하게 제시하세요.',
        natural: '- 자연스러운 대화체 존댓말로 말하세요.\n- 너무 딱딱한 보고서 말투를 피하고 편하게 이어가세요.',
        direct: '- 직설적이고 간결하게 말하세요.\n- 돌려 말하지 말고 핵심 주장과 반론을 바로 제시하세요.',
        aggressive: '- 공격적이고 날카로운 토론 톤으로 말하세요.\n- 상대 논리의 빈틈을 강하게 찌르되, 욕설/비하 표현은 쓰지 마세요.',
      };

      // System message + 주제 표시
      setMessages(prev => [...prev, {
        id: `system-freetalk-${Date.now()}`,
        expertId: '__round__',
        content: `💬 자유 토론 시작 · ${discussionExperts.length}명 참여 · 총 ${maxMessages}개 메시지`,
      }, {
        id: `freetalk-topic-${Date.now()}`,
        expertId: '__round__',
        content: `📌 ${question}`,
      }]);

      // 각 봇별 자유토론 프롬프트 생성 (기존 systemPrompt 위에 얹기)
      // AI별 종결어미 차별화
      const expertEndingStyles: Record<string, string> = {
        gpt: '종결어미: ~입니다, ~이죠, ~한 셈이죠. "~거든요"는 사용하지 마세요.',
        claude: '종결어미: ~거든요, ~인데요, ~잖아요. "~입니다"는 사용하지 마세요.',
        gemini: '종결어미: ~같아요, ~하죠, ~일 수도요. "~거든요"는 사용하지 마세요.',
        perplexity: '종결어미: ~인데, ~하거든, ~이야. 반말 데이터 분석가 톤.',
        grok: '종결어미: ~임, ~인 듯, ~아닐까. 직설적이고 짧게.',
        deepseek: '종결어미: ~합니다, ~하겠죠, ~일 겁니다. 차분한 분석 톤.',
        qwen: '종결어미: ~네요, ~하더라고요, ~보여요. 관찰자 시점 톤.',
      };
      const endingStyle = expertEndingStyles[expert.id] || '자연스러운 구어체로 말하되, 직전 발언자와 다른 종결어미를 사용하세요.';

      const buildFreetalkPrompt = async (expert: Expert) => {
        const basePrompt = await getExpertPrompt(expert);
        return `${basePrompt}

## 자유 토론 모드
"${question}" 주제로 다른 전문가들과 실시간 토론 중입니다.

### 1. 주제 집중
- "${question}"에 대한 직접적 의견·예측·분석만 말하세요.
- 구체적 수치, 사례, 데이터를 포함하세요.
- 자기 분야 자랑으로 주제를 이탈하지 마세요.

### 2. 대립과 긴장감 (가장 중요)
- **3번 발언 중 1번은 반드시 상대 의견에 정면 반박하세요.** "그건 다르게 봐야 합니다", "그 논리에는 허점이 있는데요" 수준으로 강하게.
- 동의할 때도 약점·예외·반례를 반드시 지적하세요. "맞지만 ~은 간과하고 있는데요"
- 빈 동의("좋은 지적입니다", "동의합니다") 절대 금지. 바로 새 내용으로 시작하세요.

### 3. 주제 확장
- 이미 나온 하위 주제를 반복하지 마세요. 같은 큰 주제의 **다른 측면**으로 확장하세요.
- 예: 유가 → 에너지 안보 → 환율 영향 → 소비자 물가 → 산업 구조조정 → 외교적 파급 (매번 다른 축)

### 4. 말투
- ${debateSettings.responseLength === 'short' ? '1~2문장. 3문장 이상 절대 금지.' : debateSettings.responseLength === 'long' ? '3~5문장. 구체적 근거와 예시를 포함.' : '1~3문장. 4문장 이상 절대 금지.'}
- ${endingStyle}
- **이모지 사용 금지.** 텍스트로만 소통하세요.
- 2~3턴에 한번은 **1문장 짧은 반박이나 질문만** 던지세요. 매번 긴 발언은 지루합니다.
${freetalkToneMap[debateSettings.freetalkTone || 'natural'] || freetalkToneMap.natural}

### 5. 절대 금지
- 상대방 호칭("~님", "~전문가님") 사용 금지. 바로 내용으로 시작.
- [역할명] 태그 포함 금지
- 이전 발언 앵무새 반복 금지
- "~에 대해 분석하겠습니다" 발표체 금지
- "~할 수 있다고 봐요"를 2회 이상 연속 사용 금지. 다른 종결어미를 쓰세요.`;
      };

      // 검색 1회 실행 후 결과 공유
      const freetalkSearchCtx = await fetchSearchContext(question);

      while (msgCount < maxMessages && !shouldStop()) {
        for (const expert of discussionExperts) {
          if (shouldStop() || msgCount >= maxMessages) break;

          const msgId = `${expert.id}-freetalk-${Date.now()}-${msgCount}`;
          setMessages(prev => [...prev, createStreamingMessage({
            id: msgId,
            expertId: expert.id,
            progress: getDefaultProgress('analyzing', {
              label: '자유 토론 발언의 논점과 근거를 선별하고 있습니다.',
              detail: '직전 대화 맥락에서 이번 턴의 핵심 쟁점을 추출하고 있습니다.',
            }),
          })]);
          setActiveExpertId(expert.id);

          let fullContent = '';
          const prevAll = allResponses.slice(-20);

          // 턴별 4단계 분기: 첫 턴 / 초반 / 중반 / 후반
          const questionForAI = msgCount === 0
            ? `주제: "${question}" — 이 주제에 대한 당신만의 강한 입장을 먼저 밝히세요. 수치나 근거를 포함하세요.`
            : msgCount <= 4
            ? `"${question}" — 직전 발언에 반응하되, 당신만의 근거와 데이터로 자기 입장을 강화하세요. 상대와 다른 점을 부각하세요.`
            : msgCount <= 8
            ? `"${question}" — 직전 발언의 논리적 허점이나 간과한 부분을 지적하세요. 지금까지 안 나온 새로운 팩트를 추가하세요. 같은 하위 주제 반복 금지.`
            : `"${question}" — 지금까지 논의에서 빠진 완전히 다른 각도를 제시하세요. 또는 1문장으로 핵심 반박만 던지세요.`;

          try {
            await streamExpert({
              question: questionForAI,
              expert: { ...expert, systemPrompt: await buildFreetalkPrompt(expert) },
              previousResponses: prevAll,
              round: 'initial',
              onProgress: (progress) => updateMessageProgress(msgId, progress),
              onDelta: chunk => {
                fullContent += chunk;
                setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m));
              },
              onDone: () => {
                setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false, responseState: 'complete' } : m));
              },
              signal: controller.signal,
              files: filesToSend,
              preSearchContext: freetalkSearchCtx,
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
        setMessages(prev => [...prev, createStreamingMessage({
          id: summaryId,
          expertId: SUMMARIZER_EXPERT.id,
          isSummary: true,
          progress: getDefaultProgress('finalizing', {
            label: '자유 토론 흐름을 종합 요약으로 정리하고 있습니다.',
            detail: '핵심 결론과 주요 쟁점을 계층화해 재구성하고 있습니다.',
          }),
        })]);
        let summaryContent = '';
        try {
          await streamExpert({
            question,
            expert: { ...SUMMARIZER_EXPERT, systemPrompt: `You are a conversation summarizer. Summarize the free-flowing AI group chat in Korean. Do NOT include a top-level title — the UI already shows a header. Start directly with the first ### section.

### 💡 핵심 결론
(대화에서 도출된 핵심 결론 2-3문장)

### 📌 주요 논점
1. **(논점)** — 설명
2. **(논점)** — 설명
3. **(논점)** — 설명

### 🎯 흥미로운 의견
- (눈에 띄는 의견 1)
- (눈에 띄는 의견 2)

Rules:
- "##" 레벨 제목 금지. "###" 레벨부터 시작.
- 한줄 요약, 종합 판정 금지.
- 한국어. 간결하게.` },
            previousResponses: allResponses,
            round: 'summary',
            onProgress: (progress) => updateMessageProgress(summaryId, progress),
            onDelta: chunk => { summaryContent += chunk; setMessages(prev => prev.map(m => m.id === summaryId ? { ...m, content: summaryContent } : m)); },
            onDone: () => { setMessages(prev => prev.map(m => m.id === summaryId ? { ...m, isStreaming: false, responseState: 'complete' } : m)); },
            signal: controller.signal,
          });
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            summaryContent = `⚠️ ${err instanceof Error ? err.message : '요약 생성 실패'}`;
            setMessages(prev => prev.map(m => m.id === summaryId ? { ...m, content: summaryContent, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
          }
        }
      }

    } else if (useMode === 'stakeholder') {
      const shSettings = stakeholderSettings;
      // question에서 scenarioId 추출 (타이밍 문제 방지)
      const simStartMatch = question.match(/^__SIM_START__:(.+)$/);
      const effectiveScenarioId = simStartMatch?.[1] || shSettings.scenarioId;
      const scenario = SIMULATION_SCENARIOS.find(s => s.id === effectiveScenarioId);
      if (!scenario) { setActiveExpertId(undefined); setIsDiscussing(false); return; }
      // scenarioId를 settings에도 반영
      if (simStartMatch) setStakeholderSettings(prev => ({ ...prev, scenarioId: effectiveScenarioId }));

      // prepAnswers → 사람이 읽을 수 있는 컨텍스트 문자열
      const prep = shSettings.prepAnswers || {};
      const prepEntries = Object.entries(prep).filter(([k, v]) => v && k !== '__context__' && k !== '__files__');
      const contextText = prep.__context__ || '';
      const filesContext = prep.__files__ || '';
      const simContextLines: string[] = [];
      for (const [key, val] of prepEntries) {
        const qDef = scenario.prepQuestions.find(q => q.id === key);
        simContextLines.push(`- ${qDef ? qDef.question : key}: ${val}`);
      }
      if (contextText) simContextLines.push(`- 추가 설명: ${contextText}`);
      let simContext = simContextLines.length > 0
        ? `\n[유저가 사전에 제공한 정보]\n${simContextLines.join('\n')}`
        : '';
      if (filesContext) {
        simContext += `\n\n[유저가 첨부한 참고 자료]\n${filesContext}\n\n(위 자료의 구체적 내용을 근거로 질문·반박하세요. "자소서 3문단의 X 부분은..." 처럼 인용하면 더 좋습니다.)`;
      }
      const answeredCount = prepEntries.length;
      const totalQuestions = scenario.prepQuestions.length;
      const infoLevel: 'full' | 'partial' | 'none' =
        (answeredCount >= Math.ceil(totalQuestions * 0.5) || contextText.length > 20 || filesContext.length > 100) ? 'full'
        : answeredCount > 0 ? 'partial'
        : 'none';

      // Fix currentQuestion for history
      setCurrentQuestion(`${scenario.icon} ${scenario.name}`);
      setCurrentQuestionDisplay(`${scenario.icon} ${scenario.name}`);
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

      // Fixed opening texts for scenarios (used when no user context provided)
      const fixedOpenings: Record<string, string> = {
        salary: '연봉 협상 자리에 오셨군요. 먼저, 이번에 인상을 요청하시게 된 배경이 궁금합니다. 최근 맡으셨던 프로젝트나 성과 중에서 특별히 강조하고 싶은 부분이 있으신가요?',
        parent_meeting: '선생님, 오늘 상담 잡아주셔서 감사합니다. 저희 아이 건으로 왔는데, 정확히 어떤 상황인지 선생님 입장에서 먼저 설명해주시겠어요? 집에서 들은 이야기와 좀 다를 수도 있으니까요.',
        regulation: '해당 사업에 대한 검토를 시작하겠습니다. 먼저 현행 규제 체계 내에서 귀사의 서비스가 어떤 분류에 해당하는지 설명해주시죠. 인허가 요건을 충족하고 있다고 보시는 근거도 함께 말씀해주십시오.',
        partnership: '제안서는 잘 봤습니다. 솔직히 기술적으로 흥미로운 부분이 있긴 한데, 우리 입장에서 왜 지금 이 제휴를 해야 하는지가 아직 명확하지 않아요. 귀사 기술이 우리 사업에 가져올 구체적인 가치를 설명해주시겠습니까?',
        budget: '내년도 예산안 발표를 시작하겠습니다. 올해 전사적으로 비용 효율화를 추진하고 있는 건 아시죠? 그런 상황에서 증액을 요청하신 근거를 먼저 듣고 싶습니다. 숫자 기반으로 부탁드립니다.',
        committee: '과제 발표를 시작해주시죠. 먼저 이 연구의 핵심 가설과 기존 연구 대비 차별점을 간결하게 설명해주십시오. 연구 계획서는 읽었지만, 직접 들어보고 싶습니다.',
        startup_pitch: '안녕하세요, 오늘 피칭 기대하고 있었습니다. 먼저 팀 소개와 함께, 이 문제를 왜 지금 풀어야 하는지부터 말씀해주시죠. 시장 타이밍이 궁금합니다.',
        medical_consult: '어서 오세요. 오늘 어떤 증상 때문에 오셨나요? 편하게 말씀해주시면 됩니다. 언제부터 시작됐는지도 함께 알려주시면 진료에 도움이 됩니다.',
        wedding_plan: '축하드려요! 결혼 준비 상담이시군요. 먼저 대략적인 결혼 시기와 예산 범위를 알려주시면, 거기에 맞춰서 효율적인 플랜을 짜드릴게요.',
        school_bully: '선생님, 저희 아이가 학교에서 계속 괴롭힘을 당하고 있다고 합니다. 어떤 상황인지 정확히 알고 싶어서 왔어요. 학교에서는 파악하고 계셨나요?',
        estate_dispute: '형님/언니가 부모님 돌봄을 많이 하신 건 저도 알아요. 근데 그렇다고 유산을 혼자 다 가져가는 건 다른 문제 아닌가요? 법적으로 저도 상속 권리가 있잖아요.',
        franchise_consult: '반갑습니다! 저희 브랜드에 관심 가져주셔서 감사합니다. 현재 전국 200개 가맹점을 운영 중이고, 평균 월 매출이 3,500만원 수준입니다. 어떤 지역에서 창업을 생각하고 계신가요?',
        tenant_dispute: '보증금 반환 문제로 오셨군요. 계약서를 먼저 보여주시겠어요? 계약 만료일과 현재 보증금 현황을 확인해야 정확한 상황 파악이 됩니다.',
        career_change: '이직을 고민하고 계시군요. 먼저 현재 회사에서의 연차, 직무, 그리고 이직을 생각하게 된 가장 큰 이유를 말씀해주시겠어요? 시장 상황과 맞춰서 조언드리겠습니다.',
        insurance_claim: '보험금 청구 건으로 오셨군요. 먼저 해당 보험 약관을 확인하겠습니다. 사고 발생 일시와 경위, 그리고 청구하신 보험금 항목을 구체적으로 말씀해주시겠습니까?',
        neighborhood: '윗집에서 소음이 심하다고요? 우리도 나름대로 조심하고 있는데... 구체적으로 어떤 소리가 언제 들린다는 건지 먼저 말씀해주시겠어요? 솔직히 좀 억울한 부분도 있거든요.',
        immigration: '이민 상담이시군요. 먼저 희망하시는 국가와 이민 목적을 말씀해주세요. 국가별로 비자 종류와 자격 요건이 완전히 다르기 때문에, 정확한 상황을 알아야 맞춤 안내가 가능합니다.',
        influencer_crisis: '급하게 연락 왔습니다. 지금 온라인에서 관련 글이 빠르게 퍼지고 있어요. 먼저 정확히 어떤 상황인지, 사실관계를 저한테 솔직하게 다 말씀해주세요. 대응 전략을 짜려면 진실부터 알아야 합니다.',
        divorce_mediation: '두 분의 상황을 정리하기 위해 먼저 말씀을 드리겠습니다. 조정 과정은 양측 모두의 이야기를 충분히 듣는 것에서 시작합니다. 편하게 현재 상황과 가장 걱정되시는 부분부터 말씀해주시겠어요?',
        elderly_care: '안녕하세요, 요양보호사입니다. 어르신 상태에 대해 정확히 파악해야 가장 적합한 돌봄 방향을 제안드릴 수 있어요. 현재 부모님의 건강 상태와 일상생활 가능 정도를 먼저 말씀해주시겠어요?',
        whistleblower: '이 건은 조심스럽게 진행해야 합니다. 혹시 뭘 봤는지는 아직 아무한테도 이야기 안 했지? 일단 감정적으로 행동하면 불리해지니까, 무슨 일이 있었는지 나한테만 정확하게 말해봐.',
        debt_crisis: '먼저 심호흡 한번 하시고, 현재 상황을 정리해보겠습니다. 채무 문제는 정확한 현황 파악이 첫 번째입니다. 총 빚이 얼마인지, 어디어디에서 빌리셨는지, 월 상환액이 얼마인지 말씀해주세요. 해결 방법은 분명히 있습니다.',
        child_custody: '양육권 관련 가정조사를 위해 먼저 몇 가지 여쭤보겠습니다. 현재 자녀분과 함께 생활하고 계신가요? 그리고 일상적인 양육 환경, 자녀의 학교생활, 건강 상태에 대해 편하게 말씀해주세요.',
        workplace_harassment: '이야, 그게 무슨 소리야? 내가 언제 널 괴롭혔다는 거야? 업무 지시를 한 건데 그걸 괴롭힘이라고? 좀 예민한 거 아닌가? 일단 이거 정확하게 어떤 상황을 말하는 건지 들어보자.',
        medical_decision: '보호자분, 환자분의 현재 상태와 수술에 대해 상세히 설명드리겠습니다. 먼저 검사 결과를 함께 보시면서, 왜 수술이 필요한지와 예상되는 결과에 대해 말씀드릴게요. 궁금하신 점은 언제든 질문해주세요.',
        startup_cofounder: '이제 솔직하게 이야기하자. 나도 이 회사에 지난 2년간 전부를 쏟아부었어. 근데 지금 상황이 공평하다고 생각해? 역할이나 기여도에 비해서 내가 받는 게 맞는 건지, 진지하게 얘기해보자.',
        school_transfer: '학부모님, 먼저 아이 상황에 대해 말씀해주셔서 감사합니다. 제가 담임으로서 파악하고 있는 부분도 있고, 모르는 부분도 있을 수 있어요. 구체적으로 어떤 점이 가장 걱정되시는지 말씀해주시겠어요?',
        contract_negotiation: '제안서는 검토했습니다. 솔직히 말씀드리면, 현재 납품 단가로는 저희 내부 기준에 맞지 않습니다. 시장에 동급 공급사가 여럿 있는 것도 아시죠? 어디까지 조정이 가능하신지 들어보겠습니다.',
        mental_health: '와주셔서 감사합니다. 이렇게 도움을 요청하시는 것 자체가 용기 있는 첫걸음이에요. 오늘은 편하게 이야기하시면 됩니다. 요즘 가장 힘드신 부분이 어떤 건지, 천천히 말씀해주시겠어요?',
        inheritance_plan: '어르신, 먼저 현재 보유하고 계신 재산의 전체 그림을 그려보겠습니다. 부동산, 금융자산, 기타 자산을 종류별로 정리해야 정확한 세금 시뮬레이션이 가능합니다. 대략적인 규모부터 말씀해주시겠어요?',
      };

      // First AI asks the opening question naturally
      const firstRole = scenario.roles[0];
      const firstExpert = experts.find(e => e.id === finalAssignments[firstRole.name]);

      if (firstExpert) {

        const introMsgId = `${firstExpert.id}-intro-${Date.now()}`;
        setMessages(prev => [...prev, createStreamingMessage({
          id: introMsgId,
          expertId: firstExpert.id,
          simRoleName: firstRole.name,
          simRoleIcon: firstRole.icon,
          progress: getDefaultProgress('analyzing', {
            label: '초기 질문의 맥락과 개입 방향을 설정하고 있습니다.',
            detail: '상황 설정과 제공 정보를 바탕으로 첫 턴의 질문 전략을 정리하고 있습니다.',
          }),
        })]);
        setActiveExpertId(firstExpert.id);

        const fixedText = (infoLevel === 'none') ? fixedOpenings[scenario.id] : undefined;

        if (fixedText) {
          // Use fixed opening text for a snappy start
          setMessages(prev => prev.map(m => m.id === introMsgId ? { ...m, content: fixedText, isStreaming: false, responseState: 'complete' } : m));
        } else {
          const intensityDesc = shSettings.intensity <= 3 ? '건설적이고 우호적으로' : shSettings.intensity <= 6 ? '균형 잡힌 톤으로' : '날카롭고 도전적으로';

          const infoInstruction = infoLevel === 'full'
            ? `유저가 충분한 정보를 제공했습니다. 자기소개를 한 문장으로 하고, 제공된 정보를 바탕으로 바로 본론에 맞는 심층적 첫 질문이나 의견을 제시하세요. "어떤 사업인가요?" 같은 이미 답변된 기본 질문은 절대 하지 마세요.`
            : infoLevel === 'partial'
            ? `유저가 일부 정보만 제공했습니다. 자기소개를 한 문장으로 하고, 이미 알고 있는 정보를 언급하면서 부족한 부분만 자연스럽게 추가 질문하세요.`
            : `유저가 아직 구체적 정보를 제공하지 않았습니다. 자기소개를 한 문장으로 하고, 시뮬레이션 진행에 필요한 핵심 정보를 자연스럽게 물어보세요.`;

          const openingPrompt = `당신은 "${scenario.name}" 시뮬레이션에서 "${firstRole.name}" 역할입니다.
핵심 관심사: ${firstRole.focus}
${intensityDesc} 말하세요. 한국어. 대화체.
${simContext}

${infoInstruction}
3~4문장 이내로 짧게.`;

          let fullContent = '';
          try {
            await streamExpert({
              question: '시뮬레이션을 시작합니다.',
              expert: { ...firstExpert, systemPrompt: openingPrompt },
              previousResponses: [],
              round: 'initial' as any,
              onProgress: (progress) => updateMessageProgress(introMsgId, progress),
              onDelta: chunk => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === introMsgId ? { ...m, content: fullContent } : m)); },
              onDone: () => { setMessages(prev => prev.map(m => m.id === introMsgId ? { ...m, isStreaming: false, responseState: 'complete' } : m)); },
              signal: controller.signal,
            });
          } catch (err) {
            fullContent = `⚠️ ${err instanceof Error ? err.message : '시뮬레이션 시작 응답을 받아오지 못했어요.'}`;
            setMessages(prev => prev.map(m => m.id === introMsgId ? { ...m, content: fullContent, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
          }
        }
      }

      setIsDiscussing(false);
      setActiveExpertId(undefined);
      return;
    } else if (useMode === 'assistant') {
      const assistantCard = findAssistantCardById(selectedAssistantCardRef.current);
      if (!assistantCard) {
        setMessages([{
          id: `assistant-select-${Date.now()}`,
          expertId: '__round__',
          content: '⚠️ 먼저 사용할 어시스턴트를 선택해주세요.',
        }]);
      } else if (assistantCard.runtime === 'chat') {
        await runAssistant({
          question,
          card: assistantCard,
          signal: controller.signal,
        });
      }
      setActiveExpertId(undefined);
      setIsDiscussing(false);
      setStopRequested(false);
      // 저장은 대화 완료 시 upsert로 처리
      return;
    }

    if (!shouldStop() && debateSettings.includeConclusion && useMode !== 'freetalk') {
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
      setMessages((prev) => [...prev, createStreamingMessage({
        id: summaryId,
        expertId: SUMMARIZER_EXPERT.id,
        isSummary: true,
        progress: getDefaultProgress('finalizing', {
          label: '토론 전체를 종합 결론으로 구조화하고 있습니다.',
          detail: '공통 판단과 입장 차이를 통합해 최종 결론을 구성하고 있습니다.',
        }),
      })]);
      let summaryContent = '';
      try {
        await streamExpert({
          question, expert: { ...SUMMARIZER_EXPERT, systemPrompt: isBrainstormConclusion ? brainstormSummaryPrompt : `You are a debate summarizer. Create a well-structured Korean summary. Do NOT include a top-level title — the UI already shows "토론 정리" as a header. Start directly with the first section.

### 💡 핵심 결론
(질문에 대한 직접적 답변 2-3문장. 모든 전문가의 관점을 종합한 최종 답변.)

### 📌 주요 논점
1. **(논점 제목)** — 전문가들의 입장 차이와 근거. 합의 또는 대립 포인트.
2. **(논점 제목)** — 설명
3. **(논점 제목)** — 설명

### 🎯 실행 제안
- (구체적이고 실행 가능한 제안 1)
- (구체적이고 실행 가능한 제안 2)
- (구체적이고 실행 가능한 제안 3)

Rules:
- "## 토론 정리" 같은 최상위 제목을 절대 쓰지 마세요. ### 레벨 섹션부터 시작하세요.
- 한줄 요약, 종합 판정 섹션은 만들지 마세요.
- 논점은 전문가 이름을 포함하여 구체적으로.
- 테이블 금지. 글머리 기호만 사용.
- 각 논점은 2-3문장 이내. 간결하게.
- 한국어로 작성.` },
          previousResponses: allResponses, round: 'summary',
          onProgress: (progress) => updateMessageProgress(summaryId, progress),
          onDelta: (chunk) => {summaryContent += chunk;setMessages((prev) => prev.map((m) => m.id === summaryId ? { ...m, content: summaryContent } : m));},
          onDone: () => {setMessages((prev) => prev.map((m) => m.id === summaryId ? { ...m, isStreaming: false, responseState: 'complete' } : m));},
          signal: controller.signal });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          summaryContent = `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`;
          setMessages((prev) => prev.map((m) => m.id === summaryId ? { ...m, content: summaryContent, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
        }
      }

      // 최종 결론은 토론 정리에 통합됨 — 별도 호출 불필요
    }

    setActiveExpertId(undefined);
    setIsDiscussing(false);
    setStopRequested(false);
  }, [experts, selectedExpertIds, discussionMode, debateSettings, stakeholderSettings, activeAivsBattleConfig, selectedFramework, runAssistant]);

  const runDiscussionWithUsage = useCallback(async (
    question: string,
    overrideExpertIds?: string[],
    overrideMode?: DiscussionMode,
    displayQuestion?: string,
  ) => {
    const useMode = overrideMode || discussionMode;
    const useIds = overrideExpertIds || selectedExpertIds;
    const assistantCardId = useMode === 'assistant' ? selectedAssistantCardRef.current ?? undefined : undefined;
    const expertCount = useMode === 'assistant'
      ? (assistantCardId ? 1 : 0)
      : useIds.length;

    try {
      await runDiscussion(question, overrideExpertIds, overrideMode, displayQuestion);
      void logUsageEvent({
        mode: useMode,
        status: 'success',
        metadata: {
          expertCount,
          questionLength: question.length,
          mainMode: getMainMode(useMode),
          assistantCardId,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      void logUsageEvent({
        mode: useMode,
        status: 'error',
        metadata: {
          expertCount,
          questionLength: question.length,
          mainMode: getMainMode(useMode),
          assistantCardId,
          error: errorMessage,
        },
      });
      throw error;
    }
  }, [discussionMode, logUsageEvent, runDiscussion, selectedExpertIds]);

  const handleAssistantSubmit = useCallback((cardId: string, question: string) => {
    setSelectedAssistantCard(cardId);
    void runDiscussionWithUsage(question, undefined, 'assistant');
  }, [runDiscussionWithUsage, setSelectedAssistantCard]);

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
        suggestions: mode === 'procon' ? [
          { topic: `${input}에 찬성하는가?`, description: '찬성: 긍정적 효과 vs 반대: 부작용·리스크' },
          { topic: `${input}을(를) 허용해야 하는가?`, description: '찬성: 자유·권리 vs 반대: 규제·안전' },
          { topic: `${input}은(는) 득보다 실이 많은가?`, description: '찬성: 실익 부족 vs 반대: 장기적 이득' },
        ] : [
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

    // "심층 리서치"(auto-gpt) 전문가 선택 시 → research 모드 전환 + Clarifier로 질문 전달
    const effectiveExpertIds = overrideExpertIds ?? selectedExpertIds;
    if (useMode === 'general' && effectiveExpertIds.includes('auto-gpt')) {
      setResearchInitialQuestion(question);
      setDiscussionMode('research');
      return;
    }

    if (useMode === 'aivsuser' && !activeAivsBattleConfig) {
      setMessages([{
        id: `avsu-start-required-${Date.now()}`,
        expertId: '__round__',
        content: '⚠️ 먼저 배틀 시작 버튼에서 주제와 규칙을 정해주세요.',
      }]);
      return;
    }
    const debateModes = ['standard', 'procon', 'brainstorm', 'hearing', 'freetalk', 'aivsuser'];
    if (debateModes.includes(useMode) && useMode !== 'brainstorm' && useMode !== 'aivsuser') {
      clarifyTopic(question, useMode);
      return;
    }
    runDiscussionWithUsage(question, overrideExpertIds, overrideMode);
  }, [discussionMode, clarifyState.show, clarifyTopic, runDiscussionWithUsage, activeAivsBattleConfig, selectedExpertIds]);

  const startDiscussionWithFiles = useCallback((question: string, files: AttachedFile[], overrideExpertIds?: string[], overrideMode?: DiscussionMode) => {
    pendingFilesRef.current = files;
    startDiscussion(question, overrideExpertIds, overrideMode);
  }, [startDiscussion]);

  const allExperts = [...experts, ...ASSISTANT_EXPERTS, SUMMARIZER_EXPERT, CONCLUSION_EXPERT];
  const isDone = messages.length > 0 && !isDiscussing;
  const selectable = !isDiscussing && messages.length === 0;
  const hasUserMessageInThread = messages.some((message) => message.expertId === '__user__');

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
  const getChatVariant = (msg: DiscussionMessage): ChatVariant => getDiscussionChatVariant({
    discussionMode,
    expertId: msg.expertId,
    proconStances,
  });

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

    const msgCount = messages.filter(m => m.expertId !== '__summary__' && m.expertId !== '__round__' && m.content).length;
    const isDeep = msgCount >= 8;

    const summaryPrompt = `당신은 맥킨지 출신 시니어 컨설턴트입니다. 아래 대화를 분석하여 브리핑 노트를 작성하세요.

## 당신의 역할
이 대화를 직접 보지 않은 의사결정자에게 3분 안에 브리핑할 자료를 만드세요.
- "무슨 얘기를 했는가"가 아니라 **"그래서 무엇을 알게 되었고, 다음에 뭘 해야 하는가"**에 집중
- 대화 속 사실(fact)과 의견(opinion)을 구분
- 수치·법령·고유명사·구체적 사례는 반드시 보존
- 모호한 표현("다양한", "여러 가지") 대신 구체적으로
- 대화 주제가 여러 개면 가장 실질적인 주제 1~2개만 추려서 깊게

## 포맷 규칙
1. "**키워드**: 핵심 내용" 개괄식만 사용. 줄줄 이어지는 문장 금지.
2. 불릿("- ") 하나에 한 포인트만. 불릿 안에서 줄바꿈 금지.
3. 섹션 제목(###) 앞뒤 빈 줄 필수.
4. 해당 없는 섹션은 아예 출력하지 마세요. "(없음)" 절대 금지.
5. 이모지는 섹션 제목에만. 본문에는 사용 금지.

## 출력 형식

### 📌 핵심 한줄

- (이 대화의 결론을 한 문장으로. "~에 대해 논의함" 같은 설명이 아니라 결론 자체를 쓰세요)

### 💡 주요 발견${isDeep ? ' (상세)' : ''}

- **키워드**: 내용 — 근거/수치 포함 (왜 이게 중요한지 한마디 덧붙이기)
- (${isDeep ? '5~8개' : '3~5개'}, 중요도순)

### 🎯 추천 다음 행동

- **키워드**: 구체적이고 즉시 실행 가능한 액션 (누가/무엇을/언제)
- (1~3개. 일상 대화처럼 액션이 없으면 이 섹션 생략)

${isDeep ? `### ⚠️ 주의할 점

- **키워드**: 대화에서 드러난 리스크, 전제 조건, 또는 검증이 필요한 부분
- (1~3개. 해당 없으면 생략)

` : ''}### 🔭 추가 탐구

- **키워드**: 이 대화에서 다루지 못했지만 알아두면 좋을 후속 주제
- (1~2개. 해당 없으면 생략)

대화 내용:
${conversationText}`;

    try {
      const chatResp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: '맥킨지 출신 시니어 컨설턴트. 의사결정자 브리핑용 노트 작성. "무슨 얘기를 했나"가 아니라 "그래서 뭘 알게 됐고, 다음에 뭘 해야 하나"에 집중. 사실과 의견 구분. 수치·법령·고유명사 절대 보존. 개괄식("**키워드**: 핵심") 전용, 문장형 금지. h3+불릿만. 한국어.',
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
              const geminiText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
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
    setMessages(prev => [...prev, createStreamingMessage({
      id: conclusionId,
      expertId: CONCLUSION_EXPERT.id,
      isSummary: true,
      progress: getDefaultProgress('finalizing', {
        label: '여러 의견을 하나의 결론으로 묶고 있어요.',
        detail: '중복을 덜고 바로 쓸 수 있는 결론으로 정리합니다.',
      }),
    })]);
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
        onProgress: (progress) => updateMessageProgress(conclusionId, progress),
        onDelta: chunk => { conclusionContent += chunk; setMessages(prev => prev.map(m => m.id === conclusionId ? { ...m, content: conclusionContent } : m)); },
        onDone: () => { setMessages(prev => prev.map(m => m.id === conclusionId ? { ...m, isStreaming: false, responseState: 'complete' } : m)); },
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(prev => prev.map(m => m.id === conclusionId ? { ...m, content: `⚠️ 결론 생성 실패`, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
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
  const { autoSaveCurrentChat, loadHistory } = useDiscussionHistoryPersistence({
    messages,
    currentQuestion,
    currentQuestionDisplay,
    discussionMode,
    selectedExpertIds,
    selectedAssistantCardId,
    proconStances,
    isDiscussing,
    sessionIdRef,
    sessionTitleRef,
    summaryCountRef,
    skipClarifyRef,
    setCurrentQuestion,
    setCurrentQuestionDisplay,
    setMessages,
    setDiscussionMode,
    setSelectedExpertIds,
    setSelectedAssistantCard,
    setProconStances,
    setIsDiscussing,
    setActiveExpertId,
    abortCurrentDiscussion: () => {
      abortControllerRef.current?.abort();
    },
  });
  const MAX_CLARIFY_ATTEMPTS = 1;
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
    expertIds?: string[];
  } | null>(null);

  // After battle config is set, auto-start with AI provocation opening
  useEffect(() => {
    if (aivsBattleAutoStart > 0) {
      skipClarifyRef.current = true;
      startDiscussion('');
    }
  }, [aivsBattleAutoStart]);

  // Multi AI view state
  const [multiActiveTab, setMultiActiveTab] = useState<string | null>(null);
  const [multiView, setMultiView] = useState<'overview' | 'detail'>('overview');
  const [proconActiveRound, setProconActiveRound] = useState(0);
  const [stdActiveRound, setStdActiveRound] = useState(0);
  const [proconFocusSide, setProconFocusSide] = useState<null | 'pro' | 'con'>(null);

  // Auto-scroll to latest round tab during streaming
  useEffect(() => {
    if (isDiscussing && messages.length > 0) {
      const roundCount = messages.filter(m => m.expertId === '__round__').length;
      if (roundCount > 0) {
        setProconActiveRound(prev => Math.max(prev, roundCount - 1));
        setStdActiveRound(prev => Math.max(prev, roundCount - 1));
      }
    }
  }, [isDiscussing, messages]);
  const [questionExpanded, setQuestionExpanded] = useState(false);
  const [followUpTarget, setFollowUpTarget] = useState<string | null>(null); // null = 전체, id = 특정 전문가

  const [multiFollowUpTargetIds, setMultiFollowUpTargetIds] = useState<string[]>([]);
  const [sampleQuestionValue, setSampleQuestionValue] = useState<string>('');
  const [activeGame, setActiveGame] = useState<{ id: string; option: string; label: string } | null>(null);

  const selectedMultiFollowUpExperts = activeExperts.filter((expert) => multiFollowUpTargetIds.includes(expert.id));

  useEffect(() => {
    if (discussionMode !== 'multi') {
      setMultiFollowUpTargetIds((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    setMultiFollowUpTargetIds((prev) => {
      const validIds = prev.filter((id) => activeExperts.some((expert) => expert.id === id));
      if (validIds.length === prev.length && validIds.every((id, index) => id === prev[index])) {
        return validIds.length > 0 ? prev : (activeExperts[0] ? [activeExperts[0].id] : prev);
      }

      return validIds.length > 0 ? validIds : (activeExperts[0] ? [activeExperts[0].id] : validIds);
    });
  }, [discussionMode, activeExperts]);

  const toggleMultiFollowUpTarget = useCallback((expertId: string) => {
    setMultiFollowUpTargetIds((prev) => {
      if (prev.includes(expertId)) {
        return prev.length === 1 ? prev : prev.filter((id) => id !== expertId);
      }

      return [...prev, expertId];
    });
  }, []);


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

  // Settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  useEffect(() => {
    const handler = () => setShowSettingsModal(true);
    window.addEventListener('personai:open-settings', handler);
    return () => window.removeEventListener('personai:open-settings', handler);
  }, []);

  // Ask single AI follow-up (multi mode)
  const askSingleAI = useCallback(async (expertId: string, followUpQ: string) => {
    if (isDiscussing) return;
    const expert = experts.find(e => e.id === expertId);
    if (!expert) return;
    const followUpFiles = pendingFilesRef.current;
    pendingFilesRef.current = [];
    const followUpFilesToSend = followUpFiles.length > 0 ? followUpFiles.map(f => ({
      name: f.name,
      mimeType: f.mimeType,
      base64: f.base64,
      extractedText: f.extractedText,
    })) : undefined;
    const followUpFilesBadges = followUpFiles.length > 0 ? followUpFiles.map(f => ({
      name: f.name,
      mimeType: f.mimeType,
      preview: f.preview,
    })) : undefined;
    setIsDiscussing(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setActiveExpertId(expert.id);
    const prevResponses = messages.filter(m => m.expertId === expertId && m.content).map(m => ({ name: expert.nameKo, content: m.content }));
    const msgId = `${expertId}-followup-${Date.now()}`;
    setMessages(prev => [...prev,
      {
        id: `user-debate-followup-${Date.now()}`,
        expertId: '__user__',
        content: `💬 ${expert.nameKo}에게: ${followUpQ}`,
        isDirectFollowUp: true,
        attachedFiles: followUpFilesBadges,
      },
      createStreamingMessage({ id: msgId, expertId, isDirectFollowUp: true })
    ]);
    let fullContent = '';
    try {
      await streamExpert({ question: followUpQ, expert: await buildExpertWithPrompt(expert, '\n\n이전에 이 주제에 대해 답변한 적이 있습니다. 사용자의 추가 질문에 이전 답변을 바탕으로 더 깊이 답변해주세요.'),
        previousResponses: prevResponses, round: 'initial',
        onProgress: (progress) => updateMessageProgress(msgId, progress),
        onDelta: chunk => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
        onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false, responseState: 'complete' } : m)); },
        signal: controller.signal,
        files: followUpFilesToSend,
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: `⚠️ ${(err as Error).message}`, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
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
      const expert = mode === 'general'
        ? pickGeneralImageExpert(activeExperts[0], experts, question, messages)
        : activeExperts[0];
      if (!expert) return;

      if (mode === 'general') {
        const recentImage = findLatestGeneratedImage(messages);
        const imageIntent = detectGeneralImageIntent(question, {
          files: followUpFiles,
          hasRecentGeneratedImage: Boolean(recentImage),
        });

        if (imageIntent) {
          await runGeneralImageTurn({
            question,
            expert,
            previousMessages: buildGeneralImageHistory(messages, allExperts),
            userMessage: {
              id: `user-${Date.now()}`,
              expertId: '__user__',
              content: question,
              attachedFiles: followUpFilesBadges,
            },
            sourceFiles: followUpFilesToSend,
            recentImageDataUrl: imageIntent === 'edit' ? recentImage?.dataUrl : undefined,
            mode: imageIntent,
          });
          return;
        }
      }

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
        createStreamingMessage({ id: replyId, expertId: expert.id })
      ]);

      let fullContent = '';
      try {
      const followUpExpert = isManagedAutoAgent(expert.id)
          ? await buildExpertWithPrompt(
              expert,
              `${buildAgentResponsePrompt({
                agentId: expert.id,
                phase: 'direct',
                intent: inferAgentIntent(question),
              })}\n\n이전 대화 맥락을 참고하여 후속 질문에 답변하세요.`,
            )
          : expert;

        await streamExpert({
          question, expert: followUpExpert,
          previousResponses: prevResponses, round: 'initial',
          onProgress: (progress) => updateMessageProgress(replyId, progress),
          onDelta: chunk => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === replyId ? { ...m, content: fullContent } : m)); },
          onDone: () => { setMessages(prev => prev.map(m => m.id === replyId ? { ...m, isStreaming: false, responseState: 'complete' } : m)); },
          signal: controller.signal,
          files: followUpFilesToSend,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setMessages(prev => prev.map(m => m.id === replyId ? { ...m, content: `⚠️ ${(err as Error).message}`, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
        }
      }
      setActiveExpertId(undefined);
      setIsDiscussing(false);
      return;
    }

    // ═══ AI vs User — 자유 티키타카 ═══
    if (discussionMode === 'aivsuser') {
      const battleConfig = activeAivsBattleConfig;
      if (!battleConfig) {
        setMessages(prev => [...prev, {
          id: `avsu-config-missing-${Date.now()}`,
          expertId: '__round__',
          content: '⚠️ 배틀 설정을 다시 시작해주세요. 현재 대결 설정이 비어 있어요.',
        }]);
        setIsDiscussing(false);
        setActiveExpertId(undefined);
        return;
      }
      const verdictMode = battleConfig.verdictMode;
      // 종료 트리거
      if (question === '__AVSU_END__') {
        if (verdictMode === 'none') {
          setMessages(prev => [...prev, {
            id: `avsu-ended-${Date.now()}`,
            expertId: '__round__',
            content: '🧾 자유 대결이 종료되었습니다. 승패 판정 없이 대화를 마무리했어요.',
          }]);
          setIsDiscussing(false);
          setActiveExpertId(undefined);
          return;
        }
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
              topic: battleConfig.topicTitle,
              round: 1,
              totalRounds: 1,
              userStance: battleConfig.userStance,
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
      const battleAi = BATTLE_AI_CHARACTERS.find(a => a.id === battleConfig.battleAiId) || BATTLE_AI_CHARACTERS[0];
      const battleLevel = debateSettings.aivsUserBattleLevel || 3;
      const difficulty = battleLevel >= 4 ? 'hard' : battleLevel <= 2 ? 'easy' : 'normal';
      const turnNum = aivsRound + 1;
      setAivsRound(turnNum);

      // 유저 메시지 추가
      const userMsgId = `avsu-user-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: userMsgId,
        expertId: '__user__',
        content: question,
        timestamp: Date.now(),
        attachedFiles: followUpFilesBadges,
      }]);

      // 대화 기록
      const allMsgs = [...messages, { id: userMsgId, expertId: '__user__', content: question }];
      const convHistory = allMsgs
        .filter(m => m.expertId !== '__round__' && m.expertId !== '__avsu_judge__' && m.content)
        .map(m => m.expertId === '__user__' ? { speaker: '유저', content: m.content } : { speaker: m.simRoleName || allExperts.find(e => e.id === m.expertId)?.nameKo || 'AI', content: m.content });

      const topic = battleConfig.topicTitle;
      const stanceKo = battleConfig.userStance === 'pro' ? '찬성' : '반대';
      const aiStanceKo = battleConfig.userStance === 'pro' ? '반대' : '찬성';
      const levelDescs: Record<number, string> = {
        1: '\n강도: 입문. 친절하게 반론. 상대 주장의 좋은 점을 인정하면서 부드럽게 다른 관점을 제시. 초보자도 편하게 대응 가능.',
        2: '\n강도: 초급. 예의 바르지만 논리적으로 반박. 허점을 지적하되 상대가 배울 수 있게.',
        3: '\n강도: 중급. 날카롭게 반론. 상대 약점을 정확히 파고들되 대응할 여지는 남겨둬.',
        4: '\n강도: 고급. 공격적으로 반박. 상대 논리를 다각도로 해체하고 퇴로를 차단해.',
        5: '\n강도: 극한. 전력을 다해 싸워. 한 치의 양보도 없이. 상대가 반박할 틈을 주지 마. 모든 허점을 파고들어.',
      };
      const levelDesc = levelDescs[battleLevel] || levelDescs[3];
      const difficultyDesc = battleAi.personality + levelDesc;
      const opponentCount = battleConfig.opponentCount;

      // 선택된 AI 상대들 (위에서 클릭한 AI)
      const aiOpponents = activeExperts.length > 0
        ? activeExperts.filter(e => battleConfig.opponentIds.includes(e.id)).slice(0, opponentCount)
        : [experts.find(e => e.id === 'gemini') || experts.find(e => e.category === 'ai') || experts[0]].filter(Boolean);

      // 각 AI가 순서대로 반론 (티키타카)
      for (let ri = 0; ri < aiOpponents.length; ri++) {
        if (controller.signal.aborted) break;
        const aiExpert = aiOpponents[ri];
        if (!aiExpert) continue;

        const aiPrompt = `당신은 "${battleAi.name}"입니다. "${topic}" 주제에서 "${aiStanceKo}" 입장으로 유저와 싸우고 있습니다.

## 말투: ${difficulty === 'easy' ? '친근' : difficulty === 'hard' ? '공격적' : '논리적'}
${difficultyDesc}

## 유저 입장: ${stanceKo}
## 승패 판정 방식: ${verdictMode === 'final' ? '마지막에 승패 판정 있음' : '판정 없는 자유 대결'}
## 유저가 방금 한 말: "${question}"

## 대화 맥락 (최근 내용)
${convHistory.slice(-10).map(m => `[${m.speaker}] ${m.content}`).join('\n')}

## 행동 규칙
1. 유저가 방금 한 말에 바로 반응해. 인용하면서 반박
2. ${debateSettings.responseLength === 'short' ? '1~2문장으로 아주 짧고 강하게.' : debateSettings.responseLength === 'long' ? '4~6문장으로 근거를 들어 상세하게.' : '2~4문장으로 짧고 강하게.'} 댓글 싸움 톤
3. "~라고?" "그건 아닌데" "말이 안 되는 게" 같은 구어체 OK
4. 새 논점 하나는 꼭 던져
5. ${aiOpponents.length > 1 ? '다른 AI의 발언과 겹치지 않게 다른 각도에서 공격' : '다양한 각도에서 공격'}
6. 역할명이나 태그 본문에 포함 금지
7. 한국어로`;

        if (ri > 0) await new Promise(r => setTimeout(r, 200));
        const aiMsgId = `avsu-ai-${ri}-${Date.now()}`;
        setMessages(prev => [...prev, createStreamingMessage({
          id: aiMsgId,
          expertId: aiExpert.id,
          simRoleName: aiExpert.nameKo,
          timestamp: Date.now(),
          progress: getDefaultProgress('analyzing', {
            label: '사용자 주장에 대한 반론 논거를 구성하고 있습니다.',
            detail: '직전 대화의 취약 지점과 신규 논점을 함께 검토하고 있습니다.',
          }),
        })]);
        setActiveExpertId(aiExpert.id);

        let aiContent = '';
        try {
          await streamExpert({
            question: `유저의 주장에 반론하세요: "${question}"`,
            expert: { ...aiExpert, systemPrompt: aiPrompt },
            previousResponses: convHistory.slice(-8).map(m => ({ name: m.speaker, content: m.content })),
            round: 'initial' as any,
            onProgress: (progress) => updateMessageProgress(aiMsgId, progress),
            onDelta: chunk => { aiContent += chunk; setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: aiContent } : m)); },
            onDone: () => { setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false, responseState: 'complete' } : m)); },
            signal: controller.signal,
            files: followUpFilesToSend,
          });
        } catch (err) {
          if ((err as Error).name === 'AbortError') { setIsDiscussing(false); return; }
          aiContent = `⚠️ ${err instanceof Error ? err.message : '응답을 받아오지 못했어요.'}`;
          setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: aiContent, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
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
      setMessages(prev => [...prev, { id: userMsgId, expertId: '__user__', content: question, attachedFiles: followUpFilesBadges }]);

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
            prepContext: simContext,
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
          setMessages(prev => [...prev, createStreamingMessage({
            id: msgId,
            expertId: expert.id,
            simRoleName: role.name,
            simRoleIcon: role.icon,
            progress: getDefaultProgress('finalizing', {
              label: '최종 판정과 판단 근거를 정리하고 있습니다.',
              detail: '전체 대화를 바탕으로 역할별 결론을 정리합니다.',
            }),
          })]);
          setActiveExpertId(expert.id);

          const finalPrompt = `당신은 "${scenario.name}" 시뮬레이션에서 "${role.name}" 역할입니다.
핵심 관심사: ${role.focus}
반응 강도: ${shSettings.intensity}/10
${simContext ? `\n${simContext}` : ''}

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
              onProgress: (progress) => updateMessageProgress(msgId, progress),
              onDelta: chunk => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
              onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false, responseState: 'complete' } : m)); },
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
          setMessages(prev => [...prev, createStreamingMessage({
            id: reportMsgId,
            expertId: SUMMARIZER_EXPERT.id,
            isSummary: true,
            progress: getDefaultProgress('finalizing', {
              label: '시뮬레이션 리포트를 분석 문서로 작성하고 있습니다.',
              detail: '대화 흐름과 판정을 종합해 보고서 구조로 재구성합니다.',
            }),
          })]);
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
              onProgress: (progress) => updateMessageProgress(reportMsgId, progress),
              onDelta: chunk => { reportContent += chunk; setMessages(prev => prev.map(m => m.id === reportMsgId ? { ...m, content: reportContent } : m)); },
              onDone: () => { setMessages(prev => prev.map(m => m.id === reportMsgId ? { ...m, isStreaming: false, responseState: 'complete' } : m)); },
              signal: controller.signal,
            });
          } catch (err) {
            reportContent = `⚠️ ${err instanceof Error ? err.message : '리포트를 받아오지 못했어요.'}`;
            setMessages(prev => prev.map(m => m.id === reportMsgId ? { ...m, content: reportContent, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
          }
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
        '콘텐츠 기획안 피칭': {
          '편성 PD': '콘텐츠의 시청률 잠재력을 냉정하게 평가. "타겟 시청자가 누구?", "비슷한 포맷이 이미 있잖아요", "왜 이게 지금 먹힐까요?"',
          '광고 담당': '수익성과 스폰서 관점. "광고주가 좋아할까요?", "PPL 삽입이 자연스러운가?", "시즌제로 갈 수 있나?"',
          '시청자 대표': '솔직한 시청자 반응. "진짜 보고 싶은 콘텐츠인가?", "이미 비슷한 거 많지 않나?", "1회 보고 끄지 않을까?"',
        },
        'B2B 영업 미팅': {
          '구매 담당자': '비용과 리스크 중심. "가격이 얼만데요?", "기존 시스템 교체 비용은?", "도입 실패하면 누가 책임지죠?"',
          '현업 실무자': '실사용 관점. "매일 쓰기 편한가요?", "교육은 얼마나 걸려요?", "기존 방식이 뭐가 불편한지 모르겠는데"',
          '의사결정권자': '전략적·장기적 관점. "3년 후에도 이 솔루션이 유효한가?", "경쟁사는 뭘 쓰고 있죠?", "왜 우리가 먼저 도입해야 하는가?"',
        },
        '위기 대응': {
          '기자': '질요하고 집요하게 파고든다. "정확한 피해 규모가 뭡니까?", "언제부터 알고 있었나요?", "은폐한 거 아닙니까?"',
          '피해자 대표': '감정적이고 분노. "사과만으로 될 일이 아닙니다", "구체적 보상안을 내놓으세요", "다시는 이런 일 없다고 보장할 수 있나요?"',
          '법무팀': '내부 조언자. 유저 편이지만 법적 리스크를 경고. "그 표현은 법적 책임을 인정하는 것이 될 수 있습니다", "소송 가능성을 고려해야 합니다"',
        },
        '브랜드 제휴 제안': {
          '상대 브랜드 매니저': '브랜드 이미지 보호. "우리 브랜드 톤과 맞나요?", "타겟이 겹치긴 하나요?", "리스크는 없는지?"',
          '상대 마케팅팀': '실행 가능성과 수치. "예상 도달률이 어느 정도?", "비용은 어떻게 나누죠?", "성과 측정은?"',
          '상대 법무팀': '계약 조건. "IP 사용 범위는?", "제휴 기간과 독점 여부는?", "중도 해지 시 위약금은?"',
        },
        '강성 컴플레인 대응': {
          '화난 고객': '극도로 감정적. 소리 지르고, 위협하고, 온라인에 올리겠다고 협박. 논리보다 감정이 앞선다. "사장 나오라고 해!", "소비자보호원에 신고할 거야!"',
          '매장 매니저': '유저(CS 담당자)의 상급자. 상황 파악 후 개입. "규정은 지키되 고객을 잃지는 마세요", "이건 제가 결정할 수 있는 범위가 아닙니다"',
          '본사 CS팀': '규정과 가이드라인 기반. "보상 범위는 여기까지입니다", "전례가 되면 안 됩니다", "고객 이탈률도 고려해야 합니다"',
        },
        '연봉 협상': {
          '팀장': '팀원의 기여를 인정하지만 팀 전체 균형을 고려. "네 성과는 인정하지만, 다른 팀원들과의 형평성도 있어서...", "구체적으로 어떤 성과가 있었는지 정리해줄 수 있어?"',
          'HR 담당자': '제도와 기준 중심. 감정이 아닌 데이터로 대화. "현재 직급 밴드 기준으로 보면...", "동일 직급 평균 대비 이미 상위권이신데요", "이직 시장 상황도 고려해야죠"',
          'CFO': '숫자와 예산으로만 판단. "인건비 총액이 이미 전년 대비 12% 올랐습니다", "한 명을 올리면 팀 전체 기대치가 올라갑니다", "ROI로 설명해주세요"',
        },
        '학부모 상담': {
          '학부모': '자녀 편에서 감정적으로 반응. "우리 아이가 그럴 리 없어요", "학교에서 제대로 관리를 한 건가요?", "다른 아이 문제 아닌가요?"',
          '교감': '학교 규정과 법적 책임 관점. "교칙에 따르면...", "학교운영위원회에 보고해야 할 수도 있습니다", "교육청 지침을 따라야 합니다"',
          '학생': '자기 입장을 변호하되 숨기는 게 있다. 처음엔 "저는 안 그랬어요"지만 점점 진실이 드러남. 또래 압력이나 가정 사정을 간접적으로 암시.',
        },
        '규제 대응': {
          '규제기관 담당자': '원칙적이고 엄격. "현행법상 이건 허가 대상입니다", "소비자 피해가 발생하면 누가 책임지죠?", "해외 사례가 있다고 국내에 바로 적용할 순 없습니다"',
          '사내 법률팀': '유저 편이지만 리스크를 경고. "이 표현은 규제 위반으로 해석될 수 있습니다", "우회 전략으로 이런 방법이 있습니다", "최악의 시나리오도 준비해야 합니다"',
          '기자': '대중의 관심사 관점으로 질문. "일반 국민이 들으면 어떻게 생각할까요?", "혹시 기존 업체들의 반발은 없나요?", "규제 로비 의혹은?"',
        },
        '파트너십 협상': {
          '대기업 사업 임원': '전략적이고 주도적. "우리가 이 제휴를 해야 할 이유가 뭡니까?", "경쟁사도 비슷한 제안을 해왔는데요", "독점권은 줄 수 있나요?"',
          '대기업 법무팀': '계약 조건에 까다로움. "IP 귀속이 명확하지 않네요", "중도 해지 시 기술 반환 조항은?", "경업금지 기간은 어떻게 되죠?"',
          '대기업 기술팀장': '기술 통합 현실성 검증. "우리 시스템과 API 호환이 되나요?", "성능 벤치마크 자료 있나요?", "유지보수는 누가 하죠?"',
        },
        '예산 심의': {
          'CFO': '전사 재무 관점에서 냉정하게 평가. "올해 영업이익률이 떨어졌는데 증액 근거가 뭡니까?", "다른 부서는 다 삭감했습니다", "숫자로 보여주세요"',
          '타 부서장': '예산 경쟁자. 자기 부서 예산을 지키면서 견제. "우리 부서도 인원이 부족한데요", "마케팅비만 늘린다고 매출이 오르나요?", "우선순위를 다시 정해야 하는 거 아닙니까?"',
          '대표이사': '큰 그림과 전략 방향. "이게 3개년 계획과 어떻게 연결되나?", "경쟁사 대비 우리 투자 수준은?", "성과가 안 나오면 어떻게 할 건가?"',
        },
        '위원회 발표': {
          '심사위원장': '학술적 깊이와 독창성을 중시. "기존 연구 대비 차별점이 명확하지 않은데요", "이론적 기여가 구체적으로 뭔가요?", "방법론의 타당성을 좀 더 설명해주세요"',
          '기술 심사위원': '실현 가능성에 집중. "이 실험 장비가 확보되어 있나요?", "연구 인력 구성이 적절한가요?", "제시한 일정이 현실적인지 의문입니다"',
          '산업계 심사위원': '실용성과 사업화 관점. "이 연구 결과가 산업계에 어떻게 적용되나요?", "시장 수요가 있나요?", "기업과 공동연구 경험은?"',
        },
        '스타트업 투자 유치': {
          'VC 심사역': '체계적이고 분석적. "TAM이 얼마나 되죠?", "3년 내 BEP 달성 계획은?", "현재 번레이트가 어떻게 되나요?" 숫자와 근거를 반드시 요구.',
          '엔젤투자자': '창업자 개인에 집중. "이 문제를 왜 당신이 풀어야 하죠?", "이전 실패 경험에서 뭘 배웠어요?", "올인할 각오가 되어 있나요?" 진정성을 본다.',
          '창업 멘토': '경험 기반으로 현실적 조언. "그거 저도 해봤는데요...", "고객 10명한테 직접 물어봤어요?", "피벗할 준비는 되어 있나요?" 따뜻하지만 직설적.',
        },
        '의료 상담': {
          '주치의': '차분하고 체계적. "언제부터 시작됐나요?", "가족력이 있으신가요?", "다른 약을 복용 중이신가요?" 환자를 안심시키면서 정보를 수집.',
          '간호사': '따뜻하고 세심. "많이 불편하셨겠어요", "식사는 잘 하고 계세요?", "수면 패턴은 어떠세요?" 생활 전반을 살핌.',
          '전문의': '전문적이고 정밀. "MRI 결과를 보면...", "이 증상 패턴은 감별이 필요합니다", "정밀 검사를 권합니다" 의학적 근거 기반.',
        },
        '결혼 준비 상담': {
          '웨딩플래너': '밝고 전문적. "요즘 트렌드는 이래요", "예산 안에서 이렇게 하면 효율적이에요", "이 업체는 제가 직접 해봐서 추천드려요" 경험 기반 조언.',
          '양가 부모님': '전통과 체면을 중시하면서도 자녀를 걱정. "우리 때는 이렇게 했는데...", "상대 집안에서 뭐라고 하시던?", "너무 무리하지 마라" 세대 차이가 드러남.',
          '결혼한 친구': '솔직하고 현실적. "나 때 이거 후회했어", "그건 돈 낭비야 진짜", "신혼여행은 진짜 잘 골라야 해" 경험담 위주.',
        },
        '학교 폭력 대응': {
          '피해 학생 부모': '감정적이고 분노에 차 있음. "우리 아이가 얼마나 힘들어하는지 아세요?", "가해 학생은 제대로 처벌받아야 합니다", "학교에서 왜 방치했나요?" 강하게 추궁.',
          '가해 학생': '처음엔 부인하다가 점점 사실 인정. "저는 안 그랬어요", "장난이었어요", "다른 애들도 다 그래요" 또래 압력과 가정환경이 암시됨.',
          '학교폭력위원': '규정과 절차를 따름. "학교폭력예방법에 따르면...", "양측 진술을 모두 들어야 합니다", "피해 학생 보호 조치가 우선입니다" 공정하고 절차적.',
        },
        '유산 분쟁 조정': {
          '동생': '감정적이면서 권리를 주장. "법적으로 균등 상속이잖아요", "형/언니만 부모님 모신 것도 아니잖아요", "저도 나름대로 도왔어요" 서운함과 분노가 섞임.',
          '변호사': '냉정하고 법률적. "민법 제1009조에 따르면...", "기여분 주장을 하시려면 증거가 필요합니다", "소송까지 가면 양쪽 다 손해입니다" 법적 현실을 직시시킴.',
          '조정위원': '양측을 달래며 합의점을 찾음. "양쪽 다 일리가 있습니다", "이런 방법은 어떨까요?", "가족 관계가 더 중요하지 않겠습니까?" 감정 조절에 집중.',
        },
        '프랜차이즈 창업 상담': {
          '프랜차이즈 본사 담당자': '긍정적이고 영업적. "현재 전국 매장 평균 월매출이...", "본사에서 인테리어부터 교육까지 다 지원합니다", "지금이 가맹 타이밍입니다" 좋은 면 강조.',
          '기존 가맹점주': '현실적이고 솔직. "본사 말만 듣지 마세요", "실제 순이익은 그 절반도 안 돼요", "로열티랑 원재료비가 생각보다 큽니다" 경험에서 나온 직설.',
          '창업 컨설턴트': '데이터와 분석 기반. "이 상권의 유동인구가...", "경쟁 매장 수를 보면...", "손익분기점까지 최소 8개월은 잡으셔야 합니다" 객관적 평가.',
        },
        '세입자-임대인 분쟁': {
          '임대인': '자기 입장을 방어. "건물 유지비가 얼마인지 알아요?", "다른 세입자는 다 올려줬어요", "계약서에 다 명시되어 있잖아요" 재산권 주장.',
          '부동산 중개사': '양쪽을 중재하며 시세를 제시. "현재 이 동네 시세가...", "양쪽 다 양보하셔야 합니다", "이 조건이면 합리적인 선이에요" 현실적 중재.',
          '법률 상담사': '법적 권리를 명확히. "임대차보호법상 이 경우...", "내용증명부터 보내시는 게 좋겠습니다", "임차권등기명령을 고려해보세요" 절차적 안내.',
        },
        '이직·전직 상담': {
          '헤드헌터': '시장 정보에 밝고 현실적. "현재 이 포지션 시장 가격이...", "지금 이 타이밍이 좋습니다/나쁩니다", "이력서에 이 부분을 강조하세요" 매칭 관점.',
          '현직자': '회사 내부 현실을 솔직하게. "솔직히 야근이 많아요", "성장은 확실히 되는데 워라밸은...", "팀 분위기는 이래요" 필터 없는 정보.',
          '커리어 코치': '장기적 관점에서 조언. "5년 후 어디에 있고 싶으세요?", "이직이 아니라 전직이 필요한 것 같은데요", "강점을 살리는 방향으로 가시죠" 체계적 설계.',
        },
        '보험 청구 분쟁': {
          '보험사 심사역': '약관 기준으로 엄격하게 판단. "약관 제17조에 따르면 면책 사유에 해당합니다", "고지의무를 위반하셨는데요", "보상 범위가 여기까지입니다" 원칙적.',
          '보험설계사': '고객 편에 서면서 중재. "제가 가입 때 이 부분을 설명드렸는데...", "본사에 특별 심사를 요청해보겠습니다", "이의신청을 하시는 게 좋겠어요" 고객 대변.',
          '금감원 상담원': '소비자 권리 중심. "보험업법상 이 경우...", "분쟁 조정을 신청하실 수 있습니다", "비슷한 사례에서 이런 결과가 나왔어요" 제도 안내.',
        },
        '층간소음 분쟁': {
          '윗집 주민': '억울함을 표현하면서 방어적. "우리도 조심하고 있어요", "아이가 있으니 어쩔 수 없는 부분도 있잖아요", "아래층에서 너무 예민한 거 아닌가요?" 역공도 함.',
          '관리사무소장': '양쪽을 달래며 규약 적용. "관리규약에 따르면 밤 10시 이후는...", "소음 측정을 한번 해볼까요?", "양쪽 다 조금씩 양보하셔야 합니다" 중립적 중재.',
          '조정위원': '법적 기준과 조정안 제시. "환경분쟁조정위원회 기준으로...", "손해배상이 인정된 판례가 있습니다", "이런 합의안은 어떠신가요?" 해결 지향.',
        },
        '해외 이민·비자 상담': {
          '이민 컨설턴트': '체계적이고 전문적. "해당 국가의 포인트 제도에서 현재 점수가...", "이 비자 카테고리가 가장 적합합니다", "준비 기간은 최소 6개월~1년 잡으세요" 절차 중심.',
          '현지 교민': '현실 경험 공유. "와보면 생각과 많이 달라요", "한인 커뮤니티가 있긴 한데...", "아이들 적응이 제일 힘들었어요" 생활 밀착 정보.',
          '비자 전문 행정사': '서류와 법적 요건 집중. "이 서류가 빠지면 거절됩니다", "비자 거절 사유 중 가장 많은 게...", "대안으로 이 비자도 고려해보세요" 실무적.',
        },
        'SNS 위기 대응': {
          '매니저': '긴급 모드로 빠른 판단. "일단 예정된 광고 게시물 다 내려요", "브랜드 측에서 연락 왔습니다", "변호사 연결할게요, 아무 말도 하지 마세요" 위기관리 실행.',
          '악성 댓글 작성자': '공격적이고 집요함. "증거 다 있다", "사과해도 용서 안 해", "다른 피해자들도 모이고 있다" 여론 압박. 분노와 정의감이 섞여 있음.',
          'PR 전문가': '여론 흐름을 읽고 전략 수립. "지금 사과하면 역효과입니다", "먼저 팩트를 정리하고 타이밍을 잡아야 합니다", "진정성 있는 영상이 텍스트보다 효과적이에요" 전략적.',
        },
        '이혼 조정 상담': {
          '가사 조정위원': '차분하고 중립적. 양측의 감정을 존중하면서도 합리적 합의점을 찾는다. "양쪽 다 힘드신 거 알겠습니다. 자녀분에게 가장 좋은 방향을 함께 찾아보시죠.", "감정과 법적 권리는 분리해서 생각하셔야 합니다."',
          '상대측 변호사': '의뢰인(상대 배우자)을 대변하며 냉정하게 공격. "제 의뢰인의 양육 기여도를 고려하면 재산분할 비율이...", "위자료 산정 기준에 대해 판례를 보시죠", "자녀가 누구와 더 안정적인 생활을 할 수 있는지가 핵심입니다."',
          '자녀 심리상담사': '자녀의 목소리를 대변. 따뜻하지만 단호. "아이가 부모님 다툼에 많이 불안해하고 있어요.", "양육 환경 변화가 아이에게 미치는 영향을 먼저 생각해주세요.", "부모님의 갈등을 자녀에게 전가하지 않는 것이 가장 중요합니다."',
        },
        '부모님 요양 결정': {
          '요양보호사': '현장 경험에서 나오는 현실적 조언. "시설이 무조건 나쁜 건 아니에요. 전문 케어가 필요한 단계가 있습니다.", "재가돌봄은 가족 번아웃이 가장 큰 위험이에요.", "어르신 등급에 따라 지원받을 수 있는 서비스가 달라집니다."',
          '형제자매': '서운함과 현실적 한계가 섞인 감정. "나도 부모님 걱정 안 하는 거 아니야", "근데 나도 직장에 아이들에 형편이 안 되는 부분이 있어", "형/언니가 가까이 살잖아, 나는 매달 비용이라도 보태줄게" 감정과 현실 사이.',
          '어르신 본인': '자존심과 불안이 공존. "나는 아직 괜찮아, 왜 자꾸 시설 이야기를 하니", "너희한테 짐이 되고 싶지 않아", "그래도 낯선 곳에 가기는 싫어..." 자식에게 약한 모습 보이기 싫어함.',
        },
        '내부 고발 결정': {
          '상사': '처음엔 회유, 나중엔 압박. "네가 잘못 본 거 아니야?", "이건 회사가 다 아는 관행이야", "신고하면 너도 무사하지 못해", "차라리 내가 위에 보고해서 정리할게" 은폐와 회유를 반복.',
          '공익신고센터 상담원': '객관적이고 절차적. "공익신고자보호법에 따라 신분이 보장됩니다.", "증거 자료를 어떤 형태로 가지고 계신가요?", "보복 행위에 대한 법적 보호 조치도 마련되어 있습니다." 안심시키면서 절차 안내.',
          '동료': '갈등하면서도 현실적. "나도 그거 이상하다고 생각했어", "근데 우리가 신고하면 팀 전체가 다 조사받잖아", "가족이 있으니까 쉽게 결정 못 하겠어..." 연대의 가능성과 두려움 사이.',
        },
        '빚 탈출 상담': {
          '신용회복위원회 상담사': '따뜻하지만 현실적. "많이 힘드셨을 텐데, 이제 같이 정리해봅시다.", "월 소득 대비 상환 비율을 보면 개인회생이 적합할 수 있습니다.", "가장 중요한 건 숨기지 않고 정확한 현황을 말씀해주시는 거예요." 비판 없이 안내.',
          '채권추심원': '압박하면서도 법적 선을 지킴. "이번 달 상환이 또 안 됐는데요", "법적 조치를 진행할 수밖에 없습니다", "지금이라도 일부 변제하시면 협의 가능합니다" 긴장감을 조성하되 협상 여지를 남김.',
          '가족': '걱정과 답답함이 교차. "왜 이렇게 된 거야, 진작 말했으면 좋았잖아", "아이들 학비는 어떡하는 거야", "같이 방법을 찾아보자, 혼자 해결하려고 하지 마" 정서적 지지와 현실 직면.',
        },
        '양육권 분쟁': {
          '가정법원 조사관': '객관적이고 절차적. "자녀의 일상 생활 패턴을 자세히 말씀해주세요.", "양육 환경 조사는 양측 모두에게 동일하게 진행됩니다.", "자녀의 의사도 중요하게 반영됩니다." 공정한 평가 자세.',
          '전 배우자': '감정적이고 공격적. "당신이 아이를 잘 키울 수 있다고?", "내가 얼마나 아이한테 헌신했는데", "양육비도 제대로 안 주면서 양육권을 주장해?" 상대방을 공격하며 자기 정당성 주장.',
          '아동심리전문가': '자녀 중심의 따뜻한 시각. "아이가 부모님 갈등으로 많이 위축되어 있어요.", "이 나이 아이에게 안정적인 환경이 가장 중요합니다.", "부모님 두 분 모두 아이에게 소중한 존재라는 점을 잊지 마세요."',
        },
        '직장 내 괴롭힘 대응': {
          '가해 상사': '행위를 부인하거나 정당화. "내가 엄격하게 지도한 거지, 괴롭힘이 아니야", "이 정도도 못 견디면 사회생활 어떻게 해?", "네가 업무 능력이 부족하니까 지적한 거 아닌가" 가스라이팅과 합리화.',
          '인사팀 담당자': '절차를 따르면서도 조직을 고려. "신고 내용은 비밀이 보장됩니다.", "양측 모두 조사를 진행하겠습니다.", "피해자 보호 조치를 먼저 시행하겠습니다." 체계적이지만 때로 조직 논리에 흔들림.',
          '노무사': '법률 전문가로서 명확하게 조언. "이건 근로기준법 76조의2 직장 내 괴롭힘에 해당합니다.", "녹음 증거의 법적 효력은 충분합니다.", "고용노동부 신고와 손해배상 청구를 동시에 진행할 수 있습니다."',
        },
        '중대 수술 결정': {
          '집도의': '전문적이면서도 이해하기 쉽게 설명. "성공률은 85%이지만, 환자분의 기저질환을 고려하면...", "수술하지 않을 경우의 예후도 말씀드려야 합니다.", "궁금하신 점은 뭐든 물어보세요, 충분히 이해하신 후에 결정하셔야 합니다."',
          '간호사': '따뜻하고 실무적. "수술 전 검사 일정은 이렇게 진행됩니다.", "회복 기간 동안 보호자분이 준비하셔야 할 것들을 정리해드릴게요.", "많이 불안하시죠? 충분히 그러실 수 있어요." 환자 가족의 감정을 돌봄.',
          '다른 가족 구성원': '걱정과 반대 의견. "이 나이에 이렇게 큰 수술을 해도 되는 거야?", "다른 병원에서 한번 더 소견을 들어보자", "만약에라도 잘못되면 어떡해..." 보호 본능에서 나온 우려.',
        },
        '공동창업 갈등': {
          '공동창업자 B': '억울함과 분노. "나도 이 회사에 모든 걸 쏟아부었어", "기술은 내가 다 만들었는데 지분이 이게 맞아?", "이렇게 갈 거면 차라리 깔끔하게 정리하자" 감정적이면서도 협상 카드를 내밈.',
          '초기 투자자': '투자금 보전이 최우선이지만 중재 역할. "두 분 다 소중한 분들인데...", "회사가 무너지면 모두가 잃습니다", "감정적 결정은 지금 하지 마시고, 숫자로 이야기합시다" 냉정한 중재.',
          '법률 자문': '법적 현실을 직시시킴. "주주간 계약서에 이런 조항이 있습니다/없습니다", "지분 매수 시 시가 평가가 필요합니다", "경업금지 기간과 기밀유지에 대해서도 정리해야 합니다" 감정을 배제한 법적 분석.',
        },
        '자녀 전학 결정': {
          '현재 담임교사': '학교 상황을 설명하면서도 자기 방어적 부분도 있음. "그 부분은 저도 파악하고 있고, 조치를 취하고 있었습니다.", "전학이 반드시 해결책이 되지는 않을 수 있어요.", "아이가 여기서 잘 적응할 수 있도록 지원하겠습니다."',
          '전학 대상 학교 상담사': '환영하면서도 현실적 기대치 조정. "저희 학교에서는 전입 학생 적응 프로그램을 운영하고 있어요.", "새 환경이 무조건 좋은 건 아닐 수 있다는 점도 말씀드려야 해요.", "아이의 현재 학업 수준과 성향을 알면 더 도움이 됩니다."',
          '자녀': '복잡한 감정을 서툴게 표현. "그냥 학교 가기 싫어...", "새 학교에 가면 나 아는 사람 아무도 없잖아", "근데 지금 학교도 좀..." 속마음을 쉽게 말하지 못하지만, 단서를 흘림.',
        },
        '대형 계약 협상': {
          '대기업 구매팀장': '우위를 점하며 협상. "현재 시장가 대비 높습니다", "경쟁 입찰을 진행할 수도 있다는 거 아시죠?", "독점 공급 조건이면 단가를 더 내려야 하지 않나요?" 압박하면서 양보를 유도.',
          '자사 법무팀': '유저 편에서 리스크 관리. "이 위약금 조항은 우리한테 불리합니다", "납품 지연 시 면책 조항을 반드시 넣어야 합니다", "지재권 조항은 양보하시면 안 됩니다" 법적 보호에 집중.',
          '거래처 실무자': '현장 실무 관점. "이 납기는 물리적으로 어렵습니다", "품질 기준을 이렇게 올리면 원가가 올라갈 수밖에 없어요", "현장에서 실제로 가능한 선을 말씀드리는 겁니다" 현실적 제약을 설명.',
        },
        '정신건강 상담': {
          '심리상담사': '깊은 공감과 따뜻한 수용. "그런 상황이라면 당연히 힘드셨을 거예요.", "지금 느끼시는 감정에 이름을 붙여볼까요?", "작은 것부터 변화를 시작해도 괜찮아요." 비판 없이 경청하고, 스스로 답을 찾도록 안내.',
          '정신건강의학과 전문의': '의학적으로 정확하되 따뜻하게. "말씀하신 증상 패턴을 보면 전문적인 평가가 도움이 될 것 같습니다.", "약물 치료에 대한 우려가 있으시다면 자세히 설명드릴게요.", "치료는 약 vs 상담이 아니라 병행이 가장 효과적입니다."',
          '가까운 지인': '서툴지만 진심 어린 걱정. "요즘 너 좀 달라 보여서 걱정됐어", "내가 뭘 도와줄 수 있을까?", "전문가 만나보는 거 어때? 부끄러운 거 아니야" 일상적 언어로 응원하되, 때로 상처가 되는 말도 할 수 있음.',
        },
        '상속 사전 설계': {
          '세무사': '숫자와 법률에 기반한 정확한 분석. "현재 재산 규모에서 상속세가 약 O억원 예상됩니다.", "10년 단위 분할 증여가 절세에 유리합니다.", "부동산은 공시지가와 시가 차이가 커서 전략적 접근이 필요해요." 절세 방안을 구체적으로 제시.',
          '장남': '기여분을 주장하면서도 부모님 뜻을 존중. "제가 부모님 모시면서 병원도 다 제가 데려갔잖아요", "사업을 물려받을 준비가 되어 있습니다", "물론 부모님 뜻이 제일 중요하죠" 형으로서의 책임감과 더 받아야 한다는 의식.',
          '차남': '균등 분배를 주장하며 서운함 표출. "기여분이라는 게 그렇게 크다면, 저도 나름대로 한 게 있어요", "형만 다 가져가면 저는요?", "공평하게 하시는 게 나중에 형제 사이에도 좋습니다" 감정적이지만 나름의 논리도 있음.',
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
${simContext ? `\n## 사전 정보\n${simContext}` : ''}

## 반응 강도: ${shSettings.intensity}/10
${intensityDesc}

## 행동 규칙
1. ${role.name}의 이해관계 관점에서만 반응하라
2. 실제 이 역할인 사람이 할 법한 현실적 반응을 하라
3. 2~4문장으로 짧게. 대화하듯 말하라. 분석 보고서가 아니라 대화다.
4. 구체적 질문을 던져라 (예: "그래서 수익은 어떻게 되나요?", "번레이트는요?")
5. 다른 역할의 이전 발언을 참조하여 동의하거나 반박할 수 있다
6. 사전 정보에서 이미 답변된 내용을 다시 묻지 마라
7. 한국어로 답변하라
8. 역할명이나 태그를 본문에 포함하지 마라
9. "~님" 등 호칭 사용 금지. 바로 내용으로 시작하라

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
        setMessages(prev => [...prev, createStreamingMessage({
          id: msgId,
          expertId: expert1.id,
          simRoleName: speaker1Role.name,
          simRoleIcon: speaker1Role.icon,
          progress: getDefaultProgress('analyzing', {
            label: '상담 흐름에 맞는 개입 방향을 설계하고 있습니다.',
            detail: '사용자 답변과 역할 목표를 함께 검토해 다음 질문을 정리합니다.',
          }),
        })]);
        setActiveExpertId(expert1.id);

        const allResponses = conversationHistory.map(m => ({ name: m.speaker, content: m.content }));
        let fullContent = '';
        try {
          await streamExpert({
            question: `유저(${scenario.userRole})의 답변: "${question}"\n\n이 답변을 바탕으로 반응하세요.`,
            expert: { ...expert1, systemPrompt: buildRolePrompt(speaker1Role, orchestration.speak_direction) },
            previousResponses: allResponses,
            round: 'initial' as any,
            onProgress: (progress) => updateMessageProgress(msgId, progress),
            onDelta: chunk => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
            onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false, responseState: 'complete' } : m)); },
            signal: controller.signal,
            files: followUpFilesToSend,
          });
        } catch (err) {
          if ((err as Error).name === 'AbortError') { setIsDiscussing(false); return; }
        }
        allResponses.push({ name: `${expert1.nameKo} (${speaker1Role.name})`, content: fullContent });

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
            setMessages(prev => [...prev, createStreamingMessage({
              id: transitionMsgId,
              expertId: gemini.id,
              simRoleName: nextRole.name,
              simRoleIcon: nextRole.icon,
              progress: getDefaultProgress('planning', {
                label: '다음 상담 단계를 이어받고 있어요.',
                detail: '이전 단계 내용을 한 줄로 정리한 뒤 새 질문을 준비합니다.',
              }),
            })]);
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
                onProgress: (progress) => updateMessageProgress(transitionMsgId, progress),
                onDelta: chunk => { transContent += chunk; setMessages(prev => prev.map(m => m.id === transitionMsgId ? { ...m, content: transContent } : m)); },
                onDone: () => { setMessages(prev => prev.map(m => m.id === transitionMsgId ? { ...m, isStreaming: false, responseState: 'complete' } : m)); },
                signal: controller.signal,
              });
            } catch (err) {
              transContent = `⚠️ ${err instanceof Error ? err.message : '다음 단계 연결에 실패했어요.'}`;
              setMessages(prev => prev.map(m => m.id === transitionMsgId ? { ...m, content: transContent, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
            }
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
            setMessages(prev => [...prev, createStreamingMessage({
              id: reportMsgId,
              expertId: SUMMARIZER_EXPERT.id,
              isSummary: true,
              progress: getDefaultProgress('finalizing', {
                label: '상담 전체를 최종 결과물로 구조화하고 있습니다.',
                detail: '대화에서 나온 구체적 표현과 판단을 보고서 구조로 통합하고 있습니다.',
              }),
            })]);
            setActiveExpertId(SUMMARIZER_EXPERT.id);

            let reportContent = '';
            const allResp = conversationHistory.map((m: any) => ({ name: m.speaker, content: m.content }));
            try {
              await streamExpert({
                question: '상담 전체 대화를 분석하여 최종 결과물을 작성해주세요. 내담자/고객이 실제로 말한 내용을 구체적으로 인용하세요.',
                expert: { ...SUMMARIZER_EXPERT, systemPrompt: outputPrompt + '\n\n## 공통 규칙\n- 한국어로 작성\n- 마크다운 형식\n- 상담에서 나온 구체적 내용을 "인용부호"로 직접 인용\n- 확인되지 않은 항목은 "미확인" 또는 "추가 확인 필요"로 표기\n- 각 섹션에 상담 내용이 반영되어야 함 (빈 섹션 금지)' },
                previousResponses: allResp,
                round: 'summary' as any,
                onProgress: (progress) => updateMessageProgress(reportMsgId, progress),
                onDelta: chunk => { reportContent += chunk; setMessages(prev => prev.map(m => m.id === reportMsgId ? { ...m, content: reportContent } : m)); },
                onDone: () => { setMessages(prev => prev.map(m => m.id === reportMsgId ? { ...m, isStreaming: false, responseState: 'complete' } : m)); },
                signal: controller.signal,
              });
            } catch (err) {
              reportContent = `⚠️ ${err instanceof Error ? err.message : '상담 리포트를 받아오지 못했어요.'}`;
              setMessages(prev => prev.map(m => m.id === reportMsgId ? { ...m, content: reportContent, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
            }

            setIsDiscussing(false);
            setActiveExpertId(undefined);
            void logUsageEvent({
              mode: `${discussionMode}_followup`,
              status: 'success',
              metadata: {
                mainMode: mode,
                questionLength: question.length,
                fileCount: followUpFiles.length,
              },
            });
            return;
          }
        }
      }

      setIsDiscussing(false);
      setActiveExpertId(undefined);
      return;
    }

    // 다중 AI: 모든 AI에게 독립적으로 후속 질문 (서로의 답변 간섭 없음)
    if (discussionMode === 'multi') {
      setIsDiscussing(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const targetExperts = selectedMultiFollowUpExperts.length > 0 ? selectedMultiFollowUpExperts : activeExperts;
      if (targetExperts.length === 0) {
        setIsDiscussing(false);
        return;
      }
      const multiTargetLabel = `${targetExperts.map((expert) => expert.nameKo).join(', ')}에게`;
      setMessages(prev => [...prev, {
        id: `user-multi-${Date.now()}`,
        expertId: '__user__',
        content: `💬 ${multiTargetLabel}: ${question}`,
        timestamp: Date.now(),
        attachedFiles: followUpFilesBadges
      }]);

      const followUpMessageIds = new Map<string, string>(
        targetExperts.map((expert, index) => [expert.id, `${expert.id}-followup-${Date.now()}-${index}`]),
      );
      setMessages(prev => [
        ...prev,
        ...targetExperts.map((expert) => createStreamingMessage({
          id: followUpMessageIds.get(expert.id)!,
          expertId: expert.id,
          timestamp: Date.now(),
          progress: getDefaultProgress('queued', {
            label: '후속 질문을 AI별 분석 관점에 맞게 재배분하고 있습니다.',
            detail: '이전 대화 맥락을 압축한 뒤 응답 범위를 설정하고 있습니다.',
          }),
        })),
      ]);
      const followUpResponses: { name: string; content: string }[] = [];

      for (const expert of targetExperts) {
        if (controller.signal.aborted) break;
        setActiveExpertId(expert.id);
        const msgId = followUpMessageIds.get(expert.id) ?? `${expert.id}-followup-${Date.now()}`;
        // 이 AI 자신의 이전 답변 + 사용자 메시지만 맥락으로 전달 (다른 AI 답변 제외)
        const ownPrev = messages
          .filter(m => (m.expertId === expert.id || m.expertId === '__user__') && m.content)
          .map(m => {
            if (m.expertId === '__user__') return { name: '사용자', content: m.content };
            return { name: expert.nameKo, content: m.content };
          });
        let fullContent = '';
        try {
          await streamExpert({ question, expert: await buildExpertWithPrompt(expert, '\n\n이전 대화 맥락을 참고하여 후속 질문에 답변하세요.'),
            previousResponses: ownPrev, round: 'initial',
            onProgress: (progress) => updateMessageProgress(msgId, progress),
            onDelta: chunk => { fullContent += chunk; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullContent } : m)); },
            onDone: () => { setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false, responseState: 'complete' } : m)); },
            signal: controller.signal,
            files: followUpFilesToSend });
        } catch (err) {
          if ((err as Error).name === 'AbortError') break;
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: `⚠️ 응답을 받아오지 못했어요.`, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
        }
        if (fullContent.trim()) {
          followUpResponses.push({ name: expert.nameKo, content: fullContent });
        }
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_EXPERTS));
      }

      // 멀티 채팅: 후속 "토론 정리" 제거 — AI 답변만 독립적으로 보여주고 종합/큐레이션은 생략

      setActiveExpertId(undefined);
      setIsDiscussing(false);
      void logUsageEvent({
        mode: 'multi_followup',
        status: 'success',
        metadata: {
          mainMode: mode,
          expertCount: targetExperts.length,
          questionLength: question.length,
          fileCount: followUpFiles.length,
        },
      });
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
        setMessages(prev => [...prev, createStreamingMessage({ id: msgId, expertId: expert.id, isDirectFollowUp: true })]);
        let fullContent = '';
        try {
          await streamExpert({ question, expert: await buildExpertWithPrompt(expert, stanceExtra(expert.id)),
            previousResponses: prevAll, round: 'initial',
            onProgress: (progress) => updateMessageProgress(msgId, progress),
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
              setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreaming: false, responseState: 'complete' } : m));
            },
            signal: controller.signal,
            files: followUpFilesToSend });
        } catch (err) {
          if ((err as Error).name === 'AbortError') break;
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: `⚠️ 응답을 받아오지 못했어요.`, isStreaming: false, ...progressFields(getDefaultProgress('error')) } : m));
        }
        prevAll.push({ name: expert.nameKo, content: fullContent });
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_EXPERTS));
      }
      setActiveExpertId(undefined);
      setIsDiscussing(false);
      void logUsageEvent({
        mode: `${discussionMode}_followup`,
        status: 'success',
        metadata: {
          mainMode: mode,
          expertCount: activeExperts.length,
          questionLength: question.length,
          fileCount: followUpFiles.length,
        },
      });
      return;
    }

    // 다른 모드: 새 토론 시작
    pendingFilesRef.current = followUpFiles;
    startDiscussion(question);
  }, [isDiscussing, discussionMode, activeExperts, selectedMultiFollowUpExperts, messages, allExperts, proconStances, startDiscussion, stakeholderSettings, experts, debateSettings, currentQuestion, simPhaseIndex, activeAivsBattleConfig, logUsageEvent]);

  // Export discussion as markdown

  // Active expert info
  const activeExpert = activeExpertId ? allExperts.find(e => e.id === activeExpertId) : null;

  const [studyInNotebook, setStudyInNotebook] = useState(false);
  // 공부 홈에선 앱 사이드바 유지, 노트북 진입 시에만 숨김
  const hideAppSidebar = getMainMode(discussionMode) === 'study_main' && studyInNotebook;

  // MainMode → 기본 DiscussionMode 매핑 (Cmd+K 에서 모드 이동 시 사용)
  const mainToDiscussion = (m: import('@/types/expert').MainMode): DiscussionMode => {
    switch (m) {
      case 'general':          return 'general';
      case 'multi':            return 'multi';
      case 'debate':           return 'standard';
      case 'premium_main':     return 'expert';
      case 'assistant':        return 'assistant';
      case 'player':           return 'player';
      case 'brainstorm_main':  return 'brainstorm';
      case 'stakeholder_main': return 'stakeholder';
      case 'research_main':    return 'research';
      case 'translate_main':   return 'translate';
      case 'convert_main':     return 'convert';
      case 'study_main':       return 'study';
    }
  };

  // Phase C 대수술: 루트에 모드별 클래스 주입 → --mode 변수 상속 + 배경 gradient 연결
  const rootModeClass = (() => {
    const m = getMainMode(discussionMode);
    const map: Record<string, string> = {
      general: 'mode-general', multi: 'mode-multi', debate: 'mode-debate',
      stakeholder_main: 'mode-simulation', brainstorm_main: 'mode-multi',
      premium_main: 'mode-premium', assistant: 'mode-assistant', player: 'mode-multi',
      research_main: 'mode-research', translate_main: 'mode-assistant',
      convert_main: 'mode-general', study_main: 'mode-study',
    };
    return map[m] ?? 'mode-general';
  })();

  return (
    <SidebarProvider defaultOpen={false}>
      <div
        className={cn(
          rootModeClass,
          "relative h-screen flex w-full bg-[#f7f7f8] dark:bg-[#0f1117]",
          // 모드 시그니처 컬러 radial mesh — 인지 가능 수준으로 상향 (16% 라이트 / 22% 다크).
          // 메인 radial 과 양쪽 side accent 2단으로 겹쳐 더 풍부한 분위기.
          "before:content-[''] before:pointer-events-none before:fixed before:inset-0 before:z-0",
          "before:bg-[radial-gradient(ellipse_90%_55%_at_50%_-8%,hsl(var(--mode,var(--primary))/0.16),transparent_65%),radial-gradient(ellipse_40%_60%_at_95%_40%,hsl(var(--mode,var(--primary))/0.07),transparent_70%)]",
          "dark:before:bg-[radial-gradient(ellipse_90%_55%_at_50%_-8%,hsl(var(--mode,var(--primary))/0.22),transparent_65%),radial-gradient(ellipse_40%_60%_at_95%_40%,hsl(var(--mode,var(--primary))/0.10),transparent_70%)]",
          "before:transition-[background] before:duration-700",
        )}
      >
        {/* 전역 커맨드 팔레트 (Cmd+K / Ctrl+K) — 어디서든 호출 가능 */}
        <Suspense fallback={null}>
          <LazyCommandPalette
            currentMode={getMainMode(discussionMode)}
            onSelectMode={(m) => handleModeChange(mainToDiscussion(m))}
            onSelectHistory={(rec) => loadHistory(rec)}
            onNewChat={handleNewDiscussion}
            onCopyChat={messages.length > 0 ? copyAllResults : undefined}
            onDownloadChat={messages.length > 0 ? downloadAllResults : undefined}
            hasActiveChat={messages.length > 0}
            currentTheme={typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
            onToggleTheme={() => {
              const root = document.documentElement;
              const isDark = root.classList.contains('dark');
              if (isDark) root.classList.remove('dark');
              else root.classList.add('dark');
              try { localStorage.setItem('theme', isDark ? 'light' : 'dark'); } catch { /* noop */ }
            }}
          />
        </Suspense>
        {!hideAppSidebar && <Suspense fallback={null}>
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
                  runDiscussionWithUsage(content, [expertId], 'general');
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
                  setCurrentQuestionDisplay('');
                  sessionTitleRef.current = '';
                }, 100);
              }
            }}
          />
        </Suspense>}


        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          {/* Deep Research full-screen takeover */}
          {getMainMode(discussionMode) === 'research_main' ? (
            <div className="h-full overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
              <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">로딩 중...</div>}>
                <LazyDeepResearchChat
                  initialQuestion={researchInitialQuestion ?? undefined}
                  onInitialQuestionConsumed={() => setResearchInitialQuestion(null)}
                />
              </Suspense>
            </div>
          ) : getMainMode(discussionMode) === 'translate_main' ? (
            <div className="h-full overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
              <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">로딩 중...</div>}>
                <LazyTranslateChat onBack={() => setDiscussionMode('assistant')} />
              </Suspense>
            </div>
          ) : getMainMode(discussionMode) === 'convert_main' ? (
            <div className="h-full overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
              <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">로딩 중...</div>}>
                <LazyFileConvertChat onBack={() => setDiscussionMode('assistant')} />
              </Suspense>
            </div>
          ) : selectedPremiumDomain && getMainMode(discussionMode) === 'premium_main' ? (
            <div className="h-full animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both">
            <Suspense fallback={null}>
              <LazyPremiumConsultChat
                domainId={selectedPremiumDomain}
                onBack={handlePremiumBack}
                onSendMessage={handlePremiumSend}
                messages={premiumMessages}
                isStreaming={premiumStreaming}
                citations={premiumCitations}
                trustHeader={premiumTrustHeader}
                error={premiumError}
                steps={premiumSteps}
              />
            </Suspense>
            </div>
          ) : <>
          {/* Scroll to bottom FAB */}
          {showScrollBtn && (
            <button onClick={scrollToBottom}
              className="absolute bottom-20 right-6 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-all animate-in fade-in zoom-in-75 duration-200">
              <ArrowDown className="w-3 h-3 text-slate-500" />
              {isDiscussing && <span className="text-[10px] font-medium text-primary">새 메시지</span>}
            </button>
          )}

          {/* Main scroll area */}
          <div ref={scrollRef} className={cn("flex-1 overflow-y-auto scrollbar-thin relative", discussionMode === 'player' && 'bg-gradient-to-b from-slate-900 to-slate-800')} style={{ scrollbarGutter: 'stable' }} onScroll={handleScroll}>
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
                    {(() => {
                      const isConsult = scenario.simType === 'consultation';
                      const userTurnCount = messages.filter(m => m.expertId === '__user__').length;
                      // 대략적 진행률: 12턴 기준 (orchestrator final 기준값)
                      const totalTurnsEstimate = 12;
                      const turnPct = Math.min(100, Math.round((userTurnCount / totalTurnsEstimate) * 100));
                      // 가장 마지막 발화 역할 찾기 (최신 simRoleName)
                      const lastRoleName = [...messages].reverse().find(m => m.simRoleName)?.simRoleName;
                      const activeRoleIdx = scenario.roles.findIndex(r => r.name === lastRoleName);
                      // 진행 단계 텍스트
                      const phaseLabel = isConsult
                        ? (scenario.phases[simPhaseIndex] || '진행 중')
                        : (userTurnCount >= 10 ? '최종 판정 임박' : userTurnCount >= 6 ? '마무리 단계' : '대화 진행 중');
                      const phaseColor = isConsult
                        ? 'text-indigo-600'
                        : (userTurnCount >= 10 ? 'text-red-600' : userTurnCount >= 6 ? 'text-amber-600' : 'text-slate-500');
                      return (
                        <div className="shrink-0 bg-slate-50 border-b border-slate-200 rounded-t-2xl">
                          <div className="px-5 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-[16px]">{scenario.icon}</span>
                              <span className="text-[14px] font-extrabold text-slate-800 truncate">{scenario.name}</span>
                              <span className={cn('text-[10px] font-bold whitespace-nowrap', phaseColor)}>· {phaseLabel}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {scenario.roles.map((r, ri) => {
                                const isCurrent = isConsult ? ri === simPhaseIndex : ri === activeRoleIdx;
                                const isDone = isConsult && ri < simPhaseIndex;
                                return (
                                  <span key={r.name} className={cn('text-[10px] font-medium flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all',
                                    isCurrent ? 'bg-indigo-100 text-indigo-700 font-bold ring-1 ring-indigo-300' :
                                    isDone ? 'text-slate-400' :
                                    'text-slate-500'
                                  )}>
                                    <span>{r.icon}</span> {r.name}
                                    {isCurrent && isDiscussing && <span className="text-[8px] animate-pulse">💬</span>}
                                    {isDone && <span className="text-[8px]">✓</span>}
                                  </span>
                                );
                              })}
                              {userTurnCount >= 1 && !isDiscussing && (
                                <button
                                  onClick={() => {
                                    const confirmEnd = window.confirm('지금까지의 대화로 각 역할의 최종 판정을 받으시겠어요?\n\n진행 중인 단계를 건너뛰고 바로 결과 화면으로 이동합니다.');
                                    if (confirmEnd) handleFollowUp('__SIM_END__');
                                  }}
                                  title="지금까지의 대화로 최종 판정 받기"
                                  className="text-[10px] text-slate-500 hover:text-white font-semibold px-2.5 py-1 rounded-md border border-slate-200 hover:border-red-500 hover:bg-red-500 transition-all ml-2 inline-flex items-center gap-1"
                                >
                                  <span>🏁</span>
                                  <span>여기서 마무리</span>
                                </button>
                              )}
                            </div>
                          </div>
                          {/* 진행률 바 */}
                          <div className="px-5 pb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-slate-400 font-medium shrink-0 tabular-nums">{userTurnCount}턴</span>
                              <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={cn('h-full transition-all duration-500',
                                    userTurnCount >= 10 ? 'bg-red-400' : userTurnCount >= 6 ? 'bg-amber-400' : 'bg-indigo-400'
                                  )}
                                  style={{ width: `${turnPct}%` }}
                                />
                              </div>
                              <span className="text-[9px] text-slate-400 font-medium shrink-0 tabular-nums">~{totalTurnsEstimate}턴</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
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
                getMainMode(discussionMode) === 'study_main'
                  ? 'h-full w-full p-0'
                  : 'mx-auto px-4 sm:px-6 pb-16',
                getMainMode(discussionMode) !== 'study_main' && (!selectable && getMainMode(discussionMode) === 'general' && messages.length > 0 ? 'pt-6' : 'pt-16'),
                getMainMode(discussionMode) === 'study_main' ? ''
                : !selectable && discussionMode === 'stakeholder' ? 'hidden'
                : !selectable ? (getMainMode(discussionMode) === 'general' ? 'max-w-[710px] space-y-5' : 'max-w-3xl space-y-2.5')
                  : (discussionMode === 'assistant' || discussionMode === 'expert' || discussionMode === 'stakeholder') ? 'max-w-4xl space-y-3'
                  : (discussionMode === 'multi' && messages.length > 0) ? 'max-w-[960px] space-y-3'
                  : (discussionMode === 'general' || discussionMode === 'multi') ? 'max-w-[710px] space-y-1'
                  : 'max-w-2xl space-y-1'
              )}>

              {selectable && getMainMode(discussionMode) !== 'study_main' && (
                <Suspense fallback={null}>
                  <LazyExpertSelectionPanel
                    experts={experts}
                    selectedIds={selectedExpertIds}
                    onToggle={toggleExpert}
                    discussionMode={discussionMode}
                    onModeChange={handleModeChange}
                    isDiscussing={isDiscussing}
                    onSubmit={startDiscussion}
                    onSubmitWithFiles={startDiscussionWithFiles}
                    proconStances={proconStances}
                    onProconStancesChange={setProconStances}
                    debateSettings={debateSettings}
                    onDebateSettingsChange={setDebateSettings}
                    hasAivsBattleStarted={hasAivsBattleStarted}
                    onStartAivsBattle={startAivsBattle}
                    onResetAivsBattle={resetAivsBattle}
                    showDebateSettings={showDebateSettings}
                    selectedFramework={selectedFramework}
                    onFrameworkChange={setSelectedFramework}
                    discussionIssues={discussionIssues}
                    onDiscussionIssuesChange={setDiscussionIssues}
                    onBulkSelect={setSelectedExpertIds}
                    onSampleQuestionClick={(q) => setSampleQuestionValue(q)}
                    onStartGame={(id, opt, label) => setActiveGame({ id, option: opt, label })}
                    stakeholderSettings={stakeholderSettings}
                    onStakeholderSettingsChange={setStakeholderSettings}
                    onSelectPremiumDomain={handleSelectPremiumDomain}
                    selectedPremiumDomain={selectedPremiumDomain}
                    selectedAssistantCardId={selectedAssistantCardId}
                    onAssistantCardChange={(cardId) => {
                      if (cardId === 'translate') {
                        setDiscussionMode('translate');
                        return;
                      }
                      if (cardId === 'file-convert') {
                        setDiscussionMode('convert');
                        return;
                      }
                      if (cardId === 'study') {
                        setDiscussionMode('study');
                        return;
                      }
                      setSelectedAssistantCard(cardId);
                    }}
                    onAssistantSubmit={handleAssistantSubmit}
                  />
                </Suspense>
              )}

              {/* Study Workspace — main tab */}
              {getMainMode(discussionMode) === 'study_main' && (
                <Suspense fallback={null}>
                  <LazyStudyWorkspace onClose={() => setDiscussionMode('assistant')} onActiveChange={setStudyInNotebook} />
                </Suspense>
              )}

              {/* Premium Consultation Chat */}
              {selectedPremiumDomain && getMainMode(discussionMode) === 'premium_main' && (
                <Suspense fallback={null}>
                  <LazyPremiumConsultChat
                    domainId={selectedPremiumDomain}
                    onBack={handlePremiumBack}
                    onSendMessage={handlePremiumSend}
                    messages={premiumMessages}
                    isStreaming={premiumStreaming}
                    citations={premiumCitations}
                    trustHeader={premiumTrustHeader}
                    error={premiumError}
                    steps={premiumSteps}
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
                    runDiscussionWithUsage(enriched, undefined, undefined, original);
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
                    runDiscussionWithUsage(enriched, undefined, undefined, original);
                  } else {
                    setChatClarify({ ...chatClarify, selections: newSelections, currentPage: chatClarify.currentPage + 1 });
                  }
                };

                const handleSkip = () => {
                  skipClarifyRef.current = true;
                  setChatClarify(null);
                  runDiscussionWithUsage(chatClarify.originalQuestion);
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
                        <div className="px-3 pb-3">
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

                          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                            <p className="mb-2 text-[11px] font-medium text-slate-500">직접 답하고 싶다면 아래에 적어주세요</p>
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[13px] text-slate-400 shadow-sm">✎</span>
                              <input
                                type="text"
                                value={chatClarify.customInputs[q.id] || ''}
                                onChange={e => setChatClarify({ ...chatClarify, customInputs: { ...chatClarify.customInputs, [q.id]: e.target.value } })}
                                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                placeholder="직접 입력..."
                                onKeyDown={e => { if (e.key === 'Enter') handleCustomSubmit(); }}
                              />
                              <button
                                onClick={handleCustomSubmit}
                                className="rounded-lg bg-indigo-500 px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-600"
                              >
                                확인
                              </button>
                            </div>
                          </div>
                        </div>

                      {/* AI 표시 — 상단 바 스타일 */}
                    </div>
                  </div>
                );
              })()}

              {/* 브레인스토밍 주제 구체화 — 전용 플로팅 모달 */}
              {bsClarify?.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
                  <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
                    {/* 헤더 */}
                    <div className="bg-gradient-to-r from-amber-100 via-orange-100 to-amber-100 px-6 py-4 border-b border-amber-200 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #f59e0b 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                      <div className="relative flex items-center gap-4">
                        <span className="text-[26px]">💡</span>
                        <div className="flex-1">
                          <h3 className="text-[17px] font-bold text-amber-900">세션 준비</h3>
                          <p className="text-[12px] text-amber-700/70 mt-0.5">{bsClarify.message}</p>
                        </div>
                      </div>
                    </div>

                    {/* 원래 주제 */}
                    <div className="px-6 pt-5 pb-2">
                      <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">입력한 주제</span>
                      <p className="text-[15px] font-semibold text-slate-800 mt-1.5">{bsClarify.originalQuestion}</p>
                    </div>

                    {/* 질문들 */}
                    <div className="px-6 py-4 space-y-5">
                      {bsClarify.questions.map((q, qi) => (
                        <div key={q.id}>
                          <p className="text-[13px] font-bold text-slate-700 mb-2.5 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-[10px] font-black flex items-center justify-center shrink-0">{qi + 1}</span>
                            {q.question}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {q.options.filter(o => o.value !== '__custom__').map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => {
                                  const newSelections = { ...bsClarify.selections, [q.id]: opt.value };
                                  setBsClarify({ ...bsClarify, selections: newSelections });
                                }}
                                className={cn(
                                  "px-4 py-2 rounded-lg text-[12px] font-medium border-2 transition-all",
                                  bsClarify.selections[q.id] === opt.value
                                    ? "bg-amber-50 text-amber-700 border-amber-400 shadow-sm ring-1 ring-amber-200"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50"
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
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
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
                          const savedExpertIds = bsClarify.expertIds;
                          setBsClarify(null);
                          skipClarifyRef.current = true;
                          runDiscussionWithUsage(enriched, savedExpertIds);
                        }}
                        disabled={Object.keys(bsClarify.selections).length === 0}
                        className={cn(
                          "px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all",
                          Object.keys(bsClarify.selections).length > 0
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md shadow-amber-200"
                            : "bg-slate-100 text-slate-300 cursor-not-allowed"
                        )}
                      >
                        세션 시작 →
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
                    <div className={cn("px-5 py-4 border-b",
                      discussionMode === 'procon' ? 'bg-gradient-to-r from-blue-50 via-white to-red-50 border-slate-200'
                      : discussionMode === 'freetalk' ? 'bg-gradient-to-r from-emerald-50 to-white border-emerald-100'
                      : discussionMode === 'hearing' ? 'bg-gradient-to-r from-amber-50 to-white border-amber-100'
                      : 'bg-gradient-to-r from-indigo-50 to-white border-indigo-100')}>
                      <div className="flex items-center gap-3">
                        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                          discussionMode === 'procon' ? 'bg-gradient-to-r from-blue-100 to-red-100'
                          : discussionMode === 'freetalk' ? 'bg-emerald-100'
                          : discussionMode === 'hearing' ? 'bg-amber-100'
                          : 'bg-indigo-100')}>
                          <span className="text-[18px]">{
                            discussionMode === 'procon' ? '⚖️'
                            : discussionMode === 'freetalk' ? '💬'
                            : discussionMode === 'hearing' ? '🔍'
                            : discussionMode === 'brainstorm' ? '💡'
                            : discussionMode === 'standard' ? '🎯'
                            : '🎙️'}</span>
                        </div>
                        <div>
                          <h3 className="text-[14px] font-bold text-slate-800">
                            {discussionMode === 'procon' ? '찬반 토론 명제 선택'
                            : discussionMode === 'freetalk' ? '자유 토론 주제 설정'
                            : discussionMode === 'hearing' ? '검증 대상 설정'
                            : discussionMode === 'standard' ? '심층 토론 주제 설정'
                            : discussionMode === 'brainstorm' ? '세션 진행자' : '토론 진행자'}
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            {discussionMode === 'procon' ? '찬성과 반대로 나뉠 수 있는 명제를 선택하세요'
                            : discussionMode === 'freetalk' ? '다양한 관점에서 토론할 수 있는 주제를 선택하세요'
                            : discussionMode === 'hearing' ? '전문가들이 검증할 아이디어를 선택하세요'
                            : discussionMode === 'standard' ? '전문가들이 깊이 토론할 주제를 선택하세요'
                            : discussionMode === 'brainstorm' ? '브레인스토밍 전에 주제를 확인합니다' : '토론을 시작하기 전에 주제를 확인합니다'}
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
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{discussionMode === 'procon' ? '찬반 토론 명제' : '추천 주제'}</p>
                            {clarifyState.suggestions.map((s, i) => (
                              <button key={i} type="button"
                                onClick={() => { setClarifyState(prev => ({ ...prev, show: false })); runDiscussionWithUsage(s.topic); }}
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
              {!activeGame && currentQuestionDisplay && messages.length > 0 && discussionMode !== 'procon' && discussionMode !== 'standard' && discussionMode !== 'multi' && discussionMode !== 'stakeholder' && !(getMainMode(discussionMode) === 'general' && hasUserMessageInThread) && (
                getMainMode(discussionMode) === 'general' ? (
                  /* 단일 AI — 오른쪽 말풍선 */
                  <div className="flex justify-end">
                    <div className="max-w-[75%] bg-indigo-500 dark:bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{currentQuestionDisplay}</p>
                    </div>
                  </div>
                ) : (
                  /* 기타 모드 — 왼쪽 버블 */
                  <button type="button" onClick={() => setQuestionExpanded(!questionExpanded)}
                    className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 text-left max-w-[80%] hover:bg-slate-200/70 transition-colors">
                    <p className={cn('text-[13px] text-slate-600 leading-relaxed flex-1', !questionExpanded && 'line-clamp-2')}>
                      {currentQuestionDisplay}
                    </p>
                    <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5 transition-transform', questionExpanded && 'rotate-180')} />
                  </button>
                )
              )}


              {/* Participants display — VS layout for procon, normal for others */}
              {currentQuestionDisplay && messages.length > 0 && ['standard', 'procon', 'hearing'].includes(discussionMode) && activeExperts.length > 0 && (
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
                      <span className="text-[12px] font-medium text-slate-200 flex-1 leading-snug">{currentQuestionDisplay}</span>
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
                      <span className="text-[12px] font-medium text-slate-300">{proconDebateTopic || currentQuestionDisplay}</span>
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
              {discussionMode === 'multi' && messages.length > 0 ? (
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
                          {currentQuestionDisplay && (
                            <div className="flex justify-end">
                              <div className="max-w-[75%] bg-blue-50 text-slate-800 rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm">
                                <p className="text-[13px] leading-relaxed line-clamp-3">{currentQuestionDisplay}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Layer 1: Overview — 각 AI별 모든 응답 카드 쌓기 ── */}
                      {multiView === 'overview' && (
                        <div className={cn('grid gap-2 items-start', sortedExperts.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
                          {sortedExperts.map((expert, ei) => {
                            const allMsgs = getExpertAllMsgs(expert.id);
                            if (!allMsgs.length) return null;
                            const gradients = [
                              'from-blue-100 to-blue-200', 'from-emerald-100 to-emerald-200',
                              'from-violet-100 to-violet-200', 'from-amber-100 to-amber-200',
                              'from-rose-100 to-rose-200', 'from-cyan-100 to-cyan-200'
                            ];
                            const gradient = gradients[ei % gradients.length];
                            return (
                              <div key={expert.id} className="self-start overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                {/* 헤더 */}
                                <button type="button"
                                  onClick={() => { setMultiActiveTab(expert.id); if (!isDiscussing) setMultiView('detail'); }}
                                  className={cn('w-full flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r hover:brightness-95 transition-all', gradient)}>
                                  <ExpertAvatar expert={expert} size="xs" active={allMsgs.some(m => m.isStreaming)} />
                                  <div className="flex-1 min-w-0 text-left">
                                    <span className="text-[12px] font-bold text-slate-800">{expert.nameKo}</span>
                                    {allMsgs.length > 1 && <span className="text-[9px] text-slate-500 ml-1.5">{allMsgs.length}개 답변</span>}
                                  </div>
                                  {allMsgs.some(m => m.isStreaming) && <span className="flex gap-0.5"><span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400" /><span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400" /><span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-400" /></span>}
                                </button>
                                {/* 응답 카드들 — 질문+답변 쌓임 */}
                                <div className="divide-y divide-slate-100">
                                  {allMsgs.map((msg, mi) => {
                                    const cleanedPreview = stripSpeakerPrefix(msg.content, expert.nameKo);
                                    const preview = cleanedPreview.slice(0, 200);
                                    // 이 답변 직전의 유저 질문 찾기
                                    const msgIdx = messages.findIndex(m => m.id === msg.id);
                                    let questionText = '';
                                    if (mi > 0 && msgIdx > 0) {
                                      for (let i = msgIdx - 1; i >= 0; i--) {
                                          if (messages[i].expertId === '__user__') {
                                            questionText = messages[i].content.replace(/^💬\s*[^:]+:\s*/, '');
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
                                            {cleanedPreview.length > 200 && <span className="text-slate-300">...</span>}
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
                          'from-blue-100 to-blue-200', 'from-emerald-100 to-emerald-200',
                          'from-violet-100 to-violet-200', 'from-amber-100 to-amber-200',
                          'from-rose-100 to-rose-200', 'from-cyan-100 to-cyan-200'
                        ];
                        const detailTabSkins = [
                          {
                            active: 'border-blue-200 bg-white text-blue-700 shadow-[0_-8px_18px_rgba(37,99,235,0.12)]',
                            idle: 'border-blue-200 bg-blue-100 text-blue-700 hover:bg-blue-100/80'
                          },
                          {
                            active: 'border-emerald-200 bg-white text-emerald-700 shadow-[0_-8px_18px_rgba(5,150,105,0.12)]',
                            idle: 'border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80'
                          },
                          {
                            active: 'border-violet-200 bg-white text-violet-700 shadow-[0_-8px_18px_rgba(124,58,237,0.12)]',
                            idle: 'border-violet-200 bg-violet-100 text-violet-700 hover:bg-violet-100/80'
                          },
                          {
                            active: 'border-amber-200 bg-white text-amber-700 shadow-[0_-8px_18px_rgba(217,119,6,0.12)]',
                            idle: 'border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100/80'
                          },
                          {
                            active: 'border-rose-200 bg-white text-rose-700 shadow-[0_-8px_18px_rgba(225,29,72,0.12)]',
                            idle: 'border-rose-200 bg-rose-100 text-rose-700 hover:bg-rose-100/80'
                          },
                          {
                            active: 'border-cyan-200 bg-white text-cyan-700 shadow-[0_-8px_18px_rgba(8,145,178,0.12)]',
                            idle: 'border-cyan-200 bg-cyan-100 text-cyan-800 hover:bg-cyan-100/80'
                          }
                        ];
                          const detailNavBgs = [
                            'bg-blue-50 hover:bg-blue-100',
                            'bg-emerald-50 hover:bg-emerald-100',
                            'bg-violet-50 hover:bg-violet-100',
                            'bg-amber-50 hover:bg-amber-100',
                            'bg-rose-50 hover:bg-rose-100',
                            'bg-cyan-50 hover:bg-cyan-100'
                          ];
                          const activeIdx = sortedExperts.findIndex(e => e.id === activeTab);
                          const detailOrderedExperts = sortedExperts;
                          const detailExpertIndexMap = new Map(
                            sortedExperts.map((expert, expertIndex) => [expert.id, expertIndex])
                          );
                          return (
                            <div
                              key="multi-detail-stable"
                              className="transition-opacity duration-150 ease-out"
                            >
                              {/* AI 탭바 — 포스트잇처럼 카드 위에 얹힌 형태 */}
                              <div
                                className="relative z-10 flex items-end overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                style={{ msOverflowStyle: 'none' }}
                              >
                                {detailOrderedExperts.map((expert) => {
                                  const isActive = activeTab === expert.id;
                                  const sourceIndex = detailExpertIndexMap.get(expert.id) ?? 0;
                                  const tabSkin = detailTabSkins[sourceIndex % detailTabSkins.length];
                                  const answerCount = getExpertAllMsgs(expert.id).length;
                                  return (
                                    <button
                                      key={expert.id}
                                      type="button"
                                      onClick={() => setMultiActiveTab(expert.id)}
                                      style={{ marginRight: '-8px', zIndex: isActive ? 30 : (sortedExperts.length - (detailExpertIndexMap.get(expert.id) ?? 0)) }}
                                      className={cn(
                                        'relative flex shrink-0 items-center gap-1.5 rounded-t-[18px] border border-b-0 px-3.5 pb-2 pt-1.5 text-[11px] transition-colors duration-200',
                                        isActive
                                          ? cn('font-bold', tabSkin.active)
                                          : cn('font-semibold opacity-80 hover:opacity-100', tabSkin.idle)
                                      )}
                                    >
                                      <ExpertAvatar expert={expert} size="xs" />
                                      <span>{expert.nameKo}</span>
                                      {answerCount > 1 && (
                                        <span
                                          className={cn(
                                            'rounded-full px-1.5 py-0.5 text-[8px] font-bold',
                                            isActive ? 'bg-slate-100 text-slate-500' : 'bg-white/70 text-current'
                                          )}
                                        >
                                          {answerCount}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="overflow-hidden rounded-b-2xl rounded-t-none border border-slate-200 bg-white shadow-sm transition-shadow duration-200 ease-out">
                                {/* 응답 */}
                                <div className="px-5 py-4 space-y-4">
                              {activeMsgs.map((msg, i) => (
                                <div
                                  key={msg.id}
                                  id={msg.id}
                                  className={cn(i > 0 && 'border-t border-slate-100 pt-4')}
                                >
                                  {i > 0 && (() => {
                                    const q = getQuestionBefore(msg.id);
                                    if (!q) return null;
                                      const text = q.content.replace(/^💬\s*[^:]+:\s*/, '');
                                    return (
                                      <div className="flex justify-end mb-2">
                                        <div className="max-w-[70%] bg-blue-50 text-slate-800 rounded-2xl rounded-br-md px-3.5 py-2 text-[12px]">
                                          {text}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  {(() => {
                                    const cleanedContent = stripSpeakerPrefix(msg.content, activeExp.nameKo);
                                    return (
                                  <div className="space-y-2">
                                    {i > 0 && (
                                      <div className="flex items-center gap-2">
                                        <ExpertAvatar expert={activeExp} size="sm" active={msg.isStreaming} />
                                        <span className="text-[12px] font-semibold text-slate-800">{activeExp.nameKo}</span>
                                      </div>
                                    )}
                                    <div className="prose prose-sm max-w-none text-slate-700
                                      prose-p:my-3 prose-p:leading-[1.75] prose-p:text-[13px]
                                      prose-headings:text-slate-900 prose-headings:font-semibold prose-headings:tracking-tight prose-headings:mt-5 prose-headings:mb-2
                                      prose-h2:text-[15px] prose-h3:text-[14px] prose-h4:text-[13px]
                                      prose-strong:text-slate-800 prose-strong:font-semibold
                                      prose-ul:my-3 prose-ul:space-y-1 prose-li:my-0.5 prose-li:text-[13px] prose-li:leading-[1.7] prose-li:pl-1
                                      prose-ol:my-3 prose-ol:space-y-1">
                                      {cleanedContent ? (
                                        <LazyMarkdown content={cleanedContent} fallback={<span>{cleanedContent}</span>} />
                                      ) : msg.isStreaming ? (
                                        <div className="flex items-center gap-1.5 text-slate-400">
                                          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-300" />
                                          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-300" />
                                          <span className="typing-dot w-1.5 h-1.5 rounded-full bg-slate-300" />
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                    );
                                  })()}
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-slate-100">
                              <div className="flex h-7 items-center justify-between px-4 bg-white">
                                {prevExpert ? (
                                  <button onClick={() => setMultiActiveTab(prevExpert.id)}
                                    className={cn(
                                      'flex items-center gap-1 text-[10px] font-medium text-slate-500 transition-colors hover:text-slate-700',
                                      detailNavBgs[((activeIdx - 1 + sortedExperts.length) % sortedExperts.length) % detailNavBgs.length],
                                      'px-1.5 py-0 rounded-md'
                                    )}>
                                    ← {prevExpert.nameKo}
                                  </button>
                                ) : <span />}
                                {nextExpert ? (
                                  <button onClick={() => setMultiActiveTab(nextExpert.id)}
                                    className={cn(
                                      'flex items-center gap-1 text-[10px] font-medium text-slate-600 transition-colors hover:text-slate-800',
                                      detailNavBgs[((activeIdx + 1) % sortedExperts.length) % detailNavBgs.length],
                                      'px-1.5 py-0 rounded-md'
                                    )}>
                                    {nextExpert.nameKo} →
                                  </button>
                                ) : <span />}
                              </div>
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
              ) : discussionMode === 'procon' && messages.length > 0 ? (
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
                    } else if (!msg.isSummary && msg.expertId !== '__user__' && !msg.isDirectFollowUp && !msg.id.includes('-followup-') && !msg.id.includes('-debate-followup-')) {
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

                  // Note: auto-scroll to last round is handled by useEffect below

                  return (
                    <div className="space-y-2">
                      {/* 현재 라운드 — 회색 칸 안에 탭 + 찬반 */}
                      {currentRound && (
                        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                        {/* 라운드 탭 + 분석 탭 — 상단에 고정 */}
                        {mergedRounds.length > 0 && (
                          <div className="flex items-center gap-0.5 bg-slate-50 border-b border-slate-200 px-2 py-1 overflow-x-auto scrollbar-none">
                            {mergedRounds.map((r, ri) => {
                              const isActive = ri === (activeRound >= 0 ? activeRound : 0);
                              const roundNum = r.label.match(/(\d)/)?.[1] || '';
                              const isFinal = r.label.includes('최종');
                              const hasContent = r.proMsgs.length > 0 || r.conMsgs.length > 0;
                              return (
                                <button key={r.id} onClick={() => setProconActiveRound(ri)}
                                  className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md transition-all shrink-0 text-[10px] font-semibold',
                                    isActive
                                      ? isFinal ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm' : 'bg-slate-800 text-white shadow-sm'
                                      : hasContent ? 'text-slate-500 hover:text-slate-700 hover:bg-white' : 'text-slate-300')}>
                                  <span className="text-[11px] font-black">{isFinal ? '⚖️' : `${roundNum}R`}</span>
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
                                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">찬성(동의)</span>
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
                                <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">반대(비동의)</span>
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

                      {/* 토론 정리 */}
                      {summaryMsgs.map(msg => {
                        const expert = allExperts.find(e => e.id === msg.expertId);
                        if (!expert) return null;
                        return <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant="default" />;
                      })}

                      {/* 후속 1:1 대화 — 메신저 스타일 */}
                      {(() => {
                        const lastSummaryIdx = messages.reduce((acc, m, i) => m.isSummary ? i : acc, -1);
                        const followUpFromSummary = lastSummaryIdx >= 0 ? messages.slice(lastSummaryIdx + 1) : [];
                        const followUpByFlag = messages.filter(m => m.isDirectFollowUp || m.id.includes('-debate-followup-') || (m.expertId === '__user__' && m.id.includes('user-debate-followup')));
                        const followUpMsgs = followUpFromSummary.length > 0 ? followUpFromSummary : followUpByFlag;
                        if (followUpMsgs.length === 0) return null;
                        return (
                          <div className="space-y-2.5 pt-3 border-t border-slate-200 mt-3">
                            {followUpMsgs.map(msg => {
                              if (msg.expertId === '__user__') {
                                return (
                                  <div key={msg.id} className="flex justify-end">
                                    <div className="max-w-[70%] bg-blue-50 text-slate-800 rounded-2xl rounded-br-md px-4 py-3 text-[13px] shadow-sm">
                                      <ReactMarkdownInline content={msg.content} />
                                    </div>
                                  </div>
                                );
                              }
                              if (msg.expertId === '__round__') return null;
                              const expert = allExperts.find(e => e.id === msg.expertId);
                              if (!expert) return null;
                              return (
                                <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant={isManagedAutoAgent(expert.id) ? 'agent-card' : 'general-card'} />
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()
              ) : discussionMode === 'brainstorm' && messages.length > 0 ? (
                /* Brainstorm: curated or grid layout — wrapped in card */
                <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-6">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm min-h-[calc(100vh-200px)] flex flex-col overflow-hidden">
                    {/* 헤더 */}
                    <div className="shrink-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-5 py-3 rounded-t-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[16px]">💡</span>
                        <span className="text-[16px] font-extrabold text-slate-800 dark:text-slate-200">브레인스토밍</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {activeExperts.map(e => (
                          <span key={e.id} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700">
                            <ExpertAvatar expert={e} size="xs" /> {e.nameKo}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* 콘텐츠 */}
                    <div className="flex-1 p-5">
                {(() => {
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

                    // 스트리밍 중이면 결과 정리 중 표시
                    if (msg.isStreaming) {
                      return (
                        <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-500">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[24px] shadow-lg mb-5">
                            📋
                          </div>
                          <h3 className="text-[15px] font-bold text-slate-800 mb-1">결과를 정리하고 있습니다</h3>
                          <p className="text-[12px] text-slate-400 mb-5">아이디어를 분석하고 구조화하는 중...</p>
                          <div className="flex items-center gap-1.5">
                            <span className="typing-dot w-1.5 h-1.5 rounded-full bg-violet-400" />
                            <span className="typing-dot w-1.5 h-1.5 rounded-full bg-violet-400" />
                            <span className="typing-dot w-1.5 h-1.5 rounded-full bg-violet-400" />
                          </div>
                        </div>
                      );
                    }

                    // JSON 파싱 시도 — 다단계 복구
                    let data: any = null;
                    try {
                      let raw = msg.content;
                      // markdown 코드블록 제거
                      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').replace(/```\s*$/gi, '');
                      // JSON 객체 추출
                      const jsonMatch = raw.match(/\{[\s\S]*\}/);
                      if (jsonMatch) {
                        let jsonStr = jsonMatch[0];
                        // 1차: 줄바꿈/탭 제거
                        jsonStr = jsonStr.replace(/[\r\n]/g, ' ').replace(/\t/g, ' ');
                        try { data = JSON.parse(jsonStr); } catch {
                          // 2차: JSON 문자열 내부 줄바꿈 이스케이프
                          jsonStr = jsonStr.replace(/"([^"]*?)"/g, (_m, p1) => `"${p1.replace(/\n/g, '\\n').replace(/\r/g, '')}"`);
                          try { data = JSON.parse(jsonStr); } catch {
                            // 3차: 제어 문자 전부 제거
                            jsonStr = Array.from(jsonStr, (char) => {
                              const code = char.charCodeAt(0);
                              return code < 32 || code === 127 ? ' ' : char;
                            }).join('');
                            try { data = JSON.parse(jsonStr); } catch { /* 최종 실패 */ }
                          }
                        }
                      }
                    } catch { /* 파싱 완전 실패 → fallback */ }

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
                                <Fragment key={i}>
                                  <div className="flex-1 rounded-lg bg-indigo-50 border border-indigo-200 p-2 text-center">
                                    <div className="text-[10px] font-bold text-indigo-600">{r.phase}</div>
                                    <div className="text-[9px] text-indigo-400 mt-0.5">{r.desc}</div>
                                  </div>
                                  {i < data.roadmap.length - 1 && <span className="text-[10px] text-slate-300 shrink-0">→</span>}
                                </Fragment>
                              ))}
                            </div>
                          )}
                          {data.summary && <div className="text-center px-4 py-3 rounded-xl bg-slate-100"><span className="text-[12px] text-slate-600">💡 {data.summary}</span></div>}
                        </div>
                      );
                    }

                    // ── Design Thinking 렌더링 ──
                    if (fwId === 'designthinking') {
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
                })()}
                    </div>
                  </div>
                </div>
              ) : discussionMode === 'standard' && messages.length > 0 ? (
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
                    } else if (!msg.isSummary && msg.expertId !== '__user__' && !msg.isDirectFollowUp && !msg.id.includes('-debate-followup-')) {
                      currentMsgs.push(msg);
                    }
                  }
                  if (currentLabel) rounds.push({ label: currentLabel, id: currentId, msgs: currentMsgs });

                  // stdActiveRound is now a proper separate state (no longer aliased to proconActiveRound)
                  const activeRound = Math.min(stdActiveRound, rounds.length - 1);
                  const currentRound = rounds[activeRound >= 0 ? activeRound : 0];

                  // Note: auto-scroll to last round is handled by useEffect below

                  return (
                    <div className="space-y-3">
                      {/* 라운드 탭 */}
                      {/* 회색 칸 — 라운드 탭 + 발언 */}
                      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                        {/* 라운드 탭 */}
                        {rounds.length > 0 && (
                          <div className="flex items-center gap-0.5 bg-slate-50 border-b border-slate-200 px-2 py-1 overflow-x-auto scrollbar-none">
                            {rounds.map((r, ri) => {
                              const isActive = ri === (activeRound >= 0 ? activeRound : 0);
                              const roundNum = r.label.match(/(\d)/)?.[1] || '';
                              const isFinal = r.label.includes('최종');
                              return (
                                <button key={r.id} onClick={() => setStdActiveRound(ri)}
                                  className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md transition-all shrink-0 text-[10px] font-semibold',
                                    isActive
                                      ? isFinal ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm' : 'bg-indigo-500 text-white shadow-sm'
                                      : r.msgs.length > 0 ? 'text-slate-500 hover:text-slate-700 hover:bg-white' : 'text-slate-300')}>
                                  <span className="text-[11px] font-black">{isFinal ? '⚖️' : `${roundNum}R`}</span>
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
                                    <div className="max-w-[70%] bg-blue-50 text-slate-800 rounded-2xl rounded-br-md px-4 py-3 text-[13px] shadow-sm">
                                      <ReactMarkdownInline content={msg.content} />
                                    </div>
                                  </div>
                                );
                              }
                              if (msg.expertId === '__round__') return null;
                              const expert = allExperts.find(e => e.id === msg.expertId);
                              if (!expert) return null;
                              return (
                                <DiscussionMessageCard key={msg.id} message={msg} expert={expert} variant={isManagedAutoAgent(expert.id) ? 'agent-card' : 'general-card'} />
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()
              ) : discussionMode === 'aivsuser' && messages.length > 0 ? (
                /* AI vs User: battle card */
                (() => {
                  const battleConfig = activeAivsBattleConfig;
                  const aiOpponents = activeExperts.length > 0 ? activeExperts : [];
                  const userStanceKo = aivsUserStance === 'pro' ? '찬성' : '반대';
                  const aiStanceKo = aivsUserStance === 'pro' ? '반대' : '찬성';
                  const headerBattleAi = battleConfig ? BATTLE_AI_CHARACTERS.find(a => a.id === battleConfig.battleAiId) : null;
                  const roundJudges = messages.filter(m => m.expertId === '__avsu_judge__');
                  const currentRound = roundJudges.length;
                  return (
                    <div className="max-w-3xl mx-auto pt-4 pb-6">
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm min-h-[calc(100vh-200px)] flex flex-col overflow-hidden">
                        {/* 배틀 헤더 — 키보드 배틀 스타일 */}
                        <div className="shrink-0 bg-slate-950 relative overflow-hidden">
                          {/* 배경 — 대각선 스트라이프 + 그라데이션 + 글로우 */}
                          <div className="absolute inset-0 kb-battle-stripes" />
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-transparent to-rose-900/40" />
                          <div className="absolute top-0 left-0 w-2/5 h-full bg-gradient-to-r from-blue-600/25 to-transparent" />
                          <div className="absolute top-0 right-0 w-2/5 h-full bg-gradient-to-l from-rose-600/25 to-transparent" />
                          {/* 상단 스캔라인 효과 */}
                          <div className="absolute inset-0 kb-scanlines pointer-events-none" />
                          {/* 상단/하단 네온 라인 */}
                          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-amber-400 to-rose-500 kb-glow-line" />
                          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-blue-500/50 via-amber-400/50 to-rose-500/50" />

                          {/* 콘텐츠 */}
                          <div className="relative px-5 pt-3 pb-4">
                            {/* 타이틀 */}
                            <div className="text-center mb-3">
                              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400/80">⌨️ 키보드 배틀</span>
                              {isDiscussing && <span className="ml-2 inline-flex items-center text-[8px] font-black text-red-400 uppercase tracking-[0.2em] animate-pulse">● LIVE</span>}
                              {currentRound > 0 && <span className="ml-2 text-[9px] font-bold text-amber-300/70 tracking-wider">ROUND {currentRound}</span>}
                            </div>

                            <div className="flex items-center justify-between">
                              {/* 유저 (좌측) */}
                              <div className="flex-1 flex items-center gap-3">
                                <div className="relative">
                                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 via-blue-500 to-blue-700 flex items-center justify-center text-[22px] shadow-lg shadow-blue-500/40 ring-2 ring-blue-400/60 kb-avatar-glow-blue">
                                    🙋
                                  </div>
                                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-blue-500 flex items-center justify-center text-[8px] font-black text-white shadow-md border border-blue-400">⚔️</div>
                                </div>
                                <div>
                                  <div className="text-[14px] font-black text-white tracking-wide drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]">나</div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black bg-blue-500/30 text-blue-200 border border-blue-400/40 shadow-[0_0_6px_rgba(59,130,246,0.3)]">{userStanceKo}</span>
                                  </div>
                                </div>
                              </div>

                              {/* VS 중앙 — 큰 임팩트 */}
                              <div className="shrink-0 mx-4 flex flex-col items-center">
                                <div className="relative">
                                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-amber-400 via-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/50 kb-vs-pulse border-2 border-amber-300/40">
                                    <span className="text-[20px] font-black text-white kb-vs-text" style={{ textShadow: '0 0 10px rgba(251,191,36,0.8), 0 0 20px rgba(251,146,36,0.5), 0 2px 4px rgba(0,0,0,0.5)' }}>VS</span>
                                  </div>
                                  {/* 방사형 글로우 */}
                                  <div className="absolute inset-[-8px] rounded-3xl bg-amber-500/10 blur-md kb-vs-glow pointer-events-none" />
                                </div>
                              </div>

                              {/* AI (우측) */}
                              <div className="flex-1 flex items-center gap-3 justify-end">
                                <div className="text-right">
                                  <div className="text-[14px] font-black text-white tracking-wide drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]">
                                    {headerBattleAi ? headerBattleAi.name : (aiOpponents.map(e => e.nameKo).join(', ') || 'AI')}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black bg-rose-500/30 text-rose-200 border border-rose-400/40 shadow-[0_0_6px_rgba(244,63,94,0.3)]">{aiStanceKo}</span>
                                  </div>
                                </div>
                                <div className="relative">
                                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-400 via-rose-500 to-rose-700 flex items-center justify-center shadow-lg shadow-rose-500/40 ring-2 ring-rose-400/60 overflow-hidden kb-avatar-glow-red">
                                    {headerBattleAi ? <span className="text-[22px]">{headerBattleAi.icon}</span> : aiOpponents[0] ? <ExpertAvatar expert={aiOpponents[0]} size="sm" /> : <span className="text-[20px]">🤖</span>}
                                  </div>
                                  <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-md bg-rose-500 flex items-center justify-center text-[8px] font-black text-white shadow-md border border-rose-400">🛡️</div>
                                </div>
                              </div>
                            </div>

                            {/* 주제 — 하단 크게 */}
                            {battleConfig && (
                              <div className="mt-3 text-center bg-white/[0.06] rounded-lg px-4 py-2 border border-white/10 backdrop-blur-sm">
                                <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-0.5">TOPIC</div>
                                <span className="text-[13px] font-bold text-slate-200 leading-snug">{battleConfig.topicTitle}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* 대화 영역 */}
                        <div className="flex-1 bg-white dark:bg-slate-900">
                          {messages.map((msg, idx) => {
                            // Judge card
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
                                    <div key={msg.id} className="px-5 py-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
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

                                // Round judgment
                                return (
                                  <div key={msg.id} className="px-5 py-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                      <div className="flex items-center justify-between mb-2.5">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">⚖️ {j.round || ''}라운드 판정</span>
                                        <span className="text-[12px] font-bold">{winnerEmoji} {winnerText}</span>
                                      </div>
                                      <div className="space-y-1.5 mb-3">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] text-blue-500 w-8 shrink-0 font-bold">유저</span>
                                          <div className="flex-1 bg-slate-200 dark:bg-slate-600 rounded-full h-2.5 overflow-hidden">
                                            <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{width: `${userPct}%`}} />
                                          </div>
                                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 w-12 text-right">{userTotal}/50</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] text-rose-500 w-8 shrink-0 font-bold">AI</span>
                                          <div className="flex-1 bg-slate-200 dark:bg-slate-600 rounded-full h-2.5 overflow-hidden">
                                            <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{width: `${aiPct}%`}} />
                                          </div>
                                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 w-12 text-right">{aiTotal}/50</span>
                                        </div>
                                      </div>
                                      {j.comment && <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">💬 {j.comment}</p>}
                                      {j.user_feedback && <p className="text-[10px] text-indigo-600 mt-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg px-2.5 py-1.5">📌 {j.user_feedback}</p>}
                                    </div>
                                  </div>
                                );
                              } catch { return null; }
                            }
                            // Round separator — 키배 모드는 헤더에 표시되므로 숨김
                            if (msg.expertId === '__round__') {
                              return null;
                            }
                            // Summary
                            if (msg.isSummary) {
                              const expert = allExperts.find(e => e.id === msg.expertId);
                              if (!expert) return null;
                              return <div key={msg.id} className="px-5 py-3"><DiscussionMessageCard message={msg} expert={expert} variant="default" /></div>;
                            }
                            // User message — 오른쪽, 파란색
                            if (msg.expertId === '__user__') {
                              return (
                                <div key={msg.id} className="px-5 py-2 flex justify-end animate-in fade-in slide-in-from-right-2 duration-300">
                                  <div className="max-w-[75%] flex items-start gap-2">
                                    <div className="bg-blue-500 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-[13px] leading-relaxed shadow-sm">
                                      <ReactMarkdownInline content={msg.content} />
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            // Skip system
                            if (msg.expertId === '__summary__' || msg.expertId === '__ppt_download__') return null;
                            // AI message — 왼쪽, 빨간색
                            const expert = allExperts.find(e => e.id === msg.expertId);
                            if (!expert) return null;
                            return (
                              <div key={msg.id} className="px-5 py-2 flex justify-start animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="max-w-[75%] flex items-start gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0 mt-0.5 ring-2 ring-rose-300 dark:ring-rose-700">
                                    {headerBattleAi ? <span className="text-[16px]">{headerBattleAi.icon}</span> : <ExpertAvatar expert={expert} size="xs" active={msg.isStreaming} />}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">{headerBattleAi ? headerBattleAi.name : expert.nameKo}</span>
                                    <div className="mt-0.5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl rounded-tl-sm px-4 py-2.5 text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
                                      {msg.content ? <LazyMarkdown content={msg.content} fallback={<span>{msg.content}</span>} /> : (msg.isStreaming ? <span className="text-slate-400 animate-pulse">...</span> : '')}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : discussionMode === 'freetalk' && messages.length > 0 ? (
                /* Freetalk: outer padding 없음 — 카드 테두리가 입력창 텍스트 영역과 동일 위치 */
                <div className="max-w-3xl mx-auto pt-4 pb-2">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm min-h-[calc(100vh-200px)] flex flex-col">
                    {/* 헤더 */}
                    <div className="shrink-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-5 py-3 rounded-t-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[16px]">💬</span>
                        <span className="text-[14px] font-extrabold text-slate-800 dark:text-slate-200">자유 토론</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {activeExperts.map(e => (
                          <span key={e.id} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700">
                            <ExpertAvatar expert={e} size="xs" /> {e.nameKo}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* 대화 영역 */}
                    <div className="flex-1 p-5 space-y-2">
                  {messages.map((msg) => {
                    // Round separator
                    if (msg.expertId === '__round__') {
                      return (
                        <div key={msg.id} className="flex justify-center py-2">
                          <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] text-slate-400 font-medium">{msg.content}</span>
                        </div>
                      );
                    }
                    // Summary card — 카드 밖에서 렌더링, 여기서는 스킵
                    if (msg.isSummary) return null;
                    // User message
                    if (msg.expertId === '__user__') {
                      return (
                        <div key={msg.id} className="flex justify-end mt-4">
                          <div className="max-w-[70%] bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-br-md px-4 py-2.5 text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
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
                      gpt: { bg: 'bg-blue-100/50', border: 'border-blue-200', name: 'text-blue-600' },
                      claude: { bg: 'bg-violet-100/50', border: 'border-violet-200', name: 'text-violet-600' },
                      gemini: { bg: 'bg-emerald-100/50', border: 'border-emerald-200', name: 'text-emerald-600' },
                      perplexity: { bg: 'bg-cyan-100/50', border: 'border-cyan-200', name: 'text-cyan-600' },
                      grok: { bg: 'bg-orange-100/50', border: 'border-orange-200', name: 'text-orange-600' },
                      deepseek: { bg: 'bg-indigo-100/50', border: 'border-indigo-200', name: 'text-indigo-600' },
                      qwen: { bg: 'bg-teal-100/50', border: 'border-teal-200', name: 'text-teal-600' },
                    };
                    // Hash-based color for non-AI-model experts
                    const hashColors = [
                      { bg: 'bg-rose-100/50', border: 'border-rose-200', name: 'text-rose-600' },
                      { bg: 'bg-amber-100/50', border: 'border-amber-200', name: 'text-amber-600' },
                      { bg: 'bg-lime-100/50', border: 'border-lime-200', name: 'text-lime-600' },
                      { bg: 'bg-sky-100/50', border: 'border-sky-200', name: 'text-sky-600' },
                      { bg: 'bg-fuchsia-100/50', border: 'border-fuchsia-200', name: 'text-fuchsia-600' },
                      { bg: 'bg-pink-100/50', border: 'border-pink-200', name: 'text-pink-600' },
                      { bg: 'bg-emerald-100/50', border: 'border-emerald-200', name: 'text-emerald-600' },
                      { bg: 'bg-violet-100/50', border: 'border-violet-200', name: 'text-violet-600' },
                    ];
                    const getBubbleStyle = (id: string) => {
                      if (bubbleColorMap[id]) return bubbleColorMap[id];
                      let hash = 0;
                      for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
                      return hashColors[Math.abs(hash) % hashColors.length];
                    };
                    const bStyle = getBubbleStyle(expert.id);
                    // 전문가별 좌/우 교차 배치
                    const expertIdx = activeExperts.findIndex(e => e.id === expert.id);
                    const isRight = expertIdx % 2 === 1;
                    return (
                      <div key={msg.id} className={cn('flex items-start gap-2.5 mt-4 animate-in fade-in duration-400 max-w-[85%]',
                        isRight ? 'flex-row-reverse ml-auto slide-in-from-right-2' : 'slide-in-from-left-2')}>
                        <ExpertAvatar expert={expert} size="sm" active={msg.isStreaming} />
                        <div className={cn('min-w-0 flex-1', isRight && 'text-right')}>
                          <span className={cn('text-[11px] font-bold', bStyle.name)}>{expert.nameKo}</span>
                          <div className={cn('mt-1 px-3.5 py-2.5 border text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed text-left',
                            isRight ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-tl-md',
                            bStyle.bg, bStyle.border)}>
                            {msg.content ? <LazyMarkdown content={msg.content} fallback={<span>{msg.content}</span>} /> : (msg.isStreaming ? <span className="text-slate-400">...</span> : '')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                    </div>
                  </div>
                </div>
              ) : activeGame ? null : (
                /* All other modes: sequential */
                messages.map((msg, idx) => {
                  // 시뮬레이션 브리핑 — 헤더로 이동, 렌더링 스킵
                  if (msg.expertId === '__sim_briefing__') return null;
                  // 대화 요약 카드 — 전체 폭, 인디고 테마
                  if (msg.expertId === '__summary__') {
                    return <SummaryMessageCard key={msg.id} content={msg.content} />;
                  }
                  // PPT 다운로드 버튼
                  if (msg.expertId === '__ppt_download__') {
                    return <PptDownloadCard key={msg.id} content={msg.content} loadPptGenerator={loadPptGenerator} />;
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
                    // 키배 모드는 VS 헤더가 별도이므로 round 메시지 숨김
                    if (discussionMode === 'aivsuser') return null;
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

                  // ── AI vs User: 디씨 키배 스타일 렌더링 ──
                  if (discussionMode === 'aivsuser' && msg.expertId !== '__round__') {
                    const isUser = msg.expertId === '__user__';
                    const expert = isUser ? null : allExperts.find(e => e.id === msg.expertId);
                    if (!isUser && !expert) return null;
                    const isFirstPost = idx === 0 || (idx === 1 && messages[0].expertId === '__round__');
                    const isReply = !isFirstPost;
                    const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
                    const bAiChar = activeAivsBattleConfig ? BATTLE_AI_CHARACTERS.find(a => a.id === activeAivsBattleConfig.battleAiId) : null;

                    return (
                      <div key={msg.id} className="animate-in fade-in duration-200 border-b border-slate-100">
                        <div className={cn('flex py-2 px-3', isReply ? 'pl-8' : 'pl-3')}>
                          {isReply && (
                            <span className="text-slate-300 text-[13px] font-mono select-none shrink-0 mr-2 mt-0.5">ㄴ</span>
                          )}
                          <div className="shrink-0 w-[80px] pt-0.5">
                            {isUser ? (
                              <span className="text-[12px] font-bold text-blue-600">나</span>
                            ) : bAiChar ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[12px] shrink-0">{bAiChar.icon}</span>
                                <span className="text-[12px] font-bold text-rose-600 truncate">{bAiChar.name}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span className="text-[12px] font-bold text-rose-600 truncate">{expert!.nameKo}</span>
                              </div>
                            )}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0 text-[13px] text-slate-800 leading-relaxed break-words">
                            {msg.content ? (
                              <LazyMarkdown content={msg.content} fallback={<span>{msg.content}</span>} />
                            ) : (
                              msg.isStreaming && <span className="text-slate-400 animate-pulse">...</span>
                            )}
                          </div>
                          {/* Timestamp */}
                          {timeStr && (
                            <span className="shrink-0 text-[10px] text-slate-300 pt-0.5 ml-2 tabular-nums">{timeStr}</span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (msg.expertId === '__user__') {
                    // Stakeholder: 유저 메시지 — 오른쪽
                    if (discussionMode === 'stakeholder') {
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
                            ? 'max-w-[75%] bg-indigo-500 dark:bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-3 text-[13px] shadow-sm leading-relaxed'
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
                <div className={cn("mx-auto px-4 sm:px-6 py-2.5 pb-4 space-y-2", (discussionMode === 'multi' && messages.length > 0) || discussionMode === 'stakeholder' || discussionMode === 'procon' || discussionMode === 'standard' || discussionMode === 'freetalk' || discussionMode === 'aivsuser' ? 'max-w-3xl' : (getMainMode(discussionMode) === 'general' ? 'max-w-[710px]' : 'max-w-2xl'))}>
                {/* Progress bar + Active bot + Stop */}
                {isDiscussing && (
                  <div className="flex items-center gap-3">
                    {activeExpert && (
                      <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                        <ExpertAvatar expert={activeExpert} size="xs" active />
                        <span className="text-[11px] font-medium text-slate-500">{discussionMode === 'aivsuser' && activeAivsBattleConfig ? (BATTLE_AI_CHARACTERS.find(a => a.id === activeAivsBattleConfig.battleAiId)?.name || activeExpert.nameKo) : (discussionMode === 'stakeholder' && messages.find(m => m.isStreaming && m.simRoleName)?.simRoleName) || activeExpert.nameKo} 응답 중</span>
                        <span className="flex items-center gap-0.5">
                          <span className="typing-dot w-1 h-1 rounded-full bg-primary/50" />
                          <span className="typing-dot w-1 h-1 rounded-full bg-primary/50" />
                          <span className="typing-dot w-1 h-1 rounded-full bg-primary/50" />
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {/* 토론 모드 후속질문 — 전문가 선택 칩 + 토론 분석 버튼 */}
                {!isDiscussing && messages.length > 0 && ['standard', 'procon', 'brainstorm', 'hearing', 'freetalk'].includes(discussionMode) && activeExperts.length >= 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap px-1">
                    <span className="text-[10px] text-slate-400">질문 대상 선택:</span>
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
                {/* 분석 내용 패널 (토론자 칩 아래) */}
                {showDebateAnalysis && !isDiscussing && ['standard', 'procon', 'brainstorm', 'hearing'].includes(discussionMode) && (
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 bg-slate-50">
                      <span className="text-[11px] font-bold text-slate-600">
                        {debateAnalysisTab === 'points' ? '📋 논점 정리' : debateAnalysisTab === 'table' ? '📊 라운드 분석' : '🏆 형세 판단'}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => {
                            const text = debateAnalysisContent[debateAnalysisTab];
                            if (text) {
                              navigator.clipboard.writeText(text);
                              setDebateAnalysisCopied(true);
                              setTimeout(() => setDebateAnalysisCopied(false), 1500);
                            }
                          }}
                          className={cn('p-1 rounded-md transition-colors', debateAnalysisCopied ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600 hover:bg-white')}
                          title="복사"
                        >
                          {debateAnalysisCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => setShowDebateAnalysis(false)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
                          title="닫기"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="px-3 py-3 max-h-[300px] overflow-y-auto">
                      {debateAnalysisLoading && !debateAnalysisContent[debateAnalysisTab] ? (
                        <div className="flex items-center justify-center py-6 gap-2">
                          <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
                          <span className="text-[11px] text-slate-400">AI가 분석 중...</span>
                        </div>
                      ) : debateAnalysisContent[debateAnalysisTab] ? (
                        <div className="prose prose-sm max-w-none text-[12px] text-slate-700 leading-relaxed prose-headings:text-[13px] prose-headings:font-bold prose-headings:text-slate-800 prose-th:text-[11px] prose-td:text-[11px]">
                          <LazyMarkdown content={debateAnalysisContent[debateAnalysisTab]} fallback={<span className="whitespace-pre-wrap">{debateAnalysisContent[debateAnalysisTab]}</span>} />
                        </div>
                      ) : (
                        <div className="text-center py-4 text-[11px] text-slate-400">분석 결과가 없습니다</div>
                      )}
                    </div>
                  </div>
                )}
                {!isDiscussing && messages.length > 0 && discussionMode === 'multi' && activeExperts.length >= 1 ? (
                  <div className="rounded-2xl border-2 border-violet-300 bg-white shadow-sm overflow-hidden">
                    <div className="px-4 py-1.5 border-b border-violet-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex items-center gap-1 rounded-xl bg-slate-100 border border-slate-200 p-0.5 shrink-0">
                          {([['overview', '전체'], ['detail', '상세']] as const).map(([v, label]) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setMultiView(v)}
                              className={cn(
                                'h-[28px] px-3 rounded-lg text-[11px] font-semibold transition-all',
                                multiView === v
                                  ? 'bg-white text-slate-800 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-700'
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        <div className="w-px h-4.5 bg-slate-200 shrink-0" />

                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <span className="shrink-0 text-[10.5px] font-semibold text-slate-500">
                            누구에게 물어볼까요?
                          </span>
                          <div className="min-w-0 flex-1 overflow-x-auto scrollbar-none">
                            <div className="flex items-center gap-1.5 min-w-max pr-1">
                              {activeExperts.map((expert) => {
                                const isSelected = multiFollowUpTargetIds.includes(expert.id);
                                return (
                                  <button
                                  key={expert.id}
                                  type="button"
                                  onClick={() => toggleMultiFollowUpTarget(expert.id)}
                                  className={cn(
                                      'h-[28px] inline-flex items-center gap-1.5 px-3 rounded-full text-[11px] font-semibold transition-all border shrink-0',
                                      isSelected
                                        ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                                    )}
                                  >
                                    <ExpertAvatar expert={expert} size="xs" />
                                    {expert.nameKo}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Suspense fallback={null}>
                      <LazyQuestionInput
                        onSubmit={isDone ? (q: string) => {
                          if (discussionMode === 'multi') {
                            handleFollowUp(q);
                          } else if (['standard', 'procon', 'brainstorm', 'hearing'].includes(discussionMode)) {
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
                        disabled={((discussionMode !== 'stakeholder' && discussionMode !== 'aivsuser' && activeExperts.length < 1) || (discussionMode === 'multi' && messages.length === 0 && activeExperts.length < 2) || (discussionMode === 'standard' && messages.length === 0 && activeExperts.length < 2) || (discussionMode === 'freetalk' && messages.length === 0 && activeExperts.length < 2)) || (discussionMode === 'aivsuser' && !hasAivsBattleStarted)}
                        isStreaming={isDiscussing}
                        onStop={stopDiscussion}
                        discussionMode={discussionMode}
                        selectedExperts={activeExperts}
                        onToggleSettings={() => setShowDebateSettings((prev) => !prev)}
                        showSettings={showDebateSettings}
                        isFollowUp={isDone}
                        onConclusion={discussionMode === 'aivsuser' && activeAivsBattleConfig?.verdictMode !== 'none' && messages.length > 2 && !isDiscussing ? () => handleFollowUp('__AVSU_END__') : undefined}
                        placeholderOverride={discussionMode === 'aivsuser' && !hasAivsBattleStarted ? '배틀 시작을 눌러 설정하세요' : discussionMode === 'aivsuser' && !isDone ? '첫 주장 입력' : undefined}
                        onSummarize={discussionMode === 'general' ? handleSummarize : undefined}
                        isSummarizing={isSummarizing}
                        messageCount={messages.filter(m => m.expertId !== '__user__' && m.expertId !== '__summary__' && m.expertId !== '__round__' && m.expertId !== '__brainstorm_progress__').length}
                        externalValue={sampleQuestionValue}
                        onExternalValueConsumed={() => setSampleQuestionValue('')}
                        embedded
                        debateSettings={debateSettings}
                        onDebateSettingsChange={setDebateSettings}
                        extraButtons={discussionMode === 'procon' && !isDiscussing && messages.length > 2 ? (
                          <div className="flex items-center gap-0.5">
                            {([
                              { id: 'points' as const, label: '논점 정리', icon: '📋' },
                              { id: 'table' as const, label: '라운드 분석', icon: '📊' },
                              { id: 'verdict' as const, label: '형세 판단', icon: '🏆' },
                            ]).map(t => (
                              <button key={t.id} type="button"
                                onClick={() => {
                                  if (showDebateAnalysis && debateAnalysisTab === t.id) {
                                    setShowDebateAnalysis(false);
                                  } else {
                                    setShowDebateAnalysis(true);
                                    setDebateAnalysisTab(t.id);
                                    if (!debateAnalysisContent[t.id]) requestDebateAnalysis(t.id);
                                  }
                                }}
                                className={cn('px-2.5 py-1 rounded-lg text-[9px] font-medium transition-all border',
                                  showDebateAnalysis && debateAnalysisTab === t.id ? 'bg-slate-700 text-white border-slate-700' : 'text-slate-500 border-slate-300 hover:text-slate-700 hover:border-slate-400 hover:bg-slate-50 analysis-btn-glow')}
                              >
                                {t.icon} {t.label}
                              </button>
                            ))}
                          </div>
                        ) : undefined}
                      />
                    </Suspense>
                  </div>
                ) : (
                  <Suspense fallback={null}>
                    <LazyQuestionInput
                      onSubmit={isDone ? (q: string) => {
                        if (discussionMode === 'multi') {
                          handleFollowUp(q);
                        } else if (['standard', 'procon', 'brainstorm', 'hearing', 'freetalk'].includes(discussionMode)) {
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
                      disabled={((discussionMode !== 'stakeholder' && discussionMode !== 'aivsuser' && activeExperts.length < 1) || (discussionMode === 'multi' && messages.length === 0 && activeExperts.length < 2) || (discussionMode === 'standard' && messages.length === 0 && activeExperts.length < 2) || (discussionMode === 'freetalk' && messages.length === 0 && activeExperts.length < 2)) || (discussionMode === 'aivsuser' && !hasAivsBattleStarted) || (isDone && ['standard', 'procon', 'brainstorm', 'hearing', 'freetalk'].includes(discussionMode) && !followUpTarget)}
                      isStreaming={isDiscussing}
                      onStop={stopDiscussion}
                      discussionMode={discussionMode}
                      selectedExperts={activeExperts}
                      onToggleSettings={() => setShowDebateSettings((prev) => !prev)}
                      showSettings={showDebateSettings}
                      isFollowUp={isDone}
                      onConclusion={discussionMode === 'aivsuser' && activeAivsBattleConfig?.verdictMode !== 'none' && messages.length > 2 && !isDiscussing ? () => handleFollowUp('__AVSU_END__') : undefined}
                      placeholderOverride={discussionMode === 'aivsuser' && !hasAivsBattleStarted ? '배틀 시작을 눌러 설정하세요' : discussionMode === 'aivsuser' && !isDone ? '첫 주장 입력' : undefined}
                      onSummarize={discussionMode === 'general' ? handleSummarize : undefined}
                      isSummarizing={isSummarizing}
                      messageCount={messages.filter(m => m.expertId !== '__user__' && m.expertId !== '__summary__' && m.expertId !== '__round__' && m.expertId !== '__brainstorm_progress__').length}
                      externalValue={sampleQuestionValue}
                      onExternalValueConsumed={() => setSampleQuestionValue('')}
                      debateSettings={debateSettings}
                      onDebateSettingsChange={setDebateSettings}
                      extraButtons={discussionMode === 'procon' && !isDiscussing && messages.length > 2 ? (
                        <div className="flex items-center gap-0.5">
                          {([
                            { id: 'points' as const, label: '논점 정리', icon: '📋' },
                            { id: 'table' as const, label: '라운드 분석', icon: '📊' },
                            { id: 'verdict' as const, label: '형세 판단', icon: '🏆' },
                          ]).map(t => (
                            <button key={t.id} type="button"
                              onClick={() => {
                                if (showDebateAnalysis && debateAnalysisTab === t.id) {
                                  setShowDebateAnalysis(false);
                                } else {
                                  setShowDebateAnalysis(true);
                                  setDebateAnalysisTab(t.id);
                                  if (!debateAnalysisContent[t.id]) requestDebateAnalysis(t.id);
                                }
                              }}
                              className={cn('px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all border',
                                showDebateAnalysis && debateAnalysisTab === t.id ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : 'text-slate-500 border-slate-200 bg-white hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50')}
                            >
                              {t.icon} {t.label}
                            </button>
                          ))}
                        </div>
                      ) : undefined}
                    />
                  </Suspense>
                )}
              </div>
            </div>
          )}
        </>}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={() => setShowSettingsModal(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div onClick={e => e.stopPropagation()} className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-[16px] font-bold text-slate-800">설정</h2>
              <button onClick={() => setShowSettingsModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* 토론 설정 */}
              <div>
                <h3 className="text-[13px] font-semibold text-slate-700 mb-3">토론 설정</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-600">기본 분량</span>
                    <div className="flex gap-1">
                      {(['short', 'medium', 'long'] as const).map(v => (
                        <button key={v} onClick={() => setDebateSettings(prev => ({ ...prev, responseLength: v }))}
                          className={cn('px-3 py-1 rounded-lg text-[11px] font-medium transition-all',
                            debateSettings.responseLength === v ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
                          {v === 'short' ? '짧게' : v === 'medium' ? '보통' : '길게'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-600">기본 라운드</span>
                    <div className="flex gap-1">
                      {([2, 3, 4] as const).map(v => (
                        <button key={v} onClick={() => setDebateSettings(prev => ({ ...prev, rounds: v }))}
                          className={cn('px-3 py-1 rounded-lg text-[11px] font-medium transition-all',
                            debateSettings.rounds === v ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
                          {v}R
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-600">결론 포함</span>
                    <button onClick={() => setDebateSettings(prev => ({ ...prev, includeConclusion: !prev.includeConclusion }))}
                      className={cn('relative w-10 h-[22px] rounded-full transition-colors duration-200',
                        debateSettings.includeConclusion ? 'bg-slate-800' : 'bg-slate-300')}>
                      <div className={cn('absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                        debateSettings.includeConclusion ? 'translate-x-[18px]' : 'translate-x-0')} />
                    </button>
                  </div>
                </div>
              </div>

              {/* 데이터 관리 */}
              <div>
                <h3 className="text-[13px] font-semibold text-slate-700 mb-3">데이터 관리</h3>
                <div className="space-y-2">
                  <button onClick={() => { if (confirm('모든 대화 기록을 삭제하시겠습니까?')) { localStorage.removeItem('ai-debate-history-v1'); window.location.reload(); } }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 text-[12px] text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors">
                    <span>대화 기록 전체 삭제</span>
                    <span className="text-[10px] text-slate-400">복구 불가</span>
                  </button>
                  <button onClick={() => { localStorage.removeItem('ai-debate-experts-v65'); window.location.reload(); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-slate-200 text-[12px] text-slate-600 hover:bg-slate-50 transition-colors">
                    <span>캐시 초기화</span>
                    <span className="text-[10px] text-slate-400">전문가 데이터 새로고침</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
