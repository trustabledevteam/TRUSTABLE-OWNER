// File: src/context/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // This function is perfect and does not need to change.
  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, companies(*)')
        .eq('id', userId)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
         console.warn("Profile fetch warning:", profileError.message);
      }
      setProfile(profileData || null);
    } catch (e: any) {
      console.error("Error loading profile:", e.message);
      setProfile(null);
    }
  };

  // This simplified signOut function is also correct.
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // --- THE NEW, BULLETPROOF AUTHENTICATION LIFECYCLE HOOK ---
  useEffect(() => {
    let mounted = true;

    // STAGE 1: Perform the fast, initial session check from local storage.
    const initializeSession = async () => {
      // getSession() is fast because it reads from the browser's storage.
      const { data: { session: initialSession } } = await supabase.auth.getSession();

      if (mounted) {
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        // CRITICAL: Unblock the UI immediately. The app can now render.
        setIsLoading(false);

        // STAGE 2: If a user was found, start the async fetch for their profile.
        // This will not block the UI from rendering.
        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id);
        }
      }
    };

    initializeSession();

    // Now, set up the listener to handle REAL-TIME changes (login, logout in another tab).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          // If the user signs out, ensure the profile is cleared.
          setProfile(null);
        }
      }
    });

    // Cleanup function to prevent memory leaks.
    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []); // The empty dependency array ensures this runs only once.

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