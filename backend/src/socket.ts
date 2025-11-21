import { Server, Socket } from 'socket.io';
import supabase from "./supabaseClient";



interface GameMove {
  roomId: string;
  gameState: any;
  playerId: string;
}

interface ChatMessage {
  roomId: string;
  message: string;
  userId: string;
  username: string;
}

interface RPSMove {
  choice: string;
  playerId: string;
  isHost: boolean;
}

// Store temporary game states for RPS
const roomStates = new Map<string, any>();

export function initializeSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('✅ User connected:', socket.id);

    socket.on('join-room', async (roomId: string) => {
      socket.join(roomId);
      console.log(`🎮 Socket ${socket.id} joined room ${roomId}`);
      
      socket.to(roomId).emit('player-joined', { socketId: socket.id });
    });

    socket.on('leave-room', (roomId: string) => {
      socket.leave(roomId);
      socket.to(roomId).emit('player-left', { socketId: socket.id });
      
      if (roomStates.has(roomId)) {
        roomStates.delete(roomId);
      }
      console.log(`👋 Socket ${socket.id} left room ${roomId}`);
    });

    socket.on('game-move', async (data: GameMove) => {
      const { roomId, gameState, playerId } = data;
      
      const { data: room } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (!room) return;

      // Handle Rock Paper Scissors special logic
      if (room.game_name === 'rps' && gameState.choice) {
        handleRPSMove(io, roomId, gameState, room);
        return;
      }

      // Handle reset for RPS
      if (gameState.reset) {
        roomStates.delete(roomId);
        await supabase
          .from('game_rooms')
          .update({ 
            game_state: { scores: gameState.scores },
            updated_at: new Date().toISOString()
          })
          .eq('id', roomId);

        io.to(roomId).emit('game-updated', { 
          gameState: { 
            choices: { host: null, guest: null },
            result: null,
            scores: gameState.scores
          }
        });
        return;
      }

      // Update game state for other games (Tic Tac Toe, etc.)
      await supabase
        .from('game_rooms')
        .update({ 
          game_state: gameState,
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId);

      io.to(roomId).emit('game-updated', { gameState, playerId });
    });

    socket.on('send-message', async (data: ChatMessage) => {
      const { roomId, message, userId, username } = data;
      
      const { data: chatData, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          user_id: userId,
          message
        })
        .select()
        .single();

      if (!error && chatData) {
        io.to(roomId).emit('new-message', {
          id: chatData.id,
          message,
          username,
          userId,
          createdAt: chatData.created_at
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ User disconnected:', socket.id);
    });
  });
}

function handleRPSMove(io: Server, roomId: string, gameState: RPSMove, room: any) {
  if (!roomStates.has(roomId)) {
    roomStates.set(roomId, {
      choices: { host: null, guest: null },
      scores: room.game_state?.scores || { host: 0, guest: 0 }
    });
  }

  const state = roomStates.get(roomId);
  const playerKey = gameState.isHost ? 'host' : 'guest';
  state.choices[playerKey] = gameState.choice;

  // Check if both players have chosen
  if (state.choices.host && state.choices.guest) {
    const result = determineWinner(state.choices.host, state.choices.guest);
    
    if (result === 'host') {
      state.scores.host++;
    } else if (result === 'guest') {
      state.scores.guest++;
    }

    supabase
      .from('game_rooms')
      .update({ 
        game_state: { 
          choices: state.choices,
          result,
          scores: state.scores
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)
      .then(() => {
        io.to(roomId).emit('game-updated', { 
          gameState: {
            choices: state.choices,
            result,
            scores: state.scores
          }
        });
      });
  } else {
    io.to(roomId).emit('game-updated', { 
      gameState: {
        choices: state.choices,
        result: null,
        scores: state.scores
      }
    });
  }
}

function determineWinner(hostChoice: string, guestChoice: string): string {
  if (hostChoice === guestChoice) return 'draw';

  const wins: { [key: string]: string } = {
    rock: 'scissors',
    paper: 'rock',
    scissors: 'paper'
  };

  return wins[hostChoice] === guestChoice ? 'host' : 'guest';
}