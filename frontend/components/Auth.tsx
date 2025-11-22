'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Gamepad2 } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);

  const signInAnonymously = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-purple-600 via-blue-600 to-cyan-600 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-purple-500 to-blue-500 rounded-full mb-4">
            <Gamepad2 size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Dindingo</h1>
          <p className="text-gray-600">Play multiplayer games with friends online</p>
        </div>

        <button
          onClick={signInAnonymously}
          disabled={loading}
          className="w-full bg-linear-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
        >
          <User size={20} />
          {loading ? 'Starting...' : 'Play as Guest'}
        </button>

        <p className="text-sm text-gray-500 text-center mt-6">
          No registration required. Start playing instantly!
        </p>
      </div>
    </div>
  );
}