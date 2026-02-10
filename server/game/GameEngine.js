const cities = require('../data/cities');
const routes = require('../data/routes');
const { normalTickets, longTickets } = require('../data/tickets');

// Очки за довжину маршруту
const ROUTE_POINTS = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 10,
  6: 15,
  8: 21
};

const CARD_COLORS = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'orange', 'pink'];
const LOCOMOTIVE = 'locomotive';
const INITIAL_TRAINS = 45;
const INITIAL_STATIONS = 3;
const STATION_COSTS = [1, 2, 3]; // вартість 1-ї, 2-ї, 3-ї станції

class GameEngine {
  constructor(gameId) {
    this.gameId = gameId;
    this.players = [];
    this.currentPlayerIndex = 0;
    this.phase = 'waiting'; // waiting, initial_tickets, playing, last_round, finished
    this.drawPile = [];
    this.discardPile = [];
    this.faceUpCards = [];
    this.ticketDeck = [];
    this.longTicketDeck = [];
    this.claimedRoutes = []; // { routeId, playerId }
    this.lastRoundStartedBy = null;
    this.turnNumber = 0;
    this.actionInProgress = null; // для відстеження дій гравця під час ходу
  }

  // Додати гравця
  addPlayer(playerId, playerName) {
    if (this.players.length >= 4) return { error: 'Гра вже повна (максимум 4 гравці)' };
    if (this.phase !== 'waiting') return { error: 'Гра вже почалася' };

    const colors = ['#DC2626', '#2563EB', '#16A34A', '#EAB308'];
    const colorNames = ['Червоний', 'Синій', 'Зелений', 'Жовтий'];
    const idx = this.players.length;

    this.players.push({
      id: playerId,
      name: playerName,
      color: colors[idx],
      colorName: colorNames[idx],
      hand: [],
      tickets: [],
      trains: INITIAL_TRAINS,
      stations: INITIAL_STATIONS,
      points: 0,
      claimedRoutes: [],
      pendingTickets: null,
      ticketChoiceType: null
    });

    return { success: true, playerIndex: idx };
  }

  // Видалити гравця
  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
  }

  // Почати гру
  startGame() {
    if (this.players.length < 2) return { error: 'Потрібно мінімум 2 гравці' };
    if (this.phase !== 'waiting') return { error: 'Гра вже почалася' };

    // Створити колоду карт вагонів
    this.createDrawPile();
    this.shuffleArray(this.drawPile);

    // Роздати по 4 карти кожному гравцю
    for (const player of this.players) {
      for (let i = 0; i < 4; i++) {
        player.hand.push(this.drawCard());
      }
    }

    // Відкрити 5 карт
    this.refillFaceUpCards();

    // Підготувати квитки
    this.ticketDeck = this.shuffleArray([...normalTickets]);
    this.longTicketDeck = this.shuffleArray([...longTickets]);

    // Фаза вибору початкових квитків
    this.phase = 'initial_tickets';

    // Кожен гравець отримує 1 довгий + 3 звичайних квитки
    for (const player of this.players) {
      const longTicket = this.longTicketDeck.pop();
      const normalCards = [];
      for (let i = 0; i < 3; i++) {
        if (this.ticketDeck.length > 0) {
          normalCards.push(this.ticketDeck.pop());
        }
      }
      player.pendingTickets = [longTicket, ...normalCards];
      player.ticketChoiceType = 'initial';
    }

    return { success: true };
  }

  // Гравець обирає квитки (початкові)
  chooseInitialTickets(playerId, selectedIds) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { error: 'Гравець не знайдений' };
    if (!player.pendingTickets) return { error: 'Немає квитків для вибору' };

    // Мінімум 2 квитки потрібно залишити (з початкових)
    const selected = player.pendingTickets.filter(t => selectedIds.includes(t.id));
    if (selected.length < 2) return { error: 'Потрібно обрати мінімум 2 квитки' };

    // Повернути невибрані назад у колоду
    const returned = player.pendingTickets.filter(t => !selectedIds.includes(t.id));
    for (const ticket of returned) {
      if (ticket.long) {
        this.longTicketDeck.unshift(ticket);
      } else {
        this.ticketDeck.unshift(ticket);
      }
    }

    player.tickets.push(...selected);
    player.pendingTickets = null;
    player.ticketChoiceType = null;

    // Перевірити чи всі гравці обрали квитки
    const allChosen = this.players.every(p => p.pendingTickets === null);
    if (allChosen) {
      this.phase = 'playing';
      this.currentPlayerIndex = 0;
    }

    return { success: true, tickets: selected };
  }

  // Гравець обирає квитки (під час гри)
  chooseTickets(playerId, selectedIds) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { error: 'Гравець не знайдений' };
    if (!player.pendingTickets) return { error: 'Немає квитків для вибору' };

    // Мінімум 1 квиток потрібно залишити
    const selected = player.pendingTickets.filter(t => selectedIds.includes(t.id));
    if (selected.length < 1) return { error: 'Потрібно обрати мінімум 1 квиток' };

    // Повернути невибрані назад у колоду
    const returned = player.pendingTickets.filter(t => !selectedIds.includes(t.id));
    for (const ticket of returned) {
      this.ticketDeck.unshift(ticket);
    }

    player.tickets.push(...selected);
    player.pendingTickets = null;
    player.ticketChoiceType = null;

    this.endTurn();
    return { success: true, tickets: selected };
  }

  // Взяти карту вагона з відкритих
  drawFaceUpCard(playerId, index) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { error: 'Гравець не знайдений' };
    if (this.phase !== 'playing' && this.phase !== 'last_round') return { error: 'Зараз не час для ходу' };
    if (this.players[this.currentPlayerIndex].id !== playerId) return { error: 'Зараз не ваш хід' };
    if (player.pendingTickets) return { error: 'Спершу оберіть квитки' };

    if (index < 0 || index >= this.faceUpCards.length) return { error: 'Невірний індекс карти' };

    const card = this.faceUpCards[index];

    // Перевірка: якщо це локомотив і це друга карта
    if (card === LOCOMOTIVE && this.actionInProgress === 'drew_one_card') {
      return { error: 'Не можна брати локомотив як другу карту' };
    }

    // Якщо це локомотив і це перша дія - це єдина карта за хід
    if (card === LOCOMOTIVE && !this.actionInProgress) {
      player.hand.push(card);
      this.faceUpCards[index] = this.drawCard();
      this.checkFaceUpLocomotives();
      this.endTurn();
      return { success: true, card, turnEnded: true };
    }

    player.hand.push(card);
    this.faceUpCards[index] = this.drawCard();
    this.checkFaceUpLocomotives();

    if (this.actionInProgress === 'drew_one_card') {
      // Друга карта взята - кінець ходу
      this.endTurn();
      return { success: true, card, turnEnded: true };
    } else {
      // Перша карта
      this.actionInProgress = 'drew_one_card';
      return { success: true, card, turnEnded: false };
    }
  }

  // Взяти карту з колоди
  drawFromDeck(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { error: 'Гравець не знайдений' };
    if (this.phase !== 'playing' && this.phase !== 'last_round') return { error: 'Зараз не час для ходу' };
    if (this.players[this.currentPlayerIndex].id !== playerId) return { error: 'Зараз не ваш хід' };
    if (player.pendingTickets) return { error: 'Спершу оберіть квитки' };

    if (this.drawPile.length === 0 && this.discardPile.length === 0) {
      return { error: 'Колода порожня' };
    }

    const card = this.drawCard();
    player.hand.push(card);

    if (this.actionInProgress === 'drew_one_card') {
      this.endTurn();
      return { success: true, card, turnEnded: true };
    } else {
      this.actionInProgress = 'drew_one_card';
      return { success: true, card, turnEnded: false };
    }
  }

  // Зайняти маршрут
  claimRoute(playerId, routeId, cardsToUse) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { error: 'Гравець не знайдений' };
    if (this.phase !== 'playing' && this.phase !== 'last_round') return { error: 'Зараз не час для ходу' };
    if (this.players[this.currentPlayerIndex].id !== playerId) return { error: 'Зараз не ваш хід' };
    if (this.actionInProgress) return { error: 'Ви вже почали іншу дію' };
    if (player.pendingTickets) return { error: 'Спершу оберіть квитки' };

    const route = routes.find(r => r.id === routeId);
    if (!route) return { error: 'Маршрут не знайдений' };

    // Перевірити чи маршрут вже зайнятий
    if (this.claimedRoutes.find(cr => cr.routeId === routeId)) {
      return { error: 'Цей маршрут вже зайнятий' };
    }

    // Перевірити подвійні маршрути
    if (route.double) {
      const pairedRoute = routes.find(r =>
        r.id !== routeId &&
        ((r.from === route.from && r.to === route.to) || (r.from === route.to && r.to === route.from)) &&
        r.length === route.length
      );
      if (pairedRoute) {
        const pairedClaim = this.claimedRoutes.find(cr => cr.routeId === pairedRoute.id);
        if (pairedClaim && pairedClaim.playerId === playerId) {
          return { error: 'Ви не можете зайняти обидва паралельних маршрути' };
        }
        // При 2-3 гравцях подвійні маршрути недоступні
        if (this.players.length <= 3 && pairedClaim) {
          return { error: 'При менше ніж 4 гравцях можна зайняти лише один з подвійних маршрутів' };
        }
      }
    } else {
      // Перевірити чи є подвійний маршрут і чи він вже зайнятий цим гравцем
      const pairedRoute = routes.find(r =>
        r.id !== routeId && r.double &&
        ((r.from === route.from && r.to === route.to) || (r.from === route.to && r.to === route.from)) &&
        r.length === route.length
      );
      if (pairedRoute) {
        const pairedClaim = this.claimedRoutes.find(cr => cr.routeId === pairedRoute.id);
        if (pairedClaim && pairedClaim.playerId === playerId) {
          return { error: 'Ви не можете зайняти обидва паралельних маршрути' };
        }
        if (this.players.length <= 3 && pairedClaim) {
          return { error: 'При менше ніж 4 гравцях можна зайняти лише один з подвійних маршрутів' };
        }
      }
    }

    // Перевірити кількість вагонів
    if (player.trains < route.length) {
      return { error: 'Недостатньо вагонів' };
    }

    // Валідація карт
    const validation = this.validateCardsForRoute(route, cardsToUse, player);
    if (validation.error) return validation;

    // Якщо тунель - перевірка додаткових карт
    if (route.type === 'tunnel') {
      return this.handleTunnelClaim(player, route, routeId, cardsToUse, validation.cardColor);
    }

    // Забрати карти з руки гравця
    this.removeCardsFromHand(player, cardsToUse);

    // Зайняти маршрут
    player.trains -= route.length;
    player.points += ROUTE_POINTS[route.length] || 0;
    player.claimedRoutes.push(routeId);
    this.claimedRoutes.push({ routeId, playerId });

    // Перевірити чи залишилось мало вагонів (останній раунд)
    this.checkLastRound(player);

    this.endTurn();
    return { success: true, points: ROUTE_POINTS[route.length] || 0 };
  }

  // Обробка тунелю
  handleTunnelClaim(player, route, routeId, cardsToUse, cardColor) {
    // Відкрити 3 карти з колоди
    const tunnelCards = [];
    for (let i = 0; i < 3; i++) {
      if (this.drawPile.length > 0 || this.discardPile.length > 0) {
        tunnelCards.push(this.drawCard());
      }
    }

    // Порахувати додаткові карти потрібного кольору
    let extraNeeded = 0;
    for (const card of tunnelCards) {
      if (card === LOCOMOTIVE || card === cardColor) {
        extraNeeded++;
      }
    }

    if (extraNeeded === 0) {
      // Тунель пройдений без додаткових карт
      this.removeCardsFromHand(player, cardsToUse);
      this.discardPile.push(...tunnelCards);

      player.trains -= route.length;
      player.points += ROUTE_POINTS[route.length] || 0;
      player.claimedRoutes.push(routeId);
      this.claimedRoutes.push({ routeId, playerId: player.id });

      this.checkLastRound(player);
      this.endTurn();
      return { success: true, tunnel: true, tunnelCards, extraNeeded: 0, points: ROUTE_POINTS[route.length] || 0 };
    }

    // Потрібні додаткові карти - зберігаємо стан
    this.actionInProgress = {
      type: 'tunnel_pending',
      routeId,
      cardsToUse,
      tunnelCards,
      extraNeeded,
      cardColor
    };

    return {
      success: true,
      tunnel: true,
      tunnelCards,
      extraNeeded,
      pending: true
    };
  }

  // Відповідь на тунель (гравець вирішує чи платити додаткові карти)
  respondToTunnel(playerId, accept, extraCards) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { error: 'Гравець не знайдений' };
    if (!this.actionInProgress || this.actionInProgress.type !== 'tunnel_pending') {
      return { error: 'Немає активного тунелю' };
    }

    const { routeId, cardsToUse, tunnelCards, extraNeeded, cardColor } = this.actionInProgress;
    const route = routes.find(r => r.id === routeId);

    this.discardPile.push(...tunnelCards);

    if (!accept) {
      // Гравець відмовляється
      this.actionInProgress = null;
      this.endTurn();
      return { success: true, declined: true };
    }

    // Перевірити чи гравець має достатньо додаткових карт
    if (!extraCards || extraCards.length < extraNeeded) {
      return { error: `Потрібно ${extraNeeded} додаткових карт` };
    }

    // Валідація додаткових карт
    const handCopy = [...player.hand];
    // Спершу видалимо основні карти
    for (const card of cardsToUse) {
      const idx = handCopy.indexOf(card);
      if (idx === -1) return { error: 'Карти не знайдені в руці' };
      handCopy.splice(idx, 1);
    }
    // Перевірити додаткові
    for (const card of extraCards) {
      if (card !== LOCOMOTIVE && card !== cardColor) {
        return { error: 'Додаткові карти повинні бути потрібного кольору або локомотивами' };
      }
      const idx = handCopy.indexOf(card);
      if (idx === -1) return { error: 'Додаткові карти не знайдені в руці' };
      handCopy.splice(idx, 1);
    }

    // Все ок - забираємо карти
    this.removeCardsFromHand(player, [...cardsToUse, ...extraCards]);

    player.trains -= route.length;
    player.points += ROUTE_POINTS[route.length] || 0;
    player.claimedRoutes.push(routeId);
    this.claimedRoutes.push({ routeId, playerId: player.id });

    this.actionInProgress = null;
    this.checkLastRound(player);
    this.endTurn();

    return { success: true, points: ROUTE_POINTS[route.length] || 0 };
  }

  // Побудувати станцію
  buildStation(playerId, cityName, cardsToUse) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { error: 'Гравець не знайдений' };
    if (this.phase !== 'playing' && this.phase !== 'last_round') return { error: 'Зараз не час для ходу' };
    if (this.players[this.currentPlayerIndex].id !== playerId) return { error: 'Зараз не ваш хід' };
    if (this.actionInProgress) return { error: 'Ви вже почали іншу дію' };
    if (player.pendingTickets) return { error: 'Спершу оберіть квитки' };

    if (player.stations <= 0) return { error: 'У вас немає станцій' };

    // Перевірити чи місто існує
    if (!cities[cityName]) return { error: 'Місто не знайдене' };

    // Перевірити чи в місті вже є станція цього гравця
    const existingStation = this.players.find(p =>
      p.id !== playerId && p.stationCity === cityName
    );

    // Перевірити чи гравець вже має станцію в цьому місті
    if (player.stationCities && player.stationCities.includes(cityName)) {
      return { error: 'Ви вже маєте станцію в цьому місті' };
    }

    // Вартість станції
    const stationNumber = INITIAL_STATIONS - player.stations; // 0, 1, 2
    const cost = STATION_COSTS[stationNumber]; // 1, 2, 3

    if (!cardsToUse || cardsToUse.length !== cost) {
      return { error: `Для станції потрібно ${cost} карт одного кольору` };
    }

    // Валідація: всі карти одного кольору або локомотиви
    const nonLocos = cardsToUse.filter(c => c !== LOCOMOTIVE);
    const colors = [...new Set(nonLocos)];
    if (colors.length > 1) {
      return { error: 'Всі карти повинні бути одного кольору (або локомотиви)' };
    }

    // Перевірити наявність карт в руці
    const handCopy = [...player.hand];
    for (const card of cardsToUse) {
      const idx = handCopy.indexOf(card);
      if (idx === -1) return { error: 'Карти не знайдені в руці' };
      handCopy.splice(idx, 1);
    }

    // Побудувати станцію
    this.removeCardsFromHand(player, cardsToUse);
    player.stations--;
    if (!player.stationCities) player.stationCities = [];
    player.stationCities.push(cityName);

    this.endTurn();
    return { success: true };
  }

  // Взяти квитки
  drawTickets(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { error: 'Гравець не знайдений' };
    if (this.phase !== 'playing' && this.phase !== 'last_round') return { error: 'Зараз не час для ходу' };
    if (this.players[this.currentPlayerIndex].id !== playerId) return { error: 'Зараз не ваш хід' };
    if (this.actionInProgress) return { error: 'Ви вже почали іншу дію' };
    if (player.pendingTickets) return { error: 'Ви вже маєте квитки для вибору' };

    if (this.ticketDeck.length === 0) return { error: 'Колода квитків порожня' };

    const tickets = [];
    for (let i = 0; i < 3 && this.ticketDeck.length > 0; i++) {
      tickets.push(this.ticketDeck.pop());
    }

    player.pendingTickets = tickets;
    player.ticketChoiceType = 'during_game';
    this.actionInProgress = 'drawing_tickets';

    return { success: true, tickets };
  }

  // Валідація карт для маршруту
  validateCardsForRoute(route, cardsToUse, player) {
    if (!cardsToUse || cardsToUse.length < route.length) {
      return { error: `Потрібно ${route.length} карт для цього маршруту` };
    }

    const locoCount = cardsToUse.filter(c => c === LOCOMOTIVE).length;
    const nonLocos = cardsToUse.filter(c => c !== LOCOMOTIVE);
    const colors = [...new Set(nonLocos)];

    // Для поромів перевірити мінімум локомотивів
    if (route.type === 'ferry') {
      if (locoCount < (route.ferryCount || 0)) {
        return { error: `Для порому потрібно мінімум ${route.ferryCount} локомотивів` };
      }
    }

    // Всі не-локомотиви повинні бути одного кольору
    if (colors.length > 1) {
      return { error: 'Всі карти повинні бути одного кольору (плюс локомотиви)' };
    }

    // Якщо маршрут має конкретний колір
    let cardColor = colors[0] || LOCOMOTIVE;
    if (route.color !== 'any' && colors.length > 0 && colors[0] !== route.color) {
      return { error: `Для цього маршруту потрібні карти кольору: ${route.color}` };
    }
    if (route.color !== 'any') {
      cardColor = route.color;
    }

    // Перевірити наявність карт в руці
    const handCopy = [...player.hand];
    for (const card of cardsToUse) {
      const idx = handCopy.indexOf(card);
      if (idx === -1) return { error: 'Карти не знайдені в руці' };
      handCopy.splice(idx, 1);
    }

    if (cardsToUse.length !== route.length) {
      return { error: `Потрібно рівно ${route.length} карт` };
    }

    return { valid: true, cardColor };
  }

  // Створити колоду карт
  createDrawPile() {
    this.drawPile = [];
    for (const color of CARD_COLORS) {
      for (let i = 0; i < 12; i++) {
        this.drawPile.push(color);
      }
    }
    // 14 локомотивів
    for (let i = 0; i < 14; i++) {
      this.drawPile.push(LOCOMOTIVE);
    }
  }

  // Взяти карту з колоди
  drawCard() {
    if (this.drawPile.length === 0) {
      if (this.discardPile.length === 0) return null;
      this.drawPile = this.shuffleArray([...this.discardPile]);
      this.discardPile = [];
    }
    return this.drawPile.pop();
  }

  // Поповнити відкриті карти
  refillFaceUpCards() {
    while (this.faceUpCards.length < 5) {
      const card = this.drawCard();
      if (card === null) break;
      this.faceUpCards.push(card);
    }
    this.checkFaceUpLocomotives();
  }

  // Перевірити чи 3+ локомотиви серед відкритих
  checkFaceUpLocomotives() {
    let locoCount = this.faceUpCards.filter(c => c === LOCOMOTIVE).length;
    let attempts = 0;
    while (locoCount >= 3 && attempts < 5) {
      this.discardPile.push(...this.faceUpCards);
      this.faceUpCards = [];
      for (let i = 0; i < 5; i++) {
        const card = this.drawCard();
        if (card === null) break;
        this.faceUpCards.push(card);
      }
      locoCount = this.faceUpCards.filter(c => c === LOCOMOTIVE).length;
      attempts++;
    }
  }

  // Видалити карти з руки
  removeCardsFromHand(player, cards) {
    for (const card of cards) {
      const idx = player.hand.indexOf(card);
      if (idx !== -1) {
        player.hand.splice(idx, 1);
        this.discardPile.push(card);
      }
    }
  }

  // Перевірити останній раунд
  checkLastRound(player) {
    if (player.trains <= 2 && this.phase === 'playing') {
      this.phase = 'last_round';
      this.lastRoundStartedBy = player.id;
    }
  }

  // Завершити хід
  endTurn() {
    this.actionInProgress = null;
    this.turnNumber++;

    // Перевірити чи гра закінчилась (останній раунд і повернулись до гравця який його почав)
    const nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
    if (this.phase === 'last_round' && this.players[nextIndex].id === this.lastRoundStartedBy) {
      this.finishGame();
      return;
    }

    this.currentPlayerIndex = nextIndex;
  }

  // Завершити гру та підрахувати очки
  finishGame() {
    this.phase = 'finished';

    for (const player of this.players) {
      // Очки за квитки
      for (const ticket of player.tickets) {
        const connected = this.areCitiesConnected(player.id, ticket.from, ticket.to);
        ticket.completed = connected;
        if (connected) {
          player.points += ticket.points;
        } else {
          player.points -= ticket.points;
        }
      }

      // Очки за невикористані станції (4 очки за кожну)
      player.points += player.stations * 4;
    }

    // Бонус за найдовший маршрут (10 очок)
    const longestPaths = this.players.map(p => ({
      playerId: p.id,
      length: this.calculateLongestPath(p.id)
    }));
    const maxLength = Math.max(...longestPaths.map(lp => lp.length));
    const winners = longestPaths.filter(lp => lp.length === maxLength);
    for (const winner of winners) {
      const player = this.players.find(p => p.id === winner.playerId);
      player.points += 10;
      player.longestPathBonus = true;
    }
  }

  // Перевірити чи міста з'єднані (для квитків, враховуючи станції)
  areCitiesConnected(playerId, city1, city2) {
    const player = this.players.find(p => p.id === playerId);
    const playerRoutes = this.claimedRoutes.filter(cr => cr.playerId === playerId);
    const playerRouteData = playerRoutes.map(cr => routes.find(r => r.id === cr.routeId));

    // Побудувати граф з'єднань гравця
    const graph = {};
    for (const route of playerRouteData) {
      if (!graph[route.from]) graph[route.from] = [];
      if (!graph[route.to]) graph[route.to] = [];
      graph[route.from].push(route.to);
      graph[route.to].push(route.from);
    }

    // Додати з'єднання через станції
    if (player.stationCities) {
      for (const stationCity of player.stationCities) {
        // Знайти маршрути інших гравців що проходять через це місто
        const otherRoutes = this.claimedRoutes
          .filter(cr => cr.playerId !== playerId)
          .map(cr => routes.find(r => r.id === cr.routeId))
          .filter(r => r.from === stationCity || r.to === stationCity);

        // Гравець може використати один маршрут іншого гравця через станцію
        if (otherRoutes.length > 0) {
          const route = otherRoutes[0]; // використовуємо перший доступний
          if (!graph[route.from]) graph[route.from] = [];
          if (!graph[route.to]) graph[route.to] = [];
          graph[route.from].push(route.to);
          graph[route.to].push(route.from);
        }
      }
    }

    // BFS
    if (!graph[city1]) return false;
    const visited = new Set();
    const queue = [city1];
    visited.add(city1);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === city2) return true;
      for (const neighbor of (graph[current] || [])) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    return false;
  }

  // Розрахувати найдовший безперервний маршрут
  calculateLongestPath(playerId) {
    const playerRoutes = this.claimedRoutes
      .filter(cr => cr.playerId === playerId)
      .map(cr => routes.find(r => r.id === cr.routeId));

    if (playerRoutes.length === 0) return 0;

    // Побудувати граф з вагами
    const graph = {};
    for (const route of playerRoutes) {
      if (!graph[route.from]) graph[route.from] = [];
      if (!graph[route.to]) graph[route.to] = [];
      graph[route.from].push({ to: route.to, length: route.length, id: route.id });
      graph[route.to].push({ to: route.from, length: route.length, id: route.id });
    }

    let maxPath = 0;
    const allCities = Object.keys(graph);

    // DFS з кожного міста
    for (const startCity of allCities) {
      const visited = new Set();
      const dfs = (city, currentLength) => {
        maxPath = Math.max(maxPath, currentLength);
        for (const edge of (graph[city] || [])) {
          if (!visited.has(edge.id)) {
            visited.add(edge.id);
            dfs(edge.to, currentLength + edge.length);
            visited.delete(edge.id);
          }
        }
      };
      dfs(startCity, 0);
    }

    return maxPath;
  }

  // Отримати стан гри для конкретного гравця
  getStateForPlayer(playerId) {
    const player = this.players.find(p => p.id === playerId);
    return {
      gameId: this.gameId,
      phase: this.phase,
      currentPlayerIndex: this.currentPlayerIndex,
      currentPlayerId: this.players[this.currentPlayerIndex]?.id,
      turnNumber: this.turnNumber,
      actionInProgress: this.actionInProgress ? (typeof this.actionInProgress === 'string' ? this.actionInProgress : this.actionInProgress.type) : null,
      faceUpCards: this.faceUpCards,
      drawPileCount: this.drawPile.length + this.discardPile.length,
      ticketDeckCount: this.ticketDeck.length,
      claimedRoutes: this.claimedRoutes,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        colorName: p.colorName,
        handCount: p.hand.length,
        ticketCount: p.tickets.length,
        trains: p.trains,
        stations: p.stations,
        points: p.points,
        claimedRoutes: p.claimedRoutes,
        stationCities: p.stationCities || [],
        // Показувати руку та квитки тільки самому гравцю
        ...(p.id === playerId ? {
          hand: p.hand,
          tickets: p.tickets,
          pendingTickets: p.pendingTickets,
          ticketChoiceType: p.ticketChoiceType
        } : {})
      })),
      lastRoundStartedBy: this.lastRoundStartedBy,
      cities,
      routes: routes.map(r => ({
        ...r,
        claimed: this.claimedRoutes.find(cr => cr.routeId === r.id) || null
      }))
    };
  }

  // Отримати фінальні результати
  getFinalResults() {
    if (this.phase !== 'finished') return null;

    return this.players
      .map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        colorName: p.colorName,
        points: p.points,
        tickets: p.tickets,
        claimedRoutes: p.claimedRoutes.length,
        trains: p.trains,
        stations: p.stations,
        longestPathBonus: p.longestPathBonus || false,
        longestPath: this.calculateLongestPath(p.id)
      }))
      .sort((a, b) => b.points - a.points);
  }

  // Утиліти
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

module.exports = GameEngine;
