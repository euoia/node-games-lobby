//  Created:            Wed 30 Oct 2013 10:56:21 AM GMT
//  Last Modified:      Sun 09 Feb 2014 11:16:30 AM EST
//  Author:             James Pickard <james.pickard@gmail.com>
// --------------------------------------------------
// Summary
// ----
// Routes that are used specifically for lobby-related functionality.
// --------------------------------------------------
var util = require('util');

// Log in / landing page.
exports.login = function(req, res){
  function generateRandomUsername() {
    // TODO: Should be random enough for now.
    return util.format('Guest%d', Math.floor(Math.random() * 10000));
  }

  res.render('gamesLobby/loginAndLobby', {
    title: 'Gorilla chat',
    suggestedUsername: generateRandomUsername()});
};
