
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
      // Step 1: Fetch Profile Only (Avoid Joins to break complex RLS chains)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
          console.warn("Profile fetch warning:", profileError.message);
          // Don't throw immediately, allow UI to handle partial state or retry
      }
      
      if (profileData) {
          // Step 2: Fetch Company Separately if associated
          let companyData = null;
          if (profileData.company_id) {
              const { data: comp } = await supabase
                  .from('companies')
                  .select('*')
                  .eq('id', profileData.company_id)
                  .single();
              companyData = comp;
          }
          
          // Combine manually
          setProfile({ ...profileData, companies: companyData });
      } else {
          setProfile(null);
      }
    } catch (e: any) {
      console.error("Error loading profile", e.message);
      setProfile(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      // Safety timeout: If auth takes longer than 5s, force stop loading
      const timer = setTimeout(() => {
          if (mounted) setIsLoading(false);
      }, 5000);

      try {
        // 1. Check active session immediately
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
        clearTimeout(timer);
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (!mounted) return;

        setSession(newSession);
        const currentUser = newSession?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
            // Only fetch profile if we don't have it or user changed
            // We also re-fetch if we are just switching back to focus to ensure fresh data
            await fetchProfile(currentUser.id);
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

  // 3. Listen for realtime profile changes (e.g. Admin Approval)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          console.log('Profile updated via realtime, refreshing...');
          fetchProfile(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);


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
