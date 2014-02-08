// TODO: The number of instances of emitting a simply message indicates that we
// could possibly do with a commandCenter.addSimpleCommand function.
//
define([], function() {
  // Pass in a instance of the command center.
  function GameServer (commandCenter, options) {
    this.commandCenter = commandCenter;

    // jQuery elements.
    this.roomMatchListDiv = $(options.roomMatchListDiv);
    this.roomMatchListUl = null;
    this.createMatchButton = $(options.createMatchButton);
    this.createMatchButton.click(this.createMatch.bind(this, 'gorillas'));
    console.log("options", options);

    // Commands.
    commandCenter.addCommand('listGames', function() { commandCenter.emit('listGames'); });
    commandCenter.addCommand('listMatches', function() { commandCenter.emit('listMatches'); });
    commandCenter.addCommand('createMatch', this.createMatch.bind(this));
    commandCenter.addCommand('joinMatch', this.joinMatch.bind(this));

    // Listener events.
    commandCenter.addListener('launchMatch', this.launchGame.bind(this));
    commandCenter.addListener('roomMatchList', this.roomMatchList.bind(this));

    // Initialise jQuery elements.
    this.initRoomMatchList();
  }

  // jQuery element initialisation.
  GameServer.prototype.initRoomMatchList = function(users) {
    $('<div id="roomMatchListTitle">Current games</div>')
      .appendTo(this.roomMatchListDiv);

    this.roomMatchListUl = $('<ul id="roomMatchList" />').appendTo(this.roomMatchListDiv);
  };

  // ----------------------
  // Commands.
  // ----------------------
  GameServer.prototype.createMatch = function(gameID) {
    console.log("createMatch gameID=%s", gameID);
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
  GameServer.prototype.launchGame = function(eventData) {
    window.location.href = eventData.url;
  };

  // Receive the updated match list.
  GameServer.prototype.roomMatchList = function(eventData) {
    this.roomMatchListUl.html('');

    var joinMatch = function (matchID) {
      console.log("Trying to join %s", matchID);
        this.commandCenter.emit('joinMatch', {
          matchID: matchID
        });
    }.bind(this);

    for (var i = 0; i < eventData.length; i += 1) {
      var match = eventData[i];
      var matchElem = $('<li class="match"><div class="matchContainer">' +
        '<img class="gameIcon" src="img/games/' +
        match.gameID + '/icon.png" /><div class="matchText">' +
        match.gameID +' by ' + match.owner +
        '</div></div></li>').appendTo(this.roomMatchListUl);

      matchElem.click(joinMatch.bind(this, match.id));
    }
  };

  return GameServer;
});

