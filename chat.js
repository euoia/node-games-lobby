var sio = require('socket.io'),
	SessionSockets = require('session.socket.io'),
	parseCookie = require('connect').utils.parseCookie;
	
module.exports = function (server, sessionStore, cookieParser) {
	var io = sio.listen(server),
		sessionSockets = new SessionSockets(io, sessionStore, cookieParser);
		
	sessionSockets.on('connection', function (err, socket, session) {
		if (err) {
			// TODO: Keep an eye on this issue: https://github.com/functioncallback/session.socket.io/issues/11
			console.log(err);
			throw new Error(err.error);
		}
		
		socket.on('subscribe', function(data) {
			console.log(session.username + ' joined ' + data.room);
			io.sockets.in(data.room).emit('message', {time: Date.now(), username: 'admin', message: session.username + ' has joined ' + data.room + '.'});
			socket.join(data.room);
			socket.emit('message', {time: Date.now(), username: 'admin', message: 'You have joined ' + data.room + '.'})
		});
		
		socket.on('unsubscribe', function(data) { socket.leave(data.room); })
		
		socket.on('message', function (data) {
			console.log(session.username + ' sent a message:' + data.message);
			
			socket.broadcast.emit('message', {
				time: Date.now(),
				username: session.username,
				message: data.message
			});
		});
		
	});
};
