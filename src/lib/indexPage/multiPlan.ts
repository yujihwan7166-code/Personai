export function buildMultiResponsePlan(question: string, expertCount: number) {
  const normalized = question.trim();
  const isDeepPrompt = /비교|차이|전망|원인|영향|전략|분석|추천|어떻게|왜|장단점|리스크|시장|가격|유가|금리|환율/.test(normalized);
  const isLongPrompt = normalized.length >= 90;

  let maxTokens = 1200;
  if (expertCount <= 2) {
    maxTokens = isDeepPrompt || isLongPrompt ? 1700 : 1400;
  } else if (expertCount === 3) {
    maxTokens = isDeepPrompt || isLongPrompt ? 1450 : 1200;
  } else {
    maxTokens = isDeepPrompt || isLongPrompt ? 1200 : 1000;
  }

  return {
    maxTokens,
    prompt: [
      '',
      '',
      '다중 관점 모드입니다.',
      '1. 첫 문장에서 당신의 핵심 판단을 먼저 말하세요.',
      '2. 왜 그렇게 보는지 근거와 맥락을 충분히 설명하세요.',
      '3. 다른 AI와 겹치지 않도록 당신만의 관점이나 기준을 분명히 드러내세요.',
      '4. 핵심만 축약하지 말고, 필요한 경우 짧은 소제목이나 bullet로 구조화하세요.',
      expertCount <= 2
        ? '5. 너무 짧게 끝내지 말고 최소 2개 이상 핵심 포인트를 설명하세요.'
        : '5. 다른 참여자와 겹치지 않도록 당신의 전문 관점을 중심으로 2개 이상 포인트를 설명하세요.',
    ].join('\n'),
  };
}
