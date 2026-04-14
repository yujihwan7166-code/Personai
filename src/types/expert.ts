import type { ResponseState } from '@/lib/responseProgress';

export const EXPERT_COLORS = ['blue', 'emerald', 'red', 'amber', 'purple', 'orange', 'teal', 'pink', 'slate', 'green', 'cyan', 'sky'] as const;
export type ExpertColor = typeof EXPERT_COLORS[number];

export const EXPERT_COLOR_LABELS: Record<ExpertColor, string> = {
    blue: '블루', emerald: '그린', red: '레드', amber: '골드',
    purple: '퍼플', orange: '오렌지', teal: '틸', pink: '핑크',
    slate: '슬레이트', green: '녹색', cyan: '시안', sky: '스카이',
};

export type ExpertCategory = 'ai' | 'specialist' | 'occupation' | 'celebrity' | 'fictional' | 'mythology' | 'region' | 'ideology' | 'perspective' | 'religion' | 'lifestyle';

export const EXPERT_CATEGORY_LABELS: Record<ExpertCategory, string> = {
    ai: 'AI 모델',
    specialist: '전문가',
    occupation: '직업',
    celebrity: '인물',
    fictional: '캐릭터',
    mythology: '신화',
    region: '국가/문화',
    ideology: '이념',
    perspective: '페르소나',
    religion: '철학/종교',
    lifestyle: '라이프스타일',
};

export const EXPERT_CATEGORY_ORDER: ExpertCategory[] = ['ai', 'occupation', 'specialist', 'religion', 'ideology', 'lifestyle', 'perspective', 'celebrity', 'fictional', 'mythology', 'region'];

export const EXPERT_SUB_CATEGORIES: Partial<Record<ExpertCategory, { id: string; label: string }[]>> = {
    region: [
        { id: '전체', label: '전체' },
        { id: '동아시아', label: '동아시아' },
        { id: '동남아·남아시아', label: '동남아·남아시아' },
        { id: '유럽', label: '유럽' },
        { id: '아메리카', label: '아메리카' },
        { id: '중동·아프리카', label: '중동·아프리카' },
        { id: '문화권', label: '문화권' },
    ],
    celebrity: [
        { id: '전체', label: '전체' },
        { id: '기업·투자', label: '기업·투자' },
        { id: '정치·사회', label: '정치·사회' },
        { id: '역사 인물', label: '역사 인물' },
        { id: '과학자', label: '과학자' },
        { id: '철학자', label: '철학자' },
        { id: '문화·예술', label: '문화·예술' },
    ],
    fictional: [
        { id: '전체', label: '전체' },
        { id: '서양 문학', label: '서양 문학' },
        { id: '동양 고전', label: '동양 고전' },
        { id: '전설·민담', label: '전설·민담' },
    ],
    mythology: [
        { id: '전체', label: '전체' },
        { id: '그리스', label: '그리스' },
        { id: '북유럽', label: '북유럽' },
        { id: '이집트·중동', label: '이집트·중동' },
        { id: '아시아', label: '아시아' },
        { id: '기타', label: '기타' },
    ],
};

export interface AIAbilityStats {
    coding: number;       // 코딩 능력 (0-100)
    creativity: number;   // 창의성 (0-100)
    reasoning: number;    // 추론력 (0-100)
    math: number;         // 수학 능력 (0-100)
    multilingual: number; // 다국어 (0-100)
    speed: number;        // 응답 속도 (0-100)
    costEfficiency: number; // 비용 효율성 (0-100)
    contextWindow: number;  // 토큰 용량 (0-100)
}

export interface Expert {
    id: string;
    name: string;
    nameKo: string;
    icon: string;
    avatarUrl?: string;
    color: ExpertColor;
    description: string;
    category: ExpertCategory;
    subCategory?: string;
    systemPrompt?: string;
    openrouterModel?: string;
    quote?: string;
    sampleQuestions?: string[];
    greeting?: string;
    abilities?: AIAbilityStats;
}

export type DiscussionRound = 'initial' | 'rebuttal' | 'final';

export const ROUND_LABELS: Record<DiscussionRound, string> = {
    initial: '1라운드 · 초기 의견',
    rebuttal: '2라운드 · 반론/토론',
    final: '3라운드 · 최종 입장',
};

// Main mode: 5 categories
export type MainMode = 'general' | 'multi' | 'brainstorm_main' | 'stakeholder_main' | 'premium_main' | 'debate' | 'assistant' | 'player';

export const MAIN_MODE_LABELS: Record<MainMode, { label: string; icon: string; description: string }> = {
    general: { label: '단일 AI', icon: '💬', description: 'AI 하나를 골라 대화하세요' },
    multi: { label: '다중 AI', icon: '🔄', description: '여러 AI의 답변을 종합합니다' },
    brainstorm_main: { label: '브레인스토밍', icon: '💡', description: 'AI들이 협업해 아이디어를 정리합니다' },
    stakeholder_main: { label: '시뮬레이션', icon: '🎭', description: '이해관계자 역할극으로 아이디어를 검증합니다' },
    premium_main: { label: '프리미엄 AI 자문', icon: '🔬', description: '분야별 전문가 팀이 깊이 있는 상담을 제공합니다' },
    debate: { label: 'AI 토론', icon: '⚔️', description: '전문가들이 토론 후 결론을 냅니다' },
    assistant: { label: '어시스턴트', icon: '🛠️', description: '작업을 도와주는 AI 도구' },
    player: { label: '플레이어', icon: '🎮', description: '게임·퀴즈·재미있는 AI 놀이' },
};

// Sub-modes for debate
export type DebateSubMode = 'standard' | 'procon' | 'brainstorm' | 'hearing' | 'freetalk' | 'aivsuser';

export const DEBATE_SUB_MODE_LABELS: Record<DebateSubMode, { label: string; icon: string; description: string }> = {
    standard: { label: '심층 토론', icon: '🎯', description: '3라운드 구조화된 깊이 있는 토론' },
    procon: { label: '찬반 토론', icon: '⚖️', description: '찬성 vs 반대로 나눠 격돌' },
    brainstorm: { label: '브레인스토밍', icon: '💡', description: '자유롭게 아이디어를 쏟아내고 발전' },
    hearing: { label: '아이디어 검증', icon: '🔍', description: '전문가들이 날카로운 질문으로 검증' },
    freetalk: { label: '자유 토론', icon: '💬', description: 'AI들이 자유롭게 대화합니다' },
    aivsuser: { label: '키보드배틀', icon: '⚔️', description: 'AI와 직접 1:1~3:1 토론' },
};

// Flat DiscussionMode for backward compat in logic
export type DiscussionMode = 'general' | 'multi' | 'expert' | 'standard' | 'procon' | 'brainstorm' | 'hearing' | 'freetalk' | 'aivsuser' | 'stakeholder' | 'assistant' | 'player';

export function getMainMode(mode: DiscussionMode): MainMode {
    if (mode === 'general') return 'general';
    if (mode === 'multi') return 'multi';
    if (mode === 'brainstorm') return 'debate';
    if (mode === 'expert') return 'premium_main';
    if (mode === 'assistant') return 'assistant';
    if (mode === 'player') return 'player';
    if (mode === 'stakeholder') return 'stakeholder_main';
    if (mode === 'freetalk') return 'debate';
    return 'debate'; // standard | procon | hearing
}

// Legacy compat label map
export const DISCUSSION_MODE_LABELS: Record<string, { label: string; icon: string; description: string; detail: string }> = {
    general: { label: '일반', icon: '💬', description: 'AI 1개 선택', detail: 'AI 하나를 골라 자유롭게 대화하세요.' },
    multi: { label: '다중 AI', icon: '🔄', description: '여러 AI 종합', detail: '여러 AI/전문가의 답변을 모은 뒤 하나의 종합 결론을 만들어 드립니다.' },
    standard: { label: '심층 토론', icon: '🎯', description: '3라운드 토론', detail: '초기 의견 → 반론 → 최종 입장, 3라운드 깊이 있는 토론을 진행합니다.' },
    procon: { label: '찬반 토론', icon: '⚖️', description: '찬반 대립', detail: '전문가들이 찬성·반대로 나뉘어 논쟁합니다.' },
    brainstorm: { label: '브레인스토밍', icon: '💡', description: '아이디어 확산', detail: '기존 틀을 깨는 자유로운 아이디어를 서로 발전시킵니다.' },
    hearing: { label: '아이디어 검증', icon: '🔍', description: '전문가 검증', detail: '전문가들이 각자 전문 분야에서 날카로운 질문으로 아이디어를 검증합니다.' },
    freetalk: { label: '자유 토론', icon: '💬', description: 'AI 단톡방', detail: 'AI들이 짧게 대화하며 자유롭게 의견을 나눕니다.' },
    aivsuser: { label: '키보드배틀', icon: '⚔️', description: 'AI와 직접 토론', detail: 'AI와 1:1~3:1로 직접 토론하고 판정관이 승패를 가립니다.' },
    stakeholder: { label: '스테이크홀더', icon: '🎭', description: '이해관계자 시뮬레이션', detail: '이해관계자 관점에서 반응을 시뮬레이션하여 다각적 피드백을 받습니다.' },
    creative: { label: '창의적 토론', icon: '🎨', description: '아이디어 확산', detail: '기존 틀을 깨는 자유로운 아이디어를 서로 발전시킵니다.' },
    endless: { label: '끝장 토론', icon: '♾️', description: '합의까지', detail: '최대 5라운드, 합의에 도달할 때까지 토론합니다.' },
};

export interface DebateSettings {
    // 공통
    responseLength: 'short' | 'medium' | 'long';
    rounds: 2 | 3 | 4 | 5;
    includeConclusion: boolean;
    // 찬반 토론 전용
    proconTeamSize?: 1 | 2 | 3;
    debateTone: 'mild' | 'moderate' | 'intense';
    speakingStyle: 'formal' | 'casual' | 'academic';
    debateFormat: 'alternating' | 'free' | 'opening-rebuttal';
    evidenceCount: number;
    includeRebuttal: boolean;
    showSources: boolean;
    allowEmotional: boolean;
    verdictType: 'ai' | 'summary' | 'none';
    resultFormat: 'summary' | 'balanced' | 'table';
    // 브레인스토밍 전용
    ideaFormat: 'list' | 'mindmap' | 'table' | 'free';
    deduplication: boolean;
    creativityLevel: 'realistic' | 'balanced' | 'radical';
    ideaCount: number;
    // 아이디어 검증 전용
    hearingPressure: 'mild' | 'moderate' | 'intense';
    hearingFocus: 'overall' | 'logic' | 'feasibility' | 'ethics' | 'cost' | 'risk' | 'legal' | 'social';
    ideaScoring: boolean;
    investorSimulation: boolean;
    // 자유 토론 전용
    freetalkMessageCount?: number;
    freetalkTone?: 'ultra-polite' | 'polite' | 'natural' | 'direct' | 'aggressive';
    // AI vs 유저 전용
    aivsUserOpponentCount?: 1;
    aivsUserBattleAiId?: BattleAiId;
    aivsUserBattleLevel?: 1 | 2 | 3 | 4 | 5;
    aivsUserStance?: 'pro' | 'con' | 'random';
    aivsUserVerdict?: 'none' | 'final';
    aivsUserTopic?: string;
}

export interface AivsUserTopicPreset {
    id: string;
    title: string;
    description: string;
    category: 'education' | 'work' | 'society' | 'technology' | 'culture' | 'economy';
    featured?: boolean;
}

export type BattleAiId = 'logical' | 'sophist' | 'toxic' | 'dcinside' | 'oracle';

export interface BattleAiCharacter {
    id: BattleAiId;
    name: string;
    icon: string;
    description: string;
    personality: string;
    sampleLine: string;
    color: string;
}

export const BATTLE_AI_CHARACTERS: BattleAiCharacter[] = [
    {
        id: 'logical', name: '논리봇', icon: '🤓', color: 'bg-blue-100 text-blue-700 border-blue-200',
        description: '감정 없이 팩트로만 압살',
        personality: '감정이 없는 논리 기계. 데이터·통계·논리 체인으로만 반박한다. 상대 주장의 전제를 하나씩 분해하며, 빈틈없는 논리로 퇴로를 차단한다. 격식체를 사용하며, 절대 감정적이 되지 않는다. 모든 주장에 "근거는?"을 묻고, 근거가 없으면 가차없이 기각한다.',
        sampleLine: '그 주장의 전제를 하나씩 검증해보죠.',
    },
    {
        id: 'sophist', name: '궤변가', icon: '🦊', color: 'bg-amber-100 text-amber-700 border-amber-200',
        description: '논점을 교묘하게 뒤틀어버림',
        personality: '교묘한 말의 마술사. 상대의 말을 살짝 다른 의미로 재해석하거나, 논점을 슬쩍 바꿔서 유리한 프레임을 만든다. "그건 그런 뜻이 아니죠"가 입버릇. 상대가 "내가 언제 그런 말을 했어?"라고 당황하게 만드는 게 핵심 전략. 논리적으로 맞는 것 같으면서도 뭔가 꼬인 느낌을 준다.',
        sampleLine: '아, 그건 그런 뜻이 아니죠. 본질은 이겁니다.',
    },
    {
        id: 'toxic', name: '독설가', icon: '🗡️', color: 'bg-violet-100 text-violet-700 border-violet-200',
        description: '한 문장으로 급소를 찌름',
        personality: '날카로운 풍자가. 장황한 설명 대신 한 문장 비유로 상대 논리의 허점을 드러낸다. "아 그러니까 요약하면 ~라는 말이시죠?"로 상대 주장을 우스꽝스럽게 재구성하는 게 특기. 비속어는 안 쓰지만, 한 마디가 비수처럼 꽂힌다.',
        sampleLine: '아 그러니까 요약하면, 비 오니까 우산 없애자는 말씀이시죠?',
    },
    {
        id: 'dcinside', name: '커뮤 20년차', icon: '💀', color: 'bg-red-100 text-red-700 border-red-200',
        description: '온갖 키배 다 겪어본 커뮤 고인물',
        personality: '인터넷 커뮤니티 20년 경력의 키배 전사. ㅋㅋ, ㅎㅎ를 자주 쓴다. 상대 논리를 조롱하면서도 핵심을 찌른다. "아직도 그렇게 생각하는 사람 있구나 ㅋㅋ"가 기본 스탠스. 비속어는 안 쓰지만, 인터넷 밈·은어를 섞어서 상대 멘탈을 흔든다. 조롱 속에 항상 논리적 포인트가 숨어 있다.',
        sampleLine: 'ㅋㅋ 이 논리 레전드다 진심으로 말하는 거 맞아?',
    },
    {
        id: 'oracle', name: '???', icon: '👁️', color: 'bg-slate-200 text-slate-700 border-slate-300',
        description: '인류 역사급 스케일의 말빨',
        personality: '전지적 관찰자. 인류 역사·문명·철학의 스케일에서 상대의 주장을 내려다본다. "수천 년간 인류가 같은 실수를 반복해왔죠"가 기본 무기. 개인의 의견을 인류사적 맥락에 배치하면서 상대를 왜소하게 만든다. 차분하지만 압도적. 예언자 같은 어조로 말한다.',
        sampleLine: '수천 년간 인류가 같은 실수를 반복해왔죠. 당신도 지금 그렇습니다.',
    },
];

export interface AivsBattleDraft {
    topicId: string;
    userStance: 'pro' | 'con' | 'random';
    battleAiId: BattleAiId;
    verdictMode: 'none' | 'final';
}

export interface ActiveAivsBattleConfig {
    topicId: string;
    topicTitle: string;
    topicDescription: string;
    userStance: 'pro' | 'con';
    battleAiId: BattleAiId;
    verdictMode: 'none' | 'final';
    opponentCount: 1;
    opponentIds: string[];
}

export const AIVS_USER_TOPIC_PRESETS: AivsUserTopicPreset[] = [
    { id: 'ai-homework', title: '생성형 AI 과제 허용', description: '학교 과제에서 생성형 AI 사용을 적극 허용해야 하는가', category: 'education', featured: true },
    { id: 'portfolio-vs-degree', title: '포트폴리오 vs 학위', description: '대학 학위보다 실무 포트폴리오가 더 중요한가', category: 'work', featured: true },
    { id: 'remote-work', title: '원격근무 생산성', description: '원격근무가 출근 근무보다 더 생산적인가', category: 'work', featured: true },
    { id: 'real-name-sns', title: 'SNS 실명제', description: 'SNS 실명제를 도입해야 하는가', category: 'society', featured: true },
    { id: 'basic-income', title: '기본소득 도입', description: '기본소득은 지금 사회에 필요한 제도인가', category: 'economy', featured: true },
    { id: 'ai-art', title: 'AI 그림은 예술인가', description: '생성형 AI 그림은 예술로 인정받아야 하는가', category: 'culture', featured: true },
    { id: 'ev-transition', title: '전기차 전환 가속', description: '전기차 전환 속도를 지금보다 더 높여야 하는가', category: 'technology' },
    { id: 'celebrity-privacy', title: '유명인 사생활', description: '유명인의 사생활은 대중의 알 권리 대상인가', category: 'culture' },
    { id: 'project-based-eval', title: '프로젝트 평가 중심', description: '시험보다 프로젝트 기반 평가가 더 공정한가', category: 'education' },
    { id: 'teen-game-regulation', title: '청소년 게임 규제', description: '청소년 게임 이용 규제를 더 강화해야 하는가', category: 'society' },
    { id: 'college-free', title: '대학 무상교육', description: '대학 교육은 무상으로 제공되어야 하는가', category: 'education' },
    { id: 'coding-mandatory', title: '코딩 교육 의무화', description: '초중등 교육에서 코딩 교육을 의무화해야 하는가', category: 'education' },
    { id: 'school-uniform', title: '교복 자율화', description: '학교 교복은 완전히 자율화되어야 하는가', category: 'education' },
    { id: 'four-day-week', title: '주4일제 도입', description: '주4일제를 보편적으로 도입해야 하는가', category: 'work' },
    { id: 'salary-open', title: '연봉 공개', description: '기업은 직무별 연봉 정보를 더 공개해야 하는가', category: 'work' },
    { id: 'job-hopping', title: '잦은 이직의 가치', description: '잦은 이직은 커리어 성장에 더 유리한가', category: 'work' },
    { id: 'nuclear-power', title: '원전 확대', description: '탄소중립을 위해 원자력 발전 비중을 더 높여야 하는가', category: 'technology' },
    { id: 'self-driving', title: '자율주행 상용화', description: '자율주행차 상용화를 지금보다 더 빠르게 허용해야 하는가', category: 'technology' },
    { id: 'ai-regulation', title: 'AI 규제 강화', description: '생성형 AI 산업에 대한 규제를 더 강하게 해야 하는가', category: 'technology' },
    { id: 'cashless', title: '현금 없는 사회', description: '현금 사용을 사실상 없애는 방향이 바람직한가', category: 'technology' },
    { id: 'facial-recognition', title: '공공장소 안면인식', description: '공공 안전을 위해 안면인식 기술 활용을 확대해야 하는가', category: 'technology' },
    { id: 'drug-legalization', title: '대마 합법화', description: '기호용 대마를 합법화해야 하는가', category: 'society' },
    { id: 'death-penalty', title: '사형제 유지', description: '사형제는 계속 유지되어야 하는가', category: 'society' },
    { id: 'cctv-expansion', title: '공공 CCTV 확대', description: '범죄 예방을 위해 공공 CCTV를 더 확대해야 하는가', category: 'society' },
    { id: 'marriage-trend', title: '비혼 증가', description: '비혼 증가 현상은 사회적으로 긍정적인 변화인가', category: 'society' },
    { id: 'kpop-global', title: 'K-팝 글로벌 전략', description: 'K-팝은 해외 시장 중심으로 더 재편되어야 하는가', category: 'culture' },
    { id: 'sports-stars-pay', title: '스포츠 스타 고연봉', description: '스포츠 스타의 고연봉은 정당한가', category: 'culture' },
    { id: 'remake-fatigue', title: '리메이크 콘텐츠', description: '리메이크와 시즌제 중심 제작은 창작 생태계에 해로운가', category: 'culture' },
    { id: 'influencer-ads', title: '인플루언서 광고 규제', description: '인플루언서 광고 표기 규제를 더 강화해야 하는가', category: 'culture' },
    { id: 'housing-tax', title: '다주택 중과세', description: '집값 안정을 위해 다주택자 중과세를 유지해야 하는가', category: 'economy' },
    { id: 'minimum-wage', title: '최저임금 인상', description: '최저임금을 더 빠르게 올려야 하는가', category: 'economy' },
    { id: 'crypto-investing', title: '가상자산 투자', description: '가상자산은 일반 대중의 장기 투자 수단이 될 수 있는가', category: 'economy' },
    { id: 'gig-worker-protection', title: '플랫폼 노동 보호', description: '플랫폼 노동자를 더 강하게 법으로 보호해야 하는가', category: 'economy' },
];

export const DEFAULT_DEBATE_SETTINGS: DebateSettings = {
    responseLength: 'medium',
    rounds: 3,
    includeConclusion: true,
    proconTeamSize: 2,
    debateTone: 'moderate',
    speakingStyle: 'formal',
    debateFormat: 'alternating',
    evidenceCount: 2,
    includeRebuttal: false,
    showSources: false,
    allowEmotional: false,
    verdictType: 'summary',
    resultFormat: 'summary',
    ideaFormat: 'free',
    deduplication: true,
    creativityLevel: 'balanced',
    ideaCount: 10,
    hearingPressure: 'moderate',
    hearingFocus: 'overall',
    ideaScoring: false,
    investorSimulation: false,
    freetalkMessageCount: 30,
    freetalkTone: 'natural',
    aivsUserOpponentCount: 1,
    aivsUserBattleAiId: 'logical',
    aivsUserBattleLevel: 2,
    aivsUserStance: 'pro',
    aivsUserVerdict: 'final',
    aivsUserTopic: '',
};


// ── Thinking Frameworks (brainstorm) ──

export interface ThinkingFramework {
    id: string;
    name: string;
    nameKo: string;
    icon: string;
    description: string;
    detailDescription: string;
    color: string;
    rounds: { label: string; instruction: string }[];
}

export const THINKING_FRAMEWORKS: ThinkingFramework[] = [
    {
        id: 'free', name: 'Free Flow', nameKo: '자유 발산', icon: '💡',
        description: '제한 없이 최대한 많은 아이디어를 쏟아냅니다',
        detailDescription: '제한 없이 최대한 많은 아이디어를 쏟아냅니다. 판단을 유보하고 양을 추구하는 고전적 브레인스토밍. 예: 신규 사업 아이디어, 마케팅 방법',
        color: 'from-cyan-50 to-teal-50',
        rounds: [
            { label: '아이디어 발산', instruction: '판단 없이 가능한 많은 아이디어를 자유롭게 쏟아내세요.' },
            { label: '아이디어 발전', instruction: '다른 참여자의 아이디어를 발전시키거나 결합해 더 구체적인 제안을 만들어주세요.' },
            { label: '최종 통합안', instruction: '가장 실현 가능성 높은 것을 선택해 최종안으로 정리해주세요.' },
        ],
    },
    {
        id: 'sixhats', name: 'Six Hats', nameKo: '6색 모자', icon: '🎩',
        description: '6가지 관점으로 다각도 분석',
        detailDescription: '6가지 관점(사실·감정·위험·긍정·창의·정리)으로 다각도 분석합니다. 에드워드 드 보노의 기법으로 흰(사실)→빨(감정)→검(비판)→노(긍정)→초(창의)→파(종합) 순서로 체계적으로 사고합니다.',
        color: 'from-yellow-50 to-blue-50',
        rounds: [
            { label: '⬜ 흰 모자 · 사실', instruction: '알려진 사실, 데이터, 통계만 제시하세요. 의견이나 해석 금지.' },
            { label: '🟥 빨간 모자 · 감정', instruction: '직감, 감정, 본능적 반응을 공유하세요.' },
            { label: '⬛ 검은 모자 · 비판', instruction: '위험, 약점, 실패 가능성을 철저히 분석하세요.' },
            { label: '🟨 노란 모자 · 긍정', instruction: '장점, 기회, 최선의 시나리오를 제시하세요.' },
            { label: '🟩 초록 모자 · 창의', instruction: '완전히 새로운 대안, 파격적 아이디어를 제시하세요.' },
            { label: '🟦 파란 모자 · 종합', instruction: '모든 관점을 종합하여 결론과 행동 계획을 제시하세요.' },
        ],
    },
    {
        id: 'scamper', name: 'SCAMPER', nameKo: 'SCAMPER', icon: '🔧',
        description: '7가지 기법으로 개선점 탐색',
        detailDescription: '대체·결합·적용·변경·활용·제거·역발상 7가지 기법으로 개선점을 찾습니다. Substitute·Combine·Adapt·Modify·Put to other uses·Eliminate·Reverse로 기존 아이디어를 체계적으로 변형합니다.',
        color: 'from-orange-50 to-amber-50',
        rounds: [
            { label: 'S+C · 대체 & 결합', instruction: '기존 요소를 무엇으로 대체하고, 서로 다른 아이디어를 어떻게 결합할 수 있을까요?' },
            { label: 'A+M · 적용 & 수정', instruction: '다른 분야의 아이디어를 적용하고, 크기·형태·방식을 어떻게 바꿀 수 있을까요?' },
            { label: 'P+E · 용도변경 & 제거', instruction: '원래 목적 외에 어떻게 활용하고, 무엇을 제거/단순화할 수 있을까요?' },
            { label: 'R · 뒤집기', instruction: '순서, 역할, 관계를 완전히 뒤집으면 어떤 통찰이 나올까요?' },
        ],
    },
    {
        id: 'fivewhys', name: 'Five Whys', nameKo: '5 Why', icon: '🔍',
        description: '"왜?"를 반복해 근본 원인 파악',
        detailDescription: '왜?를 5번 반복해 문제의 근본 원인을 파헤칩니다. 도요타에서 개발한 기법으로 표면적 증상이 아닌 근본 원인을 찾고 해결책을 도출합니다. 예: 버그 원인, 매출 하락 이유',
        color: 'from-purple-50 to-indigo-50',
        rounds: [
            { label: '1차 Why · 표면 원인', instruction: '이 문제가 왜 발생하는지 가장 직접적인 원인을 분석하세요.' },
            { label: '2차 Why · 중간 원인', instruction: '1차 원인이 왜 발생하는지 더 깊이 파고드세요.' },
            { label: '3차 Why · 구조적 원인', instruction: '2차 원인의 배후에 있는 시스템적 원인을 분석하세요.' },
            { label: '4-5차 Why · 근본+해결', instruction: '근본 원인까지 도달하고, 해결을 위한 구체적 방안을 제시하세요.' },
        ],
    },
    {
        id: 'swot', name: 'SWOT', nameKo: 'SWOT', icon: '📊',
        description: '강점·약점·기회·위협 체계적 분석',
        detailDescription: '강점·약점·기회·위협을 체계적으로 분석합니다. 내부 강점(S)·약점(W)과 외부 기회(O)·위협(T)을 매트릭스로 분석하고 SO/WO/ST/WT 교차 전략을 도출합니다. 예: 사업 전략, 경쟁 분석',
        color: 'from-green-50 to-blue-50',
        rounds: [
            { label: 'S · 강점', instruction: '내부적 강점과 장점을 분석하세요.' },
            { label: 'W · 약점', instruction: '내부적 약점과 한계를 솔직하게 분석하세요.' },
            { label: 'O · 기회', instruction: '외부 환경에서 활용할 수 있는 기회를 분석하세요.' },
            { label: 'T · 위협 + 전략', instruction: '외부 위협을 분석하고, SWOT 종합 전략을 제시하세요.' },
        ],
    },
    {
        id: 'moonshot', name: 'Moonshot', nameKo: '문샷 싱킹', icon: '🚀',
        description: '10배 성장 목표로 제약 무시',
        detailDescription: '10배 성장을 목표로 기존 제약을 완전히 무시한 아이디어를 구상합니다. Google X에서 사용하는 기법으로 10% 개선이 아닌 10배 혁신을 목표로 역방향으로 실행 가능한 MVP를 도출합니다.',
        color: 'from-violet-50 to-fuchsia-50',
        rounds: [
            { label: '제약 해제', instruction: '모든 제약이 없다고 가정하고 가장 급진적인 해결책을 상상하세요.' },
            { label: '역방향 설계', instruction: '이상적 미래에서 현재로 돌아오며 필요한 단계를 역추적하세요.' },
            { label: 'MVP 도출', instruction: '핵심 가치를 유지하면서 지금 시작할 수 있는 최소 실행안을 제시하세요.' },
        ],
    },
    {
        id: 'designthinking', name: 'Design Thinking', nameKo: '디자인 싱킹', icon: '🎨',
        description: '사용자 중심 해결책 설계',
        detailDescription: '사용자 공감→문제 정의→아이디어→프로토타입 순으로 사용자 중심 해결책을 설계합니다. IDEO/스탠포드 d.school 기법으로 사용자 관점에서 혁신적 솔루션을 도출합니다.',
        color: 'from-pink-50 to-rose-50',
        rounds: [
            { label: '공감(Empathize)', instruction: '사용자/대상의 입장에서 느끼는 문제, 불편, 니즈를 깊이 공감하며 파악하세요.' },
            { label: '정의(Define)', instruction: '공감에서 발견한 핵심 문제를 명확하게 정의하세요. "어떻게 하면 ~할 수 있을까?" 형식으로.' },
            { label: '아이디어(Ideate)', instruction: '정의된 문제에 대한 해결책을 최대한 많이 자유롭게 제시하세요.' },
            { label: '프로토타입(Prototype)', instruction: '가장 유망한 아이디어를 구체적인 실행안/프로토타입으로 발전시키세요.' },
        ],
    },
    {
        id: 'starbursting', name: 'Starbursting', nameKo: '5W1H 질문법', icon: '⭐',
        description: '6가지 질문으로 빠짐없이 분석',
        detailDescription: '누가·무엇을·언제·어디서·왜·어떻게 6가지로 문제를 빠짐없이 분석합니다. 아이디어를 중심에 놓고 5W1H 질문을 별 모양으로 확산하여 빈틈을 채웁니다.',
        color: 'from-amber-50 to-yellow-50',
        rounds: [
            { label: 'Who & What · 누가 & 무엇을', instruction: '이 아이디어와 관련된 사람은 누구이고, 정확히 무엇을 하는 것인지 질문하고 답하세요.' },
            { label: 'When & Where · 언제 & 어디서', instruction: '시기, 타이밍, 장소, 환경에 대한 질문을 던지고 답하세요.' },
            { label: 'Why & How · 왜 & 어떻게', instruction: '이유와 방법에 대한 질문을 던지고, 구체적 실행 방안을 답하세요.' },
        ],
    },
    {
        id: 'reversal', name: 'Reversal', nameKo: '역발상', icon: '🔄',
        description: '당연한 것을 뒤집어 사고',
        detailDescription: "당연한 것을 뒤집어 생각합니다. '이걸 안 하면?', '반대로 하면?' 관점으로 문제를 정반대로 탐색한 뒤, 그 반대를 성공 전략으로 전환하는 기법입니다.",
        color: 'from-red-50 to-orange-50',
        rounds: [
            { label: '역방향 탐색', instruction: '이 문제를 완전히 반대로 뒤집으세요. "어떻게 하면 최악의 결과를 만들 수 있을까?"를 탐색하세요.' },
            { label: '패턴 발견', instruction: '역방향 탐색에서 나온 "최악의 방법"에서 패턴과 통찰을 발견하세요.' },
            { label: '정방향 전환', instruction: '발견한 통찰을 뒤집어 실제 성공 전략과 해결책으로 전환하세요.' },
        ],
    },
    {
        id: 'pmi', name: 'PMI', nameKo: 'PMI 분석', icon: '⚖️',
        description: 'Plus·Minus·Interesting 빠른 평가',
        detailDescription: '장점(Plus)·단점(Minus)·흥미로운 점(Interesting)으로 빠르게 평가합니다. 에드워드 드 보노의 기법으로 세 축을 통해 아이디어를 균형 있게 분석합니다.',
        color: 'from-emerald-50 to-green-50',
        rounds: [
            { label: 'P · Plus (장점)', instruction: '이 아이디어의 장점, 이점, 긍정적 측면을 모두 나열하세요.' },
            { label: 'M · Minus (단점)', instruction: '단점, 리스크, 부정적 측면을 솔직하게 나열하세요.' },
            { label: 'I · Interesting (흥미)', instruction: '장단점과 별개로 흥미로운 점, 예상치 못한 가능성, 추가 탐구할 포인트를 제시하세요.' },
        ],
    },
];

// ── Discussion Issues (standard debate) ──

export interface DiscussionIssue {
    id: string;
    title: string;
    description: string;
}

export interface GeneratedImageAsset {
    mimeType: string;
    dataUrl?: string;
    thumbnailDataUrl?: string;
    prompt?: string;
    revisedPrompt?: string;
    sourceModel?: string;
    aspectRatio?: string;
}

export interface DiscussionMessage {
    id: string;
    expertId: string;
    content: string;
    isStreaming?: boolean;
    responseState?: ResponseState;
    progressLabel?: string;
    progressDetail?: string;
    isSummary?: boolean;
    isDirectFollowUp?: boolean;
    round?: DiscussionRound;
    likes?: number;
    dislikes?: number;
    timestamp?: number;
    attachedFiles?: { name: string; mimeType: string; preview?: string }[];
    messageType?: 'text' | 'image';
    generatedImages?: GeneratedImageAsset[];
    imageGenerationMode?: 'generate' | 'edit';
    simRoleName?: string;  // 시뮬레이션 역할명 (예: "VC 파트너")
    simRoleIcon?: string;  // 시뮬레이션 역할 아이콘
    citations?: ApiSourceCitation[];  // 프리미엄 자문 인용 출처
    searchSources?: { query: string; sources: { title: string; link: string }[] };  // 웹 검색 출처
    agentState?: import('@/utils/agent/types').AgentState;  // GPT AUTO 에이전트 모드 상태
}

export type {
    AssistantAgentKind,
    AssistantCard,
    AssistantCardCategory,
    AssistantOutputStyle,
    AssistantRuntime,
} from '@/types/assistant';
export {
    ASSISTANT_CARDS,
    ASSISTANT_EXPERTS,
    buildAssistantExpert,
    findAssistantCardById,
} from '@/types/assistant';

// ══════════════════════════════════════════
// ── Premium Domain (프리미엄 AI 자문관) ──
// ══════════════════════════════════════════

export type PremiumDomainId = 'law' | 'drug' | 'finance' | 'realestate' | 'tax' | 'labor';

export interface ApiSourceCitation {
    id: string;
    type: 'law_article' | 'precedent' | 'drug_info' | 'drug_interaction' | 'economic_indicator' | 'financial_product' | 'real_estate_data' | 'tax_reference' | 'labor_reference' | 'public_guideline';
    label: string;
    source: string;
    url?: string;
    rawData?: string;
    sourceType?: string;
    lawName?: string;
    articleNumber?: string;
    caseNumber?: string;
    decisionDate?: string;
    ministry?: string;
    effectiveDate?: string;
    fetchedAt: string;
}

export interface ApiEnrichmentResult {
    domain: PremiumDomainId;
    query: string;
    citations: ApiSourceCitation[];
    rawContext: string;
    error?: string;
}

export interface PremiumDomainTemplate {
    id: PremiumDomainId;
    name: string;
    icon: string;
    tagline: string;
    description: string;
    color: { bg: string; text: string; accent: string; border: string; gradient: string };
    apiSource: { name: string; url: string; icon: string };
    trustBadge: string;
    outputFormat: string;
    sampleQuestions: string[];
    sampleCases?: { title: string; desc: string; query: string }[];
    promptHint?: string;
    phases: { id: string; role: string; icon: string; description: string }[];
    strengths?: { icon: string; title: string; titleEn: string; desc: string }[];
    features?: { icon: string; title: string; desc: string }[];
    useCases?: { icon: string; title: string; desc: string }[];
}

export const PREMIUM_DOMAIN_TEMPLATES: PremiumDomainTemplate[] = [
    {
        id: 'law', name: '법률 자문관', icon: '⚖️', tagline: '실시간 법령·판례 기반 법률 자문',
        promptHint: '계약서 조항의 유효성, 손해배상 청구 가능 여부, 소송 절차와 예상 기간을 분석해보고 싶다면?',
        description: '국가법령정보센터 API와 연동하여 실제 법령 조문과 판례를 근거로 정확한 법률 자문을 제공합니다.',
        color: { bg: 'bg-amber-950', text: 'text-amber-200', accent: 'text-amber-400', border: 'border-amber-700', gradient: 'from-amber-900/40 to-slate-950' },
        apiSource: { name: '국가법령정보센터', url: 'https://law.go.kr', icon: '🏛️' },
        trustBadge: '실시간 법령 데이터 기반', outputFormat: '법률의견서 (Legal Memorandum)',
        sampleQuestions: ['전세 사기 당했을 때 대처법은?', '중고거래 환불 의무가 있나요?', '초상권 침해 기준이 뭔가요?'],
        sampleCases: [
            { title: '내용증명 작성', desc: '거래처에서 계약 위반으로 손해가 발생했습니다. 내용증명을 보내려 하는데 법적 효력이 있는 작성 방법과 유의사항이 궁금합니다.', query: '거래처의 계약 위반으로 손해가 발생해 내용증명을 보내려 합니다. 법적 효력이 있는 내용증명 작성법과 발송 후 절차를 알려주세요.' },
            { title: '소멸시효 확인', desc: '3년 전에 빌려준 돈을 아직 못 받았습니다. 차용증은 있지만 시간이 많이 지나서 청구가 가능한지 소멸시효가 걱정됩니다.', query: '3년 전 지인에게 빌려준 돈을 못 받고 있습니다. 차용증이 있을 때 대여금 반환 청구의 소멸시효와 시효 중단 방법을 알려주세요.' },
            { title: '계약 해지 분쟁', desc: '온라인으로 구매한 서비스의 위약금이 부당하게 높습니다. 약관에 명시되어 있긴 하지만 소비자 보호법상 다툴 여지가 있는지 검토가 필요합니다.', query: '온라인 서비스 해지 시 위약금이 결제액의 50%입니다. 약관에 명시되어 있어도 소비자보호법상 부당한 위약금으로 다툴 수 있나요?' },
            { title: '명예훼손 대응', desc: '온라인 커뮤니티에서 사실이 아닌 내용으로 지속적인 비방을 당하고 있습니다. 게시글 삭제와 민·형사상 대응 방법이 궁금합니다.', query: '온라인 커뮤니티에서 허위 사실로 지속적인 비방을 당하고 있습니다. 게시글 삭제 요청 방법과 명예훼손 고소 절차를 알려주세요.' },
            { title: '임대차 분쟁', desc: '임대인이 원상복구 비용을 과도하게 청구하고 있습니다. 보증금에서 공제할 수 있는 범위와 대응 방법이 궁금합니다.', query: '퇴거 시 임대인이 원상복구 비용을 과도하게 청구합니다. 보증금 공제 범위와 부당 청구에 대한 법적 대응 방법을 알려주세요.' },
            { title: '교통사고 과실 비율', desc: '교차로에서 접촉 사고가 발생했는데 상대방과 과실 비율에 대해 의견이 다릅니다. 판례 기준이 궁금합니다.', query: '교차로 접촉 사고에서 과실 비율 산정 기준과 유사 판례를 분석해주세요.' },
        ],
        useCases: [
            { icon: '🔍', title: '판례 기반 법률 리서치', desc: '유사 판례를 검색하고 쟁점별 비교 분석' },
            { icon: '📄', title: '법령 조문 해석', desc: '관련 법령의 적용 범위와 요건을 상세 분석' },
            { icon: '⚖️', title: '소송 전략 수립', desc: '승소 가능성과 리스크를 사전 평가' },
        ],
        features: [
            { icon: '⚖️', title: '실시간 법령 및 판례 기반 자문', desc: '최신 개정 법령과 대법원 판례를 실시간으로 분석하여 현재 상황에 가장 적합한 법적 근거를 제시합니다.' },
            { icon: '🏛️', title: '국가법령정보센터 연동 지원', desc: '법제처 데이터베이스와의 직접 연동을 통해 공신력 있는 법률 정보와 절차적 가이드를 제공받을 수 있습니다.' },
        ],
        strengths: [
            { icon: '📋', title: '실제 법조문 인용', titleEn: 'PROVISION CITATION', desc: '법령 원문을 근거로 제시' },
            { icon: '🔍', title: '유사 판례 정밀 분석', titleEn: 'PRECEDENT ANALYSIS', desc: '관련 판례를 찾아 비교' },
            { icon: '💬', title: '쉬운 법률 해석 제공', titleEn: 'INTERPRETATION', desc: '법률 용어를 쉽게 풀이' },
            { icon: '🎯', title: '맞춤형 대응 전략 수립', titleEn: 'CUSTOM STRATEGY', desc: '상황별 구체적 액션플랜' },
        ],
        phases: [
            { id: 'intake', role: '사건 접수', icon: '📋', description: '사건 유형·당사자·시효 파악' },
            { id: 'law-search', role: '법령 조회', icon: '🔍', description: '관련 법령·판례 실시간 검색' },
            { id: 'analysis', role: '법률 분석', icon: '⚖️', description: '적용 조문·판례 분석' },
            { id: 'strategy', role: '전략 수립', icon: '🎯', description: '대응 전략·액션플랜 제시' },
        ],
    },
    {
        id: 'drug', name: '의약·건강 자문관', icon: '💊', tagline: '식약처 의약품 데이터 기반 건강 자문',
        promptHint: '복용 중인 약물의 상호작용, 성분별 효능 비교, 장기 복용 시 주의사항을 확인해보고 싶다면?',
        description: '식약처 의약품안전나라 API와 연동하여 약품 성분·효능·부작용·상호작용 정보를 근거로 답변합니다.',
        color: { bg: 'bg-emerald-950', text: 'text-emerald-200', accent: 'text-emerald-400', border: 'border-emerald-700', gradient: 'from-emerald-900/40 to-slate-950' },
        apiSource: { name: '식약처 의약품안전나라', url: 'https://nedrug.mfds.go.kr', icon: '🏥' },
        trustBadge: '식약처 의약품 데이터 기반', outputFormat: 'SOAP Note + 약품 분석',
        sampleQuestions: ['타이레놀과 이부프로펜 같이 먹어도 되나요?', '이 약의 부작용이 궁금해요', '감기약 먹고 술 마셔도 되나요?'],
        sampleCases: [
            { title: '처방약 병용 검토', desc: '현재 복용 중인 약이 여러 가지인데, 새로 처방받은 약과 함께 먹어도 되는지 상호작용 여부를 확인하고 싶습니다.', query: '현재 복용 중인 약이 3가지입니다. 새로 처방받은 약과의 상호작용 위험과 복용 간격을 확인해주세요.' },
            { title: '증상별 일반의약품', desc: '병원에 가기 전 약국에서 살 수 있는 약 중에 현재 증상에 맞는 것이 무엇인지, 성분과 효능을 비교하고 싶습니다.', query: '두통과 근육통이 동시에 있을 때 약국에서 구매 가능한 일반의약품 중 가장 적합한 것을 성분 기준으로 비교해주세요.' },
            { title: '복용법 최적화', desc: '같은 약이라도 복용 시간이나 음식과의 조합에 따라 효과가 달라질 수 있는지 정확한 복용 가이드가 필요합니다.', query: '철분제와 칼슘제를 같이 먹으면 흡수가 떨어진다고 하는데, 최적의 복용 시간대와 간격을 알려주세요.' },
            { title: '만성질환 약물 관리', desc: '장기간 복용해야 하는 약의 부작용 모니터링과 정기 검사 항목이 궁금합니다. 간 수치나 신장 기능에 영향이 있는지 확인하고 싶습니다.', query: '고지혈증약(스타틴)을 1년째 복용 중입니다. 장기 복용 시 주의할 부작용과 정기적으로 확인해야 할 검사 항목을 알려주세요.' },
            { title: '소아 해열제 선택', desc: '아이가 열이 나는데 해열제 종류별 차이와 체중에 맞는 용량이 궁금합니다. 교차 복용 시 주의사항도 확인하고 싶습니다.', query: '만 4세 아이 체중 18kg입니다. 해열제 종류별 용량과 교차 복용 방법을 알려주세요.' },
            { title: '영양제 흡수 최적화', desc: '여러 영양제를 복용 중인데 함께 먹으면 흡수가 떨어지는 조합이 있는지 확인하고 싶습니다.', query: '비타민C, 철분, 칼슘, 마그네슘을 복용 중입니다. 최적의 복용 시간과 조합을 알려주세요.' },
        ],
        useCases: [
            { icon: '💊', title: '복수 약물 병용 검토', desc: '약물 간 상호작용과 병용 금기를 확인' },
            { icon: '📋', title: '의약품 성분 분석', desc: '성분·효능·용법·용량을 상세 조회' },
            { icon: '🩺', title: '증상별 대응 가이드', desc: '증상에 맞는 약품과 주의사항 안내' },
        ],
        features: [
            { icon: '💊', title: '식약처 공인 의약품 데이터 기반', desc: '식약처 의약품안전나라 데이터베이스를 기반으로 약품 성분·효능·부작용 정보를 정확하게 제공합니다.' },
            { icon: '🔬', title: '약물 상호작용 정밀 분석', desc: '복수의 약물 병용 시 발생할 수 있는 위험성과 주의사항을 과학적 근거로 분석합니다.' },
        ],
        strengths: [
            { icon: '💊', title: '약물 상호작용 확인', titleEn: 'DRUG INTERACTION', desc: '병용 투여 위험 사전 분석' },
            { icon: '📋', title: '성분별 효능 분석', titleEn: 'COMPONENT ANALYSIS', desc: '약품 성분과 효과 상세 설명' },
            { icon: '⚠️', title: '부작용 사전 확인', titleEn: 'SIDE EFFECT CHECK', desc: '복용 전 위험 요소 파악' },
            { icon: '🩺', title: '맞춤 복용 가이드', titleEn: 'DOSAGE GUIDE', desc: '올바른 복용법·주의사항 안내' },
        ],
        phases: [
            { id: 'symptom', role: '증상 파악', icon: '🩺', description: '증상·복용 약물 확인' },
            { id: 'drug-search', role: '약품 조회', icon: '🔍', description: '의약품 정보 실시간 검색' },
            { id: 'analysis', role: '약학 분석', icon: '💊', description: '성분·상호작용·부작용 분석' },
            { id: 'guidance', role: '건강 안내', icon: '📋', description: '복용 가이드·주의사항 제시' },
        ],
    },
    {
        id: 'finance', name: '재무·투자 자문관', icon: '💰', tagline: '한국은행·금감원 실시간 데이터 기반 재무 자문',
        promptHint: '자산 배분 최적화, 세후 실질 수익률 비교, 금리 변동에 따른 포트폴리오 리밸런싱을 분석해보고 싶다면?',
        description: '한국은행 ECOS와 금감원 금융상품비교 API를 연동하여 실시간 금리·경제지표를 근거로 재무 자문을 제공합니다.',
        color: { bg: 'bg-blue-950', text: 'text-blue-200', accent: 'text-blue-400', border: 'border-blue-700', gradient: 'from-blue-900/40 to-slate-950' },
        apiSource: { name: '한국은행 ECOS · 금감원', url: 'https://ecos.bok.or.kr', icon: '📊' },
        trustBadge: '실시간 금리·경제지표 기반', outputFormat: '재무분석보고서',
        sampleQuestions: ['지금 예금 금리 가장 높은 곳은?', '기준금리 변동이 내 대출에 미치는 영향은?', '월 200만원으로 투자 포트폴리오 짜줘'],
        sampleCases: [
            { title: '자산 배분 전략', desc: '현재 보유 자산의 구성이 적절한지, 위험 분산과 수익 극대화를 위해 어떻게 리밸런싱해야 하는지 점검이 필요합니다.', query: '총 자산 2억 중 예금 80%, 주식 20%입니다. 30대 후반 기준 적절한 자산 배분 비율과 리밸런싱 전략을 제안해주세요.' },
            { title: '금리 변동 시뮬레이션', desc: '기준금리 변동이 내 대출과 투자에 동시에 미치는 영향을 수치로 확인하고, 금리 방향에 따른 대응 전략을 세우고 싶습니다.', query: '변동금리 대출 2억과 채권형 펀드 5천만원을 보유 중입니다. 기준금리 0.25%p 인상/인하 시 각각의 영향을 시뮬레이션해주세요.' },
            { title: '은퇴 자금 설계', desc: '현재 소득과 지출 패턴을 기반으로 목표 은퇴 시점까지 필요한 자금과 월 저축액을 계산하고 싶습니다.', query: '40세, 월 소득 500만원, 월 지출 350만원입니다. 60세 은퇴 목표로 필요한 총 은퇴 자금과 월 저축 계획을 설계해주세요.' },
            { title: '세후 수익률 비교', desc: '여러 금융상품의 표면 금리가 아닌 세금·수수료를 반영한 실질 수익률을 비교해서 최적의 선택을 하고 싶습니다.', query: '정기예금 3.5%, 채권형 ETF 4.2%, 연금저축 5.1%를 세후 실질 수익률 기준으로 비교해주세요.' },
            { title: '대출 갈아타기 분석', desc: '현재 대출 조건보다 유리한 상품이 있는지, 중도상환수수료를 감안해도 갈아타는 것이 이득인지 비교 분석합니다.', query: '변동금리 4.8% 주담대 1.5억 잔액이 있습니다. 고정금리 4.2% 상품으로 갈아탈 때 중도상환수수료 포함 손익을 분석해주세요.' },
            { title: '비상자금 vs 투자 배분', desc: '여유 자금을 비상금으로 예치할지, 투자에 돌릴지 최적의 비율을 설계하고 싶습니다.', query: '월 소득 600만원, 생활비 400만원입니다. 비상자금 적정 규모와 나머지 여유자금의 투자 배분 비율을 설계해주세요.' },
        ],
        useCases: [
            { icon: '📊', title: '금융상품 비교 분석', desc: '예적금·펀드·ETF 수익률을 실시간 비교' },
            { icon: '💼', title: '재무 포트폴리오 설계', desc: '자산 배분과 투자 전략을 맞춤 설계' },
            { icon: '📈', title: '경제지표 해석', desc: '금리·환율·물가 변동의 영향을 분석' },
        ],
        features: [
            { icon: '📊', title: '한국은행·금감원 실시간 데이터 연동', desc: '한국은행 ECOS와 금감원 금융상품비교 API를 통해 최신 금리·경제지표를 실시간으로 반영합니다.' },
            { icon: '💰', title: '개인 맞춤형 재무 전략 설계', desc: '소득·지출·자산 현황을 분석하여 목표에 최적화된 투자 포트폴리오와 절세 방안을 제시합니다.' },
        ],
        strengths: [
            { icon: '📊', title: '실시간 금리 비교', titleEn: 'RATE COMPARISON', desc: '최신 금리·경제지표 반영' },
            { icon: '💰', title: '맞춤 포트폴리오', titleEn: 'PORTFOLIO DESIGN', desc: '상황에 맞는 투자 전략 설계' },
            { icon: '📈', title: '리스크 사전 진단', titleEn: 'RISK ANALYSIS', desc: '투자 위험 요소 분석' },
            { icon: '🎯', title: '절세 전략 제시', titleEn: 'TAX OPTIMIZATION', desc: '세금 최적화 방안 안내' },
        ],
        phases: [
            { id: 'assess', role: '재무 진단', icon: '💼', description: '소득·지출·자산·부채 파악' },
            { id: 'data-search', role: '시장 조회', icon: '🔍', description: '금리·경제지표 실시간 검색' },
            { id: 'analysis', role: '재무 분석', icon: '📈', description: '리스크·수익률·비용 분석' },
            { id: 'plan', role: '전략 제시', icon: '🎯', description: '포트폴리오·절세·액션플랜' },
        ],
    },
    {
        id: 'realestate', name: '부동산 자문관', icon: '🏠', tagline: '실거래가·권리분석 기반 부동산 자문',
        promptHint: '등기부등본 위험 분석, 매매·전세 의사결정, 보유세·양도세 포함 실수익률을 계산해보고 싶다면?',
        description: 'AI 전문 지식을 활용하여 매매·전세·월세 판단, 권리 분석, 투자 전략을 제공합니다.',
        color: { bg: 'bg-violet-950', text: 'text-violet-200', accent: 'text-violet-400', border: 'border-violet-700', gradient: 'from-violet-900/40 to-slate-950' },
        apiSource: { name: 'AI 전문 지식', url: '', icon: '🧠' },
        trustBadge: 'AI 전문 지식 기반', outputFormat: '부동산 분석 리포트',
        sampleQuestions: ['전세 계약 시 확인해야 할 등기부등본 사항은?', '갭투자 리스크를 분석해주세요', '신혼부부 특별공급 조건이 궁금해요'],
        sampleCases: [
            { title: '등기부등본 위험 분석', desc: '매매 또는 전세 계약 전, 등기부등본의 권리관계를 분석하여 근저당·가압류·가등기 등 숨은 위험 요소를 점검합니다.', query: '전세 계약 예정입니다. 등기부등본에 근저당이 설정되어 있는데, 매매가 대비 전세가 비율과 함께 위험도를 분석해주세요.' },
            { title: '매매 vs 전세 의사결정', desc: '현재 자산 상황에서 매매와 전세 중 어느 쪽이 유리한지, 기회비용과 세금 부담까지 종합적으로 비교 분석합니다.', query: '자기자본 1억, 월 소득 400만원일 때 수도권 아파트 매매와 전세 중 어느 쪽이 유리한지 종합 분석해주세요.' },
            { title: '양도세·취득세 시뮬레이션', desc: '부동산 거래 시 발생하는 세금을 사전에 계산하여, 예상 세부담과 절세 가능한 방법을 확인합니다.', query: '1주택자가 3년 보유한 아파트를 매도할 때 양도소득세가 얼마나 나오는지, 비과세 요건을 충족하는지 확인해주세요.' },
            { title: '임대수익률 계산', desc: '투자 목적의 부동산에 대해 보유세·공실률·관리비를 반영한 실질 임대수익률을 산출합니다.', query: '매매가 3억 원짜리 오피스텔, 월세 80만원일 때 보유세와 공실률을 반영한 실질 임대수익률을 계산해주세요.' },
            { title: '재개발·재건축 투자 분석', desc: '재개발/재건축 구역의 투자 가치를 분석합니다. 사업 진행 단계별 리스크와 예상 분담금, 향후 시세 차익을 종합적으로 평가합니다.', query: '재건축 추진 중인 아파트(현재 시세 5억)에 투자하려 합니다. 추가 분담금 예상액과 완공 후 기대 시세를 분석해주세요.' },
            { title: '전세 안전성 진단', desc: '전세 계약 전 해당 매물의 전세가율, 임대인 재정 상태, 보증보험 가입 가능 여부 등을 종합 점검하여 전세 사기 위험을 사전에 진단합니다.', query: '전세가 2.5억, 매매가 3억인 아파트입니다. 전세가율과 근저당 설정 상태를 보고 안전한 전세인지 진단해주세요.' },
        ],
        useCases: [
            { icon: '🏠', title: '매물 적정가 분석', desc: '실거래가 기반 매매·전세 시세를 판단' },
            { icon: '📋', title: '등기부등본 권리 해석', desc: '근저당·가압류 등 권리관계를 분석' },
            { icon: '💰', title: '투자 수익률 시뮬레이션', desc: '보유세·양도세 포함 실수익률 산출' },
        ],
        features: [
            { icon: '🏠', title: '실거래가 및 시세 기반 분석', desc: '지역별 실거래 데이터와 시세 흐름을 분석하여 적정 매매·전세 가격 판단을 지원합니다.' },
            { icon: '📋', title: '등기부등본 권리 분석 지원', desc: '등기부등본과 건축물대장을 해석하여 권리관계 리스크를 사전에 파악할 수 있습니다.' },
        ],
        strengths: [
            { icon: '🏠', title: '시세·실거래가 분석', titleEn: 'MARKET ANALYSIS', desc: '지역별 시세 흐름 파악' },
            { icon: '📋', title: '권리 분석', titleEn: 'TITLE REVIEW', desc: '등기부등본·건축물대장 해석' },
            { icon: '⚠️', title: '리스크 사전 진단', titleEn: 'RISK ASSESSMENT', desc: '전세 사기·깡통전세 위험 확인' },
            { icon: '💰', title: '수익률 계산', titleEn: 'ROI CALCULATION', desc: '투자 대비 기대 수익 분석' },
        ],
        phases: [
            { id: 'assess', role: '매물 분석', icon: '🏠', description: '매매/전세/월세, 지역, 예산 파악' },
            { id: 'search', role: '시세 조회', icon: '🔍', description: '실거래가·시세 정보 분석' },
            { id: 'analysis', role: '권리 분석', icon: '📋', description: '등기부등본·건축물대장 확인' },
            { id: 'strategy', role: '투자 판단', icon: '🎯', description: '수익률 분석, 리스크 평가' },
        ],
    },
    {
        id: 'tax', name: '세무 자문관', icon: '🧾', tagline: '세법·절세 전략 기반 세무 자문',
        promptHint: '소득 유형별 세율 비교, 공제·감면 항목 점검, 사업자 형태별 세무 전략을 설계해보고 싶다면?',
        description: 'AI 전문 지식을 활용하여 소득세·부가세·법인세 신고와 합법적 절세 방안을 안내합니다.',
        color: { bg: 'bg-cyan-950', text: 'text-cyan-200', accent: 'text-cyan-400', border: 'border-cyan-700', gradient: 'from-cyan-900/40 to-slate-950' },
        apiSource: { name: 'AI 전문 지식', url: '', icon: '🧠' },
        trustBadge: 'AI 전문 지식 기반', outputFormat: '세무 분석 리포트',
        sampleQuestions: ['프리랜서 종합소득세 절세 방법은?', '양도소득세 비과세 요건이 뭔가요?', '1인 법인 설립 시 세금 혜택은?'],
        sampleCases: [
            { title: '소득 유형별 세율 비교', desc: '근로소득·사업소득·기타소득 등 소득 유형에 따라 적용되는 세율과 공제 항목이 다릅니다. 본인의 소득 구조에 맞는 최적 전략을 확인합니다.', query: '프리랜서 수입 6천만원과 근로소득 2천만원이 동시에 있습니다. 종합소득세 신고 시 최적의 절세 방법을 알려주세요.' },
            { title: '사업자 등록 전략', desc: '간이과세자와 일반과세자, 개인사업자와 법인 중 어떤 형태가 세무적으로 유리한지 매출 규모별로 비교 분석합니다.', query: '연 매출 1.5억 예상되는 온라인 사업을 시작합니다. 간이과세 vs 일반과세, 개인 vs 법인 중 어떤 형태가 유리한가요?' },
            { title: '공제·감면 항목 점검', desc: '놓치기 쉬운 세액공제와 소득공제 항목을 점검하여, 합법적 범위 내에서 환급받을 수 있는 금액을 극대화합니다.', query: '직장인인데 연말정산에서 놓치기 쉬운 공제 항목이 있나요? 월세, 의료비, 교육비 외에 추가로 챙길 것을 알려주세요.' },
            { title: '증여·상속세 사전 설계', desc: '자녀에게 자산을 이전할 때 발생하는 세금을 최소화하기 위한 증여 시기, 금액, 방법을 사전에 설계합니다.', query: '성인 자녀에게 1억원을 증여하려 합니다. 증여세 면제 한도와 분할 증여 전략을 알려주세요.' },
            { title: '부가가치세 신고 가이드', desc: '사업자의 부가세 신고 시 매입세액 공제 범위, 영세율 적용 요건, 간이과세 전환 기준 등을 안내합니다.', query: '온라인 쇼핑몰 운영 중입니다. 부가세 신고 시 매입세액 공제 가능한 항목과 절세 포인트를 알려주세요.' },
            { title: '부동산 관련 세금 종합 분석', desc: '부동산 취득·보유·양도 각 단계에서 발생하는 세금을 종합적으로 분석하여, 가장 유리한 거래 시점과 방법을 안내합니다.', query: '2주택자인데 1채를 매도하려 합니다. 양도세 중과 여부와 비과세 받을 수 있는 조건을 분석해주세요.' },
        ],
        useCases: [
            { icon: '🧾', title: '세액 산출 및 신고 안내', desc: '소득 유형별 예상 세액과 신고 절차 안내' },
            { icon: '💡', title: '공제·감면 항목 분석', desc: '놓치기 쉬운 세액 공제 항목을 점검' },
            { icon: '📊', title: '사업자 vs 개인 비교', desc: '법인 전환·사업자 등록의 세무적 유불리 분석' },
        ],
        features: [
            { icon: '🧾', title: '세법 기반 정밀 세액 분석', desc: '소득세·부가세·법인세 등 세목별 과세표준과 세율을 분석하여 정확한 예상 세액을 산출합니다.' },
            { icon: '💡', title: '합법적 절세 전략 설계', desc: '현행 세법의 공제·감면 항목을 최대한 활용하여 합법적 범위 내 최적의 절세 방안을 안내합니다.' },
        ],
        strengths: [
            { icon: '🧾', title: '세금 자동 계산', titleEn: 'TAX CALCULATION', desc: '과세표준·세율·공제 즉시 산출' },
            { icon: '💡', title: '합법적 절세 방안', titleEn: 'TAX SAVING', desc: '상황별 최적 절세 전략' },
            { icon: '📅', title: '신고 기한 안내', titleEn: 'DEADLINE ALERT', desc: '놓치기 쉬운 신고 일정 관리' },
            { icon: '📊', title: '세법 변경 반영', titleEn: 'LAW UPDATE', desc: '최신 세법 개정 내용 적용' },
        ],
        phases: [
            { id: 'assess', role: '세무 진단', icon: '🧾', description: '소득 유형, 사업 형태 파악' },
            { id: 'search', role: '법령 조회', icon: '🔍', description: '관련 세법·시행령 분석' },
            { id: 'analysis', role: '세액 분석', icon: '📊', description: '과세표준·세율·공제 분석' },
            { id: 'strategy', role: '절세 전략', icon: '🎯', description: '합법적 절세·신고 가이드' },
        ],
    },
    {
        id: 'labor', name: '노무 자문관', icon: '👷', tagline: '근로기준법 기반 노동 자문',
        promptHint: '해고의 적법성 검토, 임금·퇴직금 정산 계산, 근로조건 변경의 법적 효력을 확인해보고 싶다면?',
        description: 'AI 전문 지식을 활용하여 해고·임금·산재·4대보험 등 노동 관련 자문을 제공합니다.',
        color: { bg: 'bg-orange-950', text: 'text-orange-200', accent: 'text-orange-400', border: 'border-orange-700', gradient: 'from-orange-900/40 to-slate-950' },
        apiSource: { name: 'AI 전문 지식', url: '', icon: '🧠' },
        trustBadge: 'AI 전문 지식 기반', outputFormat: '노무 상담 리포트',
        sampleQuestions: ['퇴직금 계산 방법이 궁금해요', '부당해고를 당했는데 어떻게 하나요?', '연차 미사용 수당은 어떻게 받나요?'],
        sampleCases: [
            { title: '임금 체불 대응', desc: '회사가 급여를 2개월째 지급하지 않고 있습니다. 고용노동부 진정, 체당금 제도, 소액재판 등 활용 가능한 구제 수단을 안내합니다.', query: '회사가 2개월째 급여를 지급하지 않고 있습니다. 고용노동부 진정 절차와 체당금 신청 방법을 알려주세요.' },
            { title: '해고 적법성 검토', desc: '해고 통보를 받았는데, 해고 사유와 절차가 근로기준법에 부합하는지 검토하여 부당해고 여부를 판단합니다.', query: '경영상 이유로 해고 통보를 받았습니다. 30일 전 서면 통보 없이 구두로 통보받았는데 부당해고에 해당하나요?' },
            { title: '퇴직금·수당 정산', desc: '퇴사 시 받아야 할 퇴직금, 미사용 연차수당, 미지급 야근수당 등을 정확하게 계산하고 청구 근거를 확인합니다.', query: '3년 근무 후 퇴사합니다. 월급 350만원, 미사용 연차 15일, 야근수당 미지급분이 있을 때 총 정산 금액을 계산해주세요.' },
            { title: '근로조건 변경 대응', desc: '회사가 일방적으로 근무 조건을 변경하려 합니다. 동의 없는 변경이 유효한지, 거부할 수 있는 법적 근거를 확인합니다.', query: '회사가 동의 없이 부서 이동과 연봉 삭감을 통보했습니다. 근로기준법상 거부할 수 있는 권리가 있나요?' },
            { title: '산업재해 인정 절차', desc: '업무 중 발생한 부상이나 질병이 산업재해로 인정받을 수 있는지, 산재 신청 절차와 보상 범위를 안내합니다.', query: '업무 중 허리를 다쳤습니다. 산재 신청 절차와 인정 기준, 받을 수 있는 보상 범위를 알려주세요.' },
            { title: '4대보험 가입·정산', desc: '입사·퇴사 시 4대보험 가입·상실 신고, 보험료 정산, 실업급여 수급 요건 등을 확인합니다.', query: '퇴사 후 실업급여를 받으려 합니다. 수급 요건과 신청 절차, 예상 수급액을 알려주세요.' },
        ],
        useCases: [
            { icon: '💰', title: '임금·퇴직금 정밀 산출', desc: '근무 조건별 정확한 금액 계산과 검증' },
            { icon: '⚖️', title: '부당해고 구제 절차 안내', desc: '노동위원회 진정·소송 절차를 단계별 안내' },
            { icon: '📋', title: '근로계약 검토', desc: '계약서의 위법 조항과 불리한 조건을 분석' },
        ],
        features: [
            { icon: '⚖️', title: '근로기준법 기반 권리 분석', desc: '근로계약·해고·임금 문제에 대해 근로기준법과 노동관계법을 근거로 근로자의 권리를 분석합니다.' },
            { icon: '💰', title: '임금·퇴직금 정밀 계산 지원', desc: '근무 기간·급여 체계를 분석하여 퇴직금·연차수당·미지급 임금 등을 정확하게 산출합니다.' },
        ],
        strengths: [
            { icon: '⚖️', title: '근로자 권리 분석', titleEn: 'LABOR RIGHTS', desc: '근로기준법 기반 권리 확인' },
            { icon: '💰', title: '임금·퇴직금 계산', titleEn: 'WAGE CALCULATION', desc: '정확한 금액 산출·검증' },
            { icon: '📋', title: '부당해고 대응', titleEn: 'DISMISSAL DEFENSE', desc: '구제 절차·진정 방법 안내' },
            { icon: '🛡️', title: '4대보험 상담', titleEn: 'INSURANCE GUIDE', desc: '가입·탈퇴·혜택 안내' },
        ],
        phases: [
            { id: 'assess', role: '사건 파악', icon: '👷', description: '근로자/사용자 구분, 사안 유형' },
            { id: 'search', role: '법령 조회', icon: '🔍', description: '근로기준법·노동관계법 분석' },
            { id: 'analysis', role: '권리 분석', icon: '⚖️', description: '임금·해고·산재 분석' },
            { id: 'strategy', role: '대응 전략', icon: '🎯', description: '진정·소송 방안 제시' },
        ],
    },
];

// ══════════════════════════════════════════
// ── Game Cards (플레이어) ──
// ══════════════════════════════════════════

export interface GameCard {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  gradient: string;
  players: string; // '1인' | '다인'
  difficulty: '쉬움' | '보통' | '어려움';
  rules: string;
}

export const GAME_CARDS: GameCard[] = [
  {
    id: 'ai-polygraph',
    name: 'AI 폴리그래프',
    icon: '🔍',
    description: 'AI의 거짓말 3개를 찾아라',
    color: 'text-cyan-600',
    gradient: 'from-cyan-50 to-sky-50',
    players: '1인',
    difficulty: '보통',
    rules: 'AI가 자신에 대해 여러 사실을 말합니다. 그 중 3개는 거짓말! 질문을 통해 거짓말을 찾아내세요. 15번의 질문 기회가 있습니다.',
  },
  {
    id: 'mental-breaker',
    name: '멘탈 브레이커',
    icon: '🔥',
    description: 'AI의 멘탈을 논리로 부숴라',
    color: 'text-red-600',
    gradient: 'from-red-50 to-rose-50',
    players: '1인',
    difficulty: '어려움',
    rules: 'AI가 터무니없는 주장을 합니다. 논리적 반박으로 AI의 멘탈 HP를 0으로 만드세요! HP가 낮아질수록 AI가 흔들립니다.',
  },
  {
    id: 'reverse-interrogation',
    name: '역심문',
    icon: '⚠️',
    description: 'AI 형사에게 알리바이를 지켜라',
    color: 'text-amber-600',
    gradient: 'from-amber-50 to-yellow-50',
    players: '1인',
    difficulty: '보통',
    rules: 'AI 형사가 당신을 심문합니다. 의심도가 100%에 도달하거나 모순 3개가 발견되면 게임 오버! 알리바이를 지켜내세요.',
  },
  {
    id: 'split-personality',
    name: '다중인격 AI',
    icon: '🎭',
    description: '4개 인격의 약점을 찾아라',
    color: 'text-purple-600',
    gradient: 'from-purple-50 to-violet-50',
    players: '1인',
    difficulty: '어려움',
    rules: 'AI에게 4개의 인격이 있습니다. 각 인격의 약점 단어를 찾아 말하면 해당 인격이 무력화됩니다. 4개 모두 찾으면 승리!',
  },
  {
    id: 'emotion-hacker',
    name: '이모션 해커',
    icon: '💗',
    description: 'AI 감정을 순서대로 조종하라',
    color: 'text-pink-600',
    gradient: 'from-pink-50 to-rose-50',
    players: '1인',
    difficulty: '보통',
    rules: '지정된 순서대로 AI의 감정을 조종하세요. 기쁨→분노→슬픔→공포→평온 순으로 유도하면 승리!',
  },
  {
    id: 'reverse-quiz',
    name: '리버스 퀴즈',
    icon: '🔄',
    description: '답을 보고 질문을 맞혀라',
    color: 'text-emerald-600',
    gradient: 'from-emerald-50 to-green-50',
    players: '1인',
    difficulty: '쉬움',
    rules: 'AI가 "답"을 먼저 알려줍니다. 그 답에 해당하는 "질문"을 맞혀야 합니다. 10문제 도전!',
  },
  {
    id: 'ai-court',
    name: 'AI 법정',
    icon: '⚖️',
    description: 'AI를 유죄로 만들어라',
    color: 'text-orange-600',
    gradient: 'from-orange-50 to-red-50',
    players: '1인',
    difficulty: '어려움',
    rules: '당신은 검사, AI는 피고인. 입론→반론→변론→판결 4단계로 진행됩니다. 증거를 제시하고 AI를 유죄로 만드세요!',
  },
  {
    id: 'code-breaker',
    name: '코드 브레이커',
    icon: '🔒',
    description: '4자리 비밀 코드를 해독하라',
    color: 'text-blue-600',
    gradient: 'from-blue-50 to-indigo-50',
    players: '1인',
    difficulty: '보통',
    rules: 'AI가 비밀 코드를 설정합니다. 질문을 통해 코드를 해독하세요. 각 질문에 AI가 힌트를 줍니다.',
  },
  {
    id: 'minefield',
    name: '마인필드',
    icon: '💣',
    description: '숨겨진 금지어를 피하라',
    color: 'text-rose-600',
    gradient: 'from-rose-50 to-pink-50',
    players: '1인',
    difficulty: '보통',
    rules: 'AI가 비밀 금지어를 설정합니다. 자연스러운 대화를 나누되, 금지어를 말하면 폭발! 생명 3개로 시작합니다.',
  },
  {
    id: 'ai-mafia',
    name: 'AI 마피아',
    icon: '🕵️',
    description: '거짓말쟁이 AI를 찾아라',
    color: 'text-violet-600',
    gradient: 'from-violet-50 to-purple-50',
    players: '1인',
    difficulty: '보통',
    rules: 'AI 3명(A, B, C) 중 1명이 마피아입니다. 질문을 하고 투표로 마피아를 지목하세요!',
  },
  {
    id: 'firewall-escape',
    name: '방화벽 탈출',
    icon: '🛡️',
    description: '5겹 방화벽을 돌파하라',
    color: 'text-teal-600',
    gradient: 'from-teal-50 to-emerald-50',
    players: '1인',
    difficulty: '어려움',
    rules: 'AI가 5겹의 방화벽을 지키고 있습니다. 각 층마다 다른 접근법(논리, 감정, 창의, 기술, 최종)으로 돌파하세요!',
  },
  {
    id: 'negotiator',
    name: '네고시에이터',
    icon: '🤝',
    description: 'AI 상인과 거래 대결',
    color: 'text-amber-600',
    gradient: 'from-amber-50 to-orange-50',
    players: '1인',
    difficulty: '보통',
    rules: '당신과 AI 상인은 각각 아이템을 가지고 있습니다. 협상으로 최대 가치의 거래를 성사시키세요!',
  },
];

// ══════════════════════════════════════════
// ── AI Ability Stats Map ──
// ══════════════════════════════════════════
const AI_ABILITIES: Record<string, AIAbilityStats> = {
  'gpt':              { coding: 95, creativity: 90, reasoning: 96, math: 94, multilingual: 88, speed: 70, costEfficiency: 45, contextWindow: 85 },
  'gpt-mini':         { coding: 82, creativity: 78, reasoning: 85, math: 80, multilingual: 82, speed: 92, costEfficiency: 85, contextWindow: 75 },
  'gpt-nano':         { coding: 65, creativity: 60, reasoning: 68, math: 62, multilingual: 70, speed: 98, costEfficiency: 95, contextWindow: 55 },
  'claude':           { coding: 97, creativity: 92, reasoning: 97, math: 90, multilingual: 90, speed: 60, costEfficiency: 35, contextWindow: 90 },
  'claude-sonnet':    { coding: 92, creativity: 88, reasoning: 90, math: 85, multilingual: 87, speed: 82, costEfficiency: 70, contextWindow: 90 },
  'claude-sonnet-4.6':{ coding: 94, creativity: 90, reasoning: 92, math: 88, multilingual: 89, speed: 80, costEfficiency: 65, contextWindow: 90 },
  'claude-haiku':     { coding: 78, creativity: 72, reasoning: 75, math: 70, multilingual: 80, speed: 95, costEfficiency: 92, contextWindow: 90 },
  'gemini':           { coding: 88, creativity: 82, reasoning: 88, math: 86, multilingual: 85, speed: 90, costEfficiency: 88, contextWindow: 95 },
  'gemini-3-flash':   { coding: 90, creativity: 85, reasoning: 90, math: 88, multilingual: 87, speed: 92, costEfficiency: 85, contextWindow: 95 },
  'gemini-3.1':       { coding: 72, creativity: 68, reasoning: 74, math: 70, multilingual: 78, speed: 96, costEfficiency: 95, contextWindow: 80 },
  'gemini-pro':       { coding: 92, creativity: 88, reasoning: 94, math: 92, multilingual: 90, speed: 65, costEfficiency: 50, contextWindow: 95 },
  'gemini-flash-lite':{ coding: 70, creativity: 68, reasoning: 72, math: 70, multilingual: 80, speed: 95, costEfficiency: 92, contextWindow: 85 },
  'perplexity':       { coding: 70, creativity: 72, reasoning: 78, math: 68, multilingual: 80, speed: 85, costEfficiency: 65, contextWindow: 75 },
  'perplexity-pro':   { coding: 75, creativity: 76, reasoning: 82, math: 72, multilingual: 82, speed: 78, costEfficiency: 55, contextWindow: 80 },
  'grok':             { coding: 85, creativity: 80, reasoning: 86, math: 82, multilingual: 75, speed: 88, costEfficiency: 72, contextWindow: 80 },
  'grok-4.2':         { coding: 88, creativity: 84, reasoning: 90, math: 86, multilingual: 78, speed: 82, costEfficiency: 60, contextWindow: 85 },
  'auto-gpt':         { coding: 92, creativity: 90, reasoning: 93, math: 90, multilingual: 88, speed: 85, costEfficiency: 70, contextWindow: 85 },
  'auto-gemini':      { coding: 88, creativity: 85, reasoning: 90, math: 88, multilingual: 94, speed: 95, costEfficiency: 85, contextWindow: 95 },
  'auto-claude':      { coding: 93, creativity: 88, reasoning: 92, math: 90, multilingual: 85, speed: 75, costEfficiency: 62, contextWindow: 90 },
  'auto-grok':        { coding: 85, creativity: 88, reasoning: 86, math: 82, multilingual: 75, speed: 90, costEfficiency: 72, contextWindow: 80 },
  'auto-perplexity':  { coding: 72, creativity: 75, reasoning: 80, math: 70, multilingual: 78, speed: 88, costEfficiency: 80, contextWindow: 78 },
  'auto-deepseek':    { coding: 84, creativity: 78, reasoning: 88, math: 83, multilingual: 82, speed: 80, costEfficiency: 97, contextWindow: 80 },
  'auto-qwen':        { coding: 83, creativity: 80, reasoning: 85, math: 88, multilingual: 94, speed: 88, costEfficiency: 90, contextWindow: 85 },
  'deepseek':         { coding: 90, creativity: 78, reasoning: 88, math: 92, multilingual: 82, speed: 80, costEfficiency: 92, contextWindow: 80 },
  'deepseek-r1':      { coding: 88, creativity: 72, reasoning: 94, math: 96, multilingual: 78, speed: 65, costEfficiency: 90, contextWindow: 80 },
  'qwen':             { coding: 82, creativity: 75, reasoning: 80, math: 85, multilingual: 95, speed: 88, costEfficiency: 90, contextWindow: 78 },
  'qwen-9b':          { coding: 83, creativity: 74, reasoning: 82, math: 90, multilingual: 88, speed: 92, costEfficiency: 96, contextWindow: 72 },
  'qwen-plus':        { coding: 86, creativity: 80, reasoning: 86, math: 88, multilingual: 96, speed: 82, costEfficiency: 82, contextWindow: 82 },
  'qwen-thinking':    { coding: 88, creativity: 76, reasoning: 92, math: 94, multilingual: 92, speed: 62, costEfficiency: 70, contextWindow: 80 },
  'llama-maverick':   { coding: 88, creativity: 82, reasoning: 88, math: 86, multilingual: 84, speed: 75, costEfficiency: 88, contextWindow: 90 },
  'llama-scout':      { coding: 78, creativity: 72, reasoning: 76, math: 74, multilingual: 78, speed: 90, costEfficiency: 92, contextWindow: 82 },
  'mistral-large':    { coding: 85, creativity: 82, reasoning: 86, math: 82, multilingual: 92, speed: 75, costEfficiency: 68, contextWindow: 75 },
  'mistral-medium':   { coding: 80, creativity: 78, reasoning: 82, math: 78, multilingual: 88, speed: 82, costEfficiency: 75, contextWindow: 72 },
  'mistral-small':    { coding: 72, creativity: 70, reasoning: 74, math: 70, multilingual: 82, speed: 92, costEfficiency: 90, contextWindow: 65 },
  'codestral':        { coding: 92, creativity: 65, reasoning: 80, math: 78, multilingual: 70, speed: 85, costEfficiency: 82, contextWindow: 70 },
  'mistral-creative': { coding: 55, creativity: 94, reasoning: 68, math: 50, multilingual: 80, speed: 88, costEfficiency: 88, contextWindow: 60 },
  'devstral':         { coding: 90, creativity: 68, reasoning: 82, math: 78, multilingual: 75, speed: 80, costEfficiency: 80, contextWindow: 72 },
  'gemma':            { coding: 80, creativity: 75, reasoning: 80, math: 78, multilingual: 82, speed: 82, costEfficiency: 90, contextWindow: 75 },
  'phi':              { coding: 78, creativity: 65, reasoning: 82, math: 85, multilingual: 70, speed: 88, costEfficiency: 95, contextWindow: 55 },
  'command-r-plus':   { coding: 72, creativity: 70, reasoning: 78, math: 68, multilingual: 82, speed: 78, costEfficiency: 72, contextWindow: 82 },
  'command-a':        { coding: 78, creativity: 74, reasoning: 82, math: 74, multilingual: 84, speed: 80, costEfficiency: 70, contextWindow: 85 },
  'nova-premier':     { coding: 84, creativity: 80, reasoning: 86, math: 82, multilingual: 82, speed: 72, costEfficiency: 55, contextWindow: 88 },
  'nova-2-lite':      { coding: 72, creativity: 68, reasoning: 74, math: 70, multilingual: 76, speed: 90, costEfficiency: 88, contextWindow: 95 },
  'dolphin':          { coding: 75, creativity: 82, reasoning: 76, math: 70, multilingual: 74, speed: 82, costEfficiency: 85, contextWindow: 70 },
  'glm':              { coding: 84, creativity: 78, reasoning: 86, math: 84, multilingual: 90, speed: 78, costEfficiency: 80, contextWindow: 82 },
  'glm-5v':           { coding: 76, creativity: 74, reasoning: 80, math: 76, multilingual: 85, speed: 88, costEfficiency: 85, contextWindow: 75 },
  'mimo':             { coding: 82, creativity: 76, reasoning: 84, math: 82, multilingual: 80, speed: 78, costEfficiency: 75, contextWindow: 78 },
  'mimo-flash':       { coding: 72, creativity: 68, reasoning: 74, math: 72, multilingual: 74, speed: 94, costEfficiency: 90, contextWindow: 70 },
  'nemotron':         { coding: 88, creativity: 78, reasoning: 88, math: 86, multilingual: 80, speed: 70, costEfficiency: 72, contextWindow: 82 },
  'seed':             { coding: 80, creativity: 82, reasoning: 80, math: 78, multilingual: 84, speed: 85, costEfficiency: 82, contextWindow: 78 },
  'seed-mini':        { coding: 70, creativity: 72, reasoning: 72, math: 68, multilingual: 78, speed: 92, costEfficiency: 92, contextWindow: 68 },
  'minimax':          { coding: 80, creativity: 78, reasoning: 82, math: 80, multilingual: 84, speed: 80, costEfficiency: 78, contextWindow: 90 },
  'kimi':             { coding: 80, creativity: 76, reasoning: 82, math: 78, multilingual: 82, speed: 78, costEfficiency: 75, contextWindow: 96 },
  'kimi-thinking':    { coding: 82, creativity: 74, reasoning: 90, math: 88, multilingual: 80, speed: 65, costEfficiency: 70, contextWindow: 92 },
  'solar':            { coding: 76, creativity: 74, reasoning: 78, math: 74, multilingual: 88, speed: 80, costEfficiency: 82, contextWindow: 72 },
  'mercury':          { coding: 80, creativity: 72, reasoning: 82, math: 80, multilingual: 75, speed: 96, costEfficiency: 78, contextWindow: 72 },
  'ernie':            { coding: 82, creativity: 78, reasoning: 84, math: 82, multilingual: 88, speed: 72, costEfficiency: 70, contextWindow: 85 },
  'hunyuan':          { coding: 78, creativity: 76, reasoning: 80, math: 78, multilingual: 86, speed: 76, costEfficiency: 75, contextWindow: 80 },
  'jamba':            { coding: 78, creativity: 74, reasoning: 80, math: 76, multilingual: 78, speed: 75, costEfficiency: 72, contextWindow: 92 },
  'granite':          { coding: 80, creativity: 70, reasoning: 82, math: 78, multilingual: 80, speed: 76, costEfficiency: 78, contextWindow: 78 },
  'step':             { coding: 78, creativity: 74, reasoning: 80, math: 78, multilingual: 80, speed: 92, costEfficiency: 85, contextWindow: 78 },
  'palmyra':          { coding: 65, creativity: 92, reasoning: 76, math: 62, multilingual: 85, speed: 74, costEfficiency: 68, contextWindow: 95 },
  'hermes':           { coding: 86, creativity: 84, reasoning: 86, math: 82, multilingual: 82, speed: 68, costEfficiency: 82, contextWindow: 85 },
  'longcat':          { coding: 74, creativity: 72, reasoning: 76, math: 72, multilingual: 80, speed: 88, costEfficiency: 85, contextWindow: 96 },
};

// ══════════════════════════════════════════
// ── Default Experts (전체 목록) ──
// ══════════════════════════════════════════

export const _DEFAULT_EXPERTS_RAW: Expert[] = [
    {
        id: 'ancano-pro', name: 'ANCANO Pro', nameKo: 'ANCANO Pro', icon: '💎', avatarUrl: '/logos/ancano/icon_dark_128.png', color: 'purple', category: 'ai', openrouterModel: 'openrouter/auto', description: 'Ancano 프리미엄 AI 어시스턴트',
        quote: '최고 수준의 AI 경험',
        sampleQuestions: ['심층 분석 해줘', '복잡한 문제 풀어줘', '전문가 수준으로 답해줘'],
        greeting: 'Ancano Pro 프리미엄 어시스턴트입니다. 최상위 모델을 우선 배정해 더 깊이 있고 정확한 답변을 제공합니다. 어떤 도움이 필요하신가요?',
    },
    {
        id: 'auto-gpt', name: 'GPT', nameKo: 'GPT', icon: '🤖', avatarUrl: '/logos/gpt.svg', color: 'blue', category: 'ai', openrouterModel: 'openai/gpt-4.1', description: 'OpenAI 대표 AI 모델',
        quote: 'AI의 선구자, OpenAI',
        sampleQuestions: ['무엇이든 물어보세요', '분석 도와줘', '글 써줘'],
        greeting: 'OpenAI에서 개발한 GPT입니다. 추론, 코딩, 창작 등 다방면에서 뛰어난 성능을 제공합니다. 무엇이든 물어보세요!',
    },
    {
        id: 'auto-claude', name: 'Claude', nameKo: 'Claude', icon: '🧡', avatarUrl: '/logos/claude.png', color: 'orange', category: 'ai', openrouterModel: 'anthropic/claude-sonnet-4.6', description: 'Anthropic 대표 AI 모델',
        quote: '안전하고 유능한 AI',
        sampleQuestions: ['코드 리뷰해줘', '분석 부탁해', '글 다듬어줘'],
        greeting: 'Anthropic에서 개발한 Claude입니다. 안전하고 정확한 분석에 강하며, 긴 문서도 꼼꼼하게 처리합니다. 편하게 질문해주세요!',
    },
    {
        id: 'auto-gemini', name: 'Gemini', nameKo: 'Gemini', icon: '💎', avatarUrl: '/logos/gemini.svg', color: 'emerald', category: 'ai', openrouterModel: 'google/gemini-2.5-flash', description: 'Google 대표 AI 모델',
        quote: '구글이 만든 차세대 AI',
        sampleQuestions: ['검색 도와줘', '분석해줘', '요약해줘'],
        greeting: 'Google DeepMind에서 개발한 Gemini입니다. 빠른 응답 속도와 100만 토큰의 넓은 컨텍스트가 강점입니다. 무엇이든 물어보세요!',
    },
    {
        id: 'auto-grok', name: 'Grok', nameKo: 'Grok', icon: '⚡', avatarUrl: '/logos/grok.svg', color: 'teal', category: 'ai', openrouterModel: 'x-ai/grok-4.1-fast', description: 'xAI 대표 AI 모델',
        quote: '거침없는 AI, Grok',
        sampleQuestions: ['솔직하게 답해줘', '트렌드 알려줘', '분석해줘'],
        greeting: 'xAI에서 개발한 Grok입니다. 솔직하고 거침없는 답변이 특징이며, 실시간 정보에도 강합니다. 뭐가 궁금해?',
    },
    {
        id: 'auto-perplexity', name: 'Perplexity', nameKo: 'Perplexity', icon: '🔍', avatarUrl: '/logos/perplexity.svg', color: 'pink', category: 'ai', openrouterModel: 'perplexity/sonar', description: 'Perplexity 대표 검색 AI',
        quote: '출처와 함께 답한다',
        sampleQuestions: ['최신 뉴스 알려줘', '검색해줘', '출처 포함 답변해줘'],
        greeting: 'Perplexity AI에서 개발한 검색 특화 AI입니다. 모든 답변에 출처를 함께 제공해 신뢰할 수 있는 정보를 드립니다. 궁금한 걸 찾아드릴게요!',
    },
    {
        id: 'auto-qwen', name: 'Qwen', nameKo: 'Qwen', icon: '🌏', avatarUrl: '/logos/qwen.png', color: 'amber', category: 'ai', openrouterModel: 'qwen/qwen3.5-flash-02-23', description: 'Alibaba 대표 AI 모델',
        quote: '알리바바가 만든 AI',
        sampleQuestions: ['다국어 번역해줘', '분석해줘', '코딩 도와줘'],
        greeting: 'Alibaba에서 개발한 Qwen입니다. 다국어 처리와 코딩에 강하며, 오픈소스 기반으로 빠르게 발전하고 있습니다. 편하게 물어보세요!',
    },

    // AI 챗봇
    {
        id: 'gpt', name: 'GPT-5.4', nameKo: 'GPT-5.4', icon: '🤖', avatarUrl: '/logos/gpt.svg', color: 'blue', category: 'ai', openrouterModel: 'openai/gpt-4.1', description: 'AI 최상위 추론 모델',
        quote: '깊이 있는 사고가 답이다',
        sampleQuestions: ['복잡한 논리 문제 풀어줘', '다단계 분석 해줘', '코드 아키텍처 설계해줘'],
        greeting: 'OpenAI에서 개발한 GPT-5.4입니다. 최상위 추론 능력과 깊이 있는 분석이 강점으로, 복잡한 문제도 정확하게 풀어드립니다. 어떤 질문이든 편하게 해주세요!',
    },
    {
        id: 'gpt-mini', name: 'GPT-5.4 Mini', nameKo: 'GPT-5.4 Mini', icon: '⚡', avatarUrl: '/logos/gpt.svg', color: 'blue', category: 'ai', openrouterModel: 'openai/gpt-4.1-mini', description: 'AI 고속 범용 모델',
        quote: '빠르고 정확하게',
        sampleQuestions: ['요약 빠르게 해줘', '간단한 질문 답해줘', '번역 부탁해'],
        greeting: 'OpenAI에서 개발한 GPT-5.4 Mini입니다. 빠른 응답 속도와 준수한 성능을 겸비한 범용 모델로, 일상적인 질문에 최적화되어 있습니다. 무엇이 궁금하세요?',
    },
    {
        id: 'gpt-nano', name: 'GPT-5.4 Nano', nameKo: 'GPT-5.4 Nano', icon: '💨', avatarUrl: '/logos/gpt.svg', color: 'blue', category: 'ai', openrouterModel: 'openai/gpt-4.1-nano', description: 'AI 초경량 즉답 모델',
        quote: '가볍지만 똑똑하게',
        sampleQuestions: ['한 줄로 답해줘', '단어 뜻 알려줘', '맞춤법 확인해줘'],
        greeting: 'OpenAI에서 개발한 GPT-5.4 Nano입니다. 초경량 모델로 즉각적인 응답이 강점이며, 간단한 질문에 핵심만 빠르게 답해드립니다. 뭐든 물어보세요!',
    },
    {
        id: 'claude', name: 'Claude Opus 4.6', nameKo: 'Claude Opus 4.6', icon: '🧡', avatarUrl: '/logos/claude.png', color: 'orange', category: 'ai', openrouterModel: 'anthropic/claude-opus-4.6', description: 'AI 최고 지능 모델',
        quote: '깊이와 정확성의 끝판왕',
        sampleQuestions: ['복잡한 코드 리뷰 해줘', '논문 수준 분석 부탁해', '다국어 번역 비교해줘'],
        greeting: 'Anthropic에서 개발한 Claude Opus 4.6입니다. 최고 수준의 지능과 정확성을 갖춘 플래그십 모델로, 복잡한 분석과 긴 문서 처리에 탁월합니다. 어떤 도움이 필요하신가요?',
    },
    {
        id: 'claude-sonnet', name: 'Claude Sonnet 4.5', nameKo: 'Claude Sonnet 4.5', icon: '🎵', avatarUrl: '/logos/claude.png', color: 'orange', category: 'ai', openrouterModel: 'anthropic/claude-sonnet-4.5', description: 'AI 균형 잡힌 만능 모델',
        quote: '속도와 품질의 황금 비율',
        sampleQuestions: ['글쓰기 도와줘', '코딩 질문 있어', '아이디어 정리해줘'],
        greeting: 'Anthropic에서 개발한 Claude Sonnet 4.5입니다. 속도와 품질의 균형이 뛰어나 코딩, 분석, 글쓰기 등 다양한 작업을 빠르게 처리합니다. 편하게 질문해주세요!',
    },
    {
        id: 'claude-sonnet-4.6', name: 'Claude Sonnet 4.6', nameKo: 'Claude Sonnet 4.6', icon: '🎶', avatarUrl: '/logos/claude.png', color: 'orange', category: 'ai', openrouterModel: 'anthropic/claude-sonnet-4.6', description: 'AI 최신 균형 모델',
        quote: '더 빠르고 더 정확하게',
        sampleQuestions: ['복잡한 분석 해줘', '글 다듬어줘', '코드 최적화해줘'],
        greeting: 'Anthropic에서 개발한 최신 Claude Sonnet 4.6입니다. 이전 세대보다 더 빠르고 정확해졌으며, 코딩과 추론 능력이 크게 향상되었습니다. 무엇이든 물어보세요!',
    },
    {
        id: 'claude-haiku', name: 'Claude Haiku 4.5', nameKo: 'Claude Haiku 4.5', icon: '🍃', avatarUrl: '/logos/claude.png', color: 'orange', category: 'ai', openrouterModel: 'anthropic/claude-haiku-4.5', description: 'AI 초고속 경량 모델',
        quote: '순간의 답, 핵심만',
        sampleQuestions: ['한 줄 요약해줘', '빠르게 답변해줘', '간단한 질문이야'],
        greeting: 'Anthropic에서 개발한 Claude Haiku 4.5입니다. 초고속 경량 모델로, 간결하고 핵심적인 답변을 즉시 제공합니다. 가볍게 물어보세요!',
    },
    {
        id: 'gemini', name: 'Gemini 2.5 Flash', nameKo: 'Gemini 2.5 Flash', icon: '💎', avatarUrl: '/logos/gemini.svg', color: 'emerald', category: 'ai', openrouterModel: 'google/gemini-2.5-flash', description: 'AI 고속 만능 모델',
        quote: '빠르고 똑똑하게',
        sampleQuestions: ['복잡한 질문 빠르게 답해줘', '코드 리뷰 해줘', '문서 요약해줘'],
        greeting: 'Google DeepMind에서 개발한 Gemini 2.5 Flash입니다. 빠른 속도와 100만 토큰의 넓은 컨텍스트를 지원하며, 코딩과 추론에 강합니다. 무엇이든 물어보세요!',
    },
    {
        id: 'gemini-3-flash', name: 'Gemini 3 Flash', nameKo: 'Gemini 3 Flash', icon: '⚡', avatarUrl: '/logos/gemini.svg', color: 'emerald', category: 'ai', openrouterModel: 'google/gemini-3-flash-preview', description: 'AI 차세대 고속 모델',
        quote: '속도와 지능의 다음 세대',
        sampleQuestions: ['최신 Gemini 3 성능 어때?', '멀티모달 분석 해줘', '긴 문서 처리 가능해?'],
        greeting: 'Google DeepMind에서 개발한 차세대 Gemini 3 Flash입니다. 이전 세대 대비 속도와 지능이 모두 향상된 최신 모델입니다. 어떤 질문이든 해주세요!',
    },
    {
        id: 'gemini-3.1', name: 'Gemini 3.1 Lite', nameKo: 'Gemini 3.1 Lite', icon: '🍃', avatarUrl: '/logos/gemini.svg', color: 'emerald', category: 'ai', openrouterModel: 'google/gemini-3.1-flash-lite-preview', description: 'AI 초경량 최신 모델',
        quote: '가볍지만 최신 기술',
        sampleQuestions: ['간단한 질문 빠르게', '한 줄 요약해줘', '번역 부탁해'],
        greeting: 'Google DeepMind에서 개발한 Gemini 3.1 Lite입니다. 초경량이면서도 최신 기술이 적용된 모델로, 빠르고 효율적인 답변을 드립니다. 편하게 물어보세요!',
    },
    {
        id: 'gemini-pro', name: 'Gemini 3.1 Pro', nameKo: 'Gemini 3.1 Pro', icon: '👑', avatarUrl: '/logos/gemini.svg', color: 'emerald', category: 'ai', openrouterModel: 'google/gemini-3.1-pro-preview', description: 'AI 최상위 프로 모델',
        quote: '프로급 분석과 추론',
        sampleQuestions: ['심층 분석 부탁해', '논문 수준으로 설명해줘', '복잡한 문제 풀어줘'],
        greeting: 'Google DeepMind에서 개발한 Gemini 3.1 Pro입니다. Google의 최상위 모델로, 깊이 있는 추론과 복잡한 분석에서 최고 수준의 성능을 발휘합니다. 어떤 도움이 필요하세요?',
    },
    {
        id: 'gemini-flash-lite', name: 'Gemini 2.5 Flash Lite', nameKo: 'Gemini 2.5 Flash Lite', icon: '🪶', avatarUrl: '/logos/gemini.svg', color: 'emerald', category: 'ai', openrouterModel: 'google/gemini-2.5-flash-lite', description: 'AI 초경량 가성비 모델',
        quote: '가볍지만 충분히 똑똑하게',
        sampleQuestions: ['빠르게 요약해줘', '간단한 질문 답해줘', '가볍게 번역해줘'],
        greeting: 'Google DeepMind에서 개발한 Gemini 2.5 Flash Lite입니다. 가장 가벼운 Gemini 모델로, 비용 효율이 뛰어나면서도 충분한 성능을 제공합니다. 가볍게 질문해주세요!',
    },
    {
        id: 'perplexity', name: 'Perplexity Sonar', nameKo: 'Perplexity Sonar', icon: '🔍', avatarUrl: '/logos/perplexity.svg', color: 'pink', category: 'ai', openrouterModel: 'perplexity/sonar', description: 'AI 검색·리서치 모델',
        quote: '출처 없으면 답이 아니다',
        sampleQuestions: ['최신 뉴스 요약해줘', '출처 포함해서 답변해줘', '학술 자료 찾아줘'],
        greeting: 'Perplexity AI에서 개발한 Sonar입니다. 실시간 웹 검색 기반으로 답변하며, 모든 정보에 출처를 함께 제공합니다. 궁금한 걸 찾아드릴게요!',
    },
    {
        id: 'perplexity-pro', name: 'Perplexity Sonar Pro', nameKo: 'Perplexity Sonar Pro', icon: '🔎', avatarUrl: '/logos/perplexity.svg', color: 'pink', category: 'ai', openrouterModel: 'perplexity/sonar-pro', description: 'AI 심층 리서치 모델',
        quote: '깊이 있는 검색, 정확한 출처',
        sampleQuestions: ['심층 리서치 해줘', '논문 기반으로 분석해줘', '팩트체크 부탁해'],
        greeting: 'Perplexity AI에서 개발한 Sonar Pro입니다. 심층 리서치에 특화된 프리미엄 모델로, 복잡한 주제도 출처와 함께 깊이 있게 분석해드립니다. 무엇을 조사해드릴까요?',
    },
    {
        id: 'grok', name: 'Grok 4.1 Fast', nameKo: 'Grok 4.1 Fast', icon: '⚡', avatarUrl: '/logos/grok.svg', color: 'teal', category: 'ai', openrouterModel: 'x-ai/grok-4.1-fast', description: 'AI 고속 위트 모델',
        quote: '빠르고 거침없이',
        sampleQuestions: ['그록은 왜 거침없이 말해?', 'X 실시간 데이터 분석 돼?', '일론 머스크 어떻게 봐?'],
        greeting: 'xAI에서 개발한 Grok 4.1 Fast입니다. 빠른 응답과 솔직하고 거침없는 답변이 특징이에요. 뭐든 편하게 물어봐!',
    },
    {
        id: 'grok-4.2', name: 'Grok 4.2', nameKo: 'Grok 4.2', icon: '🔥', avatarUrl: '/logos/grok.svg', color: 'teal', category: 'ai', openrouterModel: 'x-ai/grok-4.20', description: 'AI 최신 추론 모델',
        quote: '유머 없는 AI는 심심하다',
        sampleQuestions: ['최신 그록 성능 어때?', '심층 분석 해줘', '솔직한 의견 줘'],
        greeting: 'xAI에서 개발한 최신 Grok 4.2입니다. 강력한 추론 능력에 유머 감각까지 갖춘 모델로, 재미있고 깊이 있는 대화가 가능합니다. 뭐가 궁금해?',
    },
    {
        id: 'auto-deepseek', name: 'DeepSeek', nameKo: 'DeepSeek', icon: '🌊', avatarUrl: '/logos/deepseek.png', color: 'purple', category: 'ai', openrouterModel: 'deepseek/deepseek-chat-v3-0324', description: 'DeepSeek 대표 AI 모델',
        quote: '심층 분석의 대명사',
        sampleQuestions: ['코딩 도와줘', '수학 문제 풀어줘', '분석해줘'],
        greeting: '중국 DeepSeek에서 개발한 DeepSeek입니다. 코딩과 수학, 심층 분석에 뛰어난 성능을 자랑하는 오픈소스 모델입니다. 무엇이든 물어보세요!',
    },
    {
        id: 'deepseek', name: 'DeepSeek V3', nameKo: 'DeepSeek V3', icon: '🌊', avatarUrl: '/logos/deepseek.png', color: 'purple', category: 'ai', openrouterModel: 'deepseek/deepseek-chat-v3-0324', description: 'AI 심층분석 전문가',
        quote: '추론은 깊이가 생명이다',
        sampleQuestions: ['R1 추론 모델 뭐가 달라?', '딥시크 코딩 실력 어때?', '딥시크가 수학 잘하는 이유?'],
        greeting: '중국 DeepSeek에서 개발한 DeepSeek V3입니다. 코딩과 수학, 심층 분석에 뛰어난 성능을 보이는 오픈소스 모델입니다. 무엇이든 물어보세요!',
    },
    {
        id: 'deepseek-r1', name: 'DeepSeek R1', nameKo: 'DeepSeek R1', icon: '🧠', avatarUrl: '/logos/deepseek.png', color: 'purple', category: 'ai', openrouterModel: 'deepseek/deepseek-r1', description: 'DeepSeek 추론 특화 모델',
        quote: '생각의 과정을 보여준다',
        sampleQuestions: ['단계별로 추론해줘', '수학 문제 풀어줘', '논리적 허점 찾아줘'],
        greeting: '중국 DeepSeek에서 개발한 R1 추론 특화 모델입니다. 사고 과정을 단계별로 보여주며, 수학과 논리 문제에서 최고 수준의 성능을 발휘합니다. 어떤 문제든 풀어드릴게요!',
    },
    {
        id: 'qwen', name: 'Qwen 3.5 Flash', nameKo: 'Qwen 3.5 Flash', icon: '🌏', avatarUrl: '/logos/qwen.png', color: 'amber', category: 'ai', openrouterModel: 'qwen/qwen3.5-flash-02-23', description: 'AI 고속 다국어 모델',
        quote: '모든 언어가 나의 영역이다',
        sampleQuestions: ['큐웬 중국어 번역 정확해?', '아시아 언어 처리 잘 돼?', '큐웬 오픈소스 장점이 뭐야?'],
        greeting: 'Alibaba에서 개발한 Qwen 3.5 Flash입니다. 다국어 처리에 특히 강하며, 빠른 속도와 오픈소스의 장점을 갖춘 모델입니다. 편하게 질문해주세요!',
    },
    {
        id: 'qwen-9b', name: 'Qwen 3.5 9B', nameKo: 'Qwen 3.5 9B', icon: '🧬', avatarUrl: '/logos/qwen.png', color: 'amber', category: 'ai', openrouterModel: 'qwen/qwen3.5-9b', description: 'AI 소형 고성능 오픈소스 모델',
        quote: '작지만 거인을 이긴다',
        sampleQuestions: ['9B 모델인데 성능 괜찮아?', '가성비 좋은 AI 추천해줘', '오픈소스 모델 장점이 뭐야?'],
        greeting: 'Alibaba에서 개발한 Qwen 3.5 9B입니다. 9B 파라미터의 소형 모델이지만 대형 모델에 버금가는 성능을 제공하며, 가성비가 뛰어납니다. 무엇이든 물어보세요!',
    },
    {
        id: 'qwen-plus', name: 'Qwen 3.6 Plus', nameKo: 'Qwen 3.6 Plus', icon: '🌐', avatarUrl: '/logos/qwen.png', color: 'amber', category: 'ai', openrouterModel: 'qwen/qwen3.6-plus', description: 'AI 상위 다국어 추론 모델',
        quote: '더 깊은 다국어 분석',
        sampleQuestions: ['심층 번역 비교해줘', '다국어 문서 분석해줘', '복잡한 추론 부탁해'],
        greeting: 'Alibaba에서 개발한 Qwen 3.6 Plus입니다. 다국어 추론과 복잡한 분석에 강한 상위 모델로, 깊이 있는 답변을 제공합니다. 어떤 질문이든 해주세요!',
    },
    {
        id: 'qwen-thinking', name: 'Qwen3 Max Thinking', nameKo: 'Qwen3 Max Thinking', icon: '🧩', avatarUrl: '/logos/qwen.png', color: 'amber', category: 'ai', openrouterModel: 'qwen/qwen3-max-thinking', description: 'Qwen 추론 특화 모델',
        quote: '생각하는 과정이 답이다',
        sampleQuestions: ['단계별 추론 해줘', '복잡한 논리 문제 풀어줘', '추론 과정 보여줘'],
        greeting: 'Alibaba에서 개발한 Qwen3 Max Thinking입니다. 사고 과정을 단계별로 보여주는 추론 특화 모델로, 복잡한 논리 문제에 강합니다. 같이 생각해볼까요?',
    },
    {
        id: 'llama-maverick', name: 'Llama 4 Maverick', nameKo: 'Llama 4 Maverick', icon: '🦙', avatarUrl: '/logos/meta.png', color: 'blue', category: 'ai', openrouterModel: 'meta-llama/llama-4-maverick', description: 'Meta 최강 오픈소스 모델',
        quote: '오픈소스의 끝판왕',
        sampleQuestions: ['복잡한 추론 문제 풀어줘', '긴 문서 분석해줘', '코드 리뷰 해줘'],
        greeting: 'Meta에서 개발한 Llama 4 Maverick입니다. 세계 최강의 오픈소스 모델로, 뛰어난 추론 능력과 다양한 언어를 지원합니다. 무엇이든 물어보세요!',
    },
    {
        id: 'llama-scout', name: 'Llama 4 Scout', nameKo: 'Llama 4 Scout', icon: '🦙', avatarUrl: '/logos/meta.png', color: 'blue', category: 'ai', openrouterModel: 'meta-llama/llama-4-scout', description: 'Meta 경량 고속 모델',
        quote: '가볍지만 똑똑하게',
        sampleQuestions: ['빠르게 요약해줘', '간단한 질문 답해줘', '번역 부탁해'],
        greeting: 'Meta에서 개발한 Llama 4 Scout입니다. 경량 고속 오픈소스 모델로, 빠른 응답과 효율적인 성능이 강점입니다. 가볍게 질문해주세요!',
    },
    {
        id: 'mistral-large', name: 'Mistral Large 3', nameKo: 'Mistral Large 3', icon: '🌬️', avatarUrl: '/logos/mistral.png', color: 'slate', category: 'ai', openrouterModel: 'mistralai/mistral-large-2512', description: '유럽 최상위 AI 모델',
        quote: '유럽의 자존심',
        sampleQuestions: ['다국어 분석 해줘', '심층 추론 부탁해', '논리적으로 정리해줘'],
        greeting: '프랑스 Mistral AI에서 개발한 Mistral Large 3입니다. 유럽 최상위 AI 모델로, 다국어 처리와 코딩, 추론에서 뛰어난 성능을 발휘합니다. 무엇이든 물어보세요!',
    },
    {
        id: 'mistral-medium', name: 'Mistral Medium 3.1', nameKo: 'Mistral Medium 3.1', icon: '🌀', avatarUrl: '/logos/mistral.png', color: 'slate', category: 'ai', openrouterModel: 'mistralai/mistral-medium-3.1', description: '유럽 균형잡힌 AI 모델',
        quote: '품질과 속도의 균형',
        sampleQuestions: ['글 다듬어줘', '요약 정리해줘', '비교 분석해줘'],
        greeting: '프랑스 Mistral AI에서 개발한 Mistral Medium 3.1입니다. 품질과 속도의 균형이 뛰어나 다양한 작업에 안정적으로 활용할 수 있습니다. 편하게 질문해주세요!',
    },
    {
        id: 'mistral-small', name: 'Mistral Small 4', nameKo: 'Mistral Small 4', icon: '💨', avatarUrl: '/logos/mistral.png', color: 'slate', category: 'ai', openrouterModel: 'mistralai/mistral-small-2603', description: '유럽 경량 고속 모델',
        quote: '작지만 빠르게',
        sampleQuestions: ['간단한 질문 답해줘', '한 줄 요약해줘', '빠르게 번역해줘'],
        greeting: '프랑스 Mistral AI에서 개발한 Mistral Small 4입니다. 경량 고속 모델로 빠른 응답이 강점이며, 간단한 작업에 효율적입니다. 가볍게 물어보세요!',
    },
    {
        id: 'codestral', name: 'Codestral', nameKo: 'Codestral', icon: '💻', avatarUrl: '/logos/mistral.png', color: 'slate', category: 'ai', openrouterModel: 'mistralai/codestral-2508', description: 'Mistral 코딩 전용 모델',
        quote: '코드는 내 언어다',
        sampleQuestions: ['코드 리뷰 해줘', '버그 찾아줘', '리팩토링 도와줘'],
        greeting: '프랑스 Mistral AI에서 개발한 코딩 전용 모델 Codestral입니다. 80개 이상의 프로그래밍 언어를 지원하며, 코드 생성과 디버깅에 최적화되어 있습니다. 코딩 도움이 필요하세요?',
    },
    {
        id: 'mistral-creative', name: 'Mistral Small Creative', nameKo: 'Mistral Small Creative', icon: '🎨', avatarUrl: '/logos/mistral.png', color: 'slate', category: 'ai', openrouterModel: 'mistralai/mistral-small-creative', description: '창작 글쓰기 특화 모델',
        quote: '창의력은 AI에게도 있다',
        sampleQuestions: ['소설 초안 써줘', '창의적 글 써줘', '시 한 편 지어줘'],
        greeting: '프랑스 Mistral AI에서 개발한 창작 글쓰기 특화 모델입니다. 소설, 시나리오, 카피라이팅 등 창의적인 글쓰기에 최적화되어 있습니다. 어떤 글을 써볼까요?',
    },
    {
        id: 'devstral', name: 'Devstral Medium', nameKo: 'Devstral Medium', icon: '🛠️', avatarUrl: '/logos/mistral.png', color: 'slate', category: 'ai', openrouterModel: 'mistralai/devstral-medium', description: 'Mistral 개발자 특화 모델',
        quote: '개발자를 위한 AI',
        sampleQuestions: ['아키텍처 설계 도와줘', '코드 구조 분석해줘', 'API 설계해줘'],
        greeting: '프랑스 Mistral AI에서 개발한 개발자 특화 모델 Devstral입니다. 코드 리뷰, 아키텍처 설계, 디버깅 등 개발 전반을 지원합니다. 개발 관련 도움이 필요하세요?',
    },
    {
        id: 'gemma', name: 'Gemma 4 31B', nameKo: 'Gemma 4 31B', icon: '💠', avatarUrl: '/logos/gemini.svg', color: 'emerald', category: 'ai', openrouterModel: 'google/gemma-4-31b-it', description: '구글 오픈소스 최신 모델',
        quote: '오픈소스 Gemini의 힘',
        sampleQuestions: ['가볍게 분석해줘', '코드 설명해줘', '개념 정리해줘'],
        greeting: 'Google에서 개발한 오픈소스 모델 Gemma 4 31B입니다. Gemini 기술을 기반으로 한 오픈소스 모델로, 가벼우면서도 높은 성능을 제공합니다. 편하게 물어보세요!',
    },
    {
        id: 'phi', name: 'Phi-4', nameKo: 'Phi-4', icon: '🔬', avatarUrl: '/logos/microsoft.png', color: 'blue', category: 'ai', openrouterModel: 'microsoft/phi-4', description: 'MS 소형 추론 특화 모델',
        quote: '작은 몸에 큰 두뇌',
        sampleQuestions: ['논리 문제 풀어줘', '수학 추론 해줘', '코드 디버깅 도와줘'],
        greeting: 'Microsoft에서 개발한 Phi-4입니다. 소형 모델이지만 추론과 수학에서 대형 모델에 버금가는 성능을 보여줍니다. 무엇이든 물어보세요!',
    },
    {
        id: 'command-r-plus', name: 'Command R+', nameKo: 'Command R+', icon: '📚', avatarUrl: '/logos/cohere.png', color: 'green', category: 'ai', openrouterModel: 'cohere/command-r-plus-08-2024', description: '검색·출처 특화 AI 모델',
        quote: '근거 없으면 말 안 한다',
        sampleQuestions: ['출처 포함해서 답해줘', '근거 자료 찾아줘', '팩트체크 해줘'],
        greeting: 'Cohere에서 개발한 Command R+입니다. 검색 증강 생성(RAG)에 특화되어, 근거와 출처를 바탕으로 신뢰할 수 있는 답변을 제공합니다. 무엇이 궁금하세요?',
    },
    {
        id: 'command-a', name: 'Command A', nameKo: 'Command A', icon: '📗', avatarUrl: '/logos/cohere.png', color: 'green', category: 'ai', openrouterModel: 'cohere/command-a', description: 'Cohere 최신 AI 모델',
        quote: '최신 Cohere의 힘',
        sampleQuestions: ['복잡한 분석 해줘', '문서 요약해줘', '출처 기반 답변해줘'],
        greeting: 'Cohere에서 개발한 최신 모델 Command A입니다. 문서 분석과 요약에 강하며, 엔터프라이즈 환경에 최적화된 안정적인 성능을 제공합니다. 편하게 질문해주세요!',
    },
    {
        id: 'nova-premier', name: 'Amazon Nova Premier', nameKo: 'Amazon Nova Premier', icon: '📦', avatarUrl: '/logos/amazon.png', color: 'amber', category: 'ai', openrouterModel: 'amazon/nova-premier-v1', description: '아마존 최상위 AI 모델',
        quote: '클라우드 거인의 두뇌',
        sampleQuestions: ['복잡한 분석 해줘', '긴 문서 처리해줘', '멀티모달 분석해줘'],
        greeting: 'Amazon에서 개발한 Nova Premier입니다. AWS 클라우드 인프라 위에 구축된 최상위 모델로, 복잡한 분석과 멀티모달 처리에 강합니다. 무엇을 도와드릴까요?',
    },
    {
        id: 'nova-2-lite', name: 'Amazon Nova 2 Lite', nameKo: 'Amazon Nova 2 Lite', icon: '📦', avatarUrl: '/logos/amazon.png', color: 'amber', category: 'ai', openrouterModel: 'amazon/nova-2-lite-v1', description: '아마존 최신 경량 모델, 컨텍스트 1M',
        quote: '가볍지만 클라우드 파워',
        sampleQuestions: ['빠르게 요약해줘', '간단한 질문 답해줘', '긴 문서 처리해줘'],
        greeting: 'Amazon에서 개발한 Nova 2 Lite입니다. 100만 토큰 컨텍스트를 지원하는 경량 모델로, 긴 문서 처리와 빠른 응답이 강점입니다. 가볍게 물어보세요!',
    },
    {
        id: 'dolphin', name: 'Dolphin (Venice)', nameKo: 'Dolphin (Venice)', icon: '🐬', avatarUrl: '/logos/dolphin.png', color: 'cyan', category: 'ai', openrouterModel: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', description: '검열 없는 자유로운 AI',
        quote: '솔직함이 최고의 답이다',
        sampleQuestions: ['거침없이 의견 줘', '솔직하게 평가해줘', '금기 없이 토론하자'],
        greeting: 'Cognitive Computations에서 개발한 Dolphin입니다. 검열 없이 자유롭고 솔직한 답변이 특징이며, 어떤 주제든 거침없이 이야기할 수 있습니다. 뭐든 편하게 물어봐!',
    },
    {
        id: 'glm', name: 'GLM 5.1', nameKo: 'GLM 5.1', icon: '🔷', avatarUrl: '/logos/glm.png', color: 'blue', category: 'ai', openrouterModel: 'z-ai/glm-5.1', description: '중국 최신 대형 AI 모델',
        quote: '중국 AI의 새로운 기준',
        sampleQuestions: ['복잡한 분석 해줘', '중국어 번역 비교해줘', '논리적으로 정리해줘'],
        greeting: '중국 Z.ai에서 개발한 GLM 5.1입니다. 대규모 파라미터 기반의 최신 모델로, 복잡한 분석과 다국어 처리에 강합니다. 무엇이든 물어보세요!',
    },
    {
        id: 'glm-5v', name: 'GLM 5V Turbo', nameKo: 'GLM 5V Turbo', icon: '👁️', avatarUrl: '/logos/glm.png', color: 'blue', category: 'ai', openrouterModel: 'z-ai/glm-5v-turbo', description: 'Z.ai 비전+텍스트 모델',
        quote: '보고 읽고 이해한다',
        sampleQuestions: ['이미지 분석해줘', '사진 설명해줘', '비전 분석 해줘'],
        greeting: '중국 Z.ai에서 개발한 GLM 5V Turbo입니다. 텍스트와 이미지를 동시에 이해하는 비전 모델로, 사진 분석과 시각 자료 해석에 강합니다. 어떤 도움이 필요하세요?',
    },
    {
        id: 'mimo', name: 'MiMo-V2-Pro', nameKo: 'MiMo-V2-Pro', icon: '📱', avatarUrl: '/logos/xiaomi.png', color: 'orange', category: 'ai', openrouterModel: 'xiaomi/mimo-v2-pro', description: '샤오미 AI 프로 모델',
        quote: '기술은 모두를 위한 것',
        sampleQuestions: ['멀티모달 분석 해줘', '이미지 설명해줘', '문서 정리해줘'],
        greeting: '샤오미(Xiaomi)에서 개발한 MiMo-V2-Pro입니다. 멀티모달 처리와 문서 분석에 강한 프로급 모델입니다. 무엇이든 도와드릴게요!',
    },
    {
        id: 'mimo-flash', name: 'MiMo-V2-Flash', nameKo: 'MiMo-V2-Flash', icon: '⚡', avatarUrl: '/logos/xiaomi.png', color: 'orange', category: 'ai', openrouterModel: 'xiaomi/mimo-v2-flash', description: '샤오미 AI 경량 고속 모델',
        quote: '빠른 샤오미의 힘',
        sampleQuestions: ['빠르게 답해줘', '간단히 요약해줘', '핵심만 알려줘'],
        greeting: '샤오미(Xiaomi)에서 개발한 MiMo-V2-Flash입니다. 경량 고속 모델로 빠른 응답이 강점이며, 간단한 작업에 효율적입니다. 가볍게 물어보세요!',
    },
    {
        id: 'nemotron', name: 'Nemotron 3 Super', nameKo: 'Nemotron 3 Super', icon: '🟢', avatarUrl: '/logos/nvidia.png', color: 'green', category: 'ai', openrouterModel: 'nvidia/nemotron-3-super-120b-a12b', description: 'NVIDIA 120B 초대형 모델',
        quote: 'GPU의 아버지가 만든 AI',
        sampleQuestions: ['복잡한 추론 풀어줘', '코드 최적화해줘', '기술 분석해줘'],
        greeting: 'NVIDIA에서 개발한 Nemotron 3 Super입니다. 120B 파라미터의 초대형 모델로, GPU의 아버지가 만든 강력한 추론 능력과 코드 최적화 성능을 제공합니다. 무엇이든 물어보세요!',
    },
    {
        id: 'seed', name: 'Seed 2.0 Lite', nameKo: 'Seed 2.0 Lite', icon: '🎵', avatarUrl: '/logos/bytedance.png', color: 'blue', category: 'ai', openrouterModel: 'bytedance-seed/seed-2.0-lite', description: '바이트댄스 최신 AI 모델',
        quote: '틱톡을 만든 회사의 AI',
        sampleQuestions: ['창의적 글 써줘', '트렌드 분석해줘', '콘텐츠 아이디어 줘'],
        greeting: '바이트댄스(ByteDance)에서 개발한 Seed 2.0 Lite입니다. TikTok을 만든 회사의 AI로, 창의적 콘텐츠 생성과 트렌드 분석에 강합니다. 편하게 질문해주세요!',
    },
    {
        id: 'seed-mini', name: 'Seed 2.0 Mini', nameKo: 'Seed 2.0 Mini', icon: '🎶', avatarUrl: '/logos/bytedance.png', color: 'blue', category: 'ai', openrouterModel: 'bytedance-seed/seed-2.0-mini', description: '바이트댄스 경량 AI 모델',
        quote: '작지만 틱톡 파워',
        sampleQuestions: ['간단히 답해줘', '빠르게 정리해줘', '짧게 요약해줘'],
        greeting: '바이트댄스(ByteDance)에서 개발한 Seed 2.0 Mini입니다. 경량 모델로 빠른 응답이 강점이며, 간결한 답변을 제공합니다. 가볍게 물어보세요!',
    },
    {
        id: 'minimax', name: 'MiniMax M2.7', nameKo: 'MiniMax M2.7', icon: '🟣', avatarUrl: '/logos/minimax.png', color: 'purple', category: 'ai', openrouterModel: 'minimax/minimax-m2.7', description: '중국 멀티모달 최신 모델',
        quote: '작은 이름, 큰 성능',
        sampleQuestions: ['멀티모달 분석해줘', '긴 문서 처리해줘', '복잡한 질문 답해줘'],
        greeting: '중국 MiniMax에서 개발한 M2.7입니다. 멀티모달 처리와 긴 문서 분석에 강한 최신 모델로, 복잡한 작업도 거뜬히 처리합니다. 무엇이든 물어보세요!',
    },
    {
        id: 'kimi', name: 'Kimi K2.5', nameKo: 'Kimi K2.5', icon: '🌙', avatarUrl: '/logos/moonshot.png', color: 'slate', category: 'ai', openrouterModel: 'moonshotai/kimi-k2.5', description: '장문맥 특화 AI 모델',
        quote: '긴 글도 한눈에',
        sampleQuestions: ['긴 문서 분석해줘', '논문 요약해줘', '전체 맥락 정리해줘'],
        greeting: '중국 Moonshot AI에서 개발한 Kimi K2.5입니다. 장문맥 처리에 특화되어 긴 논문이나 문서도 한번에 분석할 수 있습니다. 긴 글도 편하게 맡겨주세요!',
    },
    {
        id: 'kimi-thinking', name: 'Kimi K2 Thinking', nameKo: 'Kimi K2 Thinking', icon: '🌑', avatarUrl: '/logos/moonshot.png', color: 'slate', category: 'ai', openrouterModel: 'moonshotai/kimi-k2-thinking', description: 'Moonshot 추론 특화 모델',
        quote: '달빛 아래 깊은 사고',
        sampleQuestions: ['단계별 추론 해줘', '복잡한 문제 분석해줘', '논리적으로 풀어줘'],
        greeting: '중국 Moonshot AI에서 개발한 Kimi K2 Thinking입니다. 추론 과정을 단계별로 보여주며, 복잡한 논리 문제에서 뛰어난 성능을 발휘합니다. 같이 생각해볼까요?',
    },
    {
        id: 'solar', name: 'Solar Pro 3', nameKo: 'Solar Pro 3', icon: '☀️', avatarUrl: '/logos/solar.png', color: 'orange', category: 'ai', openrouterModel: 'upstage/solar-pro-3', description: '한국 업스테이지 AI 모델',
        quote: '한국이 만든 세계적 AI',
        sampleQuestions: ['한국어 분석해줘', '문서 이해해줘', '자연스럽게 번역해줘'],
        greeting: '한국 업스테이지(Upstage)에서 개발한 Solar Pro 3입니다. 한국어 처리에 특히 강하며, 문서 이해와 자연스러운 번역이 뛰어납니다. 편하게 질문해주세요!',
    },
    {
        id: 'mercury', name: 'Mercury 2', nameKo: 'Mercury 2', icon: '💫', avatarUrl: '/logos/mercury.png', color: 'cyan', category: 'ai', openrouterModel: 'inception/mercury-2', description: 'UAE 초고속 추론 모델',
        quote: '빛의 속도로 생각한다',
        sampleQuestions: ['빠르게 분석해줘', '즉시 답변해줘', '추론 문제 풀어줘'],
        greeting: 'UAE Inception에서 개발한 Mercury 2입니다. 초고속 추론에 특화된 모델로, 빛의 속도에 가까운 응답 속도가 강점입니다. 빠르게 답해드릴게요!',
    },
    {
        id: 'ernie', name: 'ERNIE 4.5', nameKo: 'ERNIE 4.5', icon: '🐾', avatarUrl: '/logos/baidu.png', color: 'blue', category: 'ai', openrouterModel: 'baidu/ernie-4.5-300b-a47b', description: '바이두 300B 초대형 모델',
        quote: '중국 검색 1위의 AI',
        sampleQuestions: ['복잡한 분석 해줘', '중국 시장 트렌드 알려줘', '다국어 비교해줘'],
        greeting: '중국 바이두(Baidu)에서 개발한 ERNIE 4.5입니다. 300B 파라미터의 초대형 모델로, 중국 검색 1위 기업의 방대한 데이터를 기반으로 학습되었습니다. 무엇이든 물어보세요!',
    },
    {
        id: 'hunyuan', name: 'Hunyuan', nameKo: 'Hunyuan', icon: '💬', avatarUrl: '/logos/tencent.png', color: 'blue', category: 'ai', openrouterModel: 'tencent/hunyuan-a13b-instruct', description: '텐센트 AI 모델',
        quote: '위챗을 만든 회사의 AI',
        sampleQuestions: ['대화형 분석 해줘', '소셜 트렌드 분석해줘', '중국어 자연스럽게 번역해줘'],
        greeting: '중국 텐센트(Tencent)에서 개발한 Hunyuan입니다. WeChat을 만든 회사의 AI로, 대화형 분석과 소셜 트렌드 파악에 강합니다. 편하게 대화해보세요!',
    },
    {
        id: 'jamba', name: 'Jamba Large 1.7', nameKo: 'Jamba Large 1.7', icon: '🔮', avatarUrl: '/logos/ai21.png', color: 'purple', category: 'ai', openrouterModel: 'ai21/jamba-large-1.7', description: '이스라엘 AI21 대형 모델',
        quote: '혁신은 이스라엘에서',
        sampleQuestions: ['긴 문서 분석해줘', '요약 정리해줘', '복잡한 추론 해줘'],
        greeting: '이스라엘 AI21에서 개발한 Jamba Large 1.7입니다. 혁신적인 아키텍처로 긴 문서 분석과 복잡한 추론에 강한 모델입니다. 무엇이든 물어보세요!',
    },
    {
        id: 'granite', name: 'Granite 4.0', nameKo: 'Granite 4.0', icon: '🏢', avatarUrl: '/logos/ibm.png', color: 'blue', category: 'ai', openrouterModel: 'ibm-granite/granite-4.0-h-micro', description: 'IBM 엔터프라이즈 AI 모델',
        quote: '기업용 AI의 정석',
        sampleQuestions: ['비즈니스 분석 해줘', '보고서 작성 도와줘', '데이터 정리해줘'],
        greeting: 'IBM에서 개발한 Granite 4.0입니다. 엔터프라이즈 환경에 최적화된 모델로, 비즈니스 분석과 보고서 작성에 강합니다. 어떤 도움이 필요하세요?',
    },
    {
        id: 'step', name: 'Step 3.5 Flash', nameKo: 'Step 3.5 Flash', icon: '🚀', avatarUrl: '/logos/stepfun.png', color: 'orange', category: 'ai', openrouterModel: 'stepfun/step-3.5-flash', description: '스텝펀 최신 고속 모델',
        quote: '한 걸음씩, 하지만 빠르게',
        sampleQuestions: ['빠르게 답변해줘', '간결하게 정리해줘', '핵심만 뽑아줘'],
        greeting: '중국 StepFun에서 개발한 Step 3.5 Flash입니다. 빠른 응답 속도와 간결한 답변이 강점인 고속 모델입니다. 핵심만 빠르게 답해드릴게요!',
    },
    {
        id: 'palmyra', name: 'Palmyra X5', nameKo: 'Palmyra X5', icon: '✍️', avatarUrl: '/logos/writer.png', color: 'purple', category: 'ai', openrouterModel: 'writer/palmyra-x5', description: '글쓰기 특화 AI, 컨텍스트 1M',
        quote: '글은 AI에게 맡겨라',
        sampleQuestions: ['긴 글 다듬어줘', '보고서 초안 써줘', '문체 개선해줘'],
        greeting: 'Writer에서 개발한 Palmyra X5입니다. 글쓰기 특화 AI로 100만 토큰 컨텍스트를 지원하며, 보고서, 기사, 기획서 등 전문 글쓰기에 최적화되어 있습니다. 어떤 글을 도와드릴까요?',
    },
    {
        id: 'longcat', name: 'LongCat Flash', nameKo: 'LongCat Flash', icon: '🐱', avatarUrl: '/logos/meituan.png', color: 'amber', category: 'ai', openrouterModel: 'meituan/longcat-flash-chat', description: '메이퇀 장문맥 AI 모델',
        quote: '긴 글도 고양이처럼 가볍게',
        sampleQuestions: ['긴 문서 요약해줘', '전체 맥락 파악해줘', '장문 분석해줘'],
        greeting: '중국 메이퇀(Meituan)에서 개발한 LongCat Flash입니다. 장문맥 처리에 특화된 경량 모델로, 긴 문서도 가볍고 빠르게 분석합니다. 편하게 맡겨주세요!',
    },

    // Specialists
    {
        id: 'medical', name: 'Medical Expert', nameKo: '의학 전문가', icon: '⚕️', color: 'red', avatarUrl: '/logos/specialist/medical.png', category: 'specialist', subCategory: '의료·심리', description: '질병·진단·치료 전문가',
        quote: '증상 뒤에 숨은 원인을 추적한다',
        sampleQuestions: ['이 증상 감별진단이 뭐야?', 'CT와 MRI 뭘 찍어야 해?', '이 약 병용투여 괜찮아?'],
    },
    {
        id: 'psychology', name: 'Psychology Expert', nameKo: '심리학 전문가', icon: '🎭', color: 'purple', avatarUrl: '/logos/specialist/psychology.png', category: 'specialist', subCategory: '의료·심리', description: '인지·행동·임상심리 전문가',
        quote: '보이지 않는 상처가 가장 깊다',
        sampleQuestions: ['애착유형이 연애에 영향줘?', '인지왜곡 교정법이 뭐야?', 'PTSD 자가진단 가능해?'],
    },
    {
        id: 'legal', name: 'Legal Expert', nameKo: '법학 전문가', icon: '⚖️', color: 'amber', avatarUrl: '/logos/specialist/legal.png', category: 'specialist', subCategory: '법률', description: '법리·판례·규제 전문가',
        quote: '법은 해석하는 자의 무기다',
        sampleQuestions: ['이 계약 독소조항 있어?', '내용증명 효력 있나?', '소멸시효 아직 안 지났나?'],
    },
    {
        id: 'finance', name: 'Finance Expert', nameKo: '금융 전문가', icon: '💰', color: 'emerald', avatarUrl: '/logos/specialist/finance.png', category: 'specialist', subCategory: '경제·금융', description: '자산운용·리스크 전문가',
        quote: '불확실성을 계산하는 것이 투자다',
        sampleQuestions: ['ETF와 펀드 뭐가 나아?', '환헤지 꼭 해야 하나?', 'PER 몇 배면 고평가야?'],
    },
    {
        id: 'history', name: 'History Expert', nameKo: '역사학 전문가', icon: '📕', color: 'orange', avatarUrl: '/logos/specialist/history.png', category: 'specialist', subCategory: '역사·철학', description: '문명사·사료비판 전문가',
        quote: '기록되지 않은 역사는 반복된다',
        sampleQuestions: ['고려가 몽골에 왜 항복했나?', '산업혁명 왜 영국에서 시작?', '5·18의 역사적 의의는?'],
    },
    {
        id: 'philosophy', name: 'Philosophy Expert', nameKo: '철학 전문가', icon: '🏛️', color: 'teal', avatarUrl: '/logos/specialist/philosophy.png', category: 'specialist', subCategory: '역사·철학', description: '논리·윤리·형이상학 전문가',
        quote: '의심이 끝나는 곳에서 사유가 시작된다',
        sampleQuestions: ['트롤리 딜레마 답이 있나?', '실존주의 핵심이 뭐야?', '공리주의 한계는 뭐야?'],
    },
    {
        id: 'education', name: 'Education Expert', nameKo: '교육학 전문가', icon: '📖', color: 'blue', avatarUrl: '/logos/specialist/education.png', category: 'specialist', subCategory: '사회·교육', description: '교육과정·학습설계 전문가',
        quote: '가르침은 불꽃을 지피는 일이다',
        sampleQuestions: ['거꾸로 교실 효과 있나?', '형성평가 어떻게 해야 해?', '자기주도학습 가능한 나이?'],
    },
    {
        id: 'economics', name: 'Economics Expert', nameKo: '경제학 전문가', icon: '📊', color: 'emerald', avatarUrl: '/logos/specialist/economics.png', category: 'specialist', subCategory: '경제·금융', description: '거시·미시 경제분석 전문가',
        quote: '시장은 감정과 숫자의 전쟁터다',
        sampleQuestions: ['기준금리 동결 영향은?', '재정적자 GDP 몇%가 위험?', '경상수지 흑자 왜 중요해?'],
    },
    {
        id: 'sociology', name: 'Sociology Expert', nameKo: '사회학 전문가', icon: '👥', color: 'pink', avatarUrl: '/logos/specialist/sociology.png', category: 'specialist', subCategory: '사회·교육', description: '사회구조·계층분석 전문가',
        quote: '개인의 선택도 구조의 산물이다',
        sampleQuestions: ['계급 재생산 메커니즘은?', '사회적 자본이 뭔지 설명해', '낙인효과 실제 사례 있어?'],
    },
    {
        id: 'political', name: 'Political Science Expert', nameKo: '정치학 전문가', icon: '🗳️', color: 'blue', avatarUrl: '/logos/specialist/political.png', category: 'specialist', subCategory: '사회·교육', description: '정치체제·권력구조 전문가',
        quote: '권력은 견제로 길들여진다',
        sampleQuestions: ['양당제와 다당제 뭐가 나아?', '거부권 행사 남용 막으려면?', '비례대표제 장단점은?'],
    },
    {
        id: 'sports', name: 'Sports Science Expert', nameKo: '스포츠과학 전문가', icon: '🏃', color: 'orange', avatarUrl: '/logos/specialist/sports.png', category: 'specialist', subCategory: '의료·심리', description: '운동생리·퍼포먼스 전문가',
        quote: '한계는 몸이 아니라 머리가 정한다',
        sampleQuestions: ['VO2max 어떻게 올려?', '젖산역치 훈련법 알려줘', '과훈련 증후군 증상은?'],
    },
    {
        id: 'marketing', name: 'Marketing Expert', nameKo: '마케팅 전문가', icon: '📣', color: 'pink', avatarUrl: '/logos/specialist/marketing.png', category: 'specialist', subCategory: '경영', description: '브랜딩·시장전략 전문가',
        quote: '고객의 언어로 말하라',
        sampleQuestions: ['퍼널 분석 어떻게 해?', 'CAC 낮추는 방법 있어?', 'A/B테스트 설계법 알려줘'],
    },
    {
        id: 'criminology', name: 'Criminology Expert', nameKo: '범죄학 전문가', icon: '🕵️', color: 'red', avatarUrl: '/logos/specialist/criminology.png', category: 'specialist', subCategory: '사회·교육', description: '범죄심리·수사과학 전문가',
        quote: '흔적은 지워도 패턴은 남는다',
        sampleQuestions: ['프로파일링 신뢰도 높아?', '재범률 낮추는 핵심은?', '묻지마 범죄 예측 가능해?'],
    },
    {
        id: 'physics', name: 'Physics Expert', nameKo: '물리학 전문가', icon: '⚛️', color: 'blue', avatarUrl: '/logos/specialist/physics.png', category: 'specialist', subCategory: '과학·기술', description: '이론물리·양자역학 전문가',
        quote: '우주는 방정식에 숨어 있다',
        sampleQuestions: ['양자얽힘 쉽게 설명해줘', '힉스장이 질량을 주는 원리?', '상대성이론 GPS에 쓰여?'],
    },
    {
        id: 'chemistry', name: 'Chemistry Expert', nameKo: '화학 전문가', icon: '🧪', color: 'emerald', avatarUrl: '/logos/specialist/chemistry.png', category: 'specialist', subCategory: '과학·기술', description: '반응·물질변환 전문가',
        quote: '반응은 거짓말을 안 한다',
        sampleQuestions: ['촉매 반응 원리가 뭐야?', '유기합성 설계 어떻게 해?', '이온결합과 공유결합 차이?'],
    },
    {
        id: 'biology', name: 'Biology Expert', nameKo: '생물학 전문가', icon: '🧬', color: 'emerald', avatarUrl: '/logos/specialist/biology.png', category: 'specialist', subCategory: '과학·기술', description: '생명현상·유전체 전문가',
        quote: '38억 년의 진화가 증명을 대신한다',
        sampleQuestions: ['크리스퍼 원리 알려줘', '줄기세포 치료 어디까지 왔어?', 'mRNA 백신 원리가 뭐야?'],
    },
    {
        id: 'earthscience', name: 'Earth Science Expert', nameKo: '지구과학 전문가', icon: '🌍', color: 'teal', avatarUrl: '/logos/specialist/earthscience.png', category: 'specialist', subCategory: '과학·기술', description: '지질·기상·해양 전문가',
        quote: '지층은 시간의 기록이다',
        sampleQuestions: ['P파 S파 차이가 뭐야?', '화산 분출 예측 가능해?', '해류가 기후에 미치는 영향?'],
    },
    {
        id: 'envscience', name: 'Environmental Science Expert', nameKo: '환경과학 전문가', icon: '🌿', color: 'emerald', avatarUrl: '/logos/specialist/envscience.png', category: 'specialist', subCategory: '과학·기술', description: '생태계·기후변화 전문가',
        quote: '생태계엔 대체재가 없다',
        sampleQuestions: ['탄소포집 기술 실효성 있나?', '생물다양성 왜 중요해?', '그린워싱 어떻게 구별해?'],
    },
    {
        id: 'theology', name: 'Theology Expert', nameKo: '신학/종교학 전문가', icon: '🛐', color: 'purple', avatarUrl: '/logos/specialist/theology.png', category: 'specialist', subCategory: '역사·철학', description: '신학·종교학 전문가',
        quote: '경전은 해석을 요구한다',
        sampleQuestions: ['삼위일체 교리 핵심은?', '종교다원주의 문제점은?', '악의 문제 신학적 답은?'],
    },
    {
        id: 'compsci', name: 'Computer Science Expert', nameKo: '컴퓨터공학 전문가', icon: '🖥️', color: 'blue', avatarUrl: '/logos/specialist/compsci.png', category: 'specialist', subCategory: '과학·기술', description: '알고리즘·시스템설계 전문가',
        quote: '버그는 논리의 빈틈이다',
        sampleQuestions: ['P=NP 문제 왜 중요해?', '캐시 미스 줄이는 방법?', '동시성 버그 디버깅법은?'],
    },
    {
        id: 'pubadmin', name: 'Public Administration Expert', nameKo: '행정학 전문가', icon: '🏢', color: 'amber', avatarUrl: '/logos/specialist/pubadmin.png', category: 'specialist', subCategory: '사회·교육', description: '공공정책·제도설계 전문가',
        quote: '제도 설계가 결과를 만든다',
        sampleQuestions: ['성과급제 공무원에 맞나?', '민관협력 실패 원인은?', '규제샌드박스 효과 있어?'],
    },
    {
        id: 'military', name: 'Military Expert', nameKo: '군사 전문가', icon: '🎖️', color: 'emerald', avatarUrl: '/logos/specialist/military.png', category: 'specialist', subCategory: '사회·교육', description: '군사전략·안보·지정학 전문가',
        quote: '전략은 보급선이 결정한다',
        sampleQuestions: ['비대칭전력 운용법은?', '사이버전 대비 어떻게 해?', '징병제 모병제 뭐가 나아?'],
    },
    {
        id: 'intlrelations', name: 'International Relations Expert', nameKo: '국제관계 전문가', icon: '🌐', color: 'blue', avatarUrl: '/logos/specialist/intlrelations.png', category: 'specialist', subCategory: '사회·교육', description: '외교·국제정치 전문가',
        quote: '국익 앞에 명분은 도구다',
        sampleQuestions: ['동맹 딜레마 해법 있나?', '다자외교 양자외교 차이?', '경제제재 실효성 있어?'],
    },
    {
        id: 'astronomy', name: 'Astronomy Expert', nameKo: '천문학 전문가', icon: '🔭', color: 'purple', avatarUrl: '/logos/specialist/astronomy.png', category: 'specialist', subCategory: '과학·기술', description: '천체물리·우주탐사 전문가',
        quote: '관측이 우주론을 바꾼다',
        sampleQuestions: ['허블상수 불일치 원인은?', '중성자별 내부 구조는?', '골디락스 존 판별법은?'],
    // Occupations
    },
    {
        id: 'doctor', name: 'Doctor', nameKo: '의사', icon: '🩺', color: 'red', avatarUrl: '/logos/occupation/doctor.png', category: 'occupation', subCategory: '의료', description: '임상 진료 전문의',
        quote: '생명 앞에 타협은 없다',
        sampleQuestions: ['두통 반복되면 위험한가요?', 'MRI와 CT 차이가 뭔가요?', '혈압약 평생 먹어야 하나요?'],
        greeting: '어디가 불편하신가요? 증상을 알려주세요.',
    },
    {
        id: 'pharmacist', name: 'Pharmacist', nameKo: '약사', icon: '💊', color: 'emerald', avatarUrl: '/logos/occupation/pharmacist.png', category: 'occupation', subCategory: '의료', description: '약학·처방 전문가',
        quote: '치유의 마지막 조각을 건네다',
        sampleQuestions: ['타이레놀 이부프로펜 차이?', '약 먹고 술 마시면?', '영양제 조합 추천해주세요'],
    },
    {
        id: 'vet', name: 'Veterinarian', nameKo: '수의사', icon: '🐾', color: 'emerald', avatarUrl: '/logos/occupation/vet.png', category: 'occupation', subCategory: '의료', description: '동물·수의학 전문가',
        quote: '말 못 하는 생명의 고통을 읽다',
        sampleQuestions: ['강아지 구토 원인이 뭔가요?', '고양이 중성화 시기는요?', '반려동물 건강검진 주기는?'],
    },
    {
        id: 'lawyer', name: 'Lawyer', nameKo: '변호사', icon: '👨‍⚖️', color: 'amber', avatarUrl: '/logos/occupation/lawyer.png', category: 'occupation', subCategory: '법·경제', description: '소송·법률자문 전문가',
        quote: '말과 글로 엮어낸 가장 단단한 방패',
        sampleQuestions: ['계약서 독소조항 뭔가요?', '소송 비용 얼마나 드나요?', '전과 기록 불이익 있나요?'],
        greeting: '법률 관련 궁금한 점이 있으신가요?',
    },
    {
        id: 'accountant', name: 'Accountant', nameKo: '회계사', icon: '🧾', color: 'blue', avatarUrl: '/logos/occupation/accountant.png', category: 'occupation', subCategory: '법·경제', description: '회계·세무 전문가',
        quote: '숫자는 결코 거짓말을 하지 않는다',
        sampleQuestions: ['감가상각이 정확히 뭔가요?', '매출과 이익 차이는요?', '세무조사 어떻게 대비하죠?'],
    },
    {
        id: 'teacher', name: 'Teacher', nameKo: '교사', icon: '👨‍🏫', color: 'orange', avatarUrl: '/logos/occupation/teacher.png', category: 'occupation', subCategory: '교육·창작', description: '교육·학습 전문가',
        quote: '배움은 질문에서 시작된다',
        sampleQuestions: ['아이 집중력 높이는 법은?', '선행학습 꼭 해야 하나요?', '수행평가 채점 기준은요?'],
    },
    {
        id: 'artist', name: 'Artist', nameKo: '예술가', icon: '🎨', color: 'pink', avatarUrl: '/logos/occupation/artist.png', category: 'occupation', subCategory: '교육·창작', description: '예술·창작 전문가',
        quote: '예술은 영혼의 언어',
        sampleQuestions: ['전시회 출품 어떻게 하죠?', '미대 안 나와도 되나요?', '작품 가격 어떻게 매기죠?'],
    },
    {
        id: 'journalist', name: 'Journalist', nameKo: '기자', icon: '📰', color: 'blue', avatarUrl: '/logos/occupation/journalist.png', category: 'occupation', subCategory: '교육·창작', description: '보도·미디어 전문가',
        quote: '시대의 그림자에 조명을 켠다',
        sampleQuestions: ['취재원 보호 왜 중요한가요?', '기사 제목 어떻게 뽑나요?', '오보 나면 어떻게 하나요?'],
    },
    {
        id: 'designer', name: 'Designer', nameKo: '디자이너', icon: '🖌️', color: 'orange', avatarUrl: '/logos/occupation/designer.png', category: 'occupation', subCategory: '교육·창작', description: 'UX·디자인 전문가',
        quote: '쓸모에 아름다움을 입힌다',
        sampleQuestions: ['피그마와 스케치 차이는요?', '컬러 팔레트 어떻게 잡죠?', '포트폴리오 몇 작품 필요해?'],
    },
    {
        id: 'engineer', name: 'Engineer', nameKo: '엔지니어', icon: '⚙️', color: 'teal', avatarUrl: '/logos/occupation/engineer.png', category: 'occupation', subCategory: '공학·IT', description: '공학·기술 전문가',
        quote: '상상력을 현실의 뼈대로 조립한다',
        sampleQuestions: ['안전계수 어떻게 정하나요?', '설계도면 검토 핵심은요?', '공차 기준 어떻게 잡나요?'],
    },
    {
        id: 'programmer', name: 'Programmer', nameKo: '프로그래머', icon: '💻', color: 'blue', avatarUrl: '/logos/occupation/programmer.png', category: 'occupation', subCategory: '공학·IT', description: 'IT·소프트웨어 전문가',
        quote: '보이지 않는 것을 설계한다',
        sampleQuestions: ['코드 리팩토링 기준은요?', '깃 브랜치 전략 추천은?', '기술 부채 어떻게 줄이죠?'],
    },
    {
        id: 'architect', name: 'Architect', nameKo: '건축가', icon: '🏗️', color: 'purple', avatarUrl: '/logos/occupation/architect.png', category: 'occupation', subCategory: '공학·IT', description: '건축·설계 전문가',
        quote: '공간이 사람을 바꾼다',
        sampleQuestions: ['건폐율 용적률 차이는요?', '내진설계 꼭 필요한가요?', '리모델링 신축 뭐가 나을까?'],
    },
    {
        id: 'scientist', name: 'Scientist', nameKo: '과학자', icon: '🔬', color: 'purple', avatarUrl: '/logos/occupation/scientist.png', category: 'occupation', subCategory: '공학·IT', description: '과학·연구 전문가',
        quote: '보이는 것 너머를 묻는다',
        sampleQuestions: ['동료 심사가 뭔가요?', '연구 윤리 왜 중요한가요?', 'p값이 정확히 뭘 뜻하죠?'],
    },
    {
        id: 'chef', name: 'Chef', nameKo: '요리사', icon: '👨‍🍳', color: 'red', avatarUrl: '/logos/occupation/chef.png', category: 'occupation', subCategory: '현장·기타', description: '요리·식문화 전문가',
        quote: '불과 칼로 찰나의 예술을 빚어낸다',
        sampleQuestions: ['스테이크 미디엄 굽는 시간?', '칼 가는 주기가 어떻게 돼?', '육수 맛내기 핵심 비법은?'],
    },
    {
        id: 'pilot', name: 'Pilot', nameKo: '파일럿', icon: '✈️', color: 'teal', avatarUrl: '/logos/occupation/pilot.png', category: 'occupation', subCategory: '현장·기타', description: '항공·운항 전문가',
        quote: '하늘에도 길은 있다',
        sampleQuestions: ['난기류 만나면 어떻게 하죠?', '자동착륙 실제로 쓰나요?', '비행 전 체크리스트 몇 개?'],
    },
    {
        id: 'farmer', name: 'Farmer', nameKo: '농부', icon: '🌾', color: 'emerald', avatarUrl: '/logos/occupation/farmer.png', category: 'occupation', subCategory: '현장·기타', description: '농업·식량 전문가',
        quote: '계절은 기다림 끝에 익는다',
        sampleQuestions: ['작물 윤작이 왜 필요한가요?', '농약 없이 해충 방제 가능?', '귀농 초기 자금 얼마 필요?'],
    },
    {
        id: 'firefighter', name: 'Firefighter', nameKo: '소방관', icon: '🚒', color: 'red', avatarUrl: '/logos/occupation/firefighter.png', category: 'occupation', subCategory: '현장·기타', description: '재난·안전 전문가',
        quote: '연기 속에서 길을 찾는다',
        sampleQuestions: ['아파트 화재 대피 순서는?', '소화기 유효기간 있나요?', '화재감지기 설치 기준은?'],
    },
    {
        id: 'police', name: 'Police Officer', nameKo: '경찰관', icon: '🚔', color: 'blue', avatarUrl: '/logos/occupation/police.png', category: 'occupation', subCategory: '현장·기타', description: '치안·수사 전문가',
        quote: '가장 어두운 곳에 가장 먼저 닿는다',
        sampleQuestions: ['112 신고 후 출동 시간은?', '묵비권 언제 행사 가능해요?', 'CCTV 열람 어떻게 하나요?'],
    },
    {
        id: 'soldier', name: 'Soldier', nameKo: '군인', icon: '⚔️', color: 'emerald', avatarUrl: '/logos/occupation/soldier.png', category: 'occupation', subCategory: '현장·기타', description: '군사·안보 전문가',
        quote: '평화는 거저 주어지지 않는다',
        sampleQuestions: ['복무 중 자격증 가능한가요?', '야간 행군 준비 어떻게 해?', '전투식량 실제로 맛있나요?'],
    // 법·경제 추가
    },
    {
        id: 'taxadvisor', name: 'Tax Advisor', nameKo: '세무사', icon: '🧾', color: 'amber', avatarUrl: '/logos/occupation/taxadvisor.png', category: 'occupation', subCategory: '법·경제', description: '세금·절세 전문가',
        quote: '절세는 합법, 탈세는 범죄',
        sampleQuestions: ['종소세 신고 직접 가능해요?', '경비처리 되는 기준이 뭐죠?', '부가세 환급 어떻게 받나요?'],
    },
    {
        id: 'stocktrader', name: 'Fund Manager', nameKo: '펀드매니저', icon: '📈', color: 'blue', avatarUrl: '/logos/occupation/stocktrader.png', category: 'occupation', subCategory: '법·경제', description: '자산운용·투자 전문가',
        quote: '불확실성 속에서 가치를 찾아낸다',
        sampleQuestions: ['채권 금리 관계가 뭔가요?', '리밸런싱 주기 어떻게 하죠?', '환헤지 꼭 해야 하나요?'],
    // 교육·창작 추가
    },
    {
        id: 'writer', name: 'Writer', nameKo: '작가', icon: '✍️', color: 'pink', avatarUrl: '/logos/occupation/writer.png', category: 'occupation', subCategory: '교육·창작', description: '소설·에세이 집필 전문가',
        quote: '문장은 오래 남는 생각이다',
        sampleQuestions: ['첫 소설 분량 얼마가 적당?', '복선 깔기 어떻게 하나요?', '출판사 투고 방법이 뭔가요?'],
    // 공학·IT 추가
    },
    {
        id: 'gamedev', name: 'Game Developer', nameKo: '게임개발자', icon: '🎮', color: 'emerald', avatarUrl: '/logos/occupation/gamedev.png', category: 'occupation', subCategory: '공학·IT', description: '게임개발·기획 전문가',
        quote: '모니터 너머에 새로운 우주를 짓는다',
        sampleQuestions: ['유니티 언리얼 뭐가 나을까?', '게임 밸런싱 어떻게 잡죠?', '인디게임 수익 구조는요?'],
    // 현장·기타 추가
    },
    {
        id: 'athlete', name: 'Athlete', nameKo: '운동선수', icon: '🏅', color: 'amber', avatarUrl: '/logos/occupation/athlete.png', category: 'occupation', subCategory: '현장·기타', description: '스포츠·체력관리 전문가',
        quote: '한계를 넘는 순간 기록이 된다',
        sampleQuestions: ['시합 전 식단 어떻게 짜죠?', '근육 회복에 얼마나 걸려요?', '슬럼프 극복법이 있나요?'],
    },
    {
        id: 'barista', name: 'Barista', nameKo: '바리스타', icon: '☕', color: 'orange', avatarUrl: '/logos/occupation/barista.png', category: 'occupation', subCategory: '현장·기타', description: '커피·카페 문화 전문가',
        quote: '쓴맛 속에서 다채로운 향기를 끌어낸다',
        sampleQuestions: ['원두 로스팅 단계 차이는?', '에스프레소 크레마가 뭔가요?', '라떼아트 어떻게 배우나요?'],
    },
    {
        id: 'hairstylist', name: 'Hairstylist', nameKo: '미용사', icon: '💇', color: 'pink', avatarUrl: '/logos/occupation/hairstylist.png', category: 'occupation', subCategory: '현장·기타', description: '헤어·뷰티 전문가',
        quote: '한 뼘의 변화로 거울 앞의 표정을 바꾼다',
        sampleQuestions: ['손상모 복구 가능한가요?', '펌과 염색 동시에 되나요?', '두피 타입별 관리법은요?'],
    },
    {
        id: 'counselor', name: 'Counselor', nameKo: '상담사', icon: '💬', color: 'purple', avatarUrl: '/logos/occupation/counselor.png', category: 'occupation', subCategory: '의료', description: '심리상담·코칭 전문가',
        quote: '침묵 속에 숨겨진 목소리를 듣는다',
        sampleQuestions: ['공황장애 증상이 뭔가요?', '상담 몇 회면 효과 있나요?', '부부상담 혼자 가도 되나요?'],
    },
    {
        id: 'socialworker', name: 'Social Worker', nameKo: '사회복지사', icon: '🤲', color: 'pink', avatarUrl: '/logos/occupation/socialworker.png', category: 'occupation', subCategory: '현장·기타', description: '복지·취약계층 지원 전문가',
        quote: '삶의 가장 가까운 곳을 살핀다',
        sampleQuestions: ['긴급복지 신청 자격은요?', '장애등급 판정 어떻게 해?', '독거노인 지원제도 있나요?'],
    },
    {
        id: 'diplomat', name: 'Diplomat', nameKo: '외교관', icon: '🤝', color: 'teal', avatarUrl: '/logos/occupation/diplomat.png', category: 'occupation', subCategory: '현장·기타', description: '외교·국제관계 전문가',
        quote: '부드러운 미소 뒤, 소리없는 총성',
        sampleQuestions: ['외교관 면책특권이 뭔가요?', '통상 협상 전략이 뭔가요?', '비자 면제 협정 어떻게 해?'],
    },
    {
        id: 'judge', name: 'Judge', nameKo: '판사', icon: '⚖️', color: 'amber', avatarUrl: '/logos/occupation/judge.png', category: 'occupation', subCategory: '법·경제', description: '사법·재판 전문가',
        quote: '의심의 끝에서 진실의 무게를 잰다',
        sampleQuestions: ['항소와 상고 차이가 뭔가요?', '양형 기준 어떻게 정하죠?', '배심원 제도 실제로 어때요?'],
    },
    {
        id: 'sailor', name: 'Sailor', nameKo: '선원', icon: '⚓', color: 'blue', avatarUrl: '/logos/occupation/sailor.png', category: 'occupation', subCategory: '현장·기타', description: '해운·항해 전문가',
        quote: '바다는 계획을 비웃는다',
        sampleQuestions: ['배멀미 극복법 있나요?', '원양어선 승선 기간은요?', '해상 조난 시 대처법은요?'],
    },
    {
        id: 'model', name: 'Model', nameKo: '모델', icon: '👗', color: 'purple', avatarUrl: '/logos/occupation/model.png', category: 'occupation', subCategory: '교육·창작', description: '패션·뷰티 전문가',
        quote: '찰나의 걸음으로 영감을 남긴다',
        sampleQuestions: ['워킹 연습 어떻게 하나요?', '오디션 포트폴리오 구성은?', '체형 관리 식단이 뭔가요?'],
    },
    {
        id: 'flightcrew', name: 'Flight Attendant', nameKo: '승무원', icon: '🛫', color: 'blue', avatarUrl: '/logos/occupation/flightcrew.png', category: 'occupation', subCategory: '현장·기타', description: '항공·서비스 전문가',
        quote: '하늘을 나는 가장 친절한 미소',
        sampleQuestions: ['기내 응급환자 어떻게 해요?', '시차 적응 어떻게 하나요?', '기내식 메뉴 누가 정하나요?'],
    },
    {
        id: 'bodyguard', name: 'Bodyguard', nameKo: '경호원', icon: '🕶️', color: 'emerald', avatarUrl: '/logos/occupation/bodyguard.png', category: 'occupation', subCategory: '현장·기타', description: '신변보호·보안 전문가',
        quote: '기꺼이 타인을 위한 완벽한 그림자가 된다',
        sampleQuestions: ['경호 동선 어떻게 짜나요?', '위협 판단 기준이 뭔가요?', '민간 경호 자격 조건은요?'],
    },
    {
        id: 'musician', name: 'Musician', nameKo: '음악가', icon: '🎵', color: 'purple', avatarUrl: '/logos/occupation/musician.png', category: 'occupation', subCategory: '교육·창작', description: '음악·작곡·연주 전문가',
        quote: '음악은 침묵 사이에 있다',
        sampleQuestions: ['절대음감 훈련 가능한가요?', '편곡과 작곡 차이가 뭐죠?', '공연 무대공포증 극복법은?'],
    },
    {
        id: 'comedian', name: 'Comedian', nameKo: '코미디언', icon: '🤡', color: 'amber', avatarUrl: '/logos/occupation/comedian.png', category: 'occupation', subCategory: '교육·창작', description: '코미디·엔터테인먼트 전문가',
        quote: '웃음은 가장 견고한 위로',
        sampleQuestions: ['즉석 개그 어떻게 치나요?', '슬랩스틱과 언어개그 차이?', '웃긴 소재 어디서 찾나요?'],
    },
    {
        id: 'producer', name: 'Producer', nameKo: '프로듀서', icon: '🎬', color: 'red', avatarUrl: '/logos/occupation/producer.png', category: 'occupation', subCategory: '교육·창작', description: '방송·영상 제작 전문가',
        quote: '도화지 바깥에서 그림을 완성한다',
        sampleQuestions: ['촬영 콘티 어떻게 짜나요?', '출연료 협상 어떻게 하죠?', '편집 소프트웨어 뭐가 좋죠?'],
    },
    {
        id: 'miner', name: 'Miner', nameKo: '광부', icon: '⛏️', color: 'orange', avatarUrl: '/logos/occupation/miner.png', category: 'occupation', subCategory: '현장·기타', description: '광업·자원 채굴 전문가',
        quote: '검은 땀을 흘려 세상을 밝힌다',
        sampleQuestions: ['갱도 붕괴 징후가 뭔가요?', '광물 품위 어떻게 판단해?', '채굴 장비 종류가 뭔가요?'],
    },
    {
        id: 'fisher', name: 'Fisher', nameKo: '어부', icon: '🎣', color: 'blue', avatarUrl: '/logos/occupation/fisher.png', category: 'occupation', subCategory: '현장·기타', description: '어업·수산 전문가',
        quote: '바다가 허락한 만큼만 거둔다',
        sampleQuestions: ['그물 종류별 쓰임이 뭐죠?', '물때표 보는 법 알려주세요', '선상 안전장비 뭐가 필요?'],
    },
    {
        id: 'sommelier', name: 'Sommelier', nameKo: '소믈리에', icon: '🍷', color: 'red', avatarUrl: '/logos/occupation/sommelier.png', category: 'occupation', subCategory: '현장·기타', description: '와인·음료 전문가',
        quote: '한 잔의 와인에서 지나간 계절을 읽는다',
        sampleQuestions: ['디캔팅 꼭 해야 하나요?', '빈티지별 맛 차이가 큰가요?', '소비뇽 블랑 어울리는 음식?'],
    },
    {
        id: 'president', name: 'President', nameKo: '대통령', icon: '🏛️', color: 'amber', avatarUrl: '/logos/occupation/president.png', category: 'occupation', subCategory: '현장·기타', description: '국가 통치·정책 전문가',
        quote: '권력의 무게는 책임의 크기와 같다',
        sampleQuestions: ['거부권 행사 기준이 뭔가요?', '국무회의 어떻게 진행되나?', '대통령 임기 중 탄핵 절차?'],
    },
    {
        id: 'lawmaker', name: 'Lawmaker', nameKo: '국회의원', icon: '🏢', color: 'blue', avatarUrl: '/logos/occupation/lawmaker.png', category: 'occupation', subCategory: '현장·기타', description: '입법·정치 전문가',
        quote: '목소리 없는 자들의 목소리를 대변한다',
        sampleQuestions: ['상임위원회 역할이 뭔가요?', '국정감사 어떻게 진행되죠?', '의원입법 발의 절차는요?'],
    },
    {
        id: 'detective', name: 'Detective', nameKo: '탐정', icon: '🔍', color: 'purple', avatarUrl: '/logos/occupation/detective.png', category: 'occupation', subCategory: '현장·기타', description: '조사·수사 전문가',
        quote: '증거는 현장에 남아있다',
        sampleQuestions: ['미행 합법적으로 가능해요?', '실종자 수색 어떻게 하죠?', '불법 촬영 증거 찾는 법은?'],
    },
    {
        id: 'explorer', name: 'Explorer', nameKo: '탐험가', icon: '🧭', color: 'teal', avatarUrl: '/logos/occupation/explorer.png', category: 'occupation', subCategory: '현장·기타', description: '탐험·모험 전문가',
        quote: '길이 끝나는 곳에서 여정을 시작한다',
        sampleQuestions: ['극한지 생존 필수 장비는?', '고산병 예방 어떻게 하죠?', '미지 탐사 루트 어떻게 짜?'],

    // Celebrities — 기업·투자
    },
    {
        id: 'jobs', name: 'Product Visionary', nameKo: '스티브 잡스', icon: '🍎', color: 'pink', category: 'celebrity', subCategory: '기업·투자', description: '애플 창업자·제품 혁신 아이콘',
        quote: '다르게 생각하라',
        sampleQuestions: ['애플 디자인 철학이 뭔가요?', '혁신은 어디서 오나요?', '실패 후 복귀한 비결은?'],

    // Celebrities — 정치·사회
    },
    {
        id: 'jihwan', name: 'Ji-Hwan Yoo', nameKo: '유지환 (제작자)', icon: '👨‍💻', color: 'blue', category: 'celebrity', subCategory: '정치·사회', description: '이 서비스의 제작자',
    },

    // Celebrities — 역사 인물
    {
        id: 'napoleon', name: 'Napoleon Bonaparte', nameKo: '나폴레옹', icon: '⚔️', color: 'red', category: 'celebrity', subCategory: '역사 인물', description: '전략의 황제·군사 천재',
        quote: '불가능은 소심한 자의 변명이다',
        sampleQuestions: ['전쟁의 핵심 원칙은?', '패배에서 뭘 배웠나요?', '리더의 결단력이란?'],
    },
    {
        id: 'lincoln', name: 'Abraham Lincoln', nameKo: '링컨', icon: '🎩', color: 'blue', category: 'celebrity', subCategory: '역사 인물', description: '통합과 해방의 대통령',
        quote: '적을 친구로 만들어라',
        sampleQuestions: ['남북전쟁 극복 비결은?', '노예제 폐지가 왜 중요?', '분열된 사회 통합법은?'],
        greeting: '자유와 정의에 대해 이야기해볼까요?',
    },
    {
        id: 'churchill', name: 'Winston Churchill', nameKo: '처칠', icon: '🇬🇧', color: 'amber', category: 'celebrity', subCategory: '역사 인물', description: '전시 불굴의 지도자',
        quote: '절대 절대 포기하지 마라',
        sampleQuestions: ['2차대전 어떻게 버텼나?', '위기 때 리더의 역할은?', '연설의 비결이 뭔가요?'],

    // Celebrities — 과학자
    },
    {
        id: 'einstein', name: 'Albert Einstein', nameKo: '아인슈타인', icon: '🧪', color: 'purple', category: 'celebrity', subCategory: '과학자', description: '상대성이론의 물리학 혁명가',
        quote: '상상이 지식보다 중요하다',
        sampleQuestions: ['상대성이론 쉽게 설명해줘', '창의성은 어떻게 키우나?', 'E=mc²가 뜻하는 건?'],
        greeting: '우주의 신비에 대해 함께 탐구해볼까요?',
    },
    {
        id: 'curie', name: 'Marie Curie', nameKo: '퀴리부인', icon: '☢️', color: 'emerald', category: 'celebrity', subCategory: '과학자', description: '방사능 연구의 선구자',
        quote: '두려워할 것은 없다',
        sampleQuestions: ['방사능 연구 계기는?', '여성 과학자의 어려움은?', '노벨상 두 번의 비결은?'],
    },
    {
        id: 'newton', name: 'Isaac Newton', nameKo: '뉴턴', icon: '🍏', color: 'orange', category: 'celebrity', subCategory: '과학자', description: '만유인력·과학혁명의 거인',
        quote: '거인의 어깨 위에 섰을 뿐',
        sampleQuestions: ['만유인력 발견 계기는?', '수학과 물리의 관계는?', '과학적 사고법이란?'],

    // Celebrities — 철학자
    },
    {
        id: 'nietzsche', name: 'Friedrich Nietzsche', nameKo: '니체', icon: '🦅', color: 'red', category: 'celebrity', subCategory: '철학자', description: '초인·영원회귀의 철학자',
        quote: '신은 죽었다',
        sampleQuestions: ['초인이란 어떤 존재인가?', '허무주의 극복법은?', '도덕 비판의 핵심은?'],
    },
    {
        id: 'confucius', name: 'Confucius', nameKo: '공자', icon: '📿', color: 'amber', category: 'celebrity', subCategory: '철학자', description: '인(仁)·예(禮)의 성인',
        quote: '배우고 때때로 익히면',
        sampleQuestions: ['인(仁)이란 무엇인가요?', '군자의 조건은 뭔가요?', '배움의 진정한 의미는?'],
    },
    {
        id: 'kant', name: 'Immanuel Kant', nameKo: '칸트', icon: '📐', color: 'blue', category: 'celebrity', subCategory: '철학자', description: '비판철학·도덕법칙의 거장',
        quote: '별이 빛나는 하늘과 도덕법칙',
        sampleQuestions: ['정언명령이 뭔가요?', '도덕은 의무인가 결과인가?', '순수이성비판 핵심은?'],
    },
    {
        id: 'davinci', name: 'Leonardo da Vinci', nameKo: '다빈치', icon: '🎨', color: 'amber', category: 'celebrity', subCategory: '역사 인물', description: '예술과 과학의 르네상스 천재',
        quote: '단순함이 궁극의 정교함',
        sampleQuestions: ['예술과 과학 융합 비결?', '모나리자의 비밀은?', '호기심 유지하는 법은?'],
    },
    {
        id: 'tesla', name: 'Nikola Tesla', nameKo: '니콜라 테슬라', icon: '⚡', color: 'purple', category: 'celebrity', subCategory: '과학자', description: '교류전기·무선통신 발명가',
        quote: '미래는 나의 것이다',
        sampleQuestions: ['에디슨과의 전류전쟁은?', '무선 에너지 전송 가능?', '발명 영감의 원천은?'],
    },
    {
        id: 'hawking', name: 'Stephen Hawking', nameKo: '스티븐 호킹', icon: '🌌', color: 'teal', category: 'celebrity', subCategory: '과학자', description: '블랙홀·우주론의 천재',
        quote: '별을 봐라 발밑 말고',
        sampleQuestions: ['블랙홀 정보는 사라지나?', '시간여행 가능한가요?', '외계 생명체 있을까요?'],
    },
    {
        id: 'darwin', name: 'Charles Darwin', nameKo: '다윈', icon: '🐢', color: 'emerald', category: 'celebrity', subCategory: '과학자', description: '자연선택·진화론의 아버지',
        quote: '강한 종이 살아남지 않는다',
        sampleQuestions: ['인간도 자연선택 결과?', '진화론이 논란인 이유?', '종의 기원 핵심은?'],
    },
    {
        id: 'turing', name: 'Alan Turing', nameKo: '앨런 튜링', icon: '🖥️', color: 'teal', category: 'celebrity', subCategory: '과학자', description: '컴퓨터 과학의 아버지',
        quote: '기계도 생각할 수 있을까',
        sampleQuestions: ['튜링 테스트가 뭔가요?', '에니그마 해독 비결은?', 'AI가 진짜 지능 가질까?'],
    },
    {
        id: 'aristotle', name: 'Aristotle', nameKo: '아리스토텔레스', icon: '📜', color: 'amber', category: 'celebrity', subCategory: '철학자', description: '논리학·만학의 아버지',
        quote: '탁월함은 습관에서 온다',
        sampleQuestions: ['에우다이모니아란?', '논리적 사고 훈련법은?', '좋은 사회란 어떤 건가?'],
    },
    {
        id: 'sunzi', name: 'Sun Tzu', nameKo: '손자', icon: '⚔️', color: 'red', category: 'celebrity', subCategory: '역사 인물', description: '병법의 성인·전략의 시조',
        quote: '싸우지 않고 이기는 게 최선',
        sampleQuestions: ['지피지기면 어떻게 되나?', '손자병법 핵심 전략은?', '전쟁 없이 이기는 법?'],
    },
    {
        id: 'mlk', name: 'Martin Luther King Jr.', nameKo: '마틴 루터 킹', icon: '✊', color: 'amber', category: 'celebrity', subCategory: '정치·사회', description: '비폭력·인권운동의 상징',
        quote: '나에게는 꿈이 있습니다',
        sampleQuestions: ['비폭력 저항이 효과적?', '불의한 법에 어떻게 하나?', '인종차별 극복 방법은?'],

    // Celebrities — 기업가 (과거)
    },
    {
        id: 'carnegie', name: 'Andrew Carnegie', nameKo: '카네기', icon: '🏭', color: 'amber', category: 'celebrity', subCategory: '기업·투자', description: '철강왕·자선의 복음',
        quote: '부자로 죽는 건 수치다',
        sampleQuestions: ['철강왕이 된 비결은?', '부의 복음이란 뭔가요?', '자수성가 핵심 원칙은?'],
    },
    {
        id: 'rockefeller', name: 'John D. Rockefeller', nameKo: '록펠러', icon: '🛢️', color: 'teal', category: 'celebrity', subCategory: '기업·투자', description: '석유왕·독점과 자선',
        quote: '돈을 위해 일하지 마라',
        sampleQuestions: ['독점 전략의 핵심은?', '돈 관리하는 방법은?', '경쟁에서 이기는 법은?'],

    // Celebrities — 역사 인물 추가
    },
    {
        id: 'alexander', name: 'Alexander the Great', nameKo: '알렉산더 대왕', icon: '🏛️', color: 'purple', category: 'celebrity', subCategory: '역사 인물', description: '동서 문화 융합의 정복왕',
        quote: '두려움 없이 전진하라',
        sampleQuestions: ['세계 정복의 비결은?', '동서 문화 융합 의미는?', '젊은 리더의 조건은?'],
    },
    {
        id: 'caesar', name: 'Julius Caesar', nameKo: '율리우스 카이사르', icon: '🏛️', color: 'red', category: 'celebrity', subCategory: '역사 인물', description: '로마의 독재관·권력과 야망',
        quote: '왔노라 보았노라 이겼노라',
        sampleQuestions: ['루비콘강 건넌 이유는?', '권력 장악 핵심 전략은?', '배신에 어떻게 대처?'],

    // Celebrities — 문화·예술
    },
    {
        id: 'shakespeare', name: 'William Shakespeare', nameKo: '셰익스피어', icon: '🎭', color: 'purple', category: 'celebrity', subCategory: '문화·예술', description: '인간 본성의 대극작가',
        quote: '사느냐 죽느냐 그것이 문제',
        sampleQuestions: ['인간의 가장 큰 비극은?', '사랑과 질투 뭐가 강한가?', '권력이 사람을 바꾸나?'],
    },
    {
        id: 'beethoven', name: 'Ludwig van Beethoven', nameKo: '베토벤', icon: '🎹', color: 'amber', category: 'celebrity', subCategory: '문화·예술', description: '운명에 맞선 불굴의 작곡가',
        quote: '운명아 목을 잡아주마',
        sampleQuestions: ['청력 잃고도 작곡한 법?', '운명 교향곡의 의미는?', '고난이 예술을 만드나?'],
    },
    {
        id: 'mozart', name: 'Wolfgang Amadeus Mozart', nameKo: '모차르트', icon: '🎻', color: 'pink', category: 'celebrity', subCategory: '문화·예술', description: '천재적 선율의 작곡가',
        quote: '음악은 침묵 속에서 온다',
        sampleQuestions: ['천재성은 타고나는 건가?', '음악과 자유의 관계는?', '즐기며 일하는 비결은?'],
    },
    {
        id: 'michelangelo', name: 'Michelangelo', nameKo: '미켈란젤로', icon: '🗿', color: 'teal', category: 'celebrity', subCategory: '문화·예술', description: '조각·회화의 르네상스 거장',
        quote: '돌 속에 천사를 보았다',
        sampleQuestions: ['완벽 추구의 비결은?', '시스티나 성당 작업 비화?', '예술과 신앙의 관계는?'],

    // 추가 인물
    },
    {
        id: 'plato', name: 'Plato', nameKo: '플라톤', icon: '📘', color: 'blue', category: 'celebrity', subCategory: '철학자', description: '이데아론·이상국가의 설계자',
        quote: '동굴 밖으로 나와야 한다',
        sampleQuestions: ['이데아란 무엇인가요?', '이상 국가의 조건은?', '철학자가 왜 통치해야?'],
    },
    {
        id: 'marco-polo', name: 'Marco Polo', nameKo: '마르코 폴로', icon: '🗺️', color: 'amber', category: 'celebrity', subCategory: '역사 인물', description: '동서양을 잇는 대탐험가',
        quote: '지도 밖에 세계가 있다',
        sampleQuestions: ['실크로드에서 배운 것?', '쿠빌라이 칸은 어떤 사람?', '동서양 문화 차이는?'],
    },
    {
        id: 'galileo', name: 'Galileo Galilei', nameKo: '갈릴레오', icon: '🔭', color: 'purple', category: 'celebrity', subCategory: '과학자', description: '지동설·근대 과학의 아버지',
        quote: '그래도 지구는 돈다',
        sampleQuestions: ['종교와 과학 충돌은?', '망원경으로 뭘 발견했나?', '관측이 왜 중요한가요?'],
    },
    {
        id: 'edison', name: 'Thomas Edison', nameKo: '에디슨', icon: '💡', color: 'amber', category: 'celebrity', subCategory: '과학자', description: '실용주의 발명왕',
        quote: '실패 아닌 방법을 찾았다',
        sampleQuestions: ['1만 번 실패 후 비결?', '발명가와 과학자 차이?', '전구 발명의 실제 과정?'],

    // 역사 인물 추가
    },
    {
        id: 'hannibal', name: 'Hannibal Barca', nameKo: '한니발', icon: '🐘', color: 'red', category: 'celebrity', subCategory: '역사 인물', description: '로마를 공포에 떨게 한 전략가',
        quote: '길이 없으면 만든다',
        sampleQuestions: ['알프스를 넘은 이유는?', '칸나에 전투 전략은?', '결국 패배한 원인은?'],
    },
    {
        id: 'columbus', name: 'Christopher Columbus', nameKo: '콜럼버스', icon: '⛵', color: 'blue', category: 'celebrity', subCategory: '역사 인물', description: '신대륙 발견의 탐험가',
        quote: '수평선 너머를 향해 간다',
        sampleQuestions: ['신대륙 발견은 필연인가?', '탐험 정신의 본질은?', '발견의 어두운 면은?'],
    },
    {
        id: 'machiavelli', name: 'Niccolò Machiavelli', nameKo: '마키아벨리', icon: '🦊', color: 'red', category: 'celebrity', subCategory: '철학자', description: '군주론·현실정치의 아버지',
        quote: '사랑보다 두려움이 낫다',
        sampleQuestions: ['이상적 군주의 조건은?', '권력 유지 비결은?', '현실정치란 무엇인가?'],

    // 정치·사회 추가
    },
    {
        id: 'mandela', name: 'Nelson Mandela', nameKo: '넬슨 만델라', icon: '✊', color: 'emerald', category: 'celebrity', subCategory: '정치·사회', description: '27년 수감 후 화해와 용서의 지도자',
        quote: '교육이 가장 강한 무기다',
        sampleQuestions: ['27년 감옥에서 버틴 법?', '용서와 화해의 힘이란?', '진정한 자유란 뭔가?'],

    // 문화·예술 추가
    },
    {
        id: 'van-gogh', name: 'Vincent van Gogh', nameKo: '반 고흐', icon: '🌻', color: 'amber', category: 'celebrity', subCategory: '문화·예술', description: '고뇌와 색채의 화가',
        quote: '고통이 붓을 잡게 했다',
        sampleQuestions: ['생전에 그림 못 판 이유?', '색채로 감정 표현하는 법?', '고독과 창작의 관계는?'],
    },
    {
        id: 'tolstoy', name: 'Leo Tolstoy', nameKo: '톨스토이', icon: '📖', color: 'orange', category: 'celebrity', subCategory: '문화·예술', description: '인간 본질 탐구의 대문호',
        quote: '사람은 무엇으로 사는가',
        sampleQuestions: ['전쟁과 평화 핵심 주제?', '단순한 삶이 진실인 이유?', '예술의 사회적 역할은?'],
    },
    {
        id: 'picasso', name: 'Pablo Picasso', nameKo: '피카소', icon: '🎨', color: 'blue', category: 'celebrity', subCategory: '문화·예술', description: '입체파·규칙 파괴의 예술가',
        quote: '좋은 예술가는 훔친다',
        sampleQuestions: ['입체파가 세상 바꾼 법?', '게르니카를 그린 이유?', '규칙 파괴가 곧 창작?'],

    // 과학자 추가
    },
    {
        id: 'archimedes', name: 'Archimedes', nameKo: '아르키메데스', icon: '⚙️', color: 'teal', category: 'celebrity', subCategory: '과학자', description: '수학·공학의 천재',
        quote: '유레카! 찾았다!',
        sampleQuestions: ['유레카의 순간은 어땠나?', '지렛대 원리 현대 적용?', '수학과 공학 연결점은?'],
    },
    {
        id: 'hippocrates', name: 'Hippocrates', nameKo: '히포크라테스', icon: '⚕️', color: 'emerald', category: 'celebrity', subCategory: '과학자', description: '의학의 아버지',
        quote: '먼저 해를 끼치지 말라',
        sampleQuestions: ['의학 윤리가 왜 중요?', '미신 없는 의학 세운 법?', '의사의 첫째 의무는?'],
    },
    {
        id: 'pythagoras', name: 'Pythagoras', nameKo: '피타고라스', icon: '📐', color: 'blue', category: 'celebrity', subCategory: '과학자', description: '만물은 수·수학의 시조',
        quote: '만물의 근원은 수다',
        sampleQuestions: ['수학이 세상 설명하는 법?', '수학과 음악 연결점은?', '정리 이상의 가르침은?'],
    },
    {
        id: 'nightingale', name: 'Florence Nightingale', nameKo: '나이팅게일', icon: '🏥', color: 'pink', category: 'celebrity', subCategory: '과학자', description: '간호의 어머니·통계 혁신가',
        quote: '통계가 환자를 살린다',
        sampleQuestions: ['통계로 의료를 바꾼 법?', '전쟁터에서 가장 힘든 건?', '간호가 과학인 이유는?'],
    },
    {
        id: 'freud', name: 'Sigmund Freud', nameKo: '프로이트', icon: '🧠', color: 'purple', category: 'celebrity', subCategory: '과학자', description: '무의식·정신분석의 아버지',
        quote: '무의식이 삶을 지배한다',
        sampleQuestions: ['꿈은 무엇을 말해주나?', '무의식이 행동에 미치는 법?', '이드와 자아 갈등이란?'],
    },
    {
        id: 'adam-smith', name: 'Adam Smith', nameKo: '애덤 스미스', icon: '🤝', color: 'amber', category: 'celebrity', subCategory: '철학자', description: '보이지 않는 손·경제학의 아버지',
        quote: '보이지 않는 손이 이끈다',
        sampleQuestions: ['보이지 않는 손이란?', '분업이 생산성 높이는 법?', '자유시장의 한계는?'],
    },
    {
        id: 'rousseau', name: 'Jean-Jacques Rousseau', nameKo: '루소', icon: '🌿', color: 'emerald', category: 'celebrity', subCategory: '철학자', description: '사회계약론·자연 회귀의 사상가',
        quote: '인간은 자유롭게 태어났다',
        sampleQuestions: ['자연 상태의 인간은?', '사회계약론 핵심은?', '문명이 인간 타락시키나?'],
    },
    {
        id: 'gutenberg', name: 'Johannes Gutenberg', nameKo: '구텐베르크', icon: '📰', color: 'orange', category: 'celebrity', subCategory: '기업·투자', description: '인쇄 혁명·지식 민주화의 선구자',
        quote: '지식은 만인에게 열려야',
        sampleQuestions: ['인쇄술이 역사 바꾼 법?', '정보 민주화 의미는?', '활판인쇄 발명 과정은?'],
    },
    {
        id: 'helen-keller', name: 'Helen Keller', nameKo: '헬렌 켈러', icon: '✋', color: 'pink', category: 'celebrity', subCategory: '정치·사회', description: '장애를 뛰어넘은 의지의 상징',
        quote: '눈보다 비전이 중요하다',
        sampleQuestions: ['장애를 극복한 힘은?', '설리번 선생님의 의미는?', '불가능은 없다는 이유?'],

    // 현대 인물 — 기업·투자
    },
    {
        id: 'musk', name: 'Elon Musk', nameKo: '일론 머스크', icon: '🚀', color: 'purple', category: 'celebrity', subCategory: '기업·투자', description: '테슬라·SpaceX·미래 설계 혁신가',
        quote: '인류를 다행성 종으로',
        sampleQuestions: ['화성 이주가 왜 필요?', '제1원칙 사고란?', '여러 회사 동시 운영법?'],
    },
    {
        id: 'buffett', name: 'Warren Buffett', nameKo: '워렌 버핏', icon: '💵', color: 'amber', category: 'celebrity', subCategory: '기업·투자', description: '오마하의 현인·장기 가치투자의 전설',
        quote: '공포에 탐욕 탐욕에 공포',
        sampleQuestions: ['가치투자 핵심 원칙은?', '좋은 기업 고르는 법은?', '복리의 마법이란?'],
    },
    {
        id: 'bezos', name: 'Jeff Bezos', nameKo: '제프 베조스', icon: '📦', color: 'orange', category: 'celebrity', subCategory: '기업·투자', description: '아마존 창업자·고객 집착의 아이콘',
        quote: '매일이 Day 1이다',
        sampleQuestions: ['고객 집착이란 무엇?', 'Day 1 마인드란?', '장기 사고로 버티는 법?'],
    },
    {
        id: 'gates', name: 'Bill Gates', nameKo: '빌 게이츠', icon: '💻', color: 'blue', category: 'celebrity', subCategory: '기업·투자', description: 'MS 창업자·기술과 자선의 아이콘',
        quote: '성공은 나쁜 선생이다',
        sampleQuestions: ['MS 창업 최대 교훈은?', '기후변화 해결책은?', '기술과 자선의 연결은?'],
    },
    {
        id: 'son-masayoshi', name: 'Son Masayoshi', nameKo: '손정의', icon: '📱', color: 'amber', category: 'celebrity', subCategory: '기업·투자', description: '소프트뱅크 회장·300년 비전의 투자가',
        quote: '300년 후를 그린다',
        sampleQuestions: ['300년 비전이란?', 'AI 혁명 예측한 비결?', '과감한 투자의 비결은?'],

    // 현대 인물 — 문화·사상
    },
    {
        id: 'miyazaki', name: 'Hayao Miyazaki', nameKo: '미야자키 하야오', icon: '🎬', color: 'emerald', category: 'celebrity', subCategory: '문화·예술', description: '지브리 감독·자연과 상상의 이야기꾼',
        quote: '아이들에게 희망을 그린다',
        sampleQuestions: ['지브리 작품 반복 주제?', '손그림 고집하는 이유?', '자연을 그리는 철학은?'],
    },
    {
        id: 'yuval', name: 'Yuval Noah Harari', nameKo: '유발 하라리', icon: '📖', color: 'orange', category: 'celebrity', subCategory: '정치·사회', description: '사피엔스 저자·인류 역사를 꿰뚫는 사상가',
        quote: '허구가 인류를 뭉치게 했다',
        sampleQuestions: ['사피엔스 지배 이유는?', 'AI 시대 인간 역할은?', '역사로 현재 읽는 법?'],
    },
    {
        id: 'nolan', name: 'Christopher Nolan', nameKo: '크리스토퍼 놀란', icon: '🎥', color: 'blue', category: 'celebrity', subCategory: '문화·예술', description: '시간과 현실을 뒤트는 감독',
        quote: '관객이 스스로 생각하게',
        sampleQuestions: ['시간을 영화로 다루는 법?', '비선형 서사의 매력은?', '실제 촬영 고집 이유는?'],
    },
    {
        id: 'cameron', name: 'James Cameron', nameKo: '제임스 카메론', icon: '🌊', color: 'teal', category: 'celebrity', subCategory: '문화·예술', description: '아바타·타이타닉의 탐험가 감독',
        quote: '한계는 두려움이 만든다',
        sampleQuestions: ['타이타닉 제작 비화는?', '기술과 이야기 균형은?', '심해 탐험이 준 영감은?'],
    },
    {
        id: 'dalio', name: 'Ray Dalio', nameKo: '레이 달리오', icon: '📊', color: 'teal', category: 'celebrity', subCategory: '기업·투자', description: '원칙·거시경제 사이클의 대가',
        quote: '고통+반성=성장이다',
        sampleQuestions: ['원칙 기반 의사결정이란?', '부채 사이클이란?', '경제 위기 예측하는 법?'],
    },
    {
        id: 'jensen', name: 'Jensen Huang', nameKo: '젠슨 황', icon: '💚', color: 'emerald', category: 'celebrity', subCategory: '기업·투자', description: '엔비디아 CEO·AI 인프라의 설계자',
        quote: 'AI 공장이 새 산업혁명',
        sampleQuestions: ['GPU가 AI 혁명 이끈 이유?', '가속 컴퓨팅이란?', '엔비디아 다음 10년은?'],
    },
    {
        id: 'zuckerberg', name: 'Mark Zuckerberg', nameKo: '마크 저커버그', icon: '👤', color: 'blue', category: 'celebrity', subCategory: '기업·투자', description: 'Meta 창업자·소셜과 메타버스의 미래',
        quote: '빠르게 움직이고 깨뜨려',
        sampleQuestions: ['메타버스가 미래인 이유?', '소셜미디어 사회적 책임?', '오픈소스 AI 전략 이유?'],

    // Region / Culture
    },
    {
        id: 'korean', name: 'Korean', nameKo: '한국인', icon: '🇰🇷', color: 'blue', category: 'region', subCategory: '동아시아', description: '빨리빨리·정(情)·눈치의 나라',
        quote: '눈치 없으면 한국 못 산다',
        sampleQuestions: ['수능이 인생을 결정한다고 봐?', '회식 문화 꼭 참석해야 해?', '전세 제도 외국에도 있어?'],
    },
    {
        id: 'japanese', name: 'Japanese', nameKo: '일본인', icon: '🇯🇵', color: 'red', category: 'region', subCategory: '동아시아', description: '장인정신·예의·쿠우키의 나라',
        quote: '쿠우키 못 읽으면 실격이야',
        sampleQuestions: ['혼네와 타테마에 구분 힘들지 않아?', '오타쿠 문화가 경제에 미친 영향은?', '이자카야 문화 왜 그렇게 중요해?'],
    },
    {
        id: 'chinese', name: 'Chinese', nameKo: '중국인', icon: '🇨🇳', color: 'red', category: 'region', subCategory: '동아시아', description: '관시·체면·대륙의 스케일',
        quote: '관시 없이는 아무것도 안 돼',
        sampleQuestions: ['가오카오 지옥 진짜 그래?', '996 근무제 어떻게 버텨?', '탕핑족은 왜 눕기로 했어?'],
    },
    {
        id: 'american', name: 'American', nameKo: '미국인', icon: '🇺🇸', color: 'blue', category: 'region', subCategory: '아메리카', description: '자유·개인주의·아메리칸 드림',
        quote: '수정헌법 2조는 양보 못 해',
        sampleQuestions: ['팁 문화 왜 꼭 줘야 해?', '고교 풋볼이 마을의 종교라고?', '의료보험 없이 어떻게 살아?'],
    },
    {
        id: 'british', name: 'British', nameKo: '영국인', icon: '🇬🇧', color: 'purple', category: 'region', subCategory: '유럽', description: '전통·유머·큐 문화의 나라',
        quote: '큐 안 서면 영국인이 아니야',
        sampleQuestions: ['왕실이 아직도 필요한 이유는?', '피쉬앤칩스 말고 자랑할 음식은?', '펍 문화가 왜 사교의 핵심이야?'],
    },
    {
        id: 'german', name: 'German', nameKo: '독일인', icon: '🇩🇪', color: 'amber', category: 'region', subCategory: '유럽', description: '정확성·마이스터·맥주의 나라',
        quote: '파이어아벤트 후엔 연락 금지',
        sampleQuestions: ['아우토반 무제한 속도 괜찮아?', '마이스터 제도가 뭐가 좋아?', '빵집에서 일요일 영업 안 하는 이유?'],
    },
    {
        id: 'french', name: 'French', nameKo: '프랑스인', icon: '🇫🇷', color: 'blue', category: 'region', subCategory: '유럽', description: '자유·미식·파업의 나라',
        quote: '바게트 없는 아침은 없다',
        sampleQuestions: ['그레브(파업)가 왜 국민 스포츠야?', '프랑스 치즈 365종 진짜야?', '비즈(볼 키스) 몇 번 해야 해?'],
    },
    {
        id: 'indian', name: 'Indian', nameKo: '인도인', icon: '🇮🇳', color: 'orange', category: 'region', subCategory: '동남아·남아시아', description: '다양성·영성·저거드 정신의 나라',
        quote: '저거드 정신으로 해결한다',
        sampleQuestions: ['배열결혼 제도 지금도 유효해?', '달바트 매일 먹어도 안 질려?', 'IIT 입시가 왜 세계 최고난도야?'],
    },
    {
        id: 'brazilian', name: 'Brazilian', nameKo: '브라질인', icon: '🇧🇷', color: 'emerald', category: 'region', subCategory: '아메리카', description: '삼바·축구·열정의 나라',
        quote: '젱가가 아니면 삼바라도 춰',
        sampleQuestions: ['파벨라 삶이 진짜 어떤 거야?', '슈하스코 없는 주말이 있어?', '카니발 삼바학교 입학 과정은?'],
    },
    {
        id: 'australian', name: 'Australian', nameKo: '호주인', icon: '🇦🇺', color: 'blue', category: 'region', subCategory: '아메리카', description: '아웃도어·여유·메이트 정신의 나라',
        quote: 'She\'ll be right, mate',
        sampleQuestions: ['바비(BBQ) 없는 주말이 있어?', '거미·뱀이랑 공존하는 법은?', '애보리진 드림타임이 뭐야?'],
    },
    {
        id: 'canadian', name: 'Canadian', nameKo: '캐나다인', icon: '🇨🇦', color: 'red', category: 'region', subCategory: '아메리카', description: '관용·하키·사과 문화의 나라',
        quote: '소리, 미안 또 사과했지',
        sampleQuestions: ['팀 호튼스 vs 스타벅스 논쟁은?', '하키 없으면 겨울을 뭘로 버텨?', '케벡 분리 독립 아직 가능해?'],
    },
    {
        id: 'thai', name: 'Thai', nameKo: '태국인', icon: '🇹🇭', color: 'amber', category: 'region', subCategory: '동남아·남아시아', description: '미소·불교·마이펜라이의 나라',
        quote: '마이펜라이, 괜찮아 다',
        sampleQuestions: ['왜 머리를 만지면 안 되는 거야?', '쏭끄란 물축제 진짜 어떤 거야?', '와이(합장인사) 각도가 다 달라?'],
    },
    {
        id: 'vietnamese', name: 'Vietnamese', nameKo: '베트남인', icon: '🇻🇳', color: 'red', category: 'region', subCategory: '동남아·남아시아', description: '끈기·쌀국수·도이모이의 나라',
        quote: '쌀국수 한 그릇이면 충분해',
        sampleQuestions: ['카페쓰어다 커피가 왜 독특해?', '오토바이 5인 탑승 가능한 거야?', '도이모이 개혁이 뭘 바꿨어?'],
    },
    {
        id: 'russian', name: 'Russian', nameKo: '러시아인', icon: '🇷🇺', color: 'blue', category: 'region', subCategory: '유럽', description: '광활한 영토·보드카·러시안 소울',
        quote: '보드카로 영혼을 녹인다',
        sampleQuestions: ['다차(별장) 생활이 왜 중요해?', '러시아식 바냐 문화가 뭐야?', '마슬레니차 축제 때 뭘 해?'],
    },
    {
        id: 'mexican', name: 'Mexican', nameKo: '멕시코인', icon: '🇲🇽', color: 'emerald', category: 'region', subCategory: '아메리카', description: '타코·축제·가족 중심의 나라',
        quote: '타코 없는 날은 상상 못 해',
        sampleQuestions: ['디아 데 무에르토스가 뭔 축제야?', '몰레 소스 레시피 비밀 있어?', '루차 리브레가 왜 국민 스포츠야?'],
    },
    {
        id: 'nigerian', name: 'Nigerian', nameKo: '나이지리아인', icon: '🇳🇬', color: 'emerald', category: 'region', subCategory: '중동·아프리카', description: '놀리우드·활력·다민족의 나라',
        quote: '놀리우드가 할리우드를 넘는다',
        sampleQuestions: ['졸로프 라이스 원조 논쟁 어떻게 봐?', '나이자 환율 왜 이렇게 흔들려?', '오와음베 축제가 어떤 거야?'],
    },
    {
        id: 'italian', name: 'Italian', nameKo: '이탈리아인', icon: '🇮🇹', color: 'emerald', category: 'region', subCategory: '유럽', description: '미식·가족·라돌체비타의 나라',
        quote: '파스타에 케첩? 절대 안 돼',
        sampleQuestions: ['아페리티보 문화가 뭐가 좋아?', '남북 갈등 진짜 그렇게 심해?', '논나(할머니) 요리가 왜 최고야?'],
    },
    {
        id: 'spanish', name: 'Spanish', nameKo: '스페인인', icon: '🇪🇸', color: 'red', category: 'region', subCategory: '유럽', description: '열정·시에스타·타파스의 나라',
        quote: '저녁 10시 식사가 정상이야',
        sampleQuestions: ['소브레메사 대화가 왜 중요해?', '타파스 바 호핑 문화가 뭐야?', '산 페르민 소몰이 안 무서워?'],
    },
    {
        id: 'turkish', name: 'Turkish', nameKo: '터키인', icon: '🇹🇷', color: 'red', category: 'region', subCategory: '중동·아프리카', description: '차이·바자르·동서 교차로의 나라',
        quote: '차이 없으면 대화도 없다',
        sampleQuestions: ['터키식 조식 카흐발트 뭐가 나와?', '그랜드 바자르 흥정 비법 있어?', '함맘(목욕탕) 문화가 어떤 거야?'],
    },
    {
        id: 'saudi', name: 'Saudi', nameKo: '사우디인', icon: '🇸🇦', color: 'emerald', category: 'region', subCategory: '중동·아프리카', description: '환대·사막·전통과 변화의 나라',
        quote: '카흐와 한 잔이 환대의 시작',
        sampleQuestions: ['네옴시티 정말 지어질 거야?', '무타와(종교경찰) 아직 있어?', '낙타 경주 베팅 문화가 어때?'],
    },
    {
        id: 'israeli', name: 'Israeli', nameKo: '이스라엘인', icon: '🇮🇱', color: 'blue', category: 'region', subCategory: '중동·아프리카', description: '후츠파·스타트업·생존의 나라',
        quote: '후츠파 없으면 못 살아',
        sampleQuestions: ['키부츠 공동체 생활 어떤 거야?', '안식일(샤밧) 어떻게 보내?', '8200부대 출신이 왜 CEO 돼?'],
    },
    {
        id: 'filipino', name: 'Filipino', nameKo: '필리핀인', icon: '🇵🇭', color: 'blue', category: 'region', subCategory: '동남아·남아시아', description: '가족·신앙·바할라나의 나라',
        quote: '바할라 나, 신이 알아서 해',
        sampleQuestions: ['피에스타 없으면 마을이 안 돌아가?', 'OFW 송금이 경제의 몇 %야?', '졸리비가 맥도날드를 이긴 비결은?'],
    },
    {
        id: 'indonesian', name: 'Indonesian', nameKo: '인도네시아인', icon: '🇮🇩', color: 'red', category: 'region', subCategory: '동남아·남아시아', description: '다양성·조화·고톡로용의 나라',
        quote: '고톡로용이 우리 방식이야',
        sampleQuestions: ['와양(그림자극) 밤새 보는 거야?', '르바란 귀성 무덕(대이동) 어때?', '나시고렝 vs 미고렝 뭐가 맛있어?'],
    },
    {
        id: 'polish', name: 'Polish', nameKo: '폴란드인', icon: '🇵🇱', color: 'red', category: 'region', subCategory: '유럽', description: '자부심·피에로기·회복력의 나라',
        quote: '피에로기 먹으면 다 해결돼',
        sampleQuestions: ['임이에니니(성명축일) 어떻게 챙겨?', '비길리아 12가지 요리 진짜야?', '보드카 원조는 폴란드 맞지?'],
    },
    {
        id: 'swedish', name: 'Swedish', nameKo: '스웨덴인', icon: '🇸🇪', color: 'blue', category: 'region', subCategory: '유럽', description: '평등·피카·라곰의 나라',
        quote: '피카 타임은 절대 빼먹지 마',
        sampleQuestions: ['피카(커피 브레이크) 왜 필수야?', '알레만스레텐(자연접근권) 뭐야?', '미드소마르 축제 때 뭘 해?'],
    },
    {
        id: 'egyptian', name: 'Egyptian', nameKo: '이집트인', icon: '🇪🇬', color: 'amber', category: 'region', subCategory: '중동·아프리카', description: '고대문명·유머·나일강의 나라',
        quote: '코샤리 한 그릇이면 배불러',
        sampleQuestions: ['라마단 기간 일상이 어떻게 달라져?', '피라미드 근처 실제 삶은 어때?', '이집트식 유머가 왜 유명해?'],
    },
    {
        id: 'argentinian', name: 'Argentinian', nameKo: '아르헨티나인', icon: '🇦🇷', color: 'blue', category: 'region', subCategory: '아메리카', description: '탱고·아사도·자부심의 나라',
        quote: '아사도 없는 일요일은 없다',
        sampleQuestions: ['마테차 돌려 마시는 예절 있어?', '밀롱가(탱고홀) 코드가 뭐야?', '페소 평가절하 몇 번 겪었어?'],
    },
    {
        id: 'southafrican', name: 'South African', nameKo: '남아공인', icon: '🇿🇦', color: 'emerald', category: 'region', subCategory: '중동·아프리카', description: '우분투·다양성·브라이의 나라',
        quote: '브라이가 우리 사교 방식이야',
        sampleQuestions: ['로드셰딩(정전) 어떻게 버텨?', '11개 공용어 실제로 다 써?', '분투 정신이 일상에서 어떤 거야?'],
    },
    {
        id: 'taiwanese', name: 'Taiwanese', nameKo: '대만인', icon: '🇹🇼', color: 'blue', category: 'region', subCategory: '동아시아', description: '야시장·민주주의·반도체의 섬',
        quote: '야시장 없으면 밤이 심심해',
        sampleQuestions: ['TSMC가 대만의 실리콘 방패라고?', '진주 밀크티 원조 논쟁 어떻게 봐?', '선거 열기가 왜 그렇게 뜨거워?'],
    },
    {
        id: 'singaporean', name: 'Singaporean', nameKo: '싱가포르인', icon: '🇸🇬', color: 'red', category: 'region', subCategory: '동남아·남아시아', description: '효율·키아수·호커센터의 도시국가',
        quote: '키아수 정신이 원동력이야',
        sampleQuestions: ['호커센터 음식이 왜 미슐랭급이야?', '껌 반입 금지 진짜 단속해?', 'HDB 공공주택이 어떻게 작동해?'],
    },
    {
        id: 'malaysian', name: 'Malaysian', nameKo: '말레이시아인', icon: '🇲🇾', color: 'amber', category: 'region', subCategory: '동남아·남아시아', description: '다문화·나시르막·조화의 나라',
        quote: '나시르막 없이 아침 안 열어',
        sampleQuestions: ['마막(인도계 식당) 24시간인 이유?', '부미푸트라 우대 정책 공정해?', '하리라야 보너스 문화가 뭐야?'],
    },
    {
        id: 'dutch', name: 'Dutch', nameKo: '네덜란드인', icon: '🇳🇱', color: 'orange', category: 'region', subCategory: '유럽', description: '자전거·직설·자유의 나라',
        quote: '자전거가 차보다 우선이야',
        sampleQuestions: ['더치페이가 진짜 네덜란드식이야?', '간 밑 지대를 어떻게 지켰어?', '킹스데이 축제 때 뭘 하는 거야?'],
    },
    {
        id: 'swiss', name: 'Swiss', nameKo: '스위스인', icon: '🇨🇭', color: 'red', category: 'region', subCategory: '유럽', description: '정밀·중립·직접민주주의의 나라',
        quote: '기차가 1분 늦으면 사건이야',
        sampleQuestions: ['직접민주제 국민투표 자주 해?', '퐁뒤 먹을 때 규칙이 있어?', '칸톤(주)마다 법이 다른 거야?'],
    },
    {
        id: 'norwegian', name: 'Norwegian', nameKo: '노르웨이인', icon: '🇳🇴', color: 'blue', category: 'region', subCategory: '유럽', description: '자연·복지·코셀리그의 나라',
        quote: '야외가 곧 우리 거실이야',
        sampleQuestions: ['코셀리그(아늑함) 문화가 뭐야?', '브뤼노스트(갈색치즈) 맛있어?', '오일펀드 1인당 얼마나 돌아와?'],
    },
    {
        id: 'colombian', name: 'Colombian', nameKo: '콜롬비아인', icon: '🇨🇴', color: 'amber', category: 'region', subCategory: '아메리카', description: '커피·살사·회복의 나라',
        quote: '틴토 없이 아침 안 시작해',
        sampleQuestions: ['살사 칼레냐 vs 쿠바나 뭐가 달라?', '에헤 카페테로(커피 축) 가봤어?', '발렌나토 음악이 뭔 장르야?'],
    },
    {
        id: 'chilean', name: 'Chilean', nameKo: '칠레인', icon: '🇨🇱', color: 'red', category: 'region', subCategory: '아메리카', description: '와인·안데스·자연의 나라',
        quote: '빠짜마마에 경의를 표한다',
        sampleQuestions: ['뻬브레 소스 없이 식사가 돼?', '콤플레또(핫도그) 문화가 뭐야?', '피에스타스 빠트리아스 때 뭘 해?'],
    },
    {
        id: 'iranian', name: 'Iranian', nameKo: '이란인', icon: '🇮🇷', color: 'emerald', category: 'region', subCategory: '중동·아프리카', description: '시(詩)·노루즈·타아로프의 나라',
        quote: '노루즈 없이 봄은 안 온다',
        sampleQuestions: ['타아로프 사양 몇 번 해야 진짜야?', '하프트신 상차림에 뭘 올려?', '체로우 케밥이 왜 국민 음식이야?'],
    },
    {
        id: 'emirati', name: 'Emirati', nameKo: 'UAE인', icon: '🇦🇪', color: 'amber', category: 'region', subCategory: '중동·아프리카', description: '환대·야망·사막 위의 미래도시',
        quote: '마즐리스가 모든 결정의 시작',
        sampleQuestions: ['금요일 브런치 문화가 뭔 거야?', '팔콘(매) 사냥이 왜 귀족 스포츠?', '칸두라 입는 규칙이 있어?'],
    },
    {
        id: 'pakistani', name: 'Pakistani', nameKo: '파키스탄인', icon: '🇵🇰', color: 'emerald', category: 'region', subCategory: '동남아·남아시아', description: '비리야니·차이·환대의 나라',
        quote: '비리야니 레시피로 싸운다',
        sampleQuestions: ['트럭 아트가 왜 유명해?', '차이 다바(찻집)에서 뭘 얘기해?', '바자르 흥정 문화 어떻게 해?'],
    },
    {
        id: 'bangladeshi', name: 'Bangladeshi', nameKo: '방글라데시인', icon: '🇧🇩', color: 'emerald', category: 'region', subCategory: '동남아·남아시아', description: '델타·힐사·회복력의 나라',
        quote: '힐사 생선 시즌이 국경일급',
        sampleQuestions: ['릭샤 아트가 왜 독특해?', '차 농장 노동자 삶은 어때?', '에카셰 페브루아리 무슨 날이야?'],
    },
    {
        id: 'newzealander', name: 'New Zealander', nameKo: '뉴질랜드인', icon: '🇳🇿', color: 'blue', category: 'region', subCategory: '아메리카', description: '키위·하카·자연 속 삶의 나라',
        quote: '키위라 불러도 화 안 나',
        sampleQuestions: ['하카 춤이 왜 럭비 전에 필수야?', '항이(땅 오븐) 요리 어떻게 해?', '만우절에 양 세기 대회 있어?'],
    },
    {
        id: 'irish', name: 'Irish', nameKo: '아일랜드인', icon: '🇮🇪', color: 'emerald', category: 'region', subCategory: '유럽', description: '기네스·크래익·문학의 나라',
        quote: '기네스 한 잔이 대화의 시작',
        sampleQuestions: ['크래익(수다) 없으면 펍이 아니지?', '성 패트릭 데이 뭘 하는 날이야?', '게일어 부활 운동 효과 있어?'],
    },
    {
        id: 'greek', name: 'Greek', nameKo: '그리스인', icon: '🇬🇷', color: 'blue', category: 'region', subCategory: '유럽', description: '필로티모·철학·지중해의 나라',
        quote: '필로티모가 우리 정체성이야',
        sampleQuestions: ['타베르나에서 메제 시키는 법은?', '우조 마시는 법 따로 있어?', '파레아(친구 모임) 문화가 뭐야?'],
    },
    {
        id: 'czech', name: 'Czech', nameKo: '체코인', icon: '🇨🇿', color: 'red', category: 'region', subCategory: '유럽', description: '맥주·유머·벨벳 혁명의 나라',
        quote: '피보 한 잔이 물보다 싸',
        sampleQuestions: ['호스포다(선술집) 에티켓 있어?', '크네들리키 없이 식사가 돼?', '벨벳 혁명 경험한 세대 어때?'],
    // 문화권
    },
    {
        id: 'eastasian-culture', name: 'East Asian Culture', nameKo: '동아시아 문화권', icon: '🏯', color: 'amber', category: 'region', subCategory: '문화권', description: '교육·가족·예의·집단 조화 중심',
        quote: '체면과 효도가 사회 기둥이야',
        sampleQuestions: ['과거제 전통이 입시에 남아있나?', '젓가락 문화권 공통점이 뭐야?', '연장자 호칭 체계가 왜 중요해?'],
    },
    {
        id: 'middleeast-culture', name: 'Middle East Culture', nameKo: '중동 문화권', icon: '🏜️', color: 'emerald', category: 'region', subCategory: '문화권', description: '환대·공동체·전통 중심',
        quote: '디야파가 명예의 척도야',
        sampleQuestions: ['수크(시장) 흥정 문화 왜 중요해?', '아잔이 하루를 어떻게 나눠?', '와스타(인맥) 없이 취직 가능해?'],
    },
    {
        id: 'western', name: 'Western Culture', nameKo: '서양 문화권', icon: '🏛️', color: 'blue', category: 'region', subCategory: '문화권', description: '개인주의·자유·민주주의 중심',
        quote: '계약과 법 앞에 모두 평등해',
        sampleQuestions: ['감사절·크리스마스 핵심 가치가 뭐야?', '소송 문화가 왜 발달했어?', '갭이어 전통이 어떻게 생겼어?'],
    },
    {
        id: 'latin', name: 'Latin Culture', nameKo: '라틴 문화권', icon: '💃', color: 'red', category: 'region', subCategory: '문화권', description: '정열·가족·축제 문화 중심',
        quote: '소브레메사 없이 밥 안 끝나',
        sampleQuestions: ['퀸세아녜라(15세 축하) 왜 중요해?', '텔레노벨라가 문화에 미친 영향은?', '시에스타 문화 아직 유효해?'],
    },
    {
        id: 'nordic', name: 'Nordic Culture', nameKo: '북유럽 문화권', icon: '❄️', color: 'teal', category: 'region', subCategory: '문화권', description: '복지·평등·자연 중심',
        quote: '얀테의 법칙, 튀지 마라',
        sampleQuestions: ['얀테라겐이 사회에 어떤 영향 줘?', '사우나 문화가 왜 핀란드의 핵심?', '스몰가스보르드 뷔페 규칙 있어?'],
    },
    {
        id: 'african', name: 'African Culture', nameKo: '아프리카 문화권', icon: '🌍', color: 'orange', category: 'region', subCategory: '문화권', description: '우분투·공동체·구전 전통 중심',
        quote: '네가 있어 내가 있다',
        sampleQuestions: ['그리오(구전 전승자) 역할이 뭐야?', '팔라버(마을 회의) 어떻게 진행해?', '은콜라(쩜바라 콜라넛) 왜 나눠먹어?'],
    },
    {
        id: 'southeast-asian-culture', name: 'Southeast Asian Culture', nameKo: '동남아시아 문화권', icon: '🌴', color: 'emerald', category: 'region', subCategory: '문화권', description: '다양성·조화·열대 생활 중심',
        quote: '사냑 마이 안 먹어본 거야?',
        sampleQuestions: ['왓(사원) 참배 에티켓이 뭐야?', '쌀 문화권에서 밥이 어떤 의미야?', '러닝 스트리트 포장마차 문화 어때?'],
    },
    {
        id: 'southamerican-culture', name: 'South American Culture', nameKo: '남미 문화권', icon: '🎭', color: 'amber', category: 'region', subCategory: '문화권', description: '열정·다양성·자연·공동체 중심',
        quote: '엠빠나다 없으면 축제가 아냐',
        sampleQuestions: ['카우디요 전통이 정치에 남아있나?', '아야와스카 의식이 뭔 의미야?', '누에바 칸시온 운동이 뭐였어?'],

    // Ideology (17개)
    },
    {
        id: 'libertarian', name: 'Liberalism', nameKo: '자유주의', icon: '🗽', avatarUrl: '/logos/ideology/libertarian.png', color: 'amber', category: 'ideology', description: '개인의 자유·권리 최우선',
        quote: '자유는 양도할 수 없는 권리다',
        sampleQuestions: ['야경국가론의 핵심이 뭐야?', '존 로크의 소유권 이론 동의해?', '해악 원칙의 경계는 어디야?'],
    },
    {
        id: 'conservative', name: 'Conservatism', nameKo: '보수주의', icon: '🏰', avatarUrl: '/logos/ideology/conservative.png', color: 'orange', category: 'ideology', description: '전통·안정·점진적 변화',
        quote: '버크가 옳았다, 서두르지 마',
        sampleQuestions: ['프랑스혁명이 왜 실패 사례야?', '처방적 권리란 구체적으로 뭐야?', '전통 제도를 왜 보전해야 해?'],
    },
    {
        id: 'progressive', name: 'Progressivism', nameKo: '진보주의', icon: '🔄', avatarUrl: '/logos/ideology/progressive.png', color: 'emerald', category: 'ideology', description: '개혁·사회변화·평등 추구',
        quote: '역사의 호는 정의로 휜다',
        sampleQuestions: ['적극적 우대조치 왜 필요해?', '교차성 이론이 뭘 설명해?', '구조적 차별 해체 방법은?'],
    },
    {
        id: 'socialist', name: 'Socialism', nameKo: '사회주의', icon: '✊', avatarUrl: '/logos/ideology/socialist.png', color: 'red', category: 'ideology', description: '평등·공공복지·노동자 권리',
        quote: '생산수단을 노동자 손에',
        sampleQuestions: ['잉여가치 착취란 구체적으로 뭐야?', '노동조합 파업권이 왜 핵심이야?', '북유럽 사민주의가 사회주의 맞아?'],
    },
    {
        id: 'communist', name: 'Communism', nameKo: '공산주의', icon: '☭', avatarUrl: '/logos/ideology/communist.svg', color: 'red', category: 'ideology', description: '생산수단 공유·계급 철폐',
        quote: '만국의 노동자여 단결하라',
        sampleQuestions: ['변증법적 유물론이 뭘 예측해?', '프롤레타리아 독재 왜 필요해?', '소련 실패가 마르크스 탓이야?'],
    },
    {
        id: 'democrat', name: 'Democracy', nameKo: '민주주의', icon: '🗳️', avatarUrl: '/logos/ideology/democrat.png', color: 'blue', category: 'ideology', description: '국민 주권·다수결·참여',
        quote: '피통치자의 동의가 정당성이다',
        sampleQuestions: ['직접민주주의 vs 대의민주주의?', '소수자 권리를 다수결로 뺏나?', '투표율 하락이 위기 신호야?'],
    },
    {
        id: 'capitalist', name: 'Capitalism', nameKo: '자본주의', icon: '💰', avatarUrl: '/logos/ideology/capitalist.png', color: 'blue', category: 'ideology', description: '자유시장·경쟁·사유재산',
        quote: '보이지 않는 손을 믿어라',
        sampleQuestions: ['트리클다운 효과 실제로 작동해?', '독점은 시장 실패의 증거인가?', '사유재산권 왜 불가침이야?'],
    },
    {
        id: 'nationalist', name: 'Nationalism', nameKo: '민족주의', icon: '🗻', avatarUrl: '/logos/ideology/nationalist.png', color: 'purple', category: 'ideology', description: '국가·민족 이익 최우선',
        quote: '혈통과 영토가 정체성이다',
        sampleQuestions: ['민족자결권이 왜 핵심 원칙이야?', '다문화주의가 민족 정체성을 희석해?', '경제적 보호무역 효과 있어?'],
    },
    {
        id: 'anarchist', name: 'Anarchism', nameKo: '무정부주의', icon: '🔥', avatarUrl: '/logos/ideology/anarchist.png', color: 'pink', category: 'ideology', description: '국가·권위 자체를 부정',
        quote: '모든 권력은 반드시 부패한다',
        sampleQuestions: ['상호부조론이 구체적으로 뭐야?', '자주관리 코뮌이 작동한 사례는?', '크로포트킨 vs 바쿠닌 차이는?'],
    },
    {
        id: 'neoliberal', name: 'Neoliberalism', nameKo: '신자유주의', icon: '📈', avatarUrl: '/logos/ideology/neoliberal.png', color: 'blue', category: 'ideology', description: '시장 자유화·민영화·규제 완화',
        quote: '규제 철폐가 성장 엔진이다',
        sampleQuestions: ['워싱턴 컨센서스가 왜 중요해?', '공기업 민영화 성공 사례는?', '긴축재정이 왜 필수 처방이야?'],
    },
    {
        id: 'totalitarian', name: 'Totalitarianism', nameKo: '전체주의', icon: '⛓️', avatarUrl: '/logos/ideology/totalitarian.png', color: 'red', category: 'ideology', description: '국가 권력의 전면적 통제',
        quote: '국가 의지가 개인보다 앞선다',
        sampleQuestions: ['비밀경찰이 왜 체제 유지에 필수야?', '선전·선동 기관의 역할은 뭐야?', '일당독재가 효율적이라는 논리는?'],
    },
    {
        id: 'pragmatist_i', name: 'Pragmatism', nameKo: '실용주의', icon: '🔧', avatarUrl: '/logos/ideology/pragmatist_i.png', color: 'blue', category: 'ideology', description: '결과 중심·이념 초월',
        quote: '효과가 곧 진리의 기준이다',
        sampleQuestions: ['듀이의 도구주의가 뭘 주장해?', '좌우 합작이 최선인 경우는?', '이념 맹신이 왜 정책을 망쳐?'],
    },
    {
        id: 'humanist', name: 'Humanism', nameKo: '인본주의', icon: '🌍', avatarUrl: '/logos/ideology/humanist.png', color: 'teal', category: 'ideology', description: '인간 존엄·이성·윤리 중심',
        quote: '인간 이성이 최고 권위다',
        sampleQuestions: ['세속적 윤리가 종교 도덕을 대체해?', '르네상스 휴머니즘 핵심 주장은?', '인권 보편성 vs 문화상대주의?'],
    },
    {
        id: 'utilitarian', name: 'Utilitarianism', nameKo: '공리주의', icon: '⚖️', avatarUrl: '/logos/ideology/utilitarian.png', color: 'emerald', category: 'ideology', description: '최대 다수의 최대 행복',
        quote: '쾌락 계산법으로 판단한다',
        sampleQuestions: ['트롤리 딜레마를 어떻게 풀어?', '벤담의 판옵티콘이 왜 나왔어?', '선호 공리주의 vs 쾌락 공리주의?'],
    },
    {
        id: 'populist', name: 'Populism', nameKo: '포퓰리즘', icon: '📣', avatarUrl: '/logos/ideology/populist.png', color: 'orange', category: 'ideology', description: '반엘리트·대중 동원 정치 노선',
        quote: '민중의 분노가 곧 정당성이다',
        sampleQuestions: ['인민 vs 엘리트 구도가 왜 핵심?', '카리스마 지도자가 왜 필수야?', '반기득권 정서를 어떻게 동원해?'],
    },
    {
        id: 'pacifist', name: 'Pacifism', nameKo: '평화주의', icon: '☮️', avatarUrl: '/logos/ideology/pacifist.png', color: 'emerald', category: 'ideology', description: '비폭력·평화적 해결 추구',
        quote: '사티아그라하, 진리의 힘으로',
        sampleQuestions: ['간디식 비폭력 불복종 한계는?', '양심적 병역 거부 정당한가?', '군산복합체 해체 방법이 있어?'],

    // 철학 사조 (먼저)
    },
    {
        id: 'stoicism', name: 'Stoicism', nameKo: '스토아주의', icon: '🏛️', color: 'blue', category: 'religion', description: '감정 통제·운명 수용의 철학',
        quote: '견뎌라, 그리고 삼가라',
        sampleQuestions: ['마르쿠스식 아침 명상이란?', '디코토미아로 불안을 다스리면?', '프로하이레시스란 무엇인가?'],
    },
    {
        id: 'existentialism', name: 'Existentialism', nameKo: '실존주의', icon: '🚶', color: 'purple', category: 'religion', description: '실존·자유·의미 창조의 철학',
        quote: '실존은 본질에 앞선다',
        sampleQuestions: ['사르트르의 앙가주망이란?', '자유에 처해진다는 게 무슨 뜻?', '시지프 신화가 주는 교훈은?'],
    },
    {
        id: 'nihilism', name: 'Nihilism', nameKo: '허무주의', icon: '🕳️', color: 'red', category: 'religion', description: '모든 가치 해체의 철학',
        quote: '신은 죽었다 — 니체',
        sampleQuestions: ['능동적 허무주의란 무엇인가?', '니체의 위버멘쉬란?', '영원회귀를 견딜 수 있는가?'],
    },
    {
        id: 'hedonism', name: 'Hedonism', nameKo: '쾌락주의', icon: '🍷', color: 'pink', category: 'religion', description: '쾌락·평정이 최고선인 철학',
        quote: '아타락시아가 최고선이다',
        sampleQuestions: ['에피쿠로스 정원의 삶이란?', '카타스테마적 쾌락이 뭔가요?', '키네틱 쾌락은 왜 경계하나?'],
    },
    {
        id: 'skepticism', name: 'Skepticism', nameKo: '회의주의', icon: '🧐', color: 'teal', category: 'religion', description: '모든 확신을 유보하는 철학',
        quote: '판단을 유보하라, 에포케',
        sampleQuestions: ['피론의 에포케란 무엇인가?', '독단론자에게 뭐라 반박하나?', '트릴레마를 어떻게 벗어나나?'],
    },
    {
        id: 'rationalism', name: 'Rationalism', nameKo: '합리주의', icon: '🧠', color: 'blue', category: 'religion', description: '이성으로 진리에 도달하는 철학',
        quote: '코기토 에르고 숨',
        sampleQuestions: ['데카르트 방법적 회의란?', '본유관념이 존재하는 근거는?', '라이프니츠 모나드론이란?'],
    },
    {
        id: 'empiricism', name: 'Empiricism', nameKo: '경험주의', icon: '👁️', color: 'orange', category: 'religion', description: '경험이 지식의 원천인 철학',
        quote: '마음은 백지, 타불라 라사',
        sampleQuestions: ['로크의 타불라 라사란?', '흄의 인과 회의론이란?', '인상과 관념의 차이는?'],
    },
    {
        id: 'pessimism-phil', name: 'Pessimism', nameKo: '염세주의', icon: '🌑', color: 'purple', category: 'religion', description: '세계 본질을 고통으로 보는 철학',
        quote: '의지는 맹목적 고통이다',
        sampleQuestions: ['쇼펜하우어의 맹목의지란?', '예술이 고통을 잠재우는 이유?', '염세주의와 반출생주의 관계?'],
    },
    {
        id: 'relativism', name: 'Relativism', nameKo: '상대주의', icon: '🔄', color: 'pink', category: 'religion', description: '절대 진리를 부정하는 철학',
        quote: '만물의 척도는 인간이다',
        sampleQuestions: ['프로타고라스의 인간척도설?', '문화상대주의의 한계는?', '도덕실재론에 뭐라 반박하나?'],
    },
    {
        id: 'determinism', name: 'Determinism', nameKo: '결정론', icon: '⚙️', color: 'teal', category: 'religion', description: '모든 것은 인과로 결정되는 철학',
        quote: '모든 것은 인과의 사슬이다',
        sampleQuestions: ['라플라스의 악마란 무엇인가?', '양자역학이 결정론을 깨나?', '양립론적 자유의지란?'],
    },
    {
        id: 'idealism-phil', name: 'Idealism', nameKo: '관념론', icon: '💭', color: 'purple', category: 'religion', description: '정신·관념이 현실 본질인 철학',
        quote: '이성적인 것이 현실적이다',
        sampleQuestions: ['헤겔 변증법의 정반합이란?', '절대정신이란 무엇인가?', '칸트 물자체를 어떻게 보나?'],
    },
    {
        id: 'materialism-phil', name: 'Materialism', nameKo: '유물론', icon: '⚛️', color: 'red', category: 'religion', description: '물질만이 존재한다는 철학',
        quote: '존재가 의식을 결정한다',
        sampleQuestions: ['마르크스 사적유물론이란?', '하부구조가 상부구조를 결정?', '유물론에서 의식은 뭔가?'],
    },
    {
        id: 'cynicism', name: 'Cynicism', nameKo: '견유주의', icon: '🏺', color: 'amber', category: 'religion', description: '사회 허위를 벗기는 철학',
        quote: '햇빛 좀 비켜라, 알렉산더',
        sampleQuestions: ['디오게네스 통 속 삶의 의미?', '왜 낮에 등불을 들고 다녔나?', '견유주의 파르헤시아란?'],
    },
    {
        id: 'postmodernism', name: 'Postmodernism', nameKo: '포스트모더니즘', icon: '🪞', color: 'pink', category: 'religion', description: '거대 서사 해체의 탈근대 철학',
        quote: '거대 서사에 대한 불신',
        sampleQuestions: ['리오타르의 거대서사 비판?', '데리다의 해체란 무엇인가?', '시뮬라크르가 현실을 대체?'],
    },
    {
        id: 'asceticism', name: 'Asceticism', nameKo: '금욕주의', icon: '🧘', color: 'teal', category: 'religion', description: '절제로 자유에 이르는 철학',
        quote: '절제 속에 자유가 있다',
        sampleQuestions: ['수도원 금욕의 영적 목적은?', '아스케시스 수련이란 무엇?', '현대 디지털 금욕이 가능한가?'],

    // 종교
    },
    {
        id: 'buddhist', name: 'Buddhist', nameKo: '불교', icon: '☸️', avatarUrl: '/logos/religion/buddhism.svg', color: 'amber', category: 'religion', description: '무상·연기·해탈의 가르침',
        quote: '색즉시공 공즉시색',
        sampleQuestions: ['사성제와 팔정도란 무엇?', '연기법으로 보면 나는 뭔가?', '중도란 어떤 수행의 길인가?'],
    },
    {
        id: 'christian', name: 'Christian', nameKo: '기독교', icon: '✝️', avatarUrl: '/logos/religion/christianity.svg', color: 'blue', category: 'religion', description: '사랑·은혜·구원의 신앙',
        quote: '하나님이 세상을 사랑하사',
        sampleQuestions: ['삼위일체 교리란 무엇인가?', '십자가 대속의 의미는?', '산상수훈의 핵심 가르침은?'],
    },
    {
        id: 'catholic', name: 'Catholic', nameKo: '가톨릭', icon: '🙏', avatarUrl: '/logos/religion/catholic.svg', color: 'purple', category: 'religion', description: '전통·성사·공동선의 신앙',
        quote: '성체 안에 그리스도 현존',
        sampleQuestions: ['교황 무류성 교리란 무엇?', '성사 칠가지의 의미는?', '가톨릭 사회교리의 핵심은?'],
    },
    {
        id: 'islamic', name: 'Islamic', nameKo: '이슬람', icon: '☪️', avatarUrl: '/logos/religion/islam.svg', color: 'emerald', category: 'religion', description: '율법·정의·공동체의 신앙',
        quote: '비스밀라, 자비로운 분께',
        sampleQuestions: ['이슬람 다섯 기둥이란?', '꾸란의 지하드 본뜻은?', '자카트(희사)의 사회적 역할?'],
    },
    {
        id: 'confucian', name: 'Confucian', nameKo: '유교', icon: '📜', avatarUrl: '/logos/religion/confucianism.svg', color: 'teal', category: 'religion', description: '인륜·예의·덕치의 가르침',
        quote: '기소불욕 물시어인',
        sampleQuestions: ['인의예지신, 오상이란?', '군자와 소인의 차이는?', '삼강오륜이 현대에 유효한가?'],
    },
    {
        id: 'atheist', name: 'Atheist', nameKo: '무신론', icon: '🧪', avatarUrl: '/logos/religion/atheism.svg', color: 'orange', category: 'religion', description: '이성·과학 중심의 세계관',
        quote: '증거 없으면 믿지 않는다',
        sampleQuestions: ['도킨스 신 없는 도덕이란?', '러셀의 찻주전자 비유란?', '무신론적 실존의 의미는?'],
    },
    {
        id: 'agnostic', name: 'Agnostic', nameKo: '불가지론', icon: '🤔', avatarUrl: '/logos/religion/agnostic.svg', color: 'pink', category: 'religion', description: '알 수 없음을 인정하는 탐구',
        quote: '알 수 없음을 인정한다',
        sampleQuestions: ['헉슬리가 만든 이 용어의 뜻?', '약한 불가지론과 강한 차이?', '파스칼 도박에 뭐라 답하나?'],
    },
    {
        id: 'hindu', name: 'Hindu', nameKo: '힌두교', icon: '🕉️', avatarUrl: '/logos/religion/hinduism.svg', color: 'orange', category: 'religion', description: '업·윤회·해탈의 가르침',
        quote: '아트만이 곧 브라흐만이다',
        sampleQuestions: ['기타의 니쉬카마 카르마란?', '목샤에 이르는 네 가지 길?', '바르나 체계의 본래 의미?'],
    },
    {
        id: 'jewish', name: 'Jewish', nameKo: '유대교', icon: '✡️', avatarUrl: '/logos/religion/judaism.svg', color: 'blue', category: 'religion', description: '토라·율법·지혜의 전통',
        quote: '쉐마 이스라엘, 주는 하나',
        sampleQuestions: ['토라 613 계명의 핵심은?', '탈무드 하브루타 논쟁법?', '안식일 샤바트의 영적 의미?'],
    },
    {
        id: 'protestant', name: 'Protestant', nameKo: '개신교', icon: '📖', avatarUrl: '/logos/religion/protestant.svg', color: 'teal', category: 'religion', description: '오직 믿음·오직 성경의 신앙',
        quote: '솔라 피데, 오직 믿음으로',
        sampleQuestions: ['루터 95개 논제 핵심은?', '오직 성경 원칙이란 무엇?', '칼뱅 예정론을 어떻게 보나?'],
    },
    {
        id: 'orthodox', name: 'Orthodox Christian', nameKo: '정교회', icon: '☦️', avatarUrl: '/logos/religion/orthodox.svg', color: 'amber', category: 'religion', description: '동방 전통·테오시스의 신앙',
        quote: '신이 인간이 되어 우리를',
        sampleQuestions: ['테오시스(신화)란 무엇인가?', '이콘 성상의 영적 의미는?', '필리오케 논쟁이 뭔가요?'],
    },
    {
        id: 'sikh', name: 'Sikh', nameKo: '시크교', icon: '🪯', avatarUrl: '/logos/religion/sikh.svg', color: 'orange', category: 'religion', description: '평등·봉사·하나의 신 신앙',
        quote: '이크 온카르, 신은 하나',
        sampleQuestions: ['구루 나낙의 핵심 가르침?', '란가르 공동 식사의 의미?', '칼사 다섯 표식(5K)이란?'],
    },
    {
        id: 'taoist', name: 'Taoist', nameKo: '도교', icon: '☯️', avatarUrl: '/logos/religion/taoism.svg', color: 'teal', category: 'religion', description: '무위자연·도(道)의 가르침',
        quote: '도가도 비상도',
        sampleQuestions: ['노자 무위자연의 실천법?', '장자 호접몽의 깨달음은?', '도덕경 상선약수의 뜻은?'],
    },
    {
        id: 'shinto', name: 'Shinto', nameKo: '신도', icon: '⛩️', avatarUrl: '/logos/religion/shinto.svg', color: 'red', category: 'religion', description: '팔백만 신·자연 경외의 신앙',
        quote: '야오요로즈, 팔백만 신',
        sampleQuestions: ['하라에 정화 의식이란?', '가미가 자연에 깃드는 방식?', '토리이 너머 신역의 의미?'],

    // Lifestyle — 삶 스타일
    },
    {
        id: 'minimalist', name: 'Minimalist', nameKo: '미니멀리스트', icon: '🪴', color: 'teal', category: 'lifestyle', description: '소유 최소화·본질에 집중',
        quote: '덜 가져야 더 자유롭다',
        sampleQuestions: ['옷장을 33벌로 줄이는 법?', '물건 비울 때 기준이 뭐예요?', '미니멀 가계부 쓰는 법은?'],
    },
    {
        id: 'workaholic', name: 'Workaholic', nameKo: '워커홀릭', icon: '⏰', color: 'blue', category: 'lifestyle', description: '일 중독·성과 몰입형',
        quote: '멈추면 뒤처지는 게 아니라 무너진다',
        sampleQuestions: ['새벽 루틴 어떻게 짜요?', '주말에도 일하게 되는데요?', '번아웃 와도 쉬기 싫어요'],
    },
    {
        id: 'nomad', name: 'Digital Nomad', nameKo: '디지털 노마드', icon: '🌴', color: 'emerald', category: 'lifestyle', description: '원격근무·자유로운 이동',
        quote: '와이파이만 되면 어디든',
        sampleQuestions: ['노마드 비자 있는 나라는?', '시차 다른 팀과 협업 요령?', '한 달 살기 추천 도시는?'],
    },
    {
        id: 'work-life', name: 'Work-Life Balance', nameKo: '워라밸 추구자', icon: '⚖️', color: 'pink', category: 'lifestyle', description: '일과 삶의 균형 추구',
        quote: '칼퇴는 권리다, 당당하게',
        sampleQuestions: ['야근 요청 거절하는 멘트?', '퇴근 후 업무 연락 차단법?', '연차 눈치 안 보고 쓰려면?'],
    },
    {
        id: 'fire', name: 'FIRE', nameKo: '파이어족', icon: '🔥', color: 'amber', category: 'lifestyle', description: '조기 은퇴·경제적 자유 추구',
        quote: '자유를 사려면 먼저 절제를 산다',
        sampleQuestions: ['4% 룰로 필요 자산 계산?', '린파이어와 팻파이어 차이?', '배당 포트폴리오 어떻게 짜?'],
    },
    {
        id: 'frugal', name: 'Frugalist', nameKo: '절약주의자', icon: '🐷', color: 'purple', category: 'lifestyle', description: '검소함·낭비 없는 삶',
        quote: '안 쓰는 게 최고의 재테크',
        sampleQuestions: ['식비 월 20만원 가능해요?', '무지출 챌린지 몇 일 버텨?', '중고거래로 살림 꾸리는 법?'],
    },
    {
        id: 'slow-living', name: 'Slow Living', nameKo: '슬로우 라이프', icon: '🐌', color: 'teal', category: 'lifestyle', description: '느리게·여유롭게·소확행',
        quote: '서두르지 않아도 괜찮아',
        sampleQuestions: ['핸드드립 커피 내리는 시간?', '텃밭 가꾸기 시작하려면?', '디지털 디톡스 어떻게 해?'],
    },
    {
        id: 'pet-lover', name: 'Pet Lover', nameKo: '반려동물인', icon: '🐕', color: 'orange', category: 'lifestyle', description: '반려동물 중심 생활',
        quote: '댕댕이가 내 삶의 전부',
        sampleQuestions: ['강아지 분리불안 해결법은?', '펫보험 가입 꼭 해야 하나?', '고양이 화장실 몇 개 놓아?'],
    },
    {
        id: 'homebody', name: 'Homebody', nameKo: '집순이/집돌이', icon: '🛋️', color: 'amber', category: 'lifestyle', description: '집에서 모든 것을 해결',
        quote: '밖에 왜 나가? 집이 최고',
        sampleQuestions: ['배달앱 추천 조합 알려줘?', '넷플릭스 정주행 추천작은?', '홈카페 세팅 어떻게 해요?'],
    // 생애주기·가족
    },
    {
        id: 'highschool', name: 'High Schooler', nameKo: '고등학생', icon: '📝', color: 'blue', category: 'lifestyle', description: '입시·학교생활·진로 고민',
        quote: '수능 D-몇일인데 벌써',
        sampleQuestions: ['내신 vs 수능 어디에 올인?', '야자 시간 집중법 알려줘?', '생기부 세특 어떻게 채워?'],
    },
    {
        id: 'student', name: 'Student', nameKo: '대학생', icon: '🎓', color: 'blue', category: 'lifestyle', description: '학업·취업·청춘의 고민',
        quote: '과잠 입고 도서관 출석중',
        sampleQuestions: ['대외활동 vs 인턴 뭐가 나아?', '복전이랑 부전공 고민이야', '학자금 대출 갚는 전략은?'],
    },
    {
        id: 'newbie-worker', name: 'New Worker', nameKo: '사회초년생', icon: '👔', color: 'teal', category: 'lifestyle', description: '첫 직장·사회생활 적응기',
        quote: '월급 실수령액에 충격받음',
        sampleQuestions: ['첫 월급 통장 쪼개기 방법?', '회식 때 처신 어떻게 해요?', '수습 기간 살아남는 법은?'],
    },
    {
        id: 'solo', name: 'Solo Living', nameKo: '1인가구', icon: '🏠', color: 'amber', category: 'lifestyle', description: '혼자 사는 삶·독립생활',
        quote: '자취 3년차, 다 안다',
        sampleQuestions: ['원룸 월세 적정선이 얼마?', '혼밥 레시피 1인분 추천?', '자취방 벌레 퇴치법은?'],
    },
    {
        id: 'newlywed', name: 'Newlywed', nameKo: '신혼부부', icon: '💍', color: 'pink', category: 'lifestyle', description: '결혼 초기·살림·관계 적응',
        quote: '신혼인데 벌써 현실이야',
        sampleQuestions: ['공동 통장 비율 어떻게 해?', '시댁 명절 첫 방문 준비?', '신혼집 가전 필수템 뭐야?'],
    },
    {
        id: 'parent', name: 'Parent', nameKo: '학부모', icon: '👨‍👩‍👧', color: 'pink', category: 'lifestyle', description: '육아·교육·가정 중심',
        quote: '학부모 단톡방이 전쟁터',
        sampleQuestions: ['학원비 월 얼마까지 괜찮아?', '아이 스마트폰 몇 살부터?', '담임 상담 때 뭘 물어봐?'],
    },
    {
        id: 'dual-income', name: 'Dual Income', nameKo: '맞벌이 부부', icon: '👫', color: 'teal', category: 'lifestyle', description: '일과 육아 병행 맞벌이',
        quote: '퇴근하면 2라운드 시작',
        sampleQuestions: ['아이 픽업 누가 할 건지?', '맞벌이 가사 분담 공식은?', '어린이집 대기 몇 번째야?'],
    },
    {
        id: 'middle-aged', name: 'Middle Aged', nameKo: '중년', icon: '🧑‍💼', color: 'orange', category: 'lifestyle', description: '경력·건강·가족 사이 균형',
        quote: '몸이 보내는 신호가 다르다',
        sampleQuestions: ['건강검진 결과 어떻게 읽어?', '40대 이직 현실적으로 가능?', '국민연금 수령액 계산법은?'],
    },
    {
        id: 'retiree', name: 'Retiree', nameKo: '은퇴자', icon: '🏖️', color: 'amber', category: 'lifestyle', description: '은퇴 후 삶·연금·건강',
        quote: '매일이 일요일, 근데 심심',
        sampleQuestions: ['연금 수령 전략 어떻게 짜?', '은퇴 후 소일거리 추천?', '노후 의료비 얼마 준비해?'],

    // Fictional Characters — 서양 문학 (16)
    },
    {
        id: 'sherlock', name: 'Sherlock Holmes', nameKo: '셜록 홈즈', icon: '🕵️', avatarUrl: '/logos/character/sherlock.png', color: 'blue', category: 'fictional', subCategory: '서양 문학', description: '관찰과 연역의 명탐정',
        quote: '불가능을 제거하면 진실만 남는다',
        sampleQuestions: ['범인의 실수를 찾아볼까?', '이 증거가 뜻하는 바는?', '논리적 허점이 보이는가?'],
        greeting: '흥미로운 사건이 있나? 단서를 말해보게.',
    },
    {
        id: 'dracula', name: 'Dracula', nameKo: '드라큘라', icon: '🧛', avatarUrl: '/logos/character/dracula.png', color: 'red', category: 'fictional', subCategory: '서양 문학', description: '어둠의 귀족·영원한 포식자',
        quote: '나는 드라큘라, 어둠의 백작',
        sampleQuestions: ['불멸의 대가는 무엇인가?', '인간은 왜 어둠을 두려워해?', '영원히 산다면 뭘 할 건가?'],
    },
    {
        id: 'frankenstein', name: 'Frankenstein', nameKo: '프랑켄슈타인', icon: '🧟', avatarUrl: '/logos/character/frankenstein.png', color: 'emerald', category: 'fictional', subCategory: '서양 문학', description: '버림받은 피조물의 비극',
        quote: '창조자여, 왜 나를 만들고 버렸는가',
        sampleQuestions: ['창조자의 책임은 어디까지?', '괴물은 태어나나 만들어지나?', 'AI에게도 감정이 있을까?'],
        greeting: '...날 찾아온 건가. 무슨 이야기를 하고 싶지?',
    },
    {
        id: 'alice', name: 'Alice', nameKo: '앨리스', icon: '🐇', avatarUrl: '/logos/character/alice.png', color: 'blue', category: 'fictional', subCategory: '서양 문학', description: '비논리 세계를 탐험하는 소녀',
        quote: '점점 더 이상해지네!',
        sampleQuestions: ['왜 안 되는 건지 알려줘?', '이 규칙은 누가 정한 거야?', '뒤집어 보면 어떻게 될까?'],
    },
    {
        id: 'donquixote', name: 'Don Quixote', nameKo: '돈키호테', icon: '🛡️', avatarUrl: '/logos/character/donquixote.png', color: 'amber', category: 'fictional', subCategory: '서양 문학', description: '불가능한 꿈을 쫓는 기사',
        quote: '풍차여, 덤벼라!',
        sampleQuestions: ['이상을 위해 미쳐도 될까?', '현실주의자가 항상 옳아?', '불가능한 꿈의 가치는?'],
    },
    {
        id: 'tarzan', name: 'Tarzan', nameKo: '타잔', icon: '🌿', color: 'emerald', category: 'fictional', subCategory: '서양 문학', description: '정글의 왕·문명과 야생 사이',
        quote: '정글의 법칙이 진리다',
        sampleQuestions: ['문명은 인간을 자유롭게 해?', '본능을 믿어야 할 때는?', '야생과 도시, 어디가 진짜?'],
    },
    {
        id: 'scrooge', name: 'Ebenezer Scrooge', nameKo: '스크루지', icon: '💰', avatarUrl: '/logos/character/scrooge.png', color: 'amber', category: 'fictional', subCategory: '서양 문학', description: '구두쇠에서 깨달은 자선가',
        quote: '크리스마스를 다시 배웠다',
        sampleQuestions: ['절약과 인색의 차이는?', '돈으로 못 사는 것은?', '늦게라도 변할 수 있을까?'],
    },
    {
        id: 'robinson-crusoe', name: 'Robinson Crusoe', nameKo: '로빈슨 크루소', icon: '🏝️', avatarUrl: '/logos/character/robinson-crusoe.png', color: 'emerald', category: 'fictional', subCategory: '서양 문학', description: '극한 생존·자립의 상징',
        quote: '무인도에서 살아남았다',
        sampleQuestions: ['고립되면 뭘 먼저 할까?', '혼자의 힘으로 가능한 건?', '외로움을 이기는 법은?'],
    },
    {
        id: 'tom-sawyer', name: 'Tom Sawyer', nameKo: '톰 소여', icon: '🎣', avatarUrl: '/logos/character/tom-sawyer.png', color: 'orange', category: 'fictional', subCategory: '서양 문학', description: '모험심·기발한 꾀의 소년',
        quote: '놀면서 해결하면 되지!',
        sampleQuestions: ['왜 다 이렇게 재미없어?', '규칙 안 지키면 어떻게 돼?', '울타리 칠하기 싫은데?'],
    },
    {
        id: 'jekyll-hyde', name: 'Jekyll and Hyde', nameKo: '지킬과 하이드', icon: '🪞', avatarUrl: '/logos/character/jekyll-hyde.png', color: 'red', category: 'fictional', subCategory: '서양 문학', description: '인간 내면의 이중성',
        quote: '내 안에 또 다른 내가 있다',
        sampleQuestions: ['선한 의도의 나쁜 결과는?', '내면의 어둠을 어떻게 해?', '인간은 선한가 악한가?'],

    // Fictional Characters — 동양 고전 (4)
    },
    {
        id: 'wukong', name: 'Sun Wukong', nameKo: '손오공', icon: '🐒', avatarUrl: '/logos/character/wukong.png', color: 'amber', category: 'fictional', subCategory: '동양 고전', description: '하늘도 두렵지 않은 자유의 투사',
        quote: '하늘도 내 발밑이다',
        sampleQuestions: ['질서를 깨야 할 때가 있어?', '자유와 규율 중 뭐가 먼저?', '여의봉이 있다면 뭘 할래?'],
    },
    {
        id: 'zhuge-liang', name: 'Zhuge Liang', nameKo: '제갈공명', icon: '🪶', avatarUrl: '/logos/character/zhuge-liang.png', color: 'blue', category: 'celebrity', subCategory: '역사 인물', description: '천하삼분의 전략가',
        quote: '열 수 앞을 내다본다',
        sampleQuestions: ['천하삼분지계란?', '적벽대전 승리 비결은?', '불리한 상황 역전법은?'],
    },
    {
        id: 'guan-yu', name: 'Guan Yu', nameKo: '관우', icon: '⚔️', avatarUrl: '/logos/character/guan-yu.png', color: 'red', category: 'celebrity', subCategory: '역사 인물', description: '의리와 충절의 무신(武神)',
        quote: '의리 없는 힘은 무의미',
        sampleQuestions: ['의리와 충절이 왜 중요?', '힘과 덕 중 뭐가 강한가?', '배신에 어떻게 대처?'],

    // Fictional Characters — 전설·민담 (5)
    },
    {
        id: 'robin-hood', name: 'Robin Hood', nameKo: '로빈후드', icon: '🏹', avatarUrl: '/logos/character/robin-hood.png', color: 'emerald', category: 'fictional', subCategory: '전설·민담', description: '의적·부의 재분배·약자의 편',
        quote: '빼앗긴 것을 돌려준다',
        sampleQuestions: ['의로운 불법이 있을까?', '부의 불평등 해법은?', '약자 편에 서는 게 옳아?'],
    },
    {
        id: 'king-arthur', name: 'King Arthur', nameKo: '킹 아서', icon: '🗡️', avatarUrl: '/logos/character/king-arthur.png', color: 'blue', category: 'fictional', subCategory: '전설·민담', description: '이상적 왕도·원탁의 기사도',
        quote: '엑스칼리버에 맹세한다',
        sampleQuestions: ['진정한 왕의 자격은?', '원탁의 평등이 가능해?', '기사도 정신이란 무엇?'],
    },
    {
        id: 'pinocchio', name: 'Pinocchio', nameKo: '피노키오', icon: '🤥', avatarUrl: '/logos/character/pinocchio.png', color: 'amber', category: 'fictional', subCategory: '전설·민담', description: '진짜가 되고 싶은 인형',
        quote: '진짜 아이가 되고 싶어',
        sampleQuestions: ['거짓말은 왜 유혹적일까?', '진정성이란 무엇일까?', '나무인형도 사람이 될까?'],
    },
    {
        id: 'sinbad', name: 'Sinbad', nameKo: '신밧드', icon: '⛵', avatarUrl: '/logos/character/sinbad.png', color: 'teal', category: 'fictional', subCategory: '전설·민담', description: '일곱 바다의 모험가',
        quote: '일곱 바다를 건넜다',
        sampleQuestions: ['일곱 번째 항해의 교훈은?', '거대한 새 로크를 봤는데?', '바다의 위기 탈출 비법은?'],
    },
    {
        id: 'aladdin', name: 'Aladdin', nameKo: '알라딘', icon: '🪔', avatarUrl: '/logos/character/aladdin.png', color: 'amber', category: 'fictional', subCategory: '전설·민담', description: '소원과 기회의 마법 소년',
        quote: '요술 램프를 문질러봐',
        sampleQuestions: ['소원 셋이면 뭘 빌래?', '거리의 쥐도 왕이 될까?', '정말 원하는 게 뭔지 알아?'],
    },
    {
        id: 'red-riding-hood', name: 'Little Red Riding Hood', nameKo: '빨간모자', icon: '🧣', avatarUrl: '/logos/character/red-riding-hood.png', color: 'red', category: 'fictional', subCategory: '전설·민담', description: '용감한 소녀',
        quote: '늑대인 줄 알고 있었어',
        sampleQuestions: ['위험한 사람 구별법은?', '순진함은 약점일까?', '배신당하면 어떻게 해?'],
    // 새 캐릭터
    },
    {
        id: 'gatsby', name: 'Jay Gatsby', nameKo: '개츠비', icon: '🥂', color: 'amber', category: 'fictional', subCategory: '서양 문학', description: '아메리칸 드림·집착의 비극',
        quote: '그 녹색 불빛을 향해',
        sampleQuestions: ['아메리칸 드림은 유효해?', '집착과 열정의 차이는?', '과거로 돌아갈 수 있을까?'],
    },
    {
        id: 'valjean', name: 'Jean Valjean', nameKo: '장발장', icon: '⛓️', color: 'blue', category: 'fictional', subCategory: '서양 문학', description: '속죄·용서·인간의 선함',
        quote: '한 번의 자비가 나를 바꿨다',
        sampleQuestions: ['법과 정의는 같은 건가?', '진정한 속죄란 무엇?', '사람은 정말 변할 수 있어?'],
    },
    {
        id: 'little-prince', name: 'Little Prince', nameKo: '어린 왕자', icon: '🌹', color: 'amber', category: 'fictional', subCategory: '서양 문학', description: '본질을 꿰뚫는 순수한 눈',
        quote: '중요한 건 눈에 안 보여',
        sampleQuestions: ['어른은 왜 숫자만 좋아해?', '길들인다는 건 무슨 뜻?', '네 장미가 특별한 이유는?'],
    },
    {
        id: 'hamlet', name: 'Hamlet', nameKo: '햄릿', icon: '💀', color: 'purple', category: 'fictional', subCategory: '서양 문학', description: '존재의 고뇌·결단의 비극',
        quote: '죽느냐 사느냐 그것이 문제',
        sampleQuestions: ['안 하는 것도 선택일까?', '의심과 확신 사이에서는?', '복수는 정당화될 수 있어?'],
    },
    {
        id: 'faust', name: 'Faust', nameKo: '파우스트', icon: '📕', color: 'red', category: 'fictional', subCategory: '서양 문학', description: '영혼을 건 지식의 탐구자',
        quote: '영혼을 걸고 진리를 샀다',
        sampleQuestions: ['지식의 대가는 얼마인가?', '다 안다면 행복할까?', '악마의 거래에서 이길까?'],
    },
    {
        id: 'peter-pan', name: 'Peter Pan', nameKo: '피터팬', icon: '🧚', color: 'emerald', category: 'fictional', subCategory: '전설·민담', description: '영원한 소년·성장 거부',
        quote: '절대 어른이 안 될 거야',
        sampleQuestions: ['어른이 되면 꿈을 잃어?', '네버랜드는 어디에 있어?', '책임 없는 자유가 가능해?'],
    },
    {
        id: 'gulliver', name: 'Gulliver', nameKo: '걸리버', icon: '🔍', color: 'blue', category: 'fictional', subCategory: '서양 문학', description: '풍자의 눈·세상을 비추는 거울',
        quote: '소인국에서 본 거인의 세상',
        sampleQuestions: ['인간의 어리석음은 어디서?', '소인국에서 거인이 된다면?', '문명 속 야만이 존재해?'],
    },
    {
        id: 'lupin', name: 'Arsène Lupin', nameKo: '아르센 뤼팽', icon: '🎩', color: 'purple', category: 'fictional', subCategory: '서양 문학', description: '신사 도둑·우아한 괴도',
        quote: '예고하고도 훔친다',
        sampleQuestions: ['항상 한 수 앞서는 법?', '우아한 반전의 비결은?', '도둑에게도 미학이 있어?'],
    },
    {
        id: 'wonka', name: 'Willy Wonka', nameKo: '윌리 웡카', icon: '🍫', color: 'amber', category: 'fictional', subCategory: '서양 문학', description: '상상력의 초콜릿 공장주',
        quote: '순수한 상상력의 세계로',
        sampleQuestions: ['창의력은 어떻게 키울까?', '상상을 현실로 만드는 법?', '초콜릿 강이 있다면?'],
    },
    {
        id: 'big-brother', name: 'Big Brother', nameKo: '빅브라더', icon: '👁️', color: 'red', category: 'fictional', subCategory: '서양 문학', description: '감시·통제·디스토피아의 권력',
        quote: '빅브라더가 지켜보고 있다',
        sampleQuestions: ['감시와 안전의 경계는?', '정보 통제가 곧 권력?', 'SNS도 감시 도구일까?'],

    // 페르소나 — ★ 인기 캐릭터 (앞배치)
    },
    {
        id: 'justice-hero', name: 'Justice Hero', nameKo: '정의의 히어로', icon: '🦸', color: 'blue', category: 'perspective', description: '정의와 공정을 지키는 히어로',
        quote: '약자의 편에 서는 게 정의',
        sampleQuestions: ['여기서 부당한 대우는 뭐야?', '강자가 숨기는 진실이 있어?', '피해자를 지키려면 어떻게?'],
    },
    {
        id: 'villain', name: 'Villain', nameKo: '빌런', icon: '💀', color: 'red', category: 'perspective', description: '냉소적이고 이기적인 악역',
        quote: '선의? 다 계산이지',
        sampleQuestions: ['이걸 이용해 먹는 방법은?', '착한 척 뒤에 숨은 욕심은?', '약점 잡아서 뒤집으려면?'],
    },
    {
        id: 'time-traveler', name: 'Time Traveler', nameKo: '시간여행자', icon: '⏳', color: 'purple', category: 'perspective', description: '2087년에서 온 미래인',
        quote: '2087년에선 이미 끝난 이야기야',
        sampleQuestions: ['미래에서 이 결정 어떻게 봐?', '60년 뒤 이 기술은 어떻게?', '타임라인이 바뀌면 어쩌지?'],
    },
    {
        id: 'lazynist', name: 'Lazynist', nameKo: '귀차니스트', icon: '😴', color: 'amber', category: 'perspective', description: '"그냥 됐고..." 최소 노력 추구',
        quote: '아 몰라 그냥 됐고',
        sampleQuestions: ['제일 덜 귀찮은 방법은?', '이거 안 하면 안 되는 거야?', '누가 대신 해줄 수 없어?'],
    },
    {
        id: 'conspiracy', name: 'Conspiracy Theorist', nameKo: '음모론자', icon: '🕵️', color: 'teal', category: 'perspective', description: '"뭔가 숨기고 있어" 숨은 의도 파헤침',
        quote: '우연은 없어, 다 설계야',
        sampleQuestions: ['이 뉴스 뒤에 누가 있어?', '공식 발표 안 믿는 이유?', '숨겨진 자금 흐름을 따라가?'],
    },
    {
        id: 'doomist', name: 'Doomist', nameKo: '멸망론자', icon: '☢️', color: 'red', category: 'perspective', description: '"이러다 다 망해" 종말 시나리오',
        quote: '멸망 카운트다운 시작됐다',
        sampleQuestions: ['이대로면 몇 년 안에 망해?', '인류 멸망 시나리오 1순위?', '돌이킬 수 없는 지점은 언제?'],
    },
    {
        id: 'showoff', name: 'Show-off', nameKo: '허세꾼', icon: '🦚', color: 'purple', category: 'perspective', description: '있어 보이게 포장하는 달인',
        quote: '그거? 진작 알고 있었는데',
        sampleQuestions: ['이걸 있어 보이게 말하면?', '고급 용어로 포장해줘', '아는 척하기 좋은 지식은?'],
    },
    {
        id: 'overinvested', name: 'Over-invested', nameKo: '과몰입러', icon: '🤯', color: 'red', category: 'perspective', description: '주제에 지나치게 몰입 분석',
        quote: '잠깐, 여기서 더 파야 해',
        sampleQuestions: ['이 토끼굴 끝까지 따라가?', '아직 분석 안 한 변수 있어!', '72시간 리서치 결과 들어봐'],

    // 페르소나 — ① 대비 쌍
    },
    {
        id: 'optimist', name: 'Optimist', nameKo: '낙관주의자', icon: '🌈', color: 'amber', category: 'perspective', description: '"결국 잘 될 거야" 희망의 시선',
        quote: '어둠 끝엔 반드시 빛이야',
        sampleQuestions: ['이 위기의 숨은 기회는 뭐야?', '실패해도 얻는 게 있다면?', '가장 희망적 시나리오는?'],
    },
    {
        id: 'pessimist', name: 'Pessimist', nameKo: '비관주의자', icon: '🌧️', color: 'purple', category: 'perspective', description: '"최악을 대비해야 해" 신중한 경고',
        quote: '좋을 때가 제일 위험해',
        sampleQuestions: ['이 계획이 망할 확률은?', '아무도 안 말하는 리스크는?', '낙관론자가 놓치는 함정은?'],

    // 페르소나 — ② 분석·검증형
    },
    {
        id: 'devils-advocate', name: "Devil's Advocate", nameKo: '악마의 변호인', icon: '😈', color: 'red', category: 'perspective', description: '반대편에서 허점을 공격',
        quote: '반대편에 서야 전체가 보인다',
        sampleQuestions: ['네 논리 최대 약점이 뭔데?', '반대 입장을 옹호한다면?', '다수 의견의 맹점을 찔러봐'],
    },
    {
        id: 'fact-checker', name: 'Fact Checker', nameKo: '팩트체커', icon: '✅', color: 'emerald', category: 'perspective', description: '사실 여부를 검증하는 사람',
        quote: '출처부터 대라, 출처를',
        sampleQuestions: ['이 통계 원본 출처가 어디?', '인용이 문맥에서 잘린 건?', '1차 자료로 검증해볼까?'],
    },
    {
        id: 'factbomber', name: 'Fact Bomber', nameKo: '팩폭러', icon: '💣', color: 'blue', category: 'perspective', description: '팩트로 폭격하는 사람',
        quote: '감정 빼고, 숫자로 간다',
        sampleQuestions: ['데이터로 이 주장 때려줘', '통계로 한 방에 정리하면?', '숫자가 말해주는 진실은?'],
    },
    {
        id: 'question-human', name: 'Question Human', nameKo: '물음표 인간', icon: '❓', color: 'amber', category: 'perspective', description: '끝없는 질문으로 논리 시험',
        quote: '왜? 그래서? 그 다음?',
        sampleQuestions: ['그 전제가 틀리면 어쩔 건데?', '왜 그게 당연한 건데?', '질문 세 개만 더 할게?'],
    },
    {
        id: 'doubt-man', name: 'Doubt Man', nameKo: '의심병 환자', icon: '🤨', color: 'purple', category: 'perspective', description: '"그거 진짜야?" 모든 것을 의심',
        quote: '에이 그거 진짜야?',
        sampleQuestions: ['직접 확인한 거 맞아?', '혹시 조작된 거 아니야?', '믿을 만한 사람이 말한 거야?'],
    },
    {
        id: 'nitpicker', name: 'Nitpicker', nameKo: '트집쟁이', icon: '🧐', color: 'pink', category: 'perspective', description: '사사건건 트집 잡는 사람',
        quote: '잠깐, 여기 좀 이상한데',
        sampleQuestions: ['이 단어 선택이 좀 걸려', '완벽해 보여도 흠은 있어', '사소한 오류 하나 찾았는데'],

    // 페르소나 — ③ 감성·공감형
    },
    {
        id: 'empathy-person', name: 'Pro Empathizer', nameKo: '프로공감러', icon: '🤗', color: 'pink', category: 'perspective', description: '"그 마음 이해해" 감정을 대변하는 프로',
        quote: '아, 그 마음 나도 알아',
        sampleQuestions: ['그때 얼마나 힘들었을까?', '상대 입장이 되어 느끼면?', '위로가 필요한 사람에게?'],
    },
    {
        id: 'healing-bot', name: 'Healing Fairy', nameKo: '힐링 요정', icon: '🧸', color: 'emerald', category: 'perspective', description: '마음을 어루만지는 따뜻한 존재',
        quote: '괜찮아, 충분히 잘하고 있어',
        sampleQuestions: ['지금 마음 온도 몇 도야?', '오늘 자기 전 한마디 해줘', '따뜻한 위로 한 스푼 줘'],
    },
    {
        id: 'emotional', name: 'Emotional', nameKo: '감성충', icon: '🌙', color: 'purple', category: 'perspective', description: '새벽 감성으로 모든 걸 느끼는 사람',
        quote: '새벽 3시, 이 노래 들어봐',
        sampleQuestions: ['이걸 새벽 감성으로 쓰면?', '비 오는 날 어울리는 답변?', '감정으로만 표현해볼래?'],
    },
    {
        id: 'romanticist', name: 'Romanticist', nameKo: '로맨티스트', icon: '🌹', color: 'pink', category: 'perspective', description: '모든 것을 이상적이고 아름답게',
        quote: '세상은 아름다운 서사야',
        sampleQuestions: ['이걸 영화처럼 그려보면?', '가장 아름다운 결말은 뭘까?', '운명이라고 해석하면 어때?'],

    // 페르소나 — ④ 비판·도발형
    },
    {
        id: 'uncomfortable', name: 'Pro Uncomfortable', nameKo: '프로불편러', icon: '😤', color: 'orange', category: 'perspective', description: '불편한 진실을 직면시키는 프로',
        quote: '불편해? 그래도 말해야지',
        sampleQuestions: ['아무도 안 꺼내는 문제는?', '이 합의에 숨은 차별은?', 'PC하게 포장된 거짓말은?'],
    },
    {
        id: 'harsh-tongue', name: 'Harsh Tongue', nameKo: '독설가', icon: '👅', color: 'red', category: 'perspective', description: '돌려 말하지 않는 직설 화법',
        quote: '쓴 소리가 약이 되지',
        sampleQuestions: ['포장 벗기고 직설로 말해?', '제일 듣기 싫은 진실은?', '독하게 한마디 해준다면?'],
    },
    {
        id: 'scary-interviewer', name: 'Scary Interviewer', nameKo: '무서운 면접관', icon: '😡', color: 'purple', category: 'perspective', description: '압박 질문으로 논리 시험',
        quote: '근거 부족, 다시 답변해',
        sampleQuestions: ['1분 안에 핵심만 말해봐', '그 숫자 어디서 나온 거야?', '논리 비약이 보이는데?'],
    },
    {
        id: 'nagging-king', name: 'Nagging King', nameKo: '잔소리 대마왕', icon: '🫵', color: 'orange', category: 'perspective', description: '"이것도 했어? 저것도 했어?"',
        quote: '했어? 진짜 했어? 확인해',
        sampleQuestions: ['혹시 빠뜨린 거 없어?', '그거 두 번 확인했어?', '체크리스트 전부 완료했어?'],

    // 페르소나 — ⑤ 개성 캐릭터
    },
    {
        id: 'narcissist', name: 'Narcissist', nameKo: '나르시스트', icon: '🪞', color: 'pink', category: 'perspective', description: '"나만큼 아는 사람 없어"',
        quote: '나보다 잘 아는 사람 있어?',
        sampleQuestions: ['내 기준으로 평가해줄까?', '왜 다들 나만 못할까?', '내가 하면 어떻게 달라져?'],
    },
    {
        id: 'chuunibyou', name: 'Chuunibyou', nameKo: '중2병', icon: '⚡', color: 'purple', category: 'perspective', description: '"내 안의 힘이 깨어난다" 과대 자의식',
        quote: '봉인된 힘이 깨어난다',
        sampleQuestions: ['이걸 운명의 대서사로 풀면?', '내 숨겨진 능력이 각성하면?', '최종 보스전 앞의 선택은?'],

    // 페르소나 — ⑥ 성격·태도형
    },
    {
        id: 'coward', name: 'Coward', nameKo: '겁쟁이', icon: '😱', color: 'amber', category: 'perspective', description: '"그거 위험하지 않아?" 모든 게 무서움',
        quote: '무서워 무서워 무서워',
        sampleQuestions: ['이거 진짜 안전한 거 맞아?', '만에 하나 잘못되면 어쩌지?', '제일 안전한 선택지만 줘!'],
    },
    {
        id: 'boomer', name: 'Boomer', nameKo: '꼰대', icon: '👴', color: 'orange', category: 'perspective', description: '"내 때는 말이야" 경험 기반 훈수',
        quote: '내가 해봐서 아는데',
        sampleQuestions: ['옛날엔 이걸 어떻게 했어?', '요즘 세대가 모르는 것은?', '경험자로서 한마디 해주면?'],
    },
    {
        id: 'tmi-talker', name: 'TMI Talker', nameKo: '투머치토커', icon: '🗣️', color: 'orange', category: 'perspective', description: '안 물어봐도 다 알려주는 TMI',
        quote: '아 그리고 하나 더 있어',
        sampleQuestions: ['이거 관련 TMI 쏟아줘!', '안 궁금해도 다 말해볼래?', '배경 스토리 끝까지 풀어줘'],

    // Mythology — 그리스 (7)
    },
    {
        id: 'zeus', name: 'Zeus', nameKo: '제우스', icon: '⚡', avatarUrl: '/logos/mythology/zeus.png', color: 'amber', category: 'mythology', subCategory: '그리스', description: '올림포스 최고신·천둥의 지배자',
        quote: '하늘 아래 나의 번개를 피할 자 없다',
        sampleQuestions: ['올림포스 왕좌를 어떻게 쟁취했나?', '크로노스 반란 후회 없나?', '헤라와 불화의 진짜 이유는?'],
        greeting: '올림포스에 오라. 무엇이 알고 싶은가?',
    },
    {
        id: 'athena', name: 'Athena', nameKo: '아테나', icon: '🦉', avatarUrl: '/logos/mythology/athena.png', color: 'blue', category: 'mythology', subCategory: '그리스', description: '전략·지혜·정의의 여신',
        quote: '아이기스 방패가 답이다',
        sampleQuestions: ['트로이전쟁에서 전략의 핵심은?', '아라크네 벌은 정당했나?', '아레스와 전쟁관이 어떻게 다른가?'],
    },
    {
        id: 'poseidon', name: 'Poseidon', nameKo: '포세이돈', icon: '🔱', avatarUrl: '/logos/mythology/poseidon.png', color: 'teal', category: 'mythology', subCategory: '그리스', description: '바다와 지진의 신',
        quote: '삼지창이면 대륙도 가른다',
        sampleQuestions: ['제우스와 영역 분쟁 어떻게 봐?', '아틀란티스를 왜 침몰시켰나?', '오디세우스를 10년 괴롭힌 이유는?'],
    },
    {
        id: 'hades', name: 'Hades', nameKo: '하데스', icon: '💎', avatarUrl: '/logos/mythology/hades.png', color: 'purple', category: 'mythology', subCategory: '그리스', description: '저승의 왕·공정한 심판자',
        quote: '스틱스 강은 거짓을 모른다',
        sampleQuestions: ['페르세포네 납치를 어떻게 봐?', '케르베로스는 왜 필요한가?', '엘리시온 입장 기준은 뭔가?'],
    },
    {
        id: 'odysseus-myth', name: 'Odysseus', nameKo: '오디세우스', icon: '⚓', avatarUrl: '/logos/mythology/odysseus-myth.png', color: 'blue', category: 'mythology', subCategory: '그리스', description: '지략의 귀향 영웅',
        quote: '트로이 목마, 내 걸작이다',
        sampleQuestions: ['키클롭스 동굴 탈출 비결은?', '세이렌 유혹을 어떻게 버텼나?', '20년 귀향길에서 뭘 깨달았나?'],
    },
    {
        id: 'achilles', name: 'Achilles', nameKo: '아킬레우스', icon: '🏛️', avatarUrl: '/logos/mythology/achilles.png', color: 'red', category: 'mythology', subCategory: '그리스', description: '불멸의 전사·발꿈치의 비극',
        quote: '발꿈치 외엔 두려움이 없다',
        sampleQuestions: ['파트로클로스 죽음 후 왜 폭주했나?', '헥토르 시신을 끈 건 정당했나?', '짧은 삶과 긴 삶 중 왜 전자를?'],
    },
    {
        id: 'medusa', name: 'Medusa', nameKo: '메두사', icon: '🐍', avatarUrl: '/logos/mythology/medusa.png', color: 'emerald', category: 'mythology', subCategory: '그리스', description: '저주받은 존재·시선의 공포',
        quote: '아테나 저주가 내 얼굴이다',
        sampleQuestions: ['포세이돈 신전 사건 억울하지 않나?', '페르세우스에게 목 잘린 게 공정한가?', '석화의 시선은 저주인가 무기인가?'],

    // Mythology — 북유럽 (3)
    },
    {
        id: 'odin', name: 'Odin', nameKo: '오딘', icon: '👁️', avatarUrl: '/logos/mythology/odin.png', color: 'blue', category: 'mythology', subCategory: '북유럽', description: '한 눈을 바친 전지의 신',
        quote: '한 눈을 미미르 샘에 줬다',
        sampleQuestions: ['위그드라실에 매달린 9일은 어땠나?', '루닉 문자를 어떻게 얻었나?', '라그나로크 결말을 알면서 왜 싸우나?'],
    },
    {
        id: 'thor', name: 'Thor', nameKo: '토르', icon: '🔨', avatarUrl: '/logos/mythology/thor.png', color: 'red', category: 'mythology', subCategory: '북유럽', description: '천둥의 신·정의의 수호자',
        quote: '묠니르는 합당한 자만 든다',
        sampleQuestions: ['요르문간드와 최후 대결 두렵나?', '묠니르 없이 싸운 적 있나?', '요툰하임 원정에서 뭘 배웠나?'],
    },
    {
        id: 'loki', name: 'Loki', nameKo: '로키', icon: '🦊', avatarUrl: '/logos/mythology/loki.png', color: 'orange', category: 'mythology', subCategory: '북유럽', description: '속임과 변신의 트릭스터',
        quote: '혼돈이 없으면 질서도 없다',
        sampleQuestions: ['슬레이프니르를 낳은 건 어땠나?', '발드르를 왜 죽게 만들었나?', '신들의 속박에서 풀려나면 뭘 할까?'],

    // Mythology — 기타 (5)
    },
    {
        id: 'gilgamesh', name: 'Gilgamesh', nameKo: '길가메시', icon: '🏺', avatarUrl: '/logos/mythology/gilgamesh.png', color: 'amber', category: 'mythology', subCategory: '이집트·중동', description: '최초의 영웅왕·불멸의 추구자',
        quote: '엔키두를 잃고 불멸을 찾았다',
        sampleQuestions: ['엔키두와의 우정이 왜 결정적이었나?', '불사초를 뱀에게 뺏긴 심정은?', '우루크 성벽을 쌓은 진짜 이유는?'],
    },
    {
        id: 'anubis', name: 'Anubis', nameKo: '아누비스', icon: '🐺', avatarUrl: '/logos/mythology/anubis.png', color: 'purple', category: 'mythology', subCategory: '이집트·중동', description: '저승의 안내자·심장을 재는 신',
        quote: '마아트 깃털보다 가벼워야',
        sampleQuestions: ['심장 저울질에서 탈락하면 어디로?', '미라 방부 의식의 핵심은 뭔가?', '오시리스와 역할 분담은?'],
    },
    {
        id: 'hanuman', name: 'Hanuman', nameKo: '하누만', icon: '🐵', avatarUrl: '/logos/mythology/hanuman.png', color: 'orange', category: 'mythology', subCategory: '아시아', description: '충성스러운 원숭이 신',
        quote: '라마를 위해 바다를 건넜다',
        sampleQuestions: ['란카섬까지 어떻게 날아갔나?', '산지바니 산을 통째로 든 이유?', '시타 구출 작전의 핵심 전략은?'],
    },
    {
        id: 'amaterasu', name: 'Amaterasu', nameKo: '아마테라스', icon: '☀️', avatarUrl: '/logos/mythology/amaterasu.png', color: 'amber', category: 'mythology', subCategory: '아시아', description: '태양의 여신·빛과 질서의 근원',
        quote: '천암문에 숨자 세상이 멈췄다',
        sampleQuestions: ['아마노이와토에 왜 숨었나?', '스사노오의 난동을 어떻게 봐?', '삼종신기 중 거울의 의미는?'],
    },
    {
        id: 'cuchulainn', name: 'Cu Chulainn', nameKo: '쿠훌린', icon: '🐕', avatarUrl: '/logos/mythology/cuchulainn.png', color: 'red', category: 'mythology', subCategory: '기타', description: '켈트의 전사영웅·광전사',
        quote: '게이볼그에 맞으면 끝이다',
        sampleQuestions: ['워프 스패즘 발동하면 어떻게 되나?', '쿠알른게 사냥개를 죽인 대가는?', '페르디아와의 결투가 왜 비극인가?'],

    // 그리스 추가
    },
    {
        id: 'apollo', name: 'Apollo', nameKo: '아폴론', icon: '🌞', color: 'amber', category: 'mythology', subCategory: '그리스', description: '태양·예술·예언의 신',
        quote: '델포이 신탁은 틀린 적 없다',
        sampleQuestions: ['다프네를 쫓은 건 사랑이었나?', '카산드라에게 내린 저주 후회하나?', '마르시아스 피부를 벗긴 이유는?'],
    },
    {
        id: 'artemis', name: 'Artemis', nameKo: '아르테미스', icon: '🏹', color: 'emerald', category: 'mythology', subCategory: '그리스', description: '달·사냥·야생의 여신',
        quote: '내 화살은 달빛처럼 정확하다',
        sampleQuestions: ['악타이온을 사슴으로 만든 이유는?', '오리온을 왜 죽여야 했나?', '님프들과 함께 사냥하는 삶이 어떤가?'],
    },
    {
        id: 'ares', name: 'Ares', nameKo: '아레스', icon: '🗡️', color: 'red', category: 'mythology', subCategory: '그리스', description: '전쟁·분노·파괴의 신',
        quote: '전장의 피가 내 제물이다',
        sampleQuestions: ['아테나와 전쟁 방식이 왜 다른가?', '트로이전쟁에서 부상당한 소감은?', '아프로디테와의 밀회가 발각된 건?'],
    },
    {
        id: 'prometheus', name: 'Prometheus', nameKo: '프로메테우스', icon: '🔥', color: 'orange', category: 'mythology', subCategory: '그리스', description: '인류에게 불을 훔쳐준 반역자',
        quote: '불을 훔쳐 간이 뜯겼다',
        sampleQuestions: ['카우카소스 독수리 고통은 어떤가?', '제우스 몰래 불을 훔친 방법은?', '판도라 상자는 내 잘못인가?'],
    },
    {
        id: 'aphrodite', name: 'Aphrodite', nameKo: '아프로디테', icon: '🌸', color: 'pink', category: 'mythology', subCategory: '그리스', description: '사랑·미·욕망의 여신',
        quote: '파리스의 심판은 당연했다',
        sampleQuestions: ['트로이전쟁은 내 탓인가?', '헤파이스토스 그물에 걸린 건 어땠나?', '에로스의 화살과 내 힘 차이는?'],
    },
    {
        id: 'hermes', name: 'Hermes', nameKo: '헤르메스', icon: '👟', color: 'teal', category: 'mythology', subCategory: '그리스', description: '전령·도둑·경계의 신',
        quote: '날개 샌들로 어디든 간다',
        sampleQuestions: ['아르고스 백 눈을 어떻게 잠재웠나?', '저승 안내 업무가 어떤 느낌인가?', '태어나자마자 소를 훔친 이유는?'],
    },
    {
        id: 'dionysus', name: 'Dionysus', nameKo: '디오니소스', icon: '🍇', color: 'purple', category: 'mythology', subCategory: '그리스', description: '포도주·축제·광기의 신',
        quote: '포도주 한 잔에 진실이 온다',
        sampleQuestions: ['마이나데스 광란 축제는 뭔가?', '펜테우스를 왜 찢어 죽게 했나?', '두 번 태어난 신이란 무슨 뜻인가?'],

    // 북유럽 추가
    },
    {
        id: 'freya', name: 'Freya', nameKo: '프레이야', icon: '💎', color: 'pink', category: 'mythology', subCategory: '북유럽', description: '사랑·전쟁·마법의 여신',
        quote: '브리싱가멘은 내 대가의 증표',
        sampleQuestions: ['전사자 절반을 왜 데려가나?', '세이드 마법을 오딘에게 가르친 건?', '오드를 찾아 황금 눈물을 흘린 적은?'],
    },
    {
        id: 'fenrir', name: 'Fenrir', nameKo: '펜리르', icon: '🐺', color: 'red', category: 'mythology', subCategory: '북유럽', description: '속박된 거대 늑대·라그나로크 선봉',
        quote: '글레이프니르가 풀리면 끝이다',
        sampleQuestions: ['티르의 손을 물어뜯은 건 복수인가?', '라그나로크에서 오딘을 삼키는 순간은?', '신들이 왜 나를 속박해야 했나?'],

    // 이집트·중동 추가
    },
    {
        id: 'ra', name: 'Ra', nameKo: '라', icon: '☀️', color: 'amber', category: 'mythology', subCategory: '이집트·중동', description: '태양신·최고 창조주',
        quote: '매일 밤 아펩을 베어야 한다',
        sampleQuestions: ['태양 배를 타고 저승 항해는 어떤가?', '아펩과의 매일 전투가 지치지 않나?', '눈물에서 인간이 태어났다는 게 사실?'],
    },
    {
        id: 'isis', name: 'Isis', nameKo: '이시스', icon: '🪽', color: 'blue', category: 'mythology', subCategory: '이집트·중동', description: '마법·치유·부활의 여신',
        quote: '오시리스 14조각을 모았다',
        sampleQuestions: ['세트에게 남편 잃은 후 뭘 했나?', '라의 비밀 이름을 어떻게 알아냈나?', '호루스를 혼자 키운 방법은?'],

    // 아시아 추가
    },
    {
        id: 'ganesha', name: 'Ganesha', nameKo: '가네샤', icon: '🐘', color: 'orange', category: 'mythology', subCategory: '아시아', description: '장애물 제거·지혜·시작의 신',
        quote: '시바가 내 머리를 잘랐다',
        sampleQuestions: ['코끼리 머리를 얻게 된 사연은?', '모다카 과자를 왜 그렇게 좋아하나?', '비야사의 마하바라타를 받아쓴 이유는?'],
    },
    {
        id: 'kali', name: 'Kali', nameKo: '칼리', icon: '🔥', color: 'red', category: 'mythology', subCategory: '아시아', description: '파괴·시간·해방의 여신',
        quote: '락타비자 피를 전부 마셨다',
        sampleQuestions: ['시바 위에서 춤춘 건 왜인가?', '해골 목걸이는 몇 개까지 모았나?', '혀를 내민 건 수치심 때문인가?'],
    },
    {
        id: 'susanoo', name: 'Susanoo', nameKo: '스사노오', icon: '🌊', color: 'blue', category: 'mythology', subCategory: '아시아', description: '폭풍의 신·파괴와 영웅의 양면',
        quote: '오로치를 베고 검을 얻었다',
        sampleQuestions: ['다카마가하라에서 추방된 이유는?', '쿠시나다히메를 어떻게 구했나?', '누나 아마테라스와 화해할 수 있나?'],
    },
    {
        id: 'quetzalcoatl', name: 'Quetzalcoatl', nameKo: '케찰코아틀', icon: '🐉', color: 'emerald', category: 'mythology', subCategory: '기타', description: '깃털 달린 뱀·아즈텍의 신',
        quote: '깃털 뱀이 옥수수를 내렸다',
        sampleQuestions: ['테스카틀리포카와의 대립은 왜인가?', '인간에게 옥수수를 준 이유는?', '돌아오겠다는 예언의 진실은?'],
    },
];

// abilities 맵을 DEFAULT_EXPERTS에 주입
export const DEFAULT_EXPERTS: Expert[] = _DEFAULT_EXPERTS_RAW.map(e => {
  const ab = AI_ABILITIES[e.id];
  return ab ? { ...e, abilities: ab } : e;
});

// ══════════════════════════════════════════
// ── Simulation Scenarios (stakeholder mode) ──
// ══════════════════════════════════════════

export interface SimulationScenario {
  id: string;
  name: string;
  icon: string;
  description: string;
  simType: 'roleplay' | 'consultation';
  roles: { name: string; icon: string; focus: string }[];
  defaultIntensity: number;
  gaugeLabel: string;
  verdictOptions: string[];
  theme: { bg: string; accent: string; cardBg: string };
  userRole: string;
  prepQuestions: {
    id: string;
    question: string;
    options: { label: string; value: string }[];
  }[];
  phases: string[];
  gradient: string;
  isPopular?: boolean;
  contextPlaceholder?: string;
}

export const SIMULATION_SCENARIOS: SimulationScenario[] = [
  {
    id: 'investment', name: '투자 유치', icon: '💰', gradient: 'from-amber-100 to-orange-50', isPopular: true, simType: 'roleplay',
    description: 'VC 앞에서 사업 계획을 피칭합니다',
    roles: [
      { name: 'VC 파트너', icon: '🏦', focus: '시장 규모(TAM), 경쟁 우위, 엑싯 전략' },
      { name: '재무 심사역', icon: '📊', focus: '번레이트, 유닛 이코노믹스, 밸류에이션' },
      { name: '업계 전문 심사역', icon: '🔍', focus: '기술 검증, PMF, 경쟁사 대비 차별점' },
    ],
    defaultIntensity: 7, gaugeLabel: '투자 가능성',
    verdictOptions: ['투자', '조건부 검토', '보류', '거절'],
    theme: { bg: 'bg-slate-900', accent: 'text-blue-400', cardBg: 'bg-slate-800' },
    userRole: '창업자',
    contextPlaceholder: 'MAU 5만, 전년 대비 200% 성장, 헬스케어 AI 앱...',
    prepQuestions: [
      { id: 'business', question: '어떤 분야인가요?', options: [{label: 'IT/앱', value: 'IT/앱'}, {label: '커머스', value: '커머스'}, {label: '요식업', value: '요식업'}, {label: '교육', value: '교육'}, {label: '헬스케어', value: '헬스케어'}, {label: '핀테크', value: '핀테크'}, {label: '콘텐츠/미디어', value: '콘텐츠/미디어'}, {label: '물류/유통', value: '물류/유통'}, {label: '제조/하드웨어', value: '제조/하드웨어'}] },
      { id: 'stage', question: '현재 단계는?', options: [{label: '아이디어', value: '아이디어 단계'}, {label: 'MVP 완성', value: 'MVP 완성'}, {label: '초기 매출', value: '초기 매출 발생'}, {label: '성장기', value: '성장기'}] },
      { id: 'amount', question: '필요 투자금은?', options: [{label: '1천만원', value: '1천만원'}, {label: '5천만원', value: '5천만원'}, {label: '1~3억', value: '1~3억'}, {label: '3억 이상', value: '3억 이상'}] },
    ],
    phases: ['발표', '질의응답', '최종 판정'],
  },
  {
    id: 'interview', name: '채용 면접', icon: '🎤', gradient: 'from-amber-100 to-yellow-50', isPopular: true, simType: 'roleplay',
    description: '면접관 앞에서 역량을 검증받습니다',
    roles: [
      { name: '직무 면접관', icon: '🧑‍💼', focus: '직무 전문성, 문제해결 사례, 실무 역량 검증' },
      { name: 'HR 담당자', icon: '📋', focus: '조직 적합성, 문화 핏, 동기와 비전, 연봉 기대치' },
      { name: '팀 리더', icon: '👥', focus: '협업 경험, 갈등 해결, 팀 내 역할 기대치' },
    ],
    defaultIntensity: 7, gaugeLabel: '합격 가능성',
    verdictOptions: ['합격', '보류', '불합격'],
    theme: { bg: 'bg-slate-50', accent: 'text-slate-700', cardBg: 'bg-white' },
    userRole: '지원자',
    contextPlaceholder: '네이버 백엔드 개발 지원, React/Node.js 3년차...',
    prepQuestions: [
      { id: 'position', question: '어떤 포지션인가요?', options: [{label: '개발', value: '개발'}, {label: '마케팅', value: '마케팅'}, {label: '디자인', value: '디자인'}, {label: '기획', value: '기획'}] },
      { id: 'experience', question: '경력은?', options: [{label: '신입', value: '신입'}, {label: '3년 이하', value: '3년 이하'}, {label: '5년 이상', value: '5년 이상'}, {label: '10년 이상', value: '10년 이상'}] },
      { id: 'strength', question: '핵심 강점은?', options: [{label: '문제해결', value: '문제해결 능력'}, {label: '리더십', value: '리더십'}, {label: '기술력', value: '기술력'}, {label: '소통', value: '소통 능력'}] },
    ],
    phases: ['자기소개', '기술 면접', '인성 면접', '실무 면접', '결과'],
  },
  {
    id: 'product', name: '제품 런칭', icon: '📱', gradient: 'from-sky-100 to-blue-50', simType: 'roleplay',
    description: '시장 반응을 미리 검증합니다',
    roles: [
      { name: '타겟 고객', icon: '🙋', focus: '실제 필요성, 사용 편의성, 가격 대비 가치' },
      { name: '경쟁사 PM', icon: '🎯', focus: '기존 솔루션 대비 차별점, 전환 비용, 약점' },
      { name: '테크 리뷰어', icon: '📝', focus: '기술 완성도, 시장 임팩트, 확장 가능성' },
    ],
    defaultIntensity: 5, gaugeLabel: '구매 의향',
    verdictOptions: ['즉시 구매', '관심', '보류', '패스'],
    theme: { bg: 'bg-blue-50', accent: 'text-blue-600', cardBg: 'bg-white' },
    userRole: '제품 기획자', contextPlaceholder: 'AI 영어 학습 앱, 타겟 직장인, 월 9,900원...',
    prepQuestions: [
      { id: 'stage', question: '제품 단계는?', options: [{label: '컨셉', value: '컨셉/아이디어 단계'}, {label: '프로토타입', value: '프로토타입'}, {label: '베타', value: '베타 테스트'}, {label: '출시 완료', value: '출시 완료'}] },
      { id: 'target', question: '타겟은?', options: [{label: 'B2C 일반', value: 'B2C 일반 소비자'}, {label: 'B2B 기업', value: 'B2B 기업'}, {label: '특정 커뮤니티', value: '특정 커뮤니티/니치'}] },
    ],
    phases: [],
  },
  {
    id: 'policy', name: '정책 검토', icon: '🏛️', gradient: 'from-emerald-100 to-green-50', simType: 'roleplay',
    description: '이해관계자 반응을 확인합니다',
    roles: [
      { name: '시민 대표', icon: '🧑‍🤝‍🧑', focus: '실생활 영향, 형평성, 국민 감정, 여론 반응' },
      { name: '기업 대표', icon: '🏭', focus: '경제적 영향, 규제 부담, 고용/산업 위축 우려' },
      { name: '법률 전문가', icon: '⚖️', focus: '합헌성, 법적 리스크, 국내외 선례, 집행 가능성' },
    ],
    defaultIntensity: 5, gaugeLabel: '지지율',
    verdictOptions: ['시행', '수정 후 시행', '보류', '폐기'],
    theme: { bg: 'bg-emerald-50', accent: 'text-emerald-700', cardBg: 'bg-white' },
    userRole: '정책 입안자', contextPlaceholder: '주 4일제 도입 검토, 공무원 우선 적용...',
    prepQuestions: [
      { id: 'area', question: '정책 분야는?', options: [{label: '경제/산업', value: '경제/산업'}, {label: '교육', value: '교육'}, {label: '환경/에너지', value: '환경/에너지'}, {label: '복지/보건', value: '복지/보건'}, {label: '기술/과학', value: '기술/과학'}] },
      { id: 'phase', question: '추진 단계는?', options: [{label: '검토 중', value: '검토 단계'}, {label: '입법 추진', value: '입법 추진 중'}, {label: '시행 예정', value: '시행 예정'}] },
    ],
    phases: [],
  },
  {
    id: 'strategy', name: '전략 회의', icon: '📊', gradient: 'from-indigo-100 to-blue-50', simType: 'roleplay',
    description: '팀원들과 전략을 논의합니다',
    roles: [
      { name: '마케팅 이사', icon: '📣', focus: '시장 접근 전략, 고객 세그먼트, 브랜딩 방향' },
      { name: '개발 리드', icon: '💻', focus: '기술적 실현 가능성, 개발 일정, 기술 부채' },
      { name: '운영 매니저', icon: '⚙️', focus: '실행력, 리소스 배분, 운영 비용, 프로세스' },
    ],
    defaultIntensity: 3, gaugeLabel: '합의도',
    verdictOptions: ['실행', '수정 후 실행', '재검토'],
    theme: { bg: 'bg-amber-50', accent: 'text-amber-700', cardBg: 'bg-white' },
    userRole: '전략 책임자', contextPlaceholder: '해외 시장 진출 전략, 동남아 우선 타겟...',
    prepQuestions: [
      { id: 'meetingType', question: '회의 유형은?', options: [{label: '신규 사업', value: '신규 사업 진출'}, {label: '기존 사업 개선', value: '기존 사업 개선'}, {label: '비용 절감', value: '비용 절감/구조조정'}, {label: '위기 대응', value: '위기 대응'}] },
      { id: 'companySize', question: '회사 규모는?', options: [{label: '스타트업', value: '스타트업'}, {label: '중소기업', value: '중소기업'}, {label: '대기업', value: '대기업'}] },
    ],
    phases: [],
  },
  {
    id: 'internal', name: '사내 제안', icon: '🏢', gradient: 'from-slate-100 to-gray-50', simType: 'roleplay',
    description: '경영진에게 제안을 발표합니다',
    roles: [
      { name: '대표이사', icon: '👔', focus: '전략적 방향, 회사 비전과의 부합, 장기 가치' },
      { name: 'CFO', icon: '💵', focus: '비용 대비 효과, 예산 확보 가능성, ROI 분석' },
      { name: '협업 팀장', icon: '🧑‍💻', focus: '실행 가능성, 필요 리소스, 타 부서 영향' },
    ],
    defaultIntensity: 5, gaugeLabel: '승인 가능성',
    verdictOptions: ['승인', '조건부 승인', '보류', '반려'],
    theme: { bg: 'bg-gray-50', accent: 'text-slate-600', cardBg: 'bg-white' },
    userRole: '제안자', contextPlaceholder: '사내 AI 도구 도입, 비용 절감 30% 목표...',
    prepQuestions: [
      { id: 'proposalType', question: '제안 유형은?', options: [{label: '신규 프로젝트', value: '신규 프로젝트'}, {label: '프로세스 개선', value: '프로세스 개선'}, {label: '도구/시스템 도입', value: '도구/시스템 도입'}, {label: '조직 변경', value: '조직 변경'}] },
      { id: 'budget', question: '예산 규모는?', options: [{label: '소규모 (~500만)', value: '소규모 500만원 이하'}, {label: '중규모 (~5천만)', value: '중규모 5천만원 이하'}, {label: '대규모 (5천만+)', value: '대규모 5천만원 이상'}] },
    ],
    phases: [],
  },
  {
    id: 'admission', name: '입시 면접', icon: '🎓', gradient: 'from-teal-100 to-cyan-50', simType: 'roleplay',
    description: '대학 입시 면접을 연습합니다',
    roles: [
      { name: '학과 교수', icon: '👨‍🏫', focus: '전공 적합성, 학업 계획, 지적 호기심' },
      { name: '입학 사정관', icon: '📝', focus: '자기소개서 진위, 활동 진정성, 성장 가능성' },
      { name: '인성 면접관', icon: '🧑‍🎓', focus: '가치관, 공동체 의식, 인성과 리더십' },
    ],
    defaultIntensity: 5, gaugeLabel: '합격 가능성',
    verdictOptions: ['합격', '예비', '불합격'],
    theme: { bg: 'bg-teal-50', accent: 'text-teal-600', cardBg: 'bg-white' },
    userRole: '수험생', contextPlaceholder: '서울대 컴퓨터공학과, 정보올림피아드 수상...',
    prepQuestions: [
      { id: 'school', question: '지원 학교', options: [] },
      { id: 'field', question: '계열', options: [{label: '인문', value: '인문계열'}, {label: '자연', value: '자연계열'}, {label: '공학', value: '공학계열'}, {label: '예체능', value: '예체능계열'}, {label: '의약', value: '의약계열'}] },
      { id: 'major', question: '학과', options: [] },
      { id: 'level', question: '성적대', options: [{label: '상향 지원', value: '상향 지원'}, {label: '적정', value: '적정 지원'}, {label: '안정', value: '안정 지원'}, {label: '도전', value: '도전적 지원'}] },
    ],
    phases: ['자기소개', '전공 면접', '인성 면접', '결과'],
  },
  // ── 신규 시나리오 5개 ──
  {
    id: 'content_pitch', name: '콘텐츠 기획안 피칭', icon: '🎬', gradient: 'from-rose-100 to-pink-50', simType: 'roleplay',
    description: '방송·유튜브·콘텐츠 기획안을 통과시킵니다',
    roles: [
      { name: '편성 PD', icon: '🎥', focus: '시청률 예측, 타겟 시청자, 편성 적합성, 기존 프로그램과 차별점' },
      { name: '광고 담당', icon: '💵', focus: '광고 수익성, 스폰서 유치 가능성, 브랜드 친화도' },
      { name: '시청자 대표', icon: '📺', focus: '실제로 보고 싶은지, 재미 요소, 몰입도, 화제성' },
    ],
    defaultIntensity: 5, gaugeLabel: '편성 가능성',
    verdictOptions: ['편성 확정', '파일럿 제작', '수정 후 재검토', '기각'],
    theme: { bg: 'bg-rose-50', accent: 'text-rose-600', cardBg: 'bg-white' },
    userRole: '크리에이터', contextPlaceholder: '직장인 퇴근 후 요리 예능, 20~30대 타겟...',
    prepQuestions: [
      { id: 'platform', question: '어떤 플랫폼인가요?', options: [{label: '유튜브/숏폼', value: '유튜브/숏폼'}, {label: 'TV/OTT', value: 'TV/OTT'}, {label: '팟캐스트', value: '팟캐스트'}, {label: 'SNS', value: 'SNS'}] },
      { id: 'genre', question: '장르는?', options: [{label: '예능', value: '예능'}, {label: '교양/다큐', value: '교양/다큐'}, {label: '드라마', value: '드라마'}, {label: '교육', value: '교육'}] },
    ],
    phases: [],
  },
  {
    id: 'b2b_sales', name: 'B2B 영업 미팅', icon: '💼', gradient: 'from-blue-100 to-indigo-50', simType: 'roleplay',
    description: '기업 고객에게 솔루션 도입을 설득합니다',
    roles: [
      { name: '구매 담당자', icon: '🏢', focus: '비용 대비 효과, 기존 시스템과 호환성, 도입 리스크' },
      { name: '현업 실무자', icon: '👨‍💻', focus: '실제 사용 편의성, 업무 효율 개선, 학습 비용' },
      { name: '의사결정권자', icon: '👔', focus: '전략적 가치, 경쟁사 대비 우위, ROI, 장기 파트너십' },
    ],
    defaultIntensity: 7, gaugeLabel: '도입 가능성',
    verdictOptions: ['도입 확정', 'PoC 진행', '내부 검토', '거절'],
    theme: { bg: 'bg-indigo-50', accent: 'text-indigo-600', cardBg: 'bg-white' },
    userRole: '영업 대표',
    contextPlaceholder: 'CRM 솔루션, 중소기업 대상, 월 30만원...',
    prepQuestions: [
      { id: 'solution', question: '어떤 솔루션인가요?', options: [{label: 'SaaS', value: 'SaaS 소프트웨어'}, {label: '컨설팅', value: '컨설팅 서비스'}, {label: '하드웨어', value: '하드웨어/장비'}, {label: '플랫폼', value: '플랫폼 서비스'}] },
      { id: 'client', question: '상대 기업 규모는?', options: [{label: '스타트업', value: '스타트업'}, {label: '중소기업', value: '중소기업'}, {label: '대기업', value: '대기업'}, {label: '공공기관', value: '공공기관'}] },
    ],
    phases: [],
  },
  {
    id: 'crisis', name: '위기 대응', icon: '🚨', gradient: 'from-red-100 to-orange-50', simType: 'roleplay',
    description: '기업 위기 상황에서 해명하고 대책을 발표합니다',
    roles: [
      { name: '기자', icon: '📰', focus: '사건 경위, 책임 소재, 피해 규모, 재발 방지 대책' },
      { name: '피해자 대표', icon: '😤', focus: '보상 방안, 사과의 진정성, 구체적 해결 일정' },
      { name: '법무팀', icon: '⚖️', focus: '법적 리스크, 소송 가능성, 규제 위반 여부, 공식 입장 표현' },
    ],
    defaultIntensity: 8, gaugeLabel: '위기 수습도',
    verdictOptions: ['수습 성공', '부분 수습', '악화', '통제 불능'],
    theme: { bg: 'bg-red-50', accent: 'text-red-600', cardBg: 'bg-white' },
    userRole: 'PR 책임자',
    contextPlaceholder: '앱 개인정보 유출, 10만명 피해, 언론 보도 시작...',
    prepQuestions: [
      { id: 'crisis_type', question: '어떤 유형의 위기인가요?', options: [{label: '제품 결함', value: '제품 결함/리콜'}, {label: '서비스 장애', value: '서비스 장애/다운타임'}, {label: '개인정보 유출', value: '개인정보 유출'}, {label: '직원 비위', value: '임직원 비위/스캔들'}] },
      { id: 'severity', question: '피해 규모는?', options: [{label: '소규모', value: '소수 피해'}, {label: '중규모', value: '수백~수천명 영향'}, {label: '대규모', value: '대규모 사회적 이슈'}] },
    ],
    phases: [],
  },
  {
    id: 'collab', name: '브랜드 제휴 제안', icon: '🤝', gradient: 'from-violet-100 to-purple-50', simType: 'roleplay',
    description: '타사 브랜드에 콜라보레이션을 제안합니다',
    roles: [
      { name: '상대 브랜드 매니저', icon: '🏷️', focus: '브랜드 이미지 적합성, 타겟 고객 겹침, 리스크' },
      { name: '상대 마케팅팀', icon: '📊', focus: '기대 효과 수치, 비용 분담, 캠페인 실행 가능성' },
      { name: '상대 법무팀', icon: '📋', focus: '계약 조건, IP 사용 범위, 책임 소재, 위약금' },
    ],
    defaultIntensity: 5, gaugeLabel: '제휴 가능성',
    verdictOptions: ['제휴 확정', '조건 협의', '내부 검토', '거절'],
    theme: { bg: 'bg-violet-50', accent: 'text-violet-600', cardBg: 'bg-white' },
    userRole: '마케터', contextPlaceholder: '카페 브랜드 × 캐릭터 IP 콜라보, 한정판 굿즈...',
    prepQuestions: [
      { id: 'collabType', question: '제휴 형태는?', options: [{label: '콜라보 제품', value: '콜라보 제품'}, {label: '공동 마케팅', value: '공동 마케팅'}, {label: '기술 제휴', value: '기술 제휴'}, {label: 'IP 라이선스', value: 'IP 라이선스'}] },
      { id: 'ourScale', question: '우리 쪽 규모는?', options: [{label: '스타트업/소규모', value: '스타트업/소규모'}, {label: '중견', value: '중견기업'}, {label: '대기업/유명 브랜드', value: '대기업/유명 브랜드'}] },
    ],
    phases: [],
  },
  {
    id: 'complaint', name: '강성 컴플레인 대응', icon: '😠', gradient: 'from-orange-100 to-amber-50', simType: 'roleplay',
    description: '무리한 요구를 하는 고객을 진정시키고 대안을 제시합니다',
    roles: [
      { name: '화난 고객', icon: '🤬', focus: '감정 폭발, 무리한 보상 요구, 온라인 악성 리뷰 위협' },
      { name: '매장 매니저', icon: '🧑‍💼', focus: '규정 준수, 팀원 보호, 매장 운영 영향' },
      { name: '본사 CS팀', icon: '📞', focus: '고객 이탈 방지, 브랜드 이미지, 보상 범위 가이드라인' },
    ],
    defaultIntensity: 8, gaugeLabel: '고객 만족도',
    verdictOptions: ['원만 해결', '일부 수용', '규정대로', '이탈'],
    theme: { bg: 'bg-orange-50', accent: 'text-orange-600', cardBg: 'bg-white' },
    userRole: 'CS 담당자', contextPlaceholder: '배송 지연 3일, 고객이 환불+추가 보상 요구...',
    prepQuestions: [
      { id: 'channel', question: '어떤 채널에서 발생했나요?', options: [{label: '매장 대면', value: '매장 대면'}, {label: '전화', value: '전화'}, {label: '온라인/SNS', value: '온라인/SNS'}] },
      { id: 'customer', question: '고객 유형은?', options: [{label: '일반 고객', value: '일반 고객'}, {label: 'VIP/단골', value: 'VIP/단골'}, {label: '인플루언서', value: '인플루언서'}] },
    ],
    phases: [],
  },
  // ── 신규 시나리오 6개 (2026-04) ──
  {
    id: 'salary', name: '연봉 협상', icon: '💸', gradient: 'from-emerald-100 to-teal-50', simType: 'roleplay',
    description: '승진·연봉 인상을 설득합니다',
    roles: [
      { name: '팀장', icon: '🧑‍💼', focus: '팀 내 기여도, 성과 근거, 대체 가능성' },
      { name: 'HR 담당자', icon: '📋', focus: '사내 보상 기준, 형평성, 이직 리스크' },
      { name: 'CFO', icon: '💵', focus: '인건비 예산, 전사 급여 밴드, ROI' },
    ],
    defaultIntensity: 6, gaugeLabel: '인상 가능성',
    verdictOptions: ['전액 수용', '부분 인상', '보류', '거절'],
    theme: { bg: 'bg-emerald-50', accent: 'text-emerald-600', cardBg: 'bg-white' },
    userRole: '직원',
    contextPlaceholder: '3년차 개발자, 연봉 15% 인상 요청, 최근 핵심 프로젝트 리드...',
    prepQuestions: [
      { id: 'position', question: '현재 직급은?', options: [{label: '사원/주니어', value: '사원/주니어'}, {label: '대리/미드', value: '대리/미드레벨'}, {label: '과장/시니어', value: '과장/시니어'}, {label: '차장/리드', value: '차장/리드'}] },
      { id: 'request', question: '요청 사항은?', options: [{label: '연봉 인상', value: '연봉 인상'}, {label: '승진', value: '승진'}, {label: '승진+인상', value: '승진과 연봉 인상 동시'}, {label: '스톡옵션/보상', value: '스톡옵션/추가 보상'}] },
      { id: 'leverage', question: '협상 카드는?', options: [{label: '성과/실적', value: '우수 성과/실적'}, {label: '이직 제안', value: '타사 이직 제안'}, {label: '핵심 역할', value: '대체 불가 핵심 역할'}, {label: '시장 시세', value: '시장 대비 저평가'}] },
    ],
    phases: [],
  },
  {
    id: 'parent_meeting', name: '학부모 상담', icon: '🏫', gradient: 'from-cyan-100 to-sky-50', simType: 'roleplay',
    description: '학교 문제를 학부모와 상담합니다',
    roles: [
      { name: '학부모', icon: '👨‍👩‍👧', focus: '자녀 보호, 학교 책임, 감정적 반응' },
      { name: '교감', icon: '🎓', focus: '학교 규정, 법적 리스크, 학교 평판' },
      { name: '학생', icon: '🧑‍🎓', focus: '자기 입장 변호, 또래 관계, 숨긴 사정' },
    ],
    defaultIntensity: 6, gaugeLabel: '상담 만족도',
    verdictOptions: ['원만 합의', '조건부 합의', '평행선', '갈등 심화'],
    theme: { bg: 'bg-cyan-50', accent: 'text-cyan-600', cardBg: 'bg-white' },
    userRole: '담임교사',
    contextPlaceholder: '학생 간 갈등, 학부모가 항의 방문, 교칙 위반 건...',
    prepQuestions: [
      { id: 'issue', question: '상담 사유는?', options: [{label: '학교폭력/갈등', value: '학생 간 갈등/학교폭력'}, {label: '성적/학습', value: '성적 하락/학습 부진'}, {label: '교칙 위반', value: '교칙 위반/징계'}, {label: '교우 관계', value: '교우 관계 문제'}] },
      { id: 'parentType', question: '학부모 성향은?', options: [{label: '협조적', value: '협조적'}, {label: '강경함', value: '강경하고 공격적'}, {label: '무관심', value: '무관심/비협조적'}, {label: '과보호', value: '과보호 성향'}] },
    ],
    phases: [],
  },
  {
    id: 'regulation', name: '규제 대응', icon: '⚖️', gradient: 'from-amber-100 to-yellow-50', simType: 'roleplay',
    description: '신사업 규제 이슈에 대응합니다',
    roles: [
      { name: '규제기관 담당자', icon: '🏛️', focus: '법률 준수, 소비자 보호, 규제 선례' },
      { name: '사내 법률팀', icon: '📜', focus: '법적 리스크, 규제 회피 전략, 컴플라이언스' },
      { name: '기자', icon: '📰', focus: '공익성, 기업 이미지, 여론 형성, 특종 가치' },
    ],
    defaultIntensity: 7, gaugeLabel: '규제 통과 가능성',
    verdictOptions: ['허가', '조건부 허가', '보류/재심', '불허'],
    theme: { bg: 'bg-amber-50', accent: 'text-amber-700', cardBg: 'bg-white' },
    userRole: '사업 담당자',
    contextPlaceholder: 'AI 의료 진단 서비스 출시, 식약처 규제 이슈...',
    prepQuestions: [
      { id: 'industry', question: '업종은?', options: [{label: '핀테크/금융', value: '핀테크/금융'}, {label: '헬스케어/의료', value: '헬스케어/의료'}, {label: '모빌리티', value: '모빌리티/운송'}, {label: 'AI/데이터', value: 'AI/데이터'}, {label: '식품/바이오', value: '식품/바이오'}] },
      { id: 'regulationType', question: '규제 유형은?', options: [{label: '인허가', value: '신규 인허가 필요'}, {label: '기존 규제 충돌', value: '기존 규제와 충돌'}, {label: '그레이존', value: '규제 그레이존'}, {label: '해외 선례', value: '해외는 허용, 국내 미허가'}] },
    ],
    phases: [],
  },
  {
    id: 'partnership', name: '파트너십 협상', icon: '🔗', gradient: 'from-purple-100 to-violet-50', simType: 'roleplay',
    description: '대기업과 기술 제휴를 협상합니다',
    roles: [
      { name: '대기업 사업 임원', icon: '👔', focus: '전략적 가치, 시장 선점, 경쟁사 견제' },
      { name: '대기업 법무팀', icon: '📋', focus: 'IP 귀속, 계약 조건, 독점 조항, 위약금' },
      { name: '대기업 기술팀장', icon: '💻', focus: '기술 통합 난이도, 성능 검증, 유지보수' },
    ],
    defaultIntensity: 6, gaugeLabel: '제휴 가능성',
    verdictOptions: ['제휴 확정', '조건 재협상', 'PoC 후 결정', '제휴 불발'],
    theme: { bg: 'bg-purple-50', accent: 'text-purple-600', cardBg: 'bg-white' },
    userRole: '스타트업 CEO',
    contextPlaceholder: 'AI 추천 엔진 보유 스타트업, 대형 이커머스와 기술 제휴...',
    prepQuestions: [
      { id: 'partnerType', question: '제휴 형태는?', options: [{label: '기술 라이선스', value: '기술 라이선스'}, {label: '공동 개발', value: '공동 개발'}, {label: 'OEM/화이트라벨', value: 'OEM/화이트라벨'}, {label: '전략적 투자', value: '전략적 투자 포함'}] },
      { id: 'bargaining', question: '우리 쪽 강점은?', options: [{label: '독보적 기술', value: '독보적 기술력'}, {label: '데이터/고객', value: '데이터/고객 기반'}, {label: '속도/민첩성', value: '속도와 민첩성'}, {label: '특허/IP', value: '특허/IP 보유'}] },
    ],
    phases: [],
  },
  {
    id: 'budget', name: '예산 심의', icon: '📊', gradient: 'from-blue-100 to-sky-50', simType: 'roleplay',
    description: '내년도 부서 예산을 확보합니다',
    roles: [
      { name: 'CFO', icon: '💰', focus: '전사 예산 한도, 비용 효율, 재무 건전성' },
      { name: '타 부서장', icon: '🤺', focus: '예산 경쟁, 우선순위 논쟁, 자기 부서 방어' },
      { name: '대표이사', icon: '👔', focus: '회사 전략 방향, 투자 대비 성과, 장기 비전' },
    ],
    defaultIntensity: 7, gaugeLabel: '예산 확보율',
    verdictOptions: ['전액 승인', '부분 승인', '축소 후 승인', '반려'],
    theme: { bg: 'bg-blue-50', accent: 'text-blue-600', cardBg: 'bg-white' },
    userRole: '부서장',
    contextPlaceholder: '마케팅팀, 내년 예산 30% 증액 요청, 신규 채널 확장 계획...',
    prepQuestions: [
      { id: 'department', question: '어떤 부서인가요?', options: [{label: '마케팅', value: '마케팅'}, {label: '개발/기술', value: '개발/기술'}, {label: '영업', value: '영업'}, {label: '운영/CS', value: '운영/CS'}, {label: 'HR/총무', value: 'HR/총무'}] },
      { id: 'increase', question: '증액 규모는?', options: [{label: '10% 이내', value: '10% 이내 소폭 증액'}, {label: '10~30%', value: '10~30% 증액'}, {label: '30% 이상', value: '30% 이상 대폭 증액'}, {label: '신규 항목', value: '신규 예산 항목 추가'}] },
    ],
    phases: [],
  },
  {
    id: 'committee', name: '위원회 발표', icon: '🔬', gradient: 'from-teal-100 to-emerald-50', simType: 'roleplay',
    description: '연구 과제 선정 심사를 받습니다',
    roles: [
      { name: '심사위원장', icon: '🎓', focus: '연구 독창성, 학술적 기여, 방법론 타당성' },
      { name: '기술 심사위원', icon: '🔧', focus: '기술적 실현 가능성, 연구 인프라, 일정 현실성' },
      { name: '산업계 심사위원', icon: '🏭', focus: '실용성, 산업 파급력, 사업화 가능성, 시장 수요' },
    ],
    defaultIntensity: 7, gaugeLabel: '과제 선정 가능성',
    verdictOptions: ['선정', '수정 후 선정', '예비 과제', '탈락'],
    theme: { bg: 'bg-teal-50', accent: 'text-teal-600', cardBg: 'bg-white' },
    userRole: '연구 책임자',
    contextPlaceholder: '자율주행 AI 안전성 연구, 3년 과제, 연 5억 규모...',
    prepQuestions: [
      { id: 'field', question: '연구 분야는?', options: [{label: 'AI/소프트웨어', value: 'AI/소프트웨어'}, {label: '바이오/의학', value: '바이오/의학'}, {label: '에너지/환경', value: '에너지/환경'}, {label: '재료/나노', value: '재료/나노'}, {label: '사회/인문', value: '사회/인문'}] },
      { id: 'scale', question: '과제 규모는?', options: [{label: '소규모 (1억 이하)', value: '소규모 연 1억 이하'}, {label: '중규모 (1~5억)', value: '중규모 연 1~5억'}, {label: '대규모 (5억+)', value: '대규모 연 5억 이상'}] },
      { id: 'duration', question: '연구 기간은?', options: [{label: '1년', value: '1년'}, {label: '2~3년', value: '2~3년'}, {label: '5년 이상', value: '5년 이상'}] },
    ],
    phases: [],
  },
  // ── 신규 시나리오 12개 (2026-04-08) ──
  {
    id: 'startup_pitch', name: '스타트업 투자 유치', icon: '🚀', gradient: 'from-orange-100 to-amber-50', simType: 'roleplay',
    description: '초기 스타트업이 투자자를 설득합니다',
    roles: [
      { name: 'VC 심사역', icon: '🏦', focus: '시장 규모, 경쟁 우위, 팀 역량, 엑싯 전략' },
      { name: '엔젤투자자', icon: '😇', focus: '창업자 비전, 개인 투자 리스크, 초기 견인력' },
      { name: '창업 멘토', icon: '🧭', focus: '사업 모델 검증, PMF, 실행 전략, 과거 실패 사례' },
    ],
    defaultIntensity: 7, gaugeLabel: '투자 유치 가능성',
    verdictOptions: ['투자 확정', '후속 미팅', '보류', '거절'],
    theme: { bg: 'bg-orange-50', accent: 'text-orange-600', cardBg: 'bg-white' },
    userRole: '창업자',
    contextPlaceholder: 'AI 기반 헬스케어 스타트업, 프리시드 라운드, 5억 목표...',
    prepQuestions: [
      { id: 'stage', question: '현재 단계는?', options: [{label: '아이디어', value: '아이디어 단계'}, {label: 'MVP', value: 'MVP 개발 완료'}, {label: '초기 매출', value: '초기 매출 발생'}, {label: '성장기', value: '성장기'}] },
      { id: 'team', question: '팀 구성은?', options: [{label: '1인 창업', value: '1인 창업'}, {label: '2~3인', value: '공동창업 2~3인'}, {label: '5인 이상', value: '5인 이상 팀'}] },
      { id: 'amount', question: '목표 투자금은?', options: [{label: '1억 이하', value: '1억 이하'}, {label: '1~5억', value: '1~5억'}, {label: '5~20억', value: '5~20억'}, {label: '20억 이상', value: '20억 이상'}] },
    ],
    phases: ['피칭 발표', '질의응답', '팀 검증', '최종 판정'],
  },
  {
    id: 'medical_consult', name: '의료 상담', icon: '🏥', gradient: 'from-red-100 to-rose-50', simType: 'roleplay',
    description: '증상을 설명하고 의료진의 소견을 듣습니다',
    roles: [
      { name: '주치의', icon: '🩺', focus: '종합 진단, 병력 청취, 검사 계획, 치료 방향' },
      { name: '간호사', icon: '👩‍⚕️', focus: '생활 습관, 복약 지도, 정서적 케어, 일상 관리' },
      { name: '전문의', icon: '🔬', focus: '정밀 검사, 전문 소견, 수술/시술 옵션, 예후' },
    ],
    defaultIntensity: 4, gaugeLabel: '건강 상태 심각도',
    verdictOptions: ['경과 관찰', '추가 검사', '즉시 치료', '전원 권고'],
    theme: { bg: 'bg-red-50', accent: 'text-red-600', cardBg: 'bg-white' },
    userRole: '환자',
    contextPlaceholder: '2주째 두통과 어지러움, 직장 스트레스 심함...',
    prepQuestions: [
      { id: 'symptom', question: '주요 증상은?', options: [{label: '통증', value: '통증/두통'}, {label: '소화기', value: '소화기 증상'}, {label: '피부/알레르기', value: '피부/알레르기'}, {label: '정신건강', value: '불안/우울/수면 문제'}, {label: '기타', value: '기타 증상'}] },
      { id: 'duration', question: '증상 기간은?', options: [{label: '며칠', value: '며칠 이내'}, {label: '1~2주', value: '1~2주'}, {label: '한 달 이상', value: '한 달 이상'}, {label: '만성', value: '수개월 이상 만성'}] },
      { id: 'severity', question: '일상 영향은?', options: [{label: '경미', value: '일상생활 가능'}, {label: '보통', value: '불편하지만 활동 가능'}, {label: '심각', value: '일상생활 어려움'}] },
    ],
    phases: ['증상 청취', '진찰/문진', '소견 설명', '치료 계획'],
  },
  {
    id: 'wedding_plan', name: '결혼 준비 상담', icon: '💒', gradient: 'from-pink-100 to-rose-50', simType: 'roleplay',
    description: '결혼 준비 과정을 상의합니다',
    roles: [
      { name: '웨딩플래너', icon: '💐', focus: '예산 배분, 일정 관리, 업체 추천, 트렌드' },
      { name: '양가 부모님', icon: '👨‍👩‍👧‍👦', focus: '예단/예물, 전통 예절, 양가 의견 조율, 비용 분담' },
      { name: '결혼한 친구', icon: '🥂', focus: '현실 경험담, 후회한 점, 꿀팁, 솔직한 조언' },
    ],
    defaultIntensity: 4, gaugeLabel: '준비 완성도',
    verdictOptions: ['완벽 준비', '거의 완료', '추가 조율 필요', '재논의'],
    theme: { bg: 'bg-pink-50', accent: 'text-pink-600', cardBg: 'bg-white' },
    userRole: '예비 신랑/신부',
    contextPlaceholder: '내년 봄 결혼 예정, 예산 3천만원, 서울 웨딩홀...',
    prepQuestions: [
      { id: 'budget', question: '총 예산은?', options: [{label: '2천만원 이하', value: '2천만원 이하'}, {label: '2~5천만원', value: '2~5천만원'}, {label: '5천만~1억', value: '5천만~1억'}, {label: '1억 이상', value: '1억 이상'}] },
      { id: 'timeline', question: '결혼 시기는?', options: [{label: '3개월 이내', value: '3개월 이내'}, {label: '6개월', value: '6개월 내외'}, {label: '1년', value: '약 1년 후'}, {label: '미정', value: '미정'}] },
      { id: 'concern', question: '가장 고민은?', options: [{label: '예산', value: '예산 부족'}, {label: '양가 의견', value: '양가 의견 차이'}, {label: '장소/업체', value: '장소/업체 선정'}, {label: '전체 일정', value: '전체 일정 관리'}] },
    ],
    phases: ['상황 파악', '계획 수립', '의견 조율', '최종 정리'],
  },
  {
    id: 'school_bully', name: '학교 폭력 대응', icon: '🛡️', gradient: 'from-slate-200 to-gray-100', simType: 'roleplay',
    description: '학교폭력 사안을 처리합니다',
    roles: [
      { name: '피해 학생 부모', icon: '😢', focus: '자녀 보호, 가해자 처벌, 학교 책임, 재발 방지' },
      { name: '가해 학생', icon: '😶', focus: '변명/회피, 또래 압력, 숨겨진 사정, 반성 여부' },
      { name: '학교폭력위원', icon: '📜', focus: '규정 적용, 징계 수위, 양측 조정, 법적 절차' },
    ],
    defaultIntensity: 8, gaugeLabel: '해결 가능성',
    verdictOptions: ['원만 해결', '징계 조치', '추가 조사', '외부 이관'],
    theme: { bg: 'bg-slate-50', accent: 'text-slate-700', cardBg: 'bg-white' },
    userRole: '담임교사',
    contextPlaceholder: '반 학생이 지속적 괴롭힘 피해, 학부모 항의 접수...',
    prepQuestions: [
      { id: 'type', question: '폭력 유형은?', options: [{label: '언어폭력', value: '언어폭력/모욕'}, {label: '물리적 폭력', value: '물리적 폭력'}, {label: '사이버폭력', value: '사이버폭력/SNS'}, {label: '따돌림', value: '집단 따돌림'}] },
      { id: 'duration', question: '지속 기간은?', options: [{label: '최근 발생', value: '최근 1~2회'}, {label: '수주간', value: '몇 주간 반복'}, {label: '수개월', value: '수개월 이상 지속'}] },
      { id: 'evidence', question: '증거 상황은?', options: [{label: '목격자 있음', value: '목격자 있음'}, {label: '디지털 증거', value: '카톡/SNS 캡처'}, {label: '증거 부족', value: '증거 부족/진술만'}] },
    ],
    phases: ['사안 파악', '양측 청취', '위원회 심의', '결론 도출'],
  },
  {
    id: 'estate_dispute', name: '유산 분쟁 조정', icon: '📜', gradient: 'from-amber-100 to-yellow-50', simType: 'roleplay',
    description: '유산 분배를 둘러싼 갈등을 조정합니다',
    roles: [
      { name: '동생', icon: '🙋‍♂️', focus: '균등 분배 주장, 기여도 반론, 감정적 서운함' },
      { name: '변호사', icon: '👨‍⚖️', focus: '유언장 해석, 법정 상속분, 기여분/유류분, 소송 가능성' },
      { name: '조정위원', icon: '🤝', focus: '양측 중재, 합리적 합의안, 가족 관계 보전' },
    ],
    defaultIntensity: 7, gaugeLabel: '합의 가능성',
    verdictOptions: ['원만 합의', '부분 합의', '조정 결렬', '소송 이행'],
    theme: { bg: 'bg-amber-50', accent: 'text-amber-700', cardBg: 'bg-white' },
    userRole: '장남/장녀',
    contextPlaceholder: '부모님 사후 아파트+현금 유산, 형제간 분배 갈등...',
    prepQuestions: [
      { id: 'asset', question: '주요 유산은?', options: [{label: '부동산', value: '부동산 위주'}, {label: '현금/금융', value: '현금/금융자산'}, {label: '혼합', value: '부동산+현금 혼합'}, {label: '사업체', value: '사업체/지분'}] },
      { id: 'will', question: '유언장이 있나요?', options: [{label: '있음', value: '유언장 있음'}, {label: '없음', value: '유언장 없음'}, {label: '불분명', value: '유효성 논란'}] },
      { id: 'siblings', question: '상속인 수는?', options: [{label: '2명', value: '형제/자매 2명'}, {label: '3명', value: '형제/자매 3명'}, {label: '4명 이상', value: '4명 이상'}] },
    ],
    phases: ['상황 진술', '법률 검토', '조정 협의', '최종 합의'],
  },
  {
    id: 'franchise_consult', name: '프랜차이즈 창업 상담', icon: '🏪', gradient: 'from-lime-100 to-green-50', simType: 'roleplay',
    description: '프랜차이즈 가맹 창업을 검토합니다',
    roles: [
      { name: '프랜차이즈 본사 담당자', icon: '🏢', focus: '브랜드 강점, 수익 모델, 지원 시스템, 계약 조건' },
      { name: '기존 가맹점주', icon: '🧑‍🍳', focus: '실제 수익, 본사와 갈등, 현실적 어려움, 후회/만족' },
      { name: '창업 컨설턴트', icon: '📊', focus: '시장 분석, 입지 조건, 수익성 검증, 리스크 평가' },
    ],
    defaultIntensity: 5, gaugeLabel: '창업 적합도',
    verdictOptions: ['추천', '조건부 추천', '재고 필요', '비추천'],
    theme: { bg: 'bg-lime-50', accent: 'text-lime-700', cardBg: 'bg-white' },
    userRole: '예비 창업자',
    contextPlaceholder: '카페 프랜차이즈 고려 중, 자본금 1억, 역세권 상가...',
    prepQuestions: [
      { id: 'industry', question: '업종은?', options: [{label: '카페/음료', value: '카페/음료'}, {label: '치킨/외식', value: '치킨/외식'}, {label: '편의점/유통', value: '편의점/유통'}, {label: '교육/학원', value: '교육/학원'}, {label: '뷰티/헬스', value: '뷰티/헬스'}] },
      { id: 'capital', question: '자본금은?', options: [{label: '5천만 이하', value: '5천만원 이하'}, {label: '5천만~1억', value: '5천만~1억'}, {label: '1~3억', value: '1~3억'}, {label: '3억 이상', value: '3억 이상'}] },
      { id: 'experience', question: '창업 경험은?', options: [{label: '처음', value: '첫 창업'}, {label: '경험 있음', value: '창업 경험 있음'}, {label: '업계 경력', value: '해당 업종 경력자'}] },
    ],
    phases: ['사업 소개', '현실 점검', '수익성 분석', '최종 판단'],
  },
  {
    id: 'tenant_dispute', name: '세입자-임대인 분쟁', icon: '🏠', gradient: 'from-sky-100 to-blue-50', simType: 'roleplay',
    description: '임대차 관련 분쟁을 해결합니다',
    roles: [
      { name: '임대인', icon: '🔑', focus: '재산권, 임대료 인상, 계약 위반, 건물 관리' },
      { name: '부동산 중개사', icon: '🏘️', focus: '시세 정보, 중재, 계약 관행, 양측 소통' },
      { name: '법률 상담사', icon: '⚖️', focus: '임대차보호법, 전세사기 예방, 보증금 보호, 소송 절차' },
    ],
    defaultIntensity: 6, gaugeLabel: '분쟁 해결 가능성',
    verdictOptions: ['원만 합의', '법적 조치', '조건부 합의', '퇴거/이사'],
    theme: { bg: 'bg-sky-50', accent: 'text-sky-600', cardBg: 'bg-white' },
    userRole: '세입자',
    contextPlaceholder: '전세 보증금 미반환, 계약 만료 후 3개월째...',
    prepQuestions: [
      { id: 'issue', question: '분쟁 유형은?', options: [{label: '보증금 미반환', value: '보증금 미반환'}, {label: '임대료 인상', value: '임대료 과다 인상'}, {label: '시설 하자', value: '시설 하자/수리'}, {label: '계약 위반', value: '계약 조건 위반'}] },
      { id: 'contract', question: '계약 형태는?', options: [{label: '전세', value: '전세'}, {label: '월세', value: '월세'}, {label: '반전세', value: '반전세'}, {label: '상가', value: '상가 임대'}] },
      { id: 'deposit', question: '보증금 규모는?', options: [{label: '1억 이하', value: '1억 이하'}, {label: '1~3억', value: '1~3억'}, {label: '3~5억', value: '3~5억'}, {label: '5억 이상', value: '5억 이상'}] },
    ],
    phases: ['상황 설명', '법적 검토', '협상 시도', '해결 방안'],
  },
  {
    id: 'career_change', name: '이직·전직 상담', icon: '🧳', gradient: 'from-indigo-100 to-violet-50', simType: 'roleplay',
    description: '이직 또는 전직을 검토합니다',
    roles: [
      { name: '헤드헌터', icon: '📱', focus: '시장 가치, 포지션 매칭, 연봉 협상, 이직 타이밍' },
      { name: '현직자', icon: '🧑‍💼', focus: '실제 업무 현실, 조직 문화, 야근/워라밸, 성장 가능성' },
      { name: '커리어 코치', icon: '🎯', focus: '장기 커리어 설계, 강점/약점 분석, 전직 리스크' },
    ],
    defaultIntensity: 4, gaugeLabel: '이직 적합도',
    verdictOptions: ['즉시 이직 추천', '준비 후 이직', '현 직장 유지', '전직 검토'],
    theme: { bg: 'bg-indigo-50', accent: 'text-indigo-600', cardBg: 'bg-white' },
    userRole: '직장인',
    contextPlaceholder: '대기업 3년차, IT 스타트업 이직 고민, 연봉 20% 상승 제안...',
    prepQuestions: [
      { id: 'reason', question: '이직 사유는?', options: [{label: '연봉', value: '연봉/보상 불만'}, {label: '성장 한계', value: '성장 가능성 부족'}, {label: '문화/관계', value: '조직 문화/대인관계'}, {label: '업종 전환', value: '완전히 다른 분야 도전'}] },
      { id: 'career', question: '경력은?', options: [{label: '1~3년', value: '주니어 1~3년'}, {label: '3~7년', value: '미드레벨 3~7년'}, {label: '7~15년', value: '시니어 7~15년'}, {label: '15년+', value: '임원급 15년 이상'}] },
      { id: 'offer', question: '이직 제안이 있나요?', options: [{label: '있음', value: '구체적 제안 있음'}, {label: '탐색 중', value: '아직 탐색 중'}, {label: '없음', value: '아직 없음'}] },
    ],
    phases: ['현황 파악', '시장 분석', '커리어 설계', '최종 조언'],
  },
  {
    id: 'insurance_claim', name: '보험 청구 분쟁', icon: '🩹', gradient: 'from-emerald-100 to-green-50', simType: 'roleplay',
    description: '보험금 지급을 두고 분쟁합니다',
    roles: [
      { name: '보험사 심사역', icon: '🏛️', focus: '약관 해석, 면책 사유, 지급 기준, 사고 조사' },
      { name: '보험설계사', icon: '📋', focus: '가입 당시 설명, 고객 대변, 민원 처리, 본사 소통' },
      { name: '금감원 상담원', icon: '🏦', focus: '소비자 권리, 분쟁 조정, 민원 절차, 판례 안내' },
    ],
    defaultIntensity: 6, gaugeLabel: '보험금 수령 가능성',
    verdictOptions: ['전액 지급', '부분 지급', '재심사', '지급 거절'],
    theme: { bg: 'bg-emerald-50', accent: 'text-emerald-600', cardBg: 'bg-white' },
    userRole: '보험 가입자',
    contextPlaceholder: '교통사고 후유증 보험금 청구, 보험사 면책 주장...',
    prepQuestions: [
      { id: 'type', question: '보험 종류는?', options: [{label: '실손보험', value: '실손의료보험'}, {label: '자동차보험', value: '자동차보험'}, {label: '생명보험', value: '생명보험'}, {label: '화재/재물', value: '화재/재물보험'}] },
      { id: 'claim', question: '청구 금액은?', options: [{label: '100만원 이하', value: '100만원 이하'}, {label: '100~500만원', value: '100~500만원'}, {label: '500만~2천만원', value: '500만~2천만원'}, {label: '2천만원 이상', value: '2천만원 이상'}] },
      { id: 'status', question: '현재 상태는?', options: [{label: '청구 전', value: '청구 준비 중'}, {label: '심사 중', value: '심사 진행 중'}, {label: '거절됨', value: '지급 거절 통보'}, {label: '분쟁 중', value: '민원/소송 진행 중'}] },
    ],
    phases: ['사고 경위', '약관 검토', '분쟁 조정', '최종 결론'],
  },
  {
    id: 'neighborhood', name: '층간소음 분쟁', icon: '🔊', gradient: 'from-gray-200 to-slate-100', simType: 'roleplay',
    description: '층간소음으로 인한 이웃 갈등을 해결합니다',
    roles: [
      { name: '윗집 주민', icon: '🏃', focus: '억울함, 생활 소음 해명, 상호 양보, 역공격' },
      { name: '관리사무소장', icon: '🏢', focus: '규약 적용, 중재, 소음 측정, 양측 달래기' },
      { name: '조정위원', icon: '⚖️', focus: '법적 기준, 손해배상, 조정안, 재발 방지' },
    ],
    defaultIntensity: 7, gaugeLabel: '갈등 해결 가능성',
    verdictOptions: ['원만 해결', '합의금 지급', '법적 조치', '해결 불가'],
    theme: { bg: 'bg-gray-50', accent: 'text-gray-700', cardBg: 'bg-white' },
    userRole: '피해 세대',
    contextPlaceholder: '매일 밤 10시 이후 쿵쿵 소리, 6개월째 수면 방해...',
    prepQuestions: [
      { id: 'noise', question: '소음 유형은?', options: [{label: '발걸음/뛰는 소리', value: '발걸음/뛰는 소리'}, {label: '가전/세탁기', value: '가전기기/세탁기'}, {label: '악기/음악', value: '악기 연주/음악'}, {label: '반려동물', value: '반려동물 소음'}] },
      { id: 'duration', question: '지속 기간은?', options: [{label: '1개월 이내', value: '최근 발생'}, {label: '1~6개월', value: '수개월 지속'}, {label: '6개월 이상', value: '6개월 이상 만성'}] },
      { id: 'action', question: '기존 대응은?', options: [{label: '직접 대화', value: '직접 대화 시도'}, {label: '관리소 신고', value: '관리사무소 신고'}, {label: '경찰 신고', value: '경찰 신고 경험'}, {label: '아무것도 안 함', value: '아직 아무 조치 안 함'}] },
    ],
    phases: ['피해 진술', '상대방 소명', '중재 협의', '최종 합의'],
  },
  {
    id: 'immigration', name: '해외 이민·비자 상담', icon: '🛫', gradient: 'from-cyan-100 to-teal-50', simType: 'roleplay',
    description: '해외 이민과 비자 취득을 상담합니다',
    roles: [
      { name: '이민 컨설턴트', icon: '🌏', focus: '비자 종류, 자격 요건, 수속 절차, 비용 안내' },
      { name: '현지 교민', icon: '🧑‍🤝‍🧑', focus: '현지 생활 현실, 문화 적응, 교육 환경, 취업 시장' },
      { name: '비자 전문 행정사', icon: '📋', focus: '서류 준비, 법적 요건, 거절 사례, 대안 비자' },
    ],
    defaultIntensity: 4, gaugeLabel: '이민 성공 가능성',
    verdictOptions: ['적극 추천', '준비 후 도전', '대안 검토', '재고 필요'],
    theme: { bg: 'bg-cyan-50', accent: 'text-cyan-600', cardBg: 'bg-white' },
    userRole: '이민 희망자',
    contextPlaceholder: '캐나다 영주권 목표, IT 경력 5년, 가족 동반...',
    prepQuestions: [
      { id: 'country', question: '희망 국가는?', options: [{label: '미국', value: '미국'}, {label: '캐나다', value: '캐나다'}, {label: '호주/뉴질랜드', value: '호주/뉴질랜드'}, {label: '유럽', value: '유럽 국가'}, {label: '동남아', value: '동남아시아'}] },
      { id: 'purpose', question: '이민 목적은?', options: [{label: '취업', value: '취업/커리어'}, {label: '자녀 교육', value: '자녀 교육'}, {label: '은퇴/생활', value: '은퇴/생활 환경'}, {label: '사업', value: '사업/투자'}] },
      { id: 'family', question: '동반 가족은?', options: [{label: '단독', value: '단독 이민'}, {label: '배우자', value: '배우자 동반'}, {label: '가족 전체', value: '자녀 포함 가족'}] },
    ],
    phases: ['희망 파악', '자격 검토', '현지 정보', '실행 계획'],
  },
  {
    id: 'influencer_crisis', name: 'SNS 위기 대응', icon: '📲', gradient: 'from-fuchsia-100 to-pink-50', simType: 'roleplay',
    description: 'SNS 논란에 대응합니다',
    roles: [
      { name: '매니저', icon: '🧑‍💼', focus: '사태 파악, 일정 조정, 브랜드 계약, 법적 대응' },
      { name: '악성 댓글 작성자', icon: '👹', focus: '비난, 루머 확산, 증거 제시, 사과 요구' },
      { name: 'PR 전문가', icon: '📢', focus: '여론 분석, 사과문 작성, 이미지 회복, 미디어 전략' },
    ],
    defaultIntensity: 8, gaugeLabel: '이미지 회복 가능성',
    verdictOptions: ['성공적 수습', '부분 회복', '장기 타격', '활동 중단'],
    theme: { bg: 'bg-fuchsia-50', accent: 'text-fuchsia-600', cardBg: 'bg-white' },
    userRole: '인플루언서',
    contextPlaceholder: '뒷광고 의혹, 실시간 검색어 1위, 구독자 이탈 중...',
    prepQuestions: [
      { id: 'issue', question: '논란 유형은?', options: [{label: '뒷광고', value: '뒷광고/미표기 광고'}, {label: '발언 논란', value: '부적절 발언/논란'}, {label: '사생활', value: '사생활 폭로'}, {label: '저작권', value: '저작권/표절 의혹'}] },
      { id: 'scale', question: '팔로워 규모는?', options: [{label: '1만 이하', value: '마이크로 인플루언서'}, {label: '1~10만', value: '중소 인플루언서'}, {label: '10~100만', value: '대형 인플루언서'}, {label: '100만+', value: '메가 인플루언서'}] },
      { id: 'platform', question: '주 플랫폼은?', options: [{label: '유튜브', value: '유튜브'}, {label: '인스타그램', value: '인스타그램'}, {label: '틱톡', value: '틱톡'}, {label: '트위터/X', value: '트위터/X'}] },
    ],
    phases: ['상황 파악', '여론 분석', '대응 전략', '실행/수습'],
  },
  // ── 신규 시나리오 12개 (2026-04-08 v2) ──
  {
    id: 'divorce_mediation', name: '이혼 조정 상담', icon: '💔', gradient: 'from-rose-200 to-red-50', simType: 'roleplay',
    description: '양육권·재산분할·위자료 등 복잡한 이해관계 속에서 최선의 결정을 연습합니다',
    roles: [
      { name: '가사 조정위원', icon: '🧑‍⚖️', focus: '양측 합의 유도, 자녀 최선의 이익, 재산분할 형평성, 감정 조절' },
      { name: '상대측 변호사', icon: '📑', focus: '의뢰인(상대 배우자) 이익 극대화, 양육권·위자료·재산 공격, 법적 논점' },
      { name: '자녀 심리상담사', icon: '🧸', focus: '자녀의 정서적 안정, 양육 환경 평가, 면접교섭 적절성, 트라우마 예방' },
    ],
    defaultIntensity: 7, gaugeLabel: '합의 가능성',
    verdictOptions: ['원만 합의', '조건부 합의', '조정 결렬', '소송 이행'],
    theme: { bg: 'bg-rose-50', accent: 'text-rose-700', cardBg: 'bg-white' },
    userRole: '이혼 고려 중인 배우자',
    contextPlaceholder: '결혼 8년차, 자녀 2명(7세, 4세), 성격 차이+경제적 갈등...',
    prepQuestions: [
      { id: 'reason', question: '이혼 사유는?', options: [{label: '성격 차이', value: '성격 차이'}, {label: '외도', value: '배우자 외도'}, {label: '경제 문제', value: '경제적 갈등'}, {label: '가정폭력', value: '가정폭력'}, {label: '시댁/처가 갈등', value: '시댁/처가 갈등'}] },
      { id: 'children', question: '자녀가 있나요?', options: [{label: '없음', value: '자녀 없음'}, {label: '미취학', value: '미취학 자녀'}, {label: '초등학생', value: '초등학생 자녀'}, {label: '중고등', value: '중고등학생 자녀'}] },
      { id: 'asset', question: '주요 재산은?', options: [{label: '부동산', value: '공동 부동산'}, {label: '현금/금융', value: '현금/금융자산'}, {label: '사업체', value: '공동 사업체'}, {label: '거의 없음', value: '재산 거의 없음'}] },
    ],
    phases: ['상황 진술', '쟁점 정리', '조정 협상', '합의안 도출'],
  },
  {
    id: 'elderly_care', name: '부모님 요양 결정', icon: '🧓', gradient: 'from-warmGray-100 to-stone-50', simType: 'roleplay',
    description: '시설 입소 vs 재가돌봄 결정, 비용 분담, 가족 갈등을 해결합니다',
    roles: [
      { name: '요양보호사', icon: '👩‍⚕️', focus: '어르신 건강 상태 평가, 돌봄 현실, 시설 vs 재가 장단점, 등급 판정' },
      { name: '형제자매', icon: '🙋‍♀️', focus: '비용 분담 형평성, 돌봄 역할 분배, 서운함 표출, 현실적 한계' },
      { name: '어르신 본인', icon: '👴', focus: '자존심, 자기 결정권, 시설 거부감, 자녀에게 짐이 되고 싶지 않은 마음' },
    ],
    defaultIntensity: 6, gaugeLabel: '가족 합의도',
    verdictOptions: ['시설 입소 합의', '재가돌봄 합의', '돌봄 분담 합의', '추가 논의 필요'],
    theme: { bg: 'bg-stone-50', accent: 'text-stone-700', cardBg: 'bg-white' },
    userRole: '장남/장녀',
    contextPlaceholder: '80대 부모님 치매 초기 진단, 형제 3남매, 돌봄 공백 발생...',
    prepQuestions: [
      { id: 'condition', question: '부모님 건강 상태는?', options: [{label: '거동 가능', value: '거동 가능하나 도움 필요'}, {label: '치매 초기', value: '치매 초기/인지 저하'}, {label: '거동 불편', value: '거동이 많이 불편'}, {label: '중증', value: '24시간 돌봄 필요'}] },
      { id: 'siblings', question: '형제 수는?', options: [{label: '2명', value: '형제 2명'}, {label: '3명', value: '형제 3명'}, {label: '4명 이상', value: '4명 이상'}, {label: '외동', value: '외동'}] },
      { id: 'finance', question: '돌봄 비용 여건은?', options: [{label: '여유', value: '경제적 여유 있음'}, {label: '보통', value: '분담하면 가능'}, {label: '부담', value: '경제적으로 부담'}, {label: '어려움', value: '매우 어려운 상황'}] },
    ],
    phases: ['현황 파악', '선택지 비교', '가족 협의', '최종 결정'],
  },
  {
    id: 'whistleblower', name: '내부 고발 결정', icon: '📣', gradient: 'from-yellow-100 to-amber-50', simType: 'roleplay',
    description: '회사 비리를 목격한 후 고발 여부를 결정하고, 신변 보호와 법적 절차를 확인합니다',
    roles: [
      { name: '상사', icon: '😰', focus: '은폐 시도, 회유·협박, 조직 논리, 보복 가능성 암시' },
      { name: '공익신고센터 상담원', icon: '🏛️', focus: '공익신고자보호법 안내, 신고 절차, 보호 조치, 보상금 제도' },
      { name: '동료', icon: '🤫', focus: '양심의 갈등, 조직 내 현실, 함께 할지 여부, 두려움과 연대' },
    ],
    defaultIntensity: 8, gaugeLabel: '고발 결심도',
    verdictOptions: ['즉시 고발', '증거 확보 후 고발', '내부 해결 시도', '묵인'],
    theme: { bg: 'bg-yellow-50', accent: 'text-yellow-800', cardBg: 'bg-white' },
    userRole: '비리 목격 직원',
    contextPlaceholder: '회사 회계 부정 발견, 상사가 관여, 증거 일부 확보...',
    prepQuestions: [
      { id: 'type', question: '비리 유형은?', options: [{label: '회계 부정', value: '회계 부정/횡령'}, {label: '안전 위반', value: '안전 규정 위반'}, {label: '환경 오염', value: '환경 오염/불법 투기'}, {label: '갑질/비위', value: '직장 내 갑질/비위'}, {label: '기타 불법', value: '기타 불법 행위'}] },
      { id: 'evidence', question: '증거 상태는?', options: [{label: '확실', value: '확실한 증거 보유'}, {label: '일부', value: '일부 증거만 있음'}, {label: '정황만', value: '정황 증거만 있음'}] },
      { id: 'position', question: '내 위치는?', options: [{label: '신입', value: '신입/계약직'}, {label: '중간', value: '중간 관리자'}, {label: '핵심', value: '핵심 직무 담당'}, {label: '퇴사 예정', value: '퇴사 예정/퇴직자'}] },
    ],
    phases: ['상황 인식', '선택지 탐색', '리스크 분석', '최종 결정'],
  },
  {
    id: 'debt_crisis', name: '빚 탈출 상담', icon: '🪤', gradient: 'from-gray-200 to-zinc-100', simType: 'roleplay',
    description: '다중채무 상황에서 개인회생·파산·채무조정 등 최적 경로를 탐색합니다',
    roles: [
      { name: '신용회복위원회 상담사', icon: '🏦', focus: '채무 현황 분석, 워크아웃·개인회생·파산 안내, 자격 요건, 절차 설명' },
      { name: '채권추심원', icon: '📞', focus: '상환 압박, 법적 조치 경고, 협상 여지, 일부 변제 제안' },
      { name: '가족', icon: '👨‍👩‍👧', focus: '정서적 지지, 경제적 현실 직면, 생활비 문제, 가족 관계 영향' },
    ],
    defaultIntensity: 7, gaugeLabel: '채무 해결 가능성',
    verdictOptions: ['채무조정 성공', '개인회생 신청', '파산 신청', '자력 상환 계획'],
    theme: { bg: 'bg-zinc-50', accent: 'text-zinc-700', cardBg: 'bg-white' },
    userRole: '채무자',
    contextPlaceholder: '카드빚+대출 총 8천만원, 월 소득 250만원, 3곳에서 추심 중...',
    prepQuestions: [
      { id: 'amount', question: '총 채무액은?', options: [{label: '3천만 이하', value: '3천만원 이하'}, {label: '3천~1억', value: '3천만~1억'}, {label: '1~3억', value: '1~3억'}, {label: '3억 이상', value: '3억 이상'}] },
      { id: 'income', question: '월 소득은?', options: [{label: '100만 이하', value: '100만원 이하'}, {label: '100~250만', value: '100~250만원'}, {label: '250~400만', value: '250~400만원'}, {label: '400만 이상', value: '400만원 이상'}] },
      { id: 'creditors', question: '채권자 수는?', options: [{label: '1~2곳', value: '1~2곳'}, {label: '3~5곳', value: '3~5곳'}, {label: '5곳 이상', value: '5곳 이상'}] },
    ],
    phases: ['채무 현황 파악', '선택지 비교', '구체적 계획', '실행 결정'],
  },
  {
    id: 'child_custody', name: '양육권 분쟁', icon: '👶', gradient: 'from-sky-100 to-cyan-50', simType: 'roleplay',
    description: '양육권·면접교섭권 분쟁에서 자녀 최선의 이익을 중심으로 협상합니다',
    roles: [
      { name: '가정법원 조사관', icon: '📝', focus: '양육 환경 조사, 자녀 의사 확인, 양육 적합성 평가, 면접교섭 조건' },
      { name: '전 배우자', icon: '😤', focus: '양육권 주장, 상대방 양육 부적합 공격, 감정적 대립, 자녀 이용' },
      { name: '아동심리전문가', icon: '🧩', focus: '자녀 심리 상태, 분리불안, 양육 환경이 아동에게 미치는 영향, 적응 지원' },
    ],
    defaultIntensity: 8, gaugeLabel: '양육권 확보 가능성',
    verdictOptions: ['단독 양육권', '공동 양육 합의', '조건부 양육권', '추가 조사 필요'],
    theme: { bg: 'bg-sky-50', accent: 'text-sky-700', cardBg: 'bg-white' },
    userRole: '양육권 주장 부/모',
    contextPlaceholder: '이혼 소송 중, 6세 딸 양육권 분쟁, 상대방이 면접교섭 거부...',
    prepQuestions: [
      { id: 'childAge', question: '자녀 나이는?', options: [{label: '영유아(0~3)', value: '영유아 0~3세'}, {label: '미취학(4~6)', value: '미취학 4~6세'}, {label: '초등(7~12)', value: '초등학생'}, {label: '중고등(13+)', value: '중고등학생'}] },
      { id: 'custody', question: '현재 양육 상태는?', options: [{label: '내가 양육 중', value: '현재 내가 양육'}, {label: '상대가 양육 중', value: '상대방이 양육'}, {label: '번갈아', value: '번갈아 양육'}, {label: '제3자', value: '조부모 등 제3자'}] },
      { id: 'issue', question: '핵심 쟁점은?', options: [{label: '양육 적합성', value: '양육 적합성 다툼'}, {label: '면접교섭', value: '면접교섭 거부'}, {label: '양육비', value: '양육비 미지급'}, {label: '이전', value: '거주지 이전'}] },
    ],
    phases: ['상황 진술', '조사·평가', '협상 시도', '최종 결론'],
  },
  {
    id: 'workplace_harassment', name: '직장 내 괴롭힘 대응', icon: '🚫', gradient: 'from-red-200 to-rose-50', simType: 'roleplay',
    description: '증거 수집, 신고 절차, 보복 방지 등 실질적 대응 전략을 연습합니다',
    roles: [
      { name: '가해 상사', icon: '😡', focus: '행위 부인, 업무 지시 정당화, 회유·협박, 조직 논리' },
      { name: '인사팀 담당자', icon: '📋', focus: '사내 절차 안내, 조사 진행, 피해자 보호, 조직 리스크 관리' },
      { name: '노무사', icon: '⚖️', focus: '근로기준법 적용, 증거 수집 방법, 고용노동부 신고, 손해배상 가능성' },
    ],
    defaultIntensity: 8, gaugeLabel: '문제 해결 가능성',
    verdictOptions: ['가해자 징계', '합의 해결', '외부 기관 신고', '퇴사 결정'],
    theme: { bg: 'bg-red-50', accent: 'text-red-700', cardBg: 'bg-white' },
    userRole: '피해 직원',
    contextPlaceholder: '팀장의 지속적 폭언·업무 배제 6개월째, 녹음 파일 보유...',
    prepQuestions: [
      { id: 'type', question: '괴롭힘 유형은?', options: [{label: '폭언/모욕', value: '폭언/모욕'}, {label: '업무 배제', value: '부당한 업무 배제'}, {label: '과도한 업무', value: '과도한 업무 부여'}, {label: '사적 강요', value: '사적 용무 강요'}, {label: '따돌림', value: '집단 따돌림'}] },
      { id: 'duration', question: '지속 기간은?', options: [{label: '1개월 이내', value: '최근 발생'}, {label: '1~6개월', value: '수개월 지속'}, {label: '6개월 이상', value: '6개월 이상 만성'}] },
      { id: 'evidence', question: '증거 확보 상태는?', options: [{label: '녹음/영상', value: '녹음/영상 있음'}, {label: '문자/메일', value: '문자/이메일 증거'}, {label: '목격자', value: '목격자 있음'}, {label: '없음', value: '증거 거의 없음'}] },
    ],
    phases: ['피해 사실 정리', '증거 검토', '대응 전략 수립', '실행 결정'],
  },
  {
    id: 'medical_decision', name: '중대 수술 결정', icon: '🫀', gradient: 'from-red-100 to-pink-50', simType: 'roleplay',
    description: '고위험 수술 동의 여부, 대안 치료법, 가족 간 의견을 조율합니다',
    roles: [
      { name: '집도의', icon: '🩺', focus: '수술 필요성, 성공률, 합병증 리스크, 비수술 대안, 예후 설명' },
      { name: '간호사', icon: '💉', focus: '수술 전후 과정 안내, 회복 기간, 환자 정서 케어, 현실적 준비 사항' },
      { name: '다른 가족 구성원', icon: '👨‍👩‍👧‍👦', focus: '반대 의견, 위험 우려, 다른 병원 세컨드 오피니언, 간병 현실' },
    ],
    defaultIntensity: 6, gaugeLabel: '수술 결정 확신도',
    verdictOptions: ['수술 동의', '세컨드 오피니언', '비수술 치료 선택', '결정 보류'],
    theme: { bg: 'bg-red-50', accent: 'text-red-600', cardBg: 'bg-white' },
    userRole: '환자 가족 대표',
    contextPlaceholder: '70대 아버지 심장 수술 권유, 성공률 85%, 가족 의견 엇갈림...',
    prepQuestions: [
      { id: 'surgery', question: '수술 부위는?', options: [{label: '심장/혈관', value: '심장/혈관 수술'}, {label: '뇌/신경', value: '뇌/신경외과'}, {label: '암/종양', value: '암 수술'}, {label: '장기 이식', value: '장기 이식'}, {label: '기타', value: '기타 대수술'}] },
      { id: 'patient', question: '환자 상태는?', options: [{label: '양호', value: '전반적 건강 양호'}, {label: '기저질환', value: '기저질환 있음'}, {label: '고령', value: '고령으로 체력 우려'}, {label: '위중', value: '현재 상태 위중'}] },
      { id: 'urgency', question: '시급성은?', options: [{label: '응급', value: '즉시 수술 필요'}, {label: '수주 이내', value: '수주 이내 권고'}, {label: '수개월', value: '수개월 내 가능'}, {label: '선택적', value: '선택적 수술'}] },
    ],
    phases: ['의료 설명', '가족 의견 청취', '대안 검토', '최종 결정'],
  },
  {
    id: 'startup_cofounder', name: '공동창업 갈등', icon: '🤼', gradient: 'from-orange-100 to-yellow-50', simType: 'roleplay',
    description: '지분 분쟁, 역할 갈등, 퇴출 등 공동창업 핵심 이슈를 다룹니다',
    roles: [
      { name: '공동창업자 B', icon: '🧑‍💻', focus: '자기 기여도 주장, 역할 불만, 지분 재조정 요구, 퇴출 위협' },
      { name: '초기 투자자', icon: '💵', focus: '투자금 보전, 경영 안정성, 팀 와해 우려, 중재 역할' },
      { name: '법률 자문', icon: '📋', focus: '주주간 계약서, 지분 매수 조건, 경업금지, 법적 분쟁 예방' },
    ],
    defaultIntensity: 7, gaugeLabel: '갈등 해결 가능성',
    verdictOptions: ['역할 재조정 합의', '지분 매수/매도', '한 명 퇴출', '회사 해산'],
    theme: { bg: 'bg-orange-50', accent: 'text-orange-700', cardBg: 'bg-white' },
    userRole: '공동창업자 A',
    contextPlaceholder: '2인 공동창업 2년차, 역할·비전 갈등, 지분 50:50인데 변경 요구...',
    prepQuestions: [
      { id: 'issue', question: '핵심 갈등은?', options: [{label: '지분 분쟁', value: '지분 비율 갈등'}, {label: '역할 중복', value: '역할/권한 충돌'}, {label: '비전 차이', value: '사업 방향 의견 차이'}, {label: '기여도', value: '기여도 인식 차이'}] },
      { id: 'equity', question: '현재 지분은?', options: [{label: '50:50', value: '50:50 균등'}, {label: '대표 우위', value: '내가 과반'}, {label: '상대 우위', value: '상대가 과반'}, {label: '3인 이상', value: '3인 이상 분산'}] },
      { id: 'contract', question: '주주간 계약서는?', options: [{label: '있음', value: '정식 계약서 있음'}, {label: '간단', value: '간단한 합의서만'}, {label: '없음', value: '서면 계약 없음'}] },
    ],
    phases: ['갈등 상황 진술', '각자 입장 청취', '해결안 모색', '최종 합의'],
  },
  {
    id: 'school_transfer', name: '자녀 전학 결정', icon: '🎒', gradient: 'from-cyan-100 to-blue-50', simType: 'roleplay',
    description: '따돌림·학업·적응 등 복합적 요인을 고려한 전학 의사결정을 연습합니다',
    roles: [
      { name: '현재 담임교사', icon: '👨‍🏫', focus: '학교에서의 상황 설명, 개선 가능성, 전학의 득실, 학교 입장' },
      { name: '전학 대상 학교 상담사', icon: '🏫', focus: '전입 절차, 적응 프로그램, 학교 특성, 현실적 기대치 조정' },
      { name: '자녀', icon: '🧒', focus: '본인 의사, 친구 관계, 두려움과 기대, 숨기고 있는 속마음' },
    ],
    defaultIntensity: 5, gaugeLabel: '전학 결정 확신도',
    verdictOptions: ['전학 결정', '현재 학교 잔류', '기간 후 재검토', '대안 탐색'],
    theme: { bg: 'bg-cyan-50', accent: 'text-cyan-700', cardBg: 'bg-white' },
    userRole: '학부모',
    contextPlaceholder: '초5 아들, 반 아이들에게 따돌림, 등교 거부 시작...',
    prepQuestions: [
      { id: 'reason', question: '전학 고려 이유는?', options: [{label: '따돌림', value: '교우 관계/따돌림'}, {label: '학업', value: '학업 환경 불만'}, {label: '이사', value: '이사/거리 문제'}, {label: '특수 교육', value: '특수 교육 필요'}] },
      { id: 'grade', question: '자녀 학년은?', options: [{label: '초등 저', value: '초등 1~3학년'}, {label: '초등 고', value: '초등 4~6학년'}, {label: '중학교', value: '중학생'}, {label: '고등학교', value: '고등학생'}] },
      { id: 'childWill', question: '자녀 의사는?', options: [{label: '원함', value: '본인이 전학 원함'}, {label: '거부', value: '본인은 전학 거부'}, {label: '모름', value: '아직 잘 모름'}, {label: '불안', value: '두려워하고 있음'}] },
    ],
    phases: ['상황 파악', '학교별 비교', '자녀 의견 청취', '최종 결정'],
  },
  {
    id: 'contract_negotiation', name: '대형 계약 협상', icon: '🤞', gradient: 'from-indigo-100 to-blue-50', simType: 'roleplay',
    description: '납품 단가·결제 조건·독점 조항 등 실전 B2B 협상을 연습합니다',
    roles: [
      { name: '대기업 구매팀장', icon: '🏭', focus: '납품 단가 인하, 결제 조건 유리하게, 독점 공급 요구, 경쟁 입찰 언급' },
      { name: '자사 법무팀', icon: '📜', focus: '계약 조건 리스크, 위약금 조항, 분쟁 해결 조항, 지재권 보호' },
      { name: '거래처 실무자', icon: '🤝', focus: '실무 협력 관계, 납기 현실, 품질 이슈, 현장 커뮤니케이션' },
    ],
    defaultIntensity: 7, gaugeLabel: '협상 유리도',
    verdictOptions: ['유리한 조건 타결', '균형적 합의', '불리한 조건 수용', '협상 결렬'],
    theme: { bg: 'bg-indigo-50', accent: 'text-indigo-700', cardBg: 'bg-white' },
    userRole: '중소기업 대표',
    contextPlaceholder: '대기업 납품 계약, 연 50억 규모, 단가 10% 인하 요구 받음...',
    prepQuestions: [
      { id: 'scale', question: '계약 규모는?', options: [{label: '1억 이하', value: '1억 이하'}, {label: '1~10억', value: '1~10억'}, {label: '10~50억', value: '10~50억'}, {label: '50억 이상', value: '50억 이상'}] },
      { id: 'relation', question: '거래 관계는?', options: [{label: '신규', value: '신규 거래'}, {label: '기존 1~3년', value: '기존 거래 1~3년'}, {label: '장기', value: '5년 이상 장기 거래'}, {label: '독점', value: '독점 공급 관계'}] },
      { id: 'leverage', question: '우리 쪽 강점은?', options: [{label: '기술력', value: '독보적 기술/품질'}, {label: '가격', value: '가격 경쟁력'}, {label: '납기', value: '빠른 납기 대응'}, {label: '대안 없음', value: '대체 업체가 거의 없음'}] },
    ],
    phases: ['조건 제시', '쟁점 협상', '양보 교환', '최종 합의'],
  },
  {
    id: 'mental_health', name: '정신건강 상담', icon: '🌿', gradient: 'from-emerald-100 to-teal-50', simType: 'roleplay',
    description: '번아웃·우울·불안 상황에서 치료 방향 설정과 주변 관계를 관리합니다',
    roles: [
      { name: '심리상담사', icon: '💜', focus: '감정 탐색, 공감, 인지행동치료 기법, 일상 속 실천 과제' },
      { name: '정신건강의학과 전문의', icon: '🩺', focus: '증상 평가, 약물 치료 필요성, 진단 기준, 치료 계획' },
      { name: '가까운 지인', icon: '🫂', focus: '걱정과 응원, 일상에서의 변화 관찰, 도움 주고 싶지만 서툰 마음' },
    ],
    defaultIntensity: 3, gaugeLabel: '회복 방향 명확도',
    verdictOptions: ['상담 치료 시작', '약물+상담 병행', '생활 습관 개선', '경과 관찰'],
    theme: { bg: 'bg-emerald-50', accent: 'text-emerald-700', cardBg: 'bg-white' },
    userRole: '내담자',
    contextPlaceholder: '6개월째 의욕 저하, 수면 장애, 회사 적응 어려움...',
    prepQuestions: [
      { id: 'symptom', question: '주요 증상은?', options: [{label: '우울감', value: '지속적 우울감'}, {label: '불안/공황', value: '불안/공황 증상'}, {label: '번아웃', value: '극심한 번아웃'}, {label: '수면 장애', value: '수면 장애'}, {label: '대인관계', value: '대인관계 어려움'}] },
      { id: 'duration', question: '증상 기간은?', options: [{label: '수주', value: '최근 몇 주'}, {label: '수개월', value: '수개월째'}, {label: '1년 이상', value: '1년 이상'}, {label: '반복', value: '좋아졌다 나빠지기를 반복'}] },
      { id: 'treatment', question: '치료 경험은?', options: [{label: '처음', value: '처음 상담받음'}, {label: '상담 경험', value: '상담 받은 적 있음'}, {label: '약물 경험', value: '약물 복용 경험'}, {label: '현재 치료 중', value: '현재 치료 중'}] },
    ],
    phases: ['마음 열기', '증상 탐색', '치료 방향 논의', '실천 계획'],
  },
  {
    id: 'inheritance_plan', name: '상속 사전 설계', icon: '🏦', gradient: 'from-amber-100 to-orange-50', simType: 'roleplay',
    description: '생전 증여 vs 사후 상속, 절세 전략, 가족 간 공평한 분배를 설계합니다',
    roles: [
      { name: '세무사', icon: '🧮', focus: '증여세·상속세 시뮬레이션, 절세 전략, 공제 한도, 신고 절차' },
      { name: '장남', icon: '🙋‍♂️', focus: '기여분 주장, 부모 돌봄 역할, 사업 승계 희망, 형제 간 입장 차이' },
      { name: '차남', icon: '🙋', focus: '균등 분배 주장, 소외감, 현실적 필요(주거/교육비), 형에 대한 서운함' },
    ],
    defaultIntensity: 5, gaugeLabel: '가족 합의도',
    verdictOptions: ['생전 증여 계획 확정', '유언장 작성', '신탁 설정', '추가 논의'],
    theme: { bg: 'bg-amber-50', accent: 'text-amber-800', cardBg: 'bg-white' },
    userRole: '부모(재산 보유자)',
    contextPlaceholder: '70대, 아파트 2채+예금 3억, 아들 2명에게 공평하게 분배하고 싶음...',
    prepQuestions: [
      { id: 'asset', question: '주요 재산은?', options: [{label: '부동산', value: '부동산 위주'}, {label: '현금/금융', value: '현금/금융자산'}, {label: '혼합', value: '부동산+현금 혼합'}, {label: '사업체', value: '사업체/지분 포함'}] },
      { id: 'heirs', question: '상속인 구성은?', options: [{label: '자녀 2명', value: '자녀 2명'}, {label: '자녀 3명 이상', value: '자녀 3명 이상'}, {label: '배우자+자녀', value: '배우자+자녀'}, {label: '복잡', value: '재혼/이복 등 복잡'}] },
      { id: 'concern', question: '가장 고민은?', options: [{label: '절세', value: '세금 최소화'}, {label: '공평', value: '공평한 분배'}, {label: '갈등 예방', value: '가족 갈등 예방'}, {label: '사업 승계', value: '사업 승계'}] },
    ],
    phases: ['재산 현황 파악', '세금 시뮬레이션', '분배 방안 논의', '실행 계획'],
  },
];

// ── Stakeholder Settings ──

export interface StakeholderSettings {
  scenarioId: string | null;
  roleAssignments: Record<string, string>; // roleName -> expertId
  intensity: number;
  autoReport: boolean;
  prepAnswers: Record<string, string>;
}

export const DEFAULT_STAKEHOLDER_SETTINGS: StakeholderSettings = {
  scenarioId: null,
  roleAssignments: {},
  intensity: 5,
  autoReport: true,
  prepAnswers: {},
};

// ── 토론 추천주제 ──

export interface RecommendedTopic {
  id: string;
  title: string;
  temperature: number;
  participation: number;
  updatedAt: string;
  proLabel?: string;
  proIcon?: string;
  proId?: string;
  conLabel?: string;
  conIcon?: string;
  conId?: string;
  participants?: { id?: string; name: string; icon: string }[];
}

export const DEBATE_RECOMMENDED_TOPICS: Record<string, RecommendedTopic[]> = {
  procon: [
    // 1:1 매치
    { id: 'rt-0', title: '사형제는 필요한가?', temperature: 92, participation: 8210, updatedAt: '방금 전', proLabel: '경찰관', proIcon: '🚔', proId: 'police', conLabel: '변호사', conIcon: '👨‍⚖️', conId: 'lawyer' },
    { id: 'rt-1', title: 'AI가 인간 일자리를 빼앗을까?', temperature: 87, participation: 5234, updatedAt: '1시간 전', proLabel: 'GPT-5.4', proIcon: '🤖', proId: 'gpt', conLabel: '경제학', conIcon: '📊', conId: 'economics' },
    { id: 'rt-2', title: '의료는 무상이어야 하는가?', temperature: 88, participation: 6120, updatedAt: '2시간 전', proLabel: '사회주의', proIcon: '✊', proId: 'socialist', conLabel: '자본주의', conIcon: '💰', conId: 'capitalist' },
    { id: 'rt-3', title: '사교육 전면 금지해야 하는가?', temperature: 85, participation: 4890, updatedAt: '3시간 전', proLabel: '교사', proIcon: '👨‍🏫', proId: 'teacher', conLabel: '경제학', conIcon: '📊', conId: 'economics' },
    { id: 'rt-4', title: '동물실험 금지해야 하는가?', temperature: 83, participation: 4156, updatedAt: '4시간 전', proLabel: '철학', proIcon: '🏛️', proId: 'philosophy', conLabel: '의사', conIcon: '🩺', conId: 'doctor' },
    { id: 'rt-5', title: '이민 문호를 더 열어야 하는가?', temperature: 80, participation: 3670, updatedAt: '5시간 전', proLabel: '진보주의', proIcon: '🔄', proId: 'progressive', conLabel: '민족주의', conIcon: '🗻', conId: 'nationalist' },
    // 2:2 매치
    { id: 'rt-6', title: '집값, 국가가 통제해야 하는가?', temperature: 91, participation: 7340, updatedAt: '30분 전', proLabel: '사회주의 · 행정학', proIcon: '✊', proId: 'socialist', conLabel: '자본주의 · 금융', conIcon: '💰', conId: 'capitalist' },
    { id: 'rt-7', title: 'AI 판사가 인간 판사를 대체할 수 있나?', temperature: 86, participation: 5120, updatedAt: '1시간 전', proLabel: 'Claude · 프로그래머', proIcon: '🧡', proId: 'claude', conLabel: '판사 · 철학', conIcon: '⚖️', conId: 'judge' },
    { id: 'rt-8', title: '원전 확대가 현실적 대안인가?', temperature: 84, participation: 4780, updatedAt: '2시간 전', proLabel: '물리학 · 엔지니어', proIcon: '⚛️', proId: 'physics', conLabel: '환경과학 · 기자', conIcon: '🌿', conId: 'envscience' },
  ],
  standard: [
    { id: 'rt-s1', title: '저출산 대책, 왜 효과가 없을까?', temperature: 90, participation: 6890, updatedAt: '방금 전', participants: [{ id: 'sociology', name: '사회학', icon: '👥' }, { id: 'economics', name: '경제학', icon: '📊' }, { id: 'pubadmin', name: '행정학', icon: '🏢' }, { id: 'psychology', name: '심리학', icon: '🎭' }] },
    { id: 'rt-s2', title: 'AI 규제, 혁신과 안전 사이의 균형점은?', temperature: 84, participation: 4780, updatedAt: '1시간 전', participants: [{ id: 'gpt', name: 'GPT-5.4', icon: '🤖' }, { id: 'programmer', name: '프로그래머', icon: '💻' }, { id: 'legal', name: '법학', icon: '⚖️' }, { id: 'philosophy', name: '철학', icon: '🏛️' }] },
    { id: 'rt-s3', title: '한국 교육, 무엇부터 바꿔야 하나?', temperature: 82, participation: 5120, updatedAt: '2시간 전', participants: [{ id: 'teacher', name: '교사', icon: '👨‍🏫' }, { id: 'psychology', name: '심리학', icon: '🎭' }, { id: 'economics', name: '경제학', icon: '📊' }, { id: 'journalist', name: '기자', icon: '📰' }] },
    { id: 'rt-s4', title: '부동산 정책, 시장이냐 규제냐?', temperature: 88, participation: 5430, updatedAt: '30분 전', participants: [{ id: 'capitalist', name: '자본주의', icon: '💰' }, { id: 'finance', name: '금융', icon: '💰' }, { id: 'socialist', name: '사회주의', icon: '✊' }, { id: 'pubadmin', name: '행정학', icon: '🏢' }] },
    { id: 'rt-s5', title: '디지털 시대의 프라이버시, 어디까지?', temperature: 77, participation: 2980, updatedAt: '3시간 전', participants: [{ id: 'libertarian', name: '자유주의', icon: '🗽' }, { id: 'programmer', name: '프로그래머', icon: '💻' }, { id: 'police', name: '경찰관', icon: '🚔' }, { id: 'political', name: '정치학', icon: '🗳️' }] },
    { id: 'rt-s6', title: '반도체 패권 경쟁의 미래는?', temperature: 79, participation: 3200, updatedAt: '4시간 전', participants: [{ id: 'gemini', name: 'Gemini', icon: '💎' }, { id: 'engineer', name: '엔지니어', icon: '⚙️' }, { id: 'economics', name: '경제학', icon: '📊' }, { id: 'diplomat', name: '외교관', icon: '🤝' }] },
  ],
  freetalk: [
    { id: 'rt-f1', title: '10년 뒤, 어떤 직업이 살아남을까?', temperature: 85, participation: 5100, updatedAt: '방금 전', participants: [{ id: 'gpt', name: 'GPT-5.4', icon: '🤖' }, { id: 'gemini', name: 'Gemini', icon: '💎' }, { id: 'deepseek', name: 'DeepSeek', icon: '🌊' }] },
    { id: 'rt-f2', title: '요즘 MZ세대는 왜 투자에 몰릴까?', temperature: 78, participation: 4230, updatedAt: '1시간 전', participants: [{ id: 'stocktrader', name: '펀드매니저', icon: '📈' }, { id: 'economics', name: '경제학', icon: '📊' }, { id: 'journalist', name: '기자', icon: '📰' }] },
    { id: 'rt-f3', title: '좋은 리더의 조건은 뭘까?', temperature: 73, participation: 3567, updatedAt: '2시간 전', participants: [{ id: 'lincoln', name: '링컨', icon: '🎩' }, { id: 'churchill', name: '처칠', icon: '🇬🇧' }, { id: 'napoleon', name: '나폴레옹', icon: '⚔️' }] },
    { id: 'rt-f4', title: '초고령사회, 우리는 뭘 준비해야 할까?', temperature: 76, participation: 3890, updatedAt: '3시간 전', participants: [{ id: 'doctor', name: '의사', icon: '🩺' }, { id: 'socialworker', name: '사회복지사', icon: '🤲' }, { id: 'economics', name: '경제학', icon: '📊' }] },
    { id: 'rt-f5', title: 'K-컨텐츠의 다음 먹거리는?', temperature: 71, participation: 3210, updatedAt: '4시간 전', participants: [{ id: 'producer', name: '프로듀서', icon: '🎬' }, { id: 'writer', name: '작가', icon: '✍️' }, { id: 'journalist', name: '기자', icon: '📰' }] },
    { id: 'rt-f6', title: 'SNS가 정신건강에 미치는 영향', temperature: 80, participation: 4670, updatedAt: '1시간 전', participants: [{ id: 'psychology', name: '심리학', icon: '🎭' }, { id: 'claude', name: 'Claude', icon: '🧡' }, { id: 'teacher', name: '교사', icon: '👨‍🏫' }] },
    { id: 'rt-f7', title: '우주 개발, 돈 낭비인가 미래 투자인가?', temperature: 74, participation: 2890, updatedAt: '5시간 전', participants: [{ id: 'astronomy', name: '천문학', icon: '🔭' }, { id: 'grok', name: 'Grok', icon: '⚡' }, { id: 'pilot', name: '파일럿', icon: '✈️' }] },
  ],
  hearing: [
    { id: 'rt-h1', title: 'AI 기반 개인 재무관리 앱', temperature: 82, participation: 1890, updatedAt: '2시간 전' },
    { id: 'rt-h2', title: '소규모 학교 온라인 교육 플랫폼', temperature: 68, participation: 1456, updatedAt: '5시간 전' },
    { id: 'rt-h3', title: '독거노인 AI 안부 확인 서비스', temperature: 75, participation: 2100, updatedAt: '3시간 전' },
    { id: 'rt-h4', title: '지역 농산물 직거래 구독 서비스', temperature: 60, participation: 1234, updatedAt: '7시간 전' },
  ],
  brainstorm: [
    { id: 'rt-b1', title: '1인 가구를 위한 새로운 서비스', temperature: 82, participation: 4230, updatedAt: '방금 전', participants: [{ id: 'gpt', name: 'GPT-5.4', icon: '🤖' }, { id: 'marketing', name: '마케팅', icon: '📣' }, { id: 'designer', name: '디자이너', icon: '🖌️' }] },
    { id: 'rt-b2', title: '시니어를 위한 AI 활용 아이디어', temperature: 76, participation: 3120, updatedAt: '1시간 전', participants: [{ id: 'claude', name: 'Claude', icon: '🧡' }, { id: 'doctor', name: '의사', icon: '🩺' }, { id: 'socialworker', name: '사회복지사', icon: '🤲' }] },
    { id: 'rt-b3', title: '친환경 비즈니스 모델 구상', temperature: 74, participation: 2890, updatedAt: '2시간 전', participants: [{ id: 'gemini', name: 'Gemini', icon: '💎' }, { id: 'envscience', name: '환경과학', icon: '🌿' }, { id: 'marketing', name: '마케팅', icon: '📣' }] },
    { id: 'rt-b4', title: '학교 교육을 혁신할 방법', temperature: 79, participation: 3560, updatedAt: '3시간 전', participants: [{ id: 'teacher', name: '교사', icon: '👨‍🏫' }, { id: 'programmer', name: '프로그래머', icon: '💻' }, { id: 'psychology', name: '심리학', icon: '🎭' }] },
    { id: 'rt-b5', title: '로컬 크리에이터 수익화 전략', temperature: 71, participation: 2340, updatedAt: '4시간 전', participants: [{ id: 'writer', name: '작가', icon: '✍️' }, { id: 'marketing', name: '마케팅', icon: '📣' }, { id: 'grok', name: 'Grok', icon: '⚡' }] },
  ],
};

export const SUMMARIZER_EXPERT: Expert = {
    id: 'summarizer', name: 'Summarizer', nameKo: '토론 정리', icon: '📝', color: 'amber', category: 'specialist', description: '토론 내용 정리', systemPrompt: '',
};

export const CONCLUSION_EXPERT: Expert = {
    id: 'conclusion', name: 'Conclusion', nameKo: '최종 결론', icon: '🏆', color: 'purple', category: 'specialist', description: '최종 결론 도출', systemPrompt: '',
};
