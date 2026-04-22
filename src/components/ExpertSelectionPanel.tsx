import { useState, useEffect, useRef, useCallback, Fragment, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Expert, ExpertCategory, EXPERT_CATEGORY_LABELS, EXPERT_CATEGORY_ORDER,
  EXPERT_SUB_CATEGORIES, DiscussionMode, MainMode, DebateSubMode,
  DEBATE_SUB_MODE_LABELS, getMainMode, DebateSettings,
  THINKING_FRAMEWORKS, ThinkingFramework, DiscussionIssue,
  GAME_CARDS, GameCard,
  SimulationScenario, SIMULATION_SCENARIOS,
  StakeholderSettings, DEFAULT_STAKEHOLDER_SETTINGS,
  type PremiumDomainId,
  type AivsBattleDraft,
  AIVS_USER_TOPIC_PRESETS,
  BATTLE_AI_CHARACTERS,
  DEBATE_RECOMMENDED_TOPICS,
  type RecommendedTopic,
  type RecommendedParticipant,
} from '@/types/expert';
import { AivsBattleConfigModal } from './AivsBattleConfigModal';
import { ExpertHoverTip } from './ExpertHoverTip';
import { MainModeTabs } from './MainModeTabs';
import { PremiumDomainLanding } from './PremiumDomainLanding';
import { ExpertAvatar } from './ExpertAvatar';
import { QuestionInput } from './QuestionInput';
import { AssistantCardsPanel } from './AssistantCardsPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useFavoriteExperts } from '@/hooks/useFavoriteExperts';
import { useHoverExpertTip } from '@/hooks/useHoverExpertTip';
import { useMainModeTransition } from '@/hooks/useMainModeTransition';
import { buildExpertSelectionGroups, FAST_MODEL_IDS, RESEARCH_AGENT_IDS } from '@/lib/expertSelectionGroups';
import { cn } from '@/lib/utils';
import { processFile, validateFile, MAX_FILES, type AttachedFile } from '@/lib/fileProcessor';
import { Paperclip } from 'lucide-react';
import {
  Target, Scale, Lightbulb,
  Plus, X, Check, ChevronLeft, ChevronRight, ChevronDown, ArrowRight, ArrowLeft, Zap,
  FileText, Search, Sliders,
  Eye, BookOpen, Brain, Link2, Sparkles, Swords, Clapperboard,
  Users, User, Crown, Star,
  Flame, ShieldAlert, Heart, RotateCcw, Lock, Bomb, UserX, Shield, Handshake,
  Drama, Gavel, LogOut,
} from 'lucide-react';


type ProconStance = 'pro' | 'con';
type SubmitDiscussion = (question: string, overrideExpertIds?: string[], overrideMode?: DiscussionMode) => void;
type SubmitDiscussionWithFiles = (question: string, files: AttachedFile[], overrideExpertIds?: string[], overrideMode?: DiscussionMode) => void;

interface GameRecord {
  gameId: string;
  grade?: string;
  result?: 'win' | 'lose';
  xp?: number;
  date?: string;
}

interface Props {
  experts: Expert[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  discussionMode: DiscussionMode;
  onModeChange: (mode: DiscussionMode) => void;
  isDiscussing: boolean;
  onSubmit: SubmitDiscussion;
  onSubmitWithFiles?: SubmitDiscussionWithFiles;
  proconStances?: Record<string, ProconStance>;
  onProconStancesChange?: (stances: Record<string, ProconStance>) => void;
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
  showDebateSettings?: boolean;
  selectedFramework?: ThinkingFramework | null;
  onFrameworkChange?: (fw: ThinkingFramework | null) => void;
  discussionIssues?: DiscussionIssue[];
  onDiscussionIssuesChange?: (issues: DiscussionIssue[]) => void;
  onBulkSelect?: (ids: string[]) => void;
  onSampleQuestionClick?: (question: string) => void;
  onStartGame?: (gameId: string, option: string, label: string) => void;
  stakeholderSettings?: StakeholderSettings;
  onStakeholderSettingsChange?: (s: StakeholderSettings) => void;
  onSelectPremiumDomain?: (domainId: PremiumDomainId) => void;
  selectedPremiumDomain?: PremiumDomainId | null;
  hasAivsBattleStarted?: boolean;
  onStartAivsBattle?: (draft: AivsBattleDraft) => void;
  onResetAivsBattle?: () => void;
  selectedAssistantCardId?: string | null;
  onAssistantCardChange?: (cardId: string | null) => void;
  onAssistantSubmit?: (cardId: string, question: string) => void;
}

const mainModes: MainMode[] = ['general', 'research_main', 'study_main', 'multi', 'debate', 'stakeholder_main', 'premium_main', 'assistant'];
const AI_AGENT_IDS = ['ancano-pro', 'auto-gpt', 'auto-gemini', 'auto-claude', 'auto-grok', 'auto-perplexity', 'auto-deepseek', 'auto-qwen'];

function isInstantChatLayoutSwitch(from: MainMode, to: MainMode) {
  return (
    (from === 'general' && to === 'multi') ||
    (from === 'multi' && to === 'general')
  );
}
const debateSubModes: DebateSubMode[] = ['standard', 'procon', 'brainstorm', 'freetalk'];

const mainModeLabels: Record<MainMode, string> = {
  general: '일반 채팅',
  multi: '멀티 채팅',
  debate: 'AI 토론',
  stakeholder_main: 'AI 시뮬레이션',
  brainstorm_main: '브레인스토밍',
  premium_main: '프리미엄 AI 자문',
  assistant: '어시스턴트',
  player: '플레이어',
  research_main: '심층 리서치',
  study_main: '공부',
  translate_main: '다국어 번역',
  convert_main: '파일 변환',
};

const debateSubIcons: Record<string, React.ReactNode> = {
  standard: <Target className="w-3 h-3" />,
  procon: <Scale className="w-3 h-3" />,
  brainstorm: <Lightbulb className="w-3 h-3" />,
  hearing: <Search className="w-3 h-3" />,
  freetalk: <Users className="w-3 h-3" />,
  stakeholder: <Drama className="w-3 h-3" />,
};

// ── 찬반 토론 진영 칩 (1v1/2v2 공용) ──
function SideChip({
  tone,
  parts,
  AvatarOrIcon,
}: {
  tone: 'pro' | 'con';
  parts: RecommendedParticipant[];
  AvatarOrIcon: (props: { id?: string; icon?: string; size?: number }) => JSX.Element;
}) {
  const palette = tone === 'pro'
    ? 'bg-blue-50 text-blue-600'
    : 'bg-red-50 text-red-500';
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold leading-none', palette)}>
      <span className="inline-flex items-center -space-x-1">
        {parts.map((p, i) => (
          <span key={i} className="inline-flex rounded-full ring-[1.5px] ring-white/90">
            <AvatarOrIcon id={p.id} icon={p.icon} size={12} />
          </span>
        ))}
      </span>
      <span>{parts.map(p => p.label).join(' · ')}</span>
    </span>
  );
}

// ── 인기주제 캐러셀 (화살표 + 자동롤링) ──
function TopicCarousel({ mode, onSelect, experts }: { mode: string; onSelect: (title: string) => void; experts?: Expert[] }) {
  const findAvatar = (id?: string) => {
    if (!id || !experts) return null;
    const e = experts.find(x => x.id === id);
    return e?.avatarUrl || null;
  };
  const AvatarOrIcon = ({ id, icon, size = 12 }: { id?: string; icon?: string; size?: number }) => {
    const url = findAvatar(id);
    if (url) return <img src={url} alt="" className="rounded-full object-cover object-top shrink-0" style={{ width: size, height: size }} />;
    return <span className="shrink-0 leading-none inline-flex items-center justify-center" style={{ fontSize: size, width: size, height: size }}>{icon || '💬'}</span>;
  };
  const resolveSide = (topic: RecommendedTopic, side: 'pro' | 'con'): RecommendedParticipant[] | null => {
    const arr = side === 'pro' ? topic.proParticipants : topic.conParticipants;
    if (arr && arr.length > 0) return arr;
    const label = side === 'pro' ? topic.proLabel : topic.conLabel;
    const icon = side === 'pro' ? topic.proIcon : topic.conIcon;
    const id = side === 'pro' ? topic.proId : topic.conId;
    if (label) return [{ id, icon, label }];
    return null;
  };
  const topics = DEBATE_RECOMMENDED_TOPICS[mode];
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = topics?.length || 0;
  const go = useCallback((dir: 1 | -1) => {
    if (count === 0) return;
    setFading(true);
    setTimeout(() => {
      setIndex(prev => (prev + dir + count) % count);
      setFading(false);
    }, 150);
  }, [count]);

  // 자동 롤링 5초
  useEffect(() => {
    if (count === 0) return;
    timerRef.current = setInterval(() => go(1), 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [count, go]);

  const resetTimer = () => {
    if (count === 0) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => go(1), 5000);
  };

  if (!topics || count === 0) return null;

  const topic = topics[index];

  return (
    <div className="flex-1 min-w-0 flex items-center gap-1">
      <button
        type="button"
        onClick={() => { go(-1); resetTimer(); }}
        className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full text-slate-400 hover:text-violet-500 hover:bg-violet-50 transition-all"
      >
        <ChevronLeft className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={() => onSelect(topic.title)}
        className={cn(
          'flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 text-[11px] font-medium text-slate-600 hover:bg-white hover:text-violet-600 transition-all overflow-hidden',
          fading ? 'opacity-0' : 'opacity-100'
        )}
        style={{ transition: 'opacity 150ms' }}
      >
        <span className="shrink-0 font-bold text-violet-500 leading-none">인기주제</span>
        <span className="truncate leading-none">{topic.title}</span>
        {(() => {
          const proParts = resolveSide(topic, 'pro');
          const conParts = resolveSide(topic, 'con');
          if (proParts && conParts) {
            return (
              <span className="shrink-0 inline-flex items-center gap-1">
                <SideChip tone="pro" parts={proParts} AvatarOrIcon={AvatarOrIcon} />
                <span className="text-slate-300 text-[10px] leading-none">vs</span>
                <SideChip tone="con" parts={conParts} AvatarOrIcon={AvatarOrIcon} />
              </span>
            );
          }
          if (topic.participants && topic.participants.length > 0) {
            return (
              <span className="shrink-0 inline-flex items-center gap-1">
                {topic.participants.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold leading-none">
                    <AvatarOrIcon id={p.id} icon={p.icon} size={12} /> {p.name}
                  </span>
                ))}
              </span>
            );
          }
          if (proParts) {
            return (
              <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold leading-none">
                <AvatarOrIcon id={proParts[0].id} icon={proParts[0].icon || '💬'} size={12} /> {proParts[0].label}
              </span>
            );
          }
          return null;
        })()}
      </button>
      <button
        type="button"
        onClick={() => { go(1); resetTimer(); }}
        className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full text-slate-400 hover:text-violet-500 hover:bg-violet-50 transition-all"
      >
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

function useTypewriter(text: string, speed = 40) {
  const [displayed, setDisplayed] = useState('');
  const prevText = useRef('');
  useEffect(() => {
    if (text === prevText.current) return;
    prevText.current = text;
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return displayed;
}

// ── Toggle Switch ──
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-10 h-[22px] rounded-full transition-colors duration-200 shrink-0',
        checked ? 'bg-slate-800' : 'bg-slate-300'
      )}
    >
      <span className={cn(
        'absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
        checked ? 'translate-x-[18px]' : 'translate-x-0'
      )} />
    </button>
  );
}

function AccountStatus() {
  const { user, profile, loading, profileLoading, isAdmin, signOut } = useAuth();

  if (loading || profileLoading) {
    return (
      <div className="hidden sm:flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-400 shadow-sm backdrop-blur">
        계정 확인 중
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        to="/auth"
        className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm backdrop-blur transition-colors hover:bg-slate-50"
      >
        <User className="w-3.5 h-3.5" />
        로그인
      </Link>
    );
  }

  return (
    <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-2 py-1.5 shadow-sm backdrop-blur">
      <span className="max-w-[150px] truncate px-1 text-[11px] font-semibold text-slate-600">{user.email}</span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-500">
        {profile?.plan ?? 'free'}
      </span>
      {isAdmin && (
        <Link
          to="/admin"
          className="rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white hover:bg-slate-800"
        >
          Admin
        </Link>
      )}
      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label="로그아웃"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Auto/Manual Toggle ──
function AutoManualToggle({ auto, onChange }: { auto: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
      <button type="button" onClick={() => onChange(false)}
        className={cn('px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all',
          !auto ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
        수동 선택
      </button>
      <button type="button" onClick={() => onChange(true)}
        className={cn('px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all',
          auto ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
        AI 추천
      </button>
    </div>
  );
}

function AIPickerModal({ experts, selectedIds, onToggle, onClose, title, accentColor = 'indigo', maxCount }: {
  experts: Expert[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
  title?: string;
  accentColor?: 'indigo' | 'amber' | 'blue' | 'red' | 'violet';
  maxCount?: number;
}) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('전체');
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const selected = experts.filter(e => selectedIds.includes(e.id));
  const mainCats = ['전체', 'AI 모델', '전문가', '직업', '인물', '캐릭터', '이념'];
  const moreCats = ['신화', '철학/종교', '라이프스타일', '페르소나'];
  const catMap: Record<string, string> = { 'AI 모델': 'ai', '전문가': 'specialist', '직업': 'occupation', '인물': 'celebrity', '캐릭터': 'fictional', '신화': 'mythology', '이념': 'ideology', '철학/종교': 'religion', '라이프스타일': 'lifestyle', '페르소나': 'perspective' };

  const accentClasses = {
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', btn: 'bg-indigo-500 text-white', chip: 'bg-indigo-100 text-indigo-700', check: 'text-indigo-500' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', btn: 'bg-amber-500 text-white', chip: 'bg-amber-100 text-amber-700', check: 'text-amber-500' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', btn: 'bg-blue-500 text-white', chip: 'bg-blue-100 text-blue-700', check: 'text-blue-500' },
    red: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', btn: 'bg-red-500 text-white', chip: 'bg-red-100 text-red-700', check: 'text-red-500' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-700', btn: 'bg-violet-500 text-white', chip: 'bg-violet-100 text-violet-700', check: 'text-violet-500' },
  };
  const ac = accentClasses[accentColor];

  // 바깥 클릭으로 더보기 닫기
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => { if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  const filtered = experts.filter(e => {
    if (cat !== '전체' && e.category !== catMap[cat]) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return e.nameKo.toLowerCase().includes(q) || e.name.toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-full max-w-[520px] max-h-[70vh] rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 헤더 + 선택된 AI 칩 */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="text-[14px] font-bold text-slate-800">{title || 'AI 선택'}</h3>
          <div className="flex items-center gap-2">
            {/* 선택된 AI 칩 */}
            {selected.length > 0 && (
              <div className="flex items-center gap-1">
                {selected.slice(0, 4).map(e => (
                  <button key={e.id} onClick={() => onToggle(e.id)}
                    className={cn('inline-flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-full text-[10px] font-medium transition-colors', ac.chip, `hover:opacity-70`)}>
                    <ExpertAvatar expert={e} size="xxs" />
                    {e.nameKo}
                    <X className="w-2.5 h-2.5 opacity-50" />
                  </button>
                ))}
                {selected.length > 4 && <span className="text-[9px] text-slate-400">+{selected.length - 4}</span>}
              </div>
            )}
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 검색 */}
        <div className="shrink-0 px-4 py-2 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름으로 검색..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[12px] outline-none focus:border-slate-400 transition-colors" autoFocus />
          </div>
        </div>

        {/* 카테고리 탭 + 더보기 */}
        <div className="shrink-0 flex flex-wrap gap-1 px-4 py-2 border-b border-slate-100">
          {mainCats.map(c => (
            <button key={c} onClick={() => { setCat(c); setMoreOpen(false); }}
              className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors',
                cat === c ? ac.btn : 'text-slate-500 hover:bg-slate-100'
              )}>{c}</button>
          ))}
          <div className="relative" ref={moreRef}>
            <button onClick={() => setMoreOpen(!moreOpen)}
              className={cn('px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors',
                moreCats.includes(cat) ? ac.btn : 'text-slate-500 hover:bg-slate-100'
              )}>{moreCats.includes(cat) ? cat : '더보기'} ▾</button>
            {moreOpen && (
              <div className="absolute left-0 top-full mt-1 z-10 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[110px] animate-in fade-in slide-in-from-top-1 duration-150">
                {moreCats.map(c => (
                  <button key={c} onClick={() => { setCat(c); setMoreOpen(false); }}
                    className={cn('w-full px-3 py-1.5 text-left text-[11px] font-medium transition-colors',
                      cat === c ? `${ac.bg} ${ac.text}` : 'text-slate-600 hover:bg-slate-50'
                    )}>{c}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI 그리드 */}
        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length > 0 ? (
            <div className="grid grid-cols-2 gap-1.5">
              {filtered.map(expert => {
                const isSelected = selectedIds.includes(expert.id);
                const atLimit = maxCount && !isSelected && selected.length >= maxCount;
                return (
                  <button key={expert.id} disabled={!!atLimit}
                    onClick={() => onToggle(expert.id)}
                    className={cn('flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left group',
                      isSelected ? `${ac.bg} ${ac.border}` : atLimit ? 'border-slate-100 opacity-40 cursor-not-allowed' : 'border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                    )}>
                    <div className="shrink-0 group-hover:scale-110 transition-transform">
                      <ExpertAvatar expert={expert} size="md" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-[12px] font-semibold truncate', isSelected ? ac.text : 'text-slate-800')}>{expert.nameKo}</p>
                      <p className="text-[9px] text-slate-400 truncate">{expert.description}</p>
                    </div>
                    {isSelected && <Check className={cn('w-4 h-4 shrink-0', ac.check)} />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-[11px] text-slate-400">
              {search ? '검색 결과가 없습니다' : '표시할 봇이 없습니다'}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Issue Editor (심층토론) ──
const ISSUE_TEMPLATES = ['경제적 영향', '윤리적 쟁점', '기술적 타당성', '사회적 합의', '법률적 문제', '환경적 영향', '실현 가능성'];

function StandardSettingsPanel({ issues, onIssuesChange, debateSettings, onDebateSettingsChange, selectedExperts, autoAssign, onAutoAssignChange, onToggle, onModeChange, experts, onTopicSelect }: {
  issues: DiscussionIssue[];
  onIssuesChange?: (issues: DiscussionIssue[]) => void;
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
  selectedExperts: Expert[];
  experts: Expert[];
  autoAssign?: boolean;
  onAutoAssignChange?: (v: boolean) => void;
  onToggle?: (id: string) => void;
  onModeChange?: (mode: DiscussionMode) => void;
  onTopicSelect?: (title: string) => void;
}) {
  const [newIssue, setNewIssue] = useState('');
  const [customIssues, setCustomIssues] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const maxParticipants = 3;
  const visibleParticipantSlotCount = Math.min(maxParticipants, Math.max(1, selectedExperts.length + 1));
  const visibleParticipants = Array.from({ length: visibleParticipantSlotCount }, (_, index) => selectedExperts[index] ?? null);

  const allTemplates = [...ISSUE_TEMPLATES, ...customIssues.filter(c => !ISSUE_TEMPLATES.includes(c))];
  const selectedTitle = issues.length > 0 ? issues[0].title : null;

  const toggleIssue = (title: string) => {
    if (selectedTitle === title) onIssuesChange?.([]);
    else onIssuesChange?.([{ id: `issue-${Date.now()}`, title, description: '' }]);
  };

  const addCustom = () => {
    if (!newIssue.trim()) return;
    const title = newIssue.trim();
    if (!customIssues.includes(title) && !ISSUE_TEMPLATES.includes(title)) {
      setCustomIssues(prev => [...prev, title]);
    }
    toggleIssue(title);
    setNewIssue('');
  };

  return (
    <div>
      {showPicker && <AIPickerModal experts={experts} selectedIds={selectedExperts.map(e => e.id)} onToggle={onToggle!} onClose={() => setShowPicker(false)} title="토론자 선택" accentColor="indigo" maxCount={3} />}

      <div className="space-y-3">
        {/* 참여자 + 설정 통합 카드 */}
        <div className="rounded-2xl border border-emerald-200 overflow-hidden flex flex-col">
          {/* 헤더 */}
          <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[13px]">🎯</span>
              <span className="text-[12px] font-bold text-emerald-700">심층 토론</span>
            </div>
            {onTopicSelect && <TopicCarousel mode="standard" onSelect={onTopicSelect} experts={experts} />}
          </div>

          {/* 수동/자동 토글 + 참여자 슬롯 */}
          <div className="px-3 py-2 bg-white">
            <div className="flex items-center justify-center mb-2">
              <AutoManualToggle auto={autoAssign || false} onChange={v => onAutoAssignChange?.(v)} />
            </div>
            {autoAssign ? (
              <div className="flex flex-col items-center gap-2 py-3">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <p className="text-[11px] text-slate-400 text-center">질문을 입력하면 AI가<br/>적합한 토론자를 골라드려요</p>
              </div>
            ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <div className="flex items-center gap-3 flex-wrap justify-center">
                {visibleParticipants.filter(Boolean).map(e => (
                  <button key={e.id} type="button" onClick={() => onToggle(e.id)}
                    className="flex flex-col items-center gap-1 animate-in fade-in zoom-in-75 duration-200 group/p">
                    <div className="relative w-10 h-10 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center group-hover/p:border-red-300 group-hover/p:bg-red-50 transition-colors">
                      <ExpertAvatar expert={e} size="md" />
                      <div className="absolute inset-0 rounded-full flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-red-500 opacity-0 group-hover/p:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600 max-w-[56px] truncate text-center group-hover/p:text-red-500 transition-colors">{e.nameKo}</span>
                  </button>
                ))}
                {Array.from({ length: visibleParticipantSlotCount - selectedExperts.length }).map((_, i) => (
                  <button key={`empty-standard-${i}`} type="button" onClick={() => setShowPicker(true)} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full border-2 border-dashed border-emerald-300 flex items-center justify-center hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors cursor-pointer">
                      <Plus className="w-4 h-4 text-emerald-300" />
                    </div>
                  </button>
                ))}
              </div>
              {selectedExperts.length === 0 && (
                <span className="text-[11px] text-slate-400">클릭하여 AI를 추가하세요</span>
              )}
            </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Procon Settings Panel — 완전 재설계 ──
function ProconSettingsPanel({ experts, selectedIds, onToggle, proconStances, dragOver, draggedId, setDragOver, setDraggedId, assignStance, removeStance, MAX_PER_ZONE, assignMode, setAssignMode, debateSettings, onDebateSettingsChange, onModeChange, onTopicSelect, topContent, bottomContent }: {
  experts: Expert[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  proconStances: Record<string, 'pro' | 'con'>;
  assignMode: 'manual' | 'auto';
  setAssignMode: (v: 'manual' | 'auto') => void;
  dragOver: 'pro' | 'con' | null;
  draggedId: string | null;
  setDragOver: (v: 'pro' | 'con' | null) => void;
  setDraggedId: (v: string | null) => void;
  assignStance: (id: string, stance: 'pro' | 'con') => void;
  removeStance: (id: string) => void;
  MAX_PER_ZONE: number;
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
  onTopicSelect?: (title: string) => void;
  topContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
}) {
  const [pickerZone, setPickerZone] = useState<'pro' | 'con' | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // 팝업 바깥 클릭 닫기
  useEffect(() => {
    if (!pickerZone) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerZone(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerZone]);

  return (
    <div>
      {/* 찬반 AI 선택 플로팅 */}
      {pickerZone && (
        <AIPickerModal
          experts={experts}
          selectedIds={Object.keys(proconStances).filter(id => proconStances[id] === pickerZone)}
          onToggle={(id) => {
            if (proconStances[id] === pickerZone) { removeStance(id); }
            else { assignStance(id, pickerZone); }
          }}
          onClose={() => setPickerZone(null)}
          title={pickerZone === 'pro' ? '찬성 AI 추가' : '반대 AI 추가'}
          accentColor={pickerZone === 'pro' ? 'blue' : 'red'}
          maxCount={MAX_PER_ZONE}
        />
      )}

      <div className="space-y-3">
        {/* 진영 배정 + 설정 통합 카드 */}
        <div className="rounded-2xl border border-violet-200 overflow-hidden">
          {/* 헤더 */}
          <div className="px-3 py-1.5 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-violet-100 flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[13px]">⚖️</span>
              <span className="text-[12px] font-bold text-violet-700">찬반 토론</span>
            </div>
            {onTopicSelect && <TopicCarousel mode="procon" onSelect={onTopicSelect} experts={experts} />}
          </div>

          <div className="bg-white">
            {topContent ? (
              <div className="border-b border-violet-100 px-3 py-3">
                {topContent}
              </div>
            ) : null}

            {/* 찬반 드래그 존 */}
            <div className="p-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              {(['pro', 'con'] as const).map(zone => {
                const isOver = dragOver === zone;
                const assignedIds = Object.keys(proconStances).filter(id => proconStances[id] === zone);
                const assignedExperts = assignedIds
                  .map(id => experts.find(x => x.id === id))
                  .filter((expert): expert is Expert => Boolean(expert));
                const isFull = assignedIds.length >= MAX_PER_ZONE;
                const isPro = zone === 'pro';
                const canDrop = !isFull || (draggedId ? proconStances[draggedId] === zone : false);
                return (
                  <div key={zone} onDragOver={e => { e.preventDefault(); setDragOver(zone); }} onDragLeave={() => setDragOver(null)}
                    onDrop={() => { if (draggedId) assignStance(draggedId, zone); setDragOver(null); setDraggedId(null); }}
                    className={cn('rounded-lg border-2 border-dashed transition-all duration-150 p-2.5 flex flex-col',
                      isOver && canDrop ? isPro ? 'border-blue-400 bg-blue-50/50' : 'border-red-400 bg-red-50/50'
                        : isPro ? 'border-blue-200/60 bg-blue-50/20' : 'border-red-200/60 bg-red-50/20')}>
                    <div className="flex items-center justify-between">
                      <span className={cn('text-[11px] font-bold', isPro ? 'text-blue-600' : 'text-red-600')}>{isPro ? '찬성' : '반대'}</span>
                      <span className={cn('text-[9px]', isPro ? 'text-blue-400' : 'text-red-400')}>{assignedIds.length}/{MAX_PER_ZONE}</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div className="flex flex-wrap gap-2 justify-center items-start min-h-[44px]">
                      {Array.from({ length: MAX_PER_ZONE }, (_, index) => {
                        const expert = assignedExperts[index];
                        if (expert) {
                          return (
                            <button key={expert.id} type="button" onClick={() => removeStance(expert.id)}
                              draggable onDragStart={() => setDraggedId(expert.id)} onDragEnd={() => setDraggedId(null)}
                              className="w-[48px] min-h-[44px] flex flex-col items-center gap-0.5 group/slot animate-in fade-in zoom-in-75 duration-200">
                              <div className="relative group-hover/slot:opacity-70 transition-opacity">
                                <ExpertAvatar expert={expert} size="md" />
                                <div className="absolute inset-0 rounded-full flex items-center justify-center">
                                  <X className="w-3.5 h-3.5 text-red-500 opacity-0 group-hover/slot:opacity-100 transition-opacity" />
                                </div>
                              </div>
                              <span className={cn('text-[9px] font-semibold max-w-[48px] truncate group-hover/slot:text-red-500', isPro ? 'text-blue-600' : 'text-red-600')}>{expert.nameKo}</span>
                            </button>
                          );
                        }

                        return (
                          <button key={`${zone}-empty-${index}`} type="button" onClick={() => setPickerZone(zone)} className="w-[48px] min-h-[44px] flex flex-col items-center gap-0.5 group/add [&>span]:hidden">
                            <div className={cn('w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center transition-colors',
                              isPro ? 'border-blue-200 group-hover/add:border-blue-400' : 'border-red-200 group-hover/add:border-red-400')}>
                              <Plus className={cn('w-4 h-4', isPro ? 'text-blue-300' : 'text-red-300')} />
                            </div>
                            {assignedIds.length === 0 && index === 0 && <span className={cn('text-[8px]', isPro ? 'text-blue-300' : 'text-red-300')}>AI 추가</span>}
                          </button>
                        );
                      })}
                      </div>
                      <div className={cn('mt-1 h-4 text-[10px] font-semibold text-center', assignedIds.length === 0 ? (isPro ? 'text-blue-400' : 'text-red-400') : 'text-transparent select-none')}>
                        AI 추가
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>

            {bottomContent ? (
              <div className="border-t border-violet-100 bg-violet-50/30 px-3 py-3">
                {bottomContent}
              </div>
            ) : null}
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Brainstorm Settings Panel — 재설계 ──
function BrainstormSettingsPanel({ selectedIds, experts, selectedFramework, onFrameworkChange, debateSettings, onDebateSettingsChange, autoAssign, onAutoAssignChange, onToggle, onModeChange, onTopicSelect }: {
  selectedIds: string[];
  experts: Expert[];
  selectedFramework?: ThinkingFramework | null;
  autoAssign?: boolean;
  onAutoAssignChange?: (v: boolean) => void;
  onToggle?: (id: string) => void;
  onFrameworkChange?: (fw: ThinkingFramework | null) => void;
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
  onModeChange?: (mode: DiscussionMode) => void;
  onTopicSelect?: (title: string) => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const [showBotPicker, setShowBotPicker] = useState(false);
  const ds = debateSettings!;
  const update = (patch: Partial<DebateSettings>) => onDebateSettingsChange?.({ ...ds, ...patch });

  // 브레인스토밍은 항상 자동 배정 — 마운트 시 한번만 설정 (render-time side effect 대신 useEffect)
  useEffect(() => {
    if (!autoAssign) onAutoAssignChange?.(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="space-y-3">
        {/* Participants */}
        <div className="rounded-2xl border border-amber-200 overflow-visible">
          <div className="px-3 py-1 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100 rounded-t-xl flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[13px]">💡</span>
              <span className="text-[12px] font-bold text-amber-700">브레인스토밍</span>
            </div>
            {onTopicSelect && <TopicCarousel mode="brainstorm" onSelect={onTopicSelect} experts={experts} />}
          </div>
          {showBotPicker && <AIPickerModal experts={experts} selectedIds={selectedIds} onToggle={onToggle!} onClose={() => setShowBotPicker(false)} title="참여자 추가" accentColor="amber" maxCount={3} />}

          {/* 프레임워크 — 카드 안 */}
          <div className="px-3.5 py-3 bg-white border-t border-amber-100">
            <div className="text-[10px] font-semibold text-slate-600 mb-2">사고 프레임워크</div>
            <div className="grid grid-cols-5 gap-1.5">
              {THINKING_FRAMEWORKS.map((fw) => (
                <div key={fw.id} className="relative group/fw">
                  <button onClick={() => onFrameworkChange?.(selectedFramework?.id === fw.id ? null : fw)}
                    className={cn('relative w-full px-2 py-2 rounded-lg text-center transition-all duration-150',
                      selectedFramework?.id === fw.id ? `bg-gradient-to-br ${fw.color} ring-2 ring-slate-300` : 'bg-slate-50 hover:bg-slate-100')}>
                    {selectedFramework?.id === fw.id && (
                      <span className="absolute top-1 right-1 w-3 h-3 bg-slate-700 rounded-full flex items-center justify-center">
                        <Check className="w-2 h-2 text-white" />
                      </span>
                    )}
                    <div className="text-[13px]">{fw.icon}</div>
                    <div className="text-[9px] font-semibold text-slate-700 mt-0.5 leading-tight">{fw.nameKo}</div>
                  </button>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-52 p-3 rounded-xl bg-slate-800 text-white text-[10px] leading-relaxed shadow-xl opacity-0 invisible group-hover/fw:opacity-100 group-hover/fw:visible transition-all duration-200 z-[9999] pointer-events-none">
                    <div className="font-bold text-[11px] mb-1">{fw.icon} {fw.nameKo}</div>
                    <p className="text-slate-300 mb-2">{fw.detailDescription}</p>
                    <div className="space-y-0.5">{fw.rounds.map((r, i) => (
                      <div key={i} className="text-[9px] text-slate-400"><span className="text-slate-200">{i + 1}.</span> {r.label}</div>
                    ))}</div>
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-slate-800 rotate-45 -mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 설정 — 카드 하단 */}
          <div className="bg-white border-t border-amber-100 rounded-b-xl">
            <div className="flex items-center gap-3 px-4 py-2 [&>span]:text-[12px] [&>span]:font-semibold [&>span]:text-slate-600 [&>span]:w-16 [&>span]:tracking-tight">
              <span className="text-[9px] font-medium text-slate-400 w-14 shrink-0 tracking-wide text-center border-r border-slate-100 pr-3 mr-1">창의성</span>
              <div className="flex gap-1 flex-1">
                {[{ id: 'realistic' as const, l: '현실적' }, { id: 'balanced' as const, l: '균형' }, { id: 'radical' as const, l: '창의적' }].map(opt => (
                  <button key={opt.id} onClick={() => update({ creativityLevel: opt.id })}
                    className={cn('flex-1 py-1 rounded-md text-[10px] font-medium text-center transition-all',
                      ds.creativityLevel === opt.id ? 'bg-amber-100 text-amber-700 font-semibold' : 'text-slate-600 bg-slate-50 hover:bg-slate-100')}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center gap-1.5 px-4 py-2 border-t border-slate-100/80">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-slate-400">주제를 입력하면 AI가 적합한 참여자를 자동 선별합니다</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Hearing (청문회) Settings ──
function HearingSettingsPanel({ experts, selectedIds, debateSettings, onDebateSettingsChange, autoAssign, onAutoAssignChange, onToggle, onModeChange }: {
  onModeChange?: (mode: DiscussionMode) => void;
  experts: Expert[];
  selectedIds: string[];
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
  autoAssign?: boolean;
  onAutoAssignChange?: (v: boolean) => void;
  onToggle?: (id: string) => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const ds = debateSettings!;
  const update = (patch: Partial<DebateSettings>) => onDebateSettingsChange?.({ ...ds, ...patch });
  const selected = experts.filter(e => selectedIds.includes(e.id));

  const pressureOptions = [
    { id: 'mild' as const, label: '가능성 탐색', icon: '', desc: '실현 가능성 중심 검토' },
    { id: 'moderate' as const, label: '종합 평가', icon: '', desc: '모든 관점에서 엄격 검증' },
    { id: 'intense' as const, label: '리스크 분석', icon: '', desc: '위험 요소 집중 검증' },
  ];

  const focusOptions = [
    { id: 'overall' as const, label: '가볍게' },
    { id: 'logic' as const, label: '보통' },
    { id: 'feasibility' as const, label: '꼼꼼하게' },
    { id: 'ethics' as const, label: '냉정하게' },
  ];

  return (
    <div>
      <div className="space-y-3">
        {/* 검증 위원 + 설정 통합 카드 */}
        <div className="rounded-2xl border border-amber-200 overflow-hidden">
          {/* 헤더 */}
          <div className="px-3.5 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100 flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[13px]">🔍</span>
              <span className="text-[12px] font-bold text-amber-700">아이디어 검증</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Questioners */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600">검증 위원</span>
                </div>
                {selected.length < 2
                  ? <span className="text-[10px] text-amber-500 font-medium">2명 이상 선택해주세요</span>
                  : <span className="text-[10px] text-slate-400">{selected.length}명 위원</span>}
              </div>
              {selected.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selected.map(e => (
                    <button key={e.id} type="button" onClick={() => onToggle(e.id)}
                      className="inline-flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 hover:bg-red-50 hover:border-red-200 transition-colors group cursor-pointer">
                      <div className="pointer-events-none"><ExpertAvatar expert={e} size="sm" /></div>
                      <span className="text-[11px] font-medium text-slate-700 group-hover:text-red-500 pointer-events-none">{e.nameKo}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div onClick={() => setShowPicker(true)} className="py-3 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50 cursor-pointer hover:border-amber-300 hover:bg-amber-50/30 transition-colors">
                  <p className="text-[11px] text-slate-400">클릭하여 검증자를 추가하세요</p>
                </div>
              )}
            </div>

            {showPicker && <AIPickerModal experts={experts} selectedIds={selectedIds} onToggle={onToggle!} onClose={() => setShowPicker(false)} title="검증자 선택" accentColor="amber" maxCount={3} />}

            {/* Pressure level */}
            <div>
              <div className="text-[11px] font-bold text-slate-600 mb-2">검증 목적</div>
              <div className="flex gap-2">
                {pressureOptions.map(opt => (
                  <button key={opt.id} onClick={() => update({ hearingPressure: opt.id })}
                    className={cn('flex-1 px-3 py-2.5 rounded-lg text-center transition-all border',
                      ds.hearingPressure === opt.id ? 'bg-amber-100 text-amber-700 font-semibold border-amber-200' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}>
                    <div className="text-[12px] font-bold">{opt.label}</div>
                    <div className="text-[9px] opacity-70 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>


            {/* Settings toggle */}
            <button onClick={() => setShowDetail(!showDetail)}
              className="flex items-center gap-1.5 py-1.5 px-1 text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-all">
              세부 설정 {showDetail ? '접기 ▲' : '펼치기 ▼'}
            </button>
            {showDetail && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-500 w-16 shrink-0 cursor-help" title="각 전문가 답변의 분량을 조절합니다">답변 길이</span>
                  <div className="flex gap-1 flex-1">
                    {(['short', 'medium', 'long'] as const).map(v => (
                      <button key={v} onClick={() => update({ responseLength: v })}
                        className={cn('flex-1 py-1.5 rounded-md text-[10px] font-medium text-center transition-all', ds.responseLength === v ? 'bg-amber-100 text-amber-700 font-semibold' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400')}>
                        {v === 'short' ? '짧게' : v === 'medium' ? '보통' : '길게'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-slate-700">아이디어 점수</p>
                    <p className="text-[9px] text-slate-400">실현성·창의성·시장성 점수 평가</p>
                  </div>
                  <Toggle checked={ds.ideaScoring} onChange={v => update({ ideaScoring: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-slate-700">투자자 시뮬레이션</p>
                    <p className="text-[9px] text-slate-400">투자자 관점에서 투자 여부 판단</p>
                  </div>
                  <Toggle checked={ds.investorSimulation} onChange={v => update({ investorSimulation: v })} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


// ── Freetalk Settings Panel ──

function FreetalkSettingsPanel({ experts, selectedIds, debateSettings, onDebateSettingsChange, autoAssign, onAutoAssignChange, onToggle, onModeChange, onTopicSelect }: {
  onModeChange?: (mode: DiscussionMode) => void;
  experts: Expert[];
  selectedIds: string[];
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
  autoAssign?: boolean;
  onAutoAssignChange?: (v: boolean) => void;
  onToggle?: (id: string) => void;
  onTopicSelect?: (topic: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const selected = experts.filter(e => selectedIds.includes(e.id));
  const maxParticipants = 3;
  const visibleParticipantSlotCount = Math.min(maxParticipants, Math.max(1, selected.length + 1));
  const visibleParticipants = Array.from({ length: visibleParticipantSlotCount }, (_, index) => selected[index] ?? null);

  return (
    <div>
      {showPicker && <AIPickerModal experts={experts} selectedIds={selectedIds} onToggle={onToggle!} onClose={() => setShowPicker(false)} title="참여 AI 선택" accentColor="indigo" maxCount={3} />}

      <div className="space-y-3">
        {/* 참여자 + 설정 통합 카드 */}
        <div className="rounded-2xl border border-cyan-200 overflow-hidden">
          {/* 헤더 */}
          <div className="px-3 py-1.5 bg-gradient-to-r from-cyan-50 to-sky-50 border-b border-cyan-100 flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[13px]">💬</span>
              <span className="text-[12px] font-bold text-cyan-700">자유 토론</span>
            </div>
            {onTopicSelect && <TopicCarousel mode="freetalk" onSelect={onTopicSelect} experts={experts} />}
          </div>

          {/* 수동/자동 토글 + 참여자 슬롯 */}
          <div className="px-3 py-2 bg-white">
            <div className="flex items-center justify-center mb-2">
              <AutoManualToggle auto={autoAssign || false} onChange={v => onAutoAssignChange?.(v)} />
            </div>
            {autoAssign ? (
              <div className="flex flex-col items-center gap-2 py-3">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <p className="text-[11px] text-slate-400 text-center">질문을 입력하면 AI가<br/>적합한 참여자를 골라드려요</p>
              </div>
            ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <div className="flex items-center gap-3 flex-wrap justify-center">
                {visibleParticipants.filter(Boolean).map(e => (
                  <button key={e.id} type="button" onClick={() => onToggle?.(e.id)}
                    className="flex flex-col items-center gap-1 animate-in fade-in zoom-in-75 duration-200 group/p">
                    <div className="relative w-10 h-10 rounded-full bg-cyan-50 border-2 border-cyan-200 flex items-center justify-center group-hover/p:border-red-300 group-hover/p:bg-red-50 transition-colors">
                      <ExpertAvatar expert={e} size="md" />
                      <div className="absolute inset-0 rounded-full flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-red-500 opacity-0 group-hover/p:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600 max-w-[56px] truncate text-center group-hover/p:text-red-500 transition-colors">{e.nameKo}</span>
                  </button>
                ))}
                {Array.from({ length: visibleParticipantSlotCount - selected.length }).map((_, i) => (
                  <button key={`empty-freetalk-${i}`} type="button" onClick={() => setShowPicker(true)} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full border-2 border-dashed border-cyan-300 flex items-center justify-center hover:border-cyan-400 hover:bg-cyan-50/50 transition-colors cursor-pointer">
                      <Plus className="w-4 h-4 text-cyan-300" />
                    </div>
                  </button>
                ))}
              </div>
              {selected.length === 0 && (
                <span className="text-[11px] text-slate-400">클릭하여 AI를 추가하세요</span>
              )}
            </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Keyboard Battle Settings Panel ──

function AIvsUserSettingsPanel({ experts, selectedIds, debateSettings, onDebateSettingsChange, onToggle, onModeChange, hasAivsBattleStarted, onStartAivsBattle, onResetAivsBattle }: {
  onModeChange?: (mode: DiscussionMode) => void;
  experts: Expert[];
  selectedIds: string[];
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
  onToggle?: (id: string) => void;
  hasAivsBattleStarted?: boolean;
  onStartAivsBattle?: (draft: AivsBattleDraft) => void;
  onResetAivsBattle?: () => void;
}) {
  const [showBattleModal, setShowBattleModal] = useState(false);
  const ds = debateSettings!;
  const selectedAiId = ds.aivsUserBattleAiId || 'logical';
  const lockedTopic = hasAivsBattleStarted ? AIVS_USER_TOPIC_PRESETS.find(t => t.title === ds.aivsUserTopic) : null;

  return (
    <div>
      <div className="space-y-3">
        <div className="rounded-2xl border border-rose-200 overflow-hidden">
          <div className="px-3 py-1 bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-100 flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[13px]">⚔️</span>
              <span className="text-[12px] font-bold text-rose-700">키보드배틀</span>
              <span className="text-[9px] text-rose-400 font-medium">1:1</span>
            </div>
          </div>

          <div className="bg-white">
            {/* Battle AI character grid */}
            <div className="px-3 py-3">
              <p className="text-[10px] text-slate-400 text-center mb-2">상대 AI를 선택하세요</p>
              <div className="grid grid-cols-5 gap-1.5">
                {BATTLE_AI_CHARACTERS.map(ai => {
                  const isSelected = selectedAiId === ai.id;
                  return (
                    <button
                      key={ai.id}
                      type="button"
                      onClick={() => onDebateSettingsChange?.({ ...ds, aivsUserBattleAiId: ai.id })}
                      className={cn(
                        'flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border transition-all',
                        isSelected
                          ? 'border-rose-400 bg-rose-50 ring-1 ring-rose-300'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      )}
                    >
                      <span className="text-[22px]">{ai.icon}</span>
                      <span className={cn('text-[10px] font-bold', isSelected ? 'text-rose-700' : 'text-slate-700')}>{ai.name}</span>
                      <span className="text-[8px] text-slate-400 text-center leading-tight px-0.5">{ai.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Level selector + Battle start */}
            <div className="px-3 pb-3 space-y-2.5">
              {hasAivsBattleStarted && lockedTopic ? (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[14px] shrink-0">⚔️</span>
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-rose-700 truncate">{lockedTopic.title}</div>
                      <div className="text-[9px] text-rose-400 truncate">{lockedTopic.description}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onResetAivsBattle}
                    className="shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-medium text-rose-500 bg-white border border-rose-200 hover:bg-rose-50 transition-colors"
                  >
                    변경
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowBattleModal(true)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[13px] font-bold transition-all hover:from-rose-600 hover:to-pink-600 shadow-sm"
                >
                  ⚔️ 배틀 시작
                </button>
              )}
            </div>
          </div>
        </div>

        {onStartAivsBattle && (
          <AivsBattleConfigModal
            open={showBattleModal}
            onOpenChange={setShowBattleModal}
            onConfirm={onStartAivsBattle}
            battleAiId={selectedAiId}
          />
        )}
      </div>
    </div>
  );
}

// ── Simulation Mode Panel ──

function SimulationModePanel({ experts, settings, onSettingsChange, onSubmit, isDiscussing }: {
  experts: Expert[];
  settings: StakeholderSettings;
  onSettingsChange: (s: StakeholderSettings) => void;
  onSubmit: SubmitDiscussion;
  isDiscussing: boolean;
}) {
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario | null>(null);
  const [step2Scenario, setStep2Scenario] = useState<SimulationScenario | null>(null);
  const [step2Context, setStep2Context] = useState('');
  const [step2Answers, setStep2Answers] = useState<Record<string, string>>({});
  const [step2CustomMode, setStep2CustomMode] = useState<Record<string, boolean>>({});
  const [step2Files, setStep2Files] = useState<AttachedFile[]>([]);
  const [step2FileError, setStep2FileError] = useState<string | null>(null);
  const [step2FileProcessing, setStep2FileProcessing] = useState(false);
  const step2FileInputRef = useRef<HTMLInputElement>(null);

  const handleStep2FilesSelected = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setStep2FileError(null);
    setStep2FileProcessing(true);
    try {
      const newFiles: AttachedFile[] = [];
      for (const raw of Array.from(fileList)) {
        const err = validateFile(raw, [...step2Files, ...newFiles]);
        if (err) { setStep2FileError(err); continue; }
        try {
          const processed = await processFile(raw);
          newFiles.push(processed);
        } catch (e) {
          setStep2FileError(e instanceof Error ? e.message : '파일 처리 실패');
        }
      }
      if (newFiles.length > 0) setStep2Files(prev => [...prev, ...newFiles]);
    } finally {
      setStep2FileProcessing(false);
      if (step2FileInputRef.current) step2FileInputRef.current.value = '';
    }
  }, [step2Files]);
  const [dropdownRole, setDropdownRole] = useState<string | null>(null);
  const [botPickerCat, setBotPickerCat] = useState('전체');
  const [botPickerSearch, setBotPickerSearch] = useState('');
  const [simQuestion, setSimQuestion] = useState('');
  const [autoAssignRoles, setAutoAssignRoles] = useState(true);
  const [simFilter, setSimFilter] = useState<'all' | 'roleplay' | 'consultation'>('all');

  const update = (patch: Partial<StakeholderSettings>) => onSettingsChange({ ...settings, ...patch });

  const assignedExpertIds = new Set(Object.values(settings.roleAssignments));
  const intensityLabel = settings.intensity <= 3 ? '건설적' : settings.intensity <= 6 ? '균형' : '날카로운';

  const handleSelectScenario = (scenario: SimulationScenario) => {
    setSelectedScenario(scenario);
    update({ scenarioId: scenario.id, roleAssignments: {}, intensity: scenario.defaultIntensity, prepAnswers: {} });
    setDropdownRole(null);
  };

  const handleAssignRole = (roleName: string, expertId: string) => {
    const newAssignments = { ...settings.roleAssignments };
    for (const [key, val] of Object.entries(newAssignments)) {
      if (val === expertId) delete newAssignments[key];
    }
    newAssignments[roleName] = expertId;
    update({ roleAssignments: newAssignments });
    setDropdownRole(null);
  };

  const handleRemoveRole = (roleName: string) => {
    const newAssignments = { ...settings.roleAssignments };
    delete newAssignments[roleName];
    update({ roleAssignments: newAssignments });
  };

  const availableExperts = experts.filter(e => !assignedExpertIds.has(e.id));

  return (
    <>

      {/* Unified grid */}
      <div className="grid grid-cols-3 gap-2">
        {(() => {
          const priorityOrder = ['admission', 'investment', 'interview', 'b2b_sales', 'crisis', 'product', 'content_pitch', 'collab', 'complaint', 'policy', 'strategy', 'internal', 'salary', 'parent_meeting', 'regulation', 'partnership', 'budget', 'committee', 'startup_pitch', 'medical_consult', 'wedding_plan', 'school_bully', 'estate_dispute', 'franchise_consult', 'tenant_dispute', 'career_change', 'insurance_claim', 'neighborhood', 'immigration', 'influencer_crisis', 'divorce_mediation', 'elderly_care', 'whistleblower', 'debt_crisis', 'child_custody', 'workplace_harassment', 'medical_decision', 'startup_cofounder', 'school_transfer', 'contract_negotiation', 'mental_health', 'inheritance_plan'];
          return [...SIMULATION_SCENARIOS].sort((a, b) => priorityOrder.indexOf(a.id) - priorityOrder.indexOf(b.id));
        })().map((scenario, i) => (
          <button key={scenario.id}
            onClick={() => handleSelectScenario(scenario)}
            style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
            className="relative text-left rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)] hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-400">

            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${scenario.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${scenario.gradient} flex items-center justify-center text-[22px] shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                {scenario.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[13px] font-bold text-slate-800 group-hover:text-indigo-700 transition-colors leading-tight">{scenario.name}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{scenario.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Floating Modal — Roleplay */}
      {selectedScenario && selectedScenario.simType === 'roleplay' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedScenario(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-[480px] max-h-[85vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}>

            {/* Header with gradient */}
            <div className={`shrink-0 px-5 py-4 bg-gradient-to-br ${selectedScenario.gradient} relative`}>
              <button onClick={() => setSelectedScenario(null)} className="absolute top-3 right-3 p-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-white/50 transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedScenario.icon}</span>
                <div>
                  <h3 className="text-[16px] font-bold text-slate-800">{selectedScenario.name}</h3>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {selectedScenario.userRole
                      ? `당신은 ${selectedScenario.userRole}로서 ${selectedScenario.description}`
                      : selectedScenario.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Role list */}
              <div>
                <div className="mb-2">
                  <span className="text-[11px] font-bold text-slate-600">참여 역할</span>
                </div>
                <div className="space-y-1.5">
                  {/* 당신의 역할 */}
                  {selectedScenario.userRole && (
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 border-indigo-300 bg-indigo-50/30">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-lg shrink-0">🎭</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold text-indigo-700">당신의 역할 · {selectedScenario.userRole}</div>
                      </div>
                      <span className="text-[9px] font-bold text-indigo-500 px-2 py-0.5 rounded-full bg-indigo-100 shrink-0">YOU</span>
                    </div>
                  )}
                  {selectedScenario.roles.map((role, ri) => {
                    const roleQuestions: Record<string, string[]> = {
                      'VC 파트너': ['시장 규모', '엑싯 전략'],
                      '재무 심사역': ['번레이트', '밸류에이션'],
                      '업계 전문 심사역': ['기술 검증', 'PMF'],
                      'CEO': ['전략 방향', '비전'],
                      'CFO': ['ROI', '예산'],
                      '실무 팀장': ['실행력', '일정'],
                      '얼리어답터': ['UX', '가격'],
                      '제품 경쟁 PM': ['차별점', '전환비용'],
                      '테크 저널리스트': ['혁신성', '임팩트'],
                      '시민단체 대표': ['형평성', '여론'],
                      '산업계 대표': ['규제비용', '고용'],
                      '헌법학자': ['위헌소지', '기본권'],
                      '기술 면접관': ['코딩', '설계'],
                      'HR 매니저': ['컬처핏', '성장성'],
                      '팀 리더': ['협업', '갈등해결'],
                      '마케팅 이사': ['시장전략', '브랜딩'],
                      '개발 리드': ['기술실현', '일정'],
                      '운영 매니저': ['리소스', '프로세스'],
                      '타겟 고객': ['필요성', '가격'],
                      '경쟁사 PM': ['차별점', '전환비용'],
                      '테크 리뷰어': ['완성도', '확장성'],
                      '시민 대표': ['형평성', '여론'],
                      '기업 대표': ['규제부담', '고용'],
                      '법률 전문가': ['합헌성', '선례'],
                      '대표이사': ['전략방향', '비전'],
                      '협업 팀장': ['실행력', '리소스'],
                      '학과 교수': ['전공적합', '학업계획'],
                      '입학 사정관': ['진정성', '성장가능'],
                      '인성 면접관': ['가치관', '리더십'],
                    };
                    const tags = roleQuestions[role.name] || role.focus.split(',').map(s => s.trim()).slice(0, 2);
                    const roleDescs: Record<string, string> = {
                      'VC 파트너': '투자 가치와 성장 잠재력을 평가합니다',
                      '재무 심사역': '재무 건전성과 수익 구조를 검증합니다',
                      '업계 전문 심사역': '기술력과 시장 적합성을 분석합니다',
                      '직무 면접관': '직무 전문성과 문제해결 역량을 검증합니다',
                      'HR 담당자': '조직 적합성과 성장 가능성을 평가합니다',
                      '팀 리더': '협업 스타일과 팀 내 역할을 확인합니다',
                      '타겟 고객': '실제 사용자 관점에서 제품을 평가합니다',
                      '경쟁사 PM': '기존 대안 대비 차별점을 분석합니다',
                      '테크 리뷰어': '기술 완성도와 시장 임팩트를 봅니다',
                      '시민 대표': '정책이 국민 생활에 미치는 영향을 봅니다',
                      '기업 대표': '산업과 경제에 미치는 영향을 분석합니다',
                      '법률 전문가': '법적 타당성과 집행 가능성을 검토합니다',
                      '마케팅 이사': '시장 접근과 고객 획득 전략을 제시합니다',
                      '개발 리드': '기술적 실현 가능성을 검토합니다',
                      '운영 매니저': '운영 효율과 리소스 배분을 분석합니다',
                      '대표이사': '회사 전략과의 부합 여부를 판단합니다',
                      'CFO': '비용 대비 효과를 분석합니다',
                      '협업 팀장': '현장 실행 가능성을 검토합니다',
                      '학과 교수': '전공 적합성과 학문적 역량을 평가합니다',
                      '입학 사정관': '활동의 진정성과 성장 가능성을 봅니다',
                      '인성 면접관': '가치관과 공동체 의식을 확인합니다',
                    };
                    const desc = roleDescs[role.name] || role.focus;
                    return (
                      <div key={role.name}>
                        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
                          <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-lg shrink-0 border border-slate-100">
                            {role.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold text-slate-700">{role.name}</div>
                            <div className="text-[9px] text-slate-400 truncate">{desc}</div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {tags.map((tag, i) => (
                              <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 안내 */}
              <div className="pt-1">
                <div className="space-y-0">
                  {(({
                    investment: [
                      '사업 모델과 시장 규모를 설득력 있게 설명하기',
                      '번레이트·밸류에이션 등 까다로운 재무 질문 대응',
                      '종료 후 각 심사역의 투자 가능성 판정과 피드백 제공',
                    ],
                    interview: [
                      '직무 역량과 경험을 구조적으로 어필하기',
                      '갈등 해결·협업 사례 등 인성 질문 대응',
                      '종료 후 면접관별 합격 판정과 개선 포인트 제공',
                    ],
                    product: [
                      '제품의 핵심 가치를 고객 관점에서 전달하기',
                      '기존 대안 대비 전환 이유를 설득하기',
                      '종료 후 고객·경쟁사·리뷰어의 구매 의향 판정 제공',
                    ],
                    policy: [
                      '정책의 필요성과 기대 효과를 논리적으로 설명하기',
                      '시민·기업·법률 관점의 다각도 반론에 대응',
                      '종료 후 이해관계자별 지지율 판정과 보완점 제공',
                    ],
                    strategy: [
                      '전략의 근거와 예상 성과를 구체적으로 제시하기',
                      '마케팅·개발·운영 관점의 현실적 피드백 대응',
                      '종료 후 팀원별 합의도 판정과 실행 제안 제공',
                    ],
                    internal: [
                      '제안의 비용 대비 효과를 경영진 눈높이로 설명하기',
                      'CEO·CFO·실무팀장의 서로 다른 관심사에 대응',
                      '종료 후 경영진의 승인 판정과 보완 요청 제공',
                    ],
                    admission: [
                      '지원 동기와 학업 계획을 진정성 있게 전달하기',
                      '교수·사정관의 검증 질문에 자연스럽게 대응',
                      '종료 후 면접관별 합격 판정과 어필 포인트 제공',
                    ],
                    content_pitch: [
                      '콘텐츠의 차별점과 타겟 시청자를 명확히 어필하기',
                      '광고 수익성·편성 적합성 질문에 대응',
                      '종료 후 편성 가능성 판정과 기획 보완점 제공',
                    ],
                    b2b_sales: [
                      '솔루션의 도입 효과를 고객사 상황에 맞춰 설명하기',
                      '구매 담당·실무자·의사결정권자 각각의 관심사 대응',
                      '종료 후 도입 가능성 판정과 영업 전략 피드백 제공',
                    ],
                    crisis: [
                      '위기 상황에서 책임감 있는 입장을 전달하기',
                      '기자·피해자·법무팀의 동시 압박에 대응',
                      '종료 후 위기 수습도 판정과 대응 개선점 제공',
                    ],
                    collab: [
                      '제휴의 상호 이익을 상대 관점에서 설득하기',
                      '브랜드 이미지·계약 조건·법적 리스크 질문 대응',
                      '종료 후 제휴 가능성 판정과 조건 협의 피드백 제공',
                    ],
                    complaint: [
                      '격앙된 고객의 감정을 진정시키며 대안 제시하기',
                      '무리한 보상 요구에 규정 내에서 대응',
                      '종료 후 고객 만족도 판정과 CS 개선점 제공',
                    ],
                  } as Record<string, string[]>)[selectedScenario.id] || [
                    `${selectedScenario.roles[0]?.name || 'AI'}의 핵심 질문에 대응하기`,
                    '상황별 전략적 답변 구성 연습',
                    '실전과 유사한 압박 질문 경험',
                  ]).map((text, i, arr) => (
                    <div key={i} className={cn(
                      "flex items-center gap-2.5 py-2",
                      i < arr.length - 1 && "border-b border-slate-100"
                    )}>
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-[9px] font-bold text-slate-500 flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className={cn("text-[11px] leading-snug", i === arr.length - 1 ? "text-slate-700 font-medium" : "text-slate-600")}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Start button */}
            <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setStep2Scenario(selectedScenario);
                  setStep2Context('');
                  setStep2Answers({});
                  setStep2CustomMode({});
                  setSelectedScenario(null);
                }}
                className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-[13px] font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5"
              >
                다음 <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Step 2: 세부 설정 모달 */}
      {step2Scenario && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setStep2Scenario(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-[20px]">
                {step2Scenario.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-bold text-slate-800">{step2Scenario.name}</h3>
                <p className="text-[11px] text-slate-400">세부 사항을 설정하세요</p>
              </div>
              <button onClick={() => setStep2Scenario(null)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* 콘텐츠 — 스크롤 가능 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* prepQuestions (있는 경우) */}
              {step2Scenario.prepQuestions.length > 0 && (
                <div className="space-y-4">
                  {step2Scenario.prepQuestions.map((q, qi) => (
                    <div key={q.id}>
                      <p className="text-[12px] font-bold text-slate-700 mb-2 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-black flex items-center justify-center shrink-0">{qi + 1}</span>
                        {q.question}
                      </p>
                      {q.options.length === 0 ? (
                        /* 텍스트 전용 질문 */
                        <input
                          value={step2Answers[q.id] || ''}
                          onChange={e => setStep2Answers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder={`${q.question}을 입력하세요`}
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] text-slate-700 placeholder:text-slate-300 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 transition-all"
                        />
                      ) : step2CustomMode[q.id] ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={step2Answers[q.id] || ''}
                            onChange={e => setStep2Answers(prev => ({ ...prev, [q.id]: e.target.value }))}
                            placeholder="직접 입력..."
                            className="flex-1 rounded-lg border border-indigo-300 px-3 py-1.5 text-[11px] text-slate-700 outline-none focus:ring-1 focus:ring-indigo-200"
                          />
                          <button onClick={() => { setStep2CustomMode(prev => ({ ...prev, [q.id]: false })); setStep2Answers(prev => { const n = { ...prev }; delete n[q.id]; return n; }); }}
                            className="text-[10px] text-slate-400 hover:text-slate-600 shrink-0">취소</button>
                        </div>
                      ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {q.options.map(opt => (
                          <button key={opt.value}
                            onClick={() => setStep2Answers(prev => ({ ...prev, [q.id]: opt.value }))}
                            className={cn('px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all',
                              step2Answers[q.id] === opt.value
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-200'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50'
                            )}>
                            {opt.label}
                          </button>
                        ))}
                        <button
                          onClick={() => { setStep2CustomMode(prev => ({ ...prev, [q.id]: true })); setStep2Answers(prev => { const n = { ...prev }; delete n[q.id]; return n; }); }}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-all">
                          직접 입력
                        </button>
                      </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 자유 텍스트 입력 */}
              <div>
                <p className="text-[12px] font-bold text-slate-700 mb-2">
                  {step2Scenario.prepQuestions.length > 0 ? '추가 상황 설명' : '상황 설명'}
                  <span className="text-[10px] font-normal text-slate-400 ml-1.5">(선택)</span>
                </p>
                <textarea
                  value={step2Context}
                  onChange={e => setStep2Context(e.target.value)}
                  placeholder={step2Scenario.contextPlaceholder || '시뮬레이션에 필요한 배경 정보를 자유롭게 적어주세요...'}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-[12px] text-slate-700 placeholder:text-slate-300 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none resize-none transition-all"
                />
              </div>

              {/* 참고 자료 파일 업로드 */}
              <div>
                <p className="text-[12px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  참고 자료 첨부
                  <span className="text-[10px] font-normal text-slate-400">(선택 · 최대 {MAX_FILES}개)</span>
                </p>
                <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">
                  자소서·계약서·기획서 등을 올리면 AI가 해당 내용 기반으로 더 구체적으로 질문합니다 · PDF/DOCX/XLSX/이미지
                </p>
                <input
                  ref={step2FileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
                  onChange={e => handleStep2FilesSelected(e.target.files)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => step2FileInputRef.current?.click()}
                  disabled={step2FileProcessing || step2Files.length >= MAX_FILES}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-slate-300 text-[11px] font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  {step2FileProcessing ? '처리 중...' : step2Files.length === 0 ? '파일 선택' : `파일 추가 (${step2Files.length}/${MAX_FILES})`}
                </button>
                {step2Files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {step2Files.map(f => (
                      <div key={f.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-[10.5px] text-slate-600 truncate">{f.name}</span>
                          {f.extractedText && (
                            <span className="text-[9px] text-emerald-600 font-semibold shrink-0">· 텍스트 추출됨</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep2Files(prev => prev.filter(x => x.id !== f.id))}
                          className="text-slate-400 hover:text-red-500 shrink-0 ml-1.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {step2FileError && (
                  <p className="mt-1.5 text-[10px] text-red-500 font-medium">{step2FileError}</p>
                )}
              </div>

              {/* 반응 강도 슬라이더 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold text-slate-700">반응 강도</span>
                  <span className={cn('text-[10px] font-medium',
                    settings.intensity <= 3 ? 'text-sky-600' : settings.intensity <= 6 ? 'text-slate-500' : 'text-red-500'
                  )}>{intensityLabel} ({settings.intensity})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-sky-500 font-medium shrink-0">건설적</span>
                  <input type="range" min={1} max={10} value={settings.intensity}
                    onChange={e => update({ intensity: parseInt(e.target.value) })}
                    className="flex-1 h-1.5 accent-indigo-500" />
                  <span className="text-[10px] text-red-500 font-medium shrink-0">날카로운</span>
                </div>
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="shrink-0 px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <button
                onClick={() => { setSelectedScenario(step2Scenario); setStep2Scenario(null); }}
                className="text-[12px] text-slate-400 hover:text-slate-600 font-medium transition-colors"
              >
                ← 뒤로
              </button>
              <button
                onClick={() => {
                  const scenarioId = step2Scenario.id;
                  const contextAnswers: Record<string, string> = { ...step2Answers };
                  if (step2Context.trim()) contextAnswers.__context__ = step2Context.trim();
                  if (step2Files.length > 0) {
                    const fileBlocks = step2Files.map(f => {
                      const text = (f.extractedText || '').trim();
                      const snippet = text.length > 3000 ? `${text.slice(0, 3000)}\n...(이하 생략)` : text;
                      return snippet
                        ? `[파일: ${f.name}]\n${snippet}`
                        : `[파일: ${f.name}] (텍스트 추출 불가, 파일명만 참고)`;
                    });
                    contextAnswers.__files__ = fileBlocks.join('\n\n---\n\n');
                  }
                  update({ prepAnswers: contextAnswers });
                  setStep2Scenario(null);
                  setStep2Files([]);
                  setStep2FileError(null);
                  onSubmit(`__SIM_START__:${scenarioId}`, undefined, 'stakeholder');
                }}
                disabled={step2FileProcessing || (step2Scenario.prepQuestions.length > 0 && step2Scenario.prepQuestions.some(q => !step2Answers[q.id]?.trim()))}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-[13px] font-bold hover:bg-indigo-700 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                시뮬레이션 시작 <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </>
  );
}




// ── Player Lobby (Game Mode) ──
function PlayerLobby({ onSubmit, isDiscussing, onStartGame, onBackToHub }: { onSubmit: SubmitDiscussion; isDiscussing: boolean; onStartGame?: (gameId: string, option: string, label: string) => void; onBackToHub?: () => void }) {
  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-slate-400 text-sm">준비 중입니다</p>
    </div>
  );
}

// ══════════════════════════════════════════
// ── Main ExpertSelectionPanel ──
// ══════════════════════════════════════════
export function ExpertSelectionPanel({
  experts, selectedIds, onToggle, discussionMode, onModeChange, isDiscussing,
  onSubmit, onSubmitWithFiles, proconStances = {}, onProconStancesChange,
  debateSettings, onDebateSettingsChange, showDebateSettings,
  selectedFramework, onFrameworkChange,
  discussionIssues = [], onDiscussionIssuesChange,
  onBulkSelect,
  onSampleQuestionClick,
  onStartGame,
  stakeholderSettings,
  onStakeholderSettingsChange,
  onSelectPremiumDomain,
  selectedPremiumDomain,
  hasAivsBattleStarted,
  onStartAivsBattle,
  onResetAivsBattle,
  selectedAssistantCardId,
  onAssistantCardChange,
  onAssistantSubmit,
}: Props) {
  // Phase C: 히어로 개인화 인사에 사용. AccountStatus 서브컴포넌트가 쓰던 것과 별개로 여기서도 호출.
  const { user, profile } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>('ai');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('전체');
  const [aiModelExpanded, setAiModelExpanded] = useState(false);
  const isProcon = discussionMode === 'procon';
  const [proconAssignMode, setProconAssignMode] = useState<'manual' | 'auto'>('manual');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<'pro' | 'con' | null>(null);
  const [hintId, setHintId] = useState<string | null>(null);
  const [maxLimitMsg, setMaxLimitMsg] = useState<string | null>(null);
  const [autoAssign, setAutoAssign] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [prefilledQuestion, setPrefilledQuestion] = useState('');

  const maxLimitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { hoveredExpert, tipPos, showTip, hideTip } = useHoverExpertTip();

  useEffect(() => () => {
    if (maxLimitTimeoutRef.current) clearTimeout(maxLimitTimeoutRef.current);
  }, []);

  const MAX_PER_ZONE = debateSettings?.proconTeamSize || 3;
  const mainMode = getMainMode(discussionMode);
  const proconProCount = Object.values(proconStances).filter((stance) => stance === 'pro').length;
  const proconConCount = Object.values(proconStances).filter((stance) => stance === 'con').length;
  const isProconTeamComplete = proconProCount === MAX_PER_ZONE && proconConCount === MAX_PER_ZONE;

  useEffect(() => {
    if (!isProcon) return;

    const nextStances = { ...proconStances };
    const overflowIds: string[] = [];

    (['pro', 'con'] as const).forEach((stance) => {
      const orderedIds = [
        ...selectedIds.filter((id) => proconStances[id] === stance),
        ...Object.keys(proconStances).filter((id) => proconStances[id] === stance && !selectedIds.includes(id)),
      ];

      orderedIds.slice(MAX_PER_ZONE).forEach((id) => {
        delete nextStances[id];
        overflowIds.push(id);
      });
    });

    if (overflowIds.length === 0) return;

    onProconStancesChange?.(nextStances);
    overflowIds.forEach((id) => {
      if (selectedIds.includes(id)) onToggle(id);
    });
  }, [MAX_PER_ZONE, isProcon, onProconStancesChange, onToggle, proconStances, selectedIds]);

  // 자동 배정: 질문 키워드 기반 적합한 전문가 선택
  const autoPickExperts = (question: string): string[] => {
    const q = question.toLowerCase();
    const score = (e: Expert) => {
      let s = 0;
      const desc = (e.description + ' ' + e.nameKo + ' ' + e.name).toLowerCase();
      // 키워드 매칭
      if (/의학|건강|병|질병|증상|치료|약|의사|수술|진단|암|감기|두통|복통|알레르기/.test(q) && /의|medical|health|doctor/.test(desc)) s += 3;
      if (/법|소송|계약|판례|변호사|법률|범죄|형사|민사|헌법|저작권|특허|규제/.test(q) && /법|legal|law/.test(desc)) s += 3;
      if (/투자|주식|금융|경제|재무|돈|펀드|유가|원유|환율|금리|물가|GDP|인플레|디플레|무역|수출|수입|세금|부채|채권|코인|비트코인|부동산/.test(q) && /금융|투자|경제|finance|invest|econo/.test(desc)) s += 3;
      if (/코드|개발|프로그래밍|소프트웨어|버그|API|서버|데이터베이스|알고리즘/.test(q) && /코딩|개발|code|program/.test(desc)) s += 3;
      if (/심리|정신|상담|스트레스|우울|불안|트라우마|자존감/.test(q) && /심리|psycho|상담/.test(desc)) s += 3;
      if (/교육|학습|공부|시험|학교|대학|입시|커리큘럼/.test(q) && /교|teacher|education/.test(desc)) s += 3;
      if (/역사|전쟁|문명|고대|근현대|왕조|식민지/.test(q) && /역사|history/.test(desc)) s += 3;
      if (/철학|윤리|도덕|존재|정의|자유|의식/.test(q) && /철학|philosophy|ethic/.test(desc)) s += 3;
      if (/부동산|집|아파트|전세|매매|임대|청약|분양/.test(q) && /부동산|real estate/.test(desc)) s += 3;
      if (/창업|사업|스타트업|비즈니스|마케팅|매출|고객/.test(q) && /창업|사업|startup|business|마케팅/.test(desc)) s += 3;
      if (/예술|디자인|음악|미술|영화|문학|창작/.test(q) && /예술|art|design|creative|문학|영화/.test(desc)) s += 3;
      if (/과학|연구|실험|물리|화학|생물|우주|양자/.test(q) && /과학|science|research/.test(desc)) s += 3;
      if (/에너지|원전|석유|가스|신재생|탄소|기후|환경/.test(q) && /에너지|환경|기후|energy|climate/.test(desc)) s += 3;
      if (/정치|선거|외교|안보|국방|통일|북한/.test(q) && /정치|외교|political|국제/.test(desc)) s += 3;
      if (/ai|인공지능|기술|미래|로봇|자동화/.test(q) && e.category === 'ai') s += 2;
      // 카테고리 다양성 보너스 (기본 점수)
      if (e.category === 'ai') s += 1;
      if (e.category === 'specialist') s += 1;
      return s;
    };
    const candidates = experts.filter(e => e.id !== 'router');
    const scored = candidates.map(e => ({ id: e.id, cat: e.category, score: score(e) }));
    scored.sort((a, b) => b.score - a.score);
    // 카테고리 중복 최소화하며 상위 3명 선택
    const picks: string[] = [];
    const usedCats = new Set<string>();
    for (const s of scored) {
      if (picks.length >= 3) break;
      if (usedCats.has(s.cat) && picks.length < 2) continue; // 처음 2명은 다른 카테고리
      picks.push(s.id);
      usedCats.add(s.cat);
    }
    // 3명 미달 시 채우기
    for (const s of scored) {
      if (picks.length >= 3) break;
      if (!picks.includes(s.id)) picks.push(s.id);
    }
    return picks;
  };

  // 자동 배정 모드에서 질문 제출 시
  const handleAutoSubmit = (question: string) => {
    if (!onBulkSelect) return;
    const picks = autoPickExperts(question);
    onBulkSelect(picks);
    // overrideExpertIds로 직접 전달 (state 업데이트 대기 불필요)
    onSubmit(question, picks);
  };

  const handleAutoSubmitWithFiles = (question: string, files: AttachedFile[]) => {
    if (!onSubmitWithFiles) {
      handleAutoSubmit(question);
      return;
    }

    if (!onBulkSelect) {
      onSubmitWithFiles(question, files);
      return;
    }

    const picks = autoPickExperts(question);
    onBulkSelect(picks);
    onSubmitWithFiles(question, files, picks);
  };

  const supportsAutoAssign = discussionMode === 'standard' || discussionMode === 'brainstorm' || discussionMode === 'hearing' || discussionMode === 'freetalk' || discussionMode === 'stakeholder';
  const handleAutoAssignChange = useCallback((value: boolean) => {
    setAutoAssign(value);
    if (value) {
      onBulkSelect?.([]);
    }
  }, [onBulkSelect]);

  const showTransientMaxLimitMessage = useCallback((message: string) => {
    setMaxLimitMsg(message);
    if (maxLimitTimeoutRef.current) {
      clearTimeout(maxLimitTimeoutRef.current);
    }
    maxLimitTimeoutRef.current = setTimeout(() => {
      setMaxLimitMsg(null);
      maxLimitTimeoutRef.current = null;
    }, 2000);
  }, []);

  const assignStance = useCallback((expertId: string, stance: ProconStance) => {
    const count = Object.values(proconStances).filter(s => s === stance).length;
    const alreadyInZone = proconStances[expertId] === stance;
    if (!alreadyInZone && count >= MAX_PER_ZONE) return;
    const next = { ...proconStances, [expertId]: stance };
    onProconStancesChange?.(next);
    if (!selectedIds.includes(expertId)) onToggle(expertId);
  }, [MAX_PER_ZONE, onProconStancesChange, onToggle, proconStances, selectedIds]);

  const removeStance = useCallback((expertId: string) => {
    const next = { ...proconStances };
    delete next[expertId];
    onProconStancesChange?.(next);
    if (selectedIds.includes(expertId)) onToggle(expertId);
  }, [onProconStancesChange, onToggle, proconStances, selectedIds]);

  const handleExpertSelection = useCallback((expertId: string, isSelected: boolean, stance?: ProconStance) => {
    if (isProcon) {
      if (proconAssignMode === 'auto') {
        onToggle(expertId);
        return;
      }

      if (stance) {
        removeStance(expertId);
        return;
      }

      const proCount = Object.values(proconStances).filter((value) => value === 'pro').length;
      const conCount = Object.values(proconStances).filter((value) => value === 'con').length;

      if (proCount < MAX_PER_ZONE && proCount <= conCount) {
        assignStance(expertId, 'pro');
        return;
      }

      if (conCount < MAX_PER_ZONE) {
        assignStance(expertId, 'con');
        return;
      }

      if (proCount < MAX_PER_ZONE) {
        assignStance(expertId, 'pro');
        return;
      }

      showTransientMaxLimitMessage('찬성/반대 모두 가득 찼습니다');
      return;
    }

    if (mainMode === 'multi' && !isSelected && selectedIds.length >= 3) {
      showTransientMaxLimitMessage('멀티 AI는 최대 3개까지 선택할 수 있습니다');
      return;
    }

    if (mainMode === 'debate' && !isSelected && selectedIds.length >= 4) {
      showTransientMaxLimitMessage('최대 4명까지 선택할 수 있습니다');
      return;
    }

    onToggle(expertId);
  }, [
    MAX_PER_ZONE,
    assignStance,
    isProcon,
    mainMode,
    onToggle,
    proconAssignMode,
    proconStances,
    removeStance,
    selectedIds.length,
    showTransientMaxLimitMessage,
  ]);

  const subtitleText = mainMode === 'general'
    ? 'GPT, Claude, Gemini 등 원하는 AI를 선택하고 자유롭게 대화하세요'
    : mainMode === 'multi'
      ? '여러 챗봇을 선택하면 각자 답변한 뒤 하나의 종합 결론으로 정리해드립니다'
      : mainMode === 'debate'
        ? (discussionMode === 'brainstorm' ? '사고 프레임워크를 선택하면 AI들이 다양한 아이디어를 발산합니다'
          : discussionMode === 'freetalk' ? '2명 이상 선택 후 주제를 던지면 AI들이 자유롭게 토론합니다'
          : discussionMode === 'aivsuser' ? 'AI 상대를 선택하고 주제를 정해 실전 토론에 도전하세요'
          : '2명 이상 선택 후 질문하면 토론을 거쳐 최종 결론을 도출합니다')
        : mainMode === 'stakeholder_main'
          ? '이해관계자 역할을 배정하고 시나리오를 시뮬레이션합니다'
          : mainMode === 'brainstorm_main'
            ? '사고 프레임워크를 선택하면 AI들이 협업해 정리된 결과를 제공합니다'
            : mainMode === 'premium_main'
              ? '전문가들이 단계별로 질문하며 최고 품질의 상담을 제공합니다'
              : mainMode === 'assistant'
                ? '목적에 맞는 AI 어시스턴트를 선택해 작업을 도와받으세요'
                : mainMode === 'player'
                  ? 'AI와 함께 게임, 퀴즈, 재미있는 놀이를 즐겨보세요'
                  : '';

  const typedSubtitle = useTypewriter(subtitleText, 20);
  const isGeneral = mainMode === 'general';

  // Expert grid visibility:
  // - general/multi: all categories shown, all selectable
  // - brainstorm: all categories shown, all selectable (including AI)
  // - standard/procon: all categories shown, but AI models are grayed/disabled
  const showExpertGrid = mainMode === 'general' || mainMode === 'multi';
  const isDebateMode = mainMode === 'debate';
  const isStandardOrProcon = false; // AI 모델 제한 해제
  const isBrainstorm = discussionMode === 'brainstorm';
  const isHearing = discussionMode === 'hearing';
  const isStakeholder = discussionMode === 'stakeholder';

  const { favoriteIds, favoriteSet, toggleFavorite } = useFavoriteExperts();
  const visibleCategories = EXPERT_CATEGORY_ORDER;
  const grouped = useMemo(() => buildExpertSelectionGroups({
    experts,
    favoriteIds,
    visibleCategories,
    aiAgentIds: AI_AGENT_IDS,
  }), [experts, favoriteIds, visibleCategories]);

  const validCats = grouped.map(g => g.cat);
  const aiBlocked = isStandardOrProcon && activeCategory === 'ai';
  const effectiveCategory = aiBlocked
    ? (validCats.find(c => c === 'specialist') || validCats[0] || 'ai')
    : (validCats.includes(activeCategory) ? activeCategory : validCats[0] || 'ai');
  const previousMainModeRef = useRef<MainMode>(mainMode);
  const skipHeroAnimation = isInstantChatLayoutSwitch(previousMainModeRef.current, mainMode);

  useEffect(() => {
    previousMainModeRef.current = mainMode;
  }, [mainMode]);

  const applyModeChange = useCallback((m: MainMode) => {
    setAutoAssign(false);
    if (m === 'general') onModeChange('general');
    else if (m === 'multi') onModeChange('multi');
    else if (m === 'brainstorm_main') onModeChange('brainstorm');
    else if (m === 'stakeholder_main') onModeChange('stakeholder');
    else if (m === 'premium_main') onModeChange('expert');
    else if (m === 'assistant') onModeChange('assistant');
    else if (m === 'player') onModeChange('player');
    else if (m === 'research_main') onModeChange('research');
    else if (m === 'study_main') onModeChange('study');
    else onModeChange('procon');
  }, [onModeChange]);

  const {
    pendingMode,
    transitionPhase,
    handleMainModeChange,
    contentVisible,
    showPlayerBg,
  } = useMainModeTransition({
    mainMode,
    applyModeChange,
    isInstantSwitch: isInstantChatLayoutSwitch,
  });

  const isPlayerActive = mainMode === 'player';
  const isLeavingPlayer = mainMode === 'player' && pendingMode !== null && pendingMode !== 'player';
  const isGoingToPlayer = pendingMode === 'player';
  const resolvedQuestionSubmit = autoAssign && supportsAutoAssign ? handleAutoSubmit : onSubmit;
  const resolvedQuestionSubmitWithFiles = autoAssign && supportsAutoAssign ? handleAutoSubmitWithFiles : onSubmitWithFiles;
  const questionInputDisabled = isDiscussing
    || (!autoAssign && selectedIds.length < 1)
    || (!autoAssign && discussionMode === 'multi' && selectedIds.length < 2)
    || (!autoAssign && discussionMode === 'standard' && selectedIds.length < 2)
    || (discussionMode === 'procon' && !isProconTeamComplete)
    || (!autoAssign && discussionMode === 'freetalk' && selectedIds.length < 2);
  const selectedExpertsForInput = useMemo(() => (
    (discussionMode === 'standard' || isBrainstorm || isHearing || isStakeholder || discussionMode === 'freetalk')
      ? []
      : experts.filter((expert) => selectedIds.includes(expert.id))
  ), [discussionMode, experts, isBrainstorm, isHearing, isStakeholder, selectedIds]);

  const sharedQuestionInputProps = {
    onSubmit: resolvedQuestionSubmit,
    onSubmitWithFiles: resolvedQuestionSubmitWithFiles,
    disabled: questionInputDisabled,
    discussionMode,
    debateSettings,
    onDebateSettingsChange,
  };

  return (
    <div className={cn(
      // Phase C-B: 중앙 컬럼 폭 통일(920px) — 히어로/탭/봇그리드/입력창 모두 같은 축으로 정렬.
      "relative mx-auto w-full max-w-[920px] space-y-3 transition-all duration-500",
      isPlayerActive ? 'py-1' : 'py-4',
    )}>
      {/* 플레이어 모드 전체화면 다크 오버레이 */}
      <div className={cn(
        "fixed inset-0 bg-slate-950 pointer-events-none transition-opacity duration-700 ease-out z-10",
        showPlayerBg ? 'opacity-100' : 'opacity-0'
      )} />
      {/* Phase C 보정: 배경 그라디언트는 유지하고 헤더 텍스트만 복원.
          모드 컨테이너 클래스로 자손에게 --mode 변수 상속. */}
      <div className={cn(
        `mode-${({
          general: 'general',
          multi: 'multi',
          debate: 'debate',
          stakeholder_main: 'simulation',
          brainstorm_main: 'multi',
          premium_main: 'premium',
          assistant: 'assistant',
          player: 'multi',
          research_main: 'research',
          translate_main: 'assistant',
          convert_main: 'general',
          study_main: 'study',
        } as const)[mainMode] ?? 'general'}`,
        "text-center relative z-0 transition-all ease-out overflow-hidden",
        mainMode === 'study_main' && 'hidden',
        (isGoingToPlayer && transitionPhase >= 1) || (isPlayerActive && !isLeavingPlayer)
          ? 'opacity-0 max-h-0 py-0 space-y-0 duration-500'
          : !contentVisible ? 'opacity-0 scale-[0.98] duration-200'
          : 'opacity-100 scale-100 duration-300',
        isLeavingPlayer && transitionPhase >= 2 && 'opacity-100'
      )}>
        {/* AccountStatus 제거 — 사이드바 하단으로 이동됨 */}
        {mainMode === 'premium_main' ? (
          /* #14 Premium 에디토리얼 헤더 — 기존 h2/p 를 대체. "공공 데이터 · 판례 · 통계" 카피도 이 헤더로 승격. */
          <div key={`premium-hero-${mainMode}`} className={cn(!skipHeroAnimation && "animate-in fade-in duration-700")}>
            <div className="flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-[hsl(var(--mode-premium))] opacity-80 mb-2">
              <span className="inline-block h-px w-6 bg-[hsl(var(--mode-premium))]/60" />
              Professional Consult
              <span className="inline-block h-px w-6 bg-[hsl(var(--mode-premium))]/60" />
            </div>
            <h2 className="font-display font-semibold text-[22px] md:text-[26px] tracking-[-0.02em] leading-tight text-foreground">
              전문 분야, <span className="text-[hsl(var(--mode-premium))]">검증된 근거</span>로 자문합니다
            </h2>
            <p className="mt-1.5 text-[12.5px] text-muted-foreground/90 max-w-[560px] mx-auto leading-snug">
              공공 데이터 · 판례 · 통계를 근거로 단계별 추론. 전문가 상담을 대체하지 않는 참고 자문입니다.
            </p>
          </div>
        ) : (
          <>
            <h2 key={mainMode} className={cn(
              "text-xl sm:text-2xl font-bold text-foreground tracking-tight",
              !skipHeroAnimation && "animate-in fade-in duration-700"
            )}>
              {mainMode === 'general' ? '모든 AI 챗봇을 한 곳에서 원하는 대로 골라 쓰세요'
                : mainMode === 'multi' ? '하나의 질문을 여러 AI에게 동시에 물어보세요'
                  : mainMode === 'debate' ? (
                      discussionMode === 'brainstorm' ? 'AI들이 협업해 아이디어를 쏟아냅니다'
                      : discussionMode === 'freetalk' ? 'AI들이 자유롭게 대화하며 의견을 나눕니다'
                      : 'AI들이 다각도로 토론하고 결론을 냅니다'
                    )
                    : mainMode === 'stakeholder_main' ? '이해관계자 역할극으로 아이디어를 검증하세요'
                      : mainMode === 'brainstorm_main' ? 'AI들이 협업해 아이디어를 정리해드립니다'
                          : mainMode === 'assistant' ? '작업을 도와주는 AI 어시스턴트'
                            : mainMode === 'player' ? 'AI와 함께 즐기는 게임·퀴즈·놀이'
                              : ''}
            </h2>
            {/* Phase G 최종화: 부제를 보조 한 줄로 유지하되 사이즈·여백 축소 (탭 스트립과의 간격 타이트) */}
            <p key={`sub-${mainMode}`} className={cn(
              "mt-0.5 text-[12px] text-muted-foreground/80",
              !skipHeroAnimation && "animate-in fade-in duration-700"
            )}>
              {mainMode === 'general' ? 'GPT · Claude · Gemini — 원하는 AI 를 골라 자유롭게 대화'
                : mainMode === 'multi' ? '여러 AI의 답변을 비교하고 종합 결론으로'
                  : mainMode === 'debate' ? (
                      discussionMode === 'brainstorm' ? '자유 발산으로 새로운 관점 발견'
                      : discussionMode === 'freetalk' ? '정해진 형식 없이 AI들의 자유 토론'
                      : '찬성·반대, 다각도 깊이 있는 분석'
                    )
                    : mainMode === 'stakeholder_main' ? '이해관계자 시점으로 의사결정 시뮬레이션'
                      : mainMode === 'brainstorm_main' ? 'AI들이 아이디어를 제안·구조화'
                          : mainMode === 'assistant' ? '문서 작성·번역·요약 실무 도우미'
                            : mainMode === 'player' ? '퀴즈·스토리·미니게임으로 놀기'
                              : ''}
            </p>
          </>
        )}

        {/* 모드 진입 때 한 번 쓸고 가는 서브틀한 mode-color sweep.
            `key={mainMode}` 로 모드 바뀔 때마다 재마운트되어 애니메이션 다시 재생됨. */}
        <div
          key={`sweep-${mainMode}`}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-6 h-24 opacity-0 animate-[mode-sweep_420ms_ease-out_forwards] mix-blend-plus-lighter"
          style={{
            background: 'radial-gradient(ellipse 60% 80% at 50% 0%, hsl(var(--mode,var(--primary))/0.28) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Main Mode Tabs — 플레이어/공부 모드에서는 숨김.
          Phase G 최종화: 탭 스트립과 아래 봇 카드가 하나의 흐름처럼 보이도록 통합.
            · 탭 스트립 배경 제거 → 투명, 하단 여백도 축소 (mb-2)
            · 탭 그룹 max-w-[640px] 로 중심감 유지
            · 히어로와의 mt-6 여유 */}
      <div className={cn(
        "flex flex-col items-center relative z-20 transition-all duration-500 overflow-hidden -mt-2 mb-0",
        isPlayerActive && !isLeavingPlayer ? 'max-h-0 opacity-0 mt-0 mb-0' : 'max-h-32 opacity-100',
        isGoingToPlayer && transitionPhase >= 1 ? 'max-h-0 opacity-0' : '',
        mainMode === 'study_main' && 'hidden',
      )}>
        <div className={cn(
          // 근본 재설계: 트랙 세그먼트 → Chip/Pill 플로팅 패턴.
          // 트랙 배경·테두리 모두 제거. 각 탭이 독립된 캡슐이고 활성 탭은 모드 컬러로 채워짐.
          // 12 모드가 있는 상황에서 iOS 세그먼트는 구조적으로 맞지 않으며, Phase A 컬러 토큰을 더 잘 활용.
          'flex items-center relative gap-1 max-w-[720px]',
          showPlayerBg && 'bg-slate-900/50 border border-slate-700/40 p-0.5 rounded-xl',
        )}>
          <AnimatePresence mode="wait" initial={false}>
          {mainMode === 'debate' && !showPlayerBg ? (
            <motion.div
              key="debate-subtabs"
              className="flex items-center"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            >
              <button
                onClick={() => handleMainModeChange('general')}
                disabled={isDiscussing || transitionPhase !== 0}
                className="flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 transition-all"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>돌아가기</span>
              </button>
              <div className="w-px h-3.5 bg-slate-200 mx-0.5" />
              {([
                { mode: 'procon' as DebateSubMode, label: '찬반토론' },
                { mode: 'freetalk' as DebateSubMode, label: '자유토론' },
                { mode: 'standard' as DebateSubMode, label: '심층토론' },
                { mode: 'brainstorm' as DebateSubMode, label: '브레인스토밍' },
              ] as const).map(t => {
                const isSubActive = discussionMode === t.mode;
                return (
                  <button
                    key={t.mode}
                    onClick={isSubActive ? undefined : () => onModeChange(t.mode)}
                    disabled={isDiscussing}
                    className={cn(
                      'relative px-3 py-[2px] rounded-full text-[11px] tracking-tight transition-colors duration-200',
                      isSubActive
                        ? 'text-white font-semibold'
                        : 'text-slate-600 font-medium hover:text-slate-900'
                    )}
                  >
                    {isSubActive && (
                      <motion.div
                        layoutId="debate-tab-indicator"
                        className="absolute inset-0 bg-indigo-500 rounded-full shadow-sm"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10">{t.label}</span>
                  </button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="main-tabs"
              className="flex items-center"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            >
            <MainModeTabs
              modes={mainModes}
              labels={mainModeLabels}
              currentMode={mainMode}
              pendingMode={pendingMode}
              isDiscussing={isDiscussing}
              transitionPhase={transitionPhase}
              showPlayerBg={showPlayerBg}
              onChange={handleMainModeChange}
            />
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content transition wrapper — fades content when switching modes */}
      <div className={cn(
        "space-y-2 transition-all ease-out relative z-20",
        mainMode === 'study_main' && 'hidden',
        !contentVisible ? 'opacity-0 scale-[0.97] translate-y-2 duration-200' : 'opacity-100 scale-100 translate-y-0 duration-400'
      )}>

      {/* ── Premium Domain Landing (hidden when consultation chat is open) ── */}
      {mainMode === 'premium_main' && !selectedPremiumDomain && (
        <PremiumDomainLanding onSelectDomain={(domainId) => onSelectPremiumDomain?.(domainId)} />
      )}

      {/* ── Assistant Mode ── */}
      {mainMode === 'assistant' && (
        <div className="mt-2.5" />
      )}
      {mainMode === 'assistant' && (
        <AssistantCardsPanel
          selectedCardId={selectedAssistantCardId}
          onSelectCard={(cardId) => onAssistantCardChange?.(cardId)}
          onSubmitAssistant={(cardId, question) => onAssistantSubmit?.(cardId, question)}
          isDiscussing={isDiscussing}
        />
      )}

      {/* ── Player Mode (Game Lobby) ── */}
      {mainMode === 'player' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out fill-mode-both">
          <PlayerLobby onSubmit={onSubmit} isDiscussing={isDiscussing} onStartGame={onStartGame} onBackToHub={() => handleMainModeChange('general')} />
        </div>
      )}

      {/* ── Expert Selection Grid (general / multi / debate) ── */}
      {showExpertGrid && (
        <div className={cn(
          // Phase G: 카드 래퍼 — 토큰 기반 hairline + 부드러운 쉐도우
          'relative overflow-visible rounded-2xl border transition-all duration-200',
          'border-[hsl(var(--hairline))] bg-[hsl(var(--card))]',
          'shadow-[0_1px_2px_hsl(220_15%_8%_/0.04),0_2px_12px_hsl(220_15%_8%_/0.05)]',
          autoAssign && 'opacity-50',
        )} onClick={() => { if (autoAssign) setAutoAssign(false); }}>
          {/* Category tabs / Search */}
          <div className="flex flex-col overflow-visible relative z-20 rounded-t-2xl bg-transparent border-b border-[hsl(var(--hairline))]">
            <div className="flex items-center px-2 pt-1 pb-1 overflow-visible">
              {searchMode ? (
                <div className="flex items-center gap-1.5 flex-1 px-1">
                  <Search className="w-3 h-3 text-slate-400 shrink-0" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="검색..."
                    autoFocus
                    className="flex-1 bg-transparent text-[11px] outline-none placeholder:text-slate-400 py-0"
                  />
                  <button onClick={() => { setSearchMode(false); setSearchQuery(''); }}
                    className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-1 min-w-0 gap-0.5">
                    {grouped.filter(g => !['region', 'mythology'].includes(g.cat)).map(({ cat, label }) => {
                      const isActive = effectiveCategory === cat;
                      const isAiTab = cat === 'ai';
                      const isAiDisabled = isAiTab && isStandardOrProcon;
                      return (
                        <button key={cat} type="button"
                          disabled={isAiDisabled || autoAssign}
                          onClick={() => { if (!isAiDisabled) { setActiveCategory(cat); setActiveSubCategory('전체'); } }}
                          className={cn(
                            'flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap',
                            isAiDisabled
                              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                              : isActive
                                ? 'bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] font-semibold'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800',
                          )}>
                          {label}
                        </button>
                      );
                    })}
                    {/* 더보기 — 호버 시 세로 드롭다운 */}
                    {(() => {
                      const moreCats = grouped.filter(g => ['region', 'mythology'].includes(g.cat));
                      if (moreCats.length === 0) return null;
                      const isMoreActive = moreCats.some(g => effectiveCategory === g.cat);
                      return (
                        <div className="relative group/more">
                          <button type="button"
                            className={cn(
                              'flex items-center gap-0.5 px-2.5 py-1 text-[11px] rounded-md transition-colors whitespace-nowrap font-medium',
                              isMoreActive
                                ? 'bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] font-semibold'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800',
                            )}>
                            {isMoreActive ? moreCats.find(g => effectiveCategory === g.cat)?.label : '더보기'} <ChevronDown className="w-3 h-3" />
                          </button>
                          <div className="absolute left-0 top-full mt-1 bg-[hsl(var(--card))] border border-[hsl(var(--hairline))] rounded-lg shadow-xl py-1.5 min-w-[120px] opacity-0 invisible group-hover/more:opacity-100 group-hover/more:visible transition-all duration-150 z-50">
                            {moreCats.map(({ cat, label }) => (
                              <button key={cat} type="button"
                                onClick={() => { setActiveCategory(cat); setActiveSubCategory('전체'); }}
                                className={cn('w-full text-left px-4 py-2 text-[11px] font-medium transition-colors flex items-center gap-2',
                                  effectiveCategory === cat ? 'text-[hsl(var(--primary))]' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800')}>
                                {effectiveCategory === cat && <Check className="w-3 h-3 text-[hsl(var(--primary))]" />}
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <button onClick={() => setSearchMode(true)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors shrink-0">
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
            {!searchMode && EXPERT_SUB_CATEGORIES[effectiveCategory as ExpertCategory] && (
              <div className="flex items-center gap-1.5 px-3 pt-0 pb-1.5 overflow-x-auto scrollbar-none">
                {EXPERT_SUB_CATEGORIES[effectiveCategory as ExpertCategory]!.map(sub => (
                  <button key={sub.id} type="button" onClick={() => setActiveSubCategory(sub.id)}
                    className={cn('px-2 py-0.5 rounded text-[9px] whitespace-nowrap transition-all duration-150 border',
                      activeSubCategory === sub.id ? 'bg-slate-100 text-slate-700 font-semibold border-slate-300' : 'text-slate-400 font-medium hover:text-slate-600 border-transparent hover:border-slate-200')}>
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Expert grid */}
          {(searchMode && searchQuery.trim()
            ? [{ cat: 'search' as ExpertCategory, label: '검색', items: experts.filter(e => e.id !== 'router' && (e.nameKo.includes(searchQuery) || e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.description.includes(searchQuery))) }]
            : grouped.filter(({ cat }) => cat === effectiveCategory)
          ).map(({ cat, items }) => {
            const subCats = searchMode ? undefined : EXPERT_SUB_CATEGORIES[cat as ExpertCategory];
            const filtered = !subCats || activeSubCategory === '전체'
              ? items : items.filter(e => e.subCategory === activeSubCategory);
            const isAiCategory = cat === 'ai';
            const displayItems = filtered;

            /* ── Helper: render a single expert cell ── */
            const renderExpertCell = (expert: Expert) => {
              const isSelected = selectedIds.includes(expert.id);
              const stance = proconStances[expert.id];
              const isPro = stance === 'pro';
              const isCon = stance === 'con';
              const isAiModel = expert.category === 'ai';
              const isDisabled = isStandardOrProcon && isAiModel;
              return (
                <div key={expert.id}
                  draggable={isProcon && !isDisabled}
                  onDragStart={() => !isDisabled && setDraggedId(expert.id)}
                  onDragEnd={() => setDraggedId(null)}
                  onMouseEnter={(e) => { if (!isDisabled) showTip(expert, e.currentTarget); }}
                  onMouseLeave={hideTip}
                  className={cn(
                    // Phase D-1: 선택/hover 상태 강화 — 토큰 기반, 다크 모드 OK.
                    'group relative flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all duration-150',
                    isDisabled ? 'opacity-25 cursor-not-allowed' : '',
                    isProcon && !isDisabled ? 'cursor-grab active:cursor-grabbing' : '',
                    hintId === expert.id ? 'animate-drag-hint' : '',
                    !isDisabled && !isProcon && !isSelected && 'hover:bg-[hsl(var(--accent))] hover:-translate-y-[1px]',
                    !isProcon && isSelected && !isDisabled && 'bg-[hsl(var(--primary)/0.08)] ring-1 ring-inset ring-[hsl(var(--primary)/0.4)] dark:bg-[hsl(var(--primary)/0.15)]',
                  )}>
                  <button type="button"
                    disabled={isDisabled}
                    onClick={() => handleExpertSelection(expert.id, isSelected, stance)}
                    className="flex flex-col items-center gap-1 w-full">
                    {!isProcon && isSelected && !isDisabled && (
                      <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-indigo-500 rounded-full flex items-center justify-center shadow-sm z-10">
                        <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                    <span onClick={(e) => { e.stopPropagation(); toggleFavorite(expert.id); }}
                      className={cn('absolute top-0 left-0 w-5 h-5 flex items-center justify-center text-[14px] opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer',
                        favoriteSet.has(expert.id) ? 'opacity-100 text-amber-400' : 'text-slate-300 hover:text-amber-400')}>
                      {favoriteSet.has(expert.id) ? '★' : '☆'}
                    </span>
                    <ExpertAvatar expert={expert} size="md" active={isSelected && !isDisabled} />
                    <span className={cn('text-[9.5px] font-medium whitespace-nowrap truncate max-w-full leading-tight transition-colors',
                      isDisabled ? 'text-slate-300 dark:text-slate-600'
                        : isProcon && isPro ? 'text-blue-600 font-semibold'
                          : isProcon && isCon ? 'text-red-500 font-semibold'
                            : !isProcon && isSelected ? 'text-[hsl(var(--primary))] font-semibold'
                              : 'text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]')}>
                      {expert.nameKo}
                    </span>
                  </button>
                  {isDisabled && (
                    <div className="absolute inset-0 flex items-end justify-center pb-1 pointer-events-none">
                      <span className="text-[7px] text-slate-300 font-medium">선택 불가</span>
                    </div>
                  )}
                </div>
              );
            };

            /** IDs to hide from grid (individual agents) */
            const HIDDEN_AGENT_IDS = [...RESEARCH_AGENT_IDS, 'ancano-pro'];
            const visibleItems = displayItems.filter(e => !HIDDEN_AGENT_IDS.includes(e.id));

            return (
              <div key={cat} className="relative bg-white">
                {/* AI 통합 탭: 빠른 모델 + 모든 모델 보기 */}
                {isAiCategory && !searchMode && (
                  <div className="px-3 pt-1.5 pb-1.5">
                    {/* 메인 한 줄: 빠른 모델 */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-x-1 gap-y-2">
                      {FAST_MODEL_IDS.map(id => {
                        const expert = visibleItems.find(e => e.id === id);
                        return expert ? renderExpertCell(expert) : null;
                      })}
                    </div>
                    {/* 모든 모델 보기 / 접기 토글 */}
                    {!aiModelExpanded && (
                      <button
                        type="button"
                        onClick={() => setAiModelExpanded(true)}
                        className="w-full mt-1 py-0.5 text-[10px] text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1"
                      >
                        모든 모델 보기
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    )}
                    {/* 펼쳐진 전체 모델 목록 + 하단 접기 */}
                    {aiModelExpanded && (
                      <>
                        <div className="flex items-center gap-1.5 mt-2 mb-1 px-0.5">
                          <span className="text-[10px] font-bold text-slate-500">전체 모델</span>
                          <span className="text-[9px] text-slate-400">·</span>
                          <span className="text-[9px] text-slate-400">출시순 정렬</span>
                        </div>
                        <div className="max-h-[185px] overflow-y-auto scrollbar-thin border-t border-slate-100 pt-2">
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-x-1 gap-y-2">
                            {visibleItems
                              .filter(e => !FAST_MODEL_IDS.includes(e.id as typeof FAST_MODEL_IDS[number]))
                              .map(expert => renderExpertCell(expert))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAiModelExpanded(false)}
                          className="w-full mt-0.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1"
                        >
                          접기
                          <ChevronDown className="w-3 h-3 rotate-180" />
                        </button>
                      </>
                    )}
                  </div>
                )}
                {/* 비-AI 카테고리: 기존 그리드 */}
                {(!isAiCategory || searchMode) && (
                <div className={cn("px-3 pt-1.5 pb-1.5 overflow-y-auto scrollbar-thin",
                  'max-h-[134px]'
                )}>
                {displayItems.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-[12px] text-slate-400">{searchMode ? `"${searchQuery}"에 대한 검색 결과가 없습니다` : '이 카테고리에 전문가가 없습니다'}</p>
                  </div>
                ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-x-1 gap-y-2">
                  {displayItems.map(expert => {
                    const isSelected = selectedIds.includes(expert.id);
                    const stance = proconStances[expert.id];
                    const isPro = stance === 'pro';
                    const isCon = stance === 'con';
                    const isAiModel = expert.category === 'ai';
                    const isDisabled = isStandardOrProcon && isAiModel;
                    return (
                      <div key={expert.id}
                        draggable={isProcon && !isDisabled}
                        onDragStart={() => !isDisabled && setDraggedId(expert.id)}
                        onDragEnd={() => setDraggedId(null)}
                        onMouseEnter={(e) => { if (!isDisabled) showTip(expert, e.currentTarget); }}
                        onMouseLeave={hideTip}
                        className={cn(
                          'group relative flex flex-col items-center gap-0.5 p-1 rounded-lg transition-all duration-150',
                          isDisabled ? 'opacity-25 cursor-not-allowed' : '',
                          isProcon && !isDisabled ? 'cursor-grab active:cursor-grabbing' : '',
                          hintId === expert.id ? 'animate-drag-hint' : '',
                          !isDisabled ? 'hover:bg-slate-50' : ''
                        )}>
                        <button type="button"
                          disabled={isDisabled}
                          onClick={() => handleExpertSelection(expert.id, isSelected, stance)}
                          className="flex flex-col items-center gap-1 w-full">
                          {!isProcon && isSelected && !isDisabled && (
                            <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-indigo-500 rounded-full flex items-center justify-center shadow-sm z-10">
                              <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                          {/* 즐겨찾기 별 */}
                          <span onClick={(e) => { e.stopPropagation(); toggleFavorite(expert.id); }}
                            className={cn('absolute top-0 left-0 w-5 h-5 flex items-center justify-center text-[14px] opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer',
                              favoriteSet.has(expert.id) ? 'opacity-100 text-amber-400' : 'text-slate-300 hover:text-amber-400')}>
                            {favoriteSet.has(expert.id) ? '★' : '☆'}
                          </span>
                          <ExpertAvatar expert={expert} size="md" active={isSelected && !isDisabled} />
                          <span className={cn('text-[9.5px] font-medium whitespace-nowrap truncate max-w-full leading-tight transition-colors',
                            isDisabled ? 'text-slate-300'
                              : isProcon && isPro ? 'text-blue-600 font-semibold'
                                : isProcon && isCon ? 'text-red-500 font-semibold'
                                  : !isProcon && isSelected ? 'text-indigo-600 font-semibold'
                                    : 'text-slate-400 group-hover:text-slate-700')}>
                            {expert.nameKo}
                          </span>
                        </button>
                        {/* 툴팁은 Portal로 렌더링 (아래 참조) */}
                        {/* Disabled overlay label for AI in debate modes */}
                        {isDisabled && (
                          <div className="absolute inset-0 flex items-end justify-center pb-1 pointer-events-none">
                            <span className="text-[7px] text-slate-300 font-medium">선택 불가</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
                </div>
                )}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none rounded-r-xl" />
              </div>
            );
          })}
        </div>
      )}

      {/* Max limit toast */}
      {maxLimitMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-2.5 rounded-xl bg-slate-900 text-white text-[12px] font-medium shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          {maxLimitMsg}
        </div>
      )}

      {/* Mode-specific settings panels */}
      {mainMode === 'debate' && <div>
      {isProcon && (
        <ProconSettingsPanel
          experts={experts} selectedIds={selectedIds} onToggle={onToggle} proconStances={proconStances}
          assignMode={proconAssignMode} setAssignMode={setProconAssignMode}
          dragOver={dragOver} draggedId={draggedId}
          setDragOver={setDragOver} setDraggedId={setDraggedId}
          assignStance={assignStance} removeStance={removeStance}
          MAX_PER_ZONE={MAX_PER_ZONE}
          debateSettings={debateSettings}
          onDebateSettingsChange={onDebateSettingsChange}
          onModeChange={onModeChange}
          onTopicSelect={onSampleQuestionClick}
          topContent={null}
          bottomContent={(
            <QuestionInput
              {...sharedQuestionInputProps}
              selectedExperts={[]}
              onRemoveExpert={undefined}
              externalValue={prefilledQuestion}
              onExternalValueConsumed={() => setPrefilledQuestion('')}
            />
          )}
        />
      )}

      {discussionMode === 'standard' && (
        <StandardSettingsPanel
          issues={discussionIssues} onIssuesChange={onDiscussionIssuesChange}
          debateSettings={debateSettings} onDebateSettingsChange={onDebateSettingsChange}
          selectedExperts={experts.filter(e => selectedIds.includes(e.id))}
          experts={experts}
          autoAssign={autoAssign} onAutoAssignChange={handleAutoAssignChange}
          onToggle={onToggle}
          onModeChange={onModeChange}
          onTopicSelect={onSampleQuestionClick}
        />
      )}

      {isBrainstorm && (
        <BrainstormSettingsPanel
          selectedIds={selectedIds} experts={experts}
          selectedFramework={selectedFramework} onFrameworkChange={onFrameworkChange}
          debateSettings={debateSettings} onDebateSettingsChange={onDebateSettingsChange}
          autoAssign={autoAssign} onAutoAssignChange={handleAutoAssignChange}
          onToggle={onToggle}
          onModeChange={onModeChange}
          onTopicSelect={onSampleQuestionClick}
        />
      )}

      {isHearing && (
        <HearingSettingsPanel
          experts={experts} selectedIds={selectedIds}
          debateSettings={debateSettings} onDebateSettingsChange={onDebateSettingsChange}
          autoAssign={autoAssign} onAutoAssignChange={handleAutoAssignChange}
          onToggle={onToggle}
          onModeChange={onModeChange}
        />
      )}

      {discussionMode === 'freetalk' && (
        <FreetalkSettingsPanel
          experts={experts} selectedIds={selectedIds}
          debateSettings={debateSettings} onDebateSettingsChange={onDebateSettingsChange}
          autoAssign={autoAssign} onAutoAssignChange={handleAutoAssignChange}
          onToggle={onToggle}
          onModeChange={onModeChange}
          onTopicSelect={setPrefilledQuestion}
        />
      )}


      </div>}{/* end debate wrapper */}

      {isStakeholder && stakeholderSettings && onStakeholderSettingsChange && (
        <SimulationModePanel
          experts={experts}
          settings={stakeholderSettings}
          onSettingsChange={onStakeholderSettingsChange}
          onSubmit={onSubmit}
          isDiscussing={isDiscussing}
        />
      )}

      {/* 추천질문 카드 제거됨 — 헤더 칩으로 대체 */}

      {/* Question Input — not shown for expert/assistant/player (they have their own inputs or modal flow) */}
      {mainMode !== 'expert' && mainMode !== 'assistant' && mainMode !== 'player' && mainMode !== 'stakeholder_main' && mainMode !== 'premium_main' && !isProcon && (
        <QuestionInput
          {...sharedQuestionInputProps}
          selectedExperts={selectedExpertsForInput}
          onRemoveExpert={isGeneral ? undefined : onToggle}
        />
      )}

      </div>{/* end content transition wrapper */}

      <ExpertHoverTip expert={hoveredExpert} position={tipPos} />

    </div>
  );
}
