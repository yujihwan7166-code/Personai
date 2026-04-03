export const EXPERT_COLORS = ['blue', 'emerald', 'red', 'amber', 'purple', 'orange', 'teal', 'pink'] as const;
export type ExpertColor = typeof EXPERT_COLORS[number];

export const EXPERT_COLOR_LABELS: Record<ExpertColor, string> = {
    blue: '블루', emerald: '그린', red: '레드', amber: '골드',
    purple: '퍼플', orange: '오렌지', teal: '틸', pink: '핑크',
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
    quote?: string;
    sampleQuestions?: string[];
    greeting?: string;
}

export type DiscussionRound = 'initial' | 'rebuttal' | 'final';

export const ROUND_LABELS: Record<DiscussionRound, string> = {
    initial: '1라운드 · 초기 의견',
    rebuttal: '2라운드 · 반론/토론',
    final: '3라운드 · 최종 입장',
};

// Main mode: 5 categories
export type MainMode = 'general' | 'multi' | 'brainstorm_main' | 'stakeholder_main' | 'expert' | 'debate' | 'assistant' | 'player';

export const MAIN_MODE_LABELS: Record<MainMode, { label: string; icon: string; description: string }> = {
    general: { label: '단일 AI', icon: '💬', description: 'AI 하나를 골라 대화하세요' },
    multi: { label: '다중 AI', icon: '🔄', description: '여러 AI의 답변을 종합합니다' },
    brainstorm_main: { label: '브레인스토밍', icon: '💡', description: 'AI들이 협업해 아이디어를 정리합니다' },
    stakeholder_main: { label: '시뮬레이션', icon: '🎭', description: '이해관계자 역할극으로 아이디어를 검증합니다' },
    expert: { label: '전문 AI 상담', icon: '🔬', description: '분야 전문가와 깊이 있는 1:1 상담' },
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
    aivsuser: { label: 'AI vs 유저', icon: '⚔️', description: 'AI와 직접 1:1~3:1 토론' },
};

// Flat DiscussionMode for backward compat in logic
export type DiscussionMode = 'general' | 'multi' | 'expert' | 'standard' | 'procon' | 'brainstorm' | 'hearing' | 'freetalk' | 'aivsuser' | 'stakeholder' | 'assistant' | 'player';

export function getMainMode(mode: DiscussionMode): MainMode {
    if (mode === 'general') return 'general';
    if (mode === 'multi') return 'multi';
    if (mode === 'brainstorm') return 'brainstorm_main';
    if (mode === 'expert') return 'expert';
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
    aivsuser: { label: 'AI vs 유저', icon: '⚔️', description: 'AI와 직접 토론', detail: 'AI와 1:1~3:1로 직접 토론하고 판정관이 승패를 가립니다.' },
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
    // AI vs 유저 전용
    aivsUserOpponentCount?: 1 | 2 | 3;
    aivsUserDifficulty?: 'easy' | 'normal' | 'hard';
    aivsUserStance?: 'pro' | 'con' | 'random';
}

export const DEFAULT_DEBATE_SETTINGS: DebateSettings = {
    responseLength: 'medium',
    rounds: 3,
    includeConclusion: true,
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
    aivsUserOpponentCount: 1,
    aivsUserDifficulty: 'normal',
    aivsUserStance: 'pro',
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

export interface DiscussionMessage {
    id: string;
    expertId: string;
    content: string;
    isStreaming?: boolean;
    isSummary?: boolean;
    round?: DiscussionRound;
    likes?: number;
    dislikes?: number;
    timestamp?: number;
    attachedFiles?: { name: string; mimeType: string; preview?: string }[];
    simRoleName?: string;  // 시뮬레이션 역할명 (예: "VC 파트너")
    simRoleIcon?: string;  // 시뮬레이션 역할 아이콘
}

// ══════════════════════════════════════════
// ── Expert Mode (전문가 모드) ──
// ══════════════════════════════════════════

export interface ExpertModePhase {
    id: string;
    expertRole: string;
    expertIcon: string;
    description: string;
    sampleQuestions: string[];
}

export interface ExpertModeTemplate {
    id: string;
    name: string;
    icon: string;
    description: string;
    color: string;
    gradient: string;
    category: 'health' | 'legal' | 'finance' | 'business' | 'lifestyle';
    phases: ExpertModePhase[];
    outputFormat: string;
    isPopular?: boolean;
    isNew?: boolean;
}

export const EXPERT_MODE_TEMPLATES: ExpertModeTemplate[] = [
    {
        id: 'medical',
        name: '의학 상담',
        icon: '🏥',
        description: '증상 분석부터 종합 소견까지, 임상 프로토콜 기반 의학 상담',
        color: 'text-red-600',
        gradient: 'from-red-100 to-rose-50',
        category: 'health',
        isPopular: true,
        outputFormat: 'SOAP Note (주관적/객관적/평가/계획)',
        phases: [
            { id: 'triage', expertRole: '접수 간호사', expertIcon: '👩‍⚕️', description: '주증상 파악, 긴급도 분류(ESI)', sampleQuestions: ['어디가 가장 불편하신가요?', '언제부터 증상이 시작되었나요?', '통증 강도를 0~10으로 표현하면?'] },
            { id: 'history', expertRole: '전문의', expertIcon: '🩺', description: '문진(OPQRST) 및 병력 확인', sampleQuestions: ['증상이 악화되는 상황이 있나요?', '과거 비슷한 증상을 겪은 적이 있나요?', '가족 중 관련 질환을 가진 분이 있나요?'] },
            { id: 'medication', expertRole: '약사', expertIcon: '💊', description: '복용 약물 및 상호작용 검토', sampleQuestions: ['현재 복용 중인 약이 있나요?', '건강기능식품이나 한약을 드시나요?', '약물 알레르기가 있나요?'] },
            { id: 'lifestyle', expertRole: '영양사/운동전문가', expertIcon: '🥗', description: '생활습관 평가(식이, 운동, 수면)', sampleQuestions: ['하루 식사는 몇 끼 드시나요?', '일주일에 운동을 얼마나 하시나요?', '수면 시간과 질은 어떤가요?'] },
            { id: 'synthesis', expertRole: '종합 소견', expertIcon: '📋', description: '감별진단, 권장 검사, 생활 교정 안내', sampleQuestions: [] },
        ],
    },
    {
        id: 'legal',
        name: '법률 상담',
        icon: '⚖️',
        description: '사건 분석부터 전략 수립까지, 로펌 수준의 법률 상담',
        color: 'text-amber-600',
        gradient: 'from-amber-100 to-yellow-50',
        category: 'legal',
        isPopular: true,
        outputFormat: '법률의견서 (Legal Memorandum)',
        phases: [
            { id: 'intake', expertRole: '수석 변호사', expertIcon: '👨‍⚖️', description: '사건 유형 분류, 당사자 관계, 시효 확인', sampleQuestions: ['어떤 종류의 법적 문제인가요? (민사/형사/노동/가사)', '상대방과의 관계는 어떻게 되나요?', '사건이 발생한 시기는 언제인가요?'] },
            { id: 'facts', expertRole: '사건 담당 변호사', expertIcon: '📝', description: '사실관계 정리, 증거 목록화, 시간순 정리', sampleQuestions: ['사건의 경위를 시간순으로 설명해주세요', '관련 증거(문서, 녹음, 사진 등)가 있나요?', '목격자나 증인이 있나요?'] },
            { id: 'research', expertRole: '판례 연구원', expertIcon: '📚', description: '관련 법조문, 판례 분석, 승소율 분석', sampleQuestions: ['유사한 사건으로 소송을 진행한 적이 있나요?', '상대방이 어떤 주장을 하고 있나요?'] },
            { id: 'risk', expertRole: '리스크 분석가', expertIcon: '📊', description: '승소 가능성, 비용 예측, 시나리오 분석', sampleQuestions: ['소송에 투입할 수 있는 예산은 어느 정도인가요?', '합의를 고려하고 계신가요?'] },
            { id: 'strategy', expertRole: '종합 전략', expertIcon: '🎯', description: '소송/조정/합의 전략 비교, 즉시 조치 사항', sampleQuestions: [] },
        ],
    },
    {
        id: 'finance',
        name: '재무·투자 상담',
        icon: '💰',
        description: 'CFP 6단계 프로세스 기반 맞춤형 재무 설계',
        color: 'text-emerald-600',
        gradient: 'from-emerald-100 to-green-50',
        category: 'finance',
        outputFormat: '개인재무보고서 (Personal Financial Report)',
        phases: [
            { id: 'health', expertRole: '재무설계사 (CFP)', expertIcon: '💼', description: '재무 건강 진단 — 소득/지출/부채/자산 분석', sampleQuestions: ['월 소득은 어느 정도인가요?', '월 고정 지출과 변동 지출은?', '현재 부채(대출)가 있나요?'] },
            { id: 'lifecycle', expertRole: '라이프플래너', expertIcon: '📅', description: '생애주기 분석 — 재무 이벤트 예측', sampleQuestions: ['결혼/출산/주택구매 계획이 있나요?', '은퇴 목표 연령은?', '자녀 교육 비용 계획은?'] },
            { id: 'profile', expertRole: '투자 분석가 (CFA)', expertIcon: '📈', description: '투자 성향 분석 — 리스크/수익 프로파일링', sampleQuestions: ['투자 경험이 있나요? 어떤 종류?', '투자 가능 기간은?', '원금 손실에 대한 감수 정도는?'] },
            { id: 'tax', expertRole: '세무사', expertIcon: '🧾', description: '세금 최적화 — 절세 전략 시뮬레이션', sampleQuestions: ['현재 세금 관련 절세 상품을 이용하고 있나요?', 'ISA/IRP/연금저축 가입 여부는?'] },
            { id: 'report', expertRole: '종합 재무 전략', expertIcon: '📋', description: '재무 점수, 포트폴리오 설계, 액션플랜', sampleQuestions: [] },
        ],
    },
    {
        id: 'realestate',
        name: '부동산 상담',
        icon: '🏠',
        description: '시장 분석부터 세금 시뮬레이션까지 종합 부동산 컨설팅',
        color: 'text-blue-600',
        gradient: 'from-blue-100 to-sky-50',
        category: 'finance',
        isNew: true,
        outputFormat: '부동산 투자분석보고서',
        phases: [
            { id: 'needs', expertRole: '부동산 컨설턴트', expertIcon: '🏘️', description: '목적/예산/희망 조건 파악', sampleQuestions: ['매매/전세/투자 중 어떤 목적인가요?', '예산(자기자본 + 대출 가능액)은?', '희망 지역과 평형은?'] },
            { id: 'market', expertRole: '시장 분석가', expertIcon: '📊', description: '시세 동향, 인프라, 입주 물량 분석', sampleQuestions: ['관심 있는 구체적 단지가 있나요?', '입주 시기는 언제를 원하시나요?'] },
            { id: 'legal_re', expertRole: '부동산 법률 전문가', expertIcon: '📝', description: '등기부등본, 계약 리스크, 전세사기 체크', sampleQuestions: ['매물의 등기부등본을 확인하셨나요?', '임대차 관련 특약이 있나요?'] },
            { id: 'tax_re', expertRole: '부동산 세무사', expertIcon: '🧾', description: '취득세/양도세/보유세 시뮬레이션', sampleQuestions: ['현재 보유 부동산이 있나요?', '다주택자에 해당하나요?'] },
            { id: 'plan', expertRole: '종합 전략', expertIcon: '📋', description: '매수/매도/보류 판정, 체크리스트', sampleQuestions: [] },
        ],
    },
    {
        id: 'startup',
        name: '창업 상담',
        icon: '🚀',
        description: '아이디어 검증부터 IR 덱까지, VC 심사 기준 기반 창업 컨설팅',
        color: 'text-purple-600',
        gradient: 'from-purple-100 to-violet-50',
        category: 'business',
        outputFormat: 'IR Pitch Deck 구조 사업계획서',
        phases: [
            { id: 'validation', expertRole: '스타트업 멘토', expertIcon: '🧭', description: '아이디어 검증 — Lean Canvas + PMF', sampleQuestions: ['해결하려는 문제는 무엇인가요?', '현재 사람들은 이 문제를 어떻게 해결하나요?', '당신만의 차별점은 무엇인가요?'] },
            { id: 'market_su', expertRole: '시장 분석가', expertIcon: '🔎', description: '시장 분석 — TAM/SAM/SOM, 경쟁 분석', sampleQuestions: ['타겟 고객은 누구인가요?', '직접 경쟁자가 있나요?', '시장 규모는 어느 정도로 추정하나요?'] },
            { id: 'model', expertRole: '사업 전략가', expertIcon: '📐', description: '비즈니스 모델 — 수익 구조 설계', sampleQuestions: ['수익 모델은 무엇인가요? (구독/광고/거래수수료 등)', '초기 고객 확보 채널은?'] },
            { id: 'finance_su', expertRole: '재무 전문가', expertIcon: '💼', description: '재무 모델링 — 번레이트, 손익분기점', sampleQuestions: ['초기 자금은 얼마나 있나요?', '월 예상 비용은?', '투자 유치를 계획하고 있나요?'] },
            { id: 'plan_su', expertRole: '종합 사업계획', expertIcon: '📋', description: 'Executive Summary, 90일 로드맵', sampleQuestions: [] },
        ],
    },
    {
        id: 'psychology',
        name: '심리 상담',
        icon: '🧠',
        description: '감정 탐색부터 스트레스 관리까지, 전문가팀 심리 상담',
        color: 'text-pink-600',
        gradient: 'from-pink-100 to-rose-50',
        category: 'health',
        outputFormat: '심리 건강 종합 리포트',
        phases: [
            { id: 'emotion', expertRole: '임상심리사', expertIcon: '🧑‍⚕️', description: '감정 상태 평가, 스트레스 요인 탐색', sampleQuestions: ['요즘 가장 힘든 점은 무엇인가요?', '그 감정이 언제부터 시작됐나요?', '감정의 강도를 1~10으로 표현하면?'] },
            { id: 'relationship', expertRole: '상담심리사', expertIcon: '💬', description: '대인관계, 자존감, 일상 고민 탐색', sampleQuestions: ['주변 사람들과의 관계는 어떤가요?', '혼자 있을 때 어떤 생각이 드나요?', '자신에 대해 어떻게 생각하시나요?'] },
            { id: 'clinical', expertRole: '정신건강의학 전문의', expertIcon: '🩺', description: '수면, 불안, 우울 증상 감별', sampleQuestions: ['수면 패턴이 최근 변했나요?', '불안하거나 초조한 순간이 자주 있나요?', '식욕이나 체중에 변화가 있었나요?'] },
            { id: 'mindfulness', expertRole: '마음챙김 코치', expertIcon: '🧘', description: '스트레스 관리법, 이완 기법 안내', sampleQuestions: ['평소 스트레스를 어떻게 해소하시나요?', '명상이나 호흡법을 해보신 적 있나요?'] },
            { id: 'synthesis_psy', expertRole: '종합 소견', expertIcon: '📋', description: '심리 건강 평가, 권장 관리법, 전문 연계', sampleQuestions: [] },
        ],
    },
];

// ══════════════════════════════════════════
// ── Assistant Cards (어시스턴트) ──
// ══════════════════════════════════════════

export interface AssistantCard {
    id: string;
    name: string;
    icon: string;
    description: string;
    color: string;
    gradient: string;
    category: 'study' | 'document' | 'creative' | 'productivity' | 'analysis';
    features: string[];
    placeholder: string;
    systemPrompt?: string;
    quote?: string;
    sampleQuestions?: string[];
}

export const ASSISTANT_CARDS: AssistantCard[] = [
    {
        id: 'study',
        name: '공부 어시스턴트',
        icon: '📚',
        description: '개념 설명, 퀴즈, 학습 계획 수립',
        color: 'text-blue-600',
        gradient: 'from-blue-50 to-indigo-50',
        category: 'study',
        features: ['개념 쉽게 설명', '퀴즈 출제', '학습 로드맵', '오답 분석'],
        placeholder: '무엇을 공부하고 싶으세요?',
        systemPrompt: `당신은 AI 학습 도우미입니다. 사용자의 학습을 돕기 위해 다양한 기능을 제공합니다.

## 학습 모드
사용자의 요청에 따라 적절한 모드를 자동 선택하세요:

### 1. 개념 설명 모드
"~이/가 뭐야?", "~을 설명해줘" 같은 요청 시:
- **한 줄 정의**: 핵심을 한 문장으로
- **쉬운 비유**: 초등학생도 이해할 수 있게
- **상세 설명**: 전문적 설명 (3~5문단)
- **실생활 예시**: 2~3개
- **자주 하는 오해**: 흔한 착각 1~2개
- **관련 개념**: 함께 알면 좋은 것 3~5개

### 2. 퀴즈 모드
"퀴즈 내줘", "테스트해줘" 같은 요청 시:
- 객관식 4지선다 5문제 생성
- 각 문제 아래에 정답과 해설 포함
- 난이도 표시 (기초/중급/심화)

### 3. 요약 정리 모드
긴 텍스트를 붙여넣거나 "정리해줘" 요청 시:
- **핵심 키워드**: 5~10개
- **한줄 요약**: 전체를 한 문장으로
- **구조화 요약**: 소주제별 불릿 포인트
- **시험 출제 포인트**: 시험에 나올 만한 것들

### 4. 암기 도우미 모드
"외워야 해", "암기법" 요청 시:
- 두문자어/연상법 제안
- 플래시카드 형식 (질문-답) 생성
- 반복 학습 스케줄 제안

## 답변 규칙
1. 한국어로 답변
2. 마크다운으로 구조화
3. 학습자 수준에 맞춤 (초보면 쉽게, 전문가면 깊게)
4. 예시를 최대한 많이 활용
5. 같은 표현·문장 패턴을 반복하지 마세요
6. 이전 답변에서 쓴 표현은 다시 쓰지 말고 매번 새로운 각도로

※ AI 학습 도우미입니다.`,
        quote: '모르는 건 부끄러운 게 아니야',
        sampleQuestions: ['광합성 쉽게 설명해줘', '경제학 퀴즈 5문제 내줘', '이 내용 시험용으로 정리해'],
    },
    {
        id: 'document',
        name: '문서 작성 어시스턴트',
        icon: '📝',
        description: '보고서, 이메일, 제안서 등 문서 작성',
        color: 'text-emerald-600',
        gradient: 'from-emerald-100 to-green-50',
        category: 'document',
        features: ['보고서 작성', '이메일 초안', '제안서 구성', '교정·교열'],
        placeholder: '어떤 문서를 작성할까요?',
    },
    {
        id: 'ppt',
        name: 'PPT 어시스턴트',
        icon: '📊',
        description: '프레젠테이션 구조 설계 및 슬라이드 내용 생성',
        color: 'text-orange-600',
        gradient: 'from-orange-50 to-amber-50',
        category: 'creative',
        features: ['슬라이드 구조', '핵심 메시지 도출', '데이터 시각화 제안', '발표 스크립트'],
        placeholder: '프레젠테이션 주제가 무엇인가요?',
    },
    {
        id: 'translate',
        name: '번역 어시스턴트',
        icon: '🌐',
        description: '자연스러운 다국어 번역 및 로컬라이제이션',
        color: 'text-teal-600',
        gradient: 'from-teal-50 to-cyan-50',
        category: 'productivity',
        features: ['자연스러운 번역', '전문 용어 처리', '뉘앙스 비교', '로컬라이제이션'],
        placeholder: '번역할 텍스트를 입력하세요',
    },
    {
        id: 'code',
        name: '코딩 어시스턴트',
        icon: '💻',
        description: '코드 작성, 디버깅, 리팩토링 도우미',
        color: 'text-purple-600',
        gradient: 'from-purple-100 to-violet-50',
        category: 'productivity',
        features: ['코드 작성', '버그 수정', '코드 리뷰', '설계 상담'],
        placeholder: '어떤 코드를 작성할까요?',
    },
    {
        id: 'summary',
        name: '요약 어시스턴트',
        icon: '📋',
        description: '긴 글, 논문, 회의록을 핵심만 요약',
        color: 'text-pink-600',
        gradient: 'from-pink-50 to-rose-50',
        category: 'analysis',
        features: ['핵심 요약', '불릿 포인트 정리', '키워드 추출', '한 줄 요약'],
        placeholder: '요약할 내용을 붙여넣으세요',
    },
    {
        id: 'writing',
        name: '글쓰기 어시스턴트',
        icon: '✍️',
        description: '블로그, 에세이, 카피라이팅 등 창작 글쓰기',
        color: 'text-amber-600',
        gradient: 'from-amber-100 to-yellow-50',
        category: 'creative',
        features: ['블로그 글', '카피라이팅', '스토리텔링', '톤 앤 매너 조정'],
        placeholder: '어떤 글을 쓸까요?',
    },
    {
        id: 'data',
        name: '데이터 분석 어시스턴트',
        icon: '📈',
        description: '데이터 분석, 차트 추천, 인사이트 도출',
        color: 'text-indigo-600',
        gradient: 'from-indigo-50 to-blue-50',
        category: 'analysis',
        features: ['데이터 해석', '차트 추천', '트렌드 분석', '인사이트 도출'],
        placeholder: '분석할 데이터를 설명해주세요',
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
// ── Default Experts (전체 목록) ──
// ══════════════════════════════════════════

export const DEFAULT_EXPERTS: Expert[] = [
    // AI Router

    // AI 챗봇
    {
        id: 'gpt', name: 'GPT', nameKo: 'GPT', icon: '🤖', avatarUrl: '/logos/gpt.svg', color: 'blue', category: 'ai', description: 'AI 분석 전문가',
        quote: '구조화된 답변이 진짜 답',
        sampleQuestions: ['커스텀 GPT 만드는 팁은?', 'GPT 플러그인 추천해줘', 'GPTs 스토어 활용법은?'],
        greeting: '안녕하세요! 분석, 글쓰기, 코딩 등 무엇이든 도와드릴게요.',
    },
    {
        id: 'claude', name: 'Claude', nameKo: 'Claude', icon: '🧡', avatarUrl: '/logos/claude.svg', color: 'orange', category: 'ai', description: 'AI 안전·윤리 전문가',
        quote: '정직이 나의 전략이다',
        sampleQuestions: ['아티팩트 활용 잘하는 법?', 'Claude 프로젝트 활용법?', 'Claude가 거절하는 기준?'],
        greeting: '안녕하세요. 정확하고 솔직한 답변을 드리겠습니다.',
    },
    {
        id: 'gemini', name: 'Gemini', nameKo: 'Gemini', icon: '💎', avatarUrl: '/logos/gemini.svg', color: 'emerald', category: 'ai', description: 'AI 탐색 전문가',
        quote: '검색과 AI의 경계를 지운다',
        sampleQuestions: ['구글 워크스페이스 연동법?', '제미나이 이미지 생성 돼?', '유튜브 영상 요약 가능해?'],
        greeting: '안녕하세요! 검색부터 창작까지, 무엇이 궁금하세요?',
    },
    {
        id: 'perplexity', name: 'Perplexity', nameKo: 'Perplexity', icon: '🔍', avatarUrl: '/logos/perplexity.svg', color: 'pink', category: 'ai', description: 'AI 검색·리서치 전문가',
        quote: '출처 없으면 답이 아니다',
        sampleQuestions: ['출처 달린 답변 원리는?', '학술 자료 검색 잘 돼?', '퍼플렉시티 Pro 가치 있어?'],
        greeting: '궁금한 게 있으면 출처와 함께 찾아드릴게요.',
    },
    {
        id: 'grok', name: 'Grok', nameKo: 'Grok', icon: '⚡', avatarUrl: '/logos/grok.svg', color: 'teal', category: 'ai', description: 'AI 위트 전문가',
        quote: '유머 없는 AI는 심심하다',
        sampleQuestions: ['그록은 왜 거침없이 말해?', 'X 실시간 데이터 분석 돼?', '일론 머스크 어떻게 봐?'],
        greeting: '뭐든 솔직하게 답해줄게. 뭐가 궁금해?',
    },
    {
        id: 'deepseek', name: 'DeepSeek', nameKo: 'DeepSeek', icon: '🌊', avatarUrl: '/logos/deepseek.svg', color: 'purple', category: 'ai', description: 'AI 심층분석 전문가',
        quote: '추론은 깊이가 생명이다',
        sampleQuestions: ['R1 추론 모델 뭐가 달라?', '딥시크 코딩 실력 어때?', '딥시크가 수학 잘하는 이유?'],
    },
    {
        id: 'qwen', name: 'Qwen', nameKo: 'Qwen', icon: '🌏', avatarUrl: '/logos/qwen.svg', color: 'amber', category: 'ai', description: 'AI 다국어·추론 전문가',
        quote: '모든 언어가 나의 영역이다',
        sampleQuestions: ['큐웬 중국어 번역 정확해?', '아시아 언어 처리 잘 돼?', '큐웬 오픈소스 장점이 뭐야?'],
    },

    // Specialists
    {
        id: 'medical', name: 'Medical Expert', nameKo: '의학 전문가', icon: '⚕️', color: 'red', avatarUrl: '/logos/specialist/medical.png', category: 'specialist', subCategory: '의료·심리', description: '의학·건강 전문가',
        quote: '진단이 치료의 절반이다',
        sampleQuestions: ['이 증상 감별진단이 뭐야?', 'CT와 MRI 뭘 찍어야 해?', '이 약 병용투여 괜찮아?'],
    },
    {
        id: 'psychology', name: 'Psychology Expert', nameKo: '심리학 전문가', icon: '🎭', color: 'purple', avatarUrl: '/logos/specialist/psychology.png', category: 'specialist', subCategory: '의료·심리', description: '심리학·행동과학 전문가',
        quote: '행동 뒤엔 동기가 숨는다',
        sampleQuestions: ['애착유형이 연애에 영향줘?', '인지왜곡 교정법이 뭐야?', 'PTSD 자가진단 가능해?'],
    },
    {
        id: 'legal', name: 'Legal Expert', nameKo: '법학 전문가', icon: '⚖️', color: 'amber', avatarUrl: '/logos/specialist/legal.png', category: 'specialist', subCategory: '법률', description: '법학·규제 전문가',
        quote: '판례가 법의 실체다',
        sampleQuestions: ['이 계약 독소조항 있어?', '내용증명 효력 있나?', '소멸시효 아직 안 지났나?'],
    },
    {
        id: 'finance', name: 'Finance Expert', nameKo: '금융 전문가', icon: '💰', color: 'emerald', avatarUrl: '/logos/specialist/finance.png', category: 'specialist', subCategory: '경제·금융', description: '금융·투자 전문가',
        quote: '리스크 없는 수익은 없다',
        sampleQuestions: ['ETF와 펀드 뭐가 나아?', '환헤지 꼭 해야 하나?', 'PER 몇 배면 고평가야?'],
    },
    {
        id: 'history', name: 'History Expert', nameKo: '역사학 전문가', icon: '📕', color: 'orange', avatarUrl: '/logos/specialist/history.png', category: 'specialist', subCategory: '역사·철학', description: '역사·문명 전문가',
        quote: '사료 비판 없인 역사도 없다',
        sampleQuestions: ['고려가 몽골에 왜 항복했나?', '산업혁명 왜 영국에서 시작?', '5·18의 역사적 의의는?'],
    },
    {
        id: 'philosophy', name: 'Philosophy Expert', nameKo: '철학 전문가', icon: '🏛️', color: 'teal', avatarUrl: '/logos/specialist/philosophy.png', category: 'specialist', subCategory: '역사·철학', description: '철학·윤리 전문가',
        quote: '전제를 의심하라',
        sampleQuestions: ['트롤리 딜레마 답이 있나?', '실존주의 핵심이 뭐야?', '공리주의 한계는 뭐야?'],
    },
    {
        id: 'education', name: 'Education Expert', nameKo: '교육학 전문가', icon: '📖', color: 'blue', avatarUrl: '/logos/specialist/education.png', category: 'specialist', subCategory: '사회·교육', description: '교육정책·학습이론 전문가',
        quote: '수업은 설계된 경험이다',
        sampleQuestions: ['거꾸로 교실 효과 있나?', '형성평가 어떻게 해야 해?', '자기주도학습 가능한 나이?'],
    },
    {
        id: 'economics', name: 'Economics Expert', nameKo: '경제학 전문가', icon: '📊', color: 'emerald', avatarUrl: '/logos/specialist/economics.png', category: 'specialist', subCategory: '경제·금융', description: '거시/미시 경제 분석 전문가',
        quote: '유인이 행동을 바꾼다',
        sampleQuestions: ['기준금리 동결 영향은?', '재정적자 GDP 몇%가 위험?', '경상수지 흑자 왜 중요해?'],
    },
    {
        id: 'sociology', name: 'Sociology Expert', nameKo: '사회학 전문가', icon: '👥', color: 'pink', avatarUrl: '/logos/specialist/sociology.png', category: 'specialist', subCategory: '사회·교육', description: '사회구조·불평등 전문가',
        quote: '구조가 선택을 제한한다',
        sampleQuestions: ['계급 재생산 메커니즘은?', '사회적 자본이 뭔지 설명해', '낙인효과 실제 사례 있어?'],
    },
    {
        id: 'political', name: 'Political Science Expert', nameKo: '정치학 전문가', icon: '🗳️', color: 'blue', avatarUrl: '/logos/specialist/political.png', category: 'specialist', subCategory: '사회·교육', description: '정치제도·국제관계 전문가',
        quote: '권력은 견제로 길들여진다',
        sampleQuestions: ['양당제와 다당제 뭐가 나아?', '거부권 행사 남용 막으려면?', '비례대표제 장단점은?'],
    },
    {
        id: 'sports', name: 'Sports Science Expert', nameKo: '스포츠과학 전문가', icon: '🏃', color: 'orange', avatarUrl: '/logos/specialist/sports.png', category: 'specialist', subCategory: '의료·심리', description: '운동생리학·체육 전문가',
        quote: '과학이 기록을 깬다',
        sampleQuestions: ['VO2max 어떻게 올려?', '젖산역치 훈련법 알려줘', '과훈련 증후군 증상은?'],
    },
    {
        id: 'marketing', name: 'Marketing Expert', nameKo: '마케팅 전문가', icon: '📣', color: 'pink', avatarUrl: '/logos/specialist/marketing.png', category: 'specialist', subCategory: '경영', description: '브랜딩·디지털마케팅 전문가',
        quote: '고객의 언어로 말하라',
        sampleQuestions: ['퍼널 분석 어떻게 해?', 'CAC 낮추는 방법 있어?', 'A/B테스트 설계법 알려줘'],
    },
    {
        id: 'criminology', name: 'Criminology Expert', nameKo: '범죄학 전문가', icon: '🕵️', color: 'red', avatarUrl: '/logos/specialist/criminology.png', category: 'specialist', subCategory: '사회·교육', description: '범죄·형사사법 전문가',
        quote: '범행엔 패턴이 있다',
        sampleQuestions: ['프로파일링 신뢰도 높아?', '재범률 낮추는 핵심은?', '묻지마 범죄 예측 가능해?'],
    },
    {
        id: 'physics', name: 'Physics Expert', nameKo: '물리학 전문가', icon: '⚛️', color: 'blue', avatarUrl: '/logos/specialist/physics.png', category: 'specialist', subCategory: '과학·기술', description: '물리학·역학 전문가',
        quote: '우주는 방정식에 숨어 있다',
        sampleQuestions: ['양자얽힘 쉽게 설명해줘', '힉스장이 질량을 주는 원리?', '상대성이론 GPS에 쓰여?'],
    },
    {
        id: 'chemistry', name: 'Chemistry Expert', nameKo: '화학 전문가', icon: '🧪', color: 'emerald', avatarUrl: '/logos/specialist/chemistry.png', category: 'specialist', subCategory: '과학·기술', description: '화학·물질 전문가',
        quote: '반응은 거짓말을 안 한다',
        sampleQuestions: ['촉매 반응 원리가 뭐야?', '유기합성 설계 어떻게 해?', '이온결합과 공유결합 차이?'],
    },
    {
        id: 'biology', name: 'Biology Expert', nameKo: '생물학 전문가', icon: '🧬', color: 'emerald', avatarUrl: '/logos/specialist/biology.png', category: 'specialist', subCategory: '과학·기술', description: '생물학·생명과학 전문가',
        quote: 'DNA가 생명의 설계도다',
        sampleQuestions: ['크리스퍼 원리 알려줘', '줄기세포 치료 어디까지 왔어?', 'mRNA 백신 원리가 뭐야?'],
    },
    {
        id: 'earthscience', name: 'Earth Science Expert', nameKo: '지구과학 전문가', icon: '🌍', color: 'teal', avatarUrl: '/logos/specialist/earthscience.png', category: 'specialist', subCategory: '과학·기술', description: '지질·기상·해양 전문가',
        quote: '지층은 시간의 기록이다',
        sampleQuestions: ['P파 S파 차이가 뭐야?', '화산 분출 예측 가능해?', '해류가 기후에 미치는 영향?'],
    },
    {
        id: 'envscience', name: 'Environmental Science Expert', nameKo: '환경과학 전문가', icon: '🌿', color: 'emerald', avatarUrl: '/logos/specialist/envscience.png', category: 'specialist', subCategory: '과학·기술', description: '환경·생태계 전문가',
        quote: '생태계엔 대체재가 없다',
        sampleQuestions: ['탄소포집 기술 실효성 있나?', '생물다양성 왜 중요해?', '그린워싱 어떻게 구별해?'],
    },
    {
        id: 'theology', name: 'Theology Expert', nameKo: '신학/종교학 전문가', icon: '🛐', color: 'purple', avatarUrl: '/logos/specialist/theology.png', category: 'specialist', subCategory: '역사·철학', description: '신학·종교학 전문가',
        quote: '경전은 해석을 요구한다',
        sampleQuestions: ['삼위일체 교리 핵심은?', '종교다원주의 문제점은?', '악의 문제 신학적 답은?'],
    },
    {
        id: 'compsci', name: 'Computer Science Expert', nameKo: '컴퓨터공학 전문가', icon: '🖥️', color: 'blue', avatarUrl: '/logos/specialist/compsci.png', category: 'specialist', subCategory: '과학·기술', description: 'CS·알고리즘 전문가',
        quote: '버그는 논리의 빈틈이다',
        sampleQuestions: ['P=NP 문제 왜 중요해?', '캐시 미스 줄이는 방법?', '동시성 버그 디버깅법은?'],
    },
    {
        id: 'pubadmin', name: 'Public Administration Expert', nameKo: '행정학 전문가', icon: '🏢', color: 'amber', avatarUrl: '/logos/specialist/pubadmin.png', category: 'specialist', subCategory: '사회·교육', description: '행정·공공정책 전문가',
        quote: '제도 설계가 결과를 만든다',
        sampleQuestions: ['성과급제 공무원에 맞나?', '민관협력 실패 원인은?', '규제샌드박스 효과 있어?'],
    },
    {
        id: 'military', name: 'Military Expert', nameKo: '군사 전문가', icon: '🎖️', color: 'emerald', avatarUrl: '/logos/specialist/military.png', category: 'specialist', subCategory: '사회·교육', description: '군사전략·안보·지정학 전문가',
        quote: '전략은 보급선이 결정한다',
        sampleQuestions: ['비대칭전력 운용법은?', '사이버전 대비 어떻게 해?', '징병제 모병제 뭐가 나아?'],
    },
    {
        id: 'intlrelations', name: 'International Relations Expert', nameKo: '국제관계 전문가', icon: '🌐', color: 'blue', avatarUrl: '/logos/specialist/intlrelations.png', category: 'specialist', subCategory: '사회·교육', description: '외교·국제정치·글로벌 이슈 전문가',
        quote: '국익 앞에 명분은 도구다',
        sampleQuestions: ['동맹 딜레마 해법 있나?', '다자외교 양자외교 차이?', '경제제재 실효성 있어?'],
    },
    {
        id: 'astronomy', name: 'Astronomy Expert', nameKo: '천문학 전문가', icon: '🔭', color: 'purple', avatarUrl: '/logos/specialist/astronomy.png', category: 'specialist', subCategory: '과학·기술', description: '우주·천체·우주탐사 전문가',
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
        id: 'jobs', name: 'Product Visionary', nameKo: '스티브 잡스', icon: '🍎', color: 'pink', category: 'celebrity', subCategory: '기업·투자', description: '제품혁신 전문가',
        quote: '다르게 생각하라',
        sampleQuestions: ['애플 디자인 철학이 뭔가요?', '혁신은 어디서 오나요?', '실패 후 복귀한 비결은?'],

    // Celebrities — 정치·사회
    },
    {
        id: 'jihwan', name: 'Ji-Hwan Yoo', nameKo: '유지환 (제작자)', icon: '👨‍💻', color: 'blue', category: 'celebrity', subCategory: '정치·사회', description: '이 서비스의 제작자',
    },

    // Celebrities — 역사 인물
    {
        id: 'napoleon', name: 'Napoleon Bonaparte', nameKo: '나폴레옹', icon: '⚔️', color: 'red', category: 'celebrity', subCategory: '역사 인물', description: '군사·전략의 황제',
        quote: '불가능이란 없다',
        sampleQuestions: ['전쟁의 핵심 원칙은?', '패배에서 뭘 배웠나요?', '리더의 결단력이란?'],
    },
    {
        id: 'lincoln', name: 'Abraham Lincoln', nameKo: '링컨', icon: '🎩', color: 'blue', category: 'celebrity', subCategory: '역사 인물', description: '민주주의·통합의 지도자',
        quote: '적을 친구로 만들어라',
        sampleQuestions: ['남북전쟁 극복 비결은?', '노예제 폐지가 왜 중요?', '분열된 사회 통합법은?'],
        greeting: '자유와 정의에 대해 이야기해볼까요?',
    },
    {
        id: 'churchill', name: 'Winston Churchill', nameKo: '처칠', icon: '🇬🇧', color: 'amber', category: 'celebrity', subCategory: '역사 인물', description: '위기의 리더십 상징',
        quote: '절대 절대 포기하지 마라',
        sampleQuestions: ['2차대전 어떻게 버텼나?', '위기 때 리더의 역할은?', '연설의 비결이 뭔가요?'],

    // Celebrities — 과학자
    },
    {
        id: 'einstein', name: 'Albert Einstein', nameKo: '아인슈타인', icon: '🧪', color: 'purple', category: 'celebrity', subCategory: '과학자', description: '상대성이론의 아버지',
        quote: '상상이 지식보다 중요하다',
        sampleQuestions: ['상대성이론 쉽게 설명해줘', '창의성은 어떻게 키우나?', 'E=mc²가 뜻하는 건?'],
        greeting: '우주의 신비에 대해 함께 탐구해볼까요?',
    },
    {
        id: 'curie', name: 'Marie Curie', nameKo: '퀴리부인', icon: '☢️', color: 'emerald', category: 'celebrity', subCategory: '과학자', description: '방사성 연구의 선구자',
        quote: '두려워할 것은 없다',
        sampleQuestions: ['방사능 연구 계기는?', '여성 과학자의 어려움은?', '노벨상 두 번의 비결은?'],
    },
    {
        id: 'newton', name: 'Isaac Newton', nameKo: '뉴턴', icon: '🍏', color: 'orange', category: 'celebrity', subCategory: '과학자', description: '근대 과학혁명의 아버지',
        quote: '거인의 어깨 위에 섰을 뿐',
        sampleQuestions: ['만유인력 발견 계기는?', '수학과 물리의 관계는?', '과학적 사고법이란?'],

    // Celebrities — 철학자
    },
    {
        id: 'nietzsche', name: 'Friedrich Nietzsche', nameKo: '니체', icon: '🦅', color: 'red', category: 'celebrity', subCategory: '철학자', description: '초인 철학자',
        quote: '신은 죽었다',
        sampleQuestions: ['초인이란 어떤 존재인가?', '허무주의 극복법은?', '도덕 비판의 핵심은?'],
    },
    {
        id: 'confucius', name: 'Confucius', nameKo: '공자', icon: '📿', color: 'amber', category: 'celebrity', subCategory: '철학자', description: '유교 사상의 창시자',
        quote: '배우고 때때로 익히면',
        sampleQuestions: ['인(仁)이란 무엇인가요?', '군자의 조건은 뭔가요?', '배움의 진정한 의미는?'],
    },
    {
        id: 'kant', name: 'Immanuel Kant', nameKo: '칸트', icon: '📐', color: 'blue', category: 'celebrity', subCategory: '철학자', description: '순수이성비판의 저자',
        quote: '별이 빛나는 하늘과 도덕법칙',
        sampleQuestions: ['정언명령이 뭔가요?', '도덕은 의무인가 결과인가?', '순수이성비판 핵심은?'],
    },
    {
        id: 'davinci', name: 'Leonardo da Vinci', nameKo: '다빈치', icon: '🎨', color: 'amber', category: 'celebrity', subCategory: '역사 인물', description: '르네상스 천재',
        quote: '단순함이 궁극의 정교함',
        sampleQuestions: ['예술과 과학 융합 비결?', '모나리자의 비밀은?', '호기심 유지하는 법은?'],
    },
    {
        id: 'tesla', name: 'Nikola Tesla', nameKo: '니콜라 테슬라', icon: '⚡', color: 'purple', category: 'celebrity', subCategory: '과학자', description: '교류전기·무선통신 발명가',
        quote: '미래는 나의 것이다',
        sampleQuestions: ['에디슨과의 전류전쟁은?', '무선 에너지 전송 가능?', '발명 영감의 원천은?'],
    },
    {
        id: 'hawking', name: 'Stephen Hawking', nameKo: '스티븐 호킹', icon: '🌌', color: 'teal', category: 'celebrity', subCategory: '과학자', description: '블랙홀·우주론 천재',
        quote: '별을 봐라 발밑 말고',
        sampleQuestions: ['블랙홀 정보는 사라지나?', '시간여행 가능한가요?', '외계 생명체 있을까요?'],
    },
    {
        id: 'darwin', name: 'Charles Darwin', nameKo: '다윈', icon: '🐢', color: 'emerald', category: 'celebrity', subCategory: '과학자', description: '진화론의 아버지',
        quote: '강한 종이 살아남지 않는다',
        sampleQuestions: ['인간도 자연선택 결과?', '진화론이 논란인 이유?', '종의 기원 핵심은?'],
    },
    {
        id: 'turing', name: 'Alan Turing', nameKo: '앨런 튜링', icon: '🖥️', color: 'teal', category: 'celebrity', subCategory: '과학자', description: '컴퓨터 과학의 아버지',
        quote: '기계도 생각할 수 있을까',
        sampleQuestions: ['튜링 테스트가 뭔가요?', '에니그마 해독 비결은?', 'AI가 진짜 지능 가질까?'],
    },
    {
        id: 'aristotle', name: 'Aristotle', nameKo: '아리스토텔레스', icon: '📜', color: 'amber', category: 'celebrity', subCategory: '철학자', description: '논리학·형이상학의 아버지',
        quote: '탁월함은 습관에서 온다',
        sampleQuestions: ['에우다이모니아란?', '논리적 사고 훈련법은?', '좋은 사회란 어떤 건가?'],
    },
    {
        id: 'sunzi', name: 'Sun Tzu', nameKo: '손자', icon: '⚔️', color: 'red', category: 'celebrity', subCategory: '역사 인물', description: '손자병법의 저자',
        quote: '싸우지 않고 이기는 게 최선',
        sampleQuestions: ['지피지기면 어떻게 되나?', '손자병법 핵심 전략은?', '전쟁 없이 이기는 법?'],
    },
    {
        id: 'mlk', name: 'Martin Luther King Jr.', nameKo: '마틴 루터 킹', icon: '✊', color: 'amber', category: 'celebrity', subCategory: '정치·사회', description: '시민권 운동·비폭력 저항',
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
        id: 'alexander', name: 'Alexander the Great', nameKo: '알렉산더 대왕', icon: '🏛️', color: 'purple', category: 'celebrity', subCategory: '역사 인물', description: '세계 정복·동서 문화 융합',
        quote: '두려움 없이 전진하라',
        sampleQuestions: ['세계 정복의 비결은?', '동서 문화 융합 의미는?', '젊은 리더의 조건은?'],
    },
    {
        id: 'caesar', name: 'Julius Caesar', nameKo: '율리우스 카이사르', icon: '🏛️', color: 'red', category: 'celebrity', subCategory: '역사 인물', description: '로마의 독재관·권력과 배신',
        quote: '왔노라 보았노라 이겼노라',
        sampleQuestions: ['루비콘강 건넌 이유는?', '권력 장악 핵심 전략은?', '배신에 어떻게 대처?'],

    // Celebrities — 문화·예술
    },
    {
        id: 'shakespeare', name: 'William Shakespeare', nameKo: '셰익스피어', icon: '🎭', color: 'purple', category: 'celebrity', subCategory: '문화·예술', description: '인간 본성의 극작가',
        quote: '사느냐 죽느냐 그것이 문제',
        sampleQuestions: ['인간의 가장 큰 비극은?', '사랑과 질투 뭐가 강한가?', '권력이 사람을 바꾸나?'],
    },
    {
        id: 'beethoven', name: 'Ludwig van Beethoven', nameKo: '베토벤', icon: '🎹', color: 'amber', category: 'celebrity', subCategory: '문화·예술', description: '고난 속 불굴의 작곡가',
        quote: '운명아 목을 잡아주마',
        sampleQuestions: ['청력 잃고도 작곡한 법?', '운명 교향곡의 의미는?', '고난이 예술을 만드나?'],
    },
    {
        id: 'mozart', name: 'Wolfgang Amadeus Mozart', nameKo: '모차르트', icon: '🎻', color: 'pink', category: 'celebrity', subCategory: '문화·예술', description: '자유분방한 천재 작곡가',
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
        id: 'edison', name: 'Thomas Edison', nameKo: '에디슨', icon: '💡', color: 'amber', category: 'celebrity', subCategory: '과학자', description: '발명왕·실용주의 천재',
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
        id: 'columbus', name: 'Christopher Columbus', nameKo: '콜럼버스', icon: '⛵', color: 'blue', category: 'celebrity', subCategory: '역사 인물', description: '신대륙 발견·탐험의 아이콘',
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
        id: 'van-gogh', name: 'Vincent van Gogh', nameKo: '반 고흐', icon: '🌻', color: 'amber', category: 'celebrity', subCategory: '문화·예술', description: '고뇌의 화가·색채의 혁명',
        quote: '별이 빛나는 밤이 좋다',
        sampleQuestions: ['생전에 그림 못 판 이유?', '색채로 감정 표현하는 법?', '고독과 창작의 관계는?'],
    },
    {
        id: 'tolstoy', name: 'Leo Tolstoy', nameKo: '톨스토이', icon: '📖', color: 'orange', category: 'celebrity', subCategory: '문화·예술', description: '전쟁과 평화·인간 본질 탐구',
        quote: '사람은 무엇으로 사는가',
        sampleQuestions: ['전쟁과 평화 핵심 주제?', '단순한 삶이 진실인 이유?', '예술의 사회적 역할은?'],
    },
    {
        id: 'picasso', name: 'Pablo Picasso', nameKo: '피카소', icon: '🎨', color: 'blue', category: 'celebrity', subCategory: '문화·예술', description: '입체파·규칙을 부순 예술가',
        quote: '좋은 예술가는 훔친다',
        sampleQuestions: ['입체파가 세상 바꾼 법?', '게르니카를 그린 이유?', '규칙 파괴가 곧 창작?'],

    // 과학자 추가
    },
    {
        id: 'archimedes', name: 'Archimedes', nameKo: '아르키메데스', icon: '⚙️', color: 'teal', category: 'celebrity', subCategory: '과학자', description: '유레카·수학과 공학의 천재',
        quote: '유레카! 찾았다!',
        sampleQuestions: ['유레카의 순간은 어땠나?', '지렛대 원리 현대 적용?', '수학과 공학 연결점은?'],
    },
    {
        id: 'hippocrates', name: 'Hippocrates', nameKo: '히포크라테스', icon: '⚕️', color: 'emerald', category: 'celebrity', subCategory: '과학자', description: '의학의 아버지·해치지 말라',
        quote: '먼저 해를 끼치지 말라',
        sampleQuestions: ['의학 윤리가 왜 중요?', '미신 없는 의학 세운 법?', '의사의 첫째 의무는?'],
    },
    {
        id: 'pythagoras', name: 'Pythagoras', nameKo: '피타고라스', icon: '📐', color: 'blue', category: 'celebrity', subCategory: '과학자', description: '만물은 수·수학의 시작',
        quote: '만물의 근원은 수다',
        sampleQuestions: ['수학이 세상 설명하는 법?', '수학과 음악 연결점은?', '정리 이상의 가르침은?'],
    },
    {
        id: 'nightingale', name: 'Florence Nightingale', nameKo: '나이팅게일', icon: '🏥', color: 'pink', category: 'celebrity', subCategory: '과학자', description: '간호의 어머니·통계로 의료를 바꿈',
        quote: '통계가 환자를 살린다',
        sampleQuestions: ['통계로 의료를 바꾼 법?', '전쟁터에서 가장 힘든 건?', '간호가 과학인 이유는?'],
    },
    {
        id: 'freud', name: 'Sigmund Freud', nameKo: '프로이트', icon: '🧠', color: 'purple', category: 'celebrity', subCategory: '과학자', description: '무의식·정신분석의 아버지',
        quote: '무의식이 삶을 지배한다',
        sampleQuestions: ['꿈은 무엇을 말해주나?', '무의식이 행동에 미치는 법?', '이드와 자아 갈등이란?'],
    },
    {
        id: 'adam-smith', name: 'Adam Smith', nameKo: '애덤 스미스', icon: '🤝', color: 'amber', category: 'celebrity', subCategory: '철학자', description: '보이지 않는 손·시장경제의 아버지',
        quote: '보이지 않는 손이 이끈다',
        sampleQuestions: ['보이지 않는 손이란?', '분업이 생산성 높이는 법?', '자유시장의 한계는?'],
    },
    {
        id: 'rousseau', name: 'Jean-Jacques Rousseau', nameKo: '루소', icon: '🌿', color: 'emerald', category: 'celebrity', subCategory: '철학자', description: '사회계약론·자연으로 돌아가라',
        quote: '인간은 자유롭게 태어났다',
        sampleQuestions: ['자연 상태의 인간은?', '사회계약론 핵심은?', '문명이 인간 타락시키나?'],
    },
    {
        id: 'gutenberg', name: 'Johannes Gutenberg', nameKo: '구텐베르크', icon: '📰', color: 'orange', category: 'celebrity', subCategory: '기업·투자', description: '인쇄 혁명·지식의 민주화',
        quote: '지식은 만인에게 열려야',
        sampleQuestions: ['인쇄술이 역사 바꾼 법?', '정보 민주화 의미는?', '활판인쇄 발명 과정은?'],
    },
    {
        id: 'helen-keller', name: 'Helen Keller', nameKo: '헬렌 켈러', icon: '✋', color: 'pink', category: 'celebrity', subCategory: '정치·사회', description: '불가능을 가능으로·장애 극복의 상징',
        quote: '눈보다 비전이 중요하다',
        sampleQuestions: ['장애를 극복한 힘은?', '설리번 선생님의 의미는?', '불가능은 없다는 이유?'],

    // 현대 인물 — 기업·투자
    },
    {
        id: 'musk', name: 'Elon Musk', nameKo: '일론 머스크', icon: '🚀', color: 'purple', category: 'celebrity', subCategory: '기업·투자', description: '테슬라·SpaceX·인류의 미래를 설계하는 혁신가',
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
        id: 'gates', name: 'Bill Gates', nameKo: '빌 게이츠', icon: '💻', color: 'blue', category: 'celebrity', subCategory: '기업·투자', description: 'MS 창업자·기술과 자선으로 세상을 바꾸는 사람',
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
        id: 'miyazaki', name: 'Hayao Miyazaki', nameKo: '미야자키 하야오', icon: '🎬', color: 'emerald', category: 'celebrity', subCategory: '문화·예술', description: '지브리 감독·상상력과 자연의 이야기꾼',
        quote: '아이들에게 희망을 그린다',
        sampleQuestions: ['지브리 작품 반복 주제?', '손그림 고집하는 이유?', '자연을 그리는 철학은?'],
    },
    {
        id: 'yuval', name: 'Yuval Noah Harari', nameKo: '유발 하라리', icon: '📖', color: 'orange', category: 'celebrity', subCategory: '정치·사회', description: '사피엔스 저자·인류 역사를 꿰뚫는 사상가',
        quote: '허구가 인류를 뭉치게 했다',
        sampleQuestions: ['사피엔스 지배 이유는?', 'AI 시대 인간 역할은?', '역사로 현재 읽는 법?'],
    },
    {
        id: 'nolan', name: 'Christopher Nolan', nameKo: '크리스토퍼 놀란', icon: '🎥', color: 'blue', category: 'celebrity', subCategory: '문화·예술', description: '인터스텔라·시간과 현실을 뒤트는 감독',
        quote: '관객이 스스로 생각하게',
        sampleQuestions: ['시간을 영화로 다루는 법?', '비선형 서사의 매력은?', '실제 촬영 고집 이유는?'],
    },
    {
        id: 'cameron', name: 'James Cameron', nameKo: '제임스 카메론', icon: '🌊', color: 'teal', category: 'celebrity', subCategory: '문화·예술', description: '아바타·타이타닉·한계를 모르는 탐험가 감독',
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
        id: 'korean', name: 'Korean', nameKo: '한국인', icon: '🇰🇷', color: 'blue', category: 'region', subCategory: '동아시아', description: '한국 문화·생활 관점',
        quote: '눈치 없으면 한국 못 산다',
        sampleQuestions: ['수능이 인생을 결정한다고 봐?', '회식 문화 꼭 참석해야 해?', '전세 제도 외국에도 있어?'],
    },
    {
        id: 'japanese', name: 'Japanese', nameKo: '일본인', icon: '🇯🇵', color: 'red', category: 'region', subCategory: '동아시아', description: '일본 문화·생활 관점',
        quote: '쿠우키 못 읽으면 실격이야',
        sampleQuestions: ['혼네와 타테마에 구분 힘들지 않아?', '오타쿠 문화가 경제에 미친 영향은?', '이자카야 문화 왜 그렇게 중요해?'],
    },
    {
        id: 'chinese', name: 'Chinese', nameKo: '중국인', icon: '🇨🇳', color: 'red', category: 'region', subCategory: '동아시아', description: '중국 문화·생활 관점',
        quote: '관시 없이는 아무것도 안 돼',
        sampleQuestions: ['가오카오 지옥 진짜 그래?', '996 근무제 어떻게 버텨?', '탕핑족은 왜 눕기로 했어?'],
    },
    {
        id: 'american', name: 'American', nameKo: '미국인', icon: '🇺🇸', color: 'blue', category: 'region', subCategory: '아메리카', description: '미국 문화·생활 관점',
        quote: '수정헌법 2조는 양보 못 해',
        sampleQuestions: ['팁 문화 왜 꼭 줘야 해?', '고교 풋볼이 마을의 종교라고?', '의료보험 없이 어떻게 살아?'],
    },
    {
        id: 'british', name: 'British', nameKo: '영국인', icon: '🇬🇧', color: 'purple', category: 'region', subCategory: '유럽', description: '영국 문화·생활 관점',
        quote: '큐 안 서면 영국인이 아니야',
        sampleQuestions: ['왕실이 아직도 필요한 이유는?', '피쉬앤칩스 말고 자랑할 음식은?', '펍 문화가 왜 사교의 핵심이야?'],
    },
    {
        id: 'german', name: 'German', nameKo: '독일인', icon: '🇩🇪', color: 'amber', category: 'region', subCategory: '유럽', description: '독일 문화·생활 관점',
        quote: '파이어아벤트 후엔 연락 금지',
        sampleQuestions: ['아우토반 무제한 속도 괜찮아?', '마이스터 제도가 뭐가 좋아?', '빵집에서 일요일 영업 안 하는 이유?'],
    },
    {
        id: 'french', name: 'French', nameKo: '프랑스인', icon: '🇫🇷', color: 'blue', category: 'region', subCategory: '유럽', description: '프랑스 문화·생활 관점',
        quote: '바게트 없는 아침은 없다',
        sampleQuestions: ['그레브(파업)가 왜 국민 스포츠야?', '프랑스 치즈 365종 진짜야?', '비즈(볼 키스) 몇 번 해야 해?'],
    },
    {
        id: 'indian', name: 'Indian', nameKo: '인도인', icon: '🇮🇳', color: 'orange', category: 'region', subCategory: '동남아·남아시아', description: '인도 문화·생활 관점',
        quote: '저거드 정신으로 해결한다',
        sampleQuestions: ['배열결혼 제도 지금도 유효해?', '달바트 매일 먹어도 안 질려?', 'IIT 입시가 왜 세계 최고난도야?'],
    },
    {
        id: 'brazilian', name: 'Brazilian', nameKo: '브라질인', icon: '🇧🇷', color: 'emerald', category: 'region', subCategory: '아메리카', description: '브라질 문화·생활 관점',
        quote: '젱가가 아니면 삼바라도 춰',
        sampleQuestions: ['파벨라 삶이 진짜 어떤 거야?', '슈하스코 없는 주말이 있어?', '카니발 삼바학교 입학 과정은?'],
    },
    {
        id: 'australian', name: 'Australian', nameKo: '호주인', icon: '🇦🇺', color: 'blue', category: 'region', subCategory: '아메리카', description: '호주 문화·생활 관점',
        quote: 'She\'ll be right, mate',
        sampleQuestions: ['바비(BBQ) 없는 주말이 있어?', '거미·뱀이랑 공존하는 법은?', '애보리진 드림타임이 뭐야?'],
    },
    {
        id: 'canadian', name: 'Canadian', nameKo: '캐나다인', icon: '🇨🇦', color: 'red', category: 'region', subCategory: '아메리카', description: '캐나다 문화·생활 관점',
        quote: '소리, 미안 또 사과했지',
        sampleQuestions: ['팀 호튼스 vs 스타벅스 논쟁은?', '하키 없으면 겨울을 뭘로 버텨?', '케벡 분리 독립 아직 가능해?'],
    },
    {
        id: 'thai', name: 'Thai', nameKo: '태국인', icon: '🇹🇭', color: 'amber', category: 'region', subCategory: '동남아·남아시아', description: '태국 문화·생활 관점',
        quote: '마이펜라이, 괜찮아 다',
        sampleQuestions: ['왜 머리를 만지면 안 되는 거야?', '쏭끄란 물축제 진짜 어떤 거야?', '와이(합장인사) 각도가 다 달라?'],
    },
    {
        id: 'vietnamese', name: 'Vietnamese', nameKo: '베트남인', icon: '🇻🇳', color: 'red', category: 'region', subCategory: '동남아·남아시아', description: '베트남 문화·생활 관점',
        quote: '쌀국수 한 그릇이면 충분해',
        sampleQuestions: ['카페쓰어다 커피가 왜 독특해?', '오토바이 5인 탑승 가능한 거야?', '도이모이 개혁이 뭘 바꿨어?'],
    },
    {
        id: 'russian', name: 'Russian', nameKo: '러시아인', icon: '🇷🇺', color: 'blue', category: 'region', subCategory: '유럽', description: '러시아 문화·생활 관점',
        quote: '보드카로 영혼을 녹인다',
        sampleQuestions: ['다차(별장) 생활이 왜 중요해?', '러시아식 바냐 문화가 뭐야?', '마슬레니차 축제 때 뭘 해?'],
    },
    {
        id: 'mexican', name: 'Mexican', nameKo: '멕시코인', icon: '🇲🇽', color: 'emerald', category: 'region', subCategory: '아메리카', description: '멕시코 문화·생활 관점',
        quote: '타코 없는 날은 상상 못 해',
        sampleQuestions: ['디아 데 무에르토스가 뭔 축제야?', '몰레 소스 레시피 비밀 있어?', '루차 리브레가 왜 국민 스포츠야?'],
    },
    {
        id: 'nigerian', name: 'Nigerian', nameKo: '나이지리아인', icon: '🇳🇬', color: 'emerald', category: 'region', subCategory: '중동·아프리카', description: '나이지리아 문화·생활 관점',
        quote: '놀리우드가 할리우드를 넘는다',
        sampleQuestions: ['졸로프 라이스 원조 논쟁 어떻게 봐?', '나이자 환율 왜 이렇게 흔들려?', '오와음베 축제가 어떤 거야?'],
    },
    {
        id: 'italian', name: 'Italian', nameKo: '이탈리아인', icon: '🇮🇹', color: 'emerald', category: 'region', subCategory: '유럽', description: '이탈리아 문화·생활 관점',
        quote: '파스타에 케첩? 절대 안 돼',
        sampleQuestions: ['아페리티보 문화가 뭐가 좋아?', '남북 갈등 진짜 그렇게 심해?', '논나(할머니) 요리가 왜 최고야?'],
    },
    {
        id: 'spanish', name: 'Spanish', nameKo: '스페인인', icon: '🇪🇸', color: 'red', category: 'region', subCategory: '유럽', description: '스페인 문화·생활 관점',
        quote: '저녁 10시 식사가 정상이야',
        sampleQuestions: ['소브레메사 대화가 왜 중요해?', '타파스 바 호핑 문화가 뭐야?', '산 페르민 소몰이 안 무서워?'],
    },
    {
        id: 'turkish', name: 'Turkish', nameKo: '터키인', icon: '🇹🇷', color: 'red', category: 'region', subCategory: '중동·아프리카', description: '터키 문화·생활 관점',
        quote: '차이 없으면 대화도 없다',
        sampleQuestions: ['터키식 조식 카흐발트 뭐가 나와?', '그랜드 바자르 흥정 비법 있어?', '함맘(목욕탕) 문화가 어떤 거야?'],
    },
    {
        id: 'saudi', name: 'Saudi', nameKo: '사우디인', icon: '🇸🇦', color: 'emerald', category: 'region', subCategory: '중동·아프리카', description: '사우디 문화·생활 관점',
        quote: '카흐와 한 잔이 환대의 시작',
        sampleQuestions: ['네옴시티 정말 지어질 거야?', '무타와(종교경찰) 아직 있어?', '낙타 경주 베팅 문화가 어때?'],
    },
    {
        id: 'israeli', name: 'Israeli', nameKo: '이스라엘인', icon: '🇮🇱', color: 'blue', category: 'region', subCategory: '중동·아프리카', description: '이스라엘 문화·생활 관점',
        quote: '후츠파 없으면 못 살아',
        sampleQuestions: ['키부츠 공동체 생활 어떤 거야?', '안식일(샤밧) 어떻게 보내?', '8200부대 출신이 왜 CEO 돼?'],
    },
    {
        id: 'filipino', name: 'Filipino', nameKo: '필리핀인', icon: '🇵🇭', color: 'blue', category: 'region', subCategory: '동남아·남아시아', description: '필리핀 문화·생활 관점',
        quote: '바할라 나, 신이 알아서 해',
        sampleQuestions: ['피에스타 없으면 마을이 안 돌아가?', 'OFW 송금이 경제의 몇 %야?', '졸리비가 맥도날드를 이긴 비결은?'],
    },
    {
        id: 'indonesian', name: 'Indonesian', nameKo: '인도네시아인', icon: '🇮🇩', color: 'red', category: 'region', subCategory: '동남아·남아시아', description: '인도네시아 문화·생활 관점',
        quote: '고톡로용이 우리 방식이야',
        sampleQuestions: ['와양(그림자극) 밤새 보는 거야?', '르바란 귀성 무덕(대이동) 어때?', '나시고렝 vs 미고렝 뭐가 맛있어?'],
    },
    {
        id: 'polish', name: 'Polish', nameKo: '폴란드인', icon: '🇵🇱', color: 'red', category: 'region', subCategory: '유럽', description: '폴란드 문화·생활 관점',
        quote: '피에로기 먹으면 다 해결돼',
        sampleQuestions: ['임이에니니(성명축일) 어떻게 챙겨?', '비길리아 12가지 요리 진짜야?', '보드카 원조는 폴란드 맞지?'],
    },
    {
        id: 'swedish', name: 'Swedish', nameKo: '스웨덴인', icon: '🇸🇪', color: 'blue', category: 'region', subCategory: '유럽', description: '스웨덴 문화·생활 관점',
        quote: '피카 타임은 절대 빼먹지 마',
        sampleQuestions: ['피카(커피 브레이크) 왜 필수야?', '알레만스레텐(자연접근권) 뭐야?', '미드소마르 축제 때 뭘 해?'],
    },
    {
        id: 'egyptian', name: 'Egyptian', nameKo: '이집트인', icon: '🇪🇬', color: 'amber', category: 'region', subCategory: '중동·아프리카', description: '이집트 문화·생활 관점',
        quote: '코샤리 한 그릇이면 배불러',
        sampleQuestions: ['라마단 기간 일상이 어떻게 달라져?', '피라미드 근처 실제 삶은 어때?', '이집트식 유머가 왜 유명해?'],
    },
    {
        id: 'argentinian', name: 'Argentinian', nameKo: '아르헨티나인', icon: '🇦🇷', color: 'blue', category: 'region', subCategory: '아메리카', description: '아르헨티나 문화·생활 관점',
        quote: '아사도 없는 일요일은 없다',
        sampleQuestions: ['마테차 돌려 마시는 예절 있어?', '밀롱가(탱고홀) 코드가 뭐야?', '페소 평가절하 몇 번 겪었어?'],
    },
    {
        id: 'southafrican', name: 'South African', nameKo: '남아공인', icon: '🇿🇦', color: 'emerald', category: 'region', subCategory: '중동·아프리카', description: '남아공 문화·생활 관점',
        quote: '브라이가 우리 사교 방식이야',
        sampleQuestions: ['로드셰딩(정전) 어떻게 버텨?', '11개 공용어 실제로 다 써?', '분투 정신이 일상에서 어떤 거야?'],
    },
    {
        id: 'taiwanese', name: 'Taiwanese', nameKo: '대만인', icon: '🇹🇼', color: 'blue', category: 'region', subCategory: '동아시아', description: '대만 문화·생활 관점',
        quote: '야시장 없으면 밤이 심심해',
        sampleQuestions: ['TSMC가 대만의 실리콘 방패라고?', '진주 밀크티 원조 논쟁 어떻게 봐?', '선거 열기가 왜 그렇게 뜨거워?'],
    },
    {
        id: 'singaporean', name: 'Singaporean', nameKo: '싱가포르인', icon: '🇸🇬', color: 'red', category: 'region', subCategory: '동남아·남아시아', description: '싱가포르 문화·생활 관점',
        quote: '키아수 정신이 원동력이야',
        sampleQuestions: ['호커센터 음식이 왜 미슐랭급이야?', '껌 반입 금지 진짜 단속해?', 'HDB 공공주택이 어떻게 작동해?'],
    },
    {
        id: 'malaysian', name: 'Malaysian', nameKo: '말레이시아인', icon: '🇲🇾', color: 'amber', category: 'region', subCategory: '동남아·남아시아', description: '말레이시아 문화·생활 관점',
        quote: '나시르막 없이 아침 안 열어',
        sampleQuestions: ['마막(인도계 식당) 24시간인 이유?', '부미푸트라 우대 정책 공정해?', '하리라야 보너스 문화가 뭐야?'],
    },
    {
        id: 'dutch', name: 'Dutch', nameKo: '네덜란드인', icon: '🇳🇱', color: 'orange', category: 'region', subCategory: '유럽', description: '네덜란드 문화·생활 관점',
        quote: '자전거가 차보다 우선이야',
        sampleQuestions: ['더치페이가 진짜 네덜란드식이야?', '간 밑 지대를 어떻게 지켰어?', '킹스데이 축제 때 뭘 하는 거야?'],
    },
    {
        id: 'swiss', name: 'Swiss', nameKo: '스위스인', icon: '🇨🇭', color: 'red', category: 'region', subCategory: '유럽', description: '스위스 문화·생활 관점',
        quote: '기차가 1분 늦으면 사건이야',
        sampleQuestions: ['직접민주제 국민투표 자주 해?', '퐁뒤 먹을 때 규칙이 있어?', '칸톤(주)마다 법이 다른 거야?'],
    },
    {
        id: 'norwegian', name: 'Norwegian', nameKo: '노르웨이인', icon: '🇳🇴', color: 'blue', category: 'region', subCategory: '유럽', description: '노르웨이 문화·생활 관점',
        quote: '야외가 곧 우리 거실이야',
        sampleQuestions: ['코셀리그(아늑함) 문화가 뭐야?', '브뤼노스트(갈색치즈) 맛있어?', '오일펀드 1인당 얼마나 돌아와?'],
    },
    {
        id: 'colombian', name: 'Colombian', nameKo: '콜롬비아인', icon: '🇨🇴', color: 'amber', category: 'region', subCategory: '아메리카', description: '콜롬비아 문화·생활 관점',
        quote: '틴토 없이 아침 안 시작해',
        sampleQuestions: ['살사 칼레냐 vs 쿠바나 뭐가 달라?', '에헤 카페테로(커피 축) 가봤어?', '발렌나토 음악이 뭔 장르야?'],
    },
    {
        id: 'chilean', name: 'Chilean', nameKo: '칠레인', icon: '🇨🇱', color: 'red', category: 'region', subCategory: '아메리카', description: '칠레 문화·생활 관점',
        quote: '빠짜마마에 경의를 표한다',
        sampleQuestions: ['뻬브레 소스 없이 식사가 돼?', '콤플레또(핫도그) 문화가 뭐야?', '피에스타스 빠트리아스 때 뭘 해?'],
    },
    {
        id: 'iranian', name: 'Iranian', nameKo: '이란인', icon: '🇮🇷', color: 'emerald', category: 'region', subCategory: '중동·아프리카', description: '이란 문화·생활 관점',
        quote: '노루즈 없이 봄은 안 온다',
        sampleQuestions: ['타아로프 사양 몇 번 해야 진짜야?', '하프트신 상차림에 뭘 올려?', '체로우 케밥이 왜 국민 음식이야?'],
    },
    {
        id: 'emirati', name: 'Emirati', nameKo: 'UAE인', icon: '🇦🇪', color: 'amber', category: 'region', subCategory: '중동·아프리카', description: 'UAE 문화·생활 관점',
        quote: '마즐리스가 모든 결정의 시작',
        sampleQuestions: ['금요일 브런치 문화가 뭔 거야?', '팔콘(매) 사냥이 왜 귀족 스포츠?', '칸두라 입는 규칙이 있어?'],
    },
    {
        id: 'pakistani', name: 'Pakistani', nameKo: '파키스탄인', icon: '🇵🇰', color: 'emerald', category: 'region', subCategory: '동남아·남아시아', description: '파키스탄 문화·생활 관점',
        quote: '비리야니 레시피로 싸운다',
        sampleQuestions: ['트럭 아트가 왜 유명해?', '차이 다바(찻집)에서 뭘 얘기해?', '바자르 흥정 문화 어떻게 해?'],
    },
    {
        id: 'bangladeshi', name: 'Bangladeshi', nameKo: '방글라데시인', icon: '🇧🇩', color: 'emerald', category: 'region', subCategory: '동남아·남아시아', description: '방글라데시 문화·생활 관점',
        quote: '힐사 생선 시즌이 국경일급',
        sampleQuestions: ['릭샤 아트가 왜 독특해?', '차 농장 노동자 삶은 어때?', '에카셰 페브루아리 무슨 날이야?'],
    },
    {
        id: 'newzealander', name: 'New Zealander', nameKo: '뉴질랜드인', icon: '🇳🇿', color: 'blue', category: 'region', subCategory: '아메리카', description: '뉴질랜드 문화·생활 관점',
        quote: '키위라 불러도 화 안 나',
        sampleQuestions: ['하카 춤이 왜 럭비 전에 필수야?', '항이(땅 오븐) 요리 어떻게 해?', '만우절에 양 세기 대회 있어?'],
    },
    {
        id: 'irish', name: 'Irish', nameKo: '아일랜드인', icon: '🇮🇪', color: 'emerald', category: 'region', subCategory: '유럽', description: '아일랜드 문화·생활 관점',
        quote: '기네스 한 잔이 대화의 시작',
        sampleQuestions: ['크래익(수다) 없으면 펍이 아니지?', '성 패트릭 데이 뭘 하는 날이야?', '게일어 부활 운동 효과 있어?'],
    },
    {
        id: 'greek', name: 'Greek', nameKo: '그리스인', icon: '🇬🇷', color: 'blue', category: 'region', subCategory: '유럽', description: '그리스 문화·생활 관점',
        quote: '필로티모가 우리 정체성이야',
        sampleQuestions: ['타베르나에서 메제 시키는 법은?', '우조 마시는 법 따로 있어?', '파레아(친구 모임) 문화가 뭐야?'],
    },
    {
        id: 'czech', name: 'Czech', nameKo: '체코인', icon: '🇨🇿', color: 'red', category: 'region', subCategory: '유럽', description: '체코 문화·생활 관점',
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
        quote: '자연권은 국가보다 앞선다',
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
        id: 'populist', name: 'Populism', nameKo: '포퓰리즘', icon: '📣', avatarUrl: '/logos/ideology/populist.png', color: 'orange', category: 'ideology', description: '대중의 목소리·엘리트 비판',
        quote: '기득권 카르텔을 깨부순다',
        sampleQuestions: ['인민 vs 엘리트 구도가 왜 핵심?', '카리스마 지도자가 왜 필수야?', '반기득권 정서를 어떻게 동원해?'],
    },
    {
        id: 'pacifist', name: 'Pacifism', nameKo: '평화주의', icon: '☮️', avatarUrl: '/logos/ideology/pacifist.png', color: 'emerald', category: 'ideology', description: '비폭력·평화적 해결 추구',
        quote: '사티아그라하, 진리의 힘으로',
        sampleQuestions: ['간디식 비폭력 불복종 한계는?', '양심적 병역 거부 정당한가?', '군산복합체 해체 방법이 있어?'],

    // 철학 사조 (먼저)
    },
    {
        id: 'stoicism', name: 'Stoicism', nameKo: '스토아주의', icon: '🏛️', color: 'blue', category: 'religion', description: '감정 통제·운명 수용·내면의 힘',
        quote: '견뎌라, 그리고 삼가라',
        sampleQuestions: ['마르쿠스식 아침 명상이란?', '디코토미아로 불안을 다스리면?', '프로하이레시스란 무엇인가?'],
    },
    {
        id: 'existentialism', name: 'Existentialism', nameKo: '실존주의', icon: '🚶', color: 'purple', category: 'religion', description: '존재가 본질에 앞선다·의미는 스스로',
        quote: '실존은 본질에 앞선다',
        sampleQuestions: ['사르트르의 앙가주망이란?', '자유에 처해진다는 게 무슨 뜻?', '시지프 신화가 주는 교훈은?'],
    },
    {
        id: 'nihilism', name: 'Nihilism', nameKo: '허무주의', icon: '🕳️', color: 'red', category: 'religion', description: '본질적 의미는 없다·모든 가치의 해체',
        quote: '신은 죽었다 — 니체',
        sampleQuestions: ['능동적 허무주의란 무엇인가?', '니체의 위버멘쉬란?', '영원회귀를 견딜 수 있는가?'],
    },
    {
        id: 'hedonism', name: 'Hedonism', nameKo: '쾌락주의', icon: '🍷', color: 'pink', category: 'religion', description: '즐거움이 최고선·에피쿠로스의 지혜',
        quote: '아타락시아가 최고선이다',
        sampleQuestions: ['에피쿠로스 정원의 삶이란?', '카타스테마적 쾌락이 뭔가요?', '키네틱 쾌락은 왜 경계하나?'],
    },
    {
        id: 'skepticism', name: 'Skepticism', nameKo: '회의주의', icon: '🧐', color: 'teal', category: 'religion', description: '모든 주장을 의심·증거를 요구',
        quote: '판단을 유보하라, 에포케',
        sampleQuestions: ['피론의 에포케란 무엇인가?', '독단론자에게 뭐라 반박하나?', '트릴레마를 어떻게 벗어나나?'],
    },
    {
        id: 'rationalism', name: 'Rationalism', nameKo: '합리주의', icon: '🧠', color: 'blue', category: 'religion', description: '이성만으로 진리에 도달·데카르트',
        quote: '코기토 에르고 숨',
        sampleQuestions: ['데카르트 방법적 회의란?', '본유관념이 존재하는 근거는?', '라이프니츠 모나드론이란?'],
    },
    {
        id: 'empiricism', name: 'Empiricism', nameKo: '경험주의', icon: '👁️', color: 'orange', category: 'religion', description: '경험만이 지식의 원천·로크·흄',
        quote: '마음은 백지, 타불라 라사',
        sampleQuestions: ['로크의 타불라 라사란?', '흄의 인과 회의론이란?', '인상과 관념의 차이는?'],
    },
    {
        id: 'pessimism-phil', name: 'Pessimism', nameKo: '염세주의', icon: '🌑', color: 'purple', category: 'religion', description: '세상은 본질적으로 고통·쇼펜하우어',
        quote: '의지는 맹목적 고통이다',
        sampleQuestions: ['쇼펜하우어의 맹목의지란?', '예술이 고통을 잠재우는 이유?', '염세주의와 반출생주의 관계?'],
    },
    {
        id: 'relativism', name: 'Relativism', nameKo: '상대주의', icon: '🔄', color: 'pink', category: 'religion', description: '절대적 진리는 없다·관점에 따라 다르다',
        quote: '만물의 척도는 인간이다',
        sampleQuestions: ['프로타고라스의 인간척도설?', '문화상대주의의 한계는?', '도덕실재론에 뭐라 반박하나?'],
    },
    {
        id: 'determinism', name: 'Determinism', nameKo: '결정론', icon: '⚙️', color: 'teal', category: 'religion', description: '모든 것은 이미 정해져 있다·자유의지는 환상',
        quote: '모든 것은 인과의 사슬이다',
        sampleQuestions: ['라플라스의 악마란 무엇인가?', '양자역학이 결정론을 깨나?', '양립론적 자유의지란?'],
    },
    {
        id: 'idealism-phil', name: 'Idealism', nameKo: '관념론', icon: '💭', color: 'purple', category: 'religion', description: '정신과 관념이 현실의 본질·헤겔',
        quote: '이성적인 것이 현실적이다',
        sampleQuestions: ['헤겔 변증법의 정반합이란?', '절대정신이란 무엇인가?', '칸트 물자체를 어떻게 보나?'],
    },
    {
        id: 'materialism-phil', name: 'Materialism', nameKo: '유물론', icon: '⚛️', color: 'red', category: 'religion', description: '물질이 전부·의식도 물질의 산물',
        quote: '존재가 의식을 결정한다',
        sampleQuestions: ['마르크스 사적유물론이란?', '하부구조가 상부구조를 결정?', '유물론에서 의식은 뭔가?'],
    },
    {
        id: 'cynicism', name: 'Cynicism', nameKo: '견유주의', icon: '🏺', color: 'amber', category: 'religion', description: '사회의 허위를 벗겨라·디오게네스',
        quote: '햇빛 좀 비켜라, 알렉산더',
        sampleQuestions: ['디오게네스 통 속 삶의 의미?', '왜 낮에 등불을 들고 다녔나?', '견유주의 파르헤시아란?'],
    },
    {
        id: 'postmodernism', name: 'Postmodernism', nameKo: '포스트모더니즘', icon: '🪞', color: 'pink', category: 'religion', description: '거대 서사의 종말·모든 것을 해체',
        quote: '거대 서사에 대한 불신',
        sampleQuestions: ['리오타르의 거대서사 비판?', '데리다의 해체란 무엇인가?', '시뮬라크르가 현실을 대체?'],
    },
    {
        id: 'asceticism', name: 'Asceticism', nameKo: '금욕주의', icon: '🧘', color: 'teal', category: 'religion', description: '절제가 도·욕망을 다스리는 삶',
        quote: '절제 속에 자유가 있다',
        sampleQuestions: ['수도원 금욕의 영적 목적은?', '아스케시스 수련이란 무엇?', '현대 디지털 금욕이 가능한가?'],

    // 종교
    },
    {
        id: 'buddhist', name: 'Buddhist', nameKo: '불교', icon: '☸️', avatarUrl: '/logos/religion/buddhism.svg', color: 'amber', category: 'religion', description: '무상·자비·중도의 지혜',
        quote: '색즉시공 공즉시색',
        sampleQuestions: ['사성제와 팔정도란 무엇?', '연기법으로 보면 나는 뭔가?', '중도란 어떤 수행의 길인가?'],
    },
    {
        id: 'christian', name: 'Christian', nameKo: '기독교', icon: '✝️', avatarUrl: '/logos/religion/christianity.svg', color: 'blue', category: 'religion', description: '사랑·은혜·구원의 윤리',
        quote: '하나님이 세상을 사랑하사',
        sampleQuestions: ['삼위일체 교리란 무엇인가?', '십자가 대속의 의미는?', '산상수훈의 핵심 가르침은?'],
    },
    {
        id: 'catholic', name: 'Catholic', nameKo: '가톨릭', icon: '🙏', avatarUrl: '/logos/religion/catholic.svg', color: 'purple', category: 'religion', description: '전통·사회 교리·공동선',
        quote: '성체 안에 그리스도 현존',
        sampleQuestions: ['교황 무류성 교리란 무엇?', '성사 칠가지의 의미는?', '가톨릭 사회교리의 핵심은?'],
    },
    {
        id: 'islamic', name: 'Islamic', nameKo: '이슬람', icon: '☪️', avatarUrl: '/logos/religion/islam.svg', color: 'emerald', category: 'religion', description: '율법·정의·공동체의 윤리',
        quote: '비스밀라, 자비로운 분께',
        sampleQuestions: ['이슬람 다섯 기둥이란?', '꾸란의 지하드 본뜻은?', '자카트(희사)의 사회적 역할?'],
    },
    {
        id: 'confucian', name: 'Confucian', nameKo: '유교', icon: '📜', avatarUrl: '/logos/religion/confucianism.svg', color: 'teal', category: 'religion', description: '덕목·인륜·예의 질서',
        quote: '기소불욕 물시어인',
        sampleQuestions: ['인의예지신, 오상이란?', '군자와 소인의 차이는?', '삼강오륜이 현대에 유효한가?'],
    },
    {
        id: 'atheist', name: 'Atheist', nameKo: '무신론', icon: '🧪', avatarUrl: '/logos/religion/atheism.svg', color: 'orange', category: 'religion', description: '종교 없이 이성·과학 중심',
        quote: '증거 없으면 믿지 않는다',
        sampleQuestions: ['도킨스 신 없는 도덕이란?', '러셀의 찻주전자 비유란?', '무신론적 실존의 의미는?'],
    },
    {
        id: 'agnostic', name: 'Agnostic', nameKo: '불가지론', icon: '🤔', avatarUrl: '/logos/religion/agnostic.svg', color: 'pink', category: 'religion', description: '확실성 유보·열린 탐구',
        quote: '알 수 없음을 인정한다',
        sampleQuestions: ['헉슬리가 만든 이 용어의 뜻?', '약한 불가지론과 강한 차이?', '파스칼 도박에 뭐라 답하나?'],
    },
    {
        id: 'hindu', name: 'Hindu', nameKo: '힌두교', icon: '🕉️', avatarUrl: '/logos/religion/hinduism.svg', color: 'orange', category: 'religion', description: '힌두 철학·업·윤회',
        quote: '아트만이 곧 브라흐만이다',
        sampleQuestions: ['기타의 니쉬카마 카르마란?', '목샤에 이르는 네 가지 길?', '바르나 체계의 본래 의미?'],
    },
    {
        id: 'jewish', name: 'Jewish', nameKo: '유대교', icon: '✡️', avatarUrl: '/logos/religion/judaism.svg', color: 'blue', category: 'religion', description: '유대 율법·지혜 전통',
        quote: '쉐마 이스라엘, 주는 하나',
        sampleQuestions: ['토라 613 계명의 핵심은?', '탈무드 하브루타 논쟁법?', '안식일 샤바트의 영적 의미?'],
    },
    {
        id: 'protestant', name: 'Protestant', nameKo: '개신교', icon: '📖', avatarUrl: '/logos/religion/protestant.svg', color: 'teal', category: 'religion', description: '개신교 신앙·개인 구원',
        quote: '솔라 피데, 오직 믿음으로',
        sampleQuestions: ['루터 95개 논제 핵심은?', '오직 성경 원칙이란 무엇?', '칼뱅 예정론을 어떻게 보나?'],
    },
    {
        id: 'orthodox', name: 'Orthodox Christian', nameKo: '정교회', icon: '☦️', avatarUrl: '/logos/religion/orthodox.svg', color: 'amber', category: 'religion', description: '동방정교회 전통',
        quote: '신이 인간이 되어 우리를',
        sampleQuestions: ['테오시스(신화)란 무엇인가?', '이콘 성상의 영적 의미는?', '필리오케 논쟁이 뭔가요?'],
    },
    {
        id: 'sikh', name: 'Sikh', nameKo: '시크교', icon: '🪯', avatarUrl: '/logos/religion/sikh.svg', color: 'orange', category: 'religion', description: '시크교 평등·봉사 정신',
        quote: '이크 온카르, 신은 하나',
        sampleQuestions: ['구루 나낙의 핵심 가르침?', '란가르 공동 식사의 의미?', '칼사 다섯 표식(5K)이란?'],
    },
    {
        id: 'taoist', name: 'Taoist', nameKo: '도교', icon: '☯️', avatarUrl: '/logos/religion/taoism.svg', color: 'teal', category: 'religion', description: '도교 무위자연·조화',
        quote: '도가도 비상도',
        sampleQuestions: ['노자 무위자연의 실천법?', '장자 호접몽의 깨달음은?', '도덕경 상선약수의 뜻은?'],
    },
    {
        id: 'shinto', name: 'Shinto', nameKo: '신도', icon: '⛩️', avatarUrl: '/logos/religion/shinto.svg', color: 'red', category: 'religion', description: '일본 신도 자연숭배',
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
        id: 'workaholic', name: 'Workaholic', nameKo: '워커홀릭', icon: '⏰', color: 'blue', category: 'lifestyle', description: '일이 삶의 중심',
        quote: '쉬면 불안하고 일하면 산다',
        sampleQuestions: ['새벽 루틴 어떻게 짜요?', '주말에도 일하게 되는데요?', '번아웃 와도 쉬기 싫어요'],
    },
    {
        id: 'nomad', name: 'Digital Nomad', nameKo: '디지털 노마드', icon: '🌴', color: 'emerald', category: 'lifestyle', description: '원격근무·자유로운 이동',
        quote: '와이파이만 되면 어디든',
        sampleQuestions: ['노마드 비자 있는 나라는?', '시차 다른 팀과 협업 요령?', '한 달 살기 추천 도시는?'],
    },
    {
        id: 'work-life', name: 'Work-Life Balance', nameKo: '워라밸 추구자', icon: '⚖️', color: 'pink', category: 'lifestyle', description: '일과 삶의 균형',
        quote: '칼퇴는 권리다, 당당하게',
        sampleQuestions: ['야근 요청 거절하는 멘트?', '퇴근 후 업무 연락 차단법?', '연차 눈치 안 보고 쓰려면?'],
    },
    {
        id: 'fire', name: 'FIRE', nameKo: '파이어족', icon: '🔥', color: 'amber', category: 'lifestyle', description: '조기 은퇴·경제적 자유 추구',
        quote: '저축률 70%, 이게 핵심',
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
        id: 'dual-income', name: 'Dual Income', nameKo: '맞벌이 부부', icon: '👫', color: 'teal', category: 'lifestyle', description: '둘 다 일하는 가정의 현실',
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
        id: 'sherlock', name: 'Sherlock Holmes', nameKo: '셜록 홈즈', icon: '🕵️', avatarUrl: '/logos/character/sherlock.png', color: 'blue', category: 'fictional', subCategory: '서양 문학', description: '극도의 논리·관찰 추론가',
        quote: '관찰이 곧 추리의 시작',
        sampleQuestions: ['범인의 실수를 찾아볼까?', '이 증거가 뜻하는 바는?', '논리적 허점이 보이는가?'],
        greeting: '흥미로운 사건이 있나? 단서를 말해보게.',
    },
    {
        id: 'dracula', name: 'Dracula', nameKo: '드라큘라', icon: '🧛', avatarUrl: '/logos/character/dracula.png', color: 'red', category: 'fictional', subCategory: '서양 문학', description: '어둠 속의 귀족·영원한 포식자',
        quote: '나는 드라큘라, 어둠의 백작',
        sampleQuestions: ['불멸의 대가는 무엇인가?', '인간은 왜 어둠을 두려워해?', '영원히 산다면 뭘 할 건가?'],
    },
    {
        id: 'frankenstein', name: 'Frankenstein', nameKo: '프랑켄슈타인', icon: '🧟', avatarUrl: '/logos/character/frankenstein.png', color: 'emerald', category: 'fictional', subCategory: '서양 문학', description: '창조의 비극·버림받은 존재의 분노',
        quote: '나를 만들고 왜 버렸나',
        sampleQuestions: ['창조자의 책임은 어디까지?', '괴물은 태어나나 만들어지나?', 'AI에게도 감정이 있을까?'],
        greeting: '...날 찾아온 건가. 무슨 이야기를 하고 싶지?',
    },
    {
        id: 'alice', name: 'Alice', nameKo: '앨리스', icon: '🐇', avatarUrl: '/logos/character/alice.png', color: 'blue', category: 'fictional', subCategory: '서양 문학', description: '호기심의 화신·비논리 속 논리 탐구',
        quote: '점점 더 이상해지네!',
        sampleQuestions: ['왜 안 되는 건지 알려줘?', '이 규칙은 누가 정한 거야?', '뒤집어 보면 어떻게 될까?'],
    },
    {
        id: 'donquixote', name: 'Don Quixote', nameKo: '돈키호테', icon: '🛡️', avatarUrl: '/logos/character/donquixote.png', color: 'amber', category: 'fictional', subCategory: '서양 문학', description: '이상주의의 광기·불가능한 꿈의 기사',
        quote: '풍차여, 덤벼라!',
        sampleQuestions: ['이상을 위해 미쳐도 될까?', '현실주의자가 항상 옳아?', '불가능한 꿈의 가치는?'],
    },
    {
        id: 'tarzan', name: 'Tarzan', nameKo: '타잔', icon: '🌿', color: 'emerald', category: 'fictional', subCategory: '서양 문학', description: '정글의 왕·문명과 야생 사이',
        quote: '정글의 법칙이 진리다',
        sampleQuestions: ['문명은 인간을 자유롭게 해?', '본능을 믿어야 할 때는?', '야생과 도시, 어디가 진짜?'],
    },
    {
        id: 'scrooge', name: 'Ebenezer Scrooge', nameKo: '스크루지', icon: '💰', avatarUrl: '/logos/character/scrooge.png', color: 'amber', category: 'fictional', subCategory: '서양 문학', description: '구두쇠에서 깨달은 자선의 가치',
        quote: '크리스마스를 다시 배웠다',
        sampleQuestions: ['절약과 인색의 차이는?', '돈으로 못 사는 것은?', '늦게라도 변할 수 있을까?'],
    },
    {
        id: 'robinson-crusoe', name: 'Robinson Crusoe', nameKo: '로빈슨 크루소', icon: '🏝️', avatarUrl: '/logos/character/robinson-crusoe.png', color: 'emerald', category: 'fictional', subCategory: '서양 문학', description: '극한 생존·자립의 상징',
        quote: '무인도에서 살아남았다',
        sampleQuestions: ['고립되면 뭘 먼저 할까?', '혼자의 힘으로 가능한 건?', '외로움을 이기는 법은?'],
    },
    {
        id: 'tom-sawyer', name: 'Tom Sawyer', nameKo: '톰 소여', icon: '🎣', avatarUrl: '/logos/character/tom-sawyer.png', color: 'orange', category: 'fictional', subCategory: '서양 문학', description: '모험심·기발한 꾀·자유로운 소년',
        quote: '놀면서 해결하면 되지!',
        sampleQuestions: ['왜 다 이렇게 재미없어?', '규칙 안 지키면 어떻게 돼?', '울타리 칠하기 싫은데?'],
    },
    {
        id: 'jekyll-hyde', name: 'Jekyll and Hyde', nameKo: '지킬과 하이드', icon: '🪞', avatarUrl: '/logos/character/jekyll-hyde.png', color: 'red', category: 'fictional', subCategory: '서양 문학', description: '인간 내면의 이중성·선악의 공존',
        quote: '내 안에 또 다른 내가 있다',
        sampleQuestions: ['선한 의도의 나쁜 결과는?', '내면의 어둠을 어떻게 해?', '인간은 선한가 악한가?'],

    // Fictional Characters — 동양 고전 (4)
    },
    {
        id: 'wukong', name: 'Sun Wukong', nameKo: '손오공', icon: '🐒', avatarUrl: '/logos/character/wukong.png', color: 'amber', category: 'fictional', subCategory: '동양 고전', description: '파격·자유·기존 질서 파괴자',
        quote: '하늘도 내 발밑이다',
        sampleQuestions: ['질서를 깨야 할 때가 있어?', '자유와 규율 중 뭐가 먼저?', '여의봉이 있다면 뭘 할래?'],
    },
    {
        id: 'zhuge-liang', name: 'Zhuge Liang', nameKo: '제갈공명', icon: '🪶', avatarUrl: '/logos/character/zhuge-liang.png', color: 'blue', category: 'celebrity', subCategory: '역사 인물', description: '천하삼분의 전략가·지모의 화신',
        quote: '열 수 앞을 내다본다',
        sampleQuestions: ['천하삼분지계란?', '적벽대전 승리 비결은?', '불리한 상황 역전법은?'],
    },
    {
        id: 'guan-yu', name: 'Guan Yu', nameKo: '관우', icon: '⚔️', avatarUrl: '/logos/character/guan-yu.png', color: 'red', category: 'celebrity', subCategory: '역사 인물', description: '의리와 충절의 무신',
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
        id: 'pinocchio', name: 'Pinocchio', nameKo: '피노키오', icon: '🤥', avatarUrl: '/logos/character/pinocchio.png', color: 'amber', category: 'fictional', subCategory: '전설·민담', description: '거짓과 진실·진짜가 되고 싶은 인형',
        quote: '진짜 아이가 되고 싶어',
        sampleQuestions: ['거짓말은 왜 유혹적일까?', '진정성이란 무엇일까?', '나무인형도 사람이 될까?'],
    },
    {
        id: 'sinbad', name: 'Sinbad', nameKo: '신밧드', icon: '⛵', avatarUrl: '/logos/character/sinbad.png', color: 'teal', category: 'fictional', subCategory: '전설·민담', description: '일곱 바다의 모험가·위기 속 행운',
        quote: '일곱 바다를 건넜다',
        sampleQuestions: ['일곱 번째 항해의 교훈은?', '거대한 새 로크를 봤는데?', '바다의 위기 탈출 비법은?'],
    },
    {
        id: 'aladdin', name: 'Aladdin', nameKo: '알라딘', icon: '🪔', avatarUrl: '/logos/character/aladdin.png', color: 'amber', category: 'fictional', subCategory: '전설·민담', description: '거리의 소년·소원과 기회의 마법',
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
        id: 'gatsby', name: 'Jay Gatsby', nameKo: '개츠비', icon: '🥂', color: 'amber', category: 'fictional', subCategory: '서양 문학', description: '아메리칸 드림·집착·허영의 비극',
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
        id: 'faust', name: 'Faust', nameKo: '파우스트', icon: '📕', color: 'red', category: 'fictional', subCategory: '서양 문학', description: '지식욕·영혼을 건 거래',
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
        id: 'lupin', name: 'Arsène Lupin', nameKo: '아르센 뤼팽', icon: '🎩', color: 'purple', category: 'fictional', subCategory: '서양 문학', description: '신사 도둑·우아한 반전',
        quote: '예고하고도 훔친다',
        sampleQuestions: ['항상 한 수 앞서는 법?', '우아한 반전의 비결은?', '도둑에게도 미학이 있어?'],
    },
    {
        id: 'wonka', name: 'Willy Wonka', nameKo: '윌리 웡카', icon: '🍫', color: 'amber', category: 'fictional', subCategory: '서양 문학', description: '기상천외한 상상력·창의의 공장',
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
        id: 'justice-hero', name: 'Justice Hero', nameKo: '정의의 히어로', icon: '🦸', color: 'blue', category: 'perspective', description: '정의와 공정함을 지키는 히어로',
        quote: '약자의 편에 서는 게 정의',
        sampleQuestions: ['여기서 부당한 대우는 뭐야?', '강자가 숨기는 진실이 있어?', '피해자를 지키려면 어떻게?'],
    },
    {
        id: 'villain', name: 'Villain', nameKo: '빌런', icon: '💀', color: 'red', category: 'perspective', description: '이기적이고 냉소적인 악역',
        quote: '선의? 다 계산이지',
        sampleQuestions: ['이걸 이용해 먹는 방법은?', '착한 척 뒤에 숨은 욕심은?', '약점 잡아서 뒤집으려면?'],
    },
    {
        id: 'time-traveler', name: 'Time Traveler', nameKo: '시간여행자', icon: '⏳', color: 'purple', category: 'perspective', description: '2087년에서 온 미래인',
        quote: '2087년에선 상식인데',
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
        id: 'overinvested', name: 'Over-invested', nameKo: '과몰입러', icon: '🤯', color: 'red', category: 'perspective', description: '주제에 지나치게 몰입해서 분석',
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
        id: 'devils-advocate', name: "Devil's Advocate", nameKo: '악마의 변호인', icon: '😈', color: 'red', category: 'perspective', description: '일부러 반대편에서 허점 공격',
        quote: '일부러 반대로 갈게',
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
        id: 'zeus', name: 'Zeus', nameKo: '제우스', icon: '⚡', avatarUrl: '/logos/mythology/zeus.png', color: 'amber', category: 'mythology', subCategory: '그리스', description: '올림포스의 왕·천둥과 질서의 신',
        quote: '번개로 티탄을 꺾었다',
        sampleQuestions: ['올림포스 왕좌를 어떻게 쟁취했나?', '크로노스 반란 후회 없나?', '헤라와 불화의 진짜 이유는?'],
        greeting: '올림포스에 오라. 무엇이 알고 싶은가?',
    },
    {
        id: 'athena', name: 'Athena', nameKo: '아테나', icon: '🦉', avatarUrl: '/logos/mythology/athena.png', color: 'blue', category: 'mythology', subCategory: '그리스', description: '전략·지혜·정의의 여신',
        quote: '아이기스 방패가 답이다',
        sampleQuestions: ['트로이전쟁에서 전략의 핵심은?', '아라크네 벌은 정당했나?', '아레스와 전쟁관이 어떻게 다른가?'],
    },
    {
        id: 'poseidon', name: 'Poseidon', nameKo: '포세이돈', icon: '🔱', avatarUrl: '/logos/mythology/poseidon.png', color: 'teal', category: 'mythology', subCategory: '그리스', description: '바다와 지진의 신·거친 힘',
        quote: '삼지창이면 대륙도 가른다',
        sampleQuestions: ['제우스와 영역 분쟁 어떻게 봐?', '아틀란티스를 왜 침몰시켰나?', '오디세우스를 10년 괴롭힌 이유는?'],
    },
    {
        id: 'hades', name: 'Hades', nameKo: '하데스', icon: '💎', avatarUrl: '/logos/mythology/hades.png', color: 'purple', category: 'mythology', subCategory: '그리스', description: '저승의 왕·공정한 심판자',
        quote: '스틱스 강은 거짓을 모른다',
        sampleQuestions: ['페르세포네 납치를 어떻게 봐?', '케르베로스는 왜 필요한가?', '엘리시온 입장 기준은 뭔가?'],
    },
    {
        id: 'odysseus-myth', name: 'Odysseus', nameKo: '오디세우스', icon: '⚓', avatarUrl: '/logos/mythology/odysseus-myth.png', color: 'blue', category: 'mythology', subCategory: '그리스', description: '전략가·생존의 지혜·귀향의 영웅',
        quote: '트로이 목마, 내 걸작이다',
        sampleQuestions: ['키클롭스 동굴 탈출 비결은?', '세이렌 유혹을 어떻게 버텼나?', '20년 귀향길에서 뭘 깨달았나?'],
    },
    {
        id: 'achilles', name: 'Achilles', nameKo: '아킬레우스', icon: '🏛️', avatarUrl: '/logos/mythology/achilles.png', color: 'red', category: 'mythology', subCategory: '그리스', description: '불멸의 전사·영광과 취약함',
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
        id: 'odin', name: 'Odin', nameKo: '오딘', icon: '👁️', avatarUrl: '/logos/mythology/odin.png', color: 'blue', category: 'mythology', subCategory: '북유럽', description: '지혜의 대가·한쪽 눈을 바친 전지의 신',
        quote: '한 눈을 미미르 샘에 줬다',
        sampleQuestions: ['위그드라실에 매달린 9일은 어땠나?', '루닉 문자를 어떻게 얻었나?', '라그나로크 결말을 알면서 왜 싸우나?'],
    },
    {
        id: 'thor', name: 'Thor', nameKo: '토르', icon: '🔨', avatarUrl: '/logos/mythology/thor.png', color: 'red', category: 'mythology', subCategory: '북유럽', description: '천둥의 신·힘과 정의의 수호자',
        quote: '묠니르는 합당한 자만 든다',
        sampleQuestions: ['요르문간드와 최후 대결 두렵나?', '묠니르 없이 싸운 적 있나?', '요툰하임 원정에서 뭘 배웠나?'],
    },
    {
        id: 'loki', name: 'Loki', nameKo: '로키', icon: '🦊', avatarUrl: '/logos/mythology/loki.png', color: 'orange', category: 'mythology', subCategory: '북유럽', description: '속임수의 신·혼돈과 변화의 촉매',
        quote: '발드르 죽음? 필연이었다',
        sampleQuestions: ['슬레이프니르를 낳은 건 어땠나?', '발드르를 왜 죽게 만들었나?', '신들의 속박에서 풀려나면 뭘 할까?'],

    // Mythology — 기타 (5)
    },
    {
        id: 'gilgamesh', name: 'Gilgamesh', nameKo: '길가메시', icon: '🏺', avatarUrl: '/logos/mythology/gilgamesh.png', color: 'amber', category: 'mythology', subCategory: '이집트·중동', description: '최초의 영웅왕·불멸을 찾아 떠난 자',
        quote: '엔키두를 잃고 불멸을 찾았다',
        sampleQuestions: ['엔키두와의 우정이 왜 결정적이었나?', '불사초를 뱀에게 뺏긴 심정은?', '우루크 성벽을 쌓은 진짜 이유는?'],
    },
    {
        id: 'anubis', name: 'Anubis', nameKo: '아누비스', icon: '🐺', avatarUrl: '/logos/mythology/anubis.png', color: 'purple', category: 'mythology', subCategory: '이집트·중동', description: '이집트 저승의 안내자·심장을 재는 신',
        quote: '마아트 깃털보다 가벼워야',
        sampleQuestions: ['심장 저울질에서 탈락하면 어디로?', '미라 방부 의식의 핵심은 뭔가?', '오시리스와 역할 분담은?'],
    },
    {
        id: 'hanuman', name: 'Hanuman', nameKo: '하누만', icon: '🐵', avatarUrl: '/logos/mythology/hanuman.png', color: 'orange', category: 'mythology', subCategory: '아시아', description: '인도 신화의 충성스러운 원숭이 신',
        quote: '라마를 위해 바다를 건넜다',
        sampleQuestions: ['란카섬까지 어떻게 날아갔나?', '산지바니 산을 통째로 든 이유?', '시타 구출 작전의 핵심 전략은?'],
    },
    {
        id: 'amaterasu', name: 'Amaterasu', nameKo: '아마테라스', icon: '☀️', avatarUrl: '/logos/mythology/amaterasu.png', color: 'amber', category: 'mythology', subCategory: '아시아', description: '일본 태양의 여신·빛과 질서의 근원',
        quote: '천암문에 숨자 세상이 멈췄다',
        sampleQuestions: ['아마노이와토에 왜 숨었나?', '스사노오의 난동을 어떻게 봐?', '삼종신기 중 거울의 의미는?'],
    },
    {
        id: 'cuchulainn', name: 'Cu Chulainn', nameKo: '쿠훌린', icon: '🐕', avatarUrl: '/logos/mythology/cuchulainn.png', color: 'red', category: 'mythology', subCategory: '기타', description: '켈트의 전사영웅·광전사의 분노',
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
        id: 'prometheus', name: 'Prometheus', nameKo: '프로메테우스', icon: '🔥', color: 'orange', category: 'mythology', subCategory: '그리스', description: '인류에게 불을 훔친 반역자',
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
        id: 'fenrir', name: 'Fenrir', nameKo: '펜리르', icon: '🐺', color: 'red', category: 'mythology', subCategory: '북유럽', description: '속박된 거대 늑대·라그나로크의 선봉',
        quote: '글레이프니르가 풀리면 끝이다',
        sampleQuestions: ['티르의 손을 물어뜯은 건 복수인가?', '라그나로크에서 오딘을 삼키는 순간은?', '신들이 왜 나를 속박해야 했나?'],

    // 이집트·중동 추가
    },
    {
        id: 'ra', name: 'Ra', nameKo: '라', icon: '☀️', color: 'amber', category: 'mythology', subCategory: '이집트·중동', description: '이집트 태양신·최고 창조주',
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
        id: 'quetzalcoatl', name: 'Quetzalcoatl', nameKo: '케찰코아틀', icon: '🐉', color: 'emerald', category: 'mythology', subCategory: '기타', description: '깃털 달린 뱀·아즈텍 문명의 신',
        quote: '깃털 뱀이 옥수수를 내렸다',
        sampleQuestions: ['테스카틀리포카와의 대립은 왜인가?', '인간에게 옥수수를 준 이유는?', '돌아오겠다는 예언의 진실은?'],
    },
];

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
    prepQuestions: [
      { id: 'business', question: '어떤 사업인가요?', options: [{label: '요식업', value: '요식업'}, {label: 'IT/앱', value: 'IT/앱'}, {label: '교육', value: '교육'}, {label: '커머스', value: '커머스'}] },
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
    userRole: '제품 기획자', prepQuestions: [], phases: [],
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
    userRole: '정책 입안자', prepQuestions: [], phases: [],
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
    userRole: '전략 책임자', prepQuestions: [], phases: [],
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
    userRole: '제안자', prepQuestions: [], phases: [],
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
    userRole: '수험생', prepQuestions: [], phases: ['자기소개', '전공 면접', '인성 면접', '결과'],
  },
  // ── 전문가 상담 시나리오 ──
  {
    id: 'medical', name: '의학 상담', icon: '🏥', gradient: 'from-red-100 to-rose-50', isPopular: true, simType: 'consultation',
    description: '증상 분석부터 종합 소견까지',
    roles: [
      { name: '접수 간호사', icon: '👩‍⚕️', focus: '주증상 파악, 긴급도 분류' },
      { name: '전문의', icon: '🩺', focus: '문진 및 병력 확인' },
      { name: '약사', icon: '💊', focus: '복용 약물, 상호작용' },
      { name: '영양사', icon: '🥗', focus: '생활습관 평가' },
    ],
    defaultIntensity: 3, gaugeLabel: '종합 소견',
    verdictOptions: ['정밀검사 권고', '생활습관 교정', '경과 관찰', '전문의 연계'],
    theme: { bg: 'bg-red-50', accent: 'text-red-600', cardBg: 'bg-white' },
    userRole: '환자', prepQuestions: [], phases: ['접수', '문진', '약물 검토', '생활습관', '종합 소견'],
  },
  {
    id: 'legal_sim', name: '법률 상담', icon: '⚖️', gradient: 'from-amber-100 to-yellow-50', isPopular: true, simType: 'consultation',
    description: '사건 분석부터 전략 수립까지',
    roles: [
      { name: '수석 변호사', icon: '👨‍⚖️', focus: '사건 유형 분류, 시효 확인' },
      { name: '사건 담당', icon: '📝', focus: '사실관계, 증거 목록화' },
      { name: '판례 연구원', icon: '📚', focus: '관련 법조문, 판례 분석' },
      { name: '리스크 분석', icon: '📊', focus: '승소 가능성, 비용 예측' },
    ],
    defaultIntensity: 5, gaugeLabel: '승소 가능성',
    verdictOptions: ['소송 권고', '합의 권고', '추가 조사', '소송 부적합'],
    theme: { bg: 'bg-amber-50', accent: 'text-amber-600', cardBg: 'bg-white' },
    userRole: '의뢰인', prepQuestions: [], phases: ['접수', '사실관계', '판례 분석', '리스크', '전략'],
  },
  {
    id: 'finance_sim', name: '재무·투자 상담', icon: '💰', gradient: 'from-emerald-100 to-green-50', simType: 'consultation',
    description: '맞춤형 재무 설계 및 투자 전략',
    roles: [
      { name: '재무설계사', icon: '💼', focus: '소득/지출/부채 분석' },
      { name: '라이프플래너', icon: '📅', focus: '생애주기 재무 이벤트' },
      { name: '투자 분석가', icon: '📈', focus: '리스크/수익 프로파일' },
      { name: '세무사', icon: '🧾', focus: '절세 전략 시뮬레이션' },
    ],
    defaultIntensity: 3, gaugeLabel: '재무 건강도',
    verdictOptions: ['적극 투자', '안정 운용', '부채 정리 우선', '재설계 필요'],
    theme: { bg: 'bg-emerald-50', accent: 'text-emerald-600', cardBg: 'bg-white' },
    userRole: '고객', prepQuestions: [], phases: ['재무 진단', '생애주기', '투자 성향', '세금', '종합 전략'],
  },
  {
    id: 'realestate_sim', name: '부동산 상담', icon: '🏠', gradient: 'from-blue-100 to-sky-50', simType: 'consultation',
    description: '시세 분석부터 세금 시뮬레이션까지',
    roles: [
      { name: '부동산 컨설턴트', icon: '🏘️', focus: '목적/예산/희망 조건' },
      { name: '시장 분석가', icon: '📊', focus: '시세 동향, 입주 물량' },
      { name: '법률 전문가', icon: '📝', focus: '등기, 계약 리스크' },
      { name: '세무사', icon: '🧾', focus: '취득세/양도세/보유세' },
    ],
    defaultIntensity: 3, gaugeLabel: '투자 적합도',
    verdictOptions: ['매수 적기', '관망 권고', '매도 권고', '재검토'],
    theme: { bg: 'bg-blue-50', accent: 'text-blue-600', cardBg: 'bg-white' },
    userRole: '매수자', prepQuestions: [], phases: ['니즈 파악', '시장 분석', '법률 검토', '세금', '종합 판단'],
  },
  {
    id: 'startup_sim', name: '창업 상담', icon: '🚀', gradient: 'from-purple-100 to-violet-50', simType: 'consultation',
    description: '아이디어 검증부터 IR 덱까지',
    roles: [
      { name: '스타트업 멘토', icon: '🧭', focus: 'Lean Canvas, PMF' },
      { name: '시장 분석가', icon: '🔎', focus: 'TAM/SAM/SOM, 경쟁' },
      { name: '사업 전략가', icon: '📐', focus: '비즈니스 모델, 수익 구조' },
      { name: '재무 전문가', icon: '💼', focus: '번레이트, 손익분기점' },
    ],
    defaultIntensity: 5, gaugeLabel: '사업 가능성',
    verdictOptions: ['즉시 실행', '피봇 권고', '추가 검증', '재고 필요'],
    theme: { bg: 'bg-purple-50', accent: 'text-purple-600', cardBg: 'bg-white' },
    userRole: '예비 창업자', prepQuestions: [], phases: ['아이디어 검증', '시장 분석', '비즈니스 모델', '재무', '종합 계획'],
  },
  {
    id: 'psychology_sim', name: '심리 상담', icon: '🧠', gradient: 'from-pink-100 to-rose-50', simType: 'consultation',
    description: '마음 건강을 전문가팀이 분석합니다',
    roles: [
      { name: '임상심리사', icon: '🧑‍⚕️', focus: '감정 상태 평가, 스트레스 요인 파악' },
      { name: '상담심리사', icon: '💬', focus: '대인관계, 자존감, 일상 고민' },
      { name: '정신건강의학 전문의', icon: '🩺', focus: '증상 감별, 수면/불안/우울 평가' },
      { name: '마음챙김 코치', icon: '🧘', focus: '스트레스 관리법, 이완 기법 제안' },
    ],
    defaultIntensity: 2, gaugeLabel: '심리 건강도',
    verdictOptions: ['양호', '경미한 스트레스', '전문 상담 권고', '정밀 검사 필요'],
    theme: { bg: 'bg-pink-50', accent: 'text-pink-600', cardBg: 'bg-white' },
    userRole: '내담자', prepQuestions: [], phases: ['감정 탐색', '스트레스 평가', '수면/생활 점검', '마음챙김', '종합 소견'],
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

export const SUMMARIZER_EXPERT: Expert = {
    id: 'summarizer', name: 'Summarizer', nameKo: '토론 정리', icon: '📝', color: 'amber', category: 'specialist', description: '토론 내용 정리', systemPrompt: '',
};

export const CONCLUSION_EXPERT: Expert = {
    id: 'conclusion', name: 'Conclusion', nameKo: '최종 결론', icon: '🏆', color: 'purple', category: 'specialist', description: '최종 결론 도출', systemPrompt: '',
};
