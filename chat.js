var sio = require('socket.io'),
	SessionSockets = require('session.socket.io'),
	parseCookie = require('connect').utils.parseCookie;
	
module.exports = function (server, sessionStore, cookieParser) {
	var io = sio.listen(server),
		sessionSockets = new SessionSockets(io, sessionStore, cookieParser);
		
	sessionSockets.on('connection', function (err, socket, session) {
		if (err) {
			throw err;
		}
		
		socket.on('subscribe', function(data) {
			console.log(session.username + ' joined ' + data.room);
			
			//io.sockets.in(data.room).emit('message', {time: Date.now(), username: 'admin', message: session.username + ' has joined ' + data.room + '.'});
			socket.join(data.room);
			
			socket.broadcast.to(data.room).emit('message', {time: Date.now(), username: 'admin', message: session.username + ' has joined ' + data.room + '.'});
			socket.emit('message', {time: Date.now(), username: 'admin', message: 'You have joined ' + data.room + '.'})
			
			// TODO: Figure out how we can broadcast to a room.
		});
		
		socket.on('unsubscribe', function(data) { socket.leave(data.room); })
		
		socket.on('message', function (data) {
			
			if (data.roomName === undefined) {
				console.log(session.username + ' sent a message but did not specify a roomName so it is being discarded.');
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
		
	});
};
