var express = require('express')
var p2 = require('p2')
var app = express()
var serv = require('http').Server(app)
var physicsPlayer = require('./server/physics/playermovement.js')

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html')
})

app.use('/client', express.static(__dirname + '/client'))

serv.listen(process.env.PORT || 2000)
console.log('server started!')

var player_list = []

// needed for physics update
var startTime = (new Date).getTime()
var lastTime
var timeStep = 1 / 70

// the physics world in the server. This is where all the physics happens.
// we set gravity to 0 since we are just following mouse pointers.
var world = new p2.World({ gravity: [0, 0] })

var Player = function(startX, startY, startAngle) {
  this.x = startX
  this.y = startY
  this.angle = startAngle
  this.speed = 500
  this.sendData = true
}

// we call physics_handler 60fps. The physics is calculated here.
setInterval(physics_handler, 1000/60)

// steps the physics world
function physics_handler() {
  var currentTime = (new Date).getTime()
  timeElapsed = currentTime - startTime
  var dt = lastTime ? (timeElapsed - lastTime) / 1000 : 0
  dt = Math.min(1 / 10, dt)
  world.step(timeStep)
}

function onNewPlayer(data) {
  var newPlayer = new Player(data.x, data.y, data.angle)
  console.log(newPlayer)

  playerBody = new p2.Body({
    mass: 0,
    position: [0, 0],
    fixedRotation: true
  })

  newPlayer.playerBody = playerBody
  world.addBody(newPlayer.playerBody)

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

function onInputFired(data) {
  var movePlayer = find_playerId(this.id, this.room)
  if (!movePlayer) {
    console.log('No player')
    return
  }
  //when sendData is true, we send the data back to client.
  if (!movePlayer.sendData) return
  // every 50ms, we send the data
  setTimeout(function() { movePlayer.sendData = true }, 50)
  //we set sendData to false when we send the data.
	movePlayer.sendData = false
  //Make a new pointer with the new inputs from the client.
	//contains player positions in server
	var serverPointer = {
    x: data.pointer_x,
    y: data.pointer_y,
    worldX: data.pointer_worldX,
    worldY: data.pointer_worldY
  }
  //moving the player to the new inputs from the player
  if (physicsPlayer.distanceToPointer(movePlayer, serverPointer) <= 30) {
    movePlayer.playerBody.angle = physicsPlayer.moveToPointer(movePlayer, 0, serverPointer, 1000)
  } else {
    movePlayer.playerBody.angle = physicsPlayer.moveToPointer(movePlayer, movePlayer.speed, serverPointer)
  }

  // new player position to be sent back to client.
	var info = {
    x: movePlayer.playerBody.position[0],
    y: movePlayer.playerBody.position[1],
    angle: movePlayer.playerBody.angle
  }
  // send to sender (not to every client)
  this.emit('input_recieved', info)

  //data to be sent back to everyone except sender
	var movePlayerData = {
    id: movePlayer.id,
    x: movePlayer.playerBody.position[0],
    y: movePlayer.playerBody.position[1],
    angle: movePlayer.playerBody.angle
  }
  this.broadcast.emit('enemy_move', movePlayerData)
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
  socket.on('input_fired', onInputFired)
})
