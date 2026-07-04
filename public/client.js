const socket = io();

// ルーム参加
function joinGame() {
  const roomId = document.getElementById("room").value;
  const name = document.getElementById("name").value;

  socket.emit("joinRoom", roomId, name);
  document.querySelector(".join-box").style.display = "none";
}

// サイコロを振る（1つに変更）
function rollDice() {
  const roomId = document.getElementById("room").value;
  socket.emit("rollDice", roomId);
}

// チャット送信
function sendChat() {
  const roomId = document.getElementById("room").value;
  const text = document.getElementById("chat-input").value;
  if (!text) return;

  socket.emit("chatMessage", roomId, text);
  document.getElementById("chat-input").value = "";
}

// サイコロ結果（1つ＋アニメーション）
socket.on("diceResult", ({ dice1, total }) => {
  const diceBox = document.getElementById("dice");
  const resultText = document.getElementById("dice-result");
  const diceSound = document.getElementById("dice-sound");

  diceSound.currentTime = 0;
  diceSound.play();

  resultText.innerText = `🎲 ${dice1}`;

  diceBox.innerHTML = `
    <div class="dice-face animate">🎲${dice1}</div>
  `;
});

// stateUpdate（ターン制限＋盤面更新）
socket.on("stateUpdate", (state) => {
  window.latestPlayers = state.players;

  renderBoard(state.board);
  renderPlayerIcons(state.board);

  const msgBox = document.getElementById("message-box");
  msgBox.innerText = state.lastMessage || "";

  const rollBtn = document.getElementById("roll-button");
  rollBtn.disabled = state.players[state.turn].id !== socket.id;

  renderPlayers(state.players, state.turn);
});

// チャット受信
socket.on("chatMessage", (msg) => {
  const box = document.getElementById("chat-box");
  const div = document.createElement("div");
  div.innerHTML = `<b>${msg.name}:</b> ${msg.text}`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
});

// 盤面描画（変更なし）
function renderBoard(board) {
  const boardDiv = document.getElementById("board");
  boardDiv.innerHTML = "";

  const size = 500;
  const tileSize = 80;

  board.forEach((tile, index) => {
    const div = document.createElement("div");
    div.className = "tile";

    let x = 0, y = 0;

    if (index < 6) {
      x = index * tileSize;
      y = 0;
    } else if (index < 11) {
      x = size - tileSize;
      y = (index - 5) * tileSize;
    } else if (index < 16) {
      x = size - tileSize - (index - 10) * tileSize;
      y = size - tileSize;
    } else {
      x = 0;
      y = size - tileSize - (index - 15) * tileSize;
    }

    div.style.left = x + "px";
    div.style.top = y + "px";

    if (tile.type === "start") div.innerText = "GO";
    else if (tile.type === "jail") div.innerText = "刑務所";
    else if (tile.type === "chance") div.innerText = "？";
    else if (tile.type === "community") div.innerText = "箱";
    else if (tile.type === "property") {
      div.style.background = getColor(tile.color);
      div.innerHTML = `<div>${tile.name}</div>`;
    }

    boardDiv.appendChild(div);
  });
}

// 駒描画（アニメーション）
function renderPlayerIcons(board) {
  const players = window.latestPlayers || [];
  const layer = document.getElementById("player-layer");
  layer.innerHTML = "";

  const tileSize = 80;
  const size = 500;

  players.forEach((p) => {
    const icon = document.createElement("div");
    icon.className = "player-icon";
    icon.style.background = p.color;

    let x = 0, y = 0;
    const index = p.pos;

    if (index < 6) {
      x = index * tileSize;
      y = 0;
    } else if (index < 11) {
      x = size - tileSize;
      y = (index - 5) * tileSize;
    } else if (index < 16) {
      x = size - tileSize - (index - 10) * tileSize;
      y = size - tileSize;
    } else {
      x = 0;
      y = size - tileSize - (index - 15) * tileSize;
    }

    icon.style.transform = `translate(${x + 30}px, ${y + 30}px)`;

    layer.appendChild(icon);
  });
}

// 色グループの色
function getColor(color) {
  const colors = {
    brown: "#8B4513",
    lightblue: "#87CEFA",
    pink: "#FF69B4",
    orange: "#FFA500",
    red: "#FF0000",
    yellow: "#FFFF00",
    green: "#008000",
    blue: "#0000FF"
  };
  return colors[color] || "#ccc";
}

// プレイヤー情報表示
function renderPlayers(players, turn) {
  const playersDiv = document.getElementById("players-center");
  playersDiv.innerHTML = "";

  players.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "player";

    div.innerHTML = `
      <div>${p.name} ${i === turn ? "← 手番" : ""}</div>
      <div>位置: ${p.pos}</div>
      <div>所持金: ${p.money}</div>
      <div>物件: ${p.properties.join(", ")}</div>
    `;

    playersDiv.appendChild(div);
  });
}
