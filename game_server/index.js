// Created:            Wed 30 Oct 2013 01:44:14 AM GMT
// Last Modified:      Wed 30 Oct 2013 03:41:57 PM GMT
// Author:             James Pickard <james.pickard@gmail.com>
// --------------------------------------------------
// Summary
// ----
// The GameServer object contains all the games and all of the matches that are
// in-progress.
// --------------------------------------------------
// TODOs
// ----
// TODO: Sort out match/game nomenclature.
// TODO: Thoroughly rename chat to command center.
// TODO: Fix handler/listener/event etc.
// TODO: Handling of sockets/sessions should be simpler (not 2 objects).
// TODO: Use eventData instead of simply data, to convey that it is sent by the event emitter.
// TODO: Is roomName tacked onto the eventData? If so - that's a bit bad to a have a reserved key.
// TODO: It would be good if the game code did not need to deal with: sockets, sessions, requests, responses.
// --------------------------------------------------
// Limitations / Rules:
// ----
//  1. A player (i.e. username) can only be waiting for one game at a time.
// --------------------------------------------------
// General notes:
//  1. Errors. What to do? Throw an error? Yes for now. This means that a
//     client could theoretically cause a server error by submitting bad data.
//     That's fine for now.
//
// TODO: Handle games with a variable number of players.
// TODO: Since we are adding socket events with chat.addSocketEvent we could
//       proxy that in order to log any incoming socket events before they are
//       passed on.
// TODO: Handle cancellations if a player leaves or tries to start another game.
// --------------------------------------------------
// Regarding socket.io namespaces.
// ----
// It is quite difficult to see how we could use a namespace like /tictactoe
// and still route messages to the actual game object. An alternative design
// uses a namespace of the game UUID, and adds the listeners when the game is
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
// TODO: Get rid of req and res in the actual game. The game can only go one of
// several ways!
// TODO: This is awful - the game should not have access to the gameServer
// object. This function should be proxied through a gameServer function which
// does its stuff.
//
//    Constructor(gameServer) -
//      The constructor should set up a new game instance state. The game
//      object will be instantiated when a new game is created. A reference to
//      the gameServer object ought to be kept. (TODO: Get rid of this
//      requirement).
//
//    ----
//    Match shared functions.
//
//    play(gameServer, req, res) -
//      Using the matchID from the URL this express handler should lookup the match, and if found initialise it.
//      The game should check that the gameServer has the game (BAD!) and if so
//      initialise the game state. If successful the HTTP response (probably an
//      initial match state - see example views/games/tictactoe.js and
//      public/javascripts/games/tictactoe.js.
//
//    getConfig(configName) -
//      Return config settings for the game. Config object must have keys:
//      minPlayers, maxPlayers.
//
//    TODO: Actually just have the constructor return an object with all required keys filled in, e.g:
//      var tictactoe = {
//        minimumPlayers: 2,
//        maximumPlayers: 2,
//        connectionEvent: this.connection.bind(this),
//        playEvent: this.play.bind(this),
//        events: {
//          'select': this.select.bind(this)
//        }
//      }
//
//    ----
//    Match instance methods.
//
//    prototype.connection(socket, session) -
//      Called when a connection from the socket comes in. The game should
//      store the sockets and sessions so that it is possible to emit events to
//      all players.
//
//    prototype.getEventFunctions() -
//      Return a object whose keys are event names and whose values are
//      functions. The functions will be called when the events come in on the
//      match namespace.
//
//
//

var uuid = require ('uuid'),
  _ = require ('underscore'),
  util = require('util'); // TODO: What is util? Sounds fishy...

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
  //  The list of enabled games (object keyed on game identifier).
  this.games = {};
  // Access to the game objects themselves.
  //    object key: game ID
  //    object val: game object (see below).
  //
  // The game object is the result of require()'ing games/game ID. Further,
  // the game object must implement certain methods. See game object documentation.

  // Hook up all the games:
  // * Require the files.
  // * Bind /gameID/matchID route to game_object.play.
  for (var gameIDidx = 0; gameIDidx < gameIDs.length; gameIDidx += 1) {
    var gameID = gameIDs[gameIDidx];

    //------------------------------------------------------
    // Mysterious sidebar [2013-10-30 - not sure what this is about]
    // -----
    // We need to somehow catch all events that are being sent for this
    // game type, but forward them to the correct instance object. Should that
    // be managed by the GameServer? Probably. See example:
    // http://socket.io/#how-to-use
    // .of('/chat')
    // .on('connection', function (socket) {
    //
    //
    // Then in the client:
    // var chat = io.connect('http://localhost/chat')
    //------------------------------------------------------

    // Require the object.
    var game = require('./games/' + gameID);
    this.games[gameID] = game;

    // TODO: Validate the game object conforms to the required API.
    // TODO: Do we really need access to app.get here? Can't a higher level
    // take care of this?
    app.get('/' + gameID + '/*', game.play.bind(this, this));
  }

}

// ----------------------
// Helper functions.
// ----------------------

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

  // TODO: It's cumbersome to carry the room around. Perhaps we need an object
  // that contains socket, session, AND room name?
  this.commandCenter.sendNotification(
    socket,
    util.format('You have joined %s\'s game of %s.', match.owner, match.gameID));

  // Add the player to the array of usernames playing.
  match.playerUsernames.push(socket.username);

  // TODO: Could this not be a generic method?
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

  // Tell the client that it can launch the game and provide a url of the format:
  // gameID/matchID for the client to redirect to.
  //
  // TODO: I don't really like emitting to the socket directly. We might want
  // to intercept it at the chat layer. Is there a better way?
  // TODO: Rename this event launchGame to lauchMatch - required client-side change.
  // TODO: The games themselves could possibly override this if ever desired.
  socket.emit('launchMatch', {
    url: util.format('%s/%s', match.gameID, match.id)
  });

  // Add a handler for the connection event when it comes in on the namespace
  // of the match ID.
  // TODO: How do namespaces work? How does the client specify the namespace?
  // TODO: Is the 'connection' event special?
  this.commandCenter.addNamespacedEventHandler(match.id, 'connection', function(err, socket, session) {
    if (err) {
      throw(err);
    }

    // Call the connection method in the game instance.
    match.gameInstance.connection(socket, session);

    // This is the magic bit.
    var eventFunctions = match.gameInstance.getEventFunctions();

    // Games can set up their own listeners for socket.io events that will
    // passed directly to the game instance. This way the front-end can emit socket.io
    // events and have the game instance respond.
    for (var event in eventFunctions) {
      if (eventFunctions.hasOwnProperty(event)) {
        var eventFunction = eventFunctions[event];

        socket.on(event, eventFunction.bind(match, socket, session));
        console.log('Bound %s event for a %s game.', event, match.gameID, ev);
      }
    }
  });
};


// ----------------------
// Command center listener events.
// ----------------------

// A socket has requested the list of games that may be created.
GameServer.prototype.listGames = function(socket, session, eventData) {
  // TODO: Update the command.
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
    this.commandCenter.sendNotification(socket, util.format('No such game %s.', eventData.gameID), data.roomName);
    return;
  }

  // Instantiate a game for the match.
  var matchID          = uuid.v4();
  var Game             = this.games[eventData.gameID];
  var gameInstance     = new Game(this);

  // Instantiate the match.
  var match = this.matches[matchID] = {
    id:              matchID,
    owner:           socket.username,
    game:            Game,
    gameInstance:    gameInstance,
    gameID:          eventData.gameID,
    state:           'WAITING',
    created:         Date.now(),
    playerUsernames: [socket.username]
  };

  // Tell the requestor that the game was created.
  this.commandCenter.sendNotification(
    socket,
    util.format('Created match %s. Waiting for %s players.',
                eventData.gameID,
                Game.getConfig('minPlayers')),
    eventData.roomName);
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

module.exports = GameServer;
