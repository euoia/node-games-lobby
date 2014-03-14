// TODO: Perhaps this module should be called Account?
// TODO: The routes module should be thin, an Account model should be
//       fat.
// TODO: Probably rename this to user.
//
var _ = require('underscore'),
  CommandCenter = require('command-center'),
  util = require('util'),
  account = require('./account.js');

// TODO: Bind this into the template.
var defaultRoom = 'gorilla chat';
var commandCenter = null;

// Authentication page for registered users.
var auth = exports.auth = function(req, res) {
  if (req.route.method === 'get') {
    // Just render the auth form.
    return res.render('./account/auth.ejs', {title: 'hidden auth page'});
  }

  // Auth page title.
  var title = 'hidden auth page';

  // Authenticate.
  if (req.body.username === undefined ||
      req.body.password === undefined
  ) {
    return res.render('./account/auth.ejs', {
      title: title,
      error: 'enter a username and password'
    });
  }

  var username = req.body.username;
  var password = req.body.password;

  account.getAccount(username, function(err, existingAccount) {
    if (err) {
      console.log('[accountRoutes] auth [%s] Error:  %s', username, err);
      return;
    }

    // Account with this username exists.
    if (existingAccount === null) {
      return res.render('./account/auth.ejs', {
        title: title,
        error: 'account not found'
      });
    }

    if (account.checkPassword(password, existingAccount.password) === false) {
      console.log('[accountRoutes] auth [%s] failed auth', username);
      return res.render('./account/auth.ejs', {
        title: title,
        error: 'incorrect password'
      });
    }

    console.log('[accountRoutes] auth [%s] successful auth', username);
    req.session.username = username;
    CommandCenter.initSession(req.session);

    // TODO: This is a bit weird.
    req.session.rooms.push(defaultRoom);

    return res.redirect('/');
  });
};

// AJAX login request.
//
// Note: This doesn't really authenticate the player so much as create a new
//       user.
var login = exports.login = function(req, res) {
  var username = req.body.username;

  console.log('[accountRoutes] login attempt [%s]', username);

  // Step 1. Validate the username.
  var validationResult = account.usernameIsValid(username);
  if (validationResult !== true) {
    return res.send({
      result: 'fail',
      message: validationResult
    });
  }

  // Step 2. Check whether an account with the username already exists.
  account.getAccount(username, function(err, existingAccount) {
    if (err) {
      console.log('[accountRoutes] login [%s] Error:  %s', username, err);
      return;
    }

    // Account with this username exists.
    // TODO: Handle login.
    if (existingAccount !== null) {

      if (req.body.password === undefined) {
        console.log('[accountRoutes] login [%s] fail: username taken', username);
        return res.send({
          result: 'fail',
          message: 'That username is reserved.'
        });
      }

      if (account.checkPassword(req.body.password, existingAccount.password) === true) {
        console.log('[accountRoutes] login [%s] successful auth', username);
        req.session.username = username;
        return res.render('gamesLobby/loginAndLobby', {
          title: 'Gorilla chat',
          suggestedUsername: nextGuestUsername
        });
      } else {
        console.log('[accountRoutes] login [%s] failed auth', username);
        return res.render('gamesLobby/loginAndLobby', {
          title: 'Gorilla chat',
          suggestedUsername: nextGuestUsername
        });
      }
    }

    var newAccount = {
      username: username
    };

    // Need an addAccount function because it's used in two places...
    var addAccount = function () {
      account.addAccount(username, newAccount, function(err, userId) {
        if (err) {
          console.log('[accountRoutes] login [%s] Error:  %s', username, err);
          return;
        }

        CommandCenter.initSession(req.session);

        req.session.username = username;
        res.send({
          result: 'ok'
        });

        console.log('[accountRoutes] login [%s]: Added new account: %s', username, userId);
      });
    };

    // For non-guest account we can just add.
    if (username.match('^Guest') === null) {
      addAccount();
      return;
    }

    // For guest accounts we need to do some async checks first...
    account.getNextGuestUsername(function(err, nextGuestUsername) {
      if (err) {
        console.log('[accountRoutes] login [%s] Error:  %s', username, err);
        return;
      }

      // If using a GuestXXX username, the next one must be used. This is to
      // prevent someone registering future Guest usernames and causing
      // annoying problems.
      if (username !== nextGuestUsername) {
        return res.send({
          result: 'fail',
          message: 'That username is reserved.'
        });
      }

      account.popNextGuestUsername();

      // Add account.
      addAccount();
    });
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

// Mapping from URL path fragment to its function.
exports.postRoutes = {
  'auth': auth,
  'login': login,
  'logout': logout,
  'check': check
};

// Mapping from URL path fragment to its function.
exports.getRoutes = {
  'auth': auth
};
