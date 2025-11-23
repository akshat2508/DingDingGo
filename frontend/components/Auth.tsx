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
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-sky-100 via-blue-50 to-cyan-50 p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-yellow-200 rounded-full opacity-40 blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-orange-200 rounded-full opacity-40 blur-3xl"></div>
      <div className="absolute top-40 right-40 w-24 h-24 bg-mint-200 rounded-full opacity-50 blur-2xl" style={{backgroundColor: '#b8f5d9'}}></div>
      
      <div className="bg-white rounded-3xl shadow-lg p-10 max-w-md w-full relative z-10 border border-blue-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-linear-to-br from-sky-400 to-cyan-400 rounded-3xl mb-5 shadow-md transform hover:scale-105 transition-transform duration-200">
            <Gamepad2 size={36} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-5xl font-black text-gray-800 mb-3 tracking-tight" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
            Dindingo
          </h1>
          <p className="text-gray-600 text-lg font-medium">
            Play multiplayer games with friends online
          </p>
        </div>

        <button
          onClick={signInAnonymously}
          disabled={loading}
          className="w-full bg-linear-to-r from-orange-400 to-orange-500 text-white py-4 rounded-2xl font-bold text-lg hover:from-orange-500 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] duration-150"
        >
          <User size={22} strokeWidth={2.5} />
          {loading ? 'Starting...' : 'Play as Guest'}
        </button>

        <p className="text-sm text-gray-500 text-center mt-6 font-medium">
          No registration required. Start playing instantly! 🎮
        </p>
      </div>

      {/* Decorative floating shapes */}
      <div className="absolute top-10 right-10 w-4 h-4 bg-yellow-400 rounded-full opacity-60 animate-bounce" style={{animationDelay: '0s', animationDuration: '3s'}}></div>
      <div className="absolute bottom-32 left-20 w-3 h-3 bg-pink-300 rounded-full opacity-70 animate-bounce" style={{animationDelay: '1s', animationDuration: '2.5s'}}></div>
      <div className="absolute top-1/3 left-1/4 w-5 h-5 bg-cyan-300 rounded-full opacity-50 animate-bounce" style={{animationDelay: '0.5s', animationDuration: '2.8s'}}></div>
    </div>
  );
}