const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const cellSize = canvas.width / 19; // Adjusted to fill the canvas width
const gridSize = 19;
let board = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
let currentPlayer = 'black';
let myRole = null;

const socket = io.connect('http://localhost:3000');

canvas.addEventListener('mousedown', function(e) {
    if (myRole !== currentPlayer) return; // Ensure the player can only move on their turn

    let x = Math.round((e.offsetX - cellSize / 2) / cellSize);
    let y = Math.round((e.offsetY - cellSize / 2) / cellSize);

    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize && !board[y][x]) {
        board[y][x] = currentPlayer;
        drawBoard();
    
        socket.emit('move', { x: x, y: y, player: currentPlayer });

        currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
        updatePlayerDisplay();  
    }
});

const resetButton = document.getElementById('resetButton');
resetButton.addEventListener('click', resetGame);

let playerId = localStorage.getItem('playerId');
if (playerId) {
    socket.emit('checkRole', playerId);
}

socket.on('setRole', (role) => {
    // Set the role for this client and store their ID if not already stored
    currentPlayer = role;
    if (!playerId) {
        playerId = socket.id;
        localStorage.setItem('playerId', playerId);
    }
    updatePlayerDisplay();
});

// When receiving a move from the server:
socket.on('move', function(data) {
    board[data.y][data.x] = data.player;
    drawBoard();
    currentPlayer = data.player === 'black' ? 'white' : 'black';  // Swap the currentPlayer
    updatePlayerDisplay();
});

socket.on('player_status', function(data) {
    if (data.status === 'watch') {
        // For the sake of simplicity, we'll just display an alert
        alert("You're watching the game. Wait for your turn to play.");
    } else if (data.status === 'play') {
        currentPlayer = data.color;
        updatePlayerDisplay();
    }
});

socket.on('update_turn', function(newPlayer) {
    currentPlayer = newPlayer;
    updatePlayerDisplay();
});

socket.on('role', function(role) {
    myRole = role;
    const roleElement = document.getElementById('roleStone');

    // Update the role display based on the role assigned by the server
    if (role === 'observer') {
        roleElement.textContent = "Observer";
        roleElement.style.backgroundColor = 'transparent';
    } else {
        roleElement.textContent = "";
        roleElement.style.backgroundColor = role;
    }
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

function resetGame() {
    board = Array(19).fill().map(() => Array(19).fill(null));
    currentPlayer = 'black';
    drawBoard();
    updatePlayerDisplay(); 
}

function resetGame() {
    board = Array(19).fill().map(() => Array(19).fill(null));
    drawBoard();
}

drawBoard();
updatePlayerDisplay();





