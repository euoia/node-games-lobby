var io = require('socket.io-client'),
  unirest = require('unirest'),
  _ = require('underscore'),
  util = require('util');

function Player(options) {
  this.serverAddress = options.serverAddress;
  this.username = options.username;

  // One of: CONNECTING, IN_LOBBY, WAITING, IN_GAME
  this.state = 'CONNECTING';

  this.actionFunctions = {
    'IN_LOBBY': [
      this.saySomething.bind(this),
      this.createMatch.bind(this)
    ],
    'WAITING': [
      this.saySomething.bind(this)
    ]
  };

  this.roomName = 'gorilla chat';
  this.login(function (err) {
    if (err) {
      console.log("[%s] Error occurred trying to login:", this.username, err);
      return;
    }

    this.connectSocket(function(err) {
      if (err) {
        throw new Error(err);
      }

      this.subscribe(function(err) {
        if (err) {
          throw new Error(err);
        }

        this.doAction();
      }.bind(this));
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

Player.prototype.connectSocket = function(cb) {
  console.log("[%s] Connecting the socket using cookie %s", this.username, this.sessionCookie);
  this.socket = io.connect(this.serverAddress, {
    'reconnection delay': 0,
    'reopen delay': 0,
    'force new connection': true,
    'headers': {'Cookie': util.format('connect.sid=%s', this.sessionCookie)}
  });

  this.socket.once('connect', function() {
    console.log("[%s] Socket connected", this.username);
    cb();
  }.bind(this));
};

Player.prototype.subscribe = function(cb) {
  this.socket.emit('subscribe', {roomName: this.roomName});
  this.socket.once('notification', function(eventData) {
    console.log("[%s] Subscribed: %s", this.username, eventData.message);
    this.state = 'IN_LOBBY';
    cb();
  }.bind(this));
};

// Do one of the available actions.
Player.prototype.doAction = function() {
  var possibleActions = this.actionFunctions[this.state];
  if (possibleActions === undefined) {
    console.log("[%s] No possible actions in state=%s", this.username, this.state);
    return;
  }

  var actionFunction = _.sample(possibleActions);
  actionFunction();

  // Do another action a delay.
  setTimeout(this.doAction.bind(this), _.random(5000, 10000));
};

Player.prototype.saySomething = function() {
  var message = 'hello everybody';
  console.log("[%s] Saying: %s", this.username, message);

  this.socket.emit('message', {
    roomName: this.roomName,
    message: message
  });
};

Player.prototype.createMatch = function() {
  this.socket.emit('createMatch', {
    roomName: this.roomName,
    gameID: 'tictactoe'
  });

  console.log("[%s] createMatch", this.username);
  this.state = 'WAITING';
};

module.exports = Player;
