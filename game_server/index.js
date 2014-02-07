// Created:            Wed 30 Oct 2013 01:44:14 AM GMT
// Last Modified:      Fri 07 Feb 2014 11:39:21 AM EST
// Author:             James Pickard <james.pickard@gmail.com>
// --------------------------------------------------
// Summary
// ----
// The GameServer object contains all the games and all of the matches that are
// in-progress.
// --------------------------------------------------
// Limitations / Rules:
// ----
//  1. A player (i.e. username) can only be waiting for one game at a time.
// --------------------------------------------------
// General notes
// ----
//  1. Errors. What to do? Throw an error? Yes for now. This means that a
//     client could theoretically cause a server error by submitting bad data.
//     That's fine for now.
// --------------------------------------------------
// TODOs
// ----
// TODO: Handle games with a variable number of players.
// TODO: Since we are adding socket events with chat.addSocketEvent we could
//       proxy that in order to log any incoming socket events before they are
//       passed on.
// TODO: Handle cancellations if a player leaves or tries to start another game.
// TODO: Sort out match/game nomenclature.
// TODO: Thoroughly rename chat to command center.
// TODO: Fix handler/listener/event etc.
// TODO: Handling of sockets/sessions should be simpler (not 2 objects).
// TODO: Use eventData instead of simply data, to convey that it is sent by the event emitter.
// TODO: Is roomName tacked onto the eventData? If so - that's a bit bad to a have a reserved key.
// TODO: It would be good if the game code did not need to deal with: sockets, sessions, requests, responses.
// TODO: Fix the name and directory name of this module. Probably should be GameLobby game-lobby.js.
// --------------------------------------------------
// Regarding socket.io namespaces.
// ----
// It is quite difficult to see how we could use a namespace like /tictactoe
// and still route messages to the actual game object. An alternative design
// uses a namespace of the game ID, and adds the listeners when the game is
// created. This should work - but how do we tear down the listeners when the
// game is finished? Additionally - is there any significant overhead with
// having this large number of namespaces? What will happen if we cannot
// destroy the listener when the game finishes?
//
// - Update 2013-10-30: No idea what this means.
// --------------------------------------------------
// Game object documentation
// ----
// Your game object can do anything it likes. It may require any libraries it
// likes. The object returned by require()'ing games/gameId must implement the
// following methods:
//
//    Constructor() -
//      The constructor should set up the state of a new game.
//    ----
//    Game functions.
//
//    Game.getConfig(configName) -
//      Return a configuration setting for the game. Must return sensible
//      values where configName is: minPlayers, maxPlayers, launchVerb.
//          minPlayers - the minimum number of players allowed for the game.
//          maxPlayers - the maximum number of players allowed for the game.
//          launchVerb - the URL verb that the client should redirect to.
//
//    ----
//    Game instance methods.
//
//    Game.prototype.connection(err, socket, session) -
//      Called when a connection from the socket comes in. The game should
//      store the sockets and sessions so that it is possible to emit events to
//      all players.
//
//    Game.prototype.getRoutes() -
//      Return a object whose keys are URL route verbs and whose values are
//      route handler functions. The functions will be called when a request of
//      the form /gameID/matchID/verb is made.
//
//      As usual, the route handler functions must be of the form:
//        function routeHandler(req, res)
//

var uuid = require ('uuid'),
  _ = require ('underscore'),
  util = require('util');

// The GameServer object contains all the games available and all the matches
// being played.
//
// gameIDs          - Array of game IDs (strings).
//                    Each game must conform to the API and exist in the
//                    filesystem at games/gameID/index.js.
// app              - Express application object.
// commandCenter    - Command center object.
function GameServer (gameIDs, app, commandCenter) {
  //  Handler to the express application.
  //  This is used to bind the routes of a game to the express application.
  //  TODO: Could we decouple from express easily? Put the logic in a routing
  //  manager possibly. Low priority!
  this.app = app;

  //  Command center object.
  //  This is used to send a properly formatted response to a socket object
  //  after a command has been issued. See
  //
  //  like game lists. If we didn't have this, we'd need to attach something to
  //  either the session or the socket object.
  //
  this.commandCenter = commandCenter;

  // ----------------------
  // Command center commands.
  // TODO: Do these functions really need access to the session object? The
  // socket object is neccessary to send messages.
  // ----------------------
  // TODO: Update the listener text for all of these, probably requires client-side change.
  this.commandCenter.addEventHandler('listGames', this.listGames.bind(this));
  this.commandCenter.addEventHandler('listMatches', this.listWaitingMatches.bind(this));
  this.commandCenter.addEventHandler('createMatch', this.createMatch.bind(this));
  this.commandCenter.addEventHandler('joinMatch', this.joinMatch.bind(this));

  //------------------------------------------------------
  // matches:
  this.matches = {};
  // Matches that have not been removed from memory.
  //    object key: match UUID.
  //    object val: match object (see below).

  // match object:
  //  id        - UUID identifying the match.
  //  owner     - player who started the match.
  //  gameID    - gameID of the game.
  //  state     - one of:
  //    WAITING - waiting for enough players to join.
  //    PLAYING - currently playing.
  //------------------------------------------------------

  //------------------------------------------------------
  //  The enabled games.
  //  Object key: gameID
  //  Object value: game object (see below).
  this.games = {};

  // The game object is the result of requiring games/game ID. Further,
  // the game object must implement certain methods. See game object documentation.

  //------------------------------------------------------
  // Sidebar
  // -----
  // We need to somehow catch all events that are being sent for this
  // game, but forward them to the correct gameInstance. See example:
  // http://socket.io/#how-to-use
  // .of('/chat')
  // .on('connection', function (socket) {
  //
  // Then in the client:
  // var chat = io.connect('http://localhost/chat')
  //------------------------------------------------------

  // Hook up each game:
  // * Require the files.
  // * Set up any routes required by gameInstance.getRoutes().
  for (var gameIDidx = 0; gameIDidx < gameIDs.length; gameIDidx += 1) {
    var gameID = gameIDs[gameIDidx];

    // Require the game object.
    var game = this.games[gameID] = require('./games/' + gameID);

    // The URL is made up of /gameID/matchID/action.
    app.get('/' + gameID + '/*/*', this.gameRouteHandler.bind(this, gameID));
  }

  // Testing - start a gorillas match.
  var gameObj         = this.games.gorillas;
  var gameInstance    = new gameObj(this);

  this.instatiateMatch ({
    id:              'g',
    owner:           'james',
    game:            gameObj,
    gameInstance:    gameInstance,
    gameID:          'gorillas',
    state:           'PLAYING',
    created:         Date.now(),
    playerUsernames: ['james', 'bob']
  });

  this.bindMatchConnectionHandler('g');
}

// ----------------------
// Helper functions.
// ----------------------

// This route handler is called whenever a request comes in of the:
// form: /gameID/matchID/verb.
//
// It checks that the game, match, verb are valid and then hands over to the
// game instance.
GameServer.prototype.gameRouteHandler = function (gameID, req, res) {
  var matchID  = req.params[0];
  var action   = req.params[1];
  var match    = this.matches[matchID];

  if (this.games[gameID] === undefined) {
    console.error(util.format(
      'game_server [gameID=%s matchID=%s action=%s] : error, matchID not found.',
      gameID,
      matchID,
      action));

    return res.end('Game not found.');
  }

  if (match === undefined) {
    console.error(util.format(
      'game_server [gameID=%s matchID=%s action=%s] : error, matchID not found.',
      gameID,
      matchID,
      action));

    console.log(this.matches);
    return res.end('Match not found.');
  }

  // Check whether a route for this action exists in the game instance.
  var matchRoutes = match.gameInstance.getRoutes();
  var routeHandler = matchRoutes[action];

  if (routeHandler === undefined) {
    console.error(util.format(
      'game_server [gameID=%s matchID=%s action=%s] : error, action not valid.',
      gameID,
      matchID,
      action));

    return res.end('Route not valid.');
  }

  // Finally, call the route handler function.
  return routeHandler.call(match.gameInstance, req, res);
};

// Return as an array the gameIDs of games that can be played.
GameServer.prototype.getAvailableGames = function() {
  return Object.keys(this.games);
};

// Return the game object given its gameID.
GameServer.prototype.game = function(gameID) {
  return this.games[gameID];
};

// Returns a match given its UUID.
GameServer.prototype.match = function(matchUuid) {
  return this.matches[matchUuid];
};

// Add a player to a specific match.
GameServer.prototype.addPlayerToMatch = function(socket, session, match) {
  var $this = this;

  // TODO: Perhaps the command center could remember the socket? Or at least
  // provide lookup based on username.
  this.commandCenter.sendNotification(
    socket,
    util.format('You have joined %s\'s game of %s.', match.owner, match.gameID));

  // Add the player to the array of usernames playing.
  match.playerUsernames.push(socket.username);

  if (match.playerUsernames.length === match.game.getConfig('minPlayers')) {
    match.state = 'PLAYING';

    var countdown = 5;
    var sendCountdown = function() {
      var s;

      if (countdown === 0) {
        $this.launchMatch(socket, session, match);
      } else {
        if (countdown === 1) {
          s = 'second';
        } else {
          s = 'seconds';
        }

        $this.commandCenter.sendNotification(
          socket,
          util.format('%s\'s game of %s will begin in %s %s...', match.owner, match.gameID, countdown, s));

        countdown -= 1;
        setTimeout(sendCountdown, 1000);
      }
    };

    sendCountdown();
  }
};

// Launch a match - there are enough players.
GameServer.prototype.launchMatch = function(socket, session, match) {

  // Tell the lobby client that it can launch the game and provide a url of the
  // format: gameID/matchID for the client to redirect to.
  socket.emit('launchMatch', {
    url: util.format('%s/%s/%s', match.gameID, match.id, match.game.getConfig('launchVerb'))
  });

  this.bindMatchConnectionHandler(match.id);
};

GameServer.prototype.bindMatchConnectionHandler = function(matchID) {
  console.log('Binding match socket.io connection handler for matchID=%s', matchID);

  // Add the socket.io namespaced listener, call gameInstance.connection but
  // ensure 'this' is bound to the gameInstance object.
  this.commandCenter.addNamespacedEventHandler(
    matchID,
    'connection',
    this.matches[matchID].gameInstance.connection.bind(this.matches[matchID].gameInstance)
  );
};


// ----------------------
// Command center listener events.
// ----------------------

// A socket has requested the list of games that may be created.
GameServer.prototype.listGames = function(socket, session, eventData) {
  if (eventData.roomName === undefined) {
    console.log('GameServer: Warning: listGames without eventData.roomName.');
    return;
  }

  this.commandCenter.sendNotification(
    socket,
    util.format('The following games are available: %s. ' +
      'To create a game send /createMatch <game name>.', this.getAvailableGames().join(', ')),
    eventData.roomName);
};

// A socket has requested to create a match. The match will be created in a
// WAITING state.
// TODO: data.game should be data.gameID.
// TODO: data is not a well named variable.
GameServer.prototype.createMatch = function(socket, session, eventData) {
  var gameUuid;

  // Check the game name is one of the available games.
  if (_.has(this.games, eventData.gameID) === false) {
    this.commandCenter.sendNotification(socket, util.format('No such game %s.', eventData.gameID), eventData.roomName);
    return;
  }

  // Instantiate a game for the match.
  var matchID          = uuid.v4();
  var Game             = this.games[eventData.gameID];
  var gameInstance     = new Game(this);

  // Instantiate the match.
  this.instatiateMatch ({
    id:              matchID,
    owner:           socket.username,
    game:            Game,
    gameInstance:    gameInstance,
    gameID:          eventData.gameID,
    state:           'WAITING',
    created:         Date.now(),
    playerUsernames: [socket.username]
  });

  // Tell the requestor that the game was created.
  this.commandCenter.sendNotification(
    socket,
    util.format('Created match %s. Waiting for %s players.',
      eventData.gameID,
      Game.getConfig('minPlayers')),
      eventData.roomName);

  // Send the room the updates match list.
  this.commandCenter.roomEmit(eventData.roomName, 'matchList', this.matches);
};


// A socket has requested the list of matches that are WAITING.
// TODO: Move display of this information to the client, remove server-side
// formatting.
GameServer.prototype.listWaitingMatches = function(socket, session, eventData) {
  var waitingMatches = _.where(this.matches, {'state': 'WAITING'}),
    formatStr,              // A formatter string.
    msg,                    // The message to send back to the socket.
    matchDescriptions = []; // Array of strings describing waiting matches.


  console.log('listWaitingMatches');
  console.log(util.inspect(this.matches));

  if (waitingMatches.length === 0) {
    msg = 'There are no waiting matches at the moment. You can create one using /createMatch <game name>.';
  } else {
    waitingMatches.forEach(function (match) {
      matchDescriptions.push(util.format('%s created by %s',
                             match.gameID,
                             match.owner));
    });

    if (waitingMatches.length === 1) {
      formatStr = 'There is %s match waiting: %s';
    } else {
      formatStr = 'There are %s matches waiting: %s';
    }

    msg = util.format(
      formatStr,
      waitingMatches.length,
      matchDescriptions.join(', '));
  }

  this.commandCenter.sendNotification(
    socket,
    msg,
    eventData.roomName);
};


// joinMatch event handler.
//
// A socket has requested to join a WAITING game.
GameServer.prototype.joinMatch = function(socket, session, eventData) {
  // Check the game exists.
  if (_.has(this.games, eventData.gameID) === false) {
    this.commandCenter.sendNotification(
      socket,
      util.format('No such game %s.', eventData.gameID),
      eventData.roomName);

    return;
  }

  // Sort WAITING matches based on created date.
  var sortedWaitingMatches = _.where(
    this.matches,
    {'state': 'WAITING'}).sort(function(a,b) {
      return a.created > b.created;
    });

  // Pick the oldest WAITING match.
  // TODO: There is probably a slightly more readable way to do this using underscore.
  var matchToJoin = null;
  sortedWaitingMatches.forEach( function (match) {
    if(matchToJoin === null && match.gameID === eventData.gameID) {
      matchToJoin = match;
    }
  });

  if (matchToJoin === null) {
    this.commandCenter.sendNotification(
      socket,
      util.format('Sorry, there there are no %s matches to join. You can start one using /createMatch <game name>.', eventData.gameID),
      eventData.roomName);
    return;
  }

  this.addPlayerToMatch(socket, session, matchToJoin);
};

GameServer.prototype.instatiateMatch = function(matchData) {
  this.matches[matchData.id] = matchData;
};

module.exports = GameServer;
