// TODO: The number of instances of emitting a simply message indicates that we
// could possibly do with a chat.addSimpleCommand function.
//
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
  // Pass in a instance of Chat (to be renamed Console - or something).
  function Tictactoe (chat) {
    this.gameUuid = location.pathname.match(/\/tictactoe\/(.*)/)[1];

    this.socket = io.connect('http://localhost/' + this.gameUuid);
    this.socket.on('connect', this.connect.bind(this));
    this.socket.on('playerInfo', this.playerInfo.bind(this));
    this.socket.on('start', this.start.bind(this));
    this.socket.on('nextRound', this.nextRound.bind(this));
    this.socket.on('select', this.select.bind(this));
    this.socket.on('victory', this.victory.bind(this));
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

  // Event handler: The game has been won.
  Tictactoe.prototype.victory = function(data) {
    var playerHas;
    if (data.player === this.username) {
      playerHas = 'You have';
    } else {
      playerHas = data.player + ' has';
    }

    $('#messageArea').html(playerHas + ' won the game!');
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

