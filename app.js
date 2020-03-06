var express = require('express');
var app = express();
var serv = require('http').Server(app);
 
app.get('/',function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));
 
serv.listen(2000);
console.log("Server started.");
 
var SOCKET_LIST = {};
var POINT_WIDTH = 20;
var MAX_LENGTH = 50*50;


var Player = function(id){
    var self = {
        id:id,
        number:"" + Math.floor(10 * Math.random()),
        moveright:false,
        moveleft:false,
        moveup:false,
        x:10,
        y:10,
        movedown:false,
        maxSpd:1,
        points:1,
        
        
    }

    self.pointx = new Array(self.points);
    self.pointy = new Array(self.points);

    for (var i in self.pointx) {
        self.pointx[i] = self.x - i;
        self.pointy[i] = self.y;
    }

    self.update = function(){
        if(self.x > 500)
            self.x = 0;
        else if(self.x < 0)
            self.x = 500;

        if(self.y > 500)
            self.y = 0;
        else if(self.y < 0)
            self.y = 500;

            self.x += self.spdX;
            self.y += self.spdY;

        self.updateSpd();



        for (var i = self.points; i > 1; i--) {
            self.pointx[i] =  self.pointx[i-1];
            self.pointy[i] =  self.pointy[i-1];
        }

        self.pointx[0] = self.x;
        self.pointy[0] = self.y;
    }

   
    self.updateSpd = function(){
        self.spdY = 0;
        self.spdX = 0;
        
        if(self.moveright)
            self.spdX = self.maxSpd;   
        else if(self.moveleft)
            self.spdX = -self.maxSpd;
        else if(self.moveup)
            self.spdY = -self.maxSpd;
        else if(self.movedown)
            self.spdY = self.maxSpd;

 
    }
    Player.list[id] = self;
    return self;
}
Player.list = {};
Player.onConnect = function(socket){
    var player = Player(socket.id);

    socket.on('keyPress',function(data){
        player.moveleft = false;
        player.movedown = false;
        player.moveright = false;
        player.moveup = false;

        if(data.inputId === 'left')
            player.moveleft = true;
        else if(data.inputId === 'right')
            player.moveright = true;
        else if(data.inputId === 'up')
            player.moveup = true;
        else if(data.inputId === 'down')
            player.movedown = true;
    });
}
Player.onDisconnect = function(socket){
    delete Player.list[socket.id];
}
Player.update = function(){
    var pack = [];
    for(var i in Player.list){
        var player = Player.list[i];
        player.update();
        pack.push({
            pointx:player.pointx,
            pointy:player.pointy,
        });    
    }
    return pack;
}
 
var DEBUG = true;
 
 
var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
   



    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);
    });

    socket.on('sendMsgToServer',function(data){
        var playerName = ("" + socket.id).slice(2,7);
        for(var i in SOCKET_LIST){
            SOCKET_LIST[i].emit('addToChat',playerName + ': ' + data);
        }
    });
   
    socket.on('evalServer',function(data){
        if(!DEBUG)
            return;
        var res = eval(data);
        socket.emit('evalAnswer',res);     
    });
   
    Player.onConnect(socket);

   
});


setInterval(function(){
    var pack = {
        player:Player.update(),
    }
   
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack);
    }
},100);