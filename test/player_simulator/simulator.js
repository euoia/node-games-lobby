var Player = require('./Player.js');

var maxPlayers = 50;
var addPlayerDelay = 5000;
var serverAddress = 'http://localhost:3000';
var numPlayers = 0;

function addPlayer() {
  console.log("Adding player %d", numPlayers);
  if (numPlayers >= maxPlayers) {
    return;
  }

  new Player({
    serverAddress: serverAddress,
    username: 'simulated' + String(numPlayers)
  });

  numPlayers += 1;

  setTimeout(addPlayer.bind(this), addPlayerDelay);
}

addPlayer();
