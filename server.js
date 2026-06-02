const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// هنا بنخزن الغرف واللاعبين اللي جواها
let rooms = {}; 

io.on('connection', (socket) => {
    console.log('لاعب اتصل بالسيرفر:', socket.id);

    // 1. لما لاعب يعمل غرفة جديدة
    socket.on('createRoom', ({ name }) => {
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString(); // بيطلع كود عشوائي من 4 أرقام
        rooms[roomCode] = {
            admin: socket.id,
            players: [{ id: socket.id, name: name }],
            gameStarted: false
        };
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode, players: rooms[roomCode].players });
        console.log(`تم إنشاء غرفة جديدة بكود: ${roomCode}`);
    });

    // 2. لما لاعب يحب ينضم لغرفة موجودة بالكود
    socket.on('joinRoom', ({ name, roomCode }) => {
        if (!rooms[roomCode]) {
            return socket.emit('errorMsg', 'الكود ده غلط أو الروم مش موجودة يا شبح!');
        }
        if (rooms[roomCode].gameStarted) {
            return socket.emit('errorMsg', 'الجيم بدأ خلاص، اطلب من الأدمن يعمل روم جديدة.');
        }

        rooms[roomCode].players.push({ id: socket.id, name: name });
        socket.join(roomCode);
        
        // نبعت تحديث لكل اللي جوه الروم دي بالذات
        io.to(roomCode).emit('updatePlayers', { 
            players: rooms[roomCode].players, 
            adminId: rooms[roomCode].admin 
        });
    });

    // 3. لما الأدمن يدوس بدء الجيم
    socket.on('startGame', (roomCode) => {
        if (rooms[roomCode] && rooms[roomCode].admin === socket.id) {
            rooms[roomCode].gameStarted = true;
            io.to(roomCode).emit('gameStarted', { word: "جاسوس 🕵️" }); // تقدر تغير توزيع الكلمات هنا لاحقاً
        }
    });

    socket.on('disconnect', () => {
        // لو لاعب خرج، بنلف على الغرف ونمسحه منها
        for (let roomCode in rooms) {
            rooms[roomCode].players = rooms[roomCode].players.filter(p => p.id !== socket.id);
            if (rooms[roomCode].players.length === 0) {
                delete rooms[roomCode]; // لو الروم فضيت بنمسحها خالص
            } else {
                if (rooms[roomCode].admin === socket.id) {
                    rooms[roomCode].admin = rooms[roomCode].players[0].id; // لو الأدمن خرج بنعطي الأدمن للي بعده
                }
                io.to(roomCode).emit('updatePlayers', { 
                    players: rooms[roomCode].players, 
                    adminId: rooms[roomCode].admin 
                });
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`السيرفر شغال على بورت ${PORT}`));
