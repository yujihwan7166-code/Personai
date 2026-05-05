import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Tables } from '@/integrations/supabase/types';

export type UserProfile = Tables<'profiles'>;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  profileLoading: true,
  isAdmin: false,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

/**
 * 개발용 인증 우회 플래그.
 * .env.local 에 `VITE_BYPASS_AUTH=1` 설정 시 가짜 user/profile 주입.
 * - 페이지 진입 게이트(`!user` 체크) 통과 목적
 * - 실제 Supabase API 호출은 여전히 인증 토큰 필요 (로그인 안 한 상태이므로 RLS 통과 못 함)
 * - 프로덕션 빌드에서 환경변수 빠지면 자동으로 정상 흐름 복귀
 */
const BYPASS_AUTH = import.meta.env.VITE_BYPASS_AUTH === '1' || import.meta.env.VITE_BYPASS_AUTH === 'true';

const MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'dev@local',
  aud: 'authenticated',
  created_at: new Date(0).toISOString(),
  app_metadata: { provider: 'dev-bypass' },
  user_metadata: { full_name: '개발 모드' },
  role: 'authenticated',
} as unknown as User;

const MOCK_PROFILE = {
  id: MOCK_USER.id,
  email: MOCK_USER.email,
  plan: 'free',
  role: 'user',
} as unknown as UserProfile;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(BYPASS_AUTH ? MOCK_USER : null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!BYPASS_AUTH);
  const [profile, setProfile] = useState<UserProfile | null>(BYPASS_AUTH ? MOCK_PROFILE : null);
  const [profileLoading, setProfileLoading] = useState(!BYPASS_AUTH);

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);

    try {
      await supabase.rpc('touch_profile');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', nextUser.id)
        .maybeSingle();

      if (error) {
        console.warn('[auth] failed to load profile', error);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.warn('[auth] profile bootstrap failed', error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(user);
  }, [loadProfile, user]);

  useEffect(() => {
    if (BYPASS_AUTH) {
      // 개발 우회 모드 — Supabase 구독 스킵, mock user 유지
       
      console.warn('[auth] VITE_BYPASS_AUTH 활성화 — mock user 사용 중. 프로덕션에서는 절대 활성화하지 말 것.');
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setSession(session);
      setUser(nextUser);
      setLoading(false);
      setTimeout(() => void loadProfile(nextUser), 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const nextUser = session?.user ?? null;
      setSession(session);
      setUser(nextUser);
      setLoading(false);
      void loadProfile(nextUser);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signOut = async () => {
    if (BYPASS_AUTH) return;  // 우회 모드에서는 sign out 무의미
    await supabase.auth.signOut();
    setProfile(null);
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, profileLoading, isAdmin, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
