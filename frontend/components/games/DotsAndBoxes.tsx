'use client';

import { useState, useEffect } from 'react';
import { socket } from '@/lib/socket';
import { User } from '@supabase/supabase-js';
import { RotateCcw } from 'lucide-react';

interface DotsAndBoxesProps {
  roomId: string;
  user: User;
  hostId: string;
  guestId: string | null;
  initialState: any;
}

interface GameState {
  horizontalLines: boolean[][];
  verticalLines: boolean[][];
  boxes: ('host' | 'guest' | null)[][];
  currentPlayer: 'host' | 'guest';
  hostScore: number;
  guestScore: number;
  winner: 'host' | 'guest' | 'draw' | null;
  lastMove: { type: 'h' | 'v'; row: number; col: number } | null;
}

const GRID_SIZE = 5;

export default function DotsAndBoxes({ roomId, user, hostId, guestId, initialState }: DotsAndBoxesProps) {
  const isHost = user.id === hostId;
  const isGuest = user.id === guestId;

  const [gameState, setGameState] = useState<GameState>(() => {
    const defaultState: GameState = {
      horizontalLines: Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE - 1).fill(false)),
      verticalLines: Array(GRID_SIZE - 1).fill(null).map(() => Array(GRID_SIZE).fill(false)),
      boxes: Array(GRID_SIZE - 1).fill(null).map(() => Array(GRID_SIZE - 1).fill(null)),
      currentPlayer: 'host',
      hostScore: 0,
      guestScore: 0,
      winner: null,
      lastMove: null
    };

    if (initialState && typeof initialState === 'object') {
      return {
        ...defaultState,
        ...initialState,
        currentPlayer: initialState.currentPlayer || 'host'
      };
    }

    return defaultState;
  });

  const [hoveredLine, setHoveredLine] = useState<{ type: 'h' | 'v'; row: number; col: number } | null>(null);

  useEffect(() => {
    socket.on('game-updated', ({ gameState: newState }) => {
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

  const isMyTurn = () => {
    if (isHost) return gameState.currentPlayer === 'host';
    if (isGuest) return gameState.currentPlayer === 'guest';
    return false;
  };

  const checkBox = (row: number, col: number, horizontalLines: boolean[][], verticalLines: boolean[][]): boolean => {
    return (
      horizontalLines[row][col] &&
      horizontalLines[row + 1][col] &&
      verticalLines[row][col] &&
      verticalLines[row][col + 1]
    );
  };

  const clickLine = (type: 'h' | 'v', row: number, col: number) => {
    if (!guestId || gameState.winner || !isMyTurn()) return;

    const lines = type === 'h' ? gameState.horizontalLines : gameState.verticalLines;
    if (lines[row][col]) return; // Line already drawn

    const newHorizontalLines = gameState.horizontalLines.map(r => [...r]);
    const newVerticalLines = gameState.verticalLines.map(r => [...r]);
    const newBoxes = gameState.boxes.map(r => [...r]);

    if (type === 'h') {
      newHorizontalLines[row][col] = true;
    } else {
      newVerticalLines[row][col] = true;
    }

    // Check if any boxes were completed
    let boxesCompleted = 0;

    for (let r = 0; r < GRID_SIZE - 1; r++) {
      for (let c = 0; c < GRID_SIZE - 1; c++) {
        if (newBoxes[r][c] === null && checkBox(r, c, newHorizontalLines, newVerticalLines)) {
          newBoxes[r][c] = gameState.currentPlayer;
          boxesCompleted++;
        }
      }
    }

    const newHostScore = gameState.hostScore + (gameState.currentPlayer === 'host' ? boxesCompleted : 0);
    const newGuestScore = gameState.guestScore + (gameState.currentPlayer === 'guest' ? boxesCompleted : 0);

    // Check if game is over
    const totalBoxes = (GRID_SIZE - 1) * (GRID_SIZE - 1);
    let winner: 'host' | 'guest' | 'draw' | null = null;
    if (newHostScore + newGuestScore === totalBoxes) {
      if (newHostScore > newGuestScore) winner = 'host';
      else if (newGuestScore > newHostScore) winner = 'guest';
      else winner = 'draw';
    }

    // If boxes were completed, player gets another turn
    const nextPlayer = boxesCompleted > 0 ? gameState.currentPlayer : (gameState.currentPlayer === 'host' ? 'guest' : 'host');

    const newState: GameState = {
      horizontalLines: newHorizontalLines,
      verticalLines: newVerticalLines,
      boxes: newBoxes,
      currentPlayer: winner ? gameState.currentPlayer : nextPlayer,
      hostScore: newHostScore,
      guestScore: newGuestScore,
      winner,
      lastMove: { type, row, col }
    };

    emitGameState(newState);
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
    const newState: GameState = {
      horizontalLines: Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE - 1).fill(false)),
      verticalLines: Array(GRID_SIZE - 1).fill(null).map(() => Array(GRID_SIZE).fill(false)),
      boxes: Array(GRID_SIZE - 1).fill(null).map(() => Array(GRID_SIZE - 1).fill(null)),
      currentPlayer: 'host',
      hostScore: 0,
      guestScore: 0,
      winner: null,
      lastMove: null
    };
    emitGameState(newState);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="mb-4 text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Dots and Boxes</h2>
        {!guestId ? (
          <p className="text-gray-600">Waiting for opponent...</p>
        ) : gameState.winner ? (
          <div>
            <p className="text-2xl font-bold mb-3">
              {gameState.winner === 'draw' ? (
                <span className="text-yellow-600">It's a draw! 🤝</span>
              ) : gameState.winner === (isHost ? 'host' : 'guest') ? (
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
          <p className={`text-lg font-semibold ${isMyTurn() ? 'text-green-600' : 'text-orange-600'}`}>
            {isMyTurn() ? 'Your turn! Draw a line' : "Opponent's turn"}
          </p>
        )}
      </div>

      {/* Scores */}
      <div className="flex gap-8 mb-6">
        <div className={`px-6 py-3 rounded-lg border-2 ${isHost ? 'bg-blue-100 border-blue-500' : 'bg-red-100 border-red-500'}`}>
          <p className={`text-sm font-semibold ${isHost ? 'text-blue-800' : 'text-red-800'} mb-1`}>You</p>
          <p className={`text-3xl font-bold ${isHost ? 'text-blue-600' : 'text-red-600'}`}>
            {isHost ? gameState.hostScore : gameState.guestScore}
          </p>
        </div>
        <div className={`px-6 py-3 rounded-lg border-2 ${isHost ? 'bg-red-100 border-red-500' : 'bg-blue-100 border-blue-500'}`}>
          <p className={`text-sm font-semibold ${isHost ? 'text-red-800' : 'text-blue-800'} mb-1`}>Opponent</p>
          <p className={`text-3xl font-bold ${isHost ? 'text-red-600' : 'text-blue-600'}`}>
            {isHost ? gameState.guestScore : gameState.hostScore}
          </p>
        </div>
      </div>

      {/* Game Board */}
      <div className="bg-gray-50 p-8 rounded-xl shadow-xl">
        <div className="relative" style={{ width: `${GRID_SIZE * 80}px`, height: `${GRID_SIZE * 80}px` }}>
          {/* Dots */}
          {Array(GRID_SIZE).fill(null).map((_, row) => (
            Array(GRID_SIZE).fill(null).map((_, col) => (
              <div
                key={`dot-${row}-${col}`}
                className="absolute w-4 h-4 bg-gray-800 rounded-full"
                style={{
                  left: `${col * 80}px`,
                  top: `${row * 80}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            ))
          ))}

          {/* Horizontal Lines */}
          {gameState.horizontalLines.map((row, rowIndex) => (
            row.map((isDrawn, colIndex) => (
              <button
                key={`h-${rowIndex}-${colIndex}`}
                onClick={() => clickLine('h', rowIndex, colIndex)}
                onMouseEnter={() => setHoveredLine({ type: 'h', row: rowIndex, col: colIndex })}
                onMouseLeave={() => setHoveredLine(null)}
                disabled={!isMyTurn() || gameState.winner !== null || !guestId || isDrawn}
                className={`absolute transition-all duration-200 ${
                  isDrawn
                    ? 'bg-gray-800 cursor-default'
                    : isMyTurn() && !gameState.winner && guestId
                    ? 'bg-gray-300 hover:bg-blue-400 cursor-pointer'
                    : 'bg-gray-300 cursor-not-allowed'
                } ${
                  hoveredLine?.type === 'h' && hoveredLine.row === rowIndex && hoveredLine.col === colIndex && !isDrawn
                    ? 'bg-blue-400'
                    : ''
                }`}
                style={{
                  left: `${colIndex * 80 + 8}px`,
                  top: `${rowIndex * 80}px`,
                  width: '64px',
                  height: '4px',
                  transform: 'translateY(-50%)'
                }}
              />
            ))
          ))}

          {/* Vertical Lines */}
          {gameState.verticalLines.map((row, rowIndex) => (
            row.map((isDrawn, colIndex) => (
              <button
                key={`v-${rowIndex}-${colIndex}`}
                onClick={() => clickLine('v', rowIndex, colIndex)}
                onMouseEnter={() => setHoveredLine({ type: 'v', row: rowIndex, col: colIndex })}
                onMouseLeave={() => setHoveredLine(null)}
                disabled={!isMyTurn() || gameState.winner !== null || !guestId || isDrawn}
                className={`absolute transition-all duration-200 ${
                  isDrawn
                    ? 'bg-gray-800 cursor-default'
                    : isMyTurn() && !gameState.winner && guestId
                    ? 'bg-gray-300 hover:bg-blue-400 cursor-pointer'
                    : 'bg-gray-300 cursor-not-allowed'
                } ${
                  hoveredLine?.type === 'v' && hoveredLine.row === rowIndex && hoveredLine.col === colIndex && !isDrawn
                    ? 'bg-blue-400'
                    : ''
                }`}
                style={{
                  left: `${colIndex * 80}px`,
                  top: `${rowIndex * 80 + 8}px`,
                  width: '4px',
                  height: '64px',
                  transform: 'translateX(-50%)'
                }}
              />
            ))
          ))}

          {/* Boxes */}
          {gameState.boxes.map((row, rowIndex) => (
            row.map((owner, colIndex) => (
              <div
                key={`box-${rowIndex}-${colIndex}`}
                className={`absolute rounded transition-all duration-300 ${
                  owner === 'host'
                    ? 'bg-blue-500'
                    : owner === 'guest'
                    ? 'bg-red-500'
                    : 'bg-transparent'
                }`}
                style={{
                  left: `${colIndex * 80 + 8}px`,
                  top: `${rowIndex * 80 + 8}px`,
                  width: '64px',
                  height: '64px'
                }}
              />
            ))
          ))}
        </div>
      </div>
    </div>
  );
}