// Created:            Thu 31 Oct 2013 12:06:16 PM GMT
// Last Modified:      Thu 31 Oct 2013 01:39:36 PM GMT
// Author:             James Pickard <james.pickard@gmail.com>
// --------------------------------------------------
// Summary
// ----
// This is the example tictactoe game that comes with
// https://github.com/euoia/node-games-lobby.
// --------------------------------------------------
// TODOs
// ----
// TODO: Handle reconnections, resuming the game.
// TODO: Handle observers (non-players) in the connection event.
// TODO: Document the events emitted and received by this game.

var util = require('util');

// Game configuration.
var config = {
  minPlayers: 2,
  maxPlayers: 2,
  launchVerb: 'play'
};

function Tictactoe () {
  // Player collection. Key is username, value is player object.
  // Player object has the keys: username, socket.
  this.players = {};

  this.nextPlayer = null; // Username of player who's turn is next.
  this.playerUsernames = []; // Array of player usernames.

  // Map board ownership. Tiles are assigned the owner's username.
  this.board = {
    topLeft: null,
    topMiddle: null,
    topRight: null,
    centerLeft: null,
    centerMiddle: null,
    centerRight: null,
    bottomLeft: null,
    bottomMiddle: null,
    bottomRight: null
  };

  // Socket handlers and routes.
  // TODO: This might not work!
  this.socketEventHandlers = {
    'select': this.select
  };

  this.routes = {
    'play': this.landingPage
  };
}

// --------------------------------------------------
// Express routes.

// Express request route that loads the game page.
Tictactoe.prototype.landingPage = function (req, res) {
  var username = req.session.username;

  // Add the player.
  this.addPlayer(username);

  // Render the view.
  console.log('tictactoe: %s loaded the launch page.', username);
  return res.render('games/tictactoe/index', { title: 'Chat' });
};


// --------------------------------------------------
// Methods required by the game object API.

// Game.getConfig(configName)
// Return a game configuration item.
Tictactoe.getConfig = function(configName) {
  return config[configName];
};

// Game.prototype.connection(err, socket, session)
// After the player loads the tictactoe landing page page, the client-side
// JavaScript makes a socket.io connection to the game lobby with a socket.io
// namespace of this matchID.
Tictactoe.prototype.connection = function(err, socket, session) {
  console.log('Tictactoe: Connection from %s.', session.username);

  if (err) {
    // TODO: What kind of errors could occur here?
    throw err;
  }

  var player = this.players[session.username];
  if (player === undefined) {
    console.log('tictactoe game: Error: Socket connection without player loading game page.');
    return;
  }

  player.socket = socket;

  // Set up socket event handlers on this connected socket.
  for (var event in this.socketEventHandlers) {
    if (this.socketEventHandlers[event].hasOwnProperty(event)) {
      var eventHandler = this.socketEventHandlers[event];
      socket.on(event, eventHandler);
      console.log('tictactoe game: Bound event %s for user %s.', event, player.username);
    }
  }

  // If the game has 2 players we can start.
  // TODO: Surely this won't work because we'll have 2 players as soon as the
  // page is loaded (see addPlayer call)?
  if (Object.keys(this.players).length === 2) {
    this.start();
  }

};

// Return the URL routes required by this game.
Tictactoe.prototype.getRoutes = function() {
  return this.routes;
};

// --------------------------------------------------
// Socket helper methods.

// Emit an event to all players.
Tictactoe.prototype.emitAll = function (event, data) {
  for (var username in this.players) {
    this.players[username].socket.emit(event, data);
  }
};

// --------------------------------------------------
// Socket event handlers.
Tictactoe.prototype.select = function (socket, session, data) {
  var winResult;
  console.log('%s selected %s.', session.username, data.id);

  if (session.username !== this.nextPlayer) {
    return socket.emit('error', {msg: 'It is not your turn.'});
  }

  if (this.board[data.id] !== null) {
    console.log('%s tried to cheat by making an invalid move!', session.username);
    return socket.emit('error', {msg: 'Not a valid move.'});
  }

  this.board[data.id] = session.username;

  this.emitAll('select', {player: session.username, id: data.id});

  winResult = this.checkWin(session.username);
  if (winResult.win === true) {
    return this.emitAll('victory', {player: session.username, type: winResult.type, val: winResult.val});
  }

  if (this.isStalemate() === true) {
    return this.emitAll('end', {msg: 'The game ended in stalemate.'});
  }

  // Pass the move to the next player.
  var nextPlayerIdx = (this.playerUsernames.indexOf(session.username) + 1) % 2;
  this.nextPlayer = this.playerUsernames[nextPlayerIdx];

  this.emitAll('nextRound', {
    nextPlayer: this.nextPlayer
  });
};

// --------------------------------------------------
// Game play methods.
Tictactoe.prototype.addPlayer = function(username) {
  this.players[username] = {
    username: username,
    socket:   null
  };
};

// Start the game.
Tictactoe.prototype.start = function () {
  console.log('Tictactoe start');

  // Send each player their own username.
  for (var username in this.players) {
    this.players[username].socket.emit('playerInfo', {username: username});
  }

  this.emitAll('start', {});

  // Tell the players who's turn it is next.
  this.playerUsernames = Object.keys(this.players);
  this.nextPlayer = this.playerUsernames[Math.floor(Math.random() * 2)];
  console.log('It is %s\'s turn.', this.nextPlayer);

  this.emitAll('nextRound', {
    nextPlayer: this.nextPlayer
  });
};


// Check for a win. Returns either:
//   { win: false }
// or something like:
//   { win: true, type: 'row', val: 0 }
// Where type can be 'row', 'col', or 'diag' and val is 0 to 2 inclusive.
//
Tictactoe.prototype.checkWin = function(username) {
  var b = this.board,
    u = username;

  if (b.topLeft === u && b.topMiddle === u && b.topRight === u) {
    return {win: true, type: 'row', val: 0};
  }

  if (b.centerLeft === u && b.centerMiddle === u && b.centerRight === u) {
    return {win: true, type: 'row', val: 1};
  }

  if (b.bottomLeft === u && b.bottomMiddle === u && b.bottomRight === u) {
    return {win: true, type: 'row', val: 2};
  }

  if (b.topLeft === u && b.centerLeft === u && b.bottomLeft === u) {
    return {win: true, type: 'col', val: 0};
  }

  if (b.topMiddle === u && b.centerMiddle === u && b.bottomMiddle === u) {
    return {win: true, type: 'col', val: 1};
  }

  if (b.topMiddle === u && b.bottomMiddle === u && b.bottomMiddle === u) {
    return {win: true, type: 'col', val: 2};
  }

  if (b.topLeft === u && b.centerMiddle === u && b.bottomRight === u) {
    return {win: true, type: 'diag', val: 0};
  }

  if (b.bottomLeft === u && b.centerMiddle === u && b.topRight === u) {
    return {win: true, type: 'diag', val: 1};
  }


  return {win: false};
};

// Check for stalemate (all board filled).
Tictactoe.prototype.isStalemate = function() {
  var isStalemate = true,
    id;

  for (id in this.board) {
    if (this.board[id] === null) {
      isStalemate = false;
      break;
    }
  }

  if (isStalemate) {
    return true;
  }
};

module.exports = Tictactoe;
