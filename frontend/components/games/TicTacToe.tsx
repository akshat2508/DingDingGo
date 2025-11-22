'use client';

import { useState, useEffect } from 'react';
import { socket } from '@/lib/socket';
import { User } from '@supabase/supabase-js';
import { RotateCcw } from 'lucide-react';

interface TicTacToeProps {
  roomId: string;
  user: User;
  hostId: string;
  guestId: string | null;
  initialState: any;
}

type Player = 'X' | 'O';
type Board = (Player | null)[];

export default function TicTacToe({ roomId, user, hostId, guestId, initialState }: TicTacToeProps) {
  const [board, setBoard] = useState<Board>(initialState?.board || Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>(initialState?.currentPlayer || 'X');
  const [winner, setWinner] = useState<Player | 'draw' | null>(initialState?.winner || null);

  const isHost = user.id === hostId;
  const mySymbol: Player = isHost ? 'X' : 'O';
  const isMyTurn = currentPlayer === mySymbol && !winner;

  useEffect(() => {
    socket.on('game-updated', ({ gameState }) => {
      setBoard(gameState.board);
      setCurrentPlayer(gameState.currentPlayer);
      setWinner(gameState.winner);
    });

    return () => {
      socket.off('game-updated');
    };
  }, []);

  const checkWinner = (squares: Board): Player | 'draw' | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }

    if (squares.every(square => square !== null)) {
      return 'draw';
    }

    return null;
  };

  const handleClick = (index: number) => {
    if (!guestId || board[index] || !isMyTurn || winner) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;

    const newWinner = checkWinner(newBoard);
    const nextPlayer: Player = currentPlayer === 'X' ? 'O' : 'X';

    const newState = {
      board: newBoard,
      currentPlayer: nextPlayer,
      winner: newWinner
    };

    setBoard(newBoard);
    setCurrentPlayer(nextPlayer);
    setWinner(newWinner);

    socket.emit('game-move', {
      roomId,
      gameState: newState,
      playerId: user.id
    });
  };

  const resetGame = () => {
    const newState = {
      board: Array(9).fill(null),
      currentPlayer: 'X' as Player,
      winner: null
    };

    setBoard(newState.board);
    setCurrentPlayer(newState.currentPlayer);
    setWinner(newState.winner);

    socket.emit('game-move', {
      roomId,
      gameState: newState,
      playerId: user.id
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-3">Tic Tac Toe</h2>
        {!guestId ? (
          <p className="text-gray-600 text-lg">Waiting for opponent...</p>
        ) : winner ? (
          <div>
            <p className="text-2xl font-bold mb-3">
              {winner === 'draw' ? (
                <span className="text-orange-600">It's a draw! 🤝</span>
              ) : winner === mySymbol ? (
                <span className="text-green-600">You won! 🎉</span>
              ) : (
                <span className="text-red-600">You lost! 😢</span>
              )}
            </p>
            <button
              onClick={resetGame}
              className="bg-linear-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all font-semibold shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
            >
              <RotateCcw size={20} />
              Play Again
            </button>
          </div>
        ) : (
          <p className="text-lg">
            {isMyTurn ? (
              <span className="text-green-600 font-semibold text-xl">
                Your turn ({mySymbol}) ✨
              </span>
            ) : (
              <span className="text-orange-600 font-semibold">
                Opponent's turn...
              </span>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {board.map((cell, index) => (
          <button
            key={index}
            onClick={() => handleClick(index)}
            disabled={!isMyTurn || !!winner || !guestId}
            className={`w-24 h-24 text-4xl font-bold rounded-xl transition-all shadow-lg ${
              cell === 'X' ? 'bg-blue-500 text-white scale-105' :
              cell === 'O' ? 'bg-red-500 text-white scale-105' :
              'bg-white hover:bg-gray-100'
            } ${
              isMyTurn && !cell && !winner && guestId 
                ? 'cursor-pointer hover:scale-110 hover:shadow-xl' 
                : 'cursor-not-allowed'
            } disabled:opacity-50 border-2 border-gray-200`}
          >
            {cell}
          </button>
        ))}
      </div>

      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-lg">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">X</div>
          <span className="font-semibold">{isHost ? 'You' : 'Opponent'}</span>
        </div>
        <div className="flex items-center gap-2 bg-red-100 px-4 py-2 rounded-lg">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold">O</div>
          <span className="font-semibold">{!isHost ? 'You' : 'Opponent'}</span>
        </div>
      </div>
    </div>
  );
}