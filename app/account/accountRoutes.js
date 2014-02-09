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
  var username = req.body.username;

  if (_.contains(chosen_usernames, username)) {
    return res.send({
      result: 'fail',
      message: 'That username is already taken.'
    });
  }

  var validUsernameError = validateUsername(username);
  if (validUsernameError !== 0) {
    return res.send({
      result: 'fail',
      message: validUsernameError
    });
  }

  chosen_usernames.push(username);

  req.session.username = username;
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
