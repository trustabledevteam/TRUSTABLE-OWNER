
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
      // Create a promise that rejects after 3 seconds to prevent hanging
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timed out')), 3000));
      
      // The actual fetch
      const fetchRequest = supabase.from('profiles').select('*').eq('id', userId).single();

      // Race them
      const result: any = await Promise.race([fetchRequest, timeout]);
      
      const { data: profileData, error: profileError } = result;
      
      if (profileError) {
          console.warn("Profile fetch warning:", profileError.message);
      }
      
      if (profileData) {
          let companyData = null;
          if (profileData.company_id) {
              // Attempt to fetch company, but don't block if it fails
              const { data: comp } = await supabase.from('companies').select('*').eq('id', profileData.company_id).single();
              companyData = comp;
          }
          setProfile({ ...profileData, companies: companyData });
      } else {
          setProfile(null);
      }
    } catch (e: any) {
      console.error("Error loading profile (or timeout):", e.message);
      // Even if profile fails, we don't set profile to null if we already had one, 
      // or we just leave it as is to allow the app to render.
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      // HARD STOP: If nothing happens in 4 seconds, force loading to false
      const safetyTimer = setTimeout(() => {
          if (mounted) {
              console.warn("Auth initialization safety timeout triggered.");
              setIsLoading(false);
          }
      }, 4000);

      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          
          if (initialSession?.user) {
            await fetchProfile(initialSession.user.id);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        clearTimeout(safetyTimer);
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
            fetchProfile(newSession.user.id); // Fetch in background, don't set loading true
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
