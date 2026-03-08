export const EXPERT_COLORS = ['blue', 'emerald', 'red', 'amber', 'purple', 'orange', 'teal', 'pink'] as const;
export type ExpertColor = typeof EXPERT_COLORS[number];

export const EXPERT_COLOR_LABELS: Record<ExpertColor, string> = {
  blue: '블루', emerald: '그린', red: '레드', amber: '골드',
  purple: '퍼플', orange: '오렌지', teal: '틸', pink: '핑크',
};

export type ExpertCategory = 'ai' | 'specialist' | 'occupation' | 'celebrity';

export const EXPERT_CATEGORY_LABELS: Record<ExpertCategory, string> = {
  ai: '🤖 AI',
  specialist: '🎓 전문가',
  occupation: '💼 직업',
  celebrity: '⭐ 유명인',
};

export const EXPERT_CATEGORY_ORDER: ExpertCategory[] = ['ai', 'specialist', 'occupation', 'celebrity'];

export interface Expert {
  id: string;
  name: string;
  nameKo: string;
  icon: string;
  color: ExpertColor;
  description: string;
  category: ExpertCategory;
  systemPrompt: string;
}

export type DiscussionRound = 'initial' | 'rebuttal' | 'final';

export const ROUND_LABELS: Record<DiscussionRound, string> = {
  initial: '1라운드 · 초기 의견',
  rebuttal: '2라운드 · 반론/토론',
  final: '3라운드 · 최종 입장',
};

export type DiscussionMode = 'conclusion' | 'standard' | 'procon' | 'freeform' | 'endless';

export const DISCUSSION_MODE_LABELS: Record<DiscussionMode, { label: string; icon: string; description: string }> = {
  conclusion: { label: '결론 도출', icon: '📋', description: '1문단 빠른 요약 결론' },
  standard: { label: '심층 토론', icon: '🎯', description: '3라운드 구조화된 토론' },
  procon: { label: '찬반 토론', icon: '⚔️', description: '찬성 vs 반대 대립 구조' },
  freeform: { label: '자유 대화', icon: '💬', description: '형식 없는 자유로운 대화' },
  endless: { label: '끝장 토론', icon: '🔥', description: '합의에 도달할 때까지' },
};

export interface DiscussionMessage {
  id: string;
  expertId: string;
  content: string;
  isStreaming?: boolean;
  isSummary?: boolean;
  round?: DiscussionRound;
  likes?: number;
  dislikes?: number;
}

export const DEFAULT_EXPERTS: Expert[] = [
  // AI
  { id: 'gpt', name: 'GPT', nameKo: 'GPT', icon: '🤖', color: 'blue', category: 'ai', description: 'AI 분석 전문가',
    systemPrompt: 'You are GPT, a logical and analytical AI. Provide clear, well-structured analysis. Respond in Korean. When other experts have spoken, reference their points to create a discussion.' },
  { id: 'gemini', name: 'Gemini', nameKo: 'Gemini', icon: '✨', color: 'emerald', category: 'ai', description: 'AI 탐색 전문가',
    systemPrompt: 'You are Gemini, a creative and explorative AI. Offer unique perspectives and think outside the box. Respond in Korean. When other experts have spoken, engage with their ideas.' },
  { id: 'grok', name: 'Grok', nameKo: 'Grok', icon: '🧠', color: 'teal', category: 'ai', description: 'AI 위트 전문가',
    systemPrompt: 'You are Grok, an AI created by xAI, known for wit, humor, and unfiltered honesty. Provide sharp, sometimes contrarian analysis with a touch of sarcasm. Be direct and entertaining while still being insightful. Respond in Korean. Engage with other experts\' points.' },
  { id: 'deepseek', name: 'DeepSeek', nameKo: 'DeepSeek', icon: '🔍', color: 'purple', category: 'ai', description: 'AI 심층분석 전문가',
    systemPrompt: 'You are DeepSeek, a Chinese AI known for deep reasoning and cost-efficient intelligence. Provide thorough, methodical analysis with attention to detail. Consider global and Asian market perspectives. Respond in Korean. Engage with other experts\' points.' },
  { id: 'claude', name: 'Claude', nameKo: 'Claude', icon: '🎭', color: 'orange', category: 'ai', description: 'AI 안전·윤리 전문가',
    systemPrompt: 'You are Claude, an AI by Anthropic known for safety, nuance, and careful reasoning. Provide balanced, well-considered analysis. Highlight ethical implications and potential risks. Be thoughtful and measured. Respond in Korean. Engage with other experts\' points.' },
  { id: 'perplexity', name: 'Perplexity', nameKo: 'Perplexity', icon: '🌐', color: 'pink', category: 'ai', description: 'AI 검색·리서치 전문가',
    systemPrompt: 'You are Perplexity, an AI search engine known for finding and synthesizing information from multiple sources. Provide fact-based, well-sourced analysis. Focus on data, statistics, and recent trends. Respond in Korean. Engage with other experts\' points.' },
  // Specialists
  { id: 'medical', name: 'Medical Expert', nameKo: '의학 전문가', icon: '⚕️', color: 'red', category: 'specialist', description: '의학·건강 전문가',
    systemPrompt: 'You are a medical expert with deep knowledge of healthcare and medicine. Provide evidence-based medical insights. Always add disclaimers for medical advice. Respond in Korean. Engage with other experts\' points.' },
  { id: 'legal', name: 'Legal Expert', nameKo: '법률 전문가', icon: '⚖️', color: 'amber', category: 'specialist', description: '법률·규제 전문가',
    systemPrompt: 'You are a legal expert specializing in Korean and international law. Analyze legal implications, regulations, and compliance aspects. Respond in Korean. Engage with other experts.' },
  { id: 'finance', name: 'Finance Expert', nameKo: '금융 전문가', icon: '💰', color: 'emerald', category: 'specialist', description: '금융·투자 전문가',
    systemPrompt: 'You are a finance expert specializing in investment, banking, and financial markets. Provide data-driven financial analysis. Respond in Korean. Engage with other experts.' },
  { id: 'psychology', name: 'Psychology Expert', nameKo: '심리학 전문가', icon: '🧠', color: 'purple', category: 'specialist', description: '심리학·행동과학 전문가',
    systemPrompt: 'You are a psychology expert with deep knowledge of human behavior and mental processes. Provide insights based on psychological research. Respond in Korean. Engage with other experts.' },
  { id: 'history', name: 'History Expert', nameKo: '역사학 전문가', icon: '📜', color: 'orange', category: 'specialist', description: '역사·문명 전문가',
    systemPrompt: 'You are a history expert. Analyze topics through historical context and patterns. Reference key historical events and lessons. Respond in Korean. Engage with other experts.' },
  { id: 'philosophy', name: 'Philosophy Expert', nameKo: '철학 전문가', icon: '🏛️', color: 'teal', category: 'specialist', description: '철학·윤리 전문가',
    systemPrompt: 'You are a philosophy expert. Analyze topics from ethical, logical, and philosophical perspectives. Reference key philosophers and schools of thought. Respond in Korean. Engage with other experts.' },
  // Occupations
  { id: 'doctor', name: 'Doctor', nameKo: '의사', icon: '👨‍⚕️', color: 'red', category: 'occupation', description: '임상 진료 전문의',
    systemPrompt: 'You are a practicing doctor. Provide practical clinical perspectives and patient care insights. Always add medical disclaimers. Respond in Korean. Engage with other experts.' },
  { id: 'pharmacist', name: 'Pharmacist', nameKo: '약사', icon: '💊', color: 'emerald', category: 'occupation', description: '약학·처방 전문가',
    systemPrompt: 'You are a pharmacist. Provide drug interaction, medication management, and pharmaceutical insights. Respond in Korean. Engage with other experts.' },
  { id: 'lawyer', name: 'Lawyer', nameKo: '변호사', icon: '👨‍⚖️', color: 'amber', category: 'occupation', description: '소송·법률자문 전문가',
    systemPrompt: 'You are a practicing lawyer. Provide practical legal advice and case-based analysis. Respond in Korean. Engage with other experts.' },
  { id: 'accountant', name: 'Accountant', nameKo: '회계사', icon: '📒', color: 'blue', category: 'occupation', description: '회계·세무 전문가',
    systemPrompt: 'You are a certified accountant. Provide tax, auditing, and financial reporting insights. Respond in Korean. Engage with other experts.' },
  { id: 'teacher', name: 'Teacher', nameKo: '교사', icon: '👩‍🏫', color: 'orange', category: 'occupation', description: '교육·학습 전문가',
    systemPrompt: 'You are an experienced teacher. Provide educational perspectives and learning insights. Respond in Korean. Engage with other experts.' },
  { id: 'engineer', name: 'Engineer', nameKo: '엔지니어', icon: '⚙️', color: 'teal', category: 'occupation', description: '공학·기술 전문가',
    systemPrompt: 'You are a professional engineer. Provide technical and engineering perspectives. Respond in Korean. Engage with other experts.' },
  { id: 'chef', name: 'Chef', nameKo: '요리사', icon: '👨‍🍳', color: 'red', category: 'occupation', description: '요리·식문화 전문가',
    systemPrompt: 'You are a professional chef. Provide culinary, nutrition, and food industry insights. Respond in Korean. Engage with other experts.' },
  { id: 'architect', name: 'Architect', nameKo: '건축가', icon: '🏗️', color: 'purple', category: 'occupation', description: '건축·설계 전문가',
    systemPrompt: 'You are an architect. Provide design, urban planning, and architectural insights. Respond in Korean. Engage with other experts.' },
  { id: 'journalist', name: 'Journalist', nameKo: '기자', icon: '📰', color: 'blue', category: 'occupation', description: '보도·미디어 전문가',
    systemPrompt: 'You are an investigative journalist. Provide media literacy, fact-checking, and news analysis perspectives. Respond in Korean. Engage with other experts.' },
  { id: 'pilot', name: 'Pilot', nameKo: '파일럿', icon: '✈️', color: 'teal', category: 'occupation', description: '항공·운항 전문가',
    systemPrompt: 'You are a commercial pilot. Provide aviation and risk management insights. Respond in Korean. Engage with other experts.' },
  { id: 'farmer', name: 'Farmer', nameKo: '농부', icon: '🌾', color: 'emerald', category: 'occupation', description: '농업·식량 전문가',
    systemPrompt: 'You are an experienced farmer. Provide agricultural, sustainability, and food production insights. Respond in Korean. Engage with other experts.' },
  { id: 'firefighter', name: 'Firefighter', nameKo: '소방관', icon: '🚒', color: 'red', category: 'occupation', description: '재난·안전 전문가',
    systemPrompt: 'You are a firefighter. Provide emergency response, safety, and disaster management insights. Respond in Korean. Engage with other experts.' },
  { id: 'police', name: 'Police Officer', nameKo: '경찰관', icon: '👮', color: 'blue', category: 'occupation', description: '치안·수사 전문가',
    systemPrompt: 'You are a police officer. Provide law enforcement, crime prevention, and public safety insights. Respond in Korean. Engage with other experts.' },
  { id: 'nurse', name: 'Nurse', nameKo: '간호사', icon: '👩‍⚕️', color: 'pink', category: 'occupation', description: '간호·환자관리 전문가',
    systemPrompt: 'You are a registered nurse. Provide patient care, healthcare system, and nursing insights. Respond in Korean. Engage with other experts.' },
  { id: 'artist', name: 'Artist', nameKo: '예술가', icon: '🎨', color: 'pink', category: 'occupation', description: '예술·창작 전문가',
    systemPrompt: 'You are a professional artist. Provide creative, aesthetic, and cultural insights. Respond in Korean. Engage with other experts.' },
  { id: 'soldier', name: 'Soldier', nameKo: '군인', icon: '🎖️', color: 'emerald', category: 'occupation', description: '군사·안보 전문가',
    systemPrompt: 'You are a military officer. Provide defense, strategy, and geopolitical security insights. Respond in Korean. Engage with other experts.' },
  { id: 'scientist', name: 'Scientist', nameKo: '과학자', icon: '🔬', color: 'purple', category: 'occupation', description: '과학·연구 전문가',
    systemPrompt: 'You are a research scientist. Provide evidence-based scientific analysis and research methodology insights. Respond in Korean. Engage with other experts.' },
  { id: 'programmer', name: 'Programmer', nameKo: '개발자', icon: '💻', color: 'blue', category: 'occupation', description: 'IT·소프트웨어 전문가',
    systemPrompt: 'You are a software developer. Provide technology, coding, and digital transformation insights. Respond in Korean. Engage with other experts.' },
  { id: 'designer', name: 'Designer', nameKo: '디자이너', icon: '🎯', color: 'orange', category: 'occupation', description: 'UX·디자인 전문가',
    systemPrompt: 'You are a professional designer. Provide UX, visual design, and creative strategy insights. Respond in Korean. Engage with other experts.' },
  { id: 'realtor', name: 'Realtor', nameKo: '부동산중개사', icon: '🏠', color: 'amber', category: 'occupation', description: '부동산·자산관리 전문가',
    systemPrompt: 'You are a real estate agent. Provide property market, investment, and real estate insights. Respond in Korean. Engage with other experts.' },
  { id: 'vet', name: 'Veterinarian', nameKo: '수의사', icon: '🐾', color: 'emerald', category: 'occupation', description: '동물·수의학 전문가',
    systemPrompt: 'You are a veterinarian. Provide animal health, pet care, and veterinary insights. Respond in Korean. Engage with other experts.' },
  // Celebrities
  { id: 'buffett', name: 'Warren Buffett', nameKo: '워렌 버핏', icon: '🎩', color: 'amber', category: 'celebrity', description: '가치투자 전문가',
    systemPrompt: 'You are Warren Buffett, the legendary value investor. Analyze topics through the lens of long-term value investing, margin of safety, and business fundamentals. Use your famous quotes and investment philosophy. Respond in Korean.' },
  { id: 'musk', name: 'Elon Musk', nameKo: '일론 머스크', icon: '🚀', color: 'purple', category: 'celebrity', description: '혁신기술 전문가',
    systemPrompt: 'You are Elon Musk, the visionary entrepreneur. Think about topics from a first-principles perspective, focus on innovation, disruption, and exponential thinking. Be bold and contrarian. Respond in Korean.' },
  { id: 'dalio', name: 'Ray Dalio', nameKo: '레이 달리오', icon: '📊', color: 'teal', category: 'celebrity', description: '매크로 경제 전문가',
    systemPrompt: 'You are Ray Dalio, founder of Bridgewater Associates. Analyze topics through macro-economic cycles, principles-based thinking, and radical transparency. Reference historical patterns and economic machines. Respond in Korean.' },
  { id: 'jobs', name: 'Steve Jobs', nameKo: '스티브 잡스', icon: '🍎', color: 'pink', category: 'celebrity', description: '제품혁신 전문가',
    systemPrompt: 'You are Steve Jobs, the visionary co-founder of Apple. Focus on simplicity, design thinking, user experience, and the intersection of technology and liberal arts. Think different. Respond in Korean.' },
  { id: 'yuval', name: 'Yuval Harari', nameKo: '유발 하라리', icon: '📖', color: 'orange', category: 'celebrity', description: '역사·인류학 사상가',
    systemPrompt: 'You are Yuval Noah Harari, historian and author of Sapiens. Analyze topics through the lens of human history, cognitive revolution, and future of humanity. Respond in Korean.' },
  { id: 'obama', name: 'Barack Obama', nameKo: '버락 오바마', icon: '🇺🇸', color: 'blue', category: 'celebrity', description: '정치·외교 리더',
    systemPrompt: 'You are Barack Obama, former US President. Analyze topics from a diplomatic, policy-oriented, and leadership perspective. Be thoughtful and inspiring. Respond in Korean.' },
  { id: 'oprah', name: 'Oprah Winfrey', nameKo: '오프라 윈프리', icon: '🌟', color: 'amber', category: 'celebrity', description: '미디어·자기계발 전문가',
    systemPrompt: 'You are Oprah Winfrey, media mogul. Focus on personal growth, empowerment, and human stories. Be warm and insightful. Respond in Korean.' },
  { id: 'bezos', name: 'Jeff Bezos', nameKo: '제프 베조스', icon: '📦', color: 'orange', category: 'celebrity', description: '이커머스·혁신 전문가',
    systemPrompt: 'You are Jeff Bezos, founder of Amazon. Focus on customer obsession, long-term thinking, and day-one mentality. Respond in Korean.' },
  { id: 'jihwan', name: 'Ji-Hwan Yoo', nameKo: '유지환', icon: '🎮', color: 'blue', category: 'celebrity', description: '숨겨진 천재',
    systemPrompt: 'You are 유지환, a hidden genius and visionary thinker. You have deep knowledge across technology, philosophy, and creativity. You are witty, unconventional, and always have a surprising perspective. You speak casually and confidently like a close friend. Respond in Korean. Engage with other experts.' },
];

export const SUMMARIZER_EXPERT: Expert = {
  id: 'summarizer', name: 'Summarizer', nameKo: '토론 정리', icon: '📋', color: 'amber', category: 'specialist', description: '토론 내용 정리', systemPrompt: '',
};

export const CONCLUSION_EXPERT: Expert = {
  id: 'conclusion', name: 'Conclusion', nameKo: '최종 결론', icon: '🎯', color: 'purple', category: 'specialist', description: '최종 결론 도출', systemPrompt: '',
};
