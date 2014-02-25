node-games-lobby
=================
A matchmaking server and lobby for finding and playing multiplayer online games
in a web browser using simple HTML and javascript.

The games must be written in nodejs (or at least have a nodejs adapter) and
conform to a simple API.

Features
----
* Chat across games with private messages, announcements, lobbies, public rooms.
* Games must conform only to a simple documented API.
* Example games (tictactoe, gorillas) provided.

To use this
----
* Clone this repository.
* Run `npm install`
* Run `npm test` requires [mocha](http://visionmedia.github.io/mocha/) installed globally.
* Look at the example tictactoe and gorillas games.
* Write your game to conform to the documented game API.
* Run this program on a web server somewhere.
* Get people into the lobby and playing games.

Why would this be useful to you?
----
* You have some games you would like people to play.
* You want to write games but you don't want to deal with the lobby, matchmaking and chat elements.
* You are happy for those games to conform to a simple API for the sake of the
  aforementioned conveniences.

To be completed
----
* Accounts module.
* Database storage.
* More game examples.
* Wiki documentation, which explains which bits to modify.

In the future maybe
----
* Better naming conventions for the ecosystem, node-games-lobby and
  node-command-center are indistinct.
* Handle games with more than 2 players.
* Player and game sharing with other lobbies.
* Better account management features.
* A webservice API for games and account handling.
* Command center client could ask server for command list.

License
----
MIT.
