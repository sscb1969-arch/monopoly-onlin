const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

function generateBoard() {
  return [
    { type: 'start', name: 'スタート' },
    { type: 'property', name: '公園', price: 100, fee: 20 },
    { type: 'event', name: 'ラッキー！ +100', amount: 100 },
    { type: 'property', name: '図書館', price: 120, fee: 30 },
    { type: 'event', name: 'アンラッキー… -50', amount: -50 },
    { type: 'property', name: '体育館', price: 150, fee: 40 },
    { type: 'event', name: '移動 +2', move: 2 },
    { type: 'property', name: '食堂', price: 200, fee: 50 },
  ];
}

let rooms = {};

io.on('connection', (socket) => {
  socket.on('joinRoom', (roomId, playerName) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        turn: 0,
        board: generateBoard(),
      };
    }

    rooms[roomId].players.push({
      id: socket.id,
      name: playerName,
      pos: 0,
      money: 1000,
      properties: []
    });

    socket.join(roomId);
    io.to(roomId).emit('stateUpdate', rooms[roomId]);
  });

  socket.on('rollDice', (roomId) => {
    const room = rooms[roomId];
    const dice = Math.floor(Math.random() * 6) + 1;

    const player = room.players[room.turn];
    player.pos = (player.pos + dice) % room.board.length;

    const tile = room.board[player.pos];
    handleTile(player, tile);

    room.turn = (room.turn + 1) % room.players.length;

    io.to(roomId).emit('stateUpdate', room);
  });
});

function handleTile(player, tile) {
  if (tile.type === 'event') {
    if (tile.amount) player.money += tile.amount;
    if (tile.move) player.pos += tile.move;
  }

  if (tile.type === 'property') {
    if (!tile.owner) {
      if (player.money >= tile.price) {
        tile.owner = player.id;
        player.money -= tile.price;
        player.properties.push(tile.name);
      }
    } else if (tile.owner !== player.id) {
      player.money -= tile.fee;
    }
  }
}

http.listen(3000, () => console.log('http://localhost:3000'));
