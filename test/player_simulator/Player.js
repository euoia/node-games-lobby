var io = require('socket.io-client'),
  unirest = require('unirest'),
  _ = require('underscore'),
  util = require('util');

function Player(options) {
  this.serverAddress = options.serverAddress;
  this.username = options.username;

  this.actionFunctions = [
    this.saySomething.bind(this)
  ];

  this.roomName = 'gorilla chat';
  this.login(function (err) {
    if (err) {
      console.log("Error occurred trying to login:", err);
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
  console.log("Connecting the socket using cookie %s", this.sessionCookie);
  this.socket = io.connect(this.serverAddress, {
    'reconnection delay': 0,
    'reopen delay': 0,
    'force new connection': true,
    'headers': {'Cookie': util.format('connect.sid=%s', this.sessionCookie)}
  });

  this.socket.once('connect', function() {
    console.log("Socket connected");
    cb();
  });
};

Player.prototype.subscribe = function(cb) {
  this.socket.emit('subscribe', {roomName: this.roomName});
  this.socket.once('notification', function(eventData) {
    console.log("Subscribed: %s", eventData.message);
    cb();
  });
};

// Do one of the available actions.
Player.prototype.doAction = function() {
  var actionFunction = _.sample(this.actionFunctions);
  actionFunction();

  // Do another action a delay.
  setTimeout(this.doAction.bind(this), _.random(3000, 10000));
};

Player.prototype.saySomething = function() {
  var message = 'hello everybody';
  console.log("Saying: %s", message);

  this.socket.emit('message', {
    roomName: this.roomName,
    message: message
  });
};

module.exports = Player;
