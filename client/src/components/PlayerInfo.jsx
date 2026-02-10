import React from 'react';

export default function PlayerInfo({ player, isCurrentTurn, isMe }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs transition-all ${
        isCurrentTurn
          ? 'bg-white/15 ring-2 ring-yellow-400/60 shadow-lg'
          : 'bg-white/5'
      } ${isMe ? 'border border-white/20' : ''}`}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
        style={{ backgroundColor: player.color }}
      >
        {player.name[0].toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-white truncate max-w-[60px] md:max-w-[80px]">
          {player.name}
          {isMe && <span className="text-yellow-400 ml-0.5">(Я)</span>}
        </div>
        <div className="flex gap-1.5 text-gray-400 text-[10px]">
          <span>🃏{player.handCount}</span>
          <span>🚃{player.trains}</span>
          <span>🏛️{player.stations}</span>
          <span className="text-yellow-400">⭐{player.points}</span>
        </div>
      </div>
      {isCurrentTurn && (
        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse flex-shrink-0"></div>
      )}
    </div>
  );
}
