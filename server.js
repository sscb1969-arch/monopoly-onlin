const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

//
// 盤面生成（20マス）
//
function generateBoard() {
  return [
    // 上辺（0〜5）
    { type: 'start', name: 'GO', amount: 200 }, // 0
    { type: 'property', name: '茶色1', color: 'brown', price: 60, fee: 20, house: 0, hotel: false, housePrice: 50 }, // 1
    { type: 'property', name: '水色1', color: 'lightblue', price: 100, fee: 30, house: 0, hotel: false, housePrice: 50 }, // 2
    { type: 'chance', name: 'チャンス' }, // 3
    { type: 'property', name: 'ピンク1', color: 'pink', price: 140, fee: 50, house: 0, hotel: false, housePrice: 100 }, // 4
    { type: 'property', name: '赤1', color: 'red', price: 220, fee: 90, house: 0, hotel: false, housePrice: 150 }, // 5

    // 右辺（6〜10）
    { type: 'property', name: '茶色2', color: 'brown', price: 60, fee: 20, house: 0, hotel: false, housePrice: 50 }, // 6
    { type: 'community', name: 'コミュニティ' }, // 7
    { type: 'property', name: '水色2', color: 'lightblue', price: 100, fee: 30, house: 0, hotel: false, housePrice: 50 }, // 8
    { type: 'property', name: 'ピンク2', color: 'pink', price: 140, fee: 50, house: 0, hotel: false, housePrice: 100 }, // 9
    { type: 'property', name: '赤2', color: 'red', price: 220, fee: 90, house: 0, hotel: false, housePrice: 150 }, // 10

    // 下辺（11〜15）
    { type: 'jail', name: '刑務所' }, // 11
    { type: 'property', name: 'オレンジ1', color: 'orange', price: 180, fee: 70, house: 0, hotel: false, housePrice: 100 }, // 12
    { type: 'property', name: '水色3', color: 'lightblue', price: 120, fee: 40, house: 0, hotel: false, housePrice: 50 }, // 13
    { type: 'property', name: 'ピンク3', color: 'pink', price: 160, fee: 60, house: 0, hotel: false, housePrice: 100 }, // 14
    { type: 'chance', name: 'チャンス' }, // 15

    // 左辺（16〜19）
    { type: 'property', name: '赤3', color: 'red', price: 240, fee: 100, house: 0, hotel: false, housePrice: 150 }, // 16
    { type: 'property', name: 'オレンジ2', color: 'orange', price: 180, fee: 70, house: 0, hotel: false, housePrice: 100 }, // 17
    { type: 'property', name: 'オレンジ3', color: 'orange', price: 200, fee: 80, house: 0, hotel: false, housePrice: 100 }, // 18
    { type: 'community', name: 'コミュニティ' }, // 19
  ];
}

//
// カード
//
const chanceCards = [
  { type: "money", amount: 200, text: "銀行から200もらう" },
  { type: "money", amount: -100, text: "罰金100を払う" },
  { type: "move", steps: 3, text: "3マス進む" },
  { type: "move", steps: -2, text: "2マス戻る" },
  { type: "goto", pos: 0, text: "GOへ移動（+200）" },
  { type: "goto", pos: 12, text: "刑務所へ行く" },
];

const communityCards = [
  { type: "money", amount: 100, text: "銀行から100もらう" },
  { type: "money", amount: -50, text: "医療費として50払う" },
  { type: "move", steps: 2, text: "2マス進む" },
  { type: "move", steps: -1, text: "1マス戻る" },
  { type: "goto", pos: 0, text: "GOへ移動（+200）" },
  { type: "goto", pos: 12, text: "刑務所へ行く" },
];

function hasFullColorSet(player, board, color) {
  const tiles = board.filter(t => t.type === 'property' && t.color === color);
  return tiles.every(t => t.owner === player.id);
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
        lastMessage: "ゲーム開始！",
        waitingForChoice: null
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
  // 物件選択（購入 / 建設 / スルー）
  //
  socket.on("propertyChoice", (roomId, choice) => {
    const room = rooms[roomId];
    const wait = room.waitingForChoice;
    if (!wait) return;

    const player = room.players.find(p => p.id === wait.playerId);
    const tile = room.board[wait.tileIndex];

    if (choice === "buy") {
      if (player.money >= tile.price) {
        tile.owner = player.id;
        player.money -= tile.price;
        player.properties.push(tile.name);
        room.lastMessage = `${player.name} が ${tile.name} を購入しました！`;
      } else {
        room.lastMessage = `${player.name} はお金が足りません。`;
      }
    }

    if (choice === "build") {
      if (hasFullColorSet(player, room.board, tile.color)) {
        if (player.money >= tile.housePrice) {
          tile.house++;
          player.money -= tile.housePrice;
          room.lastMessage = `${tile.name} に家を建てました！`;
        } else {
          room.lastMessage = `お金が足りません。`;
        }
      } else {
        room.lastMessage = `色グループを揃えていないので建設できません。`;
      }
    }

    if (choice === "skip") {
      tile.price = Math.floor(tile.price * 1.2);
      room.lastMessage = `${tile.name} の価格が上昇しました（${tile.price}）`;
    }

    room.waitingForChoice = null;
    io.to(roomId).emit("stateUpdate", room);
  });

  //
  // サイコロ（2つ）
  //
  socket.on('rollDice', (roomId) => {
    const room = rooms[roomId];
    const player = room.players[room.turn];

    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;

    io.to(roomId).emit("diceResult", { dice1, dice2, total });

    const oldPos = player.pos;
    player.pos = (player.pos + total) % room.board.length;

    if (oldPos + total >= room.board.length) {
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
      room.waitingForChoice = {
        playerId: player.id,
        tileIndex: player.pos
      };
      room.lastMessage = `${player.name} は ${tile.name} に止まりました。購入しますか？`;
      return;
    }

    if (tile.owner !== player.id) {
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

//
// チャンス
//
function drawChance(player, room) {
  const card = chanceCards[Math.floor(Math.random() * chanceCards.length)];

  if (card.type === "money") {
    player.money += card.amount;
  }

  if (card.type === "move") {
    player.pos = (player.pos + card.steps + room.board.length) % room.board.length;
  }

  if (card.type === "goto") {
    player.pos = card.pos;
    if (card.pos === 0) player.money += 200;
  }

  return card.text;
}

//
// コミュニティ
//
function drawCommunity(player, room) {
  const card = communityCards[Math.floor(Math.random() * communityCards.length)];

  if (card.type === "money") {
    player.money += card.amount;
  }

  if (card.type === "move") {
    player.pos = (player.pos + card.steps + room.board.length) % room.board.length;
  }

  if (card.type === "goto") {
    player.pos = card.pos;
    if (card.pos === 0) player.money += 200;
  }

  return card.text;
}

http.listen(3000, () => console.log('http://localhost:3000'));
