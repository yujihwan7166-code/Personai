import { useState, useEffect, useRef } from 'react';
import {
  Expert, ExpertCategory, EXPERT_CATEGORY_LABELS, EXPERT_CATEGORY_ORDER,
  EXPERT_SUB_CATEGORIES, DiscussionMode, MainMode, DebateSubMode,
  DEBATE_SUB_MODE_LABELS, getMainMode, DebateSettings, COLLABORATION_TEAMS,
  CollaborationTeam, THINKING_FRAMEWORKS, ThinkingFramework, DiscussionIssue,
  EXPERT_MODE_TEMPLATES, ExpertModeTemplate, ASSISTANT_CARDS, AssistantCard,
} from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { QuestionInput } from './QuestionInput';
import { cn } from '@/lib/utils';
import {
  Brain, TrendingUp, Sparkles, HelpCircle, Target, Scale, Lightbulb,
  Users, Plus, X, Pencil, Check, ChevronRight, ArrowRight, Star, Zap,
  Clock, FileText, BookOpen, Presentation, Globe, Code, BarChart3,
  PenTool, Search, Filter, Sliders, ToggleLeft, ToggleRight,
} from 'lucide-react';

export interface SuggestedQuestion {
  icon: React.ReactNode;
  text: string;
  color: string;
  expertIds: string[];
  mode: DiscussionMode;
}

export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { icon: <Brain className="w-4 h-4" />, text: 'AI가 인간의 일자리를 대체할까요?', color: 'text-foreground', expertIds: ['gpt', 'claude', 'engineer', 'programmer', 'buffett'], mode: 'standard' },
  { icon: <TrendingUp className="w-4 h-4" />, text: '2026년 투자 전략은 어떻게 세워야 할까요?', color: 'text-foreground', expertIds: ['buffett', 'dalio', 'finance', 'accountant'], mode: 'multi' },
  { icon: <Sparkles className="w-4 h-4" />, text: '창의력을 키우는 가장 효과적인 방법은?', color: 'text-foreground', expertIds: ['gemini', 'psychology', 'teacher', 'artist', 'jobs'], mode: 'brainstorm' },
  { icon: <HelpCircle className="w-4 h-4" />, text: '건강한 식단의 핵심 원칙은 무엇인가요?', color: 'text-foreground', expertIds: ['medical', 'doctor', 'nurse', 'chef'], mode: 'multi' },
];

export type ProconStance = 'pro' | 'con';

interface Props {
  experts: Expert[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  discussionMode: DiscussionMode;
  onModeChange: (mode: DiscussionMode) => void;
  isDiscussing: boolean;
  onSuggestedQuestion?: (question: string, expertIds: string[], mode: DiscussionMode) => void;
  onSubmit: (question: string) => void;
  proconStances?: Record<string, ProconStance>;
  onProconStancesChange?: (stances: Record<string, ProconStance>) => void;
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
  showDebateSettings?: boolean;
  selectedCollaborationTeam?: CollaborationTeam | null;
  onCollaborationTeamChange?: (team: CollaborationTeam | null) => void;
  collaborationRoles?: Record<string, string>;
  onCollaborationRolesChange?: (roles: Record<string, string>) => void;
  selectedFramework?: ThinkingFramework | null;
  onFrameworkChange?: (fw: ThinkingFramework | null) => void;
  discussionIssues?: DiscussionIssue[];
  onDiscussionIssuesChange?: (issues: DiscussionIssue[]) => void;
  debateIntensity?: string;
  onDebateIntensityChange?: (v: string) => void;
  collaborationMission?: string;
  onCollaborationMissionChange?: (v: string) => void;
}

const mainModes: MainMode[] = ['general', 'multi', 'expert', 'debate', 'assistant'];
const debateSubModes: DebateSubMode[] = ['standard', 'procon', 'brainstorm', 'redteam'];

const mainModeLabels: Record<MainMode, string> = {
  general: '단일 AI',
  multi: '다중 AI',
  expert: '전문가 모드',
  debate: '라운드테이블',
  assistant: '어시스턴트',
};

const debateSubIcons: Record<DebateSubMode, React.ReactNode> = {
  standard: <Target className="w-3 h-3" />,
  procon: <Scale className="w-3 h-3" />,
  brainstorm: <Lightbulb className="w-3 h-3" />,
  redteam: <Target className="w-3 h-3" />,
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
        'relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0',
        checked ? 'bg-slate-800' : 'bg-slate-200'
      )}
    >
      <span className={cn(
        'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200',
        checked ? 'translate-x-4' : 'translate-x-0.5'
      )} />
    </button>
  );
}

// ── Issue Editor (심층토론) ──
const ISSUE_TEMPLATES = ['경제적 영향', '윤리적 쟁점', '기술적 타당성', '사회적 합의', '법률적 문제', '환경적 영향', '실현 가능성', '장기적 영향'];

function StandardSettingsPanel({ issues, onIssuesChange, debateSettings, onDebateSettingsChange, selectedExperts }: {
  issues: DiscussionIssue[];
  onIssuesChange?: (issues: DiscussionIssue[]) => void;
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
  selectedExperts: Expert[];
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
    <div className="border border-slate-200 rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="text-[13px] font-bold text-slate-700">심층 토론 설정</div>
      </div>
      <div className="p-4 space-y-4">
        {/* Debaters */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600">토론자</span>
            {selectedExperts.length < 2
              ? <span className="text-[10px] text-amber-500 font-medium">2명 이상 선택해주세요</span>
              : <span className="text-[10px] text-slate-400">{selectedExperts.length}명 참여</span>}
          </div>
          {selectedExperts.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedExperts.map(e => (
                <div key={e.id} className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                  <div className="w-5 h-5 scale-[0.6] origin-center"><ExpertAvatar expert={e} size="sm" /></div>
                  <span className="text-[11px] font-medium text-slate-700">{e.nameKo}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-3 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
              <p className="text-[11px] text-slate-400">위에서 토론에 참여할 전문가를 선택하세요</p>
            </div>
          )}
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
              <span className="text-[10px] font-bold text-slate-500 w-16 shrink-0">답변 길이</span>
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
              <span className="text-[10px] font-bold text-slate-500 w-16 shrink-0">라운드</span>
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
function ProconSettingsPanel({ experts, proconStances, dragOver, draggedId, setDragOver, setDraggedId, assignStance, removeStance, MAX_PER_ZONE, debateSettings, onDebateSettingsChange }: {
  experts: Expert[];
  proconStances: Record<string, 'pro' | 'con'>;
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

  const roundsEnabled = ds.debateFormat === 'alternating';

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="text-[13px] font-bold text-slate-700">찬반 토론 설정</div>
      </div>
      <div className="p-4 space-y-4">
        {/* Drag zones */}
        <div>
          <div className="text-[11px] font-bold text-slate-600 mb-2.5">진영 배정 <span className="font-normal text-slate-400">— 위에서 전문가를 드래그하세요</span></div>
          <div className="grid grid-cols-2 gap-3">
            {(['pro', 'con'] as const).map(zone => {
              const isOver = dragOver === zone;
              const assigned = Object.keys(proconStances).filter(id => proconStances[id] === zone);
              const isFull = assigned.length >= MAX_PER_ZONE;
              const isPro = zone === 'pro';
              const canDrop = !isFull || (draggedId ? proconStances[draggedId] === zone : false);
              const slotCount = isPro ? effectiveProSlots : effectiveConSlots;
              const slots = Array.from({ length: slotCount }, (_, i) => assigned[i] || null);
              const canAddSlot = slotCount < MAX_PER_ZONE;
              return (
                <div key={zone} onDragOver={e => { e.preventDefault(); setDragOver(zone); }} onDragLeave={() => setDragOver(null)}
                  onDrop={() => { if (draggedId) assignStance(draggedId, zone); setDragOver(null); setDraggedId(null); }}
                  className={cn('rounded-xl border transition-all duration-150 overflow-hidden',
                    isOver && canDrop ? isPro ? 'border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]' : 'border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                      : isOver && !canDrop ? 'border-slate-300' : isPro ? 'border-blue-200' : 'border-red-200')}>
                  <div className={cn('px-3 py-2 flex items-center justify-between', isPro ? 'bg-blue-50' : 'bg-red-50')}>
                    <span className={cn('text-[12px] font-bold', isPro ? 'text-blue-600' : 'text-red-600')}>{isPro ? '찬성' : '반대'}</span>
                    <span className={cn('text-[10px] font-medium', isPro ? 'text-blue-400' : 'text-red-400')}>{assigned.length}/{MAX_PER_ZONE}</span>
                  </div>
                  <div className="px-3 py-2 space-y-1.5 bg-white">
                    {slots.map((id, i) => {
                      const e = id ? experts.find(x => x.id === id) : null;
                      return e ? (
                        <div key={id} draggable onDragStart={() => setDraggedId(id!)} onDragEnd={() => setDraggedId(null)}
                          className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing', isPro ? 'bg-blue-50 hover:bg-blue-100' : 'bg-red-50 hover:bg-red-100')}>
                          <ExpertAvatar expert={e} size="sm" />
                          <span className={cn('text-[11px] font-semibold flex-1', isPro ? 'text-blue-700' : 'text-red-700')}>{e.nameKo}</span>
                          <button type="button" onClick={() => removeStance(id!)} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <div key={`empty-${i}`} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-dashed border-slate-200">
                          <div className="w-7 h-7 rounded-full bg-slate-100 shrink-0" />
                          <span className="text-[10px] text-slate-300">드래그</span>
                        </div>
                      );
                    })}
                    {canAddSlot && (
                      <button type="button"
                        onClick={() => isPro ? setProSlotCount(p => Math.min(p + 1, MAX_PER_ZONE)) : setConSlotCount(p => Math.min(p + 1, MAX_PER_ZONE))}
                        className="w-full flex items-center justify-center gap-1 py-1 rounded-lg text-[9px] text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                        <Plus className="w-3 h-3" /> 슬롯 추가
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">진행 방식</p>
              <div className="space-y-2.5">
                {/* 형식 */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold text-slate-600 w-12 shrink-0">형식</span>
                  <div className="flex gap-1 flex-1">
                    {[{ id: 'alternating' as const, label: '교대 발언' }, { id: 'free' as const, label: '자유 토론' }, { id: 'opening-rebuttal' as const, label: '오프닝+반론' }].map(opt => (
                      <button key={opt.id} onClick={() => update({ debateFormat: opt.id })}
                        className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-semibold text-center transition-all', ds.debateFormat === opt.id ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-slate-400')}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 라운드 — 교대 발언일 때만 활성화 */}
                <div className="flex items-center gap-3">
                  <span className={cn('text-[10px] font-semibold w-12 shrink-0 transition-colors', roundsEnabled ? 'text-slate-600' : 'text-slate-300')}>라운드</span>
                  <div className="flex gap-1 flex-1">
                    {([2, 3, 4, 5] as const).map(v => (
                      <button key={v} onClick={() => roundsEnabled && update({ rounds: v })} disabled={!roundsEnabled}
                        className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-semibold text-center transition-all',
                          !roundsEnabled ? 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                            : ds.rounds === v ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-slate-400')}>
                        {v}R
                      </button>
                    ))}
                  </div>
                  {!roundsEnabled && <span className="text-[9px] text-slate-300 shrink-0">교대 발언 선택 시 활성화</span>}
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

            {/* Section 3: 추가 옵션 */}
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">추가 옵션</p>
              <div className="space-y-2.5">
                {[
                  { key: 'includeRebuttal' as const, label: '반론 포함', desc: '상대 주장에 직접 반박하는 라운드 추가' },
                  { key: 'showSources' as const, label: '근거 출처 표시', desc: '주장마다 참고 근거나 예시 명시' },
                  { key: 'allowEmotional' as const, label: '감정적 호소 허용', desc: '논리 외 감성적 언어 사용 허용' },
                  { key: 'includeConclusion' as const, label: '승패 판정', desc: 'AI가 토론 종료 후 승패를 판정' },
                ].map(opt => (
                  <div key={opt.key} className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-slate-700">{opt.label}</p>
                      <p className="text-[9px] text-slate-400">{opt.desc}</p>
                    </div>
                    <Toggle checked={ds[opt.key] as boolean} onChange={v => update({ [opt.key]: v })} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Brainstorm Settings Panel — 재설계 ──
function BrainstormSettingsPanel({ selectedIds, experts, selectedFramework, onFrameworkChange, debateSettings, onDebateSettingsChange }: {
  selectedIds: string[];
  experts: Expert[];
  selectedFramework?: ThinkingFramework | null;
  onFrameworkChange?: (fw: ThinkingFramework | null) => void;
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const ds = debateSettings!;
  const update = (patch: Partial<DebateSettings>) => onDebateSettingsChange?.({ ...ds, ...patch });

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="text-[13px] font-bold text-slate-700">브레인스토밍 설정</div>
      </div>
      <div className="p-4 space-y-4">
        {/* Participants */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600">참여자</span>
            {selectedIds.length < 2
              ? <span className="text-[10px] text-amber-500 font-medium">2명 이상 선택해주세요</span>
              : <span className="text-[10px] text-slate-400">{selectedIds.length}명 참여</span>}
          </div>
          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedIds.map(id => {
                const e = experts.find(x => x.id === id);
                return e ? (
                  <div key={id} className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                    <div className="w-5 h-5 scale-[0.6] origin-center"><ExpertAvatar expert={e} size="sm" /></div>
                    <span className="text-[11px] font-medium text-slate-700">{e.nameKo}</span>
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            <div className="py-3 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
              <p className="text-[11px] text-slate-400">위에서 참여할 전문가/AI를 선택하세요</p>
            </div>
          )}
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
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-52 p-3 rounded-xl bg-slate-800 text-white text-[10px] leading-relaxed shadow-xl opacity-0 invisible group-hover/fw:opacity-100 group-hover/fw:visible transition-all duration-200 z-50 pointer-events-none">
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

        {/* Detail settings */}
        <button onClick={() => setShowDetail(!showDetail)}
          className="flex items-center gap-1.5 py-1.5 px-1 text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-all">
          <Sliders className="w-3 h-3" /> 세부 설정 {showDetail ? '접기 ▲' : '펼치기 ▼'}
        </button>

        {showDetail && debateSettings && onDebateSettingsChange && (
          <div className="rounded-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="px-4 py-3 space-y-2.5">
              {/* 아이디어 형식 */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold text-slate-600 w-16 shrink-0">아이디어 형식</span>
                <div className="flex gap-1 flex-1 flex-wrap">
                  {[{ id: 'list' as const, label: '리스트', icon: '≡' }, { id: 'mindmap' as const, label: '마인드맵', icon: '✦' }, { id: 'table' as const, label: '표 형식', icon: '⊞' }, { id: 'free' as const, label: '자유 서술', icon: '✐' }].map(opt => (
                    <button key={opt.id} onClick={() => update({ ideaFormat: opt.id })}
                      className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all', ds.ideaFormat === opt.id ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-slate-400')}>
                      <span>{opt.icon}</span>{opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* 창의성 수준 */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold text-slate-600 w-16 shrink-0">창의성 수준</span>
                <div className="flex gap-1 flex-1">
                  {[{ id: 'realistic' as const, label: '현실적' }, { id: 'balanced' as const, label: '균형' }, { id: 'radical' as const, label: '파격적' }].map(opt => (
                    <button key={opt.id} onClick={() => update({ creativityLevel: opt.id })}
                      className={cn('flex-1 py-1.5 rounded-lg text-[10px] font-semibold text-center transition-all', ds.creativityLevel === opt.id ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-slate-400')}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* 아이디어 수량 */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-semibold text-slate-600 w-16 shrink-0">아이디어 수</span>
                <input type="range" min={5} max={30} step={5} value={ds.ideaCount}
                  onChange={e => update({ ideaCount: Number(e.target.value) })}
                  className="flex-1 h-1.5 rounded-full accent-slate-800" />
                <span className="text-[10px] font-bold text-slate-600 w-8 text-right shrink-0">{ds.ideaCount}개</span>
              </div>
              {/* 중복 필터링 */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-slate-700">중복 필터링</p>
                  <p className="text-[9px] text-slate-400">유사한 아이디어 자동 제거</p>
                </div>
                <Toggle checked={ds.deduplication} onChange={v => update({ deduplication: v })} />
              </div>
              {/* 결론 정리 */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-slate-700">최종 정리 포함</p>
                  <p className="text-[9px] text-slate-400">아이디어를 종합한 결론 생성</p>
                </div>
                <Toggle checked={ds.includeConclusion} onChange={v => update({ includeConclusion: v })} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Red Team Challenge Settings ──
function RedteamSettingsPanel({ experts, selectedIds, debateSettings, onDebateSettingsChange }: {
  experts: Expert[];
  selectedIds: string[];
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
}) {
  const ds = debateSettings!;
  const update = (patch: Partial<DebateSettings>) => onDebateSettingsChange?.({ ...ds, ...patch });
  const selected = experts.filter(e => selectedIds.includes(e.id));

  const intensityOptions = [
    { id: 'gentle' as const, label: '보통', icon: '🟢', desc: '건설적 비판 위주' },
    { id: 'standard' as const, label: '강도 있게', icon: '🟡', desc: '약점 집중 공격' },
    { id: 'ruthless' as const, label: '무자비', icon: '🔴', desc: '모든 허점 파괴' },
  ];

  const focusOptions = [
    { id: 'all' as const, label: '종합', icon: '🎯', desc: '모든 관점에서 검증' },
    { id: 'logic' as const, label: '논리', icon: '🧠', desc: '논리적 오류/모순 탐색' },
    { id: 'feasibility' as const, label: '실현성', icon: '⚙️', desc: '실행 가능성 검증' },
    { id: 'risk' as const, label: '리스크', icon: '⚠️', desc: '숨은 위험 요소 발굴' },
  ];

  const phases = [
    { icon: '📋', label: '제안 발표', color: 'bg-blue-50 border-blue-100', desc: '아이디어/계획을 발표하고 핵심을 정리' },
    { icon: '🔴', label: '공격 (Red Team)', color: 'bg-red-50 border-red-100', desc: '취약점·맹점·리스크를 집중 공격' },
    { icon: '🔵', label: '방어 (Blue Team)', color: 'bg-blue-50 border-blue-100', desc: '비판에 대응하고 보강 방안 제시' },
    { icon: '⚖️', label: '최종 판정', color: 'bg-amber-50 border-amber-100', desc: '생존한 논점 정리, 개선안 도출' },
  ];

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden">
      <div className="px-4 py-2.5 bg-gradient-to-r from-red-700 to-slate-800 flex items-center gap-2.5">
        <span className="text-lg">🛡️</span>
        <div>
          <div className="text-[13px] font-bold text-white">레드팀 검증</div>
          <div className="text-[10px] text-red-200">아이디어를 스트레스 테스트하여 검증</div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Phase preview */}
        <div>
          <div className="text-[11px] font-bold text-slate-600 mb-2.5">검증 단계</div>
          <div className="grid grid-cols-2 gap-2">
            {phases.map((p, i) => (
              <div key={i} className={cn('flex items-start gap-2 p-2.5 rounded-lg border', p.color)}>
                <span className="text-base shrink-0">{p.icon}</span>
                <div>
                  <div className="text-[10px] font-bold text-slate-700">{i + 1}. {p.label}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5 leading-snug">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Participants */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600">참여자</span>
            {selected.length < 2
              ? <span className="text-[10px] text-amber-500 font-medium">2명 이상 선택해주세요</span>
              : <span className="text-[10px] text-slate-400">{selected.length}명 참여</span>}
          </div>
          {selected.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {selected.map(e => (
                <div key={e.id} className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                  <div className="w-5 h-5 scale-[0.6] origin-center"><ExpertAvatar expert={e} size="sm" /></div>
                  <span className="text-[11px] font-medium text-slate-700">{e.nameKo}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-3 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
              <p className="text-[11px] text-slate-400">위에서 참여할 전문가를 선택하세요</p>
            </div>
          )}
        </div>

        {/* Intensity */}
        <div>
          <div className="text-[11px] font-bold text-slate-600 mb-2">공격 강도</div>
          <div className="flex gap-2">
            {intensityOptions.map(opt => (
              <button key={opt.id} onClick={() => update({ redteamIntensity: opt.id })}
                className={cn('flex-1 py-2.5 rounded-lg border text-center transition-all',
                  ds.redteamIntensity === opt.id ? 'bg-red-700 text-white border-red-700 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-red-300')}>
                <div className="text-[14px] mb-0.5">{opt.icon}</div>
                <div className="text-[11px] font-bold">{opt.label}</div>
                <div className={cn('text-[9px] mt-0.5', ds.redteamIntensity === opt.id ? 'text-red-200' : 'text-slate-400')}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Focus area */}
        <div>
          <div className="text-[11px] font-bold text-slate-600 mb-2">검증 초점</div>
          <div className="grid grid-cols-2 gap-2">
            {focusOptions.map(opt => (
              <button key={opt.id} onClick={() => update({ redteamFocus: opt.id })}
                className={cn('p-2.5 rounded-lg border text-left transition-all flex items-start gap-2',
                  ds.redteamFocus === opt.id ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}>
                <span className="text-[16px] shrink-0">{opt.icon}</span>
                <div>
                  <div className="text-[11px] font-bold">{opt.label}</div>
                  <div className={cn('text-[9px] mt-0.5', ds.redteamFocus === opt.id ? 'text-slate-400' : 'text-slate-400')}>{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Response length & conclusion */}
        <div className="pt-1 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-500 w-16 shrink-0">답변 길이</span>
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
            <span className="text-[10px] font-bold text-slate-500">종합 판정 포함</span>
            <Toggle checked={ds.includeConclusion} onChange={v => update({ includeConclusion: v })} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Collaboration Board (협업모드 — kept for backward compat) ──
function CollaborationBoard({ experts, selectedIds, selectedTeam, onTeamChange, roles, onRolesChange, externalDragId, onToggle, mission, onMissionChange }: {
  experts: Expert[];
  selectedIds: string[];
  selectedTeam: CollaborationTeam | null;
  onTeamChange?: (team: CollaborationTeam | null) => void;
  roles: Record<string, string>;
  onRolesChange?: (roles: Record<string, string>) => void;
  externalDragId?: string | null;
  onToggle?: (id: string) => void;
  mission: string;
  onMissionChange?: (v: string) => void;
}) {
  const [draggedToSlot, setDraggedToSlot] = useState<number | null>(null);
  const [draggedExpert, setDraggedExpert] = useState<string | null>(null);
  const [customRoleNames, setCustomRoleNames] = useState<string[]>(['역할 1', '역할 2', '역할 3']);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [editSlotText, setEditSlotText] = useState('');

  const isCustom = selectedTeam?.id === '__custom__';
  const customTeam: CollaborationTeam = {
    id: '__custom__', name: '직접 구성', description: '역할을 자유롭게 설정', roles: customRoleNames,
    phases: [
      { id: 'phase1', label: '1단계 · 각 역할별 의견', description: '', deliverable: '', instruction: '각자의 역할 관점에서 의견을 제시해주세요.' },
      { id: 'phase2', label: '2단계 · 상호 피드백', description: '', deliverable: '', instruction: '다른 역할의 의견에 대해 피드백을 제시해주세요.' },
      { id: 'phase3', label: '3단계 · 종합 결론', description: '', deliverable: '', instruction: '모든 의견을 종합하여 최종 결론을 도출해주세요.' },
    ],
  };
  const effectiveTeam = isCustom ? customTeam : selectedTeam;

  const assignToSlot = (expertId: string, slotIndex: number) => {
    if (!effectiveTeam) return;
    const roleName = effectiveTeam.roles[slotIndex];
    if (!roleName) return;
    if (!selectedIds.includes(expertId) && onToggle) onToggle(expertId);
    const newRoles = { ...roles };
    Object.keys(newRoles).forEach(k => { if (newRoles[k] === roleName) delete newRoles[k]; });
    newRoles[expertId] = roleName;
    onRolesChange?.(newRoles);
  };

  const removeFromSlot = (expertId: string) => {
    const newRoles = { ...roles };
    delete newRoles[expertId];
    onRolesChange?.(newRoles);
  };

  const getExpertInSlot = (roleName: string): Expert | undefined => {
    const id = Object.keys(roles).find(k => roles[k] === roleName);
    return id ? experts.find(e => e.id === id) : undefined;
  };

  const startEditSlot = (i: number) => { setEditingSlot(i); setEditSlotText(customRoleNames[i]); };
  const saveEditSlot = () => {
    if (editingSlot === null) return;
    const next = [...customRoleNames];
    next[editingSlot] = editSlotText.trim() || `역할 ${editingSlot + 1}`;
    setCustomRoleNames(next);
    setEditingSlot(null);
    onRolesChange?.({});
  };

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="text-[13px] font-bold text-slate-700">협업 모드 설정</div>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <div className="text-[11px] font-bold text-slate-600 mb-2">팀 구성</div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => { onTeamChange?.(isCustom ? null : customTeam); onRolesChange?.({}); }}
              className={cn('px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border', isCustom ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}>
              직접 구성
            </button>
            {COLLABORATION_TEAMS.map(team => (
              <div key={team.id} className="relative group/team">
                <button onClick={() => { onTeamChange?.(selectedTeam?.id === team.id ? null : team); onRolesChange?.({}); }}
                  className={cn('px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border', selectedTeam?.id === team.id && !isCustom ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}>
                  {team.name}
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2.5 rounded-lg bg-slate-800 text-white text-[9px] leading-relaxed shadow-xl opacity-0 invisible group-hover/team:opacity-100 group-hover/team:visible transition-all duration-200 z-50 pointer-events-none">
                  <div className="font-semibold text-[10px] mb-1">{team.name}</div>
                  <p className="text-slate-300 mb-1.5">{team.description}</p>
                  <div className="space-y-0.5 text-slate-400">{team.phases.map((p, pi) => (
                    <div key={p.id}><span className="text-slate-200">{pi+1}.</span> {p.label}{p.deliverable && ` → ${p.deliverable}`}</div>
                  ))}</div>
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-slate-800 rotate-45 -mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {effectiveTeam && (
          <div>
            <div className="text-[11px] font-bold text-slate-600 mb-2.5">역할 배정 <span className="font-normal text-slate-400">— 위에서 드래그{isCustom ? ' · 역할명 클릭 편집' : ''}</span></div>
            <div className="relative flex items-start gap-0">
              {effectiveTeam.roles.map((roleName, i) => {
                const assigned = getExpertInSlot(roleName);
                const isOver = draggedToSlot === i;
                const phase = effectiveTeam.phases[i];
                return (
                  <div key={`${roleName}-${i}`} className="flex-1 flex flex-col items-center relative">
                    {i < effectiveTeam.roles.length - 1 && <div className="absolute top-[9px] left-[calc(50%+12px)] right-0 h-px bg-slate-200 z-0" />}
                    {i > 0 && <div className="absolute top-[9px] right-[calc(50%+12px)] left-0 h-px bg-slate-200 z-0" />}
                    <div className={cn('w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center z-10 text-[9px] font-bold transition-all mb-2',
                      assigned ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-300 text-slate-400')}>
                      {i + 1}
                    </div>
                    <div onDragOver={e => { e.preventDefault(); setDraggedToSlot(i); }} onDragLeave={() => setDraggedToSlot(null)}
                      onDrop={() => { const dropId = draggedExpert || externalDragId; if (dropId) assignToSlot(dropId, i); setDraggedToSlot(null); setDraggedExpert(null); }}
                      className={cn('w-full rounded-lg border-2 p-2 text-center transition-all duration-150',
                        assigned ? 'border-solid border-indigo-200 bg-indigo-50/30' : isOver ? 'border-solid border-indigo-400 bg-indigo-50' : 'border-dashed border-slate-200')}>
                      {isCustom && editingSlot === i ? (
                        <input value={editSlotText} onChange={e => setEditSlotText(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEditSlot()} onBlur={saveEditSlot} autoFocus className="text-[10px] font-bold text-slate-600 bg-transparent outline-none text-center w-full" />
                      ) : (
                        <div className={cn('text-[10px] font-bold', assigned ? 'text-indigo-600' : 'text-slate-500', isCustom && 'cursor-pointer hover:text-indigo-600')} onClick={() => isCustom && startEditSlot(i)}>
                          {roleName}
                        </div>
                      )}
                      {phase && <div className="text-[8px] text-slate-400 mt-0.5">{phase.label}</div>}
                      {assigned ? (
                        <div className="flex items-center justify-center gap-1 mt-1.5">
                          <span className="text-[10px] font-semibold text-slate-700">{assigned.nameKo}</span>
                          <button onClick={() => removeFromSlot(assigned.id)} className="text-slate-300 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
                        </div>
                      ) : <div className="text-[9px] text-slate-300 mt-1.5">드래그</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Expert Mode Selection Panel ──
function ExpertModePanel({ onSelectTemplate, selectedTemplate, onSubmit, isDiscussing }: {
  onSelectTemplate: (t: ExpertModeTemplate | null) => void;
  selectedTemplate: ExpertModeTemplate | null;
  onSubmit: (question: string) => void;
  isDiscussing: boolean;
}) {
  const [question, setQuestion] = useState('');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <p className="text-[12px] text-slate-500">분야를 선택하면 전문가들이 단계별로 상담을 진행합니다</p>
      </div>

      {/* Mode cards grid — 3 per row, information-rich */}
      <div className="grid grid-cols-3 gap-3">
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
                  ? 'border-slate-700 bg-slate-900 shadow-xl ring-1 ring-slate-600'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
              )}
            >
              {/* Top gradient accent bar */}
              <div className={cn('h-1', isSelected ? 'bg-gradient-to-r from-amber-400 to-orange-400' : `bg-gradient-to-r ${template.gradient}`)} />

              <div className="px-4 pt-3.5 pb-3">
                {/* Badges */}
                <div className="absolute top-3 right-3 flex gap-1">
                  {template.isPopular && (
                    <span className={cn('text-[8px] font-bold px-1.5 py-0.5 rounded-full', isSelected ? 'bg-amber-400/20 text-amber-300' : 'bg-amber-50 text-amber-600 border border-amber-200')}>인기</span>
                  )}
                  {template.isNew && (
                    <span className={cn('text-[8px] font-bold px-1.5 py-0.5 rounded-full', isSelected ? 'bg-emerald-400/20 text-emerald-300' : 'bg-emerald-50 text-emerald-600 border border-emerald-200')}>NEW</span>
                  )}
                </div>

                {/* Header: Icon + Title */}
                <div className="flex items-start gap-2.5 mb-2.5">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm', isSelected ? 'bg-white/10' : `bg-gradient-to-br ${template.gradient}`)}>
                    {template.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={cn('text-[13px] font-bold leading-tight', isSelected ? 'text-white' : 'text-slate-800')}>{template.name}</h3>
                    <p className={cn('text-[9px] mt-0.5 leading-snug', isSelected ? 'text-slate-400' : 'text-slate-500')}>{template.description}</p>
                  </div>
                </div>

                {/* Phase flow: expert roles */}
                <div className={cn('rounded-lg p-2 mb-2.5', isSelected ? 'bg-white/5' : 'bg-slate-50')}>
                  <div className="flex items-center gap-0.5 flex-wrap">
                    {corePhases.map((phase, i) => (
                      <div key={phase.id} className="flex items-center gap-0.5">
                        <span className={cn('text-[9px] px-1.5 py-0.5 rounded-md font-medium inline-flex items-center gap-0.5',
                          isSelected ? 'bg-white/10 text-slate-300' : 'bg-white text-slate-600 border border-slate-200')}>
                          <span>{phase.expertIcon}</span>
                          <span>{phase.expertRole}</span>
                        </span>
                        {i < corePhases.length - 1 && <ChevronRight className={cn('w-2.5 h-2.5 shrink-0', isSelected ? 'text-slate-500' : 'text-slate-300')} />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Output format */}
                <div className={cn('flex items-center gap-1.5 text-[9px] font-medium', isSelected ? 'text-slate-500' : 'text-slate-400')}>
                  <FileText className="w-3 h-3 shrink-0" />
                  <span>{template.outputFormat}</span>
                </div>

                {/* Phase count badge */}
                <div className={cn('mt-2 pt-2 border-t', isSelected ? 'border-slate-700' : 'border-slate-100')}>
                  <span className={cn('text-[9px] font-bold', isSelected ? 'text-amber-400' : 'text-slate-500')}>
                    {template.phases.length}단계 전문가 순차 상담
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected template detail */}
      {selectedTemplate && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className={cn('px-5 py-4 bg-gradient-to-r', selectedTemplate.gradient)}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedTemplate.icon}</span>
              <div>
                <h3 className="text-[14px] font-bold text-slate-800">{selectedTemplate.name}</h3>
                <p className="text-[11px] text-slate-600 mt-0.5">총 {selectedTemplate.phases.length}단계 전문가 상담</p>
              </div>
            </div>
          </div>

          {/* Phase timeline detail */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">상담 진행 순서</p>
            <div className="space-y-2">
              {selectedTemplate.phases.map((phase, i) => (
                <div key={phase.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
                      i === selectedTemplate.phases.length - 1
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-slate-100 text-slate-600'
                    )}>
                      {i === selectedTemplate.phases.length - 1 ? '✓' : i + 1}
                    </div>
                    {i < selectedTemplate.phases.length - 1 && (
                      <div className="w-px h-4 bg-slate-100 mt-1" />
                    )}
                  </div>
                  <div className="pb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px]">{phase.expertIcon}</span>
                      <span className={cn('text-[11px] font-semibold', i === selectedTemplate.phases.length - 1 ? 'text-amber-600' : 'text-slate-700')}>{phase.expertRole}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{phase.description}</p>
                    {phase.sampleQuestions.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {phase.sampleQuestions.slice(0, 2).map((q, qi) => (
                          <span key={qi} className="text-[9px] text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-full">&ldquo;{q}&rdquo;</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-5 pb-4">
            <p className="text-[11px] font-semibold text-slate-600 mb-2">상담 내용을 간단히 설명해주세요</p>
            <div className="flex gap-2">
              <input
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && question.trim()) onSubmit(question); }}
                placeholder={`${selectedTemplate.name} 관련 상황을 설명해주세요...`}
                disabled={isDiscussing}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-[12px] outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all"
              />
              <button
                onClick={() => question.trim() && onSubmit(question)}
                disabled={!question.trim() || isDiscussing}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[12px] font-semibold hover:bg-slate-800 disabled:opacity-40 transition-all flex items-center gap-1.5"
              >
                상담 시작 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
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
  onSuggestedQuestion, onSubmit, proconStances = {}, onProconStancesChange,
  debateSettings, onDebateSettingsChange, showDebateSettings,
  selectedCollaborationTeam, onCollaborationTeamChange,
  collaborationRoles = {}, onCollaborationRolesChange,
  selectedFramework, onFrameworkChange,
  discussionIssues = [], onDiscussionIssuesChange,
  debateIntensity = 'moderate', onDebateIntensityChange,
  collaborationMission = '', onCollaborationMissionChange,
}: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('ai');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('전체');
  const isProcon = discussionMode === 'procon';
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<'pro' | 'con' | null>(null);
  const [hintId, setHintId] = useState<string | null>(null);
  const [maxLimitMsg, setMaxLimitMsg] = useState<string | null>(null);
  const [selectedExpertModeTemplate, setSelectedExpertModeTemplate] = useState<ExpertModeTemplate | null>(null);

  const MAX_PER_ZONE = 3;
  const mainMode = getMainMode(discussionMode);

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
    : mainMode === 'expert'
    ? '전문가들이 단계별로 질문하며 최고 품질의 상담을 제공합니다'
    : mainMode === 'assistant'
    ? '목적에 맞는 AI 어시스턴트를 선택해 작업을 도와받으세요'
    : '2명 이상 선택 후 질문하면 토론을 거쳐 최종 결론을 도출합니다';

  const typedSubtitle = useTypewriter(subtitleText, 20);
  const isGeneral = mainMode === 'general';

  // Expert grid visibility:
  // - general/multi: all categories shown, all selectable
  // - brainstorm: all categories shown, all selectable (including AI)
  // - standard/procon: all categories shown, but AI models are grayed/disabled
  // - collaboration: non-ai categories
  const showExpertGrid = mainMode === 'general' || mainMode === 'multi' || mainMode === 'debate';
  const isDebateMode = mainMode === 'debate';
  const isStandardOrProcon = discussionMode === 'standard' || discussionMode === 'procon';
  const isBrainstorm = discussionMode === 'brainstorm';
  const isRedteam = discussionMode === 'redteam';

  const visibleCategories = EXPERT_CATEGORY_ORDER;

  const grouped = visibleCategories.map(cat => ({
    cat: cat as ExpertCategory,
    label: EXPERT_CATEGORY_LABELS[cat as ExpertCategory],
    items: experts.filter(e => e.category === cat),
  })).filter(g => g.items.length > 0);

  const validCats = grouped.map(g => g.cat);
  const effectiveCategory = validCats.includes(activeCategory as ExpertCategory) ? activeCategory : validCats[0] || 'ai';

  const handleMainModeChange = (m: MainMode) => {
    if (m === 'general') onModeChange('general');
    else if (m === 'multi') onModeChange('multi');
    else if (m === 'expert') onModeChange('expert');
    else if (m === 'assistant') onModeChange('assistant');
    else onModeChange('standard');
  };

  return (
    <div className="space-y-3 py-4">
      {/* Hero */}
      <div className="text-center space-y-2">
        <h2 key={mainMode} className="text-2xl sm:text-[26px] font-bold text-foreground tracking-tight animate-in fade-in duration-700">
          {mainMode === 'general' ? '모든 AI 챗봇을 한 곳에서 원하는 대로 골라 쓰세요'
            : mainMode === 'multi' ? '하나의 질문을 여러 AI에게 동시에 물어보세요'
            : mainMode === 'expert' ? '분야별 전문가 팀이 단계별 맞춤 상담을 제공합니다'
            : mainMode === 'assistant' ? '작업을 도와주는 AI 어시스턴트'
            : '전문가 챗봇들의 토론으로 더 넓은 시야를 얻으세요'}
        </h2>
        <div className="relative flex justify-center">
          <span className="invisible text-[12px] leading-relaxed">{subtitleText}</span>
          <span className="absolute inset-0 flex items-center justify-center text-[12px] text-muted-foreground leading-relaxed">
            {typedSubtitle}
            {typedSubtitle.length < subtitleText.length && <span className="animate-pulse text-muted-foreground/40">|</span>}
          </span>
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex flex-col items-center">
        <div className={cn(
          'flex flex-col bg-white border border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-all duration-200',
          mainMode === 'debate' ? 'rounded-[18px] p-[4px] pb-[5px]' : 'rounded-full p-[3px]'
        )}>
          <div className="flex items-center gap-[3px]">
            {mainModes.map(m => {
              const isActive = mainMode === m;
              return (
                <button key={m} onClick={() => handleMainModeChange(m)} disabled={isDiscussing}
                  className={cn(
                    'flex items-center justify-center gap-1 min-w-[72px] px-4 py-[2px] rounded-full text-[11px] tracking-tight transition-all duration-200',
                    isActive ? 'bg-slate-800 text-white font-semibold shadow-sm' : 'text-slate-600 font-medium hover:text-slate-900'
                  )}>
                  {mainModeLabels[m]}
                </button>
              );
            })}
          </div>

          {mainMode === 'debate' && (
            <div className="flex items-center justify-center gap-1 pt-[5px] mt-[4px] mx-2 border-t border-slate-100 animate-in fade-in duration-150">
              {debateSubModes.map((sub, i) => {
                const info = DEBATE_SUB_MODE_LABELS[sub];
                const isActive = discussionMode === sub;
                return (
                  <button key={sub} onClick={() => onModeChange(sub)} disabled={isDiscussing}
                    style={{ animationDelay: `${i * 20}ms` }}
                    className={cn(
                      'flex items-center gap-1 px-3.5 py-[3px] rounded-full text-[10.5px] font-medium transition-all duration-150 animate-in fade-in',
                      isActive ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    )}>
                    {debateSubIcons[sub]}
                    <span>{info.label}</span>
                  </button>
                );
              })}
            </div>
          )}

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

      {/* ── Expert Mode ── */}
      {mainMode === 'expert' && (
        <ExpertModePanel
          onSelectTemplate={setSelectedExpertModeTemplate}
          selectedTemplate={selectedExpertModeTemplate}
          onSubmit={onSubmit}
          isDiscussing={isDiscussing}
        />
      )}

      {/* ── Assistant Mode ── */}
      {mainMode === 'assistant' && (
        <AssistantCardsPanel onSubmit={onSubmit} isDiscussing={isDiscussing} />
      )}

      {/* ── Expert Selection Grid (general / multi / debate) ── */}
      {showExpertGrid && (
        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
          {/* Category tabs */}
          <div className="flex flex-col bg-slate-50 border-b-2 border-slate-200">
            <div className="flex items-center px-2 pt-1 pb-1 overflow-x-auto scrollbar-none">
              <div className="flex flex-1 min-w-0 gap-0.5">
                {grouped.map(({ cat, label }) => {
                  const isActive = effectiveCategory === cat;
                  return (
                    <button key={cat} type="button"
                      onClick={() => { setActiveCategory(cat); setActiveSubCategory('전체'); }}
                      className={cn('flex items-center gap-1 px-2.5 py-1 text-[11px] transition-all whitespace-nowrap rounded-md',
                        isActive ? 'bg-slate-800 text-white font-semibold shadow-sm' : 'text-slate-500 font-medium hover:text-slate-800 hover:bg-slate-200/70')}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            {EXPERT_SUB_CATEGORIES[effectiveCategory as ExpertCategory] && (
              <div className="flex items-center gap-1 px-3 pt-1 pb-1 border-t border-slate-200 overflow-x-auto scrollbar-none">
                {EXPERT_SUB_CATEGORIES[effectiveCategory as ExpertCategory]!.map(sub => (
                  <button key={sub.id} type="button" onClick={() => setActiveSubCategory(sub.id)}
                    className={cn('px-2.5 py-0.5 rounded-full text-[10px] whitespace-nowrap transition-all duration-150',
                      activeSubCategory === sub.id ? 'bg-slate-700 text-white font-semibold' : 'text-slate-500 font-medium hover:text-slate-800 hover:bg-slate-200/70')}>
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Expert grid */}
          {grouped.filter(({ cat }) => cat === effectiveCategory).map(({ cat, items }) => {
            const subCats = EXPERT_SUB_CATEGORIES[cat as ExpertCategory];
            const filtered = !subCats || activeSubCategory === '전체'
              ? items : items.filter(e => e.subCategory === activeSubCategory);
            return (
              <div key={cat} className="relative bg-white">
                <div className="px-4 pt-3 pb-3 max-h-[160px] overflow-y-auto scrollbar-none grid grid-cols-8 gap-x-1 gap-y-2.5">
                  {filtered.map(expert => {
                    const isSelected = selectedIds.includes(expert.id);
                    const stance = proconStances[expert.id];
                    const isPro = stance === 'pro';
                    const isCon = stance === 'con';
                    // AI models are disabled in standard/procon mode but shown
                    const isAiModel = expert.category === 'ai';
                    const isDisabled = isStandardOrProcon && isAiModel;
                    return (
                      <div key={expert.id}
                        draggable={isProcon && !isDisabled}
                        onDragStart={() => !isDisabled && setDraggedId(expert.id)}
                        onDragEnd={() => setDraggedId(null)}
                        className={cn(
                          'group relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-150',
                          isDisabled ? 'opacity-25 cursor-not-allowed' : '',
                          isProcon && !isDisabled ? 'cursor-grab active:cursor-grabbing' : '',
                          hintId === expert.id ? 'animate-drag-hint' : '',
                          !isDisabled && isProcon && isPro ? 'bg-blue-50 ring-1 ring-blue-200 scale-[1.03]'
                            : !isDisabled && isProcon && isCon ? 'bg-red-50 ring-1 ring-red-200 scale-[1.03]'
                            : !isDisabled && !isProcon && isSelected ? 'bg-indigo-50/70 ring-1 ring-indigo-200 scale-[1.03]'
                            : !isDisabled ? 'hover:bg-slate-50 hover:scale-[1.03]' : ''
                        )}>
                        <button type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            if (isDisabled) return;
                            if (isProcon) {
                              if (stance) removeStance(expert.id);
                              else triggerDragHint(expert.id);
                            } else {
                              if (mainMode === 'multi' && !isSelected && selectedIds.length >= 3) {
                                setMaxLimitMsg('다중 AI는 최대 3개까지 선택할 수 있습니다');
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
                          <ExpertAvatar expert={expert} size="sm" />
                          <span className={cn('text-[9.5px] font-medium whitespace-nowrap truncate max-w-full leading-tight transition-colors',
                            isDisabled ? 'text-slate-300'
                              : isProcon && isPro ? 'text-blue-600 font-semibold'
                              : isProcon && isCon ? 'text-red-500 font-semibold'
                              : !isProcon && isSelected ? 'text-indigo-600 font-semibold'
                              : 'text-slate-400 group-hover:text-slate-700')}>
                            {expert.nameKo}
                          </span>
                        </button>
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
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none rounded-r-xl" />
              </div>
            );
          })}
        </div>
      )}

      {/* Max limit message */}
      {maxLimitMsg && (
        <div className="text-center py-1.5 px-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-700 font-medium animate-in fade-in duration-200">
          {maxLimitMsg}
        </div>
      )}

      {/* Mode-specific settings panels */}
      {isProcon && (
        <ProconSettingsPanel
          experts={experts} proconStances={proconStances}
          dragOver={dragOver} draggedId={draggedId}
          setDragOver={setDragOver} setDraggedId={setDraggedId}
          assignStance={assignStance} removeStance={removeStance}
          MAX_PER_ZONE={MAX_PER_ZONE}
          debateSettings={debateSettings}
          onDebateSettingsChange={onDebateSettingsChange}
        />
      )}

      {isBrainstorm && (
        <BrainstormSettingsPanel
          selectedIds={selectedIds} experts={experts}
          selectedFramework={selectedFramework} onFrameworkChange={onFrameworkChange}
          debateSettings={debateSettings} onDebateSettingsChange={onDebateSettingsChange}
        />
      )}

      {discussionMode === 'standard' && (
        <StandardSettingsPanel
          issues={discussionIssues} onIssuesChange={onDiscussionIssuesChange}
          debateSettings={debateSettings} onDebateSettingsChange={onDebateSettingsChange}
          selectedExperts={experts.filter(e => selectedIds.includes(e.id))}
        />
      )}

      {isRedteam && (
        <RedteamSettingsPanel
          experts={experts} selectedIds={selectedIds}
          debateSettings={debateSettings} onDebateSettingsChange={onDebateSettingsChange}
        />
      )}

      {/* Question Input — not shown for expert/assistant (they have their own inputs) */}
      {mainMode !== 'expert' && mainMode !== 'assistant' && (
        <QuestionInput
          onSubmit={onSubmit}
          disabled={isDiscussing || selectedIds.length < 1}
          discussionMode={discussionMode}
          selectedExperts={
            (isProcon || discussionMode === 'standard' || isBrainstorm)
              ? [] : experts.filter(e => selectedIds.includes(e.id))
          }
          onRemoveExpert={isGeneral || isProcon ? undefined : onToggle}
        />
      )}

      {/* Suggested Questions */}
      {onSuggestedQuestion && !isGeneral && mainMode !== 'expert' && mainMode !== 'assistant' && (
        <div>
          <p className="text-[10px] text-muted-foreground font-medium mb-2 px-0.5 tracking-wide">추천 질문</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {SUGGESTED_QUESTIONS.map((q, i) => {
              const participants = q.expertIds.map(id => experts.find(e => e.id === id)).filter(Boolean) as Expert[];
              return (
                <button key={i} onClick={() => onSuggestedQuestion(q.text, q.expertIds, q.mode)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white text-left hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm transition-all duration-150 group">
                  <span className="shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">{q.icon}</span>
                  <span className="text-[12px] text-foreground/75 leading-snug flex-1">{q.text}</span>
                  {participants.length > 0 && (
                    <div className="flex -space-x-1.5 shrink-0">
                      {participants.slice(0, 3).map(e => <ExpertAvatar key={e.id} expert={e} size="sm" />)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
