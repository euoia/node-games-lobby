// Stores results (wins and losses) for usernames.
function ResultStore() {
  // Map from username to number of wins.
  this.wins = {};

  // Map from username to number of losses.
  this.losses = {};
}

ResultStore.prototype.addWin = function(username) {
  if (this.wins[username] === undefined) {
    this.wins[username] = 0;
  }

  this.wins[username] += 1;
};

ResultStore.prototype.addLoss = function(username) {
  if (this.losses[username] === undefined) {
    this.losses[username] = 0;
  }

  this.losses[username] += 1;
};

ResultStore.prototype.getWins = function(username) {
  if (this.wins[username] === undefined) {
    return 0;
  }

  return this.wins[username];
};

ResultStore.prototype.getLosses = function(username) {
  if (this.wins[username] === undefined) {
    return 0;
  }

  return this.wins[username];
};

module.exports = ResultStore;
