const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const cellSize = canvas.width / 19; // Adjusted to fill the canvas width
const gridSize = 19;
let board = Array(gridSize).fill().map(() => Array(gridSize).fill(null));
let currentPlayer = 'black';

const socket = io.connect('http://localhost:3000');

canvas.addEventListener('click', function(e) {
    let x = Math.round((e.offsetX - cellSize / 2) / cellSize);
    let y = Math.round((e.offsetY - cellSize / 2) / cellSize);
    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize && !board[y][x]) {
        if (!board[y][x]) {
            board[y][x] = currentPlayer;
            drawBoard();
    
            // When making a move:
            socket.emit('move', { x: x, y: y, player: currentPlayer });
    
            if (checkWin(x, y)) {
                setTimeout(() => {  // Delay the alert
                    alert(currentPlayer + ' wins!');
                    resetGame();
                }, 10); 
            } else {
                currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
            }  
        }
    }
});


// When receiving a move from the server:
socket.on('move', function(data) {
    board[data.y][data.x] = data.player;
    drawBoard();
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

function checkDirection(dx, dy, x, y) {
    let count = 0;
    let player = board[y][x];
    
    for (let i = 0; i < 5; i++) {
        let nx = x + dx * i;
        let ny = y + dy * i;

        if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) break;  // Adjusted to gridSize
        if (board[ny][nx] === player) count++;
        else break;
    }

    for (let i = 1; i < 5; i++) {
        let nx = x - dx * i;
        let ny = y - dy * i;

        if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) break;  // Adjusted to gridSize
        if (board[ny][nx] === player) count++;
        else break;
    }

    return count >= 5;
}

function checkWin(x, y) {
    // Check horizontally, vertically, and both diagonals
    return checkDirection(1, 0, x, y) || // Horizontal
           checkDirection(0, 1, x, y) || // Vertical
           checkDirection(1, 1, x, y) || // Diagonal from top-left to bottom-right
           checkDirection(1, -1, x, y);  // Diagonal from bottom-left to top-right
}

function resetGame() {
    board = Array(19).fill().map(() => Array(19).fill(null));
    currentPlayer = 'black';
    drawBoard();
}

drawBoard();





