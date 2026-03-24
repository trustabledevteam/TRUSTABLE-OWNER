import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';

interface User {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  verification_status?: string;
}

interface AuthContextType {
  session: { access_token: string } | null;
  user: User | null;
  profile: any | null;
  isLoading: boolean;
  isReadOnly: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  login: (email: string, password: string) => Promise<any>;
  signup: (email: string, password: string, options?: any) => Promise<any>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isReadOnly: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  login: async () => {},
  signup: async () => {},
});

export const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const profileData = await apiClient.get(`/api/profiles/${userId}`);
      setProfile(profileData || null);
    } catch (e: any) {
      console.error("AuthContext: Error loading profile:", e.message);
      setProfile(null);
    }
  };

  const login = async (email: string, password: string) => {
    const data = await apiClient.post('/api/auth/login', { email, password });
    localStorage.setItem('access_token', data.session.access_token);
    localStorage.setItem('refresh_token', data.session.refresh_token);
    setSession({ access_token: data.session.access_token });
    setUser(data.user);
    await fetchProfile(data.user.id);
    return data;
  };

  const signup = async (email: string, password: string, options?: any) => {
    const data = await apiClient.post('/api/auth/signup', {
      email, password,
      username: options?.data?.username,
      signup_context: options?.data?.signup_context,
      role: options?.data?.role || 'OWNER'
    });
    localStorage.setItem('access_token', data.session.access_token);
    localStorage.setItem('refresh_token', data.session.refresh_token);
    setSession({ access_token: data.session.access_token });
    setUser(data.user);
    return data;
  };

  const signOut = async () => {
    try { await apiClient.post('/api/auth/logout'); } catch {}
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  // Initialize session from stored token
  useEffect(() => {
    let mounted = true;

    const initializeSession = async () => {
      const token = localStorage.getItem('access_token');

      if (!token) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const data = await apiClient.get('/api/auth/session', token);
        if (mounted) {
          setSession({ access_token: token });
          setUser(data.user);
          setIsLoading(false);

          if (data.user) {
            await fetchProfile(data.user.id);
          }
        }
      } catch (err) {
        // Token invalid, try refresh
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          try {
            const refreshData = await apiClient.post('/api/auth/refresh', { refresh_token: refreshToken });
            if (mounted) {
              localStorage.setItem('access_token', refreshData.session.access_token);
              localStorage.setItem('refresh_token', refreshData.session.refresh_token);
              // Retry session check
              const data = await apiClient.get('/api/auth/session', refreshData.session.access_token);
              setSession({ access_token: refreshData.session.access_token });
              setUser(data.user);
              if (data.user) await fetchProfile(data.user.id);
            }
          } catch {
            // Refresh also failed, clear everything
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        } else {
          localStorage.removeItem('access_token');
        }
        if (mounted) setIsLoading(false);
      }
    };

    initializeSession();

    return () => { mounted = false; };
  }, []);

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const isReadOnly = profile?.verification_status !== 'APPROVED';

  const value = { session, user, profile, isLoading, isReadOnly, signOut, refreshProfile, login, signup };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
