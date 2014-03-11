var Player = require('./Player.js');

function Simulator () {
  this.maxPlayers = 50;
  this.addPlayerDelay = 5000;
  this.serverAddress = 'http://localhost:3000';
  this.numPlayers = 0;
  this.activePlayers = 0;

  this.addPlayer();
}

Simulator.prototype.addPlayer = function() {
  if (this.numPlayers >= this.maxPlayers) {
    console.log("[Simulator] Reached max player limit of %d", this.maxPlayers);
    return;
  }

  console.log("[Simulator] addPlayer", this.numPlayers);
  this.logStatus();

  new Player({
    serverAddress: this.serverAddress,
    username: 'simulated' + String(this.numPlayers),
    manager: this
  });

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

new Simulator();

