// Games and routes are identified by the directory in which they reside.
// For example, the ID of this game is tictactoe - all routes will be prefixed with tictactoe.
//
// Takes an express app.
function Tictactoe (app) {
	this.setupRoutes(app);
}

Tictactoe.prototype.setupRoutes = function(app) {
	app.get ('/tictactoe/test', this.test);
	console.log('Added route /tictactoe/test');
};


Tictactoe.prototype.getConfig = function() {
	// TODO: Do icons later.
	return {
		minPlayers: 2,
		maxPlayers: 2
	}
};

// Routes.
Tictactoe.prototype.test = function(req, res) {
	console.log("test");
	res.end('hello world');
};

module.exports = Tictactoe;
