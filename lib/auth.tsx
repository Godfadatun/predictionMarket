'use client';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api, token, User } from './api';

interface AuthState { user: User | null; balanceKobo: number | null; ready: boolean; refresh: () => Promise<void>; login: (t: string) => Promise<void>; logout: () => Promise<void> }
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [balanceKobo, setBalance] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!token.get()) { setUser(null); setBalance(null); setReady(true); return; }
    try {
      const [me, wallet] = await Promise.all([api<User>('/auth/me'), api<{ balanceKobo: number }>('/wallet')]);
      setUser(me.data); setBalance(wallet.data.balanceKobo);
    } catch {
      token.clear(); setUser(null); setBalance(null);
    } finally { setReady(true); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const login = async (t: string) => { token.set(t); await refresh(); };
  const logout = async () => { await api('/auth/logout', { method: 'POST' }).catch(() => undefined); token.clear(); setUser(null); setBalance(null); };

  return <Ctx.Provider value={{ user, balanceKobo, ready, refresh, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
};
