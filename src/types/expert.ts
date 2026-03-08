export interface Expert {
  id: string;
  name: string;
  nameKo: string;
  icon: string;
  color: 'gpt' | 'gemini' | 'medical' | 'investment';
  systemPrompt: string;
}

export interface DiscussionMessage {
  id: string;
  expertId: string;
  content: string;
  isStreaming?: boolean;
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
