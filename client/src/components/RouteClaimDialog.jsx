import React, { useState, useMemo } from 'react';

const COLOR_NAMES_UK = {
  red: 'Червоний',
  blue: 'Синій',
  green: 'Зелений',
  yellow: 'Жовтий',
  black: 'Чорний',
  white: 'Білий',
  orange: 'Помаранчевий',
  pink: 'Рожевий',
  locomotive: 'Локомотив',
  any: 'Будь-який'
};

export default function RouteClaimDialog({ route, hand, colorNames, colorHex, onClaim, onClose }) {
  const [selectedCards, setSelectedCards] = useState([]);

  // Визначити які кольори підходять для маршруту
  const validColors = useMemo(() => {
    if (route.color === 'any') {
      return ['red', 'blue', 'green', 'yellow', 'black', 'white', 'orange', 'pink'];
    }
    return [route.color];
  }, [route]);

  // Групуємо карти в руці
  const handGrouped = useMemo(() => {
    const groups = {};
    hand.forEach((card, idx) => {
      if (!groups[card]) groups[card] = [];
      groups[card].push(idx);
    });
    return groups;
  }, [hand]);

  // Додати карту до вибраних
  const addCard = (color) => {
    if (selectedCards.length >= route.length) return;

    // Знайти індекс невибраної карти цього кольору
    const usedIndices = selectedCards.map(sc => sc.index);
    const available = (handGrouped[color] || []).find(idx => !usedIndices.includes(idx));
    if (available !== undefined) {
      setSelectedCards([...selectedCards, { color, index: available }]);
    }
  };

  // Видалити останню карту
  const removeLastCard = () => {
    setSelectedCards(selectedCards.slice(0, -1));
  };

  // Скинути вибір
  const resetSelection = () => {
    setSelectedCards([]);
  };

  // Перевірити чи можна зайняти
  const canClaim = selectedCards.length === route.length;

  // Автовибір карт
  const autoSelect = (color) => {
    const usedIndices = [];
    const cards = [];

    // Спочатку карти потрібного кольору
    for (const idx of (handGrouped[color] || [])) {
      if (cards.length >= route.length) break;
      cards.push({ color, index: idx });
      usedIndices.push(idx);
    }

    // Потім локомотиви
    for (const idx of (handGrouped['locomotive'] || [])) {
      if (cards.length >= route.length) break;
      if (!usedIndices.includes(idx)) {
        cards.push({ color: 'locomotive', index: idx });
        usedIndices.push(idx);
      }
    }

    if (cards.length === route.length) {
      setSelectedCards(cards);
    }
  };

  const handleClaim = () => {
    if (!canClaim) return;
    const cardsToUse = selectedCards.map(sc => sc.color);
    onClaim(route.id, cardsToUse);
  };

  const typeLabel = route.type === 'tunnel' ? '🏔️ Тунель' : route.type === 'ferry' ? '⛴️ Пором' : '🛤️ Звичайний';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] border border-white/20 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              {route.from} → {route.to}
            </h2>
            <div className="flex gap-2 text-xs text-gray-400 mt-1">
              <span>Довжина: {route.length}</span>
              <span>{typeLabel}</span>
              <span>Колір: {COLOR_NAMES_UK[route.color]}</span>
              {route.ferryCount > 0 && <span>🚂 Потрібно: {route.ferryCount}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* Вибрані карти */}
        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-2">
            Обрано: {selectedCards.length}/{route.length}
          </div>
          <div className="flex gap-1.5 flex-wrap min-h-[48px] bg-white/5 rounded-xl p-2">
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
            {Array.from({ length: route.length - selectedCards.length }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="w-10 h-14 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-gray-600 text-xs"
              >
                ?
              </div>
            ))}
          </div>
        </div>

        {/* Доступні карти */}
        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-2">Ваші карти (натисніть для вибору):</div>
          <div className="flex gap-1.5 flex-wrap">
            {/* Кольорові карти */}
            {validColors.map(color => {
              const usedCount = selectedCards.filter(sc => sc.color === color).length;
              const totalCount = (handGrouped[color] || []).length;
              const availableCount = totalCount - usedCount;
              if (totalCount === 0) return null;

              return (
                <button
                  key={color}
                  onClick={() => addCard(color)}
                  disabled={availableCount <= 0 || selectedCards.length >= route.length}
                  className="relative w-14 h-16 rounded-lg border-2 border-white/20 flex flex-col items-center justify-center text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                  style={{
                    backgroundColor: colorHex[color],
                    color: color === 'white' || color === 'yellow' ? '#000' : '#fff'
                  }}
                >
                  <span>{colorNames[color]?.substring(0, 4)}</span>
                  <span className="text-lg">{availableCount}</span>
                </button>
              );
            })}

            {/* Локомотиви */}
            {(handGrouped['locomotive'] || []).length > 0 && (
              <button
                onClick={() => addCard('locomotive')}
                disabled={
                  selectedCards.filter(sc => sc.color === 'locomotive').length >= (handGrouped['locomotive'] || []).length ||
                  selectedCards.length >= route.length
                }
                className="relative w-14 h-16 rounded-lg border-2 border-white/20 flex flex-col items-center justify-center text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                style={{ backgroundColor: colorHex['locomotive'], color: '#fff' }}
              >
                <span>🚂</span>
                <span className="text-lg">
                  {(handGrouped['locomotive'] || []).length - selectedCards.filter(sc => sc.color === 'locomotive').length}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Швидкий вибір */}
        {route.color === 'any' && (
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-1">Швидкий вибір:</div>
            <div className="flex gap-1 flex-wrap">
              {validColors.filter(c => (handGrouped[c] || []).length > 0).map(color => (
                <button
                  key={`auto-${color}`}
                  onClick={() => autoSelect(color)}
                  className="px-2 py-1 text-[10px] rounded-md border border-white/20 hover:bg-white/10 transition-all"
                  style={{ color: colorHex[color] }}
                >
                  {colorNames[color]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Кнопки */}
        <div className="flex gap-2">
          <button
            onClick={resetSelection}
            className="flex-1 py-2 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all text-sm"
          >
            Скинути
          </button>
          <button
            onClick={removeLastCard}
            disabled={selectedCards.length === 0}
            className="py-2 px-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all text-sm disabled:opacity-30"
          >
            ↩
          </button>
          <button
            onClick={handleClaim}
            disabled={!canClaim}
            className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm shadow-lg"
          >
            Зайняти маршрут
          </button>
        </div>
      </div>
    </div>
  );
}
