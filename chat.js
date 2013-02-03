var sio = require('socket.io'),
	SessionSockets = require('session.socket.io'),
	parseCookie = require('connect').utils.parseCookie,
	_ = require('underscore');


Chat = function(server, sessionStore, cookieParser) {
	this.io = sio.listen(server);
	this.sessionSockets = new SessionSockets(this.io, sessionStore, cookieParser),

	this.setupListeners();
}

Chat.prototype.setupListeners = function() {
	var $this = this;

	this.sessionSockets.on('connection', function(err, socket, session) {
		if (err) {
			throw err;
		}

		socket.username = session.username;

		socket.on('subscribe', function(data) {
			console.log('subscribe');
			console.log(data);
			if (data.roomName === undefined) {
				console.log(session.username + ' tried to subscribe but did not specify a room name so it is being discarded.');
				return;
			}

			console.log(session.username + ' joined ' + data.roomName);

			var usernamesInRoomBeforeJoining = _.pluck($this.io.sockets.clients(data.roomName), 'username');

			// Add the socket to the room. A player may have multiple tabs open.
			socket.join(data.roomName);

			var usernamesInRoomAfterJoining = _.pluck($this.io.sockets.clients(data.roomName), 'username');

			// Send the user list to the socket.
			// A user may have multiple sockets open so we need the unique list of usernames.
			socket.emit('userList', {
				users: _.uniq(usernamesInRoomAfterJoining),
				roomName: data.roomName
			});

			// If already present, the socket needs to join, but do not notify the room.
			if (_.contains(usernamesInRoomBeforeJoining, socket.username)) {
				socket.emit('message', {
					time: Date.now(),
					username: 'admin',
					roomName: data.roomName,
					message: 'You have rejoined ' + data.roomName + '.'
				});

			} else {
				socket.emit('message', {
					time: Date.now(),
					username: 'admin',
					roomName: data.roomName,
					message: 'You have joined ' + data.roomName + '.'
				});

				socket.broadcast.to(data.roomName).emit('message', {
					time: Date.now(),
					username: 'admin',
					roomName: data.roomName,
					message: session.username + ' has joined ' + data.roomName + '.'
				});

				socket.broadcast.to(data.roomName).emit('userList', {
					users: _.uniq(usernamesInRoomAfterJoining)
				});
			}
		});

		socket.on('unsubscribe', function(data) {
			if (data.roomName === undefined) {
				console.log(session.username + ' tried to unsubscribe but did not specify a roomName so the request is being discarded');
				console.log(data);
				return;
			}

			console.log(session.username + ' unsubscribed ' + data.roomName);
			socket.leave(data.roomName);

			socket.broadcast.to(data.roomName).emit('message', {
				time: Date.now(),
				username: 'admin',
				roomName: data.roomName,
				message: session.username + ' has unsubscribed ' + data.roomName + '.'
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

				usernamesInRoom = _.pluck($this.io.sockets.clients(room), 'username');
				usernamesInRoomAfterLeaving = _.without(usernamesInRoom, socket.username);

				timesInRoom = usernamesInRoom.length - usernamesInRoomAfterLeaving.length;

				// Only display the disconnect message if this is the last socket the
				// user has open to the room.
				if (timesInRoom === 1) {
					socket.broadcast.to(room).emit('message', {
						time: Date.now(),
						username: 'admin',
						roomName: room,
						message: session.username + ' has disconnected from ' + room + '.'
					});

					console.log('$this:');
					console.log($this);
					$this.sendUserList(socket, room, _.uniq(usernamesInRoomAfterLeaving));
				}
			}
		});

		socket.on('message', function(data) {
			console.log('message');
			console.log(data);

			// TODO: This kind of checking and logging is probably OTT. We could have some kind of separate validation module.
			if (data.roomName === undefined) {
				console.log(session.username + ' sent a message but did not specify a room name so it is being discarded.');
				console.log(data);
				return;
			}

			if (data.message === undefined) {
				console.log(session.username + ' sent a message but did not specify a message so it is being discarded.');
				console.log(data);
				return;
			}

			console.log(session.username + ' sent a message:');
			console.log(data);

			socket.broadcast.to(data.roomName).emit('message', {
				time: Date.now(),
				username: session.username,
				roomName: data.roomName,
				message: data.message
			});
		});

		socket.on('userList', function(data) {
			if (data.roomName === undefined) {
				console.log(session.username + ' requested userList but did not specify a room name so it is being discarded.');
				console.log(data);
				return;
			}
			console.log(session.username + ' requested userList.');

			var users = _.pluck($this.io.sockets.clients(data.roomName), 'username');
			console.log(users);

			this.sendUserList(socket, data.roomName, users);
		});

	});
};

Chat.prototype.sendUserList = function(socket, roomName, userList) {
	socket.broadcast.to(roomName).emit('userList', {
		roomName: roomName,
		users: userList
	});
};

module.exports = Chat;
