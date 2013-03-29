// Games and routes are identified by the directory in which they reside.
// For example, the ID of this game is tictactoe - all routes will be prefixed with tictactoe.
//
// TODO: Resume.

var util = require('util');

function Tictactoe (gameServer) {
	this.gameServer = gameServer;
	this.players = {}; // Keyed on username.

	this.nextPlayer = null; // Username of player who's turn is next.
	this.playerUsernames = []; // Array of player usernames.

	// Map board ownership.
	this.board = {
		topLeft: null,
		topMiddle: null,
		topRight: null,
		centerLeft: null,
		centerMiddle: null,
		centerRight: null,
		bottomLeft: null,
		bottomMiddle: null,
		bottomRight: null
	};
}

Tictactoe.prototype.init = function(req, res) {
	this.players[req.session.username] = {
		username: req.session.username,
		socket: null
	};

	console.log('%s loaded the tictactoe page.', req.session.username);
	res.render('games/tictactoe/index', { title: 'Chat' });
};

// ----------------------
// Socket listener functions.
// ----------------------
Tictactoe.prototype.emitAll = function (event, data) {
	for (username in this.players) {
		this.players[username].socket.emit(event, data);
	}
};


Tictactoe.prototype.start = function () {
	console.log('Tictactoe start');

	// Send each player their own username.
	for (username in this.players) {
		this.players[username].socket.emit('playerInfo', {username: username});
	}

	this.emitAll('start', {});

	// Tell the players who's turn it is next.
	this.playerUsernames = Object.keys(this.players);
	this.nextPlayer = this.playerUsernames[Math.floor(Math.random() * 2)];
	console.log('It is %s\'s turn.', this.nextPlayer);

	this.emitAll('nextRound', {
		nextPlayer: this.nextPlayer
	});
};

Tictactoe.prototype.select = function (socket, session, data) {
	var winResult;
	console.log('%s selected %s.', session.username, data.id);

	if (session.username !== this.nextPlayer) {
		return socket.emit('error', {msg: 'It is not your turn.'});
	}

	if (this.board[data.id] !== null) {
		console.log('%s tried to cheat by making an invalid move!', session.username);
		return socket.emit('error', {msg: 'Not a valid move.'});
	}

	this.board[data.id] = session.username;

	this.emitAll('select', {player: session.username, id: data.id});

	winResult = this.checkWin(session.username);
	if (winResult.win === true) {
		return this.emitAll('victory', {player: session.username, type: winResult.type, val: winResult.val});
	}

	if (this.isStalemate() === true) {
		return this.emitAll('end', {msg: 'The game ended in stalemate.'});
	}


	// Pass the move to the next player.
	var nextPlayerIdx = (this.playerUsernames.indexOf(session.username) + 1) % 2;
	this.nextPlayer = this.playerUsernames[nextPlayerIdx];

	this.emitAll('nextRound', {
		nextPlayer: this.nextPlayer
	});
};

// Might as well figure out what kind of win it was, since we would need to do
// this one the client anyway.
Tictactoe.prototype.checkWin = function(username) {
	var b = this.board,
		u = username;

	if (b['topLeft'] === u && b['topMiddle'] === u && b['topRight'] === u) {
		return {win: true, type: 'row', val: 0};
	}

	if (b['centerLeft'] === u && b['centerMiddle'] === u && b['centerRight'] === u) {
		return {win: true, type: 'row', val: 1};
	}

	if (b['bottomLeft'] === u && b['bottomMiddle'] === u && b['bottomRight'] === u) {
		return {win: true, type: 'row', val: 2};
	}

	if (b['topLeft'] === u && b['centerLeft'] === u && b['bottomLeft'] === u) {
		return {win: true, type: 'col', val: 0};
	}

	if (b['topMiddle'] === u && b['centerMiddle'] === u && b['bottomMiddle'] === u) {
		return {win: true, type: 'col', val: 1};
	}

	if (b['topMiddle'] === u && b['bottomMiddle'] === u && b['bottomMiddle'] === u) {
		return {win: true, type: 'col', val: 2};
	}

	if (b['topLeft'] === u && b['centerMiddle'] === u && b['bottomRight'] === u) {
		return {win: true, type: 'diag', val: 0};
	}

	if (b['bottomLeft'] === u && b['centerMiddle'] === u && b['topRight'] === u) {
		return {win: true, type: 'diag', val: 1};
	}


	return {win: false};
};

// Check for stalemate (all board filled).
Tictactoe.prototype.isStalemate = function() {
	var isStalemate = true,
		id;

	for (id in this.board) {
		if (this.board[id] === null) {
			isStalemate = false;
			break;
		}
	}

	if (isStalemate) {
		return true;
	}
};

// ----------------------
// Must-implement API functions.
// All functions in this section must be implemented by every game.
// ----------------------

// Must supply a connection function.
// TODO: It is possible that one of the non-players could join. In that case,
// they'd be an observer.
Tictactoe.prototype.connection = function(socket, session) {
	console.log('Tictactoe connection from %s.', session.username);
	this.players[session.username].socket = socket;

	if (Object.keys(this.players).length === 2) {
		this.start();
	}
};


// Express request route that loads the game page.
Tictactoe.play = function (gameServer, req, res) {
	var gameUuid = req.params[0];

	if (gameServer.liveGames[gameUuid] === undefined) {
		return res.end('Game not found.');
	}

	gameServer.liveGames[gameUuid].game.init(req, res);
};

// Return an object which maps event name to function.
Tictactoe.prototype.getListeners = function() {
	var listeners = {
		'select': this.select
	};

	return listeners;
};

// Return game configuration. Must-have keys: minPlayers, maxPlayers.
Tictactoe.getConfig = function(configName) {
	var config = {
		minPlayers: 2,
		maxPlayers: 2
	};

	return config[configName];
};


module.exports = Tictactoe;
