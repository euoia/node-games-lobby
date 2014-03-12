var Player = require('./Player.js'),
  http = require('http'),
  util = require('util');

function Simulator () {
  this.maxPlayers = 50;
  this.addPlayerDelay = 5000;
  this.statusInterval = 10000;
  this.serverAddress = 'http://localhost:3000';
  this.numPlayers = 0;
  this.activePlayers = 0;

  // Player types. Loop through these so we have a good mix.
  this.archetypes = [
    'JOINER',
    'CREATOR'
  ];

  // Keep track of the players.
  this.players = [];

  // Create a server for the purpose of showing the statuses.
  this.server = http.createServer(function (req, res) {
    res.end(this.playerStatuses());
  }.bind(this)).listen('9000');

  this.addPlayer();
}

Simulator.prototype.addPlayer = function() {
  if (this.numPlayers >= this.maxPlayers) {
    console.log("[Simulator] Reached max player limit of %d", this.maxPlayers);
    setInterval(this.logStatus.bind(this), this.statusInterval);
    return;
  }

  console.log("[Simulator] addPlayer", this.numPlayers);
  this.logStatus();

  var p = new Player({
    serverAddress: this.serverAddress,
    username: 'simulated' + String(this.numPlayers),
    archetype: this.archetypes[this.numPlayers % this.archetypes.length],
    manager: this
  });

  this.players.push(p);
  this.numPlayers += 1;
  this.activePlayers += 1;

  setTimeout(this.addPlayer.bind(this), this.addPlayerDelay);
};

// Called from the player when it disconnects.
Simulator.prototype.playerFinished = function() {
  console.log("[Simulator] playerFinished");
  this.activePlayers -= 1;
  this.logStatus();
};

Simulator.prototype.logStatus = function() {
  console.log("[Simulator] %d total players created, %d active",
    this.numPlayers,
    this.activePlayers);
};

// Return the statuses of each player.
Simulator.prototype.playerStatuses = function() {
  var response = '';
  for (var i = 0, l = this.players.length; i < l; i += 1) {
    response += util.format("%s (%s): %s\n",
      this.players[i].username,
      this.players[i].archetype,
      this.players[i].state);
  }

  return response;
};

new Simulator();

