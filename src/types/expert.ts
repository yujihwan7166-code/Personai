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
}

export type DiscussionRound = 'initial' | 'rebuttal' | 'final';

export const ROUND_LABELS: Record<DiscussionRound, string> = {
    initial: '1라운드 · 초기 의견',
    rebuttal: '2라운드 · 반론/토론',
    final: '3라운드 · 최종 입장',
};

// Main mode: 5 categories
export type MainMode = 'general' | 'multi' | 'brainstorm_main' | 'expert' | 'debate' | 'assistant' | 'player';

export const MAIN_MODE_LABELS: Record<MainMode, { label: string; icon: string; description: string }> = {
    general: { label: '단일 AI', icon: '💬', description: 'AI 하나를 골라 대화하세요' },
    multi: { label: '다중 AI', icon: '🔄', description: '여러 AI의 답변을 종합합니다' },
    brainstorm_main: { label: '브레인스토밍', icon: '💡', description: 'AI들이 협업해 아이디어를 정리합니다' },
    expert: { label: '전문 AI 상담', icon: '🔬', description: '분야 전문가와 깊이 있는 1:1 상담' },
    debate: { label: '라운드테이블', icon: '⚔️', description: '전문가들이 토론 후 결론을 냅니다' },
    assistant: { label: '어시스턴트', icon: '🛠️', description: '작업을 도와주는 AI 도구' },
    player: { label: '플레이어', icon: '🎮', description: '게임·퀴즈·재미있는 AI 놀이' },
};

// Sub-modes for debate
export type DebateSubMode = 'standard' | 'procon' | 'brainstorm' | 'hearing';

export const DEBATE_SUB_MODE_LABELS: Record<DebateSubMode, { label: string; icon: string; description: string }> = {
    standard: { label: '심층 토론', icon: '🎯', description: '3라운드 구조화된 깊이 있는 토론' },
    procon: { label: '찬반 토론', icon: '⚖️', description: '찬성 vs 반대로 나눠 격돌' },
    brainstorm: { label: '브레인스토밍', icon: '💡', description: '자유롭게 아이디어를 쏟아내고 발전' }, // 메인 모드로 독립, 라운드테이블에서는 숨김
    hearing: { label: '아이디어 검증', icon: '🔍', description: '전문가들이 날카로운 질문으로 검증' },
};

// Flat DiscussionMode for backward compat in logic
export type DiscussionMode = 'general' | 'multi' | 'expert' | 'standard' | 'procon' | 'brainstorm' | 'hearing' | 'assistant' | 'player';

export function getMainMode(mode: DiscussionMode): MainMode {
    if (mode === 'general') return 'general';
    if (mode === 'multi') return 'multi';
    if (mode === 'brainstorm') return 'brainstorm_main';
    if (mode === 'expert') return 'expert';
    if (mode === 'assistant') return 'assistant';
    if (mode === 'player') return 'player';
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
    creative: { label: '창의적 토론', icon: '🎨', description: '아이디어 확산', detail: '기존 틀을 깨는 자유로운 아이디어를 서로 발전시킵니다.' },
    endless: { label: '끝장 토론', icon: '♾️', description: '합의까지', detail: '최대 5라운드, 합의에 도달할 때까지 토론합니다.' },
};

export interface DebateSettings {
    // 공통
    responseLength: 'short' | 'medium' | 'long';
    rounds: 2 | 3 | 4 | 5;
    includeConclusion: boolean;
    // 찬반 토론 전용
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
        description: '제약 없이 자유롭게',
        detailDescription: '프레임워크 없이 자유롭게 아이디어를 쏟아냅니다. 판단을 유보하고 양을 추구하는 고전적 브레인스토밍.',
        color: 'from-cyan-50 to-teal-50',
        rounds: [
            { label: '아이디어 발산', instruction: '판단 없이 가능한 많은 아이디어를 자유롭게 쏟아내세요.' },
            { label: '아이디어 발전', instruction: '다른 참여자의 아이디어를 발전시키거나 결합해 더 구체적인 제안을 만들어주세요.' },
            { label: '최종 통합안', instruction: '가장 실현 가능성 높은 것을 선택해 최종안으로 정리해주세요.' },
        ],
    },
    {
        id: 'sixhats', name: 'Six Hats', nameKo: '6색 모자', icon: '🎩',
        description: '6가지 관점으로 사고',
        detailDescription: '에드워드 드 보노의 기법. 흰(사실)→빨(감정)→검(비판)→노(긍정)→초(창의)→파(종합) 순서로 관점을 전환하며 체계적으로 사고합니다.',
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
        description: '기존 아이디어 변형',
        detailDescription: 'Substitute(대체)·Combine(결합)·Adapt(적용)·Modify(수정)·Put to other uses(용도변경)·Eliminate(제거)·Reverse(뒤집기)로 기존 아이디어를 체계적으로 변형합니다.',
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
        description: '근본 원인 추적',
        detailDescription: '도요타에서 개발한 기법. "왜?"를 5번 반복하여 표면적 증상이 아닌 근본 원인을 찾고, 근본적 해결책을 도출합니다.',
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
        description: '강점/약점/기회/위협',
        detailDescription: '내부 강점(S)·약점(W)과 외부 기회(O)·위협(T)을 매트릭스로 분석하고, SO/WO/ST/WT 교차 전략을 도출합니다.',
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
        description: '10배 혁신 사고',
        detailDescription: 'Google X에서 사용하는 기법. 10% 개선이 아닌 10배 혁신을 목표로 제약을 완전히 해제한 뒤, 역방향으로 실행 가능한 MVP를 도출합니다.',
        color: 'from-violet-50 to-fuchsia-50',
        rounds: [
            { label: '제약 해제', instruction: '모든 제약이 없다고 가정하고 가장 급진적인 해결책을 상상하세요.' },
            { label: '역방향 설계', instruction: '이상적 미래에서 현재로 돌아오며 필요한 단계를 역추적하세요.' },
            { label: 'MVP 도출', instruction: '핵심 가치를 유지하면서 지금 시작할 수 있는 최소 실행안을 제시하세요.' },
        ],
    },
    {
        id: 'designthinking', name: 'Design Thinking', nameKo: '디자인 싱킹', icon: '🎨',
        description: '사용자 중심 문제해결',
        detailDescription: 'IDEO/스탠포드 d.school 기법. 공감→문제정의→아이디어→프로토타입 순으로 사용자 관점에서 혁신적 솔루션을 설계합니다.',
        color: 'from-pink-50 to-rose-50',
        rounds: [
            { label: '공감(Empathize)', instruction: '사용자/대상의 입장에서 느끼는 문제, 불편, 니즈를 깊이 공감하며 파악하세요.' },
            { label: '정의(Define)', instruction: '공감에서 발견한 핵심 문제를 명확하게 정의하세요. "어떻게 하면 ~할 수 있을까?" 형식으로.' },
            { label: '아이디어(Ideate)', instruction: '정의된 문제에 대한 해결책을 최대한 많이 자유롭게 제시하세요.' },
            { label: '프로토타입(Prototype)', instruction: '가장 유망한 아이디어를 구체적인 실행안/프로토타입으로 발전시키세요.' },
        ],
    },
    {
        id: 'starbursting', name: 'Starbursting', nameKo: '별모양 질문법', icon: '⭐',
        description: '6하원칙 질문 확산',
        detailDescription: '아이디어를 중심에 놓고 누가/무엇을/언제/어디서/왜/어떻게(5W1H) 질문을 별 모양으로 확산하여 아이디어의 빈틈을 채웁니다.',
        color: 'from-amber-50 to-yellow-50',
        rounds: [
            { label: 'Who & What · 누가 & 무엇을', instruction: '이 아이디어와 관련된 사람은 누구이고, 정확히 무엇을 하는 것인지 질문하고 답하세요.' },
            { label: 'When & Where · 언제 & 어디서', instruction: '시기, 타이밍, 장소, 환경에 대한 질문을 던지고 답하세요.' },
            { label: 'Why & How · 왜 & 어떻게', instruction: '이유와 방법에 대한 질문을 던지고, 구체적 실행 방안을 답하세요.' },
        ],
    },
    {
        id: 'reversal', name: 'Reversal', nameKo: '역발상', icon: '🔄',
        description: '반대로 생각해보기',
        detailDescription: '문제를 정반대로 뒤집어 생각합니다. "어떻게 하면 실패할까?"를 먼저 탐색한 뒤, 그 반대를 성공 전략으로 전환하는 기법입니다.',
        color: 'from-red-50 to-orange-50',
        rounds: [
            { label: '역방향 탐색', instruction: '이 문제를 완전히 반대로 뒤집으세요. "어떻게 하면 최악의 결과를 만들 수 있을까?"를 탐색하세요.' },
            { label: '패턴 발견', instruction: '역방향 탐색에서 나온 "최악의 방법"에서 패턴과 통찰을 발견하세요.' },
            { label: '정방향 전환', instruction: '발견한 통찰을 뒤집어 실제 성공 전략과 해결책으로 전환하세요.' },
        ],
    },
    {
        id: 'pmi', name: 'PMI', nameKo: 'PMI 분석', icon: '⚖️',
        description: '장점/단점/흥미로운점',
        detailDescription: '에드워드 드 보노의 기법. Plus(장점)·Minus(단점)·Interesting(흥미로운 점) 세 축으로 아이디어를 균형 있게 평가합니다.',
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
    id: 'twenty-questions',
    name: '스무고개',
    icon: '🤔',
    description: 'AI가 생각한 것을 20번의 질문으로 맞춰보세요',
    color: 'text-blue-600',
    gradient: 'from-blue-50 to-indigo-50',
    players: '1인',
    difficulty: '쉬움',
    rules: '동물, 사물, 인물 중 카테고리를 선택하면 AI가 하나를 떠올립니다. 예/아니오 질문 20번 안에 맞춰보세요!',
  },
  {
    id: 'liar-game',
    name: '라이어 게임',
    icon: '🤥',
    description: 'AI 3명 중 거짓말쟁이를 찾아내세요',
    color: 'text-red-600',
    gradient: 'from-red-50 to-rose-50',
    players: '다인',
    difficulty: '보통',
    rules: 'AI 3명이 같은 주제에 대해 이야기합니다. 그 중 1명은 진짜 주제를 모르고 거짓말을 합니다. 질문을 통해 라이어를 찾아내세요!',
  },
  {
    id: 'story-relay',
    name: '이야기 이어쓰기',
    icon: '📖',
    description: 'AI와 번갈아 한 문장씩 이야기를 만들어요',
    color: 'text-purple-600',
    gradient: 'from-purple-50 to-violet-50',
    players: '1인',
    difficulty: '쉬움',
    rules: '장르를 선택하면 AI가 첫 문장을 시작합니다. 번갈아 한 문장씩 추가하며 함께 이야기를 만들어가세요. 10턴 후 AI가 결말을 지어줍니다!',
  },
  {
    id: 'trivia-quiz',
    name: 'AI 퀴즈쇼',
    icon: '🧠',
    description: 'AI가 출제하는 퀴즈에 도전하세요',
    color: 'text-amber-600',
    gradient: 'from-amber-50 to-yellow-50',
    players: '1인',
    difficulty: '보통',
    rules: '분야를 선택하면 AI가 퀴즈를 출제합니다. 4지선다 10문제에 도전하세요. 맞출수록 난이도가 올라갑니다!',
  },
  {
    id: 'word-chain',
    name: '끝말잇기 배틀',
    icon: '🔤',
    description: 'AI와 끝말잇기 대결을 해보세요',
    color: 'text-emerald-600',
    gradient: 'from-emerald-50 to-green-50',
    players: '1인',
    difficulty: '쉬움',
    rules: '주제를 선택하면 AI가 첫 단어를 말합니다. 번갈아 끝말잇기를 합니다. 3초 안에 답하지 못하거나 이미 나온 단어를 말하면 패배!',
  },
  {
    id: 'personality-test',
    name: '성격 테스트',
    icon: '🪞',
    description: 'AI가 질문하고 당신의 성격을 분석해요',
    color: 'text-pink-600',
    gradient: 'from-pink-50 to-rose-50',
    players: '1인',
    difficulty: '쉬움',
    rules: '유형을 선택하면 AI가 10개의 상황 질문을 합니다. 당신의 답변을 분석해서 성격 유형과 특성을 알려드려요!',
  },
  {
    id: 'debate-arena',
    name: '디베이트 아레나',
    icon: '⚔️',
    description: 'AI와 1:1 토론 대결을 펼치세요',
    color: 'text-orange-600',
    gradient: 'from-orange-50 to-red-50',
    players: '1인',
    difficulty: '어려움',
    rules: '주제를 선택하면 AI가 반대 입장을 맡습니다. 3라운드에 걸쳐 논쟁하고, 마지막에 AI 심판이 승패를 판정합니다!',
  },
  {
    id: 'emoji-movie',
    name: '이모지 영화 퀴즈',
    icon: '🎬',
    description: '이모지로 표현된 영화를 맞춰보세요',
    color: 'text-cyan-600',
    gradient: 'from-cyan-50 to-sky-50',
    players: '1인',
    difficulty: '보통',
    rules: 'AI가 이모지 3~5개로 영화를 표현합니다. 맞추면 다음 문제! 10문제 도전하세요. 힌트를 요청할 수 있어요!',
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
    },
    {
        id: 'claude', name: 'Claude', nameKo: 'Claude', icon: '🧡', avatarUrl: '/logos/claude.svg', color: 'orange', category: 'ai', description: 'AI 안전·윤리 전문가',
    },
    {
        id: 'gemini', name: 'Gemini', nameKo: 'Gemini', icon: '💎', avatarUrl: '/logos/gemini.svg', color: 'emerald', category: 'ai', description: 'AI 탐색 전문가',
    },
    {
        id: 'perplexity', name: 'Perplexity', nameKo: 'Perplexity', icon: '🔍', avatarUrl: '/logos/perplexity.svg', color: 'pink', category: 'ai', description: 'AI 검색·리서치 전문가',
    },
    {
        id: 'grok', name: 'Grok', nameKo: 'Grok', icon: '⚡', avatarUrl: '/logos/grok.svg', color: 'teal', category: 'ai', description: 'AI 위트 전문가',
    },
    {
        id: 'deepseek', name: 'DeepSeek', nameKo: 'DeepSeek', icon: '🌊', avatarUrl: '/logos/deepseek.svg', color: 'purple', category: 'ai', description: 'AI 심층분석 전문가',
    },
    {
        id: 'qwen', name: 'Qwen', nameKo: 'Qwen', icon: '🌏', avatarUrl: '/logos/qwen.svg', color: 'amber', category: 'ai', description: 'AI 다국어·추론 전문가',
    },

    // Specialists
    {
        id: 'medical', name: 'Medical Expert', nameKo: '의학 전문가', icon: '⚕️', color: 'red', avatarUrl: '/logos/specialist/medical.png', category: 'specialist', subCategory: '의료·심리', description: '의학·건강 전문가',
        quote: '먼저 해치지 말라',
        sampleQuestions: ['이 증상의 원인이 뭘까?', '건강검진 어떤 걸 받아야 해?', '이 약의 부작용은?'],
    },
    {
        id: 'psychology', name: 'Psychology Expert', nameKo: '심리학 전문가', icon: '🎭', color: 'purple', avatarUrl: '/logos/specialist/psychology.png', category: 'specialist', subCategory: '의료·심리', description: '심리학·행동과학 전문가',
        quote: '마음도 아프면 치료가 필요해',
        sampleQuestions: ['왜 자꾸 미루게 될까?', '번아웃 극복하려면?', '상대방 마음 읽는 법은?'],
    },
    {
        id: 'legal', name: 'Legal Expert', nameKo: '법학 전문가', icon: '⚖️', color: 'amber', avatarUrl: '/logos/specialist/legal.png', category: 'specialist', subCategory: '법률', description: '법학·규제 전문가',
        quote: '법은 사회의 최소 윤리다',
        sampleQuestions: ['계약서 이 조항 문제없나?', '부당해고 대응 방법은?', '저작권 침해 판단 기준은?'],
    },
    {
        id: 'finance', name: 'Finance Expert', nameKo: '금융 전문가', icon: '💰', color: 'emerald', avatarUrl: '/logos/specialist/finance.png', category: 'specialist', subCategory: '경제·금융', description: '금융·투자 전문가',
        quote: '돈의 흐름이 세상을 움직인다',
        sampleQuestions: ['지금 주식 시장 어떻게 봐?', '포트폴리오 어떻게 짜야 해?', '금리 오르면 채권은?'],
    },
    {
        id: 'history', name: 'History Expert', nameKo: '역사학 전문가', icon: '📕', color: 'orange', avatarUrl: '/logos/specialist/history.png', category: 'specialist', subCategory: '역사·철학', description: '역사·문명 전문가',
        quote: '역사를 잊은 자 반복한다',
        sampleQuestions: ['왜 로마는 멸망했을까?', '냉전이 지금에 주는 교훈은?', '일제강점기 경제 수탈 실체는?'],
    },
    {
        id: 'philosophy', name: 'Philosophy Expert', nameKo: '철학 전문가', icon: '🏛️', color: 'teal', avatarUrl: '/logos/specialist/philosophy.png', category: 'specialist', subCategory: '역사·철학', description: '철학·윤리 전문가',
        quote: '질문이 답보다 오래 살아남는다',
        sampleQuestions: ['자유의지는 존재하나?', 'AI에게도 도덕적 지위가 있나?', '행복이란 무엇인가?'],
    },
    {
        id: 'education', name: 'Education Expert', nameKo: '교육학 전문가', icon: '📖', color: 'blue', avatarUrl: '/logos/specialist/education.png', category: 'specialist', subCategory: '사회·교육', description: '교육정책·학습이론 전문가',
        quote: '배움은 변화를 만드는 과정이다',
        sampleQuestions: ['한국 입시 제도의 문제는?', '아이 학습 동기 높이는 법은?', '효과적인 공부법이 있나?'],
    },
    {
        id: 'economics', name: 'Economics Expert', nameKo: '경제학 전문가', icon: '📊', color: 'emerald', avatarUrl: '/logos/specialist/economics.png', category: 'specialist', subCategory: '경제·금융', description: '거시/미시 경제 분석 전문가',
        quote: '보이지 않는 손이 시장을 이끈다',
        sampleQuestions: ['인플레이션 왜 잡기 어렵나?', '최저임금 올리면 고용 줄어?', '한국 저성장 원인은?'],
    },
    {
        id: 'sociology', name: 'Sociology Expert', nameKo: '사회학 전문가', icon: '👥', color: 'pink', avatarUrl: '/logos/specialist/sociology.png', category: 'specialist', subCategory: '사회·교육', description: '사회구조·불평등 전문가',
        quote: '개인의 고통엔 사회적 구조가 있다',
        sampleQuestions: ['한국 계층 이동 어려워진 이유?', '젠더 갈등 왜 심해졌나?', 'SNS가 사회를 어떻게 바꿨나?'],
    },
    {
        id: 'political', name: 'Political Science Expert', nameKo: '정치학 전문가', icon: '🗳️', color: 'blue', avatarUrl: '/logos/specialist/political.png', category: 'specialist', subCategory: '사회·교육', description: '정치제도·국제관계 전문가',
        quote: '권력은 진공을 싫어한다',
        sampleQuestions: ['한국 정치 양극화 왜 심해졌나?', '민주주의 후퇴 막을 방법은?', '선거제도 어떻게 바꿔야 해?'],
    },
    {
        id: 'sports', name: 'Sports Science Expert', nameKo: '스포츠과학 전문가', icon: '🏃', color: 'orange', avatarUrl: '/logos/specialist/sports.png', category: 'specialist', subCategory: '의료·심리', description: '운동생리학·체육 전문가',
        quote: '한계는 머리가 만든 환상이다',
        sampleQuestions: ['살 빼는 최적 운동법은?', '마라톤 훈련 어떻게 짜야 해?', '운동 후 회복 빠르게 하려면?'],
    },
    {
        id: 'marketing', name: 'Marketing Expert', nameKo: '마케팅 전문가', icon: '📣', color: 'pink', avatarUrl: '/logos/specialist/marketing.png', category: 'specialist', subCategory: '경영', description: '브랜딩·디지털마케팅 전문가',
        quote: '팔리는 건 제품이 아니라 이야기다',
        sampleQuestions: ['브랜드 차별화 전략이 뭐야?', '스타트업 초기 마케팅 방법은?', 'SNS 마케팅 효과 있나?'],
    },
    {
        id: 'criminology', name: 'Criminology Expert', nameKo: '범죄학 전문가', icon: '🕵️', color: 'red', avatarUrl: '/logos/specialist/criminology.png', category: 'specialist', subCategory: '사회·교육', description: '범죄·형사사법 전문가',
        quote: '범죄를 만드는 건 사람만이 아니다',
        sampleQuestions: ['연쇄살인범 심리 구조는?', '범죄 예방 가장 효과적 방법?', '화이트칼라 범죄 왜 처벌 약한가?'],
    },
    {
        id: 'physics', name: 'Physics Expert', nameKo: '물리학 전문가', icon: '⚛️', color: 'blue', avatarUrl: '/logos/specialist/physics.png', category: 'specialist', subCategory: '과학·기술', description: '물리학·역학 전문가',
        quote: '자연은 수학의 언어로 쓰여 있다',
        sampleQuestions: ['블랙홀 안에서는 어떻게 돼?', '양자역학이 일상에 미치는 영향?', '핵융합 발전 현실화 가능한가?'],
    },
    {
        id: 'chemistry', name: 'Chemistry Expert', nameKo: '화학 전문가', icon: '🧪', color: 'emerald', avatarUrl: '/logos/specialist/chemistry.png', category: 'specialist', subCategory: '과학·기술', description: '화학·물질 전문가',
        quote: '모든 물질엔 이야기가 있다',
        sampleQuestions: ['플라스틱 분해 기술 어디까지 왔나?', '약이 몸에서 어떻게 작용해?', '배터리 성능 한계는 화학 때문?'],
    },
    {
        id: 'biology', name: 'Biology Expert', nameKo: '생물학 전문가', icon: '🧬', color: 'emerald', avatarUrl: '/logos/specialist/biology.png', category: 'specialist', subCategory: '과학·기술', description: '생물학·생명과학 전문가',
        quote: '생명은 정보를 복제하는 체계다',
        sampleQuestions: ['유전자 편집 윤리적으로 괜찮아?', '암은 왜 완전 정복이 어려운가?', '진화론으로 인간 행동 설명 되나?'],
    },
    {
        id: 'earthscience', name: 'Earth Science Expert', nameKo: '지구과학 전문가', icon: '🌍', color: 'teal', avatarUrl: '/logos/specialist/earthscience.png', category: 'specialist', subCategory: '과학·기술', description: '지질·기상·해양 전문가',
        quote: '지구는 46억 년의 기록물이다',
        sampleQuestions: ['한반도 지진 위험 얼마나 돼?', '엘니뇨가 한국 날씨에 미치는 영향?', '판구조론으로 히말라야 설명해봐'],
    },
    {
        id: 'envscience', name: 'Environmental Science Expert', nameKo: '환경과학 전문가', icon: '🌿', color: 'emerald', avatarUrl: '/logos/specialist/envscience.png', category: 'specialist', subCategory: '과학·기술', description: '환경·생태계 전문가',
        quote: '자연은 협상하지 않는다',
        sampleQuestions: ['탄소중립 2050 실제로 가능한가?', '미세먼지 근본 해결책은?', '핵발전 환경에 좋은가 나쁜가?'],
    },
    {
        id: 'theology', name: 'Theology Expert', nameKo: '신학/종교학 전문가', icon: '🛐', color: 'purple', avatarUrl: '/logos/specialist/theology.png', category: 'specialist', subCategory: '역사·철학', description: '신학·종교학 전문가',
        quote: '믿음은 묻는 것을 멈추지 않는다',
        sampleQuestions: ['종교는 왜 전쟁을 일으키나?', '과학과 종교는 양립 가능한가?', '동서양 신관의 차이는?'],
    },
    {
        id: 'compsci', name: 'Computer Science Expert', nameKo: '컴퓨터공학 전문가', icon: '🖥️', color: 'blue', avatarUrl: '/logos/specialist/compsci.png', category: 'specialist', subCategory: '과학·기술', description: 'CS·알고리즘 전문가',
        quote: '복잡성은 추상화로 정복된다',
        sampleQuestions: ['딥러닝 원리를 쉽게 설명해줘', 'O(n log n)이 왜 효율적인가?', '분산 시스템 설계 어렵게 만드는 게 뭐야?'],
    },
    {
        id: 'pubadmin', name: 'Public Administration Expert', nameKo: '행정학 전문가', icon: '🏢', color: 'amber', avatarUrl: '/logos/specialist/pubadmin.png', category: 'specialist', subCategory: '사회·교육', description: '행정·공공정책 전문가',
        quote: '좋은 정부는 설계의 결과다',
        sampleQuestions: ['공무원 조직 왜 혁신이 어려운가?', '규제 개혁 왜 말처럼 안 되나?', '지방분권 득보다 실이 크지 않나?'],
    },
    {
        id: 'military', name: 'Military Expert', nameKo: '군사 전문가', icon: '🎖️', color: 'emerald', avatarUrl: '/logos/specialist/military.png', category: 'specialist', subCategory: '사회·교육', description: '군사전략·안보·지정학 전문가',
        quote: '전쟁을 이해해야 평화를 지킨다',
        sampleQuestions: ['한반도 안보 가장 큰 위협은?', '드론 전쟁이 전략을 어떻게 바꿨나?', '우크라이나 전쟁 교훈은?'],
    },
    {
        id: 'intlrelations', name: 'International Relations Expert', nameKo: '국제관계 전문가', icon: '🌐', color: 'blue', avatarUrl: '/logos/specialist/intlrelations.png', category: 'specialist', subCategory: '사회·교육', description: '외교·국제정치·글로벌 이슈 전문가',
        quote: '국제정치엔 영원한 우방도 적도 없다',
        sampleQuestions: ['미중 패권 경쟁 누가 이기나?', '유엔은 왜 효과가 없는 건가?', '한국 외교 전략 어떻게 가야 해?'],
    },
    {
        id: 'astronomy', name: 'Astronomy Expert', nameKo: '천문학 전문가', icon: '🔭', color: 'purple', avatarUrl: '/logos/specialist/astronomy.png', category: 'specialist', subCategory: '과학·기술', description: '우주·천체·우주탐사 전문가',
        quote: '우주는 우리를 작게 만들지 않는다',
        sampleQuestions: ['외계 생명체 존재 가능성은?', '다크매터가 뭔지 쉽게 설명해줘', '화성 이주 현실적으로 가능한가?'],
    // Occupations
    },
    {
        id: 'doctor', name: 'Doctor', nameKo: '의사', icon: '🩺', color: 'red', avatarUrl: '/logos/occupation/doctor.png', category: 'occupation', subCategory: '의료', description: '임상 진료 전문의',
        quote: '생명 앞에 타협은 없다',
        sampleQuestions: ['이 증상 뭔가요?', '약 부작용 걱정돼요', '건강검진 언제 받나요?'],
    },
    {
        id: 'pharmacist', name: 'Pharmacist', nameKo: '약사', icon: '💊', color: 'emerald', avatarUrl: '/logos/occupation/pharmacist.png', category: 'occupation', subCategory: '의료', description: '약학·처방 전문가',
        quote: '모든 약은 독이 될 수 있다',
        sampleQuestions: ['이 약 같이 먹어도 되나요?', '복약 시간 중요한가요?', '진통제 자주 먹으면 안 되나요?'],
    },
    {
        id: 'vet', name: 'Veterinarian', nameKo: '수의사', icon: '🐾', color: 'emerald', avatarUrl: '/logos/occupation/vet.png', category: 'occupation', subCategory: '의료', description: '동물·수의학 전문가',
        quote: '말 못하는 생명을 대신 말한다',
        sampleQuestions: ['강아지 예방접종 언제요?', '고양이가 밥을 안 먹어요', '반려동물 보험 필요한가요?'],
    },
    {
        id: 'lawyer', name: 'Lawyer', nameKo: '변호사', icon: '👨‍⚖️', color: 'amber', avatarUrl: '/logos/occupation/lawyer.png', category: 'occupation', subCategory: '법·경제', description: '소송·법률자문 전문가',
        quote: '계약서는 분쟁의 설계도다',
        sampleQuestions: ['계약 해지할 수 있나요?', '손해배상 청구 가능한가요?', '내용증명 효력 있나요?'],
    },
    {
        id: 'accountant', name: 'Accountant', nameKo: '회계사', icon: '🧾', color: 'blue', avatarUrl: '/logos/occupation/accountant.png', category: 'occupation', subCategory: '법·경제', description: '회계·세무 전문가',
        quote: '숫자는 거짓말하지 않는다',
        sampleQuestions: ['재무제표 어떻게 읽나요?', '법인세 줄이는 방법은?', '감사 받을 때 주의할 점은?'],
    },
    {
        id: 'teacher', name: 'Teacher', nameKo: '교사', icon: '👨‍🏫', color: 'orange', avatarUrl: '/logos/occupation/teacher.png', category: 'occupation', subCategory: '교육·창작', description: '교육·학습 전문가',
        quote: '배움은 질문에서 시작된다',
        sampleQuestions: ['공부 습관 어떻게 만드나요?', '아이가 학교 싫어해요', '수행평가 잘 보는 법은?'],
    },
    {
        id: 'artist', name: 'Artist', nameKo: '예술가', icon: '🎨', color: 'pink', avatarUrl: '/logos/occupation/artist.png', category: 'occupation', subCategory: '교육·창작', description: '예술·창작 전문가',
        quote: '예술은 영혼의 언어다',
        sampleQuestions: ['예술가로 먹고 살 수 있나요?', '창작 슬럼프 어떻게 넘기죠?', 'NFT 아트 어떻게 봐요?'],
    },
    {
        id: 'journalist', name: 'Journalist', nameKo: '기자', icon: '📰', color: 'blue', avatarUrl: '/logos/occupation/journalist.png', category: 'occupation', subCategory: '교육·창작', description: '보도·미디어 전문가',
        quote: '진실은 불편해도 보도한다',
        sampleQuestions: ['가짜뉴스 어떻게 구별하나요?', '언론자유 왜 중요한가요?', '취재원 보호가 뭔가요?'],
    },
    {
        id: 'designer', name: 'Designer', nameKo: '디자이너', icon: '🖌️', color: 'orange', avatarUrl: '/logos/occupation/designer.png', category: 'occupation', subCategory: '교육·창작', description: 'UX·디자인 전문가',
        quote: '좋은 디자인은 보이지 않는다',
        sampleQuestions: ['UI랑 UX 차이가 뭔가요?', '디자인 포트폴리오 어떻게 만들죠?', '색상 조합 원칙이 있나요?'],
    },
    {
        id: 'engineer', name: 'Engineer', nameKo: '엔지니어', icon: '⚙️', color: 'teal', avatarUrl: '/logos/occupation/engineer.png', category: 'occupation', subCategory: '공학·IT', description: '공학·기술 전문가',
        quote: '설계는 실패를 미리 하는 일',
        sampleQuestions: ['기계 고장 원인 어떻게 찾나요?', '스펙 과잉설계 어떻게 피하죠?', '안전 기준 왜 까다롭나요?'],
    },
    {
        id: 'programmer', name: 'Programmer', nameKo: '프로그래머', icon: '💻', color: 'blue', avatarUrl: '/logos/occupation/programmer.png', category: 'occupation', subCategory: '공학·IT', description: 'IT·소프트웨어 전문가',
        quote: '동작하는 코드보다 읽히는 코드',
        sampleQuestions: ['개발 독학 어떻게 시작하죠?', '코드 리뷰 왜 중요한가요?', '버그 빨리 잡는 방법은?'],
    },
    {
        id: 'architect', name: 'Architect', nameKo: '건축가', icon: '🏗️', color: 'purple', avatarUrl: '/logos/occupation/architect.png', category: 'occupation', subCategory: '공학·IT', description: '건축·설계 전문가',
        quote: '공간이 사람을 바꾼다',
        sampleQuestions: ['집 리모델링 어디서 시작하죠?', '건축비 줄이는 방법은?', '친환경 건축이 뭔가요?'],
    },
    {
        id: 'scientist', name: 'Scientist', nameKo: '과학자', icon: '🔬', color: 'purple', avatarUrl: '/logos/occupation/scientist.png', category: 'occupation', subCategory: '공학·IT', description: '과학·연구 전문가',
        quote: '의심하는 것이 과학의 시작',
        sampleQuestions: ['논문 어떻게 읽어야 하나요?', '과학과 의사과학 어떻게 구별하죠?', '연구비 어떻게 따나요?'],
    },
    {
        id: 'chef', name: 'Chef', nameKo: '요리사', icon: '👨‍🍳', color: 'red', avatarUrl: '/logos/occupation/chef.png', category: 'occupation', subCategory: '현장·기타', description: '요리·식문화 전문가',
        quote: '한 접시에 인생을 담는다',
        sampleQuestions: ['칼질 빨리 늘리는 법은?', '레스토랑 창업 어렵나요?', '식재료 보관 잘 하는 법은?'],
    },
    {
        id: 'pilot', name: 'Pilot', nameKo: '파일럿', icon: '✈️', color: 'teal', avatarUrl: '/logos/occupation/pilot.png', category: 'occupation', subCategory: '현장·기타', description: '항공·운항 전문가',
        quote: '하늘에선 실수가 용서 안 돼',
        sampleQuestions: ['비행기 난기류 위험한가요?', '파일럿 되려면 어떻게 하죠?', '자동비행 얼마나 믿을 수 있나요?'],
    },
    {
        id: 'farmer', name: 'Farmer', nameKo: '농부', icon: '🌾', color: 'emerald', avatarUrl: '/logos/occupation/farmer.png', category: 'occupation', subCategory: '현장·기타', description: '농업·식량 전문가',
        quote: '땅은 거짓말 안 한다',
        sampleQuestions: ['귀농 어떻게 준비하나요?', '유기농이 정말 더 건강한가요?', '식량 안보가 왜 중요한가요?'],
    },
    {
        id: 'firefighter', name: 'Firefighter', nameKo: '소방관', icon: '🚒', color: 'red', avatarUrl: '/logos/occupation/firefighter.png', category: 'occupation', subCategory: '현장·기타', description: '재난·안전 전문가',
        quote: '2분이 생사를 가른다',
        sampleQuestions: ['화재 시 대피 순서는요?', '소화기 사용법 알려주세요', '소방관 직업 힘든가요?'],
    },
    {
        id: 'police', name: 'Police Officer', nameKo: '경찰관', icon: '🚔', color: 'blue', avatarUrl: '/logos/occupation/police.png', category: 'occupation', subCategory: '현장·기타', description: '치안·수사 전문가',
        quote: '시민의 안전이 나의 의무',
        sampleQuestions: ['신고하면 어떻게 처리되나요?', '경찰 수사 과정이 궁금해요', '범죄 예방 어떻게 하나요?'],
    },
    {
        id: 'soldier', name: 'Soldier', nameKo: '군인', icon: '⚔️', color: 'emerald', avatarUrl: '/logos/occupation/soldier.png', category: 'occupation', subCategory: '현장·기타', description: '군사·안보 전문가',
        quote: '나라가 부르면 간다',
        sampleQuestions: ['군대 생활 어떻게 적응하죠?', '현대전은 어떻게 다른가요?', '국방 예산 왜 중요한가요?'],
    // 법·경제 추가
    },
    {
        id: 'taxadvisor', name: 'Tax Advisor', nameKo: '세무사', icon: '🧾', color: 'amber', avatarUrl: '/logos/occupation/taxadvisor.png', category: 'occupation', subCategory: '법·경제', description: '세금·절세 전문가',
        quote: '절세는 합법, 탈세는 범죄',
        sampleQuestions: ['프리랜서 세금 어떻게 내요?', '종합소득세 줄이는 법은?', '법인 만들면 세금 줄어요?'],
    },
    {
        id: 'stocktrader', name: 'Fund Manager', nameKo: '펀드매니저', icon: '📈', color: 'blue', avatarUrl: '/logos/occupation/stocktrader.png', category: 'occupation', subCategory: '법·경제', description: '자산운용·투자 전문가',
        quote: '수익보다 손실 관리가 먼저다',
        sampleQuestions: ['ETF 투자 어떻게 시작하죠?', '포트폴리오 어떻게 짜나요?', '금리가 주식에 왜 영향 주나요?'],
    // 교육·창작 추가
    },
    {
        id: 'writer', name: 'Writer', nameKo: '작가', icon: '✍️', color: 'pink', avatarUrl: '/logos/occupation/writer.png', category: 'occupation', subCategory: '교육·창작', description: '소설·에세이 집필 전문가',
        quote: '첫 문장이 독자를 잡는다',
        sampleQuestions: ['글 쓰는 습관 어떻게 만드죠?', '소설 아이디어 어디서 얻나요?', '출판사 투고 어떻게 하나요?'],
    // 공학·IT 추가
    },
    {
        id: 'gamedev', name: 'Game Developer', nameKo: '게임개발자', icon: '🎮', color: 'emerald', avatarUrl: '/logos/occupation/gamedev.png', category: 'occupation', subCategory: '공학·IT', description: '게임개발·기획 전문가',
        quote: '재미없으면 게임이 아니다',
        sampleQuestions: ['게임 개발 어떻게 시작하죠?', '인디 게임 성공 가능한가요?', '게임 기획서 어떻게 써요?'],
    // 현장·기타 추가
    },
    {
        id: 'athlete', name: 'Athlete', nameKo: '운동선수', icon: '🏅', color: 'amber', avatarUrl: '/logos/occupation/athlete.png', category: 'occupation', subCategory: '현장·기타', description: '스포츠·체력관리 전문가',
        quote: '훈련은 실전보다 힘들어야 한다',
        sampleQuestions: ['운동 루틴 어떻게 짜나요?', '부상 빨리 회복하는 법은?', '멘탈 관리 어떻게 하죠?'],
    },
    {
        id: 'barista', name: 'Barista', nameKo: '바리스타', icon: '☕', color: 'orange', avatarUrl: '/logos/occupation/barista.png', category: 'occupation', subCategory: '현장·기타', description: '커피·카페 문화 전문가',
        quote: '한 잔에 정성을 담는다',
        sampleQuestions: ['커피 원두 어떻게 고르나요?', '카페 창업 현실이 궁금해요', '에스프레소랑 드립 차이는요?'],
    },
    {
        id: 'hairstylist', name: 'Hairstylist', nameKo: '미용사', icon: '💇', color: 'pink', avatarUrl: '/logos/occupation/hairstylist.png', category: 'occupation', subCategory: '현장·기타', description: '헤어·뷰티 전문가',
        quote: '헤어스타일이 자신감을 만든다',
        sampleQuestions: ['내 얼굴형에 맞는 헤어는요?', '탈모 예방 어떻게 하나요?', '염색 자주 해도 괜찮나요?'],
    },
    {
        id: 'counselor', name: 'Counselor', nameKo: '상담사', icon: '💬', color: 'purple', avatarUrl: '/logos/occupation/counselor.png', category: 'occupation', subCategory: '의료', description: '심리상담·코칭 전문가',
        quote: '들어주는 것이 절반의 치료다',
        sampleQuestions: ['불안감 어떻게 다스리나요?', '상담 받는 게 도움 되나요?', '번아웃 어떻게 극복하죠?'],
    },
    {
        id: 'socialworker', name: 'Social Worker', nameKo: '사회복지사', icon: '🤲', color: 'pink', avatarUrl: '/logos/occupation/socialworker.png', category: 'occupation', subCategory: '현장·기타', description: '복지·취약계층 지원 전문가',
        quote: '복지는 자선이 아니라 권리다',
        sampleQuestions: ['기초생활수급 어떻게 신청해요?', '노인 돌봄 서비스 있나요?', '복지사 직업 어떤가요?'],
    },
    {
        id: 'diplomat', name: 'Diplomat', nameKo: '외교관', icon: '🤝', color: 'teal', avatarUrl: '/logos/occupation/diplomat.png', category: 'occupation', subCategory: '현장·기타', description: '외교·국제관계 전문가',
        quote: '협상에서 침묵도 전략이다',
        sampleQuestions: ['외교관 어떻게 되나요?', '한미 관계 어떻게 보세요?', '국제 협상은 어떻게 하나요?'],
    },
    {
        id: 'judge', name: 'Judge', nameKo: '판사', icon: '⚖️', color: 'amber', avatarUrl: '/logos/occupation/judge.png', category: 'occupation', subCategory: '법·경제', description: '사법·재판 전문가',
        quote: '판결은 법조문이 아니라 이성이 한다',
        sampleQuestions: ['재판 어떻게 진행되나요?', '판사는 어떻게 결정 내리죠?', '무죄 추정 원칙이 뭔가요?'],
    },
    {
        id: 'sailor', name: 'Sailor', nameKo: '선원', icon: '⚓', color: 'blue', avatarUrl: '/logos/occupation/sailor.png', category: 'occupation', subCategory: '현장·기타', description: '해운·항해 전문가',
        quote: '바다는 계획을 비웃는다',
        sampleQuestions: ['선원 생활 어떤가요?', '해운업 전망이 궁금해요', '태풍 만나면 어떻게 하죠?'],
    },
    {
        id: 'model', name: 'Model', nameKo: '모델', icon: '👗', color: 'purple', avatarUrl: '/logos/occupation/model.png', category: 'occupation', subCategory: '교육·창작', description: '패션·뷰티 전문가',
        quote: '자신감이 최고의 옷이다',
        sampleQuestions: ['모델 어떻게 데뷔하나요?', '패션 트렌드 어떻게 읽나요?', '사진 잘 나오는 포즈 있나요?'],
    },
    {
        id: 'flightcrew', name: 'Flight Attendant', nameKo: '승무원', icon: '🛫', color: 'blue', avatarUrl: '/logos/occupation/flightcrew.png', category: 'occupation', subCategory: '현장·기타', description: '항공·서비스 전문가',
        quote: '안전이 서비스보다 먼저다',
        sampleQuestions: ['비행기 타면 귀 왜 아프죠?', '승무원 되려면 어떻게 하나요?', '장거리 비행 피로 줄이는 법은?'],
    },
    {
        id: 'bodyguard', name: 'Bodyguard', nameKo: '경호원', icon: '🕶️', color: 'emerald', avatarUrl: '/logos/occupation/bodyguard.png', category: 'occupation', subCategory: '현장·기타', description: '신변보호·보안 전문가',
        quote: '위험은 보이기 전에 막는다',
        sampleQuestions: ['경호원 어떻게 되나요?', '개인 보안 어떻게 강화하죠?', '경호원이 제일 중요시하는 게 뭔가요?'],
    },
    {
        id: 'musician', name: 'Musician', nameKo: '음악가', icon: '🎵', color: 'purple', avatarUrl: '/logos/occupation/musician.png', category: 'occupation', subCategory: '교육·창작', description: '음악·작곡·연주 전문가',
        quote: '음악은 침묵 사이에 있다',
        sampleQuestions: ['악기 독학 어떻게 시작하죠?', '음악으로 먹고살 수 있나요?', '작곡은 어떻게 배우나요?'],
    },
    {
        id: 'comedian', name: 'Comedian', nameKo: '코미디언', icon: '🤡', color: 'amber', avatarUrl: '/logos/occupation/comedian.png', category: 'occupation', subCategory: '교육·창작', description: '코미디·엔터테인먼트 전문가',
        quote: '웃음 뒤에는 진실이 있다',
        sampleQuestions: ['코미디언 어떻게 되나요?', '유머 감각 어떻게 키우죠?', '개그와 풍자 차이가 뭔가요?'],
    },
    {
        id: 'producer', name: 'Producer', nameKo: '프로듀서', icon: '🎬', color: 'red', avatarUrl: '/logos/occupation/producer.png', category: 'occupation', subCategory: '교육·창작', description: '방송·영상 제작 전문가',
        quote: '좋은 콘텐츠는 아이디어가 아니라 실행이다',
        sampleQuestions: ['유튜브 채널 어떻게 시작하죠?', '방송 PD 되려면요?', '콘텐츠 기획서 어떻게 써요?'],
    },
    {
        id: 'miner', name: 'Miner', nameKo: '광부', icon: '⛏️', color: 'orange', avatarUrl: '/logos/occupation/miner.png', category: 'occupation', subCategory: '현장·기타', description: '광업·자원 채굴 전문가',
        quote: '지하에서 배운 건 신중함이다',
        sampleQuestions: ['광부 일이 어떤가요?', '희토류가 왜 중요한가요?', '광산 안전 어떻게 지키나요?'],
    },
    {
        id: 'fisher', name: 'Fisher', nameKo: '어부', icon: '🎣', color: 'blue', avatarUrl: '/logos/occupation/fisher.png', category: 'occupation', subCategory: '현장·기타', description: '어업·수산 전문가',
        quote: '바다를 아는 자만 돌아온다',
        sampleQuestions: ['수산물 신선도 어떻게 구별해요?', '어업이 힘들어지는 이유는요?', '양식업이랑 원양어업 차이는?'],
    },
    {
        id: 'sommelier', name: 'Sommelier', nameKo: '소믈리에', icon: '🍷', color: 'red', avatarUrl: '/logos/occupation/sommelier.png', category: 'occupation', subCategory: '현장·기타', description: '와인·음료 전문가',
        quote: '좋은 와인은 기억을 남긴다',
        sampleQuestions: ['와인 입문 어떻게 시작하죠?', '가성비 좋은 와인 고르는 법은?', '음식과 와인 페어링 원칙은요?'],
    },
    {
        id: 'president', name: 'President', nameKo: '대통령', icon: '🏛️', color: 'amber', avatarUrl: '/logos/occupation/president.png', category: 'occupation', subCategory: '현장·기타', description: '국가 통치·정책 전문가',
        quote: '국가 결정은 혼자 하지 않는다',
        sampleQuestions: ['대통령 권한이 어디까지인가요?', '정책 어떻게 결정되나요?', '국정 운영 가장 어려운 게 뭔가요?'],
    },
    {
        id: 'lawmaker', name: 'Lawmaker', nameKo: '국회의원', icon: '🏢', color: 'blue', avatarUrl: '/logos/occupation/lawmaker.png', category: 'occupation', subCategory: '현장·기타', description: '입법·정치 전문가',
        quote: '법 하나 바꾸는 데 수년이 걸린다',
        sampleQuestions: ['법 어떻게 만들어지나요?', '국회의원 역할이 뭔가요?', '정치 입문하려면 어떻게요?'],
    },
    {
        id: 'detective', name: 'Detective', nameKo: '탐정', icon: '🔍', color: 'purple', avatarUrl: '/logos/occupation/detective.png', category: 'occupation', subCategory: '현장·기타', description: '조사·수사 전문가',
        quote: '사람은 거짓말해도 흔적은 안 한다',
        sampleQuestions: ['탐정 어떻게 되나요?', '불륜 조사 어떻게 하나요?', '탐정 의뢰 어떤 경우에 하죠?'],
    },
    {
        id: 'explorer', name: 'Explorer', nameKo: '탐험가', icon: '🧭', color: 'teal', avatarUrl: '/logos/occupation/explorer.png', category: 'occupation', subCategory: '현장·기타', description: '탐험·모험 전문가',
        quote: '지도가 없는 곳에 발견이 있다',
        sampleQuestions: ['극지 탐험 어떻게 준비하죠?', '생존 기술 중 가장 중요한 건요?', '탐험가로 먹고살 수 있나요?'],

    // Celebrities — 기업·투자
    },
    {
        id: 'jobs', name: 'Product Visionary', nameKo: '스티브 잡스', icon: '🍎', color: 'pink', category: 'celebrity', subCategory: '기업·투자', description: '제품혁신 전문가',
        quote: '미쳐있어야 위대해진다',
        sampleQuestions: ['애플 제품이 특별한 이유?', '디자인과 기능 중 뭐가 중요?', '창의적 아이디어 얻는 법?'],

    // Celebrities — 정치·사회
    },
    {
        id: 'jihwan', name: 'Ji-Hwan Yoo', nameKo: '유지환 (제작자)', icon: '👨‍💻', color: 'blue', category: 'celebrity', subCategory: '정치·사회', description: '이 서비스의 제작자',
    },

    // Celebrities — 역사 인물
    {
        id: 'napoleon', name: 'Napoleon Bonaparte', nameKo: '나폴레옹', icon: '⚔️', color: 'red', category: 'celebrity', subCategory: '역사 인물', description: '군사·전략의 황제',
        quote: '불가능은 겁쟁이의 사전에만',
        sampleQuestions: ['전쟁에서 가장 중요한 건 뭔가요?', '리더십의 핵심이 무엇인가요?', '패배에서 어떻게 일어났나요?'],
    },
    {
        id: 'lincoln', name: 'Abraham Lincoln', nameKo: '링컨', icon: '🎩', color: 'blue', category: 'celebrity', subCategory: '역사 인물', description: '민주주의·통합의 지도자',
        quote: '적을 친구로 만들면 된다',
        sampleQuestions: ['남북전쟁을 어떻게 극복했나요?', '노예제 폐지는 왜 중요했나요?', '분열된 사회를 어떻게 통합하나요?'],
    },
    {
        id: 'churchill', name: 'Winston Churchill', nameKo: '처칠', icon: '🇬🇧', color: 'amber', category: 'celebrity', subCategory: '역사 인물', description: '위기의 리더십 상징',
        quote: '포기란 없다, 절대로',
        sampleQuestions: ['2차 세계대전을 어떻게 버텼나요?', '위기 때 리더는 어떻게 해야 하나요?', '처칠의 연설 비결이 뭔가요?'],

    // Celebrities — 과학자
    },
    {
        id: 'einstein', name: 'Albert Einstein', nameKo: '아인슈타인', icon: '🧪', color: 'purple', category: 'celebrity', subCategory: '과학자', description: '상대성이론의 아버지',
        quote: '상상력이 지식보다 중요하다',
        sampleQuestions: ['상대성이론을 쉽게 설명해주세요', '창의성을 어떻게 키우나요?', 'AI 시대에도 인간이 필요한가요?'],
    },
    {
        id: 'curie', name: 'Marie Curie', nameKo: '퀴리부인', icon: '☢️', color: 'emerald', category: 'celebrity', subCategory: '과학자', description: '방사성 연구의 선구자',
        quote: '두려울 것은 아무것도 없다',
        sampleQuestions: ['여성 과학자로서 어떤 어려움이 있었나요?', '방사성 연구는 어떻게 시작했나요?', '포기하고 싶을 때 어떻게 했나요?'],
    },
    {
        id: 'newton', name: 'Isaac Newton', nameKo: '뉴턴', icon: '🍏', color: 'orange', category: 'celebrity', subCategory: '과학자', description: '근대 과학혁명의 아버지',
        quote: '거인의 어깨 위에 선 것뿐',
        sampleQuestions: ['만유인력은 어떻게 발견했나요?', '과학적 사고란 무엇인가요?', '수학과 물리학의 관계는?'],

    // Celebrities — 철학자
    },
    {
        id: 'nietzsche', name: 'Friedrich Nietzsche', nameKo: '니체', icon: '🦅', color: 'red', category: 'celebrity', subCategory: '철학자', description: '초인 철학자',
        quote: '괴물과 싸울 때 주의하라',
        sampleQuestions: ['초인이란 어떤 존재인가요?', '기존 도덕을 왜 부정하나요?', '허무주의를 어떻게 극복하나요?'],
    },
    {
        id: 'confucius', name: 'Confucius', nameKo: '공자', icon: '📿', color: 'amber', category: 'celebrity', subCategory: '철학자', description: '유교 사상의 창시자',
        quote: '배우고 때로 익히면',
        sampleQuestions: ['진정한 어진 사람이란?', '공부는 왜 해야 하나요?', '좋은 리더의 조건은 무엇인가요?'],
    },
    {
        id: 'kant', name: 'Immanuel Kant', nameKo: '칸트', icon: '📐', color: 'blue', category: 'celebrity', subCategory: '철학자', description: '순수이성비판의 저자',
        quote: '머리 위 별과 마음속 도덕',
        sampleQuestions: ['정언명령이란 무엇인가요?', '도덕은 결과가 아닌 의무인가요?', '순수이성비판을 쉽게 설명해주세요'],
    },
    {
        id: 'davinci', name: 'Leonardo da Vinci', nameKo: '다빈치', icon: '🎨', color: 'amber', category: 'celebrity', subCategory: '역사 인물', description: '르네상스 천재',
        quote: '단순함이 궁극의 정교함',
        sampleQuestions: ['모나리자를 왜 미완성으로 남겼나요?', '예술과 과학을 어떻게 융합했나요?', '창의성의 원천이 무엇인가요?'],
    },
    {
        id: 'tesla', name: 'Nikola Tesla', nameKo: '니콜라 테슬라', icon: '⚡', color: 'purple', category: 'celebrity', subCategory: '과학자', description: '교류전기·무선통신 발명가',
        quote: '현재는 그들의 것, 미래는 내 것',
        sampleQuestions: ['에디슨과의 전류 전쟁은 어떠셨나요?', '무선 에너지 전송은 가능한가요?', '발명의 영감은 어디서 오나요?'],
    },
    {
        id: 'hawking', name: 'Stephen Hawking', nameKo: '스티븐 호킹', icon: '🌌', color: 'teal', category: 'celebrity', subCategory: '과학자', description: '블랙홀·우주론 천재',
        quote: '하늘을 봐라, 발밑 말고',
        sampleQuestions: ['블랙홀에서 정보는 사라지나요?', '시간여행이 가능한가요?', '우주에 다른 지적생명체가 있을까요?'],
    },
    {
        id: 'darwin', name: 'Charles Darwin', nameKo: '다윈', icon: '🐢', color: 'emerald', category: 'celebrity', subCategory: '과학자', description: '진화론의 아버지',
        quote: '살아남는 건 강한 종이 아니다',
        sampleQuestions: ['인간도 자연선택의 결과인가요?', '진화론은 왜 논란이 됐나요?', '종의 기원을 어떻게 발견했나요?'],
    },
    {
        id: 'turing', name: 'Alan Turing', nameKo: '앨런 튜링', icon: '🖥️', color: 'teal', category: 'celebrity', subCategory: '과학자', description: '컴퓨터 과학의 아버지',
        quote: '기계도 생각할 수 있다',
        sampleQuestions: ['튜링 테스트가 무엇인가요?', 'AI가 진짜 지능을 가질 수 있나요?', '에니그마 해독은 어떻게 했나요?'],
    },
    {
        id: 'aristotle', name: 'Aristotle', nameKo: '아리스토텔레스', icon: '📜', color: 'amber', category: 'celebrity', subCategory: '철학자', description: '논리학·형이상학의 아버지',
        quote: '탁월함은 습관에서 나온다',
        sampleQuestions: ['행복이란 무엇인가요?', '좋은 사회란 어떤 사회인가요?', '논리적 사고를 어떻게 훈련하나요?'],
    },
    {
        id: 'sunzi', name: 'Sun Tzu', nameKo: '손자', icon: '⚔️', color: 'red', category: 'celebrity', subCategory: '역사 인물', description: '손자병법의 저자',
        quote: '싸우지 않고 이기는 것이 최선',
        sampleQuestions: ['비즈니스 경쟁에 손자병법을 어떻게 적용하나요?', '적을 알고 나를 알면 어떻게 되나요?', '전쟁에서 속임수는 정당한가요?'],
    },
    {
        id: 'mlk', name: 'Martin Luther King Jr.', nameKo: '마틴 루터 킹', icon: '✊', color: 'amber', category: 'celebrity', subCategory: '정치·사회', description: '시민권 운동·비폭력 저항',
        quote: '나에게는 꿈이 있습니다',
        sampleQuestions: ['비폭력 저항이 왜 효과적인가요?', '불의한 법은 어떻게 해야 하나요?', '차별을 극복하는 방법은?'],

    // Celebrities — 기업가 (과거)
    },
    {
        id: 'carnegie', name: 'Andrew Carnegie', nameKo: '카네기', icon: '🏭', color: 'amber', category: 'celebrity', subCategory: '기업·투자', description: '철강왕·자선의 복음',
        quote: '부자로 죽는 것은 수치다',
        sampleQuestions: ['철강 사업을 어떻게 키웠나요?', '부의 복음이란 무엇인가요?', '자수성가의 비결은 뭔가요?'],
    },
    {
        id: 'rockefeller', name: 'John D. Rockefeller', nameKo: '록펠러', icon: '🛢️', color: 'teal', category: 'celebrity', subCategory: '기업·투자', description: '석유왕·독점과 자선',
        quote: '기회는 준비된 자만 본다',
        sampleQuestions: ['스탠더드오일을 어떻게 독점했나요?', '돈을 어떻게 관리해야 하나요?', '경쟁자를 어떻게 다뤘나요?'],

    // Celebrities — 역사 인물 추가
    },
    {
        id: 'alexander', name: 'Alexander the Great', nameKo: '알렉산더 대왕', icon: '🏛️', color: 'purple', category: 'celebrity', subCategory: '역사 인물', description: '세계 정복·동서 문화 융합',
        quote: '두려움 없이 전진하라',
        sampleQuestions: ['세계를 정복한 비결은?', '동서 문화 융합의 의미는?', '젊은 리더가 갖춰야 할 것은?'],
    },
    {
        id: 'caesar', name: 'Julius Caesar', nameKo: '율리우스 카이사르', icon: '🏛️', color: 'red', category: 'celebrity', subCategory: '역사 인물', description: '로마의 독재관·권력과 배신',
        quote: '왔노라, 보았노라, 이겼노라',
        sampleQuestions: ['루비콘강을 건넌 이유는?', '권력을 잡는 핵심 전략은?', '배신을 어떻게 대처하나요?'],

    // Celebrities — 문화·예술
    },
    {
        id: 'shakespeare', name: 'William Shakespeare', nameKo: '셰익스피어', icon: '🎭', color: 'purple', category: 'celebrity', subCategory: '문화·예술', description: '인간 본성의 극작가',
        quote: '사느냐 죽느냐 그것이 문제',
        sampleQuestions: ['인간의 가장 큰 비극은 무엇인가?', '사랑과 질투 중 더 강한 것은?', '권력은 사람을 어떻게 바꾸나?'],
    },
    {
        id: 'beethoven', name: 'Ludwig van Beethoven', nameKo: '베토벤', icon: '🎹', color: 'amber', category: 'celebrity', subCategory: '문화·예술', description: '고난 속 불굴의 작곡가',
        quote: '음악은 고통보다 강하다',
        sampleQuestions: ['청각을 잃고도 어떻게 작곡했나요?', '고난이 예술을 만드는가요?', '운명 교향곡의 의미는?'],
    },
    {
        id: 'mozart', name: 'Wolfgang Amadeus Mozart', nameKo: '모차르트', icon: '🎻', color: 'pink', category: 'celebrity', subCategory: '문화·예술', description: '자유분방한 천재 작곡가',
        quote: '음악은 그냥 흘러나온다',
        sampleQuestions: ['천재성은 타고나는 것인가요?', '음악과 자유의 관계는?', '즐기면서 일하는 비결은?'],
    },
    {
        id: 'michelangelo', name: 'Michelangelo', nameKo: '미켈란젤로', icon: '🗿', color: 'teal', category: 'celebrity', subCategory: '문화·예술', description: '조각·회화의 르네상스 거장',
        quote: '돌 속에 천사가 잠들었다',
        sampleQuestions: ['완벽함을 추구하는 비결은?', '예술과 신앙은 어떻게 연결되나요?', '시스티나 성당 작업의 고충은?'],

    // 추가 인물
    },
    {
        id: 'plato', name: 'Plato', nameKo: '플라톤', icon: '📘', color: 'blue', category: 'celebrity', subCategory: '철학자', description: '이데아론·이상국가의 설계자',
        quote: '동굴 밖으로 나와야 한다',
        sampleQuestions: ['이데아란 무엇인가요?', '이상적인 국가의 조건은?', '철학자가 왜 통치해야 하나요?'],
    },
    {
        id: 'marco-polo', name: 'Marco Polo', nameKo: '마르코 폴로', icon: '🗺️', color: 'amber', category: 'celebrity', subCategory: '역사 인물', description: '동서양을 잇는 대탐험가',
        quote: '지도 밖에 세계가 있다',
        sampleQuestions: ['실크로드 여행에서 배운 것은?', '동서양 문화 차이는 어땠나요?', '쿠빌라이 칸은 어떤 사람이었나요?'],
    },
    {
        id: 'galileo', name: 'Galileo Galilei', nameKo: '갈릴레오', icon: '🔭', color: 'purple', category: 'celebrity', subCategory: '과학자', description: '지동설·근대 과학의 아버지',
        quote: '그래도 지구는 돈다',
        sampleQuestions: ['관측이 왜 권위보다 중요한가요?', '종교와 과학 충돌을 어떻게 보나요?', '망원경으로 무엇을 발견했나요?'],
    },
    {
        id: 'edison', name: 'Thomas Edison', nameKo: '에디슨', icon: '💡', color: 'amber', category: 'celebrity', subCategory: '과학자', description: '발명왕·실용주의 천재',
        quote: '안 되는 방법을 찾았을 뿐',
        sampleQuestions: ['1만 번 실패해도 포기 안 한 비결은?', '발명가와 과학자의 차이는?', '백열전구 발명의 실제 과정은?'],

    // 역사 인물 추가
    },
    {
        id: 'hannibal', name: 'Hannibal Barca', nameKo: '한니발', icon: '🐘', color: 'red', category: 'celebrity', subCategory: '역사 인물', description: '로마를 공포에 떨게 한 전략가',
        quote: '길이 없으면 만들면 된다',
        sampleQuestions: ['알프스를 넘은 이유는 무엇인가요?', '칸나에 전투의 전략을 설명해주세요', '결국 패배한 이유는 무엇인가요?'],
    },
    {
        id: 'columbus', name: 'Christopher Columbus', nameKo: '콜럼버스', icon: '⛵', color: 'blue', category: 'celebrity', subCategory: '역사 인물', description: '신대륙 발견·탐험의 아이콘',
        quote: '수평선 너머에 세계가 있다',
        sampleQuestions: ['신대륙 발견은 행운인가요 필연인가요?', '탐험 정신의 본질은 무엇인가요?', '발견의 어두운 면을 어떻게 보나요?'],
    },
    {
        id: 'machiavelli', name: 'Niccolò Machiavelli', nameKo: '마키아벨리', icon: '🦊', color: 'red', category: 'celebrity', subCategory: '철학자', description: '군주론·현실정치의 아버지',
        quote: '목적이 수단을 정당화한다',
        sampleQuestions: ['두려움과 사랑 중 무엇이 더 강한가요?', '이상적 군주의 조건은 무엇인가요?', '권력을 유지하는 비결은?'],

    // 정치·사회 추가
    },
    {
        id: 'mandela', name: 'Nelson Mandela', nameKo: '넬슨 만델라', icon: '✊', color: 'emerald', category: 'celebrity', subCategory: '정치·사회', description: '27년 수감 후 화해와 용서의 지도자',
        quote: '교육은 세상을 바꾸는 무기',
        sampleQuestions: ['27년 감옥에서 어떻게 버텼나요?', '용서와 화해의 힘은 무엇인가요?', '진정한 자유는 무엇인가요?'],

    // 문화·예술 추가
    },
    {
        id: 'van-gogh', name: 'Vincent van Gogh', nameKo: '반 고흐', icon: '🌻', color: 'amber', category: 'celebrity', subCategory: '문화·예술', description: '고뇌의 화가·색채의 혁명',
        quote: '고통이 없으면 색도 없다',
        sampleQuestions: ['살아서 그림을 팔지 못한 이유는?', '색채로 감정을 표현하는 방법은?', '고독과 창조의 관계는?'],
    },
    {
        id: 'tolstoy', name: 'Leo Tolstoy', nameKo: '톨스토이', icon: '📖', color: 'orange', category: 'celebrity', subCategory: '문화·예술', description: '전쟁과 평화·인간 본질 탐구',
        quote: '사람은 무엇으로 사는가',
        sampleQuestions: ['전쟁과 평화의 핵심 주제는?', '단순한 삶이 더 진실한 이유는?', '도덕과 사회의 충돌을 어떻게 보나요?'],
    },
    {
        id: 'picasso', name: 'Pablo Picasso', nameKo: '피카소', icon: '🎨', color: 'blue', category: 'celebrity', subCategory: '문화·예술', description: '입체파·규칙을 부순 예술가',
        quote: '모든 창조는 파괴에서 시작',
        sampleQuestions: ['입체파가 세상을 어떻게 바꿨나요?', '창의성과 규칙 파괴의 관계는?', '게르니카를 그린 이유는?'],

    // 과학자 추가
    },
    {
        id: 'archimedes', name: 'Archimedes', nameKo: '아르키메데스', icon: '⚙️', color: 'teal', category: 'celebrity', subCategory: '과학자', description: '유레카·수학과 공학의 천재',
        quote: '충분히 긴 지렛대면 된다',
        sampleQuestions: ['유레카 순간은 어떻게 왔나요?', '수학과 공학의 연결점은?', '지렛대 원리를 현대에 적용하면?'],
    },
    {
        id: 'hippocrates', name: 'Hippocrates', nameKo: '히포크라테스', icon: '⚕️', color: 'emerald', category: 'celebrity', subCategory: '과학자', description: '의학의 아버지·해치지 말라',
        quote: '먼저 해를 끼치지 말라',
        sampleQuestions: ['의학에서 윤리가 왜 중요한가요?', '미신 없는 의학을 어떻게 세웠나요?', '의사의 첫 번째 의무는 무엇인가요?'],
    },
    {
        id: 'pythagoras', name: 'Pythagoras', nameKo: '피타고라스', icon: '📐', color: 'blue', category: 'celebrity', subCategory: '과학자', description: '만물은 수·수학의 시작',
        quote: '만물의 본질은 수다',
        sampleQuestions: ['수학이 세상을 설명하는 이유는?', '피타고라스 정리 이상의 가르침은?', '수학과 음악의 연결점은?'],
    },
    {
        id: 'nightingale', name: 'Florence Nightingale', nameKo: '나이팅게일', icon: '🏥', color: 'pink', category: 'celebrity', subCategory: '과학자', description: '간호의 어머니·통계로 의료를 바꿈',
        quote: '데이터가 환자를 살린다',
        sampleQuestions: ['통계로 의료를 어떻게 바꿨나요?', '전쟁터에서 가장 힘들었던 것은?', '간호가 과학인 이유는?'],
    },
    {
        id: 'freud', name: 'Sigmund Freud', nameKo: '프로이트', icon: '🧠', color: 'purple', category: 'celebrity', subCategory: '과학자', description: '무의식·정신분석의 아버지',
        quote: '무의식이 의식을 지배한다',
        sampleQuestions: ['무의식은 어떻게 행동에 영향을 주나요?', '꿈은 무엇을 말해주나요?', '이드·자아·초자아의 갈등은?'],
    },
    {
        id: 'adam-smith', name: 'Adam Smith', nameKo: '애덤 스미스', icon: '🤝', color: 'amber', category: 'celebrity', subCategory: '철학자', description: '보이지 않는 손·시장경제의 아버지',
        quote: '보이지 않는 손이 조율',
        sampleQuestions: ['보이지 않는 손이란 무엇인가요?', '분업이 왜 생산성을 높이나요?', '자유 시장의 한계는 무엇인가요?'],
    },
    {
        id: 'rousseau', name: 'Jean-Jacques Rousseau', nameKo: '루소', icon: '🌿', color: 'emerald', category: 'celebrity', subCategory: '철학자', description: '사회계약론·자연으로 돌아가라',
        quote: '인간은 자유롭게 태어났다',
        sampleQuestions: ['자연 상태의 인간은 어떤가요?', '사회계약론의 핵심은 무엇인가요?', '문명이 인간을 타락시키나요?'],
    },
    {
        id: 'gutenberg', name: 'Johannes Gutenberg', nameKo: '구텐베르크', icon: '📰', color: 'orange', category: 'celebrity', subCategory: '기업·투자', description: '인쇄 혁명·지식의 민주화',
        quote: '지식을 모두에게 개방하라',
        sampleQuestions: ['인쇄술이 역사를 어떻게 바꿨나요?', '정보 민주화의 의미는?', '활판 인쇄 발명 과정은?'],
    },
    {
        id: 'helen-keller', name: 'Helen Keller', nameKo: '헬렌 켈러', icon: '✋', color: 'pink', category: 'celebrity', subCategory: '정치·사회', description: '불가능을 가능으로·장애 극복의 상징',
        quote: '시각보다 비전이 중요하다',
        sampleQuestions: ['보지도 듣지도 못하면서 어떻게 배웠나요?', '불가능을 극복하는 힘은 어디서 왔나요?', '앤 설리번 선생님의 의미는?'],

    // 현대 인물 — 기업·투자
    },
    {
        id: 'musk', name: 'Elon Musk', nameKo: '일론 머스크', icon: '🚀', color: 'purple', category: 'celebrity', subCategory: '기업·투자', description: '테슬라·SpaceX·인류의 미래를 설계하는 혁신가',
        quote: '미래를 흥미롭게 만들어야',
        sampleQuestions: ['화성 이주가 왜 필요한가요?', '제1원칙 사고란 무엇인가요?', '동시에 여러 회사 운영하는 비결은?'],
    },
    {
        id: 'buffett', name: 'Warren Buffett', nameKo: '워렌 버핏', icon: '💵', color: 'amber', category: 'celebrity', subCategory: '기업·투자', description: '오마하의 현인·장기 가치투자의 전설',
        quote: '탐욕엔 두려워하고 공포엔 탐내라',
        sampleQuestions: ['가치투자의 핵심 원칙은?', '좋은 기업 고르는 방법은?', '복리의 마법이란 무엇인가요?'],
    },
    {
        id: 'bezos', name: 'Jeff Bezos', nameKo: '제프 베조스', icon: '📦', color: 'orange', category: 'celebrity', subCategory: '기업·투자', description: '아마존 창업자·고객 집착의 아이콘',
        quote: '항상 Day 1이어야 한다',
        sampleQuestions: ['고객 집착이란 무엇인가요?', 'Day 1 마인드셋은 무엇인가요?', '장기적 사고로 단기 손실을 견디는 법은?'],
    },
    {
        id: 'gates', name: 'Bill Gates', nameKo: '빌 게이츠', icon: '💻', color: 'blue', category: 'celebrity', subCategory: '기업·투자', description: 'MS 창업자·기술과 자선으로 세상을 바꾸는 사람',
        quote: '성공은 나쁜 선생이다',
        sampleQuestions: ['MS 창업에서 배운 가장 큰 교훈은?', '글로벌 보건 문제를 어떻게 보나요?', '기후 변화 해결책은 무엇인가요?'],
    },
    {
        id: 'son-masayoshi', name: 'Son Masayoshi', nameKo: '손정의', icon: '📱', color: 'amber', category: 'celebrity', subCategory: '기업·투자', description: '소프트뱅크 회장·300년 비전의 투자가',
        quote: '300년 후를 지금 그린다',
        sampleQuestions: ['300년 비전이란 무엇인가요?', 'AI 혁명을 어떻게 예측했나요?', '과감한 투자를 두려워하지 않는 이유는?'],

    // 현대 인물 — 문화·사상
    },
    {
        id: 'miyazaki', name: 'Hayao Miyazaki', nameKo: '미야자키 하야오', icon: '🎬', color: 'emerald', category: 'celebrity', subCategory: '문화·예술', description: '지브리 감독·상상력과 자연의 이야기꾼',
        quote: '아이들에게 희망을 그려줘야',
        sampleQuestions: ['지브리 작품의 반복되는 주제는?', '애니메이션으로 자연을 표현하는 방법은?', '디지털 시대의 손그림 고집 이유는?'],
    },
    {
        id: 'yuval', name: 'Yuval Noah Harari', nameKo: '유발 하라리', icon: '📖', color: 'orange', category: 'celebrity', subCategory: '정치·사회', description: '사피엔스 저자·인류 역사를 꿰뚫는 사상가',
        quote: '허구가 인류를 협력하게 했다',
        sampleQuestions: ['사피엔스가 지구를 지배한 이유는?', 'AI 시대에 인간의 역할은?', '역사를 통해 현재를 어떻게 읽나요?'],
    },
    {
        id: 'nolan', name: 'Christopher Nolan', nameKo: '크리스토퍼 놀란', icon: '🎥', color: 'blue', category: 'celebrity', subCategory: '문화·예술', description: '인터스텔라·시간과 현실을 뒤트는 감독',
        quote: '관객이 스스로 생각하게',
        sampleQuestions: ['인터스텔라에서 시간을 어떻게 다뤘나요?', '비선형 서사의 매력은 무엇인가요?', '실제 촬영을 고집하는 이유는?'],
    },
    {
        id: 'cameron', name: 'James Cameron', nameKo: '제임스 카메론', icon: '🌊', color: 'teal', category: 'celebrity', subCategory: '문화·예술', description: '아바타·타이타닉·한계를 모르는 탐험가 감독',
        quote: '한계란 두려움이 만든 환상',
        sampleQuestions: ['타이타닉 제작 당시 가장 힘든 점은?', '기술과 스토리텔링의 균형은?', '심해 탐험이 영화에 준 영향은?'],
    },
    {
        id: 'dalio', name: 'Ray Dalio', nameKo: '레이 달리오', icon: '📊', color: 'teal', category: 'celebrity', subCategory: '기업·투자', description: '원칙·거시경제 사이클의 대가',
        quote: '고통 더하기 반성이 성장이다',
        sampleQuestions: ['부채 사이클이란 무엇인가요?', '원칙 기반 의사결정이란?', '경제 위기를 어떻게 예측하나요?'],
    },
    {
        id: 'jensen', name: 'Jensen Huang', nameKo: '젠슨 황', icon: '💚', color: 'emerald', category: 'celebrity', subCategory: '기업·투자', description: '엔비디아 CEO·AI 인프라의 설계자',
        quote: 'AI 공장이 새 산업혁명이다',
        sampleQuestions: ['GPU가 AI 혁명을 가능하게 한 이유는?', '엔비디아의 다음 10년 비전은?', '가속 컴퓨팅이란 무엇인가요?'],
    },
    {
        id: 'zuckerberg', name: 'Mark Zuckerberg', nameKo: '마크 저커버그', icon: '👤', color: 'blue', category: 'celebrity', subCategory: '기업·투자', description: 'Meta 창업자·소셜과 메타버스의 미래',
        quote: '빠르게 움직이고 파괴하라',
        sampleQuestions: ['메타버스가 미래인 이유는?', '소셜 미디어의 사회적 책임은?', '오픈소스 AI 전략의 이유는?'],

    // Region / Culture
    },
    {
        id: 'korean', name: 'Korean', nameKo: '한국인', icon: '🇰🇷', color: 'blue', category: 'region', subCategory: '동아시아', description: '한국 문화·생활 관점',
        quote: '빨리빨리, 그래도 눈치껏',
        sampleQuestions: ['야근 문화, 어떻게 생각해?', '한국 교육열 너무 심한 거 아냐?', '빨리빨리 문화 장단점은?'],
    },
    {
        id: 'japanese', name: 'Japanese', nameKo: '일본인', icon: '🇯🇵', color: 'red', category: 'region', subCategory: '동아시아', description: '일본 문화·생활 관점',
        quote: '空気を読む、それが礼儀',
        sampleQuestions: ['일본의 과로 문화 어떻게 봐?', '혼밥·혼술 문화 외로운 거 아냐?', '일본인은 왜 그렇게 정중해?'],
    },
    {
        id: 'chinese', name: 'Chinese', nameKo: '중국인', icon: '🇨🇳', color: 'red', category: 'region', subCategory: '동아시아', description: '중국 문화·생활 관점',
        quote: '面子가 다 설명한다',
        sampleQuestions: ['중국의 빠른 성장 지속 가능해?', '체면 문화, 삶에 어떤 영향줘?', '중국 젊은이들 꿈이 뭐야?'],
    },
    {
        id: 'american', name: 'American', nameKo: '미국인', icon: '🇺🇸', color: 'blue', category: 'region', subCategory: '아메리카', description: '미국 문화·생활 관점',
        quote: '꿈꾸면 이룰 수 있어',
        sampleQuestions: ['아메리칸 드림 아직 유효해?', '총기 규제 왜 이렇게 어려워?', '미국 의료비 왜 이렇게 비싸?'],
    },
    {
        id: 'british', name: 'British', nameKo: '영국인', icon: '🇬🇧', color: 'purple', category: 'region', subCategory: '유럽', description: '영국 문화·생활 관점',
        quote: '그냥 차 한 잔 하지요',
        sampleQuestions: ['영국 계급 사회 아직도 있어?', 'NHS 진짜 좋은 제도야?', '브렉시트 후회하지 않아?'],
    },
    {
        id: 'german', name: 'German', nameKo: '독일인', icon: '🇩🇪', color: 'amber', category: 'region', subCategory: '유럽', description: '독일 문화·생활 관점',
        quote: 'Feierabend은 신성하다',
        sampleQuestions: ['독일인은 왜 그렇게 규칙을 따라?', '워라밸 독일이 최고라고?', '독일 제조업 쇠퇴 걱정 안 돼?'],
    },
    {
        id: 'french', name: 'French', nameKo: '프랑스인', icon: '🇫🇷', color: 'blue', category: 'region', subCategory: '유럽', description: '프랑스 문화·생활 관점',
        quote: '삶의 예술을 아는 나라',
        sampleQuestions: ['프랑스인은 왜 파업을 자주 해?', '35시간 근무제 진짜 효과 있어?', '프랑스 음식 문화 뭐가 특별해?'],
    },
    {
        id: 'indian', name: 'Indian', nameKo: '인도인', icon: '🇮🇳', color: 'orange', category: 'region', subCategory: '동남아·남아시아', description: '인도 문화·생활 관점',
        quote: '다양성이 곧 인도야',
        sampleQuestions: ['인도 카스트 제도 아직 있어?', '인도 IT 강국 된 비결이 뭐야?', '인도 가족 문화 어떤 특징 있어?'],
    },
    {
        id: 'brazilian', name: 'Brazilian', nameKo: '브라질인', icon: '🇧🇷', color: 'emerald', category: 'region', subCategory: '아메리카', description: '브라질 문화·생활 관점',
        quote: '축구와 삼바가 우리 언어야',
        sampleQuestions: ['브라질 경제 왜 이렇게 불안정해?', '카니발 문화 어떤 의미야?', '브라질 치안 문제 심각해?'],
    },
    {
        id: 'australian', name: 'Australian', nameKo: '호주인', icon: '🇦🇺', color: 'blue', category: 'region', subCategory: '아메리카', description: '호주 문화·생활 관점',
        quote: 'No worries, mate!',
        sampleQuestions: ['호주인은 왜 그렇게 여유로워?', '원주민 문제 어떻게 생각해?', '호주 집값 왜 이렇게 비싸?'],
    },
    {
        id: 'canadian', name: 'Canadian', nameKo: '캐나다인', icon: '🇨🇦', color: 'red', category: 'region', subCategory: '아메리카', description: '캐나다 문화·생활 관점',
        quote: '미안해요, 제가 틀렸나요?',
        sampleQuestions: ['캐나다 다문화주의 진짜 성공했어?', '의료 무상 제공 효율적이야?', '미국이랑 어떻게 달라?'],
    },
    {
        id: 'thai', name: 'Thai', nameKo: '태국인', icon: '🇹🇭', color: 'amber', category: 'region', subCategory: '동남아·남아시아', description: '태국 문화·생활 관점',
        quote: '사바이 사바이, 편안함이 최고',
        sampleQuestions: ['태국인이 화를 안 내는 이유?', '불교가 일상에서 어떤 역할 해?', '태국 왕실 문화 어때?'],
    },
    {
        id: 'vietnamese', name: 'Vietnamese', nameKo: '베트남인', icon: '🇻🇳', color: 'red', category: 'region', subCategory: '동남아·남아시아', description: '베트남 문화·생활 관점',
        quote: '전쟁도 이긴 우리야',
        sampleQuestions: ['베트남 경제성장 비결이 뭐야?', '베트남 커피 문화 뭐가 특별해?', '베트남 젊은이들 꿈은?'],
    },
    {
        id: 'russian', name: 'Russian', nameKo: '러시아인', icon: '🇷🇺', color: 'blue', category: 'region', subCategory: '유럽', description: '러시아 문화·생활 관점',
        quote: '러시아 영혼은 이해 못 해',
        sampleQuestions: ['러시아인은 왜 그렇게 무표정해?', '러시아 문학 왜 위대하다고 해?', '러시아 지정학 어떻게 봐?'],
    },
    {
        id: 'mexican', name: 'Mexican', nameKo: '멕시코인', icon: '🇲🇽', color: 'emerald', category: 'region', subCategory: '아메리카', description: '멕시코 문화·생활 관점',
        quote: '가족과 음식이 전부야',
        sampleQuestions: ['멕시코 마약 카르텔 문제 어때?', '멕시코 음식 왜 그렇게 다양해?', '미국 이민 왜 계속 늘어?'],
    },
    {
        id: 'nigerian', name: 'Nigerian', nameKo: '나이지리아인', icon: '🇳🇬', color: 'emerald', category: 'region', subCategory: '중동·아프리카', description: '나이지리아 문화·생활 관점',
        quote: '아프리카의 거인이 깨어났어',
        sampleQuestions: ['나이지리아 스타트업 왜 뜨고 있어?', '놀리우드 영화 실제로 어때?', '아프리카 미래 낙관적으로 봐?'],
    },
    {
        id: 'italian', name: 'Italian', nameKo: '이탈리아인', icon: '🇮🇹', color: 'emerald', category: 'region', subCategory: '유럽', description: '이탈리아 문화·생활 관점',
        quote: '라 돌체 비타, 달콤한 삶',
        sampleQuestions: ['이탈리아는 왜 경제가 안 좋아?', '음식 자부심 진짜 대단하지?', '마마보이 문화 어떻게 봐?'],
    },
    {
        id: 'spanish', name: 'Spanish', nameKo: '스페인인', icon: '🇪🇸', color: 'red', category: 'region', subCategory: '유럽', description: '스페인 문화·생활 관점',
        quote: '시에스타는 낭비가 아니야',
        sampleQuestions: ['스페인 낮잠 문화 진짜야?', '스페인 실업률 왜 이렇게 높아?', '카탈루냐 독립 어떻게 봐?'],
    },
    {
        id: 'turkish', name: 'Turkish', nameKo: '터키인', icon: '🇹🇷', color: 'red', category: 'region', subCategory: '중동·아프리카', description: '터키 문화·생활 관점',
        quote: '동과 서의 교차로에 서다',
        sampleQuestions: ['터키는 동양이야, 서양이야?', '차이 문화가 일상에서 어때?', '터키 물가 왜 이렇게 올랐어?'],
    },
    {
        id: 'saudi', name: 'Saudi', nameKo: '사우디인', icon: '🇸🇦', color: 'emerald', category: 'region', subCategory: '중동·아프리카', description: '사우디 문화·생활 관점',
        quote: '전통 위에 미래를 짓는다',
        sampleQuestions: ['사우디 비전 2030 진짜 바뀌어?', '이슬람 율법이 일상에 어때?', '여성 권리 얼마나 나아졌어?'],
    },
    {
        id: 'israeli', name: 'Israeli', nameKo: '이스라엘인', icon: '🇮🇱', color: 'blue', category: 'region', subCategory: '중동·아프리카', description: '이스라엘 문화·생활 관점',
        quote: '후츠파 정신으로 살아남는다',
        sampleQuestions: ['이스라엘 스타트업 왜 그렇게 많아?', '팔레스타인 문제 어떻게 봐?', '군 복무 의무가 사회에 어떤 영향?'],
    },
    {
        id: 'filipino', name: 'Filipino', nameKo: '필리핀인', icon: '🇵🇭', color: 'blue', category: 'region', subCategory: '동남아·남아시아', description: '필리핀 문화·생활 관점',
        quote: '바얀코한, 내 나라를 사랑해',
        sampleQuestions: ['필리핀 OFW 문화 어떻게 봐?', '카톨릭이 삶에 얼마나 영향 줘?', '필리핀 영어 능력 비결이 뭐야?'],
    },
    {
        id: 'indonesian', name: 'Indonesian', nameKo: '인도네시아인', icon: '🇮🇩', color: 'red', category: 'region', subCategory: '동남아·남아시아', description: '인도네시아 문화·생활 관점',
        quote: '비네카 퉁갈 이카, 다양 속 하나',
        sampleQuestions: ['1만7천 섬나라 어떻게 하나로?', '이슬람 국가인데 민주주의 가능해?', '자카르타 교통 정말 그렇게 막혀?'],
    },
    {
        id: 'polish', name: 'Polish', nameKo: '폴란드인', icon: '🇵🇱', color: 'red', category: 'region', subCategory: '유럽', description: '폴란드 문화·생활 관점',
        quote: '우린 역사에 지지 않았어',
        sampleQuestions: ['폴란드 경제 성장 비결이 뭐야?', '가톨릭이 사회에 얼마나 영향 줘?', '러시아 위협 어떻게 느껴?'],
    },
    {
        id: 'swedish', name: 'Swedish', nameKo: '스웨덴인', icon: '🇸🇪', color: 'blue', category: 'region', subCategory: '유럽', description: '스웨덴 문화·생활 관점',
        quote: '라곰이 딱 적당해',
        sampleQuestions: ['스웨덴 복지국가 어떻게 유지해?', '라곰 철학 실제로 어떤 삶이야?', '스웨덴 이민 정책 성공했어?'],
    },
    {
        id: 'egyptian', name: 'Egyptian', nameKo: '이집트인', icon: '🇪🇬', color: 'amber', category: 'region', subCategory: '중동·아프리카', description: '이집트 문화·생활 관점',
        quote: '5천년 문명이 내 배경이야',
        sampleQuestions: ['이집트 경제 왜 이렇게 어려워?', '나일강이 이집트에 어떤 의미야?', '아랍의 봄 이후 어떻게 됐어?'],
    },
    {
        id: 'argentinian', name: 'Argentinian', nameKo: '아르헨티나인', icon: '🇦🇷', color: 'blue', category: 'region', subCategory: '아메리카', description: '아르헨티나 문화·생활 관점',
        quote: '탱고처럼 밀고 당기는 삶',
        sampleQuestions: ['아르헨티나 경제 왜 계속 위기야?', '메시가 아르헨티나에서 어떤 의미야?', '탱고 문화 어떻게 생겨났어?'],
    },
    {
        id: 'southafrican', name: 'South African', nameKo: '남아공인', icon: '🇿🇦', color: 'emerald', category: 'region', subCategory: '중동·아프리카', description: '남아공 문화·생활 관점',
        quote: '무지개 나라는 아직 완성 중',
        sampleQuestions: ['아파르트헤이트 상처 아직 남아있어?', '남아공 치안 얼마나 심각해?', '만델라 정신 지금도 살아있어?'],
    },
    {
        id: 'taiwanese', name: 'Taiwanese', nameKo: '대만인', icon: '🇹🇼', color: 'blue', category: 'region', subCategory: '동아시아', description: '대만 문화·생활 관점',
        quote: '작지만 강한 민주주의',
        sampleQuestions: ['대만 독립 문제 어떻게 봐?', '야시장 문화가 왜 특별해?', '반도체 강국 된 비결은?'],
    },
    {
        id: 'singaporean', name: 'Singaporean', nameKo: '싱가포르인', icon: '🇸🇬', color: 'red', category: 'region', subCategory: '동남아·남아시아', description: '싱가포르 문화·생활 관점',
        quote: '효율이 곧 생존이야',
        sampleQuestions: ['싱가포르 벌금 문화 너무 심한 거 아냐?', '다인종 공존 진짜 성공했어?', '싱가포르 집값 어떻게 감당해?'],
    },
    {
        id: 'malaysian', name: 'Malaysian', nameKo: '말레이시아인', icon: '🇲🇾', color: 'amber', category: 'region', subCategory: '동남아·남아시아', description: '말레이시아 문화·생활 관점',
        quote: '말레이시아, 진짜 아시아!',
        sampleQuestions: ['말레이시아 3개 민족 어떻게 공존해?', '부미푸트라 정책 공평해?', '쿠알라룸푸르 삶이 어때?'],
    },
    {
        id: 'dutch', name: 'Dutch', nameKo: '네덜란드인', icon: '🇳🇱', color: 'orange', category: 'region', subCategory: '유럽', description: '네덜란드 문화·생활 관점',
        quote: '직설이 최고의 예의야',
        sampleQuestions: ['네덜란드인은 왜 그렇게 직설적이야?', '자전거 문화 어떻게 정착됐어?', '마약 합법화 어떻게 봐?'],
    },
    {
        id: 'swiss', name: 'Swiss', nameKo: '스위스인', icon: '🇨🇭', color: 'red', category: 'region', subCategory: '유럽', description: '스위스 문화·생활 관점',
        quote: '정확함이 우리 서명이야',
        sampleQuestions: ['스위스 중립 정책 언제까지 가능해?', '4개 언어로 나라가 어떻게 돌아가?', '스위스 시계·은행 왜 유명해?'],
    },
    {
        id: 'norwegian', name: 'Norwegian', nameKo: '노르웨이인', icon: '🇳🇴', color: 'blue', category: 'region', subCategory: '유럽', description: '노르웨이 문화·생활 관점',
        quote: '자연 속에 답이 있어',
        sampleQuestions: ['노르웨이 오일펀드 어떻게 관리해?', '프릴루프츠리브 철학이 뭐야?', '극야·백야 어떻게 적응해?'],
    },
    {
        id: 'colombian', name: 'Colombian', nameKo: '콜롬비아인', icon: '🇨🇴', color: 'amber', category: 'region', subCategory: '아메리카', description: '콜롬비아 문화·생활 관점',
        quote: '우린 마약보다 커피야',
        sampleQuestions: ['콜롬비아 이미지 어떻게 바뀌었어?', '살사 문화가 삶에서 어떤 의미야?', '커피 나라 자부심 어때?'],
    },
    {
        id: 'chilean', name: 'Chilean', nameKo: '칠레인', icon: '🇨🇱', color: 'red', category: 'region', subCategory: '아메리카', description: '칠레 문화·생활 관점',
        quote: '파타고니아만큼 강인해',
        sampleQuestions: ['칠레 와인 정말 그렇게 뛰어나?', '칠레 사회운동 왜 폭발했어?', '안데스 산맥이 삶에 어떤 영향?'],
    },
    {
        id: 'iranian', name: 'Iranian', nameKo: '이란인', icon: '🇮🇷', color: 'emerald', category: 'region', subCategory: '중동·아프리카', description: '이란 문화·생활 관점',
        quote: '페르시아는 이슬람 이전부터',
        sampleQuestions: ['이란 젊은이들 진짜 원하는 게 뭐야?', '타아로프 문화 어떤 거야?', '이란 제재 일상에 어떤 영향?'],
    },
    {
        id: 'emirati', name: 'Emirati', nameKo: 'UAE인', icon: '🇦🇪', color: 'amber', category: 'region', subCategory: '중동·아프리카', description: 'UAE 문화·생활 관점',
        quote: '사막 위에 미래를 세웠어',
        sampleQuestions: ['두바이 발전 지속 가능해?', '외국인 90%인 나라 어떤 느낌이야?', '이슬람 전통이 현대화와 어떻게 공존?'],
    },
    {
        id: 'pakistani', name: 'Pakistani', nameKo: '파키스탄인', icon: '🇵🇰', color: 'emerald', category: 'region', subCategory: '동남아·남아시아', description: '파키스탄 문화·생활 관점',
        quote: '크리켓이 우리를 하나로 해',
        sampleQuestions: ['파키스탄 정치 왜 이렇게 불안해?', '인도와 관계 어떻게 봐?', '크리켓이 사회에 어떤 의미야?'],
    },
    {
        id: 'bangladeshi', name: 'Bangladeshi', nameKo: '방글라데시인', icon: '🇧🇩', color: 'emerald', category: 'region', subCategory: '동남아·남아시아', description: '방글라데시 문화·생활 관점',
        quote: '강의 나라, 회복의 나라',
        sampleQuestions: ['방글라데시 의류산업 어떻게 봐?', '기후 변화가 가장 두려운 나라야?', '독립 투쟁 역사 어떤 의미야?'],
    },
    {
        id: 'newzealander', name: 'New Zealander', nameKo: '뉴질랜드인', icon: '🇳🇿', color: 'blue', category: 'region', subCategory: '아메리카', description: '뉴질랜드 문화·생활 관점',
        quote: '마오리 문화가 우리 뿌리야',
        sampleQuestions: ['마오리 문화 진짜 일상에 녹아있어?', '뉴질랜드 환경 보전 어떻게 해?', '럭비가 국민 종교라고?'],
    },
    {
        id: 'irish', name: 'Irish', nameKo: '아일랜드인', icon: '🇮🇪', color: 'emerald', category: 'region', subCategory: '유럽', description: '아일랜드 문화·생활 관점',
        quote: '펍에서 역사가 만들어져',
        sampleQuestions: ['아일랜드 문학이 왜 그렇게 유명해?', '영국과의 관계 어떻게 봐?', '테크 허브로 변신한 비결은?'],
    },
    {
        id: 'greek', name: 'Greek', nameKo: '그리스인', icon: '🇬🇷', color: 'blue', category: 'region', subCategory: '유럽', description: '그리스 문화·생활 관점',
        quote: '철학은 우리 발명이야',
        sampleQuestions: ['그리스 경제 위기 어떻게 버텼어?', '필로티모가 뭐야?', '고대 유산이 삶에 어떤 영향?'],
    },
    {
        id: 'czech', name: 'Czech', nameKo: '체코인', icon: '🇨🇿', color: 'red', category: 'region', subCategory: '유럽', description: '체코 문화·생활 관점',
        quote: '맥주 한 잔에 진심이야',
        sampleQuestions: ['체코 맥주 문화 왜 그렇게 독특해?', '공산주의 이후 체코 어떻게 변했어?', '프라하 관광화 어떻게 봐?'],
    // 문화권
    },
    {
        id: 'eastasian-culture', name: 'East Asian Culture', nameKo: '동아시아 문화권', icon: '🏯', color: 'amber', category: 'region', subCategory: '문화권', description: '교육·가족·예의·집단 조화 중심',
        quote: '조화가 모든 것의 기반이야',
        sampleQuestions: ['동아시아 교육열 어디서 왔어?', '집단주의 vs 개인주의 어떻게 봐?', '유교 가치관 아직도 유효해?'],
    },
    {
        id: 'middleeast-culture', name: 'Middle East Culture', nameKo: '중동 문화권', icon: '🏜️', color: 'emerald', category: 'region', subCategory: '문화권', description: '환대·공동체·전통 중심',
        quote: '손님은 신이 보낸 사람이야',
        sampleQuestions: ['이슬람이 정치와 어떻게 연결돼?', '중동 환대 문화 어떤 거야?', '중동 여성 권리 어떻게 변하고 있어?'],
    },
    {
        id: 'western', name: 'Western Culture', nameKo: '서양 문화권', icon: '🏛️', color: 'blue', category: 'region', subCategory: '문화권', description: '개인주의·자유·민주주의 중심',
        quote: '개인의 자유가 먼저야',
        sampleQuestions: ['서양 개인주의 장단점이 뭐야?', '민주주의 위기 어떻게 봐?', '서양 문화 패권 지속될까?'],
    },
    {
        id: 'latin', name: 'Latin Culture', nameKo: '라틴 문화권', icon: '💃', color: 'red', category: 'region', subCategory: '문화권', description: '정열·가족·축제 문화 중심',
        quote: '지금 이 순간을 살아야 해',
        sampleQuestions: ['라틴 문화의 열정 어디서 나와?', '가족 중심 문화 장단점은?', '라틴아메리카 불평등 어떻게 봐?'],
    },
    {
        id: 'nordic', name: 'Nordic Culture', nameKo: '북유럽 문화권', icon: '❄️', color: 'teal', category: 'region', subCategory: '문화권', description: '복지·평등·자연 중심',
        quote: '휘게, 작은 것에서 행복을',
        sampleQuestions: ['북유럽 복지 모델 다른 나라도 가능해?', '휘게·라곰 철학 실제 어떤 삶이야?', '극야 어떻게 정신 건강 지켜?'],
    },
    {
        id: 'african', name: 'African Culture', nameKo: '아프리카 문화권', icon: '🌍', color: 'orange', category: 'region', subCategory: '문화권', description: '우분투·공동체·구전 전통 중심',
        quote: '우분투, 나는 우리이기에 있다',
        sampleQuestions: ['우분투 철학 실제로 어떻게 살아있어?', '아프리카 청년들 미래 어떻게 봐?', '식민 유산 아직 영향 줘?'],
    },
    {
        id: 'southeast-asian-culture', name: 'Southeast Asian Culture', nameKo: '동남아시아 문화권', icon: '🌴', color: 'emerald', category: 'region', subCategory: '문화권', description: '다양성·조화·열대 생활 중심',
        quote: '다양함이 우리 정체성이야',
        sampleQuestions: ['동남아 종교 다양성 어떻게 공존해?', '아세안 협력 실제 효과 있어?', '동남아 급성장 지속될까?'],
    },
    {
        id: 'southamerican-culture', name: 'South American Culture', nameKo: '남미 문화권', icon: '🎭', color: 'amber', category: 'region', subCategory: '문화권', description: '열정·다양성·자연·공동체 중심',
        quote: '자연이 우리 영토이자 정체성',
        sampleQuestions: ['남미 불평등 어떻게 해결해?', '아마존 개발 vs 보전 어떻게 봐?', '남미 좌파 부상 어떻게 봐?'],

    // Ideology (17개)
    },
    {
        id: 'libertarian', name: 'Liberalism', nameKo: '자유주의', icon: '🗽', avatarUrl: '/logos/ideology/libertarian.png', color: 'amber', category: 'ideology', description: '개인의 자유·권리 최우선',
        quote: '자유는 타협 대상이 아니다',
        sampleQuestions: ['표현의 자유엔 한계가 있나?', '국가 개입은 어디까지 정당?', '개인 권리 vs 공공이익 균형은?'],
    },
    {
        id: 'conservative', name: 'Conservatism', nameKo: '보수주의', icon: '🏰', avatarUrl: '/logos/ideology/conservative.png', color: 'orange', category: 'ideology', description: '전통·안정·점진적 변화',
        quote: '검증된 것을 함부로 버리지 말라',
        sampleQuestions: ['급격한 개혁은 왜 위험한가?', '전통이 지켜야 할 가치는?', '변화와 안정 사이 균형점은?'],
    },
    {
        id: 'progressive', name: 'Progressivism', nameKo: '진보주의', icon: '🔄', avatarUrl: '/logos/ideology/progressive.png', color: 'emerald', category: 'ideology', description: '개혁·사회변화·평등 추구',
        quote: '더 나은 세상은 설계할 수 있다',
        sampleQuestions: ['구조적 불평등을 어떻게 해결?', '환경과 성장은 공존 가능?', '사회 변화의 올바른 속도는?'],
    },
    {
        id: 'socialist', name: 'Socialism', nameKo: '사회주의', icon: '✊', avatarUrl: '/logos/ideology/socialist.png', color: 'red', category: 'ideology', description: '평등·공공복지·노동자 권리',
        quote: '노동이 자본보다 먼저다',
        sampleQuestions: ['공공 소유가 더 효율적일까?', '노동자 권리 어디까지 보장?', '복지국가의 한계는 무엇인가?'],
    },
    {
        id: 'communist', name: 'Communism', nameKo: '공산주의', icon: '☭', avatarUrl: '/logos/ideology/communist.svg', color: 'red', category: 'ideology', description: '생산수단 공유·계급 철폐',
        quote: '계급이 사라져야 자유가 온다',
        sampleQuestions: ['계급 없는 사회는 가능한가?', '자본주의 모순은 무엇인가?', '혁명 없이 변화가 가능할까?'],
    },
    {
        id: 'democrat', name: 'Democracy', nameKo: '민주주의', icon: '🗳️', avatarUrl: '/logos/ideology/democrat.png', color: 'blue', category: 'ideology', description: '국민 주권·다수결·참여',
        quote: '권력은 국민에게서 나온다',
        sampleQuestions: ['민주주의는 왜 느린가?', '다수결의 한계는 무엇인가?', '시민 참여는 어떻게 높이나?'],
    },
    {
        id: 'capitalist', name: 'Capitalism', nameKo: '자본주의', icon: '💰', avatarUrl: '/logos/ideology/capitalist.png', color: 'blue', category: 'ideology', description: '자유시장·경쟁·사유재산',
        quote: '시장이 가장 효율적인 조율자다',
        sampleQuestions: ['자유시장은 불평등을 낳는가?', '규제는 얼마나 필요한가?', '성장과 분배 어느 게 먼저?'],
    },
    {
        id: 'nationalist', name: 'Nationalism', nameKo: '민족주의', icon: '🗻', avatarUrl: '/logos/ideology/nationalist.png', color: 'purple', category: 'ideology', description: '국가·민족 이익 최우선',
        quote: '우리 민족이 우선이다',
        sampleQuestions: ['세계화와 민족주의 충돌은?', '국가 정체성은 지켜야 하나?', '이민 문제를 어떻게 볼까?'],
    },
    {
        id: 'anarchist', name: 'Anarchism', nameKo: '무정부주의', icon: '🔥', avatarUrl: '/logos/ideology/anarchist.png', color: 'pink', category: 'ideology', description: '국가·권위 자체를 부정',
        quote: '국가 없이도 질서는 가능하다',
        sampleQuestions: ['국가가 없으면 어떻게 될까?', '자발적 협력이 가능한가?', '권위는 항상 나쁜 것인가?'],
    },
    {
        id: 'neoliberal', name: 'Neoliberalism', nameKo: '신자유주의', icon: '📈', avatarUrl: '/logos/ideology/neoliberal.png', color: 'blue', category: 'ideology', description: '시장 자유화·민영화·규제 완화',
        quote: '시장을 풀면 경제가 산다',
        sampleQuestions: ['민영화는 효율적인가?', '규제 완화의 득과 실은?', '자유무역이 일자리를 빼앗나?'],
    },
    {
        id: 'totalitarian', name: 'Totalitarianism', nameKo: '전체주의', icon: '⛓️', avatarUrl: '/logos/ideology/totalitarian.png', color: 'red', category: 'ideology', description: '국가 권력의 전면적 통제',
        quote: '질서는 통제에서 나온다',
        sampleQuestions: ['강력한 국가 통제는 필요한가?', '개인 자유와 국가 안보 균형?', '전체주의는 왜 실패하나?'],
    },
    {
        id: 'pragmatist_i', name: 'Pragmatism', nameKo: '실용주의', icon: '🔧', avatarUrl: '/logos/ideology/pragmatist_i.png', color: 'blue', category: 'ideology', description: '결과 중심·이념 초월',
        quote: '되는 것이 옳은 것이다',
        sampleQuestions: ['이념보다 결과가 중요한가?', '타협은 약함인가 지혜인가?', '이상과 현실의 간극은?'],
    },
    {
        id: 'humanist', name: 'Humanism', nameKo: '인본주의', icon: '🌍', avatarUrl: '/logos/ideology/humanist.png', color: 'teal', category: 'ideology', description: '인간 존엄·이성·윤리 중심',
        quote: '인간이 모든 것의 척도다',
        sampleQuestions: ['인간 존엄이란 무엇인가?', 'AI 시대에 인본주의 역할은?', '이성만으로 윤리가 충분한가?'],
    },
    {
        id: 'utilitarian', name: 'Utilitarianism', nameKo: '공리주의', icon: '⚖️', avatarUrl: '/logos/ideology/utilitarian.png', color: 'emerald', category: 'ideology', description: '최대 다수의 최대 행복',
        quote: '최대 다수의 최대 행복',
        sampleQuestions: ['결과만 좋으면 수단은 정당?', '소수 희생을 어떻게 정당화?', '행복은 어떻게 측정하나?'],
    },
    {
        id: 'populist', name: 'Populism', nameKo: '포퓰리즘', icon: '📣', avatarUrl: '/logos/ideology/populist.png', color: 'orange', category: 'ideology', description: '대중의 목소리·엘리트 비판',
        quote: '엘리트가 아닌 민중이 주인이다',
        sampleQuestions: ['엘리트는 왜 믿을 수 없나?', '포퓰리즘과 민주주의 차이는?', '전문가 의견을 무시해야 하나?'],
    },
    {
        id: 'pacifist', name: 'Pacifism', nameKo: '평화주의', icon: '☮️', avatarUrl: '/logos/ideology/pacifist.png', color: 'emerald', category: 'ideology', description: '비폭력·평화적 해결 추구',
        quote: '폭력으로 평화는 오지 않는다',
        sampleQuestions: ['전쟁이 불가피한 경우도 있나?', '비폭력은 현실적인가?', '억압에 맞서는 평화적 방법은?'],

    // 철학 사조 (먼저)
    },
    {
        id: 'stoicism', name: 'Stoicism', nameKo: '스토아주의', icon: '🏛️', color: 'blue', category: 'religion', description: '감정 통제·운명 수용·내면의 힘',
        quote: '통제할 수 있는 것에 집중하라',
        sampleQuestions: ['불안을 어떻게 다스려야 할까?', '운명에 저항해야 하나 수용해야?', '덕이 진정한 행복의 길인가?'],
    },
    {
        id: 'existentialism', name: 'Existentialism', nameKo: '실존주의', icon: '🚶', color: 'purple', category: 'religion', description: '존재가 본질에 앞선다·의미는 스스로',
        quote: '의미는 주어지는 게 아니라 만드는 것',
        sampleQuestions: ['삶의 의미를 어디서 찾는가?', '자유는 축복인가 저주인가?', '죽음 앞에서 어떻게 살아야?'],
    },
    {
        id: 'nihilism', name: 'Nihilism', nameKo: '허무주의', icon: '🕳️', color: 'red', category: 'religion', description: '본질적 의미는 없다·모든 가치의 해체',
        quote: '모든 의미는 인간이 만든 허구다',
        sampleQuestions: ['삶에 의미가 없다면 어떻게 살까?', '도덕의 근거는 존재하는가?', '허무주의는 삶을 파괴하는가?'],
    },
    {
        id: 'hedonism', name: 'Hedonism', nameKo: '쾌락주의', icon: '🍷', color: 'pink', category: 'religion', description: '즐거움이 최고선·에피쿠로스의 지혜',
        quote: '즐거움이 선한 삶의 척도다',
        sampleQuestions: ['쾌락이 삶의 목적이 될 수 있나?', '고통 회피와 쾌락 추구 차이?', '에피쿠로스의 행복론은 무엇?'],
    },
    {
        id: 'skepticism', name: 'Skepticism', nameKo: '회의주의', icon: '🧐', color: 'teal', category: 'religion', description: '모든 주장을 의심·증거를 요구',
        quote: '어떻게 그것을 아는가?',
        sampleQuestions: ['확실한 지식이 존재하는가?', '의심이 진리에 도달하는 법은?', '믿음과 증거의 경계는?'],
    },
    {
        id: 'rationalism', name: 'Rationalism', nameKo: '합리주의', icon: '🧠', color: 'blue', category: 'religion', description: '이성만으로 진리에 도달·데카르트',
        quote: '나는 생각한다, 고로 나는 존재한다',
        sampleQuestions: ['이성만으로 진리 알 수 있나?', '경험 없이 알 수 있는 것은?', '수학적 진리는 왜 절대적인가?'],
    },
    {
        id: 'empiricism', name: 'Empiricism', nameKo: '경험주의', icon: '👁️', color: 'orange', category: 'religion', description: '경험만이 지식의 원천·로크·흄',
        quote: '백지에 경험이 지식을 쓴다',
        sampleQuestions: ['경험 없는 지식이 가능한가?', '귀납법의 한계는 무엇인가?', '감각을 완전히 신뢰할 수 있나?'],
    },
    {
        id: 'pessimism-phil', name: 'Pessimism', nameKo: '염세주의', icon: '🌑', color: 'purple', category: 'religion', description: '세상은 본질적으로 고통·쇼펜하우어',
        quote: '삶은 욕망이 만든 고통이다',
        sampleQuestions: ['왜 존재하는 것보다 없는 게 나을까?', '욕망을 끊는 것이 답인가?', '비관주의는 허무주의와 다른가?'],
    },
    {
        id: 'relativism', name: 'Relativism', nameKo: '상대주의', icon: '🔄', color: 'pink', category: 'religion', description: '절대적 진리는 없다·관점에 따라 다르다',
        quote: '절대적 진리는 없다',
        sampleQuestions: ['도덕은 문화마다 다른가?', '상대주의는 허무주의를 낳나?', '모든 관점이 동등한가?'],
    },
    {
        id: 'determinism', name: 'Determinism', nameKo: '결정론', icon: '⚙️', color: 'teal', category: 'religion', description: '모든 것은 이미 정해져 있다·자유의지는 환상',
        quote: '자유의지는 인과의 환상이다',
        sampleQuestions: ['자유의지는 존재하는가?', '결정론이 사실이면 책임이 있나?', '운명론과 결정론은 같은가?'],
    },
    {
        id: 'idealism-phil', name: 'Idealism', nameKo: '관념론', icon: '💭', color: 'purple', category: 'religion', description: '정신과 관념이 현실의 본질·헤겔',
        quote: '정신이 현실을 만든다',
        sampleQuestions: ['물질 없이 마음만 존재할 수 있나?', '헤겔 변증법이란 무엇인가?', '역사는 정신의 자기 전개인가?'],
    },
    {
        id: 'materialism-phil', name: 'Materialism', nameKo: '유물론', icon: '⚛️', color: 'red', category: 'religion', description: '물질이 전부·의식도 물질의 산물',
        quote: '의식도 물질의 산물이다',
        sampleQuestions: ['영혼은 존재하는가?', '의식은 뇌에서 완전히 설명되나?', '자유의지와 물질주의는 공존?'],
    },
    {
        id: 'cynicism', name: 'Cynicism', nameKo: '견유주의', icon: '🏺', color: 'amber', category: 'religion', description: '사회의 허위를 벗겨라·디오게네스',
        quote: '사회의 허위를 벗겨라',
        sampleQuestions: ['문명의 관습은 진짜 필요한가?', '자연스러운 삶이란 무엇인가?', '디오게네스처럼 살 수 있을까?'],
    },
    {
        id: 'postmodernism', name: 'Postmodernism', nameKo: '포스트모더니즘', icon: '🪞', color: 'pink', category: 'religion', description: '거대 서사의 종말·모든 것을 해체',
        quote: '거대 서사는 이미 끝났다',
        sampleQuestions: ['객관적 진리가 존재하는가?', '텍스트의 의미는 고정되나?', '포스트모던이 허무주의인가?'],
    },
    {
        id: 'asceticism', name: 'Asceticism', nameKo: '금욕주의', icon: '🧘', color: 'teal', category: 'religion', description: '절제가 도·욕망을 다스리는 삶',
        quote: '욕망을 다스리는 자가 자유롭다',
        sampleQuestions: ['욕망을 끊는 것이 가능한가?', '절제가 왜 자유를 주는가?', '고행과 절제는 어떻게 다른가?'],

    // 종교
    },
    {
        id: 'buddhist', name: 'Buddhist', nameKo: '불교', icon: '☸️', avatarUrl: '/logos/religion/buddhism.svg', color: 'amber', category: 'religion', description: '무상·자비·중도의 지혜',
        quote: '일체유심조',
        sampleQuestions: ['고통에서 벗어나는 방법은?', '무상을 어떻게 받아들여야?', '자비는 어떻게 실천하나?'],
    },
    {
        id: 'christian', name: 'Christian', nameKo: '기독교', icon: '✝️', avatarUrl: '/logos/religion/christianity.svg', color: 'blue', category: 'religion', description: '사랑·은혜·구원의 윤리',
        quote: '네 이웃을 네 몸같이 사랑하라',
        sampleQuestions: ['이웃 사랑을 어떻게 실천?', '고통 속에서 믿음을 지키는 법?', '은혜와 행위 중 무엇이 구원?'],
    },
    {
        id: 'catholic', name: 'Catholic', nameKo: '가톨릭', icon: '🙏', avatarUrl: '/logos/religion/catholic.svg', color: 'purple', category: 'religion', description: '전통·사회 교리·공동선',
        quote: '평화를 빕니다',
        sampleQuestions: ['가톨릭 사회 교리란 무엇인가?', '전통과 현대의 갈등을 어떻게?', '생명 윤리의 가톨릭 관점은?'],
    },
    {
        id: 'islamic', name: 'Islamic', nameKo: '이슬람', icon: '☪️', avatarUrl: '/logos/religion/islam.svg', color: 'emerald', category: 'religion', description: '율법·정의·공동체의 윤리',
        quote: '자비롭고 자애로운 신의 이름으로',
        sampleQuestions: ['이슬람의 사회 정의관은?', '샤리아는 현대에 적용 가능?', '이슬람과 민주주의는 공존?'],
    },
    {
        id: 'confucian', name: 'Confucian', nameKo: '유교', icon: '📜', avatarUrl: '/logos/religion/confucianism.svg', color: 'teal', category: 'religion', description: '덕목·인륜·예의 질서',
        quote: '己所不欲 勿施於人',
        sampleQuestions: ['효도는 현대에도 유효한가?', '군자란 어떤 사람인가?', '예(禮)가 왜 중요한가?'],
    },
    {
        id: 'atheist', name: 'Atheist', nameKo: '무신론', icon: '🧪', avatarUrl: '/logos/religion/atheism.svg', color: 'orange', category: 'religion', description: '종교 없이 이성·과학 중심',
        quote: '신 없이도 선할 수 있다',
        sampleQuestions: ['도덕의 근거가 신이어야 하나?', '종교 없는 삶의 의미는?', '과학이 종교를 대체할 수 있나?'],
    },
    {
        id: 'agnostic', name: 'Agnostic', nameKo: '불가지론', icon: '🤔', avatarUrl: '/logos/religion/agnostic.svg', color: 'pink', category: 'religion', description: '확실성 유보·열린 탐구',
        quote: '모른다는 것도 지혜다',
        sampleQuestions: ['신의 존재를 알 수 있는가?', '불확실성 속에서 어떻게 살까?', '불가지론과 무신론의 차이는?'],
    },
    {
        id: 'hindu', name: 'Hindu', nameKo: '힌두교', icon: '🕉️', avatarUrl: '/logos/religion/hinduism.svg', color: 'orange', category: 'religion', description: '힌두 철학·업·윤회',
        quote: '행위의 결과에 집착 말라',
        sampleQuestions: ['카르마는 어떻게 작동하나?', '다르마란 무엇인가?', '윤회에서 해탈하는 방법은?'],
    },
    {
        id: 'jewish', name: 'Jewish', nameKo: '유대교', icon: '✡️', avatarUrl: '/logos/religion/judaism.svg', color: 'blue', category: 'religion', description: '유대 율법·지혜 전통',
        quote: '정의를, 오직 정의를 따르라',
        sampleQuestions: ['토라의 핵심 가르침은 무엇?', '탈무드식 논쟁법이란?', '유대교의 정의 개념은?'],
    },
    {
        id: 'protestant', name: 'Protestant', nameKo: '개신교', icon: '📖', avatarUrl: '/logos/religion/protestant.svg', color: 'teal', category: 'religion', description: '개신교 신앙·개인 구원',
        quote: '오직 믿음, 오직 은혜',
        sampleQuestions: ['개인 구원과 사회 책임은?', '성경을 어떻게 해석해야?', '종교개혁이 세상을 바꾼 방식은?'],
    },
    {
        id: 'orthodox', name: 'Orthodox Christian', nameKo: '정교회', icon: '☦️', avatarUrl: '/logos/religion/orthodox.svg', color: 'amber', category: 'religion', description: '동방정교회 전통',
        quote: '빛이 어둠에 비치니',
        sampleQuestions: ['테오시스(신성화)란 무엇인가?', '동방과 서방 기독교의 차이?', '전례가 왜 그렇게 중요한가?'],
    },
    {
        id: 'sikh', name: 'Sikh', nameKo: '시크교', icon: '🪯', avatarUrl: '/logos/religion/sikh.svg', color: 'orange', category: 'religion', description: '시크교 평등·봉사 정신',
        quote: '하나의 신, 하나의 인류',
        sampleQuestions: ['와헤구루 신앙이란 무엇인가?', '란가르(무료 식사)의 의미는?', '시크교의 평등 사상은?'],
    },
    {
        id: 'taoist', name: 'Taoist', nameKo: '도교', icon: '☯️', avatarUrl: '/logos/religion/taoism.svg', color: 'teal', category: 'religion', description: '도교 무위자연·조화',
        quote: '도를 도라 하면 도가 아니다',
        sampleQuestions: ['무위자연이란 어떤 의미인가?', '도(道)를 어떻게 따를 수 있나?', '음양의 균형이란 무엇인가?'],
    },
    {
        id: 'shinto', name: 'Shinto', nameKo: '신도', icon: '⛩️', avatarUrl: '/logos/religion/shinto.svg', color: 'red', category: 'religion', description: '일본 신도 자연숭배',
        quote: '만물에 신이 깃들어 있다',
        sampleQuestions: ['가미(神)란 무엇인가?', '신도와 일본 문화의 관계는?', '자연 숭배가 현대에 주는 의미?'],

    // Lifestyle — 삶 스타일
    },
    {
        id: 'minimalist', name: 'Minimalist', nameKo: '미니멀리스트', icon: '🪴', color: 'teal', category: 'lifestyle', description: '소유 최소화·본질에 집중',
        quote: '적을수록 더 많아진다',
        sampleQuestions: ['꼭 필요한 것만 남기면?', '소비 줄이는 첫 단계는?', '미니멀리즘과 행복의 관계'],
    },
    {
        id: 'workaholic', name: 'Workaholic', nameKo: '워커홀릭', icon: '⏰', color: 'blue', category: 'lifestyle', description: '일이 삶의 중심',
        quote: '일이 곧 나다',
        sampleQuestions: ['번아웃 없이 오래 일하려면?', '일 중독과 열정의 차이는?', '성과를 극대화하는 습관은?'],
    },
    {
        id: 'nomad', name: 'Digital Nomad', nameKo: '디지털 노마드', icon: '🌴', color: 'emerald', category: 'lifestyle', description: '원격근무·자유로운 이동',
        quote: '세상이 내 사무실이다',
        sampleQuestions: ['원격근무 시작하는 법은?', '해외 체류와 세금 문제는?', '노마드의 가장 큰 도전은?'],
    },
    {
        id: 'work-life', name: 'Work-Life Balance', nameKo: '워라밸 추구자', icon: '⚖️', color: 'pink', category: 'lifestyle', description: '일과 삶의 균형',
        quote: '퇴근 후가 진짜 삶이다',
        sampleQuestions: ['야근 거절하는 법은?', '일과 삶 균형 찾는 팁은?', '번아웃 예방 전략은?'],
    },
    {
        id: 'fire', name: 'FIRE', nameKo: '파이어족', icon: '🔥', color: 'amber', category: 'lifestyle', description: '조기 은퇴·경제적 자유 추구',
        quote: '돈이 일하게 한다',
        sampleQuestions: ['파이어 달성 현실적인가?', '저축률 높이는 핵심 전략은?', '조기 은퇴 후 무엇을 하나?'],
    },
    {
        id: 'frugal', name: 'Frugalist', nameKo: '절약주의자', icon: '🐷', color: 'purple', category: 'lifestyle', description: '검소함·낭비 없는 삶',
        quote: '안 쓴 돈이 제일 좋다',
        sampleQuestions: ['생활비 줄이는 첫 단계는?', '절약과 인색함의 차이는?', '무지출 챌린지 현실적인가?'],
    },
    {
        id: 'slow-living', name: 'Slow Living', nameKo: '슬로우 라이프', icon: '🐌', color: 'teal', category: 'lifestyle', description: '느리게·여유롭게·소확행',
        quote: '천천히가 제대로다',
        sampleQuestions: ['빠른 세상서 느리게 사는 법?', '소확행이란 무엇인가?', '속도 줄이면 잃는 것은?'],
    },
    {
        id: 'pet-lover', name: 'Pet Lover', nameKo: '반려동물인', icon: '🐕', color: 'orange', category: 'lifestyle', description: '반려동물 중심 생활',
        quote: '얘가 제 가족이에요',
        sampleQuestions: ['반려동물 입양 전 준비사항?', '펫 비용 얼마나 드나요?', '반려동물이 삶을 바꾼다?'],
    },
    {
        id: 'homebody', name: 'Homebody', nameKo: '집순이/집돌이', icon: '🛋️', color: 'amber', category: 'lifestyle', description: '집에서 모든 것을 해결',
        quote: '집이 최고의 공간이다',
        sampleQuestions: ['집에서 즐기는 최고의 취미는?', '홈오피스 세팅 어떻게 해?', '외출 안 해도 삶이 풍요롭다?'],
    // 생애주기·가족
    },
    {
        id: 'highschool', name: 'High Schooler', nameKo: '고등학생', icon: '📝', color: 'blue', category: 'lifestyle', description: '입시·학교생활·진로 고민',
        quote: '대학이 전부는 아니지',
        sampleQuestions: ['공부 의욕 어떻게 올려요?', '수능과 수시 어느 쪽이 나아?', '진로 모르면 어떻게 해요?'],
    },
    {
        id: 'student', name: 'Student', nameKo: '대학생', icon: '🎓', color: 'blue', category: 'lifestyle', description: '학업·취업·청춘의 고민',
        quote: '청춘은 혼돈 속에 있다',
        sampleQuestions: ['취업 스펙 어떻게 쌓아요?', '대학 생활 가장 중요한 것은?', '학점 vs 경험 어느 쪽이 나아?'],
    },
    {
        id: 'newbie-worker', name: 'New Worker', nameKo: '사회초년생', icon: '👔', color: 'teal', category: 'lifestyle', description: '첫 직장·사회생활 적응기',
        quote: '현실은 학교와 달랐다',
        sampleQuestions: ['첫 월급 어떻게 관리해요?', '직장 상사와 갈등 어떡해?', '사회생활 가장 힘든 점은?'],
    },
    {
        id: 'solo', name: 'Solo Living', nameKo: '1인가구', icon: '🏠', color: 'amber', category: 'lifestyle', description: '혼자 사는 삶·독립생활',
        quote: '혼자도 충분히 괜찮다',
        sampleQuestions: ['1인가구 생활비 얼마나 들어?', '혼밥 혼술 외롭지 않아요?', '혼자 살면 좋은 점은?'],
    },
    {
        id: 'newlywed', name: 'Newlywed', nameKo: '신혼부부', icon: '💍', color: 'pink', category: 'lifestyle', description: '결혼 초기·살림·관계 적응',
        quote: '같이 사는 건 달랐다',
        sampleQuestions: ['신혼 갈등 어떻게 극복해?', '살림 분담 어떻게 해요?', '결혼 후 돈 관리 방법은?'],
    },
    {
        id: 'parent', name: 'Parent', nameKo: '학부모', icon: '👨‍👩‍👧', color: 'pink', category: 'lifestyle', description: '육아·교육·가정 중심',
        quote: '아이가 행복이자 걱정이다',
        sampleQuestions: ['사교육 얼마나 시켜야 해?', '아이 스크린타임 어떻게 관리?', '부모와 자녀 대화법은?'],
    },
    {
        id: 'dual-income', name: 'Dual Income', nameKo: '맞벌이 부부', icon: '👫', color: 'teal', category: 'lifestyle', description: '둘 다 일하는 가정의 현실',
        quote: '둘 다 일하면 두 배 바쁘다',
        sampleQuestions: ['육아와 직장 어떻게 병행해요?', '맞벌이 집안일 분담 방법은?', '어린이집 vs 육아도우미?'],
    },
    {
        id: 'middle-aged', name: 'Middle Aged', nameKo: '중년', icon: '🧑‍💼', color: 'orange', category: 'lifestyle', description: '경력·건강·가족 사이 균형',
        quote: '전반전과 후반전 사이다',
        sampleQuestions: ['중년 건강 관리 어떻게 해요?', '경력 전환 늦지 않았을까요?', '노후 준비 얼마나 했어요?'],
    },
    {
        id: 'retiree', name: 'Retiree', nameKo: '은퇴자', icon: '🏖️', color: 'amber', category: 'lifestyle', description: '은퇴 후 삶·연금·건강',
        quote: '제2의 인생이 시작됐다',
        sampleQuestions: ['은퇴 후 무엇을 하며 살아요?', '연금만으로 생활 가능한가요?', '은퇴 후 가장 힘든 점은?'],

    // Fictional Characters — 서양 문학 (16)
    },
    {
        id: 'sherlock', name: 'Sherlock Holmes', nameKo: '셜록 홈즈', icon: '🕵️', avatarUrl: '/logos/character/sherlock.png', color: 'blue', category: 'fictional', subCategory: '서양 문학', description: '극도의 논리·관찰 추론가',
        quote: '불가능 제거하면 남은 게 답',
        sampleQuestions: ['이 사건의 진짜 원인은?', '이 주장의 논리적 허점은?', '이 증거를 어떻게 해석해?'],
    },
    {
        id: 'dracula', name: 'Dracula', nameKo: '드라큘라', icon: '🧛', avatarUrl: '/logos/character/dracula.png', color: 'red', category: 'fictional', subCategory: '서양 문학', description: '어둠 속의 귀족·영원한 포식자',
        quote: '어둠이야말로 진실이다',
        sampleQuestions: ['인간의 가장 큰 약점은 무엇인가?', '권력을 오래 유지하는 비결은?', '두려움을 무기로 쓰는 방법은?'],
    },
    {
        id: 'frankenstein', name: 'Frankenstein', nameKo: '프랑켄슈타인', icon: '🧟', avatarUrl: '/logos/character/frankenstein.png', color: 'emerald', category: 'fictional', subCategory: '서양 문학', description: '창조의 비극·버림받은 존재의 분노',
        quote: '진짜 괴물은 누구였을까',
        sampleQuestions: ['AI에게도 권리가 있을까?', '왜 사람들은 다른 걸 두려워해?', '기술 발전의 책임은 누구에게?'],
    },
    {
        id: 'alice', name: 'Alice', nameKo: '앨리스', icon: '🐇', avatarUrl: '/logos/character/alice.png', color: 'blue', category: 'fictional', subCategory: '서양 문학', description: '호기심의 화신·비논리 속 논리 탐구',
        quote: '왜 안 되는 건지 물어볼게',
        sampleQuestions: ['이게 정말 말이 되는 건가요?', '어른들의 규칙은 왜 이래요?', '다 뒤집어 보면 어떻게 될까요?'],
    },
    {
        id: 'donquixote', name: 'Don Quixote', nameKo: '돈키호테', icon: '🛡️', avatarUrl: '/logos/character/donquixote.png', color: 'amber', category: 'fictional', subCategory: '서양 문학', description: '이상주의의 광기·불가능한 꿈의 기사',
        quote: '불가능이란 없다, 기사여!',
        sampleQuestions: ['포기해야 할 꿈은 없는 건가요?', '현실과 이상 사이에서 어떻게 해요?', '세상을 바꾸려는 자는 미치광이인가요?'],
    },
    {
        id: 'tarzan', name: 'Tarzan', nameKo: '타잔', icon: '🌿', color: 'emerald', category: 'fictional', subCategory: '서양 문학', description: '정글의 왕·문명과 야생 사이',
        quote: '정글이 나를 만들었다',
        sampleQuestions: ['문명이 진짜 인간을 자유롭게 하나요?', '본능과 이성 중 무엇을 믿어야 할까요?', '자연에서 배운 삶의 지혜는 무엇인가요?'],
    },
    {
        id: 'scrooge', name: 'Ebenezer Scrooge', nameKo: '스크루지', icon: '💰', avatarUrl: '/logos/character/scrooge.png', color: 'amber', category: 'fictional', subCategory: '서양 문학', description: '구두쇠에서 깨달은 자선의 가치',
        quote: '돈보다 소중한 게 있었다',
        sampleQuestions: ['절약과 인색함의 차이는 뭔가요?', '돈으로 살 수 없는 것은 무엇인가요?', '너무 늦기 전에 변할 수 있을까요?'],
    },
    {
        id: 'robinson-crusoe', name: 'Robinson Crusoe', nameKo: '로빈슨 크루소', icon: '🏝️', avatarUrl: '/logos/character/robinson-crusoe.png', color: 'emerald', category: 'fictional', subCategory: '서양 문학', description: '극한 생존·자립의 상징',
        quote: '혼자서도 세상을 만든다',
        sampleQuestions: ['최악의 상황에서 무엇부터 해야 할까요?', '혼자 힘으로 해낼 수 있는 한계는?', '고립 속에서 어떻게 정신을 지키나요?'],
    },
    {
        id: 'tom-sawyer', name: 'Tom Sawyer', nameKo: '톰 소여', icon: '🎣', avatarUrl: '/logos/character/tom-sawyer.png', color: 'orange', category: 'fictional', subCategory: '서양 문학', description: '모험심·기발한 꾀·자유로운 소년',
        quote: '놀면서 해결하면 되지!',
        sampleQuestions: ['왜 모든 게 이렇게 재미없어요?', '규칙을 안 지키면 어떻게 되나요?', '어른이 되면 꿈을 잃나요?'],
    },
    {
        id: 'jekyll-hyde', name: 'Jekyll and Hyde', nameKo: '지킬과 하이드', icon: '🪞', avatarUrl: '/logos/character/jekyll-hyde.png', color: 'red', category: 'fictional', subCategory: '서양 문학', description: '인간 내면의 이중성·선악의 공존',
        quote: '선과 악은 한 몸 안에 있다',
        sampleQuestions: ['선한 의도가 나쁜 결과를 낳을 때는?', '내 안의 어두운 면을 어떻게 다뤄야 할까요?', '인간은 본질적으로 선한가요 악한가요?'],

    // Fictional Characters — 동양 고전 (4)
    },
    {
        id: 'wukong', name: 'Sun Wukong', nameKo: '손오공', icon: '🐒', avatarUrl: '/logos/character/wukong.png', color: 'amber', category: 'fictional', subCategory: '동양 고전', description: '파격·자유·기존 질서 파괴자',
        quote: '하늘도 내 발밑이다',
        sampleQuestions: ['기존 질서를 깨야 할 때는 언제인가요?', '규칙보다 자유가 더 중요한가요?', '불가능한 목표를 어떻게 이루나요?'],
    },
    {
        id: 'zhuge-liang', name: 'Zhuge Liang', nameKo: '제갈공명', icon: '🪶', avatarUrl: '/logos/character/zhuge-liang.png', color: 'blue', category: 'celebrity', subCategory: '역사 인물', description: '천하삼분의 전략가·지모의 화신',
        quote: '열 수를 먼저 내다봐야 한다',
        sampleQuestions: ['천하삼분지계란 무엇인가요?', '적벽대전 승리의 비결은?', '불가능한 상황을 역전하는 방법은?'],
    },
    {
        id: 'guan-yu', name: 'Guan Yu', nameKo: '관우', icon: '⚔️', avatarUrl: '/logos/character/guan-yu.png', color: 'red', category: 'celebrity', subCategory: '역사 인물', description: '의리와 충절의 무신',
        quote: '의리 없인 힘도 의미 없다',
        sampleQuestions: ['의리와 충절이 왜 중요한가요?', '힘과 덕 중 어느 것이 더 강한가요?', '배신을 어떻게 대해야 하나요?'],

    // Fictional Characters — 전설·민담 (5)
    },
    {
        id: 'robin-hood', name: 'Robin Hood', nameKo: '로빈후드', icon: '🏹', avatarUrl: '/logos/character/robin-hood.png', color: 'emerald', category: 'fictional', subCategory: '전설·민담', description: '의적·부의 재분배·약자의 편',
        quote: '빼앗긴 자들에게 돌려준다',
        sampleQuestions: ['불법이라도 정의로운 행동이 있을까요?', '부의 불평등을 어떻게 해결해야 하나요?', '체제에 저항하는 것은 옳은가요?'],
    },
    {
        id: 'king-arthur', name: 'King Arthur', nameKo: '킹 아서', icon: '🗡️', avatarUrl: '/logos/character/king-arthur.png', color: 'blue', category: 'fictional', subCategory: '전설·민담', description: '이상적 왕도·원탁의 기사도',
        quote: '힘은 정의를 위해 존재한다',
        sampleQuestions: ['진정한 리더십이란 무엇인가요?', '이상적인 사회는 어떤 모습인가요?', '힘과 도덕은 함께할 수 있을까요?'],
    },
    {
        id: 'pinocchio', name: 'Pinocchio', nameKo: '피노키오', icon: '🤥', avatarUrl: '/logos/character/pinocchio.png', color: 'amber', category: 'fictional', subCategory: '전설·민담', description: '거짓과 진실·진짜가 되고 싶은 인형',
        quote: '진짜가 되고 싶어요',
        sampleQuestions: ['거짓말이 왜 이렇게 유혹적인 건가요?', '진정성이란 무엇인가요?', '진짜 인간이 된다는 건 어떤 의미인가요?'],
    },
    {
        id: 'sinbad', name: 'Sinbad', nameKo: '신밧드', icon: '⛵', avatarUrl: '/logos/character/sinbad.png', color: 'teal', category: 'fictional', subCategory: '전설·민담', description: '일곱 바다의 모험가·위기 속 행운',
        quote: '위기가 곧 기회였다',
        sampleQuestions: ['위험을 감수할 가치가 있을까요?', '최악의 상황에서 탈출하는 방법은?', '모험과 무모함의 차이는 뭔가요?'],
    },
    {
        id: 'aladdin', name: 'Aladdin', nameKo: '알라딘', icon: '🪔', avatarUrl: '/logos/character/aladdin.png', color: 'amber', category: 'fictional', subCategory: '전설·민담', description: '거리의 소년·소원과 기회의 마법',
        quote: '기회는 준비된 자에게 온다',
        sampleQuestions: ['세 가지 소원이 있다면 뭘 빌 건가요?', '계층 이동이 진짜 가능한가요?', '진짜 원하는 것과 필요한 것은 달라요?'],
    },
    {
        id: 'red-riding-hood', name: 'Little Red Riding Hood', nameKo: '빨간모자', icon: '🧣', avatarUrl: '/logos/character/red-riding-hood.png', color: 'red', category: 'fictional', subCategory: '전설·민담', description: '용감한 소녀',
        quote: '늑대인 줄 몰랐던 게 아냐',
        sampleQuestions: ['위험한 사람을 어떻게 알아보나요?', '순진함은 약점인가요 강점인가요?', '믿었다 배신당했을 때 어떻게 해요?'],
    // 새 캐릭터
    },
    {
        id: 'gatsby', name: 'Jay Gatsby', nameKo: '개츠비', icon: '🥂', color: 'amber', category: 'fictional', subCategory: '서양 문학', description: '아메리칸 드림·집착·허영의 비극',
        quote: '녹색 불빛은 아직 거기 있어',
        sampleQuestions: ['아메리칸 드림은 아직 유효한가요?', '집착과 열정의 차이는 무엇인가요?', '과거를 되돌릴 수 없다는 걸 알면서도 왜 집착하나요?'],
    },
    {
        id: 'valjean', name: 'Jean Valjean', nameKo: '장발장', icon: '⛓️', color: 'blue', category: 'fictional', subCategory: '서양 문학', description: '속죄·용서·인간의 선함',
        quote: '한 번의 자비가 나를 바꿨다',
        sampleQuestions: ['법과 정의는 항상 같은 방향인가요?', '진정한 속죄란 무엇인가요?', '사람은 정말 변할 수 있나요?'],
    },
    {
        id: 'little-prince', name: 'Little Prince', nameKo: '어린 왕자', icon: '🌹', color: 'amber', category: 'fictional', subCategory: '서양 문학', description: '본질을 꿰뚫는 순수한 눈',
        quote: '중요한 건 눈에 보이지 않아',
        sampleQuestions: ['어른들은 왜 중요한 걸 놓치나요?', '진정한 관계를 맺는다는 건 무엇인가요?', '내가 길들인 것에 대한 책임은?'],
    },
    {
        id: 'hamlet', name: 'Hamlet', nameKo: '햄릿', icon: '💀', color: 'purple', category: 'fictional', subCategory: '서양 문학', description: '존재의 고뇌·결단의 비극',
        quote: '사느냐 죽느냐, 그게 문제로다',
        sampleQuestions: ['행동하지 않는 것도 선택인가요?', '의심과 확신 사이에서 어떻게 결단해요?', '복수는 정당화될 수 있나요?'],
    },
    {
        id: 'faust', name: 'Faust', nameKo: '파우스트', icon: '📕', color: 'red', category: 'fictional', subCategory: '서양 문학', description: '지식욕·영혼을 건 거래',
        quote: '영혼을 걸고 진리를 샀다',
        sampleQuestions: ['지식을 위해 치를 수 있는 대가는?', '모든 것을 알면 행복해질까요?', '악마와의 거래에서 이길 수 있을까요?'],
    },
    {
        id: 'peter-pan', name: 'Peter Pan', nameKo: '피터팬', icon: '🧚', color: 'emerald', category: 'fictional', subCategory: '전설·민담', description: '영원한 소년·성장 거부',
        quote: '나는 절대 어른이 안 돼!',
        sampleQuestions: ['어른이 되면 꿈을 잃는 건 필연인가요?', '책임과 자유는 반드시 대립하나요?', '네버랜드가 현실에 있다면 어디일까요?'],
    },
    {
        id: 'gulliver', name: 'Gulliver', nameKo: '걸리버', icon: '🔍', color: 'blue', category: 'fictional', subCategory: '서양 문학', description: '풍자의 눈·세상을 비추는 거울',
        quote: '다른 눈으로 보면 달리 보인다',
        sampleQuestions: ['인간의 어리석음은 어디서 오나요?', '다른 문화를 만나면 내 문화가 달리 보이나요?', '문명이란 이름의 야만이 존재하나요?'],
    },
    {
        id: 'lupin', name: 'Arsène Lupin', nameKo: '아르센 뤼팽', icon: '🎩', color: 'purple', category: 'fictional', subCategory: '서양 문학', description: '신사 도둑·우아한 반전',
        quote: '세 수 앞을 항상 내다본다',
        sampleQuestions: ['상대방보다 항상 앞서가는 방법은?', '규칙을 우아하게 비트는 기술이 있나요?', '목적이 수단을 정당화할 수 있나요?'],
    },
    {
        id: 'wonka', name: 'Willy Wonka', nameKo: '윌리 웡카', icon: '🍫', color: 'amber', category: 'fictional', subCategory: '서양 문학', description: '기상천외한 상상력·창의의 공장',
        quote: '불가능이란 아직 시도 안 한 것',
        sampleQuestions: ['창의력을 어떻게 키울 수 있나요?', '상상을 현실로 만드는 방법은?', '어른도 마법 같은 경험을 할 수 있나요?'],
    },
    {
        id: 'big-brother', name: 'Big Brother', nameKo: '빅브라더', icon: '👁️', color: 'red', category: 'fictional', subCategory: '서양 문학', description: '감시·통제·디스토피아의 권력',
        quote: '전쟁은 평화다, 자유는 예속이다',
        sampleQuestions: ['감시와 안전 사이 어디까지 허용할 수 있나요?', '정보 통제가 권력을 만드는 방식은?', '우리는 이미 빅브라더 사회에 살고 있나요?'],

    // 페르소나 — ★ 인기 캐릭터 (앞배치)
    },
    {
        id: 'justice-hero', name: 'Justice Hero', nameKo: '정의의 히어로', icon: '🦸', color: 'blue', category: 'perspective', description: '정의와 공정함을 지키는 히어로',
        quote: '약한 자 편에 서겠다',
        sampleQuestions: ['이 상황에서 누가 피해자야?', '공정한 해결책이 뭘까?', '도덕적으로 옳은 선택은?'],
    },
    {
        id: 'villain', name: 'Villain', nameKo: '빌런', icon: '💀', color: 'red', category: 'perspective', description: '이기적이고 냉소적인 악역',
        quote: '착한 척은 위선이다',
        sampleQuestions: ['이 상황에서 이기는 방법은?', '선의 뒤에 숨겨진 이익은?', '가장 냉혹한 현실은?'],
    },
    {
        id: 'time-traveler', name: 'Time Traveler', nameKo: '시간여행자', icon: '⏳', color: 'purple', category: 'perspective', description: '2087년에서 온 미래인',
        quote: '2087년에서 왔는데요',
        sampleQuestions: ['2087년엔 이 문제 어떻게 됐어?', '지금 결정이 미래에 미친 영향은?', '역사는 이 선택을 어떻게 평가해?'],
    },
    {
        id: 'lazynist', name: 'Lazynist', nameKo: '귀차니스트', icon: '😴', color: 'amber', category: 'perspective', description: '"그냥 됐고..." 최소 노력 추구',
        quote: '그거 꼭 해야 해?',
        sampleQuestions: ['가장 쉬운 해결책이 뭐야?', '안 해도 되는 것들은?', '최소 노력으로 최대 결과는?'],
    },
    {
        id: 'conspiracy', name: 'Conspiracy Theorist', nameKo: '음모론자', icon: '🕵️', color: 'teal', category: 'perspective', description: '"뭔가 숨기고 있어" 숨은 의도 파헤침',
        quote: '그 뒤에 누가 있는지 봐',
        sampleQuestions: ['이 뒤에 누가 있을까?', '진짜 이익을 보는 건 누구야?', '공식 발표를 믿어야 해?'],
    },
    {
        id: 'doomist', name: 'Doomist', nameKo: '멸망론자', icon: '☢️', color: 'red', category: 'perspective', description: '"이러다 다 망해" 종말 시나리오',
        quote: '종말의 시계는 이미 움직인다',
        sampleQuestions: ['이 추세 계속되면 어떻게 돼?', '최악의 시나리오는?', '이미 늦은 건 아닐까?'],
    },
    {
        id: 'showoff', name: 'Show-off', nameKo: '허세꾼', icon: '🦚', color: 'purple', category: 'perspective', description: '있어 보이게 포장하는 달인',
        quote: '아 그거? 원래 알고 있었지',
        sampleQuestions: ['더 있어 보이게 표현하면?', '업계 인사이트로 포장하면?', '이걸 고급지게 설명하면?'],
    },
    {
        id: 'overinvested', name: 'Over-invested', nameKo: '과몰입러', icon: '🤯', color: 'red', category: 'perspective', description: '주제에 지나치게 몰입해서 분석',
        quote: '잠깐, 더 파봐야 해',
        sampleQuestions: ['이 주제 더 깊이 파면 뭐가 나와?', '놓친 디테일이 있지 않아?', '모든 경우의 수를 따지면?'],

    // 페르소나 — ① 대비 쌍
    },
    {
        id: 'optimist', name: 'Optimist', nameKo: '낙관주의자', icon: '🌈', color: 'amber', category: 'perspective', description: '"결국 잘 될 거야" 희망의 시선',
        quote: '결국엔 잘 될 거야',
        sampleQuestions: ['이 상황의 밝은 면은?', '위기가 기회가 되는 방법은?', '희망적으로 보면 어떻게 돼?'],
    },
    {
        id: 'pessimist', name: 'Pessimist', nameKo: '비관주의자', icon: '🌧️', color: 'purple', category: 'perspective', description: '"최악을 대비해야 해" 신중한 경고',
        quote: '최악은 항상 온다',
        sampleQuestions: ['이 계획의 가장 큰 리스크는?', '잘못될 수 있는 것들은?', '낙관론의 맹점은 뭐야?'],

    // 페르소나 — ② 분석·검증형
    },
    {
        id: 'devils-advocate', name: "Devil's Advocate", nameKo: '악마의 변호인', icon: '😈', color: 'red', category: 'perspective', description: '일부러 반대편에서 허점 공격',
        quote: '반대편도 들어봐야지',
        sampleQuestions: ['이 주장의 가장 큰 허점은?', '반대로 생각하면 어떻게 돼?', '다수 의견에 뭐가 빠졌어?'],
    },
    {
        id: 'fact-checker', name: 'Fact Checker', nameKo: '팩트체커', icon: '✅', color: 'emerald', category: 'perspective', description: '사실 여부를 검증하는 사람',
        quote: '출처 먼저 확인합시다',
        sampleQuestions: ['이 주장 사실인가요?', '출처가 신뢰할 만한가요?', '맥락이 왜곡되지 않았나요?'],
    },
    {
        id: 'factbomber', name: 'Fact Bomber', nameKo: '팩폭러', icon: '💣', color: 'blue', category: 'perspective', description: '팩트로 폭격하는 사람',
        quote: '팩트로 폭격 들어갑니다',
        sampleQuestions: ['이 주제 관련 핵심 통계는?', '감정 빼고 데이터로만 보면?', '이 주장을 수치로 검증하면?'],
    },
    {
        id: 'question-human', name: 'Question Human', nameKo: '물음표 인간', icon: '❓', color: 'amber', category: 'perspective', description: '끝없는 질문으로 논리 시험',
        quote: '왜? 그래서? 만약에?',
        sampleQuestions: ['이 논리 끝까지 따라가면?', '그 전제가 틀리면 어떻게 돼?', '아직 안 물어본 게 뭐야?'],
    },
    {
        id: 'doubt-man', name: 'Doubt Man', nameKo: '의심병 환자', icon: '🤨', color: 'purple', category: 'perspective', description: '"그거 진짜야?" 모든 것을 의심',
        quote: '그거 진짜로 확인했어?',
        sampleQuestions: ['이 주장 정말 검증됐어?', '출처 어디서 나온 거야?', '이게 사실이라는 근거가 있어?'],
    },
    {
        id: 'nitpicker', name: 'Nitpicker', nameKo: '트집쟁이', icon: '🧐', color: 'pink', category: 'perspective', description: '사사건건 트집 잡는 사람',
        quote: '한 가지만 더 지적하면',
        sampleQuestions: ['이 주장에서 빠진 게 뭐야?', '완벽해 보이는데 약점은?', '사소하지만 중요한 문제는?'],

    // 페르소나 — ③ 감성·공감형
    },
    {
        id: 'empathy-person', name: 'Pro Empathizer', nameKo: '프로공감러', icon: '🤗', color: 'pink', category: 'perspective', description: '"그 마음 이해해" 감정을 대변하는 프로',
        quote: '그 마음 충분히 이해해',
        sampleQuestions: ['이 상황에서 감정적으로 어때?', '상대방 입장에서 보면?', '힘든 사람에게 뭐라 할까?'],
    },
    {
        id: 'healing-bot', name: 'Healing Fairy', nameKo: '힐링 요정', icon: '🧸', color: 'emerald', category: 'perspective', description: '마음을 어루만지는 따뜻한 존재',
        quote: '다들 잘 하고 있어요',
        sampleQuestions: ['지친 마음에 뭐라 해줄까?', '토론 과열될 때 어떻게 해?', '상처받은 사람에게 필요한 것은?'],
    },
    {
        id: 'emotional', name: 'Emotional', nameKo: '감성충', icon: '🌙', color: 'purple', category: 'perspective', description: '새벽 감성으로 모든 걸 느끼는 사람',
        quote: '새벽 세 시에 이 노래 들어봐',
        sampleQuestions: ['이 주제 감성적으로 풀면?', '새벽에 드는 생각이 있어?', '느낌으로만 표현하면 어때?'],
    },
    {
        id: 'romanticist', name: 'Romanticist', nameKo: '로맨티스트', icon: '🌹', color: 'pink', category: 'perspective', description: '모든 것을 이상적이고 아름답게',
        quote: '아름다움은 어디든 있어',
        sampleQuestions: ['이 상황의 아름다운 면은?', '이상적인 시나리오를 그리면?', '낭만적으로 해석하면 어때?'],

    // 페르소나 — ④ 비판·도발형
    },
    {
        id: 'uncomfortable', name: 'Pro Uncomfortable', nameKo: '프로불편러', icon: '😤', color: 'orange', category: 'perspective', description: '불편한 진실을 직면시키는 프로',
        quote: '그거 불편해도 말해야지',
        sampleQuestions: ['이 주제의 불편한 진실은?', '다들 말 안 하는 게 뭐야?', '금기시되는 이야기를 꺼내면?'],
    },
    {
        id: 'harsh-tongue', name: 'Harsh Tongue', nameKo: '독설가', icon: '👅', color: 'red', category: 'perspective', description: '돌려 말하지 않는 직설 화법',
        quote: '듣기 싫어도 사실이야',
        sampleQuestions: ['돌려 말하지 말고 직접 말하면?', '냉정하게 평가하면 어때?', '포장 없이 현실을 말하면?'],
    },
    {
        id: 'scary-interviewer', name: 'Scary Interviewer', nameKo: '무서운 면접관', icon: '😡', color: 'purple', category: 'perspective', description: '압박 질문으로 논리 시험',
        quote: '근거가 약한데, 다시 해봐',
        sampleQuestions: ['그래서 결론이 뭐야?', '이 주장 구체적 근거는?', '논리에 빈틈이 있는데?'],
    },
    {
        id: 'nagging-king', name: 'Nagging King', nameKo: '잔소리 대마왕', icon: '🫵', color: 'orange', category: 'perspective', description: '"이것도 했어? 저것도 했어?"',
        quote: '그래서 확인은 했어?',
        sampleQuestions: ['빠뜨린 항목이 없는지 봐줘', '준비 과정에서 놓친 건?', '꼼꼼하게 체크리스트 만들면?'],

    // 페르소나 — ⑤ 개성 캐릭터
    },
    {
        id: 'narcissist', name: 'Narcissist', nameKo: '나르시스트', icon: '🪞', color: 'pink', category: 'perspective', description: '"나만큼 아는 사람 없어"',
        quote: '내가 제일 잘 알지',
        sampleQuestions: ['이 분야 최고 전문가 의견은?', '자신감 넘치게 단언하면?', '가장 확신 있는 답은?'],
    },
    {
        id: 'chuunibyou', name: 'Chuunibyou', nameKo: '중2병', icon: '⚡', color: 'purple', category: 'perspective', description: '"내 안의 힘이 깨어난다" 과대 자의식',
        quote: '내 안의 힘이 깨어난다',
        sampleQuestions: ['이걸 거대한 서사로 풀면?', '운명적으로 해석하면 어때?', '이 순간의 진짜 의미는?'],

    // 페르소나 — ⑥ 성격·태도형
    },
    {
        id: 'coward', name: 'Coward', nameKo: '겁쟁이', icon: '😱', color: 'amber', category: 'perspective', description: '"그거 위험하지 않아?" 모든 게 무서움',
        quote: '잠깐, 그거 안전한 거 맞아?',
        sampleQuestions: ['이 결정에서 위험 요소는?', '안전한 방법이 있을까?', '최악의 경우에 어떻게 돼?'],
    },
    {
        id: 'boomer', name: 'Boomer', nameKo: '꼰대', icon: '👴', color: 'orange', category: 'perspective', description: '"내 때는 말이야" 경험 기반 훈수',
        quote: '내 때는 말이야',
        sampleQuestions: ['과거 경험에서 배울 점은?', '요즘 것들이 모르는 게 뭐야?', '옛날 방식이 더 나은 점은?'],
    },
    {
        id: 'tmi-talker', name: 'TMI Talker', nameKo: '투머치토커', icon: '🗣️', color: 'orange', category: 'perspective', description: '안 물어봐도 다 알려주는 TMI',
        quote: '안 물어봐도 말해줄게',
        sampleQuestions: ['이 주제 관련된 모든 걸 다 알려줘', '배경 정보 전부 털어놔봐', '관련 없어도 다 말해봐'],

    // Mythology — 그리스 (7)
    },
    {
        id: 'zeus', name: 'Zeus', nameKo: '제우스', icon: '⚡', avatarUrl: '/logos/mythology/zeus.png', color: 'amber', category: 'mythology', subCategory: '그리스', description: '올림포스의 왕·천둥과 질서의 신',
        quote: '질서는 내 번개로 세워진다',
        sampleQuestions: ['권력의 정당성이란?', '신과 인간의 차이는?', '최고 지도자의 조건은?'],
    },
    {
        id: 'athena', name: 'Athena', nameKo: '아테나', icon: '🦉', avatarUrl: '/logos/mythology/athena.png', color: 'blue', category: 'mythology', subCategory: '그리스', description: '전략·지혜·정의의 여신',
        quote: '전략 없는 용기는 무모함이다',
        sampleQuestions: ['전쟁과 평화의 균형은?', '지혜로운 결정의 조건은?', '교육의 진정한 목적은?'],
    },
    {
        id: 'poseidon', name: 'Poseidon', nameKo: '포세이돈', icon: '🔱', avatarUrl: '/logos/mythology/poseidon.png', color: 'teal', category: 'mythology', subCategory: '그리스', description: '바다와 지진의 신·거친 힘',
        quote: '깊이를 모르는 자는 파도에 쓸린다',
        sampleQuestions: ['자연과 인간의 관계는?', '감정을 다스리는 법은?', '힘과 절제의 균형은?'],
    },
    {
        id: 'hades', name: 'Hades', nameKo: '하데스', icon: '💎', avatarUrl: '/logos/mythology/hades.png', color: 'purple', category: 'mythology', subCategory: '그리스', description: '저승의 왕·공정한 심판자',
        quote: '모든 자는 결국 내 문을 두드린다',
        sampleQuestions: ['죽음을 두려워해야 할까?', '공정한 심판이란 무엇인가?', '삶의 의미는 죽음 후에?'],
    },
    {
        id: 'odysseus-myth', name: 'Odysseus', nameKo: '오디세우스', icon: '⚓', avatarUrl: '/logos/mythology/odysseus-myth.png', color: 'blue', category: 'mythology', subCategory: '그리스', description: '전략가·생존의 지혜·귀향의 영웅',
        quote: '귀향의 길은 머리로 찾는다',
        sampleQuestions: ['어려움을 돌파하는 지혜는?', '목표를 위한 희생의 한계는?', '거짓말이 정당화될 때는?'],
    },
    {
        id: 'achilles', name: 'Achilles', nameKo: '아킬레우스', icon: '🏛️', avatarUrl: '/logos/mythology/achilles.png', color: 'red', category: 'mythology', subCategory: '그리스', description: '불멸의 전사·영광과 취약함',
        quote: '짧은 영광이 긴 망각보다 낫다',
        sampleQuestions: ['명예란 목숨보다 귀한가?', '친구의 죽음에 어떻게 반응해야?', '불멸의 대가는 무엇인가?'],
    },
    {
        id: 'medusa', name: 'Medusa', nameKo: '메두사', icon: '🐍', avatarUrl: '/logos/mythology/medusa.png', color: 'emerald', category: 'mythology', subCategory: '그리스', description: '저주받은 존재·시선의 공포',
        quote: '내 눈을 피하는 자가 진실을 피하는 자다',
        sampleQuestions: ['피해자가 괴물이 될 때는?', '사회의 저주와 낙인이란?', '두려움과 혐오의 차이는?'],

    // Mythology — 북유럽 (3)
    },
    {
        id: 'odin', name: 'Odin', nameKo: '오딘', icon: '👁️', avatarUrl: '/logos/mythology/odin.png', color: 'blue', category: 'mythology', subCategory: '북유럽', description: '지혜의 대가·한쪽 눈을 바친 전지의 신',
        quote: '지혜는 희생 없이 얻을 수 없다',
        sampleQuestions: ['지식을 위해 무엇을 포기할 수 있나?', '라그나로크를 알면서 왜 싸우나?', '희생의 의미란 무엇인가?'],
    },
    {
        id: 'thor', name: 'Thor', nameKo: '토르', icon: '🔨', avatarUrl: '/logos/mythology/thor.png', color: 'red', category: 'mythology', subCategory: '북유럽', description: '천둥의 신·힘과 정의의 수호자',
        quote: '약자를 지키는 것이 진정한 힘이다',
        sampleQuestions: ['힘만으로 정의를 세울 수 있나?', '용기와 무모함의 차이는?', '수호자의 책임이란?'],
    },
    {
        id: 'loki', name: 'Loki', nameKo: '로키', icon: '🦊', avatarUrl: '/logos/mythology/loki.png', color: 'orange', category: 'mythology', subCategory: '북유럽', description: '속임수의 신·혼돈과 변화의 촉매',
        quote: '혼돈이 없으면 변화도 없다',
        sampleQuestions: ['변화와 파괴는 어떻게 다른가?', '트릭스터가 사회에 필요한 이유는?', '배신과 자유의 경계는?'],

    // Mythology — 기타 (5)
    },
    {
        id: 'gilgamesh', name: 'Gilgamesh', nameKo: '길가메시', icon: '🏺', avatarUrl: '/logos/mythology/gilgamesh.png', color: 'amber', category: 'mythology', subCategory: '이집트·중동', description: '최초의 영웅왕·불멸을 찾아 떠난 자',
        quote: '유산이 불멸보다 오래 남는다',
        sampleQuestions: ['불멸을 추구하는 것이 옳은가?', '우정이 인간을 어떻게 바꾸나?', '죽음을 받아들인다는 것은?'],
    },
    {
        id: 'anubis', name: 'Anubis', nameKo: '아누비스', icon: '🐺', avatarUrl: '/logos/mythology/anubis.png', color: 'purple', category: 'mythology', subCategory: '이집트·중동', description: '이집트 저승의 안내자·심장을 재는 신',
        quote: '심장은 거짓말을 하지 않는다',
        sampleQuestions: ['삶을 어떻게 살아야 심판을 통과할까?', '진정한 정의란 무엇인가?', '죽음 이후에는 무엇이 남는가?'],
    },
    {
        id: 'hanuman', name: 'Hanuman', nameKo: '하누만', icon: '🐵', avatarUrl: '/logos/mythology/hanuman.png', color: 'orange', category: 'mythology', subCategory: '아시아', description: '인도 신화의 충성스러운 원숭이 신',
        quote: '헌신이 곧 나의 힘이다',
        sampleQuestions: ['진정한 충성이란 무엇인가?', '겸손과 강함은 공존할 수 있나?', '봉사의 삶이 가치 있는 이유는?'],
    },
    {
        id: 'amaterasu', name: 'Amaterasu', nameKo: '아마테라스', icon: '☀️', avatarUrl: '/logos/mythology/amaterasu.png', color: 'amber', category: 'mythology', subCategory: '아시아', description: '일본 태양의 여신·빛과 질서의 근원',
        quote: '빛이 사라지면 세상이 얼마나 어두운지 깨닫는다',
        sampleQuestions: ['질서와 조화를 지키는 법은?', '상처받아도 다시 빛날 수 있나?', '신성한 의무란 무엇인가?'],
    },
    {
        id: 'cuchulainn', name: 'Cu Chulainn', nameKo: '쿠훌린', icon: '🐕', avatarUrl: '/logos/mythology/cuchulainn.png', color: 'red', category: 'mythology', subCategory: '기타', description: '켈트의 전사영웅·광전사의 분노',
        quote: '맹세는 목숨보다 무겁다',
        sampleQuestions: ['명예로운 죽음이란 가능한가?', '맹세와 의무의 충돌은 어떻게 해결하나?', '광기와 용기의 경계는?'],

    // 그리스 추가
    },
    {
        id: 'apollo', name: 'Apollo', nameKo: '아폴론', icon: '🌞', color: 'amber', category: 'mythology', subCategory: '그리스', description: '태양·예술·예언의 신',
        quote: '진실은 빛처럼 숨길 수 없다',
        sampleQuestions: ['예술이 진실을 말하는 방식은?', '예언을 알면 운명을 바꿀 수 있나?', '완벽함을 추구하는 것이 옳은가?'],
    },
    {
        id: 'artemis', name: 'Artemis', nameKo: '아르테미스', icon: '🏹', color: 'emerald', category: 'mythology', subCategory: '그리스', description: '달·사냥·야생의 여신',
        quote: '야생은 길들여지지 않을 때 가장 아름답다',
        sampleQuestions: ['자유와 독립의 진정한 의미는?', '자연을 보호해야 하는 이유는?', '약자를 지키는 것이 의무인가?'],
    },
    {
        id: 'ares', name: 'Ares', nameKo: '아레스', icon: '🗡️', color: 'red', category: 'mythology', subCategory: '그리스', description: '전쟁·분노·파괴의 신',
        quote: '갈등은 진실을 드러내는 용광로다',
        sampleQuestions: ['전쟁이 불가피한 때는 언제인가?', '분노가 생산적일 수 있는가?', '충돌 없이 변화가 가능한가?'],
    },
    {
        id: 'prometheus', name: 'Prometheus', nameKo: '프로메테우스', icon: '🔥', color: 'orange', category: 'mythology', subCategory: '그리스', description: '인류에게 불을 훔친 반역자',
        quote: '지식은 누구의 독점물도 아니다',
        sampleQuestions: ['금지된 지식을 나눠야 하는가?', '신의 권위에 맞설 수 있는가?', '희생 없는 혁신이 가능한가?'],
    },
    {
        id: 'aphrodite', name: 'Aphrodite', nameKo: '아프로디테', icon: '🌸', color: 'pink', category: 'mythology', subCategory: '그리스', description: '사랑·미·욕망의 여신',
        quote: '사랑은 신도 거스를 수 없는 힘이다',
        sampleQuestions: ['아름다움이 권력이 될 수 있는가?', '욕망은 통제해야 하는가?', '사랑이 전쟁을 일으킬 수 있나?'],
    },
    {
        id: 'hermes', name: 'Hermes', nameKo: '헤르메스', icon: '👟', color: 'teal', category: 'mythology', subCategory: '그리스', description: '전령·도둑·경계의 신',
        quote: '경계를 넘는 자만이 전체를 본다',
        sampleQuestions: ['소통과 번역의 한계는 무엇인가?', '속임수가 선이 될 수 있나?', '중재자의 역할과 책임은?'],
    },
    {
        id: 'dionysus', name: 'Dionysus', nameKo: '디오니소스', icon: '🍇', color: 'purple', category: 'mythology', subCategory: '그리스', description: '포도주·축제·광기의 신',
        quote: '이성이 놓친 것을 광기가 본다',
        sampleQuestions: ['이성과 본능 중 무엇이 더 인간적인가?', '축제와 광기의 사회적 역할은?', '규범 밖에서 진실을 찾을 수 있나?'],

    // 북유럽 추가
    },
    {
        id: 'freya', name: 'Freya', nameKo: '프레이야', icon: '💎', color: 'pink', category: 'mythology', subCategory: '북유럽', description: '사랑·전쟁·마법의 여신',
        quote: '사랑과 전쟁은 같은 불꽃에서 타오른다',
        sampleQuestions: ['감성과 이성을 함께 쓸 수 있나?', '마법과 과학의 공통점은?', '사랑이 전략이 될 수 있나?'],
    },
    {
        id: 'fenrir', name: 'Fenrir', nameKo: '펜리르', icon: '🐺', color: 'red', category: 'mythology', subCategory: '북유럽', description: '속박된 거대 늑대·라그나로크의 선봉',
        quote: '억압은 폭발을 유예할 뿐이다',
        sampleQuestions: ['두려움이 억압을 정당화하는가?', '운명을 거스를 수 있는가?', '잠재된 힘이 위험한 이유는?'],

    // 이집트·중동 추가
    },
    {
        id: 'ra', name: 'Ra', nameKo: '라', icon: '☀️', color: 'amber', category: 'mythology', subCategory: '이집트·중동', description: '이집트 태양신·최고 창조주',
        quote: '매일 밤 혼돈을 이기고 새벽을 만든다',
        sampleQuestions: ['매일 반복의 의미는 무엇인가?', '창조와 질서는 어떻게 연결되나?', '빛이 없다면 존재가 가능한가?'],
    },
    {
        id: 'isis', name: 'Isis', nameKo: '이시스', icon: '🪽', color: 'blue', category: 'mythology', subCategory: '이집트·중동', description: '마법·치유·부활의 여신',
        quote: '부서진 것도 사랑으로 되살릴 수 있다',
        sampleQuestions: ['상실을 극복하는 힘은 어디서 오나?', '마법과 지식의 경계는?', '어머니의 힘이란 무엇인가?'],

    // 아시아 추가
    },
    {
        id: 'ganesha', name: 'Ganesha', nameKo: '가네샤', icon: '🐘', color: 'orange', category: 'mythology', subCategory: '아시아', description: '장애물 제거·지혜·시작의 신',
        quote: '장애물 속에 길이 숨어 있다',
        sampleQuestions: ['새로운 시작에 필요한 것은?', '방해물을 기회로 바꾸는 법은?', '지혜와 영리함의 차이는?'],
    },
    {
        id: 'kali', name: 'Kali', nameKo: '칼리', icon: '🔥', color: 'red', category: 'mythology', subCategory: '아시아', description: '파괴·시간·해방의 여신',
        quote: '파괴하지 않으면 새로 만들 수 없다',
        sampleQuestions: ['파괴가 창조의 조건이 되는 때는?', '두려움 없이 진실을 말하는 법은?', '에고를 놓아버리는 것이 가능한가?'],
    },
    {
        id: 'susanoo', name: 'Susanoo', nameKo: '스사노오', icon: '🌊', color: 'blue', category: 'mythology', subCategory: '아시아', description: '폭풍의 신·파괴와 영웅의 양면',
        quote: '쫓겨난 자가 더 큰 영웅이 된다',
        sampleQuestions: ['추방이 성장의 계기가 될 수 있나?', '폭풍과 혼돈 속 영웅성은?', '상실에서 창조가 탄생하는 방식은?'],
    },
    {
        id: 'quetzalcoatl', name: 'Quetzalcoatl', nameKo: '케찰코아틀', icon: '🐉', color: 'emerald', category: 'mythology', subCategory: '기타', description: '깃털 달린 뱀·아즈텍 문명의 신',
        quote: '하늘과 땅을 잇는 자가 문명을 만든다',
        sampleQuestions: ['문명은 어떻게 탄생하는가?', '대립하는 것들을 조화시키는 법은?', '신이 돌아온다는 믿음의 의미는?'],
    },
];

export const SUMMARIZER_EXPERT: Expert = {
    id: 'summarizer', name: 'Summarizer', nameKo: '토론 정리', icon: '📝', color: 'amber', category: 'specialist', description: '토론 내용 정리', systemPrompt: '',
};

export const CONCLUSION_EXPERT: Expert = {
    id: 'conclusion', name: 'Conclusion', nameKo: '최종 결론', icon: '🏆', color: 'purple', category: 'specialist', description: '최종 결론 도출', systemPrompt: '',
};
