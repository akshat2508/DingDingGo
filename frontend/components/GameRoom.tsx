'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { socket } from '@/lib/socket';
import Chat from '@/components/Chat';
import TicTacToe from '@/components/games/TicTacToe';
import RockPaperScissors from '@/components/games/RockPaperScissors';
import { Copy, Check, Users, ArrowLeft } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import SnakeLadders from '@/components/games/SnakeLadders';
import ConnectFour from '@/components/games/ConnectFour';
import DotsAndBoxes from '@/components/games/DotsAndBoxes';
import FourColors from '@/components/games/FourColors';
import MemoryMatch from '@/components/games/MemoryMatch';

interface Room {
  id: string;
  room_code: string;
  game_name: string;
  host_id: string;
  guest_id: string | null;
  status: string;
  game_state: any;
}

export default function GameRoom({ roomId, user }: { roomId: string; user: User }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadRoom();
    socket.emit('join-room', roomId);

    socket.on('player-joined', () => {
      loadRoom();
    });

    socket.on('player-left', () => {
      loadRoom();
    });

    return () => {
      socket.emit('leave-room', roomId);
      socket.off('player-joined');
      socket.off('player-left');
    };
  }, [roomId]);

  const loadRoom = async () => {
    try {
      const { data, error } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle();

      if (error) {
        console.error('Load room error:', error);
        alert('Error loading room: ' + error.message);
        router.push('/');
        return;
      }

      if (!data) {
        alert('Room not found or you do not have access to it.');
        router.push('/');
        return;
      }

      if (data.host_id !== user.id && data.guest_id !== user.id) {
        alert('You do not have access to this room.');
        router.push('/');
        return;
      }

      setRoom(data);
    } catch (error: any) {
      console.error('Unexpected error:', error);
      alert('Error: ' + error.message);
      router.push('/');
    }
  };

  const copyCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const leaveRoom = async () => {
    if (room) {
      const isHost = room.host_id === user.id;
      
      if (isHost) {
        await supabase.from('game_rooms').delete().eq('id', roomId);
      } else {
        await supabase
          .from('game_rooms')
          .update({ guest_id: null, status: 'waiting' })
          .eq('id', roomId);
      }
    }
    
    router.push('/');
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-sky-100 via-blue-50 to-cyan-50">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-gray-700 text-xl font-semibold">Loading room...</div>
        </div>
      </div>
    );
  }

  const isHost = room.host_id === user.id;
  const waitingForPlayer = !room.guest_id;

  const renderGame = () => {
    if (waitingForPlayer) {
      return (
        <div className="text-center text-gray-600">
          <div className="text-7xl mb-6 animate-bounce">⏳</div>
          <p className="text-2xl mb-3 font-bold text-gray-800">Waiting for opponent...</p>
          <p className="text-lg font-medium text-gray-600">Share the room code with your friend</p>
        </div>
      );
    }

    switch (room.game_name) {
      case 'tic_tac_toe':
        return (
          <TicTacToe
            roomId={roomId}
            user={user}
            hostId={room.host_id}
            guestId={room.guest_id}
            initialState={room.game_state}
          />
        );
      case 'rps':
        return (
          <RockPaperScissors
            roomId={roomId}
            user={user}
            hostId={room.host_id}
            guestId={room.guest_id}
            initialState={room.game_state}
          />
        );
      case 'snake_ladders':
        return (
          <SnakeLadders
            roomId={roomId}
            user={user}
            hostId={room.host_id}
            guestId={room.guest_id}
            initialState={room.game_state}
          />
        );
      case 'connect_four':
        return (
          <ConnectFour
            roomId={roomId}
            user={user}
            hostId={room.host_id}
            guestId={room.guest_id}
            initialState={room.game_state}
          />
        );
      case 'dots_boxes':
        return (
          <DotsAndBoxes
            roomId={roomId}
            user={user}
            hostId={room.host_id}
            guestId={room.guest_id}
            initialState={room.game_state}
          />
        );
      case 'four_colors':
        return (
          <FourColors
            roomId={roomId}
            user={user}
            hostId={room.host_id}
            guestId={room.guest_id}
            initialState={room.game_state}
          />
        );
      case 'memory_match':
        return (
          <MemoryMatch
            roomId={roomId}
            user={user}
            hostId={room.host_id}
            guestId={room.guest_id}
            initialState={room.game_state}
          />
        );
      default:
        return (
          <div className="text-center text-gray-500">
            <p className="text-xl font-semibold">Game not implemented yet</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-sky-100 via-blue-50 to-cyan-50 p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-10 right-20 w-48 h-48 bg-yellow-200 rounded-full opacity-30 blur-3xl"></div>
      <div className="absolute bottom-20 left-10 w-64 h-64 bg-orange-200 rounded-full opacity-30 blur-3xl"></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="bg-white rounded-3xl shadow-lg p-6 border border-blue-100">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">
              {room.game_name.replace(/_/g, ' ').toUpperCase()}
            </h1>
            <button
              onClick={leaveRoom}
              className="flex items-center gap-2 text-red-500 hover:text-red-600 font-bold transition-colors px-4 py-2 rounded-xl hover:bg-red-50"
            >
              <ArrowLeft size={20} strokeWidth={2.5} />
              Leave Room
            </button>
          </div>

          {waitingForPlayer && (
            <div className="bg-linear-to-r from-yellow-50 to-orange-50 border-2 border-orange-300 rounded-2xl p-5 mb-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-400 rounded-xl">
                  <Users className="text-white" size={20} strokeWidth={2.5} />
                </div>
                <span className="font-bold text-gray-800 text-lg">
                  Waiting for opponent to join...
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-gray-700 font-semibold">Room Code:</span>
                <code className="bg-white px-5 py-2 rounded-xl font-mono text-2xl font-black text-orange-600 border-2 border-orange-200 shadow-sm">
                  {room.room_code}
                </code>
                <button
                  onClick={copyCode}
                  className="ml-2 p-3 hover:bg-white rounded-xl transition-colors border-2 border-transparent hover:border-orange-200"
                  title="Copy room code"
                >
                  {copied ? (
                    <Check size={22} className="text-green-500" strokeWidth={2.5} />
                  ) : (
                    <Copy size={22} className="text-gray-600" strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-linear-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 min-h-[500px] flex items-center justify-center border-2 border-blue-100 shadow-inner">
              {renderGame()}
            </div>

            <div className="md:col-span-1">
              <Chat roomId={roomId} user={user} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}