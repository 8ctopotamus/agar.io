var express = require('express')
var app = express()
var serv = require('http').Server(app)

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html')
})

app.use('/client', express.static(__dirname + '/client'))

serv.listen(process.env.PORT || 2000)
console.log('server started!')

var player_list = []

var Player = function(startX, startY, startAngle) {
  var x = startX
  var y = startY
  var angle = startAngle
}

function onNewPlayer(data) {
  var newPlayer = new Player(data.x, data.y, data.angle)
  console.log(newPlayer)
  // this.id refers to 'socket' in 'sockets.on'
  console.log('Created new player with id ' + this.id)
  newPlayer.id = this.id

  var current_info = {
      id: newPlayer.id,
      x: newPlayer.x,
      y: newPlayer.y,
      angle: newPlayer.angle,
  }

  // send to the new player about everyone who is already connected.
	for (var i = 0; i < player_list.length; i++) {
    existingPlayer = player_list[i]

    var player_info = {
      id: existingPlayer.id,
      x: existingPlayer.x,
      y: existingPlayer.y,
      angle: existingPlayer.angle,
    }

    //send message to the sender-client only
    this.emit('new_enemyPlayer', player_info)
  }

  //send message to every connected client except the sender
	this.broadcast.emit('new_enemyPlayer', current_info)

  player_list.push(newPlayer)
}

function onMovePlayer(data) {
  var movePlayer = find_playerId(this.id)
  movePlayer.x = data.x
  movePlayer.y = data.y
  movePlayer.angle = data.angle

  var move_player_data = {
    id: movePlayer.id,
    x: movePlayer.x,
    y: movePlayer.y,
    angle: movePlayer.angle
  }

  //send message to every connected client except the sender
	this.broadcast.emit('enemy_move', move_player_data)
}

//call when a client disconnects and tell the clients except sender to remove the disconnected player
function onClientDisconnect() {
  console.log('disconnect')
  var removePlayer = find_playerId(this.id)
  if (removePlayer) {
    player_list.splice(player_list.indexOf(removePlayer), 1)
  }

  console.log('removing player ' + this.id)
  //send message to every connected client except the sender
	this.broadcast.emit('remove_player', {id: this.id})
}

function find_playerId(id) {
  for (var i = 0; i < player_list.length; i++) {
    if (player_list[i].id == id) {
      return player_list[i]
    }
  }

  return false
}

// io connection
var io = require('socket.io')(serv, {})

io.sockets.on('connection', function(socket) {
  console.log('socket connected!')

  socket.on('disconnect', onClientDisconnect)
  socket.on('new_player', onNewPlayer)
  socket.on('move_player', onMovePlayer)
})
