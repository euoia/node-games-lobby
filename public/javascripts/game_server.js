// TODO: The number of instances of emitting a simply message indicates that we
// could possibly do with a commandCenter.addSimpleCommand function.
//
define([], function() {
  // Pass in a instance of the command center.
  function GameServer (commandCenter) {
    this.chat = chat;

    // Commands.
    commandCenter.addCommand('listGames', function() { commandCenter.emit('listGames'); });
    commandCenter.addCommand('listMatches', function() { commandCenter.emit('listMatches'); });
    commandCenter.addCommand('createMatch', this.createMatch.bind(this));
    commandCenter.addCommand('joinMatch', this.joinMatch.bind(this));

    // Listener events.
    commandCenter.addListener('launchMatch', this.launchGame.bind(this));
  }

  // ----------------------
  // Commands.
  // ----------------------
  GameServer.prototype.createMatch = function(gameID) {
    if (gameID === undefined) {
      this.commandCenter.addNotification(Date.now(), 'Must specify a game name.');
      return;
    }

    this.commandCenter.emit('createMatch', {
      gameID: gameID
    });
  };

  GameServer.prototype.joinMatch = function(gameID) {
    if (gameID === undefined) {
      this.commandCenter.addNotification(Date.now(), 'Must specify a game name.');
      return;
    }

    this.commandCenter.emit('joinMatch', {
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
