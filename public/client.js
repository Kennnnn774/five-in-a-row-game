
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const cellSize = canvas.width / 19; // Adjusted to fill the canvas width
const gridSize = 19;
let board = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
let currentPlayer = 'black';
let myRole = null;
let playerId = null;

const socket = io.connect('http://localhost:3000'); // Replace with your server URL

playerId = sessionStorage.getItem('playerId');
console.log('session saved', playerId);
if (playerId) {
    console.log('client exist', playerId);
    socket.emit('getOldPlayer', playerId, (response) => {
        playerId = response.socketId;
        myRole = response.role;
        updateRoleDisplay(myRole);        
    }    );
} else {
    socket.emit('createNewPlayer', (response) => {
        // Callback function to handle the new player ID
        sessionStorage.setItem('playerId', response.socketId);
        playerId = sessionStorage.getItem('playerId');
        myRole = response.role;
        updateRoleDisplay(myRole);
        console.log('session saved check', playerId);
    });    
}

// if( playerId || myRole === 'observer'){
//     // need get the saved board information
//     socket.emit('getBoard', (response) => {
//         board = response.board;
//         drawBoard();
//         console.log('here', board);
//     })
// };

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

canvas.addEventListener('mousedown', function (e) {
    if (myRole && myRole !== currentPlayer) return;

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

drawBoard();
updatePlayerDisplay();