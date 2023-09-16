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
app.use(express.static('public')); // Assuming your client-side files are in a 'public' directory

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    console.log(playerRoles);  
    console.log('------------------')

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
        console.log('create new player....')
        // Assign roles to players
        let role = null;
        console.log(playerRoles.size);

        if (playerRoles.size < 2) {
            role = playerRoles.size === 0 ? 'black' : 'white';
            playerRoles.set(socket.id, role);
        } else {
            role = 'observer';
        } 
        playerRoles.set(socket.id, role);
        console.log(playerRoles);        
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
        console.log(data);
        let playerRole = data.player;
        console.log('playerRole', playerRole);
        console.log('currentPlayer', currentPlayer);
        if (playerRole && playerRole === currentPlayer && !board[data.y][data.x] && 
            data.x >= 0 && data.x < gridSize && data.y >= 0 && data.y < gridSize && 
            playerRoles.size >=2) {
            board[data.y][data.x] = currentPlayer;
            currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
            io.emit('move', data); // Send the move to all connected clients
            console.log('Broadcasted move to all clients', data);
            if (checkWin(data.x, data.y, playerRole)) { // Assuming you implement a server-side checkWin function
                io.emit('gameWon', playerRole); // Inform all clients about the win
                console.log("gamewon", playerRole);
                resetGame();
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
    return checkDirection(1, 0, x, y, player) ||  // Horizontal
           checkDirection(0, 1, x, y, player) ||  // Vertical
           checkDirection(1, 1, x, y, player) ||  // Diagonal from top-left to bottom-right
           checkDirection(1, -1, x, y, player);   // Diagonal from bottom-left to top-right
}

function resetGame() {
    board = Array(19).fill().map(() => Array(19).fill(null));
    currentPlayer = 'black'
}

