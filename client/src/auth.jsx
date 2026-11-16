import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api, clearToken, getToken, setToken } from './api';
import { can } from './permissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    let active = true;

    if (!getToken()) {
      setLoading(false);
      return undefined;
    }

    api('/auth/me')
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        if (active) {
          clearToken();
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const onUnauthorized = () => {
      clearToken();
      setUser(null);
    };
    window.addEventListener('scholara:unauthorized', onUnauthorized);

    return () => {
      active = false;
      window.removeEventListener('scholara:unauthorized', onUnauthorized);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const data = await api('/auth/me');
    setUser(data.user);
    return data.user;
  }, []);

  const has = useCallback((permission) => can(user?.role, permission), [user]);

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh, has }),
    [user, loading, login, logout, refresh, has],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
