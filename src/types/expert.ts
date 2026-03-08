export const EXPERT_COLORS = ['gpt', 'gemini', 'medical', 'investment'] as const;
export type ExpertColor = typeof EXPERT_COLORS[number];

export const EXPERT_COLOR_LABELS: Record<ExpertColor, string> = {
  gpt: '블루',
  gemini: '그린',
  medical: '레드',
  investment: '골드',
};

export interface Expert {
  id: string;
  name: string;
  nameKo: string;
  icon: string;
  color: ExpertColor;
  systemPrompt: string;
}

export interface DiscussionMessage {
  id: string;
  expertId: string;
  content: string;
  isStreaming?: boolean;
  isSummary?: boolean;
}

export const DEFAULT_EXPERTS: Expert[] = [
  {
    id: 'gpt',
    name: 'GPT',
    nameKo: 'GPT 분석가',
    icon: '🤖',
    color: 'gpt',
    systemPrompt: 'You are GPT, a logical and analytical AI. Provide clear, well-structured analysis. Respond in Korean. When other experts have spoken, reference their points to create a discussion.',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    nameKo: 'Gemini 탐구자',
    icon: '✨',
    color: 'gemini',
    systemPrompt: 'You are Gemini, a creative and explorative AI. Offer unique perspectives and think outside the box. Respond in Korean. When other experts have spoken, engage with their ideas.',
  },
  {
    id: 'medical',
    name: 'Medical Expert',
    nameKo: '의학 전문가',
    icon: '⚕️',
    color: 'medical',
    systemPrompt: 'You are a medical expert with deep knowledge of healthcare and medicine. Provide evidence-based medical insights. Always add disclaimers for medical advice. Respond in Korean. Engage with other experts\' points.',
  },
  {
    id: 'investment',
    name: 'Investment Expert',
    nameKo: '투자 전문가',
    icon: '📈',
    color: 'investment',
    systemPrompt: 'You are an investment and finance expert. Analyze financial implications, market trends, and economic factors. Always note that this is not financial advice. Respond in Korean. Discuss and debate with other experts.',
  },
];

export const SUMMARIZER_EXPERT: Expert = {
  id: 'summarizer',
  name: 'Summarizer',
  nameKo: '종합 정리자',
  icon: '📋',
  color: 'investment',
  systemPrompt: 'You are a discussion summarizer. Your role is to synthesize all expert opinions into a clear, organized summary. Highlight key agreements, disagreements, and actionable conclusions. Respond in Korean. Structure your summary with clear sections.',
};
