import React, { useState, useMemo, useCallback } from 'react';
import GameMap from './GameMap';
import PlayerHand from './PlayerHand';
import TicketSelector from './TicketSelector';
import TunnelChallenge from './TunnelChallenge';
import RouteClaimDialog from './RouteClaimDialog';
import StationDialog from './StationDialog';
import PlayerInfo from './PlayerInfo';

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

const CARD_COLORS_HEX = {
  red: '#DC2626',
  blue: '#2563EB',
  green: '#16A34A',
  yellow: '#EAB308',
  black: '#1F2937',
  white: '#E5E7EB',
  orange: '#EA580C',
  pink: '#EC4899',
  locomotive: '#8B5CF6'
};

export default function GameBoard({ gameState, playerId, onAction }) {
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showStationDialog, setShowStationDialog] = useState(false);
  const [stationCity, setStationCity] = useState(null);
  const [tunnelData, setTunnelData] = useState(null);
  const [showTickets, setShowTickets] = useState(false);
  const [highlightedCities, setHighlightedCities] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState(null);

  const myPlayer = useMemo(() =>
    gameState.players.find(p => p.id === playerId),
    [gameState, playerId]
  );

  const isMyTurn = gameState.currentPlayerId === playerId;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  // Обробка вибору маршруту на карті
  const handleRouteClick = useCallback((route) => {
    if (!isMyTurn) return;
    if (gameState.actionInProgress) return;
    if (route.claimed) return;
    setSelectedRoute(route);
  }, [isMyTurn, gameState.actionInProgress]);

  // Зайняти маршрут
  const handleClaimRoute = useCallback((routeId, cardsToUse) => {
    onAction('claim_route', { routeId, cardsToUse });
    setSelectedRoute(null);
  }, [onAction]);

  // Взяти карту з відкритих
  const handleDrawFaceUp = useCallback((index) => {
    onAction('draw_face_up', { index });
  }, [onAction]);

  // Взяти карту з колоди
  const handleDrawDeck = useCallback(() => {
    onAction('draw_from_deck');
  }, [onAction]);

  // Взяти квитки
  const handleDrawTickets = useCallback(() => {
    onAction('draw_tickets');
  }, [onAction]);

  // Обрати квитки
  const handleChooseTickets = useCallback((selectedIds) => {
    if (myPlayer?.ticketChoiceType === 'initial') {
      onAction('choose_initial_tickets', { selectedIds });
    } else {
      onAction('choose_tickets', { selectedIds });
    }
  }, [onAction, myPlayer]);

  // Відповідь на тунель
  const handleTunnelResponse = useCallback((accept, extraCards) => {
    onAction('tunnel_response', { accept, extraCards });
    setTunnelData(null);
  }, [onAction]);

  // Побудувати станцію
  const handleBuildStation = useCallback((cityName, cardsToUse) => {
    onAction('build_station', { cityName, cardsToUse });
    setShowStationDialog(false);
    setStationCity(null);
  }, [onAction]);

  // Клік на місто для станції
  const handleCityClickForStation = useCallback((cityName) => {
    if (!isMyTurn) return;
    if (gameState.actionInProgress) return;
    if (myPlayer.stations <= 0) return;
    setStationCity(cityName);
    setShowStationDialog(true);
  }, [isMyTurn, gameState.actionInProgress, myPlayer]);

  // Показати квитки
  const hasPendingTickets = myPlayer?.pendingTickets && myPlayer.pendingTickets.length > 0;

  // Статус гри
  const getPhaseText = () => {
    if (gameState.phase === 'initial_tickets') return 'Оберіть початкові квитки';
    if (gameState.phase === 'last_round') return '⚠️ Останній раунд!';
    if (isMyTurn) return 'Ваш хід!';
    return `Хід: ${currentPlayer?.name}`;
  };

  const getActionText = () => {
    if (gameState.actionInProgress === 'drew_one_card') return 'Візьміть ще одну карту';
    if (gameState.actionInProgress === 'drawing_tickets') return 'Оберіть квитки';
    if (gameState.actionInProgress === 'tunnel_pending') return 'Вирішіть щодо тунелю';
    return '';
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Верхня панель */}
      <div className="flex-shrink-0 bg-black/40 backdrop-blur-sm border-b border-white/10 px-2 md:px-4 py-2">
        <div className="flex items-center justify-between gap-2">
          {/* Інфо гравців */}
          <div className="flex items-center gap-1 md:gap-2 overflow-x-auto flex-shrink min-w-0">
            {gameState.players.map((p, idx) => (
              <PlayerInfo
                key={p.id}
                player={p}
                isCurrentTurn={idx === gameState.currentPlayerIndex}
                isMe={p.id === playerId}
              />
            ))}
          </div>

          {/* Статус */}
          <div className="flex-shrink-0 text-right">
            <div className={`text-sm font-bold ${isMyTurn ? 'text-yellow-400' : 'text-gray-300'}`}>
              {getPhaseText()}
            </div>
            {getActionText() && (
              <div className="text-xs text-orange-400">{getActionText()}</div>
            )}
          </div>
        </div>
      </div>

      {/* Основна область */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Карта */}
        <div className="flex-1 relative overflow-hidden">
          <GameMap
            gameState={gameState}
            playerId={playerId}
            onRouteClick={handleRouteClick}
            onCityClick={handleCityClickForStation}
            highlightedCities={highlightedCities}
          />
        </div>

        {/* Бічна панель - карти та дії */}
        <div className="flex-shrink-0 w-full md:w-72 lg:w-80 bg-black/30 backdrop-blur-sm border-t md:border-t-0 md:border-l border-white/10 flex flex-col overflow-hidden">
          {/* Відкриті карти */}
          <div className="p-2 md:p-3 border-b border-white/10">
            <div className="text-xs font-semibold text-gray-400 mb-2">ВІДКРИТІ КАРТИ</div>
            <div className="flex gap-1.5 justify-center">
              {gameState.faceUpCards.map((card, idx) => (
                <button
                  key={idx}
                  onClick={() => handleDrawFaceUp(idx)}
                  disabled={!isMyTurn || hasPendingTickets || (gameState.actionInProgress === 'drew_one_card' && card === 'locomotive')}
                  className="train-card w-12 h-16 md:w-14 md:h-20 rounded-lg border-2 border-white/20 flex items-center justify-center text-xs font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: CARD_COLORS_HEX[card] || '#8B5CF6',
                    color: card === 'white' || card === 'yellow' ? '#000' : '#fff'
                  }}
                  title={COLOR_NAMES_UK[card]}
                >
                  {card === 'locomotive' ? '🚂' : COLOR_NAMES_UK[card]?.substring(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Кнопки дій */}
          <div className="p-2 md:p-3 border-b border-white/10 space-y-1.5">
            <button
              onClick={handleDrawDeck}
              disabled={!isMyTurn || hasPendingTickets || gameState.drawPileCount === 0}
              className="w-full py-2 bg-indigo-600/50 hover:bg-indigo-600/80 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>🃏</span>
              <span>Взяти з колоди ({gameState.drawPileCount})</span>
            </button>

            <button
              onClick={handleDrawTickets}
              disabled={!isMyTurn || hasPendingTickets || gameState.actionInProgress || gameState.ticketDeckCount === 0}
              className="w-full py-2 bg-amber-600/50 hover:bg-amber-600/80 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>🎫</span>
              <span>Взяти квитки ({gameState.ticketDeckCount})</span>
            </button>

            <button
              onClick={() => setShowTickets(!showTickets)}
              className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <span>📋</span>
              <span>Мої квитки ({myPlayer?.tickets?.length || 0})</span>
            </button>
          </div>

          {/* Мої квитки */}
          {showTickets && myPlayer?.tickets && (
            <div className="p-2 md:p-3 border-b border-white/10 overflow-y-auto max-h-40">
              <div className="space-y-1">
                {myPlayer.tickets.map(ticket => (
                  <button
                    key={ticket.id}
                    onClick={() => {
                      if (activeTicketId === ticket.id) {
                        setActiveTicketId(null);
                        setHighlightedCities([]);
                      } else {
                        setActiveTicketId(ticket.id);
                        setHighlightedCities([ticket.from, ticket.to]);
                      }
                    }}
                    className={`w-full text-left rounded-lg px-2 py-1.5 text-xs transition-all ${
                      activeTicketId === ticket.id
                        ? 'bg-yellow-400/20 ring-1 ring-yellow-400'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-gray-200">{ticket.from} → {ticket.to}</span>
                      <span className="font-bold text-yellow-400">{ticket.points}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Рука гравця */}
          <div className="flex-1 overflow-y-auto p-2 md:p-3">
            <PlayerHand
              hand={myPlayer?.hand || []}
              colorNames={COLOR_NAMES_UK}
              colorHex={CARD_COLORS_HEX}
            />
          </div>

          {/* Інфо внизу */}
          <div className="flex-shrink-0 p-2 border-t border-white/10 bg-black/20">
            <div className="flex justify-between text-xs text-gray-400">
              <span>🚃 Вагони: {myPlayer?.trains}</span>
              <span>🏛️ Станції: {myPlayer?.stations}</span>
              <span>⭐ Очки: {myPlayer?.points}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Модальні вікна */}
      {hasPendingTickets && (
        <TicketSelector
          tickets={myPlayer.pendingTickets}
          isInitial={myPlayer.ticketChoiceType === 'initial'}
          onChoose={handleChooseTickets}
          onHighlight={(cities) => setHighlightedCities(cities)}
        />
      )}

      {selectedRoute && (
        <RouteClaimDialog
          route={selectedRoute}
          hand={myPlayer?.hand || []}
          colorNames={COLOR_NAMES_UK}
          colorHex={CARD_COLORS_HEX}
          onClaim={handleClaimRoute}
          onClose={() => setSelectedRoute(null)}
        />
      )}

      {showStationDialog && stationCity && (
        <StationDialog
          cityName={stationCity}
          hand={myPlayer?.hand || []}
          stationsLeft={myPlayer?.stations || 0}
          colorNames={COLOR_NAMES_UK}
          colorHex={CARD_COLORS_HEX}
          onBuild={handleBuildStation}
          onClose={() => { setShowStationDialog(false); setStationCity(null); }}
        />
      )}

      {tunnelData && (
        <TunnelChallenge
          tunnelCards={tunnelData.tunnelCards}
          extraNeeded={tunnelData.extraNeeded}
          hand={myPlayer?.hand || []}
          colorNames={COLOR_NAMES_UK}
          colorHex={CARD_COLORS_HEX}
          onRespond={handleTunnelResponse}
        />
      )}
    </div>
  );
}
