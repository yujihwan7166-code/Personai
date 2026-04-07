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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

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
