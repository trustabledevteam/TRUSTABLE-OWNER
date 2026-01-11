
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null; 
  isLoading: boolean;
  isReadOnly: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isReadOnly: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`*, companies:company_id (*)`)
        .eq('id', userId)
        .single();
      
      if (error) {
          console.warn("Profile fetch warning:", error.message);
      }
      
      if (data) {
        setProfile(data);
      }
    } catch (e) {
      console.error("Error loading profile", e);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
                
                if (session?.user) {
                    await fetchProfile(session.user.id);
                }
            }
        } catch (error) {
            console.error("Auth initialization error:", error);
        } finally {
            if (mounted) setIsLoading(false);
        }
    };

    initializeAuth();

    // Fallback timeout to prevent infinite loading if Supabase hangs
    const timeoutId = setTimeout(() => {
        if (mounted && isLoading) {
            console.warn("Auth load timed out, forcing render.");
            setIsLoading(false);
        }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (mounted) {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
            setIsLoading(false);
        }
    });

    return () => {
        mounted = false;
        clearTimeout(timeoutId);
        subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
    setSession(null);
  };

  const isReadOnly = profile?.verification_status !== 'APPROVED';

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, isReadOnly, signOut, refreshProfile: async () => { if(user) await fetchProfile(user.id); } }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
