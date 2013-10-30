/*  Created:            Tue 29 Oct 2013 09:50:16 PM GMT
 *  Last Modified:      Tue 29 Oct 2013 11:46:03 PM GMT
 *  Author:             James Pickard <james.pickard@gmail.com>
 *
 * The main application.
 *
 * TODO:
 *        * Fix inline TODOS.
 *        * Better module names.
 *        * Good commenting and documentation.
 */

var express = require('express'),                  // This is an express application.
  routes = require('./routes'),                    // TODO: Rename this.
  session = require('./routes/session'),           // Session-related routes.
  http = require('http'),                          // See TODO below.
  path = require('path'),                          // Required for OS-independency (path.join).
  lessMiddleware = require('less-middleware'),     // CSS uses less, which is compiled on-the-fly.
  RedisStore = require('connect-redis')(express),  // Used for express session storage.
  Chat = require('iochat');                        // The chat server (iochat module).

// Session secret.
// TODO: Put this in a build-specific config file that is not committed to the repository.
//       - consider a hash of the box name?
var secret = "put me in a config file";

// Configure which games are available.
// Every game must have a corresponding file in
// game_server/games/game_name/index.js which conforms to the iogame API.
//
// See full documentation at: TODO.
var games = [
  'tictactoe'
];

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

// Assign routes.
// Index - give this a better name. Index should not be called routes.index!
app.get('/', routes.index);

// Every function attached to the required session object is a POST route.
// TODO: Not really a good idea.
for (route in session) {
  app.post('/session/' + route, session[route]);
}

// Start the express server.
// TODO: Is this required?
// TODO: What is the "express" server?
var server = http.createServer(app).listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});

// Create the chat server.
var chat = new Chat (server, sessionStore, cookieParser);

// Create the game server, give it a handle to the chat server.
var GameServer = require('./game_server');
var gameServer = new GameServer(games, app, chat);
