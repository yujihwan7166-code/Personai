import { useState, useEffect, useCallback, useRef } from 'react';
import { Expert, DiscussionMode } from '@/types/expert';
import { DiscussionRecord, getDiscussionHistory, deleteDiscussionFromHistory } from '@/components/DiscussionHistory';
import { cn } from '@/lib/utils';
import {
  PanelLeft, SquarePen, Bot, Search,
  SlidersHorizontal, Pencil, Trash2, Pin, PinOff, Settings,
  Sun, Moon, HelpCircle, MessageSquare, MoreHorizontal, Share2,
  FolderOpen, ChevronRight, ChevronLeft, Plus, X,
} from 'lucide-react';

interface Props {
  experts: Expert[];
  onLoadHistory: (record: DiscussionRecord) => void;
  onUpdateExperts: (experts: Expert[]) => void;
  discussionMode: DiscussionMode;
  onModeChange: (mode: DiscussionMode) => void;
  isDiscussing: boolean;
  onNewDiscussion?: () => void;
  favoriteIds?: string[];
  onSelectExpert?: (id: string) => void;
  onSidebarToggle?: (isOpen: boolean) => void;
  onStartChat?: (expertId: string, mode: 'question' | 'greeting', content: string) => void;
}

interface Project {
  id: string;
  name: string;
  icon?: string;
  createdAt: number;
}

const PROJECT_ICONS = ['📁', '💼', '📊', '📚', '🎯', '💡', '🔬', '🎨', '🏠', '✈️', '💰', '🎮', '📝', '🔧', '🌍', '❤️'];

const PROJECTS_KEY = 'ai-projects';
const PROJECT_MAP_KEY = 'ai-project-map';

function getProjects(): Project[] {
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]'); } catch { return []; }
}
function saveProjects(projects: Project[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}
function getProjectMap(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(PROJECT_MAP_KEY) || '{}'); } catch { return {}; }
}
function saveProjectMap(map: Record<string, string>) {
  localStorage.setItem(PROJECT_MAP_KEY, JSON.stringify(map));
}

const HISTORY_KEY = 'ai-debate-history-v1';

function getDateGroup(timestamp: number): string {
  const now = Date.now();
  const diffDays = Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays <= 7) return '이번 주';
  return '이전';
}

const DATE_GROUP_ORDER = ['오늘', '어제', '이번 주', '이전'];

function formatSearchDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays <= 7) {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return days[date.getDay()];
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getSearchGroup(timestamp: number): string {
  const now = Date.now();
  const diffDays = Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return '지난 7일';
  if (diffDays <= 30) return '지난 30일';
  return '더 오래된';
}

function updateDiscussionTitle(id: string, newTitle: string) {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (!saved) return;
    const records: DiscussionRecord[] = JSON.parse(saved);
    const idx = records.findIndex(r => r.id === id);
    if (idx !== -1) {
      records[idx].question = newTitle;
      localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
    }
  } catch { /* ignore */ }
}

export function AppSidebar({
  experts, onLoadHistory, onUpdateExperts,
  discussionMode, onModeChange, isDiscussing, onNewDiscussion,
  favoriteIds = [], onSelectExpert, onSidebarToggle, onStartChat,
}: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<DiscussionRecord[]>(() => getDiscussionHistory());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [hoveredRecordId, setHoveredRecordId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pinned-history') || '[]')); } catch { return new Set(); }
  });
  const togglePin = (id: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('pinned-history', JSON.stringify([...next]));
      return next;
    });
  };
  const [isMobile, setIsMobile] = useState(false);

  // Project state
  const [projects, setProjects] = useState<Project[]>(() => getProjects());
  const [projectMap, setProjectMap] = useState<Record<string, string>>(() => getProjectMap());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectIcon, setNewProjectIcon] = useState('📁');
  const [showIconPicker, setShowIconPicker] = useState<string | null>(null); // project id or 'new'
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [projectMenuId, setProjectMenuId] = useState<string | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState<string | null>(null);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  // Search modal state
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');

  // Bot browser modal state
  const [showBotBrowser, setShowBotBrowser] = useState(false);
  const [botBrowserCat, setBotBrowserCat] = useState('전체');
  const [selectedBotProfile, setSelectedBotProfile] = useState<string | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Notify parent of sidebar state
  useEffect(() => {
    onSidebarToggle?.(isOpen);
  }, [isOpen, onSidebarToggle]);

  // Refresh history
  const refreshHistory = useCallback(() => {
    setHistoryRecords(getDiscussionHistory());
  }, []);

  // Refresh on focus
  useEffect(() => {
    const handleFocus = () => refreshHistory();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshHistory]);

  // Refresh periodically (every 5s)
  useEffect(() => {
    const interval = setInterval(refreshHistory, 5000);
    return () => clearInterval(interval);
  }, [refreshHistory]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpenId) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpenId]);

  // Close project menu on outside click
  useEffect(() => {
    if (!projectMenuId) return;
    const handleClick = () => setProjectMenuId(null);
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [projectMenuId]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Focus search input when search opens
  useEffect(() => {
    if (searchVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchVisible]);

  // Ctrl+K / Cmd+K to open search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(true);
        setModalSearchQuery('');
      }
      if (e.key === 'Escape' && searchModalOpen) {
        setSearchModalOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchModalOpen]);

  const toggleSidebar = () => setIsOpen(prev => !prev);

  const handleDeleteHistory = (id: string) => {
    deleteDiscussionFromHistory(id);
    setHistoryRecords(prev => prev.filter(r => r.id !== id));
    // 프로젝트 매핑에서도 제거 (카운트 갱신)
    if (projectMap[id]) removeFromProject(id);
    setDeletingId(null);
    if (activeRecordId === id) setActiveRecordId(null);
  };

  const startEditing = (record: DiscussionRecord) => {
    setEditingId(record.id);
    setEditTitle(record.question);
  };

  const saveEditing = () => {
    if (editingId && editTitle.trim()) {
      updateDiscussionTitle(editingId, editTitle.trim());
      setHistoryRecords(prev =>
        prev.map(r => r.id === editingId ? { ...r, question: editTitle.trim() } : r)
      );
    }
    setEditingId(null);
    setEditTitle('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const handleLoadHistory = (record: DiscussionRecord) => {
    setActiveRecordId(record.id);
    onLoadHistory(record);
    if (isMobile) setIsOpen(false);
  };

  const handleNewDiscussion = () => {
    setActiveRecordId(null);
    onNewDiscussion?.();
    refreshHistory();
  };

  const toggleDarkMode = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  const toggleSearch = () => {
    setSearchVisible(prev => !prev);
    if (searchVisible) {
      setSearchQuery('');
    }
  };

  // Project CRUD
  const createProject = () => {
    if (!newProjectName.trim()) return;
    const project: Project = { id: `proj-${Date.now()}`, name: newProjectName.trim(), icon: newProjectIcon, createdAt: Date.now() };
    const updated = [...projects, project];
    setProjects(updated);
    saveProjects(updated);
    setNewProjectName('');
    setNewProjectIcon('📁');
    setCreatingProject(false);
  };

  const deleteProject = (id: string) => {
    setProjects(prev => { const updated = prev.filter(p => p.id !== id); saveProjects(updated); return updated; });
    setProjectMap(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => { if (updated[k] === id) delete updated[k]; });
      saveProjectMap(updated);
      return updated;
    });
    if (activeProjectId === id) setActiveProjectId(null);
    setProjectMenuId(null);
  };

  const renameProject = (id: string) => {
    if (!editProjectName.trim()) return;
    setProjects(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, name: editProjectName.trim() } : p);
      saveProjects(updated);
      return updated;
    });
    setEditingProjectId(null);
  };

  const moveToProject = (conversationId: string, projectId: string) => {
    setProjectMap(prev => {
      const updated = { ...prev, [conversationId]: projectId };
      saveProjectMap(updated);
      return updated;
    });
    setMenuOpenId(null);
  };

  const removeFromProject = (conversationId: string) => {
    setProjectMap(prev => {
      const updated = { ...prev };
      delete updated[conversationId];
      saveProjectMap(updated);
      return updated;
    });
  };

  // Filter by search and project
  const filteredHistory = (() => {
    let records = historyRecords;
    if (searchQuery) {
      records = records.filter(r => r.question.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    // 프로젝트 필터 제거 — 트리 형태로 보여주므로 모든 대화 항상 표시
    return records;
  })();

  // Group by date
  const groupedRecords = (() => {
    const groups: Record<string, DiscussionRecord[]> = {};
    filteredHistory.forEach(r => {
      const group = getDateGroup(r.timestamp);
      if (!groups[group]) groups[group] = [];
      groups[group].push(r);
    });
    return DATE_GROUP_ORDER
      .filter(label => groups[label]?.length)
      .map(label => ({ label, items: groups[label] }));
  })();

  const renderConversationItem = (record: DiscussionRecord) => {
    const isActive = activeRecordId === record.id;
    const isHovered = hoveredRecordId === record.id;
    const isDeleting = deletingId === record.id;
    const isEditing = editingId === record.id;

    // Find the first expert for the avatar icon
    const firstExpert = experts.find(e => record.expertIds?.includes(e.id));

    // 삭제 확인은 플로팅 모달로 처리 (아래 별도 렌더)

    return (
      <div
        key={record.id}
        onMouseEnter={() => setHoveredRecordId(record.id)}
        onMouseLeave={() => setHoveredRecordId(null)}
        className={cn(
          'px-2.5 py-[6px] rounded-lg flex items-center gap-2.5 cursor-pointer transition-colors mx-1.5 h-8',
          isActive
            ? 'bg-slate-100 dark:bg-slate-800'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800',
        )}
        onClick={() => !isEditing && handleLoadHistory(record)}
      >
        {/* AI model icon circle */}
        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 text-[10px]">
          {firstExpert?.icon || firstExpert?.nameKo?.[0] || (
            <Bot className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          )}
        </div>

        {/* Conversation title or edit input */}
        {isEditing ? (
          <input
            ref={editInputRef}
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') saveEditing();
              if (e.key === 'Escape') cancelEditing();
            }}
            onBlur={saveEditing}
            onClick={e => e.stopPropagation()}
            className="flex-1 min-w-0 text-[13px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5 outline-none focus:border-blue-400 dark:focus:border-blue-500"
          />
        ) : (
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            <span className="text-[12px] text-slate-600 dark:text-slate-400 truncate">
              {record.question}
            </span>
            {record.mode && record.mode !== 'general' && (
              <span className={cn("shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full", {
                'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400': record.mode === 'multi',
                'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400': record.mode === 'brainstorm',
                'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400': record.mode === 'standard' || record.mode === 'procon',
                'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400': record.mode === 'hearing',
                'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400': record.mode === 'freetalk',
                'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400': record.mode === 'stakeholder',
                'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400': record.mode === 'expert',
                'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400': record.mode === 'assistant',
              } as Record<string, boolean>)}>
                {{ multi: '멀티', brainstorm: '브레인', standard: '토론', procon: '찬반', hearing: '검증', freetalk: '자유', stakeholder: 'AI시뮬', expert: '상담', assistant: '어시' }[record.mode] || record.mode}
              </span>
            )}
          </div>
        )}

        {/* ⋯ 더보기 메뉴 */}
        {!isEditing && (isHovered || isActive || menuOpenId === record.id) && (
          <div className="relative shrink-0" ref={menuOpenId === record.id ? menuRef : undefined}>
            <button
              onClick={e => {
                e.stopPropagation();
                if (menuOpenId === record.id) { setMenuOpenId(null); return; }
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                // 화면 하단에 가까우면 위로 펼침
                const spaceBelow = window.innerHeight - rect.bottom;
                const menuH = 220;
                setMenuPos({
                  top: spaceBelow < menuH ? rect.top - menuH : rect.bottom + 4,
                  left: rect.right - 176, // w-44 = 176px, 오른쪽 정렬
                });
                setMenuOpenId(record.id);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpenId === record.id && (
              <div className="fixed w-44 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg animate-in fade-in zoom-in-95 duration-150 z-[100]"
                style={{ top: menuPos.top, left: Math.max(8, menuPos.left) }}>
                <button
                  onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(record.question); setMenuOpenId(null); }}
                  className="w-full px-3 py-2 text-left text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors"
                >
                  <Share2 className="w-4 h-4 text-slate-400" /> 공유하기
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpenId(null); startEditing(record); }}
                  className="w-full px-3 py-2 text-left text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors"
                >
                  <Pencil className="w-4 h-4 text-slate-400" /> 이름 바꾸기
                </button>
                <button
                  onClick={e => { e.stopPropagation(); togglePin(record.id); setMenuOpenId(null); }}
                  className="w-full px-3 py-2 text-left text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors"
                >
                  {pinnedIds.has(record.id)
                    ? <><PinOff className="w-4 h-4 text-slate-400" /> 고정 해제</>
                    : <><Pin className="w-4 h-4 text-slate-400" /> 채팅 상단 고정</>
                  }
                </button>
                {/* 프로젝트로 이동 — Portal 스타일 서브메뉴 */}
                <div className="relative">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (showProjectPicker === record.id) { setShowProjectPicker(null); return; }
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setPickerPos({ top: rect.top, left: rect.right });
                      setShowProjectPicker(record.id);
                    }}
                    onMouseEnter={e => {
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setPickerPos({ top: rect.top, left: rect.right });
                      setShowProjectPicker(record.id);
                    }}
                    onMouseLeave={() => { setTimeout(() => { if (!document.querySelector('[data-project-picker]:hover')) setShowProjectPicker(null); }, 100); }}
                    className="w-full px-3 py-2 text-left text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors"
                  >
                    <FolderOpen className="w-4 h-4 text-slate-400" /> 프로젝트로 이동
                    <ChevronRight className="w-3 h-3 text-slate-400 ml-auto" />
                  </button>
                  {showProjectPicker === record.id && (
                    <div data-project-picker
                      onMouseLeave={() => setShowProjectPicker(null)}
                      className="fixed w-44 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg animate-in fade-in zoom-in-95 duration-100 z-[100]"
                      style={{ top: pickerPos.top, left: pickerPos.left }}
                    >
                      {projects.map(p => (
                        <button
                          key={p.id}
                          onClick={e => { e.stopPropagation(); moveToProject(record.id, p.id); setShowProjectPicker(null); setMenuOpenId(null); }}
                          className={cn(
                            "w-full px-3 py-1.5 text-left text-[12px] hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors",
                            projectMap[record.id] === p.id ? 'text-blue-500 font-medium' : 'text-slate-600 dark:text-slate-400'
                          )}
                        >
                          {p.icon || '📁'} {p.name}
                          {projectMap[record.id] === p.id && <span className="ml-auto text-blue-500">✓</span>}
                        </button>
                      ))}
                      {projectMap[record.id] && (
                        <button
                          onClick={e => { e.stopPropagation(); removeFromProject(record.id); setShowProjectPicker(null); setMenuOpenId(null); }}
                          className="w-full px-3 py-1.5 text-left text-[12px] text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-700"
                        >
                          프로젝트에서 제거
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); setShowProjectPicker(null); setMenuOpenId(null); setCreatingProject(true); setNewProjectName(''); }}
                        className="w-full px-3 py-1.5 text-left text-[12px] text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-700"
                      >
                        <Plus className="w-3 h-3" /> 새 프로젝트
                      </button>
                    </div>
                  )}
                </div>
                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpenId(null); setDeletingId(record.id); }}
                  className="w-full px-3 py-2 text-left text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> 삭제
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar — 열림: 260px / 닫힘: 아이콘 미니모드 48px */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-300 ease-out',
          'bg-white dark:bg-[#0f0f0f]',
          'border-r border-slate-200 dark:border-slate-800',
          'md:relative',
          isOpen ? 'w-[260px]' : 'w-[48px]',
          // 모바일: 닫힘=완전 숨김
          !isOpen && 'max-md:-translate-x-full',
        )}
      >
        {/* ── 1. Header ── */}
        <div className={cn("shrink-0 flex items-center py-2.5 transition-all duration-300", isOpen ? 'justify-between px-3' : 'justify-center px-0')}>
          {isOpen ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-slate-900 dark:bg-white flex items-center justify-center shrink-0">
                  <span className="text-white dark:text-slate-900 text-sm font-bold">P</span>
                </div>
                <span className="text-[15px] font-bold text-slate-900 dark:text-white tracking-tight">Personai</span>
              </div>
              <button onClick={toggleSidebar} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <PanelLeft className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button onClick={toggleSidebar} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <PanelLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ── 2. Navigation Menu ── */}
        <nav className={cn("shrink-0 space-y-0.5", isOpen ? 'px-2' : 'px-1')}>
          {[
            { icon: SquarePen, label: '새 채팅', onClick: handleNewDiscussion, highlight: true },
            { icon: Bot, label: 'AI 봇', onClick: () => setShowBotBrowser(true) },
            { icon: Search, label: '검색', onClick: () => { setSearchModalOpen(true); setModalSearchQuery(''); }, active: searchModalOpen },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.onClick}
              title={!isOpen ? item.label : undefined}
              className={cn(
                "font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center transition-colors w-full",
                isOpen ? 'px-3 py-2 gap-2.5 text-[13px]' : 'p-2 justify-center',
                item.highlight && 'bg-slate-50 dark:bg-slate-800/50',
                item.active && 'bg-slate-100 dark:bg-slate-800',
              )}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {isOpen && <span>{item.label}</span>}
            </button>
          ))}

          {/* Search input removed from here — moved to conversation list header */}
        </nav>

        {/* ── 3. Section Divider ── */}
        {isOpen && <div className="border-t border-slate-200 dark:border-slate-800 my-2" />}

        {/* ── Projects Section ── */}
        {isOpen && (
          <div className="shrink-0 px-1.5">
            {/* Header */}
            <div className="flex items-center justify-between px-2 py-1.5">
              <button
                onClick={() => setProjectsExpanded(!projectsExpanded)}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <ChevronRight className={cn("w-3 h-3 transition-transform", projectsExpanded && "rotate-90")} />
                프로젝트
              </button>
              <button
                onClick={() => { setCreatingProject(true); setNewProjectName(''); }}
                className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Project creation input */}
            {creatingProject && (
              <div className="px-1 pb-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowIconPicker(showIconPicker === 'new' ? null : 'new')}
                    className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[14px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
                  >
                    {newProjectIcon}
                  </button>
                  <input
                    autoFocus
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') createProject(); if (e.key === 'Escape') { setCreatingProject(false); setShowIconPicker(null); } }}
                    onBlur={() => { if (!showIconPicker) { if (newProjectName.trim()) createProject(); else setCreatingProject(false); } }}
                    placeholder="프로젝트 이름..."
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[12px] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600"
                  />
                </div>
                {showIconPicker === 'new' && (
                  <div className="flex flex-wrap gap-1 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    {PROJECT_ICONS.map(icon => (
                      <button key={icon} onClick={() => { setNewProjectIcon(icon); setShowIconPicker(null); }}
                        className={cn("w-7 h-7 rounded-md flex items-center justify-center text-[14px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors", newProjectIcon === icon && 'bg-slate-200 dark:bg-slate-700 ring-1 ring-blue-400')}>
                        {icon}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Project list */}
            {projectsExpanded && projects.map(project => {
              const convCount = Object.values(projectMap).filter(pid => pid === project.id).length;
              const isActive = activeProjectId === project.id;
              const isEditing = editingProjectId === project.id;

              return (
                <div key={project.id}>
                <div
                  className={cn(
                    "px-2.5 py-[5px] rounded-lg flex items-center gap-2 cursor-pointer transition-colors mx-0.5 h-7 group",
                    isActive ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                  )}
                  onClick={() => !isEditing && setActiveProjectId(isActive ? null : project.id)}
                >
                  <span className="text-[12px] shrink-0">{project.icon || '📁'}</span>
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editProjectName}
                      onChange={e => setEditProjectName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') renameProject(project.id); if (e.key === 'Escape') setEditingProjectId(null); }}
                      onBlur={() => renameProject(project.id)}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 min-w-0 text-[12px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5 outline-none focus:border-blue-400"
                    />
                  ) : (
                    <span className="text-[12px] text-slate-600 dark:text-slate-400 truncate flex-1">{project.name}</span>
                  )}
                  {convCount > 0 && !isEditing && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{convCount}</span>
                  )}
                  {/* Project menu */}
                  {!isEditing && (
                    <div className="relative shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (projectMenuId === project.id) { setProjectMenuId(null); return; }
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setMenuPos({ top: rect.bottom + 4, left: rect.left });
                          setProjectMenuId(project.id);
                        }}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                      {projectMenuId === project.id && (
                        <div className="fixed w-40 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg animate-in fade-in zoom-in-95 duration-150 z-[100]"
                          style={{ top: menuPos.top, left: menuPos.left }}>
                          <button
                            onClick={e => { e.stopPropagation(); setEditingProjectId(project.id); setEditProjectName(project.name); setProjectMenuId(null); }}
                            className="w-full px-3 py-1.5 text-left text-[12px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-400" /> 이름 변경
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setProjectMenuId(null); setTimeout(() => setShowIconPicker(project.id), 50); }}
                            className="w-full px-3 py-1.5 text-left text-[12px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                          >
                            <span className="w-3.5 h-3.5 flex items-center justify-center text-[11px]">{project.icon || '📁'}</span> 아이콘 변경
                          </button>
                          <div className="my-0.5 border-t border-slate-100 dark:border-slate-700" />
                          <button
                            onClick={e => { e.stopPropagation(); deleteProject(project.id); }}
                            className="w-full px-3 py-1.5 text-left text-[12px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> 삭제
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* 프로젝트 클릭 시 아래로 대화 펼침 */}
                {isActive && (
                  historyRecords.filter(r => projectMap[r.id] === project.id).length === 0 ? (
                    <div className="ml-6 pl-2 border-l border-slate-200 dark:border-slate-700 py-1">
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 px-2 py-1">대화가 없습니다</p>
                    </div>
                  ) : (
                    <div className="ml-6 pl-2 border-l border-slate-200 dark:border-slate-700 py-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      {historyRecords.filter(r => projectMap[r.id] === project.id).map(r => {
                        const expert = experts.find(e => r.expertIds?.includes(e.id));
                        return (
                          <button
                            key={r.id}
                            onClick={e => { e.stopPropagation(); handleLoadHistory(r); }}
                            className={cn(
                              "w-full px-2 py-1 rounded-md flex items-center gap-2 text-left transition-colors",
                              activeRecordId === r.id ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            )}
                          >
                            <span className="text-[10px] shrink-0">{expert?.icon || '💬'}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{r.question}</span>
                          </button>
                        );
                      })}
                    </div>
                  )
                )}
                </div>
              );
            })}

            {/* No projects yet */}
            {projectsExpanded && projects.length === 0 && !creatingProject && (
              <button
                onClick={() => { setCreatingProject(true); setNewProjectName(''); }}
                className="w-full px-2.5 py-[5px] rounded-lg flex items-center gap-2 text-[12px] text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mx-0.5"
              >
                <Plus className="w-3.5 h-3.5" /> 새 프로젝트
              </button>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingId && (() => {
          const record = historyRecords.find(r => r.id === deletingId);
          return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={() => setDeletingId(null)}>
              <div className="absolute inset-0 bg-black/20"></div>
              <div onClick={e => e.stopPropagation()} className="relative w-72 p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                <p className="text-[14px] font-semibold text-slate-700 dark:text-slate-300 mb-1">대화를 삭제할까요?</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4 truncate">{record?.question}</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setDeletingId(null)} className="px-3.5 py-1.5 text-[12px] font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">취소</button>
                  <button onClick={() => handleDeleteHistory(deletingId)} className="px-3.5 py-1.5 text-[12px] font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">삭제</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Icon Picker Modal */}
        {showIconPicker && showIconPicker !== 'new' && (() => {
          const proj = projects.find(p => p.id === showIconPicker);
          if (!proj) return null;
          return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={() => setShowIconPicker(null)}>
              <div className="absolute inset-0 bg-black/20" />
              <div onClick={e => e.stopPropagation()} className="relative w-64 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-3">{proj.name} 아이콘 선택</p>
                <div className="flex flex-wrap gap-1.5">
                  {PROJECT_ICONS.map(icon => (
                    <button key={icon} onClick={() => {
                      setProjects(prev => { const updated = prev.map(p => p.id === proj.id ? { ...p, icon } : p); saveProjects(updated); return updated; });
                      setShowIconPicker(null);
                    }} className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-[18px] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors", (proj.icon || '📁') === icon && 'bg-slate-100 dark:bg-slate-700 ring-2 ring-blue-400')}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── 4. Conversation List Header ── */}
        {isOpen && <div className="shrink-0 px-2 py-1.5">
          {searchVisible ? (
            <div className="flex items-center gap-1.5">
              <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); refreshHistory(); }}
                  placeholder="대화 검색..."
                  className="flex-1 min-w-0 bg-transparent text-[12px] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 outline-none"
                />
              </div>
              <button onClick={toggleSearch} className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">모든 대화</span>
              <button className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>}

        {/* ── 5. Conversation List (scrollable) — 미니모드에서는 숨김 ── */}
        {isOpen &&
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin py-1">
          {/* 고정된 대화 */}
          {(() => {
            const pinned = filteredHistory.filter(r => pinnedIds.has(r.id));
            if (pinned.length === 0) return null;
            return (
              <div className="mb-1">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 pt-2 pb-1 flex items-center gap-1">
                  <Pin className="w-3 h-3" /> 고정됨
                </p>
                {pinned.map(r => renderConversationItem(r))}
                <div className="border-b border-slate-200 dark:border-slate-800 mx-3 mt-1" />
              </div>
            );
          })()}

          {/* 날짜별 그룹 (고정된 건 제외) */}
          {groupedRecords.map(group => {
            const unpinned = group.items.filter(r => !pinnedIds.has(r.id));
            if (unpinned.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 pt-3 pb-1">
                  {group.label}
                </p>
                {unpinned.map(r => renderConversationItem(r))}
              </div>
            );
          })}

          {/* Empty state */}
          {filteredHistory.length === 0 && (
            <div className="px-4 py-12 text-center">
              {searchQuery ? (
                <>
                  <Search className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-[13px] text-slate-400 dark:text-slate-500">검색 결과가 없습니다</p>
                </>
              ) : (
                <>
                  <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-[13px] font-medium text-slate-400 dark:text-slate-500">대화 기록이 없습니다</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1">새 채팅을 시작해보세요</p>
                </>
              )}
            </div>
          )}
        </div>}

        {/* ── 6. Bottom Section — 마누스 스타일 ── */}
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800">
          <div className={cn("flex items-center", isOpen ? 'px-2 py-2 justify-between' : 'px-1 py-2 flex-col gap-1 justify-center')}>
            <button className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" title="설정">
              <Settings className="w-[18px] h-[18px]" />
            </button>
            <button onClick={toggleDarkMode} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" title="다크모드">
              <Moon className="w-[18px] h-[18px] dark:hidden" />
              <Sun className="w-[18px] h-[18px] hidden dark:block" />
            </button>
            <button className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" title="도움말">
              <HelpCircle className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </aside>

      {/* Manus-style Search Modal */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-20" onClick={() => setSearchModalOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" />

          {/* Modal */}
          <div
            className="relative w-full max-w-[560px] mx-4 rounded-xl bg-white dark:bg-[#1a1a1a] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                autoFocus
                value={modalSearchQuery}
                onChange={e => setModalSearchQuery(e.target.value)}
                placeholder="작업 검색..."
                className="flex-1 text-[14px] text-slate-900 dark:text-white bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <kbd className="hidden sm:inline text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono">ESC</kbd>
              <button onClick={() => setSearchModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[50vh] overflow-y-auto">
              {/* New Chat button */}
              <button
                onClick={() => { setSearchModalOpen(false); onNewDiscussion?.(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/50"
              >
                <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">새 작업</span>
              </button>

              {/* Filtered conversation list grouped by date */}
              {(() => {
                const query = modalSearchQuery.toLowerCase();
                const filtered = historyRecords.filter(r =>
                  !query || r.question.toLowerCase().includes(query)
                );

                if (filtered.length === 0) {
                  return (
                    <div className="px-5 py-12 text-center">
                      <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-[14px] text-slate-400 dark:text-slate-500">
                        {query ? '검색 결과가 없습니다' : '대화 기록이 없습니다'}
                      </p>
                    </div>
                  );
                }

                // Group by search date groups
                const groups: Record<string, typeof filtered> = {};
                filtered.forEach(r => {
                  const group = getSearchGroup(r.timestamp);
                  if (!groups[group]) groups[group] = [];
                  groups[group].push(r);
                });

                const groupOrder = ['지난 7일', '지난 30일', '더 오래된'];

                return groupOrder
                  .filter(label => groups[label]?.length)
                  .map(label => (
                    <div key={label}>
                      <div className="px-4 pt-3 pb-1">
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</span>
                      </div>
                      {groups[label].map(record => {
                        const firstExpert = experts.find(e => record.expertIds?.includes(e.id));
                        // Get preview text from first message content (if available)
                        const preview = record.messages?.[1]?.content?.slice(0, 100) || record.messages?.[0]?.content?.slice(0, 100) || '';
                        const msgCount = record.messages?.length || 0;
                        const expertName = firstExpert?.nameKo || 'AI';

                        return (
                          <button
                            key={record.id}
                            onClick={() => { handleLoadHistory(record); setSearchModalOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group"
                          >
                            {/* AI icon */}
                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-[13px]">
                              {firstExpert?.icon || <Bot className="w-3.5 h-3.5 text-slate-400" />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-slate-900 dark:group-hover:text-white">
                                  {record.question}
                                </p>
                              </div>
                              {preview && (
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{preview}</p>
                              )}
                            </div>

                            {/* Date */}
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
                              {formatSearchDate(record.timestamp)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Bot Browser Modal */}
      {showBotBrowser && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-8" onClick={() => { setShowBotBrowser(false); setSelectedBotProfile(null); }}>
          <div className="absolute inset-0 bg-black/30"></div>
          <div
            className="relative w-full max-w-[640px] max-h-[85vh] mx-4 rounded-xl bg-white dark:bg-[#1a1a1a] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-[15px] font-bold text-slate-800 dark:text-white">AI 봇 둘러보기</h3>
              <button onClick={() => setShowBotBrowser(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category tabs */}
            <div className="shrink-0 flex gap-1 px-4 py-2 border-b border-slate-100 dark:border-slate-800/50 overflow-x-auto scrollbar-none">
              {['전체', '인기', 'AI 모델', '전문가', '직업', '인물', '캐릭터', '신화', '이념', '철학/종교'].map(cat => (
                <button key={cat}
                  onClick={() => setBotBrowserCat(cat)}
                  className={cn("px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors shrink-0",
                    botBrowserCat === cat ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >{cat}</button>
              ))}
            </div>

            {/* Bot grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {experts
                  .filter(e => {
                    if (botBrowserCat === '전체') return true;
                    if (botBrowserCat === '인기') return ['gpt','claude','gemini','sherlock','doctor','lawyer'].includes(e.id);
                    const catMap: Record<string, string> = { 'AI 모델': 'ai', '전문가': 'specialist', '직업': 'occupation', '인물': 'celebrity', '캐릭터': 'fictional', '신화': 'mythology', '이념': 'ideology', '철학/종교': 'religion' };
                    return e.category === catMap[botBrowserCat];
                  })
                  .map(expert => (
                    <button
                      key={expert.id}
                      onClick={() => setSelectedBotProfile(expert.id)}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700 transition-all text-left group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[16px] shrink-0 group-hover:scale-110 transition-transform overflow-hidden">
                        {expert.avatarUrl ? (
                          <img src={expert.avatarUrl} alt={expert.nameKo} className="w-full h-full object-cover" />
                        ) : expert.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 dark:text-white truncate">{expert.nameKo}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{expert.quote || expert.description}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

          {/* Bot Profile Card Overlay */}
            {selectedBotProfile && (() => {
              const bot = experts.find(e => e.id === selectedBotProfile);
              if (!bot) return null;
              return (
                <div className="absolute inset-0 z-10 bg-white dark:bg-[#1a1a1a] flex flex-col animate-in fade-in duration-200">
                  {/* Back button */}
                  <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                    <button onClick={() => setSelectedBotProfile(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-[13px] font-medium text-slate-500">봇 목록으로</span>
                  </div>

                  {/* Profile */}
                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="flex flex-col items-center text-center mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[32px] mb-3 overflow-hidden">
                        {bot.avatarUrl ? (
                          <img src={bot.avatarUrl} alt={bot.nameKo} className="w-full h-full object-cover" />
                        ) : bot.icon}
                      </div>
                      <h3 className="text-[18px] font-bold text-slate-800 dark:text-white">{bot.nameKo}</h3>
                      <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">{bot.description}</p>
                      {bot.quote && (
                        <p className="text-[12px] text-indigo-500 dark:text-indigo-400 font-medium mt-2 italic">"{bot.quote}"</p>
                      )}
                    </div>

                    {/* Sample Questions */}
                    {bot.sampleQuestions && bot.sampleQuestions.length > 0 && (
                      <div className="mb-6">
                        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">추천 질문</p>
                        <div className="space-y-1.5">
                          {bot.sampleQuestions.map((q, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setShowBotBrowser(false);
                                setSelectedBotProfile(null);
                                onStartChat?.(bot.id, 'question', q);
                              }}
                              className="w-full text-left px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[12px] text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:border-indigo-200 dark:hover:border-indigo-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Info */}
                    <div className="space-y-2 mb-6">
                      {bot.subCategory && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">분야</span>
                          <span className="text-slate-600 dark:text-slate-300 font-medium">{bot.subCategory}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">카테고리</span>
                        <span className="text-slate-600 dark:text-slate-300 font-medium">{bot.category}</span>
                      </div>
                    </div>

                    {/* Start Chat Button */}
                    <button
                      onClick={() => {
                        const defaultGreetings: Record<string, string> = {
                          ai: '안녕하세요! 무엇이든 물어보세요.',
                          specialist: '안녕하세요! 전문 분야에 대해 물어보세요.',
                          occupation: '안녕하세요! 현장 경험을 바탕으로 답해드릴게요.',
                          celebrity: '반갑습니다. 어떤 이야기를 나눠볼까요?',
                          fictional: '어서 오게. 무슨 이야기를 듣고 싶은가?',
                          mythology: '인간이여, 무엇이 궁금한가?',
                          ideology: '어떤 주제에 대해 논해볼까요?',
                          religion: '어떤 질문이든 함께 생각해보겠습니다.',
                          lifestyle: '안녕하세요! 어떤 고민이 있으세요?',
                          perspective: '뭐, 한번 들어볼게.',
                          region: '안녕하세요! 문화에 대해 이야기해볼까요?',
                        };
                        const greeting = bot.greeting || defaultGreetings[bot.category] || '안녕하세요! 무엇이 궁금하신가요?';
                        setShowBotBrowser(false);
                        setSelectedBotProfile(null);
                        onStartChat?.(bot.id, 'greeting', greeting);
                      }}
                      className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-[14px] transition-colors shadow-md"
                    >
                      대화 시작하기
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
