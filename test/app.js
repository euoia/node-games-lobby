//  Created:            Wed 30 Oct 2013 06:08:06 PM GMT
//  Last Modified:      Wed 06 Nov 2013 01:29:33 PM GMT
//  Author:             James Pickard <james.pickard@gmail.com>
// --------------------------------------------------
// Summary
// ----
// Integration tests for logging in, command center, playing games.
// --------------------------------------------------
// TODOs
// ----
// TODO: I found it hard to find tutorials or guides for how to use superagent
//       session cookies with socket.io. This is required because session data is
//       retrieved even on socket.io requests (due to session.socket.io). If I get
//       this working, I ought to write it up publicly.
// TODO: Run the createMatch and joinMatch tests for every game.
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

describe('node-games-lobby:', function() {

  describe('Login:', function() {
    // Need to login to get a session.
    var badAccount = {
      username: 'xxxxbob'
    };

    var goodAccount1 = {
      username: 'bob'
    };

    // We need 2 players for a match.
    var goodAccount2 = {
      username: 'james'
    };

    var goodAgent1 = superagent.agent();
    it('should be able to login with a good username', function(done) {
      goodAgent1.post(util.format('http://localhost:%s/session/login', serverPort)).send({
        username: goodAccount1.username
      }).end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.status, 200, 'expecting status 200');
        assert.ok(res.body.result, 'response does not have a result');
        assert.equal(res.body.result, 'ok', 'response result not right');
        done();
      });
    });

    // Save the session cookie for later.
    var goodAgent1SessionCookie;
    it('should have an goodAgent1 with cookies', function(done) {
      goodAgent1SessionCookie = goodAgent1.jar.getCookie('connect.sid', {
        'domain': util.format('%s:%s', 'localhost', '4000'),
        'path': '/session/login',
        'script': false,
        'secure': false
      });

      assert.ok(goodAgent1SessionCookie.name);
      assert.ok(goodAgent1SessionCookie.value);
      done();
    });

    var goodAgent2 = superagent.agent();
    it('A second player should be able to login', function(done) {
      goodAgent2.post(util.format('http://localhost:%s/session/login', serverPort)).send({
        username: goodAccount2.username
      }).end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.status, 200, 'expecting status 200');
        assert.ok(res.body.result, 'response does not have a result');
        assert.equal(res.body.result, 'ok', 'response result not right');
        done();
      });
    });

    // Save the session cookie for later.
    var goodAgent2SessionCookie;
    it('should have an goodAgent2 with cookies', function(done) {
      goodAgent2SessionCookie = goodAgent2.jar.getCookie('connect.sid', {
        'domain': util.format('%s:%s', 'localhost', '4000'),
        'path': '/session/login',
        'script': false,
        'secure': false
      });

      assert.ok(goodAgent2SessionCookie.name);
      assert.ok(goodAgent2SessionCookie.value);
      done();
    });

    // Test for failed login.
    var badAgent1 = superagent.agent();

    it('should fail to login with a bad username', function(done) {
      badAgent1.post(util.format('http://localhost:%s/session/login', serverPort)).send({
        username: badAccount.username
      }).end(function(err, res) {
        assert.ifError(err);
        assert.equal(res.status, 200, 'expecting status 200');
        assert.ok(res.body.result, 'response does not have a result');
        assert.equal(res.body.result, 'fail', 'response result not right');
        done();
      });
    });

    // TODO: Attempt socket requests with badAgent1 and make sure they fail
    // (without crashing the node process) due to lack of authentication .

    // Socket IO requests.
    describe('Start game:', function() {
      var socket;

      beforeEach(function(done) {
        // Setup
        socket = io.connect(
          util.format('http://localhost:%s', serverPort),
          {
            'reconnection delay': 0,
            'reopen delay': 0,
            'force new connection': true,
            'headers': {
              'Cookie': goodAgent1SessionCookie.toString()
            }
          }
        );

        socket.on('connect', function() {
          console.log('On connect');
          done();
        });

        socket.on('disconnect', function() {
          console.log('On disconnect');
        });
      });

      afterEach(function(done) {
        // Cleanup
        if (socket.socket.connected) {
          console.log('Socket was connected, disconnecting.');
          socket.disconnect();
        } else {
          // There will not be a connection unless you have done() in beforeEach, socket.on('connect'...)
          console.log('Socket was not connected.');
        }

        done();
      });

      it('Connect and disconnect', function(done) {
        done();
      });

      describe ('Subscribe to a room, start a match, list matches:', function() {
        var roomName = 'default';

        it('Join a room', function(done) {
          socket.on('notification', function notificationReceived(eventData) {
            assert.equal(eventData.message,
                         util.format('You have joined %s.', roomName));
            done();
          });

          socket.emit('subscribe', {roomName: roomName});
        });

        it('Emitting listGames should get a notification containing 1 available games', function(done) {
          socket.on('notification', function notificationReceived(eventData) {
            assert.equal(eventData.message,
                        'The following games are available: tictactoe. To create a game send /createMatch &lt;game name&gt;.');
            done();
          });

          socket.emit('listGames', {roomName: roomName});
        });

        it('Emitting listMatches should get a notification containing 0 available matches', function(done) {
          socket.on('notification', function notificationReceived(eventData) {
            assert.equal(eventData.message,
                        'There are no waiting matches at the moment. You can create one using /createMatch &lt;game name&gt;.');
            done();
          });

          socket.emit('listMatches', {roomName: roomName});
        });

        it('Emitting createMatch should create a match', function(done) {
          socket.on('notification', function notificationReceived(eventData) {
            assert.equal(eventData.message,
                         'Created match tictactoe. Waiting for 2 players.');
            done();
          });

          socket.emit('createMatch', {gameID: 'tictactoe'});
        });

        it('Emitting listMatches should get a notification containing 1 available match', function(done) {
          socket.on('notification', function notificationReceived(eventData) {
            assert.equal(eventData.message,
                         util.format('There is 1 match waiting: tictactoe created by %s', goodAccount1.username));
            done();
          });

          socket.emit('listMatches', {roomName: roomName});
        });

        // Save the match URL for joining later.
        var matchURL;
        it('The second player should be able to join the match', function(done) {
          // Increase the timout to account for the 5-second start timer.
          this.timeout(7000);

          socket.once('notification', function notificationReceived(eventData) {
            assert.equal(eventData.message,
                         util.format('You have joined %s&#39;s game of tictactoe.', goodAccount1.username));

            socket.on('launchMatch', function launchMatchReceived(eventData) {
              assert.ok(eventData.url);
              matchURL = eventData.url;
              done();
            });
          });

          socket.emit('joinMatch', {gameID: 'tictactoe'});
        });

        it('Both players should be able to play the match by going to the match URL', function(done) {
          console.log(util.format('Loading match URL %s', matchURL));

          goodAgent1.get(
            util.format('http://localhost:%s/%s', serverPort, matchURL)
          ).end(function matchPageLoaded(err, res) {
            assert.equal(res.statusCode, 200);
            assert.ifError(err);

            goodAgent2.get(
              util.format('http://localhost:%s/%s', serverPort, matchURL)
            ).end(function matchPageLoaded(err, res) {
              assert.equal(res.statusCode, 200);
              assert.ifError(err);
              done();
            });
          });
        });

        it('A player that has not authenticated should not be able to load the match URL', function(done) {
          badAgent1.get(
            util.format('http://localhost:%s/%s', serverPort, matchURL)
          ).end(function matchPageLoaded(err, res) {
            assert.equal(res.statusCode, 403);
            assert.ifError(err);
            done();
          });
        });
      });

      // TODO: Test with a player that has authenticated but is not part of the game.

    });
  });
});
