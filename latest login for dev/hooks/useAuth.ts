import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        
        // Only handle navigation for sign in and sign up events
        if (event === 'SIGNED_IN' || event === 'SIGNED_UP') {
          const isLandlord = session.user?.user_metadata?.is_landlord;
     
          if (isLandlord) {
            router.replace('/dashboard');
          } else {

            router.replace('/home');
          }
        }
      } else {
        setSession(null);
        setUser(null);
        router.replace('/register');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    session,
    loading,
  };
}