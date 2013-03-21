// Games and routes are identified by the directory in which they reside.
// For example, the ID of this game is tictactoe - all routes will be prefixed with tictactoe.
//
function Tictactoe () {
}


// Static functions and config.
Tictactoe.getRoutes = function(app) {
};

Tictactoe.getConfig = function(configName) {
	return Tictactoe.config[configName];
};

Tictactoe.config = {
	minPlayers: 2,
	maxPlayers: 2
};


module.exports = Tictactoe;
