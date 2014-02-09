// The result service that is passed to the game instances.
//
// This is how the game instances tell the GamesLobby the outcome of the match.
function ResultService(matchID, resultListener) {
  this.matchID = matchID;
  this.resultListener = resultListener;
  this.winner = null;
  this.loser = null;
}

ResultService.prototype.setWinner = function(winner) {
  this.winner = winner;
};

ResultService.prototype.setLoser = function(loser) {
  this.loser = loser;
};

ResultService.prototype.publishResult = function() {
  this.resultListener.emit('result', {
    matchID: this.matchID,
    winner: this.winner,
    loser: this.loser});
};

module.exports = ResultService;
