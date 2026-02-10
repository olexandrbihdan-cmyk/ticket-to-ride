const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const GameEngine = require('./game/GameEngine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Зберігання ігор
const games = new Map();
const playerGameMap = new Map(); // playerId -> gameId

// Роздача статичних файлів (production)
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Знайти або створити гру
function findOrCreateGame() {
  // Шукаємо гру що очікує гравців
  for (const [gameId, game] of games) {
    if (game.phase === 'waiting' && game.players.length < 4) {
      return game;
    }
  }
  // Створюємо нову
  const gameId = uuidv4().substring(0, 8);
  const game = new GameEngine(gameId);
  games.set(gameId, game);
  return game;
}

// Socket.io обробка
io.on('connection', (socket) => {
  console.log(`Гравець підключився: ${socket.id}`);

  // Гравець приєднується
  socket.on('join', ({ playerName }) => {
    if (!playerName || playerName.trim().length === 0) {
      socket.emit('error', { message: 'Введіть ваше ім\'я' });
      return;
    }

    const game = findOrCreateGame();
    const result = game.addPlayer(socket.id, playerName.trim());

    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    playerGameMap.set(socket.id, game.gameId);
    socket.join(game.gameId);

    // Надіслати стан гри всім гравцям
    emitGameState(game);

    console.log(`${playerName} приєднався до гри ${game.gameId} (${game.players.length}/4)`);
  });

  // Почати гру
  socket.on('start_game', () => {
    const game = getPlayerGame(socket.id);
    if (!game) return;

    const result = game.startGame();
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    emitGameState(game);
  });

  // Обрати початкові квитки
  socket.on('choose_initial_tickets', ({ selectedIds }) => {
    const game = getPlayerGame(socket.id);
    if (!game) return;

    const result = game.chooseInitialTickets(socket.id, selectedIds);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    emitGameState(game);
  });

  // Обрати квитки (під час гри)
  socket.on('choose_tickets', ({ selectedIds }) => {
    const game = getPlayerGame(socket.id);
    if (!game) return;

    const result = game.chooseTickets(socket.id, selectedIds);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    emitGameState(game);
  });

  // Взяти карту з відкритих
  socket.on('draw_face_up', ({ index }) => {
    const game = getPlayerGame(socket.id);
    if (!game) return;

    const result = game.drawFaceUpCard(socket.id, index);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    socket.emit('card_drawn', { card: result.card });
    emitGameState(game);
  });

  // Взяти карту з колоди
  socket.on('draw_from_deck', () => {
    const game = getPlayerGame(socket.id);
    if (!game) return;

    const result = game.drawFromDeck(socket.id);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    socket.emit('card_drawn', { card: result.card });
    emitGameState(game);
  });

  // Зайняти маршрут
  socket.on('claim_route', ({ routeId, cardsToUse }) => {
    const game = getPlayerGame(socket.id);
    if (!game) return;

    const result = game.claimRoute(socket.id, routeId, cardsToUse);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    if (result.tunnel && result.pending) {
      socket.emit('tunnel_challenge', {
        tunnelCards: result.tunnelCards,
        extraNeeded: result.extraNeeded
      });
    }

    emitGameState(game);
  });

  // Відповідь на тунель
  socket.on('tunnel_response', ({ accept, extraCards }) => {
    const game = getPlayerGame(socket.id);
    if (!game) return;

    const result = game.respondToTunnel(socket.id, accept, extraCards);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    emitGameState(game);
  });

  // Побудувати станцію
  socket.on('build_station', ({ cityName, cardsToUse }) => {
    const game = getPlayerGame(socket.id);
    if (!game) return;

    const result = game.buildStation(socket.id, cityName, cardsToUse);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    emitGameState(game);
  });

  // Взяти квитки
  socket.on('draw_tickets', () => {
    const game = getPlayerGame(socket.id);
    if (!game) return;

    const result = game.drawTickets(socket.id);
    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    emitGameState(game);
  });

  // Відключення
  socket.on('disconnect', () => {
    console.log(`Гравець відключився: ${socket.id}`);
    const gameId = playerGameMap.get(socket.id);
    if (gameId) {
      const game = games.get(gameId);
      if (game && game.phase === 'waiting') {
        game.removePlayer(socket.id);
        if (game.players.length === 0) {
          games.delete(gameId);
        } else {
          emitGameState(game);
        }
      }
      playerGameMap.delete(socket.id);
    }
  });
});

function getPlayerGame(socketId) {
  const gameId = playerGameMap.get(socketId);
  if (!gameId) return null;
  return games.get(gameId);
}

function emitGameState(game) {
  for (const player of game.players) {
    const state = game.getStateForPlayer(player.id);
    io.to(player.id).emit('game_state', state);
  }

  // Якщо гра закінчилась, надіслати результати
  if (game.phase === 'finished') {
    const results = game.getFinalResults();
    io.to(game.gameId).emit('game_results', results);
  }
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Сервер запущено на порті ${PORT}`);
});
