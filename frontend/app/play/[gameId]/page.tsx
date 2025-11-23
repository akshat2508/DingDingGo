'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import GameRoom from '@/components/GameRoom';
import { User } from '@supabase/supabase-js';

export default function PlayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const resolvedParams = use(params);  // Unwrap the Promise
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/');
      } else {
        setUser(user);
      }
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
     <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-sky-200 to-blue-100">
  <div className="text-blue-700 text-xl font-semibold animate-pulse">
    Loading...
  </div>
</div>

    );
  }

  if (!user) {
    return null;
  }

  return <GameRoom roomId={resolvedParams.gameId} user={user} />;
}