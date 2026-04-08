import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Crown,
  Database,
  Home,
  LayoutDashboard,
  Loader2,
  Lock,
  RefreshCcw,
  ScrollText,
  Server,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';

type Profile = Tables<'profiles'>;
type UsageEvent = Tables<'usage_events'>;

type AdminTab = 'dashboard' | 'members' | 'activity';

interface AdminStats {
  totalUsers: number;
  todayUsers: number;
  freeUsers: number;
  premiumUsers: number;
  proUsers: number;
  todayUsage: number;
  todayPremiumUsage: number;
  todayErrors: number;
}

interface ModeUsage {
  mode: string;
  count: number;
}

interface SystemStatus {
  supabaseConnected: boolean;
  onlineUsers: number;
  tableRowCounts: { table: string; count: number }[];
}

const EMPTY_STATS: AdminStats = {
  totalUsers: 0,
  todayUsers: 0,
  freeUsers: 0,
  premiumUsers: 0,
  proUsers: 0,
  todayUsage: 0,
  todayPremiumUsage: 0,
  todayErrors: 0,
};

const ALL_MODES = [
  'general', 'multi', 'procon', 'standard', 'brainstorm',
  'freetalk', 'aivsuser', 'stakeholder', 'premium', 'assistant', 'player',
] as const;

const MODE_LABELS: Record<string, string> = {
  general: 'General',
  multi: 'Multi',
  procon: 'Pro/Con',
  standard: 'Standard',
  brainstorm: 'Brainstorm',
  freetalk: 'Freetalk',
  aivsuser: 'AI vs User',
  stakeholder: 'Stakeholder',
  premium: 'Premium',
  assistant: 'Assistant',
  player: 'Player',
};

function getTodayIso() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatTimeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function planLabel(plan: Profile['plan']) {
  if (plan === 'premium') return 'Premium';
  if (plan === 'pro') return 'Pro';
  return 'Free';
}

function roleLabel(role: Profile['role']) {
  if (role === 'owner') return 'Owner';
  if (role === 'admin') return 'Admin';
  return 'User';
}

export default function Admin() {
  const { user, profile, loading, profileLoading, isAdmin, signOut, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState<AdminStats>(EMPTY_STATS);
  const [modeUsage, setModeUsage] = useState<ModeUsage[]>([]);
  const [recentEvents, setRecentEvents] = useState<(UsageEvent & { userEmail?: string })[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    supabaseConnected: false,
    onlineUsers: 0,
    tableRowCounts: [],
  });
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingProfile, setUpdatingProfile] = useState<string | null>(null);

  const isAuthReady = !loading && !profileLoading;
  const ownerBootstrapSql = useMemo(() => {
    const email = profile?.email || user?.email || 'your@email.com';
    return `update public.profiles set role = 'owner' where email = '${email}';`;
  }, [profile?.email, user?.email]);

  /* ---- Data loaders ---- */

  const loadAdminData = useCallback(async () => {
    if (!isAdmin) return;

    setDataLoading(true);
    setError(null);

    try {
      const todayIso = getTodayIso();

      const [
        profilesResult,
        totalUsersResult,
        todayUsersResult,
        freeUsersResult,
        premiumUsersResult,
        proUsersResult,
        todayUsageResult,
        todayPremiumUsageResult,
        todayErrorsResult,
      ] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayIso),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'free'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'premium'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', 'pro'),
        supabase.from('usage_events').select('id', { count: 'exact', head: true }).gte('created_at', todayIso),
        supabase.from('usage_events').select('id', { count: 'exact', head: true }).gte('created_at', todayIso).eq('mode', 'premium'),
        supabase.from('usage_events').select('id', { count: 'exact', head: true }).gte('created_at', todayIso).eq('status', 'error'),
      ]);

      if (profilesResult.error) throw profilesResult.error;

      setProfiles(profilesResult.data ?? []);
      setStats({
        totalUsers: totalUsersResult.count ?? 0,
        todayUsers: todayUsersResult.count ?? 0,
        freeUsers: freeUsersResult.count ?? 0,
        premiumUsers: premiumUsersResult.count ?? 0,
        proUsers: proUsersResult.count ?? 0,
        todayUsage: todayUsageResult.count ?? 0,
        todayPremiumUsage: todayPremiumUsageResult.count ?? 0,
        todayErrors: todayErrorsResult.count ?? 0,
      });

      const usageError = todayUsageResult.error || todayPremiumUsageResult.error || todayErrorsResult.error;
      if (usageError) {
        setError(`사용량 이벤트 집계는 아직 준비되지 않았습니다: ${usageError.message}`);
      }

      // Load mode usage
      await loadModeUsage();
      // Load recent events
      await loadRecentEvents(profilesResult.data ?? []);
      // Load system status
      await loadSystemStatus(profilesResult.data ?? []);
    } catch (adminError) {
      setError(adminError instanceof Error ? adminError.message : '관리자 데이터를 불러오지 못했습니다.');
    } finally {
      setDataLoading(false);
    }
  }, [isAdmin]);

  const loadModeUsage = useCallback(async () => {
    try {
      const results = await Promise.all(
        ALL_MODES.map(async (mode) => {
          const { count, error: modeError } = await supabase
            .from('usage_events')
            .select('id', { count: 'exact', head: true })
            .eq('mode', mode);
          if (modeError) return { mode, count: 0 };
          return { mode, count: count ?? 0 };
        })
      );
      setModeUsage(results.sort((a, b) => b.count - a.count));
    } catch {
      // Graceful: keep empty
      setModeUsage([]);
    }
  }, []);

  const loadRecentEvents = useCallback(async (allProfiles: Profile[]) => {
    try {
      const { data, error: eventsError } = await supabase
        .from('usage_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (eventsError || !data) {
        setRecentEvents([]);
        return;
      }

      const profileMap = new Map(allProfiles.map((p) => [p.id, p.email]));
      const enriched = data.map((evt) => ({
        ...evt,
        userEmail: (evt.user_id ? profileMap.get(evt.user_id) : null) ?? undefined,
      }));
      setRecentEvents(enriched);
    } catch {
      setRecentEvents([]);
    }
  }, []);

  const loadSystemStatus = useCallback(async (allProfiles: Profile[]) => {
    try {
      // Supabase connection check
      let connected = false;
      try {
        const { error: pingError } = await supabase.from('profiles').select('id', { head: true, count: 'exact' });
        connected = !pingError;
      } catch {
        connected = false;
      }

      // Online users (last_seen_at within 5 minutes)
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const onlineUsers = allProfiles.filter(
        (p) => p.last_seen_at && new Date(p.last_seen_at).toISOString() >= fiveMinAgo
      ).length;

      // Table row counts
      const tableCounts = await Promise.all(
        (['profiles', 'usage_events', 'admin_audit_logs'] as const).map(async (table) => {
          const { count, error: countError } = await supabase
            .from(table)
            .select('id', { count: 'exact', head: true });
          return { table, count: countError ? 0 : (count ?? 0) };
        })
      );

      setSystemStatus({ supabaseConnected: connected, onlineUsers, tableRowCounts: tableCounts });
    } catch {
      setSystemStatus({ supabaseConnected: false, onlineUsers: 0, tableRowCounts: [] });
    }
  }, []);

  /* ---- Profile update (role / plan) ---- */

  const handleUpdateProfile = useCallback(
    async (profileId: string, field: 'role' | 'plan', value: string) => {
      setUpdatingProfile(profileId);
      try {
        const updateData = field === 'role'
          ? { role: value as Profile['role'] }
          : { plan: value as Profile['plan'] };

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', profileId);

        if (updateError) throw updateError;

        // Also log the audit
        if (user) {
          await supabase.from('admin_audit_logs').insert({
            admin_user_id: user.id,
            target_user_id: profileId,
            action: `change_${field}`,
            metadata: { field, new_value: value },
          });
        }

        setProfiles((prev) =>
          prev.map((p) =>
            p.id === profileId ? { ...p, [field]: value } : p
          )
        );

        toast.success(`${field === 'role' ? '역할' : '플랜'}이 ${value}(으)로 변경되었습니다.`);
      } catch (err) {
        toast.error(
          `변경 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`
        );
      } finally {
        setUpdatingProfile(null);
      }
    },
    [user]
  );

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  /* ---- Auth guard screens ---- */

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin" />
          계정 권한을 확인하는 중입니다
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AdminGate
        icon={<Lock className="w-6 h-6" />}
        title="관리자 로그인이 필요합니다"
        description="/admin은 운영자 전용 페이지입니다. 먼저 관리자 계정으로 로그인하세요."
      >
        <Link className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-slate-100" to="/auth?next=/admin">
          로그인하러 가기
        </Link>
        <Link className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10" to="/">
          홈으로
        </Link>
      </AdminGate>
    );
  }

  if (!isAdmin) {
    return (
      <AdminGate
        icon={<ShieldCheck className="w-6 h-6" />}
        title="관리자 권한이 없습니다"
        description="네 계정을 owner로 지정해야 관리자 콘솔을 볼 수 있습니다. Supabase SQL Editor에서 아래 SQL을 한 번 실행하세요."
      >
        <div className="w-full max-w-xl rounded-xl border border-white/10 bg-black/30 p-4 text-left">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Owner bootstrap SQL</p>
          <code className="block whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-xs leading-relaxed text-emerald-200">
            {ownerBootstrapSql}
          </code>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-slate-100"
            onClick={() => void refreshProfile()}
            type="button"
          >
            권한 다시 확인
          </button>
          <Link className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10" to="/">
            홈으로
          </Link>
        </div>
      </AdminGate>
    );
  }

  /* ---- Main admin UI ---- */

  const tabs: { key: AdminTab; label: string; icon: ReactNode }[] = [
    { key: 'dashboard', label: '대시보드', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'members', label: '회원 관리', icon: <Users className="w-4 h-4" /> },
    { key: 'activity', label: '활동 로그', icon: <ScrollText className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#f5f2ea] text-slate-950">
      {/* Header */}
      <header className="border-b border-slate-900/10 bg-[#f9f7f1]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">Personai Operations</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">관리자 콘솔</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50" to="/">
              <Home className="w-4 h-4" />
              사이트로
            </Link>
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
              onClick={() => void loadAdminData()}
              type="button"
            >
              <RefreshCcw className={cn('w-4 h-4', dataLoading && 'animate-spin')} />
              새로고침
            </button>
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              onClick={() => void signOut()}
              type="button"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-slate-900/10 bg-[#f9f7f1]/60">
        <div className="mx-auto max-w-7xl px-5">
          <nav className="flex gap-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors',
                  activeTab === tab.key
                    ? 'border-slate-950 text-slate-950'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                )}
                type="button"
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-5 py-6">
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardTab
            stats={stats}
            modeUsage={modeUsage}
            systemStatus={systemStatus}
            dataLoading={dataLoading}
          />
        )}

        {activeTab === 'members' && (
          <MembersTab
            profiles={profiles}
            dataLoading={dataLoading}
            updatingProfile={updatingProfile}
            currentUserId={user.id}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityTab
            events={recentEvents}
            dataLoading={dataLoading}
          />
        )}
      </main>
    </div>
  );
}

/* =====================================================
   TAB: Dashboard
   ===================================================== */

function DashboardTab({
  stats,
  modeUsage,
  systemStatus,
  dataLoading,
}: {
  stats: AdminStats;
  modeUsage: ModeUsage[];
  systemStatus: SystemStatus;
  dataLoading: boolean;
}) {
  const maxModeCount = Math.max(...modeUsage.map((m) => m.count), 1);

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={<Users className="w-5 h-5" />} label="총 회원" value={stats.totalUsers} note={`오늘 가입 ${stats.todayUsers}명`} />
        <MetricCard icon={<Crown className="w-5 h-5" />} label="유료 플랜" value={stats.premiumUsers + stats.proUsers} note={`Premium ${stats.premiumUsers} · Pro ${stats.proUsers}`} />
        <MetricCard icon={<Activity className="w-5 h-5" />} label="오늘 사용 이벤트" value={stats.todayUsage} note={`프리미엄 ${stats.todayPremiumUsage}건`} />
        <MetricCard icon={<AlertCircle className="w-5 h-5" />} label="오늘 API 오류" value={stats.todayErrors} note="usage_events 연동 후 집계" tone={stats.todayErrors > 0 ? 'warn' : 'default'} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* Mode usage bar chart */}
        <div className="rounded-2xl border border-slate-900/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black">모드별 사용량</h2>
              <p className="text-xs text-slate-500">전체 기간 누적 사용 횟수</p>
            </div>
            {dataLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400 ml-auto" />}
          </div>

          {modeUsage.every((m) => m.count === 0) ? (
            <div className="py-10 text-center text-sm text-slate-400">
              아직 기록된 사용 이벤트가 없습니다.
            </div>
          ) : (
            <div className="space-y-2.5">
              {modeUsage.map((item) => (
                <div key={item.mode} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-bold text-slate-600 text-right shrink-0">
                    {MODE_LABELS[item.mode] ?? item.mode}
                  </span>
                  <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full bg-slate-950 rounded-lg transition-all duration-500"
                      style={{ width: `${Math.max((item.count / maxModeCount) * 100, item.count > 0 ? 3 : 0)}%` }}
                    />
                    {item.count > 0 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500">
                        {item.count.toLocaleString('ko-KR')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System status sidebar */}
        <aside className="space-y-4">
          {/* Connection status */}
          <div className="rounded-2xl border border-slate-900/10 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Server className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-black">시스템 상태</h2>
            </div>

            <div className="space-y-3">
              {/* Supabase connection */}
              <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  {systemStatus.supabaseConnected ? (
                    <Wifi className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-xs font-bold text-slate-700">Supabase</span>
                </div>
                <Badge tone={systemStatus.supabaseConnected ? 'premium' : 'warn'}>
                  {systemStatus.supabaseConnected ? '연결됨' : '연결 실패'}
                </Badge>
              </div>

              {/* Online users */}
              <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-700">현재 접속자</span>
                </div>
                <span className="text-sm font-black">{systemStatus.onlineUsers}명</span>
              </div>

              {/* Table row counts */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">DB 테이블 행 수</p>
                {systemStatus.tableRowCounts.map((tc) => (
                  <div key={tc.table} className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-slate-600 font-mono">{tc.table}</span>
                    <span className="text-xs font-black text-slate-800">{tc.count.toLocaleString('ko-KR')}</span>
                  </div>
                ))}
                {systemStatus.tableRowCounts.length === 0 && (
                  <p className="text-xs text-slate-400">로딩 중...</p>
                )}
              </div>
            </div>
          </div>

          {/* Plan distribution */}
          <div className="rounded-2xl border border-slate-900/10 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Crown className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-black">플랜 분포</h2>
            </div>
            <div className="space-y-2">
              <PlanBar label="Free" count={stats.freeUsers} total={stats.totalUsers} color="bg-slate-400" />
              <PlanBar label="Premium" count={stats.premiumUsers} total={stats.totalUsers} color="bg-emerald-500" />
              <PlanBar label="Pro" count={stats.proUsers} total={stats.totalUsers} color="bg-indigo-500" />
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function PlanBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-slate-600">{label}</span>
        <span className="text-xs text-slate-500">{count}명 ({pct.toFixed(1)}%)</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }}
        />
      </div>
    </div>
  );
}

/* =====================================================
   TAB: Members
   ===================================================== */

function MembersTab({
  profiles,
  dataLoading,
  updatingProfile,
  currentUserId,
  onUpdateProfile,
}: {
  profiles: Profile[];
  dataLoading: boolean;
  updatingProfile: string | null;
  currentUserId: string;
  onUpdateProfile: (id: string, field: 'role' | 'plan', value: string) => Promise<void>;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return profiles;
    const q = searchQuery.toLowerCase();
    return profiles.filter(
      (p) =>
        (p.email ?? '').toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.plan.toLowerCase().includes(q)
    );
  }, [profiles, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="이메일, 역할, 플랜으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition-colors"
          />
        </div>
        <span className="text-xs text-slate-500 font-bold">
          {filtered.length}명 표시 / 총 {profiles.length}명
        </span>
        {dataLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
      </div>

      {/* Members table */}
      <div className="rounded-2xl border border-slate-900/10 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-5 py-3 font-black">이메일</th>
                <th className="px-5 py-3 font-black">역할</th>
                <th className="px-5 py-3 font-black">플랜</th>
                <th className="px-5 py-3 font-black">가입일</th>
                <th className="px-5 py-3 font-black">최근 확인</th>
                <th className="px-5 py-3 font-black">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-5 py-10 text-center text-sm text-slate-500" colSpan={6}>
                    {searchQuery ? '검색 결과가 없습니다.' : '아직 표시할 회원이 없습니다.'}
                  </td>
                </tr>
              ) : filtered.map((item) => {
                const isCurrentUser = item.id === currentUserId;
                const isUpdating = updatingProfile === item.id;
                const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
                const isOnline = item.last_seen_at && item.last_seen_at >= fiveMinAgo;

                return (
                  <tr key={item.id} className={cn('hover:bg-slate-50/80', isUpdating && 'opacity-60')}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{item.email || item.id.slice(0, 8)}</span>
                        {isCurrentUser && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                            나
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={item.role}
                        onChange={(e) => void onUpdateProfile(item.id, 'role', e.target.value)}
                        disabled={isUpdating || (item.role === 'owner' && isCurrentUser)}
                        className={cn(
                          'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold outline-none transition-colors',
                          'focus:border-slate-400 focus:ring-2 focus:ring-slate-200',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          item.role === 'owner' && 'bg-slate-950 text-white border-slate-950',
                          item.role === 'admin' && 'bg-indigo-50 text-indigo-700 border-indigo-200',
                        )}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={item.plan}
                        onChange={(e) => void onUpdateProfile(item.id, 'plan', e.target.value)}
                        disabled={isUpdating}
                        className={cn(
                          'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold outline-none transition-colors',
                          'focus:border-slate-400 focus:ring-2 focus:ring-slate-200',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          item.plan === 'premium' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          item.plan === 'pro' && 'bg-indigo-50 text-indigo-700 border-indigo-200',
                        )}
                      >
                        <option value="free">Free</option>
                        <option value="premium">Premium</option>
                        <option value="pro">Pro</option>
                      </select>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{formatDate(item.created_at)}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{formatDate(item.last_seen_at)}</td>
                    <td className="px-5 py-3">
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          온라인
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">오프라인</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   TAB: Activity Log
   ===================================================== */

function ActivityTab({
  events,
  dataLoading,
}: {
  events: (UsageEvent & { userEmail?: string })[];
  dataLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black">최근 활동 로그</h2>
          <p className="mt-0.5 text-xs text-slate-500">usage_events 테이블에서 최근 20건</p>
        </div>
        {dataLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-slate-900/10 bg-white p-10 shadow-sm text-center">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">아직 기록된 활동이 없습니다.</p>
          <p className="text-xs text-slate-400 mt-1">사용 이벤트가 기록되면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-900/10 bg-white shadow-sm overflow-hidden">
          <div className="relative pl-8">
            {/* Timeline line */}
            <div className="absolute left-[18px] top-0 bottom-0 w-px bg-slate-200" />

            {events.map((evt, i) => {
              const isError = evt.status === 'error';
              return (
                <div
                  key={evt.id}
                  className={cn(
                    'relative flex items-start gap-4 px-5 py-4',
                    i < events.length - 1 && 'border-b border-slate-50'
                  )}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-[12px] top-5 z-10">
                    {isError ? (
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone={isError ? 'warn' : 'premium'}>
                        {isError ? '오류' : '성공'}
                      </Badge>
                      <Badge tone="default">
                        {MODE_LABELS[evt.mode] ?? evt.mode}
                      </Badge>
                      {evt.premium_domain && (
                        <span className="text-[10px] text-slate-400 font-mono">{evt.premium_domain}</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">
                        {evt.userEmail ?? (evt.user_id ? evt.user_id.slice(0, 8) + '...' : '익명')}
                      </span>
                      <span>{formatTimeAgo(evt.created_at)}</span>
                      <span className="text-slate-300">{formatDate(evt.created_at)}</span>
                    </div>
                  </div>

                  {/* Cost */}
                  {evt.estimated_cost > 0 && (
                    <span className="text-[10px] font-black text-slate-400 shrink-0">
                      ${evt.estimated_cost.toFixed(4)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   Shared components
   ===================================================== */

function AdminGate({ icon, title, description, children }: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 text-white flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-950">
          {icon}
        </div>
        <h1 className="text-2xl font-black tracking-tight">{title}</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-300">{description}</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3">{children}</div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, note, tone = 'default' }: {
  icon: ReactNode;
  label: string;
  value: number;
  note: string;
  tone?: 'default' | 'warn';
}) {
  return (
    <div className={cn('rounded-2xl border bg-white p-5 shadow-sm', tone === 'warn' ? 'border-amber-200' : 'border-slate-900/10')}>
      <div className="flex items-center justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tone === 'warn' ? 'bg-amber-100 text-amber-700' : 'bg-slate-950 text-white')}>
          {icon}
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Live</span>
      </div>
      <p className="mt-4 text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight">{value.toLocaleString('ko-KR')}</p>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function Badge({ children, tone = 'default' }: {
  children: ReactNode;
  tone?: 'default' | 'owner' | 'admin' | 'premium' | 'warn';
}) {
  return (
    <span className={cn(
      'inline-flex rounded-full px-2.5 py-1 text-[11px] font-black',
      tone === 'owner' && 'bg-slate-950 text-white',
      tone === 'admin' && 'bg-indigo-100 text-indigo-700',
      tone === 'premium' && 'bg-emerald-100 text-emerald-700',
      tone === 'warn' && 'bg-red-100 text-red-700',
      tone === 'default' && 'bg-slate-100 text-slate-600',
    )}>
      {children}
    </span>
  );
}
