const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let board = Array(19).fill().map(() => Array(19).fill(null));
const gridSize = 19;
let currentPlayer = 'black'; // Start with the black player
let playerRoles = new Map(); 
app.use(express.static('public')); 

let aiMode = false;

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    console.log(playerRoles);  
    console.log('------------------')

    socket.on('playAgainstAI', () => {
        aiMode = true;
        resetGame();
    });

    socket.on('onlinemode', () => {
        aiMode = false;
        resetGame();
    });

    socket.on('getOldPlayer', (id, callback) => {
        if (playerRoles.has(id)) {
            console.log('reconnected player', id);
            let role = playerRoles.get(id);
            callback({
                socketId: socket.id, role: role
            });
        }else {
            callback({ error: 'Player not found' });
        }
    });

    socket.on('createNewPlayer', (callback) => {
        let role = null;
        console.log(playerRoles.size);

        if (playerRoles.size < 2) {
            role = playerRoles.size === 0 ? 'black' : 'white';
            playerRoles.set(socket.id, role);
        } else {
            role = 'observer';
        } 
        playerRoles.set(socket.id, role);       
        callback({
            socketId: socket.id, role: role
        });
    });

    io.emit('board', board);
    io.emit('currentPlayer', currentPlayer);
    

    socket.on('resetGame', () => {
        resetGame();
        io.emit('gameReset');
        console.log("game is reset!");
    })

    socket.on('move', (data) => {
        let playerRole = data.player;
        if (aiMode &&!board[data.y][data.x] && 
            data.x >= 0 && data.x < gridSize && data.y >= 0 && data.y < gridSize) {
            board[data.y][data.x] = playerRole;
            currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
            io.emit('move', data);
            aiMove(); // Make the AI move
            if (checkWin(data.x, data.y, playerRole)) { 
                io.emit('gameWon', playerRole); 
                console.log("gamewon", playerRole);
                resetGame();
            } 
        }
        if (!aiMode){
            if (playerRoles.size < 2) {
                socket.emit('waitingForPlayers', 'Waiting for another player to join...');
                resetGame();
                return;  // Exit early if not enough players
            }else{
                if (playerRole && playerRole === currentPlayer && !board[data.y][data.x] && 
                    data.x >= 0 && data.x < gridSize && data.y >= 0 && data.y < gridSize) {
                    board[data.y][data.x] = currentPlayer;
                    currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
                    io.emit('move', data); 
                    if (checkWin(data.x, data.y, playerRole)) { 
                        io.emit('gameWon', playerRole); 
                        console.log("gamewon", playerRole);
                        resetGame();
                    } 
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

server.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});

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

function checkWin(x, y, player) {
    return checkDirection(1, 0, x, y, player) ||  
           checkDirection(0, 1, x, y, player) ||  
           checkDirection(1, 1, x, y, player) ||  
           checkDirection(1, -1, x, y, player);   
}

function resetGame() {
    board = Array(19).fill().map(() => Array(19).fill(null));
    currentPlayer = 'black'
}

function aiMove() {
    // try to block the black stone
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (!board[y][x] && wouldFormNConsecutive(x, y, 'black', 4)) {
                board[y][x] = 'white';
                io.emit('move', { x: x, y: y, player: 'white' });
                if (checkWin(x, y, 'white')) { 
                    setTimeout(function(){
                        io.emit('gameWon', 'white'); 
                    }, 10);
                    resetGame();
                } 
                return;
            }
        }
    }

    // If not blocking, try to form five-in-a-row
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (!board[y][x] && wouldFormNConsecutive(x, y, 'white', 2)) {
                board[y][x] = 'white';
                io.emit('move', { x: x, y: y, player: 'white' });
                if (checkWin(x, y, 'white')) { 
                    setTimeout(function(){
                        io.emit('gameWon', 'white'); 
                    }, 10);
                    resetGame();
                } 
                return;
            }
        }
    }

    // If none of the above, just place a stone randomly
    while (true) {
        let x = Math.floor(Math.random() * gridSize);
        let y = Math.floor(Math.random() * gridSize);
        if (!board[y][x]) {
            board[y][x] = 'white';
            io.emit('move', { x: x, y: y, player: 'white' });
            if (checkWin(x, y, 'white')) { 
                setTimeout(function(){
                    io.emit('gameWon', 'white'); 
                }, 10);
                resetGame();
            } 
            return;
        }
    }
}

function wouldFormNConsecutive(x, y, player, n) {
    const tempBoard = JSON.parse(JSON.stringify(board));
    tempBoard[y][x] = player;
    return checkNInARowWithBoard(tempBoard, x, y, player, n);
}

function checkNInARowWithBoard(board, x, y, player, n) {
    return checkDirectionCount(1, 0, x, y, player, board) >= n || 
           checkDirectionCount(0, 1, x, y, player, board) >= n || 
           checkDirectionCount(1, 1, x, y, player, board) >= n || 
           checkDirectionCount(1, -1, x, y, player, board) >= n;
}

function checkDirectionCount(dx, dy, x, y, player, board) {
    let count = 1; 
    count += countDirection(dx, dy, x, y, player, board);
    count += countDirection(-dx, -dy, x, y, player, board);
    return count;
}

function countDirection(dx, dy, x, y, player, board) {
    let count = 0;
    x += dx;
    y += dy;
    while (x >= 0 && x < board.length && y >= 0 && y < board[0].length && board[y][x] === player) {
        count++;
        x += dx;
        y += dy;
    }
    return count;
}



