'use client';

import { useState, useEffect } from 'react';
import { socket } from '@/lib/socket';
import { User } from '@supabase/supabase-js';
import { RotateCcw } from 'lucide-react';

interface FourColorsProps {
  roomId: string;
  user: User;
  hostId: string;
  guestId: string | null;
  initialState: any;
}

interface Card {
  color: 'red' | 'blue' | 'green' | 'yellow';
  number: number;
}

interface GameState {
  deck: Card[];
  hostHand: Card[];
  guestHand: Card[];
  discardPile: Card[];
  currentPlayer: 'host' | 'guest';
  winner: 'host' | 'guest' | null;
  lastDrawn: boolean;
}

const COLORS: ('red' | 'blue' | 'green' | 'yellow')[] = ['red', 'blue', 'green', 'yellow'];
const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function FourColors({ roomId, user, hostId, guestId, initialState }: FourColorsProps) {
  const isHost = user.id === hostId;
  const isGuest = user.id === guestId;

  const createDeck = (): Card[] => {
    const deck: Card[] = [];
    COLORS.forEach(color => {
      NUMBERS.forEach(number => {
        deck.push({ color, number });
        if (number !== 0) deck.push({ color, number });
      });
    });
    return shuffleDeck(deck);
  };

  const shuffleDeck = (deck: Card[]): Card[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const [gameState, setGameState] = useState<GameState>(() => {
    const defaultDeck = createDeck();
    const defaultState: GameState = {
      deck: defaultDeck.slice(14),
      hostHand: defaultDeck.slice(0, 7),
      guestHand: defaultDeck.slice(7, 14),
      discardPile: [],
      currentPlayer: 'host',
      winner: null,
      lastDrawn: false
    };

    if (initialState && typeof initialState === 'object' && initialState.deck) {
      return {
        ...defaultState,
        ...initialState,
        currentPlayer: initialState.currentPlayer || 'host'
      };
    }

    if (defaultState.deck.length > 0) {
      defaultState.discardPile = [defaultState.deck[0]];
      defaultState.deck = defaultState.deck.slice(1);
    }

    return defaultState;
  });

  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  useEffect(() => {
    socket.on('game-updated', ({ gameState: newState }) => {
      if (newState && typeof newState === 'object') {
        setGameState({
          ...newState,
          currentPlayer: newState.currentPlayer || 'host'
        });
        setSelectedCard(null);
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

  const canPlayCard = (card: Card): boolean => {
    if (gameState.discardPile.length === 0) return true;
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];
    return card.color === topCard.color || card.number === topCard.number;
  };

  const playCard = (cardIndex: number) => {
    if (!guestId || gameState.winner || !isMyTurn()) return;

    const hand = isHost ? gameState.hostHand : gameState.guestHand;
    const card = hand[cardIndex];

    if (!canPlayCard(card)) return;

    const newHand = hand.filter((_, i) => i !== cardIndex);
    const newDiscardPile = [...gameState.discardPile, card];

    const winner = newHand.length === 0 ? gameState.currentPlayer : null;

    const newState: GameState = {
      ...gameState,
      hostHand: isHost ? newHand : gameState.hostHand,
      guestHand: isGuest ? newHand : gameState.guestHand,
      discardPile: newDiscardPile,
      currentPlayer: winner ? gameState.currentPlayer : (gameState.currentPlayer === 'host' ? 'guest' : 'host'),
      winner,
      lastDrawn: false
    };

    emitGameState(newState);
  };

  const drawCard = () => {
    if (!guestId || gameState.winner || !isMyTurn() || gameState.lastDrawn) return;

    if (gameState.deck.length === 0) {
      const topCard = gameState.discardPile[gameState.discardPile.length - 1];
      const newDeck = shuffleDeck(gameState.discardPile.slice(0, -1));
      const drawnCard = newDeck[0];

      const newHand = isHost
        ? [...gameState.hostHand, drawnCard]
        : [...gameState.guestHand, drawnCard];

      const newState: GameState = {
        ...gameState,
        deck: newDeck.slice(1),
        hostHand: isHost ? newHand : gameState.hostHand,
        guestHand: isGuest ? newHand : gameState.guestHand,
        discardPile: [topCard],
        lastDrawn: true
      };

      emitGameState(newState);
      return;
    }

    const drawnCard = gameState.deck[0];
    const newHand = isHost
      ? [...gameState.hostHand, drawnCard]
      : [...gameState.guestHand, drawnCard];

    const canPlay = canPlayCard(drawnCard);

    const newState: GameState = {
      ...gameState,
      deck: gameState.deck.slice(1),
      hostHand: isHost ? newHand : gameState.hostHand,
      guestHand: isGuest ? newHand : gameState.guestHand,
      currentPlayer: canPlay ? gameState.currentPlayer : (gameState.currentPlayer === 'host' ? 'guest' : 'host'),
      lastDrawn: canPlay
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
    const newDeck = createDeck();
    const newState: GameState = {
      deck: newDeck.slice(15),
      hostHand: newDeck.slice(0, 7),
      guestHand: newDeck.slice(7, 14),
      discardPile: [newDeck[14]],
      currentPlayer: 'host',
      winner: null,
      lastDrawn: false
    };
    emitGameState(newState);
  };

  const getColorClass = (color: string): string => {
    switch (color) {
      case 'red': return 'bg-gradient-to-br from-red-400 to-red-500';
      case 'blue': return 'bg-gradient-to-br from-blue-400 to-blue-500';
      case 'green': return 'bg-gradient-to-br from-green-400 to-green-500';
      case 'yellow': return 'bg-gradient-to-br from-yellow-300 to-yellow-400';
      default: return 'bg-gray-500';
    }
  };

  const myHand = isHost ? gameState.hostHand : gameState.guestHand;
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="mb-6 text-center">
        <h2 className="text-4xl font-black text-gray-800 mb-3 tracking-tight">Four Colors 🎴</h2>
        {!guestId ? (
          <p className="text-gray-600 text-lg font-medium">Waiting for opponent...</p>
        ) : gameState.winner ? (
          <div>
            <p className="text-3xl font-black mb-4">
              {gameState.winner === (isHost ? 'host' : 'guest') ? (
                <span className="text-green-600">You won! 🎉</span>
              ) : (
                <span className="text-red-600">You lost! 😢</span>
              )}
            </p>
            <button
              onClick={resetGame}
              className="bg-linear-to-r from-orange-400 to-orange-500 text-white px-8 py-4 rounded-2xl hover:from-orange-500 hover:to-orange-600 transition-all font-bold shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto transform hover:scale-105 active:scale-95 duration-150"
            >
              <RotateCcw size={22} strokeWidth={2.5} />
              Play Again
            </button>
          </div>
        ) : (
          <p className={`text-xl font-bold ${isMyTurn() ? 'text-green-600' : 'text-orange-600'}`}>
            {isMyTurn() ? '✨ Your turn! Play or draw a card' : "⏳ Opponent's turn"}
          </p>
        )}
      </div>

      {/* Opponent's card count */}
      <div className="mb-6">
        <div className="bg-white px-6 py-4 rounded-2xl shadow-md border-2 border-blue-100">
          <p className="text-sm font-bold text-gray-600 mb-2 text-center">Opponent's cards</p>
          <div className="flex gap-2 justify-center">
            {(isHost ? gameState.guestHand : gameState.hostHand).map((_, i) => (
              <div key={i} className="w-12 h-16 bg-linear-to-br from-gray-600 to-gray-800 rounded-lg shadow-md border-2 border-gray-700" />
            ))}
          </div>
        </div>
      </div>

      {/* Game area */}
      <div className="flex gap-12 items-center mb-8">
        {/* Deck */}
        <div className="text-center">
          <p className="text-sm font-bold text-gray-700 mb-3">Deck ({gameState.deck.length})</p>
          <button
            onClick={drawCard}
            disabled={!isMyTurn() || gameState.winner !== null || !guestId || gameState.lastDrawn}
            className={`w-28 h-36 rounded-2xl shadow-xl transition-all border-4 ${
              isMyTurn() && !gameState.winner && guestId && !gameState.lastDrawn
                ? 'bg-linear-to-br from-gray-700 to-gray-900 hover:scale-110 cursor-pointer border-gray-600 hover:border-orange-400'
                : 'bg-gray-400 cursor-not-allowed opacity-50 border-gray-500'
            }`}
          >
            <p className="text-5xl">🎴</p>
          </button>
        </div>

        {/* Discard pile */}
        <div className="text-center">
          <p className="text-sm font-bold text-gray-700 mb-3">Top Card</p>
          {topCard && (
            <div className={`w-28 h-36 rounded-2xl shadow-2xl flex items-center justify-center border-4 border-white ${getColorClass(topCard.color)}`}>
              <span className="text-white text-6xl font-black drop-shadow-lg">{topCard.number}</span>
            </div>
          )}
        </div>
      </div>

      {/* Player's hand */}
      <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-blue-100">
        <p className="text-sm font-bold text-gray-700 mb-4 text-center">Your Cards ✋</p>
        <div className="flex gap-3 flex-wrap justify-center max-w-4xl">
          {myHand.map((card, index) => (
            <button
              key={index}
              onClick={() => {
                if (canPlayCard(card)) {
                  playCard(index);
                }
              }}
              disabled={!isMyTurn() || gameState.winner !== null || !guestId || !canPlayCard(card)}
              className={`w-24 h-32 rounded-2xl shadow-lg transition-all border-4 border-white ${getColorClass(card.color)} ${
                isMyTurn() && !gameState.winner && guestId && canPlayCard(card)
                  ? 'hover:scale-125 hover:-translate-y-3 cursor-pointer hover:shadow-2xl'
                  : 'cursor-not-allowed opacity-40'
              } ${selectedCard === index ? 'ring-4 ring-orange-400 scale-110' : ''}`}
              onMouseEnter={() => setSelectedCard(index)}
              onMouseLeave={() => setSelectedCard(null)}
            >
              <div className="flex items-center justify-center h-full">
                <span className="text-white text-5xl font-black drop-shadow-lg">{card.number}</span>
              </div>
            </button>
          ))}
        </div>
        {myHand.length === 0 && <p className="text-gray-500 text-center font-semibold">No cards</p>}
      </div>
    </div>
  );
}