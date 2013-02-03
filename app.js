/**
 * Module dependencies.
 */

var express = require('express'),
  routes = require('./routes'),
  login = require('./routes/login'),
  http = require('http'),
  path = require('path'),
  lessMiddleware = require('less-middleware'),
  RedisStore = require('connect-redis')(express);

var secret = "put me in a config file";
var app = express();
var cookieParser = express.cookieParser(secret);
var sessionStore = new RedisStore;

app.configure(function() {
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());

  // Sessions won't work unless you have these 3 in this order: cookieParser,
  // session router.
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

  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function() {
  app.use(express.errorHandler());
});

app.get('/', routes.index);

// All routes in login are hooked up.
for (route in login) {
	app.post('/login/' + route, login[route]);
}

var server = http.createServer(app).listen(app.get('port'), function() {
  console.log("Express server listening on port " + app.get('port'));
});

var Chat = require('./chat'),
	chat = null;

chat = new Chat (server, sessionStore, cookieParser);
