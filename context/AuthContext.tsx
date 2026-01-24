import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

// Use any to bypass v1 type definition issues if types are outdated
type Session = any;
type User = any;

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
      // The actual fetch with cache busting to ensure fresh data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
          console.warn("Profile fetch warning:", profileError.message);
      }
      
      if (profileData) {
          let companyData = null;
          if (profileData.company_id) {
              const { data: comp } = await supabase.from('companies').select('*').eq('id', profileData.company_id).single();
              companyData = comp;
          }
          setProfile({ ...profileData, companies: companyData });
      } else {
          // If no profile exists yet, keep state null but stop loading
          setProfile(null);
      }
    } catch (e: any) {
      console.error("Error loading profile:", e.message);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // SAFETY VALVE: If Supabase takes longer than 5 seconds, force stop loading
    // This prevents the "Infinite Loading" screen if the network hangs
    const safetyTimeout = setTimeout(() => {
        if (mounted && isLoading) {
            console.warn("Auth initialization timed out - forcing loading false");
            setIsLoading(false);
        }
    }, 5000);

    const initializeAuth = async () => {
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
        // ALWAYS stop loading, success or failure
        if (mounted) {
            setIsLoading(false);
            clearTimeout(safetyTimeout);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
            await fetchProfile(newSession.user.id);
        } else {
            setProfile(null);
        }
        setIsLoading(false);
    });

    return () => {
        mounted = false;
        clearTimeout(safetyTimeout);
        subscription?.unsubscribe();
    };
  }, []);

  // --- REAL-TIME PROFILE LISTENER ---
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`public:profiles:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        async (payload) => {
          console.log("Real-time profile update received:", payload.new);
          await fetchProfile(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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