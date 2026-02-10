import React, { useState } from 'react';

export default function TicketSelector({ tickets, isInitial, onChoose, onHighlight }) {
  const [selected, setSelected] = useState(new Set());
  const [hoveredTicket, setHoveredTicket] = useState(null);
  const minRequired = isInitial ? 2 : 1;

  const toggleTicket = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    if (selected.size >= minRequired) {
      onChoose([...selected]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] border border-white/20 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-1">
          🎫 {isInitial ? 'Оберіть початкові квитки' : 'Оберіть квитки'}
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Мінімум {minRequired} {minRequired === 1 ? 'квиток' : 'квитки'}. Обрані квитки стануть вашими завданнями.
        </p>

        <div className="space-y-2 mb-6 max-h-[50vh] overflow-y-auto">
          {tickets.map(ticket => (
            <button
              key={ticket.id}
              onClick={() => toggleTicket(ticket.id)}
              onMouseEnter={() => {
                setHoveredTicket(ticket.id);
                if (onHighlight) onHighlight([ticket.from, ticket.to]);
              }}
              onMouseLeave={() => {
                setHoveredTicket(null);
                if (onHighlight) onHighlight([]);
              }}
              onTouchStart={() => {
                if (onHighlight) onHighlight([ticket.from, ticket.to]);
              }}
              className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                selected.has(ticket.id)
                  ? 'border-yellow-400 bg-yellow-400/10 shadow-lg'
                  : hoveredTicket === ticket.id
                    ? 'border-cyan-400/50 bg-cyan-400/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-white text-sm">
                    {ticket.from} → {ticket.to}
                  </div>
                  {ticket.long && (
                    <span className="text-[10px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded-full">
                      Довгий маршрут
                    </span>
                  )}
                </div>
                <div className={`text-lg font-bold ${selected.has(ticket.id) ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {ticket.points}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          disabled={selected.size < minRequired}
          className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-bold rounded-xl text-lg hover:from-yellow-600 hover:to-orange-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
        >
          Підтвердити ({selected.size} обрано)
        </button>
      </div>
    </div>
  );
}
