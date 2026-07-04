const socket = io();

// ルーム参加
function joinGame() {
  const roomId = document.getElementById("room").value;
  const name = document.getElementById("name").value;

  socket.emit("joinRoom", roomId, name);

  // ★ 参加欄を非表示にする
  document.querySelector(".join-box").style.display = "none";
}

// サイコロを振る
function rollDice() {
  const roomId = document.getElementById("room").value;
  socket.emit("rollDice", roomId);
}

// 家を建てる
function buildHouse(index) {
  const roomId = document.getElementById("room").value;
  socket.emit("buildHouse", roomId, index);
}

// サイコロ結果（音＋3D回転）
socket.on("diceResult", (dice) => {
  const diceBox = document.getElementById("dice");
  const resultText = document.getElementById("dice-result");
  const diceSound = document.getElementById("dice-sound");

  // 音
  diceSound.currentTime = 0;
  diceSound.play();

  // 表示
  resultText.innerText = `🎲 ${dice}`;

  // 3D回転
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

// stateUpdate（盤面・プレイヤー・メッセージ更新）
socket.on("stateUpdate", (state) => {
  renderBoard(state.board);
  renderPlayers(state.players, state.turn);

  // メッセージ表示
  const msgBox = document.getElementById("message-box");
  if (state.lastMessage) {
    msgBox.innerText = state.lastMessage;
  }
});

// 盤面表示
function renderBoard(board) {
  const boardDiv = document.getElementById("board");
  boardDiv.innerHTML = "";

  board.forEach((tile, index) => {
    const div = document.createElement("div");
    div.className = "tile";

    // 色物件の背景色
    if (tile.type === "property") {
      div.style.borderLeft = `10px solid ${getColor(tile.color)}`;
    }

    div.innerHTML = `
      <div>${index}: ${tile.name}</div>
      ${tile.type === "property" ? `
        <div>価格: ${tile.price}</div>
        <div>家賃: ${tile.fee}</div>
        <div>家: ${tile.house}</div>
        <div>ホテル: ${tile.hotel ? "あり" : "なし"}</div>
        <button onclick="buildHouse(${index})">家を建てる</button>
      ` : ""}
    `;

    boardDiv.appendChild(div);
  });
}

// 色コード
function getColor(color) {
  const colors = {
    brown: "#8B4513",
    lightblue: "#87CEFA",
    pink: "#FF69B4"
  };
  return colors[color] || "#ccc";
}

// プレイヤー表示
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
