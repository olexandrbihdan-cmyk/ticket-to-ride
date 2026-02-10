import React, { useState, useMemo } from 'react';

const INITIAL_STATIONS = 3;
const STATION_COSTS = [1, 2, 3];

export default function StationDialog({ cityName, hand, stationsLeft, colorNames, colorHex, onBuild, onClose }) {
  const [selectedCards, setSelectedCards] = useState([]);

  const stationNumber = INITIAL_STATIONS - stationsLeft; // 0, 1, 2
  const cost = STATION_COSTS[stationNumber];

  const handGrouped = useMemo(() => {
    const groups = {};
    hand.forEach((card, idx) => {
      if (!groups[card]) groups[card] = [];
      groups[card].push(idx);
    });
    return groups;
  }, [hand]);

  const addCard = (color) => {
    if (selectedCards.length >= cost) return;

    // Перевірити що всі карти одного кольору (або локомотиви)
    const nonLocos = selectedCards.filter(sc => sc.color !== 'locomotive');
    const existingColor = nonLocos.length > 0 ? nonLocos[0].color : null;

    if (color !== 'locomotive' && existingColor && color !== existingColor) {
      return; // Не можна змішувати кольори
    }

    const usedIndices = selectedCards.map(sc => sc.index);
    const available = (handGrouped[color] || []).find(idx => !usedIndices.includes(idx));
    if (available !== undefined) {
      setSelectedCards([...selectedCards, { color, index: available }]);
    }
  };

  const resetSelection = () => setSelectedCards([]);

  const canBuild = selectedCards.length === cost;

  const handleBuild = () => {
    if (!canBuild) return;
    onBuild(cityName, selectedCards.map(sc => sc.color));
  };

  const allColors = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'orange', 'pink', 'locomotive'];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] border border-white/20 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">🏛️ Побудувати станцію</h2>
            <p className="text-sm text-gray-400">Місто: {cityName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <div className="bg-white/5 rounded-xl p-3 mb-4 text-sm text-gray-300">
          <p>Станція #{stationNumber + 1} з 3</p>
          <p>Вартість: <span className="font-bold text-yellow-400">{cost}</span> {cost === 1 ? 'карта' : 'карти'} одного кольору</p>
          <p className="text-xs text-gray-500 mt-1">
            Станція дозволяє використовувати один маршрут іншого гравця для виконання квитків.
          </p>
        </div>

        {/* Вибрані карти */}
        <div className="flex gap-1.5 justify-center mb-4 min-h-[48px]">
          {selectedCards.map((sc, idx) => (
            <div
              key={idx}
              className="w-10 h-14 rounded-lg border border-white/30 flex items-center justify-center text-xs font-bold"
              style={{
                backgroundColor: colorHex[sc.color],
                color: sc.color === 'white' || sc.color === 'yellow' ? '#000' : '#fff'
              }}
            >
              {sc.color === 'locomotive' ? '🚂' : (colorNames[sc.color] || '').substring(0, 3)}
            </div>
          ))}
          {Array.from({ length: cost - selectedCards.length }).map((_, idx) => (
            <div key={`e-${idx}`} className="w-10 h-14 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-gray-600 text-xs">
              ?
            </div>
          ))}
        </div>

        {/* Доступні карти */}
        <div className="flex gap-1.5 flex-wrap justify-center mb-4">
          {allColors.map(color => {
            const usedCount = selectedCards.filter(sc => sc.color === color).length;
            const totalCount = (handGrouped[color] || []).length;
            const availableCount = totalCount - usedCount;
            if (totalCount === 0) return null;

            // Перевірити чи можна додати цей колір
            const nonLocos = selectedCards.filter(sc => sc.color !== 'locomotive');
            const existingColor = nonLocos.length > 0 ? nonLocos[0].color : null;
            const disabled = availableCount <= 0 || selectedCards.length >= cost ||
              (color !== 'locomotive' && existingColor && color !== existingColor);

            return (
              <button
                key={color}
                onClick={() => addCard(color)}
                disabled={disabled}
                className="w-12 h-14 rounded-lg border-2 border-white/20 flex flex-col items-center justify-center text-xs font-bold disabled:opacity-30 hover:scale-105 transition-transform"
                style={{
                  backgroundColor: colorHex[color],
                  color: color === 'white' || color === 'yellow' ? '#000' : '#fff'
                }}
              >
                <span>{color === 'locomotive' ? '🚂' : (colorNames[color] || '').substring(0, 3)}</span>
                <span>{availableCount}</span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={resetSelection}
            className="py-2 px-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all text-sm"
          >
            Скинути
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-red-600/50 text-white font-semibold rounded-xl hover:bg-red-600/80 transition-all text-sm"
          >
            Скасувати
          </button>
          <button
            onClick={handleBuild}
            disabled={!canBuild}
            className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm shadow-lg"
          >
            Побудувати
          </button>
        </div>
      </div>
    </div>
  );
}
