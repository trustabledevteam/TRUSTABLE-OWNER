
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
      
      setProfile(data || null);
    } catch (e) {
      console.error("Error loading profile", e);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Handle initial session loading
    const resolveInitialSession = async () => {
        try {
            // Check session from local storage (fast)
            const { data: { session } } = await supabase.auth.getSession();
            if (!mounted) return;

            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
                // If user exists, fetch profile
                await fetchProfile(session.user.id);
            } else {
                // IMPORTANT: If no session, ensure we stop loading immediately
                setProfile(null);
            }
        } catch (error) {
            console.error("Auth initialization error:", error);
        } finally {
            if (mounted) {
                setIsLoading(false);
            }
        }
    };

    resolveInitialSession();

    // 2. Listen for subsequent auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only fetch profile if we have a user and don't have a profile yet, or if session changed user
        if (session?.user) {
             // Simple check to avoid refetching if profile already matches session user
             if (!profile || profile.id !== session.user.id) {
                 await fetchProfile(session.user.id);
             }
        } else {
            setProfile(null);
        }
        
        setIsLoading(false); 
    });

    return () => {
        mounted = false;
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

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, isReadOnly, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
