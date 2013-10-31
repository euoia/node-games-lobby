//  Created:            Tue 29 Oct 2013 09:50:16 PM GMT
//  Last Modified:      Wed 30 Oct 2013 03:40:49 PM GMT
//  Author:             James Pickard <james.pickard@gmail.com>
// --------------------------------------------------
// Summary
// ----
// The node-socket-games express application entry point.
//
// To run this:
// node app.js
// --------------------------------------------------
// TODOs
// ----
// TODO: Fix inline TODOS.
// TODO: Probably rename this node-game-lobby.
// TODO: Good commenting and documentation.
// TODO: Consider adding a config object to hold the games list.
// TODO: Consider adding a routing manager to manage (filter, log) routes set
//       up by modules and games.
// --------------------------------------------------
// Environment variables
// ----
// PORT      - If set, this port will be used. If not, the default port 3000
//             will be used.
// --------------------------------------------------

var
  http = require('http'),                          // Required for initialising express server.
  path = require('path'),                          // Required for OS-independency (path.join).
  express = require('express'),                    // This is an express application.
  lessMiddleware = require('less-middleware'),     // CSS uses less, which is compiled on-the-fly.
  RedisStore = require('connect-redis')(express),  // Used for session storage.
  lobbyRoutes = require('./routes/lobby'),         // Lobby-related routes.
  sessionRoutes = require('./routes/session'),     // Session-related routes.
  CommandCenter = require('command-center');       // The command center (jpickard) module.
  

// --------------------------------------------------
// Application configuration.

// Session secret.
// TODO: Put this in a build-specific config file that is not committed to the repository.
//       - consider a hash of the box name?
var secret = "put me in a config file";

// Configure which games are available.
// All games must conform to the 'Game object documentation', see game_server/index.js.
// TODO: Add a wiki link.
var games = [
  'tictactoe'
];

// --------------------------------------------------
// Express boilerplate.
var app = express();
var cookieParser = express.cookieParser(secret);
var sessionStore = new RedisStore;

// More express application boilerplate...
app.configure(function() {
  // App global: System port number.
  app.set('port', process.env.PORT || 3000);

  // App global: Views directory.
  app.set('views', __dirname + '/views');

  // App global: Which template engine to use?
  // EJS was chosen for its minimal DSL.
  app.set('view engine', 'ejs');

  // App middleware: Not sure what this is. TODO: What is it?
  app.use(express.favicon());

  // App middleware: Not sure what this is. TODO: What is it?
  app.use(express.logger('dev'));

  // App middleware: Not sure what this is. TODO: What is it?
  app.use(express.bodyParser());

  // App middleware: Not sure what this is. TODO: What is it?
  app.use(express.methodOverride());

  // Apparently [citation needed], "Sessions won't work unless you have these 3
  // in this order: cookieParser, session, router".
  // TODO: Get the citation.
  app.use(cookieParser);
  app.use(express.session({
    secret: secret,
    store: sessionStore
  }));

  app.use(app.router);

  app.use(lessMiddleware({
    src: __dirname + '/../public',
    compress: true
  }));

  // App middleware: Intercept requests that match items in the public
  // directory and serve as static contect.
  app.use(express.static(path.join(__dirname, 'public')));
});

// Set development configuration.
// TODO: What exactly does this do?
app.configure('development', function() {
  app.use(express.errorHandler());
});

// --------------------------------------------------
// Assign routes.

// Use the lobby login as the landing page.
app.get('/', lobbyRoutes.login);

// Hook up any POST routes requested by session.js - put them under /session/routeName.
for (var routePath in sessionRoutes.postRoutes) {
  if (sessionRoutes.postRoutes.hasOwnProperty(routePath)) {
    app.post('/session/' + routePath, sessionRoutes.postRoutes[routePath]);
  }
}

// Start the express server.
var server = http.createServer(app).listen(app.get('port'), function() {
  console.log("node-socket-games listening on port " + app.get('port'));
});

// Create the chat server.
// TODO: Rename to commandCenter.
var commandCenter = new CommandCenter (server, sessionStore, cookieParser);

// Create the game server, give it a handle to the express application and command center.
// The handle to the command center is required so that it can add socket.io event listeners.
// The handle to the express application is required in order to bind game-specific routes.
//
// TODO: Rename to gameLobby.
// TODO: Check that app and chat are really required by the lobby.
var GameServer = require('./game_server');
var gameServer = new GameServer(games, app, commandCenter);
