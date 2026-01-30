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
  isLoading: boolean; // This will be our single, reliable global loader state
  isReadOnly: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true, // App starts in a loading state by default
  isReadOnly: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children?: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // This function remains the same, it's perfect.
  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, companies(*)') // Simplified join
        .eq('id', userId)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
         console.warn("Profile fetch warning:", profileError.message);
      }
      
      setProfile(profileData || null); // Set profile or null if not found

    } catch (e: any) {
      console.error("Error loading profile:", e.message);
      setProfile(null);
    }
  };

  // --- Step 1: The New, Simplified signOut Function ---
  // This function ONLY tells Supabase to sign out. It does NOT touch React state.
  // The onAuthStateChange listener below will handle the state update automatically.
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // --- Step 2: The Bulletproof Authentication Lifecycle useEffect ---
  useEffect(() => {
    // We start in a loading state
    setIsLoading(true);

    // This listener is the single source of truth. It fires on initial load,
    // on sign-in, and on sign-out.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // If there IS a user, fetch their profile.
        await fetchProfile(session.user.id);
      } else {
        // If there is NO user (e.g., after signOut() or on initial load with no session),
        // ensure the profile is cleared.
        setProfile(null);
      }

      // Set the session and user state based on the event.
      setSession(session);
      setUser(session?.user ?? null);
      
      // CRITICAL: The auth check is now complete, no matter the outcome.
      // We can now safely stop the global loading spinner.
      setIsLoading(false);
    });

    // Cleanup function to prevent memory leaks when the component unmounts.
    return () => {
      subscription?.unsubscribe();
    };
  }, []); // The empty dependency array ensures this runs only once on mount.

  // This function is still useful for manual refreshes
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };
  
  const isReadOnly = profile?.verification_status !== 'APPROVED';

  // The value provided to the context.
  const value = {
    session,
    user,
    profile,
    isLoading,
    isReadOnly,
    signOut,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);