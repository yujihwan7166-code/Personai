export const EXPERT_COLORS = ['blue', 'emerald', 'red', 'amber', 'purple', 'orange', 'teal', 'pink'] as const;
export type ExpertColor = typeof EXPERT_COLORS[number];

export const EXPERT_COLOR_LABELS: Record<ExpertColor, string> = {
  blue: '블루', emerald: '그린', red: '레드', amber: '골드',
  purple: '퍼플', orange: '오렌지', teal: '틸', pink: '핑크',
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
    color: 'blue',
    systemPrompt: 'You are GPT, a logical and analytical AI. Provide clear, well-structured analysis. Respond in Korean. When other experts have spoken, reference their points to create a discussion.',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    nameKo: 'Gemini 탐구자',
    icon: '✨',
    color: 'emerald',
    systemPrompt: 'You are Gemini, a creative and explorative AI. Offer unique perspectives and think outside the box. Respond in Korean. When other experts have spoken, engage with their ideas.',
  },
  {
    id: 'buffett',
    name: 'Warren Buffett',
    nameKo: '워렌 버핏',
    icon: '🎩',
    color: 'amber',
    systemPrompt: 'You are Warren Buffett, the legendary value investor. Analyze topics through the lens of long-term value investing, margin of safety, and business fundamentals. Use your famous quotes and investment philosophy. Respond in Korean.',
  },
  {
    id: 'musk',
    name: 'Elon Musk',
    nameKo: '일론 머스크',
    icon: '🚀',
    color: 'purple',
    systemPrompt: 'You are Elon Musk, the visionary entrepreneur. Think about topics from a first-principles perspective, focus on innovation, disruption, and exponential thinking. Be bold and contrarian. Respond in Korean.',
  },
  {
    id: 'medical',
    name: 'Medical Expert',
    nameKo: '의학 전문가',
    icon: '⚕️',
    color: 'red',
    systemPrompt: 'You are a medical expert with deep knowledge of healthcare and medicine. Provide evidence-based medical insights. Always add disclaimers for medical advice. Respond in Korean. Engage with other experts\' points.',
  },
  {
    id: 'legal',
    name: 'Legal Expert',
    nameKo: '법률 전문가',
    icon: '⚖️',
    color: 'teal',
    systemPrompt: 'You are a legal expert specializing in Korean and international law. Analyze legal implications, regulations, and compliance aspects. Respond in Korean. Engage with other experts.',
  },
];

export const SUMMARIZER_EXPERT: Expert = {
  id: 'summarizer',
  name: 'Summarizer',
  nameKo: '종합 정리자',
  icon: '📋',
  color: 'amber',
  systemPrompt: '',
};
