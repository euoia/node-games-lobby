//  Created:            Wed 30 Oct 2013 10:56:21 AM GMT
//  Last Modified:      Thu 13 Mar 2014 12:06:01 PM EDT
//  Author:             James Pickard <james.pickard@gmail.com>
// --------------------------------------------------
// Summary
// ----
// Routes that are used specifically for lobby-related functionality.
// --------------------------------------------------
var util = require('util'),
  account = require('../account/account.js');

// Log in / landing page.
exports.login = function(req, res) {
  account.getNextGuestUsername(function (err, nextGuestUsername) {
    if (err) {
      console.log('[gamesLobbyRoutes] login error: %s', err);
      return;
    }

    res.render('gamesLobby/loginAndLobby', {
      title: 'Gorilla chat',
      suggestedUsername: nextGuestUsername
    });
  });
};
