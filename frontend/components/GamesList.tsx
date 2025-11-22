'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Gamepad2, Users, Copy, Check, LogOut } from 'lucide-react';
import SnakeLadders from '@/components/games/SnakeLadders';
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
    
    // Search for the room
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

    // Update the room to add the guest
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
};;;

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-600 via-blue-600 to-cyan-600 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <Gamepad2 size={32} className="text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-800">Choose a Game</h1>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
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
                className="bg-linear-to-r from-purple-500 to-blue-500 text-white p-6 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105 transform"
              >
                <div className="text-5xl mb-3">{game.emoji}</div>
                <div className="text-xl font-semibold mb-1">{game.name}</div>
                <div className="text-sm opacity-90">{game.description}</div>
                <div className="text-xs opacity-75 mt-2">Click to Create Room</div>
              </button>
            ))}
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Users size={24} />
              Join with Code
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit room code"
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase font-mono text-lg"
                maxLength={6}
              />
              <button
                onClick={joinRoom}
                disabled={!joinCode || joinCode.length !== 6 || loading}
                className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}