import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserRole, UserProfile, AuthMode, DemoAccountInfo, AuthContextType } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_ACCOUNTS: DemoAccountInfo[] = [
  {
    role: 'Institution',
    label: 'Institution Signatory',
    email: 'institution@aicte.gov.in',
    fullName: 'Prof. Arvind Patil',
    institutionCode: 'VIT-MUM-142',
    region: 'Western',
    description: 'Submit EoA applications, upload compliance undertakings, view institute dossier',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    defaultPasswordHint: 'DemoPassword@2026!'
  },
  {
    role: 'Scrutiny Officer',
    label: 'Scrutiny Officer',
    email: 'scrutiny.officer@aicte.gov.in',
    fullName: 'Dr. S. K. Sharma',
    region: 'Western',
    description: 'Initial document scrutiny, defect identification, deficiency dispatch',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    defaultPasswordHint: 'DemoPassword@2026!'
  },
  {
    role: 'Regional Officer',
    label: 'Regional Officer (RO Western)',
    email: 'regional.officer@aicte.gov.in',
    fullName: 'Dr. Ramesh Chandra',
    region: 'Western',
    description: 'Scrutiny oversight, stage transitions, EVC panel constitution, compliance notices',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    defaultPasswordHint: 'DemoPassword@2026!'
  },
  {
    role: 'EVC Member',
    label: 'EVC Inspection Committee Member',
    email: 'evc.member@aicte.gov.in',
    fullName: 'Prof. (Dr.) Amitabh Mohanty',
    region: 'Western',
    description: 'Inspect assigned institutions, verify physical & virtual infrastructure reports',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    defaultPasswordHint: 'DemoPassword@2026!'
  },
  {
    role: 'Admin / Member Secretary',
    label: 'Admin / Member Secretary',
    email: 'admin@aicte.gov.in',
    fullName: 'Chief Regulatory Director (Member Secretary)',
    region: 'Central',
    description: 'Full statutory governance, user role assignments, audit logs, escalation runs',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    defaultPasswordHint: 'DemoPassword@2026!'
  }
];

export const DEMO_PROFILES: Record<string, UserProfile> = {
  'Institution': {
    id: 'inst-demo-user-001',
    email: 'institution@aicte.gov.in',
    fullName: 'Prof. Arvind Patil',
    role: 'Institution',
    institutionCode: 'VIT-MUM-142',
    region: 'Western'
  },
  'Scrutiny Officer': {
    id: 'so-demo-user-002',
    email: 'scrutiny.officer@aicte.gov.in',
    fullName: 'Dr. S. K. Sharma',
    role: 'Scrutiny Officer',
    region: 'Western'
  },
  'Regional Officer': {
    id: 'ro-demo-user-003',
    email: 'regional.officer@aicte.gov.in',
    fullName: 'Dr. Ramesh Chandra',
    role: 'Regional Officer',
    region: 'Western'
  },
  'EVC Member': {
    id: 'evc-demo-user-004',
    email: 'evc.member@aicte.gov.in',
    fullName: 'Prof. (Dr.) Amitabh Mohanty',
    role: 'EVC Member',
    region: 'Western'
  },
  'Admin': {
    id: 'admin-demo-user-005',
    email: 'admin@aicte.gov.in',
    fullName: 'Chief Regulatory Director (Member Secretary)',
    role: 'Admin',
    region: 'Central'
  },
  'Admin / Member Secretary': {
    id: 'admin-demo-user-005',
    email: 'admin@aicte.gov.in',
    fullName: 'Chief Regulatory Director (Member Secretary)',
    role: 'Admin / Member Secretary',
    region: 'Central'
  }
};

const LOCAL_STORAGE_ACTIVE_PROFILE = 'aicte_active_auth_profile';
const LOCAL_STORAGE_AUTH_MODE = 'aicte_active_auth_mode';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>(() => {
    try {
      const mode = localStorage.getItem(LOCAL_STORAGE_AUTH_MODE);
      if (mode === 'supabase' || mode === 'prototype') return mode;
    } catch {}
    return 'prototype';
  });
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ACTIVE_PROFILE);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Default initial profile for prototype evaluation is Regional Officer
    return DEMO_PROFILES['Regional Officer'];
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load profile from remote Supabase profiles table
  const fetchRemoteProfile = useCallback(async (activeUser: User): Promise<UserProfile | null> => {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeUser.id)
        .maybeSingle();

      if (!error && data) {
        const mappedProfile: UserProfile = {
          id: data.id,
          email: data.email || activeUser.email || '',
          fullName: data.full_name || '',
          role: data.role as UserRole,
          institutionCode: data.institution_code,
          region: data.region,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        return mappedProfile;
      }

      // If profile row not found yet in profiles table, read from auth.user_metadata
      const meta = activeUser.user_metadata || {};
      const fallbackProfile: UserProfile = {
        id: activeUser.id,
        email: activeUser.email || '',
        fullName: meta.full_name || activeUser.email?.split('@')[0] || 'AICTE Officer',
        role: (meta.role as UserRole) || 'Institution',
        institutionCode: meta.institution_code,
        region: meta.region
      };
      return fallbackProfile;
    } catch (err) {
      console.warn('Failed to fetch user profile from Supabase:', err);
      return null;
    }
  }, []);

  // Listen to Supabase Auth state changes
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session: initialSession } } = await supabase.auth.getSession();
          if (isMounted && initialSession?.user) {
            setSession(initialSession);
            setUser(initialSession.user);
            setAuthMode('supabase');
            localStorage.setItem(LOCAL_STORAGE_AUTH_MODE, 'supabase');

            const remoteProf = await fetchRemoteProfile(initialSession.user);
            if (remoteProf && isMounted) {
              setProfile(remoteProf);
              try {
                localStorage.setItem(LOCAL_STORAGE_ACTIVE_PROFILE, JSON.stringify(remoteProf));
              } catch {}
            }
          }
        } catch (err) {
          console.warn('Supabase auth getSession error:', err);
        }
      }
      if (isMounted) setIsLoading(false);
    }

    initAuth();

    let authSubscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user || null);

        if (newSession?.user) {
          setAuthMode('supabase');
          localStorage.setItem(LOCAL_STORAGE_AUTH_MODE, 'supabase');
          const remoteProf = await fetchRemoteProfile(newSession.user);
          if (remoteProf && isMounted) {
            setProfile(remoteProf);
            try {
              localStorage.setItem(LOCAL_STORAGE_ACTIVE_PROFILE, JSON.stringify(remoteProf));
            } catch {}
          }
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setAuthMode('prototype');
          try {
            localStorage.removeItem(LOCAL_STORAGE_ACTIVE_PROFILE);
            localStorage.removeItem(LOCAL_STORAGE_AUTH_MODE);
          } catch {}
        }
      });
      authSubscription = data.subscription;
    }

    return () => {
      isMounted = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, [fetchRemoteProfile]);

  // Sign In with email & password (attempts genuine Supabase Auth)
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string; isSupabaseAuthError?: boolean }> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message, isSupabaseAuthError: true };
        }
        if (data.user) {
          setSession(data.session);
          setUser(data.user);
          setAuthMode('supabase');
          localStorage.setItem(LOCAL_STORAGE_AUTH_MODE, 'supabase');

          const prof = await fetchRemoteProfile(data.user);
          if (prof) {
            setProfile(prof);
            localStorage.setItem(LOCAL_STORAGE_ACTIVE_PROFILE, JSON.stringify(prof));
          }
        }
        setIsLoading(false);
        return { success: true };
      }

      // Offline mode check
      const matched = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase());
      if (matched && password === matched.defaultPasswordHint) {
        const demoProf = DEMO_PROFILES[matched.role];
        setProfile(demoProf);
        setAuthMode('prototype');
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_PROFILE, JSON.stringify(demoProf));
        localStorage.setItem(LOCAL_STORAGE_AUTH_MODE, 'prototype');
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return { success: false, error: 'Invalid credentials in offline mode.' };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err?.message || 'Authentication error.' };
    }
  };

  // Switch to prototype sandbox mode explicitly
  const usePrototypeSandbox = (role: UserRole): void => {
    const demoProf = DEMO_PROFILES[role] || DEMO_PROFILES['Regional Officer'];
    setProfile(demoProf);
    setAuthMode('prototype');
    try {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_PROFILE, JSON.stringify(demoProf));
      localStorage.setItem(LOCAL_STORAGE_AUTH_MODE, 'prototype');
    } catch {}
  };

  // Sign Up new user with role and metadata
  const signUp = async (
    email: string,
    password: string,
    profileData: { fullName: string; role: UserRole; institutionCode?: string; region?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: profileData.fullName,
              role: profileData.role,
              institution_code: profileData.institutionCode,
              region: profileData.region
            }
          }
        });

        if (error) {
          setIsLoading(false);
          return { success: false, error: error.message };
        }

        if (data.user) {
          const newProfile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            fullName: profileData.fullName,
            role: profileData.role,
            institutionCode: profileData.institutionCode,
            region: profileData.region
          };
          setProfile(newProfile);
          setAuthMode('supabase');
          localStorage.setItem(LOCAL_STORAGE_ACTIVE_PROFILE, JSON.stringify(newProfile));
          localStorage.setItem(LOCAL_STORAGE_AUTH_MODE, 'supabase');
        }

        setIsLoading(false);
        return { success: true };
      }

      // Offline mode
      const offlineProf: UserProfile = {
        id: `user-${Date.now()}`,
        email,
        fullName: profileData.fullName,
        role: profileData.role,
        institutionCode: profileData.institutionCode,
        region: profileData.region
      };
      setProfile(offlineProf);
      setAuthMode('prototype');
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_PROFILE, JSON.stringify(offlineProf));
      localStorage.setItem(LOCAL_STORAGE_AUTH_MODE, 'prototype');
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err?.message || 'Sign up failed.' };
    }
  };

  // Switch demo / active role directly
  const switchRole = async (newRole: UserRole): Promise<void> => {
    usePrototypeSandbox(newRole);
  };

  // Sign Out
  const signOut = async (): Promise<void> => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setAuthMode('prototype');
    try {
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_PROFILE);
      localStorage.removeItem(LOCAL_STORAGE_AUTH_MODE);
    } catch {}
  };

  const currentRole: UserRole | 'Guest' = profile?.role || 'Guest';
  const isAuthenticated = Boolean(profile);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        currentRole,
        isAuthenticated,
        isLoading,
        authMode,
        signIn,
        signUp,
        signOut,
        usePrototypeSandbox,
        switchRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      session: null,
      profile: DEMO_PROFILES['Regional Officer'],
      currentRole: 'Regional Officer',
      isAuthenticated: true,
      isLoading: false,
      authMode: 'prototype',
      signIn: async () => ({ success: true }),
      signUp: async () => ({ success: true }),
      signOut: async () => {},
      usePrototypeSandbox: () => {},
      switchRole: async () => {}
    };
  }
  return context;
};
