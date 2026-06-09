import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AuthUser {
  id: string;
  uid: string;
  email: string;
  displayName: string;
}

export interface UserProfile {
  id: string;
  uid: string;
  name: string;
  email: string;
  createdAt: string | null;
}

function mapSupabaseUser(supabaseUser: User): AuthUser {
  const meta = supabaseUser.user_metadata ?? {};
  const firstName = (meta.first_name as string | undefined) ?? '';
  const lastName = (meta.last_name as string | undefined) ?? '';
  const displayName =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    supabaseUser.email?.split('@')[0] ||
    'משתמשת';

  return {
    id: supabaseUser.id,
    uid: supabaseUser.id,
    email: supabaseUser.email ?? '',
    displayName,
  };
}

async function fetchIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch profile:', error);
    return false;
  }

  return data?.is_admin === true;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let profileFetchId = 0;

    const applySession = async (session: { user: User } | null) => {
      const fetchId = ++profileFetchId;

      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
        setAuthError(null);
        const admin = await fetchIsAdmin(session.user.id);
        if (!mounted || fetchId !== profileFetchId) return;
        setIsAdmin(admin);
      } else {
        setUser(null);
        setIsAdmin(false);
      }

      if (mounted) {
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) {
        setAuthError(error.message);
        setLoading(false);
        return;
      }
      void applySession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      void applySession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const profile: UserProfile | null = user
    ? {
        id: user.uid,
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        createdAt: null,
      }
    : null;

  const logout = async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
    }
  };

  return { user, profile, loading, logout, isAdmin, authError };
}
