// This is...
//
// TODO: Sort out match/game nomenclature.


// Rules:
//  A player (i.e. username) can only be waiting for one game at a time.
//
// Games (gameServer.games):
//  Object keyed on game identifier. Values are the result of requiring the game module.
//  Game identifier must correspond to the directory in which the game exists.
//  Example game identifiers: tictactoe, micro_brew_wars, fleches.
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
//    WAITING - waiting for enough players to join.
//    PLAYING - currently playing.
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
//
// Design decision regarding socket.io namespaces.
// ----
// It is quite difficult to see how we could use a namespace like /tictactoe
// and still route messages to the actual game object. An alternative design
// uses a namespace of the game UUID, and adds the listeners when the game is
// created. This should work - but how do we tear down the listeners when the
// game is finished? Additionally - is there any significant overhead with
// having this large number of namespaces? What will happen if we cannot
// destroy the listener when the game finishes?
//
//

var uuid = require ('uuid'),
  _ = require ('underscore'),
  util = require('util');

function GameServer (games, app, chat) {
  var $this = this,
    gameName;

  // Exposed parameters.
  this.liveGames = {};

  //  The list of enabled games. These will each be required so a corresponding
  //  directory must exist, or the application will error.
  //  TODO: Shouldn't this be an array?
  this.games = {};

  //  Handler to the express application.
  //  TODO: Why is this used? A: This is used to bind the routes of a game to the express application.
  //  TODO: Perhaps we ought to return the names of the bound routes so that
  //  other modules can check for conflict. Complicated. Maybe we need a "route manager".
  this.app = app;

  //  trogon-chat object.
  //  TODO: Why is this used? A: This is used to send notifications to the
  //  socket that requests things like game lists. If we didn't have this, we'd
  //  need to attach something to either the session or the socket object.
  //
  //  TODO: Is this what we'll call it? A: No. It will be command center.
  this.chat = chat;

  // Hook up all the games:
  // * Require the files.
  // * Bind /gameID/matchID route to game_object.play.
  games.forEach(function(gameID) {
    // TODO: gameID could be confused with game.id. Fix this.
    // TODO: Validate that all games conform to the required API.
    //
    // TODO: We need to somehow catch all events that are being sent for this
    // game type, but forward them to the correct instance object. Should that
    // be managed by the GameServer? Probably. See example:
    // http://socket.io/#how-to-use
    // .of('/chat')
    // .on('connection', function (socket) {
    //
    //
    // Then in the client:
    // var chat = io.connect('http://localhost/chat')
    $this.games[gameID] = require('./games/' + gameID);
    app.get('/' + gameID + '/*', $this.games[gameID].play.bind($this, $this));
  });

  // ----------------------
  // Hook up listeners.
  // TODO: Do these functions really need access to the session object? The
  // socket object is neccessary to send messages.
  // ----------------------
  // TODO: Rename chat to command-center (or something).
  chat.addListener('listGames', this.listGames.bind(this));
  chat.addListener('listLiveGames', this.listLiveGames.bind(this));

  chat.addListener('createGame', this.createGame.bind(this));
  chat.addListener('joinGame', this.joinGame.bind(this));
}

// ----------------------
// Helper functions.
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

// Add a player to a specific match.
GameServer.prototype.addPlayerToGame = function(socket, session, game) {
  var $this = this;

  // TODO: It's cumbersome to carry the room around. Perhaps we need an object
  // that contains socket, session, AND room name?
  this.chat.sendNotification(
    socket,
    util.format('You have joined %s\'s game of %s.', game.owner, game.gameType));

  game.players.push(socket.username);

  if (game.players.length === this.game(game.gameType).getConfig('minPlayers')) {

    game.state = 'PLAYING';

    var countdown = 5;
    function sendCountdown() {
      var s;

      if (countdown === 0) {
        $this.launchGame(socket, session, game);
      } else {
        if (countdown === 1) {
          s = 'second';
        } else {
          s = 'seconds';
        }

        $this.chat.sendNotification(
          socket,
          util.format('%s\'s game of %s will begin in %s %s...', game.owner, game.gameType, countdown, s));

        countdown -= 1;
        setTimeout(sendCountdown, 1000);
      }
    }

    sendCountdown();
  }
};

// Launch a match - there are enough players.
GameServer.prototype.launchGame = function(socket, session, game) {
  // TODO: I don't really like emitting to the socket directly. We might want
  // to intercept it at the chat layer. Is there a better way?
  socket.emit('launchGame', {
    url: util.format('%s/%s', game.gameType, game.id)
  });

  this.addGameConnectionListener(game.id);
};

// Called when a game is created to bind up listeners for that UUID.
// TODO: The callstack here is a bit weird.
GameServer.prototype.addGameConnectionListener = function(gameUuid) {
  var listeners = this.liveGames[gameUuid].game.getListeners(),
    game = this.liveGames[gameUuid].game,
    $this = this;

  this.chat.addNamespacedListener(gameUuid, 'connection', function(err, socket, session) {
    if (err) {
      throw(err);
    }

    // Call the connection listener in the game.
    game.connection(socket, session);

    for (event in listeners) {
      console.log('Bound %s event %s.', $this.liveGames[gameUuid].gameType, event);
      socket.on(event, listeners[event].bind(game, socket, session));
    }
  });

};


// ----------------------
// Command center listener events.
// ----------------------

// A socket has requested the list of games that may be created.
GameServer.prototype.listGames = function(socket, session, data) {
  this.chat.sendNotification(
    socket,
    util.format('The following games are available: %s. ' +
      'To create a game send /createGame <game name>.', this.getAvailableGames().join(', ')),
    data.roomName);
};

// A socket has requested the list of games that are currently live and WAITING.
GameServer.prototype.listLiveGames = function(socket, session, data) {
  var liveGames = _.where(this.liveGames, {'state': 'WAITING'}),
    formatStr,
    msg,
    games = [];

  console.log('listLiveGames this.liveGames=%s', this.liveGames);
  console.log(util.inspect(this.liveGames));

  if (liveGames.length === 0) {
    msg = 'There are no live games at the moment. Why don\'t you create one using /createGame?';
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


// A socket has requested to create a game. The game will be created in a
// WAITING state.
GameServer.prototype.createGame = function(socket, session, data) {
  var gameUuid;

  // Check the game name is one of the available games.
  if (_.has(this.games, data.game) === false) {
    this.chat.sendNotification(socket, util.format('No such game %s.', data.game), data.roomName);
    return;
  }

  // Create a UUID for the match. This is the unique ID for the match.
  // TODO: Rename gameUuid to matchUuid.
  // TODO: Rename liveGames to liveMatches.
  gameUuid = uuid.v4();

  // Create the match.
  this.liveGames[gameUuid] = {
    id: gameUuid,
    owner: socket.username,
    gameType: data.game,
    state: 'WAITING',
    game: new this.games[data.game](this),
    created: Date.now(),
    players: [socket.username]
  };

  // Tell the requestor that the game was created.
  this.chat.sendNotification(
    socket,
    util.format('Created game %s. Waiting for %s players.', data.game, this.game(data.game).getConfig('minPlayers')),
    data.roomName);
};

// A socket has requested to join a specific match.
GameServer.prototype.joinGame = function(socket, session, data) {
  // Check the match ID exists.
  if (_.has(this.games, data.game) === false) {
    this.chat.sendNotification(socket, util.format('No such game %s.', data.game), data.roomName);
    return;
  }

  // Sort WAITING matches based on created date.
  var liveGames = _.where(this.liveGames, {'state': 'WAITING'}).sort(function(a,b) { return a.created > b.created; });

  // Pick the oldest WAITING match.
  var gameToJoin = null;
  liveGames.forEach( function (game) {
    if(gameToJoin === null && game.gameType === data.game) {
      gameToJoin = game;
    }
  });

  if (gameToJoin === null) {
    this.chat.sendNotification(
      socket,
      util.format('Sorry, there there are no %s games to join. You can start one using /createGame.', data.game),
      data.roomName);
    return;
  }

  this.addPlayerToGame(socket, session, gameToJoin);
};

module.exports = GameServer;
