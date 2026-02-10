import React, { useMemo } from 'react';

export default function PlayerHand({ hand, colorNames, colorHex }) {
  // Групуємо карти за кольором
  const grouped = useMemo(() => {
    const groups = {};
    for (const card of hand) {
      groups[card] = (groups[card] || 0) + 1;
    }
    // Сортуємо: спочатку кольорові, потім локомотиви
    const order = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'orange', 'pink', 'locomotive'];
    return order
      .filter(c => groups[c])
      .map(c => ({ color: c, count: groups[c] }));
  }, [hand]);

  return (
    <div>
      <div className="text-xs font-semibold text-gray-400 mb-2">
        МОЇ КАРТИ ({hand.length})
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {grouped.map(({ color, count }) => (
          <div
            key={color}
            className="relative rounded-lg border-2 border-white/20 p-2 text-center shadow-md"
            style={{
              backgroundColor: colorHex[color] || '#8B5CF6',
              color: color === 'white' || color === 'yellow' ? '#000' : '#fff'
            }}
          >
            <div className="text-lg font-bold">
              {color === 'locomotive' ? '🚂' : ''}
              {count}
            </div>
            <div className="text-[10px] font-semibold opacity-80">
              {colorNames[color] || color}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="col-span-3 text-center text-gray-500 text-sm py-4">
            Немає карт
          </div>
        )}
      </div>
    </div>
  );
}
