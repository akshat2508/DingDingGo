'use client';

import { useState, useEffect } from 'react';
import { socket } from '@/lib/socket';
import { User } from '@supabase/supabase-js';
import { RotateCcw, Circle } from 'lucide-react';

interface ConnectFourProps {
  roomId: string;
  user: User;
  hostId: string;
  guestId: string | null;
  initialState: any;
}

interface GameState {
  board: (string | null)[][];
  currentPlayer: 'host' | 'guest';
  winner: 'host' | 'guest' | 'draw' | null;
  winningCells: number[][];
  lastMove: { row: number; col: number } | null;
}

const ROWS = 6;
const COLS = 7;

export default function ConnectFour({ roomId, user, hostId, guestId, initialState }: ConnectFourProps) {
  const isHost = user.id === hostId;
  const isGuest = user.id === guestId;

  const [gameState, setGameState] = useState<GameState>(() => {
    const defaultState: GameState = {
      board: Array(ROWS).fill(null).map(() => Array(COLS).fill(null)),
      currentPlayer: 'host',
      winner: null,
      winningCells: [],
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

  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

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

  const checkWinner = (board: (string | null)[][]): { winner: 'host' | 'guest' | 'draw' | null; winningCells: number[][] } => {
    // Check horizontal
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS - 3; col++) {
        if (board[row][col] && 
            board[row][col] === board[row][col + 1] &&
            board[row][col] === board[row][col + 2] &&
            board[row][col] === board[row][col + 3]) {
          return {
            winner: board[row][col] as 'host' | 'guest',
            winningCells: [[row, col], [row, col + 1], [row, col + 2], [row, col + 3]]
          };
        }
      }
    }

    // Check vertical
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS - 3; row++) {
        if (board[row][col] && 
            board[row][col] === board[row + 1][col] &&
            board[row][col] === board[row + 2][col] &&
            board[row][col] === board[row + 3][col]) {
          return {
            winner: board[row][col] as 'host' | 'guest',
            winningCells: [[row, col], [row + 1, col], [row + 2, col], [row + 3, col]]
          };
        }
      }
    }

    // Check diagonal (down-right)
    for (let row = 0; row < ROWS - 3; row++) {
      for (let col = 0; col < COLS - 3; col++) {
        if (board[row][col] && 
            board[row][col] === board[row + 1][col + 1] &&
            board[row][col] === board[row + 2][col + 2] &&
            board[row][col] === board[row + 3][col + 3]) {
          return {
            winner: board[row][col] as 'host' | 'guest',
            winningCells: [[row, col], [row + 1, col + 1], [row + 2, col + 2], [row + 3, col + 3]]
          };
        }
      }
    }

    // Check diagonal (down-left)
    for (let row = 0; row < ROWS - 3; row++) {
      for (let col = 3; col < COLS; col++) {
        if (board[row][col] && 
            board[row][col] === board[row + 1][col - 1] &&
            board[row][col] === board[row + 2][col - 2] &&
            board[row][col] === board[row + 3][col - 3]) {
          return {
            winner: board[row][col] as 'host' | 'guest',
            winningCells: [[row, col], [row + 1, col - 1], [row + 2, col - 2], [row + 3, col - 3]]
          };
        }
      }
    }

    // Check for draw
    const isFull = board.every(row => row.every(cell => cell !== null));
    if (isFull) {
      return { winner: 'draw', winningCells: [] };
    }

    return { winner: null, winningCells: [] };
  };

  const dropDisc = (col: number) => {
    if (!guestId || gameState.winner || !isMyTurn() || isAnimating) return;

    // Find the lowest empty row in this column
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (gameState.board[r][col] === null) {
        row = r;
        break;
      }
    }

    if (row === -1) return; // Column is full

    setIsAnimating(true);

    setTimeout(() => {
      const newBoard = gameState.board.map(r => [...r]);
      newBoard[row][col] = gameState.currentPlayer;

      const { winner, winningCells } = checkWinner(newBoard);

      const newState: GameState = {
        board: newBoard,
        currentPlayer: winner ? gameState.currentPlayer : (gameState.currentPlayer === 'host' ? 'guest' : 'host'),
        winner,
        winningCells,
        lastMove: { row, col }
      };

      emitGameState(newState);
      setIsAnimating(false);
    }, 300);
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
      board: Array(ROWS).fill(null).map(() => Array(COLS).fill(null)),
      currentPlayer: 'host',
      winner: null,
      winningCells: [],
      lastMove: null
    };
    emitGameState(newState);
  };

  const isWinningCell = (row: number, col: number) => {
    return gameState.winningCells.some(([r, c]) => r === row && c === col);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="mb-4 text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Connect Four</h2>
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
              className="bg-linear-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all font-semibold shadow-lg flex items-center gap-2 mx-auto"
            >
              <RotateCcw size={20} />
              Play Again
            </button>
          </div>
        ) : (
          <p className={`text-lg font-semibold ${isMyTurn() ? 'text-green-600' : 'text-orange-600'}`}>
            {isMyTurn() ? 'Your turn! Drop a disc' : "Opponent's turn"}
          </p>
        )}
      </div>

      {/* Game Board */}
      <div className="relative">
        {/* Column hover indicators */}
        <div className="flex gap-1 mb-2">
          {Array(COLS).fill(null).map((_, col) => (
            <div key={col} className="w-16 h-8 flex items-center justify-center">
              {hoveredCol === col && isMyTurn() && !gameState.winner && guestId && (
                <Circle
                  size={24}
                  className={`${isHost ? 'text-blue-500' : 'text-red-500'} animate-bounce`}
                  fill="currentColor"
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-linear-to-br from-blue-600 to-blue-800 p-4 rounded-xl shadow-2xl">
          <div className="grid gap-1">
            {gameState.board.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-1">
                {row.map((cell, colIndex) => (
                  <button
                    key={colIndex}
                    onClick={() => dropDisc(colIndex)}
                    onMouseEnter={() => setHoveredCol(colIndex)}
                    onMouseLeave={() => setHoveredCol(null)}
                    disabled={!isMyTurn() || gameState.winner !== null || !guestId}
                    className={`w-16 h-16 rounded-full transition-all duration-200 ${
                      isMyTurn() && !gameState.winner && guestId
                        ? 'cursor-pointer hover:bg-blue-400'
                        : 'cursor-not-allowed'
                    } ${isWinningCell(rowIndex, colIndex) ? 'ring-4 ring-yellow-400 animate-pulse' : ''}`}
                    style={{
                      backgroundColor: cell === null
                        ? '#e0f2fe'
                        : cell === 'host'
                        ? '#3b82f6'
                        : '#ef4444',
                      boxShadow: cell !== null ? '0 4px 6px rgba(0, 0, 0, 0.3)' : 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Player indicators */}
      <div className="flex gap-8 mt-6">
        <div className={`px-6 py-3 rounded-lg border-2 ${isHost ? 'bg-blue-100 border-blue-500' : 'bg-red-100 border-red-500'}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-6 h-6 rounded-full ${isHost ? 'bg-blue-500' : 'bg-red-500'}`} />
            <span className={`font-semibold ${isHost ? 'text-blue-800' : 'text-red-800'}`}>You</span>
          </div>
        </div>
        <div className={`px-6 py-3 rounded-lg border-2 ${isHost ? 'bg-red-100 border-red-500' : 'bg-blue-100 border-blue-500'}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-6 h-6 rounded-full ${isHost ? 'bg-red-500' : 'bg-blue-500'}`} />
            <span className={`font-semibold ${isHost ? 'text-red-800' : 'text-blue-800'}`}>Opponent</span>
          </div>
        </div>
      </div>
    </div>
  );
}