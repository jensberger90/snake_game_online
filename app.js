var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/',function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client' ,express.static(__dirname + '/client'));

serv.listen(2000);
console.log('Server started.')

var SOCKET_LIST = {};

var io = require('socket.io') (serv, {});
io.sockets.on('connection', function(socket) {
    socket.id = Math.random();
    socket.x = 0;
    socket.y = 0;

    SOCKET_LIST[socket.id] = socket;

});

setInterval(function() {
    var pack = [];
    for (var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.x++;
        socket.y++;
        pack.push({
            x:socket.x,
            y:socket.y
        })

    }


    for (var i in SOCKET_LIST) {
        socket.emit('newPositions',pack);
    }



}, 1000/25);