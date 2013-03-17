function GameServer (games, app, chat) {
	// Hook up games.
	for (gameIdx in games) {
		var game = require('./games/' + games[gameIdx]);
		new game(app);
	}
}

module.exports = GameServer;
