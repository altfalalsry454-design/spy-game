JavaScript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let players = [];

io.on('connection', (socket) => {
    console.log('لاعب جديد دخل السيرفر:', socket.id);

    socket.on('joinGame', (name) => {
        players.push({ id: socket.id, name: name });
        io.emit('updatePlayers', players);
    });

    // التكة اللي ناقصة: السيرفر بياخد الصوت ويبعته للكل
    socket.on('audioStream', (audioData) => {
        socket.broadcast.emit('audioStream', { id: socket.id, data: audioData });
    });

    socket.on('disconnect', () => {
        players = players.filter(p => p.id !== socket.id);
        io.emit('updatePlayers', players);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`السيرفر شغال على بورت ${PORT}`);
});
