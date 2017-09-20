//we call this function when the main player colides with some other bodies.
function player_coll(body, bodyB, shapeA, shapeB, equation) {
  console.log('collision')
  //the id of the collided body that player made contact with
  var key = body.sprite.id
  //the type of the body the player made contact with
	var type = body.sprite.type

  if (type == 'player_body') {
    // send the player collision
    socket.emit('player_collision', {id: key})
  }
}
