'use client';

import { useState, useEffect } from 'react';
import { socket } from '@/lib/socket';
import { User } from '@supabase/supabase-js';
import { RotateCcw, Trophy } from 'lucide-react';

interface RPSProps {
  roomId: string;
  user: User;
  hostId: string;
  guestId: string | null;
  initialState: any;
}

type Choice = 'rock' | 'paper' | 'scissors' | null;

const choices = [
  { id: 'rock', emoji: '✊', name: 'Rock', beats: 'scissors' },
  { id: 'paper', emoji: '✋', name: 'Paper', beats: 'rock' },
  { id: 'scissors', emoji: '✌️', name: 'Scissors', beats: 'paper' }
];

export default function RockPaperScissors({ roomId, user, hostId, guestId, initialState }: RPSProps) {
  const [myChoice, setMyChoice] = useState<Choice>(null);
  const [opponentChoice, setOpponentChoice] = useState<Choice>(null);
  const [result, setResult] = useState<string | null>(null);
  const [scores, setScores] = useState(initialState?.scores || { host: 0, guest: 0 });
  const [roundActive, setRoundActive] = useState(false);

  const isHost = user.id === hostId;

  useEffect(() => {
    socket.on('game-updated', ({ gameState }) => {
      const myId = isHost ? 'host' : 'guest';
      const opponentId = isHost ? 'guest' : 'host';

      if (gameState.choices) {
        setMyChoice(gameState.choices[myId]);
        setOpponentChoice(gameState.choices[opponentId]);
      }

      if (gameState.result !== undefined) {
        setResult(gameState.result);
        setRoundActive(false);
      }

      if (gameState.scores) {
        setScores(gameState.scores);
      }
    });

    return () => {
      socket.off('game-updated');
    };
  }, [isHost]);

  const makeChoice = (choice: Choice) => {
    if (!guestId || myChoice) return;

    setMyChoice(choice);
    setRoundActive(true);

    socket.emit('game-move', {
      roomId,
      gameState: {
        choice,
        playerId: user.id,
        isHost
      },
      playerId: user.id
    });
  };

  const playAgain = () => {
    setMyChoice(null);
    setOpponentChoice(null);
    setResult(null);
    setRoundActive(false);

    socket.emit('game-move', {
      roomId,
      gameState: {
        reset: true,
        scores
      },
      playerId: user.id
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-3">Rock Paper Scissors</h2>
        {!guestId ? (
          <p className="text-gray-600 text-lg">Waiting for opponent...</p>
        ) : result ? (
          <div>
            <p className="text-2xl font-bold mb-3">
              {result === 'draw' ? (
                <span className="text-orange-600">It's a draw! 🤝</span>
              ) : result === (isHost ? 'host' : 'guest') ? (
                <span className="text-green-600">You won this round! 🎉</span>
              ) : (
                <span className="text-red-600">You lost this round! 😢</span>
              )}
            </p>
            <button
              onClick={playAgain}
              className="bg-linear-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all font-semibold shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
            >
              <RotateCcw size={20} />
              Play Again
            </button>
          </div>
        ) : (
          <p className="text-lg font-semibold text-gray-700">Make your choice!</p>
        )}
      </div>

      <div className="mb-8 flex gap-12 text-lg font-semibold">
        <div className="text-center bg-blue-50 px-6 py-4 rounded-xl">
          <div className="text-sm text-gray-600 mb-1">You</div>
          <div className="text-3xl text-blue-600 flex items-center gap-2">
            <Trophy size={24} />
            {scores[isHost ? 'host' : 'guest']}
          </div>
        </div>
        <div className="text-gray-400 text-3xl self-center">VS</div>
        <div className="text-center bg-red-50 px-6 py-4 rounded-xl">
          <div className="text-sm text-gray-600 mb-1">Opponent</div>
          <div className="text-3xl text-red-600 flex items-center gap-2">
            <Trophy size={24} />
            {scores[isHost ? 'guest' : 'host']}
          </div>
        </div>
      </div>

      {!result && (
        <div className="flex gap-4 mb-8">
          {choices.map((choice) => (
            <button
              key={choice.id}
              onClick={() => makeChoice(choice.id as Choice)}
              disabled={!guestId || !!myChoice}
              className={`flex flex-col items-center justify-center w-28 h-28 rounded-2xl text-5xl transition-all shadow-lg ${
                myChoice === choice.id
                  ? 'bg-linear-to-br from-blue-500 to-blue-600 text-white scale-110 shadow-2xl'
                  : 'bg-white hover:bg-gray-50 hover:scale-105'
              } disabled:opacity-50 disabled:cursor-not-allowed border-2 border-gray-200`}
            >
              {choice.emoji}
              <span className="text-xs mt-2 font-semibold">{choice.name}</span>
            </button>
          ))}
        </div>
      )}

      {result && myChoice && opponentChoice && (
        <div className="flex gap-8 items-center animate-fade-in">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-3 font-semibold">You chose</div>
            <div className="w-24 h-24 bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-2xl flex items-center justify-center text-5xl shadow-xl">
              {choices.find(c => c.id === myChoice)?.emoji}
            </div>
            <div className="text-sm mt-2 font-medium text-gray-700">
              {choices.find(c => c.id === myChoice)?.name}
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-400">⚔️</div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-3 font-semibold">Opponent chose</div>
            <div className="w-24 h-24 bg-linear-to-br from-red-500 to-red-600 text-white rounded-2xl flex items-center justify-center text-5xl shadow-xl">
              {choices.find(c => c.id === opponentChoice)?.emoji}
            </div>
            <div className="text-sm mt-2 font-medium text-gray-700">
              {choices.find(c => c.id === opponentChoice)?.name}
            </div>
          </div>
        </div>
      )}

      {roundActive && !result && myChoice && (
        <div className="mt-4 text-gray-600 animate-pulse font-semibold">
          ⏳ Waiting for opponent...
        </div>
      )}
    </div>
  );
}