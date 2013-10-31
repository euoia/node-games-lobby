// TODO: Perhaps this module should be called Account?
//
var _ = require('underscore'),
  CommandCenter = require('command-center');

// AJAX login request.
// TODO: DB Lookup.
var valid_usernames = [
  'james', 'bob'
];

var login = exports.login = function(req, res) {
  // TODO: Do a proper account lookup.
  if (_.contains(valid_usernames, req.body.username)) {
    req.session.username = req.body.username;
    CommandCenter.initSession(req.session);

    res.send({
      result: 'ok'
    });
  } else {
    res.send({
      result: 'fail',
      message: 'Invalid username.'
    });
  }
};

// AJAX login request.
var logout = exports.logout = function(req, res) {
  req.session.destroy();
  res.send({
    result: 'ok'
  });
};

var check = exports.check = function(req, res) {
  if (req.session.username !== undefined) {
  console.log('check');
  console.log(req.session);
    res.send({
      result: 'ok',
      username: req.session.username,
      rooms: req.session.rooms
    });
  } else {
    res.send({
      result: 'fail'
    });
  }
};

// Object mapping a path (that is, part of a URL path) to its function.
exports.postRoutes = {
  'login':    login,
  'logout':   logout,
  'check':    check
};
