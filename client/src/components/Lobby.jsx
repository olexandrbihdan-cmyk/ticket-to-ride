import React from 'react';

export default function Lobby({ gameState, playerId, onStart }) {
  const players = gameState.players || [];
  const isHost = players.length > 0 && players[0].id === playerId;
  const canStart = players.length >= 2;

  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 md:p-12 w-full max-w-lg shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-2">
            🚂 Очікування гравців
          </h1>
          <p className="text-gray-400 text-sm">
            Гра #{gameState.gameId}
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {players.map((player, idx) => (
            <div
              key={player.id}
              className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                style={{ backgroundColor: player.color }}
              >
                {player.name[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white">
                  {player.name}
                  {player.id === playerId && (
                    <span className="ml-2 text-xs text-yellow-400">(Ви)</span>
                  )}
                </div>
                <div className="text-xs text-gray-400">{player.colorName}</div>
              </div>
              {idx === 0 && (
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full">
                  Хост
                </span>
              )}
            </div>
          ))}

          {Array.from({ length: 4 - players.length }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-dashed border-white/10 opacity-40"
            >
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-500">
                ?
              </div>
              <div className="text-gray-500 text-sm">Очікування гравця...</div>
            </div>
          ))}
        </div>

        <div className="text-center text-sm text-gray-400 mb-4">
          {players.length}/4 гравців • Потрібно мінімум 2
        </div>

        {isHost && (
          <button
            onClick={onStart}
            disabled={!canStart}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl text-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {canStart ? 'Почати гру!' : 'Чекаємо ще гравців...'}
          </button>
        )}

        {!isHost && (
          <div className="text-center text-gray-400 text-sm">
            Очікуйте, поки хост почне гру...
          </div>
        )}
      </div>
    </div>
  );
}
