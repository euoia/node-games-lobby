// Created:            Thu 31 Oct 2013 12:06:16 PM GMT
// Last Modified:      Wed 12 Mar 2014 11:52:36 AM EDT
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

function Tictactoe (resultService, usernames) {
  // The result listener to which we publish the result of the match.
  this.resultService = resultService;

  // Array containing the usernames that are part of this match.
  this.usernames = usernames;

  // Either OK or FINISHED.
  this.gameState = 'OK';

  // Player array.
  // Value is player object.
  // Player object has the keys: username, socket.
  // TODO: May be simpler to store players in an object.
  this.players = [];

  // Which player has the first turn this round?
  // 0 => Player 0, 1 => Player 1.
  this.startingPlayer = null;

  // How many turns have passed?
  this.turnNumber = null;

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
  // TODO: This could be cleaner.
  this.socketEventHandlers = {
    'disconnect': this.disconnect,
    'select': this.select
  };
}

Tictactoe.prototype.getPlayerByUsername = function(username) {
  for (var i = 0; i < this.players.length; i += 1) {
    var player = this.players[i];
    if (player.username === username) {
      return player;
    }
  }
  return null;
};

// --------------------------------------------------
// Methods required by the GamesLobby API.

// Game.getConfig(configName)
// Return a game configuration item.
Tictactoe.getConfig = function(configName) {
  return config[configName];
};

// Game.prototype.connection(err, socket, session)
// After the player loads the <launchVerb> page, the client-side JavaScript
// makes a socket.io connection to the game lobby with a socket.io namespace of
// this matchID.
//
// TODO: A lot of this function is boilerplate and could be refactored.
Tictactoe.prototype.connection = function(err, socket, session) {
  if (session === undefined) {
    console.log("[Tictactoe] <= connection [%s] Error: %s",
      socket.handshake.address.address,
      'session was undefined');
    return;
  }

  if (err) {
    console.log('[Tictactoe] <= connection [%s] [%s] Error: %s',
      session.username,
      socket.handshake.address.address,
      err.message);
    return;
  }

  // Add the player. The socket will connect once the page has loaded.
  if (this.getPlayerByUsername(session.username) === null) {
    this.players.push({
      username: session.username,
      socket: socket,
      playerIdx: this.players.length
    });
  } else {
    // TODO: Resume the game.
  }

  // Set up socket event handlers for this player.
  // TODO: The interface here could be better.
  for (var event in this.socketEventHandlers) {
    if (this.socketEventHandlers.hasOwnProperty(event)) {
      var eventHandler = this.socketEventHandlers[event];
      socket.on(event, eventHandler.bind(this, socket, session));
      console.log('[Tictactoe] <= connection [%s]: bind [%s]',
        session.username,
        event);
    }
  }

  if (this.players.length === 2) {
    console.log("[Tictactoe] <= connection [%s]: Both players are now connected",
      session.username);
    this.start();
  }
};

// Return the URL routes required by this game.
Tictactoe.prototype.getRoutes = function() {
  return {'play': this.play};
};

// --------------------------------------------------
// Express routes.

// Express request route that loads the game page.
// TODO: Possibly rename to index.
Tictactoe.prototype.play = function (req, res) {
  if (req.session.username === undefined) {
    // TODO: This should probably be handled at a different layer.
    return res.send(403, 'You must login before you can view games.');
  }

  // Render the game page.
  console.log('[Tictactoe] play [%s]: rendering view', req.session.username);
  return res.render('games/tictactoe/index', { title: 'Tictactoe' });
};

// --------------------------------------------------
// Socket event handlers.

// Player has disconnected from the game.
Tictactoe.prototype.disconnect = function(socket, session) {
  if (session.username) {
    console.log("[Tictactoe] <= disconnect [%s]", session.username);
  }

  if (this.gameState === 'FINISHED') {
    return;
  }

  // Find the winner.
  var winnerIdx = (this.usernames.indexOf(session.username) + 1) % 2;
  var winnerUsername = this.usernames[winnerIdx];

  // Disconnection results in forfeiting the game.
  this.resultService.publishResult({
    winner: winnerUsername,
    loser: session.username
  });

  console.log("[Tictactoe] <= disconnect [%s]: Assigning win [%s]",
    session.username,
    winnerUsername);
};

Tictactoe.prototype.select = function (socket, session, eventData) {
  var winResult;
  console.log('[Tictactoe] <= select [%s] [%s]', session.username, eventData.id);

  if (session.username !== this.currentPlayer()) {
    console.log('[Tictactoe] <= select [%s] fail: Not your move', session.username);
    return socket.emit('error', {msg: 'It is not your turn.'});
  }

  if (this.board[eventData.id] !== null) {
    console.log('[Tictactoe] <= select [%s] fail: Invalid move [%s]',
      session.username,
      eventData.id);
    return socket.emit('error', {msg: 'Not a valid move.'});
  }

  this.board[eventData.id] = session.username;

  this.emitAll('select', {player: session.username, id: eventData.id});

  winResult = this.checkWin(session.username);
  if (winResult.win === true) {
    console.log("[Tictactoe] <= select [%s]: win", session.username);

    this.resultService.publishResult({
      winner: this.currentPlayer(),
      loser: this.otherPlayer()
    });

    this.emitAll('end', {
      winner: session.username
    });

    this.gameState = 'FINISHED';
    return;
  }

  if (this.isStalemate() === true) {
    console.log("[Tictactoe] <= select [%s]: stalemate", session.username);

    this.resultService.publishResult({
      drawers: this.usernames
    });

    this.emitAll('end', {});

    this.gameState = 'FINISHED';
    return;
  }

  // Pass the move to the next player.
  this.nextTurn();
  this.emitAll('nextRound', {
    nextPlayer: this.currentPlayer()
  });
};

// --------------------------------------------------
// Socket helper methods.

// Emit an event to all players.
Tictactoe.prototype.emitAll = function (event, data) {
  for (var i = 0, l = this.players.length; i < l; i += 1) {
    this.players[i].socket.emit(event, data);
  }
};

// --------------------------------------------------
// Game play methods.

// Start the game.
Tictactoe.prototype.start = function () {
  // Send each player their own username.
  for (var i = 0, l = this.players.length; i < l; i += 1) {
    this.players[i].socket.emit('playerInfo',
      {username: this.players[i].username}
    );
  }

  this.emitAll('start');
  this.nextTurn();

  this.emitAll('nextRound', {
    nextPlayer: this.currentPlayer()
  });
};

Tictactoe.prototype.nextTurn = function() {
  if (this.turnNumber === null) {
    this.turnNumber = 1;
  }

  this.turnNumber += 1;
};

Tictactoe.prototype.currentPlayer = function() {
  return this.players[(this.turnNumber + this.startingPlayer) % 2].username;
};

Tictactoe.prototype.otherPlayer = function() {
  return this.players[(this.turnNumber + this.startingPlayer + 1) % 2].username;
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

  // Top row.
  if (b.topLeft === u && b.topMiddle === u && b.topRight === u) {
    return {win: true, type: 'row', val: 0};
  }

  // Center row.
  if (b.centerLeft === u && b.centerMiddle === u && b.centerRight === u) {
    return {win: true, type: 'row', val: 1};
  }

  // Bottom row.
  if (b.bottomLeft === u && b.bottomMiddle === u && b.bottomRight === u) {
    return {win: true, type: 'row', val: 2};
  }

  // Left col.
  if (b.topLeft === u && b.centerLeft === u && b.bottomLeft === u) {
    return {win: true, type: 'col', val: 0};
  }

  // Middle col.
  if (b.topMiddle === u && b.centerMiddle === u && b.bottomMiddle === u) {
    return {win: true, type: 'col', val: 1};
  }

  // Right col.
  if (b.topRight === u && b.centerRight === u && b.bottomRight === u) {
    return {win: true, type: 'col', val: 2};
  }

  // Diag 1.
  if (b.topLeft === u && b.centerMiddle === u && b.bottomRight === u) {
    return {win: true, type: 'diag', val: 0};
  }

  // Diag 2.
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
