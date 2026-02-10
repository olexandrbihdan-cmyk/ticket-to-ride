import React, { useState, useRef, useEffect, useCallback } from 'react';

const CARD_COLORS_HEX = {
  red: '#DC2626',
  blue: '#2563EB',
  green: '#16A34A',
  yellow: '#EAB308',
  black: '#1F2937',
  white: '#E5E7EB',
  orange: '#EA580C',
  pink: '#EC4899',
  any: '#9CA3AF',
  locomotive: '#8B5CF6'
};

export default function GameMap({ gameState, playerId, onRouteClick, onCityClick, highlightedCities = [] }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1000, h: 650 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [tooltip, setTooltip] = useState(null);

  const cities = gameState.cities;
  const routes = gameState.routes;
  const isMyTurn = gameState.currentPlayerId === playerId;

  // Zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox(prev => {
      const newW = Math.max(300, Math.min(1000, prev.w * scale));
      const newH = Math.max(195, Math.min(650, prev.h * scale));
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      return {
        x: Math.max(0, Math.min(900, cx - newW / 2)),
        y: Math.max(0, Math.min(600, cy - newH / 2)),
        w: newW,
        h: newH
      };
    });
  }, []);

  // Pan
  const handleMouseDown = useCallback((e) => {
    if (e.target.tagName === 'circle' || e.target.tagName === 'line' || e.target.tagName === 'rect') return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    const dx = (e.clientX - panStart.x) * (viewBox.w / (containerRef.current?.clientWidth || 1000));
    const dy = (e.clientY - panStart.y) * (viewBox.h / (containerRef.current?.clientHeight || 650));
    setViewBox(prev => ({
      ...prev,
      x: Math.max(-100, Math.min(900, prev.x - dx)),
      y: Math.max(-100, Math.min(600, prev.y - dy))
    }));
    setPanStart({ x: e.clientX, y: e.clientY });
  }, [isPanning, panStart, viewBox]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Touch support
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isPanning || e.touches.length !== 1) return;
    const dx = (e.touches[0].clientX - panStart.x) * (viewBox.w / (containerRef.current?.clientWidth || 1000));
    const dy = (e.touches[0].clientY - panStart.y) * (viewBox.h / (containerRef.current?.clientHeight || 650));
    setViewBox(prev => ({
      ...prev,
      x: Math.max(-100, Math.min(900, prev.x - dx)),
      y: Math.max(-100, Math.min(600, prev.y - dy))
    }));
    setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  }, [isPanning, panStart, viewBox]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Малювання маршруту між двома містами
  const renderRoute = (route) => {
    const cityFrom = cities[route.from];
    const cityTo = cities[route.to];
    if (!cityFrom || !cityTo) return null;

    const claimed = route.claimed;
    const claimedByMe = claimed && claimed.playerId === playerId;
    const claimedPlayer = claimed ? gameState.players.find(p => p.id === claimed.playerId) : null;

    // Зсув для подвійних маршрутів
    let offsetX = 0, offsetY = 0;
    if (route.double) {
      const dx = cityTo.x - cityFrom.x;
      const dy = cityTo.y - cityFrom.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      offsetX = (-dy / len) * 5;
      offsetY = (dx / len) * 5;
    }

    const x1 = cityFrom.x + offsetX;
    const y1 = cityFrom.y + offsetY;
    const x2 = cityTo.x + offsetX;
    const y2 = cityTo.y + offsetY;

    let strokeColor = CARD_COLORS_HEX[route.color] || '#9CA3AF';
    let strokeWidth = 3;
    let opacity = 0.6;
    let dashArray = '';

    if (claimed) {
      strokeColor = claimedPlayer?.color || '#fff';
      strokeWidth = 5;
      opacity = 0.9;
    } else {
      if (route.type === 'tunnel') dashArray = '6,3';
      if (route.type === 'ferry') dashArray = '2,4';
    }

    const canClaim = isMyTurn && !claimed && !gameState.actionInProgress;

    return (
      <g key={`route-${route.id}`}>
        {/* Невидима широка лінія для кліку */}
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="transparent"
          strokeWidth={12}
          style={{ cursor: canClaim ? 'pointer' : 'default' }}
          onClick={() => canClaim && onRouteClick(route)}
          onMouseEnter={(e) => {
            const rect = containerRef.current.getBoundingClientRect();
            setTooltip({
              text: `${route.from} → ${route.to} (${route.length}) ${route.type === 'tunnel' ? '🏔️' : ''} ${route.type === 'ferry' ? '⛴️' : ''}`,
              x: e.clientX - rect.left,
              y: e.clientY - rect.top - 30
            });
          }}
          onMouseLeave={() => setTooltip(null)}
        />
        {/* Видима лінія */}
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={opacity}
          strokeDasharray={dashArray}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
        {/* Довжина маршруту */}
        {!claimed && (
          <text
            x={(x1 + x2) / 2}
            y={(y1 + y2) / 2 - 6}
            textAnchor="middle"
            fill="#fff"
            fontSize="8"
            fontWeight="bold"
            style={{ pointerEvents: 'none' }}
          >
            {route.length}
          </text>
        )}
      </g>
    );
  };

  // Малювання міста
  const renderCity = (name, city) => {
    // Перевірити чи є станція в місті
    const stationOwner = gameState.players.find(p =>
      p.stationCities && p.stationCities.includes(name)
    );

    const isHighlighted = highlightedCities.includes(name);

    return (
      <g key={`city-${name}`}>
        {/* Підсвічування міста */}
        {isHighlighted && (
          <>
            <circle
              cx={city.x}
              cy={city.y}
              r={18}
              fill="none"
              stroke="#FBBF24"
              strokeWidth={2.5}
              opacity={0.9}
            >
              <animate attributeName="r" values="14;20;14" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle
              cx={city.x}
              cy={city.y}
              r={10}
              fill="#FBBF24"
              opacity={0.25}
            />
          </>
        )}
        {/* Станція */}
        {stationOwner && (
          <rect
            x={city.x - 7}
            y={city.y - 7}
            width={14}
            height={14}
            fill={stationOwner.color}
            stroke="#fff"
            strokeWidth={1.5}
            rx={2}
            opacity={0.8}
          />
        )}
        {/* Точка міста */}
        <circle
          cx={city.x}
          cy={city.y}
          r={isHighlighted ? 7 : 5}
          fill={isHighlighted ? '#FBBF24' : '#fff'}
          stroke={isHighlighted ? '#F59E0B' : '#333'}
          strokeWidth={isHighlighted ? 2 : 1.5}
          className="city-dot"
          onClick={() => onCityClick(name)}
          onMouseEnter={(e) => {
            const rect = containerRef.current.getBoundingClientRect();
            setTooltip({
              text: name,
              x: e.clientX - rect.left,
              y: e.clientY - rect.top - 30
            });
          }}
          onMouseLeave={() => setTooltip(null)}
        />
        {/* Назва міста */}
        <text
          x={city.x}
          y={city.y - (isHighlighted ? 12 : 9)}
          textAnchor="middle"
          fill={isHighlighted ? '#FBBF24' : '#e0e0e0'}
          fontSize={isHighlighted ? '9' : '7'}
          fontWeight={isHighlighted ? '800' : '600'}
          style={{ pointerEvents: 'none', textShadow: isHighlighted ? '0 0 6px rgba(251,191,36,0.6)' : '0 0 3px rgba(0,0,0,0.8)' }}
        >
          {name}
        </text>
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative select-none"
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Фон карти */}
        <defs>
          <radialGradient id="mapBg" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#0d1b2a" />
          </radialGradient>
        </defs>
        <rect x="-100" y="-100" width="1200" height="850" fill="url(#mapBg)" />

        {/* Фонове зображення карти */}
        <image
          href="/map-bg.jpg"
          x="0"
          y="0"
          width="1000"
          height="666"
          preserveAspectRatio="xMidYMid meet"
          opacity="0.9"
        />

        {/* Маршрути */}
        {routes.map(route => renderRoute(route))}

        {/* Міста */}
        {Object.entries(cities).map(([name, city]) => renderCity(name, city))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button
          onClick={() => setViewBox(prev => ({
            ...prev,
            w: Math.max(300, prev.w * 0.8),
            h: Math.max(195, prev.h * 0.8)
          }))}
          className="w-8 h-8 bg-black/50 text-white rounded-lg flex items-center justify-center hover:bg-black/70 text-lg"
        >
          +
        </button>
        <button
          onClick={() => setViewBox(prev => ({
            ...prev,
            w: Math.min(1000, prev.w * 1.2),
            h: Math.min(650, prev.h * 1.2)
          }))}
          className="w-8 h-8 bg-black/50 text-white rounded-lg flex items-center justify-center hover:bg-black/70 text-lg"
        >
          −
        </button>
        <button
          onClick={() => setViewBox({ x: 0, y: 0, w: 1000, h: 650 })}
          className="w-8 h-8 bg-black/50 text-white rounded-lg flex items-center justify-center hover:bg-black/70 text-xs"
        >
          ⟲
        </button>
      </div>
    </div>
  );
}
