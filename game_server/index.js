// Params (all stored in this.param_name)
//  games - list of enabled games to require.
//  app - express app.
//  chat - iochat chat object.
//
// Rules:
//  A player (i.e. username) can only be waiting for one game at a time.
//
// Games (gameServer.games):
//  Object keyed on game identifier. Values are the result of requiring the game module.
//  Game identifier must correspond to the directory in which the game exists.
//  Example game identifiers: tictactoe, micro_brew_wars, fleches.
//
// A game identifier if referred to
//
// Live Games (gameServer.liveGames):
//  Object keyed on a game's uuid. This values are objects themselves
//  describing the running game. In this case a running game includes games
//  which are waiting for enough players to start.
//
// Live Game (gameServer.liveGames[uuid]):
//  id - uuid identifying the game.
//  owner - player who started the game.
//  gameType - game identifier for the type of game.
//  state - one of:
//		WAITING - waiting for enough players to join.
//		PLAYING - currently playing.
//
// General notes:
//  1. game on its own refers to a game ID (e.g. tictactoe).
//  2. Errors. What to do? Throw an error? Yes for now. This means that a
//     client could theoretically cause a server error by submitting bad data.
//     That's fine for now.
//  3. Callbacks - should we use them?
//
// TODO: Handle games with a variable number of players.
// TODO: Since we are adding socket events with chat.addSocketEvent we could
//       proxy that in order to log any incoming socket events before they are
//       passed on.
// TODO: Handle cancellations if a player leaves or tries to start another game.

var uuid = require ('uuid'),
	_ = require ('underscore'),
	util = require('util');

function GameServer (games, app, chat) {
	var $this = this,
		gameName;

	this.liveGames = {};
	this.games = {};

	this.app = app;
	this.chat = chat;

	// Hook up games.
	games.forEach(function(gameID) {
		// TODO: Validate that all games conform to the required API.
		$this.games[gameID] = require('./games/' + gameID);
	});

	// ----------------------
	// Hook up listeners.
	// TODO: Do these functions really need access to the session object? The
	// socket object is neccessary to send messages.
	// ----------------------
	// Listener: listGames.
	chat.addSocketEvent('listGames', this.listGames.bind(this));
	chat.addSocketEvent('listLiveGames', this.listLiveGames.bind(this));

	chat.addSocketEvent('createGame', this.createGame.bind(this));
}

// ----------------------
// Helper functions to abstract the underlying structures.
// ----------------------

// Return as an array the names of games that can be played.
GameServer.prototype.getAvailableGames = function() {
	return Object.keys(this.games);
};

GameServer.prototype.game = function(gameID) {
	return this.games[gameID];
};

GameServer.prototype.liveGame = function(gameUuid) {
	return this.liveGames[gameUuid];
};

// ----------------------
// Listener events.
// ----------------------

// Start a game. The game will be created in a WAITING state.
GameServer.prototype.createGame = function(socket, session, data) {
	var gameUuid;

	if (_.has(this.games, data.game) === false) {
		this.chat.sendNotification(socket, util.format('No such game %s.', data.game), data.roomName);
		return;
	}

	gameUuid = uuid.v4();
	this.liveGames[gameUuid] = {
		id: gameUuid,
		owner: socket.username,
		gameType: data.game,
		state: 'WAITING',
		game: new this.games[data.game]()
	};

	this.chat.sendNotification(
		socket,
		util.format('Created game %s. Waiting for %s players.', data.game, this.game(data.game).getConfig('minPlayers')),
		data.roomName);
};

// List the games that can be created.
GameServer.prototype.listGames = function(socket, session, data) {
	this.chat.sendNotification(
		socket,
		util.format('The following games are available: %s. ' +
			'To start a game send /createGame <game name>.', this.getAvailableGames().join(', ')),
		data.roomName);
};

// List the games that are live and WAITING.
GameServer.prototype.listLiveGames = function(socket, session, data) {
	var liveGames = _.where(this.liveGames, {'state': 'WAITING'}),
		formatStr,
		msg,
		games = [];

	console.log('listLiveGames this.liveGames=%s', this.liveGames);
	console.log(util.inspect(this.liveGames));

	if (liveGames.length === 0) {
		msg = 'There are no live games at the moment. Why don\'t you start one using /createGame?';
	} else {
		liveGames.forEach(function (game) {
			games.push(util.format('%s by %s', game.gameType, game.owner));
		});

		if (liveGames.length === 1) {
			formatStr = 'There is %s game waiting: %s';
		} else {
			formatStr = 'There are %s games waiting: %s';
		}

		msg = util.format(formatStr, liveGames.length, games.join(', '));
	}

	this.chat.sendNotification(
		socket,
		msg,
		data.roomName);
};

module.exports = GameServer;
