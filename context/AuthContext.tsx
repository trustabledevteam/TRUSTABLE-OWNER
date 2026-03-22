// File: src/context/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

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

  // This function is correct.
  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, companies(*)')
        .eq('id', userId)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
         console.warn("AuthContext: Profile fetch warning:", profileError.message);
      }
      setProfile(profileData || null);
    } catch (e: any) {
      console.error("AuthContext: Error loading profile:", e.message);
      setProfile(null);
    }
  };

  // The signOut function only needs to tell Supabase to sign out.
  // The listener below will handle the state cleanup.
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // --- THE DEFINITIVE "TWO-STAGE LOAD" USEEFFECT ---
  useEffect(() => {
    let mounted = true;

    // STAGE 1: Fast initial session check.
    const initializeSession = async () => {
      // getSession() is fast; it reads from browser storage.
      const { data: { session: initialSession }, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting initial session:", error);
        if (mounted) setIsLoading(false);
        return;
      }
      
      if (mounted) {
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        // CRITICAL: Unblock the UI immediately after checking local storage.
        setIsLoading(false);

        // STAGE 2: Start the async profile fetch *after* the UI is unblocked.
        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id);
        }
      }
    };

    initializeSession();

    // Set up the listener for subsequent real-time changes (login/logout).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (mounted) {
          // When a change happens (like a logout), update the session and user.
          setSession(newSession);
          setUser(newSession?.user ?? null);
          
          // If the change resulted in no user, clear the profile.
          if (!newSession?.user) {
            setProfile(null);
          }
        }
      }
    );

    // Cleanup on unmount.
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []); // Run only once.

  // This function remains the same and is correct.
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };
  
  const isReadOnly = profile?.verification_status !== 'APPROVED';

  const value = { session, user, profile, isLoading, isReadOnly, signOut, refreshProfile };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 