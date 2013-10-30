//  Created:            Wed 30 Oct 2013 10:56:21 AM GMT
//  Last Modified:      Wed 30 Oct 2013 10:57:16 AM GMT
//  Author:             James Pickard <james.pickard@gmail.com>
// --------------------------------------------------
// Summary
// ----
// Routes that are used specifically for lobby-related functionality.
// --------------------------------------------------

// Log in / landing page.
exports.login = function(req, res){
  res.render('index', { title: 'Game lobby' });
};
