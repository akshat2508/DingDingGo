'use client';

import { useState, useEffect } from 'react';
import { socket } from '@/lib/socket';
import { User } from '@supabase/supabase-js';
import { RotateCcw, Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from 'lucide-react';

interface SnakeLaddersProps {
  roomId: string;
  user: User;
  hostId: string;
  guestId: string | null;
  initialState: any;
}

interface GameState {
  hostPosition: number;
  guestPosition: number;
  currentPlayer: 'host' | 'guest';
  diceValue: number | null;
  canRoll: boolean;
  winner: 'host' | 'guest' | null;
  lastRoll: number | null;
  isAnimating: boolean;
}

const DICE_ICONS = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
const BOARD_SIZE = 100;

// Snakes: head -> tail
const SNAKES: { [key: number]: number } = {
  98: 78,
  95: 56,
  88: 24,
  62: 18,
  48: 26,
  36: 6,
  32: 10
};

// Ladders: bottom -> top
const LADDERS: { [key: number]: number } = {
  4: 14,
  9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91
};

export default function SnakeLadders({ roomId, user, hostId, guestId, initialState }: SnakeLaddersProps) {
  const isHost = user.id === hostId;
  const isGuest = user.id === guestId;
  
  //console.log('User ID:', user.id);
  //console.log('Host ID:', hostId);
  //console.log('Guest ID:', guestId);
  //console.log('Is Host:', isHost);
  //console.log('Is Guest:', isGuest);
  
  const [gameState, setGameState] = useState<GameState>(() => {
    // Ensure we always have a valid initial state
    const defaultState: GameState = {
      hostPosition: 0,
      guestPosition: 0,
      currentPlayer: 'host',
      diceValue: null,
      canRoll: true,
      winner: null,
      lastRoll: null,
      isAnimating: false
    };

    // If initialState exists and has valid data, merge it with defaults
    if (initialState && typeof initialState === 'object') {
      return {
        ...defaultState,
        ...initialState,
        // Ensure currentPlayer is never undefined
        currentPlayer: initialState.currentPlayer || 'host'
      };
    }

    return defaultState;
  });
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    //console.log('Current Player:', gameState.currentPlayer);
    //console.log('Is My Turn:', isMyTurn());
  }, [gameState.currentPlayer]);

  useEffect(() => {
    socket.on('game-updated', ({ gameState: newState }) => {
      //console.log('Game updated received:', newState);
      // Ensure currentPlayer is never undefined when receiving updates
      if (newState && typeof newState === 'object') {
        setGameState({
          ...newState,
          currentPlayer: newState.currentPlayer || 'host'
        });
      }
    });

    return () => {
      socket.off('game-updated');
    };
  }, []);

  const rollDice = () => {
    if (!guestId || gameState.winner || !isMyTurn() || !gameState.canRoll || rolling) return;

    setRolling(true);
    const value = Math.floor(Math.random() * 6) + 1;

    setTimeout(() => {
      const playerKey = (isHost && gameState.currentPlayer === 'host') ? 'hostPosition' : 'guestPosition';
      let newPosition = gameState[playerKey] + value;

      // Can't go beyond 100
      if (newPosition > BOARD_SIZE) {
        newPosition = gameState[playerKey];
      }

      // Check for snakes
      if (SNAKES[newPosition]) {
        newPosition = SNAKES[newPosition];
      }
      
      // Check for ladders
      if (LADDERS[newPosition]) {
        newPosition = LADDERS[newPosition];
      }

      // Check for winner
      const winner: GameState['winner'] = newPosition === BOARD_SIZE ? gameState.currentPlayer : null;

      // Extra turn on rolling 6
      const extraTurn = value === 6 && !winner;

      const newState: GameState = {
        ...gameState,
        [playerKey]: newPosition,
        diceValue: value,
        lastRoll: value,
        canRoll: false,
        currentPlayer: extraTurn ? gameState.currentPlayer : (gameState.currentPlayer === 'host' ? 'guest' : 'host'),
        winner,
        isAnimating: false
      };

      emitGameState(newState);
      setRolling(false);
      
      // Allow next roll after animation
      setTimeout(() => {
        if (!winner) {
          const nextState: GameState = { ...newState, canRoll: true };
          emitGameState(nextState);
        }
      }, 1500);
    }, 500);
  };

  const emitGameState = (newState: GameState) => {
    setGameState(newState);
    socket.emit('game-move', {
      roomId,
      gameState: newState,
      playerId: user.id
    });
  };

  const resetGame = () => {
    const newState = {
      hostPosition: 0,
      guestPosition: 0,
      currentPlayer: 'host' as 'host' | 'guest',
      diceValue: null,
      canRoll: true,
      winner: null,
      lastRoll: null,
      isAnimating: false
    };
    emitGameState(newState);
  };

  const isMyTurn = () => {
    //console.log('Checking turn - isHost:', isHost, 'isGuest:', isGuest, 'currentPlayer:', gameState.currentPlayer);
    
    if (isHost) {
      const result = gameState.currentPlayer === 'host';
      //console.log('Host check result:', result);
      return result;
    } else if (isGuest) {
      const result = gameState.currentPlayer === 'guest';
      //console.log('Guest check result:', result);
      return result;
    }
    //console.log('Neither host nor guest - returning false');
    return false;
  };

  const getPositionCoordinates = (position: number) => {
    if (position === 0) return { row: 9, col: 0 };
    
    const adjustedPos = position - 1;
    let row = 9 - Math.floor(adjustedPos / 10);
    let col = adjustedPos % 10;
    
    // Reverse columns for odd rows (snake pattern)
    if ((9 - row) % 2 === 1) {
      col = 9 - col;
    }
    
    return { row, col };
  };

  const renderBoard = () => {
    const board = [];
    
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        const actualRow = 9 - row;
        let position;
        
        if (actualRow % 2 === 0) {
          position = actualRow * 10 + col + 1;
        } else {
          position = actualRow * 10 + (9 - col) + 1;
        }

        const isSnakeHead = SNAKES[position];
        const isLadderBottom = LADDERS[position];
        const isHostHere = gameState.hostPosition === position;
        const isGuestHere = gameState.guestPosition === position;

        board.push(
          <div
            key={`${row}-${col}`}
            className={`relative border border-gray-300 flex items-center justify-center text-xs font-bold ${
              position % 2 === 0 ? 'bg-gray-100' : 'bg-white'
            } ${isSnakeHead ? 'bg-red-100' : ''} ${isLadderBottom ? 'bg-green-100' : ''}`}
          >
            <span className="absolute top-0.5 left-0.5 text-gray-400 text-[10px]">{position}</span>
            
            {isSnakeHead && (
              <div className="text-xl" title={`Snake to ${SNAKES[position]}`}>🐍</div>
            )}
            {isLadderBottom && (
              <div className="text-xl" title={`Ladder to ${LADDERS[position]}`}>🪜</div>
            )}
            
            <div className="absolute bottom-1 right-1 flex gap-1">
              {isHostHere && (
                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
              )}
              {isGuestHere && (
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg" />
              )}
            </div>
          </div>
        );
      }
    }
    
    return board;
  };

  const DiceIcon = gameState.lastRoll ? DICE_ICONS[gameState.lastRoll - 1] : Dice1;

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="mb-4 text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Snake and Ladders</h2>
        {!guestId ? (
          <p className="text-gray-600">Waiting for opponent...</p>
        ) : gameState.winner ? (
          <div>
            <p className="text-2xl font-bold mb-3">
              {gameState.winner === (isHost ? 'host' : 'guest') ? (
                <span className="text-green-600">You won! 🎉</span>
              ) : (
                <span className="text-red-600">You lost! 😢</span>
              )}
            </p>
            <button
              onClick={resetGame}
              className="px-6 py-3 rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2 mx-auto"
              style={{ 
                backgroundColor: '#FFA84A',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)'
              }}            >
              <RotateCcw size={20} />
              Play Again
            </button>
          </div>
        ) : (
          <div>
            <p className={`text-lg font-semibold ${isMyTurn() ? 'text-green-600' : 'text-orange-600'}`}>
              {isMyTurn() ? 'Your turn! Roll the dice' : "Opponent's turn"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              You are {isHost ? 'Host' : isGuest ? 'Guest' : 'Unknown'} - Current turn: {gameState.currentPlayer}
            </p>
          </div>
        )}
      </div>

      {/* Player positions */}
      <div className="flex gap-8 mb-4 text-sm">
        <div className="bg-blue-100 px-6 py-3 rounded-lg border-2 border-blue-500">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white" />
            <span className="font-semibold text-blue-800">You</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {isHost ? gameState.hostPosition : gameState.guestPosition}
          </p>
        </div>
        <div className="bg-red-100 px-6 py-3 rounded-lg border-2 border-red-500">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
            <span className="font-semibold text-red-800">Opponent</span>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {isHost ? gameState.guestPosition : gameState.hostPosition}
          </p>
        </div>
      </div>

      {/* Game Board */}
      <div className="grid grid-cols-10 gap-0 w-[500px] h-[500px] border-4 border-gray-800 rounded-lg mb-6 shadow-xl overflow-hidden">
        {renderBoard()}
      </div>

      {/* Dice and controls */}
      {guestId && !gameState.winner && (
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={rollDice}
            disabled={!isMyTurn() || !gameState.canRoll || rolling}
            className={`w-24 h-24 bg-white rounded-xl shadow-2xl border-4 flex items-center justify-center transition-all ${
              isMyTurn() && gameState.canRoll && !rolling
                ? 'border-green-500 hover:scale-110 cursor-pointer animate-pulse'
                : 'border-gray-300 cursor-not-allowed opacity-50'
            } ${rolling ? 'animate-bounce' : ''}`}
          >
            <DiceIcon size={48} className={rolling ? 'text-blue-500' : 'text-gray-700'} />
          </button>
          
          {gameState.lastRoll && (
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-600 mb-2">Last roll:</p>
              <p className="text-4xl font-bold text-blue-600">{gameState.lastRoll}</p>
              {gameState.lastRoll === 6 && !gameState.winner && (
                <p className="text-sm text-green-600 font-semibold mt-1">🎉 Extra turn!</p>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="flex gap-4 mt-4 text-xs">
            <div className="flex items-center gap-2 bg-red-50 px-3 py-2 rounded">
              <span className="text-xl">🐍</span>
              <span className="font-semibold text-red-700">Snakes (go down)</span>
            </div>
            <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded">
              <span className="text-xl">🪜</span>
              <span className="font-semibold text-green-700">Ladders (go up)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}