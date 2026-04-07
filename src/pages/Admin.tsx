import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Crown,
  Database,
  Home,
  Loader2,
  Lock,
  RefreshCcw,
  ShieldCheck,
  Users,
} from 'lucide-react';

type Profile = Tables<'profiles'>;

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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState<AdminStats>(EMPTY_STATS);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthReady = !loading && !profileLoading;
  const ownerBootstrapSql = useMemo(() => {
    const email = profile?.email || user?.email || 'your@email.com';
    return `update public.profiles set role = 'owner' where email = '${email}';`;
  }, [profile?.email, user?.email]);

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
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
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
    } catch (adminError) {
      setError(adminError instanceof Error ? adminError.message : '관리자 데이터를 불러오지 못했습니다.');
    } finally {
      setDataLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

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

  return (
    <div className="min-h-screen bg-[#f5f2ea] text-slate-950">
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

      <main className="mx-auto max-w-7xl px-5 py-6">
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={<Users className="w-5 h-5" />} label="총 회원" value={stats.totalUsers} note={`오늘 가입 ${stats.todayUsers}명`} />
          <MetricCard icon={<Crown className="w-5 h-5" />} label="유료 플랜" value={stats.premiumUsers + stats.proUsers} note={`Premium ${stats.premiumUsers} · Pro ${stats.proUsers}`} />
          <MetricCard icon={<Activity className="w-5 h-5" />} label="오늘 사용 이벤트" value={stats.todayUsage} note={`프리미엄 ${stats.todayPremiumUsage}건`} />
          <MetricCard icon={<AlertCircle className="w-5 h-5" />} label="오늘 API 오류" value={stats.todayErrors} note="usage_events 연동 후 집계" tone={stats.todayErrors > 0 ? 'warn' : 'default'} />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="rounded-2xl border border-slate-900/10 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-black">최근 회원</h2>
                <p className="mt-0.5 text-xs text-slate-500">처음에는 계정과 권한 확인 중심으로만 봅니다.</p>
              </div>
              {dataLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-black">이메일</th>
                    <th className="px-5 py-3 font-black">Role</th>
                    <th className="px-5 py-3 font-black">Plan</th>
                    <th className="px-5 py-3 font-black">가입일</th>
                    <th className="px-5 py-3 font-black">최근 확인</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profiles.length === 0 ? (
                    <tr>
                      <td className="px-5 py-10 text-center text-sm text-slate-500" colSpan={5}>
                        아직 표시할 회원이 없습니다.
                      </td>
                    </tr>
                  ) : profiles.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3 font-semibold text-slate-800">{item.email || item.id}</td>
                      <td className="px-5 py-3">
                        <Badge tone={item.role === 'owner' ? 'owner' : item.role === 'admin' ? 'admin' : 'default'}>
                          {roleLabel(item.role)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={item.plan === 'free' ? 'default' : 'premium'}>
                          {planLabel(item.plan)}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">{formatDate(item.created_at)}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{formatDate(item.last_seen_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-4">
            <InfoPanel
              icon={<Database className="w-5 h-5" />}
              title="이번 버전의 원칙"
              items={[
                '프리미엄 자문은 아직 로그인으로 막지 않습니다.',
                '관리자 콘솔은 회원/권한/사용량 중심으로만 봅니다.',
                '대화 원문 열람 기능은 일부러 넣지 않았습니다.',
              ]}
            />
            <InfoPanel
              icon={<BarChart3 className="w-5 h-5" />}
              title="다음에 붙일 것"
              items={[
                '질문 실행 시 usage_events 기록',
                '토큰 지갑과 토큰 차감 로그',
                '결제 성공/실패 webhook 대시보드',
              ]}
            />
          </aside>
        </section>
      </main>
    </div>
  );
}

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
  tone?: 'default' | 'owner' | 'admin' | 'premium';
}) {
  return (
    <span className={cn(
      'inline-flex rounded-full px-2.5 py-1 text-[11px] font-black',
      tone === 'owner' && 'bg-slate-950 text-white',
      tone === 'admin' && 'bg-indigo-100 text-indigo-700',
      tone === 'premium' && 'bg-emerald-100 text-emerald-700',
      tone === 'default' && 'bg-slate-100 text-slate-600',
    )}>
      {children}
    </span>
  );
}

function InfoPanel({ icon, title, items }: {
  icon: ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-slate-900/10 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">{icon}</div>
        <h2 className="text-sm font-black">{title}</h2>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-600">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
