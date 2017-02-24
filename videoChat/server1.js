var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

app.use(express.static('public'));

server.listen(3000,function() {
  console.log('server is running on localhost:3000');
});

app.get('/',function(req,res){
  res.sendFile('index.html');
});
app.get('/home',function(req,res){
  res.send('hello in home');
});
var roomName = '';

io.sockets.on('connection',function(socket){

    socket.on('message',function(message){
      if(message === 'gotUserMedia'){
        console.log('gotUserMedia detected');
        console.log('channel name is '+roomName);
      }

      else if(message.type === 'offer'){
        console.log('offer detected');
      }

      else if(message.type === 'answer'){
        console.log('answer detected');
      }
      else if(message.type === 'candidate'){
        console.log('candidate detectedS');
      }
      //  log('S --> got message: ', message);
      socket.broadcast.to(roomName).emit('message',message);
    });

    socket.on('createOrJoin',function(room){
      var numClients = 0;
      if(io.nsps['/'].adapter.rooms[room]){
        numClients = (io.nsps['/'].adapter.rooms[room].length);
      }
      log('S --> Room ' + room + ' has ' + numClients + ' client(s)');
      log('S --> Request to create or join room', room);
      if(numClients == 0){
        socket.join(room);
        socket.emit('created',room);
////////////////////////////////////////////////
        roomName = room;
      }else if (numClients == 1) {
        //io.sockets.in(room).emit('join',room);
        socket.broadcast.to(room).emit('join',room);
        socket.join(room);
        socket.emit('joined',room);
      }else {
        socket.emit('full',room);
      }
    });

    function log(){
      var array = [">>>"];
      for(var i = 0;i<arguments.length;i++){
        array.push(arguments[i]);
      }
      socket.emit('log',array);
    }


});
