const socket = io();

function joinGame() {
  const roomId = document.getElementById('room').value;
  const name = document.getElementById('name').value;
  socket.emit('joinRoom', roomId, name);
}

socket.on('stateUpdate', (state) => {
  renderBoard(state.board);
  renderPlayers(state.players, state.turn);
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
    div.innerHTML = `${i}: ${tile.name}`;
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
