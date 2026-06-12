import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
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
  Plus,
  Search,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import type { Expert, ExpertCategory } from '@/types/expert';
import { EXPERT_CATEGORY_LABELS, EXPERT_SUB_CATEGORIES } from '@/types/expert';
import {
  BRAND_LABEL,
  BRAND_ORDER,
  MODEL_BRAND,
  MODEL_IS_OPENSOURCE,
} from '@/lib/modelTaxonomy';
import { REASONING_MODEL_IDS, RECOMMENDED_MODEL_IDS } from '@/lib/modelTaxonomy';
import { cn } from '@/lib/utils';

type ExplorerTab = 'general' | 'custom';
type ExplorerView = 'grid' | 'list';

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

const PAGE_SIZE = 12;

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

const HOME_FAVORITE_LIMIT = 7;

type HomeTabId = 'favorites' | 'recommended' | 'fast' | 'reasoning' | 'all' | 'custom';
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
  const brand = MODEL_BRAND[expert.id];
  if (!brand) return 'AI 모델';
  return BRAND_LABEL[brand];
}

function tagsForExpert(expert: Expert) {
  if (expert.category === 'ai') {
    const brand = MODEL_BRAND[expert.id];
    const tags = [
      expert.abilities?.reasoning && expert.abilities.reasoning >= 85 ? '추론' : null,
      expert.abilities?.speed && expert.abilities.speed >= 85 ? '빠름' : null,
      MODEL_IS_OPENSOURCE.has(expert.id) ? '오픈소스' : null,
      brand === 'perplexity' ? '검색' : null,
      expert.description.includes('코딩') ? '코딩' : null,
    ].filter(Boolean) as string[];
    return (tags.length > 0 ? tags : ['범용', '대화', 'AI']).slice(0, 3);
  }

  const categoryLabel = EXPERT_CATEGORY_LABELS[expert.category] ?? '커스텀';
  const tone = expert.category === 'occupation' ? '실무형' : expert.category === 'fictional' ? '캐릭터' : '전문가';
  return [expert.subCategory ?? categoryLabel, tone, '상담'].slice(0, 3);
}

function getCustomMeta(expert: Expert) {
  return [
    ['유형', EXPERT_CATEGORY_LABELS[expert.category] ?? '커스텀'],
    ['분야', expert.subCategory ?? '전문 분야'],
    ['말투', expert.category === 'fictional' ? '개성형' : '친절함'],
    ['목적', expert.category === 'occupation' ? '상담, 설명, 코칭' : '대화, 해석, 조언'],
    ['전문성', expert.category === 'occupation' || expert.category === 'specialist' ? '실무' : '역할 기반'],
    ['업데이트', '2025년 5월'],
    ['대화 언어', '한국어'],
    ['응답 스타일', expert.category === 'fictional' ? '캐릭터에 맞는 대화' : '정확하고 친절한 설명'],
  ];
}

function getModelMeta(expert: Expert) {
  const brand = MODEL_BRAND[expert.id];
  return [
    ['제공사', brand ? BRAND_LABEL[brand] : '기타'],
    ['분야', expert.description.includes('코딩') ? '범용, 추론, 코딩' : '범용, 추론, 대화'],
    ['강점', tagsForExpert(expert).join(', ')],
    ['속도', expert.abilities?.speed && expert.abilities.speed >= 85 ? '빠름' : '보통'],
    ['가격', MODEL_IS_OPENSOURCE.has(expert.id) ? '무료 포함' : '유료'],
    ['컨텍스트 길이', expert.abilities?.contextWindow && expert.abilities.contextWindow >= 85 ? '1M+' : '128K 토큰'],
    ['출시일', '2025년 5월'],
    ['모델 유형', MODEL_IS_OPENSOURCE.has(expert.id) ? '오픈소스' : '폐쇄형'],
  ];
}

function isCustomExpert(expert: Expert) {
  return CUSTOM_CATEGORIES.includes(expert.category);
}

function isPhotoAsset(expert: Expert) {
  return /\.(jpe?g|webp)$/i.test(expert.avatarUrl ?? '');
}

const PORTRAIT_PRESETS: Record<string, { bg: string; accent: string; hair: string; outfit: string; prop: string; variant?: 'female' | 'male' }> = {
  doctor: { bg: '#edf7fb', accent: '#4f9fc4', hair: '#242936', outfit: '#ffffff', prop: '+', variant: 'male' },
  pharmacist: { bg: '#f3f7ee', accent: '#8fb36c', hair: '#2f2630', outfit: '#ffffff', prop: 'Rx', variant: 'female' },
  vet: { bg: '#f7f1e8', accent: '#c58f55', hair: '#30241f', outfit: '#5f8fb0', prop: '+', variant: 'male' },
  judge: { bg: '#f4efe9', accent: '#b88a52', hair: '#252525', outfit: '#20242d', prop: '§', variant: 'male' },
  lawyer: { bg: '#f2f4f8', accent: '#64748b', hair: '#2a2624', outfit: '#1f2937', prop: '§', variant: 'female' },
  teacher: { bg: '#f4f8ee', accent: '#82a35d', hair: '#6b3f2b', outfit: '#f5f0df', prop: '2+2', variant: 'female' },
  counselor: { bg: '#f2f7f7', accent: '#62a7a6', hair: '#3d2e2a', outfit: '#506f7a', prop: '...', variant: 'female' },
  programmer: { bg: '#eef3fb', accent: '#5b7ec7', hair: '#242936', outfit: '#1e293b', prop: '</>', variant: 'male' },
  designer: { bg: '#fbf2f6', accent: '#c46b91', hair: '#3a2d2f', outfit: '#ffffff', prop: '◆', variant: 'female' },
  stocktrader: { bg: '#f1f7f3', accent: '#40a873', hair: '#2c2a28', outfit: '#183024', prop: '↗', variant: 'male' },
  writer: { bg: '#f7f3ea', accent: '#a9824a', hair: '#4a3327', outfit: '#efe7d7', prop: '✎', variant: 'female' },
  architect: { bg: '#eef4f7', accent: '#4d8aa7', hair: '#2e2b29', outfit: '#263746', prop: '⌁', variant: 'male' },
  medical: { bg: '#edf7fb', accent: '#4f9fc4', hair: '#34303a', outfit: '#ffffff', prop: '+', variant: 'female' },
  legal: { bg: '#f4efe9', accent: '#b88a52', hair: '#2c2927', outfit: '#20242d', prop: '§', variant: 'male' },
  finance: { bg: '#eff7f3', accent: '#3e9f70', hair: '#262626', outfit: '#203026', prop: '$', variant: 'female' },
  history: { bg: '#f6efe5', accent: '#ad8254', hair: '#6b4b37', outfit: '#5c4637', prop: '⌛', variant: 'male' },
  philosophy: { bg: '#f2f0f7', accent: '#7d6aa8', hair: '#54433a', outfit: '#44384f', prop: '?', variant: 'male' },
  psychology: { bg: '#f6f0f7', accent: '#a66ca8', hair: '#3f2d38', outfit: '#ffffff', prop: 'ψ', variant: 'female' },
};

function portraitPreset(expert: Expert) {
  if (PORTRAIT_PRESETS[expert.id]) return PORTRAIT_PRESETS[expert.id];
  if (expert.category === 'specialist') {
    return { bg: '#eff4fb', accent: '#5577b6', hair: '#2f2f38', outfit: '#ffffff', prop: '•', variant: 'female' as const };
  }
  if (expert.category === 'fictional' || expert.category === 'mythology') {
    return { bg: '#f5f0fb', accent: '#8b6ac8', hair: '#3a2d4f', outfit: '#4a3d69', prop: '✦', variant: 'male' as const };
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
  return [
    expert.name,
    expert.nameKo,
    expert.description,
    expert.subCategory ?? '',
    providerLabel(expert),
    ...tagsForExpert(expert),
  ].some((value) => value.toLowerCase().includes(q));
}

const GENERAL_TRAIT_LABELS = [
  ['reasoning', '추론'],
  ['fast', '빠른 응답'],
  ['coding', '코딩'],
  ['search', '검색/리서치'],
  ['opensource', '오픈소스'],
] as const;

const GENERAL_SPEC_LABELS = [
  ['speed-fast', '빠름'],
  ['speed-normal', '보통 속도'],
  ['price-free', '무료 포함'],
  ['price-paid', '유료'],
  ['context-long', '긴 컨텍스트'],
  ['context-standard', '표준 컨텍스트'],
] as const;

const CUSTOM_TONE_LABELS = [
  ['tone-friendly', '친절함'],
  ['tone-practical', '실무형'],
  ['tone-character', '캐릭터형'],
  ['tone-analytic', '분석형'],
  ['tone-creative', '창의형'],
] as const;

const CUSTOM_PURPOSE_LABELS = [
  ['purpose-consult', '상담'],
  ['purpose-explain', '설명'],
  ['purpose-coach', '코칭'],
  ['purpose-interpret', '해석'],
  ['purpose-idea', '아이디어'],
  ['purpose-roleplay', '역할 대화'],
] as const;

function getGeneralTraitIds(expert: Expert) {
  const brand = MODEL_BRAND[expert.id];
  return [
    expert.abilities?.reasoning && expert.abilities.reasoning >= 85 ? 'reasoning' : null,
    expert.abilities?.speed && expert.abilities.speed >= 85 ? 'fast' : null,
    expert.description.includes('코딩') ? 'coding' : null,
    brand === 'perplexity' || expert.description.includes('검색') || expert.description.includes('리서치') ? 'search' : null,
    MODEL_IS_OPENSOURCE.has(expert.id) ? 'opensource' : null,
  ].filter(Boolean) as string[];
}

function getGeneralSpecIds(expert: Expert) {
  return [
    expert.abilities?.speed && expert.abilities.speed >= 85 ? 'speed-fast' : 'speed-normal',
    MODEL_IS_OPENSOURCE.has(expert.id) ? 'price-free' : 'price-paid',
    expert.abilities?.contextWindow && expert.abilities.contextWindow >= 85 ? 'context-long' : 'context-standard',
  ];
}

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

function HomeModelCard({
  expert,
  selected,
  onClick,
}: {
  expert: Expert;
  selected: boolean;
  onClick: () => void;
}) {
  const secondaryLabel = expert.category === 'ai' ? providerLabel(expert) : expert.subCategory ?? tagsForExpert(expert)[0];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex min-h-[58px] w-full items-center gap-2.5 overflow-hidden rounded-xl border bg-white px-2.5 py-2 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_22px_rgba(15,23,42,0.06)]',
        selected ? 'border-indigo-400 bg-indigo-50/45 ring-2 ring-indigo-100' : 'border-slate-200',
      )}
    >
      {selected && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-100">
        {expert.category === 'ai' ? <ExpertMedia expert={expert} mode="general" /> : <CustomPortrait expert={expert} />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12px] font-black leading-tight text-slate-900">{expert.nameKo}</span>
        <span className="mt-0.5 block truncate text-[10.5px] font-semibold text-slate-400">{secondaryLabel}</span>
      </span>
    </button>
  );
}

function ExplorerCard({
  expert,
  tab,
  selected,
  active,
  view,
  onPreview,
}: {
  expert: Expert;
  tab: ExplorerTab;
  selected: boolean;
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
          'relative flex min-h-[82px] items-center gap-3 rounded-xl border bg-white p-3 text-left transition-all hover:border-slate-300 hover:shadow-[0_10px_24px_rgba(15,23,42,0.05)]',
          active ? 'border-indigo-400 bg-indigo-50/30 ring-2 ring-indigo-100' : 'border-slate-200',
        )}
      >
        <span className={cn('block shrink-0 overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-100', tab === 'custom' ? 'h-16 w-24' : 'h-14 w-14')}>
          {tab === 'custom' ? <CustomPortrait expert={expert} /> : <ExpertMedia expert={expert} mode={tab} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-black text-slate-900">{expert.nameKo}</span>
          {tab === 'general' && (
            <span className="mt-0.5 block truncate text-[12px] font-bold text-slate-400">{providerLabel(expert)}</span>
          )}
          <span className="mt-1 line-clamp-2 text-[12px] font-medium leading-relaxed text-slate-500">{expert.description}</span>
        </span>
        {selected && <Check className="h-5 w-5 shrink-0 text-indigo-500" />}
      </button>
    );
  }

  if (tab === 'general') {
    return (
      <button
        type="button"
        onClick={onPreview}
        className={cn(
          'group relative flex h-[178px] flex-col rounded-[15px] border bg-white p-3 text-left shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]',
          active ? 'border-indigo-400 bg-indigo-50/25 ring-2 ring-indigo-100' : 'border-slate-200/90',
        )}
      >
        {selected && (
          <span className="absolute right-11 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-white shadow-md">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        )}
        <span className="flex items-start gap-2.5 pr-8">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-slate-50 ring-1 ring-slate-100">
            <ExpertMedia expert={expert} mode={tab} />
          </span>
          <span className="min-w-0 flex-1 pt-0.5">
            <span className={cn('block line-clamp-2 break-keep text-[14px] font-black leading-[1.18]', active ? 'text-indigo-600' : 'text-slate-900')}>
              {expert.nameKo}
            </span>
            <span className="mt-1 block truncate text-[11px] font-bold text-slate-400">{providerLabel(expert)}</span>
          </span>
        </span>
        <span className="mt-3 line-clamp-2 min-h-[34px] text-[12px] font-semibold leading-relaxed text-slate-500">
          {expert.description}
        </span>
        <span className="mt-auto flex flex-wrap gap-1.5 pt-2.5">
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
        'group relative flex h-[190px] flex-col overflow-hidden rounded-xl border bg-white p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_34px_rgba(15,23,42,0.07)]',
        active ? 'border-indigo-400 bg-indigo-50/25 ring-2 ring-indigo-100' : 'border-slate-200',
      )}
    >
      {selected && (
        <span className="absolute right-11 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-white shadow-md">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
      <span
        className={cn(
          'flex w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-100',
          tab === 'custom' ? 'aspect-[16/7]' : 'h-24 p-3',
        )}
      >
        <CustomPortrait expert={expert} />
      </span>
      <span className="mt-2 min-w-0">
        <span className={cn('block line-clamp-1 text-[14px] font-black', active ? 'text-indigo-600' : 'text-slate-900')}>
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

  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-[12px] font-black text-slate-800">{title}</h4>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </div>
      <div className="space-y-1.5">
        {items.slice(0, 10).map((item) => (
          <label key={item.id} className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-slate-500">
            <input
              type="checkbox"
              checked={selected.has(item.id)}
              onChange={() => onChange(item.id)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600"
            />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            <span className="text-[10px] text-slate-400">{item.count}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function DetailPanel({
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
  const tags = tagsForExpert(expert);
  const meta = tab === 'custom' ? getCustomMeta(expert) : getModelMeta(expert);
  const examples = expert.sampleQuestions?.slice(0, 3) ?? [
    `${expert.nameKo}에게 핵심만 물어볼래요`,
    `${expert.nameKo} 관점에서 비교해줘`,
    `${expert.nameKo}로 실전 조언을 받아볼래요`,
  ];

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-y-auto bg-white p-4">
      <div className={cn('mx-auto flex w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-100', tab === 'custom' ? 'aspect-[16/10]' : 'aspect-square max-w-[96px] p-3')}>
        {tab === 'custom' ? <CustomPortrait expert={expert} /> : <ExpertMedia expert={expert} mode={tab} />}
      </div>
      <div className="mt-3.5">
        <h3 className={cn(
          'font-black tracking-tight text-slate-950',
          tab === 'custom'
            ? 'truncate text-[22px]'
            : 'line-clamp-2 break-keep text-[21px] leading-tight',
        )}>
          {expert.nameKo}
        </h3>
        {tab === 'general' && <p className="mt-1 text-[13px] font-bold text-slate-400">{providerLabel(expert)}</p>}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <SmallTag key={tag}>{tag}</SmallTag>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] font-medium leading-relaxed text-slate-600">{expert.description}</p>
      <dl className="mt-3.5 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3.5 text-[11.5px]">
        {meta.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="shrink-0 text-slate-400">{label}</dt>
            <dd className={cn(
              'min-w-0 text-right font-bold text-slate-600',
              tab === 'custom' ? 'truncate' : 'leading-snug',
            )}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-3.5 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
        <h4 className="mb-2 text-[12px] font-black text-slate-800">
          {tab === 'custom' ? '이 AI와 잘 맞는 대화 예시' : '이 모델 활용 예시'}
        </h4>
        <div className="space-y-2">
          {examples.map((example) => (
            <p key={example} className="flex gap-2 text-[11px] font-bold leading-relaxed text-slate-600">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full bg-indigo-500 p-0.5 text-white" />
              <span className="line-clamp-1">{example}</span>
            </p>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={onStart}
        className={cn(
          'sticky bottom-0 mt-3.5 flex h-[50px] w-full shrink-0 items-center justify-center gap-3 rounded-xl text-[14px] font-black text-white shadow-[0_16px_30px_rgba(15,23,42,0.16)] transition-all hover:-translate-y-0.5',
          selected ? 'bg-slate-900' : 'bg-indigo-600 hover:bg-indigo-500',
        )}
      >
        {tab === 'custom' ? '이 AI로 시작' : '이 모델로 시작'}
        <ArrowRight className="h-5 w-5" />
      </button>
    </aside>
  );
}

export function AllAiExplorerModal({
  experts,
  selectedIds,
  favoriteSet,
  initialTab,
  onClose,
  onSelectExpert,
  onToggleFavorite,
}: {
  experts: Expert[];
  selectedIds: string[];
  favoriteSet: Set<string>;
  initialTab: ExplorerTab;
  onClose: () => void;
  onSelectExpert: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const [tab, setTab] = useState<ExplorerTab>(initialTab);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'recommended' | 'name'>('recommended');
  const [view, setView] = useState<ExplorerView>('grid');
  const [page, setPage] = useState(1);
  const [brandFilters, setBrandFilters] = useState<Set<string>>(new Set());
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
  const [subFilters, setSubFilters] = useState<Set<string>>(new Set());
  const [traitFilters, setTraitFilters] = useState<Set<string>>(new Set());
  const [detailFilters, setDetailFilters] = useState<Set<string>>(new Set());
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const baseItems = useMemo(() => {
    const items = tab === 'general'
      ? experts.filter((expert) => expert.category === 'ai' && !expert.id.startsWith('auto-') && expert.id !== 'ancano-pro')
      : experts.filter(isCustomExpert);

    const recommendedOrder = new Map(RECOMMENDED_MODEL_IDS.map((id, index) => [id, index]));
    const customOrder = new Map(CUSTOM_FEATURED_IDS.map((id, index) => [id, index]));
    return [...items].sort((a, b) => {
      if (sort === 'name') return a.nameKo.localeCompare(b.nameKo, 'ko');
      if (tab === 'custom') {
        const aOrder = customOrder.get(a.id) ?? (a.category === 'occupation' ? 200 : a.category === 'specialist' ? 400 : 800);
        const bOrder = customOrder.get(b.id) ?? (b.category === 'occupation' ? 200 : b.category === 'specialist' ? 400 : 800);
        return aOrder - bOrder || a.nameKo.localeCompare(b.nameKo, 'ko');
      }
      const aOrder = recommendedOrder.get(a.id) ?? 999;
      const bOrder = recommendedOrder.get(b.id) ?? 999;
      return aOrder - bOrder || a.nameKo.localeCompare(b.nameKo, 'ko');
    });
  }, [experts, sort, tab]);

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
      if (tab === 'general' && brandFilters.size > 0 && !brandFilters.has(MODEL_BRAND[expert.id] ?? 'other')) return false;
      if (tab === 'custom' && categoryFilters.size > 0 && !categoryFilters.has(expert.category)) return false;
      if (subFilters.size > 0 && (!expert.subCategory || !subFilters.has(expert.subCategory))) return false;
      if (tab === 'general' && !matchesAnyFilter(traitFilters, getGeneralTraitIds(expert))) return false;
      if (tab === 'general' && !matchesAnyFilter(detailFilters, getGeneralSpecIds(expert))) return false;
      if (tab === 'custom' && !matchesAnyFilter(traitFilters, getCustomToneIds(expert))) return false;
      if (tab === 'custom' && !matchesAnyFilter(detailFilters, getCustomPurposeIds(expert))) return false;
      return true;
    });
  }, [baseItems, brandFilters, categoryFilters, detailFilters, query, subFilters, tab, traitFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const visibleItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedExpert = selectedIds[0] ? experts.find((expert) => expert.id === selectedIds[0]) : undefined;
  const [previewId, setPreviewId] = useState<string | null>(null);
  const selectedBelongsToTab = selectedExpert
    ? tab === 'general'
      ? selectedExpert.category === 'ai'
      : isCustomExpert(selectedExpert)
    : false;
  const previewExpert = experts.find((expert) => expert.id === previewId)
    ?? (selectedBelongsToTab ? selectedExpert : undefined)
    ?? visibleItems[0]
    ?? baseItems[0];

  const clearFilters = () => {
    setBrandFilters(new Set());
    setCategoryFilters(new Set());
    setSubFilters(new Set());
    setTraitFilters(new Set());
    setDetailFilters(new Set());
  };

  useEffect(() => {
    setPage(1);
    setPreviewId(null);
    setMobileDetailOpen(false);
  }, [brandFilters, categoryFilters, detailFilters, query, sort, subFilters, tab, traitFilters]);

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

  const startWithExpert = (expert: Expert) => {
    onSelectExpert(expert.id);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/45 px-4 py-5 text-slate-950 backdrop-blur-sm">
      <div className="flex h-[min(860px,calc(100vh-40px))] min-h-0 w-full max-w-[1410px] flex-col overflow-hidden rounded-[22px] border border-white/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.32)] ring-1 ring-slate-950/10">
        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-start gap-4 border-b border-slate-200/70 bg-white px-5 py-4">
          <div>
            <h2 className="text-[23px] font-black tracking-tight text-slate-950">전체 AI 탐색</h2>
            <p className="mt-1 text-[12px] font-semibold text-slate-400">
              {tab === 'general'
                ? '업무, 학습, 창작 목적에 맞는 모델을 비교하고 선택하세요.'
                : '역할, 캐릭터, 관점 기반의 커스텀 AI를 고르세요.'}
            </p>
          </div>
          <div className="hidden rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-inner sm:flex">
            <button
              type="button"
              onClick={() => setTab('general')}
              className={cn('flex h-10 items-center gap-2 rounded-lg px-7 text-[13px] font-black transition-all', tab === 'general' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-900')}
            >
              <LayoutGrid className="h-4 w-4" />
              일반 모델
            </button>
            <button
              type="button"
              onClick={() => setTab('custom')}
              className={cn('flex h-10 items-center gap-2 rounded-lg px-7 text-[13px] font-black transition-all', tab === 'custom' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-900')}
            >
              <Sparkles className="h-4 w-4" />
              커스텀 모델
            </button>
          </div>
          <button type="button" onClick={onClose} className="ml-auto rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900" aria-label="닫기">
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="flex shrink-0 gap-1 border-b border-slate-200/70 bg-white px-5 py-3 sm:hidden">
          <button
            type="button"
            onClick={() => setTab('general')}
            className={cn('flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-[12px] font-black transition-all', tab === 'general' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600')}
          >
            <LayoutGrid className="h-4 w-4" />
            일반 모델
          </button>
          <button
            type="button"
            onClick={() => setTab('custom')}
            className={cn('flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-[12px] font-black transition-all', tab === 'custom' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600')}
          >
            <Sparkles className="h-4 w-4" />
            커스텀 모델
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-3 border-b border-slate-200/70 bg-slate-50/80 px-5 py-3.5">
          <div className="relative min-w-0 flex-1">
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
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as 'recommended' | 'name')}
            className="hidden h-11 rounded-xl border border-slate-200 bg-white px-4 text-[12px] font-black text-slate-700 outline-none sm:block"
          >
            <option value="recommended">추천순</option>
            <option value="name">이름순</option>
          </select>
          <div className="hidden h-11 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 sm:flex">
            <button type="button" onClick={() => setView('grid')} className={cn('flex h-9 w-9 items-center justify-center rounded-lg', view === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400')}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setView('list')} className={cn('flex h-9 w-9 items-center justify-center rounded-lg', view === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400')}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 bg-white lg:grid-cols-[150px_minmax(0,1fr)_274px] xl:grid-cols-[156px_minmax(0,1fr)_286px]">
          <aside className="hidden min-h-0 overflow-y-auto border-r border-slate-200/70 bg-slate-50/65 px-3.5 lg:block">
            <div className="flex items-center justify-between border-b border-slate-100 py-4">
              <h3 className="text-[13px] font-black text-slate-900">필터</h3>
              <button
                type="button"
                onClick={clearFilters}
                className="text-[10px] font-bold text-slate-400 hover:text-indigo-600"
              >
                초기화
              </button>
            </div>
            {tab === 'general' ? (
              <>
                <FilterGroup title="제공사" items={brandItems} selected={brandFilters} onChange={(id) => toggleSet(setBrandFilters, id)} />
                <FilterGroup title="강점" items={traitItems} selected={traitFilters} onChange={(id) => toggleSet(setTraitFilters, id)} />
                <FilterGroup title="조건" items={detailItems} selected={detailFilters} onChange={(id) => toggleSet(setDetailFilters, id)} />
              </>
            ) : (
              <>
                <FilterGroup title="유형" items={categoryItems} selected={categoryFilters} onChange={(id) => toggleSet(setCategoryFilters, id)} />
                <FilterGroup title="분야" items={subItems} selected={subFilters} onChange={(id) => toggleSet(setSubFilters, id)} />
                <FilterGroup title="말투" items={traitItems} selected={traitFilters} onChange={(id) => toggleSet(setTraitFilters, id)} />
                <FilterGroup title="목적" items={detailItems} selected={detailFilters} onChange={(id) => toggleSet(setDetailFilters, id)} />
              </>
            )}
          </aside>

          <main className="flex min-h-0 flex-col border-r border-slate-200/70 bg-white px-3 py-3.5 xl:px-3.5">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {visibleItems.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-[13px] font-bold text-slate-400">
                  검색 결과가 없습니다.
                </div>
              ) : (
                <div
                  className={cn(
                    view === 'grid'
                      ? 'grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
                      : 'grid grid-cols-1 gap-2.5',
                  )}
                >
                  {visibleItems.map((expert) => (
                    <div key={expert.id} className="relative min-w-0">
                      <ExplorerCard
                        expert={expert}
                        tab={tab}
                        selected={selectedIds.includes(expert.id)}
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
                          'absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border bg-white/90 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5',
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
              <span className="text-[10px] font-semibold text-slate-400">페이지 이동</span>
            </div>
          </main>

          {previewExpert && (
            <div className="hidden min-h-0 lg:block">
              <DetailPanel
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
                <button type="button" onClick={() => setMobileFilterOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="필터 닫기">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {tab === 'general' ? (
                <>
                  <FilterGroup title="제공사" items={brandItems} selected={brandFilters} onChange={(id) => toggleSet(setBrandFilters, id)} />
                  <FilterGroup title="강점" items={traitItems} selected={traitFilters} onChange={(id) => toggleSet(setTraitFilters, id)} />
                  <FilterGroup title="조건" items={detailItems} selected={detailFilters} onChange={(id) => toggleSet(setDetailFilters, id)} />
                </>
              ) : (
                <>
                  <FilterGroup title="유형" items={categoryItems} selected={categoryFilters} onChange={(id) => toggleSet(setCategoryFilters, id)} />
                  <FilterGroup title="분야" items={subItems} selected={subFilters} onChange={(id) => toggleSet(setSubFilters, id)} />
                  <FilterGroup title="말투" items={traitItems} selected={traitFilters} onChange={(id) => toggleSet(setTraitFilters, id)} />
                  <FilterGroup title="목적" items={detailItems} selected={detailFilters} onChange={(id) => toggleSet(setDetailFilters, id)} />
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
            <DetailPanel
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

function LegacyGeneralAiHome({
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
  const selectedId = selectedIds[0];

  const favoriteExperts = useMemo(() => {
    const byId = new Map(experts.map((expert) => [expert.id, expert]));
    return favoriteIds
      .map((id) => byId.get(id))
      .filter((expert): expert is Expert => Boolean(expert))
      .slice(0, HOME_FAVORITE_LIMIT);
  }, [experts, favoriteIds]);

  const favoriteBrandCounts = useMemo(() => {
    const counts = new Map<string, number>();
    favoriteExperts.forEach((expert) => {
      const brand = MODEL_BRAND[expert.id] ?? expert.category;
      counts.set(brand, (counts.get(brand) ?? 0) + 1);
    });
    return counts;
  }, [favoriteExperts]);

  return (
    <div className="mx-auto w-full max-w-[780px] text-left">
      <section className="relative overflow-visible px-2 pb-1 pt-1 sm:px-0">
        <style>
          {`
            @keyframes homeLauncherIn {
              from { opacity: 0; transform: translateY(10px) scale(0.9); filter: blur(4px); }
              to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
            }
          `}
        </style>
        <div className="absolute right-1 top-0 z-10 flex items-center gap-1.5 sm:right-3 sm:top-1">
          <button
            type="button"
            onClick={() => {
              setExplorerTab('general');
              setExplorerOpen(true);
            }}
            className="hidden h-8 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 text-[11px] font-black text-slate-600 shadow-sm backdrop-blur transition-all hover:border-blue-200 hover:bg-white hover:text-blue-600 sm:flex"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            전체 모델 보기
          </button>
          <button
            type="button"
            onClick={() => {
              setExplorerTab('general');
              setExplorerOpen(true);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60 text-slate-400 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-slate-900 sm:hidden"
            aria-label="전체 모델 보기"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-auto max-w-[590px] text-center">
          <h2 className="text-[25px] font-black leading-tight tracking-tight text-slate-950 sm:text-[30px]">
            모든 AI를 한 곳에서
          </h2>
          <p className="mt-1.5 text-[13px] font-semibold text-slate-600">
            즐겨찾기한 AI를 바로 고르고, 필요하면 추천 AI가 질문에 맞춰 잡아줘요.
          </p>
        </div>

        <div className="mt-6 flex min-h-[128px] flex-wrap items-start justify-center gap-x-5 gap-y-4 overflow-visible pb-1 sm:mt-7 sm:gap-x-7">
          <div
            className="group relative flex w-[70px] flex-col items-center gap-1.5 text-center sm:w-[78px]"
            style={{ animation: 'homeLauncherIn 420ms cubic-bezier(.2,.8,.2,1) 70ms both' }}
          >
            <button
              type="button"
              onClick={onRecommendSelect}
              className="flex flex-col items-center gap-1.5"
              aria-pressed={autoAssign}
            >
              <span
                className={cn(
                  'relative flex h-14 w-14 items-center justify-center rounded-full border bg-white p-3 shadow-[0_8px_22px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_14px_30px_rgba(37,99,235,0.12)] sm:h-16 sm:w-16',
                  autoAssign
                    ? 'border-blue-500 text-blue-600 ring-4 ring-blue-100'
                    : 'border-slate-200 text-blue-600',
                )}
              >
                <Sparkles className="h-6 w-6" strokeWidth={2.2} />
              </span>
              <span className={cn('whitespace-nowrap text-[12px] font-black transition-colors', autoAssign ? 'text-blue-600' : 'text-slate-700')}>
                추천 AI
              </span>
            </button>
          </div>
          {favoriteExperts.map((expert, index) => {
            const active = !autoAssign && selectedId === expert.id;
            const staggerClass = index % 3 === 0 ? 'sm:translate-y-3' : index % 3 === 1 ? 'sm:-translate-y-1' : 'sm:translate-y-5';
            return (
              <div
                key={expert.id}
                className={cn('group relative flex w-[70px] flex-col items-center gap-1.5 text-center sm:w-[78px]', staggerClass)}
                style={{ animation: `homeLauncherIn 420ms cubic-bezier(.2,.8,.2,1) ${135 + index * 62}ms both` }}
              >
                <button
                  type="button"
                  onClick={() => onSelectExpert(expert.id)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      'relative flex h-14 w-14 items-center justify-center rounded-full border bg-white p-3 shadow-[0_8px_22px_rgba(15,23,42,0.07)] transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_14px_30px_rgba(15,23,42,0.11)] sm:h-16 sm:w-16',
                      active
                        ? 'border-blue-500 text-blue-600 shadow-[0_8px_24px_rgba(37,99,235,0.14)] ring-4 ring-blue-100'
                        : 'border-slate-200 text-slate-950',
                    )}
                  >
                    <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
                      {expert.category === 'ai' ? <ExpertMedia expert={expert} mode="general" /> : <CustomPortrait expert={expert} />}
                    </span>
                  </span>
                  <span className={cn('max-w-[88px] truncate whitespace-nowrap text-[12px] font-bold transition-colors', active ? 'text-blue-600' : 'text-slate-700')}>
                    {homeFavoriteLabel(expert, (favoriteBrandCounts.get(MODEL_BRAND[expert.id] ?? expert.category) ?? 0) > 1)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleFavorite(expert.id)}
                  className="absolute -right-0.5 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 opacity-0 shadow-sm transition-all hover:border-rose-200 hover:text-rose-500 group-hover:opacity-100"
                  aria-label={`${expert.nameKo} 즐겨찾기 제거`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setExplorerTab('general');
              setExplorerOpen(true);
            }}
            className="group flex w-[70px] flex-col items-center gap-1.5 text-center sm:w-[78px] sm:translate-y-2"
            style={{ animation: `homeLauncherIn 420ms cubic-bezier(.2,.8,.2,1) ${170 + favoriteExperts.length * 62}ms both` }}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white/80 text-slate-700 shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition-all group-hover:-translate-y-1 group-hover:border-blue-300 group-hover:bg-white group-hover:text-blue-600 sm:h-16 sm:w-16">
              <Plus className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="text-[12px] font-bold text-slate-700">추가</span>
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-white/95 shadow-[0_18px_46px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/90 backdrop-blur sm:mt-7">
          {input}
        </div>
      </section>

      {explorerOpen && (
        <AllAiExplorerModal
          experts={experts}
          selectedIds={selectedIds}
          favoriteSet={favoriteSet}
          initialTab={explorerTab}
          onClose={() => setExplorerOpen(false)}
          onSelectExpert={onSelectExpert}
          onToggleFavorite={onToggleFavorite}
        />
      )}
    </div>
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
    const fastExperts = experts
      .filter((expert) => expert.category === 'ai' && !expert.id.startsWith('auto-') && expert.id !== 'ancano-pro')
      .sort((a, b) => (b.abilities?.speed ?? 0) - (a.abilities?.speed ?? 0));

    const base =
      activeHomeTab === 'favorites'
        ? favoriteExperts
        : activeHomeTab === 'recommended'
          ? orderExpertsByIds(experts, RECOMMENDED_MODEL_IDS).filter((expert) => expert.id !== 'auto-gpt')
          : activeHomeTab === 'fast'
            ? fastExperts
            : activeHomeTab === 'reasoning'
              ? orderExpertsByIds(experts, REASONING_MODEL_IDS)
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
            모든 AI 챗봇을 한 곳에서 원하는 대로 골라 쓰세요
          </h2>
          <p className="mt-2 text-[13px] font-semibold text-slate-500 sm:text-[14px]">
            GPT · Claude · Gemini - 원하는 AI를 골라 자유롭게 대화
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
          onClose={() => setExplorerOpen(false)}
          onSelectExpert={onSelectExpert}
          onToggleFavorite={onToggleFavorite}
        />
      )}
    </div>
  );
}
