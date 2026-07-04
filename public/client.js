const socket = io();
let myId = null;

function joinGame() {
  const roomId = document.getElementById('room').value;
  const name = document.getElementById('name').value;
  socket.emit('joinRoom', roomId, name);
}

// 自分のIDを取得
socket.on('connect', () => {
  myId = socket.id;
});

socket.on('stateUpdate', (state) => {
  renderBoard(state.board);
  renderPlayers(state.players, state.turn);

  // ★ 手番チェック：自分の番ならボタンを有効化
  const currentPlayer = state.players[state.turn];
  const diceBtn = document.querySelector("button[onclick='rollDice()']");

  if (currentPlayer.id === myId) {
    diceBtn.disabled = false;
    diceBtn.style.opacity = "1";
  } else {
    diceBtn.disabled = true;
    diceBtn.style.opacity = "0.5";
  }
});

function rollDice() {
  const roomId = document.getElementById('room').value;
  socket.emit('rollDice', roomId);
}

function renderBoard(board) {
  const boardDiv = document.getElementById('board');
  boardDiv.innerHTML = '';

  board.forEach((tile, i) => {
    const div = document.createElement('div');
    div.className = 'tile';

    if (tile.type === 'property') div.style.background = '#ffeaa7';
    if (tile.type === 'event') div.style.background = '#fab1a0';
    if (tile.type === 'start') div.style.background = '#81ecec';

    div.innerHTML = `${i}<br>${tile.name}`;
    boardDiv.appendChild(div);
  });
}

function renderPlayers(players, turn) {
  const playersDiv = document.getElementById('players');
  playersDiv.innerHTML = '';

  players.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'player';
    div.innerHTML = `
      ${i === turn ? '👉 ' : ''}${p.name}<br>
      位置: ${p.pos}<br>
      所持金: ${p.money}<br>
      物件: ${p.properties.join(', ')}
    `;
    playersDiv.appendChild(div);
  });
}
