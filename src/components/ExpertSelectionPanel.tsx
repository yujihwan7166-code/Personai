import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Expert, ExpertCategory, EXPERT_CATEGORY_LABELS, EXPERT_CATEGORY_ORDER,
  EXPERT_SUB_CATEGORIES, DiscussionMode, MainMode, DebateSubMode,
  DEBATE_SUB_MODE_LABELS, getMainMode, DebateSettings,
  THINKING_FRAMEWORKS, ThinkingFramework, DiscussionIssue,
  EXPERT_MODE_TEMPLATES, ExpertModeTemplate, ASSISTANT_CARDS, AssistantCard,
} from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { QuestionInput } from './QuestionInput';
import { cn } from '@/lib/utils';
import {
  Target, Scale, Lightbulb,
  Plus, X, Check, ChevronRight, ChevronDown, ArrowRight, Zap,
  FileText, Search, Sliders,
} from 'lucide-react';


export type ProconStance = 'pro' | 'con';

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
}

const mainModes: MainMode[] = ['general', 'multi', 'brainstorm_main', 'expert', 'debate', 'assistant', 'player'];
const debateSubModes: DebateSubMode[] = ['standard', 'procon', 'hearing'];

const mainModeLabels: Record<MainMode, string> = {
  general: '단일 AI',
  multi: '다중 AI',
  brainstorm_main: '브레인스토밍',
  expert: '전문가 상담',
  debate: '라운드테이블',
  assistant: '어시스턴트',
  player: '플레이어',
};

const debateSubIcons: Record<DebateSubMode, React.ReactNode> = {
  standard: <Target className="w-3 h-3" />,
  procon: <Scale className="w-3 h-3" />,
  brainstorm: <Lightbulb className="w-3 h-3" />,
  hearing: <Search className="w-3 h-3" />,
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
const ISSUE_TEMPLATES = ['경제적 영향', '윤리적 쟁점', '기술적 타당성', '사회적 합의', '법률적 문제', '환경적 영향', '실현 가능성', '장기적 영향'];

function StandardSettingsPanel({ issues, onIssuesChange, debateSettings, onDebateSettingsChange, selectedExperts, autoAssign, onAutoAssignChange, onToggle }: {
  issues: DiscussionIssue[];
  onIssuesChange?: (issues: DiscussionIssue[]) => void;
  debateSettings?: DebateSettings;
  onDebateSettingsChange?: (s: DebateSettings) => void;
  selectedExperts: Expert[];
  autoAssign?: boolean;
  onAutoAssignChange?: (v: boolean) => void;
  onToggle?: (id: string) => void;
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
    <div className="border border-indigo-200 rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden">
      <div className="px-4 py-2.5 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
        <span className="text-sm">🎯</span>
        <div className="text-[13px] font-bold text-indigo-800">심층 토론</div>
      </div>
      <div className="p-4 space-y-4">
        {/* Debaters */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600">토론자</span>
              {onAutoAssignChange && (
                <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-slate-100">
                  <button onClick={() => onAutoAssignChange(false)} className={cn('px-2 py-0.5 rounded text-[9px] font-semibold transition-all', !autoAssign ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400')}>직접 선택</button>
                  <button onClick={() => onAutoAssignChange(true)} className={cn('px-2 py-0.5 rounded text-[9px] font-semibold transition-all flex items-center gap-0.5', autoAssign ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400')}><Zap className="w-2.5 h-2.5" />자동</button>
                </div>
              )}
            </div>
            {!autoAssign && (selectedExperts.length < 2
              ? <span className="text-[10px] text-amber-500 font-medium">2명 이상 선택해주세요</span>
              : <span className="text-[10px] text-slate-400">{selectedExperts.length}명 참여</span>)}
          </div>
          {autoAssign ? (
            <div className="py-3 text-center rounded-lg border border-dashed border-indigo-200 bg-indigo-50/50">
              <p className="text-[11px] text-indigo-600 font-medium">질문을 입력하면 적합한 전문가가 자동 배정됩니다</p>
            </div>
          ) : selectedExperts.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedExperts.map(e => (
                <button key={e.id} type="button" onClick={() => onToggle(e.id)}
                  className="inline-flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 hover:bg-red-50 hover:border-red-200 transition-colors group cursor-pointer">
                  <div className="pointer-events-none"><ExpertAvatar expert={e} size="sm" /></div>
                  <span className="text-[11px] font-medium text-slate-700 group-hover:text-red-500 pointer-events-none">{e.nameKo}</span>
                </button>
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
function ProconSettingsPanel({ experts, selectedIds, onToggle, proconStances, dragOver, draggedId, setDragOver, setDraggedId, assignStance, removeStance, MAX_PER_ZONE, assignMode, setAssignMode, debateSettings, onDebateSettingsChange }: {
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
    <div className="border border-violet-200 rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden">
      <div className="px-4 py-2.5 bg-violet-50 border-b border-violet-100 flex items-center gap-2">
        <span className="text-sm">⚖️</span>
        <div className="text-[13px] font-bold text-violet-800">찬반 토론</div>
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
                {(() => {
                  const autoExperts = experts.filter(e => selectedIds.includes(e.id));
                  return (
                    <div className="flex flex-col items-center gap-3">
                      {/* Circle slots */}
                      <div className="flex items-center gap-3 flex-wrap justify-center">
                        {autoExperts.length > 0 ? autoExperts.map(e => (
                          <button key={e.id} type="button" onClick={() => onToggle(e.id)}
                            className="flex flex-col items-center gap-1.5 animate-in fade-in zoom-in-75 duration-200 group/auto">
                            <div className="relative w-14 h-14 rounded-full bg-violet-50 border-2 border-violet-200 flex items-center justify-center shadow-sm group-hover/auto:border-red-300 group-hover/auto:bg-red-50 transition-colors">
                              <ExpertAvatar expert={e} size="md" />
                              <div className="absolute inset-0 rounded-full bg-red-500/0 group-hover/auto:bg-red-500/10 flex items-center justify-center transition-all">
                                <X className="w-4 h-4 text-red-500 opacity-0 group-hover/auto:opacity-100 transition-opacity" />
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold text-violet-600 max-w-[64px] truncate text-center group-hover/auto:text-red-500 transition-colors">{e.nameKo}</span>
                          </button>
                        )) : (
                          <>
                            <div className="w-14 h-14 rounded-full bg-slate-50 border-2 border-dashed border-slate-200" />
                            <div className="w-14 h-14 rounded-full bg-slate-50 border-2 border-dashed border-slate-200" />
                            <div className="w-14 h-14 rounded-full bg-slate-50 border-2 border-dashed border-slate-200" />
                          </>
                        )}
                      </div>
                      {/* Helper text */}
                      <span className={cn('text-[12px] font-medium', autoExperts.length > 0 ? 'text-violet-400' : 'text-slate-400')}>
                        {autoExperts.length > 0 ? `${autoExperts.length}명 선택됨 · 더 추가하거나 토론을 시작하세요` : '위에서 전문가를 선택하거나 드래그하세요'}
                      </span>
                    </div>
                  );
                })()}
              </div>
              <div className="px-3.5 py-1.5 bg-slate-50 border-t border-slate-100">
                <p className="text-[9px] text-slate-400 text-center">토론 시작 시 AI가 주제를 분석하여 찬성/반대를 자동 배정합니다</p>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-4">
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
                  <div className={cn('px-3 py-2 flex items-center justify-between', isPro ? 'bg-blue-50' : 'bg-red-50')}>
                    <span className={cn('text-[12px] font-bold', isPro ? 'text-blue-600' : 'text-red-600')}>{isPro ? '찬성' : '반대'}</span>
                    <span className={cn('text-[10px] font-medium', isPro ? 'text-blue-400' : 'text-red-400')}>{assigned.length}/{MAX_PER_ZONE}</span>
                  </div>
                  <div className={cn('px-3 py-4 bg-white transition-colors', isOver && canDrop && (isPro ? 'bg-blue-50/30' : 'bg-red-50/30'))}>
                    <div className="flex flex-wrap gap-4 justify-center">
                      {assigned.map(id => {
                        const e = experts.find(x => x.id === id);
                        if (!e) return null;
                        return (
                          <button key={id} type="button"
                            onClick={() => removeStance(id)}
                            draggable onDragStart={() => setDraggedId(id)} onDragEnd={() => setDraggedId(null)}
                            title="클릭하면 배정 해제"
                            className="flex flex-col items-center gap-1.5 cursor-pointer animate-in fade-in zoom-in-75 duration-200 group/slot min-w-[56px]">
                            <div className="relative group-hover/slot:opacity-70 transition-opacity">
                              <ExpertAvatar expert={e} size="lg" />
                              <div className="absolute inset-0 rounded-full flex items-center justify-center transition-all">
                                <X className="w-4 h-4 text-red-500 opacity-0 group-hover/slot:opacity-100 transition-opacity" />
                              </div>
                            </div>
                            <span className={cn('text-[10px] font-semibold max-w-[64px] truncate text-center transition-colors group-hover/slot:text-red-500', isPro ? 'text-blue-600' : 'text-red-600')}>{e.nameKo}</span>
                          </button>
                        );
                      })}
                      {/* 빈칸: 아무도 없을 때만 1개 표시 */}
                      {assigned.length === 0 && (
                        <div className="flex flex-col items-center gap-1">
                          <div className={cn('w-14 h-14 rounded-full border-2 border-dashed', isPro ? 'border-blue-200 bg-blue-50/30' : 'border-red-200 bg-red-50/30')} />
                          <span className={cn('text-[10px]', isPro ? 'text-blue-300' : 'text-red-300')}>클릭 또는 드래그</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
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
    <div className="border border-amber-200 rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-visible">
      <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
        <span className="text-sm">💡</span>
        <div className="text-[13px] font-bold text-amber-800">브레인스토밍</div>
      </div>
      <div className="p-4 space-y-4">
        {/* Participants */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600">참여자</span>
              {onAutoAssignChange && (
                <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-slate-100">
                  <button onClick={() => onAutoAssignChange(false)} className={cn('px-2 py-0.5 rounded text-[9px] font-semibold transition-all', !autoAssign ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400')}>직접 선택</button>
                  <button onClick={() => onAutoAssignChange(true)} className={cn('px-2 py-0.5 rounded text-[9px] font-semibold transition-all flex items-center gap-0.5', autoAssign ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400')}><Zap className="w-2.5 h-2.5" />자동</button>
                </div>
              )}
            </div>
            {!autoAssign && (selectedIds.length < 2
              ? <span className="text-[10px] text-amber-500 font-medium">2명 이상 선택해주세요</span>
              : <span className="text-[10px] text-slate-400">{selectedIds.length}명 참여</span>)}
          </div>
          {autoAssign ? (
            <div className="py-3 text-center rounded-lg border border-dashed border-amber-200 bg-amber-50/50">
              <p className="text-[11px] text-amber-700 font-medium">질문을 입력하면 적합한 전문가가 자동 배정됩니다</p>
            </div>
          ) : selectedIds.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedIds.map(id => {
                const e = experts.find(x => x.id === id);
                return e ? (
                  <button key={id} type="button" onClick={() => onToggle(id)}
                    className="inline-flex items-center gap-1 pl-1 pr-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 hover:bg-red-50 hover:border-red-200 transition-colors group cursor-pointer">
                    <div className="pointer-events-none"><ExpertAvatar expert={e} size="sm" /></div>
                    <span className="text-[11px] font-medium text-slate-700 group-hover:text-red-500 pointer-events-none">{e.nameKo}</span>
                  </button>
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
      </div>
    </div>
  );
}

// ── Hearing (청문회) Settings ──
function HearingSettingsPanel({ experts, selectedIds, debateSettings, onDebateSettingsChange, autoAssign, onAutoAssignChange, onToggle }: {
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
    <div className="border border-emerald-200 rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.07)] overflow-hidden">
      <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
        <span className="text-sm">🏛️</span>
        <div className="text-[13px] font-bold text-emerald-800">아이디어 검증</div>
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
          ) : selected.length > 0 ? (
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
            <div className="py-3 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
              <p className="text-[11px] text-slate-400">위에서 질의할 전문가를 선택하세요</p>
            </div>
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


// ── Expert Mode Selection Panel ──
function ExpertModePanel({ onSelectTemplate, selectedTemplate, onSubmit, isDiscussing }: {
  onSelectTemplate: (t: ExpertModeTemplate | null) => void;
  selectedTemplate: ExpertModeTemplate | null;
  onSubmit: (question: string) => void;
  isDiscussing: boolean;
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
                    {template.phases.length}단계 전문가 순차 상담
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Floating Modal ── */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={() => onSelectTemplate(null)}>
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

            {/* ── Scenario cards + Input ── */}
            <div className="px-5 pb-5 pt-0 animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{ animationDelay: `${800 + selectedTemplate.phases.length * 150 + 1400}ms`, animationFillMode: 'both' }}>
              {/* Section label */}
              <div className="flex items-center gap-2 py-5 mb-0">
                <div className="h-px flex-1 bg-slate-200" />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-semibold text-slate-600">예시 질문</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              {/* Scenario example cards — 2x2 grid */}
              {(() => {
                const scenarios: Record<string, { title: string; preview: string }[]> = {
                  medical: [
                    { title: '만성 두통', preview: '3개월째 오후만 되면 편두통이 반복됩니다. 진통제를 먹어도 일시적이고...' },
                    { title: '건강검진 해석', preview: '종합검진에서 간수치(AST/ALT)가 정상범위를 초과했다는 결과를 받았습니다...' },
                    { title: '수면 장애', preview: '최근 한 달간 잠들기 어렵고 새벽에 자주 깨서 일상에 지장이 생기고 있습니다...' },
                    { title: '허리 통증', preview: '앉아서 일하는 직업인데 최근 허리와 골반 쪽 통증이 점점 심해지고 있어요...' },
                  ],
                  legal: [
                    { title: '전세보증금 반환', preview: '2년 전세 계약이 만료되어 3개월 전부터 집주인에게 이사 가겠다고 통보했습니다...' },
                    { title: '중고거래 사기', preview: '어제 중고거래 앱에서 노트북을 90만 원에 구매하기로 하고 판매자에게 돈을 입금했습니다...' },
                    { title: '학교폭력', preview: '중학교 2학년인 제 아들이 같은 반 학생들로부터 지속적인 괴롭힘을 당해왔다는 사실을...' },
                    { title: '층간소음', preview: '윗집의 층간소음 때문에 1년 넘게 고통받고 있습니다. 단순한 발망치 소리를 넘어...' },
                  ],
                  finance: [
                    { title: '사회초년생 재테크', preview: '월급 280만 원을 받는 사회초년생입니다. 저축과 투자를 어떻게 분배해야...' },
                    { title: '은퇴 자금 설계', preview: '현재 45세이고 55세에 조기은퇴를 계획하고 있습니다. 현재 자산은...' },
                    { title: '주식 vs 부동산', preview: '여유자금 5000만 원이 생겼는데 주식 투자와 부동산 투자 중 어디에...' },
                    { title: '대출 상환 전략', preview: '주택담보대출 2억, 신용대출 3천만 원이 있습니다. 어떤 순서로 갚아야...' },
                  ],
                  realestate: [
                    { title: '아파트 매수 타이밍', preview: '서울 외곽 신축 아파트를 매수하려고 합니다. 현재 시세 대비 적절한 시기인지...' },
                    { title: '전세 사기 예방', preview: '신혼부부인데 전세로 들어갈 집을 구하고 있습니다. 전세사기가 걱정되어...' },
                    { title: '재건축 투자', preview: '30년 된 강남 아파트 재건축 투자를 고민하고 있습니다. 현재 시세와 향후...' },
                    { title: '임대사업 시작', preview: '소형 원룸 건물을 매입해서 임대사업을 시작하려 합니다. 수익률 계산과...' },
                  ],
                  startup: [
                    { title: 'SaaS 사업 검증', preview: 'AI 기반 고객 분석 SaaS를 구상 중입니다. 현재 프로토타입은 완성되었고...' },
                    { title: '투자 유치 전략', preview: '시드 라운드 투자를 준비 중입니다. MAU 3,000명이고 월 매출 500만 원...' },
                    { title: '공동창업 계약', preview: '친구와 함께 창업을 준비하고 있는데 지분 배분과 역할 분담 계약서를...' },
                    { title: '피봇 결정', preview: '6개월간 운영한 서비스의 성장이 정체되어 피봇을 고려하고 있습니다...' },
                  ],
                };
                const items = scenarios[selectedTemplate.id];
                return items ? (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {items.map((ex, i) => (
                      <button key={i} type="button" onClick={() => setQuestion(ex.preview)}
                        className="text-left p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all group">
                        <p className="text-[11px] font-bold text-slate-700 mb-1">{ex.title}</p>
                        <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{ex.preview}</p>
                      </button>
                    ))}
                  </div>
                ) : null;
              })()}
              {/* Input — matching QuestionInput style */}
              <div className={cn(
                'rounded-2xl border-2 transition-all duration-200',
                question.trim() ? 'border-slate-300 shadow-[0_2px_12px_rgba(0,0,0,0.08)]' : 'border-slate-200'
              )}>
                <div className="rounded-[calc(1rem-1px)] bg-white">
                  <textarea
                    value={question}
                    onChange={e => { setQuestion(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && question.trim()) { e.preventDefault(); onSubmit(question); } }}
                    placeholder={`${selectedTemplate.name} 관련 상황을 설명해주세요...`}
                    disabled={isDiscussing}
                    autoFocus
                    rows={2}
                    className="w-full px-5 pt-4 pb-2 text-[13px] outline-none resize-none bg-transparent placeholder:text-slate-400 leading-relaxed"
                  />
                  <div className="flex items-center justify-between px-4 pb-3">
                    <span className="text-[9px] text-slate-300">Shift+Enter로 줄바꿈</span>
                    <button
                      type="button"
                      onClick={() => question.trim() && onSubmit(question)}
                      disabled={!question.trim() || isDiscussing}
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                        question.trim() ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm' : 'bg-slate-100 text-slate-400'
                      )}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
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
  onSubmit, proconStances = {}, onProconStancesChange,
  debateSettings, onDebateSettingsChange, showDebateSettings,
  selectedFramework, onFrameworkChange,
  discussionIssues = [], onDiscussionIssuesChange,
  debateIntensity = 'moderate', onDebateIntensityChange,
  onBulkSelect,
  onSampleQuestionClick,
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

  const supportsAutoAssign = discussionMode === 'standard' || discussionMode === 'brainstorm' || discussionMode === 'hearing';

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
      : mainMode === 'brainstorm_main'
        ? '사고 프레임워크를 선택하면 AI들이 협업해 정리된 결과를 제공합니다'
        : mainMode === 'expert'
          ? '전문가들이 단계별로 질문하며 최고 품질의 상담을 제공합니다'
          : mainMode === 'assistant'
            ? '목적에 맞는 AI 어시스턴트를 선택해 작업을 도와받으세요'
            : mainMode === 'player'
              ? 'AI와 함께 게임, 퀴즈, 재미있는 놀이를 즐겨보세요'
              : '2명 이상 선택 후 질문하면 토론을 거쳐 최종 결론을 도출합니다';

  const typedSubtitle = useTypewriter(subtitleText, 20);
  const isGeneral = mainMode === 'general';

  // Expert grid visibility:
  // - general/multi: all categories shown, all selectable
  // - brainstorm: all categories shown, all selectable (including AI)
  // - standard/procon: all categories shown, but AI models are grayed/disabled
  const showExpertGrid = mainMode === 'general' || mainMode === 'multi' || mainMode === 'debate' || mainMode === 'brainstorm_main';
  const isDebateMode = mainMode === 'debate';
  const isStandardOrProcon = false; // AI 모델 제한 해제
  const isBrainstorm = discussionMode === 'brainstorm';
  const isHearing = discussionMode === 'hearing';

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

  const handleMainModeChange = (m: MainMode) => {
    setAutoAssign(false);
    if (m === 'general') onModeChange('general');
    else if (m === 'multi') onModeChange('multi');
    else if (m === 'brainstorm_main') onModeChange('brainstorm');
    else if (m === 'expert') onModeChange('expert');
    else if (m === 'assistant') onModeChange('assistant');
    else if (m === 'player') onModeChange('player');
    else onModeChange('standard');
  };

  return (
    <div className="space-y-3 py-4">
      {/* Hero */}
      <div className="text-center space-y-2 relative z-0">
        <h2 key={mainMode} className="text-xl sm:text-2xl font-bold text-foreground tracking-tight animate-in fade-in duration-700">
          {mainMode === 'general' ? '모든 AI 챗봇을 한 곳에서 원하는 대로 골라 쓰세요'
            : mainMode === 'multi' ? '하나의 질문을 여러 AI에게 동시에 물어보세요'
              : mainMode === 'brainstorm_main' ? 'AI들이 협업해 아이디어를 정리해드립니다'
                : mainMode === 'expert' ? '분야별 전문가 팀이 단계별 맞춤 상담을 제공합니다'
                  : mainMode === 'assistant' ? '작업을 도와주는 AI 어시스턴트'
                    : mainMode === 'player' ? 'AI와 함께 즐기는 게임·퀴즈·놀이'
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
                    'flex items-center justify-center gap-1 min-w-0 px-3 py-[2px] rounded-full text-[11px] tracking-tight transition-all duration-200',
                    isActive ? 'bg-indigo-500 text-white font-semibold shadow-sm' : 'text-slate-600 font-medium hover:text-slate-900'
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
                  <button key={sub} onClick={() => { setAutoAssign(false); onModeChange(sub); }} disabled={isDiscussing}
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

      {discussionMode === 'standard' && (
        <StandardSettingsPanel
          issues={discussionIssues} onIssuesChange={onDiscussionIssuesChange}
          debateSettings={debateSettings} onDebateSettingsChange={onDebateSettingsChange}
          selectedExperts={experts.filter(e => selectedIds.includes(e.id))}
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
        />
      )}

      {/* Question Input — not shown for expert/assistant (they have their own inputs) */}
      {mainMode !== 'expert' && mainMode !== 'assistant' && (
        <QuestionInput
          onSubmit={autoAssign && supportsAutoAssign ? handleAutoSubmit : onSubmit}
          disabled={isDiscussing || (!autoAssign && selectedIds.length < 1) || (discussionMode === 'multi' && selectedIds.length < 2)}
          discussionMode={discussionMode}
          selectedExperts={
            (isProcon || discussionMode === 'standard' || isBrainstorm || isHearing)
              ? [] : experts.filter(e => selectedIds.includes(e.id))
          }
          onRemoveExpert={isGeneral || isProcon ? undefined : onToggle}
        />
      )}

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
