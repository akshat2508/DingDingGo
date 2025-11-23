'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Gamepad2, Users, Copy, Check, LogOut } from 'lucide-react';

const GAMES = [
  { id: 'tic_tac_toe', name: 'Tic Tac Toe', emoji: '❌⭕', description: 'Classic 3x3 grid game' },
  { id: 'rps', name: 'Rock Paper Scissors', emoji: '✊✋✌️', description: 'Best of unlimited rounds' },
  { id: 'snake_ladders', name: 'Snake & Ladders', emoji: '🐍🪜', description: 'Race to 100!' },
  { id: 'connect_four', name: 'Connect Four', emoji: '🔴🔵', description: 'Connect 4 discs to win' },
  { id: 'dots_boxes', name: 'Dots and Boxes', emoji: '⬜📦', description: 'Capture the most squares' },
  { id: 'four_colors', name: 'Four Colors (UNO Lite)', emoji: '🎴🌈', description: 'Match colors or numbers' },
  { id: 'memory_match', name: 'Memory Match', emoji: '🧠🎯', description: 'Find matching pairs' },
];

export default function GamesList({ session }: { session: any }) {
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const createRoom = async (gameName: string) => {
    try {
      setLoading(true);
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data, error } = await supabase
        .from('game_rooms')
        .insert({
          room_code: roomCode,
          game_name: gameName,
          host_id: session.user.id,
          status: 'waiting',
        })
        .select()
        .single();

      if (error) throw error;

      router.push(`/play/${data.id}`);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!joinCode || joinCode.length !== 6) {
      alert('Please enter a valid 6-character room code');
      return;
    }

    try {
      setLoading(true);
      
      console.log('Looking for room with code:', joinCode.toUpperCase());
      
      const { data: rooms, error: searchError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_code', joinCode.toUpperCase())
        .eq('status', 'waiting');

      console.log('Search result:', { rooms, searchError });

      if (searchError) {
        console.error('Search error:', searchError);
        alert('Error searching for room: ' + searchError.message);
        return;
      }

      if (!rooms || rooms.length === 0) {
        alert('Room not found. Please check the code and try again.');
        return;
      }

      const data = rooms[0];

      if (data.guest_id) {
        alert('This room is already full.');
        return;
      }

      if (data.host_id === session.user.id) {
        alert('You cannot join your own room. Share this code with a friend!');
        return;
      }

      console.log('Joining room:', data.id);

      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ 
          guest_id: session.user.id, 
          status: 'playing',
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);

      if (updateError) {
        console.error('Update error:', updateError);
        alert('Error joining room: ' + updateError.message);
        return;
      }

      console.log('Successfully joined room, navigating...');
      router.push(`/play/${data.id}`);
    } catch (error: any) {
      console.error('Join room error:', error);
      alert('Unexpected error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-sky-100 via-blue-50 to-cyan-50 p-4 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-10 left-20 w-64 h-64 bg-yellow-200 rounded-full opacity-30 blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-orange-200 rounded-full opacity-30 blur-3xl"></div>
      <div className="absolute top-1/2 right-1/3 w-48 h-48 rounded-full opacity-40 blur-3xl" style={{backgroundColor: '#b8f5d9'}}></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-6 border border-blue-100">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-linear-to-br from-sky-400 to-cyan-400 rounded-2xl shadow-md">
                <Gamepad2 size={32} className="text-white" strokeWidth={2.5} />
              </div>
              <h1 className="text-4xl font-black text-gray-800 tracking-tight">Choose a Game</h1>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors px-4 py-2 rounded-xl hover:bg-gray-50"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {GAMES.map((game) => (
              <button
                key={game.id}
                onClick={() => createRoom(game.id)}
                disabled={loading}
                className="bg-linear-to-br from-white to-blue-50 border-2 border-blue-200 text-gray-800 p-6 rounded-2xl hover:border-orange-300 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:scale-[1.02] active:scale-[0.98] transform duration-150 group"
              >
                <div className="text-5xl mb-3 group-hover:scale-110 transition-transform duration-200">{game.emoji}</div>
                <div className="text-xl font-bold mb-1 text-gray-800">{game.name}</div>
                <div className="text-sm text-gray-600 font-medium mb-2">{game.description}</div>
                <div className="text-xs text-orange-500 font-semibold mt-2 group-hover:text-orange-600">Click to Create Room →</div>
              </button>
            ))}
          </div>

          <div className="border-t-2 border-blue-100 pt-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="p-2 bg-linear-to-br from-mint-300 to-cyan-300 rounded-xl" style={{background: 'linear-gradient(135deg, #a7f3d0 0%, #67e8f9 100%)'}}>
                <Users size={24} className="text-white" strokeWidth={2.5} />
              </div>
              Join with Code
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code"
                className="flex-1 px-5 py-4 border-2 border-blue-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 uppercase font-mono text-lg font-bold bg-blue-50 text-gray-800 placeholder-gray-400 shadow-sm"
                maxLength={6}
              />
              <button
                onClick={joinRoom}
                disabled={!joinCode || joinCode.length !== 6 || loading}
                className="bg-linear-to-r from-orange-400 to-orange-500 text-white px-10 py-4 rounded-2xl hover:from-orange-500 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] duration-150"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating decorative elements */}
      <div className="absolute top-20 right-32 w-4 h-4 bg-yellow-400 rounded-full opacity-60 animate-bounce" style={{animationDelay: '0s', animationDuration: '3s'}}></div>
      <div className="absolute bottom-40 left-40 w-3 h-3 bg-pink-300 rounded-full opacity-70 animate-bounce" style={{animationDelay: '1s', animationDuration: '2.5s'}}></div>
      <div className="absolute top-2/3 right-20 w-5 h-5 bg-cyan-300 rounded-full opacity-50 animate-bounce" style={{animationDelay: '0.5s', animationDuration: '2.8s'}}></div>
    </div>
  );
}