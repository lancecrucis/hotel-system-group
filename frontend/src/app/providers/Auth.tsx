import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../../types/models';
import { api, send } from '../../services/client';
import { AuthContext } from './AuthContext';
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  useEffect(() => {
    api<{ user: User | null }>('/auth/me')
      .then((r) => setUser(r.user))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function logout() {
    await api('/auth/logout', send('POST'));
    setUser(null);
  }
  return (
    <AuthContext.Provider value={{ user, setUser, loading, error, logout }}>{children}</AuthContext.Provider>
  );
}
