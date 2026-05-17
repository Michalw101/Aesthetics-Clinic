import { useState, useEffect } from 'react';

const STORAGE_KEY = 'aesthetics_clinic_user';

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

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    setUser(loadStoredUser());
    setLoading(false);
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

  const login = async () => {
    setAuthError(null);
    const name = window.prompt('שם מלא:');
    if (!name?.trim()) {
      setAuthError('התחברות בוטלה');
      return;
    }
    const email = window.prompt('אימייל:')?.trim() ?? '';
    const id = crypto.randomUUID();
    const authUser: AuthUser = {
      id,
      uid: id,
      email,
      displayName: name.trim(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    setUser(authUser);
  };

  const logout = async () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return { user, profile, loading, login, logout, isAdmin: false, authError };
}
