// TODO: The number of instances of emitting a simply message indicates that we
// could possibly do with a chat.addSimpleCommand function.
//
define([], function() {
  // Pass in a instance of Chat (to be renamed Console - or something).
  function GameServer (chat) {
    this.chat = chat;

    // Commands.
    chat.addCommand('listGames', function() { chat.emit('listGames'); });
    chat.addCommand('listMatches', function() { chat.emit('listMatches'); });
    chat.addCommand('createMatch', this.createMatch.bind(this));
    chat.addCommand('joinMatch', this.joinMatch.bind(this));

    // Listener events.
    chat.addListener('launchMatch', this.launchGame.bind(this));
  }

  // ----------------------
  // Commands.
  // ----------------------
  GameServer.prototype.createMatch = function(gameID) {
    if (gameID === undefined) {
      this.chat.addNotification(Date.now(), 'Must specify a game name.');
      return;
    }

    this.chat.emit('createMatch', {
      gameID: gameID
    });
  };

  GameServer.prototype.joinMatch = function(gameID) {
    if (gameID === undefined) {
      this.chat.addNotification(Date.now(), 'Must specify a game name.');
      return;
    }

    this.chat.emit('joinMatch', {
      gameID: gameID
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
