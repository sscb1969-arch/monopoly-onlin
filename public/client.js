const socket = io();

// ルーム参加
function joinGame() {
  const roomId = document.getElementById("room").value;
  const name = document.getElementById("name").value;

  socket.emit("joinRoom", roomId, name);

  // 参加欄を非表示
  document.querySelector(".join-box").style.display = "none";
}

// サイコロを振る
function rollDice() {
  const roomId = document.getElementById("room").value;
  socket.emit("rollDice", roomId);
}

// 家を建てる（手動建設ボタン）
function buildHouse(index) {
  const roomId = document.getElementById("room").value;
  socket.emit("buildHouse", roomId, index);
}

// 物件選択（購入 / 建設 / スルー）
function chooseProperty(choice) {
  const roomId = document.getElementById("room").value;
  socket.emit("propertyChoice", roomId, choice);
}

// サイコロ結果（音＋3D回転）
socket.on("diceResult", (dice) => {
  const diceBox = document.getElementById("dice");
  const resultText = document.getElementById("dice-result");
  const diceSound = document.getElementById("dice-sound");

  diceSound.currentTime = 0;
  diceSound.play();

  resultText.innerText = `🎲 ${dice}`;

  const rotations = {
    1: "rotateX(0deg) rotateY(0deg)",
    2: "rotateY(-90deg)",
    3: "rotateY(180deg)",
    4: "rotateY(90deg)",
    5: "rotateX(-90deg)",
    6: "rotateX(90deg)"
  };
  diceBox.style.transform = rotations[dice];
});

// stateUpdate（盤面・プレイヤー・メッセージ・選択肢）
socket.on("stateUpdate", (state) => {
  window.latestPlayers = state.players;

  renderBoard(state.board);
  renderPlayers(state.players, state.turn);

  const msgBox = document.getElementById("message-box");
  msgBox.innerText = state.lastMessage || "";

  const choiceBox = document.getElementById("choice-box");
  choiceBox.innerHTML = "";

  if (state.waitingForChoice && state.waitingForChoice.playerId === socket.id) {
    choiceBox.innerHTML = `
      <button onclick="chooseProperty('buy')">購入する</button>
      <button onclick="chooseProperty('build')">家を建てる</button>
      <button onclick="chooseProperty('skip')">スルーする</button>
    `;
  }
});

// 正方形外周ボード表示
function renderBoard(board) {
  const boardDiv = document.getElementById("board");
  boardDiv.innerHTML = "";

  const size = 500;
  const tileSize = 80;

  board.forEach((tile, index) => {
    const div = document.createElement("div");
    div.className = "tile";

    // 外周配置
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

    // マスタイプごとの表示
    if (tile.type === "start") {
      div.classList.add("go");
      div.innerText = "GO";
    }

    else if (tile.type === "jail") {
      div.classList.add("jail");
      div.innerText = "刑務所";
    }

    else if (tile.type === "property") {
      div.style.background = getColor(tile.color);
      div.innerHTML = `<div>${tile.name}</div>`;

      if (tile.house > 0) {
        div.innerHTML += `<div class="house-icon">🏠×${tile.house}</div>`;
      }
      if (tile.hotel) {
        div.innerHTML += `<div class="hotel-icon">🏨</div>`;
      }

      div.innerHTML += `<button onclick="buildHouse(${index})">建設</button>`;
    }

    else if (tile.type === "chance") {
      div.style.background = "#ffeb3b";
      div.innerText = "？";
    }

    else if (tile.type === "community") {
      div.style.background = "#4fc3f7";
      div.innerText = "箱";
    }

    else if (tile.type === "gotojail") {
      div.style.background = "#000";
      div.style.color = "#fff";
      div.innerText = "→刑務所";
    }

    boardDiv.appendChild(div);
  });

  renderPlayerIcons(board);
}

// プレイヤーアイコン表示
function renderPlayerIcons(board) {
  const players = window.latestPlayers || [];
  const tiles = document.querySelectorAll("#board .tile");

  players.forEach((p) => {
    const tile = tiles[p.pos];
    if (!tile) return;

    const icon = document.createElement("div");
    icon.className = "player-icon";
    tile.appendChild(icon);
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
  const playersDiv = document.getElementById("players");
  playersDiv.innerHTML = "";

  players.forEach((p, i) => {
    const div = document.createElement("div");
    div.className = "player";

    div.innerHTML = `
      <div>${p.name} ${i === turn ? "← 手番" : ""}</div>
      <div>位置: ${p.pos}</div>
      <div>所持金: ${p.money}</div>
      <div>物件: ${p.properties.join(", ")}</div>
      <div>${p.jail ? "刑務所中" : ""}</div>
    `;

    playersDiv.appendChild(div);
  });
}
