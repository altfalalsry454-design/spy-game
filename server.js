const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

const WORDS_18 = [
    "شقة مفروشة بوسط البلد", 
    "سهرة كباريه في الهرم", 
    "غرزة حشيش في المرج", 
    "الحجز في قسم الأزبكية", 
    "ورا مصنع الكراسي", 
    "حمام شعبى ليلة الخميس", 
    "سرير مستشفى حكومي", 
    "تخشيبة المحكمة",
    "عربية كبدة مسمومة",
    "حفلة تيك توكرز في الساحل"
];

// هيكل البيانات الجديد لتخزين الرومات
// { 'ROOM_CODE': { players: [], currentWord: '', spyId: '', speakerIndex: 0 } }
let rooms = {};

// دالة لتوليد كود روم عشوائي من 5 أرقام
function generateRoomCode() {
    return Math.floor(10000 + Math.random() * 90000).toString();
}

io.on('connection', (socket) => {
    console.log('لاعب جديد متصل: ' + socket.id);

    // 1. إنشاء روم جديدة
    socket.on('createRoom', (playerName) => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            players: [{ id: socket.id, name: playerName, isSpy: false, isLeader: true }],
            currentWord: "",
            spyId: "",
            speakerIndex: 0,
            gameStarted: false
        };
        
        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode, players: rooms[roomCode].players });
    });

    // 2. الانضمام لروم موجودة باستخدام الكود
    socket.on('joinRoom', ({ roomCode, playerName }) => {
        const room = rooms[roomCode];
        if (!room) {
            return socket.emit('errorMsg', 'الكود غلط يا زميلي.. مفيش روم بالاسم ده!');
        }
        if (room.gameStarted) {
            return socket.emit('errorMsg', 'الجيم بدأ خلاص.. اطلب منهم يعملوا روم جديدة.');
        }

        room.players.push({ id: socket.id, name: playerName, isSpy: false, isLeader: false });
        socket.join(roomCode);
        
        io.to(roomCode).emit('updatePlayers', room.players);
        socket.emit('roomJoined', { roomCode, players: room.players });
    });

    // 3. بدء الجيم داخل الروم
    socket.on('startGame', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return;
        
        if (room.players.length < 3) {
            return socket.emit('errorMsg', 'لازم 3 صراصير على الأقل في الروم عشان نلعب!');
        }
        
        room.gameStarted = true;
        room.currentWord = WORDS_18[Math.floor(Math.random() * WORDS_18.length)];
        let spyIndex = Math.floor(Math.random() * room.players.length);
        room.spyId = room.players[spyIndex].id;

        room.players.forEach((p, idx) => {
            p.isSpy = (idx === spyIndex);
            io.to(p.id).emit('gameStarted', {
                word: p.isSpy ? "❌ أنت الجاسوس يا مغفل! 🤫" : `🔞 المكان: ${room.currentWord}`
            });
        });

        room.speakerIndex = 0;
        startTurn(roomCode);
    });

    function startTurn(roomCode) {
        const room = rooms[roomCode];
        if (!room || room.players.length === 0) return;
        
        let activePlayer = room.players[room.speakerIndex];
        io.to(roomCode).emit('nextSpeaker', { id: activePlayer.id, name: activePlayer.name });
    }

    // 4. إنهاء الدور والانتقال للاعب التالي
    socket.on('turnDone', (roomCode) => {
        const room = rooms[roomCode];
        if (!room) return;

        room.speakerIndex = (room.speakerIndex + 1) % room.players.length;
        startTurn(roomCode);
    });

    // 5. عند الخروج أو فصل النت
    socket.on('disconnect', () => {
        for (const roomCode in rooms) {
            let room = rooms[roomCode];
            let playerIdx = room.players.findIndex(p => p.id === socket.id);
            
            if (playerIdx !== -1) {
                let wasLeader = room.players[playerIdx].isLeader;
                room.players.splice(playerIdx, 1);
                
                if (room.players.length === 0) {
                    delete rooms[roomCode]; // مسح الروم لو فضيت
                } else {
                    if (wasLeader) {
                        room.players[0].isLeader = true; // تعيين ليدر جديد تلقائياً
                    }
                    io.to(roomCode).emit('updatePlayers', room.players);
                }
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('السيرفر شغال على بورت ' + PORT));
