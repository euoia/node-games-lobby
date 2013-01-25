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

			var usernamesInRoomBeforeJoining = _.pluck(io.sockets.clients(data.room), 'username');

			// Add the socket to the room. A player may have multiple tabs open.
			socket.join(data.room);

			var usernamesInRoomAfterJoining = _.pluck(io.sockets.clients(data.room), 'username');

			// Send the user list to the socket.
			// A user may have multiple sockets open so we need the unique list of usernames.
			socket.emit('userList', {
				users: _.uniq(usernamesInRoomAfterJoining)
			});

			// If already present, the socket needs to join, but do not notify the room.
			if (_.contains(usernamesInRoomBeforeJoining, socket.username)) {
				socket.emit('message', {
					time: Date.now(),
					username: 'admin',
					message: 'You have rejoined ' + data.room + '.'
				});

			} else {
				socket.emit('message', {
					time: Date.now(),
					username: 'admin',
					message: 'You have joined ' + data.room + '.'
				});

				socket.broadcast.to(data.room).emit('message', {
					time: Date.now(),
					username: 'admin',
					message: session.username + ' has joined ' + data.room + '.'
				});

				socket.broadcast.to(data.room).emit('userList', {
					users: _.uniq(usernamesInRoomAfterJoining)
				});
			}
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

		// Note that this event is fired before the socket is removed from the room
		// list.
		socket.on('disconnect', function() {
			console.log(session.username + ' disconnected.');

			// TODO: Is there a way to get rooms without accessing a private member (socket.manager)?
			var room = null,
				socketRoomName = null,
				timesInRoom = 0,
				rooms = socket.manager.roomClients[socket.id];

			usernamesInRoom = null;

			for (socketRoomName in rooms) {
				// Strip the socket.io leading '/'.
				room = socketRoomName.substr(1);

				usernamesInRoom = _.pluck(io.sockets.clients(room), 'username');
				usernamesInRoomAfterLeaving = _.without(usernamesInRoom, socket.username);

				timesInRoom = usernamesInRoom.length - usernamesInRoomAfterLeaving.length;

				// Only display the disconnect message if this is the last socket the
				// user has open to the room.
				if (timesInRoom === 1) {
					socket.broadcast.to(room).emit('message', {
						time: Date.now(),
						username: 'admin',
						message: session.username + ' has disconnected.'
					});

					socket.broadcast.to(room).emit('userList', {
						users: _.uniq(usernamesInRoomAfterLeaving)
					});
				}
			}
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
