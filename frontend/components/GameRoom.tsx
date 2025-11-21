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
      .maybeSingle();  // Use maybeSingle() instead of single()

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

    // Check if user has access to this room
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
};;

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
        <div className="text-white text-xl animate-pulse">Loading room...</div>
      </div>
    );
  }

  const isHost = room.host_id === user.id;
  const waitingForPlayer = !room.guest_id;

  const renderGame = () => {
    if (waitingForPlayer) {
      return (
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4 animate-bounce">⏳</div>
          <p className="text-xl mb-2 font-semibold">Waiting for opponent...</p>
          <p className="text-gray-600">Share the room code with your friend</p>
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
      default:
        return (
          <div className="text-center text-gray-500">
            <p className="text-xl">Game not implemented yet</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">
              {room.game_name.replace(/_/g, ' ').toUpperCase()}
            </h1>
            <button
              onClick={leaveRoom}
              className="flex items-center gap-2 text-red-500 hover:text-red-700 font-semibold transition-colors"
            >
              <ArrowLeft size={20} />
              Leave Room
            </button>
          </div>

          {waitingForPlayer && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="text-yellow-600" />
                <span className="font-semibold text-yellow-800">
                  Waiting for opponent to join...
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-700">Room Code:</span>
                <code className="bg-gray-100 px-4 py-2 rounded font-mono text-xl font-bold text-purple-600">
                  {room.room_code}
                </code>
                <button
                  onClick={copyCode}
                  className="ml-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Copy room code"
                >
                  {copied ? (
                    <Check size={20} className="text-green-500" />
                  ) : (
                    <Copy size={20} className="text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-gray-50 rounded-lg p-6 min-h-[500px] flex items-center justify-center">
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