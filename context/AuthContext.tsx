import React, { createContext, useContext, useEffect, useState, useRef } from 'react'; // Import useRef
import { supabase } from '../services/supabaseClient';

// Use 'any' to bypass potential type definition issues if types are outdated
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
  // console.log("%c[DEBUG 4] AuthContext.tsx: AuthProvider component is rendering.", "color: blue; font-weight: bold;");

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // This ref will act as a flag to prevent the effect from running twice in development.
  const effectRan = useRef(false);

  const fetchProfile = async (userId: string) => { /* ... this function is correct, no changes needed ... */ };
  const signOut = async () => { await supabase.auth.signOut(); };

  // --- THE NEW, STRICT MODE-PROOF USEEFFECT ---
  useEffect(() => {
    // In Strict Mode, this effect will run twice. We use the ref to only execute our logic on the second run.
    // In Production, it only runs once, so we also check the NODE_ENV.
    if (effectRan.current === true || process.env.NODE_ENV !== 'development') {
      console.log("%c[EFFECT RUN] Setting up Supabase listener.", "color: green;");
      
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`%c[LISTENER FIRED] Event: ${event}`, "color: purple;");
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      });

      // This is the cleanup for the "real" effect run.
      return () => {
        console.log("%c[EFFECT CLEANUP] Unsubscribing listener.", "color: red;");
        subscription?.unsubscribe();
      };
    }

    // This is the cleanup for the FIRST run in Strict Mode. It does nothing but set the flag.
    return () => {
      console.log("[STRICT MODE] First run cleanup triggered. Setting flag to true.");
      effectRan.current = true;
    };
  }, []); // The empty dependency array is correct and crucial.

  const refreshProfile = async () => { /* ... this function is correct, no changes needed ... */ };
  const isReadOnly = profile?.verification_status !== 'APPROVED';
  const value = { session, user, profile, isLoading, isReadOnly, signOut, refreshProfile };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);