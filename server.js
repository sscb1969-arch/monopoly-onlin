const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

function generateBoard() {
  return [
    { type: 'start', name: 'GO（スタート）', amount: 200 },

    { type: 'property', name: '茶色1', price: 60, fee: 20 },
    { type: 'property', name: '茶色2', price: 60, fee: 20 },

    { type: 'event', name: 'チャンス', card: 'chance' },

    { type: 'property', name: '水色1', price: 100, fee: 30 },
    { type: 'property', name: '水色2', price: 100, fee: 30 },
    { type: 'property', name: '水色3', price: 120, fee: 40 },

    { type: 'railroad', name: '鉄道A', price: 200, fee: 50 },

    { type: 'property', name: 'ピンク1', price: 140, fee: 50 },
    { type: 'property', name: 'ピンク2', price: 140, fee: 50 },
    { type: 'property', name: 'ピンク3', price: 160, fee: 60 },

    { type: 'event', name: 'コミュニティ', card: 'community' },

    { type: 'property', name: 'オレンジ1', price: 180, fee: 70 },
    { type: 'property', name: 'オレンジ2', price: 180, fee: 70 },
    { type: 'property', name: 'オレンジ3', price: 200, fee: 80 },

    { type: 'jail', name: '刑務所（Just Visiting）' },

    { type: 'property', name: '赤1', price: 220, fee: 90 },
    { type: 'property', name: '赤2', price: 220, fee: 90 },
    { type: 'property', name: '赤3', price: 240, fee: 100 },

    { type: 'gotojail', name: '刑務所へ行け' },
  ];
}


let rooms = {};

io.on('connection', (socket) => {

  // ルーム参加
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

  // サイコロを振る
  socket.on('rollDice', (roomId) => {
    const room = rooms[roomId];
    const dice = Math.floor(Math.random() * 6) + 1;

    // ★ サイコロの出目を送る（音・3D回転・表示に必要）
    io.to(roomId).emit("diceResult", dice);

    const player = room.players[room.turn];
    player.pos = (player.pos + dice) % room.board.length;

    const tile = room.board[player.pos];
    handleTile(player, tile);

    room.turn = (room.turn + 1) % room.players.length;

    io.to(roomId).emit('stateUpdate', room);
  });
});

// マスの処理
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
