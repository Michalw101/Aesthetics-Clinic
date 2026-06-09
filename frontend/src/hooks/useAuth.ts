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

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) {
        setAuthError(error.message);
      } else if (session?.user) {
        setUser(mapSupabaseUser(session.user));
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
        setAuthError(null);
      } else {
        setUser(null);
      }
      setLoading(false);
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

  return { user, profile, loading, logout, isAdmin: false, authError };
}
