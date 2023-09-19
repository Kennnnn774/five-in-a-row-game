const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const cellSize = canvas.width / 19; // Adjusted to fill the canvas width
const gridSize = 19;
let board = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
let currentPlayer = 'black';
let myRole = null;
let playerId = null;
let tabId = null;
let onlineMode = true; // By default, the game is in online mode

const playOnlineButton = document.getElementById('playOnline');
const playLocallyButton = document.getElementById('playLocally');
const gameModeHeader = document.getElementById('gameModeHeader');

const socket = io.connect('http://localhost:3000'); 

playOnlineButton.addEventListener('click', function() {
    onlineMode = true;
    resetGame();
    socket.connect();
    socket.emit("onlinemode");
    updateGameModeHeader();
});

playLocallyButton.addEventListener('click', function() {
    onlineMode = false;
    resetGame();
    socket.emit('resetGame');
    disconnectFromServer(); 
    updateGameModeHeader();
});

const playAIButton = document.getElementById('playAI');
playAIButton.addEventListener('click', function() {
    onlineMode = true;  
    resetGame();
    socket.connect();
    socket.emit('playAgainstAI');  
    gameModeHeader.innerText = "Mode: play AI";
});

function updateGameModeHeader() {
    if (onlineMode === true) {
        gameModeHeader.innerText = "Mode: Online";
    } else if (onlineMode === false) {
        gameModeHeader.innerText = "Mode: Local";
    } 
}

function disconnectFromServer() {
    if (socket) {
        socket.disconnect(); 
    } 
}

playerId = sessionStorage.getItem('playerId');
console.log('session saved', playerId);
if(onlineMode){
    if (playerId) {
        console.log('client exist', playerId);
        socket.emit('getOldPlayer', playerId, (response) => {
            playerId = response.socketId;
            myRole = response.role;
            updateRoleDisplay(myRole);        
        });
    } else {
        socket.emit('createNewPlayer', (response) => {
            sessionStorage.setItem('playerId', response.socketId);
            playerId = sessionStorage.getItem('playerId');
            myRole = response.role;
            updateRoleDisplay(myRole);
            console.log('session saved check', playerId);
        });    
    }   
}

socket.on('board', (data) =>{
    board = data;
    drawBoard();
});
socket.on('currentPlayer', (data) =>{
    currentPlayer = data;
    updatePlayerDisplay();
});

socket.on('move', function(data) {
    board[data.y][data.x] = data.player;
    drawBoard();
    currentPlayer = data.player === 'black' ? 'white' : 'black';  
    updatePlayerDisplay();
});

socket.on('gameWon', (role) => {
    alert(`${role} wins the game!`);
    resetGame(); 

});

socket.on('waitingForPlayers', (message) => {
    resetGame();
    alert(message);
});

socket.on('gameReset', () => {
    alert(`game is reset!`);
    resetGame(); 
});

canvas.addEventListener('mousedown', function (e) {
    let x = Math.round((e.offsetX - cellSize / 2) / cellSize);
    let y = Math.round((e.offsetY - cellSize / 2) / cellSize);

    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize && !board[y][x]) {
        if (onlineMode){
            if (myRole && myRole !== currentPlayer) return;
            board[y][x] = currentPlayer;
            socket.emit('move', { x: x, y: y, player: currentPlayer });
        } else {
            board[y][x] = currentPlayer;
            if (localCheckWin(x, y, currentPlayer)){
                drawBoard();
                setTimeout(function(){
                    alert(`${currentPlayer} wins the game!`);
                    resetGame();
                }, 10);
                return;
            }
        }

        drawBoard();
        currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
        updatePlayerDisplay();
    }

});

const resetButton = document.getElementById('resetButton');
resetButton.addEventListener('click', function (e) {
    resetGame();
    if (onlineMode) socket.emit('resetGame');
});

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(cellSize / 2 + i * cellSize, cellSize / 2);
        ctx.lineTo(cellSize / 2 + i * cellSize, canvas.height - cellSize / 2);
        ctx.moveTo(cellSize / 2, cellSize / 2 + i * cellSize);
        ctx.lineTo(canvas.width - cellSize / 2, cellSize / 2 + i * cellSize);
        ctx.strokeStyle = '#000';
        ctx.stroke();
    }

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (board[y][x]) {
                ctx.beginPath();
                ctx.arc(cellSize / 2 + x * cellSize, cellSize / 2 + y * cellSize, cellSize / 2.5, 0, 2 * Math.PI);
                ctx.fillStyle = board[y][x];
                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                ctx.shadowBlur = 5;
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 3;
                ctx.fill();
                ctx.shadowColor = 'transparent';
            }
        }
    }
}

function updatePlayerDisplay() {
    const currentStoneEl = document.getElementById('currentStone');
    currentStoneEl.style.backgroundColor = currentPlayer;
}

function updateRoleDisplay(role){
    const roleElement = document.getElementById('roleStone');
    if (role === 'observer') {
        roleElement.textContent = "Observer";
        roleElement.style.backgroundColor = 'transparent';
    } else {
        roleElement.textContent = "";
        roleElement.style.backgroundColor = role;
    }
}


function resetGame() {
    board = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
    currentPlayer = 'black';
    drawBoard();
    updatePlayerDisplay();
}

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}


drawBoard();
updatePlayerDisplay();


function checkDirection(dx, dy, x, y, player) {
    let count = 0;

    for (let i = 0; i < 5; i++) {
        let nx = x + dx * i;
        let ny = y + dy * i;

        if (nx < 0 || ny < 0 || nx >= 19 || ny >= 19) break;
        if (board[ny][nx] === player) count++;
        else break;
    }

    for (let i = 1; i < 5; i++) {
        let nx = x - dx * i;
        let ny = y - dy * i;

        if (nx < 0 || ny < 0 || nx >= 19 || ny >= 19) break;
        if (board[ny][nx] === player) count++;
        else break;
    }

    return count >= 5;
}

function localCheckWin(x, y, player) {
    return checkDirection(1, 0, x, y, player) ||  // Horizontal
           checkDirection(0, 1, x, y, player) ||  // Vertical
           checkDirection(1, 1, x, y, player) ||  // Diagonal from top-left to bottom-right
           checkDirection(1, -1, x, y, player);   // Diagonal from bottom-left to top-right
}