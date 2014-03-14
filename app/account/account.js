var
  sanitizer = require('sanitizer'),
  redis = require('redis'),
  util = require('util'),
  bcrypt = require('bcryptjs');

// The account model.
var redisClient = redis.createClient();

var hashPassword = function(password) {
  var salt = bcrypt.genSaltSync(10);
  var hash = bcrypt.hashSync(password, salt);

  return hash;
};

exports.checkPassword = function (password, hash) {
  return bcrypt.compareSync(password, hash);
};

// Returns either true or an error message.
exports.usernameIsValid = function(username) {
  if (username.length > 16) {
    return "Username too long.";
  }

  var sanitizedUsername = sanitizer.sanitize(username);
  if (username !== sanitizedUsername) {
    return "Username contains invalid characters.";
  }

  return true;
};

// Retrieve and return an account object.
exports.getAccount = function(username, cb) {
  var userId = util.format('user:%s', username);

  redisClient.hgetall(userId, function(err, account) {
    if (err) {
      return cb(err);
    }

    return cb(null, account);
  });
};

exports.addAccount = function(username, account, cb) {
  var userId = util.format('user:%s', username);

  redisClient.hmset(userId, account, function(err, account) {
    if (err) {
      return cb(err);
    }

    return cb(null, userId);
  });
};

exports.registerAccount = function(username, password, cb) {
  var userId = util.format('user:%s', username);

  redisClient.hgetall(userId, function(err, account) {
    if (err) {
      return cb(err);
    }

    if (account === null) {
      return cb(new Error('Account not found'));
    }

    account.password = hashPassword(password);

    redisClient.hmset(userId, account, function(err, account) {
      if (err) {
        return cb(err);
      }

      return cb(null);
    });
  });
};

// Get the next guest username. These usernames are generated in advance by the
// makeguestusernames script.
exports.getNextGuestUsername = function(cb) {
  redisClient.lindex('guestUsernames', 1, function(err, username) {
    if (err) {
      return cb(err);
    }

    if (username === null) {
      console.log('[account] Warning! There are no guest usernames left!');
      username = '';
    }

    return cb(null, username);
  });
};

exports.popNextGuestUsername = function() {
  redisClient.lpop('guestUsernames');
};

