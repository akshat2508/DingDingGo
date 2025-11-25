'use client';

import { useState, useEffect } from 'react';
import { socket } from '@/lib/socket';
import { User } from '@supabase/supabase-js';
import { RotateCcw } from 'lucide-react';

interface MemoryMatchProps {
  roomId: string;
  user: User;
  hostId: string;
  guestId: string | null;
  initialState: any;
}

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface GameState {
  cards: Card[];
  flippedCards: number[];
  currentPlayer: 'host' | 'guest';
  hostScore: number;
  guestScore: number;
  winner: 'host' | 'guest' | 'draw' | null;
  isChecking: boolean;
}

const EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸'];

export default function MemoryMatch({ roomId, user, hostId, guestId, initialState }: MemoryMatchProps) {
  const isHost = user.id === hostId;
  const isGuest = user.id === guestId;

  const createCards = (): Card[] => {
    const selectedEmojis = EMOJIS.slice(0, 8);
    const pairs = [...selectedEmojis, ...selectedEmojis];
    const shuffled = pairs
      .map((emoji, index) => ({ id: index, emoji, isFlipped: false, isMatched: false }))
      .sort(() => Math.random() - 0.5);
    return shuffled;
  };

  const [gameState, setGameState] = useState<GameState>(() => {
    const defaultState: GameState = {
      cards: createCards(),
      flippedCards: [],
      currentPlayer: 'host',
      hostScore: 0,
      guestScore: 0,
      winner: null,
      isChecking: false
    };

    if (initialState && typeof initialState === 'object' && initialState.cards) {
      return {
        ...defaultState,
        ...initialState,
        currentPlayer: initialState.currentPlayer || 'host'
      };
    }

    return defaultState;
  });

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

  const flipCard = (cardId: number) => {
    if (!guestId || gameState.winner || !isMyTurn() || gameState.isChecking) return;

    const card = gameState.cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    if (gameState.flippedCards.length >= 2) return;

    const newCards = gameState.cards.map(c =>
      c.id === cardId ? { ...c, isFlipped: true } : c
    );

    const newFlippedCards = [...gameState.flippedCards, cardId];

    // If this is the second card flipped
    if (newFlippedCards.length === 2) {
      const [firstId, secondId] = newFlippedCards;
      const firstCard = newCards.find(c => c.id === firstId);
      const secondCard = newCards.find(c => c.id === secondId);

      if (firstCard && secondCard && firstCard.emoji === secondCard.emoji) {
        // Match found!
        const matchedCards = newCards.map(c =>
          c.id === firstId || c.id === secondId ? { ...c, isMatched: true } : c
        );

        const newScore = gameState.currentPlayer === 'host' ? gameState.hostScore + 1 : gameState.guestScore + 1;
        const totalMatches = matchedCards.filter(c => c.isMatched).length / 2;
        
        let winner: 'host' | 'guest' | 'draw' | null = null;
        if (totalMatches === 8) {
          const hostScore = gameState.currentPlayer === 'host' ? newScore : gameState.hostScore;
          const guestScore = gameState.currentPlayer === 'guest' ? newScore : gameState.guestScore;
          if (hostScore > guestScore) winner = 'host';
          else if (guestScore > hostScore) winner = 'guest';
          else winner = 'draw';
        }

        const newState: GameState = {
          cards: matchedCards,
          flippedCards: [],
          currentPlayer: gameState.currentPlayer, // Same player continues
          hostScore: gameState.currentPlayer === 'host' ? newScore : gameState.hostScore,
          guestScore: gameState.currentPlayer === 'guest' ? newScore : gameState.guestScore,
          winner,
          isChecking: false
        };

        setTimeout(() => {
          emitGameState(newState);
        }, 800);
      } else {
        // No match - flip cards back after delay
        const newState: GameState = {
          ...gameState,
          cards: newCards,
          flippedCards: newFlippedCards,
          isChecking: true
        };
        emitGameState(newState);

        setTimeout(() => {
          const resetCards = newCards.map(c =>
            c.id === firstId || c.id === secondId ? { ...c, isFlipped: false } : c
          );

          const nextState: GameState = {
            cards: resetCards,
            flippedCards: [],
            currentPlayer: gameState.currentPlayer === 'host' ? 'guest' : 'host',
            hostScore: gameState.hostScore,
            guestScore: gameState.guestScore,
            winner: null,
            isChecking: false
          };

          emitGameState(nextState);
        }, 1500);
      }
    } else {
      // First card flipped
      const newState: GameState = {
        ...gameState,
        cards: newCards,
        flippedCards: newFlippedCards,
        isChecking: false
      };
      emitGameState(newState);
    }
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
      cards: createCards(),
      flippedCards: [],
      currentPlayer: 'host',
      hostScore: 0,
      guestScore: 0,
      winner: null,
      isChecking: false
    };
    emitGameState(newState);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="mb-4 text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Memory Match</h2>
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
            {isMyTurn() ? 'Your turn! Find matching pairs' : "Opponent's turn"}
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
      <div className="grid grid-cols-4 gap-4 max-w-2xl">
        {gameState.cards.map((card) => (
          <button
            key={card.id}
            onClick={() => flipCard(card.id)}
            disabled={!isMyTurn() || gameState.winner !== null || !guestId || card.isFlipped || card.isMatched || gameState.isChecking}
            className={`w-24 h-32 rounded-lg shadow-xl transition-all duration-300 transform ${
              card.isFlipped || card.isMatched
                ? 'bg-linear-to-br from-blue-400 to-blue-600'
                : 'bg-linear-to-br from-gray-700 to-gray-900 hover:scale-105'
            } ${
              isMyTurn() && !gameState.winner && guestId && !card.isFlipped && !card.isMatched && !gameState.isChecking
                ? 'cursor-pointer'
                : 'cursor-not-allowed'
            } ${card.isMatched ? 'opacity-60 scale-95' : ''}`}
            style={{
              perspective: '1000px'
            }}
          >
            <div className="flex items-center justify-center h-full">
              {card.isFlipped || card.isMatched ? (
                <span className="text-5xl">{card.emoji}</span>
              ) : (
                <span className="text-5xl">❓</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Info */}
      <div className="mt-6 text-center text-sm text-gray-600">
        <p>Find all 8 matching pairs. The player with the most matches wins!</p>
      </div>
    </div>
  );
}