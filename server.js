const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

//
// 盤面生成（モノポリー風）
//
function generateBoard() {
  return [
    { type: 'start', name: 'GO', amount: 200 },

    { type: 'property', name: '茶色1', color: 'brown', price: 60, fee: 20, house: 0, hotel: false, housePrice: 50 },
    { type: 'property', name: '茶色2', color: 'brown', price: 60, fee: 20, house: 0, hotel: false, housePrice: 50 },

    { type: 'chance', name: 'チャンス' },

    { type: 'property', name: '水色1', color: 'lightblue', price: 100, fee: 30, house: 0, hotel: false, housePrice: 50 },
    { type: 'property', name: '水色2', color: 'lightblue', price: 100, fee: 30, house: 0, hotel: false, housePrice: 50 },
    { type: 'property', name: '水色3', color: 'lightblue', price: 120, fee: 40, house: 0, hotel: false, housePrice: 50 },

    { type: 'community', name: 'コミュニティ' },

    { type: 'property', name: 'ピンク1', color: 'pink', price: 140, fee: 50, house: 0, hotel: false, housePrice: 100 },
    { type: 'property', name: 'ピンク2', color: 'pink', price: 140, fee: 50, house: 0, hotel: false, housePrice: 100 },
    { type: 'property', name: 'ピンク3', color: 'pink', price: 160, fee: 60, house: 0, hotel: false, housePrice: 100 },

    { type: 'gotojail', name: '刑務所へ行け' },
    { type: 'jail', name: '刑務所' },
  ];
}

//
// チャンスカード
//
const chanceCards = [
  { type: "money", amount: 200, text: "銀行から200もらう" },
  { type: "money", amount: -100, text: "罰金100を払う" },
  { type: "move", steps: 3, text: "3マス進む" },
  { type: "move", steps: -2, text: "2マス戻る" },
  { type: "goto", pos: 0, text: "GOへ移動（+200）" },
  { type: "goto", pos: 12, text: "刑務所へ行く" },
];

//
// コミュニティカード
//
const communityCards = [
  { type: "money", amount: 100, text: "銀行から100もらう" },
  { type: "money", amount: -50, text: "医療費として50払う" },
  { type: "move", steps: 2, text: "2マス進む" },
  { type: "move", steps: -1, text: "1マス戻る" },
  { type: "goto", pos: 0, text: "GOへ移動（+200）" },
  { type: "goto", pos: 12, text: "刑務所へ行く" },
];

//
// 色グループ判定
//
function hasFullColorSet(player, board, color) {
  const tiles = board.filter(t => t.type === 'property' && t.color === color);
  return tiles.every(t => t.owner === player.id);
}

//
// チャンスカード処理
//
function drawChance(player, room) {
  const card = chanceCards[Math.floor(Math.random() * chanceCards.length)];

  if (card.type === "money") player.money += card.amount;

  if (card.type === "move") {
    player.pos = (player.pos + card.steps + room.board.length) % room.board.length;
  }

  if (card.type === "goto") {
    player.pos = card.pos;
    if (card.pos === 0) player.money += 200;
    if (card.pos === 12) {
      player.jail = true;
      player.jailTurn = 0;
    }
  }

  return "チャンスカード: " + card.text;
}

//
// コミュニティカード処理
//
function drawCommunity(player, room) {
  const card = communityCards[Math.floor(Math.random() * communityCards.length)];

  if (card.type === "money") player.money += card.amount;

  if (card.type === "move") {
    player.pos = (player.pos + card.steps + room.board.length) % room.board.length;
  }

  if (card.type === "goto") {
    player.pos = card.pos;
    if (card.pos === 0) player.money += 200;
    if (card.pos === 12) {
      player.jail = true;
      player.jailTurn = 0;
    }
  }

  return "コミュニティカード: " + card.text;
}

//
// ルームデータ
//
let rooms = {};

io.on('connection', (socket) => {

  //
  // ルーム参加
  //
  socket.on('joinRoom', (roomId, playerName) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        turn: 0,
        board: generateBoard(),
        lastMessage: "ゲーム開始！"
      };
    }

    rooms[roomId].players.push({
      id: socket.id,
      name: playerName,
      pos: 0,
      money: 1000,
      properties: [],
      jail: false,
      jailTurn: 0
    });

    socket.join(roomId);
    io.to(roomId).emit('stateUpdate', rooms[roomId]);
  });

  //
  // 家を建てる
  //
  socket.on('buildHouse', (roomId, tileIndex) => {
    const room = rooms[roomId];
    const player = room.players.find(p => p.id === socket.id);
    const tile = room.board[tileIndex];

    if (!tile || tile.type !== 'property') return;
    if (tile.owner !== player.id) return;
    if (!hasFullColorSet(player, room.board, tile.color)) return;

    if (tile.hotel) return;

    if (tile.house === 4) {
      if (player.money >= tile.housePrice) {
        player.money -= tile.housePrice;
        tile.house = 0;
        tile.hotel = true;
        room.lastMessage = `${tile.name} にホテルを建設！`;
      }
    } else {
      if (player.money >= tile.housePrice) {
        player.money -= tile.housePrice;
        tile.house++;
        room.lastMessage = `${tile.name} に家を建設！（${tile.house}軒）`;
      }
    }

    io.to(roomId).emit('stateUpdate', room);
  });

  //
  // サイコロを振る
  //
  socket.on('rollDice', (roomId) => {
    const room = rooms[roomId];
    const player = room.players[room.turn];

    // 刑務所チェック
    if (player.jail) {
      const dice = Math.floor(Math.random() * 6) + 1;
      io.to(roomId).emit("diceResult", dice);

      if (dice === 6) {
        player.jail = false;
        player.jailTurn = 0;
        room.lastMessage = `${player.name} は6を出して刑務所から脱出！`;
      } else {
        player.jailTurn++;
        room.lastMessage = `${player.name} は刑務所にいます（${player.jailTurn}/3）`;

        if (player.jailTurn >= 3) {
          player.jail = false;
          player.jailTurn = 0;
          room.lastMessage = `${player.name} は3ターン経過で刑務所から脱出！`;
        }

        room.turn = (room.turn + 1) % room.players.length;
        io.to(roomId).emit('stateUpdate', room);
        return;
      }
    }

    // 通常のサイコロ処理
    const dice = Math.floor(Math.random() * 6) + 1;
    io.to(roomId).emit("diceResult", dice);

    const oldPos = player.pos;
    player.pos = (player.pos + dice) % room.board.length;

    // GO通過ボーナス
    if (oldPos + dice >= room.board.length) {
      player.money += 200;
      room.lastMessage = `${player.name} はGOを通過して +200！`;
    }

    const tile = room.board[player.pos];
    handleTile(player, tile, room);

    room.turn = (room.turn + 1) % room.players.length;
    io.to(roomId).emit('stateUpdate', room);
  });
});

//
// マス処理
//
function handleTile(player, tile, room) {

  if (tile.type === "chance") {
    room.lastMessage = drawChance(player, room);
    return;
  }

  if (tile.type === "community") {
    room.lastMessage = drawCommunity(player, room);
    return;
  }

  if (tile.type === "gotojail") {
    player.pos = 12;
    player.jail = true;
    player.jailTurn = 0;
    room.lastMessage = `${player.name} は刑務所へ行く！`;
    return;
  }

  if (tile.type === "jail") {
    room.lastMessage = `${player.name} は刑務所を訪問中（Just Visiting）`;
    return;
  }

  if (tile.type === "property") {

    if (!tile.owner) {
      if (player.money >= tile.price) {
        tile.owner = player.id;
        player.money -= tile.price;
        player.properties.push(tile.name);
        room.lastMessage = `${player.name} が ${tile.name} を購入！`;
      }
    } else if (tile.owner !== player.id) {
      let fee = tile.fee;

      const owner = room.players.find(p => p.id === tile.owner);
      if (hasFullColorSet(owner, room.board, tile.color)) fee *= 2;
      if (tile.house > 0) fee += tile.house * 20;
      if (tile.hotel) fee += 100;

      player.money -= fee;
      room.lastMessage = `${player.name} は ${tile.name} の家賃 ${fee} を支払った`;
    }
  }
}

http.listen(3000, () => console.log('http://localhost:3000'));
