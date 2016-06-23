module.exports = function(io, socket) {
  'use strict'

  const knex = require('../knexConfig')
  const logger = require('tracer').colorConsole()

  function getUserInRoom(roomId) {
    let usersInRoom = io.sockets.adapter.rooms[roomId] && Object.keys(io.sockets.adapter.rooms[roomId].sockets)
    .map((socketId, index) => {
      let user = io.sockets.connected[socketId]
      return { index, username: user.username, email: user.email }
    })
    return usersInRoom || []
  }

  socket.on('join user', user => {
    socket.username = user.username
    socket.join(user.username)
  })

  socket.on('join discussion', params => {
    socket.username = params.username
    socket.email = params.email
    socket.discussionId = params.discussionId
    socket.join(params.discussionId)
    socket.broadcast.to(params.discussionId).emit('join discussion', params.username)
  })

  socket.on('leave discussion', params => {
    socket.leave(params.discussionId)
    socket.broadcast.to(params.discussionId).emit('leave discussion', params.username)
  })

  socket.on('connected users', discussionId => {
    io.emit('connected users', {
      users: getUserInRoom(discussionId),
      length: getUserInRoom(discussionId).length
    })
  })

  socket.on('chat message', (message, discussionId, user) => {
    knex('users').select('id', 'username', 'email')
    .where('email', user.email)
    .first()
    .then(user => {
      knex('messages')
      .returning('id')
      .insert({
        discussion_id: discussionId,
        user_id: user.id,
        message
      })
      .then(message_id => {
        knex('messages').select('created_at', 'message')
        .where('id', message_id[0])
        .first()
        .then(message => {
          io.sockets.to(discussionId).emit('chat message', message.created_at, user.username, message.message)
        })
      })
      .catch(err => {
        logger.error(err)
      })
    })
    .catch(err => {
      logger.error(err)
    })
  })

  socket.on('disconnect', () => {
    socket.leave(socket.username)
    socket.leave(socket.discussionId)
    socket.broadcast.to(socket.discussionId).emit('leave discussion', socket.username)
    io.emit('connected users', {
      users: getUserInRoom(socket.discussionId),
      length: getUserInRoom(socket.discussionId).length
    })
    logger.info('USER DISCONNECTED')
  })
}