// Stores results (wins and losses) for usernames.
//
// TODO: Support full match history.
// TODO: Some games may not support draws. Each game ought to be able to
//       specify a custom ResultFormatter to respond to the /result and
//       /history commands.
function ResultStore() {
  // Map from username to number of wins.
  this.wins = {};

  // Map from username to number of losses.
  this.losses = {};

  // Map from username to number of draws.
  this.draws = {};
}

ResultStore.prototype.addWinners = function(usernames) {
  for (var i = 0, l = usernames.length; i < l; i += 1) {
    var username = usernames[i];
    if (this.wins[username] === undefined) {
      this.wins[username] = 0;
    }

    this.wins[username] += 1;
  }
};

ResultStore.prototype.addLosers = function(usernames) {
  for (var i = 0, l = usernames.length; i < l; i += 1) {
    var username = usernames[i];
    if (this.losses[username] === undefined) {
      this.losses[username] = 0;
    }

    this.losses[username] += 1;
  }
};

ResultStore.prototype.addDrawers = function(usernames) {
  for (var i = 0, l = usernames.length; i < l; i += 1) {
    var username = usernames[i];
    if (this.draws[username] === undefined) {
      this.draws[username] = 0;
    }

    this.draws[username] += 1;
  }
};

ResultStore.prototype.getWins = function(username) {
  if (this.wins[username] === undefined) {
    return 0;
  }

  return this.wins[username];
};

ResultStore.prototype.getLosses = function(username) {
  if (this.losses[username] === undefined) {
    return 0;
  }

  return this.losses[username];
};

ResultStore.prototype.getDraws = function(username) {
  if (this.draws[username] === undefined) {
    return 0;
  }

  return this.draws[username];
};

module.exports = ResultStore;
