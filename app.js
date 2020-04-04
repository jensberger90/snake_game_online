var express = require('express');
var app = express();
var serv = require('http').Server(app);
 
app.get('/',function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));
 
serv.listen(2000);
console.log("Server started.");


var PLAYER_LIST = {}; 
var SOCKET_LIST = {};
var WIDTH = 500;
var HEIGHT = 500;
var pq = 25;
var target = new Target();
target.generate();

COLORS = [
    {r:74, g:1, b:122},
    {r:146, g:165, b:216},
    {r:249, g:28, b:128},
    {r:214, g:67, b:45},
    {r:195, g:141, b:163},
    {r:16, g:30, b:87},
    {r:71, g:153, b:173},
    {r:209, g:180, b:73},
    {r:153, g:180, b:153},
]


Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

function Target(){
    this.px;
    this.py;

    this.generate = function(params) {
        this.px = getRandomInt(1, (WIDTH/pq)-1); 
        this.py = getRandomInt(1, (HEIGHT/pq)-1);
    }

}


function Player(id)
{
    this.id = id;
    this.x = 15;
    this.y = 12;
    this.xplus = 1;
    this.yplus = 0;
    this.snakex = [];
    this.snakey = [];
    this.laenge = 5;
    this.score = 0;
    this.name;
    this.color;


    this.initialize = function() {
        for(var i = 0; i < this.laenge-1; i++){
            this.snakex[i] = this.x - i;
            this.snakey[i] = this.y;
        }
    }

    this.update = function() {
        this.x += this.xplus;
        this.y += this.yplus;
        
        if(this.x > (WIDTH/pq)-1)
            this.x = 0;
        else if(this.x < 0)
            this.x =  (WIDTH/pq)-1;
        else if(this.y > (HEIGHT/pq)-1)
            this.y = 0;
        else if(this.y < 0)
            this.y = (HEIGHT/pq)-1;

        for (var i = this.laenge-1; i > 0; i--) {
            this.snakex[i] = this.snakex[i - 1];
            this.snakey[i] = this.snakey[i - 1];            
        }

        this.snakex[0] = this.x;
        this.snakey[0] = this.y;


        //kollision innerhalb der schlange
       for (var i = 1; i < this.laenge; i++) {
            if(this.snakex[0] == this.snakex[i] && this.snakey[0] == this.snakey[i]){
                playerDeath(this);
            }
        }

        //punkt einsammeln
        if(this.x == target.px && this.y == target.py){
            this.laenge = this.laenge + 1;
            this.score += 1;
            //this.snakex[this.laenge] = this.snakex[this.laenge-1];
            //this.snakey[this.laenge] = this.snakey[this.laenge-1];
             
            //Schlange neu ins Array einlesen
            for (var i = this.laenge-1; i > this.laenge; i++) {
                this.snakex[i] = this.snakex[i - 1];
                this.snakey[i] = this.snakey[i - 1];            
            }

            //console.log("catch" + px + " "+ py);

            target.generate();  
        }

        
        if(this.snakex.length > this.laenge){
            this.snakex.splice(this.laenge-1, (this.snakex.length-this.laenge))
            this.snakey.splice(this.laenge-1, (this.snakey.length-this.laenge))
        }

    }


}



playerDeath = function(player){
    console.log("Your Score is: "+player.score);
    player.laenge = 5;
    player.score = 0;
}


onConnect = function(socket, name){
    var player = new Player(socket.id);
    
    player.name = name;

    var rand = getRandomInt(0, COLORS.length);
    player.color = COLORS[rand];

    player.initialize();

    PLAYER_LIST[player.id] = player;

    socket.on('keyPress',function(data){
        if(data.inputId === 'left' & player.xplus != 1){
            player.xplus = -1;
            player.yplus = 0;
        }else if(data.inputId === 'right' & player.xplus != -1){
            player.xplus = 1;
            player.yplus = 0;        
        }
        else if(data.inputId === 'up' & player.yplus != 1){
            player.xplus = 0;
            player.yplus = -1;        
        }
        else if(data.inputId === 'down' & player.yplus != -1){
            player.xplus = 0;
            player.yplus = 1;        
        }
            
    });

    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id];
        onDisconnect(socket);
    });
}

onDisconnect = function(socket){
    delete PLAYER_LIST[socket.id];
}


function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}
 
var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;

    socket.on('signIn',function(data){
        if(Object.size(PLAYER_LIST) < 3){
            onConnect(socket, data.name);
            socket.emit('signInResponse',{success:true});  
        } else {
            socket.emit('signInResponse',{success:false});
        }
        
    });
    
});


setInterval(function(){
    var data = [];
        for(var i in PLAYER_LIST){
            var player = PLAYER_LIST[i];
            player.update();
            data.push({
                snakex:player.snakex,
                snakey:player.snakey,
                xplus:player.xplus,
                yplus:player.yplus,
                score:player.score,
                color:player.color,
            });    
        }
    
    var pack = {
        player:data,
        goal:target,
    }
   
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack);
    }
},100);

