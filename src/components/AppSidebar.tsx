import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Expert, DiscussionMode, AIAbilityStats } from '@/types/expert';
import { DiscussionRecord, deleteDiscussionFromHistory, getDiscussionHistory } from '@/lib/discussionHistoryStore';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { ExpertAvatar } from './ExpertAvatar';
import { AIAbilityRadar } from './AIAbilityRadar';
import {
  PanelLeft, House, Bot, Search,
  SlidersHorizontal, Pencil, Trash2, Pin, PinOff, Settings,
  Sun, Moon, HelpCircle, MessageSquare, MoreHorizontal, Share2,
  FolderOpen, ChevronRight, Plus, X,
  LogOut, Shield, User, ExternalLink, Command as CommandIcon,
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

type SettingsSection = 'general' | 'notifications' | 'models' | 'personal' | 'data' | 'shortcuts';

type SidebarSettings = {
  theme: 'light' | 'dark' | 'system';
  language: 'ko' | 'en' | 'auto';
  defaultModel: 'auto' | 'gpt' | 'gemini' | 'claude' | 'manus' | 'genspark';
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  responseStyle: 'concise' | 'balanced' | 'detailed';
  compactUi: boolean;
  saveHistory: boolean;
  fontSize: 'small' | 'medium' | 'large';
  streamingEnabled: boolean;
  autoSave: boolean;
};

const PROJECT_ICONS = ['📁', '💼', '📊', '📚', '🎯', '💡', '🔬', '🎨', '🏠', '✈️', '💰', '🎮', '📝', '🔧', '🌍', '❤️'];

/* ── 봇 브라우저 툴팁 능력치 섹션 (레이더 + 바) ── */
const BOT_TIP_BAR_COLORS: Record<string, string> = {
  blue: 'bg-blue-400', emerald: 'bg-emerald-400', red: 'bg-red-400', amber: 'bg-amber-400',
  purple: 'bg-purple-400', orange: 'bg-orange-400', teal: 'bg-teal-400', pink: 'bg-pink-400',
  slate: 'bg-slate-400', green: 'bg-green-400', cyan: 'bg-cyan-400', sky: 'bg-sky-400',
};
const BOT_TIP_STATS: { key: string; label: string }[] = [
  { key: 'coding', label: '코딩' }, { key: 'creativity', label: '창의성' },
  { key: 'reasoning', label: '추론력' }, { key: 'math', label: '수학' },
  { key: 'multilingual', label: '다국어' }, { key: 'speed', label: '속도' },
  { key: 'costEfficiency', label: '비용효율' }, { key: 'contextWindow', label: '토큰용량' },
];
function BotTipAbilitySection({ abilities, color, name }: { abilities: AIAbilityStats; color: string; name: string }) {
  const bc = BOT_TIP_BAR_COLORS[color] || 'bg-indigo-400';
  return (
    <div className="pb-1.5">
      <div className="px-1.5">
        <AIAbilityRadar abilities={abilities} color={color} name={name} size="sm" />
      </div>
      <div className="space-y-[2px] -mt-1 pl-2 pr-3.5">
        {BOT_TIP_STATS.map(({ key, label }) => {
          const v = abilities[key as keyof typeof abilities];
          return (
            <div key={key} className="flex items-center gap-1">
              <span className="text-[7px] text-slate-400 w-[34px] text-center shrink-0">{label}</span>
              <div className="flex-1 h-[3px] bg-white/10 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full', v >= 90 ? 'bg-amber-400' : bc)} style={{ width: `${v}%` }} />
              </div>
              <span className={cn('text-[7px] w-[16px] text-right tabular-nums', v >= 95 ? 'text-amber-400 font-bold' : v >= 85 ? 'text-white font-semibold' : 'text-slate-400')}>{v}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   프로젝트 컨텍스트 메뉴 (v2 — 독립 컴포넌트)
   ────────────────────────────────────────────── */
function ProjectContextMenu({ projectMenuId, menuPos, projects, onRename, onIconChange, onDelete, onClose }: {
  projectMenuId: string | null;
  menuPos: { top: number; left: number };
  projects: { id: string; name: string; icon?: string }[];
  onRename: (id: string, name: string) => void;
  onIconChange: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectMenuId) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // 다음 틱에서 리스너 등록 (메뉴 열기 클릭이 바로 닫히지 않도록)
    const timer = setTimeout(() => document.addEventListener('mousedown', handle), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handle); };
  }, [projectMenuId, onClose]);

  if (!projectMenuId) return null;
  const proj = projects.find(p => p.id === projectMenuId);
  if (!proj) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed w-40 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg z-[9999] animate-in fade-in zoom-in-95 duration-150"
      style={{ top: menuPos.top, left: menuPos.left }}
    >
      <button
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onRename(proj.id, proj.name); }}
        className="w-full px-3 py-1.5 text-left text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5 text-slate-400" /> 이름 변경
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onIconChange(proj.id); }}
        className="w-full px-3 py-1.5 text-left text-[11px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
      >
        <span className="w-3.5 h-3.5 flex items-center justify-center text-[10px]">{proj.icon || '📁'}</span> 아이콘 변경
      </button>
      <div className="my-0.5 border-t border-slate-100 dark:border-slate-700" />
      <button
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(proj.id); }}
        className="w-full px-3 py-1.5 text-left text-[11px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" /> 삭제
      </button>
    </div>,
    document.body
  );
}

function ProjectDeleteModal({ projectId, projects, onConfirm, onCancel }: {
  projectId: string | null;
  projects: { id: string; name: string; icon?: string }[];
  onConfirm: (id: string) => void;
  onCancel: () => void;
}) {
  if (!projectId) return null;
  const project = projects.find(p => p.id === projectId);
  if (!project) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onCancel} />
      <div className="relative w-72 p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">프로젝트를 삭제할까요?</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4 truncate">{project.icon || '📁'} {project.name}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3.5 py-1.5 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">취소</button>
          <button onClick={() => onConfirm(projectId)} className="px-3.5 py-1.5 text-[11px] font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">삭제</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ProjectIconPickerModal({ projectId, projects, onSelect, onClose }: {
  projectId: string | null;
  projects: { id: string; name: string; icon?: string }[];
  onSelect: (projId: string, icon: string) => void;
  onClose: () => void;
}) {
  if (!projectId) return null;
  const proj = projects.find(p => p.id === projectId);
  if (!proj) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-64 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 mb-3">{proj.name} 아이콘 선택</p>
        <div className="flex flex-wrap gap-1.5">
          {PROJECT_ICONS.map(icon => (
            <button key={icon} onClick={() => onSelect(proj.id, icon)}
              className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-[17px] hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors",
                (proj.icon || '📁') === icon && 'bg-slate-100 dark:bg-slate-700 ring-2 ring-blue-400')}>
              {icon}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

const PROJECTS_KEY = 'ai-projects';
const PROJECT_MAP_KEY = 'ai-project-map';
const SIDEBAR_SETTINGS_KEY = 'personai-sidebar-settings-v1';

function getDefaultSidebarSettings(): SidebarSettings {
  const savedTheme = typeof window !== 'undefined' ? (localStorage.getItem('theme') as SidebarSettings['theme'] | null) : null;
  return {
    theme: savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system' ? savedTheme : 'system',
    language: 'ko',
    defaultModel: 'auto',
    notificationsEnabled: false,
    soundEnabled: true,
    responseStyle: 'balanced',
    compactUi: false,
    saveHistory: true,
    fontSize: 'medium',
    streamingEnabled: true,
    autoSave: true,
  };
}

function loadSidebarSettings(): SidebarSettings {
  if (typeof window === 'undefined') return getDefaultSidebarSettings();
  try {
    const raw = localStorage.getItem(SIDEBAR_SETTINGS_KEY);
    if (!raw) return getDefaultSidebarSettings();
    return { ...getDefaultSidebarSettings(), ...JSON.parse(raw) };
  } catch {
    return getDefaultSidebarSettings();
  }
}

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

function getRecordImageThumbnail(record: DiscussionRecord): string | undefined {
  for (let index = record.messages.length - 1; index >= 0; index -= 1) {
    const message = record.messages[index];
    const thumbnail = message.generatedImages?.find((image) => typeof image.thumbnailDataUrl === 'string' && image.thumbnailDataUrl.length > 0)?.thumbnailDataUrl;
    if (thumbnail) {
      return thumbnail;
    }
  }

  return undefined;
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
  // Phase B 리모델링: 넓은 화면(lg+)에서 기본 열림, 모바일/좁은 화면은 접힘.
  // 기존 사용자 설정이 있으면 그대로 존중.
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem('ancano-sidebar-open');
      if (saved === 'true') return true;
      if (saved === 'false') return false;
    } catch { /* noop */ }
    return window.matchMedia('(min-width: 1280px)').matches;
  });
  // 사용자 토글을 persist (리모델링 이후 경험 일관성)
  useEffect(() => {
    try { localStorage.setItem('ancano-sidebar-open', isOpen ? 'true' : 'false'); } catch { /* noop */ }
  }, [isOpen]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<DiscussionRecord[]>(() => getDiscussionHistory());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [hoveredRecordId, setHoveredRecordId] = useState<string | null>(null);
  const { user, profile, isAdmin, signOut } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
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
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState<string | null>(null);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  // Search modal state
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');

  // Bot browser modal state
  const [showBotBrowser, setShowBotBrowser] = useState(false);
  const [botBrowserCat, setBotBrowserCat] = useState('전체');
  const [botMoreOpen, setBotMoreOpen] = useState(false);
  const [selectedBotProfile, setSelectedBotProfile] = useState<string | null>(null);
  // Bot browser portal tooltip
  const [hoveredBotExpert, setHoveredBotExpert] = useState<Expert | null>(null);
  const [botTipPos, setBotTipPos] = useState<{ x: number; y: number } | null>(null);
  const botTipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showBotTip = useCallback((expert: Expert, el: HTMLElement) => {
    if (botTipTimerRef.current) clearTimeout(botTipTimerRef.current);
    const delay = hoveredBotExpert ? 0 : 300;
    botTipTimerRef.current = setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setHoveredBotExpert(expert);
      setBotTipPos({ x: rect.right + 8, y: rect.top + rect.height / 2 });
    }, delay);
  }, [hoveredBotExpert]);
  const hideBotTip = useCallback(() => {
    if (botTipTimerRef.current) clearTimeout(botTipTimerRef.current);
    setHoveredBotExpert(null);
    setBotTipPos(null);
  }, []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('general');
  const [sidebarSettings, setSidebarSettings] = useState<SidebarSettings>(() => loadSidebarSettings());

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
      // Ctrl+K 는 리모델링 이후 글로벌 CommandPalette(모드/최근 이동)가 담당.
      // 사이드바의 "검색" 모달(전문가·봇)은 여전히 사이드바 아이콘 클릭 또는 Ctrl+Shift+K 로 열 수 있음.
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setSearchModalOpen(true);
        setModalSearchQuery('');
      }
      if (e.key === 'Escape' && searchModalOpen) {
        setSearchModalOpen(false);
      }
      if (e.key === 'Escape' && settingsOpen) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchModalOpen, settingsOpen]);

  useEffect(() => {
    const handleOpenSettings = (event: Event) => {
      const detail = (event as CustomEvent<{ section?: SettingsSection }>).detail;
      setSettingsSection(detail?.section ?? 'general');
      setSettingsOpen(true);
    };

    const handleOpenProjects = () => {
      setIsOpen(true);
      setProjectsExpanded(true);
    };

    window.addEventListener('personai:open-settings', handleOpenSettings as EventListener);
    window.addEventListener('personai:open-projects', handleOpenProjects);

    return () => {
      window.removeEventListener('personai:open-settings', handleOpenSettings as EventListener);
      window.removeEventListener('personai:open-projects', handleOpenProjects);
    };
  }, []);

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
    // 프로젝트에 속한 대화면 해당 프로젝트 폴더로 진입
    const pid = projectMap[record.id];
    if (pid) {
      setActiveProjectId(pid);
      setProjectsExpanded(true);
    }
    if (isMobile) setIsOpen(false);
  };

  const handleGoHome = () => {
    setActiveRecordId(null);
    onNewDiscussion?.();
    refreshHistory();
    if (isMobile) setIsOpen(false);
  };

  const applyThemeSetting = useCallback((theme: SidebarSettings['theme']) => {
    const root = document.documentElement;
    root.classList.remove('dark');
    const shouldUseDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (shouldUseDark) root.classList.add('dark');
    localStorage.setItem('theme', theme);
  }, []);

  const updateSidebarSettings = useCallback((patch: Partial<SidebarSettings>) => {
    setSidebarSettings(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(SIDEBAR_SETTINGS_KEY, JSON.stringify(next));
      if (patch.theme) applyThemeSetting(next.theme);
      return next;
    });
  }, [applyThemeSetting]);

  const toggleDarkMode = () => {
    const nextTheme = sidebarSettings.theme === 'dark' ? 'light' : 'dark';
    updateSidebarSettings({ theme: nextTheme });
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        updateSidebarSettings({ notificationsEnabled: false });
        return;
      }
    }
    updateSidebarSettings({ notificationsEnabled: enabled });
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
    setDeletingProjectId(null);
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

  // #5 크로스 세션 전문 검색 — 질문 + 모든 메시지 content 를 대상으로.
  // 공백으로 구분된 토큰 AND 매칭. 매칭된 첫 메시지 스니펫을 기록에 첨부.
  const filteredHistory = (() => {
    let records = historyRecords;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      records = records
        .map((r) => {
          const haystackQ = (r.question || '').toLowerCase();
          // 메시지 배열을 한 번에 펼쳐 매칭 여부 + 스니펫 추출
          let matchedSnippet: string | undefined;
          const allMatched = tokens.every((t) => {
            if (haystackQ.includes(t)) return true;
            const msgMatch = r.messages?.find((m) => typeof m.content === 'string' && m.content.toLowerCase().includes(t));
            if (msgMatch && typeof msgMatch.content === 'string' && !matchedSnippet) {
              const idx = msgMatch.content.toLowerCase().indexOf(t);
              const start = Math.max(0, idx - 30);
              const end = Math.min(msgMatch.content.length, idx + 60);
              matchedSnippet = (start > 0 ? '…' : '') + msgMatch.content.slice(start, end) + (end < msgMatch.content.length ? '…' : '');
            }
            return !!msgMatch;
          });
          return allMatched ? { ...r, __matchedSnippet: matchedSnippet } as DiscussionRecord & { __matchedSnippet?: string } : null;
        })
        .filter((r): r is DiscussionRecord & { __matchedSnippet?: string } => !!r);
    }
    // 프로젝트에 속한 대화는 "모든 대화"에서 숨김 (프로젝트 폴더 안에서만 표시)
    return records.filter(r => !projectMap[r.id]);
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

  const settingsNav = [
    { id: 'general' as const, label: '일반', icon: Settings },
    { id: 'notifications' as const, label: '알림', icon: MessageSquare },
    { id: 'models' as const, label: 'AI 모델', icon: Bot },
    { id: 'personal' as const, label: '개인 맞춤', icon: SlidersHorizontal },
    { id: 'data' as const, label: '데이터 제어', icon: FolderOpen },
    { id: 'shortcuts' as const, label: '단축키', icon: CommandIcon },
  ];

  const themeOptions: Array<{ value: SidebarSettings['theme']; label: string }> = [
    { value: 'light', label: '라이트' },
    { value: 'dark', label: '다크' },
    { value: 'system', label: '시스템' },
  ];

  const languageOptions: Array<{ value: SidebarSettings['language']; label: string }> = [
    { value: 'ko', label: '한국어' },
    { value: 'en', label: 'English' },
    { value: 'auto', label: '자동 감지' },
  ];

  const modelOptions: Array<{ value: SidebarSettings['defaultModel']; label: string }> = [
    { value: 'auto', label: '자동' },
    { value: 'gpt', label: 'GPT' },
    { value: 'gemini', label: 'Gemini' },
    { value: 'claude', label: 'Claude' },
    { value: 'manus', label: 'Manus' },
    { value: 'genspark', label: 'Genspark' },
  ];

  const responseStyleOptions: Array<{ value: SidebarSettings['responseStyle']; label: string }> = [
    { value: 'concise', label: '간결하게' },
    { value: 'balanced', label: '균형 있게' },
    { value: 'detailed', label: '자세하게' },
  ];

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
        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
          {firstExpert ? (
            <ExpertAvatar expert={firstExpert} size="xs" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            </div>
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
            className="flex-1 min-w-0 text-[12px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5 outline-none focus:border-blue-400 dark:focus:border-blue-500"
          />
        ) : (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
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
                {record.premiumDomain
                  ? { law: '⚖️법률', drug: '💊의약', finance: '💰금융', realestate: '🏠부동산', tax: '🧾세무', labor: '👷노무' }[record.premiumDomain] || '상담'
                  : { multi: '멀티', brainstorm: '브레인', standard: '토론', procon: '찬반', hearing: '검증', freetalk: '자유', stakeholder: 'AI시뮬', expert: '상담', assistant: '어시' }[record.mode] || record.mode}
              </span>
            )}
            </div>
            {/* #5 크로스 세션 검색 — 매칭 스니펫 표시 */}
            {(record as DiscussionRecord & { __matchedSnippet?: string }).__matchedSnippet && (
              <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 truncate leading-tight">
                ↳ {(record as DiscussionRecord & { __matchedSnippet?: string }).__matchedSnippet}
              </div>
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
                  className="w-full px-3 py-2 text-left text-[12px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors"
                >
                  <Share2 className="w-4 h-4 text-slate-400" /> 공유하기
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpenId(null); startEditing(record); }}
                  className="w-full px-3 py-2 text-left text-[12px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors"
                >
                  <Pencil className="w-4 h-4 text-slate-400" /> 이름 바꾸기
                </button>
                {!activeProjectId && (
                <button
                  onClick={e => { e.stopPropagation(); togglePin(record.id); setMenuOpenId(null); }}
                  className="w-full px-3 py-2 text-left text-[12px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors"
                >
                  {pinnedIds.has(record.id)
                    ? <><PinOff className="w-4 h-4 text-slate-400" /> 고정 해제</>
                    : <><Pin className="w-4 h-4 text-slate-400" /> 채팅 상단 고정</>
                  }
                </button>
                )}
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
                    className="w-full px-3 py-2 text-left text-[12px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors"
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
                            "w-full px-3 py-1.5 text-left text-[11px] hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors",
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
                          className="w-full px-3 py-1.5 text-left text-[11px] text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-700"
                        >
                          프로젝트에서 제거
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); setShowProjectPicker(null); setMenuOpenId(null); setCreatingProject(true); setNewProjectName(''); }}
                        className="w-full px-3 py-1.5 text-left text-[11px] text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-slate-700"
                      >
                        <Plus className="w-3 h-3" /> 새 프로젝트
                      </button>
                    </div>
                  )}
                </div>
                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpenId(null); setDeletingId(record.id); }}
                  className="w-full px-3 py-2 text-left text-[12px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2.5 transition-colors"
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
      {/* #6 모바일 햄버거 트리거 — 사이드바 닫힘 + 모바일일 때만 노출. */}
      {isMobile && !isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="사이드바 열기"
          className="fixed top-3 left-3 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-600 shadow-md backdrop-blur-sm transition-colors hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white md:hidden"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      )}

      {/* Mobile overlay backdrop */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar — 열림: 220px / 닫힘: 아이콘 미니모드 48px */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-300 ease-out',
          'bg-white dark:bg-[#0f0f0f]',
          'border-r border-slate-200 dark:border-slate-800',
          'md:relative',
          isOpen ? 'w-[204px]' : 'w-[48px]',
          // 모바일: 닫힘=완전 숨김
          !isOpen && 'max-md:-translate-x-full',
        )}
      >
        {/* ── 1. Header ── */}
        <div className={cn("shrink-0 flex items-center py-2.5 transition-all duration-300", isOpen ? 'justify-between px-3' : 'justify-center px-0')}>
          {isOpen ? (
            <>
              <img src="/logos/ancano/lockup_light.png" alt="ANCANO" className="h-8 object-contain dark:hidden" />
              <img src="/logos/ancano/lockup_dark.png" alt="ANCANO" className="h-8 object-contain hidden dark:block" />
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

        {/* ── 2. Navigation Menu (Phase D-3 보정: 한 줄 4 아이콘) ── */}
        <nav className={cn("shrink-0", isOpen ? 'px-2' : 'px-1')}>
          {(() => {
            const items = [
              { icon: House, label: '메인 화면', onClick: handleGoHome, highlight: true },
              { icon: Plus, label: '새 대화', onClick: () => { onNewDiscussion?.(); } },
              { icon: Bot, label: 'AI 봇', onClick: () => { setBotBrowserCat('전체'); setShowBotBrowser(true); } },
              { icon: Search, label: '검색 (⌘K)', onClick: () => {
                  const ev = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true, bubbles: true });
                  window.dispatchEvent(ev);
                }
              },
            ];
            return isOpen ? (
              // Phase D-3 보정: 아래 모드 섹션과 일관된 밀도·톤. 메인 칸의 이질 하이라이트 제거.
              <div className="flex items-center justify-between gap-1">
                {items.map((item) => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    title={item.label}
                    className={cn(
                      "flex items-center justify-center h-8 flex-1 rounded-md transition-colors",
                      "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800",
                    )}
                  >
                    <item.icon className="w-[15px] h-[15px] shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              // 접힘 상태: 아이콘만 세로 나열
              <div className="space-y-0.5">
                {items.map((item) => (
                  <button
                    key={item.label}
                    onClick={item.onClick}
                    title={item.label}
                    className="font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center transition-colors w-full p-1.5 justify-center"
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                  </button>
                ))}
              </div>
            );
          })()}
        </nav>

        {/* Phase D-3 보정: 모드 섹션 — 상단 아이콘 행과 동일한 리듬(h-8, rounded-md, 슬레이트 톤).
            label 과 pill 사이즈를 맞춰 위-아래 밀도 균일화. */}
        {isOpen && (
          <div className="shrink-0 px-2 mt-1.5">
            <div className="px-1 flex items-center">
              <span className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">모드</span>
            </div>
            <div className="grid grid-cols-2 gap-0.5 mt-1">
              {([
                { id: 'general',          label: '일반',     tint: '221 83% 50%' },
                { id: 'multi',            label: '멀티',     tint: '262 83% 58%' },
                { id: 'study',            label: '공부',     tint: '32 95% 44%' },
                { id: 'research',         label: '리서치',   tint: '203 82% 24%' },
                { id: 'standard',         label: '토론',     tint: '221 83% 53%' },
                { id: 'stakeholder',      label: '시뮬',     tint: '160 65% 36%' },
                { id: 'expert',           label: '프리미엄', tint: '38 58% 32%' },
                { id: 'assistant',        label: '도구',     tint: '188 85% 35%' },
              ] as const).map((m) => {
                const activeMain = discussionMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => onModeChange(m.id as DiscussionMode)}
                    title={`${m.label} 모드로 전환`}
                    className={cn(
                      // 2×4 리스트: dot 시작점 정렬 + 충분한 라벨 폭. 활성은 미묘한 배경 + 컬러드 도트 glow 로만.
                      'group flex items-center gap-2 h-7 rounded-md px-2 text-[11px] font-medium transition-colors',
                      activeMain
                        ? 'bg-slate-100/70 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100',
                    )}
                  >
                    <span
                      className="h-[6px] w-[6px] rounded-full shrink-0 transition-shadow"
                      style={{
                        background: `hsl(${m.tint})`,
                        boxShadow: activeMain ? `0 0 0 2.5px hsl(${m.tint}/0.25)` : undefined,
                      }}
                    />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 3. Section Divider ── (Phase D-3 보정: my-2 → my-1 로 축소) */}
        {isOpen && <div className="border-t border-slate-200 dark:border-slate-800 my-1" />}

        {/* ── Projects Section ── */}
        {isOpen && (
          <div className="shrink-0 px-1.5">
            {/* Header (Phase D-3 보정: py-1.5 → py-1) */}
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">프로젝트</span>
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
                    className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[13px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
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
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-600"
                  />
                </div>
                {showIconPicker === 'new' && (
                  <div className="flex flex-wrap gap-1 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    {PROJECT_ICONS.map(icon => (
                      <button key={icon} onClick={() => { setNewProjectIcon(icon); setShowIconPicker(null); }}
                        className={cn("w-7 h-7 rounded-md flex items-center justify-center text-[13px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors", newProjectIcon === icon && 'bg-slate-200 dark:bg-slate-700 ring-1 ring-blue-400')}>
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
                  <span className="text-[11px] shrink-0">{project.icon || '📁'}</span>
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editProjectName}
                      onChange={e => setEditProjectName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') renameProject(project.id); if (e.key === 'Escape') setEditingProjectId(null); }}
                      onBlur={() => renameProject(project.id)}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 min-w-0 text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5 outline-none focus:border-blue-400"
                    />
                  ) : (
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate flex-1">{project.name}</span>
                  )}
                  {convCount > 0 && !isEditing && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">{convCount}</span>
                  )}
                  {/* Project menu trigger */}
                  {!isEditing && (
                    <button
                      className={cn("shrink-0 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-opacity",
                        projectMenuId === project.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}
                      onClick={e => {
                        e.stopPropagation();
                        if (projectMenuId === project.id) { setProjectMenuId(null); return; }
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setMenuPos({ top: rect.bottom + 4, left: rect.left });
                        setProjectMenuId(project.id);
                      }}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {/* 프로젝트 클릭 시 아래로 대화 펼침 */}
                {isActive && (
                  historyRecords.filter(r => projectMap[r.id] === project.id).length === 0 ? (
                    <div className="ml-6 pl-2 border-l border-slate-200 dark:border-slate-700 py-1">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 px-2 py-1">대화가 없습니다</p>
                    </div>
                  ) : (
                    <div className="ml-6 pl-2 border-l border-slate-200 dark:border-slate-700 py-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      {historyRecords.filter(r => projectMap[r.id] === project.id).map(r => {
                        const expert = experts.find(e => r.expertIds?.includes(e.id));
                        return (
                          <div
                            key={r.id}
                            className={cn(
                              "w-full px-2 py-1 rounded-md flex items-center gap-2 text-left transition-colors cursor-pointer group/conv",
                              activeRecordId === r.id ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            )}
                            onClick={e => { e.stopPropagation(); handleLoadHistory(r); }}
                          >
                            {expert ? (
                              <ExpertAvatar expert={expert} size="xs" />
                            ) : (
                              <span className="text-[10px] shrink-0">💬</span>
                            )}
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex-1">{r.question}</span>
                            {r.mode && r.mode !== 'general' && (
                              <span className={cn("shrink-0 text-[8px] font-medium px-1 py-0.5 rounded-full", {
                                'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400': r.mode === 'multi',
                                'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400': r.mode === 'brainstorm',
                                'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400': r.mode === 'standard' || r.mode === 'procon',
                                'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400': r.mode === 'hearing',
                                'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400': r.mode === 'freetalk',
                                'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400': r.mode === 'stakeholder',
                                'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400': r.mode === 'expert',
                                'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400': r.mode === 'assistant',
                              } as Record<string, boolean>)}>
                                {r.premiumDomain
                                  ? { law: '⚖️법률', drug: '💊의약', finance: '💰금융', realestate: '🏠부동산', tax: '🧾세무', labor: '👷노무' }[r.premiumDomain] || '상담'
                                  : { multi: '멀티', brainstorm: '브레인', standard: '토론', procon: '찬반', hearing: '검증', freetalk: '자유', stakeholder: 'AI시뮬', expert: '상담', assistant: '어시' }[r.mode] || r.mode}
                              </span>
                            )}
                            {/* 점 세 개 메뉴 */}
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                if (menuOpenId === r.id) { setMenuOpenId(null); return; }
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const menuH = 220;
                                setMenuPos({
                                  top: spaceBelow < menuH ? rect.top - menuH : rect.bottom + 4,
                                  left: rect.right - 176,
                                });
                                setMenuOpenId(r.id);
                              }}
                              className={cn("shrink-0 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-opacity",
                                menuOpenId === r.id ? 'opacity-100' : 'opacity-0 group-hover/conv:opacity-100')}
                            >
                              <MoreHorizontal className="w-3 h-3" />
                            </button>
                          </div>
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
                className="w-full px-2.5 py-[5px] rounded-lg flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mx-0.5"
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
                <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1">대화를 삭제할까요?</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4 truncate">{record?.question}</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setDeletingId(null)} className="px-3.5 py-1.5 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">취소</button>
                  <button onClick={() => handleDeleteHistory(deletingId)} className="px-3.5 py-1.5 text-[11px] font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">삭제</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══ Project Context Menu (v2 — useEffect 외부클릭) ═══ */}
        <ProjectContextMenu
          projectMenuId={projectMenuId}
          menuPos={menuPos}
          projects={projects}
          onRename={(id, name) => { setProjectMenuId(null); setEditingProjectId(id); setEditProjectName(name); }}
          onIconChange={(id) => { setProjectMenuId(null); setShowIconPicker(id); }}
          onDelete={(id) => { setProjectMenuId(null); setDeletingProjectId(id); }}
          onClose={() => setProjectMenuId(null)}
        />

        {/* ═══ Delete Confirmation Modal ═══ */}
        <ProjectDeleteModal
          projectId={deletingProjectId}
          projects={projects}
          onConfirm={(id) => deleteProject(id)}
          onCancel={() => setDeletingProjectId(null)}
        />

        {/* ═══ Icon Picker Modal ═══ */}
        <ProjectIconPickerModal
          projectId={showIconPicker && showIconPicker !== 'new' ? showIconPicker : null}
          projects={projects}
          onSelect={(projId, icon) => {
            setProjects(prev => { const updated = prev.map(p => p.id === projId ? { ...p, icon } : p); saveProjects(updated); return updated; });
            setShowIconPicker(null);
          }}
          onClose={() => setShowIconPicker(null)}
        />

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
                  className="flex-1 min-w-0 bg-transparent text-[11px] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 outline-none"
                />
              </div>
              <button onClick={toggleSearch} className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">모든 대화</span>
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
                  <p className="text-[12px] text-slate-400 dark:text-slate-500">검색 결과가 없습니다</p>
                </>
              ) : (
                <>
                  <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-[12px] font-medium text-slate-400 dark:text-slate-500">대화 기록이 없습니다</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1">새 채팅을 시작해보세요</p>
                </>
              )}
            </div>
          )}
        </div>}

        {/* 미니모드에서도 하단으로 밀어주는 spacer */}
        {!isOpen && <div className="flex-1" />}

        {/* ── 6. Bottom Section — GPT 스타일 유저 프로필 ── */}
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 relative">
          {isOpen ? (
            <button
              onClick={() => setUserMenuOpen(prev => !prev)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                {(profile?.email || user?.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {profile?.email || user?.email || '게스트'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {profile?.plan === 'premium' ? 'Premium' : profile?.plan === 'pro' ? 'Pro' : 'Free'}{isAdmin ? ' · Admin' : ''}
                </p>
              </div>
              <ChevronRight className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", userMenuOpen && "rotate-90")} />
            </button>
          ) : (
            <div className="flex justify-center py-2">
              <button
                onClick={() => setUserMenuOpen(prev => !prev)}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-[11px] font-bold hover:ring-2 hover:ring-indigo-300 transition-all"
                title={profile?.email || user?.email || '게스트'}
              >
                {(profile?.email || user?.email || '?')[0].toUpperCase()}
              </button>
            </div>
          )}

          {/* 팝업 메뉴 — Claude/GPT 하이브리드 스타일 */}
          {userMenuOpen && createPortal(
            <div className="fixed inset-0 z-[300]" onClick={() => setUserMenuOpen(false)}>
              <div
                ref={userMenuRef}
                onClick={e => e.stopPropagation()}
                className="fixed bottom-14 left-3 w-[260px] rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-[0_8px_40px_rgba(0,0,0,0.12)] overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200"
              >
                {/* ── 유저 프로필 헤더 ── */}
                <div className="px-5 pt-4 pb-3">
                  <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {profile?.email || user?.email || '게스트'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full",
                      profile?.plan === 'premium' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                      profile?.plan === 'pro' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400' :
                      'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    )}>
                      {profile?.plan === 'premium' ? 'Premium' : profile?.plan === 'pro' ? 'Pro' : 'Free'}
                    </span>
                    {isAdmin && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900">Admin</span>}
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800 mx-3" />

                {/* ── 메인 메뉴 ── */}
                <div className="py-1.5 px-1.5">
                  <button onClick={() => { setUserMenuOpen(false); setSettingsSection('general'); setSettingsOpen(true); }}
                    className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-[12.5px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                    <Settings className="w-[15px] h-[15px] text-slate-400" /> 설정
                  </button>
                  <button onClick={() => { setUserMenuOpen(false); toggleDarkMode(); }}
                    className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-[12.5px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                    <span className="flex items-center gap-3">
                      <Moon className="w-[15px] h-[15px] text-slate-400 dark:hidden" />
                      <Sun className="w-[15px] h-[15px] text-slate-400 hidden dark:block" />
                      외형
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{sidebarSettings.theme === 'dark' ? '다크' : '라이트'}</span>
                  </button>
                  <button onClick={() => setUserMenuOpen(false)}
                    className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-[12.5px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                    <span className="flex items-center gap-3">
                      <HelpCircle className="w-[15px] h-[15px] text-slate-400" /> 도움말
                    </span>
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                  </button>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800 mx-3" />

                {/* ── 관리 메뉴 ── */}
                <div className="py-1.5 px-1.5">
                  {isAdmin && (
                    <a href="/admin" onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-[12.5px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                      <Shield className="w-[15px] h-[15px] text-slate-400" /> 관리자 콘솔
                    </a>
                  )}
                  <button onClick={() => setUserMenuOpen(false)}
                    className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-[12.5px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                    <span className="flex items-center gap-3">
                      <ExternalLink className="w-[15px] h-[15px] text-slate-400" /> 요금제
                    </span>
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                      profile?.plan === 'free' ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' : 'bg-emerald-100 text-emerald-600'
                    )}>
                      {profile?.plan === 'premium' ? 'Premium' : profile?.plan === 'pro' ? 'Pro' : 'Free'}
                    </span>
                  </button>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800 mx-3" />

                {/* ── 로그아웃 / 로그인 ── */}
                <div className="py-1.5 px-1.5 pb-2">
                  {user ? (
                    <button onClick={() => { setUserMenuOpen(false); void signOut(); }}
                      className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-[12.5px] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors">
                      <LogOut className="w-[15px] h-[15px]" /> 로그아웃
                    </button>
                  ) : (
                    <a href="/auth"
                      className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-[12.5px] text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
                      <User className="w-[15px] h-[15px]" /> 로그인 / 회원가입
                    </a>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      </aside>

      {settingsOpen && (
        <div className="fixed inset-0 z-[205] flex items-center justify-center p-4" onClick={() => setSettingsOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-[760px] h-[540px] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#101217]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex h-full">
              <div className="flex w-[174px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/90 p-2.5 dark:border-slate-800 dark:bg-slate-950/70">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[16px] font-bold text-slate-900 dark:text-white">설정</p>
                  </div>
                  <button
                    onClick={() => setSettingsOpen(false)}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  {settingsNav.map(item => {
                    const Icon = item.icon;
                    const active = settingsSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSettingsSection(item.id)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors',
                          active
                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-slate-700'
                            : 'text-slate-500 hover:bg-white/70 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-slate-200',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[11px] font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

              </div>

              <div className="flex min-w-0 flex-1 flex-col bg-white dark:bg-[#101217]">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <p className="text-[16px] font-bold text-slate-900 dark:text-white">
                    {settingsNav.find(item => item.id === settingsSection)?.label}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {settingsSection === 'general' && '기본 환경, 언어, 화면 표시 방식을 조정합니다.'}
                    {settingsSection === 'notifications' && '브라우저 알림과 소리 알림 방식을 관리합니다.'}
                    {settingsSection === 'models' && 'GPT, Gemini, Claude, Manus, Genspark 기본 우선순위를 정합니다.'}
                    {settingsSection === 'personal' && '답변 스타일과 인터페이스 밀도를 조정합니다.'}
                    {settingsSection === 'data' && '대화 기록 저장과 데이터 보관 방식을 관리합니다.'}
                    {settingsSection === 'shortcuts' && '⌘K 팔레트와 전역 키보드 단축키 안내.'}
                  </p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                  {settingsSection === 'general' && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                        <p className="text-[14px] font-semibold text-slate-900 dark:text-white">화면 테마</p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">GPT, Claude처럼 작업할 때 가장 편한 색상 모드를 고릅니다.</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {themeOptions.map(option => (
                            <button
                              key={option.value}
                              onClick={() => updateSidebarSettings({ theme: option.value })}
                              className={cn(
                                'rounded-full px-4 py-2 text-[12px] font-medium transition-colors',
                                sidebarSettings.theme === option.value
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                  : 'border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                        <p className="text-[14px] font-semibold text-slate-900 dark:text-white">언어</p>
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">인터페이스 언어</span>
                            <div className="flex gap-2">
                              {languageOptions.map(option => (
                                <button
                                  key={option.value}
                                  onClick={() => updateSidebarSettings({ language: option.value })}
                                  className={cn(
                                    'rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors',
                                    sidebarSettings.language === option.value
                                      ? 'bg-blue-600 text-white'
                                      : 'border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
                                  )}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsSection === 'notifications' && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[14px] font-semibold text-slate-900 dark:text-white">브라우저 알림</p>
                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">답변 완료, 작업 종료, 메모 알람을 브라우저 알림으로 받을 수 있습니다.</p>
                          </div>
                          <button
                            onClick={() => handleNotificationToggle(!sidebarSettings.notificationsEnabled)}
                            className={cn(
                              'relative h-7 w-12 rounded-full transition-colors',
                              sidebarSettings.notificationsEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700',
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all',
                                sidebarSettings.notificationsEnabled ? 'left-6' : 'left-1',
                              )}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[14px] font-semibold text-slate-900 dark:text-white">소리 알림</p>
                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Claude, Gemini처럼 응답이 끝나면 가벼운 알림음을 재생합니다.</p>
                          </div>
                          <button
                            onClick={() => updateSidebarSettings({ soundEnabled: !sidebarSettings.soundEnabled })}
                            className={cn(
                              'relative h-7 w-12 rounded-full transition-colors',
                              sidebarSettings.soundEnabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700',
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all',
                                sidebarSettings.soundEnabled ? 'left-6' : 'left-1',
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsSection === 'models' && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                        <p className="text-[14px] font-semibold text-slate-900 dark:text-white">기본 우선 모델</p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">질문을 시작할 때 가장 먼저 보여줄 모델을 정합니다.</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {modelOptions.map(option => (
                            <button
                              key={option.value}
                              onClick={() => updateSidebarSettings({ defaultModel: option.value })}
                              className={cn(
                                'rounded-full px-4 py-2 text-[12px] font-medium transition-colors',
                                sidebarSettings.defaultModel === option.value
                                  ? 'bg-violet-600 text-white'
                                  : 'border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {[
                          { name: 'GPT', note: '일반 지식, 글쓰기, 분석을 균형 있게 처리합니다.' },
                          { name: 'Gemini', note: '검색형 질문과 멀티모달 작업에 잘 맞습니다.' },
                          { name: 'Claude', note: '긴 문서 읽기, 구조화된 정리에 강합니다.' },
                          { name: 'Manus', note: '조사, 자동화형 작업을 빠르게 이어서 진행합니다.' },
                          { name: 'Genspark', note: '아이디어 확장과 초안 생성용 후보로 적합합니다.' },
                        ].map(item => (
                          <div key={item.name} className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                            <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{item.name}</p>
                            <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{item.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {settingsSection === 'personal' && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                        <p className="text-[14px] font-semibold text-slate-900 dark:text-white">기본 응답 스타일</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {responseStyleOptions.map(option => (
                            <button
                              key={option.value}
                              onClick={() => updateSidebarSettings({ responseStyle: option.value })}
                              className={cn(
                                'rounded-full px-4 py-2 text-[12px] font-medium transition-colors',
                                sidebarSettings.responseStyle === option.value
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                  : 'border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[14px] font-semibold text-slate-900 dark:text-white">컴팩트 UI</p>
                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">탭, 카드, 목록 간격을 조금 더 촘촘하게 보여줍니다.</p>
                          </div>
                          <button
                            onClick={() => updateSidebarSettings({ compactUi: !sidebarSettings.compactUi })}
                            className={cn(
                              'relative h-7 w-12 rounded-full transition-colors',
                              sidebarSettings.compactUi ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-slate-700',
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all dark:bg-slate-900',
                                sidebarSettings.compactUi ? 'left-6 dark:bg-slate-900' : 'left-1 dark:bg-white',
                              )}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                        <p className="text-[14px] font-semibold text-slate-900 dark:text-white">글꼴 크기</p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">대화 메시지의 텍스트 크기를 조정합니다.</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {([
                            { value: 'small' as const, label: '작게' },
                            { value: 'medium' as const, label: '보통' },
                            { value: 'large' as const, label: '크게' },
                          ]).map(option => (
                            <button
                              key={option.value}
                              onClick={() => updateSidebarSettings({ fontSize: option.value })}
                              className={cn(
                                'rounded-full px-4 py-2 text-[12px] font-medium transition-colors',
                                sidebarSettings.fontSize === option.value
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                  : 'border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[14px] font-semibold text-slate-900 dark:text-white">스트리밍 응답</p>
                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">AI 응답을 실시간으로 한 글자씩 타이핑하듯 표시합니다.</p>
                          </div>
                          <button
                            onClick={() => updateSidebarSettings({ streamingEnabled: !sidebarSettings.streamingEnabled })}
                            className={cn(
                              'relative h-7 w-12 rounded-full transition-colors',
                              sidebarSettings.streamingEnabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700',
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all',
                                sidebarSettings.streamingEnabled ? 'left-6' : 'left-1',
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsSection === 'data' && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[14px] font-semibold text-slate-900 dark:text-white">대화 기록 저장</p>
                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">질문, 답변, 토론 기록을 기기 브라우저에 보관합니다.</p>
                          </div>
                          <button
                            onClick={() => updateSidebarSettings({ saveHistory: !sidebarSettings.saveHistory })}
                            className={cn(
                              'relative h-7 w-12 rounded-full transition-colors',
                              sidebarSettings.saveHistory ? 'bg-violet-600' : 'bg-slate-200 dark:bg-slate-700',
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all',
                                sidebarSettings.saveHistory ? 'left-6' : 'left-1',
                              )}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[14px] font-semibold text-slate-900 dark:text-white">자동 저장</p>
                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">대화 중 자동으로 진행 상황을 저장합니다.</p>
                          </div>
                          <button
                            onClick={() => updateSidebarSettings({ autoSave: !sidebarSettings.autoSave })}
                            className={cn(
                              'relative h-7 w-12 rounded-full transition-colors',
                              sidebarSettings.autoSave ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700',
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all',
                                sidebarSettings.autoSave ? 'left-6' : 'left-1',
                              )}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                        <p className="text-[14px] font-semibold text-slate-900 dark:text-white">대화 내보내기</p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">저장된 대화 기록을 JSON 파일로 다운로드합니다.</p>
                        <button
                          onClick={() => {
                            try {
                              const history = localStorage.getItem('ai-debate-history-v3');
                              if (!history) return;
                              const blob = new Blob([history], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `personai-history-${new Date().toISOString().slice(0, 10)}.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                            } catch { /* ignore */ }
                          }}
                          className="mt-3 rounded-full px-4 py-2 text-[12px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          JSON으로 내보내기
                        </button>
                      </div>

                      {/* #19 전체 데이터 백업/복원 */}
                      <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                        <p className="text-[14px] font-semibold text-slate-900 dark:text-white">전체 백업 · 복원</p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">설정 · 대화 기록 · Study 자료(PDF/PPTX 원본 포함)를 단일 JSON 파일로 내보내고 다른 기기에서 불러옵니다.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const { downloadBackup } = await import('@/lib/dataBackup');
                                const res = await downloadBackup();
                                const mb = (res.size / 1024 / 1024).toFixed(1);
                                alert(`백업 완료 · 약 ${mb}MB · 첨부 자료 ${res.blobs}개`);
                              } catch (e) {
                                alert(`백업 실패: ${e instanceof Error ? e.message : String(e)}`);
                              }
                            }}
                            className="rounded-full px-4 py-2 text-[12px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            전체 백업 내보내기
                          </button>
                          <label className="rounded-full px-4 py-2 text-[12px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">
                            백업 파일로 복원
                            <input
                              type="file"
                              accept="application/json,.json"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (!file) return;
                                if (!window.confirm('현재 설정·대화·Study 자료에 백업 파일의 내용이 병합됩니다. 계속할까요?')) return;
                                try {
                                  const { readBackupFile, applyBackup } = await import('@/lib/dataBackup');
                                  const payload = await readBackupFile(file);
                                  const res = await applyBackup(payload);
                                  alert(`복원 완료 · 키 ${res.keys}개 · 자료 ${res.blobs}개. 페이지를 새로고침합니다.`);
                                  window.location.reload();
                                } catch (err) {
                                  alert(`복원 실패: ${err instanceof Error ? err.message : String(err)}`);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-red-200 p-3.5 dark:border-red-900/50">
                        <p className="text-[14px] font-semibold text-red-600 dark:text-red-400">캐시 초기화</p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">로컬 캐시와 임시 데이터를 삭제합니다. 대화 기록은 유지됩니다.</p>
                        <button
                          onClick={() => {
                            try {
                              const keys = Object.keys(localStorage).filter(k => !k.includes('history') && !k.includes('settings'));
                              keys.forEach(k => localStorage.removeItem(k));
                              window.location.reload();
                            } catch { /* ignore */ }
                          }}
                          className="mt-3 rounded-full px-4 py-2 text-[12px] font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          캐시 초기화
                        </button>
                      </div>
                    </div>
                  )}
                  {settingsSection === 'shortcuts' && (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                        <p className="text-[14px] font-semibold text-slate-900 dark:text-white">⌘K · 커맨드 팔레트</p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">어디서든 눌러 모드 전환 · 최근 대화 · 빠른 액션.</p>
                        <ul className="mt-3 space-y-1.5 text-[12px] text-slate-600 dark:text-slate-300">
                          {[
                            { k: ['⌘', 'K'], d: '팔레트 열기 · 닫기' },
                            { k: ['Ctrl', 'K'], d: '팔레트 열기 (Windows)' },
                            { k: ['↑', '↓'], d: '항목 이동' },
                            { k: ['↵'], d: '선택' },
                            { k: ['Esc'], d: '닫기' },
                          ].map((row, i) => (
                            <li key={i} className="flex items-center justify-between gap-3 py-1">
                              <span>{row.d}</span>
                              <span className="flex items-center gap-1">
                                {row.k.map((key, j) => (
                                  <kbd key={j} className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10.5px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{key}</kbd>
                                ))}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
                        <p className="text-[14px] font-semibold text-slate-900 dark:text-white">팔레트 내 빠른 액션</p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">입력창에 키워드를 치면 모드 · 대화 · 액션을 한 곳에서.</p>
                        <ul className="mt-3 space-y-1 text-[11.5px] text-slate-500 dark:text-slate-400 list-disc list-inside">
                          <li>새 대화 시작</li>
                          <li>현재 대화 Markdown 복사 · 다운로드</li>
                          <li>다크 · 라이트 테마 토글</li>
                          <li>모드(일반/멀티/토론/Study …) 즉시 전환</li>
                          <li>최근 대화 재개</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                className="flex-1 text-[13px] text-slate-900 dark:text-white bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <button onClick={() => setSearchModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[50vh] overflow-y-auto">
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
                      <p className="text-[13px] text-slate-400 dark:text-slate-500">
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
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</span>
                      </div>
                      {groups[label].map(record => {
                        const firstExpert = experts.find(e => record.expertIds?.includes(e.id));
                        const imageThumbnail = getRecordImageThumbnail(record);
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
                            {imageThumbnail ? (
                              <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <img src={imageThumbnail} alt={record.question} className="h-full w-full object-cover" />
                              </div>
                            ) : firstExpert ? (
                              <ExpertAvatar expert={firstExpert} size="xs" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <Bot className="w-3.5 h-3.5 text-slate-400" />
                              </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-slate-900 dark:group-hover:text-white">
                                  {record.question}
                                </p>
                              </div>
                              {preview && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{preview}</p>
                              )}
                            </div>

                            {/* Date */}
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
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
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-8" onClick={() => { setShowBotBrowser(false); setSelectedBotProfile(null); hideBotTip(); }}>
          <div className="absolute inset-0 bg-black/30"></div>
          <div
            className="relative w-full max-w-[640px] max-h-[85vh] mx-4 rounded-xl bg-white dark:bg-[#1a1a1a] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-[14px] font-bold text-slate-800 dark:text-white">AI 봇 둘러보기</h3>
              <button onClick={() => setShowBotBrowser(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category tabs */}
            <div className="shrink-0 flex gap-1 px-4 py-2 border-b border-slate-100 dark:border-slate-800/50 flex-wrap">
              {['전체', 'AI 모델', '직업', '전문가', '인물', '캐릭터', '신화', '이념'].map(cat => (
                <button key={cat}
                  onClick={() => setBotBrowserCat(cat)}
                  className={cn("px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors shrink-0",
                    botBrowserCat === cat ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >{cat}</button>
              ))}
              {/* 더보기 드롭다운 */}
              <div className="relative">
                <button
                  onClick={() => setBotMoreOpen(!botMoreOpen)}
                  className={cn("px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors shrink-0",
                    ['라이프스타일','페르소나','철학/종교'].includes(botBrowserCat)
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  {['라이프스타일','페르소나','철학/종교'].includes(botBrowserCat) ? botBrowserCat : '더보기'} ▾
                </button>
                {botMoreOpen && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg py-1 min-w-[120px] animate-in fade-in slide-in-from-top-1 duration-150">
                    {['라이프스타일', '페르소나', '철학/종교'].map(cat => (
                      <button key={cat} onClick={() => { setBotBrowserCat(cat); setBotMoreOpen(false); }}
                        className="w-full px-3 py-1.5 text-left text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bot grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {experts
                  .filter(e => {
                    const hiddenBaseModels = ['gpt', 'claude', 'gemini', 'grok', 'perplexity', 'qwen'];
                    const hiddenSpecial = ['ancano-pro', 'auto-gpt'];
                    if (hiddenBaseModels.includes(e.id)) return false;
                    if (hiddenSpecial.includes(e.id)) return false;
                    if (botBrowserCat === '전체') return true;
                    const catMap: Record<string, string> = { 'AI 모델': 'ai', '전문가': 'specialist', '직업': 'occupation', '라이프스타일': 'lifestyle', '페르소나': 'perspective', '인물': 'celebrity', '캐릭터': 'fictional', '신화': 'mythology', '이념': 'ideology', '철학/종교': 'religion' };
                    return e.category === catMap[botBrowserCat];
                  })
                  .map(expert => {
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
                    const greeting = expert.greeting || defaultGreetings[expert.category] || '안녕하세요! 무엇이 궁금하신가요?';
                    return (
                    <button key={expert.id}
                      onClick={() => {
                        setShowBotBrowser(false);
                        setSelectedBotProfile(null);
                        hideBotTip();
                        onStartChat?.(expert.id, 'greeting', greeting);
                      }}
                      onMouseEnter={e => showBotTip(expert, e.currentTarget)}
                      onMouseLeave={hideBotTip}
                      className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700 transition-all text-left group"
                    >
                      <div className="shrink-0 group-hover:scale-110 transition-transform">
                        <ExpertAvatar expert={expert} size="md" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-slate-800 dark:text-white truncate">{expert.nameKo}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{expert.quote || expert.description}</p>
                      </div>
                    </button>
                    );
                  })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Bot browser portal 기반 플로팅 툴팁 */}
      {hoveredBotExpert && botTipPos && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: `${botTipPos.x}px`,
            top: `${botTipPos.y}px`,
            transform: 'translateY(-50%)',
          }}
        >
        <div className="animate-in fade-in slide-in-from-left-2 duration-200 ease-out flex items-center">
          <div className={cn(
            'relative bg-gradient-to-b from-slate-800 to-slate-900 text-white rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.38)] overflow-hidden border border-white/[0.06]',
            hoveredBotExpert.abilities && !hoveredBotExpert.id.startsWith('auto-') ? 'w-52' : 'w-44'
          )}>
            {/* 이름 + 아이콘 */}
            <div className="px-2.5 pt-2 pb-1 flex items-center justify-center gap-1">
              {hoveredBotExpert.category === 'ai' && (
                hoveredBotExpert.avatarUrl ? (
                  (/\/(gpt|perplexity|grok)\.svg$/).test(hoveredBotExpert.avatarUrl) ? (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white shrink-0">
                      <img src={hoveredBotExpert.avatarUrl} alt="" className="w-3 h-3 rounded-full object-contain" />
                    </span>
                  ) : (
                    <img src={hoveredBotExpert.avatarUrl} alt="" className="w-3.5 h-3.5 rounded-full" />
                  )
                ) : (
                  <span className="text-xs">{hoveredBotExpert.icon}</span>
                )
              )}
              <p className="text-[11px] font-bold tracking-tight leading-tight">{hoveredBotExpert.nameKo}</p>
            </div>
            {/* 컬러바 */}
            <div className={cn('h-[2px] mx-2.5 rounded-full bg-gradient-to-r', {
              'from-blue-400 via-blue-300 to-blue-400': hoveredBotExpert.color === 'blue',
              'from-emerald-400 via-green-300 to-emerald-400': hoveredBotExpert.color === 'emerald',
              'from-red-400 via-rose-300 to-red-400': hoveredBotExpert.color === 'red',
              'from-amber-400 via-yellow-300 to-amber-400': hoveredBotExpert.color === 'amber',
              'from-purple-400 via-violet-300 to-purple-400': hoveredBotExpert.color === 'purple',
              'from-orange-400 via-orange-300 to-orange-400': hoveredBotExpert.color === 'orange',
              'from-teal-400 via-teal-300 to-teal-400': hoveredBotExpert.color === 'teal',
              'from-pink-400 via-pink-300 to-pink-400': hoveredBotExpert.color === 'pink',
              'from-slate-400 via-slate-300 to-slate-400': hoveredBotExpert.color === 'slate',
              'from-green-400 via-green-300 to-green-400': hoveredBotExpert.color === 'green',
              'from-cyan-400 via-cyan-300 to-cyan-400': hoveredBotExpert.color === 'cyan',
              'from-sky-400 via-sky-300 to-sky-400': hoveredBotExpert.color === 'sky',
            })} />
            {/* 설명 */}
            <div className="px-2.5 pt-1 pb-1.5 text-center">
              <p className="text-[9px] text-slate-300 leading-relaxed">{hoveredBotExpert.description}</p>
            </div>
            {/* AI 모델: 레이더 차트 + 스텟 바 */}
            {hoveredBotExpert.abilities && !hoveredBotExpert.id.startsWith('auto-') && hoveredBotExpert.id !== 'ancano' && hoveredBotExpert.id !== 'ancano-pro' && (
              <BotTipAbilitySection abilities={hoveredBotExpert.abilities} color={hoveredBotExpert.color} name={hoveredBotExpert.nameKo} />
            )}
            {/* 비AI: quote + 추천질문 */}
            {!hoveredBotExpert.abilities && (
              <>
                {hoveredBotExpert.quote && (
                  <div className="px-2.5 pb-1 text-center">
                    <p className="text-[8px] text-amber-300 font-medium leading-tight">"{hoveredBotExpert.quote}"</p>
                  </div>
                )}
                {hoveredBotExpert.sampleQuestions && hoveredBotExpert.sampleQuestions.length > 0 && (
                  <div className="mx-2.5 mb-2 mt-0.5 relative">
                    <div className="rounded-md border border-white/15 bg-white/[0.02] pt-1.5 pb-1 px-2">
                      <span className="absolute -top-[5px] left-1/2 -translate-x-1/2 px-1.5 text-[6px] text-slate-400 tracking-wider font-medium" style={{ backgroundColor: '#1a2030' }}>추천 질문</span>
                      {hoveredBotExpert.sampleQuestions.map((q, qi) => (
                        <p key={qi} className="text-[8px] text-slate-300 text-center leading-normal py-0.5 truncate">{q}</p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          {/* 왼쪽 화살표 */}
          <div className="absolute left-0 top-1/2 -translate-x-[4px] -translate-y-1/2">
            <div className="w-2 h-2 bg-slate-800 rotate-45 border-l border-b border-white/[0.06]" />
          </div>
        </div>
        </div>,
        document.body
      )}
    </>
  );
}
