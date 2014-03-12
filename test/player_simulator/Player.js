var io = require('socket.io-client'),
  unirest = require('unirest'),
  _ = require('underscore'),
  util = require('util');

function Player(options) {
  this.serverAddress = options.serverAddress;
  this.username = options.username;
  this.manager = options.manager;
  this.archetype = options.archetype;

  // One of: CONNECTING, IN_LOBBY, WAITING, IN_GAME, FINISHED
  this.state = 'CONNECTING';

  this.actionTimeoutMin = 1000;
  this.actionTimeoutMax = 2000;

  // Having joined a match, record the URL.
  this.matchUrl = null;

  // Sockets. We need separate ones because socket.io glitches out if you
  // connect rather than reconnect.
  this.lobbySocket = null;
  this.matchSocket = null;

  this.actionFunctions = {
    'NOT_CONNECTED': [
      this.connectLobby.bind(this)
    ],
    'IN_GAME': [
      this.playRandomMove.bind(this)
    ],
    'IN_LOBBY': [
      this.saySomething.bind(this),
      this.disconnect.bind(this)
      //this.finish.bind(this)
    ],
    'WAITING': [
      this.saySomething.bind(this)
    ]
  };

  if (this.archetype === 'JOINER') {
    this.actionFunctions.IN_LOBBY.push(this.joinGame.bind(this));
  }

  if (this.archetype === 'CREATOR') {
    this.actionFunctions.IN_LOBBY.push(this.createMatch.bind(this));
  }

  this.roomName = 'gorilla chat';
  this.login(function (err) {
    if (err) {
      console.log("[%s] Error occurred trying to login:", this.username, err);
      return;
    }

    this.connectLobby(function(err) {
      if (err) {
        console.log("[%s] Error occurred trying to connect to lobby: %s:",
          this.username,
          err);
        return;
      }

      this.doAction();
    }.bind(this));
  }.bind(this));
}

Player.prototype.login = function(cb) {
  unirest.post(util.format('%s/session/login', this.serverAddress))
    .send({username: this.username})
    .end(function(res) {
      if (res.error) {
        return cb(res.error);
      }

      if (res.body.result !== 'ok') {
        return cb(util.format('Failed to login, result=%s message=%s', res.body.result, res.body.message));
      }

      this.sessionCookie = res.cookie('connect.sid');
      return cb();
  }.bind(this));
};

Player.prototype.connectLobby = function(cb) {
  console.log("[%s] Connecting the socket using cookie %s", this.username, this.sessionCookie);

  this.lobbySocket = io.connect(this.serverAddress, {
    'reconnection delay': 0,
    'reopen delay': 0,
    'force new connection': true,
    'headers': {'Cookie': util.format('connect.sid=%s', this.sessionCookie)}
  });

  this.lobbySocket.once('connect', function() {
    console.log("[%s] Socket connected to lobby", this.username);

    // Subscribe to the default room.
    this.subscribe(function(err) {
      if (err) {
        throw new Error(err);
      }

      this.state = 'IN_LOBBY';

      if (cb) {
        cb();
      }
    }.bind(this));
  }.bind(this));

  this.lobbySocket.once('launchMatch', this.launchMatch.bind(this));
};

Player.prototype.subscribe = function(cb) {
  this.lobbySocket.emit('subscribe', {roomName: this.roomName});
  this.lobbySocket.once('notification', function(eventData) {
    console.log("[%s] Subscribed: %s", this.username, eventData.message);
    this.state = 'IN_LOBBY';
    cb();
  }.bind(this));
};

// Do one of the available actions.
Player.prototype.doAction = function() {
  if (this.state === 'FINISHED') {
    return;
  }

  // Do another action after delay.
  setTimeout(this.doAction.bind(this),
    _.random(
      this.actionTimeoutMin,
      this.actionTimeoutMax));

  var possibleActions = this.actionFunctions[this.state];
  if (possibleActions === undefined) {
    console.log("[%s] No possible actions in state=%s", this.username, this.state);
    return;
  }

  var actionFunction = _.sample(possibleActions);
  actionFunction();

};

Player.prototype.saySomething = function() {
  var message = 'hello everybody';
  console.log("[%s] Saying: %s", this.username, message);

  this.lobbySocket.emit('message', {
    roomName: this.roomName,
    message: message
  });
};

Player.prototype.createMatch = function() {
  this.lobbySocket.emit('createMatch', {
    roomName: this.roomName,
    gameID: 'tictactoe'
  });

  console.log("[%s] createMatch", this.username);
  this.state = 'WAITING';
};

Player.prototype.joinGame = function() {
  this.lobbySocket.emit('joinGame', {
    roomName: this.roomName,
    gameID: 'tictactoe'
  });

  // Change state so we don't disconnect before the game starts!
  this.state = 'JOINING';

  this.lobbySocket.once('notification', function(eventData) {
    // Join failed - probably no games.
    // TODO: Redesign messages to make this not require string checking.
    if (eventData.message.match('^You joined') === null) {
      this.state = 'IN_LOBBY';
    }
  }.bind(this));

  console.log("[%s] joinGame", this.username);
};

Player.prototype.disconnect = function() {
  console.log("[%s] disconnect", this.username);

  this.lobbySocket.disconnect();
  this.state = 'NOT_CONNECTED';
};

Player.prototype.finish = function() {
  console.log("[%s] disconnect", this.username);
  this.lobbySocket.disconnect();
  this.state = 'FINISHED';
  this.manager.playerFinished();
};

Player.prototype.launchMatch = function(eventData) {
  console.log("[%s] launchMatch", this.username, eventData);
  this.state = 'JOINING';
  this.matchUrl = eventData.url;

  // Disconnect from the lobby.
  this.lobbySocket.disconnect();

  // Connect to the match.
  var matchAddress = util.format('%s/%s',
    this.serverAddress,
    eventData.matchID);

  console.log("[%s] launchMatch [matchAddress=%s]", this.username, matchAddress);

  this.matchSocket = io.connect(matchAddress, {
    'reconnection delay': 0,
    'reopen delay': 0,
    'force new connection': true,
    'headers': {'Cookie': util.format('connect.sid=%s', this.sessionCookie)}
  });

  this.matchSocket.once('connect', function() {
    console.log("[%s] Socket connected to match [%s]", this.username, eventData.url);
    this.matchSocket.once('start', function() {
      console.log('[%s] Match started', this.username);
      this.state = 'IN_GAME';
    }.bind(this));

    this.matchSocket.once('end', function(eventData) {
      this.matchSocket.socket.disconnect();
      this.state = 'NOT_CONNECTED';

      console.log('[%s] connectLobby this.matchSocket.socket.connected=%s',
                  this.username,
                  this.matchSocket.socket.connected);

      console.log('[%s] <= result [winner=%s]', this.username, eventData.winner);
      console.log('[%s] Disconnected socket.', this.username);
    }.bind(this));
  }.bind(this));
};

// tictactoe-specific behaviour.
// TODO: Move to its own class.
Player.prototype.playRandomMove = function() {
  if (this.moveIdx === undefined) {
    this.moveIdx = _.random(0, 9);
  }

  var moves = [
    'topLeft',
    'topMiddle',
    'topRight',
    'centerLeft',
    'centerMiddle',
    'centerRight',
    'bottomLeft',
    'bottomMiddle',
    'bottomRight'];


  this.matchSocket.emit('select', {
    id: moves[this.moveIdx++ % 9]
  });
};

module.exports = Player;
