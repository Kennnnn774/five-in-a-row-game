const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let board = Array(19).fill().map(() => Array(19).fill(null));
let currentPlayer = 'black'; // Start with the black player

app.use(express.static('public')); // Assuming your client-side files are in a 'public' directory

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.emit('board', board); // Send the current board state to the newly connected player
    
    socket.on('move', (data) => {
        if (data.player === currentPlayer && !board[data.y][data.x]) {
            board[data.y][data.x] = currentPlayer;

            // Swap players after each move
            currentPlayer = currentPlayer === 'black' ? 'white' : 'black';

            io.emit('move', data); // Send the move to all connected clients
        }
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

server.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
