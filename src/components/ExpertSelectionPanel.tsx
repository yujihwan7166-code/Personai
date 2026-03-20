import { useState, useEffect, useRef } from 'react';
import { Expert, ExpertCategory, EXPERT_CATEGORY_LABELS, EXPERT_CATEGORY_ORDER, EXPERT_SUB_CATEGORIES, DiscussionMode, MainMode, DebateSubMode, DEBATE_SUB_MODE_LABELS, getMainMode, DebateSettings, COLLABORATION_TEAMS, CollaborationTeam, THINKING_FRAMEWORKS, ThinkingFramework, DiscussionIssue } from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { QuestionInput } from './QuestionInput';
import { cn } from '@/lib/utils';
import { Brain, TrendingUp, Sparkles, HelpCircle, Target, Scale, Lightbulb, Users, Plus, X, Pencil, Check } from 'lucide-react';

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
const debateSubModes: DebateSubMode[] = ['standard', 'procon', 'brainstorm'];

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

// ── Issue Editor (심층토론) ──
const ISSUE_TEMPLATES = ['경제적 영향', '윤리적 쟁점', '기술적 타당성', '사회적 합의', '법률적 문제', '환경적 영향', '실현 가능성', '장기적 영향'];

function StandardSettingsPanel({ issues, onIssuesChange, debateIntensity, onDebateIntensityChange, selectedExperts }: {
  issues: DiscussionIssue[];
  onIssuesChange?: (issues: DiscussionIssue[]) => void;
  debateIntensity: string;
  onDebateIntensityChange?: (v: string) => void;
  selectedExperts: Expert[];
}) {
  const [newIssue, setNewIssue] = useState('');
  const [customIssues, setCustomIssues] = useState<string[]>([]);

  const allTemplates = [...ISSUE_TEMPLATES, ...customIssues.filter(c => !ISSUE_TEMPLATES.includes(c))];
  const selectedTitle = issues.length > 0 ? issues[0].title : null;

  const toggleIssue = (title: string) => {
    if (selectedTitle === title) {
      onIssuesChange?.([]);
    } else {
      onIssuesChange?.([{ id: `issue-${Date.now()}`, title, description: '' }]);
    }
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
      {/* Header */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="text-[13px] font-bold text-slate-700">심층 토론 설정</div>
      </div>

      <div className="p-4 space-y-4">
        {/* Selected debaters */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600">토론자</span>
            {selectedExperts.length < 2
              ? <span className="text-[10px] text-amber-500 font-medium">2명 이상 선택해주세요</span>
              : <span className="text-[10px] text-slate-400">{selectedExperts.length}명 참여</span>
            }
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
            {[
              { id: 'explore', label: '탐색', desc: '다양한 관점을 넓게 탐색' },
              { id: 'analyze', label: '분석', desc: '논리적으로 깊이 파고들기' },
              { id: 'consensus', label: '합의', desc: '공통 결론 도출에 집중' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => onDebateIntensityChange?.(opt.id)}
                className={cn(
                  'flex-1 px-3 py-2.5 rounded-lg text-center transition-all border',
                  debateIntensity === opt.id
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                )}
              >
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
            {allTemplates.map(t => {
              const isActive = selectedTitle === t;
              return (
                <button
                  key={t}
                  onClick={() => toggleIssue(t)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border flex items-center gap-1.5',
                    isActive
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                  )}
                >
                  {isActive && <Check className="w-3 h-3" />}
                  {t}
                </button>
              );
            })}
          </div>

          {/* Custom input */}
          <div className="flex items-center gap-2">
            <input
              value={newIssue}
              onChange={e => setNewIssue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCustom(); }}
              placeholder="직접 논점 추가..."
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-[11px] outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all"
            />
            <button
              onClick={addCustom}
              disabled={!newIssue.trim()}
              className="px-3 py-2 rounded-lg bg-slate-800 text-white text-[10px] font-semibold disabled:opacity-30 hover:bg-slate-700 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> 추가
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Brainstorm Detail Toggle ──
function BrainstormDetailToggle({ debateSettings, onDebateSettingsChange }: { debateSettings?: DebateSettings; onDebateSettingsChange?: (s: DebateSettings) => void }) {
  const [open, setOpen] = useState(false);
  const ds = debateSettings || { responseLength: 'medium' as const, rounds: 3 as const, includeConclusion: true };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 py-1.5 px-1 rounded-lg text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-all"
      >
        세부 설정 {open ? '접기 ▲' : '펼치기 ▼'}
      </button>
      {open && onDebateSettingsChange && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Row 1: Idea depth */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-500 w-16 shrink-0">아이디어</span>
            <div className="flex gap-1 flex-1">
              {(['short', 'medium', 'long'] as const).map(v => (
                <button key={v} onClick={() => onDebateSettingsChange({ ...ds, responseLength: v })}
                  className={cn('flex-1 py-1.5 rounded-md text-[10px] font-medium text-center transition-all', ds.responseLength === v ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400')}>
                  {v === 'short' ? '간결' : v === 'medium' ? '보통' : '상세'}
                </button>
              ))}
            </div>
          </div>
          {/* Row 2: Result */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-500 w-16 shrink-0">결과 정리</span>
            <div className="flex gap-1 flex-1">
              <button onClick={() => onDebateSettingsChange({ ...ds, includeConclusion: true })}
                className={cn('flex-1 py-1.5 rounded-md text-[10px] font-medium text-center transition-all', ds.includeConclusion ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400')}>
                종합 정리
              </button>
              <button onClick={() => onDebateSettingsChange({ ...ds, includeConclusion: false })}
                className={cn('flex-1 py-1.5 rounded-md text-[10px] font-medium text-center transition-all', !ds.includeConclusion ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400')}>
                없음
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Procon Settings Panel (찬반토론) ──
function ProconSettingsPanel({ experts, proconStances, dragOver, draggedId, setDragOver, setDraggedId, assignStance, removeStance, MAX_PER_ZONE, debateIntensity, onDebateIntensityChange, debateSettings, onDebateSettingsChange }: {
  experts: Expert[];
  proconStances: Record<string, 'pro' | 'con'>;
  dragOver: 'pro' | 'con' | null;
  draggedId: string | null;
  setDragOver: (v: 'pro' | 'con' | null) => void;
  setDraggedId: (v: string | null) => void;
  assignStance: (id: string, stance: 'pro' | 'con') => void;
  removeStance: (id: string) => void;
  MAX_PER_ZONE: number;
  debateIntensity: string;
  onDebateIntensityChange?: (v: string) => void;
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const [proSlotCount, setProSlotCount] = useState(1);
  const [conSlotCount, setConSlotCount] = useState(1);

  // Auto-expand slots when items are added
  const proAssigned = Object.keys(proconStances).filter(id => proconStances[id] === 'pro').length;
  const conAssigned = Object.keys(proconStances).filter(id => proconStances[id] === 'con').length;
  const effectiveProSlots = Math.max(proSlotCount, proAssigned);
  const effectiveConSlots = Math.max(conSlotCount, conAssigned);

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="text-[13px] font-bold text-slate-700">찬반 토론 설정</div>
      </div>

      <div className="p-4 space-y-3">
        {/* Drag zones — slot based */}
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
                <div
                  key={zone}
                  onDragOver={e => { e.preventDefault(); setDragOver(zone); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => {
                    if (draggedId) assignStance(draggedId, zone);
                    setDragOver(null);
                    setDraggedId(null);
                  }}
                  className={cn(
                    'rounded-xl border transition-all duration-150 overflow-hidden',
                    isOver && canDrop
                      ? isPro ? 'border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]' : 'border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                      : isOver && !canDrop ? 'border-slate-300'
                      : isPro ? 'border-blue-200' : 'border-red-200'
                  )}
                >
                  {/* Zone header */}
                  <div className={cn('px-3 py-2 flex items-center justify-between', isPro ? 'bg-blue-50' : 'bg-red-50')}>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-[12px] font-bold', isPro ? 'text-blue-600' : 'text-red-600')}>
                        {isPro ? '찬성' : '반대'}
                      </span>
                    </div>
                    <span className={cn('text-[10px] font-medium', isPro ? 'text-blue-400' : 'text-red-400')}>{assigned.length}/{MAX_PER_ZONE}</span>
                  </div>
                  {/* Slots */}
                  <div className="px-3 py-2 space-y-1.5 bg-white">
                    {slots.map((id, i) => {
                      const e = id ? experts.find(x => x.id === id) : null;
                      return e ? (
                        <div key={id} draggable onDragStart={() => setDraggedId(id!)} onDragEnd={() => setDraggedId(null)}
                          className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing transition-all', isPro ? 'bg-blue-50 hover:bg-blue-100' : 'bg-red-50 hover:bg-red-100')}>
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
                      <button
                        type="button"
                        onClick={() => isPro ? setProSlotCount(p => Math.min(p + 1, MAX_PER_ZONE)) : setConSlotCount(p => Math.min(p + 1, MAX_PER_ZONE))}
                        className="w-full flex items-center justify-center gap-1 py-1 rounded-lg text-[9px] text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                      >
                        <Plus className="w-3 h-3" /> 슬롯 추가
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Toggle detail settings */}
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="flex items-center gap-1.5 py-1.5 px-1 rounded-lg text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-all"
        >
          세부 설정 {showDetail ? '접기 ▲' : '펼치기 ▼'}
        </button>

        {/* Detail settings (collapsible) */}
        {showDetail && debateSettings && onDebateSettingsChange && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Row 1: Intensity */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-500 w-14 shrink-0">강도</span>
              <div className="flex gap-1 flex-1">
                {[
                  { id: 'mild', label: '온건' },
                  { id: 'moderate', label: '보통' },
                  { id: 'intense', label: '격렬' },
                ].map(opt => (
                  <button key={opt.id} onClick={() => onDebateIntensityChange?.(opt.id)}
                    className={cn('flex-1 py-1.5 rounded-md text-[10px] font-medium text-center transition-all', debateIntensity === opt.id ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400')}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Row 2: Rounds */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-500 w-14 shrink-0">라운드</span>
              <div className="flex gap-1 flex-1">
                {([2, 3, 4] as const).map(v => (
                  <button key={v} onClick={() => onDebateSettingsChange({ ...debateSettings, rounds: v })}
                    className={cn('flex-1 py-1.5 rounded-md text-[10px] font-medium text-center transition-all', debateSettings.rounds === v ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400')}>
                    {v}R
                  </button>
                ))}
              </div>
            </div>
            {/* Row 3: Format */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-500 w-14 shrink-0">형식</span>
              <div className="flex gap-1 flex-1">
                <button className="flex-1 py-1.5 rounded-md text-[10px] font-medium text-center bg-slate-800 text-white shadow-sm">교대 발언</button>
                <button className="flex-1 py-1.5 rounded-md text-[10px] font-medium text-center bg-white text-slate-500 border border-slate-200 opacity-40 cursor-default">자유 토론</button>
              </div>
            </div>
            {/* Row 4: Verdict */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-500 w-14 shrink-0">판정</span>
              <div className="flex gap-1 flex-1">
                <button onClick={() => onDebateSettingsChange({ ...debateSettings, includeConclusion: true })}
                  className={cn('flex-1 py-1.5 rounded-md text-[10px] font-medium text-center transition-all', debateSettings.includeConclusion ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400')}>
                  AI 판정
                </button>
                <button onClick={() => onDebateSettingsChange({ ...debateSettings, includeConclusion: false })}
                  className={cn('flex-1 py-1.5 rounded-md text-[10px] font-medium text-center transition-all', !debateSettings.includeConclusion ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400')}>
                  종합 정리
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Collaboration Board (협업모드) ──
function CollaborationBoard({ experts, selectedIds, selectedTeam, onTeamChange, roles, onRolesChange, externalDragId, onToggle, debateSettings, onDebateSettingsChange, mission, onMissionChange }: {
  experts: Expert[];
  selectedIds: string[];
  selectedTeam: CollaborationTeam | null;
  onTeamChange?: (team: CollaborationTeam | null) => void;
  roles: Record<string, string>;
  onRolesChange?: (roles: Record<string, string>) => void;
  externalDragId?: string | null;
  onToggle?: (id: string) => void;
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
  mission: string;
  onMissionChange?: (v: string) => void;
}) {
  const [draggedToSlot, setDraggedToSlot] = useState<number | null>(null);
  const [draggedExpert, setDraggedExpert] = useState<string | null>(null);
  const [customRoleNames, setCustomRoleNames] = useState<string[]>(['역할 1', '역할 2', '역할 3']);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [editSlotText, setEditSlotText] = useState('');

  // Custom team object built from user-defined role names
  const isCustom = selectedTeam?.id === '__custom__';
  const customTeam: CollaborationTeam = {
    id: '__custom__',
    name: '직접 구성',
    description: '역할을 자유롭게 설정',
    roles: customRoleNames,
    phases: [
      { id: 'phase1', label: '1단계 · 각 역할별 의견', description: '', deliverable: '', instruction: '각자의 역할 관점에서 의견을 제시해주세요.' },
      { id: 'phase2', label: '2단계 · 상호 피드백', description: '', deliverable: '', instruction: '다른 역할의 의견에 대해 피드백을 제시해주세요.' },
      { id: 'phase3', label: '3단계 · 종합 결론', description: '', deliverable: '', instruction: '모든 의견을 종합하여 최종 결론을 도출해주세요.' },
    ],
  };

  // Effective team = custom or preset
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

  const startEditSlot = (i: number) => {
    setEditingSlot(i);
    setEditSlotText(customRoleNames[i]);
  };

  const saveEditSlot = () => {
    if (editingSlot === null) return;
    const next = [...customRoleNames];
    next[editingSlot] = editSlotText.trim() || `역할 ${editingSlot + 1}`;
    setCustomRoleNames(next);
    setEditingSlot(null);
    // Update roles mapping with new name
    onRolesChange?.({});
  };


  const [showCollabDetail, setShowCollabDetail] = useState(false);

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="text-[13px] font-bold text-slate-700">협업 모드 설정</div>
      </div>

      <div className="p-4 space-y-3">
        {/* Team preset selector with hover tooltips */}
        <div>
          <div className="text-[11px] font-bold text-slate-600 mb-2">팀 구성</div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => { onTeamChange?.(isCustom ? null : customTeam); onRolesChange?.({}); }}
              className={cn('px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border', isCustom ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}
            >
              직접 구성
            </button>
            {COLLABORATION_TEAMS.map(team => (
              <div key={team.id} className="relative group/team">
                <button
                  onClick={() => { onTeamChange?.(selectedTeam?.id === team.id ? null : team); onRolesChange?.({}); }}
                  className={cn('px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border', selectedTeam?.id === team.id && !isCustom ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}
                >
                  {team.name}
                </button>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2.5 rounded-lg bg-slate-800 text-white text-[9px] leading-relaxed shadow-xl opacity-0 invisible group-hover/team:opacity-100 group-hover/team:visible transition-all duration-200 z-50 pointer-events-none">
                  <div className="font-semibold text-[10px] mb-1">{team.name}</div>
                  <p className="text-slate-300 mb-1.5">{team.description}</p>
                  <div className="space-y-0.5 text-slate-400">
                    {team.phases.map((p, pi) => (
                      <div key={p.id}><span className="text-slate-200">{pi+1}.</span> {p.label}{p.deliverable && ` → ${p.deliverable}`}</div>
                    ))}
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-slate-800 rotate-45 -mt-1" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Role assignment — horizontal timeline */}
        {effectiveTeam && (
          <div>
            <div className="text-[11px] font-bold text-slate-600 mb-2.5">
              역할 배정 <span className="font-normal text-slate-400">— 위에서 드래그{isCustom ? ' · 역할명 클릭 편집' : ''}</span>
            </div>
            <div className="relative flex items-start gap-0">
              {effectiveTeam.roles.map((roleName, i) => {
                const assigned = getExpertInSlot(roleName);
                const isOver = draggedToSlot === i;
                const phase = effectiveTeam.phases[i];
                return (
                  <div key={`${roleName}-${i}`} className="flex-1 flex flex-col items-center relative">
                    {/* Connector line */}
                    {i < effectiveTeam.roles.length - 1 && (
                      <div className="absolute top-[9px] left-[calc(50%+12px)] right-0 h-px bg-slate-200 z-0" />
                    )}
                    {i > 0 && (
                      <div className="absolute top-[9px] right-[calc(50%+12px)] left-0 h-px bg-slate-200 z-0" />
                    )}

                    {/* Dot */}
                    <div className={cn(
                      'w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center z-10 text-[9px] font-bold transition-all mb-2',
                      assigned ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-300 text-slate-400'
                    )}>
                      {i + 1}
                    </div>

                    {/* Drop card */}
                    <div
                      onDragOver={e => { e.preventDefault(); setDraggedToSlot(i); }}
                      onDragLeave={() => setDraggedToSlot(null)}
                      onDrop={() => {
                        const dropId = draggedExpert || externalDragId;
                        if (dropId) assignToSlot(dropId, i);
                        setDraggedToSlot(null);
                        setDraggedExpert(null);
                      }}
                      className={cn(
                        'w-full rounded-lg border-2 p-2 text-center transition-all duration-150',
                        assigned ? 'border-solid border-indigo-200 bg-indigo-50/30'
                          : isOver ? 'border-solid border-indigo-400 bg-indigo-50'
                          : 'border-dashed border-slate-200'
                      )}
                    >
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
                      ) : (
                        <div className="text-[9px] text-slate-300 mt-1.5">드래그</div>
                      )}
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

export function ExpertSelectionPanel({ experts, selectedIds, onToggle, discussionMode, onModeChange, isDiscussing, onSuggestedQuestion, onSubmit, proconStances = {}, onProconStancesChange, debateSettings, onDebateSettingsChange, showDebateSettings, selectedCollaborationTeam, onCollaborationTeamChange, collaborationRoles = {}, onCollaborationRolesChange, selectedFramework, onFrameworkChange, discussionIssues = [], onDiscussionIssuesChange, debateIntensity = 'moderate', onDebateIntensityChange, collaborationMission = '', onCollaborationMissionChange }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('ai');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('전체');

  const isProcon = discussionMode === 'procon';
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<'pro' | 'con' | null>(null);
  const [hintId, setHintId] = useState<string | null>(null);
  const [maxLimitMsg, setMaxLimitMsg] = useState<string | null>(null);

  const triggerDragHint = (id: string) => {
    setHintId(id);
    setTimeout(() => setHintId(null), 500);
  };

  const MAX_PER_ZONE = 3;

  const assignStance = (expertId: string, stance: ProconStance) => {
    const count = Object.values(proconStances).filter(s => s === stance).length;
    const alreadyInZone = proconStances[expertId] === stance;
    if (!alreadyInZone && count >= MAX_PER_ZONE) return;
    const next = { ...proconStances, [expertId]: stance };
    onProconStancesChange?.(next);
    // 선택 안 된 전문가면 자동 선택
    if (!selectedIds.includes(expertId)) onToggle(expertId);
  };

  const removeStance = (expertId: string) => {
    const next = { ...proconStances };
    delete next[expertId];
    onProconStancesChange?.(next);
    if (selectedIds.includes(expertId)) onToggle(expertId);
  };

  const mainMode = getMainMode(discussionMode);

  const subtitleText = mainMode === 'general'
    ? 'GPT, Claude, Gemini 등 원하는 AI를 선택하고 자유롭게 대화하세요'
    : mainMode === 'multi'
    ? '여러 챗봇을 선택하면 각자 답변한 뒤 하나의 종합 결론으로 정리해드립니다'
    : mainMode === 'expert'
    ? '분야 전문가를 선택해 깊이 있는 전문 지식을 나눠보세요'
    : mainMode === 'assistant'
    ? '작업을 도와주는 AI 도구를 선택하세요'
    : '2명 이상 선택 후 질문하면 토론을 거쳐 최종 결론을 도출합니다';
  const typedSubtitle = useTypewriter(subtitleText, 20);
  const isGeneral = mainMode === 'general';

  // In debate mode, exclude AI models
  const visibleCategories = mainMode === 'debate'
    ? EXPERT_CATEGORY_ORDER.filter(cat => cat !== 'ai')
    : EXPERT_CATEGORY_ORDER;

  const grouped = visibleCategories
    .map(cat => ({
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
        <h2
          key={mainMode}
          className="text-2xl sm:text-[26px] font-bold text-foreground tracking-tight animate-in fade-in duration-700"
        >
          {mainMode === 'general' ? '모든 AI 챗봇을 한 곳에서 원하는 대로 골라 쓰세요'
            : mainMode === 'multi' ? '하나의 질문을 여러 AI에게 동시에 물어보세요'
            : mainMode === 'expert' ? '분야 전문가와 깊이 있는 대화를 나눠보세요'
            : mainMode === 'assistant' ? '작업을 도와주는 AI 어시스턴트'
            : '전문가 챗봇들의 토론으로 더 넓은 시야를 얻으세요'}
        </h2>
        <div className="relative flex justify-center">
          <span className="invisible text-[12px] leading-relaxed">{subtitleText}</span>
          <span className="absolute inset-0 flex items-center justify-center text-[12px] text-muted-foreground leading-relaxed">
            {typedSubtitle}
            {typedSubtitle.length < subtitleText.length && (
              <span className="animate-pulse text-muted-foreground/40">|</span>
            )}
          </span>
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex flex-col items-center">
        <div className={cn(
          'flex flex-col bg-white border border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition-all duration-200',
          mainMode === 'debate' ? 'rounded-[18px] p-[4px] pb-[5px]' : 'rounded-full p-[3px]'
        )}>
          {/* Main modes row */}
          <div className="flex items-center gap-[3px]">
            {mainModes.map(m => {
              const isActive = mainMode === m;
              return (
                <button
                  key={m}
                  onClick={() => handleMainModeChange(m)}
                  disabled={isDiscussing}
                  className={cn(
                    'flex items-center justify-center gap-1 min-w-[72px] px-4 py-[2px] rounded-full text-[11px] tracking-tight transition-all duration-200',
                    isActive
                      ? 'bg-slate-800 text-white font-semibold shadow-sm'
                      : 'text-slate-600 font-medium hover:text-slate-900'
                  )}
                >
                  {mainModeLabels[m]}
                </button>
              );
            })}
          </div>

          {/* Sub-modes — same container, separated by a line */}
          {mainMode === 'debate' && (
            <div className="flex items-center justify-center gap-1 pt-[5px] mt-[4px] mx-2 border-t border-slate-100 animate-in fade-in duration-150">
              {debateSubModes.map((sub, i) => {
                const info = DEBATE_SUB_MODE_LABELS[sub];
                const isActive = discussionMode === sub;
                return (
                  <button
                    key={sub}
                    onClick={() => onModeChange(sub)}
                    disabled={isDiscussing}
                    style={{ animationDelay: `${i * 20}ms` }}
                    className={cn(
                      'flex items-center gap-1 px-3.5 py-[3px] rounded-full text-[10.5px] font-medium transition-all duration-150 animate-in fade-in',
                      isActive
                        ? 'bg-slate-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    {debateSubIcons[sub]}
                    <span>{info.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Debate settings row */}
          {mainMode === 'debate' && showDebateSettings && debateSettings && onDebateSettingsChange && (
            <div className="flex items-center gap-3 pt-[4px] mt-[2px] px-3 pb-[4px] border-t border-slate-200 animate-in fade-in duration-150">
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide shrink-0">설정</span>

              {/* 응답 길이 */}
              <div className="flex items-center gap-0.5">
                {(['short', 'medium', 'long'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => onDebateSettingsChange({ ...debateSettings, responseLength: v })}
                    disabled={isDiscussing}
                    className={cn(
                      'px-2 py-[1px] rounded-full text-[10px] font-medium transition-all duration-150',
                      debateSettings.responseLength === v
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    )}
                  >
                    {v === 'short' ? '짧게' : v === 'medium' ? '보통' : '길게'}
                  </button>
                ))}
              </div>

              <div className="w-px h-3 bg-slate-200 shrink-0" />

              {/* 라운드 수 (standard/brainstorm/mock_trial) */}
              {discussionMode !== 'procon' && (
                <>
                  <div className="flex items-center gap-0.5">
                    {([2, 3, 4] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => onDebateSettingsChange({ ...debateSettings, rounds: v })}
                        disabled={isDiscussing}
                        className={cn(
                          'px-2 py-[1px] rounded-full text-[10px] font-medium transition-all duration-150',
                          debateSettings.rounds === v
                            ? 'bg-slate-700 text-white'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                        )}
                      >
                        {v}R
                      </button>
                    ))}
                  </div>
                  <div className="w-px h-3 bg-slate-200 shrink-0" />
                </>
              )}

              {/* 결론 포함 */}
              <button
                onClick={() => onDebateSettingsChange({ ...debateSettings, includeConclusion: !debateSettings.includeConclusion })}
                disabled={isDiscussing}
                className={cn(
                  'px-2 py-[1px] rounded-full text-[10px] font-medium transition-all duration-150 flex items-center gap-1',
                  debateSettings.includeConclusion
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                )}
              >
                <span>결론</span>
                <span className="opacity-70">{debateSettings.includeConclusion ? '포함' : '제외'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expert Selection */}
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
        <>
            {/* Category tabs */}
            <div className="flex flex-col bg-slate-50 border-b-2 border-slate-200">
              <div className="flex items-center px-2 pt-1 pb-1 overflow-x-auto scrollbar-none">
                <div className="flex flex-1 min-w-0 gap-0.5">
                  {grouped.map(({ cat, label }) => {
                    const isActive = effectiveCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => { setActiveCategory(cat); setActiveSubCategory('전체'); }}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1 text-[11px] transition-all whitespace-nowrap rounded-md',
                          isActive
                            ? 'bg-slate-800 text-white font-semibold shadow-sm'
                            : 'text-slate-500 font-medium hover:text-slate-800 hover:bg-slate-200/70'
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sub-category pills */}
              {EXPERT_SUB_CATEGORIES[effectiveCategory as ExpertCategory] && (
                <div className="flex items-center gap-1 px-3 pt-1 pb-1 border-t border-slate-200 overflow-x-auto scrollbar-none">
                  {EXPERT_SUB_CATEGORIES[effectiveCategory as ExpertCategory]!.map(sub => {
                    const isSubActive = activeSubCategory === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setActiveSubCategory(sub.id)}
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-[10px] whitespace-nowrap transition-all duration-150',
                          isSubActive
                            ? 'bg-slate-700 text-white font-semibold'
                            : 'text-slate-500 font-medium hover:text-slate-800 hover:bg-slate-200/70'
                        )}
                      >
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Expert grid */}
            {grouped
              .filter(({ cat }) => cat === effectiveCategory)
              .map(({ cat, items }) => {
                const subCats = EXPERT_SUB_CATEGORIES[cat as ExpertCategory];
                const filtered = !subCats || activeSubCategory === '전체'
                  ? items
                  : items.filter(e => e.subCategory === activeSubCategory);
                return (
                <div key={cat} className="relative bg-white">
                  <div className="px-4 pt-3 pb-3 max-h-[160px] overflow-y-auto scrollbar-none grid grid-cols-8 gap-x-1 gap-y-2.5">
                    {filtered.map(expert => {
                      const isSelected = selectedIds.includes(expert.id);
                      const stance = proconStances[expert.id];
                      const isPro = stance === 'pro';
                      const isCon = stance === 'con';
                      return (
                        <div
                          key={expert.id}
                          draggable={isProcon}
                          onDragStart={() => setDraggedId(expert.id)}
                          onDragEnd={() => setDraggedId(null)}
                          className={cn(
                            'group relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-150',
                            isProcon ? 'cursor-grab active:cursor-grabbing' : '',
                            hintId === expert.id ? 'animate-drag-hint' : '',
                            isProcon && isPro ? 'bg-blue-50 ring-1 ring-blue-200 scale-[1.03]'
                            : isProcon && isCon ? 'bg-red-50 ring-1 ring-red-200 scale-[1.03]'
                            : !isProcon && isSelected ? 'bg-indigo-50/70 ring-1 ring-indigo-200 scale-[1.03]'
                            : 'hover:bg-slate-50 hover:scale-[1.03]'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (isProcon) {
                                if (stance) removeStance(expert.id);
                                else triggerDragHint(expert.id);
                              } else {
                                // Multi mode max check
                                if (mainMode === 'multi' && !isSelected && selectedIds.length >= 3) {
                                  setMaxLimitMsg('다중 AI는 최대 3개까지 선택할 수 있습니다');
                                  setTimeout(() => setMaxLimitMsg(null), 2000);
                                  return;
                                }
                                onToggle(expert.id);
                              }
                            }}
                            className="flex flex-col items-center gap-1 w-full"
                          >
                            {!isProcon && isSelected && (
                              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-indigo-500 rounded-full flex items-center justify-center shadow-sm z-10">
                                <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            )}
                            <ExpertAvatar expert={expert} size="sm" />
                            <span className={cn(
                              'text-[9.5px] font-medium whitespace-nowrap truncate max-w-full leading-tight transition-colors',
                              isProcon && isPro ? 'text-blue-600 font-semibold'
                              : isProcon && isCon ? 'text-red-500 font-semibold'
                              : !isProcon && isSelected ? 'text-indigo-600 font-semibold'
                              : 'text-slate-400 group-hover:text-slate-700'
                            )}>
                              {expert.nameKo}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none rounded-r-xl" />
                </div>
                );
              })}
        </>
      </div>

      {/* Max limit message */}
      {maxLimitMsg && (
        <div className="text-center py-1.5 px-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-700 font-medium animate-in fade-in duration-200">
          {maxLimitMsg}
        </div>
      )}

      {/* ── Procon: 통합 설정 패널 ── */}
      {isProcon && (
        <ProconSettingsPanel
          experts={experts}
          proconStances={proconStances}
          dragOver={dragOver}
          draggedId={draggedId}
          setDragOver={setDragOver}
          setDraggedId={setDraggedId}
          assignStance={assignStance}
          removeStance={removeStance}
          MAX_PER_ZONE={MAX_PER_ZONE}
          debateIntensity={debateIntensity}
          onDebateIntensityChange={onDebateIntensityChange}
          debateSettings={debateSettings}
          onDebateSettingsChange={onDebateSettingsChange}
        />
      )}

      {/* ── Brainstorm: Settings Panel ── */}
      {discussionMode === 'brainstorm' && (
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
                  : <span className="text-[10px] text-slate-400">{selectedIds.length}명 참여</span>
                }
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
                  <p className="text-[11px] text-slate-400">위에서 참여할 전문가를 선택하세요</p>
                </div>
              )}
            </div>

            {/* Framework selector */}
            <div>
              <div className="text-[11px] font-bold text-slate-600 mb-2">사고 프레임워크</div>
              <div className="grid grid-cols-5 gap-1.5">
                {THINKING_FRAMEWORKS.map((fw) => (
                  <div key={fw.id} className="relative group/fw">
                    <button
                      onClick={() => onFrameworkChange?.(selectedFramework?.id === fw.id ? null : fw)}
                      className={cn(
                        'relative w-full px-2 py-2 rounded-lg text-center transition-all duration-150',
                        selectedFramework?.id === fw.id
                          ? `bg-gradient-to-br ${fw.color} ring-2 ring-slate-300`
                          : 'bg-slate-50 hover:bg-slate-100'
                      )}
                    >
                      {selectedFramework?.id === fw.id && (
                        <span className="absolute top-1 right-1 w-3 h-3 bg-slate-700 rounded-full flex items-center justify-center">
                          <Check className="w-2 h-2 text-white" />
                        </span>
                      )}
                      <div className="text-[13px]">{fw.icon}</div>
                      <div className="text-[9px] font-semibold text-slate-700 mt-0.5 leading-tight">{fw.nameKo}</div>
                    </button>
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-52 p-3 rounded-xl bg-slate-800 text-white text-[10px] leading-relaxed shadow-xl opacity-0 invisible group-hover/fw:opacity-100 group-hover/fw:visible transition-all duration-200 z-50 pointer-events-none">
                      <div className="font-bold text-[11px] mb-1">{fw.icon} {fw.nameKo} <span className="font-normal text-slate-300">({fw.name})</span></div>
                      <p className="text-slate-300 mb-2">{fw.detailDescription}</p>
                      <div className="space-y-0.5">
                        {fw.rounds.map((r, i) => (
                          <div key={i} className="text-[9px] text-slate-400"><span className="text-slate-200">{i + 1}.</span> {r.label}</div>
                        ))}
                      </div>
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-slate-800 rotate-45 -mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detail settings toggle */}
            <BrainstormDetailToggle debateSettings={debateSettings} onDebateSettingsChange={onDebateSettingsChange} />
          </div>
        </div>
      )}

      {/* ── Standard: Settings Panel ── */}
      {discussionMode === 'standard' && (
        <StandardSettingsPanel
          issues={discussionIssues}
          onIssuesChange={onDiscussionIssuesChange}
          debateIntensity={debateIntensity}
          onDebateIntensityChange={onDebateIntensityChange}
          selectedExperts={experts.filter(e => selectedIds.includes(e.id))}
        />
      )}

      {/* ── Collaboration: Role Drag Board ── */}
      {/* Chat Input */}
      <QuestionInput
        onSubmit={onSubmit}
        disabled={isDiscussing || selectedIds.length < 1}
        discussionMode={discussionMode}
        selectedExperts={(isProcon || discussionMode === 'standard' || discussionMode === 'brainstorm') ? [] : experts.filter(e => selectedIds.includes(e.id))}
        onRemoveExpert={isGeneral || isProcon ? undefined : onToggle}
      />

      {/* Suggested Questions */}
      {onSuggestedQuestion && !isGeneral && (
        <div>
          <p className="text-[10px] text-muted-foreground font-medium mb-2 px-0.5 tracking-wide">추천 질문</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {SUGGESTED_QUESTIONS.map((q, i) => {
              const participants = q.expertIds
                .map(id => experts.find(e => e.id === id))
                .filter(Boolean) as Expert[];
              return (
                <button
                  key={i}
                  onClick={() => onSuggestedQuestion(q.text, q.expertIds, q.mode)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white text-left hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm transition-all duration-150 group"
                >
                  <span className="shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">{q.icon}</span>
                  <span className="text-[12px] text-foreground/75 leading-snug flex-1">{q.text}</span>
                  {participants.length > 0 && (
                    <div className="flex -space-x-1.5 shrink-0">
                      {participants.slice(0, 3).map(e => (
                        <ExpertAvatar key={e.id} expert={e} size="sm" />
                      ))}
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
