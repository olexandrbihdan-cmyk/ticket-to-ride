import React from 'react';

export default function Results({ results, gameState, playerId }) {
  if (!results || results.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-white text-xl">Підрахунок результатів...</div>
      </div>
    );
  }

  const winner = results[0];
  const myResult = results.find(r => r.id === playerId);
  const isWinner = winner.id === playerId;

  return (
    <div className="h-full flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 md:p-8 w-full max-w-2xl shadow-2xl border border-white/20">
        {/* Заголовок */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-2">
            🏆 Гру завершено!
          </h1>
          <p className="text-lg text-gray-300">
            {isWinner ? '🎉 Вітаємо, ви перемогли!' : `Переможець: ${winner.name}`}
          </p>
        </div>

        {/* Таблиця результатів */}
        <div className="space-y-3 mb-6">
          {results.map((player, idx) => (
            <div
              key={player.id}
              className={`rounded-xl p-4 border-2 transition-all ${
                idx === 0
                  ? 'border-yellow-400 bg-yellow-400/10 shadow-lg'
                  : player.id === playerId
                    ? 'border-blue-400/50 bg-blue-400/5'
                    : 'border-white/10 bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl font-bold text-gray-400 w-8">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                </div>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: player.color }}
                >
                  {player.name[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white text-lg">
                    {player.name}
                    {player.id === playerId && <span className="text-yellow-400 text-sm ml-2">(Ви)</span>}
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400">
                    <span>🛤️ Маршрутів: {player.claimedRoutes}</span>
                    <span>🚃 Вагонів: {player.trains}</span>
                    <span>🏛️ Станцій: {player.stations}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-yellow-400">{player.points}</div>
                  <div className="text-xs text-gray-400">очок</div>
                </div>
              </div>

              {/* Бонуси */}
              {player.longestPathBonus && (
                <div className="mt-2 text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full inline-block">
                  🏅 Найдовший маршрут ({player.longestPath}) +10 очок
                </div>
              )}

              {/* Квитки */}
              {player.tickets && player.tickets.length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="text-xs text-gray-500 font-semibold">Квитки:</div>
                  {player.tickets.map(ticket => (
                    <div
                      key={ticket.id}
                      className={`flex justify-between items-center text-xs px-2 py-1 rounded ${
                        ticket.completed
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      <span>
                        {ticket.completed ? '✅' : '❌'} {ticket.from} → {ticket.to}
                      </span>
                      <span className="font-bold">
                        {ticket.completed ? '+' : '-'}{ticket.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Кнопка нової гри */}
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl text-lg hover:from-orange-600 hover:to-red-700 transition-all shadow-lg"
        >
          🔄 Нова гра
        </button>
      </div>
    </div>
  );
}
