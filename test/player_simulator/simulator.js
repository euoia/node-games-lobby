var Player = require('./Player.js');

var maxPlayers = 100;
var serverAddress = 'http://localhost:3000';

for (var i = 0; i < maxPlayers; i += 1) {
  new Player({
    serverAddress: serverAddress,
    username: 'simulated' + String(i)
  });
}
