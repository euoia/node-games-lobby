// TODO: The number of instances of emitting a simply message indicates that we
// could possibly do with a chat.addSimpleCommand function.
//
define([], function() {
	// Pass in a instance of Chat (to be renamed Console - or something).
	function GameServer (chat) {
		this.chat = chat;

		chat.addCommand('listGames', function() { chat.emit('listGames') });
		chat.addCommand('listLiveGames', function() { chat.emit('listLiveGames') });
		chat.addCommand('startGame', this.startGame.bind(this));
	}

	// ----------------------
	// Commands.
	// ----------------------
	GameServer.prototype.startGame = function(gameName, numPlayers) {
		if (gameName === undefined) {
			this.chat.addNotification(Date.now(), 'Must specify a game name.');
			return;
		}

		if (numPlayers === undefined) {
			this.chat.addNotification(Date.now(), 'Must specify the number of players.');
			return;
		}

		this.chat.emit('startGame', {
			game: gameName,
			numPlayers: numPlayers
		});
	};

	return GameServer;
});
