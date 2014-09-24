// Created:            Wed 30 Oct 2013 01:44:14 AM GMTccou
// Last Modified:      Fri 04 Apr 2014 03:26:44 PM EDT
// Author:             James Pickard <james.pickard@gmail.com>
// --------------------------------------------------
// Summary
// ----
// The GamesLobby object contains all the games and all of the matches that are
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
  util = require('util'),
  CommandCenter = require('command-center'),
  EventEmitter = require('events').EventEmitter,
  pluralize = require('pluralize'),
  ResultStore = require('./ResultStore.js'),
  MatchManager = require('./MatchManager.js'),
  account = require('../account/account.js');

// The GamesLobby object contains all the games available and all the matches
// being played.
//
// gameIDs          - Array of game IDs (strings).
//                    Each game must conform to the API and exist in the
//                    filesystem at games/gameID/index.js.
// app              - Express application object.
// commandCenter    - Command center object.
function GamesLobby (gameIDs, app, sessionSocketIO) {
  //  Handle to the express application.
  //  This is used to bind the routes of a game to the express application.
  //  TODO: Could we decouple from express easily? Put the logic in a routing
  //  manager possibly. Low priority!
  //  TODO: Doesn't appear to be used.
  this.app = app;

  //  Command center object.
  //  This is used to send a properly formatted response to a socket object
  //  after a command has been issued. See
  //
  //  like game lists. If we didn't have this, we'd need to attach something to
  //  either the session or the socket object.
  //
  this.commandListener = new EventEmitter();
  this.commandCenter = new CommandCenter (sessionSocketIO, this.commandListener);

  // ----------------------
  // Command center commands.
  // TODO: Do these functions really need access to the session object? The
  // socket object is neccessary to send messages.
  // ----------------------
  // TODO: Update the listener text for all of these, probably requires client-side change.
  this.commandCenter.addEventHandler('listGames', this.listGames.bind(this));
  this.commandCenter.addEventHandler('listMatches', this.listWaitingMatches.bind(this));
  this.commandCenter.addEventHandler('createMatch', this.createMatch.bind(this));
  this.commandCenter.addEventHandler('joinGame', this.joinGame.bind(this));
  this.commandCenter.addEventHandler('joinMatch', this.joinMatch.bind(this));
  this.commandCenter.addEventHandler('record', this.getPlayerRecord.bind(this));
  this.commandCenter.addEventHandler('save', this.savePlayer.bind(this));

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
    // TODO: Game directory ought to be configurable.
    this.games[gameID] = require(util.format('../games/%s/index.js', gameID));

    // The URL is made up of /gameID/matchID/action.
    app.get('/' + gameID + '/*/*', this.gameRouteHandler.bind(this, gameID));
  }

  // The result store.
  // Stores results of matches.
  // TODO: There should be a ResultStore for each game. To simplify the use
  // case where a single game is used, the whole system should support the
  // notion of a default game.
  this.resultStore = new ResultStore();

  // The result listener.
  // When a match ends in a result, it is published through this service as a
  // 'result' event.
  this.resultListener = new EventEmitter();
}

GamesLobby.prototype.start = function() {
  this.resultListener.on('result', function (eventData) {
    console.log('[GamesLobby] <= result [winners=%s] [losers=%s] [drawers=%s]',
      eventData.winners,
      eventData.losers,
      eventData.drawers);

    this.resultStore.addWinners(eventData.winners);
    this.resultStore.addLosers(eventData.losers);
    this.resultStore.addDrawers(eventData.drawers);

    this.matchManager.deleteMatch(eventData.matchID);
  }.bind(this));

  // Send the room match list to players when they enter a room.
  this.commandListener.on('subscribe', function(eventData) {
    console.log('[GamesLobby] <= subscribe [%s]', eventData.roomName);
    this.sendRoomWaitingMatches(eventData.roomName);
  }.bind(this));

  // Delete a player's matches when they disconnect.
  this.commandListener.on('disconnect', function(eventData) {
    console.log('[GamesLobby] <= disconnect [%s]', eventData.username);
    this.matchManager.deleteMatchesOwnedByPlayer(eventData.username);
    this.sendRoomWaitingMatches(eventData.roomName);
  }.bind(this));

  // The storage for the matches.
  // TODO: We could store the results in the MatchManager I suppose.
  this.matchManager = new MatchManager(this.resultListener);

  // --------------------------------------------------
  // Testing - start a gorillas match.
  var match = this.matchManager.createMatch ('g', 'gorillas', this.games.gorillas, 'james');
  this.matchManager.addPlayerToMatch('bob', match);
  // --------------------------------------------------
};

// ----------------------
// Helper functions.
// ----------------------

// This route handler is called whenever a request comes in of the:
// form: /gameID/matchID/verb.
//
// It checks that the game, match, verb are valid and then hands over to the
// game instance.
GamesLobby.prototype.gameRouteHandler = function (gameID, req, res) {
  var matchID  = req.params[0];
  var action   = req.params[1];
  var match    = this.matchManager.getMatch(matchID);

  if (this.games[gameID] === undefined) {
    console.error(util.format(
      'game_server [gameID=%s matchID=%s action=%s] : error, gameID not found.',
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
    return res.end('Match not found.');
  }

  // Check whether a route for this action exists in the game instance.
  var matchRoutes = match.gameInstance.getRoutes();
  var route = matchRoutes[action];

  if (route === undefined) {
    console.error(util.format(
      'game_server [gameID=%s matchID=%s action=%s] : error, action not valid.',
      gameID,
      matchID,
      action));

    return res.end('Route not valid.');
  }

  // Finally, call the route handler function.
  return route.call(match.gameInstance, req, res);
};

// Return as an array the gameIDs of games that can be played.
GamesLobby.prototype.getAvailableGames = function() {
  return Object.keys(this.games);
};

// Launch a match - there are enough players.
GamesLobby.prototype.launchMatch = function(match) {
  // Tell the lobby client that it can launch the game and provide a url of the
  // format: gameID/matchID for the client to redirect to.
  var eventData = {
    url: util.format('%s/%s/%s',
      match.gameID,
      match.id,
      this.games[match.gameID].getConfig('launchVerb')),
    matchID: match.id
  };

  for (var i = 0; i < match.playerUsernames.length; i += 1) {
    var playerUsername = match.playerUsernames[i];
    console.log('[GamesLobby] => launchMatch [%s]', playerUsername);
    this.commandCenter.usernameEmit(playerUsername, 'launchMatch', eventData);
  }
};


// ----------------------
// Command center listener events.
// ----------------------

// A socket has requested the list of games that may be created.
GamesLobby.prototype.listGames = function(socket, session, eventData) {
  if (eventData.roomName === undefined) {
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
GamesLobby.prototype.createMatch = function(socket, session, eventData) {
  console.log('[GamesLobby] <= createMatch [%s] [%s]', session.username, eventData.gameID);

  // Check the game name is one of the available games.
  if (_.has(this.games, eventData.gameID) === false) {
    console.log('[GamesLobby] createMatch [%s] fail: no such game %s', session.username, eventData.gameID);
    this.commandCenter.sendNotification(
      socket,
      util.format('No such game %s.', eventData.gameID),
      eventData.roomName);
    return;
  }

  // Check the player doesn't already have a match.
  if (this.matchManager.getMatchesByOwner(session.username).length > 0) {
    console.log('[GamesLobby] createMatch [%s] fail: player may only have one match', session.username);
    this.commandCenter.sendNotification(
      socket,
      util.format('You may only have one match at a time.'),
      eventData.roomName);
    return;
  }

  // Instantiate the match.
  var matchID = uuid.v4();
  var match = this.matchManager.createMatch (
    matchID,
    eventData.gameID,
    this.games[eventData.gameID],
    socket.username);

  // Tell the requestor that the game was created.
  var playersNeeded = match.minPlayers - match.playerUsernames.length;
  this.commandCenter.sendNotification(
    socket,
    util.format('Created match %s. Waiting for %s more %s.',
      eventData.gameID,
      playersNeeded,
      pluralize('player', playersNeeded)));

  this.sendRoomWaitingMatches(eventData.roomName);
  console.log('[GamesLobby] createMatch [%s] [%s] success', session.username, eventData.gameID);
};


// A socket has requested the list of matches that are WAITING.
// This is a text-based command.
// TODO: Move display of this information to the client, remove server-side
// formatting.
GamesLobby.prototype.listWaitingMatches = function(socket, session, eventData) {
  var waitingMatches = this.matchManager.getWaitingMatches();

  if (waitingMatches.length === undefined) {
    this.commandCenter.sendNotification(
      socket,
      'There are no waiting matches at the moment. You can create one using '+
      '/createMatch <game name>.',
      eventData.roomName);
    return;
  }

  var matchDescriptions = _.map(waitingMatches, function(match) {
    return util.format('%s created by %s',
      match.gameID,
      match.owner);
  });

  var isOrAre;
  if (waitingMatches.length === 1) {
    isOrAre = 'is';
  } else {
    isOrAre = 'are';
  }

  var msg = util.format(
    'There %s %d %s : ',
    isOrAre,
    waitingMatches.length,
    pluralize('match', waitingMatches.length),
    matchDescriptions.join(', '));

  this.commandCenter.sendNotification(socket, msg);
};


// This method is private since it does no safety checks on match.
GamesLobby.prototype.addPlayerToMatch = function(username, match) {
  this.matchManager.addPlayerToMatch(username, match);

  this.commandCenter.notifyUsername(
    match.owner,
    util.format('%s has joined your game of %s.',
      username,
      match.gameID));

  this.commandCenter.notifyUsername(
    username,
    util.format('You joined %s\'s game of %s.',
      match.owner,
      match.gameID));


  // Send the countdown to each player.
  // TODO: Should this be done on the client side?
  if (match.state === 'PLAYING') {

    // Add the socket.io namespaced listeners.
    this.commandCenter.addNamespacedEventHandler(
      match.id,
      'connection',
      match.gameInstance.connection.bind(match.gameInstance)
    );

    // Do the countdown on the clients.
    var secondsRemaining = 5;
    var sendCountdown = function() {
      if (secondsRemaining === 0) {
        this.launchMatch(match);
      } else {
        var secondsRemainingStr = pluralize('second', secondsRemaining);

        this.commandCenter.notifyUsername(
          username,
          util.format('%s\'s game of %s will begin in %s %s...',
            match.owner,
            match.gameID,
            secondsRemaining,
            secondsRemainingStr));


        this.commandCenter.notifyUsername(
          match.owner,
          util.format('Your game of %s will begin in %s %s...',
            match.gameID,
            secondsRemaining,
            secondsRemainingStr));

        secondsRemaining -= 1;
        setTimeout(sendCountdown, 1000);
      }
    }.bind(this);

    sendCountdown();
  }
};

// joinGame event handler.
//
// A socket has requested to join any WAITING game of a specific game ID.
GamesLobby.prototype.joinGame = function(socket, session, eventData) {
  console.log('[GameLobby] <= joinGame [%s] [%s]', session.username, eventData.gameID);

  // Check the game exists.
  if (_.has(this.games, eventData.gameID) === false) {
    this.commandCenter.sendNotification(
      socket,
      util.format('No such game %s.', eventData.gameID),
      eventData.roomName);

    return;
  }

  var match = this.matchManager.getFirstWaitingMatch(eventData.gameID);

  if (match === undefined) {
    this.commandCenter.sendNotification(
      socket,
      util.format('Sorry, there there are no %s matches to join. ' +
        'You can start one using /createMatch <game name>.', eventData.gameID),
      eventData.roomName);
    return;
  }

  this.addPlayerToMatch(session.username, match);
  this.sendRoomWaitingMatches(eventData.roomName);

  this.commandCenter.sendRoomNotification(
    socket,
    eventData.roomName,
    util.format('%s joined %s\'s %s game.',
      session.username,
      match.owner,
      match.gameID)
  );
};


// joinMatch event handler.
//
// A socket has requested to join a specific match.
GamesLobby.prototype.joinMatch = function(socket, session, eventData) {
  console.log('[GamesLobby] <= joinMatch [%s] [%s]', session.username, eventData.matchID);

  var match = this.matchManager.getMatch(eventData.matchID);
  if (match === undefined) {
    this.commandCenter.sendNotification(
      socket,
      util.format('No such match %s.', eventData.matchID),
      eventData.roomName);

    return;
  }

  if (match.state !== 'WAITING') {
    this.commandCenter.sendNotification(
      socket,
      util.format('That match has already started.'),
      eventData.roomName);

    return;
  }

  if (match.owner === session.username) {
    this.commandCenter.sendNotification(
      socket,
      util.format('You cannot join your own game.'),
      eventData.roomName);

    return;
  }

  // Now join the match.

  // Delete any matches the player had started.
  var didDeleteAMatch = false;
  this.matchManager.getMatchesByOwner(session.username).forEach(function (match) {
    console.log('[GamesLobby] Deleting match [%s]', match.id);
    didDeleteAMatch = true;
    this.matchManager.deleteMatch(match.id);
  }.bind(this));

  if (didDeleteAMatch) {
    this.commandCenter.sendNotification(
      socket,
      util.format('Stopped your own match'),
      eventData.roomName);
  }

  this.addPlayerToMatch(session.username, match);
  this.sendRoomWaitingMatches(eventData.roomName);
  this.commandCenter.sendRoomNotification(
    socket,
    eventData.roomName,
    util.format('%s joined %s\'s %s game.',
      session.username,
      match.owner,
      match.gameID)
  );
};

GamesLobby.prototype.sendRoomWaitingMatches = function(roomName) {
  // Sort WAITING matches based on creation date.
  var waitingMatches = this.matchManager.getWaitingMatches();

  console.log('[GamesLobby] => sendRoomWaitingMatches [%s]', roomName);
  this.commandCenter.roomEmit(roomName, 'roomMatchList', waitingMatches);
};

GamesLobby.prototype.getPlayerRecord = function(socket, session, eventData) {
  console.log('[GamesLobby] <= getPlayerRecord [%s] [%s]', session.username, eventData.username);

  var playerRecord = util.format(
    '%s has %d %s and %d %s.',
    eventData.username,
    this.resultStore.getWins(eventData.username),
    pluralize('win', this.resultStore.getWins(eventData.username)),
    this.resultStore.getLosses(eventData.username),
    pluralize('loss', this.resultStore.getLosses(eventData.username)));


  this.commandCenter.sendNotification(
    socket,
    playerRecord,
    eventData.roomName);
};

// TODO: Probably call this register instead.
GamesLobby.prototype.savePlayer = function(socket, session, eventData) {
  account.registerAccount(session.username, eventData.password, function(err) {
    if (err) {
      console.log('[GamesLobby] <= save [%s] error: %s', session.username, err);
      return;
    }

    this.commandCenter.sendNotification(
      socket,
      'Save successful.',
      eventData.roomName);
  }.bind(this));
};

module.exports = GamesLobby;

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
// TODO: Use eventData instead of simply data, to convey that it is sent by the
//       event emitter.
// TODO: Is roomName tacked onto the eventData? If so - that's a bit bad to a
//       have a reserved key.
// TODO: It would be good if the game code did not need to deal with: sockets,
//       sessions, requests, responses.
// TODO: Fix the name and directory name of this module. Probably should be
//       GameLobby game-lobby.js.
// TODO: Rather than hard code the commands in the client-side javascript it
//       would be better if there was an event to retrieve the commands. This
//       might be harder than it seems, it might require the server to describe
//       the command format (number of parameters etc).
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
