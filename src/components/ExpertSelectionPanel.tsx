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
} from '@/types/expert';
import { AIAbilityRadar } from './AIAbilityRadar';
import { AivsBattleConfigModal } from './AivsBattleConfigModal';
import { PremiumDomainLanding } from './PremiumDomainLanding';
import { ExpertAvatar } from './ExpertAvatar';
import { QuestionInput } from './QuestionInput';
import { AssistantCardsPanel } from './AssistantCardsPanel';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { AttachedFile } from '@/lib/fileProcessor';
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

const mainModes: MainMode[] = ['general', 'multi', 'debate', 'stakeholder_main', 'premium_main', 'assistant', 'player'];

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
};

const debateSubIcons: Record<string, React.ReactNode> = {
  standard: <Target className="w-3 h-3" />,
  procon: <Scale className="w-3 h-3" />,
  brainstorm: <Lightbulb className="w-3 h-3" />,
  hearing: <Search className="w-3 h-3" />,
  freetalk: <Users className="w-3 h-3" />,
  stakeholder: <Drama className="w-3 h-3" />,
};

// ── 인기주제 캐러셀 (화살표 + 자동롤링) ──
function TopicCarousel({ mode, onSelect, experts }: { mode: string; onSelect: (title: string) => void; experts?: Expert[] }) {
  const findAvatar = (id?: string) => {
    if (!id || !experts) return null;
    const e = experts.find(x => x.id === id);
    return e?.avatarUrl || null;
  };
  const AvatarOrIcon = ({ id, icon, size = 12 }: { id?: string; icon: string; size?: number }) => {
    const url = findAvatar(id);
    if (url) return <img src={url} alt="" className="rounded-full object-cover inline-block align-middle" style={{ width: size, height: size }} />;
    return <span style={{ fontSize: size - 2 }}>{icon}</span>;
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
          'flex-1 min-w-0 px-2.5 py-1 rounded-full bg-white/70 text-[11px] font-medium text-slate-600 hover:bg-white hover:text-violet-600 transition-all whitespace-nowrap overflow-hidden text-ellipsis',
          fading ? 'opacity-0' : 'opacity-100'
        )}
        style={{ transition: 'opacity 150ms' }}
      >
        <span className="text-[10px] font-bold text-violet-500 mr-1.5">인기주제</span>
        {topic.title}
        {topic.proLabel && topic.conLabel ? (
          <span className="ml-2 text-[10px]">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold text-[9px]"><AvatarOrIcon id={topic.proId} icon={topic.proIcon || '👍'} /> {topic.proLabel}</span>
            <span className="mx-1 text-slate-300">vs</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-500 font-semibold text-[9px]"><AvatarOrIcon id={topic.conId} icon={topic.conIcon || '👎'} /> {topic.conLabel}</span>
          </span>
        ) : topic.participants && topic.participants.length > 0 ? (
          <span className="ml-2 inline-flex items-center gap-1">
            {topic.participants.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[9px]">
                <AvatarOrIcon id={p.id} icon={p.icon} /> {p.name}
              </span>
            ))}
          </span>
        ) : topic.proLabel ? (
          <span className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[9px]">
            {topic.proIcon || '💬'} {topic.proLabel}
          </span>
        ) : null}
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
                  update({ prepAnswers: contextAnswers });
                  setStep2Scenario(null);
                  onSubmit(`__SIM_START__:${scenarioId}`, undefined, 'stakeholder');
                }}
                disabled={step2Scenario.prepQuestions.length > 0 && step2Scenario.prepQuestions.some(q => !step2Answers[q.id]?.trim())}
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

// ── 툴팁 능력치 섹션 (레이더 + 바) ──
const TIP_BAR_COLORS: Record<string, string> = {
  blue: 'bg-blue-400', emerald: 'bg-emerald-400', red: 'bg-red-400', amber: 'bg-amber-400',
  purple: 'bg-purple-400', orange: 'bg-orange-400', teal: 'bg-teal-400', pink: 'bg-pink-400',
  slate: 'bg-slate-400', green: 'bg-green-400', cyan: 'bg-cyan-400', sky: 'bg-sky-400',
};
const TIP_STATS: { key: string; label: string }[] = [
  { key: 'coding', label: '코딩' }, { key: 'creativity', label: '창의성' },
  { key: 'reasoning', label: '추론력' }, { key: 'math', label: '수학' },
  { key: 'multilingual', label: '다국어' }, { key: 'speed', label: '속도' },
  { key: 'costEfficiency', label: '비용효율' }, { key: 'contextWindow', label: '토큰용량' },
];
function TipAbilitySection({ abilities, color, name }: { abilities: import('@/types/expert').AIAbilityStats; color: string; name: string }) {
  const bc = TIP_BAR_COLORS[color] || 'bg-indigo-400';
  return (
    <div className="pb-2.5">
      <div className="px-2.5">
        <AIAbilityRadar abilities={abilities} color={color} name={name} />
      </div>
      <div className="space-y-[3px] mt-1 pl-3 pr-5">
        {TIP_STATS.map(({ key, label }) => {
          const v = abilities[key as keyof typeof abilities];
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className="text-[8px] text-slate-400 w-[38px] text-center shrink-0">{label}</span>
              <div className="flex-1 h-[4px] bg-white/10 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full', v >= 90 ? 'bg-amber-400' : bc)} style={{ width: `${v}%` }} />
              </div>
              <span className={cn('text-[8px] w-[18px] text-right tabular-nums', v >= 95 ? 'text-amber-400 font-bold' : v >= 85 ? 'text-white font-semibold' : 'text-slate-400')}>{v}</span>
            </div>
          );
        })}
      </div>
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
  const [activeCategory, setActiveCategory] = useState<string>('ai-agent');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('전체');
  // AI 에이전트 탭에 표시할 모델 ID
  const AI_AGENT_IDS = ['ancano-pro', 'auto-gpt', 'auto-gemini', 'auto-claude', 'auto-grok', 'auto-perplexity', 'auto-deepseek', 'auto-qwen'];
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

  // ── Mode transition states ──
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingMode, setPendingMode] = useState<MainMode | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<0 | 1 | 2 | 3>(0);
  // Phase 0: idle, Phase 1: content fade out, Phase 2: bg darken + tabs shift, Phase 3: new content fade in

  // Portal 기반 hover 툴팁
  const [hoveredExpert, setHoveredExpert] = useState<Expert | null>(null);
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null);
  const tipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTip = useCallback((expert: Expert, el: HTMLElement) => {
    if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
    const delay = hoveredExpert ? 0 : 300;
    tipTimerRef.current = setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setHoveredExpert(expert);
      setTipPos({ x: rect.right + 8, y: rect.top + rect.height / 2 });
    }, delay);
  }, [hoveredExpert]);
  const hideTip = useCallback(() => {
    if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
    setHoveredExpert(null);
    setTipPos(null);
  }, []);

  const MAX_PER_ZONE = debateSettings?.proconTeamSize || 3;
  const mainMode = getMainMode(discussionMode);
  const prevMainModeRef = useRef(mainMode);
  const debateDirection = useRef(1); // 1 = entering debate, -1 = leaving
  useEffect(() => {
    if (mainMode === 'debate' && prevMainModeRef.current !== 'debate') {
      debateDirection.current = 1;
    } else if (mainMode !== 'debate' && prevMainModeRef.current === 'debate') {
      debateDirection.current = -1;
    }
    prevMainModeRef.current = mainMode;
  }, [mainMode]);
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

  const triggerDragHint = (id: string) => {
    setHintId(id);
    setTimeout(() => setHintId(null), 500);
  };

  const assignStance = (expertId: string, stance: ProconStance) => {
    const count = Object.values(proconStances).filter(s => s === stance).length;
    const alreadyInZone = proconStances[expertId] === stance;
    if (!alreadyInZone && count >= MAX_PER_ZONE) return;
    const next = { ...proconStances, [expertId]: stance };
    onProconStancesChange?.(next);
    if (!selectedIds.includes(expertId)) onToggle(expertId);
  };

  const removeStance = (expertId: string) => {
    const next = { ...proconStances };
    delete next[expertId];
    onProconStancesChange?.(next);
    if (selectedIds.includes(expertId)) onToggle(expertId);
  };

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

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try { const s = localStorage.getItem('ai-debate-favorites'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const toggleFavorite = (id: string) => {
    setFavoriteIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('ai-debate-favorites', JSON.stringify(next));
      return next;
    });
  };
  const visibleCategories = EXPERT_CATEGORY_ORDER;

  const favoriteItems = favoriteIds.map(id => experts.find(e => e.id === id)).filter(Boolean) as typeof experts;
  const grouped: { cat: string; label: string; items: typeof experts }[] = [
    { cat: 'favorites', label: '즐겨찾기', items: favoriteItems },
    { cat: 'ai-agent', label: 'AI 에이전트', items: AI_AGENT_IDS.map(id => experts.find(e => e.id === id)).filter(Boolean) as typeof experts },
    { cat: 'ai-model', label: 'AI 모델', items: (() => {
      // OpenRouter 실제 출시일 기준 (최신 → 오래된 순)
      const AI_MODEL_ORDER = [
        // 2026.04
        'glm',               // GLM 5.1 (Apr 7, 2026)
        'qwen-plus',         // Qwen 3.6 Plus (Apr 2, 2026)
        'gemma',             // Gemma 4 31B (Apr 2, 2026)
        'glm-5v',            // GLM 5V Turbo (Apr 1, 2026)
        'grok-4.2',          // Grok 4.2 (Mar 31, 2026)
        // 2026.03
        'mimo',              // MiMo-V2-Pro (Mar 18, 2026)
        'minimax',           // MiniMax M2.7 (Mar 18, 2026)
        'mistral-small',     // Mistral Small 4 (Mar 16, 2026)
        'nemotron',          // Nemotron 3 Super (Mar 11, 2026)
        'qwen-9b',           // Qwen 3.5 9B (Mar 10, 2026)
        'seed',              // Seed 2.0 Lite (Mar 10, 2026)
        'mercury',           // Mercury 2 (Mar 4, 2026)
        'gemini-3.1',        // Gemini 3.1 Lite (Mar 3, 2026)
        // 2026.02
        'seed-mini',         // Seed 2.0 Mini (Feb 26, 2026)
        'qwen',              // Qwen 3.5 Flash (Feb 25, 2026)
        'gemini-pro',        // Gemini 3.1 Pro (Feb 19, 2026)
        'claude-sonnet-4.6', // Claude Sonnet 4.6 (Feb 17, 2026)
        'qwen-thinking',     // Qwen3 Max Thinking (Feb 9, 2026)
        'claude',            // Claude Opus 4.6 (Feb 4, 2026)
        // 2026.01
        'step',              // Step 3.5 Flash (Jan 29, 2026)
        'solar',             // Solar Pro 3 (Jan 27, 2026)
        'kimi',              // Kimi K2.5 (Jan 27, 2026)
        'palmyra',           // Palmyra X5 (Jan 21, 2026)
        // 2025.12
        'gemini-3-flash',    // Gemini 3 Flash (Dec 17, 2025)
        'mistral-creative',  // Mistral Small Creative (Dec 16, 2025)
        'mimo-flash',        // MiMo-V2-Flash (Dec 14, 2025)
        'nova-2-lite',       // Amazon Nova 2 Lite (Dec 2, 2025)
        'mistral-large',     // Mistral Large 3 (Dec 1, 2025)
        // 2025.11
        'grok',              // Grok 4.1 Fast (Nov 19, 2025)
        'kimi-thinking',     // Kimi K2 Thinking (Nov 6, 2025)
        // 2025.10
        'nova-premier',      // Amazon Nova Premier (Oct 31, 2025)
        'granite',           // Granite 4.0 (Oct 20, 2025)
        'claude-haiku',      // Claude Haiku 4.5 (Oct 15, 2025)
        // 2025.09
        'claude-sonnet',     // Claude Sonnet 4.5 (Sep 29, 2025)
        'longcat',           // LongCat Flash (Sep 9, 2025)
        // 2025.08
        'mistral-medium',    // Mistral Medium 3.1 (Aug 13, 2025)
        'jamba',             // Jamba Large 1.7 (Aug 8, 2025)
        'codestral',         // Codestral (Aug 1, 2025)
        // 2025.07
        'gemini-flash-lite', // Gemini 2.5 Flash Lite (Jul 22, 2025)
        'devstral',          // Devstral Medium (Jul 10, 2025)
        'dolphin',           // Dolphin Venice (Jul 9, 2025)
        'hunyuan',           // Hunyuan (Jul 8, 2025)
        // 2025.06
        'ernie',             // ERNIE 4.5 (Jun 30, 2025)
        'gemini',            // Gemini 2.5 Flash (Jun 17, 2025)
        // 2025.04
        'gpt', 'gpt-mini', 'gpt-nano', // GPT-4.1 시리즈 (Apr 14, 2025)
        'llama-maverick', 'llama-scout', // Llama 4 (Apr 5, 2025)
        // 2025.03
        'deepseek',          // DeepSeek V3 (Mar 24, 2025)
        'command-a',         // Command A (Mar 13, 2025)
        'perplexity-pro',    // Sonar Pro (Mar 7, 2025)
        // 2025.01
        'perplexity',        // Sonar (Jan 27, 2025)
        'deepseek-r1',       // DeepSeek R1 (Jan 20, 2025)
        'phi',               // Phi-4 (Jan 10, 2025)
        // 2024
        'command-r-plus',    // Command R+ (Aug 30, 2024)
        'auto-ai', 'ancano', // ANCANO
      ];
      const aiModels = experts.filter(e => e.category === 'ai' && !AI_AGENT_IDS.includes(e.id));
      const ordered = AI_MODEL_ORDER.map(id => aiModels.find(e => e.id === id)).filter(Boolean) as typeof experts;
      const rest = aiModels.filter(e => !AI_MODEL_ORDER.includes(e.id));
      return [...ordered, ...rest];
    })() },
    ...visibleCategories.filter(cat => cat !== 'ai').map(cat => ({
      cat: cat as string,
      label: EXPERT_CATEGORY_LABELS[cat as ExpertCategory],
      items: experts.filter(e => e.category === cat),
    })),
  ].filter(g => g.items.length > 0 || g.cat === 'favorites');

  const validCats = grouped.map(g => g.cat);
  const aiBlocked = isStandardOrProcon && (activeCategory === 'ai-agent' || activeCategory === 'ai-model');
  const effectiveCategory = aiBlocked
    ? (validCats.find(c => c === 'specialist') || validCats[0] || 'ai')
    : (validCats.includes(activeCategory) ? activeCategory : validCats[0] || 'ai');
  const previousMainModeRef = useRef<MainMode>(mainMode);
  const skipHeroAnimation = isInstantChatLayoutSwitch(previousMainModeRef.current, mainMode);

  useEffect(() => {
    previousMainModeRef.current = mainMode;
  }, [mainMode]);

  const applyModeChange = (m: MainMode) => {
    setAutoAssign(false);
    if (m === 'general') onModeChange('general');
    else if (m === 'multi') onModeChange('multi');
    else if (m === 'brainstorm_main') onModeChange('brainstorm');
    else if (m === 'stakeholder_main') onModeChange('stakeholder');
    else if (m === 'premium_main') onModeChange('expert');
    else if (m === 'assistant') onModeChange('assistant');
    else if (m === 'player') onModeChange('player');
    else onModeChange('procon');
  };

  const handleMainModeChange = (m: MainMode) => {
    if (m === mainMode || transitionPhase !== 0) return;
    if (isInstantChatLayoutSwitch(mainMode, m)) {
      applyModeChange(m);
      return;
    }
    const toPlayer = m === 'player';
    const fromPlayer = mainMode === 'player';

    if (toPlayer || fromPlayer) {
      // 3-phase cinematic transition for player mode
      setPendingMode(m);
      setIsTransitioning(true);

      // Phase 1: fade out current content (200ms)
      setTransitionPhase(1);
      setTimeout(() => {
        // Phase 2: darken/lighten bg + shrink tabs (400ms)
        setTransitionPhase(2);
        setTimeout(() => {
          // Apply actual mode change
          applyModeChange(m);
          // Phase 3: fade in new content (300ms)
          setTransitionPhase(3);
          setTimeout(() => {
            setTransitionPhase(0);
            setIsTransitioning(false);
            setPendingMode(null);
          }, 300);
        }, 400);
      }, 200);
    } else {
      // Smooth transition for non-player modes
      const isDebateTransition = m === 'debate' || mainMode === 'debate';
      const fadeOutDuration = isDebateTransition ? 350 : 200;
      const fadeInDuration = isDebateTransition ? 400 : 250;
      setPendingMode(m);
      setIsTransitioning(true);
      setTransitionPhase(1); // fade out
      setTimeout(() => {
        applyModeChange(m);
        setTransitionPhase(3); // fade in
        setTimeout(() => {
          setTransitionPhase(0);
          setIsTransitioning(false);
          setPendingMode(null);
        }, fadeInDuration);
      }, fadeOutDuration);
    }
  };

  // Determine if player mode is active or transitioning to/from player
  const isPlayerActive = mainMode === 'player';
  const isGoingToPlayer = pendingMode === 'player';
  const isLeavingPlayer = mainMode === 'player' && pendingMode && pendingMode !== 'player';
  // Show dark bg from phase 2 onward when going to player, or while in player (until phase 2 when leaving)
  const showPlayerBg = isPlayerActive ? (isLeavingPlayer ? transitionPhase < 2 : true) : (isGoingToPlayer && transitionPhase >= 2);
  // Content visibility: hidden during phase 1 (fade out) and phase 2 (bg transition), visible in phase 0 and 3
  const contentVisible = transitionPhase === 0 || transitionPhase === 3;
  const debateSuggestionSection = (() => {
    interface TopicSuggestion {
      topic: string;
      icon: string;
      expertIds: string[];
      proIds?: string[];
      conIds?: string[];
    }

    const topicSuggestions: Record<string, TopicSuggestion[]> = {
      procon: [
        { topic: 'AI 교재를 학교 수업에 적극 도입해야 하나?', icon: '📚', expertIds: ['education', 'compsci', 'teacher', 'philosophy'], proIds: ['education', 'compsci'], conIds: ['teacher', 'philosophy'] },
        { topic: 'SNS 실명제가 필요할까?', icon: '🪪', expertIds: ['legal', 'criminology', 'psychology', 'journalist'], proIds: ['legal', 'criminology'], conIds: ['psychology', 'journalist'] },
      ],
      freetalk: [
        { topic: '2026년 투자 환경은 어떻게 변할까?', icon: '📈', expertIds: ['gpt', 'claude', 'perplexity'] },
        { topic: 'AI 기술이 교육을 어떻게 바꿀까?', icon: '🎓', expertIds: ['gemini', 'claude', 'deepseek'] },
      ],
      standard: [
        { topic: '저출산 문제는 어디서부터 해결해야 할까', icon: '👶', expertIds: ['gpt', 'claude', 'gemini'] },
        { topic: '기후 위기가 산업 구조에 미치는 영향', icon: '🌍', expertIds: ['perplexity', 'deepseek', 'gpt'] },
      ],
    };

    const suggestions = topicSuggestions[discussionMode];
    if (!suggestions) return null;

    const isProconMode = discussionMode === 'procon';
    const formatExpertName = (expert: Expert) => expert.nameKo || expert.name;

    const handleSuggestionClick = (suggestion: TopicSuggestion) => {
      if (isProconMode) {
        onBulkSelect?.(suggestion.expertIds);

        const nextStances: Record<string, ProconStance> = {};
        suggestion.proIds?.forEach((id) => {
          nextStances[id] = 'pro';
        });
        suggestion.conIds?.forEach((id) => {
          nextStances[id] = 'con';
        });
        if (Object.keys(nextStances).length > 0) {
          onProconStancesChange?.(nextStances);
        }

        setPrefilledQuestion(suggestion.topic);
        return;
      }

      if (onBulkSelect) onBulkSelect(suggestion.expertIds);
      onSubmit(suggestion.topic, suggestion.expertIds);
    };

    const renderSuggestionCard = (suggestion: TopicSuggestion, index: number) => {
      const proExperts = (suggestion.proIds?.map((id) => experts.find((expert) => expert.id === id)).filter(Boolean) || []) as Expert[];
      const conExperts = (suggestion.conIds?.map((id) => experts.find((expert) => expert.id === id)).filter(Boolean) || []) as Expert[];
      const cardExperts = suggestion.expertIds.map((id) => experts.find((expert) => expert.id === id)).filter(Boolean) as Expert[];
      const hasTeams = isProconMode && proExperts.length > 0 && conExperts.length > 0;

      return (
        <button
          key={index}
          type="button"
          aria-label={`${suggestion.topic} 추천 주제`}
          onClick={() => handleSuggestionClick(suggestion)}
          className="group relative w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-left transition-all duration-200 hover:border-indigo-300 hover:shadow-[0_4px_16px_-4px_rgba(99,102,241,0.12)] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <p className="relative text-[12px] font-bold text-slate-800 group-hover:text-slate-950 leading-snug text-center">
            {suggestion.topic}
          </p>
          {hasTeams ? (
            <div className="relative flex items-center justify-center gap-1.5 mt-2.5">
              <div className="flex items-center gap-1">
                {proExperts.map((expert) => (
                  <span key={expert.id} className="inline-flex items-center gap-0.5">
                    <ExpertAvatar expert={expert} size="xs" />
                    <span className="text-[8.5px] font-semibold text-blue-600/80">{formatExpertName(expert)}</span>
                  </span>
                ))}
              </div>
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[8px] font-black text-slate-400 shrink-0">vs</span>
              <div className="flex items-center gap-1">
                {conExperts.map((expert) => (
                  <span key={expert.id} className="inline-flex items-center gap-0.5">
                    <ExpertAvatar expert={expert} size="xs" />
                    <span className="text-[8.5px] font-semibold text-red-500/80">{formatExpertName(expert)}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative flex items-center justify-center gap-1.5 mt-2">
              <div className="flex -space-x-1">
                {cardExperts.slice(0, 3).map((expert) => <ExpertAvatar key={expert.id} expert={expert} size="xs" />)}
              </div>
              <span className="text-[10px] font-medium text-slate-400 truncate">{formatExpertName(cardExperts[0])}{'  '}+ {cardExperts.length - 1}명</span>
            </div>
          )}
        </button>
      );
    };

    return (
      <div className="grid grid-cols-2 gap-1.5">
        {suggestions.map((suggestion, index) => renderSuggestionCard(suggestion, index))}
      </div>
    );
  })();

  return (
    <div className={cn("space-y-1.5 relative transition-all duration-500", isPlayerActive ? 'py-1' : 'py-4')}>
      {/* 플레이어 모드 전체화면 다크 오버레이 */}
      <div className={cn(
        "fixed inset-0 bg-slate-950 pointer-events-none transition-opacity duration-700 ease-out z-10",
        showPlayerBg ? 'opacity-100' : 'opacity-0'
      )} />
      {/* Hero — 모드 전환 시 부드럽게 페이드 */}
      <div className={cn(
        "text-center relative z-0 transition-all ease-out overflow-hidden",
        (isGoingToPlayer && transitionPhase >= 1) || (isPlayerActive && !isLeavingPlayer)
          ? 'opacity-0 max-h-0 py-0 space-y-0 duration-500'
          : !contentVisible ? 'opacity-0 scale-[0.98] duration-200'
          : 'opacity-100 scale-100 duration-300',
        isLeavingPlayer && transitionPhase >= 2 && 'opacity-100'
      )}>
        {/* AccountStatus 제거 — 사이드바 하단으로 이동됨 */}
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
                    : mainMode === 'premium_main' ? '공공 데이터 기반 AI 자문 시스템'
                      : mainMode === 'assistant' ? '작업을 도와주는 AI 어시스턴트'
                        : mainMode === 'player' ? 'AI와 함께 즐기는 게임·퀴즈·놀이'
                          : ''}
        </h2>
        <p key={`sub-${mainMode}`} className={cn(
          "mt-1 text-[13px] text-muted-foreground",
          !skipHeroAnimation && "animate-in fade-in duration-700"
        )}>
          {mainMode === 'general' ? 'GPT, Claude, Gemini 등 원하는 AI를 골라 자유롭게 대화하세요'
            : mainMode === 'multi' ? '여러 AI의 답변을 비교하고 종합 결론을 받아보세요'
              : mainMode === 'debate' ? (
                  discussionMode === 'brainstorm' ? '자유로운 발산으로 새로운 관점을 발견합니다'
                  : discussionMode === 'freetalk' ? '정해진 형식 없이 AI끼리 토론합니다'
                  : '찬성과 반대, 다양한 시각으로 깊이 있는 분석을 제공합니다'
                )
                : mainMode === 'stakeholder_main' ? '다양한 이해관계자 시점에서 의사결정을 시뮬레이션합니다'
                  : mainMode === 'brainstorm_main' ? '여러 AI가 아이디어를 제안하고 구조화합니다'
                    : mainMode === 'premium_main' ? '법률·의료·금융 등 전문 분야 AI 상담'
                      : mainMode === 'assistant' ? '문서 작성, 번역, 요약 등 실무를 도와줍니다'
                        : mainMode === 'player' ? '퀴즈, 스토리, 미니게임으로 AI와 놀아보세요'
                          : ''}
        </p>
      </div>

      {/* Main Mode Tabs — 플레이어 모드에서는 숨김 (GAME ARENA 자체 헤더 사용) */}
      <div className={cn(
        "flex flex-col items-center relative z-20 transition-all duration-500 overflow-hidden",
        isPlayerActive && !isLeavingPlayer ? 'max-h-0 opacity-0 mb-0' : 'max-h-32 opacity-100',
        isGoingToPlayer && transitionPhase >= 1 ? 'max-h-0 opacity-0' : '',
      )}>
        <div className={cn(
          'flex items-center shadow-[0_2px_12px_rgba(0,0,0,0.08)] rounded-full p-[3px] overflow-hidden',
          showPlayerBg
            ? 'bg-slate-900 border border-slate-700'
            : 'bg-white border border-slate-200',
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
            {mainModes.map(m => {
              const isActive = mainMode === m || pendingMode === m;
              return (
                <button key={m} onClick={() => handleMainModeChange(m)} disabled={isDiscussing || transitionPhase !== 0}
                  className={cn(
                    'relative flex items-center justify-center gap-1 min-w-0 px-3 py-[2px] rounded-full text-[11px] tracking-tight transition-colors duration-200',
                    isActive
                      ? 'text-white font-semibold'
                      : showPlayerBg ? 'text-slate-400 font-medium hover:text-slate-200' : 'text-slate-600 font-medium hover:text-slate-900'
                  )}>
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        key={`main-pill-${m}`}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className={cn(
                          'absolute inset-0 rounded-full shadow-sm',
                          m === 'player'
                            ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/25'
                            : 'bg-indigo-500'
                        )}
                      />
                    )}
                  </AnimatePresence>
                  <span className="relative z-10">{mainModeLabels[m]}</span>
                </button>
              );
            })}
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content transition wrapper — fades content when switching modes */}
      <div className={cn(
        "space-y-2 transition-all ease-out relative z-20",
        !contentVisible ? 'opacity-0 scale-[0.97] translate-y-2 duration-200' : 'opacity-100 scale-100 translate-y-0 duration-400'
      )}>

      {/* ── Premium Domain Landing (hidden when consultation chat is open) ── */}
      {mainMode === 'premium_main' && !selectedPremiumDomain && (
        <PremiumDomainLanding onSelectDomain={(domainId) => onSelectPremiumDomain?.(domainId)} />
      )}

      {/* ── Assistant Mode ── */}
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
        <div className={cn('border border-slate-200 rounded-2xl bg-white overflow-visible shadow-[0_2px_12px_rgba(0,0,0,0.07)] transition-all duration-200 relative',
          autoAssign && 'opacity-50'
        )} onClick={() => { if (autoAssign) setAutoAssign(false); }}>
          {/* Category tabs / Search */}
          <div className="flex flex-col bg-slate-50 border-b-2 border-slate-200 overflow-visible relative z-20 rounded-t-2xl">
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
                    {grouped.filter(g => !['perspective', 'region', 'mythology'].includes(g.cat)).map(({ cat, label }) => {
                      const isActive = effectiveCategory === cat;
                      const isAiTab = cat === 'ai-agent' || cat === 'ai-model';
                      const isAiDisabled = isAiTab && isStandardOrProcon;
                      return (
                        <button key={cat} type="button"
                          disabled={isAiDisabled || autoAssign}
                          onClick={() => { if (!isAiDisabled) { setActiveCategory(cat); setActiveSubCategory('전체'); } }}
                          className={cn('flex items-center gap-1 px-2.5 py-1 text-[11px] transition-all whitespace-nowrap rounded-md',
                            isAiDisabled ? 'text-slate-300 cursor-not-allowed' :
                              isActive ? 'bg-indigo-500 text-white font-semibold shadow-sm' : 'text-slate-500 font-medium hover:text-slate-800 hover:bg-slate-200/70')}>
                          {label}
                        </button>
                      );
                    })}
                    {/* 더보기 — 호버 시 세로 드롭다운 */}
                    {(() => {
                      const moreCats = grouped.filter(g => ['region', 'perspective', 'mythology'].includes(g.cat));
                      if (moreCats.length === 0) return null;
                      const isMoreActive = moreCats.some(g => effectiveCategory === g.cat);
                      return (
                        <div className="relative group/more">
                          <button type="button"
                            className={cn('flex items-center gap-0.5 px-2.5 py-1 text-[11px] transition-all whitespace-nowrap rounded-md font-medium',
                              isMoreActive ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/70')}>
                            {isMoreActive ? moreCats.find(g => effectiveCategory === g.cat)?.label : '더보기'} <ChevronDown className="w-3 h-3" />
                          </button>
                          <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl py-1.5 min-w-[120px] opacity-0 invisible group-hover/more:opacity-100 group-hover/more:visible transition-all duration-150 z-50">
                            {moreCats.map(({ cat, label }) => (
                              <button key={cat} type="button"
                                onClick={() => { setActiveCategory(cat); setActiveSubCategory('전체'); }}
                                className={cn('w-full text-left px-4 py-2 text-[11px] font-medium transition-colors flex items-center gap-2',
                                  effectiveCategory === cat ? 'text-indigo-600' : 'text-slate-600 hover:bg-slate-50')}>
                                {effectiveCategory === cat && <Check className="w-3 h-3 text-indigo-500" />}
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
            const isAgentCategory = cat === 'ai-agent';
            const isModelCategory = cat === 'ai-model';
            const isAiCategory = isAgentCategory || isModelCategory;
            const displayItems = filtered;
            return (
              <div key={cat} className="relative bg-white">
                {/* AI 에이전트 / AI 모델 카테고리 */}
                {isAiCategory && !searchMode && (
                  <div>
                    <div className={cn("px-3 pt-1.5 pb-1.5 overflow-y-auto scrollbar-thin",
                      isModelCategory ? 'max-h-[134px]' : ''
                    )}>
                      {displayItems.length === 0 ? (
                        <div className="py-6 text-center">
                          <p className="text-[12px] text-slate-400">이 카테고리에 전문가가 없습니다</p>
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
                                'group relative flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all duration-200',
                                isDisabled ? 'opacity-25 cursor-not-allowed' : '',
                                isProcon && !isDisabled ? 'cursor-grab active:cursor-grabbing' : '',
                                hintId === expert.id ? 'animate-drag-hint' : '',
                                !isDisabled && !isProcon && isSelected
                                  ? 'bg-gradient-to-b from-indigo-50 to-white ring-[1.5px] ring-indigo-300 shadow-[0_2px_8px_rgba(99,102,241,0.15)] scale-[1.03]'
                                  : '',
                                !isDisabled && !isSelected ? 'hover:bg-slate-50 hover:scale-[1.02]' : ''
                              )}>
                              <button type="button"
                                disabled={isDisabled}
                                onClick={() => {
                                  if (isDisabled) return;
                                  if (isProcon) {
                                    if (proconAssignMode === 'auto') {
                                      onToggle(expert.id);
                                    } else if (stance) {
                                      removeStance(expert.id);
                                    } else {
                                      const proCount = Object.values(proconStances).filter(s => s === 'pro').length;
                                      const conCount = Object.values(proconStances).filter(s => s === 'con').length;
                                      if (proCount < MAX_PER_ZONE && proCount <= conCount) {
                                        assignStance(expert.id, 'pro');
                                      } else if (conCount < MAX_PER_ZONE) {
                                        assignStance(expert.id, 'con');
                                      } else if (proCount < MAX_PER_ZONE) {
                                        assignStance(expert.id, 'pro');
                                      } else {
                                        setMaxLimitMsg('찬성/반대 모두 가득 찼습니다');
                                        setTimeout(() => setMaxLimitMsg(null), 2000);
                                      }
                                    }
                                  } else {
                                    if (mainMode === 'multi' && !isSelected && selectedIds.length >= 3) {
                                      setMaxLimitMsg('다중 AI는 최대 3개까지 선택할 수 있습니다');
                                      setTimeout(() => setMaxLimitMsg(null), 2000);
                                      return;
                                    }
                                    if (mainMode === 'debate' && !isProcon && !isSelected && selectedIds.length >= 4) {
                                      setMaxLimitMsg('최대 4명까지 선택할 수 있습니다');
                                      setTimeout(() => setMaxLimitMsg(null), 2000);
                                      return;
                                    }
                                    onToggle(expert.id);
                                  }
                                }}
                                className="flex flex-col items-center gap-1 w-full">
                                {!isProcon && isSelected && !isDisabled && (
                                  <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-indigo-500 rounded-full flex items-center justify-center shadow-sm z-10">
                                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </span>
                                )}
                                <span onClick={(e) => { e.stopPropagation(); toggleFavorite(expert.id); }}
                                  className={cn('absolute top-0 left-0 w-5 h-5 flex items-center justify-center text-[14px] opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer',
                                    favoriteIds.includes(expert.id) ? 'opacity-100 text-amber-400' : 'text-slate-300 hover:text-amber-400')}>
                                  {favoriteIds.includes(expert.id) ? '★' : '☆'}
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
                          onClick={() => {
                            if (isDisabled) return;
                            if (isProcon) {
                              if (proconAssignMode === 'auto') {
                                // 자동 배정: 그냥 선택/해제
                                onToggle(expert.id);
                              } else if (stance) {
                                removeStance(expert.id);
                              } else {
                                // 수동 배정: 클릭으로 빈자리에 자동 배치
                                const proCount = Object.values(proconStances).filter(s => s === 'pro').length;
                                const conCount = Object.values(proconStances).filter(s => s === 'con').length;
                                if (proCount < MAX_PER_ZONE && proCount <= conCount) {
                                  assignStance(expert.id, 'pro');
                                } else if (conCount < MAX_PER_ZONE) {
                                  assignStance(expert.id, 'con');
                                } else if (proCount < MAX_PER_ZONE) {
                                  assignStance(expert.id, 'pro');
                                } else {
                                  setMaxLimitMsg('찬성/반대 모두 가득 찼습니다');
                                  setTimeout(() => setMaxLimitMsg(null), 2000);
                                }
                              }
                            } else {
                              if (mainMode === 'multi' && !isSelected && selectedIds.length >= 3) {
                                setMaxLimitMsg('다중 AI는 최대 3개까지 선택할 수 있습니다');
                                setTimeout(() => setMaxLimitMsg(null), 2000);
                                return;
                              }
                              if (mainMode === 'debate' && !isProcon && !isSelected && selectedIds.length >= 4) {
                                setMaxLimitMsg('최대 4명까지 선택할 수 있습니다');
                                setTimeout(() => setMaxLimitMsg(null), 2000);
                                return;
                              }
                              onToggle(expert.id);
                            }
                          }}
                          className="flex flex-col items-center gap-1 w-full">
                          {!isProcon && isSelected && !isDisabled && (
                            <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-indigo-500 rounded-full flex items-center justify-center shadow-sm z-10">
                              <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          )}
                          {/* 즐겨찾기 별 */}
                          <span onClick={(e) => { e.stopPropagation(); toggleFavorite(expert.id); }}
                            className={cn('absolute top-0 left-0 w-5 h-5 flex items-center justify-center text-[14px] opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer',
                              favoriteIds.includes(expert.id) ? 'opacity-100 text-amber-400' : 'text-slate-300 hover:text-amber-400')}>
                            {favoriteIds.includes(expert.id) ? '★' : '☆'}
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
              onSubmit={autoAssign && supportsAutoAssign ? handleAutoSubmit : onSubmit}
              onSubmitWithFiles={autoAssign && supportsAutoAssign ? handleAutoSubmitWithFiles : onSubmitWithFiles}
              disabled={isDiscussing || (!autoAssign && selectedIds.length < 1) || (!autoAssign && discussionMode === 'multi' && selectedIds.length < 2) || (!autoAssign && discussionMode === 'standard' && selectedIds.length < 2) || (discussionMode === 'procon' && !isProconTeamComplete) || (!autoAssign && discussionMode === 'freetalk' && selectedIds.length < 2)}
              discussionMode={discussionMode}
              selectedExperts={[]}
              onRemoveExpert={undefined}
              debateSettings={debateSettings}
              onDebateSettingsChange={onDebateSettingsChange}
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
          autoAssign={autoAssign} onAutoAssignChange={(v: boolean) => { setAutoAssign(v); if (v && onBulkSelect) onBulkSelect([]); }}
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
          autoAssign={autoAssign} onAutoAssignChange={(v: boolean) => { setAutoAssign(v); if (v && onBulkSelect) onBulkSelect([]); }}
          onToggle={onToggle}
          onModeChange={onModeChange}
          onTopicSelect={onSampleQuestionClick}
        />
      )}

      {isHearing && (
        <HearingSettingsPanel
          experts={experts} selectedIds={selectedIds}
          debateSettings={debateSettings} onDebateSettingsChange={onDebateSettingsChange}
          autoAssign={autoAssign} onAutoAssignChange={(v: boolean) => { setAutoAssign(v); if (v && onBulkSelect) onBulkSelect([]); }}
          onToggle={onToggle}
          onModeChange={onModeChange}
        />
      )}

      {discussionMode === 'freetalk' && (
        <FreetalkSettingsPanel
          experts={experts} selectedIds={selectedIds}
          debateSettings={debateSettings} onDebateSettingsChange={onDebateSettingsChange}
          autoAssign={autoAssign} onAutoAssignChange={(v: boolean) => { setAutoAssign(v); if (v && onBulkSelect) onBulkSelect([]); }}
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
          onSubmit={autoAssign && supportsAutoAssign ? handleAutoSubmit : onSubmit}
          onSubmitWithFiles={autoAssign && supportsAutoAssign ? handleAutoSubmitWithFiles : onSubmitWithFiles}
          disabled={isDiscussing || (!autoAssign && selectedIds.length < 1) || (!autoAssign && discussionMode === 'multi' && selectedIds.length < 2) || (!autoAssign && discussionMode === 'standard' && selectedIds.length < 2) || (discussionMode === 'procon' && !isProconTeamComplete) || (!autoAssign && discussionMode === 'freetalk' && selectedIds.length < 2)}
          discussionMode={discussionMode}
          selectedExperts={
            (discussionMode === 'standard' || isBrainstorm || isHearing || isStakeholder || discussionMode === 'freetalk')
              ? [] : experts.filter(e => selectedIds.includes(e.id))
          }
          onRemoveExpert={isGeneral ? undefined : onToggle}
          debateSettings={debateSettings}
          onDebateSettingsChange={onDebateSettingsChange}
        />
      )}

      </div>{/* end content transition wrapper */}

      {/* Portal 기반 플로팅 툴팁 — overflow 영향 안 받음 */}
      {hoveredExpert && tipPos && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: `${tipPos.x}px`,
            top: `${tipPos.y}px`,
            transform: 'translateY(-50%)',
          }}
        >
        <div className="animate-in fade-in slide-in-from-left-2 duration-200 ease-out flex items-center">
          <div className={cn(
            'relative bg-gradient-to-b from-slate-800 to-slate-900 text-white rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.38)] overflow-hidden border border-white/[0.06]',
            hoveredExpert.abilities && !hoveredExpert.id.startsWith('auto-') ? 'w-64' : 'w-56'
          )}>
            {/* 이름 + 아이콘 (AI 모델만 아이콘 표시) */}
            <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-center gap-1.5">
              {hoveredExpert.category === 'ai' && (
                hoveredExpert.avatarUrl ? (
                  (/\/(gpt|perplexity|grok)\.svg$/).test(hoveredExpert.avatarUrl) ? (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white shrink-0">
                      <img src={hoveredExpert.avatarUrl} alt="" className="w-3.5 h-3.5 rounded-full object-contain" />
                    </span>
                  ) : (
                    <img src={hoveredExpert.avatarUrl} alt="" className="w-4 h-4 rounded-full" />
                  )
                ) : (
                  <span className="text-sm">{hoveredExpert.icon}</span>
                )
              )}
              <p className="text-[13px] font-bold tracking-tight leading-tight">{hoveredExpert.nameKo}</p>
            </div>
            {/* 컬러바 */}
            <div className={cn('h-[3px] mx-3 rounded-full bg-gradient-to-r', {
              'from-blue-400 via-blue-300 to-blue-400': hoveredExpert.color === 'blue',
              'from-emerald-400 via-green-300 to-emerald-400': hoveredExpert.color === 'emerald',
              'from-red-400 via-rose-300 to-red-400': hoveredExpert.color === 'red',
              'from-amber-400 via-yellow-300 to-amber-400': hoveredExpert.color === 'amber',
              'from-purple-400 via-violet-300 to-purple-400': hoveredExpert.color === 'purple',
              'from-orange-400 via-orange-300 to-orange-400': hoveredExpert.color === 'orange',
              'from-teal-400 via-teal-300 to-teal-400': hoveredExpert.color === 'teal',
              'from-pink-400 via-pink-300 to-pink-400': hoveredExpert.color === 'pink',
              'from-slate-400 via-slate-300 to-slate-400': hoveredExpert.color === 'slate',
              'from-green-400 via-green-300 to-green-400': hoveredExpert.color === 'green',
              'from-cyan-400 via-cyan-300 to-cyan-400': hoveredExpert.color === 'cyan',
              'from-sky-400 via-sky-300 to-sky-400': hoveredExpert.color === 'sky',
            })} />
            {/* 설명 */}
            <div className="px-3 pt-1.5 pb-2 text-center">
              <p className="text-[10px] text-slate-300 leading-relaxed">{hoveredExpert.description}</p>
            </div>
            {/* AI 모델: 레이더 차트 + 스텟 바 */}
            {hoveredExpert.abilities && hoveredExpert.id !== 'ancano' && hoveredExpert.id !== 'ancano-pro' && (
              <TipAbilitySection abilities={hoveredExpert.abilities} color={hoveredExpert.color} name={hoveredExpert.nameKo} />
            )}
            {/* 비AI (전문가/직업/캐릭터 등): quote + 추천질문 */}
            {!hoveredExpert.abilities && (
              <>
                {hoveredExpert.quote && (
                  <div className="px-3 pb-1.5 text-center">
                    <p className="text-[9px] text-amber-300 font-medium leading-tight">"{hoveredExpert.quote}"</p>
                  </div>
                )}
                {hoveredExpert.sampleQuestions && hoveredExpert.sampleQuestions.length > 0 && (
                  <div className="mx-3 mb-3 mt-0.5 relative">
                    <div className="rounded-lg border border-white/15 bg-white/[0.02] pt-2 pb-1.5 px-2.5">
                      <span className="absolute -top-[5px] left-1/2 -translate-x-1/2 px-1.5 text-[7px] text-slate-400 tracking-wider font-medium" style={{ backgroundColor: '#1a2030' }}>추천 질문</span>
                      {hoveredExpert.sampleQuestions.map((q, qi) => (
                        <p key={qi} className="text-[9px] text-slate-300 text-center leading-normal py-1 truncate">{q}</p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          {/* 왼쪽 화살표 */}
          <div className="absolute left-0 top-1/2 -translate-x-[5px] -translate-y-1/2">
            <div className="w-2.5 h-2.5 bg-slate-800 rotate-45 border-l border-b border-white/[0.06]" />
          </div>
        </div>
        </div>,
        document.body
      )}

    </div>
  );
}
