// TODO: Perhaps this module should be called Account?
//
var _ = require('underscore'),
  CommandCenter = require('command-center'),
  sanitizer = require('sanitizer');

// These usernames have already been taken and require the session cookie to
// use.
var chosen_usernames = [];

// Returns an error message or 0 on success.
var validateUsername = function(username) {
  if (username.length > 16) {
    return "Username too long.";
  }

  var sanitizedUsername = sanitizer.sanitize(username);
  if (username !== sanitizedUsername) {
    return "Username contains invalid characters.";
  }

  return 0;
};

// AJAX login request.
var login = exports.login = function(req, res) {
  // TODO: Do a proper account lookup.
  //
  if (_.contains(chosen_usernames, req.body.username)) {
    return res.send({
      result: 'fail',
      message: 'That username was already taken.'
    });
  }

  var validUsernameError = validateUsername(req.body.username);
  if (validUsernameError !== 0) {
    return res.send({
      result: 'fail',
      message: validUsernameError
    });
  }


  req.session.username = req.body.username;
  CommandCenter.initSession(req.session);

  res.send({
    result: 'ok'
  });
};

// AJAX logout request.
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
  'login': login,
  'logout': logout,
  'check': check
};
