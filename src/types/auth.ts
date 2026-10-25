import { User, Session } from '@supabase/supabase-js';

export type UserRole =
  | 'Institution'
  | 'Scrutiny Officer'
  | 'Regional Officer'
  | 'EVC Member'
  | 'Admin'
  | 'Admin / Member Secretary';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  institutionCode?: string | null;
  region?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type AuthMode = 'supabase' | 'prototype';

export interface DemoAccountInfo {
  role: UserRole;
  label: string;
  email: string;
  fullName: string;
  institutionCode?: string;
  region?: string;
  description: string;
  badgeColor: string;
  defaultPasswordHint: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  currentRole: UserRole | 'Guest';
  isAuthenticated: boolean;
  isLoading: boolean;
  authMode: AuthMode;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; isSupabaseAuthError?: boolean }>;
  signUp: (email: string, password: string, profileData: { fullName: string; role: UserRole; institutionCode?: string; region?: string }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  usePrototypeSandbox: (role: UserRole) => void;
  switchRole: (role: UserRole) => Promise<void>;
}
