define([], function() {
	// Pass in a instance of Chat (to be renamed Console - or something).
	function GameServer (chat) {
		chat.addCommand('listGames', function() {
			chat.emit('listGames');
		});
	}

	return GameServer;
});
