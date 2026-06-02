const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('مستخدم جديد اتصل');
    // سيتم إضافة منطق الربط هنا
});

server.listen(3000, () => {
    console.log('الخادم يعمل على المنفذ 3000');
});
