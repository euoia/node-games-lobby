// Created:            Thu 31 Oct 2013 12:25:48 AM GMT
// Last Modified:      Tue 11 Mar 2014 04:01:20 PM EDT
// Author:             James Pickard <james.pickard@gmail.com>
// --------------------------------------------------
// Summary
// ----
// This is the client library for the example tictactoe game that comes with
// https://github.com/euoia/node-games-lobby.
// --------------------------------------------------
requirejs.config({
  shim: {
    'jquery': {
      exports: '$'
    },
    'underscore': {
      exports: '_'
    }
  },
  paths: {
    'jquery': '../../jquery',
    'underscore': '../../underscore',
    'socket.io': '../../socket.io'
  }
});

define(['jquery', 'underscore', 'socket.io'], function($, _, io) {
  function Tictactoe () {
    var pathElements = location.pathname.match(/\/tictactoe\/(.*)\/(.*)/);
    this.matchID = pathElements[1];

    // Connect to the game lobby, with the matchID as the socket.io namespace.
    // TODO: Try to find some documentation stating that this is how namespaces
    // are dealt with.
    this.socket = io.connect('http://localhost/' + this.matchID);

    this.socket.on('connect', this.connect.bind(this));
    this.socket.on('playerInfo', this.playerInfo.bind(this));
    this.socket.on('start', this.start.bind(this));
    this.socket.on('nextRound', this.nextRound.bind(this));
    this.socket.on('select', this.select.bind(this));
    this.socket.on('end', this.end.bind(this));
    this.socket.on('error', this.error.bind(this));

    this.username = null;
    this.myTurn = false;
    console.log('Tictactoe created.');
  }

  // Event handler: Socket is connected.
  Tictactoe.prototype.connect = function() {
    $('#messageArea').html('Connected. Waiting for other player.');
    console.log('Connect.');
  };

  // Event handler: Player information is sent from server.
  Tictactoe.prototype.playerInfo = function(data) {
    console.log('playerInfo');
    this.username = data.username;
  };

  // Event handler: Game starts.
  Tictactoe.prototype.start = function(data) {
    console.log('start');
    $('#messageArea').html('Game starting...');

    $('#topLeft').click(this.localSelect.bind(this, 'topLeft'));
    $('#topMiddle').click(this.localSelect.bind(this, 'topMiddle'));
    $('#topRight').click(this.localSelect.bind(this, 'topRight'));

    $('#centerLeft').click(this.localSelect.bind(this, 'centerLeft'));
    $('#centerMiddle').click(this.localSelect.bind(this, 'centerMiddle'));
    $('#centerRight').click(this.localSelect.bind(this, 'centerRight'));

    $('#bottomLeft').click(this.localSelect.bind(this, 'bottomLeft'));
    $('#bottomMiddle').click(this.localSelect.bind(this, 'bottomMiddle'));
    $('#bottomRight').click(this.localSelect.bind(this, 'bottomRight'));
  };

  // This player makes their choice.
  Tictactoe.prototype.localSelect = function(id) {
    console.log('select id=%s', id);
    $('#' + id).html('<div class="circle">O</div>');
    this.socket.emit('select', {id: id});
  };

  // Event handler: A player makes a selection
  Tictactoe.prototype.select = function(data) {
    if (data.player === this.username) {
      // We already locally display the move.
      return;
    }

    $('#' + data.id).html('<div class="cross">X</div>');
    $('#' + data.id).off('click');
  };

  // Event handler: The next round is ready.
  Tictactoe.prototype.nextRound = function(data) {
    console.log('nextRound. nextPlayer=%s username=%s', data.nextPlayer, this.username);

    $('#errorArea').html('');
    if (data.nextPlayer === this.username) {
      $('#messageArea').html('It is your turn.');
      this.myTurn = true;
    } else {
      $('#messageArea').html('It is the other player\'s turn.');
    }
  };

  // Event handler: The match is over.
  Tictactoe.prototype.end = function(eventData) {
    if (eventData.outcome === 'win') {
      if (eventData.winner === this.username) {
        playerHas = 'You have';
      } else {
        playerHas = eventData.winner + ' has';
      }

      $('#messageArea').html(playerHas + ' won the game!');
    } else {
      $('#messageArea').html('The game ended in stalemate.');
    }

    $('#backToChat').show();
  };

  // Event handler: The game ended some other way.
  Tictactoe.prototype.end = function(data) {
    $('#messageArea').html(data.msg);
    $('#backToChat').show();
  };

  // Event handler: An error is received from the server.
  Tictactoe.prototype.error = function(data) {
    $('#errorArea').html(data.msg);
  };

  return new Tictactoe();
});

