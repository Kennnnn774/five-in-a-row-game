const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let board = Array(19).fill().map(() => Array(19).fill(null));
let currentPlayer = 'black'; // Start with the black player
let players = [];
let playerRoles = new Map(); 

app.use(express.static('public')); // Assuming your client-side files are in a 'public' directory

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    let reconnectedPlayer = false;

    socket.on('checkRole', (id) => {
        if (playerRoles.has(id)) {
            reconnectedPlayer = true;
            let role = playerRoles.get(id);
            socket.emit('setRole', role);
        }
    });

    // Assign roles to players
    if (players.length < 2) {
        let role = players.length === 0 ? 'black' : 'white';
        players.push({ id: socket.id, role: role });
        socket.emit('role', role);  // Inform the player of their role
    } else {
        socket.emit('role', 'observer');  // Inform that they are just an observer
    } 

    socket.emit('board', board); // Send the current board state to the newly connected player

    socket.on('move', (data) => {
        console.log('players', players);
        let player = players.find(p => p.id === socket.id);
        console.log('player.role', player.role);
        console.log('currentPlayer', currentPlayer);
        if (player && player.role === currentPlayer && !board[data.y][data.x]) {
            board[data.y][data.x] = currentPlayer;
            currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
            io.emit('move', data); // Send the move to all connected clients
            console.log('Broadcasted move to all clients', data);

            if (checkWin(data.x, data.y, player.role)) { // Assuming you implement a server-side checkWin function
                io.emit('gameWon', player.role); // Inform all clients about the win
                setTimeout(() => {
                    resetGame(); // Assuming you implement a server-side reset function
                    io.emit('gameReset'); // Inform all clients that the game has been reset
                }, 10000); // 10 seconds
            } 
        }  
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        players = players.filter(p => p.id !== socket.id);
        // If a player disconnects, you might want to handle reassignment or end the game
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

