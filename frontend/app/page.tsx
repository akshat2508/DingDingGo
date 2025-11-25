'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Auth from '@/components/Auth';
import GamesList from '@/components/GamesList';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br  from-sky-200 to-blue-100">
        <div className="text-white text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return <GamesList session={session} />;
}