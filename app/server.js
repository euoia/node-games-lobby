//  Created:            Tue 29 Oct 2013 09:50:16 PM GMT
//  Last Modified:      Wed 24 Sep 2014 02:25:06 AM UTC EST EST EST EST EST EST EST EST EST EST EST EST EST EST
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
// TODO: It would be prerable if all of a games public assets could reside
//       within a single directory.
// --------------------------------------------------
// Environment variables
// ----
// PORT      - If set, this port will be used. If not, the default port 3000
//             will be used.
// --------------------------------------------------
'use strict';

var
  http = require('http'),                          // Required for initialising express server.
  path = require('path'),                          // Required for OS-independency (path.join).
  express = require('express'),                    // This is an express application.
  lessMiddleware = require('less-middleware'),     // CSS uses less, which is compiled on-the-fly.
  RedisStore = require('connect-redis')(express),  // Used for session storage.
  Socketio = require('socket.io'),
  SessionSocketIO = require('session.socket.io'),
  gamesLobbyRoutes = require('./gamesLobby/gamesLobbyRoutes.js'),
  accountRoutes = require('./account/accountRoutes.js');

// --------------------------------------------------
// Application configuration.

// Session secret.
var sessionSecret = 'this is just the dev secret';
var productionConfig = '../config/production.json';

// Configure which games are available.
// All games must conform to the 'Game object documentation', see game_server/index.js.
// TODO: Add a wiki link.
var games = [
  'tictactoe',
  'gorillas'
];

// --------------------------------------------------
// Express boilerplate.
var app = express();

app.configure('production', function configureProduction(){
  var config = require(productionConfig);
  sessionSecret = config.sessionSecret;
  console.log('Loaded production configuration.');
});

var sessionStore = new RedisStore();
var cookieParser = express.cookieParser(sessionSecret);

// More express application boilerplate...
app.configure(function configure() {
  // App global: System port number.
  app.set('port', process.env.PORT || 3000);

  // App global: Views directory.
  app.set('views', __dirname);

  // App global: Which template engine to use?
  // EJS was chosen for its minimal DSL.
  app.set('view engine', 'ejs');

  app.engine('html', require('ejs').renderFile);

  // App middleware: Not sure what this is. TODO: What is it?
  app.use(express.favicon(__dirname + '/../wwwroot/img/favicon.ico'));

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
    secret: sessionSecret,
    store: sessionStore
  }));

  // https://github.com/emberfeather/less.js-middleware
  app.use(lessMiddleware({
    prefix: '/stylesheets',
    src: __dirname + '/../wwwroot/less',
    dest: __dirname + '/../wwwroot/stylesheets',
    force: true,
    debug: true,
    compress: true
  }));

  // App middleware: Intercept requests that match items in the public
  // directory and serve as static contect.
  app.use(express.static(path.join(__dirname, '../wwwroot')));

  app.use(app.router);
});

// Set development configuration.
// TODO: What exactly does this do?
app.configure('development', function() {
  app.use(express.errorHandler());
});

// Start the express server.
var server = http.createServer(app).listen(app.get('port'), function() {
  console.log('node-socket-games listening on port ' + app.get('port'));
});

// Create the socket.io server.
var socketio = Socketio.listen(server);

// No websockets.
socketio.set('transports', [
  'flashsocket',
  'htmlfile',
  'xhr-polling',
  'jsonp-polling'
]);

// Default logging.
socketio.set('log level', 2);

socketio.configure('production', function(){
  socketio.set('log level', 1);
});

var sessionSocketIO = new SessionSocketIO(socketio, sessionStore, cookieParser);

// Create the game server, give it a handle to the express application and command center.
// The handle to the command center is required so that it can add socket.io event listeners.
// The handle to the express application is required in order to bind game-specific routes.
var GamesLobby = require('./gamesLobby/GamesLobby.js');
var gamesLobby = new GamesLobby(games, app, sessionSocketIO);
gamesLobby.start();

// --------------------------------------------------
// Assign routes.

// Use the lobby login as the landing page.
app.get('/', gamesLobbyRoutes.login);

// Hook up any POST routes requested by account.js - put them under /session/routeName.
// TODO: Fix the names.
for (var routePath in accountRoutes.postRoutes) {
  if (accountRoutes.postRoutes.hasOwnProperty(routePath)) {
    app.post('/session/' + routePath, accountRoutes.postRoutes[routePath]);
  }
}

// Hook up any GET routes requested by account.js - put them under /session/routeName.
// TODO: Fix the names.
for (var routePath in accountRoutes.getRoutes) {
  if (accountRoutes.getRoutes.hasOwnProperty(routePath)) {
    app.get('/session/' + routePath, accountRoutes.getRoutes[routePath]);
  }
}
