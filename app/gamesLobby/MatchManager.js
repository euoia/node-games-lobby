// Stores the matches.
var
  _ = require ('underscore'),
  ResultService = require('./ResultService.js');

function MatchManager (resultListener) {
  // When instantiating a match, the game instance should pass its results to
  // the resultListener provided.
  this.resultListener = resultListener;

  //------------------------------------------------------
  // matches:
  this.matches = {};
  // Matches that are either WAITING or PLAYING.
  //    object key: matchID.
  //    object val: match object (see below).

  // match object:
  //  id                 - UUID identifying the match.
  //  owner              - player who started the match.
  //  gameID             - gameID of the game.
  //  creationDate       - Date the match was created.
  //  playerUsernames    - Usernames of players in the match.
  //  minPlayers         - Number of players required for the match to begin.
  //  state              - one of:
  //    WAITING - waiting for enough players to join.
  //    PLAYING - currently playing.
  //------------------------------------------------------
}

MatchManager.prototype.createMatch = function(
  matchID,
  gameID,
  Game,
  owner
) {
  var match = {
    id:                matchID,
    gameID:            gameID,
    owner:             owner,
    Game:              Game,
    gameInstance:      null,
    state:             'WAITING',
    creationDate:      Date.now(),
    playerUsernames:   [ owner ],
    minPlayers:        Game.getConfig('minPlayers')
  };

  this.matches[matchID] = match;

  // Return the match in case we'd like to modify it directly.
  return match;
};

MatchManager.prototype.addPlayerToMatch = function(username, match) {
  match.playerUsernames.push(username);

  if (match.playerUsernames.length === match.minPlayers) {
    this.startPlayingMatch(match);
  }
};

MatchManager.prototype.getMatchesByOwner = function(username) {
  return _.filter(this.matches, function(match) {
    return match.owner === username;
  });
};

MatchManager.prototype.startPlayingMatch = function(match) {
  match.state = 'PLAYING';

  // Instantiate a ResultService for the game instance to use.
  var resultService   = new ResultService(match.id, this.resultListener);

  // Instantiate the game.
  var Game            = match.Game;
  var gameInstance    = new Game(resultService, match.playerUsernames);
  match.gameInstance = gameInstance;
};


MatchManager.prototype.getMatch = function(matchID) {
  return this.matches[matchID];
};

MatchManager.prototype.deleteMatch = function(matchID) {
  delete this.matches[matchID];
};

MatchManager.prototype.deleteMatchesOwnedByPlayer = function(username) {
  _.each(this.matches, function(match, matchID) {
    if (match.owner === username) {
      delete this.matches[matchID];
    }
  }.bind(this));
};

// Return WAITING matches in order of their creation date.
// gameID is optional.
MatchManager.prototype.getWaitingMatches = function(gameID) {
  var whereClause = {state: 'WAITING'};
  if (gameID !== undefined) {
    whereClause.gameID = gameID;
  }

  var waitingMatches = _.chain(this.matches)
  .where(whereClause)
  .sortBy('creationDate')
  .value();

  if (waitingMatches === null) {
    waitingMatches = [];
  }

  return waitingMatches;
};

// Return the oldest WAITING match ID.
// gameID is optional.
MatchManager.prototype.getFirstWaitingMatch = function(gameID) {
  var whereClause = {state: 'WAITING'};
  //if (gameID !== undefined) {
  //  whereClause.gameID = gameID;
  //}

  var matches = _.chain(this.matches)
    .where(whereClause)
    .sortBy('creationDate')
    .value();

  return matches[0];
};

module.exports = MatchManager;
