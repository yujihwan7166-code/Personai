import { lazy } from 'react';
import { createStreamExpert, type StreamExpertFn } from '@/lib/chatStream';
import type { GeneralImageIntent } from '@/lib/generalImage';

export const CHAT_URL = '/api/chat';
export const GENERAL_IMAGE_URL = '/api/general-image';
export const GENERAL_IMAGE_MODEL = 'google/gemini-2.5-flash-image';

export const LazyAppSidebar = lazy(() => import('@/components/AppSidebar').then((module) => ({ default: module.AppSidebar })));
export const LazyMentalTestBrowserModal = lazy(() => import('@/components/MentalTestBrowserModal').then((module) => ({ default: module.MentalTestBrowserModal })));
export const LazyBookmarkGridModal = lazy(() => import('@/components/BookmarkGridModal').then((module) => ({ default: module.BookmarkGridModal })));
export const LazyCommandPalette = lazy(() => import('@/components/CommandPalette').then((module) => ({ default: module.CommandPalette })));
export const LazyOnboardingTour = lazy(() => import('@/components/OnboardingTour').then((module) => ({ default: module.OnboardingTour })));
export const LazyExpertSelectionPanel = lazy(() => import('@/components/ExpertSelectionPanel').then((module) => ({ default: module.ExpertSelectionPanel })));
export const LazyGamePlayer = lazy(() => import('@/components/GamePlayer').then((module) => ({ default: module.GamePlayer })));
export const LazyQuestionInput = lazy(() => import('@/components/QuestionInput').then((module) => ({ default: module.QuestionInput })));
export const LazyPremiumConsultChat = lazy(() => import('@/components/PremiumConsultChat').then((module) => ({ default: module.PremiumConsultChat })));
export const LazyDeepResearchChat = lazy(() => import('@/components/DeepResearchChat').then((module) => ({ default: module.DeepResearchChat })));
export const LazyTranslateChat = lazy(() => import('@/components/TranslateChat').then((module) => ({ default: module.TranslateChat })));
export const LazyFileConvertChat = lazy(() => import('@/components/FileConvertChat').then((module) => ({ default: module.FileConvertChat })));
export const LazyStudyWorkspace = lazy(() => import('@/components/study/StudyWorkspace').then((module) => ({ default: module.StudyWorkspace })));
export const LazyVoiceAnalysisPanel = lazy(() => import('@/components/voice-analysis/VoiceAnalysisPanel').then((module) => ({ default: module.VoiceAnalysisPanel })));
export const LazyMediaGenPanel = lazy(() => import('@/components/media-gen/MediaGenPanel').then((module) => ({ default: module.MediaGenPanel })));

let pptGeneratorPromise: Promise<typeof import('@/lib/pptGenerator')> | null = null;
let questionClassifierPromise: Promise<typeof import('@/utils/agent/questionClassifier')> | null = null;
let agentPipelinePromise: Promise<typeof import('@/utils/agent/agentPipeline')> | null = null;

export type GeneralImageRequestFile = {
  name: string;
  mimeType: string;
  base64: string;
  extractedText?: string;
};

export type GeneralImageApiResponse = {
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

export async function loadPptGenerator() {
  if (!pptGeneratorPromise) {
    pptGeneratorPromise = import('@/lib/pptGenerator');
  }

  return pptGeneratorPromise;
}

export async function loadQuestionClassifier() {
  if (!questionClassifierPromise) {
    questionClassifierPromise = import('@/utils/agent/questionClassifier');
  }

  return questionClassifierPromise;
}

export async function loadAgentPipeline() {
  if (!agentPipelinePromise) {
    agentPipelinePromise = import('@/utils/agent/agentPipeline');
  }

  return agentPipelinePromise;
}

export const DELAY_BETWEEN_EXPERTS = 300;
export const DELAY_BETWEEN_ROUNDS = 500;
export const DELAY_ROUTER_ANALYSIS = 1200;
export const DELAY_ROUTER_TRANSITION = 400;

export const streamExpert: StreamExpertFn = createStreamExpert({
  chatUrl: CHAT_URL,
  safetyGuardrail: '',
  qualityGuardrail: '',
});
