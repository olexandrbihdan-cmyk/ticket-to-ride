import React, { useState, useMemo } from 'react';

export default function TunnelChallenge({ tunnelCards, extraNeeded, hand, cardColor, colorNames, colorHex, onRespond }) {
  const [extraSelected, setExtraSelected] = useState([]);

  const handGrouped = useMemo(() => {
    const groups = {};
    hand.forEach((card, idx) => {
      if (!groups[card]) groups[card] = [];
      groups[card].push(idx);
    });
    return groups;
  }, [hand]);

  // Визначити які карти можна використати як додаткові
  const validExtraCards = useMemo(() => {
    const valid = [];
    if (cardColor && cardColor !== 'locomotive') {
      valid.push(cardColor);
    }
    valid.push('locomotive');
    return valid;
  }, [cardColor]);

  const addExtra = (color) => {
    if (extraSelected.length >= extraNeeded) return;
    const usedIndices = extraSelected.map(e => e.index);
    const available = (handGrouped[color] || []).find(idx => !usedIndices.includes(idx));
    if (available !== undefined) {
      setExtraSelected([...extraSelected, { color, index: available }]);
    }
  };

  const canAccept = extraSelected.length >= extraNeeded;

  // Перевірити чи гравець взагалі може заплатити
  const totalAvailable = validExtraCards.reduce((sum, color) => {
    return sum + (handGrouped[color] || []).length;
  }, 0);
  const canAfford = totalAvailable >= extraNeeded;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a2e] border border-white/20 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-2">🏔️ Тунель!</h2>
        <p className="text-sm text-gray-400 mb-4">
          Відкриті карти з колоди:
        </p>

        {/* Відкриті карти тунелю */}
        <div className="flex gap-2 justify-center mb-4">
          {tunnelCards.map((card, idx) => (
            <div
              key={idx}
              className="w-14 h-20 rounded-lg border-2 border-white/30 flex items-center justify-center text-xs font-bold shadow-lg"
              style={{
                backgroundColor: colorHex[card] || '#8B5CF6',
                color: card === 'white' || card === 'yellow' ? '#000' : '#fff'
              }}
            >
              {card === 'locomotive' ? '🚂' : (colorNames[card] || card).substring(0, 4)}
            </div>
          ))}
        </div>

        <div className={`text-center mb-4 font-semibold ${extraNeeded > 0 ? 'text-red-400' : 'text-green-400'}`}>
          {extraNeeded > 0
            ? `Потрібно додатково ${extraNeeded} карт!`
            : 'Тунель пройдено без додаткових карт!'
          }
        </div>

        {extraNeeded > 0 && canAfford && (
          <>
            <div className="text-xs text-gray-400 mb-2">
              Оберіть {extraNeeded} додаткових карт:
            </div>
            <div className="flex gap-2 justify-center mb-4">
              {validExtraCards.map(color => {
                const usedCount = extraSelected.filter(e => e.color === color).length;
                const totalCount = (handGrouped[color] || []).length;
                const availableCount = totalCount - usedCount;
                if (totalCount === 0) return null;

                return (
                  <button
                    key={color}
                    onClick={() => addExtra(color)}
                    disabled={availableCount <= 0 || extraSelected.length >= extraNeeded}
                    className="w-14 h-16 rounded-lg border-2 border-white/20 flex flex-col items-center justify-center text-xs font-bold disabled:opacity-30 hover:scale-105 transition-transform"
                    style={{
                      backgroundColor: colorHex[color],
                      color: color === 'white' || color === 'yellow' ? '#000' : '#fff'
                    }}
                  >
                    <span>{color === 'locomotive' ? '🚂' : (colorNames[color] || '').substring(0, 4)}</span>
                    <span>{availableCount}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onRespond(false, [])}
            className="flex-1 py-3 bg-red-600/50 hover:bg-red-600/80 text-white font-bold rounded-xl transition-all"
          >
            Відмовитись
          </button>
          {canAfford && extraNeeded > 0 && (
            <button
              onClick={() => onRespond(true, extraSelected.map(e => e.color))}
              disabled={!canAccept}
              className="flex-1 py-3 bg-green-600/50 hover:bg-green-600/80 text-white font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Заплатити
            </button>
          )}
        </div>

        {!canAfford && extraNeeded > 0 && (
          <p className="text-center text-red-400 text-xs mt-2">
            У вас недостатньо карт. Ви можете лише відмовитись.
          </p>
        )}
      </div>
    </div>
  );
}
