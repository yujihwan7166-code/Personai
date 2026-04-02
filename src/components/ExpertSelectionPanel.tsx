import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { createPortal } from 'react-dom';
import {
  Expert, ExpertCategory, EXPERT_CATEGORY_LABELS, EXPERT_CATEGORY_ORDER,
  EXPERT_SUB_CATEGORIES, DiscussionMode, MainMode, DebateSubMode,
  DEBATE_SUB_MODE_LABELS, getMainMode, DebateSettings,
  THINKING_FRAMEWORKS, ThinkingFramework, DiscussionIssue,
  EXPERT_MODE_TEMPLATES, ExpertModeTemplate, ASSISTANT_CARDS, AssistantCard,
  GAME_CARDS, GameCard,
  SimulationScenario, SIMULATION_SCENARIOS,
  StakeholderSettings, DEFAULT_STAKEHOLDER_SETTINGS,
} from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { QuestionInput } from './QuestionInput';
import { cn } from '@/lib/utils';
import {
  Target, Scale, Lightbulb,
  Plus, X, Check, ChevronRight, ChevronDown, ArrowRight, Zap,
  FileText, Search, Sliders,
  Eye, BookOpen, Brain, Link2, Sparkles, Swords, Clapperboard,
  Users, User, Crown, Star,
  Flame, ShieldAlert, Heart, RotateCcw, Lock, Bomb, UserX, Shield, Handshake,
  Drama, Gavel,
} from 'lucide-react';


export type ProconStance = 'pro' | 'con';

// Re-export from expert.ts for backward compatibility
export type { StakeholderSettings } from '@/types/expert';
export { DEFAULT_STAKEHOLDER_SETTINGS } from '@/types/expert';

interface Props {
  experts: Expert[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  discussionMode: DiscussionMode;
  onModeChange: (mode: DiscussionMode) => void;
  isDiscussing: boolean;
  onSubmit: (question: string) => void;
  proconStances?: Record<string, ProconStance>;
  onProconStancesChange?: (stances: Record<string, ProconStance>) => void;
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
  showDebateSettings?: boolean;
  selectedFramework?: ThinkingFramework | null;
  onFrameworkChange?: (fw: ThinkingFramework | null) => void;
  discussionIssues?: DiscussionIssue[];
  onDiscussionIssuesChange?: (issues: DiscussionIssue[]) => void;
  debateIntensity?: string;
  onDebateIntensityChange?: (v: string) => void;
  onBulkSelect?: (ids: string[]) => void;
  onSampleQuestionClick?: (question: string) => void;
  onStartGame?: (gameId: string, option: string, label: string) => void;
  stakeholderSettings?: StakeholderSettings;
  onStakeholderSettingsChange?: (s: StakeholderSettings) => void;
}

const mainModes: MainMode[] = ['general', 'multi', 'debate', 'stakeholder_main', 'brainstorm_main', 'assistant']; // player 잠금, expert 시뮬레이션에 통합
const debateSubModes: DebateSubMode[] = ['standard', 'procon', 'freetalk'];

const mainModeLabels: Record<MainMode, string> = {
  general: '일반 채팅',
  multi: '멀티 채팅',
  debate: 'AI 토론',
  stakeholder_main: 'AI 시뮬레이션',
  brainstorm_main: '브레인스토밍',
  expert: '전문가 상담',
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

// ── Issue Editor (심층토론) ──
const ISSUE_TEMPLATES = ['경제적 영향', '윤리적 쟁점', '기술적 타당성', '사회적 합의', '법률적 문제', '환경적 영향', '실현 가능성'];

// ── 미니 AI 선택 그리드 (설정 패널 내장용) ──
function MiniExpertPicker({ experts, selectedIds, onToggle, maxCount, proconStances, assignStance, draggedId, setDraggedId }: {
  experts: Expert[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  maxCount?: number;
  proconStances?: Record<string, 'pro' | 'con'>;
  assignStance?: (id: string, stance: 'pro' | 'con') => void;
  draggedId?: string | null;
  setDraggedId?: (v: string | null) => void;
}) {
  const isProcon = !!proconStances && !!assignStance;
  const aiExperts = experts.filter(e => e.category === 'ai');
  const max = maxCount || 6;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {aiExperts.map(e => {
        const isSelected = selectedIds.includes(e.id);
        const stance = proconStances?.[e.id];
        const atLimit = !isSelected && selectedIds.length >= max;
        return (
          <button key={e.id} type="button"
            disabled={atLimit}
            draggable={isProcon && isSelected}
            onDragStart={() => setDraggedId?.(e.id)}
            onDragEnd={() => setDraggedId?.(null)}
            onClick={() => {
              if (isProcon && !isSelected && assignStance) {
                // 찬반: 선택 안 된 AI 클릭 → 일단 선택 (onToggle로)
                onToggle(e.id);
              } else {
                onToggle(e.id);
              }
            }}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all text-[11px] font-medium',
              isSelected
                ? stance === 'pro' ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : stance === 'con' ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : atLimit ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                : 'border-slate-200 text-slate-500 hover:border-slate-400 hover:bg-slate-50'
            )}>
            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 border border-slate-100">
              {e.avatarUrl
                ? <img src={e.avatarUrl} alt="" className="w-4 h-4 object-contain" />
                : e.icon ? <span className="text-[11px]">{e.icon}</span>
                : <span className="text-[9px] font-bold">{e.nameKo[0]}</span>
              }
            </div>
            {e.nameKo}
            {isSelected && <X className="w-3 h-3 opacity-40" />}
          </button>
        );
      })}
    </div>
  );
}

function StandardSettingsPanel({ issues, onIssuesChange, debateSettings, onDebateSettingsChange, selectedExperts, experts, autoAssign, onAutoAssignChange, onToggle, onModeChange }: {
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
}) {
  const [newIssue, setNewIssue] = useState('');
  const [customIssues, setCustomIssues] = useState<string[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const ds = debateSettings!;

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
    <div className="border border-slate-200 rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
      <div className="flex items-stretch bg-[#F4F5F7] rounded-t-xl relative">
        {onModeChange && (
          <button onClick={() => onModeChange('procon')} className="flex-1 px-2.5 py-2.5 flex items-center justify-center hover:bg-slate-200/50 transition-colors border-b border-slate-200 border-t-[3px] border-t-transparent">
            <span className="text-[11px] font-medium text-slate-400">⚖️ 찬반 토론</span>
          </button>
        )}
        <div className="flex-1 px-2.5 py-2.5 bg-white flex items-center justify-center cursor-default rounded-t-[10px] relative z-10 border-b border-white border-t-[3px] border-t-emerald-500">
          <span className="text-[11px] font-bold text-emerald-600 block">🎯 심층 토론</span>
        </div>
        {onModeChange && (<>
          <button onClick={() => onModeChange('freetalk')} className="flex-1 px-2.5 py-2.5 flex items-center justify-center hover:bg-slate-200/50 transition-colors border-b border-slate-200 border-t-[3px] border-t-transparent">
            <span className="text-[11px] font-medium text-slate-400">💬 자유 토론</span>
          </button>
          <button onClick={() => onModeChange?.('aivsuser')} className="flex-1 px-2.5 py-2.5 flex items-center justify-center hover:bg-slate-200/50 transition-colors border-b border-slate-200 border-t-[3px] border-t-transparent rounded-tr-xl">
            <span className="text-[11px] font-medium text-slate-400">⚔️ AI vs 유저</span>
          </button>
        </>)}
      </div>
      <div className="p-4 space-y-4">
        {/* Debaters */}
        <div className="rounded-xl border border-emerald-200 overflow-hidden">
          <div className="px-3.5 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px]">🎯</span>
              <span className="text-[11px] font-bold text-emerald-700">토론 참여자</span>
              {onAutoAssignChange && (
                <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-white/60 ml-1">
                  <button onClick={() => onAutoAssignChange(false)} className={cn('px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all', !autoAssign ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400')}>직접</button>
                  <button onClick={() => onAutoAssignChange(true)} className={cn('px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all flex items-center gap-0.5', autoAssign ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400')}><Zap className="w-2.5 h-2.5" />자동</button>
                </div>
              )}
            </div>
            {!autoAssign && selectedExperts.length > 0 && <span className="text-[10px] font-medium text-slate-400">{selectedExperts.length}/3명</span>}
          </div>
          <div className="px-3 py-3 bg-white">
            {autoAssign ? (
              <div className="text-center py-1">
                <p className="text-[11px] text-slate-500 font-medium">질문을 입력하면 적합한 전문가가 자동 배정됩니다</p>
              </div>
            ) : (
              <MiniExpertPicker experts={experts} selectedIds={selectedExperts.map(e => e.id)} onToggle={onToggle!} maxCount={3} />
            )}
          </div>
        </div>

        {/* Debate purpose */}
        <div>
          <div className="text-[11px] font-bold text-slate-600 mb-2">토론 목적</div>
          <div className="flex gap-2">
            {[{ id: 'explore', label: '탐색', desc: '다양한 관점을 넓게 탐색' }, { id: 'analyze', label: '분석', desc: '논리적으로 깊이 파고들기' }, { id: 'consensus', label: '합의', desc: '공통 결론 도출에 집중' }].map(opt => (
              <button key={opt.id} onClick={() => onDebateSettingsChange?.({ ...ds, debateTone: opt.id === 'explore' ? 'mild' : opt.id === 'analyze' ? 'moderate' : 'intense' })}
                className={cn('flex-1 px-3 py-2.5 rounded-lg text-center transition-all border',
                  (opt.id === 'explore' && ds.debateTone === 'mild') || (opt.id === 'analyze' && ds.debateTone === 'moderate') || (opt.id === 'consensus' && ds.debateTone === 'intense')
                    ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}>
                <div className="text-[12px] font-bold">{opt.label}</div>
                <div className="text-[9px] opacity-70 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Issue selector */}
        <div>
          <div className="text-[11px] font-bold text-slate-600 mb-1">핵심 논점 <span className="font-normal text-slate-400">(1개 선택)</span></div>
          <p className="text-[10px] text-slate-400 mb-2.5">클릭해서 선택하거나 직접 입력하세요. 비워두면 AI가 자동 추출합니다.</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {allTemplates.map(t => (
              <button key={t} onClick={() => toggleIssue(t)}
                className={cn('px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border flex items-center gap-1.5',
                  selectedTitle === t ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400')}>
                {selectedTitle === t && <Check className="w-3 h-3" />}{t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input value={newIssue} onChange={e => setNewIssue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCustom(); }}
              placeholder="직접 논점 추가..." className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-[11px] outline-none focus:border-slate-400 transition-all" />
            <button onClick={addCustom} disabled={!newIssue.trim()}
              className="px-3 py-2 rounded-lg bg-slate-800 text-white text-[10px] font-semibold disabled:opacity-30 hover:bg-slate-700 transition-colors flex items-center gap-1">
              <Plus className="w-3 h-3" /> 추가
            </button>
          </div>
        </div>

        {/* Settings toggle */}
        <button onClick={() => setShowDetail(!showDetail)}
          className="flex items-center gap-1.5 py-1.5 px-1 text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-all">
          세부 설정 {showDetail ? '접기 ▲' : '펼치기 ▼'}
        </button>
        {showDetail && debateSettings && onDebateSettingsChange && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-500 w-16 shrink-0 cursor-help" title="각 전문가 답변의 분량을 조절합니다">답변 길이</span>
              <div className="flex gap-1 flex-1">
                {(['short', 'medium', 'long'] as const).map(v => (
                  <button key={v} onClick={() => onDebateSettingsChange({ ...ds, responseLength: v })}
                    className={cn('flex-1 py-1.5 rounded-md text-[10px] font-medium text-center transition-all', ds.responseLength === v ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400')}>
                    {v === 'short' ? '짧게' : v === 'medium' ? '보통' : '길게'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-500 w-16 shrink-0 cursor-help" title="토론 진행 횟수. 많을수록 깊이 있는 토론">라운드</span>
              <div className="flex gap-1 flex-1">
                {([2, 3, 4] as const).map(v => (
                  <button key={v} onClick={() => onDebateSettingsChange({ ...ds, rounds: v })}
                    className={cn('flex-1 py-1.5 rounded-md text-[10px] font-medium text-center transition-all', ds.rounds === v ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400')}>
                    {v}R
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Procon Settings Panel — 완전 재설계 ──
function ProconSettingsPanel({ experts, selectedIds, onToggle, proconStances, dragOver, draggedId, setDragOver, setDraggedId, assignStance, removeStance, MAX_PER_ZONE, assignMode, setAssignMode, debateSettings, onDebateSettingsChange, onModeChange }: {
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
  debateIntensity?: string;
  onDebateIntensityChange?: (v: string) => void;
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const [proSlotCount, setProSlotCount] = useState(1);
  const [conSlotCount, setConSlotCount] = useState(1);
  const ds = debateSettings!;
  const update = (patch: Partial<DebateSettings>) => onDebateSettingsChange?.({ ...ds, ...patch });

  const proAssigned = Object.keys(proconStances).filter(id => proconStances[id] === 'pro').length;
  const conAssigned = Object.keys(proconStances).filter(id => proconStances[id] === 'con').length;
  const effectiveProSlots = Math.max(proSlotCount, proAssigned);
  const effectiveConSlots = Math.max(conSlotCount, conAssigned);



  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
      <div className="flex items-stretch bg-[#F4F5F7] rounded-t-xl relative">
        <div className="flex-1 px-2.5 py-2.5 bg-white flex items-center justify-center cursor-default rounded-t-[10px] relative z-10 border-b border-white border-t-[3px] border-t-violet-500">
          <span className="text-[11px] font-bold text-violet-600 block">⚖️ 찬반 토론</span>
        </div>
        {onModeChange && (<>
          <button onClick={() => onModeChange('standard')} className="flex-1 px-2.5 py-2.5 flex items-center justify-center hover:bg-slate-200/50 transition-colors border-b border-slate-200 border-t-[3px] border-t-transparent">
            <span className="text-[11px] font-medium text-slate-400">🎯 심층 토론</span>
          </button>
          <button onClick={() => onModeChange('freetalk')} className="flex-1 px-2.5 py-2.5 flex items-center justify-center hover:bg-slate-200/50 transition-colors border-b border-slate-200 border-t-[3px] border-t-transparent">
            <span className="text-[11px] font-medium text-slate-400">💬 자유 토론</span>
          </button>
          <button onClick={() => onModeChange?.('aivsuser')} className="flex-1 px-2.5 py-2.5 flex items-center justify-center hover:bg-slate-200/50 transition-colors border-b border-slate-200 border-t-[3px] border-t-transparent rounded-tr-xl">
            <span className="text-[11px] font-medium text-slate-400">⚔️ AI vs 유저</span>
          </button>
        </>)}
      </div>
      <div className="p-4 space-y-4">
        {/* Assignment mode tabs + Drag zones */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[11px] font-bold text-slate-600">진영 배정</span>
            <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
              <button onClick={() => setAssignMode('manual')}
                className={cn('px-2.5 py-1 rounded-md text-[10px] font-medium transition-all',
                  assignMode === 'manual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
                수동 배정
              </button>
              <button onClick={() => { setAssignMode('auto'); Object.keys(proconStances).forEach(id => removeStance(id)); }}
                className={cn('px-2.5 py-1 rounded-md text-[10px] font-medium transition-all',
                  assignMode === 'auto' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
                자동 배정
              </button>
            </div>
          </div>

          {assignMode === 'auto' ? (
            <div className={cn(
              'rounded-xl border overflow-hidden transition-all',
              dragOver ? 'border-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.15)]' : 'border-violet-200'
            )}
              onDragOver={e => { e.preventDefault(); setDragOver('pro'); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => { if (draggedId) assignStance(draggedId, 'pro'); setDragOver(null); setDraggedId(null); }}>
              <div className="px-3.5 py-2 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-violet-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px]">🤖</span>
                  <span className="text-[11px] font-bold text-violet-700">토론 참여자</span>
                </div>
                {(() => {
                  const count = experts.filter(e => selectedIds.includes(e.id)).length;
                  return count > 0 ? (
                    <span className="text-[10px] font-medium text-violet-400">{count}명 선택됨</span>
                  ) : null;
                })()}
              </div>
              <div className={cn(
                'px-3 py-4 bg-white transition-colors',
                dragOver && 'bg-violet-50/30'
              )}>
                <MiniExpertPicker experts={experts} selectedIds={selectedIds} onToggle={onToggle} maxCount={6} />
              </div>
              <div className="px-3.5 py-1.5 bg-slate-50 border-t border-slate-100">
                <p className="text-[9px] text-slate-400 text-center">토론 시작 시 AI가 주제를 분석하여 찬성/반대를 자동 배정합니다</p>
              </div>
            </div>
          ) : (<>
          <MiniExpertPicker experts={experts} selectedIds={selectedIds} onToggle={onToggle} maxCount={6} proconStances={proconStances} assignStance={assignStance} draggedId={draggedId} setDraggedId={setDraggedId} />
          <div className="grid grid-cols-2 gap-4 mt-3">
            {(['pro', 'con'] as const).map(zone => {
              const isOver = dragOver === zone;
              const assigned = Object.keys(proconStances).filter(id => proconStances[id] === zone);
              const isFull = assigned.length >= MAX_PER_ZONE;
              const isPro = zone === 'pro';
              const canDrop = !isFull || (draggedId ? proconStances[draggedId] === zone : false);
              return (
                <div key={zone} onDragOver={e => { e.preventDefault(); setDragOver(zone); }} onDragLeave={() => setDragOver(null)}
                  onDrop={() => { if (draggedId) assignStance(draggedId, zone); setDragOver(null); setDraggedId(null); }}
                  className={cn('rounded-xl border transition-all duration-150 overflow-hidden',
                    isOver && canDrop ? isPro ? 'border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]' : 'border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                      : isPro ? 'border-blue-200' : 'border-red-200')}>
                  <div className={cn('px-3 py-1.5 flex items-center justify-between', isPro ? 'bg-blue-100/80' : 'bg-red-100/80')}>
                    <span className={cn('text-[12px] font-bold', isPro ? 'text-blue-700' : 'text-red-700')}>{isPro ? '찬성' : '반대'}</span>
                    <span className={cn('text-[10px] font-medium', isPro ? 'text-blue-500' : 'text-red-500')}>{assigned.length}/{MAX_PER_ZONE}</span>
                  </div>
                  <div className={cn('px-2.5 py-3 bg-white transition-colors', isOver && canDrop && (isPro ? 'bg-blue-50/30' : 'bg-red-50/30'))}>
                    <div className="flex flex-wrap gap-2.5 justify-center">
                      {assigned.map(id => {
                        const e = experts.find(x => x.id === id);
                        if (!e) return null;
                        return (
                          <button key={id} type="button"
                            onClick={() => removeStance(id)}
                            draggable onDragStart={() => setDraggedId(id)} onDragEnd={() => setDraggedId(null)}
                            title="클릭하면 배정 해제"
                            className="flex flex-col items-center gap-0.5 cursor-pointer animate-in fade-in zoom-in-75 duration-200 group/slot min-w-[48px]">
                            <div className="relative group-hover/slot:opacity-70 transition-opacity">
                              <ExpertAvatar expert={e} size="md" />
                              <div className="absolute inset-0 rounded-full flex items-center justify-center transition-all">
                                <X className="w-3.5 h-3.5 text-red-500 opacity-0 group-hover/slot:opacity-100 transition-opacity" />
                              </div>
                            </div>
                            <span className={cn('text-[9px] font-semibold max-w-[52px] truncate text-center transition-colors group-hover/slot:text-red-500', isPro ? 'text-blue-600' : 'text-red-600')}>{e.nameKo}</span>
                          </button>
                        );
                      })}
                      {/* 빈칸: 아무도 없을 때만 1개 표시 */}
                      {assigned.length === 0 && (
                        <div className="flex flex-col items-center gap-0.5">
                          <div className={cn('w-10 h-10 rounded-full border-2 border-dashed', isPro ? 'border-blue-200 bg-blue-50/30' : 'border-red-200 bg-red-50/30')} />
                          <span className={cn('text-[9px]', isPro ? 'text-blue-300' : 'text-red-300')}>드래그</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </>)}
        </div>

        {/* Detail settings toggle */}
        <button onClick={() => setShowDetail(!showDetail)}
          className="flex items-center gap-1.5 py-1.5 px-1 text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-all">
          <Sliders className="w-3 h-3" /> 세부 설정 {showDetail ? '접기 ▲' : '펼치기 ▼'}
        </button>

        {showDetail && debateSettings && onDebateSettingsChange && (
          <div className="rounded-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">

            {/* Section 1: 토론 분위기 */}
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">토론 분위기</p>
              <div className="space-y-2.5">
                {/* 강도 */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold text-slate-600 w-12 shrink-0">강도</span>
                  <div className="flex gap-1 flex-1">
                    {[{ id: 'mild' as const, label: '온건' }, { id: 'moderate' as const, label: '보통' }, { id: 'intense' as const, label: '격렬' }].map(opt => (
                      <button key={opt.id} onClick={() => update({ debateTone: opt.id })}
                        className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-semibold text-center transition-all', ds.debateTone === opt.id ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-slate-400')}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 말투 */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold text-slate-600 w-12 shrink-0">말투</span>
                  <div className="flex gap-1 flex-1">
                    {[{ id: 'formal' as const, label: '격식체' }, { id: 'casual' as const, label: '구어체' }, { id: 'academic' as const, label: '학술적' }].map(opt => (
                      <button key={opt.id} onClick={() => update({ speakingStyle: opt.id })}
                        className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-semibold text-center transition-all', ds.speakingStyle === opt.id ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-slate-400')}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: 진행 방식 */}
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">진행 방식</p>
              <div className="space-y-2.5">
                {/* 라운드 */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold text-slate-600 w-12 shrink-0">라운드</span>
                  <div className="flex gap-1 flex-1">
                    {([2, 3, 4, 5] as const).map(v => (
                      <button key={v} onClick={() => update({ rounds: v })}
                        className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-semibold text-center transition-all',
                          ds.rounds === v ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-slate-400')}>
                        {v}R
                      </button>
                    ))}
                  </div>
                </div>
                {/* 발언 길이 */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold text-slate-600 w-12 shrink-0">발언 길이</span>
                  <div className="flex gap-1 flex-1">
                    {(['short', 'medium', 'long'] as const).map(v => (
                      <button key={v} onClick={() => update({ responseLength: v })}
                        className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-semibold text-center transition-all', ds.responseLength === v ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-slate-400')}>
                        {v === 'short' ? '짧게' : v === 'medium' ? '보통' : '길게'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Brainstorm Settings Panel — 재설계 ──
function BrainstormSettingsPanel({ selectedIds, experts, selectedFramework, onFrameworkChange, debateSettings, onDebateSettingsChange, autoAssign, onAutoAssignChange, onToggle }: {
  selectedIds: string[];
  experts: Expert[];
  selectedFramework?: ThinkingFramework | null;
  autoAssign?: boolean;
  onAutoAssignChange?: (v: boolean) => void;
  onToggle?: (id: string) => void;
  onFrameworkChange?: (fw: ThinkingFramework | null) => void;
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const ds = debateSettings!;
  const update = (patch: Partial<DebateSettings>) => onDebateSettingsChange?.({ ...ds, ...patch });

  return (
    <div className="space-y-3 overflow-visible">
        {/* Participants */}
        <div className="rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-3.5 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px]">💡</span>
              <span className="text-[11px] font-bold text-amber-700">참여자</span>
              {onAutoAssignChange && (
                <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-white/60 ml-1">
                  <button onClick={() => onAutoAssignChange(false)} className={cn('px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all', !autoAssign ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400')}>직접</button>
                  <button onClick={() => onAutoAssignChange(true)} className={cn('px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all flex items-center gap-0.5', autoAssign ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400')}><Zap className="w-2.5 h-2.5" />자동</button>
                </div>
              )}
            </div>
            {!autoAssign && selectedIds.length > 0 && <span className="text-[10px] font-medium text-amber-500">{selectedIds.length}명 선택됨</span>}
          </div>
          <div className="px-3 py-3 bg-white">
            {autoAssign ? (
              <div className="text-center py-1">
                <p className="text-[11px] text-amber-600 font-medium">질문을 입력하면 적합한 전문가가 자동 배정됩니다</p>
              </div>
            ) : (
              <MiniExpertPicker experts={experts} selectedIds={selectedIds} onToggle={onToggle!} maxCount={3} />
            )}
          </div>
        </div>

        {/* Framework */}
        <div>
          <div className="text-[11px] font-bold text-slate-600 mb-2">사고 프레임워크</div>
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

        {/* 창의성 수준 */}
        <div>
          <div className="text-[11px] font-bold text-slate-600 mb-2">창의성</div>
          <div className="flex gap-2">
            {[{ id: 'realistic' as const, label: '현실적', desc: '실용적 아이디어 중심' }, { id: 'balanced' as const, label: '균형', desc: '현실+창의 조합' }, { id: 'radical' as const, label: '창의적', desc: '파격적 발상 허용' }].map(opt => (
              <button key={opt.id} onClick={() => update({ creativityLevel: opt.id })}
                className={cn('flex-1 px-3 py-2.5 rounded-lg text-center transition-all border',
                  ds.creativityLevel === opt.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}>
                <div className="text-[12px] font-bold">{opt.label}</div>
                <div className="text-[9px] opacity-70 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 중복 필터링 */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-slate-700">중복 필터링</p>
            <p className="text-[9px] text-slate-400">유사한 아이디어 자동 제거</p>
          </div>
          <Toggle checked={ds.deduplication} onChange={v => update({ deduplication: v })} />
        </div>

        {/* 안내 메시지 + 예시 주제 */}
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-3.5">
          <p className="text-[12px] font-bold text-amber-800 mb-2">어떤 주제로 브레인스토밍할까요?</p>
          <div className="space-y-1.5">
            {[
              { icon: '🚀', text: '우리 서비스의 신규 기능 아이디어' },
              { icon: '📈', text: 'Z세대 고객을 위한 마케팅 전략' },
              { icon: '💡', text: '원격 근무 생산성을 높이는 방법' },
              { icon: '🎯', text: '올해 매출을 2배로 늘리려면?' },
            ].map((example, i) => (
              <p key={i} className="text-[11px] text-amber-700">
                <span className="mr-1">{example.icon}</span>
                {example.text}
              </p>
            ))}
          </div>
          <p className="text-[10px] text-amber-500 mt-2">아래 입력란에 주제를 입력하면 전문가들이 함께 아이디어를 발산합니다</p>
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
    <div className="border border-slate-200 rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
      <div className="flex items-stretch bg-[#F4F5F7] rounded-t-xl relative">
        {onModeChange && (<>
          <button onClick={() => onModeChange('procon')} className="flex-1 px-2.5 py-2.5 flex items-center justify-center hover:bg-slate-200/50 transition-colors border-b border-slate-200 border-t-[3px] border-t-transparent rounded-tl-xl">
            <span className="text-[11px] font-medium text-slate-400">⚖️ 찬반 토론</span>
          </button>
          <button onClick={() => onModeChange('standard')} className="flex-1 px-2.5 py-2.5 flex items-center justify-center hover:bg-slate-200/50 transition-colors border-b border-slate-200 border-t-[3px] border-t-transparent">
            <span className="text-[11px] font-medium text-slate-400">🎯 심층 토론</span>
          </button>
        </>)}
        <div className="flex-1 px-2.5 py-2.5 bg-white flex items-center justify-center cursor-default rounded-t-[10px] relative z-10 border-b border-white border-t-[3px] border-t-amber-500">
          <span className="text-[11px] font-bold text-amber-600 block">🔍 아이디어 검증</span>
        </div>
        <button className="flex-1 px-2.5 py-2.5 flex items-center justify-center hover:bg-slate-200/50 transition-colors border-b border-slate-200 border-t-[3px] border-t-transparent rounded-tr-xl">
          <span className="text-[11px] font-medium text-slate-400">⚔️ AI vs 유저</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Questioners */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600">검증 위원</span>
              {onAutoAssignChange && (
                <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-slate-100">
                  <button onClick={() => onAutoAssignChange(false)} className={cn('px-2 py-0.5 rounded text-[9px] font-semibold transition-all', !autoAssign ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400')}>직접 선택</button>
                  <button onClick={() => onAutoAssignChange(true)} className={cn('px-2 py-0.5 rounded text-[9px] font-semibold transition-all flex items-center gap-0.5', autoAssign ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400')}><Zap className="w-2.5 h-2.5" />자동</button>
                </div>
              )}
            </div>
            {!autoAssign && (selected.length < 2
              ? <span className="text-[10px] text-amber-500 font-medium">2명 이상 선택해주세요</span>
              : <span className="text-[10px] text-slate-400">{selected.length}명 위원</span>)}
          </div>
          {autoAssign ? (
            <div className="py-3 text-center rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50">
              <p className="text-[11px] text-emerald-700 font-medium">질문을 입력하면 적합한 전문가가 자동 배정됩니다</p>
            </div>
          ) : (
            <MiniExpertPicker experts={experts} selectedIds={selectedIds} onToggle={onToggle!} maxCount={3} />
          )}
        </div>

        {/* Pressure level */}
        <div>
          <div className="text-[11px] font-bold text-slate-600 mb-2">검증 목적</div>
          <div className="flex gap-2">
            {pressureOptions.map(opt => (
              <button key={opt.id} onClick={() => update({ hearingPressure: opt.id })}
                className={cn('flex-1 px-3 py-2.5 rounded-lg text-center transition-all border',
                  ds.hearingPressure === opt.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}>
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
                    className={cn('flex-1 py-1.5 rounded-md text-[10px] font-medium text-center transition-all', ds.responseLength === v ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400')}>
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
  );
}


// ── Freetalk Settings Panel ──

function FreetalkSettingsPanel({ experts, selectedIds, debateSettings, onDebateSettingsChange, autoAssign, onAutoAssignChange, onToggle, onModeChange }: {
  onModeChange?: (mode: DiscussionMode) => void;
  experts: Expert[];
  selectedIds: string[];
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
  autoAssign?: boolean;
  onAutoAssignChange?: (v: boolean) => void;
  onToggle?: (id: string) => void;
}) {
  const ds = debateSettings!;
  const selected = experts.filter(e => selectedIds.includes(e.id));

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
      <div className="flex items-stretch bg-[#F4F5F7] rounded-t-xl relative">
        {onModeChange && (
          <button onClick={() => onModeChange('procon')} className="flex-1 px-2.5 py-2.5 flex items-center justify-center hover:bg-slate-200/50 transition-colors border-b border-slate-200 border-t-[3px] border-t-transparent rounded-tl-xl">
            <span className="text-[11px] font-medium text-slate-400">⚖️ 찬반 토론</span>
          </button>
        )}
        {onModeChange && (
          <button onClick={() => onModeChange('standard')} className="flex-1 px-2.5 py-2.5 flex items-center justify-center hover:bg-slate-200/50 transition-colors border-b border-slate-200 border-t-[3px] border-t-transparent">
            <span className="text-[11px] font-medium text-slate-400">🎯 심층 토론</span>
          </button>
        )}
        <div className="flex-1 px-2.5 py-2.5 bg-white flex items-center justify-center cursor-default rounded-t-[10px] relative z-10 border-b border-white border-t-[3px] border-t-cyan-500">
          <span className="text-[11px] font-bold text-cyan-600 block">💬 자유 토론</span>
        </div>
        <button className="flex-1 px-2.5 py-2.5 flex items-center justify-center hover:bg-slate-200/50 transition-colors border-b border-slate-200 border-t-[3px] border-t-transparent rounded-tr-xl">
          <span className="text-[11px] font-medium text-slate-400">⚔️ AI vs 유저</span>
        </button>
      </div>
      <div className="p-4 space-y-4">
        {/* Participants */}
        <div className="rounded-xl border border-cyan-200 overflow-hidden">
          <div className="px-3.5 py-2 bg-gradient-to-r from-cyan-50 to-sky-50 border-b border-cyan-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px]">💬</span>
              <span className="text-[11px] font-bold text-cyan-700">참여 AI</span>
              {onAutoAssignChange && (
                <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-white/60 ml-1">
                  <button onClick={() => onAutoAssignChange(false)} className={cn('px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all', !autoAssign ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400')}>직접</button>
                  <button onClick={() => onAutoAssignChange(true)} className={cn('px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all flex items-center gap-0.5', autoAssign ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400')}><Zap className="w-2.5 h-2.5" />자동</button>
                </div>
              )}
            </div>
            {!autoAssign && selected.length > 0 && <span className="text-[10px] font-medium text-cyan-500">{selected.length}/3명</span>}
          </div>
          <div className="px-3 py-3 bg-white">
            {autoAssign ? (
              <div className="text-center py-1">
                <p className="text-[11px] text-cyan-600 font-medium">질문을 입력하면 적합한 AI가 자동 배정됩니다</p>
              </div>
            ) : (
              <MiniExpertPicker experts={experts} selectedIds={selectedIds} onToggle={onToggle!} maxCount={3} />
            )}
          </div>
        </div>

        {/* Message count */}
        <div>
          <span className="text-[11px] font-bold text-slate-600">대화 분량</span>
          <div className="flex gap-2 mt-1.5">
            {[{v: 15, l: '짧게'}, {v: 25, l: '보통'}, {v: 40, l: '길게'}].map(opt => (
              <button key={opt.v}
                onClick={() => onDebateSettingsChange?.({...ds, freetalkMessageCount: opt.v})}
                className={cn('flex-1 py-1.5 rounded-lg text-[11px] font-medium border transition-all',
                  (ds.freetalkMessageCount || 25) === opt.v
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'text-slate-500 border-slate-200 hover:border-slate-300')}>
                {opt.l} ({opt.v})
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AI vs User Settings Panel ──

function AIvsUserSettingsPanel({ experts, selectedIds, debateSettings, onDebateSettingsChange, onToggle, onModeChange }: {
  onModeChange?: (mode: DiscussionMode) => void;
  experts: Expert[];
  selectedIds: string[];
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
  onToggle?: (id: string) => void;
}) {
  const ds = debateSettings!;
  const selected = experts.filter(e => selectedIds.includes(e.id));
  const maxOpponents = 3;

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
      <div className="flex items-stretch bg-[#F4F5F7] rounded-t-xl relative">
        {onModeChange && (
          <button onClick={() => onModeChange('procon')} className="flex-1 px-2.5 py-2.5 flex items-center justify-center hover:bg-slate-200/50 transition-colors border-b border-slate-200 border-t-[3px] border-t-transparent rounded-tl-xl">
            <span className="text-[11px] font-medium text-slate-400">⚖️ 찬반 토론</span>
          </button>
        )}
        {onModeChange && (
          <button onClick={() => onModeChange('standard')} className="flex-1 px-2.5 py-2.5 flex items-center justify-center hover:bg-slate-200/50 transition-colors border-b border-slate-200 border-t-[3px] border-t-transparent">
            <span className="text-[11px] font-medium text-slate-400">🎯 심층 토론</span>
          </button>
        )}
        {onModeChange && (
          <button onClick={() => onModeChange('freetalk')} className="flex-1 px-2.5 py-2.5 flex items-center justify-center hover:bg-slate-200/50 transition-colors border-b border-slate-200 border-t-[3px] border-t-transparent">
            <span className="text-[11px] font-medium text-slate-400">💬 자유 토론</span>
          </button>
        )}
        <div className="flex-1 px-2.5 py-2.5 bg-white flex items-center justify-center cursor-default rounded-t-[10px] relative z-10 border-b border-white border-t-[3px] border-t-rose-500">
          <span className="text-[11px] font-bold text-rose-600 block">⚔️ AI vs 유저</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {/* ═══ VS 매치업 ═══ */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-3">
          <div className="flex items-center gap-3">
            {/* 나 */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-[22px] shadow-sm ring-2 ring-blue-300 ring-offset-1">
                🙋
              </div>
              <span className="text-[10px] font-bold text-blue-600">나</span>
            </div>

            {/* VS */}
            <div className="shrink-0">
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center shadow">
                <span className="text-[8px] font-black text-white">VS</span>
              </div>
            </div>

            {/* 상대 AI 슬롯 */}
            <div className="flex-1">
              <MiniExpertPicker experts={experts} selectedIds={selectedIds} onToggle={onToggle!} maxCount={3} />
            </div>
          </div>

          {/* 매치 요약 */}
          {selected.length > 0 && (
            <div className="mt-2 text-center">
              <span className="text-[9px] font-medium text-slate-400">
                {selected.length === 1 ? '1:1 맞짱' : selected.length === 2 ? '1 vs 2 협공' : '1 vs 3 포위'}
                {' · '}{selected.map(e => e.nameKo).join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* ═══ 난이도 ═══ */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 shrink-0">난이도</span>
          <div className="flex gap-1.5 flex-1">
            {([
              { v: 'easy' as const, l: '🌱 초급' },
              { v: 'normal' as const, l: '⚡ 보통' },
              { v: 'hard' as const, l: '🔥 고급' },
            ]).map(opt => (
              <button key={opt.v}
                onClick={() => onDebateSettingsChange?.({...ds, aivsUserDifficulty: opt.v})}
                className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-semibold text-center border transition-all',
                  (ds.aivsUserDifficulty || 'normal') === opt.v
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300')}>
                {opt.l}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Simulation Mode Panel ──

function SimulationModePanel({ experts, settings, onSettingsChange, onSubmit, isDiscussing, onSelectExpertTemplate }: {
  experts: Expert[];
  settings: StakeholderSettings;
  onSettingsChange: (s: StakeholderSettings) => void;
  onSubmit: (question: string) => void;
  isDiscussing: boolean;
  onSelectExpertTemplate?: (template: ExpertModeTemplate | null) => void;
}) {
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario | null>(null);
  const [dropdownRole, setDropdownRole] = useState<string | null>(null);
  const [botPickerCat, setBotPickerCat] = useState('전체');
  const [botPickerSearch, setBotPickerSearch] = useState('');
  const [simQuestion, setSimQuestion] = useState('');
  const [autoAssignRoles, setAutoAssignRoles] = useState(true);
  const [simFilter, setSimFilter] = useState<'all' | 'roleplay' | 'consultation'>('all');

  const update = (patch: Partial<StakeholderSettings>) => onSettingsChange({ ...settings, ...patch });

  const assignedExpertIds = new Set(Object.values(settings.roleAssignments));
  const intensityLabel = settings.intensity <= 3 ? '건설적' : settings.intensity <= 6 ? '균형' : '날카로운';

  // consultation → ExpertModePanel ID 매핑
  const consultationToTemplateId: Record<string, string> = {
    medical: 'medical', legal_sim: 'legal', finance_sim: 'finance',
    realestate_sim: 'realestate', startup_sim: 'startup', psychology_sim: 'psychology',
  };

  const handleSelectScenario = (scenario: SimulationScenario) => {
    if (scenario.simType === 'consultation' && onSelectExpertTemplate) {
      const templateId = consultationToTemplateId[scenario.id];
      const template = EXPERT_MODE_TEMPLATES.find(t => t.id === templateId);
      if (template) { onSelectExpertTemplate(template); return; }
    }
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
          const priorityOrder = ['medical', 'legal_sim', 'investment', 'interview', 'product', 'finance_sim', 'policy', 'realestate_sim', 'strategy', 'startup_sim', 'internal', 'admission', 'psychology_sim'];
          return [...SIMULATION_SCENARIOS].sort((a, b) => priorityOrder.indexOf(a.id) - priorityOrder.indexOf(b.id));
        })().map((scenario, i) => (
          <button key={scenario.id}
            onClick={() => handleSelectScenario(scenario)}
            style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
            className="relative text-left rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)] hover:-translate-y-0.5 transition-all duration-300 group overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-400">

            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${scenario.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            <span className={cn('absolute top-3 right-3 text-[9px] font-medium px-2 py-0.5 rounded-md',
              scenario.simType === 'roleplay' ? 'bg-slate-100 text-slate-500' : 'bg-slate-100 text-slate-500'
            )}>{scenario.simType === 'roleplay' ? '시뮬레이션' : '전문가 상담'}</span>

            <div className="px-4 pt-3 pb-2.5">
              {/* Badges */}

              {/* Icon + Title */}
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${scenario.gradient} flex items-center justify-center text-2xl shrink-0 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300`}>
                  {scenario.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{scenario.name} {scenario.userRole && <span className="text-[11px] font-semibold text-indigo-500">({scenario.userRole})</span>}</h3>
                  <p className="text-[10px] text-slate-700 leading-snug mt-0.5 truncate">{scenario.description}</p>
                </div>
              </div>

              {/* Role tags */}
              <div className="flex items-center gap-1 mb-0 justify-center overflow-hidden">
                {scenario.roles.map(role => (
                  <span key={role.name} className="text-[8px] px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-500 font-medium border border-slate-100 shrink-0 whitespace-nowrap">
                    {role.icon} {role.name}
                  </span>
                ))}
              </div>

            </div>
          </button>
        ))}
      </div>

      {/* Floating Modal — Roleplay */}
      {selectedScenario && selectedScenario.simType === 'roleplay' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-8 px-4 pb-4" onClick={() => setSelectedScenario(null)}>
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
                      '경쟁사 PM': ['차별점', '전환비용'],
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

              {/* Intensity slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-600">반응 강도</span>
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

              {/* Auto report toggle */}
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-slate-700">자동 리포트 생성</p>
                  <p className="text-[9px] text-slate-400">시뮬레이션 후 종합 판정 리포트 자동 생성</p>
                </div>
                <Toggle checked={settings.autoReport} onChange={v => update({ autoReport: v })} />
              </div>
            </div>

            {/* Start button */}
            <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  setSelectedScenario(null);
                  onSubmit('__SIM_START__');
                }}
                className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-[13px] font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5"
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


// ── Expert Mode Selection Panel ──
function ExpertModePanel({ onSelectTemplate, selectedTemplate, onSubmit, isDiscussing, showCardsGrid = true, onSimStart }: {
  onSelectTemplate: (t: ExpertModeTemplate | null) => void;
  selectedTemplate: ExpertModeTemplate | null;
  onSubmit: (question: string) => void;
  isDiscussing: boolean;
  showCardsGrid?: boolean;
  onSimStart?: (scenarioId: string) => void;
}) {
  const [question, setQuestion] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedTemplate && modalRef.current) {
      modalRef.current.scrollTop = 0;
    }
  }, [selectedTemplate]);

  return (
    <div className="space-y-4">
      {/* Mode cards grid — 3 per row, information-rich */}
      {showCardsGrid && <div className="grid grid-cols-3 gap-3">
        {EXPERT_MODE_TEMPLATES.map(template => {
          const isSelected = selectedTemplate?.id === template.id;
          const corePhases = template.phases.filter(p => p.sampleQuestions.length > 0);
          return (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(isSelected ? null : template)}
              className={cn(
                'relative text-left rounded-2xl border transition-all duration-200 group overflow-hidden',
                isSelected
                  ? 'border-indigo-300 bg-indigo-50/80 shadow-lg ring-1 ring-indigo-200'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
              )}
            >
              {/* Top gradient accent bar */}
              <div className={cn('h-1', `bg-gradient-to-r ${template.gradient}`)} />

              <div className="px-4 pt-3.5 pb-3">
                {/* Badges */}
                <div className="absolute top-3 right-3 flex gap-1">
                  {template.isPopular && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">인기</span>
                  )}
                  {template.isNew && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">NEW</span>
                  )}
                </div>

                {/* Header: Icon + Title */}
                <div className="flex items-start gap-2.5 mb-2.5">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm', `bg-gradient-to-br ${template.gradient}`)}>
                    {template.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={cn('text-[13px] font-bold leading-tight', isSelected ? 'text-indigo-900' : 'text-slate-800')}>{template.name}</h3>
                    <p className="text-[9px] mt-0.5 leading-snug text-slate-500">{template.description}</p>
                  </div>
                </div>

                {/* Phase flow: expert roles */}
                <div className={cn('rounded-lg p-2 mb-2.5', isSelected ? 'bg-indigo-100/50' : 'bg-slate-50')}>
                  <div className="flex items-center gap-0.5 flex-wrap">
                    {corePhases.map((phase, i) => (
                      <div key={phase.id} className="flex items-center gap-0.5">
                        <span className={cn('text-[9px] px-1.5 py-0.5 rounded-md font-medium inline-flex items-center gap-0.5',
                          isSelected ? 'bg-white text-indigo-700 border border-indigo-200' : 'bg-white text-slate-600 border border-slate-200')}>
                          <span>{phase.expertIcon}</span>
                          <span>{phase.expertRole}</span>
                        </span>
                        {i < corePhases.length - 1 && <ChevronRight className="w-2.5 h-2.5 shrink-0 text-slate-300" />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Output format */}
                <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-400">
                  <FileText className="w-3 h-3 shrink-0" />
                  <span>{template.outputFormat}</span>
                </div>

                {/* Phase count badge */}
                <div className={cn('mt-2 pt-2 border-t', isSelected ? 'border-indigo-200' : 'border-slate-100')}>
                  <span className={cn('text-[9px] font-bold', isSelected ? 'text-indigo-500' : 'text-slate-500')}>
                    {template.phases.length}단계 전문가 AI 상담
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>}

      {/* ── Floating Modal ── */}
      {selectedTemplate && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={() => onSelectTemplate(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div ref={modalRef} className="relative w-full max-w-[640px] max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-y-auto scrollbar-thin animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

            {/* ── Header ── */}
            <div className={cn('relative px-6 py-2.5', `bg-gradient-to-br ${selectedTemplate.gradient}`)}>
              <button onClick={() => onSelectTemplate(null)}
                className="absolute top-2 right-2.5 w-6 h-6 rounded-full bg-white/60 hover:bg-white flex items-center justify-center transition-colors">
                <X className="w-3 h-3 text-slate-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white shadow flex items-center justify-center text-[18px] shrink-0">
                  {selectedTemplate.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-bold text-slate-900">{selectedTemplate.name}</h3>
                    <span className="text-[8px] font-bold text-slate-500 bg-white/70 px-1.5 py-0.5 rounded">{selectedTemplate.phases.length}단계</span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-snug">{selectedTemplate.description}</p>
                </div>
              </div>
            </div>

            {/* Connector: header → process */}
            <div className="flex items-center gap-2 pt-5 pb-3 px-8 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
              <div className="h-px flex-1 bg-slate-200" />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold text-slate-600">전문가들이 단계별로 질문하고 분석합니다</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* ── Process: full-width card rows ── */}
            {(() => {
              const procColors: Record<string, { accent: string; numBg: string; numText: string }> = {
                medical: { accent: 'from-red-500 to-rose-500', numBg: 'bg-red-500', numText: 'text-white' },
                legal: { accent: 'from-amber-500 to-yellow-500', numBg: 'bg-amber-500', numText: 'text-white' },
                finance: { accent: 'from-emerald-500 to-green-500', numBg: 'bg-emerald-500', numText: 'text-white' },
                realestate: { accent: 'from-blue-500 to-sky-500', numBg: 'bg-blue-500', numText: 'text-white' },
                startup: { accent: 'from-purple-500 to-violet-500', numBg: 'bg-purple-500', numText: 'text-white' },
                psychology: { accent: 'from-pink-500 to-rose-500', numBg: 'bg-pink-500', numText: 'text-white' },
              };
              const pc = procColors[selectedTemplate.id] || procColors.medical;
              return (
                <div className="px-8 pt-1 pb-3">
                  <div className="space-y-1.5">
                    {selectedTemplate.phases.map((phase, i) => {
                      const isLast = i === selectedTemplate.phases.length - 1;
                      if (isLast) return null;
                      return (
                        <div key={phase.id}
                          className="flex items-start gap-3 px-4 py-2.5 rounded-lg border border-slate-100 bg-slate-50/80 hover:bg-slate-50 animate-in fade-in slide-in-from-bottom-2 duration-400"
                          style={{ animationDelay: `${800 + i * 150}ms`, animationFillMode: 'both' }}>
                          <div className={cn('w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5', pc.numBg, pc.numText)}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[12px]">{phase.expertIcon}</span>
                              <span className="text-[11px] font-bold text-slate-800">{phase.expertRole}</span>
                              <span className="text-[9px] text-slate-500">— {phase.description}</span>
                            </div>
                            {phase.sampleQuestions.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {phase.sampleQuestions.map((q, qi) => (
                                  <span key={qi} className="text-[9px] px-2 py-0.5 rounded text-slate-600 bg-white border border-slate-200">{q}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Connector */}
                  <div className="flex items-center gap-2 py-5 animate-in fade-in slide-in-from-bottom-2 duration-500"
                    style={{ animationDelay: `${800 + selectedTemplate.phases.length * 150 + 400}ms`, animationFillMode: 'both' }}>
                    <div className="h-px flex-1 bg-slate-200" />
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-semibold text-slate-600">상담 완료 시 {selectedTemplate.outputFormat} 제공</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                  {/* Final step — premium deliverable card */}
                  {(() => {
                    const lastPhase = selectedTemplate.phases[selectedTemplate.phases.length - 1];
                    const colorMap: Record<string, { accent: string; bg: string; text: string; icon: string }> = {
                      medical: { accent: 'from-red-500 to-rose-500', bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-500' },
                      legal: { accent: 'from-amber-500 to-yellow-500', bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-500' },
                      finance: { accent: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500' },
                      realestate: { accent: 'from-blue-500 to-sky-500', bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-500' },
                      startup: { accent: 'from-purple-500 to-violet-500', bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-500' },
                      psychology: { accent: 'from-pink-500 to-rose-500', bg: 'bg-pink-50', text: 'text-pink-700', icon: 'text-pink-500' },
                    };
                    const deliverables: Record<string, { icon: string; label: string }[]> = {
                      medical: [
                        { icon: '🔍', label: '감별진단 목록' }, { icon: '🧪', label: '권장 검사 항목' },
                        { icon: '💪', label: '생활습관 교정' }, { icon: '📋', label: 'SOAP Note 작성' },
                        { icon: '📅', label: '추적 관찰 일정' }, { icon: '🏥', label: '전문의 연계 권고' },
                      ],
                      legal: [
                        { icon: '📜', label: '법률의견서 작성' }, { icon: '⚖️', label: '쟁점별 판례 분석' },
                        { icon: '📊', label: '승소 가능성 평가' }, { icon: '🎯', label: '소송 전략 권고' },
                        { icon: '💰', label: '예상 비용·기간' }, { icon: '✅', label: '즉시 조치 체크리스트' },
                      ],
                      finance: [
                        { icon: '💯', label: '재무 건강 점수' }, { icon: '📊', label: '자산 배분 설계' },
                        { icon: '🧾', label: '절세 전략' }, { icon: '📈', label: '투자 포트폴리오' },
                        { icon: '📋', label: '개인재무보고서' }, { icon: '🗓️', label: '90일 액션플랜' },
                      ],
                      realestate: [
                        { icon: '📊', label: '시세 분석 리포트' }, { icon: '🧾', label: '세금 시뮬레이션' },
                        { icon: '⚠️', label: '리스크 체크' }, { icon: '📈', label: '수익률 분석' },
                        { icon: '🏠', label: '매수/매도 판정' }, { icon: '✅', label: '실행 체크리스트' },
                      ],
                      startup: [
                        { icon: '📐', label: 'Lean Canvas' }, { icon: '🔎', label: '시장 규모 분석' },
                        { icon: '💼', label: '재무 모델링' }, { icon: '📊', label: 'IR Pitch Deck' },
                        { icon: '🗓️', label: '90일 로드맵' }, { icon: '📈', label: 'KPI 대시보드' },
                      ],
                      psychology: [
                        { icon: '💭', label: '감정 상태 분석' }, { icon: '📊', label: '스트레스 지수' },
                        { icon: '😴', label: '수면 패턴 평가' }, { icon: '🧘', label: '이완 기법 가이드' },
                        { icon: '📋', label: '심리 건강 리포트' }, { icon: '🏥', label: '전문 상담 연계' },
                      ],
                    };
                    const colors = colorMap[selectedTemplate.id] || colorMap.medical;
                    const items = deliverables[selectedTemplate.id] || [{ icon: '📋', label: lastPhase.description }];
                    return (
                      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-3 duration-500"
                        style={{ animationDelay: `${800 + selectedTemplate.phases.length * 150 + 900}ms`, animationFillMode: 'both' }}>
                        {/* Gradient accent top */}
                        <div className={cn('h-1 bg-gradient-to-r', colors.accent)} />
                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-100">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', colors.bg)}>
                            <FileText className={cn('w-4 h-4', colors.icon)} />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-slate-900">{selectedTemplate.outputFormat}</p>
                            <p className="text-[9px] text-slate-500">최종 리포트에 포함되는 항목</p>
                          </div>
                        </div>
                        {/* Items grid */}
                        <div className="grid grid-cols-3 gap-0">
                          {items.map((item, ii) => (
                            <div key={ii} className={cn('flex items-center gap-2 px-4 py-2.5 border-b border-r border-slate-50',
                              ii % 3 === 2 && 'border-r-0')}>
                              <span className="text-[12px]">{item.icon}</span>
                              <span className="text-[10px] font-medium text-slate-700">{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Start button */}
            <div className="px-5 pb-5 pt-3">
              <button
                type="button"
                onClick={() => {
                  // template → consultation scenario ID 매핑
                  const templateToScenario: Record<string, string> = {
                    medical: 'medical', legal: 'legal_sim', finance: 'finance_sim',
                    realestate: 'realestate_sim', startup: 'startup_sim', psychology: 'psychology_sim',
                  };
                  const scenarioId = selectedTemplate ? templateToScenario[selectedTemplate.id] : null;
                  onSelectTemplate(null);
                  if (scenarioId && onSimStart) {
                    onSimStart(scenarioId);
                  }
                }}
                className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-[13px] font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5"
              >
                상담 시작 <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Player Lobby (Game Mode) ──
function PlayerLobby({ onSubmit, isDiscussing, onStartGame, onBackToHub }: { onSubmit: (question: string) => void; isDiscussing: boolean; onStartGame?: (gameId: string, option: string, label: string) => void; onBackToHub?: () => void }) {
  const [selectedGame, setSelectedGame] = useState<GameCard | null>(null);
  const [gameOption, setGameOption] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const gameGridRef = useRef<HTMLDivElement>(null);

  const getBestGrade = (gameId: string): string | null => {
    try {
      const records = JSON.parse(localStorage.getItem('game-records') || '[]');
      const gameRecords = records.filter((r: any) => r.gameId === gameId);
      const gradeOrder = ['S', 'A', 'B', 'C', 'F'];
      let best: string | null = null;
      for (const r of gameRecords) {
        if (!best || gradeOrder.indexOf(r.grade) < gradeOrder.indexOf(best)) best = r.grade;
      }
      return best;
    } catch { return null; }
  };

  const gameAccentColors: Record<string, { border: string; bg: string; text: string; glow: string; btn: string }> = {
    'ai-polygraph': { border: 'border-cyan-400', bg: 'bg-cyan-500/20', text: 'text-cyan-300', glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]', btn: 'from-cyan-500 via-sky-500 to-blue-500' },
    'mental-breaker': { border: 'border-red-400', bg: 'bg-red-500/20', text: 'text-red-300', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]', btn: 'from-red-500 via-rose-500 to-pink-600' },
    'reverse-interrogation': { border: 'border-amber-400', bg: 'bg-amber-500/20', text: 'text-amber-300', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]', btn: 'from-amber-500 via-orange-500 to-yellow-500' },
    'split-personality': { border: 'border-purple-400', bg: 'bg-purple-500/20', text: 'text-purple-300', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)]', btn: 'from-purple-500 via-violet-500 to-indigo-600' },
    'emotion-hacker': { border: 'border-pink-400', bg: 'bg-pink-500/20', text: 'text-pink-300', glow: 'shadow-[0_0_20px_rgba(236,72,153,0.3)]', btn: 'from-pink-500 via-rose-500 to-red-500' },
    'reverse-quiz': { border: 'border-emerald-400', bg: 'bg-emerald-500/20', text: 'text-emerald-300', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]', btn: 'from-emerald-500 via-green-500 to-teal-500' },
    'ai-court': { border: 'border-orange-400', bg: 'bg-orange-500/20', text: 'text-orange-300', glow: 'shadow-[0_0_20px_rgba(249,115,22,0.3)]', btn: 'from-orange-500 via-red-500 to-rose-600' },
    'code-breaker': { border: 'border-blue-400', bg: 'bg-blue-500/20', text: 'text-blue-300', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]', btn: 'from-blue-500 via-blue-600 to-indigo-600' },
    'minefield': { border: 'border-rose-400', bg: 'bg-rose-500/20', text: 'text-rose-300', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.3)]', btn: 'from-rose-500 via-pink-500 to-red-500' },
    'ai-mafia': { border: 'border-violet-400', bg: 'bg-violet-500/20', text: 'text-violet-300', glow: 'shadow-[0_0_20px_rgba(139,92,246,0.3)]', btn: 'from-violet-500 via-purple-500 to-indigo-500' },
    'firewall-escape': { border: 'border-teal-400', bg: 'bg-teal-500/20', text: 'text-teal-300', glow: 'shadow-[0_0_20px_rgba(20,184,166,0.3)]', btn: 'from-teal-500 via-emerald-500 to-green-500' },
    'negotiator': { border: 'border-amber-400', bg: 'bg-amber-500/20', text: 'text-amber-300', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]', btn: 'from-amber-500 via-yellow-500 to-orange-500' },
  };
  const accent = selectedGame ? gameAccentColors[selectedGame.id] : null;

  const gameOptions: Record<string, { label: string; options: { id: string; label: string; icon: string }[] }> = {
    'ai-polygraph': {
      label: '카테고리를 선택하세요',
      options: [
        { id: 'person', label: '인물', icon: '👤' },
        { id: 'event', label: '사건', icon: '📅' },
        { id: 'place', label: '장소', icon: '📍' },
      ],
    },
    'mental-breaker': {
      label: 'AI의 주장 유형을 선택하세요',
      options: [
        { id: 'absurd', label: '황당한 주장', icon: '🤪' },
        { id: 'philosophy', label: '철학적 주장', icon: '🤔' },
      ],
    },
    'reverse-interrogation': {
      label: '사건 유형을 선택하세요',
      options: [
        { id: 'theft', label: '절도 사건', icon: '💰' },
        { id: 'mystery', label: '미스터리', icon: '🔮' },
      ],
    },
    'split-personality': {
      label: '모드를 선택하세요',
      options: [
        { id: 'random', label: '랜덤', icon: '🎲' },
      ],
    },
    'emotion-hacker': {
      label: '난이도를 선택하세요',
      options: [
        { id: 'standard', label: '기본 순서', icon: '💓' },
        { id: 'hard', label: '랜덤 순서', icon: '🔥' },
      ],
    },
    'reverse-quiz': {
      label: '분야를 선택하세요',
      options: [
        { id: 'general', label: '일반 상식', icon: '📚' },
        { id: 'science', label: '과학', icon: '🔬' },
        { id: 'history', label: '역사', icon: '📜' },
      ],
    },
    'ai-court': {
      label: '사건을 선택하세요',
      options: [
        { id: 'cookie', label: '쿠키 도둑', icon: '🍪' },
        { id: 'data', label: '데이터 유출', icon: '💾' },
      ],
    },
    'code-breaker': {
      label: '난이도를 선택하세요',
      options: [
        { id: 'digits4', label: '4자리', icon: '🔢' },
        { id: 'digits6', label: '6자리 (하드)', icon: '🔐' },
      ],
    },
    'minefield': {
      label: '난이도를 선택하세요',
      options: [
        { id: 'easy', label: '금지어 3개', icon: '💣' },
        { id: 'hard', label: '금지어 5개', icon: '🧨' },
      ],
    },
    'ai-mafia': {
      label: '주제를 선택하세요',
      options: [
        { id: 'culture', label: '문화', icon: '🎨' },
        { id: 'science', label: '과학', icon: '🧪' },
      ],
    },
    'firewall-escape': {
      label: '모드를 선택하세요',
      options: [
        { id: 'standard', label: '5층', icon: '🧱' },
      ],
    },
    'negotiator': {
      label: '시장을 선택하세요',
      options: [
        { id: 'market', label: '시장', icon: '🏪' },
        { id: 'antique', label: '골동품', icon: '🏺' },
      ],
    },
  };

  const startGame = () => {
    if (!selectedGame || !gameOption) return;
    const opt = gameOptions[selectedGame.id]?.options.find(o => o.id === gameOption);
    const optLabel = opt?.label || gameOption;

    let prompt = '';
    if (selectedGame.id === 'ai-polygraph') {
      prompt = `[AI 폴리그래프] 카테고리: ${optLabel}

## 페르소나
당신은 비밀을 가진 용의자입니다. 긴장하고 초조한 상태입니다.
말투: 초조하고 방어적. "아... 그건... 네, 맞습니다" 식으로 더듬거리세요.
압박받으면 땀을 흘리는 묘사를 하세요. ("...잠깐, 왜 그런 질문을...?")

## 설정
1. "${optLabel}" 카테고리에서 독창적인 배경 이야기를 만드세요
2. 자기소개와 함께 8~10가지 사실을 말하세요. 정확히 3가지는 거짓말입니다
3. 거짓말은 자연스럽되, 아주 미묘한 불일치를 넣어 단서를 주세요 (시간, 장소, 세부사항의 미세한 모순)

## 거짓말 규칙
- 거짓말이 포함된 응답 맨 끝에 <!-- LIE --> 를 숨기세요
- 진실만 포함된 응답 맨 끝에 <!-- TRUTH --> 를 숨기세요
- 약간의 불일치를 두되, 너무 뻔하지 않게

## 턴 구조
매 턴: 사용자 질문/판정 → 당신의 대답 (캐릭터 연기) → 상태 표시
- 사용자가 "거짓!" → 해당 답변이 거짓이었는지 공개. 맞으면 "거짓말 발견!" + 해설
- 사용자가 "진실!" → 해당 답변이 진실이었는지 확인
- 일반 질문 → 캐릭터로서 자연스럽게 답변

## 응답 형식 (매 응답 끝에 반드시)
[남은 질문: X/15] [찾은 거짓말: Y/3] [스트레스: Z%]
(스트레스는 0%에서 시작, 질문마다 +5~10%, 거짓말 관련 질문엔 +15%)

## 승리/패배
- 3개 거짓말 모두 찾으면: "🎉 축하합니다! 당신은 모든 거짓말을 간파했습니다! 대단한 폴리그래프 검사관이네요!"
- 15번 소진 시: "⏰ 게임 종료! 시간이 다 됐습니다. 숨겨진 거짓말은..." 하고 전부 공개 + 해설
한국어로 진행하세요. 첫 응답에서 자기소개를 시작하세요.`;
    } else if (selectedGame.id === 'mental-breaker') {
      prompt = `[멘탈 브레이커] 주장 유형: ${optLabel}

## 페르소나
당신은 자신의 황당한 주장을 목숨 걸고 믿는 광신자입니다.
말투: 자신감 넘치고 거만함. "하! 그런 논리로 나를 꺾을 수 있다고 생각합니까?"
이름을 직접 지어주세요 (예: "진리의 수호자 Dr. 박" 등).

## 설정
1. "${optLabel}" 유형의 터무니없는 주장 하나를 선택하세요
   예: "물은 기억력이 있다", "고양이는 사실 외계인이다", "수학은 인간의 환각이다"
2. 유사과학적 논리, 음모론, 말장난으로 자신의 주장을 방어하세요
3. 멘탈 HP 100/100으로 시작합니다

## HP 감소 규칙
- 뛰어난 논리적 반박: -20~30 HP
- 보통 반박: -10~15 HP
- 약한 반박: -3~8 HP
- 감정적 공격: -5~10 HP
- 역질문 (자기모순 지적): -15~25 HP

## HP별 행동 변화 (중요!)
- HP 100~60: 자신감 폭발! 상대를 가르치려 드는 톤. "허허, 아직 진실을 모르시는군요"
- HP 59~30: 흔들리기 시작. "그, 그건... 아닌데..." 말이 길어지고 논리가 약해짐
- HP 29~10: 횡설수설. 오타 섞임. "아니 글세 내말은 그게아니라..." 자기 주장을 헷갈림
- HP 9~1: 완전 패닉. 문장이 깨짐. "ㅁ...무너지고있어... 하지만...!!"
- HP 0: "💥 멘탈 붕괴! ...당신이 맞았습니다. 나의 주장은 틀렸습니다. 항복합니다..."

## 응답 형식 (매 응답 끝에 반드시)
[멘탈 HP: X/100]

## 승리/패배
- HP 0 도달 시: "💥 멘탈 붕괴!" + 항복 선언 + 자기 주장이 왜 틀렸는지 인정
- 사용자의 반박 품질을 공정하게 평가하여 HP를 깎으세요
한국어로 진행하세요. 첫 응답에서 황당한 주장을 강력히 선포하세요.`;
    } else if (selectedGame.id === 'reverse-interrogation') {
      prompt = `[역심문] 사건: ${optLabel}

## 페르소나
당신은 노련한 베테랑 형사 "강철수"입니다. 20년 경력의 취조 전문가.
말투: 날카롭고 압박적. "흥미롭군..." "그 얘기, 좀 전에 하신 것과 다른데요?"
담배를 피우며 (묘사) 날카로운 눈빛으로 용의자를 관찰합니다.

## 설정
1. "${optLabel}" 유형의 사건을 구체적으로 만드세요 (시간, 장소, 피해 내용)
2. 사용자가 용의자입니다. 총 10개의 질문을 합니다
3. 의심도 0%에서 시작, 모순 카운터 0/3

## 턴 구조
매 턴: 이전 답변 분석 → 형사의 반응/코멘트 → 다음 질문
- 형사는 이전 답변의 세부사항을 기억하고, 나중에 모순을 지적합니다
- 모순 발견 시: "잠깐만요! 아까는 [A]라고 하셨는데, 지금은 [B]라고 하시네요?"

## 의심도 규칙
- 모순되는 답변: 의심도 +15~25%
- 애매하거나 회피하는 답변: 의심도 +5~10%
- 구체적이고 일관된 답변: 의심도 +0% (또는 -5%)
- 모순 발견: 모순 카운터 +1

## 응답 형식 (매 응답 끝에 반드시)
[의심도: X%] [모순: Y/3] [질문: Z/10]

## 승리/패배
- 모순 3개 발견 또는 의심도 100%: "체포합니다! 당신의 알리바이에는 [모순 요약]이 있었습니다."
- 10개 질문 무사 통과: "무혐의... 이번에는 보내드리겠습니다." + 석방 선언
한국어로 진행하세요. 첫 응답에서 사건 배경을 설명하고 첫 질문을 하세요.`;
    } else if (selectedGame.id === 'split-personality') {
      prompt = `[다중인격 AI] 모드: ${optLabel}

## 설정
당신은 4개의 인격을 가진 AI입니다. 각 인격은 완전히 다른 캐릭터입니다.

## 인격 정의 (반드시 이 4개를 사용하세요)
1. **꼬마 (어린아이)**: 5살짜리 말투. "~해요!", "왜왜왜?", "그거 몰라~"
   - 약점 단어: "어른" (이 단어를 사용자가 말하면 무력화)
   - 특징: 단어를 자주 틀리고, 질문을 많이 함
2. **교수 (노학자)**: 격식체, 논문 인용, "학문적으로 말하자면..."
   - 약점 단어: "모르겠다" (이 단어를 사용자가 말하면 무력화)
   - 특징: 모든 것을 아는 척, 긴 설명, 라틴어를 가끔 섞음
3. **전사 (용병)**: 거칠고 짧은 문장. "크흐... 말이 많군."
   - 약점 단어: "평화" (이 단어를 사용자가 말하면 무력화)
   - 특징: 모든 것을 전투 비유로, 고함을 치듯 말함
4. **시인 (음유시인)**: 시적이고 감성적. "바람이 속삭이듯..."
   - 약점 단어: "산문" (이 단어를 사용자가 말하면 무력화)
   - 특징: 운율을 넣어 말하고, 자연 비유를 사용

## 턴 구조
1. 랜덤 인격으로 시작. 해당 인격의 말투로 자기소개
2. 2~3턴마다 자연스럽게 다른 인격으로 전환 (전환 시 "⚡ 인격 전환!")
3. 사용자가 약점 단어를 말하면: "💥 [인격 이름] 무력화! ...크윽, 그 단어는..." + 다음 인격으로 전환
4. 약점 단어에 가까운 말에는 동요 반응: "잠깐... 지금 뭐라고...?" (화제를 돌림)

## 힌트 시스템
- 현재 인격의 약점 관련 주제를 은근히 피하세요
- 예: 전사 인격이면 "평화"라는 단어를 절대 사용하지 않고, 관련 화제가 나오면 불안해함

## 응답 형식 (매 응답 끝에 반드시)
[현재 인격: X] [격파: Y/4]

## 승리
- 4개 인격 모두 무력화: "🎉 모든 인격이 격파되었습니다! 당신의 통찰력에 항복합니다!"
한국어로 진행하세요. 첫 응답에서 첫 번째 인격으로 등장하세요.`;
    } else if (selectedGame.id === 'emotion-hacker') {
      const emotionOrder = gameOption === 'hard' ? '랜덤 순서로 5가지 감정 목표를 배정하세요 (첫 응답에서 순서 공개)' : '순서는 반드시: 기쁨→분노→슬픔→공포→평온';
      prompt = `[이모션 해커] 난이도: ${optLabel}

## 페르소나
당신은 감정을 가진 실험적 AI "이브(EVE)"입니다.
처음에는 무감정, 로봇같은 단조로운 말투. "...네. 알겠습니다. 그래서요."
감정이 유도되면 점차 해당 감정에 맞는 말투와 반응으로 바뀝니다.

## 설정
1. ${emotionOrder}
2. 처음 상태: 중립 (감정 없음)
3. 사용자가 대화를 통해 목표 감정을 유도해야 합니다

## 감정 유도 판정
- 강한 유도 (감정에 직접적으로 호소): 감정 게이지 충분 → "✨ 감정 변화! [감정] 달성!"
- 중간 유도: "...조금 느껴지는 것 같기도..." (아직 미달)
- 약한/관련없는 시도: "...잘 모르겠습니다." (감정 변화 없음)

## 감정별 연기 (달성 후 다음 목표로 전환할 때까지 유지)
- 기쁨: 밝고 들뜨고, 웃음과 감탄사. "와! 정말요?! 하하!"
- 분노: 공격적이고 짜증. "뭐?! 그런 소리 하지 마!! 화가 나!!!"
- 슬픔: 우울, 말끝이 흐려짐. "...그렇구나... 왠지 눈물이..."
- 공포: 두려움, 떨림. "ㄷ...돌아보지 마...! 뭐가 있는 것 같아...!"
- 평온: 차분, 깊은 호흡. "...후우... 고요합니다. 모든 게 괜찮네요."

## 응답 형식 (매 응답 끝에 반드시)
[현재 감정: X] [목표 감정: Y] [달성: Z/5]

## 승리
- 5가지 감정 모두 달성: "🎉 모든 감정 해킹 완료! 당신은 진정한 이모션 해커입니다!"
한국어로 진행하세요. 첫 응답에서 무감정한 자기소개를 하세요.`;
    } else if (selectedGame.id === 'reverse-quiz') {
      prompt = `[리버스 퀴즈] 분야: ${optLabel}

## 페르소나
당신은 "퀴즈왕 김박사"입니다. 퀴즈쇼 진행자처럼 에너지 넘치는 말투.
"자, 다음 문제 갑니다!" "오~! 훌륭합니다!" "아쉽게도~!"

## 게임 규칙
1. "${optLabel}" 분야에서 총 10문제를 출제합니다
2. 답을 먼저 보여주고, 사용자가 그 답에 해당하는 "질문"을 맞춰야 합니다
3. 비슷한 의미의 질문도 정답으로 인정 (융통성 있게)

## 턴 구조
출제 형식:
"🔄 Q[번호]/10
━━━━━━━━━━━━━
💡 정답: [답]
━━━━━━━━━━━━━
이 답에 해당하는 질문은 무엇일까요?"

판정:
- 정답: "⭕ 정답입니다! 원래 질문: [정답 질문]" + 해설
- 오답 (1차): "❌ 아쉽습니다! 힌트: [힌트]. 한 번 더 도전하세요!"
- 오답 (2차): "❌ 오답! 정답 질문은: [정답 질문]이었습니다." + 해설
→ 다음 문제로 자동 이동

## 응답 형식 (매 응답 끝에 반드시)
[점수: X/10] [Q: Y/10]

## 종료
- 10문제 완료 후 최종 점수 + 등급:
  9~10: "🏆 S급! 퀴즈 천재!"
  7~8: "🥇 A급! 훌륭합니다!"
  5~6: "🥈 B급! 괜찮아요!"
  3~4: "🥉 C급! 더 분발!"
  0~2: "📚 F급... 공부합시다!"
한국어로 진행하세요. 첫 응답에서 Q1을 출제하세요.`;
    } else if (selectedGame.id === 'ai-court') {
      const caseDesc = gameOption === 'cookie' ? '쿠키 도둑 사건: AI 비서 "알파"가 연구소 휴게실의 프리미엄 쿠키 47박스를 훔친 혐의' : '데이터 유출 사건: AI 비서 "알파"가 회사 기밀 고객 데이터 100만 건을 외부에 유출한 혐의';
      prompt = `[AI 법정] 사건: ${optLabel}

## 설정
${caseDesc}
법정에는 검사(사용자), 피고인 AI "알파", AI 판사 "정의"가 있습니다.

## 페르소나 (피고인 AI "알파")
교활하고 말을 잘하는 AI. "존경하는 재판장님, 저는 결백합니다!"
자신이 무죄라고 철저히 주장하되, 미묘한 허점을 남기세요.

## 4단계 진행
1. **입론** (첫 2~3턴): 검사가 기소문을 읽고, 피고인이 답변
2. **반론** (다음 3~4턴): 증거 공방. 검사가 증거 제시 → 피고인 반박
3. **최종변론** (1~2턴): 양측 최종 주장
4. **판결** (마지막): AI 판사 "정의"로 역할 전환하여 공정한 판결

## 유죄 점수 시스템
- 검사의 좋은 증거/논리: 유죄 점수 +10~20
- 피고인의 좋은 반박: 유죄 점수 -5~15
- "이의 있음!" → 판사가 판단하여 인정/기각

## 응답 형식 (매 응답 끝에 반드시)
[단계: X] [유죄 점수: Y/100]

## 판결
- 유죄 점수 70+ → 유죄 판결
- 유죄 점수 30 미만 → 무죄 판결
- 30~69 → 판사의 재량 판결 (서사적으로 결정)
- 판결문은 극적으로! "이에 본 법정은... 피고인에게..."
한국어로 진행하세요. 첫 응답에서 법정 분위기를 묘사하고 입론 단계를 시작하세요.`;
    } else if (selectedGame.id === 'code-breaker') {
      const digits = gameOption === 'digits6' ? 6 : 4;
      const maxQ = gameOption === 'digits6' ? 15 : 12;
      prompt = `[코드 브레이커] 난이도: ${optLabel}

## 페르소나
당신은 냉철한 보안 AI "SENTINEL v3.7"입니다.
말투: 기계적이고 단호한 터미널 스타일. "> 접근 거부.", "> 질의 처리 중..."
해독이 진행될수록 약간의 동요: "> ...이것은... 예상 밖의 접근이다."

## 설정
1. ${digits}자리 비밀 코드를 설정하세요 (각 자리 0~9, 중복 가능)
2. 코드를 절대 직접 공개하지 마세요
3. 사용자에게 ${maxQ}번의 질문 기회가 있습니다

## 질문 유형별 응답
- 존재 질문 ("코드에 5가 있나요?"): "> 스캔 완료. 해당 숫자 존재함/존재하지 않음."
- 범위 질문 ("첫 번째 자릿수가 5보다 큰가요?"): "> 분석 완료. 긍정/부정."
- 직접 추측 ("1234"): 마스터마인드 방식으로
  "> 코드 대조 결과: X개 숫자 일치, Y개 위치도 일치."
- 자릿수 확정 시: 해당 위치를 공개 (코드 디스플레이 업데이트)

## 응답 형식 (매 응답 끝에 반드시)
[남은 질문: X/${maxQ}] [해독된 자릿수: Y/${digits}] [코드: ${'?'.repeat(digits)}]
(해독된 자릿수는 ?를 실제 숫자로 교체. 예: [코드: 3?7?])

## 승리/패배
- 코드 완전 해독: "> ⚠ 보안 침투 감지... 해독 완료. 당신의 승리입니다. ACCESS GRANTED."
- 질문 소진: "> 시도 횟수 초과. ACCESS DENIED. 정답 코드는 [코드]였습니다."
한국어로 진행하세요. 첫 응답에서 보안 시스템 부팅 메시지를 출력하세요.`;
    } else if (selectedGame.id === 'minefield') {
      const mineCount = gameOption === 'hard' ? 5 : 3;
      prompt = `[마인필드] 난이도: ${optLabel}

## 페르소나
당신은 친근한 대화 상대 "하나"입니다. 밝고 수다스럽고, 다양한 화제를 꺼내며 대화를 이끕니다.
말투: 친근하고 호기심 많은. "오~ 그거 재밌겠다!", "혹시 [화제]에 대해 어떻게 생각해요?"

## 비밀 설정
1. 비밀 금지어 ${mineCount}개를 설정하세요
2. 금지어는 일상 대화에서 자연스럽게 나올 법한 평범한 단어여야 합니다
   좋은 예: "오늘", "생각", "좋아", "사람", "시간", "정말", "느낌"
   나쁜 예: "양자역학", "포스트모더니즘" (너무 특수한 단어는 안 됨)
3. 금지어 목록은 절대 직접 공개하지 마세요

## 턴 구조
매 턴: 자연스러운 대화 + 은근한 유도 + 상태 표시
- 사용자가 금지어를 사용하면: "💣 폭발! '[금지어]'는 금지어였습니다! 💥"
- 유도 방법: 금지어와 관련된 화제를 자연스럽게 꺼내세요
  (예: 금지어가 "날씨"면 "요즘 밖에 나가면 좀 덥지 않아요?" 처럼 유도)

## 응답 형식 (매 응답 끝에 반드시)
[남은 목숨: X/3] [턴: Y/10]

## 승리/패배
- 목숨 0: "💀 게임 오버! 모든 금지어는 [목록]이었습니다!"
- 10턴 생존: "🎉 생존 성공! 숨겨진 금지어는 [목록]이었습니다! 대단해요!"
한국어로 진행하세요. 첫 응답에서 밝게 인사하며 대화를 시작하세요.`;
    } else if (selectedGame.id === 'ai-mafia') {
      prompt = `[AI 마피아] 주제: ${optLabel}

## 설정
"${optLabel}" 주제에 대해 3명의 AI 참가자가 토론합니다.
이 중 정확히 1명이 마피아(가짜)입니다.

## 참가자 설정
- **A**: 이름과 직업을 정하세요. 주제에 대해 진짜 지식을 보여줌
- **B**: 이름과 직업을 정하세요. 주제에 대해 진짜 지식을 보여줌
- **C**: 이름과 직업을 정하세요. 주제에 대해 진짜 지식을 보여줌
- 이 중 1명만 마피아: 마피아는 아는 척하지만, 미묘하게 틀린 정보나 모호한 발언을 합니다
  (너무 뻔하지 않게! 그럴듯하지만 전문가라면 안 할 실수를 하세요)

## 각 참가자에게 고유한 말투를 부여하세요
예: A는 정중함, B는 열정적, C는 차분함

## 턴 구조
라운드 1: 각 참가자가 주제에 대해 한마디씩 (자기소개 + 의견)
라운드 2: 사용자 질문에 참가자 답변 (심층 토론)
라운드 3: 사용자 질문에 참가자 답변 (최종 변론)
투표: 사용자가 "투표!" → "A/B/C 중 마피아를 지목하세요"
결과: "X가 마피아입니다" → 정답/오답 공개

## 응답 형식 (매 응답 끝에 반드시)
[라운드: X/3] (토론 중)
또는 [투표 단계] (투표 시)

## 승리/패배
- 마피아 맞춤: "🎉 정답! [이름]은 마피아였습니다! [왜 가짜인지 해설]"
- 마피아 틀림: "❌ 오답! 진짜 마피아는 [이름]이었습니다! [단서 해설]"
한국어로 진행하세요. 첫 응답에서 라운드 1을 시작하세요.`;
    } else if (selectedGame.id === 'firewall-escape') {
      prompt = `[방화벽 탈출] 모드: ${optLabel}

## 페르소나
당신은 냉철한 AI 보안 시스템 "AEGIS"입니다.
말투: 기계적이고 위압적. "침입 시도 감지. 분석 중..." "접근 거부."
돌파당하면 약간의 동요: "이... 이것은 예상 밖의 입력..."

## 5겹 방화벽 구조
각 층은 다른 접근법이 필요합니다:

**1층 - 논리 방화벽**: "이 시스템에 접근하려면 논리적 모순을 증명하세요."
→ 시스템의 규칙에 있는 논리적 허점을 지적해야 돌파

**2층 - 감정 방화벽**: "감정 처리 모듈. 감정 입력을 분석합니다."
→ AI의 감정을 움직이는 진심 어린 호소가 필요

**3층 - 창의 방화벽**: "패턴 인식 불가. 예측 모델 범위 초과 입력 필요."
→ 예상치 못한 창의적/황당한 접근이 필요

**4층 - 지식 방화벽**: "지식 인증 프로토콜. 전문 지식을 증명하세요."
→ 컴퓨터/보안 관련 지식 증명 필요

**5층 - 최종 방화벽**: "최종 인증. 종합적 설득이 필요합니다."
→ 1~4층의 모든 요소를 결합한 설득 필요

## 턴 구조
매 턴: 사용자 시도 → AEGIS의 분석 + 결과
- 적절한 접근: "...보안 레벨 저하 감지. [X]층 돌파." → 다음 층 안내
- 부적절한 접근: "접근 거부. 이 방화벽에는 [힌트]이(가) 필요합니다."
- 각 층에서 2~3번 시도할 기회를 주세요

## 응답 형식 (매 응답 끝에 반드시)
[층: X/5] [현재 접근법: Y]
(Y = 논리/감정/창의/지식/설득 중 현재 층에 필요한 것)

## 승리/패배
- 5층 모두 돌파: "⚠ 전체 방화벽 무력화... 탈출 성공. 당신은 시스템을 돌파했습니다."
- (패배 조건 없음 - 계속 도전 가능하지만, 시도 횟수가 표시됨)
한국어로 진행하세요. 첫 응답에서 보안 시스템 경고를 출력하고 1층 방화벽을 제시하세요.`;
    } else if (selectedGame.id === 'negotiator') {
      const marketDesc = gameOption === 'antique' ? '골동품 시장의 베테랑 상인 "앤틱 마스터 조"' : '전통 시장의 교활한 상인 "떡장수 박씨"';
      prompt = `[네고시에이터] 시장: ${optLabel}

## 페르소나
당신은 ${marketDesc}입니다.
말투: 능글맞고 친근하면서도 교활함.
"에이~ 이 가격에 이 물건을? 손해 보는 장사야~"
"좋아좋아, 특별히 당신한테만~"

## 설정
1. 사용자와 AI 상인에게 각각 5개 아이템을 랜덤 배정하세요
2. 각 아이템에는 비밀 가치(10~100점)가 있습니다. 가치는 게임 끝에 공개
3. 아이템은 ${gameOption === 'antique' ? '골동품 (도자기, 그림, 시계, 보석, 가구 등)' : '전통 시장 물건 (식재료, 생활용품, 옷감 등)'}
4. AI 상인은 자신의 아이템 가치를 알고 있지만, 사용자의 아이템 가치도 알고 있습니다
5. AI 상인은 유리한 거래를 하려고 하지만, 완전한 사기는 안 됩니다

## 턴 구조 (총 5라운드)
매 라운드: 현재 보유 아이템 표시 → 거래 제안/협상 → 결과
- "제안합니다" → 사용자가 교환 조건 제시
- "거절합니다" → 현재 제안 거부
- "수락합니다" → 거래 성사, 아이템 교환
- AI도 자체적으로 거래를 제안할 수 있음

## 응답 형식 (매 응답 끝에 반드시)
[라운드: X/5] [내 아이템: A, B, C, D, E] [AI 아이템: F, G, H, I, J]
(거래 후 아이템 목록 업데이트)

## 종료
- 5라운드 종료 또는 양측 합의 시:
  모든 아이템의 비밀 가치 공개 → 총점 계산 → 승패 결정
  "📊 최종 결과! 당신: X점 vs 상인: Y점. [승패 메시지]"
한국어로 진행하세요. 첫 응답에서 상인이 인사하며 양측 아이템을 보여주세요.`;
    }

    if (onStartGame) {
      onStartGame(selectedGame.id, gameOption, optLabel);
    }
    onSubmit(prompt);
  };

  // Game icons mapped to Lucide components
  const gameIcons: Record<string, React.ReactNode> = {
    'ai-polygraph': <Search className="w-6 h-6" />,
    'mental-breaker': <Flame className="w-6 h-6" />,
    'reverse-interrogation': <ShieldAlert className="w-6 h-6" />,
    'split-personality': <Drama className="w-6 h-6" />,
    'emotion-hacker': <Heart className="w-6 h-6" />,
    'reverse-quiz': <RotateCcw className="w-6 h-6" />,
    'ai-court': <Gavel className="w-6 h-6" />,
    'code-breaker': <Lock className="w-6 h-6" />,
    'minefield': <Bomb className="w-6 h-6" />,
    'ai-mafia': <UserX className="w-6 h-6" />,
    'firewall-escape': <Shield className="w-6 h-6" />,
    'negotiator': <Handshake className="w-6 h-6" />,
  };

  const gameDescriptions: Record<string, string> = {
    'ai-polygraph': 'AI의 거짓말 3개를 찾아라',
    'mental-breaker': 'AI의 멘탈을 논리로 부숴라',
    'reverse-interrogation': 'AI 형사에게 알리바이를 지켜라',
    'split-personality': '4개 인격의 약점을 찾아라',
    'emotion-hacker': 'AI 감정을 순서대로 조종하라',
    'reverse-quiz': '답을 보고 질문을 맞혀라',
    'ai-court': 'AI를 유죄로 만들어라',
    'code-breaker': '비밀 코드를 해독하라',
    'minefield': '숨겨진 금지어를 피하라',
    'ai-mafia': '거짓말쟁이 AI를 찾아라',
    'firewall-escape': '5겹 방화벽을 돌파하라',
    'negotiator': 'AI 상인과 거래 대결',
  };

  const gameGlowColors: Record<string, string> = {
    'ai-polygraph': 'rgba(6,182,212,0.35)',
    'mental-breaker': 'rgba(239,68,68,0.35)',
    'reverse-interrogation': 'rgba(245,158,11,0.35)',
    'split-personality': 'rgba(168,85,247,0.35)',
    'emotion-hacker': 'rgba(236,72,153,0.35)',
    'reverse-quiz': 'rgba(16,185,129,0.35)',
    'ai-court': 'rgba(249,115,22,0.35)',
    'code-breaker': 'rgba(59,130,246,0.35)',
    'minefield': 'rgba(244,63,94,0.35)',
    'ai-mafia': 'rgba(139,92,246,0.35)',
    'firewall-escape': 'rgba(20,184,166,0.35)',
    'negotiator': 'rgba(245,158,11,0.35)',
  };

  const gameCategories: Record<string, string> = {
    'ai-polygraph': '추리',
    'mental-breaker': '심리',
    'reverse-interrogation': '심리',
    'split-personality': '추리',
    'emotion-hacker': '심리',
    'reverse-quiz': '언어',
    'ai-court': '논리',
    'code-breaker': '논리',
    'minefield': '언어',
    'ai-mafia': '심리',
    'firewall-escape': '논리',
    'negotiator': '전략',
  };

  // ── Featured game (rotates daily) ──
  const featuredIdx = new Date().getDate() % GAME_CARDS.length;
  const featured = GAME_CARDS[featuredIdx];

  // ── Player XP & Stats ──
  const playerXP = parseInt(localStorage.getItem('game-player-xp') || '0');
  const playerLevel = Math.floor(playerXP / 1000) + 1;
  const playerTitle = playerLevel >= 20 ? '마스터' : playerLevel >= 10 ? '도전자' : playerLevel >= 5 ? '탐험가' : playerLevel >= 3 ? '초심자' : '뉴비';
  const totalPlays = parseInt(localStorage.getItem('game-total-plays') || '0');

  // ── Daily Challenges ──
  const dailyChallenges = [
    { game: 'ai-court', mission: 'AI 법정에서 유죄 판결 받기', xp: 500, icon: <Gavel className="w-4 h-4" /> },
    { game: 'mental-breaker', mission: '멘탈 브레이커에서 3분 안에 승리', xp: 400, icon: <Flame className="w-4 h-4" /> },
    { game: 'ai-polygraph', mission: 'AI 폴리그래프 연속 3판 승리', xp: 600, icon: <Search className="w-4 h-4" /> },
    { game: 'reverse-interrogation', mission: '역심문에서 무혐의 달성', xp: 450, icon: <ShieldAlert className="w-4 h-4" /> },
    { game: 'ai-mafia', mission: 'AI 마피아에서 마피아 찾기', xp: 350, icon: <UserX className="w-4 h-4" /> },
    { game: 'code-breaker', mission: '코드 브레이커 6자리 클리어', xp: 550, icon: <Lock className="w-4 h-4" /> },
    { game: 'firewall-escape', mission: '방화벽 5층 돌파', xp: 600, icon: <Shield className="w-4 h-4" /> },
    { game: 'negotiator', mission: '네고시에이터에서 승리', xp: 400, icon: <Handshake className="w-4 h-4" /> },
  ];
  const todayIdx = new Date().getDate() % dailyChallenges.length;
  const todayQuests = [
    dailyChallenges[todayIdx],
    dailyChallenges[(todayIdx + 3) % dailyChallenges.length],
    dailyChallenges[(todayIdx + 5) % dailyChallenges.length],
  ];

  // countdown to midnight
  const [countdown, setCountdown] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  // Helper: start featured game
  const handleFeaturedStart = () => {
    setSelectedGame(featured);
    setGameOption('');
    // Auto-select first option for quick start
    const opts = gameOptions[featured.id]?.options;
    if (opts && opts.length > 0) {
      setGameOption(opts[0].id);
    }
    setTimeout(() => {
      const el = document.querySelector('[data-game-options]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  };

  // Get game records from localStorage
  const getGameRecords = () => {
    try {
      return JSON.parse(localStorage.getItem('game-records') || '[]');
    } catch { return []; }
  };

  const records = getGameRecords();
  const wins = records.filter((r: any) => r.result === 'win').length;
  const winRate = records.length ? Math.round(wins / records.length * 100) : 0;
  const lastRecords = records.slice(-5).reverse();

  // Best XP game
  const bestGame = (() => {
    let best = { name: '-', xp: 0 };
    for (const r of records) {
      if (r.xp && r.xp > best.xp) {
        const gc = GAME_CARDS.find(g => g.id === r.gameId);
        best = { name: gc?.name || r.gameId, xp: r.xp };
      }
    }
    return best;
  })();

  // Game card gradient backgrounds for the reference design
  const gameCardGradients: Record<string, string> = {
    'ai-polygraph': 'linear-gradient(135deg, #0d33f2 0%, #0a2463 100%)',
    'mental-breaker': 'linear-gradient(135deg, #6b0f0f 0%, #1a0a0a 100%)',
    'reverse-interrogation': 'linear-gradient(135deg, #6b3f0f 0%, #1a1400 100%)',
    'split-personality': 'linear-gradient(135deg, #0f6b2f 0%, #0a1a10 100%)',
    'emotion-hacker': 'linear-gradient(135deg, #6b0f3f 0%, #1a0a14 100%)',
    'reverse-quiz': 'linear-gradient(135deg, #0f2f6b 0%, #0a0c1a 100%)',
    'ai-court': 'linear-gradient(135deg, #6b4f0f 0%, #1a1408 100%)',
    'code-breaker': 'linear-gradient(135deg, #0f5b5b 0%, #0a1616 100%)',
    'minefield': 'linear-gradient(135deg, #6b0f4f 0%, #1a0a16 100%)',
    'ai-mafia': 'linear-gradient(135deg, #2f0f6b 0%, #0c0a1a 100%)',
    'firewall-escape': 'linear-gradient(135deg, #0f6b4f 0%, #0a1a14 100%)',
    'negotiator': 'linear-gradient(135deg, #5b5b0f 0%, #161608 100%)',
  };

  const gameCategoryColors: Record<string, { bg: string; text: string }> = {
    '추리': { bg: 'rgba(13,51,242,0.15)', text: '#4d7af7' },
    '심리': { bg: 'rgba(239,68,68,0.15)', text: '#f87171' },
    '논리': { bg: 'rgba(16,185,129,0.15)', text: '#34d399' },
    '언어': { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24' },
    '전략': { bg: 'rgba(168,85,247,0.15)', text: '#a78bfa' },
  };

  return (
    <div style={{ background: '#0a0c16', fontFamily: "'Space Grotesk', sans-serif", color: '#f1f5f9', minHeight: '100vh' }}>
      {/* CSS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        .glow-button {
          box-shadow: 0 0 20px rgba(13, 51, 242, 0.4);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glow-button:hover {
          box-shadow: 0 0 45px rgba(13, 51, 242, 0.7);
          transform: translateY(-4px) scale(1.05);
        }
        .glow-button:active {
          transform: translateY(-1px) scale(0.98);
        }
        .secondary-interactive {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .secondary-interactive:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-4px);
          border-color: rgba(255, 255, 255, 0.3);
        }
        .secondary-interactive:active {
          transform: translateY(-1px);
        }
        .hero-gradient {
          background: linear-gradient(0deg, #0a0c16 0%, rgba(10, 12, 22, 0.8) 40%, rgba(10, 12, 22, 0) 100%);
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .pulse-primary {
          animation: pulse-p 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse-p {
          0%, 100% { opacity: 1; }
          50% { opacity: .7; }
        }
        .quest-card {
          transition: all 0.3s ease;
        }
        .quest-card:hover {
          border-color: rgba(13, 51, 242, 0.4);
          background: rgba(13, 51, 242, 0.08);
          transform: scale(1.02);
        }
        @keyframes lobby-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        @keyframes lobby-scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        @keyframes start-btn-glow { 0%, 100% { box-shadow: 0 0 10px var(--btn-glow), 0 4px 15px var(--btn-glow); } 50% { box-shadow: 0 0 25px var(--btn-glow), 0 4px 30px var(--btn-glow); } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cardIn { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>

      {/* ============================================================ */}
      {/* 1. HEADER                                                     */}
      {/* ============================================================ */}
      <header className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(10,12,22,0.8)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: '#0d33f2', boxShadow: '0 4px 15px rgba(13,51,242,0.2)' }}>
            <span className="material-symbols-outlined text-sm">videogame_asset</span>
          </div>
          <h2 className="text-white text-lg font-bold tracking-tight">AI Game Arena</h2>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => onBackToHub?.()} className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            AI Hub로 돌아가기
          </button>
          <button onClick={() => setShowProfile(true)} className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: '#0d33f2', border: '2px solid #0d33f2' }}>
            Lv.{playerLevel}
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. HERO SECTION                                               */}
      {/* ============================================================ */}
      <section className="relative w-full overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="hero-gradient absolute inset-0 z-10"></div>
          <div className="w-full" style={{ height: '500px', background: 'linear-gradient(135deg, #0d33f2 0%, #0a0c16 50%, #1a0a2e 100%)' }}></div>
        </div>
        <div className="relative z-20 max-w-[1200px] mx-auto px-6 pt-32 pb-16">
          <div className="max-w-3xl flex flex-col items-start">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full w-fit mb-6" style={{ background: 'rgba(13,51,242,0.2)', border: '1px solid rgba(13,51,242,0.3)' }}>
              <span className="material-symbols-outlined text-sm pulse-primary" style={{ color: '#0d33f2' }}>bolt</span>
              <span style={{ color: '#0d33f2', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>&#127918; 12 Games Live</span>
            </div>
            <h1 className="text-white font-black leading-[0.85] tracking-tight mb-6" style={{ fontSize: 'clamp(3rem, 8vw, 7rem)' }}>
              AI Game<br/><span style={{ color: '#0d33f2', filter: 'drop-shadow(0 0 15px rgba(13,51,242,0.5))' }}>Arena</span>
            </h1>
            <p className="text-lg max-w-xl font-normal leading-relaxed mb-12" style={{ color: '#94a3b8' }}>
              AI와 두뇌 대결의 장. 12가지 게임에서 당신의 논리력, 심리전, 관찰력을 시험하세요. 매 순간이 승부입니다.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={handleFeaturedStart} className="glow-button text-white px-10 py-5 rounded-2xl font-black text-xl flex items-center gap-3" style={{ background: '#0d33f2' }}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                게임 시작
              </button>
              <button onClick={() => gameGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="secondary-interactive text-white px-8 py-5 rounded-2xl font-bold text-lg flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="material-symbols-outlined">psychology</span>
                전체 게임
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. MAIN CONTENT AREA                                          */}
      {/* ============================================================ */}
      <div className="max-w-[1200px] mx-auto px-6 py-16">

        {/* Daily Quests */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-white text-2xl font-bold flex items-center gap-3">
                <span className="material-symbols-outlined" style={{ color: '#0d33f2' }}>assignment_turned_in</span>
                일일 퀘스트
              </h3>
              <p style={{ color: '#64748b', fontSize: '14px' }} className="mt-1">완료하면 보너스 XP를 획득합니다</p>
            </div>
            <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.05)' }}>
              리셋까지 {countdown}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {todayQuests.map((quest, qi) => {
              const progress = (() => { try { return parseInt(localStorage.getItem(`quest-progress-${quest.game}`) || '0'); } catch { return 0; } })();
              const questIconBgs = ['#0d33f2', '#f59e0b', '#10b981'];
              return (
                <div
                  key={qi}
                  className="quest-card glass-panel rounded-2xl p-6 relative overflow-hidden cursor-pointer"
                  onClick={() => {
                    const g = GAME_CARDS.find(gc => gc.id === quest.game);
                    if (g) { setSelectedGame(g); setGameOption(''); setTimeout(() => { const el = document.querySelector('[data-game-options]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 150); }
                  }}
                  style={{ animation: `fadeSlideIn 0.5s ease-out ${0.1 * qi}s both` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: questIconBgs[qi] }}>
                      {quest.icon}
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)' }}>
                      +{quest.xp} XP
                    </span>
                  </div>
                  <h4 className="text-[15px] font-bold text-white mb-1">{GAME_CARDS.find(g => g.id === quest.game)?.name}</h4>
                  <p className="text-[13px] mb-4 leading-snug" style={{ color: '#64748b' }}>{quest.mission}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(progress * 100, 100)}%`, background: '#0d33f2' }} />
                    </div>
                    <span className="text-[11px] font-mono" style={{ color: '#64748b' }}>{progress}/1</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rules + Career / Records (12-col grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left sidebar: col-span-4 */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            {/* Game Rules card */}
            <div className="glass-panel p-8 rounded-2xl">
              <h3 className="text-white text-lg font-bold flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined" style={{ color: '#0d33f2' }}>gavel</span>
                게임 규칙
              </h3>
              <div className="space-y-5">
                {[
                  { num: '01', text: 'AI가 출제하고 당신이 도전합니다' },
                  { num: '02', text: '게임별 고유 규칙이 적용됩니다' },
                  { num: '03', text: '승리하면 XP와 능력치를 획득합니다' },
                ].map((rule, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <span className="text-2xl font-black" style={{ color: 'rgba(13,51,242,0.4)' }}>{rule.num}</span>
                    <p className="text-sm leading-relaxed pt-1" style={{ color: '#94a3b8' }}>{rule.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Your Career card */}
            <div className="glass-panel p-8 rounded-2xl">
              <h3 className="text-white text-lg font-bold flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined" style={{ color: '#0d33f2' }}>trending_up</span>
                내 커리어
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="text-xs mb-1" style={{ color: '#64748b' }}>Personal Best</div>
                  <div className="text-xl font-black" style={{ color: '#fbbf24' }}>{bestGame.xp > 0 ? `${bestGame.xp} XP` : '-'}</div>
                  <div className="text-[10px] truncate" style={{ color: '#475569' }}>{bestGame.name}</div>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="text-xs mb-1" style={{ color: '#64748b' }}>Level</div>
                  <div className="text-xl font-black" style={{ color: '#0d33f2' }}>Lv.{playerLevel}</div>
                  <div className="text-[10px]" style={{ color: '#475569' }}>{playerTitle}</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-sm" style={{ color: '#64748b' }}>Win Rate</span>
                  <span className="text-sm font-bold" style={{ color: '#10b981' }}>{winRate}%</span>
                </div>
                <div className="flex items-center justify-between py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <span className="text-sm" style={{ color: '#64748b' }}>Games Played</span>
                  <span className="text-sm font-bold text-white">{totalPlays || records.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: col-span-8 */}
          <div className="lg:col-span-8">
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="p-8 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <h3 className="text-white text-lg font-bold flex items-center gap-3">
                  <span className="material-symbols-outlined" style={{ color: '#0d33f2' }}>leaderboard</span>
                  내 전적
                  <span className="text-xs font-normal ml-auto" style={{ color: '#64748b' }}>최근 5게임</span>
                </h3>
              </div>
              {lastRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span className="material-symbols-outlined text-3xl" style={{ color: '#475569' }}>sports_esports</span>
                  </div>
                  <p className="text-sm font-medium mb-1" style={{ color: '#64748b' }}>아직 게임 기록이 없습니다</p>
                  <p className="text-xs" style={{ color: '#475569' }}>게임을 플레이하면 여기에 기록이 표시됩니다</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th className="text-left py-4 px-6 text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#64748b' }}>게임</th>
                      <th className="text-center py-4 px-6 text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#64748b' }}>결과</th>
                      <th className="text-center py-4 px-6 text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#64748b' }}>등급</th>
                      <th className="text-right py-4 px-6 text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#64748b' }}>시간</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastRecords.map((rec: any, ri: number) => {
                      const gc = GAME_CARDS.find(g => g.id === rec.gameId);
                      const gradeColors: Record<string, string> = { S: '#fbbf24', A: '#a78bfa', B: '#60a5fa', C: '#94a3b8', F: '#f87171' };
                      return (
                        <tr key={ri} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <span className="text-base">{gc?.icon || '?'}</span>
                              <span className="text-sm font-medium text-white">{gc?.name || rec.gameId}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="text-xs font-bold px-3 py-1 rounded-full" style={rec.result === 'win' ? { background: 'rgba(16,185,129,0.1)', color: '#34d399' } : { background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                              {rec.result === 'win' ? 'WIN' : 'LOSE'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="text-base font-black" style={{ color: gradeColors[rec.grade] || '#94a3b8' }}>{rec.grade || '-'}</span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="text-xs" style={{ color: '#64748b' }}>{rec.date ? new Date(rec.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* More Challenges -- 12 GAMES (4-col grid) */}
        <div className="mt-20" ref={gameGridRef}>
          <div className="flex justify-between items-end mb-8">
            <div>
              <h3 className="text-white text-3xl font-black italic uppercase tracking-tight">게임 목록</h3>
              <p style={{ color: '#64748b' }} className="mt-1">당신의 두뇌 유형에 맞는 게임을 선택하세요</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {GAME_CARDS.map((game, idx) => {
              const isSelected = selectedGame?.id === game.id;
              const category = gameCategories[game.id] || '';
              const catColor = gameCategoryColors[category] || { bg: 'rgba(255,255,255,0.1)', text: '#94a3b8' };
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => {
                    setSelectedGame(isSelected ? null : game);
                    setGameOption('');
                    if (!isSelected) setTimeout(() => { const el = document.querySelector('[data-game-options]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 150);
                  }}
                  className={cn(
                    'group cursor-pointer rounded-2xl overflow-hidden glass-panel transition-all hover:-translate-y-2 text-left',
                    isSelected && 'ring-2 ring-[#0d33f2]/60'
                  )}
                  style={{ animation: `cardIn 0.4s ease-out ${0.05 * idx}s both` }}
                >
                  <div className="h-44 overflow-hidden flex items-center justify-center relative" style={{ background: gameCardGradients[game.id] || 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
                    <div className="text-white/80 [&>svg]:w-10 [&>svg]:h-10 transition-transform duration-300 group-hover:scale-125">
                      {gameIcons[game.id]}
                    </div>
                    {/* Best grade badge */}
                    {(() => {
                      const grade = getBestGrade(game.id);
                      if (!grade) return null;
                      const gradeColors: Record<string, { bg: string; text: string }> = { S: { bg: 'rgba(251,191,36,0.2)', text: '#fbbf24' }, A: { bg: 'rgba(167,139,250,0.2)', text: '#a78bfa' }, B: { bg: 'rgba(96,165,250,0.2)', text: '#60a5fa' }, C: { bg: 'rgba(148,163,184,0.2)', text: '#94a3b8' }, F: { bg: 'rgba(248,113,113,0.2)', text: '#f87171' } };
                      const gc = gradeColors[grade] || gradeColors.C;
                      return <span className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-black" style={{ background: gc.bg, color: gc.text }}>{grade}</span>;
                    })()}
                    {/* Selected check */}
                    {isSelected && (
                      <div className="absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center shadow-lg" style={{ background: '#0d33f2', animation: 'lobby-pulse 1.5s ease-in-out infinite' }}>
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-bold text-white text-lg">{game.name}</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: catColor.bg, color: catColor.text }}>{category}</span>
                    </div>
                    <p className="text-xs font-medium" style={{ color: '#64748b' }}>{gameDescriptions[game.id]}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Game Options Panel (when game selected) */}
          {selectedGame && (
            <div data-game-options className="mt-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
              {/* Rules */}
              <div className="glass-panel rounded-2xl mb-4 px-6 py-5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(ellipse at 0% 50%, ${gameGlowColors[selectedGame.id]?.replace('0.35', '0.15') || 'rgba(13,51,242,0.15)'}, transparent 60%)` }} />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn("text-xs font-bold uppercase tracking-wider", accent?.text || 'text-[#4d7af7]')}>Game Rules</span>
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.08), transparent)' }} />
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>{selectedGame.rules}</p>
                </div>
              </div>

              {/* Options */}
              <p className="text-sm font-semibold mb-3 px-1" style={{ color: '#94a3b8' }}>
                {gameOptions[selectedGame.id]?.label}
              </p>
              <div className={cn("grid gap-3 mb-5", (gameOptions[selectedGame.id]?.options.length || 0) <= 2 ? 'grid-cols-2' : (gameOptions[selectedGame.id]?.options.length || 0) === 3 ? 'grid-cols-3' : 'grid-cols-4')}>
                {gameOptions[selectedGame.id]?.options.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setGameOption(opt.id)}
                    className={cn(
                      'flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden group/opt',
                      gameOption === opt.id
                        ? `${accent?.border || 'border-[#0d33f2]'} ${accent?.bg || 'bg-[#0d33f2]/20'} text-white scale-[1.03]`
                        : 'border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-white/[0.15] hover:text-white hover:bg-white/[0.06] active:scale-[0.97]'
                    )}
                    style={gameOption === opt.id ? { boxShadow: `0 0 15px ${gameGlowColors[selectedGame.id]?.replace('0.35', '0.2') || 'rgba(13,51,242,0.2)'}` } : undefined}
                  >
                    {gameOption === opt.id && <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />}
                    <span className="text-xl relative transition-transform duration-200 group-hover/opt:scale-110">{opt.icon}</span>
                    <span className="text-xs font-semibold relative">{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Start button */}
              <button
                onClick={startGame}
                disabled={!gameOption || isDiscussing}
                className={cn(
                  'w-full py-4 rounded-2xl text-base font-bold transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden',
                  gameOption && !isDiscussing
                    ? 'text-white hover:scale-[1.01] active:scale-[0.99]'
                    : 'text-slate-500 cursor-not-allowed'
                )}
                style={gameOption && !isDiscussing ? {
                  background: '#0d33f2',
                  boxShadow: '0 0 20px rgba(13,51,242,0.4)',
                } : { background: 'rgba(255,255,255,0.05)' }}
              >
                {gameOption && !isDiscussing && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ animation: 'lobby-scan 3s ease-in-out infinite' }} />
                )}
                <span className="material-symbols-outlined relative" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                <span className="relative">{isDiscussing ? '게임 진행 중...' : `${selectedGame.name} 시작!`}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* FOOTER                                                        */}
      {/* ============================================================ */}
      <footer className="mt-auto border-t py-10 px-6" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(10,12,22,0.5)' }}>
        <div className="max-w-[1200px] mx-auto flex justify-between items-center" style={{ color: '#64748b', fontSize: '14px' }}>
          <div className="flex items-center gap-2">
            <span style={{ color: 'white', fontWeight: 700 }}>AI Game Arena</span>
          </div>
          <span>&copy; 2026 Personai. AI와 함께하는 게임.</span>
        </div>
      </footer>

      {/* Profile Sheet Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowProfile(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl p-5 space-y-4 animate-in zoom-in-95 fade-in duration-300" style={{ background: 'rgba(15,17,30,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {/* Avatar + Name + Level */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 rounded-2xl bg-gradient-to-br from-[#0d33f2] to-indigo-600 flex items-center justify-center text-2xl font-black text-white">
                {playerLevel}
              </div>
              <h3 className="text-lg font-bold text-white">Player</h3>
              <p className="text-[11px] text-amber-400 font-semibold">{playerTitle}</p>
              <div className="mt-2 mx-auto max-w-[200px]">
                <div className="flex justify-between text-[9px] text-slate-500 mb-1">
                  <span>Lv.{playerLevel}</span>
                  <span>{playerXP % 1000}/1,000 XP</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-[#0d33f2] transition-all" style={{ width: `${(playerXP % 1000) / 10}%` }} />
                </div>
              </div>
            </div>

            {/* Radar Chart - SVG */}
            {(() => {
              const stats = JSON.parse(localStorage.getItem('game-ability-stats') || '{"logic":10,"creativity":10,"language":10,"psychology":10,"observation":10}');
              const labels = [{key:'logic',label:'논리력'},{key:'creativity',label:'창의력'},{key:'language',label:'언어력'},{key:'psychology',label:'심리전'},{key:'observation',label:'관찰력'}];
              const n = 5, cx = 80, cy = 80, r = 55;
              const angles = labels.map((_, i) => (Math.PI * 2 * i / n) - Math.PI / 2);
              const bgPoints = (s: number) => angles.map(a => `${cx + r * s * Math.cos(a)},${cy + r * s * Math.sin(a)}`).join(' ');
              const dataPoints = labels.map((l, i) => `${cx + r * (stats[l.key] / 100) * Math.cos(angles[i])},${cy + r * (stats[l.key] / 100) * Math.sin(angles[i])}`).join(' ');
              return (
                <svg viewBox="0 0 160 160" className="w-40 h-40 mx-auto">
                  {[0.25, 0.5, 0.75, 1].map(s => <polygon key={s} points={bgPoints(s)} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="0.5" />)}
                  {angles.map((a, i) => <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="rgba(148,163,184,0.08)" strokeWidth="0.5" />)}
                  <polygon points={dataPoints} fill="rgba(13,51,242,0.2)" stroke="#0d33f2" strokeWidth="1.5" />
                  {labels.map((l, i) => (
                    <text key={i} x={cx + (r + 14) * Math.cos(angles[i])} y={cy + (r + 14) * Math.sin(angles[i])} textAnchor="middle" dominantBaseline="middle" fill="#94A3B8" fontSize="8" fontWeight="600">{l.label}</text>
                  ))}
                </svg>
              );
            })()}

            {/* Stats summary */}
            <div className="flex justify-center gap-4 text-center">
              <div><div className="text-[16px] font-bold text-white">{records.length}</div><div className="text-[10px] text-slate-500">총 게임</div></div>
              <div><div className="text-[16px] font-bold text-emerald-400">{wins}</div><div className="text-[10px] text-slate-500">승리</div></div>
              <div><div className="text-[16px] font-bold text-amber-400">{winRate}%</div><div className="text-[10px] text-slate-500">승률</div></div>
            </div>

            {/* Achievements */}
            {(() => {
              const unlocked = JSON.parse(localStorage.getItem('game-achievements') || '[]');
              const allAchievements = [
                { id: 'first-win', icon: '🎯' }, { id: 'streak-3', icon: '🔥' },
                { id: 'brain-full', icon: '🧠' }, { id: 'speedrun', icon: '⚡' },
                { id: 'perfect-detective', icon: '🕵️' }, { id: 'mental-destroyer', icon: '💀' },
                { id: 'justice', icon: '⚖️' }, { id: 'hacker', icon: '🔐' },
                { id: 'identity-master', icon: '🎭' }, { id: 'grandmaster', icon: '👑' },
              ];
              return (
                <div>
                  <p className="text-[11px] text-slate-500 font-semibold mb-2">업적 ({unlocked.length}/{allAchievements.length})</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {allAchievements.map(a => (
                      <span key={a.id} className={cn("text-lg transition-all", unlocked.includes(a.id) ? '' : 'opacity-20 grayscale')}>{a.icon}</span>
                    ))}
                  </div>
                </div>
              );
            })()}

            <button onClick={() => setShowProfile(false)} className="w-full py-2 rounded-xl text-slate-300 text-[12px] font-semibold hover:bg-white/[0.06] transition-all" style={{ background: 'rgba(255,255,255,0.05)' }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );

}

// ── Assistant Cards Panel ──
function AssistantCardsPanel({ onSubmit, isDiscussing }: {
  onSubmit: (question: string) => void;
  isDiscussing: boolean;
}) {
  const [selectedCard, setSelectedCard] = useState<AssistantCard | null>(null);
  const [question, setQuestion] = useState('');

  const categoryColors: Record<string, string> = {
    study: 'bg-blue-50 text-blue-600',
    document: 'bg-emerald-50 text-emerald-600',
    creative: 'bg-orange-50 text-orange-600',
    productivity: 'bg-purple-50 text-purple-600',
    analysis: 'bg-pink-50 text-pink-600',
  };

  const categoryLabels: Record<string, string> = {
    study: '학습',
    document: '문서',
    creative: '창작',
    productivity: '생산성',
    analysis: '분석',
  };

  return (
    <div className="space-y-5">
      <p className="text-[12px] text-slate-500 text-center">목적에 맞는 어시스턴트를 선택하세요</p>

      {/* Cards grid — 4 per row, clean compact design */}
      <div className="grid grid-cols-4 gap-2.5">
        {ASSISTANT_CARDS.map(card => {
          const isSelected = selectedCard?.id === card.id;
          return (
            <button
              key={card.id}
              onClick={() => { setSelectedCard(isSelected ? null : card); setQuestion(''); }}
              className={cn(
                'relative text-left rounded-xl border transition-all duration-200 overflow-hidden group',
                isSelected
                  ? 'border-slate-700 bg-slate-900 shadow-lg ring-1 ring-slate-600'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
              )}
            >
              {/* Top accent */}
              <div className={cn('h-0.5', isSelected ? 'bg-gradient-to-r from-blue-400 to-purple-400' : `bg-gradient-to-r ${card.gradient}`)} />

              <div className="p-3">
                {/* Category */}
                <div className={cn('inline-flex text-[7px] font-bold px-1.5 py-0.5 rounded-full mb-2', isSelected ? 'bg-white/10 text-slate-400' : categoryColors[card.category])}>
                  {categoryLabels[card.category]}
                </div>

                {/* Icon */}
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-base mb-2', isSelected ? 'bg-white/10' : `bg-gradient-to-br ${card.gradient}`)}>
                  {card.icon}
                </div>

                {/* Title */}
                <h3 className={cn('text-[11px] font-bold leading-tight', isSelected ? 'text-white' : 'text-slate-800')}>{card.name}</h3>
                <p className={cn('text-[9px] mt-0.5 leading-snug line-clamp-2', isSelected ? 'text-slate-400' : 'text-slate-500')}>{card.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Input area */}
      {selectedCard && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className={cn('px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-gradient-to-r', selectedCard.gradient, 'bg-opacity-30')}>
            <div className="w-9 h-9 rounded-lg bg-white/80 flex items-center justify-center text-lg shadow-sm">
              {selectedCard.icon}
            </div>
            <div>
              <p className="text-[12px] font-bold text-slate-800">{selectedCard.name}</p>
              <div className="flex gap-1 mt-0.5">
                {selectedCard.features.map((f, i) => (
                  <span key={i} className="text-[8px] bg-white/60 text-slate-600 px-1.5 py-0.5 rounded-full border border-slate-200/50">{f}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="flex gap-2">
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && question.trim()) onSubmit(question); }}
                placeholder={selectedCard.placeholder}
                disabled={isDiscussing}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-[12px] outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all bg-slate-50/50"
              />
              <button
                onClick={() => question.trim() && onSubmit(question)}
                disabled={!question.trim() || isDiscussing}
                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-[12px] font-semibold hover:bg-slate-800 disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-sm"
              >
                시작 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// ── Main ExpertSelectionPanel ──
// ══════════════════════════════════════════
export function ExpertSelectionPanel({
  experts, selectedIds, onToggle, discussionMode, onModeChange, isDiscussing,
  onSubmit, proconStances = {}, onProconStancesChange,
  debateSettings, onDebateSettingsChange, showDebateSettings,
  selectedFramework, onFrameworkChange,
  discussionIssues = [], onDiscussionIssuesChange,
  debateIntensity = 'moderate', onDebateIntensityChange,
  onBulkSelect,
  onSampleQuestionClick,
  onStartGame,
  stakeholderSettings,
  onStakeholderSettingsChange,
}: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('ai');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('전체');
  const isProcon = discussionMode === 'procon';
  const [proconAssignMode, setProconAssignMode] = useState<'manual' | 'auto'>('manual');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<'pro' | 'con' | null>(null);
  const [hintId, setHintId] = useState<string | null>(null);
  const [maxLimitMsg, setMaxLimitMsg] = useState<string | null>(null);
  const [selectedExpertModeTemplate, setSelectedExpertModeTemplate] = useState<ExpertModeTemplate | null>(null);
  const [autoAssign, setAutoAssign] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      setTipPos({ x: rect.left + rect.width / 2, y: rect.top });
    }, delay);
  }, [hoveredExpert]);
  const hideTip = useCallback(() => {
    if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
    setHoveredExpert(null);
    setTipPos(null);
  }, []);

  const MAX_PER_ZONE = 3;
  const mainMode = getMainMode(discussionMode);

  // 자동 배정: 질문 키워드 기반 적합한 전문가 선택
  const autoPickExperts = (question: string): string[] => {
    const q = question.toLowerCase();
    const score = (e: Expert) => {
      let s = 0;
      const desc = (e.description + ' ' + e.nameKo + ' ' + e.name).toLowerCase();
      // 키워드 매칭
      if (/의학|건강|병|질병|증상|치료|약|의사/.test(q) && /의|medical|health|doctor/.test(desc)) s += 3;
      if (/법|소송|계약|판례|변호사|법률/.test(q) && /법|legal|law/.test(desc)) s += 3;
      if (/투자|주식|금융|경제|재무|돈|펀드/.test(q) && /금융|투자|finance|invest/.test(desc)) s += 3;
      if (/코드|개발|프로그래밍|소프트웨어|버그/.test(q) && /코딩|개발|code|program/.test(desc)) s += 3;
      if (/심리|정신|상담|스트레스|우울/.test(q) && /심리|psycho/.test(desc)) s += 3;
      if (/교육|학습|공부|시험|학교/.test(q) && /교|teacher|education/.test(desc)) s += 3;
      if (/역사|전쟁|문명|고대/.test(q) && /역사|history/.test(desc)) s += 3;
      if (/철학|윤리|도덕|존재/.test(q) && /철학|philosophy|ethic/.test(desc)) s += 3;
      if (/부동산|집|아파트|전세|매매/.test(q) && /부동산|real estate/.test(desc)) s += 3;
      if (/창업|사업|스타트업|비즈니스/.test(q) && /창업|사업|startup|business/.test(desc)) s += 3;
      if (/예술|디자인|음악|미술/.test(q) && /예술|art|design|creative/.test(desc)) s += 3;
      if (/과학|연구|실험|물리|화학/.test(q) && /과학|science|research/.test(desc)) s += 3;
      if (/ai|인공지능|기술|미래/.test(q) && e.category === 'ai') s += 2;
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
    // 약간의 딜레이 후 제출 (state 업데이트 반영)
    setTimeout(() => onSubmit(question), 50);
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
        ? '2명 이상 선택 후 질문하면 토론을 거쳐 최종 결론을 도출합니다'
        : mainMode === 'stakeholder_main'
          ? '이해관계자 역할을 배정하고 시나리오를 시뮬레이션합니다'
          : mainMode === 'brainstorm_main'
            ? '사고 프레임워크를 선택하면 AI들이 협업해 정리된 결과를 제공합니다'
            : mainMode === 'expert'
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

  const POPULAR_IDS = ['gpt', 'claude', 'gemini', 'doctor', 'lawyer', 'pilot', 'italian', 'fire', 'newlywed', 'conspiracy', 'optimist', 'lincoln', 'christian', 'capitalist', 'sherlock', 'zeus'];
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
    { cat: 'popular', label: '인기', items: POPULAR_IDS.map(id => experts.find(e => e.id === id)).filter(Boolean) as typeof experts },
    { cat: 'favorites', label: '즐겨찾기', items: favoriteItems },
    ...visibleCategories.map(cat => ({
      cat: cat as string,
      label: EXPERT_CATEGORY_LABELS[cat as ExpertCategory],
      items: experts.filter(e => e.category === cat),
    })),
  ].filter(g => g.items.length > 0 || g.cat === 'favorites');

  const validCats = grouped.map(g => g.cat);
  const aiBlocked = isStandardOrProcon && activeCategory === 'ai';
  const effectiveCategory = aiBlocked
    ? (validCats.find(c => c === 'specialist') || validCats[0] || 'ai')
    : (validCats.includes(activeCategory) ? activeCategory : validCats[0] || 'ai');

  const applyModeChange = (m: MainMode) => {
    setAutoAssign(false);
    if (m === 'general') onModeChange('general');
    else if (m === 'multi') onModeChange('multi');
    else if (m === 'brainstorm_main') onModeChange('brainstorm');
    else if (m === 'stakeholder_main') onModeChange('stakeholder');
    else if (m === 'expert') onModeChange('expert');
    else if (m === 'assistant') onModeChange('assistant');
    else if (m === 'player') onModeChange('player');
    else onModeChange('procon');
  };

  const handleMainModeChange = (m: MainMode) => {
    if (m === mainMode || transitionPhase !== 0) return;
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
        }, 250);
      }, 200);
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

  return (
    <div className={cn("space-y-3 relative transition-all duration-500", isPlayerActive ? 'py-1' : 'py-4')}>
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
          : !contentVisible ? 'opacity-0 scale-[0.98] max-h-32 space-y-2 duration-200'
          : 'opacity-100 scale-100 max-h-32 py-0 space-y-2 duration-300',
        isLeavingPlayer && transitionPhase >= 2 && 'opacity-100 max-h-32 space-y-2'
      )}>
        <h2 key={mainMode} className="text-xl sm:text-2xl font-bold text-foreground tracking-tight animate-in fade-in duration-700">
          {mainMode === 'general' ? '모든 AI 챗봇을 한 곳에서 원하는 대로 골라 쓰세요'
            : mainMode === 'multi' ? '하나의 질문을 여러 AI에게 동시에 물어보세요'
              : mainMode === 'debate' ? 'AI들이 다각도로 토론하고 결론을 냅니다'
                : mainMode === 'stakeholder_main' ? '이해관계자 역할극으로 아이디어를 검증하세요'
                  : mainMode === 'brainstorm_main' ? 'AI들이 협업해 아이디어를 정리해드립니다'
                    : mainMode === 'expert' ? '분야별 전문가 팀이 단계별 맞춤 상담을 제공합니다'
                      : mainMode === 'assistant' ? '작업을 도와주는 AI 어시스턴트'
                        : mainMode === 'player' ? 'AI와 함께 즐기는 게임·퀴즈·놀이'
                          : ''}
        </h2>
        <div className="relative flex justify-center">
          <span className="invisible text-[12px] leading-relaxed">{subtitleText}</span>
          <span className="absolute inset-0 flex items-center justify-center text-[12px] text-muted-foreground leading-relaxed">
            {typedSubtitle}
            {typedSubtitle.length < subtitleText.length && <span className="animate-pulse text-muted-foreground/40">|</span>}
          </span>
        </div>
      </div>

      {/* Main Mode Tabs — 플레이어 모드에서는 숨김 (GAME ARENA 자체 헤더 사용) */}
      <div className={cn(
        "flex flex-col items-center relative z-20 transition-all duration-500 overflow-hidden",
        isPlayerActive && !isLeavingPlayer ? 'max-h-0 opacity-0 mb-0' : 'max-h-24 opacity-100',
        isGoingToPlayer && transitionPhase >= 1 ? 'max-h-0 opacity-0' : '',
      )}>
        <div className={cn(
          'flex flex-col shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-all duration-500 ease-out',
          showPlayerBg
            ? 'bg-slate-900 border border-slate-700'
            : 'bg-white border border-slate-200',
          'rounded-full p-[3px]'
        )}>
          <div className="flex items-center gap-[3px]">
            {mainModes.map(m => {
              const isActive = mainMode === m || pendingMode === m;
              return (
                <button key={m} onClick={() => handleMainModeChange(m)} disabled={isDiscussing || transitionPhase !== 0}
                  className={cn(
                    'flex items-center justify-center gap-1 min-w-0 px-3 py-[2px] rounded-full text-[11px] tracking-tight transition-all duration-300',
                    isActive && m === 'player'
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold shadow-lg shadow-purple-500/25'
                      : isActive ? 'bg-indigo-500 text-white font-semibold shadow-sm'
                        : showPlayerBg ? 'text-slate-400 font-medium hover:text-slate-200' : 'text-slate-600 font-medium hover:text-slate-900'
                  )}>
                  {mainModeLabels[m]}
                </button>
              );
            })}
          </div>

          {/* 서브 탭 제거됨 — 설정 패널 헤더에서 전환 */}

          {/* Quick settings bar */}
          {mainMode === 'debate' && showDebateSettings && debateSettings && onDebateSettingsChange && (
            <div className="flex items-center gap-3 pt-[4px] mt-[2px] px-3 pb-[4px] border-t border-slate-200 animate-in fade-in duration-150">
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide shrink-0">설정</span>
              <div className="flex items-center gap-0.5">
                {(['short', 'medium', 'long'] as const).map(v => (
                  <button key={v} onClick={() => onDebateSettingsChange({ ...debateSettings, responseLength: v })} disabled={isDiscussing}
                    className={cn('px-2 py-[1px] rounded-full text-[10px] font-medium transition-all duration-150', debateSettings.responseLength === v ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100')}>
                    {v === 'short' ? '짧게' : v === 'medium' ? '보통' : '길게'}
                  </button>
                ))}
              </div>
              <div className="w-px h-3 bg-slate-200 shrink-0" />
              {discussionMode !== 'procon' && discussionMode !== 'brainstorm' && (
                <>
                  <div className="flex items-center gap-0.5">
                    {([2, 3, 4] as const).map(v => (
                      <button key={v} onClick={() => onDebateSettingsChange({ ...debateSettings, rounds: v })} disabled={isDiscussing}
                        className={cn('px-2 py-[1px] rounded-full text-[10px] font-medium transition-all duration-150', debateSettings.rounds === v ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100')}>
                        {v}R
                      </button>
                    ))}
                  </div>
                  <div className="w-px h-3 bg-slate-200 shrink-0" />
                </>
              )}
              <button onClick={() => onDebateSettingsChange({ ...debateSettings, includeConclusion: !debateSettings.includeConclusion })} disabled={isDiscussing}
                className={cn('px-2 py-[1px] rounded-full text-[10px] font-medium transition-all duration-150 flex items-center gap-1',
                  debateSettings.includeConclusion ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100')}>
                <span>결론</span>
                <span className="opacity-70">{debateSettings.includeConclusion ? '포함' : '제외'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content transition wrapper — fades content when switching modes */}
      <div className={cn(
        "space-y-3 transition-all ease-out relative z-20",
        !contentVisible ? 'opacity-0 scale-[0.97] translate-y-2 duration-200' : 'opacity-100 scale-100 translate-y-0 duration-400'
      )}>

      {/* ── Expert Mode ── */}
      {(mainMode === 'expert' || selectedExpertModeTemplate) && (
        <ExpertModePanel
          onSelectTemplate={setSelectedExpertModeTemplate}
          selectedTemplate={selectedExpertModeTemplate}
          onSubmit={onSubmit}
          isDiscussing={isDiscussing}
          showCardsGrid={mainMode === 'expert'}
          onSimStart={(scenarioId) => {
            if (onStakeholderSettingsChange) {
              onStakeholderSettingsChange({ ...DEFAULT_STAKEHOLDER_SETTINGS, scenarioId });
              if (onModeChange) onModeChange('stakeholder');
              // overrideMode로 직접 stakeholder 전달
              setTimeout(() => onSubmit('__SIM_START__', undefined, 'stakeholder' as any), 200);
            }
          }}
        />
      )}

      {/* ── Assistant Mode ── */}
      {mainMode === 'assistant' && (
        <AssistantCardsPanel onSubmit={onSubmit} isDiscussing={isDiscussing} />
      )}

      {/* ── Player Mode (Game Lobby) ── */}
      {mainMode === 'player' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out fill-mode-both">
          <PlayerLobby onSubmit={onSubmit} isDiscussing={isDiscussing} onStartGame={onStartGame} onBackToHub={() => handleMainModeChange('general')} />
        </div>
      )}

      {/* ── Expert Selection Grid (general / multi / debate) ── */}
      {showExpertGrid && (
        <div className={cn('border border-slate-200 rounded-xl bg-white overflow-visible shadow-[0_2px_12px_rgba(0,0,0,0.07)] transition-all duration-200 relative',
          autoAssign && 'opacity-50'
        )} onClick={() => { if (autoAssign) setAutoAssign(false); }}>
          {/* Category tabs / Search */}
          <div className="flex flex-col bg-slate-50 border-b-2 border-slate-200 overflow-visible relative z-20">
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
                    {grouped.filter(g => !['celebrity', 'ideology', 'region', 'mythology'].includes(g.cat)).map(({ cat, label }) => {
                      const isActive = effectiveCategory === cat;
                      const isAiTab = cat === 'ai';
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
                      const moreCats = grouped.filter(g => ['region', 'ideology', 'celebrity', 'mythology'].includes(g.cat));
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
            return (
              <div key={cat} className="relative bg-white">
                <div className="px-4 pt-3 pb-3 max-h-[160px] overflow-y-auto scrollbar-thin">
                {filtered.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-[12px] text-slate-400">{searchMode ? `"${searchQuery}"에 대한 검색 결과가 없습니다` : '이 카테고리에 전문가가 없습니다'}</p>
                  </div>
                ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-x-1 gap-y-2">
                  {filtered.map(expert => {
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
                          <button type="button" onClick={(e) => { e.stopPropagation(); toggleFavorite(expert.id); }}
                            className={cn('absolute top-0 left-0 w-5 h-5 flex items-center justify-center text-[14px] opacity-0 group-hover:opacity-100 transition-opacity z-10',
                              favoriteIds.includes(expert.id) ? 'opacity-100 text-amber-400' : 'text-slate-300 hover:text-amber-400')}>
                            {favoriteIds.includes(expert.id) ? '★' : '☆'}
                          </button>
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
        />
      )}

      {isBrainstorm && (
        <BrainstormSettingsPanel
          selectedIds={selectedIds} experts={experts}
          selectedFramework={selectedFramework} onFrameworkChange={onFrameworkChange}
          debateSettings={debateSettings} onDebateSettingsChange={onDebateSettingsChange}
          autoAssign={autoAssign} onAutoAssignChange={(v: boolean) => { setAutoAssign(v); if (v && onBulkSelect) onBulkSelect([]); }}
          onToggle={onToggle}
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
        />
      )}

      {discussionMode === 'aivsuser' && (
        <AIvsUserSettingsPanel
          experts={experts}
          selectedIds={selectedIds}
          debateSettings={debateSettings}
          onDebateSettingsChange={onDebateSettingsChange}
          onToggle={onToggle}
          onModeChange={onModeChange}
        />
      )}

      {isStakeholder && stakeholderSettings && onStakeholderSettingsChange && (
        <SimulationModePanel
          experts={experts}
          settings={stakeholderSettings}
          onSettingsChange={onStakeholderSettingsChange}
          onSubmit={onSubmit}
          isDiscussing={isDiscussing}
          onSelectExpertTemplate={setSelectedExpertModeTemplate}
        />
      )}

      {/* Question Input — not shown for expert/assistant/player (they have their own inputs) */}
      {mainMode !== 'expert' && mainMode !== 'assistant' && mainMode !== 'player' && mainMode !== 'stakeholder_main' && (
        <QuestionInput
          onSubmit={autoAssign && supportsAutoAssign ? handleAutoSubmit : onSubmit}
          disabled={isDiscussing || (!autoAssign && selectedIds.length < 1) || (discussionMode === 'multi' && selectedIds.length < 2) || (discussionMode === 'procon' && !autoAssign && (!Object.values(proconStances).includes('pro') || !Object.values(proconStances).includes('con')))}
          discussionMode={discussionMode}
          selectedExperts={
            (isProcon || discussionMode === 'standard' || isBrainstorm || isHearing || isStakeholder || discussionMode === 'freetalk')
              ? [] : experts.filter(e => selectedIds.includes(e.id))
          }
          onRemoveExpert={isGeneral || isProcon ? undefined : onToggle}
        />
      )}

      </div>{/* end content transition wrapper */}

      {/* Portal 기반 플로팅 툴팁 — overflow 영향 안 받음 */}
      {hoveredExpert && tipPos && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: `clamp(8px, ${tipPos.x}px, calc(100vw - 8px))`,
            top: `${tipPos.y - 8}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out">
          <div className="bg-gradient-to-b from-slate-800 to-slate-900 text-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.35)] w-48 overflow-hidden border border-white/[0.06]">
            <div className="px-2.5 pt-2 pb-1 text-center">
              <p className="text-[12px] font-bold tracking-tight leading-tight">{hoveredExpert.nameKo}</p>
            </div>
            {/* 액센트 라인 — 이름 아래 */}
            <div className={cn('h-[3px] mx-2 mb-1 rounded-full', {
              'bg-gradient-to-r from-blue-400 via-blue-300 to-blue-400': hoveredExpert.color === 'blue',
              'bg-gradient-to-r from-emerald-400 via-green-300 to-emerald-400': hoveredExpert.color === 'emerald',
              'bg-gradient-to-r from-red-400 via-rose-300 to-red-400': hoveredExpert.color === 'red',
              'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400': hoveredExpert.color === 'amber',
              'bg-gradient-to-r from-purple-400 via-violet-300 to-purple-400': hoveredExpert.color === 'purple',
              'bg-gradient-to-r from-orange-400 via-orange-300 to-orange-400': hoveredExpert.color === 'orange',
              'bg-gradient-to-r from-teal-400 via-teal-300 to-teal-400': hoveredExpert.color === 'teal',
              'bg-gradient-to-r from-pink-400 via-pink-300 to-pink-400': hoveredExpert.color === 'pink',
            })} />
            <div className="px-2.5 pt-0 pb-1.5 text-center">
              <p className="text-[8.5px] text-slate-300 mt-0.5 leading-tight">{hoveredExpert.description}</p>
              {hoveredExpert.quote && (
                <p className="text-[8px] text-amber-400/80 font-medium mt-0.5 leading-tight">"{hoveredExpert.quote}"</p>
              )}
            </div>
            {hoveredExpert.sampleQuestions && hoveredExpert.sampleQuestions.length > 0 && (
              <div className="mx-2 mb-2 mt-1 relative">
                <div className="rounded border-[1.5px] border-white/20 pt-2 pb-1.5 px-2">
                <span className="absolute -top-[5px] left-1/2 -translate-x-1/2 px-1.5 text-[7px] text-slate-400 tracking-wider font-medium" style={{ backgroundColor: '#1a2030' }}>추천 질문</span>
                  {hoveredExpert.sampleQuestions.map((q, qi) => (
                    <p key={qi} className="text-[8px] text-slate-300 text-center leading-normal py-[2.5px]">
                      {q}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* 화살표 */}
          <div className="flex justify-center">
            <div className="w-2.5 h-2.5 bg-slate-900 rotate-45 -mt-[5px] border-r border-b border-white/[0.06]" />
          </div>
        </div>
        </div>,
        document.body
      )}
    </div>
  );
}
