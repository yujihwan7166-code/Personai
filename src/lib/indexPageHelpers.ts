import type { DiscussionMessage, Expert } from '@/types/expert';

export type GeneralImageHistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export function mockRoute(question: string, candidates: Expert[]): { expert: Expert; reason: string } {
  const normalizedQuestion = question.toLowerCase();
  const findCandidate = (id: string) => candidates.find((candidate) => candidate.id === id);

  if (/주식|투자|금융|경제|펀드|etf|코인|환율/.test(normalizedQuestion)) {
    return { expert: findCandidate('gpt') ?? candidates[0], reason: '금융·투자 분석 특화' };
  }

  if (/코드|코딩|개발|프로그래밍|javascript|python|typescript|버그|에러/.test(normalizedQuestion)) {
    return { expert: findCandidate('claude') ?? candidates[0], reason: '코딩·논리 추론 특화' };
  }

  if (/검색|최신|뉴스|오늘|날씨|요즘|트렌드|실시간/.test(normalizedQuestion)) {
    return { expert: findCandidate('perplexity') ?? candidates[0], reason: '검색·최신 정보 특화' };
  }

  if (/창작|아이디어|글쓰기|소설|시나리오|브레인스토밍|창의/.test(normalizedQuestion)) {
    return { expert: findCandidate('gemini') ?? candidates[0], reason: '창의·탐색 특화' };
  }

  if (/철학|윤리|사회|정치|역사|문화/.test(normalizedQuestion)) {
    return { expert: findCandidate('claude') ?? candidates[0], reason: '윤리·균형 분석 특화' };
  }

  if (/기술|ai|로봇|미래|혁신|스타트업/.test(normalizedQuestion)) {
    return { expert: findCandidate('grok') ?? candidates[0], reason: '기술·혁신 직설 분석 특화' };
  }

  return { expert: findCandidate('gpt') ?? candidates[0], reason: '범용 분석 및 구조적 답변' };
}

export function buildGeneralImageHistory(messages: DiscussionMessage[], experts: Expert[]): GeneralImageHistoryMessage[] {
  return messages
    .filter((message) => message.expertId !== '__round__' && message.expertId !== '__summary__' && message.content.trim().length > 0)
    .map((message) => {
      if (message.expertId === '__user__') {
        return {
          role: 'user' as const,
          content: message.content,
        };
      }

      const expert = experts.find((item) => item.id === message.expertId);
      return {
        role: 'assistant' as const,
        content: `${expert?.nameKo || 'AI'}: ${message.content}`,
      };
    })
    .slice(-6);
}

export function pickGeneralImageExpert(
  currentExpert: Expert | undefined,
  experts: Expert[],
  question: string,
  messages: DiscussionMessage[],
): Expert | undefined {
  if (currentExpert && currentExpert.id !== 'router') {
    return currentExpert;
  }

  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.expertId !== '__user__' && message.expertId !== '__round__' && message.expertId !== '__summary__' && message.expertId !== 'router');

  if (lastAssistant) {
    const matchedExpert = experts.find((expert) => expert.id === lastAssistant.expertId);
    if (matchedExpert) {
      return matchedExpert;
    }
  }

  const candidates = experts.filter((expert) => expert.id !== 'router' && expert.category === 'ai');
  if (currentExpert?.id === 'router' && candidates.length > 0) {
    return mockRoute(question, candidates).expert;
  }

  return candidates[0];
}
