import { createContext, useContext } from 'react';
import type { User } from '../../types/models';
export const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  error: string;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;
}>({ user: null, loading: true, error: '', setUser: () => {}, logout: async () => {} });
export const useAuth = () => useContext(AuthContext);
