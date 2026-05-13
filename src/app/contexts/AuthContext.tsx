"use client";
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';

const AuthContext = createContext<{ 
  user: User | null; 
  loading: boolean;
  signOut: () => Promise<void> 
}>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isInitializing = useRef(false);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      // Mencegah balap eksekusi (race conditions) ganda di Vercel
      if (isInitializing.current) return;
      isInitializing.current = true;

      try {
        // Strategi Fallback: Paksa buka kuncian loading jika Supabase hang/timeout setelah 3 detik
        const timeoutId = setTimeout(() => {
          if (mounted && loading) {
            console.warn("Supabase session timeout fallback triggered.");
            setLoading(false);
          }
        }, 3000);

        const { data: { session }, error } = await supabase.auth.getSession();
        clearTimeout(timeoutId);

        if (error) throw error;
        
        if (mounted) {
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (err) {
        console.error("Gagal verifikasi sesi:", err);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Mendaftar listener yang aman tanpa memicu deadlock panggilan baru
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);