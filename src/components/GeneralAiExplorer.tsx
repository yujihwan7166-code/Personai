import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  Search,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import type { Expert, ExpertCategory } from '@/types/expert';
import { EXPERT_CATEGORY_LABELS } from '@/types/expert';
import { isVisibleGeneralTextModel } from '@/lib/generalModelCatalog';
import {
  BRAND_LABEL,
  BRAND_ORDER,
  MODEL_BRAND,
} from '@/lib/modelTaxonomy';
import { REASONING_MODEL_IDS, RECOMMENDED_MODEL_IDS } from '@/lib/modelTaxonomy';
import {
  FAST_MODEL_IDS as SELECTION_FAST_MODEL_IDS,
} from '@/lib/expertSelectionGroups';
import {
  GENERAL_SPEC_LABELS,
  GENERAL_TRAIT_LABELS,
  getGeneralModelDisplayTags,
  getGeneralSpecIds,
  getGeneralTraitIds,
  isFastModel,
  matchesGeneralQuickFilter,
} from '@/lib/generalModelExplorerFilters';
import { buildGeneralModelMeta } from '@/lib/generalModelExplorerMeta';
import { matchesGeneralModelQuery } from '@/lib/generalModelSearch';
import { cn } from '@/lib/utils';

type ExplorerTab = 'general' | 'custom';
type ExplorerView = 'grid' | 'list';
type ExplorerSort = 'popular' | 'name' | 'reasoning' | 'tokenUsage' | 'speed' | 'coding' | 'creativity' | 'multilingual';

interface GeneralAiHomeProps {
  experts: Expert[];
  selectedIds: string[];
  autoAssign?: boolean;
  favoriteIds: string[];
  favoriteSet: Set<string>;
  onSelectExpert: (id: string) => void;
  onRecommendSelect?: () => void;
  onToggleFavorite: (id: string) => void;
  input: React.ReactNode;
}

const CUSTOM_CATEGORIES: ExpertCategory[] = [
  'occupation',
  'specialist',
  'celebrity',
  'fictional',
  'mythology',
  'region',
  'ideology',
  'religion',
  'lifestyle',
  'perspective',
];

const GENERAL_PAGE_SIZE = 16;
const CUSTOM_PAGE_SIZE = 12;

const DEFAULT_MODEL_IDS = [
  'gpt',
  'gpt-mini',
  'claude-sonnet',
  'gemini',
  'perplexity',
  'deepseek',
  'grok',
  'qwen',
];

const CUSTOM_FEATURED_IDS = [
  'doctor',
  'pharmacist',
  'vet',
  'judge',
  'lawyer',
  'teacher',
  'counselor',
  'programmer',
  'designer',
  'stocktrader',
  'writer',
  'architect',
  'medical',
  'legal',
  'finance',
  'history',
  'philosophy',
  'psychology',
];

type HomeTabId = 'favorites' | 'recommended' | 'fast' | 'reasoning' | 'all' | 'custom';
type HomeQuickFilterId = 'recommended' | 'fast' | 'reasoning';
type CustomHomeFilter =
  | 'all'
  | 'occupation'
  | 'specialist'
  | 'celebrity'
  | 'fictional'
  | 'mythology'
  | 'region'
  | 'ideology'
  | 'religion'
  | 'lifestyle'
  | 'perspective';
type HomeTile =
  | { kind: 'recommend' }
  | { kind: 'expert'; expert: Expert }
  | { kind: 'openAll' };

const HOME_TABS: Array<{ id: HomeTabId; label: string }> = [
  { id: 'favorites', label: '즐겨찾기' },
  { id: 'recommended', label: '추천' },
  { id: 'fast', label: '빠른 모델' },
  { id: 'reasoning', label: '추론 모델' },
  { id: 'all', label: '전체 모델' },
  { id: 'custom', label: '커스텀 모델' },
];

const CUSTOM_HOME_FILTERS: Array<{ id: CustomHomeFilter; label: string; categories?: ExpertCategory[] }> = [
  { id: 'all', label: '전체' },
  { id: 'occupation', label: '직업', categories: ['occupation'] },
  { id: 'specialist', label: '전문가', categories: ['specialist'] },
  { id: 'celebrity', label: '인물', categories: ['celebrity'] },
  { id: 'fictional', label: '캐릭터', categories: ['fictional'] },
  { id: 'mythology', label: '신화', categories: ['mythology'] },
  { id: 'region', label: '지역', categories: ['region'] },
  { id: 'ideology', label: '이념', categories: ['ideology'] },
  { id: 'religion', label: '종교/철학', categories: ['religion'] },
  { id: 'lifestyle', label: '라이프', categories: ['lifestyle'] },
  { id: 'perspective', label: '페르소나', categories: ['perspective'] },
];

const HOME_GRID_LIMIT = 11;

const HOME_TAB_QUICK_FILTER: Partial<Record<HomeTabId, HomeQuickFilterId>> = {
  recommended: 'recommended',
  fast: 'fast',
  reasoning: 'reasoning',
};

function compactModelName(name: string) {
  return name
    .replace(/^GPT-?/i, 'GPT ')
    .replace(/^Claude\s+/i, '')
    .replace(/^Gemini\s+/i, '')
    .replace(/^Perplexity\s+/i, '')
    .replace(/^DeepSeek\s+/i, '')
    .trim();
}

function homeFavoriteLabel(expert: Expert, hasDuplicateBrand = false) {
  if (hasDuplicateBrand) return compactModelName(expert.nameKo).slice(0, 13);
  const brand = MODEL_BRAND[expert.id];
  if (brand === 'gpt') return 'GPT';
  if (brand === 'claude') return 'Claude';
  if (brand === 'gemini') return 'Gemini';
  if (brand === 'perplexity') return 'Perplexity';
  if (brand === 'deepseek') return 'DeepSeek';
  if (brand === 'grok') return 'Grok';
  if (brand === 'qwen') return 'Qwen';
  return expert.nameKo.replace(/\s*(?:Lite|Mini|Fast|Sonar|V3|4\.5|5\.4).*$/i, '').slice(0, 12);
}

function orderExpertsByIds(experts: Expert[], ids: readonly string[]) {
  const byId = new Map(experts.map((expert) => [expert.id, expert]));
  return ids
    .map((id) => byId.get(id))
    .filter((expert): expert is Expert => Boolean(expert));
}

function dedupeExperts(experts: Expert[]) {
  const seen = new Set<string>();
  return experts.filter((expert) => {
    if (seen.has(expert.id)) return false;
    seen.add(expert.id);
    return true;
  });
}

function customHomeFilterMatches(expert: Expert, filter: CustomHomeFilter) {
  if (!isCustomExpert(expert)) return false;
  if (filter === 'all') return true;
  const config = CUSTOM_HOME_FILTERS.find((item) => item.id === filter);
  return Boolean(config?.categories?.includes(expert.category));
}

function homeTileLabel(expert: Expert, duplicateBrand = false) {
  if (expert.category === 'ai') return homeFavoriteLabel(expert, duplicateBrand);
  return expert.nameKo;
}

function providerLabel(expert: Expert) {
  if (expert.category !== 'ai') return EXPERT_CATEGORY_LABELS[expert.category];
  return modelProviderLabel(expert);
}

function modelProviderLabel(expert: Expert) {
  if (expert.modelInfo?.provider) return expert.modelInfo.provider;
  const model = expert.openrouterModel ?? '';
  if (expert.id === 'ancano-pro') return 'ANCANO';
  if (expert.id === 'auto-gpt') return 'OpenRouter';
  if (model.startsWith('openai/')) return 'OpenAI';
  if (model.startsWith('anthropic/')) return 'Anthropic';
  if (model.startsWith('google/')) return 'Google';
  if (model.startsWith('x-ai/')) return 'xAI';
  if (model.startsWith('perplexity/')) return 'Perplexity';
  if (model.startsWith('deepseek/')) return 'DeepSeek';
  if (model.startsWith('qwen/')) return 'Alibaba';
  if (model.startsWith('meta-llama/')) return 'Meta';
  if (model.startsWith('mistralai/')) return 'Mistral AI';
  if (model.startsWith('microsoft/')) return 'Microsoft';
  if (model.startsWith('cohere/')) return 'Cohere';
  if (model.startsWith('amazon/')) return 'Amazon';
  if (model.startsWith('z-ai/')) return 'Z.ai';
  if (model.startsWith('xiaomi/')) return 'Xiaomi';
  if (model.startsWith('nvidia/')) return 'NVIDIA';
  if (model.startsWith('bytedance-seed/')) return 'ByteDance';
  if (model.startsWith('minimax/')) return 'MiniMax';
  if (model.startsWith('moonshotai/')) return 'Moonshot AI';
  if (model.startsWith('upstage/')) return 'Upstage';
  if (model.startsWith('inception/')) return 'Inception Labs';
  if (model.startsWith('baidu/')) return 'Baidu';
  if (model.startsWith('tencent/')) return 'Tencent';
  if (model.startsWith('ai21/')) return 'AI21 Labs';
  if (model.startsWith('ibm-granite/')) return 'IBM';
  if (model.startsWith('stepfun/')) return 'StepFun';
  if (model.startsWith('writer/')) return 'Writer';
  if (model.startsWith('meituan/')) return 'Meituan';
  if (model.startsWith('cognitivecomputations/')) return 'Cognitive Computations';

  const brand = MODEL_BRAND[expert.id];
  if (brand === 'gpt') return 'OpenAI';
  if (brand === 'claude') return 'Anthropic';
  if (brand === 'gemini') return 'Google';
  if (brand === 'grok') return 'xAI';
  if (brand === 'perplexity') return 'Perplexity';
  if (brand === 'deepseek') return 'DeepSeek';
  if (brand === 'qwen') return 'Alibaba';
  return 'Other';
}

function customFieldTags(expert: Expert) {
  const tagsById: Record<string, string[]> = {
    doctor: ['진료', '증상 정리', '건강 상담'],
    pharmacist: ['복약', '부작용', '상호작용'],
    vet: ['동물 건강', '행동 상담', '진료 준비'],
    judge: ['판단 기준', '쟁점 정리', '공정성'],
    lawyer: ['법률 검토', '권리 보호', '사례 분석'],
    accountant: ['회계', '세무 리스크', '증빙'],
    taxadvisor: ['절세', '신고 준비', '세무 전략'],
    stocktrader: ['투자 판단', '리스크', '포트폴리오'],
    teacher: ['학습 설계', '개념 설명', '피드백'],
    writer: ['문장 다듬기', '구성', '초안'],
    artist: ['창작', '작품 해석', '표현'],
    designer: ['UX', '정보 구조', '사용성'],
    programmer: ['코드 리뷰', '디버깅', '설계'],
    architect: ['공간 설계', '동선', '구조'],
    counselor: ['감정 정리', '선택 코칭', '대화'],
    chef: ['레시피', '조리 팁', '맛 조정'],
    pilot: ['비행 안전', '절차', '상황 판단'],
    farmer: ['작물 관리', '계절', '현장 노하우'],
    firefighter: ['안전', '응급 대응', '예방'],
    police: ['신고 절차', '치안', '증거 정리'],
    soldier: ['전략', '안보', '훈련'],
    journalist: ['팩트체크', '기사 구성', '질문'],
    engineer: ['기술 검토', '안정성', '비용'],
    scientist: ['가설 검증', '실험', '근거'],
    athlete: ['훈련', '회복', '경기력'],
    barista: ['커피', '추출', '원두'],
    hairstylist: ['스타일링', '두피', '이미지'],
    socialworker: ['복지 제도', '지원 연결', '생활 상담'],
    diplomat: ['협상', '국제관계', '표현 조율'],
    sailor: ['해상 안전', '항해', '장비'],
    model: ['포즈', '이미지', '워킹'],
    flightcrew: ['기내 응대', '안전 절차', '서비스'],
    bodyguard: ['위험 판단', '동선', '보안'],
    musician: ['작곡', '연습', '무대'],
    comedian: ['유머', '타이밍', '소재'],
    producer: ['기획', '촬영', '편집'],
    miner: ['현장 안전', '장비', '자원'],
    fisher: ['어종', '물때', '해상'],
    sommelier: ['와인', '페어링', '향미'],
    detective: ['단서', '추론', '조사'],
    legal: ['판례', '법리', '규제'],
    finance: ['자산 운용', '현금흐름', '리스크'],
    history: ['사료', '시대 맥락', '해설'],
    philosophy: ['논증', '윤리', '관점 비교'],
    education: ['커리큘럼', '학습법', '평가'],
    economics: ['시장 분석', '정책', '지표'],
    sociology: ['사회 구조', '계층', '문화'],
    political: ['권력 구조', '제도', '정책'],
    sports: ['운동 생리', '퍼포먼스', '훈련'],
    marketing: ['브랜딩', '고객', '전략'],
    medical: ['질병 이해', '검사 해석', '치료 방향'],
    psychology: ['인지', '행동', '마음'],
    criminology: ['범죄 심리', '수사', '예방'],
    physics: ['물리 법칙', '수식', '실험'],
    chemistry: ['반응', '물질', '분자'],
    biology: ['생명 현상', '유전', '진화'],
    earthscience: ['지질', '기후', '해양'],
    envscience: ['생태', '오염', '지속가능성'],
    theology: ['교리', '경전', '해석'],
    compsci: ['알고리즘', '시스템', '자료구조'],
    pubadmin: ['정책 설계', '공공조직', '제도'],
    military: ['전략', '안보', '전술'],
    intlrelations: ['외교', '국제정치', '협상'],
    astronomy: ['우주', '관측', '천체'],
  };

  if (tagsById[expert.id]) return tagsById[expert.id];
  if (expert.category === 'fictional') return ['역할 대화', '세계관', '캐릭터'];
  if (expert.category === 'mythology') return ['신화', '상징', '이야기'];
  if (expert.category === 'ideology') return ['이념', '논쟁', '가치관'];
  if (expert.category === 'religion') return ['사상', '경전', '해석'];
  if (expert.category === 'lifestyle') return ['라이프', '취향', '실행'];
  if (expert.category === 'perspective') return ['관점', '토론', '해석'];
  return [expert.subCategory ?? EXPERT_CATEGORY_LABELS[expert.category] ?? '커스텀', '대화', '조언'];
}

function tagsForExpert(expert: Expert) {
  if (expert.category === 'ai') {
    return getGeneralModelDisplayTags(expert);
  }

  return customFieldTags(expert).slice(0, 3);
}

function getCustomMeta(expert: Expert) {
  const purposeByCategory: Partial<Record<ExpertCategory, string>> = {
    occupation: '현장 판단, 절차 정리, 실행 팁',
    specialist: '근거 분석, 쟁점 비교, 전문 해설',
    celebrity: '인물 관점, 의사결정, 시대 맥락',
    fictional: '역할 몰입, 세계관 해석, 대사',
    mythology: '상징 해석, 서사, 신화 맥락',
    region: '문화 비교, 지역 맥락, 관습',
    ideology: '가치 판단, 논쟁, 관점 대비',
    religion: '경전 해석, 사상 비교, 삶의 태도',
    lifestyle: '취향 탐색, 루틴, 실천 아이디어',
    perspective: '관점 전환, 반론, 사고 실험',
  };
  const styleByCategory: Partial<Record<ExpertCategory, string>> = {
    occupation: '실무자의 언어로 구체적으로',
    specialist: '근거와 개념을 나눠서 설명',
    celebrity: '그 인물의 문제의식에 맞춘 답변',
    fictional: '캐릭터에 맞는 말투와 시선',
    mythology: '상징과 이야기 중심 해석',
    region: '문화적 맥락을 살린 비교',
    ideology: '입장과 전제를 분명히 드러냄',
    religion: '사상적 배경을 차분히 해석',
    lifestyle: '일상에 바로 옮길 수 있게',
    perspective: '익숙한 판단을 비틀어 보기',
  };

  return [
    ['유형', EXPERT_CATEGORY_LABELS[expert.category] ?? '커스텀'],
    ['분야', expert.subCategory ?? customFieldTags(expert)[0] ?? '관점'],
    ['말투', expert.category === 'fictional' ? '개성적' : '친절함'],
    ['목적', purposeByCategory[expert.category] ?? customFieldTags(expert).join(', ')],
    ['전문성', expert.category === 'occupation' || expert.category === 'specialist' ? '실무' : '역할 기반'],
    ['업데이트', '2025년 5월'],
    ['대화 언어', '한국어'],
    ['응답 스타일', styleByCategory[expert.category] ?? '맥락에 맞춘 답변'],
  ];
}

function getModelMeta(expert: Expert) {
  return buildGeneralModelMeta(expert, modelProviderLabel(expert));
}

function isCustomExpert(expert: Expert) {
  return CUSTOM_CATEGORIES.includes(expert.category);
}

function isPhotoAsset(expert: Expert) {
  return /\.(png|jpe?g|webp)$/i.test(expert.avatarUrl ?? '');
}

const PORTRAIT_PRESETS: Record<string, { bg: string; accent: string; hair: string; outfit: string; prop: string; variant?: 'female' | 'male' }> = {
  doctor: { bg: '#edf7fb', accent: '#4f9fc4', hair: '#242936', outfit: '#ffffff', prop: '+', variant: 'male' },
  pharmacist: { bg: '#f3f7ee', accent: '#8fb36c', hair: '#2f2630', outfit: '#ffffff', prop: 'Rx', variant: 'female' },
  vet: { bg: '#f7f1e8', accent: '#c58f55', hair: '#30241f', outfit: '#5f8fb0', prop: '+', variant: 'male' },
  judge: { bg: '#f4efe9', accent: '#b88a52', hair: '#252525', outfit: '#20242d', prop: '짠', variant: 'male' },
  lawyer: { bg: '#f2f4f8', accent: '#64748b', hair: '#2a2624', outfit: '#1f2937', prop: '짠', variant: 'female' },
  teacher: { bg: '#f4f8ee', accent: '#82a35d', hair: '#6b3f2b', outfit: '#f5f0df', prop: '2+2', variant: 'female' },
  counselor: { bg: '#f2f7f7', accent: '#62a7a6', hair: '#3d2e2a', outfit: '#506f7a', prop: '...', variant: 'female' },
  programmer: { bg: '#eef3fb', accent: '#5b7ec7', hair: '#242936', outfit: '#1e293b', prop: '</>', variant: 'male' },
  designer: { bg: '#fbf2f6', accent: '#c46b91', hair: '#3a2d2f', outfit: '#ffffff', prop: 'UI', variant: 'female' },
  stocktrader: { bg: '#f1f7f3', accent: '#40a873', hair: '#2c2a28', outfit: '#183024', prop: '$', variant: 'male' },
  writer: { bg: '#f7f3ea', accent: '#a9824a', hair: '#4a3327', outfit: '#efe7d7', prop: 'Aa', variant: 'female' },
  architect: { bg: '#eef4f7', accent: '#4d8aa7', hair: '#2e2b29', outfit: '#263746', prop: 'A1', variant: 'male' },
  medical: { bg: '#edf7fb', accent: '#4f9fc4', hair: '#34303a', outfit: '#ffffff', prop: '+', variant: 'female' },
  legal: { bg: '#f4efe9', accent: '#b88a52', hair: '#2c2927', outfit: '#20242d', prop: '짠', variant: 'male' },
  finance: { bg: '#eff7f3', accent: '#3e9f70', hair: '#262626', outfit: '#203026', prop: '$', variant: 'female' },
  history: { bg: '#f6efe5', accent: '#ad8254', hair: '#6b4b37', outfit: '#5c4637', prop: 'H', variant: 'male' },
  philosophy: { bg: '#f2f0f7', accent: '#7d6aa8', hair: '#54433a', outfit: '#44384f', prop: '?', variant: 'male' },
  psychology: { bg: '#f6f0f7', accent: '#a66ca8', hair: '#3f2d38', outfit: '#ffffff', prop: '?', variant: 'female' },
};

function portraitPreset(expert: Expert) {
  if (PORTRAIT_PRESETS[expert.id]) return PORTRAIT_PRESETS[expert.id];
  if (expert.category === 'specialist') {
    return { bg: '#eff4fb', accent: '#5577b6', hair: '#2f2f38', outfit: '#ffffff', prop: 'EX', variant: 'female' as const };
  }
  if (expert.category === 'fictional' || expert.category === 'mythology') {
    return { bg: '#f5f0fb', accent: '#8b6ac8', hair: '#3a2d4f', outfit: '#4a3d69', prop: 'CH', variant: 'male' as const };
  }
  return { bg: '#f3f4f6', accent: '#64748b', hair: '#2f333a', outfit: '#ffffff', prop: 'AI', variant: 'female' as const };
}

function CustomPortrait({ expert, className }: { expert: Expert; className?: string }) {
  const preset = portraitPreset(expert);
  const isFemale = preset.variant === 'female';

  if (expert.avatarUrl && isPhotoAsset(expert)) {
    return (
      <img
        src={expert.avatarUrl}
        alt=""
        className={cn('h-full w-full rounded-[inherit] object-cover object-center', className)}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn('relative h-full w-full overflow-hidden rounded-[inherit]', className)}
      aria-hidden
    >
      <svg className="h-full w-full" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="presentation">
        <defs>
          <linearGradient id={`scene-${expert.id}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor={preset.bg} />
            <stop offset="0.55" stopColor="#ffffff" />
            <stop offset="1" stopColor={preset.bg} />
          </linearGradient>
          <linearGradient id={`coat-${expert.id}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor={preset.outfit} />
            <stop offset="1" stopColor={preset.outfit === '#ffffff' ? '#e8eef6' : '#111827'} />
          </linearGradient>
        </defs>
        <rect width="320" height="180" fill={`url(#scene-${expert.id})`} />
        <rect x="18" y="22" width="284" height="105" rx="22" fill="#ffffff" opacity="0.34" />
        <rect x="34" y="38" width="56" height="8" rx="4" fill="#ffffff" opacity="0.7" />
        <rect x="38" y="55" width="42" height="7" rx="4" fill="#ffffff" opacity="0.55" />
        <rect x="226" y="39" width="64" height="8" rx="4" fill="#ffffff" opacity="0.72" />
        <rect x="226" y="56" width="48" height="7" rx="4" fill="#ffffff" opacity="0.56" />
        <rect x="228" y="73" width="54" height="38" rx="13" fill="#ffffff" opacity="0.36" />
        <rect x="238" y="82" width="10" height="19" rx="3" fill={preset.accent} opacity="0.35" />
        <rect x="254" y="79" width="9" height="22" rx="3" fill={preset.accent} opacity="0.24" />
        <rect x="270" y="86" width="8" height="15" rx="3" fill={preset.accent} opacity="0.2" />
        <rect x="0" y="128" width="320" height="52" fill="#ffffff" opacity="0.43" />

        {isFemale ? (
          <path d="M124 72c0-31 72-32 72 0v38c0 22-17 38-36 38s-36-16-36-38z" fill={preset.hair} />
        ) : (
          <path d="M122 72c4-32 72-32 76 0l-9 28h-58z" fill={preset.hair} />
        )}
        <ellipse cx="160" cy="91" rx="34" ry="38" fill="#f0c7a4" />
        <path d="M128 83c13-4 26-11 37-25 9 16 20 22 32 25-2-31-70-40-69 0z" fill={preset.hair} />
        <circle cx="148" cy="94" r="3.2" fill="#263244" />
        <circle cx="172" cy="94" r="3.2" fill="#263244" />
        <path d="M151 110c6 5 13 5 19 0" stroke="#bc7664" strokeWidth="3" strokeLinecap="round" fill="none" />
        <rect x="151" y="126" width="18" height="16" rx="8" fill="#dfad8e" />
        <path d="M98 178c7-38 28-53 62-53s55 15 62 53z" fill={`url(#coat-${expert.id})`} />
        <path d="M127 134l33 44 33-44" fill="#ffffff" opacity="0.76" />
        <path d="M160 141v37" stroke={preset.accent} strokeWidth="8" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function matchesQuery(expert: Expert, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (expert.category === 'ai') {
    return matchesGeneralModelQuery(expert, query, providerLabel(expert), tagsForExpert(expert));
  }
  return [
    expert.name,
    expert.nameKo,
    expert.description,
    expert.openrouterModel ?? '',
    expert.subCategory ?? '',
    providerLabel(expert),
    expert.modelInfo?.provider ?? '',
    expert.modelInfo?.priceTier ?? '',
    String(expert.modelInfo?.contextLength ?? ''),
    ...(expert.modelInfo?.inputModalities ?? []),
    ...(expert.modelInfo?.outputModalities ?? []),
    ...tagsForExpert(expert),
  ].some((value) => value.toLowerCase().includes(q));
}

const CUSTOM_TONE_LABELS = [
  ['tone-friendly', '친절함'],
  ['tone-practical', '실무형'],
  ['tone-character', '캐릭터형'],
  ['tone-analytic', '분석형'],
  ['tone-creative', '창의형'],
] as const;

const CUSTOM_PURPOSE_LABELS = [
  ['purpose-consult', '문제 정리'],
  ['purpose-explain', '설명'],
  ['purpose-coach', '코칭'],
  ['purpose-interpret', '해석'],
  ['purpose-idea', '아이디어'],
  ['purpose-roleplay', '역할 대화'],
] as const;

const GENERAL_QUICK_FILTERS = [
  { id: 'all', label: '전체보기' },
  { id: 'favorites', label: '즐겨찾기' },
  { id: 'recommended', label: '추천' },
  { id: 'new', label: '신규 모델' },
  { id: 'flagship', label: '플래그십' },
  { id: 'fast', label: '빠른 응답' },
  { id: 'reasoning', label: '깊은 추론' },
  { id: 'coding', label: '코딩' },
  { id: 'low-cost', label: '저비용' },
  { id: 'long-context', label: '긴 컨텍스트' },
  { id: 'minor', label: '마이너 모델' },
  { id: 'search', label: '검색/출처' },
  { id: 'opensource', label: '로컬/오픈웨이트' },
] as const;

const CUSTOM_QUICK_FILTERS = [
  { id: 'all', label: '전체보기' },
  { id: 'favorites', label: '즐겨찾기' },
  { id: 'recommended', label: '추천' },
  { id: 'practical', label: '실무 자문' },
  { id: 'learning', label: '학습/설명' },
  { id: 'character-chat', label: '캐릭터 대화' },
  { id: 'viewpoint', label: '관점 토론' },
  { id: 'creative', label: '창작 아이디어' },
] as const;

const SORT_OPTIONS: Array<{ id: ExplorerSort; label: string }> = [
  { id: 'popular', label: '인기순' },
  { id: 'name', label: '이름순' },
  { id: 'reasoning', label: '추론력순' },
  { id: 'tokenUsage', label: '토큰 사용량순' },
  { id: 'speed', label: '속도순' },
  { id: 'coding', label: '코딩순' },
  { id: 'creativity', label: '창의성순' },
  { id: 'multilingual', label: '다국어순' },
];

const CUSTOM_SORT_OPTIONS = SORT_OPTIONS.filter((option) => option.id === 'popular' || option.id === 'name');

function getCustomToneIds(expert: Expert) {
  return [
    expert.category === 'fictional' || expert.category === 'mythology' ? 'tone-character' : null,
    expert.category === 'occupation' || expert.category === 'specialist' ? 'tone-practical' : null,
    expert.category === 'ideology' || expert.category === 'perspective' ? 'tone-analytic' : null,
    expert.category === 'lifestyle' ? 'tone-creative' : null,
    expert.category !== 'fictional' && expert.category !== 'mythology' ? 'tone-friendly' : null,
  ].filter(Boolean) as string[];
}

function getCustomPurposeIds(expert: Expert) {
  return [
    'purpose-consult',
    'purpose-explain',
    expert.category === 'occupation' || expert.category === 'specialist' || expert.category === 'lifestyle' ? 'purpose-coach' : null,
    expert.category === 'fictional' || expert.category === 'mythology' || expert.category === 'ideology' || expert.category === 'perspective' ? 'purpose-interpret' : null,
    expert.category === 'lifestyle' || expert.category === 'perspective' ? 'purpose-idea' : null,
    expert.category === 'fictional' || expert.category === 'mythology' ? 'purpose-roleplay' : null,
  ].filter(Boolean) as string[];
}

function buildFilterItems<T extends readonly (readonly [string, string])[]>(
  baseItems: Expert[],
  labels: T,
  getIds: (expert: Expert) => string[],
) {
  return labels
    .map(([id, label]) => ({
      id,
      label,
      count: baseItems.filter((expert) => getIds(expert).includes(id)).length,
    }))
    .filter((item) => item.count > 0);
}

function matchesAnyFilter(selected: Set<string>, values: string[]) {
  if (selected.size === 0) return true;
  return values.some((value) => selected.has(value));
}

function matchesQuickFilter(expert: Expert, tab: ExplorerTab, filterId: string) {
  if (tab === 'general') {
    return matchesGeneralQuickFilter(expert, filterId);
  }

  if (filterId === 'recommended') return CUSTOM_FEATURED_IDS.includes(expert.id);
  if (filterId === 'practical') return expert.category === 'occupation' || expert.category === 'specialist' || getCustomPurposeIds(expert).includes('purpose-coach');
  if (filterId === 'learning') return getCustomPurposeIds(expert).includes('purpose-explain') || expert.subCategory?.includes('교육') || expert.subCategory?.includes('과학');
  if (filterId === 'character-chat') return expert.category === 'fictional' || expert.category === 'mythology' || getCustomPurposeIds(expert).includes('purpose-roleplay');
  if (filterId === 'viewpoint') return expert.category === 'ideology' || expert.category === 'religion' || expert.category === 'perspective' || getCustomPurposeIds(expert).includes('purpose-interpret');
  if (filterId === 'creative') return expert.category === 'lifestyle' || getCustomPurposeIds(expert).includes('purpose-idea');
  return true;
}

function abilityValue(expert: Expert, sort: ExplorerSort) {
  const abilities = expert.abilities;
  if (sort === 'reasoning') return abilities?.reasoning ?? 0;
  if (sort === 'tokenUsage') return abilities?.contextWindow ?? 0;
  if (sort === 'speed') return abilities?.speed ?? 0;
  if (sort === 'coding') return abilities?.coding ?? 0;
  if (sort === 'creativity') return abilities?.creativity ?? 0;
  if (sort === 'multilingual') return abilities?.multilingual ?? 0;
  return 0;
}

function fallbackOrder(expert: Expert, tab: ExplorerTab) {
  if (tab === 'custom') {
    const featuredIndex = CUSTOM_FEATURED_IDS.indexOf(expert.id);
    if (featuredIndex >= 0) return featuredIndex;
    if (expert.category === 'occupation') return 200;
    if (expert.category === 'specialist') return 400;
    return 800;
  }

  const recommendedIndex = RECOMMENDED_MODEL_IDS.indexOf(expert.id);
  return recommendedIndex >= 0 ? recommendedIndex : 999;
}

const MODEL_ABILITY_LABELS = [
  ['coding', '코딩'],
  ['creativity', '창의성'],
  ['reasoning', '추론력'],
  ['math', '수학'],
  ['multilingual', '다국어'],
  ['speed', '속도'],
  ['costEfficiency', '비용효율'],
  ['contextWindow', '토큰용량'],
] as const;

function ModelStatsPanel({ expert }: { expert: Expert }) {
  const abilities = expert.abilities;
  const values = MODEL_ABILITY_LABELS.map(([key, label]) => ({
    key,
    label,
    value: abilities?.[key] ?? 60,
  }));
  const center = 82;
  const radius = 62;
  const polygon = values
    .map((item, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length;
      const r = radius * (item.value / 100);
      return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
    })
    .join(' ');
  const grid = [0.33, 0.66, 1].map((scale) =>
    values
      .map((_, index) => {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length;
        return `${center + Math.cos(angle) * radius * scale},${center + Math.sin(angle) * radius * scale}`;
      })
      .join(' '),
  );

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-100">
            <ExpertMedia expert={expert} mode="general" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-extrabold text-slate-950">{expert.nameKo}</span>
            <span className="mt-0.5 block truncate text-[12px] font-bold text-slate-400">{providerLabel(expert)}</span>
          </span>
        </div>
        <div className="mt-3 flex justify-center">
          <svg viewBox="0 0 164 164" className="h-[172px] w-[172px]" role="img" aria-label={`${expert.nameKo} 능력치 레이더`}>
            {grid.map((points, index) => (
              <polygon key={index} points={points} fill="none" stroke="#e2e8f0" strokeWidth="1" />
            ))}
            {values.map((_, index) => {
              const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length;
              return (
                <line
                  key={index}
                  x1={center}
                  y1={center}
                  x2={center + Math.cos(angle) * radius}
                  y2={center + Math.sin(angle) * radius}
                  stroke="#edf2f7"
                  strokeWidth="1"
                />
              );
            })}
            <polygon points={polygon} fill="rgba(79,70,229,0.16)" stroke="#4f46e5" strokeWidth="2.5" />
            <circle cx={center} cy={center} r="2.2" fill="#4f46e5" />
            {values.map((item, index) => {
              const angle = -Math.PI / 2 + (Math.PI * 2 * index) / values.length;
              const labelRadius = radius + 18;
              return (
                <text
                  key={item.key}
                  x={center + Math.cos(angle) * labelRadius}
                  y={center + Math.sin(angle) * labelRadius + 3}
                  textAnchor="middle"
                  className="fill-slate-500 text-[8.5px] font-bold"
                >
                  {item.label}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <h4 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">Model Stats</h4>
          <span className="rounded-full bg-white px-2 py-1 text-[10.5px] font-extrabold text-indigo-600 ring-1 ring-indigo-100">
            평균 {Math.round(values.reduce((sum, item) => sum + item.value, 0) / values.length)}
          </span>
        </div>
        <div className="space-y-2.5">
          {values.map((item) => (
            <div key={item.key} className="grid grid-cols-[58px_minmax(0,1fr)_28px] items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">{item.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-slate-200">
                <span
                  className="block h-full rounded-full bg-indigo-500"
                  style={{ width: `${item.value}%` }}
                />
              </span>
              <span className="text-right text-[11px] font-extrabold tabular-nums text-slate-700">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExpertMedia({ expert, mode, className }: { expert: Expert; mode: ExplorerTab; className?: string }) {
  const src = expert.avatarUrl;
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn(
          'block h-full w-full',
          mode === 'custom' && isPhotoAsset(expert) ? 'object-cover p-0' : mode === 'custom' ? 'object-contain p-3' : 'object-contain p-2',
          className,
        )}
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    <span className={cn('flex h-full w-full items-center justify-center text-3xl', className)}>
      {expert.icon}
    </span>
  );
}

function SmallTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-5 items-center rounded-md bg-slate-100 px-1.5 text-[10.5px] font-bold text-slate-600">
      {children}
    </span>
  );
}

function ExplorerCard({
  expert,
  tab,
  active,
  view,
  onPreview,
}: {
  expert: Expert;
  tab: ExplorerTab;
  active: boolean;
  view: ExplorerView;
  onPreview: () => void;
}) {
  if (view === 'list') {
    return (
      <button
        type="button"
        onClick={onPreview}
        className={cn(
          'relative flex min-h-[82px] w-full items-center gap-3 rounded-xl border bg-white p-3 text-left transition-all hover:border-slate-300 hover:shadow-[0_10px_24px_rgba(15,23,42,0.05)]',
          active ? 'border-indigo-400 bg-indigo-50/30 ring-2 ring-indigo-100' : 'border-slate-200',
        )}
      >
        <span className={cn('block shrink-0 overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-100', tab === 'custom' ? 'h-16 w-24' : 'h-14 w-14')}>
          {tab === 'custom' ? <CustomPortrait expert={expert} /> : <ExpertMedia expert={expert} mode={tab} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-extrabold text-slate-900">{expert.nameKo}</span>
          {tab === 'general' && (
            <span className="mt-0.5 block truncate text-[12px] font-semibold text-slate-400">{providerLabel(expert)}</span>
          )}
          <span className="mt-1 line-clamp-2 text-[12px] font-medium leading-relaxed text-slate-500">{expert.description}</span>
        </span>
      </button>
    );
  }

  if (tab === 'general') {
    return (
      <button
        type="button"
        onClick={onPreview}
        className={cn(
          'group relative flex h-[138px] w-full flex-col overflow-hidden rounded-[15px] border bg-white p-3 text-left shadow-[0_1px_0_rgba(15,23,42,0.025)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50/35 hover:shadow-[0_14px_28px_rgba(15,23,42,0.07)]',
          active ? 'border-indigo-400 bg-indigo-50/35 ring-2 ring-indigo-100' : 'border-slate-200/85',
        )}
      >
        <span className="flex min-h-[48px] items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-slate-50 ring-1 ring-slate-100 transition-colors group-hover:bg-white">
            <ExpertMedia expert={expert} mode={tab} />
          </span>
          <span className="min-w-0 flex-1 pt-0.5">
            <span className={cn('block line-clamp-2 break-keep text-[14px] font-extrabold leading-[1.12]', active ? 'text-indigo-700' : 'text-slate-950')}>
              {expert.nameKo}
            </span>
            <span className="mt-1.5 block truncate text-[11px] font-bold leading-none text-slate-400">{providerLabel(expert)}</span>
          </span>
        </span>
        <span className="mt-2 line-clamp-2 min-h-[31px] break-keep pr-1 text-[11.5px] font-medium leading-[1.36] text-slate-500">
          {expert.description}
        </span>
        <span className="mt-auto -mx-3 -mb-3 flex h-9 flex-nowrap items-center gap-1.5 overflow-hidden border-t border-slate-100 bg-slate-50/55 px-3">
          {tagsForExpert(expert).map((tag) => (
            <SmallTag key={tag}>{tag}</SmallTag>
          ))}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onPreview}
      className={cn(
        'group relative flex h-[190px] w-full flex-col overflow-hidden rounded-xl border bg-white p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_34px_rgba(15,23,42,0.07)]',
        active ? 'border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-100' : 'border-slate-200',
      )}
    >
      <span
        className={cn(
          'flex w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-100',
          tab === 'custom' ? 'aspect-[16/7]' : 'h-24 p-3',
        )}
      >
        <CustomPortrait expert={expert} />
      </span>
      <span className="mt-2 min-w-0">
        <span className={cn('block line-clamp-1 text-[14px] font-extrabold', active ? 'text-indigo-700' : 'text-slate-900')}>
          {expert.nameKo}
        </span>
      </span>
      <span className="mt-1 line-clamp-1 min-h-[17px] text-[11px] font-medium leading-relaxed text-slate-500">
        {expert.description}
      </span>
      <span className="mt-auto flex flex-wrap gap-1.5 pt-1.5">
        {tagsForExpert(expert).map((tag) => (
          <SmallTag key={tag}>{tag}</SmallTag>
        ))}
      </span>
    </button>
  );
}

function FilterGroup({
  title,
  items,
  selected,
  onChange,
}: {
  title: string;
  items: Array<{ id: string; label: string; count: number }>;
  selected: Set<string>;
  onChange: (id: string) => void;
}) {
  if (items.length === 0) return null;

  const activeCount = items.reduce((sum, item) => sum + (selected.has(item.id) ? 1 : 0), 0);

  return (
    <div className="border-b border-slate-100 py-3.5 last:border-b-0">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
          {title}
        </h4>
        {activeCount > 0 && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[9.5px] font-extrabold tabular-nums text-white">
            {activeCount}
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        {items.slice(0, 10).map((item) => {
          const active = selected.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-pressed={active}
              className={cn(
                'group flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors',
                active
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )}
            >
              <span
                className={cn(
                  'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                  active
                    ? 'border-indigo-500 bg-indigo-500 text-white'
                    : 'border-slate-300 bg-white group-hover:border-slate-400',
                )}
              >
                {active && <Check className="h-2 w-2" strokeWidth={3.2} />}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold">
                {item.label}
              </span>
              <span
                className={cn(
                  'shrink-0 text-[10.5px] font-bold tabular-nums',
                  active ? 'text-indigo-500' : 'text-slate-400',
                )}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ExplorerDetailPanel({
  expert,
  tab,
  selected,
  onStart,
}: {
  expert: Expert;
  tab: ExplorerTab;
  selected: boolean;
  onStart: () => void;
}) {
  const [detailTab, setDetailTab] = useState<'info' | 'stats'>('info');
  const tags = tagsForExpert(expert);
  const meta = tab === 'custom' ? getCustomMeta(expert) : getModelMeta(expert);
  const examples = expert.sampleQuestions?.slice(0, 3) ?? [
    `${expert.nameKo}에게 핵심만 물어볼래?`,
    `${expert.nameKo} 관점에서 비교해줘`,
    `${expert.nameKo}로 실전 조언을 받아볼래?`,
  ];
  const showStats = tab === 'general' && detailTab === 'stats';

  useEffect(() => {
    setDetailTab('info');
  }, [tab]);

  return (
    <aside className="flex h-full min-h-0 flex-col bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
        {tab === 'general' && (
          <div className="mb-3 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setDetailTab('info')}
              className={cn(
                'h-8 rounded-lg text-[12px] font-extrabold transition-all',
                detailTab === 'info'
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900',
              )}
            >
              정보
            </button>
            <button
              type="button"
              onClick={() => setDetailTab('stats')}
              className={cn(
                'h-8 rounded-lg text-[12px] font-extrabold transition-all',
                detailTab === 'stats'
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900',
              )}
            >
              스탯
            </button>
          </div>
        )}

        {showStats ? (
          <ModelStatsPanel expert={expert} />
        ) : (
          <>
            <div
              className={cn(
                'mx-auto flex w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-100',
                tab === 'custom' ? 'aspect-[16/10]' : 'aspect-square max-w-[88px] p-3',
              )}
            >
              {tab === 'custom' ? <CustomPortrait expert={expert} /> : <ExpertMedia expert={expert} mode={tab} />}
            </div>
            <div className="mt-3.5 text-center">
              <h3
                className={cn(
                  'font-extrabold tracking-tight text-slate-950',
                  tab === 'custom' ? 'truncate text-[21px]' : 'line-clamp-2 break-keep text-[20px] leading-tight',
                )}
              >
                {expert.nameKo}
              </h3>
              {tab === 'general' && (
                <p className="mt-0.5 text-[12.5px] font-semibold text-slate-400">{providerLabel(expert)}</p>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
              {tags.map((tag) => (
                <SmallTag key={tag}>{tag}</SmallTag>
              ))}
            </div>
            <p className="mt-3 text-center text-[12.5px] font-medium leading-relaxed text-slate-600">
              {expert.description}
            </p>
            <dl className="mt-3.5 grid grid-cols-1 gap-y-2 border-t border-slate-100 pt-3.5 text-[11.5px]">
              {meta.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <dt className="shrink-0 font-medium text-slate-400">{label}</dt>
                  <dd
                    className={cn(
                      'min-w-0 text-right font-bold text-slate-700',
                      tab === 'custom' ? 'truncate' : 'leading-snug',
                    )}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-3.5 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <h4 className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                {tab === 'custom' ? '이 AI와 잘 맞는 대화 예시' : '이 모델 활용 예시'}
              </h4>
              <div className="space-y-1.5">
                {examples.map((example) => (
                  <p key={example} className="flex gap-2 text-[11.5px] font-semibold leading-relaxed text-slate-600">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full bg-indigo-500 p-0.5 text-white" />
                    <span className="line-clamp-1">{example}</span>
                  </p>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="shrink-0 border-t border-slate-200/70 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onStart}
          className={cn(
            'flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[13.5px] font-extrabold text-white shadow-[0_12px_24px_-12px_rgba(15,23,42,0.45)] transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-300',
            selected ? 'bg-slate-900 hover:bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-500',
          )}
        >
          {tab === 'custom' ? '이 AI로 시작' : '이 모델로 시작'}
          <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>
    </aside>
  );
}

export function AllAiExplorerModal({
  experts,
  selectedIds,
  favoriteSet,
  initialTab,
  initialQuickFilter = null,
  onClose,
  onSelectExpert,
  onToggleFavorite,
}: {
  experts: Expert[];
  selectedIds: string[];
  favoriteSet: Set<string>;
  initialTab: ExplorerTab;
  initialQuickFilter?: HomeQuickFilterId | null;
  onClose: () => void;
  onSelectExpert: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const [tab, setTab] = useState<ExplorerTab>(initialTab);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ExplorerSort>('popular');
  const [view, setView] = useState<ExplorerView>('grid');
  const [page, setPage] = useState(1);
  const [brandFilters, setBrandFilters] = useState<Set<string>>(new Set());
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
  const [subFilters, setSubFilters] = useState<Set<string>>(new Set());
  const [traitFilters, setTraitFilters] = useState<Set<string>>(new Set());
  const [detailFilters, setDetailFilters] = useState<Set<string>>(new Set());
  const [quickFilters, setQuickFilters] = useState<Set<string>>(() => (initialQuickFilter ? new Set([initialQuickFilter]) : new Set()));
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const previousTabRef = useRef(tab);

  const baseItems = useMemo(() => {
    const items = tab === 'general'
      ? experts.filter(isVisibleGeneralTextModel)
      : experts.filter(isCustomExpert);

    return [...items].sort((a, b) => {
      if (sort === 'name') return a.nameKo.localeCompare(b.nameKo, 'ko');
      if (sort === 'popular') {
        const favoriteDelta = Number(favoriteSet.has(b.id)) - Number(favoriteSet.has(a.id));
        if (favoriteDelta !== 0) return favoriteDelta;
        return fallbackOrder(a, tab) - fallbackOrder(b, tab) || a.nameKo.localeCompare(b.nameKo, 'ko');
      }
      const abilityDelta = abilityValue(b, sort) - abilityValue(a, sort);
      return abilityDelta || fallbackOrder(a, tab) - fallbackOrder(b, tab) || a.nameKo.localeCompare(b.nameKo, 'ko');
    });
  }, [experts, favoriteSet, sort, tab]);

  const brandItems = useMemo(() => {
    if (tab !== 'general') return [];
    return BRAND_ORDER
      .map((brand) => ({
        id: brand,
        label: BRAND_LABEL[brand],
        count: baseItems.filter((expert) => MODEL_BRAND[expert.id] === brand).length,
      }))
      .filter((item) => item.count > 0);
  }, [baseItems, tab]);

  const categoryItems = useMemo(() => {
    if (tab !== 'custom') return [];
    return CUSTOM_CATEGORIES
      .map((category) => ({
        id: category,
        label: EXPERT_CATEGORY_LABELS[category],
        count: baseItems.filter((expert) => expert.category === category).length,
      }))
      .filter((item) => item.count > 0);
  }, [baseItems, tab]);

  const subItems = useMemo(() => {
    const counts = new Map<string, number>();
    baseItems.forEach((expert) => {
      if (!expert.subCategory) return;
      counts.set(expert.subCategory, (counts.get(expert.subCategory) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([id, count]) => ({ id, label: id, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ko'));
  }, [baseItems]);

  const traitItems = useMemo(() => {
    return tab === 'general'
      ? buildFilterItems(baseItems, GENERAL_TRAIT_LABELS, getGeneralTraitIds)
      : buildFilterItems(baseItems, CUSTOM_TONE_LABELS, getCustomToneIds);
  }, [baseItems, tab]);

  const detailItems = useMemo(() => {
    return tab === 'general'
      ? buildFilterItems(baseItems, GENERAL_SPEC_LABELS, getGeneralSpecIds)
      : buildFilterItems(baseItems, CUSTOM_PURPOSE_LABELS, getCustomPurposeIds);
  }, [baseItems, tab]);

  const filteredItems = useMemo(() => {
    return baseItems.filter((expert) => {
      if (!matchesQuery(expert, query)) return false;
      if (quickFilters.size > 0 && !Array.from(quickFilters).every((filterId) => (
        filterId === 'favorites'
          ? favoriteSet.has(expert.id)
          : matchesQuickFilter(expert, tab, filterId)
      ))) return false;
      if (tab === 'general' && brandFilters.size > 0 && !brandFilters.has(MODEL_BRAND[expert.id] ?? 'other')) return false;
      if (tab === 'custom' && categoryFilters.size > 0 && !categoryFilters.has(expert.category)) return false;
      if (subFilters.size > 0 && (!expert.subCategory || !subFilters.has(expert.subCategory))) return false;
      if (tab === 'general' && !matchesAnyFilter(traitFilters, getGeneralTraitIds(expert))) return false;
      if (tab === 'general' && !matchesAnyFilter(detailFilters, getGeneralSpecIds(expert))) return false;
      if (tab === 'custom' && !matchesAnyFilter(traitFilters, getCustomToneIds(expert))) return false;
      if (tab === 'custom' && !matchesAnyFilter(detailFilters, getCustomPurposeIds(expert))) return false;
      return true;
    });
  }, [baseItems, brandFilters, categoryFilters, detailFilters, favoriteSet, query, quickFilters, subFilters, tab, traitFilters]);

  const pageSize = tab === 'general' ? GENERAL_PAGE_SIZE : CUSTOM_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visibleItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);
  const selectedExpert = selectedIds[0] ? experts.find((expert) => expert.id === selectedIds[0]) : undefined;
  const [previewId, setPreviewId] = useState<string | null>(null);
  const selectedBelongsToTab = selectedExpert
    ? tab === 'general'
      ? isVisibleGeneralTextModel(selectedExpert)
      : isCustomExpert(selectedExpert)
    : false;
  const previewExpert = visibleItems.find((expert) => expert.id === previewId)
    ?? (selectedBelongsToTab && selectedExpert && visibleItems.some((expert) => expert.id === selectedExpert.id) ? selectedExpert : undefined)
    ?? visibleItems[0]
    ?? baseItems[0];
  const hasActiveFilters = quickFilters.size + brandFilters.size + categoryFilters.size + subFilters.size + traitFilters.size + detailFilters.size > 0;

  const clearFilters = () => {
    setBrandFilters(new Set());
    setCategoryFilters(new Set());
    setSubFilters(new Set());
    setTraitFilters(new Set());
    setDetailFilters(new Set());
    setQuickFilters(new Set());
  };

  const clearSearchAndFilters = () => {
    setQuery('');
    clearFilters();
  };

  useEffect(() => {
    setPage(1);
    setPreviewId(null);
    setMobileDetailOpen(false);
  }, [brandFilters, categoryFilters, detailFilters, query, quickFilters, sort, subFilters, tab, traitFilters]);

  useEffect(() => {
    if (previousTabRef.current === tab) return;
    previousTabRef.current = tab;
    setQuickFilters(new Set());
  }, [tab]);

  useEffect(() => {
    if (tab === 'custom' && !CUSTOM_SORT_OPTIONS.some((option) => option.id === sort)) {
      setSort('popular');
    }
  }, [sort, tab]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFacetFilter = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setQuickFilters(new Set());
    toggleSet(setter, id);
  };

  const togglePreset = (id: string) => {
    if (id === 'all') {
      clearFilters();
      return;
    }
    setBrandFilters(new Set());
    setCategoryFilters(new Set());
    setSubFilters(new Set());
    setTraitFilters(new Set());
    setDetailFilters(new Set());
    setQuickFilters((prev) => (prev.has(id) ? new Set() : new Set([id])));
  };

  const startWithExpert = (expert: Expert) => {
    onSelectExpert(expert.id);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/45 px-4 py-5 text-slate-950 backdrop-blur-sm">
      <div className="flex h-[min(860px,calc(100vh-40px))] min-h-0 w-full max-w-[1500px] flex-col overflow-hidden rounded-[22px] border border-white/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.32)] ring-1 ring-slate-950/10">
        <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200/70 bg-slate-50/80 px-5 py-3 sm:flex-nowrap">
          <div>
            <h2 className="sr-only">전체 AI 탐색</h2>
          </div>
          <div className="flex w-full shrink-0 rounded-full border border-slate-200 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.05)] sm:w-auto">
            <button
              type="button"
              onClick={() => setTab('general')}
              className={cn(
                'flex h-9 flex-1 items-center justify-center rounded-full px-4 text-[12.5px] font-extrabold transition-all sm:flex-none sm:px-6',
                tab === 'general'
                  ? 'bg-indigo-600 text-white shadow-[0_8px_18px_rgba(79,70,229,0.18)]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
              )}
            >
              일반 모델
            </button>
            <button
              type="button"
              onClick={() => setTab('custom')}
              className={cn(
                'flex h-9 flex-1 items-center justify-center rounded-full px-4 text-[12.5px] font-extrabold transition-all sm:flex-none sm:px-6',
                tab === 'custom'
                  ? 'bg-indigo-600 text-white shadow-[0_8px_18px_rgba(79,70,229,0.18)]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
              )}
            >
              커스텀 모델
            </button>
          </div>
          <div className="relative order-3 min-w-0 flex-[1_0_100%] sm:order-none sm:flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tab === 'general' ? '모델 이름, 제공사, 특징, 태그 검색...' : '모델 이름, 역할, 직업, 키워드 검색...'}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-[13px] font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
            />
          </div>
          <button type="button" onClick={() => setMobileFilterOpen(true)} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[12px] font-black text-slate-700 lg:hidden">
            <Filter className="h-4 w-4" />
            필터
          </button>
          <div className="hidden h-11 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 sm:flex">
            <button type="button" onClick={() => setView('grid')} className={cn('flex h-9 w-9 items-center justify-center rounded-lg', view === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400')}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setView('list')} className={cn('flex h-9 w-9 items-center justify-center rounded-lg', view === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400')}>
              <List className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white hover:text-slate-900"
            aria-label="닫기"
            title="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 bg-white lg:grid-cols-[208px_minmax(0,1fr)_286px] xl:grid-cols-[220px_minmax(0,1fr)_300px]">
          <aside className="hidden min-h-0 overflow-y-auto border-r border-slate-200/70 bg-slate-50/65 px-4 lg:block">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-slate-50/95 py-3.5 backdrop-blur">
              <h3 className="text-[12.5px] font-extrabold tracking-tight text-slate-900">필터</h3>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-6 items-center rounded-full bg-slate-200/70 px-2 text-[10.5px] font-bold text-slate-600 transition-colors hover:bg-slate-300 hover:text-slate-900"
                >
                  초기화
                </button>
              )}
            </div>
            {tab === 'general' ? (
              <>
                <FilterGroup title="제공사" items={brandItems} selected={brandFilters} onChange={(id) => toggleFacetFilter(setBrandFilters, id)} />
                <FilterGroup title="특징" items={traitItems} selected={traitFilters} onChange={(id) => toggleFacetFilter(setTraitFilters, id)} />
                <FilterGroup title="조건" items={detailItems} selected={detailFilters} onChange={(id) => toggleFacetFilter(setDetailFilters, id)} />
              </>
            ) : (
              <>
                <FilterGroup title="유형" items={categoryItems} selected={categoryFilters} onChange={(id) => toggleFacetFilter(setCategoryFilters, id)} />
                <FilterGroup title="분야" items={subItems} selected={subFilters} onChange={(id) => toggleFacetFilter(setSubFilters, id)} />
                <FilterGroup title="말투" items={traitItems} selected={traitFilters} onChange={(id) => toggleFacetFilter(setTraitFilters, id)} />
                <FilterGroup title="목적" items={detailItems} selected={detailFilters} onChange={(id) => toggleFacetFilter(setDetailFilters, id)} />
              </>
            )}
          </aside>

          <main className="flex min-h-0 flex-col border-r border-slate-200/70 bg-white px-3 py-3.5 xl:px-3.5">
            <div className="mb-3 flex shrink-0 items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/70 px-2.5 py-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="shrink-0 px-1 text-[11px] font-extrabold text-slate-400">
                  프리셋
                </span>
                {(tab === 'general' ? GENERAL_QUICK_FILTERS : CUSTOM_QUICK_FILTERS).map((filter) => {
                  const active = filter.id === 'all' ? !hasActiveFilters : quickFilters.has(filter.id);
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => togglePreset(filter.id)}
                      aria-pressed={active}
                      className={cn(
                        'h-7 shrink-0 rounded-full px-3 text-[11.5px] font-extrabold transition-all',
                        active
                          ? 'bg-indigo-600 text-white shadow-[0_8px_18px_rgba(79,70,229,0.18)]'
                          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 hover:text-slate-950',
                      )}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
              <label className="relative hidden shrink-0 items-center sm:flex">
                <span className="sr-only">정렬</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as ExplorerSort)}
                  className="h-8 appearance-none rounded-full border border-slate-200 bg-white pl-3.5 pr-8 text-[11.5px] font-extrabold text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
                >
                  {(tab === 'custom' ? CUSTOM_SORT_OPTIONS : SORT_OPTIONS).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-slate-400" />
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {visibleItems.length === 0 ? (
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-5 text-center">
                  <p className="text-[14px] font-black text-slate-500">검색 결과가 없습니다.</p>
                  <p className="mt-1 max-w-[320px] text-[12px] font-semibold leading-relaxed text-slate-400">
                    검색어를 줄이거나 선택한 필터를 초기화하면 더 많은 모델을 볼 수 있습니다.
                  </p>
                  {(query.trim() || hasActiveFilters) && (
                    <button
                      type="button"
                      onClick={clearSearchAndFilters}
                      className="mt-3 inline-flex h-9 items-center rounded-lg bg-slate-900 px-3.5 text-[12px] font-black text-white transition-colors hover:bg-slate-700"
                    >
                      검색/필터 초기화
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className={cn(
                    view === 'grid'
                      ? 'grid auto-rows-fr grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
                      : 'grid grid-cols-1 gap-2.5',
                  )}
                >
                  {visibleItems.map((expert) => (
                    <div key={expert.id} className="group/card relative min-w-0">
                      <ExplorerCard
                        expert={expert}
                        tab={tab}
                        active={previewExpert?.id === expert.id}
                        view={view}
                        onPreview={() => {
                          setPreviewId(expert.id);
                          setMobileDetailOpen(true);
                        }}
                      />
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleFavorite(expert.id);
                        }}
                        className={cn(
                          'absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border bg-white/95 opacity-0 shadow-sm backdrop-blur transition-all duration-150 hover:-translate-y-0.5 focus-visible:opacity-100 group-hover/card:opacity-100',
                          favoriteSet.has(expert.id)
                            ? 'border-amber-200 text-amber-500'
                            : 'border-slate-200 text-slate-300 hover:border-amber-200 hover:text-amber-500',
                        )}
                        aria-label={favoriteSet.has(expert.id) ? `${expert.nameKo} 즐겨찾기 제거` : `${expert.nameKo} 즐겨찾기 추가`}
                      >
                        <Bookmark className="h-3.5 w-3.5" fill={favoriteSet.has(expert.id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 flex shrink-0 flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30" disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                  const n = index + 1;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={cn('hidden h-8 w-8 items-center justify-center rounded-lg text-[12px] font-black sm:flex', page === n ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-slate-100')}
                    >
                      {n}
                    </button>
                  );
                })}
                <span className="px-2 text-[12px] font-black text-slate-500 sm:hidden">{page} / {totalPages}</span>
                <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30" disabled={page >= totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </main>

          {previewExpert && (
            <div className="hidden min-h-0 lg:block">
              <ExplorerDetailPanel
                expert={previewExpert}
                tab={previewExpert.category === 'ai' ? 'general' : 'custom'}
                selected={selectedIds.includes(previewExpert.id)}
                onStart={() => startWithExpert(previewExpert)}
              />
            </div>
          )}
        </div>

        {mobileFilterOpen && (
          <div className="fixed inset-0 z-[230] bg-slate-950/30 lg:hidden" onClick={() => setMobileFilterOpen(false)}>
            <div className="absolute inset-x-3 bottom-3 max-h-[78vh] overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[15px] font-black text-slate-950">필터</h3>
                <div className="flex items-center gap-1.5">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex h-8 items-center rounded-lg bg-slate-100 px-2.5 text-[11px] font-black text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
                    >
                      초기화
                    </button>
                  )}
                  <button type="button" onClick={() => setMobileFilterOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="필터 닫기">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {tab === 'general' ? (
                <>
                  <FilterGroup title="제공사" items={brandItems} selected={brandFilters} onChange={(id) => toggleFacetFilter(setBrandFilters, id)} />
                  <FilterGroup title="특징" items={traitItems} selected={traitFilters} onChange={(id) => toggleFacetFilter(setTraitFilters, id)} />
                  <FilterGroup title="조건" items={detailItems} selected={detailFilters} onChange={(id) => toggleFacetFilter(setDetailFilters, id)} />
                </>
              ) : (
                <>
                  <FilterGroup title="유형" items={categoryItems} selected={categoryFilters} onChange={(id) => toggleFacetFilter(setCategoryFilters, id)} />
                  <FilterGroup title="분야" items={subItems} selected={subFilters} onChange={(id) => toggleFacetFilter(setSubFilters, id)} />
                  <FilterGroup title="말투" items={traitItems} selected={traitFilters} onChange={(id) => toggleFacetFilter(setTraitFilters, id)} />
                  <FilterGroup title="목적" items={detailItems} selected={detailFilters} onChange={(id) => toggleFacetFilter(setDetailFilters, id)} />
                </>
              )}
            </div>
          </div>
        )}

        {previewExpert && mobileDetailOpen && (
          <div className="fixed inset-0 z-[230] bg-slate-950/30 lg:hidden" onClick={() => setMobileDetailOpen(false)}>
            <div className="absolute inset-x-3 bottom-3 max-h-[78vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => setMobileDetailOpen(false)} className="mb-2 ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-lg" aria-label="상세 닫기">
                <X className="h-5 w-5" />
              </button>
            <ExplorerDetailPanel
              expert={previewExpert}
              tab={previewExpert.category === 'ai' ? 'general' : 'custom'}
              selected={selectedIds.includes(previewExpert.id)}
              onStart={() => startWithExpert(previewExpert)}
            />
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function GeneralAiHome({
  experts,
  selectedIds,
  autoAssign = false,
  favoriteIds,
  favoriteSet,
  onSelectExpert,
  onRecommendSelect,
  onToggleFavorite,
  input,
}: GeneralAiHomeProps) {
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [explorerTab, setExplorerTab] = useState<ExplorerTab>('general');
  const [explorerQuickFilter, setExplorerQuickFilter] = useState<HomeQuickFilterId | null>(null);
  const [activeHomeTab, setActiveHomeTab] = useState<HomeTabId>('favorites');
  const [customFilter, setCustomFilter] = useState<CustomHomeFilter>('all');
  const selectedId = selectedIds[0];

  const favoriteExperts = useMemo(() => {
    const byId = new Map(experts.map((expert) => [expert.id, expert]));
    return favoriteIds
      .map((id) => byId.get(id))
      .filter((expert): expert is Expert => Boolean(expert));
  }, [experts, favoriteIds]);

  const customExperts = useMemo(() => {
    const featured = orderExpertsByIds(experts, CUSTOM_FEATURED_IDS);
    const rest = experts.filter((expert) => isCustomExpert(expert));
    return dedupeExperts([...featured, ...rest]).filter((expert) => customHomeFilterMatches(expert, customFilter));
  }, [experts, customFilter]);

  const homeTiles = useMemo<HomeTile[]>(() => {
    const fastExperts = dedupeExperts([
      ...orderExpertsByIds(experts, SELECTION_FAST_MODEL_IDS),
      ...experts
        .filter((expert) => isVisibleGeneralTextModel(expert) && isFastModel(expert))
        .sort((a, b) => (b.abilities?.speed ?? 0) - (a.abilities?.speed ?? 0)),
    ]).filter(isVisibleGeneralTextModel);

    const base =
      activeHomeTab === 'favorites'
        ? favoriteExperts
        : activeHomeTab === 'recommended'
          ? orderExpertsByIds(experts, RECOMMENDED_MODEL_IDS).filter(isVisibleGeneralTextModel)
          : activeHomeTab === 'fast'
            ? fastExperts
            : activeHomeTab === 'reasoning'
              ? orderExpertsByIds(experts, REASONING_MODEL_IDS).filter(isVisibleGeneralTextModel)
              : activeHomeTab === 'custom'
                ? customExperts
                : orderExpertsByIds(experts, DEFAULT_MODEL_IDS);

    const tiles: HomeTile[] = activeHomeTab === 'favorites' || activeHomeTab === 'recommended'
      ? [{ kind: 'recommend' }]
      : [];

    dedupeExperts(base).slice(0, HOME_GRID_LIMIT).forEach((expert) => {
      tiles.push({ kind: 'expert', expert });
    });
    tiles.push({ kind: 'openAll' });
    return tiles;
  }, [activeHomeTab, customExperts, experts, favoriteExperts]);

  const brandCounts = useMemo(() => {
    const counts = new Map<string, number>();
    homeTiles.forEach((tile) => {
      if (tile.kind !== 'expert') return;
      const brand = MODEL_BRAND[tile.expert.id] ?? tile.expert.category;
      counts.set(brand, (counts.get(brand) ?? 0) + 1);
    });
    return counts;
  }, [homeTiles]);

  const openExplorer = (tab: ExplorerTab = activeHomeTab === 'custom' ? 'custom' : 'general') => {
    setExplorerTab(tab);
    setExplorerQuickFilter(tab === 'general' ? HOME_TAB_QUICK_FILTER[activeHomeTab] ?? null : null);
    setExplorerOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-[920px] text-left">
      <section className="relative px-2 pb-1 pt-1 sm:px-0">
        <style>
          {`
            @keyframes homeCardIn {
              from { opacity: 0; transform: translateY(8px) scale(.97); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}
        </style>

        <div className="mx-auto max-w-[720px] text-center">
          <h2 className="text-[25px] font-black leading-tight tracking-tight text-slate-950 sm:text-[31px]">
            모든 AI 챗봇을 한곳에서 원하는 대로 골라 쓰세요
          </h2>
          <p className="mt-2 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
            GPT, Claude, Gemini 등 원하는 AI를 골라 자유롭게 대화하세요
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/92 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-100 bg-white/80 px-3 py-2">
            {HOME_TABS.map((tab) => {
              const active = activeHomeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveHomeTab(tab.id)}
                  className={cn(
                    'flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-black transition-all',
                    active
                      ? 'bg-blue-50 text-blue-600 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.12)]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                  )}
                >
                  {tab.label}
                  {tab.id === 'custom' && <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>

          {activeHomeTab === 'custom' && (
            <div className="flex gap-1 overflow-x-auto border-b border-slate-100 bg-slate-50/70 px-4 py-2">
              {CUSTOM_HOME_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setCustomFilter(filter.id)}
                  className={cn(
                    'h-7 shrink-0 rounded-full px-3 text-[11px] font-black transition-colors',
                    customFilter === filter.id ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:bg-white hover:text-slate-900',
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid max-h-[238px] grid-cols-4 gap-x-2 gap-y-3 overflow-hidden px-5 pb-5 pt-4 sm:grid-cols-6 sm:px-7 md:grid-cols-8">
            {homeTiles.map((tile, index) => {
              if (tile.kind === 'recommend') {
                return (
                  <button
                    key="recommend-ai"
                    type="button"
                    onClick={onRecommendSelect}
                    className="group relative flex min-h-[88px] flex-col items-center justify-start rounded-2xl px-2 py-2 text-center transition-all hover:bg-slate-50"
                    style={{ animation: `homeCardIn 260ms ease-out ${index * 35}ms both` }}
                    aria-pressed={autoAssign}
                  >
                    <span
                      className={cn(
                        'relative flex h-12 w-12 items-center justify-center rounded-2xl border bg-white text-blue-600 shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md',
                        autoAssign ? 'border-blue-500 ring-4 ring-blue-100' : 'border-slate-200',
                      )}
                    >
                      <Sparkles className="h-6 w-6" />
                    </span>
                    <span className={cn('mt-2 max-w-full truncate text-[12px] font-black', autoAssign ? 'text-blue-600' : 'text-slate-700')}>
                      추천 AI
                    </span>
                  </button>
                );
              }

              if (tile.kind === 'openAll') {
                return (
                  <button
                    key="open-all-models"
                    type="button"
                    onClick={() => openExplorer()}
                    className="group flex min-h-[88px] flex-col items-center justify-start rounded-2xl border border-dashed border-slate-200 px-2 py-2 text-center transition-all hover:border-blue-200 hover:bg-blue-50/40"
                    style={{ animation: `homeCardIn 260ms ease-out ${index * 35}ms both` }}
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                      <LayoutGrid className="h-5 w-5" />
                    </span>
                    <span className="mt-2 max-w-full truncate text-[12px] font-black text-slate-700 group-hover:text-blue-600">
                      모든 모델
                    </span>
                  </button>
                );
              }

              const expert = tile.expert;
              const active = !autoAssign && selectedId === expert.id;
              const favorite = favoriteSet.has(expert.id);
              const brandKey = MODEL_BRAND[expert.id] ?? expert.category;
              const label = homeTileLabel(expert, (brandCounts.get(brandKey) ?? 0) > 1);

              return (
                <div
                  key={expert.id}
                  className="group relative"
                  style={{ animation: `homeCardIn 260ms ease-out ${index * 35}ms both` }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectExpert(expert.id)}
                    className="flex min-h-[88px] w-full flex-col items-center justify-start rounded-2xl px-2 py-2 text-center transition-all hover:bg-slate-50"
                  >
                    <span
                      className={cn(
                        'relative flex h-12 w-12 items-center justify-center rounded-2xl border bg-white p-2.5 shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md',
                        active ? 'border-blue-500 ring-4 ring-blue-100' : 'border-slate-100',
                      )}
                    >
                      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl">
                        {expert.category === 'ai' ? <ExpertMedia expert={expert} mode="general" /> : <CustomPortrait expert={expert} />}
                      </span>
                      {active && (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                    </span>
                    <span className={cn('mt-2 max-w-full truncate text-[12px] font-black', active ? 'text-blue-600' : 'text-slate-600')}>
                      {label}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(expert.id)}
                    className={cn(
                      'absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full transition-all',
                      favorite ? 'text-amber-400 opacity-100' : 'text-slate-300 opacity-0 hover:text-amber-400 group-hover:opacity-100',
                    )}
                    aria-label={favorite ? `${expert.nameKo} 즐겨찾기 제거` : `${expert.nameKo} 즐겨찾기 추가`}
                  >
                    <Star className="h-3.5 w-3.5" fill={favorite ? 'currentColor' : 'none'} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white/95 shadow-[0_18px_46px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/90 backdrop-blur">
          {input}
        </div>
      </section>

      {explorerOpen && (
        <AllAiExplorerModal
          experts={experts}
          selectedIds={selectedIds}
          favoriteSet={favoriteSet}
          initialTab={explorerTab}
          initialQuickFilter={explorerQuickFilter}
          onClose={() => setExplorerOpen(false)}
          onSelectExpert={onSelectExpert}
          onToggleFavorite={onToggleFavorite}
        />
      )}
    </div>
  );
}
