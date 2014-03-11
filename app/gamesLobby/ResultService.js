// The result service that is passed to the game instances.
//
// This is how the game instances tell the GamesLobby the outcome of the match.
function ResultService(matchID, resultListener) {
  this.matchID = matchID;
  this.resultListener = resultListener;
}

// Publish a result to be stored.
// Specify: winners, winner, losers, loser, drawers, drawer.
ResultService.prototype.publishResult = function(result) {
  var winners = result.winners || [result.winner];
  var losers = result.losers || [result.loser];
  var drawers = result.drawers || [result.drawer];

  this.resultListener.emit('result', {
    matchID: this.matchID,
    winners: winners,
    losers:  losers,
    drawers: drawers
  });
};

module.exports = ResultService;
