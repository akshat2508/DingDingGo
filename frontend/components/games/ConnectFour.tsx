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
    <div className="flex flex-col items-center justify-center h-full p-4" style={{ backgroundColor: '#DFF4FF' }}>
      <div className="mb-4 text-center">
        <h2 className="text-3xl font-bold mb-2" style={{ color: '#2D3A45' }}>Connect Four</h2>
        {!guestId ? (
          <p style={{ color: '#70838F' }}>Waiting for opponent...</p>
        ) : gameState.winner ? (
          <div>
            <p className="text-2xl font-bold mb-3">
              {gameState.winner === 'draw' ? (
                <span style={{ color: '#FCEB87' }}>It's a draw! 🤝</span>
              ) : gameState.winner === (isHost ? 'host' : 'guest') ? (
                <span style={{ color: '#88E3C2' }}>You won! 🎉</span>
              ) : (
                <span style={{ color: '#FF9FB8' }}>You lost! 😢</span>
              )}
            </p>
            <button
              onClick={resetGame}
              className="px-6 py-3 rounded-xl hover:shadow-lg transition-all font-semibold flex items-center gap-2 mx-auto"
              style={{ 
                backgroundColor: '#FFA84A',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)'
              }}
            >
              <RotateCcw size={20} />
              Play Again
            </button>
          </div>
        ) : (
          <p className="text-lg font-semibold" style={{ color: isMyTurn() ? '#88E3C2' : '#FFA84A' }}>
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
                  className="animate-bounce"
                  style={{ color: isHost ? '#7EC9F5' : '#FF9FB8' }}
                  fill="currentColor"
                />
              )}
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl" style={{ 
          background: 'linear-gradient(135deg, #7EC9F5 0%, #88E3C2 100%)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
        }}>
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
                        ? 'cursor-pointer'
                        : 'cursor-not-allowed'
                    } ${isWinningCell(rowIndex, colIndex) ? 'ring-4 animate-pulse' : ''}`}
                    style={{
                      backgroundColor: cell === null
                        ? '#FFFFFF'
                        : cell === 'host'
                        ? '#7EC9F5'
                        : '#FF9FB8',
                      boxShadow: isWinningCell(rowIndex, colIndex)
                        ? '0 0 0 6px rgba(252,235,135,0.8), 0 4px 8px rgba(0, 0, 0, 0.2)'
                        : (cell !== null ? '0 4px 8px rgba(0, 0, 0, 0.2)' : 'inset 0 2px 4px rgba(0, 0, 0, 0.1)')
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
        <div 
          className="px-6 py-3 rounded-xl border-2" 
          style={{ 
            backgroundColor: isHost ? '#DFF4FF' : '#FFE6EC',
            borderColor: isHost ? '#7EC9F5' : '#FF9FB8',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="w-6 h-6 rounded-full" 
              style={{ backgroundColor: isHost ? '#7EC9F5' : '#FF9FB8' }}
            />
            <span className="font-semibold" style={{ color: '#2D3A45' }}>You</span>
          </div>
        </div>
        <div 
          className="px-6 py-3 rounded-xl border-2" 
          style={{ 
            backgroundColor: isHost ? '#FFE6EC' : '#DFF4FF',
            borderColor: isHost ? '#FF9FB8' : '#7EC9F5',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="w-6 h-6 rounded-full" 
              style={{ backgroundColor: isHost ? '#FF9FB8' : '#7EC9F5' }}
            />
            <span className="font-semibold" style={{ color: '#2D3A45' }}>Opponent</span>
          </div>
        </div>
      </div>
    </div>
  );
}