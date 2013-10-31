//  Created:            Wed 30 Oct 2013 06:08:06 PM GMT
//  Last Modified:      Wed 30 Oct 2013 06:26:29 PM GMT
//  Author:             James Pickard <james.pickard@gmail.com>
// --------------------------------------------------
// Summary
// ----
// Basic tests for node-games-lobby.
// --------------------------------------------------
// TODOs
// ----
// TODO: I found it hard to find tutorials or guides for how to use superagent
//       session cookies with socket.io. This is required because session data is
//       retrieved even on socket.io requrests. If I get this working, I ought to
//       write it up publicly.
// --------------------------------------------------

// Start the server on a test port.
var serverPort = 4000;
process.env.PORT = serverPort;

var app = require('../app.js'),
  assert = require('assert'),
  superagent = require('superagent'),
  should = require('should'),
  io = require('socket.io-client'),
  util = require('util');

describe('node-games-lobby', function() {
  // agent1 will login and start a game.
  var agent1 = superagent.agent();

  // agent2 will fail to login, and then try various things.
  var agent2 = superagent.agent();

  describe('login', function() {
    // Need to login to get a session.
    var badAccount = {
      username: 'xxxxbob'
    };

    var goodAccount = {
      username: 'bob'
    };

    it('should be able to login with a good username', function(done) {
      agent1.post(util.format('http://localhost:%s/session/login', serverPort)).send({
        username: goodAccount.username
      }).end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.status, 200, 'expecting status 200');
        assert.ok(res.body.result, 'response does not have a result');
        assert.equal(res.body.result, 'ok', 'response result not right');
        done();
      });
    });

    it('should fail to login with a bad username', function(done) {
      agent2.post(util.format('http://localhost:%s/session/login', serverPort)).send({
        username: badAccount.username
      }).end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.status, 200, 'expecting status 200');
        assert.ok(res.body.result, 'response does not have a result');
        assert.equal(res.body.result, 'fail', 'response result not right');
        done();
      });
    });
  });

  // Socket IO requests.
  describe('start game', function() {
    var socket;

    beforeEach(function(done) {
      // Setup
      socket = io.connect(
        util.format('http://localhost:%s', serverPort),
        {
          'reconnection delay': 0,
          'reopen delay': 0,
          'force new connection': true
        }
      );

      socket.on('connect', function() {
        console.log('worked...');
        done();
      });

      socket.on('disconnect', function() {
        console.log('disconnected...');
      });
    });

    afterEach(function(done) {
      // Cleanup
      if (socket.socket.connected) {
        console.log('disconnecting...');
        socket.disconnect();
      } else {
        // There will not be a connection unless you have done() in beforeEach, socket.on('connect'...)
        console.log('no connection to break...');
      }

      done();
    });

    it('Emitting listGames should get a notification containing the available games', function(done) {
      socket.on('notification', function notificationReceived(eventData) {
        console.log(eventData);
        done();
      });

      socket.emit('listGames');
    });
  });
});
