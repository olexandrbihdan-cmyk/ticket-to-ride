import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import Results from './components/Results';

const SOCKET_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:4000'
  : window.location.origin;

const socket = io(SOCKET_URL, { autoConnect: false });

export default function App() {
  const [screen, setScreen] = useState('login'); // login, lobby, game, results
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState(null);
  const [gameResults, setGameResults] = useState(null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('game_state', (state) => {
      setGameState(state);
      if (state.phase === 'waiting') {
        setScreen('lobby');
      } else if (state.phase === 'finished') {
        setScreen('results');
      } else {
        setScreen('game');
      }
    });

    socket.on('game_results', (results) => {
      setGameResults(results);
      setScreen('results');
    });

    socket.on('error', ({ message }) => {
      setError(message);
      setTimeout(() => setError(''), 4000);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game_state');
      socket.off('game_results');
      socket.off('error');
    };
  }, []);

  const handleJoin = useCallback((name) => {
    setPlayerName(name);
    if (!socket.connected) {
      socket.connect();
    }
    // Чекаємо підключення перед відправкою
    const sendJoin = () => {
      socket.emit('join', { playerName: name });
    };
    if (socket.connected) {
      sendJoin();
    } else {
      socket.once('connect', sendJoin);
    }
  }, []);

  const handleStartGame = useCallback(() => {
    socket.emit('start_game');
  }, []);

  const handleAction = useCallback((event, data) => {
    socket.emit(event, data);
  }, []);

  return (
    <div className="h-full w-full bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] overflow-hidden">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl text-sm font-semibold animate-bounce">
          {error}
        </div>
      )}

      {screen === 'login' && (
        <LoginScreen onJoin={handleJoin} />
      )}

      {screen === 'lobby' && gameState && (
        <Lobby
          gameState={gameState}
          playerId={socket.id}
          onStart={handleStartGame}
        />
      )}

      {screen === 'game' && gameState && (
        <GameBoard
          gameState={gameState}
          playerId={socket.id}
          onAction={handleAction}
        />
      )}

      {screen === 'results' && (
        <Results
          results={gameResults}
          gameState={gameState}
          playerId={socket.id}
        />
      )}
    </div>
  );
}

function LoginScreen({ onJoin }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim().length > 0) {
      onJoin(name.trim());
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 md:p-12 w-full max-w-md shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-2">
            🚂 Квиток на поїзд
          </h1>
          <p className="text-lg text-gray-300 font-semibold">Європа</p>
          <div className="mt-4 w-24 h-1 bg-gradient-to-r from-yellow-400 to-red-500 mx-auto rounded-full"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Ваше ім'я
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введіть ім'я..."
              maxLength={20}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={name.trim().length === 0}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl text-lg hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            Приєднатися до гри
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          2-4 гравці • Карта Європи • Тунелі, пороми, станції
        </div>
      </div>
    </div>
  );
}
