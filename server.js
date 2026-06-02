// spy-game.js
const words = [
  { "category": "سهرات متأخرة", "normal": "كباريه", "spy": "ديسكو" },
  { "category": "علاقات معقدة", "normal": "شقط", "spy": "ارتباط" },
  { "category": "ليلة الدخلة", "normal": "سرير محطوط", "spy": "فرح في القاعة" },
  { "category": "مشاكل متزوجين", "normal": "حماة قفوشة", "spy": "سلفت الحربوقة" },
  { "category": "أكشن مصري", "normal": "خيانة زوجية", "spy": "قفشة في الدولاب" },
  { "category": "حاجات عيب", "normal": "بوسة في الضلمة", "spy": "غمزة في النور" }
];

let rooms = {};

// دالة دمج اللعبة مع سيرفر الـ Socket.io الحالي بتاع موقعك
module.exports = function initSpyGame(io) {
    io.on('connection', (socket) => {
        
        // إنشاء روم
        socket.on('spy_createRoom', ({ roomName, playerCount, map, password }) => {
            let roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
            rooms[roomCode] = {
                name: roomName,
                maxPlayers: parseInt(playerCount),
                map: map,
                password: password,
                players: [],
                gameStarted: false
            };
            socket.emit('spy_roomCreated', roomCode);
        });

        // انضمام للروم
        socket.on('spy_joinRoom', ({ roomCode, playerName }) => {
            let room = rooms[roomCode];
            if (room && room.players.length < room.maxPlayers) {
                room.players.push({ id: socket.id, name: playerName, isSpy: false });
                socket.join(roomCode);
                
                io.to(roomCode).emit('spy_playerJoined', room.players);
                socket.to(roomCode).emit('spy_userConnected', socket.id);
            } else {
                socket.emit('spy_error', 'الروم كاملة أو مش موجودة!');
            }
        });

        // توزيع الأدوار والكلمات الـ +18 والضحك
        socket.on('spy_startGame', (roomCode) => {
            let room = rooms[roomCode];
            if (room) {
                let randomSet = words[Math.floor(Math.random() * words.length)];
                let spyIndex = Math.floor(Math.random() * room.players.length);
                
                room.players.forEach((player, index) => {
                    let isSpy = (index === spyIndex);
                    player.isSpy = isSpy;
                    io.to(player.id).emit('spy_gameData', {
                        word: isSpy ? randomSet.spy : randomSet.normal,
                        isSpy: isSpy,
                        category: randomSet.category
                    });
                });
            }
        });

        // إشارات المايك (WebRTC)
        socket.on('spy_audioSignal', (data) => {
            io.to(data.to).emit('spy_audioSignal', {
                signal: data.signal,
                from: socket.id
            });
        });
    });
};
