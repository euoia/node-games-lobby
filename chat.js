var sio = require('socket.io'),
  SessionSockets = require('session.socket.io'),
  parseCookie = require('connect').utils.parseCookie,
  _ = require('underscore');



module.exports = function(server, sessionStore, cookieParser) {
  var io = sio.listen(server),
    sessionSockets = new SessionSockets(io, sessionStore, cookieParser);

  sessionSockets.on('connection', function(err, socket, session) {
    if (err) {
      throw err;
    }

    socket.username = session.username;

    socket.on('subscribe', function(data) {
      console.log(session.username + ' joined ' + data.room);

      socket.join(data.room);

      console.log(io.sockets.clients(data.room));

      var users = _.pluck(io.sockets.clients(data.room), 'username');
      socket.emit('userList', {
        users: users
      });

      socket.broadcast.to(data.room).emit('message', {
        time: Date.now(),
        username: 'admin',
        message: session.username + ' has joined ' + data.room + '.'
      });

      var users = _.pluck(io.sockets.clients(data.room), 'username');
      socket.broadcast.to(data.room).emit('userList', {
        users: users
      });

      socket.emit('message', {
        time: Date.now(),
        username: 'admin',
        message: 'You have joined ' + data.room + '.'
      });
    });

    socket.on('unsubscribe', function(data) {
      console.log(session.username + ' unsubscribed ' + data.room);
      socket.leave(data.room);

      socket.broadcast.to(data.room).emit('message', {
        time: Date.now(),
        username: 'admin',
        message: session.username + ' has unsubscribed ' + data.room + '.'
      });
    });

    socket.on('disconnect', function() {
      console.log(session.username + ' disconnected.');

			// TODO: Only broadcast to rooms associated with socket.
			// TODO: Find out how to get the room names associated with a socket.
			// TODO: It seems like this event is fired before the user is removed
			// from the room so simply sending userList will not work.
      socket.broadcast.to().emit('message', {
        time: Date.now(),
        username: 'admin',
        message: session.username + ' has disconnected.'
      });
			
			var users = _.pluck(io.sockets.clients(), 'username');
			socket.broadcast.to().emit('userList', {
				users: users
			});

      //var roomClients = io.sockets.manager.roomClients[socket.id];
      //for (i in roomClients) {
      // var room = roomClients[i];
      // });

    });

    socket.on('message', function(data) {
      // TODO: This kind of checking and logging is probably OTT. We could have some kind of separate validation module.
      if (data.room === undefined) {
        console.log(session.username + ' sent a message but did not specify a room so it is being discarded.');
        console.log(data);
        return;
      }

      if (data.message === undefined) {
        console.log(session.username + ' sent a message but did not specify a message so it is being discarded.');
        console.log(data);
        return;
      }

      console.log(session.username + ' sent a message:' + data.message);

      //socket.broadcast.emit('message'
      socket.broadcast.emit('message', {
        time: Date.now(),
        username: session.username,
        message: data.message
      });
    });

    socket.on('userList', function(data) {
      console.log(session.username + ' requested userList.');

      var users = _.pluck(io.sockets.clients(data.room), 'username');
      console.log(users);
      socket.emit('userList', {
        users: users
      });
    });

  });
};
