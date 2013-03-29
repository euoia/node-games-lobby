// TODO: The number of instances of emitting a simply message indicates that we
// could possibly do with a chat.addSimpleCommand function.
//
define([], function() {
	// Pass in a instance of Chat (to be renamed Console - or something).
	function GameServer (chat) {
		this.chat = chat;

		chat.addCommand('listGames', function() { chat.emit('listGames') });
		chat.addCommand('listLiveGames', function() { chat.emit('listLiveGames') });
		chat.addCommand('createGame', this.createGame.bind(this));
		chat.addCommand('joinGame', this.joinGame.bind(this));

		chat.addListener('launchGame', this.launchGame.bind(this));
	}

	// ----------------------
	// Commands.
	// ----------------------
	GameServer.prototype.createGame = function(gameName) {
		if (gameName === undefined) {
			this.chat.addNotification(Date.now(), 'Must specify a game name.');
			return;
		}

		this.chat.emit('createGame', {
			game: gameName,
		});
	};

	GameServer.prototype.createGame = function(gameName) {
		if (gameName === undefined) {
			this.chat.addNotification(Date.now(), 'Must specify a game name.');
			return;
		}

		this.chat.emit('createGame', {
			game: gameName,
		});
	};

	GameServer.prototype.joinGame = function(gameName) {
		if (gameName === undefined) {
			this.chat.addNotification(Date.now(), 'Must specify a game name.');
			return;
		}

		this.chat.emit('joinGame', {
			game: gameName,
		});
	};

	// ----------------------
	// Listeners.
	// ----------------------
	GameServer.prototype.launchGame = function(data) {
		window.location.href = data.url;
	};

	return GameServer;
});
