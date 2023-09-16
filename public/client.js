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

const socket = io.connect('http://localhost:3000'); // Replace with your server URL

const playOnlineButton = document.getElementById('playOnline');
const playLocallyButton = document.getElementById('playLocally');
const gameModeHeader = document.getElementById('gameModeHeader');

playOnlineButton.addEventListener('click', function() {
    onlineMode = true;
    resetGame();
    connectToServer();
    updateGameModeHeader();
});

playLocallyButton.addEventListener('click', function() {
    onlineMode = false;
    resetGame();
    disconnectFromServer(); // This function will be defined below
    updateGameModeHeader();
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
        socket.disconnect(); // This disconnects the socket from the server
        resetGame();
    } 
}

function connectToServer() {
    if (!onlineMode) return;

    let tabId = sessionStorage.getItem('tabId');
    if (!tabId) {
        tabId = new Date().getTime() + '_' + Math.random(); // combining timestamp and random number for uniqueness
        sessionStorage.setItem('tabId', tabId);
        console.log(sessionStorage.getItem('tabId'));
    }

    playerId = getTabCookie('playerId');
    console.log('session saved', playerId);
    console.log("88888", sessionStorage.getItem('tabId'));
    if (playerId) {
        console.log('client exist', playerId);
        socket.emit('getOldPlayer', playerId, (response) => {
            setTabCookie('playerId', response.socketId, 7);
            playerId = response.socketId;
            myRole = response.role;
            updateRoleDisplay(myRole);        
        }    );
    } else {
        socket.emit('createNewPlayer', (response) => {
            // Callback function to handle the new player ID
            setTabCookie('playerId', response.socketId, 7);
            playerId = getTabCookie('playerId');
            myRole = response.role;
            updateRoleDisplay(myRole);
            console.log('session saved check', playerId);
        });    
    }
    socket.on('board', (data) =>{
        board = data;
        drawBoard();
    });
    socket.on('currentPlayer', (data) =>{
        currentPlayer = data;
        updatePlayerDisplay();
    });
    // When receiving a move from the server:
    socket.on('move', function(data) {
        board[data.y][data.x] = data.player;
        drawBoard();
        currentPlayer = data.player === 'black' ? 'white' : 'black';  // Swap the currentPlayer
        updatePlayerDisplay();
    });
    
    socket.on('gameWon', (role) => {
        alert(`${role} wins the game!`);
        resetGame(); // Reset the game
    
    });
    
    socket.on('gameReset', () => {
        alert(`game is reset!`);
        resetGame(); // Reset the game
    });
}

connectToServer();

canvas.addEventListener('mousedown', function (e) {
    if (onlineMode && myRole && myRole !== currentPlayer) return;

    let x = Math.round((e.offsetX - cellSize / 2) / cellSize);
    let y = Math.round((e.offsetY - cellSize / 2) / cellSize);

    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize && !board[y][x]) {
        board[y][x] = currentPlayer;
        socket.emit('move', { x: x, y: y, player: currentPlayer });
        drawBoard();
        currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
        updatePlayerDisplay();
    }
});

const resetButton = document.getElementById('resetButton');
resetButton.addEventListener('click', function (e) {
    resetGame();
    socket.emit('resetGame');
});



function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Drawing the grid
    for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(cellSize / 2 + i * cellSize, cellSize / 2);
        ctx.lineTo(cellSize / 2 + i * cellSize, canvas.height - cellSize / 2);
        ctx.moveTo(cellSize / 2, cellSize / 2 + i * cellSize);
        ctx.lineTo(canvas.width - cellSize / 2, cellSize / 2 + i * cellSize);
        ctx.strokeStyle = '#000';
        ctx.stroke();
    }

    // Drawing the pieces on intersections
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
    // Update the role display based on the role assigned by the server
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

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function setTabCookie(name, value, days) {
    const fullCookieName = name + '_' + tabId;
    setCookie(fullCookieName, value, days);
}

function getTabCookie(name) {
    const fullCookieName = name + '_' + tabId;
    return getCookie(fullCookieName);
}

function deleteTabCookie(name) {
    const fullCookieName = name + '_' + tabId;
    deleteCookie(fullCookieName);
}

function deleteCookie(name) { 
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/'; 
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

drawBoard();
updatePlayerDisplay();