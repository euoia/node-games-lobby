var _ = require('underscore'),
  Chat = require('iochat');

// AJAX login request.
// TODO: DB Lookup.
var valid_usernames = [
  'james', 'bob'
];

exports.login = function(req, res) {
  if (_.contains(valid_usernames, req.body.username)) {
    req.session.username = req.body.username;
    Chat.initSession(req.session);

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
exports.logout = function(req, res) {
  req.session.destroy();
  res.send({
    result: 'ok'
  });
};

exports.check = function(req, res) {
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
