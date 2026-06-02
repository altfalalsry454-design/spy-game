// للمطور: شغل ده باستخدام Node.js وثبت المكتبات: npm install express socket.io
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
    "حمام شعبي ليلة الخميس", 
    "سرير مستشفى حكومي", 
    "تخشيبة المحكمة",
    "عربية كبدة مسمومة",
    "حفلة تيك توكرز في الساحل"
];

let players = [];
let currentWord = "";
let spyId = "";
let speakerIndex = 0;

io.on('connection', (socket) => {
    console.log('مغفل جديد دخل اللعبة: ' + socket.id);

    socket.on('joinGame', (name) => {
        players.push({ id: socket.id, name: name, isSpy: false });
        io.emit('updatePlayers', players);
    });

    socket.on('startGame', () => {
        if (players.length < 3) return socket.emit('error', 'لازم 3 صراصير على الأقل عشان نلعب!');
        
        currentWord = WORDS_18[Math.floor(Math.random() * WORDS_18.length)];
        let spyIndex = Math.floor(Math.random() * players.length);
        spyId = players[spyIndex].id;

        players.forEach((p, idx) => {
            p.isSpy = (idx === spyIndex);
            io.to(p.id).emit('gameStarted', {
                word: p.isSpy ? "❌ أنت الجاسوس يا مغفل! 🤫" : `🔞 المكان: ${currentWord}`
            });
        });

        speakerIndex = 0;
        startTurn();
    });

    function startTurn() {
        if (players.length === 0) return;
        let activePlayer = players[speakerIndex];
        io.emit('nextSpeaker', { id: activePlayer.id, name: activePlayer.name });
    }

    socket.on('turnDone', () => {
        speakerIndex = (speakerIndex + 1) % players.length;
        startTurn();
    });

    socket.on('disconnect', () => {
        players = players.filter(p => p.id !== socket.id);
        io.emit('updatePlayers', players);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log('السيرفر شغال على بورت ' + PORT));
