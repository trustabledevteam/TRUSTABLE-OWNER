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
          // It's okay if no row is found, so we can be less noisy about that specific error.
          if (profileError.code !== 'PGRST116') {
             console.warn("Profile fetch warning:", profileError.message);
          }
      }
      
      if (profileData) {
          let companyData = null;
          if (profileData.company_id) {
              const { data: comp } = await supabase.from('companies').select('*').eq('id', profileData.company_id).single();
              companyData = comp;
          }
          setProfile({ ...profileData, companies: companyData });
      } else {
          // If no profile exists yet, keep state null
          setProfile(null);
      }
    } catch (e: any) {
      console.error("Error loading profile:", e.message);
    }
  };

  // Main Authentication Effect Hook
  useEffect(() => {
    console.log("[AUTH DEBUG] AuthProvider useEffect RUNS (mounts).");
    let mounted = true;
    setIsLoading(true);

    console.log("[AUTH DEBUG] Subscribing to onAuthStateChange...");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        console.log(`%c[AUTH DEBUG] <-- onAuthStateChange CALLBACK FIRED. Event: ${_event}, Session exists: ${!!session}`, 'font-weight: bold; color: purple;');
        
        if (!mounted) {
            console.log("[AUTH DEBUG] Callback fired but component is unmounted. Aborting state updates.");
            return;
        }

        try {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
        } catch (error) {
            console.error("[AUTH DEBUG] Error inside onAuthStateChange callback:", error);
        } finally {
            if (mounted) {
                console.log("%c[AUTH DEBUG] Reached FINALLY block. Setting isLoading to false.", 'font-weight: bold; color: green;');
                setIsLoading(false);
            } else {
                console.log("[AUTH DEBUG] Reached FINALLY block, but component is unmounted. Won't update isLoading state.");
            }
        }
    });

    // Cleanup function
    return () => {
        console.log("%c[AUTH DEBUG] AuthProvider useEffect CLEANUP. Unsubscribing listener.", 'color: red;');
        mounted = false;
        subscription?.unsubscribe();
    };
}, []); // Empty dependency array is crucial.

  // --- REAL-TIME PROFILE LISTENER --- (No changes here)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`public:profiles:${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}`},
        async (payload) => {
          console.log("Real-time profile update received:", payload.new);
          await fetchProfile(user.id);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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